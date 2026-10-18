const jwt = require("jsonwebtoken");

function extractToken(req) {
    if (req.cookies && req.cookies.token) {
        return req.cookies.token;
    }
    if (req.headers && req.headers.authorization) {
        const parts = req.headers.authorization.split(" ");
        if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
            return parts[1];
        }
    }
    return null;
}

async function authArtist(req, res, next) {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: Missing authentication token" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "artist" && decoded.role !== "admin") {
            return res.status(403).json({ message: "Forbidden: Artist or Administrator role required." });
        }

        req.user = decoded;
        next();
    }
    catch (err) {
        console.error("authArtist error:", err.message);
        return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }
}

async function authAdmin(req, res, next) {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: Missing authentication token" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "admin") {
            return res.status(403).json({ message: "Forbidden: Administrator role required." });
        }

        req.user = decoded;
        next();
    } catch (err) {
        console.error("authAdmin error:", err.message);
        return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }
}

async function authUser(req, res, next) {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: Missing authentication token" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();
    } catch (err) {
        console.error("authUser error:", err.message);
        return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }
}

async function authGeneral(req, res, next) {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: Missing authentication token" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error("authGeneral error:", err.message);
        return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }
}

module.exports = { authArtist, authAdmin, authUser, authGeneral };