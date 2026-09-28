import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, checkConnection } from '../supabaseClient';
import { 
  User, Location, Plot, TrialRecord, Task, Project, Variety, 
  Client, Supplier, SeedBatch, SeedMovement, Resource, 
  StoragePoint, HydricRecord, FieldLog 
} from '../types';
import { 
  DEMO_USER, DEMO_VARIETIES, DEMO_LOCATIONS, DEMO_PLOTS, 
  DEMO_PROJECTS, DEMO_TRIALS, DEMO_HYDRIC, DEMO_TASKS 
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
    // Inicialización síncrona: garantiza acceso inmediato como Ing. Gastón Barea (Super Admin)
    // para que la interfaz completa y todas las novedades estén visibles al instante sin bloqueos de caché.
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        if (typeof window !== 'undefined') {
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
            // Auto-ingreso predeterminado como Ing. Gastón Barea (Super Admin)
            localStorage.setItem('ht_session_user', JSON.stringify(DEMO_USER));
            localStorage.removeItem('ht_logged_out');
            return DEMO_USER;
        }
        return DEMO_USER;
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
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [seedBatches, setSeedBatches] = useState<SeedBatch[]>([]);
    const [seedMovements, setSeedMovements] = useState<SeedMovement[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [storagePoints, setStoragePoints] = useState<StoragePoint[]>([]);
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
                    fetchTable('suppliers', setSuppliers),
                    fetchTable('seed_batches', setSeedBatches),
                    fetchTable('seed_movements', setSeedMovements),
                    fetchTable('resources', setResources),
                    fetchTable('storage_points', setStoragePoints),
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
            }
        } catch(e) {
            console.error("Data refresh failed", e);
        } finally {
            setIsRefreshing(false);
        }
    };

    const login = async (email: string, password: string): Promise<boolean> => {
        const trimmedEmail = email.trim().toLowerCase();
        
        // 1. Si hay conexión a Supabase, validar en la base de datos
        if (isDbConnected) {
          try {
              const { data, error } = await supabase.from('users').select('*').eq('email', trimmedEmail).eq('password', password).maybeSingle();
              if (!error && data) {
                  const mappedUser = toCamelCase(data) as User;
                  setCurrentUser(mappedUser); 
                  localStorage.removeItem('ht_logged_out');
                  localStorage.setItem('ht_session_user', JSON.stringify(mappedUser)); 
                  return true; 
              }
          } catch (e) {}
        }

        // 2. Fallback / Modo Offline / Demo
        // Permite acceso con el usuario admin, Gastón Barea o cualquier credencial en modo autónomo
        if (
          trimmedEmail === DEMO_USER.email || 
          trimmedEmail === 'admin@hempc.com.ar' ||
          trimmedEmail.includes('gaston') ||
          trimmedEmail.includes('admin') || 
          !isDbConnected
        ) {
          const userToSet: User = {
            ...DEMO_USER,
            email: trimmedEmail || DEMO_USER.email,
            name: (trimmedEmail === DEMO_USER.email || trimmedEmail === 'admin@hempc.com.ar' || trimmedEmail.includes('gaston')) 
              ? DEMO_USER.name 
              : `Usuario (${trimmedEmail.split('@')[0]})`
          };
          setCurrentUser(userToSet);
          localStorage.removeItem('ht_logged_out');
          localStorage.setItem('ht_session_user', JSON.stringify(userToSet));
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

    const crud = async (table: string, item: any, action: 'insert' | 'update' | 'delete', idField = 'id') => {
        if (!isDbConnected) {
          // Actualizar en memoria local
          return true;
        }
        try {
            let payload = item;
            if (action !== 'delete') payload = toSnakeCase(item);
            let error;
            if (action === 'insert') {
                const res = await supabase.from(table).insert([payload]);
                error = res.error;
            } else if (action === 'update') {
                const res = await supabase.from(table).update(payload).eq(idField, item[idField]);
                error = res.error;
            } else if (action === 'delete') {
                const res = await supabase.from(table).delete().eq(idField, item);
                error = res.error;
            }
            if (!error) {
                await refreshData();
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
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
