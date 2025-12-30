#!/bin/bash
# Setup script for RAG Cosmetic Chatbot (Linux/Mac)

echo "================================"
echo "RAG COSMETIC CHATBOT - SETUP"
echo "================================"
echo ""

# Check Python
echo "[1/5] Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python not found! Please install Python 3.11+"
    exit 1
fi
python3 --version
echo "OK!"
echo ""

# Create virtual environment
echo "[2/5] Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "Created venv"
else
    echo "venv already exists"
fi
echo ""

# Activate and install
echo "[3/5] Installing dependencies..."
source venv/bin/activate
pip install -r requirements.txt
echo ""

# Create directories
echo "[4/5] Creating directories..."
mkdir -p data db_chroma chat_history
echo ""

# Setup .env
echo "[5/5] Setting up .env file..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "Created .env file"
    echo "IMPORTANT: Please edit .env and add your GOOGLE_API_KEY!"
else
    echo ".env already exists"
fi
echo ""

echo "================================"
echo "SETUP COMPLETE!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Edit .env file and add your Google API Key"
echo "2. Put product_chunks.txt in data/ folder"
echo "3. Run: python RAG_cosmetic.py"
echo ""