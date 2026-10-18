import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import musicService from '../../services/api';
import Icon from '../icons';
import msTimeFormat from '../../utilities/utils';

export default function LyricsView({ 
    isOpen, 
    onClose, 
    track, 
    currentTimeSec, 
    currentTime, 
    onSeek,
    isPlaying = false,
    onTogglePlay,
    onSkipNext,
    onSkipPrev,
    progressMs = 0,
    durationMs = 180000,
    onSeekRatio
}) {
    const [loading, setLoading] = useState(false);
    const [lyricsData, setLyricsData] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const activeLineRef = useRef(null);
    const containerRef = useRef(null);

    const trackTitle = track?.name || track?.title || '';
    const artistName = track?.artistName || (Array.isArray(track?.artists) ? track.artists.map(a => a.name).join(', ') : track?.artist?.username || '');
    const duration = track?.duration || (track?.duration_ms ? track.duration_ms / 1000 : (durationMs ? durationMs / 1000 : 0));
    const currentSeconds = currentTimeSec !== undefined ? currentTimeSec : (currentTime || (progressMs ? progressMs / 1000 : 0));

    // Cover image fallback
    let coverUrl = '';
    if (track?.coverImage) {
        coverUrl = track.coverImage;
    } else if (track?.album?.images && track.album.images.length > 0) {
        coverUrl = track.album.images[0].url;
    }

    const trackLanguage = track?.language || (trackTitle && trackTitle.toLowerCase().includes('telugu') ? 'telugu' : '');

    // Fetch lyrics whenever current track changes
    useEffect(() => {
        if (!isOpen || !trackTitle) {
            setLyricsData(null);
            setErrorMsg('');
            return;
        }

        const cancelSource = axios.CancelToken.source();
        setLoading(true);
        setLyricsData(null);
        setErrorMsg('');

        musicService.getLyrics(trackTitle, artistName, duration, cancelSource.token, trackLanguage)
            .then((res) => {
                if (res.success && (res.plainLyrics || res.syncedLyrics)) {
                    setLyricsData(res);
                } else {
                    setErrorMsg(res.message || 'Lyrics unavailable for this track.');
                }
                setLoading(false);
            })
            .catch((err) => {
                if (!axios.isCancel(err)) {
                    console.warn('[Lyrics] Fetch error:', err.message);
                    setErrorMsg('Unable to load lyrics at this time.');
                    setLoading(false);
                }
            });

        return () => {
            cancelSource.cancel();
        };
    }, [isOpen, trackTitle, artistName, duration, trackLanguage]);

    // Calculate active synced line based on current playback time
    let activeIndex = -1;
    if (lyricsData?.isSynced && Array.isArray(lyricsData.syncedLyrics)) {
        for (let i = lyricsData.syncedLyrics.length - 1; i >= 0; i--) {
            if (currentSeconds >= lyricsData.syncedLyrics[i].time) {
                activeIndex = i;
                break;
            }
        }
    }

    // Auto-scroll to keep active line centered
    useEffect(() => {
        if (activeLineRef.current && containerRef.current) {
            activeLineRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, [activeIndex]);

    if (!isOpen) return null;

    const currentFormattedTime = msTimeFormat(progressMs || (currentSeconds * 1000));
    const totalFormattedTime = msTimeFormat(durationMs || (duration * 1000));
    const progressRatio = durationMs > 0 ? Math.min(1, Math.max(0, (progressMs || (currentSeconds * 1000)) / durationMs)) : 0;

    const handleSeekChange = (e) => {
        const ratio = parseFloat(e.target.value);
        if (onSeekRatio) {
            onSeekRatio(ratio);
        } else if (onSeek && duration > 0) {
            onSeek(ratio * duration);
        }
    };

    const modalContent = (
        <div className="lyrics-view-overlay" role="dialog" aria-modal="true" aria-label="Lyrics View">
            {/* Header */}
            <div className="lyrics-view-header">
                <div className="lyrics-view-header-left">
                    {coverUrl && (
                        <div className="lyrics-view-cover-thumb">
                            <img src={coverUrl} alt={trackTitle} />
                        </div>
                    )}
                    <div className="lyrics-view-meta">
                        <div className="lyrics-view-tag">
                            <span className="lyrics-live-badge">
                                <span className="lyrics-live-dot" />
                                {lyricsData?.isSynced ? 'Live Synced Lyrics' : 'Now Playing • Lyrics'}
                            </span>
                        </div>
                        <h2 className="lyrics-view-title ellipsis-one-line">
                            {trackTitle || 'Unknown Track'}
                        </h2>
                        <span className="lyrics-view-artist ellipsis-one-line">
                            {artistName || 'Unknown Artist'}
                        </span>
                    </div>
                </div>

                <button 
                    onClick={onClose} 
                    className="lyrics-view-close-btn no-outline"
                    title="Close lyrics"
                    type="button"
                    aria-label="Close lyrics"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Scrollable Lyrics Content */}
            <div ref={containerRef} className="lyrics-view-content">
                {loading && (
                    <div className="lyrics-view-status">
                        <div className="lyrics-pulse-dot" />
                        <p className="lyrics-status-text">
                            Finding lyrics for "{trackTitle}"...
                        </p>
                    </div>
                )}

                {!loading && errorMsg && (
                    <div className="lyrics-view-status">
                        <div className="lyrics-status-icon">♪</div>
                        <h3 className="lyrics-status-title">
                            {lyricsData?.instrumental ? "Instrumental Track" : "Lyrics Unavailable"}
                        </h3>
                        <p className="lyrics-status-subtitle">
                            {errorMsg}
                        </p>
                    </div>
                )}

                {!loading && lyricsData?.isSynced && Array.isArray(lyricsData.syncedLyrics) && (
                    <div className="lyrics-synced-list">
                        {lyricsData.syncedLyrics.map((line, idx) => {
                            const isActive = idx === activeIndex;
                            const isPast = idx < activeIndex;
                            return (
                                <div
                                    key={idx}
                                    ref={isActive ? activeLineRef : null}
                                    onClick={() => onSeek && onSeek(line.time)}
                                    className={`lyrics-synced-line ${isActive ? 'active' : ''} ${isPast ? 'past' : 'future'}`}
                                    title={`Tap to seek to ${Math.floor(line.time / 60)}:${String(Math.floor(line.time % 60)).padStart(2, '0')}`}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            if (onSeek) onSeek(line.time);
                                        }
                                    }}
                                >
                                    {line.text || '♪'}
                                </div>
                            );
                        })}
                    </div>
                )}

                {!loading && !lyricsData?.isSynced && lyricsData?.plainLyrics && (
                    <div className="lyrics-plain-container">
                        {lyricsData.plainLyrics.split('\n').map((line, idx) => (
                            <p key={idx} className="lyrics-plain-line">
                                {line || '\u00A0'}
                            </p>
                        ))}
                    </div>
                )}
            </div>

            {/* Mobile Playback Controller Bar (Visible in mobile lyrics view) */}
            <div className="lyrics-view-mobile-footer">
                <div className="lyrics-mobile-scrub-row">
                    <span className="lyrics-time-label">{currentFormattedTime}</span>
                    <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.001"
                        value={progressRatio}
                        onChange={handleSeekChange}
                        className="lyrics-mobile-range-slider"
                        aria-label="Seek track position"
                    />
                    <span className="lyrics-time-label">{totalFormattedTime}</span>
                </div>

                <div className="lyrics-mobile-controls-row">
                    <button 
                        type="button"
                        onClick={onSkipPrev}
                        className="lyrics-mobile-ctrl-btn no-outline"
                        title="Previous Track"
                        aria-label="Previous Track"
                    >
                        <Icon name="TrackBack" />
                    </button>

                    <button 
                        type="button"
                        onClick={onTogglePlay}
                        className="lyrics-mobile-play-btn no-outline"
                        title={isPlaying ? "Pause" : "Play"}
                        aria-label={isPlaying ? "Pause" : "Play"}
                    >
                        <Icon name={isPlaying ? "Pause" : "Play"} height="20" width="20" />
                    </button>

                    <button 
                        type="button"
                        onClick={onSkipNext}
                        className="lyrics-mobile-ctrl-btn no-outline"
                        title="Next Track"
                        aria-label="Next Track"
                    >
                        <Icon name="TrackNext" />
                    </button>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? ReactDOM.createPortal(modalContent, document.body) : modalContent;
}
