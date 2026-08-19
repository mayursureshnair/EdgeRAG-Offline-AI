import os
import ollama
import chromadb

# Create persistent ChromaDB client
client = chromadb.PersistentClient(path="./data")

# Create or open our collection
collection = client.get_or_create_collection(name="cloud_docs")

# Find all text files in the documents folder
files = os.listdir("documents")

for filename in files:
    if filename.endswith(".txt"):
        filepath = os.path.join("documents", filename)
        try:
            # Read the document with UTF-8 encoding to prevent Windows encoding crashes
            with open(filepath, "r", encoding="utf-8") as file:
                document = file.read().strip()

            if not document:
                print(f"Skipped empty file: {filename}")
                continue

            # Split into chunks (by double-newlines)
            chunks = [c.strip() for c in document.split("\n\n") if c.strip()]

            # Create embeddings and store/update chunks
            for i, chunk in enumerate(chunks):
                response = ollama.embed(
                    model="nomic-embed-text",
                    input=chunk
                )
                embedding = response["embeddings"][0]

                # Use upsert to avoid duplicate key crashes on re-runs
                collection.upsert(
                    ids=[f"{filename}-{i}"],
                    documents=[chunk],
                    embeddings=[embedding],
                    metadatas=[{"source": filename}]
                )

            print(f"Processed: {filename}")
        except Exception as e:
            print(f"Error processing {filename}: {str(e)}")

print("All documents processed successfully!")