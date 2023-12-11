const mongoose = require ("mongoose");

const emailsSchema = new mongoose.Schema({
    email: String
}, { timestamps: true })

module.exports= mongoose.model("emails", emailsSchema)