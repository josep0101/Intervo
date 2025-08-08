"use client";
import React, {
  createContext,
  useContext,
  useReducer,
  useState,
  useEffect,
  useRef,
} from "react";
import returnAPIUrl from "@/config/config";
import { useSource } from "@/context/SourceContext";

const backendAPIUrl = returnAPIUrl();
//const backendAPIUrl = "http://localhost:3003";
const WEBSOCKET_URL = returnAPIUrl()?.replace(/^https?:\/\//, "") || "";

const defaultAIConfig = {
  sttService: "whisper",
  aiEndpoint: "gpt4",
  ttsService: "elevenlabs",
  voiceType: "adam",
};

const getInitialAIConfig = () => {
  if (typeof window !== "undefined") {
    const savedConfig = localStorage.getItem("aiAssistantConfig");
    console.log(savedConfig, "savedConfig");
    return savedConfig && savedConfig !== "undefined"
      ? JSON.parse(savedConfig)
      : defaultAIConfig;
  }
  return defaultAIConfig;
};

const initialState = {
  transcriptions: [],
  isConnected: false,
  aiConfig: {},
  tools: [],
  messages: [],
  conversationState: null,
  mode: null,
};

function playgroundReducer(state, action) {
  switch (action.type) {
    case "ADD_TRANSCRIPTION":
      return {
        ...state,
        transcriptions: [...state.transcriptions, action.payload],
      };
    case "SET_CONNECTED":
      return {
        ...state,
        isConnected: action.payload,
      };
    case "SET_AI_CONFIG":
      return {
        ...state,
        aiConfig: action.payload,
      };
    case "SET_TOOLS":
      return {
        ...state,
        tools: action.payload,
      };
    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case "CLEAR_MESSAGES":
      return {
        ...state,
        messages: [],
      };
    case "UPDATE_CONVERSATION_STATE":
      return {
        ...state,
        conversationState: action.payload,
      };
    case "SET_MODE":
      return {
        ...state,
        mode: action.payload,
      };
    default:
      return state;
  }
}

const PlaygroundContext = createContext();

export function PlaygroundProvider({ children }) {
  const [state, dispatch] = useReducer(playgroundReducer, initialState);
  const [isFetchingAgent, setIsFetchingAgent] = useState(false);
  const [isWebSocketReady, setIsWebSocketReady] = useState(false);
  const [workflowNeedsUpdate, setWorkflowNeedsUpdate] = useState(false);
  const wsRef = useRef(null);
  const { setSourceId } = useSource();

  const setupWebSocket = async (
    token,
    agentId,
    mode = "call",
    aiConfig = null
  ) => {
    if (wsRef.current) return;

    console.log("creating a socket connection");
    wsRef.current = new WebSocket(
      `wss://${WEBSOCKET_URL}?token=${token}&type=client`
    );

    wsRef.current.onopen = () => {
      console.log("Connected to WebSocket server");
      setIsWebSocketReady(true);
      dispatch({ type: "CLEAR_MESSAGES" });
      dispatch({ type: "SET_MODE", payload: mode });

      const startMessage = {
        event: "start",
        start: {
          customParameters: {
            "agent-id": agentId,
            mode: mode,
            ...(aiConfig || {}),
          },
        },
      };
      wsRef.current.send(JSON.stringify(startMessage));
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event === "transcription") {
        addMessage({ text: data.text, source: data.source });
      } else if (data.event === "conversationState") {
        dispatch({
          type: "UPDATE_CONVERSATION_STATE",
          payload: data.state,
        });
      }
    };

    wsRef.current.onclose = () => {
      console.log("Disconnected from WebSocket server");
      wsRef.current = null;
      dispatch({ type: "CLEAR_MESSAGES" });
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error: ", error);
    };
  };

  const cleanupWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsWebSocketReady(false);
      dispatch({ type: "CLEAR_MESSAGES" });
    }
  };

  const addTranscription = (text) => {
    dispatch({ type: "ADD_TRANSCRIPTION", payload: text });
  };

  const setConnected = (isConnected) => {
    dispatch({ type: "SET_CONNECTED", payload: isConnected });
  };

  const fetchAIConfig = async (_id) => {
    setIsFetchingAgent(true);
    if (_id === state.aiConfig?._id) {
      setIsFetchingAgent(false);
      return;
    }
    const response = await fetch(`${backendAPIUrl}/agent/${_id}`, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    const aiConfig = await response.json();

    // Check if workflow needs update from backend
    if (aiConfig.workflowNeedsUpdate) {
      setWorkflowNeedsUpdate(true);
    }

    if (aiConfig.knowledgeBase.sources.length > 0) {
      setSourceId(aiConfig.knowledgeBase.sources[0]);
    }
    dispatch({ type: "SET_AI_CONFIG", payload: aiConfig });
    setIsFetchingAgent(false);
  };

  const setAIConfig = async (config) => {
    //save to local storage
    localStorage.setItem("aiAssistantConfig", JSON.stringify(config));
    console.log(config, "testjoe");
    dispatch({ type: "SET_AI_CONFIG", payload: config });
  };

  // publish an agent
  const publishAgent = async (_id) => {
    const response = await fetch(`${backendAPIUrl}/agent/${_id}/publish`, {
      method: "PUT",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    } else {
      return true;
    }
  };

  // get connection data after publishing.
  const getConnectionInfo = async (_id) => {
    const response = await fetch(`${backendAPIUrl}/agent/${_id}/connect-info`, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return await response.json();
  };

  // get webhook details

  const getWebhookDetails = async (_id) => {
    const response = await fetch(`${backendAPIUrl}/agent/${_id}/webhook`, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return await response.json();
  };

  // update webhook function
  const updateWebhook = async (_id, data) => {
    const response = await fetch(`${backendAPIUrl}/agent/${_id}/webhook`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return await response.json();
  };

  // increment agent version
  const incrementAgentVersion = async () => {
    try {
      if (!state.aiConfig || !state.aiConfig._id) {
        console.error("No agent selected or agent ID missing");
        return;
      }

      const agentId = state.aiConfig._id;
      const response = await fetch(
        `${backendAPIUrl}/agent/${agentId}/increment-version`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to increment agent version: ${response.status}`
        );
      }

      const result = await response.json();
      console.log("Agent version incremented successfully:", result);

      // Update the local state with the new version
      if (result.agent) {
        dispatch({
          type: "SET_AI_CONFIG",
          payload: { ...state.aiConfig, version: result.agent.version },
        });
      }

      return result;
    } catch (error) {
      console.error("Error incrementing agent version:", error);
      return { error: error.message };
    }
  };

  // Function to set workflow update needed when user makes edits
  const setWorkflowUpdateNeeded = (needed = true) => {
    setWorkflowNeedsUpdate(needed);
  };

  // function to update ai config but sening a PUT request
  const updateAIConfig = async (data, source = "unknown") => {
    console.log(`updateAIConfig called from ${source}:`, data);
    if (!state?.aiConfig?._id) return;
    const response = await fetch(
      `${backendAPIUrl}/agent/${state?.aiConfig?._id}`,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    console.log(
      `updateAIConfig response for ${source}:`,
      await response.json()
    );
  };

  const [callConfig, setCallConfig] = useState({
    type: "live",
    phoneNumber: "",
  });

  // get all agents
  const getAllAgents = async () => {
    console.log("getAllAgents");
    const response = await fetch(`${backendAPIUrl}/agent`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return await response.json();
  };

  // create a new agent
  const createNewAgent = async (agentType, agentData) => {
    const response = await fetch(`${backendAPIUrl}/agent`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: agentData.name,
        language: agentData.language,
        agentType: agentType,
        preferredSetupType: agentData.preferredSetupType,
      }),
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return await response.json();
  };

  // delete an agent
  const deleteAgent = async (agentId) => {
    const response = await fetch(`${backendAPIUrl}/agent/${agentId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return await response.json();
  };

  // generate workflow with AI
  const generateWorkflowWithAI = async (agentId, description) => {
    try {
      const response = await fetch(
        `${backendAPIUrl}/agent/${agentId}/update-flow-with-prompt`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: description,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      const data = await response.json();

      // If we received a response, update the context with the agent data
      if (data) {
        // If the endpoint returns the complete agent data, update the context
        setAIConfig(data.agent);
        //at this point, we should probably have knowledgesource as well
        setSourceId(data.agent.knowledgeBase.sources[0]);
        // Clear workflow update flag since workflow was successfully generated
        setWorkflowNeedsUpdate(false);
        return true;
      }

      // If the response doesn't contain the expected data
      return false;
    } catch (error) {
      console.error("Error generating workflow:", error);
      return false;
    }
  };

  // assign voice to agent
  const assignVoiceToAgent = async (agentId, voice) => {
    const response = await fetch(
      `${backendAPIUrl}/agent/${agentId}/assign-voice`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicUserId: voice.publicUserId,
          voiceShortName: voice.additionalData.shortName,
          voiceName: voice.voiceName,
          voiceId: voice.voiceId,
          service: voice.service || "elevenlabs",
          traits: voice.traits,
          audioUrl: voice.audioUrl,
          gender: voice.gender,
          language: voice.language,
        }),
      }
    );
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return await response.json();
  };

  //fetch tools function
  const fetchTools = async () => {
    try {
      const response = await fetch(`${backendAPIUrl}/get-tools`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      const tools = await response.json();
      dispatch({ type: "SET_TOOLS", payload: tools.tools });
    } catch (error) {
      console.error("Error fetching tools:", error);
    }
  };

  useEffect(() => {
    // fetchTools();
  }, []);

  const addMessage = (message) => {
    dispatch({ type: "ADD_MESSAGE", payload: message });
  };

  const clearMessages = () => {
    dispatch({ type: "CLEAR_MESSAGES" });
  };

  const updateConversationState = (state) => {
    dispatch({ type: "UPDATE_CONVERSATION_STATE", payload: state });
  };

  const setMode = (mode) => {
    dispatch({ type: "SET_MODE", payload: mode });
  };

  const sendWebSocketMessage = (text) => {
    if (wsRef.current) {
      const message = {
        event: "chat_message",
        message: {
          text: text,
        },
      };
      console.log("sending message 03", message);
      wsRef.current.send(JSON.stringify(message));
    }
  };

  // configure widget
  const configureWidget = async (agentId, widgetConfiguration) => {
    try {
      const response = await fetch(
        `${backendAPIUrl}/agent/${agentId}/configure-widget`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ widgetConfiguration }),
        }
      );

      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Widget configuration saved:", result);
      return result;
    } catch (error) {
      console.error("Error configuring widget:", error);
      return { error: error.message };
    }
  };

  return (
    <PlaygroundContext.Provider
      value={{
        transcriptions: state.transcriptions,
        isConnected: state.isConnected,
        aiConfig: state.aiConfig,
        addTranscription,
        setConnected,
        setAIConfig,
        callConfig,
        setCallConfig,
        createNewAgent,
        fetchAIConfig,
        updateAIConfig,
        isFetchingAgent,
        publishAgent,
        getConnectionInfo,
        getWebhookDetails,
        updateWebhook,
        getAllAgents,
        deleteAgent,
        generateWorkflowWithAI,
        assignVoiceToAgent,
        tools: state.tools,
        fetchTools,
        messages: state.messages,
        addMessage,
        clearMessages,
        setupWebSocket,
        cleanupWebSocket,
        isWebSocketReady,
        conversationState: state.conversationState,
        updateConversationState,
        mode: state.mode,
        setMode,
        sendWebSocketMessage,
        incrementAgentVersion,
        setWorkflowUpdateNeeded,
        workflowNeedsUpdate,
        configureWidget,
      }}
    >
      {children}
    </PlaygroundContext.Provider>
  );
}

export function usePlayground() {
  return useContext(PlaygroundContext);
}
