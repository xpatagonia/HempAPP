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

  addProject: (p: Project) => void;
  updateProject: (p: Project) => void;
  
  addVariety: (v: Variety) => void;
  updateVariety: (v: Variety) => void;
  deleteVariety: (id: string) => void;

  addLocation: (l: Location) => void;
  updateLocation: (l: Location) => void;
  deleteLocation: (id: string) => void;
  
  addPlot: (p: Plot) => void;
  updatePlot: (p: Plot) => void;
  
  addTrialRecord: (r: TrialRecord) => void;
  updateTrialRecord: (r: TrialRecord) => void;
  deleteTrialRecord: (id: string) => void;
  
  addLog: (l: FieldLog) => void;
  
  addUser: (u: User) => void;
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

    // Función de seguridad: Si Supabase tarda más de 3 segundos, forzamos el modo rescate
    // Esto evita que la app se quede en blanco "Cargando..."
    const safetyTimeout = setTimeout(() => {
        if (loading && isMounted) {
            console.warn("Timeout de conexión: Activando Modo Rescate forzado.");
            setUsersList([RESCUE_USER]);
            setIsEmergencyMode(true);
            setLoading(false);
        }
    }, 3000);

    const initSystem = async () => {
        setLoading(true);
        try {
            // Intentamos obtener usuarios
            const { data: users, error: userError } = await supabase.from('users').select('*');
            
            if (!isMounted) return;

            if (userError || !users || users.length === 0) {
                console.warn("Base de datos vacía o error: Modo Rescate.");
                setUsersList([RESCUE_USER]);
                setIsEmergencyMode(true);
            } else {
                // Verificar si existe el usuario de rescate en la DB real, si no, agregarlo en memoria por si acaso
                setUsersList(users as User[]);
                setIsEmergencyMode(false);
            }

            // Cargar resto de datos sin bloquear
            await Promise.allSettled([
                supabase.from('projects').select('*').then(res => isMounted && res.data && setProjects(res.data as Project[])),
                supabase.from('varieties').select('*').then(res => isMounted && res.data && setVarieties(res.data as Variety[])),
                supabase.from('locations').select('*').then(res => isMounted && res.data && setLocations(res.data as Location[])),
                supabase.from('plots').select('*').then(res => isMounted && res.data && setPlots(res.data as Plot[])),
                supabase.from('trial_records').select('*').then(res => isMounted && res.data && setTrialRecords(res.data as TrialRecord[])),
                supabase.from('field_logs').select('*').then(res => isMounted && res.data && setLogs(res.data as FieldLog[])),
                supabase.from('tasks').select('*').then(res => isMounted && res.data && setTasks(res.data as Task[]))
            ]);

            // Restaurar sesión
            const savedUser = localStorage.getItem('ht_session_user');
            if (savedUser) {
                try {
                    const parsed = JSON.parse(savedUser);
                    // Permitir entrar si es el rescue user O si está en la lista descargada
                    const isValid = (parsed.email === RESCUE_USER.email) || 
                                    (users && users.some((u: any) => u.id === parsed.id));
                    
                    if (isValid) setCurrentUser(parsed);
                } catch (e) { localStorage.removeItem('ht_session_user'); }
            }

        } catch (err) {
            console.error("Error crítico en carga:", err);
            if(isMounted) {
                setUsersList([RESCUE_USER]);
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
    // Verificar contra la lista actual (que incluye el de rescate si falló la DB)
    const validUser = usersList.find(u => 
        u.email.toLowerCase().trim() === email.toLowerCase().trim() && 
        u.password === password
    );

    // Fallback explícito: si el usuario escribe las credenciales de rescate, dejarlo entrar siempre
    if (!validUser && email === RESCUE_USER.email && password === RESCUE_USER.password) {
        setCurrentUser(RESCUE_USER);
        localStorage.setItem('ht_session_user', JSON.stringify(RESCUE_USER));
        return true;
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

  // CRUD Functions (simplified)
  const addProject = async (p: Project) => { const { error } = await supabase.from('projects').insert([p]); if (!error) setProjects(prev => [...prev, p]); };
  const updateProject = async (p: Project) => { const { error } = await supabase.from('projects').update(p).eq('id', p.id); if (!error) setProjects(prev => prev.map(item => item.id === p.id ? p : item)); };
  
  const addVariety = async (v: Variety) => { const { error } = await supabase.from('varieties').insert([v]); if (!error) setVarieties(prev => [...prev, v]); };
  const updateVariety = async (v: Variety) => { const { error } = await supabase.from('varieties').update(v).eq('id', v.id); if (!error) setVarieties(prev => prev.map(item => item.id === v.id ? v : item)); };
  const deleteVariety = async (id: string) => { const { error } = await supabase.from('varieties').delete().eq('id', id); if (!error) setVarieties(prev => prev.filter(item => item.id !== id)); };

  const addLocation = async (l: Location) => { const { error } = await supabase.from('locations').insert([l]); if (!error) setLocations(prev => [...prev, l]); };
  const updateLocation = async (l: Location) => { const { error } = await supabase.from('locations').update(l).eq('id', l.id); if (!error) setLocations(prev => prev.map(item => item.id === l.id ? l : item)); };
  const deleteLocation = async (id: string) => { const { error } = await supabase.from('locations').delete().eq('id', id); if (!error) setLocations(prev => prev.filter(item => item.id !== id)); };

  const addPlot = async (p: Plot) => { const { error } = await supabase.from('plots').insert([p]); if (!error) setPlots(prev => [...prev, p]); };
  const updatePlot = async (p: Plot) => { const { error } = await supabase.from('plots').update(p).eq('id', p.id); if (!error) setPlots(prev => prev.map(item => item.id === p.id ? p : item)); };

  const addTrialRecord = async (r: TrialRecord) => { const { error } = await supabase.from('trial_records').insert([r]); if (!error) setTrialRecords(prev => [...prev, r]); };
  const updateTrialRecord = async (r: TrialRecord) => { const { error } = await supabase.from('trial_records').update(r).eq('id', r.id); if (!error) setTrialRecords(prev => prev.map(item => item.id === r.id ? r : item)); };
  const deleteTrialRecord = async (id: string) => { const { error } = await supabase.from('trial_records').delete().eq('id', id); if (!error) setTrialRecords(prev => prev.filter(item => item.id !== id)); };

  const addLog = async (l: FieldLog) => { const { error } = await supabase.from('field_logs').insert([l]); if (!error) setLogs(prev => [l, ...prev]); };

  const addUser = async (u: User) => { const { error } = await supabase.from('users').insert([u]); if (!error) setUsersList(prev => [...prev, u]); };
  const updateUser = async (u: User) => { const { error } = await supabase.from('users').update(u).eq('id', u.id); if (!error) setUsersList(prev => prev.map(item => item.id === u.id ? u : item)); };
  const deleteUser = async (id: string) => { const { error } = await supabase.from('users').delete().eq('id', id); if (!error) setUsersList(prev => prev.filter(item => item.id !== id)); };

  const addTask = async (t: Task) => { const { error } = await supabase.from('tasks').insert([t]); if (!error) setTasks(prev => [t, ...prev]); };
  const updateTask = async (t: Task) => { const { error } = await supabase.from('tasks').update(t).eq('id', t.id); if (!error) setTasks(prev => prev.map(item => item.id === t.id ? t : item)); };
  const deleteTask = async (id: string) => { const { error } = await supabase.from('tasks').delete().eq('id', id); if (!error) setTasks(prev => prev.filter(item => item.id !== id)); };

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