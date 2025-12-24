
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
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/projects" element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            } />
            <Route path="/tasks" element={
              <ProtectedRoute>
                <Tasks />
              </ProtectedRoute>
            } />
            <Route path="/tools" element={
              <ProtectedRoute>
                <Tools />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/integrity" element={
              <ProtectedRoute>
                <IntegrityCheck />
              </ProtectedRoute>
            } />
            <Route path="/advisor" element={
              <ProtectedRoute>
                <AIAdvisor />
              </ProtectedRoute>
            } />
            <Route path="/varieties" element={
              <ProtectedRoute>
                <Varieties />
              </ProtectedRoute>
            } />
            <Route path="/suppliers" element={
              <ProtectedRoute>
                <Suppliers />
              </ProtectedRoute>
            } />
            <Route path="/clients" element={
              <ProtectedRoute>
                <Clients />
              </ProtectedRoute>
            } />
            <Route path="/resources" element={
              <ProtectedRoute>
                <Resources />
              </ProtectedRoute>
            } />
            <Route path="/storage" element={
              <ProtectedRoute>
                <Storage />
              </ProtectedRoute>
            } />
            <Route path="/logistics-map" element={
              <ProtectedRoute>
                <LogisticsMap />
              </ProtectedRoute>
            } />
            <Route path="/seed-batches" element={
              <ProtectedRoute>
                <SeedBatches />
              </ProtectedRoute>
            } />
            
            <Route path="/locations" element={
              <ProtectedRoute>
                <Locations />
              </ProtectedRoute>
            } />
            <Route path="/locations/:id" element={
              <ProtectedRoute>
                <LocationDetails />
              </ProtectedRoute>
            } />

            <Route path="/plots" element={
              <ProtectedRoute>
                <Plots />
              </ProtectedRoute>
            } />
            <Route path="/plots/:id" element={
              <ProtectedRoute>
                <PlotDetails />
              </ProtectedRoute>
            } />
            
            <Route path="/users" element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
}
