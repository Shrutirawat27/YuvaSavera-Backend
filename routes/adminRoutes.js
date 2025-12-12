const express = require("express");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const adminController = require("../controllers/adminController");

const router = express.Router();

// Protect all routes
router.use(protect);

// Core Admin only
router.get("/users", restrictTo("core_admin"), adminController.getAllUsers);
router.patch("/users/:id/status", restrictTo("core_admin"), adminController.updateUserStatus);
router.post("/create-admin", restrictTo("core_admin"), adminController.createAdmin);
router.post("/create-moderator", restrictTo("core_admin"), adminController.createModerator);

// Requests
router.post("/approve-request", restrictTo("district_lead", "core_admin"), adminController.approveRequest);
router.post("/requests/:id/review-proof",
  restrictTo("core_admin", "district_lead", "moderator"),
  adminController.reviewProof
);
router.get("/requests", restrictTo("moderator", "district_lead", "core_admin"), adminController.viewRequests);

// Partner Management
router.get("/partners/pending", restrictTo("core_admin"), adminController.getPendingPartners);
router.patch("/partners/:id/status", restrictTo("core_admin"), adminController.updatePartnerStatus);

module.exports = router;