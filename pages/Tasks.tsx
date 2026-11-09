import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  Task,
  AgriculturalLaborType,
  LaborStatus,
  HempStageId,
  AgrochemicalCategory,
  ToxicologicalBand,
  Resource
} from '../types';
import { 
  HEMP_PHENOLOGICAL_STAGES, 
  AGRICULTURAL_LABOR_INFO 
} from '../src/data/phenologyData';
import { 
  Plus, CheckSquare, Clock, CheckCircle, Circle, AlertCircle, Calendar,
  Tractor, Sprout, Droplets, ShieldAlert, Waves, Wrench, Search, Scissors,
  Package, Filter, Check, X, FileText, ChevronRight, UserCheck, Fuel,
  Gauge, Wind, Thermometer, MapPin, Building2, User, DollarSign, ShieldCheck,
  Sparkles, ExternalLink, BellRing, Bell, Mail, FlaskConical, ArrowUpRight, AlertTriangle
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  dispatchPushNotification, 
  evaluateUpcomingTasksReminders 
} from '../src/services/pushNotificationService';
import { sendLaborAssignedEmail, isRealEmailDelivery } from '../src/services/emailNotificationService';
import { canAccessTask, canAccessPlot } from '../src/utils/structurePermissions';
import { partitionUsersByScope } from '../src/services/eventsManagementService';
import { DateInputAr } from '../src/components/DateInputAr';
import { formatDateAr } from '../src/utils/dateFormat';

export default function Tasks() {
  const { 
    tasks, addTask, updateTask, deleteTask, homologateLabor, 
    currentUser, usersList, plots, varieties, switchUserRole, impersonatingAdmin,
    locations, clients, resources, suppliers, agrochemicalApplications
  } = useAppContext();

  const [pushFeedback, setPushFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  // Filters & Views
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPlotId, setFilterPlotId] = useState<string>(searchParams.get('plotId') || 'all');

  useEffect(() => {
    const p = searchParams.get('plotId');
    if (p) {
      setFilterPlotId(p);
    }
  }, [searchParams]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHomologateModalOpen, setIsHomologateModalOpen] = useState(false);
  const [selectedLaborForHomologate, setSelectedLaborForHomologate] = useState<Task | null>(null);
  const [homologationNotes, setHomologationNotes] = useState('');
  const [activeFormTab, setActiveFormTab] = useState<'general' | 'machinery' | 'inputs' | 'phenology'>('general');
  const [inputCategoryFilter, setInputCategoryFilter] = useState<string>('all');

  // Form State
  const [formData, setFormData] = useState<{
    id?: string;
    title: string;
    description: string;
    status: LaborStatus;
    priority: 'Alta' | 'Media' | 'Baja';
    dueDate: string;
    executionDate: string;
    plotId: string;
    operator: string;
    laborType: AgriculturalLaborType;
    targetStage?: HempStageId;
    advancesPhenologicalStage: boolean;
    newPhenologicalStage?: HempStageId;
    tractor: string;
    implement: string;
    fuelLiters: number;
    machineHours: number;
    tempC: number;
    humidityPct: number;
    windSpeedKmh: number;
    windDirection: string;
    resourceId: string;
    inputCategory: AgrochemicalCategory;
    inputName: string;
    activeIngredient: string;
    senasaRegisterNumber: string;
    batchNumber: string;
    supplierId: string;
    supplierName: string;
    manufacturer: string;
    toxicologicalClass: ToxicologicalBand;
    dosagePerHa: number;
    dosageUnit: 'L/ha' | 'kg/ha' | 'ml/ha' | 'g/ha' | 'cc/ha' | 't/ha';
    safetyPeriodDays: number;
    applicationMethod: 'Pulverización Terrestre' | 'Pulverización Aérea' | 'Fertirriego' | 'Incorporación Edáfica' | 'Manual / Follaje' | 'Mochila Manual' | 'Dron Agrícola';
    targetPestOrDisease: string;
    responsibleAgronomist: string;
    agronomistLicense: string;
    inputQuantity: number;
    inputUnit: string;
    inputCostPerUnit: number;
    directCostUsd: number;
    syncWithExpenses: boolean;
    syncWithPhytosanitary: boolean;
    notes: string;
  }>({
    title: '',
    description: '',
    status: 'Pendiente',
    priority: 'Media',
    dueDate: new Date().toISOString().split('T')[0],
    executionDate: new Date().toISOString().split('T')[0],
    plotId: plots[0]?.id || '',
    operator: currentUser?.name || '',
    laborType: 'LABOR_CULTURAL',
    targetStage: 'BBCH_10_19',
    advancesPhenologicalStage: false,
    newPhenologicalStage: 'BBCH_20_39',
    tractor: 'John Deere 6130M',
    implement: 'Carpidora Inter-filas',
    fuelLiters: 45,
    machineHours: 4.0,
    tempC: 24,
    humidityPct: 52,
    windSpeedKmh: 10,
    windDirection: 'NE',
    resourceId: '',
    inputCategory: 'Bioestimulante',
    inputName: '',
    activeIngredient: '',
    senasaRegisterNumber: '',
    batchNumber: '',
    supplierId: '',
    supplierName: '',
    manufacturer: '',
    toxicologicalClass: 'Biológico / Orgánico Certificado',
    dosagePerHa: 0,
    dosageUnit: 'L/ha',
    safetyPeriodDays: 0,
    applicationMethod: 'Pulverización Terrestre',
    targetPestOrDisease: '',
    responsibleAgronomist: currentUser?.name || 'Dirección Técnica Cooperativa',
    agronomistLicense: 'MP-CIAFBA',
    inputQuantity: 0,
    inputUnit: 'L',
    inputCostPerUnit: 0,
    directCostUsd: 180,
    syncWithExpenses: true,
    syncWithPhytosanitary: false,
    notes: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const canSimulatePerspective = Boolean(isAdmin || impersonatingAdmin);
  const isSocio = !isAdmin;
  const activeSystemUsers = useMemo(
    () =>
      partitionUsersByScope(usersList || []).systemUsers.filter(
        u => u.accountStatus !== 'pending_approval' && u.accountStatus !== 'rejected'
      ),
    [usersList]
  );

  const handleEvaluatePush = async () => {
    const alerts = await evaluateUpcomingTasksReminders(tasks, { force: true });
    setPushFeedback(`Se evaluaron las labores: ${alerts.length > 0 ? `${alerts.length} recordatorio(s) push emitido(s)` : 'Todas las labores al día'}.`);
    setTimeout(() => setPushFeedback(null), 4000);
  };

  const handlePushIndividual = async (labor: Task) => {
    await dispatchPushNotification({
      title: `⏰ Recordatorio Labor: ${labor.title}`,
      body: `Labor programada (${labor.priority}) para el ${labor.dueDate}. Operario: ${labor.operator || 'Equipo de Campo'}.`,
      category: 'task_reminder',
      severity: labor.priority === 'Alta' ? 'warning' : 'info',
      taskId: labor.id,
      taskTitle: labor.title,
      plotId: labor.plotId,
      targetUrl: '/tasks',
      actionLabel: 'Ver Labor'
    });
    setPushFeedback(`Recordatorio push emitido para "${labor.title}".`);
    setTimeout(() => setPushFeedback(null), 3000);
  };

  const handleEmailIndividual = async (labor: Task) => {
    const plot = plots.find(p => p.id === labor.plotId);
    const assignedUser = usersList.find(
      u => u.name.toLowerCase() === (labor.operator || '').toLowerCase()
    );
    const recipientEmail = assignedUser?.email || currentUser?.email || 'xpatagonia.com@gmail.com';
    const recipientName = assignedUser?.name || labor.operator || currentUser?.name || 'Operario de Campo';

    setPushFeedback(`Enviando orden de labor "${labor.title}" a ${recipientEmail} vía Resend.com...`);
    const res = await sendLaborAssignedEmail({
      toEmail: recipientEmail,
      toName: recipientName,
      taskTitle: labor.title,
      description: labor.description,
      plotName: plot?.name || 'Parcela Operativa',
      dueDate: labor.dueDate,
      priority: labor.priority,
      machinery: labor.machinery?.tractor,
      operator: labor.operator || recipientName
    });

    if (res.success && isRealEmailDelivery(res.deliveredVia)) {
      setPushFeedback(`✅ Orden de labor enviada a ${recipientEmail} vía Vercel + Resend.com (notificaciones@hempc.com.ar).`);
    } else {
      setPushFeedback(`ℹ️ Orden registrada para ${recipientEmail} (${res.message}).`);
    }
    setTimeout(() => setPushFeedback(null), 5000);
  };

  // Role and structure assigned plots
  const availablePlots = useMemo(() => {
    return plots.filter(p => canAccessPlot(currentUser, p, locations, clients));
  }, [plots, currentUser, locations, clients]);

  // Selected plot for form
  const currentSelectedPlot = useMemo(() => {
    return plots.find(p => p.id === formData.plotId);
  }, [plots, formData.plotId]);

  const currentPlotAreaHa = useMemo(() => {
    if (!currentSelectedPlot) return 1;
    let area = currentSelectedPlot.surfaceArea || 1;
    if (currentSelectedPlot.surfaceUnit === 'm2') area = area / 10000;
    else if (currentSelectedPlot.surfaceUnit === 'ac') area = area * 0.404686;
    return Math.max(0.1, Number(area.toFixed(2)));
  }, [currentSelectedPlot]);

  // Catálogo de Insumos homologados en Inventario (excluyendo servicios de maquinaria 'Labor')
  const catalogInputResources = useMemo(() => {
    return resources.filter(r => r.type !== 'Labor');
  }, [resources]);

  const filteredCatalogResources = useMemo(() => {
    if (inputCategoryFilter === 'all') return catalogInputResources;
    return catalogInputResources.filter(r => r.agroCategory === inputCategoryFilter);
  }, [catalogInputResources, inputCategoryFilter]);

  const selectedResourceObj = useMemo(() => {
    if (!formData.resourceId) return undefined;
    return resources.find(r => r.id === formData.resourceId);
  }, [resources, formData.resourceId]);

  const applyResourceToTaskForm = (res: Resource | undefined, targetPlotId?: string) => {
    const plotObj = plots.find(p => p.id === (targetPlotId || formData.plotId));
    let areaHa = plotObj?.surfaceArea || 1;
    if (plotObj?.surfaceUnit === 'm2') areaHa = areaHa / 10000;
    else if (plotObj?.surfaceUnit === 'ac') areaHa = areaHa * 0.404686;
    areaHa = Math.max(0.1, Number(areaHa.toFixed(2)));

    if (!res) {
      setFormData(prev => ({
        ...prev,
        resourceId: '',
        inputName: '',
        activeIngredient: '',
        senasaRegisterNumber: '',
        batchNumber: '',
        supplierId: '',
        supplierName: '',
        manufacturer: '',
        dosagePerHa: 0,
        inputQuantity: 0,
        inputCostPerUnit: 0
      }));
      return;
    }

    const linkedSupplier = suppliers.find(
      s => s.id === res.supplierId || (res.supplierName && s.name.toLowerCase() === res.supplierName.toLowerCase())
    );
    const dosage = res.recommendedDosagePerHa ?? 2;
    const totalQty = Number((dosage * areaHa).toFixed(2));
    const unitCost = res.costPerUnit || 0;
    const laborInfo = AGRICULTURAL_LABOR_INFO[formData.laborType];
    const baseLaborCost = Math.round(areaHa * (laborInfo?.defaultCostPerHa || 18));
    const totalInputCost = Math.round(totalQty * unitCost);

    setFormData(prev => ({
      ...prev,
      resourceId: res.id,
      inputCategory: res.agroCategory || prev.inputCategory || 'Bioestimulante',
      inputName: res.name,
      activeIngredient: res.activeIngredient || 'Insumo Agrícola Homologado',
      senasaRegisterNumber: res.senasaRegisterNumber || 'SENASA-OFICIAL',
      batchNumber: res.batchNumber || 'LOT-OFICIAL',
      supplierId: linkedSupplier?.id || res.supplierId || '',
      supplierName: linkedSupplier?.name || res.supplierName || 'Proveedor Homologado en BD',
      manufacturer: res.manufacturer || linkedSupplier?.name || 'Elaborador Homologado',
      toxicologicalClass: res.toxicologicalClass || 'Biológico / Orgánico Certificado',
      dosagePerHa: dosage,
      dosageUnit: res.dosageUnit || (res.unit === 'kg' ? 'kg/ha' : 'L/ha'),
      safetyPeriodDays: res.safetyPeriodDays ?? 0,
      applicationMethod: res.applicationMethod || (prev.laborType === 'FERTIRRIEGO' ? 'Fertirriego' : 'Pulverización Terrestre'),
      targetPestOrDisease: res.targetPestOrDisease || prev.targetPestOrDisease || '',
      inputQuantity: totalQty,
      inputUnit: res.unit === 'lts' ? 'L' : res.unit,
      inputCostPerUnit: unitCost,
      directCostUsd: baseLaborCost + totalInputCost,
      syncWithPhytosanitary:
        prev.laborType === 'FITOSANITARIO' ||
        prev.laborType === 'FERTIRRIEGO' ||
        res.type === 'Fitosanitario' ||
        res.type === 'Fertilizante' ||
        Boolean(res.agroCategory)
    }));
  };

  // KPI calculations
  const kpis = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'Pendiente' || t.status === 'En_Curso' || t.status === 'Planificada').length;
    const executed = tasks.filter(t => t.status === 'Ejecutada').length;
    const homologated = tasks.filter(t => t.status === 'Homologada' || t.status === 'Completada').length;
    const totalFuel = tasks.reduce((sum, t) => sum + (t.machinery?.fuelConsumptionLiters || 0), 0);
    const totalHours = tasks.reduce((sum, t) => sum + (t.machinery?.machineHours || 0), 0);
    const totalCostUsd = tasks.reduce((sum, t) => sum + (t.directCostUsd || 0), 0);

    return { total, pending, executed, homologated, totalFuel, totalHours, totalCostUsd };
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // Status
      if (filterStatus !== 'all') {
        if (filterStatus === 'pending' && !(t.status === 'Pendiente' || t.status === 'En_Curso' || t.status === 'Planificada')) return false;
        if (filterStatus === 'executed' && t.status !== 'Ejecutada') return false;
        if (filterStatus === 'homologated' && !(t.status === 'Homologada' || t.status === 'Completada')) return false;
      }

      // Labor type
      if (filterType !== 'all' && t.laborType !== filterType) return false;

      // Plot
      if (filterPlotId !== 'all' && t.plotId !== filterPlotId) return false;

      // Aislamiento de Estructura: Los operarios solo acceden a labores del campo asociado
      if (!canAccessTask(currentUser, t, plots, locations, clients)) {
        return false;
      }

      // Search term
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const titleMatch = t.title.toLowerCase().includes(query);
        const descMatch = (t.description || '').toLowerCase().includes(query);
        const operatorMatch = (t.operator || '').toLowerCase().includes(query);
        const tractorMatch = (t.machinery?.tractor || '').toLowerCase().includes(query);
        const plotMatch = (plots.find(p => p.id === t.plotId)?.name || '').toLowerCase().includes(query);
        const inputMatch = (t.appliedInputs?.[0]?.name || '').toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !operatorMatch && !tractorMatch && !plotMatch && !inputMatch) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [tasks, filterStatus, filterType, filterPlotId, searchTerm, isSocio, currentUser, plots, locations, clients]);

  // Form handlers
  const handleOpenNewModal = (prefillPlotId?: string, prefillLaborType?: AgriculturalLaborType) => {
    setFormError(null);
    const targetPlot = plots.find(p => p.id === (prefillPlotId || availablePlots[0]?.id));
    const plotStage = targetPlot?.currentPhenologicalStage || 'BBCH_10_19';
    
    // Siguiente estadio sugerido
    const currentIdx = HEMP_PHENOLOGICAL_STAGES.findIndex(s => s.id === plotStage);
    const nextStage = currentIdx >= 0 && currentIdx < HEMP_PHENOLOGICAL_STAGES.length - 1 
      ? HEMP_PHENOLOGICAL_STAGES[currentIdx + 1].id 
      : plotStage;

    const labor = prefillLaborType || 'LABOR_CULTURAL';
    const laborInfo = AGRICULTURAL_LABOR_INFO[labor];
    const isPhytoOrFert = labor === 'FITOSANITARIO' || labor === 'FERTIRRIEGO';
    const defaultRes = isPhytoOrFert ? catalogInputResources[0] : undefined;

    let areaHa = targetPlot?.surfaceArea || 1;
    if (targetPlot?.surfaceUnit === 'm2') areaHa = areaHa / 10000;
    else if (targetPlot?.surfaceUnit === 'ac') areaHa = areaHa * 0.404686;
    areaHa = Math.max(0.1, Number(areaHa.toFixed(2)));

    const dosage = defaultRes ? (defaultRes.recommendedDosagePerHa ?? 2) : 0;
    const totalQty = defaultRes ? Number((dosage * areaHa).toFixed(2)) : 0;

    setFormData({
      title: `${laborInfo.name} - ${targetPlot?.name || 'Lote'}`,
      description: `Orden de labor técnica para el lote ${targetPlot?.name || ''}.`,
      status: isSocio ? 'Ejecutada' : 'Planificada',
      priority: 'Media',
      dueDate: new Date().toISOString().split('T')[0],
      executionDate: new Date().toISOString().split('T')[0],
      plotId: targetPlot?.id || '',
      operator: currentUser?.name || 'Operario de Campo',
      laborType: labor,
      targetStage: plotStage,
      advancesPhenologicalStage: false,
      newPhenologicalStage: nextStage,
      tractor: laborInfo.typicalMachinery.split('+')[0]?.trim() || 'Tractor Estándar',
      implement: laborInfo.typicalMachinery.split('+')[1]?.trim() || 'Implemento Agrícola',
      fuelLiters: Math.round(areaHa * 8),
      machineHours: Math.round(areaHa * 0.7 * 10) / 10,
      tempC: 23,
      humidityPct: 55,
      windSpeedKmh: 10,
      windDirection: 'NE',
      resourceId: defaultRes?.id || '',
      inputCategory: defaultRes?.agroCategory || 'Bioestimulante',
      inputName: defaultRes?.name || '',
      activeIngredient: defaultRes?.activeIngredient || '',
      senasaRegisterNumber: defaultRes?.senasaRegisterNumber || '',
      batchNumber: defaultRes?.batchNumber || '',
      supplierId: defaultRes?.supplierId || '',
      supplierName: defaultRes?.supplierName || '',
      manufacturer: defaultRes?.manufacturer || '',
      toxicologicalClass: defaultRes?.toxicologicalClass || 'Biológico / Orgánico Certificado',
      dosagePerHa: dosage,
      dosageUnit: defaultRes?.dosageUnit || 'L/ha',
      safetyPeriodDays: defaultRes?.safetyPeriodDays ?? 0,
      applicationMethod: defaultRes?.applicationMethod || (labor === 'FERTIRRIEGO' ? 'Fertirriego' : 'Pulverización Terrestre'),
      targetPestOrDisease: defaultRes?.targetPestOrDisease || '',
      responsibleAgronomist: targetPlot?.technicalResponsibleName || currentUser?.name || 'Dirección Técnica Cooperativa',
      agronomistLicense: 'MP-CIAFBA',
      inputQuantity: totalQty,
      inputUnit: defaultRes ? (defaultRes.unit === 'lts' ? 'L' : defaultRes.unit) : 'L',
      inputCostPerUnit: defaultRes?.costPerUnit || 0,
      directCostUsd: Math.round(areaHa * laborInfo.defaultCostPerHa + totalQty * (defaultRes?.costPerUnit || 0)),
      syncWithExpenses: true,
      syncWithPhytosanitary: isPhytoOrFert,
      notes: ''
    });
    setActiveFormTab('general');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.title || !formData.plotId) return;

    const requiresCatalogInput =
      formData.laborType === 'FITOSANITARIO' ||
      formData.laborType === 'FERTIRRIEGO' ||
      formData.syncWithPhytosanitary;

    const matchedResource =
      resources.find(r => r.id === formData.resourceId) ||
      resources.find(r => formData.inputName && r.name.toLowerCase() === formData.inputName.toLowerCase());

    if (requiresCatalogInput && !matchedResource) {
      setActiveFormTab('inputs');
      setFormError(
        'Normativa SENASA / Trazabilidad: Para registrar una labor Fitosanitaria, de Fertirriego o vinculada al Cuaderno Fitosanitario es obligatorio seleccionar un Insumo previamente dado de alta en Insumos e Inventario y vinculado a un Proveedor Homologado.'
      );
      return;
    }

    const isExecuting =
      formData.status === 'Ejecutada' ||
      formData.status === 'Homologada' ||
      formData.status === 'Completada';

    if (matchedResource && isExecuting && Number(formData.inputQuantity) > (matchedResource.stock ?? 0) && !formData.id) {
      setActiveFormTab('inputs');
      setFormError(
        `Stock insuficiente en Insumos e Inventario para "${matchedResource.name}": requerido ${formData.inputQuantity} ${formData.inputUnit}, disponible en galpón ${matchedResource.stock ?? 0} ${matchedResource.unit}. Actualice el stock en Insumos e Inventario o ajuste la dosis.`
      );
      return;
    }

    const linkedSupplier = matchedResource
      ? suppliers.find(
          s =>
            s.id === matchedResource.supplierId ||
            (matchedResource.supplierName && s.name.toLowerCase() === matchedResource.supplierName.toLowerCase())
        )
      : undefined;

    const taskPayload: Task = {
      id: formData.id || `labor-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      assignedToIds: [currentUser?.id || 'unknown'],
      dueDate: formData.dueDate,
      executionDate: formData.executionDate || formData.dueDate,
      plotId: formData.plotId,
      createdBy: currentUser?.id || 'system',
      laborType: formData.laborType,
      targetStage: formData.targetStage,
      advancesPhenologicalStage: formData.advancesPhenologicalStage,
      newPhenologicalStage: formData.advancesPhenologicalStage ? formData.newPhenologicalStage : undefined,
      machinery: {
        tractor: formData.tractor,
        implement: formData.implement,
        fuelConsumptionLiters: Number(formData.fuelLiters) || 0,
        machineHours: Number(formData.machineHours) || 0
      },
      operator: formData.operator,
      weather: {
        tempC: Number(formData.tempC) || 0,
        humidityPct: Number(formData.humidityPct) || 0,
        windSpeedKmh: Number(formData.windSpeedKmh) || 0,
        windDirection: formData.windDirection,
        suitableForSpraying: Number(formData.windSpeedKmh) <= 15
      },
      appliedInputs: matchedResource
        ? [
            {
              resourceId: matchedResource.id,
              name: matchedResource.name,
              category: matchedResource.agroCategory || formData.inputCategory,
              activeIngredient: matchedResource.activeIngredient || formData.activeIngredient,
              senasaRegisterNumber: matchedResource.senasaRegisterNumber || formData.senasaRegisterNumber,
              batchNumber: matchedResource.batchNumber || formData.batchNumber,
              supplierId: linkedSupplier?.id || matchedResource.supplierId || formData.supplierId,
              supplierName: linkedSupplier?.name || matchedResource.supplierName || formData.supplierName,
              manufacturer: matchedResource.manufacturer || formData.manufacturer,
              toxicologicalClass: matchedResource.toxicologicalClass || formData.toxicologicalClass,
              dosagePerHa: Number(formData.dosagePerHa) || matchedResource.recommendedDosagePerHa || 1,
              dosageUnit: formData.dosageUnit || matchedResource.dosageUnit || 'L/ha',
              safetyPeriodDays: Number(formData.safetyPeriodDays ?? matchedResource.safetyPeriodDays ?? 0),
              applicationMethod: formData.applicationMethod || matchedResource.applicationMethod || 'Pulverización Terrestre',
              targetPestOrDisease: formData.targetPestOrDisease || matchedResource.targetPestOrDisease,
              responsibleAgronomist: formData.responsibleAgronomist,
              agronomistLicense: formData.agronomistLicense,
              quantity: Number(formData.inputQuantity) || 0,
              unit: formData.inputUnit || (matchedResource.unit === 'lts' ? 'L' : matchedResource.unit),
              costPerUnit: Number(formData.inputCostPerUnit) || matchedResource.costPerUnit || 0
            }
          ]
        : [],
      directCostUsd: Number(formData.directCostUsd) || 0,
      syncWithExpenses: formData.syncWithExpenses,
      syncWithPhytosanitary: requiresCatalogInput || Boolean(matchedResource),
      notes: formData.notes
    };

    if (formData.id) {
      await updateTask(taskPayload);
    } else {
      await addTask(taskPayload);
    }

    setIsModalOpen(false);
  };

  const handleOpenHomologate = (labor: Task) => {
    setSelectedLaborForHomologate(labor);
    setHomologationNotes(labor.homologationNotes || 'Labor inspeccionada conforme con los estándares técnicos de la cooperativa.');
    setIsHomologateModalOpen(true);
  };

  const handleConfirmHomologation = async () => {
    if (!selectedLaborForHomologate) return;
    await homologateLabor(selectedLaborForHomologate.id, homologationNotes);
    setIsHomologateModalOpen(false);
    setSelectedLaborForHomologate(null);
  };

  const handleQuickStatusChange = async (task: Task, newStatus: LaborStatus) => {
    if (newStatus === 'Homologada' && isAdmin) {
      handleOpenHomologate(task);
    } else {
      await updateTask({
        ...task,
        status: newStatus,
        executionDate: newStatus === 'Ejecutada' ? new Date().toISOString().split('T')[0] : task.executionDate
      });
    }
  };

  // Helper for labor icon
  const getLaborIcon = (type?: AgriculturalLaborType) => {
    switch (type) {
      case 'PREPARACION_SUELO': return <Tractor size={18} className="text-amber-600" />;
      case 'SIEMBRA': return <Sprout size={18} className="text-emerald-600" />;
      case 'FERTIRRIEGO': return <Droplets size={18} className="text-blue-600" />;
      case 'FITOSANITARIO': return <ShieldAlert size={18} className="text-rose-600" />;
      case 'MANEJO_HIDRICO': return <Waves size={18} className="text-cyan-600" />;
      case 'LABOR_CULTURAL': return <Wrench size={18} className="text-orange-600" />;
      case 'MONITOREO': return <Search size={18} className="text-indigo-600" />;
      case 'COSECHA': return <Scissors size={18} className="text-purple-600" />;
      case 'ACONDICIONAMIENTO': return <Package size={18} className="text-stone-600" />;
      default: return <CheckSquare size={18} className="text-slate-600" />;
    }
  };

  const getStatusBadge = (status: LaborStatus) => {
    switch (status) {
      case 'Homologada':
      case 'Completada':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300">
            <CheckCircle size={12} className="mr-1 text-emerald-600" /> Homologada
          </span>
        );
      case 'Ejecutada':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/70 dark:text-blue-300">
            <Clock size={12} className="mr-1 text-blue-600" /> Ejecutada (En Revisión)
          </span>
        );
      case 'En_Curso':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 animate-pulse">
            <Tractor size={12} className="mr-1 text-amber-600" /> En Curso
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300">
            <Circle size={12} className="mr-1 text-slate-400" /> Planificada
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* BANNER DE IDENTIDAD Y SEGREGACIÓN DE ROLES */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-xl border border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                <Tractor size={14} /> GESTIÓN AGRONÓMICA & ÓRDENES DE CAMPO
              </span>
              <span className="text-xs text-slate-400">
                • Red Cooperativa Nucleus
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Labores de Campo & Partes Diarios
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Registro técnico de labores mecánicas, insumos aplicados y avance del <strong className="text-emerald-400 font-bold">Ciclo Biológico</strong> con imputación directa al Cuaderno Fitosanitario y Costos Operativos.
            </p>
          </div>

          {/* SIMULADOR DE PERSPECTIVA DE ROL (SOLO VISIBLE PARA ADMINISTRADORES) */}
          {canSimulatePerspective ? (
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700 p-3 rounded-xl flex flex-col gap-2 min-w-[280px]">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Simulador Admin:</span>
                <span className="text-emerald-400 font-mono text-[10px]">{currentUser?.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/30 flex items-center justify-center text-emerald-400 font-bold text-xs border border-emerald-500/30">
                  {isSocio ? <User size={16} /> : <Building2 size={16} />}
                </div>
                <select 
                  className="bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 p-1.5 flex-1 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={currentUser?.id}
                  onChange={(e) => switchUserRole(e.target.value)}
                >
                  {activeSystemUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.memberType === 'Socio_Productor' ? 'Socio' : u.memberType === 'Proveedor_Homologado' ? 'Semillero' : 'Cooperativa'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-[10px] text-slate-400">
                {isSocio 
                  ? '📍 Modo Socio/Técnico: Carga labores directas de sus lotes.'
                  : '🛡️ Modo Cooperativa: Homologación técnica y auditoría global.'}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700 p-3 rounded-xl flex flex-col gap-1 min-w-[240px]">
              <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                Alcance Aislado Activo
              </div>
              <div className="text-xs font-black text-white">
                {currentUser?.name} ({currentUser?.organizationName || 'Establecimiento'})
              </div>
              <div className="text-[10px] text-slate-400">
                📍 Operando exclusivamente sobre los lotes de su estructura ({plots.length} parcelas).
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STRIP DE KPIS OPERATIVOS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Labores</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{kpis.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">En registro</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Planificadas</div>
          <div className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">{kpis.pending}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Por ejecutar</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-sm bg-blue-50/20">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Ejecutadas</div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">{kpis.executed}</div>
          <div className="text-[10px] text-blue-500 mt-0.5">Pendientes homologar</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm bg-emerald-50/20">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Homologadas</div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{kpis.homologated}</div>
          <div className="text-[10px] text-emerald-500 mt-0.5">Certificadas Coop</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-sm">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Fuel size={12} /> Diésel Total
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{kpis.totalFuel} L</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Litros consumidos</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Gauge size={12} /> Horas Máquina
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{kpis.totalHours} h</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Operación en lote</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <DollarSign size={12} /> Inversión
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            ${kpis.totalCostUsd.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">USD imputados</div>
        </div>
      </div>

      {/* TOAST DE NOTIFICACIONES PUSH / RESEND.COM */}
      {pushFeedback && (
        <div className="bg-emerald-950/90 text-emerald-100 border border-emerald-500/40 rounded-2xl p-4 shadow-lg flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2.5">
            <Mail size={16} className="text-emerald-400 shrink-0" />
            <span>{pushFeedback}</span>
          </div>
          <button onClick={() => setPushFeedback(null)} className="text-emerald-300 hover:text-white">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ACCIONES Y FILTROS */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          {/* BUSCADOR */}
          <div className="relative flex-1 w-full md:max-w-md">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar por labor, lote, tractor, operario..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {/* LINK DIRECTO AL CICLO BIOLÓGICO */}
            <Link 
              to="/calendar" 
              className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold hover:bg-indigo-100 transition flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles size={14} /> Monitor Ciclo Biológico
            </Link>

            {/* BOTÓN EVALUAR RECORDATORIOS PUSH */}
            <button 
              onClick={handleEvaluatePush}
              title="Evaluar labores pendientes y emitir recordatorios push vía Service Worker"
              className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <BellRing size={14} /> Recordatorios Push
            </button>

            {/* BOTÓN NUEVA LABOR */}
            <button 
              onClick={() => handleOpenNewModal()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-md shadow-emerald-600/20"
            >
              <Plus size={16} /> + Nueva Labor Agronómica
            </button>
          </div>
        </div>

        {/* SELECTORES DE FILTRO */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mr-2">
            <Filter size={14} /> Filtrar:
          </div>

          {/* ESTADO */}
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="all">Todos los Estados</option>
            <option value="pending">Planificadas / En Curso</option>
            <option value="executed">Ejecutadas (Pendientes)</option>
            <option value="homologated">Homologadas Coop</option>
          </select>

          {/* TIPO DE LABOR */}
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="all">Todos los Tipos de Labor</option>
            <option value="PREPARACION_SUELO">Preparación de Suelo</option>
            <option value="SIEMBRA">Siembra</option>
            <option value="FERTIRRIEGO">Fertirriego / Nutrición</option>
            <option value="FITOSANITARIO">Fitosanitario / Bioinsumos</option>
            <option value="MANEJO_HIDRICO">Manejo Hídrico</option>
            <option value="LABOR_CULTURAL">Labor Cultural / Desmalezado</option>
            <option value="MONITOREO">Monitoreo & Sexado</option>
            <option value="COSECHA">Cosecha & Corte</option>
            <option value="ACONDICIONAMIENTO">Acondicionamiento Rastrojo</option>
          </select>

          {/* PARCELA */}
          <select 
            value={filterPlotId}
            onChange={(e) => setFilterPlotId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium focus:ring-1 focus:ring-emerald-500 outline-none max-w-[200px]"
          >
            <option value="all">Todas las Parcelas</option>
            {availablePlots.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* TOGGLE VISTA */}
          <div className="ml-auto flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button 
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded font-bold transition ${viewMode === 'cards' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500'}`}
            >
              Fichas
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded font-bold transition ${viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500'}`}
            >
              Tabla
            </button>
          </div>
        </div>
      </div>

      {/* LISTA / FICHAS DE LABORES */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          <Tractor size={48} className="mx-auto mb-3 text-slate-400 opacity-60" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No hay labores registradas con estos filtros</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Puedes cambiar los filtros o programar una nueva orden de labor técnica para tus parcelas.
          </p>
          <button 
            onClick={() => handleOpenNewModal()}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Crear Orden de Labor
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map(labor => {
            const plot = plots.find(p => p.id === labor.plotId);
            const laborInfo = labor.laborType ? AGRICULTURAL_LABOR_INFO[labor.laborType] : null;
            const targetStageObj = HEMP_PHENOLOGICAL_STAGES.find(s => s.id === labor.targetStage);
            const newStageObj = HEMP_PHENOLOGICAL_STAGES.find(s => s.id === labor.newPhenologicalStage);

            return (
              <div 
                key={labor.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4 relative overflow-hidden"
              >
                {/* Header ficha */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                        {getLaborIcon(labor.laborType)}
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {laborInfo?.category || 'Labor Agronómica'}
                        </span>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {formatDateAr(labor.dueDate)}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(labor.status)}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                    {labor.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {labor.description || 'Sin descripción detallada.'}
                  </p>

                  {/* PARCELA VINCULADA */}
                  {plot && (
                    <div className="mt-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="text-emerald-600 shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{plot.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({plot.surfaceArea} ha)</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">
                        {plot.ownerName?.split(' ')[0]}
                      </span>
                    </div>
                  )}

                  {/* IMPACTO EN EL CICLO BIOLÓGICO */}
                  {labor.advancesPhenologicalStage && newStageObj && (
                    <div className="mt-2.5 p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Sparkles size={13} className="text-emerald-600 shrink-0" />
                        <span>Avanza Ciclo Biológico:</span>
                      </div>
                      <span className="font-bold bg-emerald-200/60 dark:bg-emerald-900 px-1.5 py-0.5 rounded text-[10px]">
                        {newStageObj.bbchCode} ({newStageObj.shortName})
                      </span>
                    </div>
                  )}

                  {/* INSUMO HOMOLOGADO APLICADO & TRAZABILIDAD SENASA */}
                  {labor.appliedInputs && labor.appliedInputs.length > 0 && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/80 text-[11px] space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-teal-800 dark:text-teal-300 flex items-center gap-1 truncate">
                          <FlaskConical size={12} className="text-teal-600 shrink-0" />
                          <span className="truncate">{labor.appliedInputs[0].name}</span>
                        </span>
                        <span className="font-mono font-bold text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800 text-[10px] shrink-0">
                          {labor.appliedInputs[0].quantity} {labor.appliedInputs[0].unit}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>
                          {labor.appliedInputs[0].senasaRegisterNumber || 'SENASA'} • Lote: {labor.appliedInputs[0].batchNumber || 'Oficial'}
                        </span>
                        {labor.appliedInputs[0].dosagePerHa ? (
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {labor.appliedInputs[0].dosagePerHa} {labor.appliedInputs[0].dosageUnit || 'L/ha'}
                          </span>
                        ) : null}
                      </div>
                      {labor.appliedInputs[0].supplierName && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          Proveedor: <strong className="text-slate-700 dark:text-slate-300">{labor.appliedInputs[0].supplierName}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DATOS DE OPERACIÓN: MAQUINARIA & OPERARIO */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Maquinaria</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate block" title={labor.machinery?.tractor}>
                        {labor.machinery?.tractor || 'Propio / Manual'}
                      </span>
                      {labor.machinery?.fuelConsumptionLiters ? (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">
                          ⛽ {labor.machinery.fuelConsumptionLiters} L • {labor.machinery.machineHours} h
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Operario / Responsable</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                        {labor.operator || 'Equipo de Campo'}
                      </span>
                      {labor.weather?.tempC ? (
                        <span className="text-[10px] text-slate-400 block">
                          🌤️ {labor.weather.tempC}°C • HR {labor.weather.humidityPct ?? 55}% • {labor.weather.windSpeedKmh} km/h
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* COSTO Y REMITO / EXPENSES SYNC */}
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                      <DollarSign size={14} className="text-emerald-600" />
                      <span>${(labor.directCostUsd || 0).toLocaleString()} USD</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {labor.syncWithExpenses && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800" title="Imputado a Costos Operativos">
                          ✓ Costos
                        </span>
                      )}
                      {(labor.syncWithPhytosanitary || labor.linkedAgroAppId || labor.laborType === 'FITOSANITARIO' || labor.laborType === 'FERTIRRIEGO') && (
                        <Link
                          to="/phytosanitary"
                          className="text-[10px] text-teal-700 dark:text-teal-300 font-bold bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800 flex items-center gap-1 transition"
                          title="Ver folio en Cuaderno Fitosanitario Oficial SENASA"
                        >
                          <ShieldCheck size={11} /> Cuaderno SENASA
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* NOTA DE HOMOLOGACIÓN SI EXISTE */}
                  {labor.homologatedBy && (
                    <div className="mt-2 text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <strong className="text-emerald-600 font-bold">Homologado por {labor.homologatedBy}:</strong> {labor.homologationNotes || 'Conforme.'}
                    </div>
                  )}
                </div>

                {/* BOTONERA DE ACCIÓN POR ROL */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {/* ACCIONES SOCIO */}
                  {labor.status === 'Pendiente' || labor.status === 'En_Curso' || labor.status === 'Planificada' ? (
                    <button 
                      onClick={() => handleQuickStatusChange(labor, 'Ejecutada')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                    >
                      <Check size={13} /> Enviar Parte Diario
                    </button>
                  ) : null}

                  {/* HOMOLOGACIÓN COOPERATIVA */}
                  {isAdmin && labor.status === 'Ejecutada' ? (
                    <button 
                      onClick={() => handleOpenHomologate(labor)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                    >
                      <ShieldCheck size={13} /> Homologar Técnicamente
                    </button>
                  ) : null}

                  {/* BOTÓN EDITAR / ELIMINAR */}
                  <div className="ml-auto flex items-center gap-1">
                    <button 
                      onClick={() => {
                        setFormError(null);
                        const firstIn = labor.appliedInputs?.[0];
                        const matchedRes =
                          resources.find(r => r.id === firstIn?.resourceId) ||
                          resources.find(r => firstIn?.name && r.name.toLowerCase() === firstIn.name.toLowerCase());
                        setFormData({
                          id: labor.id,
                          title: labor.title,
                          description: labor.description || '',
                          status: labor.status,
                          priority: labor.priority,
                          dueDate: labor.dueDate,
                          executionDate: labor.executionDate || labor.dueDate,
                          plotId: labor.plotId || '',
                          operator: labor.operator || '',
                          laborType: labor.laborType || 'LABOR_CULTURAL',
                          targetStage: labor.targetStage || 'BBCH_10_19',
                          advancesPhenologicalStage: !!labor.advancesPhenologicalStage,
                          newPhenologicalStage: labor.newPhenologicalStage || 'BBCH_20_39',
                          tractor: labor.machinery?.tractor || '',
                          implement: labor.machinery?.implement || '',
                          fuelLiters: labor.machinery?.fuelConsumptionLiters || 0,
                          machineHours: labor.machinery?.machineHours || 0,
                          tempC: labor.weather?.tempC || 23,
                          humidityPct: labor.weather?.humidityPct || 50,
                          windSpeedKmh: labor.weather?.windSpeedKmh || 10,
                          windDirection: labor.weather?.windDirection || 'NE',
                          resourceId: firstIn?.resourceId || matchedRes?.id || '',
                          inputCategory: firstIn?.category || matchedRes?.agroCategory || 'Bioestimulante',
                          inputName: firstIn?.name || matchedRes?.name || '',
                          activeIngredient: firstIn?.activeIngredient || matchedRes?.activeIngredient || '',
                          senasaRegisterNumber: firstIn?.senasaRegisterNumber || matchedRes?.senasaRegisterNumber || '',
                          batchNumber: firstIn?.batchNumber || matchedRes?.batchNumber || '',
                          supplierId: firstIn?.supplierId || matchedRes?.supplierId || '',
                          supplierName: firstIn?.supplierName || matchedRes?.supplierName || '',
                          manufacturer: firstIn?.manufacturer || matchedRes?.manufacturer || '',
                          toxicologicalClass: firstIn?.toxicologicalClass || matchedRes?.toxicologicalClass || 'Biológico / Orgánico Certificado',
                          dosagePerHa: firstIn?.dosagePerHa || matchedRes?.recommendedDosagePerHa || 0,
                          dosageUnit: firstIn?.dosageUnit || matchedRes?.dosageUnit || 'L/ha',
                          safetyPeriodDays: firstIn?.safetyPeriodDays ?? matchedRes?.safetyPeriodDays ?? 0,
                          applicationMethod: firstIn?.applicationMethod || matchedRes?.applicationMethod || 'Pulverización Terrestre',
                          targetPestOrDisease: firstIn?.targetPestOrDisease || matchedRes?.targetPestOrDisease || '',
                          responsibleAgronomist: firstIn?.responsibleAgronomist || currentUser?.name || 'Dirección Técnica Cooperativa',
                          agronomistLicense: firstIn?.agronomistLicense || 'MP-CIAFBA',
                          inputQuantity: firstIn?.quantity || 0,
                          inputUnit: firstIn?.unit || 'L',
                          inputCostPerUnit: firstIn?.costPerUnit || matchedRes?.costPerUnit || 0,
                          directCostUsd: labor.directCostUsd || 0,
                          syncWithExpenses: labor.syncWithExpenses ?? true,
                          syncWithPhytosanitary: labor.syncWithPhytosanitary ?? false,
                          notes: labor.notes || ''
                        });
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      title="Editar orden de labor"
                    >
                      <FileText size={15} />
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => {
                          if (confirm('¿Eliminar esta orden de labor?')) {
                            deleteTask(labor.id);
                          }
                        }}
                        className="p-1.5 text-rose-400 hover:text-rose-600 transition"
                        title="Eliminar labor"
                      >
                        <X size={15} />
                      </button>
                    )}
                    {/* BOTÓN NOTIFICACIÓN CORREO VÍA RESEND.COM */}
                    <button 
                      onClick={() => handleEmailIndividual(labor)}
                      title="Enviar orden de labor por correo vía Resend.com (notificaciones@hempc.com.ar)"
                      className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition"
                    >
                      <Mail size={15} />
                    </button>
                    {/* BOTÓN RECORDATORIO PUSH INDIVIDUAL */}
                    {(labor.status === 'Pendiente' || labor.status === 'En_Curso') && (
                      <button 
                        onClick={() => handlePushIndividual(labor)}
                        title="Enviar recordatorio push a mi dispositivo (Service Worker)"
                        className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-lg transition"
                      >
                        <Bell size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA TABLA DETALLADA */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Labor & Tipo</th>
                  <th className="py-3 px-4">Parcela / Socio</th>
                  <th className="py-3 px-4">Fecha & Operario</th>
                  <th className="py-3 px-4">Insumo Homologado / Maquinaria</th>
                  <th className="py-3 px-4">Impacto Biológico</th>
                  <th className="py-3 px-4">Costo USD</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTasks.map(labor => {
                  const plot = plots.find(p => p.id === labor.plotId);
                  const newStage = HEMP_PHENOLOGICAL_STAGES.find(s => s.id === labor.newPhenologicalStage);
                  const firstIn = labor.appliedInputs?.[0];

                  return (
                    <tr key={labor.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="shrink-0">{getLaborIcon(labor.laborType)}</div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{labor.title}</div>
                            <div className="text-[10px] text-slate-400">{labor.laborType || 'General'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{plot?.name || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400">{plot?.ownerName || 'Sin asignar'}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-700 dark:text-slate-300">{formatDateAr(labor.dueDate)}</div>
                        <div className="text-[10px] text-slate-400">{labor.operator || 'Operador'}</div>
                      </td>

                      <td className="py-3 px-4">
                        {firstIn ? (
                          <div>
                            <div className="font-bold text-teal-700 dark:text-teal-300 truncate max-w-[180px]" title={firstIn.name}>
                              🧪 {firstIn.name} ({firstIn.quantity} {firstIn.unit})
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {firstIn.senasaRegisterNumber || 'SENASA'} • {firstIn.supplierName || 'Proveedor BD'}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{labor.machinery?.tractor || '-'}</div>
                            <div className="text-[10px] text-amber-600 font-bold">
                              {labor.machinery?.fuelConsumptionLiters ? `${labor.machinery.fuelConsumptionLiters} L / ${labor.machinery.machineHours} h` : '-'}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {labor.advancesPhenologicalStage && newStage ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Avanza a {newStage.bbchCode}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Mantención de fase</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        ${(labor.directCostUsd || 0).toLocaleString()}
                      </td>

                      <td className="py-3 px-4">
                        {getStatusBadge(labor.status)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isAdmin && labor.status === 'Ejecutada' ? (
                          <button 
                            onClick={() => handleOpenHomologate(labor)}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700 transition"
                          >
                            Homologar
                          </button>
                        ) : labor.status === 'Pendiente' || labor.status === 'Planificada' ? (
                          <button 
                            onClick={() => handleQuickStatusChange(labor, 'Ejecutada')}
                            className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 transition"
                          >
                            Ejecutar
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Certificada</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR ORDEN DE LABOR AGRONÓMICA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Tractor size={20} className="text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base">
                    {formData.id ? 'Editar Orden de Labor Agronómica' : 'Nueva Orden de Labor & Parte de Campo'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Trazabilidad Integrada: Proveedores → Insumos e Inventario → Parte de Campo → Cuaderno Fitosanitario
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* PESTAÑAS DEL FORMULARIO */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-bold">
              <button 
                type="button"
                onClick={() => setActiveFormTab('general')}
                className={`flex-1 py-3 px-3 text-center transition border-b-2 ${activeFormTab === 'general' ? 'border-emerald-600 text-emerald-600 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500'}`}
              >
                1. Datos & Parcela
              </button>
              <button 
                type="button"
                onClick={() => setActiveFormTab('machinery')}
                className={`flex-1 py-3 px-3 text-center transition border-b-2 ${activeFormTab === 'machinery' ? 'border-emerald-600 text-emerald-600 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500'}`}
              >
                2. Maquinaria & Combustible
              </button>
              <button 
                type="button"
                onClick={() => setActiveFormTab('inputs')}
                className={`flex-1 py-3 px-3 text-center transition border-b-2 ${activeFormTab === 'inputs' ? 'border-emerald-600 text-emerald-600 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500'}`}
              >
                3. Insumos & Clima
              </button>
              <button 
                type="button"
                onClick={() => setActiveFormTab('phenology')}
                className={`flex-1 py-3 px-3 text-center transition border-b-2 ${activeFormTab === 'phenology' ? 'border-emerald-600 text-emerald-600 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500'}`}
              >
                4. Ciclo Biológico & Costos
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="font-black block uppercase text-[10px] tracking-wider">Bloqueo Normativo SENASA / Trazabilidad</strong>
                    <span>{formError}</span>
                  </div>
                  <button type="button" onClick={() => setFormError(null)} className="text-rose-400 hover:text-rose-700">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* TAB 1: DATOS & PARCELA */}
              {activeFormTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Título de la Labor *
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="Ej: Siembra neumática de precisión, Aplicación preventiva bioinsumos..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Parcela Vinculada *
                      </label>
                      <select 
                        required
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.plotId}
                        onChange={(e) => {
                          const nextPlotId = e.target.value;
                          const nextPlot = plots.find(p => p.id === nextPlotId);
                          let areaHa = nextPlot?.surfaceArea || 1;
                          if (nextPlot?.surfaceUnit === 'm2') areaHa = areaHa / 10000;
                          else if (nextPlot?.surfaceUnit === 'ac') areaHa = areaHa * 0.404686;
                          areaHa = Math.max(0.1, Number(areaHa.toFixed(2)));
                          const nextQty = formData.dosagePerHa > 0 ? Number((formData.dosagePerHa * areaHa).toFixed(2)) : formData.inputQuantity;
                          setFormData(prev => ({
                            ...prev,
                            plotId: nextPlotId,
                            inputQuantity: nextQty
                          }));
                        }}
                      >
                        {availablePlots.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.surfaceArea} {p.surfaceUnit || 'ha'})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tipo Agronómico de Labor *
                      </label>
                      <select 
                        required
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.laborType}
                        onChange={(e) => {
                          const type = e.target.value as AgriculturalLaborType;
                          const info = AGRICULTURAL_LABOR_INFO[type];
                          const isPhytoOrFert = type === 'FITOSANITARIO' || type === 'FERTIRRIEGO';
                          const fallbackRes = isPhytoOrFert && !formData.resourceId ? catalogInputResources[0] : selectedResourceObj;
                          if (isPhytoOrFert && fallbackRes && !formData.resourceId) {
                            setFormData(prev => ({
                              ...prev,
                              laborType: type,
                              syncWithPhytosanitary: true
                            }));
                            applyResourceToTaskForm(fallbackRes, formData.plotId);
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              laborType: type,
                              syncWithPhytosanitary: isPhytoOrFert ? true : prev.syncWithPhytosanitary,
                              directCostUsd: Math.round(currentPlotAreaHa * info.defaultCostPerHa + (prev.inputQuantity * prev.inputCostPerUnit))
                            }));
                          }
                        }}
                      >
                        <option value="PREPARACION_SUELO">Preparación de Suelo & Cama de Siembra</option>
                        <option value="SIEMBRA">Siembra & Calibración Mecánica</option>
                        <option value="FERTIRRIEGO">Fertirriego & Nutrición Foliar (Vincula Insumo SENASA)</option>
                        <option value="FITOSANITARIO">Tratamiento Fitosanitario / Bioinsumos (Vincula Insumo SENASA)</option>
                        <option value="MANEJO_HIDRICO">Manejo Hídrico & Turno de Riego</option>
                        <option value="LABOR_CULTURAL">Labor Cultural / Desmalezado Mecánico</option>
                        <option value="MONITOREO">Monitoreo Agronómico & Sexado</option>
                        <option value="COSECHA">Corte & Cosecha Combinada</option>
                        <option value="ACONDICIONAMIENTO">Acondicionamiento & Enfardado</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Fecha Programada / Ejecución (DD/MM/AAAA)
                      </label>
                      <DateInputAr 
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value, executionDate: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Operario / Maquinista
                      </label>
                      <input 
                        type="text"
                        placeholder="Nombre del operario"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.operator}
                        onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Estado Inicial
                      </label>
                      <select 
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as LaborStatus })}
                      >
                        <option value="Planificada">Planificada</option>
                        <option value="En_Curso">En Curso</option>
                        <option value="Ejecutada">Ejecutada (Enviar Parte y Descontar Stock)</option>
                        {isAdmin && <option value="Homologada">Homologada por Cooperativa</option>}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Descripción de la Labor Técnica
                    </label>
                    <textarea 
                      rows={2}
                      placeholder="Detalles operativos, velocidad de avance, calibración de picos, lote a intervenir..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: MAQUINARIA & COMBUSTIBLE */}
              {activeFormTab === 'machinery' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <Fuel size={18} className="shrink-0 text-amber-600" />
                    <span>Los consumos de diésel y horas máquina alimentan la huella de carbono y el costo horario de labores de la cooperativa.</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tractor / Equipo Motorizado
                      </label>
                      <input 
                        type="text"
                        placeholder="Ej: John Deere 6130M, New Holland T6, Pla MAP 3..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.tractor}
                        onChange={(e) => setFormData({ ...formData, tractor: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Implemento Enganchado / Pulverizadora
                      </label>
                      <input 
                        type="text"
                        placeholder="Ej: Pulverizadora Botalón 24m, Sistema Venturi Fertirriego..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.implement}
                        onChange={(e) => setFormData({ ...formData, implement: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <Fuel size={14} className="text-amber-600" /> Consumo de Combustible Diésel (Litros)
                      </label>
                      <input 
                        type="number"
                        min="0"
                        step="1"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                        value={formData.fuelLiters}
                        onChange={(e) => setFormData({ ...formData, fuelLiters: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <Gauge size={14} className="text-slate-600" /> Horas Máquina Efectivas
                      </label>
                      <input 
                        type="number"
                        min="0"
                        step="0.5"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                        value={formData.machineHours}
                        onChange={(e) => setFormData({ ...formData, machineHours: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: INSUMOS & CLIMA (TRAZABILIDAD CERRADA PROVEEDORES -> INVENTARIO -> LABOR -> CUADERNO FITOSANITARIO) */}
              {activeFormTab === 'inputs' && (
                <div className="space-y-4">
                  {/* CABECERA DE TRAZABILIDAD OBLIGATORIA */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                          Circuito Fitosanitario Obligatorio SENASA • Prohibido Aplicar Insumos No Catalogados
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to="/suppliers"
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 flex items-center gap-1"
                        >
                          <Building2 size={11} /> 1. Proveedores ({suppliers.length})
                        </Link>
                        <Link
                          to="/resources"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 flex items-center gap-1"
                        >
                          <Package size={11} /> 2. Insumos e Inventario ({catalogInputResources.length})
                          <ArrowUpRight size={11} />
                        </Link>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      Todo producto fitosanitario, bioinsumo o fertilizante aplicado en campo debe seleccionarse del <strong>Catálogo de Insumos e Inventario</strong> (vinculado a un <strong>Proveedor Homologado</strong>). Al ejecutar la labor, se descuenta del stock de galpón y se asienta automáticamente en el <strong>Cuaderno Fitosanitario Oficial</strong>.
                    </p>
                  </div>

                  {/* SELECTOR DE INSUMO HOMOLOGADO EN INVENTARIO */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <FlaskConical size={15} className="text-emerald-600" />
                        <span>Seleccionar Insumo Homologado en Inventario BD</span>
                      </div>

                      {/* FILTRO POR CATEGORÍA SENASA */}
                      <select
                        value={inputCategoryFilter}
                        onChange={(e) => setInputCategoryFilter(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none"
                      >
                        <option value="all">Todas las Categorías SENASA ({catalogInputResources.length})</option>
                        <option value="Bioestimulante">⚡ Bioestimulante</option>
                        <option value="Mejorador de Suelo">🌱 Mejorador de Suelo</option>
                        <option value="Fertilizante Foliar">🍃 Fertilizante Foliar</option>
                        <option value="Fertilizante Edáfico">🧪 Fertilizante Edáfico</option>
                        <option value="Insecticida">🐛 Insecticida / Biocontrol</option>
                        <option value="Fungicida">🍄 Fungicida / Biofungicida</option>
                        <option value="Enmienda Orgánica">♻️ Enmienda Orgánica</option>
                        <option value="Herbicida">🌾 Herbicida</option>
                      </select>
                    </div>

                    {catalogInputResources.length === 0 ? (
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                          <span>No hay insumos dados de alta en Insumos e Inventario. Primero registre el Proveedor y el Insumo con su N° SENASA y Lote.</span>
                        </div>
                        <Link
                          to="/resources"
                          className="px-3 py-1.5 bg-amber-600 text-white rounded-lg font-bold text-[11px] shrink-0 hover:bg-amber-700"
                        >
                          Ir a Insumos e Inventario
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Producto Comercial Prescripto (Insumos e Inventario) {(formData.laborType === 'FITOSANITARIO' || formData.laborType === 'FERTIRRIEGO' || formData.syncWithPhytosanitary) ? '*' : '(Opcional para labor mecánica)'}
                          </label>
                          <select
                            className="w-full bg-white dark:bg-slate-900 border border-emerald-500/50 dark:border-emerald-600/50 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                            value={formData.resourceId}
                            onChange={(e) => {
                              const resId = e.target.value;
                              if (!resId) {
                                applyResourceToTaskForm(undefined);
                              } else {
                                const found = resources.find(r => r.id === resId);
                                applyResourceToTaskForm(found);
                              }
                            }}
                          >
                            <option value="">-- Sin aplicación de insumo (Solo labor mecánica) --</option>
                            {filteredCatalogResources.map(res => (
                              <option key={res.id} value={res.id}>
                                {res.name} — [{res.agroCategory || res.type}] • {res.senasaRegisterNumber || 'SENASA'} • Lote: {res.batchNumber || 'S/L'} • Prov: {res.supplierName || 'Homologado'} (Stock: {res.stock ?? 0} {res.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* TARJETAS RÁPIDAS DE INSUMOS DISPONIBLES */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                          {filteredCatalogResources.map(res => {
                            const isSelected = formData.resourceId === res.id;
                            return (
                              <button
                                key={res.id}
                                type="button"
                                onClick={() => applyResourceToTaskForm(res)}
                                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                    : 'bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <strong className={`text-[11px] font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                    {res.name}
                                  </strong>
                                  <span className={`text-[10px] font-mono font-bold shrink-0 ${isSelected ? 'text-emerald-100' : 'text-emerald-600'}`}>
                                    {res.stock ?? 0} {res.unit}
                                  </span>
                                </div>
                                <div className={`text-[9.5px] font-mono mt-0.5 truncate ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                                  {res.senasaRegisterNumber || 'SENASA'} • Lote {res.batchNumber || 'Oficial'} • {res.recommendedDosagePerHa ?? 2} {res.dosageUnit || 'L/ha'}
                                </div>
                                <div className={`text-[9.5px] truncate ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                                  Prov: {res.supplierName || 'Proveedor Homologado'}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* FICHA DE TRAZABILIDAD DEL INSUMO SELECCIONADO Y CÁLCULO DE DOSIS X SUPERFICIE */}
                    {selectedResourceObj && (
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <div>
                            <span className="text-[10px] font-black uppercase text-emerald-600 block">
                              Ficha Técnica Homologada en Inventario & Proveedores
                            </span>
                            <strong className="text-xs font-black text-slate-900 dark:text-white">
                              {selectedResourceObj.name} ({selectedResourceObj.activeIngredient || 'Principio Activo Certificado'})
                            </strong>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                            {selectedResourceObj.senasaRegisterNumber || 'SENASA OFICIAL'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg">
                          <div>
                            <span className="text-slate-400 block uppercase">Proveedor Homologado</span>
                            <strong className="text-slate-800 dark:text-slate-200 truncate block" title={formData.supplierName}>
                              {formData.supplierName || selectedResourceObj.supplierName}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase">Lote Recepcionado</span>
                            <strong className="text-slate-800 dark:text-slate-200 block">
                              {formData.batchNumber || selectedResourceObj.batchNumber}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase">Carencia LMR</span>
                            <strong className="text-amber-600 dark:text-amber-400 block">
                              {formData.safetyPeriodDays} días
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase">Stock en Galpón</span>
                            <strong className={`${(selectedResourceObj.stock ?? 0) < formData.inputQuantity ? 'text-rose-600' : 'text-emerald-600'} block`}>
                              {selectedResourceObj.stock ?? 0} {selectedResourceObj.unit}
                            </strong>
                          </div>
                        </div>

                        {/* DOSIS POR HA, VOLUMEN TOTAL PARA EL LOTE Y MÉTODO DE APLICACIÓN */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Dosis Aplicada ({formData.dosageUnit}) *
                            </label>
                            <input
                              type="number"
                              min="0.05"
                              step="0.1"
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono font-bold outline-none"
                              value={formData.dosagePerHa}
                              onChange={(e) => {
                                const nextDosage = Number(e.target.value) || 0;
                                const nextTotalQty = Number((nextDosage * currentPlotAreaHa).toFixed(2));
                                const laborInfo = AGRICULTURAL_LABOR_INFO[formData.laborType];
                                const baseCost = Math.round(currentPlotAreaHa * (laborInfo?.defaultCostPerHa || 18));
                                setFormData(prev => ({
                                  ...prev,
                                  dosagePerHa: nextDosage,
                                  inputQuantity: nextTotalQty,
                                  directCostUsd: baseCost + Math.round(nextTotalQty * prev.inputCostPerUnit)
                                }));
                              }}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Total Lote ({currentPlotAreaHa} ha)
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono font-bold outline-none"
                                value={formData.inputQuantity}
                                onChange={(e) => {
                                  const nextQty = Number(e.target.value) || 0;
                                  setFormData(prev => ({
                                    ...prev,
                                    inputQuantity: nextQty
                                  }));
                                }}
                              />
                              <span className="text-xs font-mono font-bold text-slate-500 px-1">{formData.inputUnit}</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Método de Aplicación
                            </label>
                            <select
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white outline-none"
                              value={formData.applicationMethod}
                              onChange={(e) => setFormData({ ...formData, applicationMethod: e.target.value as any })}
                            >
                              <option value="Pulverización Terrestre">Pulverización Terrestre</option>
                              <option value="Fertirriego">Fertirriego</option>
                              <option value="Incorporación Edáfica">Incorporación Edáfica</option>
                              <option value="Manual / Follaje">Manual / Follaje</option>
                              <option value="Mochila Manual">Mochila Manual</option>
                              <option value="Dron Agrícola">Dron Agrícola</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Blanco MIP / Objetivo
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: Control trips / Bioestimulación"
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white outline-none"
                              value={formData.targetPestOrDisease}
                              onChange={(e) => setFormData({ ...formData, targetPestOrDisease: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Ing. Agrónomo Responsable (Cuaderno SENASA)
                            </label>
                            <input
                              type="text"
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white outline-none"
                              value={formData.responsibleAgronomist}
                              onChange={(e) => setFormData({ ...formData, responsibleAgronomist: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Matrícula Profesional (MP)
                            </label>
                            <input
                              type="text"
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono outline-none"
                              value={formData.agronomistLicense}
                              onChange={(e) => setFormData({ ...formData, agronomistLicense: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CONDICIONES CLIMÁTICAS Y VENTANA DE PULVERIZACIÓN SENASA */}
                  {(() => {
                    // Cálculo psicrométrico aproximado de Delta T (Depresión de Bulbo Húmedo)
                    const T = Number(formData.tempC) || 22;
                    const RH = Math.min(100, Math.max(5, Number(formData.humidityPct) || 55));
                    const wind = Number(formData.windSpeedKmh) || 10;
                    const wetBulb =
                      T * Math.atan(0.151977 * Math.pow(RH + 8.313659, 0.5)) +
                      Math.atan(T + RH) -
                      Math.atan(RH - 1.676331) +
                      0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) -
                      4.686035;
                    const deltaT = Number(Math.max(0.5, T - wetBulb).toFixed(1));
                    const isSpraySafe = wind <= 15 && deltaT >= 2 && deltaT <= 8 && T <= 32;

                    return (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <Wind size={15} className="text-cyan-600" />
                            <span>Condiciones Meteorológicas & Ventana de Pulverización SENASA</span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isSpraySafe
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300'
                            }`}
                          >
                            Delta T: {deltaT}°C • {isSpraySafe ? '✓ Ventana Óptima Antideriva' : '⚠️ Riesgo de Deriva / Evaporación'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold mb-1">Temperatura (°C)</label>
                            <input 
                              type="number"
                              step="0.5"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono outline-none"
                              value={formData.tempC}
                              onChange={(e) => setFormData({ ...formData, tempC: Number(e.target.value) })}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold mb-1">Humedad Relativa (%)</label>
                            <input 
                              type="number"
                              min="5"
                              max="100"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono outline-none"
                              value={formData.humidityPct}
                              onChange={(e) => setFormData({ ...formData, humidityPct: Number(e.target.value) })}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold mb-1">Viento (km/h - Máx 15)</label>
                            <input 
                              type="number"
                              step="0.5"
                              className={`w-full bg-white dark:bg-slate-900 border rounded-lg p-2 text-xs font-mono outline-none ${
                                wind > 15 ? 'border-rose-500 text-rose-600 font-bold' : 'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                              }`}
                              value={formData.windSpeedKmh}
                              onChange={(e) => setFormData({ ...formData, windSpeedKmh: Number(e.target.value) })}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold mb-1">Dirección Viento</label>
                            <input 
                              type="text"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono outline-none"
                              value={formData.windDirection}
                              onChange={(e) => setFormData({ ...formData, windDirection: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 4: CICLO BIOLÓGICO & COSTOS */}
              {activeFormTab === 'phenology' && (
                <div className="space-y-4">
                  {/* SECCIÓN VINCULACIÓN CICLO BIOLÓGICO */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-emerald-600" />
                        <span className="text-xs font-black uppercase text-emerald-900 dark:text-emerald-300">
                          Integración con Ciclo Biológico Fenológico
                        </span>
                      </div>
                      <span className="text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-emerald-700 dark:text-emerald-300 border border-emerald-300">
                        Lote: {currentSelectedPlot?.currentPhenologicalStage || 'BBCH 10-19'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        id="advancesPhenology"
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        checked={formData.advancesPhenologicalStage}
                        onChange={(e) => setFormData({ ...formData, advancesPhenologicalStage: e.target.checked })}
                      />
                      <label htmlFor="advancesPhenology" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                        ¿Esta labor certifica o avanza el estadio fenológico del lote?
                      </label>
                    </div>

                    {formData.advancesPhenologicalStage && (
                      <div className="pt-2">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Nuevo Estadio BBCH al que avanza la parcela tras la labor:
                        </label>
                        <select 
                          className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg p-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 outline-none"
                          value={formData.newPhenologicalStage}
                          onChange={(e) => setFormData({ ...formData, newPhenologicalStage: e.target.value as HempStageId })}
                        >
                          {HEMP_PHENOLOGICAL_STAGES.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.bbchCode} — {s.name} ({s.typicalGdd} GDD aprox)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* IMPUTACIÓN ECONÓMICA Y CUADERNO FITOSANITARIO */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <DollarSign size={14} className="text-emerald-600" /> Costo Directo de la Labor (USD) *
                      </label>
                      <input 
                        type="number"
                        min="0"
                        step="1"
                        required
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.directCostUsd}
                        onChange={(e) => setFormData({ ...formData, directCostUsd: Number(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                        <input 
                          type="checkbox"
                          className="w-4 h-4 text-emerald-600 rounded"
                          checked={formData.syncWithExpenses}
                          onChange={(e) => setFormData({ ...formData, syncWithExpenses: e.target.checked })}
                        />
                        Imputar automáticamente en Costos Operativos
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                        <input 
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 rounded"
                          checked={formData.syncWithPhytosanitary}
                          onChange={(e) => setFormData({ ...formData, syncWithPhytosanitary: e.target.checked })}
                        />
                        Registrar en Cuaderno Fitosanitario Oficial
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* FOOTER FORM */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex gap-2">
                  {activeFormTab !== 'general' && (
                    <button 
                      type="button"
                      onClick={() => {
                        if (activeFormTab === 'phenology') setActiveFormTab('inputs');
                        else if (activeFormTab === 'inputs') setActiveFormTab('machinery');
                        else if (activeFormTab === 'machinery') setActiveFormTab('general');
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      Anterior
                    </button>
                  )}
                  {activeFormTab !== 'phenology' && (
                    <button 
                      type="button"
                      onClick={() => {
                        if (activeFormTab === 'general') setActiveFormTab('machinery');
                        else if (activeFormTab === 'machinery') setActiveFormTab('inputs');
                        else if (activeFormTab === 'inputs') setActiveFormTab('phenology');
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                    >
                      Siguiente
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                  >
                    <Check size={14} /> Guardar Orden de Labor
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE HOMOLOGACIÓN TÉCNICA (COOPERATIVA) */}
      {isHomologateModalOpen && selectedLaborForHomologate && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={22} className="text-emerald-300" />
                <div>
                  <h3 className="font-bold text-base">Homologación Técnica Cooperativa</h3>
                  <p className="text-xs text-emerald-200">Certificación agronómica y financiera de labor</p>
                </div>
              </div>
              <button onClick={() => setIsHomologateModalOpen(false)} className="text-emerald-200 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Labor a Certificar</span>
                  <strong className="text-slate-900 dark:text-white text-sm">{selectedLaborForHomologate.title}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Operario: {selectedLaborForHomologate.operator}</span>
                  <span className="font-bold text-emerald-600">${selectedLaborForHomologate.directCostUsd} USD</span>
                </div>
                {selectedLaborForHomologate.advancesPhenologicalStage && (
                  <div className="bg-emerald-100 dark:bg-emerald-950 p-2 rounded text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
                    ✓ Esta labor avanzará formalmente el estadio del lote a: {selectedLaborForHomologate.newPhenologicalStage}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dictamen / Observaciones Técnicas del Agrónomo Inspector:
                </label>
                <textarea 
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={homologationNotes}
                  onChange={(e) => setHomologationNotes(e.target.value)}
                  placeholder="Labor ejecutada conforme parámetros de profundidad, dosis y calibración..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button 
                  onClick={() => setIsHomologateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmHomologation}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <ShieldCheck size={14} /> Certificar & Homologar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST DE FEEDBACK PUSH */}
      {pushFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-950 px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 dark:border-slate-200 text-xs font-black flex items-center gap-2 animate-bounce">
          <BellRing size={16} className="text-emerald-400" />
          <span>{pushFeedback}</span>
        </div>
      )}
    </div>
  );
}
