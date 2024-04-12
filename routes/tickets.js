const express = require ("express");
const router = express.Router();
const orders = require ("../models/orders.js");
const tickets = require ("../models/tickets.js");
const product = require ("../models/product.js");
const package = require ("../models/package.js");
const auth = require("../middleware/auth");
const axios = require('axios');
const { ObjectId } = require ("mongodb");
const multer  = require('multer');
const path = require("path");
const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");
const s3 = new S3Client({
    region: process.env.BUCKET_REGION
})
const storage = multer.memoryStorage()
const upload = multer({ storage: storage });

router.post("/submit-ticket", auth, upload.fields([{ name: 'waybillimage', maxCount: 1 }, { name: 'productimage1', maxCount: 1 }, { name: 'productimage2', maxCount: 1 }]), async (req, res) => {
    try {
        const itemFocus = JSON.parse(req.body.items)
        filteredItems = itemFocus.map((a)=> {
            return {
                product: a.item._id,
                name: a.item.name,
                price: a.price,
                quantity: a.quantity,
                type: a.type
            }
        })
        const obj = {
            orderid: req.body.orderid,
            userid: req.body.userid,
            owner: req.body.owner,
            type: req.body.type,
            mainreason: req.body.mainreason,
            description: req.body.description,
            status: "Investigating",
            transactionfee: req.body.transactionfee,
            items: filteredItems,
            expiresAt: Date.now() + 172800000
        }

        if (req.files?.waybillimage){
            for (let i=0; i<req.files.waybillimage.length; i++) {
                const imageResize = await sharp(req.files.waybillimage[i]?.buffer)
                .resize({width: 800, height: 800, fit: sharp.fit.cover,})
                .toFormat('webp')
                .webp({lossless:true, quality: 100 })
                .toBuffer()

                const uploadParams = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: crypto.pbkdf2Sync(req.files.waybillimage[i].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + ".webp",
                    Body: imageResize,
                    ContentType: req.files.waybillimage[i]?.mimetype
                }
                const uploadPhoto = new PutObjectCommand(uploadParams)
                await s3.send(uploadPhoto)
                obj.waybillimage = uploadParams?.Key
            }
        }
        if (req.files?.productimage1){
            for (let i=0; i<req.files.productimage1.length; i++) {
                const imageResize = await sharp(req.files.productimage1[i]?.buffer)
                .resize({width: 800, height: 800, fit: sharp.fit.cover,})
                .toFormat('webp')
                .webp({ quality: 75 })
                .toBuffer()

                const uploadParams = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: crypto.pbkdf2Sync(req.files.productimage1[i].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + ".webp",
                    Body: imageResize,
                    ContentType: req.files.productimage1[i]?.mimetype
                }
                const uploadPhoto = new PutObjectCommand(uploadParams)
                await s3.send(uploadPhoto)
                obj.productimage1 = uploadParams?.Key
            }
        }
        if (req.files?.productimage2){
            for (let i=0; i<req.files.productimage2.length; i++) {
                const imageResize = await sharp(req.files.productimage2[i]?.buffer)
                .resize({width: 800, height: 800, fit: sharp.fit.cover,})
                .toFormat('webp')
                .webp({ quality: 75 })
                .toBuffer()

                const uploadParams = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: crypto.pbkdf2Sync(req.files.productimage2[i].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + ".webp",
                    Body: imageResize,
                    ContentType: req.files.productimage2[i]?.mimetype
                }
                const uploadPhoto = new PutObjectCommand(uploadParams)
                await s3.send(uploadPhoto)
                obj.productimage2 = uploadParams?.Key
            }
        }

        const submitTicket = await tickets.create(obj)
        if (submitTicket) {
            await orders.findByIdAndUpdate({_id: obj.orderid}, {reviewed: true, ticketid: submitTicket._id })
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
            {status: req.query.status==="Investigating" ? "Investigating" : {$ne: "Investigating"}},
            {createdAt: {$gte: req.query.start, $lt: req.query.end}},
            {expiresAt: req.query.status==="Ivestigating" ? {$gte: new Date.now()} : {$ne: null}},
            {_id: req.query.searchString.length===24 ? new ObjectId(req.query.searchString) : {$ne: null}}
        ]})
        .skip(page*ticketsPerPage)
        .limit(ticketsPerPage)
        .populate({path:"orderid", select:["deliverystatus", "items", "paymentoption", "billingstatus", "deliverystatus", "amounttotal", "amountpaid", "createdAt", "paidat", "paymentid", "netamount", "shippingfee", "transactionfee"]})
        .sort({createdAt: -1})
        
        const userTickets = await tickets.find({$and: [
            {status: req.query.status==="Investigating" ? "Investigating" : {$ne: "Investigating"}},
            {createdAt: {$gte: req.query.start, $lt: req.query.end}},
            {expiresAt: req.query.status==="Ivestigating" ? {$gte: new Date.now()} : {$ne: null}},
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
                    await tickets.findByIdAndUpdate({_id: req.params.id}, {status: req.body.status, respondedAt: Date.now(), response: req.body.reason, open: false})
                    res.status(200).send(true)
                })
                .catch(function (error) {
                    console.error(error)
                })
            } else if (req.body.paymentoption==="COD") {
                await tickets.findByIdAndUpdate({_id: req.params.id}, {status: req.body.status, respondedAt: Date.now(), response: req.body.reason, open: false})
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
            await tickets.findByIdAndUpdate({_id: req.params.id}, {status: req.body.status, respondedAt: Date.now(), response: req.body.reason, open: false})
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