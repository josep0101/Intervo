import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

class GeminiInternalService:
    """
    A dedicated Gemini LLM service for internal RAG enhancement tasks.
    This service is self-contained and does not inherit from BaseLLMService.
    """
    
    def __init__(self, 
                 model_name: str, 
                 temperature: float, 
                 max_retries: int, 
                 api_key_env_var: str = "GOOGLE_API_KEY"):
        """
        Initialize the GeminiInternalService.

        Args:
            model_name: The name of the Gemini model to use (e.g., "gemini-1.5-flash-latest").
            temperature: The temperature setting for the model.
            max_retries: The maximum number of retries for API calls.
            api_key_env_var: The environment variable name for the Google API Key.
        """
        self.model_name = model_name
        self.temperature = temperature
        self.max_retries = max_retries
        self.api_key_env_var = api_key_env_var
        self.llm_model: Optional[ChatGoogleGenerativeAI] = None # Note the attribute name change to avoid potential conflicts

    async def initialize(self) -> None:
        """
        Initialize the underlying ChatGoogleGenerativeAI model.
        Loads API key from environment and configures the model.
        """
        if self.llm_model: # Already initialized
            return

        load_dotenv(".env.development") # Ensure .env is loaded if not already
        api_key = os.getenv(self.api_key_env_var)
        if not api_key:
            raise ValueError(f"{self.api_key_env_var} is not set in environment variables")
            
        try:
            self.llm_model = ChatGoogleGenerativeAI(
                model=self.model_name, # Direct string model name
                temperature=self.temperature,
                google_api_key=api_key,
                max_retries=self.max_retries,
                generation_config={} # To allow overriding max_output_tokens per call
            )
        except Exception as e:
            # Log this error appropriately in a real scenario
            # print(f"Failed to initialize ChatGoogleGenerativeAI: {e}")
            raise ValueError(f"Failed to initialize ChatGoogleGenerativeAI: {e}")


    async def generate(self, prompt: str, max_tokens: Optional[int] = None) -> Dict[str, Any]:
        """
        Generate content using a simple string prompt.

        Args:
            prompt: The string prompt for the LLM.
            max_tokens: Optional maximum number of tokens for the response.

        Returns:
            A dictionary containing the generated text, e.g., {"text": "..."}
        """
        if not self.llm_model:
            await self.initialize()
        
        if not self.llm_model: # Double check after initialization attempt
             raise RuntimeError("GeminiInternalService could not be initialized.")

        messages = [HumanMessage(content=prompt)]
        
        ainvoke_config = {}
        if max_tokens is not None:
            ainvoke_config = {"generation_config": {"max_output_tokens": max_tokens}}
            
        try:
            response = await self.llm_model.ainvoke(messages, config=ainvoke_config)
            return {"text": response.content}
        except Exception as e:
            # Log this error appropriately in a real scenario
            # print(f"Error during GeminiInternalService generate call: {e}")
            # For now, return an error structure consistent with RAGEnhancementService expectations
            return {"text": f"Error generating content: {str(e)}"} 