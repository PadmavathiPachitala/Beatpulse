/**
 * Audius API Music Service
 * Provides legal, free, and authenticated streaming access to Indian music catalogs
 * (Bollywood/Hindi, Telugu, Tamil, Punjabi, Malayalam, Classical, Indie).
 */

const APP_NAME = 'BeatPulse_SpotifyClone';
const FALLBACK_GATEWAYS = [
    'https://api.audius.co',
    'https://discoveryprovider.audius.co',
    'https://audius-discovery-1.cultur3stake.com',
    'https://discoveryprovider2.audius.co'
];

const queryCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let discoveryNodes = [];
let lastNodeFetch = 0;

/**
 * Resolves a list of reliable, active Audius API gateways
 */
async function getDiscoveryNodes() {
    const now = Date.now();
    if (discoveryNodes.length > 0 && now - lastNodeFetch < 15 * 60 * 1000) {
        return discoveryNodes;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('https://api.audius.co', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.data) && data.data.length > 0) {
                discoveryNodes = data.data;
                lastNodeFetch = now;
                return discoveryNodes;
            }
        }
    } catch (err) {
        // Fallback below
    }

    discoveryNodes = FALLBACK_GATEWAYS;
    lastNodeFetch = now;
    return discoveryNodes;
}

/**
 * Pick an active gateway with round-robin / fallback
 */
let nodeIndex = 0;
async function getActiveGateway() {
    const nodes = await getDiscoveryNodes();
    nodeIndex = (nodeIndex + 1) % nodes.length;
    return nodes[nodeIndex];
}

/**
 * Normalizes an Audius track into the BeatPulse track format
 */
function normalizeAudiusTrack(track, gateway) {
    if (!track) return null;

    const trackId = track.id || track.track_id;
    if (!trackId) return null;

    const streamUrl = `${gateway}/v1/tracks/${trackId}/stream?app_name=${APP_NAME}`;
    
    // Choose best available artwork
    const artwork = track.artwork?.['480x480'] 
        || track.artwork?.['150x150'] 
        || track.artwork?.['1000x1000']
        || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop';

    const artistName = track.user?.name || track.user?.handle || 'Indian Artist';
    const artistId = track.user?.id || `artist_${track.user_id || 'unknown'}`;
    const durationSec = typeof track.duration === 'number' ? track.duration : 180;

    return {
        _id: `ext_audius_${trackId}`,
        id: `ext_audius_${trackId}`,
        externalId: String(trackId),
        source: 'audius',
        isExternal: true,
        title: track.title || 'Untitled Indian Track',
        name: track.title || 'Untitled Indian Track',
        uri: streamUrl,
        audioUrl: streamUrl,
        coverImage: artwork,
        duration: durationSec,
        duration_ms: durationSec * 1000,
        playsCount: track.play_count || 0,
        genre: track.genre || 'Indian Music',
        artist: {
            _id: `ext_artist_${artistId}`,
            id: `ext_artist_${artistId}`,
            username: artistName,
            name: artistName,
            handle: track.user?.handle || ''
        },
        album: {
            _id: `ext_album_${trackId}`,
            id: `ext_album_${trackId}`,
            title: track.genre ? `${track.genre} Indian Collection` : 'Indian Single',
            coverImage: artwork
        }
    };
}

/**
 * Search tracks with automatic retry on alternative discovery node
 */
async function searchTracks(query, limit = 15) {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    const cacheKey = `search_${trimmed.toLowerCase()}_${limit}`;
    const cached = queryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return cached.data;
    }

    const nodes = await getDiscoveryNodes();
    // Try primary gateway and fallback node if 429
    for (let attempt = 0; attempt < Math.min(3, nodes.length); attempt++) {
        const gateway = nodes[(nodeIndex + attempt) % nodes.length];
        try {
            const url = `${gateway}/v1/tracks/search?query=${encodeURIComponent(trimmed)}&limit=${limit}&app_name=${APP_NAME}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.status === 429) {
                // Rate limited on this specific node, attempt next node
                continue;
            }

            if (!res.ok) {
                continue;
            }

            const data = await res.json();
            const rawTracks = data.data || [];
            const normalized = rawTracks
                .filter(t => t.is_streamable !== false && !t.is_stream_gated)
                .map(t => normalizeAudiusTrack(t, gateway))
                .filter(Boolean);

            queryCache.set(cacheKey, { timestamp: Date.now(), data: normalized });
            return normalized;
        } catch (err) {
            // Node failed or timed out, try next node
            continue;
        }
    }

    return [];
}

/**
 * Predefined Curated Indian Music Categories for Home & Discovery
 */
const INDIAN_CATEGORIES = [
    { id: 'bollywood', title: 'Bollywood & Hindi Hits', query: 'Bollywood' },
    { id: 'telugu', title: 'Telugu Hits & Vibes', query: 'Telugu' },
    { id: 'tamil', title: 'Tamil Melodies & Waves', query: 'Tamil' },
    { id: 'kannada', title: 'Kannada & Sandalwood Beats', query: 'Sandalwood' },
    { id: 'punjabi', title: 'Punjabi Beats & Bhangra', query: 'Punjabi' },
    { id: 'malayalam', title: 'Malayalam Tracks', query: 'Malayalam' },
    { id: 'classical', title: 'Indian Classical & Sitar', query: 'Sitar' },
    { id: 'desi_hiphop', title: 'Desi Hip-Hop & Indie', query: 'Desi' },
    { id: 'devotional', title: 'Devotional & Spiritual', query: 'Bhajan' }
];

/**
 * Fetches all curated Indian categories with normalized tracks
 */
async function getIndianCategories() {
    const cacheKey = 'indian_categories_catalog';
    const cached = queryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return cached.data;
    }

    const populated = [];
    // Batch in pairs to maintain rapid loading while preventing concurrency burst limits
    for (let i = 0; i < INDIAN_CATEGORIES.length; i += 2) {
        const batch = INDIAN_CATEGORIES.slice(i, i + 2);
        const batchResults = await Promise.all(
            batch.map(async (cat) => {
                const tracks = await searchTracks(cat.query, 8);
                return {
                    id: cat.id,
                    title: cat.title,
                    query: cat.query,
                    tracks
                };
            })
        );
        for (const res of batchResults) {
            if (res.tracks && res.tracks.length > 0) {
                populated.push(res);
            }
        }
    }

    queryCache.set(cacheKey, { timestamp: Date.now(), data: populated });
    return populated;
}

module.exports = {
    searchTracks,
    getIndianCategories,
    normalizeAudiusTrack,
    getActiveGateway
};
