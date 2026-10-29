import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import {
  Sparkles,
  Camera,
  Upload,
  History,
  X,
  Zap,
  ZoomIn,
  Check,
  CheckCircle2,
  AlertTriangle,
  Search,
  RotateCcw,
  Crop,
  Image as ImageIcon,
  Trash2,
  Lightbulb,
  FileText,
  ShieldCheck,
  Plus,
  Sprout,
  Leaf,
  Layers,
  Grid
} from "lucide-react";
import aiService from "../../../services/aiService";
import "./ImageSearchModal.css";

const ImageSearchModal = ({ isOpen, onClose, onSearchParsed }) => {
  // Tabs: 'camera' | 'upload' | 'history'
  const [activeTab, setActiveTab] = useState("camera");

  // Recognition States: 'idle' | 'analyzing' | 'success' | 'failed'
  const [modalState, setModalState] = useState("idle");

  // Multi-Photo Draft Album Staging list: array of { id, imageBase64, mimeType, aiResult, selectedObjIdx }
  const [draftAlbumList, setDraftAlbumList] = useState([]);
  const [albumList, setAlbumList] = useState([]);
  const [activeAlbumIndex, setActiveAlbumIndex] = useState(0);

  // Result Display Mode: 'aggregated' (Multi-Angle Single Product) | 'individual' (Multi-Product Album)
  const [resultDisplayMode, setResultDisplayMode] = useState("aggregated");
  const [aggregatedResult, setAggregatedResult] = useState(null);

  // Progress states
  const [progress, setProgress] = useState(0);

  // Processing Pipeline Steps (1 to 5)
  const [currentStep, setCurrentStep] = useState(1);
  const pipelineSteps = [
    "Đã nhận album ảnh",
    "Đang tải lên hệ thống",
    "Gemini AI đang phân tích đa góc chụp",
    "Đang tổng hợp dữ liệu CSDL nông sản",
    "Hoàn thành!"
  ];

  const [errorMessage, setErrorMessage] = useState("");
  const [isAutoCropped, setIsAutoCropped] = useState(false);
  const [croppedImageUrl, setCroppedImageUrl] = useState(null);
  const [isPreviewLightboxOpen, setIsPreviewLightboxOpen] = useState(false);

  // Search History
  const [searchHistory, setSearchHistory] = useState([]);

  // Camera stream states & refs
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const zoomOptions = [1.0, 1.5, 2.0, 3.0];

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const progressTimerRef = useRef(null);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("agri_image_search_history");
      if (saved) {
        setSearchHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Error loading image search history:", e);
    }
  }, []);

  // Initialize camera when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      resetModalState();
      return;
    }

    if (activeTab === "camera" && modalState === "idle") {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isOpen, activeTab, modalState]);

  const resetModalState = () => {
    setModalState("idle");
    setDraftAlbumList([]);
    setAlbumList([]);
    setActiveAlbumIndex(0);
    setResultDisplayMode("aggregated");
    setAggregatedResult(null);
    setProgress(0);
    setCurrentStep(1);
    setErrorMessage("");
    setCameraError("");
    setIsFlashOn(false);
    setZoomLevel(1.0);
    setIsAutoCropped(false);
    setCroppedImageUrl(null);
    setIsPreviewLightboxOpen(false);
  };

  const saveToHistory = (resultItem, imageBase64Data) => {
    try {
      const newItem = {
        id: Date.now() + Math.random(),
        productName: resultItem.recognizedProduct || resultItem.search,
        category: resultItem.category,
        confidence: resultItem.confidence,
        image: imageBase64Data,
        timestamp: new Date().toLocaleString("vi-VN")
      };
      const updated = [newItem, ...searchHistory.filter((h) => h.productName !== newItem.productName)].slice(0, 10);
      setSearchHistory(updated);
      localStorage.setItem("agri_image_search_history", JSON.stringify(updated));
    } catch (e) {
      console.warn("Error saving history:", e);
    }
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("agri_image_search_history");
  };

  const startCamera = async () => {
    setCameraError("");
    stopCamera();

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (exactErr) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      }

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.warn("Video play error:", err));
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Không thể truy cập camera sau. Vui lòng cấp quyền hoặc chọn Tải ảnh lên.");
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleFlashlight = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        const nextFlash = !isFlashOn;
        await track.applyConstraints({ advanced: [{ torch: nextFlash }] });
        setIsFlashOn(nextFlash);
      } else {
        alert("Thiết bị không hỗ trợ đèn pin từ trình duyệt.");
      }
    } catch (err) {
      console.warn("Torch control error:", err);
    }
  };

  const handleCycleZoom = () => {
    const currentIndex = zoomOptions.indexOf(zoomLevel);
    const nextIndex = (currentIndex + 1) % zoomOptions.length;
    setZoomLevel(zoomOptions[nextIndex]);
  };

  // Capture photo from camera -> Process immediately as single photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 480;

    canvas.width = vWidth;
    canvas.height = vHeight;

    const ctx = canvas.getContext("2d");

    if (zoomLevel > 1.0) {
      const cropWidth = vWidth / zoomLevel;
      const cropHeight = vHeight / zoomLevel;
      const cropX = (vWidth - cropWidth) / 2;
      const cropY = (vHeight - cropHeight) / 2;
      ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, vWidth, vHeight);
    } else {
      ctx.drawImage(video, 0, 0, vWidth, vHeight);
    }

    const base64Data = canvas.toDataURL("image/jpeg", 0.9);
    const singlePhotoItem = {
      id: Date.now() + Math.random(),
      imageBase64: base64Data,
      mimeType: "image/jpeg",
      aiResult: null,
      selectedObjIdx: 0
    };

    stopCamera();
    processBatchRecognition([singlePhotoItem]);
  };

  // Upload Multi-Photos -> Add to draft album staging area (1 đến 5 ảnh)
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const availableSlots = 5 - draftAlbumList.length;
    if (availableSlots <= 0) {
      alert("Bạn đã thêm đủ tối đa 5 ảnh.");
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);
    const newDrafts = [];
    let readCount = 0;

    selectedFiles.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} vượt quá 5MB. Đã bỏ qua.`);
        readCount++;
        if (readCount === selectedFiles.length && newDrafts.length > 0) {
          setDraftAlbumList((prev) => [...prev, ...newDrafts].slice(0, 5));
        }
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result;
        if (base64Data) {
          newDrafts.push({
            id: Date.now() + Math.random(),
            imageBase64: base64Data,
            mimeType: file.type || "image/jpeg",
            aiResult: null,
            selectedObjIdx: 0
          });
        }
        readCount++;
        if (readCount === selectedFiles.length && newDrafts.length > 0) {
          setDraftAlbumList((prev) => [...prev, ...newDrafts].slice(0, 5));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    const availableSlots = 5 - draftAlbumList.length;
    if (availableSlots <= 0) return;

    const selectedFiles = files.slice(0, availableSlots);
    const newDrafts = [];
    let readCount = 0;

    selectedFiles.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result;
        if (base64Data) {
          newDrafts.push({
            id: Date.now() + Math.random(),
            imageBase64: base64Data,
            mimeType: file.type || "image/jpeg",
            aiResult: null,
            selectedObjIdx: 0
          });
        }
        readCount++;
        if (readCount === selectedFiles.length && newDrafts.length > 0) {
          setDraftAlbumList((prev) => [...prev, ...newDrafts].slice(0, 5));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveDraftItem = (idToRemove) => {
    setDraftAlbumList((prev) => prev.filter((item) => item.id !== idToRemove));
  };

  const handleStartAnalysis = () => {
    if (draftAlbumList.length === 0) {
      alert("Vui lòng chọn hoặc chụp ít nhất 1 hình ảnh nông sản.");
      return;
    }
    stopCamera();
    processBatchRecognition(draftAlbumList);
  };

  // MULTI-ANGLE & MULTI-PRODUCT AGGREGATION ALGORITHM
  const aggregateMultiAngleResults = (processedAlbum) => {
    const validItems = processedAlbum.filter(
      (a) => a.aiResult && a.aiResult.isAgriculturalProduct !== false
    );

    if (validItems.length === 0) return null;

    // Count frequency of product names across photos
    const frequencyMap = {};
    const categoryMap = {};
    let totalConf = 0;

    validItems.forEach((item) => {
      const pName = item.aiResult.recognizedProduct || item.aiResult.search || "Nông sản";
      const pCat = item.aiResult.category || "Nông sản sạch";
      const conf = item.aiResult.confidence || 90;

      frequencyMap[pName] = (frequencyMap[pName] || 0) + 1;
      categoryMap[pCat] = (categoryMap[pCat] || 0) + 1;
      totalConf += conf;
    });

    // Find most frequent product name
    let topProduct = "";
    let maxCount = 0;
    Object.keys(frequencyMap).forEach((name) => {
      if (frequencyMap[name] > maxCount) {
        maxCount = frequencyMap[name];
        topProduct = name;
      }
    });

    // Find most frequent category
    let topCategory = "";
    let maxCatCount = 0;
    Object.keys(categoryMap).forEach((cat) => {
      if (categoryMap[cat] > maxCatCount) {
        maxCatCount = categoryMap[cat];
        topCategory = cat;
      }
    });

    const avgConfidence = Math.round(totalConf / validItems.length);
    // Consensus Boost: Add bonus confidence score if multiple photos agree on the same product name
    const consensusBoost = maxCount > 1 ? Math.min(8, maxCount * 3) : 0;
    const aggregatedConfidence = Math.min(99, avgConfidence + consensusBoost);

    // Is Same Product Album (true if > 50% photos agree on the same product name)
    const isSameProductAlbum = validItems.length === 1 || maxCount >= Math.ceil(validItems.length / 2);

    return {
      name: topProduct,
      category: topCategory,
      confidence: aggregatedConfidence,
      sameProductCount: maxCount,
      totalPhotos: validItems.length,
      isSameProductAlbum: isSameProductAlbum
    };
  };

  const processBatchRecognition = async (albumItems) => {
    setModalState("analyzing");
    setProgress(10);
    setCurrentStep(1);
    setErrorMessage("");

    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 12) + 6;
        if (next >= 25 && next < 50) setCurrentStep(2);
        else if (next >= 50 && next < 75) setCurrentStep(3);
        else if (next >= 75 && next < 92) setCurrentStep(4);
        if (next >= 92) {
          clearInterval(progressTimerRef.current);
          return 92;
        }
        return next;
      });
    }, 200);

    try {
      const processedAlbum = await Promise.all(
        albumItems.map(async (item) => {
          try {
            const res = await aiService.parseImageSearch(item.imageBase64, item.mimeType);
            if (res && res.isAgriculturalProduct !== false) {
              saveToHistory(res, item.imageBase64);
            }
            return { ...item, aiResult: res };
          } catch (e) {
            console.error("Batch image parsing error:", e);
            return { ...item, aiResult: null };
          }
        })
      );

      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setProgress(100);
      setCurrentStep(5);

      const validResults = processedAlbum.filter((a) => a.aiResult && a.aiResult.isAgriculturalProduct !== false);

      setTimeout(() => {
        if (validResults.length > 0) {
          setAlbumList(processedAlbum);
          setActiveAlbumIndex(0);

          const agg = aggregateMultiAngleResults(processedAlbum);
          setAggregatedResult(agg);

          // Auto-detect mode: Default to 'aggregated' if same product album, else 'individual'
          if (agg && agg.isSameProductAlbum) {
            setResultDisplayMode("aggregated");
          } else {
            setResultDisplayMode("individual");
          }

          setModalState("success");
          if (processedAlbum[0]?.aiResult?.box2d) {
            generateAutoCrop(processedAlbum[0].imageBase64, processedAlbum[0].aiResult.box2d);
          }
        } else {
          setErrorMessage("Không nhận diện thấy nông sản trong các bức ảnh.");
          setModalState("failed");
        }
      }, 300);
    } catch (err) {
      console.error("Batch image search AI error:", err);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setProgress(100);
      setTimeout(() => {
        setErrorMessage("Không thể kết nối đến dịch vụ AI. Vui lòng thử lại!");
        setModalState("failed");
      }, 300);
    }
  };

  const generateAutoCrop = (base64Img, box2d) => {
    if (!box2d || box2d.length !== 4) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ymin = (box2d[0] / 1000) * img.height;
      const xmin = (box2d[1] / 1000) * img.width;
      const ymax = (box2d[2] / 1000) * img.height;
      const xmax = (box2d[3] / 1000) * img.width;

      const cropW = Math.max(50, xmax - xmin);
      const cropH = Math.max(50, ymax - ymin);

      canvas.width = cropW;
      canvas.height = cropH;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, xmin, ymin, cropW, cropH, 0, 0, cropW, cropH);
      setCroppedImageUrl(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.src = base64Img;
  };

  const handleSelectAlbumPhoto = (index) => {
    setActiveAlbumIndex(index);
    const selectedItem = albumList[index];
    if (selectedItem?.aiResult?.box2d) {
      generateAutoCrop(selectedItem.imageBase64, selectedItem.aiResult.box2d);
    } else {
      setCroppedImageUrl(null);
    }
  };

  const handleApplySingleSearch = (customSearchTerm) => {
    if (resultDisplayMode === "aggregated" && aggregatedResult) {
      onSearchParsed({
        search: customSearchTerm || aggregatedResult.name,
        category: aggregatedResult.category,
        recognizedProduct: aggregatedResult.name,
        confidence: aggregatedResult.confidence
      });
      onClose();
      return;
    }

    const activeItem = albumList[activeAlbumIndex];
    if (activeItem && activeItem.aiResult) {
      const activeObj = activeItem.aiResult.detectedObjects?.[activeItem.selectedObjIdx] || activeItem.aiResult;
      onSearchParsed({
        ...activeItem.aiResult,
        search: customSearchTerm || activeObj.name || activeItem.aiResult.recognizedProduct,
        category: activeObj.category || activeItem.aiResult.category,
      });
      onClose();
    }
  };

  const handleSelectHistoryItem = (item) => {
    onSearchParsed({
      search: item.productName,
      category: item.category,
      recognizedProduct: item.productName,
      confidence: item.confidence,
    });
    onClose();
  };

  // Dynamic context-aware agricultural varieties for "Có thể bạn đang tìm"
  const getContextualVarieties = (productName) => {
    const name = (productName || "").trim();
    const lower = name.toLowerCase();

    if (lower.includes("sầu riêng")) {
      return {
        label: "Gợi ý giống sầu riêng:",
        list: ["Sầu riêng Ri6", "Sầu riêng Thái", "Sầu riêng Musang King"]
      };
    }
    if (lower.includes("xoài")) {
      return {
        label: "Gợi ý giống xoài:",
        list: ["Xoài Cát Hòa Lộc", "Xoài Keo", "Xoài Tượng"]
      };
    }
    if (lower.includes("dưa leo") || lower.includes("dưa chuột")) {
      return {
        label: "Gợi ý giống dưa leo:",
        list: ["Dưa leo Baby", "Dưa leo Nếp", "Dưa leo"]
      };
    }
    if (lower.includes("cà rốt")) {
      return {
        label: "Gợi ý chủng loại cà rốt:",
        list: ["Cà rốt Đà Lạt", "Cà rốt Hữu cơ", "Cà rốt"]
      };
    }
    if (lower.includes("cà tím")) {
      return {
        label: "Gợi ý giống cà tím:",
        list: ["Cà tím Nhật", "Cà tím Quả dài", "Cà tím Tròn"]
      };
    }
    if (lower.includes("thanh long")) {
      return {
        label: "Gợi ý loại thanh long:",
        list: ["Thanh long Ruột đỏ", "Thanh long Ruột trắng", "Thanh long"]
      };
    }
    if (lower.includes("bơ")) {
      return {
        label: "Gợi ý giống bơ:",
        list: ["Bơ Sáp", "Bơ 034", "Bơ Hass"]
      };
    }
    if (lower.includes("cam") || lower.includes("bưởi")) {
      return {
        label: "Gợi ý giống cam bưởi:",
        list: ["Cam Sành", "Cam Vinh", "Bưởi Da Xanh"]
      };
    }
    if (lower.includes("táo") || lower.includes("lê")) {
      return {
        label: "Gợi ý loại táo lê:",
        list: ["Táo Mèo", "Táo Ninh Thuận", "Táo Hữu cơ"]
      };
    }
    if (lower.includes("ớt")) {
      return {
        label: "Gợi ý loại ớt:",
        list: ["Ớt Chỉ Thiên", "Ớt Chuông", "Ớt Hạt Tiêu"]
      };
    }
    if (lower.includes("dưa hấu")) {
      return {
        label: "Gợi ý giống dưa hấu:",
        list: ["Dưa hấu Không hạt", "Dưa hấu Ruột đỏ", "Dưa hấu"]
      };
    }

    // Nông sản không phân nhánh chủng loại phức tạp (Rau má, Rau ngót, Hành lá, Cần tây, Ngò rí...)
    if (lower.includes("rau má")) {
      return {
        label: "Gợi ý loại rau má:",
        list: ["Rau má tươi", "Bột rau má", "Rau má khô"]
      };
    }
    if (lower.includes("hành") || lower.includes("tỏi") || lower.includes("sả")) {
      return {
        label: "Gợi ý loại nông sản:",
        list: [`${name} tươi`, `${name} củ`, `Gia vị ${name}`]
      };
    }
    if (lower.includes("rau") || lower.includes("cải") || lower.includes("ngò")) {
      return {
        label: "Gợi ý loại nông sản:",
        list: [`${name} tươi`, `${name} sạch`, `${name} đóng gói`]
      };
    }

    return {
      label: "Gợi ý loại sản phẩm liên quan:",
      list: [`${name} tươi`, `${name} khô`, `${name} đóng gói`]
    };
  };

  if (!isOpen) return null;

  // Active Album Item Data (Individual Mode)
  const activeAlbumItem = albumList[activeAlbumIndex] || albumList[0];
  const activeAiResult = activeAlbumItem?.aiResult;
  const activeSelectedObjIdx = activeAlbumItem?.selectedObjIdx || 0;
  const activeObj = activeAiResult?.detectedObjects?.[activeSelectedObjIdx] || {
    name: activeAiResult?.recognizedProduct || "Nông sản",
    category: activeAiResult?.category || "Nông sản sạch",
    confidence: activeAiResult?.confidence || 96,
    box2d: activeAiResult?.box2d,
  };

  const activeBox2d = activeObj?.box2d || activeAiResult?.box2d || [150, 200, 850, 800];

  // Display Target Product based on mode (Aggregated vs Individual)
  const targetProductName = resultDisplayMode === "aggregated" && aggregatedResult ? aggregatedResult.name : activeObj.name;
  const targetCategory = resultDisplayMode === "aggregated" && aggregatedResult ? aggregatedResult.category : activeObj.category;
  const targetConfidence = resultDisplayMode === "aggregated" && aggregatedResult ? aggregatedResult.confidence : activeObj.confidence;
  const contextualVarieties = getContextualVarieties(targetProductName);

  return ReactDOM.createPortal(
    <div className="img-modal-overlay" onClick={onClose}>
      <div className="img-modal-card" onClick={(e) => e.stopPropagation()}>
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Modal Header */}
        <div className="img-modal-header">
          <div className="header-title-group">
            <h3 className="img-modal-title">Tìm kiếm bằng hình ảnh</h3>
            <span className="img-modal-badge">
              <Sparkles style={{ width: 14, height: 14 }} /> Gemini AI Image Search
            </span>
          </div>
          <button className="img-modal-close-btn" onClick={onClose} aria-label="Đóng">
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Modal Tab Controls */}
        {modalState === "idle" && (
          <div className="img-modal-tabs">
            <button
              className={`img-modal-tab-btn ${activeTab === "camera" ? "active" : ""}`}
              onClick={() => setActiveTab("camera")}
            >
              <Camera style={{ width: 17, height: 17 }} /> Máy ảnh
            </button>
            <button
              className={`img-modal-tab-btn ${activeTab === "upload" ? "active" : ""}`}
              onClick={() => setActiveTab("upload")}
            >
              <Upload style={{ width: 17, height: 17 }} /> Tải album ảnh ({draftAlbumList.length}/5)
            </button>
            <button
              className={`img-modal-tab-btn ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              <History style={{ width: 17, height: 17 }} /> Lịch sử ({searchHistory.length})
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="img-modal-body">
          {/* STATE 1: IDLE */}
          {modalState === "idle" && (
            <>
              {activeTab === "camera" && (
                <div className="camera-tab-view">
                  {cameraError ? (
                    <div className="camera-error-container">
                      <AlertTriangle style={{ width: 44, height: 44, color: "#e53935" }} />
                      <p>{cameraError}</p>
                      <button className="camera-retry-btn" onClick={() => startCamera()}>Thử lại camera</button>
                    </div>
                  ) : (
                    <div className="camera-preview-wrapper">
                      <video
                        ref={videoRef}
                        className="camera-video-element"
                        style={{ transform: `scale(${zoomLevel})` }}
                        playsInline
                        autoPlay
                        muted
                      />

                      <div className="camera-alignment-overlay">
                        <div className="alignment-frame">
                          <div className="corner top-left"></div>
                          <div className="corner top-right"></div>
                          <div className="corner bottom-left"></div>
                          <div className="corner bottom-right"></div>
                          <span className="alignment-text">Căn chỉnh sản phẩm vào khung hình</span>
                        </div>
                      </div>

                      <div className="camera-controls-bar">
                        <button className={`camera-action-btn ${isFlashOn ? "active" : ""}`} onClick={toggleFlashlight} title="Bật/tắt Đèn pin">
                          <Zap style={{ width: 18, height: 18 }} />
                          <span>Đèn pin</span>
                        </button>

                        <button className="camera-shutter-btn" onClick={capturePhoto} title="Chụp ảnh nhận diện ngay">
                          <div className="shutter-inner-circle">
                            <Camera style={{ width: 22, height: 22 }} />
                          </div>
                        </button>

                        <button className="camera-action-btn" onClick={handleCycleZoom} title="Thu phóng Google Lens">
                          <ZoomIn style={{ width: 18, height: 18 }} />
                          <span>Zoom {zoomLevel}x</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tips Card */}
                  <div className="img-tips-card">
                    <h4 className="tips-title flex-center-gap">
                      <Lightbulb style={{ width: 16, height: 16, color: "#d97706" }} /> Mẹo để AI nhận diện chính xác hơn:
                    </h4>
                    <ul className="tips-list">
                      <li>✓ Chụp đủ ánh sáng với camera sau của thiết bị</li>
                      <li>✓ Đặt nông sản ở chính giữa khung hình, không bị che khuất</li>
                      <li>✓ Bạn cũng có thể chọn Tải album ảnh để gửi từ 1 đến 5 ảnh các góc chụp</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === "upload" && (
                <div className="upload-tab-view">
                  <div className="upload-dragzone" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                    <div className="upload-icon-circle">
                      <Upload style={{ width: 36, height: 36, color: "#16a34a" }} />
                    </div>
                    <p className="upload-drag-text">Kéo thả 1 đến 5 bức ảnh vào đây</p>
                    <p className="upload-or-text">hoặc</p>
                    <label className="upload-file-btn">
                      <Upload style={{ width: 16, height: 16 }} /> Chọn 1 đến 5 ảnh các góc chụp
                      <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} hidden />
                    </label>
                    <span className="upload-hint-text">Hỗ trợ chọn nhiều góc chụp của 1 nông sản hoặc nhiều nông sản cùng lúc</span>
                  </div>

                  {/* STAGING ALBUM AREA IN UPLOAD TAB */}
                  {draftAlbumList.length > 0 && (
                    <div className="draft-album-staging-card">
                      <div className="staging-header-row">
                        <span className="flex-center-gap"><ImageIcon style={{ width: 15, height: 15 }} /> Bộ sưu tập Album: <strong>{draftAlbumList.length}/5 ảnh</strong></span>
                        <span className="staging-hint">Có thể chọn thêm ảnh hoặc bấm phân tích</span>
                      </div>
                      <div className="staging-thumbnails-row">
                        {draftAlbumList.map((item, idx) => (
                          <div key={item.id} className="staging-thumb-item">
                            <img src={item.imageBase64} alt={`Ảnh ${idx + 1}`} className="staging-img" />
                            <button className="staging-remove-btn" onClick={() => handleRemoveDraftItem(item.id)} title="Xóa ảnh này">
                              <X style={{ width: 10, height: 10 }} />
                            </button>
                            <span className="staging-badge">Ảnh {idx + 1}</span>
                          </div>
                        ))}
                      </div>

                      <div className="staging-actions-row">
                        <label className="btn-add-more-photos">
                          <Plus style={{ width: 15, height: 15 }} /> Chọn thêm ảnh
                          <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} hidden />
                        </label>
                        <button className="btn-trigger-analysis" onClick={handleStartAnalysis}>
                          <Sparkles style={{ width: 16, height: 16 }} /> Phân tích AI ngay ({draftAlbumList.length} ảnh)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* History Tab View */}
              {activeTab === "history" && (
                <div className="history-tab-view">
                  {searchHistory.length === 0 ? (
                    <div className="empty-history-box">
                      <History style={{ width: 44, height: 44, color: "#94a3b8" }} />
                      <p>Chưa có lịch sử tìm kiếm ảnh nào</p>
                    </div>
                  ) : (
                    <>
                      <div className="history-header-row">
                        <span>Đã lưu <strong>{searchHistory.length}</strong> lần tìm kiếm gần nhất</span>
                        <button className="btn-clear-history flex-center-gap" onClick={clearHistory}>
                          <Trash2 style={{ width: 14, height: 14 }} /> Xóa tất cả
                        </button>
                      </div>
                      <div className="history-list">
                        {searchHistory.map((item) => (
                          <div key={item.id} className="history-item-card" onClick={() => handleSelectHistoryItem(item)}>
                            {item.image && <img src={item.image} alt={item.productName} className="history-thumb" />}
                            <div className="history-info">
                              <strong className="history-title">{item.productName}</strong>
                              <span className="history-meta">{item.category} • Độ chính xác {item.confidence}%</span>
                              <span className="history-time">{item.timestamp}</span>
                            </div>
                            <button className="history-use-btn">Tìm lại ➔</button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* STATE 2: ANALYZING / PIPELINE */}
          {modalState === "analyzing" && (
            <div className="analyzing-state-view">
              <div className="preview-image-card">
                {albumList[0]?.imageBase64 && <img src={albumList[0].imageBase64} alt="Ảnh nông sản" className="preview-img" />}
                <button className="preview-delete-btn flex-center-gap" onClick={resetModalState} title="Xóa ảnh">
                  <X style={{ width: 14, height: 14 }} /> Xóa ảnh
                </button>
              </div>

              {/* 5-Step Pipeline Indicator */}
              <div className="pipeline-steps-box">
                <div className="pipeline-header">
                  <span className="pipeline-step-text">
                    Bước {currentStep}/5: {pipelineSteps[currentStep - 1]}
                    {currentStep < 5 && <span className="thinking-badge"> (Thinking... 🧠)</span>} ({albumList.length} bức ảnh)
                  </span>
                  <span className="progress-percent-text">{progress}%</span>
                </div>

                <div className="progress-track">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>

                <ul className="pipeline-bullet-list">
                  {pipelineSteps.map((stepText, idx) => (
                    <li key={idx} className={idx + 1 <= currentStep ? "done" : "pending"}>
                      <span className="bullet-icon">{idx + 1 <= currentStep ? <Check style={{ width: 14, height: 14 }} /> : "○"}</span>
                      <span>
                        {stepText}
                        {idx + 1 === currentStep && currentStep < 5 && (
                          <span className="thinking-text-inline"> - Thinking... 🧠</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* STATE 3: SUCCESS RESULT - Multi-Angle & Multi-Product Vision */}
          {modalState === "success" && activeAlbumItem && activeAiResult && (
            <div className="success-state-view">
              {/* ALBUM THUMBNAIL SWITCHER BAR (Cho phép chọn qua lại giữa các ảnh khi album có từ 2 ảnh trở lên) */}
              {albumList.length > 1 && (
                <div className="album-thumbnail-bar">
                  <span className="album-bar-title flex-center-gap">
                    <ImageIcon style={{ width: 14, height: 14 }} /> Album {albumList.length} ảnh đã phân tích:
                  </span>
                  <div className="album-thumbnails-row">
                    {albumList.map((item, idx) => (
                      <button
                        key={item.id}
                        className={`album-thumb-btn ${activeAlbumIndex === idx ? "active" : ""}`}
                        onClick={() => handleSelectAlbumPhoto(idx)}
                      >
                        <img src={item.imageBase64} alt={`Ảnh ${idx + 1}`} className="thumb-img" />
                        <span className="thumb-badge">
                          {item.aiResult?.recognizedProduct || `Ảnh ${idx + 1}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Photo ONLY (Clean view without text overlay) */}
              <div
                className="success-image-card"
                onClick={() => setIsPreviewLightboxOpen(true)}
                title="Nhấp để phóng to toàn màn hình"
              >
                <img
                  src={isAutoCropped && croppedImageUrl ? croppedImageUrl : activeAlbumItem.imageBase64}
                  alt="Ảnh nông sản"
                  className="success-preview-img"
                />

                {croppedImageUrl && (
                  <button
                    className={`btn-toggle-crop ${isAutoCropped ? "active" : ""} flex-center-gap`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAutoCropped(!isAutoCropped);
                    }}
                  >
                    <Crop style={{ width: 14, height: 14 }} />
                    <span>{isAutoCropped ? "Xem ảnh gốc" : "Xem ảnh cắt (Auto Crop)"}</span>
                  </button>
                )}
              </div>

              {/* Dynamic AI Recognition Card */}
              <div className="ai-result-display-card">
                <div className="card-top-section">
                  <span className="card-badge-title">
                    {resultDisplayMode === "aggregated" && albumList.length > 1
                      ? `📸 KẾT QUẢ TỔNG HỢP TỪ ${albumList.length} GÓC CHỤP AI`
                      : "AI ĐÃ NHẬN DIỆN"}
                  </span>

                  <div className="product-title-row">
                    <span className="product-label-prefix">Tên nông sản:</span>
                    <h3 className="product-name-large">{targetProductName}</h3>
                  </div>

                  <div className="meta-info-grid">
                    <div className="meta-info-item">
                      <span className="meta-label">Danh mục</span>
                      <strong className="meta-value">{targetCategory}</strong>
                    </div>
                    <div className="meta-info-item">
                      <span className="meta-label">Độ tin cậy</span>
                      <strong className="meta-value score">{targetConfidence}%</strong>
                    </div>
                  </div>

                  {/* Multi-Angle Consensus Hint Badge */}
                  {resultDisplayMode === "aggregated" && albumList.length > 1 && (
                    <div className="multi-angle-consensus-badge">
                      <CheckCircle2 style={{ width: 15, height: 15, color: "#16a34a" }} />
                      <span>Xác minh đồng thuận qua <strong>{aggregatedResult?.sameProductCount || albumList.length}/{albumList.length} góc chụp</strong></span>
                    </div>
                  )}
                </div>

                <hr className="card-divider-line" />

                {/* Dynamic Context-Aware Varieties or Related Produce Forms */}
                <div className="card-bottom-section">
                  <span className="section-subtitle">{contextualVarieties.label}</span>

                  <div className="suggestions-list-row">
                    {contextualVarieties.list.map((varietyName, idx) => (
                      <button
                        key={idx}
                        className="suggestion-check-btn"
                        onClick={() => handleApplySingleSearch(varietyName)}
                      >
                        <Check style={{ width: 16, height: 16, color: "#16a34a" }} /> {varietyName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Balanced Equal Width Action Buttons (50% - 50%) */}
              <div className="success-actions-row balanced-buttons">
                <button className="btn-search-now flex-center-gap" onClick={() => handleApplySingleSearch(targetProductName)}>
                  <Search style={{ width: 18, height: 18 }} /> Tìm kiếm sản phẩm "{targetProductName}" ngay
                </button>
                <button className="btn-reselect flex-center-gap" onClick={resetModalState}>
                  <RotateCcw style={{ width: 16, height: 16 }} /> Thử ảnh khác
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: FAILURE */}
          {modalState === "failed" && (
            <div className="failed-state-view">
              <div className="failed-icon-wrapper">
                <AlertTriangle style={{ width: 36, height: 36, color: "#ef5350" }} />
              </div>

              <h4 className="failed-title">Không tìm thấy sản phẩm phù hợp</h4>
              <p className="failed-subtext">{errorMessage || "Ảnh bị mờ, không đủ ánh sáng hoặc không chứa sản phẩm nông sản."}</p>

              <div className="fallback-options-card">
                <h5>Bạn có muốn:</h5>
                <div className="fallback-buttons-grid">
                  <button className="fallback-btn flex-center-gap" onClick={() => { onClose(); }}>
                    <Search style={{ width: 15, height: 15 }} /> Tìm bằng từ khóa thủ công
                  </button>
                  <button className="fallback-btn flex-center-gap" onClick={() => { resetModalState(); setActiveTab("camera"); }}>
                    <Camera style={{ width: 15, height: 15 }} /> Chụp ảnh khác
                  </button>
                  <button className="fallback-btn flex-center-gap" onClick={() => { resetModalState(); setActiveTab("upload"); }}>
                    <Upload style={{ width: 15, height: 15 }} /> Tải album ảnh khác
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="img-modal-footer">
          <ShieldCheck style={{ width: 15, height: 15, color: "#16a34a" }} />
          Hình ảnh được mã hóa bảo mật và chỉ dùng để tìm kiếm sản phẩm trên AgriMarket.
        </div>
      </div>

      {/* Lightbox Fullscreen Modal */}
      {isPreviewLightboxOpen && activeAlbumItem && (
        <div className="lightbox-overlay" onClick={() => setIsPreviewLightboxOpen(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close-btn" onClick={() => setIsPreviewLightboxOpen(false)} aria-label="Đóng Phóng to">
              <X style={{ width: 22, height: 22 }} />
            </button>
            <img
              src={isAutoCropped && croppedImageUrl ? croppedImageUrl : activeAlbumItem.imageBase64}
              alt="Ảnh phóng to đầy đủ"
              className="lightbox-full-img"
            />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default ImageSearchModal;
