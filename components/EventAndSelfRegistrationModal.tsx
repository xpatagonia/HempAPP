import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X, Calendar, UserCheck, Mail, Phone, Building2,
  MapPin, Lock, Eye, EyeOff, CheckCircle2, Download,
  Loader2, ShieldCheck, AlertCircle, Clock, AlertTriangle
} from 'lucide-react';
import { User } from '../types';
import { sendEventRegistrationConfirmationEmail } from '../src/services/emailNotificationService';
import {
  downloadUnDiaDeSiembraProgramPDF,
  EVENT_SCHEDULE_ITEMS,
  EVENT_LOT_SCHEMES,
  EVENT_METADATA
} from '../src/services/eventProgramPdfService';

interface EventAndSelfRegistrationModalProps {
  isOpen: boolean;
  initialMode?: 'event' | 'platform';
  onClose: () => void;
  usersList: User[];
  addUser: (u: User) => Promise<boolean>;
  updateUser: (u: User) => Promise<boolean>;
}

const PROFILE_LABELS: Record<NonNullable<User['requestedProfileType']>, string> = {
  productor: 'Productor Agropecuario / Nuevo Socio',
  visitante: 'Visitante / Asistente Acreditado',
  tecnico_institucion: 'Alumno Diplomatura / Técnico (UNLZ, UATRE, INTA)',
  inversor_cadena: 'Inversor / Empresa de la Cadena Industrial'
};

export default function EventAndSelfRegistrationModal({
  isOpen,
  initialMode = 'event',
  onClose,
  usersList,
  addUser,
  updateUser
}: EventAndSelfRegistrationModalProps) {
  const [mode, setMode] = useState<'event' | 'platform'>(initialMode);
  const [step, setStep] = useState<'form' | 'confirm_email' | 'confirmed'>('form');

  // Datos del formulario
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requestedProfile, setRequestedProfile] = useState<NonNullable<User['requestedProfileType']>>('productor');
  const [organizationName, setOrganizationName] = useState('');
  const [locality, setLocality] = useState('');
  const [estimatedHa, setEstimatedHa] = useState('');
  const [dniNumber, setDniNumber] = useState('');
  const [alsoRegisterEvent, setAlsoRegisterEvent] = useState(true);

  // Estados de envío y verificación
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  const [generatedPin, setGeneratedPin] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [emailResultInfo, setEmailResultInfo] = useState<{ sentFrom: string; via: string } | null>(null);
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);

  const isEventSelected = mode === 'event' || alsoRegisterEvent;

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
    if (!cleanName || !cleanEmail || !password.trim()) {
      setFormError('Por favor completá Nombre, Correo Electrónico y Contraseña.');
      return;
    }

    const existing = usersList.find(u => u.email?.toLowerCase() === cleanEmail);
    if (existing && existing.accountStatus !== 'pending_approval') {
      setFormError('Este correo electrónico ya tiene una cuenta activa en la plataforma. Podés iniciar sesión directamente.');
      return;
    }

    setIsSubmitting(true);
    try {
      const pin = String(Math.floor(100000 + Math.random() * 900000));
      setGeneratedPin(pin);

      const finalTicket = existing?.eventTicketCode || `SIEMBRA-21N-${String(Date.now()).slice(-4)}`;
      const profileText = PROFILE_LABELS[requestedProfile];

      const newUserObj: User = {
        id: existing?.id || `usr-self-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        password: password.trim(),
        phone: phone.trim(),
        dniNumber: dniNumber.trim() || undefined,
        role: requestedProfile === 'productor' ? 'client' : 'viewer',
        jobTitle: `${profileText}${isEventSelected ? ' • Acreditado Un Día de Siembra (21/11)' : ''}`,
        organizationName:
          organizationName.trim() ||
          (requestedProfile === 'productor' ? 'Establecimiento en Incorporación' : 'Participante Acreditado'),
        isNetworkMember: false,
        memberType: requestedProfile === 'productor' ? 'Socio_Productor' : undefined,
        accountStatus: 'pending_approval',
        registrationSource: isEventSelected ? 'event_un_dia_de_siembra' : 'self_service_platform',
        requestedProfileType: requestedProfile,
        eventRegistered: isEventSelected,
        eventName: isEventSelected ? 'Jornada Oficial: "Un Día de Siembra" (Sáb. 21 Nov)' : undefined,
        eventTicketCode: isEventSelected ? finalTicket : undefined,
        eventConfirmedByEmail: false,
        eventProgramDownloaded: false,
        localityOrProvince: locality.trim() || 'VIRCH – Trelew, Chubut',
        estimatedHectares: estimatedHa ? Number(estimatedHa) : undefined,
        invitedAt: new Date().toISOString().split('T')[0],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=b6e3f4`
      };

      if (existing) {
        await updateUser(newUserObj);
      } else {
        await addUser(newUserObj);
      }

      // Despachar correo oficial desde notificaciones@hempc.com.ar vía Resend.com
      const emailDispatch = await sendEventRegistrationConfirmationEmail({
        toEmail: cleanEmail,
        toName: cleanName,
        ticketCode: finalTicket,
        verificationPin: pin,
        profileLabel: profileText,
        organizationName: newUserObj.organizationName,
        locality: newUserObj.localityOrProvince
      });

      setEmailResultInfo({
        sentFrom: emailDispatch.sentFrom || 'notificaciones@hempc.com.ar',
        via: emailDispatch.deliveredVia
      });
      setCreatedUser(newUserObj);
      setStep('confirm_email');
    } catch (err: any) {
      setFormError('No se pudo procesar el registro. Verificá tu conexión e intentá nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmEmailStep = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!createdUser) return;

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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-[32px] shadow-2xl max-w-3xl w-full overflow-hidden relative my-2 sm:my-6 animate-in zoom-in-95 flex flex-col max-h-[95dvh] sm:max-h-[90vh]">
        {/* Encabezado Institucional Exacto (Sin ícono gráfico junto a UN DÍA DE SIEMBRA) */}
        <div className="bg-[#0c2d1e] p-4 sm:p-7 text-white relative border-l-4 border-amber-500 border-b border-emerald-800/60 flex-shrink-0">
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

            <h2 className="text-lg sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-tight">
              {mode === 'event'
                ? 'JORNADA OFICIAL: “UN DÍA DE SIEMBRA”'
                : 'SOLICITUD DE ALTA AUTOGESTIVA EN PLATAFORMA'}
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs text-emerald-100/90 mt-1.5 font-medium">
              <span>{EVENT_METADATA.sede}</span>
              <span className="hidden sm:inline">•</span>
              <span>{EVENT_METADATA.ubicacion}</span>
            </div>
          </div>

          {/* 4 Indicadores Institucionales en grilla adaptable a celular y tablet */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/10 text-[10px]">
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

          {/* Selector de modalidad adaptable a móvil */}
          {step === 'form' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-4 bg-black/30 p-1.5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMode('event');
                  setAlsoRegisterEvent(true);
                }}
                className={`py-2.5 px-3 rounded-lg text-[11px] font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
                  mode === 'event'
                    ? 'bg-[#DDDB00] text-slate-950 shadow-md'
                    : 'text-emerald-100 hover:bg-white/10'
                }`}
              >
                <Calendar size={14} />
                <span>Inscripción “Un Día de Siembra” (21/11)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('platform')}
                className={`py-2.5 px-3 rounded-lg text-[11px] font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
                  mode === 'platform'
                    ? 'bg-white text-slate-950 shadow-md'
                    : 'text-emerald-100 hover:bg-white/10'
                }`}
              >
                <UserCheck size={14} />
                <span>Alta en Plataforma (Productor / Visitante)</span>
              </button>
            </div>
          )}
        </div>

        {/* PASO 1: FORMULARIO DE INSCRIPCIÓN Y ALTA AUTOGESTIVA */}
        {step === 'form' && (
          <form onSubmit={handleSubmitRegistration} className="p-4 sm:p-7 space-y-4 overflow-y-auto flex-1">
            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2.5">
                <AlertCircle size={18} className="flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Aviso Oficial de Reprogramación por Mal Tiempo y Programa Sujeto a Actualización */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 border border-amber-200 dark:border-amber-800/70 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-black text-[11px] uppercase tracking-wider">
                  <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                  <span>AVISO IMPORTANTE: SE REPROGRAMA EN CASO DE MAL TIEMPO (Aviso 24 hs antes)</span>
                </div>
                <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90">
                  El programa de actividades se encuentra <strong>sujeto a actualización</strong>. Al registrarte recibirás confirmación previa por <strong>notificaciones@hempc.com.ar</strong> para descargar el Programa Oficial en PDF.
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

            {/* Vista Previa Exacta del Programa Oficial (Páginas 1, 2 y 3) */}
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

            {/* Selección de Perfil Solicitado */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-2">
                1. Seleccioná tu Perfil de Ingreso (Sujeto a Aprobación de Administración) *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  [
                    {
                      id: 'productor',
                      title: 'Productor Agropecuario',
                      desc: 'Solicitar alta como Socio Productor de la Red'
                    },
                    {
                      id: 'visitante',
                      title: 'Visitante / Invitado General',
                      desc: 'Acreditación a la jornada y seguro en campo'
                    },
                    {
                      id: 'tecnico_institucion',
                      title: 'Alumno Diplomatura / UATRE / UNLZ',
                      desc: 'Práctica presencial Módulo 7, INTA, Autoridades'
                    },
                    {
                      id: 'inversor_cadena',
                      title: 'Inversor / Cadena Industrial',
                      desc: 'Grano, Cañamiza (Hempcrete) y Fibra Textil'
                    }
                  ] as const
                ).map(opt => (
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
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-900 dark:text-white">
                        {opt.title}
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

            {/* Datos Personales y de Cuenta */}
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
                  className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  Correo Electrónico (Recibirás Confirmación) *
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com.ar"
                    className="w-full pl-9 pr-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
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
                    className="w-full pl-9 pr-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  DNI / CUIT (Para Seguro Mercantil Andina) *
                </label>
                <input
                  required
                  type="text"
                  value={dniNumber}
                  onChange={e => setDniNumber(e.target.value)}
                  placeholder="Ej: 28.450.123"
                  className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  Establecimiento / Delegación / Institución
                </label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={organizationName}
                    onChange={e => setOrganizationName(e.target.value)}
                    placeholder={requestedProfile === 'productor' ? 'Nombre de Chacra / Campo' : 'Delegación, Univ. o Empresa'}
                    className="w-full pl-9 pr-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
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
                    className="w-full pl-9 pr-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                  />
                </div>
              </div>

              {requestedProfile === 'productor' && (
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
                    className="w-full px-3.5 py-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  Definí tu Contraseña de Acceso a HempC Nucleus *
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Contraseña para ingresar cuando la Administración apruebe tu alta"
                    className="w-full pl-9 pr-11 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {mode === 'platform' && (
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoRegisterEvent}
                  onChange={e => setAlsoRegisterEvent(e.target.checked)}
                  className="w-4 h-4 accent-[#006633] rounded flex-shrink-0"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  También quiero acreditarme a la <strong>Jornada Oficial: “Un Día de Siembra” (Sábado 21 de Noviembre)</strong> y descargar el Programa Oficial.
                </span>
              </label>
            )}

            <div className="bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-[#006633] dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Aprobación Administrativa y Seguro en Campo:</strong> Tu inscripción activa la cobertura del seguro operativo en campo (Mercantil Andina) y deja tu usuario en espera de validación por los Administradores como <strong>Productor</strong> o <strong>Visitante</strong>.
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-black uppercase text-slate-500 hover:text-slate-700 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#006633] hover:bg-[#004d26] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Enviando Confirmación...</span>
                  </>
                ) : (
                  <>
                    <Mail size={16} />
                    <span>
                      {isEventSelected
                        ? 'Registrarme y Recibir Mail de Confirmación'
                        : 'Solicitar Alta en la Plataforma'}
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
                  onChange={e => setEnteredPin(e.target.value)}
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

        {/* PASO 3: EMAIL CONFIRMADO -> DESCARGA DEL PROGRAMA OFICIAL PDF Y CREDENCIAL QR */}
        {step === 'confirmed' && createdUser && (
          <div className="p-4 sm:p-8 space-y-5 overflow-y-auto flex-1 animate-in zoom-in-95">
            <div className="bg-[#0c2d1e] text-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-[#DDDB00] shadow-xl flex flex-col sm:flex-row items-center gap-5">
              <div className="bg-white p-3 rounded-2xl shadow-md flex-shrink-0">
                <QRCodeSVG
                  value={`https://red.hempc.com.ar/#/login?ticket=${encodeURIComponent(
                    createdUser.eventTicketCode || ticketCode
                  )}&email=${encodeURIComponent(createdUser.email)}`}
                  size={108}
                  level="M"
                />
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[#DDDB00] text-[10px] font-black uppercase tracking-widest">
                  <CheckCircle2 size={13} />
                  <span>Email Confirmado • Acreditación Registrada</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight truncate">
                  {createdUser.name}
                </h3>
                <p className="text-xs text-emerald-200 font-medium">
                  {PROFILE_LABELS[createdUser.requestedProfileType || 'visitante']} • {createdUser.organizationName}
                </p>
                <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="px-3 py-1 rounded-lg bg-black/40 font-mono text-xs font-black text-[#DDDB00]">
                    PASE: {createdUser.eventTicketCode || ticketCode}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase flex items-center gap-1">
                    <Clock size={12} /> Alta en Plataforma: Pendiente Aprobación Admin
                  </span>
                </div>
              </div>
            </div>

            {/* Botón Principal de Descarga del Programa Oficial */}
            {createdUser.eventRegistered && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-slate-900 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                    Documento Oficial PatagonianC & UATRE (Sujeto a actualización)
                  </span>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase">
                    JORNADA OFICIAL: “UN DÍA DE SIEMBRA” (PDF)
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Incluye el Cronograma General de Actividades (08:30 a 15:30 hs), el Esquema de Siembra en 3 Lotes por Propósito y el Protocolo BPA / NUCLEUS.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadProgram}
                  className="w-full sm:w-auto px-6 py-4 bg-[#006633] hover:bg-[#004d26] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2.5 whitespace-nowrap transition active:scale-95 cursor-pointer"
                >
                  <Download size={18} />
                  <span>Descargar Programa Oficial (PDF)</span>
                </button>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              <p className="font-black text-slate-900 dark:text-white uppercase text-[11px] flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-[#006633] dark:text-emerald-400 flex-shrink-0" />
                <span>¿Cómo continúa tu acceso a la plataforma HempC Nucleus?</span>
              </p>
              <p>
                Los Administradores de la Red ya recibieron tu solicitud. En cuanto aprueben tu perfil como <strong>Productor Asociado</strong> o <strong>Visitante</strong>, recibirás un correo de confirmación desde <strong>notificaciones@hempc.com.ar</strong>.
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
