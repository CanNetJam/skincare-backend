const express = require ("express");
const product = require ("../models/product.js");
const reviews = require ("../models/reviews.js");
const router = express.Router();
const { ObjectId } = require ("mongodb");
const cloudinary = require('cloudinary').v2

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
    if (req.body?.ingphoto){
        if (req.body.ingphoto[0]!==undefined) {
            newIngredients = newIngredients.map((a, index)=> {
                return {...a, photo: req.body.ingphoto[index]}
            })
        }
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
            moreimage: req.body.moreimage,
            routines: JSON.parse(req.body.routines)
        }
        const newProduct = await product.create(obj)
        res.status(200).json(newProduct)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/update-product", async (req, res) => {
    let newIngredients = JSON.parse(req.body.ingredients)
    if (req.body?.ingphoto){
        if (req.body.ingphoto[0]!==undefined) {
            newIngredients = newIngredients.map((a, index)=> {
                return {...a, photo: req.body.ingphoto[index]}
            })
        }
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
            moreimage: req.body.moreimage,
            routines: JSON.parse(req.body.routines)
        }
        const info = await product.findByIdAndUpdate({ _id: new ObjectId(req.body._id) }, {$set: obj})

        if (req.body.displayimage!==undefined) {
            if (info.displayimage!==req.body.displayimage) {
                cloudinary.uploader.destroy(info.displayimage)
            }
        }
        if (info.moreimage[0]!==undefined) {
            for(let i = 0; i<info.moreimage.length; i++){
                if (info.moreimage[i]!==req.body.moreimage[i]) {
                    //console.log(info.moreimage[i]+" a photo on moreimages is deleted")
                    cloudinary.uploader.destroy(info.moreimage[i])
                }
            }
        }
        if (info.ingredients[0]!==undefined) {
            for(let i = 0; i<info.ingredients.length; i++){
                if (info.ingredients[i].photo!==req.body.ingphoto[i]) {
                    //console.log(info.ingredients[i].photo+" a photo on ingredients is deleted")
                    cloudinary.uploader.destroy(info.ingredients[i].photo)
                }
            }
        }
        res.status(200).json(true)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

module.exports = router