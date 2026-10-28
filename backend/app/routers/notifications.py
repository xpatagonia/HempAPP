from fastapi import APIRouter, HTTPException, status
from app.models.notifications import EmailNotificationRequest, EmailNotificationResponse
from app.services.email_service import email_service
from app.config import settings

router = APIRouter(prefix="/notifications", tags=["IoT Alerts & Notifications Relay"])

@router.post("/email", response_model=EmailNotificationResponse)
async def send_email_notification(payload: EmailNotificationRequest):
    """
    Reenvía alertas automáticas de sensores IoT / IA al despachador oficial en Vercel + Resend.com
    con remitente notificaciones@hempc.com.ar.
    """
    if not payload.to_email or "@" not in payload.to_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dirección de correo electrónico inválida"
        )

    return email_service.send_notification(payload)

@router.get("/status")
async def get_notifications_status():
    """Estado del motor Python de Telemetría IoT/IA en Render y enlace con Vercel + Resend.com."""
    return {
        "service": "hempc-render-iot-ai-engine",
        "architecture": "vercel_resend_supabase_iot_render",
        "provider": "vercel_resend_webhook",
        "vercel_webhook_url": settings.VERCEL_EMAIL_WEBHOOK_URL,
        "iot_ai_engine": "active",
        "sender": "notificaciones@hempc.com.ar",
        "host": "hemp-net.vercel.app/api/notifications/email (HTTPS:443)",
        "port": 443
    }
