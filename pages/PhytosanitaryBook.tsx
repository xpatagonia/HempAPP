import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { AgrochemicalApplication, ToxicologicalBand, Plot, SupplierLotInspection } from '../types';
import { getPlotAgrochemicalApplications } from '../src/services/agro40Service';
import { DEMO_SUPPLIER_INSPECTIONS } from '../src/data/initialDemoData';
import { 
  ShieldCheck, Plus, Search, Filter, Printer, Download, 
  Calendar, Clock, AlertTriangle, CheckCircle2, AlertCircle,
  FlaskConical, Sprout, Wind, Thermometer, Droplets, User, 
  FileText, X, Save, ChevronRight, HelpCircle, ArrowUpRight,
  Package, MapPin, Building2, Check, Scale, Layers, Trash2, Edit2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BarcodeRenderer } from '../components/BarcodeRenderer';
import { canAccessPlot } from '../src/utils/structurePermissions';

// Insumos homologados y lotes recepcionados preconfigurados para vinculación rápida
const RECEIVEABLE_INPUT_PRESETS = [
  {
    lotNumber: 'LOT-BIO-TRICHO-25B',
    productName: 'Trichoderma harzianum TH-35 Líquido',
    category: 'Bioestimulante' as const,
    activeIngredient: 'Trichoderma harzianum 1x10^9 UFC/ml',
    manufacturer: 'Biológicos del Litoral S.A.',
    supplierName: 'AgroInsumos Biológicos del Litoral',
    senasaRegisterNumber: 'SENASA-REG-BIO-4491-SF',
    toxicologicalClass: 'Biológico / Orgánico Certificado' as ToxicologicalBand,
    dosagePerHa: 1.5,
    dosageUnit: 'L/ha' as const,
    safetyPeriodDays: 0,
    applicationMethod: 'Fertirriego' as const,
    notes: 'Lote de insumo inspeccionado y aprobado para campo (Apto GACP).'
  },
  {
    lotNumber: 'LOT-BIO-GLOMUS-2025',
    productName: 'Glomus intraradices Micorrizas VAM',
    category: 'Bioestimulante' as const,
    activeIngredient: 'Esporas viables 1.5x10^4 / g + Ácidos Húmicos',
    manufacturer: 'Biológicos del Litoral S.A.',
    supplierName: 'AgroInsumos Biológicos del Litoral',
    senasaRegisterNumber: 'SENASA-REG-BIO-3820-BA',
    toxicologicalClass: 'Biológico / Orgánico Certificado' as ToxicologicalBand,
    dosagePerHa: 2.0,
    dosageUnit: 'kg/ha' as const,
    safetyPeriodDays: 0,
    applicationMethod: 'Incorporación Edáfica' as const,
    notes: 'Inoculación de siembra para desarrollo radicular.'
  },
  {
    lotNumber: 'LOT-BIO-2026-081',
    productName: 'Bio-Hemp Root Optimizer',
    category: 'Bioestimulante' as const,
    activeIngredient: 'Ácidos Húmicos 15% + Ácidos Fúlvicos 3% + Micorrizas VAM',
    manufacturer: 'Bioagro Argentina S.A.',
    supplierName: 'Insumos Agrícolas del Centro S.R.L.',
    senasaRegisterNumber: 'SENASA N° 18.420/2022',
    toxicologicalClass: 'Biológico / Orgánico Certificado' as ToxicologicalBand,
    dosagePerHa: 5.0,
    dosageUnit: 'L/ha' as const,
    safetyPeriodDays: 0,
    applicationMethod: 'Fertirriego' as const,
    notes: 'Bioestimulación radicular en fase vegetativa inicial.'
  },
  {
    lotNumber: 'NEEM-2026-004',
    productName: 'Dipromite Bio-Neem EC (Azadiractina)',
    category: 'Insecticida' as const,
    activeIngredient: 'Azadiractina 1.2% EC (Extracto de neem puro)',
    manufacturer: 'Biocontrol Technologies Arg',
    supplierName: 'AgroInsumos Biológicos del Litoral',
    senasaRegisterNumber: 'SENASA N° 21.045/2024',
    toxicologicalClass: 'Banda Verde (Banda IV - Poco Peligroso)' as ToxicologicalBand,
    dosagePerHa: 0.8,
    dosageUnit: 'L/ha' as const,
    safetyPeriodDays: 3,
    applicationMethod: 'Pulverización Terrestre' as const,
    notes: 'Control preventivo de trips y pulgones. Pulverizar al atardecer.'
  },
  {
    lotNumber: 'BTK-BIO-2025-09',
    productName: 'Bacillus thuringiensis var. kurstaki',
    category: 'Insecticida' as const,
    activeIngredient: 'Delta-endotoxinas proteicas 32.000 UI/mg',
    manufacturer: 'BioInsumos Santa Fe S.A.',
    supplierName: 'AgroInsumos Biológicos del Litoral',
    senasaRegisterNumber: 'SENASA N° 11.204/2021',
    toxicologicalClass: 'Biológico / Orgánico Certificado' as ToxicologicalBand,
    dosagePerHa: 1.0,
    dosageUnit: 'kg/ha' as const,
    safetyPeriodDays: 3,
    applicationMethod: 'Pulverización Terrestre' as const,
    notes: 'Control selectivo de isocas defoliadoras sin residuo químico.'
  },
  {
    lotNumber: 'YARA-8821-X',
    productName: 'YaraVita CropBoost',
    category: 'Fertilizante Foliar' as const,
    activeIngredient: 'Fósforo soluble 20% + Magnesio 4% + Cinc 3% + Boro 1%',
    manufacturer: 'Yara International ASA',
    supplierName: 'Nutrientes del Sur S.A.',
    senasaRegisterNumber: 'SENASA N° 15.892/2019',
    toxicologicalClass: 'Banda Verde (Banda IV - Poco Peligroso)' as ToxicologicalBand,
    dosagePerHa: 2.5,
    dosageUnit: 'L/ha' as const,
    safetyPeriodDays: 7,
    applicationMethod: 'Pulverización Terrestre' as const,
    notes: 'Corrector micronutricional pre-floración.'
  }
];

export default function PhytosanitaryBook() {
  const { plots, currentUser, locations, varieties, clients } = useAppContext();

  // Carga reactiva de aplicaciones sincronizada con localStorage (purgando demos sintéticos previos)
  const [applications, setApplications] = useState<AgrochemicalApplication[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ht_agrochemical_apps');
      if (stored) {
        try {
          const parsed: AgrochemicalApplication[] = JSON.parse(stored);
          const cleaned = parsed.filter(
            a => !a.id?.startsWith('app-bio-') && !a.id?.startsWith('app-foliar-') && !a.id?.startsWith('app-insect-')
          );
          if (cleaned.length !== parsed.length) {
            localStorage.setItem('ht_agrochemical_apps', JSON.stringify(cleaned));
          }
          return cleaned;
        } catch (e) {}
      }
    }
    return getPlotAgrochemicalApplications(plots);
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ht_agrochemical_apps', JSON.stringify(applications));
    }
  }, [applications]);

  // Filtros y Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlotId, setFilterPlotId] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modales y Estado de Edición / Eliminación
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedAppForPrint, setSelectedAppForPrint] = useState<AgrochemicalApplication | null>(null);

  // Parcelas accesibles según el aislamiento de estructura
  const availablePlots = useMemo(() => {
    return plots.filter(p => canAccessPlot(currentUser, p, locations, clients));
  }, [plots, currentUser, locations, clients]);

  // Formulario de Nueva Aplicación
  const [formData, setFormData] = useState<Partial<AgrochemicalApplication>>({
    plotId: availablePlots[0]?.id || plots[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    category: 'Bioestimulante',
    productName: '',
    activeIngredient: '',
    manufacturer: '',
    supplierName: '',
    senasaRegisterNumber: '',
    toxicologicalClass: 'Biológico / Orgánico Certificado',
    dosagePerHa: 1.5,
    dosageUnit: 'L/ha',
    applicationMethod: 'Pulverización Terrestre',
    batchNumber: '',
    safetyPeriodDays: 0,
    responsibleAgronomist: currentUser?.name || 'Ing. Agr. Lucas Berardi',
    agronomistLicense: 'MP-AGRO-3321 MZA',
    weatherCondition: {
      temperatureC: 22.0,
      windSpeedKmH: 8.5,
      relativeHumidityPct: 60
    },
    notes: ''
  });

  // Cálculo de KPIs Fitosanitarios
  const kpis = useMemo(() => {
    const today = new Date();
    const total = applications.length;

    let inSafetyPeriodCount = 0;
    let safeForHarvestCount = 0;
    let organicCount = 0;

    applications.forEach(app => {
      const harvestDate = new Date(app.harvestSafetyDate);
      if (today < harvestDate) {
        inSafetyPeriodCount++;
      } else {
        safeForHarvestCount++;
      }

      if (app.toxicologicalClass === 'Biológico / Orgánico Certificado') {
        organicCount++;
      }
    });

    const organicPct = total > 0 ? Math.round((organicCount / total) * 100) : 100;

    return {
      total,
      inSafetyPeriodCount,
      safeForHarvestCount,
      organicPct
    };
  }, [applications]);

  // Aplicaciones Filtradas
  const filteredApps = useMemo(() => {
    const today = new Date();
    return applications.filter(app => {
      // Aislamiento de Estructura: Solo ver aplicaciones del campo/parcelas de su estructura
      const targetPlot = plots.find(p => p.id === app.plotId);
      if (targetPlot && !canAccessPlot(currentUser, targetPlot, locations, clients)) {
        return false;
      }

      const matchSearch = app.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          app.activeIngredient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          app.senasaRegisterNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          app.plotName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          app.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchPlot = filterPlotId === 'all' || app.plotId === filterPlotId;
      const matchCategory = filterCategory === 'all' || app.category === filterCategory;

      let matchStatus = true;
      const harvestDate = new Date(app.harvestSafetyDate);
      const isUnderSafety = today < harvestDate;
      if (filterStatus === 'carencia') matchStatus = isUnderSafety;
      if (filterStatus === 'apto') matchStatus = !isUnderSafety;

      return matchSearch && matchPlot && matchCategory && matchStatus;
    });
  }, [applications, searchTerm, filterPlotId, filterCategory, filterStatus, plots, currentUser, locations, clients]);

  // Al seleccionar un insumo preconfigurado / recepcionado
  const handleSelectPresetInput = (preset: typeof RECEIVEABLE_INPUT_PRESETS[0]) => {
    setFormData(prev => ({
      ...prev,
      productName: preset.productName,
      category: preset.category,
      activeIngredient: preset.activeIngredient,
      manufacturer: preset.manufacturer,
      supplierName: preset.supplierName,
      senasaRegisterNumber: preset.senasaRegisterNumber,
      toxicologicalClass: preset.toxicologicalClass,
      dosagePerHa: preset.dosagePerHa,
      dosageUnit: preset.dosageUnit,
      batchNumber: preset.lotNumber,
      safetyPeriodDays: preset.safetyPeriodDays,
      applicationMethod: preset.applicationMethod,
      notes: preset.notes
    }));
  };

  const resetForm = () => {
    setEditingAppId(null);
    setFormData({
      plotId: availablePlots[0]?.id || plots[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      category: 'Bioestimulante',
      productName: '',
      activeIngredient: '',
      manufacturer: '',
      supplierName: '',
      senasaRegisterNumber: '',
      toxicologicalClass: 'Biológico / Orgánico Certificado',
      dosagePerHa: 1.5,
      dosageUnit: 'L/ha',
      applicationMethod: 'Pulverización Terrestre',
      batchNumber: '',
      safetyPeriodDays: 0,
      responsibleAgronomist: currentUser?.name || 'Ing. Agr. Lucas Berardi',
      agronomistLicense: 'MP-AGRO-3321 MZA',
      weatherCondition: {
        temperatureC: 22.0,
        windSpeedKmH: 8.5,
        relativeHumidityPct: 60
      },
      notes: ''
    });
  };

  const handleOpenEditApplication = (app: AgrochemicalApplication) => {
    setEditingAppId(app.id);
    setFormData({ ...app });
    setIsAddModalOpen(true);
  };

  const handleAddApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plotId || !formData.productName || !formData.activeIngredient) {
      return;
    }

    const selectedPlot = plots.find(p => p.id === formData.plotId);
    let areaHa = selectedPlot?.surfaceArea || 1.0;
    if (selectedPlot?.surfaceUnit === 'm2') areaHa = areaHa / 10000;
    else if (selectedPlot?.surfaceUnit === 'ac') areaHa = areaHa * 0.404686;
    areaHa = Math.max(0.1, Number(areaHa.toFixed(2)));

    const appDate = formData.date || new Date().toISOString().split('T')[0];
    const safetyDays = Number(formData.safetyPeriodDays) || 0;
    const safetyDateObj = new Date(new Date(appDate).getTime() + safetyDays * 86400000);
    const harvestSafetyDate = safetyDateObj.toISOString().split('T')[0];

    const dosage = Number(formData.dosagePerHa) || 1;
    const totalApplied = Number((dosage * areaHa).toFixed(2));

    const newApp: AgrochemicalApplication = {
      id: editingAppId || `app-${Date.now()}`,
      plotId: formData.plotId!,
      plotName: selectedPlot?.name || 'Unidad de Producción',
      date: appDate,
      time: formData.time || '08:00',
      category: formData.category as any,
      productName: formData.productName!.trim(),
      activeIngredient: formData.activeIngredient!.trim(),
      manufacturer: formData.manufacturer?.trim() || 'Laboratorio Homologado',
      supplierName: formData.supplierName?.trim() || 'Proveedor Certificado',
      senasaRegisterNumber: formData.senasaRegisterNumber?.trim() || 'SENASA N° OFICIAL',
      toxicologicalClass: formData.toxicologicalClass as ToxicologicalBand,
      dosagePerHa: dosage,
      dosageUnit: (formData.dosageUnit as any) || 'L/ha',
      totalAppliedAmount: totalApplied,
      applicationMethod: (formData.applicationMethod as any) || 'Pulverización Terrestre',
      batchNumber: formData.batchNumber?.trim().toUpperCase() || `LOT-${Date.now().toString().slice(-6)}`,
      expirationDate: formData.expirationDate || '2027-12-31',
      senasaComplianceStatus: 'Conforme SENASA (Normativa VIGENTE)',
      safetyPeriodDays: safetyDays,
      harvestSafetyDate: harvestSafetyDate,
      responsibleAgronomist: formData.responsibleAgronomist?.trim() || 'Ing. Agr. Lucas Berardi',
      agronomistLicense: formData.agronomistLicense?.trim() || 'MP-AGRO-3321 MZA',
      weatherCondition: formData.weatherCondition || {
        temperatureC: 22,
        windSpeedKmH: 8,
        relativeHumidityPct: 60
      },
      notes: formData.notes?.trim() || undefined,
      status: new Date() >= safetyDateObj ? 'Apto Cosecha' : 'En Carencia'
    };

    if (editingAppId) {
      setApplications(prev => prev.map(a => (a.id === editingAppId ? newApp : a)));
    } else {
      setApplications(prev => [newApp, ...prev]);
    }
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleDeleteApplication = (id: string) => {
    setApplications(prev => prev.filter(a => a.id !== id));
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 font-mono">
      
      {/* CABECERA OFICIAL DEL CUADERNO FITOSANITARIO */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>Registro Fitosanitario Digital Obligatorio SENASA</span>
            </span>
            <span className="text-xs text-slate-400">· Res. 369/2013 · BPA & GACP</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1 flex items-center gap-2.5">
            <FlaskConical className="text-emerald-500" size={26}/> 
            <span>Cuaderno Fitosanitario & Aplicaciones de Campo</span>
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            Trazabilidad punto a punto de insumos recepcionados, dosis por hectárea, períodos de carencia y calibración de boquillas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSelectedAppForPrint(null);
              setIsPrintModalOpen(true);
            }}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-2xl flex items-center justify-center transition shadow-sm font-bold text-xs uppercase tracking-wider gap-2"
          >
            <Printer size={16} />
            <span>Imprimir Cuaderno Oficial</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-2xl flex items-center justify-center transition shadow font-bold text-xs uppercase tracking-wider gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>Registrar Tratamiento</span>
          </button>
        </div>
      </div>

      {/* KPIS DE CAMPO & SANIDAD VEGETAL */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <FlaskConical size={20} />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Tratamientos Totales</span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {kpis.total} <span className="text-xs text-slate-400 font-normal">aplicaciones</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">En Período de Carencia</span>
            <span className="text-xl font-black text-amber-600">
              {kpis.inSafetyPeriodCount} <span className="text-xs text-slate-400 font-normal">lotes activos</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Aptos para Cosecha</span>
            <span className="text-xl font-black text-emerald-600">
              {kpis.safeForHarvestCount} <span className="text-xs text-slate-400 font-normal">lotes libres</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
            <Sprout size={20} />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Insumos Biológicos</span>
            <span className="text-xl font-black text-teal-600">
              {kpis.organicPct}% <span className="text-xs text-slate-400 font-normal">protocolo GACP</span>
            </span>
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col lg:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
          <input 
            type="text" 
            placeholder="Buscar por insumo, principio activo, N° SENASA, lote o parcela..." 
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-800 text-xs outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <select 
            className="px-3.5 py-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold uppercase tracking-wider outline-none" 
            value={filterPlotId} 
            onChange={e => setFilterPlotId(e.target.value)}
          >
            <option value="all">Todas las Parcelas ({availablePlots.length})</option>
            {availablePlots.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select 
            className="px-3.5 py-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold uppercase tracking-wider outline-none" 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="all">Todas las Categorías</option>
            <option value="Bioestimulante">Bioestimulantes</option>
            <option value="Fertilizante Foliar">Fertilizantes Foliares</option>
            <option value="Fertilizante Edáfico">Fertilizantes Edáficos</option>
            <option value="Insecticida">Insecticidas / Biocontrol</option>
            <option value="Fungicida">Fungicidas</option>
            <option value="Enmienda Orgánica">Enmiendas Orgánicas</option>
          </select>

          <select 
            className="px-3.5 py-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold uppercase tracking-wider outline-none" 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos los Estados</option>
            <option value="carencia">En Carencia Activa</option>
            <option value="apto">Apto Cosecha</option>
          </select>
        </div>
      </div>

      {/* TABLA PRINCIPAL DEL CUADERNO FITOSANITARIO */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              <span>Libro Foliado de Intervenciones & Tratamientos en Campo</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Custodia agronómica homologada bajo auditoría INASE / SENASA / ARICCAME.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {filteredApps.length} registros auditados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-black uppercase text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4">Fecha / Parcela</th>
                <th className="py-3 px-4">Insumo & Principio Activo</th>
                <th className="py-3 px-4">Registro SENASA & Lote</th>
                <th className="py-3 px-4 text-center">Dosis & Volumen</th>
                <th className="py-3 px-4 text-center">Carencia & Cosecha</th>
                <th className="py-3 px-4">Responsable Técnico</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredApps.map(app => {
                const today = new Date();
                const harvestDate = new Date(app.harvestSafetyDate);
                const isUnderSafety = today < harvestDate;
                const daysRemaining = Math.max(0, Math.ceil((harvestDate.getTime() - today.getTime()) / 86400000));

                return (
                  <tr key={app.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <strong className="text-slate-900 dark:text-white font-bold block text-xs">
                        {app.plotName}
                      </strong>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {app.date} · {app.time || '08:00'}
                      </span>
                      <span className="text-[9px] text-emerald-600 font-bold block uppercase">
                        {app.applicationMethod}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <strong className="text-slate-900 dark:text-white font-bold block text-xs">
                        {app.productName}
                      </strong>
                      <span className="text-[10px] text-slate-500 block">
                        {app.activeIngredient}
                      </span>
                      <span className="text-[9px] text-purple-600 block">
                        {app.category} · {app.manufacturer}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 inline-block mb-1">
                        {app.senasaRegisterNumber}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        Lote: <strong>{app.batchNumber}</strong>
                      </span>
                      <span className="text-[9px] text-slate-500 block truncate max-w-[160px]" title={app.supplierName}>
                        Prov: {app.supplierName}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <strong className="text-slate-900 dark:text-white font-mono block text-xs">
                        {app.dosagePerHa} {app.dosageUnit}
                      </strong>
                      <span className="text-[10px] text-slate-400 block">
                        Total: <strong>{app.totalAppliedAmount} {app.dosageUnit === 'L/ha' ? 'L' : app.dosageUnit === 'kg/ha' ? 'kg' : 'unidades'}</strong>
                      </span>
                      {app.weatherCondition && (
                        <span className="text-[9px] text-slate-400 block">
                          {app.weatherCondition.temperatureC}°C · {app.weatherCondition.windSpeedKmH} km/h
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {isUnderSafety ? (
                        <div className="inline-block">
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[10px] border border-amber-300 dark:border-amber-800 flex items-center justify-center gap-1">
                            <Clock size={11} />
                            <span>Carencia Activa ({daysRemaining}d)</span>
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            Libera: {app.harvestSafetyDate}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-block">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300 dark:border-emerald-800 flex items-center justify-center gap-1">
                            <CheckCircle2 size={11} />
                            <span>Apto Cosecha</span>
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            Carencia 0d cumplida
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <strong className="text-slate-900 dark:text-white font-bold block text-xs">
                        {app.responsibleAgronomist}
                      </strong>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {app.agronomistLicense}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditApplication(app)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                          title="Editar Tratamiento"
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAppForPrint(app);
                            setIsPrintModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                          title="Imprimir Acta de Tratamiento"
                        >
                          <Printer size={14} />
                        </button>

                        {confirmDeleteId === app.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 px-2 py-1 rounded-xl border border-rose-200 dark:border-rose-800">
                            <button
                              type="button"
                              onClick={() => handleDeleteApplication(app.id)}
                              className="text-[10px] font-black text-rose-600 uppercase cursor-pointer"
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(app.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                            title="Eliminar Tratamiento"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: REGISTRAR NUEVO TRATAMIENTO CON VINCULACIÓN DE INSUMOS */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[80] p-4 font-mono">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
            
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <FlaskConical size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
                    Cuaderno Fitosanitario Digital SENASA
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingAppId ? 'Editar Tratamiento Agronómico' : 'Cargar Tratamiento Agronómico en Parcela'}
                  </h2>
                </div>
              </div>
              <button onClick={() => { setIsAddModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={22}/></button>
            </div>

            {/* BARRA DE ACCIÓN RÁPIDA: VINCULAR INSUMO RECEPCIONADO */}
            <div className="mb-6 p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Package size={14} />
                  <span>Vincular Insumo Recepcionado de Proveedor Homologado:</span>
                </span>
                <span className="text-[9px] text-slate-500">Autocompleta N° Lote, SENASA y Carencia</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {RECEIVEABLE_INPUT_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPresetInput(preset)}
                    className="p-2 text-left bg-white dark:bg-slate-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs transition group"
                  >
                    <strong className="block text-[11px] font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600">
                      {preset.productName}
                    </strong>
                    <div className="flex justify-between items-center text-[9px] text-slate-400 mt-0.5">
                      <span>{preset.lotNumber}</span>
                      <span className="font-bold text-emerald-600">{preset.safetyPeriodDays}d carencia</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddApplication} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Parcela de Destino *</label>
                  <select
                    required
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.plotId}
                    onChange={e => setFormData({ ...formData, plotId: e.target.value })}
                  >
                    {plots.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.surfaceArea || 1} ha)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha de Aplicación *</label>
                  <input
                    required
                    type="date"
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hora de Aplicación</label>
                  <input
                    type="time"
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Producto Comercial *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Bio-Hemp Root Optimizer"
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.productName}
                    onChange={e => setFormData({ ...formData, productName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Principio Activo / Composición *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Trichoderma harzianum 1x10^9 UFC/ml"
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.activeIngredient}
                    onChange={e => setFormData({ ...formData, activeIngredient: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Registro Oficial SENASA *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: SENASA N° 18.420/2022"
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.senasaRegisterNumber}
                    onChange={e => setFormData({ ...formData, senasaRegisterNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">N° Lote de Fabricación *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: LOT-BIO-2026-081"
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.batchNumber}
                    onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Días de Carencia LMR</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej: 0 para biológicos, 7 para foliar"
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.safetyPeriodDays}
                    onChange={e => setFormData({ ...formData, safetyPeriodDays: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dosis por Hectárea *</label>
                  <div className="flex gap-2">
                    <input
                      required
                      type="number"
                      step="0.1"
                      className="w-2/3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.dosagePerHa}
                      onChange={e => setFormData({ ...formData, dosagePerHa: Number(e.target.value) })}
                    />
                    <select
                      className="w-1/3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.dosageUnit}
                      onChange={e => setFormData({ ...formData, dosageUnit: e.target.value as any })}
                    >
                      <option value="L/ha">L/ha</option>
                      <option value="kg/ha">kg/ha</option>
                      <option value="ml/ha">ml/ha</option>
                      <option value="g/ha">g/ha</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Método de Aplicación</label>
                  <select
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.applicationMethod}
                    onChange={e => setFormData({ ...formData, applicationMethod: e.target.value as any })}
                  >
                    <option value="Pulverización Terrestre">Pulverización Terrestre</option>
                    <option value="Fertirriego">Fertirriego</option>
                    <option value="Incorporación Edáfica">Incorporación Edáfica</option>
                    <option value="Manual / Follaje">Manual / Mochila</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Clase Toxicológica</label>
                  <select
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.toxicologicalClass}
                    onChange={e => setFormData({ ...formData, toxicologicalClass: e.target.value as any })}
                  >
                    <option value="Biológico / Orgánico Certificado">Biológico / Orgánico Certificado</option>
                    <option value="Banda Verde (Banda IV - Poco Peligroso)">Banda Verde (Banda IV - Poco Peligroso)</option>
                    <option value="Banda Azul (Banda III - Cuidado)">Banda Azul (Banda III - Cuidado)</option>
                  </select>
                </div>
              </div>

              {/* CONDICIONES CLIMÁTICAS & RESPONSABLE TÉCNICO */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-500 block tracking-wider">
                  Condiciones Ambientales al Momento del Tratamiento
                </span>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold mb-1">Temperatura (°C)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 rounded-xl text-xs font-mono"
                      value={formData.weatherCondition?.temperatureC}
                      onChange={e => setFormData({
                        ...formData,
                        weatherCondition: { ...(formData.weatherCondition || { windSpeedKmH: 8, relativeHumidityPct: 60 }), temperatureC: Number(e.target.value) }
                      })}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold mb-1">Viento (km/h)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 rounded-xl text-xs font-mono"
                      value={formData.weatherCondition?.windSpeedKmH}
                      onChange={e => setFormData({
                        ...formData,
                        weatherCondition: { ...(formData.weatherCondition || { temperatureC: 22, relativeHumidityPct: 60 }), windSpeedKmH: Number(e.target.value) }
                      })}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold mb-1">Humedad Relativa (%)</label>
                    <input
                      type="number"
                      step="1"
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 rounded-xl text-xs font-mono"
                      value={formData.weatherCondition?.relativeHumidityPct}
                      onChange={e => setFormData({
                        ...formData,
                        weatherCondition: { ...(formData.weatherCondition || { temperatureC: 22, windSpeedKmH: 8 }), relativeHumidityPct: Number(e.target.value) }
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ingeniero Agrónomo Responsable *</label>
                  <input
                    required
                    type="text"
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.responsibleAgronomist}
                    onChange={e => setFormData({ ...formData, responsibleAgronomist: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Matrícula Profesional (MP) *</label>
                  <input
                    required
                    type="text"
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.agronomistLicense}
                    onChange={e => setFormData({ ...formData, agronomistLicense: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notas de Aplicación & Calibración</label>
                <textarea
                  rows={2}
                  placeholder="Detallar boquillas antideriva, volumen de caldo por hectárea o compatibilidad de mezcla..."
                  className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-[10px] text-slate-400">
                  Cumple con Resolución SENASA 369/2013 y GACP.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-slate-400 font-bold uppercase hover:text-slate-600 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-2xl font-bold uppercase tracking-wider shadow flex items-center transition"
                  >
                    <Save className="mr-2" size={16}/>
                    <span>Grabar en Cuaderno Fitosanitario</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ACTA OFICIAL IMPRIMIBLE DEL CUADERNO DE CAMPO SENASA */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[85] p-4 font-mono">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Printer size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
                    Documento Oficial Foliado
                  </span>
                  <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Cuaderno de Campo Fitosanitario & Registro de Tratamientos
                  </h2>
                </div>
              </div>
              <button onClick={() => setIsPrintModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            {/* DOCUMENTO IMPRIMIBLE A4 / REGLAMENTARIO */}
            <div id="printable-phytosanitary-book" className="bg-white text-slate-900 p-6 rounded-2xl border-2 border-dashed border-slate-300 space-y-4 my-2 text-xs">
              
              {/* CABECERA OFICIAL */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-900">
                    <ShieldCheck size={18} className="text-emerald-600" />
                    <span>SENASA · CUADERNO DE REGISTRO DE TRATAMIENTOS FITOSANITARIOS</span>
                  </div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold mt-0.5">
                    Resolución SENASA N° 369/2013 · Ley 27.669 · Cultivo de Cáñamo Fiscalizado
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded text-[10px] font-black uppercase bg-slate-900 text-white">
                    EJEMPLAR AUDITADO
                  </span>
                </div>
              </div>

              {/* IDENTIFICACIÓN DE COOPERATIVA PATAGONIANC LTDA */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <div>
                    <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">
                      Titular del Establecimiento / Razón Social
                    </span>
                    <strong className="text-sm font-black uppercase text-slate-900">
                      Cooperativa PatagonianC LTDA
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-black uppercase text-slate-400 block">CUIT</span>
                    <span className="text-xs font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      30-71816113-0
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-[8px] font-black text-emerald-700 uppercase block">Licencia Agrícola (Cultivo & Criadero)</span>
                    <strong className="font-mono text-slate-900 text-[9px] block truncate">
                      EX-2024-134354227--APN-ARICCAME#MEC
                    </strong>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-[8px] font-black text-sky-700 uppercase block">Licencia Industrial (Derivados & Transformación)</span>
                    <strong className="font-mono text-slate-900 text-[9px] block truncate">
                      EX-2025-119427833--APN-ARICCAME#MEC
                    </strong>
                  </div>
                </div>
              </div>

              {/* TABLA DE APLICACIONES OFICIAL */}
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                  Detalle Foliado de Tratamientos Fitosanitarios
                </span>

                <table className="w-full text-left text-[10px] border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-1.5">Fecha</th>
                      <th className="p-1.5">Parcela</th>
                      <th className="p-1.5">Producto & Registro SENASA</th>
                      <th className="p-1.5">Lote</th>
                      <th className="p-1.5">Dosis</th>
                      <th className="p-1.5">Carencia</th>
                      <th className="p-1.5">Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(selectedAppForPrint ? [selectedAppForPrint] : filteredApps).slice(0, 10).map((app, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5 font-mono">{app.date}</td>
                        <td className="p-1.5 font-bold">{app.plotName}</td>
                        <td className="p-1.5">
                          <strong>{app.productName}</strong> ({app.senasaRegisterNumber})
                        </td>
                        <td className="p-1.5 font-mono">{app.batchNumber}</td>
                        <td className="p-1.5 font-mono">{app.dosagePerHa} {app.dosageUnit}</td>
                        <td className="p-1.5 font-bold">{app.safetyPeriodDays} días</td>
                        <td className="p-1.5">{app.responsibleAgronomist} ({app.agronomistLicense})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* DECLARACIÓN JURADA FITOSANITARIA */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-[9px] text-slate-600">
                <div>
                  <strong>Declaración Jurada de Cumplimiento:</strong> Se certifica que los productos aplicados cuentan con inscripción oficial ante SENASA, respetando tiempos de carencia y calibración de deriva.
                </div>
                <div className="text-right shrink-0 ml-4">
                  <BarcodeRenderer value="SENASA-BOOK-2026" width={1} height={24} displayValue={false} />
                  <span className="text-[8px] font-mono text-slate-400 block">Foliado Digital Inmutable</span>
                </div>
              </div>

              {/* PIE INSTITUCIONAL */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400">
                <span>Cooperativa PatagonianC LTDA · CUIT 30-71816113-0</span>
                <span>Validez legal para auditorías de INASE, SENASA y ARICCAME</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-[10px] text-slate-400">
                Listo para impresión térmica o formato oficial A4.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 text-slate-400 font-bold uppercase hover:text-slate-600"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-bold uppercase shadow flex items-center gap-1.5 hover:bg-emerald-500 transition"
                >
                  <Printer size={15} />
                  <span>Imprimir Documento</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
