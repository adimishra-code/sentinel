"""
Sentinel Worker - Python AI Service
Phase 0: Health check skeleton
Phase 2+: Detection Engine, AI Orchestration, Policy Evaluation
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from datetime import datetime

# Import future modules (placeholders for now)
# from src.detection import router as detection_router
# from src.orchestration import router as orchestration_router
# from src.policy import router as policy_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("🚀 Sentinel Worker starting...")

    # TODO Phase 2+: Initialize connections
    # - MongoDB connection
    # - Redis connection
    # - Qdrant client
    # - Load fast classifiers
    # - Initialize Gemini client for Nemotron

    yield

    # Shutdown
    print("🛑 Sentinel Worker shutting down...")
    # TODO: Close connections gracefully


app = FastAPI(
    title="Sentinel Worker",
    description="AI Service for Trust & Safety Operations",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker healthcheck"""
    return {
        "status": "ok",
        "service": "sentinel-worker",
        "timestamp": datetime.utcnow().isoformat(),
        "python_version": os.sys.version.split()[0],
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Sentinel Worker",
        "version": "0.1.0",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "detection": "/detect (Phase 2+)",
            "orchestration": "/orchestrate (Phase 3+)",
            "policy": "/evaluate (Phase 3+)",
        },
    }


# TODO Phase 2+: Mount routers
# app.include_router(detection_router, prefix="/detect", tags=["detection"])
# app.include_router(orchestration_router, prefix="/orchestrate", tags=["orchestration"])
# app.include_router(policy_router, prefix="/evaluate", tags=["policy"])


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("WORKER_PORT", "8000"))
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("PYTHONUNBUFFERED") == "1",
    )
