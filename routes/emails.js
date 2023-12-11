const express = require ("express");
const product = require ("../models/emails.js");
const emails = require("../models/emails.js");
const router = express.Router();

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
        
        let condition = {createdAt: {$gte: startDate, $lt: endDate}}
        const allEmail = await emails.find(condition).skip(page*emailsPerPage).limit(emailsPerPage)
        const allEmails = await emails.find(condition)
        
        let a = Math.floor(allEmails.length/emailsPerPage)
        let b = allEmails.length%emailsPerPage

        if (b!==0) {
            a=a+1
        }

        const obj = {
            sortedEmails: allEmail,
            totalEmails: a
        }
        res.status(200).json(obj)
    }catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
})

module.exports = router