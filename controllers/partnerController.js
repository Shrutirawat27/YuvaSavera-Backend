const Partner = require("../models/Partner");
const cloudinary = require("../config/cloudinaryConfig");

// helper: upload buffer to cloudinary
const uploadBufferToCloudinary = (buffer, folder = "partners") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

exports.submitPartner = async (req, res, next) => {
  try {
    const {
      organizationName,
      organizationType,
      description,
      focusAreas, 
      location,
      district,
      contactPersonName,
      contactEmail,
      contactPhone,
      website,
      registrationNumber,
      additionalInfo,
    } = req.body;

    if (!organizationName || !organizationType || !description || !contactPersonName || !contactEmail || !contactPhone || !location || !district) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    let parsedFocusAreas = [];
    if (Array.isArray(req.body.focusAreas)) parsedFocusAreas = req.body.focusAreas;
    else if (typeof focusAreas === "string" && focusAreas.length) {
      try {
        const maybeJson = JSON.parse(focusAreas);
        if (Array.isArray(maybeJson)) parsedFocusAreas = maybeJson;
        else parsedFocusAreas = focusAreas.split(",").map(s => s.trim()).filter(Boolean);
      } catch {
        parsedFocusAreas = focusAreas.split(",").map(s => s.trim()).filter(Boolean);
      }
    }

    let logo = { url: "", publicId: "" };
    if (req.file && req.file.buffer) {
      const result = await uploadBufferToCloudinary(req.file.buffer, "partners");
      logo.url = result.secure_url || result.url || "";
      logo.publicId = result.public_id || "";
    }

    const partner = await Partner.create({
      organizationName,
      organizationType,
      description,
      focusAreas: parsedFocusAreas,
      location,
      district,
      contactPersonName,
      contactEmail,
      contactPhone,
      website: website || "",
      registrationNumber: registrationNumber || "",
      additionalInfo: additionalInfo || "",
      logo,
      status: "pending",
    });

    return res.status(201).json({ success: true, partner });
  } catch (err) {
    console.error("submitPartner error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

exports.getApprovedPartners = async (req, res, next) => {
  try {
    const partners = await Partner.find({ status: "approved" }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, partners });
  } catch (err) {
    next(err);
  }
};

exports.getPendingPartners = async (req, res, next) => {
  try {
    const partners = await Partner.find({ status: "pending" }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, partners });
  } catch (err) {
    next(err);
  }
};

exports.updatePartnerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const partner = await Partner.findByIdAndUpdate(id, { status }, { new: true });
    if (!partner) return res.status(404).json({ success: false, message: "Partner not found" });
    res.json({ success: true, partner });
  } catch (err) {
    next(err);
  }
};