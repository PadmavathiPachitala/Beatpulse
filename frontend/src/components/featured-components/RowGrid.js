import React from 'react';
import PlayCard from './PlayCard';

const RowGrid = React.forwardRef(({ playlists }, ref) => {
    if (!Array.isArray(playlists) || playlists.length === 0) {
        return null;
    }

    return (
        <div className="RowGrid" ref={ref}>
            {playlists.map((item, index) => {
                if (!item) return null;
                const uniqueKey = item.id || item._id || `row-item-${index}`;
                return (
                    <PlayCard 
                        key={uniqueKey} 
                        info={item} 
                        type={item.type || 'track'} 
                        queue={playlists}
                    />
                );
            })}
        </div>
    );
});

export default RowGrid;
