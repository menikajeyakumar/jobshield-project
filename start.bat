@echo off
echo ===================================================
echo 🛡️ Starting JobShield 2.0 Application with ML Engine...
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

if not exist "%~dp0frontend\dist\index.html" (
    echo [JobShield Frontend] Dist build not found. Compiling frontend now...
    cd /d "%~dp0frontend"
    call npm run build
    cd /d "%~dp0backend"
)

node server.js
pause


