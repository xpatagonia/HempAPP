import jsPDF from 'jspdf';
import { User, FieldEvent, FieldEventCategory, FieldEventStatus, Location, Client } from '../../types';
import { EVENT_SCHEDULE_ITEMS } from './eventProgramPdfService';

export const OFFICIAL_SEMBRA_EVENT_ID = 'evt-un-dia-de-siembra-2026';

export const CATEGORY_LABELS: Record<FieldEventCategory, string> = {
  jornada_campo: 'Jornada Oficial de Campo',
  visita_programada: 'Visita Técnica Programada',
  diplomatura_practica: 'Práctica Presencial Diplomatura',
  recorrida_institucional: 'Recorrida Institucional / Auditoría'
};

export const STATUS_LABELS: Record<FieldEventStatus, string> = {
  inscripcion_abierta: 'Inscripción Abierta',
  cupo_completo: 'Cupo Completo',
  reprogramado_clima: 'Reprogramado por Clima',
  en_curso: 'En Curso Hoy',
  finalizado: 'Jornada Finalizada'
};

export const DEFAULT_FIELD_EVENTS: FieldEvent[] = [
  {
    id: OFFICIAL_SEMBRA_EVENT_ID,
    slug: 'un-dia-de-siembra',
    title: 'JORNADA OFICIAL: “UN DÍA DE SIEMBRA”',
    subtitle: 'Diplomatura Universitaria en Cáñamo Industrial (UNLZ – UATRE) • Práctica Presencial Módulo 7',
    category: 'jornada_campo',
    date: '2026-11-21',
    dateLabel: 'Sábado 21 de Noviembre • 08:30 a 15:30 hs',
    startTime: '08:30',
    endTime: '15:30',
    venueName: 'Establecimiento La Regina — Chacra La Regina (PatagonianC)',
    locality: 'VIRCH – Trelew, Chubut',
    organizer: 'PatagonianC LTDA & UATRE • UNLZ',
    locationId: '1766444697119',
    clientId: '2b9a277c-1035-4229-be01-e31d6aa871cb',
    isCustomLocation: false,
    address: 'Chacra 23 Parcela 13, Ruta Nacional 3 Km 1462 (Acceso Sur Trelew)',
    coordinates: {
      lat: -43.308362,
      lng: -65.289033
    },
    routeInstructions:
      'Ruta Destacada: Desde la Rotonda de Acceso Sur de Trelew (intersección RN 3 y RP 7), tomar Ruta Nacional 3 hacia el Sur durante 2,8 km hasta el Km 1462. Girar a mano izquierda (Este) por callejón rural señalizado "Chacra 23 / PatagonianC" y avanzar 650 m hasta el Puesto de Acreditación en Tranquera Principal.',
    routeWaypoints: [
      { lat: -43.2855, lng: -65.3052, label: 'Rotonda Acceso Sur Trelew (RN 3)' },
      { lat: -43.3061, lng: -65.2954, label: 'Desvío RN 3 Km 1462 (Acceso Chacra 23)' },
      { lat: -43.308362, lng: -65.289033, label: 'Tranquera Principal • Chacra La Regina' }
    ],
    gatekeeperPhone: '+5492804697193',
    maxCapacity: 120,
    status: 'inscripcion_abierta',
    weatherWarning: 'Actividad a cielo abierto: Se reprograma en caso de mal tiempo (Aviso oficial 24 hs antes).',
    description:
      'Práctica presencial intensiva en 3 lotes diferenciados por propósito (Grano Alimenticio, Cañamiza Industrial Hempcrete y Fibra Textil), calibración de siembra, manejo hídrico en el VIRCH y trazabilidad satelital.',
    ticketPrefix: 'SIEMBRA-21N',
    scheduleItems: EVENT_SCHEDULE_ITEMS,
    createdBy: 'Administración Central HempC',
    createdAt: '2026-10-15'
  },
  {
    id: 'evt-visita-riego-virch-2026',
    slug: 'visita-manejo-hidrico-virch',
    title: 'VISITA PROGRAMADA: MANEJO HÍDRICO Y EMERGENCIA EN LOTES PILOTO',
    subtitle: 'Seguimiento Fenológico BBCH 10-19 y Eficiencia de Riego en Valle Inferior',
    category: 'visita_programada',
    date: '2026-12-05',
    dateLabel: 'Sábado 5 de Diciembre • 09:00 a 13:00 hs',
    startTime: '09:00',
    endTime: '13:00',
    venueName: 'HempC de PatagonianC LTDA — BIOC Parque Industrial TW',
    locality: 'Trelew, Chubut',
    organizer: 'Dirección Técnica HempC & INTA Chubut',
    locationId: '1767119987079',
    clientId: '7503c132-5d7d-48f0-9c0f-7692b1bdf348',
    isCustomLocation: false,
    address: 'Puerto Argentino S/N, Parque Industrial Pesado de Trelew (RN 25)',
    coordinates: {
      lat: -43.25581,
      lng: -65.376921
    },
    routeInstructions:
      'Ruta Destacada: Desde Trelew tomar Ruta Nacional 25 sentido Oeste (hacia Gaiman) hasta el ingreso al Parque Industrial Pesado. Doblar por Av. Principal y continuar por Calle Puerto Argentino S/N hasta la Planta y Predio Experimental BIOC.',
    routeWaypoints: [
      { lat: -43.2512, lng: -65.362, label: 'Ingreso RN 25 Parque Industrial Trelew' },
      { lat: -43.2542, lng: -65.3745, label: 'Acceso Calle Puerto Argentino' },
      { lat: -43.25581, lng: -65.376921, label: 'Predio BIOC Parque Industrial TW' }
    ],
    gatekeeperPhone: '+5492804697193',
    maxCapacity: 45,
    status: 'inscripcion_abierta',
    weatherWarning: 'Concurrir con calzado de seguridad de campo. Acreditación obligatoria con DNI en tranquera.',
    description:
      'Visita técnica programada para evaluación de uniformidad de emergencia, lámina de riego acumulada, telemetría de humedad edáfica y control preventivo de malezas.',
    ticketPrefix: 'VISITA-05D',
    scheduleItems: [
      {
        time: '09:00 – 09:30',
        block: 'Control de Acceso y Acreditación en Tranquera',
        subBlock: 'Verificación de pase QR y protocolo de bioseguridad',
        audience: 'Acreditados Aprobados',
        description: 'Recepción de visitantes autorizados por Administración y entrega de ficha técnica de lote.'
      },
      {
        time: '09:30 – 11:15',
        block: 'Recorrida Técnica: Evaluación BBCH 10-19 y Turnos de Riego',
        subBlock: 'Medición de plantas/m² y humedad en zona radicular',
        audience: 'Técnicos e Invitados',
        description: 'Inspección in situ de los 3 esquemas de densidad de siembra y lectura de tensiómetros.'
      },
      {
        time: '11:15 – 13:00',
        block: 'Mesa de Consultas Agronómicas y Cierre de Visita',
        subBlock: 'Intercambio con equipo técnico INTA / PatagonianC',
        audience: 'General',
        description: 'Revisión de indicadores de implantación y entrega de constancias de visita.'
      }
    ],
    createdBy: 'Administración Central HempC',
    createdAt: '2026-11-01'
  },
  {
    id: 'evt-recorrida-floracion-2027',
    slug: 'recorrida-floracion-hplc-2027',
    title: 'RECORRIDA INSTITUCIONAL: AUDITORÍA DE FLORACIÓN Y PROTOCOLO HPLC',
    subtitle: 'Protocolo Oficial de Muestreo Pre-Cosecha (<0.3% THC) y Certificación ARICCAME / INASE',
    category: 'recorrida_institucional',
    date: '2027-01-16',
    dateLabel: 'Sábado 16 de Enero • 08:30 a 14:00 hs',
    startTime: '08:30',
    endTime: '14:00',
    venueName: 'INTA Estación Experimental — INTA Ensayo Experimental',
    locality: 'Hilario Ascasubi, Buenos Aires',
    organizer: 'PatagonianC LTDA • INTA EEA Chubut / Ascasubi',
    locationId: '1766450631873',
    clientId: '94f8da54-90dc-44e7-b9df-e9b6c2be5266',
    isCustomLocation: false,
    address: 'Ruta Nacional 3 Km 794, Hilario Ascasubi, Prov. de Buenos Aires',
    coordinates: {
      lat: -39.393075,
      lng: -62.621037
    },
    routeInstructions:
      'Ruta Destacada: Circular por Ruta Nacional 3 hasta el Km 794 (Pórtico de Ingreso a EEA INTA Hilario Ascasubi). Avanzar por el bulevar interno principal 1,1 km hacia el Este hasta el Cuadro de Ensayos de Cáñamo Industrial.',
    routeWaypoints: [
      { lat: -39.3895, lng: -62.632, label: 'RN 3 Km 794 Pórtico INTA Ascasubi' },
      { lat: -39.392013, lng: -62.62907, label: 'Pabellón Central EEA INTA' },
      { lat: -39.393075, lng: -62.621037, label: 'Lote Ensayo Experimental INTA' }
    ],
    gatekeeperPhone: '+5492804697193',
    maxCapacity: 60,
    status: 'inscripcion_abierta',
    weatherWarning: 'Cupos limitados sujetos a aprobación de la Administración de Plataforma.',
    description:
      'Jornada demostrativa de toma de muestras compuestas en floración plena (BBCH 60-69), cadena de custodia y trazabilidad analítica.',
    ticketPrefix: 'AUDIT-16E',
    scheduleItems: [
      {
        time: '08:30 – 09:15',
        block: 'Acreditación de Delegaciones e Invitados',
        subBlock: 'Validación de código QR de acreditación',
        audience: 'Autoridades e Invitados',
        description: 'Registro de ingreso en el predio experimental INTA EEA.'
      },
      {
        time: '09:15 – 12:00',
        block: 'Práctica de Muestreo Oficial en Lote y Precintado',
        subBlock: 'Protocolo trazable de floración',
        audience: 'Técnicos y Auditores',
        description: 'Demostración de corte de tercio superior floral, rotulado QR y registro en cadena de custodia.'
      },
      {
        time: '12:00 – 14:00',
        block: 'Cierre Institucional y Certificados',
        subBlock: 'Conclusiones de campaña',
        audience: 'Todos los asistentes',
        description: 'Presentación de curvas de biomasa y entrega de certificados de participación.'
      }
    ],
    createdBy: 'Administración Central HempC',
    createdAt: '2026-11-05'
  }
];

export interface EnabledEstablishmentOption {
  locationId: string;
  clientId?: string;
  establishmentName: string;
  fieldName: string;
  displayLabel: string;
  venueName: string;
  locality: string;
  address: string;
  coordinates: { lat: number; lng: number };
  routeInstructions: string;
  routeWaypoints: { lat: number; lng: number; label?: string }[];
}

/**
 * Construye el catálogo de Establecimientos y Campos Habilitados integrados en la Red
 * para poblar el desplegable "ESTABLECIMIENTO DEL EVENTO" en el alta/edición de EVENTOS.
 */
export function buildEnabledEstablishmentsOptions(
  locations: Location[] = [],
  clients: Client[] = []
): EnabledEstablishmentOption[] {
  const clientById = new Map<string, Client>();
  (clients || []).forEach(c => {
    if (c && c.id) clientById.set(String(c.id), c);
  });

  const options: EnabledEstablishmentOption[] = [];
  const seenLocIds = new Set<string>();

  for (const loc of locations || []) {
    if (!loc || !loc.id) continue;
    const locId = String(loc.id);
    if (seenLocIds.has(locId)) continue;
    seenLocIds.add(locId);

    const linkedClient = loc.clientId ? clientById.get(String(loc.clientId)) : undefined;
    const establishmentName =
      linkedClient?.name || loc.ownerLegalName || loc.ownerName || loc.name;
    const fieldName = loc.name;
    const cityProv = [loc.city, loc.province].filter(Boolean).join(', ') || 'Trelew, Chubut';
    const address = loc.address || linkedClient?.address || `Acceso Rural ${cityProv}`;

    const rawLat = Number(loc.coordinates?.lat ?? linkedClient?.coordinates?.lat ?? -43.308362);
    const rawLng = Number(loc.coordinates?.lng ?? linkedClient?.coordinates?.lng ?? -65.289033);
    const validLat = !isNaN(rawLat) && rawLat !== 0 ? rawLat : -43.308362;
    const validLng = !isNaN(rawLng) && rawLng !== 0 ? rawLng : -65.289033;

    const venueName =
      establishmentName.toLowerCase() === fieldName.toLowerCase()
        ? establishmentName
        : `${establishmentName} — ${fieldName}`;

    const defaultRoute = `Ruta Destacada hacia ${venueName}: Partiendo desde el casco urbano / rotonda principal de ${cityProv}, tomar la vía troncal hacia ${address} y seguir la señalización vial hasta la Tranquera de Acreditación QR (GPS: ${validLat.toFixed(6)}, ${validLng.toFixed(6)}).`;

    const approachPoint = {
      lat: Number((validLat + 0.024).toFixed(6)),
      lng: Number((validLng - 0.018).toFixed(6)),
      label: `Referencia Urbana / Ruta Principal (${loc.city || 'Acceso'})`
    };
    const turnPoint = {
      lat: Number((validLat + 0.006).toFixed(6)),
      lng: Number((validLng - 0.007).toFixed(6)),
      label: `Desvío Vial Señalizado • ${address}`
    };
    const gatePoint = {
      lat: validLat,
      lng: validLng,
      label: `Tranquera de Acreditación • ${fieldName}`
    };

    options.push({
      locationId: locId,
      clientId: linkedClient?.id || loc.clientId,
      establishmentName,
      fieldName,
      displayLabel: `${establishmentName} • Campo: ${fieldName} (${cityProv})`,
      venueName,
      locality: cityProv,
      address,
      coordinates: { lat: validLat, lng: validLng },
      routeInstructions: defaultRoute,
      routeWaypoints: [approachPoint, turnPoint, gatePoint]
    });
  }

  return options;
}

/**
 * Convierte coordenadas decimales (lat, lng) a notación GPS Sexagesimal (GMS / DMS).
 */
export function formatCoordinatesDMS(lat: number, lng: number): string {
  const toDMS = (deg: number, isLat: boolean) => {
    const dir = isLat ? (deg >= 0 ? 'N' : 'S') : deg >= 0 ? 'E' : 'W';
    const abs = Math.abs(deg);
    const d = Math.floor(abs);
    const minFloat = (abs - d) * 60;
    const m = Math.floor(minFloat);
    const s = ((minFloat - m) * 60).toFixed(1);
    return `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(4, '0')}"${dir}`;
  };
  return `${toDMS(lat, true)} ${toDMS(lng, false)}`;
}

/**
 * Parsea un string de coordenadas tipo "-43.308362, -65.289033" y valida rango geográfico.
 */
export function parseCoordinateString(
  raw: string
): { lat: number; lng: number } | null {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw
    .trim()
    .split(/[,;\s]+/)
    .map(s => Number(s.trim()))
    .filter(n => !isNaN(n));
  if (parts.length < 2) return null;
  const [lat, lng] = parts;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

/**
 * Resuelve la locación de un evento a partir de la selección del desplegable:
 * - Si selectionId corresponde a un Establecimiento/Campo Habilitado de la red, vincula sus datos y GPS.
 * - Si selectionId === 'OTHER' (OTRO), habilita la locación personalizada con sus coordenadas y ruta.
 */
export function resolveEventVenueFromSelection(params: {
  selectionId: string;
  locations: Location[];
  clients: Client[];
  customVenueName?: string;
  customLocality?: string;
  customAddress?: string;
  customLat?: number;
  customLng?: number;
  customRouteInstructions?: string;
}): {
  locationId: string;
  clientId?: string;
  isCustomLocation: boolean;
  venueName: string;
  locality: string;
  address: string;
  coordinates: { lat: number; lng: number };
  routeInstructions: string;
  routeWaypoints: { lat: number; lng: number; label?: string }[];
} {
  const options = buildEnabledEstablishmentsOptions(params.locations, params.clients);

  if (params.selectionId && params.selectionId !== 'OTHER') {
    const matched = options.find(o => o.locationId === params.selectionId);
    if (matched) {
      return {
        locationId: matched.locationId,
        clientId: matched.clientId,
        isCustomLocation: false,
        venueName: matched.venueName,
        locality: matched.locality,
        address: matched.address,
        coordinates: matched.coordinates,
        routeInstructions: params.customRouteInstructions?.trim() || matched.routeInstructions,
        routeWaypoints: matched.routeWaypoints
      };
    }
  }

  // Caso OTRO (Locación Externa a los campos pre-habilitados)
  const lat =
    typeof params.customLat === 'number' && !isNaN(params.customLat) && params.customLat !== 0
      ? Number(params.customLat.toFixed(6))
      : -43.308362;
  const lng =
    typeof params.customLng === 'number' && !isNaN(params.customLng) && params.customLng !== 0
      ? Number(params.customLng.toFixed(6))
      : -65.289033;
  const venueName = (params.customVenueName || 'Locación Especial del Evento').trim();
  const locality = (params.customLocality || 'VIRCH – Trelew, Chubut').trim();
  const address = (params.customAddress || `Acceso Principal • ${locality}`).trim();
  const routeInstructions = (
    params.customRouteInstructions ||
    `Ruta Destacada: Dirigirse hacia ${address} (${locality}) siguiendo las coordenadas GPS ${lat.toFixed(6)}, ${lng.toFixed(6)} hasta el puesto de acreditación del evento.`
  ).trim();

  return {
    locationId: 'OTHER',
    clientId: undefined,
    isCustomLocation: true,
    venueName,
    locality,
    address,
    coordinates: { lat, lng },
    routeInstructions,
    routeWaypoints: [
      {
        lat: Number((lat + 0.012).toFixed(6)),
        lng: Number((lng - 0.012).toFixed(6)),
        label: `Acceso Ruta Principal (${locality})`
      },
      {
        lat: Number((lat + 0.003).toFixed(6)),
        lng: Number((lng - 0.004).toFixed(6)),
        label: `Ingreso Vial • ${address}`
      },
      {
        lat,
        lng,
        label: `Destino GPS • ${venueName}`
      }
    ]
  };
}

export interface EventRouteStepItem {
  stepNumber: number;
  title: string;
  description: string;
  coordinatesLabel: string;
}

export interface EventGpsNavigationBundle {
  lat: number;
  lng: number;
  decimalLabel: string;
  dmsLabel: string;
  address: string;
  routeInstructions: string;
  googleMapsDirectionsUrl: string;
  googleMapsSearchUrl: string;
  wazeNavigateUrl: string;
  appleMapsUrl: string;
  geoUri: string;
  googleCalendarUrl: string;
  staticMapImageUrl: string;
  routeSteps: EventRouteStepItem[];
}

/**
 * Calcula el encuadre geográfico regional (bounding box ampliado ~12x8 km)
 * para que en el mapa se visualicen con claridad la ciudad de referencia, las rutas nacionales/provinciales
 * y el recorrido completo hasta la tranquera del establecimiento.
 */
export function computeRegionalMapBbox(
  lat: number,
  lng: number,
  waypoints?: { lat: number; lng: number }[]
): {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  centerLat: number;
  centerLng: number;
  bboxString: string;
} {
  const pts =
    waypoints && waypoints.length >= 2
      ? waypoints
      : [
          { lat: lat + 0.024, lng: lng - 0.018 },
          { lat, lng }
        ];
  const lats = pts.map(p => p.lat);
  const lngs = pts.map(p => p.lng);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

  // Amplitud regional suficientemente alejada (~14 km ancho x ~8.5 km alto) para mostrar ciudad cabecera y rutas
  const halfSpanLng = Math.max(0.075, (Math.max(...lngs) - Math.min(...lngs)) * 1.45);
  const halfSpanLat = Math.max(0.042, (Math.max(...lats) - Math.min(...lats)) * 1.45);

  const minLng = Number((midLng - halfSpanLng).toFixed(6));
  const maxLng = Number((midLng + halfSpanLng).toFixed(6));
  const minLat = Number((midLat - halfSpanLat).toFixed(6));
  const maxLat = Number((midLat + halfSpanLat).toFixed(6));

  return {
    minLng,
    minLat,
    maxLng,
    maxLat,
    centerLat: Number(midLat.toFixed(6)),
    centerLng: Number(midLng.toFixed(6)),
    bboxString: `${minLng},${minLat},${maxLng},${maxLat}`
  };
}

/**
 * Construye una URL pública de captura cartográfica VIAL CLARA y ALEJADA (Esri World_Street_Map PNG)
 * que muestra las ciudades vecinas (ej. Trelew), las Rutas Nacionales/Provinciales (RN 3, RP 7, RN 25)
 * y el entorno del establecimiento con máxima nitidez para correos electrónicos y PDF.
 */
export function buildStaticEventMapImageUrl(
  lat: number,
  lng: number,
  _zoom = 12
): string {
  const safeLat = Number(lat.toFixed(6));
  const safeLng = Number(lng.toFixed(6));
  const { bboxString } = computeRegionalMapBbox(safeLat, safeLng);
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export?bbox=${bboxString}&bboxSR=4326&imageSR=4326&size=900,480&format=png&f=image`;
}

/**
 * Construye el paquete completo de enlaces de navegación GPS, pasos estructurados de cómo llegar
 * y URL de captura de mapa para vincular el celular del visitante.
 */
export function buildEventGpsNavigationLinks(
  event?: Partial<FieldEvent> | null
): EventGpsNavigationBundle {
  const defaultEvt = DEFAULT_FIELD_EVENTS[0];
  const rawLat = Number(event?.coordinates?.lat ?? defaultEvt.coordinates!.lat);
  const rawLng = Number(event?.coordinates?.lng ?? defaultEvt.coordinates!.lng);
  const lat = !isNaN(rawLat) && rawLat >= -90 && rawLat <= 90 && rawLat !== 0 ? rawLat : -43.308362;
  const lng = !isNaN(rawLng) && rawLng >= -180 && rawLng <= 180 && rawLng !== 0 ? rawLng : -65.289033;

  const decimalLabel = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  const dmsLabel = formatCoordinatesDMS(lat, lng);
  const venueName = event?.venueName || defaultEvt.venueName;
  const locality = event?.locality || defaultEvt.locality;
  const address = event?.address || defaultEvt.address || `Ruta Nacional 3 Km 1462, ${locality}`;
  const routeInstructions =
    event?.routeInstructions ||
    defaultEvt.routeInstructions ||
    `Dirigirse por ruta principal hasta ${address} (${locality}). Coordenadas GPS: ${decimalLabel}.`;

  const waypoints =
    event?.routeWaypoints && event.routeWaypoints.length >= 2
      ? event.routeWaypoints
      : [
          {
            lat: Number((lat + 0.014).toFixed(6)),
            lng: Number((lng - 0.014).toFixed(6)),
            label: `Acceso Ruta Principal (${locality})`
          },
          {
            lat: Number((lat + 0.004).toFixed(6)),
            lng: Number((lng - 0.005).toFixed(6)),
            label: `Desvío Señalizado hacia ${address}`
          },
          {
            lat,
            lng,
            label: `Tranquera de Acreditación QR • ${venueName}`
          }
        ];

  const wp0 = waypoints[0];
  const wp1 = waypoints[Math.min(1, waypoints.length - 1)];
  const wpDest = waypoints[waypoints.length - 1];

  const routeSteps: EventRouteStepItem[] = [
    {
      stepNumber: 1,
      title: `Tramo 1 — Aproximación por Vía Principal (${wp0.label || locality})`,
      description: `Tomar la vía troncal de acceso en dirección a ${locality}. Referencia inicial de aproximación vial antes del desvío rural.`,
      coordinatesLabel: `${wp0.lat.toFixed(6)}, ${wp0.lng.toFixed(6)}`
    },
    {
      stepNumber: 2,
      title: `Tramo 2 — Desvío Señalizado e Ingreso Rural (${wp1.label || address})`,
      description: `${routeInstructions}`,
      coordinatesLabel: `${wp1.lat.toFixed(6)}, ${wp1.lng.toFixed(6)}`
    },
    {
      stepNumber: 3,
      title: `Tramo 3 — Puesto de Control y Tranquera de Acreditación QR (${venueName})`,
      description: `Arribo al acceso oficial de ${venueName} (${address}). Presentar Credencial QR (impresa o en celular) junto con DNI físico al personal de recepción.`,
      coordinatesLabel: `${wpDest.lat.toFixed(6)}, ${wpDest.lng.toFixed(6)} (${dmsLabel})`
    }
  ];

  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const wazeNavigateUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  const appleMapsUrl = `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
  const geoUri = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(venueName)})`;
  const staticMapImageUrl = buildStaticEventMapImageUrl(lat, lng, 14);

  // Fechas para Google Calendar (YYYYMMDDTHHMMSS)
  const rawDate = (event?.date || defaultEvt.date || '2026-11-21').replace(/-/g, '');
  const startHm = (event?.startTime || '08:30').replace(':', '') + '00';
  const endHm = (event?.endTime || '15:30').replace(':', '') + '00';
  const calTitle = encodeURIComponent(event?.title || defaultEvt.title);
  const calLocation = encodeURIComponent(`${venueName} - ${address}, ${locality} (${decimalLabel})`);
  const calDetails = encodeURIComponent(
    `${event?.subtitle || 'Jornada Oficial HempC'}\n\n📍 CÓMO LLEGAR / RUTA DESTACADA:\n${routeInstructions}\n\n🧭 Coordenadas GPS: ${decimalLabel} (${dmsLabel})\n🚗 Abrir GPS Celular: ${googleMapsDirectionsUrl}`
  );
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&dates=${rawDate}T${startHm}/${rawDate}T${endHm}&details=${calDetails}&location=${calLocation}`;

  return {
    lat,
    lng,
    decimalLabel,
    dmsLabel,
    address,
    routeInstructions,
    googleMapsDirectionsUrl,
    googleMapsSearchUrl,
    wazeNavigateUrl,
    appleMapsUrl,
    geoUri,
    googleCalendarUrl,
    staticMapImageUrl,
    routeSteps
  };
}

/**
 * Descarga un archivo universal de agenda (.ICS) para el celular o computadora del visitante
 * con alarma recordatoria 24 hs antes y enlace directo al GPS del establecimiento.
 */
export function downloadEventCalendarICS(
  event: FieldEvent,
  attendee?: Partial<User>
): void {
  if (typeof window === 'undefined') return;
  const nav = buildEventGpsNavigationLinks(event);
  const rawDate = (event.date || '2026-11-21').replace(/-/g, '');
  const startHm = (event.startTime || '08:30').replace(':', '') + '00';
  const endHm = (event.endTime || '15:30').replace(':', '') + '00';
  const ticket = attendee?.eventTicketCode || event.ticketPrefix || 'SIEMBRA-21N';

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PatagonianC LTDA//Red Cooperativa HempC Eventos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}-${ticket}@hempc.com.ar`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${rawDate}T${startHm}`,
    `DTEND:${rawDate}T${endHm}`,
    `SUMMARY:${event.title} (Pase: ${ticket})`,
    `LOCATION:${event.venueName} - ${nav.address} (${nav.decimalLabel})`,
    `GEO:${nav.lat};${nav.lng}`,
    `DESCRIPTION:Pase Oficial QR: ${ticket}\\nTitular: ${attendee?.name || 'Visitante Acreditado'}\\n\\nRUTA DESTACADA DE ACCESO:\\n${nav.routeInstructions}\\n\\nCOORDENADAS GPS: ${nav.decimalLabel} (${nav.dmsLabel})\\nABRIR GPS EN CELULAR: ${nav.googleMapsDirectionsUrl}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio Jornada de Campo HempC - Preparar DNI y Pase QR',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Agenda_GPS_${event.slug || 'Jornada_HempC'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Determina con precisión si un registro en public.users corresponde a un
 * Visitante / Asistente exclusivo de Evento o Jornada (que NO debe aparecer en
 * ADMIN Y ACCESOS ni tener permiso de Login al sistema de datos), preservando
 * intactos a los 11 operadores reales del sistema (Admins, Técnicos, Productores
 * y Directores/Auditores de Semilleros Homologados como Ananda Pampa y HEMPIT France).
 */
export function isEventOnlyAttendee(user?: Partial<User> | null): boolean {
  if (!user) return false;

  // 1. Si tiene marcador explícito de alcance
  if (user.accessScope === 'event_attendee') return true;
  if (user.accessScope === 'system_user') return false;

  // 2. Roles operativos troncales o vinculados a Establecimiento Socio o Semillero Homologado son siempre usuarios del sistema
  if (
    user.role === 'super_admin' ||
    user.role === 'admin' ||
    user.role === 'technician' ||
    user.role === 'client'
  ) {
    return false;
  }

  if (user.clientId || user.supplierId || user.memberType === 'Proveedor_Homologado' || user.memberType === 'Socio_Productor') {
    return false;
  }

  const jobLower = String(user.jobTitle || '').toLowerCase();
  const orgLower = String(user.organizationName || '').toLowerCase();

  // 3. Directores de Semilleros y Auditores Obtentores reales (ej. Gabriel Blocki - Ananda Pampa, Remy Hilgengra / Jean-Eric Ponthou - HEMPIT France)
  if (
    jobLower.includes('semillero') ||
    jobLower.includes('obtentor') ||
    jobLower.includes('hempit') ||
    jobLower.includes('ananda pampa') ||
    orgLower.includes('hempit') ||
    orgLower.includes('ananda pampa')
  ) {
    return false;
  }

  // 4. Si se registró desde el formulario de jornada/evento o tiene perfil de visitante sin entidad operativa
  if (
    user.registrationSource === 'event_un_dia_de_siembra' ||
    Boolean(user.eventRegistered) ||
    Boolean(user.eventTicketCode) ||
    user.requestedProfileType === 'visitante' ||
    jobLower.includes('visitante') ||
    jobLower.includes('invitado general') ||
    jobLower.includes('un día de siembra') ||
    jobLower.includes('acreditado')
  ) {
    return true;
  }

  return false;
}

/**
 * Separa el padrón general de registros en:
 * - systemUsers: Operadores reales del sistema (para ADMIN Y ACCESOS /users)
 * - eventAttendees: Visitantes y registrados de jornadas/eventos (para EVENTOS /events)
 */
export function partitionUsersByScope(usersList: User[]): {
  systemUsers: User[];
  eventAttendees: User[];
} {
  const systemUsers: User[] = [];
  const eventAttendees: User[] = [];

  for (const u of usersList || []) {
    if (!u) continue;
    if (isEventOnlyAttendee(u)) {
      eventAttendees.push(u);
    } else {
      systemUsers.push(u);
    }
  }

  return { systemUsers, eventAttendees };
}

/**
 * Determina a qué evento pertenece un asistente (compatible con los 6 registros actuales en producción).
 */
export function resolveAttendeeEventId(attendee: Partial<User>, events: FieldEvent[] = DEFAULT_FIELD_EVENTS): string {
  if (attendee.eventId && events.some(e => e.id === attendee.eventId)) {
    return attendee.eventId;
  }
  const ticket = String(attendee.eventTicketCode || '').toUpperCase();
  if (ticket) {
    const byPrefix = events.find(e => e.ticketPrefix && ticket.startsWith(e.ticketPrefix.toUpperCase()));
    if (byPrefix) return byPrefix.id;
  }
  if (attendee.eventName) {
    const nameLower = attendee.eventName.toLowerCase();
    const byName = events.find(
      e =>
        nameLower.includes(e.title.toLowerCase()) ||
        (e.slug === 'un-dia-de-siembra' && nameLower.includes('siembra'))
    );
    if (byName) return byName.id;
  }
  return OFFICIAL_SEMBRA_EVENT_ID;
}

/**
 * Determina el estado de acreditación del asistente en el evento.
 */
export function resolveEventAccreditationStatus(
  attendee: Partial<User>
): 'pending_admin' | 'accredited' | 'checked_in' | 'rejected' {
  if (attendee.eventAccreditationStatus) {
    return attendee.eventAccreditationStatus;
  }
  if (attendee.accountStatus === 'rejected') {
    return 'rejected';
  }
  if (attendee.eventCheckedInAt) {
    return 'checked_in';
  }
  if (attendee.approvedAt || attendee.approvedBy) {
    return 'accredited';
  }
  return 'pending_admin';
}

export interface CreateEventRegistrationInput {
  name: string;
  email: string;
  phone: string;
  dniNumber: string;
  organizationName?: string;
  localityOrProvince: string;
  attendeeCategoryLabel?: string;
  event: FieldEvent;
  existingUser?: User | null;
}

/**
 * Crea un registro de inscripción a una Jornada / Evento:
 * - Si la persona es nueva o visitante, nace estrictamente como `accessScope: 'event_attendee'`,
 *   con clave bloqueada (`__EVENT_VISITOR_NO_SYSTEM_LOGIN__`) y SIN acceso al login del sistema.
 * - Si un usuario que YA es operador activo del sistema (ej. un Productor activo) se anota al evento,
 *   conserva su cuenta de sistema intacta y suma su código de pase al evento.
 */
export function createEventRegistrationRecord(input: CreateEventRegistrationInput): User {
  const cleanName = input.name.trim();
  const cleanEmail = input.email.trim().toLowerCase();
  const existing = input.existingUser || null;

  const isExistingSystemOperator = Boolean(
    existing &&
      !isEventOnlyAttendee(existing) &&
      existing.accountStatus === 'active' &&
      !existing.passwordPendingSetup
  );

  const prefix = input.event.ticketPrefix || 'EVENTO';
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  const ticketCode = existing?.eventTicketCode || `${prefix}-${suffix}`;
  const categoryText = input.attendeeCategoryLabel || 'Visitante a Jornada / Invitado General';

  if (isExistingSystemOperator && existing) {
    return {
      ...existing,
      phone: input.phone.trim() || existing.phone,
      dniNumber: input.dniNumber.trim() || existing.dniNumber,
      eventRegistered: true,
      eventId: input.event.id,
      eventName: input.event.title,
      eventTicketCode: ticketCode,
      eventAccreditationStatus: existing.eventAccreditationStatus || 'pending_admin',
      eventConfirmedByEmail: false
    };
  }

  return {
    ...(existing || {}),
    id: existing?.id || `evt-att-${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    role: 'viewer',
    accessScope: 'event_attendee',
    password: '__EVENT_VISITOR_NO_SYSTEM_LOGIN__',
    passwordPendingSetup: true,
    phone: input.phone.trim() || existing?.phone || '',
    dniNumber: input.dniNumber.trim() || existing?.dniNumber || '',
    jobTitle: `${categoryText} • ${input.event.title}`,
    organizationName: input.organizationName?.trim() || existing?.organizationName || 'Visitante / Invitado de Jornada',
    clientId: null,
    supplierId: null,
    isNetworkMember: false,
    memberType: undefined,
    accountStatus: 'pending_approval',
    registrationSource: 'event_un_dia_de_siembra',
    requestedProfileType: 'visitante',
    eventRegistered: true,
    eventId: input.event.id,
    eventName: input.event.title,
    eventTicketCode: ticketCode,
    eventConfirmedByEmail: false,
    eventProgramDownloaded: false,
    eventAccreditationStatus: 'pending_admin',
    localityOrProvince: input.localityOrProvince.trim() || existing?.localityOrProvince || input.event.locality,
    invitedAt: existing?.invitedAt || new Date().toISOString().split('T')[0],
    avatar:
      existing?.avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=b6e3f4`
  };
}

/**
 * Aprueba la acreditación de un inscripto a un Evento / Jornada.
 * EXCLUSIVO para Administradores (`admin` / `super_admin`).
 * No otorga contraseña ni acceso al sistema: mantiene `accessScope: 'event_attendee'` y login bloqueado.
 */
export function approveEventAttendeeByAdmin(params: {
  adminUser: User | null | undefined;
  attendee: User;
  event?: FieldEvent;
}): User {
  const { adminUser, attendee, event } = params;
  if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'super_admin')) {
    throw new Error('Acceso denegado: Solo los Administradores pueden aprobar acreditaciones en EVENTOS.');
  }

  const todayIso = new Date().toISOString().split('T')[0];
  const ticketPrefix = event?.ticketPrefix || 'SIEMBRA-21N';
  const ensuredTicket =
    attendee.eventTicketCode || `${ticketPrefix}-${String(Date.now()).slice(-4)}`;

  const isSystemOp = !isEventOnlyAttendee(attendee);

  return {
    ...attendee,
    accessScope: isSystemOp ? 'system_user' : 'event_attendee',
    // CRÍTICO: Si es un visitante de evento, su cuenta de sistema permanece bloqueada para login
    accountStatus: isSystemOp ? attendee.accountStatus : 'pending_approval',
    password: isSystemOp ? attendee.password : '__EVENT_VISITOR_NO_SYSTEM_LOGIN__',
    passwordPendingSetup: isSystemOp ? attendee.passwordPendingSetup : true,
    eventRegistered: true,
    eventId: event?.id || attendee.eventId || OFFICIAL_SEMBRA_EVENT_ID,
    eventName: event?.title || attendee.eventName || 'JORNADA OFICIAL: “UN DÍA DE SIEMBRA”',
    eventTicketCode: ensuredTicket,
    eventAccreditationStatus: 'accredited',
    approvedBy: adminUser.name,
    approvedAt: todayIso
  };
}

/**
 * Rechaza una solicitud de acreditación a un Evento / Jornada.
 * EXCLUSIVO para Administradores (`admin` / `super_admin`).
 */
export function rejectEventAttendeeByAdmin(params: {
  adminUser: User | null | undefined;
  attendee: User;
}): User {
  const { adminUser, attendee } = params;
  if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'super_admin')) {
    throw new Error('Acceso denegado: Solo los Administradores pueden rechazar registros en EVENTOS.');
  }

  return {
    ...attendee,
    accessScope: isEventOnlyAttendee(attendee) ? 'event_attendee' : attendee.accessScope,
    accountStatus: isEventOnlyAttendee(attendee) ? 'rejected' : attendee.accountStatus,
    eventAccreditationStatus: 'rejected'
  };
}

/**
 * Registra el Check-in presencial en puerta/tranquera el día de la jornada.
 * EXCLUSIVO para Administradores (`admin` / `super_admin`).
 */
export function checkInEventAttendeeByAdmin(params: {
  adminUser: User | null | undefined;
  attendee: User;
}): User {
  const { adminUser, attendee } = params;
  if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'super_admin')) {
    throw new Error('Acceso denegado: Solo los Administradores pueden registrar el Check-in en EVENTOS.');
  }

  const nowIso = new Date().toISOString();
  return {
    ...attendee,
    eventRegistered: true,
    eventAccreditationStatus: 'checked_in',
    eventCheckedInAt: nowIso,
    eventCheckedInBy: adminUser.name,
    approvedBy: attendee.approvedBy || adminUser.name,
    approvedAt: attendee.approvedAt || nowIso.split('T')[0]
  };
}

/**
 * Crea o actualiza un Evento / Visita Programada en el calendario institucional.
 * EXCLUSIVO para Administradores (`admin` / `super_admin`).
 */
export function createOrUpdateFieldEventByAdmin(params: {
  adminUser: User | null | undefined;
  eventData: Partial<FieldEvent> & { title: string; date: string; venueName: string };
  existingEvents: FieldEvent[];
}): { savedEvent: FieldEvent; updatedList: FieldEvent[] } {
  const { adminUser, eventData, existingEvents } = params;
  if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'super_admin')) {
    throw new Error('Acceso denegado: Solo los Administradores pueden crear o administrar EVENTOS.');
  }

  const cleanTitle = eventData.title.trim();
  if (!cleanTitle) {
    throw new Error('El título del evento o visita programada es obligatorio.');
  }

  const id = eventData.id || `evt-${Date.now()}`;
  const slug =
    eventData.slug ||
    cleanTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 48);

  const startTime = eventData.startTime || '08:30';
  const endTime = eventData.endTime || '15:30';
  const dateObj = new Date(`${eventData.date}T12:00:00`);
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    : eventData.date;

  const navFallback = buildEventGpsNavigationLinks(eventData);

  const savedEvent: FieldEvent = {
    id,
    slug,
    title: cleanTitle,
    subtitle: eventData.subtitle || 'Actividad Oficial de Campo • Red Cooperativa HempC',
    category: eventData.category || 'visita_programada',
    date: eventData.date,
    dateLabel: eventData.dateLabel || `${formattedDate} • ${startTime} a ${endTime} hs`,
    startTime,
    endTime,
    venueName: eventData.venueName.trim(),
    locality: eventData.locality?.trim() || 'VIRCH – Trelew, Chubut',
    organizer: eventData.organizer?.trim() || 'PatagonianC LTDA • HempC Nucleus',
    locationId: eventData.locationId || '1766444697119',
    clientId: eventData.clientId,
    isCustomLocation: Boolean(eventData.isCustomLocation || eventData.locationId === 'OTHER'),
    address: eventData.address?.trim() || navFallback.address,
    coordinates:
      eventData.coordinates &&
      !isNaN(Number(eventData.coordinates.lat)) &&
      !isNaN(Number(eventData.coordinates.lng))
        ? {
            lat: Number(Number(eventData.coordinates.lat).toFixed(6)),
            lng: Number(Number(eventData.coordinates.lng).toFixed(6))
          }
        : { lat: navFallback.lat, lng: navFallback.lng },
    routeInstructions: eventData.routeInstructions?.trim() || navFallback.routeInstructions,
    routeWaypoints:
      eventData.routeWaypoints && eventData.routeWaypoints.length > 0
        ? eventData.routeWaypoints
        : [
            {
              lat: Number((navFallback.lat + 0.014).toFixed(6)),
              lng: Number((navFallback.lng - 0.014).toFixed(6)),
              label: 'Acceso Ruta Principal'
            },
            {
              lat: Number((navFallback.lat + 0.004).toFixed(6)),
              lng: Number((navFallback.lng - 0.004).toFixed(6)),
              label: 'Desvío Señalizado al Predio'
            },
            {
              lat: navFallback.lat,
              lng: navFallback.lng,
              label: `Tranquera Principal • ${eventData.venueName.trim()}`
            }
          ],
    gatekeeperPhone: eventData.gatekeeperPhone?.trim() || '+5492804697193',
    maxCapacity: Number(eventData.maxCapacity) > 0 ? Number(eventData.maxCapacity) : 60,
    status: eventData.status || 'inscripcion_abierta',
    weatherWarning:
      eventData.weatherWarning ||
      'Actividad sujeta a condiciones meteorológicas. Acreditación obligatoria con Pase QR y DNI.',
    description:
      eventData.description ||
      'Jornada técnica programada y supervisada por la Administración Central de la Red Cooperativa HempC.',
    ticketPrefix:
      eventData.ticketPrefix?.trim().toUpperCase() ||
      `EVT-${eventData.date.replace(/-/g, '').slice(4)}`,
    scheduleItems:
      eventData.scheduleItems && eventData.scheduleItems.length > 0
        ? eventData.scheduleItems
        : [
            {
              time: `${startTime} – 09:30`,
              block: 'Acreditación en Tranquera y Control de Pase QR',
              subBlock: 'Verificación en padrón oficial de EVENTOS',
              audience: 'Acreditados',
              description: 'Recepción de visitantes autorizados y entrega de protocolo de campo.'
            },
            {
              time: `09:30 – ${endTime}`,
              block: 'Recorrida Técnica de Lotes y Práctica de Campo',
              subBlock: cleanTitle,
              audience: 'Participantes',
              description: eventData.description || 'Desarrollo del cronograma técnico en establecimiento.'
            }
          ],
    createdBy: adminUser.name,
    createdAt: eventData.createdAt || new Date().toISOString().split('T')[0]
  };

  const exists = existingEvents.some(e => e.id === id);
  const updatedList = exists
    ? existingEvents.map(e => (e.id === id ? savedEvent : e))
    : [savedEvent, ...existingEvents];

  return { savedEvent, updatedList };
}

/**
 * Genera la Planilla Oficial de Acreditados y Control de Acceso en Puerta (PDF A4) para los Administradores.
 */
export function downloadEventAttendanceSheetPDF(event: FieldEvent, attendees: User[]): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFillColor(12, 45, 30);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setFillColor(221, 219, 0);
  doc.rect(0, 36, 210, 2, 'F');

  doc.setTextColor(221, 219, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('RED COOPERATIVA HEMPC • CONTROL EXCLUSIVO DE EVENTOS Y ACREDITACIONES', 14, 11);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text(`PLANILLA OFICIAL DE ACREDITACIÓN: ${event.title.slice(0, 48)}`, 14, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Sede: ${event.venueName} (${event.locality})  |  Fecha: ${event.dateLabel}`, 14, 26);
  doc.text(
    `Total Registrados: ${attendees.length} / Cupo: ${event.maxCapacity}  |  Emisión: ${new Date().toLocaleDateString('es-AR')}`,
    14,
    32
  );

  let y = 46;
  doc.setFillColor(241, 245, 249);
  doc.rect(12, y - 5, 186, 8, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('N° PASE / QR', 14, y);
  doc.text('APELLIDO Y NOMBRE', 45, y);
  doc.text('DNI / CUIT', 98, y);
  doc.text('INSTITUCIÓN / PROCEDENCIA', 124, y);
  doc.text('ESTADO / FIRMA', 170, y);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);

  attendees.forEach((att, idx) => {
    if (y > 272) {
      doc.addPage();
      y = 22;
    }
    const status = resolveEventAccreditationStatus(att);
    const statusLabel =
      status === 'checked_in'
        ? 'PRESENTE (CHECK-IN)'
        : status === 'accredited'
        ? 'ACREDITADO ADMIN'
        : status === 'rejected'
        ? 'RECHAZADO'
        : 'PENDIENTE ADMIN';

    doc.setDrawColor(226, 232, 240);
    doc.line(12, y + 2.5, 198, y + 2.5);

    doc.setFont('helvetica', 'bold');
    doc.text(String(att.eventTicketCode || `PASE-${idx + 1}`).slice(0, 16), 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(att.name || '').slice(0, 28), 45, y);
    doc.text(String(att.dniNumber || 'S/D').slice(0, 14), 98, y);
    doc.text(String(att.organizationName || att.localityOrProvince || 'Visitante').slice(0, 24), 124, y);
    doc.text(statusLabel, 170, y);

    y += 7.5;
  });

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Nota de Seguridad: Los visitantes acreditados en esta planilla cuentan con permiso de asistencia física a la jornada y NO poseen acceso al sistema interno ni a los datos productivos.',
    14,
    287
  );

  doc.save(`Planilla_Acreditados_${event.slug || 'Evento'}.pdf`);
}

/**
 * Emite el Certificado Oficial de Asistencia a la Jornada en formato A4 apaisado.
 */
export function downloadEventAttendanceCertificatePDF(event: FieldEvent, attendee: User): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Marco institucional
  doc.setFillColor(12, 45, 30);
  doc.rect(0, 0, 297, 210, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(10, 10, 277, 190, 'F');
  doc.setDrawColor(0, 102, 51);
  doc.setLineWidth(1.2);
  doc.rect(14, 14, 269, 182);
  doc.setDrawColor(221, 219, 0);
  doc.setLineWidth(0.6);
  doc.rect(16, 16, 265, 178);

  doc.setTextColor(12, 45, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PATAGONIANC LTDA COOPERATIVA DE TRABAJO • DIPLOMATURA UNIVERSITARIA EN CÁÑAMO INDUSTRIAL', 148.5, 36, {
    align: 'center'
  });

  doc.setTextColor(0, 102, 51);
  doc.setFontSize(24);
  doc.text('CERTIFICADO OFICIAL DE ACREDITACIÓN Y ASISTENCIA', 148.5, 54, { align: 'center' });

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Se deja constancia oficial de que:', 148.5, 72, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(attendee.name.toUpperCase(), 148.5, 88, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `DNI / Identificación: ${attendee.dniNumber || 'Acreditado en Puerta'}   •   Procedencia: ${
      attendee.organizationName || 'Invitado Oficial'
    } (${attendee.localityOrProvince || event.locality})`,
    148.5,
    98,
    { align: 'center' }
  );

  doc.setFontSize(12);
  doc.text('Ha participado y acreditado su asistencia presencial en la actividad:', 148.5, 114, {
    align: 'center'
  });

  doc.setTextColor(12, 45, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(event.title, 148.5, 126, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Sede: ${event.venueName} (${event.locality}) • Fecha: ${event.dateLabel}`, 148.5, 136, {
    align: 'center'
  });
  doc.text(`Organizan: ${event.organizer}`, 148.5, 143, { align: 'center' });

  // Firmas y código de validación
  doc.setDrawColor(148, 163, 184);
  doc.line(55, 172, 125, 172);
  doc.line(172, 172, 242, 172);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Dirección General PatagonianC LTDA', 90, 178, { align: 'center' });
  doc.text('Coordinación Académica & Campo', 207, 178, { align: 'center' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 102, 51);
  doc.text(
    `PASE OFICIAL VERIFICADO: ${attendee.eventTicketCode || 'SIEMBRA-21N'} • EMISIÓN: ${new Date().toLocaleDateString('es-AR')}`,
    148.5,
    189,
    { align: 'center' }
  );

  const safeName = attendee.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Certificado_Asistencia_${safeName}.pdf`);
}

/**
 * Convierte un elemento <svg> (como QRCodeSVG) a un Data URL PNG de alta resolución para incrustar en PDF.
 */
export function svgElementToPngDataUrl(
  svgElement: Element | null | undefined,
  size = 360
): Promise<string | undefined> {
  if (!svgElement || typeof window === 'undefined') return Promise.resolve(undefined);
  return new Promise(resolve => {
    try {
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgElement);
      if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, size, size);
            ctx.drawImage(img, 16, 16, size - 32, size - 32);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
            return;
          }
        } catch {}
        URL.revokeObjectURL(url);
        resolve(undefined);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(undefined);
      };
      img.src = url;
    } catch {
      resolve(undefined);
    }
  });
}

/**
 * Proyecta latitud/longitud a coordenadas fraccionarias de tesela Web Mercator (zoom z).
 */
function latLngToTileXY(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

/**
 * Dibuja la base cartográfica DIURNA Y CLARA (con referencias regionales de ciudad, rutas troncales,
 * valle irrigado, escala ampliada y Ruta Destacada) sobre un contexto Canvas 2D.
 * Nunca utiliza fondos negros ni oscuros para garantizar legibilidad total en impresión, PDF y pantallas móviles.
 */
function paintCartographicOverlayOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  event: Partial<FieldEvent>,
  hasRealMapImage: boolean
): void {
  const nav = buildEventGpsNavigationLinks(event);
  const venueName = event.venueName || DEFAULT_FIELD_EVENTS[0].venueName;
  const locality = event.locality || DEFAULT_FIELD_EVENTS[0].locality;

  const waypoints =
    event.routeWaypoints && event.routeWaypoints.length >= 2
      ? event.routeWaypoints
      : [
          {
            lat: Number((nav.lat + 0.024).toFixed(6)),
            lng: Number((nav.lng - 0.018).toFixed(6)),
            label: `1. Referencia Urbana / Ruta Principal (${locality})`
          },
          {
            lat: Number((nav.lat + 0.006).toFixed(6)),
            lng: Number((nav.lng - 0.007).toFixed(6)),
            label: `2. Desvío Señalizado (${nav.address})`
          },
          {
            lat: nav.lat,
            lng: nav.lng,
            label: `3. TRANQUERA QR • ${venueName}`
          }
        ];

  const bbox = computeRegionalMapBbox(nav.lat, nav.lng, waypoints);

  if (!hasRealMapImage) {
    // Base cartográfica VIAL CLARA DIURNA (estilo plano rutero de alta legibilidad, NUNCA negro)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#f8fafc');
    bgGrad.addColorStop(0.5, '#f1f5f9');
    bgGrad.addColorStop(1, '#e8f5e9');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Valle irrigado / zona rural verde suave en la franja media-inferior
    ctx.fillStyle = 'rgba(187, 247, 208, 0.45)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.42);
    ctx.lineTo(width, height * 0.28);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Cuadros de chacras / lotes rurales suaves
    const parcels = [
      { x: 60, y: 210, w: 200, h: 115 },
      { x: 275, y: 195, w: 230, h: 130 },
      { x: 520, y: 180, w: 250, h: 145 },
      { x: 140, y: 335, w: 240, h: 95 },
      { x: 400, y: 335, w: 280, h: 95 }
    ];
    parcels.forEach(p => {
      ctx.fillStyle = 'rgba(134, 239, 172, 0.25)';
      ctx.strokeStyle = 'rgba(22, 163, 74, 0.28)';
      ctx.lineWidth = 1;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    });

    // Curso hidrográfico de referencia (Río / Canal Principal del Valle)
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.52);
    ctx.bezierCurveTo(width * 0.35, height * 0.44, width * 0.65, height * 0.58, width, height * 0.46);
    ctx.stroke();

    // Mancha urbana de referencia (Ciudad Cabecera al Norte/Noroeste)
    ctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(70, 58, 250, 92, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`REFERENCIA URBANA: ${locality.toUpperCase()}`, 195, 86);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Casco Urbano y Nudo Vial de Acceso', 195, 106);

    // Grilla cartográfica clara
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 1;
    for (let gx = 80; gx < width; gx += 100) {
      ctx.beginPath();
      ctx.moveTo(gx, 48);
      ctx.lineTo(gx, height - 48);
      ctx.stroke();
    }
    for (let gy = 90; gy < height - 48; gy += 75) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }

    // Rutas Nacionales y Provinciales de Referencia (amarillo/ámbar vial claro)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(195, 48);
    ctx.lineTo(440, height - 48);
    ctx.stroke();

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 130);
    ctx.lineTo(width, 230);
    ctx.stroke();
  }

  // Proyección geográfica exacta dentro del BBox regional ampliado (con márgenes seguros para etiquetas)
  const projectPoint = (lat: number, lng: number, idx: number, total: number) => {
    const normX = (lng - bbox.minLng) / (bbox.maxLng - bbox.minLng || 0.1);
    const normY = (bbox.maxLat - lat) / (bbox.maxLat - bbox.minLat || 0.1);
    let px = normX * width;
    let py = normY * height;

    // Si los puntos están muy próximos o fuera del margen útil, distribuirlos armónicamente manteniendo orientación
    if (
      px < 130 ||
      px > width - 130 ||
      py < 95 ||
      py > height - 95 ||
      !hasRealMapImage
    ) {
      const ratio = total > 1 ? idx / (total - 1) : 1;
      px = 210 + ratio * (width - 420);
      py = 135 + ratio * (height - 255);
    }
    return { x: px, y: py };
  };

  const screenPoints = waypoints.map((wp, idx) => ({
    ...projectPoint(wp.lat, wp.lng, idx, waypoints.length),
    label:
      wp.label ||
      (idx === 0
        ? `1. Referencia Ruta Principal (${locality})`
        : idx === waypoints.length - 1
          ? `3. TRANQUERA QR • ${venueName}`
          : `2. Desvío Vial Señalizado`),
    lat: wp.lat,
    lng: wp.lng,
    isDestination: idx === waypoints.length - 1
  }));

  // 1. Halo exterior blanco para despegar la ruta sobre cualquier mapa vial o satelital
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 16;
  ctx.beginPath();
  screenPoints.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.stroke();

  // 2. Línea continua verde institucional (#006633) de alto contraste
  ctx.strokeStyle = '#006633';
  ctx.lineWidth = 10;
  ctx.stroke();

  // 3. Trazo interior punteado amarillo/dorado (#DDDB00) indicando RUTA DESTACADA
  ctx.strokeStyle = '#DDDB00';
  ctx.lineWidth = 4.5;
  ctx.setLineDash([12, 8]);
  ctx.stroke();
  ctx.restore();

  // 4. Nodos numerados y etiquetas blancas de alta legibilidad para cada Hito Vial
  screenPoints.forEach((pt, idx) => {
    const radius = pt.isDestination ? 17 : 13;

    if (pt.isDestination) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 28, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 102, 51, 0.22)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = pt.isDestination ? '#006633' : idx === 0 ? '#0284c7' : '#d97706';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Número del hito
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(idx + 1), pt.x, pt.y);

    // Etiqueta clara con fondo blanco/marfil y borde de color para lectura perfecta
    const cleanLabel = pt.label.replace(/^[0-9]+\.\s*/, '').slice(0, 42);
    const badgeText = `${idx + 1}. ${cleanLabel}`;
    ctx.font = 'bold 12px sans-serif';
    const textWidth = ctx.measureText(badgeText).width;
    const boxW = textWidth + 22;
    const boxH = 28;

    // Posicionar las etiquetas alternando arriba/abajo para que nunca se superpongan
    const offsetY = idx === 0 ? -44 : idx === 1 ? 20 : -48;
    const boxX = Math.min(Math.max(14, pt.x - boxW / 2), width - boxW - 14);
    const boxY = Math.min(Math.max(54, pt.y + offsetY), height - 86);

    ctx.fillStyle = pt.isDestination ? '#006633' : 'rgba(255, 255, 255, 0.96)';
    ctx.strokeStyle = pt.isDestination ? '#DDDB00' : idx === 0 ? '#0284c7' : '#d97706';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = pt.isDestination ? '#ffffff' : '#0f172a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, boxX + 11, boxY + boxH / 2);
  });

  // 5. Franja Superior Institucional de la Captura
  ctx.fillStyle = '#0c2d1e';
  ctx.fillRect(0, 0, width, 46);
  ctx.fillStyle = '#DDDB00';
  ctx.fillRect(0, 46, width, 3);

  ctx.fillStyle = '#DDDB00';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(
    'MAPA REGIONAL DE ACCESO (VISTA AMPLIADA CON REFERENCIAS VIALES) • CÓMO LLEGAR',
    16,
    17
  );

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`${venueName} — Referencia: ${locality}`.slice(0, 74), 16, 35);

  // Rosa de los vientos y Escala Regional arriba a la derecha
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = '#006633';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(width - 175, 58, 160, 32, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#006633';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🧭 NORTE ▲  |  Escala: ~2,5 km', width - 95, 74);

  // 6. Franja Inferior de Telemetría GPS y Dirección Vial
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, height - 48, width, 48);
  ctx.fillStyle = '#10b981';
  ctx.fillRect(0, height - 48, width, 2.5);

  ctx.fillStyle = '#DDDB00';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(
    `DESTINO GPS DECIMAL: ${nav.decimalLabel}   |   GMS: ${nav.dmsLabel}`,
    16,
    height - 28
  );

  ctx.fillStyle = '#f8fafc';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Referencia Vial y Acceso: ${nav.address} (${locality})`.slice(0, 95), 16, height - 11);
}

/**
 * Genera de manera sincrónica una captura cartográfica VIAL CLARA en formato DataURL PNG (900x480)
 * con referencias regionales, la Ruta Destacada, hitos numerados y telemetría GPS.
 */
export function renderSyncEventMapSnapshotDataUrl(
  event?: Partial<FieldEvent> | null
): string | undefined {
  if (typeof document === 'undefined') return undefined;
  try {
    const width = 900;
    const height = 480;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    paintCartographicOverlayOnCanvas(ctx, width, height, event || DEFAULT_FIELD_EVENTS[0], false);
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  }
}

/**
 * Captura en alta resolución (900x480 PNG) el mapa regional ALEJADO Y CLARO del evento
 * (descargando el mapa vial/topográfico regional de Esri World_Street_Map con ciudades, rutas RN3/RP7
 * y referencias, o World_Imagery si se elige satélite, y superponiendo la Ruta Destacada y los 3 Hitos).
 */
export async function captureEventRouteMapSnapshotDataUrl(
  event?: Partial<FieldEvent> | null,
  mode: 'satellite' | 'street' = 'street'
): Promise<string | undefined> {
  if (typeof document === 'undefined') return undefined;
  const targetEvent = event || DEFAULT_FIELD_EVENTS[0];
  const nav = buildEventGpsNavigationLinks(targetEvent);
  const width = 900;
  const height = 480;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const waypoints =
      targetEvent.routeWaypoints && targetEvent.routeWaypoints.length >= 2
        ? targetEvent.routeWaypoints
        : [
            { lat: nav.lat + 0.024, lng: nav.lng - 0.018 },
            { lat: nav.lat, lng: nav.lng }
          ];

    const bbox = computeRegionalMapBbox(nav.lat, nav.lng, waypoints);
    const serviceName = mode === 'satellite' ? 'World_Imagery' : 'World_Street_Map';
    const exportUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/${serviceName}/MapServer/export?bbox=${bbox.bboxString}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=png&f=image`;

    const loadedMapImg = await new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timer = setTimeout(() => resolve(null), 3200);
      img.onload = () => {
        clearTimeout(timer);
        resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
      img.src = exportUrl;
    });

    let drawnRealMap = false;
    if (loadedMapImg) {
      try {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(loadedMapImg, 0, 0, width, height);
        drawnRealMap = true;
      } catch {}
    }

    paintCartographicOverlayOnCanvas(ctx, width, height, targetEvent, drawnRealMap);
    return canvas.toDataURL('image/png');
  } catch {
    return renderSyncEventMapSnapshotDataUrl(targetEvent);
  }
}

/**
 * Descarga directamente la captura del mapa regional claro con la Ruta Destacada y Coordenadas GPS como imagen PNG.
 */
export async function downloadEventMapSnapshotPNG(
  event?: Partial<FieldEvent> | null,
  mode: 'satellite' | 'street' = 'street'
): Promise<void> {
  if (typeof window === 'undefined') return;
  const targetEvent = event || DEFAULT_FIELD_EVENTS[0];
  const dataUrl =
    (await captureEventRouteMapSnapshotDataUrl(targetEvent, mode)) ||
    renderSyncEventMapSnapshotDataUrl(targetEvent);
  if (!dataUrl) return;

  const safeSlug = String(targetEvent.slug || targetEvent.id || 'evento-hempc').replace(
    /[^a-zA-Z0-9_-]/g,
    '_'
  );
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `Captura_Mapa_Como_Llegar_${safeSlug}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Dibuja en una página de un documento jsPDF el "INSTRUCTIVO OFICIAL DE CÓMO LLEGAR Y CAPTURA CARTOGRÁFICA DE RUTA"
 * completo (con la imagen capturada del mapa, los 3 tramos viales detallados, las coordenadas Decimal/GMS y enlaces GPS).
 */
export function renderHowToArriveInstructivoPageOnDoc(
  doc: jsPDF,
  event: Partial<FieldEvent>,
  attendee?: Partial<User>,
  mapSnapshotDataUrl?: string,
  qrPngDataUrl?: string
): void {
  const nav = buildEventGpsNavigationLinks(event);
  const venueName = event.venueName || DEFAULT_FIELD_EVENTS[0].venueName;
  const locality = event.locality || DEFAULT_FIELD_EVENTS[0].locality;
  const eventTitle = event.title || DEFAULT_FIELD_EVENTS[0].title;
  const eventDate = event.dateLabel || DEFAULT_FIELD_EVENTS[0].dateLabel;
  const ticketCode = attendee?.eventTicketCode || `${event.ticketPrefix || 'SIEMBRA-21N'}-OFICIAL`;
  const attendeeName = (attendee?.name || 'Visitante Acreditado').toUpperCase();
  const resolvedMapDataUrl = mapSnapshotDataUrl || renderSyncEventMapSnapshotDataUrl(event);

  // 1. Encabezado Institucional del Instructivo de Cómo Llegar
  doc.setFillColor(12, 45, 30);
  doc.rect(0, 0, 210, 38, 'F');
  doc.setFillColor(221, 219, 0);
  doc.rect(0, 38, 210, 2.2, 'F');

  doc.setTextColor(221, 219, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text('ANEXO VIAL Y CARTOGRÁFICO • INSTRUCTIVO OFICIAL DE CÓMO LLEGAR AL ESTABLECIMIENTO', 12, 10);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('MAPA DE UBICACIÓN, RUTA DESTACADA Y CONEXIÓN GPS', 12, 18.5);

  doc.setFontSize(9.5);
  doc.setTextColor(167, 243, 208);
  doc.text(`${eventTitle} — Sede: ${venueName} (${locality})`, 12, 25.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Fecha: ${eventDate}   |   Titular: ${attendeeName.slice(0, 34)}   |   Pase QR: ${ticketCode}`,
    12,
    32.5
  );

  // 2. CAPTURA DEL MAPA CON LA RUTA DESTACADA (186 mm x 94 mm)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(0, 102, 51);
  doc.setLineWidth(0.8);
  doc.roundedRect(12, 45, 186, 96, 3, 3, 'FD');

  if (resolvedMapDataUrl) {
    try {
      doc.addImage(resolvedMapDataUrl, 'PNG', 13, 46, 184, 94);
    } catch {}
  }

  // 3. FICHA TÉCNICA DE GEOLOCALIZACIÓN Y BOTONES GPS INTERACTIVOS
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(0, 102, 51);
  doc.setLineWidth(0.5);
  doc.roundedRect(12, 145, 186, 32, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 102, 51);
  doc.text('ESTABLECIMIENTO DEL EVENTO:', 16, 151.5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.2);
  doc.text(`${venueName} (${locality})`.slice(0, 68), 66, 151.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 102, 51);
  doc.text('DIRECCIÓN / ACCESO VIAL:', 16, 157.5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.8);
  doc.text(nav.address.slice(0, 74), 60, 157.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 102, 51);
  doc.text('COORDENADAS GPS OFICIALES:', 16, 163.5);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(12, 45, 30);
  doc.text(`Decimal: ${nav.decimalLabel}   |   Sexagesimal (GMS): ${nav.dmsLabel}`, 64, 163.5);

  // Botones clickeables en el PDF para abrir Google Maps GPS y Waze GPS
  doc.setFillColor(2, 132, 199);
  doc.roundedRect(16, 167, 86, 7.5, 1.8, 1.8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('ABRIR RUTA EN GOOGLE MAPS (GPS CELULAR)', 59, 171.8, { align: 'center' });
  try {
    doc.link(16, 167, 86, 7.5, { url: nav.googleMapsDirectionsUrl });
  } catch {}

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(106, 167, 88, 7.5, 1.8, 1.8, 'F');
  doc.setTextColor(221, 219, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('INICIAR NAVEGACIÓN EN WAZE GPS', 150, 171.8, { align: 'center' });
  try {
    doc.link(106, 167, 88, 7.5, { url: nav.wazeNavigateUrl });
  } catch {}

  // 4. INSTRUCTIVO PASO A PASO DE CÓMO LLEGAR (3 TRAMOS VIALES)
  doc.setTextColor(12, 45, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INSTRUCTIVO VIAL PASO A PASO: CÓMO LLEGAR HASTA LA TRANQUERA DE ACREDITACIÓN', 12, 185);
  doc.setDrawColor(0, 102, 51);
  doc.setLineWidth(0.5);
  doc.line(12, 187, 198, 187);

  let stepY = 191;
  nav.routeSteps.forEach((step, idx) => {
    doc.setFillColor(idx === 2 ? 236 : 248, idx === 2 ? 253 : 250, idx === 2 ? 245 : 252);
    doc.setDrawColor(idx === 2 ? 16 : 203, idx === 2 ? 185 : 213, idx === 2 ? 129 : 225);
    doc.setLineWidth(0.4);
    doc.roundedRect(12, stepY, 186, 20, 2.2, 2.2, 'FD');

    // Círculo numerado
    doc.setFillColor(idx === 2 ? 0 : idx === 0 ? 2 : 217, idx === 2 ? 102 : idx === 0 ? 132 : 119, idx === 2 ? 51 : idx === 0 ? 199 : 6);
    doc.circle(20, stepY + 10, 4.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(String(step.stepNumber), 20, stepY + 11, { align: 'center' });

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.text(step.title.slice(0, 82), 28, stepY + 5.5);

    doc.setFont('courier', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(0, 102, 51);
    doc.text(`GPS: ${step.coordinatesLabel}`, 194, stepY + 5.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(51, 65, 85);
    const descLines = doc.splitTextToSize(step.description, 165);
    doc.text(descLines.slice(0, 2), 28, stepY + 11);

    stepY += 22.5;
  });

  // 5. PROTOCOLO DE ARRIBO Y GUARDIA VIAL EN TRANQUERA
  doc.setFillColor(12, 45, 30);
  doc.roundedRect(12, 260, 186, 16, 2.5, 2.5, 'F');
  doc.setTextColor(221, 219, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PROTOCOLO DE INGRESO EN TRANQUERA Y ASISTENCIA EN RUTA:', 16, 265.5);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.text(
    `1) Al arribar al puesto de control, exhibir el Pase QR (${ticketCode}) y DNI físico.  2) Circular a máx. 20 km/h por caminos internos.`,
    16,
    270.2
  );
  doc.text(
    `3) Guardia Vial / Tranquera WhatsApp: ${event.gatekeeperPhone || '+54 9 280 469-7193'}  |   Enlace GPS directo en el botón superior.`,
    16,
    274.2
  );

  if (qrPngDataUrl) {
    try {
      doc.addImage(qrPngDataUrl, 'PNG', 182, 261, 14, 14);
    } catch {}
  }

  // Pie de página
  doc.setDrawColor(203, 213, 225);
  doc.line(12, 279, 198, 279);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(12, 45, 30);
  doc.text(
    'PatagonianC LTDA Cooperativa de Trabajo · Matrícula INAES 68218 · CUIT: 30-71816113-0 · notificaciones@hempc.com.ar',
    105,
    283.5,
    { align: 'center' }
  );
}

/**
 * Descarga un PDF exclusivo con el "Instructivo de Cómo Llegar + Captura Cartográfica del Mapa y Ruta Destacada".
 */
export async function downloadEventHowToArriveGuidePDF(
  event: Partial<FieldEvent>,
  attendee?: Partial<User>,
  preCapturedMapDataUrl?: string
): Promise<void> {
  const mapDataUrl =
    preCapturedMapDataUrl ||
    (await captureEventRouteMapSnapshotDataUrl(event, 'street')) ||
    renderSyncEventMapSnapshotDataUrl(event);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  renderHowToArriveInstructivoPageOnDoc(doc, event, attendee, mapDataUrl);

  const safeSlug = String(event.slug || event.id || 'Evento_HempC').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Instructivo_Como_Llegar_Mapa_${safeSlug}.pdf`);
}

/**
 * Genera y descarga la CREDENCIAL / PASE OFICIAL DE ACREDITACIÓN QR (PDF A4 de 2 páginas):
 * - Página 1: Credencial Oficial con QR, datos del titular, captura del mapa de ruta y cronograma.
 * - Página 2: Instructivo Completo de Cómo Llegar con Captura Cartográfica Ampliada del Mapa, Tramos Viales y GPS.
 */
export function downloadEventAccreditationPassPDF(
  event: FieldEvent,
  attendee: Partial<User>,
  qrPngDataUrl?: string,
  mapSnapshotDataUrl?: string
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ticketCode = attendee.eventTicketCode || `${event.ticketPrefix || 'SIEMBRA-21N'}-OFICIAL`;
  const attendeeName = (attendee.name || 'Visitante Acreditado').toUpperCase();
  const attendeeDni = attendee.dniNumber || 'Presentar DNI físico en puerta';
  const attendeeEmail = attendee.email || 'S/D';
  const attendeePhone = attendee.phone || 'S/D';
  const attendeeOrg = attendee.organizationName || 'Visitante / Invitado General';
  const attendeeLoc = attendee.localityOrProvince || event.locality || 'VIRCH – Trelew, Chubut';
  const approvedDate = attendee.approvedAt || new Date().toISOString().split('T')[0];
  const approvedBy = attendee.approvedBy || 'Administración Central HempC';
  const resolvedMapSnapshot = mapSnapshotDataUrl || renderSyncEventMapSnapshotDataUrl(event);

  // 1. Encabezado Institucional de Credencial Oficial
  doc.setFillColor(12, 45, 30);
  doc.rect(0, 0, 210, 44, 'F');
  doc.setFillColor(221, 219, 0);
  doc.rect(0, 44, 210, 2.5, 'F');

  doc.setTextColor(221, 219, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PATAGONIANC LTDA COOPERATIVA DE TRABAJO • RED COOPERATIVA HEMPC / NUCLEUS', 14, 11);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text('CREDENCIAL OFICIAL DE ACREDITACIÓN • PASE DE INGRESO QR', 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(167, 243, 208);
  doc.text(event.title, 14, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`Sede: ${event.venueName} (${event.locality})`, 14, 34.5);
  doc.text(`Fecha y Horario: ${event.dateLabel}  |  Organizan: ${event.organizer}`, 14, 40);

  // 2. Tarjeta Principal de Credencial con Datos del Registro + QR Escaneable
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(0, 102, 51);
  doc.setLineWidth(0.8);
  doc.roundedRect(12, 52, 186, 86, 4, 4, 'FD');

  // Franja de estado de acreditación
  doc.setFillColor(0, 102, 51);
  doc.rect(12, 52, 186, 11, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('ESTADO: ACREDITACIÓN OFICIAL APROBADA POR ADMINISTRACIÓN (PASE PERSONAL E INTRANSFERIBLE)', 17, 59);

  // Columna Izquierda: Datos Completos del Registro (x = 17..134)
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.text('APELLIDO Y NOMBRE DEL ASISTENTE ACREDITADO:', 17, 71);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(attendeeName.slice(0, 34), 17, 78);

  const drawField = (label: string, val: string, x: number, y: number, maxLen = 30) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(val || '-').slice(0, maxLen), x, y + 5);
  };

  drawField('DNI / CUIT (Identificación):', attendeeDni, 17, 86, 24);
  drawField('Teléfono / WhatsApp:', attendeePhone, 78, 86, 24);

  drawField('Correo Electrónico Registrado:', attendeeEmail, 17, 99, 36);
  drawField('Localidad / Provincia:', attendeeLoc, 92, 99, 22);

  drawField('Institución / Establecimiento / Procedencia:', attendeeOrg, 17, 112, 42);
  drawField('Aprobado por / Fecha:', `${approvedBy.slice(0, 18)} (${approvedDate})`, 92, 112, 26);

  // Banda inferior con Código Oficial de Pase
  doc.setFillColor(12, 45, 30);
  doc.roundedRect(17, 123, 116, 11, 2, 2, 'F');
  doc.setTextColor(221, 219, 0);
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.text(`PASE OFICIAL N°: ${ticketCode}`, 21, 130);

  // Columna Derecha: Recuadro de Código QR Escaneable
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.roundedRect(140, 66, 52, 68, 3, 3, 'FD');

  if (qrPngDataUrl) {
    try {
      doc.addImage(qrPngDataUrl, 'PNG', 144, 69, 44, 44);
    } catch {}
  } else {
    doc.setDrawColor(12, 45, 30);
    doc.setLineWidth(0.7);
    doc.rect(146, 72, 40, 40);
    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(12, 45, 30);
    doc.text('PASE VERIFICADO', 166, 89, { align: 'center' });
    doc.setFontSize(9.5);
    doc.text(ticketCode, 166, 96, { align: 'center' });
    doc.setFontSize(7);
    doc.text('CONTROL EN PUERTA', 166, 103, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(12, 45, 30);
  doc.text('CONTROL DE ACCESO QR', 166, 119, { align: 'center' });
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(ticketCode, 166, 124, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Presentar con DNI en Tranquera', 166, 129, { align: 'center' });

  // 3. SECCIÓN CARTOGRÁFICA CON CAPTURA DEL MAPA, RUTA DESTACADA Y NAVEGACIÓN GPS CELULAR
  const nav = buildEventGpsNavigationLinks(event);

  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(0, 102, 51);
  doc.setLineWidth(0.6);
  doc.roundedRect(12, 142, 186, 62, 3.5, 3.5, 'FD');

  doc.setFillColor(12, 45, 30);
  doc.rect(12, 142, 186, 8.5, 'F');
  doc.setTextColor(221, 219, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text(
    'CAPTURA DE MAPA, RUTA DESTACADA DE ACCESO Y CONEXIÓN A GPS CELULAR (VER DETALLE EN PÁG. 2)',
    16,
    147.8
  );

  // Miniatura de la Captura del Mapa en Página 1 (x=16..84, y=153..200)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.4);
  doc.roundedRect(16, 153, 68, 47, 2.5, 2.5, 'FD');

  if (resolvedMapSnapshot) {
    try {
      doc.addImage(resolvedMapSnapshot, 'PNG', 16.5, 153.5, 67, 46);
    } catch {}
  }

  // Datos Viales, Ruta Destacada y Enlace Directo al GPS del Celular (Derecha: x=88..194, y=154..200)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 102, 51);
  doc.text('ESTABLECIMIENTO Y DIRECCIÓN VIAL:', 88, 157);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${event.venueName} — ${nav.address}`.slice(0, 62), 88, 161.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 102, 51);
  doc.text('COORDENADAS OFICIALES PARA GPS:', 88, 167.5);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text(`Decimal: ${nav.decimalLabel}  |  GMS: ${nav.dmsLabel}`, 88, 172);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 102, 51);
  doc.text('INSTRUCTIVO DE RUTA DESTACADA:', 88, 177.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.3);
  doc.setTextColor(51, 65, 85);
  const routeLines = doc.splitTextToSize(nav.routeInstructions, 105);
  doc.text(routeLines.slice(0, 3), 88, 181.5);

  // Botón Clickeable de Navegación GPS en el PDF
  doc.setFillColor(0, 102, 51);
  doc.roundedRect(88, 191.5, 104, 9, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('TOCAR AQUÍ PARA ABRIR RUTA EN EL GPS DEL CELULAR (GOOGLE MAPS)', 140, 197.2, {
    align: 'center'
  });
  try {
    doc.link(88, 191.5, 104, 9, { url: nav.googleMapsDirectionsUrl });
  } catch {}

  // 4. Cronograma Oficial Resumido en la misma hoja de la Credencial
  doc.setTextColor(12, 45, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('CRONOGRAMA OFICIAL DE LA JORNADA Y PROTOCOLO DE CAMPO', 12, 212);
  doc.setDrawColor(0, 102, 51);
  doc.setLineWidth(0.5);
  doc.line(12, 214, 198, 214);

  let y = 219;
  const schedule = event.scheduleItems && event.scheduleItems.length > 0 ? event.scheduleItems : EVENT_SCHEDULE_ITEMS;
  schedule.slice(0, 6).forEach(item => {
    if (y > 272) return;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(12, y - 3.5, 186, 8.8, 1.5, 1.5, 'F');
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 102, 51);
    doc.text(item.time, 15, y + 1.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text(`${item.block} — ${item.subBlock || ''}`.slice(0, 74), 42, y - 0.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(String(item.description || '').slice(0, 96), 42, y + 3.5);

    y += 9.8;
  });

  // 5. Pie de Página 1
  doc.setDrawColor(203, 213, 225);
  doc.line(12, 279, 198, 279);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(12, 45, 30);
  doc.text(
    'PatagonianC LTDA Cooperativa de Trabajo · Matrícula INAES 68218 · CUIT: 30-71816113-0 · Página 1 de 2 (Credencial QR)',
    105,
    283.5,
    { align: 'center' }
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'En la Página 2 se adjunta la Captura Ampliada del Mapa Satelital y el Instructivo Vial Paso a Paso de Cómo Llegar.',
    105,
    288,
    { align: 'center' }
  );

  // =========================================================================
  // PÁGINA 2: CAPTURA AMPLIADA DEL MAPA + INSTRUCTIVO COMPLETO DE CÓMO LLEGAR
  // =========================================================================
  doc.addPage();
  renderHowToArriveInstructivoPageOnDoc(doc, event, attendee, resolvedMapSnapshot, qrPngDataUrl);

  const safeName = String(attendee.name || 'Asistente').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Credencial_Pase_QR_${ticketCode}_${safeName}.pdf`);
}


