const mongoose = require ("mongoose");

const productSchema = new mongoose.Schema({
    name: String,
    displayimage: String,
    moreimage: [],
    maindesc: String,
    category: String,
    ingredients: [],
    routines: [],
    do: {
        type: Array,
    },
    dont: {
        type: Array,
    },
    stock: {
        type: Number,
    },
    price: {
        type: Number,
    },
    disprice: {
        type: Number,
    },
    productlinks: {
        shopee: { type: String },
        tiktok: { type: String },
        lazada: { type: String }
    },
    usage: {
        type: String,
    },
    extra: {
        type: String,
    },
    videos: {
        type: Array,
        default: []
    },
    relatedproducts: [ 
        { type: mongoose.Schema.Types.ObjectId, ref: "product"},
    ],
    featuredvideos: {
        type: Array,
        default: []
    },
    sold: {
        type: Number,
    },
}, { timestamps: true })

module.exports= mongoose.model("product", productSchema)