from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from rag import ask_question

app = FastAPI(title="EdgeRAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return FileResponse("static/index.html")


@app.post("/api/chat")
def chat(data: dict):
    question = data["question"]

    answer, sources = ask_question(question)

    return {
        "answer": answer,
        "sources": sources
    }


app.mount("/static", StaticFiles(directory="static"), name="static")