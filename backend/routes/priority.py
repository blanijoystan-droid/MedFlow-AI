"""
API Routes for Engine 5: Priority Engine ⚖️
When multiple hospitals need the same scarce stock, calculates multi-attribute triage ranking:
- Stockout urgency
- Clinical criticality
- Patient load
- Alternative availability
- Operational urgency

Output:
Hospital A — Priority 94/100
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, Optional
import sys
from pathlib import Path

# Ensure root directory is accessible
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.engine.priority_engine import (
    evaluate_hospital_priority,
    triage_competing_hospitals,
    scan_network_priority_triage
)

router = APIRouter(prefix="/api/priority", tags=["Priority Engine"])


@router.get("/triage")
def get_competing_hospitals_triage(
    medicine: str = Query("Insulin", description="Scarce medicine name"),
    units: Optional[int] = Query(None, description="Available batch units to distribute")
):
    """
    Ranks competing hospitals for a scarce medicine batch and computes recommended allocation.
    Outputs: Hospital A — Priority 94/100
    """
    try:
        triage = triage_competing_hospitals(medicine=medicine, available_units=units)
        return triage
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Priority triage failed: {str(e)}")


@router.get("/evaluate")
def get_hospital_priority_evaluation(
    hospital: str = Query("City General Hospital", description="Hospital name"),
    medicine: str = Query("Insulin", description="Medicine name")
):
    """
    Detailed 5-factor clinical triage breakdown for a specific hospital.
    """
    try:
        evaluation = evaluate_hospital_priority(hospital_name=hospital, medicine=medicine)
        return evaluation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hospital evaluation failed: {str(e)}")


@router.get("/overview")
def get_network_priority_overview():
    """
    Scans all 8 critical medicines across all network facilities,
    highlighting the highest priority hospital for each drug.
    """
    try:
        overview = scan_network_priority_triage()
        return {
            "total_medicines": len(overview),
            "triage_overview": overview
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Network priority scan failed: {str(e)}")
