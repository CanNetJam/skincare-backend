const express = require ("express");
const package = require ("../models/package.js");
const router = express.Router();
const { ObjectId } = require ("mongodb");
const cloudinary = require('cloudinary').v2

router.get("/get-all-packages", async (req, res) => {
    try {
        const allPackage = await package.find()
        .populate({path:"items", select:["name", "displayimage", "maindesc", "usage"]})
        res.status(200).json(allPackage)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.get("/get-package", async (req, res) => {
    try {
        const searchPackage = await package.findById(req.query.packageid)
        .populate({path:"items", select:["name", "displayimage", "maindesc", "usage"]})
        res.status(200).json(searchPackage)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/create-package", async (req, res) => {
    try {
        const obj = {
            name: req.body.name,
            maindesc: req.body.maindesc,
            moredesc: req.body.moredesc,
            stock: req.body.stock,
            displayimage: req.body.displayimage,
            origprice: req.body.origprice,
            disprice: req.body?.disprice ? req.body.disprice : "",
            packagelinks: {
                shopee: req.body.shopeelink,
                tiktok: req.body.tiktoklink,
                lazada: req.body.lazadalink,
            },
            moreimage: req.body.moreimage,
            routines: JSON.parse(req.body.routines),
            items: JSON.parse(req.body.items)
        }
        const newPackage = await package.create(obj)
        res.status(200).json(newPackage)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/update-package", async (req, res) => {
    try {
        const obj = {
            name: req.body.name,
            maindesc: req.body.maindesc,
            moredesc: req.body.moredesc,
            stock: req.body.stock,
            displayimage: req.body.displayimage,
            origprice: req.body.origprice,
            disprice: req.body?.disprice ? req.body.disprice : "",
            packagelinks: {
                shopee: req.body.shopeelink,
                tiktok: req.body.tiktoklink,
                lazada: req.body.lazadalink,
            },
            moreimage: req.body.moreimage,
            routines: JSON.parse(req.body.routines),
            items: JSON.parse(req.body.items)
        }
        const info = await package.findByIdAndUpdate({ _id: new ObjectId(req.body._id) }, {$set: obj})

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
        res.status(200).json(true)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

module.exports = router