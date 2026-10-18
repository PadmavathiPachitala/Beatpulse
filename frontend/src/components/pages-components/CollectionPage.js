import React, {useState, useEffect, useContext} from 'react';
import {Route} from 'react-router-dom'
import axios from 'axios'

import CollectionRow from '../featured-components/CollectionRow'
import musicService from '../../services/api'
import {TokenContext} from '../../utilities/context'

const CollectionPage = ({playlists}) => {
    const [artists] = useState([])
    const [albums, setAlbums] = useState([])

    const token = useContext(TokenContext)

    useEffect(() => {
        const cancelSource = axios.CancelToken.source()

        musicService.getAlbums(cancelSource.token)
            .then(res => {
                if (res.success && res.albums) {
                    setAlbums(res.albums)
                }
            })
            .catch(() => {})

        return () => cancelSource.cancel()
    }, [token])

    return (
        <div className='page-content' style={{paddingTop:'16px'}}>
            <Route exact path='/collection/playlist'>
                <CollectionRow name='Playlists' playlists={playlists}/>
            </Route>
            <Route exact path='/collection/artist'>
                <CollectionRow name='Artists' playlists={artists}/>
            </Route>
            <Route exact path='/collection/album'>
                <CollectionRow name='Albums' playlists={albums}/>
            </Route>
        </div>
    );
}


export default CollectionPage;
