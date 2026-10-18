import React, { useEffect, useState } from 'react'
import axios from 'axios'
import musicService from '../../services/api'
import SearchRowTitle from '../featured-components/SearchRowTitle'
import SearchRowGrid from '../featured-components/SearchRowGrid'
import Loading from '../featured-components/Loading'

export default function QueryPage({ query }) {
    const [loading, setLoading] = useState(true)
    const [results, setResults] = useState({ musics: [], artists: [], albums: [] })

    useEffect(() => {
        const trimmed = (query || '').trim()
        if (!trimmed) {
            setResults({ musics: [], artists: [], albums: [] })
            setLoading(false)
            return
        }

        const cancelSource = axios.CancelToken.source()
        setLoading(true)

        musicService.search(trimmed, cancelSource.token)
            .then(data => {
                if (data.success) {
                    setResults({
                        musics: data.musics || [],
                        artists: data.artists || [],
                        albums: data.albums || []
                    })
                } else {
                    setResults({ musics: [], artists: [], albums: [] })
                }
                setLoading(false)
            })
            .catch(err => {
                if (!axios.isCancel(err)) {
                    console.error('Search error:', err)
                    setResults({ musics: [], artists: [], albums: [] })
                    setLoading(false)
                }
            })

        return () => cancelSource.cancel()
    }, [query])

    const hasResults = results.musics.length > 0 || results.artists.length > 0 || results.albums.length > 0

    // Only show full loading animation on initial search with no existing results
    if (loading && !hasResults) {
        return <Loading />
    }

    if (!hasResults && !loading) {
        return (
            <div className="page-content" style={{ padding: '60px 32px', textAlign: 'center' }}>
                <h2 style={{ color: '#fff', fontSize: '24px', marginBottom: '12px' }}>
                    No results found for "{query}"
                </h2>
                <p style={{ color: '#b3b3b3', fontSize: '14px', maxWidth: '520px', margin: '0 auto', lineHeight: '22px' }}>
                    Please check your spelling, try fewer keywords, or browse popular Indian & international music categories.
                </p>
            </div>
        )
    }

    return (
        <div className="page-content" style={{ opacity: loading ? 0.65 : 1, transition: 'opacity 0.2s ease' }}>
            <div className='pageContent'>
                {results.musics.length > 0 && (
                    <div className='CollectionRow'>
                        <SearchRowTitle title='Songs' />
                        <SearchRowGrid type='track' info={results.musics} />
                    </div>
                )}
                {results.artists.length > 0 && (
                    <div className='CollectionRow'>
                        <SearchRowTitle title='Artists' />
                        <SearchRowGrid type='artist' info={results.artists} />
                    </div>
                )}
                {results.albums.length > 0 && (
                    <div className='CollectionRow'>
                        <SearchRowTitle title='Albums' />
                        <SearchRowGrid type='album' info={results.albums} />
                    </div>
                )}
            </div>
        </div>
    )
}
