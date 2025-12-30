@echo off
REM Setup script for RAG Cosmetic Chatbot (Windows)

echo ================================
echo RAG COSMETIC CHATBOT - SETUP
echo ================================
echo.

REM Check Python
echo [1/5] Checking Python...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python not found! Please install Python 3.11+
    pause
    exit /b 1
)
echo OK!
echo.

REM Create virtual environment
echo [2/5] Creating virtual environment...
if not exist "venv" (
    python -m venv venv
    echo Created venv
) else (
    echo venv already exists
)
echo.

REM Activate and install
echo [3/5] Installing dependencies...
call venv\Scripts\activate
pip install -r requirements.txt
echo.

REM Create directories
echo [4/5] Creating directories...
if not exist "data" mkdir data
if not exist "db_chroma" mkdir db_chroma
if not exist "chat_history" mkdir chat_history
echo.

REM Setup .env
echo [5/5] Setting up .env file...
if not exist ".env" (
    copy .env.example .env
    echo Created .env file
    echo IMPORTANT: Please edit .env and add your GOOGLE_API_KEY!
) else (
    echo .env already exists
)
echo.

echo ================================
echo SETUP COMPLETE!
echo ================================
echo.
echo Next steps:
echo 1. Edit .env file and add your Google API Key
echo 2. Put product_chunks.txt in data/ folder
echo 3. Run: python RAG_cosmetic.py
echo.
pause