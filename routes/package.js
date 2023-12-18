const express = require ("express");
const package = require ("../models/package.js");
const router = express.Router();

router.get("/get-all-packages", async (req, res) => {
    try {
        const allPackage = await package.find()
        res.status(200).json(allPackage)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.get("/get-package", async (req, res) => {
    try {
        const searchPackage = await package.findById(req.query.packageid)
        .populate({path:"items", select:["name", "displayimage", "maindesc"]})
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
            productlinks: {
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

module.exports = router