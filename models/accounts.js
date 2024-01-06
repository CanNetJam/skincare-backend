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
    region: String, 
    province: String,
    city: String,
    sex: String,
    phone: String,
    citizenship: String,
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    orders: [ 
        { type: mongoose.Schema.Types.ObjectId, ref: "product"},
    ],
    verified: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

module.exports= mongoose.model("account", accountSchema)