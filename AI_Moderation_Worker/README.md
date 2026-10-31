# AI Moderation Worker (Hệ thống kiểm duyệt Livestream đa phương thức bằng AI)

Hệ thống AI Moderation Worker chịu trách nhiệm tự động kiểm duyệt luồng Livestream thời gian thực của Farmer bao gồm cả hình ảnh (Video frames) và giọng nói (Audio Speech transcripts). 

Dịch vụ được xây dựng dưới dạng một **AI Microservice** bằng **FastAPI (Python)**, nạp song song hai mô hình AI hiện đại và giao tiếp trực tiếp với Backend Spring Boot thông qua Webhook.

---

## 🛠️ Công nghệ & Mô hình AI sử dụng

Dự án áp dụng kiểm duyệt đa phương thức (Multimodal Moderation) kết hợp giữa thị giác máy tính và xử lý ngôn ngữ tự nhiên:

### 1. AI Thị giác (Computer Vision): Mô hình YOLOv8
*   **Mô hình sử dụng:** `yolov8n.pt` (YOLOv8 Nano - phiên bản cực nhẹ, chạy thời gian thực mượt mà trên CPU/GPU máy cá nhân).
*   **Nhiệm vụ kiểm duyệt:**
    *   **Phát hiện vật thể nguy hiểm (Weapons):** Sử dụng mạng nơ-ron nhận diện vật thể để quét tìm các vũ khí như dao (`knife`), kéo (`scissors`)... với độ tin cậy > 50%.
    *   **Phát hiện khỏa thân (Nudity):** Phân tích phổ màu da người HSV (Skin color ratio) thời gian thực. Nếu tỷ lệ diện tích da chiếm trên 60% khung hình, hệ thống sẽ cảnh báo vi phạm thuần phong mỹ tục.
    *   **Phát hiện Livestream rác (Trash Live):**
        *   *Màn hình đen:* Đo độ sáng trung bình của khung hình.
        *   *Màn hình tĩnh:* So sánh sai khác pixel giữa các khung hình liên tiếp. Nếu không có chuyển động trong vòng 30 giây, phòng live sẽ bị đánh dấu là live tĩnh/rác.

### 2. AI Ngôn ngữ (NLP): Mô hình PhoBERT
*   **Mô hình sử dụng:** `vijjj1/toxic-comment-phobert` (Được Fine-tune từ mô hình gốc `vinai/phobert-base-v2` của VinAI Research).
*   **Nhiệm vụ kiểm duyệt:** Đọc hiểu ngữ nghĩa và phân loại câu chữ tiếng Việt từ giọng nói (Speech-to-Text) dịch ra.
*   **Kiến trúc kiểm duyệt 2 lớp (Hybrid Classifier):**
    *   **Lớp 1 (Regex):** 
        *   Chặn ngay lập tức các quảng cáo nền tảng đối thủ (`zalo`, `shopee`, `facebook`, `momo`, `tiktok`...) hoặc số điện thoại giao dịch ngoài.
        *   Chặn ký tự `**` (khi người dùng nói bậy, trình duyệt Chrome STT sẽ tự động che thành dấu sao `**`, Regex sẽ bắt ngay trường hợp này với độ chính xác 100%).
    *   **Lớp 2 (Deep Learning PhoBERT):** 
        *   Nếu qua được lớp 1, văn bản được đưa vào mô hình PhoBERT để nhận diện chửi thề, lăng mạ hoặc viết lách luật phức tạp.
        *   Áp dụng **Ngưỡng tin cậy (Confidence Threshold = 50%)** bằng hàm Softmax để giảm thiểu tối đa các lỗi bắt nhầm từ ngắn vô hại (Dương tính giả).

---

## 🔌 Sơ đồ luồng hoạt động (Data Flow)

```mermaid
graph TD
    A[Farmer Livestream] -->|1. Phát Microphone & Camera| B(Trình duyệt Chrome)
    B -->|2. Chụp khung ảnh mỗi 10s| C[AI Local: POST /moderation/frame]
    B -->|3. Chrome STT dịch giọng nói| D[AI Local: POST /moderation/text]
    
    subgraph AI Moderation Worker (Cổng 8000)
        C --> YOLOv8[AI YOLOv8: Quét vũ khí & da người]
        D --> PhoBERT[AI PhoBERT + Regex: Quét giọng nói]
    end
    
    YOLOv8 -->|4. Phát hiện vi phạm| E[Spring Boot Webhook: /livestream-alert]
    PhoBERT -->|4. Phát hiện vi phạm| E
    
    E -->|5. Lưu CSDL & Đẩy cảnh báo real-time| F[Admin Web Dashboard trên Vercel]
```

---

## ⚙️ Cấu hình Biến môi trường

Địa chỉ gửi báo cáo về Spring Boot được cấu hình động thông qua biến `SPRING_BOOT_URL` trong file `main.py`. Bạn có thể thay đổi linh hoạt giữa môi trường Local và Online:

*   **Môi trường Test Local (Mặc định):**
    ```python
    SPRING_BOOT_URL = "http://localhost:8080/api/moderation/livestream-alert"
    ```
*   **Môi trường Chạy Online (Khi demo thực tế):**
    ```python
    SPRING_BOOT_URL = "https://agrimarket-cnpl.onrender.com/api/moderation/livestream-alert"



## 🚀 Hướng dẫn Cài đặt & Khởi chạy dưới Local

### 1️⃣ Đối với Lần chạy đầu tiên (First-time Setup sau khi Clone)
Thực hiện các bước sau tại Terminal:

1. **Tạo môi trường ảo Python (Virtual Environment):**
   *Nếu bạn vừa clone dự án về máy lần đầu, môi trường ảo chưa có sẵn nên bạn cần tạo `.venv` bằng lệnh:*
   - Từ thư mục gốc dự án (`AgriMarket`):
     ```bash
     python -m venv .venv
     ```
   - *(Nếu đang đứng ở thư mục `AI_Moderation_Worker`: `python -m venv ..\.venv`)*

2. **Di chuyển vào thư mục AI Worker:**
   ```bash
   cd AI_Moderation_Worker
   ```

3. **Cài đặt các thư viện cần thiết (PyTorch, Transformers, FastAPI, NLP...):**
   - **Trên Windows:**
     ```bash
     ..\.venv\Scripts\pip.exe install --no-cache-dir -r requirements.txt
     ```
   - **Trên macOS / Linux:**
     ```bash
     ../.venv/bin/pip install --no-cache-dir -r requirements.txt
     ```

4. **Khởi động server AI:**
   - **Trên Windows:**
     ```bash
     ..\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
     ```
   - **Trên macOS / Linux:**
     ```bash
     ../.venv/bin/python -m uvicorn main:app --reload --port 8000
     ```

5. **Đợi tải mô hình tự động:**
   * Hệ thống sẽ tự động tải mô hình **YOLOv8** (khoảng ~6MB) và mô hình **PhoBERT** (khoảng ~540MB) từ Hugging Face.
   * Toàn bộ các file mô hình tải về sẽ được lưu tự động trong thư mục `huggingface_cache` trong thư mục dự án.
   * Quá trình này mất khoảng 2 - 5 phút tùy thuộc vào tốc độ mạng của bạn. Vui lòng giữ nguyên Terminal cho đến khi thấy thông báo:
     `>>> PhoBERT loaded successfully.` và `INFO: Application startup complete.`

---

### 2️⃣ Đối với Các lần chạy sau đó (Subsequent Runs)
Khi các thư viện và mô hình đã được tải về đầy đủ trên máy của bạn, các lần chạy tiếp theo sẽ cực kỳ nhanh và đơn giản:

1. Mở Terminal tại thư mục `cd AI_Moderation_Worker`.
2. Khởi chạy ngay bằng một câu lệnh duy nhất (không cần tải lại thư viện hay mô hình):
   - **Windows:**
     ```bash
     ..\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
     ```
   - **macOS / Linux:**
     ```bash
     ../.venv/bin/python -m uvicorn main:app --reload --port 8000
     ```
   *Server AI sẽ khởi động và sẵn sàng hoạt động trong vòng chưa đầy 3 giây!*

---

## 🧪 Các API Endpoint chính
*   `POST /moderation/frame`: Nhận ảnh base64 chụp từ camera livestream của Farmer gửi lên để YOLOv8 phân tích.
*   `POST /moderation/text`: Nhận văn bản giọng nói STT của Farmer gửi lên để Regex và PhoBERT phân tích độc hại.
*   `POST /moderation/chat-text`: Kiểm tra tin nhắn văn bản khách hàng/nhà vườn bằng Regex và PhoBERT. Tin vi phạm bị backend từ chối, không lưu vào cuộc trò chuyện. Nếu PhoBERT chưa sẵn sàng, backend từ chối gửi tin nhắn để tránh bỏ lọt nội dung.
*   `GET /`: Kiểm tra trạng thái hoạt động của server và tình trạng nạp mô hình.
