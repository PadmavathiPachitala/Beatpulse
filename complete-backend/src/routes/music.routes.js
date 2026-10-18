const express = require('express');
const musicController = require("../controllers/music.controller")
const authMiddleware = require("../middlewares/auth.middleware")
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 30 * 1024 * 1024 // 30 MB max file size limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
            'audio/ogg', 'audio/aac', 'audio/flac', 'audio/x-m4a', 'audio/mp4'
        ];
        const isAudioExt = file.originalname && file.originalname.match(/\.(mp3|wav|ogg|aac|flac|m4a)$/i);
        if (allowedMimes.includes(file.mimetype) || isAudioExt) {
            return cb(null, true);
        }
        const err = new Error("Invalid file type. Only audio files (MP3, WAV, OGG, AAC, FLAC, M4A) are permitted.");
        err.statusCode = 400;
        return cb(err, false);
    }
});

const router = express.Router();


router.post("/upload", authMiddleware.authArtist, upload.single("music"), musicController.createMusic);
router.post("/album", authMiddleware.authArtist, musicController.createAlbum);

// Artist Catalog Management (RBAC: artist or admin)
router.get("/artist/tracks", authMiddleware.authArtist, musicController.getArtistTracks);
router.get("/artist/albums", authMiddleware.authArtist, musicController.getArtistAlbums);
router.delete("/:musicId", authMiddleware.authArtist, musicController.deleteMusic);
router.delete("/album/:albumId", authMiddleware.authArtist, musicController.deleteAlbum);

// Administrator Operations (RBAC: admin only)
router.get("/admin/stats", authMiddleware.authAdmin, musicController.getAdminStats);
router.delete("/admin/user/:userId", authMiddleware.authAdmin, musicController.deleteUserByAdmin);

router.get("/search", musicController.searchMusic);
router.get("/lyrics", musicController.getLyrics);
router.get("/indian/categories", musicController.getIndianCategories);
router.post("/like/:songId", authMiddleware.authGeneral, musicController.toggleLikeSong);
router.get("/liked", authMiddleware.authGeneral, musicController.getLikedSongs);

router.get("/", musicController.getAllMusics);
router.get("/albums", musicController.getAllAlbums);
router.get("/albums/:albumId", musicController.getAlbumById);
router.get("/album/:albumId", musicController.getAlbumById);

module.exports = router;