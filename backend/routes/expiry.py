"""
API Routes for Engine 3: Expiry Intelligence ♻️
Audits medicine batches, detects unused quantities before expiration,
and generates FEFO (First Expired, First Out) donation candidates.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, Optional
import sys
from pathlib import Path

# Ensure root directory is accessible
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.engine.expiry_engine import (
    audit_medicine_expiry,
    scan_network_expiry_intelligence
)

router = APIRouter(prefix="/api/expiry", tags=["Expiry Intelligence"])


@router.get("/audit")
def get_medicine_expiry_audit(
    hospital: str = Query("District Government Hospital", description="Healthcare facility name"),
    medicine: str = Query("Amoxicillin", description="Essential medicine name")
):
    """
    Audit batch expiration, expected consumption before expiry, and potential unused units.
    """
    try:
        audit = audit_medicine_expiry(hospital_name=hospital, medicine=medicine)
        return audit
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Expiry audit failed: {str(e)}")


@router.get("/network")
def get_network_expiry_overview():
    """
    Scan all hospitals in Karnataka network for impending batch expirations and waste risk.
    """
    try:
        overview = scan_network_expiry_intelligence()
        return overview
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Network expiry scan failed: {str(e)}")


@router.get("/candidates")
def get_donation_candidates():
    """
    Retrieve top FEFO batches marked as 'Must-Donate Surplus' for Engine 4 Redistribution.
    """
    try:
        overview = scan_network_expiry_intelligence()
        return {
            "total_candidates": len(overview["donation_candidates"]),
            "candidates": overview["donation_candidates"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch donation candidates: {str(e)}")
