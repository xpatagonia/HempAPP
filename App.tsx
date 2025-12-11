
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Varieties from './pages/Varieties';
import Locations from './pages/Locations';
import Plots from './pages/Plots';
import PlotDetails from './pages/PlotDetails';
import Projects from './pages/Projects';
import Users from './pages/Users';
import Tasks from './pages/Tasks';
import Login from './pages/Login';
import Tools from './pages/Tools';
import Analytics from './pages/Analytics';

// Componente para proteger rutas
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
            <Route path="/varieties" element={
              <ProtectedRoute>
                <Varieties />
              </ProtectedRoute>
            } />
            <Route path="/locations" element={
              <ProtectedRoute>
                <Locations />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
}
