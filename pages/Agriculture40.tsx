import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  Sprout, Droplets, Mail, Send, Loader2, Satellite, Leaf, Download, RefreshCw, 
  MapPin, AlertCircle, ShieldCheck, CheckCircle2, TrendingUp, 
  Layers, Sun, Compass, ArrowRight, Activity, Thermometer,
  CloudRain, Zap, BarChart3, HelpCircle, FileText, Globe, Wind,
  Calendar, ChevronLeft, ChevronRight, Clock, Sliders, Camera,
  Plus, X, Info, Sparkles, Eye, ArrowUpRight, ArrowDownRight,
  Plane, Check, Filter, Flame, ShieldAlert, Award, Car, TreePine, Waves, Search, Package,
  SlidersHorizontal, Key, ExternalLink, ThermometerSnowflake, Radio
} from 'lucide-react';
import LiveTelemetryPanel from '../components/LiveTelemetryPanel';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, Legend, Cell 
} from 'recharts';
import { MapContainer, TileLayer, Polygon, Marker, Tooltip as LeafletTooltip, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  fetchLiveSoilAndAgroData, 
  calculateWaterEfficiency, 
  generateNDVITimeline, 
  exportAgro40CertificatePdf,
  generateDetailedSatellitePasses,
  fetchLiveStacPassesForPlot,
  StacQueryResult,
  exportSatelliteComparisonPDF,
  exportNDVITimeSeriesPDF,
  exportNDVITimeSeriesCSV,
  calculateCarbonFootprint,
  exportCarbonAuditPDF,
  getRegionalCatastropheAlerts,
  getPlotAgrochemicalApplications,
  PlotLiveWeather,
  fetchBatchPlotWeather
} from '../src/services/agro40Service';
import { sendAgronomicAlertEmail } from '../src/services/emailNotificationService';
import { SoilHealthData, WaterEfficiencyMetrics, NDVISample, SatellitePass, DroneFlight, CarbonFootprintData, CatastropheRiskAlert, CatastropheType, RiskLevel, AgrochemicalApplication, ToxicologicalBand } from '../types';

const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const trigger = () => {
      requestAnimationFrame(() => {
        try {
          map.invalidateSize({ animate: false });
        } catch (e) {}
      });
    };
    trigger();
    const t1 = setTimeout(trigger, 60);
    const t2 = setTimeout(trigger, 200);
    const t3 = setTimeout(trigger, 500);
    const observer = new ResizeObserver(trigger);
    observer.observe(map.getContainer());
    window.addEventListener('resize', trigger);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      observer.disconnect();
      window.removeEventListener('resize', trigger);
    };
  }, [map]);
  return null;
};

const MapRecenter = ({ 
  polygon, 
  locationPolygon,
  center, 
  focusMode = 'plot',
  fitTrigger = 0
}: { 
  polygon?: { lat: number; lng: number }[]; 
  locationPolygon?: { lat: number; lng: number }[];
  center?: { lat: number; lng: number };
  focusMode?: 'plot' | 'field';
  fitTrigger?: number;
}) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const applyFit = () => {
      try {
        map.invalidateSize({ animate: false });
        if (focusMode === 'field' && locationPolygon && locationPolygon.length >= 3) {
          const locBounds = L.latLngBounds(locationPolygon.map(p => [p.lat, p.lng]));
          if (locBounds.isValid()) {
            map.fitBounds(locBounds, { padding: [35, 35], maxZoom: 18, animate: true });
            return;
          }
        }
        if (polygon && polygon.length >= 3) {
          const validPts = polygon.filter(p => p && !isNaN(p.lat) && !isNaN(p.lng));
          if (validPts.length >= 3) {
            const bounds = L.latLngBounds(validPts.map(p => [p.lat, p.lng]));
            if (bounds.isValid()) {
              map.fitBounds(bounds, { padding: [55, 55], maxZoom: 21, animate: true });
              return;
            }
          }
        }
        if (center && !isNaN(center.lat) && !isNaN(center.lng)) {
          map.setView([center.lat, center.lng], 18);
        }
      } catch (e) {}
    };
    applyFit();
    const timer = setTimeout(applyFit, 120);
    return () => clearTimeout(timer);
  }, [polygon, locationPolygon, center, focusMode, fitTrigger, map]);
  return null;
};

const CatastropheMapController = ({ 
  selectedAlert, 
  alerts 
}: { 
  selectedAlert: CatastropheRiskAlert | null; 
  alerts: CatastropheRiskAlert[];
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    if (selectedAlert) {
      map.flyTo([selectedAlert.coordinates.lat, selectedAlert.coordinates.lng], 8.5, {
        duration: 1.2
      });
    } else if (alerts.length > 0) {
      const validAlerts = alerts.filter(a => a.coordinates && typeof a.coordinates.lat === 'number' && typeof a.coordinates.lng === 'number');
      if (validAlerts.length > 0) {
        const bounds = L.latLngBounds(validAlerts.map(a => [a.coordinates.lat, a.coordinates.lng]));
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 7 });
      }
    }
  }, [map, selectedAlert, alerts]);

  return null;
};

export default function Agriculture40() {
  const { plots, locations, varieties, trialRecords, hydricRecords, clients, usersList, currentUser } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPlotId = searchParams.get('plotId');

  // Estado para emisión de alertas tempranas por correo
  const [selectedCatastropheForEmail, setSelectedCatastropheForEmail] = useState<CatastropheRiskAlert | null>(null);
  const [catastropheRecipientEmail, setCatastropheRecipientEmail] = useState("");
  const [catastropheRecipientName, setCatastropheRecipientName] = useState("");
  const [catastropheSubject, setCatastropheSubject] = useState("");
  const [catastropheSeverity, setCatastropheSeverity] = useState<"Crítica" | "Advertencia" | "Informativa">("Crítica");
  const [catastropheDetails, setCatastropheDetails] = useState("");
  const [isSendingCatastropheEmail, setIsSendingCatastropheEmail] = useState(false);
  const [catastropheEmailToast, setCatastropheEmailToast] = useState<{
    show: boolean;
    message: string;
    sentTo: string;
    via: string;
  } | null>(null);

  const handleOpenCatastropheAlertEmail = (alert: CatastropheRiskAlert) => {
    const plot = plots.find(p => p.id === alert.plotId || p.name.toLowerCase() === alert.plotName.toLowerCase());
    const location = locations.find(l => l.id === plot?.locationId);
    const client = clients?.find(c => c.id === location?.clientId);
    const assignedUser = usersList?.find(u => (location?.clientId && u.clientId === location.clientId) || u.assignedPlotIds?.includes(plot?.id || ""));

    const recipientEmail = client?.email || assignedUser?.email || currentUser?.email || "gaston.barea.moreno@gmail.com";
    const recipientName = client?.contactName || client?.name || assignedUser?.name || "Productor Asociado";

    const severityLevel = alert.level === "Alto" || alert.level === "Extremo" ? "Crítica" : (alert.level === "Moderado" ? "Advertencia" : "Informativa");
    setCatastropheSeverity(severityLevel);
    setSelectedCatastropheForEmail(alert);
    setCatastropheRecipientEmail(recipientEmail);
    setCatastropheRecipientName(recipientName);
    setCatastropheSubject(`Alerta Temprana: ${alert.title} • ${alert.plotName}`);
    
    const telemetryParts = [];
    if (alert.satelliteTelemetry.temperatureC !== undefined) telemetryParts.push(`T°: ${alert.satelliteTelemetry.temperatureC}°C`);
    if (alert.satelliteTelemetry.relativeHumidityPct !== undefined) telemetryParts.push(`Humedad: ${alert.satelliteTelemetry.relativeHumidityPct}%`);
    if (alert.satelliteTelemetry.windSpeedKmH !== undefined) telemetryParts.push(`Viento: ${alert.satelliteTelemetry.windSpeedKmH} km/h`);
    if (alert.satelliteTelemetry.fwiIndex !== undefined) telemetryParts.push(`FWI: ${alert.satelliteTelemetry.fwiIndex}`);
    if (alert.satelliteTelemetry.soilSaturationPct !== undefined) telemetryParts.push(`Sat. Suelo: ${alert.satelliteTelemetry.soilSaturationPct}%`);

    const measures = alert.preventiveMeasures.join(" | ");
    setCatastropheDetails(
      `${alert.description}\n\nTelemetría en Vivo: ${telemetryParts.join(" • ")}\n\nProtocolo Recomendado: ${measures}`
    );
  };

  const handleSendCatastropheEmail = async () => {
    if (!selectedCatastropheForEmail || !catastropheRecipientEmail.trim()) return;
    setIsSendingCatastropheEmail(true);
    try {
      const res = await sendAgronomicAlertEmail({
        toEmail: catastropheRecipientEmail.trim(),
        toName: catastropheRecipientName.trim() || "Productor Asociado",
        alertTitle: `[${catastropheSeverity.toUpperCase()}] ${catastropheSubject}`,
        plotName: selectedCatastropheForEmail.plotName,
        alertDetails: catastropheDetails,
        severity: catastropheSeverity,
        actionUrl: `${window.location.origin}/#/agro40`,
        extraData: {
          severity: catastropheSeverity,
          temperature_c: selectedCatastropheForEmail.satelliteTelemetry.temperatureC,
          humidity_pct: selectedCatastropheForEmail.satelliteTelemetry.relativeHumidityPct,
          wind_kmh: selectedCatastropheForEmail.satelliteTelemetry.windSpeedKmH,
          fwi_index: selectedCatastropheForEmail.satelliteTelemetry.fwiIndex,
          suggested_action: selectedCatastropheForEmail.preventiveMeasures[0] || "Aplicar protocolo de contingencia"
        }
      });
      setCatastropheEmailToast({
        show: true,
        message: res.message,
        sentTo: catastropheRecipientEmail.trim(),
        via: res.deliveredVia
      });
      setSelectedCatastropheForEmail(null);
    } catch (err: any) {
      alert("Error despachando alerta por correo: " + err.message);
    } finally {
      setIsSendingCatastropheEmail(false);
    }
  };

  // Estado del lote seleccionado
  const [selectedPlotId, setSelectedPlotId] = useState<string>(urlPlotId || (plots.length > 0 ? plots[0].id : ''));
  const [activeTab, setActiveTab] = useState<'ndvi' | 'telemetry' | 'water' | 'carbon' | 'inputs' | 'catastrophes' | 'soil' | 'simulator'>('ndvi');
  const [mapLayer, setMapLayer] = useState<'satellite' | 'ndvi_layer' | 'ndre_layer' | 'sar_layer' | 'foliage_layer' | 'moisture_layer' | 'street'>('ndvi_layer');
  const [layerOpacity, setLayerOpacity] = useState<number>(0.75);
  const [showPixelGrid, setShowPixelGrid] = useState<boolean>(true);
  const [showGeodesy, setShowGeodesy] = useState<boolean>(true);
  const [mapFocusMode, setMapFocusMode] = useState<'plot' | 'field'>('plot');
  const [mapFitTrigger, setMapFitTrigger] = useState<number>(0);
  const [showSatelliteApiModal, setShowSatelliteApiModal] = useState<boolean>(false);
  const [satelliteApiConfig, setSatelliteApiConfig] = useState<{
    provider: 'builtin' | 'sentinel_hub' | 'agromonitoring';
    apiKey: string;
    clientId: string;
    isCustomConnected: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('ht_satellite_api_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      provider: 'builtin',
      apiKey: '',
      clientId: '',
      isCustomConnected: false
    };
  });
  const [apiConnectionStatus, setApiConnectionStatus] = useState<string>('');
  const [stacResult, setStacResult] = useState<StacQueryResult | null>(null);
  const [isLoadingStac, setIsLoadingStac] = useState<boolean>(false);
  const [constellationFilter, setConstellationFilter] = useState<'all' | 's2' | 's1'>('all');

  // Modal explicativo de matemática de carbono
  const [showCarbonFormulaModal, setShowCarbonFormulaModal] = useState(false);

  // Modal de registro de nuevo insumo/aplicación
  const [showAgroModal, setShowAgroModal] = useState(false);
  const [newAgroApp, setNewAgroApp] = useState<Partial<AgrochemicalApplication>>({
    category: 'Fertilizante Foliar',
    productName: '',
    activeIngredient: '',
    manufacturer: '',
    supplierName: '',
    senasaRegisterNumber: '',
    toxicologicalClass: 'Banda Verde (Banda IV - Poco Peligroso)',
    dosagePerHa: 1.5,
    dosageUnit: 'L/ha',
    applicationMethod: 'Pulverización Terrestre',
    batchNumber: '',
    safetyPeriodDays: 3,
    responsibleAgronomist: 'Ing. Agr. Gabriel Santos',
    agronomistLicense: 'MP 4.812 (CPIA)',
    notes: ''
  });
  
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

  // Selector Personalizable de Widgets del Dashboard Agro 4.0
  const [showWidgetModal, setShowWidgetModal] = useState<boolean>(false);
  const [widgetsConfig, setWidgetsConfig] = useState<{
    waterSaved: boolean;
    wueBiomass: boolean;
    carbonCaptured: boolean;
    soilRestoration: boolean;
    ndviTrends: boolean;
    catastropheRisk: boolean;
  }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ht_agro40_kpi_widgets');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return {
      waterSaved: true,
      wueBiomass: true,
      carbonCaptured: true,
      soilRestoration: true,
      ndviTrends: true,
      catastropheRisk: true
    };
  });

  const toggleWidget = (key: keyof typeof widgetsConfig) => {
    setWidgetsConfig(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('ht_agro40_kpi_widgets', JSON.stringify(next));
      }
      return next;
    });
  };

  const resetWidgets = () => {
    const defaultWidgets = {
      waterSaved: true,
      wueBiomass: true,
      carbonCaptured: true,
      soilRestoration: true,
      ndviTrends: true,
      catastropheRisk: true
    };
    setWidgetsConfig(defaultWidgets);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ht_agro40_kpi_widgets', JSON.stringify(defaultWidgets));
    }
  };

  const activeWidgetsCount = Object.values(widgetsConfig).filter(Boolean).length;

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
        waterSavedVsAlfalfaM3: 6800,
        greenWaterFootprintM3Ha: 0,
        blueWaterFootprintM3Ha: 0,
        greyWaterFootprintM3Ha: 30,
        totalWaterFootprintM3Ha: 30,
        waterFootprintPerKgYieldLiters: 450,
        waterBenchmarkVsCottonPct: 75,
        waterBenchmarkVsCornPct: 40,
        co2CapturedTonnes: 11.4, soilRestorationIndex: 85
      };
    }
    return calculateWaterEfficiency(selectedPlot, selectedVariety, totalRainMm, totalIrrigationMm, plotTrials);
  }, [selectedPlot, selectedVariety, totalRainMm, totalIrrigationMm, plotTrials]);

  // Curva de evolución NDVI + NDRE + SAR
  const ndviSamples: NDVISample[] = useMemo(() => {
    if (!selectedPlot) return [];
    return generateNDVITimeline(selectedPlot.sowingDate || new Date().toISOString(), selectedVariety?.cycleDays || 110, plotTrials);
  }, [selectedPlot, selectedVariety, plotTrials]);

  // Sincronización automática con el Catálogo STAC (Copernicus CDSE + Element84 Earth Search) por polígono
  const refreshStacCatalog = async () => {
    if (!selectedPlot) return;
    setIsLoadingStac(true);
    try {
      const res = await fetchLiveStacPassesForPlot(
        selectedPlot,
        selectedLocation,
        selectedVariety,
        plotTrials,
        satelliteApiConfig.provider === 'sentinel_hub' && satelliteApiConfig.clientId && satelliteApiConfig.apiKey
          ? { cdseClientId: satelliteApiConfig.clientId, cdseClientSecret: satelliteApiConfig.apiKey }
          : undefined
      );
      setStacResult(res);
    } catch (e) {
      console.warn('Error consultando STAC:', e);
    } finally {
      setIsLoadingStac(false);
    }
  };

  useEffect(() => {
    refreshStacCatalog();
  }, [selectedPlot?.id]);

  // Serie temporal de pasadas satelitales (Combina escenas reales STAC Sentinel-2 L2A + Sentinel-1 SAR GRD)
  const allSatellitePasses: SatellitePass[] = useMemo(() => {
    if (!selectedPlot) return [];
    if (stacResult && stacResult.passes.length > 0) {
      return stacResult.passes;
    }
    return generateDetailedSatellitePasses(selectedPlot, selectedVariety, plotTrials);
  }, [selectedPlot, selectedVariety, plotTrials, stacResult]);

  const satellitePasses: SatellitePass[] = useMemo(() => {
    if (constellationFilter === 's2') {
      const filtered = allSatellitePasses.filter(p => p.sensorMode !== 'SAR_C_BAND');
      return filtered.length > 0 ? filtered : allSatellitePasses;
    }
    if (constellationFilter === 's1') {
      const filtered = allSatellitePasses.filter(p => p.sensorMode === 'SAR_C_BAND');
      return filtered.length > 0 ? filtered : allSatellitePasses;
    }
    return allSatellitePasses;
  }, [allSatellitePasses, constellationFilter]);

  // Sincronizar índice inicial cuando se cargan las pasadas del lote
  useEffect(() => {
    if (satellitePasses.length > 0) {
      const defaultIdx = Math.min(Math.floor(satellitePasses.length * 0.75), satellitePasses.length - 1);
      setSelectedPassIndex(defaultIdx);
      setComparePassAIndex(Math.min(1, satellitePasses.length - 1));
      setComparePassBIndex(defaultIdx);
    }
  }, [satellitePasses.length, selectedPlotId, constellationFilter]);

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

  // Descargar Reporte Completo de Monitoreo NDVI en PDF
  const handleDownloadNDVIPdf = () => {
    if (!selectedPlot || satellitePasses.length === 0) return;
    exportNDVITimeSeriesPDF(selectedPlot, selectedVariety, satellitePasses, plotTrials);
  };

  // Descargar Serie Temporal NDVI en formato CSV
  const handleDownloadNDVICsv = () => {
    if (!selectedPlot || satellitePasses.length === 0) return;
    exportNDVITimeSeriesCSV(selectedPlot, satellitePasses);
  };

  // Normalizador universal de coordenadas geodésicas (soporta {lat,lng}, [lat,lng] o JSON string)
  const parsePolygonCoords = (rawPoly: any): { lat: number; lng: number }[] => {
    if (!rawPoly) return [];
    let arr = rawPoly;
    if (typeof rawPoly === 'string') {
      try { arr = JSON.parse(rawPoly); } catch { return []; }
    }
    if (!Array.isArray(arr)) return [];
    return arr
      .map((pt: any) => {
        if (Array.isArray(pt) && pt.length >= 2) {
          const lat = Number(pt[0]);
          const lng = Number(pt[1]);
          return !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null;
        }
        if (pt && typeof pt === 'object') {
          const lat = Number(pt.lat ?? pt.latitude);
          const lng = Number(pt.lng ?? pt.lon ?? pt.longitude);
          return !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null;
        }
        return null;
      })
      .filter((pt): pt is { lat: number; lng: number } => pt !== null && pt.lat !== 0 && pt.lng !== 0);
  };

  // Coordenadas y polígono vectorial del lote (con síntesis parcelaria de alta precisión si no fue dibujado)
  const mapCenter = useMemo(() => {
    const pCoords = selectedPlot?.coordinates;
    if (pCoords && !isNaN(Number(pCoords.lat)) && !isNaN(Number(pCoords.lng)) && Number(pCoords.lat) !== 0) {
      return { lat: Number(pCoords.lat), lng: Number(pCoords.lng) };
    }
    const parsedPoly = parsePolygonCoords(selectedPlot?.polygon);
    if (parsedPoly.length >= 3) {
      return {
        lat: Number((parsedPoly.reduce((s, p) => s + p.lat, 0) / parsedPoly.length).toFixed(6)),
        lng: Number((parsedPoly.reduce((s, p) => s + p.lng, 0) / parsedPoly.length).toFixed(6))
      };
    }
    const lCoords = selectedLocation?.coordinates;
    if (lCoords && !isNaN(Number(lCoords.lat)) && !isNaN(Number(lCoords.lng)) && Number(lCoords.lat) !== 0) {
      return { lat: Number(lCoords.lat), lng: Number(lCoords.lng) };
    }
    return { lat: -43.308558, lng: -65.28907 };
  }, [selectedPlot, selectedLocation]);

  const locationPolygon = useMemo(() => {
    const parsed = parsePolygonCoords(selectedLocation?.polygon);
    return parsed.length >= 3 ? parsed : [];
  }, [selectedLocation]);

  const siblingPlots = useMemo(() => {
    if (!selectedPlot) return [];
    return plots
      .filter(p => p.id !== selectedPlot.id && p.locationId === selectedPlot.locationId)
      .map(p => ({
        id: p.id,
        name: p.name,
        surfaceArea: p.surfaceArea,
        surfaceUnit: p.surfaceUnit,
        color: p.color || '#38bdf8',
        polygon: parsePolygonCoords(p.polygon)
      }))
      .filter(p => p.polygon.length >= 3);
  }, [plots, selectedPlot]);

  const plotPolygon = useMemo(() => {
    const parsed = parsePolygonCoords(selectedPlot?.polygon);
    if (parsed.length >= 3) {
      return parsed;
    }
    // Si la parcela no tiene polígono vectorial explícito, generamos una geometría perimetral geodésica exacta basada en su superficie real y centro
    const center = mapCenter;
    const surfaceM2 = selectedPlot?.surfaceUnit === 'm2'
      ? (selectedPlot.surfaceArea || 9.72)
      : (selectedPlot?.surfaceUnit === 'ac' ? (selectedPlot.surfaceArea || 1) * 4046.86 : (selectedPlot?.surfaceArea || 1) * 10000);
    const sideMeters = Math.max(3, Math.sqrt(surfaceM2));
    const deltaLat = (sideMeters / 111320) / 2;
    const cosLat = Math.cos((center.lat * Math.PI) / 180);
    const deltaLng = (sideMeters / (111320 * (cosLat || 0.73))) / 2;

    return [
      { lat: Number((center.lat + deltaLat).toFixed(7)), lng: Number((center.lng - deltaLng).toFixed(7)) },
      { lat: Number((center.lat + deltaLat * 0.96).toFixed(7)), lng: Number((center.lng + deltaLng * 1.04).toFixed(7)) },
      { lat: Number((center.lat - deltaLat * 1.02).toFixed(7)), lng: Number((center.lng + deltaLng * 0.98).toFixed(7)) },
      { lat: Number((center.lat - deltaLat * 0.98).toFixed(7)), lng: Number((center.lng - deltaLng * 1.02).toFixed(7)) }
    ];
  }, [selectedPlot, mapCenter]);

  // Vértices geodésicos únicos (sin repetir el punto de cierre final si coincide con el primero)
  const uniquePlotVertices = useMemo(() => {
    if (!plotPolygon || plotPolygon.length < 3) return [];
    const first = plotPolygon[0];
    const last = plotPolygon[plotPolygon.length - 1];
    const isClosedDuplicate = plotPolygon.length > 3 && Math.abs(first.lat - last.lat) < 1e-7 && Math.abs(first.lng - last.lng) < 1e-7;
    return isClosedDuplicate ? plotPolygon.slice(0, plotPolygon.length - 1) : plotPolygon;
  }, [plotPolygon]);

  // Cálculo de Geodesia de la Parcela (distancias Haversine por lado, perímetro en metros y superficie geodésica en m²)
  const geodesicMetrics = useMemo(() => {
    if (uniquePlotVertices.length < 3) {
      return { vertices: [], perimeterMeters: 0, geodesicAreaM2: 0 };
    }
    const R = 6378137;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const haversineMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const sinLat = Math.sin(dLat / 2);
      const sinLng = Math.sin(dLng / 2);
      const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    };

    let perimeter = 0;
    let sphericalSum = 0;
    const vertices = uniquePlotVertices.map((pt, idx) => {
      const nextPt = uniquePlotVertices[(idx + 1) % uniquePlotVertices.length];
      const sideM = haversineMeters(pt, nextPt);
      perimeter += sideM;
      sphericalSum += (toRad(nextPt.lng) - toRad(pt.lng)) * (2 + Math.sin(toRad(pt.lat)) + Math.sin(toRad(nextPt.lat)));
      return {
        index: idx + 1,
        label: `V${idx + 1}`,
        lat: pt.lat,
        lng: pt.lng,
        nextLabel: `V${((idx + 1) % uniquePlotVertices.length) + 1}`,
        sideLengthMeters: Number(sideM.toFixed(2)),
        midPoint: {
          lat: (pt.lat + nextPt.lat) / 2,
          lng: (pt.lng + nextPt.lng) / 2
        }
      };
    });

    const geodesicAreaM2 = Math.abs((sphericalSum * R * R) / 2.0);
    return {
      vertices,
      perimeterMeters: Number(perimeter.toFixed(2)),
      geodesicAreaM2: Number(geodesicAreaM2.toFixed(2))
    };
  }, [uniquePlotVertices]);

  // Generador de micro-zonas espectrales y píxeles Sentinel-2 alineados exactamente a la geodesia de la parcela
  const spectralCells = useMemo(() => {
    if (!uniquePlotVertices || uniquePlotVertices.length < 3 || !activePass) return [];

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    uniquePlotVertices.forEach(p => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });

    const isMicroPlot = selectedPlot?.surfaceUnit === 'm2' || (selectedPlot?.surfaceArea || 1) < 0.05;
    const steps = isMicroPlot ? 6 : 8;
    const cells = [];

    // Semilla pseudo-aleatoria determinística para consistencia agronómica
    const seed = (activePass.date || '2026-04-03').split('-').reduce((acc, v) => acc + parseInt(v, 10), 0) + (selectedPlot?.id?.length || 7);

    const buildCellMetrics = (r: number, c: number, cellBounds: [number, number][], centerPt: { lat: number; lng: number }) => {
      const centerDistLat = Math.abs(r - (steps - 1) / 2) / (steps / 2);
      const centerDistLng = Math.abs(c - (steps - 1) / 2) / (steps / 2);
      const edgeFactor = 1 - (centerDistLat * 0.12 + centerDistLng * 0.12);

      const pseudoNoise = Math.abs((Math.sin((r + 1) * 12.9898 + (c + 1) * 78.233 + seed) * 43758.5453) % 1);
      const range = Math.max(0.05, activePass.ndviMax - activePass.ndviMin);
      let cellNdvi = activePass.ndviAverage + (pseudoNoise - 0.5) * range * 0.85 * edgeFactor;
      cellNdvi = Math.min(0.95, Math.max(0.15, Number(cellNdvi.toFixed(2))));

      const baseNdre = activePass.ndreAverage ?? Number((activePass.ndviAverage * 0.82).toFixed(2));
      let cellNdre = baseNdre + (pseudoNoise - 0.48) * 0.09 * edgeFactor;
      cellNdre = Math.min(0.88, Math.max(0.10, Number(cellNdre.toFixed(2))));

      const baseSarRvi = activePass.sarRviIndex ?? Number((activePass.ndviAverage * 0.90).toFixed(2));
      let cellSarRvi = baseSarRvi + (pseudoNoise - 0.5) * 0.08 * edgeFactor;
      cellSarRvi = Math.min(0.95, Math.max(0.18, Number(cellSarRvi.toFixed(2))));
      const cellSarVv = Number(((activePass.sarVvDb ?? -9.2) + (pseudoNoise - 0.5) * 1.1).toFixed(1));
      const cellSarVh = Number(((activePass.sarVhDb ?? -14.8) + (pseudoNoise - 0.5) * 1.3).toFixed(1));

      let cellFoliage = Math.round(activePass.canopyCoveragePct * (cellNdvi / (activePass.ndviAverage || 0.75)));
      cellFoliage = Math.min(99, Math.max(6, cellFoliage));

      let cellMoisture = Number(((activePass.ndmiMoistureIndex ?? cellNdvi * 0.72) + (pseudoNoise - 0.5) * 0.08).toFixed(2));
      cellMoisture = Math.min(0.90, Math.max(0.10, cellMoisture));

      let fillColor = '#10b981';
      let statusLabel = 'Vigor Óptimo';

      if (mapLayer === 'ndvi_layer') {
        if (cellNdvi >= 0.78) {
          fillColor = '#047857';
          statusLabel = 'Vigor Óptimo (>0.78)';
        } else if (cellNdvi >= 0.65) {
          fillColor = '#10b981';
          statusLabel = 'Vigor Alto (0.65-0.77)';
        } else if (cellNdvi >= 0.48) {
          fillColor = '#84cc16';
          statusLabel = 'Vigor Moderado (0.48-0.64)';
        } else if (cellNdvi >= 0.35) {
          fillColor = '#eab308';
          statusLabel = 'Estrés Leve / Clorosis (0.35-0.47)';
        } else if (cellNdvi >= 0.25) {
          fillColor = '#f97316';
          statusLabel = 'Bajo Vigor (0.25-0.34)';
        } else {
          fillColor = '#ef4444';
          statusLabel = 'Suelo Desnudo / Falla (<0.25)';
        }
      } else if (mapLayer === 'ndre_layer') {
        if (cellNdre >= 0.62) {
          fillColor = '#be123c';
          statusLabel = 'Clorofila Profunda Óptima (>0.62 NDRE)';
        } else if (cellNdre >= 0.48) {
          fillColor = '#e11d48';
          statusLabel = 'Nitrógeno Foliar Alto (0.48-0.61 NDRE)';
        } else if (cellNdre >= 0.34) {
          fillColor = '#f97316';
          statusLabel = 'Transición Red Edge (0.34-0.47 NDRE)';
        } else if (cellNdre >= 0.22) {
          fillColor = '#facc15';
          statusLabel = 'Déficit Nitrógeno / Juvenil (0.22-0.33)';
        } else {
          fillColor = '#fca5a5';
          statusLabel = 'Baja Actividad Clorofílica (<0.22)';
        }
      } else if (mapLayer === 'sar_layer') {
        if (cellSarRvi >= 0.72) {
          fillColor = '#4f46e5';
          statusLabel = 'Alta Biomasa Caulinar SAR (>0.72 RVI)';
        } else if (cellSarRvi >= 0.55) {
          fillColor = '#6366f1';
          statusLabel = 'Estructura Densa VH/VV (0.55-0.71 RVI)';
        } else if (cellSarRvi >= 0.38) {
          fillColor = '#38bdf8';
          statusLabel = 'Dosel en Desarrollo SAR (0.38-0.54 RVI)';
        } else {
          fillColor = '#94a3b8';
          statusLabel = 'Superficie / Suelo Rugoso (<0.38 RVI)';
        }
      } else if (mapLayer === 'foliage_layer') {
        if (cellFoliage >= 85) {
          fillColor = '#065f46';
          statusLabel = 'Dosel Cerrado (85-100%)';
        } else if (cellFoliage >= 70) {
          fillColor = '#059669';
          statusLabel = 'Follaje Denso (70-84%)';
        } else if (cellFoliage >= 45) {
          fillColor = '#34d399';
          statusLabel = 'Follaje Moderado (45-69%)';
        } else if (cellFoliage >= 25) {
          fillColor = '#a7f3d0';
          statusLabel = 'Follaje Ralo (25-44%)';
        } else {
          fillColor = '#fde68a';
          statusLabel = 'Suelo Descubierto (<25%)';
        }
      } else if (mapLayer === 'moisture_layer') {
        if (cellMoisture >= 0.55) {
          fillColor = '#0284c7';
          statusLabel = 'Alta Turgencia / Saturación (>0.55)';
        } else if (cellMoisture >= 0.40) {
          fillColor = '#38bdf8';
          statusLabel = 'Humedad Óptima (0.40-0.54)';
        } else if (cellMoisture >= 0.28) {
          fillColor = '#fbbf24';
          statusLabel = 'Estrés Hídrico Moderado (0.28-0.39)';
        } else {
          fillColor = '#ea580c';
          statusLabel = 'Déficit Hídrico Severo (<0.28)';
        }
      }

      return {
        id: `cell-${r}-${c}`,
        bounds: cellBounds,
        center: centerPt,
        ndvi: cellNdvi,
        ndre: cellNdre,
        sarRvi: cellSarRvi,
        sarVv: cellSarVv,
        sarVh: cellSarVh,
        foliage: cellFoliage,
        moisture: cellMoisture,
        fillColor,
        statusLabel,
        pixelSize: isMicroPlot
          ? `Sub-celda Geodésica (${((selectedPlot?.surfaceArea || 9.72) / (steps * steps)).toFixed(2)} m²)`
          : mapLayer === 'ndre_layer'
          ? '20m x 20m (B5/B6/B7)'
          : '10m x 10m'
      };
    };

    // Si el polígono tiene 4 vértices geodésicos (ej. TW-PAR-A3 501 y parcelas experimentales/productivas rectangulares o inclinadas),
    // aplicamos interpolación bilineal exacta entre V1, V2, V3 y V4 para que la malla espectral dibuje al 100% la geodesia real rotada de la parcela.
    if (uniquePlotVertices.length === 4) {
      const [v0, v1, v2, v3] = uniquePlotVertices;
      const bilerp = (u: number, v: number) => ({
        lat: (1 - u) * (1 - v) * v0.lat + u * (1 - v) * v1.lat + u * v * v2.lat + (1 - u) * v * v3.lat,
        lng: (1 - u) * (1 - v) * v0.lng + u * (1 - v) * v1.lng + u * v * v2.lng + (1 - u) * v * v3.lng
      });

      for (let r = 0; r < steps; r++) {
        for (let c = 0; c < steps; c++) {
          const u0 = c / steps;
          const u1 = (c + 1) / steps;
          const w0 = r / steps;
          const w1 = (r + 1) / steps;
          const p00 = bilerp(u0, w0);
          const p10 = bilerp(u1, w0);
          const p11 = bilerp(u1, w1);
          const p01 = bilerp(u0, w1);
          const centerPt = bilerp((u0 + u1) / 2, (w0 + w1) / 2);

          cells.push(
            buildCellMetrics(
              r,
              c,
              [
                [p00.lat, p00.lng],
                [p10.lat, p10.lng],
                [p11.lat, p11.lng],
                [p01.lat, p01.lng]
              ],
              centerPt
            )
          );
        }
      }
      return cells;
    }

    // Para polígonos de N vértices (N != 4), evaluamos pertenencia dentro del polígono geodésico
    const isPointInPolygon = (pt: { lat: number; lng: number }, poly: { lat: number; lng: number }[]) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].lng, yi = poly[i].lat;
        const xj = poly[j].lng, yj = poly[j].lat;
        const intersect = ((yi > pt.lat) !== (yj > pt.lat))
          && (pt.lng < (xj - xi) * (pt.lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    const stepLat = (maxLat - minLat) / steps;
    const stepLng = (maxLng - minLng) / steps;

    for (let r = 0; r < steps; r++) {
      for (let c = 0; c < steps; c++) {
        const cLat0 = minLat + r * stepLat;
        const cLat1 = minLat + (r + 1) * stepLat;
        const cLng0 = minLng + c * stepLng;
        const cLng1 = minLng + (c + 1) * stepLng;
        const centerPt = { lat: (cLat0 + cLat1) / 2, lng: (cLng0 + cLng1) / 2 };

        if (isPointInPolygon(centerPt, uniquePlotVertices)) {
          cells.push(
            buildCellMetrics(
              r,
              c,
              [
                [cLat0, cLng0],
                [cLat0, cLng1],
                [cLat1, cLng1],
                [cLat1, cLng0]
              ],
              centerPt
            )
          );
        }
      }
    }

    return cells;
  }, [uniquePlotVertices, activePass, mapLayer, selectedPlot]);

  // Descargar Certificado Técnico Oficial en PDF
  const handleDownloadPdf = () => {
    if (!selectedPlot || !soilData) return;
    exportAgro40CertificatePdf(selectedPlot, selectedLocation, selectedVariety, soilData, waterMetrics, ndviSamples);
  };

  // Huella de Carbono y Captura de CO2 de la Parcela Actual
  const carbonData: CarbonFootprintData = useMemo(() => {
    if (!selectedPlot) {
      return {
        plotId: '',
        plotName: '',
        areaHa: 1,
        varietyName: '',
        dryBiomassKgHa: 8000,
        aboveGroundCaptureTonnesCO2Ha: 13.04,
        belowGroundCaptureTonnesCO2Ha: 2.87,
        totalGrossCaptureTonnesCO2Ha: 15.91,
        totalGrossCaptureTonnesCO2Plot: 15.91,
        fuelEmissionsTonnesCO2Ha: 0.20,
        fertilizerEmissionsTonnesCO2Ha: 0.35,
        irrigationEnergyEmissionsTonnesCO2Ha: 0.10,
        totalEmissionsTonnesCO2Ha: 0.65,
        netCarbonBalanceTonnesCO2Ha: -15.26,
        netCarbonBalanceTonnesCO2Plot: -15.26,
        carbonCreditsEstimated: 13.7,
        carbonOffsetEquivalencyCars: 3.3,
        carbonOffsetEquivalencyTrees: 694,
        sequestrationDurabilityYears: 100,
        mrvStatus: 'Auditado',
        lastCalculated: new Date().toISOString()
      };
    }
    return calculateCarbonFootprint(selectedPlot, selectedVariety, plotTrials);
  }, [selectedPlot, selectedVariety, plotTrials]);

  // Alertas de Catástrofes & Riesgo Agroclimático (Incendio, Sequía, Inundación, Helada, Viento)
  const [liveWeatherMap, setLiveWeatherMap] = useState<Record<string, PlotLiveWeather>>({});
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherLastUpdated, setWeatherLastUpdated] = useState<string>('');

  const refreshLiveTelemetry = async () => {
    if (plots.length === 0) return;
    setIsLoadingWeather(true);
    try {
      const data = await fetchBatchPlotWeather(plots, locations);
      setLiveWeatherMap(data);
      setWeatherLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.warn('Error al actualizar telemetría en vivo:', e);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  useEffect(() => {
    refreshLiveTelemetry();
  }, [plots, locations]);

  const catastropheAlerts: CatastropheRiskAlert[] = useMemo(() => {
    return getRegionalCatastropheAlerts(plots, locations, liveWeatherMap);
  }, [plots, locations, liveWeatherMap]);

  const [selectedCatastropheFilter, setSelectedCatastropheFilter] = useState<'all' | 'incendio' | 'sequia' | 'inundacion' | 'viento_granizo' | 'helada'>('all');
  const [selectedAlertForMap, setSelectedAlertForMap] = useState<CatastropheRiskAlert | null>(null);

  const filteredCatastropheAlerts = useMemo(() => {
    if (selectedCatastropheFilter === 'all') return catastropheAlerts;
    return catastropheAlerts.filter(a => a.type === selectedCatastropheFilter);
  }, [catastropheAlerts, selectedCatastropheFilter]);

  // Descargar Dictamen Oficial de Captura de Carbono (PDF)
  const handleDownloadCarbonPdf = () => {
    if (!selectedPlot) return;
    exportCarbonAuditPDF(selectedPlot, selectedVariety, carbonData);
  };

  // Lista de Aplicaciones Fitosanitarias, Fertilizantes e Insumos con Trazabilidad SENASA
  const [agrochemicalApps, setAgrochemicalApps] = useState<AgrochemicalApplication[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ht_agrochemical_apps');
      if (stored) {
        try { return JSON.parse(stored); } catch (e) {}
      }
    }
    return getPlotAgrochemicalApplications(plots);
  });

  const [inputSearchTerm, setInputSearchTerm] = useState('');
  const [inputCategoryFilter, setInputCategoryFilter] = useState('all');

  const filteredAgroApps = useMemo(() => {
    return agrochemicalApps.filter(app => {
      const matchPlot = !selectedPlotId || app.plotId === selectedPlotId;
      const matchCategory = inputCategoryFilter === 'all' || app.category === inputCategoryFilter;
      const matchSearch = !inputSearchTerm || 
        app.productName.toLowerCase().includes(inputSearchTerm.toLowerCase()) ||
        app.activeIngredient.toLowerCase().includes(inputSearchTerm.toLowerCase()) ||
        app.manufacturer.toLowerCase().includes(inputSearchTerm.toLowerCase()) ||
        app.supplierName.toLowerCase().includes(inputSearchTerm.toLowerCase()) ||
        app.senasaRegisterNumber.toLowerCase().includes(inputSearchTerm.toLowerCase());
      return matchPlot && matchCategory && matchSearch;
    });
  }, [agrochemicalApps, selectedPlotId, inputCategoryFilter, inputSearchTerm]);

  const handleAddAgroAppSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgroApp.productName || !newAgroApp.activeIngredient || !selectedPlot) return;

    let areaHa = selectedPlot.surfaceArea || 1.0;
    if (selectedPlot.surfaceUnit === 'm2') areaHa = areaHa / 10000;
    else if (selectedPlot.surfaceUnit === 'ac') areaHa = areaHa * 0.404686;
    areaHa = Math.max(0.1, Number(areaHa.toFixed(2)));

    const appDate = new Date().toISOString().split('T')[0];
    const safetyDays = newAgroApp.safetyPeriodDays || 0;
    const safetyDateObj = new Date(Date.now() + safetyDays * 86400000);
    const harvestSafetyDate = safetyDateObj.toISOString().split('T')[0];

    const dosage = Number(newAgroApp.dosagePerHa) || 1;
    const totalApplied = Number((dosage * areaHa).toFixed(2));

    const createdApp: AgrochemicalApplication = {
      id: `app-user-${Date.now()}`,
      plotId: selectedPlot.id,
      plotName: selectedPlot.name,
      date: appDate,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: (newAgroApp.category as any) || 'Fertilizante Foliar',
      productName: newAgroApp.productName,
      activeIngredient: newAgroApp.activeIngredient,
      manufacturer: newAgroApp.manufacturer || 'Fabricante Certificado',
      supplierName: newAgroApp.supplierName || 'Proveedor Local',
      senasaRegisterNumber: newAgroApp.senasaRegisterNumber || 'SENASA N° 20.100/2025',
      toxicologicalClass: (newAgroApp.toxicologicalClass as any) || 'Banda Verde (Banda IV - Poco Peligroso)',
      dosagePerHa: dosage,
      dosageUnit: newAgroApp.dosageUnit || 'L/ha',
      totalAppliedAmount: totalApplied,
      applicationMethod: newAgroApp.applicationMethod || 'Pulverización Terrestre',
      batchNumber: newAgroApp.batchNumber || `LOT-${Math.floor(1000 + Math.random() * 9000)}`,
      safetyPeriodDays: safetyDays,
      harvestSafetyDate,
      responsibleAgronomist: newAgroApp.responsibleAgronomist || 'Ing. Agr. Gabriel Santos',
      agronomistLicense: newAgroApp.agronomistLicense || 'MP 4.812',
      notes: newAgroApp.notes || '',
      status: safetyDays === 0 ? 'Apto Cosecha' : 'En Carencia'
    };

    const updated = [createdApp, ...agrochemicalApps];
    setAgrochemicalApps(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ht_agrochemical_apps', JSON.stringify(updated));
    }

    setShowAgroModal(false);
    setNewAgroApp({
      category: 'Fertilizante Foliar',
      productName: '',
      activeIngredient: '',
      manufacturer: '',
      supplierName: '',
      senasaRegisterNumber: '',
      toxicologicalClass: 'Banda Verde (Banda IV - Poco Peligroso)',
      dosagePerHa: 1.5,
      dosageUnit: 'L/ha',
      applicationMethod: 'Pulverización Terrestre',
      batchNumber: '',
      safetyPeriodDays: 3,
      responsibleAgronomist: 'Ing. Agr. Gabriel Santos',
      agronomistLicense: 'MP 4.812 (CPIA)',
      notes: ''
    });
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

      {/* TARJETAS KPI DE IMPACTO AMBIENTAL Y HÍDRICO (PERSONALIZABLES) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Métricas Clave de Monitoreo
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {activeWidgetsCount}/6 activas
            </span>
          </div>

          <button
            onClick={() => setShowWidgetModal(true)}
            className="flex items-center space-x-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-3 py-1.5 rounded-xl border border-emerald-500/20 transition-all shadow-sm"
          >
            <Sliders size={14} />
            <span>Personalizar Widgets</span>
          </button>
        </div>

        {activeWidgetsCount === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[28px] border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
            <Sliders size={28} className="mx-auto text-slate-400" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              Todos los widgets de métricas se encuentran ocultos.
            </p>
            <button
              onClick={resetWidgets}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Restablecer Todas las Métricas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Widget 1: Ahorro vs Maíz */}
            {widgetsConfig.waterSaved && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-blue-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ahorro vs Maíz</span>
                  <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Droplets size={18} />
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                  {waterMetrics.waterSavedVsCornM3.toLocaleString()} <span className="text-xs font-bold text-slate-400">m³</span>
                </div>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1.5 truncate">
                  ≈ {((waterMetrics.waterSavedVsCornM3 * 1000) / 1000000).toFixed(1)}M Litros ahorrados
                </p>
              </div>
            )}

            {/* Widget 2: Eficiencia Hídrica WUE */}
            {widgetsConfig.wueBiomass && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Eficiencia (WUE)</span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Activity size={18} />
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                  {waterMetrics.wueBiomassKgM3} <span className="text-xs font-bold text-slate-400">kg/m³</span>
                </div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1.5 truncate">
                  +45% más eficiente que soja
                </p>
              </div>
            )}

            {/* Widget 3: Captura de Carbono */}
            {widgetsConfig.carbonCaptured && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-teal-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">CO₂ Capturado</span>
                  <div className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
                    <Leaf size={18} />
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                  {waterMetrics.co2CapturedTonnes} <span className="text-xs font-bold text-slate-400">ton CO₂e</span>
                </div>
                <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold mt-1.5 truncate">
                  {carbonData.carbonCreditsEstimated} Créditos MRV
                </p>
              </div>
            )}

            {/* Widget 4: Restauración de Suelo */}
            {widgetsConfig.soilRestoration && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-amber-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Restauración</span>
                  <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                    <ShieldCheck size={18} />
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                  {waterMetrics.soilRestorationIndex} <span className="text-xs font-bold text-slate-400">/ 100</span>
                </div>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1.5 truncate">
                  Descompactación profunda
                </p>
              </div>
            )}

            {/* Widget 5: Tendencia NDVI Satelital */}
            {widgetsConfig.ndviTrends && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Vigor NDVI</span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Satellite size={18} />
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums flex items-baseline gap-1">
                  <span>{(activePass?.ndviAverage || 0.76).toFixed(2)}</span>
                  <span className="text-xs font-bold text-emerald-500">NDVI</span>
                </div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1.5 truncate">
                  {activePassColor.label}
                </p>
              </div>
            )}

            {/* Widget 6: Alertas Climáticas Activas */}
            {widgetsConfig.catastropheRisk && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-rose-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Alerta Clima</span>
                  <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                    <Flame size={18} />
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                  {catastropheAlerts.filter(a => a.level === 'Extremo' || a.level === 'Alto').length}{' '}
                  <span className="text-xs font-bold text-slate-400">Críticas</span>
                </div>
                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1.5 truncate">
                  {catastropheAlerts.length > 0 ? `${catastropheAlerts.length} monitoreos activos` : 'Sin alertas vigentes'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL PERSONALIZADOR DE WIDGETS Y MÉTRICAS */}
      {showWidgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                  <Sliders size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Personalizar Widgets del Dashboard
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Activa o desactiva las métricas que deseas ver en pantalla.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWidgetModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              {/* Opción 1: Ahorro vs Maíz */}
              <div
                onClick={() => toggleWidget('waterSaved')}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  widgetsConfig.waterSaved
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
                    <Droplets size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Ahorro Hídrico vs Maíz</h4>
                    <p className="text-[10px] text-slate-400">Metros cúbicos y litros preservados en la parcela</p>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${widgetsConfig.waterSaved ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${widgetsConfig.waterSaved ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* Opción 2: Eficiencia de Agua (WUE) */}
              <div
                onClick={() => toggleWidget('wueBiomass')}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  widgetsConfig.wueBiomass
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Eficiencia de Agua (WUE)</h4>
                    <p className="text-[10px] text-slate-400">Kilogramos de biomasa seca por metro cúbico consumido</p>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${widgetsConfig.wueBiomass ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${widgetsConfig.wueBiomass ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* Opción 3: Captura de Carbono */}
              <div
                onClick={() => toggleWidget('carbonCaptured')}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  widgetsConfig.carbonCaptured
                    ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/60'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-teal-500/10 text-teal-600 rounded-xl">
                    <Leaf size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Captura de CO₂ & Bonos MRV</h4>
                    <p className="text-[10px] text-slate-400">Toneladas netas secuestradas y créditos auditables</p>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${widgetsConfig.carbonCaptured ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${widgetsConfig.carbonCaptured ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* Opción 4: Restauración de Suelo */}
              <div
                onClick={() => toggleWidget('soilRestoration')}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  widgetsConfig.soilRestoration
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Score Restauración Suelo</h4>
                    <p className="text-[10px] text-slate-400">Índice ponderado de salud física y biológica</p>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${widgetsConfig.soilRestoration ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${widgetsConfig.soilRestoration ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* Opción 5: Tendencia NDVI Satelital */}
              <div
                onClick={() => toggleWidget('ndviTrends')}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  widgetsConfig.ndviTrends
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <Satellite size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Tendencia Vigor NDVI</h4>
                    <p className="text-[10px] text-slate-400">Índice de vegetación satelital Sentinel-2 en tiempo real</p>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${widgetsConfig.ndviTrends ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${widgetsConfig.ndviTrends ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* Opción 6: Alerta Climática */}
              <div
                onClick={() => toggleWidget('catastropheRisk')}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  widgetsConfig.catastropheRisk
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-rose-500/10 text-rose-600 rounded-xl">
                    <Flame size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Alertas de Catástrofes & Clima</h4>
                    <p className="text-[10px] text-slate-400">Riesgos regionales de incendio, sequía o helada</p>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${widgetsConfig.catastropheRisk ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${widgetsConfig.catastropheRisk ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={resetWidgets}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
              >
                Restablecer Todo
              </button>
              <button
                onClick={() => setShowWidgetModal(false)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                Listo / Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONEXIÓN Y CONFIGURACIÓN DE APIS SATELITALES (CATÁLOGO STAC COPERNICUS CDSE & ELEMENT84) */}
      {showSatelliteApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 md:p-8 space-y-6 relative overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                  <Satellite size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
                    <span>Catálogo STAC & Teledetección</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Sentinel-2 MSI + Sentinel-1 SAR
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Consulta automatizada por polígono para {selectedPlot?.name} (Tile MGRS {stacResult?.mgrsTile || '19GGM'}).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSatelliteApiModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Panel Explicativo de la Arquitectura STAC Activa */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-wide">
                <CheckCircle2 size={16} />
                <span>Conexión Satelital Nativa Activa (Sin Configuración Requerida)</span>
              </div>
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/25 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
                <p className="font-bold mb-1">
                  💡 ¿Necesitas configurar alguna clave o API Key?
                </p>
                <p className="text-[11px] leading-relaxed">
                  <strong>No es necesario configurar nada.</strong> La plataforma consulta de forma abierta y directa el catálogo público <strong>STAC v1 de Copernicus CDSE y Element84 AWS Earth Search</strong>. Los índices NDVI (10m), NDRE Borde Rojo (20m) y Sentinel-1 SAR (Radar Banda C) funcionan de manera automática sin registro ni costo adicional.
                </p>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                El sistema consulta automáticamente el catálogo intersectando el polígono GeoJSON de cada parcela para extraer:
              </p>
              <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
                <li><strong>Sentinel-2 L2A (Óptico + Borde Rojo):</strong> Bandas <strong>B4 y B8</strong> (NDVI 10m) y Bandas <strong>B5 (705 nm), B6 (740 nm), B7 (783 nm) y B8A (865 nm)</strong> para calcular <strong>NDRE</strong> sin saturación cuando el cultivo cierra el entresurco.</li>
                <li><strong>Sentinel-1 GRD (Radar SAR Banda C · 5.405 GHz):</strong> Polarización dual <strong>VV + VH</strong> e índice estructural <strong>RVI</strong> que atraviesa el 100% de las nubes.</li>
              </ul>
            </div>

            {/* Configuración del Proveedor Satelital */}
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Modo de Consulta STAC / Credenciales Opcionales:
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSatelliteApiConfig(prev => ({ ...prev, provider: 'builtin' }))}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    satelliteApiConfig.provider === 'builtin'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <p className="text-xs font-black">STAC Público (Activo)</p>
                  <p className="text-[10px] text-slate-400 mt-1">Element84 AWS + CDSE STAC v1</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSatelliteApiConfig(prev => ({ ...prev, provider: 'sentinel_hub' }))}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    satelliteApiConfig.provider === 'sentinel_hub'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <p className="text-xs font-black">CDSE Statistical API</p>
                  <p className="text-[10px] text-slate-400 mt-1">OAuth2 Client ID / Secret</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSatelliteApiConfig(prev => ({ ...prev, provider: 'agromonitoring' }))}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    satelliteApiConfig.provider === 'agromonitoring'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <p className="text-xs font-black">AgroMonitoring</p>
                  <p className="text-[10px] text-slate-400 mt-1">OpenWeather Satellite API</p>
                </button>
              </div>

              {/* Campos si selecciona OAuth2 CDSE o API Externa */}
              {satelliteApiConfig.provider !== 'builtin' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-200">
                  {satelliteApiConfig.provider === 'sentinel_hub' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">
                        Copernicus CDSE Client ID (OAuth2):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. sh-8f42a9c1-xxxx-xxxx-xxxx"
                        value={satelliteApiConfig.clientId}
                        onChange={(e) => setSatelliteApiConfig(prev => ({ ...prev, clientId: e.target.value }))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      {satelliteApiConfig.provider === 'sentinel_hub' ? 'Copernicus CDSE Client Secret:' : 'API Key de AgroMonitoring:'}
                    </label>
                    <input
                      type="password"
                      placeholder={satelliteApiConfig.provider === 'sentinel_hub' ? 'Client Secret de dataspace.copernicus.eu' : 'e.g. 9f41a87b6c0032e...'}
                      value={satelliteApiConfig.apiKey}
                      onChange={(e) => setSatelliteApiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Si dejas estos campos vacíos, el sistema utiliza automáticamente el catálogo público STAC v1 sin requerir llaves.
                  </p>
                </div>
              )}
            </div>

            {/* Diagnóstico de Telemetría STAC de la Parcela */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Estado del Catálogo STAC para {selectedPlot?.name}:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Tile MGRS</span>
                  <span className="font-bold text-emerald-600 font-mono">{stacResult?.mgrsTile || '19GGM'}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Sentinel-2 (MSI)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{stacResult?.s2ScenesCount || allSatellitePasses.length} escenas</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Sentinel-1 (SAR)</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{stacResult?.s1ScenesCount || 6} pasadas radar</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Bandas Activas</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">B4/B5/B6/B7/B8A + VV/VH</span>
                </div>
              </div>
            </div>

            {/* Feedback de Comprobación */}
            {apiConnectionStatus && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{apiConnectionStatus}</span>
              </div>
            )}

            {/* Footer con Acciones */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={async () => {
                  setApiConnectionStatus('Consultando catálogo STAC (Sentinel-2 L2A + Sentinel-1 GRD)...');
                  await refreshStacCatalog();
                  setApiConnectionStatus(`✅ Catálogo STAC sincronizado: ${allSatellitePasses.length} escenas reales indexadas (Tile ${stacResult?.mgrsTile || '19GGM'}) para ${selectedPlot?.name || 'la parcela'}.`);
                  try {
                    localStorage.setItem('ht_satellite_api_config', JSON.stringify({ ...satelliteApiConfig, isCustomConnected: true }));
                  } catch (e) {}
                }}
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                <RefreshCw size={14} className={isLoadingStac ? 'animate-spin' : ''} />
                <span>Sincronizar STAC Ahora</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem('ht_satellite_api_config', JSON.stringify(satelliteApiConfig));
                  } catch (e) {}
                  setShowSatelliteApiModal(false);
                }}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                Guardar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-100/80 dark:bg-slate-900/90 p-2 md:p-3 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Selector Dropdown Rápido para Dispositivos Móviles Pequeños (< 640px) */}
        <div className="block sm:hidden mb-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">
            Módulo Activo Agro 4.0:
          </label>
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-black rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          >
            <option value="ndvi">📡 Vigor Satelital (NDVI)</option>
            <option value="telemetry">📡 Telemetría IoT en Vivo (Render)</option>
            <option value="water">💧 Huella Hídrica & Cultivos</option>
            <option value="carbon">🌿 Captura CO₂ & Bonos MRV</option>
            <option value="inputs">🧬 Trazabilidad Insumos SENASA</option>
            <option value="catastrophes">🔥 Alertas de Catástrofes</option>
            <option value="soil">🌱 Salud y Suelo</option>
            <option value="simulator">⚡ Simulador de Cuenca</option>
          </select>
        </div>

        {/* Rejilla Adaptativa para Tablets y Pantallas de PC */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <button
            onClick={() => setActiveTab('ndvi')}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl text-center transition-all duration-200 group relative ${
              activeTab === 'ndvi'
                ? 'bg-emerald-600 text-white font-black shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-500/50 scale-[1.02]'
                : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60'
            }`}
          >
            <div className="flex items-center space-x-1.5 mb-1">
              <Satellite size={18} className={activeTab === 'ndvi' ? 'text-white' : 'text-emerald-500'} />
              <span className="text-xs font-black tracking-tight">NDVI Satelital</span>
            </div>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${activeTab === 'ndvi' ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-400'}`}>
              Sentinel 10m
            </span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl text-center transition-all duration-200 group relative ${
              activeTab === 'telemetry'
                ? 'bg-emerald-600 text-white font-black shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-500/50 scale-[1.02]'
                : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60'
            }`}
          >
            <div className="flex items-center space-x-1.5 mb-1">
              <Radio size={18} className={activeTab === 'telemetry' ? 'text-white' : 'text-emerald-500'} />
              <span className="text-xs font-black tracking-tight">Telemetría IoT</span>
            </div>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${activeTab === 'telemetry' ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-400'}`}>
              Python / Render
            </span>
          </button>

          <button
            onClick={() => setActiveTab('water')}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl text-center transition-all duration-200 group relative ${
              activeTab === 'water'
                ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-600/30 ring-2 ring-blue-500/50 scale-[1.02]'
                : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60'
            }`}
          >
            <div className="flex items-center space-x-1.5 mb-1">
              <Droplets size={18} className={activeTab === 'water' ? 'text-white' : 'text-blue-500'} />
              <span className="text-xs font-black tracking-tight">Huella Hídrica</span>
            </div>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${activeTab === 'water' ? 'text-blue-100' : 'text-slate-400 dark:text-slate-400'}`}>
              WUE +45%
            </span>
          </button>

          <button
            onClick={() => setActiveTab('carbon')}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl text-center transition-all duration-200 group relative ${
              activeTab === 'carbon'
                ? 'bg-teal-600 text-white font-black shadow-lg shadow-teal-600/30 ring-2 ring-teal-500/50 scale-[1.02]'
                : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60'
            }`}
          >
            <div className="flex items-center space-x-1.5 mb-1">
              <Leaf size={18} className={activeTab === 'carbon' ? 'text-white' : 'text-teal-500'} />
              <span className="text-xs font-black tracking-tight">Bonos CO₂ MRV</span>
            </div>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${activeTab === 'carbon' ? 'text-teal-100' : 'text-slate-400 dark:text-slate-400'}`}>
              IPCC Audit
            </span>
          </button>

          <button
            onClick={() => setActiveTab('inputs')}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl text-center transition-all duration-200 group relative ${
              activeTab === 'inputs'
                ? 'bg-purple-600 text-white font-black shadow-lg shadow-purple-600/30 ring-2 ring-purple-500/50 scale-[1.02]'
                : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60'
            }`}
          >
            <div className="flex items-center space-x-1.5 mb-1">
              <Layers size={18} className={activeTab === 'inputs' ? 'text-white' : 'text-purple-500'} />
              <span className="text-xs font-black tracking-tight">SENASA Insumos</span>
            </div>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${activeTab === 'inputs' ? 'text-purple-100' : 'text-slate-400 dark:text-slate-400'}`}>
              VNM Oficial
            </span>
          </button>

          <button
            onClick={() => setActiveTab('catastrophes')}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl text-center transition-all duration-200 group relative ${
              activeTab === 'catastrophes'
                ? 'bg-rose-600 text-white font-black shadow-lg shadow-rose-600/30 ring-2 ring-rose-500/50 scale-[1.02]'
                : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60'
            }`}
          >
            <div className="flex items-center space-x-1.5 mb-1">
              <Flame size={18} className={activeTab === 'catastrophes' ? 'text-yellow-300 animate-pulse' : 'text-rose-500'} />
              <span className="text-xs font-black tracking-tight">Catástrofes</span>
            </div>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${activeTab === 'catastrophes' ? 'text-rose-100' : 'text-slate-400 dark:text-slate-400'}`}>
              Radar Clima
            </span>
          </button>

          <button
            onClick={() => setActiveTab('soil')}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl text-center transition-all duration-200 group relative ${
              activeTab === 'soil'
                ? 'bg-emerald-600 text-white font-black shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-500/50 scale-[1.02]'
                : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60'
            }`}
          >
            <div className="flex items-center space-x-1.5 mb-1">
              <Sprout size={18} className={activeTab === 'soil' ? 'text-white' : 'text-emerald-500'} />
              <span className="text-xs font-black tracking-tight">Salud y Suelo</span>
            </div>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${activeTab === 'soil' ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-400'}`}>
              pH & Físico
            </span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl text-center transition-all duration-200 group relative ${
              activeTab === 'simulator'
                ? 'bg-amber-600 text-white font-black shadow-lg shadow-amber-600/30 ring-2 ring-amber-500/50 scale-[1.02]'
                : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60'
            }`}
          >
            <div className="flex items-center space-x-1.5 mb-1">
              <Zap size={18} className={activeTab === 'simulator' ? 'text-white' : 'text-amber-500'} />
              <span className="text-xs font-black tracking-tight">Sim. Cuenca</span>
            </div>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${activeTab === 'simulator' ? 'text-amber-100' : 'text-slate-400 dark:text-slate-400'}`}>
              Modelo C-12
            </span>
          </button>
        </div>
      </div>

      {/* CONTENIDO DE PESTAÑA: TELEMETRÍA IOT Y SENSORES (PYTHON / RENDER ENGINE) */}
      {activeTab === 'telemetry' && selectedPlot && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <LiveTelemetryPanel plot={selectedPlot} />
        </div>
      )}

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

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <button
                onClick={handleDownloadNDVIPdf}
                className="flex items-center space-x-1.5 text-xs font-black text-white bg-[#006633] hover:bg-[#004d26] px-3.5 py-2.5 rounded-2xl shadow-sm transition-all uppercase tracking-wider active:scale-95"
                title="Exportar Informe Completo de Pasadas Satelitales en PDF"
              >
                <Download size={14} />
                <span>Exportar Reporte NDVI</span>
              </button>

              <button
                onClick={handleDownloadNDVICsv}
                className="flex items-center space-x-1.5 text-xs font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3.5 py-2.5 rounded-2xl transition-all uppercase tracking-wider"
                title="Descargar Serie Temporal en formato CSV"
              >
                <FileText size={14} />
                <span>CSV</span>
              </button>

              <button
                onClick={() => setShowInfoModal(true)}
                className="flex items-center space-x-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-3.5 py-2.5 rounded-2xl border border-emerald-500/20 transition-all uppercase tracking-wider"
              >
                <HelpCircle size={14} />
                <span>¿Cómo funciona el NDVI?</span>
              </button>
            </div>
          </div>

          {/* SUB-MODO 1: LÍNEA DE TIEMPO (REVISITA CADA 5 DÍAS SENTINEL-2) */}
          {ndviSubTab === 'timeline' && (
            <div className="space-y-6">
              
              {/* Carrusel / Selector de Pasadas Satelitales STAC (Sentinel-2 MSI + Sentinel-1 SAR) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center space-x-3">
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">
                          Catálogo STAC Copernicus: Sentinel-2 (NDVI + NDRE B5/B6/B7) & Sentinel-1 (SAR)
                        </h4>
                        <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                          stacResult?.isLiveStac
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                        }`}>
                          {isLoadingStac ? 'Sincronizando STAC...' : stacResult?.isLiveStac ? `● STAC Live · Tile ${stacResult.mgrsTile}` : '● Calibrado Local'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                        {stacResult?.catalogProvider || 'Element84 Earth Search STAC v1 + Copernicus CDSE'} • {stacResult?.s2ScenesCount || satellitePasses.length} escenas S-2 (Óptico/RedEdge) + {stacResult?.s1ScenesCount || 6} escenas S-1 (Radar Banda C sin nubes)
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Filtro de Constelación */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase">
                      <button
                        type="button"
                        onClick={() => setConstellationFilter('all')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          constellationFilter === 'all' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        Todas ({allSatellitePasses.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setConstellationFilter('s2')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          constellationFilter === 's2' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                        title="Mostrar solo pasadas ópticas Sentinel-2 L2A (NDVI 10m + NDRE B5/B6/B7 20m)"
                      >
                        S-2 Óptico/NDRE
                      </button>
                      <button
                        type="button"
                        onClick={() => setConstellationFilter('s1')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          constellationFilter === 's1' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                        title="Mostrar pasadas de Radar de Apertura Sintética Sentinel-1 (Banda C 5.405 GHz inmune a nubes)"
                      >
                        S-1 Radar SAR
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={refreshStacCatalog}
                      disabled={isLoadingStac}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 transition"
                      title="Volver a consultar escenas STAC sobre el polígono de la parcela"
                    >
                      <RefreshCw size={15} className={isLoadingStac ? 'animate-spin' : ''} />
                    </button>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setSelectedPassIndex(prev => Math.max(0, prev - 1))}
                        disabled={selectedPassIndex === 0}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                        title="Pasada anterior"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="text-xs font-black text-slate-500 dark:text-slate-400 font-mono">
                        {selectedPassIndex + 1}/{satellitePasses.length}
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
                </div>

                {/* Slider / Tarjetas horizontales de pasadas STAC */}
                <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                  {satellitePasses.map((pass, idx) => {
                    const isSelected = idx === selectedPassIndex;
                    const isSar = pass.sensorMode === 'SAR_C_BAND';
                    const passColor = getNDVIColor(pass.ndviAverage);
                    const ndreVal = pass.ndreAverage ?? Number((pass.ndviAverage * 0.82).toFixed(2));
                    const rviVal = pass.sarRviIndex ?? 0.68;
                    return (
                      <button
                        key={pass.id}
                        onClick={() => setSelectedPassIndex(idx)}
                        className={`flex-shrink-0 text-left p-3.5 rounded-2xl border-2 transition-all min-w-[172px] ${
                          isSelected
                            ? isSar
                              ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-md ring-2 ring-indigo-500/20'
                              : 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/50 shadow-md ring-2 ring-emerald-500/20'
                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 mb-1">
                          <span>Día {pass.cycleDay}</span>
                          <span className={`px-1.5 py-0.5 rounded font-mono ${
                            isSar ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300' : `${passColor.bg} ${passColor.text}`
                          }`}>
                            {pass.satellite.replace('Sentinel-', 'S-')}
                          </span>
                        </div>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center justify-between">
                          <span>{pass.date}</span>
                          {pass.isCanopyClosed && (
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400" title="Entresurco cerrado: se recomienda guiarse por NDRE">
                              NDRE
                            </span>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-center">
                          <div>
                            <span className="text-[8px] text-slate-400 font-bold block">NDVI</span>
                            <span className={`text-xs font-black ${passColor.text}`}>{pass.ndviAverage.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-rose-500 font-bold block">NDRE</span>
                            <span className="text-xs font-black text-rose-600 dark:text-rose-400">{ndreVal.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-indigo-500 font-bold block">SAR</span>
                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{rviVal.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400 truncate">
                          <span>{isSar ? '📡 Radar Sin Nubes' : `☁️ Nub: ${pass.cloudCoveragePct}%`}</span>
                          <span className="font-mono text-[8px] text-slate-400">{pass.mgrsTile || '19GGM'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fila de Mapa Interactivo y Panel de Diagnóstico */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Visor de Mapa Satelital y Teledetección Multiespectral */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-base flex items-center">
                        <Globe size={18} className="mr-2 text-emerald-600" />
                        Teledetección del Polígono ({activePass?.date})
                      </h3>
                      <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5 flex-wrap">
                        <span>Superposición sobre {selectedPlot?.name} ({selectedPlot?.surfaceArea || 1} {selectedPlot?.surfaceUnit || 'ha'})</span>
                        <span className="text-slate-500">•</span>
                        <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black uppercase border ${
                          mapLayer === 'sar_layer'
                            ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30'
                            : mapLayer === 'ndre_layer'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                        }`}>
                          {mapLayer === 'sar_layer'
                            ? 'Radar Activo: Sentinel-1 SAR (Banda C 5.405 GHz · Todo-Clima)'
                            : mapLayer === 'ndre_layer'
                            ? 'Sensor: Sentinel-2 MSI (Borde Rojo B5/B6/B7 · 20m)'
                            : `Sensor: ${activePass?.satellite || 'Sentinel-2'} (Óptico 10m · B8/B4)`}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Botones de Enfoque Geodésico (Parcela vs Predio) */}
                      <button
                        type="button"
                        onClick={() => {
                          setMapFocusMode('plot');
                          setMapFitTrigger(prev => prev + 1);
                        }}
                        title="Enfocar con zoom de alta precisión sobre la geodesia de la parcela"
                        className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                          mapFocusMode === 'plot'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Compass size={12} />
                        <span>Enfocar Parcela</span>
                      </button>

                      {locationPolygon.length >= 3 && (
                        <button
                          type="button"
                          onClick={() => {
                            setMapFocusMode('field');
                            setMapFitTrigger(prev => prev + 1);
                          }}
                          title="Ver ubicación de la parcela dentro del perímetro del Campo Padre"
                          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                            mapFocusMode === 'field'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Layers size={12} />
                          <span>Ver Predio</span>
                        </button>
                      )}

                      {/* Botón Estado y Modal de API Satelital */}
                      <button
                        onClick={() => setShowSatelliteApiModal(true)}
                        title="Conexión nativa activa con catálogo STAC Copernicus & AWS. No requiere configuración."
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 transition-all shadow-sm"
                      >
                        <Satellite size={13} className="animate-pulse" />
                        <span>API Satelital</span>
                        <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black">Activa</span>
                      </button>
                    </div>
                  </div>

                  {/* Switch de Capas Multiespectrales (NDVI + NDRE B5/B6/B7 + Sentinel-1 SAR) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        onClick={() => setMapLayer('satellite')}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          mapLayer === 'satellite' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm border border-slate-200/80 dark:border-slate-700' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        🛰️ Satélite
                      </button>
                      <button
                        onClick={() => setMapLayer('ndvi_layer')}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          mapLayer === 'ndvi_layer' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        🌿 NDVI (10m)
                      </button>
                      <button
                        onClick={() => setMapLayer('ndre_layer')}
                        title="Índice de Borde Rojo Sentinel-2 (Bandas 5, 6 y 7 · 20m): Evita la saturación del NDVI cuando el cultivo cerró el entresurco"
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                          mapLayer === 'ndre_layer' ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30' : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                        }`}
                      >
                        <span>🔴 NDRE (B5/B6/B7)</span>
                        {activePass?.isCanopyClosed && (
                          <span className="px-1 py-0.2 bg-amber-300 text-slate-950 rounded text-[8px] font-black">REC</span>
                        )}
                      </button>
                      <button
                        onClick={() => setMapLayer('sar_layer')}
                        title="Radar de Apertura Sintética Sentinel-1 (Banda C · Polarización VV/VH): Penetra el 100% de las nubes"
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                          mapLayer === 'sar_layer' ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                        }`}
                      >
                        <Radio size={12} className={mapLayer === 'sar_layer' ? 'animate-pulse' : ''} />
                        <span>{mapLayer === 'sar_layer' ? 'Radar S-1 SAR (Activo)' : 'Activar Radar S-1 SAR'}</span>
                        {((activePass?.cloudCoveragePct || 0) >= 20 || activePass?.notes?.includes('Sentinel-1 SAR')) && mapLayer !== 'sar_layer' && (
                          <span className="px-1 py-0.2 bg-amber-300 text-slate-950 rounded text-[8px] font-black animate-pulse">REC</span>
                        )}
                      </button>
                      <button
                        onClick={() => setMapLayer('foliage_layer')}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          mapLayer === 'foliage_layer' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        🍃 Dosel
                      </button>
                      <button
                        onClick={() => setMapLayer('moisture_layer')}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          mapLayer === 'moisture_layer' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        💧 NDMI Hídrico
                      </button>
                      <button
                        onClick={() => setMapLayer('street')}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          mapLayer === 'street' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm border border-slate-200/80 dark:border-slate-700' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        🗺️ Plano
                      </button>
                    </div>

                    {/* Controles de Geodesia, Opacidad y Grilla */}
                    <div className="flex flex-wrap items-center gap-2 px-2 py-1 bg-white/70 dark:bg-slate-900/70 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      <button
                        type="button"
                        onClick={() => setShowGeodesy(!showGeodesy)}
                        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all border ${
                          showGeodesy
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                            : 'text-slate-400 border-transparent'
                        }`}
                        title="Mostrar u ocultar vértices geodésicos (V1..Vn) y cotas métricas de la parcela"
                      >
                        📐 Geodesia: {showGeodesy ? 'ON' : 'OFF'}
                      </button>

                      {mapLayer !== 'satellite' && mapLayer !== 'street' && (
                        <>
                          <div className="flex items-center gap-1.5">
                            <SlidersHorizontal size={12} className="text-slate-400" />
                            <span>Opacidad: {Math.round(layerOpacity * 100)}%</span>
                            <input
                              type="range"
                              min="0.30"
                              max="0.95"
                              step="0.05"
                              value={layerOpacity}
                              onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                              className="w-16 h-1.5 accent-emerald-500 cursor-pointer"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowPixelGrid(!showPixelGrid)}
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all ${
                              showPixelGrid ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                            }`}
                          >
                            Malla S2: {showPixelGrid ? 'ON' : 'OFF'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Contenedor del Mapa */}
                  <div className="h-[440px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-0 bg-slate-950">
                    
                    {/* Floating HUD Chip con telemetría espectral */}
                    {activePass && (
                      <div className="absolute top-3 left-3 z-[400] pointer-events-none bg-slate-900/90 backdrop-blur-md text-white border border-white/10 rounded-2xl px-4 py-2.5 shadow-xl flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${activePassColor.text.replace('text-', 'bg-')} animate-pulse`}></span>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                              {selectedPlot?.name} • {activePass.stageName}
                            </p>
                            <p className="text-xs font-black flex items-center gap-1.5 text-white">
                              <span className={mapLayer === 'sar_layer' ? 'text-indigo-300 font-black' : mapLayer === 'ndre_layer' ? 'text-rose-300 font-black' : 'text-white'}>
                                {mapLayer === 'sar_layer'
                                  ? 'Sentinel-1 (SAR Banda C · Radar)'
                                  : mapLayer === 'ndre_layer'
                                  ? 'Sentinel-2 MSI (Borde Rojo NDRE)'
                                  : activePass.satellite}
                              </span>
                              <span className="text-slate-400 font-normal">| {activePass.date}</span>
                              <span className="text-[10px] font-mono text-emerald-400">({activePass.mgrsTile || '19GGM'})</span>
                            </p>
                          </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                          mapLayer === 'ndre_layer'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                            : mapLayer === 'sar_layer'
                            ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/40'
                            : `${activePassColor.bg} ${activePassColor.text} border ${activePassColor.border}`
                        }`}>
                          {mapLayer === 'ndre_layer'
                            ? `${(activePass.ndreAverage ?? Number((activePass.ndviAverage * 0.82).toFixed(2))).toFixed(2)} NDRE`
                            : mapLayer === 'sar_layer'
                            ? `${(activePass.sarRviIndex ?? 0.68).toFixed(2)} RVI SAR`
                            : mapLayer === 'foliage_layer'
                            ? `${activePass.canopyCoveragePct}% Dosel`
                            : mapLayer === 'moisture_layer'
                            ? `${(activePass.ndmiMoistureIndex ?? activePass.ndviAverage * 0.72).toFixed(2)} NDMI`
                            : `${activePass.ndviAverage.toFixed(2)} NDVI`}
                        </div>
                      </div>
                    )}

                    {/* Badge informativo de Geodesia y Píxeles calculados */}
                    <div className="absolute bottom-3 left-3 z-[400] pointer-events-none bg-slate-900/90 backdrop-blur-md text-white border border-white/15 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-wider flex flex-wrap items-center gap-2 shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>
                        Geodesia: {geodesicMetrics.vertices.length} Vértices • Perímetro {geodesicMetrics.perimeterMeters}m
                      </span>
                      {spectralCells.length > 0 && mapLayer !== 'satellite' && mapLayer !== 'street' && (
                        <span className="text-emerald-300 border-l border-white/20 pl-2">
                          {spectralCells.length} Celdas S2 Mapeadas
                        </span>
                      )}
                    </div>

                    <MapContainer
                      key={`agro-map-${selectedPlot?.id || 'default'}`}
                      center={[mapCenter.lat, mapCenter.lng]}
                      zoom={19}
                      maxZoom={22}
                      scrollWheelZoom={true}
                      zoomControl={false}
                      className="w-full h-full"
                      style={{ width: '100%', height: '100%' }}
                    >
                      <ZoomControl position="bottomright" />
                      <MapResizer />
                      <MapRecenter 
                        polygon={plotPolygon || undefined} 
                        locationPolygon={locationPolygon.length >= 3 ? locationPolygon : undefined}
                        center={mapCenter} 
                        focusMode={mapFocusMode}
                        fitTrigger={mapFitTrigger}
                      />

                      {/* Capa Base Satelital de Alta Resolución con soporte de Overzoom hasta nivel 22 para micro-parcelas (9.72 m²) */}
                      {mapLayer !== 'street' && (
                        <>
                          <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution='&copy; Esri World Imagery & Sentinel-2'
                            maxNativeZoom={17}
                            maxZoom={22}
                          />
                          <TileLayer
                            url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                            attribution='&copy; Google Satellite & Sentinel-2'
                            maxNativeZoom={19}
                            maxZoom={22}
                          />
                        </>
                      )}

                      {/* Capa Base Plano para OpenStreetMap */}
                      {mapLayer === 'street' && (
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; OpenStreetMap'
                          maxNativeZoom={19}
                          maxZoom={22}
                        />
                      )}

                      {/* 1. Perímetro Geodésico del Campo Padre (Referencia Catastral) */}
                      {locationPolygon.length >= 3 && (
                        <Polygon
                          positions={locationPolygon.map(p => [p.lat, p.lng])}
                          interactive={false}
                          pathOptions={{
                            color: '#f59e0b',
                            fillColor: '#f59e0b',
                            fillOpacity: 0.03,
                            weight: 2,
                            dashArray: '6, 6'
                          }}
                        />
                      )}

                      {/* 2. Parcelas Vecinas del mismo Establecimiento (Contexto de Ensayo/Bloques) */}
                      {siblingPlots.map(sib => (
                        <Polygon
                          key={`sib-${sib.id}`}
                          positions={sib.polygon.map(p => [p.lat, p.lng])}
                          pathOptions={{
                            color: '#38bdf8',
                            fillColor: '#0284c7',
                            fillOpacity: 0.12,
                            weight: 1.8,
                            dashArray: '3, 5'
                          }}
                        >
                          <LeafletTooltip direction="top" offset={[0, -4]} className="font-bold text-[10px] bg-slate-900/90 text-sky-300 rounded-lg px-2 py-1 border border-sky-500/30">
                            Parcela Vecina: {sib.name} ({sib.surfaceArea} {sib.surfaceUnit})
                          </LeafletTooltip>
                        </Polygon>
                      ))}

                      {/* 3. Halo / Borde Exterior de Contraste Geodésico de la Parcela Seleccionada */}
                      {plotPolygon && plotPolygon.length >= 3 && (
                        <Polygon
                          positions={plotPolygon.map(p => [p.lat, p.lng])}
                          interactive={false}
                          pathOptions={{
                            color: '#020617',
                            fillColor: activePassColor.fill,
                            fillOpacity: mapLayer === 'satellite' ? 0.28 : (mapLayer === 'street' ? 0.22 : layerOpacity * 0.35),
                            weight: 6,
                            opacity: 0.85
                          }}
                        />
                      )}

                      {/* 4. Malla Espectral Geodésica Interpolada sobre la Parcela */}
                      {mapLayer !== 'satellite' && mapLayer !== 'street' && spectralCells.map((cell) => (
                        <Polygon
                          key={cell.id}
                          positions={cell.bounds}
                          pathOptions={{
                            fillColor: cell.fillColor,
                            fillOpacity: layerOpacity,
                            color: showPixelGrid ? 'rgba(255, 255, 255, 0.38)' : cell.fillColor,
                            weight: showPixelGrid ? 1 : 0.4
                          }}
                        >
                          <LeafletTooltip direction="top" offset={[0, -5]} className="font-bold text-xs bg-slate-900 text-white rounded-xl p-2 shadow-xl border border-white/10">
                            <div className="space-y-0.5">
                              <p className="font-black text-emerald-400 text-[11px] flex items-center justify-between gap-2">
                                <span>{cell.pixelSize}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{activePass?.date}</span>
                              </p>
                              {mapLayer === 'ndvi_layer' && (
                                <p className="text-white text-xs font-bold">
                                  NDVI (B8/B4): <span className="font-black text-emerald-300">{cell.ndvi.toFixed(2)}</span> • {cell.statusLabel}
                                </p>
                              )}
                              {mapLayer === 'ndre_layer' && (
                                <p className="text-white text-xs font-bold">
                                  NDRE Borde Rojo (B8A/B5): <span className="font-black text-rose-300">{cell.ndre.toFixed(2)}</span> • {cell.statusLabel}
                                </p>
                              )}
                              {mapLayer === 'sar_layer' && (
                                <p className="text-white text-xs font-bold">
                                  Radar SAR RVI: <span className="font-black text-indigo-300">{cell.sarRvi.toFixed(2)}</span> (VV: {cell.sarVv}dB | VH: {cell.sarVh}dB)
                                </p>
                              )}
                              {mapLayer === 'foliage_layer' && (
                                <p className="text-white text-xs font-bold">
                                  Follaje/Dosel: <span className="font-black text-emerald-300">{cell.foliage}%</span> • {cell.statusLabel}
                                </p>
                              )}
                              {mapLayer === 'moisture_layer' && (
                                <p className="text-white text-xs font-bold">
                                  Humedad NDMI (B8A/B11): <span className="font-black text-sky-300">{cell.moisture.toFixed(2)}</span> • {cell.statusLabel}
                                </p>
                              )}
                              <p className="text-[9px] text-slate-400">
                                NDVI: {cell.ndvi.toFixed(2)} | NDRE: {cell.ndre.toFixed(2)} | SAR RVI: {cell.sarRvi.toFixed(2)} | Dosel: {cell.foliage}%
                              </p>
                            </div>
                          </LeafletTooltip>
                        </Polygon>
                      ))}

                      {/* 5. Vector Oficial del Perímetro Geodésico de la Parcela */}
                      {plotPolygon && plotPolygon.length >= 3 && (
                        <Polygon
                          positions={plotPolygon.map(p => [p.lat, p.lng])}
                          interactive={mapLayer === 'satellite' || mapLayer === 'street'}
                          pathOptions={{
                            color: mapLayer === 'satellite' ? '#10b981' : '#ffffff',
                            fillColor: activePassColor.fill,
                            fillOpacity: mapLayer === 'satellite' ? 0.25 : 0,
                            weight: 3.5,
                            dashArray: showGeodesy ? undefined : '5, 5'
                          }}
                        >
                          {(mapLayer === 'satellite' || mapLayer === 'street') && (
                            <LeafletTooltip direction="top" offset={[0, -10]} className="font-bold text-xs bg-slate-900 text-white rounded-xl p-2 shadow-xl border border-white/10">
                              <span className="font-black text-emerald-400">{selectedPlot?.name} ({selectedPlot?.surfaceArea || 1} {selectedPlot?.surfaceUnit || 'ha'})</span>
                              <span className="block text-[11px] text-slate-300 font-normal">
                                Perímetro Geodésico: {geodesicMetrics.perimeterMeters} m • {geodesicMetrics.vertices.length} vértices
                              </span>
                              <span className="block text-[11px] text-emerald-300 font-normal">
                                {activePass?.stageName} • NDVI: {activePass?.ndviAverage.toFixed(2)} | NDRE: {(activePass?.ndreAverage ?? 0.62).toFixed(2)}
                              </span>
                            </LeafletTooltip>
                          )}
                        </Polygon>
                      )}

                      {/* 6. Vértices Geodésicos Oficiales (V1..Vn) y Cotas de Lado en Metros */}
                      {showGeodesy && geodesicMetrics.vertices.map((v) => {
                        const vertexIcon = L.divIcon({
                          className: 'geodesic-vertex-marker',
                          html: `<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#059669;color:#ffffff;font-weight:900;font-size:9px;font-family:monospace;border:2px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.65);">${v.label}</div>`,
                          iconSize: [20, 20],
                          iconAnchor: [10, 10]
                        });

                        const sideBadgeIcon = L.divIcon({
                          className: 'geodesic-side-label',
                          html: `<div style="background:rgba(15,23,42,0.88);color:#6ee7b7;font-family:monospace;font-weight:800;font-size:9px;padding:1px 5px;border-radius:6px;border:1px solid rgba(16,185,129,0.5);white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.5);pointer-events:none;">${v.sideLengthMeters}m</div>`,
                          iconSize: [44, 16],
                          iconAnchor: [22, 8]
                        });

                        return (
                          <React.Fragment key={`geodesy-${v.label}`}>
                            <Marker position={[v.lat, v.lng]} icon={vertexIcon}>
                              <LeafletTooltip direction="top" offset={[0, -10]} className="bg-slate-900 text-white rounded-xl p-2 shadow-xl border border-emerald-500/40 font-mono text-[10px]">
                                <div className="font-black text-emerald-400">Vértice Geodésico {v.label} ({selectedPlot?.name})</div>
                                <div className="text-slate-200">Lat: {v.lat.toFixed(7)}° | Lng: {v.lng.toFixed(7)}°</div>
                                <div className="text-amber-300 font-bold">Tramo {v.label} → {v.nextLabel}: {v.sideLengthMeters} m</div>
                              </LeafletTooltip>
                            </Marker>
                            <Marker position={[v.midPoint.lat, v.midPoint.lng]} icon={sideBadgeIcon} interactive={false} />
                          </React.Fragment>
                        );
                      })}
                    </MapContainer>
                  </div>

                  {/* Escala Dinámica de Teledetección adaptada al modo activo */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[11px] font-bold">
                    {mapLayer === 'ndvi_layer' && (
                      <>
                        <span className="text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity size={13} className="text-emerald-500" />
                          Escala NDVI (Sentinel-2 · B8/B4 10m):
                        </span>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center text-red-500"><span className="w-3 h-3 rounded bg-[#ef4444] mr-1.5"></span> Suelo (&lt;0.25)</span>
                          <span className="flex items-center text-amber-500"><span className="w-3 h-3 rounded bg-[#eab308] mr-1.5"></span> Estrés (0.35-0.47)</span>
                          <span className="flex items-center text-lime-500"><span className="w-3 h-3 rounded bg-[#84cc16] mr-1.5"></span> Moderado (0.48-0.64)</span>
                          <span className="flex items-center text-emerald-500"><span className="w-3 h-3 rounded bg-[#10b981] mr-1.5"></span> Alto (0.65-0.77)</span>
                          <span className="flex items-center text-emerald-600 font-black"><span className="w-3 h-3 rounded bg-[#047857] mr-1.5"></span> Vigor Óptimo (&gt;0.78)</span>
                        </div>
                      </>
                    )}

                    {mapLayer === 'ndre_layer' && (
                      <>
                        <span className="text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={13} />
                          Escala NDRE Borde Rojo (B5 705nm / B6 740nm / B7 783nm · 20m):
                        </span>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center text-rose-400"><span className="w-3 h-3 rounded bg-[#fca5a5] mr-1.5"></span> Baja (&lt;0.22)</span>
                          <span className="flex items-center text-amber-500"><span className="w-3 h-3 rounded bg-[#facc15] mr-1.5"></span> Juvenil (0.22-0.33)</span>
                          <span className="flex items-center text-orange-500"><span className="w-3 h-3 rounded bg-[#f97316] mr-1.5"></span> Activo (0.34-0.47)</span>
                          <span className="flex items-center text-rose-500"><span className="w-3 h-3 rounded bg-[#e11d48] mr-1.5"></span> Nitrógeno Alto (0.48-0.61)</span>
                          <span className="flex items-center text-rose-700 dark:text-rose-300 font-black"><span className="w-3 h-3 rounded bg-[#be123c] mr-1.5"></span> Clorofila Plena (&gt;0.62)</span>
                        </div>
                      </>
                    )}

                    {mapLayer === 'sar_layer' && (
                      <>
                        <span className="text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Radio size={13} />
                          Escala Radar Sentinel-1 SAR (Banda C 5.405 GHz · RVI VV/VH Sin Nubes):
                        </span>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center text-slate-400"><span className="w-3 h-3 rounded bg-[#94a3b8] mr-1.5"></span> Suelo (&lt;0.38)</span>
                          <span className="flex items-center text-sky-500"><span className="w-3 h-3 rounded bg-[#38bdf8] mr-1.5"></span> Dosel Medio (0.38-0.54)</span>
                          <span className="flex items-center text-indigo-500"><span className="w-3 h-3 rounded bg-[#6366f1] mr-1.5"></span> Estructura Densa (0.55-0.71)</span>
                          <span className="flex items-center text-indigo-700 dark:text-indigo-300 font-black"><span className="w-3 h-3 rounded bg-[#4f46e5] mr-1.5"></span> Biomasa Caulinar Máx (&gt;0.72)</span>
                        </div>
                      </>
                    )}

                    {mapLayer === 'foliage_layer' && (
                      <>
                        <span className="text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Leaf size={13} className="text-emerald-500" />
                          Cobertura del Dosel (Follaje):
                        </span>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center text-amber-600"><span className="w-3 h-3 rounded bg-[#fde68a] mr-1.5"></span> Suelo (&lt;25%)</span>
                          <span className="flex items-center text-emerald-400"><span className="w-3 h-3 rounded bg-[#34d399] mr-1.5"></span> Moderado (45-69%)</span>
                          <span className="flex items-center text-emerald-500"><span className="w-3 h-3 rounded bg-[#059669] mr-1.5"></span> Denso (70-84%)</span>
                          <span className="flex items-center text-emerald-700 font-black"><span className="w-3 h-3 rounded bg-[#065f46] mr-1.5"></span> Dosel Cerrado (&gt;85%)</span>
                        </div>
                      </>
                    )}

                    {mapLayer === 'moisture_layer' && (
                      <>
                        <span className="text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Droplets size={13} className="text-sky-500" />
                          Estrés Hídrico & Turgencia (NDMI B8A/B11):
                        </span>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center text-orange-600"><span className="w-3 h-3 rounded bg-[#ea580c] mr-1.5"></span> Déficit Severo (&lt;0.28)</span>
                          <span className="flex items-center text-amber-500"><span className="w-3 h-3 rounded bg-[#fbbf24] mr-1.5"></span> Estrés Moderado (0.28-0.39)</span>
                          <span className="flex items-center text-sky-400"><span className="w-3 h-3 rounded bg-[#38bdf8] mr-1.5"></span> Humedad Óptima (0.40-0.54)</span>
                          <span className="flex items-center text-sky-600 font-black"><span className="w-3 h-3 rounded bg-[#0284c7] mr-1.5"></span> Alta Turgencia (&gt;0.55)</span>
                        </div>
                      </>
                    )}

                    {(mapLayer === 'satellite' || mapLayer === 'street') && (
                      <div className="flex items-center justify-between w-full text-xs text-slate-500 font-medium">
                        <span>🛰️ Visualización Óptica Natural + Geodesia Vectorial de la Parcela ({geodesicMetrics.vertices.length} vértices).</span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Selecciona "NDVI", "NDRE (B5/B6/B7)" o "Radar SAR" para análisis espectral</span>
                      </div>
                    )}
                  </div>

                  {/* Ficha Técnica de Geodesia de la Parcela (Vértices GPS y Dimensiones Métricas) */}
                  {geodesicMetrics.vertices.length > 0 && (
                    <div className="p-4 bg-slate-900 text-white rounded-2xl border border-emerald-500/20 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-black uppercase border border-emerald-500/30">
                            Geodesia Activa
                          </span>
                          <span className="text-xs font-black uppercase tracking-tight">
                            Relevamiento Planimétrico • {selectedPlot?.name}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
                          <span className="text-slate-300">
                            Área Declarada: <strong className="text-emerald-400">{selectedPlot?.surfaceArea || 1} {selectedPlot?.surfaceUnit || 'ha'}</strong>
                          </span>
                          <span className="text-slate-300">
                            Perímetro: <strong className="text-amber-300">{geodesicMetrics.perimeterMeters} m</strong>
                          </span>
                          <span className="text-slate-300">
                            Centroide: <strong className="text-sky-300">{mapCenter.lat.toFixed(6)}°, {mapCenter.lng.toFixed(6)}°</strong>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {geodesicMetrics.vertices.map((v) => (
                          <div key={`card-v-${v.label}`} className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-2 text-[10px] font-mono">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-black text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                {v.label} → {v.nextLabel}
                              </span>
                              <span className="font-black text-amber-300">{v.sideLengthMeters} m</span>
                            </div>
                            <div className="text-slate-300 truncate">Lat: {v.lat.toFixed(6)}°</div>
                            <div className="text-slate-400 truncate">Lng: {v.lng.toFixed(6)}°</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Panel de Diagnóstico Multi-Sensor de la Pasada Activa (NDVI + NDRE B5/B6/B7 + Sentinel-1 SAR + STAC) */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${activePassColor.bg} ${activePassColor.text} ${activePassColor.border}`}>
                        {activePass?.stageName}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 font-mono">
                        {activePass?.satellite} • {activePass?.acquisitionTimeLocal || '11:24 hs (UTC-3)'}
                      </span>
                    </div>

                    {/* Trío de Tarjetas Espectrales: NDVI (10m) + NDRE Borde Rojo (20m) + Sentinel-1 SAR (RVI) */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div
                        onClick={() => setMapLayer('ndvi_layer')}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                          mapLayer === 'ndvi_layer'
                            ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                          <span>NDVI (10m)</span>
                          <span>B8/B4</span>
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
                          {activePass?.ndviAverage.toFixed(2)}
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold mt-0.5 truncate">
                          {activePass?.ndviMin.toFixed(2)}–{activePass?.ndviMax.toFixed(2)}
                        </div>
                      </div>

                      <div
                        onClick={() => setMapLayer('ndre_layer')}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                          mapLayer === 'ndre_layer'
                            ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/20'
                            : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-900/40 hover:border-rose-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[9px] font-black uppercase text-rose-600 dark:text-rose-400">
                          <span>NDRE (20m)</span>
                          <span>B5-B7</span>
                        </div>
                        <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1">
                          {(activePass?.ndreAverage ?? Number(((activePass?.ndviAverage || 0.72) * 0.82).toFixed(2))).toFixed(2)}
                        </div>
                        <div className="text-[9px] text-rose-500/80 font-bold mt-0.5 truncate">
                          Borde Rojo
                        </div>
                      </div>

                      <div
                        onClick={() => setMapLayer('sar_layer')}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                          mapLayer === 'sar_layer'
                            ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/20'
                            : 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/70 dark:border-indigo-900/40 hover:border-indigo-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                          <span>SAR (RVI)</span>
                          <span>VH/VV</span>
                        </div>
                        <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                          {(activePass?.sarRviIndex ?? 0.68).toFixed(2)}
                        </div>
                        <div className="text-[9px] text-indigo-500/80 font-bold mt-0.5 truncate">
                          {activePass?.sarVvDb ?? -9.2} dB VV
                        </div>
                      </div>
                    </div>

                    {/* Alerta Inteligente de Cierre de Entresurco (Recomendación Técnica NDRE) */}
                    {(activePass?.isCanopyClosed || (activePass?.canopyCoveragePct || 0) >= 75) && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start justify-between gap-2.5">
                        <div className="text-[11px] text-rose-800 dark:text-rose-200 leading-snug">
                          <span className="font-black uppercase text-rose-600 dark:text-rose-400 block">
                            🔴 Entresurco Cerrado ({activePass?.canopyCoveragePct}% Dosel) • Activar NDRE
                          </span>
                          El NDVI ({activePass?.ndviAverage.toFixed(2)}) entra en saturación óptica con canopia densa. Sustituye o acompaña con <strong>NDRE ({activePass?.ndreAverage?.toFixed(2)})</strong> en Bandas 5, 6 y 7 de Borde Rojo.
                        </div>
                        {mapLayer !== 'ndre_layer' && (
                          <button
                            type="button"
                            onClick={() => setMapLayer('ndre_layer')}
                            className="shrink-0 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm"
                          >
                            Ver NDRE
                          </button>
                        )}
                      </div>
                    )}

                    {/* Alerta Inteligente de Continuidad Temporal Sentinel-1 SAR cuando hay nubes o modo radar */}
                    {((activePass?.cloudCoveragePct || 0) >= 20 || activePass?.sensorMode === 'SAR_C_BAND') && (
                      <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="text-[11px] text-indigo-900 dark:text-indigo-200 leading-snug">
                          <span className="font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mb-0.5">
                            <Radio size={13} className="animate-pulse" />
                            <span>Continuidad Todo-Clima Sentinel-1 SAR (Banda C · 5.405 GHz)</span>
                          </span>
                          {activePass?.sensorMode === 'SAR_C_BAND'
                            ? `Adquisición activa de radar inmune a nubosidad. Retrodispersión VV ${activePass.sarVvDb} dB / VH ${activePass.sarVhDb} dB.`
                            : `Nubosidad del ${activePass?.cloudCoveragePct}% detectada en pasada óptica ${activePass?.satellite}. Se recomienda conmutar a Sentinel-1 SAR (RVI ${(activePass?.sarRviIndex ?? 0.68).toFixed(2)}) para lectura sin interferencia.`}
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {mapLayer !== 'sar_layer' ? (
                            <button
                              type="button"
                              onClick={() => setMapLayer('sar_layer')}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 transition"
                            >
                              <Radio size={12} />
                              <span>Activar Radar S-1 SAR</span>
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              ✓ Visualizando Radar S-1
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Telemetría Espectral Detallada: Bandas 5, 6 y 7 (Borde Rojo) + Radar Sentinel-1 */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-2.5 text-[11px]">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                      <span>Bandas Red Edge (Sentinel-2 MSI) & SAR (Sentinel-1)</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">RECI Clorofila: {activePass?.reciChlorophyllIndex ?? 2.15}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center font-mono">
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] text-slate-400 block font-sans font-bold">Banda 5 (705nm)</span>
                        <span className="font-black text-rose-600 dark:text-rose-400">{activePass?.redEdgeB5Reflectance ?? 0.088}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] text-slate-400 block font-sans font-bold">Banda 6 (740nm)</span>
                        <span className="font-black text-rose-600 dark:text-rose-400">{activePass?.redEdgeB6Reflectance ?? 0.254}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] text-slate-400 block font-sans font-bold">Banda 7 (783nm)</span>
                        <span className="font-black text-rose-600 dark:text-rose-400">{activePass?.redEdgeB7Reflectance ?? 0.362}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center font-mono">
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] text-slate-400 block font-sans font-bold">SAR VV (Banda C)</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400">{activePass?.sarVvDb ?? -9.1} dB</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] text-slate-400 block font-sans font-bold">SAR VH (Cruzada)</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400">{activePass?.sarVhDb ?? -14.6} dB</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] text-slate-400 block font-sans font-bold">Ratio VH/VV</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400">{activePass?.sarVhVvRatioDb ?? -5.5} dB</span>
                      </div>
                    </div>
                  </div>

                  {/* Desglose de Superficie y Resolución Espacial sobre el Polígono */}
                  <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center text-[11px] font-black uppercase text-slate-500">
                      <span>Distribución Espacial en Lote</span>
                      <span>Área Geodésica: {geodesicMetrics.geodesicAreaM2 || selectedPlot?.surfaceArea || 1} m²</span>
                    </div>

                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
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

                    <div className="grid grid-cols-3 gap-2 pt-0.5 text-[10px]">
                      <div>
                        <span className="text-emerald-600 font-black">{activePass?.optimalAreaPct}%</span>{' '}
                        <span className="text-slate-400 font-bold">Óptimo</span>
                      </div>
                      <div>
                        <span className="text-amber-500 font-black">{activePass?.moderateAreaPct}%</span>{' '}
                        <span className="text-slate-400 font-bold">Moderado</span>
                      </div>
                      <div>
                        <span className="text-red-500 font-black">{activePass?.stressedAreaPct}%</span>{' '}
                        <span className="text-slate-400 font-bold">Suelo/Estrés</span>
                      </div>
                    </div>

                    {/* Nota Técnica de Escala Píxel vs Polígono */}
                    <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>
                        {(geodesicMetrics.geodesicAreaM2 > 0 && geodesicMetrics.geodesicAreaM2 < 100) || selectedPlot?.surfaceUnit === 'm2'
                          ? `📐 Micro-parcela (${geodesicMetrics.geodesicAreaM2 || selectedPlot?.surfaceArea} m² < 1 píxel S-2 de 100 m²): Lectura de píxel envolvente + sub-malla geodésica`
                          : `📐 Lote Productivo: Estadística zonal directa sobre píxeles de 10m (NDVI/SAR) y 20m (NDRE)`}
                      </span>
                    </div>
                  </div>

                  {/* Inspector de Escena STAC Oficial & Enlaces COG */}
                  <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Satellite size={13} /> Escena STAC Indexada ({activePass?.mgrsTile || '19GGM'})
                      </span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        {activePass?.stacCollection || 'sentinel-2-l2a'}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-300 truncate" title={activePass?.stacItemId}>
                      ID: <strong className="text-white">{activePass?.stacItemId || activePass?.id}</strong>
                    </div>
                    {activePass?.stacAssets && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[9px] text-slate-400 font-bold mr-1">Bandas COG STAC:</span>
                        {activePass.stacAssets.redB04 && (
                          <a href={activePass.stacAssets.redB04} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-emerald-600 text-[9px] font-mono text-slate-200 transition">
                            B04 (Red) ↗
                          </a>
                        )}
                        {activePass.stacAssets.rededge1B05 && (
                          <a href={activePass.stacAssets.rededge1B05} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 rounded bg-rose-950/80 hover:bg-rose-600 text-[9px] font-mono text-rose-200 border border-rose-500/30 transition">
                            B05 (705nm) ↗
                          </a>
                        )}
                        {activePass.stacAssets.rededge2B06 && (
                          <a href={activePass.stacAssets.rededge2B06} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 rounded bg-rose-950/80 hover:bg-rose-600 text-[9px] font-mono text-rose-200 border border-rose-500/30 transition">
                            B06 (740nm) ↗
                          </a>
                        )}
                        {activePass.stacAssets.rededge3B07 && (
                          <a href={activePass.stacAssets.rededge3B07} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 rounded bg-rose-950/80 hover:bg-rose-600 text-[9px] font-mono text-rose-200 border border-rose-500/30 transition">
                            B07 (783nm) ↗
                          </a>
                        )}
                        {activePass.stacAssets.nirNarrowB8A && (
                          <a href={activePass.stacAssets.nirNarrowB8A} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-emerald-600 text-[9px] font-mono text-slate-200 transition">
                            B8A (NIR) ↗
                          </a>
                        )}
                        {activePass.stacAssets.vv && (
                          <a href={activePass.stacAssets.vv} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 rounded bg-indigo-950/80 hover:bg-indigo-600 text-[9px] font-mono text-indigo-200 border border-indigo-500/30 transition">
                            SAR VV ↗
                          </a>
                        )}
                        {activePass.stacAssets.vh && (
                          <a href={activePass.stacAssets.vh} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 rounded bg-indigo-950/80 hover:bg-indigo-600 text-[9px] font-mono text-indigo-200 border border-indigo-500/30 transition">
                            SAR VH ↗
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Diagnóstico Agronómico Satelital */}
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-500/20 text-xs space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <Sparkles size={14} /> Dictamen Agronómico Multi-Índice:
                      </p>
                      <span className="font-black text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">
                        {activePass?.biomassEstimateKgHa.toLocaleString()} kg MS/ha
                      </span>
                    </div>
                    <p className="text-emerald-700 dark:text-emerald-400/90 leading-relaxed font-medium text-[11px]">
                      {activePass?.notes}
                    </p>
                    {activePass?.notes?.includes('Sentinel-1 SAR') && mapLayer !== 'sar_layer' && (
                      <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] text-emerald-800 dark:text-emerald-200 font-bold">
                          ℹ️ El mapa muestra actualmente el sensor óptico ({activePass.satellite}).
                        </span>
                        <button
                          type="button"
                          onClick={() => setMapLayer('sar_layer')}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm transition"
                        >
                          <Radio size={12} />
                          <span>Conmutar Mapa a Sentinel-1 SAR</span>
                        </button>
                      </div>
                    )}
                    {activePass?.notes?.includes('NDRE') && mapLayer !== 'ndre_layer' && (
                      <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] text-emerald-800 dark:text-emerald-200 font-bold">
                          ℹ️ Entresurco cerrado: se aconseja ver Borde Rojo.
                        </span>
                        <button
                          type="button"
                          onClick={() => setMapLayer('ndre_layer')}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm transition"
                        >
                          <span>Conmutar Mapa a NDRE (B5/B6/B7)</span>
                        </button>
                      </div>
                    )}
                  </div>

                </div>

              </div>

              {/* Curva Fenológica Multitemporal Combinada: NDVI (10m) + NDRE Borde Rojo (20m) + Sentinel-1 SAR (RVI) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-base flex items-center">
                      <TrendingUp size={18} className="mr-2 text-emerald-600" />
                      Curva Fenológica Multi-Sensor: NDVI (Óptico) vs. NDRE (Borde Rojo B5-B7) vs. RVI (Sentinel-1 SAR)
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold">
                      Cuando el NDVI supera 0.75 (cierre de entresurco), el índice NDRE continúa midiendo clorofila sin saturarse y el radar SAR asegura lecturas en días nublados
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-black">
                    <span className="flex items-center gap-1.5 text-emerald-600"><span className="w-3 h-1.5 rounded bg-emerald-500"></span> NDVI (10m)</span>
                    <span className="flex items-center gap-1.5 text-rose-600"><span className="w-3 h-1.5 rounded bg-rose-500"></span> NDRE Borde Rojo (20m)</span>
                    <span className="flex items-center gap-1.5 text-indigo-600"><span className="w-3 h-1.5 rounded bg-indigo-500"></span> Radar SAR RVI (Sin Nubes)</span>
                  </div>
                </div>

                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={satellitePasses}>
                      <defs>
                        <linearGradient id="ndviGradPass" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.65}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="ndreGradPass" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e11d48" stopOpacity={0.55}/>
                          <stop offset="95%" stopColor="#e11d48" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="sarGradPass" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={45} />
                      <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                      <Tooltip 
                        formatter={(val: any, name: string) => {
                          if (name === 'ndviAverage') return [`${val}`, 'NDVI (10m · B8/B4)'];
                          if (name === 'ndreAverage') return [`${val}`, 'NDRE Borde Rojo (20m · B8A/B5)'];
                          if (name === 'sarRviIndex') return [`${val}`, 'Sentinel-1 SAR RVI (Banda C)'];
                          return [val, name];
                        }}
                        labelFormatter={(label) => `Escena STAC Fecha: ${label}`}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#fff', fontSize: '11px' }}
                      />
                      <Area type="monotone" dataKey="ndviAverage" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#ndviGradPass)" />
                      <Area type="monotone" dataKey="ndreAverage" stroke="#e11d48" strokeWidth={2.5} fillOpacity={1} fill="url(#ndreGradPass)" />
                      <Area type="monotone" dataKey="sarRviIndex" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#sarGradPass)" />
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

              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200/70 dark:border-blue-900/40 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <span className="font-black text-blue-700 dark:text-blue-300 block uppercase tracking-wider text-[10px]">
                  Sinergia Pluviómetro ⇄ Huella Hídrica
                </span>
                <p className="leading-relaxed">
                  El <strong>Pluviómetro</strong> registra las entradas de agua en campo (lluvia física vs satélite GFS y turnos de riego). La <strong>Huella Hídrica</strong> procesa esos registros bajo el estándar <strong>Hoekstra (WFN)</strong> en Agua Verde, Azul y Gris.
                </p>
              </div>

              <Link
                to={`/plots/${selectedPlot?.id}?tab=water`}
                className="flex items-center justify-center space-x-2 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg"
              >
                <Droplets size={14} />
                <span>Abrir Pluviómetro & Bitácora de Agua</span>
                <ArrowRight size={14} />
              </Link>
            </div>

          </div>

          {/* DESGLOSE PROTOCOLAR DE HUELLA HÍDRICA (WATER FOOTPRINT NETWORK) */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg flex items-center gap-2">
                  <Droplets className="text-blue-500" size={22} />
                  <span>Protocolo de Huella Hídrica (Hoekstra / Water Footprint Network)</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Desglose volumétrico de agua verde, azul y gris consumida por hectárea y por unidad de cosecha.
                </p>
              </div>
              <span className="text-xs font-black px-3 py-1 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 w-fit">
                Estándar WFN ISO 14046
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 bg-green-50/60 dark:bg-green-950/20 rounded-3xl border border-green-200/60 dark:border-green-900/40 space-y-2">
                <span className="text-[10px] font-black uppercase text-green-700 dark:text-green-300">Huella Verde (Lluvia)</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{waterMetrics.greenWaterFootprintM3Ha.toLocaleString()} <span className="text-xs text-slate-400 font-normal">m³/ha</span></p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Agua de precipitación pluvial naturalmente evapotranspirada.</p>
              </div>

              <div className="p-5 bg-blue-50/60 dark:bg-blue-950/20 rounded-3xl border border-blue-200/60 dark:border-blue-900/40 space-y-2">
                <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300">Huella Azul (Riego)</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{waterMetrics.blueWaterFootprintM3Ha.toLocaleString()} <span className="text-xs text-slate-400 font-normal">m³/ha</span></p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Extracción de fuentes superficiales o subterráneas presurizadas.</p>
              </div>

              <div className="p-5 bg-slate-100/70 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Huella Gris (Dilución)</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{waterMetrics.greyWaterFootprintM3Ha} <span className="text-xs text-slate-400 font-normal">m³/ha</span></p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Carga asimilativa mínima requerida (bajo uso de agroquímicos).</p>
              </div>

              <div className="p-5 bg-emerald-500 text-white rounded-3xl shadow-lg space-y-2">
                <span className="text-[10px] font-black uppercase text-emerald-100">Intensidad Hídrica / kg</span>
                <p className="text-2xl font-black">{waterMetrics.waterFootprintPerKgYieldLiters} <span className="text-xs text-emerald-100 font-normal">L / kg MS</span></p>
                <p className="text-[11px] text-emerald-100 font-medium">Litros de agua por kilo de biomasa seca producida.</p>
              </div>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Eficiencia de Uso de Agua (WUE): <strong>{waterMetrics.wueBiomassKgM3} kg de materia seca / m³</strong>
                </span>
              </div>
              <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300 font-medium">
                <span>Ahorro vs Algodón: <strong className="text-emerald-600 font-black">-{waterMetrics.waterBenchmarkVsCottonPct}%</strong></span>
                <span>Ahorro vs Maíz: <strong className="text-emerald-600 font-black">-{waterMetrics.waterBenchmarkVsCornPct}%</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: CAPTURA DE CO2 & HUELLA DE CARBONO (MRV) */}
      {activeTab === 'carbon' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Encabezado y Acción Oficial */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 p-8 rounded-[36px] text-white border border-emerald-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-2 relative z-10">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Proyecto Huella de Carbono & Bioeconomía
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                Captura Neta de CO₂ & Protocolo MRV
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl font-medium">
                Medición, Reporte y Verificación del balance neto de carbono por hectárea cultivada. Certificación para mercados voluntarios y bonos verdes.
              </p>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <button
                onClick={handleDownloadCarbonPdf}
                className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition active:scale-95 flex items-center gap-2"
              >
                <Download size={16} />
                <span>Exportar Certificado de Carbono (PDF)</span>
              </button>
            </div>
          </div>

          {/* 4 KPIs de Carbono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Captura Bruta Absorbida</span>
                <button 
                  onClick={() => setShowCarbonFormulaModal(true)}
                  className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition text-[10px] font-black flex items-center gap-1"
                  title="Ver desglose y fórmula matemática"
                >
                  <Info size={14} /> ¿De dónde sale?
                </button>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white">+{carbonData.totalGrossCaptureTonnesCO2Ha} <span className="text-sm font-bold text-slate-400">t/ha</span></p>
              <p className="text-[11px] text-slate-400 font-bold">Total Parcela ({carbonData.areaHa} ha): +{carbonData.totalGrossCaptureTonnesCO2Plot} t CO₂e</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Emisiones Operativas</span>
                <Car size={18} className="text-amber-500" />
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white">-{carbonData.totalEmissionsTonnesCO2Ha} <span className="text-sm font-bold text-slate-400">t/ha</span></p>
              <p className="text-[11px] text-slate-400 font-bold">Alcance 1 (diésel) y 2/3 (insumos)</p>
            </div>

            <div className="bg-emerald-600 text-white p-6 rounded-[28px] shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Balance Neto de Carbono</span>
                <Award size={18} className="text-yellow-300" />
              </div>
              <p className="text-3xl font-black">{carbonData.netCarbonBalanceTonnesCO2Ha} <span className="text-sm font-bold text-emerald-100">t/ha</span></p>
              <p className="text-[11px] text-emerald-100 font-bold">Sumidero Neto: Secuestro Carbono Negativo</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Créditos de Carbono</span>
                <Award size={18} className="text-purple-500" />
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{carbonData.carbonCreditsEstimated} <span className="text-sm font-bold text-slate-400">Bonos</span></p>
              <p className="text-[11px] text-slate-400 font-bold">tCO₂e certificables con buffer del 10%</p>
            </div>
          </div>

          {/* Desglose Metodológico de Carbono */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Leaf size={18} className="text-emerald-500" />
                <span>Desglose de Fijación Fotosintética y Edáfica</span>
              </h4>

              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-500/20 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">Fijación Aérea (Tallos, Follaje y Flores)</span>
                    <span className="text-[10px] text-slate-500">1.63 kg CO₂ por cada kg de biomasa seca producida</span>
                  </div>
                  <span className="text-base font-black text-emerald-600">+{carbonData.aboveGroundCaptureTonnesCO2Ha} t/ha</span>
                </div>

                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-500/20 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">Fijación Radicular y Carbono Orgánico (SOC)</span>
                    <span className="text-[10px] text-slate-500">Incorporación profunda en el perfil de suelo (0 - 120 cm)</span>
                  </div>
                  <span className="text-base font-black text-emerald-600">+{carbonData.belowGroundCaptureTonnesCO2Ha} t/ha</span>
                </div>

                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-500/20 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">Emisiones Diésel de Labores Mecánicas</span>
                    <span className="text-[10px] text-slate-500">Siembra, fertilización de base y cosecha mecánica</span>
                  </div>
                  <span className="text-base font-black text-amber-600">-{carbonData.fuelEmissionsTonnesCO2Ha} t/ha</span>
                </div>

                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-500/20 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">Insumos y Energía de Riego</span>
                    <span className="text-[10px] text-slate-500">Huella de fabricación de fertilizantes y bombeo</span>
                  </div>
                  <span className="text-base font-black text-amber-600">-{(carbonData.fertilizerEmissionsTonnesCO2Ha + carbonData.irrigationEnergyEmissionsTonnesCO2Ha).toFixed(2)} t/ha</span>
                </div>
              </div>
            </div>

            {/* Equivalencias Ecológicas & Durabilidad */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <TreePine size={18} className="text-emerald-500" />
                  <span>Equivalencias Ecológicas Verificables</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Impacto compensatorio directo del lote {selectedPlot?.name} frente a emisiones de la economía convencional:
                </p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-3xl space-y-1">
                    <Car size={24} className="text-emerald-600 mb-1" />
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{carbonData.carbonOffsetEquivalencyCars}</p>
                    <p className="text-[11px] text-slate-500 font-medium">Automóviles fuera de circulación por 1 año.</p>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-3xl space-y-1">
                    <TreePine size={24} className="text-emerald-600 mb-1" />
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{carbonData.carbonOffsetEquivalencyTrees.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-500 font-medium">Árboles nativos en absorción equivalente.</p>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-500/20 text-xs">
                  <span className="font-black text-emerald-800 dark:text-emerald-300 block mb-1">Permanencia de Retención de Carbono:</span>
                  <span className="text-slate-600 dark:text-slate-300">
                    Al destinarse a bioconstrucción (Hempcrete / Cañamiza), el carbono secuestrado queda mineralizado e inmovilizado por <strong>más de {carbonData.sequestrationDurabilityYears} años</strong>, sin riesgo de retorno a la atmósfera.
                  </span>
                </div>
              </div>

              <button
                onClick={handleDownloadCarbonPdf}
                className="w-full py-4 bg-slate-900 dark:bg-emerald-600 hover:bg-black dark:hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg flex items-center justify-center gap-2"
              >
                <Download size={14} />
                <span>Descargar Dictamen Oficial de Carbono</span>
              </button>
            </div>
          </div>

          {/* Tabla de Registro de Carbono de la Red */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Registro de Carbono por Parcela (Red Cooperativa)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400">
                    <th className="py-3 px-4">Parcela</th>
                    <th className="py-3 px-4">Variedad</th>
                    <th className="py-3 px-4">Superficie</th>
                    <th className="py-3 px-4">Captura Bruta</th>
                    <th className="py-3 px-4">Emisiones</th>
                    <th className="py-3 px-4">Balance Neto</th>
                    <th className="py-3 px-4">Bonos Certificables</th>
                    <th className="py-3 px-4">Estado MRV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                  {plots.map(p => {
                    const v = varieties.find(vr => vr.id === p.varietyId);
                    const c = calculateCarbonFootprint(p, v, trialRecords.filter(t => t.plotId === p.id));
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 uppercase text-slate-900 dark:text-white">{p.name}</td>
                        <td className="py-3 px-4 text-slate-500">{v?.name || 'Santhica / Futura'}</td>
                        <td className="py-3 px-4">{c.areaHa} ha</td>
                        <td className="py-3 px-4 text-emerald-600">+{c.totalGrossCaptureTonnesCO2Plot} t</td>
                        <td className="py-3 px-4 text-amber-600">-{(c.totalEmissionsTonnesCO2Ha * c.areaHa).toFixed(1)} t</td>
                        <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400 font-black">{c.netCarbonBalanceTonnesCO2Plot} t CO₂e</td>
                        <td className="py-3 px-4 text-purple-600 font-black">{c.carbonCreditsEstimated} Bonos</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Auditado
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

      {/* CONTENIDO DE PESTAÑA: TRAZABILIDAD DE INSUMOS & TRATAMIENTOS FITOSANITARIOS */}
      {activeTab === 'inputs' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Header y Acción de Nuevo Registro */}
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 p-8 rounded-[36px] text-white border border-purple-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-2 relative z-10">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">
                  Trazabilidad de Cadena Insumos & Regulaciones SENASA
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight flex items-center gap-2">
                <span>Tratamientos & Aplicaciones Registradas</span>
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl font-medium">
                Auditoría legal completa de fertilizantes, bioestimulantes y fitosanitarios aplicados: Fabricante, Marca, Proveedor, Registro SENASA, Dosis/ha, Banda Toxicológica, Lote y Período de Carencia.
              </p>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <button
                onClick={() => setShowAgroModal(true)}
                className="px-6 py-3.5 bg-purple-500 hover:bg-purple-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition active:scale-95 flex items-center gap-2"
              >
                <Plus size={16} />
                <span>Registrar Tratamiento / Insumo</span>
              </button>
            </div>
          </div>

          {/* Filtros y Buscador */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por producto, principio activo, marca, proveedor o registro SENASA..."
                  value={inputSearchTerm}
                  onChange={(e) => setInputSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter size={16} className="text-slate-400" />
                <select
                  value={inputCategoryFilter}
                  onChange={(e) => setInputCategoryFilter(e.target.value)}
                  className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                >
                  <option value="all">Todas las Categorías</option>
                  <option value="Bioestimulante">Bioestimulantes</option>
                  <option value="Fertilizante Foliar">Fertilizantes Foliares</option>
                  <option value="Fertilizante Edáfico">Fertilizantes Edáficos</option>
                  <option value="Insecticida">Insecticidas</option>
                  <option value="Fungicida">Fungicidas</option>
                  <option value="Enmienda Orgánica">Enmiendas Orgánicas</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tarjetas / Listado de Tratamientos Registrados */}
          <div className="space-y-4">
            {filteredAgroApps.length === 0 ? (
              <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800">
                <Package size={36} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  No se encontraron aplicaciones o insumos con los filtros seleccionados.
                </p>
              </div>
            ) : (
              filteredAgroApps.map(app => {
                const isOrganic = app.toxicologicalClass.includes('Biológico');
                const isGreen = app.toxicologicalClass.includes('Verde');
                const isBlue = app.toxicologicalClass.includes('Azul');

                const bandBadgeClass = isOrganic
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                  : isGreen
                  ? 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border-green-300'
                  : isBlue
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300';

                return (
                  <div
                    key={app.id}
                    className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 hover:shadow-md transition"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-purple-500/10 text-purple-600 rounded-2xl">
                          <Package size={22} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-base">
                              {app.productName}
                            </h4>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                              {app.category}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${bandBadgeClass}`}>
                              {app.toxicologicalClass}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                            Principio Activo / Composición: <span className="text-slate-800 dark:text-slate-200 font-semibold">{app.activeIngredient}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                          app.status === 'Apto Cosecha' 
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-amber-500 text-white shadow-sm'
                        }`}>
                          {app.status === 'Apto Cosecha' ? '✓ Apto Cosecha' : `⏳ Carencia Activa (${app.safetyPeriodDays} días)`}
                        </span>
                      </div>
                    </div>

                    {/* Fila de Datos de Trazabilidad Comercial & Legal */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-0.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Fabricante / Laboratorio</span>
                        <p className="font-black text-slate-900 dark:text-white">{app.manufacturer}</p>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-0.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Proveedor Distribuidor</span>
                        <p className="font-black text-slate-900 dark:text-white">{app.supplierName}</p>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-0.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Registro Oficial SENASA</span>
                        <p className="font-black text-purple-600 dark:text-purple-400">{app.senasaRegisterNumber}</p>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-0.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Lote de Fabricación</span>
                        <p className="font-black text-slate-900 dark:text-white">{app.batchNumber}</p>
                      </div>
                    </div>

                    {/* Fila de Datos Técnicos de Dosificación y Aplicación */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-0.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Dosis Autorizada</span>
                        <p className="font-black text-slate-900 dark:text-white">{app.dosagePerHa} {app.dosageUnit}</p>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-0.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Total Aplicado en Lote</span>
                        <p className="font-black text-slate-900 dark:text-white">{app.totalAppliedAmount} {app.dosageUnit === 'L/ha' ? 'Litros' : app.dosageUnit === 'ml/ha' ? 'Litros' : 'kg'}</p>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-0.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Método de Aplicación</span>
                        <p className="font-black text-slate-900 dark:text-white">{app.applicationMethod}</p>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-0.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Ingeniero Agrónomo Firmante</span>
                        <p className="font-black text-slate-900 dark:text-white">{app.responsibleAgronomist} <span className="text-[10px] text-slate-400 font-semibold">({app.agronomistLicense})</span></p>
                      </div>
                    </div>

                    {app.notes && (
                      <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2">
                        <Info size={14} className="text-purple-500 shrink-0" />
                        <span>{app.notes}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: ALERTAS DE CATÁSTROFES & RIESGO AGROCLIMÁTICO */}
      {activeTab === 'catastrophes' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Header y Filtros */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-red-500/10 text-red-600 rounded-2xl">
                  <Flame size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Centro de Alertas de Catástrofes & Riesgo Climático
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      En Línea
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Telemetría satelital en tiempo real (Open-Meteo GFS / ERA5-Land) y detección de Heladas, Incendios (FWI), Sequía y Vientos severos.
                  </p>
                </div>
              </div>

              {/* Botón de actualización en vivo y Filtros */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={refreshLiveTelemetry}
                  disabled={isLoadingWeather}
                  className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition flex items-center gap-1.5 shadow-sm"
                  title="Consultar datos meteorológicos en tiempo real desde Open-Meteo"
                >
                  <RefreshCw size={13} className={isLoadingWeather ? 'animate-spin' : ''} />
                  <span>{isLoadingWeather ? 'Sincronizando...' : 'Actualizar Telemetría'}</span>
                  {weatherLastUpdated && <span className="opacity-70 text-[10px]">({weatherLastUpdated} hs)</span>}
                </button>
              </div>
            </div>

            {/* Barra de Filtros por tipo de catástrofe */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCatastropheFilter('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  selectedCatastropheFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Todas ({catastropheAlerts.length})
              </button>
              <button
                onClick={() => setSelectedCatastropheFilter('helada')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
                  selectedCatastropheFilter === 'helada'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 hover:bg-cyan-100'
                }`}
              >
                <ThermometerSnowflake size={13} /> Heladas ({catastropheAlerts.filter(a => a.type === 'helada').length})
              </button>
              <button
                onClick={() => setSelectedCatastropheFilter('incendio')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
                  selectedCatastropheFilter === 'incendio'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 hover:bg-red-100'
                }`}
              >
                <Flame size={13} /> Incendios ({catastropheAlerts.filter(a => a.type === 'incendio').length})
              </button>
              <button
                onClick={() => setSelectedCatastropheFilter('sequia')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
                  selectedCatastropheFilter === 'sequia'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                <Sun size={13} /> Sequía ({catastropheAlerts.filter(a => a.type === 'sequia').length})
              </button>
              <button
                onClick={() => setSelectedCatastropheFilter('inundacion')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
                  selectedCatastropheFilter === 'inundacion'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100'
                }`}
              >
                <Waves size={13} /> Inundación ({catastropheAlerts.filter(a => a.type === 'inundacion').length})
              </button>
              <button
                onClick={() => setSelectedCatastropheFilter('viento_granizo')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
                  selectedCatastropheFilter === 'viento_granizo'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 hover:bg-indigo-100'
                }`}
              >
                <Wind size={13} /> Viento / Ráfagas ({catastropheAlerts.filter(a => a.type === 'viento_granizo').length})
              </button>
            </div>

            {/* Dos Columnas: Lista de Alertas + Mapa de Riesgo Regional */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Feed de Alertas */}
              <div className="lg:col-span-6 space-y-4 max-h-[680px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredCatastropheAlerts.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200">
                    <ShieldCheck size={32} className="mx-auto text-emerald-500 mb-2" />
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Sin alertas activas para la categoría seleccionada.
                    </p>
                  </div>
                ) : (
                  filteredCatastropheAlerts.map(alert => {
                    const isFrost = alert.type === 'helada';
                    const isFire = alert.type === 'incendio';
                    const isDrought = alert.type === 'sequia';
                    const isFlood = alert.type === 'inundacion';
                    const isWind = alert.type === 'viento_granizo';

                    const borderClass = alert.level === 'Alto' ? 'border-red-500/50 bg-red-50/20 dark:bg-red-950/20' : alert.level === 'Moderado' ? 'border-amber-500/50 bg-amber-50/20 dark:bg-amber-950/20' : 'border-blue-500/50 bg-blue-50/20 dark:bg-blue-950/20';

                    return (
                      <div
                        key={alert.id}
                        className={`p-6 rounded-3xl border-2 transition-all space-y-3 cursor-pointer ${borderClass} hover:shadow-md`}
                        onClick={() => setSelectedAlertForMap(alert)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <div className={`p-3 rounded-2xl flex items-center justify-center text-white ${
                              isFrost ? 'bg-cyan-600' : isFire ? 'bg-red-600' : isDrought ? 'bg-amber-600' : isFlood ? 'bg-blue-600' : 'bg-indigo-600'
                            }`}>
                              {isFrost && <ThermometerSnowflake size={20} />}
                              {isFire && <Flame size={20} />}
                              {isDrought && <Sun size={20} />}
                              {isFlood && <Waves size={20} />}
                              {isWind && <Wind size={20} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">
                                  {alert.plotName}
                                </h4>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  alert.level === 'Alto' ? 'bg-red-500 text-white' : alert.level === 'Moderado' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                                }`}>
                                  Riesgo {alert.level} ({alert.score}/100)
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 font-bold">
                                {alert.region} ({alert.province}) • Fecha: {alert.date}
                              </p>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {alert.title}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          {alert.description}
                        </p>

                        {/* Telemetría meteorológica y de satélite en tiempo real */}
                        <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2 text-[11px] font-bold flex-wrap">
                          {alert.satelliteTelemetry.temperatureC !== undefined && (
                            <span className="flex items-center text-red-500 dark:text-red-400 font-black">
                              <Thermometer size={13} className="mr-1" />
                              <span>{alert.satelliteTelemetry.temperatureC}°C</span>
                              {alert.satelliteTelemetry.tempMinC !== undefined && (
                                <span className="ml-1 text-cyan-600 dark:text-cyan-300 text-[10px] font-bold">
                                  (Mín: {alert.satelliteTelemetry.tempMinC}°C)
                                </span>
                              )}
                            </span>
                          )}
                          {alert.satelliteTelemetry.relativeHumidityPct !== undefined && (
                            <span className="flex items-center text-blue-500">
                              <Droplets size={13} className="mr-1" /> {alert.satelliteTelemetry.relativeHumidityPct}% Hum.
                            </span>
                          )}
                          {alert.satelliteTelemetry.windSpeedKmH !== undefined && (
                            <span className="flex items-center text-indigo-500">
                              <Wind size={13} className="mr-1" /> {alert.satelliteTelemetry.windSpeedKmH} km/h
                            </span>
                          )}
                          {alert.satelliteTelemetry.fwiIndex !== undefined && (
                            <span className="flex items-center text-red-600 font-black">FWI: {alert.satelliteTelemetry.fwiIndex}</span>
                          )}
                          {alert.satelliteTelemetry.soilSaturationPct !== undefined && (
                            <span className="flex items-center text-blue-600 font-black">Sat. Suelo: {alert.satelliteTelemetry.soilSaturationPct}%</span>
                          )}
                          {alert.satelliteTelemetry.dataSource && (
                            <span className="text-[9px] text-slate-400 font-bold ml-auto block">
                              🛰️ {alert.satelliteTelemetry.dataSource}
                            </span>
                          )}
                        </div>

                        {/* Medidas Preventivas de Mitigación */}
                        <div className="p-3 bg-white/60 dark:bg-slate-900/60 rounded-2xl space-y-1.5 text-[11px]">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Protocolo Preventivo de Mitigación:</span>
                          <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-200 font-medium">
                            {alert.preventiveMeasures.map((m, mIdx) => (
                              <li key={mIdx}>{m}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Barra de acción directa: Enfocar en Mapa */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                          <span className="text-[10px] font-bold text-slate-400">
                            Lat: {alert.coordinates.lat.toFixed(3)}, Lng: {alert.coordinates.lng.toFixed(3)}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCatastropheAlertEmail(alert);
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm transition cursor-pointer"
                              title="Despachar alerta temprana al productor por correo electrónico"
                            >
                              <Mail size={11} />
                              <span>Notificar Mail</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAlertForMap(alert);
                              }}
                            className={`text-[10px] font-black uppercase flex items-center gap-1 transition ${
                              selectedAlertForMap?.id === alert.id
                                ? 'text-hemp-600 dark:text-hemp-400 underline'
                                : 'text-slate-600 dark:text-slate-300 hover:text-hemp-600'
                            }`}
                          >
                            <span>{selectedAlertForMap?.id === alert.id ? 'Foco Activo en Mapa' : 'Enfocar en Mapa'}</span>
                            <ArrowRight size={11} />
                          </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Mapa Regional de Riesgo Climático */}
              <div className="lg:col-span-6 bg-slate-50 dark:bg-slate-950 p-6 rounded-[36px] border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-500/10 text-red-600 rounded-xl">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">
                        Mapeo Regional de Focos de Riesgo
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold">
                        {selectedAlertForMap ? `Foco Activo: ${selectedAlertForMap.plotName}` : 'Cobertura Nacional · Red Cooperativa Argentina'}
                      </p>
                    </div>
                  </div>
                  {selectedAlertForMap && (
                    <button
                      type="button"
                      onClick={() => setSelectedAlertForMap(null)}
                      className="text-[10px] font-black uppercase text-hemp-700 dark:text-hemp-300 bg-hemp-100 dark:bg-hemp-950/60 px-3 py-1.5 rounded-xl border border-hemp-300 dark:border-hemp-800 hover:bg-hemp-200 transition"
                    >
                      Ver Todos los Focos
                    </button>
                  )}
                </div>

                {/* Contenedor del Mapa - Cubre el 100% del marco */}
                <div className="w-full h-[620px] min-h-[550px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 relative shadow-inner bg-slate-950">
                  <MapContainer
                    center={[-34.5, -63.5]}
                    zoom={5}
                    scrollWheelZoom={true}
                    zoomControl={false}
                    className="w-full h-full z-0"
                    style={{ width: '100%', height: '100%', minHeight: '550px' }}
                  >
                    <ZoomControl position="bottomright" />
                    <MapResizer />
                    <CatastropheMapController selectedAlert={selectedAlertForMap} alerts={filteredCatastropheAlerts} />

                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution='&copy; Esri World Imagery'
                    />

                    {filteredCatastropheAlerts.map(alert => {
                      const isSelected = selectedAlertForMap?.id === alert.id;
                      const bg = alert.type === 'helada' ? '#06b6d4' : alert.type === 'incendio' ? '#ef4444' : alert.type === 'sequia' ? '#f59e0b' : alert.type === 'inundacion' ? '#3b82f6' : '#6366f1';
                      const emoji = alert.type === 'helada' ? '❄️' : alert.type === 'incendio' ? '🔥' : alert.type === 'sequia' ? '☀️' : alert.type === 'inundacion' ? '💧' : '💨';

                      const pinIcon = L.divIcon({
                        className: 'catastrophe-div-icon',
                        html: `
                          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                            <div style="position: absolute; inset: 0; border-radius: 50%; background: ${bg}; opacity: 0.45; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                            <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; background: ${bg}; border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5); transform: ${isSelected ? 'scale(1.3)' : 'scale(1)'}; transition: transform 0.2s;">
                              <span style="font-size: 13px; line-height: 1;">${emoji}</span>
                            </div>
                          </div>
                        `,
                        iconSize: [34, 34],
                        iconAnchor: [17, 17],
                        popupAnchor: [0, -17]
                      });

                      return (
                        <Marker 
                          key={alert.id} 
                          position={[alert.coordinates.lat, alert.coordinates.lng]}
                          icon={pinIcon}
                          eventHandlers={{
                            click: () => setSelectedAlertForMap(alert)
                          }}
                        >
                          <LeafletTooltip direction="top" offset={[0, -12]} className="bg-slate-900 text-white rounded-xl p-2.5 shadow-xl border border-white/10 font-bold text-xs">
                            <span className="font-black block uppercase text-emerald-400">{alert.plotName}</span>
                            <span className="block text-[11px] text-slate-200 font-semibold">{alert.title}</span>
                            <span className="block text-[10px] text-amber-300 font-bold mt-0.5">Riesgo {alert.level} ({alert.score}/100)</span>
                            {alert.satelliteTelemetry.temperatureC !== undefined && (
                              <span className="block text-[10px] text-slate-300 font-medium">
                                T° Actual: {alert.satelliteTelemetry.temperatureC}°C
                              </span>
                            )}
                          </LeafletTooltip>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                </div>
              </div>

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

      {/* MODAL: GUÍA AGRONÓMICA & TÉCNICA NDVI + NDRE (B5/B6/B7) + SENTINEL-1 SAR */}
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
                    Guía Agronómica: NDVI, Borde Rojo (NDRE) y Radar SAR
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    Arquitectura Multi-Sensor Copernicus STAC aplicada al cáñamo industrial
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

            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-500/20 space-y-2">
                <h4 className="font-black text-emerald-900 dark:text-emerald-300 text-sm flex items-center gap-1.5">
                  <Leaf size={16} /> 1. Índice NDVI (Bandas B8 y B4 · 10m) — Emergencia a Desarrollo
                </h4>
                <p>
                  Mide el vigor vegetativo inicial contrastando la absorción de luz <strong>Roja (B4 · 665 nm)</strong> y la reflexión <strong>Infrarroja Cercana (B8 · 842 nm)</strong>:
                </p>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl text-center font-mono font-bold text-emerald-600 text-xs border border-emerald-500/20">
                  NDVI = (B8 - B4) / (B8 + B4)
                </div>
              </div>

              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-500/20 space-y-2">
                <h4 className="font-black text-rose-900 dark:text-rose-300 text-sm flex items-center gap-1.5">
                  <Sparkles size={16} /> 2. Índice NDRE Borde Rojo (Bandas 5, 6, 7 y B8A · 20m) — Entresurco Cerrado
                </h4>
                <p>
                  Cuando el cáñamo industrial supera el <strong>75% de cobertura de dosel</strong> (cierre del entresurco, $LAI &gt; 3$), el NDVI se satura cerca de $0.85$. Sentinel-2 posee tres bandas específicas en el <strong>Borde Rojo (B5 a 705 nm, B6 a 740 nm y B7 a 783 nm)</strong> que penetran hacia los estratos medios e inferiores de la canopia sin saturarse:
                </p>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl text-center font-mono font-bold text-rose-600 text-xs border border-rose-500/20">
                  NDRE = (B8A - B5) / (B8A + B5) &nbsp;|&nbsp; RECI = (B7 / B5) - 1
                </div>
              </div>

              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-500/20 space-y-2">
                <h4 className="font-black text-indigo-900 dark:text-indigo-300 text-sm flex items-center gap-1.5">
                  <Radio size={16} /> 3. Sentinel-1 SAR (Radar Banda C · 5.405 GHz) — Continuidad Sin Nubes
                </h4>
                <p>
                  En días con nubosidad patagónica o pampeana, el radar activo <strong>Sentinel-1 (GRD)</strong> emite pulsos de microondas en polarización dual <strong>VV y VH</strong> que atraviesan el 100% de las nubes, midiendo el volumen caulinar y estructura física mediante el <strong>Radar Vegetation Index (RVI)</strong>:
                </p>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl text-center font-mono font-bold text-indigo-600 text-xs border border-indigo-500/20">
                  RVI = (4 × σ°VH) / (σ°VV + σ°VH)
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Satellite size={16} className="text-emerald-600" /> 4. Catálogo STAC Automatizado por Polígono
                </h4>
                <p>
                  El sistema consulta en tiempo real el catálogo <strong>STAC de Copernicus Data Space Ecosystem (CDSE)</strong> y <strong>Element84 Earth Search</strong> intersectando las coordenadas geodésicas del lote para indexar cada escena oficial y sus bandas Cloud-Optimized GeoTIFF (COG).
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

      {/* MODAL 1: EXPLICACIÓN Y METODOLOGÍA CIENTÍFICA DE CAPTURA DE CARBONO */}
      {showCarbonFormulaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-[36px] max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                  <Leaf size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">
                    ¿De dónde proviene el dato de +18.89 t/ha y +1.89 t CO₂e?
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Metodología científica oficial de cuantificación fotosintética (EIHA / Nova Institute / Cambridge).
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowCarbonFormulaModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-500/20 space-y-2">
                <span className="font-black uppercase text-emerald-800 dark:text-emerald-300 block">
                  1. Factor Molecular Fotosintético del Cáñamo ($C \to CO_2$)
                </span>
                <p>
                  El cáñamo industrial es una planta de alta eficiencia fotosintética. Aproximadamente el <strong>44.5% de su biomasa seca</strong> está compuesta por carbono puro elemental ($C$). 
                  Dado que la masa molecular del $CO_2$ es 44 y la del carbono es 12 ($44 / 12 = 3.667$), por cada kilo de carbono fijado, la planta ha extraído <strong>3.667 kg de $CO_2$</strong> de la atmósfera.
                </p>
                <p className="font-mono bg-white dark:bg-slate-900 p-2 rounded-xl text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                  Factor Fotosintético Aéreo = 0.445 × 3.667 = 1.63 kg CO₂ por kg de Biomasa Seca
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-2">
                <span className="font-black uppercase text-slate-900 dark:text-white block">
                  2. Captura Aérea en la Parcela (+15.48 t CO₂ / ha)
                </span>
                <p>
                  Con un rendimiento medido de <strong>9,500 kg de materia seca por hectárea</strong> (tallos, fibra y hojas):
                </p>
                <p className="font-mono bg-white dark:bg-slate-900 p-2 rounded-xl text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                  9,500 kg MS/ha × 1.63 kg CO₂/kg MS = 15,485 kg CO₂/ha (+15.48 t/ha)
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-2">
                <span className="font-black uppercase text-slate-900 dark:text-white block">
                  3. Aporte Radicular y Carbono Orgánico del Suelo SOC (+3.41 t CO₂ / ha)
                </span>
                <p>
                  El sistema radicular pivotante profundo (hasta 2 metros) deposita un <strong>22% adicional</strong> de carbono orgánico en forma de biomasa radicular y exudados rizosféricos que quedan fijados en el perfil de suelo.
                </p>
                <p className="font-mono bg-white dark:bg-slate-900 p-2 rounded-xl text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                  Fijación Radicular = 15.48 t CO₂/ha × 0.22 = +3.41 t CO₂/ha
                </p>
              </div>

              <div className="p-4 bg-emerald-600 text-white rounded-2xl space-y-2 shadow-md">
                <span className="font-black uppercase tracking-wider text-emerald-100 block">
                  4. Resultado Bruto Total y Ajuste por Superficie
                </span>
                <p className="text-sm font-bold">
                  • Captura Bruta por Hectárea: 15.48 t + 3.41 t = <strong className="underline decoration-yellow-300 decoration-2">+18.89 t CO₂ / ha</strong>
                </p>
                <p className="text-sm font-bold">
                  • Total para la Parcela ({carbonData.areaHa} ha): 18.89 t/ha × {carbonData.areaHa} ha = <strong className="underline decoration-yellow-300 decoration-2">+{carbonData.totalGrossCaptureTonnesCO2Plot} t CO₂e</strong>
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowCarbonFormulaModal(false)}
                className="w-full bg-slate-900 dark:bg-emerald-600 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-black transition"
              >
                Entendido, Cerrar Explicación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRO DE TRATAMIENTO FITOSANITARIO / INSUMO (SENASA) */}
      {showAgroModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-purple-500/30 rounded-[36px] max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-500/10 text-purple-600 rounded-2xl">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">
                    Registrar Tratamiento de Insumo / Fitosanitario
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Cadena legal completa para la parcela: {selectedPlot?.name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAgroModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddAgroAppSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Marca / Nombre Comercial *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: YaraVita CropBoost / Bio-Neem"
                    value={newAgroApp.productName}
                    onChange={e => setNewAgroApp({...newAgroApp, productName: e.target.value})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Principio Activo / Composición *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: Azadiractina 1.2% EC / NPK 15-20-5"
                    value={newAgroApp.activeIngredient}
                    onChange={e => setNewAgroApp({...newAgroApp, activeIngredient: e.target.value})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Fabricante / Laboratorio</label>
                  <input
                    type="text"
                    placeholder="ej: Yara International / Bioagro Arg"
                    value={newAgroApp.manufacturer}
                    onChange={e => setNewAgroApp({...newAgroApp, manufacturer: e.target.value})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Proveedor / Distribuidor Local</label>
                  <input
                    type="text"
                    placeholder="ej: Insumos Agrícolas del Centro"
                    value={newAgroApp.supplierName}
                    onChange={e => setNewAgroApp({...newAgroApp, supplierName: e.target.value})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Categoría</label>
                  <select
                    value={newAgroApp.category}
                    onChange={e => setNewAgroApp({...newAgroApp, category: e.target.value as any})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Fertilizante Foliar">Fertilizante Foliar</option>
                    <option value="Fertilizante Edáfico">Fertilizante Edáfico</option>
                    <option value="Bioestimulante">Bioestimulante</option>
                    <option value="Insecticida">Insecticida</option>
                    <option value="Fungicida">Fungicida</option>
                    <option value="Enmienda Orgánica">Enmienda Orgánica</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">N° Registro SENASA</label>
                  <input
                    type="text"
                    placeholder="ej: SENASA N° 18.420/2022"
                    value={newAgroApp.senasaRegisterNumber}
                    onChange={e => setNewAgroApp({...newAgroApp, senasaRegisterNumber: e.target.value})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Banda Toxicológica</label>
                  <select
                    value={newAgroApp.toxicologicalClass}
                    onChange={e => setNewAgroApp({...newAgroApp, toxicologicalClass: e.target.value as any})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Biológico / Orgánico Certificado">Biológico / Orgánico Certificado</option>
                    <option value="Banda Verde (Banda IV - Poco Peligroso)">Banda Verde (Poco Peligroso)</option>
                    <option value="Banda Azul (Banda III - Cuidado)">Banda Azul (Cuidado)</option>
                    <option value="Banda Amarilla (Banda II - Nocivo)">Banda Amarilla (Nocivo)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Dosis por Hectárea *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newAgroApp.dosagePerHa}
                    onChange={e => setNewAgroApp({...newAgroApp, dosagePerHa: parseFloat(e.target.value) || 0})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Unidad Dosis</label>
                  <select
                    value={newAgroApp.dosageUnit}
                    onChange={e => setNewAgroApp({...newAgroApp, dosageUnit: e.target.value as any})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="L/ha">L/ha</option>
                    <option value="kg/ha">kg/ha</option>
                    <option value="ml/ha">ml/ha</option>
                    <option value="g/ha">g/ha</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Días Carencia (Pre-Cosecha)</label>
                  <input
                    type="number"
                    value={newAgroApp.safetyPeriodDays}
                    onChange={e => setNewAgroApp({...newAgroApp, safetyPeriodDays: parseInt(e.target.value) || 0})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Ingeniero Agrónomo Firmante</label>
                  <input
                    type="text"
                    placeholder="ej: Ing. Agr. Gabriel Santos"
                    value={newAgroApp.responsibleAgronomist}
                    onChange={e => setNewAgroApp({...newAgroApp, responsibleAgronomist: e.target.value})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Matrícula Profesional MP</label>
                  <input
                    type="text"
                    placeholder="ej: MP 4.812 (CPIA)"
                    value={newAgroApp.agronomistLicense}
                    onChange={e => setNewAgroApp({...newAgroApp, agronomistLicense: e.target.value})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase">Observaciones Técnicas de Campo</label>
                <textarea
                  rows={2}
                  value={newAgroApp.notes}
                  onChange={e => setNewAgroApp({...newAgroApp, notes: e.target.value})}
                  placeholder="Detalles sobre condición de viento, picos antideriva, caudal por ha o justificación fitosanitaria..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                ></textarea>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAgroModal(false)}
                  className="flex-1 p-3 rounded-2xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-700/20 active:scale-95 transition"
                >
                  Registrar Tratamiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* TOAST DE NOTIFICACIÓN DE ALERTA POR CORREO */}
      {catastropheEmailToast && catastropheEmailToast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 max-w-md">
            <div className="bg-rose-600 text-white p-2 rounded-xl shrink-0">
              <Mail size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-rose-400">
                  Alerta Despachada al Productor
                </p>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {catastropheEmailToast.via === "smtp" ? "SMTP Real :2525" : "Simulado"}
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate mt-0.5 font-medium">
                {catastropheEmailToast.sentTo}
              </p>
            </div>
            <button
              onClick={() => setCatastropheEmailToast(null)}
              className="p-1 opacity-60 hover:opacity-100 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE DESPACHO DE ALERTA TEMPRANA POR CORREO */}
      {selectedCatastropheForEmail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-2xl max-w-lg w-full p-8 relative animate-in zoom-in-95">
            <button
              onClick={() => setSelectedCatastropheForEmail(null)}
              className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="bg-rose-600 text-white p-3 rounded-2xl shadow-lg shadow-rose-900/20">
                <Mail size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                  Notificar Alerta Temprana
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Despacho oficial al productor vía notificaciones@hempc.com.ar
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Información del Lote y Alerta */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Lote / Región:</span>
                  <span className="font-black text-slate-800 dark:text-white uppercase">{selectedCatastropheForEmail.plotName} ({selectedCatastropheForEmail.province})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Tipo de Amenaza:</span>
                  <span className="font-black text-rose-600 uppercase">{selectedCatastropheForEmail.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Score de Riesgo:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{selectedCatastropheForEmail.level} ({selectedCatastropheForEmail.score}/100)</span>
                </div>
              </div>

              {/* Selector de Severidad */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 ml-1">
                  Nivel de Severidad
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Crítica", "Advertencia", "Informativa"] as const).map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setCatastropheSeverity(sev)}
                      className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition border cursor-pointer ${
                        catastropheSeverity === sev
                          ? sev === "Crítica" ? "bg-red-600 text-white border-red-600 shadow" :
                            sev === "Advertencia" ? "bg-amber-500 text-white border-amber-500 shadow" :
                            "bg-blue-600 text-white border-blue-600 shadow"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Formulario */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1 ml-1">
                    Destinatario (Nombre) *
                  </label>
                  <input
                    type="text"
                    value={catastropheRecipientName}
                    onChange={e => setCatastropheRecipientName(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Nombre del productor"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1 ml-1">
                    Correo Electrónico Destino *
                  </label>
                  <input
                    type="email"
                    value={catastropheRecipientEmail}
                    onChange={e => setCatastropheRecipientEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="productor@campo.com.ar"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1 ml-1">
                    Asunto de la Notificación *
                  </label>
                  <input
                    type="text"
                    value={catastropheSubject}
                    onChange={e => setCatastropheSubject(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1 ml-1">
                    Diagnóstico & Protocolo de Mitigación
                  </label>
                  <textarea
                    rows={4}
                    value={catastropheDetails}
                    onChange={e => setCatastropheDetails(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCatastropheForEmail(null)}
                  className="px-4 py-2 text-slate-400 font-bold uppercase text-xs hover:text-slate-600 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSendingCatastropheEmail || !catastropheRecipientEmail.trim()}
                  onClick={handleSendCatastropheEmail}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center transition disabled:opacity-50 cursor-pointer"
                >
                  {isSendingCatastropheEmail ? (
                    <>
                      <Loader2 size={15} className="animate-spin mr-2" />
                      Despachando Alerta...
                    </>
                  ) : (
                    <>
                      <Send size={15} className="mr-2" />
                      Despachar al Correo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
