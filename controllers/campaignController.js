const Campaign = require('../models/Campaign');

exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const imageUrl = req.file.path || req.file.secure_url || req.file.url || (req.file && req.file.filename) || '';

    return res.status(201).json({ success: true, imageUrl });
  } catch (err) {
    next(err);
  }
};


// Create campaign proposal
exports.createProposal = async (req, res, next) => {
  try {
    const { title, description, startDate, endDate, location, imageUrl, participants } = req.body;

    if (!title || !description || !startDate || !endDate || !location) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const initialParticipants = participants && participants.length > 0
      ? participants
      : [req.user._id];

    const campaign = new Campaign({
      title: title.trim(),
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      location,
      imageUrl: imageUrl || '',
      status: 'pending',
      createdBy: req.user._id,
      participants: initialParticipants,
    });

    await campaign.save();

    res.status(201).json({
      success: true,
      message: 'Proposal submitted successfully. Pending admin approval.',
      campaign,
    });
  } catch (err) {
    next(err);
  }
};



// Get approved campaigns (public)
exports.getApprovedCampaigns = async (req, res, next) => {
  try {
    const campaigns = await Campaign.find({ status: 'approved' }).sort({ startDate: 1 }).lean();
    const now = new Date();

    const formatted = campaigns.map(c => {
      let lifecycle = 'Upcoming';
      if (new Date(c.startDate) <= now && new Date(c.endDate) >= now) lifecycle = 'Active';
      else if (new Date(c.endDate) < now) lifecycle = 'Completed';
      return { ...c, lifecycle };
    });

    res.json({ success: true, campaigns: formatted });
  } catch (err) {
    next(err);
  }
};

// Admin: fetch pending proposals 
exports.getProposals = async (req, res, next) => {
  try {
    const proposals = await Campaign.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, campaigns: proposals });
  } catch (err) {
    next(err);
  }
};

// Admin: approve a campaign 
exports.approveCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    campaign.status = 'approved';
    await campaign.save();

    const now = new Date();
    let lifecycle = 'Upcoming';
    if (new Date(campaign.startDate) <= now && new Date(campaign.endDate) >= now) lifecycle = 'Active';
    else if (new Date(campaign.endDate) < now) lifecycle = 'Completed';

    res.json({ success: true, message: 'Campaign approved', campaign: { ...campaign.toObject(), lifecycle } });
  } catch (err) {
    next(err);
  }
};

// Admin: delete campaign
exports.deleteCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findByIdAndDelete(id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Campaign deleted', campaign });
  } catch (err) {
    next(err);
  }
};

// Join a campaign
exports.joinCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    if (campaign.participants.includes(req.user._id)) {
      return res.status(400).json({ success: false, message: "You already joined this campaign" });
    }

    campaign.participants.push(req.user._id);
    await campaign.save();

    res.json({ success: true, message: "Joined campaign successfully", campaign });
  } catch (err) {
    next(err);
  }
};

// Get my joined campaigns
exports.getMyJoinedCampaigns = async (req, res, next) => {
  try {
    const campaigns = await Campaign.find({ participants: req.user._id })
      .populate("createdBy", "name email")
      .sort({ startDate: -1 });

    const now = new Date();
    const formatted = campaigns.map((c) => {
      let lifecycle = "Upcoming";
      if (new Date(c.startDate) <= now && new Date(c.endDate) >= now) lifecycle = "Active";
      else if (new Date(c.endDate) < now) lifecycle = "Completed";
      return { ...c.toObject(), lifecycle };
    });

    res.json({ success: true, campaigns: formatted });
  } catch (err) {
    next(err);
  }
};

// Admin: view participants of a campaign
exports.getCampaignParticipants = async (req, res, next) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id).populate("participants", "name email phone");
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }
    res.json({ success: true, participants: campaign.participants });
  } catch (err) {
    next(err);
  }
};

// Admin: get all campaigns (pending, approved, rejected)
exports.getAllCampaignsAdmin = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status; 

    const campaigns = await Campaign.find(filter).sort({ createdAt: -1 }).lean();

    const now = new Date();
    const formatted = campaigns.map(c => {
      let lifecycle = "Upcoming";
      if (new Date(c.startDate) <= now && new Date(c.endDate) >= now) lifecycle = "Active";
      else if (new Date(c.endDate) < now) lifecycle = "Completed";
      return { ...c, lifecycle };
    });

    res.json({ success: true, campaigns: formatted });
  } catch (err) {
    next(err);
  }
};

// Public: get featured campaign 
exports.getFeaturedCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.findOne({ status: "approved" })
      .sort({ participantsCount: -1 }) 
      .lean();

    if (!campaign) {
      return res.status(404).json({ success: false, message: "No featured campaign found" });
    }

    const now = new Date();
    let lifecycle = "Upcoming";
    if (new Date(campaign.startDate) <= now && new Date(campaign.endDate) >= now) lifecycle = "Active";
    else if (new Date(campaign.endDate) < now) lifecycle = "Completed";

    return res.json({ success: true, campaign: { ...campaign, lifecycle } });
  } catch (err) {
    next(err);
  }
};

// Get campaigns created by logged-in user 
exports.getMyCampaigns = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not found in request" });
    }

    const campaigns = await Campaign.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();
    const formatted = campaigns.map(c => {
      let lifecycle = "Upcoming";
      if (new Date(c.startDate) <= now && new Date(c.endDate) >= now) lifecycle = "Active";
      else if (new Date(c.endDate) < now) lifecycle = "Completed";
      return { ...c, lifecycle };
    });

    res.json({ success: true, campaigns: formatted });
  } catch (err) {
    console.error("Error in getMyCampaigns:", err);
    next(err);
  }
};

exports.deleteOwnCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    if (campaign.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this campaign' });
    }

    await Campaign.deleteOne({ _id: id });

    res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.leaveCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id);
    if (!campaign) return res.status(404).json({ success: false, message: "Campaign not found" });

    campaign.participants = campaign.participants.filter(
      (p) => p.toString() !== req.user._id.toString()
    );

    await campaign.save();
    res.json({ success: true, message: "Left campaign successfully" });
  } catch (err) {
    next(err);
  }
};