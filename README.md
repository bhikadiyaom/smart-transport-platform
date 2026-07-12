# TransitOps — Smart Transport Operations Platform

TransitOps is a modern, high-fidelity enterprise fleet and transit management system built with the MERN stack (MongoDB, Express, React, Node.js). Featuring a premium Glassmorphic UI, robust Role-Based Access Control (RBAC), daily background alerts, and transactional data integrity, it streamlines vehicle registries, driver safety, dispatch operations, and financial analytics.

---

## 🎨 Premium Visual Identity & UI/UX Design

TransitOps has been fully redesigned to feature a cutting-edge **Glassmorphic interface** providing deep visual polish:
- **Frosted Glass Cards (`backdrop-filter`)**: Containers render with custom `rgba` transparency, saturated blur filters, and thin high-contrast borders for an ultra-premium layout.
- **Dynamic Background Mesh**: Moving radial gradients (indigo, violet, blue) float in the background and shine through transparent overlay panels.
- **Vibrant Status Badge System**: Availability states (Available, On Trip, In Shop, Retired, Suspended) are rendered as rounded pills with color-matched breathing pulse indicator dots.
- **Smooth Animations**: Interactivity is heightened with page transitions, count-up metric numbers, card-hover lift effects, form shake alerts, and staggered element entrances.
- **Skeleton Shimmer Loaders**: Data-heavy tables and grids render placeholder skeleton states during API fetches to prevent sudden layout shifts.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Tailwind CSS v3, React Router v6, Lucide React (Icons), Recharts (Visual Data Charts), React Hot Toast.
- **Backend**: Node.js, Express REST API, Nodemailer (Ethereal SMTP).
- **Database**: MongoDB Atlas, Mongoose ODM supporting multi-document transaction sessions.
- **Auth**: State-controlled JSON Web Tokens (JWT) with secure HTTP headers.

---

## ⚙️ Key Backend Features & Business Rules

### 1. Daily License Expiry Checks & Automated Alerts
- An automated daily background cron-like worker executes to check for drivers whose commercial licenses expire within **7 days**.
- Automates SMTP warning notifications to supervisors using Nodemailer.
- Outputs real-time log details with clickable **Ethereal Email Inbox Preview URLs** on startup.

### 2. Strict Database Transactions (Mongoose Sessions)
- **Dispatching Trips**: Verifies driver and vehicle availability, updates both statuses to `on_trip` and creates the new Trip log within a single database transaction. If one step fails, all changes revert.
- **Completing Trips**: Updates vehicle & driver to `available`, updates the trip state, and automatically registers a new Fuel Log using the trip distance.
- **Closing Maintenance**: Closing a maintenance ticket automatically restores the vehicle to `available` and updates the registry log.

### 3. Bulletproof Form & Field Validation
- Instant client-side feedback for capacity limits, license formatting, dates, and fuel efficiency.
- Express-level model validations preventing double-bookings, capacity violations (e.g., cargo load exceeding vehicle max payload), and duplicate key issues (e.g., registration or license numbers).

---

## 🔐 Role-Based Access Control (RBAC) Matrix

Users are restricted strictly to relevant modules. Buttons, sidebar links, actions, and routes are protected contextually.

| Role | Access Permissions | Demo Email |
| :--- | :--- | :--- |
| **Fleet Manager** | Full access to Fleet, Drivers, Maintenance Logs, and settings. Read-only Analytics. | `fleet@transitops.com` |
| **Dispatcher** | Full control over Trips. Read-only Fleet and Drivers. Cannot access Financials. | `dispatch@transitops.com` |
| **Safety Officer** | Read-only Drivers & Safety. Dedicated view for expired licenses. No write/delete access. | `safety@transitops.com` |
| **Financial Analyst** | Full access to Fuel & Expenses, Operational Costs, and Reports/Analytics. | `finance@transitops.com` |

> 🔑 **Demo Password for all accounts**: `TransitOps@2024`  
> *(Quick-login buttons are provided at the bottom of the Login Card for seamless testing)*

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure you have Node.js (v18+) and npm installed. Whitelist your IP (`0.0.0.0/0`) in your MongoDB Atlas Dashboard.

### 2. Install Dependencies
```bash
# Install server packages
cd server
npm install

# Install client packages
cd ../client
npm install
```

### 3. Configure Environments
Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_signing_token
EMAIL_USER=optional_smtp_user
EMAIL_PASS=optional_smtp_password
```

### 4. Seed Database
Inject clean, realistic mock data for vehicles, drivers, trips, fuel metrics, and maintenance tickets:
```bash
cd server
node seed/seed.js
```

### 5. Start Development Servers
Run both backend and frontend concurrently:
```bash
# Start Server (from /server)
npm run dev

# Start Client (from /client)
npm run dev
```
- Frontend will be active on: `http://localhost:5173`
- Backend API will run on: `http://localhost:5000`

---

## 📋 Walkthrough Demo Scenarios

1. **Verify Trip Dispatch Rules**:
   - Log in as the **Dispatcher**. Go to the **Trip Dispatcher** page.
   - Choose `Van-05` (Max capacity 600kg). Try inputting `700` kg of cargo. You will see a live capacity warning alert.
   - Change the weight to `450` kg and click **Dispatch**. The vehicle and driver status will instantly update to `On Trip`.

2. **Complete a Trip & Track Fuel**:
   - Locate the dispatched trip in the table list and click **Complete**.
   - Log in as the **Financial Analyst** and go to **Fuel & Expenses** — a fuel log has automatically been calculated and appended.

3. **Check Safety Logs**:
   - Log in as the **Safety Officer**. Open **Drivers & Safety**.
   - You will see a filtered, read-only list highlighting commercial licenses expiring soon or suspended.

4. **Explore the Glass Analytics Dashboard**:
   - Log in as the **Financial Analyst** and navigate to **Reports & Analytics**.
   - Check the **Overview Tab** for dynamic revenue area charts, **Costs Tab** for fuel vs maintenance breakdowns, and the **Vehicles Tab** to see the custom ROI badges and fuel efficiency progress bars.
