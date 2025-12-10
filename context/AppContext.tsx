
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Variety, Location, Plot, FieldLog, TrialRecord, User, Project } from '../types';

interface AppContextType {
  projects: Project[];
  varieties: Variety[];
  locations: Location[];
  plots: Plot[];
  trialRecords: TrialRecord[]; // Historico de registros
  logs: FieldLog[]; // Bitacora informal
  
  // Auth
  currentUser: User | null;
  usersList: User[];
  login: (email: string, password: string) => boolean;
  logout: () => void;

  // Actions
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
  
  // Trial Record Management (Historical)
  addTrialRecord: (r: TrialRecord) => void;
  updateTrialRecord: (r: TrialRecord) => void;
  deleteTrialRecord: (id: string) => void;
  
  addLog: (l: FieldLog) => void;
  
  // User Management
  addUser: (u: User) => void;
  updateUser: (u: User) => void;
  deleteUser: (id: string) => void;
  
  // Helpers
  getPlotHistory: (plotId: string) => TrialRecord[];
  getLatestRecord: (plotId: string) => TrialRecord | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// --- MOCK INITIAL DATA (Used only if localStorage is empty) ---
const initialUsersData: User[] = [
  { id: 'u0', name: 'Super Admin', email: 'root@hemptrack.com', password: 'admin', role: 'super_admin' },
  { id: 'u1', name: 'Carlos Director', email: 'admin@hemptrack.com', password: '123', role: 'admin' },
  { id: 'u2', name: 'Ana Técnica', email: 'ana@campo.com', password: '123', role: 'technician' },
  { id: 'u3', name: 'Pedro Productor', email: 'pedro@finca.com', password: '123', role: 'viewer' },
  { id: 'u4', name: 'Juan Agrónomo', email: 'juan@inta.com', password: '123', role: 'technician' },
];

const initialProjectsData: Project[] = [
  { 
    id: '1', 
    name: 'Campaña Fibra 2023-2024', 
    description: 'Evaluación regional de variedades textiles.', 
    startDate: '2023-09-01', 
    status: 'En Curso',
    responsibleIds: ['u1', 'u4']
  },
];

const initialVarietiesData: Variety[] = [
  { id: '1', name: 'Finola', usage: 'Grano', genetics: 'Finlandia', cycleDays: 110, expectedThc: 0.1 },
  { id: '2', name: 'Kompolti', usage: 'Fibra', genetics: 'Hungría', cycleDays: 140, expectedThc: 0.15 },
];

const initialLocationsData: Location[] = [
  { 
    id: '1', 
    name: 'Campo Experimental INTA', 
    address: 'Ruta 5, Km 100', 
    coordinates: { lat: -34.6037, lng: -58.3816 }, 
    soilType: 'Franco', 
    climate: 'Templado', 
    responsiblePerson: 'Ing. López',
    ownerName: 'INTA',
    ownerType: 'Institución',
    responsibleIds: ['u4']
  },
];

const initialPlotsData: Plot[] = [
  { 
    id: '1', 
    name: 'FIN-B1-R1', 
    projectId: '1',
    locationId: '1', 
    varietyId: '1', 
    block: '1',
    replicate: 1,
    ownerName: 'INTA',
    responsibleIds: ['u2'],
    sowingDate: '2023-10-15', 
    rowDistance: 40, 
    density: 150, 
    status: 'Activa',
    observations: 'Suelo con buen drenaje inicial.',
    irrigationType: 'Goteo'
  },
  { 
    id: '2', 
    name: 'KOM-B1-R1', 
    projectId: '1',
    locationId: '1', 
    varietyId: '2', 
    block: '1',
    replicate: 1,
    ownerName: 'INTA',
    responsibleIds: ['u2'],
    sowingDate: '2023-10-15', 
    rowDistance: 40, 
    density: 150, 
    status: 'Activa',
    irrigationType: 'Goteo'
  },
    { 
    id: '3', 
    name: 'FIN-B1-R2', 
    projectId: '1',
    locationId: '1', 
    varietyId: '1', 
    block: '1',
    replicate: 2,
    ownerName: 'INTA',
    responsibleIds: ['u2'],
    sowingDate: '2023-10-15', 
    rowDistance: 40, 
    density: 150, 
    status: 'Activa',
    irrigationType: 'Goteo'
  },
];

const initialTrialRecordsData: TrialRecord[] = [
  {
    id: 'tr1',
    plotId: '1',
    date: '2023-11-01',
    stage: 'Emergencia',
    emergenceDate: '2023-10-25',
    plantsPerMeterInit: 12,
    vigor: 4,
    uniformity: 5,
    plantHeight: 5
  },
  {
    id: 'tr2',
    plotId: '1',
    date: '2023-11-15',
    stage: 'Vegetativo',
    plantHeight: 35,
    vigor: 5,
    uniformity: 5
  }
];

const initialLogsData: FieldLog[] = [
  {
    id: 'l1',
    plotId: '1',
    date: '2023-11-10',
    note: 'Se observa presencia leve de orugas en hojas basales. Monitorear.',
    photoUrl: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=300&auto=format&fit=crop'
  },
  {
    id: 'l2',
    plotId: '1',
    date: '2023-11-20',
    note: 'Aplicación de riego suplementario por sequía.',
  }
];

// Helper to safe parse JSON
const safeParse = (key: string, fallback: any) => {
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return fallback;
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state from LocalStorage or Fallback to Mock Data
  const [usersList, setUsersList] = useState<User[]>(() => safeParse('ht_users', initialUsersData));
  const [projects, setProjects] = useState<Project[]>(() => safeParse('ht_projects', initialProjectsData));
  const [varieties, setVarieties] = useState<Variety[]>(() => safeParse('ht_varieties', initialVarietiesData));
  const [locations, setLocations] = useState<Location[]>(() => safeParse('ht_locations', initialLocationsData));
  const [plots, setPlots] = useState<Plot[]>(() => safeParse('ht_plots', initialPlotsData));
  const [trialRecords, setTrialRecords] = useState<TrialRecord[]>(() => safeParse('ht_records', initialTrialRecordsData));
  const [logs, setLogs] = useState<FieldLog[]>(() => safeParse('ht_logs', initialLogsData));
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
      const savedUser = localStorage.getItem('ht_currentUser');
      return savedUser ? JSON.parse(savedUser) : null;
  });

  // PERSISTENCE EFFECTS
  useEffect(() => localStorage.setItem('ht_users', JSON.stringify(usersList)), [usersList]);
  useEffect(() => localStorage.setItem('ht_projects', JSON.stringify(projects)), [projects]);
  useEffect(() => localStorage.setItem('ht_varieties', JSON.stringify(varieties)), [varieties]);
  useEffect(() => localStorage.setItem('ht_locations', JSON.stringify(locations)), [locations]);
  useEffect(() => localStorage.setItem('ht_plots', JSON.stringify(plots)), [plots]);
  useEffect(() => localStorage.setItem('ht_records', JSON.stringify(trialRecords)), [trialRecords]);
  useEffect(() => localStorage.setItem('ht_logs', JSON.stringify(logs)), [logs]);
  
  useEffect(() => {
    if (currentUser) {
        localStorage.setItem('ht_currentUser', JSON.stringify(currentUser));
    } else {
        localStorage.removeItem('ht_currentUser');
    }
  }, [currentUser]);

  const login = (email: string, password: string): boolean => {
    const user = usersList.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  // --- CRUD ---

  const addProject = (p: Project) => setProjects([...projects, p]);
  const updateProject = (p: Project) => setProjects(prev => prev.map(item => item.id === p.id ? p : item));

  const addVariety = (v: Variety) => setVarieties([...varieties, v]);
  const updateVariety = (v: Variety) => setVarieties(prev => prev.map(item => item.id === v.id ? v : item));
  const deleteVariety = (id: string) => setVarieties(prev => prev.filter(item => item.id !== id));

  const addLocation = (l: Location) => setLocations([...locations, l]);
  const updateLocation = (l: Location) => setLocations(prev => prev.map(item => item.id === l.id ? l : item));
  const deleteLocation = (id: string) => setLocations(prev => prev.filter(item => item.id !== id));
  
  const addPlot = (p: Plot) => setPlots([...plots, p]);
  const updatePlot = (p: Plot) => setPlots(prev => prev.map(item => item.id === p.id ? p : item));
  
  // Gestion de Registros Tecnicos (Timeline)
  const addTrialRecord = (r: TrialRecord) => setTrialRecords(prev => [...prev, r]);
  
  const updateTrialRecord = (r: TrialRecord) => {
    setTrialRecords(prev => prev.map(item => item.id === r.id ? r : item));
  };
  
  const deleteTrialRecord = (id: string) => {
    setTrialRecords(prev => prev.filter(item => item.id !== id));
  };

  const addLog = (l: FieldLog) => setLogs(prev => [l, ...prev]);

  const addUser = (u: User) => setUsersList([...usersList, u]);
  const updateUser = (u: User) => setUsersList(prev => prev.map(item => item.id === u.id ? u : item));
  const deleteUser = (id: string) => setUsersList(prev => prev.filter(item => item.id !== id));

  // Helpers
  const getPlotHistory = (plotId: string) => {
    // Sort descending by date
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
      projects, varieties, locations, plots, trialRecords, logs,
      currentUser, usersList, login, logout,
      addProject, updateProject,
      addVariety, updateVariety, deleteVariety,
      addLocation, updateLocation, deleteLocation,
      addPlot, updatePlot,
      addTrialRecord, updateTrialRecord, deleteTrialRecord,
      addLog,
      addUser, updateUser, deleteUser,
      getPlotHistory, getLatestRecord
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
