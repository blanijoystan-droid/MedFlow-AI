"""
MedFlow-AI Engine 5: Priority Engine ⚖️
When multiple hospitals need the same scarce stock, calculates multi-attribute triage ranking:
1. Stockout Urgency (Days of supply remaining, deficit severity)
2. Clinical Criticality (Life-saving therapeutic index, emergency category)
3. Patient Load (Active inpatient bed occupancy & daily footfall)
4. Alternative Availability (Therapeutic substitutability in existing inventory)
5. Operational Urgency (Supply lead-time vulnerability, isolation factor)

Output:
"Hospital A — Priority 94/100"
"""

import math
from typing import Dict, Any, List, Optional
import sys
from pathlib import Path

# Ensure root directory is accessible
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from state import state
from backend.engine.demand_forecast import FACILITY_PROFILES, calculate_demand_forecast
from backend.engine.risk_engine import evaluate_medicine_risk, get_facility_supply_params
from backend.engine.redistribution_optimizer import MEDICINE_CRITICALITY

# In-memory burn rate cache to keep multi-hospital triage instant
_BURN_CACHE: Dict[str, float] = {}

# Facility demographic & operational vulnerability profiles
FACILITY_VULNERABILITY = {
    "City General Hospital": {
        "daily_patient_footfall": 850,
        "icu_beds": 42,
        "isolation_lead_time_days": 1.5,
        "vulnerability_score": 55
    },
    "District Government Hospital": {
        "daily_patient_footfall": 620,
        "icu_beds": 24,
        "isolation_lead_time_days": 2.5,
        "vulnerability_score": 70
    },
    "Rural Primary Health Centre": {
        "daily_patient_footfall": 180,
        "icu_beds": 4,
        "isolation_lead_time_days": 4.5,
        "vulnerability_score": 92  # High vulnerability due to geographic isolation & fragile supply line
    }
}

# Therapeutic Alternatives mapping (if primary is out, can they substitute?)
THERAPEUTIC_ALTERNATIVES = {
    "Amoxicillin": ["Ciprofloxacin"],
    "Ciprofloxacin": ["Amoxicillin"],
    "Paracetamol": ["Ibuprofen"],
    "Ibuprofen": ["Paracetamol"],
    "Insulin": [],  # Zero substitute! Absolute clinical dependency
    "ORS": [],      # Primary acute electrolyte replacement
    "Metformin": [],
    "Omeprazole": []
}


def _get_burn_rate(hospital_name: str, medicine: str) -> float:
    cache_key = f"{hospital_name}_{medicine}"
    if cache_key in _BURN_CACHE:
        return _BURN_CACHE[cache_key]
    
    try:
        fc = calculate_demand_forecast(hospital_name=hospital_name, medicine=medicine, horizon_days=7, skip_llm=True)
        burn = float(fc.get("metrics", {}).get("mean_daily_burn", 25.0))
    except Exception:
        burn = 25.0
    _BURN_CACHE[cache_key] = burn
    return burn


def evaluate_hospital_priority(
    hospital_name: str,
    medicine: str
) -> Dict[str, Any]:
    """
    Evaluates a single hospital's clinical triage priority score (0 - 100)
    for a given scarce medicine.
    """
    # 1. Identify Hospital State
    hospital_agent = None
    for h in state.hospitals:
        if h.name.lower() == hospital_name.lower():
            hospital_agent = h
            break

    current_stock = hospital_agent.inventory.get(medicine, 0) if hospital_agent else 100
    threshold = hospital_agent.thresholds.get(medicine, 400) if hospital_agent else 400
    deficit = max(0, threshold - current_stock)

    burn_rate = _get_burn_rate(hospital_name, medicine)
    days_of_supply = round(current_stock / max(0.5, burn_rate), 1)

    # === FACTOR 1: STOCKOUT URGENCY (Max 25 pts) ===
    # Measures how close the hospital is to a complete stockout
    if days_of_supply <= 0.5 or current_stock == 0:
        stockout_urgency = 25.0
        stockout_desc = "IMMINENT ZERO STOCKOUT: Under 12 hours of inventory remaining"
    elif days_of_supply <= 1.5:
        stockout_urgency = 23.0
        stockout_desc = f"CRITICAL: Only {days_of_supply} days of supply remaining"
    elif days_of_supply <= 3.0:
        stockout_urgency = 18.0
        stockout_desc = f"HIGH RISK: {days_of_supply} days of supply before depletion"
    elif days_of_supply <= 5.0:
        stockout_urgency = 12.0
        stockout_desc = f"WATCHLIST: {days_of_supply} days of supply remaining"
    else:
        stockout_urgency = max(2.0, round(25.0 - (days_of_supply * 2.0), 1))
        stockout_desc = f"STABLE BUFFER: {days_of_supply} days of supply"

    # === FACTOR 2: CLINICAL CRITICALITY (Max 25 pts) ===
    # Based on physiological indispensability of the medication
    crit_info = MEDICINE_CRITICALITY.get(medicine, {"criticality_score": 65, "category": "General"})
    # Normalize 0-100 criticality score to 0-25 pts
    clinical_criticality = round((crit_info["criticality_score"] / 100.0) * 25.0, 1)

    # === FACTOR 3: PATIENT LOAD (Max 20 pts) ===
    # Active patient census and bed occupancy at risk
    vuln = FACILITY_VULNERABILITY.get(hospital_name, {
        "daily_patient_footfall": 400,
        "icu_beds": 15,
        "isolation_lead_time_days": 2.0,
        "vulnerability_score": 70
    })
    
    # Weight based on daily footfall + ICU exposure (capped at 20)
    footfall_norm = min(12.0, (vuln["daily_patient_footfall"] / 850.0) * 12.0)
    icu_norm = min(8.0, (vuln["icu_beds"] / 42.0) * 8.0)
    patient_load_score = round(footfall_norm + icu_norm, 1)

    # === FACTOR 4: ALTERNATIVE AVAILABILITY (Max 15 pts) ===
    # If no therapeutic alternative exists, score is high (15/15)
    alternatives = THERAPEUTIC_ALTERNATIVES.get(medicine, [])
    if not alternatives:
        alt_score = 15.0
        alt_desc = "Zero therapeutic substitutes exist (Absolute dependency)"
    else:
        # Check if alternative is available in hospital's own inventory
        alt_stock = 0
        if hospital_agent:
            for alt_med in alternatives:
                alt_stock += hospital_agent.inventory.get(alt_med, 0)
        
        if alt_stock <= 50:
            alt_score = 13.0
            alt_desc = f"Alternative ({', '.join(alternatives)}) also near depletion ({alt_stock} units)"
        elif alt_stock <= 200:
            alt_score = 8.0
            alt_desc = f"Partial alternative available: {alt_stock} units of {', '.join(alternatives)}"
        else:
            alt_score = 3.0
            alt_desc = f"Viable clinical substitute available: {alt_stock} units of {', '.join(alternatives)}"

    # === FACTOR 5: OPERATIONAL URGENCY / ISOLATION (Max 15 pts) ===
    # Remoteness and supplier replenishment lead times
    isolation_days = vuln["isolation_lead_time_days"]
    operational_urgency = min(15.0, round((isolation_days / 4.5) * 15.0, 1))

    # === TOTAL MULTI-ATTRIBUTE PRIORITY SCORE (0 - 100) ===
    total_priority = round(
        stockout_urgency + clinical_criticality + patient_load_score + alt_score + operational_urgency
    )
    total_priority = max(1, min(100, total_priority))

    priority_label = (
        "🔴 Emergency Tier 1 (Immediate Dispatch)" if total_priority >= 85 else
        "🟠 High Tier 2 (Priority Allocation)" if total_priority >= 70 else
        "🟡 Moderate Tier 3 (Scheduled Delivery)" if total_priority >= 50 else
        "🟢 Low Tier 4 (Routine Maintenance)"
    )

    output_string = f"{hospital_name} — Priority {total_priority}/100"

    return {
        "hospital": hospital_name,
        "medicine": medicine,
        "priority_score": total_priority,
        "output_format": output_string,
        "tier": priority_label,
        "current_stock": current_stock,
        "deficit": deficit,
        "days_of_supply": days_of_supply,
        "burn_rate": burn_rate,
        "factors": {
            "stockout_urgency": {
                "score": stockout_urgency,
                "max": 25.0,
                "details": stockout_desc
            },
            "clinical_criticality": {
                "score": clinical_criticality,
                "max": 25.0,
                "details": f"{crit_info['category']} (Index: {crit_info['criticality_score']}/100)"
            },
            "patient_load": {
                "score": patient_load_score,
                "max": 20.0,
                "details": f"{vuln['daily_patient_footfall']} daily patients, {vuln['icu_beds']} ICU beds"
            },
            "alternative_availability": {
                "score": alt_score,
                "max": 15.0,
                "details": alt_desc
            },
            "operational_urgency": {
                "score": operational_urgency,
                "max": 15.0,
                "details": f"{isolation_days} days supplier lead time vulnerability"
            }
        }
    }


def triage_competing_hospitals(
    medicine: str,
    available_units: Optional[int] = None
) -> Dict[str, Any]:
    """
    Ranks all hospitals in the network by triage priority for a scarce batch of medicine.
    Calculates recommended proportional or priority-based allocation of available units.
    """
    evaluations = []
    total_deficit = 0

    for h in state.hospitals:
        ev = evaluate_hospital_priority(h.name, medicine)
        evaluations.append(ev)
        total_deficit += ev["deficit"]

    # Rank by Priority Score descending
    evaluations.sort(key=lambda x: x["priority_score"], reverse=True)

    # Top priority hospital
    top_facility = evaluations[0]
    output_headline = top_facility["output_format"]

    # Allocation breakdown if units provided
    allocations = []
    if available_units is not None and available_units > 0:
        # Triage-weighted allocation:
        # Higher priority gets first claim up to their deficit
        remaining_batch = available_units
        for ev in evaluations:
            # Needed quantity
            needed = ev["deficit"] if ev["deficit"] > 0 else 50
            allocated = min(remaining_batch, needed)
            remaining_batch -= allocated
            
            allocations.append({
                "hospital": ev["hospital"],
                "priority_score": ev["priority_score"],
                "requested_deficit": needed,
                "allocated_units": allocated,
                "satisfaction_pct": round((allocated / max(1, needed)) * 100, 1)
            })

    return {
        "medicine": medicine,
        "available_units": available_units,
        "top_priority": top_facility["hospital"],
        "top_score": top_facility["priority_score"],
        "output_headline": output_headline,
        "ranked_hospitals": evaluations,
        "allocations": allocations,
        "total_network_deficit": total_deficit
    }


def scan_network_priority_triage() -> List[Dict[str, Any]]:
    """
    Scans all 8 critical medicines across all network facilities,
    highlighting which facility has the highest priority for each drug.
    """
    all_medicines = [
        "Insulin", "Amoxicillin", "Ciprofloxacin", "Paracetamol", 
        "Ibuprofen", "ORS", "Metformin", "Omeprazole"
    ]
    triage_overview = []

    for med in all_medicines:
        tr = triage_competing_hospitals(medicine=med)
        triage_overview.append({
            "medicine": med,
            "top_hospital": tr["top_priority"],
            "top_score": tr["top_score"],
            "headline": tr["output_headline"],
            "rankings": [
                {
                    "hospital": r["hospital"],
                    "score": r["priority_score"],
                    "tier": r["tier"],
                    "dos": r["days_of_supply"],
                    "stock": r["current_stock"]
                }
                for r in tr["ranked_hospitals"]
            ]
        })

    # Sort so medicines with the highest emergency scores appear first
    triage_overview.sort(key=lambda x: x["top_score"], reverse=True)
    return triage_overview
