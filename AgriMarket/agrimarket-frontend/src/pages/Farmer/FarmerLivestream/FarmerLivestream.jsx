import { useState, useEffect, useRef } from "react";
import { 
  Calendar, 
  Radio, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Trash2, 
  Ban, 
  ClipboardList, 
  Package, 
  Ticket, 
  Lightbulb, 
  Pin, 
  MessageSquare, 
  Sparkles, 
  AlertTriangle, 
  Pencil, 
  Users, 
  Heart 
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import * as productService from "../../../services/productService";
import AgoraRTC from "agora-rtc-sdk-ng";
import apiClient from "../../../services/apiClient";
import "./FarmerLivestream.css";
const getMinDateTimeLocal = () => {
  const now = new Date(Date.now() + 5 * 60 * 1000);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${date}T${hours}:${minutes}`;
};

const PopoverDateTimePicker = ({ value, onChange, minDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const formatDisplay = (val) => {
    if (!val) return "";
    const parts = val.split("T");
    if (parts.length !== 2) return val;
    const [y, m, d] = parts[0].split("-");
    const [h, min] = parts[1].split(":");
    return `${h}:${min} - ${d}/${m}/${y}`;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initialDate = value ? new Date(value.split("T")[0]) : new Date();
  const initialTime = value ? value.split("T")[1] : "12:00";
  const [selectedTime, setSelectedTime] = useState(initialTime);

  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());

  useEffect(() => {
    if (value) {
      const datePart = value.split("T")[0];
      const d = new Date(datePart);
      if (!isNaN(d.getTime())) {
        setViewMonth(d.getMonth());
        setViewYear(d.getFullYear());
      }
      setSelectedTime(value.split("T")[1] || "12:00");
    }
  }, [value]);

  const months = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear);

  const calendarCells = [];
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push({ dayNum: null, dateObj: null, selectable: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(viewYear, viewMonth, d);

    let selectable = true;
    if (minDate) {
      const minCopy = new Date(minDate);
      minCopy.setHours(0, 0, 0, 0);
      const dateCopy = new Date(dateObj);
      dateCopy.setHours(0, 0, 0, 0);
      if (dateCopy < minCopy) selectable = false;
    }

    calendarCells.push({ dayNum: d, dateObj, selectable });
  }

  const handleSelectDay = (cell, e) => {
    e.stopPropagation();
    if (!cell.selectable) return;
    const y = cell.dateObj.getFullYear();
    const m = String(cell.dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(cell.dateObj.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}T${selectedTime}`);
  };

  const handleTimeChange = (e) => {
    setSelectedTime(e.target.value);
    if (value) {
      const datePart = value.split("T")[0];
      onChange(`${datePart}T${e.target.value}`);
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}T${e.target.value}`);
    }
  };

  const isSelected = (cell) => {
    if (!cell.dateObj || !value) return false;
    const valDate = new Date(value.split("T")[0]);
    return cell.dateObj.getFullYear() === valDate.getFullYear() &&
      cell.dateObj.getMonth() === valDate.getMonth() &&
      cell.dateObj.getDate() === valDate.getDate();
  };

  return (
    <div className="popover-datepicker-wrapper" ref={wrapperRef} style={{ position: "relative" }}>
      <div
        className="popover-datepicker-input-container"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          backgroundColor: "#fff",
          cursor: "pointer",
          fontSize: "14px"
        }}
      >
        <span style={{ color: value ? "#1e293b" : "#94a3b8" }}>
          {formatDisplay(value) || "Chọn thời gian"}
        </span>
        <Calendar size={18} style={{ color: "#64748b" }} />
      </div>

      {isOpen && (
        <div
          className="custom-inline-calendar popover-calendar-dropdown"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 999,
            marginTop: "4px",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)"
          }}
        >
          <div className="calendar-header">
            <button type="button" onClick={handlePrevMonth} className="calendar-nav-btn">&lt;</button>
            <span className="calendar-title">{months[viewMonth]} {viewYear}</span>
            <button type="button" onClick={handleNextMonth} className="calendar-nav-btn">&gt;</button>
          </div>
          <div className="calendar-weekdays">
            <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
          </div>
          <div className="calendar-grid">
            {calendarCells.map((cell, idx) => {
              if (cell.dayNum === null) {
                return <div key={`empty-${idx}`} className="calendar-cell empty"></div>;
              }

              let cellClass = "calendar-cell day";
              if (!cell.selectable) {
                cellClass += " disabled";
              } else if (isSelected(cell)) {
                cellClass += " selected";
              }

              return (
                <div
                  key={`day-${cell.dayNum}`}
                  className={cellClass}
                  onClick={(e) => handleSelectDay(cell, e)}
                >
                  {cell.dayNum}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>Giờ chiếu:</span>
            <input
              type="time"
              value={selectedTime}
              onChange={handleTimeChange}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                outline: "none"
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const FarmerScheduledCountdown = ({ title, description, scheduledTime, onStartLive, connecting }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const diff = new Date(scheduledTime) - new Date();
      if (diff <= 0) {
        setTimeLeft("00:00:00");
        onStartLive();
      } else {
        const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, "0");
        const minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0");
        const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, "0");
        setTimeLeft(`${hours}:${minutes}:${seconds}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [scheduledTime, onStartLive]);

  return (
    <div className="farmer-scheduled-countdown-container" style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "70vh",
      padding: "24px",
      textAlign: "center",
      background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
      borderRadius: "16px",
      border: "1px solid #bbf7d0",
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
      margin: "20px auto",
      maxWidth: "800px"
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "50%",
        width: "80px",
        height: "80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "2.5rem",
        boxShadow: "0 8px 16px rgba(16, 185, 129, 0.2)",
        marginBottom: "24px"
      }}>
        <Calendar size={40} style={{ color: "#10b981" }} />
      </div>

      <h2 style={{
        fontSize: "1.75rem",
        fontWeight: "800",
        color: "#065f46",
        margin: "0 0 8px 0"
      }}>Phiên Live Đã Được Lên Lịch</h2>

      <p style={{
        fontSize: "1rem",
        color: "#047857",
        maxWidth: "500px",
        margin: "0 0 24px 0",
        lineHeight: "1.5"
      }}>
        Phiên phát trực tiếp <strong>{title}</strong> của bạn đã được lên lịch. Hệ thống sẽ tự động bắt đầu live khi thời gian đếm ngược kết thúc.
      </p>

      {description && (
        <div style={{
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "12px 16px",
          color: "#475569",
          fontSize: "0.9rem",
          maxWidth: "400px",
          marginBottom: "24px",
          textAlign: "left"
        }}>
          <strong>Mô tả:</strong> {description}
        </div>
      )}

      {/* Countdown Timer Display */}
      <div style={{
        backgroundColor: "#065f46",
        borderRadius: "12px",
        padding: "20px 40px",
        color: "white",
        fontFamily: "monospace",
        fontSize: "3rem",
        fontWeight: "700",
        letterSpacing: "2px",
        boxShadow: "0 4px 12px rgba(6, 95, 70, 0.3)",
        marginBottom: "32px",
        display: "inline-block"
      }}>
        {timeLeft}
      </div>

      <div style={{
        fontSize: "0.9rem",
        color: "#065f46",
        marginBottom: "24px"
      }}>
        Thời gian hẹn: <strong>{new Date(scheduledTime).toLocaleString("vi-VN")}</strong>
      </div>

      {/* Manual Start Early Button */}
      <button
        onClick={onStartLive}
        disabled={connecting}
        style={{
          backgroundColor: connecting ? "#94a3b8" : "#10b981",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "12px 28px",
          fontWeight: "700",
          fontSize: "1rem",
          cursor: connecting ? "not-allowed" : "pointer",
          boxShadow: connecting ? "none" : "0 4px 14px rgba(16, 185, 129, 0.4)",
          transition: "all 0.2s",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px"
        }}
        onMouseOver={(e) => { if (!connecting) e.currentTarget.style.backgroundColor = "#059669"; }}
        onMouseOut={(e) => { if (!connecting) e.currentTarget.style.backgroundColor = "#10b981"; }}
      >
        <Radio size={18} /> {connecting ? "Đang kết nối với server..." : "Phát Sóng Ngay Lập Tức"}
      </button>
    </div>
  );
};

export const FarmerLivestream = () => {
  const { farmerProfile, currentUser } = useOutletContext();

  // Step state: 'setup' (preparation), 'live' (broadcasting), 'ended' (showing report)
  const [streamState, setStreamState] = useState("setup");
  const [connecting, setConnecting] = useState(false);

  // Form setup states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [voucherPercent, setVoucherPercent] = useState(10); // 10%, 15%, 20%, 0 for none
  const [farmerProducts, setFarmerProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [productDiscounts, setProductDiscounts] = useState({}); // { productId: discount% }

  // Hardware states
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [cameraStream, setCameraStream] = useState(null);
  const [audioLevel, setAudioLevel] = useState(40);
  const videoRef = useRef(null);

  // Active Livestream Stats (Simulated)
  const [liveSessionId, setLiveSessionId] = useState(null);
  const [viewersCount, setViewersCount] = useState(0);
  const [heartsCount, setHeartsCount] = useState(0);
  const [floatingHearts, setFloatingHearts] = useState([]); // Array of keys/positions for render
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [streamDuration, setStreamDuration] = useState(0); // in seconds
  const [pinnedProductId, setPinnedProductId] = useState(null);
  const [isEditProductsOpen, setIsEditProductsOpen] = useState(false);
  const [tempVoucherPercent, setTempVoucherPercent] = useState(10);
  const [tempSelectedProductIds, setTempSelectedProductIds] = useState([]);
  const [tempProductDiscounts, setTempProductDiscounts] = useState({});
  const [scheduledTime, setScheduledTime] = useState("");
  const [pinnedChatMessage, setPinnedChatMessage] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState({}); // { username: expiryTimestamp }
  const [activeBlockMenuMsgId, setActiveBlockMenuMsgId] = useState(null);
  const [isConfirmEndOpen, setIsConfirmEndOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);
  const [adminBanReason, setAdminBanReason] = useState("");
  const blockedUsersRef = useRef({});
  blockedUsersRef.current = blockedUsers;

  // Final Report Stats
  const [reportStats, setReportStats] = useState({
    duration: "00:00",
    peakViewers: 0,
    hearts: 0,
    orders: 0,
    newFollowers: 0,
  });

  // Timers and references
  const streamTimerRef = useRef(null);
  const viewersTimerRef = useRef(null);
  const chatsTimerRef = useRef(null);
  const chatListRef = useRef(null);
  const rtcRef = useRef({ client: null, localAudioTrack: null, localVideoTrack: null });
  const isEndingRef = useRef(false);

  // Sync hardware mute states during live broadcast
  useEffect(() => {
    if (streamState === "live") {
      if (rtcRef.current.localVideoTrack) {
        rtcRef.current.localVideoTrack.setEnabled(isCamOn).catch(e => console.error(e));
      }
    }
  }, [isCamOn, streamState]);

  useEffect(() => {
    if (streamState === "live") {
      if (isCamOn && rtcRef.current.localVideoTrack) {
        const timer = setTimeout(() => {
          if (videoRef.current) {
            rtcRef.current.localVideoTrack.play(videoRef.current);
          }
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [streamState, isCamOn]);

  useEffect(() => {
    if (streamState === "live") {
      if (rtcRef.current.localAudioTrack) {
        rtcRef.current.localAudioTrack.setEnabled(isMicOn).catch(e => console.error(e));
      }
    }
  }, [isMicOn, streamState]);

  // AI Moderation: Capture local stream frame every 10 seconds and post to Python worker
  useEffect(() => {
    if (streamState !== "live" || !liveSessionId) return;

    const captureInterval = setInterval(() => {
      let videoEl = null;
      if (videoRef.current) {
        if (videoRef.current.tagName === "VIDEO") {
          videoEl = videoRef.current;
        } else {
          videoEl = videoRef.current.querySelector("video");
        }
      }
      if (!videoEl) return;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = videoEl.videoWidth || 640;
        canvas.height = videoEl.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

        const frameData = canvas.toDataURL("image/jpeg", 0.7);
        const aiModerationUrl = import.meta.env.VITE_AI_MODERATION_URL || "http://localhost:8000";
        fetch(`${aiModerationUrl}/moderation/frame`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify({
            livestreamId: liveSessionId,
            frame: frameData
          })
        }).catch(err => console.error("Lỗi gửi ảnh kiểm duyệt AI:", err));
      } catch (err) {
        console.error("Lỗi chụp ảnh kiểm duyệt:", err);
      }
    }, 10000);

    return () => clearInterval(captureInterval);
  }, [streamState, liveSessionId]);

  // AI Moderation: Speech-to-Text via Web Speech API (free Vietnamese voice scan)
  useEffect(() => {
    if (streamState !== "live" || !liveSessionId) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Trình duyệt không hỗ trợ Web Speech API.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "vi-VN";

    recognition.onresult = (event) => {
      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript;
      if (transcript && transcript.trim().length > 0) {
        const aiModerationUrl = import.meta.env.VITE_AI_MODERATION_URL || "http://localhost:8000";
        fetch(`${aiModerationUrl}/moderation/text`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify({
            livestreamId: liveSessionId,
            text: transcript.trim()
          })
        }).catch(err => console.error("Lỗi gửi giọng nói kiểm duyệt AI:", err));
      }
    };

    recognition.onerror = (event) => {
      console.error("Lỗi nhận diện giọng nói:", event.error);
    };

    let restartTimeout = null;
    recognition.onend = () => {
      if (streamState === "live") {
        restartTimeout = setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.error("Lỗi restart Speech Recognition:", e);
          }
        }, 5000);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Lỗi bắt đầu Speech Recognition:", e);
    }

    return () => {
      if (restartTimeout) clearTimeout(restartTimeout);
      try {
        recognition.stop();
      } catch (e) {
        console.error(e);
      }
    };
  }, [streamState, liveSessionId]);

  // Recovery active session on mount
  useEffect(() => {
    if (window.agoraActiveHostSession && window.agoraActiveHostSession.streamState === "live") {
      const session = window.agoraActiveHostSession;

      rtcRef.current.client = session.client;
      rtcRef.current.localAudioTrack = session.localAudioTrack;
      rtcRef.current.localVideoTrack = session.localVideoTrack;

      setLiveSessionId(session.liveSessionId);
      setTitle(session.title);
      setDescription(session.description);
      setSelectedProductIds(session.selectedProductIds);
      setProductDiscounts(session.productDiscounts);
      setVoucherPercent(session.voucherPercent);
      setChatMessages(session.chatMessages);
      setPinnedProductId(session.pinnedProductId);
      setStreamDuration(session.streamDuration);
      setHeartsCount(session.heartsCount);
      setViewersCount(session.viewersCount);
      setIsCamOn(session.isCamOn);
      setIsMicOn(session.isMicOn);
      setStreamState("live");

      // Tell layout to hide PiP
      window.dispatchEvent(new Event("agora_pip_hide"));
    }
  }, []);

  // Sync state changes to global session object
  useEffect(() => {
    if (window.agoraActiveHostSession) {
      window.agoraActiveHostSession.isCamOn = isCamOn;
      window.agoraActiveHostSession.isMicOn = isMicOn;
    }
  }, [isCamOn, isMicOn]);

  useEffect(() => {
    if (window.agoraActiveHostSession) {
      window.agoraActiveHostSession.chatMessages = chatMessages;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (window.agoraActiveHostSession) {
      window.agoraActiveHostSession.streamDuration = streamDuration;
      window.agoraActiveHostSession.heartsCount = heartsCount;
      window.agoraActiveHostSession.viewersCount = viewersCount;
      window.agoraActiveHostSession.pinnedProductId = pinnedProductId;
    }
  }, [streamDuration, heartsCount, viewersCount, pinnedProductId]);

  // Cleanup/PiP delegation Agora on unmount
  useEffect(() => {
    return () => {
      const isLive = window.agoraActiveHostSession && window.agoraActiveHostSession.streamState === "live";

      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      if (isLive) {
        // We are navigating away but stream is active! Show PiP
        window.dispatchEvent(new CustomEvent("agora_pip_show"));
      } else {
        // Stream has ended or is not live, clean up everything
        if (rtcRef.current.localAudioTrack) {
          rtcRef.current.localAudioTrack.close();
        }
        if (rtcRef.current.localVideoTrack) {
          rtcRef.current.localVideoTrack.close();
        }
        if (rtcRef.current.client) {
          rtcRef.current.client.leave().catch(e => console.error(e));
        }
        window.agoraActiveHostSession = null;
      }
    };
  }, [cameraStream]);

  // Fetch Farmer Products on mount (Server-side paged)
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const res = await productService.getFarmerProductsPaged({ page: 0, size: 50, status: "approved" });
        const list = res.content || res || [];
        setFarmerProducts(list);
      } catch (err) {
        console.error("Lỗi lấy danh sách sản phẩm nông dân:", err);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // WebRTC camera setup during preparation
  useEffect(() => {
    if (streamState === "setup") {
      if (isCamOn) {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: isMicOn })
          .then((stream) => {
            setCameraStream(stream);
          })
          .catch((err) => {
            console.warn("Không thể truy cập camera thực tế. Chuyển sang mô phỏng.", err);
            setCameraStream(null);
          });
      } else {
        if (cameraStream) {
          cameraStream.getTracks().forEach((track) => track.stop());
          setCameraStream(null);
        }
      }
    }
  }, [isCamOn, streamState]);

  // Bind preview stream to video element when it becomes available
  useEffect(() => {
    if (streamState === "setup" && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, streamState]);

  // Audio level simulator
  useEffect(() => {
    let interval;
    if (isMicOn && (streamState === "setup" || streamState === "live")) {
      interval = setInterval(() => {
        setAudioLevel(Math.floor(Math.random() * 60) + 15);
      }, 300);
    } else {
      setAudioLevel(0);
    }
    return () => clearInterval(interval);
  }, [isMicOn, streamState]);

  // Autoscroll chat box locally without shifting the browser window scroll position
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Sync livestream data (duration, comments, viewers, likes, ban checks)
  useEffect(() => {
    if (streamState === "live") {
      const isRecovering = window.agoraActiveHostSession && window.agoraActiveHostSession.streamDuration > 0;
      if (!isRecovering) {
        setStreamDuration(0);
      }
      streamTimerRef.current = setInterval(() => {
        setStreamDuration((prev) => prev + 1);
      }, 1000);

      const syncSessionData = async () => {
        const handleExternalEnd = async (reason) => {
          if (rtcRef.current.localAudioTrack) {
            try {
              rtcRef.current.localAudioTrack.stop();
              rtcRef.current.localAudioTrack.close();
            } catch (e) {
              console.error(e);
            }
          }
          if (rtcRef.current.localVideoTrack) {
            try {
              rtcRef.current.localVideoTrack.stop();
              rtcRef.current.localVideoTrack.close();
            } catch (e) {
              console.error(e);
            }
          }
          if (rtcRef.current.client) {
            try {
              await rtcRef.current.client.leave();
            } catch (e) {
              console.error("Error leaving Agora client:", e);
            }
          }
          clearInterval(streamTimerRef.current);
          clearInterval(chatsTimerRef.current);

          // Clear global session tracking
          window.agoraActiveHostSession = null;
          localStorage.removeItem("active_farmer_livestream_session");
          window.dispatchEvent(new Event("agora_pip_hide"));

          setStreamState("banned");
          setAdminBanReason(reason || "Phiên livestream của bạn đã bị chấm dứt hoặc dừng bởi quản trị viên do vi phạm Tiêu chuẩn cộng đồng.");
        };

        try {
          if (!liveSessionId) return;
          const detailRes = await apiClient.get(`/api/livestreams/${liveSessionId}`);

          if (detailRes.data.status !== "active") {
            if (!isEndingRef.current) {
              await handleExternalEnd(detailRes.data.banReason);
            }
            return;
          }

          setViewersCount(detailRes.data.viewersCount);
          setHeartsCount(detailRes.data.heartsCount);

          const commentsRes = await apiClient.get(`/api/livestreams/${liveSessionId}/comments`);
          setChatMessages((prev) => {
            const systemMsgs = prev.filter(m => m.type === "system");
            const dbMsgs = commentsRes.data.map(c => ({
              id: `comment-${c.id}`,
              type: c.isHost ? "host" : "buyer",
              user: c.isHost ? `${c.user} (Bạn)` : c.user,
              text: c.text,
              senderId: c.senderId
            }));
            return [...systemMsgs, ...dbMsgs];
          });
        } catch (err) {
          console.error("Lỗi đồng bộ dữ liệu live:", err);
          if (err.response && err.response.status === 404) {
            if (!isEndingRef.current) {
              await handleExternalEnd();
            }
          }
        }
      };

      chatsTimerRef.current = setInterval(syncSessionData, 2000);
    }

    return () => {
      clearInterval(streamTimerRef.current);
      clearInterval(chatsTimerRef.current);
    };
  }, [streamState, liveSessionId]);

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // Sync temporary states when the modal is opened
  useEffect(() => {
    if (isEditProductsOpen) {
      setTempSelectedProductIds([...selectedProductIds]);
      setTempProductDiscounts({ ...productDiscounts });
    }
  }, [isEditProductsOpen, selectedProductIds, productDiscounts]);

  // Handle temporary product selection / checkbox changes in the edit modal
  const handleTempProductCheckboxChange = (productId) => {
    setTempSelectedProductIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      } else {
        const defaultDiscount = voucherPercent > 0 ? voucherPercent : 10;
        setTempProductDiscounts((discs) => ({
          ...discs,
          [productId]: discs[productId] !== undefined ? discs[productId] : defaultDiscount
        }));
        return [...prev, productId];
      }
    });
  };

  // Handle temporary product discount changes in the edit modal
  const handleTempDiscountChange = (productId, value) => {
    if (value === "") {
      setTempProductDiscounts((prev) => ({
        ...prev,
        [productId]: ""
      }));
      return;
    }
    const percent = Math.min(Math.max(parseInt(value) || 0, 0), 90);
    setTempProductDiscounts((prev) => ({
      ...prev,
      [productId]: percent
    }));
  };

  // Handle product selection / checkbox changes
  const handleProductCheckboxChange = (productId) => {
    setSelectedProductIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      } else {
        // Set a default discount matching the active voucher percent (default to 10 if none)
        const defaultDiscount = voucherPercent > 0 ? voucherPercent : 10;
        setProductDiscounts(discs => ({
          ...discs,
          [productId]: discs[productId] !== undefined ? discs[productId] : defaultDiscount
        }));
        return [...prev, productId];
      }
    });
  };

  const handleDiscountChange = (productId, value) => {
    if (value === "") {
      setProductDiscounts((prev) => ({
        ...prev,
        [productId]: ""
      }));
      return;
    }
    const percent = Math.min(Math.max(parseInt(value) || 0, 0), 90);
    setProductDiscounts((prev) => ({
      ...prev,
      [productId]: percent
    }));
  };

  const handleVoucherPercentChange = (percent) => {
    setVoucherPercent(percent);
    if (percent > 0) {
      setProductDiscounts((prev) => {
        const next = { ...prev };
        selectedProductIds.forEach((id) => {
          next[id] = percent;
        });
        return next;
      });
    }
  };

  const handleUpdateLiveVoucher = (percent) => {
    // Calculate new discounts synchronously
    const newDiscounts = { ...productDiscounts };
    if (percent > 0) {
      selectedProductIds.forEach((id) => {
        newDiscounts[id] = percent;
      });
    } else {
      selectedProductIds.forEach((id) => {
        newDiscounts[id] = 0;
      });
    }

    // Set states synchronously
    setVoucherPercent(percent);
    setProductDiscounts(newDiscounts);
    setTempVoucherPercent(percent);

    syncDiscountsToBackend(percent, newDiscounts);

    try {
      const activeSession = JSON.parse(localStorage.getItem("active_farmer_livestream_session"));
      if (activeSession) {
        const updatedProducts = farmerProducts
          .filter((p) => selectedProductIds.includes(p.id))
          .map((p) => {
            const discount = percent !== 0 ? (parseInt(newDiscounts[p.id]) || 0) : 0;
            const livePrice = discount > 0 ? Math.round(p.price * (1 - discount / 100)) : p.price;
            return {
              id: p.id,
              name: p.name,
              originalPrice: p.price,
              price: livePrice,
              unit: p.unit || "kg",
              imageUrl: p.imageUrl,
              discountPercent: discount
            };
          });

        const updatedSession = {
          ...activeSession,
          voucherPercent: percent,
          voucherTitle: percent > 0 ? `Giảm ${percent}% Toàn Trang Trại` : null,
          tags: ["Trực tiếp tại vườn", "Nông sản sạch", percent > 0 ? `Voucher ${percent}%` : "Săn Deal"],
          products: updatedProducts
        };

        localStorage.setItem("active_farmer_livestream_session", JSON.stringify(updatedSession));
        const storedLives = JSON.parse(localStorage.getItem("farmer_custom_livestreams")) || [];
        const nextLives = storedLives.map((s) => (s.id === liveSessionId ? updatedSession : s));
        localStorage.setItem("farmer_custom_livestreams", JSON.stringify(nextLives));
      }
    } catch (e) {
      console.error("Lỗi khi điều chỉnh voucher trong livestream:", e);
    }
  };

  const syncDiscountsToBackend = async (percent, discounts, customProductIds) => {
    if (!liveSessionId) return;
    try {
      const ids = customProductIds || selectedProductIds;
      const discObj = {};
      ids.forEach((id) => {
        discObj[id] = discounts[id] !== undefined ? parseInt(discounts[id]) || 0 : 0;
      });
      await apiClient.post(`/api/livestreams/${liveSessionId}/discounts`, {
        voucherPercent: percent,
        productDiscounts: discObj
      });
    } catch (err) {
      console.error("Lỗi đồng bộ chiết khấu lên backend:", err);
    }
  };

  const handleUpdateLiveProducts = () => {
    try {
      // Commit the temporary state changes to official state
      setSelectedProductIds(tempSelectedProductIds);
      setProductDiscounts(tempProductDiscounts);

      // 1. Sync product list to backend
      if (liveSessionId) {
        apiClient.post(`/api/livestreams/${liveSessionId}/products`, {
          productIds: tempSelectedProductIds
        }).catch(err => console.error("Lỗi đồng bộ sản phẩm lên backend:", err));

        // 2. Sync discounts to backend using the temporary lists
        syncDiscountsToBackend(voucherPercent, tempProductDiscounts, tempSelectedProductIds);
      }

      // 3. Update pinned product if the currently pinned product was removed
      let nextPin = pinnedProductId;
      if (!tempSelectedProductIds.includes(pinnedProductId)) {
        nextPin = tempSelectedProductIds.length > 0 ? tempSelectedProductIds[0] : null;
        setPinnedProductId(nextPin);
        if (liveSessionId && nextPin) {
          apiClient.post(`/api/livestreams/${liveSessionId}/pin/${nextPin}`).catch(err => console.error(err));
        }
      }

      // 4. Sync session to localStorage
      const activeSession = JSON.parse(localStorage.getItem("active_farmer_livestream_session"));
      if (activeSession) {
        const updatedProducts = farmerProducts
          .filter((p) => tempSelectedProductIds.includes(p.id))
          .map((p) => {
            const discount = voucherPercent !== 0 ? (parseInt(tempProductDiscounts[p.id]) || 0) : 0;
            const livePrice = discount > 0 ? Math.round(p.price * (1 - discount / 100)) : p.price;
            return {
              id: p.id,
              name: p.name,
              originalPrice: p.price,
              price: livePrice,
              unit: p.unit || "kg",
              imageUrl: p.imageUrl,
              discountPercent: discount
            };
          });

        const updatedSession = {
          ...activeSession,
          products: updatedProducts
        };

        localStorage.setItem("active_farmer_livestream_session", JSON.stringify(updatedSession));
        const storedLives = JSON.parse(localStorage.getItem("farmer_custom_livestreams")) || [];
        const nextLives = storedLives.map((s) => (s.id === liveSessionId ? updatedSession : s));
        localStorage.setItem("farmer_custom_livestreams", JSON.stringify(nextLives));
      }
    } catch (e) {
      console.error("Lỗi khi cập nhật sản phẩm trong livestream:", e);
    }
    setIsEditProductsOpen(false);
  };

  const handlePinChat = (msg) => {
    setPinnedChatMessage(msg);
    if (liveSessionId) {
      apiClient.post(`/api/livestreams/${liveSessionId}/pin-comment`, {
        user: msg.user,
        text: msg.text
      }).catch(err => console.error("Lỗi đồng bộ ghim bình luận lên backend:", err));
    }
    try {
      const activeSession = JSON.parse(localStorage.getItem("active_farmer_livestream_session"));
      if (activeSession) {
        const updatedSession = {
          ...activeSession,
          pinnedChatMessage: msg
        };
        localStorage.setItem("active_farmer_livestream_session", JSON.stringify(updatedSession));
        const storedLives = JSON.parse(localStorage.getItem("farmer_custom_livestreams")) || [];
        const nextLives = storedLives.map((s) => (s.id === liveSessionId ? updatedSession : s));
        localStorage.setItem("farmer_custom_livestreams", JSON.stringify(nextLives));
      }
    } catch (e) {
      console.error("Lỗi khi ghim tin nhắn chat:", e);
    }
  };

  const handleUnpinChat = () => {
    setPinnedChatMessage(null);
    if (liveSessionId) {
      apiClient.post(`/api/livestreams/${liveSessionId}/unpin-comment`)
        .catch(err => console.error("Lỗi đồng bộ bỏ ghim bình luận lên backend:", err));
    }
    try {
      const activeSession = JSON.parse(localStorage.getItem("active_farmer_livestream_session"));
      if (activeSession) {
        const updatedSession = {
          ...activeSession,
          pinnedChatMessage: null
        };
        localStorage.setItem("active_farmer_livestream_session", JSON.stringify(updatedSession));
        const storedLives = JSON.parse(localStorage.getItem("farmer_custom_livestreams")) || [];
        const nextLives = storedLives.map((s) => (s.id === liveSessionId ? updatedSession : s));
        localStorage.setItem("farmer_custom_livestreams", JSON.stringify(nextLives));
      }
    } catch (e) {
      console.error("Lỗi khi bỏ ghim tin nhắn chat:", e);
    }
  };

  const handleDeleteChat = async (msgId) => {
    try {
      const commentIdStr = msgId.replace("comment-", "");
      const commentId = parseInt(commentIdStr);
      if (!isNaN(commentId)) {
        await apiClient.delete(`/api/livestreams/${liveSessionId}/comments/${commentId}`);
      }

      setChatMessages((prev) => prev.filter((m) => m.id !== msgId));
      if (pinnedChatMessage && pinnedChatMessage.id === msgId) {
        handleUnpinChat();
      }
    } catch (err) {
      console.error("Lỗi xóa bình luận:", err);
    }
  };

  const handleBlockUser = async (msg) => {
    try {
      if (!msg.senderId) return;
      await apiClient.post(`/api/livestreams/${liveSessionId}/block-user`, {
        userId: msg.senderId
      });

      // Remove all previous messages from this blocked user locally
      setChatMessages((prev) => prev.filter((m) => m.senderId !== msg.senderId));

      // Clear pin if pinned message belonged to this user
      if (pinnedChatMessage && pinnedChatMessage.senderId === msg.senderId) {
        handleUnpinChat();
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `sys-block-${Date.now()}`,
          type: "system",
          text: `Hệ thống: Người dùng [${msg.user}] đã bị chặn bình luận!`
        }
      ]);
    } catch (err) {
      console.error("Lỗi khi chặn người dùng:", err);
    }
  };

  // Launch Livestream Session
  const handleStartLivestream = async () => {
    if (!title.trim()) {
      showToast("Vui lòng nhập Tiêu đề phiên livestream!", "error");
      return;
    }

    isEndingRef.current = false;
    setConnecting(true);
    try {
      // 1. Create livestream session on Backend
      const response = await apiClient.post("/api/livestreams/create", {
        title: title,
        description: description,
        productIds: selectedProductIds
      });
      const data = response.data; // contains: livestreamId, channelName, token, appId

      // 2. Initialize Agora SDK
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      await client.setClientRole("host");

      // Stop native preview track before Agora takes over
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }

      // Join the channel
      await client.join(data.appId, data.channelName, data.token, null);

      // Create Microphone and Camera audio/video tracks
      const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      const localVideoTrack = await AgoraRTC.createCameraVideoTrack();

      // Publish tracks
      await client.publish([localAudioTrack, localVideoTrack]);

      // Save refs
      rtcRef.current.client = client;
      rtcRef.current.localAudioTrack = localAudioTrack;
      rtcRef.current.localVideoTrack = localVideoTrack;

      // Play local video track in the video tag
      if (videoRef.current) {
        localVideoTrack.play(videoRef.current);
      }

      setLiveSessionId(data.livestreamId);
      setStreamState("live");

      // Sync initial discounts to backend
      const initialDiscs = {};
      selectedProductIds.forEach((id) => {
        if (voucherPercent === 0) {
          // Farmer chọn "Không áp dụng" → không có discount
          initialDiscs[id] = 0;
        } else {
          // Dùng discount riêng của sản phẩm (nếu đã set), fallback về voucherPercent
          initialDiscs[id] = productDiscounts[id] !== undefined ? parseInt(productDiscounts[id]) || 0 : voucherPercent;
        }
      });
      apiClient.post(`/api/livestreams/${data.livestreamId}/discounts`, {
        voucherPercent: voucherPercent,
        productDiscounts: initialDiscs
      }).catch(err => console.error("Lỗi đồng bộ chiết khấu ban đầu:", err));

      setChatMessages([
        { id: "sys-1", type: "system", text: "Hệ thống: Kết nối livestream ổn định. Phiên live bắt đầu phát sóng!" },
        { id: "sys-2", type: "system", text: "Mẹo: Hãy ghim nông sản để thu hút người mua bấm đặt hàng trực tiếp." }
      ]);

      // Default pin is the first selected product, if any
      if (selectedProductIds.length > 0) {
        setPinnedProductId(selectedProductIds[0]);
        // Also notify backend about pinned product
        apiClient.post(`/api/livestreams/${data.livestreamId}/pin/${selectedProductIds[0]}`).catch(err => console.error(err));
      }

      setTempVoucherPercent(voucherPercent);

      // Initialize active session in localStorage
      try {
        const initialProducts = farmerProducts
          .filter((p) => selectedProductIds.includes(p.id))
          .map((p) => {
            const discount = voucherPercent !== 0 ? (parseInt(productDiscounts[p.id]) || 0) : 0;
            const livePrice = discount > 0 ? Math.round(p.price * (1 - discount / 100)) : p.price;
            return {
              id: p.id,
              name: p.name,
              originalPrice: p.price,
              price: livePrice,
              unit: p.unit || "kg",
              imageUrl: p.imageUrl,
              discountPercent: discount
            };
          });

        const activeSession = {
          id: data.livestreamId,
          farmerId: farmerProfile?.id || currentUser?.id || 1,
          farmerName: farmerProfile?.fullName || currentUser?.fullName || "Nhà vườn AgriMarket",
          farmerBrand: farmerProfile?.farmName || "Nông trại sạch địa phương",
          farmerAvatar: farmerProfile?.avatarUrl || currentUser?.avatarUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
          title: title,
          description: description,
          status: "live",
          viewers: 0,
          likes: 0,
          voucherPercent: voucherPercent,
          voucherTitle: voucherPercent > 0 ? `Giảm ${voucherPercent}% Toàn Trang Trại` : null,
          tags: ["Trực tiếp tại vườn", "Nông sản sạch", voucherPercent > 0 ? `Voucher ${voucherPercent}%` : "Săn Deal"],
          products: initialProducts
        };

        window.agoraActiveHostSession = {
          client,
          localAudioTrack,
          localVideoTrack,
          liveSessionId: data.livestreamId,
          title,
          description,
          selectedProductIds,
          productDiscounts,
          voucherPercent,
          chatMessages: [
            { id: "sys-1", type: "system", text: "Hệ thống: Kết nối livestream ổn định. Phiên live bắt đầu phát sóng!" },
            { id: "sys-2", type: "system", text: "Mẹo: Hãy ghim nông sản để thu hút người mua bấm đặt hàng trực tiếp." }
          ],
          pinnedProductId: selectedProductIds.length > 0 ? selectedProductIds[0] : null,
          streamState: "live",
          streamDuration: 0,
          heartsCount: 0,
          viewersCount: 0,
          isCamOn,
          isMicOn
        };

        localStorage.setItem("active_farmer_livestream_session", JSON.stringify(activeSession));

        const storedLives = JSON.parse(localStorage.getItem("farmer_custom_livestreams")) || [];
        const filteredLives = storedLives.filter(s => s.id !== data.livestreamId);
        localStorage.setItem("farmer_custom_livestreams", JSON.stringify([...filteredLives, activeSession]));
      } catch (e) {
        console.error("Lỗi khi ghi thông tin livestream vào localStorage:", e);
      }
    } catch (err) {
      console.error(err);
      showToast("Không thể kết nối đến máy chủ Agora. Chi tiết: " + err.message, "error");
    } finally {
      setConnecting(false);
    }
  };

  const handleScheduleLivestream = async () => {
    if (!title.trim()) {
      showToast("Vui lòng nhập Tiêu đề phiên livestream!", "error");
      return;
    }
    if (!scheduledTime) {
      showToast("Vui lòng chọn thời gian lên lịch phát sóng!", "error");
      return;
    }

    const scheduledDate = new Date(scheduledTime);
    const minScheduledDate = new Date(Date.now() + 5 * 60 * 1000);
    if (scheduledDate < minScheduledDate) {
      showToast("Thời gian lên lịch phát sóng phải cách hiện tại ít nhất 5 phút!", "error");
      return;
    }

    try {
      const response = await apiClient.post("/api/livestreams/schedule", {
        title: title,
        description: description,
        productIds: selectedProductIds,
        startTime: scheduledTime
      });
      const data = response.data;
      setLiveSessionId(data.livestreamId);
      setStreamState("scheduled");
      showToast("Lên lịch livestream thành công!", "success");

      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }
    } catch (err) {
      console.error("Lỗi lên lịch livestream:", err);
      showToast("Không thể lên lịch livestream. Vui lòng thử lại sau.", "error");
    }
  };


  // Host sends chat comment
  const handleHostSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !liveSessionId) return;

    try {
      await apiClient.post(`/api/livestreams/${liveSessionId}/comments`, {
        comment: chatInput.trim()
      });

      const farmerUser = JSON.parse(localStorage.getItem("farmconnect_user")) || {};
      const farmName = farmerUser.farmName || "Nhà vườn";

      setChatMessages((prev) => [
        ...prev,
        {
          id: `host-${Date.now()}`,
          type: "host",
          user: `${farmName} (Bạn)`,
          text: chatInput.trim()
        }
      ]);
      setChatInput("");
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
    }
  };

  // Pin a product to live
  const handlePinProduct = async (productId) => {
    if (!liveSessionId) return;
    try {
      await apiClient.post(`/api/livestreams/${liveSessionId}/pin/${productId}`);
      setPinnedProductId(productId);
    } catch (err) {
      console.error("Lỗi khi ghim sản phẩm:", err);
    }
  };

  // Interactive Hearts
  const triggerHeartBurst = () => {
    setHeartsCount((h) => h + 1);
    const newHeartId = Date.now() + Math.random();
    setFloatingHearts((prev) => [...prev, newHeartId]);

    // Cleanup heart after 2s
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((id) => id !== newHeartId));
    }, 2000);
  };

  // Trigger confirm end stream modal
  const handleEndLivestream = () => {
    setIsConfirmEndOpen(true);
  };

  const executeEndLivestream = async () => {
    if (!liveSessionId) return;
    isEndingRef.current = true;
    try {
      const response = await apiClient.post(`/api/livestreams/${liveSessionId}/end`);
      const report = response.data;

      // Stop Agora tracks and leave channel
      if (rtcRef.current.localAudioTrack) {
        rtcRef.current.localAudioTrack.close();
        rtcRef.current.localAudioTrack = null;
      }
      if (rtcRef.current.localVideoTrack) {
        rtcRef.current.localVideoTrack.close();
        rtcRef.current.localVideoTrack = null;
      }
      if (rtcRef.current.client) {
        await rtcRef.current.client.leave();
        rtcRef.current.client = null;
      }

      setReportStats({
        duration: report.duration,
        peakViewers: report.peakViewers,
        hearts: report.hearts,
        orders: report.orders,
        newFollowers: report.newFollowers
      });

      // Clean up localStorage active session
      try {
        localStorage.removeItem("active_farmer_livestream_session");
        const storedLives = JSON.parse(localStorage.getItem("farmer_custom_livestreams")) || [];
        const updatedLives = storedLives.map((s) => {
          if (s.id === liveSessionId) {
            return { ...s, status: "replay" };
          }
          return s;
        });
        localStorage.setItem("farmer_custom_livestreams", JSON.stringify(updatedLives));
      } catch (err) {
        console.error("Lỗi khi dọn dẹp localStorage:", err);
      }

      setStreamState("ended");
      window.agoraActiveHostSession = null;
    } catch (e) {
      console.error(e);
      showToast("Lỗi khi kết thúc livestream: " + e.message, "error");
    }
  };

  return (
    <div className="farmer-live-root">
      {/* 1. SETUP PAGE */}
      {streamState === "setup" && (
        <div className="prep-layout-grid">
          {/* Setup configurations */}
          <div className="live-card">
            <h2 style={{ marginTop: 0, color: "#0f172a", fontSize: "1.3rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <ClipboardList size={22} style={{ color: "#10b981" }} /> Thiết lập Phòng Livestream
            </h2>

            <div className="form-group-live">
              <label>Tiêu đề phiên livestream *</label>
              <input
                type="text"
                placeholder="Ví dụ: Quy trình thu hoạch cà chua sạch vườn Organic VietGAP"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group-live">
              <label>Mô tả buổi live (Không bắt buộc)</label>
              <textarea
                rows="3"
                placeholder="Mô tả nội dung buổi livestream, khuyến khích khách hàng đặt câu hỏi giao lưu..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>

            <div className="form-group-live" style={{ marginBottom: "24px" }}>
              <label className="product-pin-title-row">
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Package size={18} style={{ color: "#10b981" }} /> Chọn Nông sản bán trong live
                </span>
                {selectedProductIds.length > 0 && (
                  <span className="selected-count-tag">Đã chọn: {selectedProductIds.length}</span>
                )}
              </label>

              <div className="products-selection-container">
                {loadingProducts ? (
                  <p style={{ padding: "16px", color: "#64748b", margin: 0, textAlign: "center", fontSize: "0.85rem" }}>
                    Đang tải sản phẩm...
                  </p>
                ) : farmerProducts.length > 0 ? (
                  farmerProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className={`product-row-item ${selectedProductIds.includes(prod.id) ? "selected" : ""}`}
                      onClick={() => handleProductCheckboxChange(prod.id)}
                    >
                      <div className="product-row-left">
                        <input
                          type="checkbox"
                          className="product-row-checkbox"
                          checked={selectedProductIds.includes(prod.id)}
                          onChange={() => { }} // handled by item click
                        />
                        <img src={prod.imageUrl} alt={prod.name} className="product-row-thumbnail" />
                        <div className="product-row-details">
                          <p className="product-row-name">{prod.name}</p>
                          <p className="product-row-meta">
                            Giá:{" "}
                            {selectedProductIds.includes(prod.id) && voucherPercent !== 0 && (productDiscounts[prod.id] || 0) > 0 ? (
                              <>
                                <span className="price-bold" style={{ textDecoration: "line-through", color: "#94a3b8", marginRight: "6px" }}>
                                  {prod.price.toLocaleString()}đ
                                </span>
                                <span className="price-bold" style={{ color: "#ef4444", fontWeight: 700 }}>
                                  {(prod.price * (1 - (parseInt(productDiscounts[prod.id]) || 0) / 100)).toLocaleString()}đ
                                </span>
                              </>
                            ) : (
                              <span className="price-bold">{prod.price.toLocaleString()}đ</span>
                            )}
                            /{prod.unit} • Kho: {prod.stock}
                          </p>
                        </div>
                      </div>
                      {selectedProductIds.includes(prod.id) && voucherPercent !== 0 && (
                        <div className="product-row-inputs" onClick={(e) => e.stopPropagation()}>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Giảm live:</span>
                          <input
                            type="number"
                            className="live-discount-box"
                            min="0"
                            max="90"
                            value={productDiscounts[prod.id] !== undefined ? productDiscounts[prod.id] : ""}
                            onChange={(e) => handleDiscountChange(prod.id, e.target.value)}
                          />
                          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>%</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ padding: "16px", color: "#64748b", margin: 0, textAlign: "center", fontSize: "0.85rem" }}>
                    Chưa có sản phẩm nào được phê duyệt. Vui lòng đăng bán sản phẩm trước khi livestream.
                  </p>
                )}
              </div>
            </div>

            <div className="form-group-live">
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Ticket size={18} style={{ color: "#10b981" }} /> Voucher/Mã giảm giá áp dụng (Độc quyền trên live)
              </label>
              <div className="voucher-option-pills">
                <button
                  className={`voucher-pill ${voucherPercent === 0 ? "active" : ""}`}
                  onClick={() => handleVoucherPercentChange(0)}
                >
                  Không áp dụng
                </button>
                <button
                  className={`voucher-pill ${voucherPercent === 10 ? "active" : ""}`}
                  onClick={() => handleVoucherPercentChange(10)}
                >
                  Giảm 10%
                </button>
                <button
                  className={`voucher-pill ${voucherPercent === 15 ? "active" : ""}`}
                  onClick={() => handleVoucherPercentChange(15)}
                >
                  Giảm 15%
                </button>
                <button
                  className={`voucher-pill ${voucherPercent === 20 ? "active" : ""}`}
                  onClick={() => handleVoucherPercentChange(20)}
                >
                  Giảm 20%
                </button>
              </div>
            </div>
          </div>

          {/* Device & Settings Check */}
          <div>
            <div className="live-card" style={{ paddingBottom: "16px" }}>
              <h3 style={{ marginTop: 0, color: "#0f172a", fontSize: "1.1rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Video size={20} style={{ color: "#10b981" }} /> Kiểm tra thiết bị
              </h3>

              {/* Viewfinder Preview */}
              <div className="camera-preview-box">
                {isCamOn && cameraStream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-preview-video"
                  ></video>
                ) : (
                  <div className="camera-placeholder-graphic">
                    <span className="placeholder-cam-icon" style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", marginBottom: "8px" }}>
                      <VideoOff size={48} style={{ color: "#64748b" }} />
                    </span>
                    <p style={{ margin: 0, fontSize: "0.85rem" }}>
                      {!isCamOn ? "Camera đã tắt" : "Đang chờ kết nối camera..."}
                    </p>
                  </div>
                )}
                <div className="camera-preview-overlay-bar">
                  <span className="live-indicator-dot"></span>
                  <span>XEM TRƯỚC HÌNH ẢNH</span>
                </div>
              </div>

              {/* Controls */}
              <div className="camera-controls-row">
                <button
                  className={`cam-btn-control ${!isCamOn ? "off" : ""}`}
                  onClick={() => setIsCamOn(!isCamOn)}
                  title={isCamOn ? "Tắt Camera" : "Bật Camera"}
                >
                  {isCamOn ? <Video size={18} /> : <VideoOff size={18} />}
                </button>
                <button
                  className={`cam-btn-control ${!isMicOn ? "off" : ""}`}
                  onClick={() => setIsMicOn(!isMicOn)}
                  title={isMicOn ? "Tắt Microphone" : "Bật Microphone"}
                >
                  {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
                </button>
              </div>

              {/* Audio visualizer */}
              <div className="audio-check-row">
                <div className="audio-header">
                  <span>Tín hiệu Micro</span>
                  <span>{isMicOn ? "Hoạt động" : "Tắt"}</span>
                </div>
                {isMicOn ? (
                  <div className="audio-waves-container">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((bar) => {
                      const active = audioLevel > bar * 8;
                      return (
                        <div
                          key={bar}
                          className={`audio-wave-bar ${active ? "active" : ""}`}
                          style={{
                            height: active ? `${Math.floor(Math.random() * 15) + 6}px` : "6px",
                            backgroundColor: active ? "#10b981" : "#e2e8f0"
                          }}
                        ></div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="audio-bar-wrapper">
                    <div className="audio-level-fill" style={{ width: "0%" }}></div>
                  </div>
                )}
              </div>

              {/* Guideline reminders */}
              <div className="stream-tips-box">
                <h4 className="tips-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Lightbulb size={18} style={{ color: "#f59e0b" }} /> Mẹo Livestream đạt hiệu quả:
                </h4>
                <ul className="tips-list">
                  <li>Đảm bảo vị trí quay có đủ ánh sáng mặt trời tự nhiên.</li>
                  <li>Giữ đường truyền mạng Wifi/4G ổn định trong suốt buổi live.</li>
                  <li>Hãy tích cực tương tác, trả lời trực tiếp các thắc mắc của người xem.</li>
                  <li>Tạo các ưu đãi giảm giá độc quyền chỉ có trên phiên live để kích cầu.</li>
                </ul>
              </div>
            </div>

            {/* Scheduled Time Input */}
            <div style={{ marginTop: "16px", marginBottom: "16px", textAlign: "left" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                <Calendar size={16} /> Thời gian lên lịch (Nếu muốn lên lịch live)
              </label>
              <PopoverDateTimePicker
                value={scheduledTime}
                onChange={(val) => setScheduledTime(val)}
                minDate={new Date()}
              />
            </div>

            <button className="btn-launch-live" onClick={handleStartLivestream} disabled={connecting} style={connecting ? { backgroundColor: "#94a3b8", cursor: "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" } : { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <Radio size={18} /> {connecting ? "Đang kết nối với server..." : "Bắt đầu Phát sóng ngay"}
            </button>

            <button
              className="btn-schedule-live"
              onClick={handleScheduleLivestream}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #10b981",
                backgroundColor: "transparent",
                color: "#10b981",
                fontWeight: "700",
                fontSize: "1rem",
                marginTop: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#10b981";
                e.currentTarget.style.color = "white";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#10b981";
              }}
            >
              <Calendar size={18} /> Lên lịch phát sóng
            </button>
          </div>
        </div>
      )}

      {/* 1.5. SCHEDULED COUNTDOWN SCREEN */}
      {streamState === "scheduled" && (
        <FarmerScheduledCountdown
          title={title}
          description={description}
          scheduledTime={scheduledTime}
          onStartLive={handleStartLivestream}
          connecting={connecting}
        />
      )}

      {/* 2. BROADCASTING LIVE CONSOLE */}
      {streamState === "live" && (
        <>
          <div className="live-session-info-bar" style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "20px"
          }}>
            <h3 style={{ margin: "0 0 6px 0", color: "#0f172a", fontSize: "1.15rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ display: "inline-block", width: "10px", height: "10px", backgroundColor: "#ef4444", borderRadius: "50%", animation: "pulse-red 1.5s infinite" }}></span> Phiên live hiện tại: {title}
            </h3>
            {description && (
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem", whiteSpace: "pre-line" }}>
                {description}
              </p>
            )}
          </div>
          <div className="live-console-grid">
            {/* Main viewfinder broadcasting feed */}
            <div>
              <div className="live-viewfinder-wrapper">
                {/* Actual camera or animated fallback */}
                {isCamOn ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="viewfinder-stream"
                  ></video>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "radial-gradient(circle, #1e3a8a 0%, #0f172a 100%)",
                      color: "white"
                    }}
                  >
                    <span style={{ display: "inline-flex", animation: "bounce 2s infinite" }}>
                      <VideoOff size={48} style={{ color: "#cbd5e1" }} />
                    </span>
                    <p style={{ marginTop: "12px", fontSize: "0.95rem", fontWeight: "600", color: "#cbd5e1" }}>
                      Camera đang tắt (Livestream đang chạy)
                    </p>
                  </div>
                )}

                {/* Viewfinder Header info */}
                <div className="viewfinder-top-bar">
                  <div className="viewfinder-badges-left">
                    <span className="badge-live-pulse">
                      <span style={{ width: "6px", height: "6px", backgroundColor: "white", borderRadius: "50%" }}></span>
                      TRỰC TIẾP
                    </span>
                    <span className="badge-live-time">
                      {formatTime(streamDuration)}
                    </span>
                  </div>

                  <div className="viewfinder-badges-right">
                    <span className="badge-console-stats" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Users size={14} /> {viewersCount} người xem
                    </span>
                    <span className="badge-console-stats" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Heart size={14} style={{ fill: "#ef4444", color: "#ef4444" }} /> {heartsCount} Thích
                    </span>
                  </div>
                </div>



                {/* Floating Hearts effect area */}
                <div className="hearts-fly-area">
                  {floatingHearts.map((heartId) => {
                    const hearts = ["❤️", "💖", "🍓", "🍅", "⭐", "👍"];
                    const randomIcon = hearts[Math.floor((heartId * 10) % hearts.length)];
                    const leftPos = 10 + ((heartId * 100) % 40); // spread left position
                    return (
                      <span
                        key={heartId}
                        className="floating-heart"
                        style={{ left: `${leftPos}px` }}
                      >
                        {randomIcon}
                      </span>
                    );
                  })}
                </div>

                {/* Overlay controls */}
                <div className="viewfinder-action-row">
                  <button
                    className="btn-floating-action"
                    onClick={() => setIsCamOn(!isCamOn)}
                    title={isCamOn ? "Tắt Camera" : "Bật Camera"}
                  >
                    {isCamOn ? <Video size={18} /> : <VideoOff size={18} />}
                  </button>
                  <button
                    className="btn-floating-action"
                    onClick={() => setIsMicOn(!isMicOn)}
                    title={isMicOn ? "Tắt Mic" : "Bật Mic"}
                  >
                    {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
                  </button>
                </div>
              </div>

              {/* End Stream Button */}
              <div className="live-console-footer">
                <button className="btn-end-stream" onClick={handleEndLivestream}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ marginRight: "8px" }}
                  >
                    <rect x="4" y="4" width="16" height="16" rx="3" />
                  </svg>
                  Kết thúc Livestream
                </button>
              </div>

              {/* Live Products & Voucher adjustment container card */}
              <div className="live-card" style={{ marginTop: "20px", padding: "16px 20px" }}>
                {/* Console Products pinning selection list */}
                <div className="console-products-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#475569", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Pin size={16} style={{ color: "#ef4444", transform: "rotate(45deg)" }} /> Sản phẩm trong buổi live ({selectedProductIds.length})
                    </h4>
                    <button
                      className="btn-edit-live-products"
                      onClick={() => setIsEditProductsOpen(true)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#10b981",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Pencil size={12} /> Chỉnh sửa
                    </button>
                  </div>
                  <div className="pinned-products-grid">
                    {farmerProducts
                      .filter((p) => selectedProductIds.includes(p.id))
                      .map((p) => {
                        const discount = voucherPercent !== 0 ? (parseInt(productDiscounts[p.id]) || 0) : 0;
                        const livePrice = discount > 0 ? Math.round(p.price * (1 - discount / 100)) : p.price;
                        const isActivePin = pinnedProductId === p.id;

                        return (
                          <div
                            key={p.id}
                            className={`console-product-item ${isActivePin ? "active" : ""}`}
                          >
                            <div className="console-prod-left">
                              <img src={p.imageUrl} alt={p.name} className="console-prod-img" />
                              <div className="console-prod-details">
                                <p className="console-prod-name">{p.name}</p>
                                <p className="console-prod-price">
                                  {livePrice.toLocaleString()}đ/{p.unit}
                                </p>
                              </div>
                            </div>
                            <button
                              className={`btn-pin-control ${isActivePin ? "active" : ""}`}
                              onClick={() => handlePinProduct(p.id)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              {isActivePin ? (
                                <>
                                  <Pin size={12} style={{ transform: "rotate(45deg)", fill: "currentColor" }} /> Đang ghim
                                </>
                              ) : (
                                "Ghim lên live"
                              )}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Voucher edit section during live */}
                <div className="console-voucher-edit-card" style={{ marginTop: "20px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "#475569", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Ticket size={16} style={{ color: "#10b981" }} /> Điều chỉnh Voucher phiên live
                  </h4>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <div className="voucher-option-pills" style={{ gap: "6px", display: "flex", flexWrap: "wrap" }}>
                      {[0, 10, 15, 20].map((percent) => (
                        <button
                          key={percent}
                          className={`voucher-pill ${tempVoucherPercent === percent ? "active" : ""}`}
                          onClick={() => setTempVoucherPercent(percent)}
                          style={{ padding: "6px 10px", fontSize: "0.75rem", borderRadius: "6px" }}
                        >
                          {percent === 0 ? "Không" : `-${percent}%`}
                        </button>
                      ))}
                    </div>

                    {/* Custom input box */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Tự nhập:</span>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        placeholder="Nhập %"
                        value={![0, 10, 15, 20].includes(tempVoucherPercent) ? tempVoucherPercent : ""}
                        onChange={(e) => {
                          const val = Math.min(Math.max(parseInt(e.target.value) || 0, 0), 90);
                          setTempVoucherPercent(val);
                        }}
                        style={{
                          width: "68px",
                          padding: "6px 4px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          textAlign: "center"
                        }}
                      />
                      <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#475569" }}>%</span>
                    </div>

                    {/* Apply button shown conditionally */}
                    {tempVoucherPercent !== voucherPercent && (
                      <button
                        className="btn-modal-submit"
                        onClick={() => handleUpdateLiveVoucher(tempVoucherPercent)}
                        style={{
                          padding: "6px 12px",
                          fontSize: "0.75rem",
                          borderRadius: "6px",
                          marginLeft: "auto"
                        }}
                      >
                        Áp dụng
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: Live Chat box */}
            <div className="live-card live-chat-panel">
              <div className="chat-panel-header">
                <h3 className="chat-panel-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <MessageSquare size={18} style={{ color: "#10b981" }} /> Khán giả trò chuyện
                </h3>
                <span className="badge-role" style={{ backgroundColor: "#e2e8f0", color: "#475569" }}>
                  Host Console
                </span>
              </div>

              {/* Pinned Chat Display Row */}
              {pinnedChatMessage && (
                <div className="console-pinned-chat-row">
                  <div className="console-pinned-chat-content">
                    <span className="pinned-badge" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Pin size={12} style={{ transform: "rotate(45deg)", fill: "currentColor" }} /> Đã ghim:
                    </span>
                    <span className="pinned-user">{pinnedChatMessage.user}:</span>
                    <span className="pinned-text">{pinnedChatMessage.text}</span>
                  </div>
                  <button className="btn-unpin-chat" onClick={handleUnpinChat} title="Bỏ ghim">
                    &times;
                  </button>
                </div>
              )}

              {/* Chat List */}
              <div className="chat-console-messages-list" ref={chatListRef}>
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`chat-message-console-item ${msg.type}`}>
                    {msg.type === "system" ? (
                      <span>{msg.text}</span>
                    ) : (
                      <>
                        <div className="chat-message-bubble-left">
                          <span className={`chat-user-badge ${msg.type}`}>
                            {msg.user}:
                          </span>
                          <span className="chat-msg-text">{msg.text}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <button
                            className="btn-pin-chat-msg"
                            onClick={() => handlePinChat(msg)}
                            title="Ghim tin nhắn"
                            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <Pin size={14} style={{ transform: "rotate(45deg)" }} />
                          </button>
                          <button
                            className="btn-delete-chat-msg"
                            onClick={() => handleDeleteChat(msg.id)}
                            title="Xóa bình luận"
                            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            className="btn-block-user-msg"
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc chắn muốn chặn bình luận của [${msg.user}] và xóa toàn bộ bình luận cũ của họ không?`)) {
                                handleBlockUser(msg);
                              }
                            }}
                            title="Chặn người dùng này"
                            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <Ban size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {/* No dummy scroll ref element needed since we scroll container scrollTop directly */}
              </div>

              {/* Host Reply chat input */}
              <form className="host-chat-input-row" onSubmit={handleHostSendChat}>
                <input
                  type="text"
                  className="host-chat-input"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" className="btn-send-host-chat">
                  Gửi
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* 3. FINAL REPORT SCREEN */}
      {streamState === "ended" && (
        <div className="live-report-overlay">
          <div className="live-report-modal">
            <div className="report-icon-container">
              <Sparkles size={36} style={{ color: "#10b981" }} />
            </div>
            <h2 className="report-title">
              Đã Kết Thúc Livestream!
            </h2>
            <p className="report-subtitle">
              Cảm ơn bạn đã kết nối chia sẻ quy trình sạch cùng cộng đồng người tiêu dùng AgriMarket.
            </p>

            <div className="report-stats-grid">
              <div className="report-stat-card">
                <p className="stat-card-val">{reportStats.duration}</p>
                <p className="stat-card-lbl">Thời lượng</p>
              </div>
              <div className="report-stat-card">
                <p className="stat-card-val">{reportStats.peakViewers}</p>
                <p className="stat-card-lbl">Peak xem</p>
              </div>
              <div className="report-stat-card">
                <p className="stat-card-val">❤️ {reportStats.hearts}</p>
                <p className="stat-card-lbl">Lượt thả tim</p>
              </div>
            </div>

            <button className="btn-close-report" onClick={() => setStreamState("setup")}>
              Quay lại thiết lập
            </button>
          </div>
        </div>
      )}

      {/* 5. BANNED BY ADMIN SCREEN */}
      {streamState === "banned" && (
        <div className="fl-banned-overlay">
          <div className="fl-banned-card">
            {/* Top accent bar */}
            <div className="fl-banned-top-bar" />

            {/* Icon */}
            <div className="fl-banned-icon-wrap">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>

            {/* Title */}
            <h2 className="fl-banned-title">Phiên livestream đã bị dừng</h2>
            <p className="fl-banned-subtitle">
              Quản trị viên AgriMarket đã chấm dứt phiên phát sóng của bạn do phát hiện vi phạm Tiêu chuẩn cộng đồng.
            </p>

            {/* Reason card */}
            <div className="fl-banned-reason-card">
              <div className="fl-banned-reason-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>LÝ DO CHẤM DỨT</span>
              </div>
              <p className="fl-banned-reason-text">
                {adminBanReason || "Vi phạm tiêu chuẩn cộng đồng về nội dung quảng cáo hoặc chất lượng sản phẩm."}
              </p>
            </div>

            {/* Help note */}
            <p className="fl-banned-help">
              Nếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ bộ phận hỗ trợ AgriMarket để được giải quyết.
            </p>

            {/* Action button */}
            <button className="fl-banned-btn" onClick={() => setStreamState("setup")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Quay lại trang thiết lập
            </button>
          </div>
        </div>
      )}
      {/* 4. EDIT PRODUCTS MODAL (DURING LIVE) */}
      {isEditProductsOpen && (
        <div className="live-modal-overlay">
          <div className="live-modal-content">
            <div className="live-modal-header">
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Pencil size={18} style={{ color: "#10b981" }} /> Quản lý sản phẩm trên Livestream
              </h3>
              <button className="btn-close-modal" onClick={() => setIsEditProductsOpen(false)}>
                &times;
              </button>
            </div>

            <div className="form-group-live">
              <label className="product-pin-title-row">
                <span>Chọn sản phẩm hiển thị & giá ưu đãi:</span>
                {tempSelectedProductIds.length > 0 && (
                  <span className="selected-count-tag">Đã chọn: {tempSelectedProductIds.length}</span>
                )}
              </label>

              <div className="products-selection-container" style={{ maxHeight: "300px" }}>
                {farmerProducts.length > 0 ? (
                  farmerProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className={`product-row-item ${tempSelectedProductIds.includes(prod.id) ? "selected" : ""}`}
                      onClick={() => handleTempProductCheckboxChange(prod.id)}
                    >
                      <div className="product-row-left">
                        <input
                          type="checkbox"
                          className="product-row-checkbox"
                          checked={tempSelectedProductIds.includes(prod.id)}
                          onChange={() => { }}
                        />
                        <img src={prod.imageUrl} alt={prod.name} className="product-row-thumbnail" />
                        <div className="product-row-details">
                          <p className="product-row-name">{prod.name}</p>
                          <p className="product-row-meta">
                            Giá:{" "}
                            {tempSelectedProductIds.includes(prod.id) && voucherPercent !== 0 && (tempProductDiscounts[prod.id] || 0) > 0 ? (
                              <>
                                <span className="price-bold" style={{ textDecoration: "line-through", color: "#94a3b8", marginRight: "6px" }}>
                                  {prod.price.toLocaleString()}đ
                                </span>
                                <span className="price-bold" style={{ color: "#ef4444", fontWeight: 700 }}>
                                  {(prod.price * (1 - (parseInt(tempProductDiscounts[prod.id]) || 0) / 100)).toLocaleString()}đ
                                </span>
                              </>
                            ) : (
                              <span className="price-bold">{prod.price.toLocaleString()}đ</span>
                            )}
                            /{prod.unit} • Kho: {prod.stock}
                          </p>
                        </div>
                      </div>
                      {tempSelectedProductIds.includes(prod.id) && voucherPercent !== 0 && (
                        <div className="product-row-inputs" onClick={(e) => e.stopPropagation()}>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Giảm live:</span>
                          <input
                            type="number"
                            className="live-discount-box"
                            min="0"
                            max="90"
                            value={tempProductDiscounts[prod.id] !== undefined ? tempProductDiscounts[prod.id] : ""}
                            onChange={(e) => handleTempDiscountChange(prod.id, e.target.value)}
                          />
                          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>%</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ padding: "16px", color: "#64748b", margin: 0, textAlign: "center", fontSize: "0.85rem" }}>
                    Chưa có sản phẩm nào.
                  </p>
                )}
              </div>
            </div>

            <div className="live-modal-footer">
              <button className="btn-modal-cancel" onClick={() => setIsEditProductsOpen(false)}>
                Hủy
              </button>
              <button className="btn-modal-submit" onClick={handleUpdateLiveProducts}>
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CUSTOM CONFIRM END STREAM MODAL */}
      {isConfirmEndOpen && (
        <div className="live-report-overlay">
          <div className="live-report-modal" style={{ maxWidth: "420px", padding: "28px" }}>
            <div className="report-icon-container" style={{ backgroundColor: "#fee2e2", color: "#ef4444", marginBottom: "16px" }}>
              <AlertTriangle size={36} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#1f2937", margin: "0 0 8px 0" }}>
              Xác nhận Kết thúc Live
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#4b5563", margin: "0 0 24px 0", lineHeight: "1.5" }}>
              Bạn có chắc chắn muốn dừng buổi phát sóng trực tiếp này không? Hành động này sẽ kết thúc tương tác trực tiếp với khách hàng.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                className="btn-modal-cancel"
                onClick={() => setIsConfirmEndOpen(false)}
                style={{ flex: 1, padding: "10px", margin: 0 }}
              >
                Quay lại Live
              </button>
              <button
                className="btn-modal-submit"
                onClick={() => {
                  setIsConfirmEndOpen(false);
                  executeEndLivestream();
                }}
                style={{ flex: 1, padding: "10px", backgroundColor: "#ef4444", color: "white", border: "none", margin: 0 }}
              >
                Kết thúc ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`livestream-premium-toast ${toast.type}`}>
          <div className="toast-accent-bar" />
          <div className="toast-content-wrapper">
            <div className="toast-icon-circle">
              {toast.type === "success" && (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
              {toast.type === "error" && (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              )}
              {toast.type === "warning" && (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              )}
            </div>
            <div className="toast-text-group">
              <span className="toast-status-title">
                {toast.type === "success" ? "Thành công" : toast.type === "error" ? "Thất bại" : "Cảnh báo"}
              </span>
              <span className="toast-message-body">{toast.message}</span>
            </div>
          </div>
          <button className="toast-close-btn" onClick={() => setToast({ show: false })}>×</button>
          <div className="toast-progress-bar" />
        </div>
      )}
    </div>
  );
};

export default FarmerLivestream;
