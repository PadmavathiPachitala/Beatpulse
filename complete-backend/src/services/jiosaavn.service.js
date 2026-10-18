/**
 * JioSaavn Music Service
 * Fetches millions of Indian (Bollywood, Telugu, Tamil, Punjabi, Malayalam, etc.)
 * and international tracks with full-length 320/160kbps AAC audio streams and 500x500 artwork.
 */

const CryptoJS = require('crypto-js');

const SAAVN_BASE_URL = 'https://www.jiosaavn.com/api.php';
const DES_KEY = '38346591';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
};

// In-memory query cache with 24-hour TTL
const searchCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function decodeHtmlEntities(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

function decryptMediaUrl(encryptedUrl) {
    if (!encryptedUrl || typeof encryptedUrl !== 'string') return null;
    try {
        const key = CryptoJS.enc.Utf8.parse(DES_KEY);
        const decrypted = CryptoJS.DES.decrypt(
            { ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl) },
            key,
            { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
        );
        const rawUrl = decrypted.toString(CryptoJS.enc.Utf8);
        if (!rawUrl || !rawUrl.startsWith('http')) return null;

        // Upgrade stream quality to 160kbps / 320kbps if applicable
        return rawUrl.replace('_96.mp4', '_160.mp4');
    } catch (err) {
        return null;
    }
}

function upgradeArtworkUrl(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') {
        return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop';
    }
    return imageUrl.replace(/150x150\.jpg/g, '500x500.jpg');
}

function normalizeSong(song) {
    if (!song || !song.id) return null;

    const streamUrl = decryptMediaUrl(song.more_info?.encrypted_media_url);
    if (!streamUrl) return null; // Only return tracks with valid playable streams

    const title = decodeHtmlEntities(song.title || 'Untitled Track');
    const artistName = decodeHtmlEntities(
        song.more_info?.artistMap?.primary_artists?.[0]?.name ||
        song.subtitle ||
        song.more_info?.singers ||
        'Indian Artist'
    );
    const albumTitle = decodeHtmlEntities(song.more_info?.album || title);
    const coverUrl = upgradeArtworkUrl(song.image);
    const duration = parseInt(song.more_info?.duration, 10) || 180;

    return {
        _id: `ext_saavn_${song.id}`,
        id: `ext_saavn_${song.id}`,
        externalId: String(song.id),
        source: 'saavn',
        isExternal: true,
        title,
        name: title,
        uri: streamUrl,
        audioUrl: streamUrl,
        coverImage: coverUrl,
        duration,
        duration_ms: duration * 1000,
        playsCount: parseInt(song.play_count, 10) || 0,
        language: song.language || 'Indian',
        artist: {
            _id: `ext_saavn_artist_${song.more_info?.artistMap?.primary_artists?.[0]?.id || song.id}`,
            username: artistName,
            name: artistName,
            role: 'artist'
        },
        artistName,
        album: {
            _id: `ext_saavn_album_${song.more_info?.album_id || song.id}`,
            title: albumTitle,
            coverImage: coverUrl
        }
    };
}

class JioSaavnService {
    async searchSongs(query, limit = 20) {
        const cacheKey = `songs_${query.toLowerCase()}_${limit}`;
        const cached = searchCache.get(cacheKey);
        if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
            return cached.data;
        }

        try {
            const url = `${SAAVN_BASE_URL}?__call=search.getResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&q=${encodeURIComponent(query)}&p=1&n=${limit}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) return [];

            const data = await res.json();
            const results = (data && Array.isArray(data.results)) ? data.results : [];
            const normalized = results.map(normalizeSong).filter(Boolean);

            searchCache.set(cacheKey, { data: normalized, time: Date.now() });
            return normalized;
        } catch (error) {
            console.warn(`[JioSaavn] Search failed for "${query}":`, error.message);
            return [];
        }
    }

    async searchAlbums(query, limit = 10) {
        const cacheKey = `albums_${query.toLowerCase()}_${limit}`;
        const cached = searchCache.get(cacheKey);
        if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
            return cached.data;
        }

        try {
            const url = `${SAAVN_BASE_URL}?__call=search.getAlbumResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&q=${encodeURIComponent(query)}&p=1&n=${limit}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) return [];

            const data = await res.json();
            const results = (data && Array.isArray(data.results)) ? data.results : [];

            const normalized = results.map(album => {
                if (!album || !album.id) return null;
                const title = decodeHtmlEntities(album.title || 'Untitled Album');
                const artistName = decodeHtmlEntities(album.artist || album.primary_artists || 'Artist');
                const coverImage = upgradeArtworkUrl(album.image);
                return {
                    _id: `ext_saavn_album_${album.id}`,
                    id: `ext_saavn_album_${album.id}`,
                    externalId: String(album.id),
                    source: 'saavn',
                    isExternal: true,
                    title,
                    coverImage,
                    year: album.year,
                    artist: {
                        _id: `ext_saavn_artist_${album.id}`,
                        username: artistName,
                        role: 'artist'
                    },
                    musics: []
                };
            }).filter(Boolean);

            searchCache.set(cacheKey, { data: normalized, time: Date.now() });
            return normalized;
        } catch (error) {
            return [];
        }
    }

    async searchArtists(query, limit = 10) {
        const cacheKey = `artists_${query.toLowerCase()}_${limit}`;
        const cached = searchCache.get(cacheKey);
        if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
            return cached.data;
        }

        try {
            const url = `${SAAVN_BASE_URL}?__call=search.getArtistResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&q=${encodeURIComponent(query)}&p=1&n=${limit}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) return [];

            const data = await res.json();
            const results = (data && Array.isArray(data.results)) ? data.results : [];

            const normalized = results.map(artist => {
                if (!artist || !artist.id) return null;
                const name = decodeHtmlEntities(artist.name || 'Artist');
                let image = artist.image || '';
                if (image) image = image.replace(/50x50\.jpg/g, '500x500.jpg');
                return {
                    _id: `ext_saavn_artist_${artist.id}`,
                    id: `ext_saavn_artist_${artist.id}`,
                    externalId: String(artist.id),
                    source: 'saavn',
                    isExternal: true,
                    username: name,
                    name,
                    role: 'artist',
                    image: image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500'
                };
            }).filter(Boolean);

            searchCache.set(cacheKey, { data: normalized, time: Date.now() });
            return normalized;
        } catch (error) {
            return [];
        }
    }

    async getAlbumDetails(albumId) {
        try {
            const url = `${SAAVN_BASE_URL}?__call=content.getAlbumDetails&_format=json&_marker=0&api_version=4&ctx=web6dot0&albumid=${encodeURIComponent(albumId)}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) return null;

            const data = await res.json();
            if (!data || !data.id) return null;

            const title = decodeHtmlEntities(data.title || 'Untitled Album');
            const artistName = decodeHtmlEntities(data.primary_artists || data.artist || 'Artist');
            const coverImage = upgradeArtworkUrl(data.image);
            const rawSongs = Array.isArray(data.list) ? data.list : [];
            const songs = rawSongs.map(normalizeSong).filter(Boolean);

            return {
                _id: `ext_saavn_album_${data.id}`,
                id: `ext_saavn_album_${data.id}`,
                externalId: String(data.id),
                source: 'saavn',
                isExternal: true,
                title,
                coverImage,
                artist: {
                    _id: `ext_saavn_artist_${data.id}`,
                    username: artistName,
                    name: artistName,
                    role: 'artist'
                },
                musics: songs
            };
        } catch (error) {
            console.warn(`[JioSaavn] Failed to fetch album ${albumId}:`, error.message);
            return null;
        }
    }
}

module.exports = new JioSaavnService();
