const SiteData = require('../models/SiteData');

// In-memory cache for settings
let cachedSettings = null;
const CONFIG_KEY = 'global_config';

/**
 * Loads settings from the database into the in-memory cache.
 * Creates the default document if it doesn't exist.
 */
async function loadSettings() {
  try {
    console.log('Attempting to load site settings into cache...');
    let siteData = await SiteData.findOne({ configKey: CONFIG_KEY }).lean();

    if (!siteData) {
      console.log('No site settings found in DB, creating default document...');
      // If no settings doc exists, create one with an empty settings object
      siteData = await SiteData.create({ configKey: CONFIG_KEY, settings: {} });
      console.log('Default site settings document created.');
      cachedSettings = {}; // Start with empty settings
    } else {
      cachedSettings = siteData.settings || {};
      console.log('Site settings loaded into cache successfully.');
    }
  } catch (error) {
    console.error('FATAL ERROR: Could not load site settings from database:', error);
    // Depending on your application, you might want to throw the error
    // to prevent the app from starting in a bad state, or fallback to hardcoded defaults.
    // For now, we'll set cache to null and log the error.
    cachedSettings = null; 
    // throw error; // Option: uncomment to halt startup on failure
  }
}

/**
 * Retrieves all settings from the cache.
 * Attempts to load them if cache is empty.
 * @returns {Promise<object>} The settings object or null if loading failed.
 */
async function getAllSettings() {
  if (cachedSettings === null) {
    console.warn('Site settings cache is empty, attempting to reload...');
    await loadSettings(); // Attempt to reload if cache is empty
  }
  // Return a copy to prevent accidental modification of the cache
  return cachedSettings ? { ...cachedSettings } : null; 
}

/**
 * Retrieves a specific setting value from the cache by its key.
 * @param {string} key - The key of the setting to retrieve.
 * @param {any} defaultValue - Optional default value if key not found.
 * @returns {Promise<any>} The setting value or the default value.
 */
async function getSetting(key, defaultValue = undefined) {
  const settings = await getAllSettings();
  if (settings === null) {
      console.error(`Failed to retrieve setting '${key}' because settings could not be loaded.`);
      return defaultValue;
  }
  return settings.hasOwnProperty(key) ? settings[key] : defaultValue;
}

/**
 * Updates the entire settings object in the database and refreshes the cache.
 * @param {object} newSettings - The new settings object to save.
 * @returns {Promise<object>} The updated settings object.
 */
async function updateSettings(newSettings) {
  if (typeof newSettings !== 'object' || newSettings === null) {
    throw new Error('Invalid settings format: Must be an object.');
  }
  try {
    const updatedDoc = await SiteData.findOneAndUpdate(
      { configKey: CONFIG_KEY },
      { $set: { settings: newSettings } },
      { 
        new: true, // Return the updated document
        upsert: true, // Create if it doesn't exist
        runValidators: true, // Ensure schema types are checked (though Mixed is flexible)
        lean: true // Return plain JS object
      }
    );

    if (!updatedDoc) {
        throw new Error('Failed to update or create site data document.');
    }

    // IMPORTANT: Update the cache immediately after successful DB update
    cachedSettings = updatedDoc.settings || {};
    console.log('Site settings updated in DB and cache refreshed.');
    return cachedSettings;

  } catch (error) {
    console.error('Error updating site settings:', error);
    throw error; // Re-throw to be handled by the caller (e.g., the API route)
  }
}

module.exports = {
  loadSettings,     // Call this on application startup
  getAllSettings,   // Use in admin API to get all settings
  getSetting,       // Use anywhere in the app to get a specific setting
  updateSettings,   // Use in admin API to update settings
}; 