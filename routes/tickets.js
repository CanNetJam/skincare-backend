const express = require ("express");
const router = express.Router();
const orders = require ("../models/orders.js");
const tickets = require ("../models/tickets.js");
const auth = require("../middleware/auth");
const axios = require('axios');
const { ObjectId } = require ("mongodb");

router.post("/submit-ticket", auth, async (req, res) => {
    try {
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
            status: "Pending"
        }
        const submitTicket = await tickets.create(obj)
        res.status(200).json(true)
    } catch (err) {
        res.status(500).send(false)
    }
})

router.get("/all-tickets", auth, async (req, res) => {
    try {
        const page = req.query.page 
        const ticketsPerPage = req.query.limit
        const userTicket = await tickets.find({$and: [
            {status: req.query.status!=="" ? req.query.status : {$ne: "Pending"}},
            {createdAt: {$gte: req.query.start, $lt: req.query.end}},
            {_id: req.query.searchString.length===24 ? new ObjectId(req.query.searchString) : {$ne: null}}
        ]})
        .skip(page*ticketsPerPage)
        .limit(ticketsPerPage)
        .populate({path:"orderid", select:["deliverystatus", "items", "paymentoption", "billingstatus", "deliverystatus", "amounttotal", "amountpaid", "createdAt", "paidat", "paymentid"]})
        .sort({createdAt: -1})

        const userTickets = await tickets.find({$and: [
            {status: req.query.status!=="" ? req.query.status : {$ne: "Pending"}},
            {createdAt: {$gte: req.query.start, $lt: req.query.end}},
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
                            amount: req.body.amountpaid*100,
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
        } else if (req.body.status==="Rejected") {
            await tickets.findByIdAndUpdate({_id: req.params.id}, {status: req.body.status, respondedAt: Date.now(), response: req.body.reason})
            res.status(200).send(true)
        }
    } catch (err) {
        res.status(500).send(false)
    }
})

router.get("/:id/:tab", auth, async (req, res) => {
    try {
        const page = req.query.page 
        const ticketsPerPage = req.query.limit
        const userTicket = await tickets.find({$and: [
            {userid: req.params.id}, 
            {status: req.params.tab==="Pending Tickets" ? "Pending" : {$ne: "Pending"}}
        ]})
        .skip(page*ticketsPerPage)
        .limit(ticketsPerPage)
        .populate({path:"orderid", select:["deliverystatus", "items", "paymentoption", "billingstatus", "deliverystatus", "amounttotal", "amountpaid", "createdAt", "paidat", "paymentid", "userid"]})
        .sort({updatedAt: -1})
        
        const userTickets = await tickets.find({$and: [
            {userid: req.params.id}, 
            {status: req.params.tab==="Pending Tickets" ? "Pending" : {$ne: "Pending"}}
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

module.exports = router