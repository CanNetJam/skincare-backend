const express = require ("express");
const router = express.Router();
const reviews = require ("../models/reviews.js");
const orders = require ("../models/orders.js");
const auth = require("../middleware/auth");
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

router.post("/submit-review", auth, upload.fields([{ name: 'reviewimage', maxCount: 1 }]), async (req, res) => {
    try {
        const theItem = JSON.parse(req.body.itemtoreview)
        const obj = {
            orderid: req.body.orderid,
            userid: req.body.userid,
            owner: req.body.owner,
            product: {
                productid: theItem.item._id,
                type: theItem.type
            },
            description: req.body.description,
            rating: Number(req.body.rating),
            recommended: req.body.recommend,
            status: "visible"
        }
        if (req.files?.reviewimage){
            for (let i=0; i<req.files.reviewimage.length; i++) {
                const imageResize = await sharp(req.files.reviewimage[i]?.buffer)
                .resize({width: 350, height: 350, fit: sharp.fit.cover,})
                .toFormat('webp')
                .webp({ quality: 80 })
                .toBuffer()

                const uploadParams = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: crypto.pbkdf2Sync(req.files.reviewimage[i].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + ".webp",
                    Body: imageResize,
                    ContentType: req.files.reviewimage[i]?.mimetype
                }
                const uploadPhoto = new PutObjectCommand(uploadParams)
                await s3.send(uploadPhoto)
                obj.reviewimage = uploadParams?.Key
            }
        }

        const createReview = await reviews.create(obj)
        
        if (createReview) {
            const theOrder = await orders.findById({_id: obj.orderid})

            let newItems = []
            let oldItems = theOrder.items
            for (let i=0; i<oldItems.length; i++) {
                if (JSON.stringify(oldItems[i].item)===JSON.stringify(obj.product.productid)) {    
                    newItems.push({
                        reviewed: true,
                        item: oldItems[i].item,
                        price: oldItems[i].price,
                        quantity: oldItems[i].quantity,
                        type: oldItems[i].type,
                        withticket: oldItems[i].withticket,
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

router.get("/get-reviews", async (req, res) => {
    try {
        const rawsort = req.query.sortBy
        function interpret(a) {
            let b, c
            if (a === "Newest first") {
              b = "createdAt"
              c = -1
              return {b, c}
            }
            if (a === "Oldest first") {
              b = "createdAt"
              c = 1
              return {b, c}
            }
        }
        const sort = interpret(rawsort)

        const page = req.query.page 
        const reviewsPerPage = req.query.limit
        let sortedProductList = []
        for (let i=0; i<req.query?.productlist?.length; i++){
            if (typeof req.query.productlist[i]==="string") {
                sortedProductList.push(new ObjectId(req.query.productlist[i]))
            } else {
                sortedProductList.push(new ObjectId(req.query.productlist[i]._id))
            }
        }

        const orderReview = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
            {rating: req.query.filterBy!=='' ? req.query.filterBy : {$ne: null}}
        ]})
        .skip(page*reviewsPerPage)
        .limit(reviewsPerPage)
        .populate({path: "userid", select: ["firstname", "displayimage"]})
        .sort({[sort.b]: sort.c})

        const orderReviews = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
            {rating: req.query.filterBy!=='' ? req.query.filterBy : {$ne: null}}
        ]})

        const allReviews = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
        ]})

        let a = Math.floor(orderReviews.length/reviewsPerPage)
        let b = orderReviews.length%reviewsPerPage

        if (b!==0) {
            a=a+1
        }
        
        const fiveRating = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
            { rating: 5}
        ]})
        const fourRating = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
            { rating: 4}
        ]})
        const threeRating = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
            { rating: 3}
        ]})
        const twoRating = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
            { rating: 2}
        ]})
        const oneRating = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
            { rating: 1}
        ]})

        const mostUpvote = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
        ]})
        .populate({path: "userid", select: ["firstname", "displayimage"]})
        .sort({upvotes: -1})

        const obj = {
            allreviews: allReviews,
            sortedReviews: orderReview,
            totalReviews: a,
            fiveCount: fiveRating.length,
            fourCount: fourRating.length,
            threeCount: threeRating.length,
            twoCount: twoRating.length,
            oneCount: oneRating.length,
            total: allReviews.length,
            mostUpvote: mostUpvote[0]
        }
        res.status(200).send(obj)
    } catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/add-upvote", async (req, res) => {
    try {
        await reviews.findByIdAndUpdate({_id: req.body.reviewid}, {$inc: {upvotes: 1}})
        res.status(200).json(true)
    } catch (err) {
        res.status(500).send(false)
    }
})

router.delete("/delete-review/:id", async (req, res) => {
    const doc = await reviews.findById(req.params.id)

    if (doc?.reviewimage) {
        const command = new DeleteObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: doc?.reviewimage,
        })
        await s3.send(command)
    }
    const account = await reviews.findByIdAndDelete(doc)  
    if (account) {
        res.status(200).json(account)
    } else {
        res.status(500).json(false)
    }
})

module.exports = router