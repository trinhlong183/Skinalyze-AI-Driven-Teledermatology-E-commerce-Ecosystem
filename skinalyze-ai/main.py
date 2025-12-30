"""
AI Dermatology & Cosmetic Consultant API
Stateless API for NestJS Backend Integration
"""

# =============================================================================
# IMPORTS
# =============================================================================
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io
import base64
import numpy as np
from typing import Dict, Optional, List, Any
import os
import time
import json
import re
from datetime import datetime
import mediapipe as mp
from dotenv import load_dotenv
import google.generativeai as genai 

load_dotenv()

# Ensure RAG_cosmetic.py is in the same directory
from RAG_cosmetic import (
    setup_api_key,
    load_or_create_vectorstore,
    setup_rag_chain,
    analyze_skin_image,
    check_severity,
    build_image_analysis_query,
    detect_skin_condition_and_types,
    get_product_suggestions_by_skin_types,
    map_disease_to_skin_types,
    convert_price_in_text
)

# =============================================================================
# CONFIGURATION
# =============================================================================
SKIN_CLASSES = [
    'Acne',
    'Actinic_Keratosis',
    'Drug_Eruption',
    'Eczema',
    'Normal',
    'Psoriasis',
    'Rosacea',
    'Seborrh_Keratoses',
    'Sun_Sunlight_Damage',
    'Tinea',
    'Warts'
]

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATHS = {
    'classification': os.path.join(BASE_DIR, "models/efficientnet_b0_complete.pt"),
    'segmentation': os.path.join(BASE_DIR, "models/medsam2_dermatology_best_aug2.pth")
}

IMAGE_TRANSFORMS = {
    'classification': transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
}

# =============================================================================
# GLOBAL STATE
# =============================================================================
class AppState:
    rag_chain = None
    classification_model = None
    segmentation_model = None
    face_detector = None
    vectorstore = None

state = AppState()

# =============================================================================
# SMART FILTERING LOGIC (ENHANCED PERSONALIZATION)
# =============================================================================
async def smart_product_filtering(
    db, 
    disease_class: str, 
    skin_types: List[str], 
    age: Optional[int], 
    gender: Optional[str], 
    allergies: Optional[str]
) -> List[Dict[str, str]]:
    """
    ASYNC Version: Lọc sản phẩm dùng Gemini với Prompt chú trọng toàn diện:
    Disease + Skin Type + Age + Gender + Allergies.
    """
    try:
        print(f"\n🧠 Starting Smart Product Filtering for {disease_class}...")
        
        # 1. Broad Search (Tìm kiếm rộng ~25 sản phẩm)
        search_terms = [disease_class] + skin_types
        # Thêm từ khóa ingredients để đảm bảo có thông tin thành phần cho việc lọc
        query = f"sản phẩm điều trị chăm sóc da {disease_class} {' '.join(skin_types)} ingredients"
        
        docs = db.similarity_search(query, k=25)
        
        # 2. Group & Deduplicate
        candidates = {}
        for doc in docs:
            name = doc.metadata.get('product_name')
            if not name:
                match = re.search(r'Product Name:\s*(.+?)(?:\n|$)', doc.page_content, re.IGNORECASE)
                if match:
                    name = match.group(1).strip()
            
            if name and name not in candidates:
                # Cắt ngắn content nhưng giữ đủ thông tin quan trọng
                candidates[name] = doc.page_content[:500]
        
        if not candidates:
            return []

        print(f"   🔍 Found {len(candidates)} candidate products. Asking Gemini (Async)...")

        # 3. Construct Prompt with Holistic Reasoning
        candidate_list_text = ""
        for i, (name, content) in enumerate(candidates.items()):
            candidate_list_text += f"ID_{i}: {name}\nThông tin: {content}\n---\n"

        # Xử lý thông tin hiển thị
        display_age = f"{age} tuổi" if age else "độ tuổi trưởng thành"
        display_gender = gender if gender else "mọi giới tính"
        display_allergies = allergies if allergies and allergies.lower() not in ["none", "null", ""] else "Không có"
        
        prompt = f"""
        Bạn là chuyên gia da liễu cá nhân hóa cao cấp. Hãy chọn ĐÚNG 5 sản phẩm tốt nhất từ danh sách bên dưới.

        HỒ SƠ BỆNH NHÂN (RẤT QUAN TRỌNG):
        - 🛑 DỊ ỨNG: {display_allergies} (Bắt buộc loại bỏ sản phẩm chứa thành phần này).
        - 🏥 Bệnh lý chẩn đoán: {disease_class}.
        - 🧬 Loại da: {', '.join(skin_types)}.
        - 👤 Thông tin cá nhân: {display_gender}, {display_age}.

        DANH SÁCH ỨNG VIÊN:
        {candidate_list_text}

        YÊU CẦU LỌC VÀ VIẾT LÝ DO:
        1. An toàn là trên hết: Loại bỏ ngay lập tức sản phẩm chứa chất gây dị ứng cho bệnh nhân.
        2. Tính phù hợp: Ưu tiên sản phẩm điều trị hiệu quả {disease_class} và phù hợp với {display_gender} ở độ tuổi {display_age}.
        3. ✍️ VIẾT LÝ DO (REASON): Hãy viết một câu giải thích ngắn gọn nhưng TỔNG HỢP được các yếu tố trên.
           - Đừng chỉ nói về thành phần. Hãy kết nối nó với bệnh lý, tuổi và giới tính.
           
           Ví dụ TỐT: "Sản phẩm chứa Salicylic Acid giúp trị mụn (Acne) hiệu quả, kết cấu gel mỏng nhẹ phù hợp cho nam giới 20 tuổi da dầu, và đảm bảo không chứa hương liệu (tránh dị ứng)."
           Ví dụ TỐT: "Kem dưỡng ẩm phục hồi hàng rào bảo vệ da, rất cần thiết cho bệnh Chàm (Eczema), thành phần lành tính an toàn cho nữ giới 30 tuổi và không chứa [Dị ứng]."

        OUTPUT FORMAT (JSON ONLY):
        [
            {{ "product_name": "Tên sản phẩm chính xác", "reason": "Lý do tổng hợp như yêu cầu..." }},
            ...
        ]
        """

        # 4. Call Gemini ASYNC
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = await model.generate_content_async(prompt)
        
        # 5. Parse Result
        result_text = response.text.strip()
        
        if "```" in result_text:
            start = result_text.find("[")
            end = result_text.rfind("]") + 1
            if start != -1 and end != -1:
                result_text = result_text[start:end]
        
        try:
            suggested_products = json.loads(result_text)
            
            valid_results = []
            if isinstance(suggested_products, list):
                for item in suggested_products:
                    if isinstance(item, dict) and "product_name" in item:
                        reason = item.get("reason", f"Sản phẩm phù hợp điều trị {disease_class} cho {display_gender}, {display_age}.")
                        valid_results.append({"product_name": item["product_name"], "reason": reason})
                    
                    elif isinstance(item, str):
                        valid_results.append({"product_name": item, "reason": f"Gợi ý chuyên biệt cho {display_gender}, {display_age} bị {disease_class}."})
                
                print(f"   ✅ Gemini selected top {len(valid_results)} products with personalized reasons.")
                return valid_results[:5]
            else:
                 print("   ⚠️ Gemini response format unexpected, falling back.")
                 return [{"product_name": name, "reason": f"Phù hợp với {disease_class} và loại da của bạn."} for name in list(candidates.keys())[:5]]

        except json.JSONDecodeError:
            print(f"   ⚠️ JSON Parse Error. Fallback.")
            return [{"product_name": name, "reason": f"Sản phẩm được gợi ý cho tình trạng {disease_class}."} for name in list(candidates.keys())[:5]]

    except Exception as e:
        print(f"   ❌ Error in smart filtering: {str(e)}")
        # Fallback về logic cũ
        basic_list = get_product_suggestions_by_skin_types(db, skin_types, num_products=5)
        return [{"product_name": name, "reason": f"Đề xuất dựa trên loại da {', '.join(skin_types)}."} for name in basic_list]

# =============================================================================
# MODEL LOADING
# =============================================================================
def load_classification_model():
    """
    Load EfficientNet-B0 với architecture khớp training notebook
    Architecture: 1280 → [Dropout 0.4] → 512 → [BN + ReLU + Dropout 0.3] → 256 → [BN + ReLU] → 11
    """
    model_path = MODEL_PATHS['classification']
    if not os.path.exists(model_path):
        print(f"⚠️  Classification model not found at {model_path}")
        return None
    
    try:
        # Load checkpoint
        checkpoint = torch.load(model_path, map_location=device, weights_only=False)
        
        # 1. If checkpoint is a full model object
        if not isinstance(checkpoint, dict):
            print("ℹ️  Checkpoint is a full model object.")
            model = checkpoint
            model.to(device)
            model.eval()
            return model

        # 2. Extract state_dict
        state_dict = checkpoint.get('model_state_dict', checkpoint)
        
        # Get architecture config
        config = checkpoint.get('config', {})
        dropout1 = config.get('dropout1', 0.4)
        dropout2 = config.get('dropout2', 0.3)
        num_classes = checkpoint.get('num_classes', len(SKIN_CLASSES))
        
        print(f"ℹ️  Loading model with config:")
        print(f"   - Num classes: {num_classes}")
        
        # Initialize EfficientNet-B0 base
        model = models.efficientnet_b0(weights=None)
        
        # Reconstruct EXACT classifier
        num_features = 1280
        
        model.classifier = nn.Sequential(
            nn.Dropout(p=dropout1),
            nn.Linear(num_features, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(p=dropout2),
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Linear(256, num_classes)
        )
        
        # Load trained weights
        model.load_state_dict(state_dict, strict=False)
        model.to(device)
        model.eval()
        
        print(f"✅ Classification model loaded successfully")
        
        return model
        
    except Exception as e:
        print(f"❌ Error loading classification model: {e}")
        import traceback
        traceback.print_exc()
        return None

def load_segmentation_model():
    """Load SAM2 segmentation model"""
    model_path = MODEL_PATHS['segmentation']
    if not os.path.exists(model_path):
        print(f"⚠️  Segmentation model not found")
        return None
    
    try:
        from sam2.build_sam import build_sam2
        from sam2.sam2_image_predictor import SAM2ImagePredictor
        
        checkpoint = torch.load(model_path, map_location=device, weights_only=False)
        config_file = "configs/sam2.1/sam2.1_hiera_t.yaml"
        print(f"ℹ️ Loading SAM2 with config: {config_file}")

        sam2_model = build_sam2(
            config_file=config_file,
            ckpt_path=None,
            device=device,
            mode='eval',
            apply_postprocessing=False
        )
        
        if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
            sam2_model.load_state_dict(checkpoint['model_state_dict'], strict=False)
        
        predictor = SAM2ImagePredictor(sam2_model)
        print("✅ SAM2 segmentation model loaded")
        return predictor
        
    except Exception as e:
        print(f"❌ Error loading segmentation model: {e}")
        return None

def load_face_detection_model():
    """Load Mediapipe Face Detection model"""
    try:
        mp_face_detection = mp.solutions.face_detection
        detector = mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5)
        print("✅ Face detection model loaded")
        return detector
    except Exception as e:
        print(f"❌ Error loading face detection model: {e}")
        return None

# =============================================================================
# LIFESPAN (STARTUP/SHUTDOWN)
# =============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print("\n" + "=" * 80)
    print("🚀 STARTING AI DERMATOLOGY & COSMETIC API SERVER")
    print("=" * 80)
    
    state.classification_model = load_classification_model()
    state.segmentation_model = load_segmentation_model()
    state.face_detector = load_face_detection_model()

    try:
        setup_api_key()
        db, embeddings = load_or_create_vectorstore()
        
        if db is None:
            print("\n⚠️  Vector Store not initialized")
        else:
            state.vectorstore = db
            state.rag_chain = setup_rag_chain(db)
            print("\n✅ RAG Chatbot ready")
        
        print("\n✅ Server ready!")
        print("📚 API Documentation: http://localhost:8000/docs")
        print("=" * 80 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error initializing RAG: {e}\n")
    
    yield
    
    print("Shutting down models...")

# =============================================================================
# FASTAPI APP DEFINITION
# =============================================================================
app = FastAPI(
    title="AI Dermatology & Cosmetic Consultant API",
    description="Stateless API for skin disease classification, segmentation, and cosmetic consultation",
    version="3.7.3",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# PYDANTIC MODELS
# =============================================================================
class ChatRequest(BaseModel):
    question: str
    conversation_history: Optional[List[Dict[str, str]]] = None 

class ChatResponse(BaseModel):
    answer: str
    response_time: float
    timestamp: str

class ImageAnalysisRequest(BaseModel):
    image_base64: str
    additional_text: Optional[str] = None

class ImageAnalysisResponse(BaseModel):
    skin_analysis: str
    product_recommendation: str
    severity_warning: Optional[str] = None
    response_time: float
    timestamp: str

class HealthResponse(BaseModel):
    status: str
    message: str
    vectorstore_status: str
    classification_model_status: str
    segmentation_model_status: str
    timestamp: str

class VLMAnalysisResponse(BaseModel):
    skin_analysis: str
    response_time: float
    timestamp: str

# =============================================================================
# HEALTH CHECK
# =============================================================================
@app.get("/", response_model=HealthResponse)
@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy" if state.rag_chain else "degraded",
        message="AI Dermatology & Cosmetic API",
        vectorstore_status="ready" if state.rag_chain else "not_initialized",
        classification_model_status="loaded" if state.classification_model else "not_loaded",
        segmentation_model_status="loaded" if state.segmentation_model else "not_loaded",
        timestamp=datetime.now().isoformat()
    )

# =============================================================================
# RAG CHATBOT ENDPOINTS
# =============================================================================
@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    question: str = Form(...),
    conversation_history: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None)
):
    if state.rag_chain is None:
        raise HTTPException(status_code=503, detail="RAG chain not initialized")
    
    try:
        start_time = time.time()
        
        # 1. Parse conversation history
        history_list = []
        if conversation_history:
            try:
                history_list = json.loads(conversation_history)
            except json.JSONDecodeError:
                print("⚠️ Failed to parse conversation_history JSON")
                history_list = []

        # 2. VLM Analysis (If image is provided)
        vlm_context_str = ""
        if image:
            if not image.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="Uploaded file is not an image")
            
            image_bytes = await image.read()
            skin_analysis = analyze_skin_image(image_bytes, note=question)
            
            if skin_analysis:
                vlm_context_str = f"""
\n[THÔNG TIN TỪ ẢNH NGƯỜI DÙNG GỬI KÈM]:
Hệ thống đã phân tích ảnh da của người dùng với kết quả sau:
{skin_analysis}
-----------------------------------
"""
        
        # 3. Intelligent Product Recommendation Logic
        detected_condition, suitable_skin_types = detect_skin_condition_and_types(question)
        
        condition_context_str = ""
        if detected_condition:
            skin_types_str = ", ".join(suitable_skin_types) if suitable_skin_types else "mọi loại da"
            condition_context_str = f"""
[HỆ THỐNG PHÁT HIỆN VẤN ĐỀ DA]:
- Vấn đề phát hiện: {detected_condition}
- Loại da phù hợp để tư vấn sản phẩm: {skin_types_str}
- ƯU TIÊN tìm kiếm và gợi ý các sản phẩm trong database dành cho: {skin_types_str}
-----------------------------------
"""

        # 4. Build Context from History
        context_str = ""
        if history_list:
            context_pairs = []
            for i in range(0, len(history_list) - 1, 2):
                if i + 1 < len(history_list):
                    user_msg = history_list[i]
                    ai_msg = history_list[i + 1]
                    if user_msg.get('role') == 'user' and ai_msg.get('role') == 'ai':
                        context_pairs.append((
                            user_msg.get('content', ''),
                            ai_msg.get('content', '')
                        ))
            
            if context_pairs:
                recent = context_pairs[-3:]
                context_str = "LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ:\n" + "\n".join([
                    f"User: {ctx[0]}\nAI: {ctx[1][:200]}..." 
                    for ctx in recent
                ]) + "\n"

        # 5. Construct Final Prompt for RAG
        full_query = f"""{context_str}
{vlm_context_str}
{condition_context_str}
CÂU HỎI HIỆN TẠI CỦA NGƯỜI DÙNG: {question}
Yêu cầu: Hãy trả lời câu hỏi của người dùng dựa trên thông tin sản phẩm có trong database. 
Nếu có thông tin từ ảnh hoặc vấn đề da được phát hiện, hãy sử dụng nó để lọc và tư vấn sản phẩm chính xác hơn."""
        
        # 6. Invoke RAG Chain
        response = state.rag_chain.invoke(full_query)
        
        return ChatResponse(
            answer=response,
            response_time=round(time.time() - start_time, 2),
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        print(f"Chat Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/analyze-image", response_model=ImageAnalysisResponse)
async def analyze_image_endpoint(
    image: UploadFile = File(...),
    additional_text: Optional[str] = Form(None)
):
    if state.rag_chain is None:
        raise HTTPException(status_code=503, detail="RAG chain not initialized")
    
    try:
        start_time = time.time()
        image_bytes = await image.read()
        
        skin_analysis = analyze_skin_image(image_bytes)
        if not skin_analysis:
            raise HTTPException(status_code=400, detail="Cannot analyze image")
        
        is_severe = check_severity(skin_analysis)
        rag_query = build_image_analysis_query(skin_analysis, additional_text)
        
        product_recommendation = state.rag_chain.invoke(rag_query)
        
        return ImageAnalysisResponse(
            skin_analysis=skin_analysis,
            product_recommendation=product_recommendation,
            severity_warning="⚠️ SEVERE: Please consult a dermatologist immediately!" if is_severe else None,
            response_time=round(time.time() - start_time, 2),
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/analyze-image-base64", response_model=ImageAnalysisResponse)
async def analyze_image_base64_endpoint(request: ImageAnalysisRequest):
    if state.rag_chain is None:
        raise HTTPException(status_code=503, detail="RAG chain not initialized")
    
    try:
        start_time = time.time()
        skin_analysis = analyze_skin_image(request.image_base64)
        if not skin_analysis:
            raise HTTPException(status_code=400, detail="Cannot analyze image")
        
        is_severe = check_severity(skin_analysis)
        rag_query = build_image_analysis_query(skin_analysis, request.additional_text)
        product_recommendation = state.rag_chain.invoke(rag_query)
        
        return ImageAnalysisResponse(
            skin_analysis=skin_analysis,
            product_recommendation=product_recommendation,
            severity_warning="⚠️ SEVERE: Please consult a dermatologist!" if is_severe else None,
            response_time=round(time.time() - start_time, 2),
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# =============================================================================
# CLASSIFICATION & SEGMENTATION ENDPOINTS
# =============================================================================
@app.post("/api/classification-disease")
async def classify_skin_disease(
    file: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    age: Optional[int] = Form(None),       
    gender: Optional[str] = Form(None),    
    allergies: Optional[str] = Form(None) 
) -> Dict:
    """
    Classify skin disease, then filter products via Gemini based on Age, Gender, Allergies.
    Returns Dictionary containing classification results and a list of product objects with reasons.
    """
    if state.classification_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        # Conditional Face Detection
        if notes == 'facial':
            if state.face_detector:
                image_np = np.array(image)
                results = state.face_detector.process(image_np)
                
                if not results.detections:
                      raise HTTPException(
                          status_code=400, 
                          detail="No face detected. Please upload a clear image of a face for facial analysis."
                      )
            else:
                print("⚠️ Face detector skipped (not loaded)")

        input_tensor = IMAGE_TRANSFORMS['classification'](image).unsqueeze(0).to(device)
        
        with torch.no_grad():
            outputs = state.classification_model(input_tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)
            confidence, predicted = torch.max(probabilities, 1)
            all_probs = probabilities[0].cpu().numpy()
        
        # Safe Prediction Logic
        pred_index = predicted.item()
        if pred_index >= len(SKIN_CLASSES):
            return {
                "predicted_class": "Unknown",
                "confidence": float(confidence.item()),
                "note": "Model prediction index out of bounds for current class list",
                "product_suggestions": []
            }

        predicted_class = SKIN_CLASSES[pred_index]
        
        # Get product suggestions (Smart Filtering)
        product_suggestions = []
        if state.vectorstore:
            # Map disease to skin types
            suitable_skin_types = map_disease_to_skin_types(predicted_class)
            
            # ✅ CALL SMART FILTERING with Gemini (Async)
            product_suggestions = await smart_product_filtering(
                state.vectorstore,
                predicted_class,
                suitable_skin_types,
                age,
                gender,
                allergies
            )

        return {
            "predicted_class": predicted_class,
            "confidence": float(confidence.item()),
            "all_predictions": {SKIN_CLASSES[i]: float(all_probs[i]) for i in range(min(len(SKIN_CLASSES), len(all_probs)))},
            "product_suggestions": product_suggestions # Returns List[Dict]
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/segmentation-disease")
async def segment_skin_lesion(file: UploadFile = File(...)) -> Dict:
    if state.segmentation_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        original_size = image.size
        image_np = np.array(image)
        
        state.segmentation_model.set_image(image_np)
        
        with torch.no_grad():
            masks, scores, _ = state.segmentation_model.predict(
                point_coords=None, point_labels=None, box=None, multimask_output=False
            )
        
        mask = masks[0] if len(masks) > 0 else np.zeros(image_np.shape[:2], dtype=np.uint8)
        
        if mask.dtype == bool:
            mask = mask.astype(np.uint8) * 255
        elif mask.max() <= 1:
            mask = (mask * 255).astype(np.uint8)
        
        black_bg = Image.new("RGB", original_size, (0, 0, 0))
        mask_pil = Image.fromarray(mask).convert("L")
        
        if mask_pil.size != original_size:
            mask_pil = mask_pil.resize(original_size, Image.NEAREST)

        full_image_on_black = Image.composite(image, black_bg, mask_pil)
        buffer_black_bg = io.BytesIO()
        full_image_on_black.save(buffer_black_bg, format="JPEG", quality=90)
        black_bg_base64 = base64.b64encode(buffer_black_bg.getvalue()).decode("utf-8")

        mask_image = Image.fromarray(mask)
        if mask_image.size != original_size:
            mask_image = mask_image.resize(original_size, Image.NEAREST)
        
        buffer = io.BytesIO()
        mask_image.save(buffer, format="PNG")
        mask_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        
        return {
            "mask": mask_base64,
            "lesion_on_black": black_bg_base64,
            "format": "base64_png",
            "original_size": original_size,
            "confidence": float(scores[0]) if len(scores) > 0 else 0.0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# FACE DETECTION ENDPOINT
# =============================================================================
@app.post("/api/face-detection")
async def face_detection(file: UploadFile = File(...)) -> Dict[str, bool]:
    if state.face_detector is None:
        print("⚠️  Face detection model not loaded")
        return {"has_face": True} 
    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
        image_np = np.array(image)

        results = state.face_detector.process(image_np)

        if results.detections:
            return {"has_face": True}
        return {"has_face": False}
    except Exception as e:
        print(f"❌ Error during face detection: {e}")
        return {"has_face": False}

@app.post("/api/analyze-skin-image-vlm", response_model=VLMAnalysisResponse)
async def analyze_skin_image_vlm_endpoint(file: UploadFile = File(...), note: Optional[str] = Form(None)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    try: 
        start_time = time.time()
        image_bytes = await file.read()
        skin_analysis = analyze_skin_image(image_bytes, note)
        
        if not skin_analysis:
            raise HTTPException(status_code=500, detail="VLM failed to analyze the image. Please try again.")
        
        return VLMAnalysisResponse(
            skin_analysis=skin_analysis,
            response_time=round(time.time() - start_time, 2),
            timestamp=datetime.now().isoformat()
        )
    
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ Error in VLM endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# =============================================================================
# RUN SERVER
# =============================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)