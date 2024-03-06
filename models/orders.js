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
            type: {type: String},
            withticket: {
                type: Boolean,
                default: false
            }
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
    refundedat: {
        type: Date
    },
    billingstatus: {
        type: String
    },
    deliverystatus: {
        type: String
    },
    deliveredat: {
        type: Date
    },
    codeused: {
        type: String
    },
    trackingnumber: {
        type: String
    },
    paymentid: {
        type: String
    },
    paymentinentid: {
        type: String
    },
    sourceid: {
        type: String
    },
    balancetransactionid: {
        type: String
    },
    reason: {
        type: String
    },
    cancelreason: {
        type: String
    },
    shippingfee: {
        type: Number
    },
    netamount: {
        type: Number
    },
    transactionfee: {
        type: Number
    },
    discount: {
        type: Number
    },
    discountid: {
        type: mongoose.Schema.Types.ObjectId, ref: "vouchers"
    },
    reviewed: {
        type: Boolean,
        default: false
    },
    ticketid: {
        type: String
    },
}, { timestamps: true })

module.exports= mongoose.model("orders", ordersSchema)