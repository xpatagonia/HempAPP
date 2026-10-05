import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Location, Plot, Project, Variety, CAMPAIGNS, SiteType, RoleType,
  CampaignHistoryEntry 
} from '../types';
import MapEditor from '../components/MapEditor';
import { 
  FolderKanban, Tractor, Sprout, Satellite, DollarSign, Plus, 
  MapPin, CheckCircle2, AlertTriangle, Layers, TrendingUp, 
  TrendingDown, ShieldCheck, ChevronRight, ChevronDown, 
  ExternalLink, Calendar, Users, Award, FileText, BarChart3, 
  PieChart, ArrowUpRight, Scale, Info, Edit2, Trash2, X, 
  FileSpreadsheet, Filter, Check, Eye, HelpCircle, Sparkles, 
  ShieldAlert, Compass, Globe, Mountain, History, Play, Pause, 
  RotateCcw, Search, Clock, ArrowRight, Download
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Motivos agronómicos predefinidos para pausar campos o parcelas
const PRESET_PAUSE_REASONS = [
  'Descanso agronómico / Fijación biológica de nitrógeno (Vicia / Barbecho)',
  'Rotación de cultivo y descompactación edáfica',
  'Mantenimiento y calibración de sistema de riego / drenaje',
  'Pausa técnica preventiva por análisis de suelo o salinidad',
  'Lote en reserva para siembra tardía de segunda',
  'Descanso invernal / Barbecho químico de cobertura',
  'Otro motivo agronómico...'
];

// Datos iniciales de auditoría histórica para trazabilidad inmediata
const INITIAL_CAMPAIGN_HISTORY: CampaignHistoryEntry[] = [
  {
    id: 'hist-init-1',
    campaign: '2025/2026',
    entityType: 'Parcela',
    entityId: 'plot-delta-descanso',
    entityName: 'Lote Delta - Suelo en Descanso',
    locationName: 'Establecimiento Las Rosas',
    previousStatus: 'Activa',
    newStatus: 'En Barbecho',
    reason: 'Lote en descanso durante la campaña 2025/2026. Siembra de vicia para fijación biológica de nitrógeno.',
    timestamp: '2025-10-20T14:30:00.000Z',
    responsibleName: 'Ing. Gastón Barea',
    surfaceArea: 45.0
  },
  {
    id: 'hist-init-2',
    campaign: '2025/2026',
    entityType: 'Campo',
    entityId: 'loc-patagonia',
    entityName: 'Estación Demostrativa Valle Inferior (IDEVI)',
    locationName: 'Estación Demostrativa Valle Inferior (IDEVI)',
    previousStatus: 'En Preparación',
    newStatus: 'Activo',
    reason: 'Habilitación oficial de campaña bajo riego presurizado para ensayos duales.',
    timestamp: '2025-10-01T09:15:00.000Z',
    responsibleName: 'Ing. Gastón Barea',
    surfaceArea: 50.0
  },
  {
    id: 'hist-init-3',
    campaign: '2024/2025',
    entityType: 'Campo',
    entityId: 'loc-pergamino',
    entityName: 'Campo Demostrativo Pergamino',
    locationName: 'Campo Demostrativo Pergamino',
    previousStatus: 'Activo',
    newStatus: 'Finalizado',
    reason: 'Cierre de ciclo piloto 2024/2025 y cosecha completada de fibra USO-31.',
    timestamp: '2025-03-30T17:00:00.000Z',
    responsibleName: 'Ing. Gastón Barea',
    surfaceArea: 60.0
  }
];

export default function Campaigns() {
  const { 
    locations, plots, projects, varieties, updateLocation, 
    updatePlot, addProject, updateProject, deleteProject, 
    currentUser, usersList, clients 
  } = useAppContext();

  // Campaña seleccionada en el billboard
  const [selectedCampaign, setSelectedCampaign] = useState<string>('2025/2026');
  
  // Vista activa: 'billboard' | 'geodesy' | 'economics' | 'projects' | 'history'
  const [activeTab, setActiveTab] = useState<'billboard' | 'geodesy' | 'economics' | 'projects' | 'history'>('billboard');

  // Sub-filtro de estado en la pestaña de Campos & Lotes: 'all' | 'active' | 'paused' | 'unassigned'
  const [fieldStatusFilter, setFieldStatusFilter] = useState<'all' | 'active' | 'paused' | 'unassigned'>('all');

  // Campo seleccionado en la vista geodésica para enfoque directo
  const [selectedMapLocationId, setSelectedMapLocationId] = useState<string>('all');

  // Estado de expansión de acordeones de campos en la vista de lista
  const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({
    'loc-riocuarto': true,
    'loc-pergamino': true,
    'loc-patagonia': true,
    'loc-las-rosas': true
  });

  // Historial de auditoría de campañas (con persistencia en localStorage)
  const [historyEntries, setHistoryEntries] = useState<CampaignHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('ht_campaign_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading campaign history:', e);
    }
    return INITIAL_CAMPAIGN_HISTORY;
  });

  // Guardar en localStorage cuando cambie el historial
  useEffect(() => {
    try {
      localStorage.setItem('ht_campaign_history', JSON.stringify(historyEntries));
    } catch (e) {
      console.error('Error saving campaign history:', e);
    }
  }, [historyEntries]);

  // Buscador y filtros para la pestaña de Historial
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyCampaignFilter, setHistoryCampaignFilter] = useState('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all');

  // Modal para Pausar / Modificar Estado Agronómico
  const [pauseModalState, setPauseModalState] = useState<{
    isOpen: boolean;
    entityType: 'Campo' | 'Parcela';
    entityId: string;
    entityName: string;
    locationName?: string;
    currentStatus: string;
    surfaceArea?: number;
    reason: string;
    customReason: string;
    isCustom: boolean;
  }>({
    isOpen: false,
    entityType: 'Campo',
    entityId: '',
    entityName: '',
    currentStatus: 'Activo',
    reason: PRESET_PAUSE_REASONS[0],
    customReason: '',
    isCustom: false
  });

  // Modal para Programas / Proyectos de Campaña
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectFormData, setProjectFormData] = useState<Partial<Project>>({
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    status: 'En Curso',
    campaign: '2025/2026',
    objectiveType: 'Fibra Industrial',
    targetYieldTn: 500,
    budgetUsd: 120000,
    directorId: '',
    responsibleIds: []
  });

  // Toast o mensaje de confirmación
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const canManage = isAdmin || currentUser?.role === 'technician';

  // Toggle de acordeón de campo
  const toggleLocationExpand = (locId: string) => {
    setExpandedLocations(prev => ({
      ...prev,
      [locId]: !prev[locId]
    }));
  };

  // Determina si un campo está asignado a la campaña seleccionada
  const isLocationInCampaign = (loc: Location, camp: string) => {
    if (camp === 'all') return true;
    const campaigns = loc.activeCampaigns || ['2024/2025', '2025/2026'];
    return campaigns.includes(camp);
  };

  // Determina el estado de un campo en la campaña seleccionada
  const getLocationCampaignStatus = (loc: Location, camp: string): 'Activo' | 'Pausado' | 'En Barbecho' | 'No Asignado' => {
    if (!isLocationInCampaign(loc, camp)) return 'No Asignado';
    if (loc.campaignStatuses && loc.campaignStatuses[camp]) {
      return loc.campaignStatuses[camp] as any;
    }
    if (loc.status === 'En Barbecho' || loc.status === 'Pausado') {
      return loc.status as any;
    }
    return 'Activo';
  };

  // Determina el estado de una parcela en la campaña seleccionada
  const getPlotCampaignStatus = (plot: Plot, camp: string): 'Activa' | 'Pausada' | 'En Barbecho' | 'Cosechada' => {
    if (plot.campaignStatuses && plot.campaignStatuses[camp]) {
      return plot.campaignStatuses[camp] as any;
    }
    return plot.status as any;
  };

  // Todos los campos asignados a la campaña actual (activos y pausados)
  const campaignLocations = useMemo(() => {
    return locations.filter(loc => isLocationInCampaign(loc, selectedCampaign));
  }, [locations, selectedCampaign]);

  // Campos no asignados a esta campaña (para la opción "Ver Otros Campos de la Red")
  const unassignedLocations = useMemo(() => {
    if (selectedCampaign === 'all') return [];
    return locations.filter(loc => !isLocationInCampaign(loc, selectedCampaign));
  }, [locations, selectedCampaign]);

  // Parcelas pertenecientes a la campaña seleccionada
  const campaignPlots = useMemo(() => {
    return plots.filter(plot => {
      if (selectedCampaign === 'all') return true;
      const plotCampaigns = plot.activeCampaigns || (plot.campaign ? [plot.campaign] : ['2025/2026']);
      return plotCampaigns.includes(selectedCampaign);
    });
  }, [plots, selectedCampaign]);

  // Proyectos / Programas asociados a la campaña
  const campaignProjects = useMemo(() => {
    return projects.filter(proj => {
      if (selectedCampaign === 'all') return true;
      return (proj.campaign || '2025/2026') === selectedCampaign;
    });
  }, [projects, selectedCampaign]);

  // Métricas cuantitativas del Billboard de Campaña
  const billboardStats = useMemo(() => {
    // 1. Superficie DDJJ oficial declarada en los campos asignados de la campaña
    const totalDeclaredDDJJHa = campaignLocations.reduce((acc, loc) => acc + (loc.sowingDeclarationHa || 0), 0);
    
    // 2. Clasificación de campos activos vs pausados
    const activeFields = campaignLocations.filter(l => getLocationCampaignStatus(l, selectedCampaign) === 'Activo');
    const pausedFields = campaignLocations.filter(l => getLocationCampaignStatus(l, selectedCampaign) !== 'Activo');

    // 3. Superficie efectiva en lotes activos vs lotes en pausa
    const activePlots = campaignPlots.filter(p => getPlotCampaignStatus(p, selectedCampaign) === 'Activa');
    const pausedPlots = campaignPlots.filter(p => {
      const s = getPlotCampaignStatus(p, selectedCampaign);
      return s === 'Pausada' || s === 'En Barbecho';
    });
    
    const effectiveSownHa = activePlots.reduce((acc, p) => acc + (p.surfaceArea || 0), 0);
    const pausedHa = pausedPlots.reduce((acc, p) => acc + (p.surfaceArea || 0), 0);

    // 4. Proporción de uso del cupo DDJJ
    const ddjjUtilizationPct = totalDeclaredDDJJHa > 0 ? (effectiveSownHa / totalDeclaredDDJJHa) * 100 : 0;

    // 5. Conteo de Ensayos I+D vs Lotes de Producción Comercial
    const trialPlotsCount = activePlots.filter(p => p.type === 'Ensayo').length;
    const commercialPlotsCount = activePlots.filter(p => p.type === 'Producción').length;

    // 6. Semilla insumida (kg)
    const totalSeedKg = activePlots.reduce((acc, p) => {
      let seed = p.usedSeedValue || 0;
      if (p.usedSeedUnit === 'tn') seed *= 1000;
      if (p.usedSeedUnit === 'gr') seed /= 1000;
      return acc + seed;
    }, 0);

    // 7. Proyección Cuantitativa de Cosecha (Fibra & Granos en Tn)
    let projectedFiberTn = 0;
    let projectedGrainTn = 0;
    let projectedBiomassKg = 0;

    // 8. Estimación de Costos Operativos e Ingresos Brutos
    let totalDirectCostUsd = 0;
    let totalGrossRevenueUsd = 0;

    activePlots.forEach(plot => {
      const area = plot.surfaceArea || 0;
      const variety = varieties.find(v => v.id === plot.varietyId);
      const isIrrigated = plot.irrigationType && !plot.irrigationType.toLowerCase().includes('secano');
      
      let costPerHa = 480;
      if (isIrrigated) costPerHa = 720;
      if (plot.type === 'Ensayo') costPerHa += 400;
      
      const plotCost = area * costPerHa;
      totalDirectCostUsd += plotCost;

      const usage = variety?.usage || 'Fibra';
      let plotRevenue = 0;

      if (usage === 'Fibra') {
        const yieldHa = isIrrigated ? 9.2 : 7.4;
        const prod = area * yieldHa;
        projectedFiberTn += prod;
        plotRevenue = prod * 340;
      } else if (usage === 'Grano') {
        const yieldHa = isIrrigated ? 1.8 : 1.25;
        const prod = area * yieldHa;
        projectedGrainTn += prod;
        plotRevenue = prod * 1250;
      } else if (usage === 'Dual') {
        const fiberYield = isIrrigated ? 6.5 : 5.2;
        const grainYield = isIrrigated ? 1.3 : 0.95;
        const fiberProd = area * fiberYield;
        const grainProd = area * grainYield;
        projectedFiberTn += fiberProd;
        projectedGrainTn += grainProd;
        plotRevenue = (fiberProd * 340) + (grainProd * 1250);
      } else {
        const yieldHa = 1100;
        const prod = area * yieldHa;
        projectedBiomassKg += prod;
        plotRevenue = prod * 9.5;
      }

      totalGrossRevenueUsd += plotRevenue;
    });

    const totalNetMarginUsd = totalGrossRevenueUsd - totalDirectCostUsd;
    const avgRoiPct = totalDirectCostUsd > 0 ? (totalNetMarginUsd / totalDirectCostUsd) * 100 : 0;
    const marginPerHa = effectiveSownHa > 0 ? totalNetMarginUsd / effectiveSownHa : 0;

    let qualitativeScore: 'A+' | 'A' | 'B' | 'I+D' = 'A';
    if (avgRoiPct >= 75 || marginPerHa > 800) qualitativeScore = 'A+';
    else if (avgRoiPct >= 40) qualitativeScore = 'A';
    else if (avgRoiPct >= 10) qualitativeScore = 'B';
    else qualitativeScore = 'I+D';

    return {
      totalFields: campaignLocations.length,
      activeFieldsCount: activeFields.length,
      pausedFieldsCount: pausedFields.length,
      totalDeclaredDDJJHa: Number(totalDeclaredDDJJHa.toFixed(2)),
      effectiveSownHa: Number(effectiveSownHa.toFixed(2)),
      pausedHa: Number(pausedHa.toFixed(2)),
      ddjjUtilizationPct: Number(ddjjUtilizationPct.toFixed(1)),
      totalPlots: campaignPlots.length,
      activePlotsCount: activePlots.length,
      pausedPlotsCount: pausedPlots.length,
      trialPlotsCount,
      commercialPlotsCount,
      totalSeedKg: Number(totalSeedKg.toFixed(1)),
      projectedFiberTn: Number(projectedFiberTn.toFixed(1)),
      projectedGrainTn: Number(projectedGrainTn.toFixed(1)),
      projectedBiomassKg: Number(projectedBiomassKg.toFixed(0)),
      totalDirectCostUsd: Number(totalDirectCostUsd.toFixed(0)),
      totalGrossRevenueUsd: Number(totalGrossRevenueUsd.toFixed(0)),
      totalNetMarginUsd: Number(totalNetMarginUsd.toFixed(0)),
      avgRoiPct: Number(avgRoiPct.toFixed(1)),
      marginPerHa: Number(marginPerHa.toFixed(0)),
      qualitativeScore
    };
  }, [campaignLocations, campaignPlots, varieties, selectedCampaign]);

  // ABRIR MODAL PARA PAUSAR CAMPO
  const handleOpenPauseLocationModal = (loc: Location, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManage) return;

    setPauseModalState({
      isOpen: true,
      entityType: 'Campo',
      entityId: loc.id,
      entityName: loc.name,
      locationName: loc.name,
      currentStatus: getLocationCampaignStatus(loc, selectedCampaign),
      surfaceArea: loc.capacityHa || loc.sowingDeclarationHa || 0,
      reason: PRESET_PAUSE_REASONS[0],
      customReason: '',
      isCustom: false
    });
  };

  // ABRIR MODAL PARA PAUSAR PARCELA
  const handleOpenPausePlotModal = (plot: Plot, locName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManage) return;

    setPauseModalState({
      isOpen: true,
      entityType: 'Parcela',
      entityId: plot.id,
      entityName: plot.name,
      locationName: locName,
      currentStatus: getPlotCampaignStatus(plot, selectedCampaign),
      surfaceArea: plot.surfaceArea || 0,
      reason: PRESET_PAUSE_REASONS[0],
      customReason: '',
      isCustom: false
    });
  };

  // CONFIRMAR PAUSA AGRONÓMICA DESDE EL MODAL
  const handleConfirmPause = async () => {
    const finalReason = pauseModalState.isCustom 
      ? pauseModalState.customReason.trim() || 'Pausa agronómica personalizada'
      : pauseModalState.reason;

    const targetCamp = selectedCampaign === 'all' ? '2025/2026' : selectedCampaign;

    if (pauseModalState.entityType === 'Campo') {
      const loc = locations.find(l => l.id === pauseModalState.entityId);
      if (!loc) return;

      const updatedStatuses = { ...(loc.campaignStatuses || {}), [targetCamp]: 'Pausado' as const };
      const updatedReasons = { ...(loc.campaignPauseReasons || {}), [targetCamp]: finalReason };
      
      // Mantener la campaña en activeCampaigns para que NO desaparezca, solo cambie su estado operativo
      const campaigns = Array.from(new Set([...(loc.activeCampaigns || ['2024/2025', '2025/2026']), targetCamp]));

      await updateLocation({
        ...loc,
        activeCampaigns: campaigns,
        campaignStatuses: updatedStatuses,
        campaignPauseReasons: updatedReasons,
        pauseReason: finalReason,
        status: 'En Barbecho'
      });

      // Pausar también las parcelas hijas dentro de este campo
      const childPlots = plots.filter(p => p.locationId === loc.id);
      for (const plot of childPlots) {
        const plotCampaigns = Array.from(new Set([...(plot.activeCampaigns || [targetCamp]), targetCamp]));
        const plotStatuses = { ...(plot.campaignStatuses || {}), [targetCamp]: 'Pausada' as const };
        await updatePlot({
          ...plot,
          status: 'Pausada',
          activeCampaigns: plotCampaigns,
          campaignStatuses: plotStatuses,
          pauseReason: finalReason
        });
      }

      // Registrar en el Historial de Auditoría
      const newEntry: CampaignHistoryEntry = {
        id: `hist-${Date.now()}`,
        campaign: targetCamp,
        entityType: 'Campo',
        entityId: loc.id,
        entityName: loc.name,
        locationName: loc.name,
        previousStatus: pauseModalState.currentStatus,
        newStatus: 'Pausado',
        reason: finalReason,
        timestamp: new Date().toISOString(),
        responsibleName: currentUser?.name || 'Operador',
        surfaceArea: pauseModalState.surfaceArea
      };
      setHistoryEntries(prev => [newEntry, ...prev]);

      showToast(`⏸️ "${loc.name}" pausado en campaña ${targetCamp}. El registro permanece visible con badge de pausa y en el Historial.`);

    } else {
      // Pausar Parcela
      const plot = plots.find(p => p.id === pauseModalState.entityId);
      if (!plot) return;

      const targetCamp = selectedCampaign === 'all' ? (plot.campaign || '2025/2026') : selectedCampaign;
      const plotCampaigns = Array.from(new Set([...(plot.activeCampaigns || [targetCamp]), targetCamp]));
      const plotStatuses = { ...(plot.campaignStatuses || {}), [targetCamp]: 'Pausada' as const };
      const plotReasons = { ...(plot.campaignPauseReasons || {}), [targetCamp]: finalReason };

      await updatePlot({
        ...plot,
        status: 'Pausada',
        activeCampaigns: plotCampaigns,
        campaignStatuses: plotStatuses,
        campaignPauseReasons: plotReasons,
        pauseReason: finalReason
      });

      // Registrar en el Historial
      const newEntry: CampaignHistoryEntry = {
        id: `hist-${Date.now()}`,
        campaign: targetCamp,
        entityType: 'Parcela',
        entityId: plot.id,
        entityName: plot.name,
        locationName: pauseModalState.locationName || 'Campo Padre',
        previousStatus: pauseModalState.currentStatus,
        newStatus: 'Pausado',
        reason: finalReason,
        timestamp: new Date().toISOString(),
        responsibleName: currentUser?.name || 'Operador',
        surfaceArea: pauseModalState.surfaceArea
      };
      setHistoryEntries(prev => [newEntry, ...prev]);

      showToast(`⏸️ Parcela "${plot.name}" pausada. El registro permanece disponible para reanudar.`);
    }

    setPauseModalState(prev => ({ ...prev, isOpen: false }));
  };

  // REANUDAR O ACTIVAR CAMPO EN LA CAMPAÑA
  const handleResumeLocationCampaign = async (loc: Location, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManage) return;

    const targetCamp = selectedCampaign === 'all' ? '2025/2026' : selectedCampaign;
    const currentCampaigns = loc.activeCampaigns || ['2024/2025', '2025/2026'];
    const updatedCampaigns = Array.from(new Set([...currentCampaigns, targetCamp]));
    const updatedStatuses = { ...(loc.campaignStatuses || {}), [targetCamp]: 'Activo' as const };

    await updateLocation({
      ...loc,
      activeCampaigns: updatedCampaigns,
      campaignStatuses: updatedStatuses,
      status: 'Activo',
      pauseReason: undefined
    });

    // Reanudar parcelas hijas
    const childPlots = plots.filter(p => p.locationId === loc.id);
    for (const plot of childPlots) {
      const plotCampaigns = Array.from(new Set([...(plot.activeCampaigns || [targetCamp]), targetCamp]));
      const plotStatuses = { ...(plot.campaignStatuses || {}), [targetCamp]: 'Activa' as const };
      await updatePlot({
        ...plot,
        status: 'Activa',
        activeCampaigns: plotCampaigns,
        campaignStatuses: plotStatuses,
        pauseReason: undefined
      });
    }

    // Registrar en Historial
    const newEntry: CampaignHistoryEntry = {
      id: `hist-${Date.now()}`,
      campaign: targetCamp,
      entityType: 'Campo',
      entityId: loc.id,
      entityName: loc.name,
      locationName: loc.name,
      previousStatus: 'Pausado',
      newStatus: 'Activo',
      reason: 'Reanudación operativa / habilitación en producción activa de campaña.',
      timestamp: new Date().toISOString(),
      responsibleName: currentUser?.name || 'Operador',
      surfaceArea: loc.capacityHa || loc.sowingDeclarationHa || 0
    };
    setHistoryEntries(prev => [newEntry, ...prev]);

    showToast(`▶ "${loc.name}" reactivado en producción activa para la campaña ${targetCamp}.`);
  };

  // REANUDAR O ACTIVAR PARCELA EN LA CAMPAÑA
  const handleResumePlotCampaign = async (plot: Plot, locName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManage) return;

    const targetCamp = selectedCampaign === 'all' ? (plot.campaign || '2025/2026') : selectedCampaign;
    const plotCampaigns = Array.from(new Set([...(plot.activeCampaigns || [targetCamp]), targetCamp]));
    const plotStatuses = { ...(plot.campaignStatuses || {}), [targetCamp]: 'Activa' as const };

    await updatePlot({
      ...plot,
      status: 'Activa',
      activeCampaigns: plotCampaigns,
      campaignStatuses: plotStatuses,
      pauseReason: undefined
    });

    const newEntry: CampaignHistoryEntry = {
      id: `hist-${Date.now()}`,
      campaign: targetCamp,
      entityType: 'Parcela',
      entityId: plot.id,
      entityName: plot.name,
      locationName: locName,
      previousStatus: 'Pausada',
      newStatus: 'Activo',
      reason: 'Reanudación agronómica de lote en campaña activa.',
      timestamp: new Date().toISOString(),
      responsibleName: currentUser?.name || 'Operador',
      surfaceArea: plot.surfaceArea || 0
    };
    setHistoryEntries(prev => [newEntry, ...prev]);

    showToast(`▶ Parcela "${plot.name}" reactivada con éxito.`);
  };

  // HABILITAR UN CAMPO DE LA RED EN ESTA CAMPAÑA (DESDE LA SECCIÓN NO ASIGNADOS)
  const handleEnableFieldInCampaign = async (loc: Location) => {
    if (!canManage) return;
    const targetCamp = selectedCampaign === 'all' ? '2025/2026' : selectedCampaign;
    const current = loc.activeCampaigns || [];
    const updated = Array.from(new Set([...current, targetCamp]));
    const updatedStatuses = { ...(loc.campaignStatuses || {}), [targetCamp]: 'Activo' as const };

    await updateLocation({
      ...loc,
      activeCampaigns: updated,
      campaignStatuses: updatedStatuses,
      status: 'Activo'
    });

    const newEntry: CampaignHistoryEntry = {
      id: `hist-${Date.now()}`,
      campaign: targetCamp,
      entityType: 'Campo',
      entityId: loc.id,
      entityName: loc.name,
      locationName: loc.name,
      previousStatus: 'No Asignado',
      newStatus: 'Activo',
      reason: `Incorporación oficial del predio al ciclo agrícola ${targetCamp}.`,
      timestamp: new Date().toISOString(),
      responsibleName: currentUser?.name || 'Operador',
      surfaceArea: loc.capacityHa || loc.sowingDeclarationHa || 0
    };
    setHistoryEntries(prev => [newEntry, ...prev]);

    showToast(`✅ "${loc.name}" incorporado y habilitado en la campaña ${targetCamp}.`);
  };

  // Guardar o Editar Proyecto de Campaña
  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectFormData.name) return;

    const payload: Project = {
      id: editingProjectId || `proj-${Date.now()}`,
      name: projectFormData.name.trim(),
      description: projectFormData.description || '',
      startDate: projectFormData.startDate || new Date().toISOString().split('T')[0],
      status: (projectFormData.status || 'En Curso') as any,
      campaign: selectedCampaign === 'all' ? '2025/2026' : selectedCampaign,
      objectiveType: projectFormData.objectiveType || 'Fibra Industrial',
      targetYieldTn: Number(projectFormData.targetYieldTn) || 500,
      budgetUsd: Number(projectFormData.budgetUsd) || 120000,
      directorId: projectFormData.directorId || undefined,
      responsibleIds: projectFormData.responsibleIds || []
    };

    if (editingProjectId) {
      await updateProject(payload);
      showToast(`Programa "${payload.name}" actualizado.`);
    } else {
      await addProject(payload);
      showToast(`Nuevo programa "${payload.name}" creado con éxito.`);
    }

    setIsProjectModalOpen(false);
    setEditingProjectId(null);
  };

  // Datos para el mapa satelital geodésico
  const activeMapLocation = useMemo(() => {
    if (selectedMapLocationId === 'all') return campaignLocations[0] || locations[0];
    return locations.find(l => l.id === selectedMapLocationId) || campaignLocations[0] || locations[0];
  }, [selectedMapLocationId, campaignLocations, locations]);

  // Polígonos de parcelas para mostrar en el mapa satelital de geodesia
  const mapPlotPolygons = useMemo(() => {
    if (!activeMapLocation) return [];
    const relevantPlots = campaignPlots.filter(p => p.locationId === activeMapLocation.id);
    return relevantPlots
      .filter(p => p.polygon && p.polygon.length >= 3)
      .map(p => ({
        id: p.id,
        polygon: p.polygon || [],
        label: `Lote: ${p.name} (${p.surfaceArea} ${p.surfaceUnit || 'ha'}) · ${p.type}`,
        color: p.color || '#a855f7'
      }));
  }, [activeMapLocation, campaignPlots]);

  // Campos filtrados según el sub-filtro de estado ('all', 'active', 'paused', 'unassigned')
  const displayedLocations = useMemo(() => {
    if (fieldStatusFilter === 'unassigned') return unassignedLocations;
    if (fieldStatusFilter === 'active') {
      return campaignLocations.filter(loc => getLocationCampaignStatus(loc, selectedCampaign) === 'Activo');
    }
    if (fieldStatusFilter === 'paused') {
      return campaignLocations.filter(loc => getLocationCampaignStatus(loc, selectedCampaign) !== 'Activo');
    }
    return campaignLocations;
  }, [campaignLocations, unassignedLocations, fieldStatusFilter, selectedCampaign]);

  // Historial filtrado para la pestaña 5
  const filteredHistory = useMemo(() => {
    return historyEntries.filter(entry => {
      // Filtro de Campaña
      if (historyCampaignFilter !== 'all' && entry.campaign !== historyCampaignFilter) return false;
      // Filtro de Estado
      if (historyStatusFilter !== 'all' && entry.newStatus !== historyStatusFilter) return false;
      // Filtro de Tipo
      if (historyTypeFilter !== 'all' && entry.entityType !== historyTypeFilter) return false;
      // Buscador por texto
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        const matchName = entry.entityName?.toLowerCase().includes(q);
        const matchLoc = entry.locationName?.toLowerCase().includes(q);
        const matchReason = entry.reason?.toLowerCase().includes(q);
        const matchResp = entry.responsibleName?.toLowerCase().includes(q);
        if (!matchName && !matchLoc && !matchReason && !matchResp) return false;
      }
      return true;
    });
  }, [historyEntries, historyCampaignFilter, historyStatusFilter, historyTypeFilter, historySearchQuery]);

  // Exportar Historial a CSV
  const handleExportHistoryCSV = () => {
    const headers = ['ID', 'Fecha', 'Campaña', 'Tipo', 'Entidad', 'Establecimiento', 'Estado Anterior', 'Nuevo Estado', 'Hectáreas', 'Motivo Agronómico', 'Responsable'];
    const rows = filteredHistory.map(h => [
      h.id,
      new Date(h.timestamp).toLocaleString(),
      h.campaign,
      h.entityType,
      `"${h.entityName}"`,
      `"${h.locationName || ''}"`,
      h.previousStatus,
      h.newStatus,
      h.surfaceArea || 0,
      `"${(h.reason || '').replace(/"/g, '""')}"`,
      `"${h.responsibleName || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_campanas_${selectedCampaign.replace('/', '-')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-500 pb-16">
      
      {/* TOAST FLOTANTE DE NOTIFICACIÓN */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom duration-300 font-mono text-xs">
          <Info size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. CABECERA PRINCIPAL Y SELECTOR DE CAMPAÑA AGRÍCOLA */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <FolderKanban size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <span>Campañas Agrícolas</span>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {selectedCampaign === 'all' ? 'Multicampaña' : `Campaña ${selectedCampaign}`}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Gestión integral por ciclo: Campos participantes, DDJJ Geodésicas, Unidades Productivas & Auditoría de Estados.
              </p>
            </div>
          </div>
        </div>

        {/* SELECTOR SEGMENTADO DE CAMPAÑAS AGRÍCOLAS */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            {CAMPAIGNS.map(camp => {
              const isCurrent = camp === '2025/2026';
              const isSelected = selectedCampaign === camp;
              return (
                <button
                  key={camp}
                  type="button"
                  onClick={() => setSelectedCampaign(camp)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black transition-all flex items-center gap-1.5 ${
                    isSelected 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' 
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span>{camp}</span>
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" title="Campaña en curso" />
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedCampaign('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black transition-all ${
                selectedCampaign === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todas
            </button>
          </div>

          {canManage && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingProjectId(null);
                  setProjectFormData({
                    name: '',
                    description: '',
                    startDate: new Date().toISOString().split('T')[0],
                    status: 'En Curso',
                    campaign: selectedCampaign === 'all' ? '2025/2026' : selectedCampaign,
                    objectiveType: 'Fibra Industrial',
                    targetYieldTn: 500,
                    budgetUsd: 120000,
                    directorId: '',
                    responsibleIds: []
                  });
                  setIsProjectModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition active:scale-95"
              >
                <Plus size={15} />
                <span>Nuevo Programa</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. BILLBOARD DE TELEMETRÍA Y CONTROL EJECUTIVO DE CAMPAÑA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Superficie DDJJ Oficial vs Sembrada */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400">
              Declaración Jurada vs Lotes
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-slate-900 dark:text-white">
              {billboardStats.effectiveSownHa}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              / {billboardStats.totalDeclaredDDJJHa} Ha DDJJ
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono font-semibold">
            <span className="text-emerald-600 dark:text-emerald-400">
              {billboardStats.ddjjUtilizationPct}% cupo ocupado
            </span>
            <span className="text-slate-400">
              {billboardStats.activeFieldsCount} Activos · {billboardStats.pausedFieldsCount} Pausa
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-sky-500 h-full rounded-full transition-all duration-700" 
              style={{ width: `${Math.min(billboardStats.ddjjUtilizationPct, 100)}%` }} 
            />
          </div>
        </div>

        {/* KPI 2: Unidades Productivas & Manejo */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400">
              Unidades Productivas Activas
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Sprout size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-emerald-600 dark:text-emerald-400">
              {billboardStats.activePlotsCount}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              / {billboardStats.totalPlots} Lotes Totales
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono font-semibold">
            <span className="text-slate-600 dark:text-slate-300">
              {billboardStats.commercialPlotsCount} Prod. · {billboardStats.trialPlotsCount} Ensayos I+D
            </span>
            {billboardStats.pausedPlotsCount > 0 && (
              <span className="text-amber-500 font-bold flex items-center gap-1">
                <Pause size={10} />
                {billboardStats.pausedPlotsCount} en Pausa ({billboardStats.pausedHa} Ha)
              </span>
            )}
          </div>
          <div className="mt-3 text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <span>Semilla Comprometida:</span>
            <strong className="text-slate-700 dark:text-slate-200">{billboardStats.totalSeedKg} kg</strong>
          </div>
        </div>

        {/* KPI 3: Cosecha Cuantitativa Proyectada */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400">
              Proyección de Cosecha
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Scale size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-purple-600 dark:text-purple-400">
              {billboardStats.projectedFiberTn}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              Tn Fibra / Tallo Seco
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono font-semibold">
            <span className="text-slate-700 dark:text-slate-300">
              + {billboardStats.projectedGrainTn} Tn Grano
            </span>
            {billboardStats.projectedBiomassKg > 0 && (
              <span className="text-emerald-500 font-bold">
                {billboardStats.projectedBiomassKg} kg CBG
              </span>
            )}
          </div>
          <div className="mt-3 text-[10px] font-mono text-slate-400">
            Rendimiento Medio: <strong className="text-slate-700 dark:text-slate-200">7.8 Tn/Ha tallo</strong>
          </div>
        </div>

        {/* KPI 4: Economía & Calificación Cualitativa */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400">
              Margen Bruto Proyectado
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-lg border ${
                billboardStats.qualitativeScore === 'A+' 
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                  : 'bg-sky-500/10 text-sky-500 border-sky-500/30'
              }`}>
                Clase {billboardStats.qualitativeScore}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">
              ${(billboardStats.totalNetMarginUsd / 1000).toFixed(1)}k
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              USD ({billboardStats.avgRoiPct}% ROI)
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono font-semibold">
            <span className="text-slate-500">
              Costos: ${(billboardStats.totalDirectCostUsd / 1000).toFixed(1)}k USD
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              +${billboardStats.marginPerHa} USD/Ha
            </span>
          </div>
          <div className="mt-3 text-[10px] font-mono text-slate-400">
            VBP Estimado: <strong className="text-slate-700 dark:text-slate-200">${(billboardStats.totalGrossRevenueUsd / 1000).toFixed(1)}k USD</strong>
          </div>
        </div>

      </div>

      {/* 3. BARRA DE PESTAÑAS DE VISTA */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('billboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider transition ${
            activeTab === 'billboard'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Tractor size={15} />
          <span>1. Campos & Lotes ({campaignLocations.length} Sitios)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('geodesy')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider transition ${
            activeTab === 'geodesy'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Satellite size={15} />
          <span>2. Cartografía Geodésica HD (DDJJ + Parcelas)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('economics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider transition ${
            activeTab === 'economics'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <DollarSign size={15} />
          <span>3. Economía Cuantitativa & Cualitativa</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider transition ${
            activeTab === 'projects'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award size={15} />
          <span>4. Programas Operativos ({campaignProjects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider transition relative ${
            activeTab === 'history'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History size={15} />
          <span>5. Historial & Auditoría ({historyEntries.length})</span>
          {billboardStats.pausedFieldsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>
      </div>

      {/* 4. CONTENIDO SEGÚN PESTAÑA */}

      {/* PESTAÑA 1: JERARQUÍA CAMPOS PARTICIPANTES -> UNIDADES PRODUCTIVAS & PARCELAS */}
      {activeTab === 'billboard' && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <span>Ecosistema de Campos y Lotes de la Campaña</span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  ({displayedLocations.length} Establecimientos mostrados)
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Desglose jerárquico por predio. Los campos y lotes en pausa se mantienen claramente registrados y auditables.
              </p>
            </div>

            {/* SUB-FILTROS DE ESTADO OPERATIVO */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setFieldStatusFilter('all')}
                className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold transition ${
                  fieldStatusFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos en Ciclo ({campaignLocations.length})
              </button>
              <button
                type="button"
                onClick={() => setFieldStatusFilter('active')}
                className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold transition flex items-center gap-1 ${
                  fieldStatusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                <Play size={10} />
                <span>Activos ({billboardStats.activeFieldsCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFieldStatusFilter('paused')}
                className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold transition flex items-center gap-1 ${
                  fieldStatusFilter === 'paused'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                <Pause size={10} />
                <span>Pausados / Barbecho ({billboardStats.pausedFieldsCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFieldStatusFilter('unassigned')}
                className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold transition ${
                  fieldStatusFilter === 'unassigned'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
              >
                Otros de la Red ({unassignedLocations.length})
              </button>
            </div>
          </div>

          {displayedLocations.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center">
              <Tractor size={40} className="mx-auto text-slate-400 mb-3 opacity-40" />
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wide">
                No hay campos bajo el filtro seleccionado para la campaña {selectedCampaign}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {fieldStatusFilter === 'paused' 
                  ? 'No hay establecimientos en descanso o pausa en este momento. Puedes pausar un campo para registrar su rotación o barbecho.'
                  : 'Prueba cambiando a "Todos en Ciclo" o seleccionando otra campaña.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedLocations.map(loc => {
                const isExpanded = expandedLocations[loc.id] ?? true;
                const locPlots = campaignPlots.filter(p => p.locationId === loc.id);
                const activeLocPlots = locPlots.filter(p => getPlotCampaignStatus(p, selectedCampaign) === 'Activa');
                const sownHa = activeLocPlots.reduce((sum, p) => sum + (p.surfaceArea || 0), 0);
                const declaredHa = loc.sowingDeclarationHa || 0;
                const pct = declaredHa > 0 ? (sownHa / declaredHa) * 100 : 0;
                
                const fieldStatus = getLocationCampaignStatus(loc, selectedCampaign);
                const isPaused = fieldStatus === 'Pausado' || fieldStatus === 'En Barbecho';
                const isUnassigned = fieldStatus === 'No Asignado';
                const pauseReason = loc.campaignPauseReasons?.[selectedCampaign] || loc.pauseReason;

                return (
                  <div 
                    key={loc.id} 
                    className={`rounded-3xl border shadow-sm overflow-hidden transition-all ${
                      isPaused
                        ? 'bg-amber-50/20 dark:bg-amber-950/10 border-amber-300/60 dark:border-amber-900/60'
                        : isUnassigned
                        ? 'bg-slate-100/50 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-700'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    {/* ENCABEZADO DEL CAMPO */}
                    <div 
                      onClick={() => toggleLocationExpand(loc.id)}
                      className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition select-none"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <button 
                          type="button" 
                          className="mt-0.5 sm:mt-0 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                              {loc.name}
                            </h3>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              {loc.siteType || 'Campo Extensivo'}
                            </span>

                            {/* BADGE DE ESTADO CLARO (ACTIVO VS PAUSADO) */}
                            {isPaused ? (
                              <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                <Pause size={10} />
                                <span>PAUSADO / EN BARBECHO</span>
                              </span>
                            ) : isUnassigned ? (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                No participa en {selectedCampaign}
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                <Play size={10} />
                                <span>ACTIVO EN PRODUCCIÓN</span>
                              </span>
                            )}

                            <span className="text-[10px] font-mono text-slate-400">
                              {loc.city}, {loc.province}
                            </span>
                          </div>

                          {/* MOTIVO DE PAUSA VISIBLE SI ESTÁ PAUSADO */}
                          {isPaused && pauseReason && (
                            <div className="mt-1.5 p-2 rounded-xl bg-amber-100/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs font-mono text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                              <Info size={13} className="shrink-0 text-amber-600" />
                              <span><strong>Motivo de Pausa / Descanso:</strong> {pauseReason}</span>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                              <ShieldCheck size={13} />
                              <strong>DDJJ:</strong> {loc.sowingDeclarationId || 'S/N Registrado'} ({declaredHa} Ha)
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <Sprout size={13} />
                              <strong>Sembrado Efectivo:</strong> {Number(sownHa.toFixed(2))} Ha ({pct.toFixed(0)}% cupo)
                            </span>
                            {loc.responsiblePerson && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Users size={13} />
                                  {loc.responsiblePerson}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* BOTONES DE ACCIÓN RÁPIDA DE CAMPO */}
                      <div className="flex items-center gap-2 self-end lg:self-center" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMapLocationId(loc.id);
                            setActiveTab('geodesy');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-sky-100 transition flex items-center gap-1"
                          title="Inspeccionar polígono geodésico y parcelas en mapa HD"
                        >
                          <Satellite size={12} />
                          <span>Ver Geodesia</span>
                        </button>

                        {/* BOTÓN CONMUTADOR INTELIGENTE (PAUSAR VS REANUDAR VS INCORPORAR) */}
                        {canManage && (
                          isUnassigned ? (
                            <button
                              type="button"
                              onClick={() => handleEnableFieldInCampaign(loc)}
                              className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-purple-500 shadow flex items-center gap-1"
                            >
                              <Plus size={12} />
                              <span>Habilitar en este ciclo</span>
                            </button>
                          ) : isPaused ? (
                            <button
                              type="button"
                              onClick={(e) => handleResumeLocationCampaign(loc, e)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-emerald-500 shadow-md shadow-emerald-600/30 flex items-center gap-1"
                              title="Reanudar el campo a producción activa en esta campaña"
                            >
                              <Play size={11} />
                              <span>Reanudar en Campaña</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleOpenPauseLocationModal(loc, e)}
                              className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-amber-100 transition flex items-center gap-1"
                              title="Registrar descanso agronómico o pausa operativa en esta campaña"
                            >
                              <Pause size={11} />
                              <span>Pausar en Campaña</span>
                            </button>
                          )
                        )}

                        <Link
                          to={`/locations/${loc.id}`}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                          title="Ficha completa de campo"
                        >
                          <ExternalLink size={15} />
                        </Link>
                      </div>
                    </div>

                    {/* LISTA EXPANDIBLE DE UNIDADES PRODUCTIVAS / LOTES DENTRO DEL CAMPO */}
                    {isExpanded && !isUnassigned && (
                      <div className="border-t border-slate-100 dark:border-slate-800 p-5 bg-slate-50/40 dark:bg-slate-900/60">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-mono font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <Sprout size={14} className="text-emerald-500" />
                            <span>Unidades Productivas del Campo ({locPlots.length})</span>
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">
                            Variedad Genética · Uso Agronómico · Superficie
                          </span>
                        </div>

                        {locPlots.length === 0 ? (
                          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 text-center">
                            <p className="text-xs font-mono text-slate-400">
                              Este campo no tiene parcelas sembradas para la campaña {selectedCampaign}.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {locPlots.map(plot => {
                              const variety = varieties.find(v => v.id === plot.varietyId);
                              const plotStatus = getPlotCampaignStatus(plot, selectedCampaign);
                              const isPlotActive = plotStatus === 'Activa';
                              const plotPauseReason = plot.campaignPauseReasons?.[selectedCampaign] || plot.pauseReason;

                              return (
                                <div 
                                  key={plot.id}
                                  className={`p-4 rounded-2xl border transition-all ${
                                    isPlotActive
                                      ? 'bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700 shadow-sm'
                                      : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span 
                                        className="w-3 h-3 rounded-full border border-white shrink-0" 
                                        style={{ backgroundColor: plot.color || '#10b981' }} 
                                      />
                                      <h5 className="font-mono font-black text-xs text-slate-900 dark:text-white truncate">
                                        {plot.name}
                                      </h5>
                                    </div>

                                    <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                                      plot.type === 'Ensayo' 
                                        ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' 
                                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                    }`}>
                                      {plot.type}
                                    </span>
                                  </div>

                                  <div className="mt-2.5 space-y-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                    <div className="flex justify-between items-center">
                                      <span>Cultivar:</span>
                                      <strong className="text-slate-800 dark:text-slate-200">
                                        {variety?.name || 'Genética s/d'} ({variety?.usage || 'Fibra'})
                                      </strong>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span>Superficie:</span>
                                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                                        {plot.surfaceArea} {plot.surfaceUnit || 'ha'}
                                      </strong>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span>Siembra:</span>
                                      <span>{plot.sowingDate || 'Fecha s/d'}</span>
                                    </div>
                                    {plot.irrigationType && (
                                      <div className="flex justify-between items-center text-[10px]">
                                        <span>Riego:</span>
                                        <span className="truncate max-w-[130px]">{plot.irrigationType}</span>
                                      </div>
                                    )}
                                  </div>

                                  {!isPlotActive && plotPauseReason && (
                                    <div className="mt-2 p-1.5 rounded-lg bg-amber-100/60 dark:bg-amber-950/40 text-[10px] font-mono text-amber-700 dark:text-amber-300">
                                      {plotPauseReason}
                                    </div>
                                  )}

                                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                                    <span className={`text-[9px] font-mono font-bold uppercase flex items-center gap-1 ${
                                      isPlotActive ? 'text-emerald-600' : 'text-amber-600'
                                    }`}>
                                      {isPlotActive ? <Play size={9} /> : <Pause size={9} />}
                                      <span>{isPlotActive ? 'Activa' : 'Pausada'}</span>
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                      {canManage && (
                                        isPlotActive ? (
                                          <button
                                            type="button"
                                            onClick={(e) => handleOpenPausePlotModal(plot, loc.name, e)}
                                            className="px-2 py-1 rounded-lg text-[9px] font-mono font-bold uppercase bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 transition"
                                            title="Pausar lote para descanso o rotación"
                                          >
                                            Pausar
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={(e) => handleResumePlotCampaign(plot, loc.name, e)}
                                            className="px-2 py-1 rounded-lg text-[9px] font-mono font-bold uppercase bg-emerald-600 text-white hover:bg-emerald-500 shadow transition"
                                            title="Reanudar lote a producción activa"
                                          >
                                            Reanudar
                                          </button>
                                        )
                                      )}
                                      <Link
                                        to={`/plots/${plot.id}`}
                                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                        title="Ver detalles del lote"
                                      >
                                        <ChevronRight size={14} />
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: CARTOGRAFÍA GEODÉSICA INTEGRAL HD (DDJJ SIEMBRA + PARCELAS) */}
      {activeTab === 'geodesy' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <Satellite size={18} className="text-emerald-400" />
                <span>Mapeo Geodésico Satelital de Campaña {selectedCampaign}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Visualización de polígonos oficiales de DDJJ de Siembra ante ARICCAME/SENASA y parcelas productivas georreferenciadas.
              </p>
            </div>

            {/* SELECTOR DE CAMPO A ENFOCAR EN EL MAPA */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-mono font-bold uppercase text-slate-400">
                Enfocar Campo:
              </label>
              <select
                className="bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-white rounded-xl px-3 py-1.5 outline-none"
                value={selectedMapLocationId}
                onChange={e => setSelectedMapLocationId(e.target.value)}
              >
                <option value="all">📍 Ver Todo el Ecosistema</option>
                {campaignLocations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.siteType || 'Campo'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* VISOR SATELITAL HD CON MAPEDITOR */}
          <div className="w-full h-[540px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl relative">
            <MapEditor
              key={`campaign-map-${selectedMapLocationId}-${selectedCampaign}`}
              initialCenter={
                activeMapLocation?.coordinates && !isNaN(activeMapLocation.coordinates.lat) 
                  ? activeMapLocation.coordinates 
                  : { lat: -33.1235, lng: -64.3492 }
              }
              initialPolygon={activeMapLocation?.polygon || []}
              sowingPolygon={activeMapLocation?.sowingDeclarationPolygon || []}
              enableSowingLayer={true}
              readOnly={true}
              extraPolygons={mapPlotPolygons}
              height="540px"
            />
          </div>

          {/* TELEMETRÍA GEODÉSICA DEL CAMPO INSPECCIONADO */}
          {activeMapLocation && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">
                  Establecimiento
                </span>
                <h4 className="text-sm font-black text-slate-900 dark:text-white font-mono">
                  {activeMapLocation.name}
                </h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  {activeMapLocation.city}, {activeMapLocation.province}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 block">
                  DDJJ Siembra Geodésica
                </span>
                <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  {activeMapLocation.sowingDeclarationId || 'S/N Expediente'}
                </p>
                <p className="text-[11px] font-mono text-emerald-600 font-bold">
                  {activeMapLocation.sowingDeclarationHa || 0} Hectáreas Declaradas
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-sky-600 block">
                  Capacidad & Tenencia
                </span>
                <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  {activeMapLocation.capacityHa || 0} Ha Superficie Predial
                </p>
                <p className="text-[11px] font-mono text-slate-500">
                  Tenencia: {activeMapLocation.landTenureType || 'Propiedad'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-purple-600 block">
                  Parcelas Sembradas
                </span>
                <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  {campaignPlots.filter(p => p.locationId === activeMapLocation.id).length} Unidades Productivas
                </p>
                <p className="text-[11px] font-mono text-purple-600 font-bold">
                  {campaignPlots.filter(p => p.locationId === activeMapLocation.id && p.status === 'Activa').reduce((s, p) => s + (p.surfaceArea || 0), 0)} Ha en Producción
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 3: ECONOMÍA CUANTITATIVA & CUALITATIVA (COSTOS, INGRESOS & RENTABILIDAD) */}
      {activeTab === 'economics' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-500" />
                <span>Matriz Económica y Cualitativa de Campaña {selectedCampaign}</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Transformación de datos cuantitativos de producción en costos operativos directos, ingresos y margen bruto.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                VBP Proyectado: ${(billboardStats.totalGrossRevenueUsd / 1000).toFixed(1)}k USD
              </span>
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                Margen Neto: ${(billboardStats.totalNetMarginUsd / 1000).toFixed(1)}k USD
              </span>
            </div>
          </div>

          {/* TABLA DETALLADA DE UNIDADES PRODUCTIVAS CON EVALUACIÓN ECONÓMICA Y CUALITATIVA */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Desglose Económico por Lote y Variedad
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                Precios base: Fibra $340 USD/Tn · Grano $1,250 USD/Tn · CBG $9.5 USD/kg
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Lote / Parcela</th>
                    <th className="py-3 px-4">Campo Padre</th>
                    <th className="py-3 px-4">Cultivar & Destino</th>
                    <th className="py-3 px-4 text-right">Superficie</th>
                    <th className="py-3 px-4 text-right">Costo Directo</th>
                    <th className="py-3 px-4 text-right">Rend. Est.</th>
                    <th className="py-3 px-4 text-right">Ingreso Bruto</th>
                    <th className="py-3 px-4 text-right">Margen Bruto</th>
                    <th className="py-3 px-4 text-center">Score Cualitativo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {campaignPlots.map(plot => {
                    const loc = locations.find(l => l.id === plot.locationId);
                    const variety = varieties.find(v => v.id === plot.varietyId);
                    const area = plot.surfaceArea || 0;
                    const isIrrigated = plot.irrigationType && !plot.irrigationType.toLowerCase().includes('secano');
                    const isPlotActive = getPlotCampaignStatus(plot, selectedCampaign) === 'Activa';
                    
                    let costPerHa = 480;
                    if (isIrrigated) costPerHa = 720;
                    if (plot.type === 'Ensayo') costPerHa += 400;
                    const totalCost = area * costPerHa;

                    const usage = variety?.usage || 'Fibra';
                    let yieldText = '';
                    let revenue = 0;

                    if (usage === 'Fibra') {
                      const yieldVal = isIrrigated ? 9.2 : 7.4;
                      const prod = area * yieldVal;
                      yieldText = `${yieldVal} Tn/Ha (${prod.toFixed(1)} Tn)`;
                      revenue = prod * 340;
                    } else if (usage === 'Grano') {
                      const yieldVal = isIrrigated ? 1.8 : 1.25;
                      const prod = area * yieldVal;
                      yieldText = `${yieldVal} Tn/Ha (${prod.toFixed(1)} Tn)`;
                      revenue = prod * 1250;
                    } else if (usage === 'Dual') {
                      const prodF = area * (isIrrigated ? 6.5 : 5.2);
                      const prodG = area * (isIrrigated ? 1.3 : 0.95);
                      yieldText = `${prodF.toFixed(0)}T Fib / ${prodG.toFixed(1)}T Gr`;
                      revenue = (prodF * 340) + (prodG * 1250);
                    } else {
                      const prod = area * 1100;
                      yieldText = `1,100 kg/Ha (${prod.toFixed(0)} kg)`;
                      revenue = prod * 9.5;
                    }

                    const margin = revenue - totalCost;
                    const roi = totalCost > 0 ? (margin / totalCost) * 100 : 0;
                    
                    let scoreBadge = { label: 'Clase A', color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300' };
                    if (!isPlotActive) {
                      scoreBadge = { label: 'En Descanso / Pausa', color: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300' };
                    } else if (plot.type === 'Ensayo') {
                      scoreBadge = { label: 'I+D Ensayos', color: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300' };
                    } else if (roi >= 70 || margin > 15000) {
                      scoreBadge = { label: 'Excelente A+', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-400' };
                    } else if (roi < 20) {
                      scoreBadge = { label: 'Equilibrio B', color: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300' };
                    }

                    return (
                      <tr key={plot.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: plot.color || '#10b981' }} />
                            <span>{plot.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                          {loc?.name || 'S/N'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{variety?.name || 'Genética s/d'}</span>
                          <span className="text-[10px] text-slate-400 ml-1">({variety?.usage || 'Fibra'})</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                          {area} {plot.surfaceUnit || 'ha'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                          ${totalCost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                          {yieldText}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-sky-600 dark:text-sky-400">
                          ${revenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          +${margin.toLocaleString()}
                          <span className="text-[9px] text-slate-400 block font-normal">({roi.toFixed(0)}% ROI)</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-bold ${scoreBadge.color}`}>
                            {scoreBadge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: PROGRAMAS Y PROYECTOS DE LA CAMPAÑA */}
      {activeTab === 'projects' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Award size={18} className="text-emerald-500" />
                <span>Programas Operativos de la Campaña {selectedCampaign}</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Ejes estratégicos de investigación, multiplicación de semillas y desarrollo industrial para este ciclo.
              </p>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setEditingProjectId(null);
                  setProjectFormData({
                    name: '',
                    description: '',
                    startDate: new Date().toISOString().split('T')[0],
                    status: 'En Curso',
                    campaign: selectedCampaign === 'all' ? '2025/2026' : selectedCampaign,
                    objectiveType: 'Fibra Industrial',
                    targetYieldTn: 500,
                    budgetUsd: 120000,
                    directorId: '',
                    responsibleIds: []
                  });
                  setIsProjectModalOpen(true);
                }}
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider shadow flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Crear Programa</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaignProjects.map(proj => {
              const director = usersList.find(u => u.id === proj.directorId);
              const linkedPlots = plots.filter(p => p.projectId === proj.id);

              return (
                <div 
                  key={proj.id}
                  className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        {proj.objectiveType || 'Fibra Industrial'}
                      </span>

                      {canManage && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProjectId(proj.id);
                              setProjectFormData(proj);
                              setIsProjectModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg"
                          >
                            <Edit2 size={13} />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Eliminar programa "${proj.name}"?`)) {
                                  deleteProject(proj.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {proj.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {proj.description || 'Sin descripción cargada.'}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs font-mono">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Campaña:</span>
                        <strong className="text-slate-900 dark:text-white">{proj.campaign || selectedCampaign}</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Meta de Cosecha:</span>
                        <strong className="text-purple-600 font-bold">{proj.targetYieldTn || 0} Tn</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Presupuesto Asignado:</span>
                        <strong className="text-emerald-600 font-bold">${(proj.budgetUsd || 0).toLocaleString()} USD</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Lotes Vinculados:</span>
                        <strong className="text-slate-900 dark:text-white">{linkedPlots.length} parcelas</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 text-[10px]">
                      Director: <strong className="text-slate-700 dark:text-slate-300">{director?.name || 'Gastón Barea'}</strong>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      proj.status === 'En Curso' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'
                    }`}>
                      {proj.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 5: HISTORIAL Y AUDITORÍA DE ESTADOS DE CAMPAÑAS */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <History size={18} className="text-amber-500" />
                <span>Historial de Auditoría & Trazabilidad de Campañas</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Registro inmutable de todas las pausas agronómicas, rotaciones edáficas, reanudaciones y cierres de ciclo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportHistoryCSV}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-1.5"
              >
                <Download size={14} />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* BARRA DE BÚSQUEDA Y FILTROS DEL HISTORIAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            {/* BUSCADOR */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar campo, lote o motivo..."
                value={historySearchQuery}
                onChange={e => setHistorySearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 pl-9 pr-3 py-2 rounded-xl text-xs font-mono outline-none"
              />
            </div>

            {/* FILTRO DE CAMPAÑA */}
            <div>
              <select
                value={historyCampaignFilter}
                onChange={e => setHistoryCampaignFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-mono outline-none font-bold"
              >
                <option value="all">Todas las Campañas</option>
                {CAMPAIGNS.map(c => (
                  <option key={c} value={c}>Campaña {c}</option>
                ))}
              </select>
            </div>

            {/* FILTRO DE ESTADO */}
            <div>
              <select
                value={historyStatusFilter}
                onChange={e => setHistoryStatusFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-mono outline-none font-bold"
              >
                <option value="all">Todos los Estados</option>
                <option value="Pausado">Pausado / En Barbecho</option>
                <option value="Activo">Activo / Reanudado</option>
                <option value="Finalizado">Finalizado / Cosechado</option>
              </select>
            </div>

            {/* FILTRO DE TIPO DE ENTIDAD */}
            <div>
              <select
                value={historyTypeFilter}
                onChange={e => setHistoryTypeFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-mono outline-none font-bold"
              >
                <option value="all">Campos y Parcelas</option>
                <option value="Campo">Solo Campos / Sitios</option>
                <option value="Parcela">Solo Parcelas / Lotes</option>
              </select>
            </div>
          </div>

          {/* TABLA PRINCIPAL DEL HISTORIAL DE AUDITORÍA */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Registros de Trazabilidad ({filteredHistory.length})
              </span>
              <span className="text-slate-400 text-[10px]">
                Auditoría en tiempo real de operaciones agronómicas
              </span>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="p-12 text-center">
                <History size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2 opacity-50" />
                <p className="text-xs font-mono text-slate-500">
                  No se encontraron registros históricos con los filtros aplicados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Fecha y Hora</th>
                      <th className="py-3 px-4">Entidad & Tipo</th>
                      <th className="py-3 px-4">Establecimiento</th>
                      <th className="py-3 px-4">Campaña</th>
                      <th className="py-3 px-4">Estado Operativo</th>
                      <th className="py-3 px-4 text-right">Superficie</th>
                      <th className="py-3 px-4">Motivo Agronómico / Observación</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredHistory.map(entry => {
                      const isPaused = entry.newStatus === 'Pausado' || entry.newStatus === 'En Barbecho';
                      const isResumed = entry.newStatus === 'Activo';

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 text-[11px] text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} className="text-slate-400 shrink-0" />
                              <span>{new Date(entry.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                entry.entityType === 'Campo' 
                                  ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300' 
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              }`}>
                                {entry.entityType}
                              </span>
                              <strong className="text-slate-900 dark:text-white truncate max-w-[160px]">
                                {entry.entityName}
                              </strong>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-500">
                            {entry.locationName || 'Predio General'}
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {entry.campaign}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 w-fit ${
                              isPaused
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300'
                                : isResumed
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300'
                            }`}>
                              {isPaused ? <Pause size={10} /> : <Play size={10} />}
                              <span>{entry.newStatus}</span>
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-slate-700 dark:text-slate-300">
                            {entry.surfaceArea ? `${entry.surfaceArea} ha` : '-'}
                          </td>

                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                            <p className="line-clamp-2" title={entry.reason}>
                              {entry.reason || 'Sin observación registrada.'}
                            </p>
                            {entry.responsibleName && (
                              <span className="text-[9px] text-slate-400 block mt-0.5">
                                Reg: {entry.responsibleName}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            {entry.entityType === 'Campo' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCampaign(entry.campaign);
                                  setSelectedMapLocationId(entry.entityId);
                                  setActiveTab('billboard');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold uppercase transition"
                              >
                                Ver Campo
                              </button>
                            ) : (
                              <Link
                                to={`/plots/${entry.entityId}`}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold uppercase transition inline-block"
                              >
                                Ver Lote
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL INTELIGENTE: PAUSAR CAMPO O LOTE CON REGISTRO DE MOTIVO AGRONÓMICO */}
      {pauseModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-amber-600 flex items-center gap-1">
                  <Pause size={12} />
                  <span>Pausar en Campaña {selectedCampaign}</span>
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight mt-0.5">
                  {pauseModalState.entityName}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {pauseModalState.entityType} ({pauseModalState.surfaceArea} ha) · El registro permanecerá visible en estado Pausado y archivado en el Historial.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setPauseModalState(prev => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                Seleccione el Motivo Agronómico de la Pausa *
              </label>

              <div className="space-y-2">
                {PRESET_PAUSE_REASONS.map((reason, idx) => {
                  const isCustomOption = reason.startsWith('Otro');
                  const isSelected = isCustomOption ? pauseModalState.isCustom : (pauseModalState.reason === reason && !pauseModalState.isCustom);

                  return (
                    <label 
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                        isSelected 
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200' 
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="pauseReason"
                        checked={isSelected}
                        onChange={() => {
                          if (isCustomOption) {
                            setPauseModalState(prev => ({ ...prev, isCustom: true }));
                          } else {
                            setPauseModalState(prev => ({ ...prev, reason, isCustom: false }));
                          }
                        }}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-xs font-mono">{reason}</span>
                    </label>
                  );
                })}
              </div>

              {pauseModalState.isCustom && (
                <div className="pt-2 animate-in fade-in">
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    Describa el motivo personalizado:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Especifique las razones técnicas, climáticas o de rotación..."
                    value={pauseModalState.customReason}
                    onChange={e => setPauseModalState(prev => ({ ...prev, customReason: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPauseModalState(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-mono font-bold text-slate-500 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPause}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-lg shadow-amber-600/20 flex items-center gap-1.5"
              >
                <Pause size={13} />
                <span>Confirmar Pausa en Campaña</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR PROYECTO O PROGRAMA DE CAMPAÑA */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Award size={16} className="text-emerald-600" />
                <span>{editingProjectId ? 'Editar Programa de Campaña' : 'Nuevo Programa Agronómico'}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setIsProjectModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProject} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                  Nombre del Programa / Objetivo *
                </label>
                <input
                  required
                  placeholder="Ej: Campaña Fibra Textil & Biocompuestos 2025/26"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none font-mono"
                  value={projectFormData.name}
                  onChange={e => setProjectFormData({ ...projectFormData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    Campaña Agrícola
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none font-mono"
                    value={projectFormData.campaign}
                    onChange={e => setProjectFormData({ ...projectFormData, campaign: e.target.value })}
                  >
                    {CAMPAIGNS.map(c => (
                      <option key={c} value={c}>Campaña {c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    Eje / Destino Principal
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none font-mono"
                    value={projectFormData.objectiveType}
                    onChange={e => setProjectFormData({ ...projectFormData, objectiveType: e.target.value as any })}
                  >
                    <option value="Fibra Industrial">Fibra Industrial & Bioconstrucción</option>
                    <option value="Grano y Alimento">Grano & Proteína Vegetal</option>
                    <option value="I+D Genético">I+D Ensayos & Variedades</option>
                    <option value="Cannabinoides / Biomasa">CBG / CBD / Biomasa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    Meta de Cosecha (Tn)
                  </label>
                  <input
                    type="number"
                    step="10"
                    placeholder="Ej: 500"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none font-mono"
                    value={projectFormData.targetYieldTn || ''}
                    onChange={e => setProjectFormData({ ...projectFormData, targetYieldTn: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                    Presupuesto Operativo (USD)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    placeholder="Ej: 120000"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none font-mono"
                    value={projectFormData.budgetUsd || ''}
                    onChange={e => setProjectFormData({ ...projectFormData, budgetUsd: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                  Director / Responsable Técnico
                </label>
                <select
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none font-mono"
                  value={projectFormData.directorId || ''}
                  onChange={e => setProjectFormData({ ...projectFormData, directorId: e.target.value })}
                >
                  <option value="">Seleccione Director...</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                  Descripción y Objetivos Agronómicos
                </label>
                <textarea
                  placeholder="Estrategia de siembra, densidad buscada, destino industrial de la biomasa..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs outline-none font-mono h-20 resize-none"
                  value={projectFormData.description || ''}
                  onChange={e => setProjectFormData({ ...projectFormData, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow"
                >
                  {editingProjectId ? 'Actualizar Programa' : 'Crear Programa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
