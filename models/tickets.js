const mongoose = require ("mongoose");
const accounts = require ('./accounts');

const ticketsSchema = new mongoose.Schema({
    orderid: {
        type: mongoose.Schema.Types.ObjectId, ref: "orders"
    },
    userid: {
        type: mongoose.Schema.Types.ObjectId, ref: accounts
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: function() {
                return this.type==="single" ? 'product' : 'package'
            }
        },
        name: {type:String},
        price: {type: Number},
        quantity: {type: Number},
        type: {type: String}
    }],
    transactionfee: {
        type: Number
    },
    refundedamount: {
        type: Number
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
    respondedAt: {
        type: Date    
    },
    expiresAt: {
        type: Date    
    },
    open: {
        type: Boolean,
        default: true    
    }
}, { timestamps: true })

module.exports= mongoose.model("tickets", ticketsSchema)