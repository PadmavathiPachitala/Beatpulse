import React, {useEffect, useState, useContext} from 'react'
import axios from 'axios'
import {useLocation} from 'react-router-dom'


import PageBanner from '../featured-components/PageBanner'
import PlayListFunctions from '../featured-components/PlayListFunctions'
import TrackList from '../featured-components/TrackList'
import Loading from '../featured-components/Loading'

import useId from '../../utilities/hooks/useId'
import useInfiScroll from '../../utilities/hooks/useInfiScroll'
import {MessageContext, PlayContext} from '../../utilities/context'
import musicService from '../../services/api'

export default function AlbumPage() {
    const id = useId()
    const setMessage = useContext(MessageContext)
    const updatePlayer = useContext(PlayContext)
    const [loading, setLoading] = useState(true)
    const [follow, setFollow] = useState(false)

    const highlight = useHighlight()

    const [bannerInfo, setbannerInfo] = useState({
        album_type: 'ALBUM',
        name: '',
        description: '',
        user: [],
        followers: 0,
        primary_color: '#262626',
        images: [],
        release_date: ''
    })

    const [tracks, setTracks] = useState([])
    const [setNext, lastRef] = useInfiScroll(setTracks)

    useEffect(() => {
        setTracks([])
        setNext(null)
        setbannerInfo({
            album_type: 'ALBUM',
            name: '',
            description: '',
            user: [],
            followers: 0,
            primary_color: '#262626',
            images: [],
            release_date: ''
        })
        setLoading(true)

        if (!id) {
            setLoading(false);
            return;
        }

        const cancelSource = axios.CancelToken.source()

        musicService.getAlbumById(id, cancelSource.token)
            .then((res) => {
                if (res.success && res.album) {
                    const album = res.album
                    setbannerInfo({
                        album_type: 'ALBUM',
                        name: album.title,
                        description: album.description,
                        user: album.artists,
                        followers: 0,
                        primary_color: '#1db954',
                        images: album.images,
                        release_date: album.createdAt ? new Date(album.createdAt).getFullYear().toString() : '2026'
                    })
                    setTracks(album.tracks.items)
                    setNext(null)
                } else {
                    setMessage(res.error || 'Album not found')
                }
                setLoading(false)
            })
            .catch((error) => {
                if (!axios.isCancel(error)) {
                    setLoading(false)
                    setMessage(`ERROR: ${error.message}`)
                }
            })

        return () => cancelSource.cancel()
    // eslint-disable-next-line
    }, [id])

    const playContext = () => {
        if (tracks && tracks.length > 0) {
            updatePlayer(tracks[0], tracks);
        } else {
            setMessage('No tracks available in this album');
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

    return (
        loading ? 
        <Loading />
        :
        <div className='listPage'>
            <PageBanner pageTitle={bannerInfo.album_type} bannerInfo={bannerInfo}/>
            <div className="playListContent">
                <PlayListFunctions 
                    onFollow={() => {
                        setFollow(!follow);
                        setMessage(!follow ? 'Saved to your Library' : 'Removed from your Library');
                    }} 
                    follow={follow}
                    setMessage={setMessage} 
                    playContext={playContext}
                    tracks={tracks}
                    albumId={id}
                />
                <div className="page-content">
                    <TrackList ref={lastRef} tracks={tracks} highlight={highlight} playContextTrack={playContextTrack}/>
                </div>
            </div>
        </div>
    )
}


function useHighlight(){
    return new URLSearchParams(useLocation().search).get('highlight')
}