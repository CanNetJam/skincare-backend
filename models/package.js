const mongoose = require ("mongoose");

const packageSchema = new mongoose.Schema({
    name: String,
    displayimage: String,
    moreimage: [],
    maindesc: String,
    moredesc: String,
    routines: {},
    stock: {
        type: Number,
    },
    origprice: {
        type: Number,
    },
    disprice: {
        type: Number,
    },
    packagelinks: {
        shopee: { type: String },
        tiktok: { type: String },
        lazada: { type: String }
    },
    items: [ 
        { type: mongoose.Schema.Types.ObjectId, ref: "product"},
    ]
}, { timestamps: true })

module.exports= mongoose.model("package", packageSchema)