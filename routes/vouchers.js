const express = require ("express");
const router = express.Router();
const vouchers = require('../models/vouchers.js');

router.post("/submit-voucher/:id", async (req, res) => {
    try {
        const findVoucher = await vouchers.find({encryptedvoucher: req.body.voucher, userid: req.params.id})
        if (findVoucher.length>0) {
            if (findVoucher[0].expiration < Date.now()) {
                return res.status(200).json("Sorry, voucher is already expired.")
            }
            if (findVoucher[0].status==="Used") {
                return res.status(200).json("Sorry, voucher is already used.")
            }
            return res.status(200).json(findVoucher)
        } else {
            return res.status(200).json(false)
        }
    } catch {
        res.status(500)
    }
})

module.exports = router