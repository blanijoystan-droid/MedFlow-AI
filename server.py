"""
MedFlow-AI FastAPI Backend Server
Bridges the Python multi-agent system with the modern React.js frontend.
"""

import os
import sys
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
import uvicorn
from dotenv import set_key, load_dotenv

# Ensure local imports work
sys.path.insert(0, str(Path(__file__).parent))

import config
from data import (
    generate_hospitals, 
    load_dakshina_kannada_hospitals, 
    get_all_taluks, 
    get_hospitals_by_taluk,
    ALL_DK_HOSPITALS
)
from negotiation import run_negotiation, execute_trade, reject_trade
from llm_client import get_reasoning_log, get_reasoning_stats, clear_reasoning_log
from chatbot import ask_supply_chain_assistant
import agents as agents_module

app = FastAPI(
    title="MedFlow-AI API",
    description="Multi-Agent LLM Medical Supply Chain Negotiation Backend — Dakshina Kannada Network",
    version="2.0.0"
)

# Enable CORS for React frontend (Vite runs on port 5173 by default)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modular Map, Requisition, Demand Forecasting, Risk, Expiry, Redistribution & Priority Routers
from backend.routes.medicine_request import router as medicine_request_router
from backend.routes.nearby_hospitals import router as nearby_hospitals_router
from backend.routes.forecast import router as forecast_router
from backend.routes.risk import router as risk_router
from backend.routes.expiry import router as expiry_router
from backend.routes.redistribution import router as redistribution_router
from backend.routes.priority import router as priority_router

app.include_router(medicine_request_router)
app.include_router(nearby_hospitals_router)
app.include_router(forecast_router)
app.include_router(risk_router)
app.include_router(expiry_router)
app.include_router(redistribution_router)
app.include_router(priority_router)

# === CENTRAL IN-MEMORY STATE ===
from state import state, SystemState

# === REQUEST MODELS ===
class SaveKeyRequest(BaseModel):
    api_key: str

class ScenarioRequest(BaseModel):
    taluk: Optional[str] = None
    count: Optional[int] = 3
    hospital_names: Optional[List[str]] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: Optional[float] = 15.0
    location_label: Optional[str] = None

class ChatRequest(BaseModel):
    question: str

def format_hospitals_data():
    """Serialize hospital agents for JSON response including live distance metadata."""
    result = []
    for hospital in state.hospitals:
        shortages = hospital.detect_shortages()
        surpluses = hospital.get_surpluses()
        
        # Calculate status breakdown
        status_counts = {"critical": 0, "warning": 0, "ok": 0}
        for med, stock in hospital.inventory.items():
            threshold = hospital.thresholds.get(med, 0)
            if stock < threshold * 0.5:
                status_counts["critical"] += 1
            elif stock < threshold:
                status_counts["warning"] += 1
            else:
                status_counts["ok"] += 1

        result.append({
            "name": hospital.name,
            "location": hospital.location,
            "taluk": getattr(hospital, "taluk", "Nearby"),
            "type": getattr(hospital, "hospital_type", "Government"),
            "latitude": getattr(hospital, "latitude", None),
            "longitude": getattr(hospital, "longitude", None),
            "distance_km": getattr(hospital, "distance_km", None),
            "hfr_id": getattr(hospital, "hfr_id", ""),
            "inventory": hospital.inventory,
            "thresholds": hospital.thresholds,
            "shortages": shortages,
            "surpluses": surpluses,
            "status_counts": status_counts
        })
    return result

# === API ENDPOINTS ===

frontend_dist = Path(__file__).parent / "frontend" / "dist"

@app.get("/")
def root():
    """Serves the built React application if available, else API health info."""
    index_file = frontend_dist / "index.html"
    if index_file.is_file():
        from fastapi.responses import FileResponse
        return FileResponse(index_file)
    return {
        "status": "online",
        "service": "MedFlow-AI",
        "version": "2.0.0",
        "message": "MedFlow-AI backend is running successfully.",
        "docs": "/docs",
        "redoc": "/redoc",
        "status_endpoint": "/api/status"
    }


@app.get("/health")
def health_check():
    """Lightweight health-check endpoint for the frontend/deployment."""
    return {
        "status": "healthy",
        "service": "MedFlow-AI"
    }


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    """Provide the browser tab icon when the API landing page is opened."""
    return Response(
        content='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
                '<text y=".9em" font-size="90">🏥</text></svg>',
        media_type="image/svg+xml"
    )


@app.get("/api/status")
def get_system_status():
    """Return backend status, LLM provider (Grok or Gemini), and scenario counter."""
    load_dotenv(override=True)
    config.MODEL_NAME = os.getenv("MODEL_NAME", "gemini-3.5-flash-lite")
    
    has_valid_key = bool(
        (config.LLM_PROVIDER == 'grok' and config.GROK_API_KEY and len(config.GROK_API_KEY) > 10)
        or (config.GEMINI_API_KEY and config.GEMINI_API_KEY != "your_gemini_api_key_here" and len(config.GEMINI_API_KEY) > 15)
    )
    return {
        "status": "online",
        "district": "Dakshina Kannada",
        "active_taluk": state.active_taluk or "All",
        "total_facilities": len(ALL_DK_HOSPITALS),
        "api_key_configured": has_valid_key,
        "provider": config.LLM_PROVIDER,
        "model": config.MODEL_NAME,
        "scenario_count": state.scenario_count,
        "has_pending_trade": state.pending_trade is not None,
        "total_events": len(state.events),
        "total_trades": len(state.trade_history)
    }

@app.post("/api/save-key")
def save_api_key(req: SaveKeyRequest):
    """Save or update API key (auto-detects Grok or Gemini) in .env and runtime memory."""
    key = req.api_key.strip()
    if len(key) < 15:
        raise HTTPException(status_code=400, detail="Invalid API key format.")

    env_path = Path(__file__).parent / ".env"
    
    # Auto-detect if key is xAI Grok (starts with xai-) or Gemini (starts with AIza)
    if key.startswith("xai-"):
        set_key(str(env_path), "GROK_API_KEY", key)
        set_key(str(env_path), "LLM_PROVIDER", "grok")
        set_key(str(env_path), "GROK_MODEL", "grok-2-latest")
        os.environ["GROK_API_KEY"] = key
        os.environ["LLM_PROVIDER"] = "grok"
        config.GROK_API_KEY = key
        config.LLM_PROVIDER = "grok"
        config.MODEL_NAME = "grok-2-latest"
        provider_name = "xAI Grok (grok-2-latest)"
    else:
        set_key(str(env_path), "GEMINI_API_KEY", key)
        set_key(str(env_path), "LLM_PROVIDER", "gemini")
        os.environ["GEMINI_API_KEY"] = key
        os.environ["LLM_PROVIDER"] = "gemini"
        config.GEMINI_API_KEY = key
        config.LLM_PROVIDER = "gemini"
        provider_name = f"Gemini ({config.MODEL_NAME})"
        
        # Re-initialize Gemini client
        import llm_client
        try:
            from google import genai  # type: ignore
            llm_client.client = genai.Client(api_key=key)  # type: ignore
        except Exception:
            pass

    return {
        "success": True, 
        "message": f"{provider_name} API key connected successfully."
    }

@app.get("/api/dakshina-kannada/directory")
def get_dakshina_kannada_directory():
    """Return all 28 real hospitals in Dakshina Kannada with metadata."""
    hospitals = load_dakshina_kannada_hospitals()
    return {
        "district": "Dakshina Kannada",
        "total": len(hospitals),
        "hospitals": hospitals
    }

@app.get("/api/dakshina-kannada/taluks")
def get_dakshina_kannada_taluks():
    """Return taluk breakdown with hospital counts."""
    hospitals = load_dakshina_kannada_hospitals()
    counts = {}
    for h in hospitals:
        t = h.get("taluk", "Dakshina Kannada")
        counts[t] = counts.get(t, 0) + 1

    taluk_list = [{"name": "All", "label": "All Dakshina Kannada", "count": len(hospitals)}]
    for t in sorted(counts.keys()):
        taluk_list.append({"name": t, "label": f"{t} Taluk", "count": counts[t]})

    return {
        "taluks": taluk_list
    }

@app.get("/api/hospitals")
def get_hospitals(
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    radius_km: Optional[float] = Query(None)
):
    """Retrieve the current state of all hospitals in the network, optionally filtered by live location."""
    if lat is not None and lng is not None:
        state.reset_scenario(
            count=state.active_count,
            lat=lat,
            lng=lng,
            radius_km=radius_km or 15.0
        )
    return {
        "scenario_count": state.scenario_count,
        "active_taluk": state.active_taluk or "All",
        "user_location": state.user_location,
        "hospitals": format_hospitals_data()
    }

@app.post("/api/scenario/new")
def new_scenario(req: Optional[ScenarioRequest] = None):
    """Generate a brand new random hospital network crisis scenario filtered by live location."""
    taluk = req.taluk if req else None
    count = req.count if req and req.count else 3
    hospital_names = req.hospital_names if req else None
    lat = req.lat if req else None
    lng = req.lng if req else None
    radius_km = req.radius_km if req else 15.0
    location_label = req.location_label if req else None
    state.reset_scenario(
        taluk=taluk,
        count=count,
        hospital_names=hospital_names,
        lat=lat,
        lng=lng,
        radius_km=radius_km,
        location_label=location_label
    )
    return {
        "scenario_count": state.scenario_count,
        "active_taluk": state.active_taluk or "All",
        "user_location": state.user_location,
        "hospitals": format_hospitals_data(),
        "events": state.events,
        "pending_trade": state.pending_trade
    }

@app.post("/api/negotiate")
def trigger_negotiation():
    """Execute LLM multi-agent negotiation across the network."""
    load_dotenv(override=True)
    config.MODEL_NAME = os.getenv("MODEL_NAME", "gemini-3.5-flash-lite")
    
    if config.LLM_PROVIDER != 'grok':
        if not config.GEMINI_API_KEY or config.GEMINI_API_KEY == "your_gemini_api_key_here":
            raise HTTPException(
                status_code=400, 
                detail="GEMINI_API_KEY is not configured. Please add your Gemini API key in the settings panel."
            )

    try:
        result = run_negotiation(state.hospitals)
        state.events = result["events"]
        state.pending_trade = result["pending_trade"]

        return {
            "success": True,
            "events": state.events,
            "pending_trade": state.pending_trade,
            "hospitals": format_hospitals_data()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/trade/approve")
def approve_trade():
    """Human-in-the-loop: Approve and execute the pending trade."""
    if not state.pending_trade:
        raise HTTPException(status_code=400, detail="No pending trade to approve.")

    try:
        trade = state.pending_trade
        report = execute_trade(trade, state.hospitals)

        trade_record = {
            "trade_id": len(state.trade_history) + 1,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "donor": trade["donor"],
            "receiver": trade["receiver"],
            "medicines": trade["medicines"],
            "counter_medicines": trade["counter_medicines"],
            "explanation": trade["explanation"],
            "status": "APPROVED",
            "report": report
        }
        state.trade_history.append(trade_record)

        # Sync to Supabase if configured
        try:
            import supabase_client
            supabase_client.save_trade_record(trade_record)
        except Exception as sb_err:
            print(f"[Supabase Sync Note]: {sb_err}")

        state.events.append({
            "step": len(state.events) + 1,
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "agent": "Administrator",
            "type": "approval",
            "message": f"✅ Trade APPROVED by Administrator. Executed transfers between {trade['donor']} and {trade['receiver']}.",
            "reasoning": "Human verification confirmed the transfer is safe and effective.",
            "target": "Network"
        })

        state.pending_trade = None

        return {
            "success": True,
            "message": "Trade approved and executed successfully.",
            "hospitals": format_hospitals_data(),
            "events": state.events,
            "trade_history": state.trade_history,
            "pending_trade": None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/trade/reject")
def reject_current_trade():
    """Human-in-the-loop: Reject the pending trade."""
    if not state.pending_trade:
        raise HTTPException(status_code=400, detail="No pending trade to reject.")

    try:
        trade = state.pending_trade
        rejection_record = reject_trade(trade)

        trade_record = {
            "trade_id": len(state.trade_history) + 1,
            "timestamp": rejection_record["timestamp"],
            "donor": trade["donor"],
            "receiver": trade["receiver"],
            "medicines": trade["medicines"],
            "counter_medicines": trade["counter_medicines"],
            "explanation": trade["explanation"],
            "status": "REJECTED"
        }
        state.trade_history.append(trade_record)

        state.events.append({
            "step": len(state.events) + 1,
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "agent": "Administrator",
            "type": "rejection",
            "message": "❌ Trade REJECTED by Administrator. No hospital inventories were modified.",
            "reasoning": "Administrator denied the proposed transfer.",
            "target": "Network"
        })

        state.pending_trade = None

        return {
            "success": True,
            "message": "Trade rejected by administrator.",
            "hospitals": format_hospitals_data(),
            "events": state.events,
            "trade_history": state.trade_history,
            "pending_trade": None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/events")
def get_events():
    """Retrieve all negotiation events and current pending trade."""
    return {
        "events": state.events,
        "pending_trade": state.pending_trade
    }

@app.get("/api/history")
def get_trade_history():
    """Retrieve the permanent trade history log and aggregated audit stats."""
    approved_count = sum(1 for t in state.trade_history if t.get("status") == "APPROVED")
    rejected_count = sum(1 for t in state.trade_history if t.get("status") == "REJECTED")
    total_units = sum(
        sum(t.get("medicines", {}).values())
        for t in state.trade_history
        if t.get("status") == "APPROVED"
    )

    return {
        "trades": list(reversed(state.trade_history)),
        "stats": {
            "approved": approved_count,
            "rejected": rejected_count,
            "total_transferred": total_units
        }
    }

@app.get("/api/reasoning")
def get_reasoning():
    """Retrieve all LLM reasoning logs and real-time API latency statistics."""
    logs = get_reasoning_log()
    stats = get_reasoning_stats()
    return {
        "logs": list(reversed(logs)),
        "stats": stats
    }


@app.post("/api/chat")
def chat_endpoint(payload: ChatRequest):
    """Answer a question using a read-only snapshot of the current system state."""
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        response = ask_supply_chain_assistant(
            question,
            format_hospitals_data(),
            state.trade_history,
            state.pending_trade,
        )
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Assistant request failed: {e}")


@app.post("/api/reasoning/clear")
def clear_reasoning():
    """Clear reasoning logs."""
    clear_reasoning_log()
    return {"success": True, "message": "Reasoning log cleared."}

# Mount React static build if available
frontend_dist = Path(__file__).parent / "frontend" / "dist"
if frontend_dist.exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    if (frontend_dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")

if __name__ == "__main__":
    reconf = getattr(sys.stdout, "reconfigure", None)
    if callable(reconf):
        try:
            reconf(encoding="utf-8")
        except Exception:
            pass
    
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    print(f"[*] Starting MedFlow-AI Server on http://{host}:{port}")
    uvicorn.run("server:app", host=host, port=port, reload=True)
