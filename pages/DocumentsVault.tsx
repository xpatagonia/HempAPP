import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { VaultDocument, VaultDocumentCategory, User, FieldLog } from '../types';
import {
  FolderKanban, FileText, Upload, Download, Search, ShieldCheck, Building,
  CreditCard, Camera, Sprout, Truck, Receipt, Eye, Trash2, Plus, X,
  CheckCircle2, AlertTriangle, Lock, ExternalLink, FileSpreadsheet, Settings as SettingsIcon
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateAr } from '../src/utils/dateFormat';
import { getGoogleDriveConfig, uploadFileToHempCDrive } from '../src/services/googleDriveBridgeService';

interface UnifiedVaultItem {
  id: string;
  title: string;
  subtitle: string;
  category: VaultDocumentCategory;
  categoryLabel: string;
  code: string;
  date: string;
  clientId?: string;
  clientName: string;
  locationName?: string;
  plotName?: string;
  plotId?: string;
  userId?: string;
  fileType: 'pdf' | 'image' | 'system_pdf';
  fileDataUrl?: string;
  secondaryDataUrl?: string;
  uploadedBy: string;
  statusLabel: string;
  statusTone: 'emerald' | 'amber' | 'sky' | 'purple';
  sourceType: 'seed_movement' | 'contract' | 'user_dni' | 'expense' | 'field_sample' | 'custom_vault';
  rawRef?: any;
}

const CATEGORY_META: Record<VaultDocumentCategory | 'ALL', { label: string; shortLabel: string; badgeClass: string }> = {
  ALL: {
    label: 'Todos los Documentos',
    shortLabel: 'Todos',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
  },
  TAD_ARICCAME: {
    label: 'Guías de Tránsito, Remitos & TAD (ARICCAME)',
    shortLabel: 'Guías & TAD',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
  },
  LICENCIA_OFICIAL: {
    label: 'Licencias Oficiales & Autorizaciones (ARICCAME / INASE / RENSPA)',
    shortLabel: 'Licencias & Aut.',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
  },
  CONTRATO_SOCIO: {
    label: 'Contratos Productivos & Convenios de Red',
    shortLabel: 'Contratos',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
  },
  DNI_IDENTIDAD: {
    label: 'Legajos de Identidad (DNI Frente y Dorso)',
    shortLabel: 'DNI Socios',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
  },
  FACTURA_REMITO: {
    label: 'Facturas, Remitos & Comprobantes Operativos',
    shortLabel: 'Facturas & Remitos',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
  },
  MUESTRA_CAMPO: {
    label: 'Registro Fotográfico de Muestras de Campo (Bitácora Parcelas)',
    shortLabel: 'Muestras Campo',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800'
  },
  OTRO: {
    label: 'Otros Documentos Complementarios',
    shortLabel: 'Otros',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  }
};

function compressImageToDataUrl(file: File, maxDimension = 1280, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen inválida.'));
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
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer archivo.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

export default function DocumentsVault() {
  const navigate = useNavigate();
  const {
    currentUser,
    clients,
    locations,
    plots,
    usersList,
    updateUser,
    seedMovements,
    seedBatches,
    varieties,
    operationalExpenses,
    logs,
    addLog,
    trialRecords,
    vaultDocuments,
    addVaultDocument,
    deleteVaultDocument
  } = useAppContext();

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;
  const driveConfig = getGoogleDriveConfig();

  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<VaultDocumentCategory | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewItem, setPreviewItem] = useState<UnifiedVaultItem | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; tone: 'emerald' | 'rose' } | null>(null);

  // Modal para subir documento administrativo o licencia/contrato/factura/TAD
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState<{
    title: string;
    category: VaultDocumentCategory;
    documentCode: string;
    clientId: string;
    plotId: string;
    notes: string;
    fileName: string;
    fileType: 'pdf' | 'image';
    fileDataUrl: string;
    fileSizeKb: number;
  }>({
    title: '',
    category: 'TAD_ARICCAME',
    documentCode: '',
    clientId: clients[0]?.id || '',
    plotId: '',
    notes: '',
    fileName: '',
    fileType: 'pdf',
    fileDataUrl: '',
    fileSizeKb: 0
  });

  // Modal rápido para que cualquier socio/usuario impacte su DNI Frente y Dorso
  const [dniModalUser, setDniModalUser] = useState<User | null>(null);
  const [dniForm, setDniForm] = useState<{
    dniNumber: string;
    dniFrenteUrl: string;
    dniDorsoUrl: string;
  }>({ dniNumber: '', dniFrenteUrl: '', dniDorsoUrl: '' });
  const [isSavingDni, setIsSavingDni] = useState(false);

  // Modal rápido para tomar foto de Muestra de Campo desde el celular e impactar en la Bitácora de Parcela
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [sampleForm, setSampleForm] = useState<{
    plotId: string;
    sampleCode: string;
    sampleType: NonNullable<FieldLog['sampleType']>;
    phenologicalStage: string;
    note: string;
    photoUrl: string;
  }>({
    plotId: plots[0]?.id || '',
    sampleCode: `MUE-CAMPO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`,
    sampleType: 'Muestra Fenológica / Biometría',
    phenologicalStage: 'Floración',
    note: '',
    photoUrl: ''
  });
  const [isSavingSample, setIsSavingSample] = useState(false);

  const showToast = (text: string, tone: 'emerald' | 'rose' = 'emerald') => {
    setToastMessage({ text, tone });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Socios visibles (AppContext ya entrega `clients`, `locations`, `plots` filtrados según el rol del usuario)
  const visibleClients = useMemo(() => clients, [clients]);
  const visibleClientIds = useMemo(() => new Set(visibleClients.map(c => String(c.id))), [visibleClients]);
  const visiblePlotIds = useMemo(() => new Set(plots.map(p => String(p.id))), [plots]);

  // Usuarios visibles (Admin ve todos; el resto ve usuarios de su mismo establecimiento/socio o su propio perfil)
  const visibleUsers = useMemo(() => {
    if (isAdmin) return usersList;
    return usersList.filter(
      u =>
        String(u.id) === String(currentUser?.id) ||
        (u.clientId && visibleClientIds.has(String(u.clientId)))
    );
  }, [usersList, isAdmin, currentUser, visibleClientIds]);

  // Consolidación en tiempo real de todos los documentos de todos los procesos
  const allUnifiedItems = useMemo<UnifiedVaultItem[]>(() => {
    const list: UnifiedVaultItem[] = [];

    // 1. Guías de Tránsito, Remitos & TAD Oficiales (ARICCAME) desde seedMovements
    seedMovements.forEach(mov => {
      const targetLoc = locations.find(l => String(l.id) === String(mov.targetLocationId));
      const matchedClient =
        visibleClients.find(c => String(c.id) === String(mov.clientId)) ||
        visibleClients.find(c => String(c.id) === String(targetLoc?.clientId));
      if (!isAdmin && matchedClient && !visibleClientIds.has(String(matchedClient.id))) return;

      const batch = seedBatches.find(b => String(b.id) === String(mov.batchId));
      const vari = varieties.find(v => String(v.id) === String(batch?.varietyId));

      list.push({
        id: `mov-${mov.id}`,
        title: `${mov.tadDocumentUrl ? 'Guía Oficial TAD Aprobada (ARICCAME)' : 'Guía de Tránsito & Remito Oficial'} — ${vari?.name || 'Semilla Certificada'} (${mov.quantity} kg)`,
        subtitle: `Destino: ${targetLoc?.name || matchedClient?.name || 'Red Cooperativa'} · Transportista: ${mov.transportCompany || mov.driverName || 'Logística Oficial'}`,
        category: 'TAD_ARICCAME',
        categoryLabel: 'Guía & TAD ARICCAME',
        code: mov.tadApprovalNumber || mov.transportGuideNumber || mov.remitoNumber || `GUIA-${mov.id}`,
        date: mov.date || '2026-01-10',
        clientId: matchedClient?.id,
        clientName: matchedClient?.name || 'Administración Central Cooperativa',
        locationName: targetLoc?.name,
        fileType: mov.tadDocumentUrl ? 'pdf' : 'system_pdf',
        fileDataUrl: mov.tadDocumentUrl,
        uploadedBy: mov.tadUploadedBy || mov.issuerSignature?.signedBy || 'Dirección Logística HempC',
        statusLabel: mov.tadDocumentUrl ? 'TAD Oficial Adjunto' : (mov.issuerSignature || mov.receiverSignature) ? 'Firmada Electrónicamente' : 'Emitida',
        statusTone: mov.tadDocumentUrl ? 'emerald' : 'sky',
        sourceType: 'seed_movement',
        rawRef: { mov, batch, vari, targetLoc, matchedClient }
      });
    });

    // 2. Licencias Oficiales ARICCAME / RENSPA por Establecimiento y Contratos Productivos de cada Socio
    visibleClients.forEach(cli => {
      const cliLoc = locations.find(l => String(l.clientId) === String(cli.id) || String(l.id) === String(cli.locationId));
      if (cliLoc?.ariccameLicenseNumber) {
        list.push({
          id: `lic-${cli.id}`,
          title: `Licencia Oficial ARICCAME & RENSPA — ${cli.name}`,
          subtitle: `${cliLoc.ariccameLicenseCategory || 'Cultivo e Industrialización'} · RENSPA: ${cliLoc.renspaNumber || 'Vigente'}`,
          category: 'LICENCIA_OFICIAL',
          categoryLabel: 'Licencia Oficial ARICCAME',
          code: cliLoc.ariccameLicenseNumber,
          date: cliLoc.sowingDeclarationDate || '2025-10-15',
          clientId: cli.id,
          clientName: cli.name,
          locationName: cliLoc.name,
          fileType: 'system_pdf',
          uploadedBy: 'Auditoría Regulatoria ARICCAME / INASE',
          statusLabel: cliLoc.ariccameLicenseStatus || 'Vigente',
          statusTone: 'purple',
          sourceType: 'contract',
          rawRef: { client: cli, location: cliLoc }
        });
      }

      (cli.contractDocuments || []).forEach(doc => {
        const isImgDoc = doc.fileDataUrl?.startsWith('data:image/');
        list.push({
          id: `contract-${cli.id}-${doc.id}`,
          title: `${doc.title || 'Contrato Productivo / Convenio'} — ${cli.name}`,
          subtitle: `Campaña ${doc.campaign || '2025/2026'} · Archivo: ${doc.fileName}`,
          category: 'CONTRATO_SOCIO',
          categoryLabel: 'Contrato de Socio',
          code: doc.documentNumber || `CONV-${cli.id.slice(0, 6).toUpperCase()}`,
          date: doc.signedDate || doc.uploadedAt || '2025-11-01',
          clientId: cli.id,
          clientName: cli.name,
          locationName: cliLoc?.name,
          fileType: isImgDoc ? 'image' : doc.fileDataUrl ? 'pdf' : 'system_pdf',
          fileDataUrl: doc.fileDataUrl,
          uploadedBy: doc.uploadedBy || 'Administración Legal HempC',
          statusLabel: 'Vigente',
          statusTone: 'emerald',
          sourceType: 'contract',
          rawRef: { client: cli, contract: doc, location: cliLoc }
        });
      });
    });

    // 3. Legajos de Identidad (DNI Frente y Dorso) de cada Socio / Usuario
    visibleUsers.forEach(u => {
      const matchedClient = visibleClients.find(c => String(c.id) === String(u.clientId));
      const hasFrente = Boolean(u.dniFrenteUrl);
      const hasDorso = Boolean(u.dniDorsoUrl);
      const isComplete = hasFrente && hasDorso;
      list.push({
        id: `dni-${u.id}`,
        title: `Legajo de Identidad DNI (Frente y Dorso) — ${u.name}`,
        subtitle: `${u.jobTitle || u.role} · Correo: ${u.email} ${u.dniNumber ? `· DNI N° ${u.dniNumber}` : ''}`,
        category: 'DNI_IDENTIDAD',
        categoryLabel: 'Legajo DNI (Frente / Dorso)',
        code: u.dniNumber ? `DNI-${u.dniNumber}` : `LEG-USR-${String(u.id).slice(-5)}`,
        date: u.dniUpdatedAt || '2026-01-15',
        clientId: matchedClient?.id,
        clientName: matchedClient?.name || u.organizationName || 'Dirección Central Cooperativa',
        userId: u.id,
        fileType: hasFrente ? 'image' : 'system_pdf',
        fileDataUrl: u.dniFrenteUrl,
        secondaryDataUrl: u.dniDorsoUrl,
        uploadedBy: u.name,
        statusLabel: isComplete ? 'DNI Frente y Dorso OK' : (hasFrente || hasDorso) ? 'DNI Parcial' : 'Pendiente Captura DNI',
        statusTone: isComplete ? 'emerald' : 'amber',
        sourceType: 'user_dni',
        rawRef: u
      });
    });

    // 4. Facturas, Remitos & Comprobantes Operativos
    operationalExpenses.forEach(exp => {
      const expPlot = plots.find(p => String(p.id) === String(exp.plotId));
      const expLoc = locations.find(l => String(l.id) === String(expPlot?.locationId));
      const matchedClient =
        visibleClients.find(c => String(c.id) === String(expLoc?.clientId)) ||
        visibleClients.find(c => String(c.id) === String(exp.socioId));
      if (!isAdmin && matchedClient && !visibleClientIds.has(String(matchedClient.id))) return;

      list.push({
        id: `exp-${exp.id}`,
        title: `${exp.receiptType || 'Comprobante Operativo'}: ${exp.concept}`,
        subtitle: `Categoría: ${exp.category} · Monto: USD ${Number(exp.totalCostUsd || 0).toLocaleString('es-AR')} · Parcela: ${expPlot?.name || 'General'}`,
        category: 'FACTURA_REMITO',
        categoryLabel: 'Factura / Comprobante',
        code: exp.receiptNumber || `COMP-${String(exp.id).slice(0, 8).toUpperCase()}`,
        date: exp.date || '2026-02-10',
        clientId: matchedClient?.id,
        clientName: matchedClient?.name || exp.socioName || 'Administración Central',
        locationName: expLoc?.name,
        plotName: expPlot?.name,
        plotId: expPlot?.id,
        fileType: 'system_pdf',
        uploadedBy: exp.socioName || 'Administración Contable',
        statusLabel: exp.status === 'AUDITADO_CONFORME' ? 'Auditado Conforme' : exp.status,
        statusTone: exp.status === 'AUDITADO_CONFORME' ? 'emerald' : 'sky',
        sourceType: 'expense',
        rawRef: { exp, expPlot, expLoc, matchedClient }
      });
    });

    // 5. Fotografías de Muestras de Campo en la Bitácora de las Parcelas
    logs.forEach(log => {
      if (!visiblePlotIds.has(String(log.plotId))) return;
      const logPlot = plots.find(p => String(p.id) === String(log.plotId));
      const logLoc = locations.find(l => String(l.id) === String(logPlot?.locationId));
      const matchedClient = visibleClients.find(c => String(c.id) === String(logLoc?.clientId));

      list.push({
        id: `sample-log-${log.id}`,
        title: `${log.sampleType || 'Muestra de Campo en Bitácora'} — Parcela ${logPlot?.name || log.plotId}`,
        subtitle: `${log.note} ${log.phenologicalStage ? `· Estadio: ${log.phenologicalStage}` : ''}`,
        category: 'MUESTRA_CAMPO',
        categoryLabel: 'Muestra de Campo (Bitácora)',
        code: log.sampleCode || `MUE-${String(log.id).slice(0, 6).toUpperCase()}`,
        date: log.date || '2026-02-20',
        clientId: matchedClient?.id,
        clientName: matchedClient?.name || logLoc?.name || 'Establecimiento Socio',
        locationName: logLoc?.name,
        plotName: logPlot?.name,
        plotId: logPlot?.id,
        fileType: log.photoUrl ? 'image' : 'system_pdf',
        fileDataUrl: log.photoUrl,
        uploadedBy: log.operatorName || logPlot?.samplingResponsibleName || 'Operador de Campo',
        statusLabel: log.photoUrl ? 'Con Evidencia Fotográfica' : 'Registro Técnico',
        statusTone: 'emerald',
        sourceType: 'field_sample',
        rawRef: { log, logPlot, logLoc, matchedClient }
      });
    });

    // También incluir muestras de TrialRecord que tengan foto y aún no estén duplicadas en logs
    trialRecords.forEach(tr => {
      if (!tr.samplePhotoUrl) return;
      if (!visiblePlotIds.has(String(tr.plotId))) return;
      if (logs.some(l => l.id === `log-sample-${tr.id}`)) return;
      const trPlot = plots.find(p => String(p.id) === String(tr.plotId));
      const trLoc = locations.find(l => String(l.id) === String(trPlot?.locationId));
      const matchedClient = visibleClients.find(c => String(c.id) === String(trLoc?.clientId));

      list.push({
        id: `sample-tr-${tr.id}`,
        title: `Muestra Fenológica (${tr.stage}) — Parcela ${trPlot?.name || tr.plotId}`,
        subtitle: `Altura: ${tr.plantHeight || 0} cm · Plantas/m²: ${tr.plantsPerMeter || 0} · Vigor: ${tr.vigor || 9}/9`,
        category: 'MUESTRA_CAMPO',
        categoryLabel: 'Muestra Fenológica',
        code: tr.sampleCode || `MUE-${String(tr.id).slice(0, 6).toUpperCase()}`,
        date: tr.date,
        clientId: matchedClient?.id,
        clientName: matchedClient?.name || trLoc?.name || 'Establecimiento Socio',
        locationName: trLoc?.name,
        plotName: trPlot?.name,
        plotId: trPlot?.id,
        fileType: 'image',
        fileDataUrl: tr.samplePhotoUrl,
        uploadedBy: tr.createdByName || trPlot?.samplingResponsibleName || 'Técnico de Campo',
        statusLabel: 'Foto Muestra Celular',
        statusTone: 'emerald',
        sourceType: 'field_sample',
        rawRef: { log: { id: tr.id, plotId: tr.plotId, date: tr.date, time: tr.time, note: `Muestreo ${tr.stage}`, photoUrl: tr.samplePhotoUrl, sampleCode: tr.sampleCode }, logPlot: trPlot, logLoc: trLoc, matchedClient }
      });
    });

    // 6. Documentos subidos directamente a la Bóveda Documental (vaultDocuments)
    vaultDocuments.forEach(vd => {
      if (!isAdmin && vd.clientId && !visibleClientIds.has(String(vd.clientId))) return;
      const matchedClient = visibleClients.find(c => String(c.id) === String(vd.clientId));
      const vdPlot = plots.find(p => String(p.id) === String(vd.plotId));
      list.push({
        id: vd.id,
        title: vd.title,
        subtitle: vd.notes || `Archivo: ${vd.fileName}`,
        category: vd.category,
        categoryLabel: CATEGORY_META[vd.category]?.shortLabel || 'Documento',
        code: vd.documentCode || `DOC-${vd.id.slice(-6).toUpperCase()}`,
        date: vd.uploadedAt,
        clientId: vd.clientId,
        clientName: matchedClient?.name || vd.clientName || 'Red Cooperativa HempC',
        plotName: vdPlot?.name,
        plotId: vd.plotId,
        fileType: vd.fileType,
        fileDataUrl: vd.fileDataUrl,
        uploadedBy: vd.uploadedBy,
        statusLabel: 'Documento Oficial Almacenado',
        statusTone: 'emerald',
        sourceType: 'custom_vault',
        rawRef: vd
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    seedMovements,
    seedBatches,
    varieties,
    visibleClients,
    visibleClientIds,
    visibleUsers,
    operationalExpenses,
    logs,
    trialRecords,
    vaultDocuments,
    locations,
    plots,
    visiblePlotIds,
    isAdmin
  ]);

  const filteredItems = useMemo(() => {
    return allUnifiedItems.filter(item => {
      if (selectedClientId !== 'ALL' && String(item.clientId) !== String(selectedClientId)) {
        return false;
      }
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.clientName.toLowerCase().includes(q) ||
          (item.plotName && item.plotName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allUnifiedItems, selectedClientId, selectedCategory, searchTerm]);

  // Generador de PDF individual para cualquier ítem del legajo
  const handleDownloadItemPdf = (item: UnifiedVaultItem) => {
    // Si es un PDF subido (por ejemplo Guía TAD o Contrato en PDF), descargarlo directamente
    if (item.fileDataUrl && item.fileDataUrl.startsWith('data:application/pdf')) {
      const link = document.createElement('a');
      link.href = item.fileDataUrl;
      link.download = `${item.code.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`CERTIFICACIÓN DOCUMENTAL — ${item.categoryLabel.toUpperCase()}`, 14, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`RED COOPERATIVA HEMPC / NUCLEUS TRACE · BÓVEDA DOCUMENTAL DE SOCIOS`, 14, 21);
    doc.text(`Código: ${item.code}   |   Fecha: ${formatDateAr(item.date)}   |   Estado: ${item.statusLabel}`, 14, 28);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(item.title, 14, 44);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Socio / Establecimiento: ${item.clientName}`, 14, 51);
    if (item.plotName) {
      doc.text(`Parcela / Unidad Productiva: ${item.plotName}`, 14, 57);
    }
    doc.text(`Responsable / Emisor: ${item.uploadedBy}`, 14, 63);
    const splitSub = doc.splitTextToSize(`Detalle: ${item.subtitle}`, 180);
    doc.text(splitSub, 14, 70);

    doc.setDrawColor(203, 213, 225);
    doc.line(14, 82, 196, 82);

    if (item.sourceType === 'user_dni') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('1. FOTOGRAFÍA DNI — FRENTE (ANVERSO)', 14, 90);
      doc.rect(14, 93, 130, 80);
      if (item.fileDataUrl) {
        try {
          doc.addImage(item.fileDataUrl, 'JPEG', 16, 95, 126, 76);
        } catch {}
      } else {
        doc.setFont('helvetica', 'italic');
        doc.text('Sin imagen de DNI Frente cargada.', 22, 132);
      }

      doc.setFont('helvetica', 'bold');
      doc.text('2. FOTOGRAFÍA DNI — DORSO (REVERSO)', 14, 184);
      doc.rect(14, 187, 130, 80);
      if (item.secondaryDataUrl) {
        try {
          doc.addImage(item.secondaryDataUrl, 'JPEG', 16, 189, 126, 76);
        } catch {}
      } else {
        doc.setFont('helvetica', 'italic');
        doc.text('Sin imagen de DNI Dorso cargada.', 22, 226);
      }
    } else if (item.fileDataUrl && item.fileDataUrl.startsWith('data:image/')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('EVIDENCIA DIGITAL / IMAGEN ADJUNTA:', 14, 92);
      doc.rect(14, 96, 160, 120);
      try {
        doc.addImage(item.fileDataUrl, 'JPEG', 16, 98, 156, 116);
      } catch {}
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Documento oficial emitido desde la Bóveda Documental de Trazabilidad HempC (Ley 27.669 / ARICCAME / INASE).', 14, 284);
    doc.save(`${item.code.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
  };

  // Generador de Legajo Integral consolidado por Socio en PDF
  const handleDownloadSocioConsolidatedPdf = (clientId: string) => {
    const targetClient = visibleClients.find(c => String(c.id) === String(clientId));
    const items = clientId === 'ALL'
      ? filteredItems
      : allUnifiedItems.filter(i => String(i.clientId) === String(clientId));

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(
      `LEGAJO DOCUMENTAL INTEGRAL — ${targetClient ? targetClient.name.toUpperCase() : 'RED COOPERATIVA HEMPC'}`,
      14,
      13
    );
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Guías TAD (ARICCAME), Licencias Oficiales, Contratos, Legajos DNI, Facturas y Muestras de Campo · Emisión: ${new Date().toLocaleDateString('es-AR')}`,
      14,
      21
    );

    autoTable(doc, {
      startY: 36,
      head: [['Fecha', 'Categoría', 'Código Oficial', 'Documento / Proceso', 'Socio / Establecimiento', 'Responsable', 'Estado']],
      body: items.map(it => [
        formatDateAr(it.date),
        it.categoryLabel,
        it.code,
        it.title,
        it.clientName,
        it.uploadedBy,
        it.statusLabel
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [6, 95, 70], textColor: 255, fontStyle: 'bold' }
    });

    const safeName = (targetClient?.name || 'Red_HempC').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Legajo_Integral_${safeName}.pdf`);
  };

  // Guardar nuevo documento subido en el modal
  const handleSaveUploadedDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.title.trim() || !uploadForm.fileDataUrl) return;
    setIsUploading(true);
    try {
      const targetClient = visibleClients.find(c => String(c.id) === String(uploadForm.clientId));
      const newDoc: VaultDocument = {
        id: `vdoc-${Date.now()}`,
        title: uploadForm.title.trim(),
        category: uploadForm.category,
        documentCode: uploadForm.documentCode.trim() || `DOC-${Date.now().toString().slice(-6)}`,
        clientId: uploadForm.clientId || undefined,
        clientName: targetClient?.name || 'Red Cooperativa HempC',
        plotId: uploadForm.plotId || undefined,
        fileName: uploadForm.fileName || 'documento.pdf',
        fileType: uploadForm.fileType,
        fileDataUrl: uploadForm.fileDataUrl,
        fileSizeKb: uploadForm.fileSizeKb,
        uploadedAt: new Date().toISOString().split('T')[0],
        uploadedBy: currentUser?.name || 'Administrador',
        notes: uploadForm.notes.trim(),
        isOfficial: true
      };
      await addVaultDocument(newDoc);
      if (driveConfig.autoSyncOnUpload && driveConfig.appsScriptUrl.trim()) {
        await uploadFileToHempCDrive({
          fileName: newDoc.fileName,
          mimeType: newDoc.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg',
          dataUrl: newDoc.fileDataUrl,
          socioName: newDoc.clientName,
          category: newDoc.category,
          description: `${newDoc.title} (${newDoc.documentCode})`
        });
      }
      setIsUploadModalOpen(false);
      setUploadForm({
        title: '',
        category: 'TAD_ARICCAME',
        documentCode: '',
        clientId: visibleClients[0]?.id || '',
        plotId: '',
        notes: '',
        fileName: '',
        fileType: 'pdf',
        fileDataUrl: '',
        fileSizeKb: 0
      });
      showToast(
        driveConfig.autoSyncOnUpload && driveConfig.appsScriptUrl.trim()
          ? `Documento incorporado y sincronizado con Google Drive (${driveConfig.targetEmail}).`
          : 'Documento oficial incorporado al Legajo del Socio.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Guardar DNI Frente y Dorso desde el atajo rápido
  const handleSaveDniModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dniModalUser) return;
    setIsSavingDni(true);
    try {
      await updateUser({
        ...dniModalUser,
        dniNumber: dniForm.dniNumber.trim(),
        dniFrenteUrl: dniForm.dniFrenteUrl,
        dniDorsoUrl: dniForm.dniDorsoUrl,
        dniUpdatedAt: new Date().toISOString().split('T')[0]
      });
      if (driveConfig.autoSyncOnUpload && driveConfig.appsScriptUrl.trim()) {
        const socioName = clients.find(c => String(c.id) === String(dniModalUser.clientId))?.name || dniModalUser.organizationName || 'Personal_HempC';
        if (dniForm.dniFrenteUrl) {
          await uploadFileToHempCDrive({
            fileName: `DNI_FRENTE_${dniModalUser.name.replace(/\s+/g, '_')}.jpg`,
            mimeType: 'image/jpeg',
            dataUrl: dniForm.dniFrenteUrl,
            socioName,
            category: 'DNI_IDENTIDAD',
            description: `DNI Frente - ${dniModalUser.name} (${dniForm.dniNumber})`
          });
        }
        if (dniForm.dniDorsoUrl) {
          await uploadFileToHempCDrive({
            fileName: `DNI_DORSO_${dniModalUser.name.replace(/\s+/g, '_')}.jpg`,
            mimeType: 'image/jpeg',
            dataUrl: dniForm.dniDorsoUrl,
            socioName,
            category: 'DNI_IDENTIDAD',
            description: `DNI Dorso - ${dniModalUser.name} (${dniForm.dniNumber})`
          });
        }
      }
      setDniModalUser(null);
      showToast(`Legajo DNI (Frente y Dorso) actualizado en la ficha de ${dniModalUser.name}.`);
    } finally {
      setIsSavingDni(false);
    }
  };

  // Guardar Muestra de Campo tomada con el celular desde el atajo rápido
  const handleSaveQuickSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleForm.plotId || !sampleForm.note.trim()) return;
    setIsSavingSample(true);
    try {
      const targetPlot = plots.find(p => String(p.id) === String(sampleForm.plotId));
      const newLog: FieldLog = {
        id: `log-vault-${Date.now()}`,
        plotId: sampleForm.plotId,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        sampleCode: sampleForm.sampleCode.trim() || `MUE-${(targetPlot?.name || 'PAR').slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`,
        sampleType: sampleForm.sampleType,
        phenologicalStage: sampleForm.phenologicalStage,
        operatorName: currentUser?.name || 'Operador de Campo',
        note: sampleForm.note.trim(),
        photoUrl: sampleForm.photoUrl || undefined
      };
      await addLog(newLog);
      if (newLog.photoUrl && driveConfig.autoSyncOnUpload && driveConfig.appsScriptUrl.trim()) {
        const plotLoc = locations.find(l => String(l.id) === String(targetPlot?.locationId));
        const socioName = clients.find(c => String(c.id) === String(plotLoc?.clientId))?.name || 'Muestras_Campo';
        await uploadFileToHempCDrive({
          fileName: `${newLog.sampleCode}_${targetPlot?.name?.replace(/\s+/g, '_') || 'Parcela'}.jpg`,
          mimeType: 'image/jpeg',
          dataUrl: newLog.photoUrl,
          socioName,
          category: 'MUESTRAS_CAMPO',
          description: `${newLog.sampleCode} - ${newLog.sampleType} (${newLog.phenologicalStage}): ${newLog.note}`
        });
      }
      setIsSampleModalOpen(false);
      setSampleForm({
        plotId: plots[0]?.id || '',
        sampleCode: `MUE-CAMPO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-02`,
        sampleType: 'Muestra Fenológica / Biometría',
        phenologicalStage: 'Floración',
        note: '',
        photoUrl: ''
      });
      showToast(`Muestra de campo impactada en la Bitácora de ${targetPlot?.name || 'la parcela'}.`);
    } finally {
      setIsSavingSample(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* TOAST DE CONFIRMACIÓN */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50">
          <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold ${
            toastMessage.tone === 'emerald'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-700'
              : 'bg-rose-950 text-rose-200 border-rose-700'
          }`}>
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* CABECERA PRINCIPAL */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban size={13} />
                <span>Bóveda Documental Integrada</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5">
                <span>Drive Oficial: {driveConfig.targetEmail}</span>
                <span>•</span>
                <span>{driveConfig.appsScriptUrl.trim() ? 'Auto-Sync Activo' : 'Configurable en Admin Server'}</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono font-bold uppercase">
                { isAdmin ? 'Acceso Global Super Admin / Admin' : `Acceso Aislado: ${visibleClients[0]?.name || currentUser?.organizationName || 'Mi Estructura'}` }
              </span>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Centro de Documentos & Legajos por Socio
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl">
              Atajo centralizado a toda la documentación oficial de cada socio y proceso: Guías TAD aprobadas (ARICCAME), Licencias Oficiales, Contratos, DNI Frente y Dorso en fichas de usuario, Facturas/Remitos y Fotografías de Muestras de Campo tomadas desde el celular en las parcelas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botón rápido: Impactar mi DNI Frente y Dorso */}
            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  const me = usersList.find(u => String(u.id) === String(currentUser.id)) || currentUser;
                  setDniModalUser(me);
                  setDniForm({
                    dniNumber: me.dniNumber || '',
                    dniFrenteUrl: me.dniFrenteUrl || '',
                    dniDorsoUrl: me.dniDorsoUrl || ''
                  });
                }}
                className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-black uppercase flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <CreditCard size={15} />
                <span>Mi DNI (Frente / Dorso)</span>
              </button>
            )}

            {/* Botón rápido: Capturar Muestra de Campo desde Celular */}
            {plots.length > 0 && currentUser?.role !== 'viewer' && (
              <button
                type="button"
                onClick={() => setIsSampleModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-black uppercase flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Camera size={15} />
                <span>Foto Muestra Celular</span>
              </button>
            )}

            {/* Botón Admin: Subir Documento Oficial (TAD / Licencia / Contrato / Factura) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-black uppercase flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Upload size={15} />
                <span>Subir Documento Oficial</span>
              </button>
            )}

            {driveConfig.sharedFolderUrl.trim() && (
              <a
                href={driveConfig.sharedFolderUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-black uppercase flex items-center gap-1.5 shadow-xs"
              >
                <ExternalLink size={14} />
                <span>Abrir Drive ({driveConfig.targetEmail})</span>
              </a>
            )}

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="px-3.5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-mono font-black uppercase flex items-center gap-1.5 cursor-pointer"
                title="Configurar cuenta hempc.arg@gmail.com desde Admin Server"
              >
                <SettingsIcon size={14} />
                <span>Configurar Drive en Admin Server</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleDownloadSocioConsolidatedPdf(selectedClientId)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-mono font-bold uppercase flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Download size={14} className="text-emerald-400" />
              <span>Exportar Índice PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* ATAJOS RÁPIDOS POR SOCIO DE LA RED (CARPETAS DE SOCIOS) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-mono font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Building size={13} className="text-emerald-500" />
            <span>Atajo Directo por Socio / Establecimiento ({visibleClients.length} Socios Habilitados)</span>
          </span>
          {selectedClientId !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedClientId('ALL')}
              className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Ver Todos los Socios
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {visibleClients.map(client => {
            const clientItems = allUnifiedItems.filter(i => String(i.clientId) === String(client.id));
            const tadCount = clientItems.filter(i => i.category === 'TAD_ARICCAME').length;
            const dniCount = clientItems.filter(i => i.category === 'DNI_IDENTIDAD').length;
            const sampleCount = clientItems.filter(i => i.category === 'MUESTRA_CAMPO').length;
            const isSelected = String(selectedClientId) === String(client.id);

            return (
              <div
                key={client.id}
                onClick={() => setSelectedClientId(isSelected ? 'ALL' : client.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-emerald-950/10 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-400'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
                        Legajo Digital del Socio
                      </span>
                      <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white leading-snug">
                        {client.name}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-black bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                      {clientItems.length} Docs
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono">
                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[9px] text-slate-400 block">Guías/TAD</span>
                      <strong className="text-xs text-slate-800 dark:text-white">{tadCount}</strong>
                    </div>
                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[9px] text-slate-400 block">Legajos DNI</span>
                      <strong className="text-xs text-slate-800 dark:text-white">{dniCount}</strong>
                    </div>
                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[9px] text-slate-400 block">Muestras</span>
                      <strong className="text-xs text-slate-800 dark:text-white">{sampleCount}</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">
                    CUIT: {client.cuit || 'Verificado'}
                  </span>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleDownloadSocioConsolidatedPdf(client.id);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-mono font-black uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={10} />
                    <span>Descargar Legajo PDF</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BARRA DE CATEGORÍAS Y BUSCADOR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'TAD_ARICCAME', 'LICENCIA_OFICIAL', 'CONTRATO_SOCIO', 'DNI_IDENTIDAD', 'FACTURA_REMITO', 'MUESTRA_CAMPO'] as const).map(cat => {
            const count = cat === 'ALL'
              ? allUnifiedItems.filter(i => selectedClientId === 'ALL' || String(i.clientId) === String(selectedClientId)).length
              : allUnifiedItems.filter(i => i.category === cat && (selectedClientId === 'ALL' || String(i.clientId) === String(selectedClientId))).length;
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-2 rounded-xl text-[11px] font-mono font-bold uppercase transition flex items-center gap-1.5 border cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                }`}
              >
                <span>{CATEGORY_META[cat].shortLabel}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${active ? 'bg-emerald-800 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por socio, número de guía TAD, DNI, parcela, contrato o código de muestra..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* TABLA UNIFICADA DE DOCUMENTOS Y LEGAJOS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-4">Fecha / Código</th>
                <th className="px-5 py-4">Categoría</th>
                <th className="px-5 py-4">Documento & Detalle del Proceso</th>
                <th className="px-5 py-4">Socio / Estructura</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4 text-right">Acciones & Descarga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400 font-mono">
                    No se encontraron documentos para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4 font-mono whitespace-nowrap">
                      <span className="font-black text-slate-800 dark:text-slate-100 block">
                        {item.code}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        📅 {formatDateAr(item.date)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border ${CATEGORY_META[item.category]?.badgeClass || CATEGORY_META.OTRO.badgeClass}`}>
                        {item.categoryLabel}
                      </span>
                    </td>

                    <td className="px-5 py-4 max-w-md">
                      <p className="font-black text-slate-900 dark:text-white text-xs">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {item.subtitle}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        {item.clientName}
                      </span>
                      {item.plotName && (
                        <button
                          type="button"
                          onClick={() => item.plotId && navigate(`/plots/${item.plotId}`)}
                          className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                        >
                          <Sprout size={10} /> Parcela: {item.plotName}
                        </button>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                        item.statusTone === 'emerald'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : item.statusTone === 'amber'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                      }`}>
                        {item.statusLabel}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.sourceType === 'user_dni' && (isAdmin || String(item.userId) === String(currentUser?.id)) && (
                          <button
                            type="button"
                            onClick={() => {
                              const u = item.rawRef as User;
                              setDniModalUser(u);
                              setDniForm({
                                dniNumber: u.dniNumber || '',
                                dniFrenteUrl: u.dniFrenteUrl || '',
                                dniDorsoUrl: u.dniDorsoUrl || ''
                              });
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-mono font-black uppercase flex items-center gap-1 cursor-pointer"
                          >
                            <Camera size={12} />
                            <span>Subir Frente/Dorso</span>
                          </button>
                        )}

                        {item.fileDataUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewItem(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={12} />
                            <span>Ver</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDownloadItemPdf(item)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-black uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <Download size={12} />
                          <span>Descargar PDF</span>
                        </button>

                        {item.sourceType === 'custom_vault' && isAdmin && (
                          <button
                            type="button"
                            onClick={() => deleteVaultDocument(item.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            title="Eliminar documento"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA SUBIR DOCUMENTO OFICIAL (TAD / LICENCIA / CONTRATO / FACTURA) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 md:p-8 border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-600 text-white">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                    Incorporar Documento al Legajo del Socio
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Guías TAD aprobadas (ARICCAME), Licencias Oficiales, Contratos, Remitos o Facturas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUploadedDoc} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    Categoría Documental *
                  </label>
                  <select
                    value={uploadForm.category}
                    onChange={e => setUploadForm({ ...uploadForm, category: e.target.value as VaultDocumentCategory })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="TAD_ARICCAME">Guía TAD Aprobada / Remito (ARICCAME)</option>
                    <option value="LICENCIA_OFICIAL">Licencia Oficial / Autorización (INASE / RENSPA)</option>
                    <option value="CONTRATO_SOCIO">Contrato Productivo / Convenio</option>
                    <option value="FACTURA_REMITO">Factura / Comprobante Operativo</option>
                    <option value="MUESTRA_CAMPO">Muestra de Campo / Certificado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    Socio / Establecimiento Destino *
                  </label>
                  <select
                    value={uploadForm.clientId}
                    onChange={e => setUploadForm({ ...uploadForm, clientId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {visibleClients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    Título del Documento *
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadForm.title}
                    onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="Ej: Disposición TAD ARICCAME Tránsito Semilla..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    N° Expediente / Código Oficial
                  </label>
                  <input
                    type="text"
                    value={uploadForm.documentCode}
                    onChange={e => setUploadForm({ ...uploadForm, documentCode: e.target.value })}
                    placeholder="Ej: EX-2026-048291-APN-ARICCAME"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                  Archivo PDF o Imagen Escaneada *
                </label>
                <label className="w-full p-4 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-emerald-50 transition">
                  <Upload size={22} className="text-emerald-600 mb-1" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    {uploadForm.fileName ? `✓ Archivo listo: ${uploadForm.fileName} (${uploadForm.fileSizeKb} KB)` : 'Seleccionar PDF o Fotografía desde el dispositivo'}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const isImg = file.type.startsWith('image/');
                      const dataUrl = isImg ? await compressImageToDataUrl(file) : await readFileAsDataUrl(file);
                      setUploadForm(prev => ({
                        ...prev,
                        fileName: file.name,
                        fileType: isImg ? 'image' : 'pdf',
                        fileDataUrl: dataUrl,
                        fileSizeKb: Math.max(1, Math.round(file.size / 1024))
                      }));
                    }}
                  />
                </label>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                  Observaciones / Alcance Legal
                </label>
                <input
                  type="text"
                  value={uploadForm.notes}
                  onChange={e => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  placeholder="Detalle adicional para auditoría..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-500 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadForm.fileDataUrl}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-mono font-black uppercase cursor-pointer"
                >
                  {isUploading ? 'Guardando...' : 'Guardar en Legajo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RÁPIDO PARA SUBIR / CAPTURAR DNI FRENTE Y DORSO */}
      {dniModalUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 md:p-8 border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                    Impactar DNI Frente y Dorso — {dniModalUser.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Documentación complementaria obligatoria en la ficha del socio / operador
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDniModalUser(null)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDniModal} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                  Número de DNI
                </label>
                <input
                  type="text"
                  value={dniForm.dniNumber}
                  onChange={e => setDniForm({ ...dniForm, dniNumber: e.target.value })}
                  placeholder="Ej: 31.984.102"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <span className="text-[10px] font-mono font-black uppercase text-emerald-600 block">
                    1. DNI Frente (Anverso)
                  </span>
                  {dniForm.dniFrenteUrl ? (
                    <img src={dniForm.dniFrenteUrl} alt="DNI Frente" className="w-full h-36 object-contain bg-slate-950 rounded-xl" />
                  ) : (
                    <div className="h-36 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs text-slate-400">
                      Sin foto de Frente
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <label className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-mono font-black uppercase text-center cursor-pointer">
                      Cámara Celular
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={async e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const dataUrl = await compressImageToDataUrl(f);
                          setDniForm(prev => ({ ...prev, dniFrenteUrl: dataUrl }));
                        }}
                      />
                    </label>
                    <label className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-mono font-bold uppercase text-center cursor-pointer">
                      Subir Archivo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const dataUrl = await compressImageToDataUrl(f);
                          setDniForm(prev => ({ ...prev, dniFrenteUrl: dataUrl }));
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <span className="text-[10px] font-mono font-black uppercase text-emerald-600 block">
                    2. DNI Dorso (Reverso)
                  </span>
                  {dniForm.dniDorsoUrl ? (
                    <img src={dniForm.dniDorsoUrl} alt="DNI Dorso" className="w-full h-36 object-contain bg-slate-950 rounded-xl" />
                  ) : (
                    <div className="h-36 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs text-slate-400">
                      Sin foto de Dorso
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <label className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-mono font-black uppercase text-center cursor-pointer">
                      Cámara Celular
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={async e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const dataUrl = await compressImageToDataUrl(f);
                          setDniForm(prev => ({ ...prev, dniDorsoUrl: dataUrl }));
                        }}
                      />
                    </label>
                    <label className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-mono font-bold uppercase text-center cursor-pointer">
                      Subir Archivo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const dataUrl = await compressImageToDataUrl(f);
                          setDniForm(prev => ({ ...prev, dniDorsoUrl: dataUrl }));
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDniModalUser(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-500 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingDni}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-black uppercase cursor-pointer"
                >
                  {isSavingDni ? 'Guardando...' : 'Guardar DNI en Ficha de Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RÁPIDO PARA CAPTURAR MUESTRA DE CAMPO DESDE EL CELULAR */}
      {isSampleModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 md:p-8 border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-sky-600 text-white">
                  <Camera size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                    Registrar Muestra Fotográfica de Campo (Bitácora Parcela)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Captura directa desde celular vinculada a la parcela y al legajo del socio
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSampleModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickSample} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    Parcela Muestreada *
                  </label>
                  <select
                    required
                    value={sampleForm.plotId}
                    onChange={e => setSampleForm({ ...sampleForm, plotId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {plots.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    Código de Muestra
                  </label>
                  <input
                    type="text"
                    value={sampleForm.sampleCode}
                    onChange={e => setSampleForm({ ...sampleForm, sampleCode: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    Tipo de Muestra
                  </label>
                  <select
                    value={sampleForm.sampleType}
                    onChange={e => setSampleForm({ ...sampleForm, sampleType: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Muestra Fenológica / Biometría">Muestra Fenológica / Biometría</option>
                    <option value="Inspección Sanitaria / MIP">Inspección Sanitaria / MIP</option>
                    <option value="Muestra de Suelo / Raíz">Muestra de Suelo / Raíz</option>
                    <option value="Muestra Pre-Cosecha / Tricomas">Muestra Pre-Cosecha / Tricomas</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    Estadio Fenológico
                  </label>
                  <select
                    value={sampleForm.phenologicalStage}
                    onChange={e => setSampleForm({ ...sampleForm, phenologicalStage: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Emergencia">Emergencia</option>
                    <option value="Vegetativo">Vegetativo</option>
                    <option value="Floración">Floración</option>
                    <option value="Maduración">Maduración</option>
                    <option value="Cosecha">Cosecha</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                  Observación Técnica de la Muestra *
                </label>
                <input
                  type="text"
                  required
                  value={sampleForm.note}
                  onChange={e => setSampleForm({ ...sampleForm, note: e.target.value })}
                  placeholder="Ej: Muestra de ápice floral tomada desde celular..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                {sampleForm.photoUrl && (
                  <img src={sampleForm.photoUrl} alt="Muestra" className="w-full h-44 object-cover rounded-2xl border border-slate-200" />
                )}
                <div className="grid grid-cols-2 gap-2">
                  <label className="px-3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-black uppercase text-center cursor-pointer flex items-center justify-center gap-1.5">
                    <Camera size={14} />
                    <span>Tomar Foto (Celular)</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={async e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const dataUrl = await compressImageToDataUrl(f);
                        setSampleForm(prev => ({ ...prev, photoUrl: dataUrl }));
                      }}
                    />
                  </label>
                  <label className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-mono font-bold uppercase text-center cursor-pointer flex items-center justify-center gap-1.5">
                    <Upload size={14} />
                    <span>Subir de Galería</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const dataUrl = await compressImageToDataUrl(f);
                        setSampleForm(prev => ({ ...prev, photoUrl: dataUrl }));
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSampleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-500 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingSample}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-black uppercase cursor-pointer"
                >
                  {isSavingSample ? 'Guardando...' : 'Impactar en Bitácora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VISOR LIGHTBOX DE DOCUMENTO / IMAGEN */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 block">
                  {previewItem.categoryLabel} · {previewItem.code}
                </span>
                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                  {previewItem.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadItemPdf(previewItem)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-black uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Descargar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {previewItem.sourceType === 'user_dni' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-bold uppercase text-slate-500">DNI Frente</span>
                  <div className="h-64 bg-slate-950 rounded-2xl flex items-center justify-center overflow-hidden">
                    {previewItem.fileDataUrl ? (
                      <img src={previewItem.fileDataUrl} alt="DNI Frente" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-slate-400">Sin imagen</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-bold uppercase text-slate-500">DNI Dorso</span>
                  <div className="h-64 bg-slate-950 rounded-2xl flex items-center justify-center overflow-hidden">
                    {previewItem.secondaryDataUrl ? (
                      <img src={previewItem.secondaryDataUrl} alt="DNI Dorso" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-slate-400">Sin imagen</span>
                    )}
                  </div>
                </div>
              </div>
            ) : previewItem.fileDataUrl?.startsWith('data:application/pdf') ? (
              <iframe
                src={previewItem.fileDataUrl}
                title={previewItem.title}
                className="w-full h-[70vh] rounded-2xl border border-slate-200 dark:border-slate-800"
              />
            ) : (
              <div className="max-h-[70vh] bg-slate-950 rounded-2xl flex items-center justify-center overflow-hidden p-2">
                <img src={previewItem.fileDataUrl} alt={previewItem.title} className="max-h-[66vh] object-contain rounded-xl" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
