import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, checkConnection } from '../supabaseClient';
import { 
  User, Location, Plot, TrialRecord, Task, Project, Variety, 
  Client, Supplier, SeedBatch, SeedMovement, Resource, 
  StoragePoint, HydricRecord, FieldLog 
} from '../types';

interface AppContextType {
  // User & Auth
  currentUser: User | null;
  usersList: User[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  addUser: (user: User) => Promise<boolean>;
  updateUser: (user: User) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;

  // Theme & Branding
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  appName: string;
  appLogo: string;
  updateBranding: (name: string, logo: string) => void;

  // Domain Entities
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

  // System
  isRefreshing: boolean;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};

// Utility to convert snake_case (DB) to camelCase (App)
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

// Utility to convert camelCase (App) to snake_case (DB)
const toSnakeCase = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(v => toSnakeCase(v));
    if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            result[snakeKey] = toSnakeCase(obj[key]); // Recursively handle objects
            return result;
        }, {} as any);
    }
    return obj;
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
    // State definitions
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [theme, setTheme] = useState<'light'|'dark'>('light');
    const [appName, setAppName] = useState('HempC');
    const [appLogo, setAppLogo] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Data States
    const [usersList, setUsersList] = useState<User[]>([]);
    const [varieties, setVarieties] = useState<Variety[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [plots, setPlots] = useState<Plot[]>([]);
    const [trialRecords, setTrialRecords] = useState<TrialRecord[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [seedBatches, setSeedBatches] = useState<SeedBatch[]>([]);
    const [seedMovements, setSeedMovements] = useState<SeedMovement[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [storagePoints, setStoragePoints] = useState<StoragePoint[]>([]);
    const [hydricRecords, setHydricRecords] = useState<HydricRecord[]>([]);
    const [logs, setLogs] = useState<FieldLog[]>([]);

    // Effects for initial load and auth check
    useEffect(() => {
        const storedUser = localStorage.getItem('ht_session_user');
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        }
        
        // Initial data load
        refreshData();
        
        // Check theme
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
            document.documentElement.classList.add('dark');
        }
    }, []);

    // Refresh Data Function
    const refreshData = async () => {
        setIsRefreshing(true);
        try {
            // Check connection
            const connected = await checkConnection();
            if (connected) {
                const fetchTable = async (table: string, setter: any) => {
                    const { data } = await supabase.from(table).select('*');
                    if(data) setter(toCamelCase(data));
                };

                await Promise.all([
                    fetchTable('users', setUsersList),
                    fetchTable('varieties', setVarieties),
                    fetchTable('locations', setLocations),
                    fetchTable('plots', setPlots),
                    fetchTable('trial_records', setTrialRecords),
                    fetchTable('tasks', setTasks),
                    fetchTable('projects', setProjects),
                    fetchTable('clients', setClients),
                    fetchTable('suppliers', setSuppliers),
                    fetchTable('seed_batches', setSeedBatches),
                    fetchTable('seed_movements', setSeedMovements),
                    fetchTable('resources', setResources),
                    fetchTable('storage_points', setStoragePoints),
                    fetchTable('hydric_records', setHydricRecords),
                    fetchTable('field_logs', setLogs),
                ]);
            } else {
                console.warn("Using local data or no connection available");
            }
        } catch(e) {
            console.error("Data refresh failed", e);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Implement Login
    const login = async (email: string, password: string): Promise<boolean> => {
        // Credenciales Maestras
        if (email.toLowerCase() === 'admin@hempc.com.ar' && password === '@Admin130126@') {
            const rootUser: User = { 
                id: 'root-user', 
                name: 'Super Administrador (Master)', 
                email: 'admin@hempc.com.ar', 
                role: 'super_admin', 
                isNetworkMember: true, 
                jobTitle: 'Director de Sistema' 
            };
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
        
        // Fallback local users check
        const localUser = usersList.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (localUser) {
            setCurrentUser(localUser);
            localStorage.setItem('ht_session_user', JSON.stringify(localUser));
            return true;
        }
        return false;
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('ht_session_user');
    };

    const toggleTheme = () => {
        setTheme(prev => {
            const next = prev === 'light' ? 'dark' : 'light';
            document.documentElement.classList.toggle('dark', next === 'dark');
            return next;
        });
    };

    const updateBranding = (name: string, logo: string) => {
        setAppName(name);
        setAppLogo(logo);
    };

    // Generic CRUD Helper
    const crud = async (table: string, item: any, action: 'insert' | 'update' | 'delete', idField = 'id') => {
        try {
            // Remove helper fields for DB operation if necessary
            // For now assuming items are clean or we clean explicitly inside specific functions if complex
            let payload = item;
            if (action !== 'delete') {
                payload = toSnakeCase(item);
            } else {
                // For delete, item is the ID string
            }

            let error;
            
            if (action === 'insert') {
                const res = await supabase.from(table).insert([payload]);
                error = res.error;
            } else if (action === 'update') {
                const res = await supabase.from(table).update(payload).eq(idField, item[idField]);
                error = res.error;
            } else if (action === 'delete') {
                const res = await supabase.from(table).delete().eq(idField, item); // item is id here
                error = res.error;
            }

            if (!error) {
                await refreshData(); // Refresh all data to sync state
                return true;
            }
            console.error(`Supabase ${action} ${table} error:`, error);
            return false;
        } catch (e) {
            console.error(`CRUD ${action} ${table} exception:`, e);
            return false;
        }
    };

    const value: AppContextType = {
        currentUser, usersList, login, logout, 
        theme, toggleTheme, appName, appLogo, updateBranding,
        
        addUser: async (u) => crud('users', u, 'insert'),
        updateUser: async (u) => crud('users', u, 'update'),
        deleteUser: async (id) => crud('users', id, 'delete'),

        varieties,
        addVariety: async (v) => crud('varieties', v, 'insert'),
        updateVariety: async (v) => crud('varieties', v, 'update'),
        deleteVariety: async (id) => crud('varieties', id, 'delete'),

        locations,
        addLocation: async (l) => crud('locations', l, 'insert'),
        updateLocation: async (l) => crud('locations', l, 'update'),
        deleteLocation: async (id) => crud('locations', id, 'delete'),

        plots,
        addPlot: async (p) => crud('plots', p, 'insert'),
        updatePlot: async (p) => crud('plots', p, 'update'),
        deletePlot: async (id) => crud('plots', id, 'delete'),

        trialRecords,
        getPlotHistory: (pid) => trialRecords.filter(r => r.plotId === pid),
        getLatestRecord: (pid) => trialRecords.filter(r => r.plotId === pid).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0],
        addTrialRecord: async (r) => crud('trial_records', r, 'insert'),
        updateTrialRecord: async (r) => crud('trial_records', r, 'update'),
        deleteTrialRecord: async (id) => crud('trial_records', id, 'delete'),

        tasks,
        addTask: async (t) => crud('tasks', t, 'insert'),
        updateTask: async (t) => crud('tasks', t, 'update'),
        deleteTask: async (id) => crud('tasks', id, 'delete'),

        projects,
        addProject: async (p) => crud('projects', p, 'insert'),
        updateProject: async (p) => crud('projects', p, 'update'),
        deleteProject: async (id) => crud('projects', id, 'delete'),

        clients,
        addClient: async (c, tIds) => { 
            const success = await crud('clients', c, 'insert');
            // If we needed to handle team assignments, we would do it here
            return success; 
        },
        updateClient: async (c, tIds) => crud('clients', c, 'update'),
        deleteClient: async (id) => crud('clients', id, 'delete'),

        suppliers,
        addSupplier: async (s) => { const r = await crud('suppliers', s, 'insert'); return r ? s.id : null; },
        updateSupplier: async (s) => crud('suppliers', s, 'update'),
        deleteSupplier: async (id) => crud('suppliers', id, 'delete'),

        seedBatches,
        addSeedBatch: async (b) => crud('seed_batches', b, 'insert'),
        updateSeedBatch: async (b) => crud('seed_batches', b, 'update'),
        deleteSeedBatch: async (id) => crud('seed_batches', id, 'delete'),

        seedMovements,
        addSeedMovement: async (m) => crud('seed_movements', m, 'insert'),
        updateSeedMovement: async (m) => crud('seed_movements', m, 'update'),

        resources,
        addResource: async (r) => crud('resources', r, 'insert'),
        updateResource: async (r) => crud('resources', r, 'update'),
        deleteResource: async (id) => crud('resources', id, 'delete'),

        storagePoints,
        addStoragePoint: async (s) => crud('storage_points', s, 'insert'),
        updateStoragePoint: async (s) => crud('storage_points', s, 'update'),
        deleteStoragePoint: async (id) => crud('storage_points', id, 'delete'),

        hydricRecords,
        addHydricRecord: async (r) => crud('hydric_records', r, 'insert'),
        deleteHydricRecord: async (id) => crud('hydric_records', id, 'delete'),

        logs,
        addLog: async (l) => crud('field_logs', l, 'insert'),
        deleteLog: async (id) => crud('field_logs', id, 'delete'),

        isRefreshing,
        refreshData
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};