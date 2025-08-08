import os
from typing import List, Dict, Any
from dotenv import load_dotenv
from langchain_deepseek import ChatDeepSeek
from langchain_core.messages import BaseMessage
from rag_py.llm_services.base import BaseLLMService

class DeepSeekService(BaseLLMService):
    """DeepSeek LLM service implementation."""
    
    async def initialize(self) -> None:
        """Initialize the DeepSeek service."""
        load_dotenv(".env.development")
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            raise ValueError("DEEPSEEK_API_KEY is not set in environment variables")
            
        self.model = ChatDeepSeek(
            model_name=self.model_name or "deepseek-chat",
            temperature=self.temperature,
            api_key=api_key,
            max_retries=self.max_retries
        )
        
    async def invoke(self, messages: List[BaseMessage]) -> str:
        """Invoke the DeepSeek model."""
        response = await self.model.ainvoke(messages)
        return response.content 