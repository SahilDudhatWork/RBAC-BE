const express = require('express');
const router = express.Router();
const { register, login, getMe, getPermissions } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);                // Public signup
router.post('/admin/register', protect, register); // Admin creates user
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.get('/permissions', protect, getPermissions);

module.exports = router;