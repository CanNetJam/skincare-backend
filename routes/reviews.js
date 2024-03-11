const express = require ("express");
const router = express.Router();
const reviews = require ("../models/reviews.js");
const orders = require ("../models/orders.js");
const auth = require("../middleware/auth");
const cloudinary = require('cloudinary').v2
const { ObjectId } = require ("mongodb");

router.post("/submit-review", auth, async (req, res) => {
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
            reviewimage: req.body.reviewimage,
            rating: Number(req.body.rating),
            recommended: req.body.recommend,
            status: "visible"
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
        cloudinary.uploader.destroy(doc.reviewimage)
    }
    const account = await reviews.findByIdAndDelete(doc)  
    if (account) {
        res.status(200).json(account)
    } else {
        res.status(500).json(false)
    }
})

module.exports = router