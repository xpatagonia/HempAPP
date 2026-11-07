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
  Sparkles
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import {
  User,
  FieldEvent,
  FieldEventCategory,
  FieldEventStatus
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
  downloadEventCalendarICS
} from '../src/services/eventsManagementService';
import { downloadUnDiaDeSiembraProgramPDF } from '../src/services/eventProgramPdfService';
import { sendEventAccreditationApprovedEmail } from '../src/services/emailNotificationService';
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
    if (!eventForm.title || !eventForm.date || !eventForm.venueName) return;
    setIsSavingEvent(true);
    try {
      const saved = await saveFieldEvent({
        ...eventForm,
        title: eventForm.title,
        date: eventForm.date,
        venueName: eventForm.venueName
      });
      setIsEventModalOpen(false);
      setSelectedEventId(saved.id);
      showNotice(
        true,
        'Evento / Visita Programada Guardada',
        `Se actualizó el calendario oficial con "${saved.title}" (${saved.dateLabel}).`
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
    const defaultEst = enabledEstablishments[0];
    setEventForm({
      title: '',
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
      description: ''
    });
    setQuickCoordsInput(
      defaultEst
        ? `${defaultEst.coordinates.lat.toFixed(6)}, ${defaultEst.coordinates.lng.toFixed(6)}`
        : '-43.308362, -65.289033'
    );
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (evt: FieldEvent) => {
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
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                <Lock size={14} className="text-[#006633] dark:text-emerald-400" />
                <span>
                  Padrón de Inscriptos en Jornadas ({filteredAttendees.length} registros)
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Aprobar envía el Pase QR Oficial + Programa PDF sin habilitar login al sistema.
              </span>
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
                      <td colSpan={6} className="p-10 text-center text-slate-400">
                        No hay registros de visitantes para los criterios seleccionados.
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

              return (
                <div
                  key={evt.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 shadow-xs"
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
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <MapPin size={14} className="text-amber-500 shrink-0" />
                        <span className="truncate">
                          {evt.venueName} ({evt.locality})
                        </span>
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
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEventId(evt.id);
                          setActiveTab('accreditations');
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-[#006633] hover:bg-[#004d26] text-white text-[11px] font-black uppercase tracking-wider text-center cursor-pointer"
                      >
                        Ver Registrados ({evtAttendees.length})
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
                        title="Ver QR público de inscripción"
                      >
                        <QrCode size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditEventModal(evt)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer"
                        title="Editar Evento / Visita"
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
          MODAL: CREAR / EDITAR EVENTO O VISITA PROGRAMADA
         ===================================================================== */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#006633] dark:text-emerald-400">
                  ADMINISTRACIÓN EXCLUSIVA DE EVENTOS
                </span>
                <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white">
                  {eventForm.id ? 'Editar Evento / Visita Programada' : 'Crear Nuevo Evento o Visita de Campo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEventSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                    Título del Evento / Jornada / Visita *
                  </label>
                  <input
                    required
                    type="text"
                    value={eventForm.title || ''}
                    onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Ej: Visita Programada: Seguimiento de Floración en Lote 2"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>

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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  >
                    <option value="jornada_campo">Jornada Oficial de Campo</option>
                    <option value="visita_programada">Visita Técnica Programada</option>
                    <option value="diplomatura_practica">Práctica Presencial Diplomatura</option>
                    <option value="recorrida_institucional">Recorrida Institucional / Auditoría</option>
                  </select>
                </div>

                <div>
                  <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                    Estado de Inscripción *
                  </label>
                  <select
                    value={eventForm.status || 'inscripcion_abierta'}
                    onChange={e =>
                      setEventForm(p => ({
                        ...p,
                        status: e.target.value as FieldEventStatus
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  >
                    <option value="inscripcion_abierta">Inscripción Abierta</option>
                    <option value="cupo_completo">Cupo Completo</option>
                    <option value="reprogramado_clima">Reprogramado por Clima</option>
                    <option value="en_curso">En Curso Hoy</option>
                    <option value="finalizado">Jornada Finalizada</option>
                  </select>
                </div>

                <div>
                  <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                    Fecha Programada *
                  </label>
                  <input
                    required
                    type="date"
                    value={eventForm.date || ''}
                    onChange={e => setEventForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                      Hora Inicio
                    </label>
                    <input
                      type="time"
                      value={eventForm.startTime || '08:30'}
                      onChange={e => setEventForm(p => ({ ...p, startTime: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
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
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* DESPLEGABLE VINCULADO A TABLA DE ESTABLECIMIENTOS Y CAMPOS HABILITADOS + OPCIÓN OTRO */}
                <div className="sm:col-span-2 bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-[#006633]/30 rounded-2xl p-4 space-y-3.5">
                  <div>
                    <label className="font-black uppercase text-[10px] text-[#006633] dark:text-emerald-400 block mb-1">
                      Establecimiento del Evento (Campos Habilitados en la Red o Locación Externa) *
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
                          setEventForm(p => ({
                            ...p,
                            locationId: resolved.locationId,
                            clientId: resolved.clientId,
                            isCustomLocation: false,
                            venueName: resolved.venueName,
                            locality: resolved.locality,
                            address: resolved.address,
                            coordinates: resolved.coordinates,
                            routeInstructions: resolved.routeInstructions,
                            routeWaypoints: resolved.routeWaypoints
                          }));
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-[#006633]/50 font-black text-slate-900 dark:text-white"
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

                  {/* Si seleccionó OTRO: Habilita el bloque para ingresar la Locación Personalizada */}
                  {(eventForm.isCustomLocation || eventForm.locationId === 'OTHER') ? (
                    <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3.5 space-y-3">
                      <div className="text-[10px] font-mono font-black uppercase text-amber-800 dark:text-amber-300">
                        📍 LOCACIÓN PERSONALIZADA HABILITADA (OPCIÓN: OTRO)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-black uppercase text-[10px] text-slate-600 dark:text-slate-300 block mb-1">
                            Nombre del Lugar / Establecimiento del Evento *
                          </label>
                          <input
                            required
                            type="text"
                            value={eventForm.venueName || ''}
                            onChange={e =>
                              setEventForm(p => ({ ...p, venueName: e.target.value }))
                            }
                            placeholder="Ej: Predio Ferial Sociedad Rural / Aula Magna UNPSJB"
                            className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 font-bold text-slate-900 dark:text-white"
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
                            placeholder="Ej: Gaiman, Chubut"
                            className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 font-bold text-slate-900 dark:text-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="font-black uppercase text-[10px] text-slate-600 dark:text-slate-300 block mb-1">
                            Dirección Vial / Kilómetro de Ruta *
                          </label>
                          <input
                            required
                            type="text"
                            value={eventForm.address || ''}
                            onChange={e =>
                              setEventForm(p => ({ ...p, address: e.target.value }))
                            }
                            placeholder="Ej: Ruta Provincial 7 Km 18, Bajada Puente Viejo"
                            className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 font-bold text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/70">
                      <div>
                        <span className="text-[9px] font-mono uppercase text-slate-400 block">
                          Establecimiento y Campo Vinculado
                        </span>
                        <span className="font-black text-xs text-slate-900 dark:text-white">
                          {eventForm.venueName}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono uppercase text-slate-400 block">
                          Localidad y Dirección Vial
                        </span>
                        <span className="font-bold text-xs text-[#006633] dark:text-emerald-400">
                          {eventForm.address} ({eventForm.locality})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Coordenadas GPS para el Celular y Ruta Destacada */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
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
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                        Pegar Coordenadas Google Maps
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
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-[#006633] dark:text-emerald-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                      Ruta Destacada Paso a Paso (Se envía en el correo de acreditación y en el Pase QR) *
                    </label>
                    <textarea
                      rows={2}
                      value={eventForm.routeInstructions || ''}
                      onChange={e =>
                        setEventForm(p => ({ ...p, routeInstructions: e.target.value }))
                      }
                      placeholder="Indicaciones viales desde la ruta principal hasta la tranquera de acreditación..."
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Vista Previa en Vivo del Mapa con la Ruta Destacada y Link al GPS del Celular */}
                  <EventRouteMapPreview event={eventForm} compact />
                </div>

                <div>
                  <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                    Cupo Máximo de Asistentes
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={eventForm.maxCapacity || 60}
                    onChange={e =>
                      setEventForm(p => ({ ...p, maxCapacity: Number(e.target.value) }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-black uppercase text-[10px] text-slate-500 block mb-1">
                    Objetivos Técnicos y Protocolo de la Visita / Jornada
                  </label>
                  <textarea
                    rows={3}
                    value={eventForm.description || ''}
                    onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Detalle del recorrido por lotes, paradas técnicas y requisitos de acreditación..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEvent}
                  className="px-6 py-2.5 rounded-xl bg-[#006633] hover:bg-[#004d26] text-white text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  {isSavingEvent ? 'Guardando...' : 'Guardar en Calendario de EVENTOS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ACREDITAR VISITANTE MANUALMENTE DESDE ADMINISTRACIÓN
         ===================================================================== */}
      {isManualAttendeeModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
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
                        captureEventRouteMapSnapshotDataUrl(qrModalTarget.event, 'satellite')
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
    </div>
  );
}
