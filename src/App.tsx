import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';

// Primary App Pages
import { AuthPortal } from './pages/AuthPortal';
import { UserDashboard } from './pages/UserDashboard';
import { CorrectionPage } from './pages/CorrectionPage';

// Admin Console Pages
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManageRegistrations } from './pages/admin/ManageRegistrations';
import { ManageMembers } from './pages/admin/ManageMembers';
import { ManageOfficeBearers } from './pages/admin/ManageOfficeBearers';
import { IdCardGenerator } from './pages/admin/IdCardGenerator';
import { ManageMeetings } from './pages/admin/ManageMeetings';
import { ManageUpdates } from './pages/admin/ManageUpdates';
import { AdminSettings } from './pages/admin/AdminSettings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#064e3b',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '14px',
              padding: '12px 18px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
            },
            success: {
              iconTheme: {
                primary: '#fbbf24',
                secondary: '#064e3b'
              }
            },
            error: {
              style: {
                background: '#991b1b'
              }
            }
          }}
        />

        <Routes>
          {/* Default Entry: Clean Portal with User Login, Registration, and Admin Login */}
          <Route path="/" element={<AuthPortal />} />
          <Route path="/login" element={<AuthPortal initialTab="login" />} />
          <Route path="/register" element={<AuthPortal initialTab="register" />} />
          <Route path="/admin-login" element={<AuthPortal initialTab="admin" />} />

          {/* Member Portal */}
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/correction" element={<CorrectionPage />} />

          {/* Admin Management Console */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="registrations" element={<ManageRegistrations />} />
            <Route path="members" element={<ManageMembers />} />
            <Route path="office-bearers" element={<ManageOfficeBearers />} />
            <Route path="idcards" element={<IdCardGenerator />} />
            <Route path="meetings" element={<ManageMeetings />} />
            <Route path="updates" element={<ManageUpdates />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Wildcard Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
