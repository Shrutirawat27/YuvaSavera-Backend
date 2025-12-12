const Story = require("../models/Story");
const { AppError, catchAsync } = require("../middleware/errorMiddleware");

// User submits story → goes as "pending"
exports.createStory = catchAsync(async (req, res, next) => {
  const { title, description, volunteerName, helpSeekerName, category, impactMetrics } = req.body;

  if (!req.files || !req.files.beforeImage || !req.files.afterImage) {
    return next(new AppError("Both before and after images are required", 400));
  }

  const story = await Story.create({
    title,
    description,
    beforeImage: {
      url: req.files.beforeImage[0].path,
      publicId: req.files.beforeImage[0].filename,
    },
    afterImage: {
      url: req.files.afterImage[0].path,
      publicId: req.files.afterImage[0].filename,
    },
    volunteerName,
    helpSeekerName,
    category,
    impactMetrics,
    createdBy: req.user._id,
    status: "pending",
  });

  res.status(201).json({
    status: "success",
    message: "Story submitted successfully. Pending admin approval.",
    data: { story },
  });
});


// Admin: Delete a story
exports.deleteStory = catchAsync(async (req, res, next) => {
  const story = await Story.findByIdAndDelete(req.params.id);
  if (!story) return next(new AppError("Story not found", 404));

  res.json({
    status: "success",
    message: "Story deleted successfully",
  });
});


// Public: Get only approved stories
exports.getAllStories = catchAsync(async (req, res) => {
  const stories = await Story.find({ status: "approved" }).sort({ createdAt: -1 });
  res.status(200).json({
    status: "success",
    results: stories.length,
    data: { stories },
  });
});

// Get single approved story
exports.getStoryById = catchAsync(async (req, res, next) => {
  const story = await Story.findById(req.params.id);
  if (!story) return next(new AppError("Story not found", 404));
  if (story.status !== "approved") return next(new AppError("Story not approved yet", 403));

  res.status(200).json({
    status: "success",
    data: { story },
  });
});

// Admin: Get only pending stories
exports.getPendingStories = catchAsync(async (req, res) => {
  const stories = await Story.find({ status: "pending" })
    .populate("createdBy", "name email");
  res.json({ status: "success", data: { stories } });
});

// Admin: Get all stories (approved, rejected, pending)
exports.getAllAdminStories = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status; 

  const stories = await Story.find(filter)
    .sort({ createdAt: -1 })
    .populate("createdBy", "name email");

  res.json({
    status: "success",
    results: stories.length,
    data: { stories },
  });
});

// Admin: Approve / Reject
exports.updateStoryStatus = catchAsync(async (req, res, next) => {
  const { action } = req.body; 
  const story = await Story.findById(req.params.id);
  if (!story) return next(new AppError("Story not found", 404));

  story.status = action === "approve" ? "approved" : "rejected";
  await story.save();

  res.json({
    status: "success",
    message: `Story ${action}d successfully`,
    data: { story },
  });
});