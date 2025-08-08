const WebSocket = require("ws");
const Agent = require('./models/Agent');
const handleTwilioConnection = require('./handlers/twilioHandler');
const handleClientConnection = require('./handlers/clientHandler');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Get the model for the published agents collection
const AgentPublishedModel = mongoose.model('AgentPublished'); // Assumes already registered

module.exports = function (server) {
  const wss = new WebSocket.Server({ server });
  
  // Add a Map to store agent rooms
  const agentRooms = new Map();

  wss.on("connection", (ws, req) => {
    console.log("New WebSocket connection");
    let agentId = null;
    let widgetId = null;
    let conversationMode = "call";
    let handlerInitialized = false;

    // Get connection type from headers and URL parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const type = req.headers['type'] || url.searchParams.get('type');
    console.log("Connection type:", type || "Twilio");

    // Set up the message handler first
    ws.on('message', async (message) => {
      try {
        const msg = JSON.parse(message);
        if (msg.event === 'start' && !handlerInitialized) {
          console.log("Start message received with parameters:", msg.start, type);
          //These are the essential custom parameters
          agentId = msg.start.customParameters['agent-id'] || msg.start.customParameters['agentId'];
          widgetId = msg.start.customParameters['widgetId'];
          conversationMode = msg.start.customParameters['mode'];
          const conversationId = msg.start.customParameters['conversation-id'] || msg.start.customParameters['conversationId'] || uuidv4();

          
          if(!agentId && widgetId){
            // Find the PUBLISHED agent by widgetId
            console.log(`Socket: No agentId provided, looking up published agent by widgetId: ${widgetId}`);
            const agent = await AgentPublishedModel.findOne({ widgetId: widgetId });
            if(agent){
              agentId = agent._id?.toString();
              console.log(`Socket: Found published agentId: ${agentId} for widgetId: ${widgetId}`);
            } else {
              console.error(`Socket: Could not find published agent for widgetId: ${widgetId}. Closing connection.`);
              ws.close(1011, "Published agent configuration not found for widget ID.");
              return; // Stop further processing
            }
          }
          // Add this connection to the appropriate room
          if (agentId) {
            // Create unique room key combining agentId and conversationId
            const roomKey = `${agentId}-${conversationId}`;
            console.log(`${type || "Twilio"} connection - roomKey: ${roomKey}, agentId: ${agentId}, conversationId: ${conversationId}`)

            if (!agentRooms.has(roomKey)) {
              console.log("Creating new agent room for:", roomKey);
              agentRooms.set(roomKey, new Set());
            }
            agentRooms.get(roomKey).add(ws);
            
            // Store the roomKey on the WebSocket for cleanup
            ws.roomKey = roomKey;
            
            // Initialize the handlers only once
            console.log("Setting up handlers, agentRooms size:", agentRooms.size);

            if (type === "client") {
              const connectionSuccess = handleClientConnection(ws, req, wss, agentRooms);
              if (!connectionSuccess) {
                console.log("Client connection handler failed, closing connection");
                ws.close();
                return;
              }

              console.log("*****conversationMode****", conversationMode)

              if(conversationMode==="chat"){

                //i want to transform data.start.customParameters by passing it
                handleTwilioConnection(ws, req, wss, agentRooms, mode="chat", msg.start.customParameters);
              }
            } else {
              handleTwilioConnection(ws, req, wss, agentRooms, mode="call", msg.start.customParameters);
            }

            handlerInitialized = true;
            
            // Re-emit the start message to be handled by the new handler
            ws.emit('message', message);
          }
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });

    ws.on('close', () => {
      // Clean up room membership when connection closes
      if (ws.roomKey && agentRooms.has(ws.roomKey)) {
        agentRooms.get(ws.roomKey).delete(ws);
        if (agentRooms.get(ws.roomKey).size === 0) {
          agentRooms.delete(ws.roomKey);
        }
      }
    });
  });
};
