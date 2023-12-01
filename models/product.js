import mongoose from "mongoose"

const productSchema = new mongoose.Schema({
    name: String,
    displayimage: String,
    maindesc: String,
    ingredients: [{
        ingname: {
            type: String
        },
        ingimage: {
            type: String
        },
        ingdesc: {
            type: String
        },
    }],
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
    productlinks: {
        shopee: { type: String },
        tiktok: { type: String },
        lazada: { type: String }
    }
}, { timestamps: true })

export default mongoose.model("product", productSchema)