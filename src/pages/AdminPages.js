// src/pages/AdminPages.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { seedUserProfiles } from '../utils/seedData';
import toast from 'react-hot-toast';

// =========== ADMIN USER MANAGEMENT ===========
export function AdminUsers() {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSeed, setShowSeed] = useState(false);
  const [seedInput, setSeedInput] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    const snap = await getDocs(collection(db, 'users'));
    setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  const ROLE_COLORS = { employee: '#3b82f6', manager: '#8b5cf6', admin: '#f59e0b' };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>User Management</h1>
          <p style={styles.subtitle}>{users.length} users registered</p>
        </div>
        <button onClick={() => setShowSeed(!showSeed)} style={styles.seedBtn}>🌱 Seed Demo Users</button>
      </div>

      {showSeed && (
        <div style={styles.seedPanel}>
          <p style={styles.seedNote}>
            ⚠️ First create these 3 users in <b>Firebase Auth Console → Authentication → Add User</b>:<br />
            <code>employee@atomquest.com</code>, <code>manager@atomquest.com</code>, <code>admin@atomquest.com</code> — all with password <code>Demo@1234</code><br /><br />
            Then paste their UIDs below (comma-separated: employeeUID,managerUID,adminUID):
          </p>
          <input value={seedInput} onChange={e => setSeedInput(e.target.value)} style={styles.seedInput} placeholder="uid1,uid2,uid3" />
          <button onClick={async () => {
            const [eUid, mUid, aUid] = seedInput.split(',').map(s => s.trim());
            if (!eUid || !mUid || !aUid) { toast.error('Need all 3 UIDs'); return; }
            await seedUserProfiles([
              { uid: eUid, email: 'employee@atomquest.com', role: 'employee', name: 'Arjun Sharma', department: 'Sales', managerId: mUid },
              { uid: mUid, email: 'manager@atomquest.com', role: 'manager', name: 'Priya Mehta', department: 'Sales', managerId: null },
              { uid: aUid, email: 'admin@atomquest.com', role: 'admin', name: 'Rahul Admin', department: 'HR', managerId: null },
            ]);
            toast.success('Demo user profiles seeded! You can now log in.');
            setShowSeed(false);
            await fetchUsers();
          }} style={styles.seedDoBtn}>Seed Now</button>
        </div>
      )}

      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <span>Name</span><span>Email</span><span>Role</span><span>Department</span>
        </div>
        {loading ? <div style={styles.loading}>Loading...</div> : users.map(u => (
          <div key={u.id} style={styles.tableRow}>
            <span style={styles.nameCell}>
              <div style={styles.avatar}>{u.name?.[0]}</div>
              {u.name}
            </span>
            <span style={styles.emailCell}>{u.email}</span>
            <span><span style={{ ...styles.roleBadge, background: ROLE_COLORS[u.role] + '33', color: ROLE_COLORS[u.role] }}>{u.role}</span></span>
            <span style={{ color: '#94a3b8' }}>{u.department}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========== ALL GOALS ===========
export function AdminAllGoals() {
  const { userProfile } = useAuth();
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchSheets(); }, []);

  async function fetchSheets() {
    setLoading(true);
    const snap = await getDocs(collection(db, 'goalSheets'));
    setSheets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  async function unlockSheet(sheetId, employeeName) {
    if (!window.confirm(`Unlock goal sheet for ${employeeName}? This will allow editing.`)) return;
    await updateDoc(doc(db, 'goalSheets', sheetId), { status: 'draft', updatedAt: serverTimestamp() });
    await addDoc(collection(db, 'auditLogs'), {
      action: 'ADMIN_UNLOCK',
      userId: userProfile.uid,
      userName: userProfile.name,
      sheetId,
      timestamp: serverTimestamp(),
      details: `Admin unlocked goal sheet for ${employeeName}`,
    });
    toast.success('Goal sheet unlocked!');
    await fetchSheets();
  }

  const filtered = filter === 'all' ? sheets : sheets.filter(s => s.status === filter);
  const STATUS_COLORS = { draft: '#64748b', submitted: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' };

  return (
    <div style={styles.container}>
      <h1 style={styles.h1}>All Goal Sheets</h1>
      <div style={styles.filters}>
        {['all', 'draft', 'submitted', 'approved', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ ...styles.filterBtn, background: filter === f ? '#3b82f6' : '#334155', color: filter === f ? '#fff' : '#94a3b8' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {loading ? <div style={styles.loading}>Loading...</div> : (
        <div style={styles.list}>
          {filtered.map(sheet => (
            <div key={sheet.id} style={styles.sheetCard}>
              <div style={styles.sheetInfo}>
                <div style={styles.avatar}>{sheet.employeeName?.[0]}</div>
                <div>
                  <p style={styles.sheetName}>{sheet.employeeName}</p>
                  <p style={styles.sheetMeta}>{sheet.department} · {sheet.goals?.length} goals · FY {sheet.cycleYear}</p>
                </div>
              </div>
              <div style={styles.sheetActions}>
                <span style={{ ...styles.statusBadge, background: STATUS_COLORS[sheet.status] + '33', color: STATUS_COLORS[sheet.status] }}>{sheet.status}</span>
                {(sheet.status === 'approved' || sheet.status === 'submitted') && (
                  <button onClick={() => unlockSheet(sheet.id, sheet.employeeName)} style={styles.unlockBtn}>🔓 Unlock</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========== AUDIT TRAIL ===========
export function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    setLoading(true);
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  const ACTION_COLORS = {
    GOAL_SUBMITTED: '#3b82f6',
    GOAL_APPROVED: '#22c55e',
    GOAL_REJECTED: '#ef4444',
    CHECKIN_SAVED: '#8b5cf6',
    MANAGER_CHECKIN: '#f59e0b',
    ADMIN_UNLOCK: '#f97316',
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.h1}>Audit Trail</h1>
      <p style={styles.subtitle}>Complete log of all goal-related actions</p>
      {loading ? <div style={styles.loading}>Loading...</div> : (
        <div style={styles.auditList}>
          {logs.map(log => (
            <div key={log.id} style={styles.auditRow}>
              <div style={{ ...styles.auditAction, background: (ACTION_COLORS[log.action] || '#64748b') + '22', color: ACTION_COLORS[log.action] || '#64748b' }}>
                {log.action?.replace(/_/g, ' ')}
              </div>
              <div style={styles.auditMid}>
                <p style={styles.auditUser}>{log.userName}</p>
                <p style={styles.auditDetails}>{log.details}</p>
              </div>
              <p style={styles.auditTime}>{log.timestamp?.toDate?.()?.toLocaleString() || 'Just now'}</p>
            </div>
          ))}
          {logs.length === 0 && <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>No audit logs yet.</p>}
        </div>
      )}
    </div>
  );
}

// =========== REPORTS ===========
export function AdminReports() {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const snap = await getDocs(collection(db, 'goalSheets'));
    setSheets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  function exportCSV() {
    const rows = [['Employee', 'Department', 'Goal Title', 'Thrust Area', 'UoM', 'Target', 'Achievement', 'Status', 'Weightage', 'Sheet Status']];
    sheets.forEach(sheet => {
      (sheet.goals || []).forEach(g => {
        rows.push([
          sheet.employeeName, sheet.department, g.title, g.thrustArea, g.uomType,
          g.target || g.targetDate, g.achievement || g.completionDate || '', g.status || '', g.weightage, sheet.status
        ]);
      });
    });
    const csv = rows.map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AtomQuest_Goals_Report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast.success('Report exported!');
  }

  const totalGoals = sheets.reduce((s, sh) => s + (sh.goals?.length || 0), 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Achievement Report</h1>
          <p style={styles.subtitle}>{sheets.length} employees · {totalGoals} goals total</p>
        </div>
        <button onClick={exportCSV} style={styles.exportBtn}>⬇️ Export CSV</button>
      </div>

      {loading ? <div style={styles.loading}>Loading...</div> : (
        <div style={styles.reportTable}>
          <div style={styles.reportHeader}>
            <span>Employee</span><span>Goals</span><span>Status</span><span>Completion</span>
          </div>
          {sheets.map(sheet => {
            const completed = (sheet.goals || []).filter(g => g.status === 'Completed').length;
            const pct = sheet.goals?.length > 0 ? Math.round((completed / sheet.goals.length) * 100) : 0;
            return (
              <div key={sheet.id} style={styles.reportRow}>
                <span style={styles.nameCell}>
                  <div style={styles.avatar}>{sheet.employeeName?.[0]}</div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: '#f1f5f9', fontSize: '14px' }}>{sheet.employeeName}</p>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>{sheet.department}</p>
                  </div>
                </span>
                <span style={{ color: '#94a3b8' }}>{sheet.goals?.length || 0}</span>
                <span><span style={{ ...styles.statusBadge, background: sheet.status === 'approved' ? '#22c55e33' : '#f59e0b33', color: sheet.status === 'approved' ? '#22c55e' : '#f59e0b' }}>{sheet.status}</span></span>
                <span>
                  <div style={styles.miniProgress}><div style={{ ...styles.miniBar, width: `${pct}%` }} /></div>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>{pct}% ({completed}/{sheet.goals?.length})</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =========== CYCLE MANAGEMENT ===========
export function AdminCycles() {
  const { userProfile } = useAuth();
  const currentYear = new Date().getFullYear();
  const cycleSchedule = [
    { period: 'Phase 1 — Goal Setting', window: '1st May', action: 'Goal Creation, Submission & Approval', status: 'active', color: '#22c55e' },
    { period: 'Q1 Check-in', window: 'July', action: 'Progress Update — Planned vs. Actual', status: 'upcoming', color: '#3b82f6' },
    { period: 'Q2 Check-in', window: 'October', action: 'Progress Update — Planned vs. Actual', status: 'upcoming', color: '#3b82f6' },
    { period: 'Q3 Check-in', window: 'January', action: 'Progress Update — Planned vs. Actual', status: 'upcoming', color: '#3b82f6' },
    { period: 'Q4 / Annual', window: 'March / April', action: 'Final Achievement Capture', status: 'upcoming', color: '#8b5cf6' },
  ];

  return (
    <div style={styles.container}>
      <h1 style={styles.h1}>Cycle Management</h1>
      <p style={styles.subtitle}>FY {currentYear} Goal Cycle Timeline</p>
      <div style={styles.cycleList}>
        {cycleSchedule.map((c, i) => (
          <div key={i} style={{ ...styles.cycleCard, borderLeft: `4px solid ${c.color}` }}>
            <div>
              <p style={styles.cyclePeriod}>{c.period}</p>
              <p style={styles.cycleAction}>{c.action}</p>
            </div>
            <div style={styles.cycleRight}>
              <span style={styles.cycleWindow}>📅 {c.window}</span>
              <span style={{ ...styles.cycleStatus, background: c.status === 'active' ? '#22c55e33' : '#334155', color: c.status === 'active' ? '#22c55e' : '#64748b' }}>
                {c.status === 'active' ? '● Active' : 'Upcoming'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '1000px' },
  loading: { color: '#94a3b8', padding: '40px', textAlign: 'center' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  h1: { margin: 0, fontSize: '28px', fontWeight: 800, color: '#f1f5f9' },
  subtitle: { margin: '4px 0 0', color: '#64748b', fontSize: '14px' },
  seedBtn: { padding: '10px 20px', background: '#334155', border: 'none', borderRadius: '10px', color: '#f1f5f9', cursor: 'pointer', fontWeight: 600, fontSize: '14px' },
  seedPanel: { background: '#1e293b', border: '1px solid #f59e0b55', borderRadius: '14px', padding: '20px', marginBottom: '24px' },
  seedNote: { color: '#94a3b8', fontSize: '13px', lineHeight: 1.6, margin: '0 0 12px' },
  seedInput: { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', color: '#f1f5f9', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: '10px' },
  seedDoBtn: { padding: '10px 20px', background: '#f59e0b', border: 'none', borderRadius: '8px', color: '#0f172a', fontWeight: 700, cursor: 'pointer' },
  table: { background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', overflow: 'hidden' },
  tableHeader: { display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '16px', padding: '14px 20px', borderBottom: '1px solid #334155', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tableRow: { display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '16px', padding: '14px 20px', borderBottom: '1px solid #1e293b', alignItems: 'center', fontSize: '14px', color: '#f1f5f9' },
  nameCell: { display: 'flex', alignItems: 'center', gap: '10px' },
  emailCell: { color: '#64748b' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0 },
  roleBadge: { padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '12px', textTransform: 'capitalize' },
  statusBadge: { padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '12px' },
  filters: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  filterBtn: { padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  sheetCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sheetInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  sheetName: { margin: 0, fontWeight: 700, color: '#f1f5f9', fontSize: '15px' },
  sheetMeta: { margin: '4px 0 0', color: '#64748b', fontSize: '13px' },
  sheetActions: { display: 'flex', alignItems: 'center', gap: '10px' },
  unlockBtn: { padding: '6px 14px', background: 'rgba(249,115,22,0.15)', border: '1px solid #f97316', borderRadius: '8px', color: '#f97316', fontSize: '12px', fontWeight: 700, cursor: 'pointer' },
  auditList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  auditRow: { background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: '14px' },
  auditAction: { padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0 },
  auditMid: { flex: 1 },
  auditUser: { margin: 0, fontWeight: 700, color: '#f1f5f9', fontSize: '14px' },
  auditDetails: { margin: '4px 0 0', color: '#64748b', fontSize: '13px' },
  auditTime: { margin: 0, color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' },
  exportBtn: { padding: '10px 20px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '14px' },
  reportTable: { background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', overflow: 'hidden' },
  reportHeader: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr', gap: '16px', padding: '14px 20px', borderBottom: '1px solid #334155', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  reportRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr', gap: '16px', padding: '14px 20px', borderBottom: '1px solid #1e293b', alignItems: 'center', fontSize: '14px', color: '#f1f5f9' },
  miniProgress: { background: '#334155', borderRadius: '99px', height: '6px', overflow: 'hidden', width: '80px', marginBottom: '4px' },
  miniBar: { background: '#22c55e', height: '100%', borderRadius: '99px' },
  cycleList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  cycleCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cyclePeriod: { margin: '0 0 6px', fontWeight: 700, color: '#f1f5f9', fontSize: '16px' },
  cycleAction: { margin: 0, color: '#94a3b8', fontSize: '13px' },
  cycleRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' },
  cycleWindow: { color: '#64748b', fontSize: '13px' },
  cycleStatus: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 },
};
