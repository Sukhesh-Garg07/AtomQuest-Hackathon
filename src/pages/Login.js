// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const demoAccounts = [
    { role: 'Employee', email: 'employee@atomquest.com', password: 'Demo@1234', color: '#3b82f6' },
    { role: 'Manager', email: 'manager@atomquest.com', password: 'Demo@1234', color: '#8b5cf6' },
    { role: 'Admin / HR', email: 'admin@atomquest.com', password: 'Demo@1234', color: '#f59e0b' },
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      toast.error('Invalid credentials. Try the demo accounts below.');
    }
    setLoading(false);
  }

  function fillDemo(acc) {
    setEmail(acc.email);
    setPassword(acc.password);
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>⚡</div>
          <div>
            <h1 style={styles.title}>AtomQuest</h1>
            <p style={styles.subtitle}>Goal Setting & Tracking Portal</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="your@email.com"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <div style={styles.demoSection}>
          <p style={styles.demoTitle}>🚀 Demo Accounts — Click to Fill</p>
          <div style={styles.demoCards}>
            {demoAccounts.map(acc => (
              <button key={acc.role} onClick={() => fillDemo(acc)} style={{ ...styles.demoCard, borderColor: acc.color }}>
                <span style={{ ...styles.demoRole, color: acc.color }}>{acc.role}</span>
                <span style={styles.demoEmail}>{acc.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    padding: '20px',
  },
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '20px',
    padding: '48px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '40px',
  },
  logoIcon: {
    fontSize: '40px',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    borderRadius: '12px',
    width: '56px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { margin: 0, fontSize: '24px', fontWeight: 700, color: '#f1f5f9' },
  subtitle: { margin: '4px 0 0', fontSize: '13px', color: '#64748b' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' },
  input: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#f1f5f9',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  btn: {
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    border: 'none',
    borderRadius: '10px',
    padding: '14px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'opacity 0.2s',
  },
  demoSection: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #334155',
  },
  demoTitle: { fontSize: '13px', color: '#64748b', marginBottom: '12px', textAlign: 'center' },
  demoCards: { display: 'flex', flexDirection: 'column', gap: '8px' },
  demoCard: {
    background: '#0f172a',
    border: '1px solid',
    borderRadius: '10px',
    padding: '12px 16px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background 0.2s',
  },
  demoRole: { fontSize: '13px', fontWeight: 700 },
  demoEmail: { fontSize: '12px', color: '#64748b' },
};
