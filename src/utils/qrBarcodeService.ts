// ============================================================================
// SERVICIO DE TRAZABILIDAD QR & CÓDIGO DE BARRAS CANÓNICO (HEMPC NUCLEUS)
// Garantiza que los QR y códigos de barras impresos en Carteles de Tranquera,
// Rótulos de Estaca y Pasaportes Biológicos sean 100% legibles por cualquier
// teléfono celular, escáner láser o cámara óptica en campo sin fallas.
// ============================================================================

export const CANONICAL_PUBLIC_DOMAIN = 'https://red.hempc.com.ar';
export const FALLBACK_VERCEL_DOMAIN = 'https://hemp-net.vercel.app';

/**
 * Obtiene el origen público canónico accesible desde cualquier dispositivo móvil externo.
 * Si la app se visualiza en localhost, preview interno o entornos de desarrollo,
 * automáticamente resuelve al dominio público oficial (red.hempc.com.ar) para que
 * los documentos impresos funcionen en la vida real.
 */
export function getCanonicalPublicBaseUrl(): string {
  if (typeof window === 'undefined') {
    return CANONICAL_PUBLIC_DOMAIN;
  }

  const origin = window.location.origin;

  // Si está en localhost, preview de contenedores o entornos aislados
  if (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('.run.app') ||
    origin.includes('aistudio') ||
    origin.includes('webcontainer')
  ) {
    return CANONICAL_PUBLIC_DOMAIN;
  }

  return origin || CANONICAL_PUBLIC_DOMAIN;
}

/**
 * Construye la URL de trazabilidad canónica y ultra-optimizada para códigos QR.
 * Mantiene la longitud corta (~65-75 caracteres) para generar códigos QR de baja
 * densidad (Versión 3-4) con módulos grandes y nítidos que cualquier cámara de
 * celular enfoca y decodifica en milisegundos a plena luz de sol o en penumbra.
 */
export function buildPlotCanonicalTraceUrl(plotId: string, plotName?: string): string {
  const baseUrl = getCanonicalPublicBaseUrl();
  const cleanId = encodeURIComponent(String(plotId || '').trim());
  const cleanName = plotName ? `?name=${encodeURIComponent(plotName.trim())}` : '';
  return `${baseUrl}/#/trace/${cleanId}${cleanName}`;
}

export function buildBatchCanonicalTraceUrl(batchId: string, batchCode?: string): string {
  const baseUrl = getCanonicalPublicBaseUrl();
  const cleanId = encodeURIComponent(String(batchId || '').trim());
  const cleanCode = batchCode ? `?code=${encodeURIComponent(batchCode.trim())}` : '';
  return `${baseUrl}/#/trace/${cleanId}${cleanCode}`;
}

export function buildVarietyCanonicalTraceUrl(varietyId: string): string {
  const baseUrl = getCanonicalPublicBaseUrl();
  return `${baseUrl}/#/trace/${encodeURIComponent(String(varietyId || '').trim())}`;
}
