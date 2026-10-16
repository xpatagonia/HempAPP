import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Client, RoleType, User, MembershipLevel, UserRole, StructureRole, Location } from '../types';
import { 
  Plus, Edit2, Trash2, Briefcase, MapPin, Phone, Mail, Globe, 
  Users, Building, Eye, X, Link as LinkIcon, UserCheck, 
  Shield, UserPlus, Star, Loader2, Save, UserMinus, 
  Archive, Sprout, BookOpen, Clock, ClipboardCheck, ArrowUpRight,
  Info, Navigation, CheckCircle2, Key, LayoutGrid, Activity, Smartphone, Sparkles,
  Send, AlertTriangle, RefreshCw, Check, Search, Filter, ShieldAlert, Tractor,
  Lock, ExternalLink, HelpCircle
} from 'lucide-react';
import MapEditor from '../components/MapEditor';
import { 
  sendOperatorInvitationEmail, 
  sendTestNotificationEmail,
  checkEmailServiceStatus,
  getEmailAuditLog, 
  EmailAuditLogEntry, 
  EmailDispatchResult 
} from '../src/services/emailNotificationService';
import { 
  STRUCTURE_ROLES_INFO, 
  isCentralAdminOrSupervisor, 
  canManageStructure,
  getAllowedLocationIds
} from '../src/utils/structurePermissions';

const PRESET_AVATARS = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ffdfbf",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sawyer&backgroundColor=d1d4f9",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jocelyn&backgroundColor=ffd5dc",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Preston&backgroundColor=c0aede",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo&backgroundColor=b6e3f4"
];

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let pass = '';
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

export default function Clients() {
  const { 
    clients, addClient, updateClient, deleteClient, currentUser, 
    usersList, addUser, updateUser, locations, plots, switchUserRole
  } = useAppContext();

  // Estados de interfaz y filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMembership, setFilterMembership] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'operators' | 'audit'>('info');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Feedback de notificación por email
  const [emailFeedback, setEmailFeedback] = useState<{
    show: boolean;
    success: boolean;
    message: string;
    sentTo: string;
    via: string;
  } | null>(null);

  // Modal de vista previa o prueba de correo
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState(currentUser?.email || 'admin@hempc.com.ar');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<{ configured: boolean; sender: string; host: string; port: number; engineUrl: string } | null>(null);
  const [showPasswordGuide, setShowPasswordGuide] = useState(false);

  const handleOpenTestEmailModal = async () => {
    setShowTestEmailModal(true);
    try {
      const status = await checkEmailServiceStatus();
      setSmtpStatus(status);
    } catch (e) {
      // fallback
    }
  };

  // Modal de vista previa del email a operario
  const [previewOperatorEmail, setPreviewOperatorEmail] = useState<{
    toName: string;
    toEmail: string;
    roleName: string;
    structureName: string;
    fieldName: string;
    tempPassword?: string;
  } | null>(null);

  // Estado del formulario de Estructura / Socio
  const [formData, setFormData] = useState<Partial<Client> & { lat: string, lng: string, teamUserIds: string[] }>({
    name: '', type: 'Empresa Privada', contactName: '', contactPhone: '', email: '', 
    address: '', totalHectares: 0,
    isNetworkMember: true, cuit: '', notes: '', relatedUserId: '', 
    membershipLevel: 'Activo', contractDate: new Date().toISOString().split('T')[0],
    locationId: '', lat: '', lng: '', teamUserIds: []
  });

  // Estado del formulario de Nuevo Operario dentro de la Estructura
  const [newOperatorData, setNewOperatorData] = useState({
    name: '',
    email: '',
    password: generatePassword(),
    structureRole: 'operario' as StructureRole,
    jobTitle: '',
    phone: '',
    avatar: PRESET_AVATARS[0],
    sendEmailNotification: true
  });

  const [isDispatchingInvite, setIsDispatchingInvite] = useState(false);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = isCentralAdminOrSupervisor(currentUser);
  const isClient = currentUser?.role === 'client';

  // Filtrado de estructuras visibles según el usuario
  const myClients = useMemo(() => {
    let base = clients;
    if (isAdmin) {
      base = clients;
    } else if (currentUser?.clientId) {
      base = clients.filter(c => c.id === currentUser.clientId);
    } else {
      base = [];
    }

    return base.filter(c => {
      const matchSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cuit?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchLevel = filterMembership === 'all' || c.membershipLevel === filterMembership;
      return matchSearch && matchLevel;
    });
  }, [clients, isAdmin, currentUser, searchTerm, filterMembership]);

  // Obtener el campo asignado a una estructura
  const getStructureLocation = (client: Client): Location | undefined => {
    if (client.locationId) {
      return locations.find(l => l.id === client.locationId);
    }
    return locations.find(l => l.clientId === client.id);
  };

  // Apertura de modal para editar o crear
  const handleOpenStructureModal = (client?: Client) => {
    if (client) {
      const team = usersList.filter(u => u.clientId === client.id);
      const loc = getStructureLocation(client);
      setFormData({
        ...client,
        locationId: client.locationId || loc?.id || '',
        lat: client.coordinates?.lat?.toString() || loc?.coordinates?.lat?.toString() || '',
        lng: client.coordinates?.lng?.toString() || loc?.coordinates?.lng?.toString() || '',
        teamUserIds: team.map(u => u.id)
      });
      setEditingId(client.id);
    } else {
      resetForm();
    }
    setActiveModalTab('info');
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ 
      name: '', type: 'Empresa Privada', contactName: '', contactPhone: '', email: '', 
      address: '', totalHectares: 0,
      isNetworkMember: true, cuit: '', notes: '', relatedUserId: '', 
      membershipLevel: 'Activo', contractDate: new Date().toISOString().split('T')[0],
      locationId: '', lat: '', lng: '', teamUserIds: []
    });
    setEditingId(null);
    setNewOperatorData({
      name: '',
      email: '',
      password: generatePassword(),
      structureRole: 'operario',
      jobTitle: '',
      phone: '',
      avatar: PRESET_AVATARS[0],
      sendEmailNotification: true
    });
  };

  // Guardar estructura maestra
  const handleSubmitStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || isSaving) return;
    
    setIsSaving(true);
    try {
      const finalLat = parseFloat(formData.lat.replace(',', '.'));
      const finalLng = parseFloat(formData.lng.replace(',', '.'));
      const coordinates = (!isNaN(finalLat) && !isNaN(finalLng)) ? { lat: finalLat, lng: finalLng } : null;

      const clientPayload: Client = {
        id: editingId || generateId(),
        name: formData.name.trim(),
        type: formData.type || 'Empresa Privada',
        contactName: formData.contactName?.trim() || '',
        contactPhone: formData.contactPhone?.trim(),
        email: formData.email?.trim(),
        address: formData.address?.trim(), 
        totalHectares: Number(formData.totalHectares || 0), 
        isNetworkMember: formData.isNetworkMember !== false,
        membershipLevel: formData.membershipLevel || 'Activo',
        contractDate: formData.contractDate,
        cuit: formData.cuit?.trim(),
        notes: formData.notes,
        relatedUserId: formData.relatedUserId || null,
        locationId: formData.locationId || undefined,
        teamUserIds: formData.teamUserIds || [],
        coordinates: coordinates || undefined
      };

      let success = false;
      if (editingId) {
        success = await updateClient(clientPayload, formData.teamUserIds);
      } else {
        success = await addClient(clientPayload, formData.teamUserIds);
      }

      if (success) {
        setIsModalOpen(false);
        resetForm();
      }
    } catch (err: any) { 
      alert("Error al guardar estructura: " + err.message);
    } finally { 
      setIsSaving(false); 
    }
  };

  // Inclusión de un nuevo operario dentro de la estructura actual
  const handleAddOperatorToStructure = async () => {
    if (!newOperatorData.name.trim() || !newOperatorData.email.trim() || !newOperatorData.password) {
      alert("Por favor ingrese nombre, correo y contraseña del operario.");
      return;
    }

    const targetClientId = editingId || formData.id;
    if (!targetClientId) {
      alert("Primero debe guardar la estructura o seleccionar una existente.");
      return;
    }

    setIsDispatchingInvite(true);
    try {
      const roleConfig = STRUCTURE_ROLES_INFO[newOperatorData.structureRole] || STRUCTURE_ROLES_INFO.operario;
      const associatedField = locations.find(l => l.id === formData.locationId);

      const newUserId = generateId();
      const newUser: User = {
        id: newUserId,
        name: newOperatorData.name.trim(),
        email: newOperatorData.email.trim(),
        role: roleConfig.systemRole,
        structureRole: newOperatorData.structureRole,
        password: newOperatorData.password,
        jobTitle: newOperatorData.jobTitle.trim() || roleConfig.label,
        phone: newOperatorData.phone.trim(),
        avatar: newOperatorData.avatar,
        clientId: targetClientId,
        isNetworkMember: true,
        memberType: 'Socio_Productor',
        organizationName: formData.name,
        invitedAt: new Date().toISOString(),
        invitationEmailSent: false
      };

      // 1. Guardar usuario en el sistema
      const userCreated = await addUser(newUser);
      if (!userCreated) throw new Error("No se pudo persistir el operario.");

      // 2. Asociar al equipo de la estructura
      const updatedTeamIds = [...(formData.teamUserIds || []), newUserId];
      setFormData(prev => ({ ...prev, teamUserIds: updatedTeamIds }));

      // 3. Despachar notificación por correo desde notificaciones@hempc.com.ar si está tildado
      if (newOperatorData.sendEmailNotification) {
        const dispatchResult = await sendOperatorInvitationEmail({
          toEmail: newUser.email,
          toName: newUser.name,
          structureName: formData.name || 'Establecimiento Socio',
          fieldName: associatedField?.name || 'Establecimiento Asignado',
          roleName: roleConfig.label,
          tempPassword: newOperatorData.password,
          actionUrl: window.location.origin
        });

        // Actualizar marca de invitación enviada
        await updateUser({ ...newUser, invitationEmailSent: true, lastInvitationSentAt: new Date().toISOString() });

        setEmailFeedback({
          show: true,
          success: true,
          message: dispatchResult.message,
          sentTo: newUser.email,
          via: dispatchResult.deliveredVia
        });
      }

      // Reset del sub-formulario
      setNewOperatorData({
        name: '',
        email: '',
        password: generatePassword(),
        structureRole: 'operario',
        jobTitle: '',
        phone: '',
        avatar: PRESET_AVATARS[0],
        sendEmailNotification: true
      });

    } catch (err: any) {
      alert("Fallo al dar de alta el operario: " + (err.message || err));
    } finally {
      setIsDispatchingInvite(false);
    }
  };

  // Reenviar credenciales/invitación a un operario existente
  const handleResendInvitation = async (user: User, client: Client) => {
    const loc = getStructureLocation(client);
    const roleConfig = user.structureRole ? STRUCTURE_ROLES_INFO[user.structureRole] : STRUCTURE_ROLES_INFO.operario;
    
    setIsDispatchingInvite(true);
    try {
      const res = await sendOperatorInvitationEmail({
        toEmail: user.email,
        toName: user.name,
        structureName: client.name,
        fieldName: loc?.name || 'Establecimiento Asignado',
        roleName: roleConfig?.label || user.jobTitle || 'Operario de Campo',
        tempPassword: user.password || 'Contraseña ya establecida',
        actionUrl: window.location.origin
      });

      await updateUser({ ...user, invitationEmailSent: true, lastInvitationSentAt: new Date().toISOString() });

      setEmailFeedback({
        show: true,
        success: true,
        message: res.message,
        sentTo: user.email,
        via: res.deliveredVia
      });
    } catch (e: any) {
      alert("Error al reenviar invitación: " + e.message);
    } finally {
      setIsDispatchingInvite(false);
    }
  };

  // Actualizar rol de un operario existente
  const handleUpdateOperatorRole = async (userId: string, newRole: StructureRole) => {
    const user = usersList.find(u => u.id === userId);
    if (!user) return;
    const config = STRUCTURE_ROLES_INFO[newRole];
    await updateUser({
      ...user,
      structureRole: newRole,
      role: config.systemRole
    });
  };

  // Desvincular operario de la estructura
  const handleUnbindOperator = async (userId: string) => {
    if (!window.confirm("¿Desvincular a este operario de la estructura? Perderá acceso al campo asociado.")) return;
    const user = usersList.find(u => u.id === userId);
    if (!user) return;
    await updateUser({ ...user, clientId: undefined, assignedPlotIds: [] });
    setFormData(prev => ({
      ...prev,
      teamUserIds: (prev.teamUserIds || []).filter(id => id !== userId)
    }));
  };

  // Despacho de prueba de conectividad de correo
  const handleSendTestEmail = async () => {
    if (!testEmailInput.trim()) return;
    setIsSendingTest(true);
    try {
      const res = await sendTestNotificationEmail(testEmailInput.trim(), currentUser?.name || 'Administrador');
      setEmailFeedback({
        show: true,
        success: true,
        message: res.message,
        sentTo: testEmailInput,
        via: res.deliveredVia
      });
      setShowTestEmailModal(false);
    } catch (e: any) {
      alert("Fallo en la prueba de correo: " + e.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-3 rounded-2xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all text-sm";

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      
      {/* BANNER INFORMATIVO: SERVICIO DE NOTIFICACIONES OFICIAL & PERMISOS */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-800/40 rounded-[32px] p-6 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center">
                <Send size={12} className="mr-1.5 animate-pulse" /> Servidor de Notificaciones Activo
              </span>
              <span className="bg-slate-800/80 text-slate-300 px-3 py-1 rounded-full text-[10px] font-mono border border-slate-700">
                Remitente: <strong className="text-white">notificaciones@hempc.com.ar</strong>
              </span>
              <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center">
                <Lock size={12} className="mr-1.5" /> Aislamiento de Campo Estricto
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic">
              {isClient ? 'Mi Estructura Productiva' : 'Socios de la Red &'} <span className="text-hemp-400">Estructuras de Campo</span>
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cada tarjeta corresponde a una estructura productiva donde el titular del campo puede incorporar operarios con roles diferenciados. 
              <strong> Cada estructura accede exclusivamente al campo y parcelas que tiene asociados</strong>, mientras que los administradores y supervisores de la cooperativa auditan la red completa.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button 
              onClick={handleOpenTestEmailModal}
              className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center transition shadow-md hover:scale-105"
            >
              <Send size={14} className="mr-2 text-emerald-400" /> Probar Despacho Mail
            </button>
            {isAdmin && (
              <button 
                onClick={() => handleOpenStructureModal()}
                className="bg-hemp-600 hover:bg-hemp-500 text-white px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center transition shadow-xl hover:scale-105"
              >
                <Plus size={16} className="mr-1.5" /> Nueva Estructura
              </button>
            )}
          </div>
        </div>

        {/* SWITCHER RÁPIDO DE IDENTIDAD PARA PRUEBAS DE ACCESO */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center text-slate-400 text-[11px]">
            <Users size={14} className="mr-1.5 text-hemp-400" />
            <span className="font-bold text-slate-300 mr-2">Simular Rol en Vivo:</span>
            <span className="text-slate-400 hidden sm:inline">Permite verificar en 1 clic el aislamiento de datos por estructura:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {usersList.slice(0, 5).map(u => {
              const isSelected = currentUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => switchUserRole(u.id)}
                  className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                    isSelected 
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-lg scale-105' 
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  title={`Cambiar sesión a ${u.name} (${u.role})`}
                >
                  {u.name.split(' ')[0]} ({u.structureRole ? u.structureRole.toUpperCase() : u.role === 'super_admin' ? 'ADMIN' : u.role.toUpperCase()})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* FEEDBACK TOAST DE ENVÍO DE EMAIL */}
      {emailFeedback && (() => {
        const isRealSmtp = emailFeedback.via === "smtp" && !emailFeedback.message.toLowerCase().includes("timed out") && !emailFeedback.message.toLowerCase().includes("simulaci");
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
                  {isRealSmtp ? "Despacho de Correo Procesado (SMTP Real)" : "Despacho Simulado (No Entregado a Gmail)"}
                </p>
                <p className="text-xs opacity-90">{emailFeedback.message}</p>
                <p className={`text-[10px] font-mono mt-0.5 ${isRealSmtp ? "text-emerald-700 dark:text-emerald-400" : "text-amber-800 dark:text-amber-300"}`}>
                  Remitente: notificaciones@hempc.com.ar • Destino: {emailFeedback.sentTo} • Vía: {emailFeedback.via}
                  {!isRealSmtp && (emailFeedback.via === "simulated_local" ? " • [Despacho en auditoría local / Conectando motor]" : " • [Verificar servidor de correo]")}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setEmailFeedback(null)} 
              className={`p-1.5 rounded-lg ${isRealSmtp ? "text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900" : "text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"}`}
            >
              <X size={18} />
            </button>
          </div>
        );
      })()}

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-[28px] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
          <input 
            type="text" 
            placeholder="Buscar estructura por nombre, titular, CUIT o correo..." 
            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-950 border border-transparent focus:bg-white dark:focus:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-hemp-500 transition-all text-sm font-medium"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-black uppercase tracking-wider outline-none dark:text-white"
            value={filterMembership} 
            onChange={e => setFilterMembership(e.target.value)}
          >
            <option value="all">Todas las Membresías</option>
            <option value="Premium">Socio Premium</option>
            <option value="Activo">Socio Activo</option>
            <option value="En Observación">En Observación</option>
          </select>
          {(searchTerm || filterMembership !== 'all') && (
            <button 
              onClick={() => { setSearchTerm(''); setFilterMembership('all'); }} 
              className="px-3 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 rounded-2xl transition" 
              title="Limpiar Filtros"
            >
              <RefreshCw size={16}/>
            </button>
          )}
        </div>
      </div>

      {/* ESTADO VACÍO */}
      {myClients.length === 0 && (
        <div className="bg-white dark:bg-slate-900 p-16 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 text-center max-w-xl mx-auto shadow-sm">
          <Building size={56} className="mx-auto text-slate-300 dark:text-slate-700 mb-4 animate-bounce"/>
          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Sin Estructuras Encontradas</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {isClient 
              ? 'Tu usuario actual aún no tiene una estructura socio vinculada. Solicita al administrador de la cooperativa que asigne tu establecimiento.'
              : 'No hay estructuras que coincidan con los filtros de búsqueda.'}
          </p>
          {isAdmin && (
            <button 
              onClick={() => handleOpenStructureModal()}
              className="mt-6 bg-hemp-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-hemp-700 transition shadow-lg"
            >
              <Plus size={16} className="inline mr-1" /> Dar de Alta Estructura
            </button>
          )}
        </div>
      )}

      {/* GRID DE TARJETAS DE ESTRUCTURA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {myClients.map(client => {
          const team = usersList.filter(u => u.clientId === client.id);
          const associatedLocation = getStructureLocation(client);
          const structurePlots = associatedLocation ? plots.filter(p => p.locationId === associatedLocation.id) : [];
          const isManager = canManageStructure(currentUser, client);

          return (
            <div 
              key={client.id} 
              className="bg-white dark:bg-slate-900 rounded-[36px] shadow-sm hover:shadow-2xl border border-gray-100 dark:border-slate-800 transition-all duration-300 flex flex-col h-full overflow-hidden relative group hover:-translate-y-1"
            >
              {/* BADGE SUPERIOR DE MEMBRESÍA & CUIT */}
              <div className="bg-slate-50 dark:bg-slate-950/80 px-6 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                  client.membershipLevel === 'Premium' 
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                    : client.membershipLevel === 'En Observación' 
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' 
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                }`}>
                  ★ {client.membershipLevel || 'SOCIO PRODUCTOR'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  CUIT: {client.cuit || 'S/D'}
                </span>
              </div>

              <div className="p-6 flex-1 flex flex-col space-y-6">
                
                {/* CABECERA DE LA ESTRUCTURA */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-800/60 shadow-sm shrink-0">
                      <Building size={26} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight truncate leading-tight" title={client.name}>
                        {client.name}
                      </h3>
                      <p className="text-[10px] uppercase font-black text-hemp-600 dark:text-hemp-400 tracking-wider mt-0.5 truncate">
                        Titular: {client.contactName || 'Socio Responsable'}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center space-x-1 shrink-0">
                      <button 
                        onClick={() => handleOpenStructureModal(client)}
                        className="p-2 text-slate-400 hover:text-hemp-600 dark:hover:text-hemp-400 bg-slate-50 dark:bg-slate-800 rounded-xl transition"
                        title="Editar Estructura"
                      >
                        <Edit2 size={16} />
                      </button>
                      {isSuperAdmin && (
                        <button 
                          onClick={() => { if(window.confirm(`¿Eliminar la estructura "${client.name}"? Los operarios serán desvinculados.`)) deleteClient(client.id); }}
                          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-slate-50 dark:bg-slate-800 rounded-xl transition"
                          title="Eliminar Estructura"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* CAMPO / ESTABLECIMIENTO ASOCIADO */}
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 tracking-wider flex items-center">
                      <Tractor size={14} className="mr-1.5 text-emerald-600" /> Campo Asociado (Acceso Exclusivo)
                    </span>
                    <span className="text-[9px] font-mono bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                      {structurePlots.length} Lotes Activos
                    </span>
                  </div>

                  {associatedLocation ? (
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                        {associatedLocation.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center">
                        <MapPin size={12} className="mr-1 text-slate-400 shrink-0" />
                        {associatedLocation.city || associatedLocation.province}, {associatedLocation.province} • {associatedLocation.capacityHa || client.totalHectares || 0} Hectáreas
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                        <span>🔒 Acceso restringido al personal de esta estructura</span>
                        <a href={`#/locations?search=${encodeURIComponent(associatedLocation.name)}`} className="hover:underline flex items-center font-black">
                          Ver Campo <ArrowUpRight size={12} className="ml-0.5" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-center">
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-bold flex items-center justify-center">
                        <AlertTriangle size={14} className="mr-1.5 text-amber-500" /> Sin campo vinculado aún
                      </p>
                      <button 
                        onClick={() => handleOpenStructureModal(client)}
                        className="mt-2 text-[10px] font-black uppercase tracking-wider text-hemp-600 dark:text-hemp-400 hover:underline"
                      >
                        + Vincular Establecimiento
                      </button>
                    </div>
                  )}
                </div>

                {/* OPERARIOS Y ROLES EN LA ESTRUCTURA */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center">
                      <Users size={14} className="mr-1.5 text-slate-400" /> Operarios de la Estructura ({team.length})
                    </span>
                    <button 
                      onClick={() => {
                        handleOpenStructureModal(client);
                        setActiveModalTab('operators');
                      }}
                      className="text-[10px] font-black uppercase text-hemp-600 dark:text-hemp-400 hover:underline flex items-center"
                    >
                      <UserPlus size={12} className="mr-1" /> + Incluir
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {team.length === 0 ? (
                      <div className="p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <p className="text-xs text-slate-400 italic">No hay operarios asignados a esta estructura.</p>
                      </div>
                    ) : (
                      team.map(member => {
                        const roleInfo = member.structureRole ? STRUCTURE_ROLES_INFO[member.structureRole] : null;
                        const roleLabel = roleInfo ? roleInfo.shortLabel : member.role.toUpperCase();
                        const badgeStyle = roleInfo ? roleInfo.badgeClass : 'bg-slate-100 text-slate-700';

                        return (
                          <div 
                            key={member.id} 
                            className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <img 
                                src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} 
                                alt={member.name} 
                                className="w-8 h-8 rounded-full border border-white dark:border-slate-800 object-cover shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 dark:text-white truncate leading-tight">
                                  {member.name}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {member.email}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${badgeStyle}`}>
                                {roleLabel}
                              </span>
                              <button 
                                onClick={() => handleResendInvitation(member, client)}
                                disabled={isDispatchingInvite}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                                title="Reenviar invitación de acceso por correo desde notificaciones@hempc.com.ar"
                              >
                                <Send size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* BOTÓN INFERIOR DE GESTIÓN */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => handleOpenStructureModal(client)}
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-hemp-600 dark:hover:bg-hemp-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center transition shadow-md hover:scale-[1.01]"
                  >
                    <Users size={15} className="mr-2"/> Administrar Estructura & Operarios
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* MODAL MAESTRO: ADMINISTRAR ESTRUCTURA, CAMPO Y OPERARIOS           */}
      {/* =================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[36px] max-w-5xl w-full p-8 shadow-2xl my-auto animate-in zoom-in-95 border border-white/10 flex flex-col max-h-[92vh]">
            
            {/* ENCABEZADO DEL MODAL */}
            <div className="flex justify-between items-center pb-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center space-x-3.5">
                <div className="bg-hemp-600 text-white p-3 rounded-2xl shadow-md">
                  <Building size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">
                    {editingId ? 'Administrar Estructura:' : 'Alta de Estructura:'} <span className="text-hemp-600">{formData.name || 'Nueva'}</span>
                  </h2>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Asignación de campo asociado y dotación de operarios con roles diferenciados
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { if(!isSaving) setIsModalOpen(false); }} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            {/* PESTAÑAS DEL MODAL */}
            <div className="flex space-x-2 my-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setActiveModalTab('info')}
                className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-2xl transition border-b-2 flex items-center ${
                  activeModalTab === 'info'
                    ? 'border-hemp-600 text-hemp-600 dark:text-hemp-400 bg-slate-50 dark:bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Building size={14} className="mr-2" /> Ficha de la Estructura & Campo
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('operators')}
                className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-2xl transition border-b-2 flex items-center ${
                  activeModalTab === 'operators'
                    ? 'border-hemp-600 text-hemp-600 dark:text-hemp-400 bg-slate-50 dark:bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Users size={14} className="mr-2" /> Inclusión de Operarios & Roles ({formData.teamUserIds?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('audit')}
                className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-2xl transition border-b-2 flex items-center ${
                  activeModalTab === 'audit'
                    ? 'border-hemp-600 text-hemp-600 dark:text-hemp-400 bg-slate-50 dark:bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Send size={14} className="mr-2" /> Auditoría de Mails
              </button>
            </div>

            {/* CONTENIDO DE LAS PESTAÑAS */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar py-2">
              
              {/* TAB 1: FICHA Y CAMPO ASOCIADO */}
              {activeModalTab === 'info' && (
                <form onSubmit={handleSubmitStructure} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">Razón Social / Nombre de la Estructura *</label>
                        <input 
                          required 
                          type="text" 
                          className={inputClass} 
                          value={formData.name} 
                          onChange={e => setFormData({...formData, name: e.target.value})} 
                          placeholder="Ej: Consorcio Pergamino Verde"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">Escala Productiva</label>
                          <select 
                            className={inputClass} 
                            value={formData.type} 
                            onChange={e => setFormData({...formData, type: e.target.value as RoleType})}
                          >
                            <option value="Productor Pequeño (0-5 ha)">Pequeño (0-5 ha)</option>
                            <option value="Productor Mediano (5-15 ha)">Mediano (5-15 ha)</option>
                            <option value="Productor Grande (>20 ha)">Grande (&gt;20 ha)</option>
                            <option value="Empresa Privada">Empresa Privada</option>
                            <option value="ONG/Cooperativa">Cooperativa Asociada</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">Membresía</label>
                          <select 
                            className={inputClass} 
                            value={formData.membershipLevel} 
                            onChange={e => setFormData({...formData, membershipLevel: e.target.value as MembershipLevel})}
                          >
                            <option value="Activo">Socio Activo</option>
                            <option value="Premium">Socio Premium</option>
                            <option value="En Observación">En Observación</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">CUIT / Identificación Fiscal</label>
                          <input 
                            type="text" 
                            className={inputClass} 
                            value={formData.cuit} 
                            onChange={e => setFormData({...formData, cuit: e.target.value})} 
                            placeholder="30-xxxxxxxx-x"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">Superficie Total (Ha)</label>
                          <input 
                            type="number" 
                            className={inputClass} 
                            value={formData.totalHectares} 
                            onChange={e => setFormData({...formData, totalHectares: Number(e.target.value)})} 
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">Dirección Postal / Catastral</label>
                        <input 
                          type="text" 
                          className={inputClass} 
                          value={formData.address} 
                          onChange={e => setFormData({...formData, address: e.target.value})} 
                          placeholder="Ruta Nac. 8 Km 224, Pergamino"
                        />
                      </div>
                    </div>

                    {/* VINCULACIÓN DE CAMPO / ESTABLECIMIENTO ASOCIADO */}
                    <div className="space-y-4">
                      <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-5 rounded-3xl border border-emerald-200 dark:border-emerald-800/60">
                        <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-black text-xs uppercase tracking-wider mb-2">
                          <Tractor size={16} />
                          <span>Campo / Establecimiento Asociado</span>
                        </div>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mb-3 leading-relaxed">
                          Seleccione el campo físico al cual tendrá acceso exclusivo la estructura. Los operarios aquí asignados sólo podrán ver las parcelas y labores de este campo.
                        </p>
                        
                        <select 
                          className={`${inputClass} border-emerald-300 dark:border-emerald-700 font-bold`}
                          value={formData.locationId || ''} 
                          onChange={e => {
                            const selectedLocId = e.target.value;
                            const loc = locations.find(l => l.id === selectedLocId);
                            setFormData({
                              ...formData, 
                              locationId: selectedLocId,
                              lat: loc?.coordinates?.lat?.toString() || formData.lat,
                              lng: loc?.coordinates?.lng?.toString() || formData.lng
                            });
                          }}
                        >
                          <option value="">-- Seleccionar Campo de la Cooperativa --</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name} ({loc.province} • {loc.capacityHa || 0} Ha)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">Titular / Contacto Responsable</label>
                          <input 
                            type="text" 
                            className={inputClass} 
                            value={formData.contactName} 
                            onChange={e => setFormData({...formData, contactName: e.target.value})} 
                            placeholder="Nombre y Apellido"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">Teléfono / WhatsApp</label>
                          <input 
                            type="text" 
                            className={inputClass} 
                            value={formData.contactPhone} 
                            onChange={e => setFormData({...formData, contactPhone: e.target.value})} 
                            placeholder="+54 9 2477 ..."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">Correo Electrónico de la Estructura</label>
                        <input 
                          type="email" 
                          className={inputClass} 
                          value={formData.email} 
                          onChange={e => setFormData({...formData, email: e.target.value})} 
                          placeholder="contacto@organizacion.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      type="submit" 
                      disabled={isSaving}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg transition"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                      Guardar Ficha de la Estructura
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: INCLUSIÓN DE OPERARIOS & ROLES */}
              {activeModalTab === 'operators' && (
                <div className="space-y-8">
                  
                  {/* FORMULARIO DE ALTA E INCLUSIÓN DE OPERARIO */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-inner">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center">
                          <UserPlus size={18} className="mr-2 text-hemp-600" /> Incorporar Nuevo Operario a la Estructura
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          El operario tendrá acceso únicamente al campo asociado: <strong>{locations.find(l => l.id === formData.locationId)?.name || 'Campo Asignado'}</strong>.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                        Remitente: notificaciones@hempc.com.ar
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">Nombre y Apellido *</label>
                        <input 
                          type="text" 
                          className={inputClass} 
                          placeholder="Ej: Marcelo Gomez"
                          value={newOperatorData.name} 
                          onChange={e => setNewOperatorData({...newOperatorData, name: e.target.value})} 
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">Correo de Acceso (Email) *</label>
                        <input 
                          type="email" 
                          className={inputClass} 
                          placeholder="operario@campo.com"
                          value={newOperatorData.email} 
                          onChange={e => setNewOperatorData({...newOperatorData, email: e.target.value})} 
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">Rol en la Estructura *</label>
                        <select 
                          className={inputClass}
                          value={newOperatorData.structureRole} 
                          onChange={e => setNewOperatorData({...newOperatorData, structureRole: e.target.value as StructureRole})}
                        >
                          <option value="propietario">Propietario / Titular</option>
                          <option value="encargado">Encargado General / Capataz</option>
                          <option value="agronomo">Ing. Agrónomo / Asesor Técnico</option>
                          <option value="operario">Operario de Maquinaria / Riego</option>
                          <option value="monitoreador">Monitoreador de Ensayos / Plagas</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">Cargo / Puesto Operativo</label>
                        <input 
                          type="text" 
                          className={inputClass} 
                          placeholder="Ej: Tractorista & Aplicador"
                          value={newOperatorData.jobTitle} 
                          onChange={e => setNewOperatorData({...newOperatorData, jobTitle: e.target.value})} 
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">Teléfono / WhatsApp</label>
                        <input 
                          type="text" 
                          className={inputClass} 
                          placeholder="+54 9 2477 123456"
                          value={newOperatorData.phone} 
                          onChange={e => setNewOperatorData({...newOperatorData, phone: e.target.value})} 
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block">Contraseña Temporal *</label>
                          <button 
                            type="button" 
                            onClick={() => setNewOperatorData({...newOperatorData, password: generatePassword()})}
                            className="text-[9px] font-bold text-hemp-600 hover:underline"
                          >
                            Regenerar
                          </button>
                        </div>
                        <input 
                          type="text" 
                          className={`${inputClass} font-mono`} 
                          value={newOperatorData.password} 
                          onChange={e => setNewOperatorData({...newOperatorData, password: e.target.value})} 
                        />
                      </div>
                    </div>

                    {/* DESCRIPCIÓN DEL ROL SELECCIONADO */}
                    <div className="mt-4 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-900 dark:text-white mr-2">Alcance del Rol:</strong>
                        {STRUCTURE_ROLES_INFO[newOperatorData.structureRole]?.description}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${STRUCTURE_ROLES_INFO[newOperatorData.structureRole]?.badgeClass}`}>
                        {STRUCTURE_ROLES_INFO[newOperatorData.structureRole]?.shortLabel}
                      </span>
                    </div>

                    {/* TOGGLE Y BOTÓN DE INCLUSIÓN */}
                    <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                        <input 
                          type="checkbox" 
                          checked={newOperatorData.sendEmailNotification} 
                          onChange={e => setNewOperatorData({...newOperatorData, sendEmailNotification: e.target.checked})}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <span>Enviar invitación y credenciales de acceso por correo desde <strong>notificaciones@hempc.com.ar</strong></span>
                      </label>

                      <button 
                        type="button" 
                        onClick={handleAddOperatorToStructure}
                        disabled={isDispatchingInvite}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center shadow-md transition disabled:opacity-50"
                      >
                        {isDispatchingInvite ? <Loader2 size={16} className="animate-spin mr-2" /> : <UserPlus size={16} className="mr-2" />}
                        Dar de Alta Operario e Invitar
                      </button>
                    </div>
                  </div>

                  {/* LISTA DE OPERARIOS ACTUALES DE LA ESTRUCTURA */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      Dotación de Operarios Asignados ({formData.teamUserIds?.length || 0})
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(formData.teamUserIds || []).map(userId => {
                        const member = usersList.find(u => u.id === userId);
                        if (!member) return null;

                        const roleInfo = member.structureRole ? STRUCTURE_ROLES_INFO[member.structureRole] : STRUCTURE_ROLES_INFO.operario;

                        return (
                          <div 
                            key={member.id} 
                            className="bg-white dark:bg-slate-950 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3 min-w-0">
                                <img 
                                  src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`} 
                                  alt={member.name} 
                                  className="w-10 h-10 rounded-full border-2 border-emerald-500 object-cover shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">{member.name}</p>
                                  <p className="text-xs text-slate-400 truncate">{member.email}</p>
                                  <p className="text-[10px] text-slate-500">{member.jobTitle || 'Operario de Campo'}</p>
                                </div>
                              </div>

                              <button 
                                onClick={() => handleUnbindOperator(member.id)}
                                className="text-slate-400 hover:text-red-500 p-1"
                                title="Desvincular operario de la estructura"
                              >
                                <X size={16} />
                              </button>
                            </div>

                            {/* SELECTOR DE ROL DENTRO DE LA ESTRUCTURA */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                                <span className="text-[9px] font-black uppercase text-slate-400 shrink-0">Rol:</span>
                                <select 
                                  className="text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1 outline-none dark:text-white truncate"
                                  value={member.structureRole || 'operario'}
                                  onChange={e => handleUpdateOperatorRole(member.id, e.target.value as StructureRole)}
                                >
                                  <option value="propietario">Propietario</option>
                                  <option value="encargado">Capataz</option>
                                  <option value="agronomo">Ing. Agrónomo</option>
                                  <option value="operario">Operario Maquinaria</option>
                                  <option value="monitoreador">Monitoreador</option>
                                </select>
                              </div>

                              <button 
                                onClick={() => handleResendInvitation(member, formData as Client)}
                                disabled={isDispatchingInvite}
                                className="bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center transition"
                                title="Enviar credenciales por correo desde notificaciones@hempc.com.ar"
                              >
                                <Send size={12} className="mr-1" /> Reenviar Mail
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 3: AUDITORÍA DE ENVÍOS DE CORREO */}
              {activeModalTab === 'audit' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">Registro de Correos Despachados</h4>
                      <p className="text-xs text-slate-400">Historial de invitaciones y alertas emitidas desde notificaciones@hempc.com.ar</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {getEmailAuditLog().length} Registros
                    </span>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {getEmailAuditLog().length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8 italic">No hay registros de correo despachados aún.</p>
                    ) : (
                      getEmailAuditLog().map(entry => (
                        <div key={entry.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-black text-slate-900 dark:text-white">{entry.subject}</p>
                            <p className="text-[10px] text-slate-400">
                              Destino: <strong>{entry.toName}</strong> ({entry.toEmail}) • Vía: {entry.deliveredVia}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                              {entry.status.toUpperCase()}
                            </span>
                            <p className="text-[9px] text-slate-400 mt-1">
                              {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* PIE DEL MODAL */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-slate-400 font-mono">
                HempC Nucleus • Módulo de Gestión de Socios y Recursos Humanos
              </span>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="bg-slate-900 dark:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-700 transition"
              >
                Cerrar Panel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL PARA PROBAR DESPACHO DE CORREO (TEST NOTIFICACIONES)         */}
      {/* =================================================================== */}
      {showTestEmailModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] max-w-xl w-full p-6 md:p-8 shadow-2xl border border-white/10 animate-in zoom-in-95 my-8">
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                  <Send size={22} />
                  <h3 className="text-xl font-black uppercase tracking-tight">Servicio de Notificaciones HempC</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configuración oficial SMTP y prueba de despacho para <strong>notificaciones@hempc.com.ar</strong>
                </p>
              </div>
              <button 
                onClick={() => setShowTestEmailModal(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* FICHA TÉCNICA DE CONFIGURACIÓN DEL SERVIDOR */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Parámetros del Servidor</span>
                <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold">
                  hempc.com.ar • STARTTLS / SSL
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Servidor SMTP</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">mail.hempc.com.ar</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Puertos SMTP</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">2525 (Cloud) / 587 / 465</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">IMAP (Recepción)</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">143 / 993 (SSL)</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Sieve Filter</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Puerto 4190</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Remitente Oficial: <strong className="text-slate-800 dark:text-slate-200 font-mono">notificaciones@hempc.com.ar</strong></span>
                <span className="text-[10px] text-emerald-600 font-medium">Backend: https://hempapp.onrender.com</span>
              </div>
            </div>

            {/* SECCIÓN: IMPACTO DE CONTRASEÑA SIN PUBLICAR EN GIT */}
            <div className="mb-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
              <div className="flex items-start justify-between cursor-pointer" onClick={() => setShowPasswordGuide(!showPasswordGuide)}>
                <div className="flex items-center space-x-2.5">
                  <ShieldAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">
                      ¿Cómo impactar la contraseña sin subirla a Git?
                    </h4>
                    <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 mt-0.5">
                      Las credenciales nunca deben comitearse en el repositorio de código.
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="text-amber-600 dark:text-amber-400 text-xs font-bold underline shrink-0 ml-2"
                >
                  {showPasswordGuide ? 'Ocultar' : 'Ver Guía Paso a Paso'}
                </button>
              </div>

              {showPasswordGuide && (
                <div className="mt-3 pt-3 border-t border-amber-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed animate-in fade-in">
                  <p>
                    <strong>1. En Producción (Render / Cloud Backend):</strong><br />
                    Acceda a <a href="https://dashboard.render.com" target="_blank" rel="noreferrer" className="text-emerald-500 underline font-semibold">dashboard.render.com</a> &rarr; Seleccione el servicio <strong>hempapp</strong> &rarr; Ingrese a la pestaña <strong>Environment</strong> &rarr; Click en <strong>Add Environment Variable</strong>:
                  </p>
                  <ul className="list-disc pl-5 font-mono text-[11px] space-y-1 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
                    <li><strong>SMTP_HOST</strong>: mail.hempc.com.ar</li>
                    <li><strong>SMTP_PORT</strong>: 2525 (o 587 / 465)</li>
                    <li><strong>SMTP_USER</strong>: notificaciones@hempc.com.ar</li>
                    <li><strong>SMTP_PASSWORD</strong>: [La contraseña de la casilla]</li>
                    <li><strong>SMTP_FROM</strong>: notificaciones@hempc.com.ar</li>
                  </ul>
                  <p className="text-[11px] text-slate-500">
                    Render inyecta la contraseña directamente en las variables de entorno del servidor en memoria (<code className="font-mono">os.getenv("SMTP_PASSWORD")</code>) al compilar y reiniciar, sin escribirla en ningún commit ni archivo rastreado por Git.
                  </p>
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-[11px] text-rose-700 dark:text-rose-300">
                    <strong>⚠️ AVISO TÉCNICO DE PUERTOS EN RENDER FREE:</strong><br />
                    Render bloquea el tráfico de salida en puertos 25, 465 y 587 en su <em>plan gratuito</em> para mitigar spam. Cuando se intenta enviar por SMTP desde Render Free, la conexión da <code className="font-mono">timed out</code> y se conmuta a modo simulado. Para envíos reales hacia Gmail, se debe cambiar la instancia de Render a plan <strong>Starter ($7/mes)</strong> que habilita los puertos SMTP salientes, o habilitar el puerto alternativo <strong>2525</strong> en Postfix.
                  </div>
                  <p>
                    <strong>2. En Desarrollo Local:</strong><br />
                    Cree o edite el archivo <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">.env</code> en la raíz. El archivo ya está protegido y excluido en <code className="font-mono">.gitignore</code>, por lo que Git nunca lo subirá.
                  </p>
                </div>
              )}
            </div>

            {/* FORMULARIO DE ENVÍO DE PRUEBA */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">
                  Dirección de Correo para Prueba de Recepción
                </label>
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    className={inputClass} 
                    value={testEmailInput}
                    onChange={e => setTestEmailInput(e.target.value)}
                    placeholder="ej: tu_correo@gmail.com o nombre@hempc.com.ar"
                  />
                  <button 
                    type="button" 
                    onClick={handleSendTestEmail}
                    disabled={isSendingTest || !testEmailInput}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center shadow-lg transition disabled:opacity-50 shrink-0 hover:scale-[1.02]"
                  >
                    {isSendingTest ? <Loader2 size={16} className="animate-spin mr-2" /> : <Send size={14} className="mr-2" />}
                    Enviar Mail
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
                  Se despachará una plantilla oficial HTML de bienvenida y credenciales para comprobar la entrega inmediata en su bandeja.
                </p>
              </div>

              {/* DÓNDE MÁS PROBAR */}
              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-3.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-black uppercase tracking-wider text-[10px] text-emerald-600 dark:text-emerald-400 block mb-1">
                  ¿Dónde más puedo probar y utilizar los correos?
                </span>
                <p className="text-[11px] leading-relaxed">
                  1. <strong>En cualquier Estructura Productiva:</strong> Haga click en <em>"Gestionar Estructura"</em> &rarr; pestaña <strong>"Operarios & Invitaciones"</strong> &rarr; <em>"Incorporar Nuevo Operario"</em>. Al tildar <em>"Enviar notificación de bienvenida y credenciales"</em>, se envía la invitación real al correo del operario.<br />
                  2. <strong>En la pestaña "Auditoría de Envíos":</strong> Podrá ver el registro histórico de cada correo despachado desde <strong className="font-mono">notificaciones@hempc.com.ar</strong> con su estado y reintentar despachos.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowTestEmailModal(false)}
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
