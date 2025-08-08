import sys
import os

# Add the parent directory of rag_py to sys.path to allow absolute imports from rag_py
# This should be the very first thing the script does.
_current_file_directory = os.path.dirname(os.path.abspath(__file__))
_parent_directory = os.path.dirname(_current_file_directory)
if _parent_directory not in sys.path:
    sys.path.insert(0, _parent_directory)

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
from rag_py.rag_service import RagTrainer, RagQuery # Absolute import
import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path
import shutil
from rag_py.storage import S3Storage, DocumentType # Absolute import
import json
from datetime import datetime
from rag_py.crawler import WebCrawler # Absolute import
import mammoth
import pdfplumber
import io
from bs4 import BeautifulSoup
from langchain_community.vectorstores import FAISS # Added import for FAISS

# Import the new RAG Enhancement Service using absolute import
from rag_py.rag_enhancements import RAGEnhancementService # Absolute import

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Base directory for all vector stores
VECTOR_STORES_DIR = Path("vector_stores")
VECTOR_STORES_DIR.mkdir(exist_ok=True)

# Global instances
trainer_instances: Dict[str, RagTrainer] = {}
query_instances: Dict[str, RagQuery] = {}

# Initialize S3 storage
storage = S3Storage()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    config = {
        "model_name": "gpt-3.5-turbo",
        "temperature": 0.7,
        "chunk_size": 300,
        "chunk_overlap": 200,
    }
    
    yield
    # Cleanup (if needed)

app = FastAPI(title="RAG API Service", lifespan=lifespan)

# Pydantic models for request/response validation
class Document(BaseModel):
    text: str
    metadata: Optional[Dict[str, Any]] = None

class TrainRequest(BaseModel):
    knowledgebase_id: str
    config: Optional[Dict[str, Any]] = None
    agent_prompt: Optional[str] = None

class QueryRequest(BaseModel):
    knowledgebase_id: str
    question: str
    config: Optional[Dict[str, Any]] = None
    system_prompt: Optional[str] = None
    conversation_history: Optional[str] = None

# New Pydantic models for document operations
class TextDocument(BaseModel):
    text: str
    metadata: Optional[Dict[str, Any]] = None

class QAPair(BaseModel):
    question: Optional[str] = ""
    answer: Optional[str] = ""

class QADocument(BaseModel):
    qa_pairs: List[QAPair]
    metadata: Optional[Dict[str, Any]] = None

class CrawledDocument(BaseModel):
    url: str
    content: str
    filename: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class CrawledBatch(BaseModel):
    documents: List[CrawledDocument]
    metadata: Optional[Dict[str, Any]] = None

class CrawlRequest(BaseModel):
    knowledgebase_id: str
    url: str
    max_depth: Optional[int] = 2
    max_pages: Optional[int] = 5

class DeleteDocumentRequest(BaseModel):
    knowledgebase_id: str
    document_path: str

class RecrawlRequest(BaseModel):
    knowledgebase_id: str

class DeleteUrlsRequest(BaseModel):
    knowledgebase_id: str
    urls: List[str]

class CrawlNextRequest(BaseModel):
    knowledgebase_id: str
    max_pages: Optional[int] = 5

class DeleteFilesRequest(BaseModel):
    knowledgebase_id: str
    filenames: List[str]

class QueryResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]

# Pydantic models for the new /chunks endpoint
class ChunkMetadata(BaseModel):
    # Allow any fields in metadata, as it's flexible
    pass  # Or define specific common fields if known

    class Config:
        extra = "allow"

class Chunk(BaseModel):
    chunk_id: str
    page_content: str
    metadata: Dict[str, Any]
    chunk_summary: Optional[str] = None
    chunk_priority: Optional[int] = None
    chunk_topics: Optional[List[str]] = None
    chunk_topics_source: Optional[str] = None

class GetChunksResponse(BaseModel):
    knowledgebase_id: str
    total_chunks: int
    chunks: List[Chunk]

def get_vector_store_path(knowledgebase_id: str) -> Path:
    """Get the path for a specific knowledgebase's vector store."""
    path = VECTOR_STORES_DIR / knowledgebase_id
    path.mkdir(parents=True, exist_ok=True)
    return path

def clean_vector_store_directory(path: Path) -> None:
    """Clean the vector store directory before training."""
    if path.exists():
        # Remove all files in the directory
        for file in path.glob("*"):
            if file.is_file():
                file.unlink()
    else:
        path.mkdir(parents=True, exist_ok=True)

def create_trainer(knowledgebase_id: str, config: Dict[str, Any], force_new: bool = False) -> RagTrainer:
    """Create a new trainer instance."""
    vector_store_path = get_vector_store_path(knowledgebase_id)
    if force_new:
        clean_vector_store_directory(vector_store_path)
    
    trainer = RagTrainer(
        vector_store_path=str(vector_store_path),
        config=config
    )
    trainer_instances[knowledgebase_id] = trainer
    return trainer

def create_query_interface(knowledgebase_id: str, config: Dict[str, Any]) -> Optional[RagQuery]:
    """Create a new query interface."""
    vector_store_path = get_vector_store_path(knowledgebase_id)
    if not (vector_store_path / "index.faiss").exists():
        return None
    
    try:
        query_interface = RagQuery(
            vector_store_path=str(vector_store_path),
            config=config
        )
        query_instances[knowledgebase_id] = query_interface
        return query_interface
    except Exception as e:
        logger.error(f"Error creating query interface: {e}")
        return None

@app.post("/train")
async def train_rag(request: TrainRequest):
    try:
        o_trainer_config = request.config or {
            "model_name": "gpt-3.5-turbo",
            "temperature": 0.7,
            "chunk_size": 1000,
            "chunk_overlap": 200,
        }
        
        # Create new trainer instance
        trainer = create_trainer(request.knowledgebase_id, o_trainer_config, force_new=True)
        
        # Initialize an empty list to store all documents
        all_documents = []
        
        # Fetch documents of each type
        for doc_type in DocumentType:
            try:
                docs = await storage.get_documents(request.knowledgebase_id, doc_type)
                if docs:
                    if doc_type == DocumentType.TEXT:
                        # For text documents, use the content directly
                        if 'content' in docs:
                            all_documents.append(
                                RagTrainer.create_document(
                                    text=docs['content'],
                                    metadata={'type': 'text', **docs.get('custom_metadata', {})}
                                )
                            )
                    elif doc_type == DocumentType.QA:
                        # For QA pairs, combine question and answer into a single document
                        if 'content' in docs and 'qa_pairs' in docs['content']:
                            for qa_pair in docs['content']['qa_pairs']:
                                all_documents.append(
                                    RagTrainer.create_document(
                                        text=f"Question: {qa_pair['question']}\nAnswer: {qa_pair['answer']}",
                                        metadata={'type': 'qa', **docs.get('custom_metadata', {})}
                                    )
                                )
                    elif doc_type == DocumentType.FILES:
                        # For files, we need to fetch and potentially convert each file's content
                        if 'files' in docs:
                            for file_info in docs['files']:
                                try:
                                    response = await asyncio.to_thread(
                                        storage.s3_client.get_object,
                                        Bucket=storage.bucket,
                                        Key=file_info['path']
                                    )
                                    content = await asyncio.to_thread(
                                        lambda: response['Body'].read()
                                    )
                                    
                                    # Handle different file types
                                    filename = file_info.get('filename', '').lower()
                                    if filename.endswith('.pdf'):
                                        # Convert PDF to text using pdfplumber
                                        text_content = await asyncio.to_thread(
                                            lambda: "\n".join(
                                                page.extract_text() 
                                                for page in pdfplumber.open(io.BytesIO(content)).pages
                                            )
                                        )
                                    elif filename.endswith('.docx'):
                                        # Convert DOCX to HTML using mammoth, then extract text
                                        result = await asyncio.to_thread(
                                            lambda: mammoth.convert_to_html(io.BytesIO(content))
                                        )
                                        # Extract text from HTML
                                        text_content = BeautifulSoup(result.value, 'html.parser').get_text(separator='\n')
                                    elif filename.endswith('.doc'):
                                        # Convert DOC to HTML using mammoth, then extract text
                                        result = await asyncio.to_thread(
                                            lambda: mammoth.convert_to_html(io.BytesIO(content))
                                        )
                                        # Extract text from HTML
                                        text_content = BeautifulSoup(result.value, 'html.parser').get_text(separator='\n')
                                    else:
                                        # For other files, try to decode as UTF-8 text
                                        text_content = content.decode('utf-8')

                                    all_documents.append(
                                        RagTrainer.create_document(
                                            text=text_content,
                                            metadata={
                                                'type': doc_type.value,
                                                'filename': file_info.get('filename'),
                                                'path': file_info.get('path'),
                                                **docs.get('custom_metadata', {})
                                            }
                                        )
                                    )
                                except Exception as e:
                                    logger.warning(f"Error processing file {file_info.get('path')}: {str(e)}")
                                    continue
                    elif doc_type == DocumentType.CRAWLED:
                        # For crawled documents, content is already in text/HTML format
                        if 'files' in docs:
                            for file_info in docs['files']:
                                try:
                                    response = await asyncio.to_thread(
                                        storage.s3_client.get_object,
                                        Bucket=storage.bucket,
                                        Key=file_info['path']
                                    )
                                    content = await asyncio.to_thread(
                                        lambda: response['Body'].read()
                                    )
                                    text_content = content.decode('utf-8')
                                    all_documents.append(
                                        RagTrainer.create_document(
                                            text=text_content,
                                            metadata={
                                                'type': doc_type.value,
                                                'filename': file_info.get('filename'),
                                                'path': file_info.get('path'),
                                                **docs.get('custom_metadata', {})
                                            }
                                        )
                                    )
                                except Exception as e:
                                    logger.warning(f"Error reading file {file_info.get('path')}: {str(e)}")
                                    continue
            except Exception as e:
                logger.warning(f"Error fetching {doc_type.value} documents: {str(e)}")
                continue
        
        if not all_documents:
            raise HTTPException(
                status_code=400,
                detail="No documents found in the knowledgebase. Please add some documents first."
            )
        
        # Initialize with all documents
        await trainer.initialize(all_documents)

        # Initialize RAGEnhancementService with the trainer's config and agent_prompt
        enhancement_service_config = trainer.config
        enhancement_service = RAGEnhancementService(
            llm_config=enhancement_service_config, 
            logger=logger,
            agent_prompt=request.agent_prompt
        )

        processed_chunks_for_kb_summary = []
        if hasattr(trainer.vector_store, 'docstore') and hasattr(trainer.vector_store.docstore, '_dict'):
            docstore_dict = trainer.vector_store.docstore._dict
            logger.info(f"Starting chunk enhancement for {len(docstore_dict)} chunks in knowledgebase {request.knowledgebase_id}.")
            
            # First pass: Generate summaries for all chunks
            summary_tasks = []
            chunk_ids = []
            for chunk_id, chunk_doc in docstore_dict.items():
                summary_tasks.append(asyncio.create_task(enhancement_service.generate_chunk_summary(chunk_doc.page_content)))
                chunk_ids.append(chunk_id)
            
            summary_results = await asyncio.gather(*summary_tasks, return_exceptions=True)
            
            # Apply summaries to chunks
            for i, chunk_id in enumerate(chunk_ids):
                chunk_doc = docstore_dict[chunk_id]
                summary_result = summary_results[i]
                
                if isinstance(summary_result, Exception):
                    logger.error(f"Error generating summary for chunk {chunk_id}: {summary_result}")
                    chunk_doc.metadata['chunk_summary'] = "Error: Failed to generate summary."
                else:
                    chunk_doc.metadata['chunk_summary'] = summary_result
            
            # Second pass: Generate priorities and topics using the summaries
            priority_topic_tasks = []
            chunk_ids_to_update = []
            
            for chunk_id, chunk_doc in docstore_dict.items():
                # Now we can use the summary that was just generated
                chunk_summary = chunk_doc.metadata.get('chunk_summary')
                logger.info(f"Creating priority/topics tasks for chunk {chunk_id[:8]}... with summary: '{chunk_summary[:50] if chunk_summary else 'None'}...'")
                priority_topic_tasks.append(asyncio.create_task(enhancement_service.generate_chunk_priority(chunk_doc.page_content, chunk_summary)))
                priority_topic_tasks.append(asyncio.create_task(enhancement_service.generate_chunk_topics(chunk_doc.page_content, chunk_summary)))
                chunk_ids_to_update.append(chunk_id)
            
            logger.info(f"Created {len(priority_topic_tasks)} tasks for {len(chunk_ids_to_update)} chunks")
            priority_topic_results = await asyncio.gather(*priority_topic_tasks, return_exceptions=True)
            logger.info(f"Received {len(priority_topic_results)} results from priority/topics generation")
            
            # Process priority and topic results: results will be [priority1, topics1, priority2, topics2, ...]
            for i, chunk_id in enumerate(chunk_ids_to_update):
                chunk_doc = docstore_dict[chunk_id]
                priority_result_idx = i * 2
                topics_result_idx = i * 2 + 1

                priority_result = priority_topic_results[priority_result_idx]
                topics_result = priority_topic_results[topics_result_idx]

                logger.info(f"Processing chunk {chunk_id[:8]}... - Priority result: {priority_result} (type: {type(priority_result)}), Topics result: {topics_result} (type: {type(topics_result)})")

                if isinstance(priority_result, Exception):
                    logger.error(f"Error generating priority for chunk {chunk_id}: {priority_result}")
                    chunk_doc.metadata['chunk_priority'] = 0 # Default error priority
                else:
                    chunk_doc.metadata['chunk_priority'] = priority_result
                
                if isinstance(topics_result, Exception):
                    logger.error(f"Error generating topics for chunk {chunk_id}: {topics_result}")
                    chunk_doc.metadata['chunk_topics'] = [] # Default error topics (empty list)
                    chunk_doc.metadata['chunk_topics_source'] = "error"
                elif isinstance(topics_result, dict) and "topics" in topics_result and "source" in topics_result:
                    # New format: dictionary with topics and source
                    chunk_doc.metadata['chunk_topics'] = topics_result["topics"]
                    chunk_doc.metadata['chunk_topics_source'] = topics_result["source"]
                    logger.info(f"Successfully set topics for chunk {chunk_id[:8]}...: {topics_result['topics']} (source: {topics_result['source']})")
                elif isinstance(topics_result, list):
                    # Legacy format: just a list of topics (for backward compatibility)
                    chunk_doc.metadata['chunk_topics'] = topics_result
                    chunk_doc.metadata['chunk_topics_source'] = "legacy"
                    logger.info(f"Successfully set topics for chunk {chunk_id[:8]}...: {topics_result} (legacy format)")
                else:
                    logger.warning(f"Topics result for chunk {chunk_id} was not in expected format: {topics_result}. Storing as empty list.")
                    chunk_doc.metadata['chunk_topics'] = []
                    chunk_doc.metadata['chunk_topics_source'] = "invalid_format"

                processed_chunks_for_kb_summary.append(chunk_doc)
                logger.debug(f"Enhanced chunk {chunk_id} with summary, priority, and topics.")

            logger.info(f"Finished chunk enhancement for knowledgebase {request.knowledgebase_id}.")

            # ---- START: DEBUG FILE CREATION ----
            debug_output_data = []
            # Collect documents with updated metadata for re-creating the vector store
            updated_documents_for_vector_store = [] 
            for chunk_id, chunk_doc in docstore_dict.items():
                debug_output_data.append({
                    "chunk_id": chunk_id,
                    "page_content": chunk_doc.page_content,
                    "metadata": chunk_doc.metadata
                })
                updated_documents_for_vector_store.append(chunk_doc) # Add the updated doc
            
            debug_file_path = get_vector_store_path(request.knowledgebase_id) / f"{request.knowledgebase_id}_chunks_debug_output.json"
            try:
                with open(debug_file_path, 'w', encoding='utf-8') as f:
                    json.dump(debug_output_data, f, indent=4, ensure_ascii=False)
                logger.info(f"Successfully wrote chunk debug information to {debug_file_path}")
            except Exception as e:
                logger.error(f"Failed to write chunk debug information to {debug_file_path}: {e}")
            # ---- END: DEBUG FILE CREATION ----

            # ---- START: RE-CREATE VECTOR STORE WITH UPDATED METADATA ----
            if updated_documents_for_vector_store:
                logger.info(f"Re-creating vector store for {request.knowledgebase_id} with updated metadata before saving.")
                # Ensure trainer has embeddings, which it should from its __init__
                if hasattr(trainer, 'embeddings') and trainer.embeddings:
                    trainer.vector_store = FAISS.from_documents(updated_documents_for_vector_store, trainer.embeddings)
                    trainer._save_vector_store() # Save the newly created store with updated metadata
                    logger.info(f"Successfully re-created and saved vector store with updated chunk metadata.")
                else:
                    logger.error("Trainer object is missing embeddings. Cannot re-create vector store. Metadata might not be persisted.")
            else:
                logger.warning("No documents found to re-create vector store. Skipping re-creation.")
            # ---- END: RE-CREATE VECTOR STORE WITH UPDATED METADATA ----

        else:
            logger.warning(f"Docstore not found or not in expected format for knowledgebase {request.knowledgebase_id}. Skipping chunk enhancements and debug file creation.")

        # Generate knowledge base summary using the enhanced chunks
        # Ensure processed_chunks_for_kb_summary is correctly populated even if we re-created the store
        # It was populated from docstore_dict before re-creation, so it should be fine.
        knowledge_base_summary = await enhancement_service.generate_knowledge_base_summary(processed_chunks_for_kb_summary)
        logger.info(f"Generated knowledge base summary for {request.knowledgebase_id}.")

        # Create new query interface
        query_interface = create_query_interface(request.knowledgebase_id, trainer.config)
        if not query_interface:
            raise HTTPException(
                status_code=500,
                detail="Failed to create query interface after training"
            )
            
        return {
            "status": "success",
            "message": f"Processed {len(all_documents)} documents for knowledgebase {request.knowledgebase_id}",
            "knowledge_base_summary": knowledge_base_summary # Add the summary to the response
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    try:
        vector_store_path = get_vector_store_path(request.knowledgebase_id)
        if not (vector_store_path / "index.faiss").exists():
            raise HTTPException(
                status_code=400,
                detail=f"No documents have been trained for knowledgebase {request.knowledgebase_id}. Please train the system first."
            )
        
        # Get or create query interface
        query_interface = query_instances.get(request.knowledgebase_id)
        if not query_interface:
            # Structure config to match RagQuery's expectations
            config = request.config or {}
            llm_config = {
                "llm_service": config.get("llm_service", "openai"),
                "llm_config": {
                    "model_name": config.get("llm_config", {}).get("model_name", "gpt-4o"),
                    "temperature": config.get("llm_config", {}).get("temperature", 0.7),
                },
                "rerank_model": config.get("rerank_model", "rerank-lite-1"),
                "top_k": config.get("top_k", 3),
                "chunk_size": config.get("chunk_size", 1000),
                "chunk_overlap": config.get("chunk_overlap", 200),
                "system_prompt": request.system_prompt  # Pass system prompt to config
            }
            query_interface = create_query_interface(request.knowledgebase_id, llm_config)
            
        if not query_interface or not query_interface.vector_store:
            raise HTTPException(
                status_code=400,
                detail=f"Error loading vector store for knowledgebase {request.knowledgebase_id}. Please try training again."
            )
            
        result = await query_interface.query(
            question=request.question,
            system_prompt=request.system_prompt,
            conversation_history=request.conversation_history
        )
        
        # Validate response structure
        if not isinstance(result, dict) or "answer" not in result or "sources" not in result:
            raise ValueError("Invalid response structure from query interface")
            
        return result
    
    except ValueError as e:
        logger.error(f"Value error in query: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Document storage endpoints
@app.post("/documents/{knowledgebase_id}/files")
async def upload_files(
    knowledgebase_id: str,
    files: List[UploadFile] = File(...),
    metadata: Optional[str] = Form(None)
):
    """Upload multiple files to a knowledgebase."""
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
            
        # Validate files before processing
        for file in files:
            if not file.filename:
                raise HTTPException(status_code=400, detail="One or more files missing filename")
            if file.filename.endswith('/'):
                raise HTTPException(status_code=400, detail="Invalid filename, cannot end with '/'")
            
        parsed_metadata = None
        if metadata:
            try:
                parsed_metadata = json.loads(metadata)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid metadata JSON format")

        # Get existing documents to check for duplicates
        try:
            existing_docs = await storage.get_documents(knowledgebase_id, DocumentType.FILES)
            existing_filenames = {
                file_info['filename'] for file_info in existing_docs.get('files', [])
            } if existing_docs else set()
        except Exception as e:
            logger.warning(f"Could not fetch existing documents: {str(e)}")
            existing_filenames = set()

        # Filter out duplicate filenames
        unique_files = []
        duplicate_files = []
        for file in files:
            if file.filename in existing_filenames:
                duplicate_files.append(file.filename)
            else:
                unique_files.append(file)

        if not unique_files:
            raise HTTPException(
                status_code=400, 
                detail=f"All files already exist: {', '.join(duplicate_files)}"
            )

        result = await storage.store_files(knowledgebase_id, unique_files, parsed_metadata)
        
        # Include information about duplicates in response if any
        response = {
            "status": "success",
            "message": f"Uploaded {len(unique_files)} files to knowledgebase {knowledgebase_id}",
            "data": result
        }
        if duplicate_files:
            response["duplicates"] = duplicate_files

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Ensure all files are closed
        for file in files:
            try:
                await file.close()
            except Exception as e:
                logger.error(f"Error closing file {file.filename}: {str(e)}")

@app.post("/documents/{knowledgebase_id}/text")
async def store_text(knowledgebase_id: str, document: TextDocument):
    """Store text content in a knowledgebase."""
    try:
        if not document.text:
            raise HTTPException(status_code=400, detail="Text content cannot be empty")
            
        result = await storage.store_text(
            knowledgebase_id,
            document.text,
            document.metadata
        )
        
        # Clean up old timestamped files
        await storage.cleanup_old_files(knowledgebase_id, DocumentType.TEXT)
        
        return {"status": "success", "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error storing text: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/documents/{knowledgebase_id}/qa")
async def store_qa(knowledgebase_id: str, document: QADocument):
    """Store Q&A pairs in a knowledgebase."""
    try:
        if not document.qa_pairs:
            raise HTTPException(status_code=400, detail="Q&A pairs cannot be empty")
            
        qa_pairs = [
            {
                "question": qa.question,
                "answer": qa.answer
            }
            for qa in document.qa_pairs
            if qa.question or qa.answer  # Keep if at least one field is present
        ]
        
        result = await storage.store_qa(
            knowledgebase_id,
            qa_pairs,
            document.metadata
        )
        return {
            "status": "success",
            "message": f"Stored {len(qa_pairs)} Q&A pairs in knowledgebase {knowledgebase_id}",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error storing Q&A pairs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/documents/{knowledgebase_id}/crawled")
async def store_crawled(knowledgebase_id: str, batch: CrawledBatch):
    """Store crawled documents in a knowledgebase."""
    try:
        if not batch.documents:
            raise HTTPException(status_code=400, detail="No crawled documents provided")
            
        files = [
            {
                "url": doc.url,
                "content": doc.content,
                "filename": doc.filename or f"crawled_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.html",
                "metadata": doc.metadata
            }
            for doc in batch.documents
            if doc.content  # Filter out empty content
        ]
        
        if not files:
            raise HTTPException(status_code=400, detail="No valid crawled documents provided")
            
        result = await storage.store_crawled(
            knowledgebase_id,
            files,
            batch.metadata
        )
        return {
            "status": "success",
            "message": f"Stored {len(files)} crawled documents in knowledgebase {knowledgebase_id}",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error storing crawled documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents/{knowledgebase_id}/{doc_type}")
async def get_documents(
    knowledgebase_id: str,
    doc_type: DocumentType
):
    """Retrieve documents of a specific type from a knowledgebase."""
    try:
        result = await storage.get_documents(knowledgebase_id, doc_type)
        
        # If no documents found, return empty structure based on document type
        if result is None:
            if doc_type == DocumentType.QA:
                result = {
                    "content": {"qa_pairs": []},
                    "custom_metadata": {},
                    "timestamp": datetime.utcnow().isoformat()
                }
            elif doc_type == DocumentType.TEXT:
                result = {
                    "content": "",
                    "custom_metadata": {},
                    "timestamp": datetime.utcnow().isoformat()
                }
            else:  # FILES or CRAWLED
                result = {
                    "files": [],
                    "custom_metadata": {},
                    "timestamp": datetime.utcnow().isoformat()
                }
        
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        logger.error(f"Error retrieving documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/knowledgebases")
async def list_knowledgebases():
    """List all knowledgebases."""
    try:
        result = await storage.list_knowledgebases()
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        logger.error(f"Error listing knowledgebases: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/crawl")
async def crawl_website(request: CrawlRequest):
    """Crawl a website and store its content in the knowledgebase."""
    try:
        # Initialize crawler
        crawler = WebCrawler(
            base_url=request.url,
            knowledgebase_id=request.knowledgebase_id,
            storage=storage,
            max_depth=request.max_depth,
            max_pages=request.max_pages
        )
        
        # Crawl the website
        logger.info(f"Starting crawl of {request.url}")
        crawled_pages = await crawler.crawl()
        
        if not crawled_pages:
            raise HTTPException(
                status_code=400,
                detail="No content could be crawled from the provided URL"
            )
        
        # Store crawled pages
        logger.info(f"Storing {len(crawled_pages)} crawled pages")
        result = await storage.store_crawled(
            request.knowledgebase_id,
            crawled_pages,
            metadata={
                'source_url': request.url,
                'crawled_at': datetime.utcnow().isoformat(),
                'max_depth': request.max_depth,
                'max_pages': request.max_pages
            }
        )
        
        return {
            "status": "success",
            "message": f"Successfully crawled and stored {len(crawled_pages)} pages",
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Error during crawling: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/crawl-next")
async def crawl_next_pages(request: CrawlNextRequest):
    """Crawl the next set of pages from the previously crawled website."""
    try:
        # Get existing crawled documents to fetch source URL and metadata
        existing_docs = await storage.get_documents(request.knowledgebase_id, DocumentType.CRAWLED)
        if not existing_docs or 'custom_metadata' not in existing_docs:
            raise HTTPException(
                status_code=404,
                detail=f"No existing crawl data found for knowledgebase {request.knowledgebase_id}"
            )

        custom_metadata = existing_docs.get('custom_metadata', {})
        source_url = custom_metadata.get('source_url')
        if not source_url:
            raise HTTPException(
                status_code=400,
                detail="No source URL found in metadata"
            )

        # Initialize crawler with the same source URL but new max_pages
        crawler = WebCrawler(
            base_url=source_url,
            knowledgebase_id=request.knowledgebase_id,
            storage=storage,
            max_depth=custom_metadata.get('max_depth', 2),
            max_pages=request.max_pages
        )
        
        # Set the existing URLs to skip
        existing_urls = {file.get('url', '') for file in existing_docs.get('files', [])}
        crawler.crawled_urls = existing_urls

        # Crawl the next set of pages
        logger.info(f"Starting crawl of next {request.max_pages} pages from {source_url}")
        crawled_pages = await crawler.crawl()
        
        if not crawled_pages:
            raise HTTPException(
                status_code=400,
                detail="No new content could be crawled from the URL"
            )
        
        # Store crawled pages
        logger.info(f"Storing {len(crawled_pages)} newly crawled pages")
        result = await storage.store_crawled(
            request.knowledgebase_id,
            crawled_pages,
            metadata={
                'source_url': source_url,
                'crawled_at': datetime.utcnow().isoformat(),
                'max_depth': custom_metadata.get('max_depth', 2),
                'max_pages': request.max_pages
            }
        )
        
        return {
            "status": "success",
            "message": f"Successfully crawled and stored {len(crawled_pages)} new pages",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during crawling next pages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/documents/{knowledgebase_id}/{doc_type}/{document_path:path}")
async def delete_document(knowledgebase_id: str, doc_type: DocumentType, document_path: str):
    """Delete a specific document from a knowledgebase."""
    try:
        # Verify the document exists
        docs = await storage.get_documents(knowledgebase_id, doc_type)
        if not docs or 'files' not in docs:
            raise HTTPException(
                status_code=404,
                detail=f"No documents found for knowledgebase {knowledgebase_id}"
            )
        
        # Find the document
        file_exists = False
        for file_info in docs['files']:
            if file_info.get('path') == document_path:
                file_exists = True
                break
                
        if not file_exists:
            raise HTTPException(
                status_code=404,
                detail=f"Document {document_path} not found"
            )
        
        # Delete from S3
        try:
            await storage.s3_client.delete_object(
                Bucket=storage.bucket,
                Key=document_path
            )
        except Exception as e:
            logger.error(f"Error deleting object from S3: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error deleting document: {str(e)}"
            )
        
        # Update metadata to remove the deleted file
        updated_files = [
            f for f in docs['files']
            if f.get('path') != document_path
        ]
        
        # Update metadata file
        metadata_content = {
            "files": updated_files,
            "custom_metadata": docs.get('custom_metadata', {}),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await storage.s3_client.put_object(
            Bucket=storage.bucket,
            Key=f"{knowledgebase_id}/{doc_type}/metadata.json",
            Body=json.dumps(metadata_content),
            ContentType='application/json'
        )
        
        return {
            "status": "success",
            "message": f"Successfully deleted document {document_path}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents/{knowledgebase_id}/{doc_type}/list")
async def list_documents(knowledgebase_id: str, doc_type: DocumentType):
    """List all documents in a knowledgebase of a specific type."""
    try:
        docs = await storage.get_documents(knowledgebase_id, doc_type)
        if not docs:
            return {
                "status": "success",
                "data": {
                    "files": [],
                    "metadata": {}
                }
            }
        
        # For files and crawled documents, return file list with metadata
        if doc_type in [DocumentType.FILES, DocumentType.CRAWLED]:
            return {
                "status": "success",
                "data": {
                    "files": docs.get('files', []),
                    "metadata": docs.get('custom_metadata', {}),
                    "total_files": len(docs.get('files', [])),
                    "last_updated": docs.get('timestamp')
                }
            }
        
        # For text and QA, return simplified metadata
        return {
            "status": "success",
            "data": {
                "metadata": docs.get('custom_metadata', {}),
                "timestamp": docs.get('timestamp')
            }
        }
        
    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recrawl")
async def recrawl_existing_pages(request: RecrawlRequest):
    """Recrawl all existing pages in a knowledgebase to update their content."""
    try:
        # Get list of existing pages
        existing_docs = await storage.get_documents(request.knowledgebase_id, DocumentType.CRAWLED)
        if not existing_docs or 'files' not in existing_docs:
            raise HTTPException(
                status_code=404,
                detail=f"No existing pages found in knowledgebase {request.knowledgebase_id}"
            )

        # Extract URLs from existing pages
        urls_to_recrawl = [
            file.get('url') for file in existing_docs['files']
            if file.get('url')  # Only include files that have URLs
        ]

        if not urls_to_recrawl:
            raise HTTPException(
                status_code=404,
                detail="No valid URLs found to recrawl"
            )

        # Initialize crawler with special settings for recrawl
        crawler = WebCrawler(
            base_url=urls_to_recrawl[0],  # Use first URL as base (not important for recrawl)
            knowledgebase_id=request.knowledgebase_id,
            storage=storage,
            max_depth=1,  # No need to crawl links since we're just updating existing pages
            max_pages=len(urls_to_recrawl)  # Set limit to exact number of pages
        )

        # Manually set the URLs to crawl
        crawler.urls_to_recrawl = urls_to_recrawl

        # Crawl the pages
        logger.info(f"Starting recrawl of {len(urls_to_recrawl)} pages")
        crawled_pages = await crawler.recrawl()

        if not crawled_pages:
            raise HTTPException(
                status_code=400,
                detail="No content could be recrawled from the existing URLs"
            )

        # Create a map of URLs to their existing file info
        url_to_file = {file.get('url', ''): file for file in existing_docs['files']}
        
        # Update existing files with new content
        updated_files = []
        for page in crawled_pages:
            url = page.get('url', '')
            if url in url_to_file:
                existing_file = url_to_file[url]
                # Keep the same path and filename, just update content and size
                storage.s3_client.put_object(
                    Bucket=storage.bucket,
                    Key=existing_file['path'],
                    Body=page.get('content', '').encode('utf-8'),
                    ContentType='text/html; charset=utf-8'
                )
                updated_files.append({
                    **existing_file,
                    'size': len(page.get('content', '')),
                    'last_updated': datetime.utcnow().isoformat()
                })

        # Update metadata with the updated files
        metadata_path = f"{request.knowledgebase_id}/{DocumentType.CRAWLED.value}/metadata.json"
        metadata_content = {
            "files": updated_files,
            "custom_metadata": existing_docs.get('custom_metadata', {}),
            "timestamp": datetime.utcnow().isoformat()
        }

        storage.s3_client.put_object(
            Bucket=storage.bucket,
            Key=metadata_path,
            Body=json.dumps(metadata_content),
            ContentType='application/json'
        )

        return {
            "status": "success",
            "message": f"Successfully recrawled and updated {len(updated_files)} pages",
            "data": metadata_content
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during recrawling: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/delete-files")
async def delete_files(request: DeleteFilesRequest):
    """Delete multiple files by their filenames from a knowledgebase."""
    try:
        # Get existing documents
        existing_docs = await storage.get_documents(request.knowledgebase_id, DocumentType.FILES)
        if not existing_docs or 'files' not in existing_docs:
            raise HTTPException(
                status_code=404,
                detail=f"No documents found for knowledgebase {request.knowledgebase_id}"
            )

        # Track which files to keep and which to delete
        files_to_delete = []
        files_to_keep = []

        # Create a set of filenames for efficient lookup
        filenames_to_delete = set(request.filenames)

        for file_info in existing_docs['files']:
            if file_info.get('filename') in filenames_to_delete:
                files_to_delete.append(file_info)
            else:
                files_to_keep.append(file_info)

        if not files_to_delete:
            raise HTTPException(
                status_code=404,
                detail="None of the specified files were found"
            )

        # Delete files from S3
        for file_info in files_to_delete:
            try:
                storage.s3_client.delete_object(
                    Bucket=storage.bucket,
                    Key=file_info['path']
                )
                logger.info(f"Deleted file: {file_info['path']}")
            except Exception as e:
                logger.error(f"Error deleting file {file_info['path']}: {str(e)}")

        # Update metadata.json with remaining files
        metadata_content = {
            "files": files_to_keep,
            "custom_metadata": existing_docs.get('custom_metadata', {}),
            "timestamp": datetime.utcnow().isoformat()
        }

        metadata_path = f"{request.knowledgebase_id}/{DocumentType.FILES.value}/metadata.json"
        storage.s3_client.put_object(
            Bucket=storage.bucket,
            Key=metadata_path,
            Body=json.dumps(metadata_content),
            ContentType='application/json'
        )

        return {
            "status": "success",
            "message": f"Successfully deleted {len(files_to_delete)} files",
            "deleted_files": [file_info['filename'] for file_info in files_to_delete],
            "remaining_files": len(files_to_keep)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/delete-urls")
async def delete_urls(request: DeleteUrlsRequest):
    """Delete multiple URLs and their associated files from a knowledgebase."""
    try:
        # Get existing documents
        existing_docs = await storage.get_documents(request.knowledgebase_id, DocumentType.CRAWLED)
        if not existing_docs or 'files' not in existing_docs:
            raise HTTPException(
                status_code=404,
                detail=f"No documents found for knowledgebase {request.knowledgebase_id}"
            )

        # Track which files to keep and which to delete
        files_to_delete = []
        files_to_keep = []

        # Create a set of URLs for efficient lookup, strip trailing slashes for consistency
        urls_to_delete = {url.rstrip('/') for url in request.urls}

        for file_info in existing_docs['files']:
            file_url = file_info.get('url', '').rstrip('/')  # Strip trailing slash for consistency
            if file_url in urls_to_delete:
                files_to_delete.append(file_info)
            else:
                files_to_keep.append(file_info)

        if not files_to_delete:
            raise HTTPException(
                status_code=404,
                detail="None of the specified URLs were found"
            )

        # Delete files from S3
        for file_info in files_to_delete:
            try:
                storage.s3_client.delete_object(
                    Bucket=storage.bucket,
                    Key=file_info['path']
                )
                logger.info(f"Deleted file: {file_info['path']}")
            except Exception as e:
                logger.error(f"Error deleting file {file_info['path']}: {str(e)}")

        # Update metadata.json with remaining files
        metadata_content = {
            "files": files_to_keep,
            "custom_metadata": existing_docs.get('custom_metadata', {}),
            "timestamp": datetime.utcnow().isoformat()
        }

        metadata_path = f"{request.knowledgebase_id}/{DocumentType.CRAWLED.value}/metadata.json"
        storage.s3_client.put_object(
            Bucket=storage.bucket,
            Key=metadata_path,
            Body=json.dumps(metadata_content),
            ContentType='application/json'
        )

        return {
            "status": "success",
            "message": f"Successfully deleted {len(files_to_delete)} files",
            "deleted_urls": [file_info['url'] for file_info in files_to_delete],
            "remaining_files": len(files_to_keep)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting URLs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/knowledgebase/{knowledgebase_id}")
async def delete_knowledgebase(knowledgebase_id: str):
    """Delete all storage associated with a knowledgebase."""
    try:
        # List all objects with the knowledgebase_id prefix
        paginator = storage.s3_client.get_paginator('list_objects_v2')
        deleted_count = 0
        
        # Use regular for loop since boto3 paginator doesn't support async
        for page in paginator.paginate(Bucket=storage.bucket, Prefix=f"{knowledgebase_id}/"):
            if 'Contents' in page:
                # Create list of objects to delete
                objects_to_delete = [{'Key': obj['Key']} for obj in page['Contents']]
                if objects_to_delete:
                    # Delete objects in batch
                    storage.s3_client.delete_objects(
                        Bucket=storage.bucket,
                        Delete={'Objects': objects_to_delete}
                    )
                    deleted_count += len(objects_to_delete)
                    logger.info(f"Deleted {len(objects_to_delete)} objects for knowledgebase {knowledgebase_id}")
        
        if deleted_count == 0:
            return {
                "status": "success",
                "message": f"No objects found for knowledgebase {knowledgebase_id}"
            }
            
        # Also clean up the vector store if it exists
        vector_store_path = get_vector_store_path(knowledgebase_id)
        if vector_store_path.exists():
            shutil.rmtree(vector_store_path)
            logger.info(f"Cleaned up vector store for knowledgebase {knowledgebase_id}")
            
        return {
            "status": "success",
            "message": f"Successfully deleted {deleted_count} objects for knowledgebase {knowledgebase_id}"
        }
    except Exception as e:
        logger.error(f"Error deleting knowledgebase storage: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting knowledgebase storage: {str(e)}")

@app.get("/knowledgebase/{knowledgebase_id}/character-count")
async def get_character_count(knowledgebase_id: str):
    """Get character count for all document types in a knowledgebase."""
    try:
        total_chars = 0
        counts_by_type = {
            'files': 0,
            'text': 0,
            'qa': 0,
            'crawled': 0
        }
        
        # Check each document type
        for doc_type in [DocumentType.FILES, DocumentType.TEXT, DocumentType.QA, DocumentType.CRAWLED]:
            try:
                docs = await storage.get_documents(knowledgebase_id, doc_type)
                type_chars = 0
                
                if docs:
                    if doc_type == DocumentType.TEXT:
                        # For text documents, get content directly
                        if 'content' in docs:
                            type_chars = len(docs['content'])
                    
                    elif doc_type == DocumentType.QA:
                        # For QA pairs, count both questions and answers
                        if 'content' in docs and 'qa_pairs' in docs['content']:
                            for qa_pair in docs['content']['qa_pairs']:
                                type_chars += len(qa_pair.get('question', ''))
                                type_chars += len(qa_pair.get('answer', ''))
                    
                    elif doc_type in [DocumentType.FILES, DocumentType.CRAWLED]:
                        # For files and crawled documents, use the size from metadata
                        if 'files' in docs:
                            type_chars = sum(file.get('size', 0) for file in docs['files'])
                
                counts_by_type[doc_type.value] = type_chars
                total_chars += type_chars
                
            except Exception as e:
                logger.warning(f"Error counting characters for {doc_type.value}: {str(e)}")
                # Keep the initialized value of 0 for this type
        
        return {
            "status": "success",
            "data": {
                "total": total_chars,
                "by_type": counts_by_type
            }
        }
    
    except Exception as e:
        logger.error(f"Error getting character count: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/knowledgebase/{knowledgebase_id}/chunks", response_model=GetChunksResponse)
async def get_knowledgebase_chunks(knowledgebase_id: str):
    """Retrieve all processed chunks for a given knowledgebase."""
    vector_store_path = get_vector_store_path(knowledgebase_id)
    index_file = vector_store_path / "index.faiss"

    if not index_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Knowledgebase '{knowledgebase_id}' has not been trained or its vector store is missing."
        )

    # Try to get an existing query interface or create a new one
    query_interface = query_instances.get(knowledgebase_id)
    if not query_interface:
        # Minimal config needed for RagQuery to load the vector store
        # The actual LLM config isn't strictly necessary if we're just accessing the docstore
        # but RagQuery constructor might expect certain keys.
        # We use a placeholder config that allows it to initialize.
        placeholder_config = {
            "llm_service": "openai", # Default or any valid service type
            "llm_config": {"model_name": "gpt-3.5-turbo"}, # Default or any valid model
            "rerank_model": "rerank-lite-1",
            "top_k": 3
        }
        try:
            query_interface = create_query_interface(knowledgebase_id, placeholder_config)
        except Exception as e:
            logger.error(f"Error creating query interface for chunks retrieval ({knowledgebase_id}): {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Could not load knowledgebase '{knowledgebase_id}' for retrieving chunks: {str(e)}"
            )
    
    if not query_interface or not query_interface.vector_store or not hasattr(query_interface.vector_store, 'docstore'):
        raise HTTPException(
            status_code=500,
            detail=f"Vector store for '{knowledgebase_id}' is not loaded correctly or has no docstore."
        )

    try:
        # FAISS docstore is typically a Dict[str, Document]
        # The actual attribute might be _dict if it's a langchain_community.docstore.InMemoryDocstore
        if not hasattr(query_interface.vector_store.docstore, '_dict'):
             raise HTTPException(
                status_code=500,
                detail=f"Docstore for '{knowledgebase_id}' does not have the expected '_dict' attribute."
            )
        
        docstore_dict = query_interface.vector_store.docstore._dict
        
        response_chunks = []
        logger.info(f"Inspecting metadata from loaded docstore for KB: {knowledgebase_id}") # New log
        processed_count = 0 # Counter for logging a few items

        for chunk_id, document in docstore_dict.items():
            if processed_count < 3: # Log details for the first 3 chunks
                logger.info(f"Chunk ID: {chunk_id} - Metadata Type: {type(document.metadata)}")
                logger.info(f"Chunk ID: {chunk_id} - Metadata Content: {document.metadata}")
                processed_count += 1

            response_chunks.append(Chunk(
                chunk_id=chunk_id,
                page_content=document.page_content,
                metadata=document.metadata,
                chunk_summary=document.metadata.get('chunk_summary'),
                chunk_priority=document.metadata.get('chunk_priority'),
                chunk_topics=document.metadata.get('chunk_topics'),
                chunk_topics_source=document.metadata.get('chunk_topics_source')
            ))
        
        return GetChunksResponse(
            knowledgebase_id=knowledgebase_id,
            total_chunks=len(response_chunks),
            chunks=response_chunks
        )

    except AttributeError as ae:
        logger.error(f"Attribute error accessing docstore for {knowledgebase_id}: {str(ae)}")
        raise HTTPException(
            status_code=500,
            detail=f"Could not access document chunks for '{knowledgebase_id}'. The docstore structure might have changed."
        )
    except Exception as e:
        logger.error(f"Error retrieving chunks for {knowledgebase_id}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected error occurred while retrieving chunks for '{knowledgebase_id}': {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=4003, reload=True) 