const express = require ("express");
const cloudinary = require('cloudinary').v2
const router = express.Router()

const cloudinaryConfig = cloudinary.config({
    cloud_name: process.env.CLOUDNAME,
    api_key: process.env.CLOUDAPIKEY,
    api_secret: process.env.CLOUDINARYSECRET,
    secure: true
})

router.get("/get-signature", function (req, res) {
    const timestamp = Math.round(new Date().getTime() / 1000)
    const signature = cloudinary.utils.api_sign_request(
        {
            timestamp: timestamp
        },
        cloudinaryConfig.api_secret
    )
    res.json({ timestamp, signature })
})

module.exports = router