const BASE_URL = process.env.API_URL || 'http://localhost:4000/api';

async function runDeepRbacTests() {
    console.log("=== BEATPULSE DEEP RBAC & SECURITY VERIFICATION ===");
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
        // 1. Register Artist 1
        const artist1Creds = {
            username: `art1_${timestamp}`,
            email: `art1_${timestamp}@beatpulse.com`,
            password: 'Password123!',
            role: 'artist',
            artistKey: 'BEATPULSE_ARTIST'
        };
        const r1 = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(artist1Creds)
        });
        const d1 = await r1.json();
        const artist1Token = d1.token;
        assert(r1.status === 201 && d1.user?.role === 'artist', "Artist 1 Registration");

        // 2. Register Artist 2
        const artist2Creds = {
            username: `art2_${timestamp}`,
            email: `art2_${timestamp}@beatpulse.com`,
            password: 'Password123!',
            role: 'artist',
            artistKey: 'BEATPULSE_ARTIST'
        };
        const r2 = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(artist2Creds)
        });
        const d2 = await r2.json();
        const artist2Token = d2.token;
        assert(r2.status === 201 && d2.user?.role === 'artist', "Artist 2 Registration");

        // 3. Register Regular User
        const userCreds = {
            username: `reg_${timestamp}`,
            email: `reg_${timestamp}@beatpulse.com`,
            password: 'Password123!'
        };
        const rU = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userCreds)
        });
        const dU = await rU.json();
        const userToken = dU.token;
        assert(rU.status === 201 && dU.user?.role === 'user', "Regular User Registration");

        // 4. Register Admin
        const adminCreds = {
            username: `admin_${timestamp}`,
            email: `admin_${timestamp}@beatpulse.com`,
            password: 'Password123!',
            role: 'admin',
            adminKey: 'BEATPULSE_ADMIN'
        };
        const rA = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adminCreds)
        });
        const dA = await rA.json();
        const adminToken = dA.token;
        assert(rA.status === 201 && dA.user?.role === 'admin', "Admin Registration with valid key");

        // 5. Artist 1 creates an Album
        const albumRes = await fetch(`${BASE_URL}/music/album`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${artist1Token}`
            },
            body: JSON.stringify({
                title: `Artist1 Album ${timestamp}`,
                coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500'
            })
        });
        const albumData = await albumRes.json();
        const albumId = albumData.album?.id;
        assert(albumRes.status === 201 && Boolean(albumId), "Artist 1 creates Album");

        // 6. Resource Ownership Test: Artist 2 attempts to delete Artist 1's Album
        const rogueDeleteRes = await fetch(`${BASE_URL}/music/album/${albumId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${artist2Token}` }
        });
        assert(rogueDeleteRes.status === 403, "Resource Ownership: Artist 2 blocked from deleting Artist 1's album (403 Forbidden)");

        // 7. Regular User attempts to delete Artist 1's Album
        const userDeleteRes = await fetch(`${BASE_URL}/music/album/${albumId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${userToken}` }
        });
        assert(userDeleteRes.status === 403, "Resource Ownership: User blocked from deleting Artist 1's album (403 Forbidden)");

        // 8. Admin attempts to read Admin Stats
        const adminStatsRes = await fetch(`${BASE_URL}/music/admin/stats`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const adminStatsData = await adminStatsRes.json();
        assert(adminStatsRes.status === 200 && Boolean(adminStatsData.stats), "Admin Stats: Admin authorized to read platform stats (200 OK)");

        // 9. Artist attempts to read Admin Stats
        const artistStatsRes = await fetch(`${BASE_URL}/music/admin/stats`, {
            headers: { Authorization: `Bearer ${artist1Token}` }
        });
        assert(artistStatsRes.status === 403, "Admin Protection: Artist blocked from admin stats (403 Forbidden)");

        // 10. Regular User attempts to read Admin Stats
        const userStatsRes = await fetch(`${BASE_URL}/music/admin/stats`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        assert(userStatsRes.status === 403, "Admin Protection: User blocked from admin stats (403 Forbidden)");

        // 11. Privilege Escalation Security: Upgrade to Artist with Invalid Key
        const fakeUpgradeRes = await fetch(`${BASE_URL}/auth/upgrade-artist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userToken}`
            },
            body: JSON.stringify({ artistKey: 'WRONG_INVITE_KEY' })
        });
        assert(fakeUpgradeRes.status === 403, "Privilege Escalation: Upgrade with invalid artist key rejected (403 Forbidden)");

        // 12. Privilege Escalation Security: Upgrade to Admin with Invalid Key
        const fakeAdminUpgradeRes = await fetch(`${BASE_URL}/auth/upgrade-artist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userToken}`
            },
            body: JSON.stringify({ targetRole: 'admin', adminKey: 'WRONG_ADMIN_KEY' })
        });
        assert(fakeAdminUpgradeRes.status === 403, "Privilege Escalation: Upgrade with invalid admin key rejected (403 Forbidden)");

        // 13. Legitimate Role Upgrade: Upgrade to Artist with Valid Key
        const validUpgradeRes = await fetch(`${BASE_URL}/auth/upgrade-artist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userToken}`
            },
            body: JSON.stringify({ artistKey: 'BEATPULSE_ARTIST' })
        });
        const validUpgradeData = await validUpgradeRes.json();
        assert(validUpgradeRes.status === 200 && validUpgradeData.user?.role === 'artist', "Role Upgrade: User upgraded to Artist with valid key (200 OK)");

        // 14. Validation: Registration with missing password rejected
        const badRegRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'nopass', email: 'nopass@test.com' })
        });
        assert(badRegRes.status === 400, "Input Validation: Missing password rejected (400 Bad Request)");

        // 15. Validation: Music upload without file rejected
        const badUploadRes = await fetch(`${BASE_URL}/music/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${artist1Token}`
            },
            body: JSON.stringify({ title: 'Song With No File' })
        });
        assert(badUploadRes.status === 400, "Input Validation: Upload without audio file rejected (400 Bad Request)");

        // 16. Admin Cleanup of Created Test Album
        const adminDeleteRes = await fetch(`${BASE_URL}/music/album/${albumId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert(adminDeleteRes.status === 200, "Admin Authority: Admin authorized to delete album (200 OK)");

        console.log(`\nDEEP RBAC TEST SUMMARY: ${passed} passed, ${failed} failed.`);
        if (failed > 0) process.exit(1);
    } catch (err) {
        console.error("Deep RBAC execution exception:", err);
        process.exit(1);
    }
}

runDeepRbacTests();
