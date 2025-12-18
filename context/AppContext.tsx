
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Variety, Location, Plot, FieldLog, TrialRecord, User, Project, Task, SeedBatch, SeedMovement, Supplier, Client, Resource, StoragePoint } from '../types';
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
  notifications: AppNotification[]; 
  
  currentUser: User | null;
  usersList: User[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshData: () => Promise<void>;
  lastSyncTime: Date | null;

  addProject: (p: Project) => Promise<boolean>;
  updateProject: (p: Project) => void;
  deleteProject: (id: string) => void; 
  
  addVariety: (v: Variety) => void;
  updateVariety: (v: Variety) => void;
  deleteVariety: (id: string) => void;

  addSupplier: (s: Supplier) => Promise<string>;
  updateSupplier: (s: Supplier) => void;
  deleteSupplier: (id: string) => void;

  addClient: (c: Client) => Promise<void>; 
  updateClient: (c: Client) => void; 
  deleteClient: (id: string) => void; 

  addResource: (r: Resource) => void; 
  updateResource: (r: Resource) => void; 
  deleteResource: (id: string) => void;

  addStoragePoint: (s: StoragePoint) => void;
  updateStoragePoint: (s: StoragePoint) => void;
  deleteStoragePoint: (id: string) => void;

  addLocation: (l: Location) => void;
  updateLocation: (l: Location) => void;
  deleteLocation: (id: string) => void;
  
  addPlot: (p: Plot) => Promise<void>;
  updatePlot: (p: Plot) => void;
  deletePlot: (id: string) => Promise<void>;
  
  addTrialRecord: (r: TrialRecord) => void;
  updateTrialRecord: (r: TrialRecord) => void;
  deleteTrialRecord: (id: string) => void;
  
  addLog: (l: FieldLog) => void;
  
  addUser: (u: User) => Promise<boolean>;
  updateUser: (u: User) => void;
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

  globalApiKey: string | null;
  refreshGlobalConfig: () => Promise<void>;

  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const RESCUE_USER: User = {
    id: 'rescue-admin-001',
    name: 'Admin Local (Offline)',
    email: 'admin@demo.com',
    password: 'admin',
    role: 'super_admin'
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
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [dbNeedsMigration, setDbNeedsMigration] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [globalApiKey, setGlobalApiKey] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('ht_theme') as 'light' | 'dark';
    if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    }
    const savedUser = localStorage.getItem('ht_session_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  const toggleTheme = () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem('ht_theme', newTheme);
      if (newTheme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
  };

  const notifications = useMemo(() => {
    if (!currentUser) return [];
    const notifs: AppNotification[] = [];
    tasks.forEach(t => {
        if (t.status === 'Completada') return;
        const isAssigned = t.assignedToIds.includes(currentUser.id) || currentUser.role === 'admin' || currentUser.role === 'super_admin';
        if (!isAssigned) return;
        const dueDate = new Date(t.dueDate);
        const today = new Date();
        if (dueDate < today) {
            notifs.push({ id: `t-${t.id}`, type: 'alert', title: 'Tarea Vencida', message: t.title, link: '/tasks', date: t.dueDate });
        }
    });
    return notifs;
  }, [tasks, currentUser]);

  const refreshGlobalConfig = async () => {
    try {
        const { data, error } = await supabase.from('system_settings').select('gemini_api_key').eq('id', 'global').single();
        if (!error && data?.gemini_api_key) setGlobalApiKey(data.gemini_api_key);
        else setGlobalApiKey(localStorage.getItem('hemp_ai_key'));
    } catch (e) { setGlobalApiKey(localStorage.getItem('hemp_ai_key')); }
  };

  const refreshData = async () => {
      setIsRefreshing(true);
      try {
          await refreshGlobalConfig();
          const connected = await checkConnection();
          if (!connected) {
              setIsEmergencyMode(true);
              setUsersList([...getFromLocal('users'), RESCUE_USER]);
              setProjects(getFromLocal('projects')); setVarieties(getFromLocal('varieties'));
              setSuppliers(getFromLocal('suppliers')); setClients(getFromLocal('clients'));
              setLocations(getFromLocal('locations')); setPlots(getFromLocal('plots'));
              setSeedBatches(getFromLocal('seedBatches')); setSeedMovements(getFromLocal('seedMovements'));
              setResources(getFromLocal('resources')); setStoragePoints(getFromLocal('storagePoints'));
              setTrialRecords(getFromLocal('trialRecords')); setLogs(getFromLocal('logs')); setTasks(getFromLocal('tasks'));
          } else {
              setIsEmergencyMode(false);
              const fetchData = async (table: string, setter: any) => {
                  const { data, error } = await supabase.from(table).select('*');
                  if (!error && data) setter(data);
              };
              await Promise.allSettled([
                  fetchData('users', setUsersList), fetchData('projects', setProjects),
                  fetchData('suppliers', setSuppliers), fetchData('clients', setClients),
                  fetchData('varieties', setVarieties), fetchData('locations', setLocations),
                  fetchData('plots', setPlots), fetchData('seed_batches', setSeedBatches),
                  fetchData('seed_movements', setSeedMovements), fetchData('resources', setResources),
                  fetchData('storage_points', setStoragePoints), fetchData('trial_records', setTrialRecords),
                  fetchData('field_logs', setLogs), fetchData('tasks', setTasks)
              ]);
              setLastSyncTime(new Date());
          }
      } catch (err) { console.error("Refresh Error:", err); } finally { setIsRefreshing(false); setLoading(false); }
  };

  useEffect(() => { refreshData(); }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (isEmergencyMode) {
        let u = usersList.find(u => u.email === email && u.password === password);
        if (email === RESCUE_USER.email && password === RESCUE_USER.password) u = RESCUE_USER;
        if (u) { setCurrentUser(u); localStorage.setItem('ht_session_user', JSON.stringify(u)); return true; }
        return false;
    }
    const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('password', password).single();
    if (!error && data) { setCurrentUser(data as User); localStorage.setItem('ht_session_user', JSON.stringify(data)); return true; }
    return false;
  };

  const logout = () => { setCurrentUser(null); localStorage.removeItem('ht_session_user'); };

  const genericAdd = async (table: string, item: any, setter: any, localKey: string) => {
      if (isEmergencyMode) {
          setter((prev: any[]) => { const n = [...prev, item]; saveToLocal(localKey, n); return n; });
          return true;
      } else {
          const { error } = await supabase.from(table).insert([item]);
          if (error) { console.error(error); return false; }
          setter((prev: any[]) => [...prev, item]);
          return true;
      }
  };

  const genericUpdate = async (table: string, item: any, setter: any, localKey: string) => {
      if (isEmergencyMode) {
          setter((prev: any[]) => { const n = prev.map((i: any) => i.id === item.id ? item : i); saveToLocal(localKey, n); return n; });
      } else {
          const { error } = await supabase.from(table).update(item).eq('id', item.id);
          setter((prev: any[]) => prev.map((i: any) => i.id === item.id ? item : i));
      }
  };

  const genericDelete = async (table: string, id: string, setter: any, localKey: string) => {
      if (isEmergencyMode) {
          setter((prev: any[]) => { const n = prev.filter((i: any) => i.id !== id); saveToLocal(localKey, n); return n; });
      } else {
          await supabase.from(table).delete().eq('id', id);
          setter((prev: any[]) => prev.filter((i: any) => i.id !== id));
      }
  };

  const addUser = (u: User) => genericAdd('users', u, setUsersList, 'users');
  const updateUser = (u: User) => genericUpdate('users', u, setUsersList, 'users');
  const deleteUser = (id: string) => genericDelete('users', id, setUsersList, 'users');
  const addProject = (p: Project) => genericAdd('projects', p, setProjects, 'projects');
  const updateProject = (p: Project) => genericUpdate('projects', p, setProjects, 'projects');
  const deleteProject = (id: string) => genericDelete('projects', id, setProjects, 'projects');
  const addLocation = (l: Location) => genericAdd('locations', l, setLocations, 'locations');
  const updateLocation = (l: Location) => genericUpdate('locations', l, setLocations, 'locations');
  const deleteLocation = (id: string) => genericDelete('locations', id, setLocations, 'locations');
  const addPlot = (p: Plot) => genericAdd('plots', p, setPlots, 'plots').then(() => {});
  const updatePlot = (p: Plot) => genericUpdate('plots', p, setPlots, 'plots');
  const deletePlot = (id: string) => genericDelete('plots', id, setPlots, 'plots').then(() => {});
  const addVariety = (v: Variety) => { genericAdd('varieties', v, setVarieties, 'varieties'); };
  const updateVariety = (v: Variety) => { genericUpdate('varieties', v, setVarieties, 'varieties'); };
  const deleteVariety = (id: string) => { genericDelete('varieties', id, setVarieties, 'varieties'); };
  const addSupplier = async (s: Supplier) => { await genericAdd('suppliers', s, setSuppliers, 'suppliers'); return s.id; };
  const updateSupplier = (s: Supplier) => genericUpdate('suppliers', s, setSuppliers, 'suppliers');
  const deleteSupplier = (id: string) => genericDelete('suppliers', id, setSuppliers, 'suppliers');
  const addClient = async (c: Client) => { await genericAdd('clients', c, setClients, 'clients'); };
  const updateClient = (c: Client) => genericUpdate('clients', c, setClients, 'clients');
  const deleteClient = (id: string) => genericDelete('clients', id, setClients, 'clients');
  const addResource = (r: Resource) => genericAdd('resources', r, setResources, 'resources');
  const updateResource = (r: Resource) => genericUpdate('resources', r, setResources, 'resources');
  const deleteResource = (id: string) => genericDelete('resources', id, setResources, 'resources');
  const addStoragePoint = (s: StoragePoint) => genericAdd('storage_points', s, setStoragePoints, 'storagePoints');
  const updateStoragePoint = (s: StoragePoint) => genericUpdate('storage_points', s, setStoragePoints, 'storagePoints');
  const deleteStoragePoint = (id: string) => genericDelete('storage_points', id, setStoragePoints, 'storagePoints');
  const addSeedBatch = (s: SeedBatch) => genericAdd('seed_batches', s, setSeedBatches, 'seedBatches');
  const addLocalSeedBatch = (s: SeedBatch) => setSeedBatches(prev => [...prev, s]);
  const updateSeedBatch = (s: SeedBatch) => genericUpdate('seed_batches', s, setSeedBatches, 'seedBatches');
  const deleteSeedBatch = async (id: string) => { await genericDelete('seed_batches', id, setSeedBatches, 'seedBatches'); };
  
  const addSeedMovement = async (m: SeedMovement) => { return await genericAdd('seed_movements', m, setSeedMovements, 'seedMovements'); };
  const updateSeedMovement = (m: SeedMovement) => genericUpdate('seed_movements', m, setSeedMovements, 'seedMovements');
  
  const deleteSeedMovement = async (id: string) => { 
      const move = seedMovements.find(m => m.id === id);
      if (move) {
          // RESTORE STOCK TO BATCH
          const batch = seedBatches.find(b => b.id === move.batchId);
          if (batch) {
              const updatedBatch = { ...batch, remainingQuantity: batch.remainingQuantity + move.quantity };
              await genericUpdate('seed_batches', updatedBatch, setSeedBatches, 'seedBatches');
          }
      }
      await genericDelete('seed_movements', id, setSeedMovements, 'seedMovements');
  };

  const addTrialRecord = (r: TrialRecord) => { genericAdd('trial_records', r, setTrialRecords, 'trialRecords'); };
  const updateTrialRecord = (r: TrialRecord) => { genericUpdate('trial_records', r, setTrialRecords, 'trialRecords'); };
  const deleteTrialRecord = (id: string) => { genericDelete('trial_records', id, setTrialRecords, 'trialRecords'); };
  const addLog = (l: FieldLog) => { genericAdd('field_logs', l, setLogs, 'logs'); };
  const addTask = (t: Task) => { genericAdd('tasks', t, setTasks, 'tasks'); };
  const updateTask = (t: Task) => { genericUpdate('tasks', t, setTasks, 'tasks'); };
  const deleteTask = (id: string) => { genericDelete('tasks', id, setTasks, 'tasks'); };

  const getPlotHistory = (plotId: string) => { return trialRecords.filter(r => r.plotId === plotId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); };
  const getLatestRecord = (plotId: string) => { const history = getPlotHistory(plotId); return history.length > 0 ? history[0] : undefined; };

  return (
    <AppContext.Provider value={{
      projects, varieties, locations, plots, trialRecords, logs, tasks, seedBatches, seedMovements, suppliers, clients, resources, storagePoints, notifications,
      currentUser, usersList, login, logout, refreshData, lastSyncTime,
      addProject, updateProject, deleteProject,
      addVariety, updateVariety, deleteVariety,
      addLocation, updateLocation, deleteLocation,
      addPlot, updatePlot, deletePlot,
      addTrialRecord, updateTrialRecord, deleteTrialRecord,
      addLog,
      addUser, updateUser, deleteUser,
      addTask, updateTask, deleteTask,
      addSeedBatch, addLocalSeedBatch, updateSeedBatch, deleteSeedBatch,
      addSeedMovement, updateSeedMovement, deleteSeedMovement,
      addSupplier, updateSupplier, deleteSupplier,
      addClient, updateClient, deleteClient,
      addResource, updateResource, deleteResource,
      addStoragePoint, updateStoragePoint, deleteStoragePoint,
      getPlotHistory, getLatestRecord,
      loading, isRefreshing, isEmergencyMode, dbNeedsMigration,
      globalApiKey, refreshGlobalConfig,
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
