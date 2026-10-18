import React, { useState, useContext } from 'react';
import { UserContext } from '../../utilities/context';
import musicService from '../../services/api';

const UserInfo = ({ onOpenStudio, onLogout }) => {
    const [open, setOpen] = useState(false);
    const user = useContext(UserContext);

    const displayName = user.username || user.display_name || 'User';
    const role = user.role || 'user';

    const toggleOpen = () => {
        setOpen(open => !open);
    };

    const handleLogout = async () => {
        try {
            await musicService.logout();
        } catch (e) {
            console.error(e);
        }
        localStorage.removeItem('token');
        if (onLogout) {
            onLogout();
        } else {
            window.location.reload();
        }
    };

    let imgSrc = user.images && user.images.length > 0 ? user.images[0].url : null;
    if (!imgSrc) {
        imgSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=282828&color=1db954&bold=true`;
    }

    return (
        <div style={divStyle}>
            <button className='UserInfoButton no-outline' onClick={toggleOpen} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <figure style={figureStyle}>
                    <img loading='eager' src={imgSrc} style={imgStyle} alt='' />
                </figure>
                <span className='UserInfoSpan mediaNoneXL' style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{displayName}</span>
                    {role === 'artist' && (
                        <span style={artistBadgeStyle}>ARTIST</span>
                    )}
                    {role === 'admin' && (
                        <span style={adminBadgeStyle}>ADMIN</span>
                    )}
                </span>
                <span style={spanStyle} className='mediaNoneXL'> 
                    {open ? <p>&#9650;</p> : <p>&#9660;</p>}
                </span>
            </button>
            <ul className='UserInfoOptions' style={{ display: open ? 'block' : 'none' }}>
                <li style={{ padding: '8px 16px', borderBottom: '1px solid #282828', color: '#b3b3b3', fontSize: '12px' }}>
                    Role: <strong style={{ color: '#fff', textTransform: 'capitalize' }}>{role}</strong>
                </li>
                {role === 'user' && (
                    <li>
                        <button onClick={() => { setOpen(false); if (onOpenStudio) onOpenStudio('upgrade'); }}>
                            Upgrade to Artist
                        </button>
                    </li>
                )}
                {(role === 'artist' || role === 'admin') && (
                    <li>
                        <button onClick={() => { setOpen(false); if (onOpenStudio) onOpenStudio('upload'); }}>
                            Artist Studio (Upload)
                        </button>
                    </li>
                )}
                <li>
                    <button onClick={handleLogout}>Log out</button>
                </li>
            </ul>
        </div>
    );
};

const artistBadgeStyle = {
    backgroundColor: 'rgba(29, 185, 84, 0.2)',
    color: '#1db954',
    border: '1px solid #1db954',
    fontSize: '9px',
    fontWeight: '700',
    padding: '1px 5px',
    borderRadius: '4px',
    letterSpacing: '0.05em'
};

const adminBadgeStyle = {
    backgroundColor: 'rgba(233, 20, 41, 0.2)',
    color: '#e91429',
    border: '1px solid #e91429',
    fontSize: '9px',
    fontWeight: '700',
    padding: '1px 5px',
    borderRadius: '4px',
    letterSpacing: '0.05em'
};

const divStyle = {
    position: 'relative',
    whiteSpace: 'nowrap'
};

const figureStyle = {
    width: '28px',
    height: '28px',
    overflow: 'hidden',
    position: 'relative',
    display: 'inline-block'
};

const imgStyle = {
    borderRadius: '50%',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center center'
};

const spanStyle = {
    marginRight: '6px',
    marginLeft: '8px',
    fontSize: '10px'
};

export default UserInfo;
