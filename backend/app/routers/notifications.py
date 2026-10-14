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
    """Estado del servicio de despacho de correos."""
    return {
        "service": "hempc-email-dispatcher",
        "sender": settings.SMTP_FROM,
        "smtp_configured": bool(settings.SMTP_HOST and settings.SMTP_USER),
        "host": settings.SMTP_HOST or "simulated_local",
        "port": settings.SMTP_PORT
    }
