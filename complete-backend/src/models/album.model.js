const mongoose = require("mongoose");


const albumSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    musics: [ {
        type: mongoose.Schema.Types.ObjectId,
        ref: "music"
    } ],
    artist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    coverImage: {
        type: String,
        default: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop"
    }
}, { timestamps: true })

const albumModel = mongoose.model("album", albumSchema)


module.exports = albumModel;