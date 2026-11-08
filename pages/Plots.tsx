import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Plot, Variety, Location, Project, TrialRecord, SeedBatch, CAMPAIGNS } from '../types';
import { 
  ChevronRight, LayoutGrid, List, Tag, FlaskConical, 
  Trash2, Edit2, QrCode, X, Save, Search, Filter, 
  MapPin, Calendar, Sprout, Printer, Activity, Plus, Loader2, Info, FolderKanban, FileUp,
  Link as LinkIcon, Scale, Box, Weight, Archive, Globe, LayoutDashboard, Eye, Palette,
  Power, AlertCircle, CheckCircle2, ShieldCheck, Tractor, Layers, Clock, FileText, Download, UserCheck, Award, Lock, ScanLine
} from 'lucide-react';
import MapEditor from '../components/MapEditor';
import { PlotIdentificationModal } from '../components/PlotIdentificationModal';
import { PlotCycleClosureModal } from '../components/PlotCycleClosureModal';
import { BarcodeSVG } from '../components/BarcodeSVG';
import SeedingProtocolModal from '../components/SeedingProtocolModal';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { canAccessPlot, canAccessLocation } from '../src/utils/structurePermissions';
import {
  formatPlotSeedLoad,
  convertSeedMassToKg,
  convertKgToUnit,
  formatBatchMassKg
} from '../src/utils/seedTraceability';
import {
  sanitizePlotInputText,
  canUserEditOrMutatePlot,
  computeDifferentialSeedStockAdjustment,
  generateGeodesicPolygonFromSurface,
  evaluatePlotRelationalHealth
} from '../src/utils/plotManagementUtils';
import { DateInputAr } from '../src/components/DateInputAr';
import { formatDateAr } from '../src/utils/dateFormat';

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
    plots, locations, varieties, projects, currentUser, usersList, clients,
    seedBatches, deletePlot, updatePlot, 
    addPlot, updateLocation, updateSeedBatch, storagePoints, appName,
    activeCampaign, setActiveCampaign, closePlotCycle, reopenPlotCycle, tasks,
    trialRecords, agrochemicalApplications
  } = useAppContext();

  const ROLE_BADGE_LABELS: Record<string, string> = {
    super_admin: 'Super Admin / Dirección',
    admin: 'Admin / Director Proyecto',
    technician: 'Técnico / Ing. Agrónomo',
    client: 'Socio Productor / Titular',
    viewer: 'Auditor / Consultor Agrónomo'
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'table' | 'gallery' | 'map'>('gallery');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLoc, setFilterLoc] = useState<string>(searchParams.get('locationId') || 'all');

  const [filterType, setFilterType] = useState<'all' | 'Ensayo' | 'Producción'>('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const selectedCampaign = activeCampaign;
  const setSelectedCampaign = setActiveCampaign;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editModalTab, setEditModalTab] = useState<'agronomic' | 'traceability' | 'map'>('agronomic');
  const [formFeedback, setFormFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [plotPendingDelete, setPlotPendingDelete] = useState<Plot | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [selectedPlotForIdModal, setSelectedPlotForIdModal] = useState<Plot | null>(null);
  const [selectedPlotForClosureModal, setSelectedPlotForClosureModal] = useState<Plot | null>(null);
  const [isProtocolModalOpen, setIsProtocolModalOpen] = useState(false);
  const [isSeedScannerOpen, setIsSeedScannerOpen] = useState(false);
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
      samplingResponsibleName: currentUser?.name || 'Gastón BAREA M.',
      sowingResponsibleName: currentUser?.name || 'Gastón BAREA M.',
      technicalResponsibleName: 'Gastón BAREA M.',
      technicalResponsibleMatricula: 'MP CIAFBA 14.892'
  });

  // Usuarios declarados y habilitados para el establecimiento seleccionado (+ Dirección Central)
  const declaredSystemUsers = useMemo(() => {
    const activeLocId = formData.locationId || (filterLoc !== 'all' ? filterLoc : '');
    const selectedLoc = locations.find(l => l.id === activeLocId);
    const targetClientId = selectedLoc?.clientId || currentUser?.clientId || null;

    const filteredUsers = (usersList || []).filter(u => {
      if (u.accessScope === 'event_attendee') return false;
      if (u.role === 'super_admin' || u.role === 'admin') return true;
      if (!targetClientId) return true;
      if (u.clientId && String(u.clientId) === String(targetClientId)) return true;
      if (selectedLoc?.responsibleIds?.includes(u.id)) return true;
      return false;
    });

    return filteredUsers.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      jobTitle: u.jobTitle || ROLE_BADGE_LABELS[u.role] || 'Personal Declarado',
      roleLabel: ROLE_BADGE_LABELS[u.role] || u.role,
      displayOption: `${u.name} — [${ROLE_BADGE_LABELS[u.role] || u.role}${u.jobTitle ? ` · ${u.jobTitle}` : ''}]`
    }));
  }, [usersList, formData.locationId, filterLoc, locations, currentUser]);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;
  const isClient = currentUser?.role === 'client';
  const isTechnician = currentUser?.role === 'technician';
  const canManage = (isAdmin || isClient || isTechnician) && currentUser?.accessScope !== 'event_attendee';

  useEffect(() => {
    const locParam = searchParams.get('locationId');
    if (locParam) {
      setFilterLoc(locParam);
    }
    const editId = searchParams.get('editPlotId');
    const tabParam = searchParams.get('tab');
    if (editId && plots.length > 0) {
      const target = plots.find(p => p.id === editId);
      if (target) {
        const perm = canUserEditOrMutatePlot(currentUser, target, locations, clients);
        if (!perm.allowed) return;
        const parentLoc = locations.find(l => l.id === target.locationId);
        setEditingPlot(target);
        setFormFeedback(null);
        setEditModalTab(tabParam === 'map' ? 'map' : tabParam === 'traceability' ? 'traceability' : 'agronomic');
        setFormData({
          ...target,
          projectId: target.projectId || parentLoc?.projectId || projects[0]?.id || '',
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
          perimeter: target.perimeter || 12,
          usedSeedValue: target.usedSeedValue !== undefined ? target.usedSeedValue : Number(target.usedSeedQuantity || 0),
          usedSeedUnit: target.usedSeedValue !== undefined ? (target.usedSeedUnit || 'kg') : 'kg',
          technicalResponsibleMatricula: target.technicalResponsibleMatricula || 'MP CIAFBA 14.892'
        });
        setIsAddModalOpen(true);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('editPlotId');
        nextParams.delete('tab');
        setSearchParams(nextParams, { replace: true });
      }
    }
  }, [searchParams, setSearchParams, plots, locations, currentUser, clients, projects]);

  const getEstablishmentDefaults = (locId?: string) => {
    const idStr = String(locId || '');
    if (idStr === '1766444697119') {
      return { sampler: 'Ricardo La Regina', sower: 'Ricardo La Regina', tech: 'Gastón BAREA M.' };
    }
    if (idStr === '1766471895190') {
      return { sampler: 'Joaquin AREZO', sower: 'Joaquin AREZO', tech: 'Gastón BAREA M.' };
    }
    if (idStr === '1766450631873') {
      return { sampler: 'Matias QUINTANA', sower: 'Matias QUINTANA', tech: 'Julian PIZARRO' };
    }
    return {
      sampler: currentUser?.name || 'Gastón BAREA M.',
      sower: currentUser?.name || 'Gastón BAREA M.',
      tech: 'Gastón BAREA M.'
    };
  };

  const resetForm = () => {
    const defaultLoc = filterLoc !== 'all' ? locations.find(l => l.id === filterLoc) : locations[0];
    const defs = getEstablishmentDefaults(defaultLoc?.id);
    const defaultBatch = seedBatches.find(b => (!b.materialType || b.materialType === 'seed') && b.isActive && b.remainingQuantity > 0.0001);
    setFormData({ 
      name: '',
      type: 'Ensayo',
      locationId: defaultLoc?.id || '',
      projectId: projects[0]?.id || '',
      varietyId: defaultBatch?.varietyId || varieties[0]?.id || '',
      seedBatchId: defaultBatch?.id || '', 
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
      samplingResponsibleName: defs.sampler,
      sowingResponsibleName: defs.sower,
      technicalResponsibleName: defs.tech,
      technicalResponsibleMatricula: 'MP CIAFBA 14.892'
    });
    setEditingPlot(null);
  };

  const availableBatches = useMemo(() => {
      return seedBatches.filter(b => {
          if (b.materialType && b.materialType !== 'seed') return false;
          // Mantener siempre visible el lote actualmente asignado a la parcela en edición aunque su remanente sea 0 kg
          if (b.id === formData.seedBatchId || (editingPlot && b.id === editingPlot.seedBatchId)) {
              return true;
          }
          if (!b.isActive || b.remainingQuantity <= 0.0001) return false;
          if ((isClient || isTechnician) && currentUser?.clientId) {
              const storage = storagePoints.find(s => s.id === b.storagePointId);
              if (storage && storage.clientId && storage.clientId !== currentUser.clientId) return false;
          }
          return true;
      });
  }, [seedBatches, isClient, isTechnician, currentUser, storagePoints, formData.seedBatchId, editingPlot]);

  const availableLocations = useMemo(() => {
      return locations.filter(l => canAccessLocation(currentUser, l, clients));
  }, [locations, currentUser, clients]);

  useEffect(() => {
    if (formData.seedBatchId) {
        const selectedBatch = seedBatches.find(b => b.id === formData.seedBatchId);
        if (selectedBatch) {
            const allowedNames = new Set(declaredSystemUsers.map(u => u.name));
            setFormData((prev: any) => ({
                ...prev,
                varietyId: selectedBatch.varietyId || prev.varietyId,
                samplingResponsibleName: (selectedBatch.samplerName && allowedNames.has(selectedBatch.samplerName))
                    ? selectedBatch.samplerName
                    : prev.samplingResponsibleName,
                technicalResponsibleName: (selectedBatch.inspectorName && allowedNames.has(selectedBatch.inspectorName))
                    ? selectedBatch.inspectorName
                    : prev.technicalResponsibleName
            }));
        }
    }
  }, [formData.seedBatchId, seedBatches, declaredSystemUsers]);

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

  // Parcelas visibles según rol y establecimiento del usuario actual
  const accessiblePlots = useMemo(() => {
    return plots.filter(p => canAccessPlot(currentUser, p, locations, clients));
  }, [plots, currentUser, locations, clients]);

  // Métricas de campaña para la barra de estado (respetando aislamiento por rol)
  const campaignStats = useMemo(() => {
    const currentPlots = accessiblePlots.filter(p => {
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
  }, [accessiblePlots, selectedCampaign]);

  // Resumen sincronizado de Ciclo Biológico y Fotoperiodo Local (UTC-3) por parcela
  const getPlotSyncSummary = (p: Plot, vari?: Variety, loc?: Location) => {
    const cycleLimit = vari?.cycleDays || 150;
    const rawSowStr = p.sowingDate || '2026-01-13';
    const sowStr = formatDateAr(rawSowStr);
    const sowDate = new Date(`${rawSowStr}T09:00:00`);
    const closedIso = (p.closedDate || p.closedAt || '').split('T')[0];
    const now = closedIso ? new Date(`${closedIso}T16:00:00`) : new Date();
    const isClosedCycle = Boolean(p.closureConfirmed || p.status === 'Cosechada');
    const rawElapsed = Math.max(1, Math.floor((now.getTime() - sowDate.getTime()) / 86400000));
    const activeDds = isClosedCycle ? cycleLimit : Math.min(cycleLimit, rawElapsed);
    const progressPct = isClosedCycle ? 100 : Math.min(100, Math.max(0, Math.round((activeDds / cycleLimit) * 100)));

    const stage =
      isClosedCycle || progressPct >= 95 ? `Ciclo Cerrado (${formatDateAr(closedIso || '2026-04-01')})` :
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
    const perm = canUserEditOrMutatePlot(currentUser, plot, locations, clients);
    if (!perm.allowed) return;

    const targetCampaign = selectedCampaign === 'all' ? '2025/2026' : selectedCampaign;
    const currentCampaigns = plot.activeCampaigns || (plot.campaign ? [plot.campaign] : ['2025/2026']);
    const isCurrentlyActiveInCampaign = currentCampaigns.includes(targetCampaign) && plot.status === 'Activa';

    let updatedCampaigns: string[];
    let newStatus: any;

    if (isCurrentlyActiveInCampaign) {
      updatedCampaigns = currentCampaigns.filter(c => c !== targetCampaign);
      newStatus = 'Pausada';
    } else {
      updatedCampaigns = Array.from(new Set([...currentCampaigns, targetCampaign]));
      newStatus = 'Activa';

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
    if (isSaving) return;

    const perm = canUserEditOrMutatePlot(currentUser, editingPlot, locations, clients, formData.locationId);
    if (!perm.allowed) {
      setFormFeedback({
        type: 'error',
        message: 'No posee permisos sobre este establecimiento o unidad productiva para realizar modificaciones.'
      });
      return;
    }

    const sanitizedName = sanitizePlotInputText(formData.name, 80).toUpperCase();
    if (!sanitizedName || !formData.locationId) {
      setEditModalTab('agronomic');
      setFormFeedback({
        type: 'error',
        message: 'Complete los campos obligatorios en la Pestaña 1: Identificador de Parcela y Establecimiento Padre.'
      });
      return;
    }
    if (!formData.varietyId) {
      setEditModalTab('traceability');
      setFormFeedback({
        type: 'error',
        message: 'Seleccione una Variedad Genética / Lote de Semilla en la Pestaña 2 (Semilla INASE & Responsables).'
      });
      return;
    }

    const stockEval = computeDifferentialSeedStockAdjustment({
      editingPlot,
      nextSeedBatchId: formData.seedBatchId,
      nextUsedKg: calculatedUsedKg,
      seedBatches
    });

    if (!stockEval.isValid) {
      setFormFeedback({
        type: 'error',
        message: stockEval.error || 'Stock de semilla insuficiente en el lote seleccionado.'
      });
      setEditModalTab('traceability');
      return;
    }

    const selectedBatch = seedBatches.find(b => b.id === formData.seedBatchId);
    const oldBatch = stockEval.oldBatchId ? seedBatches.find(b => b.id === stockEval.oldBatchId) : undefined;

    setIsSaving(true);
    setFormFeedback(null);
    try {
      const parentLoc = locations.find(l => l.id === formData.locationId);
      const parsedLat = parseFloat(formData.lat || '');
      const parsedLng = parseFloat(formData.lng || '');
      const finalLat = !isNaN(parsedLat) && parsedLat !== 0 ? parsedLat : parentLoc?.coordinates?.lat || 0;
      const finalLng = !isNaN(parsedLng) && parsedLng !== 0 ? parsedLng : parentLoc?.coordinates?.lng || 0;
      const coordinates = finalLat !== 0 && finalLng !== 0 ? { lat: finalLat, lng: finalLng } : null;

      let finalPolygon = Array.isArray(formData.polygon) ? formData.polygon : [];
      let finalPerimeter = Number(formData.perimeter || 12);
      if (finalPolygon.length < 3 && coordinates) {
        const autoGeo = generateGeodesicPolygonFromSurface(
          coordinates.lat,
          coordinates.lng,
          Number(formData.surfaceArea || 9),
          formData.surfaceUnit || 'm2'
        );
        finalPolygon = autoGeo.polygon;
        finalPerimeter = autoGeo.perimeterM;
      }

      const { lat, lng, ...cleanFormData } = formData;
      const assignedCampaign = formData.campaign || (selectedCampaign === 'all' ? '2025/2026' : selectedCampaign);
      const campaignsList = Array.from(new Set([assignedCampaign, ...(formData.activeCampaigns || [])]));

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

      const matchedUserIds = declaredSystemUsers
        .filter(
          u =>
            u.name === cleanFormData.samplingResponsibleName ||
            u.name === cleanFormData.sowingResponsibleName ||
            u.name === cleanFormData.technicalResponsibleName ||
            `Ing. Agr. ${u.name}` === cleanFormData.technicalResponsibleName
        )
        .map(u => u.id);

      const combinedResponsibleIds = Array.from(
        new Set([
          ...((!isAdmin && currentUser) ? [currentUser.id] : (cleanFormData.responsibleIds || [])),
          ...matchedUserIds
        ])
      );

      const payload: Plot = {
        ...cleanFormData,
        id: editingPlot ? editingPlot.id : generateId(),
        name: sanitizedName,
        projectId: cleanFormData.projectId || parentLoc?.projectId || projects[0]?.id || '',
        block: sanitizePlotInputText(cleanFormData.block || 'Bloque 1', 60),
        soilType: sanitizePlotInputText(cleanFormData.soilType || parentLoc?.soilType || 'Franco', 80),
        irrigationType: sanitizePlotInputText(cleanFormData.irrigationType || parentLoc?.irrigationSystem || 'Goteo', 80),
        ownerName: sanitizePlotInputText(cleanFormData.ownerName || parentLoc?.ownerName || parentLoc?.responsiblePerson || 'Red Nucleus', 100),
        observations: sanitizePlotInputText(cleanFormData.observations || '', 500),
        technicalResponsibleMatricula: sanitizePlotInputText(cleanFormData.technicalResponsibleMatricula || 'MP CIAFBA 14.892', 60),
        responsibleIds: combinedResponsibleIds,
        surfaceArea: Math.max(0.01, Number(formData.surfaceArea || 9)),
        density: Math.max(1, Number(formData.density || 48)),
        rowDistance: Math.max(1, Number(formData.rowDistance || 20)),
        replicate: Math.max(1, Number(formData.replicate || 1)),
        perimeter: finalPerimeter,
        usedSeedValue: Math.max(0, Number(formData.usedSeedValue || 0)),
        usedSeedUnit: formData.usedSeedUnit || 'kg',
        usedSeedQuantity: Number(calculatedUsedKg.toFixed(6)),
        campaign: assignedCampaign,
        activeCampaigns: campaignsList,
        coordinates,
        polygon: finalPolygon
      };

      let success = false;
      if (editingPlot) {
        success = await updatePlot(payload);
      } else {
        success = await addPlot(payload);
      }

      if (success) {
        if (oldBatch && typeof stockEval.restoredOldBatchRemainingKg === 'number') {
          await updateSeedBatch({
            ...oldBatch,
            remainingQuantity: stockEval.restoredOldBatchRemainingKg
          });
        }
        if (
          selectedBatch &&
          typeof stockEval.newSelectedBatchRemainingKg === 'number' &&
          Math.abs(stockEval.deltaSelectedBatchKg) > 0.00001
        ) {
          await updateSeedBatch({
            ...selectedBatch,
            remainingQuantity: stockEval.newSelectedBatchRemainingKg
          });
        }

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
    reader.onload = event => {
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
        setFormData((prev: any) => ({
          ...prev,
          polygon: poly,
          surfaceArea: Number(areaVal.toFixed(2)),
          surfaceUnit: unit,
          lat: centerLat.toFixed(6),
          lng: centerLng.toFixed(6)
        }));
        setFormFeedback({
          type: 'success',
          message: `Polígono KML importado con éxito (${poly.length} vértices WGS84 · ${areaVal.toFixed(2)} ${unit}).`
        });
      } else {
        setFormFeedback({
          type: 'error',
          message: 'No se pudo extraer un polígono válido de 3 o más vértices desde el archivo KML.'
        });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handlePolygonChange = (newPoly: { lat: number, lng: number }[], areaHa: number, center: { lat: number, lng: number }) => {
    const areaM2 = areaHa * 10000;
    const isMicroPlot = areaM2 > 0 && areaM2 < 2500;
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

  const handleGeneratePolygonFromSurface = () => {
    const parentLoc = locations.find(l => l.id === formData.locationId);
    const baseLat = parseFloat(formData.lat || '') || parentLoc?.coordinates?.lat || -43.308576;
    const baseLng = parseFloat(formData.lng || '') || parentLoc?.coordinates?.lng || -65.289047;
    const generated = generateGeodesicPolygonFromSurface(
      baseLat,
      baseLng,
      Number(formData.surfaceArea || 9),
      formData.surfaceUnit || 'm2'
    );
    setFormData((prev: any) => ({
      ...prev,
      lat: baseLat.toFixed(6),
      lng: baseLng.toFixed(6),
      polygon: generated.polygon,
      perimeter: generated.perimeterM
    }));
    setFormFeedback({
      type: 'success',
      message: `Polígono geodésico generado automáticamente (${generated.polygon.length} vértices · ${formData.surfaceArea} ${formData.surfaceUnit} · Perímetro ${generated.perimeterM} m).`
    });
  };

  const handleDeletePlot = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!isAdmin) return;
    const target = plots.find(p => p.id === id);
    if (!target) return;
    setPlotPendingDelete(target);
  };

  const confirmDeletePlot = async () => {
    if (!plotPendingDelete || !isAdmin) return;
    await deletePlot(plotPendingDelete.id);
    setPlotPendingDelete(null);
  };

  const handleEditPlot = (
    plot: Plot,
    e: React.MouseEvent,
    initialTab: 'agronomic' | 'traceability' | 'map' = 'agronomic'
  ) => {
    e.stopPropagation();
    const perm = canUserEditOrMutatePlot(currentUser, plot, locations, clients);
    if (!perm.allowed) return;
    const parentLoc = locations.find(l => l.id === plot.locationId);
    setEditingPlot(plot);
    setFormFeedback(null);
    setEditModalTab(initialTab);
    setFormData({
      ...plot,
      projectId: plot.projectId || parentLoc?.projectId || projects[0]?.id || '',
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
      perimeter: plot.perimeter || 12,
      usedSeedValue: plot.usedSeedValue !== undefined ? plot.usedSeedValue : Number(plot.usedSeedQuantity || 0),
      usedSeedUnit: plot.usedSeedValue !== undefined ? (plot.usedSeedUnit || 'kg') : 'kg',
      technicalResponsibleMatricula: plot.technicalResponsibleMatricula || 'MP CIAFBA 14.892'
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
            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
              <span className="text-emerald-700 dark:text-emerald-400 uppercase">Unidades en Producción</span>
              <span aria-hidden="true">·</span>
              <span>Campaña {selectedCampaign}</span>
              <span aria-hidden="true">·</span>
              <span>{campaignStats.activeCount} Lotes Activos</span>
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
              {filteredPlots.length} <span className="text-xs font-normal text-slate-400">/ {accessiblePlots.length} asignadas</span>
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
                    const countInLoc = accessiblePlots.filter(pl => pl.locationId === locItem.id).length;
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
                  activePlotId={primaryPlot?.id || 'overview-main'}
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
                <th className="px-5 py-4">Unidad Productiva</th>
                <th className="px-5 py-4">Establecimiento & Herencia</th>
                <th className="px-5 py-4">Genética & Semilla INASE</th>
                <th className="px-5 py-4">Ciclo Fenológico & Fotoperiodo</th>
                <th className="px-5 py-4">Cierre / Cosecha & Código GS1</th>
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
                  const isClosed = Boolean(p.closureConfirmed || p.status === 'Cosechada');
                  const actCode = p.closureActCode || `ACTA-SIEMBRA-${(p.campaign || '2526').replace('/', '')}-${p.id.slice(-5).toUpperCase()}`;
                  const barcodeVal = p.closureBarcode || `7798394${p.id.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 6)}2026`;
                  const plotLabors = (tasks || []).filter(t => t.plotId === p.id);

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
                              {p.block || p.type} {p.replicate ? `· R${p.replicate}` : ''} · {p.campaign || targetCamp}
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
                          <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
                            Lote: <strong className="text-slate-800 dark:text-slate-200">{linkedBatch?.batchCode || linkedBatch?.certificationNumber || 'S/L'}</strong> · Cert: {linkedBatch?.certificationNumber || '103'}
                          </div>
                          <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                            Carga: {formatPlotSeedLoad(p.usedSeedValue, p.usedSeedUnit).compactDisplay}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="w-40 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={`font-bold ${isClosed ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {sync.stage}
                            </span>
                            <span className="text-slate-500">{sync.activeDds}/{sync.cycleLimit}d</span>
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

                      <td
                        className="px-5 py-4"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedPlotForClosureModal(p);
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="space-y-0.5">
                            {isClosed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase">
                                <Lock size={10} /> {formatDateAr(p.closedDate || p.closedAt || '2026-04-01')} {p.closedTime || ''}
                              </span>
                            ) : p.isHarvestScheduled && p.scheduledHarvestDate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 text-[10px] font-bold uppercase">
                                <Clock size={10} /> Prog: {formatDateAr(p.scheduledHarvestDate)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                                En curso · {plotLabors.length} Labores
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 block">
                              {actCode}
                            </span>
                          </div>
                          <div className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0 hidden xl:block">
                            <BarcodeSVG value={barcodeVal} height={18} barWidth={0.85} showText={false} />
                          </div>
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
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedPlotForClosureModal(p);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase flex items-center gap-1 transition cursor-pointer ${
                              isClosed
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : p.isHarvestScheduled
                                ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            }`}
                            title="Cierre de Ciclo / Cosecha & Documento Oficial de Siembra"
                          >
                            <Archive size={10} />
                            <span>{isClosed ? 'Doc. Siembra' : 'Cierre/Cosecha'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedPlotForIdModal(p);
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Rótulo QR, Código de Barras y Cartel Oficial de Tranquera (Ley 27.669)"
                          >
                            <QrCode size={13} />
                          </button>

                          {canManage && (
                            <>
                              <button
                                onClick={e => handleEditPlot(p, e, 'map')}
                                className="p-1.5 text-sky-600 hover:text-sky-500 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-300 rounded-lg transition cursor-pointer"
                                title="Editar Mapa Satelital Horizontal y Polígono GPS"
                              >
                                <Globe size={13} />
                              </button>
                              <button
                                onClick={e => handleEditPlot(p, e, 'agronomic')}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 rounded-lg transition cursor-pointer"
                                title="Editar Unidad Productiva"
                              >
                                <Edit2 size={13} />
                              </button>
                            </>
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
                      : !isPlotActiveInCampaign || !isParentCampoActive
                      ? 'border-slate-200/60 dark:border-slate-800/80 opacity-85 hover:opacity-100'
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
                          className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono font-black uppercase shrink-0 border flex items-center gap-1 ${
                            isClosed
                              ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                              : p.isHarvestScheduled
                              ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                              : p.status === 'Activa'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {isClosed ? <Lock size={10} /> : null}
                          <span>
                            {isClosed ? 'Ciclo Homologado' : p.isHarvestScheduled ? 'Cosecha Prog.' : `● ${p.status}`}
                          </span>
                        </span>
                      </div>

                      {/* Establecimiento Padre (contexto en vista global de Parcelas) */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1.5 truncate">
                          <MapPin size={12} className="text-emerald-500 shrink-0" />
                          <Link
                            to={`/locations/${loc?.id || ''}`}
                            className="hover:text-emerald-600 dark:hover:text-emerald-400 font-bold text-slate-700 dark:text-slate-200 truncate"
                          >
                            {loc?.name || 'S/D'} ({loc?.city || loc?.province})
                          </Link>
                        </span>
                        {canManage ? (
                          <button
                            type="button"
                            onClick={e => handleEditPlot(p, e, 'map')}
                            className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0 tabular-nums cursor-pointer flex items-center gap-1"
                            title="Abrir directamente el Mapa Satelital Horizontal y Polígono GPS de esta parcela"
                          >
                            <Globe size={11} />
                            <span>{p.polygon?.length || 4} vértices GPS</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                            {p.polygon?.length || 4} vértices GPS
                          </span>
                        )}
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

                      {/* 3. Grilla Técnica Consolidada (100% simétrica con Unidades Productivas del Establecimiento) */}
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
                            {p.soilType || loc?.soilType || 'Franco'} · {p.irrigationType || loc?.irrigationSystem || 'Goteo'}
                          </strong>
                        </div>
                      </div>

                      {/* 4. Bloque Unificado: Lote Semilla INASE + Labores + Cierre de Ciclo & Código de Barras GS1 */}
                      <div
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedPlotForClosureModal(p);
                        }}
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
                            Lote: {linkedBatch?.batchCode || linkedBatch?.certificationNumber || 'S/L'} · Carga: {formatPlotSeedLoad(p.usedSeedValue, p.usedSeedUnit).primaryDisplay} ({formatPlotSeedLoad(p.usedSeedValue, p.usedSeedUnit).kgFormatted})
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
                                ? `${formatDateAr(p.closedDate || p.closedAt || '2026-04-01')} ${p.closedTime ? `${p.closedTime} hs` : ''} · ${actCode}`
                                : p.isHarvestScheduled
                                ? `Prog: ${formatDateAr(p.scheduledHarvestDate)} ${p.scheduledHarvestTime || ''} hs · ${actCode}`
                                : `${actCode} · Resp: ${p.sowingResponsibleName || p.samplingResponsibleName || linkedBatch?.samplerName || 'M. Quintana'}`}
                            </strong>
                          </div>
                          <div className="bg-white px-2 py-1 rounded-lg border border-slate-200 shrink-0">
                            <BarcodeSVG value={barcodeVal} height={22} barWidth={0.95} showText={false} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 5. Acciones Inferiores */}
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
                        title="Rótulo QR, Código de Barras y Cartel Oficial de Tranquera (Ley 27.669)"
                      >
                        <QrCode size={14} />
                      </button>

                      {canManage && (
                        <>
                          <button
                            onClick={e => handleEditPlot(p, e, 'map')}
                            className="p-2 text-sky-700 dark:text-sky-300 hover:text-sky-600 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 rounded-xl transition border border-sky-200 dark:border-sky-800/60 cursor-pointer"
                            title="Editar Mapa Satelital Horizontal y Polígono GPS"
                          >
                            <Globe size={14} />
                          </button>

                          <button
                            onClick={e => handleEditPlot(p, e, 'agronomic')}
                            className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 rounded-xl transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                            title="Editar Datos de la Parcela"
                          >
                            <Edit2 size={14} />
                          </button>
                        </>
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

      {/* 4. MODAL REDISEÑADO DE ALTA / EDICIÓN DE UNIDAD PRODUCTIVA (SIN SCROLL EXCESIVO · MAPA HORIZONTAL WIDESCREEN 16:9) */}
      {isAddModalOpen && (() => {
        const relHealth = evaluatePlotRelationalHealth(
          {
            ...formData,
            id: editingPlot?.id,
            coordinates:
              formData.lat && formData.lng && !isNaN(parseFloat(formData.lat))
                ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) }
                : undefined
          },
          {
            locations,
            varieties,
            seedBatches,
            projects,
            clients,
            tasks,
            trialRecords,
            agroApps: agrochemicalApplications
          }
        );

        const stockPreview = computeDifferentialSeedStockAdjustment({
          editingPlot,
          nextSeedBatchId: formData.seedBatchId,
          nextUsedKg: calculatedUsedKg,
          seedBatches
        });

        const loadSummary = formatPlotSeedLoad(formData.usedSeedValue, formData.usedSeedUnit);
        const eqKgHa = relHealth.areaHa > 0 ? loadSummary.kg / relHealth.areaHa : 0;

        return (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center z-[60] p-3 sm:p-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl max-w-6xl w-full shadow-2xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
              
              {/* CABECERA FIJA COMPACTA + BARRA DE ESTADO RELACIONAL EN VIVO */}
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 shrink-0 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                      style={{ backgroundColor: formData.color || '#10b981' }}
                    >
                      <Sprout size={20} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
                        {editingPlot ? `Editar Unidad Productiva: ${formData.name || editingPlot.name}` : 'Nueva Unidad Productiva / Parcela'}
                      </h2>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        <span>{relHealth.parentLocation?.name || 'Seleccione Campo Padre'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{relHealth.variety?.name || 'Seleccione Variedad'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formData.surfaceArea || 9} {formData.surfaceUnit || 'm2'} ({relHealth.estimatedPlantsCount.toLocaleString('es-AR')} pl. est.)</span>
                        <span aria-hidden="true">·</span>
                        <span>{formData.polygon?.length || 0} vértices GPS</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => !isSaving && setIsAddModalOpen(false)}
                    className="p-2 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xl transition text-slate-500 shrink-0 cursor-pointer"
                    title="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* BARRA DE PESTAÑAS HORIZONTALES (3 VISTAS ORDENADAS SIN DESORDEN VISUAL NI SCROLL VERTICAL) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setEditModalTab('agronomic')}
                      className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                        editModalTab === 'agronomic'
                          ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <MapPin size={14} />
                      <span>1. Datos, Campo & Diseño DBCA</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditModalTab('traceability')}
                      className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                        editModalTab === 'traceability'
                          ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <FlaskConical size={14} />
                      <span>2. Semilla INASE & Responsables</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditModalTab('map')}
                      className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                        editModalTab === 'map'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Globe size={14} />
                      <span>3. Mapa Satelital Horizontal & GPS ({formData.polygon?.length || 0} vért.)</span>
                    </button>
                  </div>

                  {/* Resumen Relacional Rápido */}
                  <div className="hidden xl:flex items-center gap-3 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    <span>Socio: <strong className="text-slate-800 dark:text-slate-200">{relHealth.parentClient?.name || relHealth.parentLocation?.ownerName || 'Red Nucleus'}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Labores: <strong className="text-indigo-600 dark:text-indigo-400">{relHealth.linkedTasksCount}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Mediciones: <strong className="text-emerald-600 dark:text-emerald-400">{relHealth.linkedRecordsCount}</strong></span>
                  </div>
                </div>

                {/* Banner de Validación / Feedback Inline (Reemplaza window.alert) */}
                {formFeedback && (
                  <div
                    className={`px-3.5 py-2 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 ${
                      formFeedback.type === 'error'
                        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                        : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {formFeedback.type === 'error' ? <AlertCircle size={15} className="shrink-0" /> : <CheckCircle2 size={15} className="shrink-0" />}
                      <span>{formFeedback.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormFeedback(null)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* CUERPO DEL FORMULARIO CON PESTAÑAS HORIZONTALES */}
              <form onSubmit={handleSubmitAdd} noValidate className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                  
                  {/* ====================================================================
                      PESTAÑA 1: DATOS, CAMPO PADRE & DISEÑO AGRONÓMICO DBCA
                  ==================================================================== */}
                  {editModalTab === 'agronomic' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      
                      {/* Columna Izquierda (6 cols): Identidad, Establecimiento Padre, Proyecto y Campaña */}
                      <div className="lg:col-span-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            01. Atribución Territorial, Proyecto & Campaña
                          </h3>
                          <div className="flex items-center gap-1.5">
                            {COLOR_PALETTE.map(swatch => (
                              <button
                                key={swatch.color}
                                type="button"
                                title={`Color: ${swatch.label}`}
                                onClick={() => setFormData({ ...formData, color: swatch.color })}
                                className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                                  formData.color === swatch.color
                                    ? 'scale-110 border-slate-900 dark:border-white shadow-sm'
                                    : 'border-transparent opacity-75 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: swatch.color }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <label className={labelClass}>Identificador de Parcela / Lote *</label>
                            <input
                              required
                              placeholder="Ej: P1 · LOTE-01 · ENSAYO-VIRCH-A"
                              className={inputClass}
                              value={formData.name}
                              onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className={labelClass}>Establecimiento / Campo Padre * (Hereda Suelo, Riego y Geodesia)</label>
                            <select
                              required
                              className={inputClass}
                              value={formData.locationId}
                              onChange={e => {
                                const chosenLocId = e.target.value;
                                const chosenLoc = locations.find(l => l.id === chosenLocId);
                                const defs = getEstablishmentDefaults(chosenLocId);
                                const updates: any = {
                                  locationId: chosenLocId,
                                  projectId: chosenLoc?.projectId || formData.projectId || projects[0]?.id || '',
                                  soilType: chosenLoc?.soilType || 'Franco',
                                  irrigationType: chosenLoc?.irrigationSystem || 'Goteo',
                                  ownerName: chosenLoc?.ownerName || chosenLoc?.responsiblePerson || 'Red Nucleus',
                                  samplingResponsibleName: formData.samplingResponsibleName || defs.sampler,
                                  sowingResponsibleName: formData.sowingResponsibleName || defs.sower,
                                  technicalResponsibleName: formData.technicalResponsibleName || defs.tech
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
                              <option value="">Seleccionar establecimiento habilitado...</option>
                              {availableLocations.map(l => (
                                <option key={l.id} value={l.id}>
                                  {l.name} ({l.siteType || 'Campo'} · {l.city || l.province})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={labelClass}>Proyecto / Programa Científico</label>
                            <select
                              className={inputClass}
                              value={formData.projectId || ''}
                              onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                            >
                              <option value="">Sin proyecto específico</option>
                              {projects.map(proj => (
                                <option key={proj.id} value={proj.id}>
                                  {proj.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={labelClass}>Fecha de Siembra (DD/MM/AAAA)</label>
                            <DateInputAr
                              className={inputClass}
                              value={formData.sowingDate}
                              onChange={val => setFormData({ ...formData, sowingDate: val })}
                            />
                          </div>

                          <div>
                            <label className={labelClass}>Tipo de Unidad Productiva</label>
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

                          <div>
                            <label className={labelClass}>Campaña Agrícola Principal *</label>
                            <select
                              required
                              className={inputClass}
                              value={formData.campaign}
                              onChange={e => {
                                const nextCamp = e.target.value;
                                const nextActive = Array.from(new Set([nextCamp, ...(formData.activeCampaigns || [])]));
                                setFormData({ ...formData, campaign: nextCamp, activeCampaigns: nextActive });
                              }}
                            >
                              {CAMPAIGNS.map(c => (
                                <option key={c} value={c}>
                                  Campaña {c} {c === '2025/2026' ? '(Actual)' : c === '2026/2027' ? '(Próxima)' : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={labelClass}>Campañas Habilitadas</label>
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {CAMPAIGNS.map(camp => {
                                const isChecked = (formData.activeCampaigns || [formData.campaign]).includes(camp);
                                return (
                                  <button
                                    key={camp}
                                    type="button"
                                    onClick={() => {
                                      const curr = formData.activeCampaigns || [formData.campaign];
                                      const next = isChecked
                                        ? curr.filter((x: string) => x !== camp)
                                        : [...curr, camp];
                                      setFormData({
                                        ...formData,
                                        activeCampaigns: next.length > 0 ? next : [formData.campaign]
                                      });
                                    }}
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                                      isChecked
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    {camp}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Columna Derecha (6 cols): Herencia del Sitio Padre, Superficie & Marco DBCA */}
                      <div className="lg:col-span-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            02. Herencia Edafoclimática & Marco de Siembra (DBCA)
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
                                  setFormFeedback({
                                    type: 'success',
                                    message: `Suelo, riego y titular sincronizados con ${parentLoc.name}.`
                                  });
                                }
                              }}
                              className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              ↻ Re-sincronizar del Campo
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                              placeholder="Ej: Goteo"
                              value={formData.irrigationType || ''}
                              onChange={e => setFormData({ ...formData, irrigationType: e.target.value })}
                            />
                          </div>

                          <div className="col-span-2 sm:col-span-1">
                            <label className={labelClass}>Titular / Custodio</label>
                            <input
                              className={inputClass}
                              placeholder="Ej: PatagonianC"
                              value={formData.ownerName || ''}
                              onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                            />
                          </div>

                          <div>
                            <label className={labelClass}>Superficie Declarada *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              className={inputClass}
                              value={formData.surfaceArea}
                              onChange={e => setFormData({ ...formData, surfaceArea: Number(e.target.value) })}
                            />
                          </div>

                          <div>
                            <label className={labelClass}>Unidad Superficie</label>
                            <select
                              className={inputClass}
                              value={formData.surfaceUnit}
                              onChange={e => setFormData({ ...formData, surfaceUnit: e.target.value as any })}
                            >
                              <option value="m2">Metros² (m²)</option>
                              <option value="ha">Hectáreas (ha)</option>
                            </select>
                          </div>

                          <div>
                            <label className={labelClass}>Perímetro (m)</label>
                            <input
                              type="number"
                              step="0.1"
                              className={inputClass}
                              value={formData.perimeter || 12}
                              onChange={e => setFormData({ ...formData, perimeter: Number(e.target.value) })}
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
                              min="1"
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
                              min="1"
                              className={inputClass}
                              value={formData.rowDistance || 20}
                              onChange={e => setFormData({ ...formData, rowDistance: Number(e.target.value) })}
                            />
                          </div>

                          <div className="col-span-2">
                            <label className={labelClass}>Observaciones Agronómicas</label>
                            <input
                              className={inputClass}
                              value={formData.observations || ''}
                              onChange={e => setFormData({ ...formData, observations: e.target.value })}
                              placeholder="Notas sobre cama de siembra, riego, bloque..."
                            />
                          </div>
                        </div>

                        {/* Resumen de Cálculo Agronómico en Vivo */}
                        <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 font-mono text-xs tabular-nums">
                          <div>
                            <span className="text-[9px] uppercase text-slate-400 block">Área en m² / ha</span>
                            <strong className="text-slate-900 dark:text-white">
                              {relHealth.areaM2.toLocaleString('es-AR')} m² ({relHealth.areaHa.toFixed(4)} ha)
                            </strong>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase text-slate-400 block">Población Objetivo</span>
                            <strong className="text-emerald-600 dark:text-emerald-400">
                              {relHealth.estimatedPlantsCount.toLocaleString('es-AR')} plantas
                            </strong>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase text-slate-400 block">Marco de Plantación</span>
                            <strong className="text-slate-900 dark:text-white">
                              {formData.density || 48} pl/m² · {formData.rowDistance || 20} cm
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ====================================================================
                      PESTAÑA 2: SEMILLA CERTIFICADA INASE, STOCK & PERSONAL DECLARADO
                  ==================================================================== */}
                  {editModalTab === 'traceability' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      
                      {/* Columna Izquierda (6 cols): Lote de Semilla INASE, Variedad y Carga */}
                      <div className="lg:col-span-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            01. Lote de Semilla Certificada INASE & Carga
                          </h3>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setIsSeedScannerOpen(true)}
                              className="text-[10px] font-mono font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition"
                            >
                              <ScanLine size={11} />
                              <span>Escanear QR</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsProtocolModalOpen(true)}
                              className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                            >
                              <FileText size={11} />
                              <span>Anexo II</span>
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className={labelClass}>Lote Disponible en Stock Activo (QA Aprobado) *</label>
                            <select
                              className={inputClass}
                              value={formData.seedBatchId}
                              onChange={e => {
                                const chosenId = e.target.value;
                                const chosenB = seedBatches.find(b => b.id === chosenId);
                                setFormData({
                                  ...formData,
                                  seedBatchId: chosenId,
                                  varietyId: chosenB?.varietyId || formData.varietyId
                                });
                              }}
                            >
                              <option value="">Seleccione lote aprobado ({availableBatches.length} disp.)...</option>
                              {availableBatches
                                .slice()
                                .sort((a, b) => {
                                  const aMatch = formData.varietyId && a.varietyId === formData.varietyId ? 0 : 1;
                                  const bMatch = formData.varietyId && b.varietyId === formData.varietyId ? 0 : 1;
                                  return aMatch - bMatch;
                                })
                                .map(b => {
                                  const vName = varieties.find(v => v.id === b.varietyId)?.name || 'Homologada';
                                  const spName = storagePoints.find(s => s.id === b.storagePointId)?.name || 'Almacén';
                                  return (
                                    <option key={b.id} value={b.id}>
                                      {b.batchCode} · {vName} · Disp: {Number(b.remainingQuantity || 0).toFixed(3)} kg ({Math.round(Number(b.remainingQuantity || 0) * 1000)} gr) · {spName}
                                    </option>
                                  );
                                })}
                            </select>
                          </div>

                          <div>
                            <label className={labelClass}>Variedad Genética (Sincronizada con el Lote) *</label>
                            <select
                              required
                              className={inputClass}
                              value={formData.varietyId}
                              onChange={e => {
                                const nextVarId = e.target.value;
                                const currentBatch = seedBatches.find(b => b.id === formData.seedBatchId);
                                const nextBatch =
                                  currentBatch && currentBatch.varietyId === nextVarId
                                    ? currentBatch
                                    : availableBatches.find(b => b.varietyId === nextVarId);
                                setFormData({
                                  ...formData,
                                  varietyId: nextVarId,
                                  seedBatchId: nextBatch ? nextBatch.id : formData.seedBatchId
                                });
                              }}
                            >
                              <option value="">Seleccionar cultivar...</option>
                              {varieties.map(v => {
                                const activeLotsForVar = availableBatches.filter(b => b.varietyId === v.id);
                                const totalActiveKg = activeLotsForVar.reduce((acc, b) => acc + (b.remainingQuantity || 0), 0);
                                return (
                                  <option key={v.id} value={v.id}>
                                    {v.name} ({v.usage}){activeLotsForVar.length > 0 ? ` — [${activeLotsForVar.length} lote(s) · ${totalActiveKg.toFixed(3)} kg]` : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {/* Control de Carga en Gramos / Kilos / Toneladas */}
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono font-bold uppercase text-slate-600 dark:text-slate-300">
                                Carga de Semilla Asignada a la Parcela
                              </span>
                              <div className="inline-flex rounded-lg bg-white dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-700">
                                {([
                                  { unit: 'gr' as MassUnit, label: 'gr' },
                                  { unit: 'kg' as MassUnit, label: 'kg' },
                                  { unit: 'tn' as MassUnit, label: 'T' }
                                ]).map(uOpt => {
                                  const isCurrent = (formData.usedSeedUnit || 'kg') === uOpt.unit;
                                  return (
                                    <button
                                      key={uOpt.unit}
                                      type="button"
                                      onClick={() => {
                                        const currentKg = convertSeedMassToKg(formData.usedSeedValue, formData.usedSeedUnit || 'kg');
                                        const convertedVal = convertKgToUnit(currentKg, uOpt.unit);
                                        setFormData({
                                          ...formData,
                                          usedSeedUnit: uOpt.unit,
                                          usedSeedValue: Number(convertedVal.toFixed(uOpt.unit === 'tn' ? 6 : uOpt.unit === 'kg' ? 4 : 1))
                                        });
                                      }}
                                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold transition cursor-pointer ${
                                        isCurrent
                                          ? 'bg-emerald-600 text-white'
                                          : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600'
                                      }`}
                                    >
                                      {uOpt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  className={inputClass}
                                  value={formData.usedSeedValue}
                                  onChange={e => setFormData({ ...formData, usedSeedValue: Number(e.target.value) })}
                                />
                              </div>
                              <div className="flex items-center px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                {formData.usedSeedUnit === 'gr' ? 'Gramos (gr)' : formData.usedSeedUnit === 'tn' ? 'Toneladas (T)' : 'Kilos (kg)'}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[9.5px] font-mono text-slate-400">Presets:</span>
                              {[
                                { label: '50 gr (La Regina)', val: 50, unit: 'gr' as MassUnit },
                                { label: '60 gr', val: 60, unit: 'gr' as MassUnit },
                                { label: '75 gr (Ascasubi)', val: 75, unit: 'gr' as MassUnit },
                                { label: '150 gr', val: 150, unit: 'gr' as MassUnit },
                                { label: '1 kg', val: 1, unit: 'kg' as MassUnit }
                              ].map(preset => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() =>
                                    setFormData({
                                      ...formData,
                                      usedSeedValue: preset.val,
                                      usedSeedUnit: preset.unit
                                    })
                                  }
                                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 hover:bg-emerald-50 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-700 text-[9.5px] font-mono font-bold cursor-pointer transition"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>

                            {/* Barra de Equivalencia y Balance de Stock en Vivo */}
                            <div className="p-2.5 rounded-lg bg-slate-900 text-white font-mono text-[10px] tabular-nums space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Equivalencia (gr · kg · T):</span>
                                <strong className="text-emerald-400">{loadSummary.fullTriUnitDisplay}</strong>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Densidad de Siembra Estimada:</span>
                                <strong className="text-amber-300">{eqKgHa.toFixed(1)} kg/ha</strong>
                              </div>
                              {relHealth.seedBatch && (
                                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                                  <span className="text-slate-400">Stock Lote Post-Guardado:</span>
                                  <strong className={stockPreview.isValid ? 'text-sky-300' : 'text-rose-400'}>
                                    {stockPreview.isValid && typeof stockPreview.newSelectedBatchRemainingKg === 'number'
                                      ? `${stockPreview.newSelectedBatchRemainingKg.toFixed(3)} kg disp.`
                                      : 'Excede stock disponible'}
                                  </strong>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Columna Derecha (6 cols): Personal Interviniente + Matriz de Integridad Relacional */}
                      <div className="lg:col-span-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            02. Personal Declarado & Integridad Relacional
                          </h3>
                          <Link
                            to="/users"
                            className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            + Padrón de Usuarios
                          </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <label className={labelClass}>1. Responsable Toma de Muestras en Lote *</label>
                            <select
                              required
                              className={inputClass}
                              value={formData.samplingResponsibleName || ''}
                              onChange={e => setFormData({ ...formData, samplingResponsibleName: e.target.value })}
                            >
                              <option value="">Seleccionar responsable habilitado...</option>
                              {declaredSystemUsers.map(u => (
                                <option key={`samp-${u.id}`} value={u.name}>
                                  {u.displayOption}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className={labelClass}>2. Jefe Operativo de Siembra *</label>
                            <select
                              required
                              className={inputClass}
                              value={formData.sowingResponsibleName || ''}
                              onChange={e => setFormData({ ...formData, sowingResponsibleName: e.target.value })}
                            >
                              <option value="">Seleccionar jefe operativo de siembra...</option>
                              {declaredSystemUsers.map(u => (
                                <option key={`sow-${u.id}`} value={u.name}>
                                  {u.displayOption}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={labelClass}>3. Director Técnico Agrónomo *</label>
                            <select
                              required
                              className={inputClass}
                              value={
                                declaredSystemUsers.some(u => u.name === formData.technicalResponsibleName)
                                  ? formData.technicalResponsibleName
                                  : (formData.technicalResponsibleName || '').replace(/^Ing\.\s*Agr\.\s*/i, '')
                              }
                              onChange={e => {
                                const chosenName = e.target.value;
                                const chosenUser = declaredSystemUsers.find(u => u.name === chosenName);
                                const isAgro = (chosenUser?.jobTitle || '').toLowerCase().includes('agr');
                                setFormData({
                                  ...formData,
                                  technicalResponsibleName: isAgro && !chosenName.startsWith('Ing.') ? `Ing. Agr. ${chosenName}` : chosenName
                                });
                              }}
                            >
                              <option value="">Seleccionar Director Técnico...</option>
                              {declaredSystemUsers
                                .filter(
                                  u =>
                                    u.role === 'technician' ||
                                    u.role === 'admin' ||
                                    u.role === 'super_admin' ||
                                    (u.jobTitle || '').toLowerCase().includes('agr')
                                )
                                .map(u => (
                                  <option key={`tech-${u.id}`} value={u.name}>
                                    {u.displayOption}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div>
                            <label className={labelClass}>Matrícula Profesional</label>
                            <input
                              className={inputClass}
                              placeholder="Ej: MP CIAFBA 14.892"
                              value={formData.technicalResponsibleMatricula || ''}
                              onChange={e => setFormData({ ...formData, technicalResponsibleMatricula: e.target.value })}
                            />
                          </div>
                        </div>

                        {/* MATRIZ DE VINCULACIÓN CON EL RESTO DE LOS DATOS DEL SISTEMA */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 font-mono text-[11px]">
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                            <span className="text-[10px] font-bold uppercase text-slate-500">
                              Estado de Relación con Entidades del Sistema
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              {relHealth.isFullyLinked ? '✓ Integridad Verificada' : 'Pendiente Completar'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 tabular-nums">
                            <div>
                              <span className="text-[9px] uppercase text-slate-400 block">Campo & Socio Productor</span>
                              <strong className="text-slate-800 dark:text-slate-200 truncate block">
                                {relHealth.parentLocation?.name || 'S/D'} · {relHealth.parentClient?.name || 'Red Nucleus'}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase text-slate-400 block">Lote INASE & Certificación</span>
                              <strong className="text-slate-800 dark:text-slate-200 truncate block">
                                {relHealth.seedBatch?.batchCode || 'Sin lote'} (Cert #{relHealth.seedBatch?.certificationNumber || '103'})
                              </strong>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase text-slate-400 block">Órdenes de Labor Vinculadas</span>
                              <strong className="text-indigo-600 dark:text-indigo-400 block">
                                {relHealth.linkedTasksCount} tarea(s) en Cuaderno de Campo
                              </strong>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase text-slate-400 block">Biometría & SENASA</span>
                              <strong className="text-emerald-600 dark:text-emerald-400 block">
                                {relHealth.linkedRecordsCount} mediciones · {relHealth.linkedAgroAppsCount} aplic.
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ====================================================================
                      PESTAÑA 3: MAPA SATELITAL HORIZONTAL WIDESCREEN (16:9) & POLÍGONO GPS
                  ==================================================================== */}
                  {editModalTab === 'map' && (
                    <div className="space-y-4">
                      {/* Barra Horizontal Superior de Coordenadas, Superficie y Generador Automático de Polígono */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                          <div>
                            <label className={labelClass}>Latitud Centroide (WGS84)</label>
                            <input
                              placeholder="-43.308576"
                              className={inputClass}
                              value={formData.lat}
                              onChange={e => setFormData({ ...formData, lat: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Longitud Centroide (WGS84)</label>
                            <input
                              placeholder="-65.289047"
                              className={inputClass}
                              value={formData.lng}
                              onChange={e => setFormData({ ...formData, lng: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Superficie ({formData.surfaceUnit})</label>
                            <input
                              type="number"
                              step="0.01"
                              className={inputClass}
                              value={formData.surfaceArea}
                              onChange={e => setFormData({ ...formData, surfaceArea: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Perímetro Geodésico (m)</label>
                            <input
                              type="number"
                              step="0.1"
                              className={inputClass}
                              value={formData.perimeter || 12}
                              onChange={e => setFormData({ ...formData, perimeter: Number(e.target.value) })}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleGeneratePolygonFromSurface}
                            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer transition whitespace-nowrap"
                            title="Genera automáticamente un polígono rectangular de 4 vértices centrado en las coordenadas con la superficie exacta declarada"
                          >
                            <Layers size={14} />
                            <span>Generar Polígono por Superficie ({formData.surfaceArea} {formData.surfaceUnit})</span>
                          </button>

                          {relHealth.parentLocation?.coordinates && (
                            <button
                              type="button"
                              onClick={() => {
                                const c = relHealth.parentLocation!.coordinates!;
                                setFormData((prev: any) => ({
                                  ...prev,
                                  lat: c.lat.toFixed(6),
                                  lng: c.lng.toFixed(6)
                                }));
                              }}
                              className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                              title="Traer coordenadas del Establecimiento Padre"
                            >
                              <MapPin size={13} className="text-emerald-500" />
                              <span>Centrar en Campo</span>
                            </button>
                          )}

                          <input type="file" accept=".kml" ref={fileInputRef} className="hidden" onChange={handleKMLUpload} />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <FileUp size={13} className="text-sky-500" />
                            <span>Importar KML</span>
                          </button>
                        </div>
                      </div>

                      {/* VISOR SATELITAL HORIZONTAL PANORÁMICO (ANCHO COMPLETO 100% · 440PX DE ALTO) */}
                      <div className="w-full h-[440px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                        <MapEditor
                          key={`plot-horizontal-map-${formData.locationId || 'default'}-${editingPlot?.id || 'new'}`}
                          activePlotId={editingPlot?.id || 'active-edit-plot'}
                          initialCenter={
                            formData.lat && formData.lng && !isNaN(parseFloat(formData.lat)) && !isNaN(parseFloat(formData.lng))
                              ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) }
                              : (relHealth.parentLocation?.coordinates || undefined)
                          }
                          initialPolygon={formData.polygon || []}
                          referencePolygon={relHealth.parentLocation?.polygon || []}
                          extraPolygons={
                            formData.locationId
                              ? plots
                                  .filter(
                                    sp =>
                                      sp.locationId === formData.locationId &&
                                      sp.id !== editingPlot?.id &&
                                      sp.polygon &&
                                      sp.polygon.length >= 3
                                  )
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
                          referenceLabel={
                            relHealth.parentLocation?.name
                              ? `Límite Campo: ${relHealth.parentLocation.name}`
                              : 'Perímetro Campo Padre'
                          }
                          onPolygonChange={handlePolygonChange}
                          height="440px"
                        />
                      </div>
                    </div>
                  )}

                </div>

                {/* PIE DE MODAL FIJO (SIEMPRE VISIBLE SIN IMPORTAR LA PESTAÑA ACTIVA) */}
                <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <span>
                      Pestaña activa: <strong className="text-slate-800 dark:text-slate-200">{editModalTab === 'agronomic' ? '1/3 Datos & DBCA' : editModalTab === 'traceability' ? '2/3 Semilla & Personal' : '3/3 Mapa Satelital Horizontal'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2 text-slate-600 dark:text-slate-400 font-mono font-bold uppercase text-xs hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider shadow-md flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                      <span>{editingPlot ? 'Guardar Cambios de Unidad' : 'Registrar Unidad Productiva'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL SEGURO DE CONFIRMACIÓN DE ELIMINACIÓN DE PARCELA (REEMPLAZA WINDOW.CONFIRM) */}
      {plotPendingDelete && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                  Confirmar Eliminación de Parcela
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ¿Está seguro de eliminar la unidad productiva <strong>{plotPendingDelete.name}</strong> ({plotPendingDelete.surfaceArea} {plotPendingDelete.surfaceUnit})? Esta acción removerá la parcela del padrón activo.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPlotPendingDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeletePlot}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase bg-rose-600 hover:bg-rose-500 text-white shadow-sm cursor-pointer"
              >
                Eliminar Unidad
              </button>
            </div>
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

      {selectedPlotForClosureModal && (
        <PlotCycleClosureModal
          isOpen={!!selectedPlotForClosureModal}
          onClose={() => setSelectedPlotForClosureModal(null)}
          plot={plots.find(pl => pl.id === selectedPlotForClosureModal.id) || selectedPlotForClosureModal}
          location={locations.find(l => l.id === selectedPlotForClosureModal.locationId)}
          variety={varieties.find(v => v.id === selectedPlotForClosureModal.varietyId)}
          client={clients?.find(c => c.id === locations.find(l => l.id === selectedPlotForClosureModal.locationId)?.clientId)}
          seedBatch={
            seedBatches.find(b => b.id === selectedPlotForClosureModal.seedBatchId) ||
            seedBatches.find(b => b.varietyId === selectedPlotForClosureModal.varietyId && (!b.materialType || b.materialType === 'seed')) ||
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

      {/* ESCÁNER QR / BARCODE INTEGRADO EN PROCESO DE SIEMBRA */}
      <BarcodeScannerModal
        isOpen={isSeedScannerOpen}
        onClose={() => setIsSeedScannerOpen(false)}
        onSelectBatch={(batchId) => {
          const matchedBatch = seedBatches.find(
            b =>
              b.id === batchId ||
              b.batchCode.toLowerCase() === batchId.toLowerCase()
          );
          if (matchedBatch) {
            setFormData((prev: any) => ({
              ...prev,
              seedBatchId: matchedBatch.id,
              varietyId: matchedBatch.varietyId || prev.varietyId
            }));
          }
          setIsSeedScannerOpen(false);
        }}
      />

    </div>
  );
}
