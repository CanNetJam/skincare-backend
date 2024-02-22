const mongoose = require ("mongoose");
const accounts = require ('./accounts')

const reviewsSchema = new mongoose.Schema({
    orderid: { 
        type: mongoose.Schema.Types.ObjectId, ref: "orders"
    },
    userid: { 
        type: mongoose.Schema.Types.ObjectId, ref: accounts
    },
    owner: {
        //just in case the account is deleted the name of the user is saved
        type: String
    },
    product: [
        {
            productid: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                ref: function() {
                    return this.type==="single" ? 'product' : 'package'
                }
            },
            type: {
                type: String
            }
        }
    ],
    description:{
        //just in case the account is deleted the name of the user is saved
        type: String
    },
    reviewimage: {
        type: String
    },
    rating: {
        type: Number
    },
    status: {
        type: String
    },
    recommended: {
        type: Boolean,
        default: false
    },
    upvotes: { 
        type: Number,
        default: 0
    },
}, { timestamps: true })

module.exports= mongoose.model("reviews", reviewsSchema)