import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  ArrowLeft, Calendar, Sprout, Plus, Trash2, MapPin,
  TrendingUp, Scale, Thermometer, Droplets,
  Layers, Activity, Sun, Clock,
  Target, FlaskConical, Eye, Edit2, X, Loader2, Save, Printer,
  AlertCircle, CloudRain, ShieldAlert, Sparkles, Compass, Maximize2,
  Moon, Zap, ChevronUp, ChevronDown, Wifi, Radio, Sliders, Mail, Send, CheckCircle2, AlertTriangle, QrCode, FileText, Award, Wind, Gauge,
  Camera, Upload, Image as ImageIcon
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ComposedChart, Line, Bar, Legend, ReferenceLine
} from 'recharts';
import MapEditor from '../components/MapEditor';
import HydricBalance from '../components/HydricBalance';
import { PlotIdentificationModal } from '../components/PlotIdentificationModal';
import SeedingProtocolModal from '../components/SeedingProtocolModal';
import { LiveTelemetryPanel } from '../components/LiveTelemetryPanel';
import { TrialRecord, AgrochemicalApplication, AgrochemicalCategory, HempStageId, FieldLog } from '../types';
import { sendAgronomicAlertEmail } from '../src/services/emailNotificationService';

// ============================================================================
// MOTOR ASTRONÓMICO Y FOTOPERIÓDICO DETERMINÍSTICO (NOAA SOLAR CALCULATOR)
// Garantiza sincronización exacta con la hora local de la locación (UTC-3 Argentina)
// y con la evolución biológica del ciclo desde la fecha de siembra.
// ============================================================================
interface SolarCalculationResult {
  sunriseLocal: string;       // HH:MM en hora local de la locación
  sunsetLocal: string;        // HH:MM en hora local de la locación
  solarNoonLocal: string;     // HH:MM mediodía solar local
  daylightHours: number;      // Horas decimales de luz (ej. 13.35)
  nightHours: number;         // Horas decimales de oscuridad / escotoperiodo
  daylightFormatted: string;  // Ej: "13h 21m"
  nightFormatted: string;     // Ej: "10h 39m"
  sunriseMinutes: number;
  sunsetMinutes: number;
}

function formatMinutesToHHMM(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hh = Math.floor(normalized / 60);
  const mm = normalized % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function formatDecimalHoursToHM(decimalHours: number): string {
  const clamped = Math.max(0, Math.min(24, decimalHours));
  const h = Math.floor(clamped);
  const m = Math.round((clamped - h) * 60);
  if (m === 60) return `${h + 1}h 00m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function computeLocalSolarData(
  lat: number,
  lng: number,
  dateInput: Date | string,
  utcOffsetHours = -3
): SolarCalculationResult {
  const d = typeof dateInput === 'string' ? new Date(`${dateInput.split('T')[0]}T12:00:00Z`) : dateInput;
  const startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
  const dayOfYear = Math.max(1, Math.min(366, Math.floor((d.getTime() - startOfYear.getTime()) / 86400000)));

  // Ángulo fraccional del año (radianes)
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1 + 0.5);

  // Ecuación del tiempo (minutos)
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Declinación solar (radianes)
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const latRad = (lat * Math.PI) / 180;
  const zenithRad = (90.833 * Math.PI) / 180; // Refracción atmosférica estándar

  const cosHourAngle =
    (Math.cos(zenithRad) / (Math.cos(latRad) * Math.cos(decl))) -
    Math.tan(latRad) * Math.tan(decl);

  const clampedCos = Math.max(-0.999, Math.min(0.999, cosHourAngle));
  const hourAngleDeg = (Math.acos(clampedCos) * 180) / Math.PI;

  // Mediodía solar en minutos locales (ajustado por longitud real de la locación y huso horario local)
  const solarNoonMin = 720 - 4 * lng - eqTime + utcOffsetHours * 60;
  const sunriseMin = solarNoonMin - hourAngleDeg * 4;
  const sunsetMin = solarNoonMin + hourAngleDeg * 4;

  const daylightHours = Number(((2 * hourAngleDeg) / 15).toFixed(2));
  const nightHours = Number((24 - daylightHours).toFixed(2));

  return {
    sunriseLocal: formatMinutesToHHMM(sunriseMin),
    sunsetLocal: formatMinutesToHHMM(sunsetMin),
    solarNoonLocal: formatMinutesToHHMM(solarNoonMin),
    daylightHours,
    nightHours,
    daylightFormatted: formatDecimalHoursToHM(daylightHours),
    nightFormatted: formatDecimalHoursToHM(nightHours),
    sunriseMinutes: Math.round(sunriseMin),
    sunsetMinutes: Math.round(sunsetMin)
  };
}

// Convierte cualquier cadena ISO de amanecer/ocaso (sea local de Open-Meteo o UTC) a HH:MM local de la locación
function extractLocalHHMMFromApi(isoStr: string | undefined, timeZone: string, fallbackHHMM: string): string {
  if (!isoStr || typeof isoStr !== 'string') return fallbackHHMM;
  // Si viene con Z o +00:00 (UTC crudo, como sunrise-sunset.org), convertir explícitamente al huso de la locación
  if (isoStr.endsWith('Z') || isoStr.includes('+00:00') || isoStr.includes('-00:00')) {
    try {
      const dt = new Date(isoStr);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleTimeString('es-AR', {
          timeZone: timeZone || 'America/Argentina/Buenos_Aires',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }
    } catch {
      return fallbackHHMM;
    }
  }
  // Si viene de Open-Meteo con timezone=auto (formato "YYYY-MM-DDTHH:MM" ya en hora local)
  if (isoStr.includes('T')) {
    const timePart = isoStr.split('T')[1];
    if (timePart && timePart.length >= 5) {
      return timePart.substring(0, 5);
    }
  }
  return fallbackHHMM;
}

const getLunarPhase = (date: Date) => {
  const lp = 2551443;
  const now = date.getTime() / 1000;
  const new_moon = 592500;
  const phase = ((now - new_moon) % lp) / lp;
  if (phase < 0.06 || phase > 0.94) return { name: 'Luna Nueva', icon: '🌑', desc: 'Reposo radicular y poda selectiva' };
  if (phase < 0.25) return { name: 'Cuarto Creciente', icon: '🌒', desc: 'Estímulo de elongación vegetativa' };
  if (phase < 0.44) return { name: 'Gibosa Creciente', icon: '🌔', desc: 'Máxima absorción foliar y vigor' };
  if (phase < 0.56) return { name: 'Luna Llena', icon: '🌕', desc: 'Concentración de savia en corona floral' };
  if (phase < 0.75) return { name: 'Gibosa Menguante', icon: '🌖', desc: 'Translocación hacia raíz y tallo' };
  return { name: 'Cuarto Menguante', icon: '🌘', desc: 'Óptimo para labores de suelo y secado' };
};

// Compresión de imágenes en cliente para Bitácora Multimedia (Escritorio + Cámara Móvil)
async function compressImageFileToDataUrl(file: File, maxDimension = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen inválido.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function PlotDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    plots, locations, varieties, projects, getPlotHistory,
    addTrialRecord, updateTrialRecord, deleteTrialRecord,
    currentUser, hydricRecords, logs, addLog, updateLog, deleteLog, seedBatches, clients,
    updatePlotPhenology, closePlotCycle, reopenPlotCycle
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'analytics' | 'map' | 'astro' | 'logs' | 'water' | 'phytosanitary' | 'iot'>('analytics');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isProtocolModalOpen, setIsProtocolModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingConditions, setIsFetchingConditions] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Estado Bitácora Multimedia (Escritorio + Cámara Celular + Edición CRUD)
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [newLogNote, setNewLogNote] = useState('');
  const [newLogPhoto, setNewLogPhoto] = useState('');
  const [newLogDate, setNewLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newLogTime, setNewLogTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputDesktopRef = useRef<HTMLInputElement | null>(null);
  const fileInputMobileCameraRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Reloj en vivo sincronizado con el huso horario de la locación
  const [nowTick, setNowTick] = useState<Date>(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNowTick(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Estado para Despacho de Alertas por Correo Electrónico
  const [showEmailAlertModal, setShowEmailAlertModal] = useState(false);
  const [isSendingAlertEmail, setIsSendingAlertEmail] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState<'Crítica' | 'Advertencia' | 'Informativa'>('Advertencia');
  const [alertRecipientEmail, setAlertRecipientEmail] = useState('');
  const [alertRecipientName, setAlertRecipientName] = useState('');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDetails, setAlertDetails] = useState('');
  const [emailAlertToast, setEmailAlertToast] = useState<{ message: string; via: string; sentTo: string } | null>(null);

  // Estado para Cuaderno Fitosanitario SENASA (unificado con ht_agrochemical_apps y sin datos demo)
  const [agroApps, setAgroApps] = useState<AgrochemicalApplication[]>(() => {
    try {
      const saved = localStorage.getItem('ht_agrochemical_apps') || localStorage.getItem('nucleus_agro_apps_v1');
      if (saved) {
        const parsed: AgrochemicalApplication[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            a => !a.id?.startsWith('app-bio-') && !a.id?.startsWith('app-foliar-') && !a.id?.startsWith('app-insect-')
          );
        }
      }
    } catch {}
    return [];
  });
  const [isAgroModalOpen, setIsAgroModalOpen] = useState(false);
  const [editingAgroId, setEditingAgroId] = useState<string | null>(null);
  const [agroForm, setAgroForm] = useState({
    date: new Date().toISOString().split('T')[0],
    productName: '',
    activeIngredient: '',
    senasaRegisterNumber: '',
    category: 'Bioestimulante' as AgrochemicalCategory,
    batchNumber: '',
    dosagePerHa: 2.5,
    dosageUnit: 'L/ha' as AgrochemicalApplication['dosageUnit'],
    totalAppliedAmount: 5,
    safetyPeriodDays: 0,
    applicationMethod: 'Pulverización Terrestre' as AgrochemicalApplication['applicationMethod'],
    targetPestOrPurpose: '',
    responsibleAgronomist: currentUser?.name || 'Ing. Agr. Gastón Barea',
    agronomistLicense: 'MP-4821-CIAFBA',
    weatherConditionsAtApp: '21°C | Hum: 48% | Viento: 9 km/h',
    notes: ''
  });

  useEffect(() => {
    try {
      localStorage.setItem('ht_agrochemical_apps', JSON.stringify(agroApps));
      localStorage.removeItem('nucleus_agro_apps_v1');
    } catch {}
  }, [agroApps]);

  const plotAgroApps = useMemo(() => agroApps.filter(a => a.plotId === id), [agroApps, id]);

  // Estado para Telemetría IoT
  const [iotAlertsConfig, setIotAlertsConfig] = useState({
    maxTemp: 32,
    minSoilMoisture: 35,
    maxEc: 2.5,
    autoIrrigation: true
  });

  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [satelliteRainMm, setSatelliteRainMm] = useState<number>(0);

  const plot = plots.find(p => p.id === id);
  const location = locations.find(l => l.id === plot?.locationId);
  const variety = varieties.find(v => v.id === plot?.varietyId);
  const project = projects.find(proj => proj.id === plot?.projectId);
  const seedBatch = useMemo(() => {
    if (!plot) return undefined;
    return (
      seedBatches.find(b => b.id === plot.seedBatchId) ||
      seedBatches.find(b => b.varietyId === plot.varietyId && (!b.materialType || b.materialType === 'seed')) ||
      seedBatches.find(b => !b.materialType || b.materialType === 'seed') ||
      seedBatches[0]
    );
  }, [seedBatches, plot]);

  const obtainedBatchesFromPlot = useMemo(
    () => seedBatches.filter(b => b.originPlotId === plot?.id && b.materialType && b.materialType !== 'seed'),
    [seedBatches, plot]
  );

  // Coordenadas geodésicas activas de la parcela (prioriza centroide del polígono de la parcela, luego locación)
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

  // Huso horario oficial de la locación (ej. America/Argentina/Catamarca o America/Argentina/Buenos_Aires)
  const locationTimezone = useMemo(() => {
    if (weatherData?.timezone) return weatherData.timezone;
    return 'America/Argentina/Buenos_Aires';
  }, [weatherData?.timezone]);

  const utcOffsetHours = useMemo(() => {
    if (typeof weatherData?.utc_offset_seconds === 'number') {
      return weatherData.utc_offset_seconds / 3600;
    }
    return -3; // Huso oficial de Argentina (ART UTC-3)
  }, [weatherData?.utc_offset_seconds]);

  // Hora y fecha local en la locación en tiempo real
  const localClockData = useMemo(() => {
    try {
      const timeStr = nowTick.toLocaleTimeString('es-AR', {
        timeZone: locationTimezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const shortTimeStr = nowTick.toLocaleTimeString('es-AR', {
        timeZone: locationTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const dateParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: locationTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(nowTick);
      const [hh, mm] = shortTimeStr.split(':').map(Number);
      const currentMinutes = (hh || 0) * 60 + (mm || 0);
      return {
        timeStr,
        shortTimeStr,
        dateIso: dateParts,
        currentMinutes
      };
    } catch {
      const iso = nowTick.toISOString().split('T')[0];
      return {
        timeStr: nowTick.toTimeString().slice(0, 8),
        shortTimeStr: nowTick.toTimeString().slice(0, 5),
        dateIso: iso,
        currentMinutes: nowTick.getHours() * 60 + nowTick.getMinutes()
      };
    }
  }, [nowTick, locationTimezone]);

  // Cálculo astronómico solar exacto en hora local de la parcela para el día actual
  const solarToday = useMemo(() => {
    const calc = computeLocalSolarData(activeCoords.lat, activeCoords.lng, localClockData.dateIso, utcOffsetHours);
    const apiSunriseRaw = weatherData?.daily?.sunrise?.[0];
    const apiSunsetRaw = weatherData?.daily?.sunset?.[0];
    const apiDaylightSec = weatherData?.daily?.daylight_duration?.[0];

    const sunriseLocal = extractLocalHHMMFromApi(apiSunriseRaw, locationTimezone, calc.sunriseLocal);
    const sunsetLocal = extractLocalHHMMFromApi(apiSunsetRaw, locationTimezone, calc.sunsetLocal);

    const [srH, srM] = sunriseLocal.split(':').map(Number);
    const [ssH, ssM] = sunsetLocal.split(':').map(Number);
    const srMin = !isNaN(srH) && !isNaN(srM) ? srH * 60 + srM : calc.sunriseMinutes;
    const ssMin = !isNaN(ssH) && !isNaN(ssM) ? ssH * 60 + ssM : calc.sunsetMinutes;

    const daylightHours =
      typeof apiDaylightSec === 'number' && apiDaylightSec > 0
        ? Number((apiDaylightSec / 3600).toFixed(2))
        : ssMin > srMin
        ? Number(((ssMin - srMin) / 60).toFixed(2))
        : calc.daylightHours;

    const nightHours = Number(Math.max(0, 24 - daylightHours).toFixed(2));
    const noonMin = Math.round((srMin + ssMin) / 2);

    const isDaytime = localClockData.currentMinutes >= srMin && localClockData.currentMinutes <= ssMin;
    const solarProgressPct = isDaytime
      ? Math.min(100, Math.max(0, Math.round(((localClockData.currentMinutes - srMin) / Math.max(1, ssMin - srMin)) * 100)))
      : localClockData.currentMinutes > ssMin
      ? 100
      : 0;

    return {
      sunriseLocal,
      sunsetLocal,
      solarNoonLocal: formatMinutesToHHMM(noonMin),
      daylightHours,
      nightHours,
      daylightFormatted: formatDecimalHoursToHM(daylightHours),
      nightFormatted: formatDecimalHoursToHM(nightHours),
      sunriseMinutes: srMin,
      sunsetMinutes: ssMin,
      isDaytime,
      solarProgressPct
    };
  }, [activeCoords.lat, activeCoords.lng, localClockData.dateIso, localClockData.currentMinutes, utcOffsetHours, weatherData, locationTimezone]);

  // Historial ordenado
  const rawHistory = useMemo(() => (id ? getPlotHistory(id) : []), [id, getPlotHistory]);

  const history = useMemo(() => {
    return [...rawHistory].sort((a, b) => {
      const dateA = new Date(a.date + (a.time ? 'T' + a.time : 'T10:00')).getTime();
      const dateB = new Date(b.date + (b.time ? 'T' + b.time : 'T10:00')).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [rawHistory, sortOrder]);

  const chronologicalHistory = useMemo(() => {
    return [...rawHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [rawHistory]);

  const plotLogs = useMemo(() => logs.filter(l => l.plotId === id), [logs, id]);
  const latestRecord = chronologicalHistory[chronologicalHistory.length - 1];

  // Sincronización del Ciclo Fenológico y Fotoperiódico desde la Fecha de Siembra
  const cycleSync = useMemo(() => {
    const cycleLimit = variety?.cycleDays || 150;
    const sowStr = plot?.sowingDate || '2026-01-13';
    const sowDate = new Date(`${sowStr}T09:00:00`);
    const harvestDateFromRecord =
      latestRecord?.harvestDate ||
      obtainedBatchesFromPlot[0]?.harvestDate ||
      null;

    const rawElapsedDays = Math.max(1, Math.floor((nowTick.getTime() - sowDate.getTime()) / 86400000));
    const isCycleCompleted = plot?.status === 'Cosechada' || Boolean(harvestDateFromRecord) || rawElapsedDays >= cycleLimit;
    const activeCycleDays = Math.min(cycleLimit, rawElapsedDays);
    const biologicalProgress = Math.min(100, Math.max(0, Math.round((activeCycleDays / cycleLimit) * 100)));

    const estimatedEndDateObj = new Date(sowDate.getTime() + cycleLimit * 86400000);
    const estimatedEndIso = harvestDateFromRecord || estimatedEndDateObj.toISOString().split('T')[0];

    // Fotoperiodo en hitos clave del ciclo (calculado en la latitud exacta de la parcela)
    const sowSolar = computeLocalSolarData(activeCoords.lat, activeCoords.lng, sowStr, utcOffsetHours);
    const vegMidDate = new Date(sowDate.getTime() + Math.round(cycleLimit * 0.25) * 86400000).toISOString().split('T')[0];
    const flowDate = latestRecord?.floweringDate || new Date(sowDate.getTime() + Math.round(cycleLimit * 0.5) * 86400000).toISOString().split('T')[0];
    const matDate = new Date(sowDate.getTime() + Math.round(cycleLimit * 0.78) * 86400000).toISOString().split('T')[0];

    const vegSolar = computeLocalSolarData(activeCoords.lat, activeCoords.lng, vegMidDate, utcOffsetHours);
    const flowSolar = computeLocalSolarData(activeCoords.lat, activeCoords.lng, flowDate, utcOffsetHours);
    const matSolar = computeLocalSolarData(activeCoords.lat, activeCoords.lng, matDate, utcOffsetHours);
    const endSolar = computeLocalSolarData(activeCoords.lat, activeCoords.lng, estimatedEndIso, utcOffsetHours);

    // Serie temporal de evolución del fotoperiodo a lo largo del ciclo de la parcela (10 puntos equidistantes)
    const photoperiodCurve: Array<{
      stepLabel: string;
      date: string;
      dds: number;
      stage: string;
      daylightHours: number;
      nightHours: number;
      criticalThreshold: number;
      sunrise: string;
      sunset: string;
    }> = [];

    let accumulatedLightHours = 0;
    let criticalInductionDate = flowDate;
    let criticalInductionDds = Math.round(cycleLimit * 0.42);
    let foundCritical = false;

    for (let d = 0; d <= activeCycleDays; d++) {
      const dIso = new Date(sowDate.getTime() + d * 86400000).toISOString().split('T')[0];
      const s = computeLocalSolarData(activeCoords.lat, activeCoords.lng, dIso, utcOffsetHours);
      accumulatedLightHours += s.daylightHours;
      if (!foundCritical && d > 14 && s.daylightHours <= 14.0) {
        foundCritical = true;
        criticalInductionDate = dIso;
        criticalInductionDds = d;
      }
    }

    const totalSteps = 8;
    for (let i = 0; i <= totalSteps; i++) {
      const dds = Math.round((cycleLimit / totalSteps) * i);
      const ptDate = new Date(sowDate.getTime() + dds * 86400000).toISOString().split('T')[0];
      const sol = computeLocalSolarData(activeCoords.lat, activeCoords.lng, ptDate, utcOffsetHours);
      const pct = dds / cycleLimit;
      const stage =
        pct <= 0.12 ? 'Emergencia' :
        pct <= 0.42 ? 'Vegetativo' :
        pct <= 0.72 ? 'Floración' :
        pct <= 0.92 ? 'Maduración' : 'Cosecha';

      photoperiodCurve.push({
        stepLabel: `D${dds} (${ptDate.slice(5)})`,
        date: ptDate,
        dds,
        stage,
        daylightHours: sol.daylightHours,
        nightHours: sol.nightHours,
        criticalThreshold: 14.0,
        sunrise: sol.sunriseLocal,
        sunset: sol.sunsetLocal
      });
    }

    // Etapa actual sincronizada (prioriza último registro o progreso biológico real)
    const currentStage =
      latestRecord?.stage ||
      (biologicalProgress >= 95 ? 'Cosecha' :
       biologicalProgress >= 75 ? 'Maduración' :
       biologicalProgress >= 45 ? 'Floración' :
       biologicalProgress >= 12 ? 'Vegetativo' : 'Emergencia');

    return {
      cycleLimit,
      sowStr,
      estimatedEndIso,
      rawElapsedDays,
      activeCycleDays,
      isCycleCompleted,
      biologicalProgress,
      currentStage,
      sowSolar,
      vegSolar,
      flowSolar,
      matSolar,
      endSolar,
      accumulatedLightHours: Math.round(accumulatedLightHours),
      criticalInductionDate,
      criticalInductionDds,
      photoperiodCurve
    };
  }, [plot?.sowingDate, plot?.status, variety?.cycleDays, latestRecord, obtainedBatchesFromPlot, nowTick, activeCoords.lat, activeCoords.lng, utcOffsetHours]);

  // Carga de Clima Real y Precipitación Satelital en las Coordenadas Exactas de la Parcela
  useEffect(() => {
    let isMounted = true;
    const fetchPlotTelemetry = async () => {
      if (!activeCoords?.lat || !activeCoords?.lng) return;
      setWeatherLoading(true);
      try {
        const { lat, lng } = activeCoords;
        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset,daylight_duration,shortwave_radiation_sum,et0_fao_evapotranspiration&past_days=7&forecast_days=3&timezone=auto`
        );
        if (wRes.ok) {
          const wData = await wRes.json();
          if (isMounted) setWeatherData(wData);
          if (Array.isArray(wData.daily?.precipitation_sum)) {
            const sum7d = wData.daily.precipitation_sum.slice(0, 8).reduce((a: number, b: number) => a + (Number(b) || 0), 0);
            if (isMounted) setSatelliteRainMm(Number(sum7d.toFixed(1)));
          }
        }
      } catch (e) {
        console.error('Error sincronizando telemetría climática:', e);
      } finally {
        if (isMounted) setWeatherLoading(false);
      }
    };
    fetchPlotTelemetry();
    return () => {
      isMounted = false;
    };
  }, [activeCoords.lat, activeCoords.lng]);

  // Estado del formulario de muestreo agronómico
  const [recordForm, setRecordForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    stage: 'Vegetativo' as TrialRecord['stage'],
    plantHeight: 0,
    plantsPerMeter: 0,
    vigor: 9,
    uniformity: 9,
    diseasesScore: 1,
    pestsScore: 1,
    lodging: 1,
    birdDamage: 1,
    temperature: 21,
    humidity: 46,
    lightHours: 13.5,
    lunarPhase: 'Creciente',
    emergenceDate: '',
    floweringDate: '',
    harvestPlantCount: 0,
    stemWeight: 0,
    seedYield: 0,
    seedQualityGermination: 93,
    seedQualityNonConformity: 0,
    notes: ''
  });

  // Sincroniza condiciones ambientales e iluminación solar local para cualquier fecha de muestreo
  const syncEnvironmentalData = async (selectedDate: string, callback: (data: any) => void) => {
    setIsFetchingConditions(true);
    try {
      const { lat, lng } = activeCoords;
      const localSolar = computeLocalSolarData(lat, lng, selectedDate, utcOffsetHours);
      const isToday = selectedDate === localClockData.dateIso;

      let temp = weatherData?.current?.temperature_2m ?? 21.5;
      let hum = weatherData?.current?.relative_humidity_2m ?? 46;

      if (!isToday) {
        const res = await fetch(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${selectedDate}&end_date=${selectedDate}&daily=temperature_2m_mean,relative_humidity_2m_mean&timezone=auto`
        );
        if (res.ok) {
          const d = await res.json();
          if (d.daily?.temperature_2m_mean?.[0] != null) temp = d.daily.temperature_2m_mean[0];
          if (d.daily?.relative_humidity_2m_mean?.[0] != null) hum = d.daily.relative_humidity_2m_mean[0];
        }
      }

      const lPhase = getLunarPhase(new Date(`${selectedDate}T12:00:00`)).name.replace('Luna ', '').replace('Cuarto ', '');

      callback({
        temperature: Number(Number(temp).toFixed(1)),
        humidity: Math.round(Number(hum)),
        lightHours: localSolar.daylightHours,
        lunarPhase: lPhase
      });
    } catch (e) {
      const localSolar = computeLocalSolarData(activeCoords.lat, activeCoords.lng, selectedDate, utcOffsetHours);
      callback({
        lightHours: localSolar.daylightHours
      });
    } finally {
      setIsFetchingConditions(false);
    }
  };

  // Estadísticas y Balance Agronómico / Térmico / Hídrico sincronizados
  const stats = useMemo(() => {
    // 1. Balance hídrico (unificado con HydricBalance.tsx)
    const plotHydricList = hydricRecords.filter(
      h => h.plotId === plot?.id || (h.locationId === plot?.locationId && !h.plotId)
    );
    const manualRain = plotHydricList
      .filter(h => h.type === 'Lluvia')
      .reduce((s, r) => s + Number(r.amountMm || 0), 0);
    const manualIrrigation = plotHydricList
      .filter(h => h.type === 'Riego')
      .reduce((s, r) => s + Number(r.amountMm || 0), 0);
    const effectiveRain = Math.max(manualRain, satelliteRainMm);
    const totalWater = Number((effectiveRain + manualIrrigation).toFixed(1));

    // 2. Acumulación Térmica (GDD Base 10°C) sincronizada entre muestreos y régimen térmico del ciclo
    let gddFromRecords = 0;
    let growthRate = 0;

    if (chronologicalHistory.length > 0) {
      chronologicalHistory.forEach((curr, idx) => {
        const prevDate = idx === 0 ? new Date(plot?.sowingDate || curr.date) : new Date(chronologicalHistory[idx - 1].date);
        const currDate = new Date(curr.date);
        const diffDays = Math.max(1, Math.ceil((currDate.getTime() - prevDate.getTime()) / 86400000));
        const recTemp = curr.temperature != null ? Number(curr.temperature) : 21.0;
        const dailyGDD = Math.max(0, recTemp - 10);
        gddFromRecords += dailyGDD * diffDays;
      });

      // Si el ciclo sigue activo después del último muestreo, proyectar GDD restante hasta el día activo del ciclo
      const lastRecDate = new Date(chronologicalHistory[chronologicalHistory.length - 1].date);
      const sowDate = new Date(plot?.sowingDate || '2026-01-13');
      const daysCoveredByRecords = Math.max(1, Math.floor((lastRecDate.getTime() - sowDate.getTime()) / 86400000));
      const extraActiveDays = Math.max(0, cycleSync.activeCycleDays - daysCoveredByRecords);
      const currentLiveTemp = weatherData?.current?.temperature_2m ?? 19.5;
      gddFromRecords += extraActiveDays * Math.max(0, ( Number(currentLiveTemp) + 20 ) / 2 - 10);

      if (chronologicalHistory.length > 1) {
        const last = chronologicalHistory[chronologicalHistory.length - 1];
        const prev = chronologicalHistory[chronologicalHistory.length - 2];
        const days = Math.max(1, (new Date(last.date).getTime() - new Date(prev.date).getTime()) / 86400000);
        growthRate = Math.max(0, (Number(last.plantHeight || 0) - Number(prev.plantHeight || 0)) / days);
      } else if (chronologicalHistory[0]?.plantHeight > 0) {
        growthRate = Number(chronologicalHistory[0].plantHeight) / Math.max(1, cycleSync.activeCycleDays);
      }
    } else {
      // Estimación térmica base cuando aún no hay muestreos manuales cargados
      const avgTemp = weatherData?.current?.temperature_2m ?? 20.5;
      gddFromRecords = cycleSync.activeCycleDays * Math.max(4, Number(avgTemp) - 10);
    }

    // 3. Déficit de Presión de Vapor (VPD en kPa) en tiempo real
    const liveTemp = Number(weatherData?.current?.temperature_2m ?? latestRecord?.temperature ?? 20.4);
    const liveHum = Number(weatherData?.current?.relative_humidity_2m ?? latestRecord?.humidity ?? 46);
    const svp = 0.61078 * Math.exp((17.27 * liveTemp) / (liveTemp + 237.3));
    const vpd = Number((svp * (1 - liveHum / 100)).toFixed(2));

    const uvIndexToday = Number(
      weatherData?.daily?.uv_index_max?.[7] ??
      weatherData?.daily?.uv_index_max?.[0] ??
      6.4
    );
    const radiationToday = Number(
      weatherData?.daily?.shortwave_radiation_sum?.[7] ??
      weatherData?.daily?.shortwave_radiation_sum?.[0] ??
      21.8
    );
    const et0Today = Number(
      weatherData?.daily?.et0_fao_evapotranspiration?.[7] ??
      weatherData?.daily?.et0_fao_evapotranspiration?.[0] ??
      4.2
    );

    return {
      totalGDD: Math.round(gddFromRecords),
      gddRequirement: variety?.gddRequirement || 1950,
      totalWater,
      effectiveRain: Number(effectiveRain.toFixed(1)),
      manualIrrigation: Number(manualIrrigation.toFixed(1)),
      waterRequirement: variety?.waterNeedMm || 480,
      growthRate: growthRate.toFixed(1),
      liveTemp: Number(liveTemp.toFixed(1)),
      liveHum: Math.round(liveHum),
      liveWind: Number(weatherData?.current?.wind_speed_10m ?? 14.2),
      livePressure: Math.round(Number(weatherData?.current?.surface_pressure ?? 1013)),
      vpd,
      uvIndexToday: Number(uvIndexToday.toFixed(1)),
      radiationToday: Number(radiationToday.toFixed(1)),
      et0Today: Number(et0Today.toFixed(2))
    };
  }, [chronologicalHistory, hydricRecords, plot, satelliteRainMm, cycleSync.activeCycleDays, weatherData, latestRecord, variety]);

  // Datos enriquecidos para las curvas de Monitoreo & Curvas
  const chartData = useMemo(() => {
    const sowDate = new Date(plot?.sowingDate || '2026-01-13');
    let runningGdd = 0;
    return chronologicalHistory.map((rec, idx) => {
      const prevDate = idx === 0 ? sowDate : new Date(chronologicalHistory[idx - 1].date);
      const currDate = new Date(rec.date);
      const diffDays = Math.max(1, Math.ceil((currDate.getTime() - prevDate.getTime()) / 86400000));
      const dds = Math.max(1, Math.ceil((currDate.getTime() - sowDate.getTime()) / 86400000));
      const tempVal = rec.temperature != null ? Number(rec.temperature) : 21.0;
      const humVal = rec.humidity != null ? Number(rec.humidity) : 45;
      runningGdd += Math.max(0, tempVal - 10) * diffDays;

      const solarAtRec = computeLocalSolarData(activeCoords.lat, activeCoords.lng, rec.date, utcOffsetHours);
      const lightVal = rec.lightHours && rec.lightHours !== 18 ? Number(rec.lightHours) : solarAtRec.daylightHours;

      return {
        ...rec,
        labelDate: `${rec.date.slice(5)} (D${dds})`,
        dds,
        temperature: tempVal,
        humidity: humVal,
        lightHours: lightVal,
        accumulatedGdd: Math.round(runningGdd)
      };
    });
  }, [chronologicalHistory, plot?.sowingDate, activeCoords.lat, activeCoords.lng, utcOffsetHours]);

  const handleOpenNewModal = () => {
    setEditingRecordId(null);
    setIsViewMode(false);
    const todayStr = localClockData.dateIso;
    const nowTime = localClockData.shortTimeStr;
    setRecordForm({
      date: todayStr,
      time: nowTime,
      stage: (latestRecord?.stage || cycleSync.currentStage) as TrialRecord['stage'],
      plantHeight: latestRecord?.plantHeight || 0,
      plantsPerMeter: latestRecord?.plantsPerMeter || plot?.density || 48,
      vigor: 9,
      uniformity: 9,
      diseasesScore: 1,
      pestsScore: 1,
      lodging: 1,
      birdDamage: 1,
      temperature: stats.liveTemp,
      humidity: stats.liveHum,
      lightHours: solarToday.daylightHours,
      lunarPhase: getLunarPhase(new Date()).name.replace('Luna ', '').replace('Cuarto ', ''),
      emergenceDate: latestRecord?.emergenceDate || '',
      floweringDate: latestRecord?.floweringDate || '',
      harvestPlantCount: 0,
      stemWeight: 0,
      seedYield: 0,
      seedQualityGermination: 93,
      seedQualityNonConformity: 0,
      notes: ''
    });
    setIsRecordModalOpen(true);
    syncEnvironmentalData(todayStr, data => setRecordForm(prev => ({ ...prev, ...data })));
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !currentUser || isSaving || isViewMode) return;
    setIsSaving(true);
    try {
      const payload = {
        ...recordForm,
        id: editingRecordId || crypto.randomUUID(),
        plotId: id,
        createdBy: currentUser.id,
        createdByName: currentUser.name
      };
      const success = editingRecordId ? await updateTrialRecord(payload as any) : await addTrialRecord(payload as any);
      if (success) setIsRecordModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEmailAlertModal = () => {
    const client = clients?.find(c => c.id === location?.clientId);
    const defaultEmail = client?.email || location?.ownerContact || currentUser?.email || '';
    const defaultName = client?.contactName || location?.ownerName || location?.responsiblePerson || 'Productor Responsable';

    setAlertRecipientEmail(defaultEmail);
    setAlertRecipientName(defaultName);
    setAlertSeverity('Advertencia');
    setAlertTitle(`Alerta Técnica en Parcela ${plot?.name || ''} (${variety?.name || 'Cáñamo'})`);
    setAlertDetails(
      `Se requiere verificación agronómica en lote ${plot?.name} (${location?.name || 'Establecimiento'}). Temp actual: ${stats.liveTemp}°C, HR: ${stats.liveHum}%, Fotoperiodo local: ${solarToday.daylightFormatted} (Salida ${solarToday.sunriseLocal} - Ocaso ${solarToday.sunsetLocal}), Acumulación térmica: ${stats.totalGDD} GDD, Balance hídrico: ${stats.totalWater} mm.`
    );
    setShowEmailAlertModal(true);
  };

  const handleSendPlotAlertEmail = async () => {
    if (!plot || !alertRecipientEmail.trim()) return;
    setIsSendingAlertEmail(true);
    try {
      const res = await sendAgronomicAlertEmail({
        toEmail: alertRecipientEmail.trim(),
        toName: alertRecipientName.trim() || 'Productor Responsable',
        plotName: `${plot.name} (${location?.name || 'Establecimiento'})`,
        alertTitle: alertTitle.trim() || `Alerta en Parcela ${plot.name}`,
        severity: alertSeverity,
        alertDetails: alertDetails.trim(),
        extraData: {
          varietyName: variety?.name || 'Cáñamo Industrial',
          temperature: `${stats.liveTemp} °C (${stats.liveHum}% HR)`,
          soilMoisture: `${stats.totalWater} mm acumulados`,
          phenologyStage: `${cycleSync.currentStage} (${cycleSync.activeCycleDays}/${cycleSync.cycleLimit} DDS)`,
          ndvi: `${stats.totalGDD} GDD`
        }
      });

      setEmailAlertToast({
        message: res.message,
        via: res.deliveredVia,
        sentTo: res.sentTo
      });
      setShowEmailAlertModal(false);
      setTimeout(() => setEmailAlertToast(null), 6000);
    } finally {
      setIsSendingAlertEmail(false);
    }
  };

  if (!plot) {
    return (
      <div className="p-16 text-center font-mono text-xs uppercase text-slate-400">
        Unidad productiva no localizada en el padrón activo.
      </div>
    );
  }

  const canCreate = currentUser?.role !== 'viewer';
  const lunar = getLunarPhase(nowTick);

  const labelClass = 'block text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5 tracking-wider';
  const inputStyle = 'w-full border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all';

  return (
    <div className="space-y-6 pb-20">
      {/* =====================================================================
          1. CABECERA TÉCNICA UNIFICADA DE LA PARCELA
      ===================================================================== */}
      <div className="bg-white dark:bg-slate-900/95 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-sm">
        {/* Fila Superior: Breadcrumb & Botonera de Acciones */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-2">
            {/* Breadcrumb & Badges de Estado */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => navigate('/plots')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 transition cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Parcelas</span>
              </button>

              <span className="text-slate-300 dark:text-slate-700 font-mono">/</span>

              <Link
                to={`/locations?search=${encodeURIComponent(location?.name || '')}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:text-emerald-600 border border-slate-200/60 dark:border-slate-700/60 transition"
              >
                <MapPin size={11} className="text-emerald-500" />
                <span>{location?.name || 'Establecimiento'}</span>
                <span className="text-slate-400">({location?.city || location?.province || 'Argentina'})</span>
              </Link>

              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider border ${
                  plot.status === 'Activa'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                }`}
              >
                ● {plot.status} · {plot.type}
              </span>

              <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                Campaña {plot.campaign || '2025/2026'}
              </span>
            </div>

            {/* Título Principal & Identificación Geodésica */}
            <div className="flex flex-wrap items-baseline gap-3 pt-1">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 ring-4 ring-emerald-500/10"
                  style={{ backgroundColor: plot.color || '#16a34a' }}
                />
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                  {plot.name}
                </h1>
              </div>

              <span className="text-xs sm:text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                {variety?.name || 'Genética Homologada'} ({variety?.photoperiodType || 'Monoica'} · {cycleSync.cycleLimit}d)
              </span>

              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                Superficie: <strong className="text-slate-800 dark:text-slate-200">{plot.surfaceArea} {plot.surfaceUnit}</strong>
                {' · '}
                GPS: <strong className="text-slate-700 dark:text-slate-300">{activeCoords.lat.toFixed(6)}, {activeCoords.lng.toFixed(6)}</strong>
              </span>
            </div>
          </div>

          {/* Botonera de Acciones */}
          <div className="flex flex-wrap items-center gap-2 no-print">
            {canCreate && (
              <button
                onClick={() => navigate(`/plots?editPlotId=${plot.id}`)}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
              >
                <Edit2 size={13} />
                <span>Editar</span>
              </button>
            )}

            <button
              onClick={() => setIsQrModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
              title="Rótulo QR y Cartel Oficial de Tranquera (Ley 27.669)"
            >
              <QrCode size={14} />
              <span>QR & Cartel</span>
            </button>

            <button
              onClick={() => setIsProtocolModalOpen(true)}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
              title="Protocolo Técnico de Siembra Anexo II"
            >
              <FileText size={13} className="text-emerald-500" />
              <span>Anexo II</span>
            </button>

            <button
              onClick={handleOpenEmailAlertModal}
              className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
            >
              <Mail size={13} />
              <span>Alerta</span>
            </button>

            <button
              onClick={() => window.print()}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl transition cursor-pointer"
              title="Imprimir / Exportar Ficha Técnica PDF"
            >
              <Printer size={15} />
            </button>

            {canCreate && plot.status === 'Activa' && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await closePlotCycle(plot.id, {
                    notes: `Cierre de ciclo y cosecha certificado desde Ficha Técnica (${plot.campaign || '2025/2026'}).`
                  });
                  if (ok) {
                    setEmailAlertToast({
                      message: `Ciclo cerrado: ${plot.name} archivada como Cosechada`,
                      via: 'Gestión de Campaña',
                      sentTo: plot.campaign || '2025/2026'
                    });
                    setTimeout(() => setEmailAlertToast(null), 5000);
                  }
                }}
                className="px-3.5 py-2 bg-amber-500/15 hover:bg-amber-600 text-amber-700 dark:text-amber-300 hover:text-white border border-amber-400/40 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                title="Cerrar ciclo productivo / Cosechar (Retira la parcela del Dashboard Operativo Activo)"
              >
                <CheckCircle2 size={14} />
                <span>Cerrar Ciclo / Cosechar</span>
              </button>
            )}

            {canCreate && plot.status === 'Cosechada' && (
              <button
                type="button"
                onClick={async () => {
                  await reopenPlotCycle(plot.id);
                }}
                className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white border border-emerald-400/40 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                title="Reabrir ciclo en campaña activa"
              >
                <Sprout size={14} />
                <span>Reabrir Ciclo Activo</span>
              </button>
            )}

            {canCreate && (
              <button
                onClick={handleOpenNewModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition cursor-pointer"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Nuevo Muestreo</span>
              </button>
            )}
          </div>
        </div>

        {/* =====================================================================
            BARRA DE SINCRONIZACIÓN METEOROLÓGICA, HORARIA Y DE TRAZABILIDAD EN VIVO
        ===================================================================== */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-900 text-white border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Reloj Local y Sol en la Locación */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs font-mono tabular-nums">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Clock size={14} className="text-emerald-400" />
              <div>
                <span className="text-[9px] uppercase text-slate-400 block leading-none">Hora Local en Lote (UTC-3)</span>
                <strong className="text-sm text-white font-black">{localClockData.timeStr} hs</strong>
              </div>
            </div>

            <div className="h-7 w-px bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-2">
              <Sun size={15} className="text-amber-400" />
              <div>
                <span className="text-[9px] uppercase text-slate-400 block leading-none">
                  Fotoperiodo Hoy ({localClockData.dateIso})
                </span>
                <strong className="text-xs text-amber-300">
                  {solarToday.daylightFormatted}
                </strong>
                <span className="text-[11px] text-slate-300 ml-1.5">
                  (Salida <strong>{solarToday.sunriseLocal}</strong> · Ocaso <strong>{solarToday.sunsetLocal}</strong>)
                </span>
              </div>
            </div>

            <div className="h-7 w-px bg-slate-800 hidden md:block" />

            {/* Clima Actual Sincronizado */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 text-orange-300 font-bold">
                <Thermometer size={13} />
                {weatherLoading ? '...' : `${stats.liveTemp}°C`}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 text-sky-300 font-bold">
                <Droplets size={13} />
                {weatherLoading ? '...' : `${stats.liveHum}% HR`}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 text-emerald-300 font-bold">
                <Wind size={13} />
                {stats.liveWind} km/h
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 text-indigo-300 font-bold" title="Déficit de Presión de Vapor">
                <Gauge size={13} />
                VPD {stats.vpd} kPa
              </span>
            </div>
          </div>

          {/* Trazabilidad de Lote de Semilla INASE/ARICCAME */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono border-t lg:border-t-0 pt-2.5 lg:pt-0 border-slate-800 w-full lg:w-auto justify-between lg:justify-end">
            <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-950/70 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
              <Award size={13} className="text-emerald-400 shrink-0" />
              <span>
                Lote Semilla: <strong>{seedBatch?.batchCode || 'FUT-83-25-HEM'}</strong>
              </span>
              <span className="text-slate-400">|</span>
              <span>Cert. N° <strong>{seedBatch?.certificationNumber || '103'}</strong></span>
            </div>
            <Link
              to="/seed-batches"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold uppercase tracking-wider transition"
            >
              Ver Trazabilidad →
            </Link>
          </div>
        </div>

        {/* =====================================================================
            GRID DE 6 KPIS TÉCNICOS PRINCIPALES (TABULAR-NUMS)
        ===================================================================== */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 mt-5">
          {/* KPI 1: Ciclo Biológico y Siembra */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400">
              <span>Ciclo Fenológico</span>
              <Calendar size={13} className="text-emerald-500" />
            </div>
            <div className="my-2 font-mono tabular-nums">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {cycleSync.activeCycleDays}
                </span>
                <span className="text-xs font-bold text-slate-400">/ {cycleSync.cycleLimit} DDS</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${cycleSync.biologicalProgress}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
              <span>Siembra: <strong>{cycleSync.sowStr}</strong></span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{cycleSync.currentStage}</span>
            </div>
          </div>

          {/* KPI 2: Clima Actual en Lote */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400">
              <span>Clima en Lote</span>
              <Thermometer size={13} className="text-orange-500" />
            </div>
            <div className="my-2 font-mono tabular-nums">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {stats.liveTemp}°C
                </span>
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                  {stats.liveHum}% HR
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              <span>VPD: <strong>{stats.vpd} kPa</strong></span>
              <span>ET₀: <strong>{stats.et0Today} mm</strong></span>
            </div>
          </div>

          {/* KPI 3: Fotoperiodo & Horario Solar Local */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400">
              <span>Fotoperiodo Local</span>
              <Sun size={13} className="text-amber-500" />
            </div>
            <div className="my-2 font-mono tabular-nums">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {solarToday.daylightFormatted}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              <span>Salida: <strong className="text-slate-800 dark:text-slate-200">{solarToday.sunriseLocal}</strong></span>
              <span>Ocaso: <strong className="text-slate-800 dark:text-slate-200">{solarToday.sunsetLocal}</strong></span>
            </div>
          </div>

          {/* KPI 4: Acumulación Térmica (GDD) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400">
              <span>Integral Térmica</span>
              <Zap size={13} className="text-orange-500" />
            </div>
            <div className="my-2 font-mono tabular-nums">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {stats.totalGDD}
                </span>
                <span className="text-[11px] font-bold text-slate-400">/ {stats.gddRequirement} GDD</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              <span>Base 10°C</span>
              <span className="text-orange-600 dark:text-orange-400 font-bold">
                {Math.min(100, Math.round((stats.totalGDD / stats.gddRequirement) * 100))}% térmico
              </span>
            </div>
          </div>

          {/* KPI 5: Huella Hídrica Total (Lluvia + Riego) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400">
              <span>Balance Hídrico</span>
              <CloudRain size={13} className="text-sky-500" />
            </div>
            <div className="my-2 font-mono tabular-nums">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-sky-600 dark:text-sky-400">
                  {stats.totalWater}
                </span>
                <span className="text-xs font-bold text-slate-400">mm</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              <span>Lluvia: <strong>{stats.effectiveRain}</strong></span>
              <span>Riego: <strong>{stats.manualIrrigation}</strong></span>
            </div>
          </div>

          {/* KPI 6: Desarrollo Vegetal & Población */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400">
              <span>Biometría Actual</span>
              <TrendingUp size={13} className="text-emerald-500" />
            </div>
            <div className="my-2 font-mono tabular-nums">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {latestRecord?.plantHeight ?? 0}
                </span>
                <span className="text-xs font-bold text-slate-400">cm ({stats.growthRate} cm/d)</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              <span>Stand: <strong>{latestRecord?.plantsPerMeter || plot.density || 46} pl/m²</strong></span>
              <span>Vigor: <strong>{latestRecord?.vigor || 9}/9</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. LÍNEA DE TIEMPO FENOLÓGICA INTERACTIVA (ESCALA BBCH CÁÑAMO INDUSTRIAL)
      ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sprout size={15} className="text-emerald-500" />
            <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Escala Fenológica BBCH & Evolución del Ciclo ({cycleSync.activeCycleDays} / {cycleSync.cycleLimit} DDS · {cycleSync.biologicalProgress}%)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Siembra: <strong>{cycleSync.sowStr}</strong> → Fin estimado: <strong>{cycleSync.estimatedEndIso}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono">
          {[
            { id: 'BBCH_00_09' as HempStageId, code: 'BBCH 00-09', label: 'Emergencia', dds: '0-10 DDS', match: cycleSync.activeCycleDays <= 10 },
            { id: 'BBCH_10_19' as HempStageId, code: 'BBCH 10-19', label: 'Vegetativo V1-V4', dds: '11-25 DDS', match: cycleSync.activeCycleDays > 10 && cycleSync.activeCycleDays <= 25 },
            { id: 'BBCH_20_39' as HempStageId, code: 'BBCH 20-39', label: 'Elongación Rápida', dds: '26-55 DDS', match: cycleSync.activeCycleDays > 25 && cycleSync.activeCycleDays <= 55 },
            { id: 'BBCH_50_59' as HempStageId, code: 'BBCH 50-59', label: 'Inducción (<14h)', dds: '56-70 DDS', match: cycleSync.activeCycleDays > 55 && cycleSync.activeCycleDays <= 70 },
            { id: 'BBCH_60_69' as HempStageId, code: 'BBCH 60-69', label: 'Plena Floración', dds: '71-95 DDS', match: cycleSync.activeCycleDays > 70 && cycleSync.activeCycleDays <= 95 },
            { id: 'BBCH_89_99' as HempStageId, code: 'BBCH 70-99', label: 'Maduración & Cosecha', dds: '96+ DDS', match: cycleSync.activeCycleDays > 95 }
          ].map((st, idx) => {
            const isCurrent = plot.currentPhenologicalStage ? plot.currentPhenologicalStage === st.id : st.match;
            return (
              <button
                key={st.id}
                type="button"
                disabled={!canCreate}
                onClick={() => updatePlotPhenology(plot.id, st.id, localClockData.dateIso, `Actualización fenológica a ${st.label}`, currentUser?.name || 'Agrónomo')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] font-bold uppercase">
                  <span className={isCurrent ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>{st.code}</span>
                  <span>{st.dds}</span>
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white mt-1 truncate">
                  {idx + 1}. {st.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          3. BARRA DE NAVEGACIÓN DE LAS 8 SECCIONES TÉCNICAS DE LA PARCELA
      ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar no-print shadow-sm">
        {[
          { id: 'analytics', label: 'Monitoreo & Curvas', icon: Activity },
          { id: 'map', label: 'Mapa & Geocerca', icon: Compass },
          { id: 'astro', label: 'Ciclo de Luz', icon: Sun },
          { id: 'logs', label: 'Bitácora Multimedia', icon: Sparkles },
          { id: 'water', label: 'Pluviómetro', icon: Droplets },
          { id: 'phytosanitary', label: `Cuaderno Fitosanitario (${plotAgroApps.length})`, icon: FlaskConical },
          { id: 'iot', label: 'Telemetría IoT', icon: Wifi }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        ))}

        <Link
          to={`/agriculture-40?plotId=${plot.id}`}
          className="px-4 py-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-600 hover:text-white ml-auto"
        >
          <Layers size={14} />
          <span>Agro 4.0: NDVI & Suelo</span>
        </Link>
      </div>

      {/* =====================================================================
          4. CONTENIDO DE CADA PESTAÑA TÉCNICA
      ===================================================================== */}
      <div className="space-y-6">
        {/* -------------------------------------------------------------------
            PESTAÑA 1: MONITOREO & CURVAS (BIOMETRÍA, CLIMA Y REGISTROS)
        ------------------------------------------------------------------- */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico 1: Curva de Elongación Vegetal vs Régimen Térmico */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col h-[380px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp size={15} className="text-emerald-500" />
                      <span>Curva de Crecimiento (cm) & Temperatura (°C)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Sincronizada desde fecha de siembra ({cycleSync.sowStr}) en {location?.name}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Máx: {latestRecord?.plantHeight || 0} cm
                  </span>
                </div>

                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <defs>
                        <linearGradient id="heightGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                      <XAxis dataKey="labelDate" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                      <YAxis yAxisId="left" unit="cm" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                      <YAxis yAxisId="right" orientation="right" unit="°C" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '12px',
                          border: '1px solid #1e293b',
                          color: '#fff',
                          fontSize: '11px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="plantHeight"
                        name="Altura Planta (cm)"
                        stroke="#10b981"
                        fill="url(#heightGrad)"
                        strokeWidth={3}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="temperature"
                        name="Temperatura Muestreo (°C)"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#f97316' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 2: Humedad Relativa, Fotoperiodo y Vigor en Muestreos */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col h-[380px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <Sun size={15} className="text-amber-500" />
                      <span>Fotoperiodo (hs luz), Humedad (% HR) & Stand</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Correlación entre acortamiento del día, humedad ambiental e inducción floral
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    Umbral Floral: 14.0h
                  </span>
                </div>

                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                      <XAxis dataKey="labelDate" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                      <YAxis yAxisId="left" domain={[0, 100]} unit="%" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                      <YAxis yAxisId="right" orientation="right" domain={[8, 17]} unit="h" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '12px',
                          border: '1px solid #1e293b',
                          color: '#fff',
                          fontSize: '11px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                      <Bar
                        yAxisId="left"
                        dataKey="humidity"
                        name="Humedad Relativa (%)"
                        fill="#38bdf8"
                        radius={[6, 6, 0, 0]}
                        barSize={24}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="lightHours"
                        name="Fotoperiodo Local (hs)"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#f59e0b' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Tabla de Historial de Muestreos Sincronizada */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Planilla de Monitoreo Fenológico y Ambiental ({history.length} controles)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Registros certificados con fecha, hora local, clima medido, fotoperiodo real y biometría.
                  </p>
                </div>

                <button
                  onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <span>Orden: {sortOrder === 'desc' ? 'Recientes Primero' : 'Cronológico'}</span>
                  {sortOrder === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Fecha & Hora Local</th>
                      <th className="px-5 py-3.5">Etapa & DDS</th>
                      <th className="px-5 py-3.5 text-center">Temp / Humedad</th>
                      <th className="px-5 py-3.5 text-center">Fotoperiodo / Luna</th>
                      <th className="px-5 py-3.5 text-right">Altura (cm)</th>
                      <th className="px-5 py-3.5 text-right">Densidad (pl/m²)</th>
                      <th className="px-5 py-3.5 text-center">Vigor / Unif.</th>
                      <th className="px-5 py-3.5">Responsable</th>
                      <th className="px-5 py-3.5 text-right no-print">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-sans text-xs">
                          No hay controles biométricos registrados aún para esta parcela.
                        </td>
                      </tr>
                    ) : (
                      history.map(r => {
                        const dds = Math.max(
                          1,
                          Math.ceil((new Date(r.date).getTime() - new Date(plot.sowingDate || r.date).getTime()) / 86400000)
                        );
                        const recSolar = computeLocalSolarData(activeCoords.lat, activeCoords.lng, r.date, utcOffsetHours);
                        const displayLight = r.lightHours && r.lightHours !== 18 ? Number(r.lightHours) : recSolar.daylightHours;

                        return (
                          <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="font-bold text-slate-900 dark:text-white">{r.date}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Clock size={10} /> {r.time || '10:00'} hs (UTC-3)
                              </div>
                            </td>

                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                  r.stage === 'Floración'
                                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                    : r.stage === 'Maduración' || r.stage === 'Cosecha'
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                }`}
                              >
                                {r.stage}
                              </span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">Día {dds} DDS</span>
                            </td>

                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              <span className="font-bold text-orange-600 dark:text-orange-400">
                                {r.temperature != null ? `${r.temperature}°C` : `${stats.liveTemp}°C`}
                              </span>
                              <span className="text-slate-300 dark:text-slate-700 mx-1">/</span>
                              <span className="font-bold text-sky-600 dark:text-sky-400">
                                {r.humidity != null ? `${r.humidity}%` : `${stats.liveHum}%`}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              <div className="font-bold text-amber-600 dark:text-amber-400">
                                {formatDecimalHoursToHM(displayLight)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Luna {r.lunarPhase || 'Creciente'}
                              </div>
                            </td>

                            <td className="px-5 py-3.5 text-right font-black text-slate-900 dark:text-white text-sm">
                              {Number(r.plantHeight || 0).toFixed(1)} cm
                            </td>

                            <td className="px-5 py-3.5 text-right font-bold text-slate-700 dark:text-slate-300">
                              {r.plantsPerMeter || '-'} pl/m²
                            </td>

                            <td className="px-5 py-3.5 text-center">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                                V:{r.vigor || 9} · U:{r.uniformity || 9}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 font-sans text-xs text-slate-600 dark:text-slate-300">
                              {r.createdByName || 'Equipo Técnico'}
                            </td>

                            <td className="px-5 py-3.5 text-right no-print">
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setEditingRecordId(r.id);
                                    setRecordForm({ ...(r as any) });
                                    setIsViewMode(true);
                                    setIsRecordModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-sky-600 rounded-lg transition cursor-pointer"
                                  title="Ver detalle"
                                >
                                  <Eye size={14} />
                                </button>
                                {canCreate && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingRecordId(r.id);
                                        setRecordForm({ ...(r as any) });
                                        setIsViewMode(false);
                                        setIsRecordModalOpen(true);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg transition cursor-pointer"
                                      title="Editar muestreo"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={() => deleteTrialRecord(r.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                      title="Eliminar muestreo"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
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

        {/* -------------------------------------------------------------------
            PESTAÑA 2: MAPA & GEOCERCA GEODÉSICA
        ------------------------------------------------------------------- */}
        {activeTab === 'map' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-mono font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Compass size={16} className="text-emerald-500" />
                  <span>Geodesia Satelital & Polígono de la Parcela ({plot.name})</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Centroide GPS: {activeCoords.lat.toFixed(6)}, {activeCoords.lng.toFixed(6)} · Vértices: {plot.polygon?.length || 0} puntos · Superficie: {plot.surfaceArea} {plot.surfaceUnit}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/agriculture-40?plotId=${plot.id}`}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider transition"
                >
                  Abrir Teledetección Sentinel-2A →
                </Link>
              </div>
            </div>

            <div className="h-[540px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <MapEditor
                initialCenter={activeCoords}
                initialPolygon={plot.polygon || []}
                referencePolygon={location?.polygon || []}
                polygonLabel={`Parcela ${plot.name} (${plot.surfaceArea} ${plot.surfaceUnit})`}
                referenceLabel={location?.name ? `Perímetro Campo: ${location.name}` : 'Campo Padre'}
                readOnly={true}
                height="100%"
              />
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            PESTAÑA 3: CICLO DE LUZ (SINCRONIZADO CON LA HORA LOCAL Y EL CICLO)
        ------------------------------------------------------------------- */}
        {activeTab === 'astro' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Banner de Estado de Sincronización Astronómica y Fenológica */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                  <Sun size={22} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Sincronización Fotoperiódica con Locación & Ciclo de Cultivo
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Huso Local Sincronizado ({locationTimezone} · UTC-3)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                    Locación: <strong>{location?.name} ({location?.city || location?.province})</strong> · Latitud: <strong>{activeCoords.lat.toFixed(5)}°</strong> · Longitud: <strong>{activeCoords.lng.toFixed(5)}°</strong> · Hora Local Actual: <strong className="text-emerald-600 dark:text-emerald-400">{localClockData.timeStr} hs</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 shrink-0">
                <div>
                  <span className="text-[9px] uppercase text-slate-400 block">Estado Lumínico en Lote</span>
                  <strong className={solarToday.isDaytime ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-500 dark:text-indigo-400'}>
                    {solarToday.isDaytime ? '☀️ Fase Diurna Activa (PAR)' : '🌙 Fase Oscura (Escotoperiodo)'}
                  </strong>
                </div>
              </div>
            </div>

            {/* BLOQUE 1: FOTOPERIODO DIARIO EN HORA LOCAL DE LA LOCACIÓN + BARRA DE POSICIÓN SOLAR */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tarjeta Principal: Duración del Día, Salida, Mediodía Solar y Ocaso en Hora Local */}
              <div className="lg:col-span-2 bg-slate-900 text-white p-6 sm:p-8 rounded-2xl border border-slate-800 relative overflow-hidden flex flex-col justify-between">
                <div className="relative z-10 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 block">
                        Efemérides Solares en Hora Oficial del Lote (ART · UTC-3)
                      </span>
                      <h4 className="text-lg font-black text-white mt-0.5">
                        Duración del Día (Fotoperiodo) & Escotoperiodo Nocturno
                      </h4>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-slate-800 text-xs font-mono font-bold text-slate-200 border border-slate-700 tabular-nums self-start sm:self-auto">
                      Fecha Local: {localClockData.dateIso} · {localClockData.shortTimeStr} hs
                    </span>
                  </div>

                  {/* Métricas Principales: Fotoperiodo, Salida, Mediodía, Ocaso, Escotoperiodo */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono tabular-nums">
                    <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <span className="text-[9px] uppercase text-amber-300 font-bold block">Fotoperiodo (Luz)</span>
                      <p className="text-2xl font-black text-amber-400 mt-1">{solarToday.daylightFormatted}</p>
                      <span className="text-[10px] text-slate-400">{solarToday.daylightHours} hs dec.</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700/80">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">Salida (Amanecer)</span>
                      <p className="text-2xl font-black text-white mt-1">{solarToday.sunriseLocal}</p>
                      <span className="text-[10px] text-emerald-400">Hora Local (UTC-3)</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700/80">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">Mediodía Solar</span>
                      <p className="text-2xl font-black text-amber-200 mt-1">{solarToday.solarNoonLocal}</p>
                      <span className="text-[10px] text-slate-400">Cenit en Lote</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700/80">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">Ocaso (Atardecer)</span>
                      <p className="text-2xl font-black text-white mt-1">{solarToday.sunsetLocal}</p>
                      <span className="text-[10px] text-sky-400">Hora Local (UTC-3)</span>
                    </div>

                    <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                      <span className="text-[9px] uppercase text-indigo-300 font-bold block">Escotoperiodo</span>
                      <p className="text-2xl font-black text-indigo-300 mt-1">{solarToday.nightFormatted}</p>
                      <span className="text-[10px] text-slate-400">Noche continua</span>
                    </div>
                  </div>

                  {/* Barra de Progreso Solar Diaria Sincronizada con la Hora Local */}
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span className="text-slate-300">
                        Trayectoria Solar Diaria en <strong>{plot.name}</strong>
                      </span>
                      <span className="text-amber-400 font-bold">
                        {solarToday.isDaytime
                          ? `${solarToday.solarProgressPct}% del arco diurno completado (${localClockData.shortTimeStr} hs)`
                          : `Fuera de ventana diurna (${localClockData.shortTimeStr} hs local)`}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${solarToday.solarProgressPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 tabular-nums">
                      <span>🌅 {solarToday.sunriseLocal} hs</span>
                      <span>☀️ Cenit {solarToday.solarNoonLocal} hs</span>
                      <span>🌇 {solarToday.sunsetLocal} hs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta Lateral: Radiación UV, PAR y Fase Lunar */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Radiación Solar & UV en Lote
                    </span>
                    <Zap size={15} className="text-amber-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 font-mono tabular-nums">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] uppercase text-slate-400 block">Índice UV Máx</span>
                      <strong className="text-xl font-black text-slate-900 dark:text-white">
                        {stats.uvIndexToday}
                      </strong>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                        {stats.uvIndexToday > 7 ? 'Alto (Estímulo Tricomas)' : 'Moderado / Óptimo'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] uppercase text-slate-400 block">Radiación Onda Corta</span>
                      <strong className="text-xl font-black text-slate-900 dark:text-white">
                        {stats.radiationToday}
                      </strong>
                      <span className="text-[10px] text-slate-400 block">MJ/m²/día</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
                  <div className="text-4xl bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center border border-slate-200/60 dark:border-slate-700 shrink-0">
                    {lunar.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                      Sincronía Selenográfica
                    </span>
                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                      {lunar.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {lunar.desc}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* BLOQUE 2: SINCRONIZACIÓN DEL FOTOPERIODO CON EL CICLO FENOLÓGICO DE LA PARCELA */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-mono font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <Sprout size={15} className="text-emerald-500" />
                    <span>
                      Sincronización Fotoperiódica del Ciclo de Cultivo ({variety?.name || 'Futura 83'} · {cycleSync.cycleLimit} Días)
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Evolución real de las horas de luz en <strong>{plot.name}</strong> desde la siembra ({cycleSync.sowStr}) hasta fin de ciclo ({cycleSync.estimatedEndIso}).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold tabular-nums">
                    Luz Acumulada Ciclo: {cycleSync.accumulatedLightHours} hs
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold tabular-nums">
                    Inducción Floral (&lt;14h): {cycleSync.criticalInductionDate} (Día {cycleSync.criticalInductionDds} DDS)
                  </span>
                </div>
              </div>

              {/* Hitos Fotoperiódicos del Ciclo de la Parcela */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono tabular-nums">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
                    1. Siembra & Emergencia ({cycleSync.sowStr})
                  </span>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {cycleSync.sowSolar.daylightFormatted}
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Salida {cycleSync.sowSolar.sunriseLocal} · Ocaso {cycleSync.sowSolar.sunsetLocal}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Día largo ({cycleSync.sowSolar.daylightHours}h) → Máxima elongación vegetativa
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-sky-600 dark:text-sky-400 block">
                    2. Desarrollo Vegetativo (Día ~35 DDS)
                  </span>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {cycleSync.vegSolar.daylightFormatted}
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Salida {cycleSync.vegSolar.sunriseLocal} · Ocaso {cycleSync.vegSolar.sunsetLocal}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Cruce de umbral crítico (14h 00m) en Día {cycleSync.criticalInductionDds} DDS
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 block">
                    3. Plena Floración (Día ~75 DDS)
                  </span>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {cycleSync.flowSolar.daylightFormatted}
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Salida {cycleSync.flowSolar.sunriseLocal} · Ocaso {cycleSync.flowSolar.sunsetLocal}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Escotoperiodo {cycleSync.flowSolar.nightFormatted} → Diferenciación floral plena
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block">
                    4. Maduración & Cosecha ({cycleSync.estimatedEndIso})
                  </span>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {cycleSync.endSolar.daylightFormatted}
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Salida {cycleSync.endSolar.sunriseLocal} · Ocaso {cycleSync.endSolar.sunsetLocal}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Cierre de ciclo ({cycleSync.activeCycleDays}/{cycleSync.cycleLimit} DDS · {cycleSync.biologicalProgress}%)
                  </span>
                </div>
              </div>

              {/* Curva Fotoperiódica del Ciclo */}
              <div className="h-[300px] pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={cycleSync.photoperiodCurve}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="stepLabel" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <YAxis domain={[8, 17]} unit="h" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        border: '1px solid #1e293b',
                        color: '#fff',
                        fontSize: '11px',
                        fontFamily: 'monospace'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                    <ReferenceLine
                      y={14}
                      stroke="#a855f7"
                      strokeDasharray="4 4"
                      label={{ value: 'Umbral Inducción Floral (14.0h)', position: 'insideTopRight', fill: '#a855f7', fontSize: 10 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="daylightHours"
                      name="Fotoperiodo Diurno (hs Luz)"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.2}
                      strokeWidth={3}
                    />
                    <Line
                      type="monotone"
                      dataKey="nightHours"
                      name="Escotoperiodo Nocturno (hs Oscuridad)"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#6366f1' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            PESTAÑA 4: BITÁCORA MULTIMEDIA (ESCRITORIO + CÁMARA CELULAR + CRUD)
        ------------------------------------------------------------------- */}
        {activeTab === 'logs' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-mono font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-500" />
                  <span>Bitácora Multimedia de Campo ({plotLogs.length} entradas)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Carga de fotografías desde el escritorio o toma directa con cámara de celular en {plot.name}.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                Hora Local Lote: {localClockData.shortTimeStr} hs (UTC-3)
              </span>
            </div>

            {canCreate && (
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  if (!newLogNote.trim()) return;
                  const payload: FieldLog = {
                    id: editingLogId || crypto.randomUUID(),
                    plotId: plot.id,
                    date: newLogDate || localClockData.dateIso,
                    time: newLogTime || localClockData.shortTimeStr,
                    note: newLogNote.trim(),
                    photoUrl: newLogPhoto.trim() || undefined
                  };
                  if (editingLogId) {
                    await updateLog(payload);
                  } else {
                    await addLog(payload);
                  }
                  setEditingLogId(null);
                  setNewLogNote('');
                  setNewLogPhoto('');
                  setNewLogDate(localClockData.dateIso);
                  setNewLogTime(localClockData.shortTimeStr);
                }}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    {editingLogId ? '✏️ Editando Entrada de Bitácora' : '➕ Nueva Entrada en Bitácora de Campo'}
                  </span>
                  {editingLogId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLogId(null);
                        setNewLogNote('');
                        setNewLogPhoto('');
                        setNewLogDate(localClockData.dateIso);
                        setNewLogTime(localClockData.shortTimeStr);
                      }}
                      className="text-[11px] font-mono font-bold text-slate-500 hover:text-rose-600 uppercase cursor-pointer"
                    >
                      Cancelar Edición ✕
                    </button>
                  )}
                </div>

                {/* Inputs ocultos para Escritorio/Galería y Cámara Nativa Celular */}
                <input
                  ref={fileInputDesktopRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsProcessingImage(true);
                    try {
                      const compressedDataUrl = await compressImageFileToDataUrl(file);
                      setNewLogPhoto(compressedDataUrl);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsProcessingImage(false);
                      e.target.value = '';
                    }
                  }}
                />
                <input
                  ref={fileInputMobileCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsProcessingImage(true);
                    try {
                      const compressedDataUrl = await compressImageFileToDataUrl(file);
                      setNewLogPhoto(compressedDataUrl);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsProcessingImage(false);
                      e.target.value = '';
                    }
                  }}
                />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Observación Agronómica / Novedad de Campo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Cierre de entresurco completo, excelente sanidad foliar sin presencia de plagas..."
                      value={newLogNote}
                      onChange={e => setNewLogNote(e.target.value)}
                      className={inputStyle}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fecha del Registro</label>
                    <input
                      type="date"
                      value={newLogDate}
                      onChange={e => setNewLogDate(e.target.value)}
                      className={inputStyle}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Hora Local (UTC-3)</label>
                    <input
                      type="time"
                      value={newLogTime}
                      onChange={e => setNewLogTime(e.target.value)}
                      className={inputStyle}
                    />
                  </div>
                </div>

                {/* Barra de Captura Fotográfica: Escritorio + Cámara Celular + Visor WebRTC + URL */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end pt-1">
                  <div className="lg:col-span-7 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isProcessingImage}
                      onClick={() => fileInputDesktopRef.current?.click()}
                      className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-200 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition cursor-pointer"
                    >
                      {isProcessingImage ? <Loader2 size={14} className="animate-spin text-emerald-500" /> : <Upload size={14} className="text-emerald-600" />}
                      <span>Subir Foto (Escritorio / Galería)</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessingImage}
                      onClick={() => fileInputMobileCameraRef.current?.click()}
                      className="px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition cursor-pointer"
                    >
                      <Camera size={14} />
                      <span>Tomar Foto (Cámara Celular)</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setCameraError(null);
                        setIsCameraModalOpen(true);
                        try {
                          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                            const stream = await navigator.mediaDevices.getUserMedia({
                              video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
                              audio: false
                            });
                            cameraStreamRef.current = stream;
                            setTimeout(() => {
                              if (videoRef.current) {
                                videoRef.current.srcObject = stream;
                                videoRef.current.play().catch(() => {});
                              }
                            }, 120);
                          } else {
                            setCameraError('Tu navegador no soporta cámara en vivo. Usa el botón "Tomar Foto (Cámara Celular)".');
                          }
                        } catch (err: any) {
                          setCameraError('No se pudo acceder a la cámara en vivo. Puedes usar "Tomar Foto (Cámara Celular)" o "Subir Foto".');
                        }
                      }}
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-mono font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                      title="Abrir cámara en vivo desde navegador"
                    >
                      <Camera size={13} className="text-amber-400" />
                      <span>Cámara en Vivo</span>
                    </button>
                  </div>

                  <div className="lg:col-span-5 flex gap-2">
                    <input
                      type="text"
                      placeholder="O pegar URL de foto (https://...)"
                      value={newLogPhoto.startsWith('data:image/') ? '' : newLogPhoto}
                      onChange={e => setNewLogPhoto(e.target.value)}
                      className={inputStyle}
                    />
                    <button
                      type="submit"
                      disabled={isProcessingImage || !newLogNote.trim()}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-mono font-bold text-xs uppercase tracking-wider shrink-0 cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Save size={14} />
                      <span>{editingLogId ? 'Guardar Cambios' : 'Registrar'}</span>
                    </button>
                  </div>
                </div>

                {/* Previsualización de Fotografía Adjunta antes de guardar */}
                {newLogPhoto && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800/70">
                    <div className="flex items-center gap-3">
                      <img
                        src={newLogPhoto}
                        alt="Previsualización"
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                      <div className="font-mono">
                        <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
                          ✓ Fotografía Lista para Guardar en Base de Datos
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {newLogPhoto.startsWith('data:image/')
                            ? `Imagen optimizada (${Math.round((newLogPhoto.length * 0.75) / 1024)} KB)`
                            : 'Enlace externo vinculado'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewLogPhoto('')}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] font-mono font-bold uppercase cursor-pointer"
                    >
                      Quitar Foto
                    </button>
                  </div>
                )}
              </form>
            )}

            {plotLogs.length === 0 ? (
              <div className="py-12 text-center font-mono text-xs text-slate-400 uppercase space-y-2">
                <ImageIcon size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
                <p>No hay registros multimedia cargados en la bitácora de esta parcela.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plotLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                        <span>📅 {log.date} · 🕒 {log.time || '10:00'} hs (UTC-3)</span>
                        {canCreate && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLogId(log.id);
                                setNewLogNote(log.note || '');
                                setNewLogPhoto(log.photoUrl || '');
                                setNewLogDate(log.date || localClockData.dateIso);
                                setNewLogTime(log.time || localClockData.shortTimeStr);
                              }}
                              className="text-slate-400 hover:text-sky-600 transition cursor-pointer"
                              title="Editar entrada"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteLog(log.id)}
                              className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Eliminar entrada"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                        {log.note}
                      </p>
                    </div>
                    {log.photoUrl && (
                      <img
                        src={log.photoUrl}
                        alt="Evidencia de campo"
                        onClick={() => setPreviewPhoto(log.photoUrl || null)}
                        className="w-full h-48 object-cover rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------------
            PESTAÑA 5: PLUVIÓMETRO Y BALANCE HÍDRICO SINCRONIZADO
        ------------------------------------------------------------------- */}
        {activeTab === 'water' && (
          <div className="animate-in fade-in duration-300">
            <HydricBalance
              locationId={plot.locationId}
              plotId={plot.id}
              startDate={plot.sowingDate}
              waterNeedMm={variety?.waterNeedMm || 480}
            />
          </div>
        )}

        {/* -------------------------------------------------------------------
            PESTAÑA 6:TELEMETRÍA IOT EN TIEMPO REAL (SINCRONIZADA CON EL CLIMA DEL LOTE)
        ------------------------------------------------------------------- */}
        {activeTab === 'iot' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
                    <Radio size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Estación Agrometeorológica & Sondas de Suelo ({plot.name})
                      </h3>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[10px] border border-emerald-500/20">
                        ● ONLINE · LORA-WAN ({localClockData.shortTimeStr} hs)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      Sincronizada con {location?.name} · GPS: {activeCoords.lat.toFixed(5)}, {activeCoords.lng.toFixed(5)} · Presión: {stats.livePressure} hPa
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 font-mono tabular-nums">
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Humedad Volumétrica Suelo</span>
                    <Droplets size={15} className="text-sky-500" />
                  </div>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">
                    {Math.min(78, Math.max(38, Math.round(stats.liveHum * 0.92)))}%
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2">
                    ✓ Capacidad de Campo ({location?.irrigationSystem || 'Riego Activo'})
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Conductividad (EC Suelo)</span>
                    <Zap size={15} className="text-amber-500" />
                  </div>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">
                    1.64 <span className="text-xs font-normal text-slate-400">mS/cm</span>
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2">
                    ✓ Nutrición radicular equilibrada
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Temp. Dosel / Ambiente</span>
                    <Thermometer size={15} className="text-orange-500" />
                  </div>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">
                    {stats.liveTemp}°C
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2">
                    HR: {stats.liveHum}% · VPD: {stats.vpd} kPa
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Flujo Fotónico PAR</span>
                    <Sun size={15} className="text-amber-500" />
                  </div>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">
                    {solarToday.isDaytime ? Math.round(stats.radiationToday * 42) : 0}{' '}
                    <span className="text-xs font-normal text-slate-400">µmol/m²/s</span>
                  </p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-2">
                    Fotoperiodo hoy: {solarToday.daylightFormatted}
                  </p>
                </div>
              </div>

              {/* Reglas de Automatización */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                  <Sliders size={14} className="text-indigo-500" /> Umbrales de Alerta & Automatización de Riego
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Alerta Temp. Máxima (°C)
                    </label>
                    <input
                      type="number"
                      value={iotAlertsConfig.maxTemp}
                      onChange={e => setIotAlertsConfig({ ...iotAlertsConfig, maxTemp: Number(e.target.value) })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-black text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Gatillo Humedad Suelo Mín (%)
                    </label>
                    <input
                      type="number"
                      value={iotAlertsConfig.minSoilMoisture}
                      onChange={e => setIotAlertsConfig({ ...iotAlertsConfig, minSoilMoisture: Number(e.target.value) })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-black text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Límite Salinidad EC (mS/cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={iotAlertsConfig.maxEc}
                      onChange={e => setIotAlertsConfig({ ...iotAlertsConfig, maxEc: Number(e.target.value) })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-black text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Electroválvula Fertirriego
                    </span>
                    <button
                      onClick={() => setIotAlertsConfig({ ...iotAlertsConfig, autoIrrigation: !iotAlertsConfig.autoIrrigation })}
                      className={`mt-1 py-2 px-3 rounded-lg font-bold text-xs uppercase transition cursor-pointer ${
                        iotAlertsConfig.autoIrrigation
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {iotAlertsConfig.autoIrrigation ? 'Automático ON' : 'Manual OFF'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <LiveTelemetryPanel plot={plot} />
          </div>
        )}

        {/* -------------------------------------------------------------------
            PESTAÑA 7: CUADERNO FITOSANITARIO OFICIAL (SENASA / BPA)
        ------------------------------------------------------------------- */}
        {activeTab === 'phytosanitary' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-500/20">
                    <FlaskConical size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Cuaderno Fitosanitario & Bioinsumos ({plot.name})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Registro auditable de aplicaciones, marbete SENASA, dosis por hectárea y período de carencia.
                    </p>
                  </div>
                </div>

                {canCreate && (
                  <button
                    onClick={() => {
                      setEditingAgroId(null);
                      setAgroForm({
                        date: localClockData.dateIso,
                        productName: '',
                        activeIngredient: '',
                        senasaRegisterNumber: '',
                        category: 'Bioestimulante',
                        batchNumber: '',
                        dosagePerHa: 2.5,
                        dosageUnit: 'L/ha',
                        totalAppliedAmount: 5,
                        safetyPeriodDays: 0,
                        applicationMethod: 'Pulverización Terrestre',
                        targetPestOrPurpose: '',
                        responsibleAgronomist: currentUser?.name || 'Ing. Agr. Gastón Barea',
                        agronomistLicense: 'MP-4821-CIAFBA',
                        weatherConditionsAtApp: `${stats.liveTemp}°C | Hum: ${stats.liveHum}% | Viento: ${stats.liveWind} km/h`,
                        notes: ''
                      });
                      setIsAgroModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>Registrar Aplicación</span>
                  </button>
                )}
              </div>

              {plotAgroApps.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <FlaskConical size={36} className="mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="text-xs font-mono font-bold uppercase text-slate-500 dark:text-slate-400">
                    Lote Libre de Aplicaciones Fitosanitarias (0 Registros)
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    El cultivo en {plot.name} se desarrolla bajo manejo agroecológico sin aplicaciones químicas registradas.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
                  {plotAgroApps.map(app => {
                    const today = new Date();
                    const harvestDate = new Date(app.harvestSafetyDate);
                    const isUnderSafety = today < harvestDate;
                    const daysLeft = Math.max(0, Math.ceil((harvestDate.getTime() - today.getTime()) / 86400000));

                    return (
                      <div
                        key={app.id}
                        className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-mono font-bold uppercase text-purple-600 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded">
                              {app.category}
                            </span>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                              {app.productName}
                            </h4>
                            <p className="text-[11px] text-slate-500">{app.activeIngredient}</p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isUnderSafety ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono font-bold text-[9px] border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                <Clock size={10} /> Carencia ({daysLeft}d)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[9px] border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                <CheckCircle2 size={10} /> Apto Cosecha
                              </span>
                            )}
                            {canCreate && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAgroId(app.id);
                                    setAgroForm({
                                      date: app.date,
                                      productName: app.productName,
                                      activeIngredient: app.activeIngredient,
                                      senasaRegisterNumber: app.senasaRegisterNumber,
                                      category: app.category,
                                      batchNumber: app.batchNumber,
                                      dosagePerHa: app.dosagePerHa,
                                      dosageUnit: app.dosageUnit,
                                      totalAppliedAmount: app.totalAppliedAmount,
                                      safetyPeriodDays: app.safetyPeriodDays,
                                      applicationMethod: app.applicationMethod,
                                      targetPestOrPurpose: app.notes || '',
                                      responsibleAgronomist: app.responsibleAgronomist,
                                      agronomistLicense: app.agronomistLicense,
                                      weatherConditionsAtApp: `${app.weatherCondition?.temperatureC || 21}°C`,
                                      notes: app.notes || ''
                                    });
                                    setIsAgroModalOpen(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-sky-600 cursor-pointer"
                                  title="Editar aplicación"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAgroApps(prev => prev.filter(x => x.id !== app.id))}
                                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                  title="Eliminar aplicación"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] font-mono space-y-1">
                          <div className="flex justify-between text-slate-500">
                            <span>SENASA: <strong className="text-slate-800 dark:text-slate-200">{app.senasaRegisterNumber}</strong></span>
                            <span>Lote: <strong className="text-slate-800 dark:text-slate-200">{app.batchNumber}</strong></span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Dosis: <strong className="text-emerald-600">{app.dosagePerHa} {app.dosageUnit}</strong></span>
                            <span>Fecha: <strong>{app.date}</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Cámara en Vivo WebRTC para Bitácora Multimedia */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[180] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-emerald-400" />
                <h3 className="text-sm font-mono font-black uppercase">Cámara de Campo en Vivo ({plot.name})</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (cameraStreamRef.current) {
                    cameraStreamRef.current.getTracks().forEach(t => t.stop());
                    cameraStreamRef.current = null;
                  }
                  setIsCameraModalOpen(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-700/60 text-xs font-mono text-amber-200 space-y-3">
                <p>{cameraError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsCameraModalOpen(false);
                    fileInputMobileCameraRef.current?.click();
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold uppercase text-xs cursor-pointer"
                >
                  Abrir Cámara Nativa del Celular
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-800">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (cameraStreamRef.current) {
                        cameraStreamRef.current.getTracks().forEach(t => t.stop());
                        cameraStreamRef.current = null;
                      }
                      setIsCameraModalOpen(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-mono font-bold text-xs uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!videoRef.current) return;
                      const video = videoRef.current;
                      const canvas = document.createElement('canvas');
                      canvas.width = video.videoWidth || 1280;
                      canvas.height = video.videoHeight || 720;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
                        setNewLogPhoto(dataUrl);
                      }
                      if (cameraStreamRef.current) {
                        cameraStreamRef.current.getTracks().forEach(t => t.stop());
                        cameraStreamRef.current = null;
                      }
                      setIsCameraModalOpen(false);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase flex items-center gap-2 cursor-pointer"
                  >
                    <Camera size={14} />
                    <span>Capturar Fotografía</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Alta/Edición de Aplicación Fitosanitaria */}
      {isAgroModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-mono font-black uppercase text-slate-900 dark:text-white">
                {editingAgroId ? 'Editar Aplicación Fitosanitaria' : `Registrar Aplicación en ${plot.name}`}
              </h3>
              <button onClick={() => setIsAgroModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!agroForm.productName.trim()) return;
                const safetyDays = Number(agroForm.safetyPeriodDays) || 0;
                const appDateObj = new Date(`${agroForm.date}T12:00:00`);
                const harvestSafetyDate = new Date(appDateObj.getTime() + safetyDays * 86400000).toISOString().split('T')[0];
                const newApp: AgrochemicalApplication = {
                  id: editingAgroId || `agro-${Date.now()}`,
                  plotId: plot.id,
                  plotName: plot.name,
                  date: agroForm.date,
                  time: localClockData.shortTimeStr,
                  category: agroForm.category,
                  productName: agroForm.productName.trim(),
                  activeIngredient: agroForm.activeIngredient.trim() || 'Bioinsumo Agrícola',
                  manufacturer: 'Elaborador Homologado',
                  supplierName: 'Insumos Red HempC',
                  senasaRegisterNumber: agroForm.senasaRegisterNumber.trim() || 'SENASA S/N',
                  toxicologicalClass: 'Biológico / Orgánico Certificado',
                  dosagePerHa: Number(agroForm.dosagePerHa) || 1,
                  dosageUnit: agroForm.dosageUnit,
                  totalAppliedAmount: Number(agroForm.totalAppliedAmount) || 1,
                  applicationMethod: agroForm.applicationMethod,
                  batchNumber: agroForm.batchNumber.trim() || 'LOT-2026',
                  expirationDate: '2027-12-31',
                  senasaComplianceStatus: 'Conforme SENASA (Normativa VIGENTE)',
                  safetyPeriodDays: safetyDays,
                  harvestSafetyDate,
                  responsibleAgronomist: agroForm.responsibleAgronomist,
                  agronomistLicense: agroForm.agronomistLicense,
                  weatherCondition: {
                    temperatureC: stats.liveTemp,
                    windSpeedKmH: stats.liveWind,
                    relativeHumidityPct: stats.liveHum
                  },
                  notes: agroForm.notes,
                  status: new Date() < new Date(harvestSafetyDate) ? 'En Carencia' : 'Apto Cosecha'
                };
                setAgroApps(prev =>
                  editingAgroId ? prev.map(x => (x.id === editingAgroId ? newApp : x)) : [newApp, ...prev]
                );
                setIsAgroModalOpen(false);
                setEditingAgroId(null);
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Producto / Bioinsumo *</label>
                  <input
                    type="text"
                    required
                    value={agroForm.productName}
                    onChange={e => setAgroForm({ ...agroForm, productName: e.target.value })}
                    className={inputStyle}
                    placeholder="Ej: Trichoderma harzianum"
                  />
                </div>
                <div>
                  <label className={labelClass}>Principio Activo</label>
                  <input
                    type="text"
                    value={agroForm.activeIngredient}
                    onChange={e => setAgroForm({ ...agroForm, activeIngredient: e.target.value })}
                    className={inputStyle}
                    placeholder="Ej: Cepa TH-35"
                  />
                </div>
                <div>
                  <label className={labelClass}>Fecha de Aplicación</label>
                  <input
                    type="date"
                    required
                    value={agroForm.date}
                    onChange={e => setAgroForm({ ...agroForm, date: e.target.value })}
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass}>Registro SENASA N°</label>
                  <input
                    type="text"
                    value={agroForm.senasaRegisterNumber}
                    onChange={e => setAgroForm({ ...agroForm, senasaRegisterNumber: e.target.value })}
                    className={inputStyle}
                    placeholder="SENASA N°..."
                  />
                </div>
                <div>
                  <label className={labelClass}>Lote de Insumo</label>
                  <input
                    type="text"
                    value={agroForm.batchNumber}
                    onChange={e => setAgroForm({ ...agroForm, batchNumber: e.target.value })}
                    className={inputStyle}
                    placeholder="LOT-..."
                  />
                </div>
                <div>
                  <label className={labelClass}>Dosis ({agroForm.dosageUnit})</label>
                  <input
                    type="number"
                    step="0.1"
                    value={agroForm.dosagePerHa}
                    onChange={e => setAgroForm({ ...agroForm, dosagePerHa: Number(e.target.value) })}
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass}>Días de Carencia</label>
                  <input
                    type="number"
                    min="0"
                    value={agroForm.safetyPeriodDays}
                    onChange={e => setAgroForm({ ...agroForm, safetyPeriodDays: Number(e.target.value) })}
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass}>Ing. Agrónomo Responsable</label>
                  <input
                    type="text"
                    value={agroForm.responsibleAgronomist}
                    onChange={e => setAgroForm({ ...agroForm, responsibleAgronomist: e.target.value })}
                    className={inputStyle}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAgroModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono font-bold uppercase text-slate-500 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-mono font-bold text-xs uppercase cursor-pointer"
                >
                  Guardar en Cuaderno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODALES AUXILIARES (QR, PROTOCOLO ANEXO II, MUESTREO, ALERTA EMAIL)
      ===================================================================== */}
      {plot && (
        <PlotIdentificationModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          plot={plot}
          location={location}
          variety={variety}
          client={clients?.find(c => c.id === location?.clientId)}
          seedBatch={seedBatch}
        />
      )}

      <SeedingProtocolModal
        isOpen={isProtocolModalOpen}
        onClose={() => setIsProtocolModalOpen(false)}
      />

      {isRecordModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl max-w-5xl w-full p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-600 p-2.5 rounded-xl text-white">
                  <Activity size={20} />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black dark:text-white uppercase tracking-tight">
                    Planilla de Muestreo Fenológico & Ambiental ({plot.name})
                  </h2>
                  {isFetchingConditions && (
                    <div className="flex items-center text-[10px] font-mono font-bold text-sky-500 uppercase mt-0.5">
                      <Loader2 className="animate-spin mr-1.5" size={11} /> Sincronizando Clima y Fotoperiodo Local...
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-4">
                  <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center gap-1.5">
                    <Sun size={13} className="text-amber-500" /> Ambiente & Fotoperiodo Local
                  </h3>
                  <div>
                    <label className={labelClass}>Fecha de Muestreo</label>
                    <input
                      type="date"
                      required
                      disabled={isViewMode}
                      className={inputStyle}
                      value={recordForm.date}
                      onChange={e => {
                        setRecordForm({ ...recordForm, date: e.target.value });
                        if (!isViewMode) syncEnvironmentalData(e.target.value, data => setRecordForm(p => ({ ...p, ...data })));
                      }}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Hora Local (UTC-3)</label>
                    <input
                      type="time"
                      required
                      disabled={isViewMode}
                      className={inputStyle}
                      value={recordForm.time}
                      onChange={e => setRecordForm({ ...recordForm, time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fase Fisiológica</label>
                    <select
                      required
                      disabled={isViewMode}
                      className={inputStyle}
                      value={recordForm.stage}
                      onChange={e => setRecordForm({ ...recordForm, stage: e.target.value as any })}
                    >
                      <option value="Emergencia">Emergencia</option>
                      <option value="Vegetativo">Vegetativo</option>
                      <option value="Floración">Floración</option>
                      <option value="Maduración">Maduración</option>
                      <option value="Cosecha">Cosecha</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono tabular-nums">
                    <div className="bg-orange-500/10 border border-orange-500/20 p-2.5 rounded-xl text-center">
                      <p className="text-[9px] font-bold uppercase text-orange-600 dark:text-orange-400">Temp.</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{recordForm.temperature}°C</p>
                    </div>
                    <div className="bg-sky-500/10 border border-sky-500/20 p-2.5 rounded-xl text-center">
                      <p className="text-[9px] font-bold uppercase text-sky-600 dark:text-sky-400">Humedad</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{recordForm.humidity}%</p>
                    </div>
                  </div>
                  <div className="bg-slate-900 p-3.5 rounded-xl text-white text-center font-mono tabular-nums space-y-1">
                    <p className="text-[9px] uppercase text-slate-400">Fotoperiodo en Lote</p>
                    <p className="text-base font-black text-amber-400">{formatDecimalHoursToHM(recordForm.lightHours)}</p>
                    <p className="text-[10px] text-slate-300">Luna: {recordForm.lunarPhase || 'Creciente'}</p>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-5">
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <h3 className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Target size={13} /> Biometría & Escala Fenotípica (1-9)
                      </h3>
                    </div>
                    <div>
                      <label className={labelClass}>Población (Plantas/m²)</label>
                      <input
                        type="number"
                        step="0.1"
                        disabled={isViewMode}
                        className={inputStyle}
                        value={recordForm.plantsPerMeter}
                        onChange={e => setRecordForm({ ...recordForm, plantsPerMeter: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Altura Media de Planta (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        disabled={isViewMode}
                        className={inputStyle}
                        value={recordForm.plantHeight}
                        onChange={e => setRecordForm({ ...recordForm, plantHeight: Number(e.target.value) })}
                      />
                    </div>
                    <ScaleSelect label="Vigor Vegetativo (1-9)" value={recordForm.vigor} onChange={(v: number) => setRecordForm({ ...recordForm, vigor: v })} disabled={isViewMode} />
                    <ScaleSelect label="Uniformidad de Lote (1-9)" value={recordForm.uniformity} onChange={(v: number) => setRecordForm({ ...recordForm, uniformity: v })} disabled={isViewMode} />
                    <ScaleSelect label="Resistencia Vuelco (1-9)" value={recordForm.lodging} onChange={(v: number) => setRecordForm({ ...recordForm, lodging: v })} disabled={isViewMode} />
                    <ScaleSelect label="Incidencia Aves (1-9)" value={recordForm.birdDamage} onChange={(v: number) => setRecordForm({ ...recordForm, birdDamage: v })} disabled={isViewMode} />
                  </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-2xl text-white space-y-4">
                  <h3 className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
                    <FlaskConical size={13} /> Rendimiento & Semilla
                  </h3>
                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">Fecha Floración (50%)</label>
                    <input
                      type="date"
                      disabled={isViewMode}
                      className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-white"
                      value={recordForm.floweringDate}
                      onChange={e => setRecordForm({ ...recordForm, floweringDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">Rendimiento Grano (g/m²)</label>
                    <input
                      type="number"
                      disabled={isViewMode}
                      className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-white"
                      value={recordForm.seedYield}
                      onChange={e => setRecordForm({ ...recordForm, seedYield: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">Peso Biomasa Tallo (g/m²)</label>
                    <input
                      type="number"
                      disabled={isViewMode}
                      className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-white"
                      value={recordForm.stemWeight}
                      onChange={e => setRecordForm({ ...recordForm, stemWeight: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {!isViewMode && (
                <button
                  type="submit"
                  disabled={isSaving || isFetchingConditions}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  <span>Guardar Muestreo en Ficha Técnica</span>
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {previewPhoto && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <img src={previewPhoto} className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" />
        </div>
      )}

      {emailAlertToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md">
          <div className="p-4 rounded-2xl border bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 text-emerald-900 dark:text-emerald-200 shadow-2xl flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-mono font-black uppercase">Alerta Agronómica Despachada</p>
              <p className="text-xs mt-0.5">{emailAlertToast.message}</p>
              <p className="text-[10px] font-mono mt-0.5 opacity-75">Destino: {emailAlertToast.sentTo}</p>
            </div>
            <button onClick={() => setEmailAlertToast(null)} className="p-1 opacity-60 hover:opacity-100 cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {showEmailAlertModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => setShowEmailAlertModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="bg-rose-600 text-white p-2.5 rounded-xl">
                <Mail size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Despachar Alerta Agronómica
                </h3>
                <p className="text-[10px] font-mono text-slate-400 uppercase">
                  Notificación oficial vía notificaciones@hempc.com.ar
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className={labelClass}>Destinatario (Nombre) *</label>
                <input
                  type="text"
                  value={alertRecipientName}
                  onChange={e => setAlertRecipientName(e.target.value)}
                  className={inputStyle}
                />
              </div>
              <div>
                <label className={labelClass}>Correo Electrónico Destino *</label>
                <input
                  type="email"
                  value={alertRecipientEmail}
                  onChange={e => setAlertRecipientEmail(e.target.value)}
                  className={inputStyle}
                />
              </div>
              <div>
                <label className={labelClass}>Asunto de la Alerta *</label>
                <input
                  type="text"
                  value={alertTitle}
                  onChange={e => setAlertTitle(e.target.value)}
                  className={inputStyle}
                />
              </div>
              <div>
                <label className={labelClass}>Detalles Técnicos & Recomendación</label>
                <textarea
                  rows={3}
                  value={alertDetails}
                  onChange={e => setAlertDetails(e.target.value)}
                  className={inputStyle}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEmailAlertModal(false)}
                  className="px-4 py-2 text-slate-500 font-mono font-bold uppercase text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSendingAlertEmail || !alertRecipientEmail.trim()}
                  onClick={handleSendPlotAlertEmail}
                  className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSendingAlertEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Enviar Alerta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ScaleSelect = ({ label, value, onChange, disabled }: any) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <span className="text-xs font-mono font-black text-emerald-600">{value || '-'}</span>
    </div>
    <div className="grid grid-cols-9 gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`py-1.5 rounded-lg text-[10px] font-mono font-black transition-all cursor-pointer ${
            value === n
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  </div>
);
