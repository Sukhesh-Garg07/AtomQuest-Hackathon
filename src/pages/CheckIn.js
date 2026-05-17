// src/pages/CheckIn.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { computeScore, UOM_TYPES, STATUS_OPTIONS, getCurrentQuarter } from '../utils/seedData';
import toast from 'react-hot-toast';

export default function CheckIn() {
  const { userProfile } = useAuth();
  const [mySheet, setMySheet] = useState(null);
  const [sheetId, setSheetId] = useState(null);
  const [teamSheets, setTeamSheets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTeamSheet, setSelectedTeamSheet] = useState(null);
  const [checkInComment, setCheckInComment] = useState('');
  const currentQ = getCurrentQuarter();

  const isManager = userProfile?.role === 'manager';

  useEffect(() => { if (userProfile) fetchData(); }, [userProfile]);

  async function fetchData() {
    setLoading(true);
    try {
      const q = query(collection(db, 'goalSheets'), where('employeeId', '==', userProfile.uid), where('cycleYear', '==', new Date().getFullYear()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        setSheetId(d.id);
        setMySheet(d.data());
        setGoals(JSON.parse(JSON.stringify(d.data().goals || [])));
      }
      if (isManager) {
        const tq = query(collection(db, 'goalSheets'), where('managerId', '==', userProfile.uid), where('status', '==', 'approved'), where('cycleYear', '==', new Date().getFullYear()));
        const tsnap = await getDocs(tq);
        setTeamSheets(tsnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (e) { toast.error('Error loading data'); }
    setLoading(false);
  }

  function updateGoalAchievement(idx, field, value) {
    const updated = [...goals];
    updated[idx] = { ...updated[idx], [field]: value };
    setGoals(updated);
  }

  async function saveCheckIn() {
    if (!sheetId) { toast.error('No approved goal sheet found. Goals must be approved before check-in.'); return; }
    setSaving(true);
    try {
      const checkInData = {
        [`checkIns.${currentQ}`]: {
          quarter: currentQ,
          goals: goals,
          savedAt: new Date().toISOString(),
        },
        goals: goals,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, 'goalSheets', sheetId), checkInData);
      await addDoc(collection(db, 'auditLogs'), {
        action: 'CHECKIN_SAVED',
        userId: userProfile.uid,
        userName: userProfile.name,
        sheetId,
        timestamp: serverTimestamp(),
        details: `${currentQ} check-in saved`,
      });
      toast.success(`${currentQ} check-in saved successfully! ✅`);
    } catch (e) { toast.error('Save failed'); }
    setSaving(false);
  }

  async function saveManagerCheckIn() {
    if (!selectedTeamSheet) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'goalSheets', selectedTeamSheet.id), {
        [`managerCheckIns.${currentQ}`]: {
          quarter: currentQ,
          comment: checkInComment,
          managerId: userProfile.uid,
          managerName: userProfile.name,
          savedAt: new Date().toISOString(),
        },
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'auditLogs'), {
        action: 'MANAGER_CHECKIN',
        userId: userProfile.uid,
        userName: userProfile.name,
        targetUserId: selectedTeamSheet.employeeId,
        targetUserName: selectedTeamSheet.employeeName,
        sheetId: selectedTeamSheet.id,
        timestamp: serverTimestamp(),
        details: `Manager check-in for ${currentQ}: ${checkInComment}`,
      });
      toast.success('Manager check-in saved! ✅');
      setSelectedTeamSheet(null);
      setCheckInComment('');
    } catch (e) { toast.error('Save failed'); }
    setSaving(false);
  }

  if (loading) return <div style={styles.loading}>Loading check-in data...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Quarterly Check-in</h1>
          <p style={styles.subtitle}>Current Period: <span style={styles.qBadge}>{currentQ}</span></p>
        </div>
      </div>

      {/* My Check-in */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📊 My Achievement Update</h2>
        {!mySheet || mySheet.status !== 'approved' ? (
          <div style={styles.infoBox}>ℹ️ Your goal sheet must be approved by your manager before you can log achievements.</div>
        ) : (
          <>
            <div style={styles.goalsList}>
              {goals.map((goal, idx) => {
                const score = computeScore(goal.uomType, goal.target, goal.achievement, goal.targetDate, goal.completionDate);
                return (
                  <div key={idx} style={styles.goalCard}>
                    <div style={styles.goalHeader}>
                      <div>
                        <p style={styles.goalTitle}>{goal.title}</p>
                        <span style={styles.tag}>{goal.thrustArea}</span>
                        <span style={styles.tag}>{goal.weightage}% weight</span>
                      </div>
                      <div style={styles.scoreCircle} data-score={score}>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444' }}>{score.toFixed(0)}%</span>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>score</span>
                      </div>
                    </div>
                    <div style={styles.achievementGrid}>
                      <div style={styles.cell}>
                        <label style={styles.label}>Planned Target</label>
                        <p style={styles.planVal}>{goal.target || goal.targetDate || '-'}</p>
                      </div>
                      <div style={styles.cell}>
                        <label style={styles.label}>
                          {goal.uomType === 'timeline' ? 'Completion Date' : 'Actual Achievement'} *
                        </label>
                        {goal.uomType === 'timeline'
                          ? <input type="date" value={goal.completionDate || ''} onChange={e => updateGoalAchievement(idx, 'completionDate', e.target.value)} style={styles.input} />
                          : <input type="number" value={goal.achievement || ''} onChange={e => updateGoalAchievement(idx, 'achievement', e.target.value)} style={styles.input} placeholder="Enter actual" />
                        }
                      </div>
                      <div style={styles.cell}>
                        <label style={styles.label}>Status *</label>
                        <select value={goal.status || 'Not Started'} onChange={e => updateGoalAchievement(idx, 'status', e.target.value)} style={styles.select}>
                          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div style={styles.cell}>
                        <label style={styles.label}>Score Formula</label>
                        <p style={styles.formulaVal}>{UOM_TYPES.find(u => u.value === goal.uomType)?.formula || '-'}</p>
                      </div>
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${score}%`, background: score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={styles.actions}>
              <button onClick={saveCheckIn} disabled={saving} style={styles.saveBtn}>
                {saving ? 'Saving...' : `💾 Save ${currentQ} Check-in`}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Manager Team Check-ins */}
      {isManager && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>👥 Team Check-ins</h2>
          {selectedTeamSheet ? (
            <div>
              <button onClick={() => setSelectedTeamSheet(null)} style={styles.backBtn}>← Back to list</button>
              <h3 style={styles.h3}>{selectedTeamSheet.employeeName}'s {currentQ} Progress</h3>
              <div style={styles.goalsList}>
                {selectedTeamSheet.goals.map((goal, idx) => {
                  const score = computeScore(goal.uomType, goal.target, goal.achievement, goal.targetDate, goal.completionDate);
                  return (
                    <div key={idx} style={styles.teamGoalCard}>
                      <div style={styles.teamGoalRow}>
                        <p style={styles.goalTitle}>{goal.title}</p>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: '20px', color: score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444' }}>{score.toFixed(0)}%</p>
                          <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>{goal.status || 'Not Started'}</p>
                        </div>
                      </div>
                      <div style={styles.planActRow}>
                        <span style={styles.planAct}>📌 Target: {goal.target || goal.targetDate || '-'}</span>
                        <span style={styles.planAct}>✅ Actual: {goal.achievement || goal.completionDate || 'Not entered'}</span>
                        <span style={styles.planAct}>⚖️ Weight: {goal.weightage}%</span>
                      </div>
                      <div style={styles.progressBar}>
                        <div style={{ ...styles.progressFill, width: `${score}%`, background: score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={styles.commentSection}>
                <label style={styles.label}>Manager Check-in Comment *</label>
                <textarea value={checkInComment} onChange={e => setCheckInComment(e.target.value)} style={styles.textarea} placeholder={`Document your ${currentQ} discussion with ${selectedTeamSheet.employeeName}...`} />
              </div>
              <button onClick={saveManagerCheckIn} disabled={saving || !checkInComment.trim()} style={styles.saveBtn}>
                {saving ? 'Saving...' : '💬 Save Manager Check-in'}
              </button>
            </div>
          ) : (
            <div style={styles.teamList}>
              {teamSheets.length === 0 ? (
                <div style={styles.infoBox}>No approved team members found.</div>
              ) : (
                teamSheets.map(sheet => {
                  const hasCheckin = !!sheet.managerCheckIns?.[currentQ];
                  return (
                    <div key={sheet.id} style={styles.teamCard}>
                      <div style={styles.teamCardInfo}>
                        <div style={styles.avatar}>{sheet.employeeName?.[0]}</div>
                        <div>
                          <p style={styles.teamName}>{sheet.employeeName}</p>
                          <p style={styles.teamMeta}>{sheet.goals?.length} goals · {hasCheckin ? `✅ ${currentQ} done` : `⏳ ${currentQ} pending`}</p>
                        </div>
                      </div>
                      <button onClick={() => { setSelectedTeamSheet(sheet); setCheckInComment(sheet.managerCheckIns?.[currentQ]?.comment || ''); }} style={styles.viewBtn}>
                        {hasCheckin ? 'View Check-in →' : 'Start Check-in →'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '900px' },
  loading: { color: '#94a3b8', padding: '40px', textAlign: 'center' },
  header: { marginBottom: '24px' },
  h1: { margin: 0, fontSize: '28px', fontWeight: 800, color: '#f1f5f9' },
  h3: { color: '#f1f5f9', fontWeight: 700 },
  subtitle: { margin: '4px 0 0', color: '#64748b', fontSize: '14px' },
  qBadge: { background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', padding: '2px 10px', borderRadius: '20px', fontWeight: 700, fontSize: '12px' },
  section: { marginBottom: '40px' },
  sectionTitle: { fontSize: '20px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' },
  infoBox: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', color: '#94a3b8', fontSize: '14px' },
  goalsList: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' },
  goalCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '20px' },
  goalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  goalTitle: { margin: '0 0 8px', fontWeight: 700, color: '#f1f5f9', fontSize: '15px' },
  tag: { background: '#334155', color: '#94a3b8', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', marginRight: '6px' },
  scoreCircle: { background: '#0f172a', borderRadius: '12px', padding: '10px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px' },
  achievementGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '12px' },
  cell: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  planVal: { margin: 0, color: '#f1f5f9', fontWeight: 700, fontSize: '15px' },
  formulaVal: { margin: 0, color: '#8b5cf6', fontSize: '12px', fontStyle: 'italic' },
  input: { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#f1f5f9', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  select: { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#f1f5f9', fontSize: '14px', outline: 'none', width: '100%' },
  progressBar: { background: '#334155', borderRadius: '99px', height: '6px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '99px', transition: 'width 0.4s' },
  actions: { display: 'flex', justifyContent: 'flex-end' },
  saveBtn: { padding: '12px 28px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '14px' },
  backBtn: { background: '#334155', border: 'none', color: '#94a3b8', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', marginBottom: '16px' },
  teamList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  teamCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  teamCardInfo: { display: 'flex', alignItems: 'center', gap: '14px' },
  avatar: { width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#fff' },
  teamName: { margin: 0, fontWeight: 700, color: '#f1f5f9' },
  teamMeta: { margin: '4px 0 0', color: '#64748b', fontSize: '13px' },
  viewBtn: { padding: '10px 18px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px' },
  teamGoalCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px', marginBottom: '10px' },
  teamGoalRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  planActRow: { display: 'flex', gap: '20px', marginBottom: '10px' },
  planAct: { color: '#94a3b8', fontSize: '13px' },
  commentSection: { marginBottom: '16px' },
  textarea: { width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px', color: '#f1f5f9', fontSize: '14px', outline: 'none', minHeight: '90px', resize: 'vertical', boxSizing: 'border-box', marginTop: '8px' },
};
