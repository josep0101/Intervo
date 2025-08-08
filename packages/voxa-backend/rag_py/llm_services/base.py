from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from langchain_core.messages import BaseMessage
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate

class BaseLLMService(ABC):
    """Abstract base class for LLM services."""
    
    def __init__(self, config: Dict[str, Any] = None):
        """Initialize the LLM service with configuration"""
        self.config = config or {}
        self.model_name = self.config.get("model_name")
        self.temperature = self.config.get("temperature", 0.7)
        self.max_retries = self.config.get("max_retries", 3)
        
    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the service with required credentials and setup."""
        pass
        
    @abstractmethod
    async def invoke(self, messages: List[BaseMessage]) -> str:
        """
        Invoke the LLM with the given messages.
        
        Args:
            messages: List of chat messages
            
        Returns:
            The model's response as a string
        """
        pass
        
    def get_prompt_template(self) -> ChatPromptTemplate:
        """
        Get the chat prompt template. This provides a default implementation
        that can be overridden by specific services if they need custom prompting.
        """
        return ChatPromptTemplate.from_messages([
            SystemMessagePromptTemplate.from_template(
                "You are a helpful assistant that answers questions based on the provided context. "
                "Always answer directly and concisely based on the context provided. "
                "If the context doesn't contain relevant information, say so."
            ),
            HumanMessagePromptTemplate.from_template(
                "Context: {context}\n\nQuestion: {question}"
            )
        ]) 