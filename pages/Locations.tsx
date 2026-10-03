import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Location, SoilType, RoleType, Plot, SiteType, SiteStatus, CAMPAIGNS } from '../types';
import { 
  Plus, MapPin, User, Globe, Edit2, Trash2, Briefcase, Building, Landmark, 
  GraduationCap, Users, Droplets, Navigation, X, ScanBarcode, Loader2, Save, 
  Search, Filter, ExternalLink, FileUp, LayoutDashboard, Map as MapIcon, 
  ChevronRight, Info, Eye, Waves, Sprout, Tractor, FlaskConical, Sun, 
  CheckCircle2, AlertCircle, Calendar, Power, Check, SlidersHorizontal, 
  ArrowRight, ShieldCheck, Thermometer, Warehouse, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import WeatherWidget from '../components/WeatherWidget';
import MapEditor from '../components/MapEditor';

const ARG_GEO: Record<string, string[]> = {
    "Buenos Aires": ["La Plata", "Mar del Plata", "Bahía Blanca", "Tandil", "Pergamino", "Junín", "Olavarría", "San Nicolás", "Balcarce", "Castelar", "CABA", "San Pedro", "Trenque Lauquen", "Pehuajó", "9 de Julio", "Bolívar", "Saladillo", "Lobos", "Chascomús", "Necochea", "Tres Arroyos", "General Villegas", "Lincoln", "Chivilcoy", "Chacabuco", "Bragado", "25 de Mayo", "Azul", "Coronel Suárez", "Pigüé", "Carhué", "San Antonio de Areco", "Arrecifes", "Salto", "Rojas", "Mercedes", "Luján", "Cañuelas", "Las Flores"],
    "Catamarca": ["San Fernando del Valle de Catamarca", "Andalgalá", "Tinogasta", "Belén", "Santa María", "Recreo", "Fiambalá"],
    "Chaco": ["Resistencia", "Sáenz Peña", "Villa Ángela", "Charata", "Castelli", "San Martín", "Las Breñas", "Quitilipi", "Machagai", "Pampa del Infierno"],
    "Chubut": ["Rawson", "Comodoro Rivadavia", "Trelew", "Puerto Madryn", "Esquel", "Trevelin", "Sarmiento", "Gaiman", "Dolavon", "Lago Puelo"],
    "Córdoba": ["Córdoba Capital", "Río Cuarto", "Villa María", "San Francisco", "Carlos Paz", "Alta Gracia", "Jesús María", "Río Tercero", "Bell Ville", "Marcos Juárez", "Laboulaye", "La Carlota", "Vicuña Mackenna", "Huinca Renancó", "Villa Dolores", "Cruz del Eje", "Deán Funes", "Morteros", "Las Varillas", "Oncativo", "Oliva"],
    "Corrientes": ["Corrientes Capital", "Goya", "Paso de los Libres", "Curuzú Cuatiá", "Mercedes", "Bella Vista", "Santo Tomé", "Esquina", "Monte Caseros", "Virasoro"],
    "Entre Ríos": ["Paraná", "Concordia", "Gualeguaychú", "Concepción del Uruguay", "Villaguay", "Victoria", "La Paz", "Nogoyá", "Diamante", "Crespo", "Chajarí", "Federación", "San Salvador", "Rosario del Tala", "Gualeguay"],
    "Formosa": ["Formosa Capital", "Clorinda", "Pirané", "El Colorado", "Las Lomitas", "Ibarreta"],
    "Jujuy": ["San Salvador de Jujuy", "Perico", "San Pedro", "Ledesma", "Libertador Gral. San Martín", "Palpalá", "Humahuaca", "Tilcara", "La Quiaca"],
    "La Pampa": ["Santa Rosa", "General Pico", "General Acha", "Eduardo Castex", "Realicó", "Intendente Alvear", "Victorica", "Macachín", "Guatraché"],
    "La Rioja": ["La Rioja Capital", "Chilecito", "Aimogasta", "Chamical", "Villa Unión", "Chepes"],
    "Mendoza": ["Mendoza Capital", "San Rafael", "Godoy Cruz", "Maipú", "Luján de Cuyo", "San Martín", "General Alvear", "Malargüe", "Tunuyán", "Tupungato", "Rivadavia", "Junín"],
    "Misiones": ["Posadas", "Eldorado", "Oberá", "Puerto Iguazú", "Apóstoles", "Leandro N. Alem", "San Vicente", "Montecarlo", "Puerto Rico"],
    "Neuquén": ["Neuquén Capital", "San Martín de los Andes", "Zapala", "Cutral Có", "Plaza Huincul", "Centenario", "Villa La Angostura", "Junín de los Andes", "Chos Malal"],
    "Río Negro": ["Viedma", "General Roca", "Bariloche", "Cipolletti", "Villa Regina", "Allen", "Cinco Saltos", "Choele Choel", "Río Colorado", "El Bolsón", "San Antonio Oeste"],
    "Salta": ["Salta Capital", "Orán", "Tartagal", "General Güemes", "Cafayate", "Metán", "Rosario de la Frontier", "Joaquín V. González", "Las Lajitas", "Embarcación"],
    "San Juan": ["San Juan Capital", "Caucete", "Jáchal", "Pocito", "Rawson", "Rivadavia", "Santa Lucía", "Albardón"],
    "San Luis": ["San Luis Capital", "Villa Mercedes", "Merlo", "Justo Daract", "La Punta", "Quines", "Santa Rosa del Conlara"],
    "Santa Cruz": ["Río Gallegos", "Caleta Olivia", "El Calafate", "Pico Truncado", "Las Heras", "Puerto Deseado", "Río Turbio"],
    "Santa Fe": ["Santa Fe Capital", "Rosario", "Rafaela", "Venado Tuerto", "Reconquista", "Santo Tomé", "Villa Constitución", "San Lorenzo", "Esperanza", "Casilda", "Cañada de Gómez", "Firmat", "Rufino", "Sunchales", "Gálvez", "San Jorge", "Vera", "San Justo"],
    "Santiago del Estero": ["Santiago del Estero Capital", "La Banda", "Termas de Río Hondo", "Frías", "Añatuya", "Fernández", "Quimilí", "Loreto"],
    "Tierra del Fuego": ["Ushuaia", "Río Grande", "Tolhuin"],
    "Tucumán": ["San Miguel de Tucumán", "Tafí Viejo", "Concepción", "Yerba Buena", "Banda del Río Salí", "Aguilares", "Monteros", "Famaillá"]
};

const SOIL_TYPES = ["Franco", "Franco Arenoso", "Franco Arcilloso", "Arenoso", "Arcilloso", "Limoso", "Sustrato Controlado"];
const IRRIGATION_SYSTEMS = ["Secano (Lluvia)", "Pivote Central", "Goteo", "Aspersión", "Gravedad / Surcos", "Microaspersión"];

const SITE_TYPES: { value: SiteType; label: string; icon: any; color: string; desc: string }[] = [
  { value: 'Campo Extensivo', label: 'Campo Extensivo', icon: Tractor, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60', desc: 'Producción de grano o fibra a gran escala (>15 ha)' },
  { value: 'Chacra Intensiva', label: 'Chacra Intensiva', icon: Sprout, color: 'text-green-600 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800/60', desc: 'Lotes pequeños y medianos con manejo intensivo y riego' },
  { value: 'Predio Experimental', label: 'Predio Experimental', icon: FlaskConical, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800/60', desc: 'Ensayos de microparcelas, genética y adaptabilidad INASE' },
  { value: 'Indoor / Laboratorio', label: 'Indoor / Laboratorio', icon: Sun, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800/60', desc: 'Clima controlado, micropropagación y madres' },
  { value: 'Invernadero', label: 'Invernadero / Greenhouse', icon: Warehouse, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60', desc: 'Estructuras protegidas para propagación y floración' },
  { value: 'Centro de Procesamiento', label: 'Planta de Procesamiento', icon: Building, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700', desc: 'Acondicionamiento, secado y desmote de fibra/flor' }
];

const SITE_STATUSES: { value: SiteStatus; label: string; color: string; dot: string }[] = [
  { value: 'Activo', label: 'Activo en Producción', color: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60', dot: 'bg-emerald-500' },
  { value: 'En Preparación', label: 'En Preparación', color: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60', dot: 'bg-amber-500' },
  { value: 'En Barbecho', label: 'En Barbecho / Descanso', color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', dot: 'bg-slate-400' },
  { value: 'Inactivo', label: 'Inactivo', color: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60', dot: 'bg-rose-500' }
];

// Algoritmo de cálculo de área geodésica (Shoelace en esfera)
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

export default function Locations() {
  const { locations, addLocation, updateLocation, deleteLocation, updatePlot, currentUser, clients, plots } = useAppContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filtros de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterSiteType, setFilterSiteType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('2025/2026'); // Campaña actual por defecto

  const [formData, setFormData] = useState<Partial<Location> & { lat: string, lng: string }>({
    name: '', province: '', city: '', address: '', soilType: 'Franco', climate: '', 
    responsiblePerson: '', lat: '', lng: '',
    clientId: '', ownerName: '', ownerLegalName: '', ownerCuit: '', ownerContact: '', ownerType: 'Empresa Privada', 
    capacityHa: 0, irrigationSystem: 'Secano (Lluvia)',
    responsibleIds: [],
    polygon: [],
    siteType: 'Campo Extensivo',
    status: 'Activo',
    activeCampaigns: ['2025/2026', '2026/2027'],
    notes: ''
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;
  const isClient = currentUser?.role === 'client';
  const isTechnician = currentUser?.role === 'technician';
  const canManage = isAdmin || isClient || isTechnician;

  // Filtrado de establecimientos
  const visibleLocations = useMemo(() => {
    return locations.filter(l => {
      let matches = true;

      // Permisos de usuario
      if (isAdmin) {
        matches = true;
      } else if ((isClient || isTechnician) && currentUser?.clientId) {
        matches = (l.clientId === currentUser.clientId) || (l.responsibleIds?.includes(currentUser.id || ''));
      } else {
        matches = l.responsibleIds?.includes(currentUser?.id || '') || false;
      }

      // Filtro por término de búsqueda
      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        matches = matches && (
          l.name.toLowerCase().includes(lowerTerm) || 
          l.city?.toLowerCase().includes(lowerTerm) ||
          l.responsiblePerson?.toLowerCase().includes(lowerTerm) ||
          (l.siteType && l.siteType.toLowerCase().includes(lowerTerm))
        );
      }

      // Filtro por Provincia
      if (filterProvince) {
        matches = matches && l.province === filterProvince;
      }

      // Filtro por Tipología de Sitio
      if (filterSiteType !== 'all') {
        matches = matches && (l.siteType === filterSiteType);
      }

      // Filtro por Estado Operativo
      if (filterStatus !== 'all') {
        const st = l.status || 'Activo';
        matches = matches && (st === filterStatus);
      }

      // Filtro por Campaña Agrícola
      if (selectedCampaign !== 'all') {
        const campaigns = l.activeCampaigns || ['2024/2025', '2025/2026'];
        matches = matches && campaigns.includes(selectedCampaign);
      }

      return matches;
    });
  }, [locations, isAdmin, isClient, isTechnician, currentUser, searchTerm, filterProvince, filterSiteType, filterStatus, selectedCampaign]);

  // Estadísticas globales y de campaña
  const stats = useMemo(() => {
    const totalLocs = locations.length;
    const activeInSelectedCampaign = locations.filter(l => {
      if (selectedCampaign === 'all') return (l.status || 'Activo') === 'Activo';
      const campaigns = l.activeCampaigns || ['2024/2025', '2025/2026'];
      return campaigns.includes(selectedCampaign) && (l.status || 'Activo') === 'Activo';
    }).length;

    const inPreparationCount = locations.filter(l => l.status === 'En Preparación').length;
    const inFallowCount = locations.filter(l => l.status === 'En Barbecho').length;

    const totalHa = visibleLocations.reduce((sum, l) => sum + (l.capacityHa || 0), 0);
    const activePlots = plots.filter(p => p.status === 'Activa' && visibleLocations.some(l => l.id === p.locationId));
    const occupiedHa = activePlots.reduce((sum, p) => {
      let area = p.surfaceArea || 0;
      if (p.surfaceUnit === 'm2') area = area / 10000;
      if (p.surfaceUnit === 'ac') area = area * 0.404686;
      return sum + area;
    }, 0);

    return { 
      totalLocs, 
      activeInSelectedCampaign,
      inPreparationCount,
      inFallowCount,
      totalHa, 
      occupiedHa, 
      occupancyRate: totalHa > 0 ? (occupiedHa / totalHa) * 100 : 0, 
      activePlotsCount: activePlots.length 
    };
  }, [locations, visibleLocations, plots, selectedCampaign]);

  // Alternar rápidamente si un campo está activo para la campaña actual
  const handleToggleCampaign = async (loc: Location, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManage) return;

    const targetCampaign = selectedCampaign === 'all' ? '2025/2026' : selectedCampaign;
    const currentCampaigns = loc.activeCampaigns || ['2024/2025', '2025/2026'];
    let updatedCampaigns: string[];
    let willBeActive: boolean;

    if (currentCampaigns.includes(targetCampaign)) {
      updatedCampaigns = currentCampaigns.filter(c => c !== targetCampaign);
      willBeActive = false;
    } else {
      updatedCampaigns = [...currentCampaigns, targetCampaign];
      willBeActive = true;
    }

    // 1. Actualizar el Campo
    await updateLocation({
      ...loc,
      activeCampaigns: updatedCampaigns,
      status: willBeActive ? 'Activo' : (updatedCampaigns.length === 0 ? 'En Barbecho' : loc.status)
    });

    // 2. Sincronizar de inmediato todas las Unidades Productivas hijas de este campo
    const childPlots = plots.filter(p => p.locationId === loc.id);
    for (const plot of childPlots) {
      const plotCampaigns = plot.activeCampaigns || (plot.campaign ? [plot.campaign] : ['2025/2026']);
      if (willBeActive) {
        const newPlotCampaigns = Array.from(new Set([...plotCampaigns, targetCampaign]));
        await updatePlot({
          ...plot,
          status: 'Activa',
          campaign: plot.campaign || targetCampaign,
          activeCampaigns: newPlotCampaigns
        });
      } else {
        const newPlotCampaigns = plotCampaigns.filter(c => c !== targetCampaign);
        const newStatus = (plot.campaign === targetCampaign || newPlotCampaigns.length === 0) ? 'Pausada' : plot.status;
        await updatePlot({
          ...plot,
          status: newStatus as any,
          activeCampaigns: newPlotCampaigns
        });
      }
    }
  };

  // Alternar rápidamente estado del establecimiento (Activo <-> Inactivo/Barbecho)
  const handleToggleStatus = async (loc: Location, newStatus: SiteStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManage) return;
    await updateLocation({
      ...loc,
      status: newStatus
    });
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
              const areaHa = areaM2 / 10000;

              setFormData(prev => ({ 
                  ...prev, 
                  polygon: poly, 
                  capacityHa: Number(areaHa.toFixed(2)), 
                  lat: centerLat.toFixed(6), 
                  lng: centerLng.toFixed(6) 
              }));
          } else {
              alert("No se encontró un polígono válido en el archivo KML. Asegúrese de que contenga coordenadas geográficas (Lat/Lon).");
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const handlePolygonChange = (newPoly: { lat: number, lng: number }[], areaHa: number, center: { lat: number, lng: number }) => {
      setFormData(prev => ({ 
        ...prev, 
        polygon: newPoly, 
        capacityHa: areaHa > 0 ? Number(areaHa.toFixed(2)) : prev.capacityHa, 
        lat: center.lat.toFixed(6), 
        lng: center.lng.toFixed(6) 
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || isSaving) return;
    
    setIsSaving(true);
    const finalLat = parseFloat(formData.lat || '0');
    const finalLng = parseFloat(formData.lng || '0');
    const coordinates = (!isNaN(finalLat) && !isNaN(finalLng) && finalLat !== 0) ? { lat: finalLat, lng: finalLng } : null;

    const { lat, lng, ...cleanFormData } = formData;

    const payload: any = {
      ...cleanFormData,
      coordinates, 
      id: editingId || Date.now().toString(),
      siteType: cleanFormData.siteType || 'Campo Extensivo',
      status: cleanFormData.status || 'Activo',
      activeCampaigns: cleanFormData.activeCampaigns && cleanFormData.activeCampaigns.length > 0 
        ? cleanFormData.activeCampaigns 
        : ['2025/2026', '2026/2027'],
      clientId: (!isAdmin && currentUser?.clientId) ? currentUser.clientId : cleanFormData.clientId,
      responsibleIds: (!isAdmin && currentUser && !cleanFormData.responsibleIds?.includes(currentUser.id)) 
          ? [...(cleanFormData.responsibleIds || []), currentUser.id] 
          : cleanFormData.responsibleIds
    };

    try {
        let success = false;
        if (editingId) success = await updateLocation(payload);
        else success = await addLocation(payload);
        if (success) { setIsModalOpen(false); resetForm(); }
    } finally { setIsSaving(false); }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', province: '', city: '', address: '', soilType: 'Franco', climate: '', 
      responsiblePerson: '', lat: '', lng: '', clientId: '', ownerName: '', ownerLegalName: '', 
      ownerCuit: '', ownerContact: '', ownerType: 'Empresa Privada', capacityHa: 0, 
      irrigationSystem: 'Secano (Lluvia)', responsibleIds: [], polygon: [],
      siteType: 'Campo Extensivo',
      status: 'Activo',
      activeCampaigns: ['2025/2026', '2026/2027'],
      notes: ''
    });
    setEditingId(null);
  };

  const handleEdit = (loc: Location) => {
      setFormData({ 
          ...loc, 
          lat: loc.coordinates?.lat.toString() || '', 
          lng: loc.coordinates?.lng.toString() || '', 
          polygon: loc.polygon || [], 
          responsibleIds: Array.isArray(loc.responsibleIds) ? loc.responsibleIds : [],
          siteType: loc.siteType || 'Campo Extensivo',
          status: loc.status || 'Activo',
          activeCampaigns: loc.activeCampaigns || ['2025/2026', '2026/2027'],
          notes: loc.notes || ''
      });
      setEditingId(loc.id);
      setIsModalOpen(true);
  };

  const inputClass = "w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50 text-xs";

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-12">
      
      {/* 1. CABECERA & SELECTOR DE CAMPAÑA AGRÍCOLA */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl md:rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Infraestructura Productiva
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                <Calendar size={11} className="text-sky-500" />
                Campaña: {selectedCampaign}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                <ShieldCheck size={11} className="text-purple-500" />
                {stats.activeInSelectedCampaign} Sitios Asignados
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-baseline gap-3">
              <span>Campos, Chacras & Sitios</span>
              <span className="text-base sm:text-lg font-mono font-medium text-slate-400 hidden sm:inline">
                | Gestión de Campaña
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-2xl">
              Clasificación técnica de predios, lab indoors, chacras y control de activación por ciclo agrícola.
            </p>
          </div>

          {/* Acciones principales */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {canManage && (
              <button 
                onClick={() => { resetForm(); setIsModalOpen(true); }} 
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 active:scale-95"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Nuevo Campo / Sitio</span>
              </button>
            )}
          </div>
        </div>

        {/* BARRA DE CAMPAÑA AGRÍCOLA (REQUERIMIENTO CLAVE) */}
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
              {stats.activeInSelectedCampaign} Activos
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {stats.inPreparationCount} En Prep.
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              {stats.inFallowCount} Barbecho
            </span>
          </div>
        </div>

        {/* TARJETAS DE MÉTRICAS RÁPIDAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block tracking-wider">Sitios en Vista</span>
            <p className="text-2xl font-mono font-black text-slate-900 dark:text-white">
              {visibleLocations.length} <span className="text-xs font-normal text-slate-400">/ {stats.totalLocs} total</span>
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block tracking-wider">Superficie Habilitada</span>
            <p className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">
              {stats.totalHa.toFixed(1)} <span className="text-xs font-normal text-slate-400">Ha</span>
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block tracking-wider">Ocupación Agronómica</span>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-mono font-black text-sky-600 dark:text-sky-400">
                {stats.occupancyRate.toFixed(0)}%
              </p>
              <span className="text-[10px] text-slate-400 font-mono">({stats.occupiedHa.toFixed(1)} ha sembradas)</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block tracking-wider">Parcelas Activas</span>
            <p className="text-2xl font-mono font-black text-purple-600 dark:text-purple-400">
              {stats.activePlotsCount} <span className="text-xs font-normal text-slate-400">Lotes</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE FILTROS AVANZADOS (TIPOLOGÍA, ESTADO, BÚSQUEDA) */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl md:rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Filtro por Tipología de Sitio (Píldoras Segmentadas) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider mr-2 shrink-0">
            Tipología:
          </span>
          <button
            onClick={() => setFilterSiteType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterSiteType === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Todos
          </button>
          {SITE_TYPES.map(st => {
            const Icon = st.icon;
            const isSelected = filterSiteType === st.value;
            return (
              <button
                key={st.value}
                onClick={() => setFilterSiteType(st.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={13} />
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>

        {/* Fila de Filtro por Estado y Búsqueda */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider mr-1 shrink-0">
              Estado:
            </span>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                filterStatus === 'all' ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('Activo')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                filterStatus === 'Activo' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'text-slate-500 hover:text-emerald-600'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Activos
            </button>
            <button
              onClick={() => setFilterStatus('En Preparación')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                filterStatus === 'En Preparación' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'text-slate-500 hover:text-amber-600'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              En Preparación
            </button>
            <button
              onClick={() => setFilterStatus('En Barbecho')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                filterStatus === 'En Barbecho' ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              En Barbecho
            </button>
            <button
              onClick={() => setFilterStatus('Inactivo')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                filterStatus === 'Inactivo' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' : 'text-slate-500 hover:text-rose-600'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Inactivos
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Buscar campo, ciudad o responsable..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
              />
            </div>

            <div className="relative w-44 shrink-0">
              <select
                value={filterProvince}
                onChange={e => setFilterProvince(e.target.value)}
                className="w-full py-1.5 px-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg text-xs font-bold outline-none dark:text-white"
              >
                <option value="">Todas Provincias</option>
                {Object.keys(ARG_GEO).sort().map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. GRILLA DE TARJETAS DE CAMPOS Y SITIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleLocations.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900/90 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 space-y-3">
            <Tractor size={40} className="mx-auto text-slate-400" />
            <h3 className="font-mono font-black text-base text-slate-700 dark:text-slate-300 uppercase">
              No se encontraron establecimientos
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
              Prueba cambiando la campaña seleccionada ({selectedCampaign}), la tipología o el término de búsqueda.
            </p>
            <button
              onClick={() => { setSelectedCampaign('all'); setFilterSiteType('all'); setFilterStatus('all'); setSearchTerm(''); setFilterProvince(''); }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-xl transition"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          visibleLocations.map(loc => {
            const currentSiteType = loc.siteType || 'Campo Extensivo';
            const siteTypeConfig = SITE_TYPES.find(s => s.value === currentSiteType) || SITE_TYPES[0];
            const SiteIcon = siteTypeConfig.icon;
            
            const currentStatus = loc.status || 'Activo';
            const statusConfig = SITE_STATUSES.find(s => s.value === currentStatus) || SITE_STATUSES[0];

            const campaigns = loc.activeCampaigns || ['2024/2025', '2025/2026'];
            const isActiveInSelectedCampaign = selectedCampaign === 'all' || campaigns.includes(selectedCampaign);

            // Parcelas registradas en este campo
            const locPlots = plots.filter(p => p.locationId === loc.id);
            const activePlotsCount = locPlots.filter(p => p.status === 'Activa').length;

            return (
              <div 
                key={loc.id} 
                className={`bg-white dark:bg-slate-900/90 rounded-2xl md:rounded-3xl shadow-sm border transition-all flex flex-col h-full overflow-hidden group hover:shadow-md ${
                  !isActiveInSelectedCampaign 
                    ? 'border-slate-200/60 dark:border-slate-800/80 opacity-75 hover:opacity-100' 
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                {/* Cabecera con Vista Previa Satelital / Mapa */}
                <div className="h-44 relative bg-slate-950 border-b border-slate-100 dark:border-slate-800 overflow-hidden">
                  {loc.coordinates ? (
                    <iframe 
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      scrolling="no" 
                      src={`https://maps.google.com/maps?q=${loc.coordinates.lat},${loc.coordinates.lng}&z=14&output=embed`} 
                      className="opacity-75 group-hover:opacity-95 transition-opacity pointer-events-none"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-600 opacity-40">
                      <Globe size={48} />
                    </div>
                  )}

                  {/* Widget de Clima Flotante en la esquina */}
                  <div className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2.5 rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-800">
                    <WeatherWidget lat={loc.coordinates?.lat || 0} lng={loc.coordinates?.lng || 0} compact={true}/>
                  </div>

                  {/* Botonera de Edición Rápida */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {canManage && (
                      <button 
                        onClick={() => handleEdit(loc)} 
                        className="p-2 bg-white/95 dark:bg-slate-900/95 rounded-lg text-slate-600 dark:text-slate-300 hover:text-emerald-600 shadow-md border border-slate-200/80 dark:border-slate-700 transition"
                        title="Editar Ficha de Campo"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button 
                        onClick={() => { if(window.confirm(`¿Eliminar establecimiento "${loc.name}"?`)) deleteLocation(loc.id); }} 
                        className="p-2 bg-white/95 dark:bg-slate-900/95 text-slate-600 dark:text-slate-300 hover:text-rose-600 shadow-md border border-slate-200/80 dark:border-slate-700 transition"
                        title="Eliminar Establecimiento"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Badge de Tipología Flotante Inferior */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm border ${siteTypeConfig.color}`}>
                      <SiteIcon size={12} />
                      <span>{siteTypeConfig.label}</span>
                    </span>
                  </div>

                  {/* Badge de Estado Operativo */}
                  <div className="absolute bottom-3 right-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm border ${statusConfig.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                      <span>{statusConfig.label}</span>
                    </span>
                  </div>
                </div>

                {/* Contenido de la Tarjeta */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Alerta de Campaña si no está activo en la campaña filtrada */}
                    {selectedCampaign !== 'all' && !isActiveInSelectedCampaign && (
                      <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] font-medium text-amber-800 dark:text-amber-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle size={13} className="text-amber-500 shrink-0" />
                          <span>Inactivo para Campaña {selectedCampaign}</span>
                        </span>
                        {canManage && (
                          <button
                            onClick={(e) => handleToggleCampaign(loc, e)}
                            className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline uppercase shrink-0 ml-2"
                          >
                            Activar
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-600 transition-colors">
                          {loc.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                          <MapPin size={11} className="text-emerald-500" />
                          <span>{loc.city || 'S/D'}, {loc.province}</span>
                        </p>
                      </div>

                      <Link 
                        to={`/locations/${loc.id}`} 
                        className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-600 transition-all shrink-0"
                        title="Ver Ficha Completa"
                      >
                        <Eye size={16} />
                      </Link>
                    </div>

                    {/* Chips de Campañas Activas */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-[9px] font-mono font-bold uppercase text-slate-400 mr-1">
                        Campañas:
                      </span>
                      {campaigns.map(camp => (
                        <span 
                          key={camp}
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            camp === selectedCampaign
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {camp}
                        </span>
                      ))}
                    </div>

                    {/* Grid de Métricas del Establecimiento */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                        <span className="text-[8px] font-mono font-bold uppercase text-slate-400 block tracking-wider">Superficie</span>
                        <strong className="text-xs font-mono font-black text-slate-900 dark:text-white block mt-0.5">
                          {loc.capacityHa || 0} {currentSiteType === 'Indoor / Laboratorio' ? 'Ha / Salas' : 'Ha'}
                        </strong>
                      </div>

                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                        <span className="text-[8px] font-mono font-bold uppercase text-slate-400 block tracking-wider">Lotes</span>
                        <strong className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                          {activePlotsCount} / {locPlots.length}
                        </strong>
                      </div>

                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                        <span className="text-[8px] font-mono font-bold uppercase text-slate-400 block tracking-wider">Riego</span>
                        <strong className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 truncate block mt-0.5" title={loc.irrigationSystem}>
                          {loc.irrigationSystem?.split(' ')[0] || 'Secano'}
                        </strong>
                      </div>
                    </div>

                    {/* Responsable técnico */}
                    {loc.responsiblePerson && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-medium flex items-center gap-1.5">
                        <User size={12} className="text-slate-400" />
                        <span>Resp: <strong className="text-slate-700 dark:text-slate-300 font-bold">{loc.responsiblePerson}</strong></span>
                      </p>
                    )}
                  </div>

                  {/* Acciones Rápidas Inferiores */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {/* Botón para cambiar estado rápido de campaña */}
                    {canManage && (() => {
                      const effectiveCampaign = selectedCampaign === 'all' ? '2025/2026' : selectedCampaign;
                      const isEffectiveActive = campaigns.includes(effectiveCampaign);
                      return (
                        <button
                          onClick={(e) => handleToggleCampaign(loc, e)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition shadow-sm ${
                            isEffectiveActive
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                          }`}
                          title={isEffectiveActive ? `Pausar campo y sus unidades en campaña ${effectiveCampaign}` : `Habilitar campo y sus unidades en campaña ${effectiveCampaign}`}
                        >
                          <Power size={11} className={isEffectiveActive ? 'text-amber-600' : 'text-white'} />
                          <span>{isEffectiveActive ? `Pausar Camp. (${effectiveCampaign})` : `Activar Camp. (${effectiveCampaign})`}</span>
                        </button>
                      );
                    })()}

                    <Link 
                      to={`/locations/${loc.id}`} 
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95"
                    >
                      <span>Entrar al Sitio</span>
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. MODAL DE ALTA / EDICIÓN INDUSTRIAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl max-w-5xl w-full p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                  <Globe size={24} />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingId ? 'Editar Establecimiento / Sitio' : 'Nuevo Establecimiento / Sitio Productivo'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Clasificación técnica, ubicación geográfica y activación por campaña.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => !isSaving && setIsModalOpen(false)} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                
                {/* COLUMNA IZQUIERDA: DATOS PRIMARIOS Y CLASIFICACIÓN */}
                <div className="space-y-5">
                  
                  {/* Tipología de Sitio & Estado Operativo */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Tractor size={14} className="text-emerald-500" />
                      <span>Clasificación & Estado</span>
                    </h3>

                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                        Tipología del Establecimiento *
                      </label>
                      <select 
                        required 
                        className={inputClass} 
                        value={formData.siteType} 
                        onChange={e => setFormData({ ...formData, siteType: e.target.value as SiteType })}
                      >
                        {SITE_TYPES.map(st => (
                          <option key={st.value} value={st.value}>
                            {st.label} — {st.desc}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                          Estado Operativo
                        </label>
                        <select 
                          className={inputClass} 
                          value={formData.status} 
                          onChange={e => setFormData({ ...formData, status: e.target.value as SiteStatus })}
                        >
                          {SITE_STATUSES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                          Capacidad Declarada (Ha)
                        </label>
                        <input 
                          type="number" 
                          step="0.1" 
                          placeholder="Ej: 85" 
                          className={inputClass} 
                          value={formData.capacityHa || ''} 
                          onChange={e => setFormData({ ...formData, capacityHa: parseFloat(e.target.value) || 0 })} 
                        />
                      </div>
                    </div>

                    {/* CHECKBOXES DE CAMPAÑAS ASIGNADAS (REQUERIMIENTO CLAVE) */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-2">
                        Campañas Agrícolas Activas (Tildar ciclos habilitados)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {CAMPAIGNS.map(camp => {
                          const isChecked = (formData.activeCampaigns || []).includes(camp);
                          return (
                            <label 
                              key={camp} 
                              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition text-xs font-mono font-bold ${
                                isChecked 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300' 
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
                              }`}
                            >
                              <span>{camp}</span>
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={(e) => {
                                  const current = formData.activeCampaigns || [];
                                  if (e.target.checked) {
                                    setFormData({ ...formData, activeCampaigns: [...current, camp] });
                                  } else {
                                    setFormData({ ...formData, activeCampaigns: current.filter(c => c !== camp) });
                                  }
                                }} 
                                className="rounded text-emerald-600 focus:ring-emerald-500" 
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Ficha Primaria (Nombre, Ubicación) */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <MapPin size={14} className="text-emerald-500" />
                      <span>Ubicación & Denominación</span>
                    </h3>

                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                        Nombre Comercial / Fantasía *
                      </label>
                      <input 
                        required 
                        placeholder="Ej: Estación Experimental Río Cuarto / Campo Norte" 
                        className={inputClass} 
                        value={formData.name} 
                        onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                          Provincia *
                        </label>
                        <select 
                          required 
                          className={inputClass} 
                          value={formData.province} 
                          onChange={e => setFormData({ ...formData, province: e.target.value })}
                        >
                          <option value="">Seleccionar...</option>
                          {Object.keys(ARG_GEO).sort().map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                          Localidad / Ciudad
                        </label>
                        <input 
                          placeholder="Ej: Pergamino / Río Cuarto" 
                          className={inputClass} 
                          value={formData.city} 
                          onChange={e => setFormData({ ...formData, city: e.target.value })} 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                        Dirección / Acceso Rural
                      </label>
                      <input 
                        placeholder="Ej: Ruta Nac. 36 Km 601" 
                        className={inputClass} 
                        value={formData.address} 
                        onChange={e => setFormData({ ...formData, address: e.target.value })} 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                          Tipo de Suelo
                        </label>
                        <select 
                          className={inputClass} 
                          value={formData.soilType} 
                          onChange={e => setFormData({ ...formData, soilType: e.target.value })}
                        >
                          {SOIL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                          Sistema de Riego
                        </label>
                        <select 
                          className={inputClass} 
                          value={formData.irrigationSystem} 
                          onChange={e => setFormData({ ...formData, irrigationSystem: e.target.value })}
                        >
                          {IRRIGATION_SYSTEMS.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                        Responsable Técnico
                      </label>
                      <input 
                        placeholder="Ej: Ing. Agr. Gastón Barea" 
                        className={inputClass} 
                        value={formData.responsiblePerson} 
                        onChange={e => setFormData({ ...formData, responsiblePerson: e.target.value })} 
                      />
                    </div>
                  </div>

                </div>

                {/* COLUMNA DERECHA: PERÍMETRO GENERAL, MAPA & COORDENADAS */}
                <div className="space-y-5 flex flex-col justify-between">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex-1 flex flex-col min-h-[420px]">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <MapIcon size={14} className="text-emerald-500" />
                        <span>Geolocalización & Perímetro</span>
                      </h3>
                      <div className="flex gap-2">
                        <input type="file" accept=".kml" ref={fileInputRef} className="hidden" onChange={handleKMLUpload} />
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()} 
                          className="px-3 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1 hover:bg-slate-100"
                        >
                          <FileUp size={12} /> Importar KML
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 min-h-[260px] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-3 bg-slate-900">
                      <MapEditor 
                        initialCenter={formData.lat && formData.lng ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) } : undefined} 
                        initialPolygon={formData.polygon || []} 
                        onPolygonChange={handlePolygonChange} 
                        height="100%" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                          Latitud GPS
                        </label>
                        <input 
                          placeholder="-33.1235" 
                          className={inputClass} 
                          value={formData.lat} 
                          onChange={e => setFormData({ ...formData, lat: e.target.value })} 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                          Longitud GPS
                        </label>
                        <input 
                          placeholder="-64.3492" 
                          className={inputClass} 
                          value={formData.lng} 
                          onChange={e => setFormData({ ...formData, lng: e.target.value })} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notas Técnicas */}
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Observaciones y Notas de Campo
                    </label>
                    <textarea 
                      placeholder="Historial agronómico, restricciones fitosanitarias, estado del predio para la campaña..." 
                      className={`${inputClass} h-20 resize-none`}
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>

              </div>

              {/* Botonera de Guardado */}
              <div className="flex justify-end pt-5 border-t border-slate-100 dark:border-slate-800 gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
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
                  <span>{editingId ? 'Actualizar Sitio' : 'Guardar Sitio'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
