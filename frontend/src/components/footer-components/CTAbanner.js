import React, { useContext } from 'react'
import PromptButton from '../featured-components/PromptButton'
import { AuthModalContext } from '../../utilities/context'

export default function CTAbanner() {
    const openAuth = useContext(AuthModalContext)

    return (
        <div className='CTA-banner'>
            <div className="cta-content">
                <h2 style={{
                    fontSize: '12px',
                    fontWeight: '400',
                    lineHeight: '16px',
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    marginBottom: '4px'
                }}>Preview of BeatPulse</h2>
                <h3 style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    lineHeight: '24px',
                    letterSpacing: 'normal',
                    textTransform: 'none'
                }}>Sign up to listen to unlimited songs, like tracks, and upload your own music with role-based access.</h3>
            </div>
            <PromptButton name='Sign up free' styleName='CTA' onClick={() => openAuth('register')} />
        </div>
    )
}
