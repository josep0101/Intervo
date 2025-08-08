#!/usr/bin/env node

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env.production
require('dotenv').config({ path: 'packages/voxa-backend/.env.production' });

// User schema (matching the existing User.js model)
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

const User = mongoose.model("User", userSchema);

// Function to escape CSV values
function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, newline, or double quote, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }
  
  return stringValue;
}

// Function to convert array to string for CSV
function arrayToString(arr) {
  if (!Array.isArray(arr)) return '';
  return arr.join(';'); // Use semicolon to separate array items
}

async function exportUsers() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not set in .env.production');
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('📋 Fetching all users...');
    const users = await User.find({}).lean();
    console.log(`📊 Found ${users.length} users`);
    
    // Prepare CSV header
    const csvHeader = [
      'Name',
      'Email',
      'Role',
      'Company Size',
      'Use Case',
      'Goals',
      'Source',
      'Personal Role',
      'Interest',
      'Company Name',
      'Company Type',
      'Onboarding Completed',
      'Created At'
    ];
    
    // Prepare CSV rows
    const csvRows = [csvHeader.join(',')];
    
    users.forEach(user => {
      const onBoardingData = user.onBoardingData || {};
      
      const row = [
        escapeCsvValue(user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim()),
        escapeCsvValue(user.email),
        escapeCsvValue(onBoardingData.role || ''),
        escapeCsvValue(onBoardingData.companySize || ''),
        escapeCsvValue(onBoardingData.useCase || ''),
        escapeCsvValue(onBoardingData.goals || ''),
        escapeCsvValue(arrayToString(onBoardingData.source)),
        escapeCsvValue(onBoardingData.personalRole || ''),
        escapeCsvValue(onBoardingData.interest || ''),
        escapeCsvValue(onBoardingData.companyName || ''),
        escapeCsvValue(onBoardingData.companyType || ''),
        escapeCsvValue(user.onboardingCompleted || false),
        escapeCsvValue(user.createdAt ? user.createdAt.toISOString() : '')
      ];
      
      csvRows.push(row.join(','));
    });
    
    // Write to CSV file
    const csvContent = csvRows.join('\n');
    const fileName = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    
    fs.writeFileSync(fileName, csvContent, 'utf8');
    
    console.log(`✅ Export completed! File saved as: ${fileName}`);
    console.log(`📈 Total users exported: ${users.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the export
exportUsers(); 