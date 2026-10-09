"""
API Routes for Engine 2: Risk Engine 🚨
Calculates Days of Supply (DoS) and compares against Supplier Lead Time + Safety Buffer.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, Optional
import sys
from pathlib import Path

# Ensure root directory is accessible
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.engine.risk_engine import (
    evaluate_medicine_risk,
    scan_network_risk_matrix,
    FACILITY_SUPPLY_PARAMS
)

router = APIRouter(prefix="/api/risk", tags=["Risk Engine"])


@router.get("/evaluate")
def get_medicine_risk_evaluation(
    hospital: str = Query("City General Hospital", description="Healthcare facility name"),
    medicine: str = Query("Paracetamol", description="Essential medicine name"),
    stock: Optional[int] = Query(None, description="Optional current stock override")
):
    """
    Evaluate Days of Supply vs (Supplier Lead Time + Safety Buffer) for a single item.
    Outputs: 🔴 Critical / 🟠 High / 🟡 Watch / 🟢 Stable.
    """
    try:
        evaluation = evaluate_medicine_risk(
            hospital_name=hospital,
            medicine=medicine,
            override_stock=stock
        )
        return evaluation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk evaluation failed: {str(e)}")


@router.get("/matrix")
def get_network_risk_matrix():
    """
    Scan all hospitals in the Karnataka network and return categorized risk items.
    """
    try:
        matrix = scan_network_risk_matrix()
        return matrix
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Network risk scan failed: {str(e)}")


@router.get("/facilities")
def get_facility_logistics():
    """
    Retrieve supplier lead times, safety buffers, and distributor information for all facilities.
    """
    return {
        "facilities": FACILITY_SUPPLY_PARAMS
    }
