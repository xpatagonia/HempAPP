import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  Plot,
  BiologicalMaterialType,
  HarvestConditioningStage
} from '../types';
import {
  calculatePlotHarvestDates,
  canUserEditPlotHarvestVariable,
  buildHarvestedOutputBatch
} from '../src/services/harvestValueChainService';
import { isCentralAdminOrSupervisor } from '../src/utils/structurePermissions';
import { DateInputAr } from '../src/components/DateInputAr';
import { formatDateAr } from '../src/utils/dateFormat';
import {
  Calendar,
  Scale,
  Sprout,
  Warehouse,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
  Search,
  Lock,
  Unlock,
  Plus,
  ArrowRight,
  Package,
  Droplets,
  Layers,
  FileCheck,
  X,
  Save,
  Tractor
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
  biomass_cbg: 'Biomasa Floral / Fitoquímicos (CBG/CBD)',
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

  const [activeTab, setActiveTab] = useState<'schedule' | 'conditioning' | 'batches' | 'value_chain'>('schedule');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [selectedVarietyId, setSelectedVarietyId] = useState<string>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');

  // Modal de gestión de Fecha Final del Productor (Variable 2) y Acondicionamiento
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [modalMode, setModalMode] = useState<'date_schedule' | 'conditioning' | 'generate_batch'>('date_schedule');
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
    setTimeout(() => setFeedbackBanner(null), 5000);
  };

  // Enriquecer cada parcela con las 2 Variables de Fecha (Teórica Genética vs. Final del Productor)
  const enrichedPlots = useMemo(() => {
    return (plots || []).map(plot => {
      const variety = varieties.find(v => String(v.id) === String(plot.varietyId));
      const location = locations.find(l => String(l.id) === String(plot.locationId));
      const seedBatch = seedBatches.find(b => String(b.id) === String(plot.seedBatchId));
      const metrics = calculatePlotHarvestDates(plot, variety);
      const editPermission = canUserEditPlotHarvestVariable(currentUser, plot, locations, clients);
      const plotHarvestedBatches = (seedBatches || []).filter(
        b => b.materialType && b.materialType !== 'seed' && String(b.originPlotId) === String(plot.id)
      );

      return {
        plot,
        variety,
        location,
        seedBatch,
        metrics,
        editPermission,
        plotHarvestedBatches
      };
    });
  }, [plots, varieties, locations, seedBatches, currentUser, clients]);

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

  // Lotes derivados de cosecha (excluyendo semillas de siembra INASE)
  const harvestedBatches = useMemo(() => {
    return (seedBatches || []).filter(b => b.materialType && b.materialType !== 'seed');
  }, [seedBatches]);

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
    const totalHarvestedKgFromBatches = harvestedBatches.reduce(
      (acc, b) => acc + Number(b.initialQuantity || 0),
      0
    );
    const totalPlotYieldKg = enrichedPlots.reduce(
      (acc, i) => acc + Number(i.plot.actualHarvestYieldKg || i.plot.harvestYieldKg || 0),
      0
    );

    return {
      totalPlots,
      avgNominalCycle,
      avgActualCycle,
      customProducerCount,
      confirmedActsCount,
      totalHarvestedKg: Math.max(totalHarvestedKgFromBatches, totalPlotYieldKg),
      harvestedBatchesCount: harvestedBatches.length
    };
  }, [enrichedPlots, harvestedBatches]);

  const openDateModal = (plot: Plot) => {
    const variety = varieties.find(v => String(v.id) === String(plot.varietyId));
    const metrics = calculatePlotHarvestDates(plot, variety);
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
      actualHarvestYieldKg: Number(plot.actualHarvestYieldKg || plot.harvestYieldKg || 0),
      confirmFinalLock: false
    });
  };

  const openConditioningModal = (plot: Plot) => {
    const variety = varieties.find(v => String(v.id) === String(plot.varietyId));
    const metrics = calculatePlotHarvestDates(plot, variety);
    setEditingPlot(plot);
    setModalMode('conditioning');
    setConditioningForm({
      conditioningStage:
        metrics.conditioningStage === 'en_cultivo' ? 'en_enriado_secado' : metrics.conditioningStage,
      grainMoisturePct: plot.grainMoisturePct ?? 8.8,
      rettingStatus: plot.rettingStatus || 'Óptimo (Gris plateado)',
      harvestBaleCount: plot.harvestBaleCount ?? 2,
      avgBaleWeightKg: plot.avgBaleWeightKg ?? 420,
      actualHarvestYieldKg: Number(plot.actualHarvestYieldKg || plot.harvestYieldKg || 180),
      conditioningNotes:
        plot.conditioningNotes ||
        'Control de humedad de grano y monitoreo de enriado de fibra en andana.'
    });
  };

  const openGenerateBatchModal = (plot: Plot) => {
    const variety = varieties.find(v => String(v.id) === String(plot.varietyId));
    const metrics = calculatePlotHarvestDates(plot, variety);
    const parentLoc = locations.find(l => String(l.id) === String(plot.locationId));
    const defaultStorage =
      storagePoints.find(sp => String(sp.clientId) === String(parentLoc?.clientId)) ||
      storagePoints[0];

    const defaultMaterial: Exclude<BiologicalMaterialType, 'seed'> =
      variety?.usage === 'Fibra'
        ? 'fiber_bales'
        : variety?.usage === 'Medicinal'
        ? 'biomass_cbg'
        : 'harvested_grain';

    setEditingPlot(plot);
    setModalMode('generate_batch');
    setBatchForm({
      materialType: defaultMaterial,
      quantityKg: Number(plot.actualHarvestYieldKg || plot.harvestYieldKg || 250),
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
      notes: `Obtenido en parcela ${plot.name} (Siembra: ${formatDateAr(plot.sowingDate)} · Cosecha Final Productor: ${formatDateAr(metrics.producerFinalHarvestDate)}).`
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
        `Acondicionamiento primario de campo actualizado en ${editingPlot.name} (${CONDITIONING_STAGE_LABELS[conditioningForm.conditioningStage]}).`
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
        `Lote cosechado ${newBatch.batchCode} (${ Number(batchForm.quantityKg).toFixed(2)} kg) generado e ingresado a Almacén de Custodia.`
      );
      setEditingPlot(null);
      setActiveTab('batches');
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
              <span>Trazabilidad & Campo</span>
              <span aria-hidden="true">·</span>
              <span>Gestión Operativa del Productor</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">Campaña 2025/2026</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Cosecha & Cadena de Valor
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
              Control de las dos variables de cosecha por parcela: <strong>Variable 1 (Fecha Estimada según Ciclo Genético)</strong> calculada desde la fecha de siembra, y <strong>Variable 2 (Fecha Final de Cosecha en Campo)</strong> administrada directamente por el Productor junto con el acondicionamiento y los lotes obtenidos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              to="/seed-batches"
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap"
            >
              Ver Semillas INASE (Origen)
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

        {/* Selector de Eslabones de la Cadena de Valor */}
        <div className="flex items-center gap-1.5 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
          <span className="text-xs font-medium text-slate-400 mr-2 shrink-0 flex items-center gap-1">
            <SlidersHorizontal size={13} /> Eslabón:
          </span>
          {(
            [
              {
                id: 'schedule' as const,
                label: `01. Doble Fecha de Cosecha (${enrichedPlots.length} Parcelas)`,
                icon: Calendar
              },
              {
                id: 'conditioning' as const,
                label: '02. Acondicionamiento en Campo (Enriado / Secado)',
                icon: Droplets
              },
              {
                id: 'batches' as const,
                label: `03. Lotes de Cosecha Obtenidos (${harvestedBatches.length})`,
                icon: Package
              },
              {
                id: 'value_chain' as const,
                label: '04. Custodia & Destino Industrial',
                icon: Warehouse
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
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
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
          <p className="text-xs text-slate-500 dark:text-slate-400">Parcelas en Seguimiento de Cosecha</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {summaryStats.totalPlots}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {summaryStats.customProducerCount} con Fecha Final ajustada · {summaryStats.confirmedActsCount} con Acta cerrada
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Variable 1 · Ciclo Genético Teórico Promedio</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {summaryStats.avgNominalCycle} días
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Calculado desde Fecha de Siembra + Ciclo del Cultivar
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Variable 2 · Ciclo Real en Campo (Productor)</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {summaryStats.avgActualCycle} días
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            Diferencial medio: {summaryStats.avgActualCycle - summaryStats.avgNominalCycle >= 0 ? '+' : ''}
            {summaryStats.avgActualCycle - summaryStats.avgNominalCycle} d vs. ciclo genético
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Producción Cosechada Registrada</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {summaryStats.totalHarvestedKg.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {summaryStats.harvestedBatchesCount} lotes de salida (Grano, Fibra, Biomasa, Cañamiza)
          </p>
        </div>
      </div>

      {/* Controles de Filtro */}
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
                01. Matriz de Cosecha por Parcela: Fecha Teórica (Genética) vs. Fecha Final en Campo (Productor)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                La Fecha Estimada se calcula automáticamente desde la Fecha de Siembra según el ciclo de la genética seleccionada. El Productor define y actualiza la Fecha Final real de cosecha en el campo.
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
                  <th className="py-3 px-4">Parcela & Establecimiento</th>
                  <th className="py-3 px-4">Genética & Ciclo</th>
                  <th className="py-3 px-4">Fecha Base Siembra</th>
                  <th className="py-3 px-4">Variable 1 · Fecha Estimada (Genética)</th>
                  <th className="py-3 px-4">Variable 2 · Fecha Final (Productor)</th>
                  <th className="py-3 px-4">Diferencial (Δ Ciclo)</th>
                  <th className="py-3 px-4">Etapa Cadena de Valor</th>
                  <th className="py-3 px-4 text-right">Acciones de Campo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
                {filteredPlots.map(({ plot, variety, location, seedBatch, metrics, editPermission, plotHarvestedBatches }) => (
                  <tr
                    key={plot.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {plot.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {location?.name || 'Establecimiento'} · {plot.block || 'Bloque I'} ·{' '}
                        <span className="font-mono tabular-nums">
                          {plot.surfaceArea} {plot.surfaceUnit || 'm2'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {variety?.name || 'Genética'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Ciclo nominal: {metrics.nominalCycleDays} d · {variety?.usage || 'Dual'}
                        {seedBatch ? ` · Lote ${seedBatch.certificationNumber || seedBatch.batchCode.slice(0, 10)}` : ''}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <div>{formatDateAr(metrics.sowingDate)}</div>
                      <div className="text-[11px] text-slate-400">
                        Sembró: {plot.sowingResponsibleName || 'Responsable'}
                      </div>
                    </td>

                    {/* VARIABLE 1: FECHA ESTIMADA SEGÚN GENÉTICA */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                        {formatDateAr(metrics.geneticEstimatedHarvestDate)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Siembra + {metrics.nominalCycleDays} días
                      </div>
                    </td>

                    {/* VARIABLE 2: FECHA FINAL MANEJADA POR EL PRODUCTOR */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                          {formatDateAr(metrics.producerFinalHarvestDate)}
                        </span>
                        {metrics.isLockedFinalAct && (
                          <span title="Acta Final de Cosecha confirmada">
                            <Lock
                              size={12}
                              className="text-amber-600 dark:text-amber-400"
                            />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Ciclo real: {metrics.actualCycleDays} días ({plot.harvestOperator || 'Productor'})
                      </div>
                    </td>

                    {/* DIFERENCIAL ENTRE CICLO TEÓRICO Y FECHA FINAL DEL PRODUCTOR */}
                    <td className="py-3 px-4">
                      <div
                        className={`font-mono tabular-nums font-semibold ${
                          metrics.deltaStatus === 'on_time'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : metrics.deltaStatus === 'extended'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-sky-600 dark:text-sky-400'
                        }`}
                      >
                        {metrics.deltaLabel}
                      </div>
                      {plot.harvestDelayReason && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={plot.harvestDelayReason}>
                          {plot.harvestDelayReason}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {CONDITIONING_STAGE_LABELS[metrics.conditioningStage]}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {plot.actualHarvestYieldKg
                          ? `Rinde: ${Number(plot.actualHarvestYieldKg).toFixed(1)} kg`
                          : 'Rinde pendiente de pesaje'}
                        {plotHarvestedBatches.length > 0 ? ` · ${plotHarvestedBatches.length} lote(s)` : ''}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {editPermission.allowed ? (
                          <button
                            type="button"
                            onClick={() => openDateModal(plot)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer"
                            title="Definir o ajustar la Fecha Final de Cosecha en Campo (Productor)"
                          >
                            Fecha Productor
                          </button>
                        ) : (
                          <span
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-medium inline-flex items-center gap-1"
                            title={editPermission.reason}
                          >
                            <Lock size={12} /> Acta Cerrada
                          </span>
                        )}

                        {editPermission.allowed && (
                          <button
                            type="button"
                            onClick={() => openConditioningModal(plot)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition cursor-pointer"
                            title="Registrar Enriado / Secado y Rinde en Campo"
                          >
                            Acondicionar
                          </button>
                        )}

                        {editPermission.allowed && (
                          <button
                            type="button"
                            onClick={() => openGenerateBatchModal(plot)}
                            className="px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-xs font-semibold transition cursor-pointer"
                            title="Generar Lote de Grano, Fibra, Biomasa o Cañamiza"
                          >
                            + Lote Salida
                          </button>
                        )}

                        {metrics.isLockedFinalAct && isAdmin && (
                          <button
                            type="button"
                            onClick={async () => {
                              await reopenPlotCycle(plot.id);
                              showNotification(
                                'success',
                                `Acta de cosecha reabierta por Administrador para ${plot.name}. El Productor puede volver a editar la fecha final.`
                              );
                            }}
                            className="px-2 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-xs font-medium transition cursor-pointer inline-flex items-center gap-1"
                            title="Reabrir Acta de Cosecha para permitir ajustes del Productor"
                          >
                            <Unlock size={12} /> Reabrir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredPlots.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                      No se encontraron parcelas con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ESLABÓN 2: ACONDICIONAMIENTO PRIMARIO EN CAMPO (ENRIADO DE FIBRA Y SECADO DE GRANO) */}
      {activeTab === 'conditioning' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              02. Acondicionamiento Primario en Campo: Enriado de Fibra, Secado de Grano y Pesaje
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Una vez ejecutado el corte o trilla en la Fecha Final definida por el Productor, registre aquí la humedad de grano (&lt;9% objetivo), el grado de enriado de fibra en campo y los kilogramos/fardos obtenidos antes de su ingreso a almacén.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Parcela & Campo</th>
                  <th className="py-3 px-4">Fecha Final Productor</th>
                  <th className="py-3 px-4">Humedad de Grano (%)</th>
                  <th className="py-3 px-4">Estado de Enriado (Fibra)</th>
                  <th className="py-3 px-4">Fardos / Rollos</th>
                  <th className="py-3 px-4">Rinde Bruto Campo</th>
                  <th className="py-3 px-4">Estado Eslabón</th>
                  <th className="py-3 px-4 text-right">Operación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
                {filteredPlots.map(({ plot, variety, location, metrics, editPermission }) => (
                  <tr key={plot.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{plot.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {location?.name} · {variety?.name} ({variety?.usage})
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {formatDateAr(metrics.producerFinalHarvestDate)}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums">
                      {plot.grainMoisturePct !== undefined ? `${Number(plot.grainMoisturePct).toFixed(1)} %` : '8.8 % (Est.)'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {plot.rettingStatus || 'Óptimo (Gris plateado)'}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {plot.harvestBaleCount ? `${plot.harvestBaleCount} fardos (${plot.avgBaleWeightKg || 420} kg/u)` : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {plot.actualHarvestYieldKg
                        ? `${Number(plot.actualHarvestYieldKg).toLocaleString('es-AR')} kg`
                        : 'Sin pesaje'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {CONDITIONING_STAGE_LABELS[metrics.conditioningStage]}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {editPermission.allowed ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openConditioningModal(plot)}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
                          >
                            Registrar Acondicionamiento
                          </button>
                          <button
                            type="button"
                            onClick={() => openGenerateBatchModal(plot)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                          >
                            Pasar a Almacén
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">Solo lectura</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ESLABÓN 3: LOTES DE COSECHA OBTENIDOS (GRANO, FIBRA, BIOMASA, CAÑAMIZA) */}
      {activeTab === 'batches' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                03. Lotes de Salida Cosechados (Grano, Fardos de Fibra, Biomasa y Cañamiza)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Trazabilidad completa desde la Parcela de Cultivo y el Lote Madre de Semilla INASE hasta el subproducto primario ingresado a custodia.
              </p>
            </div>
            {filteredPlots.length > 0 && filteredPlots[0].editPermission.allowed && (
              <button
                type="button"
                onClick={() => openGenerateBatchModal(filteredPlots[0].plot)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus size={14} />
                <span>Generar Nuevo Lote de Cosecha</span>
              </button>
            )}
          </div>

          {harvestedBatches.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Aún no se han emitido lotes fraccionados de post-cosecha en esta vista.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                Seleccione cualquier parcela en la pestaña <strong>01. Doble Fecha de Cosecha</strong> y pulse <strong>+ Lote Salida</strong> para registrar el ingreso de Grano, Fardos de Fibra, Biomasa o Cañamiza al almacén de su establecimiento.
              </p>
              {filteredPlots.length > 0 && filteredPlots[0].editPermission.allowed && (
                <button
                  type="button"
                  onClick={() => openGenerateBatchModal(filteredPlots[0].plot)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Registrar Primer Lote de Cosecha</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Código de Lote Cosechado</th>
                    <th className="py-3 px-4">Tipo de Subproducto</th>
                    <th className="py-3 px-4">Parcela Origen & Genética</th>
                    <th className="py-3 px-4">Fecha de Cosecha</th>
                    <th className="py-3 px-4">Parámetros Técnicos</th>
                    <th className="py-3 px-4">Almacén de Custodia</th>
                    <th className="py-3 px-4 text-right">Masa Neta (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
                  {harvestedBatches.map(batch => {
                    const originPlot = plots.find(p => String(p.id) === String(batch.originPlotId));
                    const variety = varieties.find(v => String(v.id) === String(batch.varietyId));
                    const storage = storagePoints.find(s => String(s.id) === String(batch.storagePointId));
                    const mType = (batch.materialType || 'harvested_grain') as Exclude<BiologicalMaterialType, 'seed'>;

                    return (
                      <tr key={batch.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                          {batch.batchCode}
                        </td>
                        <td className="py-3 px-4 text-slate-800 dark:text-slate-200">
                          {MATERIAL_TYPE_LABELS[mType] || mType}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {originPlot?.name || 'Parcela de Red'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {variety?.name || 'Genética'} · Resp: {batch.harvestResponsibleName || batch.logisticsResponsible || 'Productor'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {formatDateAr(batch.harvestDate || batch.purchaseDate)}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                          {mType === 'harvested_grain' && `Humedad: ${batch.moisturePct ?? 8.5}% · Aceite: ${batch.oilContentPct ?? 30}%`}
                          {mType === 'fiber_bales' && `${batch.baleCount ?? 1} fardos · Enriado: ${batch.rettingQuality || 'Óptimo'}`}
                          {mType === 'biomass_cbg' && `THC: ${batch.hplcThcPct ?? 0.12}% · CBG: ${batch.hplcCbgPct ?? 2.4}%`}
                          {mType === 'hurds' && `Granulometría: ${batch.hurdGranulometry || 'Media'}`}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {storage?.name || 'Depósito de Campo'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                          {Number(batch.remainingQuantity || batch.initialQuantity || 0).toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}{' '}
                          kg
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ESLABÓN 4: CUSTODIA EN ALMACÉN & CONEXIÓN CON LA SIGUIENTE ETAPA DE LA CADENA DE VALOR */}
      {activeTab === 'value_chain' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                04. Nodos de Almacenamiento Primario y Disponibilidad para Procesamiento Industrial
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Consolidación por establecimiento para empalmar con el siguiente eslabón de la cadena de valor (Desfibrado Textil, Prensado de Grano, Extracción Fitoquímica y Bioconstrucción).
              </p>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {storagePoints.map(sp => {
                const spBatches = harvestedBatches.filter(b => String(b.storagePointId) === String(sp.id));
                const totalKg = spBatches.reduce((acc, b) => acc + Number(b.remainingQuantity || 0), 0);
                return (
                  <div key={sp.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {sp.name} <span className="font-mono text-xs text-slate-400">({sp.nodeCode})</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {sp.city}, {sp.province} · Seguridad: {sp.securityLevel || 'GACP'} · Condición: {sp.conditions || 'Ambiente controlado'}
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {totalKg.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg en custodia
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {spBatches.length} lote(s) de cosecha registrados
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Arquitectura de Eslabones Siguientes
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Al separar <strong>Cosecha & Cadena de Valor</strong> del inventario de <strong>Semillas INASE</strong>, cada lote cosechado con la Fecha Final del Productor queda listo para alimentar los procesos de transformación primaria y secundaria:
            </p>
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-white">1. Línea Grano Alimenticio</div>
                <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Clasificación, descascarado, prensado en frío (Aceite Omega 3/6) y harina proteica.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-white">2. Línea Fibra & Cañamiza</div>
                <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Desfibrado mecánico (decorticación), fibra larga textil/compuestos y cañamiza calibrada.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-white">3. Línea Fitoquímica & Biomasa</div>
                <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Secado GACP, trazabilidad HPLC (&lt;0.3% THC) y despacho con guía oficial.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN DE VARIABLE 2 (FECHA FINAL DEL PRODUCTOR), ACONDICIONAMIENTO O LOTE DE SALIDA */}
      {editingPlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
          onClick={() => setEditingPlot(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const variety = varieties.find(v => String(v.id) === String(editingPlot.varietyId));
              const metrics = calculatePlotHarvestDates(editingPlot, variety);
              const previewDelta = dateForm.producerFinalHarvestDate
                ? Math.round(
                    (new Date(`${dateForm.producerFinalHarvestDate}T12:00:00Z`).getTime() -
                      new Date(`${metrics.geneticEstimatedHarvestDate}T12:00:00Z`).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : metrics.deltaCycleDays;

              return (
                <>
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        Parcela {editingPlot.name} · Genética {variety?.name || 'Cultivar'} (Ciclo {metrics.nominalCycleDays} d)
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {modalMode === 'date_schedule' && 'Gestionar Variable 2: Fecha Final de Cosecha en Campo (Productor)'}
                        {modalMode === 'conditioning' && 'Acondicionamiento Primario en Campo (Enriado / Secado)'}
                        {modalMode === 'generate_batch' && 'Generar Lote de Cosecha Trazable para Almacén'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingPlot(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {modalMode === 'date_schedule' && (
                    <form onSubmit={handleSaveProducerDate} className="p-6 space-y-4">
                      {/* Comparativa Visual de las 2 Variables */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            Variable 1 · Fecha Estimada (Ciclo Genético)
                          </span>
                          <span className="text-sm font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                            {formatDateAr(metrics.geneticEstimatedHarvestDate)}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-mono tabular-nums">
                            Siembra {formatDateAr(metrics.sowingDate)} + {metrics.nominalCycleDays} días
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            Diferencial de Campo (Variable 2 vs Variable 1)
                          </span>
                          <span
                            className={`text-sm font-mono tabular-nums font-bold ${
                              previewDelta === 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : previewDelta > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-sky-600 dark:text-sky-400'
                            }`}
                          >
                            {previewDelta === 0
                              ? '0 días (Exacto al ciclo genético)'
                              : previewDelta > 0
                              ? `+${previewDelta} días sobre el ciclo genético`
                              : `${previewDelta} días antes del ciclo genético`}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            Controlado en campo por el Productor
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Variable 2 · Fecha Final de Cosecha (Productor)
                          </label>
                          <DateInputAr
                            value={dateForm.producerFinalHarvestDate}
                            onChange={e =>
                              setDateForm(prev => ({
                                ...prev,
                                producerFinalHarvestDate:
                                  typeof e === 'string' ? e : e.target.value
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Hora Operativa de Corte / Trilla
                          </label>
                          <input
                            type="time"
                            value={dateForm.scheduledTime}
                            onChange={e => setDateForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Responsable de Cosecha en Campo
                          </label>
                          <input
                            type="text"
                            value={dateForm.harvestOperator}
                            onChange={e => setDateForm(prev => ({ ...prev, harvestOperator: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Rinde Estimado / Pesado en Parcela (kg)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={dateForm.actualHarvestYieldKg}
                            onChange={e => setDateForm(prev => ({ ...prev, actualHarvestYieldKg: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Motivo Agronómico / Condición de Campo (Humedad, Clima, Madurez)
                        </label>
                        <textarea
                          rows={2}
                          value={dateForm.harvestDelayReason}
                          onChange={e => setDateForm(prev => ({ ...prev, harvestDelayReason: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dateForm.confirmFinalLock}
                          onChange={e => setDateForm(prev => ({ ...prev, confirmFinalLock: e.target.checked }))}
                          className="mt-0.5"
                        />
                        <span className="text-amber-900 dark:text-amber-200">
                          <strong>Confirmar Acta Definitiva de Cosecha:</strong> Marque esta casilla únicamente cuando la trilla/corte haya concluido y la fecha final sea definitiva (quedará sellada y solo un Administrador podrá reabrirla).
                        </span>
                      </label>

                      <div className="flex items-center justify-end gap-2 pt-2">
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
                          <span>
                            {dateForm.confirmFinalLock
                              ? 'Confirmar y Sellar Acta de Cosecha'
                              : 'Guardar Fecha Final del Productor'}
                          </span>
                        </button>
                      </div>
                    </form>
                  )}

                  {modalMode === 'conditioning' && (
                    <form onSubmit={handleSaveConditioning} className="p-6 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Eslabón Actual en Campo
                        </label>
                        <select
                          value={conditioningForm.conditioningStage}
                          onChange={e =>
                            setConditioningForm(prev => ({
                              ...prev,
                              conditioningStage: e.target.value as HarvestConditioningStage
                            }))
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        >
                          {Object.entries(CONDITIONING_STAGE_LABELS).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Humedad de Grano (%)
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
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Calidad de Enriado (Fibra)
                          </label>
                          <select
                            value={conditioningForm.rettingStatus}
                            onChange={e =>
                              setConditioningForm(prev => ({
                                ...prev,
                                rettingStatus: e.target.value as any
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                          >
                            <option value="Óptimo (Gris plateado)">Óptimo (Gris plateado)</option>
                            <option value="Medio (Amarillo tostado)">Medio (Amarillo tostado)</option>
                            <option value="Verde (Sin enriar)">Verde (Sin enriar)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Rinde Total (kg)
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
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            N° Fardos / Rollos
                          </label>
                          <input
                            type="number"
                            value={conditioningForm.harvestBaleCount}
                            onChange={e =>
                              setConditioningForm(prev => ({
                                ...prev,
                                harvestBaleCount: Number(e.target.value)
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Peso / Fardo (kg)
                          </label>
                          <input
                            type="number"
                            value={conditioningForm.avgBaleWeightKg}
                            onChange={e =>
                              setConditioningForm(prev => ({
                                ...prev,
                                avgBaleWeightKg: Number(e.target.value)
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Notas de Acondicionamiento (Secado / Limpieza / Enriado)
                        </label>
                        <textarea
                          rows={2}
                          value={conditioningForm.conditioningNotes}
                          onChange={e =>
                            setConditioningForm(prev => ({
                              ...prev,
                              conditioningNotes: e.target.value
                            }))
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
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
                          <span>Guardar Acondicionamiento</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {modalMode === 'generate_batch' && (
                    <form onSubmit={handleGenerateOutputBatch} className="p-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Subproducto Cosechado
                          </label>
                          <select
                            value={batchForm.materialType}
                            onChange={e =>
                              setBatchForm(prev => ({
                                ...prev,
                                materialType: e.target.value as Exclude<BiologicalMaterialType, 'seed'>
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                          >
                            {Object.entries(MATERIAL_TYPE_LABELS).map(([k, label]) => (
                              <option key={k} value={k}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Cantidad Neta Obtenida (kg)
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
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Fecha Final de Cosecha (Productor)
                          </label>
                          <DateInputAr
                            value={batchForm.harvestDateIso}
                            onChange={e =>
                              setBatchForm(prev => ({
                                ...prev,
                                harvestDateIso: typeof e === 'string' ? e : e.target.value
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Almacén / Silo de Destino
                          </label>
                          <select
                            value={batchForm.storagePointId}
                            onChange={e =>
                              setBatchForm(prev => ({ ...prev, storagePointId: e.target.value }))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                          >
                            {storagePoints.map(sp => (
                              <option key={sp.id} value={sp.id}>
                                {sp.name} ({sp.city})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Observaciones de Trazabilidad
                        </label>
                        <textarea
                          rows={2}
                          value={batchForm.notes}
                          onChange={e => setBatchForm(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
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
                          <Plus size={14} />
                          <span>Emitir Lote Cosechado e Ingresar a Custodia</span>
                        </button>
                      </div>
                    </form>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
