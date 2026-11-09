import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar as CalendarIcon,
  Plus,
  UserCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Download,
  Mail,
  MapPin,
  Users,
  ShieldCheck,
  ShieldAlert,
  QrCode,
  Copy,
  Check,
  Edit2,
  Trash2,
  Award,
  FileText,
  AlertTriangle,
  Building2,
  Phone,
  Lock,
  Loader2,
  X,
  UserPlus,
  Sparkles,
  CloudRain,
  RefreshCw,
  Megaphone
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import {
  User,
  FieldEvent,
  FieldEventCategory,
  FieldEventStatus,
  FieldEventNotificationStage
} from '../types';
import {
  OFFICIAL_SEMBRA_EVENT_ID,
  CATEGORY_LABELS,
  STATUS_LABELS,
  partitionUsersByScope,
  isEventOnlyAttendee,
  resolveAttendeeEventId,
  resolveEventAccreditationStatus,
  createEventRegistrationRecord,
  approveEventAttendeeByAdmin,
  rejectEventAttendeeByAdmin,
  checkInEventAttendeeByAdmin,
  downloadEventAttendanceSheetPDF,
  downloadEventAttendanceCertificatePDF,
  downloadEventAccreditationPassPDF,
  captureEventRouteMapSnapshotDataUrl,
  downloadEventHowToArriveGuidePDF,
  svgElementToPngDataUrl,
  buildEnabledEstablishmentsOptions,
  resolveEventVenueFromSelection,
  parseCoordinateString,
  buildEventGpsNavigationLinks,
  downloadEventCalendarICS,
  prepareEventNotificationStageByAdmin
} from '../src/services/eventsManagementService';
import { downloadUnDiaDeSiembraProgramPDF } from '../src/services/eventProgramPdfService';
import {
  sendEventAccreditationApprovedEmail,
  sendEventStatusUpdateEmail
} from '../src/services/emailNotificationService';
import EventRouteMapPreview from '../components/EventRouteMapPreview';

export default function Events() {
  const navigate = useNavigate();
  const {
    currentUser,
    usersList,
    addUser,
    updateUser,
    deleteUser,
    allLocations,
    clients,
    fieldEvents,
    saveFieldEvent,
    deleteFieldEvent
  } = useAppContext();

  const isAdmin =
    currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Navegación interna de pestañas del módulo EVENTOS
  const [activeTab, setActiveTab] = useState<'accreditations' | 'calendar' | 'checkin'>('accreditations');
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending_admin' | 'accredited' | 'checked_in' | 'rejected'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Toast de notificaciones y acciones
  const [toast, setToast] = useState<{
    show: boolean;
    success: boolean;
    title: string;
    message: string;
  } | null>(null);

  // Modal de Crear / Editar Evento o Visita Programada
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [eventForm, setEventForm] = useState<Partial<FieldEvent>>({
    title: '',
    subtitle: '',
    category: 'visita_programada',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:30',
    endTime: '14:00',
    venueName: 'Chacra Experimental PatagonianC LTDA',
    locality: 'VIRCH – Trelew, Chubut',
    organizer: 'PatagonianC LTDA • HempC Nucleus',
    maxCapacity: 60,
    status: 'inscripcion_abierta',
    ticketPrefix: 'VISITA-VIRCH',
    weatherWarning:
      'Actividad sujeta a condiciones meteorológicas. Presentarse con DNI y Pase QR en tranquera.',
    description: ''
  });

  // Modal de Inscripción Manual de Visitante a Jornada por el Administrador
  const [isManualAttendeeModalOpen, setIsManualAttendeeModalOpen] = useState(false);
  const [isSavingManualAttendee, setIsSavingManualAttendee] = useState(false);
  const [manualAttendeeForm, setManualAttendeeForm] = useState({
    name: '',
    email: '',
    phone: '',
    dniNumber: '',
    organizationName: '',
    localityOrProvince: 'Trelew, Chubut',
    eventId: OFFICIAL_SEMBRA_EVENT_ID,
    autoApproveAndSendEmail: true
  });

  // Modal de Vista Previa de Pase QR de Asistente o QR de Evento
  const [qrModalTarget, setQrModalTarget] = useState<{
    type: 'event' | 'attendee';
    event: FieldEvent;
    attendee?: User;
  } | null>(null);

  // Estado para Re-envío de Pase QR y Modal de Eliminación Definitiva de Base de Datos
  const [resendingPassId, setResendingPassId] = useState<string | null>(null);
  const [attendeeToDelete, setAttendeeToDelete] = useState<User | null>(null);
  const [isDeletingAttendee, setIsDeletingAttendee] = useState(false);

  // Modal Oficial de Notificación de Dos Estadios: 1) Actualización de Actividades/Modificaciones, 2) Suspensión por Condiciones Climáticas
  const [isNotifyStageModalOpen, setIsNotifyStageModalOpen] = useState(false);
  const [isSendingStageNotification, setIsSendingStageNotification] = useState(false);
  const [notifyStageForm, setNotifyStageForm] = useState<{
    eventId: string;
    stage: FieldEventNotificationStage;
    noticeMessage: string;
    addedActivitiesText: string;
    rescheduledDate: string;
    newStartTime: string;
    newEndTime: string;
    targetScope: 'all_registered' | 'only_accredited';
  }>({
    eventId: OFFICIAL_SEMBRA_EVENT_ID,
    stage: 'actualizacion_programa',
    noticeMessage: '',
    addedActivitiesText: '',
    rescheduledDate: '',
    newStartTime: '',
    newEndTime: '',
    targetScope: 'all_registered'
  });

  // Catálogo sincronizado de Establecimientos y Campos Habilitados en la Red
  const enabledEstablishments = useMemo(
    () => buildEnabledEstablishmentsOptions(allLocations || [], clients || []),
    [allLocations, clients]
  );
  const [quickCoordsInput, setQuickCoordsInput] = useState('');

  // Separación estricta de registros: Visitantes de Eventos vs Operadores del Sistema
  const { eventAttendees, systemUsers } = useMemo(
    () => partitionUsersByScope(usersList || []),
    [usersList]
  );

  // También incluimos en la vista de un evento a cualquier operador del sistema que además tenga ticket para la jornada
  const allEventParticipants = useMemo(() => {
    const map = new Map<string, User>();
    eventAttendees.forEach(att => map.set(att.id, att));
    systemUsers.forEach(su => {
      if (su.eventRegistered || su.eventTicketCode) {
        map.set(su.id, su);
      }
    });
    return Array.from(map.values());
  }, [eventAttendees, systemUsers]);

  const activeSelectedEvent = useMemo(() => {
    if (selectedEventId === 'all') return fieldEvents[0];
    return fieldEvents.find(e => e.id === selectedEventId) || fieldEvents[0];
  }, [fieldEvents, selectedEventId]);

  const filteredAttendees = useMemo(() => {
    return allEventParticipants.filter(att => {
      const attEvtId = resolveAttendeeEventId(att, fieldEvents);
      const matchEvent = selectedEventId === 'all' || attEvtId === selectedEventId;
      const attStatus = resolveEventAccreditationStatus(att);
      const matchStatus = statusFilter === 'all' || attStatus === statusFilter;
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        (att.name || '').toLowerCase().includes(q) ||
        (att.email || '').toLowerCase().includes(q) ||
        (att.dniNumber || '').toLowerCase().includes(q) ||
        (att.eventTicketCode || '').toLowerCase().includes(q) ||
        (att.organizationName || '').toLowerCase().includes(q) ||
        (att.localityOrProvince || '').toLowerCase().includes(q);

      return matchEvent && matchStatus && matchSearch;
    });
  }, [allEventParticipants, fieldEvents, selectedEventId, statusFilter, searchTerm]);

  // Métricas operativas de EVENTOS
  const metrics = useMemo(() => {
    const totalIsolatedVisitors = eventAttendees.length;
    const pendingCount = allEventParticipants.filter(
      a => resolveEventAccreditationStatus(a) === 'pending_admin'
    ).length;
    const accreditedCount = allEventParticipants.filter(
      a => resolveEventAccreditationStatus(a) === 'accredited'
    ).length;
    const checkedInCount = allEventParticipants.filter(
      a => resolveEventAccreditationStatus(a) === 'checked_in'
    ).length;
    return {
      totalEvents: fieldEvents.length,
      totalIsolatedVisitors,
      pendingCount,
      accreditedCount,
      checkedInCount
    };
  }, [fieldEvents, eventAttendees, allEventParticipants]);

  // BLOQUEO ESTRICTO: Solo Administradores pueden ver y operar EVENTOS
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto my-16 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-8 text-center shadow-xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert size={28} />
        </div>
        <h1 className="text-xl font-black uppercase text-slate-900 dark:text-white">
          Sección Exclusiva para Administradores
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          La creación de jornadas de campo, visitas programadas y la acreditación de visitantes en{' '}
          <strong>EVENTOS</strong> se encuentra restringida exclusivamente a los Administradores de la plataforma.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-xl bg-[#006633] text-white text-xs font-black uppercase tracking-wider cursor-pointer"
        >
          Volver al Centro de Control
        </button>
      </div>
    );
  }

  const showNotice = (success: boolean, title: string, message: string) => {
    setToast({ show: true, success, title, message });
    setTimeout(() => {
      setToast(prev => (prev?.title === title ? null : prev));
    }, 6500);
  };

  // Acción Admin: Aprobar Acreditación a Jornada (Envía Pase QR + Programa PDF, SIN dar acceso al sistema)
  const handleApproveAccreditation = async (attendee: User) => {
    setActionLoadingId(attendee.id);
    try {
      const evtId = resolveAttendeeEventId(attendee, fieldEvents);
      const evt = fieldEvents.find(e => e.id === evtId) || fieldEvents[0];

      const updatedUser = approveEventAttendeeByAdmin({
        adminUser: currentUser,
        attendee,
        event: evt
      });

      await updateUser(updatedUser);

      const nav = buildEventGpsNavigationLinks(evt);
      const emailResult = await sendEventAccreditationApprovedEmail({
        toEmail: updatedUser.email,
        toName: updatedUser.name,
        eventId: evt.id,
        eventName: evt.title,
        eventDateLabel: evt.dateLabel,
        venueName: evt.venueName,
        locality: evt.locality,
        address: nav.address,
        lat: nav.lat,
        lng: nav.lng,
        routeInstructions: nav.routeInstructions,
        ticketCode: updatedUser.eventTicketCode || 'SIEMBRA-21N-OFICIAL',
        organizationName: updatedUser.organizationName,
        dniNumber: updatedUser.dniNumber,
        phone: updatedUser.phone,
        approvedBy: currentUser?.name || 'Administración Oficial PatagonianC'
      });

      showNotice(
        true,
        'Acreditación Oficial Aprobada + Mapa y GPS Enviados',
        `Se aprobó a ${updatedUser.name} (${updatedUser.eventTicketCode}) para "${evt.title}". Pase QR, Mapa con Ruta Destacada y enlace GPS Celular despachados a ${updatedUser.email} (${emailResult.deliveredVia}).`
      );
    } catch (err: any) {
      showNotice(
        false,
        'Error al aprobar acreditación',
        err?.message || 'No se pudo procesar la acreditación.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // Acción Admin: Registrar Check-in presencial en puerta
  const handleCheckInAttendee = async (attendee: User) => {
    setActionLoadingId(attendee.id);
    try {
      const updatedUser = checkInEventAttendeeByAdmin({
        adminUser: currentUser,
        attendee
      });
      await updateUser(updatedUser);
      showNotice(
        true,
        'Check-in en Puerta Registrado',
        `Asistencia presencial confirmada para ${updatedUser.name} (${updatedUser.eventTicketCode || 'Pase Verificado'}).`
      );
    } catch (err: any) {
      showNotice(false, 'Error en Check-in', err?.message || 'Fallo al registrar asistencia.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Acción Admin: Rechazar acreditación
  const handleRejectAttendee = async (attendee: User) => {
    setActionLoadingId(attendee.id);
    try {
      const updatedUser = rejectEventAttendeeByAdmin({
        adminUser: currentUser,
        attendee
      });
      await updateUser(updatedUser);
      showNotice(
        true,
        'Inscripción Rechazada',
        `El registro de ${updatedUser.name} fue marcado como rechazado en el padrón del evento.`
      );
    } catch (err: any) {
      showNotice(false, 'Error al rechazar', err?.message || 'No se pudo actualizar el estado.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Acción Admin: Re-enviar Pase QR de Acreditación por Correo Electrónico
  const handleResendAccreditationPass = async (attendee: User) => {
    setResendingPassId(attendee.id);
    try {
      const evtId = resolveAttendeeEventId(attendee, fieldEvents);
      const evt = fieldEvents.find(e => e.id === evtId) || fieldEvents[0];
      const currentStatus = resolveEventAccreditationStatus(attendee);

      let targetUser = attendee;
      if (currentStatus === 'pending_admin' || currentStatus === 'rejected') {
        targetUser = approveEventAttendeeByAdmin({
          adminUser: currentUser,
          attendee,
          event: evt
        });
        await updateUser(targetUser);
      }

      const nav = buildEventGpsNavigationLinks(evt);
      const emailResult = await sendEventAccreditationApprovedEmail({
        toEmail: targetUser.email,
        toName: targetUser.name,
        eventId: evt.id,
        eventName: evt.title,
        eventDateLabel: evt.dateLabel,
        venueName: evt.venueName,
        locality: evt.locality,
        address: nav.address,
        lat: nav.lat,
        lng: nav.lng,
        routeInstructions: nav.routeInstructions,
        ticketCode: targetUser.eventTicketCode || 'SIEMBRA-21N-OFICIAL',
        organizationName: targetUser.organizationName,
        dniNumber: targetUser.dniNumber,
        phone: targetUser.phone,
        approvedBy: targetUser.approvedBy || currentUser?.name || 'Administración Oficial PatagonianC'
      });

      showNotice(
        true,
        'Pase QR, Mapa y GPS Re-enviados por Correo',
        `Se re-envió la Credencial Oficial con Pase QR (${targetUser.eventTicketCode || 'SIEMBRA-21N'}), Mapa de Locación, Ruta Destacada y link al GPS del celular a ${targetUser.email} (${emailResult.deliveredVia}).`
      );
    } catch (err: any) {
      showNotice(
        false,
        'Error al re-enviar Pase QR',
        err?.message || 'No se pudo re-enviar el correo con el Pase QR.'
      );
    } finally {
      setResendingPassId(null);
    }
  };

  // Acción Admin: Eliminar definitivamente el registro del visitante de la Base de Datos (Supabase public.users)
  const handleConfirmDeleteAttendee = async () => {
    if (!attendeeToDelete) return;
    setIsDeletingAttendee(true);
    try {
      const target = attendeeToDelete;
      const isIsolatedVisitor = isEventOnlyAttendee(target);

      if (isIsolatedVisitor) {
        const deletedOk = await deleteUser(target.id);
        if (!deletedOk) {
          throw new Error('No se pudo eliminar el registro de la base de datos.');
        }
        showNotice(
          true,
          'Registro Eliminado de la Base de Datos',
          `El visitante "${target.name}" (${target.email}) fue eliminado definitivamente de la base de datos (Supabase public.users) y del padrón del evento.`
        );
      } else {
        // Si es un operador productivo del sistema que además tenía ticket de evento, solo limpiamos su inscripción al evento para proteger su cuenta operativa
        const cleanedOperator: User = {
          ...target,
          eventRegistered: false,
          eventConfirmedByEmail: false,
          eventTicketCode: undefined,
          eventAccreditationStatus: undefined,
          eventCheckedInAt: undefined,
          eventCheckedInBy: undefined
        };
        await updateUser(cleanedOperator);
        showNotice(
          true,
          'Inscripción a Jornada Removida',
          `Se quitó la inscripción al evento de "${target.name}" preservando su cuenta operativa en el sistema.`
        );
      }

      if (qrModalTarget?.attendee?.id === target.id) {
        setQrModalTarget(null);
      }
      setAttendeeToDelete(null);
    } catch (err: any) {
      showNotice(
        false,
        'Error al eliminar registro',
        err?.message || 'No se pudo completar la eliminación en la base de datos.'
      );
    } finally {
      setIsDeletingAttendee(false);
    }
  };

  // Acción Admin: Guardar nuevo Evento / Visita Programada
  const handleSaveEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fallbackVenue =
      (eventForm.venueName || '').trim() ||
      (eventForm.address || '').trim() ||
      enabledEstablishments.find(est => est.locationId === eventForm.locationId)?.venueName ||
      'Predio / Locación Oficial del Evento';

    const cleanTitle =
      (eventForm.title || '').trim() || `Visita Técnica Programada — ${fallbackVenue}`;
    const cleanDate =
      (eventForm.date || '').trim() || new Date().toISOString().split('T')[0];

    const resolvedLocality = (eventForm.locality || '').trim() || 'VIRCH – Trelew, Chubut';
    const resolvedAddress =
      (eventForm.address || '').trim() ||
      `Acceso señalizado hacia ${fallbackVenue} (${resolvedLocality})`;
    const resolvedCoords =
      eventForm.coordinates &&
      Number.isFinite(Number(eventForm.coordinates.lat)) &&
      Number.isFinite(Number(eventForm.coordinates.lng))
        ? {
            lat: Number(Number(eventForm.coordinates.lat).toFixed(6)),
            lng: Number(Number(eventForm.coordinates.lng).toFixed(6))
          }
        : { lat: -43.308362, lng: -65.289033 };

    const resolvedRouteInstructions =
      (eventForm.routeInstructions || '').trim() ||
      `1) Partir desde ${resolvedLocality} por ruta principal. 2) Tomar desvío señalizado en ${resolvedAddress}. 3) Ingresar por Tranquera de Acreditación de ${fallbackVenue} (GPS: ${resolvedCoords.lat.toFixed(6)}, ${resolvedCoords.lng.toFixed(6)}).`;

    const resolvedWaypoints = [
      {
        lat: Number((resolvedCoords.lat + 0.024).toFixed(6)),
        lng: Number((resolvedCoords.lng - 0.018).toFixed(6)),
        label: `1. Referencia Urbana / Ruta Principal (${resolvedLocality})`
      },
      {
        lat: Number((resolvedCoords.lat + 0.006).toFixed(6)),
        lng: Number((resolvedCoords.lng - 0.007).toFixed(6)),
        label: `2. Desvío Vial Señalizado (${resolvedAddress})`
      },
      {
        lat: resolvedCoords.lat,
        lng: resolvedCoords.lng,
        label: `3. Tranquera de Acreditación • ${fallbackVenue}`
      }
    ];

    setIsSavingEvent(true);
    try {
      const saved = await saveFieldEvent({
        ...eventForm,
        title: cleanTitle,
        date: cleanDate,
        venueName: fallbackVenue,
        locality: resolvedLocality,
        address: resolvedAddress,
        coordinates: resolvedCoords,
        routeInstructions: resolvedRouteInstructions,
        routeWaypoints: resolvedWaypoints
      });
      setIsEventModalOpen(false);
      setSelectedEventId(saved.id);
      setManualAttendeeForm(prev => ({ ...prev, eventId: saved.id }));
      // Cambiar automáticamente a la vista de Calendario para visualizar el nuevo evento creado con su georreferencia y link de inscripción
      setActiveTab('calendar');
      showNotice(
        true,
        'Nuevo Evento Creado y Georreferenciado en Calendario',
        `Se guardó "${saved.title}" (${saved.dateLabel}) en ${saved.venueName} [GPS: ${saved.coordinates?.lat.toFixed(5)}, ${saved.coordinates?.lng.toFixed(5)}]. Ya está activo para inscripciones y envío automático de mapa y GPS al asistente.`
      );
    } catch (err: any) {
      showNotice(false, 'Error al guardar evento', err?.message || 'Verifique los datos ingresados.');
    } finally {
      setIsSavingEvent(false);
    }
  };

  // Acción Admin: Inscribir Visitante Manualmente a un Evento
  const handleSaveManualAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAttendeeForm.name.trim() || !manualAttendeeForm.email.trim()) return;
    setIsSavingManualAttendee(true);
    try {
      const targetEvt =
        fieldEvents.find(ev => ev.id === manualAttendeeForm.eventId) || fieldEvents[0];
      const existing = usersList.find(
        u => u.email?.toLowerCase() === manualAttendeeForm.email.trim().toLowerCase()
      );

      let record = createEventRegistrationRecord({
        name: manualAttendeeForm.name,
        email: manualAttendeeForm.email,
        phone: manualAttendeeForm.phone,
        dniNumber: manualAttendeeForm.dniNumber,
        organizationName: manualAttendeeForm.organizationName,
        localityOrProvince: manualAttendeeForm.localityOrProvince,
        attendeeCategoryLabel: 'Visitante Acreditado por Administración',
        event: targetEvt,
        existingUser: existing
      });

      if (manualAttendeeForm.autoApproveAndSendEmail) {
        record = approveEventAttendeeByAdmin({
          adminUser: currentUser,
          attendee: record,
          event: targetEvt
        });
      }

      if (existing) {
        await updateUser(record);
      } else {
        await addUser(record);
      }

      if (manualAttendeeForm.autoApproveAndSendEmail) {
        await sendEventAccreditationApprovedEmail({
          toEmail: record.email,
          toName: record.name,
          eventId: targetEvt.id,
          eventName: targetEvt.title,
          eventDateLabel: targetEvt.dateLabel,
          venueName: targetEvt.venueName,
          locality: targetEvt.locality,
          address: targetEvt.address,
          lat: targetEvt.coordinates?.lat,
          lng: targetEvt.coordinates?.lng,
          routeInstructions: targetEvt.routeInstructions,
          ticketCode: record.eventTicketCode || 'SIEMBRA-21N',
          organizationName: record.organizationName,
          dniNumber: record.dniNumber,
          phone: record.phone,
          approvedBy: currentUser?.name || 'Administración Oficial PatagonianC'
        });
      }

      setIsManualAttendeeModalOpen(false);
      setManualAttendeeForm({
        name: '',
        email: '',
        phone: '',
        dniNumber: '',
        organizationName: '',
        localityOrProvince: 'Trelew, Chubut',
        eventId: targetEvt.id,
        autoApproveAndSendEmail: true
      });

      showNotice(
        true,
        'Visitante Registrado en EVENTOS',
        `${record.name} (${record.eventTicketCode}) fue incorporado al padrón de "${targetEvt.title}" sin acceso al sistema de datos.`
      );
    } catch (err: any) {
      showNotice(false, 'Error al registrar asistente', err?.message || 'Intente nuevamente.');
    } finally {
      setIsSavingManualAttendee(false);
    }
  };

  const handleCopyEventLink = (evt: FieldEvent) => {
    const url = `${window.location.origin}/#/login?evento=${encodeURIComponent(evt.slug)}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(evt.slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const openNewEventModal = () => {
    setIsNotifyStageModalOpen(false);
    setQrModalTarget(null);
    setIsManualAttendeeModalOpen(false);
    const defaultEst = enabledEstablishments[0];
    setEventForm({
      title: `Visita Técnica Programada — ${defaultEst ? defaultEst.establishmentName : 'Chacra Experimental PatagonianC'}`,
      subtitle: 'Visita Técnica Programada • Red Cooperativa HempC',
      category: 'visita_programada',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '13:00',
      locationId: defaultEst ? defaultEst.locationId : 'OTHER',
      clientId: defaultEst?.clientId,
      isCustomLocation: !defaultEst,
      venueName: defaultEst ? defaultEst.venueName : 'Chacra Experimental PatagonianC LTDA',
      locality: defaultEst ? defaultEst.locality : 'VIRCH – Trelew, Chubut',
      address: defaultEst ? defaultEst.address : 'Ruta Provincial N° 7 — Valle Inferior del Río Chubut',
      coordinates: defaultEst ? defaultEst.coordinates : { lat: -43.308362, lng: -65.289033 },
      routeInstructions: defaultEst
        ? defaultEst.routeInstructions
        : 'Desde Rotonda RN 3 y RP 7 (Trelew), tomar Ruta Provincial N° 7 hacia el oeste y seguir señalética vial oficial del evento.',
      routeWaypoints: defaultEst?.routeWaypoints,
      gatekeeperPhone: '+5492804667788',
      organizer: 'PatagonianC LTDA • Dirección Técnica',
      maxCapacity: 50,
      status: 'inscripcion_abierta',
      ticketPrefix: 'VISITA-CAMPO',
      weatherWarning:
        'Se reprograma en caso de mal tiempo (Aviso 24 hs antes). Presentar Pase QR y DNI en tranquera.',
      description: 'Recorrida técnica guiada por lotes productivos, evaluación fenológica a campo y verificación de protocolos GACP.'
    });
    setQuickCoordsInput(
      defaultEst
        ? `${defaultEst.coordinates.lat.toFixed(6)}, ${defaultEst.coordinates.lng.toFixed(6)}`
        : '-43.308362, -65.289033'
    );
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (evt: FieldEvent) => {
    setIsNotifyStageModalOpen(false);
    setQrModalTarget(null);
    setIsManualAttendeeModalOpen(false);
    const matchedEst = enabledEstablishments.find(e => e.locationId === evt.locationId);
    const locationIdValue = evt.isCustomLocation
      ? 'OTHER'
      : matchedEst
        ? matchedEst.locationId
        : evt.locationId || (enabledEstablishments[0]?.locationId ?? 'OTHER');
    setEventForm({
      ...evt,
      locationId: locationIdValue,
      isCustomLocation: locationIdValue === 'OTHER'
    });
    const coords = evt.coordinates || matchedEst?.coordinates || { lat: -43.308362, lng: -65.289033 };
    setQuickCoordsInput(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
    setIsEventModalOpen(true);
  };

  // Abrir Modal Oficial de Notificación de Estadio: ACTUALIZACIÓN o SUSPENSIÓN POR CLIMA
  const openNotifyStageModal = (evt: FieldEvent, stage: FieldEventNotificationStage) => {
    setIsEventModalOpen(false);
    setQrModalTarget(null);
    setIsManualAttendeeModalOpen(false);
    const defaultUpdateMsg = `Se han incorporado nuevas actividades técnicas y actualizaciones operativas al cronograma de "${evt.title}" en ${evt.venueName} (${evt.locality}). Su Pase QR personal y las coordenadas GPS de acceso se mantienen vigentes.`;
    const defaultWeatherMsg = `Por condiciones meteorológicas adversas en ${evt.locality} (pronóstico de lluvia / vientos intensos en campo abierto), se informa la suspensión preventiva de las actividades a campo de "${evt.title}" para resguardar la seguridad de los asistentes y el estado de los lotes. Su Pase QR conserva plena validez para la fecha reprogramada.`;

    setNotifyStageForm({
      eventId: evt.id,
      stage,
      noticeMessage: stage === 'suspension_clima' ? defaultWeatherMsg : defaultUpdateMsg,
      addedActivitiesText:
        stage === 'actualizacion_programa'
          ? 'Parada Técnica Adicional: Demostración de calibración en lote y bloque de consultas con equipo agronómico.'
          : '',
      rescheduledDate: evt.rescheduledDate || '',
      newStartTime: evt.startTime || '08:30',
      newEndTime: evt.endTime || '15:00',
      targetScope: 'all_registered'
    });
    setIsNotifyStageModalOpen(true);
  };

  // Ejecutar envío masivo/oficial del Estadio de Notificación (Actualización o Suspensión Climática)
  const handleSendEventStageNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEvt =
      fieldEvents.find(ev => ev.id === notifyStageForm.eventId) || activeSelectedEvent || fieldEvents[0];
    if (!targetEvt) return;

    setIsSendingStageNotification(true);
    try {
      const prepared = prepareEventNotificationStageByAdmin({
        adminUser: currentUser,
        event: targetEvt,
        allEvents: fieldEvents,
        allUsers: usersList || [],
        stage: notifyStageForm.stage,
        noticeMessage: notifyStageForm.noticeMessage,
        addedActivitiesText:
          notifyStageForm.stage === 'actualizacion_programa'
            ? notifyStageForm.addedActivitiesText
            : undefined,
        rescheduledDate:
          notifyStageForm.stage === 'suspension_clima' && notifyStageForm.rescheduledDate
            ? notifyStageForm.rescheduledDate
            : undefined,
        newStartTime: notifyStageForm.newStartTime || targetEvt.startTime,
        newEndTime: notifyStageForm.newEndTime || targetEvt.endTime,
        targetScope: notifyStageForm.targetScope
      });

      const savedEvt = await saveFieldEvent(prepared.updatedEvent);
      const nav = buildEventGpsNavigationLinks(savedEvt);

      let sentCount = 0;
      for (const att of prepared.targetAttendees) {
        if (!att.email) continue;
        await sendEventStatusUpdateEmail({
          toEmail: att.email,
          toName: att.name,
          eventId: savedEvt.id,
          eventName: savedEvt.title,
          eventDateLabel: savedEvt.dateLabel,
          venueName: savedEvt.venueName,
          locality: savedEvt.locality,
          address: nav.address,
          lat: nav.lat,
          lng: nav.lng,
          routeInstructions: nav.routeInstructions,
          ticketCode: att.eventTicketCode || `${savedEvt.ticketPrefix}-OFICIAL`,
          stage: notifyStageForm.stage,
          noticeMessage: prepared.cleanMessage,
          addedActivitiesText:
            notifyStageForm.stage === 'actualizacion_programa'
              ? notifyStageForm.addedActivitiesText.trim() || undefined
              : undefined,
          rescheduledDate:
            notifyStageForm.stage === 'suspension_clima' && notifyStageForm.rescheduledDate
              ? savedEvt.dateLabel
              : undefined,
          organizationName: att.organizationName,
          dniNumber: att.dniNumber,
          phone: att.phone,
          issuedBy: currentUser?.name || 'Administración Oficial PatagonianC'
        });
        sentCount++;
      }

      setIsNotifyStageModalOpen(false);
      const stageTitle =
        notifyStageForm.stage === 'suspension_clima'
          ? 'Estadio de Suspensión / Reprogramación por Clima Notificado'
          : 'Estadio de Actualización de Evento y Actividades Notificado';

      showNotice(
        true,
        stageTitle,
        sentCount > 0
          ? `Se actualizó el estado oficial de "${savedEvt.title}" (${STATUS_LABELS[savedEvt.status]}) y se despachó el comunicado oficial con Mapa, GPS y Pase QR vigente a ${sentCount} inscripto(s).`
          : `Se actualizó el estado oficial de "${savedEvt.title}" a "${STATUS_LABELS[savedEvt.status]}" en el Calendario de Eventos. Cuando se registren asistentes recibirán este estado actualizado.`
      );
    } catch (err: any) {
      showNotice(
        false,
        'Error al emitir notificación del evento',
        err?.message || 'No se pudo procesar el cambio de estadio del evento.'
      );
    } finally {
      setIsSendingStageNotification(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* ENCABEZADO INSTITUCIONAL DEL MÓDULO EVENTOS */}
      <div className="bg-[#0c2d1e] text-white rounded-3xl p-5 sm:p-7 border-l-4 border-[#DDDB00] border border-emerald-800/80 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#DDDB00] font-mono font-bold uppercase tracking-wider">
              <span>GOBERNANZA EXCLUSIVA ADMINISTRADORES</span>
              <span aria-hidden="true">·</span>
              <span>AISLAMIENTO ESTRICTO DE VISITANTES ACTIVO</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              EVENTOS, JORNADAS DE CAMPO & ACREDITACIONES
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Centro unificado para crear visitas programadas, jornadas de campo y administrar la acreditación presencial de registrados.{' '}
              <strong className="text-[#DDDB00]">
                Los visitantes acreditados aquí están 100% aislados de ADMIN Y ACCESOS y no poseen login ni acceso a los datos del sistema.
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsManualAttendeeModalOpen(true)}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer"
            >
              <UserPlus size={16} className="text-[#DDDB00]" />
              <span>Acreditar Visitante</span>
            </button>
            <button
              type="button"
              onClick={openNewEventModal}
              className="px-5 py-3 rounded-xl bg-[#DDDB00] hover:bg-[#e8e629] text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition cursor-pointer"
            >
              <Plus size={16} />
              <span>Crear Evento / Visita</span>
            </button>
          </div>
        </div>

        {/* MÉTRICAS TABULARES DE EVENTOS Y AISLAMIENTO */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-black/25 rounded-2xl p-3.5 border border-white/10">
            <span className="text-[10px] font-bold uppercase text-emerald-300/90 block">
              Eventos en Calendario
            </span>
            <span className="text-2xl font-mono font-black text-white tabular-nums mt-0.5 block">
              {metrics.totalEvents}
            </span>
          </div>
          <div className="bg-black/25 rounded-2xl p-3.5 border border-white/10">
            <span className="text-[10px] font-bold uppercase text-[#DDDB00] block">
              Visitantes Aislados
            </span>
            <span className="text-2xl font-mono font-black text-[#DDDB00] tabular-nums mt-0.5 block">
              {metrics.totalIsolatedVisitors}
            </span>
          </div>
          <div className="bg-black/25 rounded-2xl p-3.5 border border-amber-400/30">
            <span className="text-[10px] font-bold uppercase text-amber-300 block">
              Pendientes Aprobación
            </span>
            <span className="text-2xl font-mono font-black text-amber-300 tabular-nums mt-0.5 block">
              {metrics.pendingCount}
            </span>
          </div>
          <div className="bg-black/25 rounded-2xl p-3.5 border border-emerald-400/30">
            <span className="text-[10px] font-bold uppercase text-emerald-300 block">
              Acreditados (Pase QR)
            </span>
            <span className="text-2xl font-mono font-black text-emerald-400 tabular-nums mt-0.5 block">
              {metrics.accreditedCount}
            </span>
          </div>
          <div className="bg-black/25 rounded-2xl p-3.5 border border-sky-400/30 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase text-sky-300 block">
              Presentes (Check-in)
            </span>
            <span className="text-2xl font-mono font-black text-sky-300 tabular-nums mt-0.5 block">
              {metrics.checkedInCount}
            </span>
          </div>
        </div>
      </div>

      {/* TOAST DE CONFIRMACIÓN */}
      {toast && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-4 shadow-lg animate-in slide-in-from-top-2 ${
            toast.success
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl text-white ${
                toast.success ? 'bg-[#006633]' : 'bg-rose-600'
              }`}
            >
              {toast.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider">{toast.title}</p>
              <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* BARRA DE NAVEGACIÓN INTERNA (SEGMENTED CONTROL) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('accreditations')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'accreditations'
                ? 'bg-[#006633] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck size={16} />
            <span>1. Manejo y Acreditación de Registrados ({allEventParticipants.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'calendar'
                ? 'bg-[#006633] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarIcon size={16} />
            <span>2. Calendario de Jornadas & Visitas ({fieldEvents.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('checkin')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'checkin'
                ? 'bg-[#006633] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <QrCode size={16} />
            <span>3. Control en Puerta (Check-in QR) & Planillas PDF</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-2">
          <button
            type="button"
            onClick={() =>
              downloadEventAttendanceSheetPDF(activeSelectedEvent, filteredAttendees)
            }
            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} className="text-[#DDDB00]" />
            <span>Planilla Oficial A4 (PDF)</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          VISTA 1: MANEJO Y ACREDITACIÓN DE REGISTRADOS (APROBACIÓN ADMIN)
         ===================================================================== */}
      {activeTab === 'accreditations' && (
        <div className="space-y-4">
          {/* Barra de Filtros por Evento, Estado y Buscador */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2.5 flex-1">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, correo, DNI, localidad o código SIEMBRA-21N..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                />
              </div>

              <select
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-white outline-none"
              >
                <option value="all">Todos los Eventos ({allEventParticipants.length})</option>
                {fieldEvents.map(evt => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} ({evt.date})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'pending_admin', label: `Pendientes (${metrics.pendingCount})` },
                  { id: 'accredited', label: `Acreditados (${metrics.accreditedCount})` },
                  { id: 'checked_in', label: `Check-in (${metrics.checkedInCount})` },
                  { id: 'rejected', label: 'Rechazados' }
                ] as const
              ).map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition cursor-pointer ${
                    statusFilter === st.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Alta Densidad de Registrados y Acreditaciones */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                  <Lock size={14} className="text-[#006633] dark:text-emerald-400" />
                  <span>
                    Padrón de Inscriptos en Jornadas ({filteredAttendees.length} registros)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Aprobar envía el Pase QR Oficial + Mapa GPS sin habilitar login al sistema. También podés notificar Actualizaciones o Suspensión por Clima.
                </span>
              </div>

              {activeSelectedEvent && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openNotifyStageModal(activeSelectedEvent, 'actualizacion_programa')}
                    className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
                    title="Notificar nuevas actividades, cambios de horario o modificaciones del evento a los registrados"
                  >
                    <RefreshCw size={13} />
                    <span>Notificar Actualización / Actividades</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openNotifyStageModal(activeSelectedEvent, 'suspension_clima')}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
                    title="Notificar suspensión o reprogramación preventiva por condiciones climáticas adversas"
                  >
                    <CloudRain size={13} />
                    <span>Suspensión / Reprogramación por Clima</span>
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-950/40 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Visitante / Registrado</th>
                    <th className="px-4 py-3.5">Pase QR & Jornada</th>
                    <th className="px-4 py-3.5">Procedencia & Contacto</th>
                    <th className="px-4 py-3.5">Aislamiento Sistema</th>
                    <th className="px-4 py-3.5">Estado Acreditación</th>
                    <th className="px-5 py-3.5 text-right">Acciones Exclusivas Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center">
                        <div className="max-w-xl mx-auto space-y-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                          <div className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                            Aún no hay visitantes registrados en "{activeSelectedEvent?.title || 'este evento'}"
                          </div>
                          {activeSelectedEvent && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                              <div>
                                <strong>Sede Georreferenciada:</strong> {activeSelectedEvent.venueName} ({activeSelectedEvent.locality})
                              </div>
                              <div className="font-mono text-[10px] text-[#006633] dark:text-emerald-400">
                                GPS: {activeSelectedEvent.coordinates?.lat?.toFixed(6) || '-43.308362'},{' '}
                                {activeSelectedEvent.coordinates?.lng?.toFixed(6) || '-65.289033'} • {activeSelectedEvent.dateLabel}
                              </div>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (activeSelectedEvent) {
                                  setManualAttendeeForm(p => ({ ...p, eventId: activeSelectedEvent.id }));
                                }
                                setIsManualAttendeeModalOpen(true);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-[#006633] hover:bg-[#004d26] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                            >
                              <UserPlus size={14} />
                              <span>Acreditar Primer Visitante</span>
                            </button>
                            {activeSelectedEvent && (
                              <button
                                type="button"
                                onClick={() => handleCopyEventLink(activeSelectedEvent)}
                                className="px-3.5 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                              >
                                <Copy size={13} />
                                <span>Copiar Link de Inscripción</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setActiveTab('calendar')}
                              className="px-3.5 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                            >
                              <CalendarIcon size={13} />
                              <span>Ver en Calendario de Eventos ({fieldEvents.length})</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAttendees.map(att => {
                      const attEvtId = resolveAttendeeEventId(att, fieldEvents);
                      const evt =
                        fieldEvents.find(e => e.id === attEvtId) || fieldEvents[0];
                      const accStatus = resolveEventAccreditationStatus(att);
                      const isBusy = actionLoadingId === att.id;

                      return (
                        <tr
                          key={att.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* 1. Visitante */}
                          <td className="px-5 py-3.5">
                            <div className="font-black text-slate-900 dark:text-white uppercase text-xs">
                              {att.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {att.email}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              DNI/CUIT: <strong className="font-mono">{att.dniNumber || 'En validación'}</strong>
                            </div>
                          </td>

                          {/* 2. Pase QR & Jornada */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setQrModalTarget({
                                    type: 'attendee',
                                    event: evt,
                                    attendee: att
                                  })
                                }
                                className="font-mono font-black text-xs text-[#006633] dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                                title="Ver Código QR del Pase"
                              >
                                <QrCode size={13} />
                                <span>{att.eventTicketCode || 'SIEMBRA-21N'}</span>
                              </button>
                            </div>
                            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-0.5 truncate max-w-[230px]">
                              {evt.title}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {evt.date} · {evt.startTime} hs
                            </div>
                          </td>

                          {/* 3. Procedencia & Contacto */}
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                              {att.organizationName || 'Visitante / Invitado General'}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {att.localityOrProvince || evt.locality} · Tel: {att.phone || 'S/D'}
                            </div>
                          </td>

                          {/* 4. Aislamiento del Sistema */}
                          <td className="px-4 py-3.5">
                            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                              <span>Aislado en EVENTOS</span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              Sin acceso a login ni datos productivos
                            </div>
                          </td>

                          {/* 5. Estado Acreditación */}
                          <td className="px-4 py-3.5">
                            {accStatus === 'checked_in' && (
                              <div>
                                <span className="font-black text-sky-700 dark:text-sky-400 uppercase text-[11px] flex items-center gap-1">
                                  <CheckCircle2 size={13} /> Presente en Campo (Check-in)
                                </span>
                                {att.eventCheckedInAt && (
                                  <span className="text-[10px] font-mono text-slate-400 block">
                                    {new Date(att.eventCheckedInAt).toLocaleString('es-AR')}
                                  </span>
                                )}
                              </div>
                            )}
                            {accStatus === 'accredited' && (
                              <div>
                                <span className="font-black text-emerald-700 dark:text-emerald-400 uppercase text-[11px] flex items-center gap-1">
                                  <CheckCircle2 size={13} /> Acreditado por Admin
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  Pase QR enviado · Aprobó: {att.approvedBy || 'Admin'}
                                </span>
                              </div>
                            )}
                            {accStatus === 'pending_admin' && (
                              <div>
                                <span className="font-black text-amber-600 dark:text-amber-400 uppercase text-[11px] flex items-center gap-1">
                                  <Clock size={13} /> Pendiente Aprobación Admin
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {att.eventConfirmedByEmail
                                    ? 'Email verificado por el inscripto'
                                    : 'Pre-inscripto en formulario público'}
                                </span>
                              </div>
                            )}
                            {accStatus === 'rejected' && (
                              <span className="font-black text-rose-600 dark:text-rose-400 uppercase text-[11px] flex items-center gap-1">
                                <XCircle size={13} /> Rechazado
                              </span>
                            )}
                          </td>

                          {/* 6. Acciones Exclusivas Admin */}
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {accStatus === 'pending_admin' && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleApproveAccreditation(att)}
                                  className="px-3 py-1.5 rounded-xl bg-[#006633] hover:bg-[#004d26] text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition cursor-pointer shadow-xs"
                                  title="Aprobar acreditación y enviar Pase QR + Programa PDF por correo (sin dar acceso al sistema)"
                                >
                                  {isBusy ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={12} />
                                  )}
                                  <span>Aprobar & Enviar Pase QR</span>
                                </button>
                              )}

                              {accStatus !== 'pending_admin' && (
                                <button
                                  type="button"
                                  disabled={resendingPassId === att.id || isBusy}
                                  onClick={() => handleResendAccreditationPass(att)}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-[#006633] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
                                  title="Re-enviar correo con la Credencial y Pase QR de Acreditación al visitante"
                                >
                                  {resendingPassId === att.id ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <Mail size={12} />
                                  )}
                                  <span>Re-enviar Pase QR</span>
                                </button>
                              )}

                              {(accStatus === 'accredited' || accStatus === 'pending_admin') && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleCheckInAttendee(att)}
                                  className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
                                  title="Marcar asistencia presencial en tranquera/puerta"
                                >
                                  <QrCode size={12} />
                                  <span>Check-in</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setQrModalTarget({
                                    type: 'attendee',
                                    event: evt,
                                    attendee: att
                                  })
                                }
                                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-[#006633] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                                title="Ver Ficha de Acreditación, Descargar o Re-enviar Pase QR"
                              >
                                <QrCode size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  downloadUnDiaDeSiembraProgramPDF({
                                    name: att.name,
                                    email: att.email,
                                    ticketCode: att.eventTicketCode || 'SIEMBRA-21N',
                                    profileLabel: 'Visitante Acreditado a Jornada',
                                    organizationName: att.organizationName,
                                    locality: att.localityOrProvince,
                                    phone: att.phone
                                  })
                                }
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                                title="Descargar Programa Oficial PDF personalizado con su Pase QR"
                              >
                                <FileText size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => downloadEventAttendanceCertificatePDF(evt, att)}
                                className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                                title="Emitir Certificado Oficial de Asistencia (PDF A4)"
                              >
                                <Award size={14} />
                              </button>

                              {accStatus !== 'rejected' && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleRejectAttendee(att)}
                                  className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-600 dark:text-amber-400 transition cursor-pointer"
                                  title="Marcar inscripción como rechazada"
                                >
                                  <XCircle size={14} />
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setAttendeeToDelete(att)}
                                className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 transition cursor-pointer"
                                title="Eliminar registro definitivamente de la base de datos"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 2: CALENDARIO DE JORNADAS DE CAMPO Y VISITAS PROGRAMADAS
         ===================================================================== */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarIcon size={17} className="text-[#006633]" />
                <span>Calendario Oficial de Eventos, Jornadas y Visitas Georreferenciadas ({fieldEvents.length})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cada evento vincula los datos de los campos habilitados o una locación georreferenciada propia para enviar mapa, ruta y GPS al asistente.
              </p>
            </div>
            <button
              type="button"
              onClick={openNewEventModal}
              className="px-4 py-2.5 rounded-xl bg-[#006633] hover:bg-[#004d26] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer self-start sm:self-center shrink-0"
            >
              <Plus size={15} className="text-[#DDDB00]" />
              <span>Nuevo Evento con Georreferencia</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {fieldEvents.map(evt => {
              const evtAttendees = allEventParticipants.filter(
                a => resolveAttendeeEventId(a, fieldEvents) === evt.id
              );
              const accreditedInEvt = evtAttendees.filter(a => {
                const st = resolveEventAccreditationStatus(a);
                return st === 'accredited' || st === 'checked_in';
              }).length;
              const occupancyPct = Math.min(
                100,
                Math.round((evtAttendees.length / Math.max(1, evt.maxCapacity)) * 100)
              );
              const isSelectedCard = selectedEventId === evt.id;

              return (
                <div
                  key={evt.id}
                  className={`bg-white dark:bg-slate-900 rounded-3xl border p-5 flex flex-col justify-between gap-4 transition-all ${
                    isSelectedCard
                      ? 'border-2 border-[#006633] ring-2 ring-[#006633]/20 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-[#006633] dark:text-emerald-400 uppercase">
                        {CATEGORY_LABELS[evt.category]}
                      </span>
                      <span>·</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {STATUS_LABELS[evt.status]}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-black uppercase text-slate-900 dark:text-white leading-snug">
                        {evt.title}
                      </h3>
                      {evt.subtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {evt.subtitle}
                        </p>
                      )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-3.5 space-y-1.5 text-xs border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
                        <CalendarIcon size={14} className="text-[#006633] shrink-0" />
                        <span>{evt.dateLabel}</span>
                      </div>
                      <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                        <MapPin size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {evt.venueName} ({evt.locality})
                          </div>
                          {evt.address && (
                            <div className="text-[11px] text-slate-500 truncate">{evt.address}</div>
                          )}
                          {evt.coordinates && (
                            <div className="font-mono text-[10px] font-bold text-[#006633] dark:text-emerald-400 mt-0.5">
                              GPS: {evt.coordinates.lat.toFixed(6)}, {evt.coordinates.lng.toFixed(6)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                        <Users size={14} className="text-sky-500 shrink-0" />
                        <span className="font-mono">
                          Inscriptos: <strong>{evtAttendees.length}</strong> / Cupo:{' '}
                          <strong>{evt.maxCapacity}</strong> ({accreditedInEvt} acreditados)
                        </span>
                      </div>
                    </div>

                    {/* Barra de ocupación */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <span>Ocupación de Cupo</span>
                        <span className="font-bold">{occupancyPct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-[#006633] transition-all"
                          style={{ width: `${occupancyPct}%` }}
                        />
                      </div>
                    </div>

                    {evt.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                        {evt.description}
                      </p>
                    )}

                    {/* Aviso visible del último Estadio de Notificación Oficial emitido (Actualización o Suspensión por Clima) */}
                    {(evt.lastNotificationType ||
                      evt.status === 'actualizado_programa' ||
                      evt.status === 'suspendido_clima' ||
                      evt.status === 'reprogramado_clima') && (
                      <div
                        className={`rounded-2xl p-3 text-[11px] border space-y-1 ${
                          evt.lastNotificationType === 'suspension_clima' ||
                          evt.status === 'suspendido_clima' ||
                          evt.status === 'reprogramado_clima'
                            ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                            : 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-950 dark:text-sky-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 font-black uppercase text-[10px]">
                          <span className="flex items-center gap-1">
                            {evt.lastNotificationType === 'suspension_clima' ||
                            evt.status === 'suspendido_clima' ||
                            evt.status === 'reprogramado_clima' ? (
                              <>
                                <CloudRain size={12} />
                                <span>AVISO CLIMÁTICO: {STATUS_LABELS[evt.status]}</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw size={12} />
                                <span>EVENTO ACTUALIZADO: NUEVAS ACTIVIDADES</span>
                              </>
                            )}
                          </span>
                          {evt.lastNotificationSentAt && (
                            <span className="font-mono text-[9px] opacity-75">
                              {new Date(evt.lastNotificationSentAt).toLocaleDateString('es-AR')}
                            </span>
                          )}
                        </div>
                        {evt.lastNotificationMessage && (
                          <p className="text-[11px] leading-snug line-clamp-2">
                            {evt.lastNotificationMessage}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    {/* Botones Oficiales de los 2 Estadios: ACTUALIZACIÓN (Actividades/Modificaciones) y SUSPENSIÓN POR CLIMA */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => openNotifyStageModal(evt, 'actualizacion_programa')}
                        className="px-2.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                        title="Estadio 1: Notificar actualización de actividades, cronograma o modificaciones del evento"
                      >
                        <RefreshCw size={12} className="shrink-0" />
                        <span className="truncate">Actualización</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openNotifyStageModal(evt, 'suspension_clima')}
                        className="px-2.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                        title="Estadio 2: Notificar suspensión o reprogramación del evento por condiciones climáticas"
                      >
                        <CloudRain size={12} className="shrink-0" />
                        <span className="truncate">Suspensión Clima</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEventId(evt.id);
                          setActiveTab('accreditations');
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-[#006633] hover:bg-[#004d26] text-white text-[11px] font-black uppercase tracking-wider text-center cursor-pointer"
                      >
                        Registrados ({evtAttendees.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setManualAttendeeForm(p => ({ ...p, eventId: evt.id }));
                          setIsManualAttendeeModalOpen(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-[#006633] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-black uppercase flex items-center gap-1 cursor-pointer"
                        title="Inscribir y acreditar visitante a este evento con envío de Mapa y GPS"
                      >
                        <UserPlus size={13} />
                        <span>Inscribir</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyEventLink(evt)}
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-black uppercase flex items-center gap-1.5 cursor-pointer"
                        title="Copiar link público de inscripción a este evento"
                      >
                        {copiedSlug === evt.slug ? (
                          <>
                            <Check size={13} className="text-emerald-600" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span>Link</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setQrModalTarget({ type: 'event', event: evt })}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer"
                        title="Ver QR público de inscripción y Mapa Georreferenciado"
                      >
                        <QrCode size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditEventModal(evt)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer"
                        title="Editar Evento / Visita y Georreferencia"
                      >
                        <Edit2 size={15} />
                      </button>

                      {evt.id !== OFFICIAL_SEMBRA_EVENT_ID && (
                        <button
                          type="button"
                          onClick={() => deleteFieldEvent(evt.id)}
                          className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 cursor-pointer"
                          title="Eliminar Evento"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 3: CONTROL EN PUERTA (CHECK-IN RÁPIDO QR / DNI)
         ===================================================================== */}
      {activeTab === 'checkin' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <QrCode size={18} className="text-[#006633]" />
                <span>Terminal de Acreditación y Check-in en Tranquera / Puerta</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Buscá por Código de Pase (<code className="font-mono font-bold">SIEMBRA-21N-...</code>), Número de DNI o Apellido para registrar el ingreso físico y emitir su Certificado de Asistencia.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadEventAttendanceSheetPDF(activeSelectedEvent, filteredAttendees)
              }
              className="px-4 py-2.5 rounded-xl bg-[#006633] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer self-start sm:self-center"
            >
              <Download size={15} />
              <span>Imprimir Planilla de Puerta (PDF A4)</span>
            </button>
          </div>

          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Escanear o escribir código SIEMBRA-21N-XXXX, DNI o Nombre del asistente..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredAttendees.map(att => {
              const status = resolveEventAccreditationStatus(att);
              const evtId = resolveAttendeeEventId(att, fieldEvents);
              const evt = fieldEvents.find(e => e.id === evtId) || fieldEvents[0];

              return (
                <div
                  key={att.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/50"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-[#006633] dark:text-emerald-400">
                        {att.eventTicketCode || 'PASE-S/N'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[11px] font-mono text-slate-500">
                        DNI: {att.dniNumber || 'S/D'}
                      </span>
                    </div>
                    <p className="text-sm font-black uppercase text-slate-900 dark:text-white truncate">
                      {att.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {att.organizationName || 'Visitante'} ({att.localityOrProvince || evt.locality})
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {status === 'checked_in' ? (
                      <button
                        type="button"
                        onClick={() => downloadEventAttendanceCertificatePDF(evt, att)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase flex items-center gap-1.5 cursor-pointer"
                      >
                        <Award size={14} />
                        <span>Certificado PDF</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCheckInAttendee(att)}
                        className="px-4 py-2.5 rounded-xl bg-[#006633] hover:bg-[#004d26] text-white text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CheckCircle2 size={15} />
                        <span>Marcar Presente</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREAR / EDITAR EVENTO O VISITA PROGRAMADA (DISEÑO 2 COLUMNAS ACOTADO)
         ===================================================================== */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleSaveEventSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-xs"
          >
            {/* CABECERA FIJA DEL MODAL */}
            <div className="shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#006633] dark:text-emerald-400">
                  CONFIGURACIÓN DE AGENDA Y GEORREFERENCIA • CALENDARIO DE EVENTOS
                </span>
                <h3 className="text-base sm:text-lg font-black uppercase text-slate-900 dark:text-white">
                  {eventForm.id ? 'Editar Evento / Visita Programada' : 'Crear Nuevo Evento o Visita de Campo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            {/* CUERPO INTERNO CON SCROLL ACOTADO EN 2 COLUMNAS */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* COLUMNA IZQUIERDA (6 COLS): DATOS DEL EVENTO, CRONOGRAMA Y PROTOCOLO */}
                <div className="lg:col-span-6 space-y-3.5">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-black uppercase text-[10px] text-[#006633] dark:text-emerald-400">
                          1. Título del Evento / Jornada / Visita *
                        </label>
                        {eventForm.title && (
                          <button
                            type="button"
                            onClick={() => setEventForm(p => ({ ...p, title: '' }))}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          >
                            Limpiar texto
                          </button>
                        )}
                      </div>
                      <input
                        required
                        type="text"
                        value={eventForm.title || ''}
                        onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="Ej: Visita Programada: Seguimiento de Floración en Lote 2"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-[#006633]/40 focus:border-[#006633] font-black text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                          Categoría *
                        </label>
                        <select
                          value={eventForm.category || 'visita_programada'}
                          onChange={e =>
                            setEventForm(p => ({
                              ...p,
                              category: e.target.value as FieldEventCategory
                            }))
                          }
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                        >
                          <option value="jornada_campo">Jornada Oficial de Campo</option>
                          <option value="visita_programada">Visita Técnica Programada</option>
                          <option value="diplomatura_practica">Práctica Presencial Diplomatura</option>
                          <option value="recorrida_institucional">Recorrida Institucional / Auditoría</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                          Estado del Evento *
                        </label>
                        <select
                          value={eventForm.status || 'inscripcion_abierta'}
                          onChange={e =>
                            setEventForm(p => ({
                              ...p,
                              status: e.target.value as FieldEventStatus
                            }))
                          }
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                        >
                          <option value="inscripcion_abierta">Inscripción Abierta</option>
                          <option value="actualizado_programa">Actualizado (Nuevas Actividades)</option>
                          <option value="cupo_completo">Cupo Completo</option>
                          <option value="suspendido_clima">Suspendido por Clima</option>
                          <option value="reprogramado_clima">Reprogramado por Clima</option>
                          <option value="en_curso">En Curso Hoy</option>
                          <option value="finalizado">Jornada Finalizada</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                          Fecha *
                        </label>
                        <input
                          required
                          type="date"
                          value={eventForm.date || ''}
                          onChange={e => setEventForm(p => ({ ...p, date: e.target.value }))}
                          className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                          Hora Inicio
                        </label>
                        <input
                          type="time"
                          value={eventForm.startTime || '08:30'}
                          onChange={e => setEventForm(p => ({ ...p, startTime: e.target.value }))}
                          className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                          Hora Cierre
                        </label>
                        <input
                          type="time"
                          value={eventForm.endTime || '15:30'}
                          onChange={e => setEventForm(p => ({ ...p, endTime: e.target.value }))}
                          className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                          Cupo Máximo Asistentes
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={eventForm.maxCapacity || 60}
                          onChange={e =>
                            setEventForm(p => ({ ...p, maxCapacity: Number(e.target.value) }))
                          }
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                          Prefijo de Pase QR (Ticket)
                        </label>
                        <input
                          type="text"
                          value={eventForm.ticketPrefix || ''}
                          onChange={e =>
                            setEventForm(p => ({ ...p, ticketPrefix: e.target.value.toUpperCase() }))
                          }
                          placeholder="Ej: SIEMBRA-21N"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div>
                      <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                        Objetivos Técnicos y Protocolo de la Visita / Jornada
                      </label>
                      <textarea
                        rows={3}
                        value={eventForm.description || ''}
                        onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="Detalle del recorrido por lotes, paradas técnicas y requisitos de acreditación..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                        Indicaciones Viales Paso a Paso (Se adjuntan al Pase QR del asistente) *
                      </label>
                      <textarea
                        rows={2}
                        value={eventForm.routeInstructions || ''}
                        onChange={e =>
                          setEventForm(p => ({ ...p, routeInstructions: e.target.value }))
                        }
                        placeholder="Indicaciones viales desde la ruta principal hasta la tranquera de acreditación..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* COLUMNA DERECHA (6 COLS): CAMPO HABILITADO / LOCACIÓN EXTERNA Y GEORREFERENCIA GPS */}
                <div className="lg:col-span-6 bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-[#006633]/30 rounded-2xl p-4 space-y-3">
                  <div>
                    <label className="font-black uppercase text-[10px] text-[#006633] dark:text-emerald-400 block mb-1">
                      2. Establecimiento del Evento (Captar Campo de la Red o Agregar Locación Externa) *
                    </label>
                    <select
                      value={
                        eventForm.isCustomLocation || eventForm.locationId === 'OTHER'
                          ? 'OTHER'
                          : eventForm.locationId || enabledEstablishments[0]?.locationId || 'OTHER'
                      }
                      onChange={e => {
                        const sel = e.target.value;
                        if (sel === 'OTHER') {
                          const resolvedOther = resolveEventVenueFromSelection({
                            selectionId: 'OTHER',
                            locations: allLocations || [],
                            clients: clients || [],
                            customVenueName: '',
                            customLocality: eventForm.locality || 'Trelew, Chubut',
                            customAddress: '',
                            customLat: eventForm.coordinates?.lat || -43.308362,
                            customLng: eventForm.coordinates?.lng || -65.289033
                          });
                          setEventForm(p => ({
                            ...p,
                            locationId: 'OTHER',
                            clientId: undefined,
                            isCustomLocation: true,
                            venueName: '',
                            locality: resolvedOther.locality,
                            address: '',
                            coordinates: resolvedOther.coordinates,
                            routeInstructions: resolvedOther.routeInstructions,
                            routeWaypoints: resolvedOther.routeWaypoints
                          }));
                        } else {
                          const resolved = resolveEventVenueFromSelection({
                            selectionId: sel,
                            locations: allLocations || [],
                            clients: clients || []
                          });
                          setQuickCoordsInput(
                            `${resolved.coordinates.lat}, ${resolved.coordinates.lng}`
                          );
                          setEventForm(p => {
                            const autoTitle =
                              !p.title || p.title.startsWith('Visita Técnica Programada —')
                                ? `Visita Técnica Programada — ${resolved.venueName}`
                                : p.title;
                            return {
                              ...p,
                              title: autoTitle,
                              locationId: resolved.locationId,
                              clientId: resolved.clientId,
                              isCustomLocation: false,
                              venueName: resolved.venueName,
                              locality: resolved.locality,
                              address: resolved.address,
                              coordinates: resolved.coordinates,
                              routeInstructions: resolved.routeInstructions,
                              routeWaypoints: resolved.routeWaypoints
                            };
                          });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-[#006633]/50 font-black text-slate-900 dark:text-white"
                    >
                      <optgroup label="Establecimientos y Campos Habilitados en la Red HempC">
                        {enabledEstablishments.map(opt => (
                          <option key={opt.locationId} value={opt.locationId}>
                            {opt.displayLabel} — GPS: {opt.coordinates.lat.toFixed(4)},{' '}
                            {opt.coordinates.lng.toFixed(4)}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Locación Externa / Fuera de Red">
                        <option value="OTHER">
                          OTRO — Habilitar carga manual de otra locación / predio externo
                        </option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Datos de Locación y Punto de Encuentro Georreferenciado */}
                  <div
                    className={`rounded-xl p-3 space-y-2.5 border ${
                      eventForm.isCustomLocation || eventForm.locationId === 'OTHER'
                        ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                        : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800/70'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-mono font-black uppercase block ${
                        eventForm.isCustomLocation || eventForm.locationId === 'OTHER'
                          ? 'text-amber-800 dark:text-amber-300'
                          : 'text-[#006633] dark:text-emerald-400'
                      }`}
                    >
                      {eventForm.isCustomLocation || eventForm.locationId === 'OTHER'
                        ? '📍 LOCACIÓN EXTERNA / PERSONALIZADA HABILITADA (OPCIÓN: OTRO)'
                        : '📍 DATOS CAPTADOS DEL CAMPO HABILITADO (PODÉS AJUSTAR SECTOR O ACCESO)'}
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="font-black uppercase text-[10px] text-slate-600 dark:text-slate-300 block mb-1">
                          Sede / Sector del Evento *
                        </label>
                        <input
                          required
                          type="text"
                          value={eventForm.venueName || ''}
                          onChange={e =>
                            setEventForm(p => ({ ...p, venueName: e.target.value }))
                          }
                          placeholder="Ej: Establecimiento La Regina — Sector Lote 2"
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="font-black uppercase text-[10px] text-slate-600 dark:text-slate-300 block mb-1">
                          Localidad y Provincia *
                        </label>
                        <input
                          required
                          type="text"
                          value={eventForm.locality || ''}
                          onChange={e =>
                            setEventForm(p => ({ ...p, locality: e.target.value }))
                          }
                          placeholder="Ej: Trelew, Chubut"
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="font-black uppercase text-[10px] text-slate-600 dark:text-slate-300 block mb-1">
                          Dirección Vial / Kilómetro de Ruta / Punto de Acceso *
                        </label>
                        <input
                          required
                          type="text"
                          value={eventForm.address || ''}
                          onChange={e =>
                            setEventForm(p => ({ ...p, address: e.target.value }))
                          }
                          placeholder="Ej: Chacra 23 Parcela 13, Ruta Nacional 3 Km 1462"
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Coordenadas GPS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                        Latitud GPS *
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={eventForm.coordinates?.lat ?? -43.308362}
                        onChange={e => {
                          const lat = Number(e.target.value);
                          const lng = eventForm.coordinates?.lng ?? -65.289033;
                          setQuickCoordsInput(`${lat}, ${lng}`);
                          setEventForm(p => ({
                            ...p,
                            coordinates: { lat, lng }
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                        Longitud GPS *
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={eventForm.coordinates?.lng ?? -65.289033}
                        onChange={e => {
                          const lat = eventForm.coordinates?.lat ?? -43.308362;
                          const lng = Number(e.target.value);
                          setQuickCoordsInput(`${lat}, ${lng}`);
                          setEventForm(p => ({
                            ...p,
                            coordinates: { lat, lng }
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                        Pegar Coordenadas
                      </label>
                      <input
                        type="text"
                        value={quickCoordsInput}
                        onChange={e => {
                          const val = e.target.value;
                          setQuickCoordsInput(val);
                          const parsed = parseCoordinateString(val);
                          if (parsed) {
                            setEventForm(p => ({
                              ...p,
                              coordinates: parsed
                            }));
                          }
                        }}
                        placeholder="-43.308362, -65.289033"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-[#006633] dark:text-emerald-400"
                      />
                    </div>
                  </div>

                  {/* Selector Interactivo en Mapa (Limpio, sin el mensaje de email) */}
                  <EventRouteMapPreview
                    event={eventForm}
                    compact
                    editable
                    onCoordinatesChange={coords => {
                      setQuickCoordsInput(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
                      setEventForm(p => {
                        const locName = p.locality || 'Trelew, Chubut';
                        const addrName = p.address || 'Acceso Vial al Predio';
                        const venName = p.venueName || 'Sede del Evento';
                        return {
                          ...p,
                          coordinates: coords,
                          routeWaypoints: [
                            {
                              lat: Number((coords.lat + 0.024).toFixed(6)),
                              lng: Number((coords.lng - 0.018).toFixed(6)),
                              label: `1. Referencia Urbana / Ruta Principal (${locName})`
                            },
                            {
                              lat: Number((coords.lat + 0.006).toFixed(6)),
                              lng: Number((coords.lng - 0.007).toFixed(6)),
                              label: `2. Desvío Vial Señalizado (${addrName})`
                            },
                            {
                              lat: coords.lat,
                              lng: coords.lng,
                              label: `3. Tranquera de Acreditación • ${venName}`
                            }
                          ]
                        };
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            {/* PIE FIJO DEL MODAL CON ACCIÓN DIRECTA DE GUARDADO */}
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <MapPin size={14} className="text-[#006633]" />
                <span>
                  Georreferencia activa:{' '}
                  <strong>
                    {(eventForm.coordinates?.lat ?? -43.308362).toFixed(5)},{' '}
                    {(eventForm.coordinates?.lng ?? -65.289033).toFixed(5)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEvent}
                  className="px-6 py-2.5 rounded-xl bg-[#006633] hover:bg-[#004d26] text-white text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {isSavingEvent ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Guardando Evento...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Guardar en Calendario de EVENTOS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          MODAL: ACREDITAR VISITANTE MANUALMENTE DESDE ADMINISTRACIÓN
         ===================================================================== */}
      {isManualAttendeeModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#006633] dark:text-emerald-400">
                  ALTA DE ASISTENTE AISLADO EN EVENTOS (SIN ACCESO A SISTEMA)
                </span>
                <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white">
                  Acreditar Visitante a Jornada / Visita
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualAttendeeModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveManualAttendee} className="space-y-3.5 text-xs">
              <div>
                <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                  Jornada o Visita Programada *
                </label>
                <select
                  value={manualAttendeeForm.eventId}
                  onChange={e =>
                    setManualAttendeeForm(p => ({ ...p, eventId: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                >
                  {fieldEvents.map(evt => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evt.date})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                    Nombre y Apellido *
                  </label>
                  <input
                    required
                    type="text"
                    value={manualAttendeeForm.name}
                    onChange={e =>
                      setManualAttendeeForm(p => ({ ...p, name: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    required
                    type="email"
                    value={manualAttendeeForm.email}
                    onChange={e =>
                      setManualAttendeeForm(p => ({ ...p, email: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                    DNI / CUIT *
                  </label>
                  <input
                    required
                    type="text"
                    value={manualAttendeeForm.dniNumber}
                    onChange={e =>
                      setManualAttendeeForm(p => ({ ...p, dniNumber: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={manualAttendeeForm.phone}
                    onChange={e =>
                      setManualAttendeeForm(p => ({ ...p, phone: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                    Institución / Procedencia
                  </label>
                  <input
                    type="text"
                    value={manualAttendeeForm.organizationName}
                    onChange={e =>
                      setManualAttendeeForm(p => ({
                        ...p,
                        organizationName: e.target.value
                      }))
                    }
                    placeholder="Ej: Invitado Institucional / Alumno"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                    Localidad y Provincia
                  </label>
                  <input
                    type="text"
                    value={manualAttendeeForm.localityOrProvince}
                    onChange={e =>
                      setManualAttendeeForm(p => ({
                        ...p,
                        localityOrProvince: e.target.value
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualAttendeeForm.autoApproveAndSendEmail}
                  onChange={e =>
                    setManualAttendeeForm(p => ({
                      ...p,
                      autoApproveAndSendEmail: e.target.checked
                    }))
                  }
                  className="rounded text-[#006633]"
                />
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Aprobar acreditación inmediatamente y enviar Pase QR + Programa PDF por correo (Sin dar acceso al sistema)
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualAttendeeModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingManualAttendee}
                  className="px-6 py-2.5 rounded-xl bg-[#006633] hover:bg-[#004d26] text-white text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  {isSavingManualAttendee ? 'Registrando...' : 'Acreditar Visitante en EVENTOS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: VISTA DE PASE QR DE ASISTENTE O QR PÚBLICO DE EVENTO
         ===================================================================== */}
      {qrModalTarget && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 text-center space-y-4 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-[#006633] dark:text-emerald-400">
                {qrModalTarget.type === 'attendee'
                  ? 'PASE QR OFICIAL DE ASISTENTE + MAPA Y GPS'
                  : 'QR DE INSCRIPCIÓN PÚBLICA AL EVENTO + UBICACIÓN GPS'}
              </span>
              <button
                type="button"
                onClick={() => setQrModalTarget(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-[#006633] inline-block mx-auto shadow-md">
              <QRCodeSVG
                id="events-admin-qr-svg"
                value={
                  qrModalTarget.type === 'attendee' && qrModalTarget.attendee
                    ? `https://red.hempc.com.ar/#/login?pase_qr=${encodeURIComponent(
                        qrModalTarget.attendee.eventTicketCode || 'SIEMBRA-21N'
                      )}&email=${encodeURIComponent(qrModalTarget.attendee.email)}&name=${encodeURIComponent(qrModalTarget.attendee.name || '')}&dni=${encodeURIComponent(qrModalTarget.attendee.dniNumber || '')}&phone=${encodeURIComponent(qrModalTarget.attendee.phone || '')}&org=${encodeURIComponent(qrModalTarget.attendee.organizationName || '')}&loc=${encodeURIComponent(qrModalTarget.attendee.localityOrProvince || '')}&evtid=${encodeURIComponent(qrModalTarget.event.id)}`
                    : `https://red.hempc.com.ar/#/login?evento=${encodeURIComponent(
                        qrModalTarget.event.slug
                      )}`
                }
                size={170}
                level="M"
              />
            </div>

            {qrModalTarget.type === 'attendee' && qrModalTarget.attendee ? (
              <div className="space-y-3 text-left bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-2">
                  <p className="text-base font-black uppercase text-slate-900 dark:text-white">
                    {qrModalTarget.attendee.name}
                  </p>
                  <p className="font-mono text-sm font-black text-[#006633] dark:text-emerald-400">
                    {qrModalTarget.attendee.eventTicketCode || 'SIEMBRA-21N'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="block text-[9px] font-mono uppercase text-slate-400">DNI / CUIT</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{qrModalTarget.attendee.dniNumber || 'S/D'}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-mono uppercase text-slate-400">Teléfono</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{qrModalTarget.attendee.phone || 'S/D'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[9px] font-mono uppercase text-slate-400">Correo Electrónico</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{qrModalTarget.attendee.email}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[9px] font-mono uppercase text-slate-400">Institución / Procedencia</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{qrModalTarget.attendee.organizationName || 'Participante Acreditado'} ({qrModalTarget.attendee.localityOrProvince || qrModalTarget.event.locality})</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-black uppercase text-slate-900 dark:text-white">
                  {qrModalTarget.event.title}
                </p>
                <p className="text-xs text-slate-500">{qrModalTarget.event.dateLabel}</p>
                <p className="text-[11px] font-mono text-[#006633] dark:text-emerald-400 break-all">
                  https://red.hempc.com.ar/#/login?evento={qrModalTarget.event.slug}
                </p>
              </div>
            )}

            {/* Mapa Interactivo con Ruta Destacada y Link al GPS del Celular */}
            <EventRouteMapPreview
              event={qrModalTarget.event}
              attendee={qrModalTarget.attendee}
              compact
            />

            <div className="space-y-2 pt-1">
              {qrModalTarget.type === 'attendee' && qrModalTarget.attendee && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!qrModalTarget.attendee) return;
                      const svgEl = document.getElementById('events-admin-qr-svg');
                      const [qrPng, mapSnap] = await Promise.all([
                        svgElementToPngDataUrl(svgEl, 420),
                        captureEventRouteMapSnapshotDataUrl(qrModalTarget.event, 'street')
                      ]);
                      downloadEventAccreditationPassPDF(
                        qrModalTarget.event,
                        qrModalTarget.attendee,
                        qrPng,
                        mapSnap
                      );
                    }}
                    className="w-full py-3 rounded-xl bg-[#006633] hover:bg-[#004d26] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <Download size={15} /> Descargar Credencial QR + Captura Mapa e Instructivo (PDF)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      downloadEventHowToArriveGuidePDF(
                        qrModalTarget.event,
                        qrModalTarget.attendee
                      )
                    }
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#DDDB00] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow cursor-pointer"
                  >
                    <FileText size={15} /> Descargar Solo Instructivo de Cómo Llegar + Mapa (PDF)
                  </button>

                  <button
                    type="button"
                    disabled={resendingPassId === qrModalTarget.attendee.id}
                    onClick={() => {
                      if (!qrModalTarget.attendee) return;
                      handleResendAccreditationPass(qrModalTarget.attendee);
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-[#006633] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {resendingPassId === qrModalTarget.attendee.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Mail size={15} />
                    )}
                    <span>Re-enviar Pase QR + Mapa GPS al Correo ({qrModalTarget.attendee.email})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!qrModalTarget.attendee) return;
                      setAttendeeToDelete(qrModalTarget.attendee);
                    }}
                    className="w-full py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/70 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={14} /> Eliminar Registro de la Base de Datos
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setQrModalTarget(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Cerrar Vista QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CONFIRMACIÓN PARA ELIMINAR VISITANTE DE LA BASE DE DATOS
         ===================================================================== */}
      {attendeeToDelete && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-rose-600 dark:text-rose-400">
                    DEPURACIÓN DE BASE DE DATOS • EVENTOS
                  </span>
                  <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                    ¿Eliminar Registro de Visitante?
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttendeeToDelete(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/70 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-slate-400">Visitante</span>
                <span className="font-mono font-black text-[#006633] dark:text-emerald-400">
                  {attendeeToDelete.eventTicketCode || 'SIN-PASE'}
                </span>
              </div>
              <p className="text-sm font-black uppercase text-slate-900 dark:text-white">
                {attendeeToDelete.name}
              </p>
              <p className="font-mono text-slate-600 dark:text-slate-300">
                {attendeeToDelete.email}
              </p>
              <p className="text-[11px] text-slate-500">
                DNI/CUIT: <strong>{attendeeToDelete.dniNumber || 'S/D'}</strong> ·{' '}
                {attendeeToDelete.organizationName || 'Visitante General'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-[11px] text-rose-800 dark:text-rose-200 leading-relaxed">
              {isEventOnlyAttendee(attendeeToDelete) ? (
                <>
                  Esta acción <strong>eliminará definitivamente el registro de la base de datos (Supabase public.users)</strong> y liberará su vacante en el cupo de la jornada.
                </>
              ) : (
                <>
                  Este usuario posee un rol operativo en la plataforma. Se eliminará únicamente su inscripción al evento sin afectar su cuenta del sistema.
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingAttendee}
                onClick={() => setAttendeeToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingAttendee}
                onClick={handleConfirmDeleteAttendee}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer"
              >
                {isDeletingAttendee ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                <span>
                  {isDeletingAttendee ? 'Eliminando...' : 'Sí, Eliminar de Base de Datos'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL OFICIAL DE COMUNICACIÓN DE ESTADIOS DEL EVENTO:
          1) ACTUALIZACIÓN DE ACTIVIDADES / MODIFICACIONES
          2) SUSPENSIÓN / REPROGRAMACIÓN POR CONDICIONES CLIMÁTICAS
         ===================================================================== */}
      {isNotifyStageModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    notifyStageForm.stage === 'suspension_clima'
                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                      : 'bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300'
                  }`}
                >
                  {notifyStageForm.stage === 'suspension_clima' ? (
                    <CloudRain size={22} />
                  ) : (
                    <Megaphone size={22} />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#006633] dark:text-emerald-400">
                    COMUNICACIÓN OFICIAL A INSCRIPTOS Y ACREDITADOS • EVENTOS
                  </span>
                  <h3 className="text-base sm:text-lg font-black uppercase text-slate-900 dark:text-white">
                    {notifyStageForm.stage === 'suspension_clima'
                      ? 'Estadio 2: Notificar Suspensión / Reprogramación por Clima'
                      : 'Estadio 1: Notificar Actualización de Actividades y Modificaciones'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNotifyStageModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendEventStageNotification} className="space-y-4 text-xs">
              {/* Selector de Estadio (Actualización vs Suspensión por Clima) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const evt =
                      fieldEvents.find(ev => ev.id === notifyStageForm.eventId) || fieldEvents[0];
                    if (evt) openNotifyStageModal(evt, 'actualizacion_programa');
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                    notifyStageForm.stage === 'actualizacion_programa'
                      ? 'border-2 border-sky-600 bg-sky-50/80 dark:bg-sky-950/40'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <RefreshCw size={18} className="text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black uppercase text-slate-900 dark:text-white text-xs">
                      1. Actualización del Evento
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Agregar nuevas actividades técnicas, cambios de horario o actualización de punto de encuentro GPS.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const evt =
                      fieldEvents.find(ev => ev.id === notifyStageForm.eventId) || fieldEvents[0];
                    if (evt) openNotifyStageModal(evt, 'suspension_clima');
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                    notifyStageForm.stage === 'suspension_clima'
                      ? 'border-2 border-amber-500 bg-amber-50/80 dark:bg-amber-950/40'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <CloudRain size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black uppercase text-slate-900 dark:text-white text-xs">
                      2. Suspensión por Clima
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Suspender preventivamente o reprogramar fecha por lluvia, viento o alerta meteorológica.
                    </div>
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                    Evento / Jornada a Notificar *
                  </label>
                  <select
                    value={notifyStageForm.eventId}
                    onChange={e => {
                      const nextEvt = fieldEvents.find(ev => ev.id === e.target.value);
                      if (nextEvt) {
                        openNotifyStageModal(nextEvt, notifyStageForm.stage);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  >
                    {fieldEvents.map(evt => (
                      <option key={evt.id} value={evt.id}>
                        {evt.title} ({evt.date})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                    Destinatarios del Comunicado *
                  </label>
                  <select
                    value={notifyStageForm.targetScope}
                    onChange={e =>
                      setNotifyStageForm(p => ({
                        ...p,
                        targetScope: e.target.value as 'all_registered' | 'only_accredited'
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  >
                    <option value="all_registered">
                      Todos los Inscriptos y Acreditados del Evento
                    </option>
                    <option value="only_accredited">
                      Solo Asistentes con Acreditación Aprobada (Pase QR Activo)
                    </option>
                  </select>
                </div>
              </div>

              {notifyStageForm.stage === 'actualizacion_programa' ? (
                <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-2xl p-4 space-y-3">
                  <div>
                    <label className="font-black uppercase text-[10px] text-sky-900 dark:text-sky-300 block mb-1">
                      Nuevas Actividades Agregadas o Modificaciones del Cronograma *
                    </label>
                    <textarea
                      rows={2}
                      value={notifyStageForm.addedActivitiesText}
                      onChange={e =>
                        setNotifyStageForm(p => ({ ...p, addedActivitiesText: e.target.value }))
                      }
                      placeholder="Ej: 11:30 hs — Nueva demostración de cosecha y bloque técnico en Parcela Demostrativa..."
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                        Horario de Inicio (Opcional)
                      </label>
                      <input
                        type="time"
                        value={notifyStageForm.newStartTime}
                        onChange={e =>
                          setNotifyStageForm(p => ({ ...p, newStartTime: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                        Horario de Cierre (Opcional)
                      </label>
                      <input
                        type="time"
                        value={notifyStageForm.newEndTime}
                        onChange={e =>
                          setNotifyStageForm(p => ({ ...p, newEndTime: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-black uppercase text-[10px] text-amber-900 dark:text-amber-300 block mb-1">
                        Nueva Fecha Reprogramada (Opcional)
                      </label>
                      <input
                        type="date"
                        value={notifyStageForm.rescheduledDate}
                        onChange={e =>
                          setNotifyStageForm(p => ({ ...p, rescheduledDate: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 font-mono font-bold text-slate-900 dark:text-white"
                      />
                      <span className="text-[10px] text-amber-800 dark:text-amber-300 block mt-1">
                        Si se deja vacío, queda como "Suspendido por Clima (Fecha a confirmar)".
                      </span>
                    </div>
                    <div>
                      <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                        Horario Inicio
                      </label>
                      <input
                        type="time"
                        value={notifyStageForm.newStartTime}
                        onChange={e =>
                          setNotifyStageForm(p => ({ ...p, newStartTime: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                        Horario Cierre
                      </label>
                      <input
                        type="time"
                        value={notifyStageForm.newEndTime}
                        onChange={e =>
                          setNotifyStageForm(p => ({ ...p, newEndTime: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                  Comunicado Oficial que recibirá el Asistente en su Correo *
                </label>
                <textarea
                  required
                  rows={3}
                  value={notifyStageForm.noticeMessage}
                  onChange={e =>
                    setNotifyStageForm(p => ({ ...p, noticeMessage: e.target.value }))
                  }
                  placeholder="Escribí el motivo de la actualización o suspensión climática..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  El correo incluirá automáticamente este comunicado, el estado de validez del Pase QR y la georreferencia GPS del predio.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNotifyStageModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingStageNotification}
                  className={`px-6 py-2.5 rounded-xl text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer ${
                    notifyStageForm.stage === 'suspension_clima'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-sky-600 hover:bg-sky-700'
                  }`}
                >
                  {isSendingStageNotification ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : notifyStageForm.stage === 'suspension_clima' ? (
                    <CloudRain size={15} />
                  ) : (
                    <Megaphone size={15} />
                  )}
                  <span>
                    {isSendingStageNotification
                      ? 'Emitiendo Comunicado...'
                      : notifyStageForm.stage === 'suspension_clima'
                        ? 'Confirmar Suspensión / Reprogramación y Notificar'
                        : 'Confirmar Actualización de Evento y Notificar'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
