import React, {
	useState,
	useEffect,
	useContext,
	useImperativeHandle,
	useRef,
	useCallback,
} from "react";
import ProgressBar from "./ProgressBar";
import NowPlaying from "./NowPlaying";
import ControlButton from "./ControlButton";
import LyricsView from "./LyricsView";
import Icon from "../icons";
import msTimeFormat from "../../utilities/utils";
import { MessageContext } from "../../utilities/context";
import musicService from "../../services/api";

const getTrackKey = (t) => {
	if (!t) return "";
	return t.id || t._id || t.uri || t.audioUrl || (t.name && t.title ? `${t.name}_${t.title}` : "");
};

const isSameTrack = (t1, t2) => {
	if (!t1 || !t2) return false;
	const k1 = getTrackKey(t1);
	const k2 = getTrackKey(t2);
	if (k1 && k2 && String(k1) === String(k2)) return true;
	if (t1.uri && t2.uri && t1.uri === t2.uri) return true;
	if (t1.audioUrl && t2.audioUrl && t1.audioUrl === t2.audioUrl) return true;
	if (t1.name && t2.name && t1.name.toLowerCase() === t2.name.toLowerCase()) return true;
	return false;
};

const Player = React.forwardRef(({ token, onTrackChange, onPlaybackChange }, ref) => {
	const setMessage = useContext(MessageContext);

	const [playbackState, setPlaybackState] = useState({
		play: false,
		shuffle: false,
		repeat: false,
		progress: 0,
		total_time: 180000,
	});

	const [scrubPb, setScrubPb] = useState(null);
	const [playback, setPlayback] = useState(0);
	const [volume, setVolume] = useState(0.8);
	const [connectTip, setConnectTip] = useState(false);
	const [showLyrics, setShowLyrics] = useState(false);
	const [playInfo, setPlayInfo] = useState({
		album: { images: [] },
		artists: [],
		name: "",
		id: "",
		uri: "",
	});

	const audioRef = useRef(null);
	const queueRef = useRef([]);
	const queueIndexRef = useRef(0);
	const volumeRef = useRef(0.8);
	const playbackStateRef = useRef(playbackState);
	const playedHistoryRef = useRef(new Set());
	const historyStackRef = useRef([]);

	useEffect(() => {
		playbackStateRef.current = playbackState;
	}, [playbackState]);

	// Initialize Native HTML5 Audio
	useEffect(() => {
		const audio = new Audio();
		audio.preload = "auto";
		audio.volume = volumeRef.current;
		audioRef.current = audio;

		let lastUpdateTime = 0;
		const onTimeUpdate = () => {
			const now = Date.now();
			if (now - lastUpdateTime < 200) return;
			lastUpdateTime = now;

			if (!audio.duration || isNaN(audio.duration) || audio.duration === 0) return;
			const currentMs = audio.currentTime * 1000;
			const totalMs = audio.duration * 1000;
			setPlayback(currentMs / totalMs);
			setPlaybackState((state) => ({
				...state,
				progress: currentMs,
				total_time: totalMs,
				play: !audio.paused,
			}));
		};

		const onLoadedMetadata = () => {
			if (audio.duration && !isNaN(audio.duration)) {
				const totalMs = audio.duration * 1000;
				setPlaybackState((state) => ({
					...state,
					total_time: totalMs,
				}));
			}
		};

		const onPlay = () => {
			setPlaybackState((state) => ({ ...state, play: true }));
			if (onPlaybackChange) onPlaybackChange(true);
		};

		const onPause = () => {
			setPlaybackState((state) => ({ ...state, play: false }));
			if (onPlaybackChange) onPlaybackChange(false);
		};

		const onEnded = () => {
			if (onPlaybackChange) onPlaybackChange(false);
			if (playbackStateRef.current.repeat) {
				audio.currentTime = 0;
				audio.play().catch((err) => {
					if (err.name !== "AbortError") {
						console.warn("Repeat play blocked:", err);
					}
				});
			} else {
				skipNext();
			}
		};

		const onError = (e) => {
			if (onPlaybackChange) onPlaybackChange(false);
			if (audio.src && audio.src !== window.location.href && !audio.src.endsWith("/")) {
				console.error("Audio playback error:", e);
				setMessage("Playback error on stream: skipping to next track...");
				setPlaybackState((state) => ({ ...state, play: false }));
				if (queueRef.current && queueRef.current.length > 1) {
					setTimeout(() => {
						skipNext();
					}, 1500);
				}
			}
		};

		audio.addEventListener("timeupdate", onTimeUpdate);
		audio.addEventListener("loadedmetadata", onLoadedMetadata);
		audio.addEventListener("play", onPlay);
		audio.addEventListener("pause", onPause);
		audio.addEventListener("ended", onEnded);
		audio.addEventListener("error", onError);

		// Preload initial catalog tracks for ready playback state
		musicService.getMusics().then((res) => {
			if (res.success && res.musics && res.musics.length > 0) {
				queueRef.current = res.musics;
				const firstTrack = res.musics[0];
				setPlayInfo(firstTrack);
				setPlaybackState((state) => ({
					...state,
					total_time: firstTrack.duration_ms || 180000,
				}));
				if (firstTrack.uri || firstTrack.audioUrl) {
					audio.src = firstTrack.uri || firstTrack.audioUrl;
				}
			} else {
				musicService.getIndianCategories().then((catRes) => {
					if (catRes.success && catRes.categories && catRes.categories.length > 0) {
						const allTracks = catRes.categories.flatMap((c) => c.tracks || []);
						if (allTracks.length > 0) {
							queueRef.current = allTracks;
							const firstTrack = allTracks[0];
							setPlayInfo(firstTrack);
							setPlaybackState((state) => ({
								...state,
								total_time: firstTrack.duration_ms || 180000,
							}));
							if (firstTrack.uri || firstTrack.audioUrl) {
								audio.src = firstTrack.uri || firstTrack.audioUrl;
							}
						}
					}
				});
			}
		});

		return () => {
			try {
				audio.pause();
			} catch (e) {}
			audio.removeEventListener("timeupdate", onTimeUpdate);
			audio.removeEventListener("loadedmetadata", onLoadedMetadata);
			audio.removeEventListener("play", onPlay);
			audio.removeEventListener("pause", onPause);
			audio.removeEventListener("ended", onEnded);
			audio.removeEventListener("error", onError);
			audio.src = "";
		};
		// eslint-disable-next-line
	}, []);

	const playTrackInternal = useCallback((track, queue) => {
		if (!track) return;
		const audio = audioRef.current;
		if (!audio) return;

		const audioSrc = track.uri || track.audioUrl;
		if (!audioSrc) {
			setMessage("Track has no playable audio source");
			return;
		}

		if (queue && Array.isArray(queue) && queue.length > 0) {
			queueRef.current = queue;
			const foundIdx = queue.findIndex((t) => isSameTrack(t, track));
			queueIndexRef.current = foundIdx >= 0 ? foundIdx : 0;
		} else {
			const existingIdx = queueRef.current.findIndex((t) => isSameTrack(t, track));
			if (existingIdx >= 0) {
				queueIndexRef.current = existingIdx;
			} else {
				queueRef.current = [track];
				queueIndexRef.current = 0;
			}
		}

		// Add current track to shuffle played history
		const trackKey = getTrackKey(track);
		if (trackKey) {
			playedHistoryRef.current.add(trackKey);
		}

		setPlayInfo(track);
		if (onTrackChange) onTrackChange(track);
		setPlayback(0);
		setPlaybackState((state) => ({
			...state,
			progress: 0,
			total_time: track.duration_ms || 180000,
			play: true,
		}));

		try {
			audio.pause();
		} catch (e) {}

		audio.src = audioSrc;
		audio.currentTime = 0;
		audio
			.play()
			.then(() => {
				setPlaybackState((state) => ({ ...state, play: true }));
				if (onPlaybackChange) onPlaybackChange(true);
			})
			.catch((err) => {
				if (err.name === "AbortError") {
					return;
				}
				console.warn("Autoplay was prevented by browser policy:", err);
				setMessage("Click play to begin listening");
				setPlaybackState((state) => ({ ...state, play: false }));
				if (onPlaybackChange) onPlaybackChange(false);
			});
	}, [setMessage, onTrackChange, onPlaybackChange]);

	// Reference for parent components to trigger playback
	useImperativeHandle(ref, () => ({
		updateState: () => {
			togglePlay();
		},
		playTrack: (track, queue) => {
			playTrackInternal(track, queue);
		},
		toggleLyrics: () => {
			setShowLyrics((prev) => !prev);
		},
	}));

	const togglePlay = () => {
		const audio = audioRef.current;
		if (!audio) return;

		if (!audio.src || audio.src === window.location.href) {
			if (queueRef.current.length > 0) {
				playTrackInternal(queueRef.current[queueIndexRef.current], queueRef.current);
			} else {
				musicService.getMusics().then((res) => {
					if (res.success && res.musics.length > 0) {
						playTrackInternal(res.musics[0], res.musics);
					}
				});
			}
			return;
		}

		if (audio.paused) {
			audio
				.play()
				.then(() => {
					setPlaybackState((state) => ({ ...state, play: true }));
				})
				.catch((err) => {
					if (err.name !== "AbortError") {
						console.warn("Play blocked:", err);
						setMessage("Unable to resume playback");
					}
				});
		} else {
			audio.pause();
			setPlaybackState((state) => ({ ...state, play: false }));
		}
	};

	const toggleShuffle = () => {
		setPlaybackState((state) => {
			const nextVal = !state.shuffle;
			setMessage(`Shuffle ${nextVal ? "On" : "Off"}`);
			// Reset played history on toggle so fresh shuffle starts from current track
			playedHistoryRef.current.clear();
			if (nextVal && queueRef.current && queueRef.current[queueIndexRef.current]) {
				const currentTrack = queueRef.current[queueIndexRef.current];
				const currentKey = getTrackKey(currentTrack);
				if (currentKey) {
					playedHistoryRef.current.add(currentKey);
				}
			}
			return { ...state, shuffle: nextVal };
		});
	};

	const toggleRepeat = () => {
		setPlaybackState((state) => {
			const nextVal = !state.repeat;
			setMessage(`Repeat ${nextVal ? "On" : "Off"}`);
			return { ...state, repeat: nextVal };
		});
	};

	const skipNext = () => {
		const queue = queueRef.current;
		if (!queue || queue.length === 0) return;

		let nextIdx;
		if (playbackStateRef.current.shuffle && queue.length > 1) {
			const currentTrack = queue[queueIndexRef.current];
			const currentKey = getTrackKey(currentTrack);

			// Collect all tracks in the queue that have NOT been played yet in this shuffle cycle
			let unplayedIndices = [];
			for (let i = 0; i < queue.length; i++) {
				const k = getTrackKey(queue[i]);
				if (i !== queueIndexRef.current && (!k || !playedHistoryRef.current.has(k))) {
					unplayedIndices.push(i);
				}
			}

			// If all other tracks have been played once, reset the shuffle cycle
			if (unplayedIndices.length === 0) {
				playedHistoryRef.current.clear();
				if (currentKey) {
					playedHistoryRef.current.add(currentKey);
				}
				for (let i = 0; i < queue.length; i++) {
					if (i !== queueIndexRef.current) {
						unplayedIndices.push(i);
					}
				}
			}

			// Randomly select from the unplayed pool
			const randomChoice = Math.floor(Math.random() * unplayedIndices.length);
			nextIdx = unplayedIndices[randomChoice];
		} else {
			nextIdx = (queueIndexRef.current + 1) % queue.length;
		}

		if (queueIndexRef.current !== nextIdx) {
			historyStackRef.current.push(queueIndexRef.current);
			if (historyStackRef.current.length > 50) {
				historyStackRef.current.shift();
			}
		}

		queueIndexRef.current = nextIdx;
		playTrackInternal(queue[nextIdx], queue);
	};

	const skipPrev = () => {
		const audio = audioRef.current;
		// If playback has progressed beyond 3 seconds, restart current track
		if (audio && audio.currentTime > 3) {
			audio.currentTime = 0;
			setPlayback(0);
			setPlaybackState((state) => ({ ...state, progress: 0 }));
			return;
		}

		const queue = queueRef.current;
		if (!queue || queue.length === 0) return;

		let prevIdx;
		if (historyStackRef.current.length > 0) {
			prevIdx = historyStackRef.current.pop();
		} else {
			prevIdx = (queueIndexRef.current - 1 + queue.length) % queue.length;
		}

		queueIndexRef.current = prevIdx;
		playTrackInternal(queue[prevIdx], queue);
	};

	const seekPlayback = (ratio) => {
		const audio = audioRef.current;
		if (audio && audio.duration && !isNaN(audio.duration)) {
			const targetSec = ratio * audio.duration;
			audio.currentTime = targetSec;
			const targetMs = targetSec * 1000;
			setPlayback(ratio);
			setPlaybackState((state) => ({ ...state, progress: targetMs }));
		}
		setScrubPb(null);
	};

	const scrubPlayback = (ratio) => {
		const time = ratio * playbackState.total_time;
		setScrubPb(time);
	};

	const seekToSeconds = (sec) => {
		const audio = audioRef.current;
		if (audio && audio.duration && !isNaN(audio.duration)) {
			const target = Math.max(0, Math.min(sec, audio.duration));
			audio.currentTime = target;
			setPlayback(target / audio.duration);
			setPlaybackState((state) => ({ ...state, progress: target * 1000 }));
		}
	};

	const seekVolume = (ratio) => {
		const vol = Math.max(0, Math.min(1, ratio));
		if (audioRef.current) {
			audioRef.current.volume = vol;
		}
		volumeRef.current = vol;
		setVolume(vol);
	};

	return (
		<div className={`player ${playInfo && (playInfo.name || playInfo.title) ? "has-track" : "no-track"}`}>
			<div className="player-left">
				<NowPlaying 
					playInfo={playInfo} 
					token={token} 
					showLyrics={showLyrics} 
					toggleLyrics={() => setShowLyrics(!showLyrics)} 
				/>
			</div>

			<div className="player-center">
				<div className="player-control-buttons">
					<ControlButton
						title="Toggle Shuffle"
						icon="Shuffle"
						active={playbackState.shuffle}
						onClick={toggleShuffle}
					/>
					<ControlButton
						title="Previous track"
						icon="TrackBack"
						size="x-smaller"
						onClick={skipPrev}
					/>
					<ControlButton
						title={playbackState.play ? "Pause" : "Play"}
						icon={playbackState.play ? "Pause" : "Play"}
						size={playbackState.play ? "smaller" : "larger"}
						extraClass="circle-border"
						onClick={togglePlay}
					/>
					<ControlButton
						title="Next track"
						icon="TrackNext"
						size="x-smaller"
						onClick={skipNext}
					/>
					<ControlButton
						title="Toggle Repeat"
						icon="Repeat"
						active={playbackState.repeat}
						onClick={toggleRepeat}
					/>
				</div>

				<div className="player-playback" draggable="false">
					<div className="playback-time" draggable="false">
						{scrubPb
							? msTimeFormat(scrubPb)
							: msTimeFormat(playbackState.progress)}
					</div>
					<ProgressBar
						extraClass="playback"
						value={playback}
						engageClass="engage"
						setValue={(ratio) => seekPlayback(ratio)}
						scrubFunction={scrubPlayback}
					/>
					<div className="playback-time" draggable="false">
						{msTimeFormat(playbackState.total_time)}
					</div>
				</div>
			</div>

			<div className="player-right">
				<div className="extra-controls">
					<button
						className={`lyrics-pill-button no-outline ${showLyrics ? "active" : ""}`}
						onClick={() => setShowLyrics(!showLyrics)}
						title={showLyrics ? "Close Lyrics" : "Open Lyrics"}
						type="button"
					>
						<Icon name="Microphone" height="15" width="15" />
						<span>Lyrics</span>
					</button>

					<span className="connect-devices-wrapper">
						{connectTip && (
							<div
								style={{
									position: "absolute",
									bottom: "70px",
									right: "20px",
									background: "#282828",
									color: "#fff",
									padding: "12px 16px",
									borderRadius: "8px",
									boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
									fontSize: "13px",
									zIndex: 100,
									width: "240px",
								}}
							>
								<div style={{ fontWeight: "bold", marginBottom: "4px" }}>
									HTML5 Audio Streaming
								</div>
								<div style={{ color: "var(--sub-text)", fontSize: "12px" }}>
									Listening on Web Player via native high-fidelity audio stream.
								</div>
							</div>
						)}
						<ControlButton
							title="Audio Stream Info"
							icon="Speaker"
							size="x-larger"
							onClick={() => setConnectTip(!connectTip)}
							active={playbackState.play}
						/>
					</span>

					<div className="volume-control">
						<ControlButton
							title="Volume"
							icon="Volume"
							size="x-larger"
							extraClass="volume"
						/>
						<div style={{ width: "100%" }}>
							<ProgressBar
								extraClass="volume"
								value={volume}
								engageClass="engage"
								setValue={(ratio) => seekVolume(ratio)}
							/>
						</div>
					</div>
				</div>
			</div>

			<LyricsView
				track={playInfo}
				currentTime={playbackState.progress / 1000}
				currentTimeSec={playbackState.progress / 1000}
				isOpen={showLyrics}
				onClose={() => setShowLyrics(false)}
				onSeek={seekToSeconds}
				isPlaying={playbackState.play}
				onTogglePlay={togglePlay}
				onSkipNext={skipNext}
				onSkipPrev={skipPrev}
				progressMs={playbackState.progress}
				durationMs={playbackState.total_time}
				onSeekRatio={seekPlayback}
			/>
		</div>
	);
});

export default Player;
