const axios = require("axios");

class OpenAIService {
  constructor() {
    // this.apiKey = process.env.OPENAI_API_KEY;
    // this.apiKey = process.env.DEEP_SEEK_API_KEY;
    this.apiKey = process.env.GROQ_API_KEY;
    // this.apiKey = process.env.CLOUDFLARE_AI_API_KEY;
  
    this.baseURL = "https://api.groq.com/openai/v1/chat/completions";
    // this.baseURL = "https://api.openai.com/v1/chat/completions";
    // this.baseURL = "https://api.deepseek.com/v1/chat/completions";
    // this.baseURL="https://api.avian.io/v1/chat/completions"
    // this.baseURL="https://api.cerebras.ai/v1/chat/completions"
    // this.baseURL="https://api.cloudflare.com/client/v4/accounts/419b708f7bd05fae27adc304aa848191/ai/v1/chat/completions"
  }

  async handleStream(prompt, config = {}) {


    try {
      const {
        temperature = 0.7,
        maxTokens = 150,
        systemPrompt = "You are a helpful voice assistant. Your job is to reply exactly how a native english speaker would reply over a call. Keep it short (like in a phone conversation) and only reply with the response. No need of additional words like Assistant: etc. The prompt which user has given can be used to generate a response. You don't have to return <think> tags",
        responseFormat = null,
      } = config;

      let model = config.model;
      if(!model) {
        // model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
        // model="deepseek-chat"
        model="llama-3.3-70b-versatile"
        // model="deepseek-r1-distill-llama-70b"
        // model="llama-3.3-70b"
        // model ="Meta-Llama-3.3-70B-Instruct"
      }

      console.log("***responseFormat***", responseFormat)

      const response = await axios.post(
        this.baseURL,
        {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          max_tokens: 1000,
          temperature,
          ...(responseFormat && { response_format: { type: "json_object" } }) // Fixed format
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const rawResponseData = response.data.choices[0].message.content.trim();
      const responseData = this.removeThinkTags(rawResponseData);
      console.log("responseData OPENAI", responseData)
      return responseData;
    } catch (error) {
      console.error("Error interacting with OpenAI:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 404) {
        throw new Error("Configuration error: Model not found. Please check the model name.");
      }
      
      throw new Error("Failed to process request with OpenAI service");
    }
  }

  removeThinkTags(text) {
    // Remove content within <think> tags including the tags themselves
    return text.replace(/<think>.*?<\/think>/gs, '').trim();
  }
}

// Export a singleton instance
module.exports = new OpenAIService();