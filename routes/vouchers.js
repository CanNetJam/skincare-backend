const express = require ("express");
const router = express.Router();
const vouchers = require('../models/vouchers.js');
const accounts = require ("../models/accounts.js");
const auth = require("../middleware/auth");
const nodemailer = require("nodemailer");
const moment = require("moment");
const orders = require ("../models/orders.js");
const emails = require("../models/emails.js");

router.post("/submit-voucher/:id", async (req, res) => {
    try {
        const findVoucher = await vouchers.find({encryptedvoucher: req.body.voucher})
        if (findVoucher.length>0) {
            if (findVoucher[0].expiration < Date.now()) {
                return res.status(200).json("Sorry, voucher is already expired.")
            }
            if (findVoucher[0].status==="Used") {
                return res.status(200).json("Sorry, voucher is already used.")
            }
            if (findVoucher[0].userid.toString()!==req.params.id.toString()) {
                const myOrders = await orders.find({userid: req.params.id})
                if (myOrders.length<1) {
                    return res.status(200).json(findVoucher)
                } else {
                    return res.status(200).json("Sorry, but you can not use vouchers not registered to your account.")
                }
            }
            return res.status(200).json(findVoucher)
        } else {
            return res.status(200).json(false)
        }
    } catch {
        res.status(500).json(err)
    }
})

router.post("/generate-vouchers", auth, async (req, res) => {
    try {
        let theEmails = JSON.parse(req.body.emails)
        let maillist = []  
        for (let i=0; i<theEmails.length; i++) {
            maillist.push(theEmails[i].email)
        }

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
                    amount: req.body.discount,
                    minimum: req.body.minimum,
                    maximum: 100,
                    expiration: Date.now() + 259200000,
                    status: "Unused",
                    discounttype: req.body.percentage==='true' ? "Percentage" : "Flat"
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
                            <div style="display: none;">Let's work together for your first checkout with this ${req.body.percentage==='true' ? req.body.discount+'%': '₱'+req.body.discount+'.00'} off voucher!</div>
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
                            <p style="font-size: 26px; color:#ffffff; background-color:#3b82f6; padding-top: 15px;padding-bottom: 15px; text-align:center"><b>Klued ${req.body.percentage==='true' ? req.body.discount+'%': '₱'+req.body.discount+'.00'} Voucher</b></p>
                            <div style="font-size: 16px; width:100%">
                                Hi ${foundId ? foundId.firstname+" "+foundId.lastname : 'Klued Nerdie'},
                                <br/>
                                <p style="text-align: justify;">
                                    Thank you for taking your time on registering an account to Klued Skincare. Here is a free <b>${req.body.percentage==='true' ? req.body.discount+'%': '₱'+req.body.discount+'.00'}</b> off voucher for you to use upon checkout. Apply the code below when you purchase at least ₱${req.body.minimum}.00 worth of Klued products. This voucher will expire on <b>${formattedVoucherDate}</b>.
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
                                                <a style="border-radius: 8px;padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/products/klued---barrier-support-hydrating-jelly-cleanser/658b84494c94654d802d8bc7"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1xjw0RT5vYwAueTCibVXWBwn_NwnU0tDs" alt="" title="" width="150" height="150"/></a>
                                                <br/>
                                                <b>Klued - Barrier Support Hydrating Jelly Cleanser</b>
                                            </td>
                                            <td style="max-width:32%; text-align: center; font-size: 16px">
                                                <a style="border-radius: 8px;padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/products/klued---multi-brightening-complex-serum/658b815b4c94654d802d8bc0"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=11WnG-nVj02AWVHceJbPYEkrUXSu_JEjU" alt="" title="" width="150" height="150"/></a>
                                                <br/>
                                                <b>Klued - Multi-Brightening Complex Serum</b>
                                            </td>
                                            <td style="max-width:32%; text-align: center; font-size: 16px">
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
                                            <td style="max-width:32%; text-align: center; font-size: 16px">
                                                <a style="border-radius: 8px;padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/packages/klued-oily-or-acne-prone-skin-set/658b89224c94654d802d8bdb"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=15FY0yN4MdrspriMHj5fPU8v3rZyRaC3I" alt="" title="" width="150" height="150"/></a>
                                                <br/>
                                                <b>Klued Oily/Acne Prone Skin SET</b>
                                            </td>
                                            <td style="max-width:32%; text-align: center; font-size: 16px">
                                                <a style="border-radius: 8px;padding-left: 6px;padding-right: 6px;line-height:135%;font-size: 18px;text-transform:none;letter-spacing:1px;color:#ffffff;" href="https://kluedskincare.com/packages/klued-anti-aging-routine-set-(for-beginners)/658b8b2b4c94654d802d8bea"><img style="Margin:0 auto;" src="http://drive.google.com/uc?export=view&id=1W41Bc2EsEt5mVCVqDs9LWim98Vhaww-n" alt="" title="" width="150" height="150"/></a>
                                                <br/>
                                                <b>Klued Anti-Aging Routine SET (for Beginners)</b>
                                            </td>
                                            <td style="max-width:32%; text-align: center; font-size: 16px">
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
                    `, // Embedded image links to content ID
                    // attachments: [{
                    // filename: 'logo.png',
                    // path: './src/logo.png',
                    // cid: 'kluedlogo@kluedskincare.com' // Sets content ID
                    // }]
                    
                })
                await emails.findOneAndUpdate({email: maillist[i]}, {sentAt: Date.now()})
            //}
        }
        return res.status(200).send(true)
    } catch (err) {
        res.status(500).send(err)
    }
})

router.get("/all-vouchers", auth, async (req, res) => {
    try {
        const allVoucher = await vouchers.find({$and: [ {encryptedvoucher: new RegExp(req.query.searchString, 'i')}]}).sort({createdAt: -1})
        res.status(200).json(allVoucher)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/update-voucher/:id", auth, async (req, res) =>{
    try {
        const obj = {
            status: req.body.status, 
            expiration: req.body.expiration,
        }
        const updateVoucher = await vouchers.findByIdAndUpdate({ _id: req.params.id}, {$set: obj})
        res.status(200).json(updateVoucher)
    } catch (err) {
        res.status(500).json(err)
    }
})

module.exports = router