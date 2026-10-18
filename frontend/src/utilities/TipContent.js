import React, { useContext } from 'react'
import PromptButton from '../components/featured-components/PromptButton'
import ReactToolTip from 'react-tooltip'
import { AuthModalContext } from './context'

export default function generateContent(dataTip){
    ReactToolTip.rebuild()
    switch(dataTip){
        case 'create':
            return <TipContent title='Create a playlist' tip='Log in to create and share playlists.'/>
        case 'list':
            return <TipContent title='Enjoy your Liked Songs' tip="Log in to see all the songs you've liked in one easy playlist."/>
        case 'library':
            return <TipContent title='Enjoy Your Library' tip="Log in to see saved songs, podcasts, artists, and playlists in Your Library."/>
        case 'play':
            return <TipContent title='Start Listening' tip="Enjoy free music streaming on Web Player."/>
        case 'like':
            return <TipContent title='Save for later' tip="Log in to save this playlist to Your Library."/>
        case 'follow':
            return <TipContent title='Follow' tip="Log in to follow artists and creators."/>
        default:
            return null
    }
}


function TipContent({title, tip}){
    const openAuth = useContext(AuthModalContext);

    return (
        <div className="tipContent">
            <h2>{title}</h2>
            <h3>{tip}</h3>
            <div className="tipOptions">
                <PromptButton name='Not Now' styleName='dark' onClick={() => ReactToolTip.hide()}/>
                <PromptButton 
                    name='Log In' 
                    styleName='light' 
                    onClick={() => {
                        ReactToolTip.hide();
                        if (openAuth) openAuth('login');
                    }}
                />
            </div>
        </div>
    )
}


