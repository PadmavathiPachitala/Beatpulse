import React, { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Icon from "../icons";
import { MessageContext, UserContext, TokenContext } from "../../utilities/context";
import musicService from "../../services/api";
import AddToPlaylistPopover from "../featured-components/AddToPlaylistPopover";
import ArtworkModal from "../modals/ArtworkModal";

export default function NowPlaying({ playInfo, token: propToken, showLyrics, toggleLyrics }) {
	const setMessage = useContext(MessageContext);
	const user = useContext(UserContext);
	const contextToken = useContext(TokenContext);
	const token = propToken || contextToken || localStorage.getItem("token");

	const { album, artists, name, id, _id } = playInfo;
	const [isLiked, setIsLiked] = useState(false);
	const [loadingLike, setLoadingLike] = useState(false);
	const [artworkOpen, setArtworkOpen] = useState(false);

	const trackIdentifier = id || _id;

	useEffect(() => {
		if (!trackIdentifier) {
			setIsLiked(false);
			return;
		}

		// 1. Check if song matches user's liked songs from database
		if (user && Array.isArray(user.likedSongs)) {
			const likedInDb = user.likedSongs.some((s) => {
				if (typeof s === "string") {
					return s === trackIdentifier || s === id || s === _id;
				}
				return s._id === trackIdentifier || s.id === trackIdentifier || s._id === id || s._id === _id;
			});
			if (likedInDb) {
				setIsLiked(true);
				return;
			}
		}

		// 2. Check local guest liked songs fallback
		try {
			const localLiked = JSON.parse(localStorage.getItem('beatpulse_liked_songs') || '[]');
			const likedLocally = localLiked.some((item) => {
				if (typeof item === 'string') {
					return item === trackIdentifier || item === id || item === _id;
				}
				return (item.id && (item.id === trackIdentifier || item.id === id)) ||
				       (item.name && name && item.name.toLowerCase() === name.toLowerCase());
			});
			setIsLiked(likedLocally);
		} catch (e) {
			setIsLiked(false);
		}
	}, [trackIdentifier, id, _id, name, user]);

	const handleToggleLike = async () => {
		if (!trackIdentifier) return;
		if (loadingLike) return;

		setLoadingLike(true);
		const trackData = {
			title: name || 'Track',
			artistName: artistList.length > 0 ? artistList[0].name : 'Artist',
			coverImage: imageUrl,
			uri: playInfo.uri || playInfo.audioUrl,
			duration: playInfo.duration || 180,
			externalId: playInfo.externalId || String(trackIdentifier).replace(/^ext_(audius|saavn|itunes)_/, ''),
			source: playInfo.source || 'saavn'
		};

		if (token) {
			try {
				const res = await musicService.toggleLikeSong(trackIdentifier, token, trackData);
				if (res.success) {
					setIsLiked(res.isLiked);
					setMessage(
						res.isLiked
							? "Added to your Liked Songs"
							: "Removed from your Liked Songs"
					);

					// Sync local user liked songs cache
					if (user && Array.isArray(user.likedSongs)) {
						const matchId = res.targetTrackId || trackIdentifier;
						if (res.isLiked) {
							if (!user.likedSongs.includes(matchId)) user.likedSongs.push(matchId);
						} else {
							user.likedSongs = user.likedSongs.filter((s) => {
								const sId = typeof s === 'string' ? s : (s._id || s.id);
								return sId !== matchId && sId !== trackIdentifier && sId !== id;
							});
						}
					}

					// Update local storage cache
					try {
						let localList = JSON.parse(localStorage.getItem('beatpulse_liked_songs') || '[]');
						if (res.isLiked) {
							if (!localList.some(item => (item.id || item) === trackIdentifier)) {
								localList.push({ id: trackIdentifier, name, artistName: trackData.artistName, coverImage: imageUrl });
							}
						} else {
							localList = localList.filter(item => (item.id || item) !== trackIdentifier);
						}
						localStorage.setItem('beatpulse_liked_songs', JSON.stringify(localList));
					} catch (e) {}
				} else {
					setMessage(`Notice: ${res.error || "Unable to update like status"}`);
				}
			} catch (error) {
				setMessage(`Error: ${error.message}`);
			} finally {
				setLoadingLike(false);
			}
		} else {
			// Guest like handling
			try {
				let localList = JSON.parse(localStorage.getItem('beatpulse_liked_songs') || '[]');
				const alreadyLiked = localList.some(item => (item.id || item) === trackIdentifier);
				const nextState = !alreadyLiked;

				if (nextState) {
					localList.push({ id: trackIdentifier, name, artistName: trackData.artistName, coverImage: imageUrl });
					setMessage("Added to Liked Songs (Log in to sync to cloud)");
				} else {
					localList = localList.filter(item => (item.id || item) !== trackIdentifier);
					setMessage("Removed from Liked Songs");
				}
				localStorage.setItem('beatpulse_liked_songs', JSON.stringify(localList));
				setIsLiked(nextState);
			} catch (e) {
				setMessage("Could not save song locally");
			} finally {
				setLoadingLike(false);
			}
		}
	};

	let imageUrl = "";
	if (album && album.images && album.images.length > 0) {
		imageUrl = album.images[album.images.length - 1].url;
	} else if (playInfo.coverImage) {
		imageUrl = playInfo.coverImage;
	}

	const artistList = Array.isArray(artists) ? artists : [];

	return (
		<div className="now-playing">
			<div 
				className="player-cover" 
				onClick={() => setArtworkOpen(!artworkOpen)}
				role="button"
				tabIndex={0}
				title={artworkOpen ? "Collapse artwork" : "Expand artwork"}
				style={{ cursor: 'pointer' }}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						setArtworkOpen(!artworkOpen);
					}
				}}
			>
				{imageUrl ? (
					<img draggable="false" loading="eager" src={imageUrl} alt="" />
				) : (
					<div>
						<Icon name="Music2" />
					</div>
				)}
				<div className="cover-expand-btn" aria-hidden="true" title="Expand artwork">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
						<polyline points="18 15 12 9 6 15"></polyline>
					</svg>
				</div>
			</div>

			<div className="player-info" style={{ display: name === "" ? "none" : null }}>
				<div className="player-info-track ellipsis-one-line">
					{album && album.id ? (
						<Link to={`/album/${album.id}?highlight=${trackIdentifier}`}>
							{name}
						</Link>
					) : (
						<span style={{ color: '#fff', cursor: 'default' }}>{name}</span>
					)}
				</div>

				<div className="player-info-artist ellipsis-one-line">
					{artistList.map((artist, index) => {
						return artist.id ? (
							<Link to={`/artist/${artist.id}`} key={index}>
								{artist.name}
							</Link>
						) : (
							<span key={index} style={{ color: 'var(--sub-text)' }}>
								{artist.name}{index < artistList.length - 1 ? ', ' : ''}
							</span>
						);
					})}
				</div>
			</div>

			<div className="player-like" style={{ display: name === "" ? "none" : "flex", alignItems: "center" }}>
				<button
					title={isLiked ? "Remove from Liked Songs" : "Save to your Liked Songs"}
					className="player-like-button no-outline"
					onClick={handleToggleLike}
					type="button"
					style={{
						color: isLiked ? "#1db954" : "var(--sub-text)",
						cursor: "pointer",
						background: "transparent",
						border: "none",
						padding: "6px",
						display: "flex",
						alignItems: "center"
					}}
				>
					<Icon name="Heart" fill={isLiked} />
				</button>

				<AddToPlaylistPopover track={playInfo} direction="up" align="left" />

				{typeof toggleLyrics === 'function' && (
					<button
						title={showLyrics ? "Close Lyrics" : "View Lyrics"}
						className={`nowplaying-lyrics-btn no-outline ${showLyrics ? "active" : ""}`}
						onClick={toggleLyrics}
						type="button"
						aria-label="Toggle Lyrics"
						aria-pressed={showLyrics}
					>
						<Icon name="Microphone" height="15" width="15" />
						<span>Lyrics</span>
					</button>
				)}
			</div>

			{/* Spotify-style Expanded Artwork Modal */}
			<ArtworkModal
				isOpen={artworkOpen}
				onClose={() => setArtworkOpen(false)}
				imageUrl={imageUrl}
				track={playInfo}
				artistList={artistList}
				album={album}
				isLiked={isLiked}
				onToggleLike={handleToggleLike}
			/>
		</div>
	);
}
