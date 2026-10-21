import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { 
  DollarSign, TrendingUp, TrendingDown, Layers, Calculator, 
  FileText, Download, Printer, Filter, Calendar, Sprout, Tractor, 
  ShieldCheck, AlertCircle, ArrowUpRight, Scale, PieChart as PieChartIcon,
  BarChart3, RefreshCw, CheckCircle2, ChevronRight, Zap, Target,
  Plus, Check, X, Building2, UserCheck, Clock, Receipt, Truck,
  Warehouse, FileCheck, Eye, HelpCircle, Users, AlertTriangle, Edit2, Trash2
} from 'lucide-react';
import { AgrochemicalApplication, OperationalExpense, ExpenseCategory, ExpenseScope, ExpenseAuditStatus } from '../types';
import { getPlotAgrochemicalApplications } from '../src/services/agro40Service';

export default function FinancialReports() {
  const { 
    plots, locations, varieties, resources, currentUser, usersList, switchUserRole,
    operationalExpenses, addOperationalExpense, updateOperationalExpense, 
    deleteOperationalExpense, auditOperationalExpense 
  } = useAppContext();

  // Estados de control de vista
  const [selectedCampaign, setSelectedCampaign] = useState<string>('2025/2026');
  const [currency, setCurrency] = useState<'USD' | 'ARS'>('USD');
  const exchangeRate = 1250; // TC referencial ARS/USD
  const [activeTab, setActiveTab] = useState<'summary' | 'ledger' | 'plots' | 'coop_overhead' | 'inputs_cost' | 'projections'>('summary');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  
  // Modal de registro / edición manual de gasto operativo
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [confirmDeleteExpenseId, setConfirmDeleteExpenseId] = useState<string | null>(null);
  // Modal de auditoría de gasto cooperativa
  const [auditTargetExpense, setAuditTargetExpense] = useState<OperationalExpense | null>(null);
  const [auditNotesInput, setAuditNotesInput] = useState('');

  // Filtros del Libro de Operaciones (Ledger)
  const [ledgerScopeFilter, setLedgerScopeFilter] = useState<'all' | 'PARCELA_SOCIO' | 'COOPERATIVA_GENERAL'>('all');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'all' | ExpenseAuditStatus>('all');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Identificar si el usuario activo es Socio Productor o Cooperativa Central
  const activeUser = currentUser || usersList[0];
  const isSocio = activeUser.memberType === 'Socio_Productor' || activeUser.role === 'client';
  const isCoopAdmin = !isSocio;

  // Parcelas permitidas para el usuario actual
  // Si es Socio: SOLO las parcelas que le pertenecen (por assignedPlotIds o ownerName)
  // Si es Cooperativa: TODAS las parcelas
  const accessiblePlots = useMemo(() => {
    if (!isSocio) return plots;
    if (activeUser.assignedPlotIds && activeUser.assignedPlotIds.length > 0) {
      return plots.filter(p => activeUser.assignedPlotIds?.includes(p.id));
    }
    if (activeUser.organizationName) {
      return plots.filter(p => p.ownerName?.toLowerCase().includes(activeUser.organizationName!.toLowerCase()));
    }
    return plots.slice(0, 1); // fallback seguro
  }, [plots, isSocio, activeUser]);

  // Formulario nuevo costo operativo
  const [formScope, setFormScope] = useState<ExpenseScope>(isSocio ? 'PARCELA_SOCIO' : 'PARCELA_SOCIO');
  const [formPlotId, setFormPlotId] = useState<string>(accessiblePlots[0]?.id || '');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('LABOR_CULTURAL');
  const [formConcept, setFormConcept] = useState('');
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formUnit, setFormUnit] = useState('ha');
  const [formUnitCost, setFormUnitCost] = useState<number>(50);
  const [formCurrency, setFormCurrency] = useState<'USD' | 'ARS'>('USD');
  const [formReceiptType, setFormReceiptType] = useState<'Factura A' | 'Factura B/C' | 'Remito Oficial' | 'Orden de Trabajo' | 'Liquidación Cooperativa'>('Factura A');
  const [formReceiptNumber, setFormReceiptNumber] = useState('');
  const [formSupplierName, setFormSupplierName] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');

  // Reset modal state al abrir
  const handleOpenAddModal = () => {
    setEditingExpenseId(null);
    if (isSocio) {
      setFormScope('PARCELA_SOCIO');
      setFormCategory('LABOR_CULTURAL');
      setFormPlotId(accessiblePlots[0]?.id || '');
    } else {
      setFormScope('PARCELA_SOCIO');
      setFormCategory('LABOR_CULTURAL');
      setFormPlotId(plots[0]?.id || '');
    }
    setFormConcept('');
    setFormQuantity(1);
    setFormUnitCost(50);
    setFormReceiptNumber('');
    setFormSupplierName('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (exp: OperationalExpense) => {
    setEditingExpenseId(exp.id);
    setFormScope(exp.scope);
    setFormPlotId(exp.plotId || accessiblePlots[0]?.id || '');
    setFormCategory(exp.category);
    setFormConcept(exp.concept);
    setFormQuantity(exp.quantity);
    setFormUnit(exp.unit);
    setFormUnitCost(exp.unitCost);
    setFormCurrency(exp.currency);
    setFormReceiptType(exp.receiptType);
    setFormReceiptNumber(exp.receiptNumber);
    setFormSupplierName(exp.supplierName || '');
    setFormDate(exp.date);
    setFormNotes(exp.notes || '');
    setIsAddModalOpen(true);
  };

  // Guardar nuevo o editado costo operativo con control estricto de roles
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConcept.trim()) return;

    let selectedPlot = plots.find(p => p.id === formPlotId);
    let selectedLoc = locations.find(l => l.id === selectedPlot?.locationId);

    const effectiveScope: ExpenseScope = isSocio ? 'PARCELA_SOCIO' : formScope;
    
    if (effectiveScope === 'PARCELA_SOCIO') {
      if (!selectedPlot) {
        selectedPlot = accessiblePlots[0];
      }
      if (isSocio && !accessiblePlots.some(p => p.id === selectedPlot?.id)) {
        return;
      }
    }

    const totalRaw = formQuantity * formUnitCost;
    const totalUsd = formCurrency === 'USD' ? totalRaw : Number((totalRaw / exchangeRate).toFixed(2));
    const existingExp = editingExpenseId ? operationalExpenses.find(x => x.id === editingExpenseId) : undefined;

    const expensePayload: OperationalExpense = {
      id: editingExpenseId || `exp-${Date.now()}`,
      campaign: existingExp?.campaign || (selectedCampaign === 'all' ? '2025/2026' : selectedCampaign),
      date: formDate,
      scope: effectiveScope,
      plotId: effectiveScope === 'PARCELA_SOCIO' ? selectedPlot?.id : undefined,
      plotName: effectiveScope === 'PARCELA_SOCIO' ? selectedPlot?.name : undefined,
      locationId: effectiveScope === 'PARCELA_SOCIO' ? selectedPlot?.locationId : undefined,
      locationName: effectiveScope === 'PARCELA_SOCIO' ? selectedLoc?.name : undefined,
      socioId: existingExp?.socioId || (isSocio ? activeUser.id : (effectiveScope === 'PARCELA_SOCIO' ? selectedPlot?.ownerName : undefined)),
      socioName: existingExp?.socioName || (isSocio 
        ? (activeUser.organizationName || activeUser.name) 
        : (effectiveScope === 'PARCELA_SOCIO' ? selectedPlot?.ownerName : 'Red Cooperativa Nucleus')),
      category: formCategory,
      concept: formConcept.trim(),
      quantity: Number(formQuantity),
      unit: formUnit,
      unitCost: Number(formUnitCost),
      totalCost: Number(totalRaw.toFixed(2)),
      currency: formCurrency,
      exchangeRate: formCurrency === 'ARS' ? exchangeRate : undefined,
      totalCostUsd: totalUsd,
      receiptType: formReceiptType,
      receiptNumber: formReceiptNumber.trim() || `REC-${Math.floor(1000 + Math.random() * 9000)}`,
      supplierName: formSupplierName.trim() || 'Proveedor Local',
      status: existingExp ? existingExp.status : (isSocio ? 'DECLARADO_SOCIO' : 'AUDITADO_CONFORME'),
      auditedBy: existingExp ? existingExp.auditedBy : (isCoopAdmin ? activeUser.name : undefined),
      auditDate: existingExp ? existingExp.auditDate : (isCoopAdmin ? new Date().toISOString().split('T')[0] : undefined),
      auditNotes: existingExp?.auditNotes,
      notes: formNotes.trim() || undefined,
      createdAt: existingExp?.createdAt || new Date().toISOString()
    };

    if (editingExpenseId) {
      await updateOperationalExpense(expensePayload);
    } else {
      await addOperationalExpense(expensePayload);
    }
    setEditingExpenseId(null);
    setIsAddModalOpen(false);
  };

  // Filtrado de gastos para el usuario y campañas
  const filteredExpenses = useMemo(() => {
    return operationalExpenses.filter(exp => {
      // Filtro de campaña
      if (selectedCampaign !== 'all' && exp.campaign !== selectedCampaign) return false;

      // Filtro estricto por rol:
      // Si el usuario es un Socio, SOLO ve los gastos de sus parcelas asignadas
      if (isSocio) {
        if (exp.scope !== 'PARCELA_SOCIO') return false;
        if (!exp.plotId) return false;
        return accessiblePlots.some(p => p.id === exp.plotId);
      }

      // Si es cooperativa, ve todo
      return true;
    });
  }, [operationalExpenses, selectedCampaign, isSocio, accessiblePlots]);

  // Gastos filtrados para la vista de tabla Ledger
  const ledgerExpenses = useMemo(() => {
    return filteredExpenses.filter(exp => {
      if (ledgerScopeFilter !== 'all' && exp.scope !== ledgerScopeFilter) return false;
      if (ledgerStatusFilter !== 'all' && exp.status !== ledgerStatusFilter) return false;
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase();
        const matchConcept = exp.concept.toLowerCase().includes(q);
        const matchReceipt = exp.receiptNumber?.toLowerCase().includes(q) || false;
        const matchSupplier = exp.supplierName?.toLowerCase().includes(q) || false;
        const matchPlot = exp.plotName?.toLowerCase().includes(q) || false;
        const matchSocio = exp.socioName?.toLowerCase().includes(q) || false;
        if (!matchConcept && !matchReceipt && !matchSupplier && !matchPlot && !matchSocio) return false;
      }
      return true;
    });
  }, [filteredExpenses, ledgerScopeFilter, ledgerStatusFilter, ledgerSearch]);

  // Totales acumulados para métricas rápidas
  const financialTotals = useMemo(() => {
    let totalDirectPlotsUsd = 0;
    let totalCoopCentralUsd = 0;
    let totalAuditadoUsd = 0;
    let totalPendienteAuditoriaUsd = 0;
    let pendingAuditCount = 0;

    filteredExpenses.forEach(exp => {
      if (exp.scope === 'PARCELA_SOCIO') {
        totalDirectPlotsUsd += exp.totalCostUsd;
      } else {
        totalCoopCentralUsd += exp.totalCostUsd;
      }

      if (exp.status === 'AUDITADO_CONFORME') {
        totalAuditadoUsd += exp.totalCostUsd;
      } else if (exp.status === 'DECLARADO_SOCIO') {
        totalPendienteAuditoriaUsd += exp.totalCostUsd;
        pendingAuditCount++;
      }
    });

    const totalConsolidadoUsd = totalDirectPlotsUsd + totalCoopCentralUsd;
    const totalSurfaceHa = accessiblePlots.reduce((acc, p) => acc + (p.surfaceArea || 1), 0);
    const avgCostPerHaUsd = totalSurfaceHa > 0 ? (totalDirectPlotsUsd / totalSurfaceHa) : 0;

    return {
      totalDirectPlotsUsd,
      totalCoopCentralUsd,
      totalConsolidadoUsd,
      totalAuditadoUsd,
      totalPendienteAuditoriaUsd,
      pendingAuditCount,
      totalSurfaceHa,
      avgCostPerHaUsd
    };
  }, [filteredExpenses, accessiblePlots]);

  // Obtener aplicaciones fitosanitarias de localStorage o demo
  const agrochemicalApps = useMemo<AgrochemicalApplication[]>(() => {
    let apps: AgrochemicalApplication[] = [];
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ht_agrochemical_apps');
      if (stored) {
        try { apps = JSON.parse(stored); } catch (e) {}
      }
    }
    if (apps.length === 0) {
      apps = getPlotAgrochemicalApplications(plots);
    }
    return apps;
  }, [plots]);

  // Formateador de moneda
  const formatMoney = (amountUsd: number) => {
    if (currency === 'USD') {
      return `$${amountUsd.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    }
    const ars = amountUsd * exchangeRate;
    return `$${ars.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ARS`;
  };

  // Categorías amigables
  const categoryLabels: Record<ExpenseCategory, { label: string; icon: any; color: string }> = {
    LABOR_CULTURAL: { label: 'Labores de Campo / Siembra', icon: Tractor, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
    INSUMO_FITOSANITARIO: { label: 'Insumos & Biofertilizantes', icon: Sprout, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
    SEMILLA_FISCALIZADA: { label: 'Semilla Fiscalizada C1/C2', icon: ShieldCheck, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
    RIEGO_COMBUSTIBLE: { label: 'Riego, Energía & Gasoil', icon: Zap, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' },
    COSECHA_LOTE: { label: 'Cosecha & Enfardado Lote', icon: Layers, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30' },
    FLETE_LOGISTICA_CENTRAL: { label: 'Fletes Troncales Cooperativa', icon: Truck, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30' },
    ACOPIO_SECADO_SILOS: { label: 'Acopio & Secado en Silos', icon: Warehouse, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30' },
    CERTIFICACION_AUDITORIA: { label: 'Certificación & HPLC Oficial', icon: FileCheck, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30' },
    SEGUROS_COLECTIVOS: { label: 'Póliza Seguros Colectivos', icon: ShieldCheck, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30' },
    ESTRUCTURA_ADMIN_COOP: { label: 'Estructura & Asesoría Coop', icon: Building2, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800' }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-24">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-[#DDDB00]/20 text-slate-800 dark:text-[#DDDB00] border border-[#DDDB00]/40">
              MÓDULO ECONÓMICO AGRO 4.0
            </span>
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Trazabilidad en Tiempo Real
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <DollarSign className="text-emerald-500" size={28} />
            <span>Costos Operativos & Liquidación Cooperativa</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Control de costos directos de parcelas para socios y gestión de costos centrales cooperativos (acopio, fletes, ensayos HPLC) con trazabilidad y auditoría oficial.
          </p>
        </div>

        {/* ACCIONES SUPERIORES */}
        <div className="flex flex-wrap items-center gap-2">
          {/* BOTÓN REGISTRAR GASTO */}
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02]"
          >
            <Plus size={16} />
            <span>+ Cargar Costo Operativo</span>
          </button>

          {/* SELECTOR DE MONEDA */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-colors ${
                currency === 'USD'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('ARS')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-colors ${
                currency === 'ARS'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              ARS ($)
            </button>
          </div>

          {/* SELECTOR DE CAMPAÑA */}
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DDDB00]"
          >
            <option value="2025/2026">Campaña 2025/2026 (En Curso)</option>
            <option value="2024/2025">Campaña 2024/2025</option>
            <option value="all">Todas las Campañas</option>
          </select>
        </div>
      </div>

      {/* BANNER DE CONTROL DE ACCESO & PERSPECTIVA ACTIVA */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isSocio 
          ? 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-950/20 dark:border-amber-900/40' 
          : 'bg-sky-500/10 border-sky-500/30 dark:bg-sky-950/20 dark:border-sky-900/40'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              isSocio ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-sky-500/20 text-sky-600 dark:text-sky-400'
            }`}>
              {isSocio ? <Tractor size={22} /> : <Building2 size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isSocio ? 'bg-amber-200 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200' : 'bg-sky-200 dark:bg-sky-900/50 text-sky-900 dark:text-sky-200'
                }`}>
                  {isSocio ? 'Rol Activo: Socio Productor' : 'Rol Activo: Administración Cooperativa'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {activeUser.name} ({activeUser.organizationName || 'Nucleus Trace'})
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {isSocio ? (
                  <>
                    <strong className="text-amber-700 dark:text-amber-300">Regla de Seguridad:</strong> Solo puedes cargar y ver costos correspondientes a tus parcelas asignadas (<strong>{accessiblePlots.map(p => p.name).join(', ') || 'Sin parcelas'}</strong>). El resto de costos de logística central, acondicionamiento y laboratorios son administrados centralmente por la cooperativa.
                  </>
                ) : (
                  <>
                    <strong className="text-sky-700 dark:text-sky-300">Trazabilidad Integral:</strong> Administras la auditoría de costos de los socios y los costos centrales de la cooperativa (Silos de secado, fletes troncales, aranceles ARICCAME/SENASA y análisis HPLC).
                  </>
                )}
              </p>
            </div>
          </div>

          {/* SIMULADOR DE PERSPECTIVA (CAMBIAR DE ROL PARA PRUEBAS) */}
          <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Users size={14} /> Cambiar Perspectiva:
            </span>
            <select
              value={activeUser.id}
              onChange={(e) => switchUserRole(e.target.value)}
              className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {usersList.map(u => (
                <option key={u.id} value={u.id}>
                  {u.memberType === 'Socio_Productor' ? '🚜 Socio: ' : '🏢 Coop: '} {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* RESUMEN DE TARJETAS KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Costos Directos de Parcelas */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Costos en Parcela</span>
            <Tractor size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {formatMoney(financialTotals.totalDirectPlotsUsd)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{isSocio ? 'Tus parcelas activas' : 'Total parcelas socios'}</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              {formatMoney(financialTotals.avgCostPerHaUsd)}/ha
            </span>
          </div>
        </div>

        {/* KPI 2: Costos Centrales Cooperativa */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Infraestructura Cooperativa</span>
            <Building2 size={18} className="text-sky-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {isSocio ? 'Administrado Central' : formatMoney(financialTotals.totalCoopCentralUsd)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Secado, fletes & laboratorios</span>
            <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
              {isSocio ? 'Custodia HempC' : `${filteredExpenses.filter(e => e.scope === 'COOPERATIVA_GENERAL').length} operaciones`}
            </span>
          </div>
        </div>

        {/* KPI 3: Total Auditado Conforme */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Auditado & Conforme</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatMoney(financialTotals.totalAuditadoUsd)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Con respaldo documental</span>
            <span className="font-mono font-bold text-emerald-600">100% Homologado</span>
          </div>
        </div>

        {/* KPI 4: Pendiente de Auditoría / Validación */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pendiente Validación Coop</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {formatMoney(financialTotals.totalPendienteAuditoriaUsd)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{financialTotals.pendingAuditCount} comprobante(s) por revisar</span>
            <span className="font-mono font-bold text-amber-600">En revisión</span>
          </div>
        </div>
      </div>

      {/* PESTAÑAS PRINCIPALES DE NAVEGACIÓN */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2 no-scrollbar">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'summary'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 size={16} />
          <span>Balance Ejecutivo</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 whitespace-nowrap relative ${
            activeTab === 'ledger'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Receipt size={16} />
          <span>Libro de Operaciones & Trazabilidad</span>
          {financialTotals.pendingAuditCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full">
              {financialTotals.pendingAuditCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('plots')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'plots'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Tractor size={16} />
          <span>{isSocio ? 'Mis Parcelas & Rendimiento' : 'Costos por Parcela & Socio'}</span>
        </button>

        <button
          onClick={() => setActiveTab('coop_overhead')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'coop_overhead'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 size={16} />
          <span>Costos Centrales & Prorrateo</span>
        </button>

        <button
          onClick={() => setActiveTab('inputs_cost')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'inputs_cost'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sprout size={16} />
          <span>Insumos & Cuaderno Fitosanitario</span>
        </button>

        <button
          onClick={() => setActiveTab('projections')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'projections'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp size={16} />
          <span>Proyecciones & Liquidación Final</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: BALANCE EJECUTIVO */}
      {/* ========================================================================= */}
      {activeTab === 'summary' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico 1: Desglose por Categoría de Costo */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <PieChartIcon size={18} className="text-emerald-500" />
                    <span>Estructura de Costos Operativos por Rubro</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Distribución de gastos directos e indirectos registrados en campaña {selectedCampaign}
                  </p>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={[
                      { rubro: 'Labores Campo', monto: filteredExpenses.filter(e => e.category === 'LABOR_CULTURAL').reduce((a, b) => a + b.totalCostUsd, 0) },
                      { rubro: 'Insumos & Bio', monto: filteredExpenses.filter(e => e.category === 'INSUMO_FITOSANITARIO').reduce((a, b) => a + b.totalCostUsd, 0) },
                      { rubro: 'Semilla C1', monto: filteredExpenses.filter(e => e.category === 'SEMILLA_FISCALIZADA').reduce((a, b) => a + b.totalCostUsd, 0) },
                      { rubro: 'Riego / Energía', monto: filteredExpenses.filter(e => e.category === 'RIEGO_COMBUSTIBLE').reduce((a, b) => a + b.totalCostUsd, 0) },
                      { rubro: 'Silos & Secado', monto: filteredExpenses.filter(e => e.category === 'ACOPIO_SECADO_SILOS').reduce((a, b) => a + b.totalCostUsd, 0) },
                      { rubro: 'Fletes Troncal', monto: filteredExpenses.filter(e => e.category === 'FLETE_LOGISTICA_CENTRAL').reduce((a, b) => a + b.totalCostUsd, 0) },
                      { rubro: 'HPLC / Auditoría', monto: filteredExpenses.filter(e => e.category === 'CERTIFICACION_AUDITORIA').reduce((a, b) => a + b.totalCostUsd, 0) },
                      { rubro: 'Seguros Colect.', monto: filteredExpenses.filter(e => e.category === 'SEGUROS_COLECTIVOS').reduce((a, b) => a + b.totalCostUsd, 0) },
                    ]}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="rubro" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip 
                      formatter={(val: any) => [formatMoney(Number(val)), 'Total Invertido']}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="monto" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Panel de Trazabilidad & Matriz de Responsabilidad */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 mb-2">
                  <ShieldCheck size={18} className="text-sky-500" />
                  <span>Protocolo de Carga y Trazabilidad</span>
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Separación estricta de responsabilidades entre el Socio Productor y la Cooperativa Central.
                </p>

                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50">
                    <div className="flex items-center gap-2 text-xs font-black text-amber-800 dark:text-amber-300 uppercase">
                      <Tractor size={14} />
                      <span>1. Socio Productor (Nivel Parcela)</span>
                    </div>
                    <p className="text-[11px] text-amber-900/80 dark:text-amber-400 mt-1">
                      Carga únicamente labores de su lote, insumos locales aplicados, canon de riego propio y combustible. Sus cargas entran en estado <em>«Declarado por Socio»</em>.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-900/50">
                    <div className="flex items-center gap-2 text-xs font-black text-sky-800 dark:text-sky-300 uppercase">
                      <Building2 size={14} />
                      <span>2. Cooperativa Central (Nivel Nodo)</span>
                    </div>
                    <p className="text-[11px] text-sky-900/80 dark:text-sky-400 mt-1">
                      Gestiona acopio y secado central en silos, fletes interprovinciales, certificaciones HPLC oficiales y pólizas de seguro. Audita y convalida los comprobantes de los socios.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase">
                      <Scale size={14} />
                      <span>3. Liquidación Transparente</span>
                    </div>
                    <p className="text-[11px] text-emerald-900/80 dark:text-emerald-400 mt-1">
                      Al cosechar, se liquida el Valor Bruto de Producción deduciendo el costo directo auditado de la parcela + la cuota de servicios compartidos cooperativos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Total Operaciones Registradas:</span>
                <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                  {filteredExpenses.length} comprobantes
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: LIBRO DE OPERACIONES & TRAZABILIDAD (LEDGER COMPLETO) */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* BARRA DE FILTROS DEL LIBRO */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Buscar por concepto, comprobante, socio..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DDDB00] w-64"
              />

              {/* Filtro de Alcance (solo para Cooperativa, ya que socios solo tienen Parcela) */}
              {!isSocio && (
                <select
                  value={ledgerScopeFilter}
                  onChange={(e) => setLedgerScopeFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">Todo el Alcance</option>
                  <option value="PARCELA_SOCIO">Solo Parcelas (Socios)</option>
                  <option value="COOPERATIVA_GENERAL">Solo Cooperativa Central</option>
                </select>
              )}

              {/* Filtro de Estado de Auditoría */}
              <select
                value={ledgerStatusFilter}
                onChange={(e) => setLedgerStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Todos los Estados</option>
                <option value="AUDITADO_CONFORME">✅ Auditado Conforme</option>
                <option value="DECLARADO_SOCIO">⏳ Declarado por Socio (Pendiente)</option>
                <option value="OBSERVADO_REVISION">⚠️ Observado para Revisión</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
              <span>Mostrando {ledgerExpenses.length} de {filteredExpenses.length} operaciones</span>
            </div>
          </div>

          {/* TABLA DE OPERACIONES */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Fecha / Comprobante</th>
                    <th className="py-3 px-4">Alcance & Imputación</th>
                    <th className="py-3 px-4">Rubro / Categoría</th>
                    <th className="py-3 px-4">Concepto Operativo</th>
                    <th className="py-3 px-4 text-right">Cant. & Unitario</th>
                    <th className="py-3 px-4 text-right">Monto Total</th>
                    <th className="py-3 px-4 text-center">Estado Auditoría</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ledgerExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Receipt size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="font-bold">No se encontraron operaciones registradas.</p>
                        <p className="text-[11px] mt-1">Utiliza el botón «+ Cargar Costo Operativo» para ingresar una nueva labor o insumo.</p>
                      </td>
                    </tr>
                  ) : (
                    ledgerExpenses.map((exp) => {
                      const catInfo = categoryLabels[exp.category] || { label: exp.category, icon: FileText, color: 'text-slate-600 bg-slate-50' };
                      const CatIcon = catInfo.icon;

                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          {/* Fecha y Comprobante */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
                              {exp.date}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {exp.receiptType} • {exp.receiptNumber}
                            </span>
                          </td>

                          {/* Alcance e Imputación */}
                          <td className="py-3.5 px-4">
                            {exp.scope === 'PARCELA_SOCIO' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                                  <Tractor size={12} /> Parcela Socio
                                </span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs mt-1">
                                  {exp.plotName || 'Parcela Asignada'}
                                </span>
                                <span className="text-[10px] text-slate-500 block">
                                  Socio: {exp.socioName}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                                  <Building2 size={12} /> Cooperativa Central
                                </span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs mt-1">
                                  Infraestructura Compartida
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Rubro */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${catInfo.color}`}>
                              <CatIcon size={12} />
                              <span>{catInfo.label}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Prov: {exp.supplierName || 'N/A'}
                            </span>
                          </td>

                          {/* Concepto */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                              {exp.concept}
                            </p>
                            {exp.auditNotes && (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                <Check size={10} /> {exp.auditNotes}
                              </p>
                            )}
                            {exp.status === 'OBSERVADO_REVISION' && exp.auditNotes && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 flex items-center gap-1">
                                <AlertTriangle size={10} /> {exp.auditNotes}
                              </p>
                            )}
                          </td>

                          {/* Cantidad y Unitario */}
                          <td className="py-3.5 px-4 text-right font-mono">
                            <span className="text-slate-800 dark:text-slate-200 block">
                              {exp.quantity} {exp.unit}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              @ ${exp.unitCost} {exp.currency}
                            </span>
                          </td>

                          {/* Monto Total */}
                          <td className="py-3.5 px-4 text-right font-mono">
                            <span className="text-base font-black text-slate-900 dark:text-white block">
                              {formatMoney(exp.totalCostUsd)}
                            </span>
                            {exp.currency === 'ARS' && (
                              <span className="text-[10px] text-slate-400 block">
                                (${exp.totalCost.toLocaleString('es-AR')} ARS)
                              </span>
                            )}
                          </td>

                          {/* Estado Auditoría */}
                          <td className="py-3.5 px-4 text-center">
                            {exp.status === 'AUDITADO_CONFORME' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <CheckCircle2 size={12} /> Auditado
                              </span>
                            )}
                            {exp.status === 'DECLARADO_SOCIO' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <Clock size={12} /> Declarado Socio
                              </span>
                            )}
                            {exp.status === 'OBSERVADO_REVISION' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                <AlertTriangle size={12} /> Observado
                              </span>
                            )}
                            {exp.auditedBy && (
                              <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                                Por: {exp.auditedBy.split(' ')[0]}
                              </span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {isCoopAdmin && exp.status !== 'AUDITADO_CONFORME' && (
                                <button
                                  onClick={() => auditOperationalExpense(exp.id, 'AUDITADO_CONFORME', activeUser.name, 'Comprobante y labor homologada conforme.')}
                                  title="Aprobar y homologar costo"
                                  className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Check size={14} />
                                </button>
                              )}
                              {isCoopAdmin && exp.status !== 'OBSERVADO_REVISION' && (
                                <button
                                  onClick={() => {
                                    setAuditTargetExpense(exp);
                                    setAuditNotesInput('');
                                  }}
                                  title="Observar para revisión"
                                  className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400 rounded-lg transition-colors cursor-pointer"
                                >
                                  <AlertTriangle size={14} />
                                </button>
                              )}
                              {(isCoopAdmin || exp.status !== 'AUDITADO_CONFORME') && (
                                <button
                                  onClick={() => handleOpenEditModal(exp)}
                                  title="Editar registro"
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}
                              {(isCoopAdmin || exp.status !== 'AUDITADO_CONFORME') && (
                                confirmDeleteExpenseId === exp.id ? (
                                  <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800">
                                    <button
                                      onClick={() => {
                                        deleteOperationalExpense(exp.id);
                                        setConfirmDeleteExpenseId(null);
                                      }}
                                      className="text-[10px] font-black text-rose-600 uppercase cursor-pointer"
                                    >
                                      Borrar
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteExpenseId(null)}
                                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteExpenseId(exp.id)}
                                    title="Eliminar registro"
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )
                              )}
                              {!isCoopAdmin && exp.status === 'AUDITADO_CONFORME' && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Homologado
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: COSTOS POR PARCELA & SOCIO */}
      {/* ========================================================================= */}
      {activeTab === 'plots' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accessiblePlots.map((plot) => {
              const plotExpenses = filteredExpenses.filter(e => e.plotId === plot.id);
              const totalPlotUsd = plotExpenses.reduce((acc, e) => acc + e.totalCostUsd, 0);
              const areaHa = plot.surfaceArea || 1.0;
              const costPerHa = areaHa > 0 ? (totalPlotUsd / areaHa) : 0;
              const variety = varieties.find(v => v.id === plot.varietyId);

              return (
                <div key={plot.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          {plot.type} • {plot.surfaceArea} ha
                        </span>
                        <h4 className="text-base font-black text-slate-900 dark:text-white mt-1.5">
                          {plot.name}
                        </h4>
                        <span className="text-xs text-slate-500 block">
                          Titular: {plot.ownerName || 'Red Cooperativa'}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                        {variety?.name?.split(' ')[0] || 'USO 31'}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Costo Total Imputado:</span>
                        <strong className="text-xl font-mono text-slate-900 dark:text-white">
                          {formatMoney(totalPlotUsd)}
                        </strong>
                      </div>
                      <div className="flex justify-between items-baseline mt-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-[11px] text-slate-500">Costo Directo por Hectárea:</span>
                        <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                          {formatMoney(costPerHa)}/ha
                        </span>
                      </div>
                    </div>

                    {/* Desglose de operaciones en esta parcela */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Operaciones Registradas ({plotExpenses.length}):
                      </span>
                      {plotExpenses.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No hay costos cargados en este lote aún.</p>
                      ) : (
                        plotExpenses.slice(0, 3).map((exp) => (
                          <div key={exp.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                              {exp.concept}
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                              {formatMoney(exp.totalCostUsd)}
                            </span>
                          </div>
                        ))
                      )}
                      {plotExpenses.length > 3 && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          + {plotExpenses.length - 3} operaciones más en el Libro de Operaciones
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setFormPlotId(plot.id);
                        setFormScope('PARCELA_SOCIO');
                        setIsAddModalOpen(true);
                      }}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Plus size={14} /> Cargar costo a este lote
                    </button>
                    <span className="text-[11px] font-mono text-slate-400">
                      Campaña {plot.campaign || '2025/2026'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 4: COSTOS CENTRALES COOPERATIVOS & PRORRATEO */}
      {/* ========================================================================= */}
      {activeTab === 'coop_overhead' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Building2 size={20} className="text-sky-500" />
                  <span>Costos Centrales de Infraestructura & Servicios Compartidos</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Gastos asumidos y gestionados por la Cooperativa para beneficio de todos los socios (secado masivo, fletes troncales, certificaciones de pureza ISTA y ensayos HPLC en laboratorios oficiales).
                </p>
              </div>

              {!isSocio && (
                <button
                  onClick={() => {
                    setFormScope('COOPERATIVA_GENERAL');
                    setFormCategory('ACOPIO_SECADO_SILOS');
                    setIsAddModalOpen(true);
                  }}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shrink-0 transition-colors"
                >
                  <Plus size={16} /> Cargar Gasto Central Coop
                </button>
              )}
            </div>

            {/* Simulación de Prorrateo Transparente */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-900/50">
                <span className="text-[10px] font-mono text-sky-800 dark:text-sky-300 uppercase block">Gasto Central Consolidado</span>
                <strong className="text-xl font-mono text-sky-900 dark:text-white block mt-1">
                  {formatMoney(financialTotals.totalCoopCentralUsd)}
                </strong>
                <span className="text-xs text-sky-700/80 dark:text-sky-400 block mt-1">
                  Total de operaciones de nodo central
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50">
                <span className="text-[10px] font-mono text-indigo-800 dark:text-indigo-300 uppercase block">Prorrateo Estimado / Hectárea</span>
                <strong className="text-xl font-mono text-indigo-900 dark:text-white block mt-1">
                  {formatMoney(financialTotals.totalSurfaceHa > 0 ? financialTotals.totalCoopCentralUsd / financialTotals.totalSurfaceHa : 0)}/ha
                </strong>
                <span className="text-xs text-indigo-700/80 dark:text-indigo-400 block mt-1">
                  Distribuido sobre {financialTotals.totalSurfaceHa} ha activas
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50">
                <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 uppercase block">Ahorro por Escala Colectiva</span>
                <strong className="text-xl font-mono text-emerald-900 dark:text-white block mt-1">
                  -34.5% vs Individual
                </strong>
                <span className="text-xs text-emerald-700/80 dark:text-emerald-400 block mt-1">
                  En fletes consolidados y HPLC mayorista
                </span>
              </div>
            </div>

            {/* Listado de Costos Centrales */}
            <div className="space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                Operaciones Centrales de Campaña ({filteredExpenses.filter(e => e.scope === 'COOPERATIVA_GENERAL').length}):
              </span>

              {filteredExpenses.filter(e => e.scope === 'COOPERATIVA_GENERAL').map((exp) => (
                <div key={exp.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300 shrink-0">
                      <Warehouse size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {exp.concept}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {exp.receiptNumber}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        Proveedor: {exp.supplierName} • Fecha: {exp.date} • {exp.notes || 'Servicio común'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-black font-mono text-slate-900 dark:text-white block">
                      {formatMoney(exp.totalCostUsd)}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block">
                      {exp.status === 'AUDITADO_CONFORME' ? '✅ Homologado Coop' : 'En revisión'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 5: INSUMOS & CUADERNO FITOSANITARIO */}
      {/* ========================================================================= */}
      {activeTab === 'inputs_cost' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 mb-2">
              <Sprout size={18} className="text-emerald-500" />
              <span>Insumos Aplicados en Cuaderno Fitosanitario & Tarifario Homologado</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Sincronización directa entre las aplicaciones registradas por los técnicos y el catálogo de recursos valorizados.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((res) => (
                <div key={res.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                      {res.type}
                    </span>
                    <span className="font-mono font-black text-slate-900 dark:text-white">
                      ${res.costPerUnit} USD / {res.unit}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {res.name}
                  </h4>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Stock Cooperativa: {res.stock || 0} {res.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 6: PROYECCIONES & RETORNO DE COSECHA */}
      {/* ========================================================================= */}
      {activeTab === 'projections' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-sky-500" />
              <span>Sensibilidad de Precios & Proyección de Cosecha</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Escenarios de ingresos según oscilaciones del mercado de comodities de cáñamo industrial (Fibra, Grano y Biomasa).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Fibra Larga / Corta Industrial</span>
                <strong className="text-lg font-mono text-slate-900 dark:text-white block mt-1">$340 USD / Tn</strong>
                <span className="text-xs text-slate-500 block mt-1">
                  Rinde esperado: 7.4 a 9.2 Tn/ha en lotes comerciales.
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Grano / Semilla Limpia</span>
                <strong className="text-lg font-mono text-slate-900 dark:text-white block mt-1">$1,250 USD / Tn</strong>
                <span className="text-xs text-slate-500 block mt-1">
                  Rinde esperado: 1.25 a 1.85 Tn/ha bajo fertirriego.
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Biomasa CBG / Flor Seca</span>
                <strong className="text-lg font-mono text-slate-900 dark:text-white block mt-1">$9.50 USD / kg</strong>
                <span className="text-xs text-slate-500 block mt-1">
                  Rinde esperado: 900 a 1,200 kg/ha en Santhica 27.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTRO MANUAL DE COSTO OPERATIVO */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#DDDB00] bg-slate-900 dark:bg-slate-800 px-2 py-0.5 rounded">
                  REGISTRO DE COSTO OPERATIVO
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {editingExpenseId
                    ? 'Editar Operación / Gasto'
                    : isSocio
                    ? 'Cargar Costo de Parcela'
                    : 'Cargar Operación / Gasto'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isSocio 
                    ? 'Como socio, este costo queda asociado a tu lote y requiere validación cooperativa.' 
                    : 'Como cooperativa, puedes imputar a un lote de socio o a los costos centrales.'}
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              {/* ALCANCE: Si es cooperativa, puede elegir; si es socio, está forzado a PARCELA */}
              {!isSocio ? (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Alcance de la Operación
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormScope('PARCELA_SOCIO')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                        formScope === 'PARCELA_SOCIO'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Tractor size={16} /> Parcela de Socio
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormScope('COOPERATIVA_GENERAL')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                        formScope === 'COOPERATIVA_GENERAL'
                          ? 'bg-sky-500 text-white border-sky-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Building2 size={16} /> Cooperativa Central
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 font-medium">
                  <Tractor size={16} className="shrink-0" />
                  <span>Carga exclusiva para tus parcelas registradas.</span>
                </div>
              )}

              {/* SELECCIÓN DE PARCELA (OBLIGATORIA SI SCOPE ES PARCELA) */}
              {(formScope === 'PARCELA_SOCIO' || isSocio) && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Parcela Imputada *
                  </label>
                  <select
                    value={formPlotId}
                    onChange={(e) => setFormPlotId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DDDB00]"
                  >
                    {accessiblePlots.map((plot) => (
                      <option key={plot.id} value={plot.id}>
                        {plot.name} ({plot.surfaceArea} ha) - {plot.ownerName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* CATEGORÍA / RUBRO */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Categoría Operativa *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  {isSocio ? (
                    // Categorías permitidas a socios
                    <>
                      <option value="LABOR_CULTURAL">Labores de Campo (Preparación / Siembra / Laboreo)</option>
                      <option value="INSUMO_FITOSANITARIO">Insumos & Biofertilizantes Aplicados</option>
                      <option value="SEMILLA_FISCALIZADA">Semilla Fiscalizada Asignada</option>
                      <option value="RIEGO_COMBUSTIBLE">Riego, Energía & Combustible Parcela</option>
                      <option value="COSECHA_LOTE">Cosecha Mecanizada & Enfardado</option>
                    </>
                  ) : formScope === 'COOPERATIVA_GENERAL' ? (
                    // Categorías cooperativa general
                    <>
                      <option value="ACOPIO_SECADO_SILOS">Acopio & Secado en Silos Centrales</option>
                      <option value="FLETE_LOGISTICA_CENTRAL">Fletes Troncales Consolidados</option>
                      <option value="CERTIFICACION_AUDITORIA">Certificaciones HPLC & Laboratorio INTA</option>
                      <option value="SEGUROS_COLECTIVOS">Póliza Colectiva Multirriesgo Agrícola</option>
                      <option value="ESTRUCTURA_ADMIN_COOP">Estructura & Trazabilidad Central</option>
                    </>
                  ) : (
                    // Todas las categorías para coop asignando a lote
                    <>
                      <option value="LABOR_CULTURAL">Labores de Campo / Siembra</option>
                      <option value="INSUMO_FITOSANITARIO">Insumos & Biofertilizantes</option>
                      <option value="SEMILLA_FISCALIZADA">Semilla Fiscalizada C1/C2</option>
                      <option value="RIEGO_COMBUSTIBLE">Riego & Combustible</option>
                      <option value="COSECHA_LOTE">Cosecha en Lote</option>
                    </>
                  )}
                </select>
              </div>

              {/* CONCEPTO */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Concepto / Detalle de la Operación *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Siembra neumática 45 kg/ha con tractor propio..."
                  value={formConcept}
                  onChange={(e) => setFormConcept(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DDDB00]"
                />
              </div>

              {/* CANTIDAD, UNIDAD Y COSTO UNITARIO */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Unidad
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="ha">Hectáreas (ha)</option>
                    <option value="litros">Litros (L)</option>
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="tn">Toneladas (tn)</option>
                    <option value="horas">Horas Máquina</option>
                    <option value="viajes">Viajes Flete</option>
                    <option value="global">Global</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Costo Unit. ({formCurrency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={formUnitCost}
                    onChange={(e) => setFormUnitCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* TOTAL CALCULADO & MONEDA */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">Total Calculado</span>
                  <strong className="text-lg font-mono text-slate-900 dark:text-white">
                    ${(formQuantity * formUnitCost).toLocaleString('es-AR', { minimumFractionDigits: 2 })} {formCurrency}
                  </strong>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFormCurrency('USD')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg ${formCurrency === 'USD' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500'}`}
                  >
                    USD
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCurrency('ARS')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg ${formCurrency === 'ARS' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500'}`}
                  >
                    ARS
                  </button>
                </div>
              </div>

              {/* COMPROBANTE & PROVEEDOR */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tipo de Comprobante
                  </label>
                  <select
                    value={formReceiptType}
                    onChange={(e) => setFormReceiptType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="Factura A">Factura A</option>
                    <option value="Factura B/C">Factura B/C</option>
                    <option value="Remito Oficial">Remito Oficial</option>
                    <option value="Orden de Trabajo">Orden de Trabajo</option>
                    <option value="Liquidación Cooperativa">Liquidación Cooperativa</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    N° Comprobante / Remito
                  </label>
                  <input
                    type="text"
                    placeholder="FAC-A-0001-..."
                    value={formReceiptNumber}
                    onChange={(e) => setFormReceiptNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Proveedor / Contratista / Prestador
                </label>
                <input
                  type="text"
                  placeholder="Razón Social o Nombre del Contratista"
                  value={formSupplierName}
                  onChange={(e) => setFormSupplierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                >
                  Confirmar & Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: AUDITORÍA DE GASTO POR COOPERATIVA */}
      {/* ========================================================================= */}
      {auditTargetExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                  DICTAMEN DE AUDITORÍA
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  Observar / Notificar Corrección
                </h3>
                <p className="text-xs text-slate-500">
                  {auditTargetExpense.concept} ({auditTargetExpense.receiptNumber})
                </p>
              </div>
              <button
                onClick={() => setAuditTargetExpense(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Motivo de la Observación (Se notificará al socio titular)
              </label>
              <textarea
                rows={3}
                required
                placeholder="Ej: La factura adjunta no coincide con la superficie declarada en la orden de trabajo..."
                value={auditNotesInput}
                onChange={(e) => setAuditNotesInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAuditTargetExpense(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!auditNotesInput.trim()) return;
                  await auditOperationalExpense(
                    auditTargetExpense.id,
                    'OBSERVADO_REVISION',
                    activeUser.name,
                    auditNotesInput.trim()
                  );
                  setAuditTargetExpense(null);
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm"
              >
                Registrar Observación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
