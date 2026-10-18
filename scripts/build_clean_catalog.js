const fs = require('fs');
const path = require('path');
const saavn = require('../complete-backend/src/services/jiosaavn.service.js');

const existingCatalog = require('../frontend/src/services/catalog.fallback.json');

// Helper to find a track in existing catalog by title/name substring
function findExisting(titleSubstring, movieSubstring = null) {
    const q1 = titleSubstring.toLowerCase();
    const q2 = movieSubstring ? movieSubstring.toLowerCase() : null;
    for (const cat of existingCatalog) {
        for (const t of cat.tracks || []) {
            const tTitle = (t.title || t.name || '').toLowerCase();
            const tMovie = (t.album?.title || t.album || '').toLowerCase();
            if (tTitle.includes(q1)) {
                if (!q2 || tMovie.includes(q2)) {
                    return t;
                }
            }
        }
    }
    return null;
}

async function fetchFromSaavn(query, fallbackTitle, fallbackMovie) {
    try {
        const results = await saavn.searchSongs(query, 3);
        if (results && results.length > 0) {
            return results[0];
        }
    } catch (e) {
        console.warn(`Saavn fetch failed for ${query}:`, e.message);
    }
    return findExisting(fallbackTitle, fallbackMovie);
}

async function build() {
    console.log('Building clean catalog with ZERO movie and ZERO song duplications...');

    // 0. Trending Now (14 tracks) - Exactly matches README screenshot + top viral hits
    const trending = [
        findExisting('Endhayya Saami', 'Ranabaali'),
        findExisting('Pesamale'),
        findExisting('Radhimaa'),
        findExisting('Uppongela Godavari'),
        findExisting('Yamunatheeram'),
        findExisting('Arey Rey'),
        findExisting('Hey Pillagaada'),
        findExisting('Illuminati', 'Aavesham'),
        findExisting('Aaj Ki Raat', 'Stree 2'),
        findExisting('Tauba Tauba', 'Bad Newz'),
        findExisting('Jaana Samjho Na', 'Bhool Bhulaiyaa 3'),
        findExisting('Millionaire', 'GLORY'),
        findExisting('Hey Minnale', 'Amaran'),
        findExisting('Singara Siriye', 'Kantara')
    ].filter(Boolean);

    // 1. Telugu Hits & Blockbusters (18 tracks) - NO movies from Trending Now!
    const teluguHits = [
        findExisting('Chuttamalle', 'Devara'),
        findExisting('Srimathi Garu', 'Lucky Baskhar'),
        findExisting('Garam Garam', 'Saripodhaa Sanivaaram'),
        findExisting('Samayama', 'Hi Nanna'),
        findExisting('Ta Takkara', 'Kalki'),
        findExisting('Pushpa Pushpa', 'Pushpa 2'),
        findExisting('Naatu Naatu', 'RRR'),
        findExisting('Kurchi Madathapetti', 'Guntur Kaaram'),
        findExisting('Buttabomma', 'Ala Vaikunthapurramuloo'),
        findExisting('Inkem Inkem', 'Geetha Govindam'),
        findExisting('Pilla Puli', 'Aakaasam Nee Haddhu Ra'),
        findExisting('Kola Kalle Ilaa', 'Varudu Kaavalenu'),
        findExisting('Cheliya Cheliya', 'Gharshana'),
        await fetchFromSaavn('Saranga Dariya Love Story', 'Saranga Dariya', 'Love Story'),
        await fetchFromSaavn('Nijame Ne Chebuthunna Ooru Peru Bhairavakona', 'Nijame Ne Chebuthunna', 'Ooru Peru Bhairavakona'),
        await fetchFromSaavn('Kalaavathi Sarkaru Vaari Paata', 'Kalaavathi', 'Sarkaru Vaari Paata'),
        await fetchFromSaavn('Urike Urike Hit 2', 'Urike Urike', 'Hit 2'),
        await fetchFromSaavn('Sirivennela Shyam Singha Roy', 'Sirivennela', 'Shyam Singha Roy')
    ].filter(Boolean);

    // 2. Evergreen Telugu Melodies • Nostalgic Classics (12 tracks) - ZERO overlap with Trending or Telugu Hits!
    const teluguClassics = [
        await fetchFromSaavn('Mellaga Varsham', 'Mellaga', 'Varsham'),
        await fetchFromSaavn('Ghal Ghal Nuvvostanante Nenoddantana', 'Ghal Ghal', 'Nuvvostanante'),
        await fetchFromSaavn('Nuvve Nuvve Kavalantundi', 'Nuvve Nuvve', 'Nuvve Nuvve'),
        await fetchFromSaavn('Bommarillu Nammaka Tappani', 'Nammaka Tappani', 'Bommarillu'),
        await fetchFromSaavn('Chiru Chiru Awaara', 'Chiru Chiru', 'Awaara'),
        await fetchFromSaavn('Gaali Vaaluga Agnyaathavaasi', 'Gaali Vaaluga', 'Agnyaathavaasi'),
        await fetchFromSaavn('Em Sandeham Ledu Oohalu Gusagusalade', 'Em Sandeham Ledu', 'Oohalu'),
        await fetchFromSaavn('Jersey Adhento Gaani Vunnapaatuga', 'Adhento Gaani', 'Jersey'),
        await fetchFromSaavn('Ekkada Unna Nuvve Kavali', 'Nuvve Kavali', 'Nuvve Kavali'),
        await fetchFromSaavn('Panchadaara Magadheera', 'Panchadaara', 'Magadheera'),
        await fetchFromSaavn('Kundanapu Bomma Yemaaya Chesave', 'Kundanapu Bomma', 'Yemaaya Chesave'),
        await fetchFromSaavn('Ammaye Kushi', 'Ammaye', 'Kushi')
    ].filter(Boolean);

    // 3. Bollywood & Hindi Hits (16 tracks) - NO movies from Trending Now!
    const bollywood = [
        findExisting('Jo Tum Mere Ho'),
        findExisting('Satranga', 'Animal'),
        findExisting('O Maahi', 'Dunki'),
        findExisting('Chaleya', 'Jawan'),
        findExisting('Heeriye'),
        findExisting('Apna Bana Le', 'Bhediya'),
        findExisting('Kesariya', 'Brahmastra'),
        findExisting('Tum Hi Ho', 'Aashiqui 2'),
        findExisting('Raataan Lambiyan', 'Shershaah'),
        findExisting('Besharam Rang', 'Pathaan'),
        findExisting('Kabira', 'Yeh Jawaani Hai Deewani'),
        await fetchFromSaavn('Ghungroo War', 'Ghungroo', 'War'),
        await fetchFromSaavn('Tujhe Kitna Chahne Lage Kabir Singh', 'Tujhe Kitna Chahne Lage', 'Kabir Singh'),
        await fetchFromSaavn('Channa Mereya Ae Dil Hai Mushkil', 'Channa Mereya', 'Ae Dil Hai Mushkil'),
        await fetchFromSaavn('Dil Diyan Gallan Tiger Zinda Hai', 'Dil Diyan Gallan', 'Tiger Zinda Hai'),
        await fetchFromSaavn('Galiyan Ek Villain', 'Galliyan', 'Ek Villain')
    ].filter(Boolean);

    // 4. Malayalam Melodies & Hits (16 tracks) - NO movies from Trending Now!
    const malayalam = [
        findExisting('Minnalvala', 'Narivetta'),
        findExisting('Darshana', 'Hridayam'),
        findExisting('Kuthanthram', 'Manjummel Boys'),
        findExisting('Welcome To Hyderabad', 'Premalu'),
        findExisting('Malare', 'Premam'),
        findExisting('Neela Nilave', 'RDX'),
        findExisting('Pavizha Mazha', 'Athiran'),
        findExisting('Jeevamshamayi', 'Theevandi'),
        findExisting('KALYANI (Remix)'),
        findExisting('Asalayavale', 'Khalifa'),
        await fetchFromSaavn('Parayuvaan Ishq', 'Parayuvaan', 'Ishq'),
        await fetchFromSaavn('Uyire Minnal Murali', 'Uyire', 'Minnal Murali'),
        await fetchFromSaavn('Theerame K S Chithra Malik', 'Theerame', 'Malik'),
        await fetchFromSaavn('Thallumaala Paattu', 'Thallumaala Paattu', 'Thallumaala'),
        await fetchFromSaavn('Cherathukal Kumbalangi Nights', 'Cherathukal', 'Kumbalangi Nights'),
        await fetchFromSaavn('Rathipushpam Bheeshma Parvam', 'Rathipushpam', 'Bheeshma Parvam')
    ].filter(Boolean);

    // 5. Tamil Melodies & Waves (14 tracks) - NO movies/singles from Trending Now!
    const tamil = [
        findExisting('Aasa Kooda'),
        findExisting('Hukum', 'Jailer'),
        findExisting('Naa Ready', 'Leo'),
        findExisting('Arabic Kuthu', 'Beast'),
        findExisting('Katchi Sera'),
        findExisting('Spark', 'GOAT'),
        findExisting('Vaathi Coming', 'Master'),
        findExisting('Enjoy Enjaami'),
        findExisting('Rowdy Baby', 'Maari 2'),
        await fetchFromSaavn('Kaathalae Kaathalae 96', 'Kaathalae Kaathalae', '96'),
        await fetchFromSaavn('Marakkuma Nenjam Vendhu Thanindhathu Kaadu', 'Marakkuma Nenjam', 'Vendhu Thanindhathu Kaadu'),
        await fetchFromSaavn('Bae Don Tamil', 'Bae', 'Don'),
        await fetchFromSaavn('Megham Karukatha Thiruchitrambalam', 'Megham Karukatha', 'Thiruchitrambalam'),
        await fetchFromSaavn('Kadharalz Vikram', 'Kadharalz', 'Vikram')
    ].filter(Boolean);

    // 6. Kannada & Sandalwood Beats (8 tracks) - NO Kantara from Trending!
    const kannada = [
        findExisting('Toofan', 'KGF'),
        findExisting('Dwapara'),
        findExisting('Belageddu', 'Kirik Party'),
        await fetchFromSaavn('Ra Ra Rakkamma Vikrant Rona', 'Ra Ra Rakkamma', 'Vikrant Rona'),
        await fetchFromSaavn('Dheera Dheera KGF Chapter 1', 'Dheera Dheera', 'KGF Chapter 1'),
        await fetchFromSaavn('Tagaru Banthu Tagaru', 'Tagaru Banthu Tagaru', 'Tagaru'),
        await fetchFromSaavn('Soul of Dia', 'Soul of Dia', 'Dia'),
        await fetchFromSaavn('Bombe Helutaithe Raajakumara', 'Bombe Helutaithe', 'Raajakumara')
    ].filter(Boolean);

    // 7. Punjabi Beats & Bhangra (7 tracks) - NO Bad Newz Tauba Tauba!
    const punjabi = [
        findExisting('Winning Speech'),
        findExisting('Born to Shine'),
        findExisting('White Brown Black'),
        await fetchFromSaavn('Elevated Shubh', 'Elevated', 'No Love'),
        await fetchFromSaavn('With You AP Dhillon', 'With You', 'With You'),
        await fetchFromSaavn('Brown Munde AP Dhillon', 'Brown Munde', 'Brown Munde'),
        await fetchFromSaavn('Softly Karan Aujla', 'Softly', 'Making Memories')
    ].filter(Boolean);

    const categories = [
        {
            id: 'trending',
            tag: 'trending',
            title: 'Trending Now • Viral Hits',
            name: 'Trending Now • Viral Hits',
            tracks: trending
        },
        {
            id: 'telugu',
            tag: 'telugu',
            title: 'Telugu Hits & Blockbusters',
            name: 'Telugu Hits & Blockbusters',
            tracks: teluguHits
        },
        {
            id: 'feelgood-classics',
            tag: 'feelgood-classics',
            title: 'Evergreen Telugu Melodies • Nostalgic Classics',
            name: 'Evergreen Telugu Melodies • Nostalgic Classics',
            tracks: teluguClassics
        },
        {
            id: 'bollywood',
            tag: 'bollywood',
            title: 'Bollywood & Hindi Hits',
            name: 'Bollywood & Hindi Hits',
            tracks: bollywood
        },
        {
            id: 'malayalam',
            tag: 'malayalam',
            title: 'Malayalam Melodies & Hits',
            name: 'Malayalam Melodies & Hits',
            tracks: malayalam
        },
        {
            id: 'tamil',
            tag: 'tamil',
            title: 'Tamil Melodies & Waves',
            name: 'Tamil Melodies & Waves',
            tracks: tamil
        },
        {
            id: 'kannada',
            tag: 'kannada',
            title: 'Kannada & Sandalwood Beats',
            name: 'Kannada & Sandalwood Beats',
            tracks: kannada
        },
        {
            id: 'punjabi',
            tag: 'punjabi',
            title: 'Punjabi Beats & Bhangra',
            name: 'Punjabi Beats & Bhangra',
            tracks: punjabi
        }
    ];

    console.log('\n--- VERIFICATION AUDIT ---');
    let totalTracks = 0;
    const globalMovieMap = new Map();
    const globalSongMap = new Map();
    let hasIssues = false;

    categories.forEach((cat, idx) => {
        totalTracks += cat.tracks.length;
        console.log(`[Category ${idx}] "${cat.title}": ${cat.tracks.length} tracks`);
        
        const catMovieSet = new Set();
        cat.tracks.forEach(t => {
            const songTitle = (t.title || t.name).trim().toLowerCase();
            const movieTitle = (t.album?.title || t.title || '').trim().toLowerCase();

            // Check within-category movie duplication
            if (catMovieSet.has(movieTitle)) {
                console.error(`  ❌ WITHIN CATEGORY DUPLICATE MOVIE: "${movieTitle}" in "${cat.title}"`);
                hasIssues = true;
            }
            catMovieSet.add(movieTitle);

            // Check cross-category song duplication
            if (globalSongMap.has(songTitle)) {
                console.error(`  ❌ DUPLICATE SONG ACROSS CATEGORIES: "${t.title}" (also in "${globalSongMap.get(songTitle)}")`);
                hasIssues = true;
            } else {
                globalSongMap.set(songTitle, cat.title);
            }

            // Check cross-category movie duplication
            if (globalMovieMap.has(movieTitle)) {
                console.error(`  ❌ DUPLICATE MOVIE ACROSS CATEGORIES: "${movieTitle}" (also in "${globalMovieMap.get(movieTitle)}")`);
                hasIssues = true;
            } else {
                globalMovieMap.set(movieTitle, cat.title);
            }

            // Validate audio URL and cover art
            if (!t.uri && !t.audioUrl) {
                console.error(`  ❌ MISSING AUDIO URL: "${t.title}"`);
                hasIssues = true;
            }
            if (!t.coverImage) {
                console.error(`  ❌ MISSING COVER IMAGE: "${t.title}"`);
                hasIssues = true;
            }
        });
    });

    console.log(`Total tracks: ${totalTracks}`);
    console.log(`Unique songs: ${globalSongMap.size}`);
    console.log(`Unique movies/singles: ${globalMovieMap.size}`);

    if (hasIssues) {
        console.error('Validation failed with issues above! Please fix before writing.');
        process.exit(1);
    }

    console.log('\n✅ 100% PERFECT! Zero duplicate songs, zero duplicate movies, complete audio and artwork for every single card.');

    const jsonStr = JSON.stringify(categories, null, 2);
    const frontendPath = path.join(__dirname, '../frontend/src/services/catalog.fallback.json');
    const backendPath = path.join(__dirname, '../complete-backend/src/services/catalog.fallback.json');

    fs.writeFileSync(frontendPath, jsonStr, 'utf8');
    fs.writeFileSync(backendPath, jsonStr, 'utf8');
    console.log(`Saved clean catalog to:\n  - ${frontendPath}\n  - ${backendPath}`);
}

build().catch(err => {
    console.error('Build script crashed:', err);
    process.exit(1);
});
