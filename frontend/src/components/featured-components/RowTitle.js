import React from 'react';
import { Link } from 'react-router-dom';

export default function RowTitle({ title, id, onScrollLeft, onScrollRight }) {
    return (
        <div className="RowTitle" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
        }}>
            <h2 style={{
                fontSize: '22px',
                lineHeight: '28px',
                letterSpacing: '-0.03em',
                fontWeight: '700',
                color: '#ffffff',
                margin: 0
            }}>
                {title}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {id && (
                    <Link to={`/genre/${id}`} className='seeAll' style={{ marginRight: '4px' }}>
                        Show all
                    </Link>
                )}
                {onScrollLeft && onScrollRight && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            type="button" 
                            onClick={onScrollLeft}
                            aria-label={`Scroll ${title} left`}
                            title="Scroll left"
                            style={scrollArrowBtnStyle}
                            className="no-outline"
                        >
                            ‹
                        </button>
                        <button 
                            type="button" 
                            onClick={onScrollRight}
                            aria-label={`Scroll ${title} right`}
                            title="Scroll right"
                            style={scrollArrowBtnStyle}
                            className="no-outline"
                        >
                            ›
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

const scrollArrowBtnStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: 'bold',
    lineHeight: '1',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    paddingBottom: '2px'
};
