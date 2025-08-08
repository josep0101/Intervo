const { PollyClient, DescribeVoicesCommand } = require("@aws-sdk/client-polly");
const { formatVoiceData } = require("./voiceDataFormatter");

async function fetchAWSVoices() {
  const client = new PollyClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    const command = new DescribeVoicesCommand({});
    const response = await client.send(command);

    return response.Voices.map(voice => formatVoiceData({
      service: "aws",
      voiceId: voice.Id,
      voiceName: voice.Name || voice.Id,
      displayName: voice.Name || voice.Id,
      language: voice.LanguageCode,
      languageName: voice.LanguageName,
      gender: voice.Gender.toLowerCase(),
      premium: voice.SupportedEngines?.includes("neural") || false,
      description: voice.SupportedEngines?.includes("neural") ? 
                 "Neural voice powered by AWS" : "Standard voice powered by AWS",
      tags: [
        ...(voice.SupportedEngines || []),
        voice.LanguageName
      ],
      additionalData: {
        supportedEngines: voice.SupportedEngines,
        additionalLanguageCodes: voice.AdditionalLanguageCodes
      }
    }));
  } catch (error) {
    console.error("Error fetching voices from AWS Polly:", error);
    return [];
  }
}

module.exports = fetchAWSVoices;
