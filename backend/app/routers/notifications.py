from fastapi import APIRouter, HTTPException, status
from app.models.notifications import EmailNotificationRequest, EmailNotificationResponse
from app.services.email_service import email_service
from app.config import settings

router = APIRouter(prefix="/notifications", tags=["Email & Notifications"])

@router.post("/email", response_model=EmailNotificationResponse)
async def send_email_notification(payload: EmailNotificationRequest):
    """
    Envía una notificación por correo electrónico con remitente notificaciones@hempc.com.ar.
    Soporta invitaciones de operarios, alertas críticas de telemetría y asignación de labores.
    """
    if not payload.to_email or "@" not in payload.to_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dirección de correo electrónico inválida"
        )

    response = email_service.send_notification(payload)
    return response

@router.get("/status")
async def get_notifications_status():
    """Estado del servicio híbrido de despacho de correos (Render Python IoT/IA + Resend HTTPS)."""
    resend_ready = bool(settings.RESEND_API_KEY)
    smtp_ready = bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)
    provider = "resend_https" if resend_ready else ("smtp" if smtp_ready else "simulated")
    return {
        "service": "hempc-hybrid-iot-email-dispatcher",
        "architecture": "hybrid_render_iot_resend_https",
        "provider": provider,
        "resend_configured": resend_ready,
        "smtp_configured": smtp_ready,
        "iot_ai_engine": "active",
        "sender": settings.SMTP_FROM,
        "host": "api.resend.com (HTTPS:443)" if resend_ready else (settings.SMTP_HOST or "simulated_local"),
        "port": 443 if resend_ready else settings.SMTP_PORT
    }
