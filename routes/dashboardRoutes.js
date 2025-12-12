const express = require("express");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const dashboardController = require("../controllers/dashboardController");

const router = express.Router();

router.use(protect);

// Core admin, district lead, moderator 
router.get("/", restrictTo("core_admin", "district_lead", "moderator"), dashboardController.getDashboardData);

// New route for district leads
router.get("/district", restrictTo("district_lead"), dashboardController.getDistrictDashboard);

module.exports = router;