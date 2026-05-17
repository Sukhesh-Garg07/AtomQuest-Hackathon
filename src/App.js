// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Approvals from './pages/Approvals';
import CheckIn from './pages/CheckIn';
import TeamGoals from './pages/TeamGoals';
import Analytics from './pages/Analytics';
import {
  AdminUsers,
  AdminAllGoals,
  AdminAudit,
  AdminReports,
  AdminCycles,
} from './pages/AdminPages';

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Layout>{children}</Layout>;
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    }}>
      <div style={{
        width: '48px', height: '48px',
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        borderRadius: '14px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '24px',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}>⚡</div>
      <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Loading AtomQuest...</p>
      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(.95)} }`}</style>
    </div>
  );
}

// ─── Root redirect based on auth state ───────────────────────────────────────
function RootRedirect() {
  const { currentUser, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#f1f5f9' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } },
          }}
        />

        <Routes>
          {/* Public */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginRoute />} />

          {/* All authenticated roles */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['employee', 'manager', 'admin']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Employee + Manager (managers also have goals) */}
          <Route path="/goals" element={
            <ProtectedRoute allowedRoles={['employee', 'manager']}>
              <Goals />
            </ProtectedRoute>
          } />

          <Route path="/checkin" element={
            <ProtectedRoute allowedRoles={['employee', 'manager']}>
              <CheckIn />
            </ProtectedRoute>
          } />

          {/* Manager only */}
          <Route path="/team" element={
            <ProtectedRoute allowedRoles={['manager']}>
              <TeamGoals />
            </ProtectedRoute>
          } />

          <Route path="/approvals" element={
            <ProtectedRoute allowedRoles={['manager']}>
              <Approvals />
            </ProtectedRoute>
          } />

          {/* Admin only */}
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          } />

          <Route path="/admin/goals" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAllGoals />
            </ProtectedRoute>
          } />

          <Route path="/admin/analytics" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Analytics />
            </ProtectedRoute>
          } />

          <Route path="/admin/audit" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAudit />
            </ProtectedRoute>
          } />

          <Route path="/admin/reports" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminReports />
            </ProtectedRoute>
          } />

          <Route path="/admin/cycles" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminCycles />
            </ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Prevent logged-in users from seeing login page
function LoginRoute() {
  const { currentUser, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (currentUser) return <Navigate to="/dashboard" replace />;
  return <Login />;
}
