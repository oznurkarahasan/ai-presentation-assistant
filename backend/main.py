from fastapi import FastAPI
import os

app = FastAPI(title="AI Presentation Assistant API")

@app.get("/")
def read_root():
    return {
        "status": "active", 
        "message": "Backend is running successfully!", 
        "database": "Connected via Docker",
        "environment": os.getenv("ENVIRONMENT", "development")
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}