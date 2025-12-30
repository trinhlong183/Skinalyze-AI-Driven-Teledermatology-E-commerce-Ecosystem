# Configuration file - Cấu hình cho RAG Cosmetic Chatbot
import os
from pathlib import Path

# =============================================================================
# DIRECTORIES - Đường dẫn thư mục
# =============================================================================
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
DB_DIR = BASE_DIR / "db_chroma"
HISTORY_DIR = BASE_DIR / "chat_history"

# Data files
CHUNKS_FILE = DATA_DIR / "product_chunks.txt"
CSV_FILE = DATA_DIR / "cosmetics.csv"

# =============================================================================
# MODEL SETTINGS - Cấu hình model
# =============================================================================
# Embedding model
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# Gemini model
GEMINI_TEXT_MODEL = "gemini-2.5-flash"
GEMINI_VISION_MODEL = "gemini-2.5-flash"

# =============================================================================
# RAG SETTINGS - Cấu hình RAG
# =============================================================================
# Retriever settings
RETRIEVER_K = 2  # Số chunks lấy ra
RETRIEVER_FETCH_K = 5  # Số chunks fetch trước khi filter
RETRIEVER_LAMBDA_MULT = 0.7  # MMR lambda

# LLM settings
LLM_TEMPERATURE = 0.1
LLM_MAX_OUTPUT_TOKENS = 512
LLM_MAX_RETRIES = 2

# =============================================================================
# CONVERSATION MEMORY
# =============================================================================
MAX_CONTEXT_MESSAGES = 3  # Số cặp hội thoại gần nhất để làm context

# =============================================================================
# SEVERITY LEVELS - Mức độ nghiêm trọng
# =============================================================================
SEVERITY_KEYWORDS = {
    'VERY_SEVERE': ['RẤT NẶNG', 'RẤT NGHIÊM TRỌNG', 'VERY SEVERE'],
    'SEVERE': ['NẶNG', 'SEVERE'],
    'MODERATE': ['TRUNG BÌNH', 'MODERATE'],
    'MILD': ['NHẸ', 'MILD']
}

# =============================================================================
# API KEYS - Khóa API (sử dụng .env trong production)
# =============================================================================
def get_api_key():
    """Lấy API key từ environment hoặc .env file"""
    # Ưu tiên lấy từ environment variable
    api_key = os.getenv('GOOGLE_API_KEY')
    
    if not api_key:
        # Nếu không có, thử load từ .env file
        try:
            from dotenv import load_dotenv
            load_dotenv()
            api_key = os.getenv('GOOGLE_API_KEY')
        except ImportError:
            pass
    
    return api_key
