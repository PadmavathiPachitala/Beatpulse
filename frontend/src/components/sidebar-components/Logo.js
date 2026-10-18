import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo() {
    return (
        <Link to="/" className="logo-link no-outline" style={{ textDecoration: 'none' }}>
            <div className='logo' style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 24px 10px' }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#1db954',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(29, 185, 84, 0.4)'
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12h3l3-7 4 14 4-9 3 5h3" />
                    </svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ 
                        color: '#ffffff', 
                        fontSize: '20px', 
                        fontWeight: '800', 
                        letterSpacing: '-0.02em',
                        lineHeight: 1.1
                    }}>
                        Beat<span style={{ color: '#1db954' }}>Pulse</span>
                    </span>
                    <span style={{
                        color: '#b3b3b3',
                        fontSize: '10px',
                        fontWeight: '600',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase'
                    }}>
                        Music Stream
                    </span>
                </div>
            </div>
        </Link>
    );
}
