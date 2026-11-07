import React, { useState, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X, Calendar, UserCheck, Mail, Phone, Building2,
  MapPin, CheckCircle2, Download,
  Loader2, ShieldCheck, AlertCircle, Clock, AlertTriangle, KeyRound
} from 'lucide-react';
import { User, FieldEvent } from '../types';
import { sendEventRegistrationConfirmationEmail } from '../src/services/emailNotificationService';
import {
  downloadUnDiaDeSiembraProgramPDF,
  EVENT_SCHEDULE_ITEMS,
  EVENT_LOT_SCHEMES,
  EVENT_METADATA
} from '../src/services/eventProgramPdfService';
import {
  DEFAULT_FIELD_EVENTS,
  createEventRegistrationRecord,
  isEventOnlyAttendee,
  downloadEventAccreditationPassPDF,
  svgElementToPngDataUrl
} from '../src/services/eventsManagementService';
import { createPendingPublicRegistration } from '../src/services/producerOnboardingWorkflow';

interface EventAndSelfRegistrationModalProps {
  isOpen: boolean;
  initialMode?: 'event' | 'platform';
  selectedEvent?: FieldEvent;
  preConfirmedAttendee?: Partial<User> | null;
  onClose: () => void;
  usersList: User[];
  addUser: (u: User) => Promise<boolean>;
  updateUser: (u: User) => Promise<boolean>;
}

const PROFILE_LABELS: Record<NonNullable<User['requestedProfileType']>, string> = {
  visitante: 'Visitante / Invitado General',
  productor: 'Productor Agropecuario / Socio Cooperativo',
  tecnico_institucion: 'Alumno Diplomatura / Técnico (UNLZ, UATRE, INTA)',
  inversor_cadena: 'Inversor / Cadena Industrial'
};

export default function EventAndSelfRegistrationModal({
  isOpen,
  initialMode = 'event',
  selectedEvent,
  preConfirmedAttendee,
  onClose,
  usersList,
  addUser,
  updateUser
}: EventAndSelfRegistrationModalProps) {
  const [mode, setMode] = useState<'event' | 'platform'>(initialMode);
  const [step, setStep] = useState<'form' | 'confirm_email' | 'confirmed'>('form');
  const activeEvent = selectedEvent || DEFAULT_FIELD_EVENTS[0];

  // Datos del formulario (Priorizando Visitante / Invitado General por defecto y sin pedir contraseña previa)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [requestedProfile, setRequestedProfile] = useState<NonNullable<User['requestedProfileType']>>('visitante');
  const [organizationName, setOrganizationName] = useState('');
  const [locality, setLocality] = useState('');
  const [estimatedHa, setEstimatedHa] = useState('');
  const [dniNumber, setDniNumber] = useState('');

  // Estados de envío y verificación
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  const [generatedPin, setGeneratedPin] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [emailResultInfo, setEmailResultInfo] = useState<{ sentFrom: string; via: string } | null>(null);
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (preConfirmedAttendee && (preConfirmedAttendee.email || preConfirmedAttendee.eventTicketCode)) {
        setMode('event');
        setCreatedUser({
          id: preConfirmedAttendee.id || `evt-att-${Date.now()}`,
          name: preConfirmedAttendee.name || 'Visitante Registrado',
          email: preConfirmedAttendee.email || '',
          role: 'viewer',
          accessScope: 'event_attendee',
          phone: preConfirmedAttendee.phone || '',
          dniNumber: preConfirmedAttendee.dniNumber || '',
          organizationName: preConfirmedAttendee.organizationName || 'Visitante a Jornada',
          localityOrProvince: preConfirmedAttendee.localityOrProvince || activeEvent.locality,
          eventRegistered: true,
          eventConfirmedByEmail: true,
          eventTicketCode: preConfirmedAttendee.eventTicketCode || 'SIEMBRA-21N-OFICIAL',
          requestedProfileType: 'visitante',
          accountStatus: preConfirmedAttendee.accountStatus || 'pending_approval',
          isNetworkMember: false
        });
        setStep('confirmed');
        setFormError('');
        return;
      }
      setMode(initialMode);
      setRequestedProfile('visitante');
      setStep('form');
      setFormError('');
      setEnteredPin('');
    }
  }, [initialMode, isOpen, preConfirmedAttendee, activeEvent.locality]);

  const isEventSelected = mode === 'event';

  const ticketCode = useMemo(() => {
    if (createdUser?.eventTicketCode) return createdUser.eventTicketCode;
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `SIEMBRA-21N-${suffix}`;
  }, [createdUser]);

  if (!isOpen) return null;

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    if (!cleanName || !cleanEmail) {
      setFormError('Por favor completá tu Nombre y Apellido y tu Correo Electrónico.');
      return;
    }

    const existing = usersList.find(u => u.email?.toLowerCase() === cleanEmail);
    const isAlreadyActiveAccount = Boolean(
      existing && !isEventOnlyAttendee(existing) && existing.accountStatus === 'active' && !existing.passwordPendingSetup
    );

    if (!isEventSelected && isAlreadyActiveAccount) {
      setFormError('Este correo electrónico ya tiene una cuenta activa en la plataforma. Podés iniciar sesión directamente.');
      return;
    }

    setIsSubmitting(true);
    try {
      const pin = String(Math.floor(100000 + Math.random() * 900000));
      setGeneratedPin(pin);

      const effectiveProfile: NonNullable<User['requestedProfileType']> = isEventSelected ? 'visitante' : requestedProfile;
      const profileText = isEventSelected ? 'Visitante a Jornada / Acreditación Presencial' : PROFILE_LABELS[effectiveProfile];

      let newUserObj: User;
      if (isEventSelected) {
        newUserObj = createEventRegistrationRecord({
          name: cleanName,
          email: cleanEmail,
          phone: phone.trim(),
          dniNumber: dniNumber.trim(),
          organizationName: organizationName.trim(),
          localityOrProvince: locality.trim() || activeEvent.locality,
          attendeeCategoryLabel: profileText,
          event: activeEvent,
          existingUser: existing
        });
      } else {
        const { user } = createPendingPublicRegistration(
          {
            name: cleanName,
            email: cleanEmail,
            phone: phone.trim(),
            dniNumber: dniNumber.trim(),
            organizationName: organizationName.trim(),
            localityOrProvince: locality.trim(),
            estimatedHectares: estimatedHa ? Number(estimatedHa) : undefined,
            requestedProfileType: effectiveProfile,
            registrationSource: 'self_service_platform',
            isEventRegistration: false
          },
          existing
        );
        newUserObj = {
          ...user,
          accessScope: effectiveProfile === 'visitante' ? 'event_attendee' : 'system_user'
        };
      }

      if (existing) {
        await updateUser(newUserObj);
      } else {
        await addUser(newUserObj);
      }

      const finalTicket = newUserObj.eventTicketCode || `SIEMBRA-21N-${String(Date.now()).slice(-4)}`;

      // Despachar correo oficial desde notificaciones@hempc.com.ar vía Resend.com
      const emailDispatch = await sendEventRegistrationConfirmationEmail({
        toEmail: cleanEmail,
        toName: cleanName,
        ticketCode: isEventSelected ? finalTicket : `ALTA-NUCLEUS-${String(Date.now()).slice(-4)}`,
        verificationPin: pin,
        profileLabel: profileText,
        dniNumber: newUserObj.dniNumber,
        phone: newUserObj.phone,
        organizationName: newUserObj.organizationName,
        locality: newUserObj.localityOrProvince
      });

      setEmailResultInfo({
        sentFrom: emailDispatch.sentFrom || 'notificaciones@hempc.com.ar',
        via: emailDispatch.deliveredVia
      });
      setCreatedUser(newUserObj);

      if (isEventSelected) {
        setStep('confirm_email');
      } else {
        setStep('confirmed');
      }
    } catch (err: any) {
      setFormError('No se pudo procesar la solicitud. Verificá tu conexión e intentá nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmEmailStep = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!createdUser) return;
    if (enteredPin.trim() && generatedPin && enteredPin.trim() !== generatedPin.trim()) {
      setFormError(`El código ingresado no coincide con el PIN enviado (${generatedPin}). Verificalo e intentá nuevamente.`);
      return;
    }
    setFormError('');

    const updated: User = {
      ...createdUser,
      eventConfirmedByEmail: true
    };
    await updateUser(updated);
    setCreatedUser(updated);
    setStep('confirmed');
  };

  const handleDownloadProgram = async () => {
    if (!createdUser) return;
    downloadUnDiaDeSiembraProgramPDF({
      name: createdUser.name,
      email: createdUser.email,
      ticketCode: createdUser.eventTicketCode || ticketCode,
      profileLabel: PROFILE_LABELS[createdUser.requestedProfileType || 'visitante'],
      organizationName: createdUser.organizationName,
      locality: createdUser.localityOrProvince,
      phone: createdUser.phone
    });

    const updated: User = {
      ...createdUser,
      eventConfirmedByEmail: true,
      eventProgramDownloaded: true
    };
    await updateUser(updated);
    setCreatedUser(updated);
  };

  const handleDownloadPassCredential = async () => {
    if (!createdUser) return;
    const svgEl = document.getElementById('modal-confirmed-qr-svg');
    const qrDataUrl = await svgElementToPngDataUrl(svgEl, 360);
    downloadEventAccreditationPassPDF(activeEvent, createdUser, qrDataUrl);
  };

  // Orden de perfiles priorizando VISITANTE / INVITADO GENERAL primero
  const profileOptions = [
    {
      id: 'visitante' as const,
      title: 'Visitante / Invitado General',
      desc: isEventSelected
        ? 'Acreditación oficial a la jornada y acceso al Programa Oficial PDF'
        : 'Acceso general de consulta y seguimiento en plataforma NUCLEUS',
      recommended: true
    },
    {
      id: 'productor' as const,
      title: 'Productor Agropecuario / Socio',
      desc: 'Incorporación como Socio Productor de la Red Cooperativa',
      recommended: false
    },
    {
      id: 'tecnico_institucion' as const,
      title: 'Alumno Diplomatura / UATRE / UNLZ',
      desc: 'Práctica presencial Módulo 7, INTA, Técnicos y Autoridades',
      recommended: false
    },
    {
      id: 'inversor_cadena' as const,
      title: 'Inversor / Cadena Industrial',
      desc: 'Grano, Cañamiza (Hempcrete) y Fibra Textil',
      recommended: false
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-[32px] shadow-2xl max-w-3xl w-full overflow-hidden relative my-2 sm:my-6 animate-in zoom-in-95 flex flex-col max-h-[95dvh] sm:max-h-[90vh]">
        {/* Encabezado Diferenciado según sea Evento o Solicitud de Alta en Plataforma */}
        {isEventSelected ? (
          <div className="bg-[#0c2d1e] p-4 sm:p-6 text-white relative border-l-4 border-amber-500 border-b border-emerald-800/60 flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

            <div className="pr-8">
              <p className="text-[#DDDB00] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] mb-1">
                {EVENT_METADATA.diplomatura}
              </p>

              <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-white leading-tight">
                JORNADA OFICIAL: “UN DÍA DE SIEMBRA”
              </h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs text-emerald-100/90 mt-1 font-medium">
                <span>{EVENT_METADATA.sede}</span>
                <span className="hidden sm:inline">•</span>
                <span>{EVENT_METADATA.ubicacion}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3.5 pt-3 border-t border-white/10 text-[10px]">
              <div className="bg-black/25 px-2.5 py-1.5 rounded-lg border-l-2 border-[#DDDB00]">
                <span className="text-slate-400 font-bold uppercase block text-[8px]">ORGANIZAN</span>
                <span className="font-black text-white">{EVENT_METADATA.organizan}</span>
              </div>
              <div className="bg-black/25 px-2.5 py-1.5 rounded-lg border-l-2 border-[#DDDB00]">
                <span className="text-slate-400 font-bold uppercase block text-[8px]">HORARIO GENERAL</span>
                <span className="font-black text-white">{EVENT_METADATA.horarioGeneral}</span>
              </div>
              <div className="bg-black/25 px-2.5 py-1.5 rounded-lg border-l-2 border-[#DDDB00]">
                <span className="text-slate-400 font-bold uppercase block text-[8px]">ESQUEMA DE CAMPO</span>
                <span className="font-black text-white">{EVENT_METADATA.esquemaCampo}</span>
              </div>
              <div className="bg-black/25 px-2.5 py-1.5 rounded-lg border-l-2 border-[#DDDB00]">
                <span className="text-slate-400 font-bold uppercase block text-[8px]">METODOLOGÍA</span>
                <span className="font-black text-white">{EVENT_METADATA.metodologia}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 p-4 sm:p-6 text-white relative border-l-4 border-[#006633] border-b border-slate-800 flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

            <div className="pr-8">
              <p className="text-[#DDDB00] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em] mb-1">
                NUCLEUS • PLATAFORMA INTELIGENTE DE TRAZABILIDAD Y GESTIÓN AGRO INDUSTRIAL
              </p>

              <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-white leading-tight flex items-center gap-2">
                <UserCheck size={22} className="text-[#DDDB00] flex-shrink-0" />
                <span>SOLICITUD DE ALTA DE USUARIO</span>
              </h2>

              <p className="text-[11px] sm:text-xs text-slate-300 mt-1">
                Registro autogestivo sujeto a aprobación de los Administradores. Una vez aprobado tu perfil, recibirás por correo el enlace de activación para definir tu contraseña.
              </p>
            </div>
          </div>
        )}

        {/* PASO 1: FORMULARIO DE INSCRIPCIÓN O ALTA DE USUARIO (SIN CAMPO DE CONTRASEÑA) */}
        {step === 'form' && (
          <form onSubmit={handleSubmitRegistration} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2.5">
                <AlertCircle size={18} className="flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Aviso Oficial de Reprogramación y Vista Previa del Programa (Solo en modo Evento) */}
            {isEventSelected && (
              <>
                <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 border border-amber-200 dark:border-amber-800/70 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-black text-[11px] uppercase tracking-wider">
                      <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                      <span>AVISO IMPORTANTE: SE REPROGRAMA EN CASO DE MAL TIEMPO (Aviso 24 hs antes)</span>
                    </div>
                    <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90">
                      El programa de actividades se encuentra <strong>sujeto a actualización</strong>. Al registrarte recibirás confirmación previa desde <strong>notificaciones@hempc.com.ar</strong> para descargar el Programa Oficial en PDF.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSchedulePreview(!showSchedulePreview)}
                    className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider whitespace-nowrap hover:bg-amber-100 transition cursor-pointer self-start sm:self-center"
                  >
                    {showSchedulePreview ? 'Ocultar Programa' : 'Ver Programa Oficial'}
                  </button>
                </div>

                {showSchedulePreview && (
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 text-xs animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-amber-500/40 pb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#0c2d1e] dark:text-emerald-400">
                        1. CRONOGRAMA GENERAL DE ACTIVIDADES (08:30 a 15:30 hs)
                      </span>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                        * Sujeto a actualización
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
                      {EVENT_SCHEDULE_ITEMS.map((item, idx) => (
                        <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3">
                          <div className="sm:w-28 flex-shrink-0 flex items-center justify-between sm:block">
                            <span className="font-mono font-black text-[11px] text-slate-900 dark:text-white">
                              {item.time}
                            </span>
                            <span className="inline-block sm:mt-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[9px] font-black uppercase">
                              {item.audience}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-black text-slate-900 dark:text-white text-xs">
                              {item.block}{' '}
                              <span className="font-normal text-slate-500 dark:text-slate-400">• {item.subBlock}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <p className="text-[11px] font-black uppercase tracking-wider text-[#0c2d1e] dark:text-emerald-400 mb-2">
                        2. ESQUEMA DE SIEMBRA EN 3 LOTES DIFERENCIADOS POR PROPÓSITO
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        {EVENT_LOT_SCHEMES.map((lot, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1"
                          >
                            <div className="font-black text-[11px] text-emerald-800 dark:text-emerald-400 uppercase">
                              {lot.unit.replace('\n', ' • ')}
                            </div>
                            <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                              {lot.purpose.replace('\n', ' ')}
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-pre-line">
                              {lot.parameters}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 1. Perfil de Registro: En Evento SOLO aparece Visitante al Evento; en Solicitud de Alta aparecen todos priorizando Visitante */}
            {isEventSelected ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-[#006633] dark:border-emerald-500 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#006633] text-[#DDDB00] flex items-center justify-center flex-shrink-0 shadow-sm">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black uppercase text-slate-900 dark:text-white">
                        Perfil de Inscripción: Visitante al Evento
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#006633] text-[#DDDB00] text-[9px] font-mono font-black uppercase">
                        ACREDITACIÓN OFICIAL
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      Pase de asistencia a la Jornada Oficial “Un Día de Siembra” y descarga del Programa Oficial PDF.
                    </p>
                  </div>
                </div>
                <CheckCircle2 size={18} className="text-[#006633] dark:text-emerald-400 flex-shrink-0" />
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-2">
                  1. Seleccioná tu Perfil (Prioridad: Visitante / Invitado General) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {profileOptions.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRequestedProfile(opt.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        requestedProfile === opt.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-[#006633] dark:border-emerald-500 ring-2 ring-[#006633]/20'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{opt.title}</span>
                          {opt.recommended && (
                            <span className="text-[9px] font-mono font-bold text-[#006633] dark:text-emerald-400">
                              • PRINCIPAL
                            </span>
                          )}
                        </span>
                        {requestedProfile === opt.id && (
                          <CheckCircle2 size={16} className="text-[#006633] dark:text-emerald-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Datos Personales y de Contacto (SIN DEFINIR CONTRASEÑA) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  Nombre y Apellido Completo *
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej: Martín Gómez"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  Correo Electrónico Oficial *
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com.ar"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  Teléfono / WhatsApp *
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+54 9 280 4..."
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  DNI / CUIT (Identificación) *
                </label>
                <input
                  required
                  type="text"
                  value={dniNumber}
                  onChange={e => setDniNumber(e.target.value)}
                  placeholder="Ej: 28.450.123"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  {isEventSelected ? 'Institución / Procedencia (Opcional)' : 'Establecimiento / Delegación / Institución'}
                </label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={organizationName}
                    onChange={e => setOrganizationName(e.target.value)}
                    placeholder={
                      isEventSelected
                        ? 'Visitante / Invitado General o Institución'
                        : requestedProfile === 'productor'
                        ? 'Nombre de Chacra / Campo'
                        : 'Delegación, Univ. o Invitado'
                    }
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  Localidad y Provincia *
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="text"
                    value={locality}
                    onChange={e => setLocality(e.target.value)}
                    placeholder="Ej: Trelew, Chubut"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                  />
                </div>
              </div>

              {!isEventSelected && requestedProfile === 'productor' && (
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 block mb-1">
                    Superficie Estimada Disponible para Siembra (Hectáreas)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={estimatedHa}
                    onChange={e => setEstimatedHa(e.target.value)}
                    placeholder="Ej: 5 ha"
                    className="w-full px-3.5 py-2.5 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                  />
                </div>
              )}
            </div>

            {/* Aviso de Seguridad diferenciado: Acreditación de Evento vs Alta en Plataforma */}
            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 rounded-xl p-3.5 text-[11px] text-slate-700 dark:text-slate-200 flex items-start gap-2.5">
              <KeyRound size={16} className="text-[#006633] dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                {isEventSelected ? (
                  <>
                    <strong className="text-slate-900 dark:text-white">Acreditación Exclusiva para la Jornada:</strong> Esta inscripción registra tu asistencia en el módulo oficial de <strong>EVENTOS</strong> para emitir tu Pase QR y habilitar la descarga del Programa Oficial PDF. No requiere contraseña ni otorga acceso al sistema interno de datos productivos.
                  </>
                ) : (
                  <>
                    <strong className="text-slate-900 dark:text-white">Seguridad de Contraseña tras Aprobación:</strong> No necesitás definir una clave ahora. Una vez que un Administrador apruebe tu alta en la plataforma, recibirás desde <strong>notificaciones@hempc.com.ar</strong> el enlace directo para ingresar tu contraseña y confirmar el acceso.
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black uppercase text-slate-500 hover:text-slate-700 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 bg-[#006633] hover:bg-[#004d26] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Enviando Solicitud...</span>
                  </>
                ) : (
                  <>
                    <Mail size={16} />
                    <span>
                      {isEventSelected
                        ? 'Registrarme y Recibir Mail de Confirmación'
                        : 'Enviar Solicitud de Alta a Administración'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* PASO 2: VERIFICACIÓN DEL CORREO ENVIADO PREVIO A LA DESCARGA DEL PROGRAMA */}
        {step === 'confirm_email' && createdUser && (
          <div className="p-4 sm:p-8 space-y-5 overflow-y-auto flex-1 animate-in fade-in">
            <div className="bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center space-y-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg">
                <Mail size={26} />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-black uppercase tracking-widest">
                Paso Previo Requerido • Correo Enviado
              </span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase">
                ¡Revisá tu casilla de correo!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                Hemos despachado tu confirmación oficial desde{' '}
                <strong className="text-emerald-700 dark:text-emerald-300">
                  {emailResultInfo?.sentFrom || 'notificaciones@hempc.com.ar'}
                </strong>{' '}
                (vía Resend.com) hacia <strong className="underline break-all">{createdUser.email}</strong> con tu pase{' '}
                <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                  {createdUser.eventTicketCode}
                </span>.
              </p>
            </div>

            <form onSubmit={handleConfirmEmailStep} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 p-3 rounded-xl text-xs font-bold">
                  {formError}
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Ingresá el Código del Mail o Confirmá Recepción para Descargar el Programa
                </label>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  PIN enviado: {generatedPin}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={enteredPin}
                  onChange={e => {
                    setEnteredPin(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder={`Código de 6 dígitos (ej: ${generatedPin})`}
                  className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-black text-center tracking-widest text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3.5 bg-[#006633] hover:bg-[#004d26] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Confirmar Email y Habilitar Descarga</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Una vez confirmado el correo electrónico, se habilita la descarga del <strong>Programa Oficial “Un Día de Siembra” (PDF de 3 páginas)</strong>.
              </p>
            </form>
          </div>
        )}

        {/* PASO 3: SOLICITUD / ACREDITACIÓN CONFIRMADA */}
        {step === 'confirmed' && createdUser && (
          <div className="p-4 sm:p-8 space-y-5 overflow-y-auto flex-1 animate-in zoom-in-95">
            <div className="bg-[#0c2d1e] text-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-[#DDDB00] shadow-xl flex flex-col sm:flex-row items-center gap-5">
              {isEventSelected && createdUser.eventRegistered && (
                <div className="bg-white p-3 rounded-2xl shadow-md flex-shrink-0">
                  <QRCodeSVG
                    id="modal-confirmed-qr-svg"
                    value={`https://red.hempc.com.ar/#/login?pase_qr=${encodeURIComponent(
                      createdUser.eventTicketCode || ticketCode
                    )}&email=${encodeURIComponent(createdUser.email)}&name=${encodeURIComponent(
                      createdUser.name
                    )}&dni=${encodeURIComponent(createdUser.dniNumber || '')}&phone=${encodeURIComponent(
                      createdUser.phone || ''
                    )}&org=${encodeURIComponent(createdUser.organizationName || '')}&loc=${encodeURIComponent(
                      createdUser.localityOrProvince || ''
                    )}`}
                    size={104}
                    level="M"
                  />
                </div>
              )}

              <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[#DDDB00] text-[10px] font-black uppercase tracking-widest">
                  <CheckCircle2 size={13} />
                  <span>
                    {isEventSelected && createdUser.eventRegistered
                      ? 'Email Confirmado • Inscripción Registrada en EVENTOS'
                      : 'Solicitud de Alta de Usuario Recibida'}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight truncate">
                  {createdUser.name}
                </h3>
                <p className="text-xs text-emerald-200 font-medium">
                  DNI: <strong>{createdUser.dniNumber || 'S/D'}</strong> • Tel: <strong>{createdUser.phone || 'S/D'}</strong> •{' '}
                  {createdUser.organizationName} ({createdUser.localityOrProvince || activeEvent.locality})
                </p>
                <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {isEventSelected && createdUser.eventRegistered && (
                    <span className="px-3 py-1 rounded-lg bg-black/40 font-mono text-xs font-black text-[#DDDB00]">
                      PASE VISITANTE: {createdUser.eventTicketCode || ticketCode}
                    </span>
                  )}
                  {createdUser.accountStatus === 'active' && !createdUser.passwordPendingSetup ? (
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1">
                      <CheckCircle2 size={12} /> Cuenta Activa en NUCLEUS
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase flex items-center gap-1">
                      <Clock size={12} /> {isEventSelected ? 'Aguardando Aprobación de Acreditación Admin' : 'Pendiente de Aprobación Admin'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Botones Principales de Descarga: Credencial Pase QR + Programa Oficial (SOLO PARA EL VISITANTE AL EVENTO) */}
            {isEventSelected && createdUser.eventRegistered && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-slate-900 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-emerald-500/40 flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center lg:text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                    Documentación Oficial del Asistente • PatagonianC & UATRE
                  </span>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase">
                    CREDENCIAL PASE QR Y PROGRAMA OFICIAL “UN DÍA DE SIEMBRA” (PDF)
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Descargá tu Credencial con los datos de tu registro y el Programa Oficial de Actividades (08:30 a 15:30 hs).
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto">
                  <button
                    type="button"
                    onClick={handleDownloadPassCredential}
                    className="w-full sm:w-auto px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-[#DDDB00] border border-slate-700 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 whitespace-nowrap transition active:scale-95 cursor-pointer"
                  >
                    <Download size={16} />
                    <span>Descargar Pase QR (PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadProgram}
                    className="w-full sm:w-auto px-5 py-3.5 bg-[#006633] hover:bg-[#004d26] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 whitespace-nowrap transition active:scale-95 cursor-pointer"
                  >
                    <Download size={16} />
                    <span>Descargar Programa Oficial (PDF)</span>
                  </button>
                </div>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              <p className="font-black text-slate-900 dark:text-white uppercase text-[11px] flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-[#006633] dark:text-emerald-400 flex-shrink-0" />
                <span>
                  {isEventSelected
                    ? 'Acreditación Registrada en el Padrón Oficial de EVENTOS'
                    : '¿Cómo recibirás tu acceso y contraseña en NUCLEUS?'}
                </span>
              </p>
              <p>
                {isEventSelected ? (
                  <>
                    Tu registro quedó incorporado al padrón de <strong>EVENTOS</strong> para control de los Administradores. Al aprobarse tu acreditación recibirás en tu correo tu <strong>Pase Oficial QR confirmado</strong> para presentar con tu DNI el día de la jornada.
                  </>
                ) : (
                  <>
                    Los Administradores ya recibieron tu solicitud. Una vez que aprueben tu perfil operativo como <strong>Productor</strong> o <strong>Técnico</strong>, recibirás un correo oficial desde <strong>notificaciones@hempc.com.ar</strong> con el <strong>enlace de activación para ingresar tu contraseña y confirmar tu cuenta</strong>.
                  </>
                )}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Finalizar y Volver al Inicio
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
