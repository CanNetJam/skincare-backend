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
        const addEmail = await emails.create(obj)
        res.status(200).json(addEmail)
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
        
        let condition = {createdAt: {$gte: startDate, $lte: endDate}}
        const allEmail = await emails.find(condition).skip(page*emailsPerPage).limit(emailsPerPage)
        const allEmails = await emails.find(condition)
        
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
            from: '<trainingandpolicies@kluedskincare.com>',
            to: maillist,
            cc: '',
            subject: `Do Not Reply - ${req.body.fullname+"'s "}Internal Policy Email Confirmation`,
            html: `
            <h4>Klued Internal Policy Email Confirmation</h4>
            <p>
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
                <i>This is a system-generated email, please do not reply to this message.</i>
                <br/>
                <br/>
                Regards,
                <br/>
                <br/>
                <b>Klued Human Resource Department</b>
                <br/>
                <img src="kluedlogo@kluedskincare.com"/>'
            </p>
            `, // Embedded image links to content ID
            attachments: [{
              filename: 'logo.png',
              path: './src/logo.png',
              cid: 'kluedlogo@kluedskincare.com' // Sets content ID
            }]
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

module.exports = router