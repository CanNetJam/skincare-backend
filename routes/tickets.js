const express = require ("express");
const router = express.Router();
const orders = require ("../models/orders.js");
const tickets = require ("../models/tickets.js");
const product = require ("../models/product.js");
const package = require ("../models/package.js");
const auth = require("../middleware/auth");
const axios = require('axios');
const { ObjectId } = require ("mongodb");

router.post("/submit-ticket", auth, async (req, res) => {
    try {
        const itemFocus = JSON.parse(req.body.item)
        const obj = {
            orderid: req.body.orderid,
            userid: req.body.userid,
            owner: req.body.owner,
            type: req.body.type,
            mainreason: req.body.mainreason,
            description: req.body.description,
            waybillimage: req.body.waybillimage,
            productimage1: req.body.productimage1,
            productimage2: req.body.productimage2,
            status: "Investigating",
            transactionfee: req.body.transactionfee,
            item: {
                product: itemFocus.item._id,
                name: itemFocus.item.name,
                price: itemFocus.price,
                quantity: req.body.itemquantity,
                type: itemFocus.type
            },
            expiresAt: Date.now() + 172800000
        }
        const submitTicket = await tickets.create(obj)
        if (submitTicket) {
            const theOrder = await orders.findById({_id: obj.orderid})
            let newItems = []
            let oldItems = theOrder.items
            for (let i=0; i<oldItems.length; i++) {
                if (JSON.stringify(oldItems[i].item)===JSON.stringify(obj.item.product)) {    
                    newItems.push({
                        withticket: true,
                        item: oldItems[i].item,
                        price: oldItems[i].price,
                        quantity: oldItems[i].quantity,
                        type: oldItems[i].type,
                        _id: oldItems[i]._id
                    })
                } else {
                    newItems.push(oldItems[i])
                }
            }
            await orders.findByIdAndUpdate({_id: obj.orderid}, {items: newItems })
        }
        res.status(200).json(true)
    } catch (err) {
        console.log(err)
        res.status(500).send(false)
    }
})

router.get("/all-tickets", auth, async (req, res) => {
    try {
        const page = req.query.page 
        const ticketsPerPage = req.query.limit
        const userTicket = await tickets.find({$and: [
            {status: req.query.status!=="" ? req.query.status : {$ne: null}},
            {createdAt: {$gte: req.query.start, $lt: req.query.end}},
            {expiresAt: req.query.status==="Investigating" ? {$gte: req.query.end }: {$ne: null}},
            {_id: req.query.searchString.length===24 ? new ObjectId(req.query.searchString) : {$ne: null}}
        ]})
        .skip(page*ticketsPerPage)
        .limit(ticketsPerPage)
        .populate({path:"orderid", select:["deliverystatus", "items", "paymentoption", "billingstatus", "deliverystatus", "amounttotal", "amountpaid", "createdAt", "paidat", "paymentid", "netamount"]})
        .sort({createdAt: -1})
        
        const userTickets = await tickets.find({$and: [
            {status: req.query.status!=="" ? req.query.status : {$ne: null}},
            {createdAt: {$gte: req.query.start, $lt: req.query.end}},
            {expiresAt: req.query.status==="Investigating" ? {$gte: req.query.end }: {$ne: null}},
            {_id: req.query.searchString.length===24 ? new ObjectId(req.query.searchString) : {$ne: null}}
        ]})
        let a = Math.floor(userTickets.length/ticketsPerPage)
        let b = userTickets.length%ticketsPerPage

        if (b!==0) {
            a=a+1
        }
        const obj = {
            sortedTickets: userTicket,
            totalTickets: a,
            total: userTickets.length
        }
        res.status(200).send(obj)
    } catch (err) {
        res.status(500).json(err)
    }
})

router.post("/ticket-response/:id", auth, async (req, res) => {
    try {
        if (req.body.status==="Approved") {
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
                                notes: "Returned/Refunded"
                            }
                        }
                    }
                }

                axios.request(options)
                .then(async function () {
                    await tickets.findByIdAndUpdate({_id: req.params.id}, {status: req.body.status, respondedAt: Date.now(), response: req.body.reason})
                    res.status(200).send(true)
                })
                .catch(function (error) {
                    console.error(error)
                })
            } else if (req.body.paymentoption==="COD") {
                await tickets.findByIdAndUpdate({_id: req.params.id}, {status: req.body.status, respondedAt: Date.now(), response: req.body.reason})
                const ourData = await orders.findByIdAndUpdate({_id: req.body.orderid}, {
                    billingstatus: "Refunded",
                    refundedat: Date.now(),
                    deliverystatus: "Returned/Refunded",
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
        } else if (req.body.status==="Rejected") {
            await tickets.findByIdAndUpdate({_id: req.params.id}, {status: req.body.status, respondedAt: Date.now(), response: req.body.reason})
            res.status(200).send(true)
        }
    } catch (err) {
        console.log(err)
        res.status(500).send(false)
    }
})

router.get("/:id/:tab", auth, async (req, res) => {
    try {
        const page = req.query.page 
        const ticketsPerPage = req.query.limit
        // const userTicket = await tickets.find({$and: [
        //     {userid: req.params.id}, 
        //     {status: req.params.tab==="Pending Tickets" ? "Pending" : {$ne: "Pending"}}
        // ]})
        const userTicket = await tickets.find({$and: [
            {userid: req.params.id}
        ]})
        .skip(page*ticketsPerPage)
        .limit(ticketsPerPage)
        .populate({path:"orderid", select:["deliverystatus", "items", "paymentoption", "billingstatus", "deliverystatus", "amounttotal", "amountpaid", "createdAt", "paidat", "paymentid", "userid"]})
        .sort({updatedAt: -1})
        
        // const userTickets = await tickets.find({$and: [
        //     {userid: req.params.id}, 
        //     {status: req.params.tab==="Pending Tickets" ? "Pending" : {$ne: "Pending"}}
        // ]})
        const userTickets = await tickets.find({$and: [
            {userid: req.params.id}
        ]})
        let a = Math.floor(userTickets.length/ticketsPerPage)
        let b = userTickets.length%ticketsPerPage

        if (b!==0) {
            a=a+1
        }
        const obj = {
            sortedTickets: userTicket,
            totalTickets: a,
            total: userTickets.length
        }
        res.status(200).send(obj)
    } catch (err) {
        res.status(500).json(err)
    }
})

router.get("/get-ticket", auth, async (req, res) => {
    try {
        const searchTicket = await tickets.findById(req.query.ticketid)
        .populate({path:"userid", select:[ "displayimage", "email", "phone", "billingaddress"]})
        .populate({path:"orderid", select:[ "amounttotal"]})

        res.status(200).json(searchTicket)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

module.exports = router