const mongoose = require ("mongoose");

const emailsSchema = new mongoose.Schema({
    email: String,
    sentAt: Date
}, { timestamps: true })

module.exports= mongoose.model("emails", emailsSchema)