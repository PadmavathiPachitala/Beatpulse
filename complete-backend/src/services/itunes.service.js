/**
 * iTunes / Apple Music Search Service
 * Provides instantaneous official search coverage for every global and international track
 * with 600x600 album artwork and official audio streams.
 */

const ITUNES_BASE = 'https://itunes.apple.com';
const itunesCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function upgradeArtwork(url) {
    if (!url || typeof url !== 'string') {
        return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop';
    }
    return url.replace(/100x100bb\.jpg/g, '600x600bb.jpg');
}

class ITunesService {
    async searchSongs(query, limit = 15) {
        const cacheKey = `itunes_songs_${query.toLowerCase()}_${limit}`;
        const cached = itunesCache.get(cacheKey);
        if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
            return cached.data;
        }

        try {
            const url = `${ITUNES_BASE}/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) return [];

            const data = await res.json();
            const results = (data && Array.isArray(data.results)) ? data.results : [];

            const normalized = results.map(track => {
                if (!track || !track.trackId || !track.previewUrl) return null;
                const title = track.trackName || 'Untitled Track';
                const artistName = track.artistName || 'Artist';
                const coverUrl = upgradeArtwork(track.artworkUrl100);
                const duration = Math.round((track.trackTimeMillis || 180000) / 1000);

                return {
                    _id: `ext_itunes_${track.trackId}`,
                    id: `ext_itunes_${track.trackId}`,
                    externalId: String(track.trackId),
                    source: 'itunes',
                    isExternal: true,
                    title,
                    name: title,
                    uri: track.previewUrl,
                    audioUrl: track.previewUrl,
                    coverImage: coverUrl,
                    duration,
                    duration_ms: duration * 1000,
                    playsCount: 0,
                    artist: {
                        _id: `ext_itunes_artist_${track.artistId || track.trackId}`,
                        username: artistName,
                        name: artistName,
                        role: 'artist'
                    },
                    artistName,
                    album: {
                        _id: `ext_itunes_album_${track.collectionId || track.trackId}`,
                        title: track.collectionName || title,
                        coverImage: coverUrl
                    }
                };
            }).filter(Boolean);

            itunesCache.set(cacheKey, { data: normalized, time: Date.now() });
            return normalized;
        } catch (error) {
            return [];
        }
    }
}

module.exports = new ITunesService();
