const express = require ("express");
const router = express.Router();
const videos = require('../models/videos.js');
const multer  = require('multer');
const path = require("path");
const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");
const s3 = new S3Client({
    region: process.env.BUCKET_REGION
});
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/all-videos", async (req, res) => {
    try {
        const allVideos = await videos.find()
        .populate({path:"items", select:["name", "displayimage", "productlinks", "price", "origprice", "stock"]})
        .sort({createdAt: -1})
        res.status(200).json(allVideos)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/add-video", upload.fields([{ name: 'source', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
    try {
        const obj = {
            title: req.body.title,
            description: req.body.description,
            videolink: req.body.videolink,
            items: JSON.parse(req.body.items)
        }

        if (req.files?.source){
            for (let i=0; i<req.files.source.length; i++) {
                const uploadParams = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: crypto.pbkdf2Sync(req.files.source[i].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + path.extname(req.files.source[i].originalname),
                    Body: req.files.source[i]?.buffer,
                    ContentType: req.files.source[i]?.mimetype
                }
                const uploadPhoto = new PutObjectCommand(uploadParams)
                await s3.send(uploadPhoto)
                obj.source = uploadParams?.Key
            }
        }
        if (req.files?.thumbnail){
            for (let i=0; i<req.files.thumbnail.length; i++) {
                const imageResize = await sharp(req.files.thumbnail[i]?.buffer)
                .resize({width: 800, height: 800, fit: sharp.fit.cover,})
                .toFormat('webp')
                .webp({ quality: 80 })
                .toBuffer()

                const uploadParams = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: crypto.pbkdf2Sync(req.files.thumbnail[i].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + ".webp",
                    Body: imageResize,
                    ContentType: req.files.thumbnail[i]?.mimetype
                }
                const uploadPhoto = new PutObjectCommand(uploadParams)
                await s3.send(uploadPhoto)
                obj.thumbnail = uploadParams?.Key
            }
        }

        const newProduct = await videos.create(obj)
        res.status(200).json(newProduct)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/update-video", upload.fields([{ name: 'uploadedSource', maxCount: 1 }, { name: 'uploadedThumbnail', maxCount: 1 }]), async (req, res) => {
    try {
        const obj = {
            title: req.body.title,
            description: req.body.description,
            videolink: req.body.videolink,
            items: JSON.parse(req.body.items)
        }

        if (req.files?.uploadedSource){
            for (let i=0; i<req.files.uploadedSource.length; i++) {
                const uploadParams = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: crypto.pbkdf2Sync(req.files.uploadedSource[i].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + path.extname(req.files.uploadedSource[i].originalname),
                    Body: req.files.uploadedSource[i]?.buffer,
                    ContentType: req.files.uploadedSource[i]?.mimetype
                }
                const uploadPhoto = new PutObjectCommand(uploadParams)
                await s3.send(uploadPhoto)
                obj.source = uploadParams?.Key
            }
        } else {
            obj.source = req.body.source
        }

        if (req.files?.uploadedThumbnail){
            for (let i=0; i<req.files.uploadedThumbnail.length; i++) {
                const imageResize = await sharp(req.files.uploadedThumbnail[i]?.buffer)
                .resize({width: 500, height: 500, fit: sharp.fit.cover,})
                .toFormat('webp')
                .webp({ quality: 50 })
                .toBuffer()

                const uploadParams = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: crypto.pbkdf2Sync(req.files.uploadedThumbnail[i].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + ".webp",
                    Body: imageResize,
                    ContentType: req.files.uploadedThumbnail[i]?.mimetype
                }
                const uploadPhoto = new PutObjectCommand(uploadParams)
                await s3.send(uploadPhoto)
                obj.thumbnail = uploadParams?.Key
            }
        } else {
            obj.displayimage = req.body.thumbnail
        }

        const info = await videos.findByIdAndUpdate({ _id: req.body._id }, {$set: obj})
        if (info.source!==obj.source) {
            const command = new DeleteObjectCommand({
                Bucket: process.env.BUCKET_NAME,
                Key: info.source,
            })
            await s3.send(command)
        }
        if (info.thumbnail!==req.body.thumbnail) {
            const command = new DeleteObjectCommand({
                Bucket: process.env.BUCKET_NAME,
                Key: info.thumbnail,
            })
            await s3.send(command)
        }
        res.status(200).json(true)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.delete("/delete-video/:id", async (req, res) => {
    const deletedVideo = await videos.findByIdAndDelete(req.params.id)  
    if (deletedVideo) {
        const command1 = new DeleteObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: deletedVideo.source,
        })
        await s3.send(command1)
        const command2 = new DeleteObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: deletedVideo.thumbnail,
        })
        await s3.send(command2)
        res.status(200).json(deletedVideo)
    } else {
        res.status(500).json(false)
    }
})

module.exports = router