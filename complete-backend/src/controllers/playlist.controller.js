const playlistModel = require('../models/playlist.model');
const musicModel = require('../models/music.model');
const mongoose = require('mongoose');

/**
 * Create a new user playlist
 */
async function createPlaylist(req, res) {
    try {
        const { name, description, coverImage } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Playlist name is required" });
        }

        const newPlaylist = await playlistModel.create({
            name: name.trim(),
            description: description ? description.trim() : '',
            coverImage: coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop',
            user: req.user.id,
            musics: []
        });

        return res.status(201).json({
            message: "Playlist created successfully",
            playlist: newPlaylist
        });
    } catch (error) {
        console.error("Error in createPlaylist:", error);
        return res.status(500).json({ message: "Failed to create playlist", error: error.message });
    }
}

/**
 * Get all playlists belonging to current user
 */
async function getUserPlaylists(req, res) {
    try {
        const playlists = await playlistModel.find({ user: req.user.id })
            .populate('musics')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "User playlists retrieved successfully",
            playlists
        });
    } catch (error) {
        console.error("Error in getUserPlaylists:", error);
        return res.status(500).json({ message: "Failed to retrieve playlists", error: error.message });
    }
}

/**
 * Get single playlist by ID
 */
async function getPlaylistById(req, res) {
    try {
        const { playlistId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(playlistId)) {
            return res.status(400).json({ message: "Invalid playlist ID format" });
        }

        const playlist = await playlistModel.findById(playlistId)
            .populate({
                path: 'musics',
                populate: { path: 'artist', select: 'username' }
            })
            .populate('user', 'username email');

        if (!playlist) {
            return res.status(404).json({ message: "Playlist not found" });
        }

        return res.status(200).json({
            message: "Playlist retrieved successfully",
            playlist
        });
    } catch (error) {
        console.error("Error in getPlaylistById:", error);
        return res.status(500).json({ message: "Failed to retrieve playlist", error: error.message });
    }
}

/**
 * Add track to playlist (supports both local DB tracks and external track objects)
 */
async function addTrackToPlaylist(req, res) {
    try {
        const { playlistId } = req.params;
        const { trackId, title, artistName, coverImage, uri, duration, externalId, source } = req.body;

        const playlist = await playlistModel.findById(playlistId);
        if (!playlist) {
            return res.status(404).json({ message: "Playlist not found" });
        }

        if (playlist.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Unauthorized: only owner can edit this playlist" });
        }

        let targetMusicId = null;

        // Check if trackId is valid local ObjectId
        if (trackId && mongoose.Types.ObjectId.isValid(trackId)) {
            const existing = await musicModel.findById(trackId);
            if (existing) {
                targetMusicId = existing._id;
            }
        }

        // Upsert external track stub if not local
        if (!targetMusicId) {
            const extId = String(externalId || trackId || '').replace(/^ext_(audius|saavn|itunes)_/, '').trim();
            if (extId) {
                let cached = await musicModel.findOne({ externalId: extId });
                if (!cached) {
                    cached = await musicModel.create({
                        uri: uri || `https://api.audius.co/v1/tracks/${extId}/stream?app_name=SpotifyClone`,
                        title: title || 'Track',
                        artistName: artistName || 'Artist',
                        coverImage: coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop',
                        duration: duration || 180,
                        externalId: extId,
                        isExternal: true,
                        source: source || 'saavn'
                    });
                }
                targetMusicId = cached._id;
            }
        }

        if (!targetMusicId) {
            return res.status(400).json({ message: "Invalid track data provided" });
        }

        // Avoid duplicates in playlist
        const exists = playlist.musics.some(mId => mId.toString() === targetMusicId.toString());
        if (!exists) {
            playlist.musics.push(targetMusicId);
            await playlist.save();
        }

        const populatedPlaylist = await playlistModel.findById(playlistId)
            .populate({
                path: 'musics',
                populate: { path: 'artist', select: 'username' }
            })
            .populate('user', 'username email');

        return res.status(200).json({
            message: "Track added to playlist",
            playlist: populatedPlaylist || playlist
        });
    } catch (error) {
        console.error("Error in addTrackToPlaylist:", error);
        return res.status(500).json({ message: "Failed to add track to playlist", error: error.message });
    }
}

/**
 * Remove track from playlist
 */
async function removeTrackFromPlaylist(req, res) {
    try {
        const { playlistId, trackId } = req.params;

        const playlist = await playlistModel.findById(playlistId);
        if (!playlist) {
            return res.status(404).json({ message: "Playlist not found" });
        }

        if (playlist.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Unauthorized: only owner can edit this playlist" });
        }

        playlist.musics = playlist.musics.filter(id => id.toString() !== trackId.toString());
        await playlist.save();

        const populatedPlaylist = await playlistModel.findById(playlistId)
            .populate({
                path: 'musics',
                populate: { path: 'artist', select: 'username' }
            })
            .populate('user', 'username email');

        return res.status(200).json({
            message: "Track removed from playlist",
            playlist: populatedPlaylist || playlist
        });
    } catch (error) {
        console.error("Error in removeTrackFromPlaylist:", error);
        return res.status(500).json({ message: "Failed to remove track from playlist", error: error.message });
    }
}

/**
 * Delete a playlist
 */
async function deletePlaylist(req, res) {
    try {
        const { playlistId } = req.params;

        const playlist = await playlistModel.findById(playlistId);
        if (!playlist) {
            return res.status(404).json({ message: "Playlist not found" });
        }

        if (playlist.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Unauthorized: only owner can delete this playlist" });
        }

        await playlistModel.findByIdAndDelete(playlistId);

        return res.status(200).json({
            message: "Playlist deleted successfully"
        });
    } catch (error) {
        console.error("Error in deletePlaylist:", error);
        return res.status(500).json({ message: "Failed to delete playlist", error: error.message });
    }
}

module.exports = {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    deletePlaylist
};
