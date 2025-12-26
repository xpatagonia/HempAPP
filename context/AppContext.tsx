
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Variety, Location, Plot, FieldLog, TrialRecord, User, Project, Task, SeedBatch, SeedMovement, Supplier, Client, Resource, StoragePoint, HydricRecord } from '../types';
import { supabase, checkConnection } from '../supabaseClient';

export interface AppNotification {
    id: string;
    type: 'alert' | 'info' | 'warning';
    title: string;
    message: string;
    link?: string;
    date: string;
}

interface AppContextType {
  projects: Project[];
  varieties: Variety[];
  locations: Location[];
  plots: Plot[];
  trialRecords: TrialRecord[];
  logs: FieldLog[];
  tasks: Task[];
  seedBatches: SeedBatch[];
  seedMovements: SeedMovement[];
  suppliers: Supplier[];
  clients: Client[]; 
  resources: Resource[]; 
  storagePoints: StoragePoint[]; 
  hydricRecords: HydricRecord[];
  notifications: AppNotification[]; 
  
  appName: string;
  appLogo: string | null;
  updateBranding: (name: string, logo: string | null) => void;

  currentUser: User | null;
  usersList: User[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshData: () => Promise<void>;
  lastSyncTime: Date | null;

  addProject: (p: Project) => Promise<boolean>;
  updateProject: (p: Project) => Promise<boolean>;
  deleteProject: (id: string) => void; 
  
  addVariety: (v: Variety) => Promise<boolean>;
  updateVariety: (v: Variety) => Promise<boolean>;
  deleteVariety: (id: string) => void;

  addSupplier: (s: Supplier) => Promise<string | null>;
  updateSupplier: (s: Supplier) => Promise<boolean>;
  deleteSupplier: (id: string) => void;

  addClient: (c: Client, teamUserIds?: string[]) => Promise<boolean>; 
  updateClient: (c: Client, teamUserIds?: string[]) => Promise<boolean>; 
  deleteClient: (id: string) => void; 

  addResource: (r: Resource) => void; 
  updateResource: (r: Resource) => void; 
  deleteResource: (id: string) => void;

  addStoragePoint: (s: StoragePoint) => Promise<boolean>;
  updateStoragePoint: (s: StoragePoint) => Promise<boolean>;
  deleteStoragePoint: (id: string) => void;

  addLocation: (l: Location) => Promise<boolean>;
  updateLocation: (l: Location) => Promise<boolean>;
  deleteLocation: (id: string) => void;
  
  addPlot: (p: Plot) => Promise<boolean>;
  updatePlot: (p: Plot) => Promise<boolean>;
  deletePlot: (id: string) => Promise<void>;
  
  addTrialRecord: (r: TrialRecord) => Promise<boolean>;
  updateTrialRecord: (r: TrialRecord) => Promise<boolean>;
  deleteTrialRecord: (id: string) => void;
  
  addLog: (l: FieldLog) => Promise<boolean>;
  updateLog: (l: FieldLog) => Promise<boolean>;
  deleteLog: (id: string) => void;
  
  addHydricRecord: (h: HydricRecord) => Promise<boolean>;
  deleteHydricRecord: (id: string) => void;

  addUser: (u: User) => Promise<boolean>;
  updateUser: (u: User) => Promise<boolean>;
  deleteUser: (id: string) => void;

  addTask: (t: Task) => void;
  updateTask: (t: Task) => void;
  deleteTask: (id: string) => void;

  addSeedBatch: (s: SeedBatch) => Promise<boolean>;
  updateSeedBatch: (s: SeedBatch) => Promise<boolean>;
  deleteSeedBatch: (id: string) => Promise<void>;
  
  addSeedMovement: (m: SeedMovement) => Promise<boolean>;
  updateSeedMovement: (m: SeedMovement) => Promise<boolean>;
  deleteSeedMovement: (id: string) => Promise<void>;

  getPlotHistory: (plotId: string) => TrialRecord[];
  getLatestRecord: (plotId: string) => TrialRecord | undefined;
  
  loading: boolean;
  isRefreshing: boolean;
  isEmergencyMode: boolean;

  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const MANUAL_MAP: Record<string, string> = {
    nodeCode: 'node_code',
    clientId: 'client_id',
    supplierId: 'supplier_id',
    storagePointId: 'storage_point_id',
    varietyId: 'variety_id',
    locationId: 'location_id',
    projectId: 'project_id',
    seedBatchId: 'seed_batch_id',
    isNetworkMember: 'is_network_member',
    relatedUserId: 'related_user_id',
    isOfficialPartner: 'is_official_partner',
    postalCode: 'postal_code',
    commercialContact: 'commercial_contact',
    logisticsContact: 'logistics_contact',
    legalName: 'legal_name',
    membershipLevel: 'membership_level',
    contractDate: 'contract_date',
    contactName: 'contact_name',
    contactPhone: 'contact_phone',
    expectedThc: 'expected_thc',
    cycleDays: 'cycle_days',
    knowledgeBase: 'knowledge_base',
    pricePerKg: 'price_per_kg',
    initialQuantity: 'initial_quantity',
    remainingQuantity: 'remaining_quantity',
    labelSerialNumber: 'label_serial_number',
    certificationNumber: 'certification_number',
    gs1Code: 'gs1_code',
    jobTitle: 'job_title',
    analysisDate: 'analysis_date',
    purchaseDate: 'purchase_date',
    purchaseOrder: 'purchase_order',
    isActive: 'is_active',
    createdAt: 'created_at',
    totalHectares: 'total_hectares',
    plantHeight: 'plant_height',
    plantsPerMeter: 'plants_per_meter',
    birdDamage: 'bird_damage',
    stemWeight: 'stem_weight',
    leafWeight: 'leaf_weight',
    freshWeight: 'fresh_weight',
    emergenceDate: 'emergence_date',
    floweringDate: 'flowering_date',
    harvestDate: 'harvest_date',
    createdBy: 'created_by',
    createdByName: 'created_by_name',
    plotId: 'plot_id',
    amountMm: 'amount_mm',
    targetLocationId: 'target_location_id',
    dispatchTime: 'dispatch_time',
    transportGuideNumber: 'transport_guide_number',
    transportType: 'transport_type',
    driverName: 'driver_name',
    driverDni: 'driver_dni',
    vehiclePlate: 'vehicle_plate',
    vehicleModel: 'vehicle_model',
    transportCompany: 'transport_company',
    recipientName: 'recipient_name',
    recipientDni: 'recipient_dni',
    routeItinerary: 'route_itinerary',
    originStorageId: 'origin_storage_id',
    routeGoogleLink: 'route_google_link',
    estimatedDistanceKm: 'estimated_distance_km',
    assignedToIds: 'assigned_to_ids',
    dueDate: 'due_date',
    surfaceArea: 'surface_area',
    surfaceUnit: 'surface_unit',
    sowingDate: 'sowing_date',
    ownerName: 'owner_name',
    ownerLegalName: 'owner_legal_name',
    ownerCuit: 'owner_cuit',
    ownerContact: 'owner_contact',
    ownerType: 'owner_type',
    capacityHa: 'capacity_ha',
    irrigationSystem: 'irrigation_system',
    soilType: 'soil_type',
    responsiblePerson: 'responsible_person',
    responsibleIds: 'responsible_ids',
    rowDistance: 'row_distance',
    irrigationType: 'irrigation_type',
    photoUrl: 'photo_url',
    costPerUnit: 'cost_per_unit',
    startDate: 'start_date',
    directorId: 'director_id',
    usedSeedValue: 'used_seed_value',
    usedSeedUnit: 'used_seed_unit',
    lightHours: 'light_hours'
};

const toSnakeCase = (obj: any) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const newObj: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // CORRECCIÓN: Eliminamos usedSeedValue y usedSeedUnit de ignorados para que se guarden en plots
            if (['lat', 'lng', 'teamUserIds', 'inputValue'].includes(key)) continue;

            const snakeKey = MANUAL_MAP[key] || key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            let val = obj[key];
            
            if (['responsibleIds', 'assignedToIds', 'responsible_ids', 'assigned_to_ids'].includes(snakeKey) || key.includes('Ids')) {
                if (val === null || val === undefined) val = [];
            } else if ((key.toLowerCase().endsWith('id') || key === 'clientId' || key === 'supplierId') && (val === '' || val === undefined)) {
                val = null;
            }
            
            if (val !== undefined) {
                newObj[snakeKey] = val;
            }
        }
    }
    return newObj;
};

const toCamelCase = (obj: any) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const newObj: any = {};
    const REVERSE_MAP = Object.fromEntries(Object.entries(MANUAL_MAP).map(([k, v]) => [v, k]));
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const camelKey = REVERSE_MAP[key] || key.replace(/(_\w)/g, m => m[1].toUpperCase());
            newObj[camelKey] = obj[key];
        }
    }
    return newObj;
};

const saveToLocal = (key: string, data: any[]) => localStorage.setItem(`ht_local_${key}`, JSON.stringify(data));
const getFromLocal = (key: string) => {
    try {
        const item = localStorage.getItem(`ht_local_${key}`);
        return item ? JSON.parse(item) : [];
    } catch { return []; }
};

export const AppProvider = ({ children }: { children?: React.ReactNode }) => {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [clients, setClients] = useState<Client[]>([]); 
  const [locations, setLocations] = useState<Location[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [trialRecords, setTrialRecords] = useState<TrialRecord[]>([]);
  const [logs, setLogs] = useState<FieldLog[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [seedBatches, setSeedBatches] = useState<SeedBatch[]>([]);
  const [seedMovements, setSeedMovements] = useState<SeedMovement[]>([]);
  const [resources, setResources] = useState<Resource[]>([]); 
  const [storagePoints, setStoragePoints] = useState<StoragePoint[]>([]);
  const [hydricRecords, setHydricRecords] = useState<HydricRecord[]>([]);
  
  const [appName, setAppName] = useState<string>(localStorage.getItem('ht_branding_name') || 'HempC');
  const [appLogo, setAppLogo] = useState<string | null>(localStorage.getItem('ht_branding_logo'));

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('ht_theme') as 'light' | 'dark';
    if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    }
    const savedUser = localStorage.getItem('ht_session_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  const updateBranding = (name: string, logo: string | null) => {
      setAppName(name);
      setAppLogo(logo);
      localStorage.setItem('ht_branding_name', name);
      if (logo) localStorage.setItem('ht_branding_logo', logo);
      else localStorage.removeItem('ht_branding_logo');
  };

  const refreshData = async () => {
      setIsRefreshing(true);
      try {
          const connected = await checkConnection();
          if (!connected) setIsEmergencyMode(true);
          else {
              setIsEmergencyMode(false);
              const fetchData = async (table: string, setter: any, localKey: string) => {
                  try {
                    const { data, error } = await supabase.from(table).select('*');
                    if (!error && data) {
                        const camelData = data.map(i => toCamelCase(i));
                        setter(camelData);
                        saveToLocal(localKey, camelData);
                    } else if (error) {
                        setter(getFromLocal(localKey));
                    }
                  } catch (e) { setter(getFromLocal(localKey)); }
              };
              await Promise.allSettled([
                  fetchData('users', setUsersList, 'users'), fetchData('projects', setProjects, 'projects'),
                  fetchData('suppliers', setSuppliers, 'suppliers'), fetchData('clients', setClients, 'clients'),
                  fetchData('varieties', setVarieties, 'varieties'), fetchData('locations', setLocations, 'locations'),
                  fetchData('plots', setPlots, 'plots'), fetchData('seed_batches', setSeedBatches, 'seed_batches'),
                  fetchData('seed_movements', setSeedMovements, 'seed_movements'), fetchData('resources', setResources, 'resources'),
                  fetchData('storage_points', setStoragePoints, 'storage_points'), fetchData('trial_records', setTrialRecords, 'trial_records'),
                  fetchData('field_logs', setLogs, 'field_logs'), fetchData('tasks', setTasks, 'tasks'),
                  fetchData('hydric_records', setHydricRecords, 'hydric_records')
              ]);
              setLastSyncTime(new Date());
          }
      } catch (err) { console.error("Refresh Error:", err); } finally { setIsRefreshing(false); setLoading(false); }
  };

  useEffect(() => { refreshData(); }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (email.toLowerCase() === 'admin@hempc.com' && password === 'admin123') {
        const rootUser: User = { id: 'root-user', name: 'Super Administrador (Master)', email: 'admin@hempc.com', role: 'super_admin', isNetworkMember: true, jobTitle: 'Director de Sistema' };
        setCurrentUser(rootUser);
        localStorage.setItem('ht_session_user', JSON.stringify(rootUser));
        return true;
    }
    try {
        const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('password', password).maybeSingle();
        if (!error && data) {
            const mappedUser = toCamelCase(data) as User;
            setCurrentUser(mappedUser); 
            localStorage.setItem('ht_session_user', JSON.stringify(mappedUser)); 
            return true; 
        }
    } catch (e) { console.error("DB Login failed"); }
    const localUser = usersList.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (localUser) {
        setCurrentUser(localUser);
        localStorage.setItem('ht_session_user', JSON.stringify(localUser));
        return true;
    }
    return false;
  };

  const logout = () => { setCurrentUser(null); localStorage.removeItem('ht_session_user'); };

  const genericAdd = async (table: string, item: any, setter: any, localKey: string) => {
      const dbItem = toSnakeCase({ ...item });
      try {
          const { error } = await supabase.from(table).insert([dbItem]);
          if (error) { 
              console.error(`[DB INSERT ERROR] ${table}:`, error); 
              alert(`FALLO DE SERVIDOR: La base de datos rechazó el registro.\n\nMOTIVO: ${error.message}\n\nACCIÓN: Ejecute el Script V39 en Ajustes.`);
              return false; 
          }
          await refreshData();
          return true;
      } catch (e: any) { 
          console.error(`[RUNTIME INSERT ERROR] ${table}:`, e); 
          alert("Error de ejecución local al procesar el guardado.");
          return false; 
      }
  };

  const genericUpdate = async (table: string, item: any, setter: any, localKey: string) => {
      const dbItem = toSnakeCase(item);
      try {
          const { error } = await supabase.from(table).update(dbItem).eq('id', item.id);
          if (error) { 
              console.error(`[DB UPDATE ERROR] ${table}:`, error); 
              alert(`FALLO DE SERVIDOR: No se pudo actualizar.\nMotivo: ${error.message}`);
              return false; 
          }
          await refreshData();
          return true;
      } catch (e) { 
          console.error(`[RUNTIME UPDATE ERROR] ${table}:`, e); 
          return false; 
      }
  };

  const genericDelete = async (table: string, id: string, setter: any, localKey: string) => {
      try {
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (!error) await refreshData();
      } catch (e) { console.error("Delete Error:", e); }
  };

  const syncTeam = async (clientId: string, teamUserIds: string[]) => {
      if (!clientId) return;
      await supabase.from('users').update({ client_id: null }).eq('client_id', clientId);
      if (teamUserIds.length > 0) {
          await supabase.from('users').update({ client_id: clientId }).in('id', teamUserIds);
      }
      await refreshData();
  };

  const addUser = async (u: User) => {
      const success = await genericAdd('users', u, setUsersList, 'users');
      return success;
  };
  const updateUser = (u: User) => genericUpdate('users', u, setUsersList, 'users');
  const deleteUser = (id: string) => genericDelete('users', id, setUsersList, 'users');
  const addProject = (p: Project) => genericAdd('projects', p, setProjects, 'projects');
  const updateProject = (project: Project) => genericUpdate('projects', project, setProjects, 'projects');
  const deleteProject = (id: string) => genericDelete('projects', id, setProjects, 'projects');
  const addLocation = (l: Location) => genericAdd('locations', l, setLocations, 'locations');
  const updateLocation = (l: Location) => genericUpdate('locations', l, setLocations, 'locations');
  const deleteLocation = (id: string) => genericDelete('locations', id, setLocations, 'locations');
  const addPlot = (p: Plot) => genericAdd('plots', p, setPlots, 'plots');
  const updatePlot = (p: Plot) => genericUpdate('plots', p, setPlots, 'plots');
  const deletePlot = (id: string) => genericDelete('plots', id, setPlots, 'plots').then(() => {});
  
  const addVariety = async (v: Variety) => { 
      const success = await genericAdd('varieties', v, setVarieties, 'varieties'); 
      return success;
  };
  const updateVariety = async (v: Variety) => { 
      return genericUpdate('varieties', v, setVarieties, 'varieties'); 
  };
  const deleteVariety = (id: string) => { genericDelete('varieties', id, setVarieties, 'varieties'); };
  
  const addSupplier = async (s: Supplier) => { 
      const success = await genericAdd('suppliers', s, setSuppliers, 'suppliers'); 
      return success ? s.id : null; 
  };
  const updateSupplier = (s: Supplier) => genericUpdate('suppliers', s, setSuppliers, 'suppliers');
  const deleteSupplier = (id: string) => { genericDelete('suppliers', id, setVarieties, 'suppliers'); };
  
  const addClient = async (c: Client, teamUserIds: string[] = []) => {
      const success = await genericAdd('clients', c, setClients, 'clients');
      if (success) {
          const finalTeam = [...new Set([...teamUserIds, c.relatedUserId].filter(Boolean) as string[])];
          await syncTeam(c.id, finalTeam);
      }
      return success;
  };
  const updateClient = async (c: Client, teamUserIds: string[] = []) => {
      const success = await genericUpdate('clients', c, setClients, 'clients');
      if (success) {
          const finalTeam = [...new Set([...teamUserIds, c.relatedUserId].filter(Boolean) as string[])];
          await syncTeam(c.id, finalTeam);
      }
      return success;
  };
  const deleteClient = (id: string) => genericDelete('clients', id, setClients, 'clients');
  
  const addResource = (r: Resource) => genericAdd('resources', r, setResources, 'resources');
  const updateResource = (r: Resource) => genericUpdate('resources', r, setResources, 'resources');
  const deleteResource = (id: string) => genericDelete('resources', id, setResources, 'resources');
  
  const addStoragePoint = async (sp: StoragePoint) => {
      const success = await genericAdd('storage_points', sp, setStoragePoints, 'storage_points');
      return success;
  };
  const updateStoragePoint = async (sp: StoragePoint) => {
      return genericUpdate('storage_points', sp, setStoragePoints, 'storage_points');
  };
  const deleteStoragePoint = (id: string) => genericDelete('storage_points', id, setStoragePoints, 'storage_points');
  
  const addSeedBatch = (s: SeedBatch) => genericAdd('seed_batches', s, setSeedBatches, 'seed_batches');
  const updateSeedBatch = (s: SeedBatch) => genericUpdate('seed_batches', s, setSeedBatches, 'seed_batches');
  const deleteSeedBatch = async (id: string) => { await genericDelete('seed_batches', id, setSeedBatches, 'seed_batches'); };
  
  const addHydricRecord = (h: HydricRecord) => genericAdd('hydric_records', h, setHydricRecords, 'hydric_records');
  const deleteHydricRecord = (id: string) => genericDelete('hydric_records', id, setHydricRecords, 'hydric_records');
  const addSeedMovement = async (m: SeedMovement) => genericAdd('seed_movements', m, setSeedMovements, 'seed_movements');
  const updateSeedMovement = (m: SeedMovement) => genericUpdate('seed_movements', m, setSeedMovements, 'seed_movements');
  const deleteSeedMovement = async (id: string) => { 
      const move = seedMovements.find(m => m.id === id);
      if (move) {
          const batch = seedBatches.find(b => b.id === move.batchId);
          if (batch) {
              const updatedBatch = { ...batch, remainingQuantity: (batch.remainingQuantity || 0) + (move.quantity || 0) };
              await genericUpdate('seed_batches', updatedBatch, setSeedBatches, 'seed_batches');
          }
      }
      await genericDelete('seed_movements', id, setSeedMovements, 'seed_movements');
  };
  const addTrialRecord = (r: TrialRecord) => genericAdd('trial_records', r, setTrialRecords, 'trial_records');
  const updateTrialRecord = (r: TrialRecord) => { return genericUpdate('trial_records', r, setTrialRecords, 'trial_records'); };
  const deleteTrialRecord = (id: string) => { genericDelete('trial_records', id, setTrialRecords, 'trial_records'); };
  const addLog = (l: FieldLog) => genericAdd('field_logs', l, setLogs, 'field_logs');
  const updateLog = (l: FieldLog) => { return genericUpdate('field_logs', l, setLogs, 'field_logs'); };
  const deleteLog = (id: string) => { genericDelete('field_logs', id, setLogs, 'field_logs'); };
  const addTask = (t: Task) => { genericAdd('tasks', t, setTasks, 'tasks'); };
  const updateTask = (t: Task) => { genericUpdate('tasks', t, setTasks, 'tasks'); };
  const deleteTask = (id: string) => { genericDelete('tasks', id, setTasks, 'tasks'); };

  const notifications = useMemo(() => {
    if (!currentUser) return [];
    const notifs: AppNotification[] = [];
    tasks.forEach(t => {
        if (t.status === 'Completada') return;
        const isAssigned = t.assignedToIds.includes(currentUser.id) || currentUser.role === 'admin' || currentUser?.role === 'super_admin';
        if (!isAssigned) return;
        const dueDate = new Date(t.dueDate);
        if (dueDate < new Date()) notifs.push({ id: `t-${t.id}`, type: 'alert', title: 'Tarea Vencida', message: t.title, link: '/tasks', date: t.dueDate });
    });
    return notifs;
  }, [tasks, currentUser]);

  const getPlotHistory = (plotId: string) => trialRecords.filter(r => r.plotId === plotId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const getLatestRecord = (plotId: string) => { const history = getPlotHistory(plotId); return history.length > 0 ? history[0] : undefined; };

  const toggleTheme = () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem('ht_theme', newTheme);
      if (newTheme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
  };

  return (
    <AppContext.Provider value={{
      projects, varieties, locations, plots, trialRecords, logs, tasks, seedBatches, seedMovements, suppliers, clients, resources, storagePoints, hydricRecords, notifications,
      appName, appLogo, updateBranding,
      currentUser, usersList, login, logout, refreshData, lastSyncTime,
      addProject, updateProject, deleteProject,
      addVariety, updateVariety, deleteVariety,
      addLocation, updateLocation, deleteLocation,
      addPlot, updatePlot, deletePlot,
      addTrialRecord, updateTrialRecord, deleteTrialRecord,
      addLog, updateLog, deleteLog,
      addUser, updateUser, deleteUser,
      addTask, updateTask, deleteTask,
      addSeedBatch, updateSeedBatch, deleteSeedBatch,
      addSeedMovement, updateSeedMovement, deleteSeedMovement,
      addSupplier, updateSupplier, deleteSupplier,
      addClient, updateClient, deleteClient,
      addResource, updateResource, deleteResource,
      addStoragePoint, updateStoragePoint, deleteStoragePoint,
      addHydricRecord, deleteHydricRecord,
      getPlotHistory, getLatestRecord,
      loading, isRefreshing, isEmergencyMode,
      theme, toggleTheme
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
