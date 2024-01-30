const mongoose = require ("mongoose");

const ordersSchema = new mongoose.Schema({
    userid: { 
        type: mongoose.Schema.Types.ObjectId, ref: "accounts"
    },
    owner: {
        //just in case the account is deleted the name of the user is saved
        type: String
    },
    email: {
        type: String
    },
    phone: {
        type: Number
    },
    items: [ 
        { 
            item: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                ref: function() {
                    return this.type==="single" ? 'product' : 'package'
                }
            },
            price: {type: Number},
            quantity: {type: Number},
            type: {type: String}
        }
    ],
    amounttotal: {
        type: Number
    },
    amountpaid: {
        type: Number
    },
    billingaddress: {
        region: String, 
        province: String,
        city: String,
        barangay: String,
        postal: String,
        street: String
    },
    deliveryoption: {
        type: String
    },
    paymentoption: {
        type: String
    },
    paidat: {
        type: Date
    },
    billingstatus: {
        type: String
    },
    deliverystatus: {
        type: String
    },
    codeused: {
        type: String
    },
    trackingnumber: {
        type: String
    }
}, { timestamps: true })

module.exports= mongoose.model("orders", ordersSchema)