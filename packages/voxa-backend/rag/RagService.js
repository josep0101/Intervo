require('dotenv').config({ path: '.env.development' });

const { Document } = require("@langchain/core/documents");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { ChatOpenAI } = require("@langchain/openai");
const { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } = require("@langchain/core/prompts");
const { VoyageEmbeddings, VoyageRerank } = require("@langchain/community/embeddings/voyage");

class RAGService {
  constructor(config = {}) {
    const apiKey = process.env.OPENAI_API_KEY;
    const voyageApiKey = process.env.VOYAGE_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    this.embeddings = new OpenAIEmbeddings({
      modelName: "text-embedding-3-small",
      apiKey: apiKey,
    });
    
    // Initialize reranker if Voyage API key is provided
    if (voyageApiKey) {
      this.reranker = new VoyageRerank({
        apiKey: voyageApiKey,
        model: config.rerankModel || "rerank-1", // Default to rerank-1 if not specified
        topK: config.topK || 3, // Number of results to return after reranking
      });
    }

    this.model = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0.7,
      apiKey: apiKey,
      maxRetries: 3
    });

    this.vectorStore = null;
    this.documents = []; // Store original documents for text search
    
    // Initialize text splitter
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ".", "!", "?", ",", " ", ""],
      keepSeparator: false
    });
    
    // Define the chat prompt template with system and human messages
    this.promptTemplate = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(
        "You are a helpful assistant that answers questions based on the provided context. " +
        "Always answer directly and concisely based on the context provided. " +
        "If the context doesn't contain relevant information, say so."
      ),
      HumanMessagePromptTemplate.fromTemplate(
        "Context: {context}\n\nQuestion: {question}"
      )
    ]);
  }

  async initialize(documents) {
    // Store original documents
    this.documents = this.documents.concat(documents);

    // Split documents into chunks
    const splitDocs = await this.textSplitter.splitDocuments(documents);
    console.log('Split documents:', splitDocs.length, 'chunks');
    
    // Create vector store from split documents
    this.vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, this.embeddings);
  }

  async addDocuments(documents) {
    if (!Array.isArray(documents)) {
      documents = [documents];
    }

    // Store original documents
    this.documents = this.documents.concat(documents);

    // Split new documents into chunks
    const splitDocs = await this.textSplitter.splitDocuments(documents);
    console.log('Split new documents:', splitDocs.length, 'chunks');
    
    if (!this.vectorStore) {
      this.vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, this.embeddings);
    } else {
      await this.vectorStore.addDocuments(splitDocs);
    }
  }

  // Simple keyword-based text search
  async textSearch(query, limit = 3) {
    const words = query.toLowerCase().split(' ');
    const scores = this.documents.map(doc => {
      const content = doc.pageContent.toLowerCase();
      const score = words.reduce((acc, word) => 
        acc + (content.includes(word) ? 1 : 0), 0) / words.length;
      return { doc, score };
    });
    
    return scores
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => [item.doc, item.score]);
  }

  async query(question) {
    if (!this.vectorStore) {
      throw new Error("RAG system not initialized. Please call initialize() first.");
    }

    // Perform vector search
    const vectorResults = await this.vectorStore.similaritySearchWithScore(question, 4);
    
    // Perform text search
    const textResults = await this.textSearch(question);

    // Combine results
    let combinedResults = [...vectorResults, ...textResults];

    // If reranker is available, use it to rerank combined results
    if (this.reranker) {
      const documents = combinedResults.map(([doc]) => doc.pageContent);
      const rerankedScores = await this.reranker.rerank({
        query: question,
        documents: documents,
      });

      // Map reranked scores back to documents
      combinedResults = rerankedScores.map((score, i) => [
        combinedResults[i][0],
        score
      ]);
    }

    // Sort by score and take top results
    combinedResults.sort((a, b) => b[1] - a[1]);
    const topResults = combinedResults.slice(0, 2);

    // Format documents content with relevance scores
    const context = topResults
      .map(([doc, score]) => `${doc.pageContent} (Relevance: ${Math.round(score * 100)}%)`)
      .join("\n");
    
    // Create messages from the prompt template
    const messages = await this.promptTemplate.formatMessages({
      context: context,
      question: question
    });

    // Get response from the model
    const response = await this.model.invoke(messages);

    return {
      answer: response.content,
      sources: topResults.map(([doc, score]) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        relevance: Math.round(score * 100),
        searchType: doc.metadata.searchType || 'hybrid'
      }))
    };
  }

  static createDocument(text, metadata = {}) {
    return new Document({
      pageContent: text,
      metadata,
    });
  }
}

module.exports = { RAGService };