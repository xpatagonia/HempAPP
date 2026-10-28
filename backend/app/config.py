import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "HempC Telemetry & AI Engine"
    API_V1_PREFIX: str = "/api/v1"
    PORT: int = int(os.getenv("PORT", 8000))
    
    # Device Security Key for IoT ingestion (LoRaWAN / MQTT / HTTP Sensors)
    DEVICE_INGEST_API_KEY: str = os.getenv("DEVICE_INGEST_API_KEY", "")
    
    # Supabase Cloud Database Integration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", os.getenv("VITE_SUPABASE_URL", ""))
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", os.getenv("VITE_SUPABASE_ANON_KEY", ""))
    
    # Email Notification Settings (Delegated to Vercel Serverless + Resend.com HTTPS)
    VERCEL_EMAIL_WEBHOOK_URL: str = os.getenv(
        "VERCEL_EMAIL_WEBHOOK_URL",
        "https://hemp-net.vercel.app/api/notifications/email"
    )
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "HempC Nucleus <notificaciones@hempc.com.ar>")
    ALERT_RECIPIENT_EMAIL: str = os.getenv("ALERT_RECIPIENT_EMAIL", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", os.getenv("VITE_GEMINI_API_KEY", ""))

    # Allowed CORS Origins
    CORS_ORIGINS: List[str] = [
        origin.strip() for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,https://hempc.com.ar,https://hemp-net.vercel.app,https://hempapp.onrender.com"
        ).split(",") if origin.strip()
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
