
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
  
  addVariety: (v: Variety) => void;
  updateVariety: (v: Variety) => void;
  deleteVariety: (id: string) => void;

  addSupplier: (s: Supplier) => Promise<string>;
  updateSupplier: (s: Supplier) => void;
  deleteSupplier: (id: string) => void;

  addClient: (c: Client) => Promise<boolean>; 
  updateClient: (c: Client) => void; 
  deleteClient: (id: string) => void; 

  addResource: (r: Resource) => void; 
  updateResource: (r: Resource) => void; 
  deleteResource: (id: string) => void;

  addStoragePoint: (s: StoragePoint) => void;
  updateStoragePoint: (s: StoragePoint) => void;
  deleteStoragePoint: (id: string) => void;

  addLocation: (l: Location) => Promise<boolean>;
  updateLocation: (l: Location) => void;
  deleteLocation: (id: string) => void;
  
  addPlot: (p: Plot) => Promise<boolean>;
  updatePlot: (p: Plot) => void;
  deletePlot: (id: string) => Promise<void>;
  
  addTrialRecord: (r: TrialRecord) => Promise<boolean>;
  updateTrialRecord: (r: TrialRecord) => void;
  deleteTrialRecord: (id: string) => void;
  
  addLog: (l: FieldLog) => Promise<boolean>;
  updateLog: (l: FieldLog) => void;
  deleteLog: (id: string) => void;
  
  addHydricRecord: (h: HydricRecord) => Promise<boolean>;
  deleteHydricRecord: (id: string) => void;

  addUser: (u: User) => Promise<boolean>;
  updateUser: (u: User) => Promise<boolean>;
  deleteUser: (id: string) => void;

  addTask: (t: Task) => void;
  updateTask: (t: Task) => void;
  deleteTask: (id: string) => void;

  addSeedBatch: (s: SeedBatch) => void;
  addLocalSeedBatch: (s: SeedBatch) => void; 
  updateSeedBatch: (s: SeedBatch) => void;
  deleteSeedBatch: (id: string) => Promise<void>;
  
  addSeedMovement: (m: SeedMovement) => Promise<boolean>;
  updateSeedMovement: (m: SeedMovement) => void;
  deleteSeedMovement: (id: string) => Promise<void>;

  getPlotHistory: (plotId: string) => TrialRecord[];
  getLatestRecord: (plotId: string) => TrialRecord | undefined;
  
  loading: boolean;
  isRefreshing: boolean;
  isEmergencyMode: boolean;
  dbNeedsMigration: boolean; 

  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mapeo JS -> DB
const toSnakeCase = (obj: any) => {
    if (!obj || typeof obj !== 'object') return obj;
    const newObj: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            let snakeKey = key;
            if (key === 'clientId') snakeKey = 'client_id';
            else if (key === 'isNetworkMember') snakeKey = 'is_network_member';
            else if (key === 'relatedUserId') snakeKey = 'related_user_id';
            else if (key === 'projectId') snakeKey = 'project_id';
            else if (key === 'varietyId') snakeKey = 'variety_id';
            else if (key === 'locationId') snakeKey = 'location_id';
            else if (key === 'seedBatchId') snakeKey = 'seed_batch_id';
            else if (key === 'jobTitle') snakeKey = 'job_title';
            else {
                snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            }
            newObj[snakeKey] = obj[key];
        }
    }
    return newObj;
};

// Mapeo DB -> JS
const toCamelCase = (obj: any) => {
    if (!obj || typeof obj !== 'object') return obj;
    const newObj: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            let camelKey = key;
            if (key === 'client_id') camelKey = 'clientId';
            else if (key === 'is_network_member') camelKey = 'isNetworkMember';
            else if (key === 'related_user_id') camelKey = 'relatedUserId';
            else if (key === 'job_title') camelKey = 'jobTitle';
            else {
                camelKey = key.replace(/(_\w)/g, m => m[1].toUpperCase());
            }
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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
          if (!connected) {
              setIsEmergencyMode(true);
              setUsersList(getFromLocal('users'));
          } else {
              setIsEmergencyMode(false);
              const fetchData = async (table: string, setter: any, localKey: string) => {
                  try {
                    const { data, error } = await supabase.from(table).select('*');
                    if (!error && data) {
                        const camelData = data.map(i => toCamelCase(i));
                        setter(camelData);
                        saveToLocal(localKey, camelData);
                    } else if (error) {
                        console.warn(`[SYNC WARNING] ${table}:`, error.message);
                        setter(getFromLocal(localKey));
                        if (error.message.includes('column') || error.message.includes('cache')) setIsEmergencyMode(true);
                    }
                  } catch (e) {
                      setter(getFromLocal(localKey));
                  }
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
    // 0. PUERTA DE EMERGENCIA (Bypass total para setup inicial)
    if (email.toLowerCase() === 'admin@hempc.com' && password === 'admin123') {
        console.log("🔐 Acceso por Bypass de Emergencia activado.");
        const rootUser: User = {
            id: 'root-user',
            name: 'Super Administrador (Master)',
            email: 'admin@hempc.com',
            role: 'super_admin',
            isNetworkMember: true,
            jobTitle: 'Director de Sistema'
        };
        setCurrentUser(rootUser);
        localStorage.setItem('ht_session_user', JSON.stringify(rootUser));
        return true;
    }

    // 1. Intentar login directo por base de datos
    try {
        const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('password', password).maybeSingle();
        if (!error && data) {
            const mappedUser = toCamelCase(data) as User;
            setCurrentUser(mappedUser); 
            localStorage.setItem('ht_session_user', JSON.stringify(mappedUser)); 
            return true; 
        }
    } catch (e) { console.error("DB Login failed, trying local..."); }

    // 2. Fallback: Caché local
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
              console.error(`[DB ERROR] ${table}:`, error.message);
              setter((prev: any[]) => { const n = [...prev, item]; saveToLocal(localKey, n); return n; });
              if (error.message.includes('column') || error.message.includes('cache')) setIsEmergencyMode(true);
              return true; 
          }
          setter((prev: any[]) => { const n = [...prev, item]; saveToLocal(localKey, n); return n; });
          return true;
      } catch (e: any) {
          setter((prev: any[]) => { const n = [...prev, item]; saveToLocal(localKey, n); return n; });
          return true;
      }
  };

  const genericUpdate = async (table: string, item: any, setter: any, localKey: string) => {
      const dbItem = toSnakeCase(item);
      const { error } = await supabase.from(table).update(dbItem).eq('id', item.id);
      if (error) { console.error(`Error actualizando ${table}:`, error.message); return false; }
      setter((prev: any[]) => { const n = prev.map((i: any) => i.id === item.id ? item : i); saveToLocal(localKey, n); return n; });
      return true;
  };

  const genericDelete = async (table: string, id: string, setter: any, localKey: string) => {
      await supabase.from(table).delete().eq('id', id);
      setter((prev: any[]) => { const n = prev.filter((i: any) => i.id !== id); saveToLocal(localKey, n); return n; });
  };

  const addUser = async (u: User) => {
      const success = await genericAdd('users', u, setUsersList, 'users');
      if (success) await refreshData();
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
  const addVariety = (v: Variety) => { genericAdd('varieties', v, setVarieties, 'varieties'); };
  const updateVariety = (v: Variety) => { genericUpdate('varieties', v, setVarieties, 'varieties'); };
  const deleteVariety = (id: string) => { genericDelete('varieties', id, setVarieties, 'varieties'); };
  const addSupplier = async (s: Supplier) => { await genericAdd('suppliers', s, setSuppliers, 'suppliers'); return s.id; };
  const updateSupplier = (s: Supplier) => genericUpdate('suppliers', s, setSuppliers, 'suppliers');
  const deleteSupplier = (id: string) => { genericDelete('suppliers', id, setSuppliers, 'suppliers'); };
  
  const addClient = async (c: Client) => {
      const success = await genericAdd('clients', c, setClients, 'clients');
      if (success) await refreshData();
      return success;
  };
  const updateClient = (c: Client) => genericUpdate('clients', c, setClients, 'clients');
  const deleteClient = (id: string) => genericDelete('clients', id, setClients, 'clients');
  
  const addResource = (r: Resource) => genericAdd('resources', r, setResources, 'resources');
  const updateResource = (r: Resource) => genericUpdate('resources', r, setResources, 'resources');
  const deleteResource = (id: string) => genericDelete('resources', id, setResources, 'resources');
  const addStoragePoint = (sp: StoragePoint) => genericAdd('storage_points', sp, setStoragePoints, 'storage_points');
  const updateStoragePoint = (sp: StoragePoint) => genericUpdate('storage_points', sp, setStoragePoints, 'storage_points');
  const deleteStoragePoint = (id: string) => genericDelete('storage_points', id, setStoragePoints, 'storage_points');
  const addSeedBatch = (s: SeedBatch) => genericAdd('seed_batches', s, setSeedBatches, 'seed_batches');
  const addLocalSeedBatch = (s: SeedBatch) => setSeedBatches(prev => [...prev, s]);
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
  const updateTrialRecord = (r: TrialRecord) => { genericUpdate('trial_records', r, setTrialRecords, 'trial_records'); };
  const deleteTrialRecord = (id: string) => { genericDelete('trial_records', id, setTrialRecords, 'trial_records'); };
  const addLog = (l: FieldLog) => genericAdd('field_logs', l, setLogs, 'field_logs');
  const updateLog = (l: FieldLog) => { genericUpdate('field_logs', l, setLogs, 'field_logs'); };
  const deleteLog = (id: string) => { genericDelete('field_logs', id, setLogs, 'field_logs'); };
  const addTask = (t: Task) => { genericAdd('tasks', t, setTasks, 'tasks'); };
  const updateTask = (t: Task) => { genericUpdate('tasks', t, setTasks, 'tasks'); };
  const deleteTask = (id: string) => { genericDelete('tasks', id, setTasks, 'tasks'); };

  const notifications = useMemo(() => {
    if (!currentUser) return [];
    const notifs: AppNotification[] = [];
    tasks.forEach(t => {
        if (t.status === 'Completada') return;
        const isAssigned = t.assignedToIds.includes(currentUser.id) || currentUser.role === 'admin' || currentUser.role === 'super_admin';
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
      addSeedBatch, addLocalSeedBatch, updateSeedBatch, deleteSeedBatch,
      addSeedMovement, updateSeedMovement, deleteSeedMovement,
      addSupplier, updateSupplier, deleteSupplier,
      addClient, updateClient, deleteClient,
      addResource, updateResource, deleteResource,
      addStoragePoint, updateStoragePoint, deleteStoragePoint,
      addHydricRecord, deleteHydricRecord,
      getPlotHistory, getLatestRecord,
      loading, isRefreshing, isEmergencyMode, dbNeedsMigration: false,
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
