import json
import logging
from typing import List, Dict, Any, Optional
import asyncio # Added for initializing GeminiService
import html # Added for HTML entity decoding

# Import the new dedicated Gemini service
from rag_py.llm_services.gemini_internal_service import GeminiInternalService

class RAGEnhancementService:
    def __init__(self, llm_config: Dict[str, Any], logger: Optional[logging.Logger] = None, agent_prompt: Optional[str] = None):
        self.logger = logger if logger else logging.getLogger(__name__)
        self.agent_prompt = agent_prompt
        
        # Configuration for the dedicated GeminiInternalService
        enhancements_model_name = llm_config.get("model_name_enhancements", "gemini-1.5-flash-latest")
        # You had changed this to gemini-2.0-flash, let's use that or make it configurable.
        # For safety, I'll stick to your last preference for the default if not in config.
        user_preferred_enh_model = llm_config.get("user_model_name_enhancements", "gemini-1.5-flash-latest") # Using your change from previous step
        enhancements_model_name = llm_config.get("model_name_enhancements", user_preferred_enh_model) 

        enhancements_temperature = llm_config.get("temperature_enhancements", 0.5)
        enhancements_max_retries = llm_config.get("max_retries_enhancements", 3)
        # API key environment variable name can also be made configurable if needed
        # api_key_env_var = llm_config.get("enhancements_api_key_env", "GOOGLE_API_KEY")

        self.llm_client = GeminiInternalService(
            model_name=enhancements_model_name,
            temperature=enhancements_temperature,
            max_retries=enhancements_max_retries
            # api_key_env_var=api_key_env_var # if you make it configurable
        )
        self.logger.info(f"RAGEnhancementService initialized with dedicated GeminiInternalService using model: {enhancements_model_name}. Agent prompt provided: {bool(self.agent_prompt)}")

        # It's important to initialize the GeminiService. 
        # Since __init__ cannot be async, we need a way to ensure it's initialized.
        # Option 1: Call an async method from an async context where RAGEnhancementService is created.
        # Option 2: Use asyncio.run_coroutine_threadsafe if in a sync context with an event loop.
        # Option 3: Create a separate async factory method for RAGEnhancementService.
        # For now, assuming this service is created in an async context (like FastAPI startup or endpoint)
        # we might expect an explicit `await self.llm_client.initialize()` call after creation.
        # However, to make it more self-contained during instantiation if possible,
        # we can try to schedule it if an event loop is running.
        # This is a bit tricky in a synchronous __init__.
        # A simple approach is to require the caller to initialize it, or do it lazily before first use.
        # For simplicity in this edit, I will assume it will be initialized before first actual use.
        # The initialize call has been moved to where it's first used in the `api.py` or make methods below handle it.

    async def _ensure_llm_initialized(self):
        # Check the specific attribute name used in GeminiInternalService
        if not self.llm_client.llm_model: 
            self.logger.info("LLM client (GeminiInternalService) not initialized. Initializing now...")
            await self.llm_client.initialize()
            self.logger.info("GeminiInternalService initialized successfully.")

    async def generate_chunk_topics(self, chunk_text: str, chunk_summary: Optional[str] = None) -> Dict[str, Any]:
        """Generates a list of topics for a given text chunk."""
        await self._ensure_llm_initialized()
        
        text_to_analyze = html.unescape(chunk_summary if chunk_summary and len(chunk_summary) > 20 else chunk_text)
        
        max_len_for_topics = 1500 
        if len(text_to_analyze) > max_len_for_topics:
            text_to_analyze = text_to_analyze[:max_len_for_topics] + "..."

        self.logger.info(f"Generating topics for text: '{text_to_analyze[:100]}...' (using {'summary' if chunk_summary and len(chunk_summary) > 20 else 'raw text'})")

        prompt = f"""Analyze the following text content and identify the 3-5 primary topics it covers. 
List these topics as a JSON array of short, concise strings (1-3 words per topic if possible).

Content to analyze:
\"""{text_to_analyze}\"""

Respond ONLY with the raw JSON array of topic strings, without any surrounding text or markdown formatting. For example: ["topic one", "topic two", "topic three"]

Topics (JSON array):
"""
        try:
            response = await self.llm_client.generate(prompt, max_tokens=100)
            raw_response_text = response.get("text", "[]").strip()
            
            self.logger.info(f"LLM raw response for topics: '{raw_response_text}'")
            
            # Attempt to strip markdown fences if present
            cleaned_response_text = raw_response_text
            if cleaned_response_text.startswith("```json"):
                cleaned_response_text = cleaned_response_text[len("```json"):]
            if cleaned_response_text.startswith("```"):
                cleaned_response_text = cleaned_response_text[len("```"):]
            if cleaned_response_text.endswith("```"):
                cleaned_response_text = cleaned_response_text[:-len("```")]
            cleaned_response_text = cleaned_response_text.strip()

            self.logger.info(f"Cleaned LLM response for JSON parsing: '{cleaned_response_text}'")

            topics = []
            source = "llm"
            try:
                parsed_topics = json.loads(cleaned_response_text)
                self.logger.info(f"Parsed topics JSON: {parsed_topics} (type: {type(parsed_topics)})")
                
                if isinstance(parsed_topics, list) and all(isinstance(topic, str) for topic in parsed_topics):
                    topics = [topic.strip().lower() for topic in parsed_topics if topic.strip()]
                    topics = topics[:7]
                    self.logger.info(f"Final processed topics from LLM: {topics}")
                else:
                    self.logger.warning(f"LLM topic response (after cleaning) was not a list of strings: '{cleaned_response_text}'. Type: {type(parsed_topics)}, Content: {parsed_topics}. Attempting fallback.")
                    # If not a list of strings, attempt fallback
                    topics = self._extract_topics_fallback(raw_response_text) # Use original raw for fallback
                    source = "fallback_extraction"
            except json.JSONDecodeError as je:
                self.logger.warning(f"Failed to parse cleaned LLM topic response as JSON: '{cleaned_response_text}'. JSON Error: {je}. Attempting fallback extraction.")
                topics = self._extract_topics_fallback(raw_response_text) # Use original raw for fallback
                source = "fallback_extraction"
                if topics:
                    self.logger.info(f"Fallback extraction successful: {topics}")
                else:
                    self.logger.warning("Fallback extraction also failed. Using basic keywords as topics.")
                    topics = self._extract_basic_keywords(text_to_analyze)
                    source = "basic_keywords"
            
            self.logger.info(f"Generated chunk topics: {topics} (count: {len(topics)}, source: {source})")
            return {"topics": topics, "source": source}
        except Exception as e:
            self.logger.error(f"Error in generate_chunk_topics: {e}", exc_info=True)
            return {"topics": [], "source": "error"}

    def _extract_topics_fallback(self, response_text: str) -> List[str]:
        """Fallback method to extract topics from LLM response when JSON parsing fails."""
        topics = []
        
        # Look for patterns like quoted strings that might be topics
        import re
        
        # Try to find quoted strings
        quoted_patterns = re.findall(r'"([^"]+)"', response_text)
        if quoted_patterns:
            topics = [topic.strip().lower() for topic in quoted_patterns if topic.strip()][:5]
        
        # If no quoted strings, try to find comma-separated values
        if not topics:
            # Remove common prefixes and suffixes
            cleaned_text = response_text.replace("Topics:", "").replace("topics:", "").strip()
            if "," in cleaned_text:
                potential_topics = [t.strip().lower() for t in cleaned_text.split(",")]
                topics = [t for t in potential_topics if t and len(t.split()) <= 3][:5]
        
        return topics
    
    def _extract_basic_keywords(self, text: str) -> List[str]:
        """Extract basic keywords from text as a last resort for topics."""
        import re
        
        # Remove common words and extract potential keywords
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        
        # Common stop words to filter out
        stop_words = {'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'men', 'put', 'say', 'she', 'too', 'use', 'way', 'will', 'with', 'about', 'after', 'again', 'away', 'back', 'been', 'before', 'being', 'came', 'come', 'could', 'each', 'even', 'first', 'from', 'give', 'good', 'great', 'have', 'here', 'into', 'just', 'know', 'last', 'life', 'like', 'little', 'long', 'look', 'made', 'make', 'most', 'much', 'must', 'never', 'only', 'other', 'over', 'said', 'same', 'should', 'since', 'some', 'such', 'take', 'than', 'that', 'their', 'them', 'there', 'these', 'they', 'this', 'time', 'very', 'want', 'well', 'went', 'were', 'what', 'when', 'where', 'which', 'while', 'work', 'would', 'year', 'your'}
        
        # Filter out stop words and get unique keywords
        keywords = list(set([word for word in words if word not in stop_words and len(word) > 3]))
        
        # Return top 3 keywords as basic topics
        return keywords[:3]

    async def generate_chunk_summary(self, chunk_text: str) -> str:
        await self._ensure_llm_initialized()
        max_summary_input_len = 2000 # Max characters of chunk text for summarization
        if len(chunk_text) > max_summary_input_len:
            chunk_text_for_prompt = chunk_text[:max_summary_input_len] + "..."
        else:
            chunk_text_for_prompt = chunk_text

        current_prompt = f"""Summarize the following text chunk, focusing on its main topic and key information. The summary should be concise and capture the essence of the chunk in one or two sentences.

Chunk:
\"""{chunk_text_for_prompt}\"""

Summary:"""
        try:
            response = await self.llm_client.generate(current_prompt, max_tokens=150)
            summary = response.get("text", "Error: Could not generate summary.").strip()
            self.logger.debug(f"Generated chunk summary: {summary[:100]}...")
            return summary
        except Exception as e:
            self.logger.error(f"Error in generate_chunk_summary: {e}", exc_info=True)
            return "Error: Could not generate summary due to an exception."

    async def generate_chunk_priority(self, chunk_text: str, chunk_summary: Optional[str] = None) -> int:
        await self._ensure_llm_initialized()
        text_to_analyze = chunk_summary if chunk_summary and len(chunk_summary) > 20 else chunk_text
        max_len_for_priority = 1000 
        if len(text_to_analyze) > max_len_for_priority:
            text_to_analyze = text_to_analyze[:max_len_for_priority] + "..."
            
        # Construct the core part of the prompt for priority assignment
        priority_prompt_core = f"""Content to prioritize:
\"""{text_to_analyze}\"""

Assign a priority score from 1 (low) to 5 (high) to this content based on its perceived importance, information density, and direct relevance for answering user queries. 

Consider these general guidelines for scoring:
- 5: Crucial, core information; direct answers to likely primary questions; key definitions, solutions, main product features, or critical calls to action.
- 4: Important supporting details; significant explanations, benefits, or secondary product features; contact information; detailed pricing or plans.
- 3: Relevant contextual information; background details; general examples; "about us" information; business hours.
- 2: Minor or tangential details; less critical elaborations; general company culture or policies (unless directly about customer interaction).
- 1: Boilerplate; repetitive text; navigational links; or very low unique information content.
"""

        # Add agent-specific instructions if an agent_prompt is available
        agent_context_instructions = ""
        if self.agent_prompt:
            agent_context_instructions = f"""\nThis content is for an agent whose primary role/prompt is: "{self.agent_prompt[:500]}..."
Given this agent's role, pay special attention to information directly related to its purpose. For example, if the agent is about sales, pricing and product features are very high priority. If it's about support, troubleshooting steps are high priority.

Specifically, elevate the priority if the content directly addresses typical business-critical topics such as:
- Detailed product/service descriptions, features, and benefits.
- Pricing, plans, and purchase information.
- Contact details (phone numbers, email addresses, physical addresses).
- Business hours and availability.
- "About Us" or company mission statements.
- Key calls to action or next steps for a user.

If the content clearly falls into one of these business-critical categories AND aligns with the agent's role, it should generally receive a higher score (4 or 5).
"""

        final_prompt = f"{priority_prompt_core}{agent_context_instructions}\n\nReturn ONLY the integer priority score (1-5) and nothing else:"

        try:
            response = await self.llm_client.generate(final_prompt, max_tokens=10)
            priority_str = response.get("text", "3").strip()
            # Extract digits only, in case the LLM returns "Priority: 3" or similar
            digits = "".join(filter(str.isdigit, priority_str))
            priority = int(digits) if digits else 3
            
            if not 1 <= priority <= 5:
                self.logger.warning(f"Parsed priority {priority} out of range (1-5). Defaulting to 3. Original string: '{priority_str}'")
                priority = 3
            
            self.logger.debug(f"Generated chunk priority: {priority}")
            return priority
        except ValueError:
            self.logger.warning(f"Could not parse priority from '{priority_str}'. Defaulting to 3.", exc_info=True)
            return 3
        except Exception as e:
            self.logger.error(f"Error in generate_chunk_priority: {e}", exc_info=True)
            return 3 

    async def generate_knowledge_base_summary(self, chunk_documents: List[Any]) -> Dict[str, Any]:
        await self._ensure_llm_initialized()
        # '''Any''' here represents Langchain Document objects
        if not chunk_documents:
            self.logger.warning("No chunk documents provided for knowledge base summary.")
            return {
                "overall_theme": "N/A - No content provided.",
                "key_topics_entities": [],
                "content_overview": "N/A - No content to summarize.",
                "estimated_detail_level": "N/A",
                "knowledge_base_topics": [] # Added new key
            }

        # Use a sample of chunk summaries or content for the KB summary to manage token limits
        # Prefer summaries if available and seem reasonable
        input_snippets = []
        for doc in chunk_documents[:30]: # Use up to the first 30 chunks for summary
            summary = doc.metadata.get('chunk_summary')
            if summary and len(summary) > 20 and "Error" not in summary: # Basic check for a valid summary
                input_snippets.append(f"Summary: {summary}")
            else:
                input_snippets.append(f"Content Snippet: {doc.page_content[:200]}...") # Fallback to content snippet

        combined_input_text = "\n\n---\n\n".join(input_snippets)
        max_len_kb_summary_input = 8000 
        if len(combined_input_text) > max_len_kb_summary_input:
            combined_input_text = combined_input_text[:max_len_kb_summary_input] + "\n... (input truncated for brevity)"

        prompt = f"""Based on the following collection of chunk summaries and/or content snippets from a knowledge base, provide a comprehensive structured summary. This summary is intended to give a clear overview of the knowledge base'''s contents.
        
        The structured summary MUST be a valid JSON object with the following keys:
        - "overall_theme": (String) A concise sentence (1-2 sentences) describing the main subject matter or purpose of the knowledge base.
        - "key_topics_entities": (List of strings) A list of 5-10 of the most important, distinct, and frequently occurring topics, concepts, or entities covered.
        - "content_overview": (String) A short paragraph (3-5 sentences) summarizing the type of information available, its general scope, and potential utility.
        - "estimated_detail_level": (String) A qualitative assessment of the information'''s depth (e.g., "High-level overviews", "Detailed technical specifications", "Mixed: General introductions and specific examples", "Q&A format").

        Collection of Summaries/Snippets:
        \"""
        {combined_input_text}
        \"""

        Respond ONLY with the raw JSON object, without any surrounding text or markdown formatting:"""
        
        default_error_summary = {
            "overall_theme": "Error generating summary.",
            "key_topics_entities": [],
            "content_overview": "Could not generate a knowledge base summary due to an error.",
            "estimated_detail_level": "Unknown",
            "knowledge_base_topics": [] # Added new key
        }

        try:
            response = await self.llm_client.generate(prompt, max_tokens=600) # Allow more tokens for JSON
            raw_response_text = response.get("text", "").strip()
            
            # Attempt to extract JSON even if it'''s embedded or slightly malformed
            try:
                # Look for first '{' and last '}'
                start_index = raw_response_text.find('{')
                end_index = raw_response_text.rfind('}')
                if start_index != -1 and end_index != -1 and end_index > start_index:
                    json_str = raw_response_text[start_index : end_index+1]
                    summary_json = json.loads(json_str)
                else: # Fallback if no clear JSON object is found
                    # This specific error message is for clarity, though json.loads would raise its own.
                    raise json.JSONDecodeError("No JSON object structure found in LLM response", raw_response_text, 0)

                # Compile knowledge base topics from chunk metadata
                all_chunk_topics = set()
                for doc in chunk_documents:
                    if hasattr(doc, 'metadata') and isinstance(doc.metadata, dict):
                        chunk_topics = doc.metadata.get('chunk_topics', [])
                        if isinstance(chunk_topics, list):
                            for topic in chunk_topics:
                                if isinstance(topic, str) and topic.strip():
                                    all_chunk_topics.add(topic.strip().lower())
                
                summary_json["knowledge_base_topics"] = sorted(list(all_chunk_topics))

            except json.JSONDecodeError as je:
                self.logger.error(f"Failed to parse LLM KB summary response as JSON: {je}. Response: '{raw_response_text}'", exc_info=True)
                # Try to provide a more informative error in the summary itself
                error_summary = default_error_summary.copy()
                error_summary["error_details"] = f"JSON parsing failed. LLM response: {raw_response_text[:200]}..."
                # error_summary["knowledge_base_topics"] will be [] from default_error_summary
                return error_summary

            self.logger.info("Successfully generated knowledge base summary including topics.")
            return summary_json
        except Exception as e:
            self.logger.error(f"Critical error in generate_knowledge_base_summary: {e}", exc_info=True)
            # default_error_summary already includes knowledge_base_topics: []
            return default_error_summary 