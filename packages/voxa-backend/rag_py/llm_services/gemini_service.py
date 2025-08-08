import os
from typing import List, Dict, Any
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage
from rag_py.llm_services.base import BaseLLMService

class GeminiService(BaseLLMService):
    """Google Gemini LLM service implementation."""
    
    async def initialize(self) -> None:
        """Initialize the Gemini service."""
        load_dotenv(".env.development")
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is not set in environment variables")
            
        self.model = ChatGoogleGenerativeAI(
            model=self.model_name or "gemini-pro",
            temperature=self.temperature,
            google_api_key=api_key,
            max_retries=self.max_retries
        )
        
    async def invoke(self, messages: List[BaseMessage]) -> str:
        """Invoke the Gemini model."""
        response = await self.model.ainvoke(messages)
        return response.content 