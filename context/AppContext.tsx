
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Variety, Location, Plot, FieldLog, TrialRecord, User, Project, Task, SeedBatch, SeedMovement, Supplier, Client, Resource, StoragePoint } from '../types';
import { supabase } from '../supabaseClient';

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
  storagePoints: StoragePoint[]; // NUEVO
  notifications: AppNotification[]; 
  
  currentUser: User | null;
  usersList: User[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;

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

  addStoragePoint: (s: StoragePoint) => void; // NUEVO
  updateStoragePoint: (s: StoragePoint) => void; // NUEVO
  deleteStoragePoint: (id: string) => void; // NUEVO

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
  updateSeedBatch: (s: SeedBatch) => void;
  deleteSeedBatch: (id: string) => void;
  
  addSeedMovement: (m: SeedMovement) => void;
  updateSeedMovement: (m: SeedMovement) => void;
  deleteSeedMovement: (id: string) => void;

  getPlotHistory: (plotId: string) => TrialRecord[];
  getLatestRecord: (plotId: string) => TrialRecord | undefined;
  
  loading: boolean;
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
    name: 'Admin Recuperación',
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
  const [storagePoints, setStoragePoints] = useState<StoragePoint[]>([]); // NUEVO
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [dbNeedsMigration, setDbNeedsMigration] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [globalApiKey, setGlobalApiKey] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('ht_theme') as 'light' | 'dark';
    if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        }
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
        document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem('ht_theme', newTheme);
      if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  };

  const notifications = useMemo(() => {
    if (!currentUser) return [];
    const notifs: AppNotification[] = [];
    const today = new Date();

    tasks.forEach(t => {
        if (t.status === 'Completada') return;
        const isAssigned = t.assignedToIds.includes(currentUser.id) || currentUser.role === 'admin' || currentUser.role === 'super_admin';
        if (!isAssigned) return;

        const dueDate = new Date(t.dueDate);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            notifs.push({
                id: `task-overdue-${t.id}`,
                type: 'alert',
                title: 'Tarea Vencida',
                message: `"${t.title}" venció hace ${Math.abs(diffDays)} días.`,
                link: '/tasks',
                date: t.dueDate
            });
        } else if (diffDays <= 2) {
            notifs.push({
                id: `task-soon-${t.id}`,
                type: 'warning',
                title: 'Tarea Próxima',
                message: `"${t.title}" vence pronto.`,
                link: '/tasks',
                date: t.dueDate
            });
        }
    });

    if (currentUser.role !== 'viewer') {
        plots.filter(p => p.status === 'Activa').forEach(p => {
             const isAssigned = p.responsibleIds?.includes(currentUser.id) || currentUser.role === 'admin' || currentUser.role === 'super_admin';
             if (!isAssigned) return;

             const history = trialRecords.filter(r => r.plotId === p.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
             const lastDate = history.length > 0 ? new Date(history[0].date) : new Date(p.sowingDate);
             
             const daysSinceUpdate = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
             
             if (daysSinceUpdate > 15) {
                 notifs.push({
                     id: `plot-stale-${p.id}`,
                     type: 'info',
                     title: 'Datos Desactualizados',
                     message: `Parcela ${p.name} sin registros hace ${daysSinceUpdate} días.`,
                     link: `/plots/${p.id}`,
                     date: new Date().toISOString().split('T')[0]
                 });
             }
        });
    }

    return notifs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tasks, plots, trialRecords, currentUser]);

  const refreshGlobalConfig = async () => {
    try {
        const { data, error } = await supabase.from('system_settings').select('gemini_api_key').eq('id', 'global').single();
        let keyToUse = null;
        if (!error && data?.gemini_api_key) {
            keyToUse = data.gemini_api_key;
        } else {
            keyToUse = localStorage.getItem('hemp_ai_key') || (import.meta as any).env.VITE_GEMINI_API_KEY || null;
        }
        setGlobalApiKey(keyToUse);
    } catch (e) {
        console.warn("No se pudo cargar configuración global. Usando local.");
        setGlobalApiKey(localStorage.getItem('hemp_ai_key'));
    }
  };

  useEffect(() => {
    let isMounted = true;

    // INCREASED TIMEOUT FOR MOBILE NETWORKS (8 seconds)
    const safetyTimeout = setTimeout(() => {
        if (loading && isMounted) {
            console.warn("Timeout: Activando Modo Híbrido por conexión lenta.");
            setUsersList([...getFromLocal('users'), RESCUE_USER]);
            setProjects(getFromLocal('projects'));
            setVarieties(getFromLocal('varieties'));
            setSuppliers(getFromLocal('suppliers'));
            setClients(getFromLocal('clients'));
            setLocations(getFromLocal('locations'));
            setPlots(getFromLocal('plots'));
            setSeedBatches(getFromLocal('seedBatches')); 
            setSeedMovements(getFromLocal('seedMovements'));
            setResources(getFromLocal('resources')); // Load Local Resources
            setStoragePoints(getFromLocal('storagePoints')); // NUEVO
            setIsEmergencyMode(true);
            setLoading(false);
        }
    }, 8000); 

    const initSystem = async () => {
        setLoading(true);
        try {
            await refreshGlobalConfig();

            // CHECK MIGRATION STATUS
            const { error: checkError } = await supabase.from('suppliers').select('id').limit(1);
            if (checkError && (checkError.code === '42P01' || checkError.message.includes('does not exist'))) {
                setDbNeedsMigration(true);
            } else {
                setDbNeedsMigration(false);
            }

            const localUsers = getFromLocal('users');
            const localProjects = getFromLocal('projects');
            const localVarieties = getFromLocal('varieties');
            const localSuppliers = getFromLocal('suppliers');
            const localClients = getFromLocal('clients');
            const localLocations = getFromLocal('locations');
            const localPlots = getFromLocal('plots');
            const localSeedBatches = getFromLocal('seedBatches');
            const localSeedMovements = getFromLocal('seedMovements');
            const localResources = getFromLocal('resources');
            const localStoragePoints = getFromLocal('storagePoints'); // NUEVO

            // ATTEMPT TO FETCH USERS (ROBUST STRATEGY)
            let dbUsers: any[] | null = null;
            let userError: any = null;
            
            try {
                // Try 1: Fetch ALL columns (Ideal)
                const resFull = await supabase.from('users').select('*');
                if (resFull.error) throw resFull.error;
                dbUsers = resFull.data;
            } catch (err: any) {
                console.warn("Full user fetch failed (Schema Issue?):", err.message);
                
                // Try 2: Fetch ONLY basic columns (Legacy compatibility) if schema cache is broken
                if (err.code === 'PGRST204' || err.message?.includes('column') || err.message?.includes('schema')) {
                    console.log("Attempting fallback fetch for users...");
                    try {
                        const resBasic = await supabase.from('users').select('id, name, email, password, role');
                        if (!resBasic.error) {
                            dbUsers = resBasic.data;
                            setDbNeedsMigration(true); // Flag that we are missing columns but app is running
                        } else {
                            throw resBasic.error;
                        }
                    } catch (e) {
                        userError = e;
                    }
                } else {
                    userError = err;
                }
            }
            
            if (!isMounted) return;

            let finalUsers = [...localUsers];

            if (userError || !dbUsers) {
                console.warn("Error crítico cargando usuarios. Usando rescate.", userError);
                if (!finalUsers.find((u: User) => u.email === RESCUE_USER.email)) {
                    finalUsers.push(RESCUE_USER);
                }
                setIsEmergencyMode(true);
            } else {
                const dbIds = new Set(dbUsers.map((u: any) => u.id));
                const uniqueLocal = localUsers.filter((u: User) => !dbIds.has(u.id));
                finalUsers = [...(dbUsers as User[]), ...uniqueLocal];
                // Do not force emergency false if dbNeedsMigration is true
            }
            
            setUsersList(finalUsers);
            
            const fetchOrLocal = async (table: string, setter: any, localData: any[]) => {
                 const { data, error } = await supabase.from(table).select('*');
                 if (!error && data) {
                     setter([...data, ...localData.filter((l: any) => !data.find((d: any) => d.id === l.id))]);
                 } else {
                     setter(localData);
                 }
            };

            await Promise.allSettled([
                fetchOrLocal('projects', setProjects, localProjects),
                fetchOrLocal('suppliers', setSuppliers, localSuppliers),
                fetchOrLocal('clients', setClients, localClients), 
                fetchOrLocal('varieties', setVarieties, localVarieties),
                fetchOrLocal('locations', setLocations, localLocations),
                fetchOrLocal('plots', setPlots, localPlots),
                fetchOrLocal('seed_batches', setSeedBatches, localSeedBatches),
                fetchOrLocal('seed_movements', setSeedMovements, localSeedMovements),
                fetchOrLocal('resources', setResources, localResources), 
                fetchOrLocal('storage_points', setStoragePoints, localStoragePoints), // NUEVO
                supabase.from('trial_records').select('*').then(res => res.data && setTrialRecords(res.data as TrialRecord[])),
                supabase.from('field_logs').select('*').then(res => res.data && setLogs(res.data as FieldLog[])),
                supabase.from('tasks').select('*').then(res => res.data && setTasks(res.data as Task[]))
            ]);

            const savedUser = localStorage.getItem('ht_session_user');
            if (savedUser) {
                try {
                    const parsed = JSON.parse(savedUser);
                    const isValid = finalUsers.some((u: User) => u.id === parsed.id) || parsed.email === RESCUE_USER.email;
                    
                    if (isValid) {
                        setCurrentUser(parsed);
                    } else {
                        // Fallback check
                        const { data: directUser } = await supabase.from('users').select('id, name, email, role').eq('id', parsed.id).single();
                        if (directUser) {
                            setCurrentUser(directUser as User);
                        }
                    }
                } catch (e) { localStorage.removeItem('ht_session_user'); }
            }

        } catch (err) {
            console.error("Error crítico en carga general:", err);
            if(isMounted) {
                setUsersList([...getFromLocal('users'), RESCUE_USER]);
                setIsEmergencyMode(true);
            }
        } finally {
            if(isMounted) {
                clearTimeout(safetyTimeout);
                setLoading(false);
            }
        }
    };

    initSystem();
    return () => { isMounted = false; };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // 1. Intentar con lista en memoria (rápido)
    let validUser = usersList.find(u => 
        u.email.toLowerCase().trim() === email.toLowerCase().trim() && 
        u.password === password
    );

    // 2. Si no está en memoria, forzar consulta a la base de datos (seguro)
    if (!validUser) {
        try {
            // Intenta seleccionar solo columnas básicas para evitar PGRST204 en login si el schema está roto
            // Esto permite que el login funcione incluso si faltan las columnas nuevas (jobTitle, etc)
            const { data, error } = await supabase.from('users')
                .select('id, name, email, password, role') 
                .eq('email', email.toLowerCase().trim())
                .eq('password', password)
                .single();
            
            if (data && !error) {
                validUser = data as User;
                setUsersList(prev => [...prev, validUser as User]);
            }
        } catch (e) {
            console.error("Login DB check failed", e);
        }
    }

    // 3. Chequeo Admin Rescate
    if (!validUser && email === RESCUE_USER.email && password === RESCUE_USER.password) {
        validUser = RESCUE_USER;
    }

    if (validUser) {
      setCurrentUser(validUser);
      localStorage.setItem('ht_session_user', JSON.stringify(validUser));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ht_session_user');
  };

  const addUser = async (u: User): Promise<boolean> => {
      const { error } = await supabase.from('users').insert([u]);
      if (error) {
          console.error("Error creando usuario:", error);
          alert(`Error Base de Datos: ${error.message} (Código: ${error.code})`);
          if(isEmergencyMode) {
             setUsersList(prev => { const newList = [...prev, u]; saveToLocal('users', newList.filter(user => user.id !== RESCUE_USER.id)); return newList; });
             return true;
          }
          return false;
      }
      setUsersList(prev => { const newList = [...prev, u]; saveToLocal('users', newList.filter(user => user.id !== RESCUE_USER.id)); return newList; });
      return true; 
  };
  const updateUser = async (u: User) => {
      await supabase.from('users').update(u).eq('id', u.id);
      setUsersList(prev => { const newList = prev.map(item => item.id === u.id ? u : item); saveToLocal('users', newList.filter(user => user.id !== RESCUE_USER.id)); return newList; });
  };
  const deleteUser = async (id: string) => {
      await supabase.from('users').delete().eq('id', id);
      setUsersList(prev => { const newList = prev.filter(item => item.id !== id); saveToLocal('users', newList.filter(user => user.id !== RESCUE_USER.id)); return newList; });
  };

  const addSupplier = async (s: Supplier) => { await supabase.from('suppliers').insert([s]); setSuppliers(prev => { const n = [...prev, s]; saveToLocal('suppliers', n); return n; }); return s.id; };
  const updateSupplier = async (s: Supplier) => { await supabase.from('suppliers').update(s).eq('id', s.id); setSuppliers(prev => { const n = prev.map(item => item.id === s.id ? s : item); saveToLocal('suppliers', n); return n; }); };
  const deleteSupplier = async (id: string) => { await supabase.from('suppliers').delete().eq('id', id); setSuppliers(prev => { const n = prev.filter(item => item.id !== id); saveToLocal('suppliers', n); return n; }); };

  const addClient = async (c: Client) => { await supabase.from('clients').insert([c]); setClients(prev => { const n = [...prev, c]; saveToLocal('clients', n); return n; }); };
  const updateClient = async (c: Client) => { await supabase.from('clients').update(c).eq('id', c.id); setClients(prev => { const n = prev.map(item => item.id === c.id ? c : item); saveToLocal('clients', n); return n; }); };
  const deleteClient = async (id: string) => { await supabase.from('clients').delete().eq('id', id); setClients(prev => { const n = prev.filter(item => item.id !== id); saveToLocal('clients', n); return n; }); };

  const addResource = async (r: Resource) => { await supabase.from('resources').insert([r]); setResources(prev => { const n = [...prev, r]; saveToLocal('resources', n); return n; }); };
  const updateResource = async (r: Resource) => { await supabase.from('resources').update(r).eq('id', r.id); setResources(prev => { const n = prev.map(item => item.id === r.id ? r : item); saveToLocal('resources', n); return n; }); };
  const deleteResource = async (id: string) => { await supabase.from('resources').delete().eq('id', id); setResources(prev => { const n = prev.filter(item => item.id !== id); saveToLocal('resources', n); return n; }); };

  const addStoragePoint = async (s: StoragePoint) => { await supabase.from('storage_points').insert([s]); setStoragePoints(prev => { const n = [...prev, s]; saveToLocal('storagePoints', n); return n; }); };
  const updateStoragePoint = async (s: StoragePoint) => { await supabase.from('storage_points').update(s).eq('id', s.id); setStoragePoints(prev => { const n = prev.map(item => item.id === s.id ? s : item); saveToLocal('storagePoints', n); return n; }); };
  const deleteStoragePoint = async (id: string) => { await supabase.from('storage_points').delete().eq('id', id); setStoragePoints(prev => { const n = prev.filter(item => item.id !== id); saveToLocal('storagePoints', n); return n; }); };

  const addProject = async (p: Project): Promise<boolean> => { const { error } = await supabase.from('projects').insert([p]); setProjects(prev => { const n = [...prev, p]; saveToLocal('projects', n); return n; }); return !error; };
  const updateProject = async (p: Project) => { await supabase.from('projects').update(p).eq('id', p.id); setProjects(prev => { const n = prev.map(item => item.id === p.id ? p : item); saveToLocal('projects', n); return n; }); };
  const deleteProject = async (id: string) => { await supabase.from('projects').delete().eq('id', id); setProjects(prev => { const n = prev.filter(item => item.id !== id); saveToLocal('projects', n); return n; }); };

  const addVariety = async (v: Variety) => { await supabase.from('varieties').insert([v]); setVarieties(prev => { const n = [...prev, v]; saveToLocal('varieties', n); return n; }); };
  const updateVariety = async (v: Variety) => { await supabase.from('varieties').update(v).eq('id', v.id); setVarieties(prev => { const n = prev.map(item => item.id === v.id ? v : item); saveToLocal('varieties', n); return n; }); };
  const deleteVariety = async (id: string) => { await supabase.from('varieties').delete().eq('id', id); setVarieties(prev => { const n = prev.filter(item => item.id !== id); saveToLocal('varieties', n); return n; }); };

  const addLocation = async (l: Location) => { await supabase.from('locations').insert([l]); setLocations(prev => { const n = [...prev, l]; saveToLocal('locations', n); return n; }); };
  const updateLocation = async (l: Location) => { await supabase.from('locations').update(l).eq('id', l.id); setLocations(prev => { const n = prev.map(item => item.id === l.id ? l : item); saveToLocal('locations', n); return n; }); };
  const deleteLocation = async (id: string) => { await supabase.from('locations').delete().eq('id', id); setLocations(prev => { const n = prev.filter(item => item.id !== id); saveToLocal('locations', n); return n; }); };

  const addPlot = async (p: Plot) => { await supabase.from('plots').insert([p]); setPlots(prev => { const n = [...prev, p]; saveToLocal('plots', n); return n; }); };
  const updatePlot = async (p: Plot) => { await supabase.from('plots').update(p).eq('id', p.id); setPlots(prev => { const n = prev.map(item => item.id === p.id ? p : item); saveToLocal('plots', n); return n; }); };
  const deletePlot = async (id: string) => { await supabase.from('plots').delete().eq('id', id); setPlots(prev => { const n = prev.filter(item => item.id !== id); saveToLocal('plots', n); return n; }); };

  const addSeedBatch = async (s: SeedBatch) => { await supabase.from('seed_batches').insert([s]); setSeedBatches(prev => { const n = [...prev, s]; saveToLocal('seedBatches', n); return n; }); };
  const updateSeedBatch = async (s: SeedBatch) => { await supabase.from('seed_batches').update(s).eq('id', s.id); setSeedBatches(prev => { const n = prev.map(item => item.id === s.id ? s : item); saveToLocal('seedBatches', n); return n; }); };
  const deleteSeedBatch = async (id: string) => { await supabase.from('seed_batches').delete().eq('id', id); setSeedBatches(prev => { const n = prev.filter(item => item.id !== id); saveToLocal('seedBatches', n); return n; }); };

  const addSeedMovement = async (m: SeedMovement) => { await supabase.from('seed_movements').insert([m]); setSeedMovements(prev => { const n = [m, ...prev]; saveToLocal('seedMovements', n); return n; }); };
  const updateSeedMovement = async (m: SeedMovement) => { await supabase.from('seed_movements').update(m).eq('id', m.id); setSeedMovements(prev => { const n = prev.map(item => item.id === m.id ? m : item); saveToLocal('seedMovements', n); return n; }); };
  const deleteSeedMovement = async (id: string) => { await supabase.from('seed_movements').delete().eq('id', id); setSeedMovements(prev => { const n = prev.filter(item => item.id !== id); saveToLocal('seedMovements', n); return n; }); };

  const addTrialRecord = async (r: TrialRecord) => { await supabase.from('trial_records').insert([r]); setTrialRecords(prev => [...prev, r]); };
  const updateTrialRecord = async (r: TrialRecord) => { await supabase.from('trial_records').update(r).eq('id', r.id); setTrialRecords(prev => prev.map(item => item.id === r.id ? r : item)); };
  const deleteTrialRecord = async (id: string) => { await supabase.from('trial_records').delete().eq('id', id); setTrialRecords(prev => prev.filter(item => item.id !== id)); };

  const addLog = async (l: FieldLog) => { await supabase.from('field_logs').insert([l]); setLogs(prev => [l, ...prev]); };

  const addTask = async (t: Task) => { await supabase.from('tasks').insert([t]); setTasks(prev => [t, ...prev]); };
  const updateTask = async (t: Task) => { await supabase.from('tasks').update(t).eq('id', t.id); setTasks(prev => prev.map(item => item.id === t.id ? t : item)); };
  const deleteTask = async (id: string) => { await supabase.from('tasks').delete().eq('id', id); setTasks(prev => prev.filter(item => item.id !== id)); };

  const getPlotHistory = (plotId: string) => { return trialRecords.filter(r => r.plotId === plotId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); };
  const getLatestRecord = (plotId: string) => { const history = getPlotHistory(plotId); return history.length > 0 ? history[0] : undefined; };

  return (
    <AppContext.Provider value={{
      projects, varieties, locations, plots, trialRecords, logs, tasks, seedBatches, seedMovements, suppliers, clients, resources, storagePoints, notifications,
      currentUser, usersList, login, logout,
      addProject, updateProject, deleteProject,
      addVariety, updateVariety, deleteVariety,
      addLocation, updateLocation, deleteLocation,
      addPlot, updatePlot, deletePlot,
      addTrialRecord, updateTrialRecord, deleteTrialRecord,
      addLog,
      addUser, updateUser, deleteUser,
      addTask, updateTask, deleteTask,
      addSeedBatch, updateSeedBatch, deleteSeedBatch,
      addSeedMovement, updateSeedMovement, deleteSeedMovement,
      addSupplier, updateSupplier, deleteSupplier,
      addClient, updateClient, deleteClient,
      addResource, updateResource, deleteResource,
      addStoragePoint, updateStoragePoint, deleteStoragePoint,
      getPlotHistory, getLatestRecord,
      loading, isEmergencyMode, dbNeedsMigration,
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
