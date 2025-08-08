const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", required: true },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
  conversationId: { type: String, required: true, ref: "ConversationState" },
  conversationTranscription: [
    {
      speaker: { type: String, enum: ["agent", "user"], required: true },
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  conversationSummary: { type: Object },
  singleLineSummary: { type: String },
  // memory: { type: Map, of: mongoose.Schema.Types.Mixed }, // Stores key-value data important for the conversation
  collectedInfo: { type: Map, of: mongoose.Schema.Types.Mixed }, // Stores specific information collected during the call
  callDuration: { type: Number, default: 0 }, // Call duration in seconds
  creditsUsed: { type: Number, default: 0, index: true }, // Total credits used for this activity
  creditBreakdown: [{ // Detailed breakdown of credit usage within the activity
    reason: { type: String, required: true }, // Reason code (e.g., 'standard_response', 'premium_voice')
    credits: { type: Number, required: true }, // Credits charged for this specific action
    timestamp: { type: Date, default: Date.now } // When this charge occurred
  }],
  callType: { type: String, enum: ["incoming", "outgoing"] }, 
  status: { type: String, enum: ["completed", "in-progress", "missed"], default: "in-progress" },
  ticketStatus: { 
    type: String, 
    enum: ["open", "in-progress", "closed", "archived"],
    default: "open"
  },
  source: { type: String, enum: ["playground", "voxa.ai", "widget", "api"], required: true },
  conversationMode: { type: String, enum: ["call", "chat"], required: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace",
  },
  callRecording: {
    url: { type: String },
    durationSeconds: { type: Number }
  },
});

activitySchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Activity", activitySchema);
