import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  ArrowLeft, MapPin, Globe, Droplets, User, Building,
  Sprout, ChevronRight, Waves, Package, CheckCircle2,
  Truck, Activity, Archive, Warehouse, AlertCircle,
  AlertTriangle, LayoutGrid, Box, TrendingDown, QrCode,
  Calendar, ShieldCheck, Award, Layers, List, Lock,
  Clock, Tractor, FileCheck2, Search
} from 'lucide-react';
import WeatherWidget from '../components/WeatherWidget';
import MapEditor from '../components/MapEditor';
import HydricBalance from '../components/HydricBalance';
import { PlotIdentificationModal } from '../components/PlotIdentificationModal';
import { PlotCycleClosureModal } from '../components/PlotCycleClosureModal';
import { BarcodeSVG } from '../components/BarcodeSVG';
import { canAccessLocation, canAccessPlot, isCentralAdminOrSupervisor } from '../src/utils/structurePermissions';
import { Plot, Variety, Location, CAMPAIGNS } from '../types';

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 45%)`;
};

export default function LocationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    locations, plots, varieties, clients, seedMovements,
    seedBatches, currentUser, storagePoints, tasks,
    activeCampaign, setActiveCampaign
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'info' | 'water' | 'stock'>('info');
  const [unitViewMode, setUnitViewMode] = useState<'cards' | 'table'>('cards');
  const [unitStatusFilter, setUnitStatusFilter] = useState<'all' | 'Activa' | 'Scheduled' | 'Cosechada'>('all');
  const [unitSearch, setUnitSearch] = useState('');
  const [selectedPlotForQr, setSelectedPlotForQr] = useState<Plot | null>(null);
  const [selectedPlotForClosure, setSelectedPlotForClosure] = useState<Plot | null>(null);

  const isAdmin = isCentralAdminOrSupervisor(currentUser);
  const location = locations.find(l => l.id === id);

  // Control estricto de acceso por rol: Admin ve todo, Productor sólo su propio campo y unidades productivas
  const hasLocationAccess = useMemo(() => {
    if (!location) return false;
    return canAccessLocation(currentUser, location, clients);
  }, [currentUser, location, clients]);

  // Unidades productivas del campo filtradas por permisos de estructura
  const locationPlots = useMemo(() => {
    if (!location || !hasLocationAccess) return [];
    return plots.filter(p => p.locationId === id && canAccessPlot(currentUser, p, locations, clients));
  }, [plots, id, location, hasLocationAccess, currentUser, locations, clients]);

  // Unidades productivas filtradas por campaña, estado y búsqueda
  const filteredLocationPlots = useMemo(() => {
    return locationPlots.filter(p => {
      const matchSearch =
        !unitSearch.trim() ||
        p.name.toLowerCase().includes(unitSearch.toLowerCase()) ||
        (p.closureActCode && p.closureActCode.toLowerCase().includes(unitSearch.toLowerCase()));

      let matchCampaign = true;
      if (activeCampaign !== 'all') {
        const plotCamps = p.activeCampaigns || (p.campaign ? [p.campaign] : ['2025/2026']);
        matchCampaign = plotCamps.includes(activeCampaign) || p.campaign === activeCampaign;
      }

      let matchStatus = true;
      if (unitStatusFilter === 'Activa') {
        matchStatus = p.status === 'Activa' && !p.closureConfirmed;
      } else if (unitStatusFilter === 'Scheduled') {
        matchStatus = Boolean(p.isHarvestScheduled && !p.closureConfirmed && p.status !== 'Cosechada');
      } else if (unitStatusFilter === 'Cosechada') {
        matchStatus = Boolean(p.closureConfirmed || p.status === 'Cosechada');
      }

      return matchSearch && matchCampaign && matchStatus;
    });
  }, [locationPlots, unitSearch, activeCampaign, unitStatusFilter]);

  // Cálculo sincronizado de Ciclo Biológico y Fotoperiodo Local (idéntico a Parcelas de Cultivo)
  const getPlotSyncSummary = (p: Plot, vari?: Variety, loc?: Location) => {
    const cycleLimit = vari?.cycleDays || 150;
    const sowStr = p.sowingDate || '2026-01-13';
    const sowDate = new Date(`${sowStr}T09:00:00`);
    const endRefDate = (p.closureConfirmed || p.status === 'Cosechada') && p.closedDate
      ? new Date(`${p.closedDate}T12:00:00`)
      : new Date();
    const rawElapsed = Math.max(1, Math.floor((endRefDate.getTime() - sowDate.getTime()) / 86400000));
    const activeDds = (p.closureConfirmed || p.status === 'Cosechada') ? rawElapsed : Math.min(cycleLimit, rawElapsed);
    const progressPct = (p.closureConfirmed || p.status === 'Cosechada')
      ? 100
      : Math.min(100, Math.max(0, Math.round((activeDds / cycleLimit) * 100)));

    const stage =
      p.closureConfirmed || p.status === 'Cosechada' ? 'Ciclo Cerrado / Homologado' :
      progressPct >= 95 ? 'Maduración / Cosecha' :
      progressPct >= 72 ? 'Maduración' :
      progressPct >= 42 ? 'Floración' :
      progressPct >= 12 ? 'Vegetativo' : 'Emergencia';

    const coords =
      p.coordinates && !isNaN(p.coordinates.lat) && p.coordinates.lat !== 0
        ? p.coordinates
        : loc?.coordinates || { lat: -43.308576, lng: -65.289047 };

    const now = new Date();
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
    const doy = Math.max(1, Math.min(366, Math.floor((now.getTime() - startOfYear.getTime()) / 86400000)));
    const gamma = ((2 * Math.PI) / 365) * (doy - 1 + 0.5);
    const eqTime =
      229.18 *
      (0.000075 +
        0.001868 * Math.cos(gamma) -
        0.032077 * Math.sin(gamma) -
        0.014615 * Math.cos(2 * gamma) -
        0.040849 * Math.sin(2 * gamma));
    const decl =
      0.006918 -
      0.399912 * Math.cos(gamma) +
      0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) +
      0.000907 * Math.sin(2 * gamma) -
      0.002697 * Math.cos(3 * gamma) +
      0.00148 * Math.sin(3 * gamma);
    const latRad = (coords.lat * Math.PI) / 180;
    const zenithRad = (90.833 * Math.PI) / 180;
    const cosH = Math.max(
      -0.999,
      Math.min(0.999, Math.cos(zenithRad) / (Math.cos(latRad) * Math.cos(decl)) - Math.tan(latRad) * Math.tan(decl))
    );
    const hourAngleDeg = (Math.acos(cosH) * 180) / Math.PI;
    const solarNoonMin = 720 - 4 * coords.lng - eqTime - 180;
    const srMin = Math.round(solarNoonMin - hourAngleDeg * 4);
    const ssMin = Math.round(solarNoonMin + hourAngleDeg * 4);
    const fmt = (m: number) => {
      const n = ((m % 1440) + 1440) % 1440;
      return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
    };
    const dayH = (2 * hourAngleDeg) / 15;
    const dh = Math.floor(dayH);
    const dm = Math.round((dayH - dh) * 60);

    return {
      cycleLimit,
      sowStr,
      activeDds,
      progressPct,
      stage,
      coords,
      sunriseLocal: fmt(srMin),
      sunsetLocal: fmt(ssMin),
      photoperiodFormatted: `${dh}h ${String(dm === 60 ? 0 : dm).padStart(2, '0')}m`
    };
  };

  // Estadísticas agronómicas del establecimiento
  const unitStats = useMemo(() => {
    const activeCount = locationPlots.filter(p => p.status === 'Activa' && !p.closureConfirmed).length;
    const scheduledCount = locationPlots.filter(p => p.isHarvestScheduled && !p.closureConfirmed && p.status !== 'Cosechada').length;
    const closedCount = locationPlots.filter(p => p.closureConfirmed || p.status === 'Cosechada').length;
    const totalHa = locationPlots.reduce((sum, p) => {
      let area = p.surfaceArea || 0;
      if (p.surfaceUnit === 'm2') area = area / 10000;
      if (p.surfaceUnit === 'ac') area = area * 0.404686;
      return sum + area;
    }, 0);
    return {
      total: locationPlots.length,
      activeCount,
      scheduledCount,
      closedCount,
      totalHa
    };
  }, [locationPlots]);

  // --- LÓGICA DE INVENTARIO ---
  const linkedStorages = useMemo(() => {
    if (!location) return [];
    const ownerClientId = location.clientId || 'INTERNAL';
    return storagePoints.filter(sp => {
      const spOwnerId = sp.clientId || 'INTERNAL';
      return spOwnerId === ownerClientId;
    });
  }, [location, storagePoints]);

  const stockInventory = useMemo(() => {
    const linkedIds = linkedStorages.map(s => s.id);
    const batchesInScope = seedBatches.filter(
      b => linkedIds.includes(b.storagePointId || '') && b.remainingQuantity > 0
    );

    const consolidated: Record<string, { variety: string; totalKg: number; count: number }> = {};
    batchesInScope.forEach(b => {
      const varId = b.varietyId;
      const varName = varieties.find(v => v.id === varId)?.name || 'Desconocida';
      if (!consolidated[varId]) {
        consolidated[varId] = { variety: varName, totalKg: 0, count: 0 };
      }
      consolidated[varId].totalKg += b.remainingQuantity;
      consolidated[varId].count += 1;
    });

    const byStorage: Record<string, { name: string; city: string; items: { variety: string; kg: number; batchCode: string }[] }> = {};
    batchesInScope.forEach(b => {
      const sp = storagePoints.find(s => s.id === b.storagePointId);
      if (!sp) return;
      const varName = varieties.find(v => v.id === b.varietyId)?.name || 'Desconocida';
      if (!byStorage[sp.id]) {
        byStorage[sp.id] = { name: sp.name, city: sp.city || '', items: [] };
      }
      byStorage[sp.id].items.push({
        variety: varName,
        kg: b.remainingQuantity,
        batchCode: b.batchCode
      });
    });

    return {
      consolidated: Object.values(consolidated),
      byStorage: Object.values(byStorage),
      hasStock: batchesInScope.length > 0
    };
  }, [seedBatches, linkedStorages, varieties, storagePoints]);

  const consumedStock = useMemo(() => {
    return locationPlots.reduce((acc, p) => {
      let usedKg = Number(p.usedSeedValue || 0);
      if (p.usedSeedUnit === 'gr') usedKg /= 1000;
      if (p.usedSeedUnit === 'tn') usedKg *= 1000;
      const varName = varieties.find(v => v.id === p.varietyId)?.name || 'Genética S/D';
      if (!acc[varName]) acc[varName] = 0;
      acc[varName] += usedKg;
      return acc;
    }, {} as Record<string, number>);
  }, [locationPlots, varieties]);

  const receivedMaterials = useMemo(() => {
    const linkedIds = linkedStorages.map(s => s.id);
    return seedMovements
      .filter(m => linkedIds.includes(m.targetLocationId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [seedMovements, linkedStorages]);

  const activePlotLayers = useMemo(() => {
    return locationPlots
      .filter(p => p.polygon && p.polygon.length > 2)
      .map(p => {
        const vari = varieties.find(v => v.id === p.varietyId);
        return {
          id: p.id,
          polygon: p.polygon!,
          label: `${p.name} (${p.surfaceArea} ${p.surfaceUnit})`,
          shortLabel: p.name,
          subLabel: `${vari?.name || 'Ensayo'} · ${p.surfaceArea} ${p.surfaceUnit}`,
          color: p.color || stringToColor(p.name)
        };
      });
  }, [locationPlots, varieties]);

  const client = clients.find(c => c.id === location?.clientId);
  const ownerLabel = client ? client.name : location?.ownerName || 'Planta Central (Propio)';

  if (!location) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl mx-auto mt-10 space-y-4">
        <AlertCircle size={40} className="mx-auto text-slate-400" />
        <h2 className="text-lg font-black uppercase text-slate-800 dark:text-white">Establecimiento no encontrado</h2>
        <Link to="/locations" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-mono font-bold uppercase">
          <ArrowLeft size={14} /> Volver a Campos y Sitios
        </Link>
      </div>
    );
  }

  if (!hasLocationAccess) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 max-w-xl mx-auto mt-10 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto border border-rose-500/20">
          <Lock size={28} />
        </div>
        <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white">Acceso Restringido por Rol y Establecimiento</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Su perfil de usuario (<strong>{currentUser?.name}</strong>) sólo tiene acceso autorizado a las unidades productivas y establecimientos vinculados a su titularidad.
        </p>
        <Link
          to="/locations"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase"
        >
          <ArrowLeft size={14} /> Ir a Mis Establecimientos Autorizados
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      {/* BARRA SUPERIOR DE NAVEGACIÓN Y PESTAÑAS DEL ESTABLECIMIENTO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/locations"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 font-mono font-bold uppercase text-xs transition shadow-sm"
          >
            <ArrowLeft size={14} />
            <span>Campos y Sitios</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700 font-mono">/</span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-mono font-bold uppercase">
            Ficha Completa del Establecimiento
          </span>
        </div>

        <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'info'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Unidades Productivas ({unitStats.total})
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Insumos & Semillas
          </button>
          <button
            onClick={() => setActiveTab('water')}
            className={`px-5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'water'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Recurso Hídrico
          </button>
        </div>
      </div>

      {/* CABECERA INSTITUCIONAL Y TÉCNICA DEL CAMPO / SITIO */}
      <div className="bg-white dark:bg-slate-900/95 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {location.status || 'Activo'} · {location.siteType || 'Campo Extensivo'}
              </span>
              {location.renspaNumber && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  RENSPA: {location.renspaNumber}
                </span>
              )}
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                Titular: {ownerLabel}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                Acceso: {isAdmin ? 'Administrador Central (Vista Total)' : 'Productor / Titular Asignado'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              {location.name}
            </h1>
            <p className="text-xs sm:text-sm font-mono text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
              <MapPin size={14} className="text-emerald-500 shrink-0" />
              <span>{location.city}, {location.province} · {location.address || 'Zona Rural Productiva'}</span>
              {location.coordinates && (
                <span className="text-slate-400">
                  (GPS: {Number(location.coordinates.lat).toFixed(5)}°, {Number(location.coordinates.lng).toFixed(5)}°)
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to={`/plots?locationId=${location.id}`}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-2 shadow-sm"
            >
              <Sprout size={15} />
              <span>Abrir en Padrón de Parcelas</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* KPIs SINCRONIZADOS DEL CAMPO Y SUS UNIDADES PRODUCTIVAS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-6 font-mono tabular-nums">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Unidades Productivas</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {unitStats.total} <span className="text-xs font-normal text-slate-400">lotes</span>
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
              {unitStats.activeCount} en ciclo activo
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Superficie Declarada</span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {location.capacityHa || unitStats.totalHa.toFixed(1)} <span className="text-xs font-normal text-slate-400">ha</span>
            </p>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Implantada: {unitStats.totalHa.toFixed(2)} ha
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Suelo Base (Heredable)</span>
            <p className="text-base font-black text-slate-900 dark:text-white mt-1 truncate" title={location.soilType}>
              {location.soilType || 'Franco'}
            </p>
            <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
              Clima: {location.climate || 'Templado'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Sistema de Riego</span>
            <p className="text-base font-black text-sky-600 dark:text-sky-400 mt-1 truncate">
              {location.irrigationSystem || 'Goteo'}
            </p>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Herencia automática a lotes
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Cosechas Programadas</span>
            <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
              {unitStats.scheduledCount}
            </p>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Vinculadas a Labores
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/60">
            <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 block">Ciclos Homologados</span>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
              {unitStats.closedCount}
            </p>
            <span className="text-[10px] text-amber-800 dark:text-amber-400 font-bold block mt-0.5">
              Con Acta de Siembra + QR/Barcode
            </span>
          </div>
        </div>
      </div>

      {activeTab === 'info' && (
        <div className="space-y-8 animate-in fade-in">
          {/* =================================================================
              SECCIÓN CENTRAL: UNIDADES PRODUCTIVAS DEL CAMPO
              (DISEÑO UNIFICADO 100% CON PARCELAS DE CULTIVO + CIERRE DE CICLO)
          ================================================================= */}
          <div className="bg-white dark:bg-slate-900/95 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-emerald-600" />
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Unidades Productivas del Establecimiento ({filteredLocationPlots.length} / {locationPlots.length})
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Visualización sincronizada con Parcelas de Cultivo. Haga clic en <strong>Cierre / Cosecha</strong> o <strong>Doc. Siembra</strong> en cualquier unidad para registrar fecha y hora, vincular Labores Agrícolas y emitir el Documento Oficial Homologado con QR y Código de Barras.
                </p>
              </div>

              {/* Controles de Vista, Campaña y Estado */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar unidad o acta..."
                    value={unitSearch}
                    onChange={e => setUnitSearch(e.target.value)}
                    className="pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  />
                </div>

                <select
                  value={activeCampaign}
                  onChange={e => setActiveCampaign(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none dark:text-white"
                >
                  <option value="all">Todas las Campañas</option>
                  {CAMPAIGNS.map(c => (
                    <option key={c} value={c}>Campaña {c}</option>
                  ))}
                </select>

                <select
                  value={unitStatusFilter}
                  onChange={e => setUnitStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none dark:text-white"
                >
                  <option value="all">Todos los Estados ({locationPlots.length})</option>
                  <option value="Activa">En Ciclo Activo ({unitStats.activeCount})</option>
                  <option value="Scheduled">Cosecha Programada ({unitStats.scheduledCount})</option>
                  <option value="Cosechada">Ciclo Cerrado / Homologado ({unitStats.closedCount})</option>
                </select>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setUnitViewMode('cards')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      unitViewMode === 'cards'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LayoutGrid size={14} />
                    <span>Tarjetas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitViewMode('table')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      unitViewMode === 'table'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <List size={14} />
                    <span>Tabla Técnica</span>
                  </button>
                </div>
              </div>
            </div>

            {filteredLocationPlots.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                <Sprout size={36} className="mx-auto text-slate-400" />
                <p className="text-sm font-mono font-bold uppercase text-slate-700 dark:text-slate-300">
                  No se encontraron Unidades Productivas con los filtros actuales
                </p>
                <p className="text-xs text-slate-500">
                  Pruebe seleccionando "Todas las Campañas" o "Todos los Estados".
                </p>
              </div>
            ) : unitViewMode === 'table' ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full text-xs text-left font-mono tabular-nums">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5">Unidad Productiva</th>
                      <th className="px-4 py-3.5">Genética & Lote Semilla INASE</th>
                      <th className="px-4 py-3.5">Ciclo Fenológico & Siembra</th>
                      <th className="px-4 py-3.5">Cierre / Cosecha & Labores</th>
                      <th className="px-4 py-3.5">Código de Barras / Acta</th>
                      <th className="px-4 py-3.5 text-right">Superficie</th>
                      <th className="px-4 py-3.5 text-right">Gestión & Trazabilidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLocationPlots.map(p => {
                      const vari = varieties.find(v => v.id === p.varietyId);
                      const sync = getPlotSyncSummary(p, vari, location);
                      const linkedBatch =
                        seedBatches.find(b => b.id === p.seedBatchId) ||
                        seedBatches.find(b => b.varietyId === p.varietyId && (!b.materialType || b.materialType === 'seed')) ||
                        seedBatches[0];
                      const isClosed = Boolean(p.closureConfirmed || p.status === 'Cosechada');
                      const actCode = p.closureActCode || `ACTA-SIEMBRA-${(p.campaign || '2526').replace('/', '')}-${p.id.slice(-5).toUpperCase()}`;
                      const barcodeVal = p.closureBarcode || `7798394${p.id.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 6)}2026`;
                      const plotLabors = (tasks || []).filter(t => t.plotId === p.id);

                      return (
                        <tr
                          key={p.id}
                          onClick={() => navigate(`/plots/${p.id}`)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: p.color || stringToColor(p.name) }}
                              />
                              <div>
                                <strong className="text-slate-900 dark:text-white font-black uppercase block">
                                  {p.name}
                                </strong>
                                <span className="text-[10px] text-slate-400 block">
                                  {p.block || p.type} {p.replicate ? `· R${p.replicate}` : ''} · Campaña {p.campaign || '2025/2026'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800 inline-block">
                              {vari?.name || 'Cultivar Homologado'}
                            </span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 block mt-1">
                              Lote: <strong>{linkedBatch?.certificationNumber || linkedBatch?.batchCode || '103'}</strong> · Rótulo: {linkedBatch?.labelSerialNumber || '00000012'}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="w-40 space-y-1">
                              <div className="flex justify-between text-[10px]">
                                <span className={isClosed ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                                  {sync.stage}
                                </span>
                                <span className="text-slate-400">{sync.activeDds}/{sync.cycleLimit}d</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isClosed ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${sync.progressPct}%` }}
                                />
                              </div>
                              <span className="text-[9.5px] text-slate-400 block">
                                Siembra: {sync.sowStr} · ☀️ {sync.photoperiodFormatted}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            {isClosed ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase">
                                  <Lock size={10} /> Confirmado: {p.closedDate} {p.closedTime || ''}
                                </span>
                                <span className="text-[9.5px] text-slate-500 block">
                                  {plotLabors.length} Labores · Rinde: {p.harvestYieldKg ? `${p.harvestYieldKg} kg` : 'Homologado'}
                                </span>
                              </div>
                            ) : p.isHarvestScheduled && p.scheduledHarvestDate ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 text-[10px] font-bold uppercase">
                                  <Clock size={10} /> Prog: {p.scheduledHarvestDate} {p.scheduledHarvestTime || ''}
                                </span>
                                <span className="text-[9.5px] text-slate-500 block">
                                  {plotLabors.length} Labores vinculadas
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                                  En curso agronómico
                                </span>
                                <span className="text-[9.5px] text-slate-400 block">
                                  {plotLabors.length} Labores registradas
                                </span>
                              </div>
                            )}
                          </td>

                          <td
                            className="px-4 py-4"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedPlotForClosure(p);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div>
                                <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300 block">
                                  {actCode}
                                </span>
                                <span className="text-[9px] text-slate-400 block">
                                  GS1: {barcodeVal}
                                </span>
                              </div>
                              <div className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0 hidden xl:block">
                                <BarcodeSVG value={barcodeVal} height={18} barWidth={0.85} showText={false} />
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-right">
                            <strong className="text-slate-900 dark:text-white block">
                              {p.surfaceArea} {p.surfaceUnit}
                            </strong>
                            <span className="text-[9.5px] text-slate-400 block">
                              {p.density || 48} pl/m²
                            </span>
                          </td>

                          <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedPlotForClosure(p)}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase flex items-center gap-1 border transition cursor-pointer ${
                                  isClosed
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                }`}
                              >
                                <FileCheck2 size={12} />
                                <span>{isClosed ? 'Doc. Siembra' : 'Cierre / Cosecha'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedPlotForQr(p)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                                title="Rótulo QR, Código de Barras y Cartel Tranquera"
                              >
                                <QrCode size={13} />
                              </button>

                              <Link
                                to={`/plots/${p.id}`}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 text-white text-[10px] font-mono font-bold uppercase flex items-center gap-1"
                              >
                                <span>Ficha</span>
                                <ChevronRight size={11} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* VISTA DE TARJETAS UNIFICADA CON PARCELAS DE CULTIVO (SIN REDUNDANCIAS) */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredLocationPlots.map(p => {
                  const vari = varieties.find(v => v.id === p.varietyId);
                  const sync = getPlotSyncSummary(p, vari, location);
                  const linkedBatch =
                    seedBatches.find(b => b.id === p.seedBatchId) ||
                    seedBatches.find(b => b.varietyId === p.varietyId && (!b.materialType || b.materialType === 'seed')) ||
                    seedBatches[0];
                  const isClosed = Boolean(p.closureConfirmed || p.status === 'Cosechada');
                  const actCode = p.closureActCode || `ACTA-SIEMBRA-${(p.campaign || '2526').replace('/', '')}-${p.id.slice(-5).toUpperCase()}`;
                  const barcodeVal = p.closureBarcode || `7798394${p.id.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 6)}2026`;
                  const plotLabors = (tasks || []).filter(t => t.plotId === p.id);

                  return (
                    <div
                      key={p.id}
                      className={`bg-white dark:bg-slate-900/95 rounded-2xl border transition-all flex flex-col h-full overflow-hidden group hover:shadow-md ${
                        isClosed
                          ? 'border-amber-300/80 dark:border-amber-800/70'
                          : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-3.5">
                          {/* 1. Cabecera de la Unidad Productiva */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                                style={{ backgroundColor: p.color || stringToColor(p.name) }}
                              >
                                <Sprout size={19} />
                              </div>
                              <div>
                                <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                                  {p.type} · Campaña {p.campaign || '2025/2026'}
                                </span>
                                <Link
                                  to={`/plots/${p.id}`}
                                  className="font-mono font-black text-slate-900 dark:text-white text-base uppercase tracking-tight hover:text-emerald-600 transition-colors block"
                                >
                                  {p.name}
                                </Link>
                              </div>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono font-black uppercase shrink-0 border flex items-center gap-1 ${
                                isClosed
                                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                  : p.isHarvestScheduled
                                  ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                              }`}
                            >
                              {isClosed ? <Lock size={10} /> : null}
                              <span>
                                {isClosed ? 'Ciclo Homologado' : p.isHarvestScheduled ? 'Cosecha Prog.' : `● ${p.status}`}
                              </span>
                            </span>
                          </div>

                          {/* 2. Barra de Evolución Fenológica y Fotoperiodo Local */}
                          <div className="p-3 rounded-xl bg-slate-900 text-white font-mono tabular-nums space-y-2">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className={isClosed ? 'text-amber-400 font-bold uppercase' : 'text-emerald-400 font-bold uppercase'}>
                                {sync.stage} (Siembra {sync.sowStr})
                              </span>
                              <span className="text-slate-300 font-bold">
                                {sync.activeDds}/{sync.cycleLimit} DDS ({sync.progressPct}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isClosed
                                    ? 'bg-gradient-to-r from-amber-500 to-emerald-400'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                }`}
                                style={{ width: `${sync.progressPct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800 text-slate-300">
                              <span className="text-amber-300 font-bold">
                                ☀️ Fotoperiodo: {sync.photoperiodFormatted}
                              </span>
                              <span>
                                Salida {sync.sunriseLocal} · Ocaso {sync.sunsetLocal}
                              </span>
                            </div>
                          </div>

                          {/* 3. Grilla Técnica Consolidada (Sin redundancias) */}
                          <div className="grid grid-cols-3 gap-1.5 text-[9.5px] font-mono tabular-nums">
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 truncate">
                              <span className="text-[8px] font-bold uppercase text-slate-400 block">Superficie & Marco</span>
                              <strong className="text-slate-900 dark:text-slate-100 text-[10.5px] block truncate">
                                {p.surfaceArea} {p.surfaceUnit} · {p.density || 48}pl/m²
                              </strong>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 truncate">
                              <span className="text-[8px] font-bold uppercase text-slate-400 block">Cultivar & DBCA</span>
                              <strong className="text-emerald-600 dark:text-emerald-400 text-[10.5px] block truncate" title={vari?.name}>
                                {vari?.name || 'Certificada'} ({p.block || 'B1'}·R{p.replicate || 1})
                              </strong>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 truncate">
                              <span className="text-[8px] font-bold uppercase text-slate-400 block">Suelo & Riego</span>
                              <strong className="text-sky-600 dark:text-sky-400 text-[10.5px] block truncate">
                                {p.soilType || location.soilType || 'Franco'} · {p.irrigationType || location.irrigationSystem || 'Goteo'}
                              </strong>
                            </div>
                          </div>

                          {/* 4. Bloque Unificado: Lote Semilla INASE + Labores + Cierre de Ciclo & Código de Barras GS1 */}
                          <div
                            onClick={() => setSelectedPlotForClosure(p)}
                            className={`p-3 rounded-xl border text-[10px] font-mono cursor-pointer transition space-y-2 ${
                              isClosed
                                ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-300 dark:border-amber-800 hover:border-amber-400'
                                : p.isHarvestScheduled
                                ? 'bg-sky-50/70 dark:bg-sky-950/25 border-sky-200 dark:border-sky-800 hover:border-sky-400'
                                : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/50 hover:border-indigo-400'
                            }`}
                            title="Haga clic para gestionar Fecha/Hora de Cierre de Ciclo, Labores Agrícolas y Documento Oficial de Siembra"
                          >
                            <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-slate-200/70 dark:border-slate-800">
                              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 truncate">
                                <Award size={11} className="text-emerald-600 shrink-0" />
                                Semilla INASE: {linkedBatch?.certificationNumber || linkedBatch?.batchCode || '103'} (Rótulo {linkedBatch?.labelSerialNumber || '00000012'})
                              </span>
                              <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold shrink-0 flex items-center gap-1">
                                <Tractor size={10} />
                                {plotLabors.length} Labores
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 space-y-0.5">
                                <span className="text-[8.5px] font-black uppercase block text-slate-500 dark:text-slate-400">
                                  {isClosed
                                    ? '✓ Ciclo Homologado · Ver Documento de Siembra'
                                    : p.isHarvestScheduled
                                    ? '⏱ Cosecha Programada · Clic para Confirmar'
                                    : '🏁 Cierre de Ciclo / Cosecha · Clic para Gestionar'}
                                </span>
                                <strong className="text-slate-900 dark:text-white block truncate text-[10.5px]">
                                  {isClosed
                                    ? `${p.closedDate || p.closedAt || ''} ${p.closedTime ? `${p.closedTime} hs` : ''} · ${actCode}`
                                    : p.isHarvestScheduled
                                    ? `Prog: ${p.scheduledHarvestDate} ${p.scheduledHarvestTime || ''} hs · ${actCode}`
                                    : `${actCode} · Resp: ${p.sowingResponsibleName || p.samplingResponsibleName || 'M. Quintana'}`}
                                </strong>
                              </div>
                              <div className="bg-white px-2 py-1 rounded-lg border border-slate-200 shrink-0">
                                <BarcodeSVG value={barcodeVal} height={22} barWidth={0.95} showText={false} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 5. Acciones Inferiores (Sin botón redundante de Cierre) */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                          <Link
                            to={`/plots/${p.id}`}
                            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition shadow-sm"
                          >
                            <span>Ficha Técnica</span>
                            <ChevronRight size={13} />
                          </Link>

                          <Link
                            to={`/agriculture-40?plotId=${p.id}`}
                            className="p-2 text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 rounded-xl transition border border-emerald-200 dark:border-emerald-800/60"
                            title="Teledetección Satelital Sentinel-2A & NDVI"
                          >
                            <Layers size={14} />
                          </Link>

                          <button
                            type="button"
                            onClick={() => setSelectedPlotForQr(p)}
                            className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 rounded-xl transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                            title="Rótulo QR, Código de Barras y Cartel Oficial de Tranquera (Ley 27.669)"
                          >
                            <QrCode size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FILA INFERIOR: CARTOGRAFÍA GEODÉSICA DEL CAMPO + CLIMA LOCAL Y SOCIO TITULAR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  <Globe size={16} className="text-emerald-500" />
                  <span>Cartografía Geodésica del Establecimiento y Unidades Productivas</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Clic en cualquier polígono para abrir la Unidad Productiva
                </span>
              </div>
              <div className="h-[460px] w-full bg-slate-100">
                {(location.polygon && location.polygon.length > 2) || activePlotLayers.length > 0 ? (
                  <MapEditor
                    initialCenter={location.coordinates}
                    initialPolygon={location.polygon || []}
                    polygonShortLabel={location.name}
                    polygonSubLabel={`${locationPlots.length} Unidades Productivas`}
                    extraPolygons={activePlotLayers}
                    onExtraPolygonClick={plotId => navigate(`/plots/${plotId}`)}
                    readOnly={true}
                    height="100%"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 font-mono text-xs">
                    Sin delimitación perimetral configurada.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 font-mono font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  Pronóstico Meteorológico Local
                </div>
                <WeatherWidget
                  lat={location.coordinates?.lat || 0}
                  lng={location.coordinates?.lng || 0}
                  showForecast={true}
                />
                <div className="p-3 bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider text-center">
                  Estación Satelital Open-Meteo Sincronizada
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-6">
                <h3 className="font-mono font-black text-slate-800 dark:text-white mb-4 uppercase text-xs tracking-wider flex items-center gap-2">
                  <Building size={15} className="text-emerald-500" />
                  <span>Socio Productor / Titular del Campo</span>
                </h3>
                {client ? (
                  <div className="space-y-4">
                    <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-200/70 dark:border-indigo-900/50">
                      <p className="text-lg font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-tight">
                        {client.name}
                      </p>
                      <p className="text-xs text-indigo-700 dark:text-indigo-400 font-mono font-bold mt-1 flex items-center gap-1.5">
                        <User size={12} /> {client.contactName}
                      </p>
                      {client.cuit && (
                        <p className="text-[11px] font-mono text-slate-500 mt-1">CUIT: {client.cuit}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <a
                        href={`mailto:${client.email}`}
                        className="py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-bold uppercase text-center hover:bg-emerald-50 transition"
                      >
                        Enviar Email
                      </a>
                      <a
                        href={`tel:${client.contactPhone}`}
                        className="py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-bold uppercase text-center hover:bg-emerald-50 transition"
                      >
                        Llamar
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 text-xs font-mono">
                    Operación directa por Planta Central ({ownerLabel}).
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="animate-in fade-in slide-in-from-top-2 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Package size={22} className="text-amber-600" />
                <span>Inventario & Stock de Semillas del Establecimiento</span>
              </h2>
              <p className="text-xs font-mono text-slate-500 mt-1">
                Recursos disponibles en depósitos vinculados al titular: <strong>{ownerLabel}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {linkedStorages.length > 0 ? (
                linkedStorages.map(sp => (
                  <div
                    key={sp.id}
                    className="bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center text-xs font-mono font-bold text-slate-600 dark:text-slate-300 shadow-sm"
                  >
                    <Warehouse size={13} className="mr-2 text-emerald-500" /> {sp.name}
                  </div>
                ))
              ) : (
                <span className="bg-rose-50 text-rose-600 px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase border border-rose-200 flex items-center">
                  <AlertTriangle size={14} className="mr-2" /> Sin Depósitos Vinculados
                </span>
              )}
            </div>
          </div>

          {!stockInventory.hasStock && linkedStorages.length > 0 && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center">
              <Package size={32} className="text-slate-300 mb-2" />
              <p className="text-slate-400 font-mono text-xs">
                No hay stock de semillas disponible en los depósitos vinculados.
              </p>
              <Link
                to="/seed-batches"
                className="mt-4 text-xs font-mono font-bold text-emerald-600 uppercase hover:underline"
              >
                Gestionar Inventario Logístico →
              </Link>
            </div>
          )}

          {stockInventory.hasStock && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {stockInventory.consolidated.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600">
                      <Sprout size={22} />
                    </div>
                    <div className="text-right font-mono">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Variedad</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{item.variety}</p>
                    </div>
                  </div>
                  <div className="space-y-1 font-mono tabular-nums">
                    <p className="text-3xl font-black text-slate-900 dark:text-white">
                      {item.totalKg.toLocaleString()} <span className="text-sm text-slate-400">kg</span>
                    </p>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                      <CheckCircle2 size={11} /> Disponible para siembra ({item.count} lotes)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {Object.keys(consumedStock).length > 0 && (
            <div className="bg-sky-50/70 dark:bg-sky-950/20 p-6 rounded-2xl border border-sky-200/70 dark:border-sky-900/40">
              <h3 className="text-xs font-mono font-black text-sky-800 dark:text-sky-300 uppercase tracking-wider flex items-center mb-4">
                <TrendingDown size={15} className="mr-2" /> Semilla Aplicada en Unidades Productivas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono tabular-nums">
                {Object.entries(consumedStock).map(([variety, kg]) => (
                  <div
                    key={variety}
                    className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-sky-100 dark:border-slate-800 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Cultivar</p>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{variety}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-sky-600">{(kg as number).toFixed(1)} kg</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Implantado</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-mono font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Box size={15} className="text-emerald-500" />
                <span>Historial de Ingresos y Remitos ({receivedMaterials.length})</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left font-mono tabular-nums">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Fecha</th>
                    <th className="px-6 py-3.5">Remito / Guía</th>
                    <th className="px-6 py-3.5">Depósito Destino</th>
                    <th className="px-6 py-3.5">Material (Lote)</th>
                    <th className="px-6 py-3.5 text-center">Cantidad</th>
                    <th className="px-6 py-3.5 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {receivedMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-400">
                        No hay remitos vinculados a los depósitos de este establecimiento.
                      </td>
                    </tr>
                  ) : (
                    receivedMaterials.map(m => {
                      const batch = seedBatches.find(b => b.id === m.batchId);
                      const vari = varieties.find(v => v.id === batch?.varietyId);
                      const storage = storagePoints.find(s => s.id === m.targetLocationId);
                      return (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{m.date}</td>
                          <td className="px-6 py-4 text-sky-600 font-bold">{m.transportGuideNumber || 'S/N'}</td>
                          <td className="px-6 py-4 text-slate-500 uppercase">{storage?.name || 'Depósito'}</td>
                          <td className="px-6 py-4">
                            <strong className="text-slate-900 dark:text-white uppercase block">{vari?.name}</strong>
                            <span className="text-[10px] text-slate-400">Lote: {batch?.batchCode}</span>
                          </td>
                          <td className="px-6 py-4 text-center font-black text-emerald-600">{m.quantity.toLocaleString()} kg</td>
                          <td className="px-6 py-4 text-right">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {m.status}
                            </span>
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

      {activeTab === 'water' && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-sky-600 p-3.5 rounded-2xl text-white shadow-sm">
                <Waves size={26} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Monitoreo Hídrico del Establecimiento
                </h2>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  Balance pluviométrico satelital vs aportes manuales acumulados desde la fecha de siembra
                </p>
              </div>
            </div>
            <HydricBalance
              locationId={location.id}
              startDate={
                locationPlots.reduce(
                  (earliest, p) => (p.sowingDate && p.sowingDate < earliest ? p.sowingDate : earliest),
                  new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                )
              }
            />
          </div>
        </div>
      )}

      {/* MODAL QR, CÓDIGO DE BARRAS Y CARTEL DE TRANQUERA */}
      {selectedPlotForQr && (
        <PlotIdentificationModal
          isOpen={!!selectedPlotForQr}
          onClose={() => setSelectedPlotForQr(null)}
          plot={plots.find(pl => pl.id === selectedPlotForQr.id) || selectedPlotForQr}
          location={location}
          variety={varieties.find(v => v.id === selectedPlotForQr.varietyId)}
          client={client}
          seedBatch={
            seedBatches.find(b => b.id === selectedPlotForQr.seedBatchId) ||
            seedBatches.find(b => b.varietyId === selectedPlotForQr.varietyId && (!b.materialType || b.materialType === 'seed')) ||
            seedBatches[0]
          }
        />
      )}

      {/* MODAL CIERRE DE CICLO / COSECHA & DOCUMENTO DE SIEMBRA HOMOLOGADO */}
      {selectedPlotForClosure && (
        <PlotCycleClosureModal
          isOpen={!!selectedPlotForClosure}
          onClose={() => setSelectedPlotForClosure(null)}
          plot={plots.find(pl => pl.id === selectedPlotForClosure.id) || selectedPlotForClosure}
          location={location}
          variety={varieties.find(v => v.id === selectedPlotForClosure.varietyId)}
          client={client}
          seedBatch={
            seedBatches.find(b => b.id === selectedPlotForClosure.seedBatchId) ||
            seedBatches.find(b => b.varietyId === selectedPlotForClosure.varietyId && (!b.materialType || b.materialType === 'seed')) ||
            seedBatches[0]
          }
        />
      )}
    </div>
  );
}
