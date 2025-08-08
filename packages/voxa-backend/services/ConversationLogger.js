const fs = require('fs').promises;
const path = require('path');

class ConversationLogger {
  constructor(conversationId) {
    this.conversationId = conversationId;
    this.logCounter = 0;
    this.logDir = path.join(process.cwd(), 'conversation-logs', conversationId);
    this.currentLogFile = null;
    this.initializeLogger();
  }

  async initializeLogger() {
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(this.logDir, { recursive: true });
      
      // Create initial log file
      this.currentLogFile = path.join(this.logDir, 'conversation-log.jsonl');
      
      // Write initial session metadata
      await this.logEntry({
        type: 'session_start',
        timestamp: new Date().toISOString(),
        conversationId: this.conversationId,
        sessionInfo: {
          startTime: new Date().toISOString(),
          nodeVersion: process.version
        }
      });

      console.log(`Conversation logger initialized for ${this.conversationId}`);
    } catch (error) {
      console.error('Failed to initialize conversation logger:', error);
    }
  }

  async logEntry(data) {
    try {
      this.logCounter++;
      
      const logEntry = {
        id: this.logCounter,
        timestamp: new Date().toISOString(),
        conversationId: this.conversationId,
        ...data
      };

      // Write to JSONL file (one JSON object per line)
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.currentLogFile, logLine);

      // Also log to console for real-time monitoring
      // console.log(`[LOG-${this.logCounter}] ${data.type}:`, JSON.stringify(data, null, 2));

    } catch (error) {
      console.error('Failed to write log entry:', error);
    }
  }

  async logUserInput(input) {
    await this.logEntry({
      type: 'user_input',
      input: input,
      inputLength: input.length
    });
  }

  async logIntentClassification(input, classifierResponse, availableAgents) {
    await this.logEntry({
      type: 'intent_classification',
      userInput: input,
      classification: {
        selectedAgent: classifierResponse?.classifier?.bestAgent,
        confidence: classifierResponse?.classifier?.confidence,
        reasoning: classifierResponse?.classifier?.reasoning,
        intent: {
          matched: classifierResponse?.intent?.intent,
          sourceAgent: classifierResponse?.intent?.sourceAgent,
          confidence: classifierResponse?.intent?.confidence,
          entities: classifierResponse?.intent?.entities
        }
      },
      availableAgents: availableAgents,
      classifierRawResponse: classifierResponse
    });
  }

  async logAgentSelection(selectedAgent, allResponses, selectionReason) {
    await this.logEntry({
      type: 'agent_selection',
      selectedAgent: {
        name: selectedAgent?.agent,
        confidence: selectedAgent?.response?.confidence,
        canProcess: selectedAgent?.response?.canProcess,
        intent: selectedAgent?.response?.intent,
        priority: selectedAgent?.response?.priority
      },
      allAgentResponses: allResponses.map(r => ({
        agent: r.agent,
        canProcess: r.response?.canProcess,
        confidence: r.response?.confidence,
        intent: r.response?.intent,
        hasKbRequired: r.response?.kbRequired || false
      })),
      selectionReason: selectionReason,
      totalAgentsEvaluated: allResponses.length
    });
  }

  async logKnowledgeBaseUsage(agentName, query, kbSources, kbResult, processingTime) {
    await this.logEntry({
      type: 'knowledge_base_usage',
      agent: agentName,
      query: query,
      knowledgeBase: {
        sources: kbSources,
        sourcesCount: kbSources?.length || 0,
        hasSourceIds: (kbSources?.length || 0) > 0
      },
      result: {
        success: !!kbResult,
        resultLength: kbResult?.length || 0,
        resultPreview: kbResult ? kbResult.substring(0, 200) + '...' : null
      },
      processingTimeMs: processingTime
    });
  }

  async logDataCollection(entityType, entityValue, collectionMethod, agentName) {
    await this.logEntry({
      type: 'data_collection',
      entity: {
        type: entityType,
        value: entityValue,
        collectionMethod: collectionMethod, // 'intent_extraction', 'direct_ask', etc.
        collectedBy: agentName
      },
      entityState: 'collected'
    });
  }

  async logEntityMissing(missingEntities, requiredFor, agentName) {
    await this.logEntry({
      type: 'missing_entities',
      missingEntities: missingEntities,
      requiredFor: requiredFor,
      requestedBy: agentName,
      entityState: 'missing'
    });
  }

  async logAgentResponse(agentName, input, response, processingTime) {
    await this.logEntry({
      type: 'agent_response',
      agent: agentName,
      input: input,
      response: {
        text: response.text,
        confidence: response.confidence,
        intent: response.intent,
        canProcess: response.canProcess,
        priority: response.priority,
        hasKbResponse: !!response.kbResponse,
        kbRequired: response.kbRequired || false,
        missingEntities: response.missingEntities || []
      },
      processingTimeMs: processingTime,
      responseLength: response.text?.length || 0
    });
  }

  async logConversationState(currentState) {
    await this.logEntry({
      type: 'conversation_state',
      state: {
        phase: currentState.conversationPhase,
        currentAgent: currentState.currentAgent,
        memoryState: currentState.getMemoryState ? currentState.getMemoryState() : null,
        collectedEntities: currentState.entities || {}
      }
    });
  }

  async logError(errorType, error, context) {
    await this.logEntry({
      type: 'error',
      errorType: errorType,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context: context
    });
  }

  async logSessionEnd(endReason, totalDuration, messageCount) {
    await this.logEntry({
      type: 'session_end',
      endReason: endReason,
      sessionStats: {
        totalDurationMs: totalDuration,
        messageCount: messageCount,
        totalLogEntries: this.logCounter
      }
    });
  }

  // Get log file path for external access
  getLogFilePath() {
    return this.currentLogFile;
  }

  // Get log directory for external access
  getLogDirectory() {
    return this.logDir;
  }
}

module.exports = ConversationLogger; 