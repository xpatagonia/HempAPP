import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  Plot,
  SeedBatch,
  BiologicalMaterialType,
  HarvestConditioningStage
} from '../types';
import {
  calculatePlotHarvestDates,
  canUserEditPlotHarvestVariable,
  buildHarvestedOutputBatch,
  resolvePlotHarvestProfile,
  calculatePlotExpectedVsActualYield,
  printHarvestOfficialDocumentPDF,
  HARVEST_MATERIAL_CATALOG
} from '../src/services/harvestValueChainService';
import { isCentralAdminOrSupervisor } from '../src/utils/structurePermissions';
import { DateInputAr } from '../src/components/DateInputAr';
import { formatDateAr } from '../src/utils/dateFormat';
import { TraceabilityLabelModal } from '../components/TraceabilityLabelModal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Calendar,
  Sprout,
  Warehouse,
  CheckCircle2,
  SlidersHorizontal,
  Search,
  Lock,
  Unlock,
  Plus,
  ArrowRight,
  Package,
  Droplets,
  FileCheck,
  X,
  Save,
  Printer,
  QrCode,
  BarChart3,
  ClipboardList,
  ShieldCheck,
  ExternalLink,
  Scale
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CONDITIONING_STAGE_LABELS: Record<HarvestConditioningStage, string> = {
  en_cultivo: '1. En Ciclo Vegetativo',
  corte_trilla_programada: '2. Fecha de Corte Fijada',
  en_enriado_secado: '3. En Enriado / Secado',
  lote_generado_almacen: '4. En Almacén de Custodia',
  despachado_industria: '5. Despachado a Industria'
};

const MATERIAL_TYPE_LABELS: Record<Exclude<BiologicalMaterialType, 'seed'>, string> = {
  harvested_grain: 'Grano Cosechado (Alimento / Aceite)',
  fiber_bales: 'Fardos de Fibra Técnica (Enriada)',
  biomass_cbg: 'Flores / Biomasa Fitoquímica (CBG/CBD)',
  hurds: 'Cañamiza / Hurds (Bioconstrucción)'
};

export default function HarvestValueChain() {
  const {
    plots,
    locations,
    varieties,
    clients,
    seedBatches,
    storagePoints,
    currentUser,
    updatePlot,
    closePlotCycle,
    reopenPlotCycle,
    addSeedBatch
  } = useAppContext();

  const isAdmin = isCentralAdminOrSupervisor(currentUser);

  const [activeTab, setActiveTab] = useState<
    'producer_sheet' | 'schedule' | 'conditioning' | 'batches' | 'yield_charts'
  >('producer_sheet');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [selectedVarietyId, setSelectedVarietyId] = useState<string>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');

  // Estado de la Ficha Guiada Paso a Paso del Productor
  const [selectedSheetPlotId, setSelectedSheetPlotId] = useState<string>('');
  const [activeWizardStep, setActiveWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Modal de gestión rápida desde las tablas y modal de Etiqueta QR/GS1
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [modalMode, setModalMode] = useState<'date_schedule' | 'conditioning' | 'generate_batch'>('date_schedule');
  const [labelModalBatch, setLabelModalBatch] = useState<SeedBatch | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [dateForm, setDateForm] = useState({
    producerFinalHarvestDate: '',
    scheduledTime: '08:30',
    harvestDelayReason: '',
    harvestOperator: '',
    harvestMachinery: 'Cosechadora Axial / Segadora Acondicionadora',
    actualHarvestYieldKg: 0,
    confirmFinalLock: false
  });

  const [conditioningForm, setConditioningForm] = useState({
    conditioningStage: 'en_enriado_secado' as HarvestConditioningStage,
    grainMoisturePct: 8.8,
    rettingStatus: 'Óptimo (Gris plateado)' as 'Óptimo (Gris plateado)' | 'Medio (Amarillo tostado)' | 'Verde (Sin enriar)',
    harvestBaleCount: 0,
    avgBaleWeightKg: 420,
    actualHarvestYieldKg: 0,
    conditioningNotes: ''
  });

  const [batchForm, setBatchForm] = useState({
    materialType: 'harvested_grain' as Exclude<BiologicalMaterialType, 'seed'>,
    quantityKg: 250,
    harvestDateIso: '',
    storagePointId: '',
    responsibleName: '',
    moisturePct: 8.6,
    oilContentPct: 30.5,
    baleCount: 4,
    avgBaleWeightKg: 420,
    rettingQuality: 'Óptimo (Gris plateado)' as 'Óptimo (Gris plateado)' | 'Medio (Amarillo tostado)' | 'Verde (Sin enriar)',
    hplcThcPct: 0.11,
    hplcCbgPct: 2.6,
    hurdGranulometry: 'Media (5-15 mm)' as 'Fina (0-5 mm)' | 'Media (5-15 mm)' | 'Gruesa (15-25 mm)',
    notes: ''
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedbackBanner({ type, message });
    setTimeout(() => setFeedbackBanner(null), 5500);
  };

  // Enriquecer cada parcela con las 2 Variables de Fecha, Herencia Agronómica y Rinde Estimado vs. Real
  const enrichedPlots = useMemo(() => {
    return (plots || []).map(plot => {
      const variety = varieties.find(v => String(v.id) === String(plot.varietyId));
      const location = locations.find(l => String(l.id) === String(plot.locationId));
      const client = clients.find(c => String(c.id) === String(location?.clientId));
      const seedBatch = seedBatches.find(b => String(b.id) === String(plot.seedBatchId));
      const metrics = calculatePlotHarvestDates(plot, variety);
      const profile = resolvePlotHarvestProfile(plot, variety);
      const yieldSummary = calculatePlotExpectedVsActualYield(plot, variety, seedBatches);
      const editPermission = canUserEditPlotHarvestVariable(currentUser, plot, locations, clients);
      const plotHarvestedBatches = (seedBatches || []).filter(
        b => b.materialType && b.materialType !== 'seed' && String(b.originPlotId) === String(plot.id)
      );

      return {
        plot,
        variety,
        location,
        client,
        seedBatch,
        metrics,
        profile,
        yieldSummary,
        editPermission,
        plotHarvestedBatches
      };
    });
  }, [plots, varieties, locations, clients, seedBatches, currentUser]);

  const filteredPlots = useMemo(() => {
    return enrichedPlots.filter(item => {
      if (selectedLocationId !== 'all' && String(item.plot.locationId) !== selectedLocationId) {
        return false;
      }
      if (selectedVarietyId !== 'all' && String(item.plot.varietyId) !== selectedVarietyId) {
        return false;
      }
      if (selectedStageFilter !== 'all' && item.metrics.conditioningStage !== selectedStageFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchPlot = item.plot.name.toLowerCase().includes(q);
        const matchLoc = (item.location?.name || '').toLowerCase().includes(q);
        const matchVar = (item.variety?.name || '').toLowerCase().includes(q);
        const matchBatch = (item.seedBatch?.batchCode || '').toLowerCase().includes(q);
        return matchPlot || matchLoc || matchVar || matchBatch;
      }
      return true;
    });
  }, [enrichedPlots, selectedLocationId, selectedVarietyId, selectedStageFilter, searchTerm]);

  // Parcela activa en la Ficha Guiada Paso a Paso del Productor
  const activeSheetItem = useMemo(() => {
    if (enrichedPlots.length === 0) return null;
    if (selectedSheetPlotId) {
      const found = enrichedPlots.find(i => String(i.plot.id) === String(selectedSheetPlotId));
      if (found) return found;
    }
    return filteredPlots[0] || enrichedPlots[0];
  }, [enrichedPlots, filteredPlots, selectedSheetPlotId]);

  // Lotes derivados de cosecha (excluyendo semillas de siembra INASE)
  const harvestedBatches = useMemo(() => {
    return (seedBatches || []).filter(b => b.materialType && b.materialType !== 'seed');
  }, [seedBatches]);

  // Datos para Gráficas Recharts (Rinde Estimado vs Rinde Real por Parcela)
  const networkYieldChartData = useMemo(() => {
    return filteredPlots.map(item => ({
      name: item.plot.name.length > 18 ? `${item.plot.name.slice(0, 18)}…` : item.plot.name,
      fullName: item.plot.name,
      destino: item.profile.usageCategory,
      rindeEstimadoKg: Number(item.yieldSummary.totalExpectedKg.toFixed(1)),
      rindeRealKg: Number(item.yieldSummary.totalActualKg.toFixed(1)),
      eficienciaPct: item.yieldSummary.overallEfficiencyPct
    }));
  }, [filteredPlots]);

  // Datos para Gráfica Recharts de Fracciones de la Parcela Activa en la Ficha
  const activePlotFractionsChartData = useMemo(() => {
    if (!activeSheetItem) return [];
    return activeSheetItem.yieldSummary.fractions.map(f => ({
      name: f.shortLabel,
      fullLabel: f.label,
      rindeEstimadoKg: Number(f.expectedTotalKg.toFixed(2)),
      rindeRealKg: Number(f.actualHarvestedKg.toFixed(2)),
      eficienciaPct: f.efficiencyPct
    }));
  }, [activeSheetItem]);

  // Resumen de KPIs
  const summaryStats = useMemo(() => {
    const totalPlots = enrichedPlots.length;
    const avgNominalCycle =
      totalPlots > 0
        ? Math.round(enrichedPlots.reduce((acc, i) => acc + i.metrics.nominalCycleDays, 0) / totalPlots)
        : 120;
    const avgActualCycle =
      totalPlots > 0
        ? Math.round(enrichedPlots.reduce((acc, i) => acc + i.metrics.actualCycleDays, 0) / totalPlots)
        : 120;
    const customProducerCount = enrichedPlots.filter(i => i.metrics.isCustomProducerDate).length;
    const confirmedActsCount = enrichedPlots.filter(i => i.metrics.isLockedFinalAct).length;
    const totalExpectedKg = enrichedPlots.reduce(
      (acc, i) => acc + i.yieldSummary.totalExpectedKg,
      0
    );
    const totalActualKg = enrichedPlots.reduce(
      (acc, i) => acc + i.yieldSummary.totalActualKg,
      0
    );

    return {
      totalPlots,
      avgNominalCycle,
      avgActualCycle,
      customProducerCount,
      confirmedActsCount,
      totalExpectedKg,
      totalActualKg,
      harvestedBatchesCount: harvestedBatches.length,
      globalEfficiencyPct:
        totalExpectedKg > 0 ? Number(((totalActualKg / totalExpectedKg) * 100).toFixed(1)) : 0
    };
  }, [enrichedPlots, harvestedBatches]);

  const openProducerSheetForPlot = (plot: Plot, step: 1 | 2 | 3 | 4 | 5 = 1) => {
    setSelectedSheetPlotId(plot.id);
    setActiveWizardStep(step);
    setActiveTab('producer_sheet');
  };

  const openDateModal = (plot: Plot) => {
    const variety = varieties.find(v => String(v.id) === String(plot.varietyId));
    const metrics = calculatePlotHarvestDates(plot, variety);
    const yieldSummary = calculatePlotExpectedVsActualYield(plot, variety, seedBatches);
    setEditingPlot(plot);
    setModalMode('date_schedule');
    setDateForm({
      producerFinalHarvestDate: metrics.producerFinalHarvestDate,
      scheduledTime: plot.scheduledHarvestTime || plot.closedTime || '08:30',
      harvestDelayReason:
        plot.harvestDelayReason ||
        'Ajuste operativo de fecha final en campo según madurez fisiológica y ventana climática.',
      harvestOperator: plot.harvestOperator || plot.sowingResponsibleName || currentUser?.name || '',
      harvestMachinery: plot.harvestMachinery || 'Cosechadora Axial / Segadora Acondicionadora',
      actualHarvestYieldKg: Number(
        plot.actualHarvestYieldKg || plot.harvestYieldKg || yieldSummary.totalExpectedKg.toFixed(1)
      ),
      confirmFinalLock: false
    });
  };

  const openConditioningModal = (plot: Plot) => {
    const variety = varieties.find(v => String(v.id) === String(plot.varietyId));
    const metrics = calculatePlotHarvestDates(plot, variety);
    const yieldSummary = calculatePlotExpectedVsActualYield(plot, variety, seedBatches);
    setEditingPlot(plot);
    setModalMode('conditioning');
    setConditioningForm({
      conditioningStage:
        metrics.conditioningStage === 'en_cultivo' ? 'en_enriado_secado' : metrics.conditioningStage,
      grainMoisturePct: plot.grainMoisturePct ?? 8.8,
      rettingStatus: plot.rettingStatus || 'Óptimo (Gris plateado)',
      harvestBaleCount: plot.harvestBaleCount ?? 2,
      avgBaleWeightKg: plot.avgBaleWeightKg ?? 420,
      actualHarvestYieldKg: Number(
        plot.actualHarvestYieldKg || plot.harvestYieldKg || yieldSummary.totalExpectedKg.toFixed(1)
      ),
      conditioningNotes:
        plot.conditioningNotes ||
        'Control de humedad de grano y monitoreo de enriado de fibra en andana.'
    });
  };

  const openGenerateBatchModal = (
    plot: Plot,
    preferredMaterial?: Exclude<BiologicalMaterialType, 'seed'>
  ) => {
    const variety = varieties.find(v => String(v.id) === String(plot.varietyId));
    const metrics = calculatePlotHarvestDates(plot, variety);
    const profile = resolvePlotHarvestProfile(plot, variety);
    const yieldSummary = calculatePlotExpectedVsActualYield(plot, variety, seedBatches);
    const parentLoc = locations.find(l => String(l.id) === String(plot.locationId));
    const defaultStorage =
      storagePoints.find(sp => String(sp.clientId) === String(parentLoc?.clientId)) ||
      storagePoints[0];

    const materialToUse = preferredMaterial || profile.primaryMaterialType;
    const fractionInfo = yieldSummary.fractions.find(f => f.materialType === materialToUse);
    const defaultKg = fractionInfo
      ? Number(fractionInfo.expectedTotalKg.toFixed(1))
      : Number(plot.actualHarvestYieldKg || plot.harvestYieldKg || 250);

    setEditingPlot(plot);
    setModalMode('generate_batch');
    setBatchForm({
      materialType: materialToUse,
      quantityKg: defaultKg > 0 ? defaultKg : 120,
      harvestDateIso: metrics.producerFinalHarvestDate,
      storagePointId: plot.harvestStoragePointId || defaultStorage?.id || '',
      responsibleName: plot.harvestOperator || plot.sowingResponsibleName || currentUser?.name || '',
      moisturePct: plot.grainMoisturePct ?? 8.6,
      oilContentPct: 30.5,
      baleCount: plot.harvestBaleCount ?? 4,
      avgBaleWeightKg: plot.avgBaleWeightKg ?? 420,
      rettingQuality: plot.rettingStatus || 'Óptimo (Gris plateado)',
      hplcThcPct: variety?.expectedThc ?? 0.12,
      hplcCbgPct: variety?.expectedCbg ?? 2.4,
      hurdGranulometry: 'Media (5-15 mm)',
      notes: `Obtenido en parcela ${plot.name} (${profile.harvestTargetLabel} · Siembra: ${formatDateAr(plot.sowingDate)} · Cosecha Final Productor: ${formatDateAr(metrics.producerFinalHarvestDate)}).`
    });
  };

  const handlePrintOfficialDoc = (
    item: (typeof enrichedPlots)[number],
    mode: 'harvest_act' | 'ariccame_affidavit'
  ) => {
    const storagePoint =
      storagePoints.find(sp => String(sp.id) === String(item.plot.harvestStoragePointId)) ||
      storagePoints.find(sp => String(sp.clientId) === String(item.location?.clientId)) ||
      storagePoints[0];

    printHarvestOfficialDocumentPDF({
      mode,
      plot: item.plot,
      variety: item.variety,
      location: item.location,
      client: item.client,
      seedBatch: item.seedBatch,
      storagePoint,
      harvestedBatches: item.plotHarvestedBatches,
      yieldSummary: item.yieldSummary,
      scheduleMetrics: item.metrics
    });
  };

  const handleSaveProducerDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlot) return;

    const perm = canUserEditPlotHarvestVariable(currentUser, editingPlot, locations, clients);
    if (!perm.allowed) {
      showNotification('error', perm.reason || 'No tiene permisos para modificar esta parcela.');
      return;
    }

    if (dateForm.producerFinalHarvestDate < editingPlot.sowingDate) {
      showNotification(
        'error',
        `La Fecha Final de Cosecha (${formatDateAr(dateForm.producerFinalHarvestDate)}) no puede ser anterior a la Fecha de Siembra (${formatDateAr(editingPlot.sowingDate)}).`
      );
      return;
    }

    setIsSaving(true);
    try {
      const variety = varieties.find(v => String(v.id) === String(editingPlot.varietyId));
      const baseMetrics = calculatePlotHarvestDates(editingPlot, variety);

      if (dateForm.confirmFinalLock) {
        await closePlotCycle(editingPlot.id, {
          mode: 'confirm',
          closedDate: dateForm.producerFinalHarvestDate,
          closedTime: dateForm.scheduledTime,
          operatorName: dateForm.harvestOperator,
          machinery: dateForm.harvestMachinery,
          harvestYieldKg: Number(dateForm.actualHarvestYieldKg || 0),
          notes: dateForm.harvestDelayReason
        });
        showNotification(
          'success',
          `Acta Final de Cosecha confirmada para ${editingPlot.name} con Fecha Final ${formatDateAr(dateForm.producerFinalHarvestDate)}.`
        );
      } else {
        const updatedPlot: Plot = {
          ...editingPlot,
          geneticEstimatedHarvestDate: baseMetrics.geneticEstimatedHarvestDate,
          producerFinalHarvestDate: dateForm.producerFinalHarvestDate,
          scheduledHarvestDate: dateForm.producerFinalHarvestDate,
          scheduledHarvestTime: dateForm.scheduledTime,
          isHarvestScheduled: true,
          harvestDelayReason: dateForm.harvestDelayReason,
          harvestOperator: dateForm.harvestOperator,
          harvestMachinery: dateForm.harvestMachinery,
          actualHarvestYieldKg:
            dateForm.actualHarvestYieldKg > 0
              ? Number(dateForm.actualHarvestYieldKg)
              : editingPlot.actualHarvestYieldKg,
          harvestYieldKg:
            dateForm.actualHarvestYieldKg > 0
              ? Number(dateForm.actualHarvestYieldKg)
              : editingPlot.harvestYieldKg,
          conditioningStage:
            editingPlot.conditioningStage && editingPlot.conditioningStage !== 'en_cultivo'
              ? editingPlot.conditioningStage
              : 'corte_trilla_programada'
        };
        await updatePlot(updatedPlot);
        showNotification(
          'success',
          `Fecha Final de Cosecha en Campo actualizada por el Productor para ${editingPlot.name}: ${formatDateAr(dateForm.producerFinalHarvestDate)}.`
        );
      }
      setEditingPlot(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveConditioning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlot) return;

    const perm = canUserEditPlotHarvestVariable(currentUser, editingPlot, locations, clients);
    if (!perm.allowed) {
      showNotification('error', perm.reason || 'Sin permisos para actualizar acondicionamiento.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedPlot: Plot = {
        ...editingPlot,
        conditioningStage: conditioningForm.conditioningStage,
        grainMoisturePct: Number(conditioningForm.grainMoisturePct),
        rettingStatus: conditioningForm.rettingStatus,
        harvestBaleCount: Number(conditioningForm.harvestBaleCount),
        avgBaleWeightKg: Number(conditioningForm.avgBaleWeightKg),
        actualHarvestYieldKg: Number(conditioningForm.actualHarvestYieldKg),
        harvestYieldKg: Number(conditioningForm.actualHarvestYieldKg),
        conditioningNotes: conditioningForm.conditioningNotes
      };
      await updatePlot(updatedPlot);
      showNotification(
        'success',
        `Acondicionamiento primario y rinde real actualizados en ${editingPlot.name} (${CONDITIONING_STAGE_LABELS[conditioningForm.conditioningStage]}).`
      );
      setEditingPlot(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateOutputBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlot) return;

    const variety = varieties.find(v => String(v.id) === String(editingPlot.varietyId));
    setIsSaving(true);
    try {
      const newBatch = buildHarvestedOutputBatch({
        plot: editingPlot,
        variety,
        materialType: batchForm.materialType,
        quantityKg: Number(batchForm.quantityKg),
        harvestDateIso: batchForm.harvestDateIso,
        storagePointId: batchForm.storagePointId,
        responsibleName: batchForm.responsibleName || currentUser?.name || 'Productor Red',
        moisturePct: Number(batchForm.moisturePct),
        oilContentPct: Number(batchForm.oilContentPct),
        baleCount: Number(batchForm.baleCount),
        avgBaleWeightKg: Number(batchForm.avgBaleWeightKg),
        rettingQuality: batchForm.rettingQuality,
        hplcThcPct: Number(batchForm.hplcThcPct),
        hplcCbgPct: Number(batchForm.hplcCbgPct),
        hurdGranulometry: batchForm.hurdGranulometry,
        notes: batchForm.notes
      });

      await addSeedBatch(newBatch);

      const nextOutputIds = Array.from(
        new Set([...(editingPlot.outputSeedBatchIds || []), newBatch.id])
      );
      await updatePlot({
        ...editingPlot,
        producerFinalHarvestDate: batchForm.harvestDateIso,
        conditioningStage: 'lote_generado_almacen',
        harvestStoragePointId: batchForm.storagePointId,
        actualHarvestYieldKg:
          Number(editingPlot.actualHarvestYieldKg || 0) > 0
            ? editingPlot.actualHarvestYieldKg
            : Number(batchForm.quantityKg),
        outputSeedBatchIds: nextOutputIds
      });

      showNotification(
        'success',
        `Lote cosechado ${newBatch.batchCode} (${Number(batchForm.quantityKg).toFixed(2)} kg) generado con éxito. Se habilitó su Etiqueta QR/GS1 y trazabilidad ARICCAME.`
      );
      setEditingPlot(null);
      setLabelModalBatch(newBatch);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Encabezado Principal */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Trazabilidad &amp; Campo</span>
              <span aria-hidden="true">·</span>
              <span>Ficha Guiada del Productor</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">Ley 27.669 ARICCAME / INASE</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Cosecha &amp; Cadena de Valor
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
              Ficha paso a paso del Productor con herencia automática del destino de cosecha de la parcela (<strong>Grano, Fibra, Flores/Biomasa o Doble Propósito</strong>), manejo de la <strong>Doble Variable de Fecha de Cosecha</strong>, gráficas de <strong>Rinde Estimado vs. Real</strong>, <strong>Acta Oficial de Cosecha</strong> y emisión de <strong>Etiquetas QR + Documentación ARICCAME</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              to="/seed-batches"
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap"
            >
              Semillas INASE (Origen)
            </Link>
            <Link
              to="/storage"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap"
            >
              <Warehouse size={14} />
              <span>Almacenes de Custodia</span>
            </Link>
          </div>
        </div>

        {/* Selector Principal de Vistas */}
        <div className="flex items-center gap-1.5 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
          <span className="text-xs font-medium text-slate-400 mr-2 shrink-0 flex items-center gap-1">
            <SlidersHorizontal size={13} /> Vista Operativa:
          </span>
          {(
            [
              {
                id: 'producer_sheet' as const,
                label: 'Ficha Paso a Paso del Productor (5 Etapas)',
                icon: ClipboardList
              },
              {
                id: 'schedule' as const,
                label: `01. Doble Fecha de Cosecha (${enrichedPlots.length})`,
                icon: Calendar
              },
              {
                id: 'conditioning' as const,
                label: '02. Acondicionamiento & Rindes',
                icon: Droplets
              },
              {
                id: 'yield_charts' as const,
                label: '03. Gráficas de Rinde Estimado vs. Real',
                icon: BarChart3
              },
              {
                id: 'batches' as const,
                label: `04. Lotes Cosechados & Etiquetas ARICCAME (${harvestedBatches.length})`,
                icon: QrCode
              }
            ]
          ).map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {feedbackBanner && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <span>{feedbackBanner.message}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-current opacity-70 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Banda de KPIs con Figuras Tabulares */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Parcelas en Cosecha &amp; Actas</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {summaryStats.totalPlots} parcelas
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {summaryStats.customProducerCount} con Fecha Productor · {summaryStats.confirmedActsCount} con Acta cerrada
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Variable 1 vs. Variable 2 (Ciclo Medio)</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {summaryStats.avgNominalCycle} d ➔ {summaryStats.avgActualCycle} d
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            Diferencial medio: {summaryStats.avgActualCycle - summaryStats.avgNominalCycle >= 0 ? '+' : ''}
            {summaryStats.avgActualCycle - summaryStats.avgNominalCycle} d en campo
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Rinde Estimado Total (Genética x Sup.)</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-1">
            {summaryStats.totalExpectedKg.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            Proyección agronómica según superficie sembrada
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Rinde Real Cosechado &amp; Eficiencia</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {summaryStats.totalActualKg.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            Eficiencia: {summaryStats.globalEfficiencyPct}% · {summaryStats.harvestedBatchesCount} lotes con QR ARICCAME
          </p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VISTA PRINCIPAL: FICHA GUIADA PASO A PASO DEL PRODUCTOR (5 ETAPAS)    */}
      {/* ===================================================================== */}
      {activeTab === 'producer_sheet' && activeSheetItem && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Selector de Parcela de la Ficha del Productor */}
          <div className="p-5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Ficha Operativa Guiada del Productor · Paso a Paso de Cosecha y Trazabilidad ARICCAME
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {activeSheetItem.plot.name} — {activeSheetItem.location?.name || 'Establecimiento'} ({activeSheetItem.variety?.name || 'Genética'})
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Seleccionar Parcela del Productor:
              </label>
              <select
                value={activeSheetItem.plot.id}
                onChange={e => setSelectedSheetPlotId(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 cursor-pointer"
              >
                {enrichedPlots.map(item => (
                  <option key={item.plot.id} value={item.plot.id}>
                    {item.plot.name} · {item.location?.name} · {item.variety?.name} ({item.profile.usageCategory})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Barra de Progreso de los 5 Pasos */}
          <div className="grid grid-cols-1 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {(
              [
                {
                  step: 1 as const,
                  title: 'Paso 1 · Destino de Parcela',
                  subtitle: 'Grano, Fibra, Flores o Dual'
                },
                {
                  step: 2 as const,
                  title: 'Paso 2 · Doble Fecha Cosecha',
                  subtitle: 'Ciclo Genético vs. Productor'
                },
                {
                  step: 3 as const,
                  title: 'Paso 3 · Gráficas de Rindes',
                  subtitle: 'Estimado vs. Real Obtenido'
                },
                {
                  step: 4 as const,
                  title: 'Paso 4 · Acta de Cosecha',
                  subtitle: 'Emisión y Firma A4 Oficial'
                },
                {
                  step: 5 as const,
                  title: 'Paso 5 · Etiquetas ARICCAME',
                  subtitle: 'QR + GS1 y DDJJ Ley 27.669'
                }
              ]
            ).map(s => {
              const isCurrent = activeWizardStep === s.step;
              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setActiveWizardStep(s.step)}
                  className={`p-3.5 text-left transition cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-b-2 border-b-emerald-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isCurrent
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {s.title}
                    </span>
                    <span
                      className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
                        isCurrent
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {s.step}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {s.subtitle}
                  </p>
                </button>
              );
            })}
          </div>

          {/* CONTENIDO DEL PASO ACTIVO DE LA FICHA DEL PRODUCTOR */}
          <div className="p-6 space-y-6">
            {/* PASO 1: HERENCIA AGRONÓMICA Y DESTINO PRODUCTIVO DE LA PARCELA */}
            {activeWizardStep === 1 && (
              <div className="space-y-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      Paso 1 de 5 · Información Heredada de la Parcela y Genética Sembrada
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      ¿Qué se cosecha en {activeSheetItem.plot.name}? ➔ {activeSheetItem.profile.harvestTargetLabel}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      El sistema trae automáticamente desde la parcela sembrada y su cultivar ({activeSheetItem.variety?.name}) el destino productivo, la superficie efectiva y las fracciones de cosecha habilitadas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveWizardStep(2)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    <span>Avanzar al Paso 2 (Fechas de Cosecha)</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* Tarjetas de Herencia de la Parcela */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      1. Parcela y Superficie Sembrada
                    </span>
                    <strong className="text-base font-bold text-slate-900 dark:text-white block mt-1">
                      {activeSheetItem.plot.name}
                    </strong>
                    <span className="text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold block mt-1">
                      {activeSheetItem.plot.surfaceArea} {activeSheetItem.plot.surfaceUnit || 'm2'} ({activeSheetItem.profile.surfaceHa.toFixed(4)} ha)
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Densidad: {activeSheetItem.plot.density || 250} pl/m² · {activeSheetItem.location?.name}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      2. Genética y Propósito Agronómico
                    </span>
                    <strong className="text-base font-bold text-slate-900 dark:text-white block mt-1">
                      {activeSheetItem.variety?.name || 'Genética Homologada'}
                    </strong>
                    <span className="text-xs font-semibold text-sky-700 dark:text-sky-400 block mt-1">
                      Propósito: {activeSheetItem.profile.usageCategory}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Ciclo nominal: {activeSheetItem.metrics.nominalCycleDays} días · THC &lt; 0.3%
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      3. Lote de Semilla Madre (INASE)
                    </span>
                    <strong className="text-base font-bold font-mono text-slate-900 dark:text-white block mt-1">
                      {activeSheetItem.seedBatch?.batchCode || 'LOTE-INASE-2526'}
                    </strong>
                    <span className="text-xs text-slate-600 dark:text-slate-300 block mt-1">
                      Rótulo: {activeSheetItem.seedBatch?.labelSerialNumber || 'Serie Oficial INASE'}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Fecha Siembra: {formatDateAr(activeSheetItem.plot.sowingDate)}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">
                      4. Fracciones que se Cosechan en la Parcela
                    </span>
                    <div className="space-y-1.5 mt-2">
                      {activeSheetItem.yieldSummary.fractions.map(frac => (
                        <div
                          key={frac.materialType}
                          className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/70"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {frac.shortLabel}
                          </span>
                          <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                            Est: {frac.expectedTotalKg.toFixed(1)} kg
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 2: DOBLE VARIABLE DE FECHA DE COSECHA Y ACONDICIONAMIENTO */}
            {activeWizardStep === 2 && (
              <div className="space-y-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      Paso 2 de 5 · Doble Variable de Fecha de Cosecha y Acondicionamiento en Campo
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      Variable 1 (Ciclo Genético) vs. Variable 2 (Fecha Final del Productor en Campo)
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveWizardStep(1)}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveWizardStep(3)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Avanzar al Paso 3 (Gráficas de Rinde)</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Variable 1 */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                      Variable 1 · Fecha Estimada (Ciclo Genético)
                    </span>
                    <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                      {formatDateAr(activeSheetItem.metrics.geneticEstimatedHarvestDate)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                      Siembra ({formatDateAr(activeSheetItem.metrics.sowingDate)}) + {activeSheetItem.metrics.nominalCycleDays} días ({activeSheetItem.variety?.name})
                    </p>
                  </div>

                  {/* Variable 2 */}
                  <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        Variable 2 · Fecha Final en Campo (Productor)
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {activeSheetItem.metrics.deltaLabel}
                      </span>
                    </div>
                    <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
                      {formatDateAr(activeSheetItem.metrics.producerFinalHarvestDate)}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Ciclo real: <strong>{activeSheetItem.metrics.actualCycleDays} días</strong> · Operador: {activeSheetItem.plot.harvestOperator || activeSheetItem.plot.sowingResponsibleName || 'Productor'}
                    </p>
                    {activeSheetItem.editPermission.allowed && (
                      <button
                        type="button"
                        onClick={() => openDateModal(activeSheetItem.plot)}
                        className="mt-3 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        Modificar Fecha Final del Productor
                      </button>
                    )}
                  </div>

                  {/* Estado de Acondicionamiento */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                      Acondicionamiento Primario y Pesaje en Campo
                    </span>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {CONDITIONING_STAGE_LABELS[activeSheetItem.metrics.conditioningStage]}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-mono tabular-nums">
                      Humedad Grano: {activeSheetItem.plot.grainMoisturePct ?? 8.8}% · Enriado: {activeSheetItem.plot.rettingStatus || 'Óptimo'}
                    </p>
                    {activeSheetItem.editPermission.allowed && (
                      <button
                        type="button"
                        onClick={() => openConditioningModal(activeSheetItem.plot)}
                        className="mt-3 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold transition cursor-pointer"
                      >
                        Registrar Acondicionamiento y Rinde Real
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PASO 3: GRÁFICAS DE RINDE ESTIMADO VS. RINDE REAL OBTENIDO */}
            {activeWizardStep === 3 && (
              <div className="space-y-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      Paso 3 de 5 · Gráficas Agronómicas de Rindes Estimados vs. Rindes Reales Obtenidos
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      Comparativa de Rinde para {activeSheetItem.plot.name} ({activeSheetItem.plot.surfaceArea} {activeSheetItem.plot.surfaceUnit || 'm2'})
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveWizardStep(2)}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveWizardStep(4)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Avanzar al Paso 4 (Acta Oficial de Cosecha)</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Gráfica de Barras de la Parcela Seleccionada */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Rinde Estimado vs. Rinde Real por Fracción ({activeSheetItem.plot.name})
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Eficiencia Global: {activeSheetItem.yieldSummary.overallEfficiencyPct}%
                      </span>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activePlotFractionsChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.4} />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} unit=" kg" />
                          <Tooltip
                            formatter={(val: any) => [`${Number(val).toFixed(2)} kg`, 'Masa']}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar
                            dataKey="rindeEstimadoKg"
                            name="Rinde Estimado (Genética)"
                            fill="#0284c7"
                            radius={[6, 6, 0, 0]}
                          />
                          <Bar
                            dataKey="rindeRealKg"
                            name="Rinde Real Obtenido (Campo)"
                            fill="#059669"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Tabla de Desglose por Fracción de Cosecha */}
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <h4 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-3">
                        Desglose Técnico por Fracción Cosechable
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                              <th className="py-2 pr-2">Fracción</th>
                              <th className="py-2 px-2">Rinde Ref. (kg/ha)</th>
                              <th className="py-2 px-2">Estimado Parcela</th>
                              <th className="py-2 px-2">Real Cosechado</th>
                              <th className="py-2 pl-2 text-right">Eficiencia</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
                            {activeSheetItem.yieldSummary.fractions.map(f => (
                              <tr key={f.materialType}>
                                <td className="py-2.5 pr-2 font-sans font-semibold text-slate-900 dark:text-white">
                                  {f.shortLabel}
                                </td>
                                <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">
                                  {f.expectedKgPerHa.toLocaleString('es-AR')} kg/ha
                                </td>
                                <td className="py-2.5 px-2 font-semibold text-sky-700 dark:text-sky-400">
                                  {f.expectedTotalKg.toFixed(2)} kg
                                </td>
                                <td className="py-2.5 px-2 font-bold text-emerald-700 dark:text-emerald-400">
                                  {f.actualHarvestedKg.toFixed(2)} kg
                                </td>
                                <td className="py-2.5 pl-2 text-right font-bold">
                                  {f.efficiencyPct}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {activeSheetItem.editPermission.allowed && (
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs">
                        <span className="text-slate-700 dark:text-slate-200">
                          ¿Desea actualizar los kilogramos reales obtenidos en la balanza de campo?
                        </span>
                        <button
                          type="button"
                          onClick={() => openConditioningModal(activeSheetItem.plot)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                        >
                          Actualizar Pesaje Real (kg)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PASO 4: ACTA OFICIAL DE COSECHA (PDF HOMOLOGADO) */}
            {activeWizardStep === 4 && (
              <div className="space-y-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      Paso 4 de 5 · Emisión y Firma del Acta Oficial de Cosecha
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      Acta Oficial de Cosecha N° {activeSheetItem.yieldSummary.harvestActCode}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveWizardStep(3)}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveWizardStep(5)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Avanzar al Paso 5 (Etiquetas y DDJJ ARICCAME)</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 block">
                        DOCUMENTO AUDITADO DE CAMPO · CÓDIGO GS1: {activeSheetItem.yieldSummary.barcodeGs1}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        Resumen del Acta Oficial de Cosecha — {activeSheetItem.plot.name}
                      </h4>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-bold ${
                        activeSheetItem.metrics.isLockedFinalAct
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {activeSheetItem.metrics.isLockedFinalAct
                        ? 'Acta de Cosecha Cerrada y Firmada'
                        : 'Acta Abierta (Pendiente de Cierre Definitivo)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block">Fecha Base de Siembra</span>
                      <strong className="font-mono text-slate-900 dark:text-white text-sm">
                        {formatDateAr(activeSheetItem.metrics.sowingDate)}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block">Variable 1 (Estimada Genética)</span>
                      <strong className="font-mono text-sky-700 dark:text-sky-400 text-sm">
                        {formatDateAr(activeSheetItem.metrics.geneticEstimatedHarvestDate)}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block">Variable 2 (Fecha Final Productor)</span>
                      <strong className="font-mono text-emerald-700 dark:text-emerald-400 text-sm">
                        {formatDateAr(activeSheetItem.metrics.producerFinalHarvestDate)}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block">Rinde Estimado vs. Real</span>
                      <strong className="font-mono text-slate-900 dark:text-white text-sm">
                        {activeSheetItem.yieldSummary.totalExpectedKg.toFixed(1)} kg ➔ {activeSheetItem.yieldSummary.totalActualKg.toFixed(1)} kg
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handlePrintOfficialDoc(activeSheetItem, 'harvest_act')}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Printer size={15} />
                      <span>Imprimir / Descargar Acta Oficial de Cosecha (PDF A4)</span>
                    </button>

                    {activeSheetItem.editPermission.allowed && (
                      <button
                        type="button"
                        onClick={() => openDateModal(activeSheetItem.plot)}
                        className="px-4 py-2.5 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <FileCheck size={15} />
                        <span>Editar Datos / Confirmar Cierre de Acta</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PASO 5: ETIQUETAS OFICIALES DE COSECHA (QR + GS1) Y DOCUMENTACIÓN ARICCAME */}
            {activeWizardStep === 5 && (
              <div className="space-y-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      Paso 5 de 5 · Trazabilidad Post-Cosecha, Etiquetas QR/GS1 y Exigencia ARICCAME Ley 27.669
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      Emisión de Etiquetas de Cosecha y Declaración Jurada ARICCAME — {activeSheetItem.plot.name}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveWizardStep(4)}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintOfficialDoc(activeSheetItem, 'ariccame_affidavit')}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck size={14} />
                      <span>Descargar DDJJ Cosecha y Custodia ARICCAME (PDF)</span>
                    </button>
                  </div>
                </div>

                {/* Botones rápidos para generar Lote por cada fracción heredada de la parcela */}
                {activeSheetItem.editPermission.allowed && (
                  <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                        Generar Nuevo Lote Trazado de Salida para Etiquetado Oficial
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">
                        Seleccione la fracción cosechada de {activeSheetItem.plot.name} para emitir su código de lote y su etiqueta QR + GS1:
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {activeSheetItem.profile.allowedMaterialTypes.map(mat => (
                        <button
                          key={mat}
                          type="button"
                          onClick={() => openGenerateBatchModal(activeSheetItem.plot, mat)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>+ Lote {HARVEST_MATERIAL_CATALOG[mat].shortLabel}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Listado de Lotes Cosechados de esta Parcela con Botón de Etiqueta QR + GS1 */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Lotes de Cosecha Generados en {activeSheetItem.plot.name} ({activeSheetItem.plotHarvestedBatches.length})
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Acta Vinculada: {activeSheetItem.yieldSummary.harvestActCode}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                          <th className="py-2.5 px-4">Código Lote Cosecha</th>
                          <th className="py-2.5 px-4">Fracción / Material</th>
                          <th className="py-2.5 px-4">Fecha Final Productor</th>
                          <th className="py-2.5 px-4">Masa Neta (kg)</th>
                          <th className="py-2.5 px-4">Rótulo / Serie ARICCAME</th>
                          <th className="py-2.5 px-4 text-right">Etiqueta QR &amp; Pasaporte</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activeSheetItem.plotHarvestedBatches.map(b => (
                          <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                              {b.batchCode}
                            </td>
                            <td className="py-3 px-4 font-medium text-emerald-700 dark:text-emerald-400">
                              {b.materialType && b.materialType !== 'seed'
                                ? MATERIAL_TYPE_LABELS[b.materialType]
                                : 'Material Cosechado'}
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums">
                              {formatDateAr(b.harvestDate || b.purchaseDate)}
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums font-bold">
                              {Number(b.initialQuantity || 0).toLocaleString('es-AR')} kg
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              {b.labelSerialNumber || b.certificationNumber || 'SERIE-OFICIAL'}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setLabelModalBatch(b)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <QrCode size={13} />
                                  <span>Emitir Etiqueta QR / GS1</span>
                                </button>
                                <Link
                                  to={`/trace/${encodeURIComponent(b.id)}`}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1"
                                >
                                  <ExternalLink size={12} />
                                  <span>Pasaporte</span>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {activeSheetItem.plotHarvestedBatches.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-500">
                              Aún no se emitieron lotes de salida para esta parcela. Utilice los botones superiores para generar el lote y emitir su etiqueta oficial ARICCAME.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controles de Filtro para las Tablas y Gráficas */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por código de parcela, establecimiento, variedad genética o lote INASE..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedLocationId}
            onChange={e => setSelectedLocationId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">Todos los Establecimientos ({locations.length})</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.city})
              </option>
            ))}
          </select>

          <select
            value={selectedVarietyId}
            onChange={e => setSelectedVarietyId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">Todas las Genéticas ({varieties.length})</option>
            {varieties.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} (Ciclo {v.cycleDays} d · {v.usage})
              </option>
            ))}
          </select>

          <select
            value={selectedStageFilter}
            onChange={e => setSelectedStageFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">Todas las Etapas de Cosecha</option>
            {Object.entries(CONDITIONING_STAGE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ESLABÓN 1: TABLERO DE DOBLE VARIABLE DE FECHA DE COSECHA */}
      {activeTab === 'schedule' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                01. Matriz de Cosecha por Parcela: Destino Heredado, Variable 1 (Genética) vs. Variable 2 (Productor)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cada parcela informa qué se cosecha según su genética (Grano, Fibra, Flores/Biomasa), su fecha estimada por ciclo y la fecha final definida por el Productor.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
              Mostrando {filteredPlots.length} de {enrichedPlots.length} parcelas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Parcela &amp; Establecimiento</th>
                  <th className="py-3 px-4">Genética &amp; Qué se Cosecha</th>
                  <th className="py-3 px-4">Fecha Base Siembra</th>
                  <th className="py-3 px-4">Variable 1 · Estimada (Genética)</th>
                  <th className="py-3 px-4">Variable 2 · Fecha Final (Productor)</th>
                  <th className="py-3 px-4">Rinde Estimado vs. Real</th>
                  <th className="py-3 px-4 text-right">Ficha &amp; Documentación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
                {filteredPlots.map(item => {
                  const { plot, variety, location, metrics, profile, yieldSummary, editPermission } = item;
                  return (
                    <tr
                      key={plot.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {plot.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {location?.name || 'Establecimiento'} ·{' '}
                          <span className="font-mono tabular-nums">
                            {plot.surfaceArea} {plot.surfaceUnit || 'm2'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {variety?.name || 'Genética'} ({profile.usageCategory})
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          {profile.harvestTargetLabel}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div>{formatDateAr(metrics.sowingDate)}</div>
                        <div className="text-[11px] text-slate-400">
                          Ciclo: {metrics.nominalCycleDays} d
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                          {formatDateAr(metrics.geneticEstimatedHarvestDate)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          Siembra + {metrics.nominalCycleDays} días
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                            {formatDateAr(metrics.producerFinalHarvestDate)}
                          </span>
                          {metrics.isLockedFinalAct && (
                            <span title="Acta Final de Cosecha confirmada">
                              <Lock size={12} className="text-amber-600 dark:text-amber-400" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {metrics.deltaLabel}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono tabular-nums">
                        <div className="text-slate-800 dark:text-slate-200">
                          Est: <strong>{yieldSummary.totalExpectedKg.toFixed(1)} kg</strong>
                        </div>
                        <div className="text-emerald-700 dark:text-emerald-400 font-semibold">
                          Real: {yieldSummary.totalActualKg.toFixed(1)} kg ({yieldSummary.overallEfficiencyPct}%)
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openProducerSheetForPlot(plot, 1)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
                          >
                            Ficha Paso a Paso
                          </button>

                          {editPermission.allowed && (
                            <button
                              type="button"
                              onClick={() => openDateModal(plot)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                            >
                              Fecha Productor
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handlePrintOfficialDoc(item, 'harvest_act')}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            title="Emitir Acta Oficial de Cosecha en PDF"
                          >
                            <Printer size={12} />
                            <span>Acta PDF</span>
                          </button>

                          {metrics.isLockedFinalAct && isAdmin && (
                            <button
                              type="button"
                              onClick={async () => {
                                await reopenPlotCycle(plot.id);
                                showNotification(
                                  'success',
                                  `Acta de cosecha reabierta por Administrador para ${plot.name}.`
                                );
                              }}
                              className="px-2 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Unlock size={12} /> Reabrir
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
      )}

      {/* ESLABÓN 2: ACONDICIONAMIENTO PRIMARIO EN CAMPO */}
      {activeTab === 'conditioning' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              02. Acondicionamiento Primario en Campo: Enriado de Fibra, Secado de Grano y Pesaje Real
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Registre humedad de grano (&lt;9%), estado de enriado de fibra, fardos y rinde bruto real obtenido en cada parcela.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Parcela &amp; Destino</th>
                  <th className="py-3 px-4">Fecha Final Productor</th>
                  <th className="py-3 px-4">Humedad Grano (%)</th>
                  <th className="py-3 px-4">Enriado (Fibra)</th>
                  <th className="py-3 px-4">Rinde Estimado</th>
                  <th className="py-3 px-4">Rinde Real Campo</th>
                  <th className="py-3 px-4 text-right">Operación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
                {filteredPlots.map(({ plot, location, metrics, profile, yieldSummary, editPermission }) => (
                  <tr key={plot.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{plot.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {location?.name} · {profile.harvestTargetLabel}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {formatDateAr(metrics.producerFinalHarvestDate)}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums">
                      {plot.grainMoisturePct !== undefined ? `${Number(plot.grainMoisturePct).toFixed(1)} %` : '8.8 %'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {plot.rettingStatus || 'Óptimo (Gris plateado)'}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-sky-700 dark:text-sky-400 font-semibold">
                      {yieldSummary.totalExpectedKg.toFixed(1)} kg
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                      {yieldSummary.totalActualKg.toFixed(1)} kg ({yieldSummary.overallEfficiencyPct}%)
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {editPermission.allowed ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openConditioningModal(plot)}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
                          >
                            Acondicionar / Pesar
                          </button>
                          <button
                            type="button"
                            onClick={() => openGenerateBatchModal(plot)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                          >
                            + Lote Salida
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Solo consulta</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ESLABÓN 3: GRÁFICAS COMPARATIVAS DE RINDE ESTIMADO VS. REAL EN TODA LA RED */}
      {activeTab === 'yield_charts' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  03. Curva Comparativa de Rinde Estimado (Genética x Superficie) vs. Rinde Real Cosechado por Parcela
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visualización directa del rendimiento proyectado según la variedad sembrada frente a los kilogramos reales obtenidos en balanza de campo.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                Eficiencia Media Red: {summaryStats.globalEfficiencyPct}%
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={networkYieldChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.4} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" kg" />
                  <Tooltip
                    formatter={(value: any) => [`${Number(value).toLocaleString('es-AR')} kg`, 'Rinde']}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="rindeEstimadoKg"
                    name="Rinde Estimado Según Genética (kg)"
                    fill="#0284c7"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="rindeRealKg"
                    name="Rinde Real Obtenido en Campo (kg)"
                    fill="#059669"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ESLABÓN 4: LOTES DE COSECHA OBTENIDOS & ETIQUETAS QR / GS1 ARICCAME */}
      {activeTab === 'batches' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                04. Lotes Cosechados Trazados, Etiquetas Oficiales QR/GS1 y Documentación ARICCAME
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cada lote cosechado conserva el vínculo inmutable con su Parcela, Lote INASE Madre, Acta Oficial de Cosecha y Etiqueta QR + GS1.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Código de Lote Cosechado</th>
                  <th className="py-3 px-4">Categoría de Material</th>
                  <th className="py-3 px-4">Parcela &amp; Genética Origen</th>
                  <th className="py-3 px-4">Fecha Final Cosecha</th>
                  <th className="py-3 px-4">Masa Neta / Stock</th>
                  <th className="py-3 px-4">Almacén de Custodia</th>
                  <th className="py-3 px-4 text-right">Etiqueta QR &amp; Documentación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
                {harvestedBatches.map(batch => {
                  const variety = varieties.find(v => String(v.id) === String(batch.varietyId));
                  const originPlotItem = enrichedPlots.find(i => String(i.plot.id) === String(batch.originPlotId));
                  const storage = storagePoints.find(s => String(s.id) === String(batch.storagePointId));
                  const matKey = (batch.materialType || 'harvested_grain') as Exclude<BiologicalMaterialType, 'seed'>;

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                        <div>{batch.batchCode}</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          Rótulo: {batch.labelSerialNumber || batch.certificationNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-emerald-700 dark:text-emerald-400">
                        {MATERIAL_TYPE_LABELS[matKey] || matKey}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {originPlotItem?.plot.name || 'Parcela Productiva'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {variety?.name || 'Genética'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-800 dark:text-slate-200">
                        {formatDateAr(batch.harvestDate || batch.purchaseDate)}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {Number(batch.remainingQuantity || 0).toLocaleString('es-AR')} kg
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Inicial: {Number(batch.initialQuantity || 0).toLocaleString('es-AR')} kg
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        <div>{storage?.name || 'Depósito de Campo'}</div>
                        <div className="text-[11px] text-slate-500">{storage?.city || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setLabelModalBatch(batch)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <QrCode size={13} />
                            <span>Etiqueta Cosecha QR</span>
                          </button>

                          {originPlotItem && (
                            <button
                              type="button"
                              onClick={() => handlePrintOfficialDoc(originPlotItem, 'ariccame_affidavit')}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              title="Descargar DDJJ ARICCAME Ley 27.669"
                            >
                              <Printer size={12} />
                              <span>DDJJ ARICCAME</span>
                            </button>
                          )}

                          <Link
                            to={`/trace/${encodeURIComponent(batch.id)}`}
                            className="px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <ExternalLink size={12} />
                            <span>Pasaporte</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL INTERACTIVO: VARIABLE 2 (FECHA FINAL PRODUCTOR), ACONDICIONAMIENTO Y NUEVO LOTE */}
      {editingPlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {modalMode === 'date_schedule'
                    ? 'Variable 2 · Gestión de Fecha Final de Cosecha por el Productor'
                    : modalMode === 'conditioning'
                    ? 'Eslabón 2 · Acondicionamiento Primario y Rinde Real en Campo'
                    : 'Eslabón 3 · Generación de Lote Cosechado y Etiqueta QR ARICCAME'}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  Parcela: {editingPlot.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlot(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {modalMode === 'date_schedule' && (() => {
              const variety = varieties.find(v => String(v.id) === String(editingPlot.varietyId));
              const m = calculatePlotHarvestDates(
                { ...editingPlot, producerFinalHarvestDate: dateForm.producerFinalHarvestDate },
                variety
              );
              return (
                <form onSubmit={handleSaveProducerDate} className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">Fecha Base de Siembra</span>
                      <strong className="font-mono tabular-nums text-sm text-slate-900 dark:text-white mt-0.5 block">
                        {formatDateAr(m.sowingDate)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">
                        Variable 1 · Estimada (Genética)
                      </span>
                      <strong className="font-mono tabular-nums text-sm text-slate-900 dark:text-white mt-0.5 block">
                        {formatDateAr(m.geneticEstimatedHarvestDate)}
                      </strong>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Ciclo {variety?.name}: {m.nominalCycleDays} días
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">
                        Diferencial vs. Ciclo Teórico
                      </span>
                      <strong className="font-mono tabular-nums text-sm text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                        {m.deltaLabel}
                      </strong>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Ciclo real: {m.actualCycleDays} días
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Variable 2 · Fecha Final de Cosecha (Productor) *
                      </label>
                      <DateInputAr
                        value={dateForm.producerFinalHarvestDate}
                        onChange={val =>
                          setDateForm(prev => ({
                            ...prev,
                            producerFinalHarvestDate: typeof val === 'string' ? val : val.target.value
                          }))
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Hora Operativa de Corte / Trilla
                      </label>
                      <input
                        type="time"
                        value={dateForm.scheduledTime}
                        onChange={e => setDateForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Productor / Responsable de Cosecha en Campo
                      </label>
                      <input
                        type="text"
                        required
                        value={dateForm.harvestOperator}
                        onChange={e => setDateForm(prev => ({ ...prev, harvestOperator: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Rinde Real Cosechado (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={dateForm.actualHarvestYieldKg}
                        onChange={e =>
                          setDateForm(prev => ({ ...prev, actualHarvestYieldKg: Number(e.target.value) }))
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Justificación Agronómica / Climática de la Fecha Final en Campo
                    </label>
                    <textarea
                      rows={2}
                      value={dateForm.harvestDelayReason}
                      onChange={e => setDateForm(prev => ({ ...prev, harvestDelayReason: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dateForm.confirmFinalLock}
                      onChange={e => setDateForm(prev => ({ ...prev, confirmFinalLock: e.target.checked }))}
                      className="mt-0.5 rounded border-amber-400 text-emerald-600"
                    />
                    <div>
                      <span className="font-semibold text-amber-900 dark:text-amber-200 block">
                        Confirmar Cierre de Acta Final de Cosecha
                      </span>
                      <span className="text-amber-700 dark:text-amber-300/90 text-[11px]">
                        Marque esta casilla cuando la cosecha física haya concluido definitivamente para bloquear la fecha en el Acta Oficial.
                      </span>
                    </div>
                  </label>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditingPlot(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save size={14} />
                      <span>{isSaving ? 'Guardando...' : 'Guardar Fecha Final del Productor'}</span>
                    </button>
                  </div>
                </form>
              );
            })()}

            {modalMode === 'conditioning' && (
              <form onSubmit={handleSaveConditioning} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Etapa de la Cadena de Valor
                    </label>
                    <select
                      value={conditioningForm.conditioningStage}
                      onChange={e =>
                        setConditioningForm(prev => ({
                          ...prev,
                          conditioningStage: e.target.value as HarvestConditioningStage
                        }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    >
                      {Object.entries(CONDITIONING_STAGE_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Humedad de Grano en Recibo / Secado (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={conditioningForm.grainMoisturePct}
                      onChange={e =>
                        setConditioningForm(prev => ({
                          ...prev,
                          grainMoisturePct: Number(e.target.value)
                        }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Estado de Enriado de Fibra en Campo
                    </label>
                    <select
                      value={conditioningForm.rettingStatus}
                      onChange={e =>
                        setConditioningForm(prev => ({
                          ...prev,
                          rettingStatus: e.target.value as any
                        }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="Óptimo (Gris plateado)">Óptimo (Gris plateado)</option>
                      <option value="Medio (Amarillo tostado)">Medio (Amarillo tostado)</option>
                      <option value="Verde (Sin enriar)">Verde (Sin enriar)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Rinde Bruto Real Pesado en Campo (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={conditioningForm.actualHarvestYieldKg}
                      onChange={e =>
                        setConditioningForm(prev => ({
                          ...prev,
                          actualHarvestYieldKg: Number(e.target.value)
                        }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingPlot(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>Guardar Acondicionamiento y Rinde</span>
                  </button>
                </div>
              </form>
            )}

            {modalMode === 'generate_batch' && (
              <form onSubmit={handleGenerateOutputBatch} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Fracción Cosechada a Etiquetar *
                    </label>
                    <select
                      value={batchForm.materialType}
                      onChange={e =>
                        setBatchForm(prev => ({
                          ...prev,
                          materialType: e.target.value as Exclude<BiologicalMaterialType, 'seed'>
                        }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      {Object.entries(MATERIAL_TYPE_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Masa Neta Obtenida (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={batchForm.quantityKg}
                      onChange={e =>
                        setBatchForm(prev => ({ ...prev, quantityKg: Number(e.target.value) }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Fecha Final de Cosecha (Productor) *
                    </label>
                    <DateInputAr
                      value={batchForm.harvestDateIso}
                      onChange={val =>
                        setBatchForm(prev => ({
                          ...prev,
                          harvestDateIso: typeof val === 'string' ? val : val.target.value
                        }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Almacén de Custodia Destino *
                    </label>
                    <select
                      required
                      value={batchForm.storagePointId}
                      onChange={e =>
                        setBatchForm(prev => ({ ...prev, storagePointId: e.target.value }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="">Seleccionar Almacén...</option>
                      {storagePoints.map(sp => (
                        <option key={sp.id} value={sp.id}>
                          {sp.name} ({sp.city}) — {sp.nodeCode}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingPlot(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <QrCode size={14} />
                    <span>Generar Lote y Emitir Etiqueta QR / GS1</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE ETIQUETA OFICIAL DE COSECHA Y TRAZABILIDAD (QR + GS1 + ARICCAME) */}
      {labelModalBatch && (
        <TraceabilityLabelModal
          isOpen={Boolean(labelModalBatch)}
          onClose={() => setLabelModalBatch(null)}
          batch={labelModalBatch}
          variety={varieties.find(v => String(v.id) === String(labelModalBatch.varietyId))}
          storagePoint={storagePoints.find(s => String(s.id) === String(labelModalBatch.storagePointId))}
        />
      )}
    </div>
  );
}
