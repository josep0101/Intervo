require('dotenv').config({ path: '.env.production' });
const mongoose = require('mongoose');
const Activity = require('../models/Activity');

async function migrateTicketStatus() {
  try {
    console.log('Starting ticket status migration...');
    
    // First, let's count how many documents need updating
    const documentsToUpdate = await Activity.countDocuments({ ticketStatus: { $exists: false } });
    
    if (documentsToUpdate === 0) {
      console.log('No documents need migration. All documents already have ticketStatus.');
      process.exit(0);
      return;
    }

    // Show what we're about to do
    console.log(`Found ${documentsToUpdate} documents that need ticketStatus to be set.`);
    
    // Prompt for confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    await new Promise((resolve) => {
      readline.question(`Are you sure you want to update ${documentsToUpdate} documents? (yes/no): `, async (answer) => {
        if (answer.toLowerCase() !== 'yes') {
          console.log('Migration cancelled.');
          process.exit(0);
        }
        readline.close();
        resolve();
      });
    });

    // Do the update with a timestamp for tracking
    const migrationTimestamp = new Date();
    const result = await Activity.updateMany(
      { 
        ticketStatus: { $exists: false }
      },
      { 
        $set: { 
          ticketStatus: 'open',
          _migratedAt: migrationTimestamp
        }
      }
    );

    // Verify the results
    const verificationCount = await Activity.countDocuments({
      _migratedAt: migrationTimestamp
    });

    console.log('\nMigration Results:');
    console.log(`- Documents found: ${documentsToUpdate}`);
    console.log(`- Documents updated: ${result.modifiedCount}`);
    console.log(`- Verification count: ${verificationCount}`);
    
    if (result.modifiedCount !== documentsToUpdate) {
      console.log('\nWARNING: Number of updated documents doesn\'t match initial count!');
      console.log('Please check the database manually.');
    } else {
      console.log('\nMigration completed successfully!');
    }

    // Optional: Remove the migration timestamp
    if (verificationCount === result.modifiedCount) {
      await Activity.updateMany(
        { _migratedAt: migrationTimestamp },
        { $unset: { _migratedAt: "" } }
      );
    }

    process.exit(0);
  } catch (error) {
    console.error('\nMigration failed with error:', error);
    console.log('\nNo documents were modified. Database is in original state.');
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Ensure we're connecting to the right database
console.log('Preparing to connect to MongoDB...');
console.log('NODE_ENV:', process.env);
console.log('Database URI:', process.env.MONGO_URI?.replace(/:\/\/.*@/, '://****@')); // Hide credentials

// Prompt for environment confirmation
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Are you sure you want to run this migration on the current environment? (yes/no): ', (answer) => {
  if (answer.toLowerCase() !== 'yes') {
    console.log('Migration cancelled.');
    process.exit(0);
  }
  
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log('\nConnected to MongoDB');
      migrateTicketStatus();
    })
    .catch((err) => {
      console.error('\nMongoDB connection error:', err);
      process.exit(1);
    });
}); 