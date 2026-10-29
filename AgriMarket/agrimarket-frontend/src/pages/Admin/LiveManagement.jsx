import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import authService from "../../services/authService";
import apiClient from "../../services/apiClient";
import AgoraRTC from "agora-rtc-sdk-ng";
import AdminSidebar from "../../components/common/Sidebar/AdminSidebar";
import AdminHeader from "../../components/common/Header/AdminHeader";
import {
  LayoutDashboard,
  Users,
  Sprout,
  CheckSquare,
  Folder,
  ShoppingCart,
  Package,
  CreditCard,
  MessageSquare,
  BarChart3,
  Globe,
  Bell,
  Activity,
  Settings,
  Truck,
  Search,
  Video,
  Eye,
  Heart,
  SlidersHorizontal,
  X,
  Radio,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import "./AdminStyles.css";
import "./LiveManagement.css";

export default function LiveManagement() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error'|'info', title }
  const [toastCountdown, setToastCountdown] = useState(0);
  const toastTimerRef = useRef(null);
  const toastCountdownRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Products modal view state
  const [viewingProductsList, setViewingProductsList] = useState(null); // array of products or null

  // Custom terminate confirm modal state
  const [terminatingSession, setTerminatingSession] = useState(null); // { id, brand } or null
  const [monitoringSession, setMonitoringSession] = useState(null); // session object or null
  const [monitorInitialTab, setMonitorInitialTab] = useState("comments");

  // Interactive filters state
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'live', 'ended'
  const [sortBy, setSortBy] = useState("default"); // 'default', 'newest', 'viewers', 'likes'
  const [banReason, setBanReason] = useState("Vi phạm tiêu chuẩn cộng đồng về nội dung quảng cáo hoặc chất lượng sản phẩm.");
  const [customBanReason, setCustomBanReason] = useState("");

  // Baseline Mock sessions corresponding to the screenshot (plus mock product items and likes)
  const defaultMockSessions = [
    {
      id: "FRM-8892",
      farmerName: "Sơn Trà Green Farm",
      farmerBrand: "Sơn Trà Green Farm",
      farmerAvatar: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=150",
      title: "Thu hoạch sầu riêng Ri6 xuất khẩu - Siêu rẻ",
      description: "Sầu riêng Ri6 rụng chín cây chín tự nhiên cực kì thơm ngon béo ngậy.",
      status: "live",
      viewers: 1240,
      likes: 2840,
      durationLabel: "Đang diễn ra: 45 phút",
      products: [
        {
          id: 101,
          name: "Sầu riêng Ri6 chín cây loại 1",
          originalPrice: 85000,
          price: 76500,
          discountPercent: 10,
          unit: "kg",
          imageUrl: "https://images.unsplash.com/photo-1610970881699-44a5587caa9a?w=150"
        }
      ]
    },
    {
      id: "FRM-1024",
      farmerName: "Hải Đăng Hydroponics",
      farmerBrand: "Hải Đăng Hydroponics",
      farmerAvatar: "https://images.unsplash.com/photo-1560493450-4e5b3869023d?w=150",
      title: "Ưu đãi 50% combo Rau sạch thủy canh Đà Lạt",
      description: "Combo rau sạch organic chuẩn VietGAP giao tận nhà.",
      status: "live",
      viewers: 602,
      likes: 1200,
      durationLabel: "Đang diễn ra: 12 phút",
      products: [
        {
          id: 201,
          name: "Xà lách thủy canh Đà Lạt",
          originalPrice: 25000,
          price: 25000,
          discountPercent: 0,
          unit: "cây",
          imageUrl: "https://images.unsplash.com/photo-1622206194165-d29673b88980?w=150"
        },
        {
          id: 202,
          name: "Combo rau xà lách lolo xanh + đỏ",
          originalPrice: 60000,
          price: 30000,
          discountPercent: 50,
          unit: "combo",
          imageUrl: "https://images.unsplash.com/photo-1557844352-761f2565b576?w=150"
        }
      ]
    },
    {
      id: "FRM-2231",
      farmerName: "Mộc Châu Tea House",
      farmerBrand: "Mộc Châu Tea House",
      farmerAvatar: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=150",
      title: "Quy trình đóng gói Trà Shan Tuyết đặc sản",
      description: "Thưởng thức vị trà thượng hạng nổi tiếng của vùng cao Mộc Châu.",
      status: "ended",
      viewers: 3100,
      likes: 8400,
      durationLabel: "Kết thúc: 2 giờ trước",
      products: [
        {
          id: 301,
          name: "Trà cổ thụ Shan Tuyết Mộc Châu",
          originalPrice: 180000,
          price: 150000,
          discountPercent: 16,
          unit: "hộp",
          imageUrl: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=150"
        }
      ]
    },
    {
      id: "FRM-4451",
      farmerName: "Fruit Garden Vĩnh Long",
      farmerBrand: "Fruit Garden Vĩnh Long",
      farmerAvatar: "https://images.unsplash.com/photo-1527339760228-5c388274e80f?w=150",
      title: "Chôm chôm nhãn vườn nhà - Giao tận nơi",
      description: "Chôm chôm nhãn giòn ngọt tróc vỏ sấy tay thơm ngon.",
      status: "ended",
      viewers: 892,
      likes: 1850,
      durationLabel: "Kết thúc: 5 giờ trước",
      products: [
        {
          id: 401,
          name: "Chôm chôm nhãn chín đỏ ngọt",
          originalPrice: 35000,
          price: 35000,
          discountPercent: 0,
          unit: "kg",
          imageUrl: "https://images.unsplash.com/photo-1527339760228-5c388274e80f?w=150"
        }
      ]
    }
  ];

  const [sessions, setSessions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy]);

  const [alerts, setAlerts] = useState([]);

  // Check auth and load sessions
  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (!user || user.role !== "admin") {
      navigate("/login");
      return;
    }

    loadSessions();
    const pollInterval = setInterval(loadSessions, 12000);
    return () => clearInterval(pollInterval);
  }, [navigate]);

  const loadSessions = async () => {
    try {
      const [res, alertsRes] = await Promise.all([
        apiClient.get("/api/livestreams/admin/all"),
        apiClient.get("/api/moderation/alerts?status=PENDING")
      ]);
      const dbStreams = res.data;
      setAlerts(alertsRes.data || []);

      const formatted = dbStreams.map((s) => {
        const parsedProducts = (s.products || []).map((p) => ({
          id: p.id,
          name: p.name,
          originalPrice: p.price,
          price: p.price,
          discountPercent: 0,
          unit: p.unit || "kg",
          imageUrl: p.imageUrl || "https://images.unsplash.com/photo-1550937386664-56d1dfef3854?w=150"
        }));

        let statusMapped = "ended";
        if (s.status === "active") statusMapped = "live";
        else if (s.status === "upcoming") statusMapped = "upcoming";

        let durationLabel = "Đã phát xong";
        if (statusMapped === "live") {
          const start = s.startTime ? new Date(s.startTime) : null;
          const diffMins = start && !isNaN(start.getTime()) ? Math.max(0, Math.floor((new Date() - start) / 60000)) : 0;
          durationLabel = `Đang diễn ra: ${diffMins} phút`;
        } else if (statusMapped === "upcoming") {
          const start = s.startTime ? new Date(s.startTime) : null;
          durationLabel = start && !isNaN(start.getTime()) ? `Sắp diễn ra: ${start.toLocaleString("vi-VN")}` : "Sắp diễn ra";
        } else {
          const end = s.endTime ? new Date(s.endTime) : null;
          durationLabel = end && !isNaN(end.getTime()) ? `Kết thúc: ${end.toLocaleTimeString("vi-VN")}` : "Đã kết thúc";
        }

        return {
          id: s.id,
          farmerName: s.farmerName || "Nhà vườn AgriMarket",
          farmerBrand: s.farmerBrand || s.farmerName || "Nông trại sạch địa phương",
          farmerAvatar: s.farmerAvatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
          title: s.title,
          description: s.description || "",
          status: statusMapped,
          viewers: s.viewersCount || 0,
          likes: s.heartsCount || 0,
          durationLabel: durationLabel,
          products: parsedProducts
        };
      });

      setSessions(formatted);
    } catch (err) {
      console.error("Lỗi đọc dữ liệu livestream từ backend:", err);
      setSessions([]);
    }
  };

  const showToast = (message, type = "success", title = null) => {
    // Clear existing timers
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (toastCountdownRef.current) clearInterval(toastCountdownRef.current);

    const autoCloseSecs = type === "success" ? 5 : 0; // success auto-closes, error stays until user closes
    setToast({ message, type, title });
    setToastCountdown(autoCloseSecs);

    if (autoCloseSecs > 0) {
      let remaining = autoCloseSecs;
      toastCountdownRef.current = setInterval(() => {
        remaining -= 1;
        setToastCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(toastCountdownRef.current);
        }
      }, 1000);
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
        setToastCountdown(0);
      }, autoCloseSecs * 1000);
    }
  };

  const closeToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (toastCountdownRef.current) clearInterval(toastCountdownRef.current);
    setToast(null);
    setToastCountdown(0);
  };

  const handleTerminateStream = async (sessionId, brandName, reason) => {
    try {
      await apiClient.post(`/api/livestreams/admin/${sessionId}/terminate`, { reason });
      showToast(
        `Phiên livestream của nhà vườn ${brandName} đã bị dừng và gỡ khỏi danh sách trực tiếp.`,
        "success",
        "Chấm dứt thành công"
      );
      loadSessions();
    } catch (err) {
      console.error("Lỗi chấm dứt livestream:", err);
      const errorMsg = typeof err.response?.data === "string"
        ? err.response.data
        : (err.response?.data?.message || err.response?.data?.error || err.message || "Đã xảy ra lỗi không xác định, vui lòng thử lại.");
      showToast(
        errorMsg,
        "error",
        "Thao tác thất bại"
      );
    }
  };

  // Search filter, status filter, and sorting logic
  const filteredSessions = useMemo(() => {
    // Search query match
    let result = sessions.filter((s) => {
      const keyword = searchQuery.toLowerCase();
      const brand = s.farmerBrand || "";
      const title = s.title || "";
      const name = s.farmerName || "";
      return (
        brand.toLowerCase().includes(keyword) ||
        title.toLowerCase().includes(keyword) ||
        name.toLowerCase().includes(keyword)
      );
    });

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Sort order
    if (sortBy === "viewers") {
      result = [...result].sort((a, b) => b.viewers - a.viewers);
    } else if (sortBy === "likes") {
      result = [...result].sort((a, b) => b.likes - a.likes);
    } else if (sortBy === "newest") {
      const getTimestamp = (session) => {
        if (session.id && typeof session.id === "string" && session.id.startsWith("custom-live-")) {
          return parseInt(session.id.replace("custom-live-", "")) || 0;
        }
        // Baseline mock sessions (older, preserve their relative order)
        if (session.id === "FRM-8892") return 1004;
        if (session.id === "FRM-1024") return 1003;
        if (session.id === "FRM-2231") return 1002;
        if (session.id === "FRM-4451") return 1001;
        return 0;
      };
      result = [...result].sort((a, b) => getTimestamp(b) - getTimestamp(a));
    }

    return result;
  }, [sessions, searchQuery, statusFilter, sortBy]);

  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentSessions = filteredSessions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSessions.length / ITEMS_PER_PAGE);

  // Derived stats counters
  const liveCount = useMemo(() => {
    return sessions.filter((s) => s.status === "live").length;
  }, [sessions]);

  const totalViewers = useMemo(() => {
    return sessions.reduce((acc, curr) => acc + (curr.viewers || 0), 0);
  }, [sessions]);

  const getFullImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
    return `${API_BASE_URL}/${cleanUrl}`;
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  return (
    <div className="admin-layout">
      {/* Centered Status Modal Overlay */}
      {toast && (
        <div className="lm-modal-overlay" onClick={closeToast}>
          <div
            className={`lm-modal-card lm-modal-${toast.type}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div className="lm-modal-top-bar" />

            {/* Icon circle */}
            <div className="lm-modal-icon-circle">
              {toast.type === "success" && (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
              {toast.type === "error" && (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              )}
              {toast.type === "info" && (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>

            {/* Text content */}
            <h2 className="lm-modal-title">
              {toast.title || (toast.type === "success" ? "Thành công" : toast.type === "error" ? "Thất bại" : "Thông báo")}
            </h2>
            <p className="lm-modal-message">{toast.message}</p>

            {/* Countdown row (only for success) */}
            {toast.type === "success" && toastCountdown > 0 && (
              <div className="lm-modal-countdown">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Tự đóng sau <strong>{toastCountdown}</strong> giây</span>
              </div>
            )}

            {/* Close / action button */}
            <button className="lm-modal-btn" onClick={closeToast}>
              {toast.type === "success" ? "Đóng" : "Thử lại"}
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <AdminSidebar activeItem="livestreams" showToast={showToast} />

      {/* Main Content Container */}
      <div className="admin-main-container">
        <AdminHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Tìm kiếm livestream..."
          showToast={showToast}
        />

        {/* Page Body */}
        <main className="admin-page-body">
          <div className="live-management-container">
            {/* Page Header */}
            <div className="live-management-header">
              <div className="live-header-left">
                <h2>Quản lý Livestream</h2>
                <p>Giám sát và kiểm soát các hoạt động bán hàng trực tiếp trên hệ thống.</p>
              </div>
              <div className="live-header-right-wrapper" style={{ position: "relative" }}>
                <button
                  className={`btn-filter-trigger ${isFilterDropdownOpen ? "active" : ""}`}
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                >
                  <SlidersHorizontal size={16} />
                  Bộ lọc {(statusFilter !== "all" || sortBy !== "default") && "•"}
                </button>

                {isFilterDropdownOpen && (
                  <div className="filter-dropdown-menu">
                    <div className="filter-group">
                      <p className="filter-group-title">Trạng thái</p>
                      <label className="filter-option">
                        <input
                          type="radio"
                          name="statusFilter"
                          checked={statusFilter === "all"}
                          onChange={() => setStatusFilter("all")}
                        />
                        <span>Tất cả</span>
                      </label>
                      <label className="filter-option">
                        <input
                          type="radio"
                          name="statusFilter"
                          checked={statusFilter === "live"}
                          onChange={() => setStatusFilter("live")}
                        />
                        <span>Đang trực tiếp (LIVE)</span>
                      </label>
                      <label className="filter-option">
                        <input
                          type="radio"
                          name="statusFilter"
                          checked={statusFilter === "ended"}
                          onChange={() => setStatusFilter("ended")}
                        />
                        <span>Đã kết thúc (ENDED)</span>
                      </label>
                    </div>

                    <div className="filter-group" style={{ marginTop: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
                      <p className="filter-group-title">Sắp xếp theo</p>
                      <label className="filter-option">
                        <input
                          type="radio"
                          name="sortBy"
                          checked={sortBy === "default"}
                          onChange={() => setSortBy("default")}
                        />
                        <span>Mặc định</span>
                      </label>
                      <label className="filter-option">
                        <input
                          type="radio"
                          name="sortBy"
                          checked={sortBy === "newest"}
                          onChange={() => setSortBy("newest")}
                        />
                        <span>Mới nhất</span>
                      </label>
                      <label className="filter-option">
                        <input
                          type="radio"
                          name="sortBy"
                          checked={sortBy === "viewers"}
                          onChange={() => setSortBy("viewers")}
                        />
                        <span>Lượt xem nhiều nhất</span>
                      </label>
                      <label className="filter-option">
                        <input
                          type="radio"
                          name="sortBy"
                          checked={sortBy === "likes"}
                          onChange={() => setSortBy("likes")}
                        />
                        <span>Lượt thích nhiều nhất</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Cards - Compact Layout (Only 2 cards based on requests) */}
            <div className="live-stats-grid">
              <div className="live-stat-card">
                <div className="live-stat-header">
                  <span className="live-stat-title">Đang trực tiếp</span>
                  <div className="live-stat-icon-wrapper live">
                    <Radio size={20} />
                  </div>
                </div>
                <h2 className="live-stat-value">{liveCount}</h2>
                <span className="live-stat-badge green">+12%</span>
              </div>

              <div className="live-stat-card">
                <div className="live-stat-header">
                  <span className="live-stat-title">Tổng người xem</span>
                  <div className="live-stat-icon-wrapper viewers">
                    <Users size={20} />
                  </div>
                </div>
                <h2 className="live-stat-value">
                  {totalViewers >= 1000 ? `${(totalViewers / 1000).toFixed(1)}k` : totalViewers.toLocaleString()}
                </h2>
                <span className="live-stat-badge blue">Ổn định</span>
              </div>
            </div>

            {/* Stream Table */}
            <div className="live-table-card">
              <table className="live-data-table">
                <thead>
                  <tr>
                    <th>Nhà vườn (Farmer)</th>
                    <th>Tiêu đề (Title)</th>
                    <th>Số người xem</th>
                    <th>Lượt thích</th>
                    <th>Sản phẩm</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSessions.length > 0 ? (
                    currentSessions.map((session) => (
                      <tr key={session.id}>
                        {/* Farmer column */}
                        <td>
                          <div className="live-farmer-cell">
                            <img
                              src={getFullImageUrl(session.farmerAvatar)}
                              alt={session.farmerBrand}
                              className="live-farmer-avatar"
                            />
                            <div>
                              <p className="live-farmer-brand">{session.farmerBrand}</p>
                              <p className="live-farmer-id">ID: {session.id}</p>
                            </div>
                          </div>
                        </td>

                        {/* Title column */}
                        <td>
                          <div className="live-title-cell">
                            <p className="live-stream-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {session.title}
                              {alerts.filter(a => Number(a.livestreamId) === Number(session.id)).length > 0 && (
                                <span
                                  className="ai-alert-badge"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMonitorInitialTab("alerts");
                                    setMonitoringSession(session);
                                  }}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    backgroundColor: "#fee2e2",
                                    color: "#b91c1c",
                                    fontSize: "0.7rem",
                                    fontWeight: "700",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    border: "1px solid #fca5a5",
                                    cursor: "pointer"
                                  }}
                                  title="AI phát hiện dấu hiệu vi phạm. Click để xem chi tiết."
                                >
                                  <AlertTriangle size={12} style={{ color: "#ef4444" }} /> AI ALERT
                                </span>
                              )}
                            </p>
                            <p className="live-stream-subtitle">
                              {session.status === "live" ? (
                                <>
                                  <span className="status-dot-blink" style={{ marginRight: "4px" }}></span>
                                  {session.durationLabel}
                                </>
                              ) : (
                                session.durationLabel
                              )}
                            </p>
                          </div>
                        </td>

                        {/* Viewers count column */}
                        <td>
                          <span className="live-viewers-count">
                            <Eye size={16} style={{ color: "#64748b" }} />
                            {session.viewers >= 1000
                              ? `${(session.viewers / 1000).toFixed(1)}k`
                              : session.viewers.toLocaleString()}
                          </span>
                        </td>

                        {/* Likes column */}
                        <td>
                          <span className="live-likes-count">
                            <Heart size={16} style={{ color: "#ef4444", fill: "#ef4444" }} />
                            {session.likes >= 1000
                              ? `${(session.likes / 1000).toFixed(1)}k`
                              : session.likes.toLocaleString()}
                          </span>
                        </td>

                        {/* Products overlapping thumbnails column */}
                        <td>
                          <div className="overlapping-products" onClick={() => setViewingProductsList(session.products)}>
                            {session.products && session.products.slice(0, 3).map((prod) => (
                              <img
                                key={prod.id}
                                src={getFullImageUrl(prod.imageUrl)}
                                alt={prod.name}
                                className="overlapping-product-img"
                                title={prod.name}
                              />
                            ))}
                            {session.products && session.products.length > 3 && (
                              <div className="more-products-badge" title="Xem tất cả">
                                +{session.products.length - 3}
                              </div>
                            )}
                            {(!session.products || session.products.length === 0) && (
                              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Không có</span>
                            )}
                          </div>
                        </td>



                        {/* Actions column */}
                        <td>
                          {session.status === "live" ? (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                className="btn-monitor-stream"
                                onClick={() => {
                                  setMonitorInitialTab("comments");
                                  setMonitoringSession(session);
                                }}
                              >
                                <Video size={14} /> Giám sát
                              </button>
                              <button
                                className="btn-terminate-stream"
                                onClick={() => setTerminatingSession({ id: session.id, brand: session.farmerBrand })}
                              >
                                Chấm dứt
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: "600" }}>---</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>
                        Không tìm thấy phiên livestream nào phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Table pagination footer */}
              <div className="live-pagination-bar">
                <span>
                  Hiển thị {filteredSessions.length === 0 ? 0 : indexOfFirstItem + 1}-
                  {Math.min(indexOfLastItem, filteredSessions.length)} trên tổng số {sessions.length} phiên live
                </span>
                <div className="live-page-buttons">
                  <button
                    className="page-btn"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    &lt;
                  </button>

                  {totalPages > 0 && Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      className={`page-btn ${currentPage === pageNumber ? "active" : ""}`}
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    className="page-btn"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Viewing Products Details Modal */}
      {viewingProductsList && (
        <div className="products-modal-overlay" onClick={() => setViewingProductsList(null)}>
          <div className="products-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="products-modal-header">
              <h3 style={{ display: "flex", alignItems: "center", gap: "6px" }}><Package size={18} /> Danh sách sản phẩm live</h3>
              <button className="btn-close-modal" onClick={() => setViewingProductsList(null)}>
                &times;
              </button>
            </div>
            <div className="products-modal-body">
              <div className="modal-product-list">
                {viewingProductsList.map((prod) => (
                  <div key={prod.id} className="modal-product-row">
                    <div className="modal-product-info">
                      <img src={getFullImageUrl(prod.imageUrl)} alt={prod.name} className="modal-product-img" />
                      <div>
                        <p className="modal-product-name">
                          {prod.name}
                          {prod.discountPercent > 0 && (
                            <span className="modal-product-badge-discount">
                              -{prod.discountPercent}%
                            </span>
                          )}
                        </p>
                        <p className="modal-product-price">
                          Đơn vị tính: {prod.unit || "kg"}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontWeight: "700", color: "#10b981", margin: 0 }}>
                        {prod.price.toLocaleString()}đ
                      </p>
                      {prod.discountPercent > 0 && (
                        <p style={{ fontSize: "0.75rem", textDecoration: "line-through", color: "#94a3b8", margin: 0 }}>
                          {prod.originalPrice.toLocaleString()}đ
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Terminate Confirmation Dialog Modal */}
      {terminatingSession && (
        <div className="confirm-modal-overlay" onClick={() => {
          setTerminatingSession(null);
          setBanReason("Vi phạm tiêu chuẩn cộng đồng về nội dung quảng cáo hoặc chất lượng sản phẩm.");
          setCustomBanReason("");
        }}>
          <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-icon">
              <AlertTriangle size={28} />
            </div>
            <h3>Xác nhận buộc dừng</h3>
            <p>
              Bạn có chắc chắn muốn buộc <strong>DỪNG</strong> phiên livestream của nhà vườn <strong>{terminatingSession.brand}</strong> không?
            </p>

            <div style={{ marginTop: "16px", marginBottom: "16px", textAlign: "left", width: "100%" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", display: "block", marginBottom: "6px" }}>
                Lý do buộc dừng:
              </label>
              <select
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                  color: "#1e293b",
                  outline: "none",
                  backgroundColor: "#ffffff",
                  cursor: "pointer"
                }}
              >
                <option value="Vi phạm tiêu chuẩn cộng đồng về nội dung quảng cáo hoặc chất lượng sản phẩm.">
                  Vi phạm tiêu chuẩn quảng cáo / chất lượng
                </option>
                <option value="Bán hàng nông sản không rõ nguồn gốc xuất xứ hoặc hàng giả.">
                  Hàng hóa không rõ nguồn gốc xuất xứ
                </option>
                <option value="Sử dụng ngôn từ, hình ảnh hoặc hành vi không chuẩn mực trên sóng.">
                  Ngôn từ / hành vi không chuẩn mực
                </option>
                <option value="Phát livestream tĩnh hoặc phát lại video cũ không được phép.">
                  Livestream tĩnh / Phát lại video cũ
                </option>
                <option value="custom">Nhập lý do khác...</option>
              </select>

              {banReason === "custom" && (
                <textarea
                  placeholder="Nhập lý do chi tiết..."
                  value={customBanReason}
                  onChange={(e) => setCustomBanReason(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.9rem",
                    color: "#1e293b",
                    outline: "none",
                    minHeight: "60px",
                    resize: "vertical"
                  }}
                />
              )}
            </div>

            <div className="confirm-modal-actions">
              <button className="btn-confirm-cancel" onClick={() => {
                setTerminatingSession(null);
                setBanReason("Vi phạm tiêu chuẩn cộng đồng về nội dung quảng cáo hoặc chất lượng sản phẩm.");
                setCustomBanReason("");
              }}>
                Hủy bỏ
              </button>
              <button
                className="btn-confirm-submit"
                onClick={() => {
                  const finalReason = banReason === "custom" ? (customBanReason.trim() || "Lý do vi phạm khác") : banReason;
                  handleTerminateStream(terminatingSession.id, terminatingSession.brand, finalReason);
                  setTerminatingSession(null);
                  setBanReason("Vi phạm tiêu chuẩn cộng đồng về nội dung quảng cáo hoặc chất lượng sản phẩm.");
                  setCustomBanReason("");
                }}
              >
                Đồng ý dừng
              </button>
            </div>
          </div>
        </div>
      )}

      {monitoringSession && (
        <AdminMonitorModal
          session={monitoringSession}
          initialTab={monitorInitialTab}
          onClose={() => setMonitoringSession(null)}
          onOpenTerminateModal={(sessionInfo) => {
            setMonitoringSession(null);
            setTerminatingSession(sessionInfo);
          }}
        />
      )}
    </div>
  );
}

// SUB-COMPONENT: REAL-TIME ADMIN MONITOR MODAL (OPTION 1)
function AdminMonitorModal({ session, onClose, onOpenTerminateModal, initialTab }) {
  const [comments, setComments] = useState([]);
  const [heartsCount, setHeartsCount] = useState(session.likes || 0);
  const [viewersCount, setViewersCount] = useState(session.viewers || 0);
  const [pinnedComment, setPinnedComment] = useState(null);
  const videoRef = React.useRef(null);
  const rtcRef = React.useRef({ client: null, videoTrack: null, audioTrack: null });
  const [loading, setLoading] = useState(true);

  const [sessionAlerts, setSessionAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab || "comments"); // "comments" | "alerts"

  // Poll comments, stats and alerts every 3 seconds
  useEffect(() => {
    let active = true;
    const fetchStatsAndComments = async () => {
      try {
        // Fetch comments
        const commRes = await apiClient.get(`/api/livestreams/${session.id}/comments`);
        if (active) setComments(commRes.data);

        // Fetch live details for current stats
        const detRes = await apiClient.get(`/api/livestreams/${session.id}`);
        if (active) {
          setHeartsCount(detRes.data.heartsCount || 0);
          setViewersCount(detRes.data.viewersCount || 0);
          setPinnedComment(detRes.data.pinnedComment || null);
        }

        // Fetch AI alerts
        const alertsRes = await apiClient.get(`/api/moderation/livestreams/${session.id}/alerts`);
        if (active) {
          setSessionAlerts(prev => {
            if (alertsRes.data && alertsRes.data.length > prev.length && prev.length > 0) {
              setActiveTab("alerts");
            }
            return alertsRes.data || [];
          });
        }
      } catch (err) {
        console.error("Lỗi đồng bộ dữ liệu giám sát:", err);
      }
    };

    fetchStatsAndComments();
    const interval = setInterval(fetchStatsAndComments, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [session.id]);

  // Connect to Agora channel
  useEffect(() => {
    let client;
    let active = true;
    const initAgora = async () => {
      try {
        setLoading(true);
        const detRes = await apiClient.get(`/api/livestreams/${session.id}`);
        if (!active) return;
        const { appId, token, channelName } = detRes.data;

        if (!appId || !token || !channelName) {
          setLoading(false);
          return;
        }

        client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
        await client.setClientRole("audience");

        client.on("user-published", async (user, mediaType) => {
          if (!active) return;
          await client.subscribe(user, mediaType);
          if (!active) {
            client.unsubscribe(user, mediaType).catch(e => console.error(e));
            return;
          }
          if (mediaType === "video") {
            const remoteVideoTrack = user.videoTrack;
            rtcRef.current.videoTrack = remoteVideoTrack;
            if (videoRef.current) {
              remoteVideoTrack.play(videoRef.current);
            }
          }
          if (mediaType === "audio") {
            const remoteAudioTrack = user.audioTrack;
            rtcRef.current.audioTrack = remoteAudioTrack;
            remoteAudioTrack.play();
          }
        });

        await client.join(appId, channelName, token, null);
        if (!active) {
          client.leave().catch(e => console.error(e));
          return;
        }
        rtcRef.current.client = client;
        setLoading(false);
      } catch (err) {
        console.error("Lỗi Agora Monitor:", err);
        if (active) setLoading(false);
      }
    };

    initAgora();

    return () => {
      active = false;
      if (rtcRef.current.videoTrack) {
        try { rtcRef.current.videoTrack.stop(); } catch (e) { }
      }
      if (rtcRef.current.audioTrack) {
        try { rtcRef.current.audioTrack.stop(); } catch (e) { }
      }
      if (client) {
        client.leave().catch((e) => console.error(e));
      }
      rtcRef.current.client = null;
      rtcRef.current.videoTrack = null;
      rtcRef.current.audioTrack = null;
    };
  }, [session.id]);

  const getFullImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
    return `${API_BASE_URL}/${cleanUrl}`;
  };

  return (
    <div className="live-monitor-overlay">
      <div className="live-monitor-modal" style={{ width: "95vw", maxWidth: "1200px", height: "85vh", display: "flex", flexDirection: "column" }}>
        <div className="monitor-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="monitor-farmer-info">
            <img src={getFullImageUrl(session.farmerAvatar)} alt="Avatar" className="monitor-avatar" />
            <div>
              <h3>Giám sát: {session.farmerBrand}</h3>
              <p className="monitor-title">Tiêu đề: {session.title}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="btn-terminate-stream"
              style={{
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
              onClick={() => onOpenTerminateModal({ id: session.id, brand: session.farmerBrand })}
            >
              <AlertTriangle size={14} /> Buộc dừng
            </button>
            <button className="btn-close-monitor" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>

        <div className="monitor-content-grid" style={{ flex: 1, display: "grid", gridTemplateColumns: "1.2fr 1fr", overflow: "hidden" }}>
          <div className="monitor-video-area" style={{ position: "relative", backgroundColor: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {loading && <div className="monitor-loading">Đang kết nối luồng phát...</div>}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="monitor-video-player"
              style={{ width: "100%", height: "100%", objectFit: "cover", background: "#000", transform: "scaleX(-1)" }}
            ></video>
            <div className="monitor-badges">
              <span className="badge-live"><span className="dot"></span> LIVE MONITOR</span>
              <span className="badge-stats" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Users size={14} /> {viewersCount} người xem
              </span>
              <span className="badge-stats" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Heart size={14} style={{ fill: "#ef4444", color: "#ef4444" }} /> {heartsCount} Thích
              </span>
            </div>
          </div>

          <div className="monitor-comments-area" style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#fff", borderLeft: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{
              display: "flex",
              borderBottom: "1px solid #e2e8f0",
              backgroundColor: "#f1f5f9",
              flexShrink: 0
            }}>
              <button
                onClick={() => setActiveTab("comments")}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "none",
                  background: activeTab === "comments" ? "#fff" : "transparent",
                  fontWeight: activeTab === "comments" ? "700" : "500",
                  color: activeTab === "comments" ? "#0f766e" : "#475569",
                  borderBottom: activeTab === "comments" ? "3px solid #0f766e" : "none",
                  cursor: "pointer",
                  fontSize: "0.85rem"
                }}
              >
                💬 Bình luận ({comments.length})
              </button>
              <button
                onClick={() => setActiveTab("alerts")}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "none",
                  background: activeTab === "alerts" ? "#fff" : "transparent",
                  fontWeight: activeTab === "alerts" ? "700" : "500",
                  color: activeTab === "alerts" ? "#b91c1c" : "#475569",
                  borderBottom: activeTab === "alerts" ? "3px solid #b91c1c" : "none",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <AlertTriangle size={14} /> Cảnh báo AI ({sessionAlerts.length})
              </button>
            </div>

            {activeTab === "comments" ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
                {pinnedComment && (
                  <div className="monitor-pinned-chat-row" style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: "#fef3c7",
                    borderBottom: "1px solid #fcd34d",
                    padding: "8px 16px",
                    fontSize: "0.85rem",
                    color: "#78350f",
                    flexShrink: 0
                  }}>
                    <span style={{ fontWeight: "700", whiteSpace: "nowrap" }}>📌 Đã ghim:</span>
                    <span style={{ fontWeight: "600", whiteSpace: "nowrap" }}>{pinnedComment.user}:</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pinnedComment.text}
                    </span>
                  </div>
                )}
                <div className="monitor-comments-list" style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                  {comments.length > 0 ? (
                    comments.map((c) => (
                      <div key={c.id} className="monitor-comment-row">
                        <img src={getFullImageUrl(c.avatar) || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100"} alt="User" className="comment-avatar" />
                        <div className="comment-text-box">
                          <span className="comment-user">
                            {c.user}
                            {c.isHost && (
                              <span className="host-badge" style={{
                                backgroundColor: "#10b981",
                                color: "white",
                                fontSize: "0.68rem",
                                fontWeight: "700",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                marginLeft: "6px",
                                display: "inline-block"
                              }}>Chủ phòng</span>
                            )}
                          </span>
                          <p className="comment-text">{c.text}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="no-comments">Chưa có bình luận nào.</p>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                {sessionAlerts.length > 0 ? (
                  sessionAlerts.map((alert) => (
                    <div key={alert.id} style={{
                      backgroundColor: alert.status === "PENDING" ? "#fee2e2" : "#f1f5f9",
                      border: alert.status === "PENDING" ? "1px solid #fca5a5" : "1px solid #cbd5e1",
                      borderRadius: "8px",
                      padding: "12px",
                      marginBottom: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{
                          fontWeight: "700",
                          color: alert.status === "PENDING" ? "#b91c1c" : "#475569",
                          fontSize: "0.75rem",
                          textTransform: "uppercase"
                        }}>
                          ⚠️ {alert.alertType === "WEAPONS" ? "Phát hiện Vũ khí" : alert.alertType === "NUDITY" ? "Hình ảnh nhạy cảm" : alert.alertType === "TRASH_LIVE" ? "Live rác (Màn hình đen/Trống)" : "Phát ngôn vi phạm"}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                          {alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString("vi-VN") : ""}
                        </span>
                      </div>
                      {alert.alertType === "AUDIO_VIOLATION" ? (
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#1e293b", fontStyle: "italic", backgroundColor: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                          {alert.evidenceUrl}
                        </p>
                      ) : (
                        <div>
                          <p style={{ margin: "0 0 6px 0", fontSize: "0.75rem", color: "#475569" }}>Ảnh chụp bằng chứng:</p>
                          {alert.evidenceUrl && alert.evidenceUrl.startsWith("data:image") ? (
                            <img src={alert.evidenceUrl} alt="Evidence" style={{ width: "100%", borderRadius: "4px", maxHeight: "150px", objectFit: "contain", border: "1px solid #e2e8f0", backgroundColor: "#000" }} />
                          ) : (
                            <img src={getFullImageUrl(alert.evidenceUrl)} alt="Evidence" style={{ width: "100%", borderRadius: "4px", maxHeight: "150px", objectFit: "contain", border: "1px solid #e2e8f0", backgroundColor: "#000" }} />
                          )}
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        {alert.status === "PENDING" && (
                          <button
                            onClick={async () => {
                              try {
                                await apiClient.post(`/api/moderation/alerts/${alert.id}/resolve`);
                                setSessionAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, status: "RESOLVED" } : a));
                              } catch (err) {
                                console.error("Lỗi bỏ qua cảnh báo:", err);
                              }
                            }}
                            style={{
                              backgroundColor: "#fff",
                              border: "1px solid #cbd5e1",
                              color: "#475569",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              cursor: "pointer",
                              fontWeight: "600"
                            }}
                          >
                            Bỏ qua
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "32px 16px", color: "#64748b" }}>
                    <p style={{ margin: 0, fontSize: "0.85rem" }}>🟢 Không có cảnh báo vi phạm nào.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
