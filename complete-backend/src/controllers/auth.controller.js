const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

function getCookieOptions() {
    return {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
    };
}

function getArtistInviteKey() {
    if (process.env.NODE_ENV === 'production' && !process.env.ARTIST_INVITE_KEY) {
        console.error("CRITICAL SECURITY ERROR: ARTIST_INVITE_KEY environment variable is missing in production");
        return null;
    }
    return process.env.ARTIST_INVITE_KEY || "BEATPULSE_ARTIST";
}

function getAdminKey() {
    if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_KEY) {
        console.error("CRITICAL SECURITY ERROR: ADMIN_KEY environment variable is missing in production");
        return null;
    }
    return process.env.ADMIN_KEY || "BEATPULSE_ADMIN";
}

async function registerUser(req, res) {
    try {
        const { username, email, password, role = "user", artistKey } = req.body || {};

        // Strict Type Validation against NoSQL Injection
        if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: "Username, email, and password must be valid strings" });
        }

        const safeUsername = username.trim();
        const safeEmail = email.trim().toLowerCase();

        if (!safeUsername || !safeEmail || !password) {
            return res.status(400).json({ message: "Username, email, and password are required" });
        }

        if (safeUsername.length < 3 || safeUsername.length > 50) {
            return res.status(400).json({ message: "Username must be between 3 and 50 characters" });
        }

        if (password.length < 6 || password.length > 128) {
            return res.status(400).json({ message: "Password must be between 6 and 128 characters" });
        }

        const isUserAlreadyExists = await userModel.findOne({
            $or: [
                { username: safeUsername },
                { email: safeEmail }
            ]
        });

        if (isUserAlreadyExists) {
            return res.status(409).json({ message: "User already exists with this username or email" });
        }

        // Enforce RBAC Role Assignment
        let assignedRole = "user";
        if (role === "artist") {
            const validKey = getArtistInviteKey();
            // Open Creator Access: If artistKey is provided and incorrect, reject.
            // If omitted or matching validKey, grant artist role.
            if (!artistKey || (validKey && artistKey === validKey)) {
                assignedRole = "artist";
            } else {
                return res.status(403).json({ message: "Invalid or missing artist invitation key" });
            }
        } else if (role === "admin") {
            const validAdminKey = getAdminKey();
            const candidateAdminKey = req.body?.adminKey || artistKey;
            if (validAdminKey && candidateAdminKey && candidateAdminKey === validAdminKey) {
                assignedRole = "admin";
            } else {
                return res.status(403).json({ message: "Invalid or missing administrator key" });
            }
        }

        const hash = await bcrypt.hash(password, 10);

        const user = await userModel.create({
            username: safeUsername,
            email: safeEmail,
            password: hash,
            role: assignedRole
        });

        const token = jwt.sign({
            id: user._id,
            role: user.role,
        }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.cookie("token", token, getCookieOptions());

        return res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                likedSongs: user.likedSongs || []
            }
        });
    } catch (error) {
        console.error("Error in registerUser:", error);
        return res.status(500).json({ message: "Registration failed", error: error.message });
    }
}

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

async function loginUser(req, res) {
    try {
        const { username, email, password } = req.body || {};

        if (typeof password !== 'string' || !password) {
            return res.status(400).json({ message: "Password is required and must be a string" });
        }

        const safeUsername = typeof username === 'string' ? username.trim() : '';
        const safeEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (!safeUsername && !safeEmail) {
            return res.status(400).json({ message: "Valid username or email is required" });
        }

        const searchConditions = [];
        if (safeUsername) {
            const rx = new RegExp(`^${escapeRegex(safeUsername)}$`, 'i');
            searchConditions.push({ username: { $regex: rx } });
            searchConditions.push({ email: { $regex: rx } });
        }
        if (safeEmail) {
            const rx = new RegExp(`^${escapeRegex(safeEmail)}$`, 'i');
            searchConditions.push({ email: { $regex: rx } });
            searchConditions.push({ username: { $regex: rx } });
        }

        const user = await userModel.findOne({ $or: searchConditions });

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({
            id: user._id,
            role: user.role,
        }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.cookie("token", token, getCookieOptions());

        return res.status(200).json({
            message: "User logged in successfully",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                likedSongs: user.likedSongs || []
            }
        });
    } catch (error) {
        console.error("Error in loginUser:", error);
        return res.status(500).json({ message: "Login failed", error: error.message });
    }
}

async function logoutUser(req, res) {
    const opts = getCookieOptions();
    res.clearCookie("token", opts);
    res.clearCookie("token", { path: '/' });
    res.clearCookie("token");
    return res.status(200).json({ message: "User logged out successfully" });
}

async function getMe(req, res) {
    try {
        const user = await userModel.findById(req.user.id).select("-password").populate("likedSongs");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({
            message: "Session active",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                likedSongs: user.likedSongs || []
            }
        });
    } catch (error) {
        console.error("Error in getMe:", error);
        return res.status(500).json({ message: "Failed to fetch user session", error: error.message });
    }
}

async function upgradeToArtist(req, res) {
    try {
        const { targetRole = "artist", artistKey, adminKey } = req.body || {};
        let newRole = "artist";

        if (targetRole === "admin") {
            const validAdminKey = getAdminKey();
            const candidateKey = typeof adminKey === 'string' ? adminKey : (typeof artistKey === 'string' ? artistKey : '');
            if (!validAdminKey || candidateKey !== validAdminKey) {
                return res.status(403).json({ message: "Invalid administrator key" });
            }
            newRole = "admin";
        } else {
            const validKey = getArtistInviteKey();
            const candidateKey = typeof artistKey === 'string' ? artistKey.trim() : '';
            // If user supplied an explicit key and it doesn't match validKey, reject.
            // If omitted or matching, allow upgrade to artist.
            if (candidateKey && validKey && candidateKey !== validKey) {
                return res.status(403).json({ message: "Invalid artist invite key" });
            }
            newRole = "artist";
        }

        const user = await userModel.findByIdAndUpdate(req.user.id, { role: newRole }, { new: true });
        const token = jwt.sign({
            id: user._id,
            role: user.role,
        }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.cookie("token", token, getCookieOptions());

        return res.status(200).json({
            message: `Account upgraded to ${newRole} successfully`,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
            }
        });
    } catch (error) {
        console.error("Error in upgradeToArtist:", error);
        return res.status(500).json({ message: "Failed to upgrade account", error: error.message });
    }
}

module.exports = { registerUser, loginUser, logoutUser, getMe, upgradeToArtist };