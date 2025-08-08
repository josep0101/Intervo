const { BaseAgent } = require('./BaseAgent');

const ACKNOWLEDGMENTS = {
  happy: [
    "Wonderful to hear that",
    "That's excellent",
    "I'm glad to hear that",
    "That's great news",
    "Delighted to hear this",
    "That's fantastic",
    "I'm pleased to hear that",
    "That's wonderful",
    "Excellent news",
    "That's very good to hear"
  ],
  neutral: [
    "I understand",
    "Certainly",
    "Okay",
    "Understood",
    "Noted",
    "Very well",
    "Indeed",
    "Right",
    "Got it!",
    "Absolutely"
  ],
  casual: [
    "Thanks for sharing that",
    "I appreciate you telling me",
    "That's interesting",
    "I hear you",
    "Good to know",
    "I see what you mean",
    "That makes sense",
    "Fair enough",
    "I understand completely",
    "That's clear"
  ],
  frustrated: [
    "I understand your frustration",
    "I hear your concerns",
    "Let me help address that",
    "I apologize for the difficulty",
    "I know this can be frustrating",
    "Let's work through this together",
    "I appreciate your patience",
    "I'll help sort this out",
    "Thank you for bringing this up",
    "Let's find a solution"
  ],
};

const BACKCHANNELS = {
  happy: [
    "Ah",
    "Oh",
    "Wow",
    "Hey",
  ],
  neutral: [
    "Hmm",
    "Well",
    "So",
    "Let's see",
  ],
  casual: [
    "Oh",
    "Hey",
    "Ah",
    "Well",
  ],
  frustrated: [
    "Oh",
    "Hmm",
    "Ah",
    "Well",
  ]
};

const getAcknowledgment = (emotion, confidence, certainty) => {
  const combinedScore = (confidence * 0.6) + (certainty * 0.4);
  
  // If we're not very confident, use neutral backchannels
  if (combinedScore < 0.6) {
    const backchannel = BACKCHANNELS.neutral[Math.floor(Math.random() * BACKCHANNELS.neutral.length)];
    return `${backchannel}, ${ACKNOWLEDGMENTS.neutral[Math.floor(Math.random() * ACKNOWLEDGMENTS.neutral.length)]}`;
  }
  
  // Use emotion-appropriate backchannels
  const backchannel = BACKCHANNELS[emotion][Math.floor(Math.random() * BACKCHANNELS[emotion].length)];
  return `${backchannel}, ${ACKNOWLEDGMENTS[emotion][Math.floor(Math.random() * ACKNOWLEDGMENTS[emotion].length)]}`;
};

class IntentClassifierAgent extends BaseAgent {
  constructor(config) {
    super('intent-classifier', config);
    this.agentsData = config.agentsData || [];
    this.allIntents = [];
    this.initialized = false;
    this.intentClasses = config.classes || [];
    

    console.log("*********this.intentClasses*********", this.intentClasses)
    // Handle async initialization
    this.initializationPromise = (async () => {
      this.state = await require('../services/ConversationState').getInstance(config.conversationId);
    })();
  }

  async ensureInitialized() {
    if (this.initialized) return;
    
    // Map all intents from agents and keep track of their source
    this.allIntents = this.agentsData
      .filter(agent => agent.data?.settings?.intents)
      .flatMap(agent => 
        agent.data.settings.intents.map(intent => ({
          ...intent,
          sourceAgent: agent.data.label // Store the agent this intent belongs to
        }))
      );

    this.initialized = true;
  }

  /**
   * @param {string} dynamicInput - The user's input
   * @param {object} conversationState - The current conversation state object
   * @returns {object} intent classification result
   */
  async process(dynamicInput, conversationState = {}, eventPhase) {

    console.log("***********IntentClassifierAgent.process()***********",eventPhase);
    await this.ensureInitialized();
    await this.initializationPromise; // Wait for state to be initialized

    // Check that conversationState has a memory structure; if not, initialize
    if (!conversationState.memory) {
      conversationState.memory = {};
    }
    if (!conversationState.memory.entities) {
      conversationState.memory.entities = {
        fields: {},
        required: {},
        collected: {}
      };

      // If we're in the start phase, initialize required entities
      if (eventPhase === 'startEvent') {
        // Get all required entities from intents
        const requiredEntities = this.allIntents
          .filter(intent => intent.required_entities)
          .reduce((acc, intent) => {
            intent.required_entities.forEach(entityName => {
              acc[entityName] = {
                required: true,
                description: '', // Since we don't have descriptions in the intent
                type: 'string'
              };
            });
            return acc;
          }, {});

        // Initialize them in the state
        await this.state.initializeRequiredFields(requiredEntities);
      }
    }

    // Prepare simplified class data for the prompt
    const simplifiedClasses = this.intentClasses.map(classItem => ({
        topic: classItem.selectedTopics?.join(', ') || classItem.description,
        agentName: classItem.agent?.data?.settings?.name || 'Unknown Agent'
    }));

    // Combined prompt for both agent selection and intent classification
    const prompt = `
      Given the following user input: "${dynamicInput}"

      TASK 1 - AGENT SELECTION:
      Below are the conversation topics and their specialized agents. 
      Each agent is trained to handle specific types of conversations:
      ${JSON.stringify(simplifiedClasses, null, 2)}
      
      Current context: The "${this.currentAgent || 'None'}" agent is currently handling the conversation.

      TASK 2 - INTENT CLASSIFICATION:
      Once the best agent is determined, classify the user's intent using these possible intents:
      ${JSON.stringify(this.allIntents, null, 2)}

      Please analyze both aspects and return in this JSON format:
      {
        "bestAgent": {
          "name": "agent_name",
          "confidence": number_between_0.0_and_1.0,
          "reasoning": "brief explanation of why this agent is best suited"
        },
        "intent": {
          "matchedIntent": "intent_name",
          "sourceAgent": "agent_name",
          "confidence": number_between_0.0_and_1.0,
          "entities": {
            "field1": "value1"
          }
        }
      }

      Important:
      - First determine the most appropriate agent based on the conversation topic
      - Then identify the specific intent within that agent's domain
      - Confidence scores should reflect your certainty in each decision
    `;

    let result;
    try {
      const response = await this.callAI(prompt, { responseFormat: "json_object" });
      result = JSON.parse(response);

    } catch (error) {
      console.error("Failed to parse intent classifier response:", error);
      return null;
    }


    // If an intent is confidently matched, store newly captured entities to conversationState
    if (result) {
      const recognizedEntities = result.intent.entities || {};

      console.log(recognizedEntities, "***********recognized entities***********")
      
      // For each recognized entity, if we haven't collected it yet, store it now
      Object.entries(recognizedEntities).forEach(async ([key, value]) => {
        // Only set new values, don't overwrite existing ones
        const existingValue = this.state.get('entities', key);
        if (value && (!existingValue || existingValue === null)) {
          this.state.set('entities', key, value);
          
          // Log entity collection
          if (global.orchestrationLogger) {
            await global.orchestrationLogger.logDataCollection(
              key, 
              value, 
              'intent_extraction', 
              this.name
            );
          }
        }
      });

      // Return both classifier and intent details in a structured way
      return {
        classifier: {
          bestAgent: result.bestAgent.name,
          confidence: result.bestAgent.confidence,
          reasoning: result.bestAgent.reasoning
        },
        intent: {
          confidence: result.intent.confidence,
          text: "", // Intent classifier doesn't generate text responses
          agent: this.name,
          intent: result.intent.matchedIntent,
          sourceAgent: result.intent.sourceAgent,
          entities: recognizedEntities,
        }
      };
    }

    // If no matching intent or confidence is too low
    return {
      canProcess: false,
      confidence: result?.confidence || 0.0,
      text: "",
      agent: this.name,
      intent: null,
      sourceAgent: null,
      entities: {},
      priority: "low",
      order: 0,
      conversationState
    };
  }
}

module.exports = { IntentClassifierAgent };