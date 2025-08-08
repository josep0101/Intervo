import asyncio
from typing import List, Dict, Any, Optional
import logging
from urllib.parse import urljoin, urlparse
import aiohttp
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET
from datetime import datetime
import time
from ratelimit import limits, sleep_and_retry
import re
import os
from dotenv import load_dotenv
import json
from storage import DocumentType

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), '..', '.env.development')
load_dotenv(env_path)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

ONE_MINUTE = 60
MAX_CALLS_PER_MINUTE = 30  # Adjust based on target site's rate limits

class WebCrawler:
    def __init__(self, base_url: str, knowledgebase_id: str, storage: 'S3Storage', max_depth: int = 2, max_pages: int = 100):
        """
        Initialize the web crawler.
        
        Args:
            base_url: The starting URL to crawl
            knowledgebase_id: ID of the knowledgebase to check for existing URLs
            storage: S3Storage instance for checking existing URLs
            max_depth: Maximum depth of pages to crawl (default: 2)
            max_pages: Maximum number of pages to crawl (default: 100)
        """
        self.base_url = base_url
        self.knowledgebase_id = knowledgebase_id
        self.storage = storage
        self.max_depth = max_depth
        self.max_pages = max_pages
        self.visited_urls = set()
        self.session = None
        self.domain = urlparse(base_url).netloc
        
        # Get Jina AI API key
        self.jina_api_key = os.getenv("JINA_API_KEY")
        if not self.jina_api_key:
            raise ValueError("JINA_API_KEY environment variable is not set")
        
    async def __aenter__(self):
        """Set up async context manager."""
        timeout = aiohttp.ClientTimeout(total=30)  # 30 seconds timeout
        self.session = aiohttp.ClientSession(timeout=timeout)
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Clean up async context manager."""
        if self.session:
            await self.session.close()

    @sleep_and_retry
    @limits(calls=MAX_CALLS_PER_MINUTE, period=ONE_MINUTE)
    async def _fetch_url_with_jina(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Fetch URL content using Jina AI's reader API.
        
        Args:
            url: URL to fetch
            
        Returns:
            Dictionary containing content and metadata if successful, None otherwise
        """
        try:
            jina_url = f"https://r.jina.ai/{url}"
            headers = {
                "Authorization": f"Bearer {self.jina_api_key}"
            }
            
            async with self.session.get(jina_url, headers=headers) as response:
                if response.status == 200:
                    text_content = await response.text()
                    # Parse the text content into our expected structure
                    # The content typically starts with "Title:" followed by markdown content
                    lines = text_content.split('\n')
                    title = ''
                    content = ''
                    
                    # Extract title if present
                    if lines and lines[0].startswith('Title:'):
                        title = lines[0].replace('Title:', '').strip()
                        lines = lines[1:]  # Remove title line
                    
                    # Join remaining lines as content
                    content = '\n'.join(lines).strip()
                    
                    return {
                        "title": title,
                        "text": content,
                        "url": url
                    }
                    
                logger.warning(f"Failed to fetch {url} with Jina AI, status: {response.status}")
                return None
        except Exception as e:
            logger.error(f"Error fetching {url} with Jina AI: {str(e)}")
            return None

    async def _fetch_links(self, url: str) -> Optional[str]:
        """Fetch URL content for link extraction only."""
        try:
            async with self.session.get(url) as response:
                if response.status == 200:
                    return await response.text()
                return None
        except Exception as e:
            logger.error(f"Error fetching links from {url}: {str(e)}")
            return None

    def _extract_metadata(self, jina_response: Dict[str, Any], url: str) -> Dict[str, Any]:
        """Extract and format metadata from Jina AI response."""
        metadata = {
            'url': url,
            'crawled_at': datetime.utcnow().isoformat(),
            'title': jina_response.get('title'),
            'description': jina_response.get('description'),
            'last_modified': None,  # Jina might provide this in the future
            'author': jina_response.get('author'),
            'language': jina_response.get('language'),
            'word_count': jina_response.get('word_count'),
            'page_type': jina_response.get('page_type')
        }
        return {k: v for k, v in metadata.items() if v is not None}

    def _is_valid_url(self, url: str) -> bool:
        """Check if URL is valid and belongs to the same domain."""
        try:
            parsed = urlparse(url)
            return bool(parsed.netloc) and parsed.netloc == self.domain
        except Exception:
            return False

    async def _extract_links(self, html_content: str, base_url: str) -> List[str]:
        """Extract valid links from the page."""
        links = []
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            for link in soup.find_all('a', href=True):
                url = link['href']
                absolute_url = urljoin(base_url, url)
                # Prefer HTTPS over HTTP for the same URL
                if absolute_url.startswith('http://'):
                    https_url = 'https://' + absolute_url[7:]
                    # Add both but put HTTPS first in the list
                    if self._is_valid_url(https_url) and https_url not in self.visited_urls:
                        links.append(https_url)
                if self._is_valid_url(absolute_url) and absolute_url not in self.visited_urls:
                    links.append(absolute_url)
        except Exception as e:
            logger.error(f"Error extracting links from {base_url}: {str(e)}")
        return links

    async def _process_sitemap(self, sitemap_url: str) -> List[tuple]:
        """Process XML sitemap and extract URLs with priorities."""
        try:
            content = await self._fetch_links(sitemap_url)
            if not content:
                return []
                
            urls_with_priority = []
            root = ET.fromstring(content)
            
            # Handle both regular sitemaps and sitemap index files
            namespaces = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
            
            # Check if it's a sitemap index
            sitemap_locations = root.findall('.//sm:loc', namespaces)
            
            if sitemap_locations:  # It's either a sitemap or sitemap index
                for loc in sitemap_locations:
                    url = loc.text
                    if url.endswith('.xml'):  # It's a sitemap index
                        # Recursively process sub-sitemaps
                        sub_urls = await self._process_sitemap(url)
                        urls_with_priority.extend(sub_urls)
                    else:  # It's a regular sitemap
                        # Check for priority tag
                        parent = loc.getparent()
                        priority = 0.5  # Default priority
                        if parent is not None:
                            priority_tag = parent.find('sm:priority', namespaces)
                            if priority_tag is not None and priority_tag.text:
                                try:
                                    priority = float(priority_tag.text)
                                except ValueError:
                                    pass
                        urls_with_priority.append((priority, url))
            
            return urls_with_priority
            
        except Exception as e:
            logger.error(f"Error processing sitemap {sitemap_url}: {str(e)}")
            return []

    def _normalize_url(self, url: str) -> str:
        """
        Normalize URL to prevent duplicates by removing trailing slashes, query params, and fragments.
        IMPORTANT: This must match the storage layer's normalization exactly.
        """
        if not url:
            return ""
        try:
            parsed = urlparse(url)
            # Convert to lowercase and remove trailing slashes
            normalized = f"{parsed.scheme}://{parsed.netloc.lower()}{parsed.path.rstrip('/')}"
            return normalized if normalized[-1] != '/' else normalized + '/'
        except Exception:
            return url

    async def _get_sitemap_urls(self) -> List[str]:
        """Get and process sitemap URLs with proper duplicate detection."""
        sitemap_url = urljoin(self.base_url, '/sitemap.xml')
        all_urls_with_priority = await self._process_sitemap(sitemap_url)
        all_urls = [url for _, url in all_urls_with_priority]
        
        # Get existing URLs from storage
        existing_urls = set()
        try:
            existing_docs = await self.storage.get_documents(self.knowledgebase_id, DocumentType.CRAWLED)
            if existing_docs and 'files' in existing_docs:
                existing_urls = {self._normalize_url(file.get('url')) for file in existing_docs['files'] if file.get('url')}
                logger.info(f"Found {len(existing_urls)} already crawled URLs")
        except Exception as e:
            logger.warning(f"Could not fetch existing URLs: {str(e)}")

        # Check if we've crawled all sitemap URLs
        if all_urls and len(existing_urls) >= len(all_urls):
            logger.info("All sitemap URLs have been crawled, falling back to discovered URLs")
            return []
            
        # Filter and sort URLs to ensure consistent ordering and no duplicates
        available_urls = []
        used_normalized_urls = set()  # Track normalized URLs we've seen
        
        # Sort by priority, highest first
        sorted_urls_with_priority = sorted(all_urls_with_priority, key=lambda x: x[0], reverse=True)
        
        for _, url in sorted_urls_with_priority:
            normalized = self._normalize_url(url)
            if normalized not in existing_urls and normalized not in used_normalized_urls:
                available_urls.append(url)
                used_normalized_urls.add(normalized)
                
        # If no new URLs available, return empty list to trigger fallback
        if not available_urls:
            logger.info("No new sitemap URLs available, falling back to discovered URLs")
            return []

        # Return available URLs sorted by priority
        if available_urls:
            logger.info(f"Found {len(available_urls)} new URLs from sitemap, sorted by priority")
        
        return available_urls

    async def crawl(self) -> List[Dict[str, Any]]:
        """
        Crawl the website until we have exactly max_pages unique pages.
        Prioritizes URLs from sitemap.xml before falling back to discovered links.
        """
        async with self as crawler:
            successful_pages = []
            successful_urls = set()
            discovered_urls = set()
            
            # Get existing URLs from storage first
            existing_urls = set()
            try:
                existing_docs = await self.storage.get_documents(self.knowledgebase_id, DocumentType.CRAWLED)
                if existing_docs and 'files' in existing_docs:
                    existing_urls = {self._normalize_url(file.get('url')) for file in existing_docs['files'] if file.get('url')}
                    logger.info(f"Found {len(existing_urls)} already crawled URLs")
                    
                    # Get links from all existing URLs first
                    for file in existing_docs['files']:
                        if file.get('url'):
                            html_content = await self._fetch_links(file['url'])
                            if html_content:
                                new_links = await self._extract_links(html_content, file['url'])
                                discovered_urls.update(new_links)
                    logger.info(f"Found {len(discovered_urls)} links from existing pages")
            except Exception as e:
                logger.warning(f"Could not fetch existing URLs: {str(e)}")
            
            # Get sitemap URLs with proper duplicate detection and priority sorting
            sitemap_urls = await self._get_sitemap_urls()
            
            # Process URLs: base_url first, then sitemap URLs, then discovered URLs
            urls_to_process = []
            
            # Add base_url as the first URL to process if not already crawled
            base_url_normalized = self._normalize_url(self.base_url)
            if base_url_normalized not in existing_urls:
                urls_to_process.append(self.base_url)
            else:
                # Even if base_url is already crawled, get its links
                logger.info(f"Base URL {self.base_url} already crawled, getting links only")
                html_content = await self._fetch_links(self.base_url)
                if html_content:
                    new_links = await self._extract_links(html_content, self.base_url)
                    discovered_urls.update(new_links)
            
            # Then add sitemap URLs
            urls_to_process.extend(sitemap_urls)
            
            # If no sitemap URLs and base_url already processed, 
            # use base_url for link discovery but don't re-process it
            if not urls_to_process and not sitemap_urls:
                logger.info("Starting with base URL to discover new links")
                html_content = await self._fetch_links(self.base_url)
                if html_content:
                    new_links = await self._extract_links(html_content, self.base_url)
                    discovered_urls.update(new_links)
                    
            # First try to crawl urls_to_process
            for url in urls_to_process:
                if len(successful_pages) >= self.max_pages:
                    break
                    
                normalized_url = self._normalize_url(url)
                if normalized_url in successful_urls or (normalized_url in existing_urls and url != self.base_url):
                    # Even if we skip crawling, try to get more links
                    html_content = await self._fetch_links(url)
                    if html_content:
                        new_links = await self._extract_links(html_content, url)
                        discovered_urls.update(new_links)
                    continue
                
                self.visited_urls.add(url)
                
                # Always try to get links first
                html_content = await self._fetch_links(url)
                if html_content:
                    new_links = await self._extract_links(html_content, url)
                    discovered_urls.update(new_links)
                
                # Then try to get content
                jina_response = await self._fetch_url_with_jina(url)
                if not jina_response:
                    continue
                
                try:
                    metadata = self._extract_metadata(jina_response, url)
                    content = jina_response.get('text', '').strip()
                    
                    if content:
                        path = urlparse(url).path.strip('/')
                        filename = 'index.html' if not path else f"{path.split('?')[0]}.html"
                        
                        successful_pages.append({
                            'content': content,
                            'metadata': metadata,
                            'filename': filename,
                            'url': url
                        })
                        successful_urls.add(normalized_url)
                        existing_urls.add(normalized_url)  # Add to existing URLs so we can still discover links from it
                        logger.info(f"Successfully crawled URL ({len(successful_pages)}/{self.max_pages}): {url}")
                    
                except Exception as e:
                    logger.error(f"Error processing URL {url}: {str(e)}")
                    continue
                
                await asyncio.sleep(0.1)
            
            # Keep trying discovered URLs until we have enough pages or no new URLs to try
            while len(successful_pages) < self.max_pages and discovered_urls:
                logger.info(f"Need {self.max_pages - len(successful_pages)} more pages, trying discovered URLs...")
                
                # Filter and sort discovered URLs
                new_urls_to_try = []
                for url in discovered_urls:
                    normalized = self._normalize_url(url)
                    if (normalized not in successful_urls and 
                        normalized not in existing_urls and
                        normalized not in {self._normalize_url(u) for u in sitemap_urls}):
                        new_urls_to_try.append(url)
                
                if not new_urls_to_try:
                    logger.info("No new discovered URLs to crawl, all URLs have been crawled before")
                    break
                
                new_urls_to_try.sort()  # Ensure consistent ordering
                discovered_urls.clear()  # Clear so we only keep new discoveries
                
                for url in new_urls_to_try:
                    if len(successful_pages) >= self.max_pages:
                        break
                        
                    normalized_url = self._normalize_url(url)
                    if normalized_url in successful_urls or normalized_url in existing_urls:
                        # Even if we skip crawling, try to get more links
                        html_content = await self._fetch_links(url)
                        if html_content:
                            new_links = await self._extract_links(html_content, url)
                            discovered_urls.update(new_links)
                        continue
                    
                    self.visited_urls.add(url)
                    
                    # Always try to get more links
                    html_content = await self._fetch_links(url)
                    if html_content:
                        new_links = await self._extract_links(html_content, url)
                        discovered_urls.update(new_links)
                    
                    jina_response = await self._fetch_url_with_jina(url)
                    if not jina_response:
                        continue
                    
                    try:
                        metadata = self._extract_metadata(jina_response, url)
                        content = jina_response.get('text', '').strip()
                        
                        if content:
                            path = urlparse(url).path.strip('/')
                            filename = 'index.html' if not path else f"{path.split('?')[0]}.html"
                            
                            successful_pages.append({
                                'content': content,
                                'metadata': metadata,
                                'filename': filename,
                                'url': url
                            })
                            successful_urls.add(normalized_url)
                            existing_urls.add(normalized_url)  # Add to existing URLs so we can still discover links from it
                            logger.info(f"Successfully crawled discovered URL ({len(successful_pages)}/{self.max_pages}): {url}")
                    
                    except Exception as e:
                        logger.error(f"Error processing discovered URL {url}: {str(e)}")
                        continue
                    
                    await asyncio.sleep(0.1)
            
            if len(successful_pages) < self.max_pages:
                logger.warning(
                    f"Could only find {len(successful_pages)} new unique pages out of {self.max_pages} requested. "
                    f"Tried {len(self.visited_urls)} URLs (sitemap: {len(sitemap_urls)}, discovered: {len(discovered_urls)})"
                )
            else:
                logger.info(
                    f"Successfully found all {self.max_pages} new unique pages. "
                    f"Used {len(sitemap_urls)} sitemap URLs and {len(discovered_urls)} discovered URLs."
                )
            
            return successful_pages

    async def recrawl(self) -> List[Dict[str, Any]]:
        """
        Recrawl existing pages without discovering new links.
        
        Returns:
            List of dictionaries containing updated page content and metadata
        """
        if not hasattr(self, 'urls_to_recrawl'):
            raise ValueError("urls_to_recrawl must be set before calling recrawl()")

        async with self as crawler:
            pages = []
            
            for url in self.urls_to_recrawl:
                # Fetch content using Jina AI
                jina_response = await self._fetch_url_with_jina(url)
                
                if not jina_response:
                    logger.warning(f"Failed to recrawl {url}")
                    continue
                    
                try:
                    # Extract metadata and clean content from Jina response
                    metadata = self._extract_metadata(jina_response, url)
                    content = jina_response.get('text', '').strip()
                    
                    if content:  # Only add pages with actual content
                        # Handle filename for home page and empty paths
                        path = urlparse(url).path.strip('/')
                        filename = 'index.html' if not path else f"{path}.html"
                        
                        pages.append({
                            'content': content,
                            'metadata': metadata,
                            'filename': filename,
                            'url': url
                        })
                        
                except Exception as e:
                    logger.error(f"Error processing {url}: {str(e)}")
                    continue
                
                # Add small delay between requests
                await asyncio.sleep(0.1)
            
            return pages 