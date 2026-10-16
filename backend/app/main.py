import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import telemetry, notifications
from app.services.stream_manager import stream_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("hempc-telemetry")

app = FastAPI(
    title="HempC Nucleus | Telemetry & Agronomic Engine",
    description="Motor de Ingesta IoT, Sensores de Campo, Modelado Ecofisiológico y Despacho de Notificaciones para la Red Cooperativa del Cáñamo Industrial",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS setup for Vercel and local clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(telemetry.router, prefix=settings.API_V1_PREFIX)
app.include_router(notifications.router, prefix=settings.API_V1_PREFIX)

@app.websocket("/ws/telemetry/{plot_id}")
async def websocket_telemetry_endpoint(websocket: WebSocket, plot_id: str):
    """Canal WebSocket bidireccional para monitoreo en vivo de parcelas."""
    await stream_manager.connect_websocket(plot_id, websocket)
    logger.info(f"WebSocket client connected to plot channel: {plot_id}")
    try:
        # Enviar última lectura disponible
        latest = stream_manager.get_latest(plot_id)
        if latest:
            await websocket.send_text(latest.model_dump_json())

        # Mantener conexión abierta y escuchar posibles mensajes de comando
        while True:
            data = await websocket.receive_text()
            logger.debug(f"Received from client on plot {plot_id}: {data}")
    except WebSocketDisconnect:
        stream_manager.disconnect_websocket(plot_id, websocket)
        logger.info(f"WebSocket client disconnected from plot {plot_id}")
    except Exception as e:
        logger.warning(f"WebSocket error on plot {plot_id}: {e}")
        stream_manager.disconnect_websocket(plot_id, websocket)

@app.get("/healthz", tags=["System"])
@app.head("/healthz", tags=["System"])
async def health_check():
    """Endpoint de estado para Render Health Checks y orquestadores."""
    return {
        "status": "healthy",
        "service": "hempc-telemetry-engine",
        "version": "1.0.0",
        "cors_origins": settings.CORS_ORIGINS,
        "supabase_configured": bool(settings.SUPABASE_URL)
    }

@app.get("/", tags=["System"])
@app.head("/", tags=["System"])
async def root_info():
    return {
        "message": "HempC Nucleus Telemetry Engine is online",
        "documentation": "/docs",
        "health": "/healthz",
        "ingest_endpoint": f"{settings.API_V1_PREFIX}/telemetry/ingest",
        "stream_endpoint": f"{settings.API_V1_PREFIX}/telemetry/stream/{{plot_id}}",
        "ws_endpoint": "/ws/telemetry/{plot_id}"
    }
