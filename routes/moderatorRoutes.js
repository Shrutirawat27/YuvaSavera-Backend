const express = require("express");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const moderatorController = require("../controllers/moderatorController");
const reportController = require("../controllers/reportController");
const { getModeratorDashboard } = require("../controllers/moderatorDashboardController");

const router = express.Router();

router.use(protect, restrictTo("moderator"));

// View all help requests (same as admin but visible to moderators)
router.get("/requests", moderatorController.viewRequests);
router.get("/reports", reportController.getAllReportsForModerator);
router.get("/dashboard", restrictTo("moderator"), getModeratorDashboard);

// Approve/reject a request (moderator-level)
router.patch("/requests/:id/status", moderatorController.moderatorApproveReject);
router.patch("/reports/:id/status", reportController.updateReportStatusForModerator);

module.exports = router;