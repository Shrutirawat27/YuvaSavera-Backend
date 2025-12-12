const User = require("../models/User");
const HelpRequest = require("../models/HelpRequest");
const { catchAsync, AppError } = require("../middleware/errorMiddleware");
const Volunteer = require("../models/Volunteer");
const Partner = require("../models/Partner");  

// Get all pending partner requests
exports.getPendingPartners = async (req, res, next) => {
  try {
    const partners = await Partner.find({ status: "pending" });
    res.status(200).json({
      status: "success",
      results: partners.length,
      partners,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// Approve / Reject Partner
exports.updatePartnerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; 

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ status: "error", message: "Invalid status" });
    }

    const partner = await Partner.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!partner) {
      return res.status(404).json({ status: "error", message: "Partner not found" });
    }

    res.status(200).json({
      status: "success",
      message: `Partner ${status} successfully`,
      partner,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};


// Get all users (Core Admin only)
exports.getAllUsers = catchAsync(async (req, res) => {
  const users = await User.find().select("-password");
  res.status(200).json({
    status: "success",
    results: users.length,
    users,
  });
});

// Approve or reject help requests
exports.approveRequest = catchAsync(async (req, res, next) => {
  const { requestId, action } = req.body;
  if (!requestId || !["approve", "reject"].includes(action)) {
    return next(new AppError("Invalid request or action", 400));
  }

  const request = await HelpRequest.findById(requestId);
  if (!request) return next(new AppError("Request not found", 404));

  if (action === "approve") {
    request.status = "Approved";
    request.isPublic = true;
  } else {
    request.status = "Rejected";
    request.isPublic = false;
  }
  await request.save();

  res.status(200).json({
    status: "success",
    message: `Request ${action}d successfully`,
  });
});

// Create Moderator (Core Admin only)
exports.createModerator = catchAsync(async (req, res, next) => {
  const { name, email, phone, password } = req.body;

  const role = "moderator"; 

  const existingUser = await User.findOne({ email });
  if (existingUser) return next(new AppError("Email already registered", 400));

  const user = await User.create({ name, email, phone, password, role });

  res.status(201).json({
    status: "success",
    message: "Moderator created successfully",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// Create Admin (Core Admin only — district_lead or moderator)
exports.createAdmin = catchAsync(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;

  if (!["district_lead", "moderator"].includes(role)) {
    return next(new AppError("Invalid role", 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) return next(new AppError("Email already registered", 400));

  const user = await User.create({ name, email, phone, password, role });

  res.status(201).json({
    status: "success",
    message: `${role} created successfully`,
    data: {
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    },
  });
});

// Update user active status
exports.updateUserStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const user = await User.findById(id);
  if (!user) return next(new AppError("User not found", 404));

  user.isActive = isActive;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message: `User ${isActive ? "activated" : "deactivated"} successfully`,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
    },
  });
});

// View all help requests (Moderator, District Lead, Core Admin)
exports.viewRequests = catchAsync(async (req, res, next) => {
  const requests = await HelpRequest.find()
    .populate({
      path: 'assignedVolunteer',
      populate: { path: 'userId', select: 'name email district' }
    })
    .populate({
      path: 'proofs.volunteer',
      populate: { path: 'userId', select: 'name email' }
    })
    .populate({ path: 'submittedBy.userId', select: 'name email district' })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    status: "success",
    results: requests.length,
    requests,
  });
});

// Review proof (Core Admin / District Lead / Moderator)
exports.reviewProof = catchAsync(async (req, res, next) => {
  const { id } = req.params; 
  const { proofId, action, reviewNotes } = req.body;

  if (!["accept", "reject"].includes(action)) {
    return next(new AppError("Action must be 'accept' or 'reject'", 400));
  }

  const request = await HelpRequest.findById(id);
  if (!request) return next(new AppError("Help request not found", 404));

  if (!request.proofs || request.proofs.length === 0) {
    return next(new AppError("No proofs submitted for this request", 400));
  }

  const proof = request.proofs.id(proofId);
  if (!proof) return next(new AppError("Proof not found", 404));

  if (proof.review && proof.review.status && proof.review.status !== 'pending') {
    return next(new AppError("This proof has already been reviewed", 400));
  }

  proof.review.status = action === "accept" ? "accepted" : "rejected";
  proof.review.reviewedBy = req.user._id;
  proof.review.reviewedAt = new Date();
  proof.review.notes = reviewNotes || "";

  if (action === "accept") {
    request.status = "Resolved";
    request.resolvedAt = new Date();

    if (request.assignedVolunteer) {
      const assignedVolunteerId = request.assignedVolunteer._id ? request.assignedVolunteer._id : request.assignedVolunteer;
      const volunteer = await Volunteer.findById(assignedVolunteerId);
      if (volunteer) {
        let points = 25;
        if (request.urgencyLevel === "Medium") points = 50;
        else if (request.urgencyLevel === "High") points = 75;
        else if (request.urgencyLevel === "Critical") points = 100;

        volunteer.points = (volunteer.points || 0) + points;

        volunteer.contributionHistory = volunteer.contributionHistory || [];
        if (!volunteer.contributionHistory.some(id => id.toString() === request._id.toString())) {
          volunteer.contributionHistory.push(request._id);
        }

        volunteer.activeRequests = (volunteer.activeRequests || []).filter(r => r.toString() !== request._id.toString());

        volunteer.pendingProofs = (volunteer.pendingProofs || []).filter(p => {
          return !(p.proofId && p.proofId.toString() === proof._id.toString());
        });

        await volunteer.save();
      }
    }
  } else {
    request.status = "Open";
    request.assignedVolunteer = undefined;

    if (request.assignedVolunteer) {
      const assignedVolunteerId = request.assignedVolunteer._id ? request.assignedVolunteer._id : request.assignedVolunteer;
      const volunteer = await Volunteer.findById(assignedVolunteerId);
      if (volunteer) {
        volunteer.pendingProofs = (volunteer.pendingProofs || []).filter(p => {
          return !(p.proofId && p.proofId.toString() === proof._id.toString());
        });
        await volunteer.save();
      }
    }
  }

  await request.save();

  const updatedRequest = await HelpRequest.findById(request._id)
    .populate({
      path: 'assignedVolunteer',
      populate: { path: 'userId', select: 'name email district' }
    })
    .populate({
      path: 'proofs.volunteer',
      populate: { path: 'userId', select: 'name email' }
    })
    .populate({ path: 'submittedBy.userId', select: 'name email district' })
    .lean();

  res.status(200).json({
    status: "success",
    message: `Proof ${action}ed successfully`,
    data: { request: updatedRequest },
  });
});

// Get all District Leads (Core Admin only)
exports.getAllDistrictLeads = catchAsync(async (req, res, next) => {
  const districtLeads = await User.find({ role: 'district_lead' }).select('-password');
  
  res.status(200).json({
    status: 'success',
    results: districtLeads.length,
    districtLeads,
  });
});