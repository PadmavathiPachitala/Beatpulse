const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Windows querySrv ECONNREFUSED with MongoDB Atlas
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    // ignore if not supported in environment
}

async function connectDB() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!mongoUri) throw new Error("MONGO_URI or MONGODB_URI environment variable is missing");
        await mongoose.connect(mongoUri);
        console.log('Database connected successfully');
    }
    catch (error) {
        console.error('Database connection error:', error);
    }
}

module.exports = connectDB;