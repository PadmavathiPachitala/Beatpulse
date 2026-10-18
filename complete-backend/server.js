require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/db/db');


connectDB();



const PORT = process.env.PORT || 4000;
const { warmCategoriesCache } = require('./src/controllers/music.controller');

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // Pre-warm category cache in background so first user request has 0ms latency
    setTimeout(() => {
        warmCategoriesCache();
    }, 1000);
});