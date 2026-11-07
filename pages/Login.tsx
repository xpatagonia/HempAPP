import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  ArrowRight, AlertCircle, Loader2, ShieldCheck, 
  Leaf, Smartphone, Wifi, WifiOff, Eye, EyeOff, Lock, Mail,
  Key, CheckCircle2, AlertTriangle, X, Calendar, Sprout, UserCheck, Download
} from "lucide-react";
import { checkConnection, supabase } from "../supabaseClient";
import { sendPasswordResetEmail } from "../src/services/emailNotificationService";
import { PWAInstallButton, AndroidLogo, WindowsLogo } from "../components/PWAInstallButton";
import EventAndSelfRegistrationModal from "../components/EventAndSelfRegistrationModal";
import { downloadUnDiaDeSiembraProgramPDF } from "../src/services/eventProgramPdfService";
import {
  unpackUserMetaFromJobTitle,
  activateApprovedAccountPassword,
  evaluateUserLoginGate
} from "../src/services/producerOnboardingWorkflow";

export default function Login() {
  const { currentUser, login, appName, appLogo, usersList, updateUser, addUser } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "disconnected">("checking");

  // Modal de Inscripción al Evento "Un Día de Siembra" (Sáb. 21 Nov) & Alta Autogestiva
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registrationModalMode, setRegistrationModalMode] = useState<"event" | "platform">("event");

  // Estado del modal de recuperación de contraseña
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<{
    type: "success" | "not_found" | "error";
    message: string;
    tempPassword?: string;
  } | null>(null);

  // Modal de Activación de Cuenta y Definición de Contraseña tras Aprobación Admin
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [activateEmail, setActivateEmail] = useState("");
  const [activateToken, setActivateToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activateStatus, setActivateStatus] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  const currentUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    const rootParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const eventoParam = searchParams.get("evento") || rootParams.get("evento");
    const registroParam = searchParams.get("registro") || rootParams.get("registro");
    const activarParam = searchParams.get("activar") || rootParams.get("activar");
    const tokenParam = searchParams.get("token") || rootParams.get("token");

    if (activarParam) {
      setActivateEmail(activarParam.trim().toLowerCase());
      if (tokenParam) setActivateToken(tokenParam.trim());
      setActivateStatus(null);
      setShowActivateModal(true);
    } else if (eventoParam === "un-dia-de-siembra" || eventoParam === "21nov" || eventoParam === "siembra") {
      setRegistrationModalMode("event");
      setShowRegistrationModal(true);
    } else if (registroParam === "alta") {
      setRegistrationModalMode("platform");
      setShowRegistrationModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const rootParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const hasDirectModalParam =
      searchParams.get("evento") ||
      rootParams.get("evento") ||
      searchParams.get("registro") ||
      rootParams.get("registro") ||
      searchParams.get("activar") ||
      rootParams.get("activar");

    if (currentUser && !hasDirectModalParam) {
      navigate("/", { replace: true });
    }
  }, [currentUser, navigate, searchParams]);

  useEffect(() => {
    const verify = async () => {
      const isConnected = await checkConnection();
      setConnectionStatus(isConnected ? "connected" : "disconnected");
    };
    verify();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Por favor ingrese su correo y contraseña.");
      return;
    }

    const cleanMail = email.trim().toLowerCase();
    const matchedUser = usersList.find(u => u.email?.toLowerCase() === cleanMail);
    if (matchedUser) {
      const gate = evaluateUserLoginGate(matchedUser);
      if (gate.requiresPasswordActivationModal) {
        setActivateEmail(cleanMail);
        setActivateToken(matchedUser.activationToken || "");
        setActivateStatus(null);
        setShowActivateModal(true);
        return;
      }
      if (!gate.canProceedToPasswordCheck && gate.userFacingMessage) {
        setError(gate.userFacingMessage);
        return;
      }
    }

    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        navigate("/");
      } else {
        setError("Credenciales incorrectas. Verifique su correo y contraseña.");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Ocurrió un error al intentar iniciar sesión.");
      setIsLoading(false);
    }
  };

  const handleActivateAccountPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivateStatus(null);

    const cleanMail = activateEmail.trim().toLowerCase();
    if (!cleanMail) {
      setActivateStatus({ type: "error", message: "Ingresá tu correo electrónico aprobado." });
      return;
    }

    setIsActivating(true);
    try {
      const localMatch = usersList.find(u => u.email?.toLowerCase() === cleanMail);
      let remoteMatch: any = null;

      try {
        const { data } = await supabase.from("users").select("*").ilike("email", cleanMail).maybeSingle();
        if (data) {
          const { cleanJobTitle, parsedMeta } = unpackUserMetaFromJobTitle(data.job_title);
          remoteMatch = {
            ...(localMatch || {}),
            ...parsedMeta,
            id: data.id,
            name: data.name || localMatch?.name || "Usuario Acreditado",
            email: data.email || cleanMail,
            role: data.role || parsedMeta.role || localMatch?.role || "viewer",
            password: data.password,
            jobTitle: cleanJobTitle || localMatch?.jobTitle,
            clientId: parsedMeta.clientId ?? data.client_id ?? localMatch?.clientId,
            organizationName: data.organization_name || parsedMeta.organizationName || localMatch?.organizationName,
            isNetworkMember: Boolean(data.is_network_member ?? parsedMeta.isNetworkMember ?? localMatch?.isNetworkMember),
            accountStatus: parsedMeta.accountStatus || localMatch?.accountStatus || "active",
            activationToken: parsedMeta.activationToken || localMatch?.activationToken,
            passwordPendingSetup:
              parsedMeta.passwordPendingSetup !== undefined
                ? parsedMeta.passwordPendingSetup
                : localMatch?.passwordPendingSetup
          };
        }
      } catch {}

      const targetUser = remoteMatch || localMatch;
      const activationCheck = activateApprovedAccountPassword({
        targetUser,
        providedToken: activateToken,
        newPassword,
        confirmPassword: confirmNewPassword
      });

      if (!activationCheck.success || !activationCheck.activatedUser) {
        setActivateStatus({
          type: "error",
          message: activationCheck.errorMessage || "No se pudo validar la activación."
        });
        setIsActivating(false);
        return;
      }

      const updatedUser = activationCheck.activatedUser;
      await updateUser(updatedUser);

      setActivateStatus({
        type: "success",
        message: "¡Contraseña configurada y confirmada con éxito! Ya podés ingresar al sistema."
      });

      setEmail(cleanMail);
      setPassword(newPassword.trim());

      setTimeout(async () => {
        const logged = await login(cleanMail, newPassword.trim());
        if (logged) {
          setShowActivateModal(false);
          navigate("/");
        }
      }, 900);
    } catch (err: any) {
      setActivateStatus({
        type: "error",
        message: "No se pudo guardar la contraseña. Intentá nuevamente."
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setIsRecovering(true);
    setForgotStatus(null);
    const targetEmail = forgotEmail.trim().toLowerCase();

    // 1. Buscar en lista local de usuarios y en Supabase (extrayendo metadatos HEMPC_USER_META)
    const localMatch = usersList.find(u => u.email.toLowerCase() === targetEmail);
    let userFound = localMatch;

    try {
      const { data } = await supabase.from("users").select("*").ilike("email", targetEmail).maybeSingle();
      if (data) {
        let parsedMeta: Record<string, any> = {};
        let rawJobTitle = data.job_title || "";
        const match = rawJobTitle.match(/<!--HEMPC_USER_META:(.*?)-->/);
        if (match && match[1]) {
          try {
            parsedMeta = JSON.parse(match[1]);
          } catch {}
          rawJobTitle = rawJobTitle.replace(/\s*<!--HEMPC_USER_META:.*?-->/, "").trim();
        }
        userFound = {
          ...(localMatch || {}),
          id: data.id,
          name: data.name || localMatch?.name || "Usuario de Cooperativa",
          email: data.email || targetEmail,
          role: data.role || localMatch?.role || "viewer",
          password: data.password ?? localMatch?.password,
          clientId: data.client_id ?? localMatch?.clientId,
          phone: data.phone || localMatch?.phone,
          jobTitle: rawJobTitle || localMatch?.jobTitle,
          isNetworkMember: Boolean(data.is_network_member ?? localMatch?.isNetworkMember),
          memberType: data.member_type || localMatch?.memberType,
          organizationName: data.organization_name || localMatch?.organizationName,
          accountStatus: parsedMeta.accountStatus || localMatch?.accountStatus || "active",
          requestedProfileType: parsedMeta.requestedProfileType || localMatch?.requestedProfileType,
          eventRegistered: parsedMeta.eventRegistered ?? localMatch?.eventRegistered,
          eventTicketCode: parsedMeta.eventTicketCode || localMatch?.eventTicketCode,
          passwordPendingSetup: parsedMeta.passwordPendingSetup ?? localMatch?.passwordPendingSetup,
          activationToken: parsedMeta.activationToken || localMatch?.activationToken,
          dniNumber: parsedMeta.dniNumber || localMatch?.dniNumber
        };
      }
    } catch (e) {
      // Modo offline: se mantiene localMatch
    }

    // Si es la cuenta principal admin@hempc.com.ar o gaston.barea.moreno@gmail.com y no estuviera en memoria local previa
    if (!userFound && (targetEmail === "admin@hempc.com.ar" || targetEmail === "gaston.barea.moreno@gmail.com" || targetEmail === "xpatagonia.com@gmail.com")) {
      userFound = {
        id: targetEmail === "admin@hempc.com.ar" ? "user-admin-hempc" : targetEmail === "xpatagonia.com@gmail.com" ? "user-admin-xpatagonia" : "user-admin-nucleus",
        name: targetEmail === "admin@hempc.com.ar" ? "Administración Central HempC" : "Ing. Gastón Barea (Nucleus)",
        email: targetEmail,
        role: "super_admin",
        password: "admin",
        isNetworkMember: true,
        memberType: "Cooperativa_Central",
        organizationName: "Red Cooperativa Nucleus",
        accountStatus: "active"
      };
      await addUser(userFound);
    }

    if (!userFound) {
      setForgotStatus({
        type: "not_found",
        message: `El correo "${targetEmail}" no se encuentra registrado en el padrón de la cooperativa. Si aún no tenés cuenta, utilizá el botón "Solicitar Alta de Usuario" en la parte superior.`
      });
      setIsRecovering(false);
      return;
    }

    // 2. Validar estado de aprobación antes de emitir clave provisoria
    if (userFound.accountStatus === "pending_approval") {
      setForgotStatus({
        type: "error",
        message: `Tu solicitud para "${targetEmail}" aún se encuentra PENDIENTE DE APROBACIÓN por Administración. Una vez aprobada tu alta, recibirás automáticamente desde notificaciones@hempc.com.ar el enlace para definir tu contraseña.`
      });
      setIsRecovering(false);
      return;
    }

    if (userFound.accountStatus === "rejected") {
      setForgotStatus({
        type: "error",
        message: `La solicitud asociada a "${targetEmail}" fue rechazada o deshabilitada por Administración.`
      });
      setIsRecovering(false);
      return;
    }

    // 3. Generar contraseña provisoria de alta seguridad
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let rand = "";
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const tempPassword = `HempC-${rand}!`;

    try {
      await updateUser({
        ...userFound,
        accountStatus: "active",
        password: tempPassword,
        passwordPendingSetup: false
      });

      const res = await sendPasswordResetEmail({
        toEmail: targetEmail,
        toName: userFound.name || "Usuario de la Red",
        tempPassword: tempPassword,
        actionUrl: window.location.origin
      });

      const isReal = res.deliveredVia === "vercel_resend" || res.deliveredVia === "resend_https" || res.deliveredVia === "smtp";
      setForgotStatus({
        type: "success",
        message: `Hemos despachado una contraseña provisoria de acceso a tu casilla "${targetEmail}" vía ${isReal ? "Vercel + Resend.com (notificaciones@hempc.com.ar)" : "Auditoría Local"}. Revisa tu bandeja de entrada o spam para ingresar.`,
        tempPassword: !isReal ? tempPassword : undefined
      });
    } catch (err: any) {
      setForgotStatus({
        type: "error",
        message: `Error al despachar el correo de recuperación: ${err.message || "Error de conexión"}`
      });
    } finally {
      setIsRecovering(false);
    }
  };

  // @ts-ignore
  const activeVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "V7.35.0-STABLE";

  return (
    <div className="min-h-dvh lg:h-dvh flex flex-col lg:flex-row items-stretch overflow-x-hidden lg:overflow-hidden font-sans bg-white dark:bg-slate-950">
      
      {/* Lado Izquierdo: Branding Corporativo Equilibrado Sin Scroll */}
      <div className="hidden lg:flex lg:w-7/12 xl:w-3/5 bg-[#DDDB00] relative px-12 py-8 xl:px-16 xl:py-10 flex-col justify-between overflow-hidden border-r border-yellow-500/20 shadow-inner">
        <div className="relative z-10 flex flex-col my-auto space-y-5 xl:space-y-6">
          
          {/* LOGO OFICIAL DE MARCA HEMPC */}
          <div>
            <div className="inline-flex items-center bg-[#DDDB00] py-1 pr-3 rounded-2xl">
              <img 
                src={appLogo || "/hempc-logo-cropped.png?v=7.18.2"} 
                alt="HempC" 
                className="h-20 xl:h-24 w-auto object-contain drop-shadow-sm" 
              />
            </div>
          </div>

          <div className="space-y-4 xl:space-y-5">
            <p className="text-[#006633] text-xl xl:text-2xl font-black tracking-tight leading-snug max-w-md border-l-4 border-[#006633] pl-5 italic">
              Red Cooperativa de Agricultores de Cáñamo Industrial Argentina
            </p>
            
            <div className="h-1 w-32 bg-[#006633] opacity-30 rounded-full"></div>

            <div className="space-y-1.5">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h2 className="text-3xl xl:text-4xl font-black text-[#006633] tracking-tighter uppercase italic leading-none">
                  NUCLEUS
                </h2>
                <span className="text-xs xl:text-sm font-mono font-black tracking-widest text-[#006633]/80 uppercase">
                  {activeVersion}
                </span>
              </div>
              <p className="text-sm xl:text-base font-bold text-[#006633]/85 leading-snug max-w-md">
                Plataforma Inteligente de trazabilidad y gestión agro industrial
              </p>
            </div>
          </div>
        </div>

        {/* ACCESO MÓVIL POR CÓDIGO QR & APPS */}
        <div className="relative z-20 pt-2">
          <div className="bg-white/25 backdrop-blur-md border border-white/50 p-3 xl:p-3.5 rounded-2xl flex items-center gap-4 shadow-lg max-w-md">
            <div className="bg-white p-1.5 rounded-xl shadow-inner shrink-0">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentUrl)}`} 
                alt="Mobile Login QR" 
                className="w-14 h-14 xl:w-16 xl:h-16 mix-blend-multiply opacity-90"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[#006633]">
                <AndroidLogo size={15} className="text-[#006633]" />
                <WindowsLogo size={13} className="text-[#006633]" />
                <p className="font-black text-[11px] uppercase tracking-widest">App Android & Windows</p>
              </div>
              <p className="text-[#006633] text-[10px] xl:text-[11px] font-bold leading-tight">
                Escanea el código QR con tu celular Android o descarga la aplicación de escritorio para Windows.
              </p>
            </div>
          </div>
        </div>
        
        <div className="absolute -right-20 -bottom-20 w-[500px] h-[500px] bg-white/20 rounded-full blur-[120px] opacity-60 pointer-events-none"></div>
      </div>

      {/* Lado Derecho: Formulario de Autenticación Compacto y Equilibrado */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-4 sm:px-8 sm:py-6 lg:px-10 lg:py-4 bg-white dark:bg-slate-950 transition-colors duration-500 relative">
        <div className="w-full max-w-md space-y-2.5 xl:space-y-3">
          
          {/* Header en Pantalla Móvil / Tablet */}
          <div className="lg:hidden text-center mb-1">
            <div className="inline-flex items-center justify-center bg-[#DDDB00] px-5 py-2 rounded-2xl mb-1.5 shadow-lg border border-[#b8b600]/60">
              <img
                src={appLogo || "/hempc-logo-cropped.png?v=7.18.2"}
                alt="HempC"
                className="h-10 w-auto object-contain"
              />
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-[#006633] dark:text-emerald-400 font-black text-sm uppercase tracking-tight italic">
                NUCLEUS
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                {activeVersion}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] leading-tight">
              Plataforma Inteligente de trazabilidad y gestión agro industrial
            </p>
          </div>

          {/* Encabezado Superior: Iniciar Sesión */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">
              Iniciar Sesión
            </h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.16em] flex items-center gap-1.5 mt-1">
              <ShieldCheck size={13} className="text-[#006633]"/> Nodo Nucleus Autenticado
            </p>
          </div>

          {/* Formulario de Acceso y Solicitud de Alta en Plataforma */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center border border-red-200 dark:border-red-900/60 animate-in slide-in-from-top-2 shadow-sm">
                <AlertCircle size={15} className="mr-2 flex-shrink-0"/>
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-1 group">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-[#006633] dark:group-focus-within:text-emerald-400 transition-colors flex items-center gap-1.5">
                <Mail size={12} /> Correo Electrónico o Usuario
              </label>
              <input 
                required 
                type="text" 
                autoComplete="username email"
                autoCapitalize="none"
                spellCheck="false"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[#006633]/15 focus:border-[#006633] dark:focus:border-emerald-500 outline-none transition-all text-slate-900 dark:text-white font-bold placeholder-slate-400 text-xs sm:text-sm shadow-sm" 
                placeholder="usuario@hempc.com.ar" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>

            <div className="space-y-1 group">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-[#006633] dark:group-focus-within:text-emerald-400 transition-colors flex items-center gap-1.5">
                <Lock size={12} /> Contraseña
              </label>
              <div className="relative">
                <input 
                  required 
                  type={showPassword ? "text" : "password"} 
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-[#006633]/15 focus:border-[#006633] dark:focus:border-emerald-500 outline-none transition-all text-slate-900 dark:text-white font-bold placeholder-slate-400 text-xs sm:text-sm shadow-sm" 
                  placeholder="••••••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Enlaces de Activación tras Aprobación y Recuperación de Contraseña */}
            <div className="flex flex-wrap justify-between items-center gap-2 px-1">
              <button
                type="button"
                onClick={() => {
                  setActivateEmail(email);
                  setActivateStatus(null);
                  setShowActivateModal(true);
                }}
                className="text-[10px] font-bold text-slate-500 hover:text-[#006633] dark:text-slate-400 dark:hover:text-emerald-400 flex items-center gap-1 hover:underline transition-colors cursor-pointer"
              >
                <Key size={11} className="text-[#006633] dark:text-emerald-400" />
                <span>¿Tu alta fue aprobada? Activá tu clave</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotEmail(email);
                  setForgotStatus(null);
                }}
                className="text-[11px] font-bold text-[#006633] dark:text-emerald-400 hover:underline transition-colors cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <div className="space-y-2 pt-0.5">
              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-[#006633] hover:bg-[#004d26] text-white py-2.5 xl:py-3 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] active:scale-[0.98] transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 flex items-center justify-center group cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="animate-spin" size={16} />
                    <span>Verificando Credenciales...</span>
                  </div>
                ) : (
                  <>
                    <span>Ingresar al Sistema</span> 
                    <ArrowRight size={16} className="ml-2.5 group-hover:translate-x-1.5 transition-transform" />
                  </>
                )}
              </button>

              {/* BOTÓN DESTACADO DE ALTA DE USUARIO EN PLATAFORMA (UBICACIÓN PRINCIPAL BAJO LOGIN) */}
              <button
                type="button"
                onClick={() => {
                  setRegistrationModalMode("platform");
                  setShowRegistrationModal(true);
                }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-[#006633] dark:bg-slate-900 dark:hover:bg-[#006633] text-white border border-slate-800 border-l-4 border-l-[#006633] hover:border-l-[#DDDB00] transition-all shadow-md flex items-center justify-between gap-2 group active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-7 h-7 rounded-lg bg-[#006633] group-hover:bg-white/15 text-[#DDDB00] flex items-center justify-center shrink-0 transition-colors">
                    <UserCheck size={15} />
                  </div>
                  <div>
                    <span className="block font-black text-[11px] uppercase tracking-wider text-white leading-tight">
                      Solicitar Alta de Usuario
                    </span>
                    <span className="block text-[9px] font-semibold text-slate-300 group-hover:text-emerald-100 leading-tight">
                      Visitantes, Productores y Técnicos • Aprobación Admin
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#DDDB00] shrink-0">
                  <span>Registrarse</span>
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>
          </form>

          {/* TARJETA EXCLUSIVA DEL EVENTO: JORNADA OFICIAL “UN DÍA DE SIEMBRA” (SOLO VISITANTE AL EVENTO) */}
          <div className="bg-[#0c2d1e] rounded-2xl p-3 xl:p-3.5 text-white border-l-4 border-amber-500 border border-emerald-800/80 shadow-lg space-y-2 relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-1.5 text-[9px] font-black uppercase tracking-wider">
              <span className="inline-flex items-center gap-1 text-[#DDDB00]">
                <Calendar size={11} />
                Sáb. 21 Nov • 08:30 a 15:30 hs
              </span>
              <span className="text-amber-300">
                Exclusivo Visitante al Evento
              </span>
            </div>

            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-[#DDDB00]/90">
                Diplomatura Universitaria en Cáñamo Industrial • UNLZ – UATRE
              </p>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white leading-snug">
                JORNADA OFICIAL: “UN DÍA DE SIEMBRA”
              </h3>
              <p className="text-[10px] text-emerald-100/90 leading-snug mt-0.5">
                Chacra Experimental PatagonianC LTDA (VIRCH – Trelew). Acreditación de <strong>Visitante al Evento</strong> vía{' '}
                <strong className="text-[#DDDB00]">notificaciones@hempc.com.ar</strong> y descarga de{' '}
                <strong>Programa Oficial PDF</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setRegistrationModalMode("event");
                setShowRegistrationModal(true);
              }}
              className="w-full py-2.5 px-3 bg-[#DDDB00] hover:bg-[#e8e638] text-slate-950 rounded-xl font-black text-[10px] uppercase tracking-wider shadow flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Download size={13} />
              <span>Inscribirme al Evento & Descargar Programa Oficial</span>
            </button>
          </div>

          {/* DESCARGA E INSTALACIÓN DE APP ANDROID Y WINDOWS ESCRITORIO */}
          <PWAInstallButton variant="login" />

          {/* Estado del Sistema Compacto */}
          <div className="pt-0.5 flex flex-wrap items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
            <span className={`inline-flex items-center gap-1.5 ${
              connectionStatus === "connected" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
            }`}>
              {connectionStatus === "checking" && <Loader2 size={11} className="animate-spin"/>}
              {connectionStatus === "connected" && <Wifi size={11} />}
              {connectionStatus === "disconnected" && <WifiOff size={11} />}
              {connectionStatus === "checking" && "Verificando Red..."}
              {connectionStatus === "connected" && "Supabase Cloud Conectado"}
              {connectionStatus === "disconnected" && "Modo Autónomo / Local"}
            </span>

            <span>
              &copy; 2026 HempC Nucleus {activeVersion}
            </span>
          </div>
        </div>
      </div>

      {/* MODAL DE INSCRIPCIÓN A "UN DÍA DE SIEMBRA" (21/11) O ALTA AUTOGESTIVA */}
      <EventAndSelfRegistrationModal
        isOpen={showRegistrationModal}
        initialMode={registrationModalMode}
        onClose={() => setShowRegistrationModal(false)}
        usersList={usersList}
        addUser={addUser}
        updateUser={updateUser}
      />

      {/* MODAL DE ACTIVACIÓN DE CUENTA Y DEFINICIÓN DE CONTRASEÑA TRAS APROBACIÓN ADMIN */}
      {showActivateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 relative animate-in zoom-in-95">
            <button
              onClick={() => setShowActivateModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="bg-[#006633] text-white p-3 rounded-2xl shadow-lg shadow-green-900/20">
                <Key size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                  Activar Contraseña y Confirmar
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Habilitación de cuenta aprobada en NUCLEUS
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3 mb-4 text-[11px] text-emerald-900 dark:text-emerald-200 leading-relaxed">
              Ingresá tu correo aprobado por la Administración y definí tu <strong>contraseña personal de acceso</strong> para activar tu cuenta.
            </div>

            {activateStatus && (
              <div
                className={`mb-4 p-3.5 rounded-2xl text-xs border flex items-start gap-2 ${
                  activateStatus.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200"
                    : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                }`}
              >
                {activateStatus.type === "success" ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                )}
                <span className="font-bold">{activateStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleActivateAccountPassword} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">
                  Correo Electrónico Aprobado *
                </label>
                <input
                  required
                  type="email"
                  value={activateEmail}
                  onChange={e => setActivateEmail(e.target.value)}
                  placeholder="correo@ejemplo.com.ar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">
                  Código de Activación (Opcional si ingresaste desde el Link del Mail)
                </label>
                <input
                  type="text"
                  value={activateToken}
                  onChange={e => setActivateToken(e.target.value)}
                  placeholder="Ej: ACT-..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">
                  Definí tu Nueva Contraseña *
                </label>
                <div className="relative">
                  <input
                    required
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">
                  Confirmar Contraseña *
                </label>
                <input
                  required
                  type={showNewPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  placeholder="Repetí tu contraseña"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowActivateModal(false)}
                  className="px-4 py-2.5 text-slate-400 font-bold uppercase text-xs hover:text-slate-600 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isActivating}
                  className="bg-[#006633] hover:bg-[#004d26] text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {isActivating ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Confirmando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Confirmar Clave e Ingresar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE RECUPERACIÓN DE CONTRASEÑA */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-2xl max-w-md w-full p-8 relative animate-in zoom-in-95">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#006633] text-white p-3 rounded-2xl shadow-lg shadow-green-900/20">
                <Key size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                  Recuperar Contraseña
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Restablecimiento seguro vía correo
                </p>
              </div>
            </div>

            {/* Aviso informativo de registro cerrado */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-3.5 mb-6 text-xs text-amber-900 dark:text-amber-200">
              <p className="font-bold uppercase text-[10px] tracking-wider mb-1 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-amber-600" />
                Solo usuarios autorizados
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                El auto-registro público se encuentra inhabilitado. Si tu correo está registrado por la administración de la red, recibirás una contraseña provisoria de ingreso en tu casilla.
              </p>
            </div>

            {forgotStatus && forgotStatus.type === "not_found" && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs animate-in zoom-in-95">
                <p className="font-black uppercase tracking-wider mb-1 flex items-center gap-2">
                  <AlertTriangle size={16} /> Correo No Encontrado
                </p>
                <p className="text-[11px] leading-relaxed">{forgotStatus.message}</p>
              </div>
            )}

            {forgotStatus && forgotStatus.type === "error" && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs animate-in zoom-in-95">
                <p className="font-black uppercase tracking-wider mb-1 flex items-center gap-2">
                  <AlertTriangle size={16} /> Error de Despacho
                </p>
                <p className="text-[11px] leading-relaxed">{forgotStatus.message}</p>
              </div>
            )}

            {forgotStatus && forgotStatus.type === "success" && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-200 text-xs animate-in zoom-in-95">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <p className="font-black uppercase tracking-wider">¡Contraseña Despachada!</p>
                </div>
                <p className="text-[11px] leading-relaxed mb-3">{forgotStatus.message}</p>
                {forgotStatus.tempPassword && (
                  <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 font-mono text-center font-bold text-emerald-600 dark:text-emerald-400 text-sm mb-3">
                    Clave provisoria: {forgotStatus.tempPassword}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEmail(forgotEmail);
                    setPassword(forgotStatus.tempPassword || "");
                    setShowForgotModal(false);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider transition shadow cursor-pointer"
                >
                  Continuar al Login
                </button>
              </div>
            )}

            {(!forgotStatus || forgotStatus.type !== "success") && (
              <form onSubmit={handleRecoverPassword} className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">
                    Ingresá tu correo electrónico
                  </label>
                  <input
                    required
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="ej: usuario@hempc.com.ar"
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#006633] transition"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 text-slate-400 font-bold uppercase text-xs hover:text-slate-600 transition cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={isRecovering}
                    className="bg-[#006633] hover:bg-[#004d26] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center transition disabled:opacity-50 cursor-pointer"
                  >
                    {isRecovering ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        Despachando...
                      </>
                    ) : (
                      <>
                        <Mail size={16} className="mr-2" />
                        Enviar al Correo
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
