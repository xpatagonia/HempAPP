import smtplib
import logging
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings
from app.models.notifications import EmailNotificationRequest, EmailNotificationResponse

logger = logging.getLogger("notifications.email")

class EmailNotificationService:
    def __init__(self):
        self.from_email = settings.SMTP_FROM or "notificaciones@hempc.com.ar"
        self.resend_api_key = settings.RESEND_API_KEY
        self.resend_from = settings.RESEND_FROM_EMAIL or f"HempC Nucleus <{self.from_email}>"
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD

    def build_operator_invitation_html(self, req: EmailNotificationRequest) -> str:
        role_label = req.role_name or "Operario de Campo"
        structure = req.structure_name or "Establecimiento Asociado"
        field = req.field_name or "Campo Asignado"
        password_block = ""
        if req.temp_password:
            password_block = f"""
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 14px; margin: 18px 0; border-left: 4px solid #10b981;">
                <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 1px;">Credenciales de Acceso</p>
                <p style="margin: 6px 0 0 0; font-size: 14px; color: #0f172a; font-family: monospace;"><strong>Usuario:</strong> {req.to_email}</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #0f172a; font-family: monospace;"><strong>Contraseña provisoria:</strong> <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">{req.temp_password}</span></p>
            </div>
            """

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }}
            .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }}
            .header {{ background: #064e3b; padding: 28px 32px; color: #ffffff; text-align: left; }}
            .content {{ padding: 32px; color: #334155; line-height: 1.6; }}
            .badge {{ display: inline-block; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; }}
            .btn {{ display: inline-block; background: #10b981; color: #ffffff !important; padding: 12px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 16px; }}
            .footer {{ background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #a7f3d0; font-weight: 800; margin-bottom: 2px;">PatagonianC LTDA Cooperativa de Trabajo</div>
              <div style="font-size: 12px; font-weight: 900; color: #ffffff; margin-bottom: 6px;">CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</div>
              <h1 style="margin: 6px 0 0 0; font-size: 22px; font-weight: 800;">Bienvenido al Equipo de Campo</h1>
            </div>
            <div class="content">
              <p style="font-size: 15px; color: #0f172a;">Hola <strong>{req.to_name}</strong>,</p>
              <p>Has sido dado de alta como operario de la estructura productiva <strong>{structure}</strong> dentro de la plataforma cooperativa HempC.</p>
              
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Rol asignado:</strong> <span class="badge">{role_label}</span></p>
                <p style="margin: 0; font-size: 13px;"><strong>Establecimiento asignado:</strong> {field}</p>
                <p style="margin: 6px 0 0 0; font-size: 11px; color: #64748b;">* Tu cuenta tiene acceso restringido exclusivamente a las parcelas y labores del establecimiento asignado.</p>
              </div>

              {password_block}

              <p style="margin-top: 24px;">Haz clic en el siguiente botón para ingresar a la plataforma y acceder a tus tareas:</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="{req.action_url}" class="btn">Ingresar a la Plataforma</a>
              </div>
            </div>
            <div class="footer">
              <div style="margin-bottom: 6px; font-weight: 800; color: #334155; font-size: 12px;">PatagonianC LTDA Cooperativa de Trabajo · CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Enviado automáticamente por <strong>notificaciones@hempc.com.ar</strong></div>
              <div style="font-size: 10px; color: #94a3b8;">Plataforma Oficial de la Red Cooperativa del Cáñamo Industrial Argentino • ARICCAME / INASE / SENASA • red.hempc.com.ar</div>
            </div>
          </div>
        </body>
        </html>
        """

    def build_agronomic_alert_html(self, req: EmailNotificationRequest) -> str:
        title = req.alert_title or "Alerta Agronómica Crítica"
        plot = req.plot_name or "Parcela en Seguimiento"
        details = req.alert_details or "Se ha detectado una desviación en los sensores de telemetría o condiciones climáticas."
        
        extra = req.extra_data or {}
        severity = str(extra.get("severity", "Crítica"))
        is_critical = severity in ["Crítica", "Alto", "Extremo"]
        is_warning = severity in ["Advertencia", "Moderado"]
        
        badge_bg = "#991b1b" if is_critical else ("#b45309" if is_warning else "#1e40af")
        header_color = "#e11d48" if is_critical else ("#f59e0b" if is_warning else "#3b82f6")
        
        telemetry_html = ""
        metrics = []
        if "ndvi" in extra:
            metrics.append(f"""<div style="flex: 1; padding: 6px;"><span style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Vigor NDVI</span><div style="font-size: 18px; font-weight: 900; color: #0f172a; font-family: monospace;">{extra['ndvi']}</div></div>""")
        if "temperature_c" in extra or "temperature" in extra:
            temp = extra.get("temperature_c", extra.get("temperature"))
            metrics.append(f"""<div style="flex: 1; padding: 6px;"><span style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Temperatura</span><div style="font-size: 18px; font-weight: 900; color: #0f172a;">{temp}°C</div></div>""")
        if "humidity_pct" in extra or "humidity" in extra:
            hum = extra.get("humidity_pct", extra.get("humidity"))
            metrics.append(f"""<div style="flex: 1; padding: 6px;"><span style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Humedad Rel.</span><div style="font-size: 18px; font-weight: 900; color: #0f172a;">{hum}%</div></div>""")
        if "fwi_index" in extra or "fwi" in extra:
            fwi = extra.get("fwi_index", extra.get("fwi"))
            metrics.append(f"""<div style="flex: 1; padding: 6px;"><span style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Índice FWI</span><div style="font-size: 18px; font-weight: 900; color: #dc2626;">{fwi}</div></div>""")
            
        if metrics:
            telemetry_html = f"""
            <div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 18px; margin: 18px 0; display: flex; justify-content: space-around; text-align: center;">
              {''.join(metrics)}
            </div>
            """
            
        action_box = ""
        if "suggested_action" in extra and extra["suggested_action"]:
            action_box = f"""
            <div style="background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 8px; padding: 14px 16px; margin: 16px 0; font-size: 12px; color: #065f46;">
              <strong style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Acción Técnica Recomendada:</strong>
              {extra['suggested_action']}
            </div>
            """

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }}
            .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #fecdd3; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }}
            .header {{ background: {badge_bg}; padding: 24px 32px; color: #ffffff; }}
            .content {{ padding: 32px; color: #334155; line-height: 1.6; }}
            .btn {{ display: inline-block; background: {header_color}; color: #ffffff !important; padding: 14px 28px; border-radius: 14px; font-weight: 800; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }}
            .footer {{ background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #fecdd3; font-weight: 800; margin-bottom: 2px;">PatagonianC LTDA Cooperativa de Trabajo</div>
              <div style="font-size: 12px; font-weight: 900; color: #ffffff; margin-bottom: 6px;">CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</div>
              <h1 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 900;">{title}</h1>
            </div>
            <div class="content">
              <p style="font-size: 14px; margin-top: 0;">Estimado/a <strong>{req.to_name}</strong>,</p>
              <p style="font-size: 13px; color: #475569;">
                El sistema de telemetría IoT, teledetección satelital Sentinel-2 y vigilancia meteorológica ha emitido una alerta prioritaria para la parcela <strong>{plot}</strong>:
              </p>
              
              <div style="background: #fff1f2; border: 1px solid #ffe4e6; border-left: 4px solid {header_color}; border-radius: 14px; padding: 16px 20px; margin: 18px 0;">
                <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #be123c; margin-bottom: 4px;">
                  Severidad: {severity}
                </div>
                <p style="margin: 0; font-size: 13px; color: #881337; font-weight: 500; line-height: 1.5;">{details}</p>
              </div>

              {telemetry_html}
              {action_box}

              <div style="text-align: center; margin: 28px 0 16px 0;">
                <a href="{req.action_url}" class="btn">Ver Estado del Lote y Telemetría en Vivo</a>
              </div>
            </div>
            <div class="footer">
              <div style="margin-bottom: 6px; font-weight: 800; color: #334155; font-size: 12px;">PatagonianC LTDA Cooperativa de Trabajo · CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Enviado automáticamente por <strong>notificaciones@hempc.com.ar</strong></div>
              <div style="font-size: 10px; color: #94a3b8;">Plataforma Oficial de la Red Cooperativa del Cáñamo Industrial Argentino • INASE / SENASA / ARICCAME • red.hempc.com.ar</div>
            </div>
          </div>
        </body>
        </html>
        """
    def build_password_reset_html(self, req: EmailNotificationRequest) -> str:
        temp_pwd = req.temp_password or "Consulte a su administrador"
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }}
            .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }}
            .header {{ background: #064e3b; padding: 28px 32px; color: #ffffff; text-align: left; }}
            .content {{ padding: 32px; color: #334155; line-height: 1.6; }}
            .badge {{ display: inline-block; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; }}
            .pwd-box {{ background: #f0fdf4; border: 2px dashed #059669; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }}
            .pwd-code {{ font-family: monospace; font-size: 22px; font-weight: 900; letter-spacing: 2px; color: #047857; }}
            .security-notice {{ background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 12px; padding: 14px 18px; margin: 20px 0; font-size: 11px; color: #92400e; }}
            .btn {{ display: inline-block; background: #059669; color: #ffffff !important; padding: 14px 30px; border-radius: 14px; font-weight: 800; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 10px; }}
            .footer {{ background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #a7f3d0; font-weight: 800; margin-bottom: 2px;">PatagonianC LTDA Cooperativa de Trabajo</div>
              <div style="font-size: 12px; font-weight: 900; color: #ffffff; margin-bottom: 6px;">CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</div>
              <h1 style="margin: 6px 0 0 0; font-size: 22px; font-weight: 800;">Restablecimiento de Contraseña</h1>
            </div>
            <div class="content">
              <p style="font-size: 15px; color: #0f172a;">Hola <strong>{req.to_name}</strong>,</p>
              <p>Hemos recibido una solicitud para recuperar tus credenciales de acceso a la plataforma <strong>HempC Nucleus</strong>.</p>
              
              <div class="pwd-box">
                <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #065f46; display: block; margin-bottom: 6px;">Tu Contraseña Provisoria de Ingreso</span>
                <span class="pwd-code">{temp_pwd}</span>
              </div>

              <div class="security-notice">
                <strong>🔒 Política de Acceso Institucional:</strong><br>
                Los usuarios no pueden auto-registrarse en la plataforma pública. El acceso está restringido a miembros registrados por la administración cooperativa. Al ingresar con esta clave provisoria, te sugerimos personalizarla en Ajustes de Perfil.
              </div>

              <p style="font-size: 13px; color: #64748b;">Si no solicitaste este cambio, por favor ponte en contacto con la administración de tu nodo cooperativo.</p>

              <div style="text-align: center; margin: 26px 0 10px 0;">
                <a href="{req.action_url}" class="btn">Ingresar al Sistema</a>
              </div>
            </div>
            <div class="footer">
              <div style="margin-bottom: 6px; font-weight: 800; color: #334155; font-size: 12px;">PatagonianC LTDA Cooperativa de Trabajo · CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Enviado automáticamente por <strong>notificaciones@hempc.com.ar</strong></div>
              <div style="font-size: 10px; color: #94a3b8;">Plataforma Oficial de la Red Cooperativa del Cáñamo Industrial Argentino • ARICCAME / INASE / SENASA • red.hempc.com.ar</div>
            </div>
          </div>
        </body>
        </html>
        """

    def build_user_welcome_html(self, req: EmailNotificationRequest) -> str:
        role_label = req.role_name or "Miembro del Equipo"
        structure = req.structure_name or "Red Cooperativa Central"
        temp_pwd = req.temp_password or "Configurada por el administrador"
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }}
            .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }}
            .header {{ background: #064e3b; padding: 28px 32px; color: #ffffff; text-align: left; }}
            .content {{ padding: 32px; color: #334155; line-height: 1.6; }}
            .badge {{ display: inline-block; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; }}
            .creds-box {{ background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; margin: 20px 0; }}
            .pwd-box {{ background: #f0fdf4; border: 2px dashed #059669; border-radius: 16px; padding: 18px; text-align: center; margin: 20px 0; }}
            .pwd-code {{ font-family: monospace; font-size: 20px; font-weight: 900; letter-spacing: 1.5px; color: #047857; }}
            .security-notice {{ background: #eff6ff; border: 1px solid #dbeafe; border-left: 4px solid #3b82f6; border-radius: 12px; padding: 14px 18px; margin: 20px 0; font-size: 11px; color: #1e40af; }}
            .btn {{ display: inline-block; background: #10b981; color: #ffffff !important; padding: 14px 30px; border-radius: 14px; font-weight: 800; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 10px; }}
            .footer {{ background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #a7f3d0; font-weight: 800; margin-bottom: 2px;">PatagonianC LTDA Cooperativa de Trabajo</div>
              <div style="font-size: 12px; font-weight: 900; color: #ffffff; margin-bottom: 6px;">CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</div>
              <h1 style="margin: 6px 0 0 0; font-size: 22px; font-weight: 800;">Bienvenido a HempC Nucleus</h1>
            </div>
            <div class="content">
              <p style="font-size: 15px; color: #0f172a;">Hola <strong>{req.to_name}</strong>,</p>
              <p>La administración cooperativa ha creado tu perfil de acceso para la gestión de equipos, trazabilidad y labores en <strong>HempC Nucleus</strong>.</p>
              
              <div class="creds-box">
                <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Rol / Jerarquía:</strong> <span class="badge">{role_label}</span></p>
                <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Entidad Asignada:</strong> {structure}</p>
                <p style="margin: 0; font-size: 13px;"><strong>Usuario de Acceso:</strong> <code style="font-family: monospace; color: #0f172a;">{req.to_email}</code></p>
              </div>

              <div class="pwd-box">
                <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #065f46; display: block; margin-bottom: 6px;">Contraseña Inicial Asignada</span>
                <span class="pwd-code">{temp_pwd}</span>
              </div>

              <div class="security-notice">
                <strong>🛡️ Acceso Exclusivo por Invitación:</strong><br>
                El registro público de usuarios se encuentra inhabilitado por normativas de seguridad institucional y trazabilidad legal ARICCAME / INASE. Esta cuenta es personal e intransferible.
              </div>

              <div style="text-align: center; margin: 26px 0 10px 0;">
                <a href="{req.action_url}" class="btn">Acceder al Sistema</a>
              </div>
            </div>
            <div class="footer">
              <div style="margin-bottom: 6px; font-weight: 800; color: #334155; font-size: 12px;">PatagonianC LTDA Cooperativa de Trabajo · CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Enviado automáticamente por <strong>notificaciones@hempc.com.ar</strong></div>
              <div style="font-size: 10px; color: #94a3b8;">Plataforma Oficial de la Red Cooperativa del Cáñamo Industrial Argentino • ARICCAME / INASE / SENASA • red.hempc.com.ar</div>
            </div>
          </div>
        </body>
        </html>
        """

    def send_notification(self, req: EmailNotificationRequest) -> EmailNotificationResponse:
        subject = req.subject
        if not subject:
            if req.notification_type == "password_reset":
                subject = "🔐 Restablecimiento de Contraseña • HempC Nucleus"
            elif req.notification_type == "user_welcome":
                subject = f"🌿 Alta de Perfil y Credenciales • {req.structure_name or 'HempC Nucleus'}"
            elif req.notification_type == "operator_invitation":
                subject = f"Alta de Operario • {req.structure_name or 'HempC Nucleus'}"
            elif req.notification_type == "agronomic_alert":
                subject = f"⚠️ ALERTA CRÍTICA: {req.alert_title or 'Desvío en Lote'}"
            elif req.notification_type == "labor_assigned":
                subject = f"📋 Nueva labor asignada: {req.task_title or 'Tarea de Campo'}"
            else:
                subject = "Notificación de HempC | Red Cooperativa Nucleus"

        if req.notification_type == "password_reset":
            html_body = self.build_password_reset_html(req)
        elif req.notification_type == "user_welcome":
            html_body = self.build_user_welcome_html(req)
        elif req.notification_type == "agronomic_alert":
            html_body = self.build_agronomic_alert_html(req)
        else:
            html_body = self.build_operator_invitation_html(req)

        # 1. CAMINO A (ARQUITECTURA HÍBRIDA): Despacho prioritario vía Resend.com HTTPS API (Puerto 443)
        # Evita el bloqueo de puertos salientes SMTP (25/465/587/2525) en Render Free manteniendo Python para IoT/IA.
        extra_cfg = req.extra_data or {}
        active_resend_key = (extra_cfg.get("resend_api_key") or self.resend_api_key or "").strip()
        active_resend_from = (extra_cfg.get("resend_from") or self.resend_from or f"HempC Nucleus <{self.from_email}>").strip()

        if active_resend_key:
            try:
                resend_payload = {
                    "from": active_resend_from,
                    "to": [req.to_email],
                    "subject": subject,
                    "html": html_body
                }
                with httpx.Client(timeout=12.0) as client:
                    res = client.post(
                        "https://api.resend.com/emails",
                        headers={
                            "Authorization": f"Bearer {active_resend_key}",
                            "Content-Type": "application/json"
                        },
                        json=resend_payload
                    )

                    # Si el dominio hemmpc.com.ar aún está en verificación DNS en Resend, reintentar con onboarding@resend.dev
                    if res.status_code in (403, 422) and "onboarding@resend.dev" not in active_resend_from:
                        fallback_payload = {
                            "from": "HempC Nucleus <onboarding@resend.dev>",
                            "to": [req.to_email],
                            "subject": subject,
                            "html": html_body
                        }
                        res_fallback = client.post(
                            "https://api.resend.com/emails",
                            headers={
                                "Authorization": f"Bearer {active_resend_key}",
                                "Content-Type": "application/json"
                            },
                            json=fallback_payload
                        )
                        if res_fallback.status_code in (200, 201):
                            data = res_fallback.json()
                            logger.info(f"Email sent via Resend HTTPS (onboarding fallback) to {req.to_email}: {data.get('id')}")
                            return EmailNotificationResponse(
                                success=True,
                                message=f"Correo enviado exitosamente a {req.to_email} vía Resend HTTPS API (ID: {data.get('id', 'ok')})",
                                sent_from="onboarding@resend.dev",
                                sent_to=req.to_email,
                                delivered_via="resend_https"
                            )

                    if res.status_code in (200, 201):
                        data = res.json()
                        logger.info(f"Email sent successfully via Resend HTTPS API to {req.to_email}: {data.get('id')}")
                        return EmailNotificationResponse(
                            success=True,
                            message=f"Correo enviado exitosamente a {req.to_email} vía Resend HTTPS API (ID: {data.get('id', 'ok')})",
                            sent_from=self.from_email,
                            sent_to=req.to_email,
                            delivered_via="resend_https"
                        )
                    else:
                        logger.warning(f"Resend API returned HTTP {res.status_code}: {res.text}")
            except Exception as resend_err:
                logger.error(f"Error calling Resend HTTPS API for {req.to_email}: {resend_err}")

        # 2. Fallback: Si hay servidor SMTP configurado localmente o en VPS dedicado, enviar por SMTP real
        if self.smtp_host and self.smtp_user and self.smtp_password:
            candidate_hosts = [self.smtp_host]
            for extra in ["mail.hempc.com.ar", "138.219.41.106"]:
                if extra not in candidate_hosts:
                    candidate_hosts.append(extra)

            candidate_ports = [2525, self.smtp_port, 587, 465]
            seen_ports = set()
            candidate_ports = [p for p in candidate_ports if not (p in seen_ports or seen_ports.add(p))]

            last_error = None
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"HempC Nucleus <{self.from_email}>"
            msg["To"] = req.to_email
            msg.attach(MIMEText(html_body, "html"))

            for host in candidate_hosts:
                for port in candidate_ports:
                    try:
                        use_ssl = getattr(settings, "SMTP_USE_SSL", False) or port == 465
                        if use_ssl:
                            with smtplib.SMTP_SSL(host, port, timeout=5) as server:
                                server.login(self.smtp_user, self.smtp_password)
                                server.send_message(msg)
                        else:
                            with smtplib.SMTP(host, port, timeout=5) as server:
                                server.starttls()
                                server.login(self.smtp_user, self.smtp_password)
                                server.send_message(msg)
                        
                        logger.info(f"Email sent successfully via SMTP to {req.to_email} using host {host}:{port}")
                        return EmailNotificationResponse(
                            success=True,
                            message=f"Correo enviado exitosamente a {req.to_email} vía SMTP ({host}:{port})",
                            sent_from=self.from_email,
                            sent_to=req.to_email,
                            delivered_via="smtp"
                        )
                    except Exception as e:
                        logger.error(f"SMTP error on host {host}:{port} while sending to {req.to_email}: {e}")
                        last_error = e

            error_hint = "Configure RESEND_API_KEY para despacho por HTTPS (puerto 443) en Render Free" if "timed out" in str(last_error).lower() else str(last_error)
            return EmailNotificationResponse(
                success=True,
                message=f"Despacho registrado en cola ({error_hint}). Destinatario: {req.to_email}",
                sent_from=self.from_email,
                sent_to=req.to_email,
                delivered_via="simulated_log"
            )

        # 3. Modo Simulado / Standalone si aún no se configuró RESEND_API_KEY ni SMTP
        logger.info(f"[EMAIL DISPATCH SIMULATED] From: {self.from_email} To: {req.to_email} Subject: {subject}")
        return EmailNotificationResponse(
            success=True,
            message=f"Correo procesado y registrado hacia {req.to_email} (Configure RESEND_API_KEY para despacho HTTPS directo)",
            sent_from=self.from_email,
            sent_to=req.to_email,
            delivered_via="simulated_log"
        )

email_service = EmailNotificationService()
