import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  Sprout, Droplets, Satellite, Leaf, Download, RefreshCw, 
  MapPin, AlertCircle, ShieldCheck, CheckCircle2, TrendingUp, 
  Layers, Sun, Compass, ArrowRight, Activity, Thermometer,
  CloudRain, Zap, BarChart3, HelpCircle, FileText, Globe, Wind
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
  exportAgro40CertificatePdf 
} from '../src/services/agro40Service';
import { SoilHealthData, WaterEfficiencyMetrics, NDVISample } from '../types';

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
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Visor de Mapa Satelital Leaflet */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-base flex items-center">
                    <Globe size={18} className="mr-2 text-emerald-600" />
                    Teledetección del Polígono en Tiempo Real
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold">
                    Superposición espectral sobre {selectedPlot?.name} ({selectedPlot?.surfaceArea || 1} {selectedPlot?.surfaceUnit || 'ha'})
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
                      attribution='&copy; <a href="https://www.esri.com">Esri</a> World Imagery'
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

                  {/* Polígono del Lote */}
                  {plotPolygon && (
                    <Polygon
                      positions={plotPolygon.map(p => [p.lat, p.lng])}
                      pathOptions={{
                        color: mapLayer === 'ndvi_layer' ? '#10b981' : '#059669',
                        fillColor: mapLayer === 'ndvi_layer' ? '#22c55e' : '#10b981',
                        fillOpacity: mapLayer === 'ndvi_layer' ? 0.45 : 0.25,
                        weight: 3
                      }}
                    >
                      <LeafletTooltip permanent direction="center" className="font-bold text-xs bg-slate-900 text-white rounded-lg p-1.5 shadow-md">
                        {selectedPlot?.name} - NDVI Vigor Alto
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
                <div className="flex items-center space-x-2">
                  <span className="flex items-center text-red-500"><span className="w-3 h-3 rounded-full bg-red-500 mr-1"></span> Suelo desnudo (&lt;0.2)</span>
                  <span className="flex items-center text-amber-500"><span className="w-3 h-3 rounded-full bg-amber-500 mr-1"></span> Moderado (0.4-0.6)</span>
                  <span className="flex items-center text-emerald-500"><span className="w-3 h-3 rounded-full bg-emerald-500 mr-1"></span> Vigor Óptimo (&gt;0.7)</span>
                </div>
              </div>
            </div>

            {/* Evolución y Gráfico de NDVI */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-base flex items-center">
                  <TrendingUp size={18} className="mr-2 text-emerald-600" />
                  Curva Fenológica NDVI (Sentinel-2)
                </h3>
                <p className="text-[11px] text-slate-400 font-bold">
                  Progresión del dosel vegetal y vigor biológico del cáñamo
                </p>
              </div>

              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ndviSamples}>
                    <defs>
                      <linearGradient id="ndviGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis dataKey="stage" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                    <Tooltip 
                      formatter={(val: any) => [`${val} NDVI`, 'Vigor Promedio']}
                      labelFormatter={(label) => `Etapa: ${label}`}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="ndviAverage" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#ndviGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">Cobertura Máxima Foliar:</span>
                  <span className="font-black text-emerald-600">92% del lote</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">Resistencia a Estrés Hídrico:</span>
                  <span className="font-black text-slate-700 dark:text-slate-200">Alta (Raíz profunda)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">Fecha Cosecha Estimada:</span>
                  <span className="font-black text-slate-700 dark:text-slate-200">
                    {ndviSamples.length > 0 ? ndviSamples[ndviSamples.length - 1].date : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

          </div>
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

    </div>
  );
}
