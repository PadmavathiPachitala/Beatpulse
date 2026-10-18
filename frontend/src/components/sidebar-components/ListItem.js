import React from 'react';
import {NavLink} from 'react-router-dom'

//Linked list items
function ListItem({name, id}) {
    const targetUrl = id === 'liked' ? '/tracks' : `/playlist/${id}`;
    return (
        <li className='side-list'>
            <NavLink to={targetUrl} className='list-link' activeStyle={{color: '#fff'}}>
                <div className="list-wrapper">
                    {name}
                </div>
            </NavLink>
        </li>
    );
}

export default ListItem;
