import React, { useState, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { User, UserRole, RoleType, Client } from "../types";
import { 
  Plus, Trash2, Edit2, Shield, Wrench, Eye, EyeOff, AlertCircle, Lock, Key, 
  Save, Loader2, Phone, Briefcase, User as UserIcon, CloudOff, Link as LinkIcon, 
  UserCheck, Building, X, Sparkles, PlusCircle, Star, Search, Filter, FilterX,
  Send, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Users as UsersIcon
} from "lucide-react";
import { 
  sendUserProfileWelcomeEmail, 
  sendPasswordResetEmail, 
  EmailDispatchResult 
} from "../src/services/emailNotificationService";

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sawyer&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jocelyn&backgroundColor=ffd5dc",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Preston&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Lola&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper&backgroundColor=d1d4f9"
];

export default function Users() {
  const { usersList, addUser, updateUser, deleteUser, currentUser, clients, addClient } = useAppContext();

  // Estados de búsqueda y filtro
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordInModal, setShowPasswordInModal] = useState(false);
  const [sendEmailOnSave, setSendEmailOnSave] = useState(true);

  // Estados para acciones por fila (envío de email o reseteo)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [emailToast, setEmailToast] = useState<{
    show: boolean;
    success: boolean;
    message: string;
    sentTo: string;
    via: string;
  } | null>(null);

  const [showQuickClient, setShowQuickClient] = useState(false);
  const [quickClientName, setQuickClientName] = useState("");
  const [quickClientIsRed, setQuickClientIsRed] = useState(false);

  const [formData, setFormData] = useState<Partial<User>>({
    name: "", 
    email: "", 
    role: "technician", 
    password: "", 
    jobTitle: "", 
    phone: "", 
    avatar: PRESET_AVATARS[0], 
    clientId: "", 
    isNetworkMember: false
  });

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isAdmin = currentUser?.role === "admin" || isSuperAdmin;

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const matchSearch = 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.jobTitle && u.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchRole = filterRole === "all" || u.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [usersList, searchTerm, filterRole]);

  // Métricas
  const totalUsers = usersList.length;
  const adminCount = usersList.filter(u => u.role === "admin" || u.role === "super_admin").length;
  const techCount = usersList.filter(u => u.role === "technician").length;
  const clientCount = usersList.filter(u => u.role === "client").length;

  // Generador de contraseñas de alta seguridad
  const handleGeneratePassword = () => {
    const charsUpper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const charsLower = "abcdefghjkmnpqrstuvwxyz";
    const charsNums = "23456789";
    const specials = "!#$%&*";
    let pwd = "HempC-";
    for (let i = 0; i < 3; i++) pwd += charsUpper.charAt(Math.floor(Math.random() * charsUpper.length));
    for (let i = 0; i < 2; i++) pwd += charsNums.charAt(Math.floor(Math.random() * charsNums.length));
    pwd += specials.charAt(Math.floor(Math.random() * specials.length));
    setFormData(prev => ({ ...prev, password: pwd }));
    setShowPasswordInModal(true);
  };

  const handleEdit = (user: User) => {
    if (!isSuperAdmin && user.role === "super_admin") {
      alert("Permisos insuficientes para editar un Super Administrador.");
      return;
    }
    setFormData({ ...user, password: "" });
    setEditingId(user.id);
    setSendEmailOnSave(false);
    setIsModalOpen(true);
  };

  const handleQuickClientSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickClientName.trim()) return;

    const newClientId = Date.now().toString();
    const newClient: Client = {
      id: newClientId,
      name: quickClientName.trim(),
      type: "Empresa Privada",
      contactName: formData.name || "Titular",
      email: formData.email || "",
      isNetworkMember: quickClientIsRed
    };

    setIsSaving(true);
    const success = await addClient(newClient);
    setIsSaving(false);

    if (success) {
      setFormData(prev => ({ ...prev, clientId: newClientId, isNetworkMember: quickClientIsRed }));
      setShowQuickClient(false);
      setQuickClientName("");
      setQuickClientIsRed(false);
      alert(`Entidad "${newClient.name}" creada y vinculada.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role as UserRole,
        jobTitle: formData.jobTitle || "",
        phone: formData.phone || "",
        avatar: formData.avatar || PRESET_AVATARS[0],
        clientId: (formData.role === "client" || formData.role === "technician") ? formData.clientId : null,
        isNetworkMember: formData.isNetworkMember || false
      };

      let finalPassword = formData.password;

      if (editingId) {
        const oldUser = usersList.find(u => u.id === editingId);
        finalPassword = formData.password ? formData.password : oldUser?.password;
        await updateUser({ ...payload, id: editingId, password: finalPassword } as User);
      } else {
        if (!formData.password) {
          alert("Por favor genere o asigne una clave inicial.");
          setIsSaving(false);
          return;
        }
        const newUserId = Date.now().toString();
        await addUser({ ...payload, id: newUserId, password: formData.password } as User);

        // Despacho de bienvenida y credenciales por correo si está activo
        if (sendEmailOnSave && formData.password) {
          const clientName = clients.find(c => c.id === formData.clientId)?.name;
          const roleLabels: Record<string, string> = {
            admin: "Administrador General",
            technician: "Técnico / Asesor Agronómico",
            client: "Productor / Socio Cooperativo",
            viewer: "Visor Auditor"
          };
          try {
            const dispatch = await sendUserProfileWelcomeEmail({
              toEmail: formData.email.trim(),
              toName: formData.name.trim(),
              roleName: roleLabels[formData.role || "technician"] || formData.role || "Técnico",
              organizationName: clientName || "Red Cooperativa Nucleus",
              tempPassword: formData.password,
              actionUrl: window.location.origin
            });
            setEmailToast({
              show: true,
              success: true,
              message: dispatch.message,
              sentTo: formData.email.trim(),
              via: dispatch.deliveredVia
            });
          } catch (e: any) {
            console.error("Fallo al despachar email de bienvenida:", e);
          }
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Fallo en la sincronización.");
    } finally {
      setIsSaving(false);
    }
  };

  // Reenviar credenciales por correo
  const handleSendCredentials = async (user: User) => {
    setActionLoadingId(user.id);
    try {
      const clientName = clients.find(c => c.id === user.clientId)?.name;
      const roleLabels: Record<string, string> = {
        super_admin: "Super Administrador",
        admin: "Administrador General",
        technician: "Técnico / Asesor Agronómico",
        client: "Productor / Socio Cooperativo",
        viewer: "Visor Auditor"
      };

      const dispatch = await sendUserProfileWelcomeEmail({
        toEmail: user.email,
        toName: user.name,
        roleName: roleLabels[user.role] || user.role,
        organizationName: clientName || "Red Cooperativa Nucleus",
        tempPassword: user.password || "Asignada previamente por el administrador",
        actionUrl: window.location.origin
      });

      setEmailToast({
        show: true,
        success: true,
        message: dispatch.message,
        sentTo: user.email,
        via: dispatch.deliveredVia
      });
    } catch (err: any) {
      alert("Error al enviar credenciales: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Restablecer contraseña y notificar por correo
  const handleResetPasswordAndNotify = async (user: User) => {
    const confirmReset = window.confirm(
      `¿Deseas generar una nueva contraseña provisoria para "${user.name}" y despacharla por correo electrónico a ${user.email}?`
    );
    if (!confirmReset) return;

    setActionLoadingId(user.id);
    try {
      const charsUpper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
      const charsNums = "23456789";
      let rand = "";
      for (let i = 0; i < 5; i++) rand += charsUpper.charAt(Math.floor(Math.random() * charsUpper.length));
      for (let i = 0; i < 2; i++) rand += charsNums.charAt(Math.floor(Math.random() * charsNums.length));
      const newTempPassword = `HempC-${rand}!`;

      // Actualizar en base de datos
      await updateUser({
        ...user,
        password: newTempPassword
      });

      // Despachar email
      const dispatch = await sendPasswordResetEmail({
        toEmail: user.email,
        toName: user.name,
        tempPassword: newTempPassword,
        actionUrl: window.location.origin
      });

      setEmailToast({
        show: true,
        success: true,
        message: `Nueva contraseña provisoria generada y despachada a ${user.email}`,
        sentTo: user.email,
        via: dispatch.deliveredVia
      });
    } catch (err: any) {
      alert("Error al restablecer contraseña: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-3 rounded-2xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all text-sm font-medium";

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight italic">
              Equipos & <span className="text-hemp-600">Accesos</span>
            </h1>
            <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Alta Centralizada
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gestión institucional de personal, técnicos de campo y productores asociados.
          </p>
        </div>

        <button 
          onClick={() => { 
            setEditingId(null); 
            setFormData({ 
              name: "", 
              email: "", 
              role: "technician", 
              password: "", 
              avatar: PRESET_AVATARS[0], 
              clientId: "", 
              isNetworkMember: false 
            }); 
            setSendEmailOnSave(true);
            setIsModalOpen(true); 
          }} 
          className="w-full md:w-auto bg-[#006633] text-white px-6 py-3 rounded-[20px] flex items-center justify-center hover:bg-[#004d26] transition shadow-xl font-black text-xs uppercase tracking-widest cursor-pointer"
        >
          <Plus size={18} className="mr-2" /> Nuevo Perfil de Acceso
        </button>
      </div>

      {/* AVISO INSTITUCIONAL DE REGISTRO RESTRINGIDO */}
      <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500 text-white rounded-xl flex-shrink-0">
            <Lock size={18} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider">
              Seguridad Institucional: Sin Auto-Registro Público
            </p>
            <p className="text-xs opacity-90">
              Los usuarios no pueden registrarse por su cuenta en la plataforma pública. Todas las altas de perfil, asignación de roles y credenciales son gestionadas exclusivamente desde este panel por los administradores de la cooperativa.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 flex-shrink-0">
          <ShieldCheck size={14} className="text-emerald-600" /> Control de Acceso Activo
        </div>
      </div>

      {/* TOAST DE FEEDBACK DE ENVÍO DE EMAIL */}
      {emailToast && (() => {
        const isRealSmtp = emailToast.via === "smtp";
        return (
          <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between animate-in slide-in-from-top-2 shadow-lg ${
            isRealSmtp
              ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-200"
              : "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200"
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl text-white ${isRealSmtp ? "bg-emerald-600" : "bg-amber-600"}`}>
                {isRealSmtp ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider">
                  {isRealSmtp ? "Notificación de Acceso Despachada (SMTP Real)" : "Despacho Registrado en Auditoría Local"}
                </p>
                <p className="text-xs opacity-90">{emailToast.message}</p>
                <p className={`text-[10px] font-mono mt-0.5 ${isRealSmtp ? "text-emerald-700 dark:text-emerald-400" : "text-amber-800 dark:text-amber-300"}`}>
                  Remitente: notificaciones@hempc.com.ar • Destino: {emailToast.sentTo} • Vía: {emailToast.via}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setEmailToast(null)} 
              className={`p-1.5 rounded-lg cursor-pointer ${isRealSmtp ? "text-emerald-600 hover:bg-emerald-100" : "text-amber-700 hover:bg-amber-100"}`}
            >
              <X size={18} />
            </button>
          </div>
        );
      })()}

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total Perfiles</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">{totalUsers}</span>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl">
            <UsersIcon size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Administración</span>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">{adminCount}</span>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-2xl">
            <Shield size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Técnicos de Campo</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">{techCount}</span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl">
            <Wrench size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Productores / Socios</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{clientCount}</span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Star size={20} />
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-[24px] shadow-sm border dark:border-slate-800 flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
          <input 
            type="text" 
            placeholder="Buscar por nombre, correo o cargo..." 
            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-950 border border-transparent focus:bg-white dark:focus:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-hemp-500 transition-all text-sm font-medium"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="px-4 py-3 bg-gray-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none dark:text-white" 
            value={filterRole} 
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="all">Todos los Roles</option>
            <option value="admin">Administrador</option>
            <option value="technician">Técnico de Campo</option>
            <option value="client">Productor / Socio</option>
            <option value="viewer">Visor Externo</option>
          </select>
          <button 
            onClick={() => { setSearchTerm(""); setFilterRole("all"); }} 
            className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all cursor-pointer" 
            title="Limpiar Filtros"
          >
            <FilterX size={20}/>
          </button>
        </div>
      </div>

      {/* TABLA DE USUARIOS Y ACCESOS */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-widest border-b dark:border-slate-800">
              <tr>
                <th className="px-6 py-5">Perfil & Identidad</th>
                <th className="px-6 py-5">Rol / Jerarquía</th>
                <th className="px-6 py-5">Entidad Vinculada</th>
                <th className="px-6 py-5">Seguridad & Credencial</th>
                <th className="px-6 py-5 text-right">Gestión de Acceso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-400 italic font-medium">
                    No se encontraron usuarios en el padrón cooperativo.
                  </td>
                </tr>
              ) : filteredUsers.map((user) => {
                const isUserLoading = actionLoadingId === user.id;
                const hasPassword = Boolean(user.password && user.password.trim().length > 0);

                return (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 group transition-colors">
                    {/* Perfil */}
                    <td className="px-6 py-5">
                      <div className="flex items-center">
                        <div className="relative">
                          <img 
                            className="h-11 w-11 rounded-2xl border-2 border-white dark:border-slate-800 shadow-sm mr-4 object-cover bg-slate-100" 
                            src={user.avatar || PRESET_AVATARS[0]} 
                            alt="" 
                          />
                          {user.isNetworkMember && (
                            <div className="absolute -bottom-1 -right-0.5 bg-amber-500 p-0.5 rounded-full border border-white dark:border-slate-900" title="Miembro Red Cooperativa">
                              <Star size={8} className="text-white fill-current"/>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-tight">
                            {user.name}
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold lowercase tracking-normal">
                            {user.email}
                          </div>
                          {user.jobTitle && (
                            <span className="text-[9px] text-slate-500 font-medium">
                              {user.jobTitle}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="px-6 py-5">
                      <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border inline-block ${
                        user.role === "super_admin" ? "bg-red-50 text-red-700 border-red-100" :
                        user.role === "admin" ? "bg-purple-50 text-purple-700 border-purple-100" :
                        user.role === "client" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                        "bg-blue-50 text-blue-700 border-blue-100"
                      }`}>
                        {user.role === "client" ? "Productor/Socio" : user.role.replace("_", " ")}
                      </div>
                    </td>

                    {/* Entidad */}
                    <td className="px-6 py-5">
                      {(user.role === "client" || user.role === "technician") && user.clientId ? (
                        <div className="flex items-center text-gray-600 dark:text-gray-300 font-black text-xs uppercase tracking-tight italic">
                          <Building size={14} className="mr-2 text-hemp-600 opacity-50"/>
                          {clients.find(c => c.id === user.clientId)?.name || "Entidad Asignada"}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-600 italic text-[10px] uppercase font-black tracking-widest">
                          Sede Central Cooperativa
                        </span>
                      )}
                    </td>

                    {/* Estado de Credencial */}
                    <td className="px-6 py-5">
                      {hasPassword ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <Lock size={12} /> Activa & Segura
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <AlertCircle size={12} /> Sin Clave
                        </span>
                      )}
                    </td>

                    {/* Acciones de gestión */}
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end items-center space-x-1.5">
                        {/* Botón: Despachar Credenciales por Email */}
                        <button
                          type="button"
                          disabled={isUserLoading}
                          onClick={() => handleSendCredentials(user)}
                          title="Enviar credenciales de acceso por correo electrónico"
                          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition shadow-sm border border-slate-200 dark:border-slate-800 hover:border-emerald-300 flex items-center gap-1 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          {isUserLoading ? (
                            <Loader2 size={15} className="animate-spin text-emerald-600" />
                          ) : (
                            <Send size={15} className="text-emerald-600" />
                          )}
                          <span className="hidden xl:inline">Enviar Acceso</span>
                        </button>

                        {/* Botón: Restablecer Contraseña y Notificar */}
                        <button
                          type="button"
                          disabled={isUserLoading}
                          onClick={() => handleResetPasswordAndNotify(user)}
                          title="Restablecer contraseña y despachar nueva clave temporal por correo"
                          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition shadow-sm border border-slate-200 dark:border-slate-800 hover:border-amber-300 flex items-center gap-1 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw size={15} className="text-amber-600" />
                          <span className="hidden xl:inline">Reset Clave</span>
                        </button>

                        {/* Botón: Editar */}
                        <button 
                          onClick={() => handleEdit(user)} 
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition shadow-sm border border-transparent hover:border-blue-100 cursor-pointer"
                          title="Editar perfil"
                        >
                          <Edit2 size={16} />
                        </button>

                        {/* Botón: Eliminar */}
                        <button 
                          onClick={() => { if(window.confirm(`¿Eliminar perfil de ${user.name}?`)) deleteUser(user.id); }} 
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition shadow-sm border border-transparent hover:border-red-100 cursor-pointer"
                          title="Eliminar perfil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE ALTA / EDICIÓN DE PERFIL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl max-w-2xl w-full p-8 md:p-10 my-auto animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="bg-[#006633] p-3 rounded-2xl text-white shadow-lg">
                  <UserIcon size={24}/>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                    {editingId ? "Editar Perfil de Acceso" : "Alta Centralizada de Perfil"}
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Seguridad, jerarquía y credenciales de usuario
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400 cursor-pointer"
              >
                <X size={24}/>
              </button>
            </div>

            {/* Aviso de no auto-registro dentro del modal */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2.5">
              <Lock size={15} className="text-[#006633] flex-shrink-0" />
              <span>
                <strong>Acceso controlado:</strong> Este perfil quedará habilitado para ingresar a la plataforma con el correo y contraseña especificados.
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Bloque de Avatar y Datos */}
              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">
                    Seleccionar Avatar Institucional
                  </label>
                  <div className="flex flex-wrap gap-2 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                    {PRESET_AVATARS.map((av, idx) => (
                      <button 
                        key={idx} 
                        type="button" 
                        onClick={() => setFormData({...formData, avatar: av})} 
                        className={`w-11 h-11 rounded-xl overflow-hidden transition-all border-2 cursor-pointer ${
                          formData.avatar === av ? "border-hemp-600 scale-110 shadow-md" : "border-transparent opacity-40 hover:opacity-100"
                        }`}
                      >
                        <img src={av} className="w-full h-full object-cover" alt="avatar" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">
                      Nombre Completo *
                    </label>
                    <input 
                      required 
                      className={inputClass} 
                      value={formData.name || ""} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      placeholder="ej: Lic. Carlos Albarracín"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">
                      Especialidad / Cargo
                    </label>
                    <input 
                      className={inputClass} 
                      value={formData.jobTitle || ""} 
                      onChange={e => setFormData({...formData, jobTitle: e.target.value})} 
                      placeholder="Ej: Ing. Agrónomo / Encargado"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">
                      Correo Electrónico de Acceso *
                    </label>
                    <input 
                      required 
                      type="email" 
                      className={inputClass} 
                      value={formData.email || ""} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                      placeholder="ej: usuario@hempc.com.ar"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        {editingId ? "Cambiar Contraseña" : "Contraseña de Acceso *"}
                      </label>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles size={12} /> Generar Segura
                      </button>
                    </div>
                    <div className="relative">
                      <input 
                        type={showPasswordInModal ? "text" : "password"} 
                        className={inputClass + " pr-10"} 
                        value={formData.password || ""} 
                        onChange={e => setFormData({...formData, password: e.target.value})} 
                        placeholder={editingId ? "Dejar vacío para mantener la actual" : "Mínimo 6 caracteres"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        title={showPasswordInModal ? "Ocultar" : "Ver"}
                      >
                        {showPasswordInModal ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Checkbox: Notificar por email */}
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="sendEmailOnSave"
                      checked={sendEmailOnSave}
                      onChange={e => setSendEmailOnSave(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="sendEmailOnSave" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                      ✉️ Despachar credenciales por correo electrónico automáticamente al guardar
                    </label>
                  </div>
                </div>
              </div>

              {/* Rango Jerárquico */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                  Rango Jerárquico & Permisos
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { val: "viewer", lab: "Visor Auditor" },
                    { val: "technician", lab: "Técnico de Campo" },
                    { val: "client", lab: "Productor / Socio" },
                    { val: "admin", lab: "Administrador" }
                  ].map((r) => (
                    <button
                      key={r.val}
                      type="button"
                      onClick={() => setFormData({...formData, role: r.val as UserRole})}
                      className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all border cursor-pointer ${
                        formData.role === r.val 
                          ? "bg-[#006633] text-white border-[#006633] shadow-lg" 
                          : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {r.lab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entidad vinculada si es productor o técnico */}
              {(formData.role === "client" || formData.role === "technician") && (
                <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                  <label className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest block mb-2">
                    Entidad u Organización Vinculada
                  </label>
                  <select 
                    required 
                    className={inputClass} 
                    value={formData.clientId || ""} 
                    onChange={e => setFormData({...formData, clientId: e.target.value})}
                  >
                    <option value="">Seleccionar entidad asociada...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex justify-end space-x-3 pt-6 border-t dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-6 py-3 text-slate-400 font-black uppercase text-xs tracking-wider hover:text-slate-600 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving} 
                  className="bg-[#006633] hover:bg-[#004d26] text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
                  {editingId ? "Actualizar Perfil" : "Guardar & Habilitar Perfil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
