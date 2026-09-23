
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Varieties from './pages/Varieties';
import Locations from './pages/Locations';
import LocationDetails from './pages/LocationDetails';
import Plots from './pages/Plots';
import PlotDetails from './pages/PlotDetails';
import TrialManager from './pages/TrialManager';
import Projects from './pages/Projects';
import Users from './pages/Users';
import Tasks from './pages/Tasks';
import Login from './pages/Login';
import Tools from './pages/Tools';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import CalendarPage from './pages/Calendar';
import AIAdvisor from './pages/AIAdvisor';
import SeedBatches from './pages/SeedBatches';
import Suppliers from './pages/Suppliers'; 
import Clients from './pages/Clients'; 
import Resources from './pages/Resources'; 
import Storage from './pages/Storage'; 
import LogisticsMap from './pages/LogisticsMap';
import IntegrityCheck from './pages/IntegrityCheck';
import AgronomicIntelligence from './pages/AgronomicIntelligence';
import Agriculture40 from './pages/Agriculture40';
import PublicTraceability from './pages/PublicTraceability';
import PublicRegistration from './pages/PublicRegistration';

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { currentUser } = useAppContext();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/trace/:id" element={<PublicTraceability />} />
          <Route path="/register-producer" element={<PublicRegistration />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/trials-lite" element={<TrialManager />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/tools" element={<Tools />} />
                  <Route path="/intelligence" element={<AgronomicIntelligence />} />
                  <Route path="/agro40" element={<Agriculture40 />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/integrity" element={<IntegrityCheck />} />
                  <Route path="/advisor" element={<AIAdvisor />} />
                  <Route path="/varieties" element={<Varieties />} />
                  <Route path="/suppliers" element={<Suppliers />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/resources" element={<Resources />} />
                  <Route path="/storage" element={<Storage />} />
                  <Route path="/logistics-map" element={<LogisticsMap />} />
                  <Route path="/seed-batches" element={<SeedBatches />} />
                  <Route path="/locations" element={<Locations />} />
                  <Route path="/locations/:id" element={<LocationDetails />} />
                  <Route path="/plots" element={<Plots />} />
                  <Route path="/plots/:id" element={<PlotDetails />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AppProvider>
  );
}
