import React, { useState } from 'react';
import { Route, useLocation } from 'react-router-dom';

import Headerbar from './Headerbar'
import PageContent from './PageContent'

import HistoryNav from './HistoryNav'
import UserPrompt from './UserPrompt'
import SearchBar from './SearchBar'
import UserInfo from './UserInfo'
import CollectionNav from './CollectionNav'


function Featured (props){
    const loggedIn = props.loggedIn
    const [query, setQuery] = useState('')
    const location = useLocation()

    const resetQuery = ()=>{
        setQuery('')
    }

    return (
        <div className='featured'>
            <Headerbar>
                <HistoryNav />

                {location.pathname !== '/search' && (
                    <div className="mobile-header-brand">
                        <div className="mobile-logo-badge">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12h3l3-7 4 14 4-9 3 5h3" />
                            </svg>
                        </div>
                        <span className="mobile-brand-title">Beat<span>Pulse</span></span>
                    </div>
                )}

                <Route exact path='/search'>
                    <SearchBar query={query} setQuery={setQuery} resetQuery={resetQuery}/>
                </Route>

                <Route path='/collection'>
                    <CollectionNav/>
                </Route>

                {loggedIn ? (
                    <UserInfo onOpenStudio={props.onOpenStudio} onLogout={props.onLogout} />
                ) : (
                    <UserPrompt />
                )}

            </Headerbar>

            <PageContent query={query} {...props}/>
        </div>
    );
}

export default Featured;

