const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes (require authentication)
router.use(protect); 

router.get('/me', authController.getMe);
router.patch('/update-password', authController.updatePassword);
router.patch('/me', authController.updateProfile);

module.exports = router;