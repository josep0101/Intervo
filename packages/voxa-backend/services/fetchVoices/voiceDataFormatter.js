/**
 * Common voice data formatter for standardizing voice data across different TTS services
 * This ensures a consistent API response regardless of the underlying voice service
 */

/**
 * Format voice data to a standardized structure
 * @param {Object} voiceData - Raw voice data from service API
 * @returns {Object} - Standardized voice data object
 */
function formatVoiceData(voiceData) {
  // Set default values for any missing properties
  return {
    // Required core properties
    service: voiceData.service || null,
    voiceId: voiceData.voiceId || null,
    voiceName: voiceData.voiceName || 'Unknown',
    publicUserId: voiceData.publicUserId || null,
    
    // Language and region properties
    language: voiceData.language || 'en', // ISO language code
    languageName: voiceData.languageName || null, // Human-readable language name
    accent: voiceData.accent || null,
    
    // Voice characteristics
    gender: voiceData.gender || 'neutral',
    displayName: voiceData.displayName || voiceData.voiceName,
    description: voiceData.description || '',
    premium: Boolean(voiceData.premium),
    
    // Media and categorization
    audioUrl: voiceData.audioUrl || null,
    tags: Array.isArray(voiceData.tags) ? voiceData.tags : [],
    
    // Service-specific data (optional)
    additionalData: voiceData.additionalData || {}
  };
}

/**
 * Apply common formatting to an array of voice data objects
 * @param {Array} voicesArray - Array of voice data objects
 * @param {string} service - Service identifier
 * @returns {Array} - Array of standardized voice data objects
 */
function formatVoicesArray(voicesArray, service) {
  if (!Array.isArray(voicesArray)) {
    console.error(`Invalid voice data array for service: ${service}`);
    return [];
  }
  
  return voicesArray.map(voice => formatVoiceData({
    ...voice,
    service
  }));
}

module.exports = {
  formatVoiceData,
  formatVoicesArray
}; 