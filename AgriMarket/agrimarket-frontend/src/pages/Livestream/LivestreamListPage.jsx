import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/common/Header/Header";
import apiClient from "../../services/apiClient";
import "./LivestreamListPage.css";



const LivestreamListPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // 'all', 'live', 'upcoming', 'replay', 'reminders'
  const [subscribedIds, setSubscribedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("subscribed_lives")) || [];
    } catch (e) {
      return [];
    }
  });
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  useEffect(() => {
    localStorage.setItem("subscribed_lives", JSON.stringify(subscribedIds));
  }, [subscribedIds]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3000);
  };

  const [backendLives, setBackendLives] = useState([]);

  useEffect(() => {
    const fetchBackendLives = async () => {
      try {
        const res = await apiClient.get("/api/livestreams/active");
        setBackendLives(res.data);
        
        // Clean up ended/obsolete livestream subscriptions
        const activeIds = res.data.map(l => l.id.toString());
        setSubscribedIds(prev => {
          const filtered = prev.filter(id => activeIds.includes(id.toString()));
          return filtered;
        });
      } catch (err) {
        console.error("Lỗi khi tải livestream từ backend:", err);
      }
    };
    fetchBackendLives();
  }, []);

  // Map backend streams to UI format
  const mappedLives = backendLives.map((live) => {
    const isLive = live.status === "active" || live.status === "live";
    const startTimeStr = live.startTime ? new Date(live.startTime).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit"
    }) + " - " + new Date(live.startTime).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }) : "Chưa lên lịch";

    return {
      id: live.id.toString(),
      farmerName: live.farmerName,
      farmerBrand: live.farmerBrand || "Nông trại sạch địa phương",
      farmerAvatar: live.farmerAvatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
      title: live.title,
      description: live.description || "Chào mừng bạn đến với phiên livestream nông sản của chúng tôi!",
      status: live.status === "active" ? "live" : live.status,
      viewers: live.status === "active" ? `${live.viewersCount} đang xem` : "Sắp diễn ra",
      thumbnail: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800",
      tags: ["Trực tiếp tại vườn", "Nông sản sạch"],
      scheduledTime: isLive ? "Đang phát trực tiếp" : startTimeStr
    };
  });

  // Handle subscription for upcoming livestreams
  const handleSubscribe = (id, farmerName, e) => {
    e.stopPropagation(); // Prevent card click navigation
    if (subscribedIds.includes(id)) {
      setSubscribedIds(prev => prev.filter(item => item !== id));
      showToast(`Đã hủy nhận thông báo cho phiên live của nhà vườn ${farmerName}.`, "info");
    } else {
      setSubscribedIds(prev => [...prev, id]);
      showToast(`Đăng ký thành công! Bạn sẽ nhận được thông báo 15 phút trước khi phiên live của ${farmerName} bắt đầu.`, "success");
    }
  };

  // Navigate to livestream detail page
  const handleCardClick = (id) => {
    navigate(`/livestream/${id}`);
  };

  // Filter & search logic
  const filteredLivestreams = mappedLives.filter((live) => {
    const matchesSearch = 
      live.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      live.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      live.farmerBrand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      live.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    if (activeFilter === "all") return matchesSearch;
    if (activeFilter === "reminders") return subscribedIds.includes(live.id) && matchesSearch;
    return live.status === activeFilter && matchesSearch;
  });

  return (
    <div className="livestream-list-root">
      {/* App Header */}
      <Header activeTab="live" />

      <div className="livestream-list-container">
        {/* Banner Section */}
        <section className="live-list-hero">
          <div className="hero-content">
            <span className="hero-badge">AGRIMARKET LIVE</span>
            <h1 className="hero-title">Kết Nối Trực Tiếp Với Nông Dân Việt</h1>
            <p className="hero-subtitle">
              Xem quy trình trồng trọt thực tế, giao lưu đặt câu hỏi và mua nông sản tươi sạch ngay tại vườn với ưu đãi độc quyền.
            </p>
          </div>
          <div className="hero-decorations">
            <div className="decor-circle circle-1"></div>
            <div className="decor-circle circle-2"></div>
          </div>
        </section>

        {/* Filters and Search Bar Section */}
        <div className="filters-search-wrapper">
          {/* Status Tabs */}
          <div className="filter-tabs">
            <button 
              className={`filter-tab-btn ${activeFilter === "all" ? "active" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              Tất cả
            </button>
            <button 
              className={`filter-tab-btn ${activeFilter === "live" ? "active" : ""}`}
              onClick={() => setActiveFilter("live")}
            >
              <span className="live-pulse-dot"></span> Đang Trực Tiếp
            </button>
            <button 
              className={`filter-tab-btn ${activeFilter === "upcoming" ? "active" : ""}`}
              onClick={() => setActiveFilter("upcoming")}
            >
              Sắp Diễn Ra
            </button>

            <button 
              className={`filter-tab-btn ${activeFilter === "reminders" ? "active" : ""}`}
              onClick={() => setActiveFilter("reminders")}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ marginRight: "4px" }}>
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
              Nhắc Hẹn Phiên Live
              {subscribedIds.length > 0 && (
                <span className="reminder-count-badge">{subscribedIds.length}</span>
              )}
            </button>
          </div>

          {/* Search Box */}
          <div className="live-search-box-container">
            <svg className="live-search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder="Tìm phiên live, nhà vườn, sản phẩm..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="live-search-input-field"
            />
            {searchTerm && (
              <button className="live-clear-search-btn" onClick={() => setSearchTerm("")}>&times;</button>
            )}
          </div>
        </div>

        {/* Grid List of Livestreams */}
        {filteredLivestreams.length > 0 ? (
          <div className="livestreams-grid">
            {filteredLivestreams.map((live) => (
              <div 
                key={live.id} 
                className={`live-session-card ${live.status}`}
                onClick={() => handleCardClick(live.id)}
              >
                {/* Thumbnail Header */}
                <div className="card-media-wrapper">
                  <img src={live.thumbnail} alt={live.title} className="card-thumbnail-img" />
                  
                  {/* Status Overlay Badges */}
                  <div className="media-overlay-badges">
                    {live.status === "live" && (
                      <span className="badge-live-status active-live">
                        <span className="live-dot-pulse"></span>
                        TRỰC TIẾP
                      </span>
                    )}
                    {live.status === "upcoming" && (
                      <span className="badge-live-status scheduled-live">
                        SẮP LÊN SÓNG
                      </span>
                    )}
                    {live.status === "replay" && (
                      <span className="badge-live-status playback-live">
                        PHÁT LẠI
                      </span>
                    )}

                    <span className="badge-viewer-count">
                      {live.status === "live" && (
                        <svg className="eye-icon" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                      )}
                      {live.viewers}
                    </span>
                  </div>

                  {live.status === "upcoming" && live.scheduledTime && (
                    <div className="scheduled-time-overlay">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span>Lên sóng: {live.scheduledTime}</span>
                    </div>
                  )}

                  {/* Play overlay button on hover */}
                  <div className="card-hover-play-btn">
                    <div className="play-btn-circle">
                      {live.status === "upcoming" ? (
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.5 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Info Content */}
                <div className="card-content-body">
                  {/* Farmer Details */}
                  <div className="card-farmer-profile">
                    <img src={live.farmerAvatar} alt={live.farmerName} className="farmer-profile-avatar" />
                    <div className="farmer-profile-info">
                      <h4 className="farmer-brand-name">
                        {live.farmerBrand}
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" className="verified-icon-check" title="Nhà vườn uy tín">
                          <circle cx="12" cy="12" r="10" fill="#0095F6" />
                          <polyline points="9 12 11 14 15 10" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </h4>
                      <p className="farmer-real-name">Nông dân: {live.farmerName}</p>
                    </div>
                  </div>

                  {/* Stream Title, Date-Time, and Description */}
                  <h3 className="card-stream-title">{live.title}</h3>
                  
                  <div className="card-stream-date-time">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "6px" }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>{live.scheduledTime}</span>
                  </div>

                  <p className="card-stream-desc">{live.description}</p>

                  {/* Tags */}
                  <div className="card-tags-list">
                    {live.tags.map((tag, index) => (
                      <span key={index} className="tag-pill-item">#{tag}</span>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <div className="card-footer-action">
                    {live.status === "live" && (
                      <button className="cta-action-btn btn-go-live-session">
                        Xem Ngay
                      </button>
                    )}
                    {live.status === "upcoming" && (
                      <button 
                        className={`cta-action-btn btn-notify-session ${subscribedIds.includes(live.id) ? "subscribed" : ""}`}
                        onClick={(e) => handleSubscribe(live.id, live.farmerName, e)}
                      >
                        {subscribedIds.includes(live.id) ? (
                          <>
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ marginRight: "4px" }}>
                              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                            </svg>
                            Đã Đăng Ký
                          </>
                        ) : (
                          "Nhận Thông Báo"
                        )}
                      </button>
                    )}

                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-lives-found">
            {activeFilter === "reminders" ? (
              <>
                <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
                <h3>Chưa có nhắc hẹn nào</h3>
                <p>Hãy bấm vào nút "Nhận thông báo" tại các phiên live "Sắp diễn ra" để lưu danh sách nhắc hẹn nhé!</p>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                  <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2"></line>
                </svg>
                <h3>Không tìm thấy phiên livestream nào</h3>
                <p>Hãy thử tìm kiếm với từ khóa khác hoặc quay lại các tab lọc ở trên nhé!</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      {toast.show && (
        <div className="toast-container">
          <div className={`custom-toast ${toast.type}`}>
            <span className="custom-toast-icon">
              {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "i"}
            </span>
            <span className="custom-toast-message">{toast.message}</span>
            <button className="custom-toast-close" onClick={() => setToast({ show: false })}>×</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LivestreamListPage;
