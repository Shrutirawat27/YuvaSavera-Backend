const express = require('express');
const partnerController = require('../controllers/partnerController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', partnerController.getAllPartners);
router.get('/:id', partnerController.getPartnerById);

// Protected routes
router.use(protect);

// Partner registration and management
router.post('/register', partnerController.registerPartner);
router.patch('/profile/:id', partnerController.updatePartnerProfile);
router.get('/dashboard/:id', partnerController.getPartnerDashboard);

// Admin only routes
router.use(restrictTo('admin'));

module.exports = router;