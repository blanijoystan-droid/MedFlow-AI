"""
MedFlow-AI Supabase Integration Client
Provides helper functions to fetch and store real healthcare data in Supabase.
"""

import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "").strip() or os.getenv("SUPABASE_KEY", "").strip()

_supabase_client: Optional[Client] = None

def get_client() -> Optional[Client]:
    """Get or initialize the Supabase client."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if not SUPABASE_URL or not SUPABASE_KEY:
        return None

    try:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return _supabase_client
    except Exception as e:
        print(f"⚠️ Warning: Could not initialize Supabase client: {e}")
        return None

def is_supabase_configured() -> bool:
    """Check if Supabase credentials are configured."""
    return bool(SUPABASE_URL and SUPABASE_KEY)

# ==========================================
# 1. FETCH HOSPITALS
# ==========================================
def fetch_hospitals(taluk: Optional[str] = None, limit: int = 50) -> List[Any]:
    """
    Fetch real hospitals from the Supabase 'hospitals' table.
    Optionally filter by taluk (e.g. 'Mangalore', 'Bantwal', 'Puttur').
    """
    client = get_client()
    if not client:
        return []

    try:
        query = client.table("hospitals").select("*")
        if taluk:
            query = query.eq("taluk", taluk)
        response = query.order("name").limit(limit).execute()
        return response.data or []
    except Exception as e:
        print(f"Error fetching hospitals from Supabase: {e}")
        return []

# ==========================================
# 2. FETCH MEDICINES
# ==========================================
def fetch_medicines(limit: int = 50) -> List[Any]:
    """Fetch essential medicines from the Supabase 'medicines' table."""
    client = get_client()
    if not client:
        return []

    try:
        response = client.table("medicines").select("*").order("name").limit(limit).execute()
        return response.data or []
    except Exception as e:
        print(f"Error fetching medicines from Supabase: {e}")
        return []

# ==========================================
# 3. FETCH INVENTORY
# ==========================================
def fetch_inventory(hospital_name: Optional[str] = None) -> List[Any]:
    """
    Fetch inventory stock and safety threshold records from the 'inventory' table.
    Optionally filter by hospital name.
    """
    client = get_client()
    if not client:
        return []

    try:
        query = client.table("inventory").select("*")
        if hospital_name:
            query = query.eq("hospital_name", hospital_name)
        response = query.execute()
        return response.data or []
    except Exception as e:
        print(f"Error fetching inventory from Supabase: {e}")
        return []

# ==========================================
# 4. FETCH & SAVE TRADE HISTORY
# ==========================================
def fetch_trade_history(limit: int = 20) -> List[Any]:
    """Fetch verified trade audit history from the 'trade_history' table."""
    client = get_client()
    if not client:
        return []

    try:
        response = client.table("trade_history").select("*").order("id", desc=True).limit(limit).execute()
        return response.data or []
    except Exception as e:
        print(f"Error fetching trade history from Supabase: {e}")
        return []

def save_trade_record(trade_data: Dict[str, Any]) -> bool:
    """Save an approved or rejected trade into the Supabase 'trade_history' table."""
    client = get_client()
    if not client:
        return False

    try:
        record = {
            "donor": trade_data.get("donor"),
            "receiver": trade_data.get("receiver"),
            "medicines": trade_data.get("medicines", {}),
            "counter_medicines": trade_data.get("counter_medicines", {}),
            "explanation": trade_data.get("explanation", ""),
            "status": trade_data.get("status", "APPROVED"),
            "timestamp": trade_data.get("timestamp")
        }
        try:
            client.table("trade_history").insert(record).execute()
            return True
        except Exception as insert_err:
            # Fallback if counter_medicines column is not in Supabase schema
            if "counter_medicines" in record:
                record.pop("counter_medicines", None)
                client.table("trade_history").insert(record).execute()
                return True
            raise insert_err
    except Exception as e:
        print(f"Error saving trade record to Supabase: {e}")
        return False
