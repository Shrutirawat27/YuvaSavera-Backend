const express = require("express");
const Partner = require("../models/Partner");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const { uploadPartner } = require("../middleware/uploadMiddleware");

const router = express.Router();

// Submit partner application (public)
router.post("/", uploadPartner.single("logo"), async (req, res) => {
  try {
    const {
      organizationName,
      organizationType,
      description,
      focusAreas,
      location,
      district,
      contactPersonName,
      contactEmail,
      contactPhone,
      website,
      registrationNumber,
      additionalInfo,
    } = req.body;

    if (
      !organizationName ||
      !organizationType ||
      !description ||
      !location ||
      !district ||
      !contactPersonName ||
      !contactEmail ||
      !contactPhone
    ) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    let parsedFocusAreas = [];
    if (focusAreas) {
      try {
        parsedFocusAreas = JSON.parse(focusAreas);
      } catch {
        parsedFocusAreas = focusAreas.split(",").map((s) => s.trim());
      }
    }

    let logo = { url: "", publicId: "" };
    if (req.file && req.file.path) {
      logo = { url: req.file.path, publicId: req.file.filename };
    }

    const partner = await Partner.create({
      organizationName,
      organizationType,
      description,
      focusAreas: parsedFocusAreas,
      location,
      district,
      contactPersonName,
      contactEmail,
      contactPhone,
      website,
      registrationNumber,
      additionalInfo,
      logo,
    });

    res.status(201).json({ success: true, partner });
  } catch (err) {
    console.error("Error creating partner:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get all approved partners (public - About page)
router.get("/approved", async (req, res) => {
  try {
    const partners = await Partner.find({ status: "approved" }).sort({ createdAt: -1 });
    res.json({ success: true, partners });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all pending partners (admin only)
router.get("/pending", protect, restrictTo("core_admin"), async (req, res) => {
  try {
    const partners = await Partner.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json({ success: true, partners });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Approve or Reject a partner (admin only)
router.patch("/:id/status", protect, restrictTo("core_admin"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const partner = await Partner.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    res.json({ success: true, partner });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;