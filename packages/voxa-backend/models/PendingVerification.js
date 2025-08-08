const mongoose = require("mongoose");

const pendingVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },
  firstName: String,
  lastName: String,
  tokenHash: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['login', 'signup'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'expired'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '7d' // Auto-delete after 7 days using TTL index
  },
  expiresAt: {
    type: Date,
    required: true
  },
  ip: String,
  userAgent: String
});

// Create indexes for efficient querying
pendingVerificationSchema.index({ email: 1, createdAt: -1 }, { 
  collation: { locale: 'en', strength: 2 } // Case-insensitive email
});
pendingVerificationSchema.index({ status: 1, expiresAt: 1 });

// Pre-save hook to convert email to lowercase before saving
pendingVerificationSchema.pre('save', function(next) {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});

const PendingVerification = mongoose.model("PendingVerification", pendingVerificationSchema);

module.exports = PendingVerification; 