const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String }, 
    subject: { type: String, required: true },
    category: { type: String, required: true },
    message: { type: String, required: true },
    district: { type: String, required: true }, 
    status: { 
      type: String, 
      enum: ["pending", "reviewed"], 
      default: "pending" 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactMessage", contactMessageSchema);