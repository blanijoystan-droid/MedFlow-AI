"""
API Routes for Engine 4: Redistribution Optimizer 🔄
Finds which facility can safely donate while considering:
- surplus
- safety stock
- expiry
- recipient demand
- transport / distance
- criticality

Output format:
Hospital B → Hospital A | 1,000 units
"""

from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
import sys
from pathlib import Path

# Ensure root directory is accessible
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.engine.redistribution_optimizer import (
    optimize_redistribution,
    scan_network_redistribution_opportunities,
    execute_redistribution_transfer,
    HOSPITAL_TRANSIT_MATRIX,
    MEDICINE_CRITICALITY
)

router = APIRouter(prefix="/api/redistribution", tags=["Redistribution Optimizer"])


class ExecuteTransferRequest(BaseModel):
    donor: str = Field(..., description="Donor hospital name")
    recipient: str = Field(..., description="Recipient hospital name")
    medicine: str = Field(..., description="Medicine name")
    units: int = Field(..., gt=0, description="Number of units to transfer")


@router.get("/optimize")
def get_redistribution_recommendation(
    recipient: str = Query("City General Hospital", description="Hospital requiring inventory"),
    medicine: str = Query("Insulin", description="Medicine name"),
    quantity: Optional[int] = Query(None, description="Requested units (or auto-calculate deficit)")
):
    """
    Find the optimal donor hospital that can safely transfer stock without violating safety margins.
    Evaluates surplus, safety stock, FEFO expiry, road transit, and clinical criticality.
    """
    try:
        recommendation = optimize_redistribution(
            recipient_hospital=recipient,
            medicine=medicine,
            requested_units=quantity
        )
        return recommendation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Redistribution optimization failed: {str(e)}")


@router.get("/opportunities")
def get_network_redistribution_opportunities():
    """
    Scans the entire hospital network for active deficit-to-surplus matching pairs.
    """
    try:
        opportunities = scan_network_redistribution_opportunities()
        return {
            "total_opportunities": len(opportunities),
            "opportunities": opportunities
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Network opportunity scan failed: {str(e)}")


@router.post("/execute")
def execute_inter_hospital_transfer(request: ExecuteTransferRequest):
    """
    Executes the inter-hospital barter transfer, safely deducting from donor,
    adding to recipient, and logging an immutable trade record into central state.
    """
    try:
        result = execute_redistribution_transfer(
            donor_hospital=request.donor,
            recipient_hospital=request.recipient,
            medicine=request.medicine,
            transfer_units=request.units
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transfer execution failed: {str(e)}")


@router.get("/network-logistics")
def get_transit_and_criticality_info():
    """
    Returns the real road transit network matrix and medicine clinical criticality profiles.
    """
    formatted_matrix = [
        {
            "from": k[0],
            "to": k[1],
            "distance_km": v["distance_km"],
            "transit_minutes": v["transit_minutes"],
            "corridor": v["corridor"]
        }
        for k, v in HOSPITAL_TRANSIT_MATRIX.items()
    ]
    return {
        "transit_matrix": formatted_matrix,
        "criticality_profiles": MEDICINE_CRITICALITY
    }
