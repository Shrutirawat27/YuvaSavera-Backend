const mongoose = require("mongoose");

const PartnerSchema = new mongoose.Schema({
  organizationName: { type: String, required: true },
  organizationType: { type: String, required: true },
  description: { type: String, required: true },
  focusAreas: [{ type: String, required: true }],
  location: { type: String, required: true },
  district: { type: String, required: true },
  contactPersonName: { type: String, required: true },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String, required: true },
  website: { type: String },
  registrationNumber: { type: String },
  additionalInfo: { type: String },
  logo: {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
}, { timestamps: true });

module.exports = mongoose.model("Partner", PartnerSchema);