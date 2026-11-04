import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X, Calendar, Sprout, UserCheck, Mail, Phone, Building2,
  MapPin, Lock, Eye, EyeOff, CheckCircle2, Download,
  Loader2, ShieldCheck, AlertCircle, Sparkles, Clock, ArrowRight, FileText
} from 'lucide-react';
import { User } from '../types';
import { sendEventRegistrationConfirmationEmail } from '../src/services/emailNotificationService';
import { downloadUnDiaDeSiembraProgramPDF, EVENT_SCHEDULE_ITEMS } from '../src/services/eventProgramPdfService';

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
  tecnico_institucion: 'Técnico / Institución (INTA, CONICET, Univ.)',
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
        // Se asigna rol inicial 'viewer' hasta que el Administrador lo apruebe como Productor o Visitante
        role: requestedProfile === 'productor' ? 'client' : 'viewer',
        jobTitle: `${profileText}${isEventSelected ? ' • Acreditado Un Día de Siembra (21/11)' : ''}`,
        organizationName: organizationName.trim() || (requestedProfile === 'productor' ? 'Establecimiento en Incorporación' : 'Participante Acreditado'),
        isNetworkMember: false,
        memberType: requestedProfile === 'productor' ? 'Socio_Productor' : undefined,
        accountStatus: 'pending_approval',
        registrationSource: isEventSelected ? 'event_un_dia_de_siembra' : 'self_service_platform',
        requestedProfileType: requestedProfile,
        eventRegistered: isEventSelected,
        eventName: isEventSelected ? 'Un Día de Siembra (Sáb. 21 Nov)' : undefined,
        eventTicketCode: isEventSelected ? finalTicket : undefined,
        eventConfirmedByEmail: false,
        eventProgramDownloaded: false,
        localityOrProvince: locality.trim() || 'Patagonia, Argentina',
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-2xl max-w-2xl w-full overflow-hidden relative my-6 animate-in zoom-in-95">
        {/* Encabezado Verde & Lima Institucional */}
        <div className="bg-gradient-to-r from-[#022c22] via-[#064e3b] to-[#006633] p-6 sm:p-8 text-white relative border-b-4 border-[#DDDB00]">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-2 text-[#DDDB00] text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            <Calendar size={14} />
            <span>Sábado 21 de Noviembre • Jornada de Apertura de Campaña</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight italic">
            {mode === 'event' ? '🌱 "Un Día de Siembra" • Inscripción & Alta' : 'Solicitud de Alta Autogestiva'}
          </h2>
          <p className="text-xs text-emerald-100/90 mt-1 max-w-xl font-medium">
            Registrate para participar del inicio de siembra, recibir el Programa Oficial por correo (<strong className="text-[#DDDB00]">notificaciones@hempc.com.ar</strong>) y gestionar tu acceso a la plataforma sujeto a aprobación de Administración.
          </p>

          {/* Selector de modalidad */}
          {step === 'form' && (
            <div className="grid grid-cols-2 gap-2 mt-5 bg-black/25 p-1.5 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMode('event');
                  setAlsoRegisterEvent(true);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
                  mode === 'event'
                    ? 'bg-[#DDDB00] text-slate-950 shadow-md'
                    : 'text-emerald-100 hover:bg-white/10'
                }`}
              >
                <Sprout size={15} />
                <span>Inscripción "Un Día de Siembra" (21/11)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('platform')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
                  mode === 'platform'
                    ? 'bg-white text-slate-950 shadow-md'
                    : 'text-emerald-100 hover:bg-white/10'
                }`}
              >
                <UserCheck size={15} />
                <span>Alta en Plataforma (Productor / Visitante)</span>
              </button>
            </div>
          )}
        </div>

        {/* PASO 1: FORMULARIO DE INSCRIPCIÓN Y ALTA AUTOGESTIVA */}
        {step === 'form' && (
          <form onSubmit={handleSubmitRegistration} className="p-6 sm:p-8 space-y-5 max-h-[75vh] overflow-y-auto">
            {formError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2.5">
                <AlertCircle size={18} className="flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Banner del Programa Oficial */}
            {isEventSelected && (
              <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-xs uppercase tracking-wider">
                    <Sparkles size={15} className="text-emerald-600" />
                    <span>Incluye Descarga del Programa Oficial (Sáb. 21 Noviembre)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Al completar tus datos te enviaremos un mail de confirmación desde <strong>notificaciones@hempc.com.ar</strong> para habilitar la descarga inmediata del PDF con el cronograma completo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSchedulePreview(!showSchedulePreview)}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider whitespace-nowrap hover:bg-emerald-100 transition cursor-pointer"
                >
                  {showSchedulePreview ? 'Ocultar Temario' : 'Ver Temario 21/11'}
                </button>
              </div>
            )}

            {showSchedulePreview && (
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 text-xs animate-in fade-in">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">
                  Adelanto del Cronograma — Sábado 21 de Noviembre:
                </p>
                {EVENT_SCHEDULE_ITEMS.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 py-1.5 border-b border-slate-200/60 dark:border-slate-800/60 last:border-0">
                    <span className="font-mono font-black text-[11px] text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {item.time.split('–')[0]}
                    </span>
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.block}</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selección de Perfil Solicitado */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-2">
                1. Seleccioná tu Perfil de Ingreso (Sujeto a Aprobación de Administración) *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(
                  [
                    {
                      id: 'productor',
                      title: 'Productor Agropecuario',
                      desc: 'Solicitar alta como Socio Productor de la Red'
                    },
                    {
                      id: 'visitante',
                      title: 'Visitante / Invitado Evento',
                      desc: 'Acceso de acreditación al evento y vista pública'
                    },
                    {
                      id: 'tecnico_institucion',
                      title: 'Técnico / Institución',
                      desc: 'INTA, CONICET, SENASA, INASE, Universidades'
                    },
                    {
                      id: 'inversor_cadena',
                      title: 'Inversor / Cadena Industrial',
                      desc: 'Bioconstrucción, Fibra, Semillas o Bioeconomía'
                    }
                  ] as const
                ).map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRequestedProfile(opt.id)}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
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
                        <CheckCircle2 size={16} className="text-[#006633] dark:text-emerald-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Datos Personales y de Cuenta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">
                  Nombre y Apellido Completo *
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej: Martín Gómez"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">
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
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">
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
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">
                  DNI / CUIT (Para Acreditación)
                </label>
                <input
                  type="text"
                  value={dniNumber}
                  onChange={e => setDniNumber(e.target.value)}
                  placeholder="Ej: 28.450.123"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">
                  Establecimiento / Empresa / Institución
                </label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={organizationName}
                    onChange={e => setOrganizationName(e.target.value)}
                    placeholder={requestedProfile === 'productor' ? 'Nombre de Chacra / Campo' : 'Empresa o Institución'}
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">
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
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                  />
                </div>
              </div>

              {requestedProfile === 'productor' && (
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 block mb-1.5">
                    Superficie Estimada Disponible para Siembra (Hectáreas)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={estimatedHa}
                    onChange={e => setEstimatedHa(e.target.value)}
                    placeholder="Ej: 5 ha"
                    className="w-full px-4 py-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">
                  Definí tu Contraseña de Acceso a HempC Nucleus *
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres para ingresar cuando seas aprobado"
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
              <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoRegisterEvent}
                  onChange={e => setAlsoRegisterEvent(e.target.checked)}
                  className="w-4 h-4 accent-[#006633] rounded"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  También quiero acreditarme al evento <strong>"Un Día de Siembra" (Sábado 21 de Noviembre)</strong> y descargar el Programa Oficial.
                </span>
              </label>
            )}

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-3.5 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <ShieldCheck size={17} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Aprobación por Administración:</strong> Tu alta queda pre-registrada de forma autogestiva. Los Administradores de HempC tienen la autoridad para aprobar tu ingreso definitivo como <strong>Productor</strong> o como <strong>Visitante</strong>.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3.5 bg-[#006633] hover:bg-[#004d26] text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Enviando Confirmación por Email...</span>
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
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in">
            <div className="bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500/40 rounded-3xl p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg">
                <Mail size={28} />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-black uppercase tracking-widest">
                Paso Previo Requerido • Correo Enviado
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">
                ¡Revisá tu casilla de correo!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                Hemos despachado tu confirmación oficial desde{' '}
                <strong className="text-emerald-700 dark:text-emerald-300">
                  {emailResultInfo?.sentFrom || 'notificaciones@hempc.com.ar'}
                </strong>{' '}
                (vía Resend.com) hacia <strong className="underline">{createdUser.email}</strong> con tu pase{' '}
                <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                  {createdUser.eventTicketCode}
                </span>.
              </p>
            </div>

            <form onSubmit={handleConfirmEmailStep} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Ingresá el Código del Mail o Confirmá Recepción para Habilitar la Descarga
                </label>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  PIN enviado: {generatedPin}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={enteredPin}
                  onChange={e => setEnteredPin(e.target.value)}
                  placeholder={`Código de 6 dígitos (ej: ${generatedPin})`}
                  className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-black text-center tracking-widest text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                />
                <button
                  type="submit"
                  className="px-6 py-3.5 bg-[#006633] hover:bg-[#004d26] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Confirmar Recepción de Email y Habilitar Descarga</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Una vez confirmado el correo electrónico, se desbloquea el botón para descargar el <strong>Programa Oficial "Un Día de Siembra" (PDF)</strong> y tu Credencial QR.
              </p>
            </form>
          </div>
        )}

        {/* PASO 3: EMAIL CONFIRMADO -> DESCARGA DEL PROGRAMA OFICIAL PDF Y CREDENCIAL QR */}
        {step === 'confirmed' && createdUser && (
          <div className="p-6 sm:p-8 space-y-6 animate-in zoom-in-95 max-h-[78vh] overflow-y-auto">
            <div className="bg-emerald-950 text-white p-6 rounded-3xl border-2 border-[#DDDB00] shadow-xl flex flex-col sm:flex-row items-center gap-6">
              <div className="bg-white p-3 rounded-2xl shadow-md flex-shrink-0">
                <QRCodeSVG
                  value={`https://red.hempc.com.ar/#/login?ticket=${encodeURIComponent(
                    createdUser.eventTicketCode || ticketCode
                  )}&email=${encodeURIComponent(createdUser.email)}`}
                  size={112}
                  level="M"
                />
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[#DDDB00] text-[10px] font-black uppercase tracking-widest">
                  <CheckCircle2 size={13} />
                  <span>Email Confirmado • Pase Oficial Activo</span>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">
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
                    <Clock size={12} /> Alta en Plataforma: Pendiente de Aprobación Admin
                  </span>
                </div>
              </div>
            </div>

            {/* Botón Principal de Descarga del Programa Oficial */}
            {createdUser.eventRegistered && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-slate-900 p-6 rounded-3xl border-2 border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                    Documento Habilitado tras Confirmación de Correo
                  </span>
                  <h4 className="text-base font-black text-slate-900 dark:text-white uppercase">
                    Programa Oficial: "Un Día de Siembra" (Sábado 21 Nov)
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Incluye el cronograma horario completo de bloques técnicos, demostración de siembra en campo y tu credencial impresa.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadProgram}
                  className="px-6 py-4 bg-[#006633] hover:bg-[#004d26] text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl flex items-center gap-2.5 whitespace-nowrap transition active:scale-95 cursor-pointer"
                >
                  <Download size={18} />
                  <span>Descargar Programa Oficial (PDF)</span>
                </button>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              <p className="font-black text-slate-900 dark:text-white uppercase text-[11px] flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-[#006633] dark:text-emerald-400" />
                ¿Cómo continúa tu acceso a la plataforma HempC Nucleus?
              </p>
              <p>
                Los Administradores de la Red ya recibieron tu solicitud en la bandeja de admisión. En cuanto aprueben tu perfil como <strong>Productor Asociado</strong> o <strong>Visitante</strong>, recibirás un correo de confirmación desde <strong>notificaciones@hempc.com.ar</strong> y podrás iniciar sesión con tu clave.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider cursor-pointer"
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
