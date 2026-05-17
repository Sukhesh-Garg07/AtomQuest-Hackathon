// src/pages/TeamGoals.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { computeScore, THRUST_AREAS, UOM_TYPES } from '../utils/seedData';
import toast from 'react-hot-toast';

export default function TeamGoals() {
  const { userProfile } = useAuth();
  const [sheets, setSheets] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShared, setShowShared] = useState(false);
  const [sharedGoal, setSharedGoal] = useState({ thrustArea: '', title: '', description: '', uomType: '', target: '', targetDate: '' });
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [pushing, setPushing] = useState(false);

  useEffect(() => { if (userProfile) fetchTeam(); }, [userProfile]);

  async function fetchTeam() {
    setLoading(true);
    try {
      const q = query(collection(db, 'goalSheets'), where('managerId', '==', userProfile.uid), where('cycleYear', '==', new Date().getFullYear()));
      const snap = await getDocs(q);
      setSheets(snap.docs.map(d => ({ id: d.id, ...d.data() })));

      const uq = query(collection(db, 'users'), where('managerId', '==', userProfile.uid));
      const usnap = await getDocs(uq);
      setTeamMembers(usnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { toast.error('Error loading team'); }
    setLoading(false);
  }

  async function pushSharedGoal() {
    if (!sharedGoal.thrustArea || !sharedGoal.title || !sharedGoal.uomType || (!sharedGoal.target && !sharedGoal.targetDate)) {
      toast.error('Fill all required fields'); return;
    }
    if (selectedEmployees.length === 0) { toast.error('Select at least one employee'); return; }
    setPushing(true);
    try {
      for (const empId of selectedEmployees) {
        const sheet = sheets.find(s => s.employeeId === empId);
        if (!sheet) { toast.error(`No goal sheet found for selected employee`); continue; }
        const newGoals = [...(sheet.goals || []), {
          ...sharedGoal,
          isShared: true,
          sharedBy: userProfile.uid,
          sharedByName: userProfile.name,
          weightage: '',
          status: 'Not Started',
          achievement: '',
        }];
        await updateDoc(doc(db, 'goalSheets', sheet.id), { goals: newGoals, updatedAt: serverTimestamp() });
        await addDoc(collection(db, 'auditLogs'), {
          action: 'SHARED_GOAL_PUSHED',
          userId: userProfile.uid,
          userName: userProfile.name,
          targetUserId: empId,
          sheetId: sheet.id,
          timestamp: serverTimestamp(),
          details: `Manager pushed shared goal: "${sharedGoal.title}" to ${sheet.employeeName}`,
        });
      }
      toast.success(`Shared goal pushed to ${selectedEmployees.length} employee(s)! ✅`);
      setShowShared(false);
      setSharedGoal({ thrustArea: '', title: '', description: '', uomType: '', target: '', targetDate: '' });
      setSelectedEmployees([]);
      await fetchTeam();
    } catch (e) { toast.error('Push failed'); }
    setPushing(false);
  }

  const STATUS_COLORS = { draft: '#64748b', submitted: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' };

  if (loading) return <div style={styles.loading}>Loading team...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Team Goals</h1>
          <p style={styles.subtitle}>{sheets.length} team member{sheets.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowShared(!showShared)} style={styles.pushBtn}>
          🔗 Push Shared Goal
        </button>
      </div>

      {/* Push Shared Goal Panel */}
      {showShared && (
        <div style={styles.sharedPanel}>
          <h3 style={styles.panelTitle}>Push a Departmental KPI to Team Members</h3>
          <p style={styles.panelNote}>Goal Title and Target will be read-only for employees. They can only adjust weightage.</p>
          <div style={styles.formGrid}>
            <div style={styles.formField}>
              <label style={styles.label}>Thrust Area *</label>
              <select value={sharedGoal.thrustArea} onChange={e => setSharedGoal({ ...sharedGoal, thrustArea: e.target.value })} style={styles.select}>
                <option value="">Select...</option>
                {THRUST_AREAS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Goal Title *</label>
              <input value={sharedGoal.title} onChange={e => setSharedGoal({ ...sharedGoal, title: e.target.value })} style={styles.input} placeholder="e.g., Q2 Customer NPS" />
            </div>
            <div style={{ ...styles.formField, gridColumn: '1 / -1' }}>
              <label style={styles.label}>Description</label>
              <textarea value={sharedGoal.description} onChange={e => setSharedGoal({ ...sharedGoal, description: e.target.value })} style={{ ...styles.input, minHeight: '60px' }} placeholder="Describe the shared KPI..." />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Unit of Measurement *</label>
              <select value={sharedGoal.uomType} onChange={e => setSharedGoal({ ...sharedGoal, uomType: e.target.value })} style={styles.select}>
                <option value="">Select...</option>
                {UOM_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>{sharedGoal.uomType === 'timeline' ? 'Target Date *' : 'Target *'}</label>
              {sharedGoal.uomType === 'timeline'
                ? <input type="date" value={sharedGoal.targetDate} onChange={e => setSharedGoal({ ...sharedGoal, targetDate: e.target.value })} style={styles.input} />
                : <input type="number" value={sharedGoal.target} onChange={e => setSharedGoal({ ...sharedGoal, target: e.target.value })} style={styles.input} placeholder="Enter target" />
              }
            </div>
          </div>
          <div style={styles.empSelect}>
            <label style={styles.label}>Push to Employees *</label>
            <div style={styles.empList}>
              {teamMembers.map(emp => (
                <label key={emp.id} style={styles.empCheck}>
                  <input type="checkbox" checked={selectedEmployees.includes(emp.id)} onChange={e => {
                    if (e.target.checked) setSelectedEmployees([...selectedEmployees, emp.id]);
                    else setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                  }} />
                  <span>{emp.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={styles.panelActions}>
            <button onClick={() => setShowShared(false)} style={styles.cancelBtn}>Cancel</button>
            <button onClick={pushSharedGoal} disabled={pushing} style={styles.pushConfirmBtn}>
              {pushing ? 'Pushing...' : `🚀 Push to ${selectedEmployees.length} Employee(s)`}
            </button>
          </div>
        </div>
      )}

      {/* Team Members */}
      <div style={styles.teamList}>
        {sheets.length === 0 ? (
          <div style={styles.empty}>No team members have created goal sheets yet.</div>
        ) : (
          sheets.map(sheet => {
            const approvedGoals = sheet.goals || [];
            const completedCount = approvedGoals.filter(g => g.status === 'Completed').length;
            const overallScore = approvedGoals.length > 0
              ? approvedGoals.reduce((sum, g) => {
                  const score = computeScore(g.uomType, g.target, g.achievement, g.targetDate, g.completionDate);
                  return sum + score * ((parseFloat(g.weightage) || 0) / 100);
                }, 0)
              : 0;

            return (
              <div key={sheet.id} style={styles.memberCard}>
                <div style={styles.memberHeader}>
                  <div style={styles.memberInfo}>
                    <div style={styles.avatar}>{sheet.employeeName?.[0]}</div>
                    <div>
                      <p style={styles.memberName}>{sheet.employeeName}</p>
                      <div style={styles.memberMeta}>
                        <span style={{ ...styles.statusBadge, background: STATUS_COLORS[sheet.status] + '33', color: STATUS_COLORS[sheet.status] }}>{sheet.status}</span>
                        <span style={styles.metaText}>{approvedGoals.length} goals · {completedCount} completed</span>
                      </div>
                    </div>
                  </div>
                  <div style={styles.scoreBox}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '22px', color: overallScore >= 80 ? '#22c55e' : overallScore >= 50 ? '#f59e0b' : '#ef4444' }}>{overallScore.toFixed(0)}%</p>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>progress</p>
                  </div>
                </div>
                <div style={styles.goalsMini}>
                  {approvedGoals.slice(0, 4).map((g, i) => {
                    const score = computeScore(g.uomType, g.target, g.achievement, g.targetDate, g.completionDate);
                    return (
                      <div key={i} style={styles.miniGoal}>
                        <div style={styles.miniGoalHeader}>
                          <span style={styles.miniGoalTitle}>{g.title}</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444' }}>{score.toFixed(0)}%</span>
                        </div>
                        <div style={styles.miniBar}><div style={{ height: '100%', width: `${score}%`, background: score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444', borderRadius: '99px' }} /></div>
                      </div>
                    );
                  })}
                  {approvedGoals.length > 4 && <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0' }}>+{approvedGoals.length - 4} more goals</p>}
                </div>
              </div>
            );
          })
        )}
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
  pushBtn: { padding: '10px 20px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '14px' },
  sharedPanel: { background: '#1e293b', border: '1px solid #8b5cf655', borderRadius: '16px', padding: '24px', marginBottom: '24px' },
  panelTitle: { margin: '0 0 8px', color: '#f1f5f9', fontWeight: 700, fontSize: '18px' },
  panelNote: { margin: '0 0 20px', color: '#64748b', fontSize: '13px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' },
  formField: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#f1f5f9', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  select: { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#f1f5f9', fontSize: '14px', outline: 'none', width: '100%' },
  empSelect: { marginBottom: '20px' },
  empList: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' },
  empCheck: { display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: '#f1f5f9', fontSize: '14px' },
  panelActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  cancelBtn: { padding: '10px 20px', background: '#334155', border: 'none', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 },
  pushConfirmBtn: { padding: '10px 24px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '14px' },
  teamList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  empty: { background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '40px', textAlign: 'center', color: '#64748b' },
  memberCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px' },
  memberHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  memberInfo: { display: 'flex', alignItems: 'center', gap: '14px' },
  avatar: { width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#fff' },
  memberName: { margin: '0 0 6px', fontWeight: 700, color: '#f1f5f9', fontSize: '16px' },
  memberMeta: { display: 'flex', alignItems: 'center', gap: '10px' },
  statusBadge: { padding: '3px 10px', borderRadius: '20px', fontWeight: 700, fontSize: '11px' },
  metaText: { color: '#64748b', fontSize: '13px' },
  scoreBox: { textAlign: 'center', background: '#0f172a', borderRadius: '12px', padding: '10px 16px' },
  goalsMini: { display: 'flex', flexDirection: 'column', gap: '8px' },
  miniGoal: {},
  miniGoalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  miniGoalTitle: { color: '#94a3b8', fontSize: '13px' },
  miniBar: { background: '#334155', borderRadius: '99px', height: '4px', overflow: 'hidden' },
};
