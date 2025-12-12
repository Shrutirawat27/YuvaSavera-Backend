const mongoose = require('mongoose');

const proofSchema = new mongoose.Schema({
  volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer', required: true },
  volunteerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  notes: String,
  media: {
    url: String,
    publicId: String,
    mimeType: String,
    thumbnail: String,
  },
  submittedAt: { type: Date, default: Date.now },
  review: {
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    notes: String
  }
}, { _id: true });

const helpRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true,
    default: () => `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  },
  title: { type: String, required: true, trim: true, maxLength: 200 },
  description: { type: String, required: true, maxLength: 2000 },
  category: { type: String, enum: ['Education','Healthcare','Employment','Counseling','Emergency'], required: true },

  district: { type: String, required: true },

  location: {
    address: String,
    city: String,
    district: String,
    state: String,
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] } 
    }
  },

  urgencyLevel: { type: String, enum: ['Low','Medium','High','Critical'], required: true },

  submittedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true }
  },

  anonymous: { type: Boolean, default: false },

  media: {
    video: { url: String, publicId: String, thumbnail: String },
    images: [{ url: String, publicId: String }]
  },

  status: {
    type: String,
    enum: ['Open','In Progress','Pending Verification','Resolved','Closed','Cancelled'],
    default: 'Open'
  },

  adminStatus: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },

  isPublic: { type: Boolean, default: false },

  assignedVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer' },
  assignedAt: Date,
  resolvedAt: Date,

  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    submittedAt: Date
  },

  tags: [String],
  viewCount: { type: Number, default: 0 },

  interestedVolunteers: [{
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer' },
    appliedAt: { type: Date, default: Date.now },
    message: String
  }],

  proofs: [proofSchema], 

  adminNotes: String,
  isVerified: { type: Boolean, default: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
helpRequestSchema.index({ category: 1 });
helpRequestSchema.index({ status: 1 });
helpRequestSchema.index({ urgencyLevel: 1 });
helpRequestSchema.index({ district: 1 });
helpRequestSchema.index({ 'location.coordinates': '2dsphere' });
helpRequestSchema.index({ createdAt: -1 });
helpRequestSchema.index({ assignedVolunteer: 1 });

helpRequestSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const days = Math.floor(diff / (1000*60*60*24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
});

helpRequestSchema.methods.assignVolunteer = function(volunteerId) {
  this.assignedVolunteer = volunteerId;
  this.assignedAt = new Date();
  this.status = 'In Progress';
  return this.save();
};

helpRequestSchema.methods.markResolved = function(feedback) {
  this.status = 'Resolved';
  this.resolvedAt = new Date();
  if (feedback) {
    this.feedback = { ...feedback, submittedAt: new Date() };
  }
  return this.save();
};

helpRequestSchema.statics.findNearby = function(coordinates, maxDistance = 50000) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: maxDistance
      }
    },
    status: 'Open'
  });
};

module.exports = mongoose.model('HelpRequest', helpRequestSchema);