// src/pages/Approvals.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { UOM_TYPES } from '../utils/seedData';
import toast from 'react-hot-toast';

export default function Approvals() {
  const { userProfile } = useAuth();
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [editGoals, setEditGoals] = useState([]);
  const [acting, setActing] = useState(false);

  useEffect(() => { if (userProfile) fetchPendingSheets(); }, [userProfile]);

  async function fetchPendingSheets() {
    setLoading(true);
    try {
      const q = query(collection(db, 'goalSheets'), where('managerId', '==', userProfile.uid), where('status', '==', 'submitted'));
      const snap = await getDocs(q);
      setSheets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { toast.error('Error loading approvals'); }
    setLoading(false);
  }

  function selectSheet(sheet) {
    setSelected(sheet);
    setEditGoals(JSON.parse(JSON.stringify(sheet.goals)));
    setComment('');
  }

  function updateEditGoal(idx, field, value) {
    const updated = [...editGoals];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditGoals(updated);
  }

  async function handleApprove() {
    if (!selected) return;
    const totalW = editGoals.reduce((s, g) => s + (parseFloat(g.weightage) || 0), 0);
    if (Math.round(totalW) !== 100) { toast.error('Total weightage must be 100% before approving'); return; }
    setActing(true);
    try {
      await updateDoc(doc(db, 'goalSheets', selected.id), {
        status: 'approved',
        goals: editGoals,
        managerComment: comment,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'auditLogs'), {
        action: 'GOAL_APPROVED',
        userId: userProfile.uid,
        userName: userProfile.name,
        targetUserId: selected.employeeId,
        targetUserName: selected.employeeName,
        sheetId: selected.id,
        timestamp: serverTimestamp(),
        details: `Manager approved goal sheet for ${selected.employeeName}. Comment: ${comment || 'None'}`,
      });
      toast.success(`Goals approved for ${selected.employeeName}! ✅`);
      setSelected(null);
      await fetchPendingSheets();
    } catch (e) { toast.error('Approval failed'); }
    setActing(false);
  }

  async function handleReject() {
    if (!selected) return;
    if (!comment.trim()) { toast.error('Please add a comment explaining what needs to be changed'); return; }
    setActing(true);
    try {
      await updateDoc(doc(db, 'goalSheets', selected.id), {
        status: 'rejected',
        managerComment: comment,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'auditLogs'), {
        action: 'GOAL_REJECTED',
        userId: userProfile.uid,
        userName: userProfile.name,
        targetUserId: selected.employeeId,
        targetUserName: selected.employeeName,
        sheetId: selected.id,
        timestamp: serverTimestamp(),
        details: `Manager returned goals for rework. Comment: ${comment}`,
      });
      toast.success(`Goal sheet returned to ${selected.employeeName} for rework`);
      setSelected(null);
      await fetchPendingSheets();
    } catch (e) { toast.error('Action failed'); }
    setActing(false);
  }

  if (loading) return <div style={styles.loading}>Loading pending approvals...</div>;

  if (selected) {
    const totalW = editGoals.reduce((s, g) => s + (parseFloat(g.weightage) || 0), 0);
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => setSelected(null)} style={styles.backBtn}>← Back</button>
          <div>
            <h1 style={styles.h1}>Reviewing: {selected.employeeName}</h1>
            <p style={styles.subtitle}>{selected.department} · {selected.goals.length} Goals</p>
          </div>
        </div>

        <div style={styles.weightCard}>
          <span style={styles.weightLabel}>Total Weightage: </span>
          <span style={{ ...styles.weightValue, color: Math.round(totalW) === 100 ? '#22c55e' : '#ef4444' }}>{totalW.toFixed(0)}%</span>
          <span style={styles.weightNote}> (must equal 100% to approve)</span>
        </div>

        {/* Editable Goals */}
        <div style={styles.goalsList}>
          {editGoals.map((goal, idx) => (
            <div key={idx} style={styles.goalCard}>
              <div style={styles.goalCardHeader}>
                <span style={styles.goalNum}>#{idx + 1}</span>
                <div style={{ flex: 1 }}>
                  <p style={styles.goalTitle}>{goal.title}</p>
                  <span style={styles.tag}>{goal.thrustArea}</span>
                </div>
              </div>
              <div style={styles.goalGrid}>
                <div style={styles.infoCell}>
                  <label style={styles.label}>UoM</label>
                  <p style={styles.infoVal}>{UOM_TYPES.find(u => u.value === goal.uomType)?.label || goal.uomType}</p>
                </div>
                <div style={styles.infoCell}>
                  <label style={styles.label}>Target</label>
                  <p style={styles.infoVal}>{goal.target || goal.targetDate}</p>
                </div>
                <div style={styles.infoCell}>
                  <label style={styles.label}>Weightage (%) — Editable</label>
                  <input
                    type="number"
                    min="10"
                    value={goal.weightage}
                    onChange={e => updateEditGoal(idx, 'weightage', e.target.value)}
                    style={styles.inlineInput}
                  />
                </div>
                <div style={styles.infoCell}>
                  <label style={styles.label}>Target — Editable</label>
                  {goal.uomType === 'timeline'
                    ? <input type="date" value={goal.targetDate} onChange={e => updateEditGoal(idx, 'targetDate', e.target.value)} style={styles.inlineInput} />
                    : <input type="number" value={goal.target} onChange={e => updateEditGoal(idx, 'target', e.target.value)} style={styles.inlineInput} />
                  }
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comment */}
        <div style={styles.commentSection}>
          <label style={styles.label}>Manager Comment (required for rejection)</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} style={styles.textarea} placeholder="Add feedback or notes for this employee..." />
        </div>

        <div style={styles.actions}>
          <button onClick={handleReject} disabled={acting} style={styles.rejectBtn}>
            {acting ? '...' : '↩ Return for Rework'}
          </button>
          <button onClick={handleApprove} disabled={acting} style={styles.approveBtn}>
            {acting ? '...' : '✅ Approve Goal Sheet'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.h1}>Pending Approvals</h1>
      <p style={styles.subtitle}>{sheets.length} goal sheet{sheets.length !== 1 ? 's' : ''} awaiting your review</p>

      {sheets.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ fontSize: '48px', margin: 0 }}>🎉</p>
          <p style={{ color: '#94a3b8' }}>No pending approvals. All caught up!</p>
        </div>
      ) : (
        <div style={styles.list}>
          {sheets.map(sheet => (
            <div key={sheet.id} style={styles.sheetCard}>
              <div style={styles.sheetInfo}>
                <div style={styles.avatar}>{sheet.employeeName?.[0]}</div>
                <div>
                  <p style={styles.sheetName}>{sheet.employeeName}</p>
                  <p style={styles.sheetMeta}>{sheet.department} · {sheet.goals?.length} goals · Submitted {sheet.submittedAt?.toDate?.()?.toLocaleDateString()}</p>
                </div>
              </div>
              <button onClick={() => selectSheet(sheet)} style={styles.reviewBtn}>Review →</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '900px' },
  loading: { color: '#94a3b8', padding: '40px', textAlign: 'center' },
  header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' },
  backBtn: { background: '#334155', border: 'none', color: '#94a3b8', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' },
  h1: { margin: 0, fontSize: '28px', fontWeight: 800, color: '#f1f5f9' },
  subtitle: { margin: '4px 0 0', color: '#64748b', fontSize: '14px' },
  weightCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', fontSize: '15px' },
  weightLabel: { color: '#94a3b8' },
  weightValue: { fontWeight: 800, fontSize: '20px' },
  weightNote: { color: '#64748b', fontSize: '13px' },
  goalsList: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' },
  goalCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '18px 20px' },
  goalCardHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' },
  goalNum: { width: '28px', height: '28px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 },
  goalTitle: { margin: 0, fontWeight: 700, color: '#f1f5f9', fontSize: '15px', marginBottom: '4px' },
  tag: { background: '#334155', color: '#94a3b8', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px' },
  goalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' },
  infoCell: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  infoVal: { margin: 0, color: '#f1f5f9', fontSize: '14px', fontWeight: 600 },
  inlineInput: { background: '#0f172a', border: '1px solid #3b82f6', borderRadius: '6px', padding: '8px 10px', color: '#f1f5f9', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  commentSection: { marginBottom: '24px' },
  textarea: { width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px', color: '#f1f5f9', fontSize: '14px', outline: 'none', minHeight: '90px', resize: 'vertical', boxSizing: 'border-box', marginTop: '6px' },
  actions: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  rejectBtn: { padding: '12px 24px', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: '10px', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '14px' },
  approveBtn: { padding: '12px 28px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '14px' },
  emptyState: { textAlign: 'center', padding: '60px', background: '#1e293b', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  sheetCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sheetInfo: { display: 'flex', alignItems: 'center', gap: '14px' },
  avatar: { width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#fff' },
  sheetName: { margin: 0, fontWeight: 700, color: '#f1f5f9', fontSize: '16px' },
  sheetMeta: { margin: '4px 0 0', color: '#64748b', fontSize: '13px' },
  reviewBtn: { padding: '10px 20px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer' },
};
