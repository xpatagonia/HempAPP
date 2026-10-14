import uuid
import asyncio
from datetime import datetime
from fastapi import APIRouter, Header, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.responses import StreamingResponse
from app.config import settings
from app.models.telemetry import (
    DeviceTelemetryPayload,
    ProcessedTelemetryRecord,
    SimulationRequest,
    SensorMetrics
)
from app.services.agronomy import AgronomyCalculator
from app.services.stream_manager import stream_manager
from app.services.supabase_sync import supabase_sync

router = APIRouter(prefix="/telemetry", tags=["Telemetry & IoT Ingestion"])

def verify_device_key(x_device_api_key: str = Header(None)):
    """Verifica la API Key configurada para los dispositivos IoT."""
    if not settings.DEVICE_INGEST_API_KEY:
        return True
    if x_device_api_key != settings.DEVICE_INGEST_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Clave de dispositivo inválida o ausente en cabecera 'X-Device-Api-Key'"
        )
    return True

@router.post("/ingest", response_model=ProcessedTelemetryRecord)
async def ingest_device_telemetry(
    payload: DeviceTelemetryPayload,
    x_device_api_key: str = Header(None)
):
    """
    Punto de entrada de alta velocidad para sensores en campo, dataloggers y gateways LoRaWAN.
    Valida la telemetría, computa los indicadores agronómicos ecofisiológicos
    y distribuye en vivo a los tableros conectados.
    """
    verify_device_key(x_device_api_key)

    # 1. Evaluación agronómica científica
    assessment = AgronomyCalculator.evaluate(payload.metrics)

    # 2. Generar registro procesado
    record = ProcessedTelemetryRecord(
        id=str(uuid.uuid4()),
        device_id=payload.device_id,
        plot_id=payload.plot_id,
        timestamp=payload.timestamp or datetime.utcnow(),
        metrics=payload.metrics,
        assessment=assessment,
        battery_pct=payload.battery_pct
    )

    # 3. Distribución en tiempo real (WebSockets + SSE)
    await stream_manager.broadcast_telemetry(record)

    # 4. Persistencia en base de datos (Supabase)
    asyncio.create_task(supabase_sync.save_record(record))

    return record

@router.get("/latest/{plot_id}")
async def get_latest_telemetry(plot_id: str):
    """Obtiene la última lectura de telemetría y evaluación ecofisiológica para una parcela."""
    record = stream_manager.get_latest(plot_id)
    if not record:
        # Si no hay lecturas en memoria todavía, generamos una base coherente
        default_metrics = SensorMetrics(
            soil_moisture_pct=31.4,
            soil_temp_c=21.2,
            soil_ec_ds_m=1.35,
            air_temp_c=23.8,
            air_humidity_pct=58.0,
            solar_radiation_wm2=720.0,
            rain_mm=0.0,
            wind_speed_kmh=11.5,
            atmospheric_pressure_hpa=1014.0,
            leaf_wetness_pct=8.0
        )
        record = ProcessedTelemetryRecord(
            id=f"init-{plot_id}",
            device_id="DEFAULT-STATION-EST",
            plot_id=plot_id,
            timestamp=datetime.utcnow(),
            metrics=default_metrics,
            assessment=AgronomyCalculator.evaluate(default_metrics),
            battery_pct=96.0
        )
    return record

@router.get("/stream/{plot_id}")
async def stream_plot_telemetry_sse(plot_id: str):
    """
    Canal Server-Sent Events (SSE) para consumo en navegadores (React / Web).
    No requiere librerías complejas de WebSockets en el cliente.
    """
    queue = stream_manager.register_sse_queue(plot_id)

    async def event_generator():
        try:
            # Emitir la última lectura disponible como primer frame
            initial = stream_manager.get_latest(plot_id)
            if initial:
                yield f"data: {initial.model_dump_json()}\n\n"

            while True:
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {payload}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat para evitar que proxies y routers cierren la conexión HTTP
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            stream_manager.unregister_sse_queue(plot_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/simulate", response_model=ProcessedTelemetryRecord)
async def simulate_reading(req: SimulationRequest):
    """
    Genera un evento de telemetría simulado con variación para pruebas de laboratorio
    y demostraciones interactivas en vivo.
    """
    import random
    base_temp = 24.0 + req.temp_variation + random.uniform(-1.2, 1.2)
    base_moisture = max(10.0, min(50.0, 32.0 + req.moisture_variation + random.uniform(-1.5, 1.5)))
    base_rh = max(20.0, min(95.0, 56.0 + random.uniform(-4.0, 4.0)))

    metrics = SensorMetrics(
        soil_moisture_pct=round(base_moisture, 1),
        soil_temp_c=round(base_temp - 2.5, 1),
        soil_ec_ds_m=round(1.2 + random.uniform(-0.1, 0.15), 2),
        air_temp_c=round(base_temp, 1),
        air_humidity_pct=round(base_rh, 1),
        solar_radiation_wm2=round(680.0 + random.uniform(-60.0, 90.0), 0),
        rain_mm=round(max(0.0, random.uniform(-1.0, 0.4)), 1),
        wind_speed_kmh=round(12.0 + random.uniform(-3.0, 6.0), 1),
        atmospheric_pressure_hpa=1013.2,
        leaf_wetness_pct=round(max(0.0, min(100.0, 12.0 + random.uniform(-4.0, 6.0))), 1)
    )

    assessment = AgronomyCalculator.evaluate(metrics)

    record = ProcessedTelemetryRecord(
        id=str(uuid.uuid4()),
        device_id=req.device_id,
        plot_id=req.plot_id,
        timestamp=datetime.utcnow(),
        metrics=metrics,
        assessment=assessment,
        battery_pct=round(max(10.0, 98.0 - random.uniform(0.1, 5.0)), 1)
    )

    await stream_manager.broadcast_telemetry(record)
    return record
