// models/Workspace.js
const mongoose = require("mongoose");
const crypto = require("crypto");

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    timezone: {
      type: String,
      required: true,
    },
    twilioSID: {
      type: String,
      set: encrypt,
      get: decrypt,
    },
    apiKey: {
      type: String,
      set: encrypt,
      get: decrypt,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
        },
        added: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    pendingInvites: [
      {
        email: {
          type: String,
        },
        role: {
          type: String,
        },
        added: {
          type: Date,
          default: Date.now,
        },
        inviteToken: {
          type: String,
          required: true,
        },
        inviteTokenExpires: {
          type: Date,
          required: true,
        },
      },
    ],
    // Billing and Credit Management
    // *** Updated Comment *** Represents the date/time the current billing period ends and the next cycle begins.
    // Set based on Stripe subscription's current_period_end.
    billingCycleAnchor: { type: Date },
    billingCycleInterval: { 
      type: String, 
      enum: ['monthly', 'yearly', 'free'],
      default: 'free'
    }, // Billing frequency derived from Stripe Price
    stripeCustomerId: { type: String, index: true }, // Stripe Customer ID
    stripeSubscriptionId: { type: String, index: true, unique: true, sparse: true }, // Stripe Subscription ID (unique if exists)
    stripePriceId: { type: String }, // Stripe Price ID of the active subscription
    subscriptionStatus: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'free'], // Reflects Stripe subscription status
      default: 'free'
    },
    // Credits from Subscription Plan
    planAllocatedCredits: { type: Number, default: 0 },
    // Non-subscription credits (PAYG Top-ups, Manual Grants, Bonuses)
    oneTimeCredits: [{
      amount: { type: Number, required: true },
      source: { 
          type: String, 
          enum: ['top-up', 'manual_grant', 'bonus', 'other'], 
          default: 'other' 
      }, // Origin of these credits
      description: { type: String }, 
      expiresAt: { type: Date }, 
      addedAt: { type: Date, default: Date.now } 
    }],
    // Pay As You Go Auto-Recharge Settings
    autoRechargeEnabled: { type: Boolean, default: false },
    autoRechargeThresholdCredits: { type: Number, default:  1000 }, // Trigger recharge when balance falls below this
    autoRechargeAmountToAddCredits: { type: Number, default: 2000 }, // Credits added per recharge
    autoRechargeChargeAmount: { type: Number, default: 1000 }, // Amount (in cents/smallest unit) to charge card
    autoRechargeCurrency: { type: String, default: 'usd' }, // Currency for the charge
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { toJSON: { getters: true } }
);

// Helper function to encrypt sensitive data
function encrypt(value) {
  const cipher = crypto.createCipher("aes-256-cbc", process.env.ENCRYPTION_KEY);
  let encrypted = cipher.update(value, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

// Add decrypt function
function decrypt(value) {
  // Return early if value is undefined, null, or not a string
  if (value === undefined || value === null || typeof value !== 'string' || value.trim() === '') {
    return value;
  }
  
  try {
    const decipher = crypto.createDecipher(
      "aes-256-cbc",
      process.env.ENCRYPTION_KEY
    );
    let decrypted = decipher.update(value, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    return value; // Return original value if decryption fails
  }
}

// Update timestamp on save
workspaceSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Workspace", workspaceSchema);
