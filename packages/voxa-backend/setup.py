from setuptools import setup, find_packages

setup(
    name="rag_py",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "langchain-core>=0.1.27",
        "langchain-openai>=0.0.8",
        "langchain-community>=0.0.24",
        "langchain-text-splitters>=0.0.1",
        "langchain-voyageai>=0.0.3",
        "langchain-google-genai>=0.0.7",
        "langchain-groq>=0.1.2",
        "langchain-deepseek>=0.1.0",
        "faiss-cpu>=1.8.0",
        "python-dotenv>=1.0.1",
    ],
    python_requires=">=3.8",
) 