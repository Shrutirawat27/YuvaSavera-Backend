const Report = require("../models/Report");
const { catchAsync, AppError } = require("../middleware/errorMiddleware");

// USER 
// Create a new report
exports.createReport = catchAsync(async (req, res, next) => {
  const { title, description, targetType, targetId, district } = req.body;

  if (!title || !description) {
    return next(new AppError("Title and description are required", 400));
  }

  if (targetType && !["User", "HelpRequest"].includes(targetType)) {
    return next(new AppError("Invalid target type", 400));
  }

  const reportDistrict = district || req.user.district;
  if (!reportDistrict) {
    return next(new AppError("District is required", 400));
  }

  const reportData = {
    title,
    description,
    submittedBy: req.user._id,
    district: reportDistrict,
  };

  if (targetType) reportData.targetType = targetType;
  if (targetId) reportData.targetId = targetId;

  const report = await Report.create(reportData);

  res.status(201).json({
    status: "success",
    message: "Report submitted successfully",
    data: report,
  });
});


// CORE ADMIN 
// View all reports
exports.getAllReports = catchAsync(async (req, res) => {
  const reports = await Report.find()
    .populate("submittedBy", "name email")
    .populate("targetId")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: reports.length,
    reports,
  });
});


// Core Admin → Update report status
exports.updateReportStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["pending", "reviewed", "resolved"].includes(status)) {
    return next(new AppError("Invalid status", 400));
  }

  const report = await Report.findById(id);
  if (!report) return next(new AppError("Report not found", 404));

  report.status = status;
  await report.save();

  res.status(200).json({
    status: "success",
    message: `Report marked as ${status}`,
    data: report,
  });
});

// MODERATOR 
// View all reports
exports.getAllReportsForModerator = catchAsync(async (req, res) => {
  const reports = await Report.find()
    .populate("submittedBy", "name email")
    .populate("targetId")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: reports.length,
    reports,
  });
});

// Moderator → Update status (restricted)
exports.updateReportStatusForModerator = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["pending", "reviewed", "resolved"].includes(status)) {
    return next(new AppError("Invalid status", 400));
  }

  const report = await Report.findById(id);
  if (!report) return next(new AppError("Report not found", 404));

  if (report.status === "resolved" && status === "pending") {
    return next(new AppError("Not allowed to reopen resolved reports", 403));
  }

  report.status = status;
  await report.save();

  res.status(200).json({
    status: "success",
    message: `Report marked as ${status} by moderator`,
    data: report,
  });
});

// District Lead → update report status
exports.updateReportStatusForDistrictLead = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  const userDistrict = req.user.district;

  if (!["pending", "reviewed", "resolved"].includes(status)) {
    return next(new AppError("Invalid status", 400));
  }

  const report = await Report.findById(id);
  if (!report) return next(new AppError("Report not found", 404));

  if (report.district.toLowerCase() !== userDistrict.toLowerCase()) {
    return next(new AppError("You are not authorized to update this report", 403));
  }

  report.status = status;
  await report.save();

  res.status(200).json({
    status: "success",
    message: `Report marked as ${status} by district lead`,
    data: report,
  });
});

// District Lead → fetch reports only from their district
exports.getReportsForDistrictLead = catchAsync(async (req, res) => {
  const userDistrict = req.user.district;

  const reports = await Report.find({
    district: { $regex: new RegExp(`^${userDistrict}$`, "i") } // case-insensitive match
  })
    .populate("submittedBy", "name email")
    .populate("targetId")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: reports.length,
    reports,
  });
});