const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = "gemini-2.0-flash"; // Default model
  }

  async handleStream(prompt, config = {}) {
    try {
      const {
        temperature = 0.7,
        maxTokens = 150,
        systemPrompt = "You are a helpful voice assistant. Your job is to reply exactly how a native english speaker would reply over a call. Keep it short (like in a phone conversation) and only reply with the response. No need of additional words like Assistant: etc. The prompt which user has given can be used to generate a response. You don't have to return <think> tags",
        responseFormat = null,
      } = config;

      // Get the generative model
      const model = this.genAI.getGenerativeModel({
        model: config.model || this.model,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          response_mime_type: "application/json"
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE",
          },
        ],
      });

      // Create chat context with system prompt
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: systemPrompt }],
          },
        ],
      });

      // Generate response
      const result = await chat.sendMessage([{ text: prompt }]);
      const response = await result.response;
      
      const rawResponseData = response.text().trim();
      
      try {
        // Attempt to parse as JSON
        const jsonResponse = JSON.parse(rawResponseData);
        return jsonResponse;
      } catch (jsonError) {
        console.warn("Failed to parse response as JSON:", rawResponseData);
        // Return raw text if JSON parsing fails
        return this.removeThinkTags(rawResponseData);
      }
    } catch (error) {
      console.error("Error interacting with Gemini:", {
        message: error.message,
        details: error.details,
      });
      
      if (error.message?.includes("NOT_FOUND")) {
        throw new Error("Configuration error: Model not found. Please check the model name.");
      }
      
      throw new Error("Failed to process request with Gemini service");
    }
  }

  removeThinkTags(text) {
    // Remove content within <think> tags including the tags themselves
    return text.replace(/<think>.*?<\/think>/gs, '').trim();
  }
}

// Export a singleton instance
module.exports = new GeminiService(); 