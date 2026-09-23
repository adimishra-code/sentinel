"""
Sentinel Worker - Python AI Service
Handles detection, AI orchestration, policy evaluation, and benchmarks
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from datetime import datetime

# Import routers
from orchestration.routes import router as orchestration_router
from detection.routes import router as detection_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    print("🚀 Sentinel Worker starting...")
    print(f"   Model: {os.getenv('MODEL_NAME', 'gemini-2.0-flash-exp')}")
    print(f"   Gemini API configured: {'yes' if os.getenv('GEMINI_API_KEY') else 'no (AI analysis disabled)'}")

    sentry_dsn = os.getenv("SENTRY_DSN")
    if sentry_dsn:
        try:
            import sentry_sdk
            from sentry_sdk.integrations.fastapi import FastApiIntegration
            sentry_sdk.init(
                dsn=sentry_dsn,
                traces_sample_rate=0.2,
                integrations=[FastApiIntegration()],
            )
            print("   Sentry monitoring: enabled")
        except Exception as e:
            print(f"   Sentry init warning: {e}")

    yield

    print("🛑 Sentinel Worker shutting down...")


app = FastAPI(
    title="Sentinel Worker",
    description="AI Service for Trust & Safety Operations",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — only allow backend service in production
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker healthcheck"""
    return {
        "status": "ok",
        "service": "sentinel-worker",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "python_version": os.sys.version.split()[0],
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
    }


@app.get("/")
async def root():
    """Root endpoint — service info"""
    return {
        "service": "Sentinel Worker",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "detection": "/detection/detect",
            "orchestration": "/orchestration/analyze",
        },
    }


@app.get("/benchmark")
async def run_benchmark_endpoint():
    """Run the detection engine benchmark"""
    from evaluation.benchmark import run_benchmark
    result = run_benchmark()
    return {"success": True, "data": result}


# Mount routers
app.include_router(orchestration_router, prefix="/orchestration", tags=["orchestration"])
app.include_router(detection_router, prefix="/detection", tags=["detection"])


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("WORKER_PORT", "8000"))
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("PYTHONUNBUFFERED") == "1",
    )
