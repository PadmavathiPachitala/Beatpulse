import React, { useState } from 'react';
import Icon from '../icons';

export default function CreatePlaylistModal({ onClose, onCreate, initialName = '' }) {
    const [name, setName] = useState(initialName || 'My Playlist');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please provide a playlist name');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await onCreate({ name: name.trim(), description: description.trim() });
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to create playlist');
            setSubmitting(false);
        }
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                <button 
                    style={closeButtonStyle}
                    onClick={onClose}
                    title="Close"
                    type="button"
                >
                    ✕
                </button>

                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(29, 185, 84, 0.15)',
                        color: 'var(--spotify-green)',
                        marginBottom: '12px'
                    }}>
                        <Icon name="Create" />
                    </div>
                    <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: '700', margin: '0 0 6px 0' }}>
                        Create Playlist
                    </h2>
                    <p style={{ color: '#b3b3b3', fontSize: '14px', margin: 0 }}>
                        Build a custom collection of your favorite tracks.
                    </p>
                </div>

                {error && (
                    <div style={errorBannerStyle}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={labelStyle}>Playlist Name</label>
                        <input
                            type="text"
                            style={inputStyle}
                            placeholder="My Awesome Playlist"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Description (optional)</label>
                        <textarea
                            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                            placeholder="Give your playlist a memorable description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={cancelButtonStyle}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={submitButtonStyle}
                            disabled={submitting}
                        >
                            {submitting ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    backdropFilter: 'blur(5px)'
};

const modalStyle = {
    backgroundColor: '#181818',
    borderRadius: '12px',
    padding: '32px',
    width: '100%',
    maxWidth: 'min(460px, calc(100vw - 32px))',
    boxSizing: 'border-box',
    position: 'relative',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#fff'
};

const closeButtonStyle = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    color: '#b3b3b3',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px'
};

const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '6px'
};

const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    backgroundColor: '#282828',
    border: '1px solid #3e3e3e',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
};

const submitButtonStyle = {
    padding: '12px 28px',
    backgroundColor: '#1db954',
    border: 'none',
    borderRadius: '24px',
    color: '#000',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'transform 0.1s ease, background-color 0.2s ease'
};

const cancelButtonStyle = {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '24px',
    color: '#fff',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer'
};

const errorBannerStyle = {
    backgroundColor: 'rgba(235, 87, 87, 0.15)',
    border: '1px solid #eb5757',
    color: '#ff8585',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '16px',
    textAlign: 'center'
};
