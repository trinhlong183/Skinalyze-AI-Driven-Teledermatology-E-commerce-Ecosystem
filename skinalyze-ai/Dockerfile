# Sử dụng Python 3.10
FROM python:3.10-slim

# Thiết lập thư mục làm việc
WORKDIR /app

# Cài đặt thư viện hệ thống
RUN apt-get update && apt-get install -y \
    git \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements và cài đặt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Tạo các thư mục cần thiết
RUN mkdir -p data models db_chroma chat_history

# --- FIX SAM2 CONFIG: Tải file config về đúng cấu trúc package ---
RUN mkdir -p /usr/local/lib/python3.10/site-packages/sam2/configs/sam2.1/
RUN curl -L -o /usr/local/lib/python3.10/site-packages/sam2/configs/sam2.1/sam2.1_hiera_t.yaml https://raw.githubusercontent.com/facebookresearch/sam2/main/sam2/configs/sam2.1/sam2.1_hiera_t.yaml

# --- FIX LỖI PERMISSION (QUAN TRỌNG) ---
# Chuyển Cache ra thư mục /tmp để tránh lỗi Permission Denied
ENV MPLCONFIGDIR=/tmp/matplotlib
ENV HF_HOME=/tmp/huggingface
ENV SENTENCE_TRANSFORMERS_HOME=/tmp/sentence_transformers

# Cấp quyền cho user 1000
RUN chown -R 1000:1000 /app

# Chuyển sang user non-root
USER 1000

# Copy toàn bộ code
COPY --chown=1000:1000 . .

# Mở port
EXPOSE 7860

# Chạy server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]