const axios = require('axios');
const Agent = require('../models/Agent');
const Activity = require('../models/Activity');
const Contact = require('../models/Contact');
const ConversationState = require('../services/ConversationState');
const OpenAIService = require('../services/openAI');
const GeminiService = require('../services/geminiService');
const WebSocket = require("ws");

async function handleCallStopEvent(config, callStartTime, conversationHistory, wss, ws, timer) {
    console.log(`[${timer()}] Media WS: Stop event received, ending stream.`);
    console.log("Call ended, preparing to process and send data.");

    // Retrieve the related `Activity` based on agent and contact
    const activityId = config.activityId;
    if (!activityId) {
        console.error("Activity ID is missing in custom parameters.");
        return;
    }
    const activity = await Activity.findById(activityId);

    if (!activity) {
        console.error("Activity not found.");
        return;
    }

    // --- Credit Calculation Start ---
    let totalCreditsUsed = 0;
    const creditBreakdown = [];
    // TODO: Implement logic to check agent's TTS configuration (e.g., config.ttsProvider === 'elevenlabs')
    // const isPremiumVoice = false; // Placeholder for premium voice check

    conversationHistory.forEach(entry => {
        console.log(entry, "entry");
        if (entry.speaker === 'agent') {
            // let creditsForTurn = isPremiumVoice ? 1.5 : 1; // Future logic for premium voice
            let creditsForTurn = 1; // Standard 1 credit per agent turn for now
            totalCreditsUsed += creditsForTurn;
            creditBreakdown.push({
                reason: 'agent_response', // TODO: Differentiate reason if needed (e.g., 'premium_agent_response')
                credits: creditsForTurn,
                timestamp: entry.timestamp || new Date() // Use entry timestamp if available
            });
        }
    });
    console.log(`[${timer()}] Calculated credits for activity ${activityId}: ${totalCreditsUsed}`);
    // --- Credit Calculation End ---

    const contact = await Contact.findById(activity.contact);
   

    // Generate a summary using Gemini based on the conversation history
    try {
        const formattedConversationHistory = conversationHistory
            .map(entry => {
                const speaker = entry.speaker === 'agent' ? 'Agent' : 'User';
                return `${speaker}: ${entry.text}`;
            })
            .join('\n');

        const summary = await GeminiService.handleStream(formattedConversationHistory, {
            temperature: 0.5,
            maxTokens: 1000,
            systemPrompt: `Analyze the conversation and return a JSON object with the following structure:
{
    "conversationPoints": [
        "Point 1 describing what happened in the conversation",
        "Point 2 describing what happened in the conversation",
        // ... more points as needed
    ],
    "nextSteps": [
        "Action item 1 that needs to be taken",
        "Action item 2 that needs to be taken",
        // ... more next steps as needed
    ]
}

Keep each point concise and action-oriented. If the conversation is incomplete or unclear, include appropriate next steps like "Follow up to complete the discussion" or "Reschedule the call". If the conversation appears to have ended abruptly (incomplete), mention that in the next steps. Return only the JSON object, no additional text.`
        });
        console.log(conversationHistory, "conversationHistory");
        activity.conversationSummary = summary;
        activity.status = 'completed';
        activity.conversationTranscription = conversationHistory;
        activity.callDuration = ((Date.now() - callStartTime) / 1000).toFixed(2); // Set call duration in seconds
// Save the breakdown        
        activity.creditsUsed = totalCreditsUsed; // Save total calculated credits
        activity.creditBreakdown = creditBreakdown; 
        await activity.save();

        console.log("Summary generated and activity updated successfully with credit info.");
    } catch (error) {
        console.error("Error generating summary with Gemini:", error);
    }

    const conversationState = await ConversationState.getInstance(config.conversationId);
    const memoryState = conversationState.getMemoryState();
    // Prepare call details
    const callDetails = {
        conversationId: config.conversationId,
        conversationHistory: conversationHistory,
        summary: activity.summary,
        memoryState: memoryState,
        startTime: callStartTime.toISOString(),
        endTime: new Date().toISOString(),
        duration: `${activity.callDuration} seconds`,
        callType: activity.callType,
        status: activity.status,
        contact: {
            name: `${contact?.firstName} ${contact?.lastName}`,
            email: contact?.email,
            phoneNumber: contact?.phoneNumber,
            country: contact?.country
        },
        config:config
    };

    const agent = await Agent.findById(activity.agent);
    if (agent) {
        await sendToWebhook(agent, callDetails);
    } else {
        console.error("Agent not found.");
    }

    // Function to send data to the webhook
    async function sendToWebhook(agent, data) {
        if (!agent.webhook || !agent.webhook.endpoint) {
            console.error("Webhook not configured for this agent.");
            return;
        }

        try {
            const response = await axios({
                method: agent.webhook.method,
                url: agent.webhook.endpoint,
                data: {
                    event: agent.webhook.event,
                    payload: data
                }
            });
            console.log("Data sent to webhook successfully:", response.data);
        } catch (error) {
            console.error("Error sending data to webhook:", error);
        }
    }

    // Send conversation summary to WebSocket clients
    async function sendConversationSummary() {
        console.log("Sending conversation summary to clients", conversationHistory);
        if (conversationHistory) {
            // // Get conversation state
            // const conversationState = await ConversationState.getInstance(config.conversationId);
            // const memoryState = conversationState.getMemoryState();

            // Broadcast summary and memory state to clients
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN && client !== ws) {
                    client.send(JSON.stringify({
                        event: "summary",
                        text: activity.summary,
                        memory: memoryState,
                        config:config
                    }));
                }
            });
        }
    }

    // await sendConversationSummary();
}

module.exports = handleCallStopEvent;
