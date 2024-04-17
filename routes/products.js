const express = require ("express");
const product = require ("../models/product.js");
const router = express.Router();
const { ObjectId } = require ("mongodb");
const multer  = require('multer');
const path = require("path");
const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");
const s3 = new S3Client({
    // credentials: {
    //     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    //     secretKeyId: process.env.AWS_SECRET_ACCESS_KEY,
    // },
    region: process.env.BUCKET_REGION
})

// const getObjectParams = {
//     Bucket: process.env.BUCKET_NAME,
//     Key: uploadParams?.Key,
// }
// const command = new GetObjectCommand(getObjectParams);
// const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
// console.log(url)
// obj.displayimage = uploadParams?.Key
const storage = multer.memoryStorage()
const upload = multer({ storage: storage });

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

router.post("/create-product", upload.fields([{ name: 'displayimage', maxCount: 1 }, { name: 'moreimage', maxCount: 3 }, { name: 'ingphoto', maxCount: 10 }, { name: 'prodvid', maxCount: 10 }, { name: 'featuredvideos', maxCount: 10 }]), async (req, res) => {
    // let variations = JSON.parse(req.body.variations)
    // let newVariations = []
    // for (let i=0; i<variations.length; i++){
    //     let varr = variations[i].options
    //     varr = variations[i].options.map((a, index)=> {
    //         return {...a, image: eval(`req.body.${variations[i].name}[${index}]`), origprice: Number(a.origprice), price: Number(a.price), stock: Number(a.stock)}
    //     })
    //     newVariations.push({...variations[i], options: varr})
    // }

    try {
        let videoList = req.body?.videocollection ? JSON.parse(req.body?.videocollection) : []
        if (videoList?.length>0) {
            let uploadedMoreVid = req.files?.featuredvideos
            if (uploadedMoreVid?.length>0) {
                let filecount = 0
                for (let n=0; n<videoList.length; n++) {
                    if (videoList[n]?.video==="file") {
                        const uploadParams = {
                            Bucket: process.env.BUCKET_NAME,
                            Key: crypto.pbkdf2Sync(uploadedMoreVid[filecount].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + path.extname(uploadedMoreVid[filecount].originalname),
                            Body: uploadedMoreVid[filecount]?.buffer,
                            ContentType: uploadedMoreVid[filecount]?.mimetype
                        }
                        videoList[n] = {
                            title: videoList[n].title,
                            description: videoList[n].description,
                            video: {
                                urlKey: uploadParams?.Key,
                                type: "file",
                            }
                        }
                        const uploadVideo = new PutObjectCommand(uploadParams)
                        await s3.send(uploadVideo)
                        filecount+=1
                    } else {
                        videoList[n] = videoList[n]
                    }
                }
            }
        }

        let newIngredients = req.body.ingredients ? JSON.parse(req.body.ingredients) : []
        if (req.files?.ingphoto){
            newIngredients = newIngredients.map((a, index)=> {
                async function uploadImage() {
                    const imageResize = await sharp(req.files.ingphoto[index]?.buffer)
                    .resize({width: 500, height: 500, fit: sharp.fit.cover,})
                    .toFormat('webp')
                    .webp({ quality: 50 })
                    .toBuffer()
        
                    const uploadParams = {
                        Bucket: process.env.BUCKET_NAME,
                        Key: crypto.pbkdf2Sync(req.files.ingphoto[index].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + ".webp",
                        Body: imageResize,
                        ContentType: req.files.ingphoto[index]?.mimetype
                    }
                    const uploadPhoto = new PutObjectCommand(uploadParams)
                    await s3.send(uploadPhoto)
                }
                uploadImage()
                return {...a, photo: crypto.pbkdf2Sync(req.files.ingphoto[index].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + ".webp"}
            })
        }

        const obj = {
            name: req.body.name,
            maindesc: req.body.maindesc,
            stock: req.body.stock,
            usage: req.body.usage,
            extra: req.body.extra,
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
            //moreimage: req.body.moreimage ? req.body.moreimage : [],
            routines: JSON.parse(req.body.routines),
            videos: req.body.prodvid,
            featuredvideos: req.body.videocollection ? videoList : [],
            //variation: newVariations
        }

        if (req.files?.displayimage){
            for (let i=0; i<req.files.displayimage.length; i++) {
                const imageResize = await sharp(req.files.displayimage[i]?.buffer)
                .resize({width: 960, height: 1080, fit: sharp.fit.cover,})
                .toFormat('webp')
                .webp({lossless:true, quality: 100 })
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

        if (req.files?.prodvid){
            for (let i=0; i<req.files.prodvid.length; i++) {
                const uploadParams = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: crypto.pbkdf2Sync(req.files.prodvid[i].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + path.extname(req.files.prodvid[i].originalname),
                    Body: req.files.prodvid[i].buffer,
                    ContentType: req.files.prodvid[i]?.mimetype
                }
                const videoPhoto = new PutObjectCommand(uploadParams)
                await s3.send(videoPhoto)
                obj.videos = uploadParams?.Key
            }
        }

        const newProduct = await product.create(obj)
        res.status(200).json(newProduct)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
    
})

router.post("/update-product", upload.fields([{ name: 'displayimage', maxCount: 1 }, { name: 'moreimage', maxCount: 3 }, { name: 'ingphoto', maxCount: 100 }, { name: 'prodvid', maxCount: 10 }, { name: 'featuredvideos', maxCount: 10 }]), async (req, res) => {
    try {
        let videoList = req.body?.videocollection ? JSON.parse(req.body?.videocollection) : []
        if (videoList?.length>0) {
            let uploadedMoreVid = req.files?.featuredvideos
            if (uploadedMoreVid?.length>0) {
                let filecount = 0
                for (let n=0; n<videoList.length; n++) {
                    if (videoList[n]?.video==="file") {
                        const uploadParams = {
                            Bucket: process.env.BUCKET_NAME,
                            Key: crypto.pbkdf2Sync(uploadedMoreVid[filecount].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + path.extname(uploadedMoreVid[filecount].originalname),
                            Body: uploadedMoreVid[filecount]?.buffer,
                            ContentType: uploadedMoreVid[filecount]?.mimetype
                        }
                        videoList[n] = {
                            title: videoList[n].title,
                            description: videoList[n].description,
                            video: {
                                urlKey: uploadParams?.Key,
                                type: "file",
                            }
                        }
                        const uploadVideo = new PutObjectCommand(uploadParams)
                        await s3.send(uploadVideo)
                        filecount+=1
                    } else {
                        videoList[n] = videoList[n]
                    }
                }
            }
        }
        let ingList = req.body?.ingphotos ? JSON.parse(req.body?.ingphotos) : []
        if (req.files?.ingphoto?.length>0) {
            let uploadedMoreIng = req.files.ingphoto
            if (uploadedMoreIng?.length>0) {
                let filecount = 0
                for (let n=0; n<ingList.length; n++) {
                    if (ingList[n].photo==="file") {
                        const imageResize = await sharp(uploadedMoreIng[filecount]?.buffer)
                        .resize({width: 500, height: 500, fit: sharp.fit.cover,})
                        .toFormat('webp')
                        .webp({ quality: 50 })
                        .toBuffer()
                        const uploadParams = {
                            Bucket: process.env.BUCKET_NAME,
                            Key: crypto.pbkdf2Sync(uploadedMoreIng[filecount].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + ".webp",
                            Body: imageResize,
                            ContentType: uploadedMoreIng[filecount]?.mimetype
                        }
                        ingList[n] = {
                            name: ingList[n].name,
                            desc: ingList[n].desc,
                            photo: uploadParams?.Key
                        }
                        const uploadPhoto = new PutObjectCommand(uploadParams)
                        await s3.send(uploadPhoto)
                        filecount+=1
                    } else {
                        ingList[n] = ingList[n]
                    }
                }
            } 
        }
        const obj = {
            name: req.body.name,
            maindesc: req.body.maindesc,
            stock: req.body.stock,
            usage: req.body.usage,
            extra: req.body.extra,
            price: req.body.price,
            disprice: req.body.disprice,
            category: req.body.category,
            productlinks: {
                shopee: req.body.shopeelink,
                tiktok: req.body.tiktoklink,
                lazada: req.body.lazadalink,
            },
            ingredients: ingList,
            do: JSON.parse(req.body.do),
            dont: JSON.parse(req.body.dont),
            routines: JSON.parse(req.body.routines),
            featuredvideos: req.body.videocollection ? videoList : [],
            relatedproducts: JSON.parse(req.body.relatedproducts)
        }
        if (req.files?.displayimage){
            for (let i=0; i<req.files.displayimage.length; i++) {
                const imageResize = await sharp(req.files.displayimage[i]?.buffer)
                .resize({width: 960, height: 1080, fit: sharp.fit.cover,})
                .toFormat('webp')
                .webp({lossless: true, quality: 100 })
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
        let moreImageList = req.body.collection ? JSON.parse(req.body.collection) : []
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
        } else {
            obj.moreimage = moreImageList
        }

        if (req.files?.prodvid){
            for (let i=0; i<req.files.prodvid.length; i++) {
                const uploadParams = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: crypto.pbkdf2Sync(req.files.prodvid[i].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + path.extname(req.files.prodvid[i].originalname),
                    Body: req.files.prodvid[i].buffer,
                    ContentType: req.files.prodvid[i]?.mimetype
                }
                const videoPhoto = new PutObjectCommand(uploadParams)
                await s3.send(videoPhoto)
                obj.videos = uploadParams?.Key
            }
        } else {
            obj.videos = JSON.parse(req.body.prodvid)
        }

        const info = await product.findByIdAndUpdate({ _id: new ObjectId(req.body._id) }, {$set: obj})
        if (obj.relatedproducts.length>0){
            for (let i=0; i<obj.relatedproducts.length; i++) {
                await product.findByIdAndUpdate({ _id: obj.relatedproducts[i]?._id },  {$addToSet: {relatedproducts: info._id}})
            }
        }
        if (req.files?.displayimage) {
            if (info.displayimage!==obj.displayimage) {
                const command = new DeleteObjectCommand({
                    Bucket: process.env.BUCKET_NAME,
                    Key: info.displayimage,
                })
                await s3.send(command)
            }
        }
        if (info.moreimage?.length>0) {
            if (info.moreimage?.length>moreImageList.length) {
                for (let i = 0; i<info.moreimage.length; i++){
                    if (moreImageList[i]!==info.moreimage[i]) {
                        const command = new DeleteObjectCommand({
                            Bucket: process.env.BUCKET_NAME,
                            Key: info.moreimage[i],
                        })
                        await s3.send(command)
                    }
                }
            } else {
                for (let i = 0; i<moreImageList.length; i++){
                    if (moreImageList[i]!==info.moreimage[i] && info.moreimage[i]!==undefined) {
                        const command = new DeleteObjectCommand({
                            Bucket: process.env.BUCKET_NAME,
                            Key: info.moreimage[i],
                        })
                        await s3.send(command)
                    }
                }
            }
        }
        if (info.ingredients.length>0) {
            if (info.ingredients.length>ingList.length) {
                for(let i = 0; i<info.ingredients.length; i++){
                    if (info.ingredients[i].photo!==ingList[i].photo) {
                        const command = new DeleteObjectCommand({
                            Bucket: process.env.BUCKET_NAME,
                            Key: info.ingredients[i].photo,
                        })
                        await s3.send(command)
                    }
                }
            } else {
                for(let i = 0; i<ingList.length; i++){
                    if (info?.ingredients[i].photo!==ingList[i].photo && info.ingredients[i]!==undefined && info.ingredients[i].photo!==undefined) {
                        const command = new DeleteObjectCommand({
                            Bucket: process.env.BUCKET_NAME,
                            Key: info.ingredients[i].photo,
                        })
                        await s3.send(command)
                    }
                }
            }
        }
        if (info.videos.length>0 && req.files?.prodvid?.length>0 && req.files?.prodvid) {
            for(let i = 0; i<info.videos.length; i++){
                if (info.videos[i]!==obj.videos[i]) {
                    const command = new DeleteObjectCommand({
                        Bucket: process.env.BUCKET_NAME,
                        Key: info.videos[i],
                    })
                    await s3.send(command)
                }
            }
        }
        if (info?.featuredvideos?.length>0) {
            for (let i=0; i<info.featuredvideos.length; i++) {
                let dupe = false
                async function findDupe() {
                    for (let n=0; n<obj.featuredvideos.length; n++) {
                        if (info.featuredvideos[i]?.video?.urlKey===obj.featuredvideos[n]?.video?.urlKey && info.featuredvideos[i]?.video?.type==="file") {
                            dupe = true
                            return 
                        } 
                    }
                }
                findDupe()
                if (dupe===false && info.featuredvideos[i]?.video.type==="file") {
                    const command = new DeleteObjectCommand({
                        Bucket: process.env.BUCKET_NAME,
                        Key: info.featuredvideos[i]?.video.urlKey,
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

router.delete("/delete-product/:id", async (req, res) => {
    try {
        const productItem = await product.findByIdAndDelete(req.params.id)  
        if (productItem) {
            if (productItem.displayimage!==undefined) {
                const command = new DeleteObjectCommand({
                    Bucket: process.env.BUCKET_NAME,
                    Key: productItem.displayimage,
                })
                await s3.send(command)
            }
            if (productItem.moreimage?.length>0) {
                for(let i = 0; i<productItem.moreimage.length; i++){
                    const command = new DeleteObjectCommand({
                        Bucket: process.env.BUCKET_NAME,
                        Key: productItem.moreimage[i],
                    })
                    await s3.send(command)
                }
            }
            if (productItem.ingredients?.length>0) {
                for(let i = 0; i<productItem.ingredients.length; i++){
                    const command = new DeleteObjectCommand({
                        Bucket: process.env.BUCKET_NAME,
                        Key: productItem.ingredients[i].photo,
                    })
                    await s3.send(command)
                }
            }
            if (productItem.featuredvideos?.length>0) {
                for(let i = 0; i<productItem.featuredvideos.length; i++){
                    if (productItem.featuredvideos[i].video.type==="file") {
                        const command = new DeleteObjectCommand({
                            Bucket: process.env.BUCKET_NAME,
                            Key: productItem.featuredvideos[i].video?.urlKey,
                        })
                        await s3.send(command)
                    }
                }
            }
        } 
        res.status(200).json(true)
    } catch (err) {
        console.log(err)
        res.status(500).json(false)
    }
})

module.exports = router