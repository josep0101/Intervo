const axios = require("axios");
const { formatVoiceData } = require("./voiceDataFormatter");

async function fetchElevenLabsVoices(offset, limit, filters = {}) {
  try {
    const page = Math.max(0, Math.floor((offset) / limit));
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    // Build query parameters
    const params = new URLSearchParams({
      page_size: limit,
      page,
      sort: 'trending', // Use trending sort by default
      min_notice_period_days: 0
    });
    
    // Add optional filters if provided
    if (filters.language) params.append('language', filters.language);
    if (filters.gender) params.append('gender', filters.gender);
    if (filters.accent) params.append('accent', filters.accent);
    if (filters.category) params.append('category', filters.category);
    if (filters.age) params.append('age', filters.age);
    if (filters.search) params.append('search', filters.search);
    if (filters.use_cases) params.append('use_cases', filters.use_cases);
    
    const response = await axios.get(
      `https://api.us.elevenlabs.io/v1/shared-voices?${params.toString()}`,
      {
        headers: { "xi-api-key": apiKey },
      }
    );
    
    return response.data.voices.map(voice => formatVoiceData({
      publicUserId: voice.public_owner_id,
      service: "elevenlabs",
      voiceId: voice.voice_id,
      voiceName: voice.name,
      displayName: voice.name,
      language: voice.language || "en",
      gender: voice.gender || "neutral",
      premium: voice.premium,
      accent: voice.accent,
      description: voice.description,
      audioUrl: voice.preview_url,
      tags: voice.use_cases || [],
      additionalData: {
        category: voice.category,
        previewUrl: voice.preview_url,
        samples: voice.samples,
        labels: voice.labels
      }
    }));
  } catch (error) {
    console.error("Error fetching voices from ElevenLabs:", error);
    return [];
  }
}

module.exports = fetchElevenLabsVoices;
