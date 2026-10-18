const BASE_URL = process.env.API_URL || 'http://localhost:4000/api';

async function runSecurityTests() {
    console.log("=== BEATPULSE SECURITY HARDENING VERIFICATION ===");
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
        // 1. NoSQL Injection Prevention on Login
        const nosqlLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: { "$gt": "" },
                password: 'password123'
            })
        });
        assert(nosqlLoginRes.status === 400, "NoSQL Injection: Non-string email object rejected (400 Bad Request)");

        // 2. NoSQL Injection Prevention on Register
        const nosqlRegRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: { "$ne": null },
                email: `test_nosql_${timestamp}@beatpulse.com`,
                password: 'Password123!'
            })
        });
        assert(nosqlRegRes.status === 400, "NoSQL Injection: Non-string username object rejected (400 Bad Request)");

        // 3. ReDoS / Regex Injection Resistance
        const startReDoS = Date.now();
        const redosRes = await fetch(`${BASE_URL}/music/search?q=${encodeURIComponent('((((a+)+)+)+)+$')}`);
        const elapsedReDoS = Date.now() - startReDoS;
        // Catastrophic backtracking without escaping freezes event loop for >30s; with escaping, finishes within standard network roundtrip (<3s)
        assert(redosRes.status === 200 && elapsedReDoS < 3000, "ReDoS Resistance: Catastrophic regex pattern handled safely", `(${elapsedReDoS}ms)`);

        // 4. Special Characters in Search (Regex Escaping)
        const specialCharRes = await fetch(`${BASE_URL}/music/search?q=${encodeURIComponent('[a-z]*+?^$()')}`);
        assert(specialCharRes.status === 200, "Regex Escaping: Unescaped regex metacharacters execute safely without syntax error");

        // 5. Tampered JWT Verification
        const forgedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3MGQ4OGYxMjM0NTY3ODkwYWJjZGVmMSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTYyMDAwMDAwMH0.fake_signature";
        const forgedAuthRes = await fetch(`${BASE_URL}/music/admin/stats`, {
            headers: { Authorization: `Bearer ${forgedToken}` }
        });
        assert(forgedAuthRes.status === 401, "Token Security: Forged / Tampered signature token rejected (401 Unauthorized)");

        // 6. Register a Valid User for Privilege Escalation Tests
        const regUserRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: `sec_user_${timestamp}`,
                email: `sec_${timestamp}@beatpulse.com`,
                password: 'Password123!'
            })
        });
        const regUserData = await regUserRes.json();
        const userToken = regUserData.token;

        // 7. Privilege Escalation: User Cannot Upgrade with Wrong Key
        const badUpgradeRes = await fetch(`${BASE_URL}/auth/upgrade-artist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userToken}`
            },
            body: JSON.stringify({
                targetRole: 'admin',
                artistKey: 'MALICIOUS_ATTEMPT'
            })
        });
        assert(badUpgradeRes.status === 403, "Privilege Escalation: Upgrade with invalid admin/artist key rejected (403 Forbidden)");

        // 8. Role Enforcement: Regular User Blocked from Admin Routes
        const adminAccessRes = await fetch(`${BASE_URL}/music/admin/stats`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        assert(adminAccessRes.status === 403, "RBAC Boundary: Regular user blocked from admin stats (403 Forbidden)");

        // 9. Role Enforcement: Regular User Blocked from Upload
        const uploadAttemptRes = await fetch(`${BASE_URL}/music/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${userToken}` },
            body: JSON.stringify({ title: 'Unauthorized' })
        });
        assert(uploadAttemptRes.status === 403, "RBAC Boundary: Regular user blocked from music upload (403 Forbidden)");

        // 10. Register Artist for MIME & External Catalog Tests
        const regArtistRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: `sec_art_${timestamp}`,
                email: `sec_art_${timestamp}@beatpulse.com`,
                password: 'Password123!',
                role: 'artist',
                artistKey: 'BEATPULSE_ARTIST'
            })
        });
        const regArtistData = await regArtistRes.json();
        const artistToken = regArtistData.token;

        // 11. External Catalog Deletion Protection
        const extDeleteRes = await fetch(`${BASE_URL}/music/ext_audius_ANM13`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${artistToken}` }
        });
        assert(extDeleteRes.status === 403 || extDeleteRes.status === 404, 
            "External Catalog Protection: Artist cannot delete external Audius track (403/404)");

        // 12. MIME Type Validation on File Upload
        const boundary = '----WebKitFormBoundary' + timestamp;
        const fakeFileBody = [
            `--${boundary}`,
            'Content-Disposition: form-data; name="title"',
            '',
            'Executable File Upload',
            `--${boundary}`,
            'Content-Disposition: form-data; name="music"; filename="malicious.exe"',
            'Content-Type: application/x-msdownload',
            '',
            'MZFakeExecutableContent',
            `--${boundary}--`
        ].join('\r\n');

        const badMimeRes = await fetch(`${BASE_URL}/music/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                Authorization: `Bearer ${artistToken}`
            },
            body: fakeFileBody
        });
        assert(badMimeRes.status === 400, "MIME Validation: Non-audio file (.exe / application/x-msdownload) rejected (400 Bad Request)");

        console.log(`\nSECURITY HARDENING TEST SUMMARY: ${passed} passed, ${failed} failed.`);
        if (failed > 0) process.exit(1);
    } catch (err) {
        console.error("Security hardening execution exception:", err);
        process.exit(1);
    }
}

runSecurityTests();
