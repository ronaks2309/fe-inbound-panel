# app.py
# To run the app, use:
#  python -m uvicorn app:app --reload --port 8000   

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from database.connection import init_db, engine
from database.models import Client

# Import routers
from routers import webhooks, calls, debug, websockets


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan handler to initialize DB and seed demo data on startup."""
    init_db()

    # Seed demo client
    with Session(engine) as session:
        existing = session.get(Client, "demo-client")
        if not existing:
            demo = Client(id="demo-client", name="Demo Client")
            session.add(demo)
            session.commit()

    # Ensure recordings directory exists
    os.makedirs("recordings", exist_ok=True)

    yield

# Create FastAPI app with lifespan
app = FastAPI(lifespan=lifespan)

# --- Middleware --- #
# CORS so frontend can call it later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # we’ll tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Base Routes --- #
@app.get("/")
def read_root():
    return {"message": "Call dashboard backend is running"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/recordings/{filename}")
async def get_recording(filename: str):
    """
    Serve recording files from the local filesystem.
    """
    file_path = os.path.join("recordings", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Recording not found")
    return FileResponse(file_path)

# --- Register Routers --- #
app.include_router(webhooks.router)
app.include_router(calls.router)
app.include_router(debug.router)
app.include_router(websockets.router)
