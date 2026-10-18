const mongoose = require('mongoose');


const musicSchema = new mongoose.Schema({
    uri: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    artist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: function() { return !this.isExternal; }
    },
    artistName: {
        type: String
    },
    album: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "album",
    },
    coverImage: {
        type: String,
        default: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop"
    },
    duration: {
        type: Number,
        default: 180
    },
    playsCount: {
        type: Number,
        default: 0
    },
    isExternal: {
        type: Boolean,
        default: false
    },
    externalId: {
        type: String
    },
    source: {
        type: String,
        default: 'local'
    }
}, { timestamps: true })


const musicModel = mongoose.model("music", musicSchema)


module.exports = musicModel;