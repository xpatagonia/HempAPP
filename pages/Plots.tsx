
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Plot, Variety, Location, Project, TrialRecord, SeedBatch } from '../types';
import { 
  ChevronRight, LayoutGrid, List, Tag, FlaskConical, 
  Trash2, Edit2, QrCode, X, Save, Search, Filter, 
  MapPin, Calendar, Sprout, Printer, Activity, Plus, Loader2, Info, FolderKanban, FileUp,
  Link as LinkIcon, Scale, Box, Weight, Archive
} from 'lucide-react';
import MapEditor from '../components/MapEditor';

const parseKML = (kmlText: string): { lat: number, lng: number }[] | null => {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlText, "text/xml");
        const allCoords = Array.from(xmlDoc.querySelectorAll("*")).filter(el => el.tagName.toLowerCase().endsWith('coordinates'));
        if (allCoords.length === 0) return null;
        allCoords.sort((a, b) => (b.textContent?.length || 0) - (a.textContent?.length || 0));
        const targetNode = allCoords[0];
        const text = targetNode.textContent || "";
        const rawPoints = text.trim().split(/\s+/);
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

type MassUnit = 'gr' | 'kg' | 'tn';

export default function Plots() {
  const { 
    plots, locations, varieties, projects, currentUser, 
    seedBatches, deletePlot, updatePlot, 
    addPlot, updateSeedBatch, storagePoints 
  } = useAppContext();
  
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLoc, setFilterLoc] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'Ensayo' | 'Producción'>('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [qrPlot, setQrPlot] = useState<Plot | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State para Alta
  const [formData, setFormData] = useState<Partial<Plot> & { lat: string, lng: string, usedSeedValue: number, usedSeedUnit: MassUnit }>({
      name: '',
      type: 'Ensayo',
      locationId: '',
      projectId: '',
      varietyId: '',
      seedBatchId: '',
      status: 'Activa',
      sowingDate: new Date().toISOString().split('T')[0],
      surfaceArea: 0,
      surfaceUnit: 'ha',
      density: 0,
      observations: '',
      lat: '',
      lng: '',
      polygon: [],
      usedSeedValue: 0,
      usedSeedUnit: 'kg'
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;
  const isClient = currentUser?.role === 'client';

  const resetForm = () => {
    setFormData({ 
      name: '', type: 'Ensayo', locationId: '', projectId: '', varietyId: '', seedBatchId: '', 
      status: 'Activa', sowingDate: new Date().toISOString().split('T')[0], surfaceArea: 0, 
      surfaceUnit: 'ha', density: 0, lat: '', lng: '', polygon: [], usedSeedValue: 0, usedSeedUnit: 'kg' 
    });
  };

  // --- LÓGICA DE INVENTARIO LOCAL (REFORZADA PARA PACELA 1-TW) ---
  const availableBatches = useMemo(() => {
      return seedBatches.filter(b => {
          // Requisito: Debe estar activo y tener saldo
          if (!b.isActive || b.remainingQuantity <= 0) return false;
          
          // Si el usuario es un socio/cliente, filtramos por su propiedad
          if (isClient && currentUser?.clientId) {
              const storage = storagePoints.find(s => s.id === b.storagePointId);
              // Si el lote está en un almacén, éste debe pertenecer al cliente logueado
              if (storage && storage.clientId && storage.clientId !== currentUser.clientId) return false;
              // Si el lote no tiene almacén (es un saldo flotante o transitorio), lo mostramos por seguridad
          }
          
          // Si ya hay una variedad elegida, mostramos prioritariamente esos lotes, 
          // pero si el usuario busca un lote específico, el sistema le permitirá seleccionarlo.
          return true;
      });
  }, [seedBatches, isClient, currentUser, storagePoints]);

  // Sincronización Lote -> Variedad (Vital para que al elegir PACELA 1-TW sepa qué variedad es)
  useEffect(() => {
    if (formData.seedBatchId) {
        const selectedBatch = seedBatches.find(b => b.id === formData.seedBatchId);
        if (selectedBatch && selectedBatch.varietyId !== formData.varietyId) {
            setFormData(prev => ({ ...prev, varietyId: selectedBatch.varietyId }));
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

  const filteredPlots = useMemo(() => plots.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLoc = filterLoc === 'all' || p.locationId === filterLoc;
      const matchType = filterType === 'all' || p.type === filterType;
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      
      let hasAccess = isAdmin;
      if (isClient && currentUser?.clientId) {
          const loc = locations.find(l => l.id === p.locationId);
          hasAccess = loc?.clientId === currentUser.clientId;
      }
      
      return matchSearch && matchLoc && matchType && matchStatus && (hasAccess || p.responsibleIds?.includes(currentUser?.id || ''));
  }), [plots, searchTerm, filterLoc, filterType, filterStatus, isAdmin, isClient, currentUser, locations]);

  const handleKMLUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          const poly = parseKML(text);
          if (poly && poly.length > 2) {
              const R = 6371000;
              const toRad = (x: number) => x * Math.PI / 180;
              let area = 0;
              const lats = poly.map(p => p.lat);
              const lngs = poly.map(p => p.lng);
              const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
              const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
              for (let i = 0; i < poly.length; i++) {
                  const j = (i + 1) % poly.length;
                  const p1 = poly[i];
                  const p2 = poly[j];
                  area += (toRad(p2.lng) - toRad(p1.lng)) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
              }
              area = Math.abs(area * R * R / 2) / 10000;
              setFormData(prev => ({ ...prev, polygon: poly, surfaceArea: Number(area.toFixed(2)), surfaceUnit: 'ha', lat: centerLat.toFixed(6), lng: centerLng.toFixed(6) }));
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const handlePolygonChange = (newPoly: { lat: number, lng: number }[], areaHa: number, center: { lat: number, lng: number }) => {
      setFormData(prev => ({ ...prev, polygon: newPoly, surfaceArea: areaHa > 0 ? Number(areaHa.toFixed(2)) : prev.surfaceArea, surfaceUnit: 'ha', lat: center.lat.toFixed(6), lng: center.lng.toFixed(6) }));
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.locationId || !formData.varietyId || isSaving) {
        alert("Complete campos obligatorios (*)");
        return;
    }

    const selectedBatch = seedBatches.find(b => b.id === formData.seedBatchId);
    if (selectedBatch && calculatedUsedKg > selectedBatch.remainingQuantity) {
        alert(`STOCK INSUFICIENTE: El lote posee ${selectedBatch.remainingQuantity} kg. Solicitado: ${calculatedUsedKg.toFixed(2)} kg.`);
        return;
    }

    setIsSaving(true);
    try {
        const finalLat = parseFloat(formData.lat || '0');
        const finalLng = parseFloat(formData.lng || '0');
        const coordinates = (!isNaN(finalLat) && !isNaN(finalLng) && finalLat !== 0) ? { lat: finalLat, lng: finalLng } : null;

        // LIMPIEZA DE CAMPOS AUXILIARES ANTES DE ENVIAR A DB
        const { usedSeedValue, usedSeedUnit, lat, lng, ...cleanFormData } = formData;

        const payload = {
            ...cleanFormData,
            id: Date.now().toString(),
            responsibleIds: [currentUser?.id || ''],
            surfaceArea: Number(formData.surfaceArea),
            density: Number(formData.density),
            coordinates,
            polygon: formData.polygon || []
        } as Plot;

        const success = await addPlot(payload);
        
        if (success && selectedBatch && calculatedUsedKg > 0) {
            await updateSeedBatch({
                ...selectedBatch,
                remainingQuantity: selectedBatch.remainingQuantity - calculatedUsedKg
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

  const handleUpdatePlot = async (e: React.FormEvent) => {
      e.preventDefault();
      if (editingPlot) {
          setIsSaving(true);
          await updatePlot(editingPlot);
          setEditingPlot(null);
          setIsSaving(false);
      }
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-3 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all disabled:opacity-50 font-medium text-sm";
  const labelClass = "text-[10px] font-black uppercase mb-1.5 block text-gray-400 tracking-widest";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ... CONTENIDO DE PLOTS (SIN CAMBIOS EN UI) ... */}
    </div>
  );
}
