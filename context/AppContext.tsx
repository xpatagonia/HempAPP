import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Variety, Location, Plot, FieldLog, TrialRecord, User, Project, Task } from '../types';
import { supabase } from '../supabaseClient'; // Importamos el cliente real

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
  login: (email: string, password: string) => Promise<boolean>; // Ahora es async
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
}

// DATOS DEMO PARA INICIO SIN DB
const DEMO_USERS: User[] = [
  { id: '1', name: 'Super Admin', email: 'root@hempc.com.ar', password: 'admin', role: 'super_admin' },
  { id: '2', name: 'Administrador', email: 'admin@hempc.com.ar', password: '123', role: 'admin' },
  { id: '3', name: 'Ana Técnico', email: 'ana@hempc.com.ar', password: '123', role: 'technician' },
  { id: '4', name: 'Pedro Productor', email: 'pedro@hempc.com.ar', password: '123', role: 'viewer' },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper para generar IDs si no vienen de la DB (aunque lo ideal es que vengan)
const generateId = () => crypto.randomUUID();

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State
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

  // --- 1. CARGA INICIAL DESDE SUPABASE ---
  useEffect(() => {
    const fetchAllData = async () => {
        setLoading(true);
        try {
            // Promise.all para cargar todo en paralelo
            const [
                { data: users },
                { data: projs },
                { data: vars },
                { data: locs },
                { data: plts },
                { data: recs },
                { data: lgs },
                { data: tsks }
            ] = await Promise.all([
                supabase.from('users').select('*'),
                supabase.from('projects').select('*'),
                supabase.from('varieties').select('*'),
                supabase.from('locations').select('*'),
                supabase.from('plots').select('*'),
                supabase.from('trial_records').select('*'),
                supabase.from('field_logs').select('*'),
                supabase.from('tasks').select('*')
            ]);

            // Si la DB responde con datos, usarlos. Si no (o está vacía), usar arrays vacíos o DEMO.
            // IMPORTANTE: Si users es nulo o vacío, cargamos los DEMO_USERS para que el login funcione.
            if (users && users.length > 0) {
                setUsersList(users as User[]);
            } else {
                console.warn("Usando usuarios de demostración (DB vacía o sin conexión)");
                setUsersList(DEMO_USERS);
            }

            if (projs) setProjects(projs as Project[]);
            if (vars) setVarieties(vars as Variety[]);
            if (locs) setLocations(locs as Location[]);
            if (plts) setPlots(plts as Plot[]);
            if (recs) setTrialRecords(recs as TrialRecord[]);
            if (lgs) setLogs(lgs as FieldLog[]);
            if (tsks) setTasks(tsks as Task[]);

            // Restaurar sesión si existe en localStorage (persistencia de login simple)
            const savedUser = localStorage.getItem('ht_session_user');
            if (savedUser) {
                setCurrentUser(JSON.parse(savedUser));
            }

        } catch (error) {
            console.error("Error cargando datos de Supabase:", error);
            // Fallback en caso de error crítico de conexión
            setUsersList(DEMO_USERS);
        } finally {
            setLoading(false);
        }
    };

    fetchAllData();
  }, []);

  // --- AUTH ---
  const login = async (email: string, password: string): Promise<boolean> => {
    // Validamos contra la lista de usuarios cargada desde la DB (o Demo)
    const user = usersList.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('ht_session_user', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ht_session_user');
  };

  // --- CRUD WRAPPERS (DB + STATE) ---
  
  // Projects
  const addProject = async (p: Project) => {
      const { error } = await supabase.from('projects').insert([p]);
      if (!error) setProjects([...projects, p]);
  };
  const updateProject = async (p: Project) => {
      const { error } = await supabase.from('projects').update(p).eq('id', p.id);
      if (!error) setProjects(prev => prev.map(item => item.id === p.id ? p : item));
  };

  // Varieties
  const addVariety = async (v: Variety) => {
      const { error } = await supabase.from('varieties').insert([v]);
      if (!error) setVarieties([...varieties, v]);
  };
  const updateVariety = async (v: Variety) => {
      const { error } = await supabase.from('varieties').update(v).eq('id', v.id);
      if (!error) setVarieties(prev => prev.map(item => item.id === v.id ? v : item));
  };
  const deleteVariety = async (id: string) => {
      const { error } = await supabase.from('varieties').delete().eq('id', id);
      if (!error) setVarieties(prev => prev.filter(item => item.id !== id));
  };

  // Locations
  const addLocation = async (l: Location) => {
      const { error } = await supabase.from('locations').insert([l]);
      if (!error) setLocations([...locations, l]);
  };
  const updateLocation = async (l: Location) => {
      const { error } = await supabase.from('locations').update(l).eq('id', l.id);
      if (!error) setLocations(prev => prev.map(item => item.id === l.id ? l : item));
  };
  const deleteLocation = async (id: string) => {
      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (!error) setLocations(prev => prev.filter(item => item.id !== id));
  };

  // Plots
  const addPlot = async (p: Plot) => {
      const { error } = await supabase.from('plots').insert([p]);
      if (!error) setPlots([...plots, p]);
      else console.error(error);
  };
  const updatePlot = async (p: Plot) => {
      const { error } = await supabase.from('plots').update(p).eq('id', p.id);
      if (!error) setPlots(prev => prev.map(item => item.id === p.id ? p : item));
  };

  // Trial Records (Note: DB table is 'trial_records')
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

  // Logs
  const addLog = async (l: FieldLog) => {
      const { error } = await supabase.from('field_logs').insert([l]);
      if (!error) setLogs(prev => [l, ...prev]);
  };

  // Users
  const addUser = async (u: User) => {
      const { error } = await supabase.from('users').insert([u]);
      if (!error) setUsersList([...usersList, u]);
  };
  const updateUser = async (u: User) => {
      const { error } = await supabase.from('users').update(u).eq('id', u.id);
      if (!error) setUsersList(prev => prev.map(item => item.id === u.id ? u : item));
  };
  const deleteUser = async (id: string) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (!error) setUsersList(prev => prev.filter(item => item.id !== id));
  };

  // Tasks
  const addTask = async (t: Task) => {
      const { error } = await supabase.from('tasks').insert([t]);
      if (!error) setTasks([t, ...tasks]);
  };
  const updateTask = async (t: Task) => {
      const { error } = await supabase.from('tasks').update(t).eq('id', t.id);
      if (!error) setTasks(prev => prev.map(item => item.id === t.id ? t : item));
  };
  const deleteTask = async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (!error) setTasks(prev => prev.filter(item => item.id !== id));
  };

  // Helpers (Logic remains same, data source changed)
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
      loading
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