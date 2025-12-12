import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Variety, Location, Plot, FieldLog, TrialRecord, User, Project, Task } from '../types';
import { supabase } from '../supabaseClient';

interface AppContextType {
  projects: Project[];
  varieties: Variety[];
  locations: Location[];
  plots: Plot[];
  trialRecords: TrialRecord[];
  logs: FieldLog[];
  tasks: Task[];
  
  currentUser: User | null;
  usersList: User[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;

  addProject: (p: Project) => Promise<boolean>;
  updateProject: (p: Project) => void;
  
  addVariety: (v: Variety) => void;
  updateVariety: (v: Variety) => void;
  deleteVariety: (id: string) => void;

  addLocation: (l: Location) => void;
  updateLocation: (l: Location) => void;
  deleteLocation: (id: string) => void;
  
  addPlot: (p: Plot) => Promise<void>;
  updatePlot: (p: Plot) => void;
  
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
  
  getPlotHistory: (plotId: string) => TrialRecord[];
  getLatestRecord: (plotId: string) => TrialRecord | undefined;
  
  loading: boolean;
  isEmergencyMode: boolean;
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
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);

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
            setIsEmergencyMode(true);
            setLoading(false);
        }
    }, 2500);

    const initSystem = async () => {
        setLoading(true);
        try {
            // Cargar datos locales primero (para respuesta inmediata)
            const localUsers = getFromLocal('users');
            const localProjects = getFromLocal('projects');
            const localVarieties = getFromLocal('varieties');
            const localLocations = getFromLocal('locations');
            const localPlots = getFromLocal('plots');

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

  // --- CRUD WRAPPERS CON FALLBACK A LOCALSTORAGE ---

  const addUser = async (u: User): Promise<boolean> => {
      // 1. Intentar Supabase
      const { error } = await supabase.from('users').insert([u]);
      
      // 2. Siempre actualizar estado local (Optimistic UI / Offline Mode)
      setUsersList(prev => {
          const newList = [...prev, u];
          saveToLocal('users', newList.filter(user => user.id !== RESCUE_USER.id)); // No guardar rescate user
          return newList;
      });

      if (error) {
          console.warn("Supabase falló, usuario guardado localmente:", error.message);
      }
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

  // Generic patterns applied to other critical entities for setup
  const addProject = async (p: Project): Promise<boolean> => {
      const { error } = await supabase.from('projects').insert([p]);
      setProjects(prev => { const n = [...prev, p]; saveToLocal('projects', n); return n; });
      return !error;
  };
  const updateProject = async (p: Project) => {
      await supabase.from('projects').update(p).eq('id', p.id);
      setProjects(prev => { const n = prev.map(item => item.id === p.id ? p : item); saveToLocal('projects', n); return n; });
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

  // Non-critical data (Trial Records, Logs, Tasks) - Keep simpler for now, but update state optimistically
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
      projects, varieties, locations, plots, trialRecords, logs, tasks,
      currentUser, usersList, login, logout,
      addProject, updateProject,
      addVariety, updateVariety, deleteVariety,
      addLocation, updateLocation, deleteLocation,
      addPlot, updatePlot,
      addTrialRecord, updateTrialRecord, deleteTrialRecord,
      addLog,
      addUser, updateUser, deleteUser,
      addTask, updateTask, deleteTask,
      getPlotHistory, getLatestRecord,
      loading, isEmergencyMode
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