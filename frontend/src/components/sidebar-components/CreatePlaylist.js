import React, { useContext } from 'react';
import Icon from '../icons';
import { CreatePlaylistContext } from '../../utilities/context';

function CreatePlaylist() {
    const openCreatePlaylist = useContext(CreatePlaylistContext);

    const handleClick = () => {
        if (openCreatePlaylist) {
            openCreatePlaylist();
        }
    };

    return (
        <button 
            className="create-button no-outline" 
            onClick={handleClick}
            title="Create Playlist"
            type="button"
        >
            <div className="playlist-icon">
                <Icon name="Create" />
            </div>
            <span className="featured-label">Create Playlist</span>
        </button>
    );
}

export default CreatePlaylist;
