import React, { useContext, useState, useRef, useEffect } from 'react';
import Icon from '../icons';
import { LoginContext, AuthModalContext, TokenContext, CreatePlaylistContext, CurrentTrackContext, PlayContext } from '../../utilities/context';
import musicService from '../../services/api';

export default function PlayListFunctions({
    type, 
    follow, 
    onFollow, 
    setMessage, 
    playContext, 
    playlistId, 
    tracks = [],
    albumId
}) {
    const loggedIn = useContext(LoginContext);

    switch (type) {
        case 'playOnly':
            return (
                <div className="playListFunctions">
                    <PlayButtonLarge playContext={playContext} tracks={tracks} />
                </div>
            );
        case 'none':
            return (
                <div className="playListFunctions">
                    <MoreDropdownMenu 
                        setMessage={setMessage} 
                        playlistId={playlistId} 
                        tracks={tracks} 
                        albumId={albumId} 
                    />
                </div>
            );
        case 'user':
            return (
                <div className="playListFunctions">
                    <FollowButton follow={follow} onFollow={onFollow} loggedIn={loggedIn} />
                    <MoreDropdownMenu 
                        setMessage={setMessage} 
                        playlistId={playlistId} 
                        tracks={tracks} 
                        albumId={albumId} 
                    />
                </div>
            );
        case 'artist':
            return (
                <div className="playListFunctions">
                    <PlayButtonLarge playContext={playContext} tracks={tracks} />
                    <FollowButton follow={follow} onFollow={onFollow} loggedIn={loggedIn} />
                    <MoreDropdownMenu 
                        setMessage={setMessage} 
                        playlistId={playlistId} 
                        tracks={tracks} 
                        albumId={albumId} 
                    />
                </div>
            );
        default:
            return (
                <div className="playListFunctions">
                    <PlayButtonLarge playContext={playContext} tracks={tracks} />
                    <LikeButton follow={follow} onFollow={onFollow} loggedIn={loggedIn} />
                    <MoreDropdownMenu 
                        setMessage={setMessage} 
                        playlistId={playlistId} 
                        tracks={tracks} 
                        albumId={albumId} 
                    />
                </div>
            );
    }
}

function PlayButtonLarge({ playContext, tracks = [] }) {
    const currentTrackContext = useContext(CurrentTrackContext);
    const updatePlayer = useContext(PlayContext);
    const currentTrack = currentTrackContext?.track || currentTrackContext;
    const isPlaying = Boolean(currentTrackContext?.isPlaying);

    const isCurrentListPlaying = Boolean(
        isPlaying && currentTrack && Array.isArray(tracks) && tracks.some((t) => {
            const tid = t.id || t._id;
            const cid = currentTrack.id || currentTrack._id;
            return (tid && cid && String(tid) === String(cid)) || (t.uri && currentTrack.uri && t.uri === currentTrack.uri);
        })
    );

    return (
        <button 
            className="playButton no-outline" 
            title={isCurrentListPlaying ? "Pause" : "Play"} 
            onClick={() => {
                if (isCurrentListPlaying) {
                    updatePlayer();
                } else if (playContext) {
                    playContext();
                }
            }}
            type="button"
        >
            <Icon name={isCurrentListPlaying ? "Pause" : "Play"} height="28" width="28" />
        </button>
    );
}

function LikeButton({ follow, onFollow, loggedIn }) {
    const openAuth = useContext(AuthModalContext);
    if (loggedIn) {
        return (
            <button 
                className={`likeButton ${follow ? 'noHover' : ''} no-outline`} 
                style={{ color: follow ? 'var(--spotify-green)' : null }} 
                title={follow ? 'Remove from Library' : 'Save to Your Library'} 
                onClick={onFollow}
                type="button"
            >
                <Icon name="Heart" fill={follow} />
            </button>
        );
    } else {
        return (
            <button 
                className="likeButton no-outline" 
                title="Save to Your Library" 
                onClick={() => {
                    if (openAuth) openAuth('login');
                }}
                type="button"
            >
                <Icon name="Heart" fill={follow} />
            </button>
        );
    }
}

function FollowButton({ follow, onFollow, loggedIn }) {
    const openAuth = useContext(AuthModalContext);
    if (loggedIn) {
        return (
            <button 
                className="followButton no-outline" 
                onClick={onFollow}
                type="button"
            >
                {follow ? 'following' : 'follow'}
            </button>
        );
    } else {
        return (
            <button 
                className="followButton no-outline" 
                onClick={() => {
                    if (openAuth) openAuth('login');
                }}
                type="button"
            >
                {follow ? 'following' : 'follow'}
            </button>
        );
    }
}

function MoreDropdownMenu({ setMessage, playlistId, tracks, albumId }) {
    const [open, setOpen] = useState(false);
    const [playlists, setPlaylists] = useState([]);
    const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);
    const menuRef = useRef(null);
    const token = useContext(TokenContext);
    const openCreatePlaylist = useContext(CreatePlaylistContext);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
                setShowPlaylistSubmenu(false);
            }
        };
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open]);

    const handleCopyLink = () => {
        try {
            navigator.clipboard.writeText(window.location.href);
            setMessage('Link copied to clipboard!');
        } catch (e) {
            setMessage('Failed to copy link');
        }
        setOpen(false);
    };

    const handleOpenPlaylists = async () => {
        try {
            const currentToken = token || localStorage.getItem('token');
            const res = await musicService.getUserPlaylists(currentToken);
            if (res.success && Array.isArray(res.playlists) && res.playlists.length > 0) {
                setPlaylists(res.playlists);
                setShowPlaylistSubmenu(true);
            } else {
                setMessage('No custom playlists found. Click "+ Create Playlist" in sidebar first!');
                setOpen(false);
            }
        } catch (e) {
            setMessage('Unable to load playlists');
            setOpen(false);
        }
    };

    const handleAddToPlaylist = async (targetPlaylistId) => {
        if (!tracks || tracks.length === 0) {
            setMessage('No tracks available to add');
            setOpen(false);
            return;
        }

        const currentToken = token || localStorage.getItem('token');
        let count = 0;
        for (const t of tracks) {
            try {
                await musicService.addTrackToPlaylist(targetPlaylistId, t, currentToken);
                count++;
            } catch (e) {}
        }
        setMessage(`Added ${count} track${count === 1 ? '' : 's'} to playlist!`);
        setOpen(false);
        setShowPlaylistSubmenu(false);
    };

    const handleDeletePlaylist = async () => {
        if (!playlistId) return;
        const currentToken = token || localStorage.getItem('token');
        const res = await musicService.deletePlaylist(playlistId, currentToken);
        if (res.success) {
            setMessage('Playlist deleted');
            window.location.href = '/';
        } else {
            setMessage(res.error || 'Failed to delete playlist');
        }
        setOpen(false);
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }} ref={menuRef}>
            <button 
                className="moreButton no-outline" 
                title="More Options" 
                onClick={() => setOpen(!open)}
                type="button"
                style={{
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: open ? '#fff' : '#b3b3b3'
                }}
            >
                • • •
            </button>

            {open && (
                <div style={dropdownStyle}>
                    <button 
                        style={dropdownItemStyle}
                        onClick={handleCopyLink}
                        type="button"
                    >
                        <span role="img" aria-label="link">🔗</span>
                        <span>Copy Link</span>
                    </button>

                    <button 
                        style={dropdownItemStyle}
                        onClick={handleOpenPlaylists}
                        type="button"
                    >
                        <span role="img" aria-label="add">➕</span>
                        <span>Add to Playlist...</span>
                    </button>

                    {showPlaylistSubmenu && (
                        <div style={submenuStyle}>
                            <button
                                style={{ ...dropdownItemStyle, color: 'var(--spotify-green)', fontWeight: '600' }}
                                onClick={() => {
                                    setOpen(false);
                                    if (openCreatePlaylist) openCreatePlaylist();
                                }}
                                type="button"
                            >
                                <span role="img" aria-label="sparkles">✨</span>
                                <span>Create New Playlist</span>
                            </button>
                            {playlists.map((pl) => (
                                <button
                                    key={pl.id || pl._id}
                                    style={dropdownItemStyle}
                                    onClick={() => handleAddToPlaylist(pl.id || pl._id)}
                                    type="button"
                                >
                                    <span role="img" aria-label="music">🎵</span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {pl.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {playlistId && (
                        <button 
                            style={{ ...dropdownItemStyle, color: '#ff5c5c' }}
                            onClick={handleDeletePlaylist}
                            type="button"
                        >
                            <span role="img" aria-label="delete">🗑️</span>
                            <span>Delete Playlist</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

const dropdownStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '8px',
    backgroundColor: '#282828',
    borderRadius: '8px',
    boxShadow: '0 12px 24px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    minWidth: '200px',
    zIndex: 1000,
    padding: '6px 0',
    display: 'flex',
    flexDirection: 'column'
};

const submenuStyle = {
    backgroundColor: '#1f1f1f',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    padding: '4px 0',
    maxHeight: '160px',
    overflowY: 'auto'
};

const dropdownItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    color: '#e5e5e5',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    width: '100%',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease'
};