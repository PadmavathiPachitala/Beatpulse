import React from 'react';
import { Link } from 'react-router-dom';

export default function BrowseCard({ info }) {
    const { icons, name, id } = info;
    const img_link = icons?.[0]?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500';

    return (
        <div className="browseLinkContainer">
            <Link to={`/genre/${id}`} className="browseLink">
                <h3 style={titleStyle}>{name}</h3>
                <div style={overlayStyle}></div>
                <img loading="lazy" src={img_link} alt="" />
            </Link>
        </div>
    );
}

const titleStyle = {
    fontSize: '20px',
    fontWeight: '800',
    padding: '16px',
    lineHeight: '1.25em',
    letterSpacing: '-0.02em',
    overflowWrap: 'break-word',
    position: 'absolute',
    zIndex: '2',
    top: '0',
    left: '0',
    textAlign: 'left',
    margin: '0',
    maxWidth: '85%',
    color: '#ffffff',
    textShadow: '0 2px 8px rgba(0,0,0,0.6)'
};

const overlayStyle = {
    background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.6) 100%)',
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '1',
    transition: 'background 0.3s ease'
};