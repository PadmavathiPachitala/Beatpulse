import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';

import CollectionRow from '../featured-components/CollectionRow';
import Loading from '../featured-components/Loading';
import musicService, { adaptTrack } from '../../services/api';
import fallbackCategories from '../../services/catalog.fallback.json';
import { MessageContext, LoginContext } from '../../utilities/context';

export default function HomePage() {
    const setMessage = useContext(MessageContext);
    const loggedIn = useContext(LoginContext);

    const [musics, setMusics] = useState([]);
    const [albums, setAlbums] = useState([]);
    const [indianCategories, setIndianCategories] = useState(() => 
        fallbackCategories.map(cat => ({
            ...cat,
            tracks: (cat.tracks || []).map(adaptTrack).filter(Boolean)
        }))
    );
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const cancelSource = axios.CancelToken.source();

        const loadCatalog = async () => {
            try {
                setLoading(true);
                const [categoriesRes, musicsRes, albumsRes] = await Promise.all([
                    musicService.getIndianCategories(cancelSource.token),
                    musicService.getMusics(cancelSource.token),
                    musicService.getAlbums(cancelSource.token)
                ]);

                if (categoriesRes.success && Array.isArray(categoriesRes.categories)) {
                    setIndianCategories(categoriesRes.categories);
                }

                if (musicsRes.success && Array.isArray(musicsRes.musics)) {
                    setMusics(musicsRes.musics);
                } else if (musicsRes.error) {
                    console.warn(`Local tracks notice: ${musicsRes.error}`);
                }

                if (albumsRes.success && Array.isArray(albumsRes.albums)) {
                    setAlbums(albumsRes.albums);
                } else if (albumsRes.error) {
                    console.warn(`Local albums notice: ${albumsRes.error}`);
                }
            } catch (err) {
                if (!axios.isCancel(err)) {
                    setMessage(`Catalog notice: ${err.message}`);
                }
            } finally {
                setLoading(false);
            }
        };

        loadCatalog();

        return () => {
            cancelSource.cancel();
        };
    }, [setMessage]);

    if (loading) {
        return <Loading />;
    }

    // 1. Dedicated Trending Tracks from current viral trends
    const trendingCategory = indianCategories.find(cat => cat.id === 'trending');
    let trendingTracks = [];
    if (trendingCategory && Array.isArray(trendingCategory.tracks) && trendingCategory.tracks.length > 0) {
        trendingTracks = trendingCategory.tracks;
    } else {
        // Fallback: Pick the top track from each category without duplicates
        const seenIds = new Set();
        indianCategories.forEach((cat) => {
            if (cat.tracks && cat.tracks.length > 0) {
                const topTrack = cat.tracks[0];
                const trackKey = topTrack.id || topTrack._id;
                if (trackKey && !seenIds.has(trackKey)) {
                    seenIds.add(trackKey);
                    trendingTracks.push(topTrack);
                }
            }
        });
    }

    // 2. Filter out 'trending' so it's not rendered twice, leaving Telugu Hits first
    const regionalCategories = indianCategories.filter(cat => cat.id !== 'trending');

    return (
        <div className="page-content">
            <div className="pageContent">
                {/* 1. Quick Jump / Saved Music (for logged-in listeners) */}
                {loggedIn && (
                    <CollectionRow 
                        name="Uniquely Yours" 
                        id="liked" 
                        playlists={[{
                            id: 'liked-songs', 
                            to: '/tracks', 
                            description: 'Your favorite tracks', 
                            name: 'Liked Songs', 
                            type: 'playlist',
                            images: [{ url: 'https://misc.scdn.co/liked-songs/liked-songs-300.png' }]
                        }]}
                    />
                )}

                {/* 2. Trending Now / Viral Hits */}
                {trendingTracks.length > 0 && (
                    <CollectionRow
                        key="collection-trending"
                        name={trendingCategory?.title || "Trending Now • Viral Hits"}
                        id="trending"
                        playlists={trendingTracks}
                    />
                )}

                {/* 3. Regional Genre & Language Rows (starting with Telugu Hits & Blockbusters) */}
                {regionalCategories.map((category) => (
                    <CollectionRow 
                        key={`cat-${category.id}`}
                        name={category.title} 
                        id={category.id} 
                        playlists={category.tracks}
                    />
                ))}

                {/* 4. Indie Singer Albums */}
                {albums.length > 0 && (
                    <CollectionRow 
                        key="collection-popular-albums"
                        name="Indie Singer Albums" 
                        id="popular-albums" 
                        playlists={albums}
                    />
                )}

                {/* 5. Artist Studio Releases (Songs uploaded by indie singers) */}
                {musics.length > 0 && (
                    <CollectionRow 
                        key="collection-studio-tracks"
                        name="Artist Studio Releases (Indie Singers)" 
                        id="featured-tracks" 
                        playlists={musics}
                    />
                )}

                {indianCategories.length === 0 && albums.length === 0 && musics.length === 0 && (
                    <div style={{ padding: '60px 32px', textAlign: 'center', color: '#b3b3b3' }}>
                        <h3 style={{ color: '#fff', fontSize: '20px', marginBottom: '8px' }}>Catalog connecting...</h3>
                        <p style={{ fontSize: '14px' }}>Music collections will populate automatically.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
