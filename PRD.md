# 📄 Product Requirement Document (PRD) — BeatPulse Web Player

**Product:** BeatPulse (Spotify Web Player Clone)  
**Author:** Padmavathi Pachitala  
**Repository:** [https://github.com/PadmavathiPachitala/Beatpulse](https://github.com/PadmavathiPachitala/Beatpulse)

---

## 1. Executive Summary & Product Vision

BeatPulse is a fullstack web application designed to replicate the core listening, discovery, and library management experience of Spotify's desktop and mobile web players. Unlike typical API-limited clones that require external official Spotify desktop apps running, BeatPulse delivers:
- **Direct in-browser high-fidelity audio playback**.
- **Real-time synchronized karaoke lyrics**.
- **Spotify-style interactive artwork expansion**.
- **Artist upload capabilities for independent creators**.
- **Native responsive mobile layout** without third-party app downloads.

---

## 2. Target Personas

| Persona | Role | Key Goals & Needs |
| :--- | :--- | :--- |
| **The Casual Listener** | `user` | Quick song search, uninterrupted background streaming, responsive mobile navigation, creating personal playlists, viewing lyrics. |
| **The Independent Artist** | `artist` | Uploading original singles and albums (MP3/WAV), uploading custom album covers, monitoring play counts, managing track metadata. |
| **Platform Administrator** | `admin` | Full catalog control, system health monitoring, user moderation, role assignments. |

---

## 3. Core Functional Requirements

### 3.1. Authentication & Role-Based Access Control (RBAC)
- **FR-AUTH-1**: Users can register with unique `username`, `email`, and `password` (bcrypt salted hashing).
- **FR-AUTH-2**: Users can choose to register as an `artist` using an artist secret key, or as a regular `user`.
- **FR-AUTH-3**: Existing users can upgrade their role to `artist` inside the app interface.
- **FR-AUTH-4**: JWT session tokens stored securely via HTTP cookies and Authorization header fallback.
- **FR-AUTH-5**: Protected endpoints strictly enforce permission boundaries (regular users cannot upload or delete tracks).

### 3.2. Audio Playback & Streaming Engine
- **FR-PLAY-1**: Continuous HTML5 audio playback across client-side page routing (zero playback cut-off when clicking around the app).
- **FR-PLAY-2**: Non-repeating Smart Shuffle:
  - System maintains a history stack and a set of played tracks in the current session.
  - When shuffle is activated, the engine picks randomly only from unplayed tracks until all items in the queue have been played once.
- **FR-PLAY-3**: Active song highlights: The currently playing card displays an animated equalizer badge and a clear Pause icon.
- **FR-PLAY-4**: History Navigation: Top header bar `<` (Back) and `>` (Forward) buttons navigate browser history stack.

### 3.3. Interactive Album Artwork Modal
- **FR-ART-1**: Clicking the bottom-left player cover thumbnail or its hover expand chevron opens a centered vinyl-style modal.
- **FR-ART-2**: Ambient Glow: The modal generates a radial ambient glow reflecting the current song.
- **FR-ART-3**: Displays high-resolution artwork, song title, artist names, and direct like button.
- **FR-ART-4**: Closes via `Escape` key, close button, or clicking outside the backdrop.

### 3.4. Synchronized Lyrics Engine
- **FR-LYR-1**: Synchronized scrolling view matching track timestamps (`mm:ss.xx`).
- **FR-LYR-2**: Active lyric line highlighted in bold emerald green with smooth vertical auto-scroll.
- **FR-LYR-3**: Clickable line scrubbing: Clicking any lyric immediately jumps playback to that point.

### 3.5. Mobile Web Responsiveness
- **FR-MOB-1**: Hides desktop sidebar on viewports `< 768px` and activates fixed bottom navigation bar (`.mobile-bottom-nav`).
- **FR-MOB-2**: Floating mini player bar floats neatly above the bottom navigation bar and only renders when a track is active.
- **FR-MOB-3**: Native safe-area support (`env(safe-area-inset-bottom)`) prevents icon clipping on notched devices (iPhone/Android).
- **FR-MOB-4**: Horizontal swipeable card rows (`-webkit-overflow-scrolling: touch`) with optimized card widths (`144px`).

### 3.6. Library & Playlist Management
- **FR-LIB-1**: Instant single-click liking and unliking of tracks with database synchronization.
- **FR-LIB-2**: Create custom playlists with title and optional description.
- **FR-LIB-3**: Add songs from Search, Album, or Now-Playing bar into custom playlists.

---

## 4. Non-Functional Requirements

### 4.1. Security
- **NFR-SEC-1**: Protection against NoSQL operator injection in all login and query handlers.
- **NFR-SEC-2**: ReDoS protection: Regex queries sanitized to prevent exponential backtracking.
- **NFR-SEC-3**: Strict audio MIME validation (only audio file types permitted in uploads).
- **NFR-SEC-4**: 100% pass rate across the automated security test suite (`security-hardening.test.js`).

### 4.2. Performance & Reliability
- **NFR-PERF-1**: Frontend bundle gzip compressed: Main JS chunk under 45 KB, CSS chunk under 10 KB.
- **NFR-PERF-2**: Debounced instant search (300ms) with request cancellation to avoid race conditions.
- **NFR-PERF-3**: Database indexing on `User.email`, `User.username`, `Music.title`, `Music.artist`.

---

## 5. Data Models & Database Schemas

### 5.1. User Schema
```typescript
interface User {
  _id: ObjectId;
  username: string;       // Unique, sanitized
  email: string;          // Unique, lowercase
  password: string;       // Bcrypt hashed (10 rounds)
  role: 'user' | 'artist' | 'admin';
  likedSongs: ObjectId[]; // References to Music model
  playlists: ObjectId[];  // References to Playlist model
  images: [{ url: string }];
  createdAt: Date;
}
```

### 5.2. Music Schema
```typescript
interface Music {
  _id: ObjectId;
  title: string;
  artist: ObjectId;       // Reference to User model
  artistName: string;
  album?: ObjectId;       // Reference to Album model
  audioUrl: string;       // Streamable MP3/WAV URL
  coverImage: string;     // CDN Image URL
  duration: number;       // Duration in seconds
  playsCount: number;
  lyrics?: string;        // LRC synchronized or plain text
  source: 'local' | 'audius' | 'saavn';
  createdAt: Date;
}
```

### 5.3. Playlist Schema
```typescript
interface Playlist {
  _id: ObjectId;
  name: string;
  description: string;
  owner: ObjectId;        // Reference to User model
  tracks: ObjectId[];     // References to Music model
  coverImage?: string;
  isPublic: boolean;
  createdAt: Date;
}
```

---

## 6. API Endpoint Specifications

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user or artist |
| `POST` | `/api/auth/login` | Public | Authenticate user, return JWT |
| `POST` | `/api/auth/logout` | Public | Clear session cookie |
| `GET` | `/api/auth/me` | User | Get authenticated profile |
| `POST` | `/api/auth/upgrade-artist` | User | Upgrade role to artist with key |
| `GET` | `/api/music/search` | Public | Search tracks, artists, and albums |
| `POST` | `/api/music/upload` | Artist/Admin | Upload track with audio file & cover |
| `POST` | `/api/music/like/:id` | User | Toggle like status on a song |
| `GET` | `/api/playlist/user` | User | Fetch user's custom playlists |
| `POST` | `/api/playlist/create` | User | Create a new playlist |
| `POST` | `/api/playlist/add` | User | Add track to playlist |
| `GET` | `/api/health` | Public | Server uptime & DB connection status |

---

## 7. Release & Deployment Strategy

- **Repository**: Git-tracked monorepo with `complete-backend` and `frontend`.
- **Continuous Deployment**: Fully compatible with Railway, Render, and Netlify.
- **Database**: High-availability MongoDB Atlas cloud cluster.
- **Static Delivery**: Optimized CRA build with client-side routing fallback (`/index.html`).
