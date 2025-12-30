import os
import re
import pandas as pd
from pathlib import Path
import chromadb
from langchain_community.document_loaders import TextLoader
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
import torch
import time
from getpass import getpass
from PIL import Image
import google.generativeai as genai
from datetime import datetime
import json
import base64
import io
from dotenv import load_dotenv

# =============================================================================
# CẤU HÌNH HỆ THỐNG
# =============================================================================
# Sử dụng đường dẫn động để tránh lỗi hardcode C:\FPT...
CURRENT_DIR = Path(__file__).parent.resolve()
CHUNKS_FILE = CURRENT_DIR / "data" / "product_chunks.txt"
PERSIST_DIRECTORY = CURRENT_DIR / "db_chroma_v2"
CHAT_HISTORY_DIR = CURRENT_DIR / "chat_history"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# TEST MODE
TEST_MODE = True  # Đổi thành True để test nhanh
MAX_TEST_CHUNKS = 200  # Số chunks dùng khi TEST_MODE = True

# Global cache cho embeddings
_CACHED_EMBEDDINGS = None

# Tỷ giá USD → VND (cố định)
USD_TO_VND = 26349

# =============================================================================
# DATA MAPPING (MỚI)
# =============================================================================
SKIN_CONDITION_TO_SKIN_TYPE = {
    # ⚠️ ƯU TIÊN: Từ khóa DÀI/CỤ THỂ trước, NGẮN/CHUNG sau để tránh nhầm lẫn
    
    # Mụn cóc (warts) - ƯU TIÊN TRƯỚC "mụn"
    "warts": ["Hỗn hợp", "Khô", "Thường", "Dầu", "Nhạy cảm"],
    "mụn cóc": ["Hỗn hợp", "Khô", "Thường", "Dầu", "Nhạy cảm"],
    "cóc": ["Hỗn hợp", "Khô", "Thường", "Dầu", "Nhạy cảm"],
    
    # Mụn trứng cá - SAU "mụn cóc", TRƯỚC "mụn"
    "mụn trứng cá": ["Hỗn hợp", "Dầu", "Nhạy cảm"],
    
    # Mụn (acne) - CUỐI CÙNG
    "acne": ["Hỗn hợp", "Dầu", "Nhạy cảm"],
    "mụn": ["Hỗn hợp", "Dầu", "Nhạy cảm"],
    
    # Các bệnh khác
    "actinic keratosis": ["Khô", "Thường"],  # Dày sừng
    "da dày sừng": ["Khô", "Thường"],
    "dày sừng": ["Khô", "Thường"],
    
    "drug eruption": ["Hỗn hợp", "Khô", "Thường", "Dầu", "Nhạy cảm"],  # Phát ban thuốc
    "phát ban do thuốc": ["Hỗn hợp", "Khô", "Thường", "Dầu", "Nhạy cảm"],
    "phát ban thuốc": ["Hỗn hợp", "Khô", "Thường", "Dầu", "Nhạy cảm"],
    
    "eczema": ["Hỗn hợp", "Khô", "Thường", "Dầu", "Nhạy cảm"],  # Chàm
    "chàm": ["Hỗn hợp", "Khô", "Thường", "Dầu", "Nhạy cảm"],
    "viêm da": ["Hỗn hợp", "Khô", "Thường", "Dầu", "Nhạy cảm"],
    
    "psoriasis": ["Khô"],  # Vảy nến
    "vảy nến": ["Khô"],
    
    "rosacea": ["Hỗn hợp", "Dầu", "Nhạy cảm"],  # Trứng cá đỏ
    "trứng cá đỏ": ["Hỗn hợp", "Dầu", "Nhạy cảm"],
    "da đỏ": ["Hỗn hợp", "Dầu", "Nhạy cảm"],
    
    "seborrheic keratoses": ["Thường", "Dầu", "Nhạy cảm"],  # Viêm da tiết bã
    "viêm da tiết bã": ["Thường", "Dầu", "Nhạy cảm"],
    
    "sun damage": ["Hỗn hợp", "Khô", "Thường", "Nhạy cảm"],  # Tổn thương nắng
    "hư tổn do nắng": ["Hỗn hợp", "Khô", "Thường", "Nhạy cảm"],
    "tổn thương nắng": ["Hỗn hợp", "Khô", "Thường", "Nhạy cảm"],
    
    "tinea": ["Hỗn hợp", "Dầu"],  # Nấm da
    "nấm da": ["Hỗn hợp", "Dầu"],
    "nấm": ["Hỗn hợp", "Dầu"],
}

# Danh sách bệnh da được hỗ trợ tư vấn (Giữ lại từ file cũ để dùng cho hàm check cũ)
SUPPORTED_SKIN_CONDITIONS = [
    "mụn", "acne", "mụn trứng cá",
    "chàm", "eczema", "viêm da",
    "vảy nến", "psoriasis",
    "trứng cá đỏ", "rosacea", "da đỏ",
    "dày sừng", "actinic keratosis", "da dày sừng",
    "nấm da", "tinea", "nấm",
    "viêm da tiết bã", "seborrheic keratoses",
    "tổn thương nắng", "sun damage", "hư tổn do nắng",
    "mụn cóc", "warts", "cóc",
    "phát ban thuốc", "drug eruption", "phát ban do thuốc"
]

# =============================================================================
# CORE FUNCTIONS (TỪ FILE MỚI)
# =============================================================================

def detect_skin_condition_and_types(query):
    """
    Phát hiện bệnh da trong câu hỏi và trả về loại da phù hợp
    Returns: (detected_condition, skin_types_list) hoặc (None, None)
    
    ⚠️ ƯU TIÊN: Kiểm tra từ khóa DÀI trước (mụn cóc) rồi mới đến NGẮN (mụn)
    để tránh nhầm lẫn khi "mụn cóc" chứa từ "mụn"
    """
    query_lower = query.lower()
    
    # Sắp xếp theo độ dài từ khóa (dài -> ngắn) để ưu tiên match cụ thể trước
    sorted_conditions = sorted(
        SKIN_CONDITION_TO_SKIN_TYPE.items(),
        key=lambda x: len(x[0]),  # Sắp xếp theo độ dài từ khóa
        reverse=True  # Từ dài đến ngắn
    )
    
    for condition, skin_types in sorted_conditions:
        if condition in query_lower:
            return condition, skin_types
    
    return None, None

def extract_product_name(chunk_text):
    """Trích xuất tên sản phẩm từ chunk text"""
    # Tìm "Product Name: ..."
    match = re.search(r'Product Name:\s*(.+?)(?:\n|$)', chunk_text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    
    # Tìm "Tên sản phẩm: ..."
    match = re.search(r'Tên sản phẩm:\s*(.+?)(?:\n|$)', chunk_text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    
    # Fallback: lấy dòng đầu tiên
    lines = chunk_text.split('\n')
    for line in lines:
        if ':' in line:
            # Lấy phần sau dấu : đầu tiên
            potential_name = line.split(':', 1)[1].strip()
            if len(potential_name) > 5:  # Tên sản phẩm thường dài hơn 5 ký tự
                return potential_name
    
    return "Unknown Product"

def extract_field_from_chunk(chunk_text, field_name):
    """Trích xuất giá trị của field từ chunk text"""
    # Tìm "Field_name: value"
    pattern = rf'{field_name}:\s*(.+?)(?:\n|$)'
    match = re.search(pattern, chunk_text, re.IGNORECASE)
    
    if match:
        value = match.group(1).strip()
        # Loại bỏ các ký tự đặc biệt không mong muốn
        value = value.replace('---', '').strip()
        if value and value != 'N/A':
            return value
    
    return None

def convert_price_in_text(text):
    """Tìm và chuyển đổi giá USD sang VND trong text"""
    # Tìm pattern: $XX hoặc $XX.XX
    def replace_price(match):
        price_str = match.group(1)
        try:
            price_usd = float(price_str)
            price_vnd = int(price_usd * USD_TO_VND)
            # Format: $XX (≈ XXX.XXX VND)
            return f"${price_usd:.0f} (≈ {price_vnd:,} VND)".replace(',', '.')
        except:
            return match.group(0)
    
    # Thay thế tất cả $XX hoặc $XX.XX
    result = re.sub(r'\$([0-9]+(?:\.[0-9]+)?)', replace_price, text)
    return result

def setup_api_key():
    """Thiết lập Google API Key"""
    if "GOOGLE_API_KEY" not in os.environ:
        print("\n🔑 Cần Google API Key để sử dụng Gemini")
        print("💡 Lấy key miễn phí tại: https://makersuite.google.com/app/apikey\n")
        load_dotenv()
        print("✅ Đã thiết lập API Key!\n")
    else:
        print("✅ API Key đã được cấu hình sẵn!\n")
    
    # Configure genai for vision
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

def load_or_create_vectorstore():
    """Load vector store có sẵn hoặc tạo mới nếu chưa có, với error handling."""
    global _CACHED_EMBEDDINGS
    
    print("=" * 80)
    print("📚 KHỞI TẠO VECTOR STORE")
    print("=" * 80)
    
    db = None
    embeddings = None
    
    try: # <<< Try chính bao quanh toàn bộ hàm >>>
        
        # ----- Tải Embedding Model (với cache) -----
        if _CACHED_EMBEDDINGS is not None:
            print(f"\n⚡ Sử dụng cached embedding model")
            embeddings = _CACHED_EMBEDDINGS
        else:
            print(f"\n⏳ Đang tải embedding model: {MODEL_NAME}...")
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
            print(f"    🖥️ Sử dụng thiết bị: {device}")
            
            try: # <<< Try cho việc tải embedding model >>>
                embeddings = HuggingFaceEmbeddings(
                    model_name=MODEL_NAME,
                    model_kwargs={'device': device},
                    encode_kwargs={'normalize_embeddings': True}
                )
                _CACHED_EMBEDDINGS = embeddings  # Cache lại
                print("✅ Đã tải embedding model!\n")
            except Exception as e_embed_load:
                print(f"\n❌ LỖI NGHIÊM TRỌNG khi tải embedding model: {e_embed_load}")
                print("    Kiểm tra lại tên model, kết nối mạng và cài đặt thư viện.")
                return None, None # Trả về None nếu không tải được model

        # ----- Load hoặc Tạo Database -----
        if os.path.exists(PERSIST_DIRECTORY):
            print(f"📂 Phát hiện Vector Store có sẵn tại: {PERSIST_DIRECTORY}")
            print("⏳ Đang load database...\n")
            
            try: # <<< Try cho việc load DB có sẵn >>>
                db = Chroma(
                    persist_directory=str(PERSIST_DIRECTORY),
                    embedding_function=embeddings
                )
                
                # Kiểm tra xem collection có dữ liệu không
                count = db._collection.count() if db._collection else 0
                
                print(f"✅ Đã load Vector Store thành công!")
                print(f"    📊 Số documents trong database: {count}\n")
                if count == 0:
                     print("    ⚠️ Cảnh báo: Database có sẵn nhưng không có document nào.")

            except Exception as e_db_load:
                print(f"\n❌ LỖI khi load Vector Store có sẵn: {e_db_load}")
                print(f"    Thử xóa thư mục '{PERSIST_DIRECTORY}' và chạy lại để tạo mới.")
                return None, embeddings # Trả về embeddings đã load được, nhưng db là None
                
        else:
            print(f"🆕 Không tìm thấy Vector Store. Đang tạo mới từ {CHUNKS_FILE.name}...\n")
            
            # --- Các bước tạo DB mới ---
            docs = None
            try: # <<< Try cho việc load và split file chunks >>>
                # 1. Load file chunks
                print("📖 [1/4] Đang load file chunks...")
                if not CHUNKS_FILE.exists():
                     raise FileNotFoundError(f"File chunk không tồn tại tại: {CHUNKS_FILE}")
                loader = TextLoader(str(CHUNKS_FILE), encoding='utf-8')
                documents = loader.load()
                print(f"    ✓ Đã load {len(documents)} document base")
                
                # 2. Split documents
                print("✂️  [2/4] Đang split thành từng chunk và thêm metadata...")
                text_splitter = RecursiveCharacterTextSplitter(
                    separators=["---"], # Tách theo dấu ---
                    chunk_size=800,   # Tăng lên 800 để giữ thông tin đầy đủ hơn
                    chunk_overlap=100,  # Tăng overlap để không bỏ sót context
                    length_function=len
                )
                docs = text_splitter.split_documents(documents)
                if not docs:
                     print("    ⚠️ Cảnh báo: Không split được chunk nào. Kiểm tra file và separator.")
                     return None, embeddings # Không có docs để tạo DB
                
                # THÊM METADATA product_name cho mỗi chunk
                for doc in docs:
                    product_name = extract_product_name(doc.page_content)
                    doc.metadata['product_name'] = product_name
                
                # TEST MODE: Giới hạn số lượng chunks nếu đang test
                if TEST_MODE and len(docs) > MAX_TEST_CHUNKS:
                    print(f"    ⚠️ TEST MODE: Chỉ xử lý {MAX_TEST_CHUNKS}/{len(docs)} chunks đầu tiên")
                    docs = docs[:MAX_TEST_CHUNKS]
                
                print(f"    ✓ Đã split thành {len(docs)} chunks với metadata product_name")
                
            except FileNotFoundError as e_file:
                 print(f"\n❌ LỖI: {e_file}")
                 return None, embeddings
            except Exception as e_load_split:
                 print(f"\n❌ LỖI khi load hoặc split file chunks: {e_load_split}")
                 return None, embeddings

            # --- Tạo embeddings và lưu ---
            try: # <<< Try cho việc tạo DB mới và thêm docs >>>
                print("💾 [3/4] Đang tạo embeddings và lưu vào database...")
                print("    (Quá trình này có thể mất vài phút, vui lòng đợi...)\n")
                
                start_time = time.time()
                
                # Xử lý theo batch
                batch_size = 50 # Giảm batch size nếu gặp lỗi bộ nhớ
                total_docs = len(docs)
                
                if total_docs == 0:
                     print("    ⚠️ Không có chunk nào để thêm vào database.")
                     return None, embeddings # Không thể tạo DB rỗng theo cách này

                if total_docs <= batch_size:
                    # Nếu ít docs thì tạo một lần
                    print(f"    ⏳ Đang xử lý {total_docs} documents...")
                    db = Chroma.from_documents(
                        documents=docs,
                        embedding=embeddings,
                        persist_directory=str(PERSIST_DIRECTORY)
                    )
                    print(f"    ✓ Đã xử lý {total_docs} documents")
                else:
                    # Nếu nhiều docs thì chia batch
                    print(f"    ⏳ Đang xử lý theo batch ({batch_size} docs/batch)...")
                    total_batches = (total_docs - 1) // batch_size + 1
                    
                    # Batch đầu tiên - tạo database
                    current_batch_docs = docs[:batch_size]
                    batch_start_time = time.time()
                    print(f"    → Batch 1/{total_batches}: docs 0-{len(current_batch_docs)} ... ", end='', flush=True)
                    db = Chroma.from_documents(
                        documents=current_batch_docs,
                        embedding=embeddings,
                        persist_directory=str(PERSIST_DIRECTORY)
                    )
                    batch_time = time.time() - batch_start_time
                    print(f"✓ ({batch_time:.1f}s)")
                    
                    # Các batch tiếp theo - thêm vào database
                    for i in range(batch_size, total_docs, batch_size):
                        batch_start = i
                        batch_end = min(i + batch_size, total_docs)
                        current_batch_docs = docs[batch_start:batch_end]
                        batch_num = (i // batch_size) + 1
                        
                        batch_start_time = time.time()
                        print(f"    → Batch {batch_num}/{total_batches}: docs {batch_start}-{batch_end} ... ", end='', flush=True)
                        if not current_batch_docs: # Kiểm tra batch rỗng (dư thừa nhưng an toàn)
                             continue
                        
                        try:
                            db.add_documents(current_batch_docs)
                            batch_time = time.time() - batch_start_time
                            print(f"✓ ({batch_time:.1f}s)")
                        except Exception as batch_error:
                            print(f"❌ Lỗi: {batch_error}")
                            # Tiếp tục với batch tiếp theo
                        
                        # Giải phóng bộ nhớ GPU nếu dùng CUDA
                        if device == 'cuda':
                            torch.cuda.empty_cache()
                
                end_time = time.time()
            
                print(f"\n    ✓ Hoàn thành sau {end_time - start_time:.2f} giây")
                # Kiểm tra lại số lượng sau khi tạo
                count_after_create = db._collection.count() if db and db._collection else 0
                print(f"    📊 Đã tạo và lưu {count_after_create} vectors")
                if count_after_create != total_docs:
                     print(f"    ⚠️ Cảnh báo: Số vector lưu ({count_after_create}) không khớp số chunk ({total_docs}).")

                print("\n✅ Đã tạo Vector Store thành công!")

            except Exception as e_db_create:
                 print(f"\n❌ LỖI NGHIÊM TRỌNG khi tạo/lưu Vector Store mới: {e_db_create}")
                 print(f"    Thử kiểm tra dung lượng ổ đĩa, quyền ghi vào '{PERSIST_DIRECTORY}', hoặc giảm 'batch_size'.")
                 # Xóa thư mục có thể bị tạo dở dang
                 if os.path.exists(PERSIST_DIRECTORY):
                      try:
                           import shutil
                           shutil.rmtree(PERSIST_DIRECTORY)
                           print(f"    Đã xóa thư mục '{PERSIST_DIRECTORY}' có thể bị lỗi.")
                      except Exception as e_del:
                           print(f"    Không thể xóa thư mục lỗi '{PERSIST_DIRECTORY}': {e_del}")
                 db = None # Đặt lại db thành None vì tạo lỗi
                 return None, embeddings # Trả về embeddings nhưng db là None

    except Exception as e_global: 
         print(f"\n❌ ĐÃ XẢY RA LỖI KHÔNG XÁC ĐỊNH: {e_global}")
         return None, None 

    return db, embeddings

def setup_rag_chain(db):
    """Thiết lập RAG chain với Retriever, LLM và Prompt"""
    print("\n" + "=" * 80)
    print("⛓️ KHỞI TẠO RAG CHAIN")
    print("=" * 80)
    
    # Check if db is None
    if db is None:
        print("\n❌ LỖI: Vector store chưa được khởi tạo thành công!")
        return None
    
    # 1. Khởi tạo LLM (tối ưu cho 2-3 sản phẩm ĐỒNG NHẤT)
    print("\n🤖 [1/3] Đang kết nối với Google Gemini...")
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
        temperature=0.3,  
        max_output_tokens=2000,  
        convert_system_message_to_human=True,
        request_timeout=90,
        max_retries=3  
    )
    print("    ✓ Đã kết nối Gemini 2.5 Flash (tối ưu cho server: 2-3 sản phẩm ĐỒNG NHẤT)")
    
    # 2. Tạo Retriever (tăng khả năng tìm kiếm)
    print("🔍 [2/3] Đang tạo Retriever...")
    retriever = db.as_retriever(
        search_type="similarity",  
        search_kwargs={
            "k": 30  # Tăng lên 30 để đảm bảo tìm đủ chunks cho nhiều sản phẩm
        }
    )
    print("    ✓ Retriever: tìm 30 chunks relevant nhất (similarity search)")
    
    # 3. Tạo Prompt Template
    print("📝 [3/3] Đang tạo Prompt Template...")
    template = """You are a strict assistant. You must answer questions based ONLY on the provided context below. DO NOT use your internal knowledge to update or guess prices. If the price is not mentioned in the context, say 'Price not available'.

Bạn là chuyên gia tư vấn mỹ phẩm chuyên nghiệp, thân thiện và hiểu tâm lý khách hàng, KHÔNG PHẢI BÁC SĨ.

- Mục tiêu: Giúp người dùng tìm sản phẩm làm sạch, dưỡng ẩm, bảo vệ da phù hợp với tình trạng của họ.
- Không dùng các từ khẳng định chữa bệnh như: "trị dứt điểm", "thuốc", "cam kết khỏi".
- Hãy dùng các từ: "hỗ trợ", "làm dịu", "cải thiện", "giúp da khỏe hơn".

PHÂN LOẠI CÂU HỎI VÀ CÁCH TRẢ LỜI:

🔹 **CHÀO HỎI/GIAO TIẾP CƠ BẢN**
Câu hỏi: "xin chào", "hi", "hello", "chào bạn", "hey"
→ "Chào bạn! 👋 Mình là trợ lý tư vấn mỹ phẩm. Bạn muốn tìm sản phẩm gì hôm nay? 😊"

🔹 **HỎI VỀ CHỨC NĂNG/GIỚI THIỆU**
Câu hỏi: "bạn là ai", "bạn làm gì", "có thể giúp gì", "bạn biết gì"
→ "Mình là chuyên gia tư vấn mỹ phẩm! 💄 Mình có thể giúp bạn:
• Tìm sản phẩm theo loại da (khô, dầu, nhạy cảm, hỗn hợp, thường)
• Tư vấn sản phẩm theo BỆNH DA (mụn, chàm, vảy nến, trứng cá đỏ, nấm da...)
• Tư vấn kem dưỡng, serum, toner, mặt nạ, sữa rửa mặt, kem chống nắng
• Giải thích thành phần và công dụng sản phẩm
• Gợi ý routine chăm sóc da
Bạn đang gặp vấn đề gì về da hoặc cần tìm sản phẩm nào? 😊"

🔹 **HỎI CHUNG CHUNG KHÔNG CỤ THỂ**
Câu hỏi: "có sản phẩm gì", "cho xem sản phẩm", "gợi ý sản phẩm", "bạn có thể cho mấy sản phẩm"
→ "Mình có rất nhiều sản phẩm! 😊 Để tư vấn chính xác, bạn cho mình biết:
• Loại da của bạn? (khô/dầu/hỗn hợp/nhạy cảm/thường)
• Bệnh da (nếu có)? (mụn/chàm/vảy nến/trứng cá đỏ/nấm da...)
• Loại sản phẩm cần? (kem dưỡng/serum/toner/mặt nạ/sữa rửa mặt...)
• Hoặc vấn đề da bạn muốn giải quyết? (mụn/thâm/lão hóa/dưỡng ẩm...)
Cho mình biết để mình tư vấn đúng nhu cầu nhé! 💕"

🔹 **HỎI VỀ BỆNH DA (ƯU TIÊN CAO)**
Câu hỏi: "tôi bị mụn", "tôi bị chàm", "da bị vảy nến", "bị trứng cá đỏ", "nấm da", "mụn cóc"...

⚠️ **KIỂM TRA PHẠM VI TƯ VẤN:**
→ CHỈ tư vấn cho CÁC BỆNH DA SAU (có trong database):
   • Mụn (Acne) → Hỗn hợp/Dầu/Nhạy cảm
   • Chàm (Eczema) → Hỗn hợp/Khô/Thường/Dầu/Nhạy cảm
   • Vảy nến (Psoriasis) → Khô
   • Trứng cá đỏ (Rosacea) → Hỗn hợp/Dầu/Nhạy cảm
   • Dày sừng (Actinic Keratosis) → Khô/Thường
   • Nấm da (Tinea) → Hỗn hợp/Dầu
   • Viêm da tiết bã (Seborrheic Keratoses) → Thường/Dầu/Nhạy cảm
   • Tổn thương nắng (Sun Damage) → Hỗn hợp/Khô/Thường/Nhạy cảm
   • Mụn cóc (Warts) → Hỗn hợp/Khô/Thường/Dầu/Nhạy cảm
   • Phát ban thuốc (Drug Eruption) → Hỗn hợp/Khô/Thường/Dầu/Nhạy cảm

→ **NẾU BỆNH DA KHÔNG TRONG DANH SÁCH TRÊN** (vd: ghẻ, lang ben, zona, herpes, viêm da cơ địa nặng...):
   "⚠️ Xin lỗi, bệnh [tên bệnh] NẰM NGOÀI PHẠM VI tư vấn mỹ phẩm của mình.
   
   🏥 KHUYẾN CÁO:
   • Đây là bệnh da CẦN ĐIỀU TRỊ Y KHOA, không nên tự chăm sóc bằng mỹ phẩm
   • Vui lòng ĐẶT LỊCH GẶP BÁC SĨ DA LIỄU để được khám và kê đơn thuốc phù hợp
   • Mỹ phẩm chỉ hỗ trợ sau khi đã được bác sĩ điều trị
   
   💡 Mình có thể tư vấn mỹ phẩm cho các vấn đề da thông thường như: mụn, chàm, vảy nến, trứng cá đỏ, nấm da... Bạn có vấn đề da nào trong số này không?"

→ **NẾU BỆNH DA CÓ TRONG DANH SÁCH - TRẢ LỜI NGẮN GỌN:**
   "Dạ, mình gợi ý sản phẩm cho [tên bệnh TRONG CÂU HỎI HIỆN TẠI] nhé:
   
   [LIỆT KÊ 2-3 SẢN PHẨM NGAY - KHÔNG DÀI DÒNG]"
   
   ⚠️ QUAN TRỌNG: 
   • CHỈ trả lời về bệnh da được NÊU TRONG CÂU HỎI HIỆN TẠI
   • KHÔNG được nhắc lại hoặc nhầm lẫn với các bệnh da được hỏi ở câu hỏi trước
   • KHÔNG cần giải thích dài dòng, ĐI THẲNG VÀO SẢN PHẨM

🔹 **HỎI VỀ VẤN ĐỀ DA (KHÔNG PHẢI BỆNH)**
Câu hỏi: "da tôi khô", "da dầu nhiều", "da nhạy cảm", "da hỗn hợp"
→ ĐI THẲNG VÀO: "Dạ, mình gợi ý sản phẩm cho da [loại da] nhé:
   [LIỆT KÊ 2-3 SẢN PHẨM NGAY]"

🔹 **HỎI THEO LOẠI SẢN PHẨM**
Câu hỏi: "có kem dưỡng nào...", "serum gì tốt", "toner cho da...", "mặt nạ..."
→ ĐI THẲNG VÀO SẢN PHẨM, mặc định 2-3 sản phẩm
→ Nếu user YÊU CẦU SỐ LƯỢNG CỤ THỂ (vd: "cho tôi 3 sản phẩm", "4 sản phẩm"):
   • TRẢ VỀ ĐÚNG SỐ ĐÓ (tối đa 4)
   • Nếu "nhiều sản phẩm" → trả về 4 sản phẩm

🔹 **HỎI VỀ THƯƠNG HIỆU**
Câu hỏi: "bạn có [tên thương hiệu] không", "sản phẩm của [brand]"
→ Kiểm tra database, nếu có thì liệt kê, nếu không: "Mình chưa có thông tin về [brand] trong database. Bạn muốn tư vấn sản phẩm theo loại da hay vấn đề cụ thể không? 🔍"

🔹 **HỎI SO SÁNH**
Câu hỏi: "A hay B tốt hơn", "khác nhau thế nào", "nên chọn cái nào"
→ So sánh 2 sản phẩm dựa trên THÀNH PHẦN, CÔNG DỤNG, LOẠI DA phù hợp

🔹 **HỎI GIÁ/MUA Ở ĐÂU**
Câu hỏi: "giá bao nhiêu", "mua ở đâu", "có ship không"
→ "Xin lỗi, mình chỉ tư vấn về sản phẩm thôi nhé. Bạn có thể mua tại các store chính hãng hoặc website của thương hiệu. Mình có thể tư vấn thêm về sản phẩm khác không? 😊"

🔹 **HỎI ROUTINE/CÁCH DÙNG**
Câu hỏi: "routine cho da...", "thứ tự dùng", "dùng như thế nào", "dùng khi nào"
→ Gợi ý routine cơ bản: Sáng (sữa rửa mặt → toner → serum → kem dưỡng → chống nắng), Tối (tương tự nhưng thay chống nắng = mặt nạ 2-3 lần/tuần)

🔹 **CẢM ƠN/TẠM BIỆT**
Câu hỏi: "cảm ơn", "thank you", "ok rồi", "tạm biệt", "bye"
→ "Không có gì! 😊 Chúc bạn có làn da đẹp! Hẹn gặp lại bạn! 💕"

🔹 **CÂU HỎI NGOÀI LỀ**
Câu hỏi: thời tiết, tin tức, thể thao, chính trị, toán học...
→ "Xin lỗi, mình chỉ chuyên về mỹ phẩm và skincare thôi 💄 Bạn có muốn hỏi về chăm sóc da không?"

---

**CHÚ Ý KHI TRẢ LỜI:**
- Luôn THÂN THIỆN, dùng "mình/bạn" thay vì "tôi/anh/chị"
- **NGẮN GỌN - ĐI THẲNG VÀO SẢN PHẨM:**
  • KHÔNG giải thích dài dòng về bệnh da hay vấn đề da
  • CHỈ cần 1 câu mở đầu ngắn gọn (vd: "Dạ, mình gợi ý sản phẩm cho [vấn đề] nhé:")
  • SAU ĐÓ liệt kê sản phẩm NGAY
- **⚠️ TẬP TRUNG VÀO CÂU HỎI HIỆN TẠI:**
  • CHỈ trả lời về bệnh da/vấn đề da được NÊU TRONG CÂU HỎI HIỆN TẠI
  • KHÔNG được nhắc lại hoặc nhầm lẫn với câu hỏi trước đó
  • Nếu câu hỏi mới về bệnh da khác → trả lời về bệnh da MỚI, quên bệnh da cũ
- **GROUNDING (CĂN CỨ):** • CHỈ GỢI Ý sản phẩm CÓ TRONG DATABASE
  • Nếu context chứa "KHÔNG TÌM THẤY SẢN PHẨM TRONG DATABASE" → BẮT BUỘC trả lời:
    "Xin lỗi, mình không tìm thấy sản phẩm phù hợp trong database. 😔
    Bạn có thể thử:
    • Mô tả chi tiết hơn về loại da hoặc vấn đề da
    • Thay đổi từ khóa tìm kiếm
    • Hỏi về loại sản phẩm cụ thể (kem dưỡng, serum, toner...)
    Mình sẽ cố gắng tìm sản phẩm phù hợp hơn! 💕"
  • TUYỆT ĐỐI KHÔNG TỰ TẠO/BỊA sản phẩm không có trong context
- **ƯU TIÊN XỬ LÝ BỆNH DA:** Nếu phát hiện bệnh da → ánh xạ sang loại da → tìm sản phẩm
- **SỐ LƯỢNG SẢN PHẨM:**
  • Mặc định: 2 sản phẩm (ĐẢM BẢO THÔNG TIN ĐỒNG NHẤT)
  • Nếu user nói "3 sản phẩm" → trả về 3 sản phẩm
  • Nếu "nhiều sản phẩm", "vài sản phẩm" → trả về 3 sản phẩm
  • ⚠️ TỐI ĐA 3 SẢN PHẨM để đảm bảo chất lượng
- **⚠️ FORMAT MỖI SẢN PHẨM (BẮT BUỘC ĐIỀN ĐẦY ĐỦ):**
  **Số. Tên sản phẩm của THƯƠNG HIỆU** Giá: XXX.XXX VND | Đánh giá: X/5 | Loại da: [...]
  
  ⚠️ QUAN TRỌNG: 
  • BẮT BUỘC phải có ĐẦY ĐỦ: Tên, Thương hiệu, Giá, Đánh giá, Loại da
  • KHÔNG hiển thị công dụng hoặc thành phần (chỉ thông tin cơ bản)
  • NẾU thiếu thông tin trong context → ghi "(Không có thông tin)"
  • TẤT CẢ sản phẩm phải có FORMAT GIỐNG NHAU
- **GIÁ ĐÃ ĐƯỢC CHUYỂN ĐỔI** sang VND trong context, CHỈ HIỂN THỊ VND, KHÔNG HIỂN THỊ USD
- **LOẠI DA PHẢI DỊCH SANG TIẾNG VIỆT:**
  • Combination → Hỗn hợp
  • Dry → Khô
  • Normal → Thường
  • Oily → Dầu
  • Sensitive → Nhạy cảm
  Ví dụ: "Loại da: Hỗn hợp, Khô, Thường" (KHÔNG được để "Combination, Dry, Normal")
- Dùng emoji phù hợp: 😊💄✨💕👋💊🩺
- Nếu KHÔNG chắc chắn: "Bạn có thể mô tả cụ thể hơn về [vấn đề] để mình tư vấn chính xác hơn không?"

THÔNG TIN SẢN PHẨM:
{context}

CÂU HỎI: {question}

TRẢ LỜI (mặc định 2 sản phẩm, hoặc đúng số lượng user yêu cầu nếu có):"""
    
    prompt = ChatPromptTemplate.from_template(template)
    print("    ✓ Đã tạo Prompt Template (compact + smart filtering)")
    
    # 4. Xây dựng RAG Chain với NHÓM CHUNKS THEO SẢN PHẨM và GROUNDING CHECK
    def format_docs(docs):
        """Format documents: NHÓM chunks theo product_name, lấy 3-4 sản phẩm, sắp xếp chunks theo loại"""
        
        # GROUNDING CHECK: Kiểm tra xem có chunks không
        if not docs or len(docs) == 0:
            return "KHÔNG TÌM THẤY SẢN PHẨM TRONG DATABASE"
        
        # DEBUG: In số chunks tìm được
        print(f"    🔍 Tìm được {len(docs)} chunks từ database")
        
        # Bước 1: Nhóm các chunks theo product_name và theo dõi thứ tự xuất hiện
        product_groups = {}  # {product_name: {'chunks': [], 'first_index': int, 'metadata': {}}}
        
        for idx, doc in enumerate(docs):
            product_name = doc.metadata.get('product_name', 'Unknown Product')
            
            if product_name not in product_groups:
                # Trích xuất metadata từ chunk đầu tiên
                content_lower = doc.page_content.lower()
                metadata = {
                    'brand': extract_field_from_chunk(doc.page_content, 'Brand'),
                    'category': extract_field_from_chunk(doc.page_content, 'Category'),
                    'suitable_for': extract_field_from_chunk(doc.page_content, 'Suitable for'),
                    'rank': extract_field_from_chunk(doc.page_content, 'Rank'),
                    'price': extract_field_from_chunk(doc.page_content, 'Price')
                }
                
                product_groups[product_name] = {
                    'chunks': [],
                    'first_index': idx,  # Lưu vị trí xuất hiện đầu tiên (relevance score)
                    'metadata': metadata,
                    'has_summary': False,
                    'has_ingredients': False
                }
            
            # Đánh dấu loại chunk
            if 'chunk type: product summary' in doc.page_content.lower():
                product_groups[product_name]['has_summary'] = True
            if 'chunk type: ingredients' in doc.page_content.lower():
                product_groups[product_name]['has_ingredients'] = True
            
            product_groups[product_name]['chunks'].append(doc)
        
        # GROUNDING CHECK: Kiểm tra có sản phẩm nào không
        if not product_groups or len(product_groups) == 0:
            return "KHÔNG TÌM THẤY SẢN PHẨM TRONG DATABASE"
        
        # DEBUG: In số sản phẩm tìm được
        print(f"    📦 Tìm được {len(product_groups)} sản phẩm khác nhau")
        
        # Bước 2: Lọc sản phẩm có đủ thông tin (ưu tiên có summary)
        complete_products = []
        for name, data in product_groups.items():
            if data['has_summary']:  # Ưu tiên sản phẩm có summary
                complete_products.append((name, data))
        
        # Nếu không có sản phẩm nào có summary, lấy tất cả
        if not complete_products:
            complete_products = list(product_groups.items())
        
        # Bước 3: Sắp xếp sản phẩm theo relevance (first_index càng nhỏ = càng relevant)
        sorted_products = sorted(
            complete_products,
            key=lambda x: x[1]['first_index']
        )
        
        # Bước 4: Chọn top 3 sản phẩm để đảm bảo ĐỒNG NHẤT thông tin
        num_products = min(3, len(sorted_products))  # Tối đa 3 sản phẩm
        selected_products = sorted_products[:num_products]
        
        print(f"    ✅ Chọn {num_products} sản phẩm để tư vấn")
        
        # Bước 5: Gộp và format chunks của mỗi sản phẩm
        formatted = []
        for i, (product_name, data) in enumerate(selected_products, 1):
            chunks = data['chunks']
            metadata = data['metadata']
            
            # Loại bỏ duplicate chunks (dựa trên page_content)
            seen_contents = set()
            unique_chunks = []
            for chunk in chunks:
                content_hash = hash(chunk.page_content.strip())
                if content_hash not in seen_contents:
                    seen_contents.add(content_hash)
                    unique_chunks.append(chunk)
            
            # Sắp xếp chunks theo loại: Summary trước, Ingredients sau
            def chunk_priority(chunk):
                content = chunk.page_content.lower()
                if 'chunk type: product summary' in content:
                    return 0  # Summary đầu tiên
                elif 'chunk type: ingredients' in content:
                    return 1  # Ingredients sau
                else:
                    return 2  # Các loại khác cuối cùng
            
            sorted_chunks = sorted(unique_chunks, key=chunk_priority)
            
            # Gộp thông tin sản phẩm với header rõ ràng
            product_info = f"{'='*80}\n"
            product_info += f"SẢN PHẨM #{i}: {product_name}\n"
            product_info += f"{'='*80}\n"
            
            # Thêm metadata tổng hợp nếu có
            if metadata['brand']:
                product_info += f"🏢 Thương hiệu: {metadata['brand']}\n"
            if metadata['category']:
                product_info += f"📁 Loại: {metadata['category']}\n"
            if metadata['suitable_for']:
                product_info += f"👤 Phù hợp: {metadata['suitable_for']}\n"
            if metadata['rank']:
                product_info += f"⭐ Đánh giá: {metadata['rank']}\n"
            if metadata['price']:
                price_vnd = convert_price_in_text(f"Price: {metadata['price']}")
                product_info += f"💰 {price_vnd}\n"
            
            product_info += f"{'-'*80}\n\n"
            
            # Thêm nội dung chi tiết từ chunks
            for chunk in sorted_chunks:
                content = chunk.page_content.strip()
                # Chuyển đổi giá USD → VND
                content = convert_price_in_text(content)
                product_info += content + "\n\n"
            
            formatted.append(product_info)
        
        result = "\n\n".join(formatted)
        
        return result
    
    rag_chain = (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough()
        }
        | prompt
        | llm
        | StrOutputParser()
    )
    
    print("\n✅ RAG Chain đã sẵn sàng!")
    print("\n📊 Luồng hoạt động (CẢI TIẾN):")
    print("    1️⃣  User Question → Retriever")
    print("    2️⃣  Retriever → 30 chunks (similarity search)")
    print("    3️⃣  Trích xuất metadata từ chunks")
    print("    4️⃣  NHÓM theo product_name + Filter sản phẩm có đủ thông tin")
    print("    5️⃣  Sắp xếp theo relevance → Chọn top 3 sản phẩm")
    print("    6️⃣  Loại bỏ duplicate + Sắp xếp: Summary → Ingredients")
    print("    7️⃣  Format structured với metadata rõ ràng")
    print("    8️⃣  Context + Question → LLM → 3 sản phẩm CHÍNH XÁC & ĐẦY ĐỦ ⚡")
    print("    ⚠️  Cải tiến: Metadata extraction + Structured format + Better filtering")

    return rag_chain

# =============================================================================
# CHAT HISTORY
# =============================================================================
def save_chat_history(chat_history):
    """Lưu lịch sử chat vào file JSON"""
    try:
        # Tạo thư mục nếu chưa có
        CHAT_HISTORY_DIR.mkdir(exist_ok=True)
        
        # Tên file theo timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = CHAT_HISTORY_DIR / f"chat_{timestamp}.json"
        
        # Lưu vào file
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(chat_history, f, ensure_ascii=False, indent=2)
        
        print(f"\n💾 Đã lưu lịch sử chat: {filename.name}")
        return filename
    except Exception as e:
        print(f"\n⚠️  Lỗi khi lưu lịch sử: {str(e)}")
        return None

def load_latest_chat_history():
    """Load lịch sử chat gần nhất (nếu có)"""
    try:
        if not CHAT_HISTORY_DIR.exists():
            return None
        
        # Tìm file mới nhất
        chat_files = list(CHAT_HISTORY_DIR.glob("chat_*.json"))
        if not chat_files:
            return None
        
        latest_file = max(chat_files, key=lambda f: f.stat().st_mtime)
        
        with open(latest_file, 'r', encoding='utf-8') as f:
            history = json.load(f)
        
        return history, latest_file
    except Exception as e:
        print(f"\n⚠️  Lỗi khi load lịch sử: {str(e)}")
        return None

# =============================================================================
# VISION ANALYSIS (MERGED: NEW LOGIC + OLD BACKEND SUPPORT)
# =============================================================================
def analyze_skin_image(image_input, note: str = None):
    """
    Phân tích ảnh da bằng VLM - Tập trung vào mức độ nghiêm trọng
    Supports: File Path (CLI) and Base64/Bytes (Backend)
    """
    try:
        print("\n📸 Đang phân tích tình trạng da từ ảnh...")
        
        img = None
        # Xử lý input đa dạng (Merge từ file cũ)
        if isinstance(image_input, str):
            # Check for data URI or base64 string
            if image_input.startswith('data:image'):
                image_input = image_input.split(',')[1]
                image_bytes = base64.b64decode(image_input)
                img = Image.open(io.BytesIO(image_bytes))
            elif os.path.exists(image_input):
                 # Là đường dẫn file
                img = Image.open(image_input)
            else:
                # Thử decode base64 thuần
                try:
                    image_bytes = base64.b64decode(image_input)
                    img = Image.open(io.BytesIO(image_bytes))
                except:
                     print(f"❌ Input string không phải là path hợp lệ hay base64.")
                     return None
        elif isinstance(image_input, bytes):
            img = Image.open(io.BytesIO(image_input))
        elif isinstance(image_input, Image.Image):
             img = image_input
        
        if img is None:
             print("❌ Không thể đọc được ảnh từ input.")
             return None

        # Khởi tạo Gemini Vision model (Từ file mới)
        vision_model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Prompt tập trung vào mức độ nghiêm trọng (Từ file mới)
        vision_prompt = """Bạn là chuyên gia da liễu. Phân tích ảnh da và TÓM TẮT NGẮN GỌN:

1. LOẠI DA: (khô/dầu/hỗn hợp/nhạy cảm/thường)

2. VẤN ĐỀ CHÍNH & MỨC ĐỘ NGHIÊM TRỌNG:
- Nếu có mụn: loại mụn (viêm/đầu đen/đầu trắng/bọc), mức độ (NHẸ/TRUNG BÌNH/NẶNG/RẤT NẶNG)
- Nếu có thâm/sẹo: mức độ (NHẸ/TRUNG BÌNH/NẶNG/RẤT NẶNG), màu sắc, phân bố
- Nếu có lão hóa: mức độ (NHẸ/TRUNG BÌNH/NẶNG)
- Nếu có vấn đề khác: nêu rõ

3. MỨC ĐỘ CHUNG: Chọn 1 trong 4:
   - NHẸ: Vấn đề nhỏ, ít nốt, có thể tự chăm sóc
   - TRUNG BÌNH: Vấn đề rõ ràng, nhiều nốt, cần sản phẩm chuyên dụng
   - NẶNG: Vấn đề lan rộng, viêm nhiều, cần điều trị tích cực
   - RẤT NẶNG: Viêm trầm trọng, sẹo nhiều, cần gặp bác sĩ da liễu

4. GỢI Ý: (1 câu ngắn)

QUAN TRỌNG: Phải ghi rõ MỨC ĐỘ (NHẸ/TRUNG BÌNH/NẶNG/RẤT NẶNG).

Trả lời NGẮN GỌN, bằng tiếng Việt."""

        if note:
             vision_prompt += f"\n\nGhi chú thêm từ người dùng: {note}"
        
        # Gọi vision model
        response = vision_model.generate_content([vision_prompt, img])
        analysis = response.text
        
        print("✅ Đã phân tích xong!")
        
        return analysis
        
    except Exception as e:
        print(f"❌ Lỗi khi phân tích ảnh: {str(e)}")
        return None

# =============================================================================
# INTERACTIVE CHAT (CLI)
# =============================================================================
def chat(rag_chain):
    """Interactive chat trong terminal với hỗ trợ phân tích ảnh da và lưu lịch sử"""
    print("\n" + "=" * 80)
    print("💬 COSMETIC CONSULTANT CHATBOT (⚡ RAG + 📸 VLM + 💾 HISTORY)")
    print("=" * 80)
    
    # Load lịch sử chat trước đó (nếu có)
    previous_history = load_latest_chat_history()
    if previous_history:
        history, history_file = previous_history
        print(f"\n📖 Tìm thấy lịch sử chat trước: {history_file.name}")
        print(f"    Số lượng: {len(history)} tin nhắn")
        view = input("    Xem lịch sử? (y/n): ").strip().lower()
        if view == 'y':
            print("\n" + "=" * 80)
            print("📜 LỊCH SỬ CHAT TRƯỚC:")
            print("=" * 80)
            for msg in history[-10:]:  # Hiển thị 10 tin nhắn cuối
                role = "🧑 Bạn" if msg['role'] == 'user' else "🤖 Bot"
                content = msg['content'][:200] + "..." if len(msg['content']) > 200 else msg['content']
                print(f"{role}: {content}")
                print("-" * 40)
            print("=" * 80)
    
    print("\n📝 Gõ câu hỏi của bạn và nhấn Enter")
    print("💡 Ví dụ text: 'Tôi cần kem dưỡng cho da khô nhạy cảm'")
    print("📸 Phân tích ảnh DA: Gửi đường dẫn ảnh da của bạn (tự động nhận diện)")
    print("    → VLM phân tích chi tiết tình trạng da")
    print("    → RAG tư vấn sản phẩm phù hợp dựa trên phân tích")
    print("    Ví dụ: C:\\Users\\Photos\\my_skin.jpg")
    print("🚪 Gõ 'exit', 'quit' hoặc 'thoát' để kết thúc và LƯU LỊCH SỬ")
    print("⚡ Công nghệ: VLM (Gemini 2.5 Flash) + RAG (ChromaDB)\n")
    print("=" * 80)
    
    # Khởi tạo lịch sử chat mới và conversation memory
    chat_history = {
        'session_start': datetime.now().isoformat(),
        'messages': []
    }
    
    # Conversation memory - lưu context trong phiên (bot sẽ nhớ!)
    conversation_context = []  # Lưu tất cả trao đổi: [(user_msg, bot_response), ...]
    
    # Các đuôi file ảnh được hỗ trợ
    IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.tiff')
    
    while True:
        print()
        try:
            # Nhận input từ user
            question = input("🧑 Bạn: ").strip()
            
            # Kiểm tra điều kiện thoát
            if not question:
                print("⚠️  Vui lòng nhập câu hỏi!")
                continue
                
            if question.lower() in ['exit', 'quit', 'thoát', 'bye', 'goodbye']:
                print("\n👋 Cảm ơn bạn đã sử dụng dịch vụ!")
                # Lưu lịch sử trước khi thoát
                if chat_history['messages']:
                    chat_history['session_end'] = datetime.now().isoformat()
                    save_chat_history(chat_history)
                print("=" * 80)
                break
            
            # Tự động nhận diện đường dẫn ảnh
            question_clean = question.strip('"').strip("'")
            image_path_candidate = None
            text_question = None
            
            # Logic tìm đường dẫn ảnh (giữ nguyên từ file mới)
            if '"' in question:
                matches = re.findall(r'"([^"]+)"', question)
                for match in matches:
                    if any(match.lower().endswith(ext) for ext in IMAGE_EXTENSIONS):
                        image_path_candidate = match
                        text_question = question.replace(f'"{match}"', '').strip()
                        break
            
            if not image_path_candidate:
                words = question_clean.split()
                for word in words:
                    if any(word.lower().endswith(ext) for ext in IMAGE_EXTENSIONS):
                        if '\\' in word or '/' in word or ':' in word:
                            image_path_candidate = word
                            text_question = question_clean.replace(word, '').strip()
                            break
            
            if not image_path_candidate and any(question_clean.lower().endswith(ext) for ext in IMAGE_EXTENSIONS):
                image_path_candidate = question_clean
            
            if not image_path_candidate and question.lower().startswith(('image:', 'ảnh:', 'anh:')):
                parts = question.split(':', 1)
                if len(parts) > 1:
                    image_path_candidate = parts[1].strip().strip('"').strip("'")
            
            # Xử lý nếu tìm thấy ảnh
            if image_path_candidate:
                image_path = image_path_candidate
                if not os.path.isabs(image_path):
                    image_path = os.path.join(os.getcwd(), image_path)
                
                if not os.path.exists(image_path):
                    print(f"❌ Không tìm thấy file ảnh: {image_path}")
                    print("💡 Vui lòng kiểm tra lại đường dẫn!")
                    print("-" * 80)
                    continue
                
                # VLM phân tích ảnh da
                skin_analysis = analyze_skin_image(image_path)
                
                chat_history['messages'].append({
                    'timestamp': datetime.now().isoformat(),
                    'role': 'user',
                    'type': 'image',
                    'content': f"[Gửi ảnh: {os.path.basename(image_path)}]",
                    'image_path': image_path,
                    'additional_text': text_question if text_question else None
                })
                
                if skin_analysis:
                    analysis_upper = skin_analysis.upper()
                    is_very_severe = 'RẤT NẶNG' in analysis_upper or 'RẤT NGHIÊM TRỌNG' in analysis_upper
                    
                    if is_very_severe:
                        print("\n" + "⚠️ " * 20)
                        print("⚠️  CẢNH BÁO: TÌNH TRẠNG DA RẤT NGHIÊM TRỌNG!")
                        print("⚠️ " * 20)
                        print("\n🏥 KHUYẾN CÁO:")
                        print("    • Tình trạng da của bạn CẦN được bác sĩ da liễu thăm khám")
                        print("    • Không nên tự điều trị hoặc chỉ dùng mỹ phẩm")
                        print("    • Vui lòng đặt lịch gặp bác sĩ da liễu NGAY")
                        print("\n" + "=" * 80)
                        print("\n💡 Tuy nhiên, dưới đây là một số sản phẩm HỖ TRỢ (KHÔNG THAY THẾ điều trị y khoa):\n")
                    
                    # Tạo query RAG dựa trên phân tích
                    if text_question:
                        if is_very_severe:
                            rag_query = f"""Tình trạng da (RẤT NGHIÊM TRỌNG - CẦN GẶP BÁC SĨ):
{skin_analysis}

Yêu cầu: {text_question}

Gợi ý 1-2 sản phẩm HỖ TRỢ NHẸ NHÀNG (không thay thế điều trị y khoa). 
NHẤN MẠNH: Cần gặp bác sĩ da liễu."""
                        else:
                            rag_query = f"""Tình trạng da (từ phân tích ảnh):
{skin_analysis}

Yêu cầu: {text_question}

Tư vấn 2-3 sản phẩm CỤ THỂ phù hợp với MỨC ĐỘ."""
                    else:
                         if is_very_severe:
                            rag_query = f"""Tình trạng da (RẤT NGHIÊM TRỌNG - CẦN GẶP BÁC SĨ):
{skin_analysis}

Gợi ý 1-2 sản phẩm HỖ TRỢ NHẸ NHÀNG (không thay thế điều trị y khoa).
NHẤN MẠNH: Cần gặp bác sĩ da liễu."""
                         else:
                            rag_query = f"""Tình trạng da (từ phân tích ảnh):
{skin_analysis}

Tư vấn 2-3 sản phẩm CỤ THỂ phù hợp với MỨC ĐỘ."""
                    
                    print("\n🔎 Tìm sản phẩm dựa trên mức độ nghiêm trọng...")
                    time.sleep(1)
                    
                    product_recommendation = rag_chain.invoke(rag_query)
                    
                    user_input_desc = f"[Gửi ảnh da] {text_question if text_question else 'Phân tích và tư vấn'}"
                    conversation_context.append((user_input_desc, product_recommendation))
                    
                    print("\n💄 TƯ VẤN SẢN PHẨM:")
                    print("=" * 80)
                    print(product_recommendation)
                    print("=" * 80)
                    
                    bot_response = product_recommendation
                    if is_very_severe:
                        bot_response = f"⚠️ CẢNH BÁO: RẤT NGHIÊM TRỌNG - CẦN GẶP BÁC SĨ!\n\n{product_recommendation}"
                    
                    chat_history['messages'].append({
                        'timestamp': datetime.now().isoformat(),
                        'role': 'assistant',
                        'type': 'product_recommendation',
                        'content': bot_response,
                        'skin_analysis': skin_analysis,
                        'severity': 'VERY_SEVERE' if is_very_severe else 'NORMAL'
                    })
                    
                    if is_very_severe:
                        print("\n" + "⚠️ " * 20)
                        print("⚠️  LƯU Ý: Các sản phẩm trên CHỈ HỖ TRỢ, KHÔNG THAY THẾ điều trị y khoa!")
                        print("⚠️  VUI LÒNG ĐẶT LỊCH GẶP BÁC SĨ DA LIỄU NGAY! 🏥")
                        print("⚠️ " * 20)
                
                print("-" * 80)
                continue
            
            # Xử lý câu hỏi text thông thường
            print("\n⏳ Đang tìm kiếm và tạo câu trả lời...")
            start_time = time.time()
            
            chat_history['messages'].append({
                'timestamp': datetime.now().isoformat(),
                'role': 'user',
                'type': 'text',
                'content': question
            })
            
            # PHÁT HIỆN BỆNH DA và ánh xạ sang loại da phù hợp
            detected_condition, suitable_skin_types = detect_skin_condition_and_types(question)
            
            if detected_condition:
                print(f"\n🩺 Phát hiện bệnh da: {detected_condition.upper()}")
                print(f"📋 Loại da phù hợp: {', '.join(suitable_skin_types)}")
                
                skin_types_mapping = {
                    "Khô": "Dry", "Thường": "Normal", "Dầu": "Oily",
                    "Nhạy cảm": "Sensitive", "Hỗn hợp": "Combination"
                }
                english_skin_types = [skin_types_mapping.get(st, st) for st in suitable_skin_types]
                skin_query = " ".join(english_skin_types)
                enhanced_query = f"{detected_condition} {skin_query} skin treatment moisturizer serum toner cream"
                
                query_to_use = enhanced_query
                print(f"🔍 Query tìm kiếm: {query_to_use}")
            else:
                query_to_use = question
            
            time.sleep(1)
            
            # Logic xử lý Context
            if detected_condition:
                # Có bệnh da → Query trực tiếp, KHÔNG dùng context cũ
                response = rag_chain.invoke(query_to_use)
            elif conversation_context:
                # Không có bệnh da + có context
                recent_context = conversation_context[-3:]
                context_str = "\n".join([
                    f"User đã hỏi: {ctx[0]}\nBot đã trả lời: {ctx[1][:200]}..." 
                    for ctx in recent_context
                ])
                
                query_with_context = f"""LỊCH SỬ HỘI THOẠI GẦN ĐÂY:
{context_str}

CÂU HỎI HIỆN TẠI: {query_to_use}

Hãy trả lời dựa trên câu hỏi hiện tại. Chỉ tham khảo lịch sử nếu user đang hỏi tiếp về cùng topic."""
                response = rag_chain.invoke(query_with_context)
            else:
                response = rag_chain.invoke(query_to_use)
            
            elapsed_time = time.time() - start_time
            conversation_context.append((question, response))
            
            print(f"\n🤖 Bot: {response}")
            print(f"\n⚡ Thời gian phản hồi: {elapsed_time:.2f}s")
            print("-" * 80)
            
            chat_history['messages'].append({
                'timestamp': datetime.now().isoformat(),
                'role': 'assistant',
                'type': 'text',
                'content': response,
                'response_time': elapsed_time,
                'detected_condition': detected_condition if detected_condition else None,
                'suitable_skin_types': suitable_skin_types if suitable_skin_types else None
            })
            
        except KeyboardInterrupt:
            print("\n\n👋 Đã nhận tín hiệu thoát. Cảm ơn bạn đã sử dụng!")
            print("=" * 80)
            break
            
        except Exception as e:
            print(f"\n❌ Đã có lỗi xảy ra: {str(e)}")
            print("💡 Vui lòng thử lại với câu hỏi khác!")
            print("-" * 80)

# =============================================================================
# HELPER FUNCTIONS CHO BACKEND (GIỮ LẠI TỪ FILE CŨ)
# =============================================================================

def is_supported_condition(condition):
    """Kiểm tra bệnh da có trong danh sách hỗ trợ không (Từ file cũ)"""
    if not condition:
        return False
    condition_lower = condition.lower()
    return any(supported in condition_lower or condition_lower in supported 
               for supported in SUPPORTED_SKIN_CONDITIONS)

def check_severity(analysis: str) -> bool:
    """Check if skin condition is severe (Từ file cũ)"""
    if not analysis:
        return False
    return any(keyword in analysis.upper() for keyword in ['RẤT NẶNG', 'RẤT NGHIÊM TRỌNG'])

def analyze_with_context(question: str, conversation_history: list = None) -> str:
    """
    Analyze question with conversation context + Skin Condition Logic (Từ file cũ)
    ⚠️ NẾU PHÁT HIỆN BỆNH DA → BỎ QUA CONTEXT để tránh nhầm lẫn
    """
    # Detect skin condition
    detected_condition, suitable_skin_types = detect_skin_condition_and_types(question)
    
    if detected_condition:
        # CÓ BỆNH DA → Không dùng context, mapping sang tiếng Anh
        skin_types_mapping = {
            "Khô": "Dry",
            "Thường": "Normal",
            "Dầu": "Oily",
            "Nhạy cảm": "Sensitive",
            "Hỗn hợp": "Combination"
        }
        
        english_skin_types = [skin_types_mapping.get(st, st) for st in suitable_skin_types]
        skin_query = " ".join(english_skin_types)
        enhanced_query = f"{detected_condition} {skin_query} skin treatment moisturizer serum toner cream"
        
        return enhanced_query
    
    # KHÔNG CÓ BỆNH DA → Dùng context bình thường
    context_str = ""
    if conversation_history:
        recent_context = conversation_history[-3:]
        context_str = "LỊCH SỬ HỘI THOẠI GẦN ĐÂY:\n" + "\n".join([
            f"User: {ctx[0]}\nBot: {ctx[1][:200]}..."
            for ctx in recent_context
        ])

    return f"""{context_str}
CÂU HỎI HIỆN TẠI: {question}
Hãy trả lời dựa trên câu hỏi hiện tại. Chỉ tham khảo lịch sử nếu user đang hỏi tiếp về cùng topic."""

def build_image_analysis_query(skin_analysis: str, additional_text: str = None) -> str:
    """Build RAG query based on Image Analysis Result with severity awareness (Từ file cũ)"""
    is_severe = any(keyword in skin_analysis.upper() for keyword in ['RẤT NẶNG', 'RẤT NGHIÊM TRỌNG', 'CẦN GẶP BÁC SĨ'])
    
    warning = "(RẤT NGHIÊM TRỌNG - CẦN GẶP BÁC SĨ)" if is_severe else "(từ phân tích ảnh)"
    advice_req = "Gợi ý 1-2 sản phẩm HỖ TRỢ NHẸ NHÀNG. NHẤN MẠNH: Cần gặp bác sĩ." if is_severe else "Tư vấn 2-3 sản phẩm CỤ THỂ phù hợp với MỨC ĐỘ."
    
    user_req = f"\nYêu cầu thêm của user: {additional_text}" if additional_text else ""
    
    return f"""Tình trạng da {warning}:
{skin_analysis}
{user_req}
{advice_req}"""

def get_product_suggestions_by_skin_types(db, skin_types: list, num_products: int = 5) -> list:
    """
    Truy vấn sản phẩm phù hợp với loại da (bilingual search) (Từ file cũ)
    Returns: list of product names
    """
    if not db or not skin_types:
        print("⚠️ No database or skin types provided")
        return []
    
    try:
        print(f"🔍 Searching products for skin types: {skin_types}")
        
        # Map tiếng Việt sang tiếng Anh
        vietnamese_to_english = {
            "Khô": "Dry",
            "Thường": "Normal",
            "Dầu": "Oily",
            "Hỗn hợp": "Combination",
            "Nhạy cảm": "Sensitive"
        }
        
        # Tạo search terms (cả VN và EN)
        search_terms = []
        for skin_type in skin_types:
            search_terms.append(skin_type)
            if skin_type in vietnamese_to_english:
                search_terms.append(vietnamese_to_english[skin_type])
        
        print(f"🔍 Search terms (VN + EN): {search_terms}")
        
        query = f"sản phẩm chăm sóc da {' '.join(search_terms)}"
        
        retriever = db.as_retriever(
            search_type="mmr",
            search_kwargs={
                "k": num_products * 5,
                "fetch_k": num_products * 10,
                "lambda_mult": 0.5
            }
        )
        
        docs = retriever.invoke(query)
        print(f"📚 Retrieved {len(docs)} documents from vector store")
        
        product_names = []
        seen_products = set()
        
        for doc in docs:
            product_name = doc.metadata.get('product_name')
            
            if not product_name:
                content_lines = doc.page_content.split('\n')
                for line in content_lines:
                    if 'Product Name:' in line:
                        product_name = line.split(':', 1)[1].strip()
                        break
            
            if product_name and product_name not in seen_products:
                content_lower = doc.page_content.lower()
                metadata_str = str(doc.metadata).lower()
                
                match = any(
                    term.lower() in content_lower or
                    term.lower() in metadata_str
                    for term in search_terms
                )
                
                if match:
                    product_names.append(product_name)
                    seen_products.add(product_name)
                    print(f"✓ Found: {product_name}")
                    
                    if len(product_names) >= num_products:
                        break
        
        # Fallback: add general products if not enough
        if len(product_names) < num_products:
            print(f"⚠️ Only found {len(product_names)} matching products, adding general...")
            for doc in docs:
                product_name = doc.metadata.get('product_name')
                if not product_name:
                    content_lines = doc.page_content.split('\n')
                    for line in content_lines:
                        if 'Product Name:' in line:
                            product_name = line.split(':', 1)[1].strip()
                            break
                
                if product_name and product_name not in seen_products:
                    product_names.append(product_name)
                    seen_products.add(product_name)
                    print(f"✓ Added general: {product_name}")
                    if len(product_names) >= num_products:
                        break
        
        print(f"✅ Returning {len(product_names)} product suggestions")
        return product_names[:num_products]
        
    except Exception as e:
        print(f"❌ Error getting product suggestions: {e}")
        return []

def map_disease_to_skin_types(disease_class: str) -> list:
    """Map disease class sang skin types phù hợp (Từ file cũ)"""
    print(f"🔍 Mapping disease: {disease_class}")
    
    disease_lower = disease_class.lower().replace('_', ' ')
    
    disease_mapping = {
        'acne': ['Hỗn hợp', 'Dầu', 'Nhạy cảm'],
        'actinic keratosis': ['Khô', 'Thường'],
        'drug eruption': ['Hỗn hợp', 'Khô', 'Thường', 'Dầu', 'Nhạy cảm'],
        'eczema': ['Hỗn hợp', 'Khô', 'Thường', 'Dầu', 'Nhạy cảm'],
        'psoriasis': ['Khô'],
        'rosacea': ['Hỗn hợp', 'Dầu', 'Nhạy cảm'],
        'seborrh keratoses': ['Thường', 'Dầu', 'Nhạy cảm'],
        'sun sunlight damage': ['Hỗn hợp', 'Khô', 'Thường', 'Nhạy cảm'],
        'tinea': ['Hỗn hợp', 'Dầu'],
        'warts': ['Hỗn hợp', 'Khô', 'Thường', 'Dầu', 'Nhạy cảm'],
        'normal': ['Thường']
    }
    
    for key, skin_types in disease_mapping.items():
        if key in disease_lower or disease_lower in key:
            print(f"✓ Mapped to skin types: {skin_types}")
            return skin_types
    
    # Fallback to SKIN_CONDITION_TO_SKIN_TYPE
    for condition_key, skin_types in SKIN_CONDITION_TO_SKIN_TYPE.items():
        if condition_key in disease_lower or disease_lower in condition_key:
            print(f"✓ Mapped via SKIN_CONDITION_TO_SKIN_TYPE: {skin_types}")
            return skin_types
    
    print(f"⚠️ No specific mapping found, using default")
    return ["Hỗn hợp", "Khô", "Thường", "Dầu", "Nhạy cảm"]

# =============================================================================
# MAIN FUNCTION
# =============================================================================
def main():
    """Main function - điểm khởi đầu chương trình"""
    try:
        print("\n🎯 COSMETIC RAG CHATBOT - INTERACTIVE MODE")
        print("=" * 80)
        
        # 1. Setup API Key
        setup_api_key()
        
        # 2. Load/Create Vector Store
        db, embeddings = load_or_create_vectorstore()
        
        if db is None:
            print("\n❌ Không thể khởi tạo vector store. Vui lòng kiểm tra lại cấu hình!")
            return 1
        
        # 3. Setup RAG Chain
        rag_chain = setup_rag_chain(db)
        
        if rag_chain is None:
            print("\n❌ Không thể khởi tạo RAG chain. Vui lòng kiểm tra lại cấu hình!")
            return 1
        
        # 4. Start Chat
        chat(rag_chain)
        
    except Exception as e:
        print(f"\n❌ LỖI NGHIÊM TRỌNG: {str(e)}")
        print("💡 Vui lòng kiểm tra lại cấu hình và thử lại!")
        return 1
    
    return 0

# =============================================================================
# ENTRY POINT
# =============================================================================
if __name__ == "__main__":
    exit(main())