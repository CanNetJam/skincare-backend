const mongoose = require ("mongoose");

const ticketsSchema = new mongoose.Schema({
    orderid: {
        type: mongoose.Schema.Types.ObjectId, ref: "orders"
    },
    userid: {
        type: mongoose.Schema.Types.ObjectId, ref: "accounts"
    },
    owner: {
        type: String
    },
    type: {
        type: String    
    },
    mainreason: {
        type: String
    },
    description: {
        type: String    
    },
    waybillimage: {
        type: String    
    },
    productimage1: {
        type: String    
    },
    productimage2: {
        type: String    
    },
    status: {
        type: String    
    },
    response: {
        type: String    
    },
    verdict: {
        type: String    
    },
    respondedAt: {
        type: Date    
    }
}, { timestamps: true })

module.exports= mongoose.model("tickets", ticketsSchema)