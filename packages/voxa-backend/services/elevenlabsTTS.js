const WebSocket = require("ws");
const fetch = require("node-fetch");

async function streamTTS(text, ws, streamSid, voiceSettings, nearEndCallback, useChunks = true, callRecorder = null, userInterrupted = null) {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVENLABS_API_KEY) {
    console.error(`[${new Date().toISOString()}] [ElevenLabs] Missing ELEVENLABS_API_KEY environment variable.`);
    return Promise.reject(new Error("Missing ElevenLabs API Key"));
  }
  const { voiceId } = voiceSettings;

  // Shared state for queuing and sending
  let chunkQueue = [];
  let isSending = false;
  let streamEnded = false; // Flag to indicate the source stream has ended
  let streamError = null;

  // Main promise managing the overall lifecycle
  return new Promise(async (resolve, reject) => {

    // --- WebSocket Sending Logic (Mostly unchanged from previous attempts) ---

    const sendMarkEvent = () => {
      return new Promise((markResolve, markReject) => {
        const markMessage = { event: "mark", streamSid, mark: { name: "End of response" } };
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(markMessage), (error) => {
            if (error) {
              console.error(`[${new Date().toISOString()}] [ElevenLabs] Error sending mark event:`, error);
              markReject(error);
            } else {
              console.log(`[${new Date().toISOString()}] [ElevenLabs] Sent mark event`);
              markResolve();
            }
          });
        } else {
          console.warn(`[${new Date().toISOString()}] [ElevenLabs] WebSocket closed before sending mark event.`);
          markReject(new Error("WebSocket closed before sending mark event"));
        }
      });
    };

    const checkAndFinalize = () => {
      if (streamEnded && chunkQueue.length === 0) {
        isSending = false;
        if (streamError) {
          console.error(`[${new Date().toISOString()}] [ElevenLabs] Finalizing with error:`, streamError.message);
          reject(streamError);
        } else {
          console.log(`[${new Date().toISOString()}] [ElevenLabs] Finished streaming TTS audio (optimized stream).`);
          if (nearEndCallback && typeof nearEndCallback === "function") {
            try {
              console.log(`[${new Date().toISOString()}] [ElevenLabs] Executing nearEndCallback.`);
              nearEndCallback();
            } catch (cbError) {
              console.error(`[${new Date().toISOString()}] [ElevenLabs] Error in nearEndCallback:`, cbError);
            }
          }
          sendMarkEvent().then(resolve).catch(reject);
        }
      }
    };

    const enqueueAudioChunks = (buffer) => {
      if (!(buffer instanceof Buffer) || buffer.length === 0) {
        console.warn(`[${new Date().toISOString()}] [ElevenLabs] Received empty or non-buffer chunk during enqueue, skipping.`);
        return;
      }
      chunkQueue.push(buffer);

      if (!isSending && !streamError) {
        isSending = true;
        sendNextChunk();
      }
    };

    const sendNextChunk = () => {
      // Check for user interruption
      if (userInterrupted && userInterrupted.value) {
        console.log(`[${new Date().toISOString()}] [ElevenLabs] User interruption detected, stopping TTS playback`);
        isSending = false;
        streamError = new Error("User interrupted TTS playback");
        chunkQueue = [];
        streamEnded = true;
        checkAndFinalize();
        return;
      }

      if (ws.readyState !== WebSocket.OPEN || streamError) {
        isSending = false;
        streamError = streamError || new Error("WebSocket closed or stream error occurred");
        chunkQueue = [];
        streamEnded = true; // Ensure stream is marked ended on WS error
        checkAndFinalize();
        return;
      }

      if (chunkQueue.length === 0) {
        isSending = false;
        checkAndFinalize(); // Check if source stream also ended
        return;
      }

      const chunk = chunkQueue.shift();
      const mediaMessage = { event: "media", streamSid, media: { payload: chunk.toString("base64") } };

      ws.send(JSON.stringify(mediaMessage), (error) => {
        if (error) {
          console.error(`[${new Date().toISOString()}] [ElevenLabs] Error sending chunk:`, error);
          streamError = error;
          isSending = false;
          chunkQueue = [];
          streamEnded = true; // Ensure stream marked ended on send error
          checkAndFinalize();
          return;
        }

        if (isSending && ws.readyState === WebSocket.OPEN) {
          const chunkDurationMs = (chunk.length / 8000) * 1000; // 8000 bytes/sec for ulaw_8000
          const delay = Math.max(1, chunkDurationMs);
          setTimeout(sendNextChunk, delay);
        } else if (ws.readyState !== WebSocket.OPEN) {
             console.warn(`[${new Date().toISOString()}] [ElevenLabs] WebSocket closed after successful send, before scheduling next.`);
             streamError = new Error("WebSocket closed during streaming");
             isSending = false;
             chunkQueue = [];
             streamEnded = true;
             checkAndFinalize();
        }
      });
    };

    // --- Optimized API Streaming using node-fetch with latency optimizations ---
    try {
      // Use the optimized request payload with Flash model and all latency optimizations
      const requestPayload = {
        text: text,
        model_id: "eleven_flash_v2_5", // Use Flash model for ~75ms latency
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          speaking_rate: 1.2,
          pitch: 0.0
        },
        // Additional latency optimizations
        apply_text_normalization: "off", // Disable text normalization for Flash models
        use_pvc_as_ivc: true // Use IVC version instead of PVC for lower latency
      };

      console.log(`[${new Date().toISOString()}] [ElevenLabs] Requesting optimized stream via Flash v2.5 for voice ${voiceId}...`);
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=ulaw_8000&optimize_streaming_latency=4`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
            "Accept": "audio/mulaw"
          },
          body: JSON.stringify(requestPayload)
        }
      );

      if (!response.ok) {
        const errorText = await response.text(); // Read error text if response not ok
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log(`[${new Date().toISOString()}] [ElevenLabs] HTTP Stream received (status ${response.status}), processing body...`);

      // *** CRITICAL: Iterate over response.body (ReadableStream) ***
      for await (const chunk of response.body) {
        // Check for user interruption
        if (userInterrupted && userInterrupted.value) {
          console.log(`[${new Date().toISOString()}] [ElevenLabs] User interruption detected during HTTP stream processing. Aborting.`);
          streamError = new Error("User interrupted TTS during stream processing");
          if (response.body.destroy) response.body.destroy();
          break;
        }

        if (ws.readyState !== WebSocket.OPEN) {
          console.warn(`[${new Date().toISOString()}] [ElevenLabs] WebSocket closed while processing HTTP stream. Aborting.`);
          streamError = new Error("WebSocket closed during stream processing");
          // Attempt to destroy the source stream? Node streams might need this.
          if (response.body.destroy) response.body.destroy();
          break; // Exit the loop
        }

        // Assuming chunks from response.body are Buffers for audio streams
        if (chunk instanceof Buffer) {
            if (callRecorder && chunk.length > 0) {
                callRecorder.recordOutgoing(chunk);
            }
            enqueueAudioChunks(chunk);
        } else {
            // This shouldn't happen for a successful audio stream, but log if it does
             console.warn(`[${new Date().toISOString()}] [ElevenLabs] Received non-buffer chunk from HTTP stream. Type: ${typeof chunk}`);
        }
      }

      // If the loop finishes without error, the stream ended normally
       if (!streamError) {
            console.log(`[${new Date().toISOString()}] [ElevenLabs] HTTP Stream body finished.`);
       }

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ElevenLabs] Error during fetch or stream processing:`, error);
      streamError = error;
      throw error;
    } finally {
      // Mark stream as ended regardless of success or failure
      streamEnded = true;
      // Trigger finalize check if not currently sending chunks
      if (!isSending) {
        checkAndFinalize();
      }
    }
  }); // End of main Promise
}

module.exports = { streamTTS }; 