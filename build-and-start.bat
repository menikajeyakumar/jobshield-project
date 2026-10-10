@echo off
echo ===================================================
echo 🛡️ Building JobShield Frontend and Starting Server...
echo ===================================================

cd /d "%~dp0backend"
if not exist "%~dp0backend\app\ml\model.pkl" (
    echo [JobShield ML] Initializing ML model and training classifier...
    if exist "%~dp0backend\venv\Scripts\python.exe" (
        call "%~dp0backend\venv\Scripts\python.exe" inspect_db.py
    ) else (
        python inspect_db.py
    )
)

cd /d "%~dp0frontend"
echo [1/2] Building frontend (including ML Confidence UI)...
call npm run build

cd /d "%~dp0backend"
echo [2/2] Starting JobShield Server...
node server.js
pause

