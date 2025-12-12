const express = require("express");
const router = express.Router();

const Volunteer = require("../models/Volunteer");
const HelpRequest = require("../models/HelpRequest");
const Campaign = require("../models/Campaign"); 

router.get("/", async (req, res) => {
  try {
    const activeVolunteers = await Volunteer.countDocuments({ isActive: true, status: "approved" });
    const requestsSolved = await HelpRequest.countDocuments({ status: "Resolved" });
    const campaignsRun = await Campaign.countDocuments();
    const livesImpacted = requestsSolved * 5; 

    res.json({
      status: "success",
      data: {
        volunteers: activeVolunteers,
        requestsSolved,
        campaignsRun,
        impactReached: livesImpacted
      }
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

module.exports = router;