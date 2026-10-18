import React, { useState, useEffect } from 'react'
import axios from 'axios'

import musicService from '../../services/api'
import BrowseCard from '../featured-components/BrowseCard'
import PageTitle from '../featured-components/PageTitle'

export default function BrowsePage() {
    const [browseItems, setBrowseItems] = useState([])

    useEffect(() => {
        const cancelSource = axios.CancelToken.source();

        Promise.all([
            musicService.getIndianCategories(cancelSource.token),
            musicService.getAlbums(cancelSource.token)
        ]).then(([catRes, albumsRes]) => {
            const items = [];
            if (catRes.success && catRes.categories) {
                catRes.categories.forEach(cat => {
                    const firstTrackImg = cat.tracks?.[0]?.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500';
                    items.push({
                        id: cat.id,
                        name: cat.title,
                        icons: [{ url: firstTrackImg }]
                    });
                });
            }
            if (albumsRes.success && albumsRes.albums) {
                albumsRes.albums.forEach(album => {
                    items.push({
                        id: album.id,
                        name: album.title || album.name,
                        icons: [{ url: album.coverImage }]
                    });
                });
            }
            setBrowseItems(items);
        }).catch((error) => {
            if (!axios.isCancel(error)) {
                console.warn('Browse page loading error:', error);
            }
        });
        
        return () => cancelSource.cancel();
    }, []);

    return (
        <div className="page-content">
            <div className='browsePage'>
                <PageTitle name='Browse All' />
                <div className="browseGrid">
                    {browseItems.map((item) => {
                        return <BrowseCard key={item.id} info={item}/>
                    })}
                </div>
            </div>
        </div>
    )
}

