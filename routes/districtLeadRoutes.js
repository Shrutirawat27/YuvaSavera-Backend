const express = require("express");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const districtLeadController = require("../controllers/districtLeadController");

const router = express.Router();

// All routes protected
router.use(protect);

// Requests
router.get("/requests", restrictTo("district_lead", "core_admin"), districtLeadController.viewRequests);
router.post("/approve-request", restrictTo("district_lead", "core_admin"), districtLeadController.approveRequest);

// District Leads management (Core Admin only)
router.get("/district-leads", restrictTo("core_admin"), districtLeadController.getAllDistrictLeads);
router.post("/create-district-lead", restrictTo("core_admin"), districtLeadController.createDistrictLead);

// Volunteers (District Lead only)
router.get("/volunteers", restrictTo("district_lead"), districtLeadController.getVolunteers);
router.patch("/volunteers/:id/status", restrictTo("district_lead"), districtLeadController.toggleVolunteerStatus);
router.patch("/volunteers/:id/review", restrictTo("district_lead"), districtLeadController.reviewVolunteer);

module.exports = router;