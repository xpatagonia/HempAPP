import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { 
  ArrowRight, AlertCircle, Loader2, ShieldCheck, 
  Leaf, Smartphone, Wifi, WifiOff, Eye, EyeOff, Lock, Mail,
  Key, CheckCircle2, AlertTriangle, X
} from "lucide-react";
import { checkConnection, supabase } from "../supabaseClient";
import { sendPasswordResetEmail } from "../src/services/emailNotificationService";
import { PWAInstallButton, AndroidLogo, WindowsLogo } from "../components/PWAInstallButton";

export default function Login() {
  const { currentUser, login, appName, appLogo, usersList, updateUser, addUser } = useAppContext();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "disconnected">("checking");

  // Estado del modal de recuperación de contraseña
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<{
    type: "success" | "not_found" | "error";
    message: string;
    tempPassword?: string;
  } | null>(null);

  const currentUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, navigate]);

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

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setIsRecovering(true);
    setForgotStatus(null);
    const targetEmail = forgotEmail.trim().toLowerCase();

    // 1. Buscar en lista local de usuarios
    let userFound = usersList.find(u => u.email.toLowerCase() === targetEmail);

    // 2. Si no está en memoria, consultar directamente a Supabase
    if (!userFound) {
      try {
        const { data } = await supabase.from("users").select("*").ilike("email", targetEmail).maybeSingle();
        if (data) {
          userFound = {
            id: data.id,
            name: data.name || "Usuario de Cooperativa",
            email: data.email,
            role: data.role || "technician",
            password: data.password,
            isNetworkMember: Boolean(data.is_network_member)
          };
        }
      } catch (e) {
        // Modo offline
      }
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
        organizationName: "Red Cooperativa Nucleus"
      };
      await addUser(userFound);
    }

    if (!userFound) {
      setForgotStatus({
        type: "not_found",
        message: `El correo "${targetEmail}" no se encuentra registrado en el padrón de la cooperativa. Por políticas de seguridad, no se admite el auto-registro público. Por favor solicita el alta a la administración de tu nodo.`
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
        password: tempPassword
      });

      const res = await sendPasswordResetEmail({
        toEmail: targetEmail,
        toName: userFound.name || "Usuario de la Red",
        tempPassword: tempPassword,
        actionUrl: window.location.origin
      });

      setForgotStatus({
        type: "success",
        message: `Hemos despachado una contraseña provisoria de acceso a tu casilla "${targetEmail}" vía ${res.deliveredVia === "smtp" ? "SMTP Real (mail.hempc.com.ar)" : "Auditoría Local"}. Revisa tu bandeja de entrada o spam para ingresar.`,
        tempPassword: res.deliveredVia !== "smtp" ? tempPassword : undefined
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

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-stretch overflow-hidden font-sans bg-white dark:bg-slate-950">
      
      {/* Lado Izquierdo: Branding Corporativo */}
      <div className="hidden lg:flex lg:w-3/5 bg-[#DDDB00] relative p-20 flex-col justify-between overflow-hidden border-r border-yellow-500/20 shadow-inner">
        <div className="relative z-10 flex flex-col h-full justify-center">
          
          {/* LOGO DINÁMICO */}
          <div className="mb-12">
            {appLogo ? (
              <img 
                src={appLogo} 
                alt={appName} 
                className="h-32 w-auto object-contain mb-8 drop-shadow-sm" 
              />
            ) : (
              <div className="bg-[#006633] p-6 rounded-[28px] w-fit mb-8 shadow-xl shadow-green-900/30">
                <Leaf size={48} className="text-white" />
              </div>
            )}
            
            <h1 className="text-9xl font-black text-[#006633] tracking-tighter italic uppercase leading-none drop-shadow-sm">
              {appName}
            </h1>
          </div>

          <div className="space-y-8">
            <p className="text-[#006633] text-3xl font-black tracking-tight leading-tight max-w-lg border-l-8 border-[#006633] pl-8 italic">
              Red Cooperativa de Agricultores de Cáñamo Industrial Argentina
            </p>
            
            <div className="h-1 w-48 bg-[#006633] opacity-30 rounded-full"></div>

            <h2 className="text-5xl font-black text-[#006633] leading-tight tracking-tighter uppercase italic opacity-90">
              Plataforma Inteligente <br />
              de trazabilidad y gestión
            </h2>
            
            <p className="text-[#006633]/70 text-2xl font-bold leading-relaxed max-w-md">
              de la bioeconomía del Cáñamo Industrial & Agro 4.0
            </p>
          </div>
        </div>

        {/* ACCESO MÓVIL POR CÓDIGO QR & APPS */}
        <div className="absolute bottom-12 left-20 z-20 animate-in slide-in-from-bottom-6 duration-1000">
          <div className="bg-white/25 backdrop-blur-md border border-white/50 p-4 rounded-3xl flex items-center gap-5 shadow-xl max-w-md">
            <div className="bg-white p-2 rounded-2xl shadow-inner shrink-0">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentUrl)}`} 
                alt="Mobile Login QR" 
                className="w-20 h-20 mix-blend-multiply opacity-90"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[#006633]">
                <AndroidLogo size={18} className="text-[#006633]" />
                <WindowsLogo size={15} className="text-[#006633]" />
                <p className="font-black text-xs uppercase tracking-widest">App Android & Windows</p>
              </div>
              <p className="text-[#006633] text-[11px] font-bold leading-tight">
                Escanea el código QR con tu celular Android o descarga la aplicación de escritorio para Windows.
              </p>
            </div>
          </div>
        </div>
        
        <div className="absolute -right-20 -bottom-20 w-[600px] h-[600px] bg-white/20 rounded-full blur-[120px] opacity-60 pointer-events-none"></div>
      </div>

      {/* Lado Derecho: Formulario de Autenticación */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 bg-white dark:bg-slate-950 transition-colors duration-500 relative">
        <div className="w-full max-w-md space-y-8">
          
          {/* Header en Pantalla Móvil */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-block bg-[#DDDB00] p-6 rounded-3xl mb-4 shadow-xl border border-yellow-400/30">
              {appLogo ? (
                <img src={appLogo} alt={appName} className="h-16 object-contain" />
              ) : (
                <h1 className="text-4xl font-black text-[#006633] italic uppercase tracking-tighter leading-none">{appName}</h1>
              )}
            </div>
            <p className="text-[#006633] font-black text-xs uppercase tracking-[0.3em]">Red Cooperativa Argentina</p>
          </div>

          {/* Encabezado del Formulario */}
          <div className="border-b-2 border-slate-100 dark:border-slate-800 pb-5">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">
              Iniciar Sesión
            </h2>
            <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.2em] flex items-center gap-2 mt-2">
              <ShieldCheck size={16} className="text-[#006633]"/> Nodo Nucleus Autenticado
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center border border-red-200 dark:border-red-900/60 animate-in slide-in-from-top-2 shadow-sm">
                <AlertCircle size={18} className="mr-3 flex-shrink-0"/>
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-2 group">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-[#006633] dark:group-focus-within:text-emerald-400 transition-colors flex items-center gap-2">
                <Mail size={14} /> Correo Electrónico o Usuario
              </label>
              <input 
                required 
                type="text" 
                autoComplete="username email"
                autoCapitalize="none"
                spellCheck="false"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-[#006633]/10 focus:border-[#006633] dark:focus:border-emerald-500 outline-none transition-all text-slate-900 dark:text-white font-bold placeholder-slate-400 text-sm shadow-sm" 
                placeholder="usuario@hempc.com.ar" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>

            <div className="space-y-2 group">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-[#006633] dark:group-focus-within:text-emerald-400 transition-colors flex items-center gap-2">
                <Lock size={14} /> Contraseña
              </label>
              <div className="relative">
                <input 
                  required 
                  type={showPassword ? "text" : "password"} 
                  autoComplete="current-password"
                  className="w-full px-5 py-4 pr-12 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-[#006633]/10 focus:border-[#006633] dark:focus:border-emerald-500 outline-none transition-all text-slate-900 dark:text-white font-bold placeholder-slate-400 text-sm shadow-sm" 
                  placeholder="••••••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Enlace de recuperación de contraseña */}
            <div className="flex justify-between items-center px-1 pt-1">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Lock size={12} className="text-[#006633] dark:text-emerald-400" /> Acceso Restringido
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotEmail(email);
                  setForgotStatus(null);
                }}
                className="text-xs font-bold text-[#006633] dark:text-emerald-400 hover:underline transition-colors cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full bg-[#006633] hover:bg-[#004d26] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.25em] active:scale-[0.98] transition-all shadow-xl shadow-green-900/20 disabled:opacity-50 flex items-center justify-center group cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="animate-spin" size={18} />
                  <span>Verificando Credenciales...</span>
                </div>
              ) : (
                <>
                  <span>Ingresar al Sistema</span> 
                  <ArrowRight size={18} className="ml-3 group-hover:translate-x-2 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* DESCARGA E INSTALACIÓN DE APP ANDROID Y WINDOWS ESCRITORIO */}
          <PWAInstallButton variant="login" />

          {/* AVISO INSTITUCIONAL DE REGISTRO CERRADO */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-3">
            <ShieldCheck size={18} className="text-[#006633] dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider mb-0.5">
                Plataforma de Acceso Cerrado (Sin Auto-Registro)
              </p>
              <p className="leading-relaxed">
                Por normativas de trazabilidad legal de cáñamo industrial (ARICCAME / INASE), <strong>los usuarios no pueden registrarse por su cuenta</strong>. Todas las cuentas son dadas de alta exclusivamente por la administración cooperativa.
              </p>
            </div>
          </div>

          {/* Estado del Sistema */}
          <div className="pt-4 text-center space-y-3">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
              connectionStatus === "connected" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" :
              "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
            }`}>
              {connectionStatus === "checking" && <Loader2 size={12} className="mr-2 animate-spin"/>}
              {connectionStatus === "connected" && <Wifi size={12} className="mr-2 text-emerald-600"/>}
              {connectionStatus === "disconnected" && <WifiOff size={12} className="mr-2 text-amber-600"/>}
              
              {connectionStatus === "checking" && "Verificando Red..."}
              {connectionStatus === "connected" && "Supabase Cloud Conectado"}
              {connectionStatus === "disconnected" && "Modo Autónomo / Local"}
            </div>

            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              &copy; 2026 HempC Nucleus v7.17.1 | Red de Cáñamo Industrial Argentina
            </p>
          </div>
        </div>
      </div>

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
