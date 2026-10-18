import React from 'react'

export default function CardInfo({ title, description, isCurrent }) {
    return (
        <div className="CardInfo">
            <h2 
                className="card-title-text"
                style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    lineHeight: '19px',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    color: isCurrent ? '#1db954' : '#ffffff',
                    margin: '0 0 4px 0',
                    textShadow: isCurrent ? '0 0 8px rgba(29, 185, 84, 0.35)' : 'none',
                    transition: 'color 0.2s ease, text-shadow 0.2s ease'
                }} 
                title={title}
            >
                {title}
            </h2>
            <p 
                className="card-artist-text"
                style={{
                    fontSize: '12px',
                    fontWeight: '400',
                    lineHeight: '16px',
                    color: '#b3b3b3',
                    margin: 0,
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                }} 
                title={description}
            >
                {description}
            </p>
        </div>
    )
}