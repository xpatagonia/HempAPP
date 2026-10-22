import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, Tooltip, useMap, ZoomControl } from 'react-leaflet';
import { 
  Building, MapPin, Warehouse, Truck, Activity, Search, 
  Maximize2, Navigation, Layers, Satellite, ExternalLink, 
  CheckCircle2, X, Compass, Globe, Sprout, 
  Eye, Radio, GitFork, ShieldCheck, ShieldAlert, FileCheck2, 
  Thermometer, Package, ArrowRight, Check, Tag, Route, User as UserIcon,
  Calendar, Database, Sparkles, ChevronRight
} from 'lucide-react';
import L from 'leaflet';
import { Link } from 'react-router-dom';

// Componente para redimensionar el mapa en cambios de vista / container flex
const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const updateSize = () => {
      requestAnimationFrame(() => {
        try {
          map.invalidateSize({ animate: false });
        } catch (e) {}
      });
    };
    const observer = new ResizeObserver(updateSize);
    observer.observe(map.getContainer());
    updateSize();
    return () => observer.disconnect();
  }, [map]);
  return null;
};

// Componente para centrar el mapa suavemente en nodos válidos o ajustar bounds
const MapController = ({ 
  targetCoords, 
  targetZoom,
  allCoords,
  fitAllTrigger
}: { 
  targetCoords: { lat: number; lng: number } | null;
  targetZoom?: number;
  allCoords: { lat: number; lng: number }[];
  fitAllTrigger: number;
}) => {
  const map = useMap();

  useEffect(() => {
    if (targetCoords && !isNaN(targetCoords.lat) && !isNaN(targetCoords.lng)) {
      map.flyTo([targetCoords.lat, targetCoords.lng], targetZoom || 15, {
        duration: 1.1,
        easeLinearity: 0.25
      });
    }
  }, [targetCoords, targetZoom, map]);

  useEffect(() => {
    if (fitAllTrigger > 0 && allCoords.length > 0) {
      const valid = allCoords.filter(c => c && !isNaN(c.lat) && !isNaN(c.lng));
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid.map(c => [c.lat, c.lng]));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [55, 55], maxZoom: 15 });
        }
      }
    }
  }, [fitAllTrigger, allCoords, map]);

  return null;
};

// Creador de iconos personalizados con SVG/HTML y badge opcional
const createNodeIcon = (
  type: 'plot' | 'storage' | 'field' | 'supplier',
  isSelected: boolean,
  customColor?: string
) => {
  let bgColor = customColor || '#10b981';
  const borderColor = '#ffffff';
  let iconSvg = '';

  if (type === 'plot') {
    bgColor = customColor || '#059669';
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>`;
  } else if (type === 'storage') {
    bgColor = '#f59e0b';
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/></svg>`;
  } else if (type === 'field') {
    bgColor = '#0284c7';
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`;
  } else if (type === 'supplier') {
    bgColor = '#9333ea';
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
  }

  const size = isSelected ? 44 : 34;
  const glow = isSelected
    ? `box-shadow: 0 0 0 4px rgba(255,255,255,0.9), 0 0 20px ${bgColor}, 0 8px 20px rgba(0,0,0,0.55); transform: scale(1.12);`
    : `box-shadow: 0 4px 12px rgba(0,0,0,0.4);`;

  return L.divIcon({
    className: 'custom-control-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        color: white;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid ${borderColor};
        cursor: pointer;
        transition: all 0.25s ease-out;
        ${glow}
      ">
        ${iconSvg}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

export default function LogisticsMap() {
  const { 
    plots, locations, storagePoints, suppliers, varieties, 
    seedBatches, seedMovements, clients, projects, trialRecords, hydricRecords, usersList 
  } = useAppContext();

  // Modo de visualización de la Torre de Control: 'map' | 'lineage' | 'alerts'
  const [activeMode, setActiveMode] = useState<'map' | 'lineage' | 'alerts'>('map');

  const [mapLayer, setMapLayer] = useState<'hybrid' | 'streets'>('hybrid');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeCategory, setSelectedNodeCategory] = useState<string | null>(null);
  const [targetCoords, setTargetCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [targetZoom, setTargetZoom] = useState<number>(15);
  const [fitAllTrigger, setFitAllTrigger] = useState(0);
  const [fitScope, setFitScope] = useState<'national' | 'global'>('national');

  // Controles visuales en el mapa
  const [labelMode, setLabelMode] = useState<'all' | 'compact' | 'none'>('all');
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [showPolygons, setShowPolygons] = useState<boolean>(true);

  // Lote seleccionado para el Árbol Genealógico de Trazabilidad (Seed-to-Product)
  const [selectedLineageBatchId, setSelectedLineageBatchId] = useState<string>(() => {
    return seedBatches[0]?.id || '';
  });

  useEffect(() => {
    if (!selectedLineageBatchId && seedBatches.length > 0) {
      setSelectedLineageBatchId(seedBatches[0].id);
    }
  }, [seedBatches, selectedLineageBatchId]);

  // Generación consolidada y 100% consistente de Nodos Geoespaciales con relaciones reales
  const allMarkers = useMemo(() => {
    const list: any[] = [];

    // 1. Parcelas y Lotes de Cultivo (SOLO usa el polígono propio de la parcela para no superponerse al predio)
    plots.forEach(plot => {
      const loc = locations.find(l => l.id === plot.locationId);
      const variety = varieties.find(v => v.id === plot.varietyId);
      const seedBatch = seedBatches.find(b => b.id === plot.seedBatchId) ||
        seedBatches.find(b => b.varietyId === plot.varietyId && (!b.materialType || b.materialType === 'seed'));
      const project = projects.find(p => p.id === plot.projectId);
      const locRespId = (loc as any)?.responsiblePersonId || loc?.responsiblePerson;
      const responsible = usersList.find(u => plot.responsibleIds?.includes(u.id)) ||
        usersList.find(u => u.id === locRespId);

      // Registros agronómicos reales vinculados a la parcela
      const plotTrials = trialRecords
        .filter(r => r.plotId === plot.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestTrial = plotTrials[0];
      const heightVal = (latestTrial as any)?.averageHeight ?? latestTrial?.plantHeight;

      // Lluvias / Riegos vinculados a la parcela o su locación
      const plotHydric = hydricRecords.filter(
        h => h.plotId === plot.id || (!h.plotId && h.locationId === plot.locationId)
      );
      const totalHydricMm = plotHydric.reduce((sum, h) => sum + (Number(h.amountMm) || 0), 0);

      // Coordenadas exactas de la parcela o centroide de su propio polígono
      let coords = plot.coordinates;
      if ((!coords || !coords.lat || !coords.lng) && plot.polygon && plot.polygon.length >= 3) {
        coords = {
          lat: Number((plot.polygon.reduce((s, p) => s + p.lat, 0) / plot.polygon.length).toFixed(6)),
          lng: Number((plot.polygon.reduce((s, p) => s + p.lng, 0) / plot.polygon.length).toFixed(6))
        };
      }
      if (!coords || !coords.lat || !coords.lng) {
        coords = loc?.coordinates;
      }

      if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
        const unitLabel = plot.surfaceUnit === 'm2' ? 'm²' : (plot.surfaceUnit || 'm²');
        const rowSp = (plot as any).rowSpacing;
        list.push({
          id: plot.id,
          code: plot.name.split(' ').slice(0, 2).join(' ') || plot.name,
          name: plot.name,
          category: 'plot',
          categoryBadge: 'Parcela de Cultivo',
          typeLabel: `${plot.type || 'Ensayo'} · ${variety?.name || 'Sin variedad'}`,
          city: loc?.city || 'Zona Rural',
          province: loc?.province || 'Argentina',
          country: 'Argentina',
          address: loc?.name || 'Establecimiento Agropecuario',
          coordinates: { lat: Number(coords.lat), lng: Number(coords.lng) },
          // Importante: solo usa el polígono propio de la parcela
          polygon: plot.polygon && plot.polygon.length >= 3 ? plot.polygon : [],
          surface: `${plot.surfaceArea || 0} ${unitLabel}`,
          status: plot.status || 'Activa',
          shortMetric: `${variety?.name || 'S/D'} · ${plot.surfaceArea || 0} ${unitLabel}`,
          extra: `Semilla: ${seedBatch?.batchCode || 'S/D'} · Siembra: ${plot.sowingDate || 'S/D'}`,
          link: `/plots/${plot.id}`,
          linkLabel: 'Abrir Ficha Técnica de Parcela',
          color: plot.color || '#10b981',
          // Datos relacionales enriquecidos para el inspector visual y popup
          details: {
            sowingDate: plot.sowingDate || 'S/D',
            density: plot.density ? `${plot.density} pl/m²` : (rowSp ? `Entrefila ${rowSp} cm` : 'Estándar'),
            irrigationType: plot.irrigationType || 'Goteo / Complementario',
            varietyId: variety?.id,
            varietyName: variety?.name || 'No asignada',
            varietyUsage: variety?.usage || 'Multipropósito',
            thcLimit: variety?.expectedThc || '< 0.3%',
            seedBatchId: seedBatch?.id,
            seedBatchCode: seedBatch?.batchCode || 'No vinculado',
            seedCert: seedBatch?.certificationNumber || seedBatch?.labelSerialNumber || 'S/D',
            locationId: loc?.id,
            locationName: loc?.name || 'Sin locación',
            projectId: project?.id,
            projectName: project?.name || 'General',
            responsibleName: responsible?.name || 'Equipo Técnico',
            latestStage: latestTrial?.stage || plot.status || 'En seguimiento',
            latestHeightCm: heightVal ? `${heightVal} cm` : 'S/D',
            latestTemp: latestTrial?.temperature ? `${latestTrial.temperature}°C` : 'S/D',
            latestHumidity: latestTrial?.humidity ? `${latestTrial.humidity}%` : 'S/D',
            trialsCount: plotTrials.length,
            totalHydricMm: `${totalHydricMm.toFixed(1)} mm (${plotHydric.length} eventos)`,
            vertexCount: plot.polygon?.length || 0
          }
        });
      }
    });

    // 2. Establecimientos / Campos Productivos (Locaciones)
    locations.forEach(loc => {
      if (loc.coordinates?.lat && loc.coordinates?.lng && !isNaN(loc.coordinates.lat) && !isNaN(loc.coordinates.lng)) {
        const locPlots = plots.filter(p => p.locationId === loc.id);
        const totalPlotM2 = locPlots.reduce((acc, p) => {
          const val = Number(p.surfaceArea) || 0;
          if (p.surfaceUnit === 'ha') return acc + val * 10000;
          if (p.surfaceUnit === 'ac') return acc + val * 4046.86;
          return acc + val;
        }, 0);
        const client = clients.find(c => c.id === loc.clientId);
        const locRespId = (loc as any).responsiblePersonId || loc.responsiblePerson;
        const responsible = usersList.find(u => u.id === locRespId);
        const locHydric = hydricRecords.filter(h => h.locationId === loc.id || locPlots.some(p => p.id === h.plotId));
        const totalRainMm = locHydric.reduce((sum, h) => sum + (Number(h.amountMm) || 0), 0);

        const surfaceDisplay = loc.capacityHa
          ? `${loc.capacityHa} ha (${totalPlotM2.toFixed(2)} m² activos)`
          : `${totalPlotM2.toFixed(2)} m² cultivados`;

        list.push({
          id: loc.id,
          code: `${locPlots.length} Parcelas`,
          name: loc.name,
          category: 'field',
          categoryBadge: 'Predio / Establecimiento',
          typeLabel: `${(loc as any).type || loc.siteType || 'Campo Experimental'} · ${loc.city}`,
          city: loc.city || 'S/D',
          province: loc.province || 'Argentina',
          country: 'Argentina',
          address: loc.address || 'Predio Agropecuario',
          coordinates: { lat: Number(loc.coordinates.lat), lng: Number(loc.coordinates.lng) },
          polygon: loc.polygon && loc.polygon.length >= 3 ? loc.polygon : [],
          surface: surfaceDisplay,
          status: `${locPlots.length} Lotes Activos`,
          shortMetric: `${locPlots.length} parcelas · ${totalPlotM2.toFixed(1)} m²`,
          extra: `Suelo: ${loc.soilType || 'Franco'} · Clima: ${loc.climate || 'Templado'}`,
          link: `/locations/${loc.id}`,
          linkLabel: 'Abrir Ficha del Predio / Locación',
          color: '#0284c7',
          details: {
            soilType: loc.soilType || 'No especificado',
            climate: loc.climate || 'No especificado',
            capacityHa: loc.capacityHa ? `${loc.capacityHa} ha` : 'No declarada',
            cultivatedSurface: `${totalPlotM2.toFixed(2)} m² en ${locPlots.length} parcelas`,
            clientName: client?.name || 'Propio / Consorcio',
            clientId: client?.id,
            responsibleName: responsible?.name || 'Dirección Técnica',
            totalRainMm: `${totalRainMm.toFixed(1)} mm acumulados`,
            vertexCount: loc.polygon?.length || 0,
            plotsList: locPlots.map(p => ({
              id: p.id,
              name: p.name,
              surface: `${p.surfaceArea} ${p.surfaceUnit === 'm2' ? 'm²' : (p.surfaceUnit || 'm²')}`,
              varietyName: varieties.find(v => v.id === p.varietyId)?.name || 'S/D',
              seedBatchId: p.seedBatchId
            }))
          }
        });
      }
    });

    // 3. Almacenes & Nodos Logísticos de Acopio (100% datos reales de stock y lotes)
    storagePoints.forEach(sp => {
      if (sp.coordinates?.lat && sp.coordinates?.lng && !isNaN(sp.coordinates.lat) && !isNaN(sp.coordinates.lng)) {
        const custodyBatches = seedBatches.filter(b => b.storagePointId === sp.id);
        const totalStockKg = custodyBatches.reduce((sum, b) => sum + (Number(b.remainingQuantity) || 0), 0);
        const totalInitialKg = custodyBatches.reduce((sum, b) => sum + (Number(b.initialQuantity) || 0), 0);
        const inboundMovements = seedMovements.filter(m => m.targetLocationId === sp.id);
        const outboundMovements = seedMovements.filter(
          m => m.originStorageId === sp.id || ( !m.originStorageId && custodyBatches.some(b => b.id === m.batchId) )
        );
        const client = clients.find(c => c.id === sp.clientId);
        const responsible = usersList.find(u => u.id === sp.responsibleUserId);

        list.push({
          id: sp.id,
          code: sp.nodeCode || 'NODO',
          name: sp.name,
          category: 'storage',
          categoryBadge: 'Nodo de Acopio & Custodia',
          typeLabel: `${sp.type || 'Almacén'} · Cód: ${sp.nodeCode || 'S/C'}`,
          city: sp.city || 'Hub Logístico',
          province: sp.province || 'Argentina',
          country: 'Argentina',
          address: sp.address || 'Planta de Almacenamiento',
          coordinates: { lat: Number(sp.coordinates.lat), lng: Number(sp.coordinates.lng) },
          polygon: [],
          surface: `${totalStockKg.toFixed(2)} kg en stock (${custodyBatches.length} lotes)`,
          status: custodyBatches.length > 0 ? 'Con Stock Activo' : 'Operativo Disponible',
          shortMetric: `${sp.nodeCode || 'ACOPIO'} · ${totalStockKg.toFixed(1)} kg (${custodyBatches.length} lotes)`,
          extra: `Titular: ${client?.name || 'Red HempC'} · Resp: ${responsible?.name || 'S/D'}`,
          link: `/storage`,
          linkLabel: 'Ir a Logística & Almacenes',
          color: '#f59e0b',
          details: {
            nodeCode: sp.nodeCode || 'S/D',
            storageType: sp.type || 'Almacén Central',
            totalStockKg: `${totalStockKg.toFixed(2)} kg disponibles`,
            totalInitialKg: `${totalInitialKg.toFixed(2)} kg ingresados`,
            batchesCount: custodyBatches.length,
            inboundGuidesCount: inboundMovements.length,
            outboundGuidesCount: outboundMovements.length,
            clientName: client?.name || 'Propio / Red Central',
            responsibleName: responsible?.name || 'Responsable de Custodia',
            conditions: sp.conditions || 'Controlado para Conservación de Semilla INASE / ARICCAME',
            custodyBatches: custodyBatches.map(b => ({
              id: b.id,
              batchCode: b.batchCode,
              remainingKg: Number(b.remainingQuantity || 0).toFixed(2),
              varietyName: varieties.find(v => v.id === b.varietyId)?.name || 'S/D',
              status: (b as any).status || (b.isActive ? 'En Stock' : 'Inactivo')
            })),
            movements: [...inboundMovements, ...outboundMovements].map(m => ({
              id: m.id,
              guide: m.transportGuideNumber || 'S/N',
              date: m.date,
              quantity: m.quantity,
              status: m.status,
              direction: m.targetLocationId === sp.id ? 'Recepción' : 'Despacho'
            }))
          }
        });
      }
    });

    // 4. Proveedores & Bancos de Germoplasma
    suppliers.forEach(sup => {
      if (sup.coordinates?.lat && sup.coordinates?.lng && !isNaN(sup.coordinates.lat) && !isNaN(sup.coordinates.lng)) {
        const supVarieties = varieties.filter(v => v.supplierId === sup.id);
        const supBatches = seedBatches.filter(
          b => b.supplierId === sup.id || supVarieties.some(v => v.id === b.varietyId)
        );
        const countryName = sup.country || (sup.name.toLowerCase().includes('france') || sup.name.toLowerCase().includes('hempit') ? 'Francia' : 'Argentina');
        const supLegalId = (sup as any).legalId || sup.cuit || 'Registro Internacional';
        const supContact = (sup as any).contactName || sup.commercialContact || 'Departamento Técnico';
        const supPhone = (sup as any).phone || sup.whatsapp || 'S/D';

        list.push({
          id: sup.id,
          code: countryName.toUpperCase(),
          name: sup.name,
          category: 'supplier',
          categoryBadge: 'Obtentor & Proveedor Genético',
          typeLabel: `Proveedor: ${sup.category || 'Semillas'} (${countryName})`,
          city: sup.city || 'Beaufort-en-Anjou',
          province: sup.province || 'Maine-et-Loire',
          country: countryName,
          address: sup.address || `${sup.city || ''} ${countryName}`.trim(),
          coordinates: { lat: Number(sup.coordinates.lat), lng: Number(sup.coordinates.lng) },
          polygon: [],
          surface: `${supVarieties.length} Genéticas · ${supBatches.length} Lotes`,
          status: 'Obtentor Homologado',
          shortMetric: `${supVarieties.length} variedades (${supVarieties.map(v => v.name).join(', ')})`,
          extra: `ID Legal: ${supLegalId} · Contacto: ${supContact}`,
          link: `/suppliers`,
          linkLabel: 'Abrir Directorio de Proveedores',
          color: '#9333ea',
          details: {
            legalId: supLegalId,
            category: sup.category || 'Semillas',
            contactName: supContact,
            email: sup.email || 'S/D',
            phone: supPhone,
            country: countryName,
            varietiesList: supVarieties.map(v => ({
              id: v.id,
              name: v.name,
              usage: v.usage,
              thc: v.expectedThc
            })),
            batchesCount: supBatches.length
          }
        });
      }
    });

    return list;
  }, [plots, locations, storagePoints, suppliers, varieties, seedBatches, seedMovements, clients, projects, trialRecords, hydricRecords, usersList]);

  // Contadores por categoría para los filtros
  const categoryCounts = useMemo(() => {
    return {
      all: allMarkers.length,
      plot: allMarkers.filter(m => m.category === 'plot').length,
      field: allMarkers.filter(m => m.category === 'field').length,
      storage: allMarkers.filter(m => m.category === 'storage').length,
      supplier: allMarkers.filter(m => m.category === 'supplier').length
    };
  }, [allMarkers]);

  // Nodos filtrados para la vista actual
  const markers = useMemo(() => {
    let filtered = allMarkers;
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.category === filterType);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        item.province.toLowerCase().includes(q) ||
        item.typeLabel.toLowerCase().includes(q) ||
        item.extra.toLowerCase().includes(q) ||
        item.shortMetric.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [allMarkers, filterType, searchTerm]);

  // Nodo actualmente seleccionado
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return allMarkers.find(m => m.id === selectedNodeId && (!selectedNodeCategory || m.category === selectedNodeCategory)) || null;
  }, [allMarkers, selectedNodeId, selectedNodeCategory]);

  // Coordenadas para encuadre inteligente (Nacional por defecto para no irse al Océano Atlántico por Francia)
  const fitCoordinates = useMemo(() => {
    const source = markers.length > 0 ? markers : allMarkers;
    if (fitScope === 'national') {
      const nationalOnly = source.filter(m => m.coordinates.lat < 0); // Hemisferio Sur (Argentina)
      if (nationalOnly.length > 0) return nationalOnly.map(m => m.coordinates);
    }
    return source.map(m => m.coordinates);
  }, [markers, allMarkers, fitScope]);

  // Rutas Logísticas Reales basadas en Guías ARICCAME (seedMovements)
  const logisticsRoutes = useMemo(() => {
    const routes: any[] = [];
    const defaultOrigin = storagePoints.find(sp => sp.nodeCode === 'REL-1228') || storagePoints[0];

    seedMovements.forEach(mov => {
      const batch = seedBatches.find(b => b.id === mov.batchId);
      const originSp = storagePoints.find(sp => sp.id === mov.originStorageId) ||
        storagePoints.find(sp => sp.id === batch?.storagePointId) ||
        defaultOrigin;
      const targetSp = storagePoints.find(sp => sp.id === mov.targetLocationId);
      const targetLoc = !targetSp ? locations.find(l => l.id === mov.targetLocationId) : undefined;

      const fromCoords = originSp?.coordinates;
      const toCoords = targetSp?.coordinates || targetLoc?.coordinates;

      if (
        fromCoords && toCoords &&
        !isNaN(fromCoords.lat) && !isNaN(fromCoords.lng) &&
        !isNaN(toCoords.lat) && !isNaN(toCoords.lng)
      ) {
        routes.push({
          id: mov.id,
          guideNumber: mov.transportGuideNumber || 'Guía Oficial',
          date: mov.date,
          quantity: mov.quantity,
          status: mov.status || 'Recibido',
          batchCode: batch?.batchCode || 'S/D',
          originName: originSp?.name || 'Acopio Origen',
          originCode: originSp?.nodeCode || '',
          targetName: targetSp?.name || targetLoc?.name || 'Destino',
          targetCode: targetSp?.nodeCode || '',
          transportCompany: mov.transportCompany || 'Logística Oficial',
          driverName: mov.driverName || 'S/D',
          vehiclePlate: mov.vehiclePlate || 'S/D',
          routeItinerary: mov.routeItinerary || '',
          positions: [
            [Number(fromCoords.lat), Number(fromCoords.lng)] as [number, number],
            [Number(toCoords.lat), Number(toCoords.lng)] as [number, number]
          ]
        });
      }
    });

    return routes;
  }, [seedMovements, seedBatches, storagePoints, locations]);

  const handleSelectNode = (node: any, customZoom?: number) => {
    setSelectedNodeId(node.id);
    setSelectedNodeCategory(node.category);
    const defaultZoom = node.category === 'plot' ? 18 : node.category === 'field' ? 17 : 14;
    setTargetZoom(customZoom || defaultZoom);
    setTargetCoords({ ...node.coordinates });
  };

  const handleFitNational = () => {
    setSelectedNodeId(null);
    setSelectedNodeCategory(null);
    setTargetCoords(null);
    setFitScope('national');
    setFitAllTrigger(prev => prev + 1);
  };

  const handleFitGlobal = () => {
    setSelectedNodeId(null);
    setSelectedNodeCategory(null);
    setTargetCoords(null);
    setFitScope('global');
    setFitAllTrigger(prev => prev + 1);
  };

  const handleFlyCluster = (lat: number, lng: number, zoom: number) => {
    setTargetZoom(zoom);
    setTargetCoords({ lat, lng });
  };

  const handleJumpToMapNode = (id: string, category: string) => {
    const found = allMarkers.find(m => m.id === id && m.category === category) || allMarkers.find(m => m.id === id);
    setActiveMode('map');
    if (found) {
      setFilterType('all');
      setTimeout(() => {
        handleSelectNode(found);
      }, 80);
    }
  };

  const handleJumpToLineage = (batchId?: string) => {
    if (batchId) {
      setSelectedLineageBatchId(batchId);
    }
    setActiveMode('lineage');
  };

  // ============================================================================
  // DATOS RELACIONALES REALES PARA EL ÁRBOL GENEALÓGICO (MODO 2)
  // ============================================================================
  const currentLineageBatch = useMemo(() => {
    return seedBatches.find(b => b.id === selectedLineageBatchId) || seedBatches[0];
  }, [seedBatches, selectedLineageBatchId]);

  // Si el lote es una recepción derivada (ej. YUM-501-L125-REC-...), identifica también su lote madre
  const parentLineageBatch = useMemo(() => {
    if (!currentLineageBatch) return undefined;
    if (currentLineageBatch.parentSeedBatchId) {
      return seedBatches.find(b => b.id === currentLineageBatch.parentSeedBatchId);
    }
    if (currentLineageBatch.batchCode?.includes('-REC-')) {
      const prefix = currentLineageBatch.batchCode.split('-REC-')[0];
      return seedBatches.find(b => b.batchCode === prefix);
    }
    return undefined;
  }, [seedBatches, currentLineageBatch]);

  const currentVariety = useMemo(() => {
    return varieties.find(v => v.id === currentLineageBatch?.varietyId);
  }, [varieties, currentLineageBatch]);

  const currentSupplier = useMemo(() => {
    if (currentVariety?.supplierId) {
      return suppliers.find(s => s.id === currentVariety.supplierId);
    }
    if (currentLineageBatch?.supplierId) {
      return suppliers.find(s => s.id === currentLineageBatch.supplierId);
    }
    return suppliers[0];
  }, [suppliers, currentVariety, currentLineageBatch]);

  const currentStorage = useMemo(() => {
    return storagePoints.find(s => s.id === currentLineageBatch?.storagePointId);
  }, [storagePoints, currentLineageBatch]);

  // Todas las parcelas sembradas con este lote, su lote madre o su variedad
  const lineagePlots = useMemo(() => {
    if (!currentLineageBatch) return [];
    const directPlots = plots.filter(
      p => p.seedBatchId === currentLineageBatch.id || (parentLineageBatch && p.seedBatchId === parentLineageBatch.id)
    );
    if (directPlots.length > 0) return directPlots;
    return plots.filter(p => p.varietyId === currentLineageBatch.varietyId);
  }, [plots, currentLineageBatch, parentLineageBatch]);

  const currentOriginPlot = lineagePlots[0];

  const currentOriginLocation = useMemo(() => {
    if (currentOriginPlot) {
      return locations.find(l => l.id === currentOriginPlot.locationId);
    }
    return locations[0];
  }, [locations, currentOriginPlot]);

  // Movimientos logísticos vinculados directa o indirectamente al lote (incluyendo recepciones -REC-)
  const linkedMovements = useMemo(() => {
    if (!currentLineageBatch) return [];
    return seedMovements.filter(m => {
      if (m.batchId === currentLineageBatch.id) return true;
      if (parentLineageBatch && m.batchId === parentLineageBatch.id && m.targetLocationId === currentLineageBatch.storagePointId) return true;
      if (m.transportGuideNumber && currentLineageBatch.batchCode?.includes(m.transportGuideNumber)) return true;
      if (m.transportGuideNumber && currentLineageBatch.notes?.includes(m.transportGuideNumber)) return true;
      return false;
    });
  }, [seedMovements, currentLineageBatch, parentLineageBatch]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-16 font-mono">
      
      {/* 1. CABECERA PRINCIPAL & SELECTOR DE MODO */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Torre de Control & Cadena de Custodia Real
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                <Radio size={11} className="text-sky-500" />
                {allMarkers.length} Nodos Geoespaciales Activos
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Truck size={11} className="text-amber-500" />
                {logisticsRoutes.length} Rutas ARICCAME Trazadas
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
              <Compass className="text-emerald-500 shrink-0" size={32} />
              <span>Torre de Control: Trazabilidad Seed-to-Industry</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Supervisión interactiva en tiempo real: germoplasma INASE, lotes de semilla, polígonos geodésicos de parcelas, nodos de acopio y guías ARICCAME.
            </p>
          </div>

          {/* SELECTOR DE PESTAÑAS DE LA TORRE */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveMode('map')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 ${
                activeMode === 'map'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe size={15} />
              <span>1. Mapa Satelital HD</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('lineage')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 ${
                activeMode === 'lineage'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GitFork size={15} />
              <span>2. Árbol Genealógico</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('alerts')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 ${
                activeMode === 'alerts'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldAlert size={15} />
              <span>3. Auditoría & Accesos</span>
            </button>
          </div>
        </div>

        {/* RESUMEN DE CONSISTENCIA DE LA RED Y ACCESOS RÁPIDOS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <Link
            to="/plots"
            className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 hover:border-emerald-400 transition group"
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
              <span>Parcelas Activas</span>
              <ExternalLink size={11} className="opacity-60 group-hover:opacity-100" />
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{plots.length} Lotes</p>
            <p className="text-[10px] text-slate-500 truncate">
              {plots.reduce((s, p) => s + (Number(p.surfaceArea) || 0), 0).toFixed(2)} m² georreferenciados
            </p>
          </Link>

          <Link
            to="/locations"
            className="p-3 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/60 hover:border-sky-400 transition group"
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-sky-700 dark:text-sky-300">
              <span>Campos / Predios</span>
              <ExternalLink size={11} className="opacity-60 group-hover:opacity-100" />
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{locations.length} Predios</p>
            <p className="text-[10px] text-slate-500 truncate">
              Trelew (Chubut) & H. Ascasubi
            </p>
          </Link>

          <Link
            to="/storage"
            className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 hover:border-amber-400 transition group"
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
              <span>Nodos de Acopio</span>
              <ExternalLink size={11} className="opacity-60 group-hover:opacity-100" />
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{storagePoints.length} Almacenes</p>
            <p className="text-[10px] text-slate-500 truncate">
              CABA, H. Ascasubi y Pto. Madryn
            </p>
          </Link>

          <Link
            to="/seed-batches"
            className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60 hover:border-indigo-400 transition group"
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300">
              <span>Lotes Semilla & Stock</span>
              <ExternalLink size={11} className="opacity-60 group-hover:opacity-100" />
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {seedBatches.reduce((s, b) => s + (Number(b.remainingQuantity) || 0), 0).toFixed(2)} kg
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              En {seedBatches.length} lotes trazados
            </p>
          </Link>

          <Link
            to="/varieties"
            className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/60 hover:border-purple-400 transition group"
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300">
              <span>Genéticas INASE</span>
              <ExternalLink size={11} className="opacity-60 group-hover:opacity-100" />
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{varieties.length} Cultivares</p>
            <p className="text-[10px] text-slate-500 truncate">
              {varieties.map(v => v.name).join(', ')}
            </p>
          </Link>

          <Link
            to="/suppliers"
            className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-800/60 hover:border-rose-400 transition group"
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300">
              <span>Proveedores / Guías</span>
              <ExternalLink size={11} className="opacity-60 group-hover:opacity-100" />
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{seedMovements.length} Guías</p>
            <p className="text-[10px] text-slate-500 truncate">
              {suppliers.length} obtentor internacional
            </p>
          </Link>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* MODO 1: MAPA SATELITAL HD CON ETIQUETAS, RUTAS Y FICHA VISUAL DE DETALLES    */}
      {/* ============================================================================ */}
      {activeMode === 'map' && (
        <div className="space-y-4 animate-in fade-in">
          
          {/* BARRA SUPERIOR DE FILTROS Y CONTROLES VISUALES DEL MAPA */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 text-xs">
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
              {/* Filtros por tipo de nodo */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase transition shrink-0 ${
                    filterType === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Todos ({categoryCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('plot')}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase transition flex items-center gap-1.5 shrink-0 ${
                    filterType === 'plot' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Parcelas ({categoryCounts.plot})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('field')}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase transition flex items-center gap-1.5 shrink-0 ${
                    filterType === 'field' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  Predios ({categoryCounts.field})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('storage')}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase transition flex items-center gap-1.5 shrink-0 ${
                    filterType === 'storage' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Acopio & Silos ({categoryCounts.storage})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('supplier')}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase transition flex items-center gap-1.5 shrink-0 ${
                    filterType === 'supplier' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Proveedores ({categoryCounts.supplier})
                </button>
              </div>

              {/* Controles de Etiquetas, Rutas y Capa Satelital */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Selector de Etiquetas en Mapa */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-400 px-2 flex items-center gap-1">
                    <Tag size={11} /> Etiquetas:
                  </span>
                  <button
                    type="button"
                    onClick={() => setLabelMode('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition ${
                      labelMode === 'all' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Detalladas
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabelMode('compact')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition ${
                      labelMode === 'compact' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Nombres
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabelMode('none')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition ${
                      labelMode === 'none' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Ocultar
                  </button>
                </div>

                {/* Toggle Rutas Logísticas ARICCAME */}
                <button
                  type="button"
                  onClick={() => setShowRoutes(prev => !prev)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1.5 border ${
                    showRoutes
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent'
                  }`}
                >
                  <Route size={13} />
                  <span>Rutas ARICCAME ({logisticsRoutes.length})</span>
                </button>

                {/* Capa Satélite / Callejero */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setMapLayer('hybrid')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 ${
                      mapLayer === 'hybrid' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    <Satellite size={12} />
                    <span>Satélite HD</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapLayer('streets')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 ${
                      mapLayer === 'streets' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    <Layers size={12} />
                    <span>Mapa</span>
                  </button>
                </div>
              </div>
            </div>

            {/* BARRA SECUNDARIA: POLOS GEOGRÁFICOS RÁPIDOS Y BUSCADOR */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <span className="text-[10px] font-bold uppercase text-slate-400 mr-1 shrink-0 flex items-center gap-1">
                  <Navigation size={11} className="text-emerald-500" /> Polos Rápidos:
                </span>
                <button
                  type="button"
                  onClick={handleFitNational}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-200 font-bold text-[10px] uppercase transition shrink-0"
                >
                  🇦🇷 Red Nacional
                </button>
                <button
                  type="button"
                  onClick={() => handleFlyCluster(-43.30848, -65.28895, 18)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-[10px] uppercase transition shrink-0"
                >
                  🌱 Trelew (Chacra 56B · 4 Parcelas)
                </button>
                <button
                  type="button"
                  onClick={() => handleFlyCluster(-42.7422222, -65.2756944, 15)}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[10px] uppercase transition shrink-0"
                >
                  ⚓ Puerto Madryn (CAP Acopio)
                </button>
                <button
                  type="button"
                  onClick={() => handleFlyCluster(-39.38319, -62.61693, 15)}
                  className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold text-[10px] uppercase transition shrink-0"
                >
                  🌾 Hilario Ascasubi (La Valeriana)
                </button>
                <button
                  type="button"
                  onClick={() => handleFlyCluster(-34.61472, -58.44522, 16)}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[10px] uppercase transition shrink-0"
                >
                  🏢 CABA (BioC Central #1 y #2)
                </button>
                <button
                  type="button"
                  onClick={() => handleFlyCluster(47.4406, -0.1897, 13)}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-[10px] uppercase transition shrink-0"
                >
                  🇫🇷 Francia (HEMP-IT Obtentor)
                </button>
                <button
                  type="button"
                  onClick={handleFitGlobal}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold text-[10px] uppercase transition shrink-0"
                >
                  🌍 Vista Global
                </button>
              </div>

              {/* Buscador rápido */}
              <div className="relative w-full md:w-64 shrink-0">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar parcela, nodo, ciudad..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] outline-none focus:border-emerald-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* CONTENEDOR PRINCIPAL DEL MAPA Y LISTA INTERACTIVA */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[700px]">
            
            {/* COLUMNA IZQUIERDA: LISTA DE NODOS CON LINKS DIRECTOS */}
            <div className="lg:col-span-4 xl:col-span-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden h-[700px]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div>
                  <span className="font-black text-xs uppercase text-slate-800 dark:text-slate-200 block">
                    Nodos de Red ({markers.length})
                  </span>
                  <span className="text-[10px] text-slate-400">Clic para centrar y abrir detalles</span>
                </div>
                {selectedNode && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNodeId(null);
                      setSelectedNodeCategory(null);
                    }}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white underline"
                  >
                    Limpiar selección
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {markers.map(node => {
                  const isSelected = selectedNode?.id === node.id && selectedNode?.category === node.category;
                  return (
                    <div
                      key={`${node.category}-${node.id}`}
                      onClick={() => handleSelectNode(node)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer text-xs ${
                        isSelected
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: node.color }} />
                          <strong className="text-slate-900 dark:text-white uppercase truncate text-xs">{node.name}</strong>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                          {node.code}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-500 mt-1 font-medium">
                        {node.typeLabel} · {node.city}, {node.province}
                      </p>

                      <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 truncate">
                        {node.extra}
                      </p>

                      <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px]">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{node.surface}</span>
                        <div className="flex items-center gap-2">
                          <Link
                            to={node.link}
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-[9px] transition"
                          >
                            <span>Abrir</span>
                            <ExternalLink size={10} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMNA DERECHA: MAPA SATELITAL LEAFLET + PANEL INSPECTOR VISUAL */}
            <div className="lg:col-span-8 xl:col-span-9 bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 relative shadow-sm h-[700px]">
              <MapContainer
                center={[-38.4161, -63.6167]}
                zoom={5}
                zoomControl={false}
                maxZoom={20}
                className="w-full h-full z-0"
              >
                <ZoomControl position="bottomright" />
                <MapResizer />
                <MapController 
                  targetCoords={targetCoords}
                  targetZoom={targetZoom}
                  allCoords={fitCoordinates}
                  fitAllTrigger={fitAllTrigger}
                />

                {mapLayer === 'hybrid' ? (
                  <>
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution="&copy; Esri World Imagery"
                      maxNativeZoom={18}
                      maxZoom={20}
                    />
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                      maxNativeZoom={18}
                      maxZoom={20}
                      opacity={0.75}
                    />
                  </>
                ) : (
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                    maxNativeZoom={19}
                    maxZoom={20}
                  />
                )}

                {/* RUTAS LOGÍSTICAS ARICCAME (Polylines entre Almacenes) */}
                {showRoutes && logisticsRoutes.map(route => (
                  <Polyline
                    key={`route-${route.id}`}
                    positions={route.positions}
                    pathOptions={{
                      color: '#f59e0b',
                      weight: 3,
                      opacity: 0.85,
                      dashArray: '8, 8'
                    }}
                  >
                    <Tooltip sticky direction="top" className="custom-route-tooltip">
                      <div className="font-mono text-[10px] p-1 space-y-0.5">
                        <div className="font-black text-amber-700 uppercase">
                          Guía ARICCAME: {route.guideNumber}
                        </div>
                        <div className="text-slate-700 font-bold">
                          {route.originName} ({route.originCode}) &rarr; {route.targetName} ({route.targetCode})
                        </div>
                        <div className="text-slate-600">
                          Lote: {route.batchCode} · {route.quantity} kg · {route.date} · Estado: {route.status}
                        </div>
                      </div>
                    </Tooltip>
                  </Polyline>
                ))}

                {/* POLÍGONOS GEODÉSICOS (Diferenciando Predios vs Parcelas para evitar solapamiento visual) */}
                {showPolygons && markers.filter(m => m.polygon && m.polygon.length >= 3).map(m => {
                  const isSelected = selectedNode?.id === m.id && selectedNode?.category === m.category;
                  const isField = m.category === 'field';
                  return (
                    <Polygon
                      key={`poly-${m.category}-${m.id}`}
                      positions={m.polygon.map((p: any) => [p.lat, p.lng])}
                      eventHandlers={{
                        click: () => handleSelectNode(m)
                      }}
                      pathOptions={{
                        color: isSelected ? '#ffffff' : (isField ? '#38bdf8' : m.color || '#10b981'),
                        fillColor: isField ? '#0284c7' : (m.color || '#10b981'),
                        fillOpacity: isSelected ? 0.55 : (isField ? 0.12 : 0.42),
                        weight: isSelected ? 3.5 : (isField ? 2 : 2.5),
                        dashArray: isField ? '6, 6' : undefined
                      }}
                    />
                  );
                })}

                {/* MARCADORES CON ETIQUETAS VISUALES PERMANENTES Y POPUPS CON LINKS DIRECTOS */}
                {markers.map(marker => {
                  const isSelected = selectedNode?.id === marker.id && selectedNode?.category === marker.category;
                  const customIcon = createNodeIcon(marker.category, isSelected, marker.color);

                  return (
                    <Marker
                      key={`${marker.category}-${marker.id}`}
                      position={[marker.coordinates.lat, marker.coordinates.lng]}
                      icon={customIcon}
                      eventHandlers={{
                        click: () => handleSelectNode(marker)
                      }}
                    >
                      {/* Etiqueta Flotante sobre el Mapa Satelital */}
                      {labelMode !== 'none' && (
                        <Tooltip
                          permanent
                          direction="top"
                          offset={[0, -20]}
                          opacity={0.95}
                          className="custom-node-label-tooltip"
                        >
                          <div className="font-mono text-[10px] leading-tight px-1.5 py-0.5 rounded bg-slate-900/90 text-white border border-white/20 shadow-md whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: marker.color }}
                              />
                              <strong className="font-black uppercase tracking-tight">{marker.name}</strong>
                              <span className="text-[9px] px-1 rounded bg-white/15 text-emerald-300 font-bold">
                                {marker.code}
                              </span>
                            </div>
                            {labelMode === 'all' && (
                              <div className="text-[9px] text-slate-300 mt-0.5 font-medium">
                                {marker.shortMetric}
                              </div>
                            )}
                          </div>
                        </Tooltip>
                      )}

                      {/* Popup Interactivo con Datos Reales y Links de Acceso Directo */}
                      <Popup className="custom-leaflet-popup" maxWidth={320}>
                        <div className="p-2.5 min-w-[260px] text-slate-900 font-mono text-xs space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-[9px] uppercase font-black px-2 py-0.5 rounded text-white"
                              style={{ backgroundColor: marker.color }}
                            >
                              {marker.categoryBadge}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                              {marker.code}
                            </span>
                          </div>

                          <div>
                            <strong className="text-sm font-black uppercase block leading-tight text-slate-900">
                              {marker.name}
                            </strong>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              {marker.address} · {marker.city}, {marker.province}
                            </p>
                          </div>

                          <div className="bg-slate-100 p-2.5 rounded-xl text-[10px] text-slate-700 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Métrica / Sup.:</span>
                              <strong className="text-slate-900">{marker.surface}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Estado:</span>
                              <strong className="text-emerald-700">{marker.status}</strong>
                            </div>
                            <div className="pt-1 border-t border-slate-200 text-slate-600">
                              {marker.extra}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5 pt-1">
                            <Link
                              to={marker.link}
                              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-[10px] text-center flex items-center justify-center gap-1.5 shadow-sm transition"
                            >
                              <span>{marker.linkLabel}</span>
                              <ExternalLink size={11} />
                            </Link>

                            {marker.category === 'plot' && marker.details?.locationId && (
                              <div className="grid grid-cols-2 gap-1.5">
                                <Link
                                  to={`/locations/${marker.details.locationId}`}
                                  className="py-1.5 px-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-bold uppercase text-[9px] text-center transition"
                                >
                                  Ver Predio &rarr;
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleJumpToLineage(marker.details.seedBatchId)}
                                  className="py-1.5 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold uppercase text-[9px] text-center transition"
                                >
                                  Linaje Semilla &rarr;
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* LEYENDA VISUAL EN LA ESQUINA INFERIOR IZQUIERDA DEL MAPA */}
              <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl border border-white/15 shadow-lg text-[10px] flex flex-wrap items-center gap-3 pointer-events-auto">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
                  <span>Parcela Cultivo ({categoryCounts.plot})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 border border-white" />
                  <span>Predio / Locación ({categoryCounts.field})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" />
                  <span>Nodo Acopio ({categoryCounts.storage})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-white" />
                  <span>Obtentor ({categoryCounts.supplier})</span>
                </div>
              </div>

              {/* INSPECTOR VISUAL FLOTANTE DE NODO SELECCIONADO (ACCESO DIRECTO A TODA LA INFORMACIÓN) */}
              {selectedNode && (
                <div className="absolute top-4 right-4 z-[400] w-[92%] sm:w-[390px] max-h-[630px] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl p-5 text-xs animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase text-white"
                          style={{ backgroundColor: selectedNode.color }}
                        >
                          {selectedNode.categoryBadge}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          {selectedNode.code}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1">
                        {selectedNode.name}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {selectedNode.address} · {selectedNode.city}, {selectedNode.province} ({selectedNode.country})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNodeId(null);
                        setSelectedNodeCategory(null);
                      }}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Coordenadas y Métrica Principal */}
                  <div className="grid grid-cols-2 gap-2 my-3">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700">
                      <span className="text-[9px] uppercase text-slate-400 block font-bold">Superficie / Capacidad</span>
                      <strong className="text-xs text-slate-900 dark:text-white">{selectedNode.surface}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700">
                      <span className="text-[9px] uppercase text-slate-400 block font-bold">Coordenadas GPS</span>
                      <strong className="text-[11px] text-slate-900 dark:text-white">
                        {selectedNode.coordinates.lat.toFixed(5)}, {selectedNode.coordinates.lng.toFixed(5)}
                      </strong>
                    </div>
                  </div>

                  {/* DETALLE ESPECÍFICO SEGÚN CATEGORÍA */}
                  {selectedNode.category === 'plot' && selectedNode.details && (
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/70 space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Cultivar INASE:</span>
                          <strong className="text-emerald-700 dark:text-emerald-300">
                            {selectedNode.details.varietyName} ({selectedNode.details.varietyUsage})
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Lote de Semilla:</span>
                          <strong className="text-slate-800 dark:text-slate-200">{selectedNode.details.seedBatchCode}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fecha de Siembra:</span>
                          <strong>{selectedNode.details.sowingDate}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Etapa Fenológica:</span>
                          <strong className="text-emerald-600">{selectedNode.details.latestStage}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Altura / Clima Reg.:</span>
                          <strong>{selectedNode.details.latestHeightCm} · {selectedNode.details.latestTemp} ({selectedNode.details.latestHumidity})</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Pluviómetro / Riego:</span>
                          <strong className="text-sky-600">{selectedNode.details.totalHydricMm}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Geodesia Polígono:</span>
                          <strong>{selectedNode.details.vertexCount} vértices GPS</strong>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <Link
                          to={selectedNode.link}
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-[11px] flex items-center justify-center gap-2 shadow-sm transition"
                        >
                          <span>Abrir Ficha Técnica de la Parcela</span>
                          <ExternalLink size={13} />
                        </Link>
                        <div className="grid grid-cols-2 gap-1.5">
                          {selectedNode.details.locationId && (
                            <Link
                              to={`/locations/${selectedNode.details.locationId}`}
                              className="py-2 px-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold uppercase text-[10px] text-center flex items-center justify-center gap-1"
                            >
                              <span>Ver Predio</span>
                              <ExternalLink size={11} />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => handleJumpToLineage(selectedNode.details.seedBatchId)}
                            className="py-2 px-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold uppercase text-[10px] text-center flex items-center justify-center gap-1"
                          >
                            <GitFork size={11} />
                            <span>Árbol Linaje</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedNode.category === 'field' && selectedNode.details && (
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/70 space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Titular / Entidad:</span>
                          <strong className="text-slate-800 dark:text-slate-200">{selectedNode.details.clientName}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Responsable Técnico:</span>
                          <strong>{selectedNode.details.responsibleName}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tipo de Suelo / Clima:</span>
                          <strong>{selectedNode.details.soilType} · {selectedNode.details.climate}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Agua Acumulada:</span>
                          <strong className="text-sky-600">{selectedNode.details.totalRainMm}</strong>
                        </div>
                      </div>

                      {selectedNode.details.plotsList?.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-slate-500 block">
                            Parcelas Activas en este Predio ({selectedNode.details.plotsList.length}):
                          </span>
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {selectedNode.details.plotsList.map((p: any) => (
                              <div
                                key={p.id}
                                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-[10px] border border-slate-200/60 dark:border-slate-700"
                              >
                                <div>
                                  <strong className="text-slate-900 dark:text-white uppercase block">{p.name}</strong>
                                  <span className="text-slate-500">{p.varietyName} · {p.surface}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleJumpToMapNode(p.id, 'plot')}
                                    className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[9px]"
                                  >
                                    Enfocar
                                  </button>
                                  <Link
                                    to={`/plots/${p.id}`}
                                    className="px-2 py-1 rounded bg-emerald-600 text-white font-bold text-[9px] flex items-center gap-0.5"
                                  >
                                    <span>Ficha</span>
                                    <ExternalLink size={9} />
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Link
                        to={selectedNode.link}
                        className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold uppercase text-[11px] flex items-center justify-center gap-2 shadow-sm transition"
                      >
                        <span>Abrir Ficha Completa del Predio</span>
                        <ExternalLink size={13} />
                      </Link>
                    </div>
                  )}

                  {selectedNode.category === 'storage' && selectedNode.details && (
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/70 space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Código Nodo Oficial:</span>
                          <strong className="text-amber-700 dark:text-amber-300">{selectedNode.details.nodeCode}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Stock Real en Custodia:</span>
                          <strong className="text-emerald-600">{selectedNode.details.totalStockKg}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Entidad / Titular:</span>
                          <strong>{selectedNode.details.clientName}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Responsable:</span>
                          <strong>{selectedNode.details.responsibleName}</strong>
                        </div>
                      </div>

                      {selectedNode.details.custodyBatches?.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-slate-500 block">
                            Lotes en Custodia ({selectedNode.details.custodyBatches.length}):
                          </span>
                          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                            {selectedNode.details.custodyBatches.map((b: any) => (
                              <div
                                key={b.id}
                                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-[10px] border border-slate-200/60 dark:border-slate-700"
                              >
                                <div className="min-w-0 pr-2">
                                  <strong className="text-slate-900 dark:text-white block truncate">{b.batchCode}</strong>
                                  <span className="text-slate-500">{b.varietyName} · {b.remainingKg} kg</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleJumpToLineage(b.id)}
                                  className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9px] shrink-0"
                                >
                                  Ver Linaje
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <Link
                          to="/storage"
                          className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase text-[10px] text-center flex items-center justify-center gap-1.5 shadow-sm transition"
                        >
                          <span>Ir a Almacenes</span>
                          <ExternalLink size={12} />
                        </Link>
                        <Link
                          to="/seed-batches"
                          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold uppercase text-[10px] text-center flex items-center justify-center gap-1.5 shadow-sm transition"
                        >
                          <span>Ver Semillas</span>
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    </div>
                  )}

                  {selectedNode.category === 'supplier' && selectedNode.details && (
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/70 space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">País de Origen:</span>
                          <strong className="text-purple-700 dark:text-purple-300">{selectedNode.details.country}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ID Legal / Registro:</span>
                          <strong>{selectedNode.details.legalId}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Contacto:</span>
                          <strong>{selectedNode.details.contactName}</strong>
                        </div>
                      </div>

                      {selectedNode.details.varietiesList?.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-500 block">
                            Cultivares Provistos ({selectedNode.details.varietiesList.length}):
                          </span>
                          {selectedNode.details.varietiesList.map((v: any) => (
                            <div
                              key={v.id}
                              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-[10px] border border-slate-200/60 dark:border-slate-700"
                            >
                              <strong className="text-slate-900 dark:text-white">{v.name}</strong>
                              <span className="text-slate-500">{v.usage} · THC {v.thc}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <Link
                          to="/suppliers"
                          className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase text-[10px] text-center flex items-center justify-center gap-1.5 shadow-sm transition"
                        >
                          <span>Proveedores</span>
                          <ExternalLink size={12} />
                        </Link>
                        <Link
                          to="/varieties"
                          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold uppercase text-[10px] text-center flex items-center justify-center gap-1.5 shadow-sm transition"
                        >
                          <span>Catálogo Genético</span>
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* MODO 2: ÁRBOL GENEALÓGICO DE TRAZABILIDAD (100% DATOS RELACIONALES REALES)   */}
      {/* ============================================================================ */}
      {activeMode === 'lineage' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* SELECTOR DE LOTE A AUDITAR */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase text-sky-600">Auditoría E2E de Cadena de Custodia</span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-0.5">
                Linaje Agronómico del Lote: {currentLineageBatch?.batchCode || 'Sin lote seleccionado'}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Trazabilidad real conectada a Supabase: obtentor genético, certificación, nodo de acopio, guías ARICCAME y parcelas sembradas.
              </p>
            </div>

            <div className="w-full md:w-96">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Seleccionar Lote de Semilla en Custodia ({seedBatches.length}):
              </label>
              <select
                value={selectedLineageBatchId}
                onChange={e => setSelectedLineageBatchId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl text-xs font-bold outline-none"
              >
                {seedBatches.map(b => {
                  const v = varieties.find(v => v.id === b.varietyId);
                  const sp = storagePoints.find(s => s.id === b.storagePointId);
                  return (
                    <option key={b.id} value={b.id}>
                      {b.batchCode} — {v?.name || 'S/D'} ({Number(b.remainingQuantity || 0).toFixed(2)} kg en {sp?.nodeCode || 'Acopio'})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* DIAGRAMA PIPELINE DEL ÁRBOL GENEALÓGICO CON LINKS DE ACCESO */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* NODO 1: GENÉTICA & GERMOPLASMA */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">1</span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200">
                    Germoplasma & Obtentor
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {currentVariety?.name || 'Variedad no especificada'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Obtentor: {currentSupplier?.name || 'Coopérative HEMP-IT'} ({currentSupplier?.country || 'Francia'})
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Aptitud Industrial:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{currentVariety?.usage || 'Semilla / Fibra'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quimiotipo THC:</span>
                    <strong className="text-emerald-600">{currentVariety?.expectedThc || '< 0.2%'} (No Psicoactivo)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ciclo Vegetativo:</span>
                    <strong>{currentVariety?.cycleDays || 120} días</strong>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Link
                  to="/varieties"
                  className="text-[10px] font-bold uppercase text-purple-600 hover:underline flex items-center gap-1"
                >
                  <span>Catálogo Genético</span>
                  <ExternalLink size={11} />
                </Link>
                {currentSupplier && (
                  <button
                    type="button"
                    onClick={() => handleJumpToMapNode(currentSupplier.id, 'supplier')}
                    className="text-[10px] font-bold uppercase text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                  >
                    <MapPin size={11} />
                    <span>Mapa</span>
                  </button>
                )}
              </div>
            </div>

            {/* NODO 2: LOTE DE INSUMO FISCALIZADO */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">2</span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200">
                    Lote & Fiscalización
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight break-all">
                  {currentLineageBatch?.batchCode}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Cert. / Rótulo: {currentLineageBatch?.certificationNumber || currentLineageBatch?.labelSerialNumber || 'S/N'}
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Volumen Inicial:</span>
                    <strong className="text-blue-600">{Number(currentLineageBatch?.initialQuantity || 0).toFixed(2)} kg</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Stock Remanente:</span>
                    <strong className="text-emerald-600">{Number(currentLineageBatch?.remainingQuantity || 0).toFixed(2)} kg</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fecha Adquisición:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{currentLineageBatch?.purchaseDate || 'S/D'}</strong>
                  </div>
                  {parentLineageBatch && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lote Origen:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedLineageBatchId(parentLineageBatch.id)}
                        className="font-bold text-sky-600 hover:underline"
                      >
                        {parentLineageBatch.batchCode}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link
                  to="/seed-batches"
                  className="text-[10px] font-bold uppercase text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Abrir Lote de Semillas</span>
                  <ExternalLink size={11} />
                </Link>
                <span className="text-[10px] font-bold text-emerald-600">{(currentLineageBatch as any)?.status || 'En Stock'}</span>
              </div>
            </div>

            {/* NODO 3: NODO DE ACOPIO & CUSTODIA */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">3</span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200">
                    Acopio & Custodia
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {currentStorage?.name || 'Almacén No Asignado'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Código Nodo: {currentStorage?.nodeCode || 'S/C'} ({currentStorage?.city || 'S/D'}, {currentStorage?.province || ''})
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tipo de Instalación:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{currentStorage?.type || 'Depósito'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dirección:</span>
                    <strong className="truncate max-w-[160px]">{currentStorage?.address || 'S/D'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Guías Asociadas:</span>
                    <strong className="text-amber-600">{linkedMovements.length} movimientos</strong>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link
                  to="/storage"
                  className="text-[10px] font-bold uppercase text-amber-600 hover:underline flex items-center gap-1"
                >
                  <span>Ir a Almacenes</span>
                  <ExternalLink size={11} />
                </Link>
                {currentStorage && (
                  <button
                    type="button"
                    onClick={() => handleJumpToMapNode(currentStorage.id, 'storage')}
                    className="text-[10px] font-bold uppercase text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                  >
                    <MapPin size={11} />
                    <span>Ver en Mapa</span>
                  </button>
                )}
              </div>
            </div>

            {/* NODO 4: PARCELAS SEMBRADAS & GEODESIA */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">4</span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                    Parcelas de Cultivo ({lineagePlots.length})
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {currentOriginPlot ? currentOriginPlot.name : 'En Reserva de Almacén'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Predio: {currentOriginLocation?.name || 'Sin asignación a campo'}
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  {lineagePlots.length > 0 ? (
                    lineagePlots.map(lp => (
                      <div key={lp.id} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 block text-[11px]">{lp.name}</strong>
                          <span className="text-[10px] text-slate-400">
                            {lp.surfaceArea} {lp.surfaceUnit === 'm2' ? 'm²' : lp.surfaceUnit} · Siembra: {lp.sowingDate || 'S/D'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleJumpToMapNode(lp.id, 'plot')}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600"
                            title="Enfocar en Mapa Satelital"
                          >
                            <MapPin size={12} />
                          </button>
                          <Link
                            to={`/plots/${lp.id}`}
                            className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[9px] uppercase"
                          >
                            Ficha
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Este lote permanece en stock de custodia sin parcelas sembradas directas.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {currentOriginPlot ? (
                  <Link
                    to={`/plots/${currentOriginPlot.id}`}
                    className="text-[10px] font-bold uppercase text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <span>Abrir Parcela</span>
                    <ExternalLink size={11} />
                  </Link>
                ) : (
                  <Link
                    to="/plots"
                    className="text-[10px] font-bold uppercase text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <span>Ver Todas las Parcelas</span>
                    <ExternalLink size={11} />
                  </Link>
                )}
                {currentOriginLocation && (
                  <Link
                    to={`/locations/${currentOriginLocation.id}`}
                    className="text-[10px] font-bold uppercase text-sky-600 hover:underline flex items-center gap-1"
                  >
                    <span>Ver Predio</span>
                    <ExternalLink size={11} />
                  </Link>
                )}
              </div>
            </div>

          </div>

          {/* GUÍAS DE TRÁNSITO ARICCAME VINCULADAS */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Guías de Tránsito ARICCAME Vinculadas a este Lote / Cadena ({linkedMovements.length})
              </h3>
              <Link
                to="/storage"
                className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
              >
                <span>Gestionar Despachos y Guías</span>
                <ExternalLink size={12} />
              </Link>
            </div>
            {linkedMovements.length === 0 ? (
              <p className="text-xs text-slate-400">No se registran despachos logísticos específicos para este lote.</p>
            ) : (
              <div className="space-y-2.5">
                {linkedMovements.map(m => {
                  const destSp = storagePoints.find(s => s.id === m.targetLocationId);
                  const origSp = storagePoints.find(s => s.id === m.originStorageId);
                  return (
                    <div key={m.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-slate-900 dark:text-white font-black">{m.transportGuideNumber}</strong>
                          <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                            {m.quantity} kg
                          </span>
                          <span className="text-slate-400">Fecha: {m.date}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                          Origen: <strong>{origSp?.name || 'BioC Warehousing 1#'}</strong> &rarr; Destino: <strong>{destSp?.name || 'Predio Productivo'}</strong> ({destSp?.city || ''})
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Ruta: {m.routeItinerary || 'Corredor Oficial'} · Transporte: {m.transportCompany || 'Oficial'} · Chofer: {m.driverName} (Dominio: {m.vehiclePlate})
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {destSp && (
                          <button
                            type="button"
                            onClick={() => handleJumpToMapNode(destSp.id, 'storage')}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] uppercase flex items-center gap-1 hover:border-amber-500"
                          >
                            <MapPin size={11} className="text-amber-500" />
                            <span>Ver Destino en Mapa</span>
                          </button>
                        )}
                        <span className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {m.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ============================================================================ */}
      {/* MODO 3: AUDITORÍA DE RIESGO, CONSISTENCIA Y DIRECTORIO DE ACCESOS DIRECTOS    */}
      {/* ============================================================================ */}
      {activeMode === 'alerts' && (
        <div className="space-y-6 animate-in fade-in">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* TARJETA 1: CUMPLIMIENTO THC */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-emerald-600">Límite Legal ARICCAME</span>
                  <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">THC &lt; 0.3% Verificado</h4>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Las {varieties.length} variedades activas ({varieties.map(v => v.name).join(', ')}) registran quimiotipo industrial no psicoactivo (&lt; 0.2% THC).
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <Link to="/varieties" className="text-emerald-600 font-bold hover:underline flex items-center gap-1">
                  <span>Ver Catálogo Genético</span>
                  <ExternalLink size={12} />
                </Link>
                <strong className="text-emerald-600 font-bold">{varieties.length} / {varieties.length} OK</strong>
              </div>
            </div>

            {/* TARJETA 2: TRAZABILIDAD DE LOTES */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <FileCheck2 size={22} />
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-sky-600">Fiscalización INASE / ARICCAME</span>
                  <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Stock & Guías Consistentes</h4>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                {seedBatches.length} lotes de semilla con {seedBatches.reduce((s, b) => s + (Number(b.remainingQuantity) || 0), 0).toFixed(2)} kg disponibles y {seedMovements.length} guías de tránsito auditadas.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <Link to="/seed-batches" className="text-sky-600 font-bold hover:underline flex items-center gap-1">
                  <span>Auditar Inventario</span>
                  <ExternalLink size={12} />
                </Link>
                <strong className="text-sky-600 font-bold">100% Trazado</strong>
              </div>
            </div>

            {/* TARJETA 3: GEODESIA DE PARCELAS Y NODOS */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Compass size={22} />
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-amber-600">Integridad Geoespacial</span>
                  <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Polígonos & Coordenadas OK</h4>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                {plots.length} parcelas con polígonos satelitales propios, {locations.length} predios productivos y {storagePoints.length} nodos de acopio georreferenciados.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <Link to="/plots" className="text-amber-600 font-bold hover:underline flex items-center gap-1">
                  <span>Ir a Parcelas de Cultivo</span>
                  <ExternalLink size={12} />
                </Link>
                <strong className="text-amber-600 font-bold">{allMarkers.length} Nodos Activos</strong>
              </div>
            </div>
          </div>

          {/* MATRIZ INTERACTIVA COMPLETA DE NODOS Y ACCESOS DIRECTOS */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">
              Matriz Maestra de Nodos Activos y Links de Acceso Directo ({allMarkers.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-400">
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3">Nombre / Código</th>
                    <th className="py-2.5 px-3">Ubicación</th>
                    <th className="py-2.5 px-3">Coordenadas GPS</th>
                    <th className="py-2.5 px-3">Métrica / Detalle</th>
                    <th className="py-2.5 px-3 text-right">Acciones Visuales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {allMarkers.map(node => (
                    <tr key={`row-${node.category}-${node.id}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3">
                        <span
                          className="px-2 py-0.5 rounded text-[9px] font-black uppercase text-white inline-block"
                          style={{ backgroundColor: node.color }}
                        >
                          {node.categoryBadge}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <strong className="text-slate-900 dark:text-white uppercase block">{node.name}</strong>
                        <span className="text-[10px] text-slate-400">{node.typeLabel}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {node.city}, {node.province} ({node.country})
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                        {node.coordinates.lat.toFixed(5)}, {node.coordinates.lng.toFixed(5)}
                      </td>
                      <td className="py-3 px-3">
                        <strong className="text-slate-800 dark:text-slate-200 block">{node.surface}</strong>
                        <span className="text-[10px] text-slate-500">{node.extra}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleJumpToMapNode(node.id, node.category)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-slate-700 dark:text-slate-200 font-bold text-[10px] uppercase inline-flex items-center gap-1 transition"
                          >
                            <MapPin size={11} className="text-emerald-500" />
                            <span>Mapa</span>
                          </button>
                          <Link
                            to={node.link}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase inline-flex items-center gap-1 transition"
                          >
                            <span>Ficha</span>
                            <ExternalLink size={11} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
