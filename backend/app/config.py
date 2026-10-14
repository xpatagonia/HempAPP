import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "HempC Telemetry Engine"
    API_V1_PREFIX: str = "/api/v1"
    PORT: int = int(os.getenv("PORT", 8000))
    
    # Device Security Key for IoT ingestion
    DEVICE_INGEST_API_KEY: str = os.getenv("DEVICE_INGEST_API_KEY", "hempc-device-secret-key-2026")
    
    # Supabase Integration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", os.getenv("VITE_SUPABASE_URL", ""))
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", os.getenv("VITE_SUPABASE_ANON_KEY", ""))
    
    # Allowed CORS Origins
    CORS_ORIGINS: List[str] = [
        "*",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
