import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, checkConnection } from '../supabaseClient';
import { 
  User, Location, Plot, TrialRecord, Task, Project, Variety, 
  Client, Supplier, SeedBatch, SeedMovement, Resource, 
  StoragePoint, HydricRecord, FieldLog 
} from '../types';

interface AppContextType {
  currentUser: User | null;
  usersList: User[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  addUser: (user: User) => Promise<boolean>;
  updateUser: (user: User) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  appName: string;
  appLogo: string;
  updateBranding: (name: string, logo: string) => void;
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
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [theme, setTheme] = useState<'light'|'dark'>('light');
    const [appName, setAppName] = useState(localStorage.getItem('ht_app_name') || 'HempC');
    const [appLogo, setAppLogo] = useState(localStorage.getItem('ht_app_logo') || '');
    const [isRefreshing, setIsRefreshing] = useState(false);

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

    useEffect(() => {
        const storedUser = localStorage.getItem('ht_session_user');
        if (storedUser) setCurrentUser(JSON.parse(storedUser));
        refreshData();
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
            document.documentElement.classList.add('dark');
        }
    }, []);

    // Efecto para sincronizar metadatos del DOM con el Branding
    useEffect(() => {
        document.title = `${appName} | Nucleus Trace`;
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute('content', '#DDDB00');
    }, [appName]);

    const refreshData = async () => {
        setIsRefreshing(true);
        try {
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
            }
        } catch(e) {
            console.error("Data refresh failed", e);
        } finally {
            setIsRefreshing(false);
        }
    };

    const login = async (email: string, password: string): Promise<boolean> => {
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
        } catch (e) {}
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
        localStorage.setItem('ht_app_name', name);
        localStorage.setItem('ht_app_logo', logo);
    };

    const crud = async (table: string, item: any, action: 'insert' | 'update' | 'delete', idField = 'id') => {
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
            currentUser, usersList, login, logout, 
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
            suppliers, addSupplier: async (s) => { const r = await crud('suppliers', s, 'insert'); return r ? s.id : null; }, updateSupplier: (s) => crud('suppliers', s, 'update'), deleteSupplier: (id) => crud('suppliers', id, 'delete'),
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
