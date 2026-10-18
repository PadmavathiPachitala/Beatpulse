import Home from './Home.js'
import Search from './Search.js'
import Library from './Library.js'
import Create from './Create.js'
import Like from './Like.js'
import Install from './Install.js'
import Back from './Back.js'
import Forward from './Forward.js'
import NSearch from './NSearch'
import Heart from './Heart'
import Play from './Play'
import Music from './Music'
import Music2 from './Music2'
import CD from './CD'
import TrackBack from './TrackBack'
import TrackNext from './TrackNext'
import Shuffle from './Shuffle'
import Repeat from './Repeat'
import Speaker from './Speaker'
import Volume from './Volume'
import Pause from './Pause'
import Microphone from './Microphone'

import React from 'react'

export default function Icon(props) {
    switch (props.name) {
        case 'Home':
            return <Home />
        case 'Search':
            return <Search />
        case 'Library':
            return <Library />
        case 'Create':
            return <Create />
        case 'Heart':
            return <Heart {...props}/>
        case 'Like':
            return <Like {...props}/>
        case 'Install':
            return <Install {...props}/>
        case 'Back':
            return <Back />
        case 'Forward':
            return <Forward />
        case 'N-Search':
            return <NSearch />
        case 'Play':
            return <Play {...props}/>
        case 'Music':
            return <Music />
        case 'Music2':
            return <Music2 />
        case 'CD':
            return <CD />
        case 'TrackBack':
            return <TrackBack />
        case 'TrackNext':
            return <TrackNext />
        case 'Shuffle':
            return <Shuffle />
        case 'Repeat':
            return <Repeat />
        case 'Speaker':
            return <Speaker />
        case 'Volume':
            return <Volume />
        case 'Pause':
            return <Pause {...props}/>
        case 'Microphone':
        case 'Lyrics':
            return <Microphone />
        case 'Options':
        case 'More':
            return (
                <svg width={props.width || 16} height={props.height || 16} viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="2.5" cy="8" r="1.5"/>
                    <circle cx="8" cy="8" r="1.5"/>
                    <circle cx="13.5" cy="8" r="1.5"/>
                </svg>
            );
        default:
            return null
    }
}
