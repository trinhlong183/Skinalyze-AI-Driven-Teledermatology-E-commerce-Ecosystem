# 🚀 Hướng dẫn triển khai RAG Cosmetic Chatbot

## 📦 Các bước đóng gói và upload lên GitHub

### **Bước 1: Di chuyển files vào đúng thư mục**

```bash
# Di chuyển vào thư mục project
cd C:\FPT\RAG

# Di chuyển file data vào thư mục data/
move product_chunks.txt data\
move cosmetics.csv data\
```

### **Bước 2: Tạo file .env**

```bash
# Copy template
copy .env.example .env

# Mở .env và điền API key của bạn
notepad .env
```

### **Bước 3: Kiểm tra cấu trúc**

Đảm bảo cấu trúc như sau:

```
C:\FPT\RAG\
├── RAG_cosmetic.py
├── config.py
├── requirements.txt
├── .env.example
├── .env              # ← Không commit file này!
├── .gitignore
├── README.md
├── DEPLOY.md
├── data/
│   ├── product_chunks.txt
│   └── cosmetics.csv
└── (db_chroma/ và chat_history/ sẽ tự tạo khi chạy)
```

### **Bước 4: Khởi tạo Git repository**

```bash
# Khởi tạo git
git init

# Thêm tất cả files (trừ những file trong .gitignore)
git add .

# Commit
git commit -m "Initial commit: RAG Cosmetic Chatbot"
```

### **Bước 5: Tạo repository trên GitHub**

1. Vào https://github.com/new
2. Tạo repository mới: `rag-cosmetic-chatbot`
3. **KHÔNG** tick "Initialize with README" (đã có sẵn)
4. Click "Create repository"

### **Bước 6: Push code lên GitHub**

```bash
# Liên kết với GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/rag-cosmetic-chatbot.git

# Push code
git branch -M main
git push -u origin main
```

---

## 🌐 Triển khai lên Server/Cloud

### **Option 1: Local Server (PC/Laptop)**

**Ưu điểm:** Miễn phí, full control
**Nhược điểm:** Cần máy luôn bật

```bash
# Chạy trong terminal
python RAG_cosmetic.py
```

### **Option 2: Heroku (Free tier)**

**Ưu điểm:** Dễ deploy, miễn phí
**Nhược điểm:** Giới hạn thời gian chạy

```bash
# Cài Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Tạo app
heroku create rag-cosmetic-chatbot

# Set API key
heroku config:set GOOGLE_API_KEY=your-api-key

# Deploy
git push heroku main
```

### **Option 3: Railway.app**

**Ưu điểm:** Miễn phí, dễ dùng, hỗ trợ Python tốt

1. Vào https://railway.app
2. Connect GitHub repository
3. Add environment variable: `GOOGLE_API_KEY`
4. Deploy tự động!

### **Option 4: Google Cloud Run**

**Ưu điểm:** Scalable, serverless
**Nhược điểm:** Phức tạp hơn

Cần tạo thêm `Dockerfile`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "RAG_cosmetic.py"]
```

---

## 🔒 Bảo mật API Key

### **⚠️ QUAN TRỌNG:**

**KHÔNG BAO GIỜ commit file `.env` hoặc API key lên GitHub!**

✅ **Đúng:**
```bash
# File .gitignore đã có:
.env
```

❌ **SAI:**
```python
# Đừng hard-code trong code:
GOOGLE_API_KEY = "AIzaSy..."  # ← NGUY HIỂM!
```

### **Nếu vô tình commit API key:**

1. **XÓA NGAY** API key trên Google Cloud Console
2. **TẠO KEY MỚI**
3. **Xóa key khỏi Git history:**

```bash
# Cài BFG Repo Cleaner
# https://rtyley.github.io/bfg-repo-cleaner/

# Xóa key khỏi history
bfg --replace-text passwords.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

---

## 📊 Theo dõi và Logging

### **Thêm logging vào code:**

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('chatbot.log'),
        logging.StreamHandler()
    ]
)
```

---

## 🧪 Testing trước khi deploy

### **1. Test local:**

```bash
python RAG_cosmetic.py
```

### **2. Test các tính năng:**

- [ ] Chat text bình thường
- [ ] Upload ảnh và phân tích
- [ ] Conversation memory (hỏi tiếp)
- [ ] Cảnh báo severity (ảnh da rất nặng)
- [ ] Lưu chat history khi quit

### **3. Test với data mẫu:**

```bash
# Tạo file test
pytest tests/  # (nếu có viết tests)
```

---

## 📈 Scale và Tối ưu

### **Nếu có nhiều users:**

1. **Thêm Redis** để cache results
2. **Load balancing** với Nginx
3. **Queue system** (Celery) cho VLM tasks
4. **Database** thay vì file JSON cho chat history

---

## 🆘 Troubleshooting

### **Lỗi: "No API key found"**
→ Kiểm tra file `.env` và `config.py`

### **Lỗi: "Vector store not found"**
→ Chạy lần đầu sẽ tạo database tự động, cần file `product_chunks.txt`

### **Lỗi: "Rate limit exceeded"**
→ Gemini API free tier có giới hạn, đợi 1 phút hoặc nâng cấp

### **Bot không nhớ context**
→ Kiểm tra `conversation_context` có được khởi tạo đúng không

---

## 📞 Support

- **Issues**: https://github.com/YOUR_USERNAME/rag-cosmetic-chatbot/issues
- **Email**: your-email@example.com

---

## ✅ Checklist triển khai

- [ ] Đã test local thành công
- [ ] Đã tạo `.env` và không commit lên Git
- [ ] Đã di chuyển data vào thư mục `data/`
- [ ] Đã kiểm tra `.gitignore`
- [ ] Đã commit code
- [ ] Đã tạo GitHub repository
- [ ] Đã push lên GitHub
- [ ] Đã thêm README.md đầy đủ
- [ ] (Optional) Đã deploy lên cloud

---

**🎉 Chúc mừng! Project của bạn đã sẵn sàng!**