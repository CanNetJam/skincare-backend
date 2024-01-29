const express = require ("express");
const router = express.Router();
const accounts = require ("../models/accounts.js");
const product = require ("../models/product.js");
const package = require ("../models/package.js");
const orders = require ("../models/orders.js");
const auth = require("../middleware/auth");
const axios = require('axios');

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
            amounttotal: req.body.amounttotal,
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
        }

        const addOrder = await orders.create(obj)
        if (addOrder) {
            let destructuredCart = []

            obj.items.map((a)=> {
                destructuredCart.push({
                    currency: 'PHP',
                    images: [
                        `https://res.cloudinary.com/drjkqwabe/image/upload/f_auto,q_50/${a.product.displayimage}.jpg`
                    ],
                    amount: a.price*100,
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
                amount: 40*100,
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

            const options = {
                method: 'POST',
                url: 'https://api.paymongo.com/v1/checkout_sessions',
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                    authorization: 'Basic c2tfdGVzdF9iQzFuUU5rQmMxSHVrbnNMVXJERTVucDE6'
                },
                data: {
                    data: {
                        attributes: {
                            billing: {
                                address: {
                                    city: obj.billingaddress.city,
                                    state: obj.billingaddress.province,
                                    postal_code: obj.billingaddress.postal,
                                    country: 'PH',
                                    line1: obj.billingaddress.street,
                                    line2: obj.billingaddress.barangay,
                                },
                                name: obj.owner,
                                email: obj.email,
                                phone: obj.phone
                            },
                            customer_email: obj.email,
                            send_email_receipt: false,
                            show_description: true,
                            show_line_items: true,
                            reference_number: addOrder._id,
                            cancel_url: `${true ? 'http://localhost:5173/' : 'https://kluedskincare.com/'}#/cartdetails`,
                            description: `Order checkout paid through ${obj.paymentoption}`,
                            line_items: destructuredCart,
                            payment_method_types: [truePayment],
                            success_url: `${true ? 'http://localhost:5173/' : 'https://kluedskincare.com/'}`,
                            metadata: {
                                customer_number: req.params.id,
                                deliveryoption: obj.deliveryoption,
                                order_id: addOrder._id
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
                    console.error("Checkout: "+error)
                })
        } else {
            res.status(200).json(true)
        }
    } catch (err) {
        res.status(500).json(err)
    }
})

router.post("/checkout_webhook", async (req, res) => {
    if (req.body.data.attributes.type==='payment.paid'){
        const ourData = await orders.findByIdAndUpdate({_id: req.body.data.attributes.data.attributes.metadata.order_id}, {billingstatus: "Paid", ammountpaid: req.body.data.attributes.data.attributes.ammount/100, paidat: Date.now()})
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
        }
    }
    res.status(200).send('Paymongo event transmitted!')
})

router.get("/:id/:deliverystatus", auth, async (req, res) => {
    try {
        const page = req.query.page
        const ordersPerPage = req.query.limit

        const userOrder = await orders.find({
            userid: req.params.id, 
            deliverystatus: req.params.deliverystatus==="Pending Orders" ? {$ne : "Delivered"} : "Delivered"
        })
        .skip(page*ordersPerPage)
        .limit(ordersPerPage)
        .populate({path:"items.item", select:["name", "displayimage", "price", "origprice"]})
        .sort({createdAt: -1})

        const userOrders = await orders.find({
            userid: req.params.id, 
            deliverystatus: req.params.deliverystatus==="Pending Orders" ? {$ne : "Delivered"} : "Delivered"
        })

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

router.get("/all-orders", auth, async (req, res) => {
    try {
        const page = req.query.page 
        const ordersPerPage = req.query.limit
        const userOrder = await orders.find({$and: [
            {deliverystatus: req.query.tab==="Pending Orders" ? {$ne : "Delivered"} : "Delivered"},
            {deliveryoption: req.query.deliveryoption!=="" ? req.query.deliveryoption : ["Flash Express", "J&T Express"]},
            {deliverystatus: req.query.deliverystatus},
            {createdAt: {$gte: req.query.start, $lt: req.query.end}}
        ]})
        .skip(page*ordersPerPage)
        .limit(ordersPerPage)
        .populate({path:"items.item", select:["name", "displayimage", "price", "origprice"]})
        .sort({createdAt: -1})

        const userOrders = await orders.find({$and: [
            {deliverystatus: req.query.tab==="Pending Orders" ? {$ne : "Delivered"} : "Delivered"},
            {deliverystatus: req.query.deliverystatus}
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

router.post("/update-order/:id", auth, async (req, res) => {
    try {
        const updateOrder = await orders.findByIdAndUpdate({_id: req.params.id}, {trackingnumber: req.body.tracking, deliverystatus: req.body.status})
        res.status(200).send(true)
    } catch (err) {
        res.status(500).send(false)
    }
})

module.exports = router