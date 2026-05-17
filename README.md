# ⚡ AtomQuest — Goal Setting & Tracking Portal
**Hackathon 1.0 Submission**

A full-featured, role-based Goal Setting & Tracking Portal built for the AtomQuest Hackathon. Covers the complete goal lifecycle — creation, approval, quarterly check-ins, analytics, and audit trail — deployed on Firebase with zero backend infrastructure.

---

## 🔗 Live Demo

> **URL:** `https://YOUR_PROJECT_ID.web.app`
> **Status:** ✅ Live

| Role       | Email                        | Password    |
|------------|------------------------------|-------------|
| Employee   | employee@atomquest.com       | Demo@1234   |
| Manager    | manager@atomquest.com        | Demo@1234   |
| Admin / HR | admin@atomquest.com          | Demo@1234   |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React SPA (Frontend)                     │
│  React 18 · React Router v6 · Recharts · react-hot-toast   │
└───────────────────────┬─────────────────────────────────────┘
                        │ Firebase SDK (client-side)
          ┌─────────────┼──────────────┐
          ▼             ▼              ▼
   Firebase Auth   Firestore DB   Firebase Hosting
   (Email/PWD)   (NoSQL, Rules)  (CDN delivery)
```

### Why Firebase?
| Concern | Decision |
|---------|----------|
| **Cost** | Spark (free) tier handles demo comfortably. No server costs. |
| **Speed** | Zero backend to provision — deploy in minutes. |
| **Scale** | Firestore scales automatically; no DB config needed. |
| **Security** | Firestore Security Rules enforce role-based access at DB level. |
| **Hosting** | Firebase Hosting gives global CDN with `firebase deploy`. |

### Firestore Collections
```
users/          → uid → { name, role, department, managerId }
goalSheets/     → id  → { employeeId, managerId, goals[], status, checkIns, ... }
auditLogs/      → id  → { action, userId, sheetId, timestamp, details }
```

---

## 📁 Project Structure

```
src/
├── App.js                   # Routes + Protected Route logic
├── index.js                 # React entry point
├── firebase.js              # Firebase config
├── contexts/
│   └── AuthContext.js       # Auth state + role management
├── components/
│   └── Layout.js            # Sidebar navigation (role-aware)
├── pages/
│   ├── Login.js             # Login + demo account shortcuts
│   ├── Dashboard.js         # Role-specific home screen
│   ├── Goals.js             # Employee: create/edit/submit goals
│   ├── Approvals.js         # Manager: review + approve/reject
│   ├── CheckIn.js           # Employee + Manager quarterly check-ins
│   ├── TeamGoals.js         # Manager: team overview + push shared goals
│   ├── Analytics.js         # Admin: charts, KPIs, trends (BONUS)
│   └── AdminPages.js        # Admin: users, all goals, audit, reports, cycles
└── utils/
    └── seedData.js          # Constants, score formulas, demo seed helper
public/
└── index.html               # HTML shell + DM Sans font
firestore.rules              # Role-enforced DB security rules
firestore.indexes.json       # Composite query indexes
```

---

## 🚀 Setup in 4 Steps (Under 30 Minutes)

### Step 1 — Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `atomquest-goal-portal` → Continue
3. Disable Google Analytics (not needed) → **Create project**

### Step 2 — Enable Services
**Authentication:**
- Left sidebar → **Authentication** → Get started
- Sign-in methods tab → Enable **Email/Password**
- Users tab → **Add user** × 3:
  ```
  employee@atomquest.com  /  Demo@1234
  manager@atomquest.com   /  Demo@1234
  admin@atomquest.com     /  Demo@1234
  ```
  ⚠️ **Copy the UID shown for each user** — you'll need them in Step 4.

**Firestore:**
- Left sidebar → **Firestore Database** → Create database
- Choose **Start in test mode** → Select region → Done

**Hosting:**
- Left sidebar → **Hosting** → Get started → follow prompts

### Step 3 — Configure the App
1. Project Settings (⚙️) → **Your apps** → Add app → Web (`</>`)
2. Register app name → copy the `firebaseConfig` object
3. In the repo, open `src/firebase.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...",
};
```

### Step 4 — Seed Demo Users & Deploy
```bash
# Install dependencies
npm install

# Start locally to seed users first
npm start
```

1. Open the app → log in as `admin@atomquest.com / Demo@1234`
2. Go to **Manage Users** → click **🌱 Seed Demo Users**
3. Paste the 3 UIDs from Firebase Auth (comma-separated): `employeeUID,managerUID,adminUID`
4. Click **Seed Now** — profiles are created in Firestore

```bash
# Deploy Firestore rules + indexes
npm install -g firebase-tools
firebase login
firebase init   # select Firestore + Hosting, use existing project
firebase deploy
```

---

## 🎯 BRD Compliance Map

### Phase 1 — Goal Creation & Approval ✅
| Requirement | Implemented |
|-------------|-------------|
| Employee creates goal sheet | ✅ `Goals.js` — full form with all fields |
| Thrust Area selection | ✅ 8 areas dropdown |
| UoM types (Numeric, %, Timeline, Zero) | ✅ All 6 UoM variants supported |
| Weightage validation — total = 100% | ✅ Live progress meter, enforced on submit |
| Min weightage 10% per goal | ✅ Validated client-side + shown in UI |
| Max 8 goals | ✅ Add button disabled at 8 |
| Manager L1 approval workflow | ✅ `Approvals.js` — inline edit targets/weightage |
| Approve / Return for rework | ✅ Both actions with comment |
| Goals locked after approval | ✅ `isLocked` flag disables all inputs |
| Admin can unlock | ✅ `AdminAllGoals` → Unlock button |
| Shared Goals — push to employees | ✅ `TeamGoals.js` → Push Shared Goal panel |
| Recipients can only adjust weightage | ✅ `isShared` flag locks title/target |

### Phase 2 — Achievement Tracking ✅
| Requirement | Implemented |
|-------------|-------------|
| Quarterly achievement entry | ✅ `CheckIn.js` per-goal input |
| Status: Not Started / On Track / Completed | ✅ Dropdown per goal |
| Manager check-in with structured comment | ✅ Manager view + comment save |
| Score: Min Numeric/% | ✅ `Achievement ÷ Target × 100` |
| Score: Max Numeric/% | ✅ `Target ÷ Achievement × 100` |
| Score: Timeline | ✅ Completion date vs deadline |
| Score: Zero-based | ✅ `0 → 100%, else 0%` |
| Quarterly windows enforced | ✅ `getCurrentQuarter()` drives active period |

### Reporting & Governance ✅
| Requirement | Implemented |
|-------------|-------------|
| Achievement report (CSV export) | ✅ `AdminReports.js` → Export CSV |
| Completion dashboard | ✅ Check-in completion per quarter chart |
| Audit trail — who changed what, when | ✅ `auditLogs` collection, visible in Admin |

### Bonus Features ✅
| Feature | Implemented |
|---------|-------------|
| Analytics dashboard | ✅ `Analytics.js` — 5 interactive charts |
| QoQ achievement trends | ✅ Dept score bar chart |
| Completion heatmap | ✅ Quarter-by-quarter bar chart |
| Goal distribution by Thrust Area | ✅ Horizontal bar chart |
| Status pie chart | ✅ Donut chart |

---

## 📊 Demo Flow (Suggested for Judges)

### Journey 1 — Employee
1. Login as **Employee** → Dashboard shows empty state
2. Go to **My Goals** → Add 3 goals with different UoM types
3. Watch weightage meter track toward 100%
4. Hit **Submit for Approval**

### Journey 2 — Manager
1. Login as **Manager** → Pending Approvals badge
2. Go to **Pending Approvals** → open Employee's sheet
3. Edit a target inline → **Approve**
4. Go to **Team Goals** → **Push Shared Goal** to employee
5. Go to **Check-ins** → view team member progress → add check-in comment

### Journey 3 — Admin
1. Login as **Admin** → see org stats on Dashboard
2. **Analytics** → view all charts
3. **All Goals** → see all sheets, unlock one
4. **Audit Trail** → see full log of every action
5. **Reports** → click **Export CSV**

---

## ✅ Validation Rules (Enforced in Code)

```
Total Weightage:     must equal exactly 100% (enforced on Save + Submit)
Min per goal:        10% (validated, shown in error toast)
Max goals:           8 (Add button disabled, toast on attempt)
Manager comment:     required for rejection (enforced in Approvals.js)
Check-in:           only available for approved sheets
Shared goal fields: title + target read-only for employees
Audit log:          written on every state-changing action
```

---

## 💰 Cost Analysis

| Service | Usage | Cost |
|---------|-------|------|
| Firebase Auth | <10K users/month | **Free** |
| Firestore reads | ~50K/day (well under 50K free limit) | **Free** |
| Firestore writes | ~20K/day | **Free** |
| Firebase Hosting | 10 GB transfer/month | **Free** |
| **Total** | | **$0/month** |

For production scale (1,000+ employees): ~$5–15/month on Blaze plan.

---

## 🛠️ Tech Stack Summary

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 | Industry standard, fast, component-based |
| Routing | React Router v6 | Declarative, role-based guard routes |
| State | React Context + useState | No extra library needed at this scale |
| Database | Firebase Firestore | Real-time NoSQL, free tier, zero ops |
| Auth | Firebase Auth | Email/password built-in, secure |
| Charts | Recharts | Composable, responsive, no config |
| Hosting | Firebase Hosting | One command deploy, global CDN |
| Notifications | react-hot-toast | Lightweight, themed toasts |
| Fonts | DM Sans (Google Fonts) | Clean, professional, free |

---


*Built for AtomQuest Hackathon 1.0 — Goal Setting & Tracking Portal*
