"""
API Routes for Engine 1: Demand Forecast Engine 📈
Provides 7/14-day healthcare consumption projections, stockout warnings,
and predictive requisition triggers.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, List, Optional
import sys
from pathlib import Path

# Ensure root path is accessible
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.engine.demand_forecast import (
    calculate_demand_forecast,
    scan_all_impending_shortages,
    SEASONAL_FACTORS,
    FACILITY_PROFILES,
    get_current_season
)

router = APIRouter(prefix="/api/forecast", tags=["Demand Forecasting"])


@router.get("")
def get_demand_forecast(
    hospital: str = Query("City General Hospital", description="Hospital facility name"),
    medicine: str = Query("Paracetamol", description="Essential medicine name"),
    horizon: int = Query(14, ge=3, le=30, description="Forecast horizon in days (e.g. 7 or 14)"),
    season: Optional[str] = Query(None, description="Optional epidemiological season override")
):
    """
    Retrieve 7/14-day demand forecast, daily consumption projections, confidence intervals,
    impending stockout risk analysis, and recommended reorder quantities.
    """
    try:
        forecast = calculate_demand_forecast(
            hospital_name=hospital,
            medicine=medicine,
            horizon_days=horizon,
            season=season
        )
        return forecast
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting calculation failed: {str(e)}")


@router.get("/alerts")
def get_forecast_alerts(
    horizon: int = Query(14, ge=3, le=30, description="Forecast horizon in days")
):
    """
    Scan all network hospitals and essential medicines to return proactive warnings
    for medicines predicted to breach safety thresholds or face stockouts.
    """
    try:
        alerts = scan_all_impending_shortages(days_ahead=horizon)
        return {
            "total_alerts": len(alerts),
            "critical_count": sum(1 for a in alerts if a["risk_level"] == "CRITICAL"),
            "high_count": sum(1 for a in alerts if a["risk_level"] == "HIGH"),
            "moderate_count": sum(1 for a in alerts if a["risk_level"] == "MODERATE"),
            "alerts": alerts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alerts scan failed: {str(e)}")


@router.get("/seasons")
def get_seasonal_profiles():
    """
    Retrieve all epidemiological seasonal multipliers, descriptions, and active season.
    """
    return {
        "active_season": get_current_season(),
        "seasons": {
            k: {
                "description": v["description"],
                "multipliers": v["multipliers"]
            }
            for k, v in SEASONAL_FACTORS.items()
        },
        "facilities": FACILITY_PROFILES
    }
