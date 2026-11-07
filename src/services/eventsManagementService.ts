import jsPDF from 'jspdf';
import { User, FieldEvent, FieldEventCategory, FieldEventStatus } from '../../types';
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
    venueName: 'Chacra Experimental PatagonianC LTDA',
    locality: 'VIRCH – Trelew, Chubut',
    organizer: 'PatagonianC LTDA & UATRE • UNLZ',
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
    venueName: 'Chacra Experimental PatagonianC LTDA & Establecimiento La Regina',
    locality: 'VIRCH – Trelew / Gaiman, Chubut',
    organizer: 'Dirección Técnica HempC & INTA Chubut',
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
    venueName: 'INTA Estación Experimental Agropecuaria Chubut',
    locality: 'Trelew, Chubut',
    organizer: 'PatagonianC LTDA • INTA EEA Chubut',
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
        description: 'Registro de ingreso en el predio experimental INTA EEA Chubut.'
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
    locationId: eventData.locationId,
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
