const express = require ("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const accounts = require ("../models/accounts.js");

router.post("/tokenIsValid", async (req, res) => {
    try {
        const token = req.header("auth-token")
        if (!token) {
            return res.json(false)
        }
        const verified = jwt.verify(token, process.env.JWT_SECRET)
        if (!verified) {
            return res.json(false)
        }
        const user = await accounts.findById(verified._id)
        if (!user) {
            return res.json(false)
        }
        return res.json(true)
    } catch {
        res.status(500)
    }
})

module.exports = router