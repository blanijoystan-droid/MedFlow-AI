"""
MedFlow-AI Engine 3: Expiry Intelligence ♻️
Calculates expected consumption before expiry, detects potential unused quantity (waste at risk),
and generates FEFO (First Expired, First Out) redistribution candidates.

Formula:
Expected Consumption = Daily Burn Rate * Days Until Expiry
Potential Unused Quantity = max(0, Batch Stock - Expected Consumption)
Output:
"1,800 units potentially at risk of expiry (₹32,400 value at risk)"
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import sys
from pathlib import Path
import random

# Ensure root directory is accessible for imports
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from state import state
from backend.engine.demand_forecast import calculate_demand_forecast, FACILITY_PROFILES

# === UNIT COSTS IN INDIAN RUPEES (WHO Essential Medicines Benchmark) ===
MEDICINE_UNIT_COSTS = {
    "Paracetamol": 4.5,       # ₹4.50 per strip
    "Amoxicillin": 18.0,      # ₹18.00 per strip (Antibiotic)
    "Ibuprofen": 8.0,         # ₹8.00 per strip
    "Insulin": 320.0,         # ₹320.00 per vial (High value cold-chain)
    "ORS": 22.0,              # ₹22.00 per sachet
    "Ciprofloxacin": 26.0,    # ₹26.00 per strip
    "Metformin": 6.5,         # ₹6.50 per strip (Chronic diabetes)
    "Omeprazole": 14.0        # ₹14.00 per strip
}

def get_unit_cost(medicine: str) -> float:
    """Retrieve unit cost in INR for medicine."""
    for k, v in MEDICINE_UNIT_COSTS.items():
        if k.lower() in medicine.lower():
            return v
    return 15.0


_EXPIRY_BURN_CACHE: Dict[str, float] = {}

def compute_facility_burn_rate(hospital_name: str, medicine: str) -> float:
    """Computes daily consumption burn rate (units/day) via Engine 1 with in-memory caching."""
    cache_key = f"{hospital_name}:{medicine}"
    if cache_key in _EXPIRY_BURN_CACHE:
        return _EXPIRY_BURN_CACHE[cache_key]

    try:
        forecast = calculate_demand_forecast(
            hospital_name=hospital_name,
            medicine=medicine,
            horizon_days=7,
            skip_llm=True
        )
        total_demand = forecast.get("predicted_total_demand", 0)
        rate = max(4.0, round(float(total_demand) / 7.0, 1))
        _EXPIRY_BURN_CACHE[cache_key] = rate
        return rate
    except Exception:
        profile = FACILITY_PROFILES.get(hospital_name, FACILITY_PROFILES["District Government Hospital"])
        rate = max(5.0, round(profile["avg_daily_opd"] * 0.10, 1))
        _EXPIRY_BURN_CACHE[cache_key] = rate
        return rate


def get_hospital_medicine_batches(hospital_name: str, medicine: str) -> List[Dict[str, Any]]:
    """
    Simulates authentic pharmaceutical batches (lots) for a hospital's stock.
    Partitions the inventory into short-expiry and long-expiry batches.
    """
    current_stock = 600
    for h in state.hospitals:
        if h.name.lower() == hospital_name.lower():
            current_stock = h.inventory.get(medicine, 600)
            break

    today = datetime.now()
    seed_val = sum(ord(c) for c in (hospital_name + medicine))
    rng = random.Random(seed_val)

    # Medicine abbreviation for Lot number
    med_abbr = medicine[:4].upper()
    hosp_code = "".join([w[0] for w in hospital_name.split() if w[0].isupper()])

    batches = []

    # If stock is very low, it is a single batch
    if current_stock <= 200:
        days_exp = rng.randint(45, 120)
        exp_date = today + timedelta(days=days_exp)
        batches.append({
            "batch_id": f"LOT-{med_abbr}-{hosp_code}-{exp_date.strftime('%y%m')}-A",
            "stock": current_stock,
            "expiry_date": exp_date.strftime("%Y-%m-%d"),
            "expiry_label": exp_date.strftime("%b %d, %Y"),
            "days_until_expiry": days_exp
        })
    else:
        # Partition stock: Batch 1 (near-term expiry), Batch 2 (safe mid-term)
        # Hospitals with surplus stocks frequently have near-term batches needing FEFO redistribution
        threshold = 400
        for h in state.hospitals:
            if h.name.lower() == hospital_name.lower():
                threshold = h.thresholds.get(medicine, 400)
                break

        is_surplus = current_stock > threshold
        if is_surplus:
            b1_days = rng.randint(25, 45) # 25-45 days left
            b1_ratio = rng.uniform(0.60, 0.80)
        else:
            b1_days = rng.randint(45, 90)
            b1_ratio = rng.uniform(0.40, 0.55)

        b1_stock = round(current_stock * b1_ratio)
        b2_stock = current_stock - b1_stock
        b2_days = rng.randint(180, 365)

        exp1 = today + timedelta(days=b1_days)
        exp2 = today + timedelta(days=b2_days)

        batches.append({
            "batch_id": f"LOT-{med_abbr}-{hosp_code}-{exp1.strftime('%y%m')}-01",
            "stock": b1_stock,
            "expiry_date": exp1.strftime("%Y-%m-%d"),
            "expiry_label": exp1.strftime("%b %d, %Y"),
            "days_until_expiry": b1_days
        })

        if b2_stock > 0:
            batches.append({
                "batch_id": f"LOT-{med_abbr}-{hosp_code}-{exp2.strftime('%y%m')}-02",
                "stock": b2_stock,
                "expiry_date": exp2.strftime("%Y-%m-%d"),
                "expiry_label": exp2.strftime("%b %d, %Y"),
                "days_until_expiry": b2_days
            })

    return batches


def audit_medicine_expiry(
    hospital_name: str,
    medicine: str
) -> Dict[str, Any]:
    """
    ENGINE 3 CORE AUDIT:
    1. Fetches active batches and daily burn rate.
    2. Calculates expected patient consumption before expiry.
    3. Calculates potential unused quantity (waste at risk).
    4. Computes financial loss exposure in INR.
    5. Categorizes FEFO priority & surplus donation eligibility.
    """
    daily_burn = compute_facility_burn_rate(hospital_name, medicine)
    unit_cost = get_unit_cost(medicine)
    batches = get_hospital_medicine_batches(hospital_name, medicine)

    total_stock = sum(b["stock"] for b in batches)
    total_unused_units = 0
    total_financial_loss = 0.0
    audited_batches = []

    for b in batches:
        days_exp = b["days_until_expiry"]
        batch_stock = b["stock"]

        # Expected patient consumption before this batch reaches expiration
        expected_consumption = int(round(daily_burn * days_exp))
        unused_quantity = max(0, batch_stock - expected_consumption)
        financial_loss = round(unused_quantity * unit_cost, 2)
        utilization_pct = min(100.0, round((expected_consumption / max(1, batch_stock)) * 100.0, 1))

        # Expiry risk tier
        if unused_quantity > 0 and days_exp <= 45:
            risk_tier = "CRITICAL"
            badge = "🔴 Waste Imminent"
            color = "#ef4444"
            fefo_action = "🚨 Must-Donate Surplus (FEFO Priority 1)"
        elif unused_quantity > 0 and days_exp <= 90:
            risk_tier = "HIGH"
            badge = "🟠 High Expiry Risk"
            color = "#f97316"
            fefo_action = "⚠️ Expedite Internal Use or Barter Transfer"
        elif unused_quantity > 0 and days_exp <= 180:
            risk_tier = "MODERATE"
            badge = "🟡 Watch / Moderate"
            color = "#eab308"
            fefo_action = "Monitor OPD burn velocity"
        else:
            risk_tier = "SAFE"
            badge = "🟢 Safe Utilization"
            color = "#10b981"
            fefo_action = "Batch fully consumed before expiry"

        total_unused_units += unused_quantity
        total_financial_loss += financial_loss

        audited_batches.append({
            "batch_id": b["batch_id"],
            "batch_stock": batch_stock,
            "expiry_date": b["expiry_date"],
            "expiry_label": b["expiry_label"],
            "days_until_expiry": days_exp,
            "expected_consumption": min(batch_stock, expected_consumption),
            "potential_unused_units": unused_quantity,
            "financial_loss_inr": financial_loss,
            "utilization_pct": utilization_pct,
            "risk_tier": risk_tier,
            "badge": badge,
            "color": color,
            "fefo_action": fefo_action,
            "is_donation_candidate": unused_quantity > 0 and days_exp <= 90
        })

    # Sort batches by nearest expiry (FEFO: First Expired, First Out)
    audited_batches.sort(key=lambda x: x["days_until_expiry"])

    # Overall item status
    if total_unused_units > 0:
        overall_status = f"{total_unused_units:,} units potentially at risk of expiry (₹{total_financial_loss:,.2f} value at risk)"
        has_waste_risk = True
    else:
        overall_status = f"✅ All {total_stock:,} units safely projected for 100% patient consumption before expiry."
        has_waste_risk = False

    # Clinical insight text
    nearest_batch = audited_batches[0] if audited_batches else None
    if has_waste_risk and nearest_batch:
        clinical_insight = (
            f"At the current burn rate of {daily_burn} units/day, {hospital_name} will fail to consume "
            f"{total_unused_units:,} units of {medicine} from batch {nearest_batch['batch_id']} before its expiration "
            f"in {nearest_batch['days_until_expiry']} days. Proactive redistribution to a high-volume teaching hospital "
            f"will completely prevent this ₹{total_financial_loss:,.0f} clinical write-off."
        )
    else:
        clinical_insight = (
            f"Patient demand at {hospital_name} ({daily_burn} units/day) fully absorbs all available batches "
            f"of {medicine} prior to their respective expiration dates. No surplus redistribution is required."
        )

    return {
        "hospital": hospital_name,
        "medicine": medicine,
        "total_stock": total_stock,
        "daily_burn_rate": daily_burn,
        "unit_cost_inr": unit_cost,
        "total_unused_units": total_unused_units,
        "total_financial_loss_inr": round(total_financial_loss, 2),
        "has_waste_risk": has_waste_risk,
        "status_summary": overall_status,
        "clinical_insight": clinical_insight,
        "batches": audited_batches
    }


def scan_network_expiry_intelligence() -> Dict[str, Any]:
    """
    Scans every medicine across all hospitals in Karnataka.
    Identifies all batches at risk of expiration and creates the FEFO Redistribution Pool.
    """
    all_audits = []
    total_waste_units = 0
    total_waste_inr = 0.0
    critical_batches_count = 0
    high_batches_count = 0
    donation_candidates = []

    for h in state.hospitals:
        for med in h.inventory.keys():
            audit = audit_medicine_expiry(h.name, med)
            all_audits.append(audit)

            total_waste_units += audit["total_unused_units"]
            total_waste_inr += audit["total_financial_loss_inr"]

            for b in audit["batches"]:
                if b["risk_tier"] == "CRITICAL":
                    critical_batches_count += 1
                elif b["risk_tier"] == "HIGH":
                    high_batches_count += 1

                if b["is_donation_candidate"]:
                    donation_candidates.append({
                        "donor_hospital": h.name,
                        "medicine": med,
                        "batch_id": b["batch_id"],
                        "batch_stock": b["batch_stock"],
                        "unused_quantity": b["potential_unused_units"],
                        "days_until_expiry": b["days_until_expiry"],
                        "expiry_label": b["expiry_label"],
                        "financial_loss_inr": b["financial_loss_inr"],
                        "risk_tier": b["risk_tier"],
                        "badge": b["badge"],
                        "color": b["color"]
                    })

    # Sort donation candidates: most imminent expiry & highest unused quantity first (FEFO)
    donation_candidates.sort(key=lambda x: (x["days_until_expiry"], -x["unused_quantity"]))

    return {
        "network_summary": {
            "total_units_at_risk": total_waste_units,
            "total_financial_loss_inr": round(total_waste_inr, 2),
            "critical_batches_count": critical_batches_count,
            "high_batches_count": high_batches_count,
            "total_at_risk_batches": len(donation_candidates)
        },
        "donation_candidates": donation_candidates,
        "all_audits": all_audits
    }
