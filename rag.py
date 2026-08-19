import ollama
import chromadb

# Connect to our existing ChromaDB
client = chromadb.PersistentClient(path="./data")

# Open our existing collection
collection = client.get_collection(name="cloud_docs")


def ask_question(question):

    # Convert the question into an embedding
    response = ollama.embed(
        model="nomic-embed-text",
        input=question
    )

    question_embedding = response["embeddings"][0]

    # Search ChromaDB for relevant chunks
    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=2
    )

    # Get the retrieved chunks
    retrieved_chunks = results["documents"][0]

    # Get the source information
    sources = results["metadatas"][0]

    # Combine the chunks into one context
    context = "\n\n".join(retrieved_chunks)

    # Create the prompt for Qwen
    prompt = f"""
Use the following context to answer the question.

CONTEXT:
{context}

QUESTION:
{question}

Answer only using the provided context.
"""

    # Ask Qwen
    response = ollama.generate(
        model="qwen2.5:3b",
        prompt=prompt
    )

    # Remove duplicate source names
    source_names = []

    for source in sources:
        if source["source"] not in source_names:
            source_names.append(source["source"])

    return response["response"], source_names