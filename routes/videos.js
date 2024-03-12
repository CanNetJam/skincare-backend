const express = require ("express");
const router = express.Router();
const videos = require('../models/videos.js');
const cloudinary = require('cloudinary').v2

router.get("/all-videos", async (req, res) => {
    try {
        const allVideos = await videos.find()
        .populate({path:"items", select:["name", "displayimage", "productlinks"]})
        .sort({createdAt: -1})
        res.status(200).json(allVideos)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/add-video", async (req, res) => {
    try {
        const obj = {
            title: req.body.title,
            description: req.body.description,
            videolink: req.body.videolink,
            source: req.body.source,
            items: JSON.parse(req.body.items)
        }
        const newProduct = await videos.create(obj)
        res.status(200).json(newProduct)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/update-video", async (req, res) => {
    try {
        const obj = {
            title: req.body.title,
            description: req.body.description,
            videolink: req.body.videolink,
            source: req.body.source,
            items: JSON.parse(req.body.items)
        }

        const info = await videos.findByIdAndUpdate({ _id: req.body._id }, {$set: obj})
        if (info.source!==req.body.source) {
            cloudinary.uploader.destroy(info.source)
        }
        res.status(200).json(true)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.delete("/delete-video/:id", async (req, res) => {
    const doc = await videos.findById(req.params.id)

    const deletedVideo = await videos.findByIdAndDelete(doc)  
    cloudinary.uploader.destroy(deletedVideo.source)
    if (deletedVideo) {
        res.status(200).json(deletedVideo)
    } else {
        res.status(500).json(false)
    }
})

module.exports = router