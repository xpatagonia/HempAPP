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

// Usuario de emergencia hardcodeado para garantizar acceso
const RESCUE_USER: User = {
    id: 'rescue-admin-001',
    name: 'Admin Sistema (Rescate)',
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
    const initSystem = async () => {
        setLoading(true);
        try {
            // Intentar cargar usuarios
            const { data: users, error: userError } = await supabase.from('users').select('*');
            
            if (userError || !users || users.length === 0) {
                console.warn("Modo Rescate Activado: No se encontraron usuarios o falló la conexión.");
                setUsersList([RESCUE_USER]);
                setIsEmergencyMode(true);
            } else {
                setUsersList(users as User[]);
                setIsEmergencyMode(false);
            }

            // Cargar resto de datos (sin bloquear si fallan)
            const p1 = supabase.from('projects').select('*').then(res => res.data && setProjects(res.data as Project[]));
            const p2 = supabase.from('varieties').select('*').then(res => res.data && setVarieties(res.data as Variety[]));
            const p3 = supabase.from('locations').select('*').then(res => res.data && setLocations(res.data as Location[]));
            const p4 = supabase.from('plots').select('*').then(res => res.data && setPlots(res.data as Plot[]));
            const p5 = supabase.from('trial_records').select('*').then(res => res.data && setTrialRecords(res.data as TrialRecord[]));
            const p6 = supabase.from('field_logs').select('*').then(res => res.data && setLogs(res.data as FieldLog[]));
            const p7 = supabase.from('tasks').select('*').then(res => res.data && setTasks(res.data as Task[]));

            await Promise.allSettled([p1, p2, p3, p4, p5, p6, p7]);

            // Restaurar sesión
            const savedUser = localStorage.getItem('ht_session_user');
            if (savedUser) {
                try {
                    const parsed = JSON.parse(savedUser);
                    // Permitir login si es el usuario de rescate o un usuario real
                    if (parsed.email === RESCUE_USER.email || (users && users.some((u: any) => u.id === parsed.id))) {
                        setCurrentUser(parsed);
                    }
                } catch (e) { localStorage.removeItem('ht_session_user'); }
            }

        } catch (err) {
            console.error("Error crítico:", err);
            // Fallback final
            setUsersList([RESCUE_USER]);
            setIsEmergencyMode(true);
        } finally {
            setLoading(false);
        }
    };

    initSystem();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Buscar en la lista (que puede tener el usuario de rescate)
    const validUser = usersList.find(u => 
        u.email.toLowerCase().trim() === email.toLowerCase().trim() && 
        u.password === password
    );

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

  // CRUD Functions (simplified wrappers)
  const addProject = async (p: Project) => {
      const { error } = await supabase.from('projects').insert([p]);
      if (!error) setProjects(prev => [...prev, p]);
  };
  const updateProject = async (p: Project) => {
      const { error } = await supabase.from('projects').update(p).eq('id', p.id);
      if (!error) setProjects(prev => prev.map(item => item.id === p.id ? p : item));
  };
  
  const addVariety = async (v: Variety) => {
      const { error } = await supabase.from('varieties').insert([v]);
      if (!error) setVarieties(prev => [...prev, v]);
  };
  const updateVariety = async (v: Variety) => {
      const { error } = await supabase.from('varieties').update(v).eq('id', v.id);
      if (!error) setVarieties(prev => prev.map(item => item.id === v.id ? v : item));
  };
  const deleteVariety = async (id: string) => {
      const { error } = await supabase.from('varieties').delete().eq('id', id);
      if (!error) setVarieties(prev => prev.filter(item => item.id !== id));
  };

  const addLocation = async (l: Location) => {
      const { error } = await supabase.from('locations').insert([l]);
      if (!error) setLocations(prev => [...prev, l]);
  };
  const updateLocation = async (l: Location) => {
      const { error } = await supabase.from('locations').update(l).eq('id', l.id);
      if (!error) setLocations(prev => prev.map(item => item.id === l.id ? l : item));
  };
  const deleteLocation = async (id: string) => {
      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (!error) setLocations(prev => prev.filter(item => item.id !== id));
  };

  const addPlot = async (p: Plot) => {
      const { error } = await supabase.from('plots').insert([p]);
      if (!error) setPlots(prev => [...prev, p]);
  };
  const updatePlot = async (p: Plot) => {
      const { error } = await supabase.from('plots').update(p).eq('id', p.id);
      if (!error) setPlots(prev => prev.map(item => item.id === p.id ? p : item));
  };

  const addTrialRecord = async (r: TrialRecord) => {
      const { error } = await supabase.from('trial_records').insert([r]);
      if (!error) setTrialRecords(prev => [...prev, r]);
  };
  const updateTrialRecord = async (r: TrialRecord) => {
      const { error } = await supabase.from('trial_records').update(r).eq('id', r.id);
      if (!error) setTrialRecords(prev => prev.map(item => item.id === r.id ? r : item));
  };
  const deleteTrialRecord = async (id: string) => {
      const { error } = await supabase.from('trial_records').delete().eq('id', id);
      if (!error) setTrialRecords(prev => prev.filter(item => item.id !== id));
  };

  const addLog = async (l: FieldLog) => {
      const { error } = await supabase.from('field_logs').insert([l]);
      if (!error) setLogs(prev => [l, ...prev]);
  };

  const addUser = async (u: User) => {
      const { error } = await supabase.from('users').insert([u]);
      if (!error) setUsersList(prev => [...prev, u]);
  };
  const updateUser = async (u: User) => {
      const { error } = await supabase.from('users').update(u).eq('id', u.id);
      if (!error) setUsersList(prev => prev.map(item => item.id === u.id ? u : item));
  };
  const deleteUser = async (id: string) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (!error) setUsersList(prev => prev.filter(item => item.id !== id));
  };

  const addTask = async (t: Task) => {
      const { error } = await supabase.from('tasks').insert([t]);
      if (!error) setTasks(prev => [t, ...prev]);
  };
  const updateTask = async (t: Task) => {
      const { error } = await supabase.from('tasks').update(t).eq('id', t.id);
      if (!error) setTasks(prev => prev.map(item => item.id === t.id ? t : item));
  };
  const deleteTask = async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (!error) setTasks(prev => prev.filter(item => item.id !== id));
  };

  const getPlotHistory = (plotId: string) => {
    return trialRecords
        .filter(r => r.plotId === plotId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getLatestRecord = (plotId: string) => {
      const history = getPlotHistory(plotId);
      return history.length > 0 ? history[0] : undefined;
  };

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