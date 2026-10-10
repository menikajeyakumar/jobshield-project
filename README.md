# 🛡️ JobShield — AI-Based Fake Opportunity Detection Platform

"Verify Before You Trust."

A full-stack web application designed to help students, job seekers, and freelancers verify job posts, internships, scholarships, courses, government schemes, and certificates for scam risk.

---

## 🚀 Quick Start (How to Run)

### Option 1: Double-Click Launcher (Easiest)
1. Open the `jobshield` folder.
2. Double-click **`start.bat`**.
3. Open your browser at: **`http://localhost:8000`**

### Option 2: Command Line
```bash
cd jobshield/backend
node server.js
```
Open **`http://localhost:8000`** in your browser.

---

## 🔑 Admin Credentials
- **Admin URL:** `http://localhost:8000/` (Opens automatically as default page)
- **Username:** `Menikaram`
- **Password:** `menika123`

---

## 📁 System Architecture & Features

### Left Sidebar Navigation
- **🔑 Admin Panel:** Manage user reports & confirmed scam patterns
- **📊 Analytics Dashboard:** Overview of scan statistics, risk levels, and categories
- **🔍 Check Opportunity:** Paste text, URL, or upload images/documents to scan for scams
- **📜 Scan History:** View recent verification scans
- **🏠 Landing Page:** Platform introduction
- **👤 User Auth:** Registration, Login, and Session management

### Technical Stack
- **Frontend:** React + Vite (Custom Left Sidebar Layout)
- **Node Server:** Express proxy & authentication API (Port 8000)
- **Python Backend:** FastAPI + SQLAlchemy + Tesseract OCR (Port 8001)
- **Database:** MySQL / SQLite
