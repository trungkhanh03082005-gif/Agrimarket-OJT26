import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  Tractor, 
  Store, 
  MessageSquare, 
  Tv, 
  LogOut, 
  ArrowRight,
  Tag,
  Star
} from "lucide-react";
import profileService from "../../../services/profileService";
import authService from "../../../services/authService";
import apiClient from "../../../services/apiClient";
import "./FarmerDashboard.css";

const TABS = [
  { id: "overview",     label: "Tổng quan",          icon: <LayoutDashboard size={18} />, path: "/farmer/dashboard" },
  { id: "products",     label: "Quản lý sản phẩm",    icon: <Package size={18} />, path: "/farmer/products" },
  { id: "orders",       label: "Đơn hàng của tôi",   icon: <Tractor size={18} />, path: "/farmer/orders" },
  { id: "reviews",      label: "Đánh giá đơn hàng",   icon: <Star size={18} />, path: "/farmer/reviews" },
  { id: "farm-profile", label: "Thông tin trang trại", icon: <Store size={18} />, path: "/farmer/farm-profile" },
  { id: "chat",         label: "Tin nhắn khách hàng", icon: <MessageSquare size={18} />, path: "/farmer/chat" },
  { id: "livestream",   label: "Quản lý Livestream", icon: <Tv size={18} />, path: "/farmer/livestream" },
  { id: "promotions",   label: "Khuyến mãi",         icon: <Tag size={18} />, path: "/farmer/promotions" },
];

const FarmerPiPOverlay = ({ onClose }) => {
  const navigate = useNavigate();
  const videoRef = React.useRef(null);
  const commentsEndRef = React.useRef(null);
  const [comments, setComments] = useState(window.agoraActiveHostSession?.chatMessages || []);

  useEffect(() => {
    const session = window.agoraActiveHostSession;
    if (!session || !session.localVideoTrack) return;

    session.localVideoTrack.play(videoRef.current);

    const interval = setInterval(async () => {
      try {
        const commentsRes = await apiClient.get(`/api/livestreams/${session.liveSessionId}/comments`);
        const dbMsgs = commentsRes.data.map(c => ({
          id: `comment-${c.id}`,
          user: c.user || "Khán giả",
          text: c.text,
          isHost: c.isHost
        }));
        const updated = [
          { id: "sys-1", type: "system", text: "Hệ thống: Kết nối livestream ổn định. Phiên live bắt đầu phát sóng!" },
          ...dbMsgs
        ];
        setComments(updated);
        session.chatMessages = updated;
      } catch (err) {
        console.error("Lỗi đồng bộ comments trong PiP:", err);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      if (session && session.localVideoTrack) {
        session.localVideoTrack.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  const handleMaximize = () => {
    navigate("/farmer/livestream");
    onClose();
  };

  const handleStopLive = async () => {
    const session = window.agoraActiveHostSession;
    if (!session) return;

    if (!window.confirm("Bạn có chắc chắn muốn kết thúc phiên livestream này?")) return;

    try {
      await apiClient.post(`/api/livestreams/${session.liveSessionId}/end`);
      
      if (session.localAudioTrack) {
        session.localAudioTrack.stop();
        session.localAudioTrack.close();
      }
      if (session.localVideoTrack) {
        session.localVideoTrack.stop();
        session.localVideoTrack.close();
      }
      if (session.client) {
        await session.client.leave();
      }

      try {
        localStorage.removeItem("active_farmer_livestream_session");
        const storedLives = JSON.parse(localStorage.getItem("farmer_custom_livestreams")) || [];
        const updatedLives = storedLives.map((s) => {
          if (s.id === session.liveSessionId) {
            return { ...s, status: "replay" };
          }
          return s;
        });
        localStorage.setItem("farmer_custom_livestreams", JSON.stringify(updatedLives));
      } catch (err) {
        console.error(err);
      }

      window.agoraActiveHostSession = null;
      onClose();
      alert("Đã kết thúc livestream thành công!");
    } catch (e) {
      console.error(e);
      alert("Lỗi khi kết thúc livestream: " + e.message);
    }
  };

  const session = window.agoraActiveHostSession;
  if (!session) return null;

  return (
    <div className="pip-overlay-container">
      <div className="pip-header">
        <div className="pip-header-left">
          <span className="pip-live-dot"></span>
          <h4 className="pip-header-title">{session.title}</h4>
        </div>
        <div className="pip-header-actions">
          <button className="pip-btn-action" onClick={handleMaximize} title="Phóng to">
            🗖
          </button>
        </div>
      </div>

      <div className="pip-video-viewport">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
        />
      </div>

      <div className="pip-comments-area">
        {comments.map((msg) => (
          <div key={msg.id} className="pip-comment-item">
            <span className="pip-comment-user" style={{ color: msg.isHost ? "#10b981" : "#40916c" }}>
              {msg.user || (msg.type === "system" ? "Hệ thống" : "Người xem")}:
            </span>
            <span className="pip-comment-text">{msg.text}</span>
          </div>
        ))}
        <div ref={commentsEndRef} />
      </div>

      <div className="pip-footer">
        <button className="pip-btn-maximize" onClick={handleMaximize}>
          📡 Trở lại Live
        </button>
        <button className="pip-btn-stop" onClick={handleStopLive}>
          🛑 Tắt Live
        </button>
      </div>
    </div>
  );
};

export const FarmerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSafeNavigate = (targetPath, isLogout = false) => {
    if (window.agoraActiveHostSession && window.agoraActiveHostSession.streamState === "live") {
      const confirmLeave = window.confirm(
        "Cảnh báo: Nếu bạn thoát ra khỏi trang quản lý nhà vườn, phiên livestream hiện tại sẽ bị kết thúc. Bạn có chắc chắn muốn rời đi?"
      );
      if (!confirmLeave) return;

      const endSession = async () => {
        const session = window.agoraActiveHostSession;
        try {
          await apiClient.post(`/api/livestreams/${session.liveSessionId}/end`);
          
          if (session.localAudioTrack) {
            session.localAudioTrack.stop();
            session.localAudioTrack.close();
          }
          if (session.localVideoTrack) {
            session.localVideoTrack.stop();
            session.localVideoTrack.close();
          }
          if (session.client) {
            await session.client.leave();
          }

          localStorage.removeItem("active_farmer_livestream_session");
          const storedLives = JSON.parse(localStorage.getItem("farmer_custom_livestreams")) || [];
          const updatedLives = storedLives.map((s) => {
            if (s.id === session.liveSessionId) {
              return { ...s, status: "replay" };
            }
            return s;
          });
          localStorage.setItem("farmer_custom_livestreams", JSON.stringify(updatedLives));

          window.agoraActiveHostSession = null;
          setShowPiP(false);

          if (isLogout) {
            authService.logout();
          }
          navigate(targetPath);
        } catch (err) {
          console.error("Lỗi khi kết thúc live tự động:", err);
          window.agoraActiveHostSession = null;
          setShowPiP(false);
          if (isLogout) {
            authService.logout();
          }
          navigate(targetPath);
        }
      };
      endSession();
    } else {
      if (isLogout) {
        authService.logout();
      }
      navigate(targetPath);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (window.agoraActiveHostSession && window.agoraActiveHostSession.streamState === "live") {
        e.preventDefault();
        e.returnValue = "Cảnh báo: Nếu bạn tải lại hoặc thoát trang, phiên livestream hiện tại sẽ bị kết thúc.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Active user details
  const [currentUser, setCurrentUser] = useState(null);
  const [farmerProfile, setFarmerProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [farmName, setFarmName] = useState("");

  // Check Auth & Fetch Profile
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role?.toLowerCase() !== "farmer") {
      navigate("/farmer/register");
      return;
    }
    setCurrentUser(user);

    const loadProfile = async () => {
      try {
        const profileData = await profileService.getCurrentProfile();
        if (profileData) {
          setFarmerProfile(profileData);
          setFarmName(profileData.farmName || "");
          setAvatarUrl(profileData.avatarUrl || "");
        }
      } catch (err) {
        console.error("Lỗi khi tải hồ sơ nhà vườn:", err);
      }
    };
    loadProfile();
  }, [navigate]);

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith("/farmer/products")) return "products";
    if (path.startsWith("/farmer/orders")) return "orders";
    if (path.startsWith("/farmer/reviews")) return "reviews";
    if (path.startsWith("/farmer/farm-profile")) return "farm-profile";
    if (path.startsWith("/farmer/chat")) return "chat";
    if (path.startsWith("/farmer/livestream")) return "livestream";
    if (path.startsWith("/farmer/promotions")) return "promotions";
    return "overview";
  };

  const currentTab = getActiveTab();

  const handleTabChange = (path) => {
    navigate(path);
  };

  const isOrderDetailPath = location.pathname.startsWith("/farmer/orders/orderdetail");

  const [showPiP, setShowPiP] = useState(false);

  useEffect(() => {
    if (window.agoraActiveHostSession && location.pathname !== "/farmer/livestream") {
      setShowPiP(true);
    } else {
      setShowPiP(false);
    }

    const handleShowPiP = () => {
      if (location.pathname !== "/farmer/livestream") {
        setShowPiP(true);
      }
    };
    const handleHidePiP = () => {
      setShowPiP(false);
    };

    window.addEventListener("agora_pip_show", handleShowPiP);
    window.addEventListener("agora_pip_hide", handleHidePiP);

    return () => {
      window.removeEventListener("agora_pip_show", handleShowPiP);
      window.removeEventListener("agora_pip_hide", handleHidePiP);
    };
  }, [location.pathname]);

  return (
    <div className="farmer-dashboard-root">
      {/* SIDEBAR */}
      <aside className="fd-sidebar">
        <div className="fd-brand" onClick={() => handleSafeNavigate("/")} style={{ cursor: "pointer" }}>
          <div className="logo-icon-wrap">
            <svg className="logo-tractor" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="18" r="2"></circle>
              <circle cx="18" cy="18" r="2"></circle>
              <path d="M7 16h11v-2H9v-3h7V9H9V6H7v10z"></path>
              <path d="M16 9h3l2 3v4"></path>
            </svg>
          </div>
          <span className="brand-text">AgriMarket</span>
        </div>

        <div className="fd-user-meta">
          <div className="fd-user-avatar-wrap">
            <div className="fd-user-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Farm avatar" />
              ) : (
                <div className="avatar-fallback" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <Tractor size={20} />
                </div>
              )}
            </div>
          </div>
          <div className="fd-user-text">
            <p className="greeting">Xin chào,</p>
            <p className="farm-title">{farmName || currentUser?.fullName || "Nhà vườn"}</p>
            <span className="badge-role">Đối tác nông dân</span>
          </div>
        </div>

        <nav className="fd-nav-menu">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`fd-nav-item ${currentTab === tab.id ? "active" : ""}`}
              onClick={() => handleTabChange(tab.path)}
            >
              <span className="icon">{tab.icon}</span>
              <span className="label">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="fd-sidebar-footer">
          <button className="fd-btn-logout" onClick={() => handleSafeNavigate("/login", true)}>
            <span className="btn-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <LogOut size={16} />
            </span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className={`fd-main-viewport ${location.pathname === "/farmer/chat" ? "has-chat-active" : ""}`}>
        {!isOrderDetailPath && (
          <header className="fd-topbar-header">
            <div className="topbar-left">
              <h1 className="viewport-title">
                {TABS.find(t => t.id === currentTab)?.label}
              </h1>
              <p className="viewport-subtitle">
                {currentTab === "overview" && "Chỉ số hoạt động nông trại và doanh số bán hàng."}
                {currentTab === "products" && "Đăng bán sản phẩm, theo dõi phê duyệt và điều chỉnh giá."}
                {currentTab === "orders" && "Nhận đơn hàng mới từ người tiêu dùng và cập nhật giao vận."}
                {currentTab === "reviews" && "Xem nhận xét, đánh giá chất lượng sản phẩm và trải nghiệm từ người tiêu dùng."}
                {currentTab === "farm-profile" && "Hoàn thiện hồ sơ trang trại giúp tăng độ tin cậy."}
                {currentTab === "chat" && "Xem và trả lời các tin nhắn tư vấn từ người tiêu dùng."}
                {currentTab === "livestream" && "Thiết lập, chuẩn bị thiết bị phát sóng và tương tác trực tiếp với khách hàng."}
                {currentTab === "promotions" && "Quản lý các chương trình khuyến mãi và mã giảm giá để thúc đẩy doanh số."}
              </p>
            </div>

            <div className="topbar-right">
              <div className="user-profile-badge" onClick={() => handleSafeNavigate("/profile")} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span>Hồ sơ cá nhân</span>
                <span className="arrow" style={{ display: "inline-flex", alignItems: "center" }}><ArrowRight size={16} /></span>
              </div>
            </div>
          </header>
        )}

        <div className={isOrderDetailPath ? "" : location.pathname === "/farmer/chat" ? "fd-viewport-content fd-viewport-chat" : "fd-viewport-content"}>
          <Outlet context={{ farmerProfile, currentUser }} />
          {showPiP && <FarmerPiPOverlay onClose={() => setShowPiP(false)} />}
        </div>
      </main>
    </div>
  );
};

export default FarmerLayout;


