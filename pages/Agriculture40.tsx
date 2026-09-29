import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  Sprout, Droplets, Satellite, Leaf, Download, RefreshCw, 
  MapPin, AlertCircle, ShieldCheck, CheckCircle2, TrendingUp, 
  Layers, Sun, Compass, ArrowRight, Activity, Thermometer,
  CloudRain, Zap, BarChart3, HelpCircle, FileText, Globe, Wind,
  Calendar, ChevronLeft, ChevronRight, Clock, Sliders, Camera,
  Plus, X, Info, Sparkles, Eye, ArrowUpRight, ArrowDownRight,
  Plane, Check, Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, Legend, Cell 
} from 'recharts';
import { MapContainer, TileLayer, Polygon, Marker, Tooltip as LeafletTooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  fetchLiveSoilAndAgroData, 
  calculateWaterEfficiency, 
  generateNDVITimeline, 
  exportAgro40CertificatePdf,
  generateDetailedSatellitePasses,
  exportSatelliteComparisonPDF
} from '../src/services/agro40Service';
import { SoilHealthData, WaterEfficiencyMetrics, NDVISample, SatellitePass, DroneFlight } from '../types';

const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    });
    observer.observe(map.getContainer());
    map.invalidateSize();
    return () => observer.disconnect();
  }, [map]);
  return null;
};

const MapRecenter = ({ polygon, center }: { polygon?: { lat: number; lng: number }[]; center?: { lat: number; lng: number } }) => {
  const map = useMap();
  useEffect(() => {
    if (polygon && polygon.length >= 3) {
      const bounds = L.latLngBounds(polygon.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
    } else if (center) {
      map.setView([center.lat, center.lng], 14);
    }
  }, [polygon, center, map]);
  return null;
};

export default function Agriculture40() {
  const { plots, locations, varieties, trialRecords, hydricRecords } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPlotId = searchParams.get('plotId');

  // Estado del lote seleccionado
  const [selectedPlotId, setSelectedPlotId] = useState<string>(urlPlotId || (plots.length > 0 ? plots[0].id : ''));
  const [activeTab, setActiveTab] = useState<'ndvi' | 'soil' | 'water' | 'simulator'>('ndvi');
  const [mapLayer, setMapLayer] = useState<'satellite' | 'ndvi_layer' | 'street'>('satellite');
  
  // Estados de datos Agro 4.0
  const [soilData, setSoilData] = useState<SoilHealthData | null>(null);
  const [isLoadingSoil, setIsLoadingSoil] = useState(false);
  const [simulationHa, setSimulationHa] = useState<number>(10);

  // Estados para Línea de Tiempo, Comparador Multitemporal y Drones
  const [ndviSubTab, setNdviSubTab] = useState<'timeline' | 'compare' | 'drones'>('timeline');
  const [selectedPassIndex, setSelectedPassIndex] = useState<number>(0);
  const [comparePassAIndex, setComparePassAIndex] = useState<number>(1);
  const [comparePassBIndex, setComparePassBIndex] = useState<number>(6);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [showDroneModal, setShowDroneModal] = useState<boolean>(false);

  // Vuelos de dron multiespectral registrados
  const [droneFlights, setDroneFlights] = useState<DroneFlight[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ht_drone_flights');
      if (stored) {
        try { return JSON.parse(stored); } catch (e) {}
      }
    }
    return [
      {
        id: 'df-1',
        plotId: 'plot-1',
        date: '2026-01-22',
        pilotName: 'Ing. Julián Pizarro',
        droneModel: 'DJI Mavic 3 Multispectral',
        flightAltitudeM: 65,
        resolutionCmPx: 2.1,
        sensorType: 'Multiespectral 4x5MP (G, R, RE, NIR)',
        ndviAverage: 0.83,
        observations: 'Ortomosaico de alta resolución. Cobertura foliar homogénea y vigor óptimo sin malezas.'
      }
    ];
  });

  // Campos del formulario para nuevo vuelo de dron
  const [droneDate, setDroneDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dronePilot, setDronePilot] = useState<string>('Ing. Julián Pizarro');
  const [droneModel, setDroneModel] = useState<string>('DJI Mavic 3 Multispectral');
  const [droneAltitude, setDroneAltitude] = useState<number>(70);
  const [droneResolution, setDroneResolution] = useState<number>(2.2);
  const [droneSensor, setDroneSensor] = useState<string>('RGB + RedEdge + NIR');
  const [droneNdvi, setDroneNdvi] = useState<number>(0.82);
  const [droneObs, setDroneObs] = useState<string>('');

  // Sincronizar selección con query param
  useEffect(() => {
    if (urlPlotId && urlPlotId !== selectedPlotId) {
      setSelectedPlotId(urlPlotId);
    }
  }, [urlPlotId]);

  const selectedPlot = useMemo(() => {
    return plots.find(p => p.id === selectedPlotId) || plots[0] || null;
  }, [plots, selectedPlotId]);

  const selectedLocation = useMemo(() => {
    if (!selectedPlot) return null;
    return locations.find(l => l.id === selectedPlot.locationId) || null;
  }, [locations, selectedPlot]);

  const selectedVariety = useMemo(() => {
    if (!selectedPlot) return null;
    return varieties.find(v => v.id === selectedPlot.varietyId) || null;
  }, [varieties, selectedPlot]);

  const plotTrials = useMemo(() => {
    if (!selectedPlot) return [];
    return trialRecords.filter(t => t.plotId === selectedPlot.id);
  }, [trialRecords, selectedPlot]);

  const plotHydricRecords = useMemo(() => {
    if (!selectedPlot) return [];
    return hydricRecords.filter(h => h.plotId === selectedPlot.id || (h.locationId === selectedPlot.locationId && !h.plotId));
  }, [hydricRecords, selectedPlot]);

  const totalRainMm = useMemo(() => {
    return plotHydricRecords.filter(h => h.type === 'Lluvia').reduce((sum, r) => sum + r.amountMm, 0);
  }, [plotHydricRecords]);

  const totalIrrigationMm = useMemo(() => {
    return plotHydricRecords.filter(h => h.type === 'Riego').reduce((sum, r) => sum + r.amountMm, 0);
  }, [plotHydricRecords]);

  // Cargar datos edafológicos y climáticos satelitales al cambiar de lote
  useEffect(() => {
    const loadSoil = async () => {
      if (!selectedPlot) return;
      setIsLoadingSoil(true);
      
      const lat = selectedPlot.coordinates?.lat || selectedLocation?.coordinates?.lat || -31.42;
      const lng = selectedPlot.coordinates?.lng || selectedLocation?.coordinates?.lng || -64.18;
      const soilHint = selectedLocation?.soilType;

      const result = await fetchLiveSoilAndAgroData(lat, lng, soilHint);
      setSoilData(result.soil);
      setIsLoadingSoil(false);
    };

    loadSoil();
  }, [selectedPlot, selectedLocation]);

  // Cálculos de eficiencia hídrica
  const waterMetrics: WaterEfficiencyMetrics = useMemo(() => {
    if (!selectedPlot) {
      return {
        plotAreaHa: 1, cycleDays: 110, cumulativeRainMm: 0, cumulativeIrrigationMm: 0,
        totalWaterAppliedMm: 0, totalWaterAppliedM3: 0, et0CumulativeMm: 450, hempEtcMm: 400,
        wueBiomassKgM3: 2.8, wueGrainKgM3: 0.6, waterSavedVsCornM3: 2600, waterSavedVsCottonM3: 5300,
        waterSavedVsAlfalfaM3: 6800, co2CapturedTonnes: 11.4, soilRestorationIndex: 85
      };
    }
    return calculateWaterEfficiency(selectedPlot, selectedVariety, totalRainMm, totalIrrigationMm, plotTrials);
  }, [selectedPlot, selectedVariety, totalRainMm, totalIrrigationMm, plotTrials]);

  // Curva de evolución NDVI
  const ndviSamples: NDVISample[] = useMemo(() => {
    if (!selectedPlot) return [];
    return generateNDVITimeline(selectedPlot.sowingDate || new Date().toISOString(), selectedVariety?.cycleDays || 110, plotTrials);
  }, [selectedPlot, selectedVariety, plotTrials]);

  // Serie temporal de pasadas satelitales (Sentinel-2 cada 5 días)
  const satellitePasses: SatellitePass[] = useMemo(() => {
    if (!selectedPlot) return [];
    return generateDetailedSatellitePasses(selectedPlot, selectedVariety, plotTrials);
  }, [selectedPlot, selectedVariety, plotTrials]);

  // Sincronizar índice inicial cuando se cargan las pasadas del lote
  useEffect(() => {
    if (satellitePasses.length > 0) {
      const defaultIdx = Math.min(Math.floor(satellitePasses.length * 0.65), satellitePasses.length - 1);
      setSelectedPassIndex(defaultIdx);
      setComparePassAIndex(Math.min(1, satellitePasses.length - 1));
      setComparePassBIndex(defaultIdx);
    }
  }, [satellitePasses.length, selectedPlotId]);

  const activePass = satellitePasses[selectedPassIndex] || satellitePasses[0] || null;
  const passA = satellitePasses[comparePassAIndex] || satellitePasses[0] || null;
  const passB = satellitePasses[comparePassBIndex] || satellitePasses[satellitePasses.length - 1] || null;

  // Función de mapeo de color y estilo según el índice NDVI
  const getNDVIColor = (val: number) => {
    if (val >= 0.70) {
      return { 
        stroke: '#10b981', 
        fill: '#22c55e', 
        text: 'text-emerald-500', 
        bg: 'bg-emerald-50 dark:bg-emerald-950/40', 
        border: 'border-emerald-500/30', 
        label: 'Vigor Óptimo (>0.7)' 
      };
    }
    if (val >= 0.40) {
      return { 
        stroke: '#f59e0b', 
        fill: '#fbbf24', 
        text: 'text-amber-500', 
        bg: 'bg-amber-50 dark:bg-amber-950/40', 
        border: 'border-amber-500/30', 
        label: 'Desarrollo Moderado (0.4-0.6)' 
      };
    }
    return { 
      stroke: '#ef4444', 
      fill: '#f87171', 
      text: 'text-red-500', 
      bg: 'bg-red-50 dark:bg-red-950/40', 
      border: 'border-red-500/30', 
      label: 'Suelo Desnudo / Emergencia (<0.2)' 
    };
  };

  const activePassColor = activePass ? getNDVIColor(activePass.ndviAverage) : { 
    stroke: '#10b981', 
    fill: '#22c55e', 
    text: 'text-emerald-500', 
    bg: 'bg-emerald-50 dark:bg-emerald-950/40', 
    border: 'border-emerald-500/30', 
    label: 'Vigor Óptimo' 
  };

  // Guardar nuevo vuelo de dron
  const handleSaveDrone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlot) return;
    const newFlight: DroneFlight = {
      id: `df-${Date.now()}`,
      plotId: selectedPlot.id,
      date: droneDate,
      pilotName: dronePilot,
      droneModel,
      flightAltitudeM: Number(droneAltitude),
      resolutionCmPx: Number(droneResolution),
      sensorType: droneSensor,
      ndviAverage: Number(droneNdvi),
      observations: droneObs || 'Vuelo registrado exitosamente.'
    };
    const updated = [newFlight, ...droneFlights];
    setDroneFlights(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ht_drone_flights', JSON.stringify(updated));
    }
    setShowDroneModal(false);
    setDroneObs('');
  };

  // Descargar Dictamen Comparativo Multitemporal en PDF
  const handleDownloadComparisonPdf = () => {
    if (!selectedPlot || !passA || !passB) return;
    exportSatelliteComparisonPDF(selectedPlot, selectedVariety, passA, passB);
  };

  // Polígono y coordenadas del mapa
  const plotPolygon = selectedPlot?.polygon && selectedPlot.polygon.length >= 3 ? selectedPlot.polygon : null;
  const mapCenter = selectedPlot?.coordinates || selectedLocation?.coordinates || { lat: -31.42, lng: -64.18 };

  // Descargar Certificado Técnico Oficial en PDF
  const handleDownloadPdf = () => {
    if (!selectedPlot || !soilData) return;
    exportAgro40CertificatePdf(selectedPlot, selectedLocation, selectedVariety, soilData, waterMetrics, ndviSamples);
  };

  // Comparativa de consumo hídrico
  const cropWaterComparisonData = [
    { crop: 'Cáñamo Industrial', consumoMm: waterMetrics.totalWaterAppliedMm || 420, fill: '#16a34a' },
    { crop: 'Maíz', consumoMm: 680, fill: '#eab308' },
    { crop: 'Algodón', consumoMm: 950, fill: '#f97316' },
    { crop: 'Alfalfa (Heno)', consumoMm: 1100, fill: '#ef4444' }
  ];

  // Cálculo para simulador de cuenca
  const simSavingsM3Corn = (680 - (waterMetrics.totalWaterAppliedMm || 420)) * 10 * simulationHa;
  const simSavingsM3Cotton = (950 - (waterMetrics.totalWaterAppliedMm || 420)) * 10 * simulationHa;
  const simCO2Tonnes = (simulationHa * 11.4).toFixed(0);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* ENCABEZADO Y SELECTOR DE LOTE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <Satellite size={28} />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Agricultura 4.0 & Teledetección
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase mt-1">
                Monitoreo NDVI & Restauración de Suelos
              </h1>
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-medium">
            Validación agronómica y bioeconómica del cáñamo industrial frente a la variabilidad climática, escasez hídrica y regeneración biológica de suelos.
          </p>
        </div>

        {/* Acciones y Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10">
          <div className="min-w-[220px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              Seleccionar Parcela / Lote:
            </label>
            <select
              value={selectedPlotId}
              onChange={(e) => {
                setSelectedPlotId(e.target.value);
                setSearchParams({ plotId: e.target.value });
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {plots.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.surfaceArea || 1} {p.surfaceUnit || 'ha'}) - {locations.find(l => l.id === p.locationId)?.name || 'Campo'}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleDownloadPdf}
            disabled={!soilData}
            className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50 mt-auto"
          >
            <Download size={16} />
            <span>Descargar Certificado PDF</span>
          </button>
        </div>

        {/* Patrón decorativo de fondo */}
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* TARJETAS KPI DE IMPACTO AMBIENTAL Y HÍDRICO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ahorro vs Maíz</span>
            <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <Droplets size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {waterMetrics.waterSavedVsCornM3.toLocaleString()} <span className="text-sm font-bold text-slate-400">m³</span>
          </div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mt-2">
            ≈ {((waterMetrics.waterSavedVsCornM3 * 1000) / 1000000).toFixed(1)} Millones de Litros ahorrados
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Eficiencia de Agua (WUE)</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Activity size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {waterMetrics.wueBiomassKgM3} <span className="text-sm font-bold text-slate-400">kg biomasa/m³</span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-2">
            +45% más eficiente que maíz y soja
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Carbono Capturado</span>
            <div className="p-2.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
              <Leaf size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {waterMetrics.co2CapturedTonnes} <span className="text-sm font-bold text-slate-400">ton CO₂ eq</span>
          </div>
          <p className="text-[11px] text-teal-600 dark:text-teal-400 font-bold mt-2">
            Fijación fotosintética neta en biomasa
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Score Restauración Suelo</span>
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {waterMetrics.soilRestorationIndex} <span className="text-sm font-bold text-slate-400">/ 100</span>
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-2">
            Descompactación pivotante y bioenmienda
          </p>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN DENTRO DEL MÓDULO */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('ndvi')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
            activeTab === 'ndvi'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Satellite size={16} />
          <span>Vigor Satelital (NDVI)</span>
        </button>

        <button
          onClick={() => setActiveTab('soil')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
            activeTab === 'soil'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Sprout size={16} />
          <span>Salud y Restauración del Suelo</span>
        </button>

        <button
          onClick={() => setActiveTab('water')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
            activeTab === 'water'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Droplets size={16} />
          <span>Eficiencia Hídrica & Cultivos</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
            activeTab === 'simulator'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Zap size={16} />
          <span>Simulador de Cuenca Hídrica</span>
        </button>
      </div>

      {/* CONTENIDO DE PESTAÑA: NDVI SATELITAL */}
      {activeTab === 'ndvi' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* BARRA DE SUB-MODOS NDVI */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setNdviSubTab('timeline')}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
                  ndviSubTab === 'timeline'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <Clock size={16} />
                <span>Línea de Tiempo (Revisita 5 días)</span>
              </button>

              <button
                onClick={() => setNdviSubTab('compare')}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
                  ndviSubTab === 'compare'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <Sliders size={16} />
                <span>Comparador Multitemporal</span>
              </button>

              <button
                onClick={() => setNdviSubTab('drones')}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
                  ndviSubTab === 'drones'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <Plane size={16} />
                <span>Vuelos de Dron & Ortomosaicos</span>
              </button>
            </div>

            <button
              onClick={() => setShowInfoModal(true)}
              className="flex items-center space-x-2 text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-4 py-2.5 rounded-2xl border border-emerald-500/20 transition-all uppercase tracking-wider self-start sm:self-auto"
            >
              <HelpCircle size={16} />
              <span>¿Cómo funciona el NDVI?</span>
            </button>
          </div>

          {/* SUB-MODO 1: LÍNEA DE TIEMPO (REVISITA CADA 5 DÍAS SENTINEL-2) */}
          {ndviSubTab === 'timeline' && (
            <div className="space-y-6">
              
              {/* Carrusel / Selector de Pasadas Satelitales */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">
                        Constelación Copernicus Sentinel-2 (Revisita cada 5 días)
                      </h4>
                      <p className="text-[11px] text-slate-400 font-bold">
                        Selecciona cualquier pasada para inspeccionar la reflectancia y distribución espacial del lote
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedPassIndex(prev => Math.max(0, prev - 1))}
                      disabled={selectedPassIndex === 0}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                      title="Pasada anterior"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                      {selectedPassIndex + 1} / {satellitePasses.length}
                    </span>
                    <button
                      onClick={() => setSelectedPassIndex(prev => Math.min(satellitePasses.length - 1, prev + 1))}
                      disabled={selectedPassIndex === satellitePasses.length - 1}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                      title="Siguiente pasada"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>

                {/* Slider / Tarjetas horizontales de pasadas */}
                <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                  {satellitePasses.map((pass, idx) => {
                    const isSelected = idx === selectedPassIndex;
                    const passColor = getNDVIColor(pass.ndviAverage);
                    return (
                      <button
                        key={pass.id}
                        onClick={() => setSelectedPassIndex(idx)}
                        className={`flex-shrink-0 text-left p-3.5 rounded-2xl border-2 transition-all min-w-[155px] ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/50 shadow-md ring-2 ring-emerald-500/20'
                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 mb-1">
                          <span>Día {pass.cycleDay}</span>
                          <span className={`px-1.5 py-0.5 rounded ${passColor.bg} ${passColor.text}`}>
                            {pass.satellite.replace('Sentinel-', 'S-')}
                          </span>
                        </div>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                          {pass.date}
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-[10px] text-slate-400 font-bold">NDVI</span>
                          <span className={`text-base font-black ${passColor.text}`}>
                            {pass.ndviAverage.toFixed(2)}
                          </span>
                        </div>
                        <div className="mt-1 text-[9px] text-slate-400 truncate">
                          Nubosidad: {pass.cloudCoveragePct}%
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fila de Mapa Interactivo y Panel de Diagnóstico */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Visor de Mapa Satelital */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-base flex items-center">
                        <Globe size={18} className="mr-2 text-emerald-600" />
                        Teledetección del Polígono ({activePass?.date})
                      </h3>
                      <p className="text-[11px] text-slate-400 font-bold">
                        Superposición sobre {selectedPlot?.name} ({selectedPlot?.surfaceArea || 1} ha) | Pasada {activePass?.satellite}
                      </p>
                    </div>

                    {/* Switch de Capas */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        onClick={() => setMapLayer('satellite')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                          mapLayer === 'satellite' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-400'
                        }`}
                      >
                        Satélite
                      </button>
                      <button
                        onClick={() => setMapLayer('ndvi_layer')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                          mapLayer === 'ndvi_layer' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400'
                        }`}
                      >
                        Capa NDVI
                      </button>
                      <button
                        onClick={() => setMapLayer('street')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                          mapLayer === 'street' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-400'
                        }`}
                      >
                        Plano
                      </button>
                    </div>
                  </div>

                  {/* Contenedor del Mapa */}
                  <div className="h-[400px] rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 relative z-0">
                    <MapContainer
                      center={[mapCenter.lat, mapCenter.lng]}
                      zoom={15}
                      scrollWheelZoom={false}
                      className="w-full h-full"
                    >
                      <MapResizer />
                      <MapRecenter polygon={plotPolygon || undefined} center={mapCenter} />

                      {mapLayer === 'satellite' && (
                        <TileLayer
                          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                          attribution='&copy; Esri World Imagery'
                        />
                      )}

                      {mapLayer === 'ndvi_layer' && (
                        <>
                          <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution='&copy; Esri'
                          />
                          <TileLayer
                            url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png"
                            attribution='&copy; NASA GIBS EOSDIS'
                            opacity={0.65}
                          />
                        </>
                      )}

                      {mapLayer === 'street' && (
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; OpenStreetMap'
                        />
                      )}

                      {/* Polígono del Lote Dinámico según Pasada */}
                      {plotPolygon && (
                        <Polygon
                          positions={plotPolygon.map(p => [p.lat, p.lng])}
                          pathOptions={{
                            color: activePassColor.stroke,
                            fillColor: activePassColor.fill,
                            fillOpacity: 0.45,
                            weight: 3
                          }}
                        >
                          <LeafletTooltip permanent direction="center" className="font-bold text-xs bg-slate-900 text-white rounded-lg p-1.5 shadow-md">
                            {selectedPlot?.name} - {activePass?.stageName} (NDVI: {activePass?.ndviAverage.toFixed(2)})
                          </LeafletTooltip>
                        </Polygon>
                      )}

                      {!plotPolygon && (
                        <Marker position={[mapCenter.lat, mapCenter.lng]}>
                          <LeafletTooltip permanent>{selectedPlot?.name}</LeafletTooltip>
                        </Marker>
                      )}
                    </MapContainer>
                  </div>

                  {/* Escala de color NDVI */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-bold">
                    <span className="text-slate-500 uppercase tracking-wider">Índice NDVI:</span>
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center text-red-500"><span className="w-3 h-3 rounded-full bg-red-500 mr-1.5"></span> Suelo desnudo (&lt;0.2)</span>
                      <span className="flex items-center text-amber-500"><span className="w-3 h-3 rounded-full bg-amber-500 mr-1.5"></span> Moderado (0.4-0.6)</span>
                      <span className="flex items-center text-emerald-500"><span className="w-3 h-3 rounded-full bg-emerald-500 mr-1.5"></span> Vigor Óptimo (&gt;0.7)</span>
                    </div>
                  </div>
                </div>

                {/* Panel de Diagnóstico de la Pasada Activa */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${activePassColor.bg} ${activePassColor.text} ${activePassColor.border}`}>
                        {activePass?.stageName}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {activePass?.satellite} | Nubosidad {activePass?.cloudCoveragePct}%
                      </span>
                    </div>

                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-xl flex items-center">
                      <Activity size={20} className="mr-2 text-emerald-600" />
                      NDVI Promedio: {activePass?.ndviAverage.toFixed(2)}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      Rango medido en parcela: {activePass?.ndviMin.toFixed(2)} (Mín) a {activePass?.ndviMax.toFixed(2)} (Máx)
                    </p>
                  </div>

                  {/* Desglose de Superficie de la Parcela */}
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-slate-500">
                      <span>Distribución de Vigor en Lote</span>
                      <span>Total: {selectedPlot?.surfaceArea || 1} ha</span>
                    </div>

                    {/* Barra de Distribución Segmentada */}
                    <div className="w-full h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-emerald-500 h-full transition-all" 
                        style={{ width: `${activePass?.optimalAreaPct || 0}%` }}
                        title={`Vigor Óptimo: ${activePass?.optimalAreaPct}%`}
                      ></div>
                      <div 
                        className="bg-amber-400 h-full transition-all" 
                        style={{ width: `${activePass?.moderateAreaPct || 0}%` }}
                        title={`Moderado: ${activePass?.moderateAreaPct}%`}
                      ></div>
                      <div 
                        className="bg-red-400 h-full transition-all" 
                        style={{ width: `${activePass?.stressedAreaPct || 0}%` }}
                        title={`Suelo Desnudo / Estrés: ${activePass?.stressedAreaPct}%`}
                      ></div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div>
                        <p className="text-emerald-600 font-black">{activePass?.optimalAreaPct}%</p>
                        <p className="text-[10px] text-slate-400 font-bold">Vigor Óptimo (&gt;0.7)</p>
                      </div>
                      <div>
                        <p className="text-amber-500 font-black">{activePass?.moderateAreaPct}%</p>
                        <p className="text-[10px] text-slate-400 font-bold">Moderado (0.4-0.6)</p>
                      </div>
                      <div>
                        <p className="text-red-500 font-black">{activePass?.stressedAreaPct}%</p>
                        <p className="text-[10px] text-slate-400 font-bold">Suelo / Estrés (&lt;0.4)</p>
                      </div>
                    </div>
                  </div>

                  {/* Métricas Biológicas */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                      <span className="text-slate-500 font-bold flex items-center gap-1.5">
                        <Leaf size={14} className="text-emerald-600" /> Cobertura del Dosel:
                      </span>
                      <span className="font-black text-slate-800 dark:text-slate-100">
                        {activePass?.canopyCoveragePct}% del área total
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                      <span className="text-slate-500 font-bold flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-emerald-600" /> Biomasa Estimada:
                      </span>
                      <span className="font-black text-emerald-600">
                        {activePass?.biomassEstimateKgHa.toLocaleString()} kg/ha
                      </span>
                    </div>

                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-500/20 text-xs">
                      <p className="font-black text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1">
                        <Sparkles size={14} /> Diagnóstico Agronómico Satelital:
                      </p>
                      <p className="text-emerald-700 dark:text-emerald-400/90 leading-relaxed font-medium">
                        {activePass?.notes}
                      </p>
                    </div>
                  </div>

                </div>

              </div>

              {/* Curva Fenológica General Sentinel-2 */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-base flex items-center">
                      <TrendingUp size={18} className="mr-2 text-emerald-600" />
                      Curva Fenológica Completa (Evolución Multitemporal Sentinel-2)
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold">
                      Seguimiento continuo de reflectancia foliar a lo largo del ciclo agronómico
                    </p>
                  </div>
                </div>

                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={satellitePasses}>
                      <defs>
                        <linearGradient id="ndviGradPass" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={45} />
                      <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                      <Tooltip 
                        formatter={(val: any) => [`${val} NDVI`, 'Vigor Promedio']}
                        labelFormatter={(label) => `Fecha de pasada: ${label}`}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                      />
                      <Area type="monotone" dataKey="ndviAverage" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#ndviGradPass)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}

          {/* SUB-MODO 2: COMPARADOR MULTITEMPORAL (ANTES VS DESPUÉS) */}
          {ndviSubTab === 'compare' && (
            <div className="space-y-6">
              
              {/* Selectores de Fechas Comparativas */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg flex items-center">
                      <Sliders size={20} className="mr-2 text-emerald-600" />
                      Comparativa Diferencial de Pasadas Satelitales (Δ NDVI)
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      Contrasta dos fechas clave del cultivo para auditar la respuesta al riego, enmiendas o avance vegetativo
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadComparisonPdf}
                    className="flex items-center space-x-2 bg-[#006633] hover:bg-[#004d26] text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-green-900/20 active:scale-95 transition"
                  >
                    <Download size={16} />
                    <span>Descargar Dictamen Comparativo en PDF</span>
                  </button>
                </div>

                {/* Selectores Fecha A vs Fecha B */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Selector Fecha A */}
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={14} /> Fecha A (Referencia / Base)
                      </span>
                      <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                        Base
                      </span>
                    </div>

                    <select
                      value={comparePassAIndex}
                      onChange={e => setComparePassAIndex(Number(e.target.value))}
                      className="w-full p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                    >
                      {satellitePasses.map((p, idx) => (
                        <option key={p.id} value={idx}>
                          {p.date} - Día {p.cycleDay} ({p.stageName} - {p.ndviAverage.toFixed(2)} NDVI)
                        </option>
                      ))}
                    </select>

                    {passA && (
                      <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                          <p className="text-slate-400 text-[10px] font-bold">NDVI</p>
                          <p className="font-black text-slate-800 dark:text-slate-100">{passA.ndviAverage.toFixed(2)}</p>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                          <p className="text-slate-400 text-[10px] font-bold">Canopia</p>
                          <p className="font-black text-slate-800 dark:text-slate-100">{passA.canopyCoveragePct}%</p>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                          <p className="text-slate-400 text-[10px] font-bold">Biomasa</p>
                          <p className="font-black text-slate-800 dark:text-slate-100">{passA.biomassEstimateKgHa} kg</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selector Fecha B */}
                  <div className="p-5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-3xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={14} /> Fecha B (Monitoreo / Evaluación)
                      </span>
                      <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded">
                        Evaluación
                      </span>
                    </div>

                    <select
                      value={comparePassBIndex}
                      onChange={e => setComparePassBIndex(Number(e.target.value))}
                      className="w-full p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                    >
                      {satellitePasses.map((p, idx) => (
                        <option key={p.id} value={idx}>
                          {p.date} - Día {p.cycleDay} ({p.stageName} - {p.ndviAverage.toFixed(2)} NDVI)
                        </option>
                      ))}
                    </select>

                    {passB && (
                      <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                          <p className="text-slate-400 text-[10px] font-bold">NDVI</p>
                          <p className="font-black text-emerald-600">{passB.ndviAverage.toFixed(2)}</p>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                          <p className="text-slate-400 text-[10px] font-bold">Canopia</p>
                          <p className="font-black text-emerald-600">{passB.canopyCoveragePct}%</p>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                          <p className="text-slate-400 text-[10px] font-bold">Biomasa</p>
                          <p className="font-black text-emerald-600">{passB.biomassEstimateKgHa} kg</p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Tarjetas de Variación Neta (Diferenciales) */}
                {passA && passB && (
                  <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                        <Activity size={16} /> Balance Diferencial del Período (+{passB.cycleDay - passA.cycleDay} días de diferencia)
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {passA.date} ➔ {passB.date}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Delta NDVI */}
                      {(() => {
                        const delta = Number((passB.ndviAverage - passA.ndviAverage).toFixed(2));
                        const isPositive = delta >= 0;
                        return (
                          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Variación NDVI (Δ)</p>
                            <p className={`text-2xl font-black mt-1 flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isPositive ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
                              {isPositive ? `+${delta}` : delta}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {isPositive ? `+${Math.round((delta / Math.max(0.01, passA.ndviAverage)) * 100)}% vigor` : 'Descenso de vigor'}
                            </p>
                          </div>
                        );
                      })()}

                      {/* Delta Biomasa */}
                      {(() => {
                        const deltaBio = passB.biomassEstimateKgHa - passA.biomassEstimateKgHa;
                        const isPos = deltaBio >= 0;
                        return (
                          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ganancia de Biomasa</p>
                            <p className="text-2xl font-black text-emerald-400 mt-1">
                              {isPos ? `+${deltaBio.toLocaleString()}` : deltaBio.toLocaleString()} kg/ha
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">Acumulación neta</p>
                          </div>
                        );
                      })()}

                      {/* Delta Cobertura Canopia */}
                      {(() => {
                        const deltaCanopy = passB.canopyCoveragePct - passA.canopyCoveragePct;
                        return (
                          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cierre de Canopia</p>
                            <p className="text-2xl font-black text-emerald-400 mt-1">
                              {deltaCanopy >= 0 ? `+${deltaCanopy}%` : `${deltaCanopy}%`}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">Expansión del dosel</p>
                          </div>
                        );
                      })()}

                      {/* Delta Área Óptima */}
                      {(() => {
                        const deltaOpt = passB.optimalAreaPct - passA.optimalAreaPct;
                        return (
                          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Área en Vigor Óptimo</p>
                            <p className="text-2xl font-black text-emerald-400 mt-1">
                              {deltaOpt >= 0 ? `+${deltaOpt}%` : `${deltaOpt}%`}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">Mejora de uniformidad</p>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="p-4 bg-slate-800/50 rounded-2xl text-xs text-slate-300 leading-relaxed border border-slate-700/40">
                      <strong>Dictamen Agronómico:</strong> {passB.ndviAverage >= passA.ndviAverage
                        ? `El lote muestra un avance vegetativo continuo y uniforme (+${Number((passB.ndviAverage - passA.ndviAverage).toFixed(2))} NDVI). La absorción radicular de agua y nutrientes se mantiene en niveles óptimos sin signos de estrés hídrico generalizado.`
                        : `Se detecta una reducción espectral (-${Math.abs(Number((passB.ndviAverage - passA.ndviAverage).toFixed(2)))} NDVI). Esto coincide con la fase de senescencia fisiológica previa a cosecha o amerita una inspección presencial de sectores puntuales de riego.`}
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* SUB-MODO 3: VUELOS DE DRON MULTIESPECTRAL & ORTOMOSAICOS */}
          {ndviSubTab === 'drones' && (
            <div className="space-y-6">
              
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg flex items-center">
                      <Plane size={20} className="mr-2 text-emerald-600" />
                      Vuelos de Dron Multiespectral & Ortomosaicos Centimétricos
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      Monitoreo de ultra-alta resolución (GSD 2 a 3 cm/px) para inspección de malezas, líneas de siembra y fallas de riego
                    </p>
                  </div>

                  <button
                    onClick={() => setShowDroneModal(true)}
                    className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-700/20 active:scale-95 transition"
                  >
                    <Plus size={16} />
                    <span>Registrar Nuevo Vuelo</span>
                  </button>
                </div>

                {/* Listado de Vuelos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {droneFlights.map(flight => (
                    <div 
                      key={flight.id} 
                      className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 hover:border-emerald-500/50 transition-all shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-500/20">
                          {flight.droneModel}
                        </span>
                        <span className="text-xs font-bold text-slate-400">{flight.date}</span>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Piloto / Operador</div>
                        <div className="text-sm font-black text-slate-800 dark:text-slate-100">{flight.pilotName}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div>
                          <p className="text-slate-400 text-[10px] font-bold">Resolución GSD</p>
                          <p className="font-black text-slate-800 dark:text-slate-200">{flight.resolutionCmPx} cm / px</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px] font-bold">Altitud</p>
                          <p className="font-black text-slate-800 dark:text-slate-200">{flight.flightAltitudeM} metros</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px] font-bold">Sensor</p>
                          <p className="font-black text-slate-800 dark:text-slate-200 truncate">{flight.sensorType}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px] font-bold">NDVI Medio</p>
                          <p className="font-black text-emerald-600">{flight.ndviAverage.toFixed(2)}</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 italic border-l-2 border-emerald-500 pl-3 py-0.5">
                        "{flight.observations}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      )}


      {/* CONTENIDO DE PESTAÑA: SALUD Y RESTAURACIÓN DEL SUELO */}
      {activeTab === 'soil' && (
        <div className="space-y-8">
          {isLoadingSoil && (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-3">
              <RefreshCw className="animate-spin text-emerald-600" size={24} />
              <span className="font-bold">Consultando sensores satelitales edafológicos (ISRIC & Open-Meteo)...</span>
            </div>
          )}

          {soilData && !isLoadingSoil && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Composición Textural USDA */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">
                    Textura del Suelo (USDA)
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Clasificación granulométrica: <span className="text-emerald-600 font-black">{soilData.textureClass}</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-black mb-1">
                      <span className="text-amber-700 dark:text-amber-500">Arena (Permeabilidad)</span>
                      <span>{soilData.sandPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${soilData.sandPercent}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-black mb-1">
                      <span className="text-orange-700 dark:text-orange-400">Arcilla (Retención Hídrica)</span>
                      <span>{soilData.clayPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                      <div className="bg-orange-500 h-full rounded-full" style={{ width: `${soilData.clayPercent}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-black mb-1">
                      <span className="text-stone-600 dark:text-stone-400">Limo (Fertilidad Fina)</span>
                      <span>{soilData.siltPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                      <div className="bg-stone-500 h-full rounded-full" style={{ width: `${soilData.siltPercent}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-500/20 text-xs space-y-1">
                  <p className="font-black text-emerald-800 dark:text-emerald-300">
                    Aptitud para Cáñamo Industrial: Excelente
                  </p>
                  <p className="text-emerald-600 dark:text-emerald-400">
                    La raíz pivotante del cáñamo puede penetrar hasta {soilData.rootPenetrationPotentialMm} mm, rompiendo capas duras sin compactar el subsuelo.
                  </p>
                </div>
              </div>

              {/* Bioquímica y Carbono Orgánico (SOC) */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">
                    Carbono y Capacidad Nutricional
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Indicadores de regeneración y bioeconomía
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Carbono Orgánico (SOC)</span>
                    <span className="text-2xl font-black text-emerald-600">{soilData.socPercent}%</span>
                    <span className="text-[10px] text-slate-400 block mt-1">≈ {soilData.somPercent}% Mat. Orgánica</span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">pH en Agua</span>
                    <span className="text-2xl font-black text-blue-600">{soilData.phWater}</span>
                    <span className="text-[10px] text-emerald-500 font-bold block mt-1">
                      {soilData.phWater >= 6.2 && soilData.phWater <= 7.4 ? 'Neutral Óptimo' : 'Rango Aceptable'}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">CIC (Nutrientes)</span>
                    <span className="text-2xl font-black text-slate-800 dark:text-white">{soilData.cec}</span>
                    <span className="text-[10px] text-slate-400 block mt-1">cmol(+)/kg de suelo</span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Riesgo Compactación</span>
                    <span className="text-xl font-black text-amber-500">{soilData.compactionRisk}</span>
                    <span className="text-[10px] text-slate-400 block mt-1">{soilData.bulkDensity} g/cm³ densidad</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Retención de Agua Útil:</span>
                  <p className="text-slate-500">{soilData.waterHoldingCapacityMmPerM} mm de agua por cada metro de profundidad.</p>
                </div>
              </div>

              {/* Sensores Satelitales en Vivo de Humedad por Estratos */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg flex items-center">
                    <Droplets size={20} className="mr-2 text-blue-500" />
                    Humedad del Suelo en Estratos
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Telemetría en tiempo real (Open-Meteo)
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-black mb-1">
                      <span className="text-slate-500">Superficie (0 - 1 cm)</span>
                      <span className="text-blue-500">{soilData.moistureSurfacePct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-blue-400 h-full rounded-full" style={{ width: `${soilData.moistureSurfacePct}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-black mb-1">
                      <span className="text-slate-500">Zona Radicular Media (3 - 9 cm)</span>
                      <span className="text-blue-600">{soilData.moistureRootZonePct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${soilData.moistureRootZonePct}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-black mb-1">
                      <span className="text-slate-500">Perfil Profundo (9 - 27 cm)</span>
                      <span className="text-indigo-600">{soilData.moistureDeepPct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${soilData.moistureDeepPct}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-bold block">Temp. Superficie</span>
                    <span className="text-lg font-black text-slate-800 dark:text-white">{soilData.surfaceTempC}°C</span>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-bold block">Temp. en Raíz</span>
                    <span className="text-lg font-black text-emerald-600">{soilData.rootZoneTempC}°C</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: EFICIENCIA HÍDRICA & COMPARATIVA */}
      {activeTab === 'water' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Gráfico Comparativo de Consumo */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">
                  Demanda Hídrica por Ciclo de Cultivo (mm)
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  Comparación de huella hídrica directa por hectárea
                </p>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cropWaterComparisonData} layout="vertical" margin={{ left: 40, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.15} />
                    <XAxis type="number" unit=" mm" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="crop" type="category" tick={{ fontSize: 11, fontWeight: 'bold' }} width={120} />
                    <Tooltip 
                      formatter={(val: any) => [`${val} mm acumulados`, 'Consumo Total']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                    />
                    <Bar dataKey="consumoMm" radius={[0, 12, 12, 0]}>
                      {cropWaterComparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-500/20 text-xs space-y-1">
                <p className="font-black text-emerald-700 dark:text-emerald-300">
                  Ahorro Hídrico Certificado del Cáñamo:
                </p>
                <p className="text-emerald-600 dark:text-emerald-400">
                  El cáñamo industrial requiere hasta un 38% menos agua que el maíz y hasta un 60% menos que el algodón y la alfalfa, siendo la alternativa más viable para cuencas con estrés hídrico.
                </p>
              </div>
            </div>

            {/* Ficha de Balance Hídrico del Lote */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">
                  Balance del Lote {selectedPlot?.name}
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  Aportes registrados vs evapotranspiración
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <span className="text-xs font-bold text-slate-500">Lluvias Registradas:</span>
                  <span className="text-base font-black text-blue-600">{totalRainMm} mm</span>
                </div>

                <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <span className="text-xs font-bold text-slate-500">Riegos Aplicados:</span>
                  <span className="text-base font-black text-emerald-600">{totalIrrigationMm} mm</span>
                </div>

                <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <span className="text-xs font-bold text-slate-500">Agua Total Suministrada:</span>
                  <span className="text-base font-black text-slate-800 dark:text-white">{waterMetrics.totalWaterAppliedMm} mm</span>
                </div>

                <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <span className="text-xs font-bold text-slate-500">Volumen en el Lote ({waterMetrics.plotAreaHa} ha):</span>
                  <span className="text-base font-black text-slate-800 dark:text-white">{waterMetrics.totalWaterAppliedM3.toLocaleString()} m³</span>
                </div>
              </div>

              <Link
                to={`/plots/${selectedPlot?.id}`}
                className="flex items-center justify-center space-x-2 w-full py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                <span>Ver Registro Diario en Ficha de Parcela</span>
                <ArrowRight size={14} />
              </Link>
            </div>

          </div>
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: SIMULADOR DE CUENCA HÍDRICA */}
      {activeTab === 'simulator' && (
        <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/20">
              Herramienta de Política Pública & Inversión Sostenible
            </span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2">
              Simulador de Transición Agroecológica y Ahorro Hídrico Regional
            </h3>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-3xl mt-1">
              ¿Qué impacto hídrico y ambiental tendría reemplazar cultivos de alto consumo por cáñamo industrial en tu cuenca o cooperativa?
            </p>
          </div>

          {/* Control deslizante de Hectáreas */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                Superficie en Transición:
              </label>
              <span className="text-2xl font-black text-emerald-600">{simulationHa} Hectáreas</span>
            </div>
            <input
              type="range"
              min="1"
              max="500"
              value={simulationHa}
              onChange={(e) => setSimulationHa(Number(e.target.value))}
              className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span>1 ha (Piloto)</span>
              <span>50 ha (Mediano)</span>
              <span>200 ha (Consorcio)</span>
              <span>500 ha (Cuenca)</span>
            </div>
          </div>

          {/* Resultados de la Simulación */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-3xl space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Ahorro frente a Maíz</span>
              <div className="text-3xl font-black text-blue-700 dark:text-blue-300">
                {simSavingsM3Corn.toLocaleString()} <span className="text-sm font-bold text-slate-400">m³</span>
              </div>
              <p className="text-xs text-blue-600 font-medium">
                Equivale a {((simSavingsM3Corn * 1000) / 1000000).toFixed(1)} millones de litros de agua dulce conservados.
              </p>
            </div>

            <div className="p-6 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-3xl space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">Ahorro frente a Algodón</span>
              <div className="text-3xl font-black text-orange-700 dark:text-orange-300">
                {simSavingsM3Cotton.toLocaleString()} <span className="text-sm font-bold text-slate-400">m³</span>
              </div>
              <p className="text-xs text-orange-600 font-medium">
                Equivale a {((simSavingsM3Cotton * 1000) / 1000000).toFixed(1)} millones de litros de agua dulce conservados.
              </p>
            </div>

            <div className="p-6 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Captura de Carbono</span>
              <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                {Number(simCO2Tonnes).toLocaleString()} <span className="text-sm font-bold text-slate-400">ton CO₂</span>
              </div>
              <p className="text-xs text-emerald-600 font-medium">
                Potencial directo de emisión de Bonos Verdes / Créditos de Carbono.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GUÍA AGRONÓMICA & TÉCNICA NDVI */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <HelpCircle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Guía Agronómica: Monitoreo NDVI & Sentinel-2
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    Principios biofísicos y teledetección espectral aplicada al cáñamo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-500/20 space-y-2">
                <h4 className="font-black text-emerald-900 dark:text-emerald-300 text-sm flex items-center gap-1.5">
                  <Leaf size={16} /> 1. ¿Cómo se calcula el índice NDVI?
                </h4>
                <p>
                  Las hojas sanas absorben la luz <strong>Roja (RED)</strong> para realizar la fotosíntesis mediante la clorofila y reflejan fuertemente la luz <strong>Infrarroja Cercana (NIR)</strong> para no sobrecalentarse:
                </p>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl text-center font-mono font-bold text-emerald-600 text-sm border border-emerald-500/20">
                  NDVI = (NIR - RED) / (NIR + RED)
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                  2. Escala e Interpretación Agronómica
                </h4>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 flex items-start space-x-3">
                    <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex-shrink-0 mt-0.5"></span>
                    <div>
                      <strong className="text-red-700 dark:text-red-400">Menor a 0.20 (Suelo Desnudo / Barbecho):</strong>
                      <p className="text-[11px] mt-0.5">Pre-siembra, rastrojo o sectores del lote donde la emergencia falló por salinidad, anegamiento o compactación.</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-start space-x-3">
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-500 flex-shrink-0 mt-0.5"></span>
                    <div>
                      <strong className="text-amber-700 dark:text-amber-400">0.20 a 0.40 (Emergencia & Estrés Temprano):</strong>
                      <p className="text-[11px] mt-0.5">Plántulas en primeros 15-20 días, baja cobertura de entresurco o sectores con estrés hídrico puntual.</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/40 flex items-start space-x-3">
                    <span className="w-3.5 h-3.5 rounded-full bg-yellow-500 flex-shrink-0 mt-0.5"></span>
                    <div>
                      <strong className="text-yellow-700 dark:text-yellow-400">0.40 a 0.65 (Vegetativo en Desarrollo):</strong>
                      <p className="text-[11px] mt-0.5">Crecimiento rápido de tallos, dosel vegetal cerrándose al 50-80%, tasa fotosintética activa.</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 flex items-start space-x-3">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex-shrink-0 mt-0.5"></span>
                    <div>
                      <strong className="text-emerald-700 dark:text-emerald-400">Mayor a 0.70 (Vigor Óptimo / Canopia Cerrada):</strong>
                      <p className="text-[11px] mt-0.5">Máxima biomasa foliar y fotosíntesis plena. Entresurcos cerrados al 100%.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Satellite size={16} className="text-emerald-600" /> 3. Frecuencia y Satélites (Copernicus Sentinel-2)
                </h4>
                <p>
                  Sentinel-2A y Sentinel-2B pasan sobre el mismo lote cada <strong>5 días</strong> con resolución de <strong>10 metros por píxel</strong>. Los días con nubosidad espesa se corrigen mediante máscaras BOA (Bottom of Atmosphere).
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowInfoModal(false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR NUEVO VUELO DE DRON */}
      {showDroneModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-8 border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Plane size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Registrar Vuelo de Dron Multiespectral
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    Cargar ortomosaico de alta resolución para {selectedPlot?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDroneModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDrone} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Fecha del Vuelo</label>
                  <input
                    type="date"
                    required
                    value={droneDate}
                    onChange={e => setDroneDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Piloto / Operador</label>
                  <input
                    type="text"
                    required
                    value={dronePilot}
                    onChange={e => setDronePilot(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    placeholder="ej: Ing. Juan Pérez"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Modelo de Dron</label>
                  <input
                    type="text"
                    required
                    value={droneModel}
                    onChange={e => setDroneModel(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    placeholder="ej: DJI Mavic 3M"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Altitud (metros)</label>
                  <input
                    type="number"
                    required
                    value={droneAltitude}
                    onChange={e => setDroneAltitude(Number(e.target.value))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Resolución GSD (cm/px)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={droneResolution}
                    onChange={e => setDroneResolution(Number(e.target.value))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">NDVI Promedio Medido</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    required
                    value={droneNdvi}
                    onChange={e => setDroneNdvi(Number(e.target.value))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase">Sensores & Bandas</label>
                <input
                  type="text"
                  required
                  value={droneSensor}
                  onChange={e => setDroneSensor(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  placeholder="ej: RGB + RedEdge + NIR"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase">Observaciones Técnicas</label>
                <textarea
                  rows={2}
                  value={droneObs}
                  onChange={e => setDroneObs(e.target.value)}
                  placeholder="Detalles sobre malezas, líneas de goteo o uniformidad..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDroneModal(false)}
                  className="flex-1 p-3 rounded-2xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-700/20 active:scale-95 transition"
                >
                  Guardar Vuelo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

