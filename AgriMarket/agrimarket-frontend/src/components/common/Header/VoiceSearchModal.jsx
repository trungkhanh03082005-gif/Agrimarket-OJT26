import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import aiService from "../../../services/aiService";
import "./VoiceSearchModal.css";

const VoiceSearchModal = ({ isOpen, onClose, onSearchParsed }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript("");
      setIsAnalyzing(false);
      setErrorMessage("");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("Trình duyệt của bạn không hỗ trợ tìm kiếm bằng giọng nói. Vui lòng sử dụng Chrome hoặc Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMessage("");
    };

    recognition.onresult = (event) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
      if (event.error === "not-allowed") {
        setErrorMessage("Vui lòng cấp quyền truy cập Micro cho trình duyệt.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    startListening();

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [isOpen]);

  const startListening = () => {
    setTranscript("");
    setErrorMessage("");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  };

  const handleProcessVoice = async (textToProcess) => {
    const text = textToProcess || transcript || "Tìm trái cà chua";
    if (!text || !text.trim()) return;

    stopListening();
    setIsAnalyzing(true);
    setErrorMessage("");

    try {
      const result = await aiService.parseVoiceSearch(text);
      setIsAnalyzing(false);
      onSearchParsed(result);
      onClose();
    } catch (err) {
      console.error("Lỗi Gemini AI Voice Search:", err);
      setIsAnalyzing(false);
      onSearchParsed({ search: text.trim(), aiSummary: `Tìm kiếm: ${text.trim()}` });
      onClose();
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="voice-modal-overlay" onClick={onClose}>
      <div className="voice-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Icon Button */}
        <button className="voice-modal-close-icon" onClick={onClose} aria-label="Đóng">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Top Badge */}
        <div className="voice-modal-badge">
          <span className="sparkle-emoji">✨</span> Gemini AI Voice Search
        </div>

        {/* Title & Subtitle */}
        <h3 className="voice-modal-title">Tìm kiếm bằng giọng nói</h3>
        <p className="voice-modal-subtitle">
          Nói nhu cầu nông sản của bạn (VD: <i>"Tìm trái cà chua"</i>)
        </p>

        {/* Red Mic Button */}
        <div className="voice-mic-wrapper">
          <button
            className={`voice-mic-red-btn ${isListening ? "pulse-active" : ""}`}
            onClick={isListening ? stopListening : startListening}
            title={isListening ? "Đang thu âm... Bấm để dừng" : "Bấm để nói lại"}
          >
            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
            </svg>
          </button>

          {/* Equalizer Green Bars */}
          <div className={`voice-equalizer-bars ${isListening ? "active" : ""}`}>
            <span className="eq-bar"></span>
            <span className="eq-bar"></span>
            <span className="eq-bar"></span>
            <span className="eq-bar"></span>
            <span className="eq-bar"></span>
          </div>
        </div>

        {/* Error message or Editable Transcript Input Box */}
        {errorMessage ? (
          <div className="voice-modal-error-msg">{errorMessage}</div>
        ) : (
          <div className="voice-transcript-display-box">
            <input
              type="text"
              className="transcript-input-field"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder='Ví dụ: "Tìm trái dưa hấu..."'
              title="Nhấp để chỉnh sửa nội dung thu âm"
            />
          </div>
        )}

        {/* Primary Action Button */}
        <button
          className="voice-modal-submit-btn"
          onClick={() => handleProcessVoice()}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <svg className="spin-icon" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.071-7.071l-2.828 2.828M7.757 16.243l-2.828 2.828m0-14.142l2.828 2.828m8.486 8.486l2.828 2.828" />
              </svg>
              Gemini AI đang suy nghĩ (Thinking... 🧠)
            </>
          ) : (
            <>✨ Phân tích & Tìm kiếm với AI</>
          )}
        </button>

        {/* Secondary Cancel Link */}
        <button className="voice-modal-cancel-btn" onClick={onClose}>
          Hủy bỏ
        </button>
      </div>
    </div>,
    document.body
  );
};

export default VoiceSearchModal;
