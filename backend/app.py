# app.py
# To run the app, use:
#  python -m uvicorn app:app --reload --port 8000   

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
import secrets
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi import Request, Response
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
# Disable default docs to protect them
app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

# --- Basic Auth for Docs --- #
security_basic = HTTPBasic()

def get_admin_docs_auth(credentials: HTTPBasicCredentials = Depends(security_basic)):
    """
    Simple Basic Auth for accessing /docs.
    User/Pass should be set in env or default to admin/admin (CHANGE IN PROD).
    """
    correct_username = secrets.compare_digest(credentials.username, os.getenv("DOCS_USERNAME", "admin"))
    correct_password = secrets.compare_digest(credentials.password, os.getenv("DOCS_PASSWORD", "admin"))
    
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

@app.get("/docs", include_in_schema=False)
async def get_documentation(username: str = Depends(get_admin_docs_auth)):
    return get_swagger_ui_html(openapi_url="/openapi.json", title="Call Dashboard Docs")

@app.get("/openapi.json", include_in_schema=False)
async def get_open_api_endpoint(username: str = Depends(get_admin_docs_auth)):
    return get_openapi(title="Call Dashboard", version="1.0.0", routes=app.routes)

# --- Middleware --- #
# CORS so frontend can call it later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # we’ll tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Middleware for HSTS (Strict-Transport-Security)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    # HSTS: 1 year, include subdomains
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # Content Security Policy (Basic)
    # response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response

# Enforce HTTPS Redirect in Production
if os.getenv("ENVIRONMENT", "development") == "production":
    app.add_middleware(HTTPSRedirectMiddleware)

# --- Base Routes --- #
@app.get("/")
def read_root():
    return {"message": "Call dashboard backend is running"}

@app.get("/health")
def health():
    return {"status": "ok"}

# @app.get("/api/recordings/{filename}")
# async def get_recording(filename: str, redirect: bool = True):
#    """
#    DEPRECATED / REMOVED FOR SECURITY.
#    Use /api/calls/{call_id}/recording instead.
#    """
#    raise HTTPException(status_code=410, detail="This endpoint is deprecated. Use the secure /api/calls/{id}/recording endpoint.")

# --- Register Routers --- #
app.include_router(webhooks.router)
app.include_router(calls.router)
app.include_router(debug.router)
app.include_router(websockets.router)
