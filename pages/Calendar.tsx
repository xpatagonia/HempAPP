import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Plot, HempStageId, AgriculturalLaborType, Task } from '../types';
import { 
  HEMP_PHENOLOGICAL_STAGES, 
  AGRICULTURAL_LABOR_INFO,
  getDaysSinceSowing,
  estimateAccumulatedGdd,
  getPhenologicalStageByGdd,
  HEMP_BASE_TEMPERATURE
} from '../src/data/phenologyData';
import { 
  ChevronLeft, ChevronRight, Calendar as CalIcon, Sprout, CheckSquare, 
  Clock, Plus, X, Sparkles, CheckCircle2, Circle, AlertCircle, 
  ArrowRight, ShieldCheck, Thermometer, Droplets, Sun, MapPin, 
  Tractor, Wrench, Eye, FileText, Check, Layers, BarChart2,
  CalendarDays, BookOpen, User, Building2, ChevronDown, ChevronUp,
  Filter, Search, RotateCcw, SlidersHorizontal, ChevronsUpDown,
  Maximize2, Minimize2, CheckCheck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function CalendarPage() {
  const { plots, tasks, varieties, updatePlotPhenology, addTask, currentUser, switchUserRole } = useAppContext();
  const navigate = useNavigate();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'pipeline' | 'gantt_calendar' | 'guide'>('pipeline');
  const [selectedPlotId, setSelectedPlotId] = useState<string>('all');

  // Month navigation for Calendar grid
  const [currentDate, setCurrentDate] = useState(new Date());

  // FILTROS Y GESTIÓN DE VISTAS (DESPLIEGUE / COLAPSO)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStage, setFilterStage] = useState<HempStageId | 'all'>('all');
  const [filterVariety, setFilterVariety] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCampaign, setFilterCampaign] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [focusedPlotId, setFocusedPlotId] = useState<string>('all');
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);

  // Estados de despliegue por tarjeta de parcela (Acordeón)
  const [expandedPlotIds, setExpandedPlotIds] = useState<Record<string, boolean>>({});

  // Modal: Certificar cambio de estadio
  const [certifyModalPlot, setCertifyModalPlot] = useState<Plot | null>(null);
  const [certifyTargetStage, setCertifyTargetStage] = useState<HempStageId>('BBCH_10_19');
  const [certifyDate, setCertifyDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [certifyNotes, setCertifyNotes] = useState<string>('');

  // Modal: Quick Labor Dispatch from stage recommendation
  const [quickLaborPlot, setQuickLaborPlot] = useState<Plot | null>(null);
  const [quickLaborType, setQuickLaborType] = useState<AgriculturalLaborType>('LABOR_CULTURAL');
  const [quickLaborDate, setQuickLaborDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [quickLaborTitle, setQuickLaborTitle] = useState<string>('');

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isSocio = currentUser?.memberType === 'Socio_Productor' || currentUser?.role === 'client';

  // Filter plots by socio if needed
  const activePlots = useMemo(() => {
    let list = plots.filter(p => p.status === 'Activa');
    if (isSocio && currentUser?.assignedPlotIds && currentUser.assignedPlotIds.length > 0) {
      list = list.filter(p => currentUser.assignedPlotIds?.includes(p.id));
    }
    return list;
  }, [plots, isSocio, currentUser]);

  // Calendar dates math
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Biological Timeline for each plot
  const plotPhenologySummaries = useMemo(() => {
    return activePlots.map(plot => {
      const variety = varieties.find(v => v.id === plot.varietyId);
      const daysElapsed = getDaysSinceSowing(plot.sowingDate);
      const cycleDays = variety?.cycleDays || 120;
      const targetGdd = variety?.gddRequirement || 1950;
      const accumulatedGdd = plot.accumulatedGdd || estimateAccumulatedGdd(daysElapsed);
      const gddProgressPct = Math.min(100, Math.round((accumulatedGdd / targetGdd) * 100));
      const daysProgressPct = Math.min(100, Math.round((daysElapsed / cycleDays) * 100));

      // Calculate estimated harvest date
      let harvestDateStr = '';
      if (plot.sowingDate) {
        const parts = plot.sowingDate.split('-');
        if (parts.length === 3) {
          const sowingTs = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
          const harvestDate = new Date(sowingTs + (cycleDays * 24 * 60 * 60 * 1000));
          harvestDateStr = harvestDate.toISOString().split('T')[0];
        }
      }

      // Current stage object
      const currentStageId = plot.currentPhenologicalStage || getPhenologicalStageByGdd(accumulatedGdd).id;
      const currentStageObj = HEMP_PHENOLOGICAL_STAGES.find(s => s.id === currentStageId) || HEMP_PHENOLOGICAL_STAGES[0];
      const currentStageIdx = HEMP_PHENOLOGICAL_STAGES.findIndex(s => s.id === currentStageId);

      // Next stage
      const nextStageObj = currentStageIdx < HEMP_PHENOLOGICAL_STAGES.length - 1 
        ? HEMP_PHENOLOGICAL_STAGES[currentStageIdx + 1] 
        : null;

      // Pending labors for this plot
      const plotTasks = tasks.filter(t => t.plotId === plot.id);
      const pendingLabors = plotTasks.filter(t => t.status === 'Pendiente' || t.status === 'En_Curso' || t.status === 'Planificada');
      const executedLabors = plotTasks.filter(t => t.status === 'Ejecutada');

      return {
        plot,
        variety,
        daysElapsed,
        cycleDays,
        targetGdd,
        accumulatedGdd,
        gddProgressPct,
        daysProgressPct,
        harvestDateStr,
        currentStageId,
        currentStageObj,
        currentStageIdx,
        nextStageObj,
        pendingLabors,
        executedLabors
      };
    });
  }, [activePlots, varieties, tasks]);

  // Aggregate stats over ALL active plots
  const overallStats = useMemo(() => {
    const totalPlots = activePlots.length;
    const stagesCount: Record<string, number> = {};
    HEMP_PHENOLOGICAL_STAGES.forEach(s => { stagesCount[s.id] = 0; });

    plotPhenologySummaries.forEach(s => {
      stagesCount[s.currentStageId] = (stagesCount[s.currentStageId] || 0) + 1;
    });

    return { totalPlots, stagesCount };
  }, [activePlots, plotPhenologySummaries]);

  // Unique list of options for filters
  const uniqueCampaigns = useMemo(() => {
    const set = new Set<string>();
    activePlots.forEach(p => { if (p.campaign) set.add(p.campaign); });
    return Array.from(set);
  }, [activePlots]);

  const uniqueOwners = useMemo(() => {
    const set = new Set<string>();
    activePlots.forEach(p => { if (p.ownerName) set.add(p.ownerName); });
    return Array.from(set);
  }, [activePlots]);

  const uniqueTypes = useMemo(() => {
    const set = new Set<string>();
    activePlots.forEach(p => { if (p.type) set.add(p.type); });
    return Array.from(set);
  }, [activePlots]);

  // FILTERED PLOTS ACCORDING TO DESPLEGABLE FILTERS
  const filteredSummaries = useMemo(() => {
    return plotPhenologySummaries.filter(item => {
      // Focused single trial
      if (focusedPlotId !== 'all' && item.plot.id !== focusedPlotId) {
        return false;
      }
      // BBCH Stage
      if (filterStage !== 'all' && item.currentStageId !== filterStage) {
        return false;
      }
      // Variety
      if (filterVariety !== 'all' && item.plot.varietyId !== filterVariety) {
        return false;
      }
      // Type
      if (filterType !== 'all' && item.plot.type !== filterType) {
        return false;
      }
      // Campaign
      if (filterCampaign !== 'all' && item.plot.campaign !== filterCampaign) {
        return false;
      }
      // Owner / Socio
      if (filterOwner !== 'all' && item.plot.ownerName !== filterOwner) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.plot.name.toLowerCase().includes(q);
        const matchVariety = item.variety?.name.toLowerCase().includes(q) || false;
        const matchOwner = item.plot.ownerName?.toLowerCase().includes(q) || false;
        const matchStage = item.currentStageObj.name.toLowerCase().includes(q) || 
                           item.currentStageObj.bbchCode.toLowerCase().includes(q) ||
                           item.currentStageObj.shortName.toLowerCase().includes(q);
        if (!matchName && !matchVariety && !matchOwner && !matchStage) {
          return false;
        }
      }
      return true;
    });
  }, [plotPhenologySummaries, focusedPlotId, filterStage, filterVariety, filterType, filterCampaign, filterOwner, searchQuery]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (focusedPlotId !== 'all') count++;
    if (filterStage !== 'all') count++;
    if (filterVariety !== 'all') count++;
    if (filterType !== 'all') count++;
    if (filterCampaign !== 'all') count++;
    if (filterOwner !== 'all') count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [focusedPlotId, filterStage, filterVariety, filterType, filterCampaign, filterOwner, searchQuery]);

  const resetFilters = () => {
    setFocusedPlotId('all');
    setFilterStage('all');
    setFilterVariety('all');
    setFilterType('all');
    setFilterCampaign('all');
    setFilterOwner('all');
    setSearchQuery('');
  };

  // Expand / Collapse controls
  const toggleExpandPlot = (plotId: string) => {
    setExpandedPlotIds(prev => ({
      ...prev,
      [plotId]: !prev[plotId]
    }));
  };

  const expandAllFiltered = () => {
    const next: Record<string, boolean> = {};
    filteredSummaries.forEach(s => { next[s.plot.id] = true; });
    setExpandedPlotIds(next);
  };

  const collapseAllFiltered = () => {
    setExpandedPlotIds({});
  };

  // Calendar Events
  const calendarEvents = useMemo(() => {
    const list: any[] = [];

    // Sowing and Harvest events
    plotPhenologySummaries.forEach(p => {
      if (p.plot.sowingDate) {
        list.push({
          date: p.plot.sowingDate,
          title: `Siembra: ${p.plot.name}`,
          type: 'sowing',
          plotId: p.plot.id,
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
        });
      }
      if (p.harvestDateStr) {
        list.push({
          date: p.harvestDateStr,
          title: `Cosecha Estimada: ${p.plot.name}`,
          type: 'harvest',
          plotId: p.plot.id,
          badgeColor: 'bg-rose-100 text-rose-800 border-rose-300'
        });
      }

      // Historical certified stages
      (p.plot.stageHistory || []).forEach(sh => {
        const stageObj = HEMP_PHENOLOGICAL_STAGES.find(s => s.id === sh.stageId);
        list.push({
          date: sh.date,
          title: `${stageObj?.bbchCode || 'Fase'}: ${p.plot.name}`,
          type: 'stage_change',
          plotId: p.plot.id,
          notes: sh.notes,
          badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300'
        });
      });
    });

    // Task & Labors events
    tasks.forEach(t => {
      if (t.dueDate) {
        list.push({
          date: t.dueDate,
          title: `Labor: ${t.title}`,
          type: 'labor',
          taskId: t.id,
          plotId: t.plotId,
          status: t.status,
          badgeColor: t.status === 'Homologada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
        });
      }
    });

    return list;
  }, [plotPhenologySummaries, tasks]);

  // Open certify stage modal
  const handleOpenCertifyModal = (plot: Plot, suggestedStageId?: HempStageId) => {
    setCertifyModalPlot(plot);
    const plotSummary = plotPhenologySummaries.find(s => s.plot.id === plot.id);
    const target = suggestedStageId || plotSummary?.nextStageObj?.id || 'BBCH_20_39';
    setCertifyTargetStage(target);
    setCertifyDate(new Date().toISOString().split('T')[0]);
    setCertifyNotes(`Certificación en campo de avance hacia estadio ${target}.`);
  };

  const handleConfirmCertify = async () => {
    if (!certifyModalPlot) return;
    await updatePlotPhenology(
      certifyModalPlot.id,
      certifyTargetStage,
      certifyDate,
      certifyNotes,
      currentUser?.name || 'Técnico Cooperativa'
    );
    setCertifyModalPlot(null);
  };

  // Open quick labor scheduler from stage recommendation
  const handleOpenQuickLabor = (plot: Plot, laborType: AgriculturalLaborType) => {
    setQuickLaborPlot(plot);
    setQuickLaborType(laborType);
    const laborInfo = AGRICULTURAL_LABOR_INFO[laborType];
    setQuickLaborTitle(`${laborInfo.name} - ${plot.name}`);
    setQuickLaborDate(new Date().toISOString().split('T')[0]);
  };

  const handleConfirmQuickLabor = async () => {
    if (!quickLaborPlot) return;
    const laborInfo = AGRICULTURAL_LABOR_INFO[quickLaborType];
    const newLabor: Task = {
      id: `labor-${Date.now()}`,
      title: quickLaborTitle,
      description: `Labor programada directamente desde el Monitor Fenológico (${laborInfo.name}).`,
      status: 'Planificada',
      priority: 'Alta',
      assignedToIds: [currentUser?.id || 'unknown'],
      dueDate: quickLaborDate,
      executionDate: quickLaborDate,
      plotId: quickLaborPlot.id,
      createdBy: currentUser?.id || 'system',
      laborType: quickLaborType,
      targetStage: quickLaborPlot.currentPhenologicalStage || 'BBCH_10_19',
      advancesPhenologicalStage: false,
      machinery: {
        tractor: laborInfo.typicalMachinery.split('+')[0]?.trim() || 'Tractor Estándar',
        implement: laborInfo.typicalMachinery.split('+')[1]?.trim() || 'Implemento'
      },
      operator: currentUser?.name || 'Operario de Campo',
      directCostUsd: Math.round((quickLaborPlot.surfaceArea || 10) * laborInfo.defaultCostPerHa),
      syncWithExpenses: true,
      syncWithPhytosanitary: quickLaborType === 'FITOSANITARIO'
    };

    await addTask(newLabor);
    setQuickLaborPlot(null);
  };

  // Calendar render helpers
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarEvents.filter(e => {
      if (selectedPlotId !== 'all' && e.plotId && e.plotId !== selectedPlotId) return false;
      return e.date === dateStr;
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* HEADER PRINCIPAL */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                <Sparkles size={14} /> FENOLOGÍA DINÁMICA & GRADOS DÍA (GDD)
              </span>
              <span className="text-xs text-slate-400">
                • Escala BBCH Cáñamo Industrial
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Ciclo Biológico & Monitor Fenológico
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Seguimiento bioclimático en tiempo real por parcela, cálculo de suma térmica acumulada y orquestación de <strong className="text-emerald-400 font-bold">labores agrícolas sincronizadas</strong> por estadio.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link 
              to="/tasks" 
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <Tractor size={15} /> Ver Labores de Campo
            </Link>
          </div>
        </div>

        {/* NAVEGACIÓN ENTRE VISTAS */}
        <div className="flex border-t border-slate-800 mt-6 pt-4 gap-2 flex-wrap">
          <button 
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === 'pipeline' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'}`}
          >
            <Layers size={14} /> Pipeline Fenológico ({activePlots.length} ensayos)
          </button>

          <button 
            onClick={() => setActiveTab('gantt_calendar')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === 'gantt_calendar' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'}`}
          >
            <CalendarDays size={14} /> Cronograma Gantt & Calendario
          </button>

          <button 
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === 'guide' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'}`}
          >
            <BookOpen size={14} /> Guía Escala BBCH (7 Estadios)
          </button>
        </div>
      </div>

      {/* VISTA 1: PIPELINE FENOLÓGICO DE PARCELAS CON FILTROS DESPLEGABLES Y ACORDEÓN */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          
          {/* RESUMEN DE ESTADIOS GLOBALES (FILTRABLE CON 1 CLIC) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-emerald-600" />
                Estadios BBCH de la Red (Haz clic en una fase para filtrar):
              </span>
              {filterStage !== 'all' && (
                <button 
                  onClick={() => setFilterStage('all')}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                >
                  <X size={12} /> Quitar filtro de fase ({HEMP_PHENOLOGICAL_STAGES.find(s => s.id === filterStage)?.bbchCode})
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {HEMP_PHENOLOGICAL_STAGES.map((stage, idx) => {
                const count = overallStats.stagesCount[stage.id] || 0;
                const isSelected = filterStage === stage.id;

                return (
                  <button 
                    key={stage.id}
                    type="button"
                    onClick={() => setFilterStage(prev => prev === stage.id ? 'all' : stage.id)}
                    className={`p-3 rounded-xl border text-left transition relative cursor-pointer ${
                      isSelected 
                        ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/30' 
                        : count > 0 
                          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-sm' 
                          : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Fase {idx} • {stage.bbchCode.replace('BBCH ', '')}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5" title={stage.shortName}>
                      {stage.shortName}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className={`text-lg font-black ${isSelected ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'}`}>
                        {count}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {stage.typicalGdd} GDD
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BARRA DE CONTROL PRINCIPAL & FILTROS CON DESPLIEGUE */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              
              {/* BUSCADOR RÁPIDO */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Buscar por nombre de ensayo, genética, productor, localidad..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* SELECTOR DESPLEGABLE DIRECTO DE ENSAYO / PARCELA */}
              <div className="min-w-[220px]">
                <select
                  value={focusedPlotId}
                  onChange={(e) => {
                    setFocusedPlotId(e.target.value);
                    if (e.target.value !== 'all') {
                      setExpandedPlotIds(prev => ({ ...prev, [e.target.value]: true }));
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">🔍 Todos los Ensayos ({activePlots.length})</option>
                  {activePlots.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.surfaceArea} ha)
                    </option>
                  ))}
                </select>
              </div>

              {/* BOTONES DE CONTROL DE VISTA Y FILTROS */}
              <div className="flex items-center gap-2 shrink-0">
                
                {/* BOTÓN TOGGLE FILTROS AVANZADOS */}
                <button
                  type="button"
                  onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                    showFiltersPanel || activeFiltersCount > 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-400 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <SlidersHorizontal size={14} />
                  <span>Filtros Desplegables</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                  {showFiltersPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {/* DESPLEGAR TODO / PLEGAR TODO */}
                <button
                  type="button"
                  onClick={expandAllFiltered}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5"
                  title="Desplegar detalles de todos los ensayos visibles"
                >
                  <Maximize2 size={13} />
                  <span className="hidden sm:inline">Desplegar todo</span>
                </button>

                <button
                  type="button"
                  onClick={collapseAllFiltered}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5"
                  title="Plegar a vista compacta (sin scroll infinito)"
                >
                  <Minimize2 size={13} />
                  <span className="hidden sm:inline">Plegar todo</span>
                </button>

                {/* LIMPIAR FILTROS */}
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition border border-rose-200 dark:border-rose-900"
                    title="Restablecer todos los filtros"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* PANEL DE FILTROS DESPLEGABLE */}
            {showFiltersPanel && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 animate-in fade-in duration-150">
                
                {/* FILTRO: ESTADIO BBCH */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Estadio BBCH
                  </label>
                  <select
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value as HempStageId | 'all')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Todos los estadios</option>
                    {HEMP_PHENOLOGICAL_STAGES.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.bbchCode} • {s.shortName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* FILTRO: GENÉTICA / VARIEDAD */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Genética / Variedad
                  </label>
                  <select
                    value={filterVariety}
                    onChange={(e) => setFilterVariety(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Todas las genéticas</option>
                    {varieties.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.usage})
                      </option>
                    ))}
                  </select>
                </div>

                {/* FILTRO: TIPO DE ENSAYO / DESTINO */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Tipo de Parcela
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Todos los tipos</option>
                    {uniqueTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* FILTRO: CAMPAÑA */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Campaña Agrícola
                  </label>
                  <select
                    value={filterCampaign}
                    onChange={(e) => setFilterCampaign(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Todas las campañas</option>
                    {uniqueCampaigns.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* FILTRO: PRODUCTOR / TITULAR */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Socio / Titular
                  </label>
                  <select
                    value={filterOwner}
                    onChange={(e) => setFilterOwner(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Todos los titulares</option>
                    {uniqueOwners.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>

              </div>
            )}

            {/* CHIPS DE FILTRO ACTIVO & CONTADOR */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Mostrando <strong className="text-emerald-600">{filteredSummaries.length}</strong> de {activePlots.length} ensayos agrícolas
                </span>

                {filterStage !== 'all' && (
                  <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                    Fase: {HEMP_PHENOLOGICAL_STAGES.find(s => s.id === filterStage)?.shortName}
                    <button onClick={() => setFilterStage('all')}><X size={11} /></button>
                  </span>
                )}

                {focusedPlotId !== 'all' && (
                  <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                    Ensayo puntual enfocado
                    <button onClick={() => setFocusedPlotId('all')}><X size={11} /></button>
                  </span>
                )}

                {filterVariety !== 'all' && (
                  <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                    Genética: {varieties.find(v => v.id === filterVariety)?.name}
                    <button onClick={() => setFilterVariety('all')}><X size={11} /></button>
                  </span>
                )}

                {filterCampaign !== 'all' && (
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                    Camp: {filterCampaign}
                    <button onClick={() => setFilterCampaign('all')}><X size={11} /></button>
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-400">
                💡 Haz clic en cualquier ensayo para desplegar u ocultar su detalle fenológico completo.
              </div>
            </div>
          </div>

          {/* LISTADO DE ENSAYOS / PARCELAS EN FORMATO ACORDEÓN DESPLEGABLE */}
          {filteredSummaries.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Search size={24} />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                No se encontraron ensayos con los filtros seleccionados
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Prueba relajando los criterios de búsqueda, seleccionando otra fase BBCH o limpiando los filtros actuales.
              </p>
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition inline-flex items-center gap-1.5 shadow-sm"
              >
                <RotateCcw size={13} /> Restablecer Todos los Filtros
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSummaries.map(({
                plot, variety, daysElapsed, cycleDays, targetGdd, 
                accumulatedGdd, gddProgressPct, daysProgressPct, harvestDateStr,
                currentStageId, currentStageObj, currentStageIdx, nextStageObj,
                pendingLabors, executedLabors
              }) => {
                const isExpanded = !!expandedPlotIds[plot.id];

                return (
                  <div 
                    key={plot.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md overflow-hidden"
                  >
                    
                    {/* BARRA COMPACTA RESUMEN (CABECERA CLICABLE PARA DESPLEGAR) */}
                    <div 
                      onClick={() => toggleExpandPlot(plot.id)}
                      className={`p-4 md:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 cursor-pointer select-none transition ${
                        isExpanded ? 'bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                      }`}
                    >
                      {/* IDENTIFICACIÓN DEL LOTE */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleExpandPlot(plot.id); }}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition shrink-0 ${
                            isExpanded 
                              ? 'bg-emerald-600 text-white shadow-sm' 
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-600 dark:text-slate-300 hover:text-emerald-600'
                          }`}
                          title={isExpanded ? 'Plegar detalles' : 'Desplegar detalles de este ensayo'}
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {plot.type} • {plot.surfaceArea} ha
                            </span>
                            <span className="text-xs text-slate-500">
                              Genética: <strong className="text-slate-800 dark:text-slate-200">{variety?.name || 'Cáñamo'}</strong> ({variety?.usage || 'Fibra'})
                            </span>
                            <span className="text-xs text-slate-400">
                              • {plot.ownerName}
                            </span>
                          </div>

                          <h2 className="text-base md:text-lg font-black text-slate-900 dark:text-white truncate">
                            {plot.name}
                          </h2>
                        </div>
                      </div>

                      {/* RESUMEN DE PROGRESO Y ACCIONES EN LA BARRA */}
                      <div 
                        className="flex items-center gap-4 flex-wrap lg:flex-nowrap w-full lg:w-auto justify-between lg:justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* BADGE DEL ESTADIO BBCH ACTIVO */}
                        <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 shrink-0 ${currentStageObj.badgeColor}`}>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                          <div className="text-left">
                            <div className="text-[9px] uppercase font-mono font-black leading-none">
                              {currentStageObj.bbchCode}
                            </div>
                            <div className="text-xs font-bold leading-tight truncate max-w-[150px]">
                              {currentStageObj.shortName}
                            </div>
                          </div>
                        </div>

                        {/* SUMA TÉRMICA & DÍAS */}
                        <div className="text-right min-w-[130px] shrink-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            <span className="text-emerald-600 font-mono font-black">{accumulatedGdd}</span> / {targetGdd} GDD
                          </div>
                          <div className="w-28 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1 ml-auto">
                            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${gddProgressPct}%` }}></div>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            Día {daysElapsed} de {cycleDays} ({daysProgressPct}%)
                          </div>
                        </div>

                        {/* LABORES PENDIENTES */}
                        {pendingLabors.length > 0 && (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                            {pendingLabors.length} labores pend.
                          </span>
                        )}

                        {/* BOTONES DIRECTOS */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleOpenCertifyModal(plot, nextStageObj?.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm shadow-emerald-600/20"
                            title="Certificar avance de fase"
                          >
                            <ShieldCheck size={13} />
                            <span className="hidden sm:inline">Certificar</span>
                          </button>

                          <button
                            onClick={() => toggleExpandPlot(plot.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                              isExpanded 
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white border-slate-300 dark:border-slate-600' 
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {isExpanded ? (
                              <>Plegar <ChevronUp size={13} /></>
                            ) : (
                              <>Desplegar <ChevronDown size={13} /></>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* DETALLE COMPLETO DESPLEGADO (STEPPER, MORFOLOGÍA, LABORES Y TRANSICIÓN) */}
                    {isExpanded && (
                      <div className="p-6 space-y-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
                        
                        {/* KPIS RÁPIDOS EXPANDIDOS */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Fecha Siembra</span>
                            <strong className="text-slate-800 dark:text-slate-200 font-mono text-sm">{plot.sowingDate}</strong>
                            <span className="text-[10px] text-emerald-600 block mt-0.5">Día {daysElapsed} de {cycleDays}</span>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Suma Térmica (GDD)</span>
                            <strong className="text-emerald-600 font-mono text-sm">{accumulatedGdd}</strong>
                            <span className="text-[10px] text-slate-400"> / {targetGdd} GDD ({gddProgressPct}%)</span>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Cosecha Estimada</span>
                            <strong className="text-rose-600 font-mono text-sm">{harvestDateStr}</strong>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{Math.max(0, cycleDays - daysElapsed)} días restantes</span>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Riego & Parámetros</span>
                            <strong className="text-slate-800 dark:text-slate-200 text-sm truncate block">{plot.irrigationType || 'Secano Tecnificado'}</strong>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Densidad: {plot.density || 45} pl/m²</span>
                          </div>
                        </div>

                        {/* STEPPER DE ETAPAS FENOLÓGICAS (BBCH 00 a 99) */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-3">
                            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Sparkles size={14} className="text-emerald-600" />
                              Progreso Fenológico en Escala BBCH:
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-600">
                              {gddProgressPct}% de Suma Térmica Cumplida
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                            {HEMP_PHENOLOGICAL_STAGES.map((stage, idx) => {
                              const isCurrent = stage.id === currentStageId;
                              const isPast = idx < currentStageIdx;

                              return (
                                <div 
                                  key={stage.id}
                                  className={`p-3 rounded-xl border text-xs transition relative ${
                                    isCurrent 
                                      ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 shadow-md ring-2 ring-emerald-500/20' 
                                      : isPast 
                                        ? 'bg-slate-50 dark:bg-slate-800/40 border-emerald-200 dark:border-emerald-900 text-slate-600'
                                        : 'bg-white dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                                      {stage.bbchCode.replace('BBCH ', '')}
                                    </span>
                                    {isPast && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
                                    {isCurrent && (
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                    )}
                                  </div>

                                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]" title={stage.name}>
                                    {stage.shortName}
                                  </div>

                                  <div className="text-[10px] text-slate-400 mt-1">
                                    ~{stage.typicalGdd} GDD
                                  </div>

                                  {isCurrent && (
                                    <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                                      <span className="text-[9px] uppercase font-black text-emerald-700 dark:text-emerald-300 block">
                                        Estadio Activo
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* DESCRIPCIÓN MORFOLÓGICA Y LABORES RECOMENDADAS */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
                          
                          {/* CUIDADOS DEL ESTADIO ACTUAL */}
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Sun size={15} className="text-amber-500" />
                              Morfología & Estado Biológico Actual:
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                              {currentStageObj.description}
                            </p>
                            <div className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950 p-2.5 rounded-lg font-medium">
                              <strong>Clave Técnica:</strong> {currentStageObj.criticalCare}
                            </div>
                          </div>

                          {/* LABORES RECOMENDADAS PARA ESTE ESTADIO */}
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-3">
                            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Tractor size={15} className="text-emerald-600" />
                                Labores Sugeridas para esta Fase:
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {currentStageObj.recommendedLabors.length} sugeridas
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {currentStageObj.recommendedLabors.map(laborType => {
                                const info = AGRICULTURAL_LABOR_INFO[laborType];
                                return (
                                  <div 
                                    key={laborType}
                                    className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                                  >
                                    <div className="truncate">
                                      <span className="font-bold text-slate-800 dark:text-slate-200 block truncate text-[11px]">
                                        {info.name}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        ${info.defaultCostPerHa} USD/ha • {info.category}
                                      </span>
                                    </div>

                                    <button 
                                      onClick={() => handleOpenQuickLabor(plot, laborType)}
                                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-bold text-[10px] border border-emerald-200 dark:border-emerald-800 transition shrink-0"
                                    >
                                      + Programar
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* ACCIONES Y CERTIFICACIÓN COOPERATIVA */}
                          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-800/60 dark:to-emerald-950/20 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex flex-col justify-between gap-3">
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2">
                                <ShieldCheck size={15} className="text-emerald-600" />
                                Certificación & Transición de Fase:
                              </div>
                              <p className="text-slate-500 text-[11px] mb-2">
                                Próximo estadio sugerido: <strong className="text-slate-800 dark:text-slate-200">{nextStageObj?.bbchCode || 'Cosecha'} ({nextStageObj?.shortName || 'Final'})</strong>.
                              </p>
                              {pendingLabors.length > 0 && (
                                <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 p-2.5 rounded-lg mb-2">
                                  ⚠️ Hay <strong>{pendingLabors.length} labores programadas</strong> para este lote.
                                </div>
                              )}
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                              <button 
                                onClick={() => handleOpenCertifyModal(plot, nextStageObj?.id)}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20"
                              >
                                <ShieldCheck size={14} /> Certificar Cambio de Estadio
                              </button>

                              <Link 
                                to={`/tasks?plotId=${plot.id}`}
                                className="w-full py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
                              >
                                <Tractor size={14} /> Ver Todas las Labores del Lote
                              </Link>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* VISTA 2: GANTT & CALENDARIO INTERACTIVO */}
      {activeTab === 'gantt_calendar' && (
        <div className="space-y-6">
          
          {/* HEADER DEL CALENDARIO CON SELECTOR DE PARCELA */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                <CalIcon size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Calendario Fenológico & Agroclimático
                </h3>
                <p className="text-xs text-slate-500">
                  Visualización mensual de siembras, labores de campo y ventanas de cosecha
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* FILTRO DE PARCELA PARA CALENDARIO */}
              <div className="min-w-[180px]">
                <select
                  value={selectedPlotId}
                  onChange={(e) => setSelectedPlotId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">Ver Todas las Parcelas</option>
                  {activePlots.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={goToToday}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition"
              >
                Hoy
              </button>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                <button onClick={prevMonth} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                  <ChevronLeft size={18} />
                </button>
                <span className="px-4 font-bold text-xs text-slate-800 dark:text-slate-200 capitalize min-w-[130px] text-center">
                  {monthName}
                </span>
                <button onClick={nextMonth} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* GRID MENSUAL */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden select-none">
            {/* ENCABEZADOS DÍAS */}
            <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-center">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                <div key={d} className="py-2.5 text-xs font-black text-slate-400 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* DÍAS DEL MES */}
            <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 dark:bg-slate-800 gap-px">
              {blanks.map((_, i) => (
                <div key={`blank-${i}`} className="bg-white dark:bg-slate-900 min-h-[110px] p-2 opacity-40"></div>
              ))}

              {days.map(day => {
                const dayEvents = getEventsForDay(day);
                const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

                return (
                  <div 
                    key={day}
                    className={`bg-white dark:bg-slate-900 min-h-[110px] p-2 transition hover:bg-emerald-50/30 dark:hover:bg-slate-800/50 ${isToday ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-emerald-600 text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {dayEvents.length} ev
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[85px] custom-scrollbar">
                      {dayEvents.map((ev, idx) => (
                        <div 
                          key={idx}
                          className={`text-[10px] p-1 rounded border leading-tight truncate font-medium ${ev.badgeColor}`}
                          title={`${ev.title} (${ev.date})`}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 3: GUÍA TÉCNICA DE ESCALA BBCH */}
      {activeTab === 'guide' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Guía Oficial de Fenología para Cáñamo Industrial (Escala BBCH)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Parámetros de suma térmica (GDD acumulados sobre Tbase 8°C), morfología clave y labores de campo recomendadas por la cooperativa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HEMP_PHENOLOGICAL_STAGES.map((stage, idx) => (
              <div 
                key={stage.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {stage.bbchCode}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    ~{stage.typicalGdd} GDD
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {stage.name}
                </h4>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {stage.description}
                </p>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 text-xs">
                  <strong className="text-slate-700 dark:text-slate-300 block text-[11px] mb-1">Morfología:</strong>
                  <span className="text-slate-500 text-[11px]">{stage.keyMorphology}</span>
                </div>

                <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs">
                  <strong className="text-emerald-800 dark:text-emerald-300 block text-[11px] mb-1">Cuidado Crítico:</strong>
                  <span className="text-emerald-700 dark:text-emerald-400 text-[11px]">{stage.criticalCare}</span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Labores Obligatorias:</span>
                  <div className="flex flex-wrap gap-1">
                    {stage.recommendedLabors.map(l => (
                      <span key={l} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium text-slate-600 dark:text-slate-300">
                        {AGRICULTURAL_LABOR_INFO[l]?.name.split('&')[0]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: CERTIFICAR CAMBIO DE ESTADIO */}
      {certifyModalPlot && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={22} className="text-emerald-300" />
                <div>
                  <h3 className="font-bold text-base">Certificación de Estadio Fenológico</h3>
                  <p className="text-xs text-emerald-200">{certifyModalPlot.name}</p>
                </div>
              </div>
              <button onClick={() => setCertifyModalPlot(null)} className="text-emerald-200 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nuevo Estadio BBCH al que Avanza el Lote:
                </label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold text-emerald-700 dark:text-emerald-300 outline-none"
                  value={certifyTargetStage}
                  onChange={(e) => setCertifyTargetStage(e.target.value as HempStageId)}
                >
                  {HEMP_PHENOLOGICAL_STAGES.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.bbchCode} — {s.name} (~{s.typicalGdd} GDD)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fecha de la Inspección / Certificación:
                </label>
                <input 
                  type="date"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none font-mono"
                  value={certifyDate}
                  onChange={(e) => setCertifyDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observaciones Técnicas en Campo:
                </label>
                <textarea 
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 outline-none"
                  value={certifyNotes}
                  onChange={(e) => setCertifyNotes(e.target.value)}
                  placeholder="Detalles morfológicos observados (altura de planta, diferenciación, sanidad)..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setCertifyModalPlot(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmCertify}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <ShieldCheck size={14} /> Registrar Certificación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROGRAMAR LABOR RÁPIDA SUGERIDA */}
      {quickLaborPlot && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tractor size={20} className="text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm">Programar Labor Sugerida</h3>
                  <p className="text-[11px] text-slate-400">{quickLaborPlot.name}</p>
                </div>
              </div>
              <button onClick={() => setQuickLaborPlot(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Título de la Labor:
                </label>
                <input 
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none font-medium"
                  value={quickLaborTitle}
                  onChange={(e) => setQuickLaborTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fecha de Ejecución Programada:
                </label>
                <input 
                  type="date"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none font-mono"
                  value={quickLaborDate}
                  onChange={(e) => setQuickLaborDate(e.target.value)}
                />
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                Esta labor se añadirá a la orden de campo del lote con costo directo estimado de <strong>${Math.round((quickLaborPlot.surfaceArea || 10) * AGRICULTURAL_LABOR_INFO[quickLaborType].defaultCostPerHa)} USD</strong> imputado al libro de operaciones.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button 
                  onClick={() => setQuickLaborPlot(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmQuickLabor}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <Plus size={14} /> Crear Labor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
