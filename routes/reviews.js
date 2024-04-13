const express = require ("express");
const router = express.Router();
const reviews = require ("../models/reviews.js");
const orders = require ("../models/orders.js");
const auth = require("../middleware/auth");
const { ObjectId } = require ("mongodb");
const multer  = require('multer');
const path = require("path");
const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");
const s3 = new S3Client({
    region: process.env.BUCKET_REGION
})
const storage = multer.memoryStorage()
const upload = multer({ storage: storage });
const nodemailer = require("nodemailer");
const accounts = require ("../models/accounts.js");
const vouchers = require('../models/vouchers.js');
const moment = require("moment");

router.post("/submit-review", auth, upload.fields([{ name: 'reviewimage', maxCount: 1 }]), async (req, res) => {
    try {
        const theItem = JSON.parse(req.body.itemtoreview)
        const obj = {
            orderid: req.body.orderid,
            userid: req.body.userid,
            owner: req.body.owner,
            product: {
                productid: theItem.item._id,
                type: theItem.type
            },
            description: req.body.description,
            rating: Number(req.body.rating),
            recommended: req.body.recommend,
            status: "visible"
        }
        if (req.files?.reviewimage){
            for (let i=0; i<req.files.reviewimage.length; i++) {
                const imageResize = await sharp(req.files.reviewimage[i]?.buffer)
                .resize({width: 350, height: 350, fit: sharp.fit.cover,})
                .toFormat('webp')
                .webp({ quality: 80 })
                .toBuffer()

                const uploadParams = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: crypto.pbkdf2Sync(req.files.reviewimage[i].originalname+Date.now(), 'f844b09ff50c', 1000, 16, `sha512`).toString(`hex`) + ".webp",
                    Body: imageResize,
                    ContentType: req.files.reviewimage[i]?.mimetype
                }
                const uploadPhoto = new PutObjectCommand(uploadParams)
                await s3.send(uploadPhoto)
                obj.reviewimage = uploadParams?.Key
            }
        }

        const createReview = await reviews.create(obj)
        
        if (createReview) {
            const theOrder = await orders.findById({_id: obj.orderid})

            let newItems = []
            let oldItems = theOrder.items
            for (let i=0; i<oldItems.length; i++) {
                if (JSON.stringify(oldItems[i].item)===JSON.stringify(obj.product.productid)) {    
                    newItems.push({
                        reviewed: true,
                        item: oldItems[i].item,
                        price: oldItems[i].price,
                        quantity: oldItems[i].quantity,
                        type: oldItems[i].type,
                        withticket: oldItems[i].withticket,
                        _id: oldItems[i]._id
                    })
                } else {
                    newItems.push(oldItems[i])
                }
            }
            await orders.findByIdAndUpdate({_id: obj.orderid}, {items: newItems })
        }

        const recipient = await accounts.findById(obj.userid)
        let maillist = [recipient.email]
        
        let transporter = nodemailer.createTransport({
            host: "smtpout.secureserver.net", 
            port: 465, 
            secure: true, 
            auth: {
                user: "welcome@kluedskincare.com", 
                pass: process.env.EMAIL_PASS, 
            },
            tls : { rejectUnauthorized: false }
        })
        
        for (let i=0; i<maillist.length; i++) {
            function makeid(length) {
                let result = ''
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
                const charactersLength = characters.length
                let counter = 0
                while (counter < length) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength))
                counter += 1
                }
                return result
            }
            
            let voucher = makeid(6)
            let foundId = await accounts.findOne({email: maillist[i]})
            //if (foundId!==null) {
                let obj = {
                    userid: foundId?._id ? foundId?._id : null,
                    encryptedvoucher: voucher,
                    type: "Discount",
                    amount: req.body.voucher,
                    minimum: 100,
                    maximum: 100,
                    expiration: Date.now() + 259200000,
                    status: "Unused",
                    discounttype: "Flat"
                }
                const saveVoucher = await vouchers.create(obj)
                let formattedVoucherDate = moment(saveVoucher.expiration).format('MMMM Do YYYY, hh:mm A')
                await transporter.sendMail({
                    from: '"Klued" <welcome@kluedskincare.com>',
                    to: maillist[i],
                    cc: '',
                    subject: `Do Not Reply - Voucher Distribution`,
                    html: `
                    <div style="font-family: Century Gothic, sans-serif;" width="100%">
                        <div style="Margin:0 auto; max-width:750px;">
                            <div style="display: none;">Let's work together for your first checkout with this ₱${req.body.voucher}.00 off voucher!</div>
                            <div width="100%" style="display:flex; justify-content:center;">
                                <a style="Margin:0 auto; width:200px; object-fit:cover;" href="https://kluedskincare.com/"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1205FRbwJYWvOPDeWGRRl98TKKtNdi13j" alt="Logo" title="Klued Logo" width="150" height="75"/></a>
                            </div>    
                            <div style="background-color:#3b82f6; width:100%;">
                                <table style="Margin:0 auto;width:auto;padding:8px;">
                                    <tbody>
                                        <tr>
                                            <td>
                                                <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/products"><b>Our Products</b></a>
                                            </td>
                                            <td >
                                                <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/understanding-your-skin"><b>Understanding your Skin</b></a>
                                            </td>
                                            <td >
                                                <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/about-us"><b>About Us</b></a>
                                            </td>
                                            <td >
                                                <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/faqs"><b>FAQs</b></a>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div style="overflow: hidden; height:260px; width:100%">
                                <img style="height:260px; width:100%; object-fit:cover; object-position: center;" src="http://drive.google.com/uc?export=view&id=1s-vFSLVZ7R2ya-cOuu4G3jku6DQk0mRo" alt="Klued Products" title="Klued Products"></img>
                            </div>
                            <br/>
                            <p style="font-size: 26px; color:#ffffff; background-color:#3b82f6; padding-top: 15px;padding-bottom: 15px; text-align:center"><b>Klued ₱${req.body.voucher}.00 Voucher</b></p>
                            <div style="font-size: 16px; width:100%">
                                Hi ${recipient ? recipient.firstname+" "+recipient.lastname : 'Klued Nerdie'},
                                <br/>
                                <p style="text-align: justify;">
                                    Thank you for taking your time on reviewing our product. Here is a free <b>₱${req.body.voucher}.00</b> off voucher for you to use upon checkout. Apply the code below when you purchase at least ₱${obj.minimum}.00 worth of Klued products. This voucher will expire on <b>${formattedVoucherDate}</b>.
                                </p>
                                <br/>
                                <div style="background-color:#e5e7eb; width:100%; padding-top: 30px;padding-bottom: 30px;">
                                    <p style="font-size: 48px; Margin:0 auto; width:200px; text-align:center"><b>${voucher}</b></p>
                                </div>
                                <br/>
                                <div style="font-size: 14px; width:100%; text-align:center;"><i>This is a system-generated email, please do not reply to this message.</i></div>
                            </div>
                            <br/>
                            <br/>
                            <br/>
                            <br/>
                            <p style="Margin:0 auto; text-align: center; width: 100%;font-size: 22px; color:#ffffff; background-color:#3b82f6; padding-top: 15px;padding-bottom: 15px;"><b>Check our Latest Products</b></p>
                            <div style="width:100%;">
                                <table style="Margin:0 auto;width:auto;padding:8px; gap:2px;">
                                    <tbody>
                                        <tr>
                                            <td style="max-width:32%; font-size: 16px">
                                                <a style="border-radius: 8px;padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/products/klued---barrier-support-hydrating-jelly-cleanser/658b84494c94654d802d8bc7"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1xjw0RT5vYwAueTCibVXWBwn_NwnU0tDs" alt="" title="" width="150" height="150"/></a>
                                                <br/>
                                                <b>Klued - Barrier Support Hydrating Jelly Cleanser</b>
                                            </td>
                                            <td style="max-width:32%; font-size: 16px">
                                                <a style="border-radius: 8px;padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/products/klued---multi-brightening-complex-serum/658b815b4c94654d802d8bc0"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=11WnG-nVj02AWVHceJbPYEkrUXSu_JEjU" alt="" title="" width="150" height="150"/></a>
                                                <br/>
                                                <b>Klued - Multi-Brightening Complex Serum</b>
                                            </td>
                                            <td style="max-width:32%; font-size: 16px">
                                                <a style="border-radius: 8px;padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/products/klued---multi-hyaluronic-acid-complex-serum/658b7bb1b6b310876eb11c5d"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1b71zBNPDpdIs_sosmKGiVGE_jlLAVva1" alt="" title="" width="150" height="150"/></a>
                                                <br/>
                                                <b>Klued - Multi-Hyaluronic Acid Complex Serum</b>    
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <br/>
                            <br/>
                            <p style="Margin:0 auto; text-align: center; width: 100%;font-size: 22px; color:#ffffff; background-color:#3b82f6; padding-top: 15px;padding-bottom: 15px;"><b>Check our Popular Package Sets</b></p>
                            <div style="width:100%;">
                                <table style="Margin:0 auto;width:auto;padding:8px; gap:2px;">
                                    <tbody>
                                        <tr>
                                            <td style="max-width:32%; font-size: 16px">
                                                <a style="border-radius: 8px;padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/packages/klued-oily-or-acne-prone-skin-set/658b89224c94654d802d8bdb"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=15FY0yN4MdrspriMHj5fPU8v3rZyRaC3I" alt="" title="" width="150" height="150"/></a>
                                                <br/>
                                                <b>Klued Oily/Acne Prone Skin SET</b>
                                            </td>
                                            <td style="max-width:32%; font-size: 16px">
                                                <a style="border-radius: 8px;padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/packages/klued-anti-aging-routine-set-(for-beginners)/658b8b2b4c94654d802d8bea"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1W41Bc2EsEt5mVCVqDs9LWim98Vhaww-n" alt="" title="" width="150" height="150"/></a>
                                                <br/>
                                                <b>Klued Anti-Aging Routine SET (for Beginners)</b>
                                            </td>
                                            <td style="max-width:32%; font-size: 16px">
                                                <a style="border-radius: 8px;padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/packages/klued-stubborn-dark-spot-and-hyperpigmentation-set/658b8a5a4c94654d802d8be5"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=10aYRf_BNBTg9XJrqwe1QldKxCy2wx6ho" alt="" title="" width="150" height="150"/></a>
                                                <br/>
                                                <b>Klued Stubborn Dark spot and Hyperpigmentation SET</b>    
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <br/>
                            <br/>
                            <div style="background-color:#1e293b; color:#94a3b8; padding-left: 25px;padding-right: 25px; padding-top: 15px;padding-bottom: 15px;">
                                <a style="Margin:0 auto; width:200px; object-fit:cover;" href="https://kluedskincare.com/"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1205FRbwJYWvOPDeWGRRl98TKKtNdi13j" alt="Logo" title="Klued Logo" width="100" height="45"/></a>
                                <p>
                                    "Combining knowledge and passion to the skin"
                                </p>
                                <br/>
                                <p style="font-size: 14px;">
                                    📍Address: 2nd Floor WANJ Bldg.<br/>
                                    Don Placido Campos Ave. Brgy. San Jose<br/>
                                    Dasmarinas, Cavite 4114<br/>
                                    📞 Mobile:09176680429<br/>
                                    💻 Website: https://kluedskincare.com
                                </p>
                                <p style="Margin:0 auto; width:auto;">© 2024 Klued. All rights reserved.</p>
                            </div>
                        </div>
                        <div style="display: none;">[${Date.now()}] End of message.</div>
                    </div>
                    `, 
                })
            //}
        }

        res.status(200).json(true)
    } catch (err) {
        console.log(err)
        res.status(500).send(false)
    }
})

router.get("/get-reviews", async (req, res) => {
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
        let sortedProductList = []
        for (let i=0; i<req.query?.productlist?.length; i++){
            if (typeof req.query.productlist[i]==="string") {
                sortedProductList.push(new ObjectId(req.query.productlist[i]))
            } else {
                sortedProductList.push(new ObjectId(req.query.productlist[i]._id))
            }
        }

        const orderReview = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
            {rating: req.query.filterBy!=='' ? req.query.filterBy : {$ne: null}}
        ]})
        .skip(page*reviewsPerPage)
        .limit(reviewsPerPage)
        .populate({path: "userid", select: ["firstname", "displayimage"]})
        .sort({[sort.b]: sort.c})

        const orderReviews = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
            {rating: req.query.filterBy!=='' ? req.query.filterBy : {$ne: null}}
        ]})

        const allReviews = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
        ]})

        let a = Math.floor(orderReviews.length/reviewsPerPage)
        let b = orderReviews.length%reviewsPerPage

        if (b!==0) {
            a=a+1
        }
        
        const fiveRating = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
            { rating: 5}
        ]})
        const fourRating = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
            { rating: 4}
        ]})
        const threeRating = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
            { rating: 3}
        ]})
        const twoRating = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
            { rating: 2}
        ]})
        const oneRating = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
            { rating: 1}
        ]})

        const mostUpvote = await reviews.find({$and: [
            {'product.productid': {$in: sortedProductList} },
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

router.delete("/delete-review/:id", async (req, res) => {
    const doc = await reviews.findById(req.params.id)

    if (doc?.reviewimage) {
        const command = new DeleteObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: doc?.reviewimage,
        })
        await s3.send(command)
    }
    const account = await reviews.findByIdAndDelete(doc)  
    if (account) {
        res.status(200).json(account)
    } else {
        res.status(500).json(false)
    }
})

module.exports = router