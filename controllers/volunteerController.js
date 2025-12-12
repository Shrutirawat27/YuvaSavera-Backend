const Volunteer = require('../models/Volunteer');
const User = require('../models/User');
const HelpRequest = require('../models/HelpRequest');
const bcrypt = require('bcryptjs');

function getFileUrl(file) {
  return file?.path || file?.secure_url || file?.url || file?.location || null;
}

const volunteerController = {
  // Register Volunteer
  registerVolunteer: async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        location,
        availability,
        experience,
        motivation,
        password,
        idProofType
      } = req.body;

      const skills = req.body.skills ? JSON.parse(req.body.skills) : [];
      const causes = req.body.causes ? JSON.parse(req.body.causes) : [];

      if (!name || !email || !phone || skills.length === 0 || causes.length === 0 || !availability || !motivation || !location) {
        return res.status(400).json({ status: "fail", message: "All required fields must be provided" });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ status: "fail", message: "Email already registered" });
      }

      const hashedPassword = password ? await bcrypt.hash(password, 12) : undefined;

      const user = await User.create({
        name,
        email,
        phone,
        role: 'volunteer',
        district: req.body.district || "Not Assigned",
        password: hashedPassword
      });

      let idProof = null;
      if (req.file) {
        idProof = {
          url: getFileUrl(req.file),
          publicId: req.file.public_id || req.file.filename,
          docType: idProofType || "aadhaar",
          mimeType: req.file.mimetype
        };
      }

      const volunteer = await Volunteer.create({
        userId: user._id,
        skills,
        causesOfInterest: causes,
        location,
        availability,
        experience,
        motivation,
        status: "pending_review",
        ...(idProof && { idProof })
      });

      res.status(201).json({
        status: "success",
        message: "Volunteer registered successfully",
        data: { volunteer }
      });
    } catch (error) {
      console.error("registerVolunteer err:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  },

  // Profile + Dashboard
  getVolunteerProfile: async (req, res) => {
    try {
      const volunteer = await Volunteer.findById(req.params.id)
        .populate('userId', 'name email phone')
        .lean();

      if (!volunteer) return res.status(404).json({ status: 'fail', message: 'Volunteer not found' });

      res.status(200).json({ status: 'success', data: { volunteer } });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  updateMyProfile: async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    const volunteer = await Volunteer.findOne({ userId });

    if (!user || !volunteer) {
      return res.status(404).json({ status: "fail", message: "Volunteer not found" });
    }

    const { name, phone, district, password } = req.body;
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (district) user.district = district;
    if (password) {
      user.password = await bcrypt.hash(password, 12);
    }
    await user.save();

    const volunteerFields = ["location", "availability", "experience", "motivation"];
    volunteerFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        volunteer[field] = req.body[field];
      }
    });
    await volunteer.save();

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: { user, volunteer },
    });
  } catch (error) {
    console.error("updateMyProfile error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
},

  updateVolunteerProfile: async (req, res) => {
    try {
      const allowedFields = ['skills', 'causes', 'causesOfInterest', 'availability', 'experience', 'motivation', 'location'];
      const updates = {};

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          if (field === 'causes') updates['causesOfInterest'] = req.body[field];
          else updates[field] = req.body[field];
        }
      });

      const volunteer = await Volunteer.findByIdAndUpdate(req.params.id, updates, { new: true });
      if (!volunteer) return res.status(404).json({ status: 'fail', message: 'Volunteer not found' });

      res.status(200).json({
        status: 'success',
        message: 'Volunteer profile updated successfully',
        data: { volunteer }
      });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  getVolunteerDashboard: async (req, res) => {
    try {
      res.status(200).json({
        status: 'success',
        data: {
          stats: {
            totalContributions: 15,
            totalPoints: 1250,
            totalBadges: 3,
            currentRank: 47,
            thisMonthHours: 12,
            thisMonthPeople: 3
          },
          recentContributions: [],
          upcomingOpportunities: [],
          badges: ['First Help', 'Education Champion', 'Community Leader']
        }
      });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  getLeaderboard: async (req, res) => {
    try {
      const topVolunteers = await Volunteer.find()
        .sort({ points: -1 })
        .limit(10)
        .populate('userId', 'name')
        .lean();

      const leaderboard = topVolunteers.map((v, index) => ({
        id: v._id,
        name: v.userId?.name || 'Unknown',
        points: v.points,
        rank: index + 1
      }));

      res.status(200).json({ status: 'success', data: { leaderboard } });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  getMyProfile: async (req, res) => {
    try {
      const me = await Volunteer.findOne({ userId: req.user.id }).populate('userId', 'name email phone district');

      if (!me) return res.status(404).json({ status: 'error', message: 'Volunteer not found' });

      res.status(200).json({ status: 'success', data: { volunteer: me } });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  // Volunteer actions
  getAvailableRequests: async (req, res) => {
    try {
      const requests = await HelpRequest.find({
        status: 'Open',
        assignedVolunteer: { $exists: false },
        adminStatus: 'approved'
      }).sort({ createdAt: -1 });

      res.status(200).json({ status: 'success', results: requests.length, requests });
    } catch (err) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  },

  // Return requests assigned to this volunteer (In Progress + Resolved)
  getVolunteerRequests: async (req, res) => {
    try {
      const volunteer = await Volunteer.findOne({ userId: req.user.id });
      if (!volunteer) return res.status(404).json({ status: 'fail', message: 'Volunteer not found' });

      const requests = await HelpRequest.find({ assignedVolunteer: volunteer._id }).sort({ createdAt: -1 });

      res.status(200).json({ status: 'success', results: requests.length, requests });
    } catch (err) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  },

  // Volunteer accepts a help request
acceptRequest: async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await HelpRequest.findById(requestId);
    if (!request) return res.status(404).json({ status: "fail", message: "Help request not found" });

    const volunteer = await Volunteer.findOne({ userId: req.user.id });
    if (!volunteer) return res.status(403).json({ status: "fail", message: "Not authorized as volunteer" });

    if (request.status === "Resolved") {
      return res.status(400).json({ status: "fail", message: "This request has already been completed" });
    }
    if (request.assignedVolunteer) {
      return res.status(400).json({ status: "fail", message: "This request is already assigned to another volunteer" });
    }
    if (request.status === "In Progress") {
      return res.status(400).json({ status: "fail", message: "This request is currently in progress" });
    }

    request.assignedVolunteer = volunteer._id;
    request.status = "In Progress";
    request.assignedAt = new Date();
    await request.save();

    volunteer.activeRequests = volunteer.activeRequests || [];
    if (!volunteer.activeRequests.some(r => r.toString() === request._id.toString())) {
      volunteer.activeRequests.push(request._id);
      await volunteer.save();
    }

    res.status(200).json({
      status: "success",
      message: "You are now helping with this request",
      data: { request, volunteer }
    });

  } catch (err) {
    console.error("acceptRequest error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
},

  submitProof: async (req, res) => {
    try {
      const { requestId, notes } = req.body;
      const files = req.files || (req.file ? [req.file] : []);
      if (!requestId) return res.status(400).json({ status: "fail", message: "requestId is required" });

      const request = await HelpRequest.findById(requestId);
      if (!request) return res.status(404).json({ status: "fail", message: "Help request not found" });

      const volunteer = await Volunteer.findOne({ userId: req.user.id });
      if (!volunteer) return res.status(403).json({ status: "fail", message: "Not authorized as volunteer" });

      if (!volunteer.activeRequests || !volunteer.activeRequests.some(r => r.toString() === request._id.toString())) {
        return res.status(400).json({ status: "fail", message: "This request is not assigned to you" });
      }

      const proofObj = {
        volunteer: volunteer._id,
        volunteerUserId: req.user.id,
        notes: notes || "",
        media: {},
        submittedAt: new Date(),
        review: { status: 'pending' }
      };

      if (files && files.length > 0) {
        const f = files[0];
        proofObj.media.url = getFileUrl(f);
        proofObj.media.publicId = f.public_id || f.filename;
        proofObj.media.mimeType = f.mimetype;
        proofObj.media.thumbnail = f.thumbnail || null;
      } else if (req.body.proofUrl) {
        proofObj.media.url = req.body.proofUrl;
      } else {
        return res.status(400).json({ status: "fail", message: "Provide proof file or proofUrl" });
      }

      request.proofs = request.proofs || [];
      request.proofs.push(proofObj);
      request.status = 'Pending Verification';
      await request.save();

      const addedProof = request.proofs[request.proofs.length - 1];
      volunteer.pendingProofs = volunteer.pendingProofs || [];
      volunteer.pendingProofs.push({ request: request._id, proofId: addedProof._id, submittedAt: addedProof.submittedAt });
      await volunteer.save();

      res.status(201).json({
        status: "success",
        message: "Proof submitted successfully and is pending admin verification",
        data: { requestId: request._id, proofId: addedProof._id }
      });
    } catch (err) {
      console.error("submitProof error:", err);
      res.status(500).json({ status: "error", message: err.message });
    }
  },

  // Admin/Core-Admin helpers 
  getAllVolunteers: async (req, res) => {
    try {
      const volunteers = await Volunteer.find().populate('userId', 'name email phone').lean();
      res.status(200).json({ status: 'success', results: volunteers.length, data: { volunteers } });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  addNewVolunteer: async (req, res) => {
    try {
      const { name, email, phone, password, skills, causes, availability, motivation, location } = req.body;
      if (!name || !email || !phone || !password) {
        return res.status(400).json({ status: 'fail', message: 'Name, email, phone and password are required' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await User.create({
        name,
        email,
        phone,
        role: 'volunteer',
        password: hashedPassword
      });

      const volunteer = await Volunteer.create({
        userId: user._id,
        skills: skills && skills.length ? skills : ['General'],
        causesOfInterest: causes && causes.length ? causes : ['General'],
        location: location || 'Not Provided',
        availability: availability || 'flexible',
        motivation: motivation || 'N/A',
        status: 'approved'
      });

      res.status(201).json({ status: 'success', message: 'Volunteer added successfully', data: { volunteer } });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  toggleVolunteerStatus: async (req, res) => {
    try {
      const volunteer = await Volunteer.findById(req.params.id);
      if (!volunteer) return res.status(404).json({ status: 'fail', message: 'Volunteer not found' });

      volunteer.isActive = !volunteer.isActive;
      await volunteer.save();

      res.status(200).json({ status: 'success', message: `Volunteer is now ${volunteer.isActive ? 'active' : 'inactive'}`, data: { volunteer } });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  updateVolunteerStatus: async (req, res) => {
    try {
      const { status } = req.body;
      if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ status: 'fail', message: 'Invalid status value' });

      const volunteer = await Volunteer.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
      if (!volunteer) return res.status(404).json({ status: 'fail', message: 'Volunteer not found' });

      res.status(200).json({ status: 'success', message: `Volunteer status updated to ${status}`, data: { volunteer } });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
};

module.exports = volunteerController;