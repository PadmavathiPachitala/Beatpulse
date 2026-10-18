import React from 'react';
import PlayCard from './PlayCard';

export default function SearchRowGrid({ type, info }) {
    if (!Array.isArray(info) || info.length === 0) return null;

    return (
        <div className="SearchRowGrid">
            {info.map((item, index) => {
                if (!item) return null;
                const uniqueKey = item.id || item._id || `search-${type}-${index}`;
                return (
                    <PlayCard 
                        key={uniqueKey} 
                        info={item} 
                        type={type} 
                        queue={info}
                    />
                );
            })}
        </div>
    );
}
