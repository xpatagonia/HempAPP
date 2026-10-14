import { getTelemetryEngineUrl } from './telemetryStreamService';

export interface SendOperatorInvitationParams {
  toEmail: string;
  toName: string;
  structureName: string;
  fieldName?: string;
  roleName: string;
  tempPassword?: string;
  actionUrl?: string;
}

export interface SendAgronomicAlertParams {
  toEmail: string;
  toName: string;
  alertTitle: string;
  plotName?: string;
  alertDetails: string;
  actionUrl?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  message: string;
  sentFrom: string;
  sentTo: string;
  deliveredVia: string;
  timestamp: string;
}

export interface EmailAuditLogEntry {
  id: string;
  timestamp: string;
  toEmail: string;
  toName: string;
  type: 'operator_invitation' | 'agronomic_alert' | 'labor_assigned' | 'test';
  subject: string;
  structureName?: string;
  fieldName?: string;
  roleName?: string;
  sentFrom: string;
  status: 'enviado' | 'simulado' | 'error';
  deliveredVia: string;
}

const AUDIT_STORAGE_KEY = 'ht_email_notifications_log';

export function getEmailAuditLog(): EmailAuditLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveEmailAuditEntry(entry: EmailAuditLogEntry) {
  if (typeof window === 'undefined') return;
  try {
    const current = getEmailAuditLog();
    const updated = [entry, ...current.slice(0, 49)]; // conservar últimos 50
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('nucleus:email-sent', { detail: entry }));
  } catch (e) {
    console.warn('No se pudo guardar la entrada de auditoría de email:', e);
  }
}

/**
 * Despacha un correo electrónico de invitación a un operario utilizando el motor en Render
 * con remitente oficial notificaciones@hempc.com.ar
 */
export async function sendOperatorInvitationEmail(
  params: SendOperatorInvitationParams
): Promise<EmailDispatchResult> {
  const engineUrl = getTelemetryEngineUrl();
  const endpoint = `${engineUrl}/api/v1/notifications/email`;
  const timestamp = new Date().toISOString();

  const payload = {
    to_email: params.toEmail.trim(),
    to_name: params.toName.trim(),
    notification_type: 'operator_invitation',
    structure_name: params.structureName,
    field_name: params.fieldName || 'Establecimiento Principal',
    role_name: params.roleName,
    temp_password: params.tempPassword,
    action_url: params.actionUrl || window.location.origin
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      const result: EmailDispatchResult = {
        success: true,
        message: data.message || `Invitación enviada con éxito desde notificaciones@hempc.com.ar a ${params.toEmail}`,
        sentFrom: data.sent_from || 'notificaciones@hempc.com.ar',
        sentTo: data.sent_to || params.toEmail,
        deliveredVia: data.delivered_via || 'smtp',
        timestamp
      };

      saveEmailAuditEntry({
        id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp,
        toEmail: params.toEmail,
        toName: params.toName,
        type: 'operator_invitation',
        subject: `Bienvenida y acceso al equipo • ${params.structureName}`,
        structureName: params.structureName,
        fieldName: params.fieldName,
        roleName: params.roleName,
        sentFrom: result.sentFrom,
        status: result.deliveredVia === 'smtp' ? 'enviado' : 'simulado',
        deliveredVia: result.deliveredVia
      });

      return result;
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Error en servidor HTTP ${res.status}`);
    }
  } catch (err: any) {
    console.warn('Fallo en despacho remoto de email, registrando en log de auditoría local:', err);
    const result: EmailDispatchResult = {
      success: true,
      message: `Despacho registrado hacia ${params.toEmail} desde notificaciones@hempc.com.ar`,
      sentFrom: 'notificaciones@hempc.com.ar',
      sentTo: params.toEmail,
      deliveredVia: 'simulated_local',
      timestamp
    };

    saveEmailAuditEntry({
      id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      toEmail: params.toEmail,
      toName: params.toName,
      type: 'operator_invitation',
      subject: `Alta de Operario • ${params.structureName}`,
      structureName: params.structureName,
      fieldName: params.fieldName,
      roleName: params.roleName,
      sentFrom: result.sentFrom,
      status: 'simulado',
      deliveredVia: 'simulated_local'
    });

    return result;
  }
}

/**
 * Despacha una alerta agronómica crítica por correo electrónico
 */
export async function sendAgronomicAlertEmail(
  params: SendAgronomicAlertParams
): Promise<EmailDispatchResult> {
  const engineUrl = getTelemetryEngineUrl();
  const endpoint = `${engineUrl}/api/v1/notifications/email`;
  const timestamp = new Date().toISOString();

  const payload = {
    to_email: params.toEmail.trim(),
    to_name: params.toName.trim(),
    notification_type: 'agronomic_alert',
    alert_title: params.alertTitle,
    plot_name: params.plotName,
    alert_details: params.alertDetails,
    action_url: params.actionUrl || `${window.location.origin}/#/agro40`
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      const result: EmailDispatchResult = {
        success: true,
        message: data.message || `Alerta despachada a ${params.toEmail}`,
        sentFrom: data.sent_from || 'notificaciones@hempc.com.ar',
        sentTo: data.sent_to || params.toEmail,
        deliveredVia: data.delivered_via || 'smtp',
        timestamp
      };

      saveEmailAuditEntry({
        id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp,
        toEmail: params.toEmail,
        toName: params.toName,
        type: 'agronomic_alert',
        subject: `⚠️ ALERTA CRÍTICA: ${params.alertTitle}`,
        structureName: params.plotName,
        fieldName: params.plotName,
        sentFrom: result.sentFrom,
        status: result.deliveredVia === 'smtp' ? 'enviado' : 'simulado',
        deliveredVia: result.deliveredVia
      });

      return result;
    }
  } catch (e) {
    console.warn('Error enviando alerta agronómica por correo:', e);
  }

  const result: EmailDispatchResult = {
    success: true,
    message: `Alerta registrada hacia ${params.toEmail} desde notificaciones@hempc.com.ar`,
    sentFrom: 'notificaciones@hempc.com.ar',
    sentTo: params.toEmail,
    deliveredVia: 'simulated_local',
    timestamp
  };

  saveEmailAuditEntry({
    id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
    toEmail: params.toEmail,
    toName: params.toName,
    type: 'agronomic_alert',
    subject: `⚠️ ALERTA: ${params.alertTitle}`,
    sentFrom: result.sentFrom,
    status: 'simulado',
    deliveredVia: 'simulated_local'
  });

  return result;
}

/**
 * Envía un correo de prueba de conectividad desde notificaciones@hempc.com.ar
 */
export async function sendTestNotificationEmail(
  targetEmail: string,
  targetName: string = 'Administrador'
): Promise<EmailDispatchResult> {
  return sendOperatorInvitationEmail({
    toEmail: targetEmail,
    toName: targetName,
    structureName: 'Red Cooperativa Nucleus • Verificación',
    fieldName: 'Establecimiento Demostrativo Central',
    roleName: 'Auditor de Comunicaciones',
    tempPassword: 'demo-' + Math.random().toString(36).substring(2, 8).toUpperCase()
  });
}

/**
 * Consulta el estado y configuración del despachador de emails en el backend
 */
export async function checkEmailServiceStatus(): Promise<{
  configured: boolean;
  sender: string;
  host: string;
  port: number;
  engineUrl: string;
}> {
  const engineUrl = getTelemetryEngineUrl();
  try {
    const res = await fetch(`${engineUrl}/api/v1/notifications/status`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      return {
        configured: Boolean(data.smtp_configured),
        sender: data.sender || 'notificaciones@hempc.com.ar',
        host: data.host || 'hempc.com.ar',
        port: data.port || 587,
        engineUrl
      };
    }
  } catch (e) {
    // backend sleeping or local fallback
  }
  return {
    configured: false,
    sender: 'notificaciones@hempc.com.ar',
    host: 'hempc.com.ar',
    port: 587,
    engineUrl
  };
}
