const WebSocket = require("ws");
const fetch = require("node-fetch");

// Helper function for basic sentence splitting
// This is a simple approach and might not handle all edge cases (e.g., abbreviations).
function splitIntoSentences(text) {
  if (!text) return [];
  const sentences = text.match(/[^.!?]+[.!?]?\s*/g) || [];
  return sentences.map(s => s.trim()).filter(s => s.length > 0);
}

async function streamTTS(text, ws, streamSid, voiceSettings, nearEndCallback, useChunks = true, callRecorder = null) {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const { voiceId } = voiceSettings;

  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) {
    console.log(`[${new Date().toISOString()}] [ElevenLabs] No sentences to synthesize.`);
    return Promise.resolve(); // Nothing to do
  }

  let allAudioBuffers = [];
  let totalAudioLength = 0;

  console.log(`[${new Date().toISOString()}] [ElevenLabs] Starting synthesis for ${sentences.length} sentences.`);

  try {
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      console.log(`[${new Date().toISOString()}] [ElevenLabs] Synthesizing sentence ${i + 1}/${sentences.length}: "${sentence.substring(0, 50)}..."`);

      // ElevenLabs API request configuration for the current sentence
      const request = {
        text: sentence, // Use current sentence
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        //   speaking_rate: 1.2, // Note: Removed speaking_rate and pitch as they might not be standard/supported
        //   pitch: 0.0
        }
      };

      // Request synthesized speech from ElevenLabs for the current sentence
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=3&output_format=ulaw_8000`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
            "Accept": "audio/mulaw"  // Request mulaw format for telephony
          },
          body: JSON.stringify(request)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${new Date().toISOString()}] [ElevenLabs] API error for sentence ${i + 1}: ${response.status} ${response.statusText} - ${errorText}`);
        // Decide how to handle partial failures. Here, we stop and throw.
        throw new Error(`ElevenLabs API error on sentence ${i + 1}: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Convert the audio stream for this sentence to a buffer
      const sentenceAudioContent = await response.buffer();
      console.log(`[${new Date().toISOString()}] [ElevenLabs] Received ${sentenceAudioContent.length} bytes for sentence ${i + 1}.`);

      if (sentenceAudioContent.length > 0) {
         // --- Add Recording Step (Per Sentence) ---
         if (callRecorder) {
           callRecorder.recordOutgoing(sentenceAudioContent);
           console.log(`[${new Date().toISOString()}] [ElevenLabs] Recorded ${sentenceAudioContent.length} bytes for sentence ${i + 1}.`);
         }
         // --- End Recording Step ---

        allAudioBuffers.push(sentenceAudioContent);
        totalAudioLength += sentenceAudioContent.length;
      }
    } // End sentence loop

  } catch (error) {
     console.error(`[${new Date().toISOString()}] [ElevenLabs] Failed during sentence synthesis loop:`, error);
     // Reject the main promise if any sentence fails
     return Promise.reject(error);
  }

  if (allAudioBuffers.length === 0 || totalAudioLength === 0) {
      console.log(`[${new Date().toISOString()}] [ElevenLabs] No audio generated after processing all sentences.`);
      // Still need to send a mark event if the WS is open?
      // Or just resolve cleanly. Let's resolve cleanly.
      return Promise.resolve();
  }

  // Concatenate all sentence audio buffers into one
  const finalAudioContent = Buffer.concat(allAudioBuffers);
  console.log(`[${new Date().toISOString()}] [ElevenLabs] Total synthesized audio length: ${finalAudioContent.length} bytes.`);


  const chunkSize = 320;  // Same chunk size

  // Now proceed with the original chunking/sending logic using finalAudioContent
  return new Promise((resolve, reject) => {
    const sendMarkEvent = () => {
      const markMessage = { event: "mark", streamSid, mark: { name: "End of response" } };
       if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(markMessage), (error) => {
            if (error) {
                console.error(`[${new Date().toISOString()}] [ElevenLabs] Error sending mark event:`, error);
                reject(error); // Reject the main promise on mark send failure
            } else {
                console.log(`[${new Date().toISOString()}] [ElevenLabs] Sent mark event`);
                resolve(); // Resolve the main promise after successful mark send
            }
            });
       } else {
            console.warn(`[${new Date().toISOString()}] [ElevenLabs] WebSocket closed before sending mark event.`);
            reject(new Error("WebSocket closed before sending mark event"));
       }
    };

    // Calculate total duration based on the final concatenated audio
    const totalDurationMs = (finalAudioContent.length / 8000) * 1000; // Total duration in milliseconds

    // Schedule near-end callback based on total duration
    // Ensure delay is not negative if audio is very short
    const nearEndDelay = Math.max(0, totalDurationMs - 500);
    console.log(`[${new Date().toISOString()}] [ElevenLabs] Total duration: ${totalDurationMs.toFixed(2)}ms. Scheduling nearEndCallback in ${nearEndDelay.toFixed(2)}ms.`);
    const nearEndTimeout = setTimeout(() => {
      if (nearEndCallback && typeof nearEndCallback === "function") {
         try {
            console.log(`[${new Date().toISOString()}] [ElevenLabs] Executing nearEndCallback.`);
            nearEndCallback();
         } catch (cbError) {
             console.error(`[${new Date().toISOString()}] [ElevenLabs] Error in nearEndCallback:`, cbError);
         }
      }
    }, nearEndDelay);

    if (useChunks) {
      let offset = 0;
      let chunkSendTimeout = null; // Keep track of timeout

      function sendChunk() {
        if (offset >= finalAudioContent.length) {
          console.log(`[${new Date().toISOString()}] [ElevenLabs] Finished streaming TTS audio (Chunked)`);
          // Clear nearEnd timeout if it hasn't fired
          clearTimeout(nearEndTimeout);
          sendMarkEvent(); // Send mark immediately after last chunk is logically processed
          // No need for extra delay here, resolve/reject happens in sendMarkEvent
          return;
        }

        const chunkToSend = finalAudioContent.slice(offset, offset + chunkSize);
        const mediaMessage = { event: "media", streamSid, media: { payload: chunkToSend.toString("base64") } };

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(mediaMessage), (error) => {
            if (error) {
              console.error(`[${new Date().toISOString()}] [ElevenLabs] Error sending chunk:`, error);
              clearTimeout(nearEndTimeout); // Clear timeouts on error
              clearTimeout(chunkSendTimeout);
              reject(error); // Reject the main promise
            }
            // Only schedule next chunk if send was successful
             else {
                 offset += chunkSize;
                 // Calculate delay based on the actual chunk size sent
                 const chunkDurationMs = (chunkToSend.length / 8000) * 1000;
                 chunkSendTimeout = setTimeout(sendChunk, chunkDurationMs);
             }
          });
        } else {
          console.error(`[${new Date().toISOString()}] [ElevenLabs] WebSocket closed during chunk sending.`);
          clearTimeout(nearEndTimeout);
          clearTimeout(chunkSendTimeout);
          reject(new Error("WebSocket is closed"));
          return;
        }
      }
      sendChunk();
    } else {
      // Send the entire concatenated audio at once
      const audioChunk = finalAudioContent.toString("base64");
      const mediaMessage = { event: "media", streamSid, media: { payload: audioChunk } };

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(mediaMessage), (error) => {
          if (error) {
            console.error(`[${new Date().toISOString()}] [ElevenLabs] Error sending full audio content:`, error);
             clearTimeout(nearEndTimeout);
            reject(error);
          } else {
            console.log(`[${new Date().toISOString()}] [ElevenLabs] Sent full audio content (Non-Chunked)`);
             clearTimeout(nearEndTimeout);
            sendMarkEvent(); // Resolve/reject happens in sendMarkEvent
          }
        });
      } else {
         console.error(`[${new Date().toISOString()}] [ElevenLabs] WebSocket closed before sending full audio.`);
         clearTimeout(nearEndTimeout);
        reject(new Error("WebSocket is closed"));
      }
    }
  });
}

module.exports = { streamTTS }; 