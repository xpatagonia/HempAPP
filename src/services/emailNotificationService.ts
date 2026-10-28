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


export interface SendPasswordResetParams {
  toEmail: string;
  toName: string;
  tempPassword: string;
  actionUrl?: string;
}

export interface SendUserProfileWelcomeParams {
  toEmail: string;
  toName: string;
  roleName: string;
  organizationName?: string;
  tempPassword: string;
  actionUrl?: string;
}

export interface SendAgronomicAlertParams {
  toEmail: string;
  toName: string;
  alertTitle: string;
  plotName?: string;
  alertDetails: string;
  severity?: "Crítica" | "Advertencia" | "Informativa" | "Alto" | "Moderado" | "Bajo";
  actionUrl?: string;
  extraData?: Record<string, any>;
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
const RESEND_KEY_STORAGE = 'ht_resend_api_key';
const RESEND_FROM_STORAGE = 'ht_resend_from_email';

export function getStoredResendConfig(): { apiKey: string; fromEmail: string } {
  if (typeof window === 'undefined') return { apiKey: '', fromEmail: 'HempC Nucleus <notificaciones@hempc.com.ar>' };
  return {
    apiKey: localStorage.getItem(RESEND_KEY_STORAGE) || (import.meta.env.VITE_RESEND_API_KEY as string) || '',
    fromEmail: localStorage.getItem(RESEND_FROM_STORAGE) || 'HempC Nucleus <notificaciones@hempc.com.ar>'
  };
}

export function saveStoredResendConfig(apiKey: string, fromEmail?: string) {
  if (typeof window === 'undefined') return;
  if (apiKey.trim()) {
    localStorage.setItem(RESEND_KEY_STORAGE, apiKey.trim());
  } else {
    localStorage.removeItem(RESEND_KEY_STORAGE);
  }
  if (fromEmail && fromEmail.trim()) {
    localStorage.setItem(RESEND_FROM_STORAGE, fromEmail.trim());
  }
}

const isRealDelivery = (via?: string): boolean => {
  return via === 'resend_https' || via === 'smtp';
};

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
 * Despacha un correo electrónico de invitación a un operario utilizando el motor híbrido en Render (Resend HTTPS / SMTP)
 * con remitente oficial notificaciones@hempc.com.ar
 */
export async function sendOperatorInvitationEmail(
  params: SendOperatorInvitationParams
): Promise<EmailDispatchResult> {
  const engineUrl = getTelemetryEngineUrl();
  const endpoint = `${engineUrl}/api/v1/notifications/email`;
  const timestamp = new Date().toISOString();
  const resendCfg = getStoredResendConfig();

  const payload = {
    to_email: params.toEmail.trim(),
    to_name: params.toName.trim(),
    notification_type: 'operator_invitation',
    structure_name: params.structureName,
    field_name: params.fieldName || 'Establecimiento Principal',
    role_name: params.roleName,
    temp_password: params.tempPassword,
    action_url: params.actionUrl || window.location.origin,
    extra_data: resendCfg.apiKey
      ? { resend_api_key: resendCfg.apiKey, resend_from: resendCfg.fromEmail }
      : undefined
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
        deliveredVia: data.delivered_via || 'resend_https',
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
        status: isRealDelivery(result.deliveredVia) ? 'enviado' : 'simulado',
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
 * Despacha una alerta agronómica crítica por correo electrónico (Arquitectura Híbrida Render Python + Resend HTTPS)
 */
export async function sendAgronomicAlertEmail(
  params: SendAgronomicAlertParams
): Promise<EmailDispatchResult> {
  const engineUrl = getTelemetryEngineUrl();
  const endpoint = `${engineUrl}/api/v1/notifications/email`;
  const timestamp = new Date().toISOString();
  const resendCfg = getStoredResendConfig();

  const payload = {
    to_email: params.toEmail.trim(),
    to_name: params.toName.trim(),
    notification_type: 'agronomic_alert',
    alert_title: params.alertTitle,
    plot_name: params.plotName,
    alert_details: params.alertDetails,
    action_url: params.actionUrl || `${window.location.origin}/#/agro40`,
    extra_data: {
      severity: params.severity || 'Crítica',
      ...(params.extraData || {}),
      ...(resendCfg.apiKey ? { resend_api_key: resendCfg.apiKey, resend_from: resendCfg.fromEmail } : {})
    }
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
        deliveredVia: data.delivered_via || 'resend_https',
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
        status: isRealDelivery(result.deliveredVia) ? 'enviado' : 'simulado',
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
    structureName: 'Red Cooperativa Nucleus • Verificación Híbrida (Render + Resend HTTPS)',
    fieldName: 'Establecimiento Demostrativo Central',
    roleName: 'Auditor de Comunicaciones & IoT',
    tempPassword: 'demo-' + Math.random().toString(36).substring(2, 8).toUpperCase()
  });
}

/**
 * Consulta el estado y configuración del despachador híbrido en el backend Python (Render)
 */
export async function checkEmailServiceStatus(): Promise<{
  configured: boolean;
  resendConfigured: boolean;
  provider: string;
  architecture: string;
  iotAiEngine: string;
  engineOnline: boolean;
  sender: string;
  host: string;
  port: number;
  engineUrl: string;
}> {
  const engineUrl = getTelemetryEngineUrl();
  const localResend = getStoredResendConfig();
  try {
    const res = await fetch(`${engineUrl}/api/v1/notifications/status`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      const hasResend = Boolean(data.resend_configured || localResend.apiKey);
      return {
        configured: Boolean(hasResend || data.smtp_configured),
        resendConfigured: hasResend,
        provider: hasResend ? 'resend_https' : (data.provider || 'simulated'),
        architecture: data.architecture || 'hybrid_render_iot_resend_https',
        iotAiEngine: data.iot_ai_engine || 'active',
        engineOnline: true,
        sender: data.sender || 'notificaciones@hempc.com.ar',
        host: hasResend ? 'api.resend.com (HTTPS:443)' : (data.host || 'mail.hempc.com.ar'),
        port: hasResend ? 443 : (data.port || 2525),
        engineUrl
      };
    }
  } catch (e) {
    // backend waking up or local fallback
  }
  const hasLocalResend = Boolean(localResend.apiKey);
  return {
    configured: hasLocalResend,
    resendConfigured: hasLocalResend,
    provider: hasLocalResend ? 'resend_https' : 'waking_up',
    architecture: 'hybrid_render_iot_resend_https',
    iotAiEngine: 'standby',
    engineOnline: false,
    sender: 'notificaciones@hempc.com.ar',
    host: hasLocalResend ? 'api.resend.com (HTTPS:443)' : 'hempapp.onrender.com',
    port: 443,
    engineUrl
  };
}

/**
 * Envía un correo de recuperación de contraseña con clave provisoria
 */
export async function sendPasswordResetEmail(
  params: SendPasswordResetParams
): Promise<EmailDispatchResult> {
  const timestamp = new Date().toISOString();
  const engineUrl = getTelemetryEngineUrl();
  const endpoint = `${engineUrl}/api/v1/notifications/email`;
  const resendCfg = getStoredResendConfig();

  const payload = {
    to_email: params.toEmail.trim(),
    to_name: params.toName.trim(),
    notification_type: "password_reset",
    temp_password: params.tempPassword,
    action_url: params.actionUrl || window.location.origin,
    extra_data: resendCfg.apiKey
      ? { resend_api_key: resendCfg.apiKey, resend_from: resendCfg.fromEmail }
      : undefined
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      const result: EmailDispatchResult = {
        success: true,
        message: data.message || `Instrucciones de recuperación enviadas a ${params.toEmail}`,
        sentFrom: data.sent_from || "notificaciones@hempc.com.ar",
        sentTo: data.sent_to || params.toEmail,
        deliveredVia: data.delivered_via || "resend_https",
        timestamp
      };

      saveEmailAuditEntry({
        id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp,
        toEmail: params.toEmail,
        toName: params.toName,
        type: "test",
        subject: "🔐 Restablecimiento de Contraseña • HempC Nucleus",
        sentFrom: result.sentFrom,
        status: isRealDelivery(result.deliveredVia) ? "enviado" : "simulado",
        deliveredVia: result.deliveredVia
      });

      return result;
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Error en servidor HTTP ${res.status}`);
    }
  } catch (err: any) {
    console.warn("Fallo en despacho remoto de email de recuperación, guardando en auditoría local:", err);
    const result: EmailDispatchResult = {
      success: true,
      message: `Despacho registrado hacia ${params.toEmail} desde notificaciones@hempc.com.ar`,
      sentFrom: "notificaciones@hempc.com.ar",
      sentTo: params.toEmail,
      deliveredVia: "simulated_local",
      timestamp
    };

    saveEmailAuditEntry({
      id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      toEmail: params.toEmail,
      toName: params.toName,
      type: "test",
      subject: "🔐 Restablecimiento de Contraseña • HempC Nucleus",
      sentFrom: result.sentFrom,
      status: "simulado",
      deliveredVia: "simulated_local"
    });

    return result;
  }
}

/**
 * Envía correo de bienvenida y credenciales al crear un nuevo perfil de equipo
 */
export async function sendUserProfileWelcomeEmail(
  params: SendUserProfileWelcomeParams
): Promise<EmailDispatchResult> {
  const timestamp = new Date().toISOString();
  const engineUrl = getTelemetryEngineUrl();
  const endpoint = `${engineUrl}/api/v1/notifications/email`;
  const resendCfg = getStoredResendConfig();

  const payload = {
    to_email: params.toEmail.trim(),
    to_name: params.toName.trim(),
    notification_type: "user_welcome",
    role_name: params.roleName,
    structure_name: params.organizationName || "Red Cooperativa Nucleus",
    temp_password: params.tempPassword,
    action_url: params.actionUrl || window.location.origin,
    extra_data: resendCfg.apiKey
      ? { resend_api_key: resendCfg.apiKey, resend_from: resendCfg.fromEmail }
      : undefined
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      const result: EmailDispatchResult = {
        success: true,
        message: data.message || `Credenciales de acceso enviadas a ${params.toEmail}`,
        sentFrom: data.sent_from || "notificaciones@hempc.com.ar",
        sentTo: data.sent_to || params.toEmail,
        deliveredVia: data.delivered_via || "resend_https",
        timestamp
      };

      saveEmailAuditEntry({
        id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp,
        toEmail: params.toEmail,
        toName: params.toName,
        type: "operator_invitation",
        subject: `🌿 Alta de Perfil y Credenciales • ${params.organizationName || "HempC Nucleus"}`,
        roleName: params.roleName,
        structureName: params.organizationName,
        sentFrom: result.sentFrom,
        status: isRealDelivery(result.deliveredVia) ? "enviado" : "simulado",
        deliveredVia: result.deliveredVia
      });

      return result;
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Error en servidor HTTP ${res.status}`);
    }
  } catch (err: any) {
    console.warn("Fallo en despacho de bienvenida de usuario:", err);
    const result: EmailDispatchResult = {
      success: true,
      message: `Despacho registrado hacia ${params.toEmail} desde notificaciones@hempc.com.ar`,
      sentFrom: "notificaciones@hempc.com.ar",
      sentTo: params.toEmail,
      deliveredVia: "simulated_local",
      timestamp
    };

    saveEmailAuditEntry({
      id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      toEmail: params.toEmail,
      toName: params.toName,
      type: "operator_invitation",
      subject: `🌿 Alta de Perfil y Credenciales • ${params.organizationName || "HempC Nucleus"}`,
      roleName: params.roleName,
      structureName: params.organizationName,
      sentFrom: result.sentFrom,
      status: "simulado",
      deliveredVia: "simulated_local"
    });

    return result;
  }
}
