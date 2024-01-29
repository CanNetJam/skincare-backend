const mongoose = require ("mongoose");

const accountSchema = new mongoose.Schema({
    type: String,
    firstname: String,
    lastname: String,
    middlename: String,
    displayimage: String,
    moreimage: [],
    department: String,
    job: String,
    access: [],
    age: Number,
    sex: String,
    phone: String,
    citizenship: String,
    billingaddress: {
        region: String, 
        province: String,
        city: String,
        barangay: String,
        postal: String,
        street: String
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    cart: [ 
        {
            type: { type: String}, 
            product: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                ref: function() {
                    return this.type==="single" ? 'product' : 'package'
                }
            },
            quantity: {type: Number}
        }
    ],
    verified: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

module.exports= mongoose.model("account", accountSchema)