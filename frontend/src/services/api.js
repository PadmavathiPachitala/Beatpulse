import axios from 'axios';
import fallbackCategories from './catalog.fallback.json';

// Base API configuration
function getSanitizedApiBaseUrl() {
  const envUrl = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL;
  let raw = (envUrl && envUrl.trim() !== '/api')
    ? envUrl.trim()
    : (process.env.REACT_APP_BACK_URI ? process.env.REACT_APP_BACK_URI.trim() : 'https://beatpulse-fsu7.onrender.com');

  // Strip trailing whitespace, carriage returns, and newlines
  raw = raw.replace(/[\r\n\s]+$/, '');

  if (raw.startsWith('http')) {
    // Strip trailing slashes and any trailing /api so we cleanly append a single /api
    raw = raw.replace(/\/+api\/?$/, '').replace(/\/+$/, '') + '/api';
  }
  return raw;
}
const API_BASE_URL = getSanitizedApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
});

/**
 * Normalizes backend song models to the shape expected by Spotify UI components
 */
export function adaptTrack(music) {
  if (!music) return null;
  const id = music._id || music.id || '';
  const title = music.title || 'Untitled Track';
  
  // Extract artist information
  let artistName = music.artistName || 'Artist';
  let artistId = '';
  if (typeof music.artist === 'object' && music.artist !== null) {
    artistName = music.artist.username || music.artist.name || music.artistName || artistName;
    artistId = music.artist._id || music.artist.id || '';
  } else if (typeof music.artist === 'string') {
    artistId = music.artist;
  }

  // Extract album information
  let albumTitle = 'Single';
  let albumId = '';
  let albumCover = null;
  if (typeof music.album === 'object' && music.album !== null) {
    albumTitle = music.album.title || albumTitle;
    albumId = music.album._id || music.album.id || '';
    albumCover = music.album.coverImage || null;
  } else if (typeof music.album === 'string') {
    albumId = music.album;
  }

  const fallbackImage = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop';
  const coverUrl = music.coverImage || albumCover || fallbackImage;
  const durationSec = typeof music.duration === 'number' ? music.duration : 180;

  return {
    id,
    _id: id,
    name: title,
    title,
    artistName,
    uri: music.uri || '',
    type: 'track',
    duration: durationSec,
    duration_ms: durationSec * 1000,
    explicit: Boolean(music.explicit),
    playsCount: music.playsCount || 0,
    coverImage: coverUrl,
    artists: [
      {
        id: artistId,
        name: artistName
      }
    ],
    album: {
      id: albumId,
      name: albumTitle,
      title: albumTitle,
      images: [
        { url: coverUrl }
      ]
    },
    images: [
      { url: coverUrl }
    ]
  };
}

/**
 * Normalizes backend album models to the shape expected by Spotify UI components
 */
export function adaptAlbum(album) {
  if (!album) return null;
  const id = album._id || album.id || '';
  const title = album.title || 'Untitled Album';

  let artistName = 'Artist';
  let artistId = '';
  if (typeof album.artist === 'object' && album.artist !== null) {
    artistName = album.artist.username || album.artist.name || artistName;
    artistId = album.artist._id || album.artist.id || '';
  }

  const fallbackImage = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop';
  const coverUrl = album.coverImage || fallbackImage;

  const rawMusics = Array.isArray(album.musics) ? album.musics : [];
  const tracks = rawMusics.map(adaptTrack).filter(Boolean);

  return {
    id,
    _id: id,
    name: title,
    title,
    type: 'album',
    album_type: 'album',
    coverImage: coverUrl,
    description: `By ${artistName} • ${tracks.length} track${tracks.length === 1 ? '' : 's'}`,
    artists: [
      {
        id: artistId,
        name: artistName
      }
    ],
    images: [
      { url: coverUrl }
    ],
    tracks: {
      items: tracks,
      total: tracks.length
    },
    rawMusics: tracks,
    createdAt: album.createdAt,
    updatedAt: album.updatedAt
  };
}

/**
 * Normalizes backend artist models
 */
export function adaptArtist(artist) {
  if (!artist) return null;
  const id = artist._id || artist.id || '';
  const name = artist.username || artist.name || 'Artist';
  const coverUrl = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop';

  return {
    id,
    _id: id,
    name,
    type: 'artist',
    images: [
      { url: coverUrl }
    ]
  };
}

/**
 * Normalizes backend playlist models
 */
export function adaptPlaylist(playlist) {
  if (!playlist) return null;
  const id = playlist._id || playlist.id || '';
  const name = playlist.name || 'Untitled Playlist';
  const fallbackImage = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop';
  const coverUrl = playlist.coverImage || fallbackImage;

  const rawMusics = Array.isArray(playlist.musics) ? playlist.musics : [];
  const tracks = rawMusics.map(adaptTrack).filter(Boolean);

  let ownerName = 'You';
  let ownerId = '';
  if (playlist.user && typeof playlist.user === 'object') {
    ownerName = playlist.user.username || playlist.user.email || 'You';
    ownerId = playlist.user._id || playlist.user.id || '';
  } else if (playlist.user) {
    ownerId = playlist.user;
  }

  return {
    id,
    _id: id,
    name,
    title: name,
    type: 'playlist',
    description: playlist.description || `Created by ${ownerName} • ${tracks.length} track${tracks.length === 1 ? '' : 's'}`,
    coverImage: coverUrl,
    images: [
      { url: coverUrl }
    ],
    owner: {
      id: ownerId,
      display_name: ownerName
    },
    user: [
      {
        id: ownerId,
        display_name: ownerName
      }
    ],
    tracks: {
      items: tracks,
      total: tracks.length
    },
    rawMusics: tracks,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt
  };
}

/**
 * Normalizes Axios errors into a consistent structure
 */
function normalizeError(error) {
  if (axios.isCancel(error)) {
    return { isCancel: true, message: 'Request cancelled' };
  }
  const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
  const status = error.response?.status || 500;
  return { isCancel: false, message, status };
}

// ==========================================
// API SERVICE METHODS
// ==========================================

const clientSearchCache = new Map();
const SEARCH_CACHE_TTL = 5 * 60 * 1000;

// High-performance client catalog cache to eliminate page-switch lag
const clientCatalogCache = {
  categories: null,
  categoriesTime: 0,
  musics: null,
  musicsTime: 0,
  albums: null,
  albumsTime: 0,
};
const CATALOG_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export const musicService = {
  /**
   * Fetch complete song catalog (GET /api/music/)
   */
  async getMusics(cancelToken) {
    if (clientCatalogCache.musics && Date.now() - clientCatalogCache.musicsTime < CATALOG_CACHE_TTL) {
      return { success: true, musics: clientCatalogCache.musics };
    }
    try {
      const response = await Promise.race([
        apiClient.get('/music', { cancelToken }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Backend timeout')), 3500))
      ]);
      const rawMusics = response.data?.musics || [];
      const musics = rawMusics.map(adaptTrack).filter(Boolean);
      clientCatalogCache.musics = musics;
      clientCatalogCache.musicsTime = Date.now();
      return { success: true, musics };
    } catch (error) {
      const err = normalizeError(error);
      if (err.isCancel) throw error;
      return { success: false, musics: [], error: err.message };
    }
  },

  /**
   * Fetch complete album catalog (GET /api/music/albums)
   */
  async getAlbums(cancelToken) {
    if (clientCatalogCache.albums && Date.now() - clientCatalogCache.albumsTime < CATALOG_CACHE_TTL) {
      return { success: true, albums: clientCatalogCache.albums };
    }
    try {
      const response = await Promise.race([
        apiClient.get('/music/albums', { cancelToken }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Backend timeout')), 3500))
      ]);
      const rawAlbums = response.data?.albums || [];
      const albums = rawAlbums.map(adaptAlbum).filter(Boolean);
      clientCatalogCache.albums = albums;
      clientCatalogCache.albumsTime = Date.now();
      return { success: true, albums };
    } catch (error) {
      const err = normalizeError(error);
      if (err.isCancel) throw error;
      return { success: false, albums: [], error: err.message };
    }
  },

  /**
   * Fetch single album by ID with nested tracks (GET /api/music/albums/:albumId)
   */
  async getAlbumById(albumId, cancelToken) {
    try {
      const response = await apiClient.get(`/music/albums/${albumId}`, { cancelToken });
      const rawAlbum = response.data?.album;
      if (!rawAlbum) {
        return { success: false, album: null, error: 'Album not found' };
      }
      return { success: true, album: adaptAlbum(rawAlbum) };
    } catch (error) {
      const err = normalizeError(error);
      if (err.isCancel) throw error;
      return { success: false, album: null, error: err.message };
    }
  },

  /**
   * Search songs, albums, and artists (GET /api/music/search?q=...)
   */
  async search(query, cancelToken) {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      return { success: true, musics: [], albums: [], artists: [] };
    }

    const cacheKey = trimmed.toLowerCase();
    const cached = clientSearchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
      return cached.data;
    }

    // Helper: Find matches in verified curated homescreen catalog
    const qLower = trimmed.toLowerCase();
    const fallbackTracks = [];
    const seenTrackIds = new Set();
    for (const cat of fallbackCategories) {
      if (Array.isArray(cat.tracks)) {
        for (const t of cat.tracks) {
          const titleMatch = t.title && t.title.toLowerCase().includes(qLower);
          const artistMatch = (t.artistName || t.artist?.name) && (t.artistName || t.artist?.name).toLowerCase().includes(qLower);
          const albumMatch = t.album?.title && t.album.title.toLowerCase().includes(qLower);
          const catMatch = (cat.id && cat.id.toLowerCase().includes(qLower)) || (cat.title && cat.title.toLowerCase().includes(qLower));
          if (titleMatch || artistMatch || albumMatch || catMatch) {
            const adapted = adaptTrack(t);
            if (adapted && !seenTrackIds.has(adapted.id)) {
              seenTrackIds.add(adapted.id);
              fallbackTracks.push(adapted);
            }
          }
        }
      }
    }

    try {
      const response = await Promise.race([
        apiClient.get('/music/search', {
          params: { q: trimmed },
          cancelToken,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Search timeout')), 3500))
      ]);
      const data = response.data || {};
      const serverMusics = (data.musics || []).map(adaptTrack).filter(Boolean);

      // Deduplicate results to avoid repeating identical movie posters repeatedly
      const combined = [];
      const seenTitles = new Set();
      const seenMovies = new Set();
      const isSpecificMovieSearch = [...fallbackTracks, ...serverMusics].some(t => {
        const alb = (t.album?.title || '').toLowerCase();
        return alb && alb.includes(qLower);
      }) && !['songs', 'song', 'music', 'telugu', 'tamil', 'hindi', 'bollywood', 'malayalam', 'punjabi', 'kannada', 'hits'].includes(qLower);

      for (const t of [...fallbackTracks, ...serverMusics]) {
        const cleanTitle = (t.title || t.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const movieKey = (t.album?.title || t.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (isSpecificMovieSearch) {
          if (!seenTitles.has(cleanTitle)) {
            seenTitles.add(cleanTitle);
            combined.push(t);
          }
        } else {
          if (!seenTitles.has(cleanTitle) && !seenMovies.has(movieKey)) {
            seenTitles.add(cleanTitle);
            seenMovies.add(movieKey);
            combined.push(t);
          }
        }
      }

      const albums = (data.albums || []).map(adaptAlbum).filter(Boolean);
      const artists = (data.artists || []).map(adaptArtist).filter(Boolean);
      const result = { success: true, musics: combined, albums, artists };
      
      clientSearchCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      const err = normalizeError(error);
      if (err.isCancel) throw error;
      if (fallbackTracks.length > 0) {
        // Deduplicate fallback tracks as well
        const deduplicatedFallback = [];
        const seenMovies = new Set();
        const seenTitles = new Set();
        for (const t of fallbackTracks) {
          const cleanTitle = (t.title || t.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const movieKey = (t.album?.title || t.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!seenTitles.has(cleanTitle) && !seenMovies.has(movieKey)) {
            seenTitles.add(cleanTitle);
            seenMovies.add(movieKey);
            deduplicatedFallback.push(t);
          }
        }
        const result = { success: true, musics: deduplicatedFallback, albums: [], artists: [] };
        clientSearchCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
      return { success: false, musics: [], albums: [], artists: [], error: err.message };
    }
  },

  /**
   * Fetch lyrics for the currently playing track (GET /api/music/lyrics)
   */
  async getLyrics(track, artist, duration, cancelToken, language) {
    if (!track) {
      return { success: false, lyrics: null, message: "No track specified" };
    }
    try {
      const params = { track, artist, duration };
      if (language) params.language = language;
      const response = await apiClient.get('/music/lyrics', {
        params,
        cancelToken,
      });
      return { success: true, ...response.data };
    } catch (error) {
      const err = normalizeError(error);
      if (err.isCancel) throw error;
      return { success: false, lyrics: null, message: err.message || "Lyrics unavailable" };
    }
  },

  /**
   * Fetch authenticated artist's tracks (GET /api/music/artist/tracks)
   */
  async getArtistTracks(token, cancelToken) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.get('/music/artist/tracks', { headers, cancelToken });
      const rawTracks = response.data?.tracks || [];
      const tracks = rawTracks.map(adaptTrack).filter(Boolean);
      return { success: true, tracks };
    } catch (error) {
      const err = normalizeError(error);
      if (err.isCancel) throw error;
      return { success: false, tracks: [], error: err.message };
    }
  },

  /**
   * Fetch authenticated artist's albums (GET /api/music/artist/albums)
   */
  async getArtistAlbums(token, cancelToken) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.get('/music/artist/albums', { headers, cancelToken });
      const rawAlbums = response.data?.albums || [];
      const albums = rawAlbums.map(adaptAlbum).filter(Boolean);
      return { success: true, albums };
    } catch (error) {
      const err = normalizeError(error);
      if (err.isCancel) throw error;
      return { success: false, albums: [], error: err.message };
    }
  },

  /**
   * Fetch user's liked songs (GET /api/music/liked)
   */
  async getLikedSongs(token, cancelToken) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.get('/music/liked', { headers, cancelToken });
      const rawTracks = response.data?.tracks || [];
      const tracks = rawTracks.map(adaptTrack).filter(Boolean);
      return { success: true, tracks };
    } catch (error) {
      const err = normalizeError(error);
      if (err.isCancel) throw error;
      return { success: false, tracks: [], error: err.message };
    }
  },

  /**
   * Fetch curated Indian music categories (GET /api/music/indian/categories)
   * Falls back to verified catalog fallback matching the README showcase if backend is slow/unavailable
   */
  async getIndianCategories(cancelToken) {
    if (clientCatalogCache.categories && Date.now() - clientCatalogCache.categoriesTime < CATALOG_CACHE_TTL) {
      return { success: true, categories: clientCatalogCache.categories };
    }
    try {
      // 3.5s timeout race against sleeping or delayed cloud backend
      const response = await Promise.race([
        apiClient.get('/music/indian/categories', { cancelToken }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Backend timeout')), 3500))
      ]);
      const rawCategories = response.data?.categories || [];
      const categories = rawCategories.map(cat => ({
        ...cat,
        tracks: (cat.tracks || []).map(adaptTrack).filter(Boolean)
      }));

      // Validate that live backend returned genuine curated Telugu & Viral categories
      const hasRealCurated = categories.some(cat => 
        cat.id === 'telugu' && cat.tracks && cat.tracks.length >= 5
      );
      if (categories.length >= 4 && hasRealCurated) {
        clientCatalogCache.categories = categories;
        clientCatalogCache.categoriesTime = Date.now();
        return { success: true, categories };
      }
      throw new Error('Using verified curated fallback');
    } catch (error) {
      const err = normalizeError(error);
      if (err.isCancel) throw error;

      // Always return verified curated showcase matching README
      const fallbackAdapted = fallbackCategories.map(cat => ({
        ...cat,
        tracks: (cat.tracks || []).map(adaptTrack).filter(Boolean)
      }));
      clientCatalogCache.categories = fallbackAdapted;
      clientCatalogCache.categoriesTime = Date.now();
      return { success: true, categories: fallbackAdapted };
    }
  },

  /**
   * Toggle like/unlike on a song (POST /api/music/like/:songId)
   */
  async toggleLikeSong(songId, token, trackData = {}) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.post(`/music/like/${songId}`, trackData, { headers });
      return { 
        success: true, 
        isLiked: response.data?.isLiked, 
        likedSongs: response.data?.likedSongs,
        songId: response.data?.songId,
        targetTrackId: response.data?.targetTrackId
      };
    } catch (error) {
      const err = normalizeError(error);
      return { success: false, error: err.message };
    }
  },

  // ==========================================
  // PLAYLIST METHODS (Authenticated + Guest support)
  // ==========================================

  /**
   * Helper to get guest playlists from localStorage
   */
  getGuestPlaylists() {
    try {
      return JSON.parse(localStorage.getItem('beatpulse_guest_playlists') || '[]');
    } catch (e) {
      return [];
    }
  },

  /**
   * Helper to save guest playlists to localStorage
   */
  saveGuestPlaylists(playlists) {
    try {
      localStorage.setItem('beatpulse_guest_playlists', JSON.stringify(playlists));
    } catch (e) {}
  },

  /**
   * Create a new playlist (POST /api/playlist or guest localStorage)
   */
  async createPlaylist(name, description, token) {
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return { success: false, error: 'Playlist name is required' };
    }

    if (!token) {
      const guestList = this.getGuestPlaylists();
      const newGuestPl = {
        _id: `guest_pl_${Date.now()}`,
        id: `guest_pl_${Date.now()}`,
        name: trimmedName,
        description: (description || '').trim(),
        coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop',
        musics: [],
        createdAt: new Date().toISOString()
      };
      guestList.unshift(newGuestPl);
      this.saveGuestPlaylists(guestList);
      return { success: true, playlist: adaptPlaylist(newGuestPl) };
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await apiClient.post('/playlist', { name: trimmedName, description }, { headers });
      return { success: true, playlist: adaptPlaylist(response.data?.playlist) };
    } catch (error) {
      // Fallback to guest playlist if token is invalid
      const guestList = this.getGuestPlaylists();
      const newGuestPl = {
        _id: `guest_pl_${Date.now()}`,
        id: `guest_pl_${Date.now()}`,
        name: trimmedName,
        description: (description || '').trim(),
        coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop',
        musics: [],
        createdAt: new Date().toISOString()
      };
      guestList.unshift(newGuestPl);
      this.saveGuestPlaylists(guestList);
      return { success: true, playlist: adaptPlaylist(newGuestPl) };
    }
  },

  /**
   * Fetch current user's playlists (GET /api/playlist + guest localStorage)
   */
  async getUserPlaylists(token, cancelToken) {
    const guestPlaylists = this.getGuestPlaylists().map(adaptPlaylist).filter(Boolean);

    if (!token) {
      return { success: true, playlists: guestPlaylists };
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await apiClient.get('/playlist', { headers, cancelToken });
      const rawPlaylists = response.data?.playlists || [];
      const remotePlaylists = rawPlaylists.map(adaptPlaylist).filter(Boolean);

      // Merge remote playlists with local guest playlists
      const combined = [...remotePlaylists];
      for (const gp of guestPlaylists) {
        if (!combined.some(p => p.id === gp.id)) {
          combined.push(gp);
        }
      }
      return { success: true, playlists: combined };
    } catch (error) {
      const err = normalizeError(error);
      if (err.isCancel) throw error;
      return { success: true, playlists: guestPlaylists };
    }
  },

  /**
   * Fetch playlist by ID (GET /api/playlist/:playlistId or guest localStorage)
   */
  async getPlaylistById(playlistId, cancelToken) {
    if (!playlistId) {
      return { success: false, playlist: null, error: 'Missing playlist ID' };
    }

    if (playlistId.startsWith('guest_pl_')) {
      const guestList = this.getGuestPlaylists();
      const found = guestList.find(p => p._id === playlistId || p.id === playlistId);
      if (found) {
        return { success: true, playlist: adaptPlaylist(found) };
      }
      return { success: false, playlist: null, error: 'Guest playlist not found' };
    }

    try {
      const response = await apiClient.get(`/playlist/${playlistId}`, { cancelToken });
      const rawPlaylist = response.data?.playlist;
      if (!rawPlaylist) {
        // Check guest fallback
        const guestList = this.getGuestPlaylists();
        const found = guestList.find(p => p._id === playlistId || p.id === playlistId);
        if (found) return { success: true, playlist: adaptPlaylist(found) };
        return { success: false, playlist: null, error: 'Playlist not found' };
      }
      return { success: true, playlist: adaptPlaylist(rawPlaylist) };
    } catch (error) {
      // Check guest fallback
      const guestList = this.getGuestPlaylists();
      const found = guestList.find(p => p._id === playlistId || p.id === playlistId);
      if (found) return { success: true, playlist: adaptPlaylist(found) };

      const err = normalizeError(error);
      if (err.isCancel) throw error;
      return { success: false, playlist: null, error: err.message };
    }
  },

  /**
   * Add a song to a playlist (POST /api/playlist/:playlistId/track or guest localStorage)
   */
  async addTrackToPlaylist(playlistId, trackData, token) {
    if (!playlistId || !trackData) {
      return { success: false, error: 'Invalid playlist or track data' };
    }

    const payload = {
      trackId: trackData.id || trackData._id || `ext_${Date.now()}`,
      title: trackData.name || trackData.title || 'Track',
      artistName: trackData.artists?.[0]?.name || trackData.artistName || 'Artist',
      coverImage: trackData.album?.images?.[0]?.url || trackData.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop',
      uri: trackData.uri || trackData.audioUrl || '',
      duration: trackData.duration || Math.round((trackData.duration_ms || 180000) / 1000),
      externalId: trackData.externalId || String(trackData.id || trackData._id || '').replace(/^ext_(audius|saavn|itunes)_/, ''),
      source: trackData.source || 'saavn'
    };

    if (playlistId.startsWith('guest_pl_') || !token) {
      const guestList = this.getGuestPlaylists();
      const idx = guestList.findIndex(p => p._id === playlistId || p.id === playlistId);
      if (idx !== -1) {
        const pl = guestList[idx];
        if (!Array.isArray(pl.musics)) pl.musics = [];
        const exists = pl.musics.some(m => (m._id || m.id) === payload.trackId);
        if (!exists) {
          pl.musics.push({
            _id: payload.trackId,
            id: payload.trackId,
            title: payload.title,
            name: payload.title,
            artistName: payload.artistName,
            coverImage: payload.coverImage,
            uri: payload.uri,
            duration: payload.duration,
            source: payload.source
          });
          guestList[idx] = pl;
          this.saveGuestPlaylists(guestList);
        }
        return { success: true, playlist: adaptPlaylist(pl) };
      }
    }

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.post(`/playlist/${playlistId}/track`, payload, { headers });
      return { success: true, playlist: adaptPlaylist(response.data?.playlist) };
    } catch (error) {
      // Fallback to guest playlist update if local exists
      const guestList = this.getGuestPlaylists();
      const idx = guestList.findIndex(p => p._id === playlistId || p.id === playlistId);
      if (idx !== -1) {
        const pl = guestList[idx];
        if (!Array.isArray(pl.musics)) pl.musics = [];
        const exists = pl.musics.some(m => (m._id || m.id) === payload.trackId);
        if (!exists) {
          pl.musics.push({
            _id: payload.trackId,
            id: payload.trackId,
            title: payload.title,
            name: payload.title,
            artistName: payload.artistName,
            coverImage: payload.coverImage,
            uri: payload.uri,
            duration: payload.duration,
            source: payload.source
          });
          guestList[idx] = pl;
          this.saveGuestPlaylists(guestList);
        }
        return { success: true, playlist: adaptPlaylist(pl) };
      }
      const err = normalizeError(error);
      return { success: false, error: err.message };
    }
  },

  /**
   * Remove a song from a playlist (DELETE /api/playlist/:playlistId/track/:trackId or guest localStorage)
   */
  async removeTrackFromPlaylist(playlistId, trackId, token) {
    if (playlistId.startsWith('guest_pl_') || !token) {
      const guestList = this.getGuestPlaylists();
      const idx = guestList.findIndex(p => p._id === playlistId || p.id === playlistId);
      if (idx !== -1) {
        const pl = guestList[idx];
        if (Array.isArray(pl.musics)) {
          pl.musics = pl.musics.filter(m => (m._id || m.id) !== trackId);
          guestList[idx] = pl;
          this.saveGuestPlaylists(guestList);
        }
        return { success: true, playlist: adaptPlaylist(pl) };
      }
    }

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.delete(`/playlist/${playlistId}/track/${trackId}`, { headers });
      return { success: true, playlist: adaptPlaylist(response.data?.playlist) };
    } catch (error) {
      const err = normalizeError(error);
      return { success: false, error: err.message };
    }
  },

  /**
   * Delete a playlist (DELETE /api/playlist/:playlistId or guest localStorage)
   */
  async deletePlaylist(playlistId, token) {
    if (playlistId.startsWith('guest_pl_') || !token) {
      const guestList = this.getGuestPlaylists();
      const updated = guestList.filter(p => p._id !== playlistId && p.id !== playlistId);
      this.saveGuestPlaylists(updated);
      return { success: true };
    }

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await apiClient.delete(`/playlist/${playlistId}`, { headers });
      return { success: true };
    } catch (error) {
      const err = normalizeError(error);
      return { success: false, error: err.message };
    }
  },

  // ==========================================
  // AUTHENTICATION & RBAC METHODS
  // ==========================================

  /**
   * Login user (POST /api/auth/login)
   */
  async login(loginInput, password) {
    try {
      const payload = loginInput.includes('@') 
        ? { email: loginInput, password } 
        : { username: loginInput, password };
      const response = await apiClient.post('/auth/login', payload);
      return { 
        success: true, 
        token: response.data?.token, 
        user: response.data?.user 
      };
    } catch (error) {
      const err = normalizeError(error);
      return { success: false, error: err.message };
    }
  },

  /**
   * Register user (POST /api/auth/register)
   */
  async register(username, email, password, role = 'user', artistKey = '') {
    try {
      const payload = { username, email, password, role };
      if (artistKey) payload.artistKey = artistKey;
      const response = await apiClient.post('/auth/register', payload);
      return { 
        success: true, 
        token: response.data?.token, 
        user: response.data?.user 
      };
    } catch (error) {
      const err = normalizeError(error);
      return { success: false, error: err.message };
    }
  },

  /**
   * Logout user (POST /api/auth/logout)
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout');
      return { success: true };
    } catch (error) {
      return { success: true }; // Proceed with client-side cleanup even if request fails
    }
  },

  /**
   * Fetch current user profile (GET /api/auth/me)
   */
  async getMe(token) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.get('/auth/me', { headers });
      return { success: true, user: response.data?.user };
    } catch (error) {
      const err = normalizeError(error);
      return { success: false, error: err.message };
    }
  },

  /**
   * Upgrade listener to artist (POST /api/auth/upgrade-artist)
   */
  async upgradeToArtist(artistKey, token) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {};
      if (artistKey) payload.artistKey = artistKey;
      const response = await apiClient.post('/auth/upgrade-artist', payload, { headers });
      return { success: true, user: response.data?.user, token: response.data?.token };
    } catch (error) {
      const err = normalizeError(error);
      return { success: false, error: err.message };
    }
  },

  /**
   * Upload music track (POST /api/music/upload) - Artist only
   */
  async uploadMusic(formData, token) {
    try {
      const headers = {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      const response = await apiClient.post('/music/upload', formData, { headers });
      return { success: true, music: response.data?.music };
    } catch (error) {
      const err = normalizeError(error);
      return { success: false, error: err.message };
    }
  },

  /**
   * Create album (POST /api/music/album) - Artist only
   */
  async createAlbum(data, token) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.post('/music/album', data, { headers });
      return { success: true, album: response.data?.album };
    } catch (error) {
      const err = normalizeError(error);
      return { success: false, error: err.message };
    }
  },

  /**
   * Delete track (DELETE /api/music/:musicId) - Artist owner or Admin
   */
  async deleteMusic(musicId, token) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.delete(`/music/${musicId}`, { headers });
      return { success: true, message: response.data?.message };
    } catch (error) {
      const err = normalizeError(error);
      return { success: false, error: err.message };
    }
  },



  /**
   * Get admin stats (GET /api/music/admin/stats) - Admin only
   */
  async getAdminStats(token) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.get('/music/admin/stats', { headers });
      return { success: true, stats: response.data?.stats };
    } catch (error) {
      const err = normalizeError(error);
      return { success: false, error: err.message };
    }
  }
};

export default musicService;

