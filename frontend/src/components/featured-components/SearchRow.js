import React, { useEffect, useState } from 'react'
import axios from 'axios'

import musicService from '../../services/api'
import SearchRowTitle from './SearchRowTitle'
import SearchRowGrid from './SearchRowGrid'

export default function SearchRow({ title, type, query }) {
    const [result, setResult] = useState([])

    useEffect(() => {
        const trimmed = (query || '').trim()
        if (!trimmed) {
            setResult([])
            return
        }

        const cancelSource = axios.CancelToken.source()

        musicService.search(trimmed, cancelSource.token)
            .then((data) => {
                if (data.success) {
                    if (type === 'track') {
                        setResult(data.musics || [])
                    } else if (type === 'album') {
                        setResult(data.albums || [])
                    } else if (type === 'artist') {
                        setResult(data.artists || [])
                    } else {
                        setResult([])
                    }
                } else {
                    setResult([])
                }
            })
            .catch((error) => {
                if (!axios.isCancel(error)) {
                    console.error('Search error:', error)
                    setResult([])
                }
            })

        return () => cancelSource.cancel()
    }, [query, type])

    return (
        <div className='CollectionRow' style={{ display: result.length === 0 ? 'none' : 'grid' }}>
            <SearchRowTitle title={title} />
            <SearchRowGrid type={type} info={result} />
        </div>
    )
}

