const express = require ("express");
const product = require ("../models/product.js");
const reviews = require ("../models/reviews.js");
const router = express.Router();
const { ObjectId } = require ("mongodb");
const cloudinary = require('cloudinary').v2

router.get("/get-all-products", async (req, res) => {
    try {
        const allProduct = await product.find()
        .populate({path:"relatedproducts", select:["name"]})
        .sort({createdAt: -1})
        res.status(200).json(allProduct)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.get("/get-product", async (req, res) => {
    try {
        const searchProduct = await product.findById(req.query.productid)
        .populate({path:"relatedproducts", select:["name", "displayimage", "disprice", "price", "stock"]})
        res.status(200).json(searchProduct)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/create-product", async (req, res) => {
    // let variations = JSON.parse(req.body.variations)
    // let newVariations = []
    // for (let i=0; i<variations.length; i++){
    //     let varr = variations[i].options
    //     varr = variations[i].options.map((a, index)=> {
    //         return {...a, image: eval(`req.body.${variations[i].name}[${index}]`), origprice: Number(a.origprice), price: Number(a.price), stock: Number(a.stock)}
    //     })
    //     newVariations.push({...variations[i], options: varr})
    // }

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
            disprice: req.body.disprice,
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
            routines: JSON.parse(req.body.routines),
            videos: req.body.prodvid,
            featuredvideos: JSON.parse(req.body.featuredvideos),
            //variation: newVariations
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
            disprice: req.body.disprice,
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
            routines: JSON.parse(req.body.routines),
            videos: req.body.prodvid,
            relatedproducts: JSON.parse(req.body.relatedproducts)
        }
        const info = await product.findByIdAndUpdate({ _id: new ObjectId(req.body._id) }, {$set: obj})

        if (obj.relatedproducts.length>0){
            for (let i=0; i<obj.relatedproducts.length; i++) {
                await product.findByIdAndUpdate({ _id: obj.relatedproducts[i]?._id },  {$addToSet: {relatedproducts: info._id}})
            }
        }
        
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
        
        if (info.videos[0]!==undefined && req.body.prodvid!==undefined) {
            for(let i = 0; i<info.videos.length; i++){
                if (info.videos[i]!==req.body.prodvid[i]) {
                    //console.log(info.videos[i]+" a video is deleted")
                    cloudinary.uploader.destroy(info.videos[i])
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