const Workspace = require('../models/Workspace');
const siteDataService = require('./siteDataService'); // Assuming it's in the same lib directory
const mongoose = require('mongoose');

/**
 * Creates a new workspace for a user, potentially adding initial credits based on site settings.
 * @param {string | mongoose.Types.ObjectId} userId - The ID of the user creating the workspace.
 * @param {string} workspaceName - The desired name for the workspace.
 * @param {string} timezone - The timezone for the workspace.
 * @returns {Promise<Workspace>} The newly created and saved workspace document.
 * @throws {Error} If creation fails or settings retrieval fails critically.
 */
async function createWorkspace(userId, workspaceName, timezone) {
  console.log(`Attempting to create workspace '${workspaceName}' for user ${userId}`);
  try {
    const workspace = new Workspace({
      name: workspaceName,
      timezone: timezone,
      user: userId,
      oneTimeCredits: [], // Initialize as empty array
      // Billing defaults are handled by the schema
    });

    // --- Add initial credits based on global settings --- 
    const creditLimitSetting = await siteDataService.getSetting('GLOBAL_ADDON_CREDIT_LIMIT_ON_SIGNUP');
    const creditDescriptionSetting = await siteDataService.getSetting('GLOBAL_ADDON_CREDIT_LIMIT_DESCRIPTION_ON_SIGNUP', 'Signup Bonus'); // Default description
    const creditExpiryDaysSetting = await siteDataService.getSetting('GLOBAL_ADDON_CREDIT_LIMIT_EXPIRY_ON_SIGNUP'); // Expects number of days

    console.log(`creditLimitSetting: ${creditLimitSetting}, creditDescriptionSetting: ${creditDescriptionSetting}, creditExpiryDaysSetting: ${creditExpiryDaysSetting}`);
    let creditAmount = 0;
    let isValidLimit = false;

    // Check if creditLimitSetting is a valid positive number
    if (creditLimitSetting !== null && creditLimitSetting !== undefined && creditLimitSetting !== '') {
        const limitNum = Number(creditLimitSetting);
        if (!isNaN(limitNum) && limitNum > 0) {
            creditAmount = limitNum;
            isValidLimit = true;
        }
    }

    if (isValidLimit) {
        console.log(`Applying initial ${creditAmount} credits to workspace '${workspaceName}' based on settings.`);
        const creditToAdd = {
            amount: creditAmount,
            description: creditDescriptionSetting || 'Signup Bonus', // Use fetched or default description
            addedAt: new Date(),
        };

        // Calculate expiry date if setting is valid
        let expiryDate = null;
        if (creditExpiryDaysSetting !== null && creditExpiryDaysSetting !== undefined && creditExpiryDaysSetting !== '') {
            const expiryDays = Number(creditExpiryDaysSetting);
            if (!isNaN(expiryDays) && expiryDays > 0) {
                expiryDate = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
                creditToAdd.expiresAt = expiryDate;
                 console.log(`Credits will expire on: ${expiryDate.toISOString()}`);
            } else {
                 console.warn(`Invalid GLOBAL_ADDON_CREDIT_LIMIT_EXPIRY_ON_SIGNUP setting: ${creditExpiryDaysSetting}. Credits will not expire.`);
            }
        } else {
             console.log(`No expiry setting found for initial credits.`);
        }

        workspace.oneTimeCredits.push(creditToAdd);
    } else {
         console.log(`Initial credit setting not found or invalid for workspace '${workspaceName}'. No credits added.`);
    }
    // --- End initial credits --- 

    const savedWorkspace = await workspace.save();
    console.log(`Workspace '${savedWorkspace.name}' (ID: ${savedWorkspace._id}) created successfully.`);
    return savedWorkspace;

  } catch (error) {
    console.error(`Error creating workspace '${workspaceName}' for user ${userId}:`, error);
    // Re-throw the error to be handled by the calling route
    throw error; 
  }
}

module.exports = {
  createWorkspace,
}; 