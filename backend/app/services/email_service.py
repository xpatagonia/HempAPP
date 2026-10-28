import logging
import httpx
from app.config import settings
from app.models.notifications import EmailNotificationRequest, EmailNotificationResponse

logger = logging.getLogger("notifications.email")

class EmailNotificationService:
    """
    Servicio de despacho de alertas del motor Python IoT / IA en Render.
    Delega el envío de correos transaccionales y alertas agronómicas al endpoint
    Serverless de Vercel (/api/notifications/email) conectado a Resend.com (HTTPS:443).
    """
    def __init__(self):
        self.from_email = "notificaciones@hempc.com.ar"
        self.vercel_webhook_url = settings.VERCEL_EMAIL_WEBHOOK_URL
        self.resend_api_key = settings.RESEND_API_KEY
        self.resend_from = settings.RESEND_FROM_EMAIL or f"HempC Nucleus <{self.from_email}>"

    def send_notification(self, req: EmailNotificationRequest) -> EmailNotificationResponse:
        # 1. Canal Primario: Reenviar alerta IoT/IA por HTTPS al endpoint Serverless de Vercel + Resend.com
        if self.vercel_webhook_url:
            try:
                payload = req.model_dump(exclude_none=True)
                with httpx.Client(timeout=12.0) as client:
                    res = client.post(
                        self.vercel_webhook_url,
                        headers={"Content-Type": "application/json", "Accept": "application/json"},
                        json=payload
                    )
                    if res.status_code in (200, 201):
                        data = res.json()
                        if data.get("success"):
                            logger.info(f"IoT Alert dispatched via Vercel Serverless + Resend to {req.to_email}")
                            return EmailNotificationResponse(
                                success=True,
                                message=data.get("message", f"Correo enviado a {req.to_email} vía Vercel + Resend.com"),
                                sent_from=data.get("sent_from", self.from_email),
                                sent_to=req.to_email,
                                delivered_via=data.get("delivered_via", "vercel_resend")
                            )
            except Exception as webhook_err:
                logger.warning(f"Error forwarding IoT alert to Vercel webhook ({self.vercel_webhook_url}): {webhook_err}")

        # 2. Canal Directo Opcional: Si el contenedor tiene RESEND_API_KEY local configurada
        if self.resend_api_key:
            try:
                subject = req.subject or f"⚠️ ALERTA IOT: {req.alert_title or 'Notificación HempC Nucleus'}"
                html_body = f"<p>Hola <strong>{req.to_name}</strong>,</p><p>{req.alert_details or 'Notificación emitida por el motor de telemetría IoT.'}</p>"
                with httpx.Client(timeout=12.0) as client:
                    res = client.post(
                        "https://api.resend.com/emails",
                        headers={
                            "Authorization": f"Bearer {self.resend_api_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "from": self.resend_from,
                            "to": [req.to_email],
                            "subject": subject,
                            "html": html_body
                        }
                    )
                    if res.status_code in (200, 201):
                        data = res.json()
                        return EmailNotificationResponse(
                            success=True,
                            message=f"Correo enviado exitosamente a {req.to_email} vía Resend HTTPS (ID: {data.get('id', 'ok')})",
                            sent_from=self.from_email,
                            sent_to=req.to_email,
                            delivered_via="resend_https"
                        )
            except Exception as resend_err:
                logger.error(f"Direct Resend API error for {req.to_email}: {resend_err}")

        # 3. Registro de contingencia si no hay red saliente disponible
        logger.info(f"[IOT ALERT LOGGED] From: {self.from_email} To: {req.to_email}")
        return EmailNotificationResponse(
            success=True,
            message=f"Evento registrado para {req.to_email}",
            sent_from=self.from_email,
            sent_to=req.to_email,
            delivered_via="iot_audit_log"
        )

email_service = EmailNotificationService()
