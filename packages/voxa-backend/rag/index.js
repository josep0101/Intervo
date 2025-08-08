const { RAGService } = require('./RagService');

async function main() {
  // Create and initialize the RAG service
  const rag = new RAGService();

  const longDocument = RAGService.createDocument(`
    John Doe is a senior software engineer at Google with over 10 years of experience.
    He specializes in building scalable distributed systems and cloud infrastructure.
    Throughout his career, he has led several major projects including:
    - A real-time data processing pipeline handling millions of events per second
    - A distributed caching system that reduced latency by 50%
    - A microservices architecture that improved system reliability
    
    John is passionate about mentoring junior engineers and frequently gives talks
    at technical conferences. He holds a Master's degree in Computer Science
    from Stanford University and has contributed to various open-source projects.
    
    In his free time, John enjoys hiking and contributing to the developer community
    through his technical blog at blog.johndoe.com.
  `, { source: "profile" });

  // Initialize with the long document
  await rag.initialize([longDocument]);

  // Add more documents with different contexts
  await rag.addDocuments([
    RAGService.createDocument(`
      John Doe recently gave a keynote speech at GoogleIO 2023 about
      the future of cloud computing and distributed systems. His talk
      focused on emerging patterns in system design and scalability.
    `, { source: "conference" })
  ]);

  // Query different aspects
  console.log("\nQuerying about work experience:");
  const workResult = await rag.query("What is John's experience with distributed systems?");
  console.log("Answer:", workResult.answer);
  console.log("Sources:", JSON.stringify(workResult.sources, null, 2));

  console.log("\nQuerying about recent activities:");
  const recentResult = await rag.query("What did John talk about at GoogleIO?");
  console.log("Answer:", recentResult.answer);
  console.log("Sources:", JSON.stringify(recentResult.sources, null, 2));
}

// Run the main function
main().catch(console.error);