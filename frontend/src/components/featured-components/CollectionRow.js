import React, { useRef } from 'react';
import RowTitle from './RowTitle';
import RowGrid from './RowGrid';

const CollectionRow = React.forwardRef(({ name, playlists, id }, ref) => {
    const gridRef = useRef(null);

    const scrollLeft = () => {
        if (gridRef.current) {
            gridRef.current.scrollBy({ left: -420, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (gridRef.current) {
            gridRef.current.scrollBy({ left: 420, behavior: 'smooth' });
        }
    };

    if (!Array.isArray(playlists) || playlists.length === 0) {
        return null;
    }

    return (
        <div className="CollectionRow" style={{ marginBottom: '36px' }}>
            <RowTitle 
                title={name} 
                id={id} 
                onScrollLeft={scrollLeft} 
                onScrollRight={scrollRight} 
            />
            <RowGrid 
                ref={(node) => {
                    gridRef.current = node;
                    if (typeof ref === 'function') ref(node);
                    else if (ref) ref.current = node;
                }} 
                playlists={playlists} 
            />
        </div>
    );
});

export default CollectionRow;