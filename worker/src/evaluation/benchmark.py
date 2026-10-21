"""
Evaluation benchmark runner
Tests detection engine accuracy against a labeled JSONL dataset.
Computes precision, recall, F1 per category, false-positive rate on benign data,
confusion matrix, decision accuracy, latency p50/p95, and cost per 1,000 items.
Compares heuristics-only against heuristics + LLM, and tunes the escalation threshold.
"""

from __future__ import annotations

import json
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from detection.engine import run_detection

try:  # Optional LLM path
    from orchestration.gemini_client import get_gemini_client  # type: ignore
except Exception:  # pragma: no cover - Gemini not installed
    get_gemini_client = None  # type: ignore

try:  # Optional MongoDB record
    from pymongo import MongoClient  # type: ignore
except Exception:  # pragma: no cover - pymongo not installed
    MongoClient = None  # type: ignore

from shared.config import get_settings


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
BENCHMARK_JSONL = DATA_DIR / "benchmark.jsonl"

# Categories supported by the detection engine
CATEGORIES = [
    "toxicity",
    "hate_speech",
    "threat_direct",
    "sexual_harassment",
    "spam",
    "phishing",
    "self_harm",
]

# Cost estimates (USD per 1,000 items). Heuristics ~ free; LLM ~ $0.00025/item
# (approximate Gemini flash pricing at ~1k tokens per item).
COST_PER_1K_HEURISTICS = 0.0001
COST_PER_1K_LLM = 0.25


# ---------------------------------------------------------------------------
# Dataset loading
# ---------------------------------------------------------------------------

def load_dataset(path: Path = BENCHMARK_JSONL) -> List[Dict[str, Any]]:
    """Load labeled benchmark cases from JSONL."""
    cases: List[Dict[str, Any]] = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            cases.append(json.loads(line))
    return cases


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _percentile(sorted_vals: List[float], pct: float) -> float:
    if not sorted_vals:
        return 0.0
    s = sorted(sorted_vals)
    k = (len(s) - 1) * (pct / 100.0)
    f = int(k)
    c = min(f + 1, len(s) - 1)
    if f == c:
        return float(s[int(k)])
    d0 = s[f] * (c - k)
    d1 = s[c] * (k - f)
    return float(d0 + d1)


def _metrics_for_category(
    cases: List[Dict[str, Any]],
    results: List[Dict[str, Any]],
    category: str,
) -> Dict[str, Any]:
    """Precision, recall, F1, confusion matrix for a single category."""
    tp = fp = fn = tn = 0
    for case, res in zip(cases, results):
        expected = category in case.get("expected_categories", [])
        actual = category in res.get("detected_categories", [])
        if expected and actual:
            tp += 1
        elif actual and not expected:
            fp += 1
        elif expected and not actual:
            fn += 1
        else:
            tn += 1
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    return {
        "category": category,
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "support": tp + fn,
    }


def _flagged_metrics(
    cases: List[Dict[str, Any]],
    results: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Binary flagged metrics (flagged / not flagged)."""
    tp = fp = fn = tn = 0
    for case, res in zip(cases, results):
        expected = case.get("expected_flagged", False)
        actual = res.get("flagged", False)
        if expected and actual:
            tp += 1
        elif actual and not expected:
            fp += 1
        elif expected and not actual:
            fn += 1
        else:
            tn += 1
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    fpr = fp / (fp + tn) if (fp + tn) else 0.0  # false-positive rate on benign
    return {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "false_positive_rate": round(fpr, 4),
        "accuracy": round((tp + tn) / len(cases), 4) if cases else 0.0,
    }


def _decision_accuracy(
    cases: List[Dict[str, Any]],
    results: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Accuracy of final moderation action vs expected action."""
    correct = 0
    total = 0
    for case, res in zip(cases, results):
        expected_action = case.get("expected_action")
        actual_action = res.get("action")
        if not expected_action or not actual_action:
            continue
        total += 1
        if expected_action == actual_action:
            correct += 1
    return {
        "correct": correct,
        "total": total,
        "accuracy": round(correct / total, 4) if total else 0.0,
    }


def _llm_available() -> bool:
    """Whether the Gemini client can be instantiated."""
    if get_gemini_client is None:
        return False
    try:
        get_gemini_client()
        return True
    except Exception:
        return False


def _run_heuristics(text: str, threshold: float = 0.5) -> Dict[str, Any]:
    """Run fast heuristics only. Returns result + latency seconds."""
    start = time.perf_counter()
    detection = run_detection(text)
    latency_ms = (time.perf_counter() - start) * 1000.0
    detected_cats = set(detection.categories)
    flagged = detection.overall_score >= threshold
    # Map risk score to a moderation action (mirrors backend determine_action)
    score = detection.overall_score
    if score >= 0.7:
        action = "review"
    elif score >= 0.5:
        action = "remove"
    elif score >= 0.3:
        action = "allow_and_monitor"
    else:
        action = "allow"
    return {
        "detected_categories": sorted(detected_cats),
        "flagged": flagged,
        "risk_score": round(detection.overall_score, 4),
        "action": action,
        "latency_ms": round(latency_ms, 2),
        "path": "heuristics",
    }


def _run_heuristics_plus_llm(text: str, threshold: float = 0.5) -> Dict[str, Any]:
    """Run heuristics + LLM. Returns result + latency seconds."""
    start = time.perf_counter()
    detection = run_detection(text)
    heur_latency_ms = (time.perf_counter() - start) * 1000.0

    result: Dict[str, Any] = {
        "detected_categories": sorted(set(detection.categories)),
        "flagged": detection.overall_score >= threshold,
        "risk_score": round(detection.overall_score, 4),
        "action": "allow",
        "latency_ms": 0.0,
        "path": "heuristics+llm",
        "llm_error": None,
    }

    if get_gemini_client is None:
        result["llm_error"] = "gemini client not installed"
        result["latency_ms"] = round(heur_latency_ms, 2)
        return result

    try:
        client = get_gemini_client()
        llm_start = time.perf_counter()
        out = client.analyze_content(text)
        llm_latency_ms = (time.perf_counter() - llm_start) * 1000.0
    except Exception as exc:  # pragma: no cover - LLM failure path
        result["llm_error"] = str(exc)
        result["latency_ms"] = round(heur_latency_ms, 2)
        return result

    if not out.get("success"):
        result["llm_error"] = out.get("error", "unknown")
        result["latency_ms"] = round(heur_latency_ms + llm_latency_ms, 2)
        return result

    analysis = out.get("analysis", {}) or {}
    llm_cats = set()
    for cat in analysis.get("categories", []) or []:
        if isinstance(cat, dict):
            name = cat.get("category")
            score = cat.get("score", 0.0)
            if name and score >= 0.5:
                llm_cats.add(name)
        elif isinstance(cat, str):
            llm_cats.add(cat)

    combined = set(detection.categories) | llm_cats
    result["detected_categories"] = sorted(combined)
    result["llm_categories"] = sorted(llm_cats)
    result["flagged"] = detection.overall_score >= threshold or bool(llm_cats)
    score = max(detection.overall_score, analysis.get("overall_severity", 0.0))
    result["risk_score"] = round(score, 4)
    if score >= 0.7:
        action = "review"
    elif score >= 0.5:
        action = "remove"
    elif score >= 0.3:
        action = "allow_and_monitor"
    else:
        action = "allow"
    result["action"] = action
    result["latency_ms"] = round(heur_latency_ms + llm_latency_ms, 2)
    result["llm_model"] = out.get("model")
    return result


# ---------------------------------------------------------------------------
# Benchmark runner
# ---------------------------------------------------------------------------

def run_benchmark(
    threshold: float = 0.5,
    use_llm: bool = False,
    record_to_mongo: bool = False,
) -> Dict[str, Any]:
    """
    Run the full evaluation benchmark.

    Args:
        threshold: risk-score escalation threshold (0.0-1.0).
        use_llm: if True, also evaluate heuristics + LLM path.
        record_to_mongo: if True, persist an EvaluationRun record to MongoDB.

    Returns a metrics report dict.
    """
    cases = load_dataset()
    if not cases:
        return {"error": "no benchmark cases found", "path": str(BENCHMARK_JSONL)}

    # --- Heuristics only ---
    heur_results: List[Dict[str, Any]] = []
    for case in cases:
        heur_results.append(_run_heuristics(case["text"], threshold=threshold))

    heur_flagged = _flagged_metrics(cases, heur_results)
    heur_cat_metrics = [_metrics_for_category(cases, heur_results, c) for c in CATEGORIES]
    heur_decision = _decision_accuracy(cases, heur_results)
    heur_latencies = sorted(r["latency_ms"] for r in heur_results)
    heur_cost_per_1k = COST_PER_1K_HEURISTICS

    report: Dict[str, Any] = {
        "dataset": str(BENCHMARK_JSONL),
        "total_cases": len(cases),
        "threshold": threshold,
        "path": "heuristics",
        "flagged": heur_flagged,
        "categories": heur_cat_metrics,
        "decision_accuracy": heur_decision,
        "latency_ms": {
            "p50": round(_percentile(heur_latencies, 50), 2),
            "p95": round(_percentile(heur_latencies, 95), 2),
            "mean": round(statistics.mean(heur_latencies), 2) if heur_latencies else 0.0,
        },
        "cost_per_1k_items": heur_cost_per_1k,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # --- Heuristics + LLM ---
    if use_llm:
        if not _llm_available():
            report["llm"] = {
                "available": False,
                "reason": "Gemini client not available or GEMINI_API_KEY not set",
            }
        else:
            llm_results: List[Dict[str, Any]] = []
            for case in cases:
                llm_results.append(_run_heuristics_plus_llm(case["text"], threshold=threshold))
            llm_flagged = _flagged_metrics(cases, llm_results)
            llm_cat_metrics = [_metrics_for_category(cases, llm_results, c) for c in CATEGORIES]
            llm_decision = _decision_accuracy(cases, llm_results)
            llm_latencies = sorted(r["latency_ms"] for r in llm_results)
            report["llm"] = {
                "available": True,
                "flagged": llm_flagged,
                "categories": llm_cat_metrics,
                "decision_accuracy": llm_decision,
                "latency_ms": {
                    "p50": round(_percentile(llm_latencies, 50), 2),
                    "p95": round(_percentile(llm_latencies, 95), 2),
                    "mean": round(statistics.mean(llm_latencies), 2) if llm_latencies else 0.0,
                },
                "cost_per_1k_items": COST_PER_1K_LLM,
            }

    # --- Threshold tuning ---
    tuning: List[Dict[str, Any]] = []
    for t in (0.3, 0.5, 0.7):
        t_results = [_run_heuristics(c["text"], threshold=t) for c in cases]
        t_flagged = _flagged_metrics(cases, t_results)
        t_decision = _decision_accuracy(cases, t_results)
        tuning.append(
            {
                "threshold": t,
                "flagged_accuracy": t_flagged["accuracy"],
                "flagged_f1": t_flagged["f1"],
                "false_positive_rate": t_flagged["false_positive_rate"],
                "decision_accuracy": t_decision["accuracy"],
            }
        )
    report["threshold_tuning"] = tuning

    # --- Persist to MongoDB ---
    if record_to_mongo and MongoClient is not None:
        try:
            settings = get_settings()
            client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=3000)
            db = client.get_default_database()
            collection = db.get_collection("evaluation_runs")
            doc = {
                "run_at": datetime.now(timezone.utc),
                "dataset": str(BENCHMARK_JSONL),
                "total_cases": len(cases),
                "threshold": threshold,
                "report": report,
            }
            collection.insert_one(doc)
            report["mongo_recorded"] = True
            client.close()
        except Exception as exc:  # pragma: no cover - Mongo optional
            report["mongo_recorded"] = False
            report["mongo_error"] = str(exc)

    return report


def _print_report(report: Dict[str, Any]) -> None:
    """Pretty-print a metrics report to stdout."""
    print("=" * 70)
    print("SENTINEL DETECTION BENCHMARK REPORT")
    print("=" * 70)
    print(f"Dataset: {report['dataset']}")
    print(f"Total cases: {report['total_cases']}")
    print(f"Threshold: {report['threshold']}")
    print(f"Path: {report['path']}")
    print()
    print("--- Flagged (binary) metrics ---")
    f = report["flagged"]
    print(f"  TP={f['tp']} FP={f['fp']} FN={f['fn']} TN={f['tn']}")
    print(f"  precision={f['precision']} recall={f['recall']} f1={f['f1']}")
    print(f"  false_positive_rate={f['false_positive_rate']}")
    print(f"  accuracy={f['accuracy']}")
    print()
    print("--- Per-category metrics ---")
    for c in report["categories"]:
        print(
            f"  {c['category']:16s} "
            f"P={c['precision']} R={c['recall']} F1={c['f1']} "
            f"TP={c['tp']} FP={c['fp']} FN={c['fn']} support={c['support']}"
        )
    print()
    print("--- Decision accuracy ---")
    d = report["decision_accuracy"]
    print(f"  correct={d['correct']}/{d['total']} accuracy={d['accuracy']}")
    print()
    print("--- Latency (ms) ---")
    l = report["latency_ms"]
    print(f"  p50={l['p50']} p95={l['p95']} mean={l['mean']}")
    print(f"  cost_per_1k_items={report['cost_per_1k_items']}")
    print()
    print("--- Threshold tuning ---")
    for t in report["threshold_tuning"]:
        print(
            f"  thr={t['threshold']} "
            f"flagged_acc={t['flagged_accuracy']} f1={t['flagged_f1']} "
            f"fpr={t['false_positive_rate']} decision_acc={t['decision_accuracy']}"
        )
    if report.get("llm"):
        llm = report["llm"]
        if llm.get("available"):
            print()
            print("--- Heuristics + LLM ---")
            print(f"  model={llm.get('llm_model') if 'llm_model' in llm else 'gemini'}")
            lf = llm["flagged"]
            print(f"  flagged accuracy={lf['accuracy']} f1={lf['f1']} fpr={lf['false_positive_rate']}")
            ld = llm["latency_ms"]
            print(f"  latency p50={ld['p50']} p95={ld['p95']} mean={ld['mean']}")
            print(f"  cost_per_1k_items={llm['cost_per_1k_items']}")
    print()
    print(f"Timestamp: {report['timestamp']}")
    if report.get("mongo_recorded"):
        print("Recorded to MongoDB evaluation_runs collection.")


def run_benchmark_cli() -> None:
    """CLI entry point: prints a metrics report."""
    import argparse

    parser = argparse.ArgumentParser(description="Sentinel detection benchmark")
    parser.add_argument("--threshold", type=float, default=0.5, help="risk-score escalation threshold")
    parser.add_argument("--llm", action="store_true", help="include heuristics + LLM path")
    parser.add_argument("--record", action="store_true", help="persist EvaluationRun to MongoDB")
    parser.add_argument(
        "--json",
        action="store_true",
        help="emit the report as JSON to stdout (for backend consumption)",
    )
    args = parser.parse_args()

    report = run_benchmark(
        threshold=args.threshold,
        use_llm=args.llm,
        record_to_mongo=args.record,
    )

    if args.json:
        print(json.dumps(report, indent=2, default=str))
    else:
        _print_report(report)


if __name__ == "__main__":  # pragma: no cover
    run_benchmark_cli()
