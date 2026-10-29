import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  TrialRecord,
  Plot,
  Location,
  FieldLog,
  HydricRecord,
  Task,
  AgriculturalLaborType,
  HempStageId
} from '../types';
import {
  FlaskConical,
  Save,
  Calendar,
  Activity,
  Ruler,
  Thermometer,
  Droplets,
  ArrowRight,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Leaf,
  History,
  TrendingUp,
  Sun,
  Moon,
  Target,
  AlertCircle,
  Loader2,
  ExternalLink,
  Filter,
  Search,
  Check,
  Sprout,
  ChevronLeft,
  Edit2,
  Trash2,
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  CloudRain,
  Tractor,
  Wrench,
  RefreshCw,
  Layers,
  Eye
} from 'lucide-react';

const fastUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const calculateLunarPhase = (dateStr: string) => {
  const date = new Date(dateStr + 'T12:00:00');
  const cycle = 29.53058867;
  const knownNewMoon = new Date('2024-01-11T11:57:00Z').getTime();
  const diff = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
  const pos = ((diff % cycle) + cycle) % cycle / cycle;
  if (pos < 0.06 || pos >= 0.94) return 'Nueva';
  if (pos < 0.44) return 'Creciente';
  if (pos < 0.56) return 'Llena';
  return 'Menguante';
};

// Compresión cliente para fotografías de bitácora tomadas desde cámara móvil o escritorio
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

const QUICK_LABOR_PRESETS: Array<{
  label: string;
  laborType: AgriculturalLaborType;
  title: string;
  description: string;
  tractor: string;
  implement: string;
  stage: HempStageId;
}> = [
  {
    label: 'Preparación de Suelo (Cincel + Rastra)',
    laborType: 'PREPARACION_SUELO',
    title: 'Cincelado profundo + Rastra de disco (Cama de siembra)',
    description: 'Roturación vertical a 30 cm, desterronado superficial y refinado de cama de siembra.',
    tractor: 'Tractor John Deere 5090E (90 HP)',
    implement: 'Cincel 7 púas + Rastra excéntrica',
    stage: 'BBCH_00_09'
  },
  {
    label: 'Nivelación y Rolado Pre-Siembra',
    laborType: 'PREPARACION_SUELO',
    title: 'Nivelación láser y rolado de compactación superficial',
    description: 'Acondicionamiento de micro-relieve para uniformidad de riego y profundidad de semilla.',
    tractor: 'Tractor Pauny 210A',
    implement: 'Rolo compactador + Niveladora',
    stage: 'BBCH_00_09'
  },
  {
    label: 'Desmalezado Mecánico / Escardillo',
    laborType: 'LABOR_CULTURAL',
    title: 'Control mecánico de malezas en entrelínea y aporque',
    description: 'Escardillado superficial entre hileras para oxigenación radicular y supresión de competencia.',
    tractor: 'Tractor Kubota B2420',
    implement: 'Escardillo cultivador de 5 cuerpos',
    stage: 'BBCH_20_39'
  },
  {
    label: 'Fertirriego / Enmienda Orgánica',
    laborType: 'FERTIRRIEGO',
    title: 'Inyección de bioestimulante radicular y nitrógeno asimilable',
    description: 'Aplicación fraccionada en línea de goteo durante elongación vegetativa.',
    tractor: 'Cabezal Venturi Automatizado',
    implement: 'Sistema de Goteo Compensado',
    stage: 'BBCH_20_39'
  },
  {
    label: 'Inspección y Sexado / Roguing',
    laborType: 'MONITOREO',
    title: 'Recorrida de depuración varietal (Roguing) e inducción floral',
    description: 'Eliminación de plantas fuera de tipo y verificación de fotoperiodo crítico.',
    tractor: 'Cuadrilla Técnica de Campo',
    implement: 'Instrumental de Muestreo GACP',
    stage: 'BBCH_50_59'
  }
];

export default function TrialManager() {
  const {
    plots,
    trialRecords,
    addTrialRecord,
    updateTrialRecord,
    deleteTrialRecord,
    currentUser,
    locations,
    varieties,
    logs,
    addLog,
    deleteLog,
    hydricRecords,
    addHydricRecord,
    deleteHydricRecord,
    tasks,
    addTask,
    deleteTask,
    updatePlotPhenology,
    syncAllPlotsContinuousRainfall,
    isSyncingGlobalRainfall
  } = useAppContext();

  const [selectedPlotId, setSelectedPlotId] = useState<string>('');
  const [justSaved, setJustSaved] = useState(false);
  const [saveSummaryBanner, setSaveSummaryBanner] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingConditions, setIsFetchingConditions] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'trials' | 'logs' | 'hydric' | 'labors'>('all');
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Filtros avanzados de la Cola de Recorrida
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [varietyFilter, setVarietyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Ensayo' | 'Producción'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'urgent' | 'uptodate'>('all');

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [confirmDeleteRecordId, setConfirmDeleteRecordId] = useState<string | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // ============================================================================
  // ESTADOS DE LOS 3 ATAJOS OPERATIVOS DE CAMPO (SINCRONIZADOS CON PLOTDETAILS)
  // ============================================================================
  const [activeShortcutTab, setActiveShortcutTab] = useState<'photo_log' | 'hydric' | 'labor'>('photo_log');

  // Atajo 1: Bitácora Multimedia & Toma Fotográfica In-Situ
  const [quickLogNote, setQuickLogNote] = useState('');
  const [quickLogPhoto, setQuickLogPhoto] = useState('');
  const [autoAttachBiometricsToLog, setAutoAttachBiometricsToLog] = useState(true);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSavingQuickLog, setIsSavingQuickLog] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement | null>(null);
  const fileInputMobileCamRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Atajo 2: Pluviómetro Físico & Riego Suplementario
  const [quickHydricType, setQuickHydricType] = useState<'Riego' | 'Lluvia'>('Riego');
  const [quickHydricMm, setQuickHydricMm] = useState<string>('');
  const [quickHydricStartTime, setQuickHydricStartTime] = useState<string>('08:00');
  const [quickHydricEndTime, setQuickHydricEndTime] = useState<string>('10:00');
  const [quickHydricNotes, setQuickHydricNotes] = useState<string>('Riego por goteo suplementario verificado en recorrida');
  const [isSavingQuickHydric, setIsSavingQuickHydric] = useState(false);

  // Atajo 3: Labores Culturales & Preparación de Suelo
  const [quickLaborType, setQuickLaborType] = useState<AgriculturalLaborType>('PREPARACION_SUELO');
  const [quickLaborTitle, setQuickLaborTitle] = useState<string>('');
  const [quickLaborDescription, setQuickLaborDescription] = useState<string>('');
  const [quickLaborTractor, setQuickLaborTractor] = useState<string>('Tractor John Deere 5090E (90 HP)');
  const [quickLaborImplement, setQuickLaborImplement] = useState<string>('Cincel 7 púas + Rastra excéntrica');
  const [quickLaborStatus, setQuickLaborStatus] = useState<Task['status']>('Completada');
  const [quickLaborApplyBlock, setQuickLaborApplyBlock] = useState<boolean>(false);
  const [isSavingQuickLabor, setIsSavingQuickLabor] = useState(false);

  // Valores predeterminados oficiales idénticos a la ficha técnica "Informe periódico Nucleus Trace"
  const [formData, setFormData] = useState<Partial<TrialRecord>>({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    stage: 'Vegetativo',
    temperature: 11,
    humidity: 85,
    lightHours: 13.17,
    lunarPhase: 'Nueva',
    plantsPerMeter: 0,
    plantHeight: 0,
    vigor: 9,
    uniformity: 9,
    lodging: 1,
    birdDamage: 1,
    diseasesScore: 1,
    pestsScore: 1,
    floweringDate: '',
    seedYield: 0,
    stemWeight: 0,
    seedQualityGermination: 90,
    seedQualityNonConformity: 0
  });

  // 1. COLA DE TRABAJO INTELIGENTE CON DATOS COTEJADOS DE CADA PARCELA
  const plotQueue = useMemo(() => {
    const active = plots.filter(p => p.status === 'Activa');

    const mapped = active
      .map(p => {
        const pRecords = trialRecords.filter(r => r.plotId === p.id);
        pRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const lastRecord = pRecords[0];
        const lastDate = lastRecord ? new Date(lastRecord.date).getTime() : 0;
        const daysSince = lastRecord ? Math.floor((Date.now() - lastDate) / (1000 * 60 * 60 * 24)) : 999;
        const loc = locations.find(l => l.id === p.locationId);
        const varObj = varieties.find(v => v.id === p.varietyId);

        // Cotejo Hídrico de la parcela (desde fecha de siembra)
        const sowDateIso = p.sowingDate || '2025-09-01';
        const pHydric = hydricRecords.filter(
          r => (r.plotId === p.id || (r.locationId === p.locationId && !r.plotId)) && r.date >= sowDateIso
        );
        const rainMm = Number(
          pHydric
            .filter(r => r.type === 'Lluvia')
            .reduce((s, r) => s + Number(r.amountMm || 0), 0)
            .toFixed(1)
        );
        const irrigMm = Number(
          pHydric
            .filter(r => r.type === 'Riego')
            .reduce((s, r) => s + Number(r.amountMm || 0), 0)
            .toFixed(1)
        );
        const totalWaterMm = Number((rainMm + irrigMm).toFixed(1));

        // Cotejo Bitácora Multimedia y Labores
        const pLogs = logs.filter(l => l.plotId === p.id);
        const pTasks = tasks.filter(t => t.plotId === p.id);
        const soilPrepCount = pTasks.filter(
          t => t.laborType === 'PREPARACION_SUELO' || t.laborType === 'SIEMBRA'
        ).length;

        return {
          plot: p,
          lastRecord,
          daysSince,
          locationName: loc?.name || 'S/D',
          varietyName: varObj?.name || 'S/D',
          location: loc,
          rainMm,
          irrigMm,
          totalWaterMm,
          logsCount: pLogs.length,
          photosCount: pLogs.filter(l => Boolean(l.photoUrl)).length,
          tasksCount: pTasks.length,
          soilPrepCount
        };
      })
      .sort((a, b) => b.daysSince - a.daysSince);

    return mapped.filter(item => {
      if (locationFilter !== 'all' && item.plot.locationId !== locationFilter) return false;
      if (varietyFilter !== 'all' && item.plot.varietyId !== varietyFilter) return false;
      if (typeFilter !== 'all' && item.plot.type !== typeFilter) return false;
      if (urgencyFilter === 'urgent' && item.daysSince <= 7) return false;
      if (urgencyFilter === 'uptodate' && item.daysSince > 7) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.plot.name.toLowerCase().includes(q) ||
          item.locationName.toLowerCase().includes(q) ||
          item.varietyName.toLowerCase().includes(q) ||
          (item.plot.block || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    plots,
    trialRecords,
    locations,
    varieties,
    hydricRecords,
    logs,
    tasks,
    locationFilter,
    varietyFilter,
    typeFilter,
    urgencyFilter,
    searchQuery
  ]);

  const currentPlotData = useMemo(
    () => plotQueue.find(item => item.plot.id === selectedPlotId) || plotQueue[0],
    [plotQueue, selectedPlotId]
  );
  const variety = varieties.find(v => v.id === currentPlotData?.plot.varietyId);

  // Datos cotejados completos de la parcela actualmente seleccionada
  const plotHistory = useMemo(() => {
    if (!currentPlotData) return [];
    return trialRecords
      .filter(r => r.plotId === currentPlotData.plot.id)
      .sort(
        (a, b) =>
          new Date(b.date + (b.time ? 'T' + b.time : '')).getTime() -
          new Date(a.date + (a.time ? 'T' + a.time : '')).getTime()
      );
  }, [trialRecords, currentPlotData]);

  const currentPlotLogs = useMemo(() => {
    if (!currentPlotData) return [];
    return logs
      .filter(l => l.plotId === currentPlotData.plot.id)
      .sort(
        (a, b) =>
          new Date(b.date + (b.time ? 'T' + b.time : '')).getTime() -
          new Date(a.date + (a.time ? 'T' + a.time : '')).getTime()
      );
  }, [logs, currentPlotData]);

  const currentPlotHydric = useMemo(() => {
    if (!currentPlotData) return [];
    const sowDateIso = currentPlotData.plot.sowingDate || '2025-09-01';
    return hydricRecords
      .filter(
        r =>
          (r.plotId === currentPlotData.plot.id ||
            (r.locationId === currentPlotData.plot.locationId && !r.plotId)) &&
          r.date >= sowDateIso
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [hydricRecords, currentPlotData]);

  const currentPlotTasks = useMemo(() => {
    if (!currentPlotData) return [];
    return tasks
      .filter(t => t.plotId === currentPlotData.plot.id)
      .sort((a, b) => (b.executionDate || b.dueDate || '').localeCompare(a.executionDate || a.dueDate || ''));
  }, [tasks, currentPlotData]);

  // Cálculos agronómicos de superficie y días desde siembra (DDS)
  const currentPlotMetrics = useMemo(() => {
    if (!currentPlotData) {
      return { dds: 0, areaM2: 0, areaHa: 0, waterNeedMm: 480, waterPct: 0, totalVolumeM3: 0, totalLiters: 0 };
    }
    const p = currentPlotData.plot;
    const sowTime = p.sowingDate ? new Date(p.sowingDate + 'T12:00:00').getTime() : Date.now();
    const dds = Math.max(0, Math.floor((Date.now() - sowTime) / (1000 * 60 * 60 * 24)));

    const rawSurface = Number(p.surfaceArea || 1);
    const areaM2 =
      p.surfaceUnit === 'm2' ? rawSurface : p.surfaceUnit === 'ac' ? rawSurface * 4046.86 : rawSurface * 10000;
    const areaHa = Number((areaM2 / 10000).toFixed(4));
    const waterNeedMm = variety?.waterNeedMm || 480;
    const waterPct = Math.min(100, Math.round((currentPlotData.totalWaterMm / Math.max(1, waterNeedMm)) * 100));
    const totalLiters = Math.round(currentPlotData.totalWaterMm * areaM2);
    const totalVolumeM3 = Number(((currentPlotData.totalWaterMm * areaM2) / 1000).toFixed(2));

    return { dds, areaM2, areaHa, waterNeedMm, waterPct, totalVolumeM3, totalLiters };
  }, [currentPlotData, variety]);

  // Auto-seleccionar el primero si no hay selección
  useEffect(() => {
    if (!selectedPlotId && plotQueue.length > 0) {
      setSelectedPlotId(plotQueue[0].plot.id);
    }
  }, [plotQueue.length, selectedPlotId]);

  // Limpiar cámara al desmontar
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Sincronización ambiental con Open-Meteo y Sunrise-Sunset (Red GFS)
  const syncEnvironmentalData = async (targetDate: string, plotLocation?: Location) => {
    setIsFetchingConditions(true);
    try {
      const lat = plotLocation?.coordinates?.lat || -38.95;
      const lng = plotLocation?.coordinates?.lng || -68.05;
      const isToday = targetDate === new Date().toISOString().split('T')[0];
      let temp = 11;
      let hum = 85;

      if (isToday) {
        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m&timezone=auto`
        );
        const wData = await wRes.json();
        if (wData.current) {
          temp = Math.round(wData.current.temperature_2m ?? 11);
          hum = Math.round(wData.current.relative_humidity_2m ?? 85);
        }
      } else {
        const wRes = await fetch(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${targetDate}&end_date=${targetDate}&hourly=temperature_2m,relative_humidity_2m&timezone=auto`
        );
        const wData = await wRes.json();
        if (wData.hourly && wData.hourly.temperature_2m?.length) {
          temp = Math.round(
            wData.hourly.temperature_2m.reduce((a: number, b: number) => a + b, 0) /
              wData.hourly.temperature_2m.length
          );
          hum = Math.round(
            wData.hourly.relative_humidity_2m.reduce((a: number, b: number) => a + b, 0) /
              wData.hourly.relative_humidity_2m.length
          );
        }
      }
      const aRes = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${targetDate}&formatted=0`);
      const aData = await aRes.json();
      const lunar = calculateLunarPhase(targetDate);
      const hours = aData.results ? parseFloat((aData.results.day_length / 3600).toFixed(2)) : 13.17;

      setFormData(p => ({
        ...p,
        temperature: temp,
        humidity: hum,
        lightHours: hours,
        lunarPhase: lunar
      }));
    } catch (err) {
      console.error('Sync Error:', err);
      const lunar = calculateLunarPhase(targetDate);
      setFormData(p => ({
        ...p,
        lunarPhase: lunar,
        lightHours: p.lightHours || 13.17
      }));
    } finally {
      setIsFetchingConditions(false);
    }
  };

  // Pre-cargar datos lógicos al cambiar de parcela seleccionada
  useEffect(() => {
    if (currentPlotData) {
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const last = currentPlotData.lastRecord;

      setFormData({
        date: today,
        time: nowTime,
        stage: last?.stage || 'Vegetativo',
        plantHeight: last?.plantHeight || 0,
        plantsPerMeter: last?.plantsPerMeter || 0,
        temperature: 11,
        humidity: 85,
        lightHours: 13.17,
        lunarPhase: calculateLunarPhase(today),
        vigor: 9,
        uniformity: 9,
        lodging: 1,
        birdDamage: 1,
        diseasesScore: 1,
        pestsScore: 1,
        floweringDate: last?.floweringDate || '',
        seedYield: last?.seedYield || 0,
        stemWeight: last?.stemWeight || 0,
        seedQualityGermination: 90,
        seedQualityNonConformity: 0
      });

      setEditingRecordId(null);
      syncEnvironmentalData(today, currentPlotData.location);
    }
  }, [currentPlotData?.plot.id]);

  // ============================================================================
  // MANEJADORES DE CÁMARA Y BITÁCORA MULTIMEDIA IN-SITU
  // ============================================================================
  const handleSelectPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImage(true);
    try {
      const compressed = await compressImageFileToDataUrl(file);
      setQuickLogPhoto(compressed);
    } catch (err: any) {
      alert('No se pudo procesar la fotografía: ' + (err.message || err));
    } finally {
      setIsProcessingImage(false);
      e.target.value = '';
    }
  };

  const startWebCamera = async () => {
    setCameraError(null);
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      setCameraError(
        'No se pudo acceder a la cámara directa del navegador. Utilice el botón "Cámara Móvil / Archivo" para capturar la foto.'
      );
    }
  };

  const stopWebCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const captureWebCameraFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
      setQuickLogPhoto(dataUrl);
    }
    stopWebCamera();
  };

  // Guardar entrada directa en Bitácora Multimedia (`field_logs`)
  const handleQuickSaveLogOnly = async () => {
    if (!currentPlotData?.plot.id) return;
    if (!quickLogNote.trim() && !quickLogPhoto) {
      alert('Ingrese una observación técnica o tome una fotografía para registrar en la Bitácora.');
      return;
    }
    setIsSavingQuickLog(true);
    try {
      const biometricPrefix = autoAttachBiometricsToLog
        ? `[Monitoreo ${formData.stage || 'Vegetativo'} | Alt: ${formData.plantHeight || 0}cm | Pob: ${formData.plantsPerMeter || 0} pl/m² | Vigor: ${formData.vigor || 9}/9] `
        : '';
      const finalNote = `${biometricPrefix}${quickLogNote.trim() || 'Evidencia fotográfica de relevamiento en lote.'}`.trim();

      const ok = await addLog({
        id: fastUUID(),
        plotId: currentPlotData.plot.id,
        date: formData.date || new Date().toISOString().split('T')[0],
        time: formData.time || new Date().toTimeString().slice(0, 5),
        note: finalNote,
        photoUrl: quickLogPhoto || undefined
      });

      if (ok) {
        setQuickLogNote('');
        setQuickLogPhoto('');
        setSaveSummaryBanner('✓ Evidencia guardada en la Bitácora Multimedia de la parcela.');
        setTimeout(() => setSaveSummaryBanner(null), 3500);
      }
    } finally {
      setIsSavingQuickLog(false);
    }
  };

  // Guardar registro directo de Pluviómetro / Riego (`hydric_records`)
  const handleQuickSaveHydricOnly = async () => {
    if (!currentPlotData?.plot.id) return;
    const mm = parseFloat(quickHydricMm);
    if (isNaN(mm) || mm <= 0) {
      alert('Ingrese una lámina válida en milímetros (mm > 0).');
      return;
    }
    setIsSavingQuickHydric(true);
    try {
      const ok = await addHydricRecord({
        id: fastUUID(),
        locationId: currentPlotData.plot.locationId,
        plotId: currentPlotData.plot.id,
        date: formData.date || new Date().toISOString().split('T')[0],
        time: quickHydricStartTime || formData.time,
        endTime: quickHydricType === 'Riego' ? quickHydricEndTime : undefined,
        type: quickHydricType,
        amountMm: Number(mm.toFixed(1)),
        notes:
          quickHydricNotes.trim() ||
          `${quickHydricType} registrado desde Monitoreo Rápido en parcela ${currentPlotData.plot.name}`,
        createdBy: currentUser?.name || 'Técnico Nucleus'
      });

      if (ok) {
        setQuickHydricMm('');
        setSaveSummaryBanner(
          `✓ ${quickHydricType} de ${mm.toFixed(1)} mm (${(mm * 10).toFixed(1)} m³/ha) registrado en el Balance Hídrico de ${currentPlotData.plot.name}.`
        );
        setTimeout(() => setSaveSummaryBanner(null), 3500);
      }
    } finally {
      setIsSavingQuickHydric(false);
    }
  };

  // Guardar registro directo de Labor Cultural / Preparación de Suelo (`tasks`)
  const handleQuickSaveLaborOnly = async () => {
    if (!currentPlotData?.plot.id) return;
    if (!quickLaborTitle.trim()) {
      alert('Ingrese o seleccione una plantilla para el título de la labor agrícola.');
      return;
    }
    setIsSavingQuickLabor(true);
    try {
      const targetPlots = quickLaborApplyBlock
        ? plots.filter(
            p =>
              p.status === 'Activa' &&
              p.locationId === currentPlotData.plot.locationId &&
              (!currentPlotData.plot.block || p.block === currentPlotData.plot.block)
          )
        : [currentPlotData.plot];

      for (const pl of targetPlots) {
        await addTask({
          id: fastUUID(),
          title: quickLaborTitle.trim(),
          description:
            quickLaborDescription.trim() ||
            `Labor registrada durante relevamiento agronómico en ${pl.name}.`,
          status: quickLaborStatus,
          priority: 'Alta',
          assignedToIds: currentUser?.id ? [currentUser.id] : ['1'],
          dueDate: formData.date || new Date().toISOString().split('T')[0],
          executionDate: formData.date || new Date().toISOString().split('T')[0],
          plotId: pl.id,
          createdBy: currentUser?.id || '1',
          laborType: quickLaborType,
          targetStage: pl.currentPhenologicalStage || 'BBCH_10_19',
          operator: currentUser?.name || 'Equipo Técnico',
          machinery: {
            tractor: quickLaborTractor,
            implement: quickLaborImplement
          }
        });
      }

      setQuickLaborTitle('');
      setQuickLaborDescription('');
      setSaveSummaryBanner(
        `✓ Labor "${quickLaborType}" asentada en ${targetPlots.length} parcela(s) (${targetPlots.map(p => p.name).slice(0, 3).join(', ')}).`
      );
      setTimeout(() => setSaveSummaryBanner(null), 3500);
    } finally {
      setIsSavingQuickLabor(false);
    }
  };

  const handleEditRecord = (record: TrialRecord) => {
    setEditingRecordId(record.id);
    setFormData({
      ...record
    });
    setActiveTab('form');
  };

  // ============================================================================
  // SELLADO INTEGRAL: GUARDA INFORME BIOMÉTRICO + ATAJOS PENDIENTES EN 1 CLIC
  // ============================================================================
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlotData?.plot.id) return;

    setIsSaving(true);
    const recordId =
      editingRecordId || ((window.crypto as any)?.randomUUID ? (window.crypto as any).randomUUID() : fastUUID());

    try {
      const payload: TrialRecord = {
        ...formData,
        id: recordId,
        plotId: currentPlotData.plot.id,
        createdBy: formData.createdBy || currentUser?.id,
        createdByName: formData.createdByName || currentUser?.name
      } as TrialRecord;

      const success = editingRecordId ? await updateTrialRecord(payload) : await addTrialRecord(payload);

      const extraSaved: string[] = [];

      // 1. Si el técnico adjuntó foto o nota en el Atajo de Bitácora, guardarla automáticamente en `field_logs`
      if (success && (quickLogPhoto || quickLogNote.trim())) {
        const biometricPrefix = autoAttachBiometricsToLog
          ? `[Monitoreo ${formData.stage || 'Vegetativo'} | Alt: ${formData.plantHeight || 0}cm | Pob: ${formData.plantsPerMeter || 0} pl/m² | Vigor: ${formData.vigor || 9}/9] `
          : '';
        await addLog({
          id: fastUUID(),
          plotId: currentPlotData.plot.id,
          date: formData.date || new Date().toISOString().split('T')[0],
          time: formData.time || new Date().toTimeString().slice(0, 5),
          note: `${biometricPrefix}${quickLogNote.trim() || 'Registro fotográfico de monitoreo.'}`.trim(),
          photoUrl: quickLogPhoto || undefined
        });
        setQuickLogNote('');
        setQuickLogPhoto('');
        extraSaved.push('Bitácora Multimedia');
      }

      // 2. Si el técnico ingresó milímetros en el Atajo de Pluviómetro/Riego, guardarlo en `hydric_records`
      const pendingMm = parseFloat(quickHydricMm);
      if (success && !isNaN(pendingMm) && pendingMm > 0) {
        await addHydricRecord({
          id: fastUUID(),
          locationId: currentPlotData.plot.locationId,
          plotId: currentPlotData.plot.id,
          date: formData.date || new Date().toISOString().split('T')[0],
          time: quickHydricStartTime || formData.time,
          endTime: quickHydricType === 'Riego' ? quickHydricEndTime : undefined,
          type: quickHydricType,
          amountMm: Number(pendingMm.toFixed(1)),
          notes:
            quickHydricNotes.trim() ||
            `${quickHydricType} asentado junto al Informe Nucleus Trace (${currentPlotData.plot.name})`,
          createdBy: currentUser?.name || 'Técnico Nucleus'
        });
        setQuickHydricMm('');
        extraSaved.push(`${quickHydricType} (${pendingMm.toFixed(1)} mm)`);
      }

      // 3. Si el técnico dejó cargada una Labor Cultural / Preparación de Suelo, guardarla en `tasks`
      if (success && quickLaborTitle.trim()) {
        await addTask({
          id: fastUUID(),
          title: quickLaborTitle.trim(),
          description:
            quickLaborDescription.trim() ||
            `Labor verificada durante monitoreo en ${currentPlotData.plot.name}.`,
          status: quickLaborStatus,
          priority: 'Alta',
          assignedToIds: currentUser?.id ? [currentUser.id] : ['1'],
          dueDate: formData.date || new Date().toISOString().split('T')[0],
          executionDate: formData.date || new Date().toISOString().split('T')[0],
          plotId: currentPlotData.plot.id,
          createdBy: currentUser?.id || '1',
          laborType: quickLaborType,
          targetStage: currentPlotData.plot.currentPhenologicalStage || 'BBCH_10_19',
          operator: currentUser?.name || 'Equipo Técnico',
          machinery: {
            tractor: quickLaborTractor,
            implement: quickLaborImplement
          }
        });
        setQuickLaborTitle('');
        setQuickLaborDescription('');
        extraSaved.push(`Labor (${quickLaborType})`);
      }

      if (success) {
        setJustSaved(true);
        setSaveSummaryBanner(
          extraSaved.length > 0
            ? `✓ Sellado Integral en ${currentPlotData.plot.name}: Informe Biométrico + ${extraSaved.join(' + ')}`
            : `✓ Informe Periódico Nucleus Trace sellado en ${currentPlotData.plot.name}`
        );
        const wasEditing = Boolean(editingRecordId);
        setEditingRecordId(null);
        setTimeout(() => {
          setJustSaved(false);
          if (wasEditing) {
            setActiveTab('history');
          } else if (autoAdvance) {
            const currentIndex = plotQueue.findIndex(p => p.plot.id === currentPlotData.plot.id);
            if (currentIndex < plotQueue.length - 1) {
              setSelectedPlotId(plotQueue[currentIndex + 1].plot.id);
            }
          }
        }, 900);
        setTimeout(() => setSaveSummaryBanner(null), 4500);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const GrowthIndicator = ({ current, previous }: { current: number; previous: number }) => {
    if (!previous) return <span className="text-gray-400 text-[10px]">Sin dato previo</span>;
    const diff = Number((current - previous).toFixed(1));
    if (diff > 0)
      return (
        <span className="text-emerald-500 text-[10px] font-bold flex items-center">
          +{diff} cm <TrendingUp size={12} className="ml-1" />
        </span>
      );
    if (diff < 0)
      return (
        <span className="text-red-500 text-[10px] font-bold flex items-center">
          {diff} cm <AlertTriangle size={12} className="ml-1" />
        </span>
      );
    return <span className="text-gray-400 text-[10px] font-bold">Sin variación</span>;
  };

  const inputStyle =
    'w-full border border-gray-200 dark:border-slate-700 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm dark:text-white';
  const labelClass = 'text-[10px] font-black uppercase mb-1.5 block text-gray-400 tracking-widest';

  const ScaleSelect = ({
    label,
    value,
    onChange,
    disabled
  }: {
    label: string;
    value?: number;
    onChange: (v: number) => void;
    disabled?: boolean;
  }) => (
    <div>
      <label className={labelClass}>{label}</label>
      <select
        disabled={disabled}
        className={inputStyle}
        value={value ?? 1}
        onChange={e => onChange(Number(e.target.value))}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 min-h-[calc(100vh-140px)] flex flex-col space-y-5 pb-12">
      {/* HEADER DE LA SECCIÓN */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-600 p-3.5 rounded-2xl text-white shadow-lg shadow-emerald-600/20">
            <ClipboardList size={28} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter italic">
                Monitoreo <span className="text-emerald-600">Agronómico 360°</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase">
                Atajo Unificado de Recorrida
              </span>
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              Relevamiento biométrico + Bitácora Fotográfica + Pluviómetro/Riego + Labores de Suelo • Sincronizado en vivo con Parcelas
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-4 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border dark:border-slate-800 shadow-sm">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">En Cola</p>
              <p className="text-lg font-black text-slate-800 dark:text-white leading-none">{plotQueue.length}</p>
            </div>
            <div className="h-7 w-px bg-slate-200 dark:bg-slate-700"></div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Urgentes (+7d)</p>
              <p className="text-lg font-black text-red-500 leading-none">
                {plotQueue.filter(p => p.daysSince > 7).length}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => syncAllPlotsContinuousRainfall(true)}
            disabled={isSyncingGlobalRainfall}
            className="bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            title="Sincronizar lluvias satelitales Open-Meteo ERA5 en todos los establecimientos"
          >
            <RefreshCw size={13} className={isSyncingGlobalRainfall ? 'animate-spin' : ''} />
            <span>{isSyncingGlobalRainfall ? 'Sincronizando...' : 'Sincronizar Lluvias'}</span>
          </button>

          {currentPlotData && (
            <Link
              to={`/plots/${currentPlotData.plot.id}`}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 border dark:border-slate-700 shadow-sm"
              title="Abrir Ficha Técnica completa de la parcela seleccionada"
            >
              <ExternalLink size={14} /> Ficha Completa de Parcela
            </Link>
          )}
        </div>
      </div>

      {/* BANNER DE CONFIRMACIÓN DE GUARDADO / SELLADO INTEGRAL */}
      {saveSummaryBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-mono font-bold flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{saveSummaryBanner}</span>
          </div>
          <button type="button" onClick={() => setSaveSummaryBanner(null)} className="p-1 hover:bg-white/10 rounded-lg">
            <X size={14} />
          </button>
        </div>
      )}

      {/* GRID PRINCIPAL: COLA FILTRABLE DE LOTES + CONSOLA DE RELEVAMIENTO 360° */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        {/* SIDEBAR: COLA DE TRABAJO Y FILTRADO MULTI-CRITERIO */}
        <div className="lg:col-span-4 flex flex-col bg-white dark:bg-slate-900 rounded-[32px] border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden h-[820px]">
          <div className="p-4 border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50 space-y-2.5">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center">
                <Filter size={13} className="mr-1.5 text-emerald-600" /> Filtros de Recorrida
              </h3>
              {(searchQuery ||
                locationFilter !== 'all' ||
                varietyFilter !== 'all' ||
                typeFilter !== 'all' ||
                urgencyFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setLocationFilter('all');
                    setVarietyFilter('all');
                    setTypeFilter('all');
                    setUrgencyFilter('all');
                  }}
                  className="text-[9px] font-black uppercase text-rose-500 hover:underline cursor-pointer"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>

            {/* Búsqueda rápida */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar parcela, bloque, campo o variedad..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
              />
            </div>

            {/* Selectores de Establecimiento y Variedad */}
            <div className="grid grid-cols-2 gap-2">
              <select
                value={locationFilter}
                onChange={e => {
                  setLocationFilter(e.target.value);
                  setSelectedPlotId('');
                }}
                className="px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold outline-none dark:text-white truncate"
              >
                <option value="all">Todos los Campos ({locations.length})</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>

              <select
                value={varietyFilter}
                onChange={e => {
                  setVarietyFilter(e.target.value);
                  setSelectedPlotId('');
                }}
                className="px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold outline-none dark:text-white truncate"
              >
                <option value="all">Todas las Genéticas ({varieties.length})</option>
                {varieties.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Tipo real ('Ensayo' | 'Producción') y Urgencia */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {(['all', 'Ensayo', 'Producción'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setTypeFilter(f)}
                    className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition cursor-pointer ${
                      typeFilter === f
                        ? 'bg-slate-900 dark:bg-emerald-600 text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f === 'Ensayo' ? 'Ensayo' : 'Prod.'}
                  </button>
                ))}
              </div>

              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {(
                  [
                    { id: 'all', label: 'Todos' },
                    { id: 'urgent', label: '+7d Urg.' },
                    { id: 'uptodate', label: 'Al Día' }
                  ] as const
                ).map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setUrgencyFilter(u.id)}
                    className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition cursor-pointer ${
                      urgencyFilter === u.id
                        ? 'bg-slate-900 dark:bg-emerald-600 text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* LISTA DE PARCELAS EN LA COLA CON INDICADORES COTEJADOS */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {plotQueue.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold italic">
                No se encontraron parcelas activas para los filtros seleccionados.
              </div>
            ) : (
              plotQueue.map(item => {
                const isSelected = currentPlotData?.plot.id === item.plot.id;
                return (
                  <button
                    key={item.plot.id}
                    type="button"
                    onClick={() => setSelectedPlotId(item.plot.id)}
                    className={`w-full p-3.5 rounded-2xl text-left transition-all border group relative overflow-hidden cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                        : 'bg-white dark:bg-slate-800/90 border-slate-100 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 relative z-10">
                      <div className="truncate pr-2">
                        <span className="font-black uppercase tracking-tighter text-sm truncate block">
                          {item.plot.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                            }`}
                          >
                            {item.plot.type}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase truncate ${
                              isSelected ? 'text-emerald-100' : 'text-slate-400'
                            }`}
                          >
                            {item.varietyName}
                          </span>
                        </div>
                      </div>
                      {item.daysSince > 7 ? (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase flex items-center flex-shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
                          }`}
                        >
                          <AlertTriangle size={8} className="mr-1" /> +{item.daysSince}d
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase flex-shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300'
                          }`}
                        >
                          Hace {item.daysSince === 999 ? 'S/D' : `${item.daysSince}d`}
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-[9px] uppercase font-bold tracking-widest relative z-10 truncate mt-0.5 ${
                        isSelected ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      {item.locationName}
                    </p>

                    {/* Píldoras de Cotejo Rápido (Hídrico + Fotos Bitácora + Labores) */}
                    <div className="mt-2 pt-1.5 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center gap-1.5 text-[9px] font-mono">
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-black/20 text-white'
                            : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                        }`}
                        title="Lámina hídrica acumulada (Lluvia + Riego)"
                      >
                        💧 {item.totalWaterMm} mm
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-black/20 text-white'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        }`}
                        title="Registros en Bitácora Multimedia"
                      >
                        📷 {item.logsCount} ({item.photosCount} fotos)
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-black/20 text-white'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                        title="Labores culturales y de preparación de suelo"
                      >
                        🚜 {item.tasksCount} lab.
                      </span>
                    </div>

                    <div
                      className={`absolute bottom-0 left-0 h-1 transition-all ${
                        item.daysSince > 7 ? 'bg-red-500' : 'bg-emerald-400'
                      } opacity-40`}
                      style={{ width: `${Math.min(item.daysSince * 10, 100)}%` }}
                    ></div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL PRINCIPAL: FICHA TÉCNICA + CINTA DE COTEJO + ATAJOS INTEGRADOS */}
        <div className="lg:col-span-8 flex flex-col bg-white dark:bg-slate-900 rounded-[36px] shadow-xl border border-emerald-100 dark:border-emerald-900/30 overflow-hidden relative min-h-[820px]">
          {currentPlotData ? (
            <>
              {/* ENCABEZADO DE LA PARCELA SELECCIONADA + CINTA DE COTEJO 360° */}
              <div className="bg-slate-50 dark:bg-slate-950/70 p-5 md:p-6 border-b dark:border-slate-800 space-y-4 flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">
                        {currentPlotData.plot.type}
                      </span>
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                        Genética: {variety?.name || 'S/D'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        • {currentPlotData.locationName}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        • Siembra: {currentPlotData.plot.sowingDate} ({currentPlotMetrics.dds} DDS)
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic leading-none">
                      {currentPlotData.plot.name}
                    </h2>
                  </div>

                  {/* SELECTOR DE PESTAÑAS: RELEVAMIENTO + ATAJOS vs HISTORIAL COTEJADO 360° */}
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-2xl border dark:border-slate-800 shadow-sm self-stretch sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setActiveTab('form')}
                      className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === 'form'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <Activity size={12} /> Relevamiento & Atajos
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === 'history'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <History size={12} /> Cotejo 360° (
                      {plotHistory.length + currentPlotLogs.length + currentPlotHydric.length + currentPlotTasks.length})
                    </button>
                  </div>
                </div>

                {/* CINTA DE COTEJO INSTANTÁNEO CON PARCELAS DE CULTIVO */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-xs">
                  {/* 1. Superficie y Estadio BBCH */}
                  <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">
                      Superficie & Fenología BBCH
                    </span>
                    <div className="font-black text-slate-900 dark:text-white text-xs mt-0.5">
                      {currentPlotData.plot.surfaceArea} {currentPlotData.plot.surfaceUnit} ({currentPlotMetrics.areaHa} ha)
                    </div>
                    <select
                      value={currentPlotData.plot.currentPhenologicalStage || 'BBCH_20_39'}
                      onChange={e =>
                        updatePlotPhenology(
                          currentPlotData.plot.id,
                          e.target.value as HempStageId,
                          formData.date,
                          'Actualizado desde Monitoreo Rápido',
                          currentUser?.name
                        )
                      }
                      className="mt-1 w-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-lg px-1.5 py-0.5 text-[9.5px] font-bold outline-none cursor-pointer"
                      title="Actualizar estadio fenológico BBCH de la parcela"
                    >
                      <option value="BBCH_00_09">BBCH 00-09 Germinación</option>
                      <option value="BBCH_10_19">BBCH 10-19 Vegetativo Temprano</option>
                      <option value="BBCH_20_39">BBCH 20-39 Elongación Vegetativa</option>
                      <option value="BBCH_50_59">BBCH 50-59 Prefloración / Sexado</option>
                      <option value="BBCH_60_69">BBCH 60-69 Floración Plena</option>
                      <option value="BBCH_70_85">BBCH 70-85 Llenado de Grano</option>
                      <option value="BBCH_89_99">BBCH 89-99 Maduración / Cosecha</option>
                    </select>
                  </div>

                  {/* 2. Pluviómetro & Balance Hídrico */}
                  <div
                    onClick={() => {
                      setActiveTab('form');
                      setActiveShortcutTab('hydric');
                    }}
                    className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-sky-500/50 transition cursor-pointer"
                  >
                    <span className="text-[9px] uppercase font-bold text-sky-600 dark:text-sky-400 block">
                      🌧️ Pluviómetro & Riego ({currentPlotMetrics.waterPct}%)
                    </span>
                    <div className="font-black text-slate-900 dark:text-white text-xs mt-0.5">
                      {currentPlotData.totalWaterMm} mm ({currentPlotData.totalWaterMm * 10} m³/ha)
                    </div>
                    <span className="text-[9.5px] text-slate-400 block">
                      Lluvia: {currentPlotData.rainMm}mm • Riego: {currentPlotData.irrigMm}mm
                    </span>
                  </div>

                  {/* 3. Labores y Preparación de Suelo */}
                  <div
                    onClick={() => {
                      setActiveTab('form');
                      setActiveShortcutTab('labor');
                    }}
                    className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/50 transition cursor-pointer"
                  >
                    <span className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400 block">
                      🚜 Suelo & Labores ({currentPlotTasks.length})
                    </span>
                    <div className="font-black text-slate-900 dark:text-white text-xs mt-0.5 truncate">
                      {currentPlotTasks[0]?.title || 'Sin labores registradas'}
                    </div>
                    <span className="text-[9.5px] text-slate-400 block">
                      {currentPlotData.soilPrepCount} prep. suelo / siembra
                    </span>
                  </div>

                  {/* 4. Bitácora Multimedia */}
                  <div
                    onClick={() => {
                      setActiveTab('form');
                      setActiveShortcutTab('photo_log');
                    }}
                    className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-500/50 transition cursor-pointer"
                  >
                    <span className="text-[9px] uppercase font-bold text-purple-600 dark:text-purple-400 block">
                      📷 Bitácora Multimedia ({currentPlotLogs.length})
                    </span>
                    <div className="font-black text-slate-900 dark:text-white text-xs mt-0.5 truncate">
                      {currentPlotLogs[0]?.note || 'Sin notas en bitácora'}
                    </div>
                    <span className="text-[9.5px] text-slate-400 block">
                      {currentPlotData.photosCount} fotografías georreferenciadas
                    </span>
                  </div>
                </div>
              </div>

              {/* VISTA 1: FORMULARIO OFICIAL NUCLEUS TRACE + PANEL DE ATAJOS DE CAMPO */}
              {activeTab === 'form' && (
                <div className="flex-1 flex flex-col justify-between">
                  <form onSubmit={handleSave} className="p-5 md:p-7 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* TÍTULO OFICIAL DE LA FICHA NUCLEUS TRACE */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="bg-hemp-600 p-2.5 rounded-2xl text-white shadow-md">
                          <Activity size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg md:text-xl font-black dark:text-white uppercase tracking-tighter italic">
                            1. Relevamiento Biométrico <span className="text-emerald-600">Nucleus Trace</span>
                          </h3>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Datos fenológicos, sanitarios y biométricos sincronizados con la Ficha de Parcela
                          </p>
                        </div>
                      </div>
                      {isFetchingConditions && (
                        <div className="flex items-center text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                          <Loader2 className="animate-spin mr-1.5" size={12} /> Capturando Clima Open-Meteo GFS...
                        </div>
                      )}
                    </div>

                    {/* GRILLA BIOMÉTRICA IDÉNTICA A PLOTDETAILS */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                      {/* COLUMNA 1: AMBIENTE & TIEMPO */}
                      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border dark:border-slate-800 space-y-3.5">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b dark:border-slate-800 pb-2 flex items-center">
                          <Sun size={14} className="mr-2 text-amber-500" /> Ambiente & Tiempo
                        </h3>
                        <div>
                          <label className={labelClass}>Fecha de Muestreo</label>
                          <input
                            type="date"
                            required
                            className={inputStyle}
                            value={formData.date}
                            onChange={e => {
                              const newDate = e.target.value;
                              setFormData(p => ({ ...p, date: newDate }));
                              syncEnvironmentalData(newDate, currentPlotData.location);
                            }}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Hora de Muestreo</label>
                          <input
                            type="time"
                            required
                            className={inputStyle}
                            value={formData.time}
                            onChange={e => setFormData({ ...formData, time: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Fase Fisiológica</label>
                          <select
                            required
                            className={inputStyle}
                            value={formData.stage}
                            onChange={e => setFormData({ ...formData, stage: e.target.value as any })}
                          >
                            <option value="Emergencia">Emergencia</option>
                            <option value="Vegetativo">Vegetativo</option>
                            <option value="Floración">Floración</option>
                            <option value="Maduración">Maduración</option>
                            <option value="Cosecha">Cosecha</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-orange-500 p-2.5 rounded-xl text-white text-center shadow-sm">
                            <p className="text-[8px] font-black uppercase opacity-75">Temp.</p>
                            <p className="text-sm font-black">{formData.temperature}°C</p>
                          </div>
                          <div className="bg-blue-600 p-2.5 rounded-xl text-white text-center shadow-sm">
                            <p className="text-[8px] font-black uppercase opacity-75">Hum.</p>
                            <p className="text-sm font-black">{formData.humidity}%</p>
                          </div>
                        </div>
                        <div className="bg-slate-900 p-3.5 rounded-xl text-white text-center border border-white/10 flex flex-col justify-center gap-1.5">
                          <div>
                            <p className="text-[8px] font-black uppercase opacity-60">Luz Solar / Fotoperiodo</p>
                            <p className="text-base font-black">{formData.lightHours} h</p>
                          </div>
                          <div className="border-t border-white/10 pt-1.5">
                            <p className="text-[8px] font-black uppercase opacity-60">Luna</p>
                            <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
                              {formData.lunarPhase || 'Nueva'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* COLUMNAS 2 & 3: EVALUACIÓN VEGETAL (1-9) + SANIDAD (1-9) */}
                      <div className="lg:col-span-2 space-y-5">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div className="md:col-span-2 border-b dark:border-slate-800 pb-2">
                            <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center">
                              <Target size={14} className="mr-2" /> Evaluación Vegetal (1-9)
                            </h3>
                          </div>
                          <div>
                            <label className={labelClass}>Población (Pl/m²)</label>
                            <input
                              type="number"
                              step="0.1"
                              className={inputStyle}
                              value={formData.plantsPerMeter}
                              onChange={e => setFormData({ ...formData, plantsPerMeter: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                Altura Media (cm)
                              </label>
                              <GrowthIndicator
                                current={formData.plantHeight || 0}
                                previous={currentPlotData.lastRecord?.plantHeight || 0}
                              />
                            </div>
                            <input
                              type="number"
                              step="0.1"
                              className={inputStyle}
                              value={formData.plantHeight}
                              onChange={e => setFormData({ ...formData, plantHeight: Number(e.target.value) })}
                            />
                          </div>
                          <ScaleSelect
                            label="Vigor (1-9)"
                            value={formData.vigor}
                            onChange={(v: number) => setFormData({ ...formData, vigor: v })}
                          />
                          <ScaleSelect
                            label="Homogeneidad (1-9)"
                            value={formData.uniformity}
                            onChange={(v: number) => setFormData({ ...formData, uniformity: v })}
                          />
                          <ScaleSelect
                            label="Encamado (1-9)"
                            value={formData.lodging}
                            onChange={(v: number) => setFormData({ ...formData, lodging: v })}
                          />
                          <ScaleSelect
                            label="Daño Aves (1-9)"
                            value={formData.birdDamage}
                            onChange={(v: number) => setFormData({ ...formData, birdDamage: v })}
                          />
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-[28px] border border-amber-100 dark:border-amber-900/30 grid grid-cols-2 gap-3.5">
                          <div className="col-span-2 border-b border-amber-100 dark:border-amber-900/30 pb-2">
                            <h3 className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center">
                              <AlertCircle size={14} className="mr-2" /> Sanidad (1-9)
                            </h3>
                          </div>
                          <ScaleSelect
                            label="Enfermedades (1-9)"
                            value={formData.diseasesScore}
                            onChange={(v: number) => setFormData({ ...formData, diseasesScore: v })}
                          />
                          <ScaleSelect
                            label="Plagas / Parásitos (1-9)"
                            value={formData.pestsScore}
                            onChange={(v: number) => setFormData({ ...formData, pestsScore: v })}
                          />
                        </div>
                      </div>

                      {/* COLUMNA 4: DATOS DE COSECHA & CALIDAD SEMILLA */}
                      <div className="bg-slate-900 p-5 rounded-[28px] text-white space-y-3.5 shadow-sm">
                        <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 border-b border-white/10 pb-2 flex items-center">
                          <FlaskConical size={14} className="mr-2" /> Datos de Cosecha
                        </h3>
                        <div>
                          <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">
                            Plena Floración (50%)
                          </label>
                          <input
                            type="date"
                            className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                            value={formData.floweringDate}
                            onChange={e => setFormData({ ...formData, floweringDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">
                            Rendimiento Semillas (g)
                          </label>
                          <input
                            type="number"
                            className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                            value={formData.seedYield}
                            onChange={e => setFormData({ ...formData, seedYield: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">
                            Peso Tallo / Biomasa (g)
                          </label>
                          <input
                            type="number"
                            className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                            value={formData.stemWeight}
                            onChange={e => setFormData({ ...formData, stemWeight: Number(e.target.value) })}
                          />
                        </div>
                        <div className="pt-2 space-y-2 border-t border-white/10">
                          <label className="text-[9px] uppercase font-black text-emerald-400 block">Calidad Semilla</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[8px] text-slate-400 font-bold uppercase mb-1">Germinación %</p>
                              <input
                                type="number"
                                className="w-full bg-white/10 border-none p-2 rounded-lg text-xs font-bold text-center"
                                value={formData.seedQualityGermination}
                                onChange={e =>
                                  setFormData({ ...formData, seedQualityGermination: Number(e.target.value) })
                                }
                              />
                            </div>
                            <div>
                              <p className="text-[8px] text-slate-400 font-bold uppercase mb-1">No Conforme %</p>
                              <input
                                type="number"
                                className="w-full bg-white/10 border-none p-2 rounded-lg text-xs font-bold text-center"
                                value={formData.seedQualityNonConformity}
                                onChange={e =>
                                  setFormData({ ...formData, seedQualityNonConformity: Number(e.target.value) })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ==================================================================== */}
                    {/* SECCIÓN 2: ATAJOS OPERATIVOS COTEJADOS CON LA PARCELA (3 MÓDULOS)    */}
                    {/* ==================================================================== */}
                    <div className="bg-slate-50 dark:bg-slate-950/90 rounded-[28px] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block">
                            Atajos Directos de Carga en Campo • Fuente Única de Verdad con Parcelas
                          </span>
                          <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                            2. Bitácora Fotográfica, Pluviómetro/Riego & Labores de Suelo ({currentPlotData.plot.name})
                          </h4>
                        </div>

                        {/* Pestañas de los 3 Atajos */}
                        <div className="flex flex-wrap gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setActiveShortcutTab('photo_log')}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                              activeShortcutTab === 'photo_log'
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Camera size={12} />
                            <span>Bitácora & Foto ({currentPlotLogs.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveShortcutTab('hydric')}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                              activeShortcutTab === 'hydric'
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <CloudRain size={12} />
                            <span>Pluviómetro & Riego ({currentPlotHydric.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveShortcutTab('labor')}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                              activeShortcutTab === 'labor'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Tractor size={12} />
                            <span>Labores & Suelo ({currentPlotTasks.length})</span>
                          </button>
                        </div>
                      </div>

                      {/* ATAJO A: BITÁCORA MULTIMEDIA & TOMA FOTOGRÁFICA */}
                      {activeShortcutTab === 'photo_log' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                          <div className="lg:col-span-7 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={startWebCamera}
                                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                <Camera size={14} /> Abrir Cámara en Vivo
                              </button>
                              <button
                                type="button"
                                onClick={() => fileInputMobileCamRef.current?.click()}
                                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                              >
                                <Camera size={14} /> Cámara Celular
                              </button>
                              <button
                                type="button"
                                onClick={() => fileInputGalleryRef.current?.click()}
                                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                              >
                                <Upload size={14} /> Subir Foto
                              </button>

                              <input
                                ref={fileInputMobileCamRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleSelectPhotoFile}
                                className="hidden"
                              />
                              <input
                                ref={fileInputGalleryRef}
                                type="file"
                                accept="image/*"
                                onChange={handleSelectPhotoFile}
                                className="hidden"
                              />
                            </div>

                            {isProcessingImage && (
                              <div className="text-xs font-mono text-purple-600 flex items-center gap-1.5">
                                <Loader2 size={14} className="animate-spin" /> Comprimiendo y optimizando fotografía...
                              </div>
                            )}

                            {quickLogPhoto && (
                              <div className="relative inline-block rounded-2xl overflow-hidden border-2 border-purple-500 shadow-md">
                                <img
                                  src={quickLogPhoto}
                                  alt="Evidencia capturada"
                                  className="h-32 w-auto object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => setQuickLogPhoto('')}
                                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white hover:bg-red-600"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            )}

                            <textarea
                              rows={2}
                              value={quickLogNote}
                              onChange={e => setQuickLogNote(e.target.value)}
                              placeholder={`Observación de Bitácora para ${currentPlotData.plot.name} (ej. estado foliar, humedad en línea de siembra, presencia de benéficos)...`}
                              className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none focus:border-purple-500 dark:text-white"
                            />

                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={autoAttachBiometricsToLog}
                                  onChange={e => setAutoAttachBiometricsToLog(e.target.checked)}
                                  className="rounded accent-purple-600"
                                />
                                <span>Incluir resumen biométrico (Altura/Población/Vigor) en la nota</span>
                              </label>

                              <button
                                type="button"
                                onClick={handleQuickSaveLogOnly}
                                disabled={isSavingQuickLog || (!quickLogNote.trim() && !quickLogPhoto)}
                                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                              >
                                {isSavingQuickLog ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                <span>Guardar en Bitácora Ahora</span>
                              </button>
                            </div>
                          </div>

                          {/* Cotejo de últimas fotos y notas de la parcela */}
                          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 max-h-56 overflow-y-auto">
                            <span className="text-[10px] font-black uppercase text-slate-400 block">
                              Últimos Registros en Bitácora ({currentPlotLogs.length})
                            </span>
                            {currentPlotLogs.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-4 text-center">
                                Sin fotografías ni notas previas en esta parcela.
                              </p>
                            ) : (
                              currentPlotLogs.slice(0, 4).map(lg => (
                                <div
                                  key={lg.id}
                                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5 text-xs"
                                >
                                  {lg.photoUrl && (
                                    <img
                                      src={lg.photoUrl}
                                      alt="Foto bitácora"
                                      onClick={() => setPreviewPhotoUrl(lg.photoUrl!)}
                                      className="w-12 h-12 rounded-lg object-cover shrink-0 cursor-pointer border border-purple-500/30"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 block">
                                      {lg.date} {lg.time || ''}
                                    </span>
                                    <p className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2">
                                      {lg.note}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* ATAJO B: PLUVIÓMETRO & RIEGO SUPLEMENTARIO */}
                      {activeShortcutTab === 'hydric' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                          <div className="lg:col-span-7 space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                  Tipo de Aporte
                                </label>
                                <select
                                  value={quickHydricType}
                                  onChange={e => setQuickHydricType(e.target.value as 'Riego' | 'Lluvia')}
                                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold dark:text-white"
                                >
                                  <option value="Riego">💧 Riego (Agua Azul)</option>
                                  <option value="Lluvia">🌧️ Pluviómetro (Lluvia)</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                  Lámina (mm) *
                                </label>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={quickHydricMm}
                                  onChange={e => setQuickHydricMm(e.target.value)}
                                  placeholder="Ej: 12.5"
                                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold dark:text-white"
                                />
                              </div>

                              <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                  Hora Inicio
                                </label>
                                <input
                                  type="time"
                                  value={quickHydricStartTime}
                                  onChange={e => setQuickHydricStartTime(e.target.value)}
                                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono dark:text-white"
                                />
                              </div>

                              <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                  Hora Fin
                                </label>
                                <input
                                  type="time"
                                  value={quickHydricEndTime}
                                  onChange={e => setQuickHydricEndTime(e.target.value)}
                                  disabled={quickHydricType === 'Lluvia'}
                                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono dark:text-white disabled:opacity-40"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                              <input
                                type="text"
                                value={quickHydricNotes}
                                onChange={e => setQuickHydricNotes(e.target.value)}
                                placeholder="Observaciones del turno de riego o lectura de pluviómetro físico..."
                                className="flex-1 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={handleQuickSaveHydricOnly}
                                disabled={isSavingQuickHydric || !quickHydricMm}
                                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0"
                              >
                                {isSavingQuickHydric ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Droplets size={13} />
                                )}
                                <span>Registrar en Pluviómetro</span>
                              </button>
                            </div>

                            {parseFloat(quickHydricMm) > 0 && (
                              <div className="text-[11px] font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 px-3 py-1.5 rounded-xl border border-sky-500/20">
                                Conversión en {currentPlotData.plot.name}:{' '}
                                <strong>{(parseFloat(quickHydricMm) * 10).toFixed(1)} m³/ha</strong> • Volumen real en
                                lote:{' '}
                                <strong>
                                  {Math.round(parseFloat(quickHydricMm) * currentPlotMetrics.areaM2).toLocaleString(
                                    'es-AR'
                                  )}{' '}
                                  Litros
                                </strong>
                              </div>
                            )}
                          </div>

                          {/* Cotejo con registros hídricos de la parcela */}
                          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 max-h-56 overflow-y-auto font-mono">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-slate-400">
                                Historial Pluviómetro & Riego ({currentPlotHydric.length})
                              </span>
                              <span className="text-[10px] font-bold text-sky-600">
                                Total: {currentPlotData.totalWaterMm} mm
                              </span>
                            </div>
                            {currentPlotHydric.slice(0, 5).map(hr => {
                              const isSat =
                                String(hr.id).startsWith('auto-rain-') || String(hr.notes || '').includes('Open-Meteo');
                              return (
                                <div
                                  key={hr.id}
                                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]"
                                >
                                  <div>
                                    <span className="font-bold text-slate-800 dark:text-white">{hr.date}</span>{' '}
                                    <span
                                      className={
                                        hr.type === 'Riego'
                                          ? 'text-emerald-600 font-bold'
                                          : 'text-sky-600 font-bold'
                                      }
                                    >
                                      • {hr.type}
                                    </span>
                                    <span className="text-[9.5px] text-slate-400 block">
                                      {isSat ? '🛰️ Satélite Open-Meteo ERA5' : '🧑‍🌾 Registro de Campo'}
                                    </span>
                                  </div>
                                  <strong className="text-slate-900 dark:text-white">{hr.amountMm} mm</strong>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ATAJO C: LABORES CULTURALES & PREPARACIÓN DE SUELO */}
                      {activeShortcutTab === 'labor' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                          <div className="lg:col-span-7 space-y-3">
                            {/* Plantillas rápidas de preparación de suelo y labores */}
                            <div className="flex flex-wrap gap-1.5">
                              {QUICK_LABOR_PRESETS.map((preset, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setQuickLaborType(preset.laborType);
                                    setQuickLaborTitle(preset.title);
                                    setQuickLaborDescription(preset.description);
                                    setQuickLaborTractor(preset.tractor);
                                    setQuickLaborImplement(preset.implement);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[10px] font-mono font-bold cursor-pointer"
                                >
                                  + {preset.label}
                                </button>
                              ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                  Categoría de Labor
                                </label>
                                <select
                                  value={quickLaborType}
                                  onChange={e => setQuickLaborType(e.target.value as AgriculturalLaborType)}
                                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold dark:text-white"
                                >
                                  <option value="PREPARACION_SUELO">🚜 Preparación de Suelo</option>
                                  <option value="SIEMBRA">🌱 Siembra / Implantación</option>
                                  <option value="LABOR_CULTURAL">🛠️ Labor Cultural / Desmalezado</option>
                                  <option value="FERTIRRIEGO">🧪 Fertirriego / Enmienda</option>
                                  <option value="MANEJO_HIDRICO">💧 Manejo Hídrico</option>
                                  <option value="FITOSANITARIO">🛡️ Aplicación Fitosanitaria</option>
                                  <option value="MONITOREO">🔍 Depuración / Roguing</option>
                                </select>
                              </div>

                              <div className="sm:col-span-2">
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                  Título de la Labor Ejecutada / Verificada *
                                </label>
                                <input
                                  type="text"
                                  value={quickLaborTitle}
                                  onChange={e => setQuickLaborTitle(e.target.value)}
                                  placeholder="Ej: Cincelado profundo + Rastra de disco (Cama de siembra)"
                                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold dark:text-white"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <input
                                type="text"
                                value={quickLaborTractor}
                                onChange={e => setQuickLaborTractor(e.target.value)}
                                placeholder="Tractor / Unidad Motriz"
                                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs dark:text-white"
                              />
                              <input
                                type="text"
                                value={quickLaborImplement}
                                onChange={e => setQuickLaborImplement(e.target.value)}
                                placeholder="Implemento / Herramienta"
                                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs dark:text-white"
                              />
                              <select
                                value={quickLaborStatus}
                                onChange={e => setQuickLaborStatus(e.target.value as Task['status'])}
                                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold dark:text-white"
                              >
                                <option value="Completada">✓ Ejecutada / Completada</option>
                                <option value="En_Curso">⏳ En Curso</option>
                                <option value="Pendiente">📌 Programada / Pendiente</option>
                              </select>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={quickLaborApplyBlock}
                                  onChange={e => setQuickLaborApplyBlock(e.target.checked)}
                                  className="rounded accent-amber-600"
                                />
                                <span>
                                  Replicar labor en todo el bloque/establecimiento ({currentPlotData.locationName})
                                </span>
                              </label>

                              <button
                                type="button"
                                onClick={handleQuickSaveLaborOnly}
                                disabled={isSavingQuickLabor || !quickLaborTitle.trim()}
                                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                              >
                                {isSavingQuickLabor ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Tractor size={13} />
                                )}
                                <span>Asentar Labor de Suelo/Cultivo</span>
                              </button>
                            </div>
                          </div>

                          {/* Cotejo con labores registradas en la parcela */}
                          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 max-h-56 overflow-y-auto">
                            <span className="text-[10px] font-black uppercase text-slate-400 block">
                              Labores & Preparación de Suelo en Lote ({currentPlotTasks.length})
                            </span>
                            {currentPlotTasks.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-4 text-center">
                                Sin labores culturales o de preparación de suelo registradas en esta parcela.
                              </p>
                            ) : (
                              currentPlotTasks.slice(0, 4).map(tk => (
                                <div
                                  key={tk.id}
                                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[9.5px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                                      {tk.laborType || 'LABOR'} • {tk.executionDate || tk.dueDate}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[9px] font-bold">
                                      {tk.status}
                                    </span>
                                  </div>
                                  <p className="font-bold text-slate-800 dark:text-white mt-0.5 truncate">{tk.title}</p>
                                  {tk.machinery?.implement && (
                                    <span className="text-[10px] text-slate-400 block truncate">
                                      {tk.machinery.tractor} • {tk.machinery.implement}
                                    </span>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* FOOTER DE ACCIONES Y SELLADO INTEGRAL */}
                    <div className="pt-4 border-t dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoAdvance}
                          onChange={e => setAutoAdvance(e.target.checked)}
                          className="rounded accent-emerald-600 w-4 h-4"
                        />
                        <span>Avanzar automáticamente al siguiente lote de la recorrida al sellar</span>
                      </label>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {editingRecordId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRecordId(null);
                              setActiveTab('history');
                            }}
                            className="px-5 py-4 rounded-[24px] font-black text-xs uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition cursor-pointer"
                          >
                            Cancelar Edición
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={isSaving || isFetchingConditions}
                          className={`w-full sm:w-auto px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 cursor-pointer ${
                            justSaved
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-900 dark:bg-emerald-600 text-white hover:bg-black dark:hover:bg-emerald-700'
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 className="animate-spin mr-2" size={18} />
                          ) : justSaved ? (
                            <CheckCircle2 className="mr-2" size={18} />
                          ) : (
                            <Save className="mr-2" size={18} />
                          )}
                          {justSaved
                            ? '¡Relevamiento 360° Sellado!'
                            : editingRecordId
                            ? 'Guardar Cambios en Informe'
                            : 'Sellar Relevamiento Integral Nucleus'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* VISTA 2: HISTORIAL COTEJADO 360° (BIOMETRÍA + BITÁCORA + PLUVIÓMETRO + LABORES) */}
              {activeTab === 'history' && (
                <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-lg font-black uppercase text-slate-800 dark:text-white">
                        Línea de Tiempo & Cotejo 360° de {currentPlotData.plot.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Auditoría unificada de Informes Biométricos, Bitácora Fotográfica, Pluviómetro/Riego y Labores de Suelo
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecordId(null);
                        setActiveTab('form');
                      }}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-emerald-700 transition cursor-pointer"
                    >
                      + Nuevo Relevamiento
                    </button>
                  </div>

                  {/* Filtros de categoría del historial cotejado */}
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: 'all', label: 'Todo el Historial 360°' },
                        { id: 'trials', label: `Biometría Nucleus (${plotHistory.length})` },
                        { id: 'logs', label: `Bitácora & Fotos (${currentPlotLogs.length})` },
                        { id: 'hydric', label: `Pluviómetro & Riego (${currentPlotHydric.length})` },
                        { id: 'labors', label: `Labores & Suelo (${currentPlotTasks.length})` }
                      ] as const
                    ).map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setHistoryFilter(tab.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                          historyFilter === tab.id
                            ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* BLOQUE 1: INFORMES BIOMÉTRICOS NUCLEUS TRACE */}
                  {(historyFilter === 'all' || historyFilter === 'trials') && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-emerald-600 tracking-wider">
                        Informes Biométricos Nucleus Trace ({plotHistory.length})
                      </h4>
                      {plotHistory.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 italic text-xs bg-slate-50 dark:bg-slate-950/50 rounded-2xl border dark:border-slate-800">
                          No hay informes biométricos registrados para este lote.
                        </div>
                      ) : (
                        plotHistory.map(record => (
                          <div
                            key={record.id}
                            className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3"
                          >
                            <div className="flex flex-wrap justify-between items-center gap-2 border-b dark:border-slate-800 pb-2">
                              <div className="flex items-center gap-3">
                                <span className="font-black text-slate-800 dark:text-white text-sm">
                                  {record.date}{' '}
                                  <span className="text-xs font-normal text-slate-400">{record.time || ''} HS</span>
                                </span>
                                <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  {record.stage}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase mr-2">
                                  Auditado por: {record.createdByName || 'Técnico Nucleus'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleEditRecord(record)}
                                  className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-600 transition cursor-pointer"
                                  title="Editar Informe"
                                >
                                  <Edit2 size={13} />
                                </button>
                                {confirmDeleteRecordId === record.id ? (
                                  <div className="inline-flex items-center gap-1.5 bg-red-50 dark:bg-red-950/60 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await deleteTrialRecord(record.id);
                                        setConfirmDeleteRecordId(null);
                                      }}
                                      className="text-[9px] font-black uppercase text-red-600 hover:underline cursor-pointer"
                                    >
                                      Confirmar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteRecordId(null)}
                                      className="text-[9px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteRecordId(record.id)}
                                    className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-600 transition cursor-pointer"
                                    title="Eliminar Informe"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-xs">
                              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                <p className="text-[8px] font-black text-slate-400 uppercase">Altura Media</p>
                                <p className="font-black text-emerald-600 text-sm">{record.plantHeight || 0} cm</p>
                              </div>
                              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                <p className="text-[8px] font-black text-slate-400 uppercase">Población</p>
                                <p className="font-black text-slate-700 dark:text-slate-200 text-sm">
                                  {record.plantsPerMeter || 0} pl/m²
                                </p>
                              </div>
                              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                <p className="text-[8px] font-black text-slate-400 uppercase">Vigor / Homog.</p>
                                <p className="font-black text-emerald-600 text-sm">
                                  {record.vigor || '-'}/9 • {record.uniformity || '-'}/9
                                </p>
                              </div>
                              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                <p className="text-[8px] font-black text-slate-400 uppercase">Sanidad (Enf/Plag)</p>
                                <p className="font-black text-amber-600 text-sm">
                                  {record.diseasesScore || 1}/9 • {record.pestsScore || 1}/9
                                </p>
                              </div>
                              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                <p className="text-[8px] font-black text-slate-400 uppercase">Clima / Fotoperiodo</p>
                                <p className="font-black text-slate-600 dark:text-slate-300 text-sm">
                                  {record.temperature}°C • {record.lightHours || 12}h
                                </p>
                              </div>
                              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border dark:border-slate-800">
                                <p className="text-[8px] font-black text-slate-400 uppercase">Calidad Semilla</p>
                                <p className="font-black text-slate-700 dark:text-slate-200 text-sm">
                                  {record.seedQualityGermination || 90}% Germ.
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* BLOQUE 2: BITÁCORA MULTIMEDIA Y EVIDENCIA FOTOGRÁFICA */}
                  {(historyFilter === 'all' || historyFilter === 'logs') && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-purple-600 tracking-wider">
                        Bitácora Multimedia & Fotografías de Campo ({currentPlotLogs.length})
                      </h4>
                      {currentPlotLogs.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 italic text-xs bg-slate-50 dark:bg-slate-950/50 rounded-2xl border dark:border-slate-800">
                          No hay fotografías ni notas de bitácora cargadas para esta parcela.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {currentPlotLogs.map(lg => (
                            <div
                              key={lg.id}
                              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3"
                            >
                              {lg.photoUrl && (
                                <img
                                  src={lg.photoUrl}
                                  alt="Evidencia"
                                  onClick={() => setPreviewPhotoUrl(lg.photoUrl!)}
                                  className="w-20 h-20 rounded-xl object-cover shrink-0 cursor-pointer border border-purple-500/30"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                                    📷 {lg.date} {lg.time || ''}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => deleteLog(lg.id)}
                                    className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                                    title="Eliminar registro de bitácora"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                                <p className="text-xs text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">
                                  {lg.note}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BLOQUE 3: LABORES CULTURALES Y PREPARACIÓN DE SUELO */}
                  {(historyFilter === 'all' || historyFilter === 'labors') && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-amber-600 tracking-wider">
                        Labores Culturales & Preparación de Suelo ({currentPlotTasks.length})
                      </h4>
                      {currentPlotTasks.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 italic text-xs bg-slate-50 dark:bg-slate-950/50 rounded-2xl border dark:border-slate-800">
                          No hay labores registradas para esta parcela.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {currentPlotTasks.map(tk => (
                            <div
                              key={tk.id}
                              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-bold">
                                    {tk.laborType || 'LABOR'}
                                  </span>
                                  <span className="text-xs font-mono font-bold text-slate-500">
                                    {tk.executionDate || tk.dueDate}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9.5px] font-bold">
                                    {tk.status}
                                  </span>
                                </div>
                                <p className="text-sm font-black text-slate-800 dark:text-white mt-1">{tk.title}</p>
                                {tk.description && <p className="text-xs text-slate-500">{tk.description}</p>}
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteTask(tk.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                                title="Eliminar labor"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BLOQUE 4: PLUVIÓMETRO Y RIEGO DE LA PARCELA */}
                  {(historyFilter === 'all' || historyFilter === 'hydric') && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-sky-600 tracking-wider">
                        Registros de Pluviómetro & Riego en Ciclo ({currentPlotHydric.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 font-mono text-xs">
                        {currentPlotHydric.slice(0, 18).map(hr => {
                          const isSat =
                            String(hr.id).startsWith('auto-rain-') || String(hr.notes || '').includes('Open-Meteo');
                          return (
                            <div
                              key={hr.id}
                              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">{hr.date}</span>
                                <span
                                  className={`block text-[10px] font-bold ${
                                    hr.type === 'Riego' ? 'text-emerald-600' : 'text-sky-600'
                                  }`}
                                >
                                  {hr.type === 'Riego' ? '💧 Riego Campo' : isSat ? '🛰️ Lluvia ERA5' : '🌧️ Pluviómetro'}
                                </span>
                              </div>
                              <div className="text-right">
                                <strong className="text-sm font-black text-slate-900 dark:text-white">
                                  {hr.amountMm} mm
                                </strong>
                                <span className="block text-[9.5px] text-slate-400">{(hr.amountMm * 10).toFixed(0)} m³/ha</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-12 text-center bg-gray-50 dark:bg-slate-950/50">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-full mb-6 shadow-sm">
                <CheckCircle2 size={64} className="text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight text-slate-600 dark:text-slate-300 mb-2">
                Sin Lotes para el Filtro Seleccionado
              </h3>
              <p className="text-sm font-medium max-w-xs mx-auto text-slate-500">
                Ajuste los filtros de establecimiento, genética o urgencia en el panel izquierdo para continuar la recorrida.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CÁMARA WEBRTC EN VIVO */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-xl w-full p-6 space-y-4 text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Camera size={16} className="text-purple-400" />
                Captura Fotográfica de Evidencia — {currentPlotData?.plot.name}
              </h3>
              <button type="button" onClick={stopWebCamera} className="p-1.5 rounded-full hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                {cameraError}
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={stopWebCamera}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              {!cameraError && (
                <button
                  type="button"
                  onClick={captureWebCameraFrame}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera size={14} /> Capturar Fotografía
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISTA PREVIA DE FOTOGRAFÍA DE BITÁCORA */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={previewPhotoUrl}
            alt="Vista ampliada de Bitácora"
            className="max-w-3xl max-h-[85vh] rounded-2xl border border-white/20 shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
