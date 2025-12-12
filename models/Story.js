const mongoose = require("mongoose");

const storySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ["Education", "Healthcare", "Employment", "Counseling", "Environment"],
    required: true,
  },
  volunteerName: String,
  helpSeekerName: String,
  impactMetrics: String,

  beforeImage: { url: String, publicId: String },
  afterImage: { url: String, publicId: String },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("Story", storySchema);