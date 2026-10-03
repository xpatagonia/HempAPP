import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Location, Plot, Project, Variety, CAMPAIGNS, SiteType, RoleType 
} from '../types';
import MapEditor from '../components/MapEditor';
import { 
  FolderKanban, Tractor, Sprout, Satellite, DollarSign, Plus, 
  MapPin, CheckCircle2, AlertTriangle, Layers, TrendingUp, 
  TrendingDown, ShieldCheck, ChevronRight, ChevronDown, 
  ExternalLink, Calendar, Users, Award, FileText, BarChart3, 
  PieChart, ArrowUpRight, Scale, Info, Edit2, Trash2, X, 
  FileSpreadsheet, Filter, Check, Eye, HelpCircle, Sparkles, 
  ShieldAlert, Compass, Globe, Mountain
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Campaigns() {
  const { 
    locations, plots, projects, varieties, updateLocation, 
    updatePlot, addProject, updateProject, deleteProject, 
    currentUser, usersList, clients 
  } = useAppContext();

  // Campaña seleccionada en el billboard
  const [selectedCampaign, setSelectedCampaign] = useState<string>('2025/2026');
  
  // Vista activa: 'billboard' | 'geodesy' | 'economics' | 'projects'
  const [activeTab, setActiveTab] = useState<'billboard' | 'geodesy' | 'economics' | 'projects'>('billboard');

  // Campo seleccionado en la vista geodésica para enfoque directo
  const [selectedMapLocationId, setSelectedMapLocationId] = useState<string>('all');

  // Estado de expansión de acordeones de campos en la vista de lista
  const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({
    'loc-riocuarto': true,
    'loc-pergamino': true,
    'loc-patagonia': true
  });

  // Modales
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

  // Modal para vincular campos a la campaña
  const [isLinkFieldModalOpen, setIsLinkFieldModalOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const canManage = isAdmin || currentUser?.role === 'technician';

  // Toggle de acordeón de campo
  const toggleLocationExpand = (locId: string) => {
    setExpandedLocations(prev => ({
      ...prev,
      [locId]: !prev[locId]
    }));
  };

  // Filtrado de campos pertenecientes a la campaña seleccionada
  const campaignLocations = useMemo(() => {
    return locations.filter(loc => {
      if (selectedCampaign === 'all') return true;
      const campaigns = loc.activeCampaigns || ['2024/2025', '2025/2026'];
      return campaigns.includes(selectedCampaign);
    });
  }, [locations, selectedCampaign]);

  // Filtrado de parcelas / unidades productivas pertenecientes a la campaña seleccionada
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
    // 1. Superficie DDJJ oficial declarada en los campos de la campaña
    const totalDeclaredDDJJHa = campaignLocations.reduce((acc, loc) => acc + (loc.sowingDeclarationHa || 0), 0);
    
    // 2. Superficie efectiva en lotes activos
    const activePlots = campaignPlots.filter(p => p.status === 'Activa');
    const pausedPlots = campaignPlots.filter(p => p.status === 'Pausada' || p.status === 'En Barbecho');
    const effectiveSownHa = activePlots.reduce((acc, p) => acc + (p.surfaceArea || 0), 0);

    // 3. Proporción de uso del cupo DDJJ
    const ddjjUtilizationPct = totalDeclaredDDJJHa > 0 ? (effectiveSownHa / totalDeclaredDDJJHa) * 100 : 0;

    // 4. Conteo de Ensayos I+D vs Lotes de Producción Comercial
    const trialPlotsCount = activePlots.filter(p => p.type === 'Ensayo').length;
    const commercialPlotsCount = activePlots.filter(p => p.type === 'Producción').length;

    // 5. Semilla insumida (kg)
    const totalSeedKg = activePlots.reduce((acc, p) => {
      let seed = p.usedSeedValue || 0;
      if (p.usedSeedUnit === 'tn') seed *= 1000;
      if (p.usedSeedUnit === 'gr') seed /= 1000;
      return acc + seed;
    }, 0);

    // 6. Proyección Cuantitativa de Cosecha (Fibra & Granos en Tn)
    let projectedFiberTn = 0;
    let projectedGrainTn = 0;
    let projectedBiomassKg = 0;

    // 7. Estimación de Costos Operativos e Ingresos Brutos
    let totalDirectCostUsd = 0;
    let totalGrossRevenueUsd = 0;

    activePlots.forEach(plot => {
      const area = plot.surfaceArea || 0;
      const variety = varieties.find(v => v.id === plot.varietyId);
      const isIrrigated = plot.irrigationType && !plot.irrigationType.toLowerCase().includes('secano');
      
      // Costo por Ha según tecnología: Secano ~$480, Riego ~$720, Ensayo I+D ~$1,100
      let costPerHa = 480;
      if (isIrrigated) costPerHa = 720;
      if (plot.type === 'Ensayo') costPerHa += 400; // Monitoreo, muestreo y fenotipado
      
      const plotCost = area * costPerHa;
      totalDirectCostUsd += plotCost;

      // Estimación de Rendimiento según Destino / Variedad
      const usage = variety?.usage || 'Fibra';
      let plotRevenue = 0;

      if (usage === 'Fibra') {
        const yieldHa = isIrrigated ? 9.2 : 7.4; // Tn tallo seco/ha
        const prod = area * yieldHa;
        projectedFiberTn += prod;
        plotRevenue = prod * 340; // USD 340 por Tn de tallo industrial
      } else if (usage === 'Grano') {
        const yieldHa = isIrrigated ? 1.8 : 1.25; // Tn grano/ha
        const prod = area * yieldHa;
        projectedGrainTn += prod;
        plotRevenue = prod * 1250; // USD 1,250 por Tn de semilla/grano
      } else if (usage === 'Dual') {
        const fiberYield = isIrrigated ? 6.5 : 5.2;
        const grainYield = isIrrigated ? 1.3 : 0.95;
        const fiberProd = area * fiberYield;
        const grainProd = area * grainYield;
        projectedFiberTn += fiberProd;
        projectedGrainTn += grainProd;
        plotRevenue = (fiberProd * 340) + (grainProd * 1250);
      } else {
        // Cannabinoides / CBG / Flor / Biomasa
        const yieldHa = 1100; // kg/ha
        const prod = area * yieldHa;
        projectedBiomassKg += prod;
        plotRevenue = prod * 9.5; // USD 9.5 por kg
      }

      totalGrossRevenueUsd += plotRevenue;
    });

    const totalNetMarginUsd = totalGrossRevenueUsd - totalDirectCostUsd;
    const avgRoiPct = totalDirectCostUsd > 0 ? (totalNetMarginUsd / totalDirectCostUsd) * 100 : 0;
    const marginPerHa = effectiveSownHa > 0 ? totalNetMarginUsd / effectiveSownHa : 0;

    // Calificación cualitativa de campaña
    let qualitativeScore: 'A+' | 'A' | 'B' | 'I+D' = 'A';
    if (avgRoiPct >= 75 || marginPerHa > 800) qualitativeScore = 'A+';
    else if (avgRoiPct >= 40) qualitativeScore = 'A';
    else if (avgRoiPct >= 10) qualitativeScore = 'B';
    else qualitativeScore = 'I+D';

    return {
      totalFields: campaignLocations.length,
      totalDeclaredDDJJHa: Number(totalDeclaredDDJJHa.toFixed(2)),
      effectiveSownHa: Number(effectiveSownHa.toFixed(2)),
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
  }, [campaignLocations, campaignPlots, varieties]);

  // Manejo de alternancia rápida de campaña en un campo
  const handleToggleLocationCampaign = async (loc: Location, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManage) return;

    const currentCampaigns = loc.activeCampaigns || ['2024/2025', '2025/2026'];
    let updatedCampaigns: string[];
    const isCurrentlyActive = currentCampaigns.includes(selectedCampaign);

    if (isCurrentlyActive) {
      updatedCampaigns = currentCampaigns.filter(c => c !== selectedCampaign);
    } else {
      updatedCampaigns = [...currentCampaigns, selectedCampaign];
    }

    const willBeActive = updatedCampaigns.includes(selectedCampaign);
    await updateLocation({
      ...loc,
      activeCampaigns: updatedCampaigns,
      status: willBeActive ? 'Activo' : (updatedCampaigns.length === 0 ? 'En Barbecho' : loc.status)
    });

    // Sincronizar parcelas hijas
    const childPlots = plots.filter(p => p.locationId === loc.id);
    for (const plot of childPlots) {
      const plotCampaigns = plot.activeCampaigns || (plot.campaign ? [plot.campaign] : ['2025/2026']);
      if (willBeActive) {
        const newPlotCampaigns = Array.from(new Set([...plotCampaigns, selectedCampaign]));
        await updatePlot({
          ...plot,
          campaign: plot.campaign || selectedCampaign,
          activeCampaigns: newPlotCampaigns
        });
      } else {
        const newPlotCampaigns = plotCampaigns.filter(c => c !== selectedCampaign);
        const newStatus = (plot.campaign === selectedCampaign || newPlotCampaigns.length === 0) ? 'Pausada' : plot.status;
        await updatePlot({
          ...plot,
          status: newStatus as any,
          activeCampaigns: newPlotCampaigns
        });
      }
    }
  };

  // Manejo de alternancia de parcela dentro de la campaña
  const handleTogglePlotCampaign = async (plot: Plot, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManage) return;

    const targetCamp = selectedCampaign === 'all' ? (plot.campaign || '2025/2026') : selectedCampaign;
    const currentCampaigns = plot.activeCampaigns || (plot.campaign ? [plot.campaign] : ['2025/2026']);
    const isCurrentlyActive = currentCampaigns.includes(targetCamp) && plot.status === 'Activa';

    let updatedCampaigns: string[];
    let newStatus = plot.status;

    if (isCurrentlyActive) {
      updatedCampaigns = currentCampaigns.filter(c => c !== targetCamp);
      newStatus = 'Pausada';
    } else {
      updatedCampaigns = Array.from(new Set([...currentCampaigns, targetCamp]));
      newStatus = 'Activa';
    }

    await updatePlot({
      ...plot,
      campaign: plot.campaign || targetCamp,
      activeCampaigns: updatedCampaigns,
      status: newStatus
    });
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
    } else {
      await addProject(payload);
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

  return (
    <div className="space-y-7 animate-in fade-in duration-500 pb-16">
      
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
                Gestión integral por ciclo: Campos participantes, DDJJ Geodésicas, Unidades Productivas & Economía.
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
              {billboardStats.totalFields} Establecimientos
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
              <span className="text-amber-500">
                {billboardStats.pausedPlotsCount} Pausados
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
      </div>

      {/* 4. CONTENIDO SEGÚN PESTAÑA */}

      {/* PESTAÑA 1: JERARQUÍA CAMPOS PARTICIPANTES -> UNIDADES PRODUCTIVAS & PARCELAS */}
      {activeTab === 'billboard' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <span>Ecosistema de Campos y Lotes de la Campaña</span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  ({campaignLocations.length} Establecimientos · {campaignPlots.length} Unidades)
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Desglose jerárquico de cada establecimiento, su DDJJ oficial georreferenciada y las unidades productivas sembradas.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link 
                to="/locations"
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <Tractor size={13} />
                <span>Gestionar Campos</span>
              </Link>
              <Link 
                to="/plots"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-mono font-bold uppercase tracking-wider hover:bg-emerald-500 transition shadow flex items-center gap-1.5"
              >
                <Sprout size={13} />
                <span>+ Nuevo Lote</span>
              </Link>
            </div>
          </div>

          {campaignLocations.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center">
              <Tractor size={40} className="mx-auto text-slate-400 mb-3 opacity-40" />
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wide">
                No hay campos habilitados para la campaña {selectedCampaign}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Ve a la sección de Campos y activa esta campaña en los establecimientos participantes, o cambia la campaña en el selector superior.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaignLocations.map(loc => {
                const isExpanded = expandedLocations[loc.id] ?? true;
                const locPlots = campaignPlots.filter(p => p.locationId === loc.id);
                const activeLocPlots = locPlots.filter(p => p.status === 'Activa');
                const sownHa = activeLocPlots.reduce((sum, p) => sum + (p.surfaceArea || 0), 0);
                const declaredHa = loc.sowingDeclarationHa || 0;
                const pct = declaredHa > 0 ? (sownHa / declaredHa) * 100 : 0;
                const locCampaigns = loc.activeCampaigns || ['2024/2025', '2025/2026'];
                const isFieldActiveInCamp = locCampaigns.includes(selectedCampaign);

                return (
                  <div 
                    key={loc.id} 
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all"
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
                            <span className="text-[10px] font-mono text-slate-400">
                              {loc.city}, {loc.province}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                              <ShieldCheck size={13} />
                              <strong>DDJJ:</strong> {loc.sowingDeclarationId || 'S/N Registrado'} ({declaredHa} Ha)
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <Sprout size={13} />
                              <strong>Sembrado:</strong> {Number(sownHa.toFixed(2))} Ha ({pct.toFixed(0)}% cupo)
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

                        {canManage && (
                          <button
                            type="button"
                            onClick={(e) => handleToggleLocationCampaign(loc, e)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition flex items-center gap-1 ${
                              isFieldActiveInCamp
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow'
                            }`}
                            title={isFieldActiveInCamp ? `Pausar campo en campaña ${selectedCampaign}` : `Habilitar campo en campaña ${selectedCampaign}`}
                          >
                            <span>{isFieldActiveInCamp ? 'Pausar en Campaña' : 'Habilitar Campaña'}</span>
                          </button>
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
                    {isExpanded && (
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
                              const isPlotActive = plot.status === 'Activa';

                              return (
                                <div 
                                  key={plot.id}
                                  className={`p-4 rounded-2xl border transition-all ${
                                    isPlotActive
                                      ? 'bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700 shadow-sm'
                                      : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
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

                                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                                    <span className={`text-[9px] font-mono font-bold uppercase ${
                                      isPlotActive ? 'text-emerald-600' : 'text-amber-500'
                                    }`}>
                                      {plot.status}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                      {canManage && (
                                        <button
                                          type="button"
                                          onClick={(e) => handleTogglePlotCampaign(plot, e)}
                                          className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold uppercase transition ${
                                            isPlotActive
                                              ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
                                              : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                          }`}
                                        >
                                          {isPlotActive ? 'Pausar' : 'Activar'}
                                        </button>
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
                    if (plot.type === 'Ensayo') {
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
