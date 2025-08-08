const axios = require("axios");
const { formatVoiceData } = require("./voiceDataFormatter");

async function fetchGoogleVoices() {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    const response = await axios.get(
      `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`
    );
    
    return response.data.voices.map(voice => formatVoiceData({
      service: "google",
      voiceId: voice.name,
      voiceName: voice.name.split('-').pop().replace('Neural', '').replace('Wavenet', ''),
      displayName: voice.name.split('-').pop().replace('Neural', '').replace('Wavenet', ''),
      language: voice.languageCodes[0],
      languageName: null, // Google doesn't provide language names
      gender: voice.ssmlGender.toLowerCase(),
      premium: voice.naturalSampleRateHertz >= 24000,
      description: voice.name.includes('Neural') ? 'Neural voice' : 
                  voice.name.includes('Wavenet') ? 'Wavenet voice' : 'Standard voice',
      tags: [
        voice.name.includes('Neural') ? 'Neural' : 
        voice.name.includes('Wavenet') ? 'Wavenet' : 'Standard'
      ],
      additionalData: {
        sampleRateHertz: voice.naturalSampleRateHertz,
        languageCodes: voice.languageCodes,
        rawName: voice.name
      }
    }));
  } catch (error) {
    console.error("Error fetching voices from Google:", error);
    return [];
  }
}

module.exports = fetchGoogleVoices;
