const WebSocket = require("ws");
const sdk = require("microsoft-cognitiveservices-speech-sdk");

// Helper function for basic sentence splitting
// This is a simple approach and might not handle all edge cases (e.g., abbreviations).
function splitIntoSentences(text) {
  if (!text) return [];
  const sentences = text.match(/[^.!?]+[.!?]?\s*/g) || [];
  return sentences.map(s => s.trim()).filter(s => s.length > 0);
}

// Helper function to create SSML, escaping necessary characters
function createSsml(text, voiceShortName) {
  const escapedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
  return `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
      <voice name="${voiceShortName}">
        <prosody rate="1" pitch="0%">
          ${escapedText}
        </prosody>
      </voice>
    </speak>`;
}

async function streamTTS(text, ws, streamSid, voiceSettings, nearEndCallback, useChunks = true, callRecorder = null, userInterrupted = null) {
  // Azure Speech configuration
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    process.env.AZURE_SPEECH_KEY,
    process.env.AZURE_SPEECH_REGION
  );

  const { voiceShortName } = voiceSettings;


  // Configure for high-quality neural voice
  // speechConfig.speechSynthesisVoiceName = "en-US-JennyMultilingualNeural";
  // Don't set speechSynthesisVoiceName for custom voices with UUID
  
  // Set output format for telephony
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Raw8Khz8BitMonoMULaw;

  // Split text into sentences
  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) {
    console.log(`[${new Date().toISOString()}] No sentences to synthesize.`);
    return Promise.resolve(); // Nothing to do if text is empty/invalid
  }

  // We use a single outer promise to manage the overall lifecycle
  return new Promise(async (resolve, reject) => {
    let chunkQueue = [];
    let isSending = false;
    let synthesisEncounteredError = null; // Track errors across sentences
    let sentencesCompleted = 0; // Track how many sentences finished synthesizing

    // --- Shared Helpers (mostly unchanged, but adapted slightly) ---

    // Helper: break incoming Buffer into 320-byte sub-chunks, then queue them
    const enqueueAudioChunks = (buffer) => {
      const chunkSize = 320; // 320 bytes => 40ms of 8kHz, 8-bit, mono μ-law
      for (let i = 0; i < buffer.length; i += chunkSize) {
        chunkQueue.push(buffer.slice(i, i + chunkSize));
      }
      // Kick off sending if not already in progress and no fatal error occurred
      if (!isSending && !synthesisEncounteredError) {
        isSending = true;
        sendNextChunk();
      }
    };

    // Helper: Check if all sentences are done and the queue is empty
    const checkAndFinalize = () => {
      // Finalize only when all sentences reported completion AND the queue is empty
      if (sentencesCompleted === sentences.length && chunkQueue.length === 0) {
        isSending = false; // Stop the sending loop

        if (synthesisEncounteredError) {
          console.error(`[${new Date().toISOString()}] Finalizing with error:`, synthesisEncounteredError.message);
          return reject(synthesisEncounteredError); // Reject the main promise
        } else {
          console.log(`[${new Date().toISOString()}] Finished streaming TTS audio for all sentences.`);
          // Call nearEndCallback right before sending the final mark
          if (nearEndCallback && typeof nearEndCallback === "function") {
            try {
              nearEndCallback();
            } catch(cbError) {
              console.error(`[${new Date().toISOString()}] Error in nearEndCallback:`, cbError);
            }
          }
          // Send the final mark event
          sendMarkEvent().then(resolve).catch(reject); // Resolve main promise on success
        }
      }
      // Otherwise, do nothing - either more synthesis is coming or queue needs draining
    };


    // Helper: send the next chunk in the queue, then schedule another send
    const sendNextChunk = () => {
      // Check for user interruption
      if (userInterrupted && userInterrupted.value) {
        console.log(`[${new Date().toISOString()}] User interruption detected, stopping Azure TTS playback`);
        isSending = false;
        synthesisEncounteredError = new Error("User interrupted TTS playback");
        chunkQueue = [];
        // Mark all sentences as completed to trigger finalization
        sentencesCompleted = sentences.length;
        checkAndFinalize();
        return;
      }

      // Stop if WebSocket closed or an error occurred during processing
      if (ws.readyState !== WebSocket.OPEN || synthesisEncounteredError) {
        isSending = false;
        synthesisEncounteredError = synthesisEncounteredError || new Error("WebSocket closed or error occurred during streaming");
        chunkQueue = []; // Clear queue on error or closure
        // Mark all as "completed" on error to trigger finalization/rejection check
        if (synthesisEncounteredError && sentencesCompleted < sentences.length) {
            sentencesCompleted = sentences.length;
        }
        checkAndFinalize();
        return;
      }

      // If no more chunks, check if TTS is completely done for all sentences
      if (chunkQueue.length === 0) {
        isSending = false;
        checkAndFinalize(); // Check if we can finalize
        return;
      }

      const chunk = chunkQueue.shift();
      const mediaMessage = {
        event: "media",
        streamSid,
        media: {
          payload: chunk.toString("base64"),
        },
      };

      ws.send(JSON.stringify(mediaMessage), (error) => {
        if (error) {
          console.error(`[${new Date().toISOString()}] Error sending chunk:`, error);
          synthesisEncounteredError = error; // Record the error
          isSending = false;
          chunkQueue = []; // Stop trying to send
          // Mark all as "completed" on error to trigger finalization/rejection check
           if (sentencesCompleted < sentences.length) {
               sentencesCompleted = sentences.length;
           }
          checkAndFinalize();
          return;
        }

        // Schedule next send if still sending and WS open
        if (isSending && ws.readyState === WebSocket.OPEN) {
          setTimeout(sendNextChunk, 40); // Approx 40ms for 320 bytes @ 8kHz
        } else if (ws.readyState !== WebSocket.OPEN) {
             console.warn(`[${new Date().toISOString()}] WebSocket closed after successful send, before scheduling next.`);
             synthesisEncounteredError = new Error("WebSocket closed during streaming");
             isSending = false;
             chunkQueue = [];
             if (sentencesCompleted < sentences.length) {
                sentencesCompleted = sentences.length;
             }
             checkAndFinalize();
        }
      });
    };

    // Helper: send a final mark event (Unchanged)
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

    // --- Loop through sentences and synthesize sequentially ---
    try {
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        if (ws.readyState !== WebSocket.OPEN) {
           throw new Error("WebSocket closed before processing next sentence");
        }
        if(synthesisEncounteredError) {
            console.warn(`[${new Date().toISOString()}] Skipping sentence ${i+1} due to previous error.`);
            continue; // Don't process if an error already occurred
        }

        console.log(`[${new Date().toISOString()}] Synthesizing sentence ${i + 1}/${sentences.length}: "${sentence.substring(0,50)}..."`);
        const ssml = createSsml(sentence, voiceShortName);

        // Check for user interruption before processing each sentence
        if (userInterrupted && userInterrupted.value) {
          console.log(`[${new Date().toISOString()}] User interruption detected before sentence ${i + 1}, stopping Azure TTS`);
          synthesisEncounteredError = new Error("User interrupted TTS playback");
          break;
        }

        // Synthesize one sentence - Use a Promise to wait for its completion/failure
        await new Promise((sentenceResolve, sentenceReject) => {
          // Create a NEW synthesizer for this sentence
          const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
          let sentenceCompletedOrFailed = false;

          const cleanupSentence = (error = null) => {
              if (!sentenceCompletedOrFailed) {
                  sentenceCompletedOrFailed = true;
                  synthesizer.close(); // Ensure synthesizer resource is released
                  if (error) {
                    sentenceReject(error); // Reject this sentence's promise
                  } else {
                    sentenceResolve(); // Resolve this sentence's promise
                  }
              }
          };

          // Fired as chunks of audio become available (uses shared enqueue)
          synthesizer.synthesizing = (s, e) => {
             if (sentenceCompletedOrFailed) return;
             
             // Check for user interruption during synthesis
             if (userInterrupted && userInterrupted.value) {
               console.log(`[${new Date().toISOString()}] User interruption detected during synthesis of sentence ${i + 1}, stopping`);
               synthesisEncounteredError = new Error("User interrupted TTS playback");
               cleanupSentence(synthesisEncounteredError);
               return;
             }
             
             if (e.result.reason === sdk.ResultReason.SynthesizingAudio) {
              const audioChunk = Buffer.from(e.result.audioData);
              // Record immediately
              if (callRecorder && audioChunk.length > 0) {
                  callRecorder.recordOutgoing(audioChunk);
              }
              // Enqueue for sending
              enqueueAudioChunks(audioChunk);
            }
          };

          // Fired when this sentence's TTS is complete
          synthesizer.synthesisCompleted = (s, e) => {
            if (sentenceCompletedOrFailed) return;
            console.log(`[${new Date().toISOString()}] Sentence ${i + 1} synthesis completed.`);
            sentencesCompleted++; // Increment overall completed count
            cleanupSentence(); // Release resources and resolve sentence promise
            // Check if we can finalize *after* this sentence is done
            // Crucial if this was the last sentence AND queue might be empty now
             if (!isSending && chunkQueue.length === 0) {
                 checkAndFinalize();
             }
          };

          // Fired if there's an error for this sentence
          synthesizer.synthesisCanceled = (s, e) => {
            if (sentenceCompletedOrFailed) return;
            const errorMsg = `Sentence ${i+1} synthesis canceled: ${e.reason}${e.errorDetails ? ` (${e.errorDetails})` : ''}`;
            console.error(`[${new Date().toISOString()}] ${errorMsg}`);
            sentencesCompleted++; // Mark as 'done' even on error to allow finalization check
            cleanupSentence(new Error(errorMsg)); // Reject sentence promise
          };

          // Start synthesis for the current sentence
          synthesizer.speakSsmlAsync(
            ssml,
            (result) => {
              // This callback signals the start request was accepted or failed early.
              if (result.reason === sdk.ResultReason.Canceled) {
                 // If cancelled immediately, error should be in synthesisCanceled event
                 // We don't reject here, let the event handler do it.
              } else if (result.reason === sdk.ResultReason.SynthesizingAudioStarted) {
                 console.log(`[${new Date().toISOString()}] Sentence ${i + 1} synthesis started.`);
              }
            },
            (error) => {
              // This callback handles errors *before* synthesis even starts (e.g., connection issues)
              if (sentenceCompletedOrFailed) return;
              const errorMsg = `Sentence ${i+1} synthesis error before start: ${error}`;
              console.error(`[${new Date().toISOString()}] ${errorMsg}`);
              sentencesCompleted++; // Mark as 'done'
              cleanupSentence(new Error(errorMsg)); // Reject sentence promise
            }
          );
        }).catch(err => {
            // Catch rejection from the sentence promise
            console.error(`[${new Date().toISOString()}] Caught error from sentence ${i+1}:`, err.message);
            synthesisEncounteredError = synthesisEncounteredError || err; // Record the first error encountered
            // Don't re-throw, allow loop to continue checking (to potentially skip remaining)
            // or proceed to finally block. The error is recorded.
            throw err;
        });

        // If an error occurred during the awaited promise, break the loop
        if (synthesisEncounteredError) {
             console.warn(`[${new Date().toISOString()}] Stopping sentence processing due to error.`);
             break;
        }
      } // End for loop

      // If loop completed without errors, we still need to check finalization
      // (in case the last chunks are still sending)
       if (!synthesisEncounteredError && !isSending && chunkQueue.length === 0) {
           checkAndFinalize();
       }

    } catch (error) {
      // Catch errors from the loop itself (e.g., WS closed check) or re-thrown errors
      console.error(`[${new Date().toISOString()}] Error in sentence processing loop:`, error.message);
      synthesisEncounteredError = synthesisEncounteredError || error;
      // Ensure finalization check happens even if loop fails
      if (sentencesCompleted < sentences.length) sentencesCompleted = sentences.length; // Mark all as "done" on error
      if (!isSending) {
        checkAndFinalize(); // Trigger rejection via checkAndFinalize
      }
    }
    // The main promise resolves/rejects within checkAndFinalize or if an early error is caught by it
  });
}

module.exports = { streamTTS };
