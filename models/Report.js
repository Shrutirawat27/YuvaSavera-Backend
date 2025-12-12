const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved"],
      default: "pending",
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["User", "HelpRequest"],
      required: false,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "targetType", 
    },
    district: {
      type: String,
      required: true, 
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);