interface EmailNotificationPayload {
  to_email: string;
  to_name: string;
  subject?: string;
  notification_type?: 'operator_invitation' | 'agronomic_alert' | 'labor_assigned' | 'password_reset' | 'user_welcome';
  structure_name?: string;
  field_name?: string;
  role_name?: string;
  temp_password?: string;
  plot_name?: string;
  alert_title?: string;
  alert_details?: string;
  task_title?: string;
  action_url?: string;
  extra_data?: Record<string, any>;
}

function buildOperatorInvitationHtml(req: EmailNotificationPayload): string {
  const roleLabel = req.role_name || 'Operario de Campo';
  const structure = req.structure_name || 'Establecimiento Asociado';
  const field = req.field_name || 'Campo Asignado';
  const actionUrl = req.action_url || 'https://hemp-net.vercel.app';
  const passwordBlock = req.temp_password
    ? `
      <div style="background-color: #f1f5f9; border-radius: 12px; padding: 14px; margin: 18px 0; border-left: 4px solid #10b981;">
        <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 1px;">Credenciales de Acceso</p>
        <p style="margin: 6px 0 0 0; font-size: 14px; color: #0f172a; font-family: monospace;"><strong>Usuario:</strong> ${req.to_email}</p>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #0f172a; font-family: monospace;"><strong>Contraseña provisoria:</strong> <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${req.temp_password}</span></p>
      </div>
    `
    : '';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }
      .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
      .header { background: #064e3b; padding: 28px 32px; color: #ffffff; text-align: left; }
      .content { padding: 32px; color: #334155; line-height: 1.6; }
      .badge { display: inline-block; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
      .btn { display: inline-block; background: #10b981; color: #ffffff !important; padding: 12px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 16px; }
      .footer { background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
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
        <p style="font-size: 15px; color: #0f172a;">Hola <strong>${req.to_name}</strong>,</p>
        <p>Has sido dado de alta como miembro operativo de la estructura productiva <strong>${structure}</strong> dentro de la plataforma cooperativa HempC.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Rol asignado:</strong> <span class="badge">${roleLabel}</span></p>
          <p style="margin: 0; font-size: 13px;"><strong>Establecimiento asignado:</strong> ${field}</p>
          <p style="margin: 6px 0 0 0; font-size: 11px; color: #64748b;">* Tu cuenta tiene acceso restringido exclusivamente a las parcelas y labores del establecimiento asignado.</p>
        </div>
        ${passwordBlock}
        <p style="margin-top: 24px;">Haz clic en el siguiente botón para ingresar a la plataforma y acceder a tus tareas:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${actionUrl}" class="btn">Ingresar a la Plataforma</a>
        </div>
      </div>
      <div class="footer">
        <div style="margin-bottom: 6px; font-weight: 800; color: #334155; font-size: 12px;">PatagonianC LTDA Cooperativa de Trabajo · CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</div>
        <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Enviado por <strong>notificaciones@hempc.com.ar</strong> (Vercel + Resend HTTPS)</div>
        <div style="font-size: 10px; color: #94a3b8;">Plataforma Oficial de la Red Cooperativa del Cáñamo Industrial Argentino • ARICCAME / INASE / SENASA • hemmpc.com.ar</div>
      </div>
    </div>
  </body>
  </html>`;
}

function buildUserWelcomeHtml(req: EmailNotificationPayload): string {
  const roleLabel = req.role_name || 'Miembro del Equipo';
  const structure = req.structure_name || 'Red Cooperativa Central';
  const tempPwd = req.temp_password || 'Configurada por el administrador';
  const actionUrl = req.action_url || 'https://hemp-net.vercel.app';
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }
      .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
      .header { background: #064e3b; padding: 28px 32px; color: #ffffff; text-align: left; }
      .content { padding: 32px; color: #334155; line-height: 1.6; }
      .badge { display: inline-block; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
      .creds-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; margin: 20px 0; }
      .pwd-box { background: #f0fdf4; border: 2px dashed #059669; border-radius: 16px; padding: 18px; text-align: center; margin: 20px 0; }
      .pwd-code { font-family: monospace; font-size: 20px; font-weight: 900; letter-spacing: 1.5px; color: #047857; }
      .btn { display: inline-block; background: #10b981; color: #ffffff !important; padding: 14px 30px; border-radius: 14px; font-weight: 800; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 10px; }
      .footer { background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
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
        <p style="font-size: 15px; color: #0f172a;">Hola <strong>${req.to_name}</strong>,</p>
        <p>La administración cooperativa ha creado tu perfil de acceso para la gestión de equipos, trazabilidad y labores en <strong>HempC Nucleus</strong>.</p>
        <div class="creds-box">
          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Rol / Jerarquía:</strong> <span class="badge">${roleLabel}</span></p>
          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Entidad Asignada:</strong> ${structure}</p>
          <p style="margin: 0; font-size: 13px;"><strong>Usuario de Acceso:</strong> <code style="font-family: monospace; color: #0f172a;">${req.to_email}</code></p>
        </div>
        <div class="pwd-box">
          <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #065f46; display: block; margin-bottom: 6px;">Contraseña Inicial Asignada</span>
          <span class="pwd-code">${tempPwd}</span>
        </div>
        <div style="text-align: center; margin: 26px 0 10px 0;">
          <a href="${actionUrl}" class="btn">Acceder al Sistema</a>
        </div>
      </div>
      <div class="footer">
        <div style="margin-bottom: 6px; font-weight: 800; color: #334155; font-size: 12px;">PatagonianC LTDA Cooperativa de Trabajo · CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</div>
        <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Enviado por <strong>notificaciones@hempc.com.ar</strong> (Vercel + Resend HTTPS)</div>
      </div>
    </div>
  </body>
  </html>`;
}

function buildAgronomicAlertHtml(req: EmailNotificationPayload): string {
  const title = req.alert_title || 'Alerta Agronómica Crítica';
  const plot = req.plot_name || 'Parcela en Seguimiento';
  const details = req.alert_details || 'Se ha detectado una desviación en los sensores de telemetría o condiciones climáticas.';
  const actionUrl = req.action_url || 'https://hemp-net.vercel.app/#/agro40';
  const extra = req.extra_data || {};
  const severity = String(extra.severity || 'Crítica');
  const isCritical = ['Crítica', 'Alto', 'Extremo'].includes(severity);
  const isWarning = ['Advertencia', 'Moderado'].includes(severity);

  const badgeBg = isCritical ? '#991b1b' : isWarning ? '#b45309' : '#1e40af';
  const headerColor = isCritical ? '#e11d48' : isWarning ? '#f59e0b' : '#3b82f6';

  const metrics: string[] = [];
  if (extra.ndvi !== undefined) {
    metrics.push(`<div style="flex: 1; padding: 6px;"><span style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Vigor NDVI</span><div style="font-size: 18px; font-weight: 900; color: #0f172a; font-family: monospace;">${extra.ndvi}</div></div>`);
  }
  const temp = extra.temperature_c ?? extra.temperature;
  if (temp !== undefined) {
    metrics.push(`<div style="flex: 1; padding: 6px;"><span style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Temperatura</span><div style="font-size: 18px; font-weight: 900; color: #0f172a;">${temp}°C</div></div>`);
  }
  const hum = extra.humidity_pct ?? extra.humidity;
  if (hum !== undefined) {
    metrics.push(`<div style="flex: 1; padding: 6px;"><span style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Humedad Rel.</span><div style="font-size: 18px; font-weight: 900; color: #0f172a;">${hum}%</div></div>`);
  }

  const telemetryHtml = metrics.length
    ? `<div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 18px; margin: 18px 0; display: flex; justify-content: space-around; text-align: center;">${metrics.join('')}</div>`
    : '';

  const actionBox = extra.suggested_action
    ? `<div style="background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 8px; padding: 14px 16px; margin: 16px 0; font-size: 12px; color: #065f46;"><strong style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Acción Técnica Recomendada:</strong>${extra.suggested_action}</div>`
    : '';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }
      .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #fecdd3; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
      .header { background: ${badgeBg}; padding: 24px 32px; color: #ffffff; }
      .content { padding: 32px; color: #334155; line-height: 1.6; }
      .btn { display: inline-block; background: ${headerColor}; color: #ffffff !important; padding: 14px 28px; border-radius: 14px; font-weight: 800; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
      .footer { background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #fecdd3; font-weight: 800; margin-bottom: 2px;">PatagonianC LTDA Cooperativa de Trabajo</div>
        <div style="font-size: 12px; font-weight: 900; color: #ffffff; margin-bottom: 6px;">CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</div>
        <h1 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 900;">${title}</h1>
      </div>
      <div class="content">
        <p style="font-size: 14px; margin-top: 0;">Estimado/a <strong>${req.to_name}</strong>,</p>
        <p style="font-size: 13px; color: #475569;">
          El sistema de telemetría IoT (Render Python Engine), teledetección satelital Sentinel-2 y vigilancia meteorológica ha emitido una alerta prioritaria para la parcela <strong>${plot}</strong>:
        </p>
        <div style="background: #fff1f2; border: 1px solid #ffe4e6; border-left: 4px solid ${headerColor}; border-radius: 14px; padding: 16px 20px; margin: 18px 0;">
          <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #be123c; margin-bottom: 4px;">
            Severidad: ${severity}
          </div>
          <p style="margin: 0; font-size: 13px; color: #881337; font-weight: 500; line-height: 1.5;">${details}</p>
        </div>
        ${telemetryHtml}
        ${actionBox}
        <div style="text-align: center; margin: 28px 0 16px 0;">
          <a href="${actionUrl}" class="btn">Ver Estado del Lote y Telemetría en Vivo</a>
        </div>
      </div>
      <div class="footer">
        <div style="margin-bottom: 6px; font-weight: 800; color: #334155; font-size: 12px;">PatagonianC LTDA Cooperativa de Trabajo · CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</div>
        <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Enviado por <strong>notificaciones@hempc.com.ar</strong> (Vercel + Resend HTTPS)</div>
        <div style="font-size: 10px; color: #94a3b8;">Plataforma Oficial de la Red Cooperativa del Cáñamo Industrial Argentino • INASE / SENASA / ARICCAME</div>
      </div>
    </div>
  </body>
  </html>`;
}

function buildPasswordResetHtml(req: EmailNotificationPayload): string {
  const tempPwd = req.temp_password || 'Consulte a su administrador';
  const actionUrl = req.action_url || 'https://hemp-net.vercel.app';
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }
      .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; }
      .header { background: #064e3b; padding: 28px 32px; color: #ffffff; text-align: left; }
      .content { padding: 32px; color: #334155; line-height: 1.6; }
      .pwd-box { background: #f0fdf4; border: 2px dashed #059669; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
      .pwd-code { font-family: monospace; font-size: 22px; font-weight: 900; letter-spacing: 2px; color: #047857; }
      .btn { display: inline-block; background: #059669; color: #ffffff !important; padding: 14px 30px; border-radius: 14px; font-weight: 800; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 10px; }
      .footer { background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
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
        <p style="font-size: 15px; color: #0f172a;">Hola <strong>${req.to_name}</strong>,</p>
        <p>Hemos recibido una solicitud para recuperar tus credenciales de acceso a la plataforma <strong>HempC Nucleus</strong>.</p>
        <div class="pwd-box">
          <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #065f46; display: block; margin-bottom: 6px;">Tu Contraseña Provisoria de Ingreso</span>
          <span class="pwd-code">${tempPwd}</span>
        </div>
        <div style="text-align: center; margin: 26px 0 10px 0;">
          <a href="${actionUrl}" class="btn">Ingresar al Sistema</a>
        </div>
      </div>
      <div class="footer">
        <div style="margin-bottom: 6px; font-weight: 800; color: #334155; font-size: 12px;">PatagonianC LTDA Cooperativa de Trabajo · CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</div>
        <div style="font-size: 11px; color: #64748b;">Enviado por <strong>notificaciones@hempc.com.ar</strong> (Vercel + Resend HTTPS)</div>
      </div>
    </div>
  </body>
  </html>`;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Método no permitido. Use POST.' });
  }

  const body: EmailNotificationPayload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  if (!body.to_email || !body.to_email.includes('@')) {
    return res.status(400).json({ detail: 'Dirección de correo electrónico inválida' });
  }

  const resendKey = (
    process.env.RESEND_API_KEY ||
    process.env.VITE_RESEND_API_KEY ||
    process.env.RESEND_KEY ||
    ''
  ).trim();

  const rawFrom = (
    process.env.RESEND_FROM_EMAIL ||
    'HempC Nucleus <notificaciones@hempc.com.ar>'
  ).trim();

  const formattedFrom = rawFrom.includes('<') ? rawFrom : `HempC Nucleus <${rawFrom}>`;

  let subject = body.subject;
  if (!subject) {
    if (body.notification_type === 'password_reset') {
      subject = '🔐 Restablecimiento de Contraseña • HempC Nucleus';
    } else if (body.notification_type === 'user_welcome') {
      subject = `🌿 Alta de Perfil y Credenciales • ${body.structure_name || 'HempC Nucleus'}`;
    } else if (body.notification_type === 'operator_invitation') {
      subject = `Alta de Operario • ${body.structure_name || 'HempC Nucleus'}`;
    } else if (body.notification_type === 'agronomic_alert') {
      subject = `⚠️ ALERTA CRÍTICA: ${body.alert_title || 'Desvío en Lote'}`;
    } else {
      subject = 'Notificación Oficial de HempC | Red Cooperativa Nucleus';
    }
  }

  let htmlBody = '';
  if (body.notification_type === 'password_reset') {
    htmlBody = buildPasswordResetHtml(body);
  } else if (body.notification_type === 'user_welcome') {
    htmlBody = buildUserWelcomeHtml(body);
  } else if (body.notification_type === 'agronomic_alert') {
    htmlBody = buildAgronomicAlertHtml(body);
  } else {
    htmlBody = buildOperatorInvitationHtml(body);
  }

  if (resendKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: formattedFrom,
          to: [body.to_email],
          subject,
          html: htmlBody
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return res.status(200).json({
          success: true,
          message: `Correo enviado exitosamente a ${body.to_email} vía Vercel + Resend.com (ID: ${data.id || 'ok'})`,
          sent_from: 'notificaciones@hempc.com.ar',
          sent_to: body.to_email,
          delivered_via: 'vercel_resend',
          resend_id: data.id,
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: false,
        message: `Resend devolvió HTTP ${response.status}: ${data.message || JSON.stringify(data)}`,
        sent_from: 'notificaciones@hempc.com.ar',
        sent_to: body.to_email,
        delivered_via: 'resend_error',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(200).json({
        success: false,
        message: `Error de conexión con Resend en Vercel: ${err.message || 'Error desconocido'}`,
        sent_from: 'notificaciones@hempc.com.ar',
        sent_to: body.to_email,
        delivered_via: 'resend_error',
        timestamp: new Date().toISOString()
      });
    }
  }

  return res.status(200).json({
    success: true,
    message: `Falta variable RESEND_API_KEY en Vercel Settings -> Environment Variables.`,
    sent_from: 'notificaciones@hempc.com.ar',
    sent_to: body.to_email,
    delivered_via: 'pending_resend_key',
    timestamp: new Date().toISOString()
  });
}
