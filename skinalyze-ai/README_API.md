# 🚀 Cosmetic RAG Chatbot API

API RESTful cho hệ thống tư vấn mỹ phẩm sử dụng RAG (Retrieval-Augmented Generation) và Vision AI.

## 📋 Mục lục

- [Cài đặt](#cài-đặt)
- [Chạy Server](#chạy-server)
- [API Endpoints](#api-endpoints)
- [Ví dụ sử dụng](#ví-dụ-sử-dụng)

## 🔧 Cài đặt

### 1. Cài đặt dependencies

```bash
pip install -r requirements.txt
```

### 2. Cấu hình

Đảm bảo file `config.py` hoặc biến môi trường `GOOGLE_API_KEY` đã được thiết lập.

## 🚀 Chạy Server

### Chạy server trực tiếp:

```bash
python api.py
```

Server sẽ chạy tại: `http://localhost:8000`

### Chạy với uvicorn (production):

```bash
uvicorn api:app --host 0.0.0.0 --port 8000 --workers 2
```

### Chạy với auto-reload (development):

```bash
uvicorn api:app --reload
```

## 📚 API Endpoints

### 1. Health Check

**GET** `/health`

Kiểm tra trạng thái server

**Response:**
```json
{
  "status": "healthy",
  "message": "RAG chain sẵn sàng",
  "vectorstore_status": "ready",
  "timestamp": "2025-11-14T10:30:00"
}
```

### 2. Chat - Tư vấn text

**POST** `/chat`

**Request Body:**
```json
{
  "question": "Tôi cần kem dưỡng cho da khô nhạy cảm",
  "session_id": "optional_session_id"
}
```

**Response:**
```json
{
  "answer": "Mình gợi ý cho bạn: 1. La Roche-Posay Toleriane...",
  "response_time": 2.5,
  "session_id": "session_1234567890",
  "timestamp": "2025-11-14T10:30:00"
}
```

### 3. Phân tích ảnh da (Upload file)

**POST** `/analyze-image`

**Request (multipart/form-data):**
- `image`: File ảnh (jpg, png, webp, etc.)
- `additional_text`: Text bổ sung (optional)
- `session_id`: Session ID (optional)

**Response:**
```json
{
  "skin_analysis": "LOẠI DA: Da dầu mụn...",
  "product_recommendation": "Gợi ý sản phẩm: 1. CeraVe...",
  "severity_warning": "⚠️ CẢNH BÁO: ...",
  "response_time": 5.2,
  "session_id": "session_1234567890",
  "timestamp": "2025-11-14T10:30:00"
}
```

### 4. Phân tích ảnh da (Base64)

**POST** `/analyze-image-base64`

**Request Body:**
```json
{
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "additional_text": "Tôi bị mụn nhiều",
  "session_id": "optional_session_id"
}
```

**Response:** Giống endpoint `/analyze-image`

### 5. Xóa session

**DELETE** `/session/{session_id}`

**Response:**
```json
{
  "message": "Đã xóa session session_1234567890",
  "status": "success"
}
```

## 💻 Ví dụ sử dụng

### Python (requests)

```python
import requests

# Chat đơn giản
response = requests.post(
    "http://localhost:8000/chat",
    json={"question": "Tôi cần serum cho da dầu mụn"}
)
print(response.json())

# Upload ảnh
with open("my_skin.jpg", "rb") as f:
    response = requests.post(
        "http://localhost:8000/analyze-image",
        files={"image": f},
        data={"additional_text": "Tư vấn giúp tôi"}
    )
print(response.json())
```

### JavaScript (fetch)

```javascript
// Chat
fetch('http://localhost:8000/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'Tôi cần kem chống nắng cho da nhạy cảm'
  })
})
.then(res => res.json())
.then(data => console.log(data));

// Upload ảnh
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('additional_text', 'Phân tích da tôi');

fetch('http://localhost:8000/analyze-image', {
  method: 'POST',
  body: formData
})
.then(res => res.json())
.then(data => console.log(data));
```

### cURL

```bash
# Health check
curl http://localhost:8000/health

# Chat
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Tôi cần kem dưỡng cho da khô"}'

# Upload ảnh
curl -X POST http://localhost:8000/analyze-image \
  -F "image=@my_skin.jpg" \
  -F "additional_text=Tư vấn sản phẩm cho tôi"
```

## 📖 API Documentation

Sau khi chạy server, truy cập:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🧪 Test API

Chạy script test tự động:

```bash
python test_api.py
```

## 🔐 Security Notes

### Production Deployment:

1. **Thay đổi CORS settings:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Chỉ định domain cụ thể
    ...
)
```

2. **Sử dụng HTTPS**

3. **Rate limiting:** Thêm middleware để giới hạn request

4. **Authentication:** Thêm API key hoặc JWT token

## ⚡ Performance Tips

1. **Sử dụng workers:** 
```bash
uvicorn api:app --workers 4
```

2. **Cache responses:** Implement caching cho các câu hỏi phổ biến

3. **Async processing:** Sử dụng background tasks cho các tác vụ nặng

## 🐛 Troubleshooting

### Server không khởi động

- Kiểm tra `GOOGLE_API_KEY` đã được thiết lập
- Kiểm tra vector store đã được tạo
- Xem logs để biết lỗi cụ thể

### Lỗi 503 Service Unavailable

- RAG chain chưa được khởi tạo
- Kiểm tra logs server khi khởi động

### Upload ảnh lỗi

- Kiểm tra định dạng ảnh (jpg, png, webp)
- Kiểm tra kích thước file (max 10MB)

## 📞 Support

Nếu gặp vấn đề, vui lòng mở issue hoặc liên hệ team phát triển.