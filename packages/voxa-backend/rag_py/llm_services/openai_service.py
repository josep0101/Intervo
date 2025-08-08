import os
from typing import List, Dict, Any
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage
from rag_py.llm_services.base import BaseLLMService

class OpenAIService(BaseLLMService):
    """OpenAI LLM service implementation."""
    
    async def initialize(self) -> None:
        """Initialize the OpenAI service."""
        load_dotenv(".env.development")
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not set in environment variables")
            
        self.model = ChatOpenAI(
            model_name=self.model_name or "gpt-3.5-turbo",
            temperature=self.temperature,
            api_key=api_key,
            max_retries=self.max_retries
        )
        
    async def invoke(self, messages: List[BaseMessage]) -> str:
        """Invoke the OpenAI model."""
        response = await self.model.ainvoke(messages)
        return response.content 