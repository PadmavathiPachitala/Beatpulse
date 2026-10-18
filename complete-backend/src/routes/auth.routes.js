const express = require('express');
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/logout', authController.logoutUser);
router.get('/me', authMiddleware.authGeneral, authController.getMe);
router.post('/upgrade-artist', authMiddleware.authGeneral, authController.upgradeToArtist);

module.exports = router;