# backend/app/main.py
# ── Entry point for the FastAPI application ──────────────────────────────────
# Run with: uvicorn app.main:app --reload  (from inside /backend folder)
# Docs at:  http://localhost:8000/docs

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes  import router as main_router
from app.api.webhook import router as webhook_router

# ── App instance ─────────────────────────────────────────────────────────────
app = FastAPI(
    title       = "AI Marketing Analytics Agent",
    description = "Autonomous AI agent that monitors campaign performance and fires alerts.",
    version     = "1.0.0",
)

# ── CORS — allow Next.js frontend (localhost:3000) to call the API ────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins  = ["http://localhost:3000","https://insight-ai-agent.vercel.app/"],   # Add your Vercel URL here later
    allow_methods  = ["*"],
    allow_headers  = ["*"],
    allow_credentials = True,
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(main_router,    prefix="/api")
app.include_router(webhook_router, prefix="/api")

# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "status"  : "online",
        "message" : "AI Marketing Analytics Agent API is running.",
        "docs"    : "Visit /docs for the full API reference",
    }