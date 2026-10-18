const BASE_URL = process.env.API_URL || 'http://localhost:4000/api';

async function runPlaylistTests() {
    console.log("=== BEATPULSE PLAYLIST CRUD VERIFICATION ===");
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
        // 1. Register a test user
        const regRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: `pl_user_${timestamp}`,
                email: `pl_user_${timestamp}@example.com`,
                password: 'password123'
            })
        });
        const regData = await regRes.json();
        const token = regData.token;
        assert(regRes.status === 201 && token, "Register listener for playlist testing");

        // 2. Create Playlist
        const createRes = await fetch(`${BASE_URL}/playlist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'My Telugu Bangers',
                description: 'Best Telugu hits'
            })
        });
        const createData = await createRes.json();
        const playlistId = createData.playlist?._id;
        assert(createRes.status === 201 && playlistId && createData.playlist?.name === 'My Telugu Bangers', "POST /api/playlist creates new playlist");

        // 3. Get User Playlists
        const listRes = await fetch(`${BASE_URL}/playlist`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const listData = await listRes.json();
        assert(listRes.status === 200 && Array.isArray(listData.playlists) && listData.playlists.length >= 1, "GET /api/playlist retrieves user playlists");

        // 4. Add Track to Playlist
        const addTrackRes = await fetch(`${BASE_URL}/playlist/${playlistId}/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                trackId: 'ext_saavn_devara_01',
                title: 'Daavudi',
                artistName: 'Nakash Aziz',
                uri: 'https://example.com/audio.mp3',
                duration: 220
            })
        });
        const addTrackData = await addTrackRes.json();
        assert(addTrackRes.status === 200 && addTrackData.playlist?.musics?.length === 1, "POST /api/playlist/:id/track adds track to playlist");

        // 5. Get Playlist By ID
        const getRes = await fetch(`${BASE_URL}/playlist/${playlistId}`);
        const getData = await getRes.json();
        assert(getRes.status === 200 && getData.playlist?.name === 'My Telugu Bangers' && getData.playlist?.musics?.length === 1, "GET /api/playlist/:id retrieves playlist with tracks");

        // 6. Delete Playlist
        const delRes = await fetch(`${BASE_URL}/playlist/${playlistId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        assert(delRes.status === 200, "DELETE /api/playlist/:id removes playlist");

        console.log(`\nPLAYLIST TEST SUMMARY: ${passed} passed, ${failed} failed.\n`);
        if (failed > 0) process.exit(1);
    } catch (e) {
        console.error("Test error:", e);
        process.exit(1);
    }
}

runPlaylistTests();
