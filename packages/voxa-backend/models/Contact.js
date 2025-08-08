const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, trim: true },
  fullName: { type: String, trim: true },
  email: { type: String, required: true, trim: true, match: /.+@.+\..+/ },
  phoneNumber: { type: String, required: true, trim: true, match: /^\+?[1-9]\d{1,14}$/ },
  countryCode: { type: String, required: false },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace",
  },
});

contactSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Create a compound index on phoneNumber and agent
// This ensures uniqueness of phoneNumber only within a specific agent's scope
contactSchema.index({ phoneNumber: 1, agent: 1 }, { unique: true });

// Note: You may need to drop the existing unique index on phoneNumber in the database
// This can be done using MongoDB directly:
// db.contacts.dropIndex("phoneNumber_1")

module.exports = mongoose.model("Contact", contactSchema);
