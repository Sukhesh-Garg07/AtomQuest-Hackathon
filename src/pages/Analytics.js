// src/pages/Analytics.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { computeScore } from '../utils/seedData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#f97316'];

export default function Analytics() {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'goalSheets'));
      setSheets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { toast.error('Error loading analytics'); }
    setLoading(false);
  }

  // === Compute stats ===
  const totalSheets = sheets.length;
  const approved = sheets.filter(s => s.status === 'approved').length;
  const submitted = sheets.filter(s => s.status === 'submitted').length;
  const draft = sheets.filter(s => s.status === 'draft').length;

  // Status distribution
  const statusData = [
    { name: 'Approved', value: approved },
    { name: 'Submitted', value: submitted },
    { name: 'Draft', value: draft },
    { name: 'Rejected', value: sheets.filter(s => s.status === 'rejected').length },
  ].filter(d => d.value > 0);

  // Goal count per dept
  const deptMap = {};
  sheets.forEach(s => {
    const dept = s.department || 'Unknown';
    if (!deptMap[dept]) deptMap[dept] = { dept, goalCount: 0, sheets: 0 };
    deptMap[dept].goalCount += (s.goals?.length || 0);
    deptMap[dept].sheets += 1;
  });
  const deptData = Object.values(deptMap);

  // Thrust area breakdown across all goals
  const thrustMap = {};
  sheets.forEach(s => {
    (s.goals || []).forEach(g => {
      if (!g.thrustArea) return;
      thrustMap[g.thrustArea] = (thrustMap[g.thrustArea] || 0) + 1;
    });
  });
  const thrustData = Object.entries(thrustMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Average score per dept (for approved sheets with achievements)
  const deptScoreMap = {};
  sheets.filter(s => s.status === 'approved').forEach(s => {
    const dept = s.department || 'Unknown';
    if (!deptScoreMap[dept]) deptScoreMap[dept] = { dept, totalScore: 0, count: 0 };
    (s.goals || []).forEach(g => {
      const score = computeScore(g.uomType, g.target, g.achievement, g.targetDate, g.completionDate);
      deptScoreMap[dept].totalScore += score;
      deptScoreMap[dept].count += 1;
    });
  });
  const deptScoreData = Object.values(deptScoreMap).map(d => ({
    dept: d.dept,
    avgScore: d.count > 0 ? Math.round(d.totalScore / d.count) : 0,
  }));

  // Goal status distribution
  const goalStatusMap = {};
  sheets.forEach(s => {
    (s.goals || []).forEach(g => {
      const st = g.status || 'Not Started';
      goalStatusMap[st] = (goalStatusMap[st] || 0) + 1;
    });
  });
  const goalStatusData = Object.entries(goalStatusMap).map(([name, value]) => ({ name, value }));

  // Checkin completion per quarter
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const checkinData = quarters.map(q => {
    const approvedSheets = sheets.filter(s => s.status === 'approved');
    const done = approvedSheets.filter(s => s.checkIns?.[q]).length;
    return { quarter: q, completed: done, total: approvedSheets.length, pct: approvedSheets.length > 0 ? Math.round((done / approvedSheets.length) * 100) : 0 };
  });

  if (loading) return <div style={styles.loading}>Loading analytics...</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.h1}>Analytics Dashboard</h1>
      <p style={styles.subtitle}>Real-time organizational goal insights</p>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <KpiCard label="Total Employees" value={totalSheets} icon="👥" color="#3b82f6" />
        <KpiCard label="Approved Goal Sheets" value={approved} icon="✅" color="#22c55e" />
        <KpiCard label="Pending Review" value={submitted} icon="⏳" color="#f59e0b" />
        <KpiCard label="Total Goals Tracked" value={sheets.reduce((s, sh) => s + (sh.goals?.length || 0), 0)} icon="🎯" color="#8b5cf6" />
      </div>

      {/* Charts Row 1 */}
      <div style={styles.chartRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Goal Sheet Status Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Goals by Thrust Area</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={thrustData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={120} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', borderRadius: '8px' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={styles.chartRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Avg Achievement Score by Department</h3>
          {deptScoreData.length === 0 ? (
            <p style={styles.noData}>No achievement data yet. Available after quarterly check-ins.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptScoreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="dept" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', borderRadius: '8px' }} formatter={(v) => [`${v}%`, 'Avg Score']} />
                <Bar dataKey="avgScore" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Check-in Completion by Quarter</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={checkinData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="quarter" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', borderRadius: '8px' }} formatter={(v) => [`${v}%`, 'Completion']} />
              <Bar dataKey="pct" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={styles.checkinTable}>
            {checkinData.map(q => (
              <div key={q.quarter} style={styles.checkinRow}>
                <span style={styles.qLabel}>{q.quarter}</span>
                <div style={styles.miniProgress}>
                  <div style={{ ...styles.miniBar, width: `${q.pct}%` }} />
                </div>
                <span style={styles.checkinCount}>{q.completed}/{q.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Goal Status */}
      <div style={styles.chartCard}>
        <h3 style={styles.chartTitle}>Individual Goal Status Overview</h3>
        <div style={styles.statusGrid}>
          {goalStatusData.map((s, i) => (
            <div key={s.name} style={{ ...styles.statusChip, borderColor: COLORS[i] + '66', background: COLORS[i] + '22' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: COLORS[i] }}>{s.value}</span>
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color }) {
  return (
    <div style={{ ...styles.kpiCard, borderColor: color + '44' }}>
      <div style={{ ...styles.kpiIcon, background: color + '22', color }}>{icon}</div>
      <div>
        <p style={styles.kpiValue}>{value}</p>
        <p style={styles.kpiLabel}>{label}</p>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '1100px' },
  loading: { color: '#94a3b8', padding: '40px', textAlign: 'center' },
  h1: { margin: 0, fontSize: '28px', fontWeight: 800, color: '#f1f5f9' },
  subtitle: { margin: '4px 0 24px', color: '#64748b', fontSize: '14px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  kpiCard: { background: '#1e293b', border: '1px solid', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' },
  kpiIcon: { width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 },
  kpiValue: { margin: 0, fontSize: '28px', fontWeight: 800, color: '#f1f5f9' },
  kpiLabel: { margin: '2px 0 0', fontSize: '12px', color: '#64748b', fontWeight: 600 },
  chartRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  chartCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '20px', marginBottom: '16px' },
  chartTitle: { margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#f1f5f9' },
  noData: { color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '40px 0' },
  checkinTable: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' },
  checkinRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  qLabel: { color: '#94a3b8', fontSize: '13px', fontWeight: 600, width: '28px' },
  miniProgress: { flex: 1, background: '#334155', borderRadius: '99px', height: '6px', overflow: 'hidden' },
  miniBar: { background: '#8b5cf6', height: '100%', borderRadius: '99px' },
  checkinCount: { color: '#64748b', fontSize: '12px', width: '36px', textAlign: 'right' },
  statusGrid: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  statusChip: { border: '1px solid', borderRadius: '12px', padding: '16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '100px' },
};
