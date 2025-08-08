import asyncio
import logging
from pathlib import Path

from rag_py.rag_service import RagQuery

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Base directory for all vector stores
VECTOR_STORES_DIR = Path("vector_stores")

def get_vector_store_path(knowledgebase_id: str) -> Path:
    """Get the vector store path for a specific knowledgebase."""
    return VECTOR_STORES_DIR / knowledgebase_id

async def main():
    try:
        # Use the existing knowledgebase ID
        knowledgebase_id = "67b6a9f328e0f2ec52344eba"
        vector_store_path = get_vector_store_path(knowledgebase_id)
        
        # Configure to use OpenAI's GPT-4
        config = {
            "llm_service": "openai",  # Specify which service to use
            "llm_config": {
                "model_name": "gpt-4o",  # Use GPT-4 model
                "temperature": 0.7,
            }
        }

        # Create the query interface for existing vector store
        logger.info(f"Creating query interface for knowledgebase: {knowledgebase_id}")
        query_interface = RagQuery(
            vector_store_path=str(vector_store_path),
            config=config
        )

        # Test some queries
        questions = [
            "What are the pricing plans for CodeDesign's AI Website Builder?",
        ]

        for question in questions:
            logger.info(f"\nQuerying: {question}")
            result = await query_interface.query(question)
            logger.info(f"Answer: {result['answer']}")


    except Exception as e:
        logger.error(f"Error in main: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())