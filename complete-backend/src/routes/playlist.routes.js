const express = require('express');
const playlistController = require('../controllers/playlist.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', authMiddleware.authGeneral, playlistController.createPlaylist);
router.get('/', authMiddleware.authGeneral, playlistController.getUserPlaylists);
router.get('/:playlistId', playlistController.getPlaylistById);
router.post('/:playlistId/track', authMiddleware.authGeneral, playlistController.addTrackToPlaylist);
router.delete('/:playlistId/track/:trackId', authMiddleware.authGeneral, playlistController.removeTrackFromPlaylist);
router.delete('/:playlistId', authMiddleware.authGeneral, playlistController.deletePlaylist);

module.exports = router;
