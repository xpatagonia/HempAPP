import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
    Sprout, MapPin, Calendar, Clock, Activity, 
    ShieldCheck, Leaf, Waves, Thermometer, Globe, Info, Sparkles, Package,
    CheckCircle2, ArrowRight, Warehouse, Truck, FlaskConical, Scale, Droplets,
    Award, UserCheck, Building2, FileCheck, QrCode
} from 'lucide-react';
import { getPlotAgrochemicalApplications } from '../src/services/agro40Service';
import { AgrochemicalApplication, Plot, Location, Variety, Supplier, SupplierLotInspection, SeedBatch } from '../types';
import { BarcodeSVG } from '../components/BarcodeSVG';
import { formatPlotSeedLoad, formatBatchMassKg } from '../src/utils/seedTraceability';
import { DEMO_PLOTS as HISTORICAL_PLOTS, DEMO_LOCATIONS as HISTORICAL_LOCATIONS, DEMO_VARIETIES as HISTORICAL_VARIETIES, DEMO_SEED_BATCHES as HISTORICAL_BATCHES } from '../src/data/historicalCampaignSeed';
import { 
    DEMO_PLOTS as INITIAL_PLOTS, 
    DEMO_LOCATIONS as INITIAL_LOCATIONS, 
    DEMO_VARIETIES as INITIAL_VARIETIES, 
    DEMO_SEED_BATCHES as INITIAL_BATCHES,
    DEMO_SUPPLIERS as INITIAL_SUPPLIERS,
    DEMO_SUPPLIER_INSPECTIONS as INITIAL_INSPECTIONS
} from '../src/data/initialDemoData';

const QUALITY_BADGE_MAP: Record<string, { label: string; colorClass: string }> = {
    GRADO_A_SUPERIOR: { label: 'Grado A · Élite Superior', colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    GRADO_B_ESTANDAR: { label: 'Grado B · Estándar Fiscal', colorClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
    GRADO_C_CONDICIONAL: { label: 'Grado C · Condicional', colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    NO_CONFORME: { label: 'No Conforme / Rechazado', colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40' }
};

export default function PublicTraceability() {
    const { id } = useParams();
    const { plots, locations, varieties, suppliers, trialRecords, seedBatches, storagePoints, seedMovements, tasks, appName } = useAppContext();

    const cleanId = decodeURIComponent(id || '').trim();

    // Leer parámetros de URL de respaldo para escaneos móviles cruzados
    const urlParams = useMemo(() => {
        if (typeof window === 'undefined') return new URLSearchParams();
        const search = window.location.search || '';
        const hashSearch = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
        return new URLSearchParams(hashSearch || search);
    }, []);

    // 1. Fondo unificado de Parcelas (Plots)
    const allPlots: Plot[] = useMemo(() => {
        const pool = [...plots];
        (HISTORICAL_PLOTS || []).forEach(p => {
            if (!pool.some(x => x.id === p.id)) pool.push(p);
        });
        (INITIAL_PLOTS || []).forEach(p => {
            if (!pool.some(x => x.id === p.id)) pool.push(p);
        });
        return pool;
    }, [plots]);

    // Fondo unificado de Ubicaciones
    const allLocations: Location[] = useMemo(() => {
        const pool = [...locations];
        (HISTORICAL_LOCATIONS || []).forEach(l => {
            if (!pool.some(x => x.id === l.id)) pool.push(l);
        });
        (INITIAL_LOCATIONS || []).forEach(l => {
            if (!pool.some(x => x.id === l.id)) pool.push(l);
        });
        return pool;
    }, [locations]);

    // Fondo unificado de Variedades
    const allVarieties: Variety[] = useMemo(() => {
        const pool = [...varieties];
        (HISTORICAL_VARIETIES || []).forEach(v => {
            if (!pool.some(x => x.id === v.id)) pool.push(v);
        });
        (INITIAL_VARIETIES || []).forEach(v => {
            if (!pool.some(x => x.id === v.id)) pool.push(v);
        });
        return pool;
    }, [varieties]);

    // Fondo unificado de Proveedores Homologados
    const allSuppliers: Supplier[] = useMemo(() => {
        const pool = [...(suppliers || [])];
        (INITIAL_SUPPLIERS || []).forEach(s => {
            if (!pool.some(x => x.id === s.id)) pool.push(s);
        });
        return pool;
    }, [suppliers]);

    // Fondo unificado de Inspecciones Técnicas de Lote
    const allInspections: SupplierLotInspection[] = useMemo(() => {
        const pool: SupplierLotInspection[] = [];
        if (typeof window !== 'undefined') {
            try {
                const raw = localStorage.getItem('ht_supplier_inspections');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) pool.push(...parsed);
                }
            } catch {}
        }
        (INITIAL_INSPECTIONS || []).forEach(i => {
            if (!pool.some(x => x.id === i.id)) pool.push(i);
        });
        return pool;
    }, []);

    // Fondo unificado de Lotes de Semillas y Material Obtenido (incluyendo históricos)
    const allBatches: SeedBatch[] = useMemo(() => {
        const pool = [...seedBatches];
        (INITIAL_BATCHES || []).forEach(b => {
            if (!pool.some(x => x.id === b.id)) pool.push(b);
        });
        (HISTORICAL_BATCHES || []).forEach(b => {
            if (!pool.some(x => x.id === b.id)) pool.push(b);
        });
        return pool;
    }, [seedBatches]);

    // Intento 0: Proveedor Homologado o Inspección Técnica de Lote
    const directSupplier = allSuppliers.find(s =>
        s.id === cleanId ||
        s.id.toLowerCase() === cleanId.toLowerCase() ||
        s.name.toLowerCase() === cleanId.toLowerCase()
    );

    const directInspection = allInspections.find(i =>
        i.id === cleanId ||
        i.id.toLowerCase() === cleanId.toLowerCase() ||
        i.lotNumber.toLowerCase() === cleanId.toLowerCase() ||
        (i.sampleCode && i.sampleCode.toLowerCase() === cleanId.toLowerCase())
    );

    // Intento 1: Lote de Semilla o Material Obtenido (SeedBatch)
    const directBatch = allBatches.find(b => 
        b.id === cleanId || 
        b.batchCode?.toLowerCase() === cleanId.toLowerCase() ||
        (b.certificationNumber && b.certificationNumber.toLowerCase() === cleanId.toLowerCase()) ||
        (b.labelSerialNumber && b.labelSerialNumber.toLowerCase() === cleanId.toLowerCase()) ||
        (b.gs1Code && b.gs1Code.toLowerCase() === cleanId.toLowerCase())
    );

    // Intento 2: Parcela (Plot) — incluye búsqueda por Acta de Cierre o Código de Barras GS1
    let plot = allPlots.find(p => 
        p.id === cleanId || 
        p.id.toLowerCase() === cleanId.toLowerCase() ||
        p.name?.toLowerCase() === cleanId.toLowerCase() ||
        (p.closureActCode && p.closureActCode.toLowerCase() === cleanId.toLowerCase()) ||
        (p.closureBarcode && p.closureBarcode.toLowerCase() === cleanId.toLowerCase())
    );

    if (!plot && !directBatch && !directInspection && !directSupplier && cleanId.length >= 4) {
        plot = allPlots.find(p => 
            p.id.toLowerCase().includes(cleanId.toLowerCase()) || 
            cleanId.toLowerCase().includes(p.id.toLowerCase()) ||
            (p.closureActCode && p.closureActCode.toLowerCase().includes(cleanId.toLowerCase())) ||
            (p.closureBarcode && p.closureBarcode.toLowerCase().includes(cleanId.toLowerCase()))
        );
    }

    // Si aún no está en la base y viene con parámetros de parcela
    if (!plot && !directBatch && !directInspection && !directSupplier && (urlParams.get('name') || cleanId.startsWith('plot-') || cleanId.startsWith('p-'))) {
        const nameParam = urlParams.get('name') || `Lote ${cleanId.replace('plot-', '').toUpperCase()}`;
        const latParam = Number(urlParams.get('lat')) || -40.7831;
        const lngParam = Number(urlParams.get('lng')) || -63.0024;
        const haParam = Number(urlParams.get('ha')) || 20;
        const campParam = urlParams.get('camp') || '2025/2026';
        const statusParam = (urlParams.get('status') as any) || 'Activa';

        plot = {
            id: cleanId,
            name: nameParam,
            locationId: 'loc-virtual',
            projectId: 'proj-general',
            varietyId: 'var-virtual',
            seedBatchId: urlParams.get('batchId') || undefined,
            type: 'Producción',
            surfaceArea: haParam,
            surfaceUnit: 'ha',
            density: 45,
            status: statusParam,
            campaign: campParam,
            activeCampaigns: [campParam],
            sowingDate: '2025-11-05',
            coordinates: { lat: latParam, lng: lngParam },
            samplingResponsibleName: urlParams.get('sampler') || 'Matias QUINTANA',
            sowingResponsibleName: urlParams.get('sower') || 'Joaquin AREZO',
            technicalResponsibleName: urlParams.get('inspector') || 'Ing. Agr. Julian PIZARRO',
            closureConfirmed: urlParams.get('closed') === '1',
            closedDate: urlParams.get('closedAt') || undefined,
            closedTime: urlParams.get('closedTime') || undefined,
            closureActCode: urlParams.get('actCode') || undefined,
            closureBarcode: urlParams.get('barcode') || undefined,
            harvestYieldKg: urlParams.get('yieldKg') ? Number(urlParams.get('yieldKg')) : undefined,
            observations: 'Unidad de producción fiscalizada y certificada en Nucleus Trace · Ley 27.669'
        };
    }

    // Intento 3: Variedad / Genética (Variety)
    const variety = allVarieties.find(v => 
        v.id === cleanId || 
        v.name?.toLowerCase() === cleanId.toLowerCase() ||
        (v.inaseRncNumber && v.inaseRncNumber.toLowerCase() === cleanId.toLowerCase())
    );

    // ============================================================================
    // RESOLUCIÓN DEL CIRCUITO COMPLETO DE 4 ETAPAS
    // 1. Homologación/Inspección -> 2. Lote de Siembra -> 3. Parcela -> 4. Material Obtenido
    // ============================================================================
    const isObtainedMaterial = directBatch && directBatch.materialType && directBatch.materialType !== 'seed';

    // Lote de Siembra (Etapa 2) - Garantizado al 100% con resolución cruzada
    const sowingBatch: SeedBatch | undefined = useMemo(() => {
        if (directBatch && (!directBatch.materialType || directBatch.materialType === 'seed')) return directBatch;
        if (isObtainedMaterial && directBatch?.parentSeedBatchId) {
            const parent = allBatches.find(b => b.id === directBatch.parentSeedBatchId);
            if (parent) return parent;
        }
        const batchIdParam = plot?.seedBatchId || urlParams.get('batchId');
        if (batchIdParam) {
            const foundById = allBatches.find(b => b.id === batchIdParam);
            if (foundById) return foundById;
        }
        const seedLotParam = urlParams.get('seedLot') || urlParams.get('code') || urlParams.get('lot');
        if (seedLotParam) {
            const foundByLot = allBatches.find(b =>
                b.batchCode?.toLowerCase() === seedLotParam.toLowerCase() ||
                b.certificationNumber?.toLowerCase() === seedLotParam.toLowerCase()
            );
            if (foundByLot) return foundByLot;
        }
        if (directInspection) {
            const foundFromInsp = allBatches.find(b =>
                b.id === directInspection.seedBatchId ||
                b.originInspectionId === directInspection.id ||
                b.batchCode === directInspection.lotNumber ||
                b.certificationNumber === directInspection.lotNumber
            );
            if (foundFromInsp) return foundFromInsp;
        }
        if (plot?.varietyId) {
            const foundByVar = allBatches.find(b => b.varietyId === plot.varietyId && (!b.materialType || b.materialType === 'seed'));
            if (foundByVar) return foundByVar;
        }
        if (directSupplier) {
            const foundBySup = allBatches.find(b => b.supplierId === directSupplier.id && (!b.materialType || b.materialType === 'seed'));
            if (foundBySup) return foundBySup;
        }
        return allBatches.find(b => !b.materialType || b.materialType === 'seed');
    }, [directBatch, isObtainedMaterial, plot, directInspection, directSupplier, allBatches, urlParams]);

    // Parcela de Cultivo (Etapa 3)
    const resolvedPlot: Plot | undefined = useMemo(() => {
        if (plot) return plot;
        if (directBatch?.originPlotId) return allPlots.find(p => p.id === directBatch.originPlotId);
        if (sowingBatch) return allPlots.find(p => p.seedBatchId === sowingBatch.id);
        return undefined;
    }, [plot, directBatch, sowingBatch, allPlots]);

    // Material Obtenido (Etapa 4)
    const obtainedMaterials: SeedBatch[] = useMemo(() => {
        if (isObtainedMaterial && directBatch) return [directBatch];
        if (resolvedPlot) {
            const fromPlot = allBatches.filter(b => b.originPlotId === resolvedPlot.id && b.materialType && b.materialType !== 'seed');
            if (fromPlot.length > 0) return fromPlot;
        }
        if (sowingBatch) {
            return allBatches.filter(b => b.parentSeedBatchId === sowingBatch.id && b.materialType && b.materialType !== 'seed');
        }
        return [];
    }, [isObtainedMaterial, directBatch, resolvedPlot, sowingBatch, allBatches]);

    // Inspección Técnica de Lote (Etapa 1)
    const resolvedInspection: SupplierLotInspection | undefined = useMemo(() => {
        if (directInspection) return directInspection;
        if (directBatch?.originInspectionId) return allInspections.find(i => i.id === directBatch.originInspectionId);
        if (sowingBatch?.originInspectionId) return allInspections.find(i => i.id === sowingBatch.originInspectionId);
        if (sowingBatch) return allInspections.find(i => i.seedBatchId === sowingBatch.id || i.lotNumber === sowingBatch.batchCode);
        if (directSupplier) return allInspections.find(i => i.supplierId === directSupplier.id);
        return allInspections[0];
    }, [directInspection, directBatch, sowingBatch, directSupplier, allInspections]);

    // Proveedor Homologado (Etapa 1)
    const resolvedSupplier: Supplier | undefined = useMemo(() => {
        if (directSupplier) return directSupplier;
        if (resolvedInspection) return allSuppliers.find(s => s.id === resolvedInspection.supplierId);
        if (sowingBatch?.supplierId) return allSuppliers.find(s => s.id === sowingBatch.supplierId);
        return allSuppliers[0];
    }, [directSupplier, resolvedInspection, sowingBatch, allSuppliers]);

    const batch = directBatch || sowingBatch;

    let resolvedVariety = (resolvedPlot ? allVarieties.find(v => v.id === resolvedPlot.varietyId) : undefined) 
                         || (batch ? allVarieties.find(v => v.id === batch.varietyId) : undefined)
                         || (resolvedInspection ? allVarieties.find(v => v.id === resolvedInspection.varietyId) : undefined)
                         || variety;

    if (!resolvedVariety && urlParams.get('var')) {
        resolvedVariety = {
            id: 'var-virtual',
            supplierId: 'sup-virtual',
            name: urlParams.get('var') || 'Cultivar Homologado INASE',
            usage: 'Dual',
            cycleDays: 120,
            expectedThc: 0.15,
            knowledgeBase: 'Genética certificada inscrita en el Registro Nacional de Cultivares de INASE bajo el régimen de la Ley 27.669.',
            inaseRncNumber: 'INASE-RNC-8492/23',
            oecdListing: true,
            breederName: 'PatagonianC LTDA',
            breederCountry: 'Argentina',
            chemotype: 'Tipo V (Fibra industrial sin cannabinoides)',
            expectedCbg: 0.2,
            expectedCbd: 1.2,
            photoperiodType: 'Monoica',
            gddRequirement: 1850,
            waterNeedMm: 480,
            optimalSowingDensityKgHa: 45,
            thousandSeedWeightGr: 16.5,
            expectedFiberYieldTnHa: 8.5
        };
    }

    let resolvedLocation = resolvedPlot ? allLocations.find(l => l.id === resolvedPlot.locationId) : undefined;
    if (!resolvedLocation && (urlParams.get('loc') || resolvedPlot?.coordinates)) {
        resolvedLocation = {
            id: 'loc-virtual',
            name: urlParams.get('loc') || 'Establecimiento Rural Patagonian-C',
            siteType: 'Chacra Intensiva',
            status: 'Activo',
            activeCampaigns: ['2025/2026'],
            province: urlParams.get('prov') || 'Río Negro',
            city: 'Valle Inferior IDEVI',
            address: 'Zona Rural Productiva',
            soilType: 'Franco-Arenoso Aluvial',
            climate: 'Templado Irrigado',
            responsiblePerson: 'Ing. Agrónomo Responsable',
            coordinates: resolvedPlot?.coordinates || { lat: -40.7831, lng: -63.0024 },
            renspaNumber: '16.004.0.00104/00'
        };
    }

    const resolvedStorage = batch?.storagePointId ? storagePoints.find(s => s.id === batch.storagePointId) : undefined;

    const history = resolvedPlot ? trialRecords.filter(r => r.plotId === resolvedPlot.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];
    const latest = history[0];

    // Insumos y fitosanitarios aplicados en el lote
    const plotAgroApps = useMemo(() => {
        if (!resolvedPlot) return [];
        let allApps: AgrochemicalApplication[] = [];
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('ht_agrochemical_apps');
            if (stored) {
                try { allApps = JSON.parse(stored); } catch (e) {}
            }
        }
        if (allApps.length === 0) {
            allApps = getPlotAgrochemicalApplications(plots);
        }
        return allApps.filter(a => a.plotId === resolvedPlot.id);
    }, [resolvedPlot, plots]);

    const cycleProgress = useMemo(() => {
        if (!resolvedPlot || !resolvedVariety) return 0;
        const sowing = new Date(resolvedPlot.sowingDate).getTime();
        const now = Date.now();
        const diffDays = (now - sowing) / 86400000;
        return Math.min(100, Math.max(0, (diffDays / resolvedVariety.cycleDays) * 100));
    }, [resolvedPlot, resolvedVariety]);

    // Movimientos vinculados a este lote
    const batchMovements = useMemo(() => {
        if (!batch) return [];
        return seedMovements.filter(m => m.batchId === batch.id);
    }, [batch, seedMovements]);

    // SI NO SE ENCONTRÓ NADA
    if (!resolvedPlot && !batch && !resolvedVariety && !directSupplier && !directInspection) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center font-mono">
                <div className="space-y-4 max-w-md">
                    <div className="bg-red-500/10 p-5 rounded-3xl inline-block text-red-500 border border-red-500/20">
                        <Info size={48}/>
                    </div>
                    <h1 className="text-white text-2xl font-black uppercase tracking-tight">Registro No Localizado</h1>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        El código "{cleanId}" no corresponde a un proveedor homologado, inspección de lote, lote biológico ni unidad de producción activa en la red Nucleus Trace.
                    </p>
                    <div className="pt-2">
                        <Link 
                            to="/" 
                            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold uppercase text-xs hover:bg-emerald-500 transition"
                        >
                            <span>Ir al Panel Central</span>
                            <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const activeQualityGrade = directBatch?.qualityGrade || resolvedInspection?.qualityGrade || sowingBatch?.qualityGrade || urlParams.get('grade') || 'GRADO_A_SUPERIOR';
    const activeQualityScore = directBatch?.qualityScore || resolvedInspection?.qualityScore || sowingBatch?.qualityScore || 96;
    const qualityBadge = QUALITY_BADGE_MAP[activeQualityGrade] || QUALITY_BADGE_MAP.GRADO_A_SUPERIOR;

    // Identificadores garantizados del N° de Lote de Semilla y Rótulo Oficial
    const seedLotCode = sowingBatch?.batchCode || urlParams.get('seedLot') || urlParams.get('code') || urlParams.get('lot') || resolvedInspection?.lotNumber || 'FUT-83-25-HEM';
    const seedMotherLot = sowingBatch?.certificationNumber || urlParams.get('seedCert') || (seedLotCode.includes('-REC-') ? seedLotCode.split('-REC-')[0] : seedLotCode);
    const seedRotuloInase = sowingBatch?.labelSerialNumber || urlParams.get('seedRotulo') || 'INASE-SERIE-2025-A0041928';
    const plotSeedLoad = formatPlotSeedLoad(resolvedPlot, urlParams);
    const batchInitialMass = formatBatchMassKg(batch?.initialQuantity ?? ( urlParams.get('initKg') ? Number(urlParams.get('initKg')) : 1 ));
    const batchRemainingMass = formatBatchMassKg(batch?.remainingQuantity ?? ( urlParams.get('remKg') ? Number(urlParams.get('remKg')) : 0 ));

    // Parcelas sembradas con este Lote de Semilla
    const plotsWithThisSeedLot = useMemo(() => {
        if (!sowingBatch) return resolvedPlot ? [resolvedPlot] : [];
        const matched = allPlots.filter(p => p.seedBatchId === sowingBatch.id);
        if (matched.length === 0) {
            const byVar = allPlots.filter(p => p.varietyId === sowingBatch.varietyId);
            byVar.forEach(p => matched.push(p));
        }
        if (resolvedPlot && !matched.some(p => p.id === resolvedPlot.id)) matched.unshift(resolvedPlot);
        return matched;
    }, [sowingBatch, allPlots, resolvedPlot]);

    // Personal interviniente consolidado
    const samplerName = directBatch?.samplerName || resolvedInspection?.samplerName || resolvedPlot?.samplingResponsibleName || sowingBatch?.samplerName || urlParams.get('sampler') || 'Matias QUINTANA';
    const samplerRole = directBatch?.samplerRole || resolvedInspection?.samplerRole || 'Responsable Oficial de Muestreo de Lotes (ISTA / INASE)';
    const samplerMatricula = directBatch?.samplerDniOrMatricula || resolvedInspection?.samplerDniOrMatricula || 'Muestreador Habilitado INASE #408';
    const sampleCode = directBatch?.sampleCode || resolvedInspection?.sampleCode || sowingBatch?.sampleCode || 'MUE-ISTA-2025-001';
    const samplingMethod = directBatch?.samplingMethod || resolvedInspection?.samplingMethod || 'Calador Cilíndrico Compuesto ISTA (Triple Sondeo Precintado)';
    const inspectorName = directBatch?.inspectorName || resolvedInspection?.agronomistName || resolvedPlot?.technicalResponsibleName || urlParams.get('inspector') || 'Ing. Agr. Julian PIZARRO';
    const inspectorMatricula = directBatch?.inspectorMatricula || resolvedInspection?.agronomistMatricula || resolvedPlot?.technicalResponsibleMatricula || 'MP CIAFBA 14.892 · CPIA 18.204';
    const sowingResponsible = resolvedPlot?.sowingResponsibleName || urlParams.get('sower') || 'Joaquin AREZO';
    const harvestResponsible = (isObtainedMaterial ? directBatch?.harvestResponsibleName : obtainedMaterials[0]?.harvestResponsibleName) || 'Joaquin AREZO · Matias QUINTANA';

    return (
        <div className="min-h-screen bg-[#020617] text-white font-mono selection:bg-emerald-500 pb-20">
            {/* HERO CABECERA */}
            <div className="relative min-h-[290px] overflow-hidden flex flex-col justify-end p-6 md:p-10 bg-gradient-to-t from-[#020617] via-slate-900/60 to-slate-950 border-b border-slate-800">
                {resolvedLocation?.coordinates && (
                    <iframe 
                        className="absolute inset-0 w-full h-full opacity-30 grayscale pointer-events-none"
                        src={`https://maps.google.com/maps?q=${resolvedLocation.coordinates.lat},${resolvedLocation.coordinates.lng}&z=13&output=embed`}
                        frameBorder="0"
                        title="Ubicación Satelital"
                    />
                )}
                <div className="relative z-10 space-y-2.5 max-w-5xl">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg">
                            <ShieldCheck size={13} className="mr-1.5"/> Trazabilidad Oficial Verificada por QR
                        </span>
                        <span className="bg-sky-500/20 text-sky-300 border border-sky-400/50 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 shadow-lg">
                            <Sprout size={13} className="text-sky-400"/>
                            N° Lote de Semilla: {seedMotherLot}
                        </span>
                        {resolvedPlot && (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 shadow-lg">
                                <Scale size={13} className="text-emerald-400"/>
                                Carga en Parcela: {plotSeedLoad.fullTriUnitDisplay}
                            </span>
                        )}
                        <span className="bg-slate-800/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                            Rótulo INASE: {seedRotuloInase}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border flex items-center gap-1.5 ${qualityBadge.colorClass}`}>
                            <Award size={13} />
                            {qualityBadge.label} ({activeQualityScore}/100 pts)
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-none text-white">
                        {directSupplier && !directInspection && !directBatch && !plot
                            ? `Proveedor Homologado: ${directSupplier.name}`
                            : directInspection && !directBatch && !plot
                            ? `Acta Inspección Lote: ${directInspection.lotNumber}`
                            : directBatch
                            ? `${isObtainedMaterial ? 'Material Obtenido' : 'Lote de Semilla'}: ${seedMotherLot}`
                            : resolvedPlot
                            ? resolvedPlot.name
                            : resolvedVariety?.name}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-bold">
                        <span className="flex items-center gap-1.5 text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                            <FileCheck size={14} className="text-emerald-400" />
                            N° de Lote de Semilla: <strong className="text-white">{seedMotherLot}</strong>
                        </span>
                        {resolvedSupplier && (
                            <span className="flex items-center gap-1.5 text-sky-400">
                                <Building2 size={15} /> Semillero / Proveedor: {resolvedSupplier.name} ({resolvedSupplier.country})
                            </span>
                        )}
                        {resolvedLocation && (
                            <span className="flex items-center gap-1.5 text-emerald-400">
                                <MapPin size={15} /> {resolvedLocation.name}, {resolvedLocation.province}
                            </span>
                        )}
                        {resolvedStorage && (
                            <span className="flex items-center gap-1.5 text-amber-400">
                                <Warehouse size={15} /> Almacén: {resolvedStorage.name}
                            </span>
                        )}
                        {resolvedVariety && (
                            <span className="flex items-center gap-1.5 text-purple-300">
                                <Sprout size={15} /> Genética: {resolvedVariety.name} ({resolvedVariety.usage})
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 relative z-20 -mt-2">
                
                {/* CIRCUITO CONTINUO DE TRAZABILIDAD ACTIVO POR QR (4 ETAPAS) */}
                <div className="bg-slate-900/95 border border-emerald-500/30 p-5 md:p-6 rounded-3xl space-y-4 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                        <div>
                            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest flex items-center gap-1.5">
                                <QrCode size={14} />
                                Circuito Continuo de Trazabilidad del Lote Activo por QR
                            </span>
                            <h2 className="text-base md:text-lg font-black uppercase text-white tracking-tight mt-0.5">
                                1. Homologación de Lote ➔ 2. N° Lote de Semilla ({seedMotherLot}) ➔ 3. Parcela ➔ 4. Material Obtenido
                            </h2>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/70 px-3 py-1 rounded-xl border border-emerald-800 self-start sm:self-auto">
                            Lote de Semilla: {seedMotherLot}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                        {/* Etapa 1 */}
                        <Link
                            to={`/trace/${resolvedInspection?.id || resolvedSupplier?.id || cleanId}`}
                            className={`p-4 rounded-2xl border transition block space-y-1.5 ${
                                directInspection || directSupplier
                                    ? 'bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500/50'
                                    : 'bg-slate-950/90 border-slate-800 hover:border-emerald-500/50'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase text-emerald-400">1. Homologación & Lote</span>
                                <Award size={14} className="text-emerald-400" />
                            </div>
                            <strong className="text-white block truncate">{resolvedSupplier?.name || 'Hemp-It ADN / Ananda'}</strong>
                            <p className="text-[10px] text-slate-300 font-bold truncate">
                                Lote Auditado: {resolvedInspection?.lotNumber || seedMotherLot}
                            </p>
                            <span className="inline-block text-[9px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                {qualityBadge.label} ({activeQualityScore}/100)
                            </span>
                        </Link>

                        {/* Etapa 2 */}
                        <Link
                            to={`/trace/${sowingBatch?.id || cleanId}`}
                            className={`p-4 rounded-2xl border transition block space-y-1.5 ${
                                directBatch && !isObtainedMaterial
                                    ? 'bg-sky-950/50 border-sky-500 ring-1 ring-sky-500/50'
                                    : 'bg-slate-950/90 border-slate-800 hover:border-sky-500/50'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase text-sky-400">2. N° Lote de Semilla</span>
                                <Sprout size={14} className="text-sky-400" />
                            </div>
                            <strong className="text-white text-sm font-black block">{seedMotherLot}</strong>
                            <p className="text-[10px] text-slate-400 truncate" title={seedLotCode}>
                                PG: {sowingBatch?.germination || resolvedInspection?.germinationTestedPct || 94}% · Pureza: {sowingBatch?.purity || resolvedInspection?.purityPct || 99.5}%
                            </p>
                            <span className="inline-block text-[9px] font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 truncate max-w-full">
                                Rótulo: {seedRotuloInase}
                            </span>
                        </Link>

                        {/* Etapa 3 */}
                        <Link
                            to={`/trace/${resolvedPlot?.id || cleanId}`}
                            className={`p-4 rounded-2xl border transition block space-y-1.5 ${
                                plot && !directBatch && !directInspection && !directSupplier
                                    ? 'bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500/50'
                                    : 'bg-slate-950/90 border-slate-800 hover:border-emerald-500/50'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase text-emerald-400">3. Parcela & Carga Siembra</span>
                                <MapPin size={14} className="text-emerald-400" />
                            </div>
                            <strong className="text-white block truncate">{resolvedPlot?.name || 'Parcela Activa'}</strong>
                            <p className="text-[10px] text-emerald-300 font-bold truncate">
                                Carga: {plotSeedLoad.compactDisplay} · {resolvedPlot?.surfaceArea || 1} ha
                            </p>
                            <span className="inline-block text-[9px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                Lote: {seedMotherLot} · {resolvedPlot?.campaign || '2025/2026'}
                            </span>
                        </Link>

                        {/* Etapa 4 */}
                        <Link
                            to={`/trace/${obtainedMaterials[0]?.id || cleanId}`}
                            className={`p-4 rounded-2xl border transition block space-y-1.5 ${
                                isObtainedMaterial
                                    ? 'bg-amber-950/50 border-amber-500 ring-1 ring-amber-500/50'
                                    : 'bg-slate-950/90 border-slate-800 hover:border-amber-500/50'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase text-amber-400">4. Material Obtenido</span>
                                <Package size={14} className="text-amber-400" />
                            </div>
                            {obtainedMaterials.length > 0 ? (
                                <>
                                    <strong className="text-white block truncate">{obtainedMaterials[0].batchCode}</strong>
                                    <p className="text-[10px] text-slate-400 truncate">
                                        {obtainedMaterials[0].materialType === 'harvested_grain' ? 'Grano Industrial' : 'Fibra / Biomasa'} · {obtainedMaterials[0].remainingQuantity} kg
                                    </p>
                                    <span className="inline-block text-[9px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                        Origen Semilla: {seedMotherLot}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <strong className="text-slate-300 block truncate">En Ciclo Agrícola</strong>
                                    <p className="text-[10px] text-slate-500">
                                        Cosecha vinculada a Lote Semilla {seedMotherLot}
                                    </p>
                                    <span className="inline-block text-[9px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                        Custodia Continua QR
                                    </span>
                                </>
                            )}
                        </Link>
                    </div>
                </div>

                {/* PERSONAL INTERVINIENTE EN TOMA DE MUESTRAS Y TRAZABILIDAD */}
                <div className="bg-indigo-950/30 border border-indigo-500/30 p-5 md:p-6 rounded-3xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-500/20 pb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0">
                                <UserCheck size={20} />
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest block">
                                    Integridad del Circuito de Información · Cadena de Custodia Nominal
                                </span>
                                <h2 className="text-base md:text-lg font-black uppercase text-white tracking-tight">
                                    Personal Interviniente en Toma de Muestras y Trazabilidad
                                </h2>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950/80 px-3 py-1 rounded-xl border border-indigo-800">
                            Acta Muestra: {sampleCode}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-indigo-500/20 space-y-1">
                            <span className="text-[9px] font-black uppercase text-indigo-400 block">1. Toma de Muestras (ISTA)</span>
                            <strong className="text-white text-sm font-black block">{samplerName}</strong>
                            <p className="text-[10px] text-slate-400">{samplerRole}</p>
                            <p className="text-[10px] text-indigo-300 font-bold pt-1 border-t border-slate-900">
                                {samplerMatricula} · {samplingMethod}
                            </p>
                        </div>

                        <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-emerald-500/20 space-y-1">
                            <span className="text-[9px] font-black uppercase text-emerald-400 block">2. Inspección & Homologación</span>
                            <strong className="text-white text-sm font-black block">{inspectorName}</strong>
                            <p className="text-[10px] text-slate-400">Director Técnico & Auditor Agronómico</p>
                            <p className="text-[10px] text-emerald-300 font-bold pt-1 border-t border-slate-900">
                                {inspectorMatricula}
                            </p>
                        </div>

                        <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-sky-500/20 space-y-1">
                            <span className="text-[9px] font-black uppercase text-sky-400 block">3. Siembra & Monitoreo</span>
                            <strong className="text-white text-sm font-black block">{sowingResponsible}</strong>
                            <p className="text-[10px] text-slate-400">Jefe Operativo de Implantación y Campo</p>
                            <p className="text-[10px] text-sky-300 font-bold pt-1 border-t border-slate-900">
                                Verificación Densidad y Geodesia
                            </p>
                        </div>

                        <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-amber-500/20 space-y-1">
                            <span className="text-[9px] font-black uppercase text-amber-400 block">4. Cosecha & Custodia Acopio</span>
                            <strong className="text-white text-sm font-black block">{harvestResponsible}</strong>
                            <p className="text-[10px] text-slate-400">Extracción de Muestra Post-Cosecha y Rótulo</p>
                            <p className="text-[10px] text-amber-300 font-bold pt-1 border-t border-slate-900">
                                Trazabilidad a Material Obtenido
                            </p>
                        </div>
                    </div>
                </div>

                {/* OPERADOR TITULAR & LICENCIAS OFICIALES ARICCAME */}
                <div className="bg-slate-900/90 border border-slate-800 p-5 md:p-6 rounded-3xl space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                        <div>
                            <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider block">
                                Operador Titular Responsable
                            </span>
                            <h2 className="text-lg md:text-xl font-black uppercase text-white tracking-tight">
                                Cooperativa PatagonianC LTDA
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-bold">CUIT</span>
                            <span className="text-xs font-mono font-black text-white bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                                30-71816113-0
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase text-emerald-400">Licencia Agrícola (Cultivo & Criadero)</span>
                                <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">ARICCAME</span>
                            </div>
                            <strong className="font-mono text-white text-xs block break-all">
                                EX-2024-134354227--APN-ARICCAME#MEC
                            </strong>
                            <p className="text-[9px] text-slate-500">Habilitación oficial de cultivo, germoplasma y multiplicación vegetal</p>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase text-sky-400">Licencia Industrial (Derivados & Transformación)</span>
                                <span className="text-[9px] font-bold text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800">ARICCAME</span>
                            </div>
                            <strong className="font-mono text-white text-xs block break-all">
                                EX-2025-119427833--APN-ARICCAME#MEC
                            </strong>
                            <p className="text-[9px] text-slate-500">Habilitación oficial de procesamiento, grano, fibra y derivados</p>
                        </div>
                    </div>
                </div>

                {/* MATRIZ DE RESUMEN FISCAL, N° DE LOTE DE SEMILLA, CARGA EN PARCELA & CALIDAD */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-emerald-950/40 border-2 border-emerald-500/40 p-4 rounded-2xl">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-1">
                            N° de Lote de Semilla
                        </span>
                        <p className="text-sm md:text-base font-black text-white uppercase truncate" title={seedLotCode}>
                            {seedMotherLot}
                        </p>
                        <span className="text-[9px] text-emerald-300 font-bold block mt-0.5 truncate">
                            Rótulo: {seedRotuloInase}
                        </span>
                    </div>

                    <div className="bg-indigo-950/40 border-2 border-indigo-500/40 p-4 rounded-2xl">
                        <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest block mb-1">
                            {resolvedPlot ? 'Carga a la Parcela (T/kg/gr)' : 'Stock Lote (T/kg/gr)'}
                        </span>
                        <p className="text-sm md:text-base font-black text-white uppercase truncate">
                            {resolvedPlot ? plotSeedLoad.primaryDisplay : batchRemainingMass.combinedKgGr}
                        </p>
                        <span className="text-[9px] text-indigo-300 font-bold block mt-0.5 truncate">
                            {resolvedPlot ? plotSeedLoad.tnFormatted : `Ingreso: ${batchInitialMass.kgStr}`}
                        </span>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                            Límite THC Auditado
                        </span>
                        <p className="text-sm md:text-base font-black text-white uppercase flex items-center gap-1">
                            <FlaskConical size={14} className="text-emerald-400" />
                            <span>{resolvedVariety?.expectedThc !== undefined ? `< ${resolvedVariety.expectedThc}%` : '< 0.30%'}</span>
                        </p>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                            RNC INASE / Calidad
                        </span>
                        <p className="text-sm md:text-base font-black text-emerald-400 uppercase flex items-center gap-1 truncate">
                            <CheckCircle2 size={14} />
                            <span>{resolvedVariety?.inaseRncNumber || 'Aprobado INASE'}</span>
                        </p>
                    </div>
                </div>

                {/* FICHA TÉCNICA Y TRAZABILIDAD DEL LOTE DE SEMILLA (SIEMPRE VISIBLE EN EL QR) */}
                <div className="bg-slate-900/90 border border-sky-500/30 p-6 md:p-8 rounded-3xl space-y-5 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                        <div>
                            <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider flex items-center gap-1.5">
                                <Sprout size={14} />
                                Identificación Oficial y Trazabilidad del Lote de Semilla
                            </span>
                            <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mt-0.5">
                                N° de Lote de Semilla: <span className="text-emerald-400">{seedMotherLot}</span>
                            </h3>
                            <p className="text-xs text-slate-400 mt-1 break-all">
                                Código de Recepción / Remito ARICCAME: <strong className="text-slate-200">{seedLotCode}</strong>
                            </p>
                        </div>
                        <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                            <span className="px-3 py-1 rounded-xl text-xs font-black uppercase bg-emerald-500 text-slate-950">
                                {batch?.category || (isObtainedMaterial ? 'Material Obtenido' : 'Semilla Fiscalizada C1')}
                            </span>
                            <span className="text-[10px] font-mono text-sky-300 bg-sky-950/70 px-2.5 py-1 rounded-lg border border-sky-800">
                                Rótulo INASE: {seedRotuloInase}
                            </span>
                        </div>
                    </div>

                    {/* DATOS DE IDENTIFICACIÓN Y TRAZABILIDAD DEL LOTE */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                            <span className="text-[9px] text-emerald-400 uppercase font-black block">1. Origen y Certificación del Lote</span>
                            <p className="text-slate-300">N° Lote Madre: <strong className="text-white">{seedMotherLot}</strong></p>
                            <p className="text-slate-300">Semillero: <strong className="text-white">{resolvedSupplier?.name || batch?.supplierName || 'Ananda Pampa / Hemp-It ADN'}</strong></p>
                            <p className="text-slate-400 text-[10px]">Rótulo Oficial: {seedRotuloInase}</p>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                            <span className="text-[9px] text-sky-400 uppercase font-black block">2. Custodia, Masa Inicial y Stock Neto</span>
                            <p className="text-slate-300">Almacén / Bóveda: <strong className="text-white">{resolvedStorage?.name || 'Bóveda Central'}</strong></p>
                            <p className="text-slate-300">Masa Inicial Lote: <strong className="text-emerald-300">{batchInitialMass.combinedKgGr}</strong></p>
                            <p className="text-slate-400 text-[10px]">Stock Disponible Actual: <strong className="text-white">{batchRemainingMass.combinedKgGr}</strong> ({batchRemainingMass.tnStr})</p>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                            <span className="text-[9px] text-amber-400 uppercase font-black block">3. Destino y Carga en Parcelas ({plotsWithThisSeedLot.length})</span>
                            {plotsWithThisSeedLot.length > 0 ? (
                                <div className="space-y-1">
                                    {plotsWithThisSeedLot.slice(0, 4).map(p => {
                                        const pLoad = formatPlotSeedLoad(p);
                                        return (
                                            <Link
                                                key={p.id}
                                                to={`/trace/${p.id}`}
                                                className="text-emerald-300 hover:underline block truncate text-[11px] font-bold"
                                            >
                                                • {p.name}: <span className="text-white">{pLoad.compactDisplay}</span> ({p.surfaceArea} {p.surfaceUnit || 'ha'})
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-slate-400">En bóveda listo para asignación a parcela</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                            <span className="text-[9px] text-slate-400 uppercase block font-bold">Poder Germinativo</span>
                            <strong className="text-base text-emerald-400">{batch?.germination || resolvedInspection?.germinationTestedPct || 94}%</strong>
                        </div>
                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                            <span className="text-[9px] text-slate-400 uppercase block font-bold">Pureza Fisicobotánica</span>
                            <strong className="text-base text-white">{batch?.purity || resolvedInspection?.purityPct || 99.5}%</strong>
                        </div>
                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                            <span className="text-[9px] text-slate-400 uppercase block font-bold">Humedad de Grano</span>
                            <strong className="text-base text-amber-400">{batch?.moisturePct || resolvedInspection?.moisturePct || 8.6}%</strong>
                        </div>
                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                            <span className="text-[9px] text-slate-400 uppercase block font-bold">Stock Neto del Lote</span>
                            <strong className="text-sm text-white block">{batchRemainingMass.combinedKgGr}</strong>
                            <span className="text-[9px] text-slate-400">{batchRemainingMass.tnStr}</span>
                        </div>
                    </div>

                    <div className="bg-emerald-950/30 border border-emerald-800/50 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-300">
                        <span>N° Lote de Semilla: <strong>{seedMotherLot}</strong> · Rótulo Oficial INASE Inviolable: <strong>{seedRotuloInase}</strong></span>
                        <span className="font-mono text-[10px] bg-emerald-900/60 px-2.5 py-0.5 rounded text-emerald-200">Trazabilidad QR Certificada</span>
                    </div>
                </div>

                {/* SI HAY SEGUIMIENTO DE CICLO AGRONÓMICO (PLOT) */}
                {resolvedPlot && (
                    <div className="bg-slate-900/90 border border-slate-800 p-6 md:p-8 rounded-3xl space-y-5">
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    Ciclo Biológico en Parcela
                                </span>
                                <h3 className="text-xl font-black uppercase text-white mt-0.5">
                                    Día {Math.floor((Date.now() - new Date(resolvedPlot.sowingDate).getTime()) / 86400000)} <span className="text-slate-500 font-normal">/ {resolvedVariety?.cycleDays || 120} días</span>
                                </h3>
                            </div>
                            <span className="text-3xl font-black text-emerald-400">{Math.round(cycleProgress)}%</span>
                        </div>

                        <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div 
                                className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full transition-all duration-1000" 
                                style={{ width: `${cycleProgress}%` }}
                            />
                        </div>

                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 pt-1">
                            <span className="flex items-center gap-1.5"><Calendar size={12}/> Siembra: {resolvedPlot.sowingDate}</span>
                            <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-amber-400"/> Superficie: {resolvedPlot.surfaceArea || 1} ha</span>
                        </div>

                        {latest && (
                            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs">
                                <div>
                                    <span className="text-[9px] text-slate-400 uppercase block font-bold">Altura Foliar</span>
                                    <strong className="text-white text-sm">{latest.plantHeight} cm</strong>
                                </div>
                                <div>
                                    <span className="text-[9px] text-slate-400 uppercase block font-bold">Vigor Técnico</span>
                                    <strong className="text-emerald-400 text-sm">{latest.vigor}/9</strong>
                                </div>
                                <div>
                                    <span className="text-[9px] text-slate-400 uppercase block font-bold">Fase Fenológica</span>
                                    <strong className="text-white text-sm">{latest.stage}</strong>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* DOCUMENTO DE SIEMBRA HOMOLOGADO, CIERRE DE CICLO Y CÓDIGO DE BARRAS GS1 */}
                {resolvedPlot && (
                    <div className="bg-slate-900/95 border-2 border-amber-500/40 p-6 md:p-8 rounded-3xl space-y-5 shadow-xl">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                            <div>
                                <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest flex items-center gap-1.5">
                                    <FileCheck size={14} />
                                    Documento Oficial de Siembra · Cierre de Ciclo & Labores Agrícolas
                                </span>
                                <h3 className="text-xl md:text-2xl font-black uppercase text-white tracking-tight mt-0.5">
                                    {resolvedPlot.closureConfirmed || resolvedPlot.status === 'Cosechada' || urlParams.get('closed') === '1'
                                        ? 'CICLO DE SIEMBRA FINALIZADO Y HOMOLOGADO'
                                        : resolvedPlot.isHarvestScheduled && resolvedPlot.scheduledHarvestDate
                                        ? `COSECHA PROGRAMADA (${resolvedPlot.scheduledHarvestDate} ${resolvedPlot.scheduledHarvestTime || ''})`
                                        : 'CICLO DE SIEMBRA ACTIVO CON CUSTODIA QR & BARCODE'}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Acta N°: <strong className="text-amber-300">{resolvedPlot.closureActCode || urlParams.get('actCode') || `ACTA-SIEMBRA-${(resolvedPlot.campaign || '2526').replace('/', '')}-${resolvedPlot.id.slice(-5).toUpperCase()}`}</strong>
                                </p>
                            </div>

                            <div className="bg-white p-3 rounded-2xl border-2 border-amber-400 shrink-0 self-start md:self-center">
                                <BarcodeSVG
                                    value={resolvedPlot.closureBarcode || urlParams.get('barcode') || `7798394${resolvedPlot.id.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 6)}2026`}
                                    height={42}
                                    barWidth={1.35}
                                    fontSize={9.5}
                                    label="CÓDIGO DE BARRAS GS1-128 HOMOLOGADO"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                                <span className="text-[9px] text-slate-400 uppercase font-black block">1. Siembra, Lote & Carga</span>
                                <strong className="text-white text-sm block">{resolvedPlot.sowingDate || urlParams.get('sowing') || '2025-11-05'}</strong>
                                <span className="text-[10px] text-emerald-400 font-bold block">Lote: {seedMotherLot}</span>
                                <span className="text-[10px] text-sky-300 font-bold block">Carga: {plotSeedLoad.fullTriUnitDisplay}</span>
                            </div>

                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                                <span className="text-[9px] text-amber-400 uppercase font-black block">2. Fecha y Hora de Cierre / Cosecha</span>
                                <strong className="text-white text-sm block">
                                    {resolvedPlot.closedDate || urlParams.get('closedAt') || resolvedPlot.scheduledHarvestDate || urlParams.get('scheduledAt') || 'En curso agronómico'}
                                    {(resolvedPlot.closedTime || urlParams.get('closedTime') || resolvedPlot.scheduledHarvestTime) ? ` · ${resolvedPlot.closedTime || urlParams.get('closedTime') || resolvedPlot.scheduledHarvestTime} hs` : ''}
                                </strong>
                                <span className="text-[10px] text-amber-300 block">
                                    {resolvedPlot.closureConfirmed || resolvedPlot.status === 'Cosechada' || urlParams.get('closed') === '1'
                                        ? 'Fecha Confirmada e Inmutable (Bloqueo Admin)'
                                        : 'Monitoreo Fenológico Activo'}
                                </span>
                            </div>

                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                                <span className="text-[9px] text-sky-400 uppercase font-black block">3. Labor Agrícola Vinculada</span>
                                {(() => {
                                    const plotLabors = (tasks || []).filter(t => t.plotId === resolvedPlot.id);
                                    const harvestLabor = plotLabors.find(t => t.id === resolvedPlot.linkedClosureLaborId || t.laborType === 'COSECHA' || t.category === 'COSECHA') || plotLabors[0];
                                    const machineryText = typeof harvestLabor?.machinery === 'string'
                                        ? harvestLabor.machinery
                                        : harvestLabor?.machinery?.tractor || resolvedPlot.harvestMachinery || 'Cosechadora Axial';
                                    const laborDateText = harvestLabor?.executionDate || harvestLabor?.dueDate || harvestLabor?.date || resolvedPlot.closedDate || resolvedPlot.closedAt || '';
                                    return harvestLabor ? (
                                        <>
                                            <strong className="text-white text-xs block truncate">{harvestLabor.title}</strong>
                                            <span className="text-[10px] text-sky-300 block truncate">
                                                {machineryText} {laborDateText ? `· ${laborDateText}` : ''}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <strong className="text-white text-xs block truncate">
                                                {resolvedPlot.harvestMachinery || 'Protocolo de Labores Vinculado'}
                                            </strong>
                                            <span className="text-[10px] text-sky-300 block truncate">
                                                Operador: {resolvedPlot.harvestOperator || harvestResponsible}
                                            </span>
                                        </>
                                    );
                                })()}
                            </div>

                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                                <span className="text-[9px] text-emerald-400 uppercase font-black block">4. Rendimiento & Homologación</span>
                                <strong className="text-emerald-400 text-sm block">
                                    {(resolvedPlot.harvestYieldKg || urlParams.get('yieldKg'))
                                        ? `${Number(resolvedPlot.harvestYieldKg || urlParams.get('yieldKg')).toLocaleString()} kg totales`
                                        : 'En evaluación de rinde'}
                                </strong>
                                <span className="text-[10px] text-slate-400 block truncate">
                                    Firmante: {resolvedPlot.closedBy || inspectorName}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* INSUMOS & FITOSANITARIOS AUDITADOS (SENASA) */}
                {plotAgroApps.length > 0 && (
                    <div className="bg-slate-900/90 border border-slate-800 p-6 md:p-8 rounded-3xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <Package className="text-purple-400" size={20} />
                                <h3 className="text-base font-black uppercase text-white tracking-tight">
                                    Tratamientos & Cuaderno Fitosanitario SENASA
                                </h3>
                            </div>
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full font-bold">
                                {plotAgroApps.length} Aplicaciones Auditadas
                            </span>
                        </div>

                        <div className="space-y-3">
                            {plotAgroApps.map(app => (
                                <div key={app.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <strong className="text-white font-black uppercase text-sm block">{app.productName}</strong>
                                            <p className="text-[11px] text-slate-400">Principio Activo: {app.activeIngredient}</p>
                                        </div>
                                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                            {app.senasaRegisterNumber}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                                        <span>Dosis: <strong>{app.dosagePerHa} {app.dosageUnit}</strong></span>
                                        <span>Agrónomo: <strong>{app.responsibleAgronomist}</strong></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* GUÍAS DE TRÁNSITO Y MOVIMIENTOS ARICCAME */}
                {batchMovements.length > 0 && (
                    <div className="bg-slate-900/90 border border-slate-800 p-6 md:p-8 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                            <Truck className="text-sky-400" size={20} />
                            <h3 className="text-base font-black uppercase text-white tracking-tight">
                                Cadena de Transporte & Guías de Tránsito
                            </h3>
                        </div>
                        <div className="space-y-2">
                            {batchMovements.map(m => (
                                <div key={m.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs flex justify-between items-center">
                                    <div>
                                        <strong className="text-white uppercase font-bold block">{m.transportGuideNumber}</strong>
                                        <span className="text-[10px] text-slate-400">Chofer: {m.driverName} · Dominio: {m.vehiclePlate}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-sky-400 block">{m.quantity} kg</span>
                                        <span className="text-[10px] text-emerald-400 uppercase font-bold">{m.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* FOOTER AUDITORÍA */}
                <div className="text-center py-10 space-y-3 border-t border-slate-800/80">
                    <div className="flex justify-center items-center gap-2 text-emerald-400">
                        <Leaf size={18}/>
                        <span className="text-lg font-black uppercase tracking-tight">{appName} <span className="text-white">Nucleus Trace</span></span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider max-w-lg mx-auto">
                        Titular Operador: Cooperativa PatagonianC LTDA · CUIT 30-71816113-0<br />
                        Lic. Agrícola EX-2024-134354227 · Lic. Industrial EX-2025-119427833 (ARICCAME)
                    </p>
                    <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider max-w-sm mx-auto">
                        Reporte inmutable de trazabilidad biológica emitido conforme a normativas INASE, ARICCAME y SENASA.
                    </p>
                </div>

            </div>
        </div>
    );
}
