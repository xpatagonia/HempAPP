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

function buildLaborAssignedHtml(req: EmailNotificationPayload): string {
  const taskTitle = req.task_title || req.alert_title || 'Orden de Labor Agrícola';
  const plot = req.plot_name || 'Parcela Asignada';
  const details = req.alert_details || 'Se ha emitido una nueva orden de trabajo técnico en campo.';
  const actionUrl = req.action_url || 'https://hemp-net.vercel.app/#/tasks';
  const extra = req.extra_data || {};
  const dueDate = extra.due_date || 'Programada';
  const priority = extra.priority || 'Alta';
  const machinery = extra.machinery || 'Maquinaria Agrícola';
  const operator = extra.operator || req.to_name;

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
  const eventName = extra.event_name || 'JORNADA OFICIAL: “UN DÍA DE SIEMBRA”';
  const eventDate = extra.event_date || 'Sábado 21 de Noviembre • 08:30 a 15:30 hs';
  const ticketCode = extra.ticket_code || 'SIEMBRA-21N-0001';
  const verificationPin = extra.verification_pin || '';
  const profileLabel = req.role_name || 'Acreditado / Participante';
  const organization = req.structure_name || 'Participante Independiente';
  const locality = extra.locality || 'VIRCH – Trelew, Chubut';
  const programUrl = req.action_url || 'https://red.hempc.com.ar/#/login?evento=un-dia-de-siembra';

  const pinBlock = verificationPin
    ? `
      <div style="background: #f0fdf4; border: 2px dashed #059669; border-radius: 16px; padding: 16px; text-align: center; margin: 18px 0;">
        <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #065f46; display: block; margin-bottom: 4px;">
          Código de Confirmación para Descarga del Programa Oficial
        </span>
        <span style="font-family: monospace; font-size: 24px; font-weight: 900; letter-spacing: 4px; color: #047857;">${verificationPin}</span>
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
      .btn { display: inline-block; background: #006633; color: #ffffff !important; padding: 14px 28px; border-radius: 12px; font-weight: 900; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.8px; }
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
        <p style="font-size: 15px; color: #0f172a; margin-top: 0;">Hola <strong>${req.to_name}</strong>,</p>
        <p style="font-size: 13px; color: #475569;">
          Confirmamos la recepción de tu pre-inscripción a la <strong>${eventName}</strong> (${eventDate}) organizada por <strong>PatagonianC & UATRE</strong>, y tu solicitud de alta en la plataforma <strong>HempC Nucleus</strong>.
        </p>

        <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 12px; padding: 12px 16px; margin: 16px 0; font-size: 11px; color: #b45309; font-weight: 700;">
          ⚠ AVISO IMPORTANTE: Por tratarse de una actividad de campo a cielo abierto, LA JORNADA SE REPROGRAMA EN CASO DE MAL TIEMPO (Aviso 24 hs antes). El programa de actividades se encuentra sujeto a actualización.
        </div>

        <div style="background: #0c2d1e; color: #ffffff; border-radius: 16px; padding: 18px 22px; margin: 20px 0;">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #6ee7b7; font-weight: 800;">Pase Oficial de Acreditación</div>
          <div style="font-size: 20px; font-weight: 900; font-family: monospace; letter-spacing: 1.5px; color: #DDDB00; margin: 4px 0;">${ticketCode}</div>
          <div style="font-size: 12px; color: #ecfdf5; margin-top: 6px;">
            <strong>Perfil Solicitado:</strong> ${profileLabel} • <strong>Entidad:</strong> ${organization} (${locality})
          </div>
        </div>

        ${pinBlock}

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
          <strong>Seguridad y Aprobación Administrativa:</strong> Tu solicitud quedó registrada en estado <em>Pendiente de Aprobación</em>. Una vez que un Administrador apruebe tu alta como <strong>Visitante</strong> o <strong>Productor</strong>, recibirás un correo oficial con el <strong>enlace directo para ingresar tu contraseña y confirmar el acceso</strong>.
        </p>

        <div style="text-align: center; margin: 26px 0 12px 0;">
          <a href="${programUrl}" class="btn">Confirmar Correo y Descargar Programa Oficial PDF</a>
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
