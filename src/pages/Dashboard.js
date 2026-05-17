// src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { computeScore, getCurrentQuarter } from '../utils/seedData';

export default function Dashboard() {
  const { userProfile } = useAuth();
  const [mySheet, setMySheet] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentQ = getCurrentQuarter();

  const role = userProfile?.role || 'employee';

  useEffect(() => { if (userProfile) fetchData(); }, [userProfile]);

  async function fetchData() {
    setLoading(true);
    try {
      // My sheet
      const q = query(collection(db, 'goalSheets'), where('employeeId', '==', userProfile.uid), where('cycleYear', '==', new Date().getFullYear()));
      const snap = await getDocs(q);
      if (!snap.empty) setMySheet({ id: snap.docs[0].id, ...snap.docs[0].data() });

      if (role === 'manager') {
        const tq = query(collection(db, 'goalSheets'), where('managerId', '==', userProfile.uid), where('cycleYear', '==', new Date().getFullYear()));
        const tsnap = await getDocs(tq);
        const tsheets = tsnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTeamStats({
          total: tsheets.length,
          approved: tsheets.filter(s => s.status === 'approved').length,
          pending: tsheets.filter(s => s.status === 'submitted').length,
          checkinDone: tsheets.filter(s => s.checkIns?.[currentQ]).length,
        });
      }

      if (role === 'admin') {
        const asnap = await getDocs(collection(db, 'goalSheets'));
        const aSheets = asnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAdminStats({
          total: aSheets.length,
          approved: aSheets.filter(s => s.status === 'approved').length,
          submitted: aSheets.filter(s => s.status === 'submitted').length,
          draft: aSheets.filter(s => s.status === 'draft').length,
        });
      }
    } catch (e) {}
    setLoading(false);
  }

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const STATUS_STYLES = {
    draft: { bg: '#64748b22', color: '#64748b', label: '📝 Draft' },
    submitted: { bg: '#f59e0b22', color: '#f59e0b', label: '⏳ Awaiting Approval' },
    approved: { bg: '#22c55e22', color: '#22c55e', label: '✅ Approved' },
    rejected: { bg: '#ef444422', color: '#ef4444', label: '↩ Returned for Rework' },
  };

  const sheetStatus = mySheet?.status;
  const statusStyle = STATUS_STYLES[sheetStatus] || STATUS_STYLES.draft;

  const totalScore = mySheet?.goals?.length > 0
    ? mySheet.goals.reduce((sum, g) => {
        const score = computeScore(g.uomType, g.target, g.achievement, g.targetDate, g.completionDate);
        return sum + score * (parseFloat(g.weightage) / 100);
      }, 0)
    : null;

  if (loading) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.container}>
      {/* Hero */}
      <div style={styles.hero}>
        <div>
          <h1 style={styles.h1}>{greet()}, {userProfile?.name?.split(' ')[0]} 👋</h1>
          <p style={styles.heroSub}>{userProfile?.department} · FY {new Date().getFullYear()} · Current Period: <b>{currentQ}</b></p>
        </div>
        {totalScore !== null && (
          <div style={styles.scoreCard}>
            <p style={styles.scoreVal}>{totalScore.toFixed(0)}%</p>
            <p style={styles.scoreLabel}>Overall Progress</p>
          </div>
        )}
      </div>

      {/* My Goal Sheet Status */}
      {role !== 'admin' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 My Goal Sheet</h2>
          {!mySheet ? (
            <div style={styles.emptySheet}>
              <p style={{ fontSize: '40px', margin: 0 }}>🎯</p>
              <p style={{ color: '#94a3b8', margin: '8px 0' }}>No goal sheet yet for FY {new Date().getFullYear()}</p>
              <p style={{ color: '#64748b', fontSize: '13px' }}>Go to <b>My Goals</b> to create your goals and submit for approval.</p>
            </div>
          ) : (
            <div style={styles.sheetCard}>
              <div style={{ ...styles.statusPill, background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</div>
              <div style={styles.sheetGrid}>
                <Stat label="Total Goals" value={mySheet.goals?.length || 0} />
                <Stat label="Completed" value={(mySheet.goals || []).filter(g => g.status === 'Completed').length} color="#22c55e" />
                <Stat label="On Track" value={(mySheet.goals || []).filter(g => g.status === 'On Track').length} color="#3b82f6" />
                <Stat label="Not Started" value={(mySheet.goals || []).filter(g => g.status === 'Not Started').length} color="#64748b" />
              </div>
              {mySheet.managerComment && (
                <div style={styles.commentBox}>
                  <span style={styles.commentLabel}>Manager Comment:</span>
                  <p style={styles.commentText}>{mySheet.managerComment}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manager Team Stats */}
      {role === 'manager' && teamStats && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>👥 Team Overview</h2>
          <div style={styles.statsGrid}>
            <StatCard label="Team Members" value={teamStats.total} icon="👥" color="#3b82f6" />
            <StatCard label="Goals Approved" value={teamStats.approved} icon="✅" color="#22c55e" />
            <StatCard label="Pending Approval" value={teamStats.pending} icon="⏳" color="#f59e0b" />
            <StatCard label={`${currentQ} Check-ins Done`} value={teamStats.checkinDone} icon="📊" color="#8b5cf6" />
          </div>
        </div>
      )}

      {/* Admin Stats */}
      {role === 'admin' && adminStats && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🏢 Organization Overview</h2>
          <div style={styles.statsGrid}>
            <StatCard label="Total Employees" value={adminStats.total} icon="👥" color="#3b82f6" />
            <StatCard label="Approved Sheets" value={adminStats.approved} icon="✅" color="#22c55e" />
            <StatCard label="Awaiting Approval" value={adminStats.submitted} icon="⏳" color="#f59e0b" />
            <StatCard label="Drafts" value={adminStats.draft} icon="📝" color="#64748b" />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>⚡ Quick Actions</h2>
        <div style={styles.actionsGrid}>
          {role === 'employee' && [
            { label: 'Create / Edit Goals', icon: '🎯', path: '/goals' },
            { label: 'Log Achievement', icon: '📊', path: '/checkin' },
          ].map(a => <QuickAction key={a.label} {...a} />)}
          {role === 'manager' && [
            { label: 'Review Pending Approvals', icon: '✅', path: '/approvals' },
            { label: 'Team Check-ins', icon: '📊', path: '/checkin' },
            { label: 'My Goals', icon: '🎯', path: '/goals' },
          ].map(a => <QuickAction key={a.label} {...a} />)}
          {role === 'admin' && [
            { label: 'All Goal Sheets', icon: '📋', path: '/admin/goals' },
            { label: 'Analytics', icon: '📈', path: '/admin/analytics' },
            { label: 'Audit Trail', icon: '🔍', path: '/admin/audit' },
            { label: 'Export Reports', icon: '⬇️', path: '/admin/reports' },
          ].map(a => <QuickAction key={a.label} {...a} />)}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={styles.stat}>
      <p style={{ ...styles.statVal, color: color || '#f1f5f9' }}>{value}</p>
      <p style={styles.statLabel}>{label}</p>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ ...styles.statCard, borderColor: color + '44' }}>
      <div style={{ ...styles.statIcon, background: color + '22', color }}>{icon}</div>
      <p style={styles.statCardVal}>{value}</p>
      <p style={styles.statCardLabel}>{label}</p>
    </div>
  );
}

function QuickAction({ label, icon, path }) {
  return (
    <a href={path} style={styles.qaCard}>
      <span style={styles.qaIcon}>{icon}</span>
      <span style={styles.qaLabel}>{label}</span>
      <span style={styles.qaArrow}>→</span>
    </a>
  );
}

const styles = {
  container: { maxWidth: '1000px' },
  loading: { color: '#94a3b8', padding: '40px', textAlign: 'center' },
  hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' },
  h1: { margin: 0, fontSize: '32px', fontWeight: 800, color: '#f1f5f9' },
  heroSub: { margin: '6px 0 0', color: '#64748b', fontSize: '15px' },
  scoreCard: { background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius: '16px', padding: '20px 28px', textAlign: 'center' },
  scoreVal: { margin: 0, fontSize: '36px', fontWeight: 800, color: '#fff' },
  scoreLabel: { margin: '4px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '13px' },
  section: { marginBottom: '32px' },
  sectionTitle: { fontSize: '18px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' },
  emptySheet: { background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '40px', textAlign: 'center' },
  sheetCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '24px' },
  statusPill: { display: 'inline-block', padding: '6px 16px', borderRadius: '20px', fontWeight: 700, fontSize: '13px', marginBottom: '20px' },
  sheetGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' },
  stat: { textAlign: 'center' },
  statVal: { margin: 0, fontSize: '28px', fontWeight: 800 },
  statLabel: { margin: '4px 0 0', color: '#64748b', fontSize: '12px' },
  commentBox: { marginTop: '16px', background: '#0f172a', borderRadius: '10px', padding: '14px' },
  commentLabel: { fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  commentText: { margin: '6px 0 0', color: '#94a3b8', fontSize: '14px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' },
  statCard: { background: '#1e293b', border: '1px solid', borderRadius: '14px', padding: '20px', textAlign: 'center' },
  statIcon: { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', margin: '0 auto 12px' },
  statCardVal: { margin: 0, fontSize: '28px', fontWeight: 800, color: '#f1f5f9' },
  statCardLabel: { margin: '4px 0 0', color: '#64748b', fontSize: '12px' },
  actionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' },
  qaCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', transition: 'border-color 0.2s, background 0.2s', cursor: 'pointer' },
  qaIcon: { fontSize: '20px' },
  qaLabel: { flex: 1, color: '#f1f5f9', fontWeight: 600, fontSize: '14px' },
  qaArrow: { color: '#64748b', fontSize: '16px' },
};
