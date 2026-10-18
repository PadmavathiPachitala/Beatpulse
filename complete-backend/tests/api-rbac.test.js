const BASE_URL = process.env.API_URL || 'http://localhost:4000/api';

async function runTests() {
    console.log("=== BEATPULSE API & RBAC CONTRACT VERIFICATION ===");
    const timestamp = Date.now();
    let passed = 0;
    let failed = 0;

    function assert(condition, testName) {
        if (condition) {
            console.log(`✅ PASS: ${testName}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${testName}`);
            failed++;
        }
    }

    try {
        // 1. Health Check
        const healthRes = await fetch(`${BASE_URL}/health`);
        const healthData = await healthRes.json();
        assert(healthRes.status === 200 && healthData.database === 'connected', "GET /api/health reports connected database");

        // 2. Public Music Catalog
        const musicRes = await fetch(`${BASE_URL}/music/`);
        const musicData = await musicRes.json();
        assert(musicRes.status === 200 && Array.isArray(musicData.musics), "GET /api/music/ returns catalog array");

        const albumsRes = await fetch(`${BASE_URL}/music/albums`);
        const albumsData = await albumsRes.json();
        assert(albumsRes.status === 200 && Array.isArray(albumsData.albums), "GET /api/music/albums returns albums array");

        const searchRes = await fetch(`${BASE_URL}/music/search?q=synth`);
        const searchData = await searchRes.json();
        assert(searchRes.status === 200 && Array.isArray(searchData.musics), "GET /api/music/search returns search results");

        // 3. User Registration (role: 'user')
        const userCreds = {
            username: `testuser_${timestamp}`,
            email: `user_${timestamp}@beatpulse.com`,
            password: 'Password123!'
        };
        const regUserRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userCreds)
        });
        const regUserData = await regUserRes.json();
        assert(regUserRes.status === 201 && regUserData.user?.role === 'user', "POST /api/auth/register creates user role");
        const userToken = regUserData.token;

        // 4. RBAC Security: Registering as artist with wrong key rejected with 403
        const fakeArtistRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: `fakeartist_${timestamp}`,
                email: `fakeartist_${timestamp}@beatpulse.com`,
                password: 'Password123!',
                role: 'artist',
                artistKey: 'WRONG_KEY'
            })
        });
        assert(fakeArtistRes.status === 403, "RBAC Security: Registering as artist with wrong key rejected (403)");

        // 5. Artist Registration (with valid BEATPULSE_ARTIST key)
        const artistCreds = {
            username: `artist_${timestamp}`,
            email: `artist_${timestamp}@beatpulse.com`,
            password: 'Password123!',
            role: 'artist',
            artistKey: 'BEATPULSE_ARTIST'
        };
        const regArtistRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(artistCreds)
        });
        const regArtistData = await regArtistRes.json();
        assert(regArtistRes.status === 201 && regArtistData.user?.role === 'artist', "POST /api/auth/register creates artist role with valid key");
        const artistToken = regArtistData.token;

        // 6. Login Validation
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: userCreds.email,
                password: userCreds.password
            })
        });
        const loginData = await loginRes.json();
        assert(loginRes.status === 200 && Boolean(loginData.token), "POST /api/auth/login succeeds with valid credentials");

        const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: userCreds.email,
                password: 'WrongPassword'
            })
        });
        assert(badLoginRes.status === 401, "Login rejects invalid password (401)");

        // 7. Profile /me
        const meRes = await fetch(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        const meData = await meRes.json();
        assert(meRes.status === 200 && meData.user?.username === userCreds.username, "GET /api/auth/me returns active session");

        const noAuthRes = await fetch(`${BASE_URL}/auth/me`);
        assert(noAuthRes.status === 401, "GET /api/auth/me without token rejected (401)");

        // 8. User Like & Liked Songs
        if (musicData.musics && musicData.musics.length > 0) {
            const firstSongId = musicData.musics[0]._id;
            const likeRes = await fetch(`${BASE_URL}/music/like/${firstSongId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${userToken}` }
            });
            const likeData = await likeRes.json();
            assert(likeRes.status === 200 && typeof likeData.isLiked === 'boolean', "POST /api/music/like/:songId toggles like");

            const likedRes = await fetch(`${BASE_URL}/music/liked`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            const likedData = await likedRes.json();
            assert(likedRes.status === 200 && Array.isArray(likedData.tracks), "GET /api/music/liked returns liked tracks");
        }

        // 9. RBAC Enforcement: Regular user blocked from uploading music
        const uploadAttempt = await fetch(`${BASE_URL}/music/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${userToken}` }
        });
        assert(uploadAttempt.status === 403, "RBAC Security: Regular user blocked from POST /api/music/upload (403)");

        // 10. RBAC Enforcement: Regular user blocked from admin stats
        const adminAttempt = await fetch(`${BASE_URL}/music/admin/stats`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        assert(adminAttempt.status === 403, "RBAC Security: Regular user blocked from GET /api/music/admin/stats (403)");

        // 11. Artist Catalog Endpoints (Authenticated)
        const artistTracksRes = await fetch(`${BASE_URL}/music/artist/tracks`, {
            headers: { Authorization: `Bearer ${artistToken}` }
        });
        const artistTracksData = await artistTracksRes.json();
        assert(artistTracksRes.status === 200 && Array.isArray(artistTracksData.tracks), "GET /api/music/artist/tracks accessible to artist");

        const artistAlbumsRes = await fetch(`${BASE_URL}/music/artist/albums`, {
            headers: { Authorization: `Bearer ${artistToken}` }
        });
        const artistAlbumsData = await artistAlbumsRes.json();
        assert(artistAlbumsRes.status === 200 && Array.isArray(artistAlbumsData.albums), "GET /api/music/artist/albums accessible to artist");

        console.log(`\nTEST RESULTS: ${passed} passed, ${failed} failed.`);
        if (failed > 0) process.exit(1);
    } catch (e) {
        console.error("Test execution exception:", e.message);
        process.exit(1);
    }
}

runTests();
