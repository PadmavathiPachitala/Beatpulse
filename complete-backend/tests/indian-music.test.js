const BASE_URL = process.env.API_URL || 'http://localhost:4000/api';

async function runIndianMusicTests() {
    console.log("=== BEATPULSE INDIAN MUSIC & COEXISTENCE VERIFICATION ===");
    const timestamp = Date.now();
    let passed = 0;
    let failed = 0;

    function assert(condition, testName, detail = '') {
        if (condition) {
            console.log(`✅ PASS: ${testName} ${detail}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${testName} ${detail}`);
            failed++;
        }
    }

    try {
        // 1. Indian Categories Endpoint
        const catRes = await fetch(`${BASE_URL}/music/indian/categories`);
        const catData = await catRes.json();
        assert(catRes.status === 200 && Array.isArray(catData.categories) && catData.categories.length >= 6, 
            "Indian Categories Endpoint", `(Found ${catData.categories?.length || 0} categories)`);

        // Verify key Indian categories exist
        const catIds = (catData.categories || []).map(c => c.id);
        assert(catIds.includes('telugu'), "Telugu Category Exists");
        assert(catIds.includes('bollywood'), "Bollywood & Hindi Category Exists");
        assert(catIds.includes('tamil'), "Tamil Category Exists");
        assert(catIds.includes('kannada'), "Kannada Category Exists");
        assert(catIds.includes('malayalam'), "Malayalam Category Exists");
        assert(catIds.includes('punjabi'), "Punjabi Category Exists");

        // Verify track structure in categories
        const teluguCategory = catData.categories.find(c => c.id === 'telugu');
        const sampleTeluguTrack = teluguCategory?.tracks?.[0];
        assert(
            Boolean(sampleTeluguTrack && sampleTeluguTrack.uri && sampleTeluguTrack.coverImage && sampleTeluguTrack.title),
            "Telugu Track Normalized Structure",
            sampleTeluguTrack ? `("${sampleTeluguTrack.title}" by ${sampleTeluguTrack.artist?.name})` : ''
        );

        // 2. Indian Music Search (Telugu)
        const searchTeluguRes = await fetch(`${BASE_URL}/music/search?q=Telugu`);
        const searchTeluguData = await searchTeluguRes.json();
        assert(searchTeluguRes.status === 200 && Array.isArray(searchTeluguData.musics) && searchTeluguData.musics.length > 0,
            "Search Indian Music (Telugu)", `(${searchTeluguData.musics?.length || 0} tracks found)`);

        // 3. Indian Music Search (Bollywood / Hindi)
        const searchHindiRes = await fetch(`${BASE_URL}/music/search?q=Bollywood`);
        const searchHindiData = await searchHindiRes.json();
        assert(searchHindiRes.status === 200 && Array.isArray(searchHindiData.musics) && searchHindiData.musics.length > 0,
            "Search Indian Music (Bollywood)", `(${searchHindiData.musics?.length || 0} tracks found)`);

        // 4. Register a listener user for Like tests
        const userCreds = {
            username: `indian_listener_${timestamp}`,
            email: `indian_listener_${timestamp}@beatpulse.com`,
            password: 'Password123!'
        };
        const regRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userCreds)
        });
        const regData = await regRes.json();
        const userToken = regData.token;
        assert(regRes.status === 201 && Boolean(userToken), "Register Listener for Indian Like Flow");

        // 5. Like External Indian Track
        const externalTrack = sampleTeluguTrack || {
            id: 'ext_audius_ANM13',
            externalId: 'ANM13',
            title: 'Telugu Hit',
            artistName: 'Telugu Artist',
            uri: 'https://api.audius.co/v1/tracks/ANM13/stream?app_name=BeatPulse',
            coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500',
            duration: 180,
            source: 'audius'
        };

        const likeExtRes = await fetch(`${BASE_URL}/music/like/${externalTrack.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({
                title: externalTrack.title,
                artistName: externalTrack.artist?.name || externalTrack.artistName || 'Indian Artist',
                coverImage: externalTrack.coverImage,
                uri: externalTrack.uri,
                duration: externalTrack.duration || 180,
                externalId: externalTrack.externalId || externalTrack.id,
                source: 'audius'
            })
        });
        const likeExtData = await likeExtRes.json();
        assert(likeExtRes.status === 200 && likeExtData.isLiked === true, "Like External Indian Track (MongoDB Stored)");

        // 6. Like a Local Track to verify Coexistence in Library
        const catalogRes = await fetch(`${BASE_URL}/music/`);
        const catalogData = await catalogRes.json();
        const localTrack = (catalogData.musics || []).find(m => !m.isExternal && m._id);
        if (localTrack) {
            const likeLocalRes = await fetch(`${BASE_URL}/music/like/${localTrack._id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const likeLocalData = await likeLocalRes.json();
            assert(likeLocalRes.status === 200 && likeLocalData.isLiked === true, "Like Local Track (Local + External Coexistence)");
        }

        // 7. Verify Liked Songs Library Contains Both External and Local Tracks
        const likedRes = await fetch(`${BASE_URL}/music/liked`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        const likedData = await likedRes.json();
        assert(likedRes.status === 200 && Array.isArray(likedData.tracks) && likedData.tracks.length >= 1, 
            "Retrieve Liked Songs (Populated without ObjectId collision)",
            `(${likedData.tracks?.length || 0} tracks in library)`);

        // 8. Security: Artist Cannot Delete External Music
        const artistCreds = {
            username: `artist_sec_${timestamp}`,
            email: `artist_sec_${timestamp}@beatpulse.com`,
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
        const artistToken = regArtistData.token;

        // Try to delete external track
        const extDeleteRes = await fetch(`${BASE_URL}/music/${externalTrack.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${artistToken}` }
        });
        assert(extDeleteRes.status === 403 || extDeleteRes.status === 404, 
            "RBAC Security: Artist blocked from deleting external music (403/404)");

        console.log(`\nINDIAN MUSIC TEST SUMMARY: ${passed} passed, ${failed} failed.`);
        if (failed > 0) process.exit(1);
    } catch (err) {
        console.error("Indian music test failed:", err);
        process.exit(1);
    }
}

runIndianMusicTests();
