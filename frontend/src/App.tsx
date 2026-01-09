
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { LiveMonitorPage } from './pages/LiveMonitorPage';
import { DashboardOverviewPage } from './pages/DashboardOverviewPage';
import { AgentsPage } from './pages/AgentsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ActiveCallProvider } from './context/ActiveCallContext';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Toaster
        richColors
        position="bottom-right"
        closeButton
        toastOptions={{
          classNames: {
            closeButton: "!left-auto !right-0 !top-2 !-translate-y-1/2 !translate-x-1/2 bg-white text-slate-500 border border-slate-200 shadow-sm"
          }
        }}
      />
      <ActiveCallProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/active-calls"
            element={
              <ProtectedRoute>
                <LiveMonitorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard-overview"
            element={
              <ProtectedRoute>
                <DashboardOverviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedRoute>
                <AgentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* Catch all - Redirect to Landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ActiveCallProvider>
    </BrowserRouter>
  );
};

export default App;
