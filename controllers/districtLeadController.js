const HelpRequest = require("../models/HelpRequest");
const User = require("../models/User");
const Volunteer = require("../models/Volunteer");
const { catchAsync, AppError } = require("../middleware/errorMiddleware");

const normalizeDistrict = (district) => district?.trim().toLowerCase();

// Requests
exports.viewRequests = catchAsync(async (req, res, next) => {
  let requests;

  if (req.user.role === "district_lead") {
    if (!req.user.district) {
      return next(new AppError("District not assigned to this District Lead", 400));
    }

    requests = await HelpRequest.find({
      district: { $regex: new RegExp(`^${req.user.district}$`, "i") },
    })
      .populate("submittedBy.userId", "name email district")
      .sort({ createdAt: -1 });
  } else if (req.user.role === "core_admin") {
    requests = await HelpRequest.find()
      .populate("submittedBy.userId", "name email district")
      .sort({ createdAt: -1 });
  } else {
    return next(new AppError("Not authorized to view requests", 403));
  }

  res.status(200).json({
    status: "success",
    results: requests.length,
    requests,
  });
});

exports.approveRequest = catchAsync(async (req, res, next) => {
  const { requestId, action } = req.body;

  if (!requestId || !["approve", "reject"].includes(action)) {
    return next(new AppError("Invalid request or action", 400));
  }

  const request = await HelpRequest.findById(requestId);
  if (!request) return next(new AppError("Request not found", 404));

  if (
    req.user.role === "district_lead" &&
    !normalizeDistrict(request.district).includes(normalizeDistrict(req.user.district))
  ) {
    return next(new AppError("Not authorized to manage requests from another district", 403));
  }

  request.adminStatus = action === "approve" ? "approved" : "rejected";
  request.isPublic = action === "approve";
  await request.save();

  res.status(200).json({
    status: "success",
    message: `Request ${action}d successfully`,
    data: { request },
  });
});

// District Leads helpers
exports.getAllDistrictLeads = catchAsync(async (req, res, next) => {
  if (req.user.role !== "core_admin") {
    return next(new AppError("Not authorized", 403));
  }

  const districtLeads = await User.find({ role: "district_lead" }).select("-password");

  res.status(200).json({
    status: "success",
    results: districtLeads.length,
    districtLeads,
  });
});

exports.createDistrictLead = catchAsync(async (req, res, next) => {
  if (req.user.role !== "core_admin") {
    return next(new AppError("Not authorized", 403));
  }

  const { name, email, phone, password, district } = req.body;
  const role = "district_lead";

  if (!name || !email || !phone || !password || !district) {
    return next(new AppError("All fields are required", 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) return next(new AppError("Email already registered", 400));

  const user = await User.create({ name, email, phone, password, district, role });

  res.status(201).json({
    status: "success",
    message: "District Lead created successfully",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      district: user.district,
      role: user.role,
    },
  });
});

// Volunteers
exports.getVolunteers = catchAsync(async (req, res, next) => {
  const district = req.user.district;
  if (!district) return next(new AppError("District not assigned", 400));

  const users = await User.find({
    role: "volunteer",
    district: { $regex: district.trim(), $options: "i" },
  }).select("-password").lean();

  const userIds = users.map(u => u._id);
  const volunteerDocs = await Volunteer.find({ userId: { $in: userIds } }).lean();
  const vMap = new Map();
  for (const v of volunteerDocs) vMap.set(String(v.userId), v);

  const merged = users.map(u => {
    const v = vMap.get(String(u._id));
    return {
      _id: String(u._id),
      name: u.name || (v && v.name) || "",
      email: u.email || (v && v.email) || "",
      phone: u.phone || (v && v.phone) || "",
      district: u.district || (v && v.district) || "",
      status: v?.status || "pending_review",
      isActive: typeof u.isActive === "boolean" ? u.isActive : !!v?.isActive,
    };
  });

  res.status(200).json({
    status: "success",
    results: merged.length,
    volunteers: merged,
  });
});

exports.toggleVolunteerStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) return next(new AppError("Volunteer (User) not found", 404));

  if (req.user.role === "district_lead" &&
      !normalizeDistrict(user.district).includes(normalizeDistrict(req.user.district))) {
    return next(new AppError(
      "Not authorized to update volunteers outside your district", 403
    ));
  }

  user.isActive = !user.isActive;
  await user.save();

  const volunteer = await Volunteer.findOne({ userId: id });
  if (volunteer) {
    volunteer.isActive = user.isActive;
    await volunteer.save();
  }

  res.status(200).json({
    status: "success",
    message: `Volunteer is now ${user.isActive ? "active" : "inactive"}`,
    data: { userId: user._id, isActive: user.isActive },
  });
});

exports.reviewVolunteer = catchAsync(async (req, res, next) => {
  const userId = req.params.id;
  let { status } = req.body;

  if (!["approved","rejected","pending","pending_review"].includes(status)) {
    return next(new AppError("Invalid status value", 400));
  }
  if (status === "pending") status = "pending_review";

  const user = await User.findById(userId).select("name email phone district isActive").lean();
  if (!user) return next(new AppError("User not found", 404));

  if (req.user.role === "district_lead" &&
      !normalizeDistrict(user.district).includes(normalizeDistrict(req.user.district))) {
    return next(new AppError("Not authorized to review volunteers outside your district", 403));
  }

  let volunteer = await Volunteer.findOne({ userId });
  if (!volunteer) {
    volunteer = await Volunteer.create({
      userId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      district: user.district,
      status,
      isActive: typeof user.isActive === "boolean" ? user.isActive : true,
      motivation: "Imported by district lead"
    });
  } else {
    volunteer.status = status;
    await volunteer.save();
  }

  res.status(200).json({
    status: "success",
    message: "Volunteer review status updated",
    volunteer: {
      userId,
      status: volunteer.status,
      isActive: volunteer.isActive || user.isActive,
    },
  });
});