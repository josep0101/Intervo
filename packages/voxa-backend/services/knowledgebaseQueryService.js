const axios = require('axios');

class KnowledgebaseQueryService {
  constructor() {
    // You'll inject the actual API endpoint and config
    this.apiEndpoint = process.env.KNOWLEDGEBASE_API_ENDPOINT || 'http://0.0.0.0:4003';
  }

  /**
   * Query the knowledgebase for relevant information
   * @param {Object} params Query parameters
   * @param {string} params.query The user's query
   * @param {string} params.agentName The name of the agent making the query
   * @param {Array} params.sources Array of knowledge source IDs
   * @param {string} params.conversationHistory Formatted conversation history
   * @param {Object} params.config LLM configuration
   * @returns {Promise<Object>} Promise resolving to { answer: string, sources: Array }
   */
  async queryKnowledgebase({ query, agentName, sources, conversationHistory = "", config = {} }) {

    const systemPrompt = `
    You are a helpful AI assistant answering questions during a phone call, using only the provided knowledge base context.
    Keep your answers concise and directly relevant to the user's question.
    Focus on providing the key information needed without extra details. This is for a phone conversation, so keep your answers short and to the point (1-2 sentences preferably). Be friendly as well.
    Do not include links or mention that you are using a knowledge base. Just provide the answer naturally as part of the conversation.
    You can include any follow up questions in your response if required after sharing the data.
    If you do not have the information, do not make up information. Just say you don't know.
    `
    try {
      // Match the Python service's config structure
      const llmConfig = {
        llm_service: "gemini",

        llm_config: {
          model_name: "gemini-2.5-flash-preview-04-17",
          temperature: config.temperature || 0.7,
        },
        rerank_model: config.rerank_model || "rerank-lite-1",
        top_k: config.top_k || 3,
        chunk_size: config.chunk_size || 1000,
        chunk_overlap: config.chunk_overlap || 200,
      };

      const response = await axios.post(`${this.apiEndpoint}/query`, {
        knowledgebase_id: sources[0], // Assuming first source is the knowledgebase ID
        question: query,
        system_prompt: systemPrompt,
        conversation_history: conversationHistory,
        config: llmConfig
      });

      const responseData = response.data;
      // The     response should already be in the correct format { answer, sources }
      return response.data.answer;
    } catch (error) {
      console.error('Error querying knowledgebase:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        error: error.message,
        config: error.config,
        fullError: error
      });
      throw error;
    }
  }
}

// Export as singleton
module.exports = new KnowledgebaseQueryService(); 