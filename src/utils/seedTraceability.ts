import { Plot, SeedBatch } from '../../types';

export type SeedMassUnit = 'gr' | 'kg' | 'tn';

export interface FormattedSeedLoad {
  rawValue: number;
  unit: SeedMassUnit;
  unitLabel: 'gr' | 'kg' | 'T';
  kg: number;
  gr: number;
  tn: number;
  kgFormatted: string;
  grFormatted: string;
  tnFormatted: string;
  primaryDisplay: string;
  compactDisplay: string;
  fullTriUnitDisplay: string;
}

/**
 * Convierte cualquier valor y unidad ('gr' | 'kg' | 'tn') a kilogramos exactos (6 decimales).
 */
export function convertSeedMassToKg(value?: number | null, unit?: string | null): number {
  const num = Number(value || 0);
  if (isNaN(num) || num <= 0) return 0;
  const u = (unit || 'gr').toLowerCase();
  if (u === 'gr' || u === 'g') return Number((num / 1000).toFixed(6));
  if (u === 'tn' || u === 't') return Number((num * 1000).toFixed(6));
  return Number(num.toFixed(6));
}

/**
 * Convierte kilogramos a la unidad destino ('gr' | 'kg' | 'tn').
 */
export function convertKgToUnit(kg: number, targetUnit: SeedMassUnit): number {
  const cleanKg = Number(kg || 0);
  if (targetUnit === 'gr') return Number((cleanKg * 1000).toFixed(2));
  if (targetUnit === 'tn') return Number((cleanKg / 1000).toFixed(6));
  return Number(cleanKg.toFixed(4));
}

/**
 * Formatea la carga de semilla de una parcela en T / Kilos / Gramos para trazabilidad y escaneo QR/Barcode.
 */
export function formatPlotSeedLoad(
  plotOrVal?: Partial<Plot> | number | null,
  fallbackParamsOrUnit?: URLSearchParams | SeedMassUnit | string
): FormattedSeedLoad {
  const isNumericCall = typeof plotOrVal === 'number';
  const plotObj: Partial<Plot> | null | undefined = isNumericCall ? null : plotOrVal;
  const fallbackParams = fallbackParamsOrUnit instanceof URLSearchParams ? fallbackParamsOrUnit : undefined;
  const explicitUnit = typeof fallbackParamsOrUnit === 'string' ? (fallbackParamsOrUnit as SeedMassUnit) : undefined;

  let rawVal = isNumericCall ? Number(plotOrVal || 0) : Number(plotObj?.usedSeedValue ?? 0);
  let rawUnit = (explicitUnit || plotObj?.usedSeedUnit || 'gr') as SeedMassUnit;

  if ((!rawVal || rawVal <= 0) && fallbackParams) {
    const paramVal = Number(fallbackParams.get('seedLoadVal') || fallbackParams.get('seedGr') || 0);
    const paramUnit = (fallbackParams.get('seedLoadUnit') || 'gr') as SeedMassUnit;
    if (paramVal > 0) {
      rawVal = paramVal;
      rawUnit = paramUnit;
    }
  }

  // Si una parcela histórica o virtual no tiene valor explícito, inferir según establecimiento o superficie
  if (!rawVal || rawVal <= 0) {
    const locId = String(plotObj?.locationId || '');
    if (locId === '35ece4ca-6d58-496d-a045-65fe8c50a216') {
      rawVal = 75;
      rawUnit = 'gr';
    } else if (locId === 'fc1fedd0-1404-47a0-89d3-cc5d774ce848') {
      rawVal = 50;
      rawUnit = 'gr';
    } else if (locId === 'f9235100-cd67-4f65-9ba1-303e7cc5a063') {
      rawVal = 45;
      rawUnit = 'gr';
    }
  }

  const kg = convertSeedMassToKg(rawVal, rawUnit);
  const gr = Math.round(kg * 1000);
  const tn = Number((kg / 1000).toFixed(6));

  const kgFormatted = `${kg.toFixed(3)} kg`;
  const grFormatted = `${gr.toLocaleString('es-AR')} gr`;
  const tnFormatted = `${tn.toFixed(6)} T`;

  const unitLabel: 'gr' | 'kg' | 'T' = rawUnit === 'tn' ? 'T' : rawUnit === 'kg' ? 'kg' : 'gr';

  let primaryDisplay = grFormatted;
  if (rawUnit === 'tn') {
    primaryDisplay = `${rawVal} T (${kgFormatted} · ${grFormatted})`;
  } else if (rawUnit === 'kg') {
    primaryDisplay = `${Number(rawVal).toFixed(3)} kg (${grFormatted})`;
  } else {
    primaryDisplay = `${gr} gr (${kgFormatted})`;
  }

  const compactDisplay =
    rawUnit === 'tn'
      ? `${rawVal} T (${kg.toFixed(2)} kg)`
      : rawUnit === 'kg'
      ? `${kg.toFixed(3)} kg (${gr} gr)`
      : `${gr} gr (${kg.toFixed(3)} kg)`;

  const fullTriUnitDisplay = `${gr} gr · ${kg.toFixed(3)} kg · ${tn.toFixed(6)} T`;

  return {
    rawValue: rawVal,
    unit: rawUnit,
    unitLabel,
    kg,
    gr,
    tn,
    kgFormatted,
    grFormatted,
    tnFormatted,
    primaryDisplay,
    compactDisplay,
    fullTriUnitDisplay
  };
}

/**
 * Formatea una masa en kilogramos de un Lote de Semilla en kg (3 decimales), gramos y toneladas.
 */
export function formatBatchMassKg(kgValue?: number | null): {
  kg: number;
  gr: number;
  tn: number;
  kgStr: string;
  grStr: string;
  tnStr: string;
  kgFormatted: string;
  grFormatted: string;
  tnFormatted: string;
  combinedKgGr: string;
  fullTriUnit: string;
} {
  const kg = Number(Number(kgValue || 0).toFixed(3));
  const gr = Math.round(kg * 1000);
  const tn = Number((kg / 1000).toFixed(6));
  const kgStr = `${kg.toFixed(3)} kg`;
  const grStr = `${gr.toLocaleString('es-AR')} gr`;
  const tnStr = `${tn.toFixed(6)} T`;
  return {
    kg,
    gr,
    tn,
    kgStr,
    grStr,
    tnStr,
    kgFormatted: kgStr,
    grFormatted: grStr,
    tnFormatted: tnStr,
    combinedKgGr: `${kgStr} (${grStr})`,
    fullTriUnit: `${kgStr} · ${grStr} · ${tnStr}`
  };
}

/**
 * Obtiene el código de Lote Madre de Semilla limpio (sin el sufijo de remito -REC-).
 */
export function getMotherSeedLotCode(batch?: Partial<SeedBatch> | null, fallback = 'FUT-83-25-HEM'): string {
  if (!batch) return fallback;
  if (batch.certificationNumber) return batch.certificationNumber;
  const code = batch.batchCode || fallback;
  return code.includes('-REC-') ? code.split('-REC-')[0] : code;
}
