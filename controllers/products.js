import product from "../models/product.js"

export const createProduct = async (req, res) => {
    console.log(req.body)
    try {
        const obj = {
            name: req.body.name,
            maindesc: req.body.maindesc,
            stock: req.body.stock,
            productlinks: {
            shopee: req.body.shopeelink,
            tiktok: req.body.tiktoklink,
            lazada: req.body.lazadalink,
            },
        }
        const newProduct = await product.create(obj)
        res.status(200).json(newProduct)
    }catch (err) {
        res.status(500).json(err)
    }
}