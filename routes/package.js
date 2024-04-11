const express = require ("express");
const package = require ("../models/package.js");
const router = express.Router();
const { ObjectId } = require ("mongodb");
const cloudinary = require('cloudinary').v2
const multer  = require('multer');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");
const s3 = new S3Client({
    region: process.env.BUCKET_REGION
});
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

router.post("/create-package", upload.fields([{ name: 'displayimage', maxCount: 1 }, { name: 'moreimage', maxCount: 3 }]), async (req, res) => {
    try {
        const obj = {
            name: req.body.name,
            maindesc: req.body.maindesc,
            moredesc: req.body.moredesc,
            stock: req.body.stock,
            origprice: req.body.origprice,
            disprice: req.body?.disprice ? req.body.disprice : "",
            packagelinks: {
                shopee: req.body.shopeelink,
                tiktok: req.body.tiktoklink,
                lazada: req.body.lazadalink,
            },
            routines: JSON.parse(req.body.routines),
            items: JSON.parse(req.body.items)
        }

        if (req.files?.displayimage){
            for (let i=0; i<req.files.displayimage.length; i++) {
                const imageResize = await sharp(req.files.displayimage[i]?.buffer)
                .resize({width: 800, height: 800, fit: sharp.fit.cover,})
                .toFormat('webp')
                .webp({ quality: 80 })
                .toBuffer()

                const uploadParams = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: crypto.pbkdf2Sync(req.files.displayimage[i].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + ".webp",
                    Body: imageResize,
                    ContentType: req.files.displayimage[i]?.mimetype
                }
                const uploadPhoto = new PutObjectCommand(uploadParams)
                await s3.send(uploadPhoto)
                obj.displayimage = uploadParams?.Key
            }
        }

        if (req.files?.moreimage){
            let imageArray = []
            for (let i=0; i<req.files.moreimage.length; i++) {
                const imageResize = await sharp(req.files.moreimage[i]?.buffer)
                .resize({width: 500, height: 500, fit: sharp.fit.cover,})
                .toFormat('webp')
                .webp({ quality: 50 })
                .toBuffer()

                const uploadParams = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: crypto.pbkdf2Sync(req.files.moreimage[i].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + ".webp",
                    Body: imageResize,
                    ContentType: req.files.moreimage[i]?.mimetype
                }
                const uploadPhoto = new PutObjectCommand(uploadParams)
                await s3.send(uploadPhoto)
                imageArray.push(uploadParams.Key)
            }
            obj.moreimage = imageArray
        } else {
            obj.moreimage = []
        }

        const newPackage = await package.create(obj)
        res.status(200).json(newPackage)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/update-package", upload.fields([{ name: 'displayimage', maxCount: 1 }, { name: 'moreimage', maxCount: 3 }]), async (req, res) => {
    try {
        const obj = {
            name: req.body.name,
            maindesc: req.body.maindesc,
            moredesc: req.body.moredesc,
            stock: req.body.stock,
            origprice: req.body.origprice,
            disprice: req.body?.disprice ? req.body.disprice : "",
            packagelinks: {
                shopee: req.body.shopeelink,
                tiktok: req.body.tiktoklink,
                lazada: req.body.lazadalink,
            },
            routines: JSON.parse(req.body.routines),
            items: JSON.parse(req.body.items)
        }
        if (req.files?.displayimage){
            for (let i=0; i<req.files.displayimage.length; i++) {
                const imageResize = await sharp(req.files.displayimage[i]?.buffer)
                .resize({width: 960, height: 1080, fit: sharp.fit.cover,})
                .toFormat('webp')
                .webp({ quality: 80 })
                .toBuffer()

                const uploadParams = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: crypto.pbkdf2Sync(req.files.displayimage[i].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + ".webp",
                    Body: imageResize,
                    ContentType: req.files.displayimage[i]?.mimetype
                }
                const uploadPhoto = new PutObjectCommand(uploadParams)
                await s3.send(uploadPhoto)
                obj.displayimage = uploadParams?.Key
            }
        } 
        let moreImageList = JSON.parse(req.body.collection)
        if (req.files?.moreimage?.length>0) {
            let uploadedMoreImage = req.files?.moreimage
            if (uploadedMoreImage?.length>0) {
                let filecount = 0
                for (let n=0; n<moreImageList.length; n++) {
                    if (moreImageList[n]==="file") {
                        const imageResize = await sharp(uploadedMoreImage[filecount]?.buffer)
                        .resize({width: 500, height: 500, fit: sharp.fit.cover,})
                        .toFormat('webp')
                        .webp({ quality: 50 })
                        .toBuffer()
                        const uploadParams = {
                            Bucket: process.env.BUCKET_NAME,
                            Key: crypto.pbkdf2Sync(uploadedMoreImage[filecount].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + ".webp",
                            Body: imageResize,
                            ContentType: uploadedMoreImage[filecount]?.mimetype
                        }
                        const uploadPhoto = new PutObjectCommand(uploadParams)
                        await s3.send(uploadPhoto)
                        moreImageList[n] = uploadParams.Key
                        filecount+=1
                    } else {
                        moreImageList[n] = moreImageList[n]
                    }
                }
                obj.moreimage = moreImageList
            } else {
                obj.moreimage = moreImageList
            }
        }

        const info = await package.findByIdAndUpdate({ _id: new ObjectId(req.body._id) }, {$set: obj})

        if (req.files?.displayimage) {
            if (info.displayimage!==obj.displayimage) {
                const command = new DeleteObjectCommand({
                    Bucket: process.env.BUCKET_NAME,
                    Key: info.displayimage,
                })
                await s3.send(command)
            }
        }
        if (req.files?.moreimage) {
            for (let i = 0; i<moreImageList.length; i++){
                if (moreImageList[i]!==info.moreimage[i] && info.moreimage.length>0 && info.moreimage[i]!==undefined) {
                    const command = new DeleteObjectCommand({
                        Bucket: process.env.BUCKET_NAME,
                        Key: info.moreimage[i],
                    })
                    await s3.send(command)
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