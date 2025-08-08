// Azure Text-to-Speech API integration
// https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech
const fs = require('fs');
const path = require('path');
const { formatVoiceData } = require("./voiceDataFormatter");

// Map of accent names to their corresponding locale codes
const ACCENT_TO_LOCALE_MAP = {
  'american': 'en-US',
  'australian': 'en-AU',
  'british': 'en-GB',
  'canadian': 'en-CA',
  'indian': 'en-IN',
  'irish': 'en-IE',
  'scottish': 'en-GB', // Approximation - Scottish is typically under en-GB
  'nigerian': 'en-NG',
  'south african': 'en-ZA',
  'new zealand': 'en-NZ',
  'welsh': 'cy-GB',
  'singaporean': 'en-SG',
  'hongkong': 'en-HK'
};

/**
 * Fetches Azure voices from the local JSON file with filtering and pagination
 * @param {number} offset - Pagination offset
 * @param {number} limit - Pagination limit
 * @param {Object} filters - Filters for voices
 * @returns {Array} - Filtered and paginated voices
 */
async function fetchAzureVoices(offset = 0, limit = 10, filters = {}) {
  try {
    // Read the local JSON file
    const filePath = path.join(__dirname, '../../assets/azure_voices_28-03-2025.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const voices = JSON.parse(rawData);

    // Start with English voices
    let filteredVoices = voices.filter(voice => voice.locale?.toLowerCase().startsWith('en-'));

    // Apply gender filter if specified
    if (filters.gender && filters.gender !== 'all') {
      const genderFilter = filters.gender.toLowerCase();
      filteredVoices = filteredVoices.filter(voice => 
        voice.properties.Gender?.toLowerCase() === genderFilter
      );
    }

    // Apply accent filter if specified
    if (filters.accent && filters.accent !== 'all' && filters.accent !== 'Any') {
      const accentFilter = filters.accent.toLowerCase();
      
      // Check if it's a known accent code
      const localeCode = ACCENT_TO_LOCALE_MAP[accentFilter];
      
      if (localeCode) {
        filteredVoices = filteredVoices.filter(voice => 
          voice.locale === localeCode ||
          // For special cases like Scottish which might be a subset of en-GB
          (localeCode === 'en-GB' && voice.locale === 'en-GB' && 
           voice.properties.LocalName?.toLowerCase().includes('scot'))
        );
      } else {
        // For accents we don't have direct mapping for, try to match in various fields
        filteredVoices = filteredVoices.filter(voice => 
          voice.shortName?.toLowerCase().includes(accentFilter) ||
          voice.properties.LocalName?.toLowerCase().includes(accentFilter) ||
          voice.description?.toLowerCase().includes(accentFilter)
        );
      }
    }

    // Sort by OrderInVoiceListApi
    filteredVoices.sort((a, b) => {
      const orderA = parseInt(a.properties.OrderInVoiceListApi) || 0;
      const orderB = parseInt(b.properties.OrderInVoiceListApi) || 0;
      return orderA - orderB;
    });

    // Get total count before pagination
    const totalCount = filteredVoices.length;
    
    // Apply pagination
    const paginatedVoices = filteredVoices.slice(offset, offset + limit);

    // Format voices with common format
    const formattedVoices = paginatedVoices.map(voice => formatVoiceData({
      service: "azure",
      voiceId: voice.id,
      voiceName: voice.properties.DisplayName,
      displayName: voice.properties.DisplayName,
      language: voice.locale,
      languageName: voice.properties.LocaleDescription,
      gender: voice.properties.Gender?.toLowerCase(),
      accent: getAccentFromLocale(voice.locale),
      description: voice.description || '',
      premium: voice.properties.FrontendVoiceType === "Neural",
      tags: [
        ...(voice.voiceTags?.find(t => t.name === "voicePersonalities")?.tags || []),
        ...(voice.voiceTags?.find(t => t.name === "tailoredScenarios")?.tags || [])
      ],
      audioUrl: voice.samples?.styleSamples?.[0]?.audioFileEndpointWithSas || null,
      additionalData: {
        shortName: voice.shortName,
        ageGroup: voice.properties.AgeGroups,
        personality: voice.properties.Personality,
        scenarios: voice.properties.TailoredScenarios,
        voiceType: voice.voiceType,
        orderInList: voice.properties.OrderInVoiceListApi
      }
    }));

    return {
      voices: formattedVoices,
      totalCount
    };
  } catch (error) {
    console.error("Error fetching voices from Azure JSON file:", error.message);
    return {
      voices: [],
      totalCount: 0
    };
  }
}

/**
 * Gets a human-readable accent name from locale code
 * @param {string} locale - The locale code (e.g., en-US, en-GB)
 * @returns {string} - Accent name
 */
function getAccentFromLocale(locale) {
  if (!locale) return null;
  
  const localeMap = {
    'en-US': 'American',
    'en-GB': 'British',
    'en-AU': 'Australian',
    'en-CA': 'Canadian',
    'en-IN': 'Indian',
    'en-IE': 'Irish',
    'en-NG': 'Nigerian',
    'en-ZA': 'South African',
    'en-NZ': 'New Zealand',
    'en-SG': 'Singaporean',
    'en-HK': 'Hong Kong',
    'cy-GB': 'Welsh'
  };
  
  return localeMap[locale] || locale.split('-')[1];
}

module.exports = fetchAzureVoices;
