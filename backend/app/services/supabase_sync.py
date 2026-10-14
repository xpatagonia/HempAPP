import logging
from typing import Optional
from app.config import settings
from app.models.telemetry import ProcessedTelemetryRecord

logger = logging.getLogger("telemetry.supabase")

class SupabaseTelemetrySync:
    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self):
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            try:
                from supabase import create_client
                self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                logger.info("Supabase client initialized successfully for telemetry storage.")
            except Exception as e:
                logger.warning(f"Failed to initialize Supabase client: {e}. Telemetry will be held in memory.")
        else:
            logger.info("SUPABASE_URL or SUPABASE_KEY not provided. Running in standalone in-memory mode.")

    async def save_record(self, record: ProcessedTelemetryRecord):
        if not self.client:
            return

        try:
            data = {
                "id": record.id,
                "device_id": record.device_id,
                "plot_id": record.plot_id,
                "timestamp": record.timestamp.isoformat(),
                "battery_pct": record.battery_pct,
                "metrics": record.metrics.model_dump(exclude_none=True),
                "assessment": record.assessment.model_dump(exclude_none=True),
                "created_at": record.created_at.isoformat()
            }
            # Insert into telemetry_logs table if exists in Supabase
            self.client.table("telemetry_logs").insert(data).execute()
        except Exception as e:
            # Non-blocking error: avoid failing IoT responses if Supabase schema is still being migrated
            logger.debug(f"Supabase telemetry insert skipped or error: {e}")

supabase_sync = SupabaseTelemetrySync()
