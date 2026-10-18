const mongoose = require("mongoose");
const musicModel = require("../models/music.model");
const albumModel = require("../models/album.model");
const userModel = require("../models/user.model");
const { uploadFile } = require("../services/storage.service");
const audiusService = require("../services/audius.service");
const jioSaavnService = require("../services/jiosaavn.service");
const iTunesService = require("../services/itunes.service");
const lyricsService = require("../services/lyrics.service");

async function createMusic(req, res) {
    try {
        const { title, coverImage, albumId } = req.body || {};
        const file = req.file;

        if (!title) {
            return res.status(400).json({ message: "Song title is required" });
        }

        if (!file) {
            return res.status(400).json({ message: "Audio file is required" });
        }

        const result = await uploadFile(file.buffer.toString('base64'));

        const musicData = {
            uri: result.url,
            title,
            artist: req.user.id,
        };

        if (coverImage) {
            musicData.coverImage = coverImage;
        }

        if (albumId) {
            musicData.album = albumId;
        }

        const music = await musicModel.create(musicData);

        // If albumId was provided, add music to album's musics array
        if (albumId) {
            await albumModel.findByIdAndUpdate(albumId, { $addToSet: { musics: music._id } });
        }

        return res.status(201).json({
            message: "Music created successfully",
            music: {
                id: music._id,
                uri: music.uri,
                title: music.title,
                artist: music.artist,
                coverImage: music.coverImage,
            }
        });
    } catch (error) {
        console.error("Error in createMusic:", error);
        return res.status(500).json({ message: "Failed to upload music", error: error.message });
    }
}

async function createAlbum(req, res) {
    try {
        const { title, musics = [], coverImage } = req.body || {};

        if (!title) {
            return res.status(400).json({ message: "Album title is required" });
        }

        const albumData = {
            title,
            artist: req.user.id,
            musics: musics,
        };

        if (coverImage) {
            albumData.coverImage = coverImage;
        }

        const album = await albumModel.create(albumData);

        // If musics were attached, update each music's album reference
        if (musics.length > 0) {
            await musicModel.updateMany({ _id: { $in: musics } }, { album: album._id });
        }

        return res.status(201).json({
            message: "Album created successfully",
            album: {
                id: album._id,
                title: album.title,
                artist: album.artist,
                musics: album.musics,
                coverImage: album.coverImage
            }
        });
    } catch (error) {
        console.error("Error in createAlbum:", error);
        return res.status(500).json({ message: "Failed to create album", error: error.message });
    }
}

async function getAllMusics(req, res) {
    try {
        const musics = await musicModel
            .find({ isExternal: { $ne: true }, artist: { $exists: true, $ne: null } })
            .populate("artist", "username email")
            .populate("album", "title coverImage");

        return res.status(200).json({
            message: "Musics fetched successfully",
            musics: musics,
        });
    } catch (error) {
        console.error("Error in getAllMusics:", error);
        return res.status(500).json({ message: "Failed to fetch music", error: error.message });
    }
}

async function getAllAlbums(req, res) {
    try {
        const albums = await albumModel
            .find({ isExternal: { $ne: true } })
            .select("title artist coverImage musics")
            .populate("artist", "username email")
            .populate({
                path: "musics",
                match: { isExternal: { $ne: true } }
            });

        return res.status(200).json({
            message: "Albums fetched successfully",
            albums: albums,
        });
    } catch (error) {
        console.error("Error in getAllAlbums:", error);
        return res.status(500).json({ message: "Failed to fetch albums", error: error.message });
    }
}

async function getAlbumById(req, res) {
    try {
        const albumId = req.params.albumId;

        // Check if external JioSaavn album
        if (typeof albumId === 'string' && albumId.startsWith('ext_saavn_album_')) {
            const rawId = albumId.replace('ext_saavn_album_', '');
            const albumData = await jioSaavnService.getAlbumDetails(rawId);
            if (albumData) {
                return res.status(200).json({
                    message: "Album fetched successfully",
                    album: albumData
                });
            }
        }

        const album = await albumModel
            .findById(albumId)
            .populate("artist", "username email")
            .populate({
                path: "musics",
                populate: { path: "artist", select: "username email" }
            });

        if (!album) {
            return res.status(404).json({ message: "Album not found" });
        }

        return res.status(200).json({
            message: "Album fetched successfully",
            album: album,
        });
    } catch (error) {
        console.error("Error in getAlbumById:", error);
        return res.status(500).json({ message: "Failed to fetch album", error: error.message });
    }
}

let indianCategoriesCache = null;
let indianCategoriesCacheTime = 0;
const CATEGORIES_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours in-memory cache

async function getIndianCategories(req, res) {
    try {
        if (indianCategoriesCache && Date.now() - indianCategoriesCacheTime < CATEGORIES_CACHE_TTL) {
            return res.status(200).json({
                message: "Indian music categories fetched successfully",
                categories: indianCategoriesCache
            });
        }

        const curatedList = [
            { 
                id: 'trending', 
                title: 'Trending Now • Viral Hits', 
                query: 'Trending hits',
                limitPerQuery: 1,
                curatedQueries: [
                    'Endhayya Saami Ranabaali',
                    'Pesamale Siri Xander',
                    'Uppongela Godavari',
                    'Yamunatheeram Hariharan',
                    'Arey Rey Happy Days',
                    'Hey Pillagaada Fidaa',
                    'Srimathi Garu Lucky Baskhar',
                    'Hey Minnale Amaran',
                    'Aasa Kooda Sai Abhayankar',
                    'Aaj Ki Raat Stree 2',
                    'Big Dawgs Hanumankind',
                    'Tauba Tauba Bad Newz',
                    'Millionaire Honey Singh',
                    'Aayi Nai Stree 2',
                    'Jaana Samjho Na Bhool Bhulaiyaa 3',
                    'Jo Tum Mere Ho Anuv Jain',
                    'Illuminati Aavesham',
                    'Sooseki Pushpa 2',
                    'Kurchi Madathapetti Guntur Kaaram',
                    'Chuttamalle Devara',
                    'Daavudi Devara'
                ]
            },
            { 
                id: 'telugu', 
                title: 'Telugu Hits & Melodies', 
                query: 'Telugu hits',
                limitPerQuery: 1,
                curatedQueries: [
                    'Endhayya Saami Ranabaali',
                    'Uppongela Godavari',
                    'Yamunatheeram Hariharan',
                    'Arey Rey Happy Days',
                    'Hey Pillagaada Fidaa',
                    'Vachinde Fidaa',
                    'Andamga Lena Godavari',
                    'O My Friend Happy Days',
                    'Srimathi Garu Lucky Baskhar',
                    'Garam Garam Saripodhaa Sanivaaram',
                    'Hi Nanna Samayama',
                    'Ammaadi Hi Nanna',
                    'Ta Takkara Kalki',
                    'Pushpa Pushpa Telugu',
                    'Sooseki Pushpa 2',
                    'Varudu Kaavalenu Kola Kalle',
                    'Pilla Puli Aakaasam Nee Haddhu Ra',
                    'Gharshana Cheliya',
                    'Gharshana Ye Chilipi',
                    'Buttabomma Ala Vaikunthapurramuloo',
                    'Inkem Inkem Inkem Kaavaale',
                    'Naatu Naatu RRR',
                    'Kurchi Madathapetti Guntur Kaaram',
                    'Chuttamalle Devara',
                    'Fear Song Devara',
                    'Daavudi Devara'
                ]
            },
            {
                id: 'feelgood-classics',
                title: 'Soulful Classics • Godavari, Anand, Happy Days & Fidaa',
                query: 'Telugu feel good classics',
                limitPerQuery: 1,
                curatedQueries: [
                    'Uppongela Godavari',
                    'Yamunatheeram Hariharan',
                    'Arey Rey Happy Days',
                    'Hey Pillagaada Fidaa',
                    'Vachinde Fidaa',
                    'Andamga Lena Godavari',
                    'O My Friend Happy Days'
                ]
            },
            { 
                id: 'tamil', 
                title: 'Tamil Melodies & Waves', 
                query: 'Tamil top hits',
                limitPerQuery: 1,
                curatedQueries: [
                    'Pesamale Siri Xander',
                    'Hey Minnale Amaran',
                    'Aasa Kooda Sai Abhayankar',
                    'Katchi Sera Sai Abhayankar',
                    'Hukum Jailer',
                    'Naa Ready Leo',
                    'Badass Leo',
                    'Kaavaalaa Jailer',
                    'Arabic Kuthu Beast',
                    'Illuminati Tamil',
                    'Chuttamalle Tamil'
                ]
            },
            { 
                id: 'bollywood', 
                title: 'Bollywood & Hindi Hits', 
                query: 'Bollywood hits',
                limitPerQuery: 1,
                curatedQueries: [
                    'Aaj Ki Raat Stree 2',
                    'Aayi Nai Stree 2',
                    'Jaana Samjho Na Bhool Bhulaiyaa 3',
                    'Tauba Tauba Bad Newz',
                    'Jo Tum Mere Ho Anuv Jain',
                    'Millionaire Honey Singh',
                    'Khoobsurat Stree 2',
                    'Satranga Animal',
                    'Pehle Bhi Main Animal',
                    'O Maahi Dunki',
                    'Tum Hi Ho Aashiqui 2',
                    'Kesariya Brahmastra',
                    'Apna Bana Le Bhediya'
                ]
            },
            { 
                id: 'kannada', 
                title: 'Kannada & Sandalwood Beats', 
                query: 'Kannada hits',
                limitPerQuery: 1,
                curatedQueries: [
                    'Salaar Sooreede',
                    'Kantara Singara Siriye',
                    'Toofan KGF 2',
                    'Mehabooba KGF 2',
                    'Premada Oorali Title Song'
                ]
            },
            { 
                id: 'malayalam', 
                title: 'Malayalam Melodies', 
                query: 'Malayalam hits',
                limitPerQuery: 1,
                curatedQueries: [
                    'Illuminati Aavesham',
                    'Jaada Aavesham',
                    'Armadham Aavesham',
                    'Kalyani Remix',
                    'Minnalvala Narivetta'
                ]
            },
            { 
                id: 'punjabi', 
                title: 'Punjabi Beats & Bhangra', 
                query: 'Punjabi hits',
                limitPerQuery: 1,
                curatedQueries: [
                    'Tauba Tauba Bad Newz',
                    'Winning Speech Karan Aujla',
                    'Softly Karan Aujla',
                    'Admiring You Karan Aujla',
                    'White Brown Black Avvy Sra'
                ]
            }
        ];

        let fallbackCatalog = [];
        try {
            fallbackCatalog = require('../services/catalog.fallback.json');
        } catch (e) {
            console.warn('Fallback catalog notice:', e.message);
        }

        const categories = await Promise.all(
            curatedList.map(async (cat) => {
                let tracks = [];
                try {
                    let saavnTracks = [];
                    if (cat.curatedQueries && Array.isArray(cat.curatedQueries)) {
                        const batchResults = await Promise.all(
                            cat.curatedQueries.map(q => jioSaavnService.searchSongs(q, 1).then(r => r[0]).catch(() => null))
                        );
                        saavnTracks = batchResults.filter(Boolean);
                    } else {
                        saavnTracks = await jioSaavnService.searchSongs(cat.query, 16);
                    }

                    if (saavnTracks && saavnTracks.length > 0) {
                        const seen = new Set();
                        tracks = saavnTracks.filter((t) => {
                            if (!t || !t.title) return false;
                            const clean = t.title.toLowerCase().replace(/\s*\(from[^)]*\)/i, '').replace(/[^a-z0-9]/g, '');
                            if (seen.has(clean)) return false;
                            seen.add(clean);
                            return true;
                        });
                    }
                } catch (e) {
                    console.warn(`[Catalog] Fetch error for ${cat.id}:`, e.message);
                }

                // If live search returned fewer than 3 tracks, seamlessly use the verified fallback catalog
                if (!tracks || tracks.length < 3) {
                    const fallbackCat = fallbackCatalog.find(f => f.id === cat.id);
                    if (fallbackCat && Array.isArray(fallbackCat.tracks) && fallbackCat.tracks.length > 0) {
                        tracks = fallbackCat.tracks;
                    }
                }

                return {
                    id: cat.id,
                    title: cat.title,
                    query: cat.query,
                    tracks
                };
            })
        );

        const populated = categories.filter((c) => c.tracks && c.tracks.length > 0);
        indianCategoriesCache = populated;
        indianCategoriesCacheTime = Date.now();

        return res.status(200).json({
            message: "Indian music categories fetched successfully",
            categories: populated
        });
    } catch (error) {
        console.error("Error in getIndianCategories:", error);
        return res.status(500).json({ message: "Failed to fetch Indian categories", error: error.message });
    }
}

async function searchMusic(req, res) {
    try {
        const query = typeof req.query.q === 'string' ? req.query.q.trim().substring(0, 100) : '';
        if (!query) {
            return res.status(200).json({ musics: [], albums: [], artists: [] });
        }

        // Escape regex special characters to prevent ReDoS and regex injection attacks
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedQuery, "i");

        // Concurrently query local DB, JioSaavn (Indian/global hits), Audius, and iTunes with resilience
        const [
            localMusicsRes,
            albumsRes,
            artistsRes,
            saavnSongsRes,
            saavnAlbumsRes,
            saavnArtistsRes,
            audiusTracksRes,
            itunesSongsRes
        ] = await Promise.allSettled([
            musicModel.find({ title: regex }).populate("artist", "username email").populate("album", "title coverImage"),
            albumModel.find({ title: regex }).populate("artist", "username email").populate("musics"),
            userModel.find({ username: regex, role: "artist" }).select("username email role"),
            jioSaavnService.searchSongs(query, 25),
            jioSaavnService.searchAlbums(query, 10),
            jioSaavnService.searchArtists(query, 10),
            audiusService.searchTracks(query, 15),
            iTunesService.searchSongs(query, 15)
        ]);

        const localMusics = localMusicsRes.status === 'fulfilled' ? localMusicsRes.value : [];
        const localAlbums = albumsRes.status === 'fulfilled' ? albumsRes.value : [];
        const localArtists = artistsRes.status === 'fulfilled' ? artistsRes.value : [];
        const saavnSongs = saavnSongsRes.status === 'fulfilled' ? saavnSongsRes.value : [];
        const saavnAlbums = saavnAlbumsRes.status === 'fulfilled' ? saavnAlbumsRes.value : [];
        const saavnArtists = saavnArtistsRes.status === 'fulfilled' ? saavnArtistsRes.value : [];
        const audiusTracks = audiusTracksRes.status === 'fulfilled' ? audiusTracksRes.value : [];
        const itunesSongs = itunesSongsRes.status === 'fulfilled' ? itunesSongsRes.value : [];

        // Combine tracks prioritizing Local -> Curated Homescreen Catalog -> JioSaavn -> Audius -> iTunes
        const combinedMusics = [...localMusics];
        const seenTrackKeys = new Set(
            localMusics.map(m => String(m.externalId || m._id).toLowerCase())
        );

        // Curated homescreen tracks matching query (e.g. Telugu, Hindi, title, artist)
        try {
            const fallbackCatalog = require('../services/catalog.fallback.json');
            for (const cat of fallbackCatalog) {
                if (Array.isArray(cat.tracks)) {
                    for (const t of cat.tracks) {
                        const titleMatch = t.title && regex.test(t.title);
                        const artistMatch = (t.artistName || t.artist?.name) && regex.test(t.artistName || t.artist?.name);
                        const albumMatch = t.album?.title && regex.test(t.album.title);
                        const catMatch = (cat.id && regex.test(cat.id)) || (cat.title && regex.test(cat.title));
                        if (titleMatch || artistMatch || albumMatch || catMatch) {
                            const key = String(t.externalId || t.id).toLowerCase();
                            if (!seenTrackKeys.has(key)) {
                                seenTrackKeys.add(key);
                                combinedMusics.push(t);
                            }
                        }
                    }
                }
            }
        } catch (e) {}

        for (const track of saavnSongs) {
            const key = String(track.externalId || track.id).toLowerCase();
            if (!seenTrackKeys.has(key)) {
                seenTrackKeys.add(key);
                combinedMusics.push(track);
            }
        }

        for (const track of audiusTracks) {
            const key = String(track.externalId || track.id).toLowerCase();
            if (!seenTrackKeys.has(key)) {
                seenTrackKeys.add(key);
                combinedMusics.push(track);
            }
        }

        for (const track of itunesSongs) {
            const key = String(track.externalId || track.id).toLowerCase();
            if (!seenTrackKeys.has(key)) {
                seenTrackKeys.add(key);
                combinedMusics.push(track);
            }
        }

        // Combine Albums (Local + JioSaavn)
        const combinedAlbums = [...localAlbums];
        const seenAlbumKeys = new Set(
            localAlbums.map(a => String(a.externalId || a._id).toLowerCase())
        );
        for (const alb of saavnAlbums) {
            const key = String(alb.externalId || alb.id).toLowerCase();
            if (!seenAlbumKeys.has(key)) {
                seenAlbumKeys.add(key);
                combinedAlbums.push(alb);
            }
        }

        // Combine Artists (Local + JioSaavn)
        const combinedArtists = [...localArtists];
        const seenArtistKeys = new Set(
            localArtists.map(a => (a.username || a.name || '').toLowerCase())
        );
        for (const art of saavnArtists) {
            const key = (art.username || art.name || '').toLowerCase();
            if (!seenArtistKeys.has(key)) {
                seenArtistKeys.add(key);
                combinedArtists.push(art);
            }
        }

        return res.status(200).json({
            message: "Search completed",
            musics: combinedMusics,
            albums: combinedAlbums,
            artists: combinedArtists
        });
    } catch (error) {
        console.error("Error in searchMusic:", error);
        return res.status(500).json({ message: "Search failed", error: error.message });
    }
}

async function toggleLikeSong(req, res) {
    try {
        const { songId } = req.params;
        const user = await userModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        let targetTrackId = null;

        // Check if songId is a valid 24-character hexadecimal MongoDB ObjectId
        const isValidObjectId = mongoose.Types.ObjectId.isValid(songId) && String(new mongoose.Types.ObjectId(songId)) === songId;
        if (isValidObjectId) {
            const existingTrack = await musicModel.findById(songId);
            if (existingTrack) {
                targetTrackId = existingTrack._id;
            }
        }

        // If not found as local ObjectId, check if it's an external track (ext_audius_, ext_saavn_, ext_itunes_ or externalId in body)
        if (!targetTrackId) {
            const extId = String(req.body?.externalId || songId).replace(/^ext_(audius|saavn|itunes)_/, '').trim();
            // Check if already cached in musicModel
            let cached = await musicModel.findOne({ externalId: extId });
            if (!cached) {
                // Upsert external track stub in MongoDB for permanent user liking and playback
                const { title, uri, artistName, coverImage, duration, source } = req.body || {};
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
            targetTrackId = cached._id;
        }

        const index = user.likedSongs.findIndex(id => id.toString() === targetTrackId.toString());
        let isLiked = false;
        if (index > -1) {
            user.likedSongs.splice(index, 1);
            isLiked = false;
        } else {
            user.likedSongs.push(targetTrackId);
            isLiked = true;
        }

        await user.save();
        return res.status(200).json({
            message: isLiked ? "Added to Liked Songs" : "Removed from Liked Songs",
            isLiked,
            songId,
            targetTrackId: targetTrackId.toString(),
            likedSongs: user.likedSongs
        });
    } catch (error) {
        console.error("Error in toggleLikeSong:", error);
        return res.status(500).json({ message: "Failed to toggle like", error: error.message });
    }
}

async function getLikedSongs(req, res) {
    try {
        const user = await userModel.findById(req.user.id).populate({
            path: "likedSongs",
            populate: [
                { path: "artist", select: "username email" },
                { path: "album", select: "title coverImage" }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            message: "Liked songs fetched successfully",
            tracks: user.likedSongs || []
        });
    } catch (error) {
        console.error("Error in getLikedSongs:", error);
        return res.status(500).json({ message: "Failed to fetch liked songs", error: error.message });
    }
}

// ==========================================
// RBAC: ARTIST CATALOG & RESOURCE OWNERSHIP
// ==========================================

async function getArtistTracks(req, res) {
    try {
        const tracks = await musicModel.find({ artist: req.user.id })
            .populate("album", "title coverImage");
        return res.status(200).json({ tracks });
    } catch (error) {
        console.error("Error in getArtistTracks:", error);
        return res.status(500).json({ message: "Failed to fetch artist tracks", error: error.message });
    }
}

async function getArtistAlbums(req, res) {
    try {
        const albums = await albumModel.find({ artist: req.user.id })
            .populate("musics");
        return res.status(200).json({ albums });
    } catch (error) {
        console.error("Error in getArtistAlbums:", error);
        return res.status(500).json({ message: "Failed to fetch artist albums", error: error.message });
    }
}

async function deleteMusic(req, res) {
    try {
        const { musicId } = req.params;
        let music = null;
        if (mongoose.Types.ObjectId.isValid(musicId) && String(new mongoose.Types.ObjectId(musicId)) === musicId) {
            music = await musicModel.findById(musicId);
        } else {
            const extId = String(musicId).replace(/^ext_audius_/, '');
            music = await musicModel.findOne({ externalId: extId });
        }

        if (!music) {
            return res.status(404).json({ message: "Track not found" });
        }

        // Strict Resource Ownership & Admin Check
        const isOwner = music.artist && music.artist.toString() === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Forbidden: You do not own this track and cannot delete it." });
        }

        await musicModel.findByIdAndDelete(music._id);
        // Remove from albums
        await albumModel.updateMany({ musics: music._id }, { $pull: { musics: music._id } });
        // Remove from user likedSongs
        await userModel.updateMany({ likedSongs: music._id }, { $pull: { likedSongs: music._id } });

        return res.status(200).json({ message: "Track deleted successfully", musicId });
    } catch (error) {
        console.error("Error in deleteMusic:", error);
        return res.status(500).json({ message: "Failed to delete track", error: error.message });
    }
}

async function deleteAlbum(req, res) {
    try {
        const { albumId } = req.params;
        const album = await albumModel.findById(albumId);

        if (!album) {
            return res.status(404).json({ message: "Album not found" });
        }

        // Strict Resource Ownership & Admin Check
        const isOwner = album.artist && album.artist.toString() === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Forbidden: You do not own this album and cannot delete it." });
        }

        await albumModel.findByIdAndDelete(albumId);
        return res.status(200).json({ message: "Album deleted successfully", albumId });
    } catch (error) {
        console.error("Error in deleteAlbum:", error);
        return res.status(500).json({ message: "Failed to delete album", error: error.message });
    }
}

// ==========================================
// RBAC: ADMINISTRATOR OPERATIONS
// ==========================================

async function getAdminStats(req, res) {
    try {
        const [userCount, artistCount, trackCount, albumCount, users, tracks] = await Promise.all([
            userModel.countDocuments({ role: "user" }),
            userModel.countDocuments({ role: "artist" }),
            musicModel.countDocuments(),
            albumModel.countDocuments(),
            userModel.find().select("-password").sort({ createdAt: -1 }).limit(50),
            musicModel.find().populate("artist", "username email role").populate("album", "title").sort({ createdAt: -1 }).limit(50)
        ]);

        return res.status(200).json({
            stats: {
                totalUsers: userCount,
                totalArtists: artistCount,
                totalTracks: trackCount,
                totalAlbums: albumCount
            },
            users,
            tracks
        });
    } catch (error) {
        console.error("Error in getAdminStats:", error);
        return res.status(500).json({ message: "Failed to fetch admin stats", error: error.message });
    }
}

async function deleteUserByAdmin(req, res) {
    try {
        const { userId } = req.params;
        if (userId === req.user.id) {
            return res.status(400).json({ message: "Admin cannot delete own account" });
        }
        await userModel.findByIdAndDelete(userId);
        return res.status(200).json({ message: "User deleted successfully", userId });
    } catch (error) {
        console.error("Error in deleteUserByAdmin:", error);
        return res.status(500).json({ message: "Failed to delete user", error: error.message });
    }
}

async function getLyrics(req, res) {
    try {
        const track = typeof req.query.track === 'string' ? req.query.track.trim() : '';
        const artist = typeof req.query.artist === 'string' ? req.query.artist.trim() : '';
        const duration = parseFloat(req.query.duration) || 0;
        const language = typeof req.query.language === 'string' ? req.query.language.trim() : '';

        if (!track) {
            return res.status(400).json({ success: false, message: "track parameter is required" });
        }

        const result = await lyricsService.getLyrics(track, artist, duration, language);
        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("Error in getLyrics:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch lyrics", error: error.message });
    }
}

async function warmCategoriesCache() {
    try {
        if (!indianCategoriesCache) {
            console.log('⚡ Pre-warming Indian music categories cache...');
            const fakeReq = {};
            const fakeRes = { status: () => ({ json: () => {} }) };
            await getIndianCategories(fakeReq, fakeRes);
            console.log('✅ Categories cache pre-warmed successfully!');
        }
    } catch (e) {
        console.warn('Cache pre-warm notice:', e.message);
    }
}

module.exports = {
    createMusic,
    createAlbum,
    getAllMusics,
    getAllAlbums,
    getAlbumById,
    searchMusic,
    toggleLikeSong,
    getLikedSongs,
    getArtistTracks,
    getArtistAlbums,
    deleteMusic,
    deleteAlbum,
    getAdminStats,
    deleteUserByAdmin,
    getIndianCategories,
    getLyrics,
    warmCategoriesCache
};