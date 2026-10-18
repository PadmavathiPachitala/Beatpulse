import {createContext} from 'react'

export const UserContext = createContext({})
export const LoginContext = createContext(false)
export const TokenContext = createContext(null)
export const MessageContext = createContext(() => {})
export const PlayContext = createContext(() => {})
export const AuthModalContext = createContext(() => {})
export const CurrentTrackContext = createContext(null)
export const LyricsToggleContext = createContext(() => {})
export const CreatePlaylistContext = createContext(() => {})
