# 📦 CHECKLIST: Upload lên GitHub

## ✅ Các file đã tạo:

- [x] `requirements.txt` - Dependencies
- [x] `config.py` - Configuration
- [x] `.env.example` - Template API key
- [x] `.gitignore` - Git ignore rules
- [x] `README.md` - Documentation
- [x] `DEPLOY.md` - Deployment guide
- [x] `setup.bat` - Windows setup script
- [x] `setup.sh` - Linux/Mac setup script

## 🗂️ Cấu trúc cuối cùng:

```
C:\FPT\RAG\
├── RAG_cosmetic.py          # ✅ Main file
├── config.py                # ✅ Config
├── requirements.txt         # ✅ Dependencies
├── .env.example            # ✅ Template
├── .gitignore              # ✅ Git rules
├── README.md               # ✅ Documentation
├── DEPLOY.md               # ✅ Deploy guide
├── setup.bat               # ✅ Windows setup
├── setup.sh                # ✅ Linux setup
├── test_vlm.py             # ⚠️ Optional (có thể xóa)
├── check_models.py         # ⚠️ Optional (có thể xóa)
├── data/
│   ├── product_chunks.txt  # ⚠️ DI CHUYỂN VÀO ĐÂY!
│   └── cosmetics.csv       # ⚠️ DI CHUYỂN VÀO ĐÂY!
└── (db_chroma/ - tự tạo khi chạy)
```

---

## 🚀 Các bước UPLOAD LÊN GITHUB:

### **1️⃣ Di chuyển files data:**

```powershell
# Di chuyển vào thư mục data/
move C:\FPT\RAG\product_chunks.txt C:\FPT\RAG\data\
move C:\FPT\RAG\cosmetics.csv C:\FPT\RAG\data\
```

### **2️⃣ Tạo file .env (local, không commit):**

```powershell
copy .env.example .env
notepad .env  # Điền API key của bạn
```

### **3️⃣ Khởi tạo Git:**

```powershell
cd C:\FPT\RAG
git init
git add .
git commit -m "Initial commit: RAG Cosmetic Chatbot with VLM and Memory"
```

### **4️⃣ Tạo GitHub repository:**

1. Vào: https://github.com/new
2. Repository name: `rag-cosmetic-chatbot`
3. Description: `Cosmetic chatbot with RAG, VLM, and conversation memory`
4. Public/Private: Tùy chọn
5. **KHÔNG** tick "Add README" (đã có)
6. Click **Create repository**

### **5️⃣ Push lên GitHub:**

```powershell
# Thay YOUR_USERNAME bằng username GitHub của bạn
git remote add origin https://github.com/YOUR_USERNAME/rag-cosmetic-chatbot.git
git branch -M main
git push -u origin main
```

### **6️⃣ Xác nhận trên GitHub:**

Vào `https://github.com/YOUR_USERNAME/rag-cosmetic-chatbot` và kiểm tra:

- ✅ Có file `README.md` hiển thị đẹp
- ✅ Có file `requirements.txt`
- ✅ Có thư mục `data/` (nếu không commit data, thêm file `.gitkeep`)
- ✅ **KHÔNG** có file `.env` (chỉ có `.env.example`)
- ✅ **KHÔNG** có thư mục `db_chroma/`, `chat_history/`

---

## 🎯 Người khác sử dụng project của bạn:

### **Trên Windows:**

```powershell
git clone https://github.com/YOUR_USERNAME/rag-cosmetic-chatbot.git
cd rag-cosmetic-chatbot
setup.bat
```

### **Trên Linux/Mac:**

```bash
git clone https://github.com/YOUR_USERNAME/rag-cosmetic-chatbot.git
cd rag-cosmetic-chatbot
chmod +x setup.sh
./setup.sh
```

Sau đó:
1. Chỉnh `.env` (thêm API key)
2. Thêm `product_chunks.txt` vào `data/`
3. Chạy: `python RAG_cosmetic.py`

---

## ⚠️ LƯU Ý:

### **Files KHÔNG nên commit:**
- ❌ `.env` (chứa API key)
- ❌ `db_chroma/` (database tự tạo)
- ❌ `chat_history/` (lịch sử cá nhân)
- ❌ `venv/` (virtual environment)
- ❌ `__pycache__/` (Python cache)

### **Files NÊN commit:**
- ✅ `.env.example` (template không có key thật)
- ✅ `README.md` (hướng dẫn)
- ✅ `requirements.txt` (dependencies)
- ✅ `RAG_cosmetic.py` (main code)
- ✅ `config.py` (cấu hình)
- ✅ `data/product_chunks.txt` (nếu không quá lớn)

---

## 🔐 Bảo mật API Key:

**✅ AN TOÀN:**
```python
# config.py
import os
api_key = os.getenv('GOOGLE_API_KEY')  # ← Đọc từ .env
```

**❌ NGUY HIỂM:**
```python
# ĐỪNG LÀM NHƯ NÀY!
api_key = "AIzaSyDLKLq..."  # ← Hard-code trong code
```

---

## 📊 Statistics:

- **Total Files Created**: 8 files
- **Lines of Code**: ~800+ lines
- **Documentation**: 3 markdown files
- **Setup Scripts**: 2 (Windows + Linux)

---

## 🎉 HOÀN THÀNH!

Project của bạn đã sẵn sàng để:
✅ Upload lên GitHub
✅ Chia sẻ với người khác
✅ Deploy lên cloud
✅ Làm portfolio

**Link demo:** `https://github.com/YOUR_USERNAME/rag-cosmetic-chatbot`