import React, { useEffect, useState, useContext } from 'react';
import { Redirect } from 'react-router-dom';
import axios from 'axios';

import PageBanner from '../featured-components/PageBanner';
import PlayListFunctions from '../featured-components/PlayListFunctions';
import TrackList from '../featured-components/TrackList';
import Loading from '../featured-components/Loading';

import { MessageContext, PlayContext, TokenContext } from '../../utilities/context';
import useId from '../../utilities/hooks/useId';
import musicService from '../../services/api';

export default function PlayListPage({ playlists, refreshPlaylist }) {
    const id = useId('playlist');
    const setMessage = useContext(MessageContext);
    const updatePlayer = useContext(PlayContext);
    const token = useContext(TokenContext) || localStorage.getItem('token');

    const [loading, setLoading] = useState(true);
    const [bannerInfo, setBannerInfo] = useState({
        name: '',
        description: '',
        user: [],
        followers: 0,
        primary_color: '#262626',
        images: [],
    });
    const [tracks, setTracks] = useState([]);
    const [like, setLike] = useState(false);

    // Inline track search and recommendations
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [recommendedTracks, setRecommendedTracks] = useState([]);
    const [addingId, setAddingId] = useState(null);

    useEffect(() => {
        if (!id || id === 'liked') return;

        const cancelSource = axios.CancelToken.source();
        setLoading(true);

        musicService.getPlaylistById(id, cancelSource.token)
            .then((res) => {
                if (res.success && res.playlist) {
                    const pl = res.playlist;
                    setBannerInfo({
                        name: pl.name,
                        description: pl.description || `${(pl.tracks?.items || []).length} songs`,
                        user: pl.user || [{ display_name: pl.owner?.display_name || 'You' }],
                        followers: 0,
                        primary_color: '#383838',
                        images: pl.images || [{ url: pl.coverImage }],
                    });
                    const items = pl.tracks?.items || [];
                    setTracks(items);
                    setLike(true);
                } else {
                    setMessage(`Notice: ${res.error || 'Playlist not found'}`);
                }
                setLoading(false);
            })
            .catch((err) => {
                if (!axios.isCancel(err)) {
                    setMessage(`Notice: ${err.message || 'Unable to load playlist'}`);
                    setLoading(false);
                }
            });

        // Load balanced recommendations across all categories (Telugu, Hindi, Malayalam, Tamil, etc.)
        musicService.getIndianCategories(cancelSource.token)
            .then((res) => {
                if (res.success && Array.isArray(res.categories)) {
                    const balanced = [];
                    const seenTrackIds = new Set();
                    const seenMovies = new Set();
                    const maxPerCategory = 3;

                    // Round: Pick up to 3 distinct movie tracks per category for rich multi-language variety
                    for (const cat of res.categories) {
                        let count = 0;
                        for (const t of cat.tracks || []) {
                            const trackId = t.id || t._id;
                            const movieKey = (t.album?.title || t.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (!seenTrackIds.has(trackId) && !seenMovies.has(movieKey)) {
                                seenTrackIds.add(trackId);
                                seenMovies.add(movieKey);
                                balanced.push(t);
                                count++;
                                if (count >= maxPerCategory) break;
                            }
                        }
                    }
                    setRecommendedTracks(balanced.slice(0, 24));
                }
            })
            .catch(() => {});

        return () => cancelSource.cancel();
    }, [id, setMessage]);

    // Live search for songs to add
    useEffect(() => {
        const trimmed = searchQuery.trim();
        if (!trimmed) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(() => {
            musicService.search(trimmed)
                .then((res) => {
                    if (res.success && Array.isArray(res.musics)) {
                        setSearchResults(res.musics.slice(0, 10));
                    } else {
                        setSearchResults([]);
                    }
                    setIsSearching(false);
                })
                .catch(() => {
                    setIsSearching(false);
                });
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const playContext = () => {
        if (tracks && tracks.length > 0) {
            updatePlayer(tracks[0], tracks);
        } else {
            setMessage('This playlist has no songs yet');
        }
    };

    const playContextTrack = (trackUri, trackObj) => {
        const trackToPlay = trackObj || tracks.find(t => (t.uri && t.uri === trackUri) || (t.id && t.id === trackUri));
        if (trackToPlay) {
            updatePlayer(trackToPlay, tracks);
        } else if (tracks && tracks.length > 0) {
            updatePlayer(tracks[0], tracks);
        }
    };

    const handleAddTrack = async (trackToAdd) => {
        if (!trackToAdd || addingId) return;
        const trackId = trackToAdd.id || trackToAdd._id;
        setAddingId(trackId);

        try {
            const currentToken = token || localStorage.getItem('token');
            const res = await musicService.addTrackToPlaylist(id, trackToAdd, currentToken);
            if (res.success) {
                const trackName = trackToAdd.name || trackToAdd.title || 'Track';
                setMessage(`Added "${trackName}" to playlist!`);
                if (res.playlist && Array.isArray(res.playlist.tracks?.items)) {
                    setTracks(res.playlist.tracks.items);
                } else {
                    setTracks(prev => {
                        const exists = prev.some(t => (t.id || t._id) === trackId);
                        return exists ? prev : [...prev, trackToAdd];
                    });
                }
                if (typeof refreshPlaylist === 'function') {
                    refreshPlaylist();
                }
            } else {
                setMessage(res.error || 'Failed to add track');
            }
        } catch (err) {
            setMessage(err.message || 'Error adding track to playlist');
        } finally {
            setAddingId(null);
        }
    };

    const isTrackInPlaylist = (trackItem) => {
        const targetId = trackItem.id || trackItem._id;
        return tracks.some(t => (t.id || t._id) === targetId || (t.name && trackItem.name && t.name.toLowerCase() === trackItem.name.toLowerCase()));
    };

    if (id === 'liked') {
        return <Redirect to='/tracks' />;
    }

    if (loading) {
        return <Loading />;
    }

    const displayedAddList = searchQuery.trim() ? searchResults : recommendedTracks;

    return (
        <div className='listPage'>
            <PageBanner pageTitle='playlist' bannerInfo={bannerInfo} />
            <div className="playListContent">
                <div className="playListOverlay" style={{ backgroundColor: bannerInfo.primary_color }}></div>
                <PlayListFunctions 
                    follow={like} 
                    setMessage={setMessage} 
                    playContext={playContext}
                    playlistId={id}
                    tracks={tracks}
                />
                <div className="page-content">
                    {tracks.length > 0 ? (
                        <TrackList tracks={tracks} playContextTrack={playContextTrack} />
                    ) : (
                        <div style={{ padding: '32px 32px 20px', color: '#b3b3b3' }}>
                            <h2 style={{ color: '#fff', fontSize: '22px', marginBottom: '8px' }}>Your playlist is empty</h2>
                            <p style={{ fontSize: '14px', lineHeight: '20px', margin: 0 }}>
                                Find songs below or search to add them directly to this playlist.
                            </p>
                        </div>
                    )}

                    {/* Interactive "Add to Playlist" Section */}
                    <div style={{
                        marginTop: '40px',
                        padding: '24px 32px 48px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', margin: '0 0 6px 0' }}>
                                    Let's find something for your playlist
                                </h3>
                                <p style={{ color: '#b3b3b3', fontSize: '13px', margin: 0 }}>
                                    {searchQuery.trim() ? `Search results for "${searchQuery}"` : 'Recommended tracks you might like'}
                                </p>
                            </div>

                            {/* Search Input Box */}
                            <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
                                <input
                                    type="text"
                                    placeholder="Search for songs or artists..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 36px 10px 14px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        borderRadius: '24px',
                                        color: '#fff',
                                        fontSize: '13px',
                                        outline: 'none',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--spotify-green)'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        type="button"
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            color: '#b3b3b3',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                        }}
                                        title="Clear search"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Loading indicator */}
                        {isSearching && (
                            <div style={{ color: '#b3b3b3', fontSize: '13px', padding: '16px 0' }}>
                                Searching catalog...
                            </div>
                        )}

                        {/* Song Items List with instant "+ Add" buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {displayedAddList.length === 0 && !isSearching ? (
                                <div style={{ color: '#888', fontSize: '13px', padding: '16px 0' }}>
                                    {searchQuery.trim() ? 'No matching songs found. Try another query.' : 'No recommendations available right now.'}
                                </div>
                            ) : (
                                displayedAddList.map((trackItem) => {
                                    const inPlaylist = isTrackInPlaylist(trackItem);
                                    const trackId = trackItem.id || trackItem._id;
                                    const isThisAdding = addingId === trackId;
                                    const coverUrl = trackItem.coverImage || trackItem.album?.images?.[0]?.url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop';
                                    const artistName = trackItem.artistName || trackItem.artists?.[0]?.name || 'Artist';

                                    return (
                                        <div
                                            key={trackId}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 12px',
                                                borderRadius: '6px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                                transition: 'background-color 0.2s ease',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                                <img
                                                    src={coverUrl}
                                                    alt=""
                                                    style={{ width: '42px', height: '42px', borderRadius: '4px', objectFit: 'cover' }}
                                                />
                                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                                        {trackItem.name || trackItem.title}
                                                    </div>
                                                    <div style={{ color: '#b3b3b3', fontSize: '12px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                                        {artistName}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Button: Add or In Playlist */}
                                            <div style={{ marginLeft: '16px' }}>
                                                {inPlaylist ? (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '6px 14px',
                                                        borderRadius: '20px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        color: 'var(--spotify-green)',
                                                        backgroundColor: 'rgba(29, 185, 84, 0.1)',
                                                        border: '1px solid rgba(29, 185, 84, 0.3)',
                                                    }}>
                                                        ✓ Added
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddTrack(trackItem)}
                                                        disabled={isThisAdding}
                                                        style={{
                                                            padding: '6px 16px',
                                                            borderRadius: '20px',
                                                            border: '1px solid rgba(255, 255, 255, 0.25)',
                                                            backgroundColor: 'transparent',
                                                            color: '#fff',
                                                            fontSize: '12px',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease',
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.borderColor = '#fff';
                                                            e.currentTarget.style.transform = 'scale(1.04)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                                                            e.currentTarget.style.transform = 'scale(1)';
                                                        }}
                                                    >
                                                        {isThisAdding ? 'Adding...' : '+ Add'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
