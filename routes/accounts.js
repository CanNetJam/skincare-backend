const express = require ("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const accounts = require ("../models/accounts.js");
const router = express.Router();
const auth = require("../middleware/auth");
const { ObjectId } = require ("mongodb");
const cloudinary = require('cloudinary').v2
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require('uuid');
const verification = require("../models/verification.js");
const moment = require("moment");
const vouchers = require('../models/vouchers.js');

router.post("/register", async (req, res) => {
    async function sendVerification(props){
        const uniqueString = uuidv4() + props._id
        const maillist = [
            props.email,
        ]
        
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

        const encryptedString = await bcrypt.hash(uniqueString, 10)

        let obj = {
            userid: props._id,
            encryptedstring: encryptedString,
            expiration: Date.now() + 259200000
        }

        const saveVerification = await verification.create(obj)
        if (saveVerification) {
            let formattedDate = moment(saveVerification.expiration).format('MMMM Do YYYY, hh:mm A')
            await transporter.sendMail({
                from: '"Klued" <welcome@kluedskincare.com>',
                to: maillist,
                cc: '',
                subject: `Do Not Reply - Email Verification`,
                html: `
                <div style="font-family: Century Gothic, sans-serif;" width="100%">
                    <div style="Margin:0 auto; max-width:750px;">
                        <div style="display: none;">Successfully registered a klued account, please verify your email to activate the account and start using it.</div>
                        <div width="100%" style="display:flex; justify-content:center;">
                            <a style="Margin:0 auto; width:200px; object-fit:cover;" href="https://kluedskincare.com/"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1205FRbwJYWvOPDeWGRRl98TKKtNdi13j" alt="Logo" title="Klued Logo" width="150" height="75"/></a>
                        </div>    
                        <div style="background-color:#3b82f6; width:100%;">
                            <table style="Margin:0 auto;width:auto;padding:8px;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/product-details"><b>Our Products</b></a>
                                        </td>
                                        <td >
                                            <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/understandingyourskin"><b>Understanding your Skin</b></a>
                                        </td>
                                        <td >
                                            <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/aboutus"><b>About Us</b></a>
                                        </td>
                                        <td >
                                            <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/faqs"><b>FAQs</b></a>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div style="overflow: hidden; height:260px; width:100%">
                            <img style="height:260px; width:100%; object-fit:cover; object-position: center;" src="http://drive.google.com/uc?export=view&id=1s-vFSLVZ7R2ya-cOuu4G3jku6DQk0mRo" alt="Klued Products" title="Klued Products"></img>
                        </div>
                        <br/>
                        <p style="font-size: 26px; color:#ffffff; background-color:#3b82f6; padding-top: 15px;padding-bottom: 15px; text-align:center"><b>Klued Email Account Verification</b></p>
                        <p style="font-size: 16px;">
                            Hi ${props.firstname+" "+props.lastname},
                            <br/>
                            <br/>
                            This email is sent to you in order to verify your email address associated to your Klued account.
                            Click <a href=${"https://kluedskincare.com/#/email-verification/"+props._id+"/"+uniqueString}>here</a> to continue with the process.
                            <br/>
                            <br/>
                            This link will expire on <b>${formattedDate}</b>.
                            <br/>
                            <br/>
                            <div style="font-size: 14px; width:100%; text-align:center;"><i>This is a system-generated email, please do not reply to this message.</i></div>
                        </p>
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
                `, // Embedded image links to content ID
                // attachments: [{
                // filename: 'logo.png',
                // path: './src/logo.png',
                // cid: 'kluedlogo@kluedskincare.com' // Sets content ID
                // }]
            })

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
            let obj = {
                userid: props._id,
                encryptedvoucher: voucher,
                type: "Discount",
                amount: 15,
                minimum: 300,
                maximum: 100,
                expiration: Date.now() + 259200000,
                status: "Unused",
                discounttype: "Percentage"
            }
            const saveVoucher = await vouchers.create(obj)
            let formattedVoucherDate = moment(saveVoucher.expiration).format('MMMM Do YYYY, hh:mm A')
            await transporter.sendMail({
                from: '"Klued" <welcome@kluedskincare.com>',
                to: maillist,
                cc: '',
                subject: `Do Not Reply - Free Voucher upon Registration`,
                html: `
                <div style="font-family: Century Gothic, sans-serif;" width="100%">
                    <div style="Margin:0 auto; max-width:750px;">
                        <div style="display: none;">Let's work together for your first checkout with this 15% off voucher!</div>
                        <div width="100%" style="display:flex; justify-content:center;">
                            <a style="Margin:0 auto; width:200px; object-fit:cover;" href="https://kluedskincare.com/"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1205FRbwJYWvOPDeWGRRl98TKKtNdi13j" alt="Logo" title="Klued Logo" width="150" height="75"/></a>
                        </div>    
                        <div style="background-color:#3b82f6; width:100%;">
                            <table style="Margin:0 auto;width:auto;padding:8px;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/product-details"><b>Our Products</b></a>
                                        </td>
                                        <td >
                                            <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/understandingyourskin"><b>Understanding your Skin</b></a>
                                        </td>
                                        <td >
                                            <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/aboutus"><b>About Us</b></a>
                                        </td>
                                        <td >
                                            <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/faqs"><b>FAQs</b></a>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div style="overflow: hidden; height:260px; width:100%">
                            <img style="height:260px; width:100%; object-fit:cover; object-position: center;" src="http://drive.google.com/uc?export=view&id=1s-vFSLVZ7R2ya-cOuu4G3jku6DQk0mRo" alt="Klued Products" title="Klued Products"></img>
                        </div>
                        <br/>
                        <p style="font-size: 26px; color:#ffffff; background-color:#3b82f6; padding-top: 15px;padding-bottom: 15px; text-align:center"><b>Klued 15% Voucher</b></p>
                        <div style="font-size: 16px; width:100%">
                            Hi ${props.firstname+" "+props.lastname},
                            <br/>
                            <p style="text-align: justify;">
                                Thank you for taking your time on registering an account to Klued Skincare. Here is a free <b>15%</b> off voucher for you to use upon checkout. Apply the code below when you purchase at least ₱300.00 worth of Klued products. This voucher will expire on <b>${formattedVoucherDate}</b>.
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
                                        <td style="max-width:32%; text-align: center; font-size: 16px">
                                            <a style="border-radius: 8px;padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/details/product/658b84494c94654d802d8bc7"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1xjw0RT5vYwAueTCibVXWBwn_NwnU0tDs" alt="" title="" width="150" height="150"/></a>
                                            <br/>
                                            <b>Klued - Barrier Support Hydrating Jelly Cleanser</b>
                                        </td>
                                        <td style="max-width:32%; text-align: center; font-size: 16px">
                                            <a style="border-radius: 8px;padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/details/product/658b815b4c94654d802d8bc0"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=11WnG-nVj02AWVHceJbPYEkrUXSu_JEjU" alt="" title="" width="150" height="150"/></a>
                                            <br/>
                                            <b>Klued - Multi-Brightening Complex Serum</b>
                                        </td>
                                        <td style="max-width:32%; text-align: center; font-size: 16px">
                                            <a style="border-radius: 8px;padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/details/product/658b7bb1b6b310876eb11c5d"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1b71zBNPDpdIs_sosmKGiVGE_jlLAVva1" alt="" title="" width="150" height="150"/></a>
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
                                        <td style="max-width:32%; text-align: center; font-size: 16px">
                                            <a style="border-radius: 8px;padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/details/package/658b89224c94654d802d8bdb"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=15FY0yN4MdrspriMHj5fPU8v3rZyRaC3I" alt="" title="" width="150" height="150"/></a>
                                            <br/>
                                            <b>Klued Oily/Acne Prone Skin SET</b>
                                        </td>
                                        <td style="max-width:32%; text-align: center; font-size: 16px">
                                            <a style="border-radius: 8px;padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/details/package/658b8b2b4c94654d802d8bea"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1W41Bc2EsEt5mVCVqDs9LWim98Vhaww-n" alt="" title="" width="150" height="150"/></a>
                                            <br/>
                                            <b>Klued Anti-Aging Routine SET (for Beginners)</b>
                                        </td>
                                        <td style="max-width:32%; text-align: center; font-size: 16px">
                                            <a style="border-radius: 8px;padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/details/package/658b8a5a4c94654d802d8be5"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=10aYRf_BNBTg9XJrqwe1QldKxCy2wx6ho" alt="" title="" width="150" height="150"/></a>
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
                `, // Embedded image links to content ID
                // attachments: [{
                // filename: 'logo.png',
                // path: './src/logo.png',
                // cid: 'kluedlogo@kluedskincare.com' // Sets content ID
                // }]
            })
        }
        }

        const user = await accounts.findOne({email: req.body.email})
        if (user){
            return res.status(200).send(false)
        }
        const newPassword = await bcrypt.hash(req.body.password, 10)
        try {
        let obj = {}
        req.body.type === "Customer" ?
        obj = {
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            type: req.body.type,
            email: req.body.email,
            phone: req.body.phone,
            password: newPassword,
            verified: false,
        }
        :
        obj = {
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            type: req.body.type,
            email: req.body.email,
            password: newPassword,
            phone: req.body.phone,
            department: req.body.department,
            job: req.body.job,
            access: JSON.parse(req.body.access),
            verified: false,
        }
        const addAccount = await accounts.create(obj)
        if (addAccount) {
            sendVerification(addAccount)
            res.status(200).json(true)
        }
    } catch (err) {
        console.log(err)
    }
})

router.post("/login", async (req, res) =>{
    const login = await accounts.findOne({email: req.body.email}).populate({path:"cart.product", select:["name", "displayimage", "stock", "price", "origprice"]})
    if ( !login) {
        res.send(false)
    }
    if ( login ) {
        const pass = await bcrypt.compare(req.body.password, login.password)
        if (!pass) {
        res.send(false)
        }
        if (pass) {
        const token = jwt.sign({ _id: login._id }, process.env.JWT_SECRET)
        if (login.type!=="Customer") {
            res.json({
            token: token,
            user: {
                _id: login._id,
                firstname: login.firstname,
                lastname: login.lastname,
                type: login.type,
                phone: login.phone,
                department: login.department,
                job: login.job,
                createdAt: login.createdAt,
                email: login.email,
                displayimage: login.displayimage,
                access: login.access,
                verified: login.verified
            }
            })
        } else {
            let num1 = 0
            if (login.cart.length>0) {
                for(let i=0; i<login.cart.length; i++){
                    num1 = num1+login?.cart[i]?.quantity
                }
            }
            res.json({
            token: token,
            user: {
                _id: login._id,
                firstname: login.firstname,
                lastname: login.lastname,
                type: login.type,
                phone: login.phone,
                createdAt: login.createdAt,
                email: login.email,
                displayimage: login.displayimage,
                verified: login.verified,
                cart: login.cart,
                billingaddress: login.billingaddress
            },
            cartNumber: num1
            })
        }
        }
    }
})

router.get("/user-data", auth, async (req, res) => {
    const user = await accounts.findById(req.user._id).populate({path:"cart.product", select:["name", "displayimage", "stock", "price", "origprice"]})
    if (user.type!=="Customer") {
        res.json({
        _id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        type: user.type,
        phone: user.phone,
        department: user.department,
        job: user.job,
        createdAt: user.createdAt,
        email: user.email,
        displayimage: user.displayimage,
        access: user.access,
        verified: user.verified
        })
    } else {
        let num1 = 0
        for(let i=0; i<user.cart.length; i++){
        num1 = num1+user.cart[i].quantity
        }

        res.json({
        _id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        type: user.type,
        phone: user.phone,
        createdAt: user.createdAt,
        email: user.email,
        displayimage: user.displayimage,
        verified: user.verified,
        cart: user.cart,
        cartNumber: num1,
        billingaddress: user.billingaddress
        })
    }
})

router.get("/all-accounts", auth, async (req, res) => {
    try {
        const page = req.query.page
        const accountsPerPage = req.query.limit
        const startDate = req.query.startDate
        const endDate = req.query.endDate

        let condition = {$and: [{createdAt: {$gte: startDate, $lte: endDate}}, {$or: [ {email: new RegExp(req.query.searchString, 'i')}, {firstname: new RegExp(req.query.searchString, 'i')}, {lastname: new RegExp(req.query.searchString, 'i')}, {phone: new RegExp(req.query.searchString, 'i')} ]}, {type: req.query.type!=="" ? req.query.type==="Customer" ? req.query.type : {$ne: "Customer"} : {$ne: null}}]}
        const allAccount = await accounts.find(condition).skip(page*accountsPerPage).limit(accountsPerPage)
        const allAccounts = await accounts.find(condition)
        
        let a = Math.floor(allAccounts.length/accountsPerPage)
        let b = allAccounts.length%accountsPerPage

        if (b!==0) {
            a=a+1
        }

        const obj = {
            sortedAccounts: allAccount,
            totalAccounts: a,
            total: allAccounts.length
        }
        res.status(200).json(obj)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/update-account/:id", auth, async (req, res) =>{
    const obj = {
        firstname: req.body.firstname, 
        lastname: req.body.lastname,
        phone: req.body.phone,
    }
    if (req.body.displayimage) {
        // if they are uploading a new photo
        obj.displayimage = req.body.displayimage
        const info = await accounts.findByIdAndUpdate({ _id: new ObjectId(req.params.id) }, {$set: obj})
        if (info.displayimage) {
        cloudinary.uploader.destroy(info.displayimage)
        }
        res.status(200).send(true)
    } else {
        // if they are not uploading a new photo
        await accounts.findByIdAndUpdate({ _id: new ObjectId(req.params.id) }, {$set: obj})
        res.status(200).send(true)
    }
})

router.post("/update-account/billing-address/:id", auth, async (req, res) =>{
    try {
        const obj = {
            region: req.body.region, 
            province: req.body.province,
            city: req.body.city,
            barangay: req.body.barangay,
            postal: req.body.postal,
            street: req.body.street
        }
        const user = await accounts.findByIdAndUpdate({ _id: new ObjectId(req.params.id) }, {billingaddress: obj})
        res.status(200).send(user)
    } catch (err) {
        console.log(err)
        res.status(500).send(err)
    }
})

router.delete("/delete-account/:id", async (req, res) => {
    const doc = await accounts.findById(req.params.id)
    if (doc?.displayimage) {
        cloudinary.uploader.destroy(doc.displayimage)
    }
    const account = await accounts.findByIdAndDelete(doc)  
    if (account) {
        res.status(200).json(account)
    } else {
        res.status(500).json(false)
    }
})

router.get("/get-profile", async (req, res) => {
    try {
        const searchProfile = await accounts.findById(req.query.profileid)
        res.status(200).json(searchProfile)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.get("/check-password/:userid/:password", auth, async (req, res) => {
    try {
        const account = await accounts.findById(req.params.userid)
        const pass = await bcrypt.compare(req.params.password, account.password)
        res.status(200).send(pass)
    } catch (err) {
        console.log(err)
        res.status(200).send(false)
    }
})

router.post("/change-password/:userid/:password", async (req, res) => {
    const newPassword = await bcrypt.hash(req.params.password, 10)
    try {
        const account = await accounts.findByIdAndUpdate({_id: req.params.userid}, {password: newPassword})
        if (account) {
        res.status(200).send(true)
        }
        if (!account) {
        res.status(200).send(false)
        }
    } catch (err) {
        res.status(200).send(false)
    }
})

router.post("/update-account-info/:id", auth, async (req, res) => {
    try {
        async function sendVerification(props){
            const uniqueString = uuidv4() + props._id
            const maillist = [
            req.body.email,
            ]
            
            let transporter = nodemailer.createTransport({
                host: "smtpout.securecerver.net", 
                port: 465, 
                secure: true, 
                auth: {
                user: "welcome@kluedskincare.com", 
                pass: process.env.EMAIL_PASS, 
                },
                tls : { rejectUnauthorized: false }
            })

            const encryptedString = await bcrypt.hash(uniqueString, 10)

            let obj = {
            userid: props._id,
            encryptedstring: encryptedString,
            expiration: Date.now() + 259200000
            }

            const saveVerification = await verification.create(obj)
            if (saveVerification) {
            let formattedDate = moment(saveVerification.expiration).format('MMMM Do YYYY, hh:mm A')
            let info = await transporter.sendMail({
                from: '"Klued" <welcome@kluedskincare.com>',
                to: maillist,
                cc: '',
                subject: `Do Not Reply - Email Update Verification`,
                html: `
                <div style="font-family: Century Gothic, sans-serif;" width="100%">
                    <div style="Margin:0 auto; max-width:750px;">
                        <div style="display: none;">Successfully updated thee email of your Klued account, please verify the new email to activate the account and start using it.</div>
                        <div width="100%" style="display:flex; justify-content:center;">
                            <a style="Margin:0 auto; width:200px; object-fit:cover;" href="https://kluedskincare.com/"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1205FRbwJYWvOPDeWGRRl98TKKtNdi13j" alt="Logo" title="Klued Logo" width="150" height="75"/></a>
                        </div>    
                        <div style="background-color:#3b82f6; width:100%;">
                            <table style="Margin:0 auto;width:auto;padding:8px;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/product-details"><b>Our Products</b></a>
                                        </td>
                                        <td >
                                            <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/understandingyourskin"><b>Understanding your Skin</b></a>
                                        </td>
                                        <td >
                                            <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/aboutus"><b>About Us</b></a>
                                        </td>
                                        <td >
                                            <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/faqs"><b>FAQs</b></a>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div style="overflow: hidden; height:260px; width:100%">
                            <img style="height:260px; width:100%; object-fit:cover; object-position: center;" src="http://drive.google.com/uc?export=view&id=1s-vFSLVZ7R2ya-cOuu4G3jku6DQk0mRo" alt="Klued Products" title="Klued Products"></img>
                        </div>
                        <br/>
                        <p style="font-size: 26px; color:#ffffff; background-color:#3b82f6; padding-top: 15px;padding-bottom: 15px; text-align:center"><b>Klued Email Update Verification</b></p>
                        <p style="font-size: 16px;">
                            Hi ${props.firstname+" "+props.lastname},
                            <br/>
                            <br/>
                            This email is sent to you in order to verify your new email address that is updated in your account.
                            Click <a href=${"https://kluedskincare.com/#/email-verification/"+props._id+"/"+uniqueString}>here</a> to continue with the process.
                            <br/>
                            <br/>
                            This link will expire on <b>${formattedDate}</b>.
                            <br/>
                            <br/>
                            <div style="font-size: 14px; width:100%; text-align:center;"><i>This is a system-generated email, please do not reply to this message.</i></div>
                        </p>
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
                </div>
                `, // Embedded image links to content ID
                // attachments: [{
                //     filename: 'logo.png',
                //     path: './src/logo.png',
                //     cid: 'kluedlogo@kluedskincare.com' // Sets content ID
                // }]
            })
            }
        }

        const user = await accounts.findOne({email: req.body.email})
        if (user) {
            if (user._id.toString()!==new ObjectId(req.params.id).toString()){
                return res.status(200).send(false)
            }
        }

        let obj = {}
        req.body.type === "Customer" ?
        obj = {
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            type: req.body.type,
            email: req.body.email,
        }
        :
        obj = {
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            type: req.body.type,
            email: req.body.email,
            phone: req.body.phone,
            department: req.body.department,
            job: req.body.job,
            access: JSON.parse(req.body.access),
        }
        const info = await accounts.findByIdAndUpdate({ _id: new ObjectId(req.params.id) }, {$set: obj})
        if (info) {
            if (info.email!==req.body.email) {
                await accounts.findByIdAndUpdate({ _id: new ObjectId(req.params.id) }, {verified: false})
                sendVerification(info)
                res.status(200).json(true)
            } else {
                res.status(200).json(true)
            }
        }  else {
            res.status(200).json(false)
        }
    } catch (err) {
        console.log(err)
    }
})

router.post("/reset-password/:email", async (req, res) => {
    try {
        const user = await accounts.findOne({email: req.params.email})
        if (user) {
            let randomNum = ""
            for ( let i = 0; i<6; i++ ){
                randomNum = randomNum + (Math.floor(Math.random() * 10)).toString()
            }
            const encryptedPass = await bcrypt.hash(randomNum, 10)
            const updatedAccount = await accounts.findByIdAndUpdate({ _id: user._id }, {password: encryptedPass})
            
            if (updatedAccount) {
            const maillist = [
                req.params.email,
            ]
            
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
            
            let info = await transporter.sendMail({
                    from: '"Klued" <welcome@kluedskincare.com>',
                    to: maillist,
                    cc: '',
                    subject: `Do Not Reply - Account Password Reset`,
                    html: `
                    <div style="font-family: Century Gothic, sans-serif;" width="100%">
                        <div style="Margin:0 auto; max-width:750px;">
                            <div style="display: none;">Your password is successfully reset. Head over to kluedskincare.com to login into your account.</div>
                            <div width="100%" style="display:flex; justify-content:center;">
                                <a style="Margin:0 auto; width:200px; object-fit:cover;" href="https://kluedskincare.com/"><img style="Margin:0 auto; background-image:#000000" src=${"http://drive.google.com/uc?export=view&id=1205FRbwJYWvOPDeWGRRl98TKKtNdi13j" || "kluedlogo@kluedskincare.com"} alt="Logo" title="Klued Logo" width="150" height="75"/></a>
                            </div>    
                            <div style="background-color:#3b82f6; width:100%;">
                                <table style="Margin:0 auto;width:auto;padding:8px;">
                                    <tbody>
                                        <tr>
                                            <td>
                                                <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/product-details"><b>Our Products</b></a>
                                            </td>
                                            <td >
                                                <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/understandingyourskin"><b>Understanding your Skin</b></a>
                                            </td>
                                            <td >
                                                <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/aboutus"><b>About Us</b></a>
                                            </td>
                                            <td >
                                                <a style="padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/#/faqs"><b>FAQs</b></a>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div style="overflow: hidden; height:260px; width:100%">
                                <img style="height:260px; width:100%; object-fit:cover; object-position: center;" src="http://drive.google.com/uc?export=view&id=1s-vFSLVZ7R2ya-cOuu4G3jku6DQk0mRo" alt="Klued Products" title="Klued Products"></img>
                            </div>
                            <br/>
                            <p style="font-size: 26px; color:#ffffff; background-color:#3b82f6; padding-top: 15px;padding-bottom: 15px; text-align:center"><b>Account Password Reset</b></p>
                            <p style="font-size: 16px;">
                                Hi ${updatedAccount.firstname+" "+updatedAccount.lastname},
                                <br/>
                                <br/>
                                This email is sent to you in order to help you recover your Klued Account. 
                                Your password is now reset to <b>${randomNum}</b>. Use this to login on the Klued account. Click <a href="https://kluedskincare.com/#/login">here</a> to head over the website.
                                <br/>
                                <br/>
                                <b>Note:</b> This password is not secure, please change it immediately.
                                <br/>
                                <br/>
                                <div style="font-size: 14px; width:100%; text-align:center;"><i>This is a system-generated email, please do not reply to this message.</i></div>
                            </p>
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
                    `, // Embedded image links to content ID
                    // attachments: [
                    //     {
                    //         filename: 'logo.png',
                    //         path: './src/logo.png',
                    //         cid: 'kluedlogo@kluedskincare.com' // Sets content ID
                    //     }
                    // ]
            })
            }
            res.status(200).json("Please check your email for the temporary password.")
        } else {
            res.status(200).json("User not found.")
        }
    } catch (err) {
        console.log(err)
    }
})

router.post("/update-add-cart/:id", auth, async (req, res) => {
    try {
        const obj = {
            type: req.body.type,
            product: req.body.product._id,
            quantity: req.body.quantity
        }
        const info = await accounts.findById(req.params.id)

        if (info.cart.length<1) {
            await accounts.findByIdAndUpdate(req.params.id, {$set: {cart: obj}})
                res.status(200).json(true)
            } else {
            let currentCart = info.cart
            let dupe = false
            function duplicateCheck() {
                currentCart.map((a, index )=> {
                    if (a.product.toString() === obj.product){

                        currentCart[index] = {
                            type: req.body.type,
                            product: a.product,
                            quantity: a.quantity+obj.quantity
                        }

                        dupe = true
                        return dupe
                    }
                    return dupe
                })
            }
            duplicateCheck()
            if (dupe===false) {
                currentCart.push(obj)
            }
            await accounts.findByIdAndUpdate(req.params.id, {$set: {cart: currentCart}})
            res.status(200).json(true)
        }
    } catch (err) {
        console.log(err)
    }
})

router.post("/update-subtract-cart/:id", auth, async (req, res) => {
    try {
        const obj = {
            type: req.body.type,
            product: req.body.product._id,
            quantity: req.body.quantity
        }
        const info = await accounts.findById(req.params.id)

        if (info.cart.length<1) {
            res.status(200).json(true)
        } else {
            let currentCart = info.cart
            let dupe = false
            function duplicateCheck() {
                currentCart.map((a, index )=> {
                    if (a.product.toString() === obj.product){

                        currentCart[index] = {
                            type: req.body.type,
                            product: a.product,
                            quantity: a.quantity-1
                        }

                        dupe = true
                        return dupe
                    }
                    return dupe
                })
            }
            duplicateCheck()
            if (dupe===false) {
                res.status(200).json(true)
            }
            await accounts.findByIdAndUpdate(req.params.id, {$set: {cart: currentCart}})
            res.status(200).json(true)
        }
    } catch (err) {
        console.log(err)
    }
})

router.post("/update-remove-cart-item/:id", auth, async (req, res) => {
    try {
        const info = await accounts.findById(req.params.id)

        if (info.cart.length<1) {
            res.status(200).json(true)
        } else {
            const removeItem = await accounts.findByIdAndUpdate(req.params.id, {$pull: {cart: {product: new ObjectId(req.body._id)}}})
            if (removeItem) {
                res.status(200).json(true)
            } else {
                res.status(200).json(false)
            }
        }
    } catch (err) {
        console.log(err)
    }
})

router.post("/combine-cart/:id", auth, async (req, res) => {
    try {
        const webCart = req.body
        const user = await accounts.findById(req.params.id)
        
        for (let i=0; i<webCart.length; i++){
            let match = false
            let toChange = 0
            
            function loopThis() {
                for (let n=0; n<user.cart.length; n++) {
                    if (user.cart[n]?.product?._id.toString()===webCart[i]?.product?._id.toString()){
                        match = true
                        toChange = n
                        return 
                    }
                }
            }
            
            loopThis()
            if (match===true) {
                user.cart[toChange] = {
                    type: webCart[i]?.type,
                    product: webCart[i]?.product,
                    quantity: user.cart[toChange].quantity+webCart[i]?.quantity,
                }
            } else {
                user.cart.push(webCart[i])
            }
        }
        const updatedUser = await accounts.findByIdAndUpdate(req.params.id, {cart: user.cart }, {new: true}).populate({path:"cart.product", select:["name", "displayimage", "stock", "price", "origprice"]})
        res.status(200).json(updatedUser)
    } catch (err) {
        res.status(500).json(err)
        console.log(err)
    }
})

router.post("/deactivate-account/:id", async (req, res) => {
    try {
        const acc = await accounts.findByIdAndUpdate({_id: req.params.id}, {deactivated: true})
        res.status(200).json(acc)
    } catch (err) {
        res.status(500).json(err)
    }
})

module.exports = router