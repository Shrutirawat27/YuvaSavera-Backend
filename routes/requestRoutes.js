const express = require('express');
const requestController = require('../controllers/requestController');
const { upload } = require('../middleware/uploadMiddleware'); 
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { uploadVideo } = require("../middleware/uploadMiddleware");

const router = express.Router();

// Public routes
// Fetch all public requests
router.get('/', requestController.getAllRequests); 
router.get('/stats', requestController.getRequestStats);

// Fetch requests for the logged-in help seeker
router.get('/my', protect, requestController.getMyRequests); 

// Get single request by ID
router.get('/:id', requestController.getRequestById);

// Protected routes 
router.use(protect);

// Create new request (any logged-in user)
router.post(
  '/',
  uploadVideo.single("video"),
  requestController.createRequest
);

// Assign volunteer
router.patch('/:id/assign', requestController.assignVolunteer);

// Update request status
router.patch('/:id/status', requestController.updateRequestStatus);

// Delete a request (help seeker can delete their own request)
router.delete('/:id', requestController.deleteRequest);

// Admin routes
router.use(restrictTo('core_admin', 'district_lead', 'moderator'));

// Admin approve/reject
router.patch("/:id/admin-status", requestController.adminApproveReject);

// Core admin & moderators → can fetch all requests
router.get(
  '/admin/all',
  restrictTo('core_admin', 'moderator'),
  requestController.getAllRequests
);

// District lead → fetch only their district requests
router.get(
  '/admin/district',
  restrictTo('district_lead'),
  requestController.getDistrictRequests
);

module.exports = router;