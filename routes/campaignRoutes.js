const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { uploadCampaign } = require('../middleware/uploadMiddleware');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// upload image 
router.post('/upload-image', uploadCampaign.single('image'), campaignController.uploadImage);

// create proposal 
router.post('/', protect, campaignController.createProposal);

// public: fetch approved campaigns 
router.get('/', campaignController.getApprovedCampaigns);

// NEW: get featured campaign 
router.get('/featured', campaignController.getFeaturedCampaign);

// my campaigns (help seeker dashboard)
router.get(
  "/my",
  protect, 
  campaignController.getMyCampaigns
);

// Helpseeker: delete their own campaign
router.delete('/:id/delete-own', protect, campaignController.deleteOwnCampaign);

// Volunteer leaves a campaign
router.delete("/:id/leave", protect, campaignController.leaveCampaign);

// Join campaign
router.post("/:id/join", protect, campaignController.joinCampaign);

// My joined campaigns
router.get("/my-joined", protect, campaignController.getMyJoinedCampaigns);

// Admin: view participants of a campaign
router.get("/:id/participants", protect, restrictTo("core_admin"), campaignController.getCampaignParticipants);

// admin routes
router.get(
  "/admin/all",
  protect,
  restrictTo("core_admin"),
  campaignController.getAllCampaignsAdmin
);
router.get('/proposals', protect, restrictTo('core_admin'), campaignController.getProposals);
router.put('/:id/approve', protect, restrictTo('core_admin'), campaignController.approveCampaign);
router.delete('/:id', protect, restrictTo('core_admin'), campaignController.deleteCampaign);

module.exports = router;