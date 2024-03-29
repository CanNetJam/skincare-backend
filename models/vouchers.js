const mongoose = require ("mongoose");

const vouchersSchema = new mongoose.Schema({
    userid: { 
        type: mongoose.Schema.Types.ObjectId, ref: "accounts"
    },
    orderid: { 
        type: mongoose.Schema.Types.ObjectId, ref: "orders"
    },
    encryptedvoucher: {
        type: String,
    },
    type: {
        type: String,
    },
    discounttype: {
        type: String,
    },
    amount: {
        type: Number,
    },
    minimum: {
        type: Number,
    },
    maximum: {
        type: Number,
    },
    expiration: {
        type: Date
    },
    status: {
        type: String
    }
}, { timestamps: true })

module.exports= mongoose.model("vouchers", vouchersSchema)