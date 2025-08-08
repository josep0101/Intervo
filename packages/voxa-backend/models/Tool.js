const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');

const toolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Associations
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
    index: true
  },

  // Tool Configuration
  serverUrl: {
    type: String,
    required: true,
    trim: true
  },
  protocol: {
    type: String,
    enum: ['mcp', 'rest', 'graphql'],
    default: 'mcp'
  },
  
  // Credentials (encrypted)
  credentials: {
    apiKey: {
      type: String,
      select: false // Don't include in queries by default for security
    },
    accessToken: {
      type: String,
      select: false
    },
    refreshToken: {
      type: String,
      select: false
    },
    clientId: {
      type: String,
      select: false
    },
    clientSecret: {
      type: String,
      select: false
    },
    // Additional service-specific credentials
    additionalCredentials: {
      type: Map,
      of: String,
      select: false
    }
  },

  // Service-specific configuration
  configuration: {
    // Calendly specific
    userUri: String,
    defaultEventType: String,
    
    // Google Calendar specific
    calendarId: String,
    timezone: String,
    
    // Outlook specific
    tenantId: String,
    
    // Generic parameters
    parameters: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },

  // Tool Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isHealthy: {
    type: Boolean,
    default: false
  },
  lastHealthCheck: {
    type: Date
  },
  healthCheckInterval: {
    type: Number,
    default: 30000 // 30 seconds
  },

  // Unique identifier for referencing in orchestrationFlow
  toolId: {
    type: String,
    unique: true,
    default: () => uuidv4(),
    index: true
  },

  // Usage tracking
  usageStats: {
    totalCalls: {
      type: Number,
      default: 0
    },
    lastUsed: Date,
    errorCount: {
      type: Number,
      default: 0
    },
    lastError: {
      message: String,
      timestamp: Date
    }
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Compound indexes for efficient queries
toolSchema.index({ user: 1, workspace: 1, type: 1 });
toolSchema.index({ agent: 1, isActive: 1 });
toolSchema.index({ toolId: 1, isActive: 1 });

// Update timestamp on save
toolSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance methods
toolSchema.methods.updateUsageStats = async function(success = true, error = null) {
  const updateData = {
    $inc: { 'usageStats.totalCalls': 1 },
    $set: { 'usageStats.lastUsed': new Date() }
  };
  
  if (!success && error) {
    updateData.$inc['usageStats.errorCount'] = 1;
    updateData.$set['usageStats.lastError'] = {
      message: error.message || error,
      timestamp: new Date()
    };
  }
  
  // Use atomic operation to prevent parallel save errors
  try {
    const result = await this.constructor.findByIdAndUpdate(
      this._id,
      updateData,
      { new: true, runValidators: false }
    );
    
    // Update the current instance to reflect changes
    if (result) {
      this.usageStats = result.usageStats;
    }
    
    return result;
  } catch (atomicError) {
    // If atomic update fails, try with retry logic
    console.warn(`Atomic update failed for tool ${this._id}, retrying...`);
    return this._retryUsageStatsUpdate(success, error, 3);
  }
};

// Retry mechanism for usage stats updates
toolSchema.methods._retryUsageStatsUpdate = async function(success, error, maxRetries) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add small delay to reduce collision probability
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 * attempt));
      
      const updateData = {
        $inc: { 'usageStats.totalCalls': 1 },
        $set: { 'usageStats.lastUsed': new Date() }
      };
      
      if (!success && error) {
        updateData.$inc['usageStats.errorCount'] = 1;
        updateData.$set['usageStats.lastError'] = {
          message: error.message || error,
          timestamp: new Date()
        };
      }
      
      const result = await this.constructor.findByIdAndUpdate(
        this._id,
        updateData,
        { new: true, runValidators: false }
      );
      
      if (result) {
        this.usageStats = result.usageStats;
        return result;
      }
    } catch (retryError) {
      if (attempt === maxRetries) {
        console.error(`Failed to update usage stats after ${maxRetries} attempts:`, retryError);
        // Don't throw error for stats update failures - just log them
        return this;
      }
    }
  }
  return this;
};

toolSchema.methods.updateHealthStatus = async function(isHealthy) {
  try {
    const result = await this.constructor.findByIdAndUpdate(
      this._id,
      {
        $set: {
          isHealthy: isHealthy,
          lastHealthCheck: new Date()
        }
      },
      { new: true, runValidators: false }
    );
    
    // Update current instance
    if (result) {
      this.isHealthy = result.isHealthy;
      this.lastHealthCheck = result.lastHealthCheck;
    }
    
    return result;
  } catch (error) {
    console.warn(`Failed to update health status for tool ${this._id}:`, error);
    return this;
  }
};

// Static methods
toolSchema.statics.findByToolId = function(toolId) {
  return this.findOne({ toolId, isActive: true });
};

toolSchema.statics.findByAgent = function(agentId, includeCredentials = false) {
  const query = this.find({ agent: agentId, isActive: true });
  if (includeCredentials) {
    query.select('+credentials.apiKey +credentials.accessToken +credentials.refreshToken +credentials.clientId +credentials.clientSecret +credentials.additionalCredentials');
  }
  return query;
};

toolSchema.statics.findByUserAndWorkspace = function(userId, workspaceId, includeCredentials = false) {
  const query = this.find({ user: userId, workspace: workspaceId, isActive: true });
  if (includeCredentials) {
    query.select('+credentials.apiKey +credentials.accessToken +credentials.refreshToken +credentials.clientId +credentials.clientSecret +credentials.additionalCredentials');
  }
  return query;
};

toolSchema.statics.findByType = function(type, userId = null, workspaceId = null) {
  const filter = { type, isActive: true };
  if (userId) filter.user = userId;
  if (workspaceId) filter.workspace = workspaceId;
  return this.find(filter);
};

// Virtual for getting primary credential based on tool type
toolSchema.virtual('primaryCredential').get(function() {
  if (!this.credentials) return null;
  
  switch (this.type) {
    case 'calendly':
      return this.credentials.apiKey;
    case 'google-calendar':
      return this.credentials.accessToken;
    case 'outlook-calendar':
      return this.credentials.accessToken;
    default:
      return this.credentials.apiKey || this.credentials.accessToken;
  }
});

// Ensure virtual fields are serialized
toolSchema.set('toJSON', { virtuals: true });
toolSchema.set('toObject', { virtuals: true });

const Tool = mongoose.model("Tool", toolSchema);

module.exports = Tool;
