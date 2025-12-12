const axios = require("axios");
const HelpRequest = require("../models/HelpRequest");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

// Helper: Upload Video (optional)
const uploadVideoToCloudinary = async (filePath) => {
  return await cloudinary.uploader.upload(filePath, {
    resource_type: "video",
    folder: "help_requests/videos",
  });
};

// Helper: Get coordinates from location name
const getCoordinates = async (location) => {
  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      { params: { q: location, format: "json", limit: 1 } }
    );

    if (!response.data || response.data.length === 0) return null;

    const { lat, lon } = response.data[0];
    return [parseFloat(lon), parseFloat(lat)]; 
  } catch (err) {
    console.error("Geocoding error:", err);
    return null;
  }
};

const requestController = {
  createRequest: async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        location,
        urgency,
        contactName,
        contactPhone,
        contactEmail,
        anonymous,
        additionalInfo,
        district,
      } = req.body;

      if (!title || !description || !category || !location || !urgency) {
        return res
          .status(400)
          .json({ status: "fail", message: "Missing required fields" });
      }

      let videoData = null;
      if (req.file) {
        const { path: url, filename: publicId } = req.file;
        try {
          const thumbnail = cloudinary.url(publicId, {
            resource_type: "video",
            format: "jpg",
            transformation: [{ width: 300, height: 200, crop: "fill" }],
          });
          videoData = { url, publicId, thumbnail };
        } catch (err) {
          console.error("Error generating thumbnail:", err);
        }
      }

      let city = "", state = "";
      if (location.includes(",")) [city, state] = location.split(",").map((s) => s.trim());

      const coords = await getCoordinates(location);

      const newRequest = await HelpRequest.create({
        title,
        description,
        category,
        district,
        location: {
          address: location,
          city,
          state,
          district, 
          coordinates: coords ? { type: "Point", coordinates: coords } : undefined,
        },
        urgencyLevel: urgency,
        submittedBy: { userId: req.user._id, name: contactName, phone: contactPhone, email: contactEmail },
        anonymous: anonymous || false,
        isPublic: true,
        media: { video: videoData },
        tags: additionalInfo ? [additionalInfo] : [],
      });

      res.status(201).json({
        status: "success",
        message: "Help request created successfully",
        data: { request: newRequest },
      });
    } catch (error) {
      console.error("Backend error:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  },

// Get requests for the logged-in help seeker 
getMyRequests: async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const userEmail = req.user.email;

    const requests = await HelpRequest.find({
      $or: [
        { "submittedBy.userId": userId }, 
        { "submittedBy.email": userEmail, "submittedBy.userId": { $exists: false } } 
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      data: { requests },
    });
  } catch (error) {
    console.error("Error fetching user requests:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
},

// Delete a help request (only owner can delete)
deleteRequest: async (req, res) => {
  try {
    const request = await HelpRequest.findById(req.params.id);

    if (!request) {
      return res
        .status(404)
        .json({ status: "fail", message: "Request not found" });
    }

    // Only allow owner to delete
    if (request.submittedBy.email !== req.user.email) {
      return res.status(403).json({
        status: "fail",
        message: "You can only delete your own requests",
      });
    }

    // safer delete
    await HelpRequest.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: "success",
      message: "Request deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
},

  // Get all user requests
  getAllRequests: async (req, res) => {
    try {
      const { category, urgency, page = 1, limit = 10 } = req.query;
      const filter = { adminStatus: "approved", isPublic: true };
      if (category) filter.category = category;
      if (urgency) filter.urgencyLevel = urgency;

      const requests = await HelpRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

      const total = await HelpRequest.countDocuments(filter);

      res.status(200).json({
        status: "success",
        requests,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          totalRequests: total,
        },
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  },

  // Get single request by ID
  getRequestById: async (req, res) => {
    try {
      const request = await HelpRequest.findById(req.params.id);
      if (!request) return res.status(404).json({ status: "fail", message: "Request not found" });

      res.status(200).json({ status: "success", data: { request } });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  },

  // Assign volunteer
  assignVolunteer: async (req, res) => {
    try {
      const { volunteerId } = req.body;
      const request = await HelpRequest.findById(req.params.id);
      if (!request) return res.status(404).json({ status: "fail", message: "Request not found" });

      request.assignedVolunteer = volunteerId;
      request.status = "In Progress";
      await request.save();

      res.status(200).json({
        status: "success",
        message: "Volunteer assigned successfully",
        data: { request },
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  },

  // Update user-side status
  updateRequestStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const allowedStatuses = ["Open", "In Progress", "Resolved", "Closed"];
      if (!allowedStatuses.includes(status))
        return res.status(400).json({ status: "fail", message: "Invalid status value" });

      const request = await HelpRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
      if (!request) return res.status(404).json({ status: "fail", message: "Request not found" });

      res.status(200).json({
        status: "success",
        message: "Request status updated successfully",
        data: { request },
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  },

  // Admin approve/reject
  adminApproveReject: async (req, res) => {
    try {
      const { action } = req.body;
      const allowedActions = ["approve", "reject"];
      if (!allowedActions.includes(action))
        return res.status(400).json({ status: "fail", message: "Invalid action" });

      const adminStatus = action === "approve" ? "approved" : "rejected";

      const request = await HelpRequest.findByIdAndUpdate(
        req.params.id,
        { adminStatus },
        { new: true }
      );
      if (!request) return res.status(404).json({ status: "fail", message: "Request not found" });

      res.status(200).json({ status: "success", message: `Request ${adminStatus}`, data: { request } });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  },

  // Get request statistics
  getRequestStats: async (req, res) => {
    try {
      const totalRequests = await HelpRequest.countDocuments();
      const activeRequests = await HelpRequest.countDocuments({ status: { $in: ["Open", "In Progress"] } });
      const resolvedRequests = await HelpRequest.countDocuments({ status: "Resolved" });

      const categoryBreakdown = await HelpRequest.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } }
      ]);

      res.status(200).json({
        status: "success",
        data: { stats: { totalRequests, activeRequests, resolvedRequests, categoryBreakdown } },
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  },

  // Get requests for district lead
  getDistrictRequests: async (req, res) => {
    try {
      const { category, urgency, page = 1, limit = 10 } = req.query;

      const district = req.user.district;

      const filter = {
  isPublic: true,
  $or: [
    { "location.district": { $regex: district, $options: "i" } },
    { district: { $regex: district, $options: "i" } } 
  ],
      };

      if (category) filter.category = category;
      if (urgency) filter.urgencyLevel = urgency;

      const requests = await HelpRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

      const total = await HelpRequest.countDocuments(filter);

      res.status(200).json({
        status: "success",
        data: requests,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          totalRequests: total,
        },
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  },
};

module.exports = requestController;