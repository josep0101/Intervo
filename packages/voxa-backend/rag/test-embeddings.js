require('dotenv').config({ path: '.env.development' });
const { OpenAIEmbeddings } = require("@langchain/openai");

async function testEmbeddings() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error("API Key not found!");
        return;
    }
    const embeddings = new OpenAIEmbeddings({ apiKey: apiKey });

    try {
        const res = await embeddings.embedQuery("This is a test query.");
        console.log("Embeddings successful!", res.length);
    } catch (error) {
        console.error("Embeddings failed!", error);
    }
}

testEmbeddings();
