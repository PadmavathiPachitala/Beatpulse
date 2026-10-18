import React from 'react';

export default function Pause({ height = 24, width = 24, size }) {
    const iconHeight = size || height || 24;
    const iconWidth = size || width || 24;

    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            height={iconHeight} 
            width={iconWidth}
            viewBox="0 0 24 24"
            role="img"
            aria-hidden="true"
        >
            <rect x="5.5" y="4" width="3.5" height="16" rx="1.2" fill="currentColor" />
            <rect x="15" y="4" width="3.5" height="16" rx="1.2" fill="currentColor" />
        </svg>
    );
}

