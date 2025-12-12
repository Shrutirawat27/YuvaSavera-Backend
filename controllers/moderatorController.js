const HelpRequest = require("../models/HelpRequest");
const { catchAsync, AppError } = require("../middleware/errorMiddleware");

// Get all requests 
exports.viewRequests = catchAsync(async (req, res) => {
  const requests = await HelpRequest.find()
    .populate("submittedBy", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: requests.length,
    requests,
  });
});

// Approve / Reject by Moderator
exports.moderatorApproveReject = catchAsync(async (req, res, next) => {
  const { action } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return next(new AppError("Invalid action", 400));
  }

  const newStatus = action === "approve" ? "approved" : "rejected";

  const request = await HelpRequest.findByIdAndUpdate(
    req.params.id,
    { adminStatus: newStatus }, 
    { new: true }
  );

  if (!request) return next(new AppError("Request not found", 404));

  res.status(200).json({
    status: "success",
    message: `Request ${newStatus} by moderator`,
    data: { request },
  });
});