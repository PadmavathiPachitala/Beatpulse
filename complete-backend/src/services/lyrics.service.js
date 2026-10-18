/**
 * Lyrics Service
 * Multi-tiered lyrics provider using LRCLIB open public lyrics protocol,
 * intelligent Telugu / regional language scoring, candidate ranking,
 * and resilient caching.
 */

const LRCLIB_BASE = 'https://lrclib.net/api';
const lyricsCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function parseLrc(syncedLrc) {
    if (!syncedLrc || typeof syncedLrc !== 'string') return null;
    const lines = syncedLrc.split('\n');
    const parsed = [];

    const lrcRegex = /^\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\](.*)$/;

    for (const line of lines) {
        const trimmed = line.trim();
        const match = lrcRegex.exec(trimmed);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseFloat(match[2]);
            const time = minutes * 60 + seconds;
            const text = match[3].trim();
            parsed.push({ time, text });
        }
    }

    return parsed.length > 0 ? parsed : null;
}

function cleanTitle(rawTitle) {
    if (!rawTitle) return '';
    return rawTitle
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&')
        // Strip movie/soundtrack qualifiers with straight or smart/curly quotes
        .replace(/\(From\s+["“'][^"”']+["”']\)/gi, '')
        .replace(/\(From\s+[^)]+\)/gi, '')
        .replace(/- From\s+["“'][^"”']+["”']/gi, '')
        .replace(/- From\s+[^-]+/gi, '')
        // Strip featuring and collaborations
        .replace(/\(feat\.[^)]+\)/gi, '')
        .replace(/\(ft\.[^)]+\)/gi, '')
        .replace(/\(with[^)]+\)/gi, '')
        .replace(/\[[^\]]+\]/gi, '')
        // Strip edition tags but keep language if needed elsewhere
        .replace(/\((?:Soundtrack|Lofi|Remix|Original Motion Picture Soundtrack|Audio|Video|Official)\)/gi, '')
        .replace(/-\s*(?:Live|Remix|Soundtrack)$/i, '')
        // Strip language qualifiers for clean base title
        .replace(/\((?:Telugu|Tamil|Hindi|Malayalam|Kannada)\)/gi, '')
        .replace(/-\s*(?:Telugu|Tamil|Hindi|Malayalam|Kannada)$/i, '')
        .trim();
}

function getPrimaryArtist(artistStr) {
    if (!artistStr) return '';
    const parts = artistStr.split(/[,&/|]|\bfeat\b|\bft\b|\bwith\b/i);
    return parts[0].trim();
}

function scoreCandidate(item, cleanedTitle, cleanedArtist, isTelugu) {
    if (!item) return -1000;
    const lyricsText = (item.syncedLyrics || item.plainLyrics || '');
    if (!lyricsText.trim()) return -1000;

    const lowerTitle = cleanedTitle.toLowerCase();
    const primaryArtist = getPrimaryArtist(cleanedArtist).toLowerCase();
    const itemTrackName = (item.trackName || '').toLowerCase();
    const itemArtistName = (item.artistName || '').toLowerCase();
    const itemAlbumName = (item.albumName || '').toLowerCase();
    const combinedMeta = `${itemTrackName} ${itemArtistName} ${itemAlbumName}`;

    let score = 0;

    // Check script presence
    const hasTeluguScript = /[\u0C00-\u0C7F]/.test(lyricsText) || /[\u0C00-\u0C7F]/.test(combinedMeta);
    const hasTamilScript = /[\u0B80-\u0BFF]/.test(lyricsText);
    const hasDevanagari = /[\u0900-\u097F]/.test(lyricsText);
    const hasKannadaScript = /[\u0C80-\u0CFF]/.test(lyricsText);
    const hasMalayalamScript = /[\u0D00-\u0D7F]/.test(lyricsText);

    if (isTelugu) {
        // Severe penalty if another Indian script or language is detected in lyrics
        if (hasTamilScript || /tamil/i.test(combinedMeta)) return -250;
        if (hasDevanagari || /hindi/i.test(combinedMeta)) return -200;
        if (hasKannadaScript || /kannada/i.test(combinedMeta)) return -200;
        if (hasMalayalamScript || /malayalam/i.test(combinedMeta)) return -200;

        // Big boost for authentic Telugu script or explicit Telugu in metadata
        if (hasTeluguScript) score += 350;
        if (/telugu/i.test(combinedMeta)) score += 180;
    }

    // Title matching
    if (itemTrackName === lowerTitle) {
        score += 100;
    } else if (itemTrackName.includes(lowerTitle)) {
        score += 70;
    } else if (lowerTitle.includes(itemTrackName)) {
        score += 40;
    } else {
        score -= 60;
    }

    // Artist matching
    if (primaryArtist && (itemArtistName.includes(primaryArtist) || primaryArtist.includes(itemArtistName))) {
        score += 80;
    }

    // Prefer synced lyrics
    if (item.syncedLyrics) {
        score += 40;
    }

    return score;
}

function pickBestCandidate(candidates, cleanedTitle, cleanedArtist, isTelugu) {
    if (!Array.isArray(candidates) || candidates.length === 0) return null;

    const withLyrics = candidates.filter(item => (item.syncedLyrics || item.plainLyrics) && !item.instrumental);
    if (withLyrics.length === 0) {
        const instrumentalItem = candidates.find(item => item.instrumental);
        if (instrumentalItem) return instrumentalItem;
        return null;
    }

    // Rank candidates using score
    const scored = withLyrics.map(item => ({
        item,
        score: scoreCandidate(item, cleanedTitle, cleanedArtist, isTelugu)
    }));

    scored.sort((a, b) => b.score - a.score);

    if (isTelugu) {
        // If Telugu was requested, ensure we don't return mismatched other language
        if (scored[0].score < 0) {
            return null;
        }
    }

    return scored[0]?.item || null;
}

class LyricsService {
    async getLyrics(trackName, artistName, durationSec, language) {
        if (!trackName) {
            return { lyrics: null, message: "Track title is required" };
        }

        const rawLower = `${trackName} ${artistName || ''} ${language || ''}`.toLowerCase();
        const isTelugu = language?.toLowerCase() === 'telugu' ||
                         rawLower.includes('telugu') ||
                         /[\u0C00-\u0C7F]/.test(trackName) ||
                         /\b(devara|pushpa|rrr|salaar|guntur|kalki|hanuman|saripodhaa|anirudh|devi sri prasad|thaman|keeravaani|sid sriram|ram miriyala|anurag kulkarni|mangli)\b/i.test(rawLower);

        const cleanedTitle = cleanTitle(trackName);
        const primaryArtist = getPrimaryArtist(artistName);
        const cacheKey = `${cleanedTitle.toLowerCase()}___${(primaryArtist || '').toLowerCase()}___${isTelugu ? 'telugu' : 'any'}`;

        const cached = lyricsCache.get(cacheKey);
        if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
            return cached.data;
        }

        try {
            // Tier 1 (for Telugu): Search specifically with Telugu keyword first
            if (isTelugu) {
                try {
                    const ctrl = new AbortController();
                    const to = setTimeout(() => ctrl.abort(), 2500);
                    const searchQuery = `${cleanedTitle} Telugu`;
                    const searchRes = await fetch(`${LRCLIB_BASE}/search?q=${encodeURIComponent(searchQuery)}`, {
                        headers: { 'User-Agent': 'BeatPulseMusic/1.0.0 (https://github.com/beatpulse)' },
                        signal: ctrl.signal
                    });
                    clearTimeout(to);

                    if (searchRes.ok) {
                        const searchData = await searchRes.json();
                        const candidate = pickBestCandidate(searchData, cleanedTitle, artistName, true);
                        if (candidate && (candidate.syncedLyrics || candidate.plainLyrics)) {
                            const result = this.formatResult(candidate);
                            lyricsCache.set(cacheKey, { data: result, time: Date.now() });
                            return result;
                        }
                    }
                } catch (err) {
                    // Continue
                }
            }

            // Tier 2: LRCLIB exact /api/get with track_name and artist_name
            if (cleanedTitle && primaryArtist) {
                try {
                    let queryParams = `track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(primaryArtist)}`;
                    if (durationSec && typeof durationSec === 'number' && durationSec > 0) {
                        queryParams += `&duration=${Math.round(durationSec)}`;
                    }

                    const ctrl = new AbortController();
                    const to = setTimeout(() => ctrl.abort(), 2500);
                    const res = await fetch(`${LRCLIB_BASE}/get?${queryParams}`, {
                        headers: { 'User-Agent': 'BeatPulseMusic/1.0.0 (https://github.com/beatpulse)' },
                        signal: ctrl.signal
                    });
                    clearTimeout(to);

                    if (res.ok) {
                        const data = await res.json();
                        if ((data.syncedLyrics || data.plainLyrics) && !data.instrumental) {
                            // Verify Telugu compatibility if requested
                            const score = scoreCandidate(data, cleanedTitle, primaryArtist, isTelugu);
                            if (!isTelugu || score >= 0) {
                                const result = this.formatResult(data);
                                lyricsCache.set(cacheKey, { data: result, time: Date.now() });
                                return result;
                            }
                        }
                    }
                } catch (err) {
                    // Continue
                }
            }

            // Tier 3: LRCLIB /api/search with cleanedTitle + primaryArtist
            if (cleanedTitle && primaryArtist) {
                try {
                    const ctrl = new AbortController();
                    const to = setTimeout(() => ctrl.abort(), 2500);
                    const searchQuery = `${cleanedTitle} ${primaryArtist}`;
                    const searchRes = await fetch(`${LRCLIB_BASE}/search?q=${encodeURIComponent(searchQuery)}`, {
                        headers: { 'User-Agent': 'BeatPulseMusic/1.0.0 (https://github.com/beatpulse)' },
                        signal: ctrl.signal
                    });
                    clearTimeout(to);

                    if (searchRes.ok) {
                        const searchData = await searchRes.json();
                        const candidate = pickBestCandidate(searchData, cleanedTitle, artistName, isTelugu);
                        if (candidate && (candidate.syncedLyrics || candidate.plainLyrics)) {
                            const result = this.formatResult(candidate);
                            lyricsCache.set(cacheKey, { data: result, time: Date.now() });
                            return result;
                        }
                    }
                } catch (err) {
                    // Continue
                }
            }

            // Tier 4: LRCLIB /api/search with cleanedTitle alone
            if (cleanedTitle) {
                try {
                    const ctrl = new AbortController();
                    const to = setTimeout(() => ctrl.abort(), 2500);
                    const searchRes = await fetch(`${LRCLIB_BASE}/search?q=${encodeURIComponent(cleanedTitle)}`, {
                        headers: { 'User-Agent': 'BeatPulseMusic/1.0.0 (https://github.com/beatpulse)' },
                        signal: ctrl.signal
                    });
                    clearTimeout(to);

                    if (searchRes.ok) {
                        const searchData = await searchRes.json();
                        const candidate = pickBestCandidate(searchData, cleanedTitle, artistName, isTelugu);
                        if (candidate && (candidate.syncedLyrics || candidate.plainLyrics)) {
                            const result = this.formatResult(candidate);
                            lyricsCache.set(cacheKey, { data: result, time: Date.now() });
                            return result;
                        } else if (candidate && candidate.instrumental) {
                            const result = this.formatResult(candidate);
                            lyricsCache.set(cacheKey, { data: result, time: Date.now() });
                            return result;
                        }
                    }
                } catch (err) {
                    // Continue
                }
            }

            // Tier 5: Fallback to lyrics.ovh for non-Telugu plain lyrics
            if (!isTelugu && primaryArtist && cleanedTitle) {
                try {
                    const ctrl = new AbortController();
                    const to = setTimeout(() => ctrl.abort(), 2500);
                    const ovhRes = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(primaryArtist)}/${encodeURIComponent(cleanedTitle)}`, {
                        signal: ctrl.signal
                    });
                    clearTimeout(to);

                    if (ovhRes.ok) {
                        const ovhData = await ovhRes.json();
                        if (ovhData.lyrics && ovhData.lyrics.trim().length > 0) {
                            const result = {
                                lyrics: ovhData.lyrics.trim(),
                                plainLyrics: ovhData.lyrics.trim(),
                                syncedLyrics: null,
                                rawLrc: null,
                                isSynced: false,
                                instrumental: false,
                                trackName: cleanedTitle,
                                artistName: primaryArtist
                            };
                            lyricsCache.set(cacheKey, { data: result, time: Date.now() });
                            return result;
                        }
                    }
                } catch (err) {
                    // Continue
                }
            }

            // No lyrics found across tiers
            const emptyResult = {
                lyrics: null,
                plainLyrics: null,
                syncedLyrics: null,
                isSynced: false,
                instrumental: false,
                message: isTelugu ? "Telugu lyrics unavailable for this track" : "Lyrics unavailable for this track"
            };
            lyricsCache.set(cacheKey, { data: emptyResult, time: Date.now() });
            return emptyResult;
        } catch (err) {
            console.warn(`[LyricsService] Error fetching lyrics for "${trackName}":`, err.message);
            return {
                lyrics: null,
                plainLyrics: null,
                syncedLyrics: null,
                isSynced: false,
                instrumental: false,
                message: "Unable to load lyrics at this time"
            };
        }
    }

    formatResult(data) {
        if (!data) return null;
        if (data.instrumental && !data.syncedLyrics && !data.plainLyrics) {
            return {
                lyrics: null,
                plainLyrics: null,
                syncedLyrics: null,
                isSynced: false,
                instrumental: true,
                message: "This track is instrumental."
            };
        }

        const synced = parseLrc(data.syncedLyrics);
        return {
            lyrics: data.plainLyrics || (synced ? synced.map(s => s.text).join('\n') : null),
            plainLyrics: data.plainLyrics || (synced ? synced.map(s => s.text).join('\n') : null),
            syncedLyrics: synced,
            rawLrc: data.syncedLyrics || null,
            isSynced: Boolean(synced && synced.length > 0),
            instrumental: false,
            trackName: data.trackName,
            artistName: data.artistName
        };
    }
}

module.exports = new LyricsService();
