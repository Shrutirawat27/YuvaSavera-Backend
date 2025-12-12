const HelpRequest = require("../models/HelpRequest");
const User = require("../models/User");
const Volunteer = require('../models/Volunteer');

// Core admin / moderator dashboard
exports.getDashboardData = async (req, res) => {
  try {
    const totalRequests = await HelpRequest.countDocuments();
    const users = await User.countDocuments({ role: "help_seeker" });
    const volunteers = await User.countDocuments({ role: "volunteer" });

    const pending = await HelpRequest.countDocuments({ status: { $in: ["Open", "In Progress"] } });
    const resolved = await HelpRequest.countDocuments({ status: "Resolved" });

    const statusAgg = await HelpRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const statusData = statusAgg.length
      ? statusAgg.map(s => ({ name: s._id, value: s.count }))
      : [{ name: "No Data", value: 0 }];

    const trendAgg = await HelpRequest.aggregate([
      {
        $group: {
          _id: { $substr: ["$createdAt", 0, 7] }, 
          requests: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const trendData = trendAgg.map(t => {
      const [year, month] = t._id.split("-");
      return {
        month: new Date(year, month - 1).toLocaleString("default", { month: "short" }),
        requests: t.requests,
      };
    });

    const recent = await HelpRequest.find().sort({ createdAt: -1 }).limit(5);
    const activity = recent.map(
      r => `Request "${r.title}" created with status ${r.status}`
    );

    res.status(200).json({
      status: "success",
      data: {
        stats: { totalRequests, pending, resolved, users, volunteers },
        statusData,
        trendData,
        activity,
      },
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
};

// District lead dashboard
exports.getDistrictDashboard = async (req, res) => {
  try {
    if (req.user.role !== "district_lead") {
      return res.status(403).json({ status: "fail", message: "Not authorized" });
    }

    const district = req.user.district?.trim();
    if (!district) {
      return res.status(400).json({ status: "fail", message: "District not set for user" });
    }

    const districtFilter = {
      $or: [
        { district: { $regex: district, $options: "i" } },
        { "location.district": { $regex: district, $options: "i" } }
      ]
    };

    const totalRequests = await HelpRequest.countDocuments(districtFilter);

    const pending = await HelpRequest.countDocuments({
      $and: [
        { adminStatus: "pending" }, 
        districtFilter
      ]
    });

    const resolved = await HelpRequest.countDocuments({
      $and: [
        { status: "Resolved" },
        districtFilter
      ]
    });

    const volunteersAgg = await Volunteer.aggregate([
      { $match: { status: "approved", isActive: true } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      { $match: { "user.district": { $regex: district, $options: "i" } } },
      { $count: "total" }
    ]);
    const volunteers = volunteersAgg.length ? volunteersAgg[0].total : 0;

    const statusAgg = await HelpRequest.aggregate([
      { $match: districtFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const statusData = statusAgg.length
      ? statusAgg.map(s => ({ name: s._id, value: s.count }))
      : [{ name: "No Data", value: 0 }];

    const trendAgg = await HelpRequest.aggregate([
      { $match: districtFilter },
      { $group: { _id: { $substr: ["$createdAt", 0, 7] }, requests: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const trendData = trendAgg.length
      ? trendAgg.map(t => {
          const [year, month] = t._id.split("-");
          return {
            month: new Date(year, month - 1).toLocaleString("default", { month: "short" }),
            requests: t.requests
          };
        })
      : [{ month: "N/A", requests: 0 }];

    res.status(200).json({
      status: "success",
      data: {
        stats: { totalRequests, pending, resolved, volunteers },
        statusData,
        trendData
      }
    });

  } catch (err) {
    console.error("District Dashboard error:", err);
    res.status(500).json({
      status: "error",
      message: "Internal server error while fetching district dashboard data."
    });
  }
};