const mongoose = require("mongoose");

const CampaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: { type: String, required: true },
    imageUrl: { type: String, default: "" },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    participantsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

CampaignSchema.pre("save", function (next) {
  this.participantsCount = this.participants.length;
  next();
});

module.exports = mongoose.model("Campaign", CampaignSchema);