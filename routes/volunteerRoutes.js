const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");

const volunteerController = require("../controllers/volunteerController");
const { uploadFile } = require("../middleware/uploadMiddleware");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "fail",
      errors: errors.array().map(err => ({ field: err.param, message: err.msg })),
    });
  }
  next();
};

// Public
router.get("/leaderboard", volunteerController.getLeaderboard);

// register 
router.post(
  "/register",
  uploadFile.single("idProof"),
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email required"),
  body("phone").optional().isMobilePhone().withMessage("Phone number is not valid"),
  validateRequest,
  volunteerController.registerVolunteer
);

// Protected: view own profile
router.get("/myprofile", protect, volunteerController.getMyProfile);

// Protected routes for volunteers
router.use(protect);

// Volunteer-specific endpoints
router.get("/available", restrictTo("volunteer", "core_admin"), volunteerController.getAvailableRequests);
router.get("/requests/assigned", restrictTo("volunteer", "core_admin"), volunteerController.getVolunteerRequests);

// Volunteer accepts a help request
router.post("/accept-request", restrictTo("volunteer", "core_admin"), volunteerController.acceptRequest);

// Volunteer submits proof (multipart upload)
router.post(
  "/submit-proof",
  restrictTo("volunteer"),
  uploadFile.array("proofFiles",5), 
  volunteerController.submitProof
);

// Update profile
router.patch(
  "/profile/:id",
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("email").optional().isEmail().withMessage("Valid email required"),
  body("phone").optional().isMobilePhone().withMessage("Phone number is not valid"),
  validateRequest,
  volunteerController.updateVolunteerProfile
);

// Dashboard
router.get("/dashboard", restrictTo("volunteer", "core_admin"), volunteerController.getVolunteerDashboard);

// Admin-only routes (kept under admin block)
router.use(restrictTo("admin", "core_admin"));
router.post("/add", body("name").trim().notEmpty().withMessage("Name is required"), validateRequest, volunteerController.addNewVolunteer);
router.get("/", volunteerController.getAllVolunteers);
router.patch("/:id/review", volunteerController.updateVolunteerStatus);
router.patch("/:id/toggle", volunteerController.toggleVolunteerStatus);
router.patch("/me", protect, restrictTo("volunteer"), volunteerController.updateMyProfile);

module.exports = router;