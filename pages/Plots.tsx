import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Plot, Variety, Location, Project, TrialRecord, SeedBatch, CAMPAIGNS } from '../types';
import { 
  ChevronRight, LayoutGrid, List, Tag, FlaskConical, 
  Trash2, Edit2, QrCode, X, Save, Search, Filter, 
  MapPin, Calendar, Sprout, Printer, Activity, Plus, Loader2, Info, FolderKanban, FileUp,
  Link as LinkIcon, Scale, Box, Weight, Archive, Globe, LayoutDashboard, Eye, Palette,
  Power, AlertCircle, CheckCircle2, ShieldCheck, Tractor, Layers, Clock, FileText, Download, UserCheck, Award
} from 'lucide-react';
import MapEditor from '../components/MapEditor';
import { PlotIdentificationModal } from '../components/PlotIdentificationModal';
import SeedingProtocolModal from '../components/SeedingProtocolModal';
import { canAccessPlot, canAccessLocation } from '../src/utils/structurePermissions';

// Algoritmo de cálculo de área geodésica
const calculateGeodesicArea = (latLngs: { lat: number, lng: number }[]) => {
    const R = 6378137; 
    const toRad = (x: number) => x * Math.PI / 180;
    let area = 0;
    
    if (latLngs.length > 2) {
        for (let i = 0; i < latLngs.length; i++) {
            const p1 = latLngs[i];
            const p2 = latLngs[(i + 1) % latLngs.length];
            area += (toRad(p2.lng) - toRad(p1.lng)) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
        }
        area = area * R * R / 2.0;
    }
    return Math.abs(area); 
};

const parseKML = (kmlText: string): { lat: number, lng: number }[] | null => {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlText, "text/xml");
        const coordinates = xmlDoc.getElementsByTagName("coordinates");
        let coordsText = "";
        for(let i=0; i<coordinates.length; i++) {
            const text = coordinates[i].textContent || "";
            if(text.length > coordsText.length) coordsText = text;
        }
        if (!coordsText) return null;
        const rawPoints = coordsText.trim().split(/\s+/);
        const latLngs = rawPoints.map(point => {
            const parts = point.split(',');
            if (parts.length >= 2) {
                const lng = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
            }
            return null;
        }).filter((p): p is { lat: number, lng: number } => p !== null);
        return latLngs.length >= 3 ? latLngs : null;
    } catch (e) {
        console.error("Error parsing KML", e);
        return null;
    }
};

// Generador ID Compatible
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};

type MassUnit = 'gr' | 'kg' | 'tn';

const COLOR_PALETTE = [
    { color: '#10b981', label: 'Verde Esmeralda' },
    { color: '#059669', label: 'Verde Bosque' },
    { color: '#0284c7', label: 'Azul Ensayos' },
    { color: '#d97706', label: 'Ámbar Producción' },
    { color: '#9333ea', label: 'Púrpura Genética' },
    { color: '#e11d48', label: 'Rosa Alerta' },
];

export default function Plots() {
  const { 
    plots, locations, varieties, projects, currentUser, clients,
    seedBatches, deletePlot, updatePlot, 
    addPlot, updateLocation, updateSeedBatch, storagePoints, appName,
    activeCampaign, setActiveCampaign, closePlotCycle, reopenPlotCycle
  } = useAppContext();
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'table' | 'gallery' | 'map'>('gallery');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLoc, setFilterLoc] = useState<string>(searchParams.get('locationId') || 'all');

  useEffect(() => {
    const locParam = searchParams.get('locationId');
    if (locParam) {
      setFilterLoc(locParam);
    }
    const editId = searchParams.get('editPlotId');
    if (editId && plots.length > 0) {
      const target = plots.find(p => p.id === editId);
      if (target) {
        const parentLoc = locations.find(l => l.id === target.locationId);
        setEditingPlot(target);
        setFormData({
          ...target,
          lat: target.coordinates?.lat?.toString() || parentLoc?.coordinates?.lat?.toString() || '',
          lng: target.coordinates?.lng?.toString() || parentLoc?.coordinates?.lng?.toString() || '',
          polygon: target.polygon || [],
          campaign: target.campaign || '2025/2026',
          activeCampaigns: target.activeCampaigns || (target.campaign ? [target.campaign] : ['2025/2026']),
          color: target.color || '#10b981',
          soilType: target.soilType || parentLoc?.soilType || 'Franco',
          irrigationType: target.irrigationType || parentLoc?.irrigationSystem || 'Goteo',
          ownerName: target.ownerName || parentLoc?.ownerName || parentLoc?.responsiblePerson || 'Red Nucleus',
          block: target.block || 'Bloque 1',
          replicate: target.replicate || 1,
          rowDistance: target.rowDistance || 20,
          density: target.density || 48,
          perimeter: target.perimeter || 12
        });
        setIsAddModalOpen(true);
      }
    }
  }, [searchParams, plots, locations]);
  const [filterType, setFilterType] = useState<'all' | 'Ensayo' | 'Producción'>('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const selectedCampaign = activeCampaign;
  const setSelectedCampaign = setActiveCampaign;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [selectedPlotForIdModal, setSelectedPlotForIdModal] = useState<Plot | null>(null);
  const [isProtocolModalOpen, setIsProtocolModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<any>({
      name: '',
      type: 'Ensayo',
      locationId: '',
      projectId: '',
      varietyId: '',
      seedBatchId: '',
      status: 'Activa',
      campaign: '2025/2026',
      activeCampaigns: ['2025/2026', '2026/2027'],
      sowingDate: new Date().toISOString().split('T')[0],
      surfaceArea: 9,
      surfaceUnit: 'm2',
      density: 48,
      rowDistance: 20,
      perimeter: 12,
      block: 'Bloque 1',
      replicate: 1,
      soilType: '',
      irrigationType: '',
      ownerName: '',
      observations: '',
      lat: '',
      lng: '',
      polygon: [],
      usedSeedValue: 0,
      usedSeedUnit: 'kg',
      color: '#10b981',
      samplingResponsibleName: 'Matias QUINTANA',
      sowingResponsibleName: 'Joaquin AREZO',
      technicalResponsibleName: 'Ing. Agr. Julian PIZARRO',
      technicalResponsibleMatricula: 'MP CIAFBA 14.892'
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;
  const isClient = currentUser?.role === 'client';
  const isTechnician = currentUser?.role === 'technician';
  const canManage = isAdmin || isClient || isTechnician;

  const resetForm = () => {
    const defaultLoc = filterLoc !== 'all' ? locations.find(l => l.id === filterLoc) : undefined;
    setFormData({ 
      name: '',
      type: 'Ensayo',
      locationId: defaultLoc?.id || '',
      projectId: projects[0]?.id || '',
      varietyId: '',
      seedBatchId: '', 
      status: 'Activa',
      campaign: selectedCampaign === 'all' ? '2025/2026' : selectedCampaign,
      activeCampaigns: [selectedCampaign === 'all' ? '2025/2026' : selectedCampaign],
      sowingDate: new Date().toISOString().split('T')[0],
      surfaceArea: 9, 
      surfaceUnit: 'm2',
      density: 48,
      rowDistance: 20,
      perimeter: 12,
      block: 'Bloque 1',
      replicate: 1,
      soilType: defaultLoc?.soilType || 'Franco',
      irrigationType: defaultLoc?.irrigationSystem || 'Goteo',
      ownerName: defaultLoc?.ownerName || defaultLoc?.responsiblePerson || 'Red Nucleus',
      lat: defaultLoc?.coordinates?.lat?.toString() || '',
      lng: defaultLoc?.coordinates?.lng?.toString() || '',
      polygon: [],
      usedSeedValue: 0,
      usedSeedUnit: 'kg',
      color: '#10b981',
      samplingResponsibleName: currentUser?.name || 'Matias QUINTANA',
      sowingResponsibleName: 'Joaquin AREZO',
      technicalResponsibleName: 'Ing. Agr. Julian PIZARRO',
      technicalResponsibleMatricula: 'MP CIAFBA 14.892'
    });
    setEditingPlot(null);
  };

  const availableBatches = useMemo(() => {
      return seedBatches.filter(b => {
          if (b.materialType && b.materialType !== 'seed') return false;
          if (!b.isActive || b.remainingQuantity <= 0.001) return false;
          if ((isClient || isTechnician) && currentUser?.clientId) {
              const storage = storagePoints.find(s => s.id === b.storagePointId);
              if (storage && storage.clientId && storage.clientId !== currentUser.clientId) return false;
          }
          return true;
      });
  }, [seedBatches, isClient, isTechnician, currentUser, storagePoints]);

  const availableLocations = useMemo(() => {
      return locations.filter(l => canAccessLocation(currentUser, l, clients));
  }, [locations, currentUser, clients]);

  useEffect(() => {
    if (formData.seedBatchId) {
        const selectedBatch = seedBatches.find(b => b.id === formData.seedBatchId);
        if (selectedBatch) {
            setFormData((prev: any) => ({
                ...prev,
                varietyId: selectedBatch.varietyId || prev.varietyId,
                samplingResponsibleName: selectedBatch.samplerName || prev.samplingResponsibleName || 'Matias QUINTANA',
                technicalResponsibleName: selectedBatch.inspectorName || prev.technicalResponsibleName || 'Ing. Agr. Julian PIZARRO'
            }));
        }
    }
  }, [formData.seedBatchId, seedBatches]);

  const calculatedUsedKg = useMemo(() => {
      const val = Number(formData.usedSeedValue || 0);
      switch(formData.usedSeedUnit) {
          case 'gr': return val / 1000;
          case 'tn': return val * 1000;
          default: return val;
      }
  }, [formData.usedSeedValue, formData.usedSeedUnit]);

  // Filtrado reactivo de parcelas por Campaña, Ubicación, Tipo, Estado y Búsqueda
  const filteredPlots = useMemo(() => plots.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLoc = filterLoc === 'all' || p.locationId === filterLoc;
      const matchType = filterType === 'all' || p.type === filterType;
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      
      // Filtro de Campaña Agrícola
      let matchCampaign = true;
      if (selectedCampaign !== 'all') {
        const campaigns = p.activeCampaigns || (p.campaign ? [p.campaign] : ['2025/2026']);
        matchCampaign = campaigns.includes(selectedCampaign) || p.campaign === selectedCampaign;
      }

      // Regla de Aislamiento de Estructura: Sólo accede a parcelas de su campo asignado
      const hasAccess = canAccessPlot(currentUser, p, locations, clients);
      
      return matchSearch && matchLoc && matchType && matchStatus && matchCampaign && hasAccess;
  }), [plots, searchTerm, filterLoc, filterType, filterStatus, selectedCampaign, currentUser, locations, clients]);

  // Métricas de campaña para la barra de estado
  const campaignStats = useMemo(() => {
    const currentPlots = plots.filter(p => {
      if (selectedCampaign === 'all') return true;
      const campaigns = p.activeCampaigns || (p.campaign ? [p.campaign] : ['2025/2026']);
      return campaigns.includes(selectedCampaign) || p.campaign === selectedCampaign;
    });

    const activeCount = currentPlots.filter(p => p.status === 'Activa').length;
    const pausedCount = currentPlots.filter(p => p.status === 'Pausada' || p.status === 'En Barbecho').length;
    
    const totalHa = currentPlots.reduce((sum, p) => {
      let area = p.surfaceArea || 0;
      if (p.surfaceUnit === 'm2') area = area / 10000;
      if (p.surfaceUnit === 'ac') area = area * 0.404686;
      return sum + area;
    }, 0);

    const totalM2 = currentPlots.reduce((sum, p) => {
      let areaM2 = p.surfaceArea || 0;
      if (p.surfaceUnit === 'ha') areaM2 = areaM2 * 10000;
      if (p.surfaceUnit === 'ac') areaM2 = areaM2 * 4046.86;
      return sum + areaM2;
    }, 0);

    const trialCount = currentPlots.filter(p => p.type === 'Ensayo').length;
    const productionCount = currentPlots.filter(p => p.type === 'Producción').length;

    return {
      totalInCampaign: currentPlots.length,
      activeCount,
      pausedCount,
      totalHa,
      totalM2,
      trialCount,
      productionCount
    };
  }, [plots, selectedCampaign]);

  // Resumen sincronizado de Ciclo Biológico y Fotoperiodo Local (UTC-3) por parcela
  const getPlotSyncSummary = (p: Plot, vari?: Variety, loc?: Location) => {
    const cycleLimit = vari?.cycleDays || 150;
    const sowStr = p.sowingDate || '2026-01-13';
    const sowDate = new Date(`${sowStr}T09:00:00`);
    const now = new Date();
    const rawElapsed = Math.max(1, Math.floor((now.getTime() - sowDate.getTime()) / 86400000));
    const activeDds = Math.min(cycleLimit, rawElapsed);
    const progressPct = Math.min(100, Math.max(0, Math.round((activeDds / cycleLimit) * 100)));

    const stage =
      p.status === 'Cosechada' || progressPct >= 95 ? 'Maduración / Cosecha' :
      progressPct >= 72 ? 'Maduración' :
      progressPct >= 42 ? 'Floración' :
      progressPct >= 12 ? 'Vegetativo' : 'Emergencia';

    const coords =
      p.coordinates && !isNaN(p.coordinates.lat) && p.coordinates.lat !== 0
        ? p.coordinates
        : loc?.coordinates || { lat: -43.308576, lng: -65.289047 };

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
    const cosH = Math.max(-0.999, Math.min(0.999, (Math.cos(zenithRad) / (Math.cos(latRad) * Math.cos(decl))) - Math.tan(latRad) * Math.tan(decl)));
    const hourAngleDeg = (Math.acos(cosH) * 180) / Math.PI;
    const solarNoonMin = 720 - 4 * coords.lng - eqTime - 180; // UTC-3 Argentina
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

  // Alternar rápidamente si una Unidad Productiva está activa en la campaña actual
  const handleTogglePlotCampaign = async (plot: Plot, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManage) return;

    const targetCampaign = selectedCampaign === 'all' ? '2025/2026' : selectedCampaign;
    const currentCampaigns = plot.activeCampaigns || (plot.campaign ? [plot.campaign] : ['2025/2026']);
    const isCurrentlyActiveInCampaign = currentCampaigns.includes(targetCampaign) && plot.status === 'Activa';

    let updatedCampaigns: string[];
    let newStatus: any;

    if (isCurrentlyActiveInCampaign) {
      // Pausar en esta campaña
      updatedCampaigns = currentCampaigns.filter(c => c !== targetCampaign);
      newStatus = 'Pausada';
    } else {
      // Activar en esta campaña
      updatedCampaigns = Array.from(new Set([...currentCampaigns, targetCampaign]));
      newStatus = 'Activa';

      // Si el Campo Padre estaba inactivo en esta campaña, activarlo también
      const parentLoc = locations.find(l => l.id === plot.locationId);
      if (parentLoc) {
        const parentCampaigns = parentLoc.activeCampaigns || ['2024/2025', '2025/2026'];
        if (!parentCampaigns.includes(targetCampaign)) {
          await updateLocation({
            ...parentLoc,
            activeCampaigns: [...parentCampaigns, targetCampaign],
            status: 'Activo'
          });
        }
      }
    }

    await updatePlot({
      ...plot,
      status: newStatus,
      campaign: targetCampaign,
      activeCampaigns: updatedCampaigns
    });
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.locationId || !formData.varietyId || isSaving) {
        alert("Campos requeridos: Nombre, Campo y Variedad Genética.");
        return;
    }

    const selectedBatch = seedBatches.find(b => b.id === formData.seedBatchId);
    
    // FIX: Math Safe Comparison
    const epsilon = 0.0001; 
    const currentStock = Number(selectedBatch?.remainingQuantity || 0);
    const usage = Number(calculatedUsedKg);

    if (selectedBatch && usage > (currentStock + epsilon)) {
        alert(`STOCK INSUFICIENTE: El lote posee ${currentStock.toFixed(3)} kg y se requieren ${usage.toFixed(3)} kg.`);
        return;
    }

    setIsSaving(true);
    try {
        const finalLat = parseFloat(formData.lat || '0');
        const finalLng = parseFloat(formData.lng || '0');
        const coordinates = (!isNaN(finalLat) && !isNaN(finalLng) && finalLat !== 0) ? { lat: finalLat, lng: finalLng } : null;

        const { lat, lng, ...cleanFormData } = formData;

        const assignedCampaign = formData.campaign || (selectedCampaign === 'all' ? '2025/2026' : selectedCampaign);
        const campaignsList = Array.from(new Set([assignedCampaign, ...(formData.activeCampaigns || [])]));

        // Si el campo padre no tenía esta campaña, sincronizarlo
        const parentLoc = locations.find(l => l.id === formData.locationId);
        if (parentLoc) {
          const parentCampaigns = parentLoc.activeCampaigns || ['2024/2025', '2025/2026'];
          if (!parentCampaigns.includes(assignedCampaign)) {
            await updateLocation({
              ...parentLoc,
              activeCampaigns: [...parentCampaigns, assignedCampaign],
              status: 'Activo'
            });
          }
        }

        const payload: Plot = {
            ...cleanFormData,
            id: editingPlot ? editingPlot.id : generateId(),
            responsibleIds: (!isAdmin && currentUser) ? [currentUser.id] : (cleanFormData.responsibleIds || []),
            surfaceArea: Number(formData.surfaceArea),
            density: Number(formData.density),
            campaign: assignedCampaign,
            activeCampaigns: campaignsList,
            coordinates,
            polygon: formData.polygon || []
        };

        let success = false;
        if (editingPlot) {
          success = await updatePlot(payload);
        } else {
          success = await addPlot(payload);
        }
        
        if (success && selectedBatch && usage > 0) {
            let newRemaining = currentStock - usage;
            newRemaining = Math.round(newRemaining * 1000) / 1000;
            if (newRemaining < 0) newRemaining = 0;

            await updateSeedBatch({
                ...selectedBatch,
                remainingQuantity: newRemaining
            });
        }

        if (success) {
            setIsAddModalOpen(false);
            resetForm();
        }
    } finally {
        setIsSaving(false);
    }
  };

  const handleKMLUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          const poly = parseKML(text);
          if (poly && poly.length > 2) {
              const lats = poly.map(p => p.lat);
              const lngs = poly.map(p => p.lng);
              const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
              const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
              const areaM2 = calculateGeodesicArea(poly);
              let areaVal = areaM2;
              let unit = 'm2';
              if (areaM2 > 9000) {
                  areaVal = areaM2 / 10000;
                  unit = 'ha';
              }
              setFormData((prev: any) => ({ ...prev, polygon: poly, surfaceArea: Number(areaVal.toFixed(2)), surfaceUnit: unit, lat: centerLat.toFixed(6), lng: centerLng.toFixed(6) }));
          } else {
              alert("No se pudo extraer un polígono válido del KML.");
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const handlePolygonChange = (newPoly: { lat: number, lng: number }[], areaHa: number, center: { lat: number, lng: number }) => {
      const areaM2 = areaHa * 10000;
      const isMicroPlot = areaM2 > 0 && areaM2 < 2500;
      // Calcular perímetro real Haversine en metros
      const R = 6378137;
      const toRad = (x: number) => (x * Math.PI) / 180;
      let perim = 0;
      if (newPoly.length >= 2) {
        for (let i = 0; i < newPoly.length; i++) {
          const p1 = newPoly[i];
          const p2 = newPoly[(i + 1) % newPoly.length];
          const dLat = toRad(p2.lat - p1.lat);
          const dLng = toRad(p2.lng - p1.lng);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) ** 2;
          perim += 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
      }
      setFormData((prev: any) => ({ 
          ...prev, 
          polygon: newPoly, 
          surfaceArea: areaHa > 0 ? Number((isMicroPlot ? areaM2 : areaHa).toFixed(2)) : prev.surfaceArea, 
          surfaceUnit: areaHa > 0 ? (isMicroPlot ? 'm2' : 'ha') : prev.surfaceUnit,
          perimeter: perim > 0 ? Number(perim.toFixed(1)) : prev.perimeter,
          lat: center.lat.toFixed(6), 
          lng: center.lng.toFixed(6) 
      }));
  };

  const handleDeletePlot = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm("¿Está seguro de eliminar esta unidad productiva?")) {
          deletePlot(id);
      }
  };

  const handleEditPlot = (plot: Plot, e: React.MouseEvent) => {
    e.stopPropagation();
    const parentLoc = locations.find(l => l.id === plot.locationId);
    setEditingPlot(plot);
    setFormData({
      ...plot,
      lat: plot.coordinates?.lat?.toString() || parentLoc?.coordinates?.lat?.toString() || '',
      lng: plot.coordinates?.lng?.toString() || parentLoc?.coordinates?.lng?.toString() || '',
      polygon: plot.polygon || [],
      campaign: plot.campaign || '2025/2026',
      activeCampaigns: plot.activeCampaigns || (plot.campaign ? [plot.campaign] : ['2025/2026']),
      color: plot.color || '#10b981',
      soilType: plot.soilType || parentLoc?.soilType || 'Franco',
      irrigationType: plot.irrigationType || parentLoc?.irrigationSystem || 'Goteo',
      ownerName: plot.ownerName || parentLoc?.ownerName || parentLoc?.responsiblePerson || 'Red Nucleus',
      block: plot.block || 'Bloque 1',
      replicate: plot.replicate || 1,
      rowDistance: plot.rowDistance || 20,
      density: plot.density || 48,
      perimeter: plot.perimeter || 12
    });
    setIsAddModalOpen(true);
  };

  const inputClass = "w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50 font-medium text-xs";
  const labelClass = "text-[10px] font-mono font-bold uppercase mb-1 block text-slate-500 tracking-wider";

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-12">
      
      {/* 1. CABECERA & SELECTOR DE CAMPAÑA AGRÍCOLA */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl md:rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Unidades en Producción
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                <Calendar size={11} className="text-sky-500" />
                Campaña: {selectedCampaign}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                <ShieldCheck size={11} className="text-purple-500" />
                {campaignStats.activeCount} Lotes Activos
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-baseline gap-3">
              <span>Unidades Productivas & Parcelas</span>
              <span className="text-base sm:text-lg font-mono font-medium text-slate-400 hidden sm:inline">
                | {appName}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-2xl">
              Gestión agronómica con herencia automática de suelo, riego y geodesia del sitio padre, trazabilidad INASE y cartografía satelital etiquetada.
            </p>
          </div>

          {/* Acciones principales & alternador de vista */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-sm">
              <button 
                onClick={() => setViewMode('table')} 
                className={`p-2 rounded-lg transition flex items-center gap-1.5 text-xs font-mono font-bold ${viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                title="Vista Tabla Técnica"
              >
                <List size={16}/>
                <span className="hidden xl:inline">Tabla</span>
              </button>
              <button 
                onClick={() => setViewMode('gallery')} 
                className={`p-2 rounded-lg transition flex items-center gap-1.5 text-xs font-mono font-bold ${viewMode === 'gallery' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                title="Vista Tarjetas / Galería"
              >
                <LayoutGrid size={16}/>
                <span className="hidden xl:inline">Tarjetas</span>
              </button>
              <button 
                onClick={() => setViewMode('map')} 
                className={`p-2 rounded-lg transition flex items-center gap-1.5 text-xs font-mono font-bold ${viewMode === 'map' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                title="Vista Cartografía Satelital con Etiquetas de Parcelas"
              >
                <Globe size={16}/>
                <span className="hidden xl:inline">Mapa Geodésico</span>
              </button>
            </div>

            <button
              onClick={() => setIsProtocolModalOpen(true)}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-2"
              title="Consultar y Descargar Protocolo Técnico de Siembra Oficial (Anexo II - PDF)"
            >
              <FileText size={15} className="text-emerald-500" />
              <span className="hidden sm:inline">Protocolo Siembra (Anexo II)</span>
              <span className="sm:hidden">Anexo II</span>
            </button>

            {canManage && (
              <button 
                onClick={() => { resetForm(); setIsAddModalOpen(true); }} 
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 active:scale-95"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Nueva Unidad</span>
              </button>
            )}
          </div>
        </div>

        {/* BARRA DE CAMPAÑA AGRÍCOLA (SINCRONIZACIÓN CON CAMPOS) */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-mono font-black uppercase text-slate-400 tracking-wider mr-1 shrink-0 flex items-center gap-1">
              <Calendar size={12} className="text-emerald-500" />
              Filtrar Campaña:
            </span>
            {CAMPAIGNS.map(camp => (
              <button
                key={camp}
                onClick={() => setSelectedCampaign(camp)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shrink-0 ${
                  selectedCampaign === camp
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {camp} {camp === '2025/2026' ? '(Actual)' : camp === '2026/2027' ? '(Próxima)' : ''}
              </button>
            ))}
            <button
              onClick={() => setSelectedCampaign('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shrink-0 ${
                selectedCampaign === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Todas
            </button>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {campaignStats.activeCount} Activas
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {campaignStats.pausedCount} Pausadas / Barbecho
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              {campaignStats.totalHa.toFixed(1)} Ha Sembradas
            </span>
          </div>
        </div>

        {/* MÉTRICAS RÁPIDAS DE PARCELAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block tracking-wider">Unidades en Vista</span>
            <p className="text-2xl font-mono font-black text-slate-900 dark:text-white">
              {filteredPlots.length} <span className="text-xs font-normal text-slate-400">/ {plots.length} total</span>
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block tracking-wider">Superficie Campaña</span>
            <p className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">
              {campaignStats.totalHa.toFixed(1)} <span className="text-xs font-normal text-slate-400">Ha</span>
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block tracking-wider">Ensayos vs Comercial</span>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-mono font-black text-purple-600 dark:text-purple-400">
                {campaignStats.trialCount} <span className="text-xs font-normal text-slate-400">Ens.</span>
              </p>
              <span className="text-xs font-mono text-slate-400">/ {campaignStats.productionCount} Prod.</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block tracking-wider">Pausadas / Barbecho</span>
            <p className="text-2xl font-mono font-black text-amber-600 dark:text-amber-400">
              {campaignStats.pausedCount} <span className="text-xs font-normal text-slate-400">Lotes</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE BÚSQUEDA Y FILTROS SECUNDARIOS */}
      <div className="bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/>
          <input 
            type="text" 
            placeholder="Buscar por lote o variedad..." 
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>

        <select 
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-bold outline-none dark:text-white" 
          value={filterLoc} 
          onChange={e => setFilterLoc(e.target.value)}
        >
          <option value="all">Todos los Campos / Sitios</option>
          {availableLocations.map(l => (
            <option key={l.id} value={l.id}>{l.name} ({l.city || l.province})</option>
          ))}
        </select>

        <select 
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-bold outline-none dark:text-white" 
          value={filterType} 
          onChange={e => setFilterType(e.target.value as any)}
        >
          <option value="all">Tipos (Todos)</option>
          <option value="Ensayo">Solo Ensayos</option>
          <option value="Producción">Solo Producción</option>
        </select>

        <select 
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-bold outline-none dark:text-white" 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">Estados (Todos)</option>
          <option value="Activa">Solo Activas</option>
          <option value="Pausada">Pausadas / En Barbecho</option>
          <option value="Cosechada">Cosechadas</option>
        </select>
      </div>

      {/* 3. VISTAS DE CONTENIDO: MAPA GEODÉSICO, TABLA O GALERÍA */}
      {viewMode === 'map' ? (
        (() => {
          const activeMapLocation =
            filterLoc !== 'all'
              ? availableLocations.find(l => l.id === filterLoc) || availableLocations[0]
              : availableLocations.find(l => plots.some(p => p.locationId === l.id && p.polygon && p.polygon.length >= 3)) || availableLocations[0];

          const plotsInActiveMapLoc = filteredPlots.filter(p =>
            activeMapLocation ? p.locationId === activeMapLocation.id : true
          );

          const mapPlotLayers = plotsInActiveMapLoc
            .filter(p => p.polygon && p.polygon.length >= 3)
            .map(p => {
              const vari = varieties.find(v => v.id === p.varietyId);
              return {
                id: p.id,
                polygon: p.polygon!,
                label: `${p.name} (${p.surfaceArea} ${p.surfaceUnit})`,
                shortLabel: p.name,
                subLabel: `${vari?.name || 'Ensayo'} · ${p.surfaceArea} ${p.surfaceUnit}`,
                color: p.color || '#10b981'
              };
            });

          const primaryPlot = plotsInActiveMapLoc.find(p => p.polygon && p.polygon.length >= 3);

          return (
            <div className="bg-white dark:bg-slate-900/95 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-mono font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <Globe size={16} className="text-emerald-500" />
                    <span>Cartografía Satelital de Parcelas Etiquetadas — {activeMapLocation?.name || 'Red Experimental'}</span>
                  </h3>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    Suelo heredado: <strong className="text-emerald-600 dark:text-emerald-400">{activeMapLocation?.soilType || 'Franco'}</strong> · Riego: <strong className="text-sky-600 dark:text-sky-400">{activeMapLocation?.irrigationSystem || 'Goteo'}</strong> · {mapPlotLayers.length} polígonos georreferenciados (clic en cualquier parcela para abrir su Ficha Técnica)
                  </p>
                </div>

                {/* Selector rápido de Predio / Sitio Experimental para enfocar el mapa */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {availableLocations.map(locItem => {
                    const countInLoc = plots.filter(pl => pl.locationId === locItem.id).length;
                    const isSelected = activeMapLocation?.id === locItem.id;
                    return (
                      <button
                        key={locItem.id}
                        type="button"
                        onClick={() => setFilterLoc(locItem.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer border ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500/50'
                        }`}
                      >
                        📍 {locItem.name} ({countInLoc})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-[580px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <MapEditor
                  key={`plots-overview-map-${activeMapLocation?.id || 'all'}-${mapPlotLayers.length}`}
                  initialCenter={
                    primaryPlot?.coordinates ||
                    activeMapLocation?.coordinates || { lat: -43.308576, lng: -65.289047 }
                  }
                  initialPolygon={primaryPlot?.polygon || []}
                  polygonLabel={primaryPlot ? `Parcela ${primaryPlot.name} (${primaryPlot.surfaceArea} ${primaryPlot.surfaceUnit})` : 'Parcela'}
                  polygonShortLabel={primaryPlot?.name}
                  polygonSubLabel={
                    primaryPlot
                      ? `${varieties.find(v => v.id === primaryPlot.varietyId)?.name || 'Ensayo'} · ${primaryPlot.surfaceArea} ${primaryPlot.surfaceUnit}`
                      : undefined
                  }
                  referencePolygon={activeMapLocation?.polygon || []}
                  referenceLabel={activeMapLocation ? `Perímetro Campo: ${activeMapLocation.name}` : 'Campo Padre'}
                  extraPolygons={mapPlotLayers.filter(l => l.id !== primaryPlot?.id)}
                  onExtraPolygonClick={targetId => navigate(`/plots/${targetId}`)}
                  readOnly={true}
                  height="100%"
                />
              </div>

              {/* Botonera rápida de acceso directo a las parcelas del sitio */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {plotsInActiveMapLoc.map(pItem => {
                  const vItem = varieties.find(v => v.id === pItem.varietyId);
                  return (
                    <button
                      key={pItem.id}
                      type="button"
                      onClick={() => navigate(`/plots/${pItem.id}`)}
                      className="px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pItem.color || '#10b981' }} />
                      <span>{pItem.name}</span>
                      <span className="text-slate-400">({vItem?.name?.split(' ')[0] || 'Futura'} · {pItem.surfaceArea}{pItem.surfaceUnit})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900/95 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm overflow-x-auto">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-mono font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-4">Unidad / Parcela</th>
                <th className="px-5 py-4">Establecimiento & Herencia</th>
                <th className="px-5 py-4">Genética & Trazabilidad INASE</th>
                <th className="px-5 py-4">Ciclo Fenológico & Siembra</th>
                <th className="px-5 py-4 text-center">Fotoperiodo Local (UTC-3)</th>
                <th className="px-5 py-4 text-right">Superficie / Marco</th>
                <th className="px-5 py-4 text-right">Acciones Técnicas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium font-mono tabular-nums">
              {filteredPlots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-slate-400 font-mono text-xs">
                    Sin unidades productivas para la campaña seleccionada ({selectedCampaign}).
                  </td>
                </tr>
              ) : (
                filteredPlots.map(p => {
                  const loc = locations.find(l => l.id === p.locationId);
                  const vari = varieties.find(v => v.id === p.varietyId);
                  const targetCamp = selectedCampaign === 'all' ? (p.campaign || '2025/2026') : selectedCampaign;
                  const locCampaigns = loc?.activeCampaigns || ['2024/2025', '2025/2026'];
                  const isParentCampoActive = locCampaigns.includes(targetCamp);
                  const isPlotActiveInCampaign = (p.activeCampaigns || [p.campaign || '2025/2026']).includes(targetCamp) && p.status === 'Activa';
                  const sync = getPlotSyncSummary(p, vari, loc);
                  const linkedBatch =
                    seedBatches.find(b => b.id === p.seedBatchId) ||
                    seedBatches.find(b => b.varietyId === p.varietyId && (!b.materialType || b.materialType === 'seed')) ||
                    seedBatches.find(b => !b.materialType || b.materialType === 'seed');

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer group transition-colors"
                      onClick={() => navigate(`/plots/${p.id}`)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || '#10b981' }} />
                          <div>
                            <span className="font-mono font-black text-slate-900 dark:text-white text-xs group-hover:text-emerald-600 transition-colors uppercase block">
                              {p.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                              {p.block || p.type} {p.replicate ? `· Rep. ${p.replicate}` : ''} · {p.campaign || targetCamp}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {loc?.name || 'S/D'}
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                          Suelo: <strong className="text-emerald-600 dark:text-emerald-400">{p.soilType || loc?.soilType || 'Franco'}</strong> · Riego: <strong className="text-sky-600 dark:text-sky-400">{p.irrigationType || loc?.irrigationSystem || 'Goteo'}</strong>
                        </span>
                        <span className="text-[9.5px] font-mono text-slate-400 block">
                          GPS: {sync.coords.lat.toFixed(5)}°, {sync.coords.lng.toFixed(5)}° ({p.polygon?.length || 5} vértices)
                        </span>
                        {!isParentCampoActive && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded mt-0.5 border border-amber-200 dark:border-amber-800">
                            <AlertCircle size={10} /> Campo en Barbecho ({targetCamp})
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-md text-[10px] font-mono font-bold border border-emerald-200 dark:border-emerald-800/60 inline-block">
                            {vari?.name || 'Genética Certificada'}
                          </span>
                          <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              Lote: {linkedBatch?.certificationNumber || linkedBatch?.batchCode || '103'}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              Rótulo INASE: {linkedBatch?.labelSerialNumber || '00000012'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="w-36 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{sync.stage}</span>
                            <span className="text-slate-500">{sync.activeDds}/{sync.cycleLimit}d</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${sync.progressPct}%` }}
                            />
                          </div>
                          <span className="text-[9.5px] text-slate-400 block">
                            Siembra: {sync.sowStr}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex flex-col items-center px-2.5 py-1 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50">
                          <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                            {sync.photoperiodFormatted}
                          </span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400">
                            🌅 {sync.sunriseLocal} · 🌇 {sync.sunsetLocal}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right font-mono text-xs">
                        <strong className="font-black text-slate-900 dark:text-white block">
                          {p.surfaceArea} {p.surfaceUnit}
                        </strong>
                        <span className="text-[9.5px] text-slate-400 block">
                          {p.density || 48} pl/m² · {p.rowDistance || 20} cm
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          {canManage && (
                            <button
                              onClick={e => handleEditPlot(p, e)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 rounded-lg transition cursor-pointer"
                              title="Editar Unidad Productiva"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedPlotForIdModal(p);
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Rótulo QR y Cartel Oficial de Tranquera (Ley 27.669)"
                          >
                            <QrCode size={13} />
                          </button>

                          {canManage && p.status === 'Activa' && (
                            <button
                              type="button"
                              onClick={async e => {
                                e.stopPropagation();
                                await closePlotCycle(p.id, {
                                  notes: `Cierre de ciclo certificado desde padrón de parcelas (${targetCamp}).`
                                });
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                              title="Cerrar ciclo / Cosechar parcela (Desaparece del Dashboard Operativo Activo)"
                            >
                              <Archive size={10} />
                              <span>Cerrar Ciclo</span>
                            </button>
                          )}

                          {canManage && p.status === 'Cosechada' && (
                            <button
                              type="button"
                              onClick={async e => {
                                e.stopPropagation();
                                await reopenPlotCycle(p.id, targetCamp);
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                              title="Reabrir ciclo en campaña activa"
                            >
                              <CheckCircle2 size={10} />
                              <span>Reabrir</span>
                            </button>
                          )}

                          {canManage && (
                            <button
                              onClick={e => handleTogglePlotCampaign(p, e)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase flex items-center gap-1 transition cursor-pointer ${
                                isPlotActiveInCampaign
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              }`}
                            >
                              <Power size={10} />
                              <span>{isPlotActiveInCampaign ? 'Pausar' : 'Activar'}</span>
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={e => handleDeletePlot(e, p.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                              title="Eliminar Unidad"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}

                          <ChevronRight size={14} className="text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPlots.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900/90 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 space-y-3">
              <Sprout size={40} className="mx-auto text-slate-400" />
              <h3 className="font-mono font-black text-base text-slate-700 dark:text-slate-300 uppercase">
                No hay unidades registradas para esta campaña
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                Prueba cambiando el filtro de campaña ({selectedCampaign}) o crea una nueva unidad productiva.
              </p>
            </div>
          ) : (
            filteredPlots.map(p => {
              const loc = locations.find(l => l.id === p.locationId);
              const vari = varieties.find(v => v.id === p.varietyId);
              const targetCamp = selectedCampaign === 'all' ? (p.campaign || '2025/2026') : selectedCampaign;
              const locCampaigns = loc?.activeCampaigns || ['2024/2025', '2025/2026'];
              const isParentCampoActive = locCampaigns.includes(targetCamp);
              const isPlotActiveInCampaign = (p.activeCampaigns || [p.campaign || '2025/2026']).includes(targetCamp) && p.status === 'Activa';
              const sync = getPlotSyncSummary(p, vari, loc);
              const linkedBatch =
                seedBatches.find(b => b.id === p.seedBatchId) ||
                seedBatches.find(b => b.varietyId === p.varietyId && (!b.materialType || b.materialType === 'seed')) ||
                seedBatches.find(b => !b.materialType || b.materialType === 'seed');

              return (
                <div
                  key={p.id}
                  className={`bg-white dark:bg-slate-900/95 rounded-2xl border transition-all flex flex-col h-full overflow-hidden group hover:shadow-md ${
                    !isPlotActiveInCampaign || !isParentCampoActive
                      ? 'border-slate-200/60 dark:border-slate-800/80 opacity-85 hover:opacity-100'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40'
                  }`}
                >
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3.5">
                      {/* Cabecera de la Tarjeta */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                            style={{ backgroundColor: p.color || '#10b981' }}
                          >
                            <Sprout size={19} />
                          </div>
                          <div>
                            <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                              {p.type} · Campaña {p.campaign || targetCamp}
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
                          className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono font-black uppercase shrink-0 border ${
                            p.status === 'Activa'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          ● {p.status}
                        </span>
                      </div>

                      {/* Campo Padre y Geodesia */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1.5 truncate">
                          <MapPin size={12} className="text-emerald-500 shrink-0" />
                          <Link
                            to={`/locations?search=${encodeURIComponent(loc?.name || '')}`}
                            className="hover:text-emerald-600 dark:hover:text-emerald-400 font-bold text-slate-700 dark:text-slate-200 truncate"
                          >
                            {loc?.name || 'S/D'} ({loc?.city || loc?.province})
                          </Link>
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                          {p.polygon?.length || 4} vértices
                        </span>
                      </div>

                      {/* Barra de Sincronización de Ciclo Fenológico y Fotoperiodo Local */}
                      <div className="p-3 rounded-xl bg-slate-900 text-white font-mono tabular-nums space-y-2">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-emerald-400 font-bold uppercase">
                            {sync.stage} (Siembra {sync.sowStr})
                          </span>
                          <span className="text-slate-300 font-bold">
                            {sync.activeDds}/{sync.cycleLimit} DDS ({sync.progressPct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
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

                      {/* Grid de Métricas: Superficie & Cultivar */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono tabular-nums">
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[8.5px] font-bold uppercase text-slate-400 block">Superficie & Perímetro</span>
                          <strong className="text-xs font-black text-slate-900 dark:text-slate-100 block mt-0.5">
                            {p.surfaceArea} {p.surfaceUnit} <span className="text-[10px] font-normal text-slate-400">({p.perimeter || 12}m)</span>
                          </strong>
                        </div>

                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[8.5px] font-bold uppercase text-slate-400 block">Cultivar Homologado</span>
                          <strong className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate block mt-0.5" title={vari?.name}>
                            {vari?.name || 'Certificada'}
                          </strong>
                        </div>
                      </div>

                      {/* Bloque de Herencia Agronómica del Sitio Padre & Diseño Experimental DBCA */}
                      <div className="grid grid-cols-3 gap-1.5 text-[9.5px] font-mono tabular-nums">
                        <div className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 truncate">
                          <span className="text-[8px] text-slate-400 uppercase block">Diseño DBCA</span>
                          <strong className="text-indigo-600 dark:text-indigo-400">{p.block || 'Bloque 1'} · R{p.replicate || 1}</strong>
                        </div>
                        <div className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 truncate">
                          <span className="text-[8px] text-slate-400 uppercase block">Suelo (Heredado)</span>
                          <strong className="text-emerald-600 dark:text-emerald-400">{p.soilType || loc?.soilType || 'Franco'}</strong>
                        </div>
                        <div className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 truncate">
                          <span className="text-[8px] text-slate-400 uppercase block">Riego / Marco</span>
                          <strong className="text-sky-600 dark:text-sky-400">{p.irrigationType || loc?.irrigationSystem || 'Goteo'} · {p.density || 48}pl</strong>
                        </div>
                      </div>

                      {/* Bloque de Lote de Semilla INASE */}
                      <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-[10px] font-mono tabular-nums space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 truncate">
                            <Award size={11} className="text-emerald-600 shrink-0" />
                            N° Lote Semilla: {linkedBatch?.certificationNumber || linkedBatch?.batchCode || '103'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-[8.5px] border border-emerald-500/20 shrink-0">
                            Rótulo {linkedBatch?.labelSerialNumber || '00000012'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400">
                          <span className="truncate">Código: {linkedBatch?.batchCode || 'FUT-83-25-HEM'}</span>
                          <span className="shrink-0 font-bold">Resp: {p.samplingResponsibleName || linkedBatch?.samplerName || 'M. Quintana'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones Inferiores */}
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
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedPlotForIdModal(p);
                        }}
                        className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 rounded-xl transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                        title="Rótulo QR y Cartel Oficial de Tranquera (Ley 27.669)"
                      >
                        <QrCode size={14} />
                      </button>

                      {canManage && (
                        <button
                          onClick={e => handleEditPlot(p, e)}
                          className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 rounded-xl transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                          title="Editar Parcela"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={e => handleDeletePlot(e, p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          title="Eliminar Unidad"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. MODAL DE ALTA / EDICIÓN DE UNIDAD PRODUCTIVA */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl max-w-6xl w-full p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                  <Sprout size={24} />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingPlot ? 'Editar Unidad Productiva' : 'Nueva Unidad Productiva / Parcela'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Protocolo agronómico, trazabilidad de siembra y asignación de campaña.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => !isSaving && setIsAddModalOpen(false)} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* COLUMNA 1: ATRIBUCIÓN TERRITORIAL Y CAMPAÑA */}
                <div className="space-y-5">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <MapPin size={14} className="text-emerald-500" />
                      <span>Atribución Territorial & Campaña</span>
                    </h3>

                    <div>
                      <label className={labelClass}>Identificador Parcela / Lote *</label>
                      <input 
                        required 
                        placeholder="Ej: LOTE-01 / SECTOR-A / SALA-INDOOR-1" 
                        className={inputClass} 
                        value={formData.name} 
                        onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} 
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Campo / Sitio Padre * (Hereda Suelo, Riego y Geodesia)</label>
                      <select 
                        required 
                        className={inputClass} 
                        value={formData.locationId} 
                        onChange={e => {
                          const chosenLocId = e.target.value;
                          const chosenLoc = locations.find(l => l.id === chosenLocId);
                          const updates: any = {
                            locationId: chosenLocId,
                            soilType: chosenLoc?.soilType || 'Franco',
                            irrigationType: chosenLoc?.irrigationSystem || 'Goteo',
                            ownerName: chosenLoc?.ownerName || chosenLoc?.responsiblePerson || 'Red Nucleus'
                          };
                          if (chosenLoc?.coordinates?.lat && chosenLoc?.coordinates?.lng) {
                            if (!formData.polygon || formData.polygon.length === 0) {
                              updates.lat = chosenLoc.coordinates.lat.toString();
                              updates.lng = chosenLoc.coordinates.lng.toString();
                            }
                          }
                          setFormData((prev: any) => ({ ...prev, ...updates }));
                        }}
                      >
                        <option value="">Seleccionar campo...</option>
                        {availableLocations.map(l => (
                          <option key={l.id} value={l.id}>
                            {l.name} ({l.siteType || 'Campo'} · {l.city || l.province})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* SELECTOR DE CAMPAÑA AGRÍCOLA (REQUERIMIENTO CLAVE) */}
                    <div>
                      <label className={labelClass}>Campaña Agrícola Asignada *</label>
                      <select 
                        required 
                        className={inputClass} 
                        value={formData.campaign} 
                        onChange={e => setFormData({ ...formData, campaign: e.target.value })}
                      >
                        {CAMPAIGNS.map(c => (
                          <option key={c} value={c}>
                            Campaña {c} {c === '2025/2026' ? '(Actual)' : c === '2026/2027' ? '(Próxima)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className={labelClass}>Tipo de Unidad</label>
                        <select 
                          className={inputClass} 
                          value={formData.type} 
                          onChange={e => setFormData({ ...formData, type: e.target.value })}
                        >
                          <option value="Ensayo">Ensayo / Microparcela</option>
                          <option value="Producción">Lote Comercial</option>
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Estado Operativo</label>
                        <select 
                          className={inputClass} 
                          value={formData.status} 
                          onChange={e => setFormData({ ...formData, status: e.target.value })}
                        >
                          <option value="Activa">Activa en Producción</option>
                          <option value="Pausada">Pausada en Campaña</option>
                          <option value="En Barbecho">En Barbecho</option>
                          <option value="Cosechada">Cosechada</option>
                          <option value="Cancelada">Cancelada</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* PANEL DE ATRIBUTOS HEREDADOS DEL SITIO PADRE & DISEÑO DBCA */}
                  <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Layers size={13} className="text-emerald-600" />
                        <span>Herencia del Sitio & Diseño DBCA</span>
                      </h3>
                      {formData.locationId && (
                        <button
                          type="button"
                          onClick={() => {
                            const parentLoc = locations.find(l => l.id === formData.locationId);
                            if (parentLoc) {
                              setFormData((prev: any) => ({
                                ...prev,
                                soilType: parentLoc.soilType || 'Franco',
                                irrigationType: parentLoc.irrigationSystem || 'Goteo',
                                ownerName: parentLoc.ownerName || parentLoc.responsiblePerson || 'Red Nucleus'
                              }));
                            }
                          }}
                          className="text-[9.5px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 cursor-pointer"
                        >
                          ↻ Re-sincronizar del Campo
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className={labelClass}>Suelo (Heredado)</label>
                        <input
                          className={inputClass}
                          placeholder="Ej: Franco Arenoso"
                          value={formData.soilType || ''}
                          onChange={e => setFormData({ ...formData, soilType: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Sistema Riego (Heredado)</label>
                        <input
                          className={inputClass}
                          placeholder="Ej: Goteo Automatizado"
                          value={formData.irrigationType || ''}
                          onChange={e => setFormData({ ...formData, irrigationType: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Bloque Experimental</label>
                        <input
                          className={inputClass}
                          placeholder="Ej: Bloque 1"
                          value={formData.block || ''}
                          onChange={e => setFormData({ ...formData, block: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Repetición DBCA</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          className={inputClass}
                          value={formData.replicate || 1}
                          onChange={e => setFormData({ ...formData, replicate: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Densidad Obj. (pl/m²)</label>
                        <input
                          type="number"
                          step="1"
                          className={inputClass}
                          value={formData.density || 48}
                          onChange={e => setFormData({ ...formData, density: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Dist. Hileras (cm)</label>
                        <input
                          type="number"
                          step="1"
                          className={inputClass}
                          value={formData.rowDistance || 20}
                          onChange={e => setFormData({ ...formData, rowDistance: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Palette size={14} className="text-emerald-500" />
                      <span>Color de Identificación</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      {COLOR_PALETTE.map((swatch) => (
                        <button 
                          key={swatch.color} 
                          type="button" 
                          title={swatch.label} 
                          onClick={() => setFormData({ ...formData, color: swatch.color })} 
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${
                            formData.color === swatch.color ? 'scale-110 border-slate-900 dark:border-white shadow-md' : 'border-transparent hover:scale-105'
                          }`} 
                          style={{ backgroundColor: swatch.color }} 
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* COLUMNA 2: GENÉTICA Y PROTOCOLO DE SIEMBRA */}
                <div className="space-y-5">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <FlaskConical size={14} />
                        <span>Genética & Insumos</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsProtocolModalOpen(true)}
                        className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800"
                        title="Ver pautas técnicas y dosis de 50 kg/Ha"
                      >
                        <FileText size={11} />
                        <span>Anexo II (50 kg/Ha)</span>
                      </button>
                    </div>

                    <div>
                      <label className={labelClass}>Variedad Genética *</label>
                      <select 
                        required 
                        className={inputClass} 
                        value={formData.varietyId} 
                        onChange={e => setFormData({ ...formData, varietyId: e.target.value })}
                      >
                        <option value="">Seleccionar cultivar...</option>
                        {varieties.map(v => (
                          <option key={v.id} value={v.id}>{v.name} ({v.usage})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Lote Maestro de Semilla Homologado</label>
                      <select 
                        className={inputClass} 
                        value={formData.seedBatchId} 
                        onChange={e => setFormData({ ...formData, seedBatchId: e.target.value })}
                      >
                        <option value="">Seleccione lote de semilla homologado...</option>
                        {availableBatches.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.batchCode} · {b.qualityGrade === 'GRADO_B_ESTANDAR' ? 'Grado B' : 'Grado A Élite'} ({Number(b.remainingQuantity.toFixed(1))} kg disp.)
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const selB = seedBatches.find(b => b.id === formData.seedBatchId);
                        if (!selB) return null;
                        return (
                          <div className="mt-1.5 p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono flex items-center justify-between">
                            <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                              Calidad: {selB.qualityGrade === 'GRADO_B_ESTANDAR' ? 'Grado B Estándar' : 'Grado A Élite'} ({selB.qualityScore || 96}/100) · PG {selB.germination || 94}%
                            </span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                              Muestreo: {selB.samplerName || 'M. Quintana'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Dosis de Semilla</label>
                        <input 
                          type="number" 
                          step="any" 
                          min="0" 
                          className={inputClass} 
                          value={formData.usedSeedValue} 
                          onChange={e => setFormData({ ...formData, usedSeedValue: Number(e.target.value) })} 
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Unidad Dosis</label>
                        <select 
                          className={inputClass} 
                          value={formData.usedSeedUnit} 
                          onChange={e => setFormData({ ...formData, usedSeedUnit: e.target.value as any })}
                        >
                          <option value="kg">KG</option>
                          <option value="gr">GR</option>
                          <option value="tn">TN</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* PERSONAL INTERVINIENTE EN MUESTREO, SIEMBRA Y TRAZABILIDAD */}
                  <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/25 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 space-y-2.5">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                      <UserCheck size={14} className="text-indigo-600" />
                      <span>Personal Interviniente (Muestreo & Siembra)</span>
                    </h3>
                    <div>
                      <label className={labelClass}>Responsable Toma de Muestras en Lote</label>
                      <input
                        className={inputClass}
                        placeholder="Ej: Matias QUINTANA"
                        value={formData.samplingResponsibleName || ''}
                        onChange={e => setFormData({ ...formData, samplingResponsibleName: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className={labelClass}>Jefe Operativo de Siembra</label>
                        <input
                          className={inputClass}
                          placeholder="Ej: Joaquin AREZO"
                          value={formData.sowingResponsibleName || ''}
                          onChange={e => setFormData({ ...formData, sowingResponsibleName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Director Técnico Agrónomo</label>
                        <input
                          className={inputClass}
                          placeholder="Ej: Ing. Agr. Julian PIZARRO"
                          value={formData.technicalResponsibleName || ''}
                          onChange={e => setFormData({ ...formData, technicalResponsibleName: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar size={14} className="text-emerald-500" />
                      <span>Superficie & Fecha</span>
                    </h3>

                    <div>
                      <label className={labelClass}>Fecha de Siembra / Inicio</label>
                      <input 
                        type="date" 
                        className={inputClass} 
                        value={formData.sowingDate} 
                        onChange={e => setFormData({ ...formData, sowingDate: e.target.value })} 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Superficie</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          className={inputClass} 
                          value={formData.surfaceArea} 
                          onChange={e => setFormData({ ...formData, surfaceArea: Number(e.target.value) })} 
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Unidad</label>
                        <select 
                          className={inputClass} 
                          value={formData.surfaceUnit} 
                          onChange={e => setFormData({ ...formData, surfaceUnit: e.target.value as any })}
                        >
                          <option value="ha">Hectáreas (Ha)</option>
                          <option value="m2">Metros² (M2)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Observaciones Iniciales</label>
                      <textarea 
                        className={`${inputClass} h-16 resize-none`} 
                        value={formData.observations} 
                        onChange={e => setFormData({ ...formData, observations: e.target.value })} 
                        placeholder="Densidad objetivo, sistema de riego, laboreo..." 
                      />
                    </div>
                  </div>
                </div>

                {/* COLUMNA 3: GEOLOCALIZACIÓN Y POLÍGONO */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex-1 flex flex-col min-h-[380px]">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Globe size={14} className="text-emerald-500" />
                        <span>Polígono & Coordenadas GPS</span>
                      </h3>
                      <div className="flex gap-2">
                        <input type="file" accept=".kml" ref={fileInputRef} className="hidden" onChange={handleKMLUpload} />
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()} 
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1 hover:bg-slate-100"
                        >
                          <FileUp size={11} /> KML
                        </button>
                      </div>
                    </div>

                    {/* Referencia contextual del Campo Padre */}
                    {(() => {
                      const parentLoc = locations.find(l => l.id === formData.locationId);
                      if (!parentLoc) return null;
                      return (
                        <div className="mb-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <MapPin size={13} className="text-emerald-500 shrink-0" />
                            <span>Campo Padre: <strong>{parentLoc.name}</strong> ({parentLoc.city || parentLoc.province})</span>
                          </span>
                          {parentLoc.polygon && parentLoc.polygon.length > 2 && (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-bold bg-emerald-100/70 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                              Perímetro del campo visible
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    <div className="flex-1 min-h-[260px] rounded-xl overflow-hidden mb-3 bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <MapEditor 
                        key={`plot-map-${formData.locationId || 'default'}-${editingPlot?.id || 'new'}`}
                        initialCenter={
                          formData.lat && formData.lng && !isNaN(parseFloat(formData.lat)) && !isNaN(parseFloat(formData.lng)) 
                            ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) } 
                            : (locations.find(l => l.id === formData.locationId)?.coordinates || undefined)
                        } 
                        initialPolygon={formData.polygon || []} 
                        referencePolygon={locations.find(l => l.id === formData.locationId)?.polygon || []}
                        extraPolygons={
                          formData.locationId
                            ? plots
                                .filter(sp => sp.locationId === formData.locationId && sp.id !== editingPlot?.id && sp.polygon && sp.polygon.length >= 3)
                                .map(sp => ({
                                  id: sp.id,
                                  polygon: sp.polygon!,
                                  label: `${sp.name} (${sp.surfaceArea} ${sp.surfaceUnit})`,
                                  shortLabel: sp.name,
                                  subLabel: `${sp.surfaceArea} ${sp.surfaceUnit}`,
                                  color: sp.color || '#0284c7'
                                }))
                            : []
                        }
                        polygonLabel={formData.name ? `Parcela ${formData.name}` : 'Perímetro Parcela'}
                        polygonShortLabel={formData.name || 'NUEVA PARCELA'}
                        polygonSubLabel={`${formData.surfaceArea || 9} ${formData.surfaceUnit || 'm2'}`}
                        referenceLabel={locations.find(l => l.id === formData.locationId)?.name ? `Límite Campo: ${locations.find(l => l.id === formData.locationId)?.name}` : 'Perímetro Campo Padre'}
                        onPolygonChange={handlePolygonChange} 
                        height="100%" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Latitud</label>
                        <input 
                          placeholder="-33.1235" 
                          className={inputClass} 
                          value={formData.lat} 
                          onChange={e => setFormData({ ...formData, lat: e.target.value })} 
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Longitud</label>
                        <input 
                          placeholder="-64.3492" 
                          className={inputClass} 
                          value={formData.lng} 
                          onChange={e => setFormData({ ...formData, lng: e.target.value })} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Botonera de Guardado */}
              <div className="flex justify-end pt-5 border-t border-slate-100 dark:border-slate-800 gap-3">
                <button 
                  type="button" 
                  disabled={isSaving} 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="px-5 py-2.5 text-slate-500 font-mono font-bold uppercase text-xs hover:text-slate-700"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving} 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition disabled:opacity-50 active:scale-95"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  <span>{editingPlot ? 'Actualizar Unidad' : 'Registrar Unidad'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPlotForIdModal && (
        <PlotIdentificationModal
          isOpen={!!selectedPlotForIdModal}
          onClose={() => setSelectedPlotForIdModal(null)}
          plot={selectedPlotForIdModal}
          location={locations.find(l => l.id === selectedPlotForIdModal.locationId)}
          variety={varieties.find(v => v.id === selectedPlotForIdModal.varietyId)}
          client={clients?.find(c => c.id === locations.find(l => l.id === selectedPlotForIdModal.locationId)?.clientId)}
          seedBatch={
            seedBatches.find(b => b.id === selectedPlotForIdModal.seedBatchId) ||
            seedBatches.find(b => b.varietyId === selectedPlotForIdModal.varietyId && (!b.materialType || b.materialType === 'seed')) ||
            seedBatches.find(b => !b.materialType || b.materialType === 'seed') ||
            seedBatches[0]
          }
        />
      )}

      {/* MODAL OFICIAL: PROTOCOLO TÉCNICO DE SIEMBRA ANEXO II */}
      <SeedingProtocolModal
        isOpen={isProtocolModalOpen}
        onClose={() => setIsProtocolModalOpen(false)}
      />

    </div>
  );
}
