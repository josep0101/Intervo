import os
import json
import boto3
from datetime import datetime
from typing import List, Dict, Any, Optional, BinaryIO
from enum import Enum
from botocore.config import Config
from fastapi import UploadFile, HTTPException
import logging
from dotenv import load_dotenv
from pathlib import Path
import botocore
import io

# Load environment variables - try production first, then development, then default .env
base_path = Path(__file__).parent.parent
env_files = ['.env.production', '.env.development', '.env']

env_path = None
for env_file in env_files:
    potential_path = base_path / env_file
    if potential_path.exists():
        env_path = potential_path
        break

if env_path:
    load_dotenv(dotenv_path=env_path)
    print(f"Loaded environment from: {env_path}")
else:
    # Try to load from system environment variables if no file found
    load_dotenv()
    print("No .env file found, using system environment variables")

logger = logging.getLogger(__name__)

class DocumentType(str, Enum):
    FILES = "files"
    TEXT = "text"
    QA = "qa"
    CRAWLED = "crawled"

class S3Storage:
    def __init__(self):
        self.bucket = os.getenv("STORAGE_S3_BUCKET")
        if not self.bucket:
            raise ValueError("STORAGE_S3_BUCKET environment variable is not set")

        # Configure with explicit signature version and addressing style
        config = Config(
            max_pool_connections=int(os.getenv("STORAGE_S3_MAX_SOCKETS", 200)),
            s3={'addressing_style': 'path'},
            signature_version='s3v4',
            retries = {'max_attempts': 3, 'mode': 'standard'}  # Add retries
        )

        endpoint = os.getenv("STORAGE_S3_ENDPOINT")
        if not endpoint:
            raise ValueError("STORAGE_S3_ENDPOINT environment variable is not set")

        self.s3_client = boto3.client(
            's3',
            endpoint_url=endpoint,
            aws_access_key_id=os.getenv("S3_PROTOCOL_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("S3_PROTOCOL_ACCESS_KEY_SECRET"),
            region_name=os.getenv("STORAGE_S3_REGION"),
            config=config
        )

        # Print configuration for debugging
        logger.info(f"S3 Configuration:")
        logger.info(f"Endpoint: {endpoint}")
        logger.info(f"Region: {os.getenv('STORAGE_S3_REGION')}")
        logger.info(f"Bucket: {self.bucket}")

        # First try to create the bucket if it doesn't exist
        try:
            self.s3_client.create_bucket(
                Bucket=self.bucket,
                # CreateBucketConfiguration={'LocationConstraint': 'hel1'} #  Hetzner uses different region names
            )
            logger.info(f"Created bucket: {self.bucket}")
        except self.s3_client.exceptions.BucketAlreadyExists:
            logger.info(f"Bucket {self.bucket} already exists")
        except self.s3_client.exceptions.BucketAlreadyOwnedByYou:
            logger.info(f"Bucket {self.bucket} already owned by you")
        except Exception as e:
            logger.warning(f"Could not create bucket: {str(e)}")

        # Verify bucket exists and is accessible
        try:
            self.s3_client.head_bucket(Bucket=self.bucket)
            logger.info("Successfully connected to bucket")
        except Exception as e:
            logger.error(f"Error accessing bucket {self.bucket}: {str(e)}")
            raise ValueError(f"Cannot access bucket {self.bucket}. Please ensure it exists and credentials are correct. Error: {str(e)}")

    def _get_base_path(self, knowledgebase_id: str, doc_type: DocumentType) -> str:
        """Get the base path for a specific knowledgebase and document type."""
        if not knowledgebase_id:
            raise ValueError("knowledgebase_id cannot be empty")
        return f"{knowledgebase_id}/{doc_type.value}"

    async def store_files(self, knowledgebase_id: str, files: List[UploadFile], metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Store multiple files in the files directory."""
        if not files:
            raise ValueError("No files provided")

        base_path = self._get_base_path(knowledgebase_id, DocumentType.FILES)
        
        # Get existing metadata if it exists
        existing_files = []
        existing_metadata = {}
        try:
            existing_docs = await self.get_documents(knowledgebase_id, DocumentType.FILES)
            if existing_docs:
                existing_files = existing_docs.get('files', [])
                existing_metadata = existing_docs.get('custom_metadata', {})
        except Exception as e:
            logger.warning(f"Could not fetch existing metadata: {str(e)}")

        stored_files = []

        for file in files:
            if not file.filename:
                continue  # Skip files without names

            file_key = f"{base_path}/{file.filename}"
            try:
                # IMPORTANT: Read content into memory *before* using it with boto3.
                # This avoids threading issues with UploadFile.
                contents = await file.read()
                if not contents:  # Skip empty files
                    logger.warning(f"Empty file content for {file.filename}")
                    continue

                # Use BytesIO to create a file-like object from the in-memory bytes
                file_like_object = io.BytesIO(contents)

                self.s3_client.put_object(
                    Bucket=self.bucket,
                    Key=file_key,
                    Body=file_like_object,  # Pass the file-like object
                    ContentType=file.content_type or "application/octet-stream"
                )
                stored_files.append({
                    "filename": file.filename,
                    "path": file_key,
                    "content_type": file.content_type,
                    "size": len(contents)
                })
            except Exception as e:
                logger.error(f"Error storing file {file.filename}: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error storing file {file.filename}: {str(e)}")
            finally:
                # Always close the file after processing
                await file.close()

        # Combine existing and new files
        all_files = existing_files + stored_files

        # Store metadata
        metadata_content = {
            "files": all_files,
            "custom_metadata": {**(existing_metadata or {}), **(metadata or {})},
            "timestamp": datetime.utcnow().isoformat()
        }

        try:
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=f"{base_path}/metadata.json",
                Body=json.dumps(metadata_content),
                ContentType='application/json'
            )
        except Exception as e:
            logger.error(f"Error storing metadata: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error storing metadata: {str(e)}")

        return metadata_content
    
    async def cleanup_old_files(self, knowledgebase_id: str, doc_type: DocumentType) -> None:
        """Clean up old timestamped files for a given document type."""
        try:
            base_path = self._get_base_path(knowledgebase_id, doc_type)
            paginator = self.s3_client.get_paginator('list_objects_v2')
            
            # Define cleanup rules based on document type
            cleanup_rules = {
                DocumentType.TEXT: {
                    'extension': '.txt',
                    'prefix': 'content_',
                    'keep': ['content.txt', 'metadata.json']
                },
                DocumentType.QA: {
                    'extension': '.json',
                    'prefix': 'qa_',
                    'keep': ['content.json', 'metadata.json']
                }
            }
            
            if doc_type not in cleanup_rules:
                return  # Skip if document type doesn't need cleanup
                
            rule = cleanup_rules[doc_type]
            
            for page in paginator.paginate(Bucket=self.bucket, Prefix=base_path):
                if 'Contents' in page:
                    for obj in page['Contents']:
                        key = obj['Key']
                        filename = key.split('/')[-1]
                        
                        # Delete if file matches cleanup criteria
                        if (key.endswith(rule['extension']) and 
                            rule['prefix'] in key and 
                            filename not in rule['keep']):
                            try:
                                self.s3_client.delete_object(Bucket=self.bucket, Key=key)
                                logger.info(f"Deleted old {doc_type} file: {key}")
                            except Exception as e:
                                logger.error(f"Error deleting old {doc_type} file {key}: {str(e)}")
        except Exception as e:
            logger.error(f"Error during {doc_type} cleanup: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error during {doc_type} cleanup: {str(e)}")

    async def store_text(self, knowledgebase_id: str, text: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Store text content."""
        if not text:
            raise ValueError("Text content cannot be empty")

        base_path = self._get_base_path(knowledgebase_id, DocumentType.TEXT)
        content_key = f"{base_path}/content.txt"
        metadata_key = f"{base_path}/metadata.json"

        try:
            # Store the text content with explicit content type
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=content_key,
                Body=text.encode('utf-8'),  # Encode the text
                ContentType='text/plain; charset=utf-8' # Specify charset
            )

            # Update metadata with explicit content type
            metadata_content = {
                "content_file": content_key,
                "custom_metadata": metadata or {},
                "last_updated": datetime.utcnow().isoformat()
            }
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=metadata_key,
                Body=json.dumps(metadata_content),
                ContentType='application/json'
            )

            # Clean up old files
            await self.cleanup_old_files(knowledgebase_id, DocumentType.TEXT)

            return metadata_content
        except Exception as e:
            logger.error(f"Error storing text content: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error storing text content: {str(e)}")

    async def store_qa(self, knowledgebase_id: str, qa_pairs: List[Dict[str, str]], metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Store Q&A pairs in a single content.json file."""
        doc_type = DocumentType.QA
        prefix = self._get_base_path(knowledgebase_id, doc_type)

        try:
            # Store the Q&A content exactly as received
            qa_content = {
                "qa_pairs": qa_pairs,
                "timestamp": datetime.utcnow().isoformat()
            }
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=f"{prefix}/content.json",
                Body=json.dumps(qa_content),
                ContentType='application/json'
            )

            # Update metadata to point to the content file
            metadata_content = {
                "content_file": f"{prefix}/content.json",
                "custom_metadata": metadata or {},
                "timestamp": datetime.utcnow().isoformat()
            }
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=f"{prefix}/metadata.json",
                Body=json.dumps(metadata_content),
                ContentType='application/json'
            )

            return metadata_content
        except Exception as e:
            logger.error(f"Error storing Q&A pairs: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error storing Q&A pairs: {str(e)}")

    async def store_crawled(self, knowledgebase_id: str, files: List[Dict[str, Any]], metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Store crawled files."""
        if not files:
            raise ValueError("No crawled files provided")

        base_path = self._get_base_path(knowledgebase_id, DocumentType.CRAWLED)
        
        # Get existing metadata if it exists
        existing_files = []
        existing_metadata = {}
        try:
            existing_docs = await self.get_documents(knowledgebase_id, DocumentType.CRAWLED)
            if existing_docs:
                existing_files = existing_docs.get('files', [])
                existing_metadata = existing_docs.get('custom_metadata', {})
        except Exception as e:
            logger.warning(f"Could not fetch existing metadata: {str(e)}")

        stored_files = []

        for file in files:
            if not file.get("content"):
                logger.warning(f"Skipping empty content for URL: {file.get('url')}")
                continue

            filename = file.get("filename", f"crawled_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.html")
            content = file.get("content", "").encode('utf-8')
            file_key = f"{base_path}/{filename}"

            try:
                self.s3_client.put_object(
                    Bucket=self.bucket,
                    Key=file_key,
                    Body=content,
                    ContentType='text/html; charset=utf-8'
                )
                stored_files.append({
                    "filename": filename,
                    "path": file_key,
                    "url": file.get("url"),
                    "size": len(content)
                })
            except Exception as e:
                logger.error(f"Error storing crawled file {filename}: {str(e)}")
                continue

        if not stored_files:
            raise HTTPException(status_code=400, detail="No valid files were stored")

        try:
            # Combine existing and new files
            all_files = existing_files + stored_files
            
            # Store metadata
            metadata_content = {
                "files": all_files,
                "custom_metadata": {**(existing_metadata or {}), **(metadata or {})},
                "timestamp": datetime.utcnow().isoformat()
            }
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=f"{base_path}/metadata.json",
                Body=json.dumps(metadata_content),
                ContentType='application/json'
            )

            return metadata_content
        except Exception as e:
            logger.error(f"Error storing crawled files metadata: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error storing crawled files metadata: {str(e)}")
    async def get_documents(self, knowledgebase_id: str, doc_type: DocumentType) -> Optional[Dict[str, Any]]:
        """Retrieve documents of a specific type for a knowledgebase."""
        if not knowledgebase_id:
            raise ValueError("knowledgebase_id cannot be empty")

        base_path = self._get_base_path(knowledgebase_id, doc_type)
        metadata_key = f"{base_path}/metadata.json"

        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket,
                Key=metadata_key
            )
            metadata = json.loads(response['Body'].read())

            # For text and QA, also fetch the actual content
            if doc_type in [DocumentType.TEXT, DocumentType.QA]:
                content_key = metadata.get('content_file')
                if content_key:
                    try:
                        content_response = self.s3_client.get_object(
                            Bucket=self.bucket,
                            Key=content_key
                        )
                        content = content_response['Body'].read()
                        
                        # For QA, we need to parse the JSON content
                        if doc_type == DocumentType.QA:
                            qa_content = json.loads(content)
                            metadata['content'] = qa_content
                        else:  # For text, just decode the content
                            metadata['content'] = content.decode('utf-8')
                    except Exception as e:
                        logger.error(f"Error fetching content for {content_key}: {str(e)}")
                        metadata['content'] = None

            return metadata
        except self.s3_client.exceptions.NoSuchKey:
            return None
        except Exception as e:
            logger.error(f"Error retrieving documents: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error retrieving documents: {str(e)}")

    async def list_knowledgebases(self) -> List[str]:
        """List all knowledgebases."""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket,
                Delimiter='/'
            )
            # Check if 'CommonPrefixes' exists and handle the case where it might be None
            common_prefixes = response.get('CommonPrefixes')
            if common_prefixes is not None:
                return [prefix['Prefix'].rstrip('/') for prefix in common_prefixes]
            else:
                return []  # Return an empty list if no knowledgebases are found
        except Exception as e:
            logger.error(f"Error listing knowledgebases: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error listing knowledgebases: {str(e)}")