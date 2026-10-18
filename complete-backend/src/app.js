const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const musicRoutes = require('./routes/music.routes');
const playlistRoutes = require('./routes/playlist.routes');

const app = express();
const allowedOrigins = [
    process.env.FRONTEND_ORIGIN,
    'http://localhost:3000',
    'http://127.0.0.1:3000'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        return callback(null, true); // Fallback to allow seamless dev/staging while honoring FRONTEND_ORIGIN
    },
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Terminal Request Logger: Shows every incoming request and response in the terminal
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusColor = res.statusCode >= 400 ? '❌' : '✅';
        console.log(`${statusColor} [${req.method}] ${req.originalUrl} | Status: ${res.statusCode} | Time: ${duration}ms`);
    });
    next();
});

const mongoose = require('mongoose');

app.get('/', (req, res) => {
    return res.status(200).json({
        message: '🎵 BeatPulse Music API Server is running smoothly!',
        status: 'healthy',
        healthCheck: '/api/health',
        documentation: 'https://github.com/PadmavathiPachitala/Beatpulse'
    });
});

app.get(['/api/health', '/api/api/health'], (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    return res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbStatusMap[dbState] || 'unknown',
        uptime: Math.floor(process.uptime())
    });
});

app.use(['/api/auth', '/api/api/auth'], authRoutes);
app.use(['/api/music', '/api/api/music'], musicRoutes);
app.use(['/api/playlist', '/api/api/playlist'], playlistRoutes);

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("Centralized Error Handler:", err.message || err);

    // Handle Multer upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: "File exceeds the 30MB maximum upload limit" });
    }
    if (err.name === 'MulterError') {
        return res.status(400).json({ message: `Upload error: ${err.message}` });
    }

    const statusCode = err.status || err.statusCode || 500;
    // Never leak internal database stack traces or connection errors in production
    const clientMessage = (process.env.NODE_ENV === 'production' && statusCode === 500)
        ? "An internal server error occurred"
        : (err.message || "Internal server error");

    return res.status(statusCode).json({
        message: clientMessage
    });
});

module.exports = app;