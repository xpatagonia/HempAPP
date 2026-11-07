interface EmailNotificationPayload {
  to_email: string;
  to_name: string;
  subject?: string;
  notification_type?:
    | 'operator_invitation'
    | 'agronomic_alert'
    | 'labor_assigned'
    | 'password_reset'
    | 'user_welcome'
    | 'event_registration'
    | 'event_accreditation_approved'
    | 'registration_approved';
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

function escapeHtml(raw?: any): string {
  if (raw === null || raw === undefined) return '';
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeActionUrl(rawUrl?: string, fallback: string = 'https://red.hempc.com.ar'): string {
  if (!rawUrl || typeof rawUrl !== 'string') return fallback;
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/"/g, '%22').replace(/</g, '%3C').replace(/>/g, '%3E');
  }
  return fallback;
}

function buildOperatorInvitationHtml(req: EmailNotificationPayload): string {
  const roleLabel = escapeHtml(req.role_name || 'Operario de Campo');
  const structure = escapeHtml(req.structure_name || 'Establecimiento Asociado');
  const field = escapeHtml(req.field_name || 'Campo Asignado');
  const toName = escapeHtml(req.to_name);
  const toEmail = escapeHtml(req.to_email);
  const actionUrl = sanitizeActionUrl(req.action_url, 'https://red.hempc.com.ar');
  const passwordBlock = req.temp_password
    ? `
      <div style="background-color: #f1f5f9; border-radius: 12px; padding: 14px; margin: 18px 0; border-left: 4px solid #10b981;">
        <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 1px;">Credenciales de Acceso</p>
        <p style="margin: 6px 0 0 0; font-size: 14px; color: #0f172a; font-family: monospace;"><strong>Usuario:</strong> ${toEmail}</p>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #0f172a; font-family: monospace;"><strong>Contraseña provisoria:</strong> <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${escapeHtml(req.temp_password)}</span></p>
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
        <p style="font-size: 15px; color: #0f172a;">Hola <strong>${toName}</strong>,</p>
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
  const roleLabel = escapeHtml(req.role_name || 'Miembro del Equipo');
  const structure = escapeHtml(req.structure_name || 'Red Cooperativa Central');
  const tempPwd = escapeHtml(req.temp_password || 'Configurada por el administrador');
  const toName = escapeHtml(req.to_name);
  const toEmail = escapeHtml(req.to_email);
  const actionUrl = sanitizeActionUrl(req.action_url, 'https://red.hempc.com.ar');
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
        <p style="font-size: 15px; color: #0f172a;">Hola <strong>${toName}</strong>,</p>
        <p>La administración cooperativa ha creado tu perfil de acceso para la gestión de equipos, trazabilidad y labores en <strong>HempC Nucleus</strong>.</p>
        <div class="creds-box">
          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Rol / Jerarquía:</strong> <span class="badge">${roleLabel}</span></p>
          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Entidad Asignada:</strong> ${structure}</p>
          <p style="margin: 0; font-size: 13px;"><strong>Usuario de Acceso:</strong> <code style="font-family: monospace; color: #0f172a;">${toEmail}</code></p>
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
  const title = escapeHtml(req.alert_title || 'Alerta Agronómica Crítica');
  const plot = escapeHtml(req.plot_name || 'Parcela en Seguimiento');
  const details = escapeHtml(req.alert_details || 'Se ha detectado una desviación en los sensores de telemetría o condiciones climáticas.');
  const actionUrl = sanitizeActionUrl(req.action_url, 'https://red.hempc.com.ar/#/agro40');
  const extra = req.extra_data || {};
  const severity = escapeHtml(String(extra.severity || 'Crítica'));
  const isCritical = ['Crítica', 'Alto', 'Extremo'].includes(String(extra.severity || 'Crítica'));
  const isWarning = ['Advertencia', 'Moderado'].includes(String(extra.severity || 'Crítica'));

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
  const tempPwd = escapeHtml(req.temp_password || 'Consulte a su administrador');
  const toName = escapeHtml(req.to_name);
  const actionUrl = sanitizeActionUrl(req.action_url, 'https://red.hempc.com.ar');
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
        <p style="font-size: 15px; color: #0f172a;">Hola <strong>${toName}</strong>,</p>
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

function buildLaborAssignedHtml(req: EmailNotificationPayload): string {
  const taskTitle = escapeHtml(req.task_title || req.alert_title || 'Orden de Labor Agrícola');
  const plot = escapeHtml(req.plot_name || 'Parcela Asignada');
  const details = escapeHtml(req.alert_details || 'Se ha emitido una nueva orden de trabajo técnico en campo.');
  const actionUrl = sanitizeActionUrl(req.action_url, 'https://red.hempc.com.ar/#/tasks');
  const extra = req.extra_data || {};
  const dueDate = escapeHtml(extra.due_date || 'Programada');
  const priority = escapeHtml(extra.priority || 'Alta');
  const machinery = escapeHtml(extra.machinery || 'Maquinaria Agrícola');
  const operator = escapeHtml(extra.operator || req.to_name);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }
      .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
      .header { background: #0f172a; padding: 26px 32px; color: #ffffff; border-bottom: 4px solid #10b981; }
      .content { padding: 32px; color: #334155; line-height: 1.6; }
      .btn { display: inline-block; background: #10b981; color: #ffffff !important; padding: 14px 28px; border-radius: 14px; font-weight: 800; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
      .footer { background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #34d399; font-weight: 800; margin-bottom: 2px;">PatagonianC LTDA Cooperativa de Trabajo</div>
        <div style="font-size: 12px; font-weight: 900; color: #ffffff; margin-bottom: 6px;">CUIT: 30-71816113-0 · HempC (Unidad de Negocios)</div>
        <h1 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 900;">🚜 Orden de Labor Agrícola: ${taskTitle}</h1>
      </div>
      <div class="content">
        <p style="font-size: 14px; margin-top: 0;">Hola <strong>${req.to_name}</strong>,</p>
        <p style="font-size: 13px; color: #475569;">
          Se ha registrado y asignado una orden de labor técnica en la plataforma cooperativa para la parcela <strong>${plot}</strong>:
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; border-radius: 14px; padding: 16px 20px; margin: 18px 0; font-size: 13px;">
          <p style="margin: 0 0 6px 0;"><strong>📍 Lote / Parcela:</strong> ${plot}</p>
          <p style="margin: 0 0 6px 0;"><strong>📅 Fecha Programada:</strong> ${dueDate} • <strong>Prioridad:</strong> ${priority}</p>
          <p style="margin: 0 0 6px 0;"><strong>🚜 Maquinaria / Implemento:</strong> ${machinery}</p>
          <p style="margin: 0 0 10px 0;"><strong>👷 Operario Responsable:</strong> ${operator}</p>
          <p style="margin: 0; color: #0f172a; font-weight: 500;">${details}</p>
        </div>
        <div style="text-align: center; margin: 28px 0 16px 0;">
          <a href="${actionUrl}" class="btn">Abrir Orden de Trabajo en Plataforma</a>
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

function buildEventRegistrationHtml(req: EmailNotificationPayload): string {
  const extra = req.extra_data || {};
  const eventName = escapeHtml(extra.event_name || 'JORNADA OFICIAL: “UN DÍA DE SIEMBRA”');
  const eventDate = escapeHtml(extra.event_date || 'Sábado 21 de Noviembre • 08:30 a 15:30 hs');
  const ticketCode = escapeHtml(extra.ticket_code || 'SIEMBRA-21N-0001');
  const verificationPin = escapeHtml(extra.verification_pin || '');
  const dniNumber = escapeHtml(extra.dni_number || 'Registrado');
  const phone = escapeHtml(extra.phone || 'Registrado');
  const profileLabel = escapeHtml(req.role_name || 'Visitante a Jornada / Acreditación Presencial');
  const organization = escapeHtml(req.structure_name || 'Participante Independiente');
  const locality = escapeHtml(extra.locality || 'VIRCH – Trelew, Chubut');
  const toName = escapeHtml(req.to_name);
  const toEmail = escapeHtml(req.to_email);

  const directConfirmUrl = sanitizeActionUrl(
    req.action_url,
    `https://red.hempc.com.ar/#/login?confirmar_evento=1&ticket=${encodeURIComponent(
      extra.ticket_code || 'SIEMBRA-21N-0001'
    )}&pin=${encodeURIComponent(extra.verification_pin || '')}&email=${encodeURIComponent(
      req.to_email || ''
    )}&name=${encodeURIComponent(req.to_name || '')}&dni=${encodeURIComponent(
      extra.dni_number || ''
    )}&phone=${encodeURIComponent(extra.phone || '')}&org=${encodeURIComponent(
      req.structure_name || ''
    )}&loc=${encodeURIComponent(extra.locality || '')}`
  );

  const pinBlock = verificationPin
    ? `
      <div style="background: #f0fdf4; border: 2px dashed #059669; border-radius: 16px; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #065f46; display: block; margin-bottom: 6px;">
          PASO 1: CÓDIGO PIN PARA INGRESAR EN LA PANTALLA DE INSCRIPCIÓN ABIERTA
        </span>
        <span style="font-family: monospace; font-size: 28px; font-weight: 900; letter-spacing: 6px; color: #047857; background: #ffffff; padding: 6px 18px; border-radius: 10px; border: 1px solid #a7f3d0; display: inline-block; margin: 4px 0;">${verificationPin}</span>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #065f46; font-weight: 600;">
          Copiá e ingresá estos 6 dígitos en la ventana donde completaste tu registro para habilitar de inmediato la descarga del <strong>Programa Oficial en PDF</strong>.
        </p>
      </div>
    `
    : '';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #d1fae5; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.06); }
      .header { background: #0c2d1e; padding: 28px 30px; color: #ffffff; border-left: 5px solid #d97706; }
      .content { padding: 28px 30px; color: #334155; line-height: 1.6; }
      .btn { display: inline-block; background: #006633; color: #ffffff !important; padding: 13px 24px; border-radius: 12px; font-weight: 900; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px; }
      .schedule-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; margin: 20px 0; font-size: 12px; }
      .footer { background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div style="font-size: 10px; letter-spacing: 1.8px; text-transform: uppercase; color: #DDDB00; font-weight: 900; margin-bottom: 4px;">
          DIPLOMATURA UNIVERSITARIA EN CÁÑAMO INDUSTRIAL • UNLZ – UATRE
        </div>
        <h1 style="margin: 4px 0 6px 0; font-size: 22px; font-weight: 900; letter-spacing: -0.3px;">${eventName}</h1>
        <div style="font-size: 12px; color: #e2e8f0; font-weight: 600;">Sede Práctica Patagonia: Chacra Experimental PatagonianC LTDA • Ubicación: VIRCH – Trelew, Chubut</div>
      </div>
      <div class="content">
        <p style="font-size: 15px; color: #0f172a; margin-top: 0;">Hola <strong>${toName}</strong>,</p>
        <p style="font-size: 13px; color: #475569;">
          Recibimos tu solicitud de inscripción para asistir a la <strong>${eventName}</strong> (${eventDate}) organizada por <strong>PatagonianC & UATRE</strong>.
        </p>

        ${pinBlock}

        <div style="background: #0c2d1e; color: #ffffff; border-radius: 16px; padding: 18px 22px; margin: 20px 0;">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #6ee7b7; font-weight: 800;">Datos de tu Pre-Acreditación Registrada</div>
          <div style="font-size: 20px; font-weight: 900; font-family: monospace; letter-spacing: 1.5px; color: #DDDB00; margin: 4px 0;">N° DE TRÁMITE / PASE: ${ticketCode}</div>
          <div style="font-size: 12px; color: #ecfdf5; margin-top: 6px; line-height: 1.5;">
            <strong>Titular:</strong> ${toName} • <strong>DNI / CUIT:</strong> ${dniNumber}<br/>
            <strong>Correo:</strong> ${toEmail} • <strong>Tel:</strong> ${phone}<br/>
            <strong>Procedencia:</strong> ${organization} (${locality}) • <strong>Categoría:</strong> ${profileLabel}
          </div>
        </div>

        <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 12px; padding: 12px 16px; margin: 16px 0; font-size: 11px; color: #b45309; font-weight: 700;">
          ⚠ AVISO IMPORTANTE: Por tratarse de una actividad de campo a cielo abierto, LA JORNADA SE REPROGRAMA EN CASO DE MAL TIEMPO (Aviso 24 hs antes). El programa de actividades se encuentra sujeto a actualización.
        </div>

        <div class="schedule-box">
          <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0c2d1e; letter-spacing: 1px; margin-bottom: 10px;">
            1. CRONOGRAMA GENERAL DE ACTIVIDADES (08:30 a 15:30 hs — Sujeto a actualización)
          </div>
          <p style="margin: 0 0 6px 0;"><strong>08:30 – 09:15:</strong> Acreditación y Recepción (Café de bienvenida, entrega de credenciales y carpeta técnica).</p>
          <p style="margin: 0 0 6px 0;"><strong>09:15 – 10:00:</strong> Apertura Institucional (Gastón Barea y Carlos Reyes - PatagonianC LTDA, Sebastián Tosolini, Demian Gomez - UATRE Buenos Aires - Chubut y Autoridades Provinciales).</p>
          <p style="margin: 0 0 6px 0;"><strong>10:00 – 10:45:</strong> Bloque de Campo 1: Propósitos en 3 Lotes (Grano, Cañamiza y Fibra Textil) y Mecanización.</p>
          <p style="margin: 0 0 6px 0;"><strong>10:45 – 11:45:</strong> Bloque de Campo 2: Protocolo Propio, BPA, Red y NUCLEUS (Siembra en vivo en los 3 lotes).</p>
          <p style="margin: 0 0 6px 0;"><strong>11:45 – 12:30:</strong> Bloque de Campo 3: Sistema de Riego en el VIRCH (Manejo hídrico por canal principal).</p>
          <p style="margin: 0 0 6px 0;"><strong>12:30 – 14:15:</strong> Break - Charla: Showroom de Materiales y Plantas Vivas (Hempcrete, fibra textil, cañamiza y grano).</p>
          <p style="margin: 0 0 6px 0;"><strong>14:15 – 15:00:</strong> Charla Técnica Central: Protocolo de Siembra - Trazabilidad 360 y monitoreo satelital en NUCLEUS.</p>
          <p style="margin: 0;"><strong>15:00 – 15:30:</strong> Cierre y Certificados (Entrega de certificados de asistencia práctica junto a UATRE).</p>
        </div>

        <p style="font-size: 12px; color: #64748b; background: #f1f5f9; border-left: 4px solid #0c2d1e; padding: 10px 14px; border-radius: 8px;">
          <strong>Próximo Paso — Emisión de tu Credencial QR Oficial:</strong> Una vez que la Administración de <strong>EVENTOS</strong> apruebe tu acreditación, recibirás un segundo correo con tu <strong>Credencial / Pase Oficial QR personalizado</strong> listo para descargar en PDF y presentar con tu DNI el día de la jornada.
        </p>

        <div style="text-align: center; margin: 22px 0 10px 0; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
          <p style="margin: 0 0 10px 0; font-size: 11px; color: #64748b;">
            ¿Cerraste la pestaña de inscripción o estás viendo este correo desde otro dispositivo? Usá este enlace directo para ver tu constancia y descargar el Programa Oficial sin volver a llenar el formulario:
          </p>
          <a href="${directConfirmUrl}" class="btn">Ver mi Pre-Inscripción y Descargar Programa PDF</a>
        </div>
      </div>
      <div class="footer">
        <div style="margin-bottom: 6px; font-weight: 800; color: #334155; font-size: 12px;">PatagonianC LTDA Cooperativa de Trabajo · Mat. INAES 68218 · CUIT: 30-71816113-0 · HempC</div>
        <div style="font-size: 11px; color: #64748b;">Enviado por <strong>notificaciones@hempc.com.ar</strong> (Vercel + Resend HTTPS)</div>
      </div>
    </div>
  </body>
  </html>`;
}

function buildEventAccreditationApprovedHtml(req: EmailNotificationPayload): string {
  const extra = req.extra_data || {};
  const eventName = escapeHtml(extra.event_name || 'JORNADA OFICIAL: “UN DÍA DE SIEMBRA”');
  const eventDate = escapeHtml(extra.event_date || 'Sábado 21 de Noviembre • 08:30 a 15:30 hs');
  const venueName = escapeHtml(extra.venue_name || 'Establecimiento La Regina — Chacra La Regina');
  const locality = escapeHtml(extra.locality || 'VIRCH – Trelew, Chubut');
  const address = escapeHtml(
    extra.address || 'Chacra 23 Parcela 13, Ruta Nacional 3 Km 1462 (Acceso Sur Trelew)'
  );
  const routeInstructions = escapeHtml(
    extra.route_instructions ||
      'Ruta Destacada: Desde Rotonda de Acceso Sur de Trelew (RN 3 y RP 7), tomar Ruta Nacional 3 hacia el Sur hasta el Km 1462. Girar a mano izquierda (Este) por callejón rural señalizado "Chacra 23 / PatagonianC" y avanzar 650 m hasta Tranquera Principal.'
  );
  const rawLat = Number(extra.lat);
  const rawLng = Number(extra.lng);
  const lat = !isNaN(rawLat) && rawLat >= -90 && rawLat <= 90 && rawLat !== 0 ? rawLat : -43.308362;
  const lng = !isNaN(rawLng) && rawLng >= -180 && rawLng <= 180 && rawLng !== 0 ? rawLng : -65.289033;
  const gpsDecimal = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  const toDMS = (deg: number, isLat: boolean) => {
    const dir = isLat ? (deg >= 0 ? 'N' : 'S') : deg >= 0 ? 'E' : 'W';
    const abs = Math.abs(deg);
    const d = Math.floor(abs);
    const minFloat = (abs - d) * 60;
    const m = Math.floor(minFloat);
    const s = ((minFloat - m) * 60).toFixed(1);
    return `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(4, '0')}"${dir}`;
  };
  const gpsDms = `${toDMS(lat, true)} ${toDMS(lng, false)}`;

  const googleMapsGpsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const wazeGpsUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    extra.event_name || 'Jornada Oficial HempC'
  )}&location=${encodeURIComponent(
    `${extra.venue_name || 'Chacra La Regina'} (${gpsDecimal})`
  )}&details=${encodeURIComponent(
    `Ruta Destacada: ${extra.route_instructions || ''}\nCoordenadas GPS: ${gpsDecimal}\nAbrir GPS Celular: ${googleMapsGpsUrl}`
  )}`;

  const ticketCode = escapeHtml(extra.ticket_code || 'SIEMBRA-21N-OFICIAL');
  const dniNumber = escapeHtml(extra.dni_number || 'Presentar DNI en puerta');
  const phone = escapeHtml(extra.phone || 'Registrado');
  const approvedBy = escapeHtml(extra.approved_by || 'Administración Central HempC');
  const toName = escapeHtml(req.to_name);
  const toEmail = escapeHtml(req.to_email);
  const organization = escapeHtml(req.structure_name || 'Visitante Acreditado');

  const passDownloadUrl = sanitizeActionUrl(
    req.action_url,
    `https://red.hempc.com.ar/#/login?pase_qr=${encodeURIComponent(
      extra.ticket_code || 'SIEMBRA-21N-OFICIAL'
    )}&email=${encodeURIComponent(req.to_email || '')}&name=${encodeURIComponent(
      req.to_name || ''
    )}&dni=${encodeURIComponent(extra.dni_number || '')}&phone=${encodeURIComponent(
      extra.phone || ''
    )}&org=${encodeURIComponent(req.structure_name || '')}&loc=${encodeURIComponent(
      extra.locality || ''
    )}&lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
  );

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    passDownloadUrl
  )}`;

  const gpsQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    googleMapsGpsUrl
  )}`;

  const staticMapImageUrl = `https://static-maps.yandex.ru/1.x/?ll=${lng.toFixed(6)},${lat.toFixed(
    6
  )}&z=14&l=sat,skl&size=650,320&pt=${lng.toFixed(6)},${lat.toFixed(6)},pm2gnl`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #d1fae5; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.06); }
      .header { background: #0c2d1e; padding: 28px 30px; color: #ffffff; border-left: 5px solid #DDDB00; }
      .content { padding: 28px 30px; color: #334155; line-height: 1.6; }
      .btn { display: inline-block; background: #006633; color: #ffffff !important; padding: 14px 26px; border-radius: 12px; font-weight: 900; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 0.7px; }
      .btn-gps { display: inline-block; background: #0284c7; color: #ffffff !important; padding: 12px 20px; border-radius: 10px; font-weight: 900; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 4px; }
      .btn-waze { display: inline-block; background: #0f172a; color: #DDDB00 !important; padding: 12px 20px; border-radius: 10px; font-weight: 900; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 4px; }
      .footer { background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div style="font-size: 10px; letter-spacing: 1.8px; text-transform: uppercase; color: #DDDB00; font-weight: 900; margin-bottom: 4px;">
          CREDENCIAL OFICIAL DE ACREDITACIÓN APROBADA • EVENTOS HEMPC
        </div>
        <h1 style="margin: 4px 0 6px 0; font-size: 21px; font-weight: 900;">${eventName}</h1>
        <div style="font-size: 12px; color: #e2e8f0; font-weight: 600;">Sede: ${venueName} • ${locality}</div>
      </div>
      <div class="content">
        <p style="font-size: 15px; color: #0f172a; margin-top: 0;">Hola <strong>${toName}</strong>,</p>
        <p style="font-size: 13px; color: #475569;">
          La Administración Central de <strong>HempC</strong> aprobó tu acreditación presencial para asistir a <strong>${eventName}</strong> (${eventDate}). A continuación encontrás tu <strong>Credencial Oficial con Código QR, la Captura del Mapa Satelital/Vial, el Instructivo Paso a Paso de Cómo Llegar y la conexión directa al GPS de tu celular</strong>:
        </p>

        <!-- CREDENCIAL OFICIAL CON DATOS DEL REGISTRO Y QR ESCANEABLE -->
        <div style="background: #0c2d1e; color: #ffffff; border-radius: 18px; padding: 22px; margin: 22px 0; border: 2px solid #DDDB00;">
          <div style="border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 10px; margin-bottom: 14px;">
            <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #6ee7b7; font-weight: 800; display: block;">
              PASE PERSONAL E INTRANSFERIBLE DE INGRESO EN TRANQUERA
            </span>
            <div style="font-size: 24px; font-weight: 900; font-family: monospace; letter-spacing: 2px; color: #DDDB00; margin-top: 4px;">
              ${ticketCode}
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; color: #ffffff; font-size: 12px;">
            <tr>
              <td style="padding: 4px 0; color: #a7f3d0; font-weight: 700; width: 38%;">Apellido y Nombre:</td>
              <td style="padding: 4px 0; font-weight: 900; font-size: 14px; color: #ffffff;">${toName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #a7f3d0; font-weight: 700;">DNI / CUIT:</td>
              <td style="padding: 4px 0; font-weight: 800; color: #ffffff;">${dniNumber}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #a7f3d0; font-weight: 700;">Correo Electrónico:</td>
              <td style="padding: 4px 0; color: #ecfdf5;">${toEmail}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #a7f3d0; font-weight: 700;">Teléfono / WhatsApp:</td>
              <td style="padding: 4px 0; color: #ecfdf5;">${phone}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #a7f3d0; font-weight: 700;">Institución / Procedencia:</td>
              <td style="padding: 4px 0; color: #ecfdf5;">${organization} (${locality})</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #a7f3d0; font-weight: 700;">Establecimiento / Sede:</td>
              <td style="padding: 4px 0; color: #DDDB00; font-weight: 700;">${venueName} • ${eventDate}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #a7f3d0; font-weight: 700;">Autorizado por:</td>
              <td style="padding: 4px 0; color: #6ee7b7; font-weight: 700;">${approvedBy}</td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 18px; background: #ffffff; padding: 14px; border-radius: 14px; max-width: 210px; margin-left: auto; margin-right: auto;">
            <img src="${qrImageUrl}" alt="Código QR de Acreditación ${ticketCode}" width="180" height="180" style="display: block; margin: 0 auto;" />
            <div style="font-family: monospace; font-size: 12px; font-weight: 900; color: #0c2d1e; margin-top: 6px;">${ticketCode}</div>
            <div style="font-size: 10px; color: #475569; font-weight: 700;">PRESENTAR CON DNI EN PUERTA</div>
          </div>
        </div>

        <div style="text-align: center; margin: 20px 0 24px 0;">
          <a href="${passDownloadUrl}" class="btn">Descargar Credencial QR + Captura de Mapa e Instructivo (PDF)</a>
          <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
            Al abrir este enlace verás el <strong>Mapa Satelital Interactivo con la Ruta Destacada</strong> y se descargará tu Credencial Oficial de 2 páginas con la <strong>Captura Cartográfica del Mapa y el Instructivo de Cómo Llegar en PDF</strong>.
          </div>
        </div>

        <!-- BLOQUE DE UBICACIÓN, CAPTURA DEL MAPA, INSTRUCTIVO DE CÓMO LLEGAR Y GPS CELULAR -->
        <div style="background: #f0fdf4; border: 2px solid #006633; border-radius: 18px; padding: 20px; margin: 22px 0;">
          <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.2px; color: #006633; margin-bottom: 10px;">
            🗺️ CAPTURA DEL MAPA, INSTRUCTIVO DE CÓMO LLEGAR Y CONEXIÓN AL GPS DEL CELULAR
          </div>

          <!-- CAPTURA SATELITAL / VIAL ESTÁTICA CON ENLACE DIRECTO AL GPS -->
          <div style="background: #0c2d1e; border-radius: 14px; overflow: hidden; border: 2px solid #006633; margin-bottom: 14px;">
            <div style="padding: 10px 14px; background: #0c2d1e; color: #DDDB00; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">
              📸 CAPTURA DE UBICACIÓN SATELITAL Y RED VIAL • ${venueName}
            </div>
            <a href="${googleMapsGpsUrl}" target="_blank" style="display: block; text-decoration: none;">
              <img src="${staticMapImageUrl}" alt="Captura del Mapa de Cómo Llegar - ${venueName}" width="100%" style="display: block; width: 100%; max-height: 270px; object-fit: cover; border-top: 1px solid #006633; border-bottom: 1px solid #006633;" />
            </a>
            <div style="padding: 10px 14px; background: #0f291e; color: #ffffff; font-family: monospace; font-size: 11px;">
              <strong style="color: #DDDB00;">🧭 COORDENADAS OFICIALES GPS:</strong> ${gpsDecimal} &nbsp;|&nbsp; <strong>GMS:</strong> ${gpsDms}
            </div>
          </div>

          <!-- INSTRUCTIVO PASO A PASO DE CÓMO LLEGAR -->
          <div style="background: #0f291e; color: #ffffff; border-radius: 14px; padding: 16px; margin-bottom: 14px;">
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6ee7b7; font-weight: 800; margin-bottom: 8px;">
              📋 INSTRUCTIVO VIAL PASO A PASO • RUTA DESTACADA HASTA TRANQUERA
            </div>
            <div style="margin: 8px 0; padding: 10px 12px; background: rgba(255,255,255,0.06); border-left: 3px solid #38bdf8; border-radius: 8px; font-size: 12px;">
              <div style="color: #bae6fd; font-weight: 800;">1️⃣ Tramo 1 — Aproximación por Vía Principal (${locality})</div>
              <div style="color: #e2e8f0; font-size: 11px; margin-top: 2px;">Tomar la ruta troncal hacia ${locality} siguiendo la señalización vial hacia ${address}.</div>
            </div>
            <div style="margin: 8px 0; padding: 10px 12px; background: rgba(255,255,255,0.06); border-left: 3px solid #DDDB00; border-radius: 8px; font-size: 12px;">
              <div style="color: #fde68a; font-weight: 800;">2️⃣ Tramo 2 — Ruta Destacada y Desvío Señalizado (${address})</div>
              <div style="color: #ffffff; font-size: 11px; margin-top: 2px;">${routeInstructions}</div>
            </div>
            <div style="margin: 8px 0 0 0; padding: 10px 12px; background: rgba(16,185,129,0.14); border-left: 3px solid #10b981; border-radius: 8px; font-size: 12px;">
              <div style="color: #6ee7b7; font-weight: 900;">3️⃣ Tramo 3 — Puesto de Control QR en Tranquera (${venueName})</div>
              <div style="color: #ecfdf5; font-size: 11px; margin-top: 2px;">Arribo al punto GPS <code>${gpsDecimal}</code>. Presentar Pase QR (${ticketCode}) y DNI físico en recepción.</div>
            </div>
          </div>

          <div style="text-align: center; margin-top: 14px;">
            <div style="font-size: 11px; font-weight: 800; color: #065f46; text-transform: uppercase; margin-bottom: 8px;">
              Tocá desde tu celular para abrir la ruta guiada por voz hasta la tranquera:
            </div>
            <a href="${googleMapsGpsUrl}" class="btn-gps">🚗 Abrir Ruta en Google Maps (GPS Celular)</a>
            <a href="${wazeGpsUrl}" class="btn-waze">🧭 Iniciar Navegación en Waze GPS</a>
          </div>

          <table style="width: 100%; margin-top: 14px; border-top: 1px dashed #86efac; padding-top: 12px;">
            <tr>
              <td style="width: 110px; text-align: center; background: #ffffff; padding: 8px; border-radius: 10px; border: 1px solid #bbf7d0;">
                <img src="${gpsQrImageUrl}" alt="QR GPS Ruta" width="95" height="95" style="display: block; margin: 0 auto;" />
                <div style="font-size: 9px; font-weight: 800; color: #006633; margin-top: 3px;">QR RUTA GPS</div>
              </td>
              <td style="padding-left: 14px; font-size: 11px; color: #334155;">
                <strong>¿Estás viendo este correo en tu computadora?</strong><br/>
                Apuntá con la cámara de tu teléfono al <strong>QR RUTA GPS</strong> de la izquierda para enviar las coordenadas exactas (<code>${gpsDecimal}</code>) directamente al navegador GPS de tu celular, o agendá el evento con recordatorio:
                <div style="margin-top: 8px;">
                  <a href="${googleCalendarUrl}" style="color: #006633; font-weight: 900; text-decoration: underline;">📅 Agendar Evento y Ubicación GPS en Google Calendar</a>
                </div>
              </td>
            </tr>
          </table>
        </div>
      </div>
      <div class="footer">
        <div style="margin-bottom: 6px; font-weight: 800; color: #334155; font-size: 12px;">PatagonianC LTDA Cooperativa de Trabajo · Mat. INAES 68218 · CUIT: 30-71816113-0 · HempC</div>
        <div style="font-size: 11px; color: #64748b;">Enviado por <strong>notificaciones@hempc.com.ar</strong> (Vercel + Resend HTTPS)</div>
      </div>
    </div>
  </body>
  </html>`;
}

function buildRegistrationApprovedHtml(req: EmailNotificationPayload): string {
  const roleLabel = req.role_name || 'Visitante / Invitado General';
  const structure = req.structure_name || 'Red Cooperativa HempC';
  const extra = req.extra_data || {};
  const ticketCode = extra.ticket_code || '';
  const activationToken = extra.activation_token || '';
  const actionUrl =
    req.action_url ||
    `https://red.hempc.com.ar/#/login?activar=${encodeURIComponent(req.to_email)}${
      activationToken ? `&token=${encodeURIComponent(activationToken)}` : ''
    }`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }
      .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #d1fae5; overflow: hidden; }
      .header { background: #064e3b; padding: 28px 32px; color: #ffffff; border-bottom: 4px solid #10b981; }
      .content { padding: 32px; color: #334155; line-height: 1.6; }
      .badge { display: inline-block; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
      .btn { display: inline-block; background: #006633; color: #ffffff !important; padding: 14px 30px; border-radius: 14px; font-weight: 800; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
      .footer { background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #a7f3d0; font-weight: 800; margin-bottom: 2px;">PatagonianC LTDA Cooperativa de Trabajo · NUCLEUS</div>
        <h1 style="margin: 6px 0 0 0; font-size: 22px; font-weight: 900;">Solicitud de Alta Aprobada • Activá tu Contraseña</h1>
      </div>
      <div class="content">
        <p style="font-size: 15px; color: #0f172a;">Hola <strong>${req.to_name}</strong>,</p>
        <p>La Administración Central de <strong>NUCLEUS</strong> ha aprobado tu solicitud de alta en la plataforma.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Perfil Habilitado:</strong> <span class="badge">${roleLabel}</span></p>
          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Organización / Establecimiento:</strong> ${structure}</p>
          <p style="margin: 0; font-size: 13px;"><strong>Usuario de Acceso:</strong> <code style="font-family: monospace;">${req.to_email}</code></p>
          ${ticketCode ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #047857;"><strong>Credencial Evento 21/11:</strong> ${ticketCode} (Confirmada)</p>` : ''}
          ${activationToken ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #0f172a;"><strong>Código de Activación:</strong> <code style="font-family: monospace; font-weight: 900; color: #006633;">${activationToken}</code></p>` : ''}
        </div>
        <p>Para completar el proceso de seguridad, hacé clic en el siguiente botón para <strong>ingresar tu contraseña personal y confirmar tu acceso</strong>:</p>
        <div style="text-align: center; margin: 26px 0 14px 0;">
          <a href="${actionUrl}" class="btn">Ingresar Contraseña y Confirmar Acceso</a>
        </div>
        <p style="font-size: 11px; color: #64748b; text-align: center;">
          Si el botón no abre automáticamente, copiá y pegá este enlace en tu navegador:<br/>
          <a href="${actionUrl}" style="color: #006633; word-break: break-all;">${actionUrl}</a>
        </p>
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
    } else if (body.notification_type === 'event_registration') {
      subject = 'Confirmación de Inscripción: Jornada Oficial "Un Día de Siembra" (Sáb. 21 Nov) • PatagonianC & UATRE';
    } else if (body.notification_type === 'event_accreditation_approved') {
      subject = `✅ Acreditación Oficial Aprobada (${body.extra_data?.ticket_code || 'PASE QR'}) • ${body.extra_data?.event_name || 'Jornada de Campo HempC'}`;
    } else if (body.notification_type === 'registration_approved') {
      subject = `Solicitud de Alta Aprobada (${body.role_name || 'Miembro'}) • Activá tu Contraseña en NUCLEUS`;
    } else if (body.notification_type === 'user_welcome') {
      subject = `🌿 Alta de Perfil y Credenciales • ${body.structure_name || 'HempC Nucleus'}`;
    } else if (body.notification_type === 'operator_invitation') {
      subject = `Alta de Operario • ${body.structure_name || 'HempC Nucleus'}`;
    } else if (body.notification_type === 'agronomic_alert') {
      subject = `⚠️ ALERTA CRÍTICA: ${body.alert_title || 'Desvío en Lote'}`;
    } else if (body.notification_type === 'labor_assigned') {
      subject = `🚜 Orden de Labor Agrícola: ${body.task_title || 'Tarea de Campo'}`;
    } else {
      subject = 'Notificación Oficial de HempC | Red Cooperativa Nucleus';
    }
  }

  let htmlBody = '';
  if (body.notification_type === 'password_reset') {
    htmlBody = buildPasswordResetHtml(body);
  } else if (body.notification_type === 'event_registration') {
    htmlBody = buildEventRegistrationHtml(body);
  } else if (body.notification_type === 'event_accreditation_approved') {
    htmlBody = buildEventAccreditationApprovedHtml(body);
  } else if (body.notification_type === 'registration_approved') {
    htmlBody = buildRegistrationApprovedHtml(body);
  } else if (body.notification_type === 'user_welcome') {
    htmlBody = buildUserWelcomeHtml(body);
  } else if (body.notification_type === 'agronomic_alert') {
    htmlBody = buildAgronomicAlertHtml(body);
  } else if (body.notification_type === 'labor_assigned') {
    htmlBody = buildLaborAssignedHtml(body);
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
