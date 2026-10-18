import React, { useEffect, useState, useContext } from 'react'
import axios from 'axios'

import PageTitle from '../featured-components/PageTitle'
import PlayCard from '../featured-components/PlayCard'
import Loading from '../featured-components/Loading'

import useId from '../../utilities/hooks/useId'
import { MessageContext } from '../../utilities/context'
import musicService from '../../services/api'

export default function GenrePage() {
    const id = useId()
    const setMessage = useContext(MessageContext)

    const [tracks, setTracks] = useState([])
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const cancelSource = axios.CancelToken.source()
        setLoading(true)

        if (!id) {
            setLoading(false)
            return
        }

        // Check if id corresponds to an Indian category
        musicService.getIndianCategories(cancelSource.token)
            .then(res => {
                let foundCategory = null
                if (res.success && res.categories) {
                    foundCategory = res.categories.find(c => c.id.toLowerCase() === id.toLowerCase())
                }

                if (foundCategory) {
                    setName(foundCategory.title)
                    setTracks(foundCategory.tracks || [])
                    setLoading(false)
                } else {
                    // Fallback to searching music with the genre id query
                    return musicService.search(id, cancelSource.token).then(searchRes => {
                        setName(id.charAt(0).toUpperCase() + id.slice(1))
                        setTracks(searchRes.musics || [])
                        setLoading(false)
                    })
                }
            })
            .catch(error => {
                if (!axios.isCancel(error)) {
                    setMessage(`Unable to load category: ${error.message || error}`)
                    setLoading(false)
                }
            })

        return () => {
            cancelSource.cancel()
        }
    }, [id, setMessage])

    return (
        loading ? (
            <Loading />
        ) : (
            <div className='GenrePage page-content'>
                <PageTitle name={name || id} />
                <div className="browseGrid">
                    {tracks.length > 0 ? (
                        tracks.map(track => (
                            <PlayCard key={track.id || track._id} info={track} type="track" queue={tracks} />
                        ))
                    ) : (
                        <p style={{ color: '#b3b3b3', padding: '24px 0' }}>No tracks found in this category.</p>
                    )}
                </div>
            </div>
        )
    )
}
