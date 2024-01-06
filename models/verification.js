const mongoose = require ("mongoose");

const verificationSchema = new mongoose.Schema({
    userid: { 
        type: mongoose.Schema.Types.ObjectId, ref: "accounts"
    },
    encryptedstring: {
        type: String,
    },
    expiration: {
        type: Date
    }
}, { timestamps: true })

module.exports= mongoose.model("verification", verificationSchema)