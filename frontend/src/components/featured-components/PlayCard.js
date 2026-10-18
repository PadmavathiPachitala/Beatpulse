import React, { useContext, useRef } from 'react';
import { useHistory } from 'react-router-dom';

import CardInfo from './CardInfo';
import CardDisplay from './CardDisplay';
import Icon from '../icons';

import { PlayContext, MessageContext, CurrentTrackContext } from '../../utilities/context';
import musicService from '../../services/api';

const PlayCard = React.forwardRef(({ info, type, queue }, ref) => {
    const history = useHistory();
    const setMessage = useContext(MessageContext);
    const updatePlayer = useContext(PlayContext);
    const currentTrackContext = useContext(CurrentTrackContext);
    const cardWrapperRef = useRef(null);

    if (!info) return null;

    const { name, title, id, _id } = info;
    const cardTitle = name || title || 'Untitled';
    const cardType = type || info.type || 'track';
    const description = returnDescription(cardType, info);

    const isTrack = cardType === 'track';

    // Extract current track object and active play state
    const currentTrack = (currentTrackContext && typeof currentTrackContext === 'object' && 'track' in currentTrackContext)
        ? currentTrackContext.track
        : currentTrackContext;
    const isPlaying = Boolean(
        currentTrackContext && typeof currentTrackContext === 'object' && 'isPlaying' in currentTrackContext
            ? currentTrackContext.isPlaying
            : currentTrack?.isPlaying
    );

    // Reliable ID / URI match
    const trackIdentifier = id || _id;
    const currentIdentifier = currentTrack ? (currentTrack.id || currentTrack._id) : null;

    const isThisTrack = Boolean(
        isTrack &&
        currentTrack && (
            (trackIdentifier && currentIdentifier && String(trackIdentifier) === String(currentIdentifier)) ||
            (info.uri && currentTrack.uri && info.uri === currentTrack.uri) ||
            (info.audioUrl && currentTrack.audioUrl && info.audioUrl === currentTrack.audioUrl) ||
            (!trackIdentifier && !currentIdentifier && cardTitle && cardTitle !== 'Untitled' && (
                (currentTrack.name && cardTitle.toLowerCase() === currentTrack.name.toLowerCase()) ||
                (currentTrack.title && cardTitle.toLowerCase() === currentTrack.title.toLowerCase())
            ))
        )
    );

    // Also support albums: if card is an album and currently playing track belongs to it
    const isThisAlbum = Boolean(
        cardType === 'album' && currentTrack && (
            (trackIdentifier && (
                (currentTrack.album?.id && String(currentTrack.album.id) === String(trackIdentifier)) ||
                (currentTrack.album?._id && String(currentTrack.album._id) === String(trackIdentifier))
            ))
        )
    );

    const isCurrentItem = isThisTrack || isThisAlbum;
    const isActivelyPlaying = isCurrentItem && isPlaying;

    let images;
    if (cardType === 'track') {
        images = info.album?.images || info.images || [];
    } else {
        images = info.images || [];
    }
    let image_url = null;
    if (images && images.length > 0 && images[0]?.url) {
        image_url = images[0].url;
    } else if (info.coverImage) {
        image_url = info.coverImage;
    }

    const getTargetUrl = () => {
        if (info.to) return info.to;
        if (cardType === 'track') {
            if (info.album && (info.album.id || info.album._id)) {
                return `/album/${info.album.id || info.album._id}?highlight=${trackIdentifier}`;
            }
            return '#';
        }
        if (cardType === 'album') return `/album/${id || _id}`;
        if (cardType === 'playlist') return `/playlist/${id || _id}`;
        if (cardType === 'artist') return `/artist/${id || _id}`;
        return `/${cardType}/${id || _id}`;
    };

    const handleCardClick = (e) => {
        if (cardType === 'track') {
            handlePlayClick(e);
            return;
        }
        const targetUrl = getTargetUrl();
        if (targetUrl && targetUrl !== '#') {
            history.push(targetUrl);
        }
    };

    const handlePlayClick = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (cardType === 'track') {
            if (isThisTrack) {
                updatePlayer();
            } else {
                const activeQueue = (queue && Array.isArray(queue) && queue.length > 0)
                    ? queue
                    : [info];
                updatePlayer(info, activeQueue);
            }
        } else if (cardType === 'album') {
            if (isThisAlbum) {
                updatePlayer();
            } else {
                musicService.getAlbumById(id || _id)
                    .then((res) => {
                        if (res.success && res.album && res.album.tracks && res.album.tracks.items.length > 0) {
                            updatePlayer(res.album.tracks.items[0], res.album.tracks.items);
                        } else {
                            setMessage('Album has no playable tracks');
                        }
                    })
                    .catch(() => setMessage('Unable to load album tracks'));
            }
        } else if (cardType === 'playlist') {
            history.push(info.to ? info.to : `/playlist/${id || _id}`);
        } else {
            history.push(`/${cardType}/${id || _id}`);
        }
    };

    return (
        <div 
            ref={cardWrapperRef}
            className={`pcWrapper ${isCurrentItem ? 'is-now-playing-wrapper' : ''}`}
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(e);
                }
            }}
            style={{ cursor: 'pointer' }}
            title={cardTitle}
        >
            <div 
                ref={ref} 
                className={`PlayCard ${isCurrentItem ? 'now-playing-card active-card' : ''}`}
            >
                <CardDisplay url={image_url} type={cardType}>
                    {isCurrentItem && (
                        <div 
                            className={`card-playing-indicator ${isActivelyPlaying ? 'animating' : 'paused'}`} 
                            title={isActivelyPlaying ? 'Playing' : 'Paused'}
                        >
                            <span className="eq-bar-mini eq-1" />
                            <span className="eq-bar-mini eq-2" />
                            <span className="eq-bar-mini eq-3" />
                        </div>
                    )}
                    <button 
                        className={`smallButton no-outline ${isCurrentItem ? 'is-active-button' : ''} ${isActivelyPlaying ? 'playing-small-button' : ''}`} 
                        title={isActivelyPlaying ? `Pause ${cardTitle}` : `Play ${cardTitle}`} 
                        onClick={handlePlayClick}
                        type="button"
                        aria-label={isActivelyPlaying ? `Pause ${cardTitle}` : `Play ${cardTitle}`}
                    >
                        <Icon name={isActivelyPlaying ? "Pause" : "Play"} height='16' width='16'/>
                    </button>
                </CardDisplay>
                <CardInfo 
                    title={cardTitle} 
                    description={description} 
                    isCurrent={isCurrentItem} 
                />
            </div>
        </div>
    );
});

function returnDescription(type, info) {
    if (!info) return '';
    let artists;
    switch (type) {
        case 'playlist':
            return info.description || (info.owner ? `By ${info.owner.display_name}` : 'Playlist');
        case 'album':
            if (Array.isArray(info.artists)) {
                artists = info.artists.map((a) => a.name).filter(Boolean);
                return artists.join(', ') || 'Album';
            }
            return info.artist?.username || info.artistName || 'Album';
        case 'artist':
            return 'Artist';
        case 'track':
            if (Array.isArray(info.artists) && info.artists.length > 0) {
                artists = info.artists.map((a) => a.name).filter(Boolean);
                return artists.join(', ');
            }
            return info.artistName || info.artist?.username || 'Song';
        default:
            return '';
    }
}

export default PlayCard;