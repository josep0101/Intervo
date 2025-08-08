from typing import List, Dict, Any, Optional, Tuple
import logging
from pathlib import Path
from dotenv import load_dotenv
import os

from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.vectorstores import VectorStore
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_voyageai import VoyageAIRerank
from langchain.retrievers import ContextualCompressionRetriever
from rag_py.llm_services.factory import LLMServiceFactory, LLMServiceType
from rag_py.llm_services.base import BaseLLMService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class RagTrainer:
    def __init__(
        self,
        vector_store_path: Optional[str] = "vector_store",
        config: Dict[str, Any] = None
    ):
        """
        Initialize the RAG trainer with the specified configuration.
        
        Args:
            vector_store_path: Path to store the FAISS index
            config: Configuration dictionary for customizing the service.
        """
        self.config = config or {}
        self.vector_store_path = Path(vector_store_path)
        
        # Create vector store directory if it doesn't exist
        self.vector_store_path.mkdir(parents=True, exist_ok=True)
        
        # Load environment variables
        load_dotenv(".env.development")
        
        api_key = os.getenv("OPENAI_API_KEY")
        
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not set in environment variables")
            
        # Initialize embeddings
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key=api_key
        )
        
        # Initialize vector store
        self.vector_store: Optional[VectorStore] = None
        self.documents: List[Document] = []
        
        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.config.get("chunk_size", 300),
            chunk_overlap=self.config.get("chunk_overlap", 50),
            separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""],
            keep_separator=True
        )
        
        # Load existing vector store if available
        self._load_vector_store()
        
    def _load_vector_store(self) -> None:
        """Load the vector store from disk if it exists."""
        try:
            index_path = self.vector_store_path / "index.faiss"
            if index_path.exists():
                logger.info(f"Loading vector store from {self.vector_store_path}")
                self.vector_store = FAISS.load_local(
                    str(self.vector_store_path),
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
        except Exception as e:
            logger.error(f"Error loading vector store: {e}")
            self.vector_store = None
            
    def _save_vector_store(self) -> None:
        """Save the vector store to disk."""
        if self.vector_store:
            logger.info(f"Saving vector store to {self.vector_store_path}")
            # Ensure directory exists
            self.vector_store_path.mkdir(parents=True, exist_ok=True)
            self.vector_store.save_local(str(self.vector_store_path))
            
    async def _embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Helper method to embed texts and log the process."""
        logger.info(f"Generating embeddings for {len(texts)} text chunks...")
        try:
            embeddings = await self.embeddings.aembed_documents(texts)
            return embeddings
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            raise

    async def initialize(self, documents: List[Document]) -> None:
        """
        Initialize the RAG system with the provided documents.
        
        Args:
            documents: List of Document objects to initialize the system with
        """
        try:
            # Store original documents
            self.documents.extend(documents)
            
            # Split documents into chunks
            split_docs = self.text_splitter.split_documents(documents)
            logger.info(f"Split documents into {len(split_docs)} chunks")
            
            
            # Get text content for embedding
            texts = [doc.page_content for doc in split_docs]
            
            # Generate and log embeddings
            embeddings = await self._embed_texts(texts)
            
            # Create vector store from split documents
            self.vector_store = FAISS.from_documents(split_docs, self.embeddings)
            self._save_vector_store()
            
        except Exception as e:
            logger.error(f"Error initializing RAG system: {e}")
            raise
            
    async def add_documents(self, documents: List[Document]) -> None:
        """
        Add new documents to the existing RAG system.
        
        Args:
            documents: List of Document objects to add
        """
        if not isinstance(documents, list):
            documents = [documents]
            
        try:
            # Store original documents
            self.documents.extend(documents)
            
            # Split new documents into chunks
            split_docs = self.text_splitter.split_documents(documents)
            logger.info(f"Split new documents into {len(split_docs)} chunks")
            
            
            # Get text content for embedding
            texts = [doc.page_content for doc in split_docs]
            
            # Generate and log embeddings
            embeddings = await self._embed_texts(texts)
            
            if not self.vector_store:
                self.vector_store = FAISS.from_documents(split_docs, self.embeddings)
            else:
                self.vector_store.add_documents(split_docs)
                
            self._save_vector_store()
            
        except Exception as e:
            logger.error(f"Error adding documents: {e}")
            raise

    @staticmethod
    def create_document(
        text: str,
        metadata: Dict[str, Any] = None
    ) -> Document:
        """
        Create a Document object from text and metadata.
        
        Args:
            text: The document text
            metadata: Optional metadata dictionary
            
        Returns:
            Document object
        """
        return Document(
            page_content=text,
            metadata=metadata or {}
        )

class RagQuery:
    def __init__(
        self,
        vector_store_path: str,
        config: Dict[str, Any] = None
    ):
        """
        Initialize the RAG query service with the specified configuration.
        
        Args:
            vector_store_path: Path to the FAISS index
            config: Configuration dictionary for customizing the service
        """
        self.config = config or {}
        self.vector_store_path = Path(vector_store_path)
        
        # Load environment variables
        load_dotenv(".env.development")
        
        api_key = os.getenv("OPENAI_API_KEY")
        voyage_api_key = os.getenv("VOYAGE_API_KEY")
        
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not set in environment variables")
        
        # Initialize embeddings
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key=api_key
        )
        
        # Initialize reranker and compression retriever if Voyage API key is provided
        self.compression_retriever = None
        if voyage_api_key:
            compressor = VoyageAIRerank(
                model=self.config.get("rerank_model", "rerank-lite-1"),
                voyageai_api_key=voyage_api_key,
                top_k=self.config.get("top_k", 3)
            )
            self.compressor = compressor
        
        # Load vector store
        self._load_vector_store()
        
    async def _get_llm_service(self) -> BaseLLMService:
        """Get the configured LLM service."""
        service_type = self.config.get("llm_service", "openai")
        service_config = self.config.get("llm_config", {})
        return await LLMServiceFactory.get_service(service_type, service_config)
        
    def _load_vector_store(self) -> None:
        """Load the vector store from disk."""
        if not self.vector_store_path.exists():
            raise ValueError(f"Vector store not found at {self.vector_store_path}")
            
        try:
            self.vector_store = FAISS.load_local(
                str(self.vector_store_path),
                self.embeddings,
                allow_dangerous_deserialization=True
            )
            
            # Initialize compression retriever if compressor exists
            if hasattr(self, 'compressor'):
                base_retriever = self.vector_store.as_retriever(search_kwargs={"k": 4})
                self.compression_retriever = ContextualCompressionRetriever(
                    base_compressor=self.compressor,
                    base_retriever=base_retriever
                )
        except Exception as e:
            logger.error(f"Error loading vector store: {e}")
            raise
            
    async def text_search(
        self,
        query: str,
        limit: int = 3
    ) -> List[Tuple[Document, float]]:
        """
        Perform simple keyword-based text search.
        
        Args:
            query: Search query
            limit: Maximum number of results to return
            
        Returns:
            List of tuples containing (Document, score)
        """
        # Get all documents from vector store
        docs = self.vector_store.docstore._dict.values()
        words = query.lower().split()
        scores = []
        
        for doc in docs:
            content = doc.page_content.lower()
            score = sum(1 for word in words if word in content) / len(words)
            if score > 0:
                scores.append((doc, score))
                
        return sorted(scores, key=lambda x: x[1], reverse=True)[:limit]
        
    async def query(
        self,
        question: str,
        system_prompt: Optional[str] = None,
        conversation_history: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Query the RAG system with a question.
        
        Args:
            question: The question to ask
            system_prompt: Optional system prompt to override default
            conversation_history: Optional conversation history
            
        Returns:
            Dictionary containing the answer and sources
        """
        try:
            if self.compression_retriever:
                # Use compression retriever if available
                docs = await self.compression_retriever.ainvoke(question)
                vector_results = [(doc, 1.0) for doc in docs]  # Assuming max relevance for reranked docs
            else:
                # Fallback to regular vector search
                vector_results = self.vector_store.similarity_search_with_score(
                    question,
                    k=4
                )
            
            # Perform text search
            text_results = await self.text_search(question)
            
            # Combine results
            combined_results = vector_results + text_results
            
            # Sort and take top results
            combined_results.sort(key=lambda x: x[1], reverse=True)
            top_results = combined_results[:2]
            
            # Format context
            context = "\n".join(
                f"{doc.page_content} (Relevance: {round(score * 100)}%)"
                for doc, score in top_results
            )
            
            print(f"context: {context}")
            # Get LLM service
            llm_service = await self._get_llm_service()
            
            # Create custom prompt template if system prompt is provided
            if system_prompt:
                system_template = system_prompt
                if conversation_history:
                    system_template += f"\n\nPrevious conversation:\n{conversation_history}"
                    
                prompt_template = ChatPromptTemplate.from_messages([
                    SystemMessagePromptTemplate.from_template(system_template),
                    HumanMessagePromptTemplate.from_template(
                        "Context: {context}\n\nQuestion: {question}"
                    )
                ])
            else:
                # Get default prompt template from service
                prompt_template = llm_service.get_prompt_template()
                if conversation_history:
                    # Add conversation history to the default template
                    prompt_template = ChatPromptTemplate.from_messages([
                        SystemMessagePromptTemplate.from_template(
                            prompt_template.messages[0].prompt.template + 
                            f"\n\nPrevious conversation:\n{conversation_history}"
                        ),
                        *prompt_template.messages[1:]
                    ])
            
            # Create messages from template
            messages = prompt_template.format_messages(
                context=context,
                question=question
            )
            
            # Get response from model
            response = await llm_service.invoke(messages)
            
            return {
                "answer": response,
                "sources": [
                    {
                        "content": doc.page_content,
                        "metadata": doc.metadata,
                        "relevance": round(score * 100),
                        "search_type": doc.metadata.get("search_type", "hybrid")
                    }
                    for doc, score in top_results
                ]
            }
            
        except Exception as e:
            logger.error(f"Error querying RAG system: {e}")
            raise 