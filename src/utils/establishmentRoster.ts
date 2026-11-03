/**
 * Servicio Centralizado de Nómina y Aislamiento por Establecimiento / Socio de la Red.
 * Garantiza que ningún usuario, operario o técnico aparezca en parcelas, documentos de siembra,
 * actas de cierre de cosecha o trazabilidad pública fuera de su establecimiento habilitado.
 *
 * Mapeo oficial auditado:
 * 1. INTA Hilario Ascasubi (locId: "1766450631873", clientId: "94f8da54-90dc-44e7-b9df-e9b6c2be5266")
 *    - Responsable Siembra / Muestreo / Cosecha: Matias QUINTANA
 *    - Dirección Técnica / Fiscalización: Ing. Agr. Julian PIZARRO (o Gastón Barea M.)
 *    - Joaquín Arezo queda ESTRICTAMENTE EXCLUIDO de este establecimiento.
 *
 * 2. Chacra La Regina - Trelew (locId: "1766444697119", clientId: "c8f58b04-bb23-4523-8cfb-6f81a175df38")
 *    - Propietario / Siembra / Muestreo / Cosecha: Ricardo La Regina
 *    - Dirección Técnica: Ing. Agr. Gastón BAREA M.
 *    - Joaquín Arezo queda ESTRICTAMENTE EXCLUIDO de este establecimiento.
 *
 * 3. CAP Medio Ambiental / Centro Ambiental Patagónico - Puerto Madryn (locId: "1766471895190", clientId: "06585f64-6d04-4567-a23f-a7f046ee06b4")
 *    - Titular: Salvador MERELLE
 *    - Operador de Campo / Siembra / Muestreo / Cosecha: Joaquin AREZO
 *    - Dirección Técnica: Ing. Agr. Gastón BAREA M.
 *
 * 4. BIOC Planta Central / Parque Industrial Trelew (locId: "1767119987079")
 *    - Custodia / Dirección Técnica: Gastón BAREA M. / Andrea Andrade
 */

export interface EstablishmentRoster {
  locationId: string;
  clientId: string;
  name: string;
  ownerName: string;
  sowerName: string;
  samplerName: string;
  samplerMatricula: string;
  technicalName: string;
  technicalMatricula: string;
  harvesterName: string;
  authorizedUserIds: string[];
  authorizedNames: string[];
}

export const ESTABLISHMENTS_ROSTER: Record<string, EstablishmentRoster> = {
  // INTA Hilario Ascasubi
  '1766450631873': {
    locationId: '1766450631873',
    clientId: '94f8da54-90dc-44e7-b9df-e9b6c2be5266',
    name: 'EEA INTA Hilario Ascasubi',
    ownerName: 'Matias QUINTANA',
    sowerName: 'Matias QUINTANA',
    samplerName: 'Matias QUINTANA',
    samplerMatricula: 'TEC-MUESTREO-ISTA-108 · INASE #408',
    technicalName: 'Ing. Agr. Julian PIZARRO',
    technicalMatricula: 'MP-AGRO-1492 CH · CIAFBA 14.892',
    harvesterName: 'Matias QUINTANA',
    authorizedUserIds: ['1766450364369', '1766683825719', '1766442369713'],
    authorizedNames: ['Matias QUINTANA', 'Matías QUINTANA', 'Julian PIZARRO', 'Julián PIZARRO', 'Ing. Agr. Julian PIZARRO', 'Gastón BAREA M.', 'Gaston BAREA']
  },
  // Chacra La Regina (Trelew)
  '1766444697119': {
    locationId: '1766444697119',
    clientId: 'c8f58b04-bb23-4523-8cfb-6f81a175df38',
    name: 'Chacra La Regina (Trelew)',
    ownerName: 'Ricardo La Regina',
    sowerName: 'Ricardo La Regina',
    samplerName: 'Ricardo La Regina',
    samplerMatricula: 'Muestreador Habilitado INASE #312',
    technicalName: 'Ing. Agr. Gastón BAREA M.',
    technicalMatricula: 'MP CIAFBA 14.892 · CPIA 18.204',
    harvesterName: 'Ricardo La Regina',
    authorizedUserIds: ['1766443862879', '1766442369713'],
    authorizedNames: ['Ricardo La Regina', 'Gastón BAREA M.', 'Gaston BAREA']
  },
  // CAP Centro Ambiental Patagónico / Medio Ambiental (Puerto Madryn)
  '1766471895190': {
    locationId: '1766471895190',
    clientId: '06585f64-6d04-4567-a23f-a7f046ee06b4',
    name: 'CAP Centro Ambiental Patagónico (Puerto Madryn)',
    ownerName: 'Salvador MERELLE',
    sowerName: 'Joaquin AREZO',
    samplerName: 'Joaquin AREZO',
    samplerMatricula: 'Operador Certificado CAP-HEMPC',
    technicalName: 'Ing. Agr. Gastón BAREA M.',
    technicalMatricula: 'MP CIAFBA 14.892 · CPIA 18.204',
    harvesterName: 'Joaquin AREZO',
    authorizedUserIds: ['1767102643518', '1766471712087', '1766442369713'],
    authorizedNames: ['Salvador MERELLE', 'Salvador Merele', 'Joaquin AREZO', 'Joaquín AREZO', 'Gastón BAREA M.', 'Gaston BAREA']
  },
  // BIOC Parque Industrial Trelew
  '1767119987079': {
    locationId: '1767119987079',
    clientId: 'central-bioc',
    name: 'BIOC Parque Industrial Trelew',
    ownerName: 'Gastón BAREA M.',
    sowerName: 'Gastón BAREA M.',
    samplerName: 'Gastón BAREA M.',
    samplerMatricula: 'Dirección Técnica Central PatagonianC',
    technicalName: 'Ing. Agr. Gastón BAREA M.',
    technicalMatricula: 'MP CIAFBA 14.892 · CPIA 18.204',
    harvesterName: 'Gastón BAREA M.',
    authorizedUserIds: ['1766442369713', '1792513420994'],
    authorizedNames: ['Gastón BAREA M.', 'Gaston BAREA', 'Andrea Andrade']
  }
};

/**
 * Normaliza cadenas de nombres para comparaciones robustas sin tildes ni caracteres extra
 */
export function normalizePersonName(name?: string | null): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Obtiene la nómina oficial asociada al establecimiento según locationId o clientId
 */
export function getEstablishmentRoster(locationId?: string | null, clientId?: string | null): EstablishmentRoster {
  const locIdStr = String(locationId || '').trim();
  if (locIdStr && ESTABLISHMENTS_ROSTER[locIdStr]) {
    return ESTABLISHMENTS_ROSTER[locIdStr];
  }

  const clientStr = String(clientId || '').trim();
  if (clientStr) {
    const matchByClient = Object.values(ESTABLISHMENTS_ROSTER).find(r => r.clientId === clientStr);
    if (matchByClient) return matchByClient;
  }

  // Fallback seguro a Dirección Técnica de la Cooperativa (nunca a un socio productor particular)
  return {
    locationId: locIdStr || 'default',
    clientId: clientStr || 'default',
    name: 'Establecimiento Rural de la Red',
    ownerName: 'Cooperativa PatagonianC LTDA',
    sowerName: 'Responsable Operativo Autorizado',
    samplerName: 'Muestreador Habilitado INASE',
    samplerMatricula: 'INASE / ISTA',
    technicalName: 'Ing. Agr. Gastón BAREA M.',
    technicalMatricula: 'MP CIAFBA 14.892 · CPIA 18.204',
    harvesterName: 'Responsable Operativo Autorizado',
    authorizedUserIds: ['1766442369713'],
    authorizedNames: ['Gastón BAREA M.', 'Gaston BAREA']
  };
}

/**
 * Verifica si un usuario (por nombre o ID) está autorizado para operar en un establecimiento dado.
 * Joaquin Arezo está ESTRICTAMENTE limitado a CAP Centro Ambiental Patagónico (Puerto Madryn).
 */
export function isUserAuthorizedForEstablishment(
  personNameOrId?: string | null,
  locationId?: string | null,
  clientId?: string | null
): boolean {
  if (!personNameOrId) return false;
  const clean = normalizePersonName(personNameOrId);
  if (!clean) return false;

  const locIdStr = String(locationId || '').trim();
  const isCapMadryn = locIdStr === '1766471895190' || clientId === '06585f64-6d04-4567-a23f-a7f046ee06b4';

  // Regla inviolable: Joaquin Arezo / 1766471712087 SOLO puede estar en CAP Puerto Madryn
  const isJoaquinArezo = clean.includes('arezo') || clean.includes('joaquin') || personNameOrId === '1766471712087';
  if (isJoaquinArezo && !isCapMadryn) {
    return false;
  }

  // Si es un admin transversal de la cooperativa central, tiene acceso
  const isCentralAdmin = clean.includes('barea') || clean.includes('andrade') || personNameOrId === '1766442369713' || personNameOrId === '1792513420994';
  if (isCentralAdmin) return true;

  const roster = getEstablishmentRoster(locationId, clientId);
  return roster.authorizedNames.some(authName => {
    const authClean = normalizePersonName(authName);
    return clean === authClean || clean.includes(authClean) || authClean.includes(clean);
  }) || roster.authorizedUserIds.includes(String(personNameOrId));
}

/**
 * Resuelve y sanitiza la nómina de personal de una parcela para garantizar
 * que ningún operario de otro socio aparezca en rótulos, actas o documentos públicos.
 */
export function resolveSanitizedPlotRoster(
  plot?: {
    locationId?: string | null;
    sowingResponsibleName?: string | null;
    samplingResponsibleName?: string | null;
    technicalResponsibleName?: string | null;
    harvestOperator?: string | null;
    closedBy?: string | null;
  } | null,
  location?: {
    id?: string | null;
    clientId?: string | null;
    name?: string | null;
  } | null
) {
  const effectiveLocId = plot?.locationId || location?.id;
  const effectiveClientId = location?.clientId;
  const roster = getEstablishmentRoster(effectiveLocId, effectiveClientId);

  const rawSower = plot?.sowingResponsibleName;
  const rawSampler = plot?.samplingResponsibleName;
  const rawTech = plot?.technicalResponsibleName;
  const rawHarvester = plot?.harvestOperator;

  const sower = (rawSower && isUserAuthorizedForEstablishment(rawSower, effectiveLocId, effectiveClientId))
    ? rawSower
    : roster.sowerName;

  const sampler = (rawSampler && isUserAuthorizedForEstablishment(rawSampler, effectiveLocId, effectiveClientId))
    ? rawSampler
    : roster.samplerName;

  const tech = (rawTech && isUserAuthorizedForEstablishment(rawTech, effectiveLocId, effectiveClientId))
    ? rawTech
    : roster.technicalName;

  const harvester = (rawHarvester && isUserAuthorizedForEstablishment(rawHarvester, effectiveLocId, effectiveClientId))
    ? rawHarvester
    : roster.harvesterName;

  const closedBy = (plot?.closedBy && isUserAuthorizedForEstablishment(plot.closedBy, effectiveLocId, effectiveClientId))
    ? plot.closedBy
    : tech;

  return {
    roster,
    sower,
    sampler,
    samplerMatricula: roster.samplerMatricula,
    tech,
    techMatricula: roster.technicalMatricula,
    harvester,
    closedBy
  };
}
