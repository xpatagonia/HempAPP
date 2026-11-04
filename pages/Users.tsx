import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { User, UserRole, StructureRole, Client, SupplierActorRole } from "../types";
import { 
  Plus, Trash2, Edit2, Shield, Wrench, Eye, EyeOff, AlertCircle, Lock, Key, 
  Save, Loader2, Phone, Briefcase, User as UserIcon, CloudOff, Link as LinkIcon, 
  UserCheck, Building, X, Sparkles, PlusCircle, Star, Search, Filter, FilterX,
  Send, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Users as UsersIcon,
  Sprout, MapPin, Globe, Truck, Camera, FileText, Download, CreditCard, ZoomIn
} from "lucide-react";
import jsPDF from "jspdf";
import { 
  sendUserProfileWelcomeEmail, 
  sendPasswordResetEmail,
  sendRegistrationApprovedEmail,
  EmailDispatchResult 
} from "../src/services/emailNotificationService";
import { downloadUnDiaDeSiembraProgramPDF } from "../src/services/eventProgramPdfService";
import {
  getUserAccessAudit,
  STRUCTURE_ROLES,
  SUPPLIER_ACTOR_ROLES,
  SUPPLIER_ACTOR_ROLES_INFO,
  doesPlotBelongToSupplier
} from "../src/utils/structurePermissions";

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
  const navigate = useNavigate();
  const {
    usersList, addUser, updateUser, deleteUser, currentUser,
    clients, allClients, allLocations, allPlots, addClient,
    suppliers, varieties, seedBatches,
    startImpersonation, stopImpersonation, impersonatingAdmin
  } = useAppContext();

  const effectiveClients = allClients && allClients.length > 0 ? allClients : clients;

  // Estados de búsqueda y filtro
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showAuditMatrix, setShowAuditMatrix] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordInModal, setShowPasswordInModal] = useState(false);
  const [sendEmailOnSave, setSendEmailOnSave] = useState(true);

  // Estados para acciones por fila (envío de email o reseteo)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [isResettingUser, setIsResettingUser] = useState(false);
  const [userActionToast, setUserActionToast] = useState<{ show: boolean; success: boolean; message: string } | null>(null);
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
    supplierId: "",
    supplierActorRole: "director_tecnico_obtentor",
    isNetworkMember: false,
    dniNumber: "",
    dniFrenteUrl: "",
    dniDorsoUrl: "",
    dniVerified: false
  });
  const [entityLinkMode, setEntityLinkMode] = useState<"client" | "supplier" | "none">("client");
  const [isCompressingDni, setIsCompressingDni] = useState<"frente" | "dorso" | null>(null);
  const [dniPreviewUser, setDniPreviewUser] = useState<Partial<User> | null>(null);

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isAdmin = currentUser?.role === "admin" || isSuperAdmin;

  const compressDniImageToDataUrl = (file: File, maxDimension = 1280, quality = 0.78): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("No se pudo leer la imagen del DNI."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Formato de imagen inválido."));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(String(reader.result || ""));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDniPhotoSelect = async (side: "frente" | "dorso", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingDni(side);
    try {
      const compressed = await compressDniImageToDataUrl(file);
      const todayIso = new Date().toISOString().split("T")[0];
      setFormData(prev => ({
        ...prev,
        ...(side === "frente" ? { dniFrenteUrl: compressed } : { dniDorsoUrl: compressed }),
        dniUpdatedAt: todayIso
      }));
    } catch (err: any) {
      setUserActionToast({
        show: true,
        success: false,
        message: err?.message || "No se pudo procesar la foto del DNI."
      });
    } finally {
      setIsCompressingDni(null);
      e.target.value = "";
    }
  };

  const handleDownloadUserDniPdf = (targetUser: Partial<User>) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("LEGAJO DE IDENTIDAD COMPLEMENTARIA — DNI FRENTE Y DORSO", 14, 14);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("RED COOPERATIVA HEMPC / NUCLEUS TRACE · AUDITORÍA DOCUMENTAL DE SOCIOS Y OPERADORES", 14, 21);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString("es-AR")} · N° Documento: ${targetUser.dniNumber || "S/D"}`, 14, 27);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Titular / Usuario: ${targetUser.name || "Sin Nombre"}`, 14, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`Correo Electrónico: ${targetUser.email || "-"}   |   Rol: ${targetUser.role || "-"}   |   Cargo: ${targetUser.jobTitle || "-"}`, 14, 48);
    doc.text(`Organización / Establecimiento: ${targetUser.organizationName || "Red Cooperativa Nucleus"}`, 14, 54);
    doc.text(`Estado de Validación DNI: ${targetUser.dniFrenteUrl && targetUser.dniDorsoUrl ? "LEGAJO COMPLETO (FRENTE Y DORSO)" : "INCOMPLETO"}`, 14, 60);

    doc.setDrawColor(203, 213, 225);
    doc.line(14, 64, 196, 64);

    // Frente
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("1. FOTOGRAFÍA DNI — ANVERSO (FRENTE)", 14, 72);
    doc.rect(14, 75, 135, 85);
    if (targetUser.dniFrenteUrl) {
      try {
        doc.addImage(targetUser.dniFrenteUrl, "JPEG", 16, 77, 131, 81);
      } catch {
        doc.setFont("helvetica", "italic");
        doc.text("Imagen adjunta disponible en el sistema.", 20, 115);
      }
    } else {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text("Sin captura de DNI Frente registrada.", 24, 118);
      doc.setTextColor(15, 23, 42);
    }

    // Dorso
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("2. FOTOGRAFÍA DNI — REVERSO (DORSO)", 14, 172);
    doc.rect(14, 175, 135, 85);
    if (targetUser.dniDorsoUrl) {
      try {
        doc.addImage(targetUser.dniDorsoUrl, "JPEG", 16, 177, 131, 81);
      } catch {
        doc.setFont("helvetica", "italic");
        doc.text("Imagen adjunta disponible en el sistema.", 20, 215);
      }
    } else {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text("Sin captura de DNI Dorso registrada.", 24, 218);
      doc.setTextColor(15, 23, 42);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Documento confidencial respaldado en la Bóveda Documental de Trazabilidad HempC (Cumplimiento ARICCAME / INASE).", 14, 278);

    const safeName = String(targetUser.name || "usuario").replace(/[^a-zA-Z0-9_-]/g, "_");
    doc.save(`Legajo_DNI_${safeName}.pdf`);
  };

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

  // Matriz de Auditoría de Aislamiento por Establecimiento o Semillero para cada usuario
  const userAuditMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getUserAccessAudit>>();
    usersList.forEach(u => {
      map.set(
        u.id,
        getUserAccessAudit(
          u,
          allLocations || [],
          allPlots || [],
          effectiveClients || [],
          [],
          suppliers || [],
          varieties || [],
          seedBatches || []
        )
      );
    });
    return map;
  }, [usersList, allPlots, allLocations, effectiveClients, suppliers, varieties, seedBatches]);

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
    setFormData({
      ...user,
      password: "",
      clientId: user.clientId || "",
      supplierId: user.supplierId || "",
      supplierActorRole: user.supplierActorRole || "director_tecnico_obtentor"
    });
    setEntityLinkMode(user.supplierId ? "supplier" : user.clientId ? "client" : "none");
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
      const isLinkingSupplier =
        (formData.role === "client" || formData.role === "technician" || formData.role === "viewer") &&
        entityLinkMode === "supplier" &&
        Boolean(formData.supplierId);
      const isLinkingClient =
        (formData.role === "client" || formData.role === "technician" || formData.role === "viewer") &&
        entityLinkMode === "client" &&
        Boolean(formData.clientId);

      const matchedClient = isLinkingClient ? effectiveClients.find(c => c.id === formData.clientId) : undefined;
      const matchedSupplier = isLinkingSupplier ? (suppliers || []).find(s => s.id === formData.supplierId) : undefined;

      const payload: Partial<User> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role as UserRole,
        structureRole: formData.structureRole || (
          isLinkingSupplier ? "agronomo" :
          formData.role === "client" ? "propietario" :
          formData.role === "technician" ? "encargado" : "monitoreador"
        ),
        organizationName: matchedSupplier
          ? `${matchedSupplier.name} · Proveedor Homologado`
          : matchedClient?.name || formData.organizationName || "Red Cooperativa Nucleus",
        jobTitle: formData.jobTitle || (isLinkingSupplier && formData.supplierActorRole ? SUPPLIER_ACTOR_ROLES_INFO[formData.supplierActorRole]?.label : ""),
        phone: formData.phone || "",
        avatar: formData.avatar || PRESET_AVATARS[0],
        clientId: isLinkingClient ? (formData.clientId || null) : null,
        supplierId: isLinkingSupplier ? (formData.supplierId || null) : null,
        supplierActorRole: isLinkingSupplier ? (formData.supplierActorRole || "director_tecnico_obtentor") : undefined,
        memberType: isLinkingSupplier ? "Proveedor_Homologado" : formData.memberType,
        isNetworkMember: formData.isNetworkMember || Boolean(isLinkingClient || isLinkingSupplier),
        dniNumber: formData.dniNumber?.trim() || "",
        dniFrenteUrl: formData.dniFrenteUrl || "",
        dniDorsoUrl: formData.dniDorsoUrl || "",
        dniUpdatedAt: (formData.dniFrenteUrl || formData.dniDorsoUrl) ? (formData.dniUpdatedAt || new Date().toISOString().split("T")[0]) : undefined,
        dniVerified: Boolean(formData.dniVerified)
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
          const orgLabel = matchedSupplier
            ? `${matchedSupplier.name} · Proveedor Homologado (Acceso Aislado a sus Semillas)`
            : matchedClient?.name || "Red Cooperativa Nucleus";
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
              roleName: isLinkingSupplier && formData.supplierActorRole
                ? `${SUPPLIER_ACTOR_ROLES_INFO[formData.supplierActorRole]?.label} (${matchedSupplier?.name})`
                : roleLabels[formData.role || "technician"] || formData.role || "Técnico",
              organizationName: orgLabel,
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
      const supplierName = (suppliers || []).find(s => s.id === user.supplierId)?.name;
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
        roleName: user.supplierId && user.supplierActorRole
          ? `${SUPPLIER_ACTOR_ROLES_INFO[user.supplierActorRole]?.label || user.jobTitle} (${supplierName || 'Proveedor Homologado'})`
          : roleLabels[user.role] || user.role,
        organizationName: supplierName
          ? `${supplierName} · Proveedor Homologado (Acceso Aislado a sus Semillas)`
          : clientName || user.organizationName || "Red Cooperativa Nucleus",
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

  // Confirmar eliminación de usuario
  const handleDeleteUserConfirm = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const ok = await deleteUser(userToDelete.id);
      if (ok) {
        setUserActionToast({
          show: true,
          success: true,
          message: `El usuario "${userToDelete.name}" ha sido eliminado exitosamente del padrón y de la base de datos.`
        });
        setUserToDelete(null);
        setTimeout(() => setUserActionToast(null), 5000);
      } else {
        setUserActionToast({
          show: true,
          success: false,
          message: `No se pudo eliminar el usuario "${userToDelete.name}". Verifique los permisos o si la cuenta está protegida.`
        });
      }
    } catch (err: any) {
      setUserActionToast({
        show: true,
        success: false,
        message: `Error al eliminar el usuario: ${err.message || 'Fallo desconocido'}`
      });
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Confirmar reseteo de contraseña
  const handleResetUserConfirm = async () => {
    if (!userToReset) return;
    setIsResettingUser(true);
    try {
      const charsUpper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
      const charsNums = "23456789";
      let rand = "";
      for (let i = 0; i < 5; i++) rand += charsUpper.charAt(Math.floor(Math.random() * charsUpper.length));
      for (let i = 0; i < 2; i++) rand += charsNums.charAt(Math.floor(Math.random() * charsNums.length));
      const newTempPassword = `HempC-${rand}!`;

      // Actualizar en base de datos
      await updateUser({
        ...userToReset,
        password: newTempPassword
      });

      // Despachar email
      const dispatch = await sendPasswordResetEmail({
        toEmail: userToReset.email,
        toName: userToReset.name,
        tempPassword: newTempPassword,
        actionUrl: window.location.origin
      });

      setEmailToast({
        show: true,
        success: dispatch.success,
        message: dispatch.message,
        sentTo: userToReset.email,
        via: dispatch.deliveredVia
      });
      setUserToReset(null);
    } catch (err: any) {
      setUserActionToast({
        show: true,
        success: false,
        message: "Error al enviar credenciales: " + err.message
      });
    } finally {
      setIsResettingUser(false);
    }
  };

  // Restablecer contraseña y notificar por correo (abre modal)
  const handleResetPasswordAndNotify = (user: User) => {
    setUserToReset(user);
  };

  // Aprobar alta autogestiva (priorizando Visitante o Productor) y despachar enlace para crear contraseña por notificaciones@hempc.com.ar
  const handleApproveSelfRegistration = async (
    targetUser: User,
    approveAs: "visitante" | "productor"
  ) => {
    setActionLoadingId(targetUser.id);
    try {
      const roleAssigned: UserRole = approveAs === "productor" ? "client" : "viewer";
      const roleLabel =
        approveAs === "productor"
          ? "Productor Asociado (Red Cooperativa)"
          : "Visitante / Invitado General";

      const activationToken =
        targetUser.activationToken ||
        `ACT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const hasValidCustomPassword =
        Boolean(targetUser.password) &&
        !String(targetUser.password).startsWith("__PENDING_") &&
        targetUser.passwordPendingSetup !== true;

      const updated: User = {
        ...targetUser,
        role: roleAssigned,
        isNetworkMember: approveAs === "productor",
        memberType: approveAs === "productor" ? "Socio_Productor" : undefined,
        accountStatus: "active",
        activationToken,
        passwordPendingSetup: !hasValidCustomPassword,
        password: hasValidCustomPassword
          ? targetUser.password
          : `__PENDING_APPROVAL_LOCKED_${activationToken}__`,
        approvedBy: currentUser?.name || "Administración Central HempC",
        approvedAt: new Date().toISOString().split("T")[0]
      };

      await updateUser(updated);

      const activationUrl = `${window.location.origin}/#/login?activar=${encodeURIComponent(
        updated.email
      )}&token=${encodeURIComponent(activationToken)}`;

      const dispatch = await sendRegistrationApprovedEmail({
        toEmail: updated.email,
        toName: updated.name,
        roleLabel,
        organizationName: updated.organizationName || "Red Cooperativa HempC",
        ticketCode: updated.eventTicketCode,
        activationToken,
        actionUrl: activationUrl
      });

      setEmailToast({
        show: true,
        success: dispatch.success,
        message: `Alta aprobada como ${roleLabel}. Enlace para crear contraseña enviado a ${updated.email}.`,
        sentTo: updated.email,
        via: dispatch.deliveredVia
      });
    } catch (err: any) {
      setUserActionToast({
        show: true,
        success: false,
        message: `Error al aprobar solicitud: ${err.message || "Fallo desconocido"}`
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSelfRegistration = async (targetUser: User) => {
    setActionLoadingId(targetUser.id);
    try {
      await updateUser({
        ...targetUser,
        accountStatus: "rejected"
      });
      setUserActionToast({
        show: true,
        success: true,
        message: `Solicitud de "${targetUser.name}" marcada como rechazada.`
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingApprovals = useMemo(
    () => usersList.filter(u => u.accountStatus === "pending_approval"),
    [usersList]
  );

  const eventRegisteredUsers = useMemo(
    () => usersList.filter(u => Boolean(u.eventRegistered || u.eventTicketCode)),
    [usersList]
  );

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
              Alta Centralizada & Autogestiva
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gestión institucional de personal, técnicos, productores y acreditaciones al evento "Un Día de Siembra".
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
              supplierId: "",
              supplierActorRole: "director_tecnico_obtentor",
              isNetworkMember: false 
            }); 
            setEntityLinkMode("client");
            setSendEmailOnSave(true);
            setIsModalOpen(true); 
          }} 
          className="w-full md:w-auto bg-[#006633] text-white px-6 py-3 rounded-[20px] flex items-center justify-center hover:bg-[#004d26] transition shadow-xl font-black text-xs uppercase tracking-widest cursor-pointer"
        >
          <Plus size={18} className="mr-2" /> Nuevo Perfil de Acceso
        </button>
      </div>

      {/* PANEL DE APROBACIÓN DE ALTAS AUTOGESTIVAS Y EVENTO "UN DÍA DE SIEMBRA" (SÁB. 21 NOVIEMBRE) */}
      {isAdmin && (
        <div className="mb-8 bg-[#0c2d1e] rounded-2xl sm:rounded-[32px] p-4 sm:p-8 text-white border-l-4 border-amber-500 border border-emerald-800/70 shadow-2xl space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#DDDB00] text-slate-950 text-[10px] font-black uppercase tracking-widest">
                  Sábado 21 de Noviembre • 08:30 a 15:30 hs
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                  Diplomatura UNLZ – UATRE • PatagonianC LTDA
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-white">
                JORNADA OFICIAL: “UN DÍA DE SIEMBRA” & ALTA AUTOGESTIVA
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl">
                Sede Práctica Patagonia: Chacra Experimental PatagonianC LTDA (VIRCH – Trelew, Chubut). Los inscriptos reciben confirmación previa por <strong className="text-[#DDDB00]">notificaciones@hempc.com.ar</strong> (Resend.com) para descargar el Programa Oficial (sujeto a actualización). Desde aquí podés aprobar su alta como <strong>Productor Asociado</strong> o como <strong>Visitante</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-center">
                <span className="text-[10px] uppercase font-black text-amber-300 block">Pendientes de Aprobación</span>
                <span className="text-xl font-black text-white">{pendingApprovals.length}</span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-center">
                <span className="text-[10px] uppercase font-black text-emerald-300 block">Acreditados 21/11</span>
                <span className="text-xl font-black text-[#DDDB00]">{eventRegisteredUsers.length}</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  downloadUnDiaDeSiembraProgramPDF({
                    name: currentUser?.name || "Administración Central HempC",
                    email: currentUser?.email || "notificaciones@hempc.com.ar",
                    ticketCode: "SIEMBRA-21N-OFICIAL",
                    profileLabel: "Dirección & Coordinación General",
                    organizationName: "PatagonianC LTDA • HempC Nucleus",
                    locality: "Patagonia Argentina"
                  })
                }
                className="px-5 py-3.5 bg-[#DDDB00] hover:bg-[#e5e326] text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition cursor-pointer"
              >
                <Download size={16} />
                <span>Descargar Programa Oficial 21/11 (PDF)</span>
              </button>
            </div>
          </div>

          {pendingApprovals.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-300 flex items-center gap-2">
                <AlertCircle size={15} />
                Solicitudes en Sala de Espera ({pendingApprovals.length}) — Requieren tu Aprobación:
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {pendingApprovals.map(u => (
                  <div
                    key={u.id}
                    className="bg-white/5 hover:bg-white/10 border border-white/15 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-sm uppercase text-white">{u.name}</span>
                        {u.eventTicketCode && (
                          <span className="px-2.5 py-0.5 rounded-md bg-[#DDDB00]/20 border border-[#DDDB00]/40 text-[#DDDB00] font-mono text-[11px] font-black">
                            {u.eventTicketCode}
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                          Solicita: {u.requestedProfileType === "productor" ? "Productor" : u.requestedProfileType || "Visitante"}
                        </span>
                        {u.eventConfirmedByEmail && (
                          <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                            ✓ Email Confirmado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300">
                        <strong>Email:</strong> {u.email} • <strong>Tel:</strong> {u.phone || "S/D"} •{" "}
                        <strong>Entidad:</strong> {u.organizationName || "Independiente"} ({u.localityOrProvince || "S/D"})
                        {u.estimatedHectares ? ` • Superficie estimada: ${u.estimatedHectares} ha` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={actionLoadingId === u.id}
                        onClick={() => handleApproveSelfRegistration(u, "visitante")}
                        className="px-4 py-2.5 bg-[#DDDB00] hover:bg-[#e8e638] text-slate-950 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow"
                      >
                        <UserCheck size={14} />
                        <span>Aprobar Visitante (Enviar Link Clave)</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionLoadingId === u.id}
                        onClick={() => handleApproveSelfRegistration(u, "productor")}
                        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <CheckCircle2 size={14} />
                        <span>Aprobar Productor (Enviar Link Clave)</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionLoadingId === u.id}
                        onClick={() => handleRejectSelfRegistration(u)}
                        className="px-3.5 py-2.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 rounded-xl font-black text-[11px] uppercase tracking-wider transition cursor-pointer"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0" />
                <span>
                  No hay solicitudes pendientes de aprobación en este momento. Link directo para compartir en WhatsApp o QR del evento:{' '}
                  <code className="text-[#DDDB00] font-mono font-bold">
                    https://red.hempc.com.ar/#/login?evento=un-dia-de-siembra
                  </code>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOAST DE FEEDBACK DE ENVÍO DE EMAIL */}
      {emailToast && (() => {
        const isRealDelivery = emailToast.via === "vercel_resend" || emailToast.via === "resend_https" || emailToast.via === "smtp";
        return (
          <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between animate-in slide-in-from-top-2 shadow-lg ${
            isRealDelivery
              ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-200"
              : "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200"
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl text-white ${isRealDelivery ? "bg-emerald-600" : "bg-amber-600"}`}>
                {isRealDelivery ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider">
                  {isRealDelivery ? "Notificación de Acceso Despachada (Vercel + Resend.com)" : "Despacho Registrado en Auditoría Local"}
                </p>
                <p className="text-xs opacity-90">{emailToast.message}</p>
                <p className={`text-[10px] font-mono mt-0.5 ${isRealDelivery ? "text-emerald-700 dark:text-emerald-400" : "text-amber-800 dark:text-amber-300"}`}>
                  Remitente: notificaciones@hempc.com.ar • Destino: {emailToast.sentTo} • Vía: {emailToast.via}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setEmailToast(null)} 
              className={`p-1.5 rounded-lg cursor-pointer ${isRealDelivery ? "text-emerald-600 hover:bg-emerald-100" : "text-amber-700 hover:bg-amber-100"}`}
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

      {/* MATRIZ DE AUDITORÍA DE ROLES Y AISLAMIENTO POR ESTABLECIMIENTO */}
      <div className="mb-6 bg-white dark:bg-slate-900 rounded-[28px] border border-emerald-500/30 dark:border-emerald-800/60 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 bg-emerald-950/5 dark:bg-emerald-950/30 border-b border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-sm">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  Matriz de Auditoría de Roles & Aislamiento Multi-Establecimiento
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  Candado Estricto Activo
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verificación en tiempo real de qué establecimientos, sitios y parcelas puede visualizar u operar cada usuario según su rol y socio vinculado.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {impersonatingAdmin && (
              <button
                type="button"
                onClick={() => stopImpersonation()}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-mono font-black uppercase cursor-pointer"
              >
                Restaurar Sesión Admin ({impersonatingAdmin.name})
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAuditMatrix(prev => !prev)}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition cursor-pointer"
            >
              {showAuditMatrix ? "Ocultar Resumen por Establecimiento" : "Ver Resumen por Establecimiento"}
            </button>
          </div>
        </div>

        {showAuditMatrix && (
          <div className="p-4 sm:p-5 space-y-5 bg-slate-50/50 dark:bg-slate-950/40">
            {/* SUBSECCIÓN 1: ESTABLECIMIENTOS SOCIOS DE LA RED (INTACTOS) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Building size={13} />
                  <span>1. Aislamiento por Establecimiento Socio de la Red ({effectiveClients.length} Socios)</span>
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
                {effectiveClients.map(client => {
                  const clientLocs = (allLocations || []).filter(l => l.clientId === client.id);
                  const clientLocIds = new Set(clientLocs.map(l => l.id));
                  const clientPlots = (allPlots || []).filter(p => clientLocIds.has(p.locationId));
                  const assignedUsers = usersList.filter(u => String(u.clientId) === String(client.id));
                  return (
                    <div
                      key={client.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[9px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
                              Establecimiento Socio
                            </span>
                            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white leading-snug">
                              {client.name}
                            </h3>
                          </div>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                            {clientPlots.length} Parcelas
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <MapPin size={12} className="text-emerald-500 shrink-0" />
                          <span className="truncate">
                            {clientLocs.map(l => `${l.name} (${l.city})`).join(", ") || "Sin sitio"}
                          </span>
                        </div>

                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                          <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block">
                            Usuarios con Acceso Exclusivo ({assignedUsers.length}):
                          </span>
                          {assignedUsers.length === 0 ? (
                            <p className="text-[10px] font-mono text-slate-400 italic">
                              Gestionado por Dirección Central (Admin)
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {assignedUsers.map(au => (
                                <div
                                  key={au.id}
                                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60"
                                >
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 truncate">
                                      {au.name}
                                    </p>
                                    <p className="text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                                      {au.role === "client" ? "Titular / Productor" : "Técnico / Encargado"} · {au.jobTitle || au.role}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      startImpersonation(au.id);
                                      navigate("/plots");
                                    }}
                                    title={`Auditar vista aislada de ${au.name} (${clientPlots.length} parcelas)`}
                                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-mono font-black uppercase shrink-0 cursor-pointer"
                                  >
                                    Simular
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Aislamiento: Estricto</span>
                        <span className="font-bold text-slate-600 dark:text-slate-300 truncate max-w-[160px]">
                          {clientPlots.slice(0, 2).map(p => p.name).join(", ")}
                          {clientPlots.length > 2 ? ` +${clientPlots.length - 2}` : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SUBSECCIÓN 2: AISLAMIENTO POR SEMILLERO / PROVEEDOR HOMOLOGADO (ACCESO EXCLUSIVO A PARCELAS CON SU SEMILLA) */}
            <div className="space-y-2.5 pt-3 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Sprout size={13} />
                  <span>2. Aislamiento por Semillero / Proveedor Homologado (Acceso Exclusivo a Parcelas con su Semilla)</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Los usuarios de un semillero ven únicamente los lotes implantados con su genética
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {(suppliers || []).map(sup => {
                  const supVarieties = (varieties || []).filter(v => String(v.supplierId) === String(sup.id));
                  const supPlots = (allPlots || []).filter(p =>
                    doesPlotBelongToSupplier(sup.id, p, varieties || [], seedBatches || [])
                  );
                  const supUsers = usersList.filter(u => String(u.supplierId) === String(sup.id));
                  if (supPlots.length === 0 && supUsers.length === 0) return null;

                  return (
                    <div
                      key={sup.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300/70 dark:border-amber-800/70 flex flex-col justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[9px] font-mono font-bold uppercase text-amber-600 dark:text-amber-400 block">
                              Semillero / Proveedor Homologado
                            </span>
                            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white leading-snug">
                              {sup.name}
                            </h3>
                          </div>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-black bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                            {supPlots.length} Parcelas con su Semilla
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Sprout size={12} className="text-amber-500 shrink-0" />
                          <span className="truncate">
                            Genéticas: <strong>{supVarieties.map(v => v.name).join(", ") || "Insumos SENASA"}</strong>
                          </span>
                        </div>

                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                          <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block">
                            Humanos del Proveedor con Acceso ({supUsers.length}):
                          </span>
                          {supUsers.length === 0 ? (
                            <p className="text-[10px] font-mono text-slate-400 italic">
                              Sin usuarios activos aún (habilitar desde Proveedores)
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {supUsers.map(su => (
                                <div
                                  key={su.id}
                                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60"
                                >
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 truncate">
                                      {su.name}
                                    </p>
                                    <p className="text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase truncate">
                                      {su.jobTitle || "Director Técnico Semillero"} · {su.email}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      startImpersonation(su.id);
                                      navigate("/plots");
                                    }}
                                    title={`Simular vista aislada de ${su.name} (${supPlots.length} parcelas con semilla de ${sup.name})`}
                                    className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[9px] font-mono font-black uppercase shrink-0 cursor-pointer"
                                  >
                                    Simular
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Candado: Por Genética</span>
                        <span className="font-bold text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
                          {supPlots.slice(0, 2).map(p => p.name).join(", ")}
                          {supPlots.length > 2 ? ` +${supPlots.length - 2}` : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TABLA DE USUARIOS Y ACCESOS */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-widest border-b dark:border-slate-800">
              <tr>
                <th className="px-6 py-5">Perfil & Identidad</th>
                <th className="px-6 py-5">Rol & Jerarquía</th>
                <th className="px-6 py-5">Establecimiento Vinculado</th>
                <th className="px-6 py-5">Alcance de Parcelas (Auditoría)</th>
                <th className="px-6 py-5">Legajo DNI (Frente / Dorso)</th>
                <th className="px-6 py-5">Seguridad</th>
                <th className="px-6 py-5 text-right">Gestión & Simulación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-gray-400 italic font-medium">
                    No se encontraron usuarios en el padrón cooperativo.
                  </td>
                </tr>
              ) : filteredUsers.map((user) => {
                const isUserLoading = actionLoadingId === user.id;
                const hasPassword = Boolean(user.password && user.password.trim().length > 0);
                const audit = userAuditMap.get(user.id);
                const isCurrentSimulated = currentUser?.id === user.id && Boolean(impersonatingAdmin);

                return (
                  <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-white/5 group transition-colors ${isCurrentSimulated ? "bg-emerald-50/60 dark:bg-emerald-950/30" : ""}`}>
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
                          <div className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-tight flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {currentUser?.id === user.id && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-emerald-600 text-white uppercase">
                                Sesión Actual
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold lowercase tracking-normal">
                            {user.email}
                          </div>
                          {user.jobTitle && (
                            <span className="text-[9px] text-slate-500 font-medium block">
                              {user.jobTitle}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border inline-block ${
                          user.role === "super_admin" ? "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800" :
                          user.role === "admin" ? "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800" :
                          user.role === "client" ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800" : 
                          user.role === "viewer" ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800" :
                          "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                        }`}>
                          {user.role === "client" ? "Productor / Socio" : user.role === "viewer" ? "Auditor / Visor" : user.role.replace("_", " ")}
                        </div>
                        {audit?.structureRoleLabel && (
                          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            {audit.structureRoleLabel}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Entidad */}
                    <td className="px-6 py-5">
                      {user.supplierId ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center text-gray-800 dark:text-gray-200 font-black text-xs uppercase tracking-tight">
                            <Truck size={14} className="mr-1.5 text-amber-600 shrink-0"/>
                            <span>{(suppliers || []).find(s => s.id === user.supplierId)?.name || user.organizationName || "Semillero Homologado"}</span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800/60">
                            <Sprout size={10} /> Exclusivo Parcelas con su Semilla
                          </span>
                        </div>
                      ) : user.clientId ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center text-gray-800 dark:text-gray-200 font-black text-xs uppercase tracking-tight">
                            <Building size={14} className="mr-1.5 text-emerald-600 shrink-0"/>
                            <span>{effectiveClients.find(c => c.id === user.clientId)?.name || user.organizationName || "Establecimiento Asignado"}</span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                            <Lock size={10} /> Aislado a este Establecimiento
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="text-slate-700 dark:text-slate-300 text-xs uppercase font-black tracking-tight flex items-center gap-1.5">
                            <Globe size={13} className="text-purple-500 shrink-0" />
                            <span>{user.role === "viewer" ? "Auditoría Externa (Solo Lectura)" : "Dirección Central Cooperativa"}</span>
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 block">
                            Alcance Global (4 Establecimientos)
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Alcance de Parcelas */}
                    <td className="px-6 py-5">
                      {audit ? (
                        <div className="space-y-1 max-w-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black ${
                              audit.isolationScope === "PROVEEDOR_SEMILLERO_AISLADO"
                                ? "bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                : audit.isolationScope === "ESTABLECIMIENTO_AISLADO"
                                  ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                  : "bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800"
                            }`}>
                              <Sprout size={10} className="inline mr-1" />
                              {audit.allowedPlotsCount} Parcelas Habilitadas
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({audit.allowedLocationsCount} {audit.allowedLocationsCount === 1 ? "Sitio" : "Sitios"})
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate" title={audit.allowedPlotNames.join(", ")}>
                            {audit.allowedPlotNames.slice(0, 3).join(", ")}
                            {audit.allowedPlotNames.length > 3 ? ` (+${audit.allowedPlotNames.length - 3} más)` : ""}
                          </p>
                        </div>
                      ) : null}
                    </td>

                    {/* Legajo DNI Frente y Dorso */}
                    <td className="px-6 py-5">
                      {(() => {
                        const hasFrente = Boolean(user.dniFrenteUrl);
                        const hasDorso = Boolean(user.dniDorsoUrl);
                        const isComplete = hasFrente && hasDorso;
                        const isPartial = (hasFrente || hasDorso) && !isComplete;
                        return (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-black uppercase border ${
                                isComplete
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                  : isPartial
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                  : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                              }`}>
                                <CreditCard size={11} />
                                {isComplete ? "DNI Completo" : isPartial ? "DNI Parcial" : "Sin DNI"}
                              </span>
                              {user.dniNumber && (
                                <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                                  N° {user.dniNumber}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {(hasFrente || hasDorso) ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setDniPreviewUser(user)}
                                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-200 text-[9px] font-mono font-bold uppercase flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
                                  >
                                    <ZoomIn size={11} className="text-emerald-600" />
                                    <span>Ver Frente/Dorso</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadUserDniPdf(user)}
                                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-mono font-black uppercase flex items-center gap-1 cursor-pointer"
                                    title="Descargar Legajo DNI en PDF"
                                  >
                                    <Download size={10} />
                                    <span>PDF</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleEdit(user)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[9px] font-mono font-black uppercase flex items-center gap-1 cursor-pointer"
                                >
                                  <Camera size={11} />
                                  <span>Cargar DNI Frente/Dorso</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Estado de Credencial */}
                    <td className="px-6 py-5">
                      {hasPassword ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <Lock size={12} /> Activa
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
                        {/* Botón: Auditar / Simular Vista del Usuario */}
                        <button
                          type="button"
                          onClick={() => {
                            startImpersonation(user.id);
                            navigate("/plots");
                          }}
                          title={`Simular sesión como ${user.name} para auditar sus parcelas y permisos`}
                          className="px-2.5 py-1.5 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-600 hover:text-white rounded-xl transition shadow-xs border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 text-[10px] font-mono font-black uppercase cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Auditar Vista</span>
                        </button>

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
                          onClick={() => setUserToDelete(user)} 
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

      {/* TOAST DE ACCIÓN DE USUARIO */}
      {userActionToast && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-4 duration-300">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-3 max-w-md ${
            userActionToast.success 
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : 'bg-red-50 dark:bg-red-950/80 border-red-300 dark:border-red-800 text-red-900 dark:text-red-100'
          }`}>
            {userActionToast.success ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={20} className="text-red-600 shrink-0" />}
            <span className="text-xs font-bold">{userActionToast.message}</span>
            <button onClick={() => setUserActionToast(null)} className="ml-auto text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <Trash2 size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                  Eliminar Usuario
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                  Confirmación de baja en el padrón
                </p>
              </div>
            </div>

            {/* Ficha del usuario a eliminar */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 flex items-center gap-3">
              <img
                src={userToDelete.avatar || PRESET_AVATARS[0]}
                alt={userToDelete.name}
                className="w-12 h-12 rounded-xl object-cover bg-white dark:bg-slate-900 border"
              />
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm text-slate-800 dark:text-white truncate">
                  {userToDelete.name}
                </p>
                <p className="text-xs text-slate-400 font-mono truncate">
                  {userToDelete.email}
                </p>
                <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mt-1">
                  {userToDelete.role}
                </span>
              </div>
            </div>

            {/* Advertencia si es la cuenta maestra admin@hempc.com.ar */}
            {userToDelete.email?.toLowerCase() === 'admin@hempc.com.ar' ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs mb-6">
                <p className="font-bold flex items-center gap-2">
                  <ShieldCheck size={16} className="text-amber-600 shrink-0" />
                  Cuenta Maestra Protegida
                </p>
                <p className="text-[11px] mt-1 opacity-90 leading-relaxed">
                  Esta es la cuenta raíz de Administración Central HempC y no puede ser eliminada para garantizar la seguridad e integridad del sistema.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-6">
                ¿Estás seguro de que deseas eliminar permanentemente a este usuario? Se removerá tanto de la base de datos Supabase en la nube como del registro local.
              </p>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                Cancelar
              </button>
              {userToDelete.email?.toLowerCase() !== 'admin@hempc.com.ar' && (
                <button
                  type="button"
                  onClick={handleDeleteUserConfirm}
                  disabled={isDeletingUser}
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-red-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingUser ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  <span>{isDeletingUser ? "Eliminando..." : "Confirmar Eliminación"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE RESET DE CONTRASEÑA */}
      {userToReset && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Key size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                  Restablecer Clave
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                  Generación de clave temporal
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-6">
              Se generará una nueva contraseña provisoria de alta seguridad para <strong>{userToReset.name}</strong> y será despachada por correo electrónico a <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{userToReset.email}</span>.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUserToReset(null)}
                disabled={isResettingUser}
                className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetUserConfirm}
                disabled={isResettingUser}
                className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-amber-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isResettingUser ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                <span>{isResettingUser ? "Generando..." : "Confirmar & Despachar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

              {/* Entidad vinculada si es productor, técnico o visor */}
              {(formData.role === "client" || formData.role === "technician" || formData.role === "viewer") && (
                <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-3xl border border-blue-100 dark:border-blue-900/30 space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest block mb-2">
                      Tipo de Aislamiento Operativo del Usuario
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setEntityLinkMode("client")}
                        className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase border transition cursor-pointer ${
                          entityLinkMode === "client"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        1. Establecimiento Socio
                      </button>
                      <button
                        type="button"
                        onClick={() => setEntityLinkMode("supplier")}
                        className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase border transition cursor-pointer ${
                          entityLinkMode === "supplier"
                            ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        2. Proveedor / Semillero
                      </button>
                      <button
                        type="button"
                        onClick={() => setEntityLinkMode("none")}
                        className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase border transition cursor-pointer ${
                          entityLinkMode === "none"
                            ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        3. Red Central / Global
                      </button>
                    </div>
                  </div>

                  {entityLinkMode === "client" && (
                    <>
                      <div>
                        <label className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest block mb-2">
                          Establecimiento Socio Vinculado (Aislamiento de Parcelas) *
                        </label>
                        <select 
                          required
                          className={inputClass} 
                          value={formData.clientId || ""} 
                          onChange={e => setFormData({...formData, clientId: e.target.value, supplierId: ""})}
                        >
                          <option value="">Seleccionar establecimiento asociado...</option>
                          {effectiveClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest block mb-2">
                          Función Operativa en el Establecimiento
                        </label>
                        <select
                          className={inputClass}
                          value={formData.structureRole || (formData.role === "client" ? "propietario" : formData.role === "technician" ? "encargado" : "monitoreador")}
                          onChange={e => setFormData({...formData, structureRole: e.target.value as StructureRole})}
                        >
                          {STRUCTURE_ROLES.map(sr => (
                            <option key={sr.value} value={sr.value}>{sr.label} — {sr.description}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {entityLinkMode === "supplier" && (
                    <>
                      <div>
                        <label className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest block mb-2">
                          Proveedor / Semillero Homologado (Acceso Exclusivo a Parcelas con su Semilla) *
                        </label>
                        <select
                          required
                          className={inputClass}
                          value={formData.supplierId || ""}
                          onChange={e => setFormData({ ...formData, supplierId: e.target.value, clientId: "" })}
                        >
                          <option value="">Seleccionar semillero o proveedor homologado...</option>
                          {(suppliers || []).map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest block mb-2">
                          Rol del Humano dentro del Proveedor
                        </label>
                        <select
                          className={inputClass}
                          value={formData.supplierActorRole || "director_tecnico_obtentor"}
                          onChange={e => setFormData({ ...formData, supplierActorRole: e.target.value as SupplierActorRole })}
                        >
                          {SUPPLIER_ACTOR_ROLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label} — {r.description}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* DOCUMENTACIÓN COMPLEMENTARIA DE IDENTIDAD: DNI FRENTE Y DORSO */}
              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-5 rounded-3xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-600 text-white">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        Documentación Complementaria de Identidad (DNI Frente y Dorso)
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Capturá desde la cámara del celular o subí las fotos del DNI para el legajo oficial del socio/usuario.
                      </p>
                    </div>
                  </div>
                  {(formData.dniFrenteUrl || formData.dniDorsoUrl) && (
                    <button
                      type="button"
                      onClick={() => handleDownloadUserDniPdf(formData)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-black uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Descargar Legajo DNI (PDF)</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 block mb-1">
                      N° de DNI / Documento de Identidad
                    </label>
                    <input
                      type="text"
                      className={inputClass}
                      value={formData.dniNumber || ""}
                      onChange={e => setFormData({ ...formData, dniNumber: e.target.value })}
                      placeholder="Ej: 32.456.789"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.dniVerified)}
                        onChange={e => setFormData({ ...formData, dniVerified: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Identidad verificada en padrón oficial ARICCAME
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* DNI FRENTE */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black uppercase text-emerald-700 dark:text-emerald-400">
                        1. Foto DNI — Frente (Anverso)
                      </span>
                      {formData.dniFrenteUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, dniFrenteUrl: "" })}
                          className="text-[10px] font-mono font-bold text-red-500 hover:underline cursor-pointer"
                        >
                          Quitar
                        </button>
                      )}
                    </div>

                    {formData.dniFrenteUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-800 bg-slate-950 h-36">
                        <img
                          src={formData.dniFrenteUrl}
                          alt="DNI Frente"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-36 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 p-3 text-center">
                        <CreditCard size={26} className="mb-1 opacity-60" />
                        <span className="text-[11px] font-bold">Sin imagen de DNI Frente</span>
                        <span className="text-[10px]">Subí archivo o usá la cámara del celular</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <label className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer text-center">
                        <Camera size={13} />
                        <span>{isCompressingDni === "frente" ? "Procesando..." : "Cámara Celular"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={e => handleDniPhotoSelect("frente", e)}
                        />
                      </label>
                      <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-mono font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer text-center">
                        <FileText size={13} />
                        <span>Subir Archivo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => handleDniPhotoSelect("frente", e)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* DNI DORSO */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black uppercase text-emerald-700 dark:text-emerald-400">
                        2. Foto DNI — Dorso (Reverso)
                      </span>
                      {formData.dniDorsoUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, dniDorsoUrl: "" })}
                          className="text-[10px] font-mono font-bold text-red-500 hover:underline cursor-pointer"
                        >
                          Quitar
                        </button>
                      )}
                    </div>

                    {formData.dniDorsoUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-800 bg-slate-950 h-36">
                        <img
                          src={formData.dniDorsoUrl}
                          alt="DNI Dorso"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-36 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 p-3 text-center">
                        <CreditCard size={26} className="mb-1 opacity-60" />
                        <span className="text-[11px] font-bold">Sin imagen de DNI Dorso</span>
                        <span className="text-[10px]">Subí archivo o usá la cámara del celular</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <label className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer text-center">
                        <Camera size={13} />
                        <span>{isCompressingDni === "dorso" ? "Procesando..." : "Cámara Celular"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={e => handleDniPhotoSelect("dorso", e)}
                        />
                      </label>
                      <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-mono font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer text-center">
                        <FileText size={13} />
                        <span>Subir Archivo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => handleDniPhotoSelect("dorso", e)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

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

      {/* MODAL LIGHTBOX DE PREVISUALIZACIÓN DE DNI FRENTE Y DORSO */}
      {dniPreviewUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl max-w-3xl w-full p-6 md:p-8 border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-600 text-white">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white">
                    Legajo de Identidad DNI — {dniPreviewUser.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    DNI N° {dniPreviewUser.dniNumber || "No especificado"} · Actualizado: {dniPreviewUser.dniUpdatedAt || "Reciente"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadUserDniPdf(dniPreviewUser)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-black uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Descargar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDniPreviewUser(null)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-black uppercase text-emerald-700 dark:text-emerald-400">
                    1. DNI Frente (Anverso)
                  </span>
                  {dniPreviewUser.dniFrenteUrl && (
                    <a
                      href={dniPreviewUser.dniFrenteUrl}
                      download={`DNI_Frente_${dniPreviewUser.name || "socio"}.jpg`}
                      className="text-[11px] font-mono font-bold text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <Download size={12} /> Descargar JPG
                    </a>
                  )}
                </div>
                <div className="h-60 rounded-2xl bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center">
                  {dniPreviewUser.dniFrenteUrl ? (
                    <img src={dniPreviewUser.dniFrenteUrl} alt="DNI Frente" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs font-mono text-slate-400">Sin imagen de frente cargada</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-black uppercase text-emerald-700 dark:text-emerald-400">
                    2. DNI Dorso (Reverso)
                  </span>
                  {dniPreviewUser.dniDorsoUrl && (
                    <a
                      href={dniPreviewUser.dniDorsoUrl}
                      download={`DNI_Dorso_${dniPreviewUser.name || "socio"}.jpg`}
                      className="text-[11px] font-mono font-bold text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <Download size={12} /> Descargar JPG
                    </a>
                  )}
                </div>
                <div className="h-60 rounded-2xl bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center">
                  {dniPreviewUser.dniDorsoUrl ? (
                    <img src={dniPreviewUser.dniDorsoUrl} alt="DNI Dorso" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs font-mono text-slate-400">Sin imagen de dorso cargada</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
