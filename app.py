from rag import ask_question

print("Edge RAG Chatbot")
print("Type 'exit' to quit.\n")

while True:
    question = input("You: ")

    if question.lower() == "exit":
        break

    answer, sources = ask_question(question)

    print("Qwen:", answer)

    print("\nSources:")
    for source in sources:
        print("📄", source)

    print()