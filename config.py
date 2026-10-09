"""
MedFlow-AI Configuration Module
Loads environment variables and exposes critical system parameters.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# === PROVIDER & API KEY CONFIGURATION ===
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
GROK_API_KEY = os.getenv('GROK_API_KEY') or os.getenv('XAI_API_KEY')

# Auto-detect or use explicit provider
configured_provider = os.getenv('LLM_PROVIDER', '').lower()
if configured_provider == 'grok' or (GROK_API_KEY and not GEMINI_API_KEY):
    LLM_PROVIDER = 'grok'
    MODEL_NAME = os.getenv('GROK_MODEL', os.getenv('MODEL_NAME', 'grok-2-latest'))
else:
    LLM_PROVIDER = 'gemini'
    MODEL_NAME = os.getenv('MODEL_NAME', 'gemini-3.5-flash-lite')

# In server mode, allow startup without key so user can configure key via web UI modal
if LLM_PROVIDER == 'grok':
    if not GROK_API_KEY or GROK_API_KEY == 'your_grok_api_key_here':
        GROK_API_KEY = None
else:
    if not GEMINI_API_KEY or GEMINI_API_KEY == 'your_gemini_api_key_here':
        if GROK_API_KEY and GROK_API_KEY != 'your_grok_api_key_here':
            LLM_PROVIDER = 'grok'
            MODEL_NAME = os.getenv('GROK_MODEL', 'grok-2-latest')
        else:
            GEMINI_API_KEY = None

# === RETRY CONFIGURATION ===
MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
INITIAL_RETRY_DELAY = float(os.getenv('INITIAL_RETRY_DELAY', '1.0'))  # seconds

# === PERFORMANCE TUNING ===
REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '30'))  # seconds
MAX_CONCURRENT_REQUESTS = int(os.getenv('MAX_CONCURRENT_REQUESTS', '5'))

# === LOGGING CONFIGURATION ===
ENABLE_DEBUG_LOGGING = os.getenv('ENABLE_DEBUG_LOGGING', 'false').lower() == 'true'
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()

# === SYSTEM INFO (for debugging) ===
def get_config_summary() -> dict:
    """Returns a sanitized summary of current configuration."""
    return {
        'model': MODEL_NAME,
        'max_retries': MAX_RETRIES,
        'retry_delay': INITIAL_RETRY_DELAY,
        'timeout': REQUEST_TIMEOUT,
        'api_key_configured': bool(GEMINI_API_KEY),
        'api_key_length': len(GEMINI_API_KEY) if GEMINI_API_KEY else 0,
        'debug_mode': ENABLE_DEBUG_LOGGING
    }

# Startup validation message
if ENABLE_DEBUG_LOGGING:
    print("✅ MedFlow-AI Configuration Loaded Successfully")
    print(f"   Model: {MODEL_NAME}")
    print(f"   Max Retries: {MAX_RETRIES}")
    masked_key = f"{'*' * (len(GEMINI_API_KEY) - 4)}{GEMINI_API_KEY[-4:]}" if GEMINI_API_KEY and len(GEMINI_API_KEY) >= 4 else "Not configured"
    print(f"   API Key: {masked_key}")
