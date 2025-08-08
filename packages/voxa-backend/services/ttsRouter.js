const { streamTTS: azureStreamTTS } = require('./azureTTS');
const { streamTTS: elevenLabsStreamTTS } = require('./elevenlabsTTS');
const { streamTTS: googleStreamTTS } = require('./googleTTS');
const { streamTTS: awsStreamTTS } = require('./pollyTTS');
const { preprocessTextForTTS } = require('./textPreprocessor');

function getTTSService(ttsService) {
    let ttsFunction;
    switch (ttsService) {
        case 'azure':
            ttsFunction = azureStreamTTS;
            break;
        case 'elevenlabs':
            ttsFunction = elevenLabsStreamTTS;
            break;
        case 'google':
            ttsFunction = googleStreamTTS;
            break;
        case 'aws':
            ttsFunction = awsStreamTTS;
            break;
        default:
            console.warn(`Unknown TTS service: ${ttsService}, falling back to Azure`);
            ttsFunction = azureStreamTTS;
            break;
    }
    
    // Return a wrapped function that includes text preprocessing
    return async function(text, ws, streamSid, voiceSettings, nearEndCallback, useChunks = true, callRecorder = null, userInterrupted = null) {
        // Preprocess text using the text preprocessor
        const result = preprocessTextForTTS(text);
        
        if (result.hasChanges) {
            console.log(`[${new Date().toISOString()}] [TTS] Text preprocessed - changes: ${result.changes.join(', ')}`);
            console.log(`[${new Date().toISOString()}] [TTS] Original: ${text}`);
            console.log(`[${new Date().toISOString()}] [TTS] Processed: ${result.text}`);
        }
        
        // Call the original TTS function with processed text
        return ttsFunction(result.text, ws, streamSid, voiceSettings, nearEndCallback, useChunks, callRecorder, userInterrupted);
    };
}

// Wrapper function that preprocesses text before calling the TTS service
async function streamTTS(text, ws, streamSid, voiceSettings, nearEndCallback, useChunks = true, callRecorder = null, userInterrupted = null, ttsService = 'azure') {
    // Preprocess text using the text preprocessor
    const result = preprocessTextForTTS(text);
    
    if (result.hasChanges) {
        console.log(`[${new Date().toISOString()}] [TTS] Text preprocessed - changes: ${result.changes.join(', ')}`);
        console.log(`[${new Date().toISOString()}] [TTS] Original: ${text}`);
        console.log(`[${new Date().toISOString()}] [TTS] Processed: ${result.text}`);
    }
    
    // Get the appropriate TTS service and call it with processed text
    const ttsFunction = getTTSService(ttsService);
    return ttsFunction(result.text, ws, streamSid, voiceSettings, nearEndCallback, useChunks, callRecorder, userInterrupted);
}

module.exports = { getTTSService, streamTTS }; 