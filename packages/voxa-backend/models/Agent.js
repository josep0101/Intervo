const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
  },
  version: {
    type: Number,
    default: 0
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  apiKey: { 
    type: String, 
    unique: true, 
    sparse: true,
    default: () => crypto.randomBytes(32).toString('hex')
  },
  published: { type: Boolean, default: false },
  uniqueIdentifier: { 
    type: String, 
    unique: true, 
    sparse: true,
    default: () => uuidv4()
  },
  widgetId: { 
    type: String, 
    unique: true, 
    sparse: true,
    default: () => uuidv4()
  },
  webhook: {
    name: { type: String },
    endpoint: { type: String },
    method: { type: String, enum: ['GET', 'POST', 'PUT','PATCH', 'DELETE'] },
    event: { type: String }
  },
  phoneNumber: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PhoneNumber", 
  },
  subAgents: {
    intentAgent: {
      type: String,
    },
    ragAgent: {
      type: String,
    },
    quickAgent: {
      type: Object,
      default: {
        name: String,
        temperature: Number,
        maxTokens: Number
      }
    }
  },
  sttSettings: {
    service: {
      type: String,
      enum: ['Google Speech-to-Text', 'Azure Speech Services', "Assembly AI", "Deepgram"],
      default: 'Google Speech-to-Text'
    },
    rawTranscriptionMode: {
      type: Boolean,
      default: false
    }
  },
  ttsSettings: {
    service: String,
    voiceId: String,
    voiceName: String,
    voiceShortName: String,
    traits: [String],
    audioUrl: String,
    gender: String,
    language: String,
  },
  agentType: {
    type: String,
    required: true,
    default: 'Lead Qualification'
  },
  callDirection: {
    type: String,
    enum: ['incoming', 'outgoing', 'both'],
  },
  introduction: {
    type: String,
  },
  interactionSettings: {
    ambientAudio: {
      type: String,
      default: 'None'
    },
    responseThreshold: {
      type: Number,
      default: 0.5
    },
    conversationalFeedback: {
      type: Boolean,
      default: false
    },
    lexicalEnhancement: {
      terms: [{
        word: {
          type: String,
          trim: true,
        },
        pronunciation: {
          type: String,
          trim: true,
        },
      }],
      enabled: {
        type: Boolean,
        default: false,
      },
    },
    utteranceOptimization: {
      type: Boolean,
      default: false
    }
  },
  knowledgeBase: {
    sources: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeSource'
    }]
  },
  systemPrompt: {
    type: String,
  },
  prompt: {
    type: String,
  },
  rules: {
    type: [String],
    default: []
  },
  workflowNeedsUpdate: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  language: {
    type: String,
    required: true,
    default: 'en-US'
  },

  preferredSetupType: {
    type: String,
    enum: ['widget', 'phone'],
    default: 'widget'
  },
  orchestrationFlow: {
    nodes: [{
      id: { type: String, required: true },
      type: { type: String, required: true },
      position: {
        x: { type: Number, required: true },
        y: { type: Number, required: true }
      },
      sourcePosition: String,
      targetPosition: String,
      data: {
        label: String,
        settings: {
          type: mongoose.Schema.Types.Mixed,
          tools: [{
            toolId: {
              type: String,
              ref: 'Tool' // Reference to Tool model via toolId
            },
            name: String,
            type: String,
            serverUrl: String,
            parameters: mongoose.Schema.Types.Mixed
          }]
        }
      },
      className: String
    }],
    edges: [{
      id: { type: String, required: true },
      source: { type: String, required: true },
      target: { type: String, required: true },
      sourceHandle: { type: String },
      animated: { type: Boolean },
      data: {
        type: String,
        conditions: [{
          field: String,
          operator: String,
          value: mongoose.Schema.Types.Mixed
        }]
      }
    }]
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace'
  },
  kbArtifacts: {
    summary: {
      overall_theme: String,
      key_topics_entities: [String],
      content_overview: String,
      estimated_detail_level: String,
      error_details: String
    },
    topics: [String],
    lastTrained: Date
  },
  widgetConfiguration: {
    appearance: {
      color: String,        // Hex color code (e.g., "#111111")
      position: {
        type: String,
        enum: ['bottom-left', 'bottom-right']
      }
    },
    behavior: {
      startingMessage: String,
      features: {
        aiVoiceCall: Boolean,
        aiChat: Boolean
      }
    },
    contactMethod: {
      enabled: Boolean,
      type: {
        type: String,
        enum: ['email', 'whatsapp', 'phone', 'sms']
      },
      value: String         // Contact value (email/phone number)
    }
  }
});

// Update timestamp on save
agentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  next();
});

const Agent = mongoose.model("Agent", agentSchema); // Register the original model

// Register the model for the 'agents_published' collection using the SAME schema
mongoose.model("AgentPublished", agentSchema, "agents_published");

module.exports = Agent; // Export the original Agent model as default 