const mongoose = require("mongoose");

const districtLeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    district: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DistrictLead", districtLeadSchema);