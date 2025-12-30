"""
Script test API - Ví dụ cách gọi API từ Python
"""

import requests
import json
import base64
from pathlib import Path

# URL của API server
API_URL = "http://localhost:8000"

def test_health_check():
    """Test health check endpoint"""
    print("\n" + "=" * 80)
    print("TEST 1: Health Check")
    print("=" * 80)
    
    response = requests.get(f"{API_URL}/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

def test_chat_simple():
    """Test chat endpoint - câu hỏi đơn giản"""
    print("\n" + "=" * 80)
    print("TEST 2: Chat Simple")
    print("=" * 80)
    
    payload = {
        "question": "Tôi cần kem dưỡng cho da khô nhạy cảm"
    }
    
    response = requests.post(f"{API_URL}/chat", json=payload)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nCâu hỏi: {payload['question']}")
        print(f"Trả lời: {data['answer']}")
        print(f"Thời gian: {data['response_time']}s")
        print(f"Session ID: {data['session_id']}")
        return data['session_id']
    else:
        print(f"Error: {response.text}")
        return None

def test_chat_with_context(session_id):
    """Test chat với context - câu hỏi tiếp theo"""
    print("\n" + "=" * 80)
    print("TEST 3: Chat With Context")
    print("=" * 80)
    
    payload = {
        "question": "Còn serum thì sao?",
        "session_id": session_id  # Sử dụng session_id từ câu hỏi trước
    }
    
    response = requests.post(f"{API_URL}/chat", json=payload)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nCâu hỏi: {payload['question']}")
        print(f"Trả lời: {data['answer']}")
        print(f"Thời gian: {data['response_time']}s")

def test_image_upload(image_path):
    """Test upload ảnh và phân tích"""
    print("\n" + "=" * 80)
    print("TEST 4: Image Upload & Analysis")
    print("=" * 80)
    
    if not Path(image_path).exists():
        print(f"⚠️  File không tồn tại: {image_path}")
        print("Bỏ qua test này.")
        return
    
    with open(image_path, 'rb') as f:
        files = {'image': (Path(image_path).name, f, 'image/jpeg')}
        data = {
            'additional_text': 'Tôi bị mụn nhiều, tư vấn giúp tôi'
        }
        
        response = requests.post(f"{API_URL}/analyze-image", files=files, data=data)
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\nPhân tích da:")
        print(result['skin_analysis'])
        print(f"\nTư vấn sản phẩm:")
        print(result['product_recommendation'])
        if result.get('severity_warning'):
            print(f"\n{result['severity_warning']}")
        print(f"\nThời gian: {result['response_time']}s")

def test_image_base64(image_path):
    """Test gửi ảnh dạng base64"""
    print("\n" + "=" * 80)
    print("TEST 5: Image Base64 Analysis")
    print("=" * 80)
    
    if not Path(image_path).exists():
        print(f"⚠️  File không tồn tại: {image_path}")
        print("Bỏ qua test này.")
        return
    
    # Đọc và encode ảnh thành base64
    with open(image_path, 'rb') as f:
        image_base64 = base64.b64encode(f.read()).decode('utf-8')
    
    payload = {
        "image_base64": image_base64,
        "additional_text": "Phân tích da của tôi"
    }
    
    response = requests.post(f"{API_URL}/analyze-image-base64", json=payload)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\nPhân tích: {result['skin_analysis'][:200]}...")
        print(f"Tư vấn: {result['product_recommendation'][:200]}...")
        print(f"Thời gian: {result['response_time']}s")

def main():
    """Chạy tất cả các test"""
    print("\n🧪 BẮT ĐẦU TEST API")
    print("⚠️  Đảm bảo server đang chạy tại: http://localhost:8000")
    
    try:
        # Test 1: Health check
        test_health_check()
        
        # Test 2: Chat đơn giản
        session_id = test_chat_simple()
        
        # Test 3: Chat với context
        if session_id:
            test_chat_with_context(session_id)
        
        # Test 4 & 5: Image analysis (cần có file ảnh)
        # Thay đổi đường dẫn này thành ảnh thật của bạn
        test_image_path = r"D:\rag-cosmetic-chatbot\sample_skin.jpg"
        test_image_upload(test_image_path)
        test_image_base64(test_image_path)
        
        print("\n" + "=" * 80)
        print("✅ HOÀN THÀNH TẤT CẢ TEST!")
        print("=" * 80)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ KHÔNG THỂ KẾT NỐI ĐẾN SERVER!")
        print("Vui lòng chạy server trước: python api.py")
    except Exception as e:
        print(f"\n❌ LỖI: {e}")

if __name__ == "__main__":
    main()