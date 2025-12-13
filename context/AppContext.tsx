import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Variety, Location, Plot, FieldLog, TrialRecord, User, Project, Task, SeedBatch, SeedMovement } from '../types';
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
  seedMovements: SeedMovement[]; // Nueva Entidad
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

  // Seed Batch & Movements CRUD
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

  // Global Config
  globalApiKey: string | null;
  refreshGlobalConfig: () => Promise<void>;

  // Theme support
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Usuario de emergencia GARANTIZADO
const RESCUE_USER: User = {
    id: 'rescue-admin-001',
    name: 'Admin Recuperación',
    email: 'admin@demo.com',
    password: 'admin',
    role: 'super_admin'
};

// Helpers para LocalStorage
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
  const [locations, setLocations] = useState<Location[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [trialRecords, setTrialRecords] = useState<TrialRecord[]>([]);
  const [logs, setLogs] = useState<FieldLog[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [seedBatches, setSeedBatches] = useState<SeedBatch[]>([]);
  const [seedMovements, setSeedMovements] = useState<SeedMovement[]>([]);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // AI Key Global
  const [globalApiKey, setGlobalApiKey] = useState<string | null>(null);

  // Theme Initialization
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

  // --- CALCULO DE NOTIFICACIONES ---
  const notifications = useMemo(() => {
    if (!currentUser) return [];
    const notifs: AppNotification[] = [];
    const today = new Date();

    // 1. Tareas Vencidas o Próximas (Solo asignadas o si es admin todas)
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

    // 2. Parcelas sin datos recientes (>15 días)
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
        // Intentar obtener la config global desde la tabla system_settings
        const { data, error } = await supabase.from('system_settings').select('gemini_api_key').eq('id', 'global').single();
        
        let keyToUse = null;

        if (!error && data?.gemini_api_key) {
            keyToUse = data.gemini_api_key;
        } else {
            // Fallback a localStorage o ENV
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

    const safetyTimeout = setTimeout(() => {
        if (loading && isMounted) {
            console.warn("Timeout de conexión: Activando Modo Híbrido.");
            // Si falla timeout, cargamos lo local
            setUsersList([...getFromLocal('users'), RESCUE_USER]);
            setProjects(getFromLocal('projects'));
            setVarieties(getFromLocal('varieties'));
            setLocations(getFromLocal('locations'));
            setPlots(getFromLocal('plots'));
            setSeedBatches(getFromLocal('seedBatches')); 
            setSeedMovements(getFromLocal('seedMovements')); // LOAD LOCAL
            setIsEmergencyMode(true);
            setLoading(false);
        }
    }, 2500);

    const initSystem = async () => {
        setLoading(true);
        try {
            await refreshGlobalConfig();

            // Cargar datos locales primero (para respuesta inmediata)
            const localUsers = getFromLocal('users');
            const localProjects = getFromLocal('projects');
            const localVarieties = getFromLocal('varieties');
            const localLocations = getFromLocal('locations');
            const localPlots = getFromLocal('plots');
            const localSeedBatches = getFromLocal('seedBatches');
            const localSeedMovements = getFromLocal('seedMovements');

            // Intentar Supabase
            const { data: dbUsers, error: userError } = await supabase.from('users').select('*');
            
            if (!isMounted) return;

            let finalUsers = [...localUsers];

            if (userError || !dbUsers || dbUsers.length === 0) {
                console.warn("Usando usuarios locales y de rescate.");
                if (!finalUsers.find((u: User) => u.email === RESCUE_USER.email)) {
                    finalUsers.push(RESCUE_USER);
                }
                setIsEmergencyMode(true);
            } else {
                // Merge DB users with Local users (avoid duplicates by ID)
                const dbIds = new Set(dbUsers.map((u: any) => u.id));
                const uniqueLocal = localUsers.filter((u: User) => !dbIds.has(u.id));
                finalUsers = [...(dbUsers as User[]), ...uniqueLocal];
                setIsEmergencyMode(false);
            }
            
            setUsersList(finalUsers);
            
            // Cargar resto (mezclando local y remoto si es necesario, simplificado aquí a remoto si existe)
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
                fetchOrLocal('varieties', setVarieties, localVarieties),
                fetchOrLocal('locations', setLocations, localLocations),
                fetchOrLocal('plots', setPlots, localPlots),
                fetchOrLocal('seed_batches', setSeedBatches, localSeedBatches),
                fetchOrLocal('seed_movements', setSeedMovements, localSeedMovements), // NEW FETCH
                supabase.from('trial_records').select('*').then(res => res.data && setTrialRecords(res.data as TrialRecord[])),
                supabase.from('field_logs').select('*').then(res => res.data && setLogs(res.data as FieldLog[])),
                supabase.from('tasks').select('*').then(res => res.data && setTasks(res.data as Task[]))
            ]);

            // Restaurar sesión
            const savedUser = localStorage.getItem('ht_session_user');
            if (savedUser) {
                try {
                    const parsed = JSON.parse(savedUser);
                    const isValid = finalUsers.some((u: User) => u.id === parsed.id) || parsed.email === RESCUE_USER.email;
                    if (isValid) setCurrentUser(parsed);
                } catch (e) { localStorage.removeItem('ht_session_user'); }
            }

        } catch (err) {
            console.error("Error crítico en carga:", err);
            // Fallback total
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
    const validUser = usersList.find(u => 
        u.email.toLowerCase().trim() === email.toLowerCase().trim() && 
        u.password === password
    );

    if (validUser) {
      setCurrentUser(validUser);
      localStorage.setItem('ht_session_user', JSON.stringify(validUser));
      return true;
    }
    // Fallback explícito para rescate si no está en la lista
    if (email === RESCUE_USER.email && password === RESCUE_USER.password) {
        setCurrentUser(RESCUE_USER);
        localStorage.setItem('ht_session_user', JSON.stringify(RESCUE_USER));
        return true;
    }

    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ht_session_user');
  };

  // --- CRUD WRAPPERS ---

  const addUser = async (u: User): Promise<boolean> => {
      const { error } = await supabase.from('users').insert([u]);
      setUsersList(prev => {
          const newList = [...prev, u];
          saveToLocal('users', newList.filter(user => user.id !== RESCUE_USER.id));
          return newList;
      });
      return true; 
  };
  
  const updateUser = async (u: User) => {
      await supabase.from('users').update(u).eq('id', u.id);
      setUsersList(prev => {
          const newList = prev.map(item => item.id === u.id ? u : item);
          saveToLocal('users', newList.filter(user => user.id !== RESCUE_USER.id));
          return newList;
      });
  };
  
  const deleteUser = async (id: string) => {
      await supabase.from('users').delete().eq('id', id);
      setUsersList(prev => {
          const newList = prev.filter(item => item.id !== id);
          saveToLocal('users', newList.filter(user => user.id !== RESCUE_USER.id));
          return newList;
      });
  };

  const addProject = async (p: Project): Promise<boolean> => {
      const { error } = await supabase.from('projects').insert([p]);
      setProjects(prev => { const n = [...prev, p]; saveToLocal('projects', n); return n; });
      return !error;
  };
  const updateProject = async (p: Project) => {
      await supabase.from('projects').update(p).eq('id', p.id);
      setProjects(prev => { const n = prev.map(item => item.id === p.id ? p : item); saveToLocal('projects', n); return n; });
  };
  const deleteProject = async (id: string) => {
      await supabase.from('projects').delete().eq('id', id);
      setProjects(prev => { const n = prev.filter(item => item.id !== id); saveToLocal('projects', n); return n; });
  };

  const addVariety = async (v: Variety) => { 
      await supabase.from('varieties').insert([v]); 
      setVarieties(prev => { const n = [...prev, v]; saveToLocal('varieties', n); return n; }); 
  };
  const updateVariety = async (v: Variety) => { 
      await supabase.from('varieties').update(v).eq('id', v.id); 
      setVarieties(prev => { const n = prev.map(item => item.id === v.id ? v : item); saveToLocal('varieties', n); return n; }); 
  };
  const deleteVariety = async (id: string) => { 
      await supabase.from('varieties').delete().eq('id', id); 
      setVarieties(prev => { const n = prev.filter(item => item.id !== id); saveToLocal('varieties', n); return n; }); 
  };

  const addLocation = async (l: Location) => { 
      await supabase.from('locations').insert([l]); 
      setLocations(prev => { const n = [...prev, l]; saveToLocal('locations', n); return n; }); 
  };
  const updateLocation = async (l: Location) => { 
      await supabase.from('locations').update(l).eq('id', l.id); 
      setLocations(prev => { const n = prev.map(item => item.id === l.id ? l : item); saveToLocal('locations', n); return n; }); 
  };
  const deleteLocation = async (id: string) => { 
      await supabase.from('locations').delete().eq('id', id); 
      setLocations(prev => { const n = prev.filter(item => item.id !== id); saveToLocal('locations', n); return n; }); 
  };

  const addPlot = async (p: Plot) => { 
      await supabase.from('plots').insert([p]); 
      setPlots(prev => { const n = [...prev, p]; saveToLocal('plots', n); return n; }); 
  };
  const updatePlot = async (p: Plot) => { 
      await supabase.from('plots').update(p).eq('id', p.id); 
      setPlots(prev => { const n = prev.map(item => item.id === p.id ? p : item); saveToLocal('plots', n); return n; }); 
  };
  const deletePlot = async (id: string) => {
      await supabase.from('plots').delete().eq('id', id);
      setPlots(prev => { const n = prev.filter(item => item.id !== id); saveToLocal('plots', n); return n; });
  };

  // Seed Batch CRUD
  const addSeedBatch = async (s: SeedBatch) => {
      await supabase.from('seed_batches').insert([s]);
      setSeedBatches(prev => { const n = [...prev, s]; saveToLocal('seedBatches', n); return n; });
  };
  const updateSeedBatch = async (s: SeedBatch) => {
      await supabase.from('seed_batches').update(s).eq('id', s.id);
      setSeedBatches(prev => { const n = prev.map(item => item.id === s.id ? s : item); saveToLocal('seedBatches', n); return n; });
  };
  const deleteSeedBatch = async (id: string) => {
      await supabase.from('seed_batches').delete().eq('id', id);
      setSeedBatches(prev => { const n = prev.filter(item => item.id !== id); saveToLocal('seedBatches', n); return n; });
  };

  // Seed Movements CRUD
  const addSeedMovement = async (m: SeedMovement) => {
      await supabase.from('seed_movements').insert([m]);
      setSeedMovements(prev => { const n = [m, ...prev]; saveToLocal('seedMovements', n); return n; }); // Newest first
  };
  const updateSeedMovement = async (m: SeedMovement) => {
      await supabase.from('seed_movements').update(m).eq('id', m.id);
      setSeedMovements(prev => { const n = prev.map(item => item.id === m.id ? m : item); saveToLocal('seedMovements', n); return n; });
  };
  const deleteSeedMovement = async (id: string) => {
      await supabase.from('seed_movements').delete().eq('id', id);
      setSeedMovements(prev => { const n = prev.filter(item => item.id !== id); saveToLocal('seedMovements', n); return n; });
  };

  const addTrialRecord = async (r: TrialRecord) => { const { error } = await supabase.from('trial_records').insert([r]); if (!error || true) setTrialRecords(prev => [...prev, r]); };
  const updateTrialRecord = async (r: TrialRecord) => { const { error } = await supabase.from('trial_records').update(r).eq('id', r.id); if (!error || true) setTrialRecords(prev => prev.map(item => item.id === r.id ? r : item)); };
  const deleteTrialRecord = async (id: string) => { const { error } = await supabase.from('trial_records').delete().eq('id', id); if (!error || true) setTrialRecords(prev => prev.filter(item => item.id !== id)); };

  const addLog = async (l: FieldLog) => { const { error } = await supabase.from('field_logs').insert([l]); if (!error || true) setLogs(prev => [l, ...prev]); };

  const addTask = async (t: Task) => { const { error } = await supabase.from('tasks').insert([t]); if (!error || true) setTasks(prev => [t, ...prev]); };
  const updateTask = async (t: Task) => { const { error } = await supabase.from('tasks').update(t).eq('id', t.id); if (!error || true) setTasks(prev => prev.map(item => item.id === t.id ? t : item)); };
  const deleteTask = async (id: string) => { const { error } = await supabase.from('tasks').delete().eq('id', id); if (!error || true) setTasks(prev => prev.filter(item => item.id !== id)); };

  const getPlotHistory = (plotId: string) => { return trialRecords.filter(r => r.plotId === plotId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); };
  const getLatestRecord = (plotId: string) => { const history = getPlotHistory(plotId); return history.length > 0 ? history[0] : undefined; };

  return (
    <AppContext.Provider value={{
      projects, varieties, locations, plots, trialRecords, logs, tasks, seedBatches, seedMovements, notifications,
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
      addSeedMovement, updateSeedMovement, deleteSeedMovement, // New Exports
      getPlotHistory, getLatestRecord,
      loading, isEmergencyMode,
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