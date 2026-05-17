// src/utils/seedData.js
// Run this ONCE from Admin panel to seed demo users
// Demo users must be created manually in Firebase Auth Console first, then this seeds their Firestore profiles

import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// After creating users in Firebase Auth Console, update these UIDs:
export const DEMO_CREDENTIALS = [
  { email: 'employee@atomquest.com', password: 'Demo@1234', role: 'employee', name: 'Arjun Sharma', department: 'Sales', managerId: 'MANAGER_UID_HERE' },
  { email: 'manager@atomquest.com', password: 'Demo@1234', role: 'manager', name: 'Priya Mehta', department: 'Sales', managerId: null },
  { email: 'admin@atomquest.com', password: 'Demo@1234', role: 'admin', name: 'Rahul Admin', department: 'HR', managerId: null },
];

export async function seedUserProfiles(users) {
  // users = [{ uid, email, role, name, department, managerId }]
  for (const user of users) {
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      role: user.role,
      name: user.name,
      department: user.department,
      managerId: user.managerId || null,
      createdAt: serverTimestamp()
    });
  }
}

export const THRUST_AREAS = [
  'Revenue Growth',
  'Customer Satisfaction',
  'Operational Excellence',
  'People Development',
  'Innovation',
  'Cost Optimization',
  'Compliance & Governance',
  'Digital Transformation'
];

export const UOM_TYPES = [
  { value: 'min_numeric', label: 'Min - Numeric (Higher is Better)', formula: 'Achievement ÷ Target' },
  { value: 'max_numeric', label: 'Max - Numeric (Lower is Better)', formula: 'Target ÷ Achievement' },
  { value: 'timeline', label: 'Timeline (Date-based)', formula: 'Completion Date vs Deadline' },
  { value: 'zero', label: 'Zero-based (0 = Success)', formula: 'If 0 → 100%, else 0%' },
  { value: 'min_percent', label: 'Min - Percentage (Higher is Better)', formula: 'Achievement ÷ Target' },
  { value: 'max_percent', label: 'Max - Percentage (Lower is Better)', formula: 'Target ÷ Achievement' },
];

export function computeScore(uomType, target, achievement, targetDate, completionDate) {
  if (achievement === null || achievement === undefined || achievement === '') return 0;
  const ach = parseFloat(achievement);
  const tgt = parseFloat(target);

  switch (uomType) {
    case 'min_numeric':
    case 'min_percent':
      return tgt > 0 ? Math.min((ach / tgt) * 100, 100) : 0;
    case 'max_numeric':
    case 'max_percent':
      return ach > 0 ? Math.min((tgt / ach) * 100, 100) : 0;
    case 'zero':
      return ach === 0 ? 100 : 0;
    case 'timeline':
      if (!completionDate || !targetDate) return 0;
      const deadline = new Date(targetDate);
      const completed = new Date(completionDate);
      return completed <= deadline ? 100 : 0;
    default:
      return 0;
  }
}

export function getCurrentQuarter() {
  const month = new Date().getMonth() + 1;
  if (month >= 5 && month <= 6) return 'goal_setting';
  if (month >= 7 && month <= 9) return 'Q1';
  if (month >= 10 && month <= 12) return 'Q2';
  if (month >= 1 && month <= 3) return 'Q3';
  if (month >= 3 && month <= 4) return 'Q4';
  return 'Q1';
}

export const STATUS_OPTIONS = ['Not Started', 'On Track', 'Completed', 'At Risk'];
