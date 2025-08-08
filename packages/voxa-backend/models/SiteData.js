const mongoose = require('mongoose');

const siteDataSchema = new mongoose.Schema(
  {
    // Using a fixed key to easily find the single settings document
    configKey: {
      type: String,
      unique: true,
      required: true,
      default: 'global_config', 
    },
    // Using Mixed type to allow arbitrary key-value pairs
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Ensure configKey is indexed for efficient lookup
siteDataSchema.index({ configKey: 1 });

module.exports = mongoose.model('SiteData', siteDataSchema); 