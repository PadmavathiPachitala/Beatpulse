const assert = require("assert");
const http = require("http");

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      })
      .on("error", reject);
  });
}

async function runLyricsTests() {
  console.log("=== LYRICS ENDPOINT & SERVICE VERIFICATION ===");

  // 1. Missing parameters test
  const resEmpty = await fetchJson("http://localhost:4000/api/music/lyrics");
  assert.strictEqual(resEmpty.status, 400, "Should return 400 when track query param is missing");
  console.log("✅ PASS: Missing track query param returns 400 Bad Request");

  // 2. Real query: Kesariya - Arijit Singh
  const resKesariya = await fetchJson("http://localhost:4000/api/music/lyrics?track=Kesariya&artist=Arijit%20Singh");
  assert.strictEqual(resKesariya.status, 200, "Should return 200 OK for known song");
  assert.strictEqual(resKesariya.json.success, true, "Response should have success: true");
  assert.ok(resKesariya.json.syncedLyrics && resKesariya.json.syncedLyrics.length > 0, "Should have parsed sync lines");
  assert.strictEqual(resKesariya.json.isSynced, true, "Should have isSynced flag set");
  console.log(`✅ PASS: Synchronized lyrics retrieved for 'Kesariya' (${resKesariya.json.syncedLyrics.length} lines, isSynced: ${resKesariya.json.isSynced})`);

  // 3. Cache verification (second call should be fast cache hit)
  const t0 = Date.now();
  const resCache = await fetchJson("http://localhost:4000/api/music/lyrics?track=Kesariya&artist=Arijit%20Singh");
  const elapsed = Date.now() - t0;
  assert.strictEqual(resCache.status, 200);
  assert.ok(elapsed < 100, `Cache hit should be near instantaneous (${elapsed}ms)`);
  console.log(`✅ PASS: In-memory cache returns cached lyrics in ${elapsed}ms`);

  // 4. Unknown/Instrumental/Fallback song test
  const resUnknown = await fetchJson("http://localhost:4000/api/music/lyrics?track=Zxqw987nonexistentsong1234&artist=UnknownArtist99");
  assert.strictEqual(resUnknown.status, 200);
  assert.strictEqual(resUnknown.json.success, true);
  assert.strictEqual(resUnknown.json.lyrics, null, "Unknown song should gracefully report lyrics: null");
  console.log("✅ PASS: Non-existent track gracefully returns lyrics: null without crashing");

  console.log("\nLYRICS TEST SUMMARY: 4 passed, 0 failed.\n");
}

runLyricsTests().catch((err) => {
  console.error("Lyrics test failed:", err);
  process.exit(1);
});
