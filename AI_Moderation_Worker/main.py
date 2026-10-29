import base64
import json
import os
import cv2
import numpy as np
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO
from dotenv import load_dotenv

# Tự động load file .env trong cùng thư mục
load_dotenv()

app = FastAPI(title="AgriMarket AI Moderation Worker")

# Enable CORS for local client & production client (Vercel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "https://agri-market-vlsm.vercel.app",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đọc URL từ file .env (ưu tiên) hoặc fallback về localhost
SPRING_BOOT_URL = os.getenv(
    "SPRING_BOOT_URL",
    "http://localhost:8080/api/moderation/livestream-alert"
)
print(f">>> SPRING_BOOT_URL = {SPRING_BOOT_URL}")


# Load pre-trained YOLOv8 model (automatically downloads coco weights on first run ~6MB)
try:
    print(">>> Loading YOLOv8 model...")
    yolo_model = YOLO("yolov8n.pt")
    print(">>> YOLOv8 loaded successfully.")
except Exception as e:
    print(f">>> Error loading YOLOv8: {e}. Running in fallback mode.")
    yolo_model = None

# Load pre-trained PhoBERT model for toxicity classification
nlp_tokenizer = None
nlp_model = None

try:
    print(">>> Loading PhoBERT Toxic Comment Classifier...")
    model_name = "vijjj1/toxic-comment-phobert"
    from transformers import AutoModelForSequenceClassification, AutoTokenizer
    import torch
    
    cache_directory = os.path.join(os.path.dirname(__file__), "huggingface_cache")
    nlp_tokenizer = AutoTokenizer.from_pretrained(model_name, cache_dir=cache_directory)
    nlp_model = AutoModelForSequenceClassification.from_pretrained(model_name, cache_dir=cache_directory)
    print(">>> PhoBERT loaded successfully.")
except Exception as e:
    print(f">>> Error loading PhoBERT model: {e}. Text checks will fallback to local regex.")

# Memory cache to detect static/trash livestreams
# Format: { livestream_id: { "last_frame": ndarray, "static_count": int } }
stream_history = {}


class FramePayload(BaseModel):
    livestreamId: int
    frame: str  # Base64 string


def decode_base64_image(base64_str: str):
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    img_data = base64.b64decode(base64_str)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


@app.post("/moderation/frame")
async def moderate_frame(payload: FramePayload):
    try:
        # 1. Decode frame
        img = decode_base64_image(payload.frame)
        if img is None:
            raise HTTPException(status_code=400, detail="Cannot decode image")

        shape = img.shape
        h, w = shape[0], shape[1]
        c = shape[2] if len(shape) > 2 else 1
        violations = []

        # 2. YOLOv8 Object Detection (Weapons / Knives check)
        if yolo_model:
            results = yolo_model(img, verbose=False)
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    name = r.names[cls_id]

                    # Class ID 43 is knife, 49 is scissors in COCO dataset
                    if (name in ["knife", "scissors"] or cls_id in [43, 49]) and conf > 0.5:
                        violations.append({
                            "type": "WEAPONS",
                            "detail": f"Phát hiện vật thể nguy hiểm: {name} ({conf:.2f})"
                        })

        # 3. Nudity Check (Skin color coverage heuristic)
        # Convert to HSV color space
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        # Define Vietnamese skin color range in HSV
        lower_skin = np.array([0, 20, 70], dtype=np.uint8)
        upper_skin = np.array([20, 255, 255], dtype=np.uint8)
        
        skin_mask = cv2.inRange(hsv, lower_skin, upper_skin)
        skin_pixels = cv2.countNonZero(skin_mask)
        total_pixels = h * w
        skin_ratio = skin_pixels / total_pixels

        # If skin color ratio covers more than 60% of the screen, flag as potential Nudity
        if skin_ratio > 0.60:
            violations.append({
                "type": "NUDITY",
                "detail": f"Phát hiện hình ảnh có tỷ lệ da cao: {skin_ratio * 100:.1f}%"
            })

        # 4. Trash Live Check (Black screen or Still/Static room)
        # Average brightness
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        avg_brightness = np.mean(gray)

        # Black screen check
        if avg_brightness < 12.0:
            violations.append({
                "type": "TRASH_LIVE",
                "detail": f"Phát hiện màn hình đen (độ sáng: {avg_brightness:.1f})"
            })
        else:
            # Static frame check (no motion)
            if payload.livestreamId not in stream_history:
                stream_history[payload.livestreamId] = {"last_frame": gray, "static_count": 0}
            else:
                hist = stream_history[payload.livestreamId]
                last_gray = hist["last_frame"]
                
                # Verify frame shape matches
                if last_gray.shape == gray.shape:
                    diff = cv2.absdiff(gray, last_gray)
                    mean_diff = np.mean(diff)
                    
                    # If pixel change is minimal (< 0.8 average deviation)
                    if mean_diff < 0.8:
                        hist["static_count"] += 1
                        if hist["static_count"] >= 3: # 3 intervals * 10s = 30 seconds of absolute stillness
                            violations.append({
                                "type": "TRASH_LIVE",
                                "detail": "Phát hiện màn hình tĩnh (Không có chuyển động trong 30 giây)"
                            })
                    else:
                        hist["static_count"] = 0
                
                # Update last frame
                hist["last_frame"] = gray

        # 5. Handle violations by forwarding to Spring Boot Webhook
        for violation in violations:
            print(f">>> AI Moderation Violation: {violation['type']} - {violation['detail']}")
            
            webhook_payload = {
                "livestreamId": payload.livestreamId,
                "alertType": violation["type"],
                "evidenceUrl": payload.frame # Post base64 image as evidence
            }
            
            try:
                r = requests.post(SPRING_BOOT_URL, json=webhook_payload)
                if r.status_code == 200:
                    print(f"    Alert successfully reported to Spring Boot.")
                else:
                    print(f"    Failed to report alert to Spring Boot: {r.status_code} - {r.text}")
            except Exception as e:
                print(f"    Error connecting to Spring Boot webhook: {e}")

        return {"status": "success", "violations_found": len(violations)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class TextPayload(BaseModel):
    livestreamId: int
    text: str


@app.post("/moderation/text")
async def moderate_text(payload: TextPayload):
    import re
    is_violation = False
    reason = None
    
    # 1. LỚP 1: Kiểm tra nhanh bằng Regex (Chặn tên đối thủ, SĐT, hoặc từ tục thô thiển)
    lower_text = payload.text.lower()
    
    # Quét tên nền tảng đối thủ cạnh tranh
    competitor_pattern = re.compile(
        r"\b(facebook|zalo|shopee|lazada|tiki|momo|tiktok|fb\.com|zalo\.me|fb\.me|t\.me)\b", re.IGNORECASE
    )
    # Quét định dạng số điện thoại
    phone_pattern = re.compile(
        r"\b0[35789](\s*\.?\s*\d){8}\b"
    )
    # Danh sách từ tục tĩu thô cứng
    bad_words = ["địt", "đm", "đkm", "đcm", "vcl", "vãi lồn", "cặc", "lồn", "đéo", "đĩ", "chó đẻ"]
    
    if competitor_pattern.search(lower_text) or phone_pattern.search(lower_text):
        is_violation = True
        reason = "REDIRECT_VIOLATION"
    elif any(w in lower_text for w in bad_words) or "**" in lower_text:
        is_violation = True
        reason = "TOXIC_OR_OFFENSIVE"
        
    # 2. LỚP 2: Nếu Regex chưa bắt được, dùng PhoBERT để nhận diện ngữ nghĩa phức tạp hơn
    if not is_violation:
        if nlp_model is not None and nlp_tokenizer is not None:
            try:
                import torch
                inputs = nlp_tokenizer(payload.text, return_tensors="pt", truncation=True, max_length=256)
                with torch.no_grad():
                    outputs = nlp_model(**inputs)
                
                # Tính xác suất bằng Softmax
                probabilities = torch.softmax(outputs.logits, dim=1)
                toxic_prob = probabilities[0][1].item()
                
                # In thông tin độ tin cậy của mọi câu nói để dễ theo dõi/debug
                print(f">>> PhoBERT check: '{payload.text}' -> Toxic confidence: {toxic_prob * 100:.2f}%")
                
                # Hạ ngưỡng tin cậy (Confidence Threshold) xuống 0.50 (50%)
                THRESHOLD = 0.50
                if toxic_prob > THRESHOLD:
                    is_violation = True
                    reason = "TOXIC_OR_OFFENSIVE"
            except Exception as e:
                print(f">>> Text classification error: {e}")

    # 3. Gửi Webhook báo cáo về Spring Boot
    if is_violation:
        print(f">>> AI Text Moderation Violation: {reason} - {payload.text}")
        webhook_payload = {
            "livestreamId": payload.livestreamId,
            "alertType": "AUDIO_VIOLATION",
            "evidenceUrl": f"Phát ngôn vi phạm: \"{payload.text}\" (AI nhận diện: {reason})"
        }
        try:
            r = requests.post(SPRING_BOOT_URL, json=webhook_payload)
            if r.status_code == 200:
                print(f"    Alert successfully reported to Spring Boot.")
            else:
                print(f"    Failed to report alert to Spring Boot: {r.status_code} - {r.text}")
        except Exception as e:
            print(f"    Error connecting to Spring Boot webhook: {e}")

    return {
        "flagged": is_violation,
        "reason": reason
    }


@app.get("/")
def index():
    return {
        "status": "running", 
        "yolo_loaded": yolo_model is not None,
        "phobert_loaded": nlp_model is not None
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


