// src/components/Layout.js
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const NAV_ITEMS = {
  employee: [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/goals', label: 'My Goals', icon: '🎯' },
    { path: '/checkin', label: 'Quarterly Check-in', icon: '📋' },
  ],
  manager: [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/goals', label: 'My Goals', icon: '🎯' },
    { path: '/team', label: 'Team Goals', icon: '👥' },
    { path: '/approvals', label: 'Pending Approvals', icon: '✅' },
    { path: '/checkin', label: 'Check-ins', icon: '📋' },
  ],
  admin: [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/admin/users', label: 'Manage Users', icon: '👤' },
    { path: '/admin/goals', label: 'All Goals', icon: '🎯' },
    { path: '/admin/analytics', label: 'Analytics', icon: '📊' },
    { path: '/admin/audit', label: 'Audit Trail', icon: '🔍' },
    { path: '/admin/cycles', label: 'Cycle Management', icon: '📅' },
    { path: '/admin/reports', label: 'Reports', icon: '📈' },
  ],
};

const ROLE_BADGE_COLORS = {
  employee: '#3b82f6',
  manager: '#8b5cf6',
  admin: '#f59e0b',
};

export default function Layout({ children }) {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const role = userProfile?.role || 'employee';
  const navItems = NAV_ITEMS[role] || NAV_ITEMS.employee;

  async function handleLogout() {
    await logout();
    navigate('/login');
    toast.success('Logged out successfully');
  }

  return (
    <div style={styles.wrapper}>
      {/* Sidebar */}
      <aside style={{ ...styles.sidebar, width: sidebarOpen ? '260px' : '70px' }}>
        <div style={styles.sidebarHeader}>
          <span style={styles.logoIcon}>⚡</span>
          {sidebarOpen && <span style={styles.logoText}>AtomQuest</span>}
        </div>

        {sidebarOpen && (
          <div style={styles.userCard}>
            <div style={styles.avatar}>{userProfile?.name?.[0] || 'U'}</div>
            <div>
              <p style={styles.userName}>{userProfile?.name || 'User'}</p>
              <span style={{ ...styles.roleBadge, background: ROLE_BADGE_COLORS[role] + '33', color: ROLE_BADGE_COLORS[role] }}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
            </div>
          </div>
        )}

        <nav style={styles.nav}>
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                ...styles.navBtn,
                background: location.pathname === item.path ? 'rgba(59,130,246,0.15)' : 'transparent',
                borderLeft: location.pathname === item.path ? '3px solid #3b82f6' : '3px solid transparent',
                color: location.pathname === item.path ? '#3b82f6' : '#94a3b8',
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {sidebarOpen && <span style={styles.navLabel}>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            <span>🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={styles.collapseBtn}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        {children}
      </main>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0f172a',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  sidebar: {
    background: '#1e293b',
    borderRight: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.3s ease',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '24px 20px',
    borderBottom: '1px solid #334155',
  },
  logoIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#f1f5f9',
    letterSpacing: '-0.02em',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    margin: '12px',
    background: '#0f172a',
    borderRadius: '12px',
  },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  userName: { margin: 0, fontSize: '14px', fontWeight: 600, color: '#f1f5f9' },
  roleBadge: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '20px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px',
    overflowY: 'auto',
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 14px',
    borderRadius: '10px',
    border: '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left',
    width: '100%',
    fontSize: '14px',
    fontWeight: 500,
  },
  navIcon: { fontSize: '18px', flexShrink: 0 },
  navLabel: { whiteSpace: 'nowrap' },
  sidebarFooter: {
    padding: '16px',
    borderTop: '1px solid #334155',
    display: 'flex',
    gap: '8px',
  },
  logoutBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  },
  collapseBtn: {
    padding: '10px 12px',
    background: '#334155',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  main: {
    flex: 1,
    overflow: 'auto',
    padding: '32px',
    color: '#f1f5f9',
  },
};
