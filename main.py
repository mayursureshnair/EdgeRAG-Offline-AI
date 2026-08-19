from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from rag import ask_question

app = FastAPI(title="EdgeRAG API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str


@app.post("/query")
def query(request: QueryRequest):
    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )

    try:
        answer, sources = ask_question(question)

        return {
            "answer": answer,
            "sources": sources
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# Mount the frontend directory to serve HTML, CSS, and JS static assets.
# This must be mounted at the end after all API routes are registered.
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")