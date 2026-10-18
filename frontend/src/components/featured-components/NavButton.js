import React from 'react';
import { useHistory } from 'react-router-dom';
import Icon from '../icons';

export default function NavButton({ property }) {
    const history = useHistory();

    const handleClick = () => {
        if (property === 'Back') {
            history.goBack();
        } else if (property === 'Forward') {
            history.goForward();
        }
    };

    const title = property === 'Back' ? 'Go back' : 'Go forward';

    return (
        <button 
            className="navButton no-outline" 
            onClick={handleClick}
            title={title}
            aria-label={title}
            type="button"
        > 
            <Icon name={property} />
        </button>
    );
}
