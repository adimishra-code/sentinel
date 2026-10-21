"""
Worker Evaluation Routes
Runs the detection benchmark harness and returns a metrics report.
"""

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os

from evaluation.benchmark import run_benchmark

router = APIRouter()


class BenchmarkRequest(BaseModel):
    threshold: float = 0.5
    use_llm: bool = False


@router.post("/benchmark", response_model=Dict[str, Any])
async def run_benchmark_endpoint(
    request: BenchmarkRequest,
    x_worker_shared_secret: Optional[str] = Header(None),
):
    """
    Run the detection benchmark harness.
    Returns precision, recall, F1 per category, false-positive rate,
    decision accuracy, latency p50/p95, and cost per 1,000 items.
    Requires the WORKER_SHARED_SECRET header.
    """
    expected = os.getenv("WORKER_SHARED_SECRET")
    if not x_worker_shared_secret or x_worker_shared_secret != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing worker shared secret")

    try:
        report = run_benchmark(threshold=request.threshold, use_llm=request.use_llm)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Benchmark failed: {str(e)}")
