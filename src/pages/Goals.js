// src/pages/Goals.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { THRUST_AREAS, UOM_TYPES } from '../utils/seedData';
import toast from 'react-hot-toast';

const EMPTY_GOAL = {
  thrustArea: '',
  title: '',
  description: '',
  uomType: '',
  target: '',
  targetDate: '',
  weightage: '',
  status: 'Not Started',
  achievement: '',
  completionDate: '',
};

export default function Goals() {
  const { userProfile } = useAuth();
  const [goalSheet, setGoalSheet] = useState(null);
  const [goals, setGoals] = useState([EMPTY_GOAL]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetId, setSheetId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ ...EMPTY_GOAL });

  useEffect(() => {
    if (userProfile) fetchGoalSheet();
  }, [userProfile]);

  async function fetchGoalSheet() {
    setLoading(true);
    try {
      const q = query(collection(db, 'goalSheets'), where('employeeId', '==', userProfile.uid), where('cycleYear', '==', new Date().getFullYear()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const sheetDoc = snap.docs[0];
        setSheetId(sheetDoc.id);
        setGoalSheet(sheetDoc.data());
        setGoals(sheetDoc.data().goals || []);
      } else {
        setGoalSheet(null);
      }
    } catch (e) {
      toast.error('Error loading goals');
    }
    setLoading(false);
  }

  const totalWeightage = goals.reduce((sum, g) => sum + (parseFloat(g.weightage) || 0), 0);
  const isLocked = goalSheet?.status === 'approved' || goalSheet?.status === 'submitted';
  const canEdit = !isLocked;

  function updateGoal(idx, field, value) {
    const updated = [...goals];
    updated[idx] = { ...updated[idx], [field]: value };
    setGoals(updated);
  }

  function removeGoal(idx) {
    if (goals.length <= 1) { toast.error('At least 1 goal required'); return; }
    setGoals(goals.filter((_, i) => i !== idx));
  }

  function validateGoals() {
    if (goals.length > 8) { toast.error('Maximum 8 goals allowed'); return false; }
    for (const g of goals) {
      if (!g.thrustArea || !g.title || !g.uomType || !g.target || !g.weightage) {
        toast.error('All required fields must be filled'); return false;
      }
      if (parseFloat(g.weightage) < 10) { toast.error('Each goal must have at least 10% weightage'); return false; }
    }
    if (Math.round(totalWeightage) !== 100) { toast.error(`Total weightage must be 100%. Current: ${totalWeightage}%`); return false; }
    return true;
  }

  async function saveAsDraft() {
    if (!validateGoals()) return;
    setSaving(true);
    try {
      const data = {
        employeeId: userProfile.uid,
        employeeName: userProfile.name,
        department: userProfile.department,
        managerId: userProfile.managerId,
        cycleYear: new Date().getFullYear(),
        status: 'draft',
        goals,
        updatedAt: serverTimestamp(),
      };
      if (sheetId) {
        await updateDoc(doc(db, 'goalSheets', sheetId), data);
      } else {
        data.createdAt = serverTimestamp();
        const ref = await addDoc(collection(db, 'goalSheets'), data);
        setSheetId(ref.id);
      }
      toast.success('Goals saved as draft!');
      await fetchGoalSheet();
    } catch (e) {
      toast.error('Save failed');
    }
    setSaving(false);
  }

  async function submitForApproval() {
    if (!validateGoals()) return;
    setSaving(true);
    try {
      const data = {
        employeeId: userProfile.uid,
        employeeName: userProfile.name,
        department: userProfile.department,
        managerId: userProfile.managerId,
        cycleYear: new Date().getFullYear(),
        status: 'submitted',
        goals,
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (sheetId) {
        await updateDoc(doc(db, 'goalSheets', sheetId), data);
        // log audit
        await addDoc(collection(db, 'auditLogs'), {
          action: 'GOAL_SUBMITTED',
          userId: userProfile.uid,
          userName: userProfile.name,
          sheetId,
          timestamp: serverTimestamp(),
          details: `Goal sheet submitted for approval with ${goals.length} goals`,
        });
      } else {
        data.createdAt = serverTimestamp();
        const ref = await addDoc(collection(db, 'goalSheets'), data);
        setSheetId(ref.id);
        await addDoc(collection(db, 'auditLogs'), {
          action: 'GOAL_SUBMITTED',
          userId: userProfile.uid,
          userName: userProfile.name,
          sheetId: ref.id,
          timestamp: serverTimestamp(),
          details: `Goal sheet submitted for approval with ${goals.length} goals`,
        });
      }
      toast.success('Goals submitted for manager approval! 🎉');
      await fetchGoalSheet();
    } catch (e) {
      toast.error('Submission failed');
    }
    setSaving(false);
  }

  function addGoal() {
    if (goals.length >= 8) { toast.error('Maximum 8 goals allowed'); return; }
    if (!newGoal.thrustArea || !newGoal.title || !newGoal.uomType || !newGoal.target || !newGoal.weightage) {
      toast.error('Fill all required fields'); return;
    }
    setGoals([...goals, { ...newGoal, status: 'Not Started', achievement: '', completionDate: '' }]);
    setNewGoal({ ...EMPTY_GOAL });
    setShowAddForm(false);
    toast.success('Goal added!');
  }

  const STATUS_COLORS = {
    draft: '#64748b',
    submitted: '#f59e0b',
    approved: '#22c55e',
    rejected: '#ef4444',
  };

  if (loading) return <div style={styles.loading}>Loading your goals...</div>;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>My Goal Sheet</h1>
          <p style={styles.subtitle}>FY {new Date().getFullYear()} — {userProfile?.department}</p>
        </div>
        <div style={styles.headerRight}>
          {goalSheet && (
            <span style={{ ...styles.statusBadge, background: STATUS_COLORS[goalSheet.status] + '33', color: STATUS_COLORS[goalSheet.status] }}>
              {goalSheet.status?.toUpperCase()}
            </span>
          )}
          {goalSheet?.status === 'rejected' && (
            <div style={styles.rejectedNote}>
              ⚠️ Returned for rework. Please update and resubmit.
            </div>
          )}
        </div>
      </div>

      {/* Weightage meter */}
      <div style={styles.weightCard}>
        <div style={styles.weightHeader}>
          <span style={styles.weightLabel}>Total Weightage</span>
          <span style={{ ...styles.weightValue, color: Math.round(totalWeightage) === 100 ? '#22c55e' : '#ef4444' }}>
            {totalWeightage.toFixed(0)}%
          </span>
        </div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${Math.min(totalWeightage, 100)}%`, background: Math.round(totalWeightage) === 100 ? '#22c55e' : totalWeightage > 100 ? '#ef4444' : '#3b82f6' }} />
        </div>
        <div style={styles.weightMeta}>
          <span style={styles.metaText}>{goals.length}/8 goals · Min 10% per goal · Total must = 100%</span>
          <span style={styles.metaText}>{canEdit ? '✏️ Editable' : '🔒 Locked'}</span>
        </div>
      </div>

      {/* Goals List */}
      <div style={styles.goalsList}>
        {goals.map((goal, idx) => (
          <GoalCard
            key={idx}
            goal={goal}
            idx={idx}
            canEdit={canEdit}
            onUpdate={(field, value) => updateGoal(idx, field, value)}
            onRemove={() => removeGoal(idx)}
            isShared={goal.isShared}
          />
        ))}
      </div>

      {/* Add Goal */}
      {canEdit && goals.length < 8 && (
        <div style={styles.addSection}>
          {!showAddForm ? (
            <button onClick={() => setShowAddForm(true)} style={styles.addBtn}>
              + Add New Goal
            </button>
          ) : (
            <div style={styles.addForm}>
              <h3 style={styles.addFormTitle}>New Goal</h3>
              <div style={styles.formGrid}>
                <div style={styles.formField}>
                  <label style={styles.label}>Thrust Area *</label>
                  <select value={newGoal.thrustArea} onChange={e => setNewGoal({ ...newGoal, thrustArea: e.target.value })} style={styles.select}>
                    <option value="">Select...</option>
                    {THRUST_AREAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Goal Title *</label>
                  <input value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })} style={styles.input} placeholder="e.g., Increase Sales Revenue" />
                </div>
                <div style={{ ...styles.formField, gridColumn: '1 / -1' }}>
                  <label style={styles.label}>Description</label>
                  <textarea value={newGoal.description} onChange={e => setNewGoal({ ...newGoal, description: e.target.value })} style={{ ...styles.input, minHeight: '70px', resize: 'vertical' }} placeholder="Describe what success looks like..." />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Unit of Measurement *</label>
                  <select value={newGoal.uomType} onChange={e => setNewGoal({ ...newGoal, uomType: e.target.value })} style={styles.select}>
                    <option value="">Select UoM...</option>
                    {UOM_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>{newGoal.uomType === 'timeline' ? 'Target Date *' : 'Target *'}</label>
                  {newGoal.uomType === 'timeline'
                    ? <input type="date" value={newGoal.targetDate} onChange={e => setNewGoal({ ...newGoal, targetDate: e.target.value })} style={styles.input} />
                    : <input type="number" value={newGoal.target} onChange={e => setNewGoal({ ...newGoal, target: e.target.value })} style={styles.input} placeholder="Enter target value" />
                  }
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Weightage (%) *</label>
                  <input type="number" min="10" max="100" value={newGoal.weightage} onChange={e => setNewGoal({ ...newGoal, weightage: e.target.value })} style={styles.input} placeholder="Min 10%" />
                </div>
              </div>
              <div style={styles.formActions}>
                <button onClick={() => setShowAddForm(false)} style={styles.cancelBtn}>Cancel</button>
                <button onClick={addGoal} style={styles.saveBtn}>Add Goal</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {canEdit && (
        <div style={styles.actions}>
          <button onClick={saveAsDraft} disabled={saving} style={styles.draftBtn}>
            {saving ? 'Saving...' : '💾 Save as Draft'}
          </button>
          <button onClick={submitForApproval} disabled={saving} style={styles.submitBtn}>
            {saving ? 'Submitting...' : '🚀 Submit for Approval'}
          </button>
        </div>
      )}

      {isLocked && goalSheet?.status === 'approved' && (
        <div style={styles.approvedBanner}>
          ✅ Your goal sheet has been approved by your manager. Goals are now locked. Use the Quarterly Check-in tab to update achievements.
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal, idx, canEdit, onUpdate, onRemove, isShared }) {
  const [expanded, setExpanded] = useState(idx === 0);

  return (
    <div style={styles.goalCard}>
      <div style={styles.goalCardHeader} onClick={() => setExpanded(!expanded)}>
        <div style={styles.goalCardLeft}>
          <span style={styles.goalNum}>#{idx + 1}</span>
          <div>
            <p style={styles.goalTitle}>{goal.title || 'Untitled Goal'}</p>
            <div style={styles.goalMeta}>
              {goal.thrustArea && <span style={styles.tag}>{goal.thrustArea}</span>}
              {isShared && <span style={{ ...styles.tag, background: '#7c3aed33', color: '#a78bfa' }}>🔗 Shared</span>}
              {goal.weightage && <span style={styles.tag}>{goal.weightage}%</span>}
              {goal.uomType && <span style={styles.tag}>{UOM_TYPES.find(u => u.value === goal.uomType)?.label?.split(' ')[0]}</span>}
            </div>
          </div>
        </div>
        <div style={styles.goalCardRight}>
          {canEdit && !isShared && (
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} style={styles.removeBtn}>✕</button>
          )}
          <span style={styles.chevron}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={styles.goalCardBody}>
          <div style={styles.formGrid}>
            <div style={styles.formField}>
              <label style={styles.label}>Thrust Area *</label>
              <select value={goal.thrustArea} onChange={e => onUpdate('thrustArea', e.target.value)} style={styles.select} disabled={!canEdit || isShared}>
                <option value="">Select...</option>
                {THRUST_AREAS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Goal Title *</label>
              <input value={goal.title} onChange={e => onUpdate('title', e.target.value)} style={styles.input} disabled={!canEdit || isShared} />
            </div>
            <div style={{ ...styles.formField, gridColumn: '1 / -1' }}>
              <label style={styles.label}>Description</label>
              <textarea value={goal.description} onChange={e => onUpdate('description', e.target.value)} style={{ ...styles.input, minHeight: '70px', resize: 'vertical' }} disabled={!canEdit || isShared} />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Unit of Measurement *</label>
              <select value={goal.uomType} onChange={e => onUpdate('uomType', e.target.value)} style={styles.select} disabled={!canEdit || isShared}>
                <option value="">Select UoM...</option>
                {UOM_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>{goal.uomType === 'timeline' ? 'Target Date *' : 'Target *'}</label>
              {goal.uomType === 'timeline'
                ? <input type="date" value={goal.targetDate} onChange={e => onUpdate('targetDate', e.target.value)} style={styles.input} disabled={!canEdit || isShared} />
                : <input type="number" value={goal.target} onChange={e => onUpdate('target', e.target.value)} style={styles.input} disabled={!canEdit || isShared} />
              }
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Weightage (%) *</label>
              <input type="number" min="10" max="100" value={goal.weightage} onChange={e => onUpdate('weightage', e.target.value)} style={styles.input} disabled={!canEdit} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '1000px' },
  loading: { color: '#94a3b8', padding: '40px', textAlign: 'center' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  h1: { margin: 0, fontSize: '28px', fontWeight: 800, color: '#f1f5f9' },
  subtitle: { margin: '4px 0 0', color: '#64748b', fontSize: '14px' },
  headerRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' },
  statusBadge: { padding: '6px 16px', borderRadius: '20px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.08em' },
  rejectedNote: { background: '#ef444422', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' },
  weightCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px', marginBottom: '24px' },
  weightHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  weightLabel: { color: '#94a3b8', fontSize: '14px', fontWeight: 600 },
  weightValue: { fontSize: '24px', fontWeight: 800 },
  progressTrack: { background: '#334155', borderRadius: '99px', height: '8px', overflow: 'hidden', marginBottom: '10px' },
  progressFill: { height: '100%', borderRadius: '99px', transition: 'width 0.4s ease' },
  weightMeta: { display: 'flex', justifyContent: 'space-between' },
  metaText: { fontSize: '12px', color: '#64748b' },
  goalsList: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' },
  goalCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', overflow: 'hidden' },
  goalCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', userSelect: 'none' },
  goalCardLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  goalNum: { width: '28px', height: '28px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 },
  goalTitle: { margin: 0, fontWeight: 700, color: '#f1f5f9', fontSize: '15px' },
  goalMeta: { display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' },
  tag: { background: '#334155', color: '#94a3b8', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px' },
  goalCardRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  removeBtn: { background: '#ef444422', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '14px' },
  chevron: { color: '#64748b', fontSize: '12px' },
  goalCardBody: { padding: '0 20px 20px', borderTop: '1px solid #334155' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '16px' },
  formField: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#f1f5f9', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  select: { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#f1f5f9', fontSize: '14px', outline: 'none', width: '100%' },
  addSection: { marginBottom: '24px' },
  addBtn: { width: '100%', padding: '16px', background: 'rgba(59,130,246,0.1)', border: '2px dashed #3b82f6', borderRadius: '16px', color: '#3b82f6', fontSize: '15px', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' },
  addForm: { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px' },
  addFormTitle: { margin: '0 0 20px', color: '#f1f5f9', fontWeight: 700 },
  formActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' },
  cancelBtn: { padding: '10px 20px', background: '#334155', border: 'none', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 },
  saveBtn: { padding: '10px 24px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 700 },
  actions: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  draftBtn: { padding: '12px 28px', background: '#334155', border: 'none', borderRadius: '10px', color: '#f1f5f9', fontSize: '15px', fontWeight: 700, cursor: 'pointer' },
  submitBtn: { padding: '12px 28px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer' },
  approvedBanner: { background: '#22c55e22', border: '1px solid #22c55e55', borderRadius: '12px', padding: '16px', color: '#22c55e', fontSize: '14px', marginTop: '20px' },
};
