const WebSocket = require("ws");
const sdk = require("microsoft-cognitiveservices-speech-sdk");

async function streamTTS(text, ws, streamSid, nearEndCallback, useChunks = true) {
  // Azure Speech configuration
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    process.env.AZURE_SPEECH_KEY,
    process.env.AZURE_SPEECH_REGION
  );

  // Configure for high-quality neural voice
  speechConfig.speechSynthesisVoiceName = "en-US-JennyMultilingualNeural";
  
  // Set output format for telephony
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Raw8Khz8BitMonoMULaw;

  // Example SSML
  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
      <voice name="en-US-JennyMultilingualNeural">
        <prosody rate="0.9" pitch="0%">
          ${text}
        </prosody>
      </voice>
    </speak>`;

  return new Promise((resolve, reject) => {
    // Create the SpeechSynthesizer
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

    // We’ll collect audio chunks as they arrive and push them into a queue.
    let chunkQueue = [];
    let isSending = false;
    let totalBytesReceived = 0;
    let synthesisCompleted = false;

    // Helper: break incoming Buffer into 320-byte sub-chunks, then queue them
    const enqueueAudioChunks = (buffer) => {
      const chunkSize = 320; // 320 bytes => 40ms of 8kHz, 8-bit, mono μ-law
      for (let i = 0; i < buffer.length; i += chunkSize) {
        chunkQueue.push(buffer.slice(i, i + chunkSize));
      }
      // Kick off sending if not already in progress
      if (!isSending) {
        isSending = true;
        sendNextChunk();
      }
    };

    // Helper: send the next chunk in the queue, then schedule another send
    const sendNextChunk = () => {
      // If no more chunks, check if TTS is completely done
      if (chunkQueue.length === 0) {
        isSending = false;

        // If TTS synthesis is complete and no chunks remain, wrap up
        if (synthesisCompleted) {
          console.log(`[${new Date().toISOString()}] Finished streaming TTS audio (Real-Time)`);

          // Schedule nearEnd callback ~500ms before actual end, if desired
          // or you can do it earlier if you track length carefully.
          // For a quick approach, call nearEndCallback right now:
          if (nearEndCallback && typeof nearEndCallback === "function") {
            nearEndCallback();
          }

          // Send a final mark event
          sendMarkEvent()
            .then(() => resolve())
            .catch((err) => reject(err));
        }
        return;
      }

      // Grab one chunk from the queue
      const chunk = chunkQueue.shift();
      const mediaMessage = {
        event: "media",
        streamSid,
        media: {
          payload: chunk.toString("base64"),
        },
      };

      // Send over the WebSocket
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(mediaMessage), (error) => {
          if (error) {
            console.error(`[${new Date().toISOString()}] Error sending chunk:`, error);
            return reject(error);
          }
        });
      } else {
        return reject(new Error("WebSocket is closed"));
      }

      // Schedule the next chunk ~40 ms later
      const chunkDurationMs = 40; // 320 bytes at 8kHz => 40ms
      setTimeout(sendNextChunk, chunkDurationMs);
    };

    // Helper: send a final mark event
    const sendMarkEvent = () => {
      return new Promise((markResolve, markReject) => {
        const markMessage = {
          event: "mark",
          streamSid,
          mark: { name: "End of response" },
        };
        ws.send(JSON.stringify(markMessage), (error) => {
          if (error) {
            console.error(`[${new Date().toISOString()}] Error sending mark event:`, error);
            return markReject(error);
          } else {
            console.log(`[${new Date().toISOString()}] Sent mark event`);
            return markResolve();
          }
        });
      });
    };

    // Fired as chunks of audio become available
    synthesizer.synthesizing = (s, e) => {
      if (e.result.reason === sdk.ResultReason.SynthesizingAudio) {
        const audioChunk = Buffer.from(e.result.audioData);
        totalBytesReceived += audioChunk.length;

        // Enqueue these bytes immediately for real-time streaming
        enqueueAudioChunks(audioChunk);
      }
    };

    // Fired when the entire TTS is complete (or if there's an error)
    synthesizer.synthesisCompleted = (s, e) => {
      console.log(
        `[${new Date().toISOString()}] Synthesis completed. Total bytes: ${totalBytesReceived}`
      );
      synthesisCompleted = true;
      // If we have no more queued chunks, we’ll finalize in sendNextChunk()
      // Otherwise, sendNextChunk() will finish after draining the queue
    };

    // Fired if there's an error at any point
    synthesizer.synthesisCanceled = (s, e) => {
      console.error(`[${new Date().toISOString()}] Synthesis canceled:`, e.reason);
      synthesizer.close();
      reject(new Error(`Synthesis canceled: ${e.reason}`));
    };

    // Start synthesis
    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        if (result.errorDetails) {
          console.error(`[${new Date().toISOString()}] Synthesis error:`, result.errorDetails);
          synthesizer.close();
          reject(new Error(result.errorDetails));
          return;
        }
        // No immediate action needed here because we’re handling it in events
        synthesizer.close();
      },
      (error) => {
        console.error(`[${new Date().toISOString()}] Synthesis error:`, error);
        synthesizer.close();
        reject(error);
      }
    );
  });
}

module.exports = { streamTTS };
