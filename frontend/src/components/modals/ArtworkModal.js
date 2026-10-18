import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../icons';

export default function ArtworkModal({
    isOpen,
    onClose,
    imageUrl,
    track,
    artistList = [],
    album,
    isLiked,
    onToggleLike
}) {
    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const trackName = track?.name || track?.title || 'Unknown Track';
    const albumName = album?.name || album?.title;
    const albumId = album?.id || album?._id;
    const trackId = track?.id || track?._id;

    return (
        <div 
            className="artwork-modal-backdrop"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`${trackName} Artwork`}
        >
            <div 
                className="artwork-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with collapse button */}
                <div className="artwork-modal-header">
                    <div className="artwork-modal-header-left">
                        <span className="artwork-modal-subtitle">NOW PLAYING</span>
                    </div>
                    <button
                        className="artwork-modal-close-btn no-outline"
                        onClick={onClose}
                        title="Collapse artwork (Esc)"
                        aria-label="Collapse artwork"
                        type="button"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>

                {/* Main Large Artwork Image */}
                <div className="artwork-image-container">
                    {imageUrl ? (
                        <img 
                            src={imageUrl} 
                            alt={trackName} 
                            className="artwork-large-img"
                            draggable="false"
                        />
                    ) : (
                        <div className="artwork-fallback-box">
                            <Icon name="Music2" />
                        </div>
                    )}
                    {/* Subtle ambient glow behind artwork */}
                    {imageUrl && (
                        <div 
                            className="artwork-ambient-glow"
                            style={{ backgroundImage: `url(${imageUrl})` }}
                            aria-hidden="true"
                        />
                    )}
                </div>

                {/* Track Details & Actions */}
                <div className="artwork-modal-footer">
                    <div className="artwork-info-text">
                        <h2 className="artwork-track-title" title={trackName}>
                            {albumId ? (
                                <Link to={`/album/${albumId}?highlight=${trackId}`} onClick={onClose}>
                                    {trackName}
                                </Link>
                            ) : (
                                <span>{trackName}</span>
                            )}
                        </h2>

                        <div className="artwork-artist-row">
                            {artistList && artistList.length > 0 ? (
                                artistList.map((artist, idx) => (
                                    artist.id ? (
                                        <Link 
                                            to={`/artist/${artist.id}`} 
                                            key={artist.id || idx}
                                            onClick={onClose}
                                            className="artwork-artist-link"
                                        >
                                            {artist.name}{idx < artistList.length - 1 ? ', ' : ''}
                                        </Link>
                                    ) : (
                                        <span key={idx} className="artwork-artist-name">
                                            {artist.name}{idx < artistList.length - 1 ? ', ' : ''}
                                        </span>
                                    )
                                ))
                            ) : (
                                <span className="artwork-artist-name">
                                    {track?.artistName || 'Artist'}
                                </span>
                            )}
                            {albumName && (
                                <>
                                    <span className="artwork-info-dot">•</span>
                                    <span className="artwork-album-name">{albumName}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Action buttons (Like heart) */}
                    {typeof onToggleLike === 'function' && (
                        <div className="artwork-modal-actions">
                            <button
                                className={`artwork-heart-btn no-outline ${isLiked ? 'liked' : ''}`}
                                onClick={onToggleLike}
                                title={isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
                                type="button"
                                aria-label={isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
                            >
                                <Icon name="Heart" fill={isLiked} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
