const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  authProviders: {
    google: {
      id: String,
    },
    facebook: {
      id: String,
    },
    github: {
      id: String,
    },
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  authMethods: [{
    type: {
      type: String,
      enum: ['google', 'magic-link', 'email', 'github', 'facebook', 'apple'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  displayName: String,
  firstName: String,
  lastName: String,
  email: {
    type: String,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  defaultWorkspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace",
  },
  lastActiveWorkspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace",
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  onBoardingData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  agentOnboardingCompleted: {
    type: Boolean,
    default: false
  },
});

// Create a case-insensitive unique index for the email field
userSchema.index({ email: 1 }, { 
  unique: true, 
  collation: { locale: 'en', strength: 2 } // strength 2 means case-insensitive
});

// Pre-save hook to convert email to lowercase before saving
userSchema.pre('save', function(next) {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
