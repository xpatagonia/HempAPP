import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  Droplets, CloudRain, Plus, X, Trash2, Edit2, Info, Loader2, RefreshCw,
  TrendingUp, Waves, Sparkles, Save, ArrowUp, ArrowDown, Calendar, Clock, MapPin, CheckCircle2, Database
} from 'lucide-react';
import { HydricRecord } from '../types';

interface HydricBalanceProps {
  locationId: string;
  plotId?: string;
  startDate?: string;
  waterNeedMm?: number;
}

export default function HydricBalance({ locationId, plotId, startDate, waterNeedMm = 480 }: HydricBalanceProps) {
  const {
    hydricRecords,
    addHydricRecord,
    updateHydricRecord,
    deleteHydricRecord,
    currentUser,
    locations,
    plots
  } = useAppContext();

  const location = locations.find(l => l.id === locationId);
  const plot = plotId ? plots.find(p => p.id === plotId) : undefined;

  const activeCoords = useMemo(() => {
    if (plot?.coordinates && !isNaN(plot.coordinates.lat) && !isNaN(plot.coordinates.lng) && plot.coordinates.lat !== 0) {
      return plot.coordinates;
    }
    if (plot?.polygon && plot.polygon.length >= 3) {
      const lat = plot.polygon.reduce((s, p) => s + p.lat, 0) / plot.polygon.length;
      const lng = plot.polygon.reduce((s, p) => s + p.lng, 0) / plot.polygon.length;
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
    if (location?.coordinates && !isNaN(location.coordinates.lat) && !isNaN(location.coordinates.lng)) {
      return location.coordinates;
    }
    return { lat: -43.308576, lng: -65.289047 };
  }, [plot, location]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isLoadingAuto, setIsLoadingAuto] = useState(false);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoRain, setAutoRain] = useState(0);
  const [recentRain7d, setRecentRain7d] = useState(0);
  const [et0Daily, setEt0Daily] = useState<number | null>(null);
  const [lastSyncedRainCount, setLastSyncedRainCount] = useState<number>(0);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Configuración de asentamiento automático de lluvias en la Base de Datos
  const [autoSyncRainToDb, setAutoSyncRainToDb] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('ht_auto_rain_db_sync') !== 'false';
  });

  const handleToggleAutoSync = () => {
    setAutoSyncRainToDb(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ht_auto_rain_db_sync', String(next));
      } catch {}
      return next;
    });
  };

  const getLocalTodayIso = () => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const getLocalCurrentTimeHHMM = () => {
    try {
      return new Date().toLocaleTimeString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return '08:30';
    }
  };

  const [formData, setFormData] = useState({
    date: getLocalTodayIso(),
    time: getLocalCurrentTimeHHMM(),
    endTime: '',
    type: 'Lluvia' as 'Lluvia' | 'Riego',
    amountMm: 0,
    notes: ''
  });

  const [satelliteSuggestion, setSatelliteSuggestion] = useState<{ amount: number; status: 'idle' | 'loading' | 'found' | 'not_found' }>({
    amount: 0,
    status: 'idle'
  });

  const manualRecords = useMemo(() => {
    const data = hydricRecords.filter(h => {
      if (plotId) {
        return h.plotId === plotId || (h.locationId === locationId && !h.plotId);
      }
      return h.locationId === locationId;
    });

    return data.sort((a, b) => {
      const dateA = new Date(a.date + (a.time ? 'T' + a.time : 'T08:00')).getTime();
      const dateB = new Date(b.date + (b.time ? 'T' + b.time : 'T08:00')).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [hydricRecords, locationId, plotId, sortOrder]);

  const manualRainMm = useMemo(
    () => Number(manualRecords.filter(r => r.type === 'Lluvia').reduce((sum, r) => sum + Number(r.amountMm || 0), 0).toFixed(1)),
    [manualRecords]
  );

  const manualIrrigationMm = useMemo(
    () => Number(manualRecords.filter(r => r.type === 'Riego').reduce((sum, r) => sum + Number(r.amountMm || 0), 0).toFixed(1)),
    [manualRecords]
  );

  const totalManual = useMemo(
    () => Number((manualRainMm + manualIrrigationMm).toFixed(1)),
    [manualRainMm, manualIrrigationMm]
  );

  const effectiveRainMm = useMemo(
    () => Number(Math.max(autoRain, manualRainMm).toFixed(1)),
    [autoRain, manualRainMm]
  );

  const totalHydricFootprint = useMemo(
    () => Number((effectiveRainMm + manualIrrigationMm).toFixed(1)),
    [effectiveRainMm, manualIrrigationMm]
  );

  const hydricCompletionPct = useMemo(
    () => Math.min(100, Math.round((totalHydricFootprint / Math.max(1, waterNeedMm)) * 100)),
    [totalHydricFootprint, waterNeedMm]
  );

  const toggleSort = () => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));

  // MOTOR DE SINCRONIZACIÓN Y ASENTAMIENTO AUTOMÁTICO DE LLUVIAS EN LA BASE DE DATOS
  const syncSatelliteAndPersistRainEvents = useCallback(
    async (forcePersist = false) => {
      if (!activeCoords?.lat || !activeCoords?.lng) return;
      setIsLoadingAuto(true);
      if (forcePersist) setIsSyncingDb(true);

      try {
        const sowStr = startDate || plot?.sowingDate || '2026-01-01';
        const todayIso = getLocalTodayIso();
        const dailyRainMap = new Map<string, number>();

        // 1. Consulta de pronóstico y últimos 14 días (Open-Meteo Forecast)
        const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${activeCoords.lat}&longitude=${activeCoords.lng}&daily=precipitation_sum,et0_fao_evapotranspiration&past_days=14&forecast_days=2&timezone=auto`;
        const fRes = await fetch(forecastUrl);
        let recentSum = 0;

        if (fRes.ok) {
          const fData = await fRes.json();
          const times: string[] = fData.daily?.time || [];
          const precs: number[] = fData.daily?.precipitation_sum || [];
          const et0s: number[] = fData.daily?.et0_fao_evapotranspiration || [];

          times.forEach((dStr, idx) => {
            const val = Number(precs[idx] || 0);
            if (dStr >= sowStr && dStr <= todayIso) {
              dailyRainMap.set(dStr, Number(val.toFixed(1)));
            }
          });

          // Últimos 7 días hasta hoy
          const todayIdx = times.indexOf(todayIso);
          const sliceEnd = todayIdx >= 0 ? todayIdx + 1 : Math.min(times.length, 15);
          const sliceStart = Math.max(0, sliceEnd - 7);
          recentSum = precs.slice(sliceStart, sliceEnd).reduce((a, b) => a + (Number(b) || 0), 0);

          if (todayIdx >= 0 && et0s[todayIdx] != null) {
            setEt0Daily(Number(Number(et0s[todayIdx]).toFixed(2)));
          } else if (et0s.length > 0) {
            setEt0Daily(Number(Number(et0s[et0s.length - 1] || 4.1).toFixed(2)));
          }
        }
        setRecentRain7d(Number(recentSum.toFixed(1)));

        // 2. Consulta de archivo histórico desde la fecha de siembra (Open-Meteo ERA5 Archive)
        const sowDate = new Date(`${sowStr}T00:00:00`);
        const nowDate = new Date(`${todayIso}T00:00:00`);
        const maxEndDate = new Date(sowDate.getTime() + 165 * 86400000);
        const targetEnd = nowDate < maxEndDate ? nowDate : maxEndDate;
        const archiveEndObj = new Date(targetEnd.getTime() - 2 * 86400000);

        if (archiveEndObj >= sowDate) {
          const startIso = sowDate.toISOString().split('T')[0];
          const endIso = archiveEndObj.toISOString().split('T')[0];
          const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${activeCoords.lat}&longitude=${activeCoords.lng}&start_date=${startIso}&end_date=${endIso}&daily=precipitation_sum&timezone=auto`;
          const aRes = await fetch(archiveUrl);
          if (aRes.ok) {
            const aData = await aRes.json();
            const aTimes: string[] = aData.daily?.time || [];
            const aPrecs: number[] = aData.daily?.precipitation_sum || [];
            aTimes.forEach((dStr, idx) => {
              const val = Number(aPrecs[idx] || 0);
              if (dStr >= sowStr && dStr <= todayIso) {
                const prev = dailyRainMap.get(dStr) || 0;
                if (val > prev) {
                  dailyRainMap.set(dStr, Number(val.toFixed(1)));
                }
              }
            });
          }
        }

        let totalSatSum = 0;
        dailyRainMap.forEach(mm => {
          totalSatSum += mm;
        });

        setAutoRain(Number(totalSatSum.toFixed(1)));

        // 3. ASENTAMIENTO AUTOMÁTICO EN LA BASE DE DATOS CADA VEZ QUE LLUEVE (mm >= 0.5)
        if (autoSyncRainToDb || forcePersist) {
          let deletedHydricIds = new Set<string>();
          try {
            const rawDel = localStorage.getItem('ht_deleted_ids_v1');
            if (rawDel) {
              const parsedDel = JSON.parse(rawDel);
              deletedHydricIds = new Set(parsedDel['hydric_records'] || []);
            }
          } catch {}

          const scopeKey = plotId || locationId;
          let insertedCount = 0;

          const sortedEntries = Array.from(dailyRainMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
          for (const [rainDate, mm] of sortedEntries) {
            if (mm < 0.5) continue; // Umbral mínimo agronómico (0.5 mm)
            const deterministicId = `auto-rain-${scopeKey}-${rainDate}`;

            // Respetar si el usuario eliminó manualmente ese registro automático
            if (!forcePersist && deletedHydricIds.has(deterministicId)) continue;

            const alreadyExists = hydricRecords.some(
              r =>
                r.id === deterministicId ||
                (r.type === 'Lluvia' &&
                  r.date === rainDate &&
                  ((plotId && r.plotId === plotId) || (!plotId && r.locationId === locationId)))
            );

            if (!alreadyExists) {
              const newRainRecord: HydricRecord = {
                id: deterministicId,
                locationId,
                plotId,
                date: rainDate,
                time: '06:00',
                type: 'Lluvia',
                amountMm: Number(mm.toFixed(1)),
                notes: 'Asentado automático en BD por Pluviómetro Satelital (Open-Meteo ERA5/GFS)',
                createdBy: currentUser?.id || 'system-auto-pluviometer'
              };
              await addHydricRecord(newRainRecord);
              insertedCount++;
            }
          }

          if (insertedCount > 0) {
            setLastSyncedRainCount(insertedCount);
          }
        }
      } catch (e) {
        console.warn('Error sincronizando pluviómetro satelital:', e);
      } finally {
        setIsLoadingAuto(false);
        setIsSyncingDb(false);
      }
    },
    [activeCoords.lat, activeCoords.lng, startDate, plot?.sowingDate, autoSyncRainToDb, plotId, locationId, hydricRecords, addHydricRecord, currentUser?.id]
  );

  useEffect(() => {
    syncSatelliteAndPersistRainEvents(false);
  }, [activeCoords.lat, activeCoords.lng, startDate, plot?.sowingDate, autoSyncRainToDb]);

  // SUGERENCIA SATELITAL AL CARGAR REGISTRO MANUAL
  useEffect(() => {
    const getDailySuggestion = async () => {
      if (!isModalOpen || formData.type !== 'Lluvia' || !activeCoords?.lat || !formData.date) {
        setSatelliteSuggestion({ amount: 0, status: 'idle' });
        return;
      }

      setSatelliteSuggestion(prev => ({ ...prev, status: 'loading' }));
      try {
        const res = await fetch(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${activeCoords.lat}&longitude=${activeCoords.lng}&start_date=${formData.date}&end_date=${formData.date}&daily=precipitation_sum&timezone=auto`
        );
        const data = await res.json();

        if (data.daily?.precipitation_sum && data.daily.precipitation_sum[0] !== undefined && data.daily.precipitation_sum[0] !== null) {
          const val = Number(data.daily.precipitation_sum[0]);
          setSatelliteSuggestion({ amount: val, status: 'found' });
        } else {
          setSatelliteSuggestion({ amount: 0, status: 'not_found' });
        }
      } catch {
        setSatelliteSuggestion({ amount: 0, status: 'not_found' });
      }
    };

    const timer = setTimeout(getDailySuggestion, 400);
    return () => clearTimeout(timer);
  }, [formData.date, formData.type, isModalOpen, activeCoords.lat, activeCoords.lng]);

  const handleOpenNewModal = () => {
    setEditingRecordId(null);
    setFormData({
      date: getLocalTodayIso(),
      time: getLocalCurrentTimeHHMM(),
      endTime: '',
      type: 'Lluvia',
      amountMm: 0,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rec: HydricRecord) => {
    setEditingRecordId(rec.id);
    const endMatch = rec.notes?.match(/\[Fin Riego:\s*([^\]]+)\]/i);
    const cleanNotes = (rec.notes || '').replace(/\[Fin Riego:\s*[^\]]+\]/gi, '').trim();
    setFormData({
      date: rec.date,
      time: rec.time || '08:30',
      endTime: rec.endTime || (endMatch ? endMatch[1].trim() : ''),
      type: rec.type,
      amountMm: Number(rec.amountMm || 0),
      notes: cleanNotes
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      let finalNotes = formData.notes || '';
      if (formData.type === 'Riego' && formData.endTime) {
        finalNotes = `${finalNotes} [Fin Riego: ${formData.endTime}]`.trim();
      }

      const payload: HydricRecord = {
        id: editingRecordId || crypto.randomUUID(),
        locationId,
        plotId,
        date: formData.date,
        time: formData.time,
        endTime: formData.type === 'Riego' && formData.endTime ? formData.endTime : undefined,
        type: formData.type,
        amountMm: Number(formData.amountMm),
        notes: finalNotes,
        createdBy: currentUser?.id
      };

      const success = editingRecordId
        ? await updateHydricRecord(payload)
        : await addHydricRecord(payload);

      if (success) {
        setIsModalOpen(false);
        setEditingRecordId(null);
      }
    } catch (err) {
      console.error('Save Error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const autoPersistedCount = useMemo(
    () => manualRecords.filter(r => String(r.id).startsWith('auto-rain-') || (r.notes || '').includes('Pluviómetro Satelital')).length,
    [manualRecords]
  );

  return (
    <div className="space-y-6">
      {/* CABECERA DE SINCRONIZACIÓN HÍDRICA Y ASENTAMIENTO AUTOMÁTICO EN BD */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0">
            <CloudRain size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Pluviómetro Autónomo & Balance Hídrico en Base de Datos
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                <Database size={10} /> {autoSyncRainToDb ? 'Auto-Asentamiento en BD Activo' : 'Modo Manual'}
              </span>
              {autoPersistedCount > 0 && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                  {autoPersistedCount} lluvias asentadas automáticamente
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1">
                <MapPin size={11} className="text-sky-500" />
                {location?.name || 'Establecimiento'} ({activeCoords.lat.toFixed(5)}, {activeCoords.lng.toFixed(5)})
              </span>
              <span>•</span>
              <span>Inicio Ciclo: <strong>{startDate || plot?.sowingDate || '2026-01-13'}</strong></span>
              {et0Daily !== null && (
                <>
                  <span>•</span>
                  <span>ET₀ FAO Hoy: <strong>{et0Daily} mm/día</strong></span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <button
            type="button"
            onClick={handleToggleAutoSync}
            className={`px-3 py-2 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider border transition flex items-center gap-1.5 cursor-pointer ${
              autoSyncRainToDb
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
            }`}
            title="Activa o desactiva el registro automático en la base de datos cada vez que se detecta lluvia satelital en el lote"
          >
            <CheckCircle2 size={13} />
            <span>Auto-Registro Lluvia: {autoSyncRainToDb ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            disabled={isSyncingDb || isLoadingAuto}
            onClick={() => syncSatelliteAndPersistRainEvents(true)}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Consultar precipitaciones satelitales desde la siembra y asentarlas en la base de datos"
          >
            <RefreshCw size={13} className={isSyncingDb || isLoadingAuto ? 'animate-spin text-sky-500' : 'text-sky-500'} />
            <span>Sincronizar Lluvias a BD</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewModal}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus size={15} />
            <span>Registrar Lluvia / Riego</span>
          </button>
        </div>
      </div>

      {lastSyncedRainCount > 0 && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-200 text-xs font-mono flex items-center justify-between">
          <span>
            ✓ Se asentaron automáticamente <strong>{lastSyncedRainCount}</strong> eventos de precipitación detectados en el lote dentro de la base de datos (`hydric_records`).
          </span>
          <button onClick={() => setLastSyncedRainCount(0)} className="text-emerald-600 hover:opacity-75 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* TARJETAS DE MÉTRICAS HÍDRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. SATELITAL + PLUVIÓMETRO */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <CloudRain size={14} /> Precipitación (BD + Satélite)
              </span>
              <span className="px-2 py-0.5 bg-sky-500/10 text-sky-300 rounded text-[9px] font-mono font-bold border border-sky-500/20">
                Open-Meteo ERA5
              </span>
            </div>

            <div className="flex items-baseline gap-2 font-mono tabular-nums">
              <h3 className="text-4xl font-black tracking-tight text-white">
                {isLoadingAuto ? '...' : effectiveRainMm}
              </h3>
              <span className="text-sm font-bold text-slate-400">mm acumulados</span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Asentado en BD</span>
                <strong className="text-sky-300 tabular-nums">{manualRainMm} mm</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Últimos 7 Días (GFS)</span>
                <strong className="text-emerald-400 tabular-nums">{recentRain7d} mm</strong>
              </div>
            </div>
          </div>
          <Waves className="absolute -right-6 -bottom-6 text-sky-500/10 w-36 h-36 pointer-events-none" />
        </div>

        {/* 2. APORTE DE RIEGO ACTIVO */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Droplets size={14} /> Lámina de Riego Aplicada
              </span>
              <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded text-[9px] font-mono font-bold border border-emerald-200 dark:border-emerald-800/60">
                {location?.irrigationSystem || plot?.irrigationType || 'Riego Controlado'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 font-mono tabular-nums">
              <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {manualIrrigationMm}
              </h3>
              <span className="text-sm font-bold text-slate-400">mm en lote</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Eventos de Riego</span>
              <strong className="text-slate-800 dark:text-slate-200 tabular-nums">
                {manualRecords.filter(r => r.type === 'Riego').length} aplicaciones
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Total Asentado BD</span>
              <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{totalManual} mm</strong>
            </div>
          </div>
        </div>

        {/* 3. BALANCE HÍDRICO DEL CULTIVO */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-indigo-500" /> Huella Hídrica Total del Ciclo
              </span>
              <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                {hydricCompletionPct}% de {waterNeedMm} mm
              </span>
            </div>

            <div className="flex items-baseline gap-2 font-mono tabular-nums mb-3">
              <h3 className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                {totalHydricFootprint}
              </h3>
              <span className="text-sm font-bold text-slate-400">/ {waterNeedMm} mm req.</span>
            </div>

            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${hydricCompletionPct}%` }}
              />
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-start gap-2">
            <Info size={13} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-snug">
              Cada lluvia detectada satelitalmente (≥ 0.5 mm) se asienta automáticamente en la base de datos sin requerir carga manual.
            </p>
          </div>
        </div>
      </div>

      {/* TABLA DE HISTORIAL PLUVIOMÉTRICO Y DE RIEGO */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-mono font-black uppercase tracking-wider text-slate-800 dark:text-white">
              Bitácora Cronológica de Aportes Hídricos en Base de Datos ({manualRecords.length} registros)
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Incluye lluvias asentadas automáticamente por satélite y riegos/lecturas manuales con soporte completo de alta, edición y baja.
            </p>
          </div>
          <button
            onClick={toggleSort}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>Orden: {sortOrder === 'desc' ? 'Más Recientes' : 'Más Antiguos'}</span>
            {sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Fecha & Hora Local</th>
                <th className="px-6 py-3.5">Fuente / Tipo</th>
                <th className="px-6 py-3.5 text-right">Lámina (mm)</th>
                <th className="px-6 py-3.5 text-right">Volumen Eq. (L/m²)</th>
                <th className="px-6 py-3.5">Detalle Técnico / Origen</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
              {manualRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-sans text-xs">
                    No se registran eventos de pluviómetro o riego en este período.
                  </td>
                </tr>
              ) : (
                manualRecords.map(r => {
                  const isAuto = String(r.id).startsWith('auto-rain-') || (r.notes || '').includes('Pluviómetro Satelital');
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{r.date}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Clock size={10} /> {r.time || '08:30'} hs
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                              r.type === 'Lluvia'
                                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                            }`}
                          >
                            {r.type === 'Lluvia' ? <CloudRain size={11} /> : <Droplets size={11} />}
                            {r.type}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              isAuto
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {isAuto ? 'AUTO-BD' : 'MANUAL'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right font-black text-slate-900 dark:text-white text-sm">
                        {Number(r.amountMm).toFixed(1)} mm
                      </td>
                      <td className="px-6 py-3.5 text-right text-slate-500 dark:text-slate-400">
                        {Number(r.amountMm).toFixed(1)} L/m²
                      </td>
                      <td className="px-6 py-3.5 font-sans text-xs text-slate-600 dark:text-slate-300 max-w-md">
                        {r.notes || 'Registro certificado en parcela'}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(r)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                            title="Editar registro hídrico"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteHydricRecord(r.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar registro hídrico"
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* MODAL PARA REGISTRAR O EDITAR INSUMO HÍDRICO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-xs font-mono font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                <Waves size={16} className="text-sky-600" />
                <span>{editingRecordId ? 'Editar Registro Hídrico' : 'Registrar Evento Hídrico en Lote'}</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingRecordId(null);
                }}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition text-slate-400 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Tipo de Aporte Hídrico
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'Lluvia' })}
                    className={`py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                      formData.type === 'Lluvia'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Lluvia (Pluviómetro)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'Riego' })}
                    className={`py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                      formData.type === 'Riego'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Riego Aplicado
                  </button>
                </div>
              </div>

              {formData.type === 'Riego' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                      Hora Inicio (Local)
                    </label>
                    <input
                      type="time"
                      required
                      className="w-full border dark:border-slate-700 border-slate-200 p-2.5 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 dark:text-white"
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                      Hora Fin (Local)
                    </label>
                    <input
                      type="time"
                      className="w-full border dark:border-slate-700 border-slate-200 p-2.5 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 dark:text-white"
                      value={formData.endTime}
                      onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                      Fecha del Riego
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full border dark:border-slate-700 border-slate-200 p-2.5 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 dark:text-white"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                      Fecha
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full border dark:border-slate-700 border-slate-200 p-2.5 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 dark:text-white"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                      Hora Lectura (Local)
                    </label>
                    <input
                      type="time"
                      required
                      className="w-full border dark:border-slate-700 border-slate-200 p-2.5 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 dark:text-white"
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                    Lámina Registrada (mm = L/m²)
                  </label>
                  {formData.type === 'Lluvia' && satelliteSuggestion.status === 'found' && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, amountMm: satelliteSuggestion.amount })}
                      className="text-[10px] font-mono font-bold bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-300 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={10} /> Satélite: {satelliteSuggestion.amount} mm
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.1"
                  required
                  className="w-full border dark:border-slate-700 border-slate-200 p-3 rounded-xl text-xl font-mono font-black bg-slate-50 dark:bg-slate-800 dark:text-white text-center tabular-nums"
                  value={formData.amountMm}
                  onChange={e => setFormData({ ...formData, amountMm: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Observaciones Técnicas
                </label>
                <input
                  type="text"
                  placeholder="Ej: Riego por goteo sector norte / Lluvia convectiva..."
                  className="w-full border dark:border-slate-700 border-slate-200 p-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 dark:text-white"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingRecordId(null);
                  }}
                  className="px-4 py-2.5 text-slate-500 font-mono font-bold text-xs uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{editingRecordId ? 'Guardar Cambios' : 'Asentar en BD'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
