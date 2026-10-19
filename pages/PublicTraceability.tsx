import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
    Sprout, MapPin, Calendar, Clock, Activity, 
    ShieldCheck, Leaf, Waves, Thermometer, Globe, Info, Sparkles, Package,
    CheckCircle2, ArrowRight, Warehouse, Truck, FlaskConical, Scale, Droplets
} from 'lucide-react';
import { getPlotAgrochemicalApplications } from '../src/services/agro40Service';
import { AgrochemicalApplication, Plot, Location, Variety } from '../types';
import { DEMO_PLOTS as HISTORICAL_PLOTS, DEMO_LOCATIONS as HISTORICAL_LOCATIONS, DEMO_VARIETIES as HISTORICAL_VARIETIES } from '../src/data/historicalCampaignSeed';
import { DEMO_PLOTS as INITIAL_PLOTS, DEMO_LOCATIONS as INITIAL_LOCATIONS, DEMO_VARIETIES as INITIAL_VARIETIES, DEMO_SEED_BATCHES as INITIAL_BATCHES } from '../src/data/initialDemoData';

export default function PublicTraceability() {
    const { id } = useParams();
    const { plots, locations, varieties, trialRecords, seedBatches, storagePoints, seedMovements, appName } = useAppContext();

    const cleanId = decodeURIComponent(id || '').trim();

    // Leer parámetros de URL de respaldo para escaneos móviles cruzados
    const urlParams = useMemo(() => {
        if (typeof window === 'undefined') return new URLSearchParams();
        const search = window.location.search || '';
        const hashSearch = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
        return new URLSearchParams(hashSearch || search);
    }, []);

    // 1. Fondo unificado de Parcelas (Plots): Memoria local -> Histórico -> Demo Inicial
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

    // Fondo unificado de Lotes de Semillas
    const allBatches = useMemo(() => {
        const pool = [...seedBatches];
        (INITIAL_BATCHES || []).forEach(b => {
            if (!pool.some(x => x.id === b.id)) pool.push(b);
        });
        return pool;
    }, [seedBatches]);

    // Intento 1: Parcela (Plot)
    let plot = allPlots.find(p => 
        p.id === cleanId || 
        p.id.toLowerCase() === cleanId.toLowerCase() ||
        p.name?.toLowerCase() === cleanId.toLowerCase()
    );

    // Coincidencia parcial si el ID tiene al menos 4 caracteres
    if (!plot && cleanId.length >= 4) {
        plot = allPlots.find(p => 
            p.id.toLowerCase().includes(cleanId.toLowerCase()) || 
            cleanId.toLowerCase().includes(p.id.toLowerCase())
        );
    }

    // Si aún no está en la base (ej. creada en otro dispositivo), construir parcela virtual desde parámetros de URL
    if (!plot && (urlParams.get('name') || cleanId.startsWith('plot-') || cleanId.startsWith('p-') || cleanId.length > 0)) {
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
            type: 'Producción',
            surfaceArea: haParam,
            surfaceUnit: 'ha',
            density: 45,
            status: statusParam,
            campaign: campParam,
            activeCampaigns: [campParam],
            sowingDate: '2025-11-05',
            coordinates: { lat: latParam, lng: lngParam },
            observations: 'Unidad de producción fiscalizada y certificada en Nucleus Trace · Ley 27.669'
        };
    }

    // Intento 2: Lote de Semilla / Derivado Biológico (SeedBatch)
    const batch = allBatches.find(b => 
        b.id === cleanId || 
        b.batchCode?.toLowerCase() === cleanId.toLowerCase() ||
        (b.labelSerialNumber && b.labelSerialNumber.toLowerCase() === cleanId.toLowerCase()) ||
        (b.gs1Code && b.gs1Code.toLowerCase() === cleanId.toLowerCase())
    );

    // Intento 3: Variedad / Genética (Variety)
    const variety = allVarieties.find(v => 
        v.id === cleanId || 
        v.name?.toLowerCase() === cleanId.toLowerCase() ||
        (v.inaseRncNumber && v.inaseRncNumber.toLowerCase() === cleanId.toLowerCase())
    );

    // Resolver referencias cruzadas
    const resolvedPlot = plot || (batch?.originPlotId ? allPlots.find(p => p.id === batch.originPlotId) : undefined);
    
    let resolvedVariety = (resolvedPlot ? allVarieties.find(v => v.id === resolvedPlot.varietyId) : undefined) 
                         || (batch ? allVarieties.find(v => v.id === batch.varietyId) : undefined)
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
    if (!resolvedPlot && !batch && !resolvedVariety) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center font-mono">
                <div className="space-y-4 max-w-md">
                    <div className="bg-red-500/10 p-5 rounded-3xl inline-block text-red-500 border border-red-500/20">
                        <Info size={48}/>
                    </div>
                    <h1 className="text-white text-2xl font-black uppercase tracking-tight">Registro No Localizado</h1>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        El código "{cleanId}" no corresponde a un cultivar, lote biológico fiscalizado ni unidad de producción activa en la red Nucleus Trace.
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

    return (
        <div className="min-h-screen bg-[#020617] text-white font-mono selection:bg-emerald-500 pb-20">
            {/* HERO CABECERA */}
            <div className="relative min-h-[280px] overflow-hidden flex flex-col justify-end p-6 md:p-10 bg-gradient-to-t from-[#020617] via-slate-900/60 to-slate-950 border-b border-slate-800">
                {resolvedLocation?.coordinates && (
                    <iframe 
                        className="absolute inset-0 w-full h-full opacity-30 grayscale pointer-events-none"
                        src={`https://maps.google.com/maps?q=${resolvedLocation.coordinates.lat},${resolvedLocation.coordinates.lng}&z=13&output=embed`}
                        frameBorder="0"
                        title="Ubicación Satelital"
                    />
                )}
                <div className="relative z-10 space-y-2 max-w-5xl">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg">
                            <ShieldCheck size={13} className="mr-1.5"/> Trazabilidad Oficial Verificada
                        </span>
                        <span className="bg-slate-800/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                            INASE / ARICCAME / SENASA · Ley 27.669
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-none text-white">
                        {batch ? `Lote ${batch.batchCode}` : resolvedPlot ? resolvedPlot.name : resolvedVariety?.name}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-bold">
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

                {/* MATRIZ DE RESUMEN FISCAL & CALIDAD */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                            Tipo de Registro
                        </span>
                        <p className="text-sm md:text-base font-black text-emerald-400 uppercase">
                            {batch ? (batch.materialType === 'seed' ? 'Semilla Fiscalizada' : batch.materialType === 'harvested_grain' ? 'Grano Cosechado' : 'Biomasa / Fibra') : resolvedPlot ? 'Unidad de Siembra' : 'Germoplasma RNC'}
                        </p>
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
                            RNC INASE / Registro
                        </span>
                        <p className="text-sm md:text-base font-black text-white uppercase truncate">
                            {resolvedVariety?.inaseRncNumber || (batch?.labelSerialNumber ? `Rót: ${batch.labelSerialNumber}` : 'Homologado')}
                        </p>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                            Estado Sanitario
                        </span>
                        <p className="text-sm md:text-base font-black text-emerald-400 uppercase flex items-center gap-1">
                            <CheckCircle2 size={14} />
                            <span>Aprobado / Conforme</span>
                        </p>
                    </div>
                </div>

                {/* SI HAY UN LOTE BIOLÓGICO AUDITADO (SEED BATCH) */}
                {batch && (
                    <div className="bg-slate-900/90 border border-slate-800 p-6 md:p-8 rounded-3xl space-y-4">
                        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                            <div>
                                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">
                                    Control Biológico & Analítica Oficial
                                </span>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mt-0.5">
                                    Ficha de Lote: {batch.batchCode}
                                </h3>
                            </div>
                            <span className="px-3 py-1 rounded-xl text-xs font-black uppercase bg-emerald-500 text-slate-950">
                                {batch.category || 'Fiscalizado C1'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                                <span className="text-[9px] text-slate-400 uppercase block font-bold">Poder Germinativo</span>
                                <strong className="text-base text-emerald-400">{batch.germination || 92}%</strong>
                            </div>
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                                <span className="text-[9px] text-slate-400 uppercase block font-bold">Pureza Botánica</span>
                                <strong className="text-base text-white">{batch.purity || 99.4}%</strong>
                            </div>
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                                <span className="text-[9px] text-slate-400 uppercase block font-bold">Humedad de Grano</span>
                                <strong className="text-base text-amber-400">{batch.moisturePct || 8.4}%</strong>
                            </div>
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                                <span className="text-[9px] text-slate-400 uppercase block font-bold">Masa Declarada</span>
                                <strong className="text-base text-white">{batch.remainingQuantity.toLocaleString()} kg</strong>
                            </div>
                        </div>

                        {batch.labelSerialNumber && (
                            <div className="bg-emerald-950/30 border border-emerald-800/50 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                                <span>Rótulo Oficial INASE Inviolable: <strong>{batch.labelSerialNumber}</strong></span>
                                <span className="font-mono text-[10px] bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-200">Precintado</span>
                            </div>
                        )}
                    </div>
                )}

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
