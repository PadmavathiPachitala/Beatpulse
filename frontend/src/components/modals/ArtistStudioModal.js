import React, { useState, useEffect } from 'react';
import musicService from '../../services/api';

export default function ArtistStudioModal({ user, token, onClose, onRefreshCatalog, onRoleUpdated }) {
    const isArtistOrAdmin = user && (user.role === 'artist' || user.role === 'admin');
    const [tab, setTab] = useState(isArtistOrAdmin ? 'upload' : 'upgrade'); // 'upload' | 'album' | 'upgrade'

    // Upload state
    const [title, setTitle] = useState('');
    const [audioFile, setAudioFile] = useState(null);
    const [coverImage, setCoverImage] = useState('');
    const [selectedAlbumId, setSelectedAlbumId] = useState('');
    const [artistAlbums, setArtistAlbums] = useState([]);

    // Album state
    const [albumTitle, setAlbumTitle] = useState('');
    const [albumCoverImage, setAlbumCoverImage] = useState('');

    // Upgrade state
    const [inviteKey, setInviteKey] = useState('');
    const [showKeyInput, setShowKeyInput] = useState(false);

    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ text: '', isError: false });

    useEffect(() => {
        if (isArtistOrAdmin) {
            musicService.getArtistAlbums(token).then((res) => {
                if (res.success && res.albums) {
                    setArtistAlbums(res.albums);
                }
            });
        }
    }, [isArtistOrAdmin, token]);

    const handleUploadSong = async (e) => {
        e.preventDefault();
        if (!title.trim() || !audioFile) {
            setStatusMsg({ text: 'Song title and audio file are required', isError: true });
            return;
        }

        setLoading(true);
        setStatusMsg({ text: 'Uploading audio stream to ImageKit...', isError: false });

        try {
            const formData = new FormData();
            formData.append('title', title.trim());
            formData.append('music', audioFile);
            if (coverImage.trim()) {
                formData.append('coverImage', coverImage.trim());
            }
            if (selectedAlbumId) {
                formData.append('albumId', selectedAlbumId);
            }

            const res = await musicService.uploadTrack(formData, token);
            if (res.success) {
                setStatusMsg({ text: `Track "${title}" successfully uploaded and published!`, isError: false });
                setTitle('');
                setAudioFile(null);
                setCoverImage('');
                if (onRefreshCatalog) onRefreshCatalog();
                setTimeout(() => onClose(), 1500);
            } else {
                setStatusMsg({ text: `Upload failed: ${res.error}`, isError: true });
            }
        } catch (err) {
            setStatusMsg({ text: `Error: ${err.message}`, isError: true });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAlbum = async (e) => {
        e.preventDefault();
        if (!albumTitle.trim()) {
            setStatusMsg({ text: 'Album title is required', isError: true });
            return;
        }

        setLoading(true);
        setStatusMsg({ text: 'Creating album...', isError: false });

        try {
            const payload = {
                title: albumTitle.trim(),
            };
            if (albumCoverImage.trim()) {
                payload.coverImage = albumCoverImage.trim();
            }

            const res = await musicService.createAlbum(payload, token);
            if (res.success) {
                setStatusMsg({ text: `Album "${albumTitle}" created successfully!`, isError: false });
                setAlbumTitle('');
                setAlbumCoverImage('');
                if (onRefreshCatalog) onRefreshCatalog();
                setTimeout(() => onClose(), 1500);
            } else {
                setStatusMsg({ text: `Creation failed: ${res.error}`, isError: true });
            }
        } catch (err) {
            setStatusMsg({ text: `Error: ${err.message}`, isError: true });
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        setLoading(true);
        setStatusMsg({ text: 'Activating artist permissions...', isError: false });

        try {
            const keyToSend = inviteKey.trim();
            const res = await musicService.upgradeToArtist(keyToSend, token);
            if (res.success && res.user) {
                setStatusMsg({ text: 'Account successfully upgraded to Artist!', isError: false });
                if (res.token) localStorage.setItem('token', res.token);
                if (onRoleUpdated) onRoleUpdated(res.user, res.token);
                setTab('upload');
            } else {
                setStatusMsg({ text: res.error || 'Failed to activate artist account', isError: true });
            }
        } catch (err) {
            setStatusMsg({ text: `Error: ${err.message}`, isError: true });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
                <button style={closeButtonStyle} onClick={onClose} title="Close">
                    ✕
                </button>

                <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: '700', margin: '0 0 6px 0' }}>
                        {isArtistOrAdmin ? 'Artist Studio & Creator Suite' : 'Upgrade to Artist Studio'}
                    </h2>
                    <p style={{ color: '#b3b3b3', fontSize: '13px', margin: 0 }}>
                        {isArtistOrAdmin
                            ? 'Upload audio tracks hosted on ImageKit, manage albums, and curate your discography.'
                            : 'Activate your free creator suite to unlock track uploads, album publishing, and discography management.'}
                    </p>
                </div>

                {/* Tabs */}
                {isArtistOrAdmin && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #282828', paddingBottom: '12px' }}>
                        <button
                            type="button"
                            onClick={() => { setTab('upload'); setStatusMsg({ text: '', isError: false }); }}
                            style={{
                                ...tabButtonStyle,
                                backgroundColor: tab === 'upload' ? '#1db954' : '#282828',
                                color: tab === 'upload' ? '#000' : '#fff'
                            }}
                        >
                            Upload Track
                        </button>
                        <button
                            type="button"
                            onClick={() => { setTab('album'); setStatusMsg({ text: '', isError: false }); }}
                            style={{
                                ...tabButtonStyle,
                                backgroundColor: tab === 'album' ? '#1db954' : '#282828',
                                color: tab === 'album' ? '#000' : '#fff'
                            }}
                        >
                            Create Album
                        </button>
                    </div>
                )}

                {statusMsg.text && (
                    <div style={{
                        backgroundColor: statusMsg.isError ? '#e91429' : '#1db954',
                        color: statusMsg.isError ? '#fff' : '#000',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        marginBottom: '16px',
                        textAlign: 'center',
                        fontWeight: '600'
                    }}>
                        {statusMsg.text}
                    </div>
                )}

                {/* TAB: UPLOAD TRACK */}
                {tab === 'upload' && isArtistOrAdmin && (
                    <form onSubmit={handleUploadSong} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label style={labelStyle}>Track Title *</label>
                            <input
                                type="text"
                                style={inputStyle}
                                placeholder="e.g. Midnight Horizon"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Audio File (MP3 / WAV) *</label>
                            <input
                                type="file"
                                accept="audio/*"
                                style={fileInputStyle}
                                onChange={(e) => setAudioFile(e.target.files[0])}
                                required
                            />
                            {audioFile && (
                                <span style={{ fontSize: '12px', color: '#1db954', display: 'block', marginTop: '4px' }}>
                                    Selected: {audioFile.name} ({(audioFile.size / (1024 * 1024)).toFixed(2)} MB)
                                </span>
                            )}
                        </div>

                        <div>
                            <label style={labelStyle}>Cover Image URL (Optional)</label>
                            <input
                                type="url"
                                style={inputStyle}
                                placeholder="https://images.unsplash.com/..."
                                value={coverImage}
                                onChange={(e) => setCoverImage(e.target.value)}
                            />
                        </div>

                        {artistAlbums.length > 0 && (
                            <div>
                                <label style={labelStyle}>Assign to Album (Optional)</label>
                                <select
                                    style={inputStyle}
                                    value={selectedAlbumId}
                                    onChange={(e) => setSelectedAlbumId(e.target.value)}
                                >
                                    <option value="">Single (No Album)</option>
                                    {artistAlbums.map((alb) => (
                                        <option key={alb.id} value={alb.id}>
                                            {alb.title || alb.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                ...submitButtonStyle,
                                opacity: loading ? 0.7 : 1,
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Uploading...' : 'Publish Track'}
                        </button>
                    </form>
                )}

                {/* TAB: CREATE ALBUM */}
                {tab === 'album' && isArtistOrAdmin && (
                    <form onSubmit={handleCreateAlbum} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label style={labelStyle}>Album Title *</label>
                            <input
                                type="text"
                                style={inputStyle}
                                placeholder="e.g. Neon Dreams 2"
                                value={albumTitle}
                                onChange={(e) => setAlbumTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Album Artwork URL (Optional)</label>
                            <input
                                type="url"
                                style={inputStyle}
                                placeholder="https://images.unsplash.com/..."
                                value={albumCoverImage}
                                onChange={(e) => setAlbumCoverImage(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                ...submitButtonStyle,
                                opacity: loading ? 0.7 : 1,
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Creating...' : 'Create Album'}
                        </button>
                    </form>
                )}

                {/* TAB: UPGRADE TO ARTIST */}
                {(!isArtistOrAdmin || tab === 'upgrade') && (
                    <form onSubmit={handleUpgrade} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            backgroundColor: '#181818',
                            border: '1px solid #282828',
                            borderRadius: '10px',
                            padding: '20px',
                            textAlign: 'left'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(29, 185, 84, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#1db954',
                                    fontSize: '20px',
                                    fontWeight: 'bold'
                                }}>
                                    ♪
                                </div>
                                <div>
                                    <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', margin: 0 }}>
                                        BeatPulse Creator Access
                                    </h3>
                                    <span style={{ color: '#1db954', fontSize: '12px', fontWeight: '600' }}>
                                        Free for all musicians & creators
                                    </span>
                                </div>
                            </div>

                            <ul style={{ color: '#b3b3b3', fontSize: '13px', margin: '0 0 18px 0', paddingLeft: '20px', lineHeight: '1.8' }}>
                                <li>Upload high-fidelity MP3 and WAV audio tracks</li>
                                <li>Create albums and publish official discographies</li>
                                <li>Stream your music across web & mobile devices</li>
                            </ul>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    ...submitButtonStyle,
                                    width: '100%',
                                    backgroundColor: '#1db954',
                                    color: '#000',
                                    fontWeight: '700',
                                    fontSize: '14px',
                                    padding: '12px',
                                    opacity: loading ? 0.7 : 1,
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? 'Activating Creator Studio...' : 'Activate Artist Account (Free)'}
                            </button>
                        </div>

                        {/* Optional private key input */}
                        <div style={{ textAlign: 'center' }}>
                            <button
                                type="button"
                                onClick={() => setShowKeyInput(!showKeyInput)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#888',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                {showKeyInput ? 'Hide private invitation key field' : 'Have an Administrator or VIP Key? (Optional)'}
                            </button>
                            {showKeyInput && (
                                <div style={{ marginTop: '12px', textAlign: 'left' }}>
                                    <label style={labelStyle}>Private Key</label>
                                    <input
                                        type="password"
                                        style={inputStyle}
                                        placeholder="Enter key if upgrading to Admin"
                                        value={inviteKey}
                                        onChange={(e) => setInviteKey(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
};

const modalCardStyle = {
    backgroundColor: '#121212',
    border: '1px solid #282828',
    borderRadius: '12px',
    padding: '32px',
    width: '460px',
    maxWidth: '92vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxSizing: 'border-box',
    position: 'relative',
    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6)',
};

const closeButtonStyle = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'transparent',
    border: 'none',
    color: '#b3b3b3',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
};

const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '6px',
};

const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#242424',
    border: '1px solid #3e3e3e',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
};

const fileInputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#242424',
    border: '1px dashed #4e4e4e',
    borderRadius: '6px',
    padding: '12px',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
};

const tabButtonStyle = {
    border: 'none',
    borderRadius: '500px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
};

const submitButtonStyle = {
    backgroundColor: '#1db954',
    color: '#000',
    fontWeight: '700',
    fontSize: '14px',
    padding: '12px 20px',
    borderRadius: '500px',
    border: 'none',
    marginTop: '6px',
};
