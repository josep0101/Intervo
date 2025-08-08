const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { randomBytes } = require('crypto'); // For unique temp directories
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3"); // Import AWS SDK v3 S3 client

const execPromise = promisify(exec);

// --- Configuration ---
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg'; // Allow overriding ffmpeg path via environment variable
const SAMPLE_RATE = 8000; // 8kHz for mu-law
const COALESCE_GAP_MS = 150; // Max gap between chunks to consider them consecutive (milliseconds)

class CallRecorder {
    constructor(baseFilename, agentId, recordingsDir = null) {
        // console.log("[CallRecorder] Constructor called. Base filename:", baseFilename, "Agent ID:", agentId);
        if (!baseFilename) {
            console.error("[CallRecorder] ERROR: Base filename is required.");
            throw new Error("CallRecorder requires a base filename.");
        }
        if (!agentId) {
            console.warn("[CallRecorder] WARNING: Agent ID not provided to constructor. S3 key will not include agent folder.");
            // Decide if this should be an error or just a warning
            // throw new Error("CallRecorder requires an agent ID.");
        }

        this.baseFilename = baseFilename;
        this.agentId = agentId; // Store agentId
        this.recordingsDir = recordingsDir || path.join(__dirname, '..', 'recordings');
        this.tempDir = null; // Created in startRecording

        this.finalMixedPath = path.join(this.recordingsDir, `${this.baseFilename}_mixed.mp3`);

        // In-memory storage for timestamped chunks
        this.incomingChunks = []; // { timestamp: number, chunk: Buffer }
        this.outgoingChunks = []; // { timestamp: number, chunk: Buffer }

        this.callStartTime = null;
        this.callEndTime = null;
        this.isRecording = false;
        this.isIncomingPaused = false; // Flag to pause only incoming recording

        // --- S3 Client Initialization ---
        this.s3Client = null;
        this.uploadBucket = process.env.HETZNER_STORAGE_BUCKET || null;
        this.s3Endpoint = process.env.HETZNER_STORAGE_ENDPOINT || null;
        this.s3Region = process.env.HETZNER_STORAGE_REGION || null;

        if (this.uploadBucket && this.s3Endpoint && this.s3Region &&
            process.env.HETZNER_STORAGE_ACCESS_KEY_ID && process.env.HETZNER_STORAGE_SECRET_ACCESS_KEY) {
            try {
                this.s3Client = new S3Client({
                    endpoint: this.s3Endpoint,
                    region: this.s3Region,
                    credentials: {
                        accessKeyId: process.env.HETZNER_STORAGE_ACCESS_KEY_ID,
                        secretAccessKey: process.env.HETZNER_STORAGE_SECRET_ACCESS_KEY,
                    },
                    forcePathStyle: true, // Important for S3-compatible storage
                });
                // console.log(`[CallRecorder] S3 Upload configured for bucket: ${this.uploadBucket}`);
            } catch (s3Error) {
                 console.error("[CallRecorder] ERROR initializing S3 client:", s3Error);
                 this.s3Client = null; // Ensure it's null if init fails
            }
        } else {
            // console.log("[CallRecorder] S3 environment variables not fully configured. Upload will be skipped.");
        }
        // --- End S3 Client Initialization ---
    }

    _ensureDirectoryExists(dirPath) {
        try {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                // console.log(`[CallRecorder] Created directory: ${dirPath}`);
            }
        } catch (error) {
             console.error(`[CallRecorder] ERROR creating directory ${dirPath}:`, error);
             throw error;
        }
    }

    _cleanupExistingFinalFile() {
        if (fs.existsSync(this.finalMixedPath)) {
             // console.log(`[CallRecorder] Deleting existing final file: ${this.finalMixedPath}`);
            try {
                fs.unlinkSync(this.finalMixedPath);
            } catch (err) {
                console.error(`[CallRecorder] WARNING: Error deleting existing final file ${this.finalMixedPath}:`, err);
            }
        }
    }

    async startRecording() {
        // console.log("[CallRecorder] Attempting to start recording...");
        try {
            this.callStartTime = Date.now();
            // console.log(`[CallRecorder] Call start time set: ${this.callStartTime} (Timestamp: ${new Date(this.callStartTime).toISOString()})`);
            this.incomingChunks = [];
            this.outgoingChunks = [];

            this._ensureDirectoryExists(this.recordingsDir);
            this._cleanupExistingFinalFile();

            // Create temp directory
            const tempDirPrefix = path.join(this.recordingsDir, `_temp_${this.baseFilename}_`);
            try {
                this.tempDir = await fs.promises.mkdtemp(tempDirPrefix);
                // console.log(`[CallRecorder] Created temporary directory: ${this.tempDir}`);
            } catch (mkdtempError) {
                 console.error(`[CallRecorder] ERROR creating temporary directory (prefix ${tempDirPrefix}). Check permissions for ${this.recordingsDir}.`);
                 throw mkdtempError;
            }

            this.isRecording = true;
            // console.log(`[CallRecorder] Successfully started timestamp-based recording. Temp Dir: ${this.tempDir}`);

        } catch (error) {
            console.error('[CallRecorder] ERROR in startRecording:', error);
            this.isRecording = false;
            await this._cleanupTempDir(); // Attempt cleanup if start failed
            throw error;
        }
    }

    recordIncoming(audioChunk) {
        const now = Date.now(); // Capture timestamp immediately
        if (this.isRecording && audioChunk && audioChunk.length > 0 && !this.isIncomingPaused) {
            // --- Add Detailed Log ---
            const timeSinceStart = this.callStartTime ? ((now - this.callStartTime) / 1000).toFixed(2) : 'N/A';
            // // console.log(`[Recorder IN] Time: ${timeSinceStart}s, Size: ${audioChunk.length} bytes`);
            // --- End Log ---
            this.incomingChunks.push({ timestamp: now, chunk: audioChunk });
        } else if (this.isRecording && audioChunk && audioChunk.length === 0) {
             // Log zero-length chunks specifically
             const timeSinceStart = this.callStartTime ? ((now - this.callStartTime) / 1000).toFixed(2) : 'N/A';
            //  // console.log(`[Recorder IN] Time: ${timeSinceStart}s, Received ZERO-LENGTH chunk`);
        } else if (!this.isRecording) {
             // console.warn("[CallRecorder] WARNING: Tried to record incoming chunk while not recording."); // Keep this less verbose maybe
        }
    }

    recordOutgoing(audioChunk) {
        const now = Date.now(); // Capture timestamp immediately
        if (this.isRecording && audioChunk && audioChunk.length > 0) {
             // --- Add Detailed Log ---
             const timeSinceStart = this.callStartTime ? ((now - this.callStartTime) / 1000).toFixed(2) : 'N/A';
            //  // console.log(`[Recorder OUT] Time: ${timeSinceStart}s, Size: ${audioChunk.length} bytes`);
             // --- End Log ---
            this.outgoingChunks.push({ timestamp: now, chunk: audioChunk });
        } else if (this.isRecording && audioChunk && audioChunk.length === 0) {
             // Log zero-length chunks specifically
             const timeSinceStart = this.callStartTime ? ((now - this.callStartTime) / 1000).toFixed(2) : 'N/A';
            //  // console.log(`[Recorder OUT] Time: ${timeSinceStart}s, Received ZERO-LENGTH chunk`);
        } else if (!this.isRecording) {
             // console.warn("[CallRecorder] WARNING: Tried to record outgoing chunk while not recording."); // Keep this less verbose maybe
        }
    }

    // --- Methods to control incoming pause state ---
    pauseIncoming() {
        // console.log("[CallRecorder] Pausing incoming audio recording.");
        this.isIncomingPaused = true;
    }

    resumeIncoming() {
        // console.log("[CallRecorder] Resuming incoming audio recording.");
        this.isIncomingPaused = false;
    }

    // --- stopAndMix and helpers ---

    /**
     * Calculates the actual end time of recorded audio based on chunk timestamps and lengths.
     * @returns {number} The end time in milliseconds relative to callStartTime, or 0 if no chunks.
     */
    _calculateActualAudioEndTimeMs() {
        let maxEndTimeMs = 0;
        const calculateChunkEndTime = (chunk) => {
             if (!this.callStartTime || !chunk || !chunk.timestamp || !chunk.chunk) return 0;
             const startTimeMs = Math.max(0, chunk.timestamp - this.callStartTime);
             const durationMs = (chunk.chunk.length / (SAMPLE_RATE / 1000)); // 8000 samples/sec -> 8 samples/ms
             return startTimeMs + durationMs;
        };

        this.incomingChunks.forEach(chunk => {
            maxEndTimeMs = Math.max(maxEndTimeMs, calculateChunkEndTime(chunk));
        });
        this.outgoingChunks.forEach(chunk => {
             maxEndTimeMs = Math.max(maxEndTimeMs, calculateChunkEndTime(chunk));
        });

        // console.log(`[CallRecorder] Calculated Max Audio End Time: ${maxEndTimeMs.toFixed(2)} ms`);
        return maxEndTimeMs;
    }

    /**
     * Stops recording, mixes the audio, uploads to S3 if configured, cleans up.
     * @param {boolean} deleteTempFiles - Whether to delete the temporary .ulaw files.
     * @returns {Promise<{url: string|null, durationSeconds: number}>} Resolves with S3 URL and duration, or null URL if upload fails/skipped.
     */
    async stopAndMix(deleteTempFiles = true) {
        // console.log("[CallRecorder] Attempting to stop and mix...");
        if (!this.isRecording && this.incomingChunks.length === 0 && this.outgoingChunks.length === 0) {
            console.warn("[CallRecorder] stopAndMix called but not recording and no chunks recorded.");
            return Promise.reject(new Error("No recording data to process."));
        }
        this.isRecording = false;
        this.callEndTime = Date.now();
        if (!this.callStartTime) {
             console.error("[CallRecorder] ERROR: callStartTime is not set!");
             await this._cleanupTempDir();
             return Promise.reject(new Error("Call start time missing."));
        }
         // Temp dir check needs to happen before calculating duration from chunks
         if (!this.tempDir || !fs.existsSync(this.tempDir)) {
             console.error("[CallRecorder] ERROR: Temporary directory missing!");
             return Promise.reject(new Error("Temporary directory missing."));
        }

        // Calculate actual duration BEFORE mixing/upload attempts
        const actualAudioEndTimeMs = this._calculateActualAudioEndTimeMs();
        const actualDurationSeconds = parseFloat((actualAudioEndTimeMs / 1000).toFixed(3)); // Keep precision

        const totalDurationSeconds = (this.callEndTime - this.callStartTime) / 1000; // Keep for logging/silent case if needed
        // console.log(`[CallRecorder] Recording stopped. Total processing duration: ${totalDurationSeconds.toFixed(2)}s. Actual audio duration: ${actualDurationSeconds}s`);

         // Handle case where no actual audio was recorded early
         if (this.incomingChunks.length === 0 && this.outgoingChunks.length === 0) {
              console.warn("[CallRecorder] No audio chunks recorded, skipping mix/upload.");
              await this._cleanupTempDir(); // Still cleanup if temp dir was created
              return { url: null, durationSeconds: 0 }; // Return 0 duration, no URL
         }

        let finalResultUrl = null;
        let keepLocalFileOnError = false;

        try {
            // --- Step 1: Coalesce and Write Temp Files ---
            // console.log("[CallRecorder] Step 1: Coalescing and writing temporary chunk files...");
            const incomingFiles = await this._writeCoalescedChunks(this.incomingChunks, 'in');
            const outgoingFiles = await this._writeCoalescedChunks(this.outgoingChunks, 'out');
            // console.log(`[CallRecorder] Wrote ${incomingFiles.length} coalesced incoming files.`);
            // console.log(`[CallRecorder] DEBUG: Incoming file details:`, JSON.stringify(incomingFiles));
            // console.log(`[CallRecorder] Wrote ${outgoingFiles.length} coalesced outgoing files.`);
            // console.log(`[CallRecorder] DEBUG: Outgoing file details:`, JSON.stringify(outgoingFiles));

             // Check if coalesced files exist (could be empty chunks were recorded)
             if (incomingFiles.length === 0 && outgoingFiles.length === 0) {
                 console.warn("[CallRecorder] No non-empty audio segments found after coalescing, skipping mix/upload.");
                 // Still return calculated duration
                 // No throw needed, just proceed to finally for cleanup
                 return { url: null, durationSeconds: actualDurationSeconds };
             }

            // --- Step 2: Mix Audio Locally ---
             // console.log("[CallRecorder] Step 2: Constructing and running ffmpeg command..."); // Removed strategy mention
             const ffmpegCommand = this._buildRevisedFiltergraphCommand(incomingFiles, outgoingFiles, totalDurationSeconds); // Pass totalDuration for silent case only
             await this._runFFmpegCommand(ffmpegCommand, "ffmpeg revised filtergraph mix");
             // console.log(`[CallRecorder] Successfully mixed audio locally to: ${this.finalMixedPath}`);


            // --- Step 3: Upload to S3 (if configured) ---
            if (this.s3Client && this.uploadBucket) {
                // console.log("[CallRecorder] Step 3: Attempting to upload to S3...");
                const fileStream = fs.createReadStream(this.finalMixedPath);
                const objectKey = this.agentId ? `recordings/${this.agentId}/${this.baseFilename}.mp3` : `recordings/${this.baseFilename}.mp3`;
                // console.log(`[CallRecorder] Using S3 object key: ${objectKey}`);
                const putObjectParams = { Bucket: this.uploadBucket, Key: objectKey, Body: fileStream, ContentType: 'audio/mpeg' };
                try {
                    const command = new PutObjectCommand(putObjectParams);
                    await this.s3Client.send(command);
                    finalResultUrl = `${this.s3Endpoint}/${this.uploadBucket}/${objectKey}`;
                    // console.log(`[CallRecorder] Successfully uploaded recording to ${finalResultUrl}`);
                    try {
                        await fs.promises.unlink(this.finalMixedPath);
                        // console.log(`[CallRecorder] Deleted local mixed file: ${this.finalMixedPath}`);
                    } catch (unlinkErr) {
                        console.error(`[CallRecorder] WARNING: Failed to delete local mixed file ${this.finalMixedPath} after upload:`, unlinkErr);
                    }
                } catch (uploadError) {
                    console.error(`[CallRecorder] ERROR uploading recording to S3:`, uploadError);
                    keepLocalFileOnError = true;
                    finalResultUrl = null;
                }
            } else {
                 // console.log("[CallRecorder] S3 upload skipped (not configured).");
                 finalResultUrl = null;
                 keepLocalFileOnError = true;
            }

            // Resolve with the object containing URL and calculated duration
            return { url: finalResultUrl, durationSeconds: actualDurationSeconds };

        } catch (error) {
            console.error(`[CallRecorder] ERROR during stopAndMix process:`, error);
            deleteTempFiles = false;
            keepLocalFileOnError = true;
            throw new Error(`Mixing/Processing failed. Check logs. Original error: ${error.message}`);
        } finally {
            // console.log("[CallRecorder] Entering stopAndMix finally block for cleanup.");
            if (deleteTempFiles) {
                await this._cleanupTempDir();
            } else if (this.tempDir) {
                // console.log(`[CallRecorder] Skipping cleanup of temporary directory (deleteTempFiles=false): ${this.tempDir}`);
            }
             if (keepLocalFileOnError && fs.existsSync(this.finalMixedPath)) {
                // console.log(`[CallRecorder] Keeping local mixed file due to error or skipped upload: ${this.finalMixedPath}`);
            }
        }
    }

    /**
     * Coalesces chunks and writes them to temp files.
     * Returns an array: [{ filePath: string, startTimeMs: number }]
     */
    async _writeCoalescedChunks(chunks, streamType) {
        if (chunks.length === 0) return [];

        const coalescedFiles = [];
        if (!this.tempDir) throw new Error("_writeCoalescedChunks called without valid tempDir");

        chunks.sort((a, b) => a.timestamp - b.timestamp);

        let currentBuffer = null;
        let currentStartTime = 0;
        let lastChunkEndTime = 0;
        let fileIndex = 0;

        for (let i = 0; i < chunks.length; i++) {
            const chunkData = chunks[i];
            const chunkStartTime = chunkData.timestamp;

            if (currentBuffer === null) {
                // Start of a new coalesced file
                currentBuffer = chunkData.chunk;
                currentStartTime = chunkStartTime;
                lastChunkEndTime = chunkStartTime + (chunkData.chunk.length / (SAMPLE_RATE / 1000));
                 // console.log(`[CallRecorder DEBUG _writeCoalescedChunks] Starting new buffer for ${streamType}. First chunk timestamp: ${chunkStartTime} (Relative: ${Math.max(0, chunkStartTime - this.callStartTime)}ms)`);
            } else {
                // Check gap since the end of the last chunk in the current buffer
                const gap = chunkStartTime - lastChunkEndTime;

                if (gap <= COALESCE_GAP_MS) {
                    // Append to current buffer
                    currentBuffer = Buffer.concat([currentBuffer, chunkData.chunk]);
                    lastChunkEndTime = chunkStartTime + (chunkData.chunk.length / (SAMPLE_RATE / 1000));
                } else {
                    // Gap is too large, write out the previous buffer
                    const filePath = path.join(this.tempDir, `coalesced_${streamType}_${fileIndex++}.ulaw`);
                    const calculatedStartTimeMs = Math.max(0, currentStartTime - this.callStartTime);
                    await fs.promises.writeFile(filePath, currentBuffer);
                    coalescedFiles.push({
                        filePath: filePath,
                        startTimeMs: calculatedStartTimeMs
                    });
                     // console.log(`[CallRecorder DEBUG _writeCoalescedChunks] Wrote coalesced file ${filePath}. StartTimeMs: ${calculatedStartTimeMs}ms. Gap was ${gap}ms.`);

                    // Start new buffer
                    currentBuffer = chunkData.chunk;
                    currentStartTime = chunkStartTime;
                    lastChunkEndTime = chunkStartTime + (chunkData.chunk.length / (SAMPLE_RATE / 1000));
                     // console.log(`[CallRecorder DEBUG _writeCoalescedChunks] Starting new buffer for ${streamType} after gap. First chunk timestamp: ${chunkStartTime} (Relative: ${Math.max(0, chunkStartTime - this.callStartTime)}ms)`);
                }
            }
        }

        // Write the last remaining buffer
        if (currentBuffer) {
            const filePath = path.join(this.tempDir, `coalesced_${streamType}_${fileIndex++}.ulaw`);
             const calculatedStartTimeMs = Math.max(0, currentStartTime - this.callStartTime);
            await fs.promises.writeFile(filePath, currentBuffer);
            coalescedFiles.push({
                filePath: filePath,
                startTimeMs: calculatedStartTimeMs
             });
              // console.log(`[CallRecorder DEBUG _writeCoalescedChunks] Wrote FINAL coalesced file ${filePath}. StartTimeMs: ${calculatedStartTimeMs}ms.`);
        }

        return coalescedFiles;
    }

    /**
     * Builds the complex ffmpeg command using adelay and concat filters.
     */
    _buildRevisedFiltergraphCommand(inFiles, outFiles, totalDurationSeconds) {
        const inputs = [];
        const filterComplexParts = [];
        const streamsToMix = [];
        let currentInputIndex = 0;

        // Process Incoming Files
        inFiles.forEach((fileInfo) => {
            const streamIndex = currentInputIndex++;
            inputs.push(`-f mulaw -ar ${SAMPLE_RATE} -i "${fileInfo.filePath}"`);
            const delay = fileInfo.startTimeMs;
            const streamName = `in_${streamIndex}_delayed`;
            // Apply adelay only
            filterComplexParts.push(`[${streamIndex}:a]adelay=${delay}|${delay}[${streamName}]`);
            streamsToMix.push(`[${streamName}]`);
        });

        // Process Outgoing Files
        outFiles.forEach((fileInfo) => {
            const streamIndex = currentInputIndex++;
            inputs.push(`-f mulaw -ar ${SAMPLE_RATE} -i "${fileInfo.filePath}"`);
            const delay = fileInfo.startTimeMs;
            const streamName = `out_${streamIndex}_delayed`;
            // Apply adelay only
            filterComplexParts.push(`[${streamIndex}:a]adelay=${delay}|${delay}[${streamName}]`);
            streamsToMix.push(`[${streamName}]`);
        });

        // Check if there are any streams to mix
        if (streamsToMix.length === 0) {
            console.warn("[CallRecorder] No streams to mix after processing files. Creating silent output.");
            // Create a silent output of the original calculated total duration
            const command = [
                 FFMPEG_PATH,
                 '-loglevel warning',
                 '-f lavfi -i anullsrc=channel_layout=mono:sample_rate=' + SAMPLE_RATE,
                 '-t', totalDurationSeconds.toFixed(3), // Use calculated duration for silent file
                 '-q:a 2',
                 '-y', `"${this.finalMixedPath}"`
            ].join(' ');
            // console.log("[CallRecorder] Generated silent ffmpeg command:", command);
             return command;
        }


        // Mix all individually delayed streams
        // Use duration=longest to fit the actual audio content
        filterComplexParts.push(`${streamsToMix.join('')}amix=inputs=${streamsToMix.length}:duration=longest:dropout_transition=0[mixout]`);

        // Build the full command
        const filterComplexString = filterComplexParts.join('; ');
        const command = [
            FFMPEG_PATH,
            '-loglevel warning',
            ...inputs,
            '-filter_complex', `"${filterComplexString}"`,
            '-map', '[mixout]',
            '-q:a', '2',
            '-y',
            `"${this.finalMixedPath}"`
        ].join(' ');

        // console.log("[CallRecorder] Generated revised ffmpeg command (duration=longest):", command);
        if (process.env.DEBUG_FFMPEG_COMMAND) {
            // console.log("[CallRecorder DEBUG] Full revised ffmpeg command (duration=longest):", command);
        }
        return command;
    }


    async _runFFmpegCommand(command, stepName) {
         // console.log(`[CallRecorder] Running ${stepName}... (command length: ${command.length})`);
         // Avoid logging extremely long commands unless debugging
         // if (process.env.DEBUG_FFMPEG_COMMAND) // console.log(command); // Command is logged before calling now
          try {
              const { stdout, stderr } = await execPromise(command, { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }); // 5 min timeout, 10MB buffer for stdio
              // Log stderr verbosely during debugging
              if (stderr) {
                 if (process.env.VERBOSE_FFMPEG || process.env.DEBUG_FFMPEG_COMMAND) { // Log if verbose or debug flags set
                      // console.log(`[CallRecorder] ${stepName} stderr (Success):${stderr}`);
                 } else {
                      // console.log(`[CallRecorder] ${stepName} completed with stderr output (set VERBOSE_FFMPEG=true to view).`);
                 }
              }
              if (stdout && process.env.VERBOSE_FFMPEG) // console.log(`[CallRecorder] ${stepName} stdout (Success):${stdout}`);
              // console.log(`[CallRecorder] ${stepName} completed successfully.`);
              return { stdout, stderr };
          } catch (error) {
              console.error(`[CallRecorder] ERROR during ${stepName}.`);
              console.error(`[CallRecorder] Failed command was (potentially truncated):
 ${command.substring(0, 1000)}...`);
              error.message = `${stepName} failed: ${error.message}`;
              if(error.stderr) console.error(`[CallRecorder] FFmpeg stderr: ${error.stderr}`);
              if(error.stdout) console.error(`[CallRecorder] FFmpeg stdout (Error): ${error.stdout}`); // Log stdout on error too
              if(error.signal) console.error(`[CallRecorder] Process killed with signal: ${error.signal}`);
              if(error.code) console.error(`[CallRecorder] Exit code: ${error.code}`);
              throw error;
          }
     }


    async _cleanupTempDir() {
        if (this.tempDir && fs.existsSync(this.tempDir)) {
            // console.log(`[CallRecorder] Cleaning up temporary directory: ${this.tempDir}`);
            try {
                 await fs.promises.rm(this.tempDir, { recursive: true, force: true, maxRetries: 3 });
                // console.log(`[CallRecorder] Temporary directory cleaned up.`);
            } catch (err) {
                console.error(`[CallRecorder] WARNING: Error cleaning up temporary directory ${this.tempDir}:`, err);
            } finally {
                this.tempDir = null;
            }
        }
    }
}

module.exports = CallRecorder; 