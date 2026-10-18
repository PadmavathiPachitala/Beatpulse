import React, { useContext } from 'react'
import PromptButton from './PromptButton'
import { AuthModalContext } from '../../utilities/context'

export default function UserPrompt() {
    const openAuth = useContext(AuthModalContext)

    return (
        <div className='UserPrompt'>
            <PromptButton name='Sign Up' styleName='dark' onClick={() => openAuth('register')} />
            <PromptButton name='Log In' styleName='light' onClick={() => openAuth('login')} />
        </div>
    )
}
