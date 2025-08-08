const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config({path: '.env.development'});

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Function to generate secure API key
function generateSecureApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Migration function
async function addApiKeyToExistingAgents() {
  try {
    console.log('🚀 Starting migration to add apiKeys to existing agents...');
    
    // Import the models
    const Agent = require('../models/Agent');
    const AgentPublishedModel = mongoose.model('AgentPublished');
    
    // Find all agents that don't have an apiKey
    const agentsWithoutApiKey = await Agent.find({
      $or: [
        { apiKey: { $exists: false } },
        { apiKey: null },
        { apiKey: '' }
      ]
    });
    
    console.log(`📊 Found ${agentsWithoutApiKey.length} agents without apiKey`);
    
    if (agentsWithoutApiKey.length === 0) {
      console.log('✅ All agents already have apiKeys. No migration needed.');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    let publishedUpdateCount = 0;
    
    // Process each agent
    for (const agent of agentsWithoutApiKey) {
      try {
        let apiKey;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;
        
        // Generate a unique apiKey
        while (!isUnique && attempts < maxAttempts) {
          apiKey = generateSecureApiKey();
          const existingAgent = await Agent.findOne({ apiKey });
          const existingPublishedAgent = await AgentPublishedModel.findOne({ apiKey });
          
          if (!existingAgent && !existingPublishedAgent) {
            isUnique = true;
          } else {
            attempts++;
            console.log(`⚠️  Collision detected for agent ${agent._id}, generating new key (attempt ${attempts})`);
          }
        }
        
        if (!isUnique) {
          throw new Error(`Failed to generate unique apiKey after ${maxAttempts} attempts`);
        }
        
        // Update the agent with the new apiKey
        await Agent.updateOne(
          { _id: agent._id },
          { $set: { apiKey } }
        );
        
        console.log(`✅ Added apiKey to agent: ${agent.name} (${agent._id})`);
        successCount++;
        
        // Also update the corresponding published agent if it exists
        try {
          const publishedUpdateResult = await AgentPublishedModel.updateOne(
            { _id: agent._id },
            { $set: { apiKey } }
          );
          
          if (publishedUpdateResult.modifiedCount > 0) {
            console.log(`✅ Updated apiKey in published agent: ${agent.name} (${agent._id})`);
            publishedUpdateCount++;
          }
        } catch (publishedError) {
          console.warn(`⚠️  Could not update published agent ${agent._id}: ${publishedError.message}`);
          // Don't fail the whole migration if published update fails
        }
        
      } catch (error) {
        console.error(`❌ Error updating agent ${agent._id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📋 Migration Summary:');
    console.log(`✅ Successfully updated: ${successCount} agents`);
    console.log(`✅ Published agents updated: ${publishedUpdateCount} agents`);
    console.log(`❌ Failed to update: ${errorCount} agents`);
    console.log(`📊 Total processed: ${successCount + errorCount} agents`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Main execution function
async function main() {
  try {
    await connectToMongoDB();
    await addApiKeyToExistingAgents();
    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { addApiKeyToExistingAgents, generateSecureApiKey }; 