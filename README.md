# 🎵 BeatPulse — Spotify-Inspired Music Platform with RBAC

<p align="center">
  <strong>An independent, fullstack music streaming platform inspired by the iconic UI/UX of Spotify — enhanced with a powerful multi-tier Role-Based Access Control (RBAC) architecture.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Inspired%20By-Spotify-1DB954?logo=spotify&logoColor=white" alt="Spotify Inspired" />
  <img src="https://img.shields.io/badge/Architecture-RBAC%20Enabled-7928CA" alt="RBAC Architecture" />
  <img src="https://img.shields.io/badge/React-16.13-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" alt="MongoDB Atlas" />
</p>

---

## 💡 About BeatPulse: The Concept

BeatPulse is deeply inspired by Spotify's renowned web player interface: its sleek dark mode, emerald accents, responsive typography, and fluid playback controls.

While traditional Spotify separates listeners and requires artists to go through third-party distributors (like DistroKid or TuneCore), **BeatPulse introduces a unified platform powered by custom Role-Based Access Control (RBAC)** — allowing music fans to listen freely while independent creators upload, publish, and manage their music catalog directly inside the web app.

---

## 📸 Visual Showcase

| Home Player Interface | Live Search & Filtering |
|:---:|:---:|
| ![Home](frontend/demo/beatpulse_home.png) | ![Search](frontend/demo/beatpulse_search.png) |

| Album & Tracklist Experience | User Authentication & RBAC |
|:---:|:---:|
| ![Album](frontend/demo/beatpulse_album.png) | ![Auth Modal](frontend/demo/beatpulse_login.png) |

---

## 👥 Role-Based Access Control (RBAC) Architecture

BeatPulse implements a multi-tier authorization hierarchy enforced on both the client interface and server API endpoints:

```text
┌───────────────────────────────────────────────────────────────┐
│                      BEATPULSE RBAC TIERS                     │
├─────────────────┬─────────────────────────┬───────────────────┤
│  👤 LISTENER    │  🎨 VERIFIED ARTIST     │  🛡️ ADMINISTRATOR │
│  (Role: user)   │  (Role: artist)         │  (Role: admin)    │
├─────────────────┼─────────────────────────┼───────────────────┤
│ • Free audio    │ • All Listener perks    │ • All Artist &    │
│   streaming     │ • Dedicated Artist      │   Listener perks  │
│ • Real-time     │   Studio                │ • Catalog-wide    │
│   lyrics        │ • Upload MP3 / WAV      │   moderation      │
│ • Custom        │   audio tracks          │ • Delete any      │
│   playlists     │ • Upload album artwork  │   track / album   │
│ • Liked songs   │   via ImageKit CDN      │ • System metrics  │
│   collection    │ • Create & manage       │   & user role     │
│ • Smart shuffle │   albums & singles      │   management      │
│ • Upgrade to    │ • Track play counter    │                   │
│   Artist key    │   analytics             │                   │
└─────────────────┴─────────────────────────┴───────────────────┘
```

---

## ✨ Features Inspired by Spotify

### 🎧 1. Authentic Player Experience
- **Fluid Playback Controls**: Play, pause, skip, and volume control with interactive scrubber sliders.
- **Smart Non-Repeating Shuffle**: Remembers songs played during the session so tracks are never duplicated until the queue finishes.
- **Micro-Equalizer Animation**: Active cards display an animated green equalizer badge that pauses/resumes dynamically with playback.
- **Continuous Single-Page Playback**: Seamless audio streaming across page navigation with zero interruptions.

### 🎤 2. Synchronized Karaoke Lyrics
- **Real-Time Timestamp Sync**: Auto-scrolls lyric lines in sync with music playback.
- **Interactive Lyric Scrubbing**: Click any lyric line to jump the song directly to that timestamp.
- **Active Emerald Highlighting**: Bold highlighting on the current singing line with translucent surrounding text.

### 🖼️ 3. Expandable Album Artwork
- **Vinyl-Style Modal**: Click the player cover art thumbnail or hover expand chevron to expand high-resolution album artwork.
- **Ambient Glow Effect**: Ambient lighting dynamically complements the artwork backdrop.
- **Quick Actions**: Direct like/unlike and close controls within the overlay.

### 📱 4. Native Mobile Web Responsiveness
- **Floating Mini Player**: Slides up cleanly above the navigation bar only when music is actively loaded.
- **Mobile Bottom Navigation**: Dedicated touch navigation bar (*Home*, *Search*, *Library*, *Liked*).
- **Smooth Momentum Swipe**: Horizontal touch-scrolling card rows formatted for mobile thumb reach.

---

## 🏗️ Technical Stack

- **Frontend**: React 16.13, React Router v5, Context API, Vanilla CSS3 (Glassmorphism & CSS Grid)
- **Backend API**: Node.js 20.x, Express 5.x, Mongoose ODM
- **Database**: MongoDB Atlas (Cloud Cluster)
- **Asset Storage & CDN**: ImageKit Cloud (Audio & Image streaming)
- **External Discovery**: JioSaavn & Audius Open Protocol API integration
- **Security**: JWT Authentication, Bcrypt (10 salt rounds), NoSQL Injection sanitization, ReDoS mitigation

---

## 📁 Project Structure

```text
Beatpulse/
├── complete-backend/           # Express Server & REST API
│   ├── src/
│   │   ├── controllers/        # Auth, Music, Playlist handlers
│   │   ├── middlewares/        # JWT validation & RBAC guards
│   │   ├── models/             # User, Music, Playlist, Album schemas
│   │   ├── routes/             # REST API endpoint definitions
│   │   ├── services/           # Music streaming, search & storage services
│   │   └── db/                 # MongoDB Atlas connector
│   ├── tests/                  # Security hardening & RBAC test suite
│   ├── server.js               # Backend entrypoint
│   └── package.json
├── frontend/                   # React SPA Client
│   ├── public/                 # HTML shell, favicons, meta tags
│   ├── src/
│   │   ├── components/         # Player, Navigation, Modals, Cards
│   │   ├── services/           # API client & data adaptors
│   │   ├── utilities/          # Global Context providers & hooks
│   │   ├── App.js              # Routing & application shell
│   │   └── index.css           # Design tokens & responsive styles
│   └── package.json
├── PRD.md                      # Product Requirement Document
├── README.md                   # Project overview & documentation
└── package.json                # Root workspace configuration
```

---
