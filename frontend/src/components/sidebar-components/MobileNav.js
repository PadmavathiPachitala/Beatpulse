import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '../icons';

export default function MobileNav({ loggedIn, onOpenAuth }) {
    return (
        <nav className="mobile-bottom-nav">
            <NavLink 
                exact 
                to="/" 
                className="mobile-nav-item" 
                activeClassName="active"
            >
                <div className="mobile-nav-icon"><Icon name="Home" /></div>
                <span>Home</span>
            </NavLink>

            <NavLink 
                exact 
                to="/search" 
                className="mobile-nav-item" 
                activeClassName="active"
            >
                <div className="mobile-nav-icon"><Icon name="Search" /></div>
                <span>Search</span>
            </NavLink>

            <NavLink 
                to="/collection" 
                className="mobile-nav-item" 
                activeClassName="active"
                onClick={(e) => {
                    if (!loggedIn && onOpenAuth) {
                        e.preventDefault();
                        onOpenAuth('login');
                    }
                }}
            >
                <div className="mobile-nav-icon"><Icon name="Library" /></div>
                <span>Library</span>
            </NavLink>

            <NavLink 
                to="/tracks" 
                className="mobile-nav-item" 
                activeClassName="active"
                onClick={(e) => {
                    if (!loggedIn && onOpenAuth) {
                        e.preventDefault();
                        onOpenAuth('login');
                    }
                }}
            >
                <div className="mobile-nav-icon"><Icon name="Like" size="sm" /></div>
                <span>Liked</span>
            </NavLink>
        </nav>
    );
}
