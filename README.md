# TransitOps — Smart Transport Operations Platform

Full-stack MERN application built for an 8-hour hackathon.

## Stack
- **Frontend**: React 18 + Tailwind CSS v3 (Vite)
- **Backend**: Node.js + Express REST API
- **Database**: MongoDB Atlas (Mongoose with multi-document transactions)
- **Auth**: JWT with role-based access control

## Quick Start

### 1. Whitelist your IP in MongoDB Atlas (required first)
1. Log in at **https://cloud.mongodb.com**
2. Go to **Security → Network Access → Add IP Address**
3. Click **"Allow Access From Anywhere"** → adds `0.0.0.0/0`
4. Click **Confirm** and wait ~30 seconds for it to activate

### 2. Seed the database
```bash
cd server
node seed/seed.js
```

### 3. Start the API server
```bash
cd server
npm run dev
# Runs on http://localhost:5000
```

### 4. Start the React frontend
```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

## Demo Accounts (all password: `TransitOps@2024`)
| Role | Email |
|------|-------|
| Fleet Manager | fleet@transitops.com |
| Dispatcher | dispatch@transitops.com |
| Safety Officer | safety@transitops.com |
| Financial Analyst | finance@transitops.com |

> **Quick login**: The login page has 4 one-click demo account buttons at the bottom.

## Demo Scenario (judges walkthrough)
1. Login as **Dispatcher** → go to Trip Dispatcher
2. Van-05 + Alex Kumar → 450kg → Mumbai Warehouse → Pune Distribution Centre (draft)
3. Click **Dispatch** → triggers 3-collection transaction → vehicle + driver → on_trip
4. Try creating a trip with 700kg in Van-05 (600kg max) → see live red callout
5. Click **Complete** on the dispatched trip → fuel log auto-created
6. Login as **Fleet Manager** → Maintenance → log service on MINI-03 → already in_shop
7. Login as **Financial Analyst** → Analytics → see ROI, fuel efficiency, monthly revenue chart

## Business Rules Enforced (Server-Side)
- ✅ Unique registration_no / license_no — E11000 → clean inline error
- ✅ Retired / In Shop vehicles excluded from dispatch dropdowns
- ✅ Expired or Suspended drivers excluded from dispatch dropdowns  
- ✅ Cargo > max_capacity_kg → 400 error with exact kg numbers
- ✅ All status transitions in MongoDB sessions (multi-document transactions)
- ✅ FuelLog auto-created on trip completion
- ✅ Maintenance close restores vehicle to available (unless retired)
- ✅ Account lockout after 5 failed login attempts (15-min auto-unlock)

## Project Structure
```
smart-transport-platform/
├── server/
│   ├── models/index.js        ← All 7 Mongoose schemas
│   ├── middleware/auth.js     ← JWT + RBAC
│   ├── controllers/           ← Business logic + transactions
│   ├── routes/                ← REST API endpoints
│   ├── seed/seed.js           ← Demo data
│   └── server.js
└── client/
    └── src/
        ├── api/index.js       ← Axios + interceptors
        ├── context/AuthContext.jsx  ← RBAC matrix
        ├── components/        ← Sidebar, Modal, StatusPill, CSVExport
        └── pages/             ← 9 pages
```
