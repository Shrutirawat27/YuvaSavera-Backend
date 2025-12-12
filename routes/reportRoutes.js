const express = require("express");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const reportController = require("../controllers/reportController");

const router = express.Router();

// All routes require login
router.use(protect);

// USER submits a report
router.post("/", reportController.createReport);

// CORE ADMIN
router.get("/", restrictTo("core_admin"), reportController.getAllReports);
router.patch("/:id/status", restrictTo("core_admin"), reportController.updateReportStatus);

// DISTRICT LEAD
router.get("/district/reports", restrictTo("district_lead"), reportController.getReportsForDistrictLead);
router.patch(
  "/:id/status/district",
  restrictTo("district_lead"),
  reportController.updateReportStatusForDistrictLead
);

module.exports = router;