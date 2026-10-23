import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, checkConnection, getStoredCredentials } from '../supabaseClient';
import { 
  User, Location, Plot, TrialRecord, Task, Project, Variety, 
  Client, Supplier, SeedBatch, SeedMovement, Resource, 
  StoragePoint, HydricRecord, FieldLog, OperationalExpense, ExpenseAuditStatus,
  HempStageId
} from '../types';
import { 
  ADMIN_USER, DEMO_USER, DEMO_USERS_LIST, DEMO_CLIENTS, DEMO_VARIETIES, DEMO_LOCATIONS, DEMO_PLOTS, 
  DEMO_PROJECTS, DEMO_TRIALS, DEMO_HYDRIC, DEMO_TASKS,
  DEMO_STORAGE_POINTS, DEMO_SUPPLIERS, DEMO_SEED_BATCHES, DEMO_SEED_MOVEMENTS, DEMO_RESOURCES,
  DEMO_OPERATIONAL_EXPENSES
} from '../src/data/initialDemoData';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  usersList: User[];
  switchUserRole: (userId: string) => void;
  isDbConnected: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginDemo: () => Promise<boolean>;
  logout: () => void;
  addUser: (user: User) => Promise<boolean>;
  updateUser: (user: User) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  appName: string;
  appLogo: string;
  updateBranding: (name: string, logo: string) => Promise<void>;
  varieties: Variety[];
  addVariety: (v: Variety) => Promise<boolean>;
  updateVariety: (v: Variety) => Promise<boolean>;
  deleteVariety: (id: string) => Promise<boolean>;
  locations: Location[];
  addLocation: (l: Location) => Promise<boolean>;
  updateLocation: (l: Location) => Promise<boolean>;
  deleteLocation: (id: string) => Promise<boolean>;
  plots: Plot[];
  addPlot: (p: Plot) => Promise<boolean>;
  updatePlot: (p: Plot) => Promise<boolean>;
  deletePlot: (id: string) => Promise<boolean>;
  updatePlotPhenology: (plotId: string, stageId: HempStageId, date?: string, notes?: string, certifiedBy?: string) => Promise<boolean>;
  trialRecords: TrialRecord[];
  getPlotHistory: (plotId: string) => TrialRecord[];
  getLatestRecord: (plotId: string) => TrialRecord | undefined;
  addTrialRecord: (r: TrialRecord) => Promise<boolean>;
  updateTrialRecord: (r: TrialRecord) => Promise<boolean>;
  deleteTrialRecord: (id: string) => Promise<boolean>;
  tasks: Task[];
  addTask: (t: Task) => Promise<boolean>;
  updateTask: (t: Task) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  homologateLabor: (laborId: string, notes?: string, certifiedBy?: string) => Promise<boolean>;
  projects: Project[];
  addProject: (p: Project) => Promise<boolean>;
  updateProject: (p: Project) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  clients: Client[];
  addClient: (c: Client, teamIds?: string[]) => Promise<boolean>;
  updateClient: (c: Client, teamIds?: string[]) => Promise<boolean>;
  deleteClient: (id: string) => Promise<boolean>;
  suppliers: Supplier[];
  addSupplier: (s: Supplier) => Promise<string | null>;
  updateSupplier: (s: Supplier) => Promise<boolean>;
  deleteSupplier: (id: string) => Promise<boolean>;
  seedBatches: SeedBatch[];
  addSeedBatch: (b: SeedBatch) => Promise<boolean>;
  updateSeedBatch: (b: SeedBatch) => Promise<boolean>;
  deleteSeedBatch: (id: string) => Promise<boolean>;
  seedMovements: SeedMovement[];
  addSeedMovement: (m: SeedMovement) => Promise<boolean>;
  updateSeedMovement: (m: SeedMovement) => Promise<boolean>;
  deleteSeedMovement: (id: string) => Promise<boolean>;
  resources: Resource[];
  addResource: (r: Resource) => Promise<boolean>;
  updateResource: (r: Resource) => Promise<boolean>;
  deleteResource: (id: string) => Promise<boolean>;
  operationalExpenses: OperationalExpense[];
  addOperationalExpense: (exp: OperationalExpense) => Promise<boolean>;
  updateOperationalExpense: (exp: OperationalExpense) => Promise<boolean>;
  deleteOperationalExpense: (id: string) => Promise<boolean>;
  auditOperationalExpense: (id: string, status: ExpenseAuditStatus, auditorName: string, notes?: string) => Promise<boolean>;
  storagePoints: StoragePoint[];
  addStoragePoint: (s: StoragePoint) => Promise<boolean>;
  updateStoragePoint: (s: StoragePoint) => Promise<boolean>;
  deleteStoragePoint: (id: string) => Promise<boolean>;
  hydricRecords: HydricRecord[];
  addHydricRecord: (r: HydricRecord) => Promise<boolean>;
  updateHydricRecord: (r: HydricRecord) => Promise<boolean>;
  deleteHydricRecord: (id: string) => Promise<boolean>;
  logs: FieldLog[];
  addLog: (l: FieldLog) => Promise<boolean>;
  updateLog: (l: FieldLog) => Promise<boolean>;
  deleteLog: (id: string) => Promise<boolean>;
  isRefreshing: boolean;
  refreshData: () => Promise<void>;
  activeCampaign: string;
  setActiveCampaign: (camp: string) => void;
  closePlotCycle: (plotId: string, options?: { harvestYieldKg?: number; notes?: string; closedDate?: string }) => Promise<boolean>;
  reopenPlotCycle: (plotId: string, campaign?: string) => Promise<boolean>;
  syncAllPlotsContinuousRainfall: (forcePersist?: boolean) => Promise<number>;
  isSyncingGlobalRainfall: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};

const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(v => toCamelCase(v));
  if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

const toSnakeCase = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(v => toSnakeCase(v));
    if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            if (obj[key] === undefined) return result;
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            result[snakeKey] = toSnakeCase(obj[key]);
            return result;
        }, {} as any);
    }
    return obj;
};

const DELETED_IDS_STORAGE_KEY = 'ht_deleted_ids_v1';

// Registros demostrativos o huérfanos depurados definitivamente para producción
const PURGED_DEMO_IDS = new Set([
    'trial-1',
    'trial-2',
    '0177e162-8536-4463-aed6-6b40e40428dd',
    '3e633379-49c3-4717-a5ae-56af256675c3',
    'hydric-1',
    'hydric-2',
    'hydric-3',
    '1768260282197',
    '1768260337822',
    'mov-1',
    'mov-2',
    'default-storage',
    'mat-obt-tw-par-a2-103-grano',
    'var-multiproposito-biomasa',
    'var-grano-alimento',
    'user-admin-xpatagonia',
    '91ce0dcf-a760-41fe-82d5-52c438685944',
    'res-1', 'res-2', 'res-3', 'res-4', 'res-5', 'res-6', 'res-7', 'res-8',
    'insp-1', 'insp-2', 'insp-3', 'insp-4'
]);

const isPurgedDemoItem = (item: any): boolean => {
    if (!item || typeof item !== 'object') return false;
    const id = String(item.id || '');
    if (PURGED_DEMO_IDS.has(id)) return true;
    if (id.startsWith('exp-demo-') || id.startsWith('demo-alert-')) return true;
    if (item.plotId && String(item.plotId) === '91ce0dcf-a760-41fe-82d5-52c438685944') return true;
    return false;
};

const getDeletedIdsMap = (): Record<string, string[]> => {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(DELETED_IDS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const markIdDeleted = (table: string, id: string) => {
    if (typeof window === 'undefined' || !id) return;
    try {
        const map = getDeletedIdsMap();
        const list = new Set(map[table] || []);
        list.add(String(id));
        map[table] = Array.from(list);
        localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(map));
    } catch {}
};

const unmarkIdDeleted = (table: string, id: string) => {
    if (typeof window === 'undefined' || !id) return;
    try {
        const map = getDeletedIdsMap();
        if (!map[table]) return;
        map[table] = map[table].filter(x => x !== String(id));
        localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(map));
    } catch {}
};



export const AppProvider = ({ children }: { children?: ReactNode }) => {
    // Sesión persistente: solo restaura si el usuario inició sesión previamente y no cerró sesión.
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        if (typeof window !== 'undefined') {
            const isLoggedOut = localStorage.getItem('ht_logged_out') === 'true';
            if (isLoggedOut) return null;

            const storedUser = localStorage.getItem('ht_session_user');
            if (storedUser) {
                try {
                    const parsed = JSON.parse(storedUser);
                    if (parsed && parsed.email) {
                        return parsed;
                    }
                } catch(e) {
                    localStorage.removeItem('ht_session_user');
                }
            }
            return null;
        }
        return null;
    });

    const [theme, setTheme] = useState<'light'|'dark'>('light');
    const [appName, setAppName] = useState(localStorage.getItem('ht_app_name') || 'HempC');
    const [appLogo, setAppLogo] = useState(localStorage.getItem('ht_app_logo') || '');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDbConnected, setIsDbConnected] = useState(false);
    const [isSyncingGlobalRainfall, setIsSyncingGlobalRainfall] = useState(false);
    const [activeCampaign, setActiveCampaignState] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('ht_active_campaign') || '2025/2026';
        }
        return '2025/2026';
    });

    const setActiveCampaign = (camp: string) => {
        setActiveCampaignState(camp);
        if (typeof window !== 'undefined') {
            try { localStorage.setItem('ht_active_campaign', camp); } catch {}
        }
    };

    const [usersList, setUsersList] = useState<User[]>(() => {
        let initialList = DEMO_USERS_LIST;
        if (typeof window !== "undefined") {
            try {
                const stored = localStorage.getItem("ht_users");
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const cleaned = parsed.filter((u: any) => !isPurgedDemoItem(u));
                        const hasAdmin = cleaned.some((u: any) => u.email?.toLowerCase() === "admin@hempc.com.ar");
                        if (!hasAdmin) {
                            cleaned.unshift(ADMIN_USER);
                        }
                        try { localStorage.setItem("ht_users", JSON.stringify(cleaned)); } catch (e) {}
                        return cleaned;
                    }
                }
            } catch (e) {}
        }
        return initialList;
    });
    // Función auxiliar para leer colecciones persistentes respetando borrados y depurando demos obsoletos
    const getStoredCollection = <T,>(key: string, fallback: T[]): T[] => {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(key);
                if (stored !== null) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        const cleaned = parsed.filter(item => !isPurgedDemoItem(item));
                        if (cleaned.length !== parsed.length) {
                            try { localStorage.setItem(key, JSON.stringify(cleaned)); } catch (e) {}
                        }
                        return cleaned;
                    }
                }
            } catch (e) {}
        }
        return fallback;
    };

    const [operationalExpenses, setOperationalExpenses] = useState<OperationalExpense[]>(() => 
        getStoredCollection('ht_operational_expenses', DEMO_OPERATIONAL_EXPENSES)
    );
    const [varieties, setVarieties] = useState<Variety[]>(() => {
        const deletedMap = getDeletedIdsMap();
        const deletedSet = new Set(deletedMap['varieties'] || []);
        const stored = getStoredCollection('ht_varieties', DEMO_VARIETIES);
        let updated = stored.filter(v => !deletedSet.has(String(v.id)) && !isPurgedDemoItem(v));
        DEMO_VARIETIES.forEach(dv => {
            if (!deletedSet.has(String(dv.id)) && !updated.some(v => v.id === dv.id || v.name.toLowerCase() === dv.name.toLowerCase())) {
                updated.unshift(dv);
            }
        });
        return updated;
    });
    const healSeedBatches = (list: SeedBatch[]): SeedBatch[] => {
        const deletedMap = getDeletedIdsMap();
        const deletedSet = new Set(deletedMap['seed_batches'] || []);
        const demoMapById = new Map(DEMO_SEED_BATCHES.map(b => [String(b.id), b]));
        const demoMapByCode = new Map(DEMO_SEED_BATCHES.map(b => [String(b.batchCode), b]));

        const enriched: SeedBatch[] = (list || [])
            .filter(b => !deletedSet.has(String(b.id)) && !isPurgedDemoItem(b))
            .map((b: SeedBatch): SeedBatch => {
                const demoMatch = demoMapById.get(String(b.id)) || demoMapByCode.get(String(b.batchCode));
                return {
                    ...(demoMatch || {}),
                    ...b,
                    labelSerialNumber: b.labelSerialNumber || demoMatch?.labelSerialNumber || '00000012',
                    certificationNumber: b.certificationNumber || demoMatch?.certificationNumber || 'S/N',
                    originInspectionId: b.originInspectionId || demoMatch?.originInspectionId,
                    qualityGrade: b.qualityGrade || demoMatch?.qualityGrade,
                    qualityScore: b.qualityScore ?? demoMatch?.qualityScore,
                    samplerName: b.samplerName || demoMatch?.samplerName,
                    samplerMatricula: b.samplerMatricula || demoMatch?.samplerMatricula,
                    sampleCode: b.sampleCode || demoMatch?.sampleCode,
                    inspectorName: b.inspectorName || demoMatch?.inspectorName,
                    inspectorMatricula: b.inspectorMatricula || demoMatch?.inspectorMatricula,
                    parentSeedBatchId: b.parentSeedBatchId || demoMatch?.parentSeedBatchId,
                    originPlotId: b.originPlotId || demoMatch?.originPlotId,
                    materialType: b.materialType || demoMatch?.materialType,
                };
            });

        DEMO_SEED_BATCHES.forEach(db => {
            if (!deletedSet.has(String(db.id)) && !enriched.some(b => String(b.id) === String(db.id) || String(b.batchCode) === String(db.batchCode))) {
                enriched.push(db);
            }
        });

        return enriched;
    };

    const normalizePolygonPoints = (rawPoly: any): { lat: number; lng: number }[] => {
        if (!rawPoly) return [];
        let parsed = rawPoly;
        if (typeof rawPoly === 'string') {
            try { parsed = JSON.parse(rawPoly); } catch { return []; }
        }
        if (!Array.isArray(parsed)) return [];
        return parsed
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

    const healLocationsWithPolygons = (locList: Location[]): Location[] => {
        const deletedMap = getDeletedIdsMap();
        const deletedSet = new Set(deletedMap['locations'] || []);
        const demoById = new Map(DEMO_LOCATIONS.map(l => [String(l.id), l]));
        const demoByName = new Map(DEMO_LOCATIONS.map(l => [l.name.trim().toLowerCase(), l]));
        return (locList || [])
            .filter(loc => !deletedSet.has(String(loc.id)) && !isPurgedDemoItem(loc))
            .map((loc: Location) => {
                const demoMatch = demoById.get(String(loc.id)) || (loc.name ? demoByName.get(loc.name.trim().toLowerCase()) : undefined);
                const normPoly = normalizePolygonPoints((loc as any).polygon);
                const finalPoly = normPoly.length >= 3 ? normPoly : (demoMatch?.polygon || []);
                const rawCoords = (loc as any).coordinates;
                const validCoords = rawCoords && !isNaN(Number(rawCoords.lat)) && !isNaN(Number(rawCoords.lng)) && Number(rawCoords.lat) !== 0
                    ? { lat: Number(rawCoords.lat), lng: Number(rawCoords.lng) }
                    : (demoMatch?.coordinates || (finalPoly.length > 0 ? finalPoly[0] : { lat: -43.308362, lng: -65.289033 }));
                return {
                    ...loc,
                    coordinates: validCoords,
                    polygon: finalPoly
                };
            });
    };

    const healPlotsWithSeedBatches = (plotsList: Plot[], batchesList: SeedBatch[] = DEMO_SEED_BATCHES): Plot[] => {
        const deletedMap = getDeletedIdsMap();
        const deletedSet = new Set(deletedMap['plots'] || []);
        const demoPlotById = new Map(DEMO_PLOTS.map(dp => [String(dp.id), dp]));
        const demoPlotByName = new Map(DEMO_PLOTS.map(dp => [dp.name.trim().toLowerCase(), dp]));

        return (plotsList || [])
            .filter(p => !deletedSet.has(String(p.id)) && !isPurgedDemoItem(p))
            .map((p: Plot) => {
                const demoMatch = demoPlotById.get(String(p.id)) || (p.name ? demoPlotByName.get(p.name.trim().toLowerCase()) : undefined);
                let resolvedBatchId = p.seedBatchId || demoMatch?.seedBatchId;
                if (!resolvedBatchId && p.varietyId) {
                    const match = batchesList.find(b => b.varietyId === p.varietyId && b.isActive && (!b.materialType || b.materialType === 'seed'))
                        || DEMO_SEED_BATCHES.find(b => b.varietyId === p.varietyId && b.isActive);
                    if (match) {
                        resolvedBatchId = match.id;
                    }
                }

                const normPoly = normalizePolygonPoints((p as any).polygon);
                const finalPoly = normPoly.length >= 3 ? normPoly : (demoMatch?.polygon || []);

                const rawCoords = (p as any).coordinates;
                const validCoords = rawCoords && !isNaN(Number(rawCoords.lat)) && !isNaN(Number(rawCoords.lng)) && Number(rawCoords.lat) !== 0
                    ? { lat: Number(rawCoords.lat), lng: Number(rawCoords.lng) }
                    : (demoMatch?.coordinates || (finalPoly.length > 0 ? {
                        lat: Number((finalPoly.reduce((s, pt) => s + pt.lat, 0) / finalPoly.length).toFixed(6)),
                        lng: Number((finalPoly.reduce((s, pt) => s + pt.lng, 0) / finalPoly.length).toFixed(6))
                    } : null));

                return {
                    ...(demoMatch || {}),
                    ...p,
                    seedBatchId: resolvedBatchId || p.seedBatchId,
                    coordinates: validCoords,
                    polygon: finalPoly
                };
            });
    };

    const healTrialRecords = (recordsList: TrialRecord[]): TrialRecord[] => {
        const deletedMap = getDeletedIdsMap();
        const deletedSet = new Set(deletedMap['trial_records'] || []);
        const demoById = new Map(DEMO_TRIALS.map(t => [String(t.id), t]));
        const plotMap = new Map(DEMO_PLOTS.map(p => [String(p.id), p]));

        const healed: TrialRecord[] = (recordsList || [])
            .filter(r => !deletedSet.has(String(r.id)) && !isPurgedDemoItem(r))
            .map((r: TrialRecord) => {
                const demoMatch = demoById.get(String(r.id));
                const plot = plotMap.get(String(r.plotId));
                const lat = plot?.coordinates?.lat ?? -43.308576;
                const dateStr = r.date || demoMatch?.date || plot?.sowingDate || '2026-01-15';
                const doy = Math.max(1, Math.min(365, Math.floor((new Date(dateStr).getTime() - new Date(new Date(dateStr).getFullYear(), 0, 0).getTime()) / 86400000)));
                const decl = 23.45 * Math.sin((2 * Math.PI / 365) * (284 + doy)) * (Math.PI / 180);
                const latRad = lat * (Math.PI / 180);
                const cosOmega = Math.max(-0.99, Math.min(0.99, -Math.tan(latRad) * Math.tan(decl)));
                const computedLight = Number(((2 * Math.acos(cosOmega) * 180 / Math.PI) / 15).toFixed(2));

                return {
                    ...(demoMatch || {}),
                    ...r,
                    time: r.time || demoMatch?.time || '10:00',
                    temperature: r.temperature != null ? Number(r.temperature) : (demoMatch?.temperature ?? 21.5),
                    humidity: r.humidity != null ? Number(r.humidity) : (demoMatch?.humidity ?? 46),
                    lightHours: (r.lightHours == null || r.lightHours === 18) ? (demoMatch?.lightHours || computedLight) : Number(r.lightHours),
                    lunarPhase: r.lunarPhase || demoMatch?.lunarPhase || 'Creciente',
                };
            });

        return healed;
    };

    const healHydricRecords = (recordsList: HydricRecord[]): HydricRecord[] => {
        const deletedMap = getDeletedIdsMap();
        const deletedSet = new Set(deletedMap['hydric_records'] || []);
        const demoById = new Map(DEMO_HYDRIC.map(h => [String(h.id), h]));
        const plotMap = new Map(DEMO_PLOTS.map(p => [String(p.id), p]));

        const healed: HydricRecord[] = (recordsList || [])
            .filter(h => !deletedSet.has(String(h.id)) && !isPurgedDemoItem(h))
            .map((h: HydricRecord) => {
                const demoMatch = demoById.get(String(h.id));
                const plot = h.plotId ? plotMap.get(String(h.plotId)) : undefined;
                return {
                    ...(demoMatch || {}),
                    ...h,
                    locationId: plot?.locationId || demoMatch?.locationId || h.locationId,
                    time: h.time || demoMatch?.time || '08:30',
                };
            });

        DEMO_HYDRIC.forEach(dh => {
            if (!deletedSet.has(String(dh.id)) && !healed.some(h => String(h.id) === String(dh.id))) {
                healed.push(dh);
            }
        });

        return healed;
    };

    const healStoragePoints = (spList: StoragePoint[]): StoragePoint[] => {
        const deletedMap = getDeletedIdsMap();
        const deletedSet = new Set(deletedMap['storage_points'] || []);
        const demoById = new Map(DEMO_STORAGE_POINTS.map(s => [String(s.id), s]));
        return (spList || [])
            .filter(s => !deletedSet.has(String(s.id)) && !isPurgedDemoItem(s))
            .map((s: StoragePoint) => {
                const demoMatch = demoById.get(String(s.id));
                let coords = s.coordinates || demoMatch?.coordinates;
                // Saneamiento de signo geodésico en hemisferio sur para CAP Centro Medioambiental (Puerto Madryn, Chubut)
                if (
                    coords &&
                    (String(s.id) === 'f9235100-cd67-4f65-9ba1-303e7cc5a063' || (s.city && s.city.toLowerCase().includes('madryn'))) &&
                    (coords.lat > 0 || coords.lng > 0)
                ) {
                    coords = {
                        lat: -Math.abs(Number(coords.lat)),
                        lng: -Math.abs(Number(coords.lng))
                    };
                }
                return {
                    ...(demoMatch || {}),
                    ...s,
                    coordinates: coords
                };
            });
    };

    const healSuppliers = (supList: Supplier[]): Supplier[] => {
        const deletedMap = getDeletedIdsMap();
        const deletedSet = new Set(deletedMap['suppliers'] || []);
        const demoById = new Map(DEMO_SUPPLIERS.map(s => [String(s.id), s]));
        return (supList || [])
            .filter(s => !deletedSet.has(String(s.id)) && !isPurgedDemoItem(s))
            .map((s: Supplier) => {
                const demoMatch = demoById.get(String(s.id));
                const isHempItFrance = String(s.id) === '3bfc9bcd-4ab1-4149-b46a-1a5d1e3392cd' || s.name?.toLowerCase().includes('hempit');
                return {
                    ...(demoMatch || {}),
                    ...s,
                    country: isHempItFrance ? 'Francia' : (s.country || demoMatch?.country || 'Argentina'),
                    province: s.province || demoMatch?.province || '',
                    city: s.city || demoMatch?.city || '',
                    address: s.address || demoMatch?.address || ''
                };
            });
    };

    const [locations, setLocations] = useState<Location[]>(() => 
        healLocationsWithPolygons(getStoredCollection('ht_locations', DEMO_LOCATIONS))
    );
    const [seedBatches, setSeedBatches] = useState<SeedBatch[]>(() => 
        healSeedBatches(getStoredCollection('ht_seed_batches', DEMO_SEED_BATCHES))
    );
    const [plots, setPlots] = useState<Plot[]>(() => 
        healPlotsWithSeedBatches(getStoredCollection('ht_plots', DEMO_PLOTS))
    );
    const [trialRecords, setTrialRecords] = useState<TrialRecord[]>(() => 
        healTrialRecords(getStoredCollection('ht_trial_records', DEMO_TRIALS))
    );
    const [tasks, setTasks] = useState<Task[]>(() => 
        getStoredCollection('ht_tasks', DEMO_TASKS)
    );
    const [projects, setProjects] = useState<Project[]>(() => 
        getStoredCollection('ht_projects', DEMO_PROJECTS)
    );
    const [clients, setClients] = useState<Client[]>(() => 
        getStoredCollection('ht_clients', DEMO_CLIENTS)
    );
    const [suppliers, setSuppliers] = useState<Supplier[]>(() => 
        healSuppliers(getStoredCollection('ht_suppliers', DEMO_SUPPLIERS))
    );
    const [seedMovements, setSeedMovements] = useState<SeedMovement[]>(() => 
        getStoredCollection('ht_seed_movements', DEMO_SEED_MOVEMENTS)
    );
    const [resources, setResources] = useState<Resource[]>(() => 
        getStoredCollection('ht_resources', DEMO_RESOURCES)
    );
    const [storagePoints, setStoragePoints] = useState<StoragePoint[]>(() => 
        healStoragePoints(getStoredCollection('ht_storage_points', DEMO_STORAGE_POINTS))
    );
    const [hydricRecords, setHydricRecords] = useState<HydricRecord[]>(() => 
        healHydricRecords(getStoredCollection('ht_hydric_records', DEMO_HYDRIC))
    );
    const [logs, setLogs] = useState<FieldLog[]>(() => 
        getStoredCollection('ht_field_logs', [])
    );

    useEffect(() => {
        refreshData();
        
        const savedTheme = localStorage.getItem('ht_theme') as 'light' | 'dark';
        if (savedTheme === 'dark') {
            setTheme('dark');
            document.documentElement.classList.add('dark');
        } else {
            setTheme('light');
            document.documentElement.classList.remove('dark');
        }
    }, []);

    useEffect(() => {
        document.title = `${appName} | Nucleus Trace`;
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute('content', '#DDDB00');
    }, [appName]);

    const refreshData = async () => {
        setIsRefreshing(true);
        try {
            const connected = await checkConnection();
            setIsDbConnected(connected);

            if (connected) {
                const fetchTable = async (table: string, setter: any, fallbackData?: any) => {
                    try {
                      const deletedMap = getDeletedIdsMap();
                      const deletedSet = new Set(deletedMap[table] || []);
                      let localCached: any[] = [];
                      try {
                        const rawLocal = localStorage.getItem(`ht_${table}`);
                        if (rawLocal) {
                          const parsed = JSON.parse(rawLocal);
                          if (Array.isArray(parsed)) localCached = parsed.filter((item: any) => !isPurgedDemoItem(item));
                        }
                      } catch {}

                      const { data, error } = await supabase.from(table).select('*');
                      if (!error && data !== null) {
                        const remoteItems: any[] = toCamelCase(data).filter((item: any) => !deletedSet.has(String(item.id)) && !isPurgedDemoItem(item));
                        const localMap = new Map(localCached.map((item: any) => [String(item.id), item]));
                        const remoteIds = new Set(remoteItems.map((item: any) => String(item.id)));

                        // Fusionar campos enriquecidos locales que no existan como columnas en Supabase
                        const mergedRemote = remoteItems.map((remoteItem: any) => {
                          const localItem = localMap.get(String(remoteItem.id));
                          if (!localItem) return remoteItem;
                          const merged: any = { ...localItem };
                          Object.keys(remoteItem).forEach(k => {
                            if (remoteItem[k] !== null && remoteItem[k] !== undefined) {
                              merged[k] = remoteItem[k];
                            }
                          });
                          // Si el registro fue editado localmente en esta sesión, preservar sus campos enriquecidos
                          if (localItem._localUpdatedAt) {
                            return { ...merged, ...localItem };
                          }
                          return merged;
                        });

                        // Conservar registros creados localmente en esta sesión que aún no estén en Supabase
                        const localOnly = localCached.filter((item: any) => item && item.id && item._localUpdatedAt && !remoteIds.has(String(item.id)) && !deletedSet.has(String(item.id)) && !isPurgedDemoItem(item));
                        const finalData = [...localOnly, ...mergedRemote];

                        const resolved = finalData.length > 0 ? finalData : (fallbackData ? fallbackData.filter((item: any) => !deletedSet.has(String(item.id)) && !isPurgedDemoItem(item)) : []);
                        setter(resolved);
                        try { localStorage.setItem(`ht_${table}`, JSON.stringify(resolved)); } catch (e) {}
                        return;
                      }
                      if (fallbackData) {
                        setter((prev: any[]) => (prev && prev.length > 0 ? prev : fallbackData).filter((item: any) => !deletedSet.has(String(item.id)) && !isPurgedDemoItem(item)));
                      }
                    } catch(e) {
                      if (fallbackData) setter((prev: any[]) => prev && prev.length > 0 ? prev : fallbackData);
                    }
                };
                
                const fetchSettings = async () => {
                    try {
                        const { data } = await supabase.from('platform_settings').select('*').maybeSingle();
                        if (data) {
                            if (data.app_name) {
                                setAppName(data.app_name);
                                localStorage.setItem('ht_app_name', data.app_name);
                            }
                            if (data.app_logo) {
                                setAppLogo(data.app_logo);
                                localStorage.setItem('ht_app_logo', data.app_logo);
                            }
                        }
                    } catch(err) { console.error('Error fetching settings', err); }
                };

                await Promise.all([
                    fetchSettings(),
                    fetchTable('users', setUsersList, DEMO_USERS_LIST),
                    fetchTable('varieties', setVarieties, DEMO_VARIETIES),
                    fetchTable('locations', (data: any[]) => {
                        const healed = healLocationsWithPolygons(data || []);
                        setLocations(healed);
                        try { localStorage.setItem('ht_locations', JSON.stringify(healed)); } catch (e) {}
                    }, DEMO_LOCATIONS),
                    fetchTable('plots', (data: any[]) => {
                        const healed = healPlotsWithSeedBatches(data || []);
                        setPlots(healed);
                        try { localStorage.setItem('ht_plots', JSON.stringify(healed)); } catch (e) {}
                    }, DEMO_PLOTS),
                    fetchTable('trial_records', (data: any[]) => {
                        const healed = healTrialRecords(data || []);
                        setTrialRecords(healed);
                        try { localStorage.setItem('ht_trial_records', JSON.stringify(healed)); } catch (e) {}
                    }, DEMO_TRIALS),
                    fetchTable('tasks', setTasks, DEMO_TASKS),
                    fetchTable('projects', setProjects, DEMO_PROJECTS),
                    fetchTable('clients', setClients, DEMO_CLIENTS),
                    fetchTable('suppliers', (data: any[]) => {
                        const healed = healSuppliers(data || []);
                        setSuppliers(healed);
                        try { localStorage.setItem('ht_suppliers', JSON.stringify(healed)); } catch (e) {}
                    }, DEMO_SUPPLIERS),
                    fetchTable('seed_batches', (data: any[]) => {
                        const healed = healSeedBatches(data || []);
                        setSeedBatches(healed);
                        try { localStorage.setItem('ht_seed_batches', JSON.stringify(healed)); } catch (e) {}
                    }, DEMO_SEED_BATCHES),
                    fetchTable('seed_movements', setSeedMovements, DEMO_SEED_MOVEMENTS),
                    fetchTable('resources', setResources, DEMO_RESOURCES),
                    fetchTable('storage_points', (data: any[]) => {
                        const healed = healStoragePoints(data || []);
                        setStoragePoints(healed);
                        try { localStorage.setItem('ht_storage_points', JSON.stringify(healed)); } catch (e) {}
                    }, DEMO_STORAGE_POINTS),
                    fetchTable('hydric_records', (data: any[]) => {
                        const healed = healHydricRecords(data || []);
                        setHydricRecords(healed);
                        try { localStorage.setItem('ht_hydric_records', JSON.stringify(healed)); } catch (e) {}
                    }, DEMO_HYDRIC),
                    fetchTable('operational_expenses', setOperationalExpenses, DEMO_OPERATIONAL_EXPENSES),
                    fetchTable('field_logs', setLogs),
                ]);
            } else {
                // Modo Autónomo / Local: respeta fielmente los datos del usuario en memoria/localStorage
                setUsersList(prev => prev.length > 0 ? prev : [DEMO_USER]);
                setLocations(prev => {
                    const healed = healLocationsWithPolygons(prev);
                    try { localStorage.setItem('ht_locations', JSON.stringify(healed)); } catch (e) {}
                    return healed;
                });
                setSeedBatches(prev => {
                    const healed = healSeedBatches(prev);
                    try { localStorage.setItem('ht_seed_batches', JSON.stringify(healed)); } catch (e) {}
                    return healed;
                });
                setPlots(prev => {
                    const healed = healPlotsWithSeedBatches(prev);
                    try { localStorage.setItem('ht_plots', JSON.stringify(healed)); } catch (e) {}
                    return healed;
                });
            }
        } catch(e) {
            console.error("Data refresh failed", e);
        } finally {
            setIsRefreshing(false);
        }
    };

    const login = async (email: string, password: string): Promise<boolean> => {
        let trimmedEmail = email.trim().toLowerCase();
        const trimmedPassword = password.trim();
        
        // Soporte para alias comunes de administrador (ej: "admin", "administrador", "superadmin", "xpatagonia")
        let targetEmails = [trimmedEmail];
        if (
            trimmedEmail === "admin" || 
            trimmedEmail === "administrador" || 
            trimmedEmail === "super_admin" || 
            trimmedEmail === "superadmin" || 
            trimmedEmail === "admin@admin.com" ||
            trimmedEmail === "hempc"
        ) {
            targetEmails = ["admin@hempc.com.ar"];
        } else if (trimmedEmail === "xpatagonia" || trimmedEmail === "xpatagonia@gmail.com") {
            targetEmails = ["xpatagonia.com@gmail.com", "admin@hempc.com.ar", "gaston@hempc.com.ar"];
        } else if (trimmedEmail === "gaston") {
            targetEmails = ["gaston@hempc.com.ar", "gaston.barea.moreno@gmail.com"];
        } else if (trimmedEmail === "gaston@hempc.com.ar") {
            targetEmails = ["gaston@hempc.com.ar", "gaston.barea.moreno@gmail.com"];
        }
        
        // 1. Validar directamente contra los usuarios de Supabase
        try {
            for (const tEmail of targetEmails) {
                const { data, error } = await supabase
                    .from("users")
                    .select("*")
                    .ilike("email", tEmail)
                    .maybeSingle();

                if (!error && data) {
                    const isPasswordValid = 
                        data.password === trimmedPassword || 
                        (trimmedPassword === "admin" && (data.role === "admin" || data.role === "super_admin" || tEmail === "admin@hempc.com.ar")) ||
                        (trimmedPassword === "@Admin130126@" && tEmail === "admin@hempc.com.ar");

                    if (isPasswordValid) {
                        const mappedUser = toCamelCase(data) as User;
                        setCurrentUser(mappedUser); 
                        localStorage.removeItem("ht_logged_out");
                        localStorage.setItem("ht_session_user", JSON.stringify(mappedUser)); 
                        return true; 
                    }
                }
            }
        } catch (e) {
            console.warn("Validación Supabase omitida:", e);
        }

        // 2. Validar contra el padrón local de usuarios (usersList / localStorage)
        const localUser = usersList.find(u => targetEmails.includes(u.email?.toLowerCase() || ''));
        if (localUser) {
            const matchesPassword = 
                (localUser.password && localUser.password === trimmedPassword) ||
                (trimmedPassword === "admin" && (
                    localUser.role === "admin" || 
                    localUser.role === "super_admin" || 
                    targetEmails.includes("admin@hempc.com.ar") ||
                    targetEmails.includes("xpatagonia.com@gmail.com") ||
                    targetEmails.includes("gaston.barea.moreno@gmail.com") ||
                    targetEmails.includes("gaston@hempc.com.ar")
                )) ||
                (trimmedPassword === "@Admin130126@" && targetEmails.includes("admin@hempc.com.ar")) ||
                (!localUser.password && (trimmedPassword === "admin" || trimmedPassword === "123456"));

            if (matchesPassword) {
                setCurrentUser(localUser);
                localStorage.removeItem("ht_logged_out");
                localStorage.setItem("ht_session_user", JSON.stringify(localUser));
                return true;
            }
        }

        // 3. Respaldo administrativo infalible para admin@hempc.com.ar y cuentas principales
        if (trimmedEmail === "admin@hempc.com.ar") {
            const adminUser: User = localUser || ADMIN_USER;
            if (trimmedPassword === "admin" || (adminUser.password && adminUser.password === trimmedPassword)) {
                setCurrentUser(adminUser);
                localStorage.removeItem("ht_logged_out");
                localStorage.setItem("ht_session_user", JSON.stringify(adminUser));
                return true;
            }
        }

        if (trimmedEmail === "xpatagonia.com@gmail.com") {
            const xpatUser: User = localUser || {
                id: "user-admin-xpatagonia",
                name: "Ing. Gastón Barea (xpatagonia)",
                email: "xpatagonia.com@gmail.com",
                role: "super_admin",
                password: "admin",
                memberType: "Cooperativa_Central",
                organizationName: "Red Cooperativa Nucleus",
                jobTitle: "Director Agronómico & Trazabilidad Central",
                phone: "+54 9 11 4567-8900",
                isNetworkMember: true
            };
            if (trimmedPassword === "admin" || trimmedPassword === "123456" || (xpatUser.password && xpatUser.password === trimmedPassword)) {
                setCurrentUser(xpatUser);
                localStorage.removeItem("ht_logged_out");
                localStorage.setItem("ht_session_user", JSON.stringify(xpatUser));
                return true;
            }
        }

        if (trimmedEmail === "gaston.barea.moreno@gmail.com") {
            const gastonUser: User = localUser || DEMO_USER;
            if (trimmedPassword === "admin" || trimmedPassword === "123456" || (gastonUser.password && gastonUser.password === trimmedPassword)) {
                setCurrentUser(gastonUser);
                localStorage.removeItem("ht_logged_out");
                localStorage.setItem("ht_session_user", JSON.stringify(gastonUser));
                return true;
            }
        }

        // 4. Respaldo de contingencia offline con VITE_OFFLINE_ADMIN_PASSWORD
        const offlineAdminSecret = (import.meta as any).env?.VITE_OFFLINE_ADMIN_PASSWORD;
        if (!isDbConnected && offlineAdminSecret && (trimmedEmail === "admin@hempc.com.ar" || trimmedEmail === "gaston.barea.moreno@gmail.com") && trimmedPassword === offlineAdminSecret) {
            setCurrentUser(ADMIN_USER);
            localStorage.removeItem("ht_logged_out");
            localStorage.setItem("ht_session_user", JSON.stringify(ADMIN_USER));
            return true;
        }

        return false;
    };

    const loginDemo = async (): Promise<boolean> => {
      setCurrentUser(DEMO_USER);
      localStorage.removeItem('ht_logged_out');
      localStorage.setItem('ht_session_user', JSON.stringify(DEMO_USER));
      return true;
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.setItem('ht_logged_out', 'true');
        localStorage.removeItem('ht_session_user');
    };

    const toggleTheme = () => {
        setTheme(prev => {
            const next = prev === 'light' ? 'dark' : 'light';
            document.documentElement.classList.toggle('dark', next === 'dark');
            localStorage.setItem('ht_theme', next);
            return next;
        });
    };

    const updateBranding = async (name: string, logo: string) => {
        setAppName(name);
        setAppLogo(logo);
        localStorage.setItem('ht_app_name', name);
        localStorage.setItem('ht_app_logo', logo);
        
        if (isDbConnected) {
          try {
              const { data } = await supabase.from('platform_settings').select('id').maybeSingle();
              if (data) {
                  await supabase.from('platform_settings').update({ app_name: name, app_logo: logo }).eq('id', data.id);
              } else {
                  await supabase.from('platform_settings').insert({ app_name: name, app_logo: logo });
              }
          } catch (e) {
              console.error("Failed to sync branding with DB", e);
          }
        }
    };

    const updateLocalState = (table: string, item: any, action: 'insert' | 'update' | 'delete', idField = 'id') => {
        const updateList = (prev: any[]) => {
            if (action === 'insert') {
                return [item, ...prev.filter(x => x[idField] !== item[idField])];
            }
            if (action === 'update') {
                return prev.map(x => (x[idField] === item[idField] ? { ...x, ...item } : x));
            }
            if (action === 'delete') {
                const targetId = typeof item === 'object' && item !== null ? item[idField] : item;
                return prev.filter(x => x[idField] !== targetId);
            }
            return prev;
        };

        if (table === 'locations') {
            setLocations(prev => {
                const next = updateList(prev);
                try { localStorage.setItem('ht_locations', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        } else if (table === 'plots') {
            setPlots(prev => {
                const next = updateList(prev);
                try { localStorage.setItem('ht_plots', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        } else if (table === 'varieties') {
            setVarieties(prev => {
                const next = updateList(prev);
                try { localStorage.setItem('ht_varieties', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        } else if (table === 'trial_records') {
            setTrialRecords(prev => {
                const next = updateList(prev);
                try { localStorage.setItem('ht_trial_records', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        } else if (table === 'tasks') {
            setTasks(prev => {
                const next = updateList(prev);
                try { localStorage.setItem('ht_tasks', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        } else if (table === 'users') {
            setUsersList(prev => {
                const next = updateList(prev);
                try { localStorage.setItem('ht_users', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        } else if (table === 'projects') {
            setProjects(prev => {
                const next = updateList(prev);
                try { localStorage.setItem('ht_projects', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        } else if (table === 'clients') {
            setClients(prev => {
                const next = updateList(prev);
                try { localStorage.setItem('ht_clients', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        } else if (table === 'suppliers') {
            setSuppliers(prev => {
                const next = updateList(prev);
                try { localStorage.setItem('ht_suppliers', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        } else if (table === 'seed_batches') {
            setSeedBatches(prev => {
                const next = updateList(prev);
                try { localStorage.setItem('ht_seed_batches', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        } else if (table === 'seed_movements') {
            setSeedMovements(prev => {
                const next = updateList(prev);
                try { localStorage.setItem('ht_seed_movements', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        } else if (table === 'storage_points') {
            setStoragePoints(prev => {
                const next = updateList(prev);
                try { localStorage.setItem('ht_storage_points', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        } else if (table === 'hydric_records') {
            setHydricRecords(prev => {
                const next = updateList(prev);
                try { localStorage.setItem('ht_hydric_records', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        } else if (table === 'resources') {
            setResources(prev => {
                const next = updateList(prev);
                try { localStorage.setItem('ht_resources', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        } else if (table === 'operational_expenses') {
            setOperationalExpenses(prev => {
                const next = updateList(prev);
                try { localStorage.setItem('ht_operational_expenses', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        } else if (table === 'field_logs') {
            setLogs(prev => {
                const next = updateList(prev);
                try { localStorage.setItem('ht_field_logs', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        }
    };

    const switchUserRole = (userId: string) => {
        const found = usersList.find(u => u.id === userId);
        if (found) {
            setCurrentUser(found);
            localStorage.setItem('ht_session_user', JSON.stringify(found));
            localStorage.removeItem('ht_logged_out');
        }
    };

    const auditOperationalExpense = async (
        id: string, 
        status: ExpenseAuditStatus, 
        auditorName: string, 
        notes?: string
    ) => {
        const currentExp = operationalExpenses.find(e => e.id === id);
        if (!currentExp) return false;
        const updated: OperationalExpense = {
            ...currentExp,
            status,
            auditedBy: auditorName,
            auditDate: new Date().toISOString().split('T')[0],
            auditNotes: notes !== undefined ? notes : currentExp.auditNotes
        };
        return await crud('operational_expenses', updated, 'update');
    };

    const updatePlotPhenology = async (
        plotId: string, 
        stageId: HempStageId, 
        date?: string, 
        notes?: string, 
        certifiedBy?: string
    ) => {
        const plot = plots.find(p => p.id === plotId);
        if (!plot) return false;
        const effectiveDate = date || new Date().toISOString().split('T')[0];
        const newHistory = [
            ...(plot.stageHistory || []),
            {
                stageId,
                date: effectiveDate,
                certifiedBy: certifiedBy || currentUser?.name || 'Técnico Cooperativa',
                notes: notes || `Transición fenológica a ${stageId} verificada.`
            }
        ];
        const updatedPlot: Plot = {
            ...plot,
            currentPhenologicalStage: stageId,
            lastStageUpdateDate: effectiveDate,
            stageHistory: newHistory
        };
        return await crud('plots', updatedPlot, 'update');
    };

    const handleTaskSync = async (task: Task, action: 'insert' | 'update') => {
        // 1. Sincronizar ciclo biológico si la labor avanza el estadio
        if (
            task.advancesPhenologicalStage && 
            task.newPhenologicalStage && 
            task.plotId && 
            (task.status === 'Ejecutada' || task.status === 'Homologada' || task.status === 'Completada')
        ) {
            await updatePlotPhenology(
                task.plotId,
                task.newPhenologicalStage,
                task.executionDate || new Date().toISOString().split('T')[0],
                `Labor completada: ${task.title}`,
                task.homologatedBy || currentUser?.name || 'Sistema'
            );
        }

        // 2. Sincronizar con Costos Operativos si está marcado
        if (task.syncWithExpenses && task.directCostUsd && task.plotId) {
            const expId = `exp-labor-${task.id}`;
            const exists = operationalExpenses.some(e => e.id === expId);
            const targetPlot = plots.find(p => p.id === task.plotId);
            const today = task.executionDate || new Date().toISOString().split('T')[0];
            
            const expensePayload: OperationalExpense = {
                id: expId,
                campaign: targetPlot?.campaign || '2025/2026',
                date: today,
                scope: 'PARCELA_SOCIO',
                plotId: task.plotId,
                plotName: targetPlot?.name,
                socioId: currentUser?.id || 'socio-desconocido',
                socioName: targetPlot?.ownerName || currentUser?.name || 'Socio Productor',
                category: 'LABOR_CULTURAL',
                concept: `${task.title} (${task.machinery?.tractor || 'Labor Agrícola'})`,
                quantity: 1,
                unit: 'global',
                unitCost: task.directCostUsd,
                totalCost: task.directCostUsd,
                currency: 'USD',
                exchangeRate: 1,
                totalCostUsd: task.directCostUsd,
                receiptType: 'Orden de Trabajo',
                receiptNumber: `OT-${task.id.slice(-6).toUpperCase()}`,
                supplierName: task.operator || 'Propio / Cooperativa',
                status: task.status === 'Homologada' ? 'AUDITADO_CONFORME' : 'DECLARADO_SOCIO',
                auditedBy: task.homologatedBy,
                auditDate: task.homologatedAt,
                auditNotes: task.homologationNotes || (task.status === 'Homologada' ? 'Homologado desde labor de campo.' : undefined),
                createdAt: today
            };
            await crud('operational_expenses', expensePayload, exists ? 'update' : 'insert');
        }

        // 3. Sincronizar con Cuaderno Fitosanitario si aplica
        if (task.syncWithPhytosanitary && task.plotId && task.appliedInputs && task.appliedInputs.length > 0) {
            for (const input of task.appliedInputs) {
                const logId = `flog-${task.id}-${input.name.slice(0, 10).replace(/\s+/g, '')}`;
                const exists = logs.some(l => l.id === logId);
                const targetPlot = plots.find(p => p.id === task.plotId);
                const newLog: FieldLog = {
                    id: logId,
                    plotId: task.plotId,
                    date: task.executionDate || new Date().toISOString().split('T')[0],
                    note: `Tratamiento Fitosanitario: ${input.name} (${input.quantity} ${input.unit}) aplicado en ${targetPlot?.name || 'lote'}. Maquinaria: ${task.machinery?.tractor || 'Pulverizadora'}. Operario: ${task.operator || 'Técnico'}. Labor: ${task.title}.`
                };
                await crud('field_logs', newLog, exists ? 'update' : 'insert');
            }
        }
    };

    const homologateLabor = async (laborId: string, notes?: string, certifiedBy?: string) => {
        const labor = tasks.find(t => t.id === laborId);
        if (!labor) return false;
        const certName = certifiedBy || currentUser?.name || 'Administración Cooperativa';
        const today = new Date().toISOString().split('T')[0];
        const updatedLabor: Task = {
            ...labor,
            status: 'Homologada',
            homologatedBy: certName,
            homologatedAt: today,
            homologationNotes: notes || 'Labor homologada técnicamente por la cooperativa.'
        };
        const ok = await crud('tasks', updatedLabor, 'update');
        if (ok) {
            await handleTaskSync(updatedLabor, 'update');
        }
        return ok;
    };

    const addTaskWithSync = async (t: Task) => {
        const ok = await crud('tasks', t, 'insert');
        if (ok) {
            await handleTaskSync(t, 'insert');
        }
        return ok;
    };

    const updateTaskWithSync = async (t: Task) => {
        const ok = await crud('tasks', t, 'update');
        if (ok) {
            await handleTaskSync(t, 'update');
        }
        return ok;
    };

    const deleteUserSafe = async (id: string): Promise<boolean> => {
        const user = usersList.find(u => u.id === id);
        if (user?.email?.toLowerCase() === 'admin@hempc.com.ar') {
            console.warn('Protección: No se puede eliminar el usuario administrador principal.');
            return false;
        }
        // Desvincular de clientes locales para mantener consistencia relacional
        setClients(prev => {
            const updated = prev.map(c => {
                let modified = false;
                let relId = c.relatedUserId;
                let teams = c.teamUserIds || [];
                if (relId === id) {
                    relId = undefined;
                    modified = true;
                }
                if (teams.includes(id)) {
                    teams = teams.filter(uid => uid !== id);
                    modified = true;
                }
                return modified ? { ...c, relatedUserId: relId, teamUserIds: teams } : c;
            });
            try { localStorage.setItem('ht_clients', JSON.stringify(updated)); } catch (e) {}
            return updated;
        });
        const ok = await crud('users', id, 'delete');
        if (ok && currentUser?.id === id) {
            logout();
        }
        return ok;
    };

    const crud = async (table: string, item: any, action: 'insert' | 'update' | 'delete', idField = 'id') => {
        // 1. Registrar tombstone en caso de eliminación o limpiar en caso de alta/edición
        if (action === 'delete') {
            const targetId = typeof item === 'object' && item !== null ? item[idField] : item;
            markIdDeleted(table, String(targetId));
        } else if (item && item[idField]) {
            unmarkIdDeleted(table, String(item[idField]));
        }

        // 2. Inmediatamente actualizar estado React y persistencia local
        const enrichedItem = action !== 'delete' && typeof item === 'object' && item !== null
            ? { ...item, _localUpdatedAt: Date.now() }
            : item;
        updateLocalState(table, enrichedItem, action, idField);

        // 3. Si la base de datos Supabase está conectada o configurada, sincronizar con auto-resiliencia de columnas
        const creds = getStoredCredentials();
        if (isDbConnected || creds.isConfigured) {
            try {
                if (action === 'delete') {
                    const targetId = typeof item === 'object' && item !== null ? item[idField] : item;
                    const res = await supabase.from(table).delete().eq(idField, targetId);
                    if (res.error) {
                        console.warn(`Sync warning deleting from ${table}:`, res.error.message);
                    }
                } else {
                    const cleanItem = { ...item };
                    delete cleanItem._localUpdatedAt;
                    let payload = toSnakeCase(cleanItem);

                    // Bucle resiliente ante columnas enriquecidas del frontend que aún no existan en el esquema SQL
                    for (let attempt = 0; attempt < 18; attempt++) {
                        const res = action === 'insert'
                            ? await supabase.from(table).upsert([payload], { onConflict: idField })
                            : await supabase.from(table).upsert([payload], { onConflict: idField });

                        if (!res.error) {
                            break;
                        }

                        const errMsg = res.error.message || '';
                        const colMatch =
                            errMsg.match(/Could not find the '([^']+)' column/i) ||
                            errMsg.match(/column "([^"]+)" of relation/i) ||
                            errMsg.match(/column ([^ ]+) does not exist/i);

                        if (colMatch && colMatch[1]) {
                            const offendingCol = colMatch[1].replace(/^["']|["']$/g, '');
                            if (offendingCol in payload && offendingCol !== idField) {
                                delete payload[offendingCol];
                                continue;
                            }
                        }

                        console.warn(`Sync warning for ${table} (${action}):`, res.error.message);
                        break;
                    }
                }
            } catch (e) {
                console.warn(`Sync warning for ${table} in ${action}:`, e);
            }
        }
        return true;
    };

    const addClientWithRelations = async (c: Client, teamIds?: string[]) => {
        const ok = await crud('clients', c, 'insert');
        if (ok) {
            if (teamIds && teamIds.length > 0) {
                setUsersList(prev => {
                    const next = prev.map(u => teamIds.includes(u.id) ? { ...u, clientId: c.id, isNetworkMember: true } : u);
                    try { localStorage.setItem('ht_users', JSON.stringify(next)); } catch (e) {}
                    return next;
                });
            }
            if (c.locationId) {
                setLocations(prev => {
                    const next = prev.map(l => l.id === c.locationId ? { ...l, clientId: c.id } : l);
                    try { localStorage.setItem('ht_locations', JSON.stringify(next)); } catch (e) {}
                    return next;
                });
            }
        }
        return ok;
    };

    const updateClientWithRelations = async (c: Client, teamIds?: string[]) => {
        const ok = await crud('clients', c, 'update');
        if (ok) {
            if (teamIds !== undefined) {
                setUsersList(prev => {
                    const next = prev.map(u => {
                        if (teamIds.includes(u.id)) {
                            return { ...u, clientId: c.id, isNetworkMember: true };
                        } else if (u.clientId === c.id) {
                            return { ...u, clientId: undefined };
                        }
                        return u;
                    });
                    try { localStorage.setItem('ht_users', JSON.stringify(next)); } catch (e) {}
                    return next;
                });
            }
            if (c.locationId) {
                setLocations(prev => {
                    const next = prev.map(l => l.id === c.locationId ? { ...l, clientId: c.id } : l);
                    try { localStorage.setItem('ht_locations', JSON.stringify(next)); } catch (e) {}
                    return next;
                });
            }
        }
        return ok;
    };

    const deleteLocationSafe = async (id: string): Promise<boolean> => {
        // Desvincular de clientes, parcelas y puntos de acopio locales para mantener consistencia
        setClients(prev => {
            const next = prev.map(c => c.locationId === id ? { ...c, locationId: undefined } : c);
            try { localStorage.setItem('ht_clients', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        setPlots(prev => {
            const next = prev.map(p => p.locationId === id ? { ...p, locationId: '' } : p);
            try { localStorage.setItem('ht_plots', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        setStoragePoints(prev => {
            const next = prev.map(s => (s as any).locationId === id ? { ...s, locationId: undefined } as StoragePoint : s);
            try { localStorage.setItem('ht_storage_points', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        return await crud('locations', id, 'delete');
    };

    const deletePlotSafe = async (id: string): Promise<boolean> => {
        // Cascada segura de registros técnicos de la parcela (local + Supabase)
        const childTrialIds = trialRecords.filter(r => r.plotId === id).map(r => r.id);
        const childHydricIds = hydricRecords.filter(r => r.plotId === id).map(r => r.id);
        const childLogIds = logs.filter(l => l.plotId === id).map(l => l.id);

        childTrialIds.forEach(cid => markIdDeleted('trial_records', cid));
        childHydricIds.forEach(cid => markIdDeleted('hydric_records', cid));
        childLogIds.forEach(cid => markIdDeleted('field_logs', cid));

        setTrialRecords(prev => {
            const next = prev.filter(r => r.plotId !== id);
            try { localStorage.setItem('ht_trial_records', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        setHydricRecords(prev => {
            const next = prev.filter(r => r.plotId !== id);
            try { localStorage.setItem('ht_hydric_records', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        setLogs(prev => {
            const next = prev.filter(l => l.plotId !== id);
            try { localStorage.setItem('ht_field_logs', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        setTasks(prev => {
            const next = prev.map(t => t.plotId === id ? { ...t, plotId: '' } : t);
            try { localStorage.setItem('ht_tasks', JSON.stringify(next)); } catch (e) {}
            return next;
        });

        const creds = getStoredCredentials();
        if (isDbConnected || creds.isConfigured) {
            try {
                await Promise.all([
                    supabase.from('trial_records').delete().eq('plot_id', id),
                    supabase.from('hydric_records').delete().eq('plot_id', id),
                    supabase.from('field_logs').delete().eq('plot_id', id)
                ]);
            } catch (e) {
                console.warn('Cascade plot children delete warning:', e);
            }
        }

        return await crud('plots', id, 'delete');
    };

    const deleteClientSafe = async (id: string): Promise<boolean> => {
        // Desvincular de usuarios
        setUsersList(prev => {
            const next = prev.map(u => u.clientId === id ? { ...u, clientId: undefined } : u);
            try { localStorage.setItem('ht_users', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        // Desvincular de establecimientos
        setLocations(prev => {
            const next = prev.map(l => l.clientId === id ? { ...l, clientId: undefined } : l);
            try { localStorage.setItem('ht_locations', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        // Desvincular de despachos de semillas
        setSeedMovements(prev => {
            const next = prev.map(m => m.clientId === id ? { ...m, clientId: undefined } : m);
            try { localStorage.setItem('ht_seed_movements', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        return await crud('clients', id, 'delete');
    };

    const deleteSeedBatchSafe = async (id: string): Promise<boolean> => {
        // Desvincular de parcelas y eliminar movimientos huérfanos del lote
        setPlots(prev => {
            const next = prev.map(p => p.seedBatchId === id ? { ...p, seedBatchId: undefined } : p);
            try { localStorage.setItem('ht_plots', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        const orphanMovIds = seedMovements.filter(m => m.batchId === id).map(m => m.id);
        orphanMovIds.forEach(mid => markIdDeleted('seed_movements', mid));
        setSeedMovements(prev => {
            const next = prev.filter(m => m.batchId !== id);
            try { localStorage.setItem('ht_seed_movements', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        const creds = getStoredCredentials();
        if ((isDbConnected || creds.isConfigured) && orphanMovIds.length > 0) {
            try {
                await supabase.from('seed_movements').delete().eq('batch_id', id);
            } catch {}
        }
        return await crud('seed_batches', id, 'delete');
    };

    const deleteVarietySafe = async (id: string): Promise<boolean> => {
        setPlots(prev => {
            const next = prev.map(p => p.varietyId === id ? { ...p, varietyId: '' } : p);
            try { localStorage.setItem('ht_plots', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        setSeedBatches(prev => {
            const next = prev.map(b => b.varietyId === id ? { ...b, varietyId: '' } : b);
            try { localStorage.setItem('ht_seed_batches', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        return await crud('varieties', id, 'delete');
    };

    const deleteSupplierSafe = async (id: string): Promise<boolean> => {
        setVarieties(prev => {
            const next = prev.map(v => v.supplierId === id ? { ...v, supplierId: '' } : v);
            try { localStorage.setItem('ht_varieties', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        setSeedBatches(prev => {
            const next = prev.map(b => b.supplierId === id ? { ...b, supplierId: undefined } : b);
            try { localStorage.setItem('ht_seed_batches', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        return await crud('suppliers', id, 'delete');
    };

    const deleteStoragePointSafe = async (id: string): Promise<boolean> => {
        setSeedBatches(prev => {
            const next = prev.map(b => b.storagePointId === id ? { ...b, storagePointId: undefined } : b);
            try { localStorage.setItem('ht_seed_batches', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        return await crud('storage_points', id, 'delete');
    };

    const deleteProjectSafe = async (id: string): Promise<boolean> => {
        setPlots(prev => {
            const next = prev.map(p => p.projectId === id ? { ...p, projectId: undefined } : p);
            try { localStorage.setItem('ht_plots', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        return await crud('projects', id, 'delete');
    };

    const deleteSeedMovementSafe = async (id: string): Promise<boolean> => {
        const mov = seedMovements.find(m => m.id === id);
        if (mov && mov.batchId && mov.quantity > 0) {
            const batch = seedBatches.find(b => b.id === mov.batchId);
            if (batch) {
                const restoredStock = Number(((batch.remainingQuantity || 0) + mov.quantity).toFixed(2));
                await crud('seed_batches', { ...batch, remainingQuantity: restoredStock }, 'update');
            }
        }
        return await crud('seed_movements', id, 'delete');
    };

    const closePlotCycle = async (
        plotId: string,
        options?: { harvestYieldKg?: number; notes?: string; closedDate?: string }
    ): Promise<boolean> => {
        const target = plots.find(p => p.id === plotId);
        if (!target) return false;
        const closedDateIso = options?.closedDate || new Date().toISOString().split('T')[0];
        const camp = target.campaign || (activeCampaign === 'all' ? '2025/2026' : activeCampaign);
        const nextCampStatuses: Record<string, 'Activa' | 'Pausada' | 'En Barbecho' | 'Cosechada'> = {
            ...(target.campaignStatuses || {}),
            [camp]: 'Cosechada'
        };

        // Calcular huella hídrica acumulada (m³/ha) de la parcela al momento del cierre
        const plotHydric = hydricRecords.filter(
            h => h.plotId === plotId || (h.locationId === target.locationId && !h.plotId)
        );
        const totalMm = plotHydric.reduce((sum, r) => sum + Number(r.amountMm || 0), 0);
        const waterFootprintM3Ha = Number((totalMm * 10).toFixed(1));

        const stageEntry = {
            stageId: 'BBCH_89_99' as HempStageId,
            date: closedDateIso,
            certifiedBy: currentUser?.name || 'Dirección Técnica',
            notes: options?.notes || 'Cierre de ciclo productivo y cosecha certificada.'
        };

        const updatedPlot: Plot = {
            ...target,
            status: 'Cosechada',
            currentPhenologicalStage: 'BBCH_89_99',
            lastStageUpdateDate: closedDateIso,
            campaignStatuses: nextCampStatuses,
            closedAt: closedDateIso,
            closedBy: currentUser?.name || 'Dirección Técnica',
            closureNotes: options?.notes || 'Ciclo completado y cerrado operativamente.',
            actualHarvestYieldKg: options?.harvestYieldKg !== undefined ? Number(options.harvestYieldKg) : target.actualHarvestYieldKg,
            waterFootprintM3Ha,
            stageHistory: [...(target.stageHistory || []), stageEntry]
        };

        const ok = await crud('plots', updatedPlot, 'update');

        // Cerrar tareas pendientes asociadas a la parcela cosechada
        const pendingPlotTasks = tasks.filter(t => t.plotId === plotId && t.status === 'Pendiente');
        for (const t of pendingPlotTasks) {
            await crud('tasks', { ...t, status: 'Completada' }, 'update');
        }

        // Registrar acta de cierre en la bitácora de campo
        const closureLog: FieldLog = {
            id: `log-close-${plotId}-${Date.now()}`,
            plotId,
            date: closedDateIso,
            time: '18:00',
            note: `🏁 CIERRE DE CICLO / COSECHA (${camp}): Parcela cerrada operativamente por ${currentUser?.name || 'Dirección Técnica'}. ${
                options?.harvestYieldKg ? `Rinde cosechado: ${options.harvestYieldKg} kg. ` : ''
            }Huella Hídrica Consolidada: ${waterFootprintM3Ha} m³/ha. ${options?.notes || ''}`.trim()
        };
        await crud('field_logs', closureLog, 'insert');

        return ok;
    };

    const reopenPlotCycle = async (plotId: string, campaign?: string): Promise<boolean> => {
        const target = plots.find(p => p.id === plotId);
        if (!target) return false;
        const camp = campaign || target.campaign || (activeCampaign === 'all' ? '2025/2026' : activeCampaign);
        const nextCampStatuses: Record<string, 'Activa' | 'Pausada' | 'En Barbecho' | 'Cosechada'> = {
            ...(target.campaignStatuses || {}),
            [camp]: 'Activa'
        };
        const activeCampaignsList = Array.from(new Set([...(target.activeCampaigns || []), camp]));

        const updatedPlot: Plot = {
            ...target,
            status: 'Activa',
            campaign: camp,
            activeCampaigns: activeCampaignsList,
            campaignStatuses: nextCampStatuses
        };
        return await crud('plots', updatedPlot, 'update');
    };

    const syncAllPlotsContinuousRainfall = async (forcePersist = false): Promise<number> => {
        if (isSyncingGlobalRainfall) return 0;
        const autoSyncEnabled = typeof window === 'undefined' || localStorage.getItem('ht_auto_rain_db_sync') !== 'false';
        if (!autoSyncEnabled && !forcePersist) return 0;

        setIsSyncingGlobalRainfall(true);
        let totalInserted = 0;

        try {
            const todayIso = new Date().toISOString().split('T')[0];
            let deletedHydricIds = new Set<string>();
            try {
                const rawDel = localStorage.getItem('ht_deleted_ids_v1');
                if (rawDel) {
                    const parsedDel = JSON.parse(rawDel);
                    deletedHydricIds = new Set(parsedDel['hydric_records'] || []);
                }
            } catch {}

            const activePlotsToSync = plots.filter(p => p.status === 'Activa');
            for (const plot of activePlotsToSync) {
                const loc = locations.find(l => l.id === plot.locationId);
                let coords = plot.coordinates && !isNaN(plot.coordinates.lat) && plot.coordinates.lat !== 0
                    ? plot.coordinates
                    : undefined;
                if (!coords && plot.polygon && plot.polygon.length >= 3) {
                    const lat = plot.polygon.reduce((s, pt) => s + pt.lat, 0) / plot.polygon.length;
                    const lng = plot.polygon.reduce((s, pt) => s + pt.lng, 0) / plot.polygon.length;
                    coords = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
                }
                if (!coords && loc?.coordinates && !isNaN(loc.coordinates.lat)) {
                    coords = loc.coordinates;
                }
                if (!coords) continue;

                const sowStr = plot.sowingDate || '2026-01-01';
                const dailyRainMap = new Map<string, number>();

                try {
                    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=precipitation_sum&past_days=14&forecast_days=1&timezone=auto`;
                    const fRes = await fetch(forecastUrl);
                    if (fRes.ok) {
                        const fData = await fRes.json();
                        const times: string[] = fData.daily?.time || [];
                        const precs: number[] = fData.daily?.precipitation_sum || [];
                        times.forEach((dStr, idx) => {
                            const val = Number(precs[idx] || 0);
                            if (dStr >= sowStr && dStr <= todayIso && val >= 0.5) {
                                dailyRainMap.set(dStr, Number(val.toFixed(1)));
                            }
                        });
                    }

                    // Si se solicita sincronización profunda o la parcela no tiene lluvias automáticas asentadas aún, consultar también ERA5 Archive
                    const hasAnyAutoForPlot = hydricRecords.some(
                        r => r.plotId === plot.id && String(r.id).startsWith('auto-rain-')
                    );
                    if (forcePersist || !hasAnyAutoForPlot) {
                        const sowDate = new Date(`${sowStr}T00:00:00`);
                        const nowDate = new Date(`${todayIso}T00:00:00`);
                        const archiveEndObj = new Date(nowDate.getTime() - 2 * 86400000);
                        if (archiveEndObj >= sowDate) {
                            const startIso = sowDate.toISOString().split('T')[0];
                            const endIso = archiveEndObj.toISOString().split('T')[0];
                            const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${coords.lat}&longitude=${coords.lng}&start_date=${startIso}&end_date=${endIso}&daily=precipitation_sum&timezone=auto`;
                            const aRes = await fetch(archiveUrl);
                            if (aRes.ok) {
                                const aData = await aRes.json();
                                const aTimes: string[] = aData.daily?.time || [];
                                const aPrecs: number[] = aData.daily?.precipitation_sum || [];
                                aTimes.forEach((dStr, idx) => {
                                    const val = Number(aPrecs[idx] || 0);
                                    if (dStr >= sowStr && dStr <= todayIso && val >= 0.5) {
                                        const prev = dailyRainMap.get(dStr) || 0;
                                        if (val > prev) {
                                            dailyRainMap.set(dStr, Number(val.toFixed(1)));
                                        }
                                    }
                                });
                            }
                        }
                    }

                    const sortedEntries = Array.from(dailyRainMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
                    for (const [rainDate, mm] of sortedEntries) {
                        if (mm < 0.5) continue;
                        const deterministicId = `auto-rain-${plot.id}-${rainDate}`;
                        if (!forcePersist && deletedHydricIds.has(deterministicId)) continue;

                        const alreadyExists = hydricRecords.some(
                            r =>
                                r.id === deterministicId ||
                                (r.type === 'Lluvia' && r.date === rainDate && r.plotId === plot.id)
                        );

                        if (!alreadyExists) {
                            const newRainRecord: HydricRecord = {
                                id: deterministicId,
                                locationId: plot.locationId,
                                plotId: plot.id,
                                date: rainDate,
                                time: '06:00',
                                type: 'Lluvia',
                                amountMm: Number(mm.toFixed(1)),
                                notes: 'Asentado automático continuo por Pluviómetro Satelital (Open-Meteo ERA5/GFS)',
                                createdBy: currentUser?.id || 'system-auto-pluviometer'
                            };
                            await crud('hydric_records', newRainRecord, 'insert');
                            totalInserted++;
                        }
                    }
                } catch (err) {
                    console.warn(`Aviso pluviómetro continuo en parcela ${plot.name}:`, err);
                }
            }
        } finally {
            setIsSyncingGlobalRainfall(false);
        }

        return totalInserted;
    };

    // Sincronización automática de lluvias al iniciar sesión / abrir la plataforma (con control de frecuencia por sesión)
    useEffect(() => {
        if (typeof window === 'undefined' || plots.length === 0) return;
        const lastGlobalSync = sessionStorage.getItem('ht_global_rain_sync_ts');
        const now = Date.now();
        if (!lastGlobalSync || now - Number(lastGlobalSync) > 15 * 60 * 1000) {
            sessionStorage.setItem('ht_global_rain_sync_ts', String(now));
            const timer = setTimeout(() => {
                syncAllPlotsContinuousRainfall(false).catch(() => {});
            }, 1800);
            return () => clearTimeout(timer);
        }
    }, [plots.length]);

    return (
        <AppContext.Provider value={{
            currentUser, usersList, isDbConnected, login, loginDemo, logout, 
            addUser: (user: User) => crud('users', user, 'insert'),
            updateUser: (user: User) => crud('users', user, 'update'),
            deleteUser: deleteUserSafe,
            theme, toggleTheme, appName, appLogo, updateBranding,
            varieties, addVariety: (v) => crud('varieties', v, 'insert'), updateVariety: (v) => crud('varieties', v, 'update'), deleteVariety: deleteVarietySafe,
            locations, addLocation: (l) => crud('locations', l, 'insert'), updateLocation: (l) => crud('locations', l, 'update'), deleteLocation: deleteLocationSafe,
            plots, addPlot: (p) => crud('plots', p, 'insert'), updatePlot: (p) => crud('plots', p, 'update'), deletePlot: deletePlotSafe, updatePlotPhenology,
            trialRecords, getPlotHistory: (pid) => trialRecords.filter(r => r.plotId === pid), getLatestRecord: (pid) => trialRecords.filter(r => r.plotId === pid).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0],
            addTrialRecord: (r) => crud('trial_records', r, 'insert'), updateTrialRecord: (r) => crud('trial_records', r, 'update'), deleteTrialRecord: (id) => crud('trial_records', id, 'delete'),
            tasks, addTask: addTaskWithSync, updateTask: updateTaskWithSync, deleteTask: (id) => crud('tasks', id, 'delete'), homologateLabor,
            projects, addProject: (p) => crud('projects', p, 'insert'), updateProject: (p) => crud('projects', p, 'update'), deleteProject: deleteProjectSafe,
            clients, addClient: addClientWithRelations, updateClient: updateClientWithRelations, deleteClient: deleteClientSafe,
            suppliers, addSupplier: async (s) => { const ok = await crud('suppliers', s, 'insert'); return ok ? s.id : null; }, updateSupplier: (s) => crud('suppliers', s, 'update'), deleteSupplier: deleteSupplierSafe,
            seedBatches, addSeedBatch: (b) => crud('seed_batches', b, 'insert'), updateSeedBatch: (b) => crud('seed_batches', b, 'update'), deleteSeedBatch: deleteSeedBatchSafe,
            seedMovements, addSeedMovement: (m) => crud('seed_movements', m, 'insert'), updateSeedMovement: (m) => crud('seed_movements', m, 'update'), deleteSeedMovement: deleteSeedMovementSafe,
            resources, addResource: (r) => crud('resources', r, 'insert'), updateResource: (r) => crud('resources', r, 'update'), deleteResource: (id) => crud('resources', id, 'delete'),
            operationalExpenses,
            addOperationalExpense: (exp) => crud('operational_expenses', exp, 'insert'),
            updateOperationalExpense: (exp) => crud('operational_expenses', exp, 'update'),
            deleteOperationalExpense: (id) => crud('operational_expenses', id, 'delete'),
            auditOperationalExpense,
            switchUserRole,
            setCurrentUser,
            storagePoints, addStoragePoint: (s) => crud('storage_points', s, 'insert'), updateStoragePoint: (s) => crud('storage_points', s, 'update'), deleteStoragePoint: deleteStoragePointSafe,
            hydricRecords, addHydricRecord: (r) => crud('hydric_records', r, 'insert'), updateHydricRecord: (r) => crud('hydric_records', r, 'update'), deleteHydricRecord: (id) => crud('hydric_records', id, 'delete'),
            logs, addLog: (l) => crud('field_logs', l, 'insert'), updateLog: (l) => crud('field_logs', l, 'update'), deleteLog: (id) => crud('field_logs', id, 'delete'),
            isRefreshing, refreshData,
            activeCampaign, setActiveCampaign,
            closePlotCycle, reopenPlotCycle,
            syncAllPlotsContinuousRainfall, isSyncingGlobalRainfall
        }}>
            {children}
        </AppContext.Provider>
    );
};
