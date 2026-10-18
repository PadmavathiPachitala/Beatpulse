import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';

import PageBanner from '../featured-components/PageBanner';
import PlayListFunctions from '../featured-components/PlayListFunctions';
import TrackList from '../featured-components/TrackList';
import Loading from '../featured-components/Loading';

import { TokenContext, UserContext, PlayContext, MessageContext } from '../../utilities/context';
import musicService, { adaptTrack } from '../../services/api';

const LikePage = () => {
    const token = useContext(TokenContext);
    const user = useContext(UserContext);
    const updatePlayer = useContext(PlayContext);
    const setMessage = useContext(MessageContext);

    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(true);

    const bannerInfo = {
        name: 'Liked Songs',
        description: 'All your favorite songs saved in one place',
        user: [user || { display_name: user?.username || 'You' }],
        followers: 0,
        primary_color: 'rgb(70, 62, 118)',
        images: [{ url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop' }],
    };

    useEffect(() => {
        const cancelSource = axios.CancelToken.source();
        setLoading(true);

        const currentToken = token || localStorage.getItem('token');
        if (currentToken) {
            musicService.getLikedSongs(currentToken, cancelSource.token)
                .then(res => {
                    if (res.success && Array.isArray(res.tracks) && res.tracks.length > 0) {
                        setTracks(res.tracks);
                    } else {
                        // Check local storage fallback
                        try {
                            const localLikes = JSON.parse(localStorage.getItem('beatpulse_liked_songs') || '[]');
                            const adapted = localLikes.map(adaptTrack).filter(Boolean);
                            setTracks(adapted);
                        } catch (e) {
                            setTracks([]);
                        }
                    }
                    setLoading(false);
                })
                .catch(err => {
                    if (!axios.isCancel(err)) {
                        setLoading(false);
                    }
                });
        } else {
            // Guest mode
            try {
                const localLikes = JSON.parse(localStorage.getItem('beatpulse_liked_songs') || '[]');
                const adapted = localLikes.map(adaptTrack).filter(Boolean);
                setTracks(adapted);
            } catch (e) {
                setTracks([]);
            }
            setLoading(false);
        }

        return () => cancelSource.cancel();
    }, [token, setMessage]);

    const playTracks = () => {
        if (tracks.length > 0) {
            updatePlayer(tracks[0], tracks);
        } else {
            setMessage('No liked songs to play');
        }
    };

    const playTrack = (uri, trackObj) => {
        const trackToPlay = trackObj || tracks.find(t => (t.uri && t.uri === uri) || (t.id && t.id === uri));
        if (trackToPlay) {
            updatePlayer(trackToPlay, tracks);
        } else if (tracks.length > 0) {
            updatePlayer(tracks[0], tracks);
        }
    };

    return (
        loading ? (
            <Loading />
        ) : (
            <div className='listPage'>
                <PageBanner pageTitle='playlist' bannerInfo={bannerInfo} />
                <div className="playListContent">
                    <div className="playListOverlay" style={{ backgroundColor: bannerInfo.primary_color }}></div>
                    {tracks.length > 0 ? (
                        <>
                            <PlayListFunctions type='playOnly' playContext={playTracks} tracks={tracks} />
                            <div className="page-content">
                                <TrackList tracks={tracks} playContextTrack={playTrack} />
                            </div>
                        </>
                    ) : (
                        <div style={{ padding: '40px 32px', color: '#b3b3b3' }}>
                            <h2 style={{ color: '#fff', fontSize: '24px', marginBottom: '8px' }}>Songs you like will appear here</h2>
                            <p style={{ fontSize: '14px', lineHeight: '20px' }}>
                                Save songs by clicking the heart icon on any track or player bar.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )
    );
};

export default LikePage;
