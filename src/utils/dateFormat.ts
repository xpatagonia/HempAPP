/**
 * Utilidades de formato de fecha oficial para Argentina (DD/MM/AAAA)
 * Evita cualquier ambigüedad con el formato anglosajón (MM/DD/YYYY) o ISO crudo (YYYY-MM-DD).
 */

export const CAMPAIGN_2526_CLOSE_DATE_ISO = '2026-04-01'; // 01/04/2026 (1 de Abril de 2026)
export const CAMPAIGN_2526_CLOSE_DATE_AR = '01/04/2026';

/**
 * Convierte una fecha ISO ('YYYY-MM-DD' o 'YYYY-MM-DDTHH:mm:ss...') al formato argentino 'DD/MM/AAAA'.
 * Si ya está en formato DD/MM/AAAA, la normaliza con ceros a la izquierda.
 */
export function formatDateAr(dateInput?: string | Date | null, fallback = '-'): string {
  if (!dateInput) return fallback;

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return fallback;
    const d = String(dateInput.getDate()).padStart(2, '0');
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const y = dateInput.getFullYear();
    return `${d}/${m}/${y}`;
  }

  const raw = String(dateInput).trim();
  if (!raw) return fallback;

  // Caso 1: ISO 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:mm...'
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  // Caso 2: Ya viene como 'D/M/YYYY' o 'DD/MM/YYYY'
  const arMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (arMatch) {
    const [, day, month, year] = arMatch;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  // Fallback seguro intentando parsear Date
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getUTCDate()).padStart(2, '0');
    const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const y = parsed.getUTCFullYear();
    return `${d}/${m}/${y}`;
  }

  return raw;
}

/**
 * Convierte una cadena ingresada por el usuario en formato argentino ('D/M/AAAA' o 'DD/MM/AAAA')
 * a formato ISO estándar ('YYYY-MM-DD') para almacenamiento en Supabase PostgreSQL.
 */
export function parseArDateToIso(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  // Si ya es YYYY-MM-DD válido
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${String(y)}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Formato argentino DD/MM/AAAA o D/M/AAAA (con / o -)
  const arMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (arMatch) {
    const d = Number(arMatch[1]);
    const m = Number(arMatch[2]);
    const y = Number(arMatch[3]);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const check = new Date(Date.UTC(y, m - 1, d));
      if (
        check.getUTCFullYear() === y &&
        check.getUTCMonth() === m - 1 &&
        check.getUTCDate() === d
      ) {
        return `${String(y)}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }

  return null;
}
