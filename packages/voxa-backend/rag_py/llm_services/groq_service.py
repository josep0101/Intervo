import os
from typing import List, Dict, Any
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import BaseMessage
from rag_py.llm_services.base import BaseLLMService

class GroqService(BaseLLMService):
    """Groq LLM service implementation."""
    
    async def initialize(self) -> None:
        """Initialize the Groq service."""
        load_dotenv(".env.development")
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY is not set in environment variables")
            
        self.model = ChatGroq(
            model_name=self.model_name or "mixtral-8x7b-32768",  # Groq's recommended model
            temperature=self.temperature,
            groq_api_key=api_key,
            max_retries=self.max_retries
        )
        
    async def invoke(self, messages: List[BaseMessage]) -> str:
        """Invoke the Groq model."""
        response = await self.model.ainvoke(messages)
        return response.content 