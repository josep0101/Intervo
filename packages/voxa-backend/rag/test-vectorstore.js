require('dotenv').config({ path: '.env.development' });
const { OpenAIEmbeddings } = require("@langchain/openai");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { Document } = require("@langchain/core/documents");

async function testVectorStore() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("API Key not found!");
    return;
  }
  const embeddings = new OpenAIEmbeddings({ apiKey: apiKey });
  const simpleDocument = new Document({ pageContent: "This is a very simple test document." });
  const documents = [simpleDocument];

  try {
    const vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings);
    console.log("Vector store created successfully!", vectorStore);
  } catch (error) {
    console.error("Vector store creation failed!", error);
    console.error(error); // Log full error
  }
}

testVectorStore();