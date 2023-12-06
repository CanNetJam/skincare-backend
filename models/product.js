const mongoose = require ("mongoose");

const productSchema = new mongoose.Schema({
    name: String,
    displayimage: String,
    moreimage: [],
    maindesc: String,
    category: String,
    ingredients: [],
    morroutine: [{
        skintype: {
            type: String
        },
        steps: {
            type: Array
        },
    }],
    nigroutine: [{
        skintype: {
            type: String
        },
        steps: {
            type: Array
        },
    }],
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
    }
}, { timestamps: true })

module.exports= mongoose.model("product", productSchema)