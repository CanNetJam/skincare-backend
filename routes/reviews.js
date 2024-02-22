const express = require ("express");
const router = express.Router();
const reviews = require ("../models/reviews.js");
const orders = require ("../models/orders.js");
const auth = require("../middleware/auth");

router.post("/submit-review", auth, async (req, res) => {
    try {
        let rawItems = JSON.parse(req.body.item)
        rawItems = rawItems.map((a)=> {
            return {
                productid: a.item._id,
                type: a.type
            }
        })
        const obj = {
            orderid: req.body.orderid,
            userid: req.body.userid,
            owner: req.body.owner,
            product: rawItems,
            description: req.body.description,
            reviewimage: req.body.reviewimage,
            rating: Number(req.body.rating),
            recommended: req.body.recommend,
            status: "visible"
        }
        const createReview = await reviews.create(obj)
        
        if (createReview) {
            await orders.findByIdAndUpdate({_id: obj.orderid}, {reviewed: true})
            res.status(200).json(true)
        }
    } catch (err) {
        res.status(500).send(false)
    }
})

router.get("/:id", async (req, res) => {
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
        const orderReview = await reviews.find({$and: [
            {product: {$elemMatch: {productid: req.params.id}}},
            {rating: req.query.filterBy!=='' ? req.query.filterBy : {$ne: null}}
        ]})
        .skip(page*reviewsPerPage)
        .limit(reviewsPerPage)
        .populate({path: "userid", select: ["firstname", "displayimage"]})
        .sort({[sort.b]: sort.c})
        
        const orderReviews = await reviews.find({$and: [
            {product: {$elemMatch: {productid: req.params.id}}},
            {rating: req.query.filterBy!=='' ? req.query.filterBy : {$ne: null}}
        ]})

        const allReviews = await reviews.find({$and: [
            {product: {$elemMatch: {productid: req.params.id}}},
        ]})

        let a = Math.floor(orderReviews.length/reviewsPerPage)
        let b = orderReviews.length%reviewsPerPage

        if (b!==0) {
            a=a+1
        }

        const fiveRating = await reviews.find({$and: [
            { product: {$elemMatch: {productid: req.params.id}} },
            { rating: 5}
        ]})
        const fourRating = await reviews.find({$and: [
            { product: {$elemMatch: {productid: req.params.id}} },
            { rating: 4}
        ]})
        const threeRating = await reviews.find({$and: [
            { product: {$elemMatch: {productid: req.params.id}} },
            { rating: 3}
        ]})
        const twoRating = await reviews.find({$and: [
            { product: {$elemMatch: {productid: req.params.id}} },
            { rating: 2}
        ]})
        const oneRating = await reviews.find({$and: [
            { product: {$elemMatch: {productid: req.params.id}} },
            { rating: 1}
        ]})

        const mostUpvote = await reviews.find({$and: [
            {product: {$elemMatch: {productid: req.params.id }}}
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

module.exports = router