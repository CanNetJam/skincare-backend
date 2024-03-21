const mongoose = require ("mongoose");

const videosSchema = new mongoose.Schema({
    source: {
        type: String,
    },
    thumbnail: {
        type: String,
    },
    videolink: {
        type: String,
    },
    title: {
        type: String,
    },
    description: {
        type: String,
    },
    items: [
        { type: mongoose.Schema.Types.ObjectId, ref: "product"}
    ],
}, { timestamps: true })

module.exports= mongoose.model("videos", videosSchema)