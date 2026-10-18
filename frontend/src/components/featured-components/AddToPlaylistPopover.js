import React, { useState, useEffect, useRef, useContext } from 'react';
import Icon from '../icons';
import { TokenContext, CreatePlaylistContext, MessageContext } from '../../utilities/context';
import musicService from '../../services/api';

export default function AddToPlaylistPopover({ track, direction = 'down', align = 'right' }) {
    const [open, setOpen] = useState(false);
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const menuRef = useRef(null);
    const token = useContext(TokenContext) || localStorage.getItem('token');
    const openCreatePlaylist = useContext(CreatePlaylistContext);
    const setMessage = useContext(MessageContext);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open]);

    const handleToggle = async (e) => {
        e.stopPropagation();
        const nextState = !open;
        setOpen(nextState);

        if (nextState) {
            setLoading(true);
            try {
                const currentToken = token || localStorage.getItem('token');
                const res = await musicService.getUserPlaylists(currentToken);
                if (res.success && Array.isArray(res.playlists)) {
                    setPlaylists(res.playlists);
                }
            } catch (err) {
                // silent fallback
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSelectPlaylist = async (e, playlist) => {
        e.stopPropagation();
        if (submitting) return;

        setSubmitting(true);
        try {
            const currentToken = token || localStorage.getItem('token');
            const trackPayload = {
                id: track.id || track._id,
                name: track.name || track.title,
                title: track.name || track.title,
                artistName: track.artistName || track.artists?.[0]?.name || 'Artist',
                coverImage: track.coverImage || track.album?.images?.[0]?.url,
                uri: track.uri || track.audioUrl,
                duration: track.duration || Math.round((track.duration_ms || 180000) / 1000),
                externalId: track.externalId || String(track.id || track._id || '').replace(/^ext_(audius|saavn|itunes)_/, ''),
                source: track.source || 'saavn'
            };

            const res = await musicService.addTrackToPlaylist(playlist.id, trackPayload, currentToken);
            if (res.success) {
                setMessage(`Added "${trackPayload.title}" to ${playlist.name}`);
            } else {
                setMessage(res.error || 'Failed to add song to playlist');
            }
        } catch (err) {
            setMessage(err.message || 'Error adding song to playlist');
        } finally {
            setSubmitting(false);
            setOpen(false);
        }
    };

    const handleCreateNew = (e) => {
        e.stopPropagation();
        setOpen(false);
        if (openCreatePlaylist) {
            openCreatePlaylist();
        }
    };

    // Calculate position
    const popoverStyle = {
        position: 'absolute',
        [direction === 'up' ? 'bottom' : 'top']: '100%',
        [align === 'left' ? 'left' : 'right']: 0,
        backgroundColor: '#282828',
        borderRadius: '6px',
        boxShadow: '0 16px 28px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
        minWidth: '200px',
        maxWidth: '260px',
        zIndex: 9999,
        padding: '6px 0',
        marginBottom: direction === 'up' ? '8px' : 0,
        marginTop: direction === 'down' ? '8px' : 0,
    };

    const itemStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '9px 14px',
        backgroundColor: 'transparent',
        border: 'none',
        color: '#e5e5e5',
        fontSize: '13px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
    };

    return (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} ref={menuRef}>
            <button
                className="no-outline"
                title="Add to Playlist"
                aria-label="Add to Playlist"
                onClick={handleToggle}
                type="button"
                style={{
                    background: 'none',
                    border: 'none',
                    color: open ? '#1db954' : '#b3b3b3',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s ease, transform 0.15s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.transform = 'scale(1.15)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = open ? '#1db954' : '#b3b3b3';
                    e.currentTarget.style.transform = 'scale(1)';
                }}
            >
                <Icon name="Options" width="16" height="16" />
            </button>

            {open && (
                <div style={popoverStyle} onClick={(e) => e.stopPropagation()}>
                    <div style={{
                        padding: '6px 14px 8px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        color: '#9e9e9e'
                    }}>
                        Add to Playlist
                    </div>

                    {loading ? (
                        <div style={{ padding: '12px 14px', color: '#888', fontSize: '12px' }}>
                            Loading playlists...
                        </div>
                    ) : (
                        <>
                            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                {playlists.length === 0 ? (
                                    <div style={{ padding: '10px 14px', color: '#888', fontSize: '12px' }}>
                                        No custom playlists yet
                                    </div>
                                ) : (
                                    playlists.map((pl) => (
                                        <button
                                            key={pl.id}
                                            style={itemStyle}
                                            onClick={(e) => handleSelectPlaylist(e, pl)}
                                            type="button"
                                            disabled={submitting}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <span role="img" aria-label="music" style={{ fontSize: '14px' }}>🎵</span>
                                            <span style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {pl.name}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '4px', paddingTop: '4px' }}>
                                <button
                                    style={{ ...itemStyle, color: '#1db954', fontWeight: '600' }}
                                    onClick={handleCreateNew}
                                    type="button"
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <span role="img" aria-label="add">➕</span> Create New Playlist
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
