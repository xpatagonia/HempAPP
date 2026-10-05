import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, checkConnection } from '../supabaseClient';
import { 
  User, Location, Plot, TrialRecord, Task, Project, Variety, 
  Client, Supplier, SeedBatch, SeedMovement, Resource, 
  StoragePoint, HydricRecord, FieldLog 
} from '../types';
import { 
  DEMO_USER, DEMO_VARIETIES, DEMO_LOCATIONS, DEMO_PLOTS, 
  DEMO_PROJECTS, DEMO_TRIALS, DEMO_HYDRIC, DEMO_TASKS,
  DEMO_STORAGE_POINTS, DEMO_SUPPLIERS, DEMO_SEED_BATCHES, DEMO_SEED_MOVEMENTS
} from '../src/data/initialDemoData';

interface AppContextType {
  currentUser: User | null;
  usersList: User[];
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
  resources: Resource[];
  addResource: (r: Resource) => Promise<boolean>;
  updateResource: (r: Resource) => Promise<boolean>;
  deleteResource: (id: string) => Promise<boolean>;
  storagePoints: StoragePoint[];
  addStoragePoint: (s: StoragePoint) => Promise<boolean>;
  updateStoragePoint: (s: StoragePoint) => Promise<boolean>;
  deleteStoragePoint: (id: string) => Promise<boolean>;
  hydricRecords: HydricRecord[];
  addHydricRecord: (r: HydricRecord) => Promise<boolean>;
  deleteHydricRecord: (id: string) => Promise<boolean>;
  logs: FieldLog[];
  addLog: (l: FieldLog) => Promise<boolean>;
  deleteLog: (id: string) => Promise<boolean>;
  isRefreshing: boolean;
  refreshData: () => Promise<void>;
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
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            result[snakeKey] = toSnakeCase(obj[key]);
            return result;
        }, {} as any);
    }
    return obj;
}

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

    const [usersList, setUsersList] = useState<User[]>([DEMO_USER]);
    const [varieties, setVarieties] = useState<Variety[]>(DEMO_VARIETIES);
    const [locations, setLocations] = useState<Location[]>(DEMO_LOCATIONS);
    const [plots, setPlots] = useState<Plot[]>(DEMO_PLOTS);
    const [trialRecords, setTrialRecords] = useState<TrialRecord[]>(DEMO_TRIALS);
    const [tasks, setTasks] = useState<Task[]>(DEMO_TASKS);
    const [projects, setProjects] = useState<Project[]>(DEMO_PROJECTS);
    const [clients, setClients] = useState<Client[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>(DEMO_SUPPLIERS);
    const [seedBatches, setSeedBatches] = useState<SeedBatch[]>(DEMO_SEED_BATCHES);
    const [seedMovements, setSeedMovements] = useState<SeedMovement[]>(DEMO_SEED_MOVEMENTS);
    const [resources, setResources] = useState<Resource[]>([]);
    const [storagePoints, setStoragePoints] = useState<StoragePoint[]>(DEMO_STORAGE_POINTS);
    const [hydricRecords, setHydricRecords] = useState<HydricRecord[]>(DEMO_HYDRIC);
    const [logs, setLogs] = useState<FieldLog[]>([]);

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
                      const { data } = await supabase.from(table).select('*');
                      if (data && data.length > 0) {
                        setter(toCamelCase(data));
                      } else if (fallbackData) {
                        setter(fallbackData);
                      }
                    } catch(e) {
                      if (fallbackData) setter(fallbackData);
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
                    fetchTable('users', setUsersList, [DEMO_USER]),
                    fetchTable('varieties', setVarieties, DEMO_VARIETIES),
                    fetchTable('locations', setLocations, DEMO_LOCATIONS),
                    fetchTable('plots', setPlots, DEMO_PLOTS),
                    fetchTable('trial_records', setTrialRecords, DEMO_TRIALS),
                    fetchTable('tasks', setTasks, DEMO_TASKS),
                    fetchTable('projects', setProjects, DEMO_PROJECTS),
                    fetchTable('clients', setClients),
                    fetchTable('suppliers', setSuppliers, DEMO_SUPPLIERS),
                    fetchTable('seed_batches', setSeedBatches),
                    fetchTable('seed_movements', setSeedMovements),
                    fetchTable('resources', setResources),
                    fetchTable('storage_points', setStoragePoints, DEMO_STORAGE_POINTS),
                    fetchTable('hydric_records', setHydricRecords, DEMO_HYDRIC),
                    fetchTable('field_logs', setLogs),
                ]);
            } else {
                // Modo Autónomo / Local
                setUsersList(prev => prev.length > 0 ? prev : [DEMO_USER]);
                setVarieties(prev => prev.length > 0 ? prev : DEMO_VARIETIES);
                setLocations(prev => prev.length > 0 ? prev : DEMO_LOCATIONS);
                setPlots(prev => prev.length > 0 ? prev : DEMO_PLOTS);
                setTrialRecords(prev => prev.length > 0 ? prev : DEMO_TRIALS);
                setHydricRecords(prev => prev.length > 0 ? prev : DEMO_HYDRIC);
                setProjects(prev => prev.length > 0 ? prev : DEMO_PROJECTS);
                setTasks(prev => prev.length > 0 ? prev : DEMO_TASKS);
                setSuppliers(prev => prev.length > 0 ? prev : DEMO_SUPPLIERS);
                setStoragePoints(prev => prev.length > 0 ? prev : DEMO_STORAGE_POINTS);
                setSeedBatches(prev => prev.length > 0 ? prev : DEMO_SEED_BATCHES);
                setSeedMovements(prev => prev.length > 0 ? prev : DEMO_SEED_MOVEMENTS);
            }
        } catch(e) {
            console.error("Data refresh failed", e);
        } finally {
            setIsRefreshing(false);
        }
    };

    const login = async (email: string, password: string): Promise<boolean> => {
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPassword = password.trim();
        
        // 1. Validar directamente contra los usuarios de Supabase
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .ilike('email', trimmedEmail)
                .eq('password', trimmedPassword)
                .maybeSingle();

            if (!error && data) {
                const mappedUser = toCamelCase(data) as User;
                setCurrentUser(mappedUser); 
                localStorage.removeItem('ht_logged_out');
                localStorage.setItem('ht_session_user', JSON.stringify(mappedUser)); 
                return true; 
            }
        } catch (e) {
            console.error("Error al autenticar contra Supabase:", e);
        }

        // 2. Respaldo de contingencia únicamente si la base de datos estuviera desconectada
        if (!isDbConnected && trimmedEmail === 'admin@hempc.com.ar' && trimmedPassword === '@Admin130126@') {
            setCurrentUser(DEMO_USER);
            localStorage.removeItem('ht_logged_out');
            localStorage.setItem('ht_session_user', JSON.stringify(DEMO_USER));
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
        } else if (table === 'varieties') setVarieties(prev => updateList(prev));
        else if (table === 'trial_records') setTrialRecords(prev => updateList(prev));
        else if (table === 'tasks') setTasks(prev => updateList(prev));
        else if (table === 'projects') setProjects(prev => updateList(prev));
        else if (table === 'clients') setClients(prev => updateList(prev));
        else if (table === 'suppliers') setSuppliers(prev => updateList(prev));
        else if (table === 'seed_batches') setSeedBatches(prev => updateList(prev));
        else if (table === 'seed_movements') setSeedMovements(prev => updateList(prev));
        else if (table === 'storage_points') setStoragePoints(prev => updateList(prev));
        else if (table === 'hydric_records') setHydricRecords(prev => updateList(prev));
        else if (table === 'resources') setResources(prev => updateList(prev));
        else if (table === 'field_logs') setLogs(prev => updateList(prev));
    };

    const crud = async (table: string, item: any, action: 'insert' | 'update' | 'delete', idField = 'id') => {
        // 1. Inmediatamente actualizar estado React y persistencia local
        updateLocalState(table, item, action, idField);

        // 2. Si la base de datos Supabase está conectada, sincronizar
        if (isDbConnected) {
            try {
                let payload = item;
                if (action !== 'delete') payload = toSnakeCase(item);
                if (action === 'insert') {
                    await supabase.from(table).insert([payload]);
                } else if (action === 'update') {
                    await supabase.from(table).update(payload).eq(idField, item[idField]);
                } else if (action === 'delete') {
                    const targetId = typeof item === 'object' && item !== null ? item[idField] : item;
                    await supabase.from(table).delete().eq(idField, targetId);
                }
            } catch (e) {
                console.warn(`Sync warning for ${table} in ${action}:`, e);
            }
        }
        return true;
    };

    return (
        <AppContext.Provider value={{
            currentUser, usersList, isDbConnected, login, loginDemo, logout, 
            addUser: (user: User) => crud('users', user, 'insert'),
            updateUser: (user: User) => crud('users', user, 'update'),
            deleteUser: (id: string) => crud('users', id, 'delete'),
            theme, toggleTheme, appName, appLogo, updateBranding,
            varieties, addVariety: (v) => crud('varieties', v, 'insert'), updateVariety: (v) => crud('varieties', v, 'update'), deleteVariety: (id) => crud('varieties', id, 'delete'),
            locations, addLocation: (l) => crud('locations', l, 'insert'), updateLocation: (l) => crud('locations', l, 'update'), deleteLocation: (id) => crud('locations', id, 'delete'),
            plots, addPlot: (p) => crud('plots', p, 'insert'), updatePlot: (p) => crud('plots', p, 'update'), deletePlot: (id) => crud('plots', id, 'delete'),
            trialRecords, getPlotHistory: (pid) => trialRecords.filter(r => r.plotId === pid), getLatestRecord: (pid) => trialRecords.filter(r => r.plotId === pid).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0],
            addTrialRecord: (r) => crud('trial_records', r, 'insert'), updateTrialRecord: (r) => crud('trial_records', r, 'update'), deleteTrialRecord: (id) => crud('trial_records', id, 'delete'),
            tasks, addTask: (t) => crud('tasks', t, 'insert'), updateTask: (t) => crud('tasks', t, 'update'), deleteTask: (id) => crud('tasks', id, 'delete'),
            projects, addProject: (p) => crud('projects', p, 'insert'), updateProject: (p) => crud('projects', p, 'update'), deleteProject: (id) => crud('projects', id, 'delete'),
            clients, addClient: (c) => crud('clients', c, 'insert'), updateClient: (c) => crud('clients', c, 'update'), deleteClient: (id) => crud('clients', id, 'delete'),
            suppliers, addSupplier: async (s) => { const ok = await crud('suppliers', s, 'insert'); return ok ? s.id : null; }, updateSupplier: (s) => crud('suppliers', s, 'update'), deleteSupplier: (id) => crud('suppliers', id, 'delete'),
            seedBatches, addSeedBatch: (b) => crud('seed_batches', b, 'insert'), updateSeedBatch: (b) => crud('seed_batches', b, 'update'), deleteSeedBatch: (id) => crud('seed_batches', id, 'delete'),
            seedMovements, addSeedMovement: (m) => crud('seed_movements', m, 'insert'), updateSeedMovement: (m) => crud('seed_movements', m, 'update'),
            resources, addResource: (r) => crud('resources', r, 'insert'), updateResource: (r) => crud('resources', r, 'update'), deleteResource: (id) => crud('resources', id, 'delete'),
            storagePoints, addStoragePoint: (s) => crud('storage_points', s, 'insert'), updateStoragePoint: (s) => crud('storage_points', s, 'update'), deleteStoragePoint: (id) => crud('storage_points', id, 'delete'),
            hydricRecords, addHydricRecord: (r) => crud('hydric_records', r, 'insert'), deleteHydricRecord: (id) => crud('hydric_records', id, 'delete'),
            logs, addLog: (l) => crud('field_logs', l, 'insert'), deleteLog: (id) => crud('field_logs', id, 'delete'),
            isRefreshing, refreshData
        }}>
            {children}
        </AppContext.Provider>
    );
};
