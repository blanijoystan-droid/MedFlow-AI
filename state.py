"""
MedFlow-AI Central Shared System State
Provides a single source of truth for hospital inventories, negotiation events,
pending trades, immutable trade history, and map-based medicine requests.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from data import generate_hospitals


class SystemState:
    def __init__(self):
        self.active_taluk: Optional[str] = "All"
        self.active_count: int = 3
        self.user_location: Optional[Dict[str, Any]] = None
        self.hospitals = generate_hospitals()
        self.events: List[Dict[str, Any]] = []
        self.pending_trade: Optional[Dict[str, Any]] = None
        self.trade_history: List[Dict[str, Any]] = []
        self.scenario_count: int = 1
        self.medicine_requests: List[Dict[str, Any]] = []

    def reset_scenario(
        self,
        taluk: Optional[str] = None,
        count: int = 3,
        hospital_names: Optional[List[str]] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius_km: Optional[float] = None,
        location_label: Optional[str] = None
    ):
        self.active_taluk = taluk or "All"
        self.active_count = count
        if lat is not None and lng is not None:
            self.user_location = {
                "lat": float(lat),
                "lng": float(lng),
                "label": location_label or f"{lat:.4f}°N, {lng:.4f}°E",
                "radius_km": float(radius_km or 15.0)
            }

        user_lat = lat if lat is not None else (self.user_location["lat"] if self.user_location else None)
        user_lng = lng if lng is not None else (self.user_location["lng"] if self.user_location else None)
        rad = radius_km if radius_km is not None else (self.user_location["radius_km"] if self.user_location else 25.0)

        self.hospitals = generate_hospitals(
            taluk=taluk,
            count=count,
            hospital_names=hospital_names,
            user_lat=user_lat,
            user_lng=user_lng,
            radius_km=rad
        )
        self.events = []
        self.pending_trade = None
        self.scenario_count += 1


# Global singleton instance shared across server and modular route handlers
state = SystemState()
