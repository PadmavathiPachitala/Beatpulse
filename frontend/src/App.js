import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Axios from 'axios';

import Sidebar from './components/sidebar-components/Sidebar.js';
import Logo from './components/sidebar-components/Logo.js';
import NavList from './components/sidebar-components/NavList.js';
import NavItem from './components/sidebar-components/NavItem.js';
import PlayLists from './components/sidebar-components/PlayLists.js';
import FeaturedPlaylist from './components/sidebar-components/FeaturedPlaylist.js';
import FeaturedItem from './components/sidebar-components/FeaturedItem.js';
import OtherPlaylist from './components/sidebar-components/OtherPlaylist.js';
import Footer from './components/footer-components/Footer.js';
import CTAbanner from './components/footer-components/CTAbanner';
import Player from './components/footer-components/Player';
import Featured from './components/featured-components/Featured.js';
import Loading from './components/featured-components/Loading.js';
import MobileNav from './components/sidebar-components/MobileNav.js';
import AuthModal from './components/modals/AuthModal';
import ArtistStudioModal from './components/modals/ArtistStudioModal';
import CreatePlaylistModal from './components/modals/CreatePlaylistModal';

import {
  UserContext,
  LoginContext,
  TokenContext,
  MessageContext,
  PlayContext,
  AuthModalContext,
  CurrentTrackContext,
  LyricsToggleContext,
  CreatePlaylistContext
} from './utilities/context';
import musicService from './services/api';

function App() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setloggedIn] = useState(false);
  const [token, setToken] = useState(null);
  const [userInfo, setuserInfo] = useState({});
  const [playlists, setPlaylists] = useState([]);

  const [status, setStatus] = useState(false);
  const [message, setMessage] = useState('');
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);


  // Modals state
  const [authModal, setAuthModal] = useState({ open: false, mode: 'login' });
  const [studioModal, setStudioModal] = useState({ open: false, initialTab: 'upload' });
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);

  const timerRef = useRef(null);
  const playerRef = useRef(null);

  const setStatusMessage = useCallback((msg) => {
    clearTimeout(timerRef.current);
    setStatus(true);
    setMessage(msg);
    timerRef.current = setTimeout(() => {
      setStatus(false);
    }, 3500);
  }, []);

  const refreshPlaylist = useCallback(() => {
    const currentToken = token || localStorage.getItem('token');
    musicService.getUserPlaylists(currentToken)
      .then((res) => {
        if (res.success && Array.isArray(res.playlists)) {
          setPlaylists(res.playlists);
        }
      })
      .catch(() => {});
  }, [token]);

  // Initialize session on mount (only when token is explicitly in localStorage)
  useEffect(() => {
    const cancelSource = Axios.CancelToken.source();
    const storedToken = localStorage.getItem('token');

    if (storedToken) {
      musicService.getMe(storedToken)
        .then((res) => {
          if (res.success && res.user) {
            setToken(storedToken);
            setuserInfo(res.user);
            setloggedIn(true);
          } else {
            localStorage.removeItem('token');
            setToken(null);
            setuserInfo({});
            setloggedIn(false);
          }
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
          setuserInfo({});
          setloggedIn(false);
          setLoading(false);
        });
    } else {
      setToken(null);
      setuserInfo({});
      setloggedIn(false);
      setLoading(false);
    }

    return () => {
      cancelSource.cancel();
      clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    refreshPlaylist();
  }, [loggedIn, refreshPlaylist]);

  const openAuth = useCallback((mode = 'login') => {
    setAuthModal({ open: true, mode });
  }, []);

  const handleAuthSuccess = ({ token: newToken, user: newUser }) => {
    setToken(newToken);
    setuserInfo(newUser);
    setloggedIn(true);
    setStatusMessage(`Welcome, ${newUser.username}!`);
    if (newToken) {
      localStorage.setItem('token', newToken);
      musicService.getUserPlaylists(newToken).then((res) => {
        if (res.success && Array.isArray(res.playlists)) {
          setPlaylists(res.playlists);
        }
      });
    }
  };

  const handleLogout = async () => {
    try {
      await musicService.logout();
    } catch (e) {}
    localStorage.removeItem('token');
    localStorage.removeItem('beatpulse_token');
    setToken(null);
    setuserInfo({});
    setloggedIn(false);
    setPlaylists([]);
    setStatusMessage('You have logged out.');
  };

  const handleRoleUpdated = (updatedUser, newToken) => {
    setuserInfo(updatedUser);
    if (newToken) {
      setToken(newToken);
      localStorage.setItem('token', newToken);
    }
    setStatusMessage(`Account role updated to ${updatedUser.role}!`);
  };

  const updatePlayer = useCallback((trackOrArg, queue) => {
    if (playerRef.current) {
      if (trackOrArg && (trackOrArg.uri || trackOrArg.audioUrl || typeof trackOrArg === 'string')) {
        setCurrentTrack(trackOrArg);
        playerRef.current.playTrack(trackOrArg, queue);
      } else if (playerRef.current.updateState) {
        playerRef.current.updateState();
      }
    }
  }, []);

  const handleCreatePlaylist = async ({ name, description }) => {
    const currentToken = token || localStorage.getItem('token');
    const res = await musicService.createPlaylist(name, description, currentToken);
    if (res.success && res.playlist) {
      setPlaylists((prev) => [res.playlist, ...prev.filter((p) => p.id !== res.playlist.id)]);
      setStatusMessage(`Playlist "${res.playlist.name}" created!`);
    } else {
      throw new Error(res.error || 'Failed to create playlist');
    }
  };

  const currentTrackContextValue = useMemo(() => {
    return {
      track: currentTrack,
      ...currentTrack,
      isPlaying
    };
  }, [currentTrack, isPlaying]);


  return (
    <div className="App">
      {loading ? (
        <Loading type="app" />
      ) : (
        <MessageContext.Provider value={setStatusMessage}>
          <LoginContext.Provider value={loggedIn}>
            <AuthModalContext.Provider value={openAuth}>
              <CreatePlaylistContext.Provider value={() => setCreatePlaylistOpen(true)}>
                <Sidebar>
                  <Logo />
                  <NavList>
                    <NavItem to="/" exact={true} name="Home" label="Home" />
                    <NavItem to="/search" exact={true} name="Search" label="Search" />
                    <NavItem
                      to="/tracks"
                      exact={false}
                      name="Library"
                      label="Your Library"
                      data_tip="library"
                      data_for="tooltip"
                      data_event="click"
                      style={{ pointerEvents: loggedIn ? 'auto' : 'none' }}
                    />
                  </NavList>
                  <PlayLists
                    top={
                    <FeaturedPlaylist>
                        <FeaturedItem label="Liked Songs" loggedIn={loggedIn} />
                      </FeaturedPlaylist>
                    }
                    bottom={<OtherPlaylist playlists={playlists} />}
                  />
                </Sidebar>

                <CurrentTrackContext.Provider value={currentTrackContextValue}>
                  <LyricsToggleContext.Provider value={() => playerRef.current?.toggleLyrics && playerRef.current.toggleLyrics()}>
                    <PlayContext.Provider value={updatePlayer}>
                      <TokenContext.Provider value={token}>
                        <UserContext.Provider value={userInfo}>
                          <Featured
                            loggedIn={loggedIn}
                            playlists={playlists}
                            refreshPlaylist={refreshPlaylist}
                            message={message}
                            status={status}
                            onOpenStudio={(tab) => setStudioModal({ open: true, initialTab: tab })}
                            onLogout={handleLogout}
                          />
                          <Footer>
                            {!loggedIn && <CTAbanner />}
                            <Player 
                              token={token} 
                              ref={playerRef} 
                              onTrackChange={(t) => setCurrentTrack(t)}
                              onPlaybackChange={(playing) => setIsPlaying(playing)}
                            />
                            <MobileNav loggedIn={loggedIn} onOpenAuth={openAuth} />
                          </Footer>
                        </UserContext.Provider>
                      </TokenContext.Provider>
                    </PlayContext.Provider>
                  </LyricsToggleContext.Provider>
                </CurrentTrackContext.Provider>

                {/* Authentication Modal */}
                {authModal.open && (
                  <AuthModal
                    initialMode={authModal.mode}
                    onClose={() => setAuthModal({ open: false, mode: 'login' })}
                    onSuccess={handleAuthSuccess}
                  />
                )}

                {/* Create Playlist Modal */}
                {createPlaylistOpen && (
                  <CreatePlaylistModal
                    onClose={() => setCreatePlaylistOpen(false)}
                    onCreate={handleCreatePlaylist}
                    initialName={`My Playlist #${playlists.length + 1}`}
                  />
                )}

                {/* Artist Studio & Upload Modal */}
                {studioModal.open && (
                  <ArtistStudioModal
                    user={userInfo}
                    token={token}
                    onClose={() => setStudioModal({ open: false, initialTab: 'upload' })}
                    onRoleUpdated={handleRoleUpdated}
                    onRefreshCatalog={() => {
                      setStatusMessage('Catalog updated!');
                    }}
                  />
                )}
              </CreatePlaylistContext.Provider>
            </AuthModalContext.Provider>
          </LoginContext.Provider>
        </MessageContext.Provider>
      )}
    </div>
  );
}

export default App;
