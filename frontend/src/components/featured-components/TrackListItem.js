import React, { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Icon from "../icons";
import msTimeFormat from "../../utilities/utils";
import { PlayContext, CurrentTrackContext, MessageContext, TokenContext, UserContext } from "../../utilities/context";
import musicService from "../../services/api";
import AddToPlaylistPopover from "./AddToPlaylistPopover";

const TrackListItem = React.forwardRef(
	({ track, styleName, highlight, playContextTrack }, ref) => {
		const { album, artists, name, explicit, duration_ms, uri, id, _id } = track;
		const updatePlayer = useContext(PlayContext);
		const currentTrackContext = useContext(CurrentTrackContext);
		const setMessage = useContext(MessageContext);
		const token = useContext(TokenContext) || localStorage.getItem('token');
		const user = useContext(UserContext);

		const [isLiked, setIsLiked] = useState(false);

		const trackIdentifier = id || _id;

		const currentTrack = currentTrackContext?.track || currentTrackContext;
		const isPlaying = Boolean(currentTrackContext?.isPlaying);

		const currentIdentifier = currentTrack ? (currentTrack.id || currentTrack._id) : null;

		const isThisTrack = Boolean(
			currentTrack && (
				(trackIdentifier && currentIdentifier && String(trackIdentifier) === String(currentIdentifier)) ||
				(currentTrack.uri && uri && currentTrack.uri === uri) ||
				(track.audioUrl && currentTrack.audioUrl && track.audioUrl === currentTrack.audioUrl) ||
				(!trackIdentifier && !currentIdentifier && name && name !== 'Untitled Track' && currentTrack.name && currentTrack.name.toLowerCase() === name.toLowerCase())
			)
		);
		const isActivelyPlaying = isThisTrack && isPlaying;

		useEffect(() => {
			if (!trackIdentifier) return;
			if (user && Array.isArray(user.likedSongs)) {
				const liked = user.likedSongs.some((s) => {
					if (typeof s === 'string') return s === trackIdentifier || s === id || s === _id;
					return s._id === trackIdentifier || s.id === trackIdentifier || s._id === id || s._id === _id;
				});
				if (liked) {
					setIsLiked(true);
					return;
				}
			}
			try {
				const localLiked = JSON.parse(localStorage.getItem('beatpulse_liked_songs') || '[]');
				const likedLocally = localLiked.some((item) => {
					if (typeof item === 'string') return item === trackIdentifier;
					return item.id === trackIdentifier || (item.name && name && item.name.toLowerCase() === name.toLowerCase());
				});
				setIsLiked(likedLocally);
			} catch (e) {
				setIsLiked(false);
			}
		}, [trackIdentifier, id, _id, name, user]);

		const handleToggleLike = async (e) => {
			e.stopPropagation();
			const trackData = {
				title: name || 'Track',
				artistName: (artists && artists[0]?.name) || track.artistName || 'Artist',
				coverImage: (album?.images && album.images[0]?.url) || track.coverImage,
				uri: uri || track.audioUrl,
				duration: track.duration || Math.round((duration_ms || 180000) / 1000),
				externalId: track.externalId || String(trackIdentifier).replace(/^ext_(audius|saavn|itunes)_/, ''),
				source: track.source || 'saavn'
			};

			if (token) {
				try {
					const res = await musicService.toggleLikeSong(trackIdentifier, token, trackData);
					if (res.success) {
						setIsLiked(res.isLiked);
						setMessage(res.isLiked ? `Saved "${name}" to Liked Songs` : `Removed "${name}" from Liked Songs`);
					} else {
						setMessage(res.error || 'Failed to update like status');
					}
				} catch (err) {
					setMessage(err.message || 'Error updating like status');
				}
			} else {
				try {
					let localList = JSON.parse(localStorage.getItem('beatpulse_liked_songs') || '[]');
					const alreadyLiked = localList.some(item => (item.id || item) === trackIdentifier);
					const nextState = !alreadyLiked;
					if (nextState) {
						localList.push({ id: trackIdentifier, name, artistName: trackData.artistName, coverImage: trackData.coverImage });
						setMessage(`Saved "${name}" to Liked Songs (Log in to sync)`);
					} else {
						localList = localList.filter(item => (item.id || item) !== trackIdentifier);
						setMessage(`Removed "${name}" from Liked Songs`);
					}
					localStorage.setItem('beatpulse_liked_songs', JSON.stringify(localList));
					setIsLiked(nextState);
				} catch (err) {
					setMessage('Could not save song locally');
				}
			}
		};

		const handleRowPlay = (e) => {
			if (e) e.stopPropagation();
			if (isThisTrack) {
				updatePlayer();
			} else if (playContextTrack) {
				playContextTrack(uri, track);
			} else {
				updatePlayer(track);
			}
		};

		let thumbNail;
		if (styleName === "simplify" && album?.images?.length > 0) {
			thumbNail = album.images[album.images.length - 1].url;
		}
		const formattedTime = msTimeFormat(duration_ms);

		return (
			<li
				ref={ref}
				className={`trackListItem ${highlight || isThisTrack ? "highlight" : ""}`}
				style={{ cursor: "pointer" }}
				onClick={handleRowPlay}
			>
				<div
					className="trackItemPlay"
					style={styleName === "simplify" ? simplyStyle : null}
				>
					<button
						className={
							styleName === "simplify"
								? "hoverIcon no-outline"
								: "hoverIcon trackTopAlign no-outline"
						}
						onClick={handleRowPlay}
						type="button"
						title={isActivelyPlaying ? "Pause" : "Play"}
						aria-label={isActivelyPlaying ? "Pause" : "Play"}
					>
						<Icon name={isActivelyPlaying ? "Pause" : "Play"} height="20" width="20" />
					</button>
					<div
						className={
							styleName === "simplify" ? "itemIcon" : "itemIcon trackTopAlign"
						}
						style={{ 
							marginTop: styleName === "simplify" ? "0" : null,
							color: isThisTrack ? "var(--spotify-green)" : null 
						}}
					>
						<Icon name={isActivelyPlaying ? "Volume" : "Music"} />
					</div>
				</div>

				{styleName === "simplify" && (
					<div className="trackMidAlign">
						<div className="trackItemThumb">
							{thumbNail ? (
								<img
									loading="lazy"
									src={thumbNail}
									style={{ width: "100%", height: "100%" }}
									alt=""
								/>
							) : (
								<div
									style={{
										position: "absolute",
										top: "35%",
										bottom: "35%",
										left: "35%",
										right: "35%",
									}}
								>
									<Icon name="Music2" />
								</div>
							)}
						</div>
					</div>
				)}

				<div className="trackItemInfo">
					<div
						className={
							styleName === "simplify" ? "trackMidAlign" : "trackTopAlign"
						}
					>
						<div 
							className="trackName ellipsis-one-line"
							style={{ color: isThisTrack ? "var(--spotify-green)" : "#fff" }}
						>
							{name}
						</div>

						{styleName !== "simplify" && (
							<div className="trackInfo">
								<span
									className="explicit-label"
									style={explicit ? { display: "flex" } : { display: "none" }}
								>
									E
								</span>
								<span className="trackArtists ellipsis-one-line">
									{Array.isArray(artists) && artists.map((artist) => (
										artist.id ? (
											<Link 
												to={`/artist/${artist.id}`} 
												key={artist.id || artist.name}
												onClick={(e) => e.stopPropagation()}
											>
												{artist.name}
											</Link>
										) : (
											<span key={artist.name} style={{ color: 'var(--sub-text)' }}>
												{artist.name}
											</span>
										)
									))}
								</span>
								{album && (
									<>
										<span className="trackInfoSep">•</span>
										<span className="trackAlbum ellipsis-one-line">
											{album.id ? (
												<Link 
													to={`/album/${album.id}`}
													onClick={(e) => e.stopPropagation()}
												>
													{album.name}
												</Link>
											) : (
												<span style={{ color: 'var(--sub-text)' }}>{album.name}</span>
											)}
										</span>
									</>
								)}
							</div>
						)}
					</div>
				</div>

				<div className="trackItemDuration" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
					<button
						className="no-outline"
						title={isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
						onClick={handleToggleLike}
						type="button"
						style={{
							background: 'none',
							border: 'none',
							color: isLiked ? '#1db954' : '#b3b3b3',
							cursor: 'pointer',
							padding: '4px',
							display: 'flex',
							alignItems: 'center'
						}}
					>
						<Icon name="Heart" fill={isLiked} width="16" height="16" />
					</button>

					<AddToPlaylistPopover track={track} direction="down" align="right" />

					<div
						className={`duration ${
							styleName === "simplify" ? "trackMidAlign" : "trackTopAlign"
						}`}
					>
						<span>{formattedTime}</span>
					</div>
				</div>
			</li>
		);
	}
);

const simplyStyle = {
	display: "flex",
	alignItems: "center",
	justifyContent: "flex-end",
};

export default TrackListItem;
