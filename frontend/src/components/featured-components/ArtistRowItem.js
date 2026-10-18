import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../icons';

const ArtistRowItem = ({info}) => {
    const {name, type, id, images} = info;
    let thumbNail;
    if (images && images.length > 0){
        thumbNail = images[0].url;
    }

    return (
        <div className='artistRowItem'>
            <Link to={`/${type}/${id}`}>
                <div className='artistRowThumb'>
                    {thumbNail? 
                        <img loading="lazy" src={thumbNail} style={{width:'100%', height:'100%'}} alt="" />: 
                        <div>
                            <Icon name='CD'/>
                        </div>}
                </div>
            </Link>
            <div className="artistRowName ellipsis-one-line">
                <Link to={`/${type}/${id}`}>{name}</Link>
            </div>
        </div>
    );
}

export default ArtistRowItem;
