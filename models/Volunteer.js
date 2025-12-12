const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: String,
  email: String,
  phone: String,
  district: String,
  location: { type: String, required: true },
  skills: { type: [String], validate: [arr => arr && arr.length > 0, 'At least one skill is required'] },
  causesOfInterest: { type: [String], validate: [arr => arr && arr.length > 0, 'At least one cause is required'] },
  availability: { type: String, enum: ['weekends','evenings','flexible','full-time'], required: true },
  experience: { type: String, maxlength: 1000 },
  motivation: { type: String, required: true, maxlength: 1000 },

  idProof: {
    url: String,
    publicId: String,
    docType: { type: String, enum: ['aadhaar','driving_license','passport'] },
    mimeType: String
  },

  points: { type: Number, default: 0, min: 0 },
  badges: [{ name: String, earnedAt: { type: Date, default: Date.now }, description: String }],

  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },

  contributionHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HelpRequest' }],

  status: { type: String, enum: ['pending_review','approved','rejected'], default: 'pending_review' },
  isActive: { type: Boolean, default: true },

  preferences: {
    notifications: { email: { type: Boolean, default: true }, sms: { type: Boolean, default: false }, push: { type: Boolean, default: true } },
    maxDistance: { type: Number, default: 50 }
  },

  // new fields:
  activeRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HelpRequest' }], 
  pendingProofs: [{ 
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'HelpRequest' },
    proofId: { type: mongoose.Schema.Types.ObjectId }, 
    submittedAt: Date
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
volunteerSchema.index({ skills: 1 });
volunteerSchema.index({ causesOfInterest: 1 });
volunteerSchema.index({ status: 1 });
volunteerSchema.index({ points: -1 });
volunteerSchema.index({ district: 1 });

// Virtual to populate user (optional)
volunteerSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

volunteerSchema.pre(/^find/, function(next) {
  this.populate('user', 'name email phone district');
  next();
});

// Methods
volunteerSchema.methods.addPoints = function(points) {
  this.points += points;
  return this.save();
};

volunteerSchema.methods.addBadge = function(badgeName, description) {
  this.badges.push({ name: badgeName, description, earnedAt: new Date() });
  return this.save();
};

module.exports = mongoose.model('Volunteer', volunteerSchema);