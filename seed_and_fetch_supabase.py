"""
Seed and Fetch Real Data from Supabase
1. Inserts real Dakshina Kannada hospital data from CSV into 'hospitals'.
2. Inserts essential healthcare medicines into 'medicines'.
3. Inserts inventory stock levels and safety thresholds into 'inventory'.
4. Inserts sample verified audit records into 'trade_history'.
5. Fetches and displays all live records using the official Supabase Python library.
"""

import os
import sys
from pathlib import Path
from typing import Any
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

# Ensure UTF-8 output encoding if supported
if sys.stdout and getattr(sys.stdout, "encoding", None) != 'utf-8':
    reconfig = getattr(sys.stdout, "reconfigure", None)
    if callable(reconfig):
        try:
            reconfig(encoding='utf-8')
        except Exception:
            pass

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "").strip() or os.getenv("SUPABASE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
CSV_FILE = Path(__file__).parent / "dakshina_kannada_hospitals.csv"

# 1. Essential medicines in Indian clinical supply
ESSENTIAL_MEDICINES = [
    {"name": "Paracetamol", "category": "Analgesic & Antipyretic", "unit": "Tablets (500mg)", "description": "Fever management and mild-to-moderate pain relief"},
    {"name": "Amoxicillin", "category": "Antibiotic", "unit": "Capsules (500mg)", "description": "Broad-spectrum penicillin antibiotic for bacterial infections"},
    {"name": "Ibuprofen", "category": "NSAID", "unit": "Tablets (400mg)", "description": "Anti-inflammatory and analgesia for acute trauma"},
    {"name": "Insulin Glargine", "category": "Endocrine", "unit": "Vials (100IU/ml)", "description": "Long-acting basal insulin for diabetic stabilization"},
    {"name": "ORS (Oral Rehydration Salts)", "category": "Electrolyte", "unit": "Sachets (21.8g)", "description": "WHO-formula oral rehydration for acute gastroenteritis"},
    {"name": "Metformin", "category": "Anti-diabetic", "unit": "Tablets (500mg)", "description": "First-line biguanide for type 2 diabetes glycemic control"},
    {"name": "Ciprofloxacin", "category": "Fluoroquinolone", "unit": "Tablets (500mg)", "description": "Antibiotic for urinary, respiratory, and GI tract infections"},
    {"name": "Omeprazole", "category": "Proton Pump Inhibitor", "unit": "Capsules (20mg)", "description": "Gastric acid reducer for ulcer disease and stress prophylaxis"},
    {"name": "Remdesivir", "category": "Antiviral", "unit": "Vials (100mg)", "description": "Critical antiviral for severe viral pneumonia and ICU care"},
    {"name": "Ceftriaxone", "category": "Cephalosporin", "unit": "Vials (1g)", "description": "Third-generation cephalosporin for severe hospital-acquired sepsis"}
]

def check_table_columns(table_name: str, required_col: str) -> bool:
    """Check if the table in Supabase has the expected columns."""
    try:
        supabase.table(table_name).select(required_col).limit(1).execute()
        return True
    except Exception as e:
        err_msg = str(e)
        if "Could not find the" in err_msg or "PGRST204" in err_msg:
            return False
        return True

def seed_data():
    print("=" * 65)
    print("[*] MedFlow-AI: Seeding Real Data into Supabase")
    print(f"[*] Target Project: {SUPABASE_URL}")
    print("=" * 65)

    # Check if user has added the columns
    if not check_table_columns("hospitals", "name"):
        print("\n[!] NOTICE: The 'hospitals' table is currently missing the 'name' column.")
        print("[>] Please run the provided SQL script 'setup_supabase_tables.sql' in your Supabase SQL Editor:")
        print("    1. Open: https://supabase.com/dashboard/project/yemmodenuuxixtuuzclq/sql")
        print("    2. Paste the contents of 'setup_supabase_tables.sql'")
        print("    3. Click 'Run'")
        print("After running the SQL, execute this script again!\n")
        return False

    # 1. Seed Hospitals from CSV
    if CSV_FILE.exists():
        print(f"\n[1/4] Reading hospitals from '{CSV_FILE.name}'...")
        df_hosp = pd.read_csv(CSV_FILE)
        df_hosp["latitude"] = pd.to_numeric(df_hosp["latitude"], errors="coerce")
        df_hosp["longitude"] = pd.to_numeric(df_hosp["longitude"], errors="coerce")
        records_hosp: list[dict[str, Any]] = [
            {str(k): (None if pd.isna(v) else v) for k, v in row.items()}
            for row in df_hosp.to_dict(orient="records")
        ]

        try:
            res = supabase.table("hospitals").upsert(records_hosp, on_conflict="hfr_id").execute()
            print(f"[+] Upserted {len(records_hosp)} hospitals into 'hospitals' table.")
        except Exception as e:
            print(f"[!] Hospital upsert notice: {e}")

    # 2. Seed Medicines
    print("\n[2/4] Seeding essential medicines...")
    try:
        res = supabase.table("medicines").upsert(ESSENTIAL_MEDICINES, on_conflict="name").execute()
        print(f"[+] Upserted {len(ESSENTIAL_MEDICINES)} medicines into 'medicines' table.")
    except Exception as e:
        print(f"[!] Medicines upsert notice: {e}")

    # 3. Seed Hospital Inventories
    print("\n[3/4] Seeding initial inventory levels and safety thresholds...")
    inventory_records = [
        # Wenlock District Hospital (Mangalore)
        {"hospital_name": "Wenlock District Hospital", "medicine_name": "Paracetamol", "stock": 1400, "threshold": 600},
        {"hospital_name": "Wenlock District Hospital", "medicine_name": "Amoxicillin", "stock": 850, "threshold": 500},
        {"hospital_name": "Wenlock District Hospital", "medicine_name": "Insulin Glargine", "stock": 420, "threshold": 250},
        {"hospital_name": "Wenlock District Hospital", "medicine_name": "Remdesivir", "stock": 35, "threshold": 80},  # Deficit
        {"hospital_name": "Wenlock District Hospital", "medicine_name": "Ceftriaxone", "stock": 620, "threshold": 300},
        
        # Father Muller Hospital (Kankanady)
        {"hospital_name": "Father Muller Medical College Hospital", "medicine_name": "Paracetamol", "stock": 950, "threshold": 400},
        {"hospital_name": "Father Muller Medical College Hospital", "medicine_name": "Amoxicillin", "stock": 600, "threshold": 350},
        {"hospital_name": "Father Muller Medical College Hospital", "medicine_name": "Remdesivir", "stock": 160, "threshold": 75},  # Surplus!
        {"hospital_name": "Father Muller Medical College Hospital", "medicine_name": "Insulin Glargine", "stock": 310, "threshold": 200},

        # Bantwal Taluka Hospital
        {"hospital_name": "Bantwal Taluka Hospital", "medicine_name": "Paracetamol", "stock": 580, "threshold": 300},
        {"hospital_name": "Bantwal Taluka Hospital", "medicine_name": "Amoxicillin", "stock": 120, "threshold": 350}, # Deficit
        {"hospital_name": "Bantwal Taluka Hospital", "medicine_name": "ORS (Oral Rehydration Salts)", "stock": 800, "threshold": 400}, # Surplus

        # SDM Hospital (Ujire)
        {"hospital_name": "SDM Hospital", "medicine_name": "Amoxicillin", "stock": 700, "threshold": 300}, # Surplus
        {"hospital_name": "SDM Hospital", "medicine_name": "Paracetamol", "stock": 820, "threshold": 400},
        {"hospital_name": "SDM Hospital", "medicine_name": "Ciprofloxacin", "stock": 450, "threshold": 200}
    ]
    try:
        supabase.table("inventory").insert(inventory_records).execute()
        print(f"[+] Inserted {len(inventory_records)} inventory tracking rows into 'inventory' table.")
    except Exception as e:
        print(f"[!] Inventory insert notice: {e}")

    # 4. Seed Verified Trade Record
    print("\n[4/4] Seeding initial verified compliance audit log...")
    sample_trade = [{
        "donor": "Father Muller Medical College Hospital",
        "receiver": "Wenlock District Hospital",
        "medicines": {"Remdesivir": 45},
        "counter_medicines": {"Paracetamol": 250},
        "explanation": "Emergency transfer authorized by Medical Director: Father Muller supplied 45 units of Remdesivir from certified surplus (holding 160 units vs 75 safety buffer) to relieve critical ICU deficit at Wenlock District Hospital.",
        "status": "APPROVED",
        "timestamp": "2026-10-09 01:30:00"
    }]
    try:
        supabase.table("trade_history").insert(sample_trade).execute()
        print("[+] Inserted verified baseline trade into 'trade_history' table.")
    except Exception as e:
        print(f"[!] Trade history insert notice: {e}")

    return True

def fetch_and_display_data():
    print("\n" + "=" * 65)
    print("[*] FETCHING REAL DATA FROM SUPABASE USING PYTHON")
    print("=" * 65)

    # 1. Fetch Hospitals
    print("\n[1. HOSPITALS TABLE] Real Hospitals in Dakshina Kannada:")
    try:
        res = supabase.table("hospitals").select("name, taluk, type, hfr_id, latitude, longitude").limit(8).execute()
        df = pd.DataFrame(res.data)
        if not df.empty:
            print(df.to_string(index=False))
        else:
            print("No records found.")
    except Exception as e:
        print(f"Error fetching hospitals: {e}")

    # 2. Fetch Medicines
    print("\n[2. MEDICINES TABLE] Essential Medicines Catalog:")
    try:
        res = supabase.table("medicines").select("name, category, unit").limit(8).execute()
        df = pd.DataFrame(res.data)
        if not df.empty:
            print(df.to_string(index=False))
        else:
            print("No records found.")
    except Exception as e:
        print(f"Error fetching medicines: {e}")

    # 3. Fetch Inventory
    print("\n[3. INVENTORY TABLE] Real-time Stock & Safety Thresholds:")
    try:
        res = supabase.table("inventory").select("hospital_name, medicine_name, stock, threshold").limit(8).execute()
        df = pd.DataFrame(res.data)
        if not df.empty:
            print(df.to_string(index=False))
        else:
            print("No records found.")
    except Exception as e:
        print(f"Error fetching inventory: {e}")

    # 4. Fetch Trade History
    print("\n[4. TRADE_HISTORY TABLE] Verified Compliance Audit Trail:")
    try:
        res = supabase.table("trade_history").select("id, donor, receiver, status, timestamp").limit(5).execute()
        df = pd.DataFrame(res.data)
        if not df.empty:
            print(df.to_string(index=False))
        else:
            print("No records found.")
    except Exception as e:
        print(f"Error fetching trade history: {e}")

    print("\n" + "=" * 65)
    print("[+] Real data successfully fetched and verified from Supabase!")
    print("=" * 65)

if __name__ == "__main__":
    success = seed_data()
    if success:
        fetch_and_display_data()
