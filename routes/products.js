const express = require ("express");
const product = require ("../models/product.js");
const router = express.Router();

router.get("/get-all-products", async (req, res) => {
    try {
        const allProduct = await product.find()
        res.status(200).json(allProduct)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.get("/get-product", async (req, res) => {
    try {
        const searchProduct = await product.findById(req.query.productid)
        res.status(200).json(searchProduct)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/create-product", async (req, res) => {
    let newIngredients = JSON.parse(req.body.ingredients)
    if (req.body.ingphoto[0]!==undefined) {
        newIngredients = newIngredients.map((a, index)=> {
            return {...a, photo: req.body.ingphoto[index]}
        })
    }
    
    try {
        const obj = {
            name: req.body.name,
            maindesc: req.body.maindesc,
            stock: req.body.stock,
            usage: req.body.usage,
            extra: req.body.extra,
            displayimage: req.body.displayimage,
            price: req.body.price,
            category: req.body.category,
            productlinks: {
                shopee: req.body.shopeelink,
                tiktok: req.body.tiktoklink,
                lazada: req.body.lazadalink,
            },
            ingredients: newIngredients,
            do: JSON.parse(req.body.do),
            dont: JSON.parse(req.body.dont),
            morroutine: JSON.parse(req.body.morroutine),
            nigroutine: JSON.parse(req.body.nigroutine),
            moreimage: req.body.moreimage
        }
        const newProduct = await product.create(obj)
        res.status(200).json(newProduct)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

module.exports = router