import ollama
import chromadb

client = chromadb.Client()

collection = client.create_collection(name="cloud_docs")

with open("documents/cloud.txt", "r") as file:
    document = file.read()

chunks = document.split("\n\n")

for i, chunk in enumerate(chunks):

    response = ollama.embed(
        model="nomic-embed-text",
        input=chunk
    )

    embedding = response["embeddings"][0]

    collection.add(
        ids=[f"chunk{i}"],
        documents=[chunk],
        embeddings=[embedding]
    )


question = "What is a virtual server?"

question_response = ollama.embed(
    model="nomic-embed-text",
    input=question
)

question_embedding = question_response["embeddings"][0]

results = collection.query(
    query_embeddings=[question_embedding],
    n_results=2
)

retrieved_chunks = results["documents"][0]

context = "\n\n".join(retrieved_chunks)

prompt = f"""
Use the following context to answer the question.

CONTEXT:
{context}

QUESTION:
{question}

Answer only using the provided context.
"""

response = ollama.generate(
    model="qwen2.5:3b",
    prompt=prompt
)

print("Qwen:", response["response"])

for chunk in retrieved_chunks:
    print("Retrieved:", chunk)