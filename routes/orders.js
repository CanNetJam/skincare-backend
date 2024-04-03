const express = require ("express");
const router = express.Router();
const accounts = require ("../models/accounts.js");
const product = require ("../models/product.js");
const package = require ("../models/package.js");
const orders = require ("../models/orders.js");
const vouchers = require ("../models/vouchers.js");
const auth = require("../middleware/auth");
const axios = require('axios');
const { ObjectId } = require ("mongodb");
const moment = require("moment");
const nodemailer = require("nodemailer");
const cloudinary = require('cloudinary').v2

router.post("/submit-order/:id", auth, async (req, res) => {
    try {
        let rawItems = JSON.parse(req.body.items)
        rawItems = rawItems.map((a)=> {
            return {...a, item: a.product._id, price: a.product.price || a.product.origprice, quantity: a.quantity}
        })
        const obj = {
            userid: req.params.id,
            owner: req.body.firstname + " " + req.body.lastname,
            email: req.body.email,
            phone: req.body.phone,
            amounttotal: req.body.subtotal,
            amountpaid: req.body.amounttotal,
            billingaddress: {
                region: req.body.region, 
                province: req.body.province,
                city: req.body.city,
                barangay: req.body.barangay,
                postal: req.body.postal,
                street: req.body.street
            },
            items: rawItems,
            deliveryoption: req.body.delivery,
            paymentoption: req.body.payment,
            billingstatus: "On Hold",
            deliverystatus: "Seller Processing",
            codeused: "",
            shippingfee: req.body.shippingfee,
            discount: req.body.discount,
            discountid: req.body.discountid,
            discounttype: req.body.discounttype,
            discountcode: req.body.discountcode
        }

        const addOrder = await orders.create(obj)
        if (addOrder) {
            if (addOrder.paymentoption!=="COD") {
                let destructuredCart = []
                let perItemDiscount = obj.discount/obj.items.length

                obj.items.map((a)=> {
                    destructuredCart.push({
                        currency: 'PHP',
                        images: [
                            `https://res.cloudinary.com/drjkqwabe/image/upload/f_auto,q_50/${a.product.displayimage}.jpg`
                        ],
                        amount: 
                        obj.discount!==0 ? 
                            obj.discounttype==="Percentage" ? 
                                Math.floor((a.price-(a.price*(req.body.discount/100)))*100) 
                            : 
                                Math.round((a.price-perItemDiscount/a.quantity)*100)
                        :   a.price*100
                        ,
                        name: a.product.name,
                        description: a.item,
                        quantity: a.quantity
                    })
                })
                destructuredCart.push({
                    currency: 'PHP',
                    images: [
                        `https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbBKxt5HI8PaE2fAIIP5u-OqFltGY_1P_6DPnoAl6UmQ-TntY-Nun6aYpcESrlqAerxBA&usqp=CAU`
                    ],
                    amount: obj.shippingfee*100,
                    name: 'Flash Express',
                    quantity: 1
                })

                let truePayment
                if (obj.paymentoption==="Credit / Debit Card") {
                    truePayment='card'
                } else if (obj.paymentoption==="Gcash") {
                    truePayment='gcash'
                } else if (obj.paymentoption==="Paymaya") {
                    truePayment='paymaya'
                } else if (obj.paymentoption==="Grabpay") {
                    truePayment='grab_pay'
                }
                let newPhone = obj?.phone.toString().slice(0, 0)+ obj?.phone.toString().slice(1, obj?.phone.toString().length)
                const options = {
                    method: 'POST',
                    url: 'https://api.paymongo.com/v1/checkout_sessions',
                    headers: {
                        accept: 'application/json',
                        'Content-Type': 'application/json',
                        authorization: process.env.PAYMONGO_SECRETKEY
                    },
                    data: {
                        data: {
                            attributes: {
                                billing: {
                                    address: {
                                        city: obj.billingaddress.city,
                                        state: obj.billingaddress.province!=='Not applicable' ? obj.billingaddress.province : obj.billingaddress.region,
                                        postal_code: obj.billingaddress.postal,
                                        country: 'PH',
                                        line1: obj.billingaddress.street,
                                        line2: obj.billingaddress.barangay,
                                    },
                                    name: obj.owner,
                                    email: obj.email,
                                    phone: truePayment==='card' ? newPhone : obj.phone 

                                },
                                customer_email: obj.email,
                                send_email_receipt: true,
                                show_description: true,
                                show_line_items: true,
                                reference_number: addOrder._id,
                                cancel_url: `${false ? 'http://localhost:5173/' : 'https://kluedskincare.com/'}cartdetails`,
                                description: `Klued product order checkout paid through ${obj.paymentoption}`,
                                line_items: destructuredCart,
                                payment_method_types: [truePayment],
                                success_url: `${false ? 'http://localhost:5173/' : 'https://kluedskincare.com/'}`,
                                metadata: {
                                    customer_number: req.params.id,
                                    deliveryoption: obj.deliveryoption,
                                    order_id: addOrder._id,
                                    discount_id: (req.body.subtotal+req.body.shippingfee)*100>(300*100) ? obj.discountid : ''
                                }
                            }
                        }
                        
                    }
                }

                axios.request(options)
                    .then(function (response) {
                        res.status(200).json(response.data)
                    })
                    .catch(function (error) {
                        console.error("Checkout"+error)
                    })
            } else if (addOrder.paymentoption==="COD") {
                if (addOrder.discountid!==''){
                    await vouchers.findByIdAndUpdate({_id: addOrder.discountid}, {status: "Used", orderid: addOrder._id})
                }
                const ourData = await orders.findByIdAndUpdate({_id: addOrder._id}, {
                    billingstatus: "COD", 
                    netamount: addOrder.amountpaid,
                    transactionfee: 0.00,
                })

                if (ourData) {
                    await accounts.findByIdAndUpdate({_id: ourData.userid}, {cart: []}, {new: true})
                    await orders.deleteMany({userid: ourData.userid, billingstatus: "On Hold"})
                    ourData.items.map( async (a)=> {
                        if (a.type==="package") {
                            await package.findByIdAndUpdate({_id: a.item}, {$inc: {stock: -a.quantity}})
                        } else if (a.type==="single") {
                            await product.findByIdAndUpdate({_id: a.item}, {$inc: {stock: -a.quantity}})
                        }
                    })

                    const toSendEmail = await orders.findById(ourData._id)
                    .populate({path:"items.item", select:["name", "displayimage", "price", "origprice"]})

                    let maillist = ['welcome@kluedskincare.com']  
                    let transporter = nodemailer.createTransport({
                        host: "smtpout.secureserver.net", 
                        port: 465, 
                        secure: true, 
                        auth: {
                            user: "welcome@kluedskincare.com", 
                            pass: process.env.EMAIL_PASS, 
                        },
                        tls : { rejectUnauthorized: false }
                    })
            
                    await transporter.sendMail({
                        from: '"Klued" <welcome@kluedskincare.com>',
                        to: maillist[0],
                        cc: '',
                        subject: `New Order (${toSendEmail?.paymentoption} payment method)`,
                        html: `
                        <div style="font-family: Century Gothic, sans-serif;" width="100%">
                            <div style="Margin:0 auto; max-width:750px;">
                                <div style="display: none;">A new order has been recieved through https://kluedskincare.com/. Check it out and process it immediately.</div>
                                <div width="100%" style="display:flex; justify-content:center;">
                                    <a style="Margin:0 auto; width:200px; object-fit:cover;" href="https://kluedskincare.com/"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1205FRbwJYWvOPDeWGRRl98TKKtNdi13j" alt="Logo" title="Klued Logo" width="150" height="75"/></a>
                                </div>
                                <br/>
                                <p style="font-size: 26px; color:#ffffff; background-color:#3b82f6; padding-top: 15px;padding-bottom: 15px; text-align:center"><b>Klued Website Order</b></p>
                                <div style="font-size: 16px; width:100%">
                                    Hello Klued,
                                    <br/>
                                    <p style="text-align: justify;">
                                        A new order has been submitted on your website https://kluedskincare.com/ with an Order Id of <b>${toSendEmail._id}</b>. Please process it immediately and schedule a pick up on your Flash Printer application to continue.
                                    </p>
                                    <br/>
                                    <div>
                                        Order Id: ${toSendEmail._id}<br/>
                                        Order date: ${moment(toSendEmail.createdAt).format('MMMM Do YYYY, hh:mm A')} <br/>
                                        Customer name: ${toSendEmail.owner}
                                    </div>
                                    <br/>
                                    <br/>
                                    <b>Order Items:</b>
                                    <br/>
                                    <div style="width: 100%; border: solid 1px;"></div>
                                    <br/>
                                    <div style="width:100%;">
                                        <table style="Margin:0 auto;width:auto;padding:8px;">
                                            <thead>
                                                <tr>
                                                    <th>
                                                        No.
                                                    </th>
                                                    <th>
                                                        Item
                                                    </th>
                                                    <th>
                                                        Price
                                                    </th>
                                                    <th>
                                                        Quantity
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${
                                                    toSendEmail.items.map((a, index)=> {
                                                        return (
                                                            `<tr>
                                                                <td style='text-align: center; padding-left: 16px; padding-right: 16px;'>
                                                                    ${index+1}
                                                                </td>
                                                                <td style='text-align: center; display: flex; gap: 4px; align-items: center; padding-left: 16px; padding-right: 16px;'>
                                                                    <img style="height: 100px; width: 150px;" src=${`https://res.cloudinary.com/drjkqwabe/image/upload/f_auto,q_30/${a.item?.displayimage}.jpg`}></img>
                                                                    <p style="height:100%; align-items: center;">${a.item.name}</p>
                                                                </td>
                                                                <td style='text-align: center; padding-left: 16px; padding-right: 16px;'>
                                                                    ₱${a.price?.toFixed(2)}
                                                                </td>
                                                                <td style='text-align: center; padding-left: 16px; padding-right: 16px;'>
                                                                    ${a.quantity}
                                                                </td>
                                                            </tr>`
                                                        )
                                                    })
                                                }
                                            </tbody>
                                        </table>
                                    </div>
                                    <br/>
                                    <div style="width: 100%; border: solid 1px;"></div>
                                    <br/>
                                    <div>
                                        Subtotal: ₱${toSendEmail.amounttotal?.toFixed(2)}<br/>
                                        Shipping fee: ₱${toSendEmail.shippingfee?.toFixed(2)}<br/>
                                        <b>Total Payment: ₱${(toSendEmail.amounttotal+toSendEmail.shippingfee)?.toFixed(2)}</b><br/>
                                    </div>
                                    <br/>
                                    <br/>
                                    <div style="font-size: 14px; width:100%; text-align:center;"><i>This is a system-generated email, please do not reply to this message.</i></div>
                                </div>
                                <br/>
                                <br/>
                                <div style="background-color:#1e293b; color:#94a3b8; padding-left: 25px;padding-right: 25px; padding-top: 15px;padding-bottom: 15px;">
                                    <a style="Margin:0 auto; width:200px; object-fit:cover;" href="https://kluedskincare.com/"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1205FRbwJYWvOPDeWGRRl98TKKtNdi13j" alt="Logo" title="Klued Logo" width="100" height="45"/></a>
                                    <p>
                                        "Combining knowledge and passion to the skin"
                                    </p>
                                    <br/>
                                    <p style="font-size: 14px;">
                                        📍Address: 2nd Floor WANJ Bldg.<br/>
                                        Don Placido Campos Ave. Brgy. San Jose<br/>
                                        Dasmarinas, Cavite 4114<br/>
                                        📞 Mobile:09176680429<br/>
                                        💻 Website: https://kluedskincare.com
                                    </p>
                                    <p style="Margin:0 auto; width:auto;">© 2024 Klued. All rights reserved.</p>
                                </div>
                            </div>
                            <div style="display: none;">[${Date.now()}] End of message.</div>
                        </div>
                        `,
                    })
                }
                res.status(200).json(true)
            }
        } else {
            res.status(200).json(true)
        }
    } catch (err) {
        res.status(500).json(err)
    }
})

router.post("/checkout_webhook", async (req, res) => {
    if (req.body.data.attributes.type==='payment.paid'){
        if(req.body.data.attributes.data.attributes.metadata.discount_id!==''){
            await vouchers.findByIdAndUpdate({_id: req.body.data.attributes.data.attributes.metadata.discount_id}, {status: "Used", orderid: req.body.data.attributes.data.attributes.metadata.order_id})
        }
        const ourData = await orders.findByIdAndUpdate({_id: req.body.data.attributes.data.attributes.metadata.order_id}, {
            billingstatus: "Paid", 
            ammountpaid: req.body.data.attributes.data.attributes.ammount/100, 
            paidat: Date.now(),
            netamount: req.body.data.attributes.data.attributes.net_amount/100,
            transactionfee: req.body.data.attributes.data.attributes.fee/100,
            paymentid: req.body.data.attributes.data.id,
            paymentinentid: req.body.data.attributes.data.attributes.payment_intent_id,
            sourceid: req.body.data.attributes.data.attributes.source.id,
            balancetransactionid: req.body.data.attributes.data.attributes.balance_transaction_id
        })
        if (ourData) {
            await accounts.findByIdAndUpdate({_id: ourData.userid}, {cart: []}, {new: true})
            await orders.deleteMany({ billingstatus: "On Hold"})
            ourData.items.map( async (a)=> {
                if (a.type==="package") {
                    await package.findByIdAndUpdate({_id: a.item}, {$inc: {stock: -a.quantity}})
                } else if (a.type==="single") {
                    await product.findByIdAndUpdate({_id: a.item}, {$inc: {stock: -a.quantity}})
                }
            })

            const toSendEmail = await orders.findById(ourData._id)
            .populate({path:"items.item", select:["name", "displayimage", "price", "origprice"]})

            let maillist = ['welcome@kluedskincare.com']  
            let transporter = nodemailer.createTransport({
                host: "smtpout.secureserver.net", 
                port: 465, 
                secure: true, 
                auth: {
                    user: "welcome@kluedskincare.com", 
                    pass: process.env.EMAIL_PASS, 
                },
                tls : { rejectUnauthorized: false }
            })
    
            await transporter.sendMail({
                from: '"Klued" <welcome@kluedskincare.com>',
                to: maillist[0],
                cc: '',
                subject: `New Order (${toSendEmail?.paymentoption} payment method)`,
                html: `
                <div style="font-family: Century Gothic, sans-serif;" width="100%">
                    <div style="Margin:0 auto; max-width:750px;">
                        <div style="display: none;">A new order has been recieved through https://kluedskincare.com/. Check it out and process it immediately.</div>
                        <div width="100%" style="display:flex; justify-content:center;">
                            <a style="Margin:0 auto; width:200px; object-fit:cover;" href="https://kluedskincare.com/"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1205FRbwJYWvOPDeWGRRl98TKKtNdi13j" alt="Logo" title="Klued Logo" width="150" height="75"/></a>
                        </div>
                        <br/>
                        <p style="font-size: 26px; color:#ffffff; background-color:#3b82f6; padding-top: 15px;padding-bottom: 15px; text-align:center"><b>Klued Website Order</b></p>
                        <div style="font-size: 16px; width:100%">
                            Hello Klued,
                            <br/>
                            <p style="text-align: justify;">
                                A new order has been submitted on your website https://kluedskincare.com/ with an Order Id of <b>${toSendEmail._id}</b>. Please process it immediately and schedule a pick up on your Flash Printer application to continue.
                            </p>
                            <br/>
                            <div>
                                Order Id: ${toSendEmail._id}<br/>
                                Order date: ${moment(toSendEmail.createdAt).format('MMMM Do YYYY, hh:mm A')} <br/>
                                Customer name: ${toSendEmail.owner}
                            </div>
                            <br/>
                            <br/>
                            <b>Order Items:</b>
                            <br/>
                            <div style="width: 100%; border: solid 1px;"></div>
                            <br/>
                            <div style="width:100%;">
                                <table style="Margin:0 auto;width:auto;padding:8px;">
                                    <thead>
                                        <tr>
                                            <th>
                                                No.
                                            </th>
                                            <th>
                                                Item
                                            </th>
                                            <th>
                                                Price
                                            </th>
                                            <th>
                                                Quantity
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${
                                            toSendEmail.items.map((a, index)=> {
                                                return (
                                                    `<tr>
                                                        <td style='text-align: center; padding-left: 16px; padding-right: 16px;'>
                                                            ${index+1}
                                                        </td>
                                                        <td style='text-align: center; display: flex; gap: 4px; align-items: center; padding-left: 16px; padding-right: 16px;'>
                                                            <img style="height: 100px; width: 150px;" src=${`https://res.cloudinary.com/drjkqwabe/image/upload/f_auto,q_30/${a.item?.displayimage}.jpg`}></img>
                                                            <p style="height:100%; align-items: center;">${a.item.name}</p>
                                                        </td>
                                                        <td style='text-align: center; padding-left: 16px; padding-right: 16px;'>
                                                            ₱${a.price?.toFixed(2)}
                                                        </td>
                                                        <td style='text-align: center; padding-left: 16px; padding-right: 16px;'>
                                                            ${a.quantity}
                                                        </td>
                                                    </tr>`
                                                )
                                            })
                                        }
                                    </tbody>
                                </table>
                            </div>
                            <br/>
                            <div style="width: 100%; border: solid 1px;"></div>
                            <br/>
                            <div>
                                Subtotal: ₱${toSendEmail.amounttotal?.toFixed(2)}<br/>
                                Shipping fee: ₱${toSendEmail.shippingfee?.toFixed(2)}<br/>
                                <b>Total Payment: ₱${(toSendEmail.amounttotal+toSendEmail.shippingfee)?.toFixed(2)}</b><br/>
                            </div>
                            <br/>
                            <br/>
                            <div style="font-size: 14px; width:100%; text-align:center;"><i>This is a system-generated email, please do not reply to this message.</i></div>
                        </div>
                        <br/>
                        <br/>
                        <div style="background-color:#1e293b; color:#94a3b8; padding-left: 25px;padding-right: 25px; padding-top: 15px;padding-bottom: 15px;">
                            <a style="Margin:0 auto; width:200px; object-fit:cover;" href="https://kluedskincare.com/"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1205FRbwJYWvOPDeWGRRl98TKKtNdi13j" alt="Logo" title="Klued Logo" width="100" height="45"/></a>
                            <p>
                                "Combining knowledge and passion to the skin"
                            </p>
                            <br/>
                            <p style="font-size: 14px;">
                                📍Address: 2nd Floor WANJ Bldg.<br/>
                                Don Placido Campos Ave. Brgy. San Jose<br/>
                                Dasmarinas, Cavite 4114<br/>
                                📞 Mobile:09176680429<br/>
                                💻 Website: https://kluedskincare.com
                            </p>
                            <p style="Margin:0 auto; width:auto;">© 2024 Klued. All rights reserved.</p>
                        </div>
                    </div>
                    <div style="display: none;">[${Date.now()}] End of message.</div>
                </div>
                `,
            })
        }
    } else if (req.body.data.attributes.type==='payment.refunded') {
        const ourData = await orders.findByIdAndUpdate({_id: req.body.data.attributes.data.attributes.metadata.order_id}, {
            billingstatus: "Refunded",
            refundedat: Date.now(),
            deliverystatus: req.body.data.attributes.data.attributes.refunds[0].attributes.notes,
            paymentid: req.body.data.attributes.data.id,
            paymentinentid: req.body.data.attributes.data.attributes.payment_intent_id,
            sourceid: req.body.data.attributes.data.attributes.source.id,
            balancetransactionid: req.body.data.attributes.data.attributes.balance_transaction_id
        })

        if (ourData){
            ourData.items.map( async (a)=> {
                if (a.type==="package") {
                    await package.findByIdAndUpdate({_id: a.item}, {$inc: {stock: a.quantity}})
                } else if (a.type==="single") {
                    await product.findByIdAndUpdate({_id: a.item}, {$inc: {stock: a.quantity}})
                }
            }) 
        }
    }
    res.status(200).send('Paymongo event transmitted!')
})

router.post("/cancel-order/:id", auth, async (req, res) => {
    try {
        if (req.body.paymentoption!=="COD") {
            const options = {
                method: 'POST',
                url: 'https://api.paymongo.com/refunds',
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    authorization: process.env.PAYMONGO_SECRETKEY
                },
                data: {
                    data: {
                        attributes: {
                            amount: req.body.netamount*100,
                            payment_id: req.body.paymentid,
                            reason: 'requested_by_customer',
                            notes: "Cancelled"
                        }
                    }
                }
            }

            axios.request(options)
            .then(async function () {
                const ourData = await orders.findByIdAndUpdate({_id: req.params.id}, {
                    billingstatus: "Refunded", 
                    deliverystatus: "Cancelled",
                    reason: req.body.reason
                })
                res.status(200).send(true)
            })
            .catch(function (error) {
                console.error(error)
            })
        } else {
            const ourData = await orders.findByIdAndUpdate({_id: req.params.id}, {
                billingstatus: "Cancelled",
                refundedat: Date.now(),
                deliverystatus: "Cancelled",
                reason: req.body.reason
            })
    
            if (ourData){
                ourData.items.map( async (a)=> {
                    if (a.type==="package") {
                        await package.findByIdAndUpdate({_id: a.item}, {$inc: {stock: a.quantity}})
                    } else if (a.type==="single") {
                        await product.findByIdAndUpdate({_id: a.item}, {$inc: {stock: a.quantity}})
                    }
                }) 
            }
            res.status(200).send(true)
        }
    } catch (err) {
        console.log(err)
        res.status(500).send(false)
    }
})

router.get("/:id/:deliverystatus", auth, async (req, res) => {
    try {
        const page = req.query.page
        const ordersPerPage = req.query.limit

        const userOrder = await orders.find({$and: [
            {userid: req.params.id}, 
            {billingstatus: {$ne: "On Hold"}},
            {$or: [{deliverystatus: req.params.deliverystatus==="Pending Orders" ? "Seller Processing" : "Cancelled"}, {deliverystatus:req.params.deliverystatus==="Pending Orders" ? "In Transit" : "Delivered"}, {deliverystatus:req.params.deliverystatus==="Pending Orders" ? null : "Returned/Refunded"}, {deliverystatus:req.params.deliverystatus==="Pending Orders" ? null : "Returned to Seller"}]}
        ]})
        .skip(page*ordersPerPage)
        .limit(ordersPerPage)
        .populate({path:"items.item", select:["name", "displayimage", "price", "origprice", "netamount", "transactionfee", "stock"]})
        .sort({createdAt: -1})

        const userOrders = await orders.find({$and: [
            {userid: req.params.id}, 
            {billingstatus: {$ne: "On Hold"}},
            {$or: [{deliverystatus: req.params.deliverystatus==="Pending Orders" ? "Seller Processing" : "Cancelled"}, {deliverystatus:req.params.deliverystatus==="Pending Orders" ? "In Transit" : "Delivered"}, {deliverystatus:req.params.deliverystatus==="Pending Orders" ? null : "Returned/Refunded"}, {deliverystatus:req.params.deliverystatus==="Pending Orders" ? null : "Returned to Seller"}]}
        ]})

        let a = Math.floor(userOrders.length/ordersPerPage)
        let b = userOrders.length%ordersPerPage

        if (b!==0) {
            a=a+1
        }

        const obj = {
            sortedOrders: userOrder,
            totalOrders: a,
            total: userOrders.length
        }
        res.status(200).send(obj)
    } catch (err) {
        res.status(500).json(err)
    }
})

router.get("/all-orders",  async (req, res) => {
    try {
        const page = req.query.page 
        const ordersPerPage = req.query.limit
        const userOrder = await orders.find({$and: [
            {$or: [{deliverystatus: req.query.tab==="Pending Orders" ? "Seller Processing" : "Cancelled"}, {deliverystatus:req.query.tab==="Pending Orders" ? "In Transit" : "Delivered"}, {deliverystatus:req.query.tab==="Pending Orders" ? null : "Returned/Refunded"}, {deliverystatus:req.params.deliverystatus==="Pending Orders" ? null : "Returned to Seller"}]},
            {deliveryoption: req.query.deliveryoption!=="" ? req.query.deliveryoption : ["Flash Express", "J&T Express"]},
            {deliverystatus: req.query.deliverystatus!=="" ? req.query.deliverystatus : {$ne: null}},
            {billingstatus: {$ne: "On Hold"}},
            {createdAt: {$gte: req.query.start, $lt: req.query.end}},
            {_id: req.query.searchString.length===24 ? new ObjectId(req.query.searchString) : {$ne: null}}
        ]})
        .skip(page*ordersPerPage)
        .limit(ordersPerPage)
        .populate({path:"items.item", select:["name", "displayimage", "price", "origprice"]})
        .sort({createdAt: -1})
        
        const userOrders = await orders.find({$and: [
            {$or: [{deliverystatus: req.query.tab==="Pending Orders" ? "Seller Processing" : "Cancelled"}, {deliverystatus:req.query.tab==="Pending Orders" ? "In Transit" : "Delivered"}, {deliverystatus:req.query.tab==="Pending Orders" ? null : "Returned/Refunded"}, {deliverystatus:req.params.deliverystatus==="Pending Orders" ? null : "Returned to Seller"}]},
            {deliveryoption: req.query.deliveryoption!=="" ? req.query.deliveryoption : ["Flash Express", "J&T Express"]},
            {deliverystatus: req.query.deliverystatus!=="" ? req.query.deliverystatus : {$ne: null}},
            {billingstatus: {$ne: "On Hold"}},
            {createdAt: {$gte: req.query.start, $lt: req.query.end}},
            {_id: req.query.searchString.length===24 ? new ObjectId(req.query.searchString) : {$ne: null}}
        ]})
        let a = Math.floor(userOrders.length/ordersPerPage)
        let b = userOrders.length%ordersPerPage

        if (b!==0) {
            a=a+1
        }
        const obj = {
            sortedOrders: userOrder,
            totalOrders: a,
            total: userOrders.length
        }
        res.status(200).send(obj)
    } catch (err) {
        res.status(500).json(err)
    }
})

router.get("/get-order", auth, async (req, res) => {
    try {
        const searchOrder = await orders.findById(req.query.orderid)
        .populate({path:"items.item", select:["name", "displayimage", "price", "origprice"]})

        res.status(200).json(searchOrder)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/update-order/:id", auth, async (req, res) => {
    try {
        if (req.body.status==="Returned to Seller" || req.body.status==="Cancel Order"){
            if (req.body.paymentoption!=="COD") {
                const options = {
                    method: 'POST',
                    url: 'https://api.paymongo.com/refunds',
                    headers: {
                        accept: 'application/json',
                        'content-type': 'application/json',
                        authorization: process.env.PAYMONGO_SECRETKEY
                    },
                    data: {
                        data: {
                            attributes: {
                                amount: req.body.netamount*100,
                                payment_id: req.body.paymentid,
                                reason: 'requested_by_customer',
                                notes: req.body.status==="Returned to Seller" ? "Returned to Seller" : "Cancelled"
                            }
                        }
                    }
                }
        
                axios.request(options)
                .then(async function () {
                    await orders.findByIdAndUpdate({_id: req.params.id}, {trackingnumber: req.body.tracking, deliverystatus: req.body.status})
                    res.status(200).send(true)
                })
                .catch(function (error) {
                    console.error(error)
                })
            } else if (req.body.paymentoption==="COD") {
                const ourData = await orders.findByIdAndUpdate({_id: req.params.id}, {
                    billingstatus: "Cancelled",
                    refundedat: Date.now(),
                    deliverystatus: req.body.status==="Returned to Seller" ? "Returned to Seller" : "Cancelled",
                    reason: req.body.reason
                })
        
                if (ourData){
                    ourData.items.map( async (a)=> {
                        if (a.type==="package") {
                            await package.findByIdAndUpdate({_id: a.item}, {$inc: {stock: a.quantity}})
                        } else if (a.type==="single") {
                            await product.findByIdAndUpdate({_id: a.item}, {$inc: {stock: a.quantity}})
                        }
                    }) 
                }
                res.status(200).send(true)
            }
        } else if (req.body.status==="Delivered") {
            if (req.body.paymentoption!=="COD"){
                await orders.findByIdAndUpdate({_id: req.params.id}, {trackingnumber: req.body.tracking, deliverystatus: req.body.status, deliveredat: Date.now()})
                res.status(200).send(true)
            } else if (req.body.paymentoption==="COD") {
                await orders.findByIdAndUpdate({_id: req.params.id}, {trackingnumber: req.body.tracking, deliverystatus: req.body.status, billingstatus: "Paid", paidat: Date.now(), deliveredat: Date.now()})
                res.status(200).send(true)
            }
        } else {
            if (req.body.paymentoption!=="COD"){
                await orders.findByIdAndUpdate({_id: req.params.id}, {trackingnumber: req.body.tracking, deliverystatus: req.body.status})
                res.status(200).send(true)
            } else if (req.body.paymentoption==="COD") {
                await orders.findByIdAndUpdate({_id: req.params.id}, {trackingnumber: req.body.tracking, deliverystatus: req.body.status})
                res.status(200).send(true)
            }
        }
    } catch (err) {
        console.log(err)
        res.status(500).send(false)
    }
})

module.exports = router