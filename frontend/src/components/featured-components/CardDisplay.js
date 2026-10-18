import React, { useState } from 'react';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop';

export default function CardDisplay({ url, type, children }) {
    const isArtist = type === 'artist';
    const borderRadius = isArtist ? '50%' : '8px';
    const [imgSrc, setImgSrc] = useState(url || FALLBACK_IMAGE);

    // Sync image if url changes
    React.useEffect(() => {
        setImgSrc(url || FALLBACK_IMAGE);
    }, [url]);

    return (
        <div className="CardDisplay" style={{ borderRadius, position: 'relative', overflow: 'hidden' }}>
            <img 
                src={imgSrc} 
                loading="lazy" 
                className="previewImg" 
                style={{ borderRadius, objectFit: 'cover' }} 
                alt="" 
                onError={() => {
                    if (imgSrc !== FALLBACK_IMAGE) {
                        setImgSrc(FALLBACK_IMAGE);
                    }
                }}
            />
            {children}
        </div>
    );
}


