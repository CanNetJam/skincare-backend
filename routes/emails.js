const express = require ("express");
const emails = require("../models/emails.js");
const router = express.Router();
const nodemailer = require("nodemailer");
const auth = require("../middleware/auth");
const verification = require("../models/verification.js");
const bcrypt = require("bcryptjs");
const accounts = require ("../models/accounts.js");
const { ObjectId } = require ("mongodb");

router.post("/submit-email", async (req, res) => {
    try {
        const obj = {
            email: req.body.email
        }
        const existingEmail = await emails.find({email: req.body.email}) 

        if (existingEmail.length>0) {
            res.status(200).json(true)
        } else {
            await emails.create(obj)
            res.status(200).json(false)
        }
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.get("/all-emails", async (req, res) => {
    try {
        const page = req.query.page
        const emailsPerPage = req.query.limit
        const startDate = req.query.startDate
        const endDate = req.query.endDate
        const allEmail = await emails.find({$and: [ 
                {email: new RegExp(req.query.searchString, 'i')}, 
                {createdAt: {$gte: startDate, $lte: endDate}} 
            ]})
            .skip(page*emailsPerPage)
            .limit(emailsPerPage)
        const allEmails = await emails.find({$and: [ {email: new RegExp(req.query.searchString, 'i')}, {createdAt: {$gte: startDate, $lte: endDate}} ]})
        
        let a = Math.floor(allEmails.length/emailsPerPage)
        let b = allEmails.length%emailsPerPage

        if (b!==0) {
            a=a+1
        }

        const obj = {
            sortedEmails: allEmail,
            totalEmails: a,
            total: allEmails.length
        }
        res.status(200).json(obj)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/send-policy-email", auth, async (req, res) => {
    try {
        const maillist = [
            req.body.useremail,
            'echua@kluedskincare.com',
            'carnatur@kluedskincare.com'
        ]
        let policyText = ""
        if(req.body.policytitle.length>1){
            for (let i=0; i<req.body.policytitle.length; i++) {
                if (i<req.body.policytitle.length-1) {
                    policyText = policyText + (req.body.policytitle[i]+", ")
                } else if (i===req.body.policytitle.length-1) {
                    policyText = policyText + req.body.policytitle[i]
                }
            } 
        } else {
            policyText = req.body.policytitle[0]
        }
        
        let transporter = nodemailer.createTransport({
            host: "smtpout.secureserver.net", 
            port: 465, 
            secure: true, 
            auth: {
              user: "trainingandpolicies@kluedskincare.com", 
              pass: process.env.EMAIL_PASS, 
            },
            tls : { rejectUnauthorized: false }
        })

        let info = await transporter.sendMail({
            from: '"Klued" <trainingandpolicies@kluedskincare.com>',
            to: maillist,
            cc: '',
            subject: `Do Not Reply - ${req.body.fullname+"'s "}Internal Policy Email Confirmation`,
            html: `
            <div style="font-family: Century Gothic, sans-serif;" width="100%">
                <div style="Margin:0 auto; max-width:750px;">
                    <div style="display: none;">Here is a proof that you signed, understood and agreed a policy og Klued Skincare Products Trading.</div>
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
                    <p style="font-size: 26px; color:#ffffff; background-color:#3b82f6; padding-top: 15px;padding-bottom: 15px; text-align:center"><b>Klued Internal Policy Email Confirmation</b></p>
                    <p style="font-size: 16px;">
                        Hi ${req.body.fullname},
                        <br/>
                        <br/>
                        This email is sent to you in order to confirm that you signed, understood and agreed in the following:
                        <br/>
                        <br/>
                        <b>${policyText}</b>
                        <br/>
                        <br/>
                        on <b>${req.body.date}</b>.
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
            //   filename: 'logo.png',
            //   path: './src/logo.png',
            //   cid: 'kluedlogo@kluedskincare.com' // Sets content ID
            // }]
        })
        res.status(200).json(true)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.post("/verify-email/:id/:uniqueString", async (req, res) => {
    try {
        const findVerification = await verification.find({userid: req.params.id})
        if (findVerification.length>0) {
            if (findVerification[0].expiration < Date.now()) {
                const expiration = await verification.deleteOne({userid: req.params.id})
                res.status(200).json("Link expired! Verification links only last for 3 days. Register again to continue.")
            } else {
                const uniqueCode = await bcrypt.compare(req.params.uniqueString, findVerification[0].encryptedstring)
                console.log(req.params.id)
                if (uniqueCode) {
                    const verifyAccount = await accounts.findByIdAndUpdate({ _id: new ObjectId(req.params.id) }, {verified: true})
                    if (verifyAccount) {
                        await verification.deleteOne({userid: req.params.id})
                        res.status(200).json("Successfully verified your Klued Employee Portal Account")
                    }
                } else {
                    res.status(200).json("Invalid credentials. Try again.")
                }
            }
        } else {
            res.status(200).json("Verification not found. Your account is probably verified, please try to login.")
        }
    } catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

router.delete("/delete-email/:id", async (req, res) => {
    const doc = await emails.findById(req.params.id)

    const email = await emails.findByIdAndDelete(doc)  
    if (email) {
        res.status(200).json(email)
    } else {
        res.status(500).json(false)
    }
})

module.exports = router