const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    coverImage: {
        type: String,
        default: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    musics: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'music'
    }]
}, { timestamps: true });

module.exports = mongoose.model('playlist', playlistSchema);
