import React, { useState } from 'react';
import Icon from '../icons';
import musicService from '../../services/api';

export default function AuthModal({ initialMode = 'login', onClose, onSuccess }) {
    const [mode, setMode] = useState(initialMode); // 'login' or 'register'
    const [identifier, setIdentifier] = useState(''); // username or email for login
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isArtist, setIsArtist] = useState(false);
    const [artistKey, setArtistKey] = useState('');
    const [showKeyInput, setShowKeyInput] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'login') {
                if (!identifier.trim() || !password) {
                    setError('Please enter your username/email and password.');
                    setLoading(false);
                    return;
                }
                const res = await musicService.login(identifier.trim(), password);
                if (res.success && res.token) {
                    localStorage.setItem('token', res.token);
                    onSuccess({ token: res.token, user: res.user });
                    onClose();
                } else {
                    setError(res.error || 'Invalid credentials');
                }
            } else {
                if (!username.trim() || !email.trim() || !password) {
                    setError('All fields are required.');
                    setLoading(false);
                    return;
                }
                const role = isArtist ? 'artist' : 'user';
                const key = isArtist ? artistKey.trim() : '';
                const res = await musicService.register(username.trim(), email.trim(), password, role, key);
                if (res.success && res.token) {
                    localStorage.setItem('token', res.token);
                    onSuccess({ token: res.token, user: res.user });
                    onClose();
                    return;
                } else {
                    setError(res.error || 'Registration failed');
                }
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred');
        }
        setLoading(false);
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
                <button style={closeButtonStyle} onClick={onClose} title="Close">
                    ✕
                </button>

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'inline-block', marginBottom: '12px' }}>
                        <Icon name="Music2" />
                    </div>
                    <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', margin: '0 0 8px 0' }}>
                        {mode === 'login' ? 'Log in to BeatPulse' : 'Sign up to start listening'}
                    </h2>
                    <p style={{ color: '#b3b3b3', fontSize: '14px', margin: 0 }}>
                        {mode === 'login'
                            ? 'Stream your favorite tracks and manage your library'
                            : 'Create an account to like songs, browse albums, or upload music'}
                    </p>
                </div>

                {error && (
                    <div style={errorBannerStyle}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {mode === 'login' ? (
                        <div>
                            <label style={labelStyle}>Username or Email</label>
                            <input
                                type="text"
                                style={inputStyle}
                                placeholder="Username or email"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                autoFocus
                                autoComplete="username"
                                required
                            />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label style={labelStyle}>Username</label>
                                <input
                                    type="text"
                                    style={inputStyle}
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    autoFocus
                                    autoComplete="username"
                                    required
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Email Address</label>
                                <input
                                    type="email"
                                    style={inputStyle}
                                    placeholder="name@domain.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label style={labelStyle}>Password</label>
                        <input
                            type="password"
                            style={inputStyle}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            required
                        />
                    </div>

                    {mode === 'register' && (
                        <div style={{ marginTop: '4px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff', fontSize: '13px' }}>
                                <input
                                    type="checkbox"
                                    checked={isArtist}
                                    onChange={(e) => setIsArtist(e.target.checked)}
                                    style={{ accentColor: '#1db954', width: '16px', height: '16px' }}
                                />
                                <span>I want to register as an <strong>Artist</strong> (Upload music)</span>
                            </label>

                            {isArtist && (
                                <div style={{
                                    marginTop: '10px',
                                    padding: '10px 12px',
                                    backgroundColor: 'rgba(29, 185, 84, 0.1)',
                                    border: '1px solid rgba(29, 185, 84, 0.3)',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#1db954', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                                        <span style={{ fontSize: '12px', color: '#e0e0e0', lineHeight: '1.4' }}>
                                            <strong>Creator Mode enabled:</strong> You will be able to upload MP3 tracks and publish albums right after signing up.
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setShowKeyInput(!showKeyInput)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#888',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                            padding: 0,
                                            textAlign: 'left',
                                            marginTop: '4px'
                                        }}
                                    >
                                        {showKeyInput ? 'Hide private invitation key field' : 'Have a private invitation key? (Optional)'}
                                    </button>

                                    {showKeyInput && (
                                        <div style={{ marginTop: '6px' }}>
                                            <input
                                                type="password"
                                                style={inputStyle}
                                                placeholder="Enter private key (Optional)"
                                                value={artistKey}
                                                onChange={(e) => setArtistKey(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
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
                        {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Sign Up'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '24px', borderTop: '1px solid #282828', paddingTop: '16px' }}>
                    {mode === 'login' ? (
                        <p style={{ color: '#b3b3b3', fontSize: '13px', margin: 0 }}>
                            Don't have an account?{' '}
                            <button
                                type="button"
                                onClick={() => { 
                                    setMode('register'); 
                                    setError(''); 
                                    setPassword('');
                                    setIdentifier('');
                                }}
                                style={switchModeButtonStyle}
                            >
                                Sign up for BeatPulse
                            </button>
                        </p>
                    ) : (
                        <p style={{ color: '#b3b3b3', fontSize: '13px', margin: 0 }}>
                            Already have an account?{' '}
                            <button
                                type="button"
                                onClick={() => { 
                                    setMode('login'); 
                                    setError(''); 
                                    setPassword('');
                                    setUsername('');
                                    setEmail('');
                                }}
                                style={switchModeButtonStyle}
                            >
                                Log in
                            </button>
                        </p>
                    )}
                </div>
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
    padding: '36px 32px',
    width: '420px',
    maxWidth: '92vw',
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
    borderRadius: '50%',
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
    padding: '12px 14px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
};

const errorBannerStyle = {
    backgroundColor: '#e91429',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '16px',
    textAlign: 'center',
};

const submitButtonStyle = {
    backgroundColor: '#1db954',
    color: '#000',
    fontWeight: '700',
    fontSize: '14px',
    padding: '14px 20px',
    borderRadius: '500px',
    border: 'none',
    marginTop: '8px',
    transition: 'transform 0.1s ease',
};

const switchModeButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#fff',
    textDecoration: 'underline',
    fontWeight: '700',
    cursor: 'pointer',
    padding: 0,
    fontSize: '13px',
};
