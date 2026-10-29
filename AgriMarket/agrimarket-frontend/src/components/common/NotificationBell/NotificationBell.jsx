import React, { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import notificationService from "../../../services/notificationService";
import apiClient from "../../../services/apiClient";
import "./NotificationBell.css";

const getNotificationBroadcastId = (n, activeStreams = []) => {
  if (n.broadcastId) return n.broadcastId;
  
  const text = `${n.title} ${n.content}`.toLowerCase();
  if (
    text.includes("đang livestream") || 
    text.includes("phiên live trực tiếp") || 
    text.includes("mở phiên live") ||
    text.includes("lên lịch") ||
    text.includes("lịch live")
  ) {
    const matchedStream = activeStreams.find(s => {
      const brand = (s.farmerBrand || "").toLowerCase();
      const name = (s.farmerName || "").toLowerCase();
      return (brand && text.includes(brand)) || (name && text.includes(name));
    });
    if (matchedStream) {
      return matchedStream.id;
    }
  }
  return null;
};

const getNotificationLink = (n, activeStreams = []) => {
  if (n.link) return n.link;
  const liveId = getNotificationBroadcastId(n, activeStreams);
  if (liveId) return `/livestream/${liveId}`;
  return null;
};

const getLinkInfo = (link) => {
  if (!link) return null;
  const l = link.toLowerCase();
  if (l.includes("/livestream")) {
    return {
      text: "Tham gia phiên live →",
      color: "#ef4444"
    };
  }
  if (l.includes("/orders") || l.includes("/order")) {
    return {
      text: "Xem chi tiết đơn hàng →",
      color: "#16a34a"
    };
  }
  return {
    text: "Xem sản phẩm →",
    color: "#16a34a"
  };
};

const NotificationBell = ({ user }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // "all" or "unread"
  const [unreadCount, setUnreadCount] = useState(0);
  const [showFullModal, setShowFullModal] = useState(false);
  const [activeStreams, setActiveStreams] = useState([]);

  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
      const unread = data.filter((n) => !n.isRead).length;
      setUnreadCount(unread);

      // Fetch active livestreams for fallback mapping
      try {
        const liveRes = await apiClient.get("/api/livestreams/active");
        setActiveStreams(liveRes.data || []);
      } catch (liveErr) {
        console.error("Lỗi khi tải livestream hoạt động:", liveErr);
      }
    } catch (error) {
      console.error("Không thể tải thông báo:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Re-fetch when opening to ensure fresh data
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (id, e, currentIsRead) => {
    e.stopPropagation();
    if (currentIsRead) return;
    try {
      await notificationService.markAsRead(id);
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      // Recalculate unread count
      setNotifications((latest) => {
        const unread = latest.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
        return latest;
      });
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái thông báo:", error);
    }
  };

  const handleItemClick = async (n) => {
    if (!n.isRead) {
      try {
        await notificationService.markAsRead(n.id);
        // Update local state
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
        );
        // Recalculate unread count
        setNotifications((latest) => {
          const unread = latest.filter((item) => !item.isRead).length;
          setUnreadCount(unread);
          return latest;
        });
      } catch (error) {
        console.error("Lỗi khi cập nhật trạng thái thông báo:", error);
      }
    }

    setIsOpen(false);
    setShowFullModal(false);

    const liveId = getNotificationBroadcastId(n, activeStreams);
    if (liveId) {
      navigate(`/livestream/${liveId}`);
      return;
    }

    if (n.link) {
      navigate(n.link);
      return;
    }

    const text = `${n.title} ${n.content}`.toLowerCase();
    if (text.includes("đơn hàng") || text.includes("giao") || text.includes("ord") || text.includes("thanh toán") || text.includes("payment")) {
      if (user && (user.role === "farmer" || user.userType === "farmer")) {
        navigate("/farmer/orders");
      } else {
        navigate("/profile/orders");
      }
    } else if (text.includes("nhà vườn") || text.includes("nông dân") || text.includes("sản phẩm") || text.includes("duyệt") || text.includes("xác minh")) {
      navigate("/farmer/dashboard");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Lỗi khi đánh dấu đọc tất cả:", error);
    }
  };

  const handleDeleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setNotifications((latest) => {
        const unread = latest.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
        return latest;
      });
    } catch (error) {
      console.error("Lỗi khi xóa thông báo:", error);
    }
  };

  // Date/Time formatter
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Vừa xong";
      if (diffMins < 60) return `${diffMins} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  };

  // Helper to determine notification type icon
  const getNotificationIconDetails = (title, content) => {
    const text = (title + " " + content).toLowerCase();
    if (text.includes("đơn hàng") || text.includes("order") || text.includes("mua bán")) {
      return {
        type: "order",
        bg: "#fffaeb",
        color: "#b45309",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        ),
      };
    } else if (text.includes("ai") || text.includes("gợi ý") || text.includes("phân tích")) {
      return {
        type: "ai",
        bg: "#f3e8ff",
        color: "#7e22ce",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.3-6.3l-.7.7M6.7 17.3l-.7.7m12.6 0l-.7-.7M6.7 6.7l-.7-.7M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"></path>
          </svg>
        ),
      };
    } else if (text.includes("voucher") || text.includes("khuyến mãi") || text.includes("giảm giá")) {
      return {
        type: "voucher",
        bg: "#fef2f2",
        color: "#b91c1c",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"></path>
            <path d="M7 10v4M12 10v4M17 10v4"></path>
          </svg>
        ),
      };
    } else {
      return {
        type: "system",
        bg: "#e8f5e9",
        color: "#1b5e20",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        ),
      };
    }
  };

  // Filtered list
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.isRead;
    return true;
  });

  return (
    <div className="bell-notification-container">
      {/* Bell Button */}
      <button
        ref={bellRef}
        className={`round-action-btn ${isOpen ? "active-bell" : ""}`}
        aria-label="Thông báo"
        onClick={handleToggleDropdown}
        style={{ position: "relative" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
      </button>

      {/* Dropdown Container */}
      {isOpen && (
        <div ref={dropdownRef} className="notification-dropdown">
          <div className="dropdown-header">
            <h3>Thông báo</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read-btn" onClick={handleMarkAllAsRead}>
                Đánh dấu tất cả là đã đọc
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="dropdown-tabs">
            <button
              className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              Tất cả
            </button>
            <button
              className={`tab-btn ${activeTab === "unread" ? "active" : ""}`}
              onClick={() => setActiveTab("unread")}
            >
              Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {/* List Scrollable */}
          <div className="notifications-list">
            {filteredNotifications.length === 0 ? (
              <div className="empty-notifications">
                <div className="empty-icon" style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}><Bell size={48} style={{ opacity: 0.5, color: "#64748b" }} /></div>
                <p>Bạn không có thông báo nào</p>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const iconDetails = getNotificationIconDetails(n.title, n.content);
                return (
                  <div
                    key={n.id}
                    className={`notification-item ${!n.isRead ? "unread" : ""}`}
                    onClick={(e) => handleMarkAsRead(n.id, e, n.isRead)}
                  >
                    {/* Left Icon */}
                    <div
                      className="item-icon-wrapper"
                      style={{ backgroundColor: iconDetails.bg, color: iconDetails.color }}
                    >
                      {iconDetails.icon}
                    </div>

                    {/* Middle Text */}
                    <div className="item-body">
                      <h4 className="item-title">{n.title}</h4>
                      <p className="item-content">{n.content}</p>
                      {(() => {
                        const resolvedLink = getNotificationLink(n, activeStreams);
                        const linkInfo = getLinkInfo(resolvedLink);
                        if (linkInfo) {
                          return (
                            <Link
                              to={resolvedLink}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleItemClick(n);
                              }}
                              style={{
                                color: linkInfo.color,
                                fontWeight: "700",
                                fontSize: "0.82rem",
                                marginTop: "4px",
                                textDecoration: "underline",
                                display: "inline-block"
                              }}
                            >
                              {linkInfo.text}
                            </Link>
                          );
                        }
                        return null;
                      })()}
                      <span className="item-time">{formatTimeAgo(n.createdAt)}</span>
                    </div>

                    {/* Right Action Trigger / Unread Dot */}
                    <div className="item-actions">
                      {!n.isRead && <span className="unread-dot"></span>}

                      <div className="action-buttons-hover">
                        {!n.isRead && (
                          <button
                            className="action-circle-btn"
                            title="Đánh dấu là đã đọc"
                            onClick={(e) => handleMarkAsRead(n.id, e, n.isRead)}
                          >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </button>
                        )}
                        <button
                          className="action-circle-btn delete-btn"
                          title="Xóa thông báo"
                          onClick={(e) => handleDeleteNotification(n.id, e)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="dropdown-footer">
            <button className="see-all-btn" onClick={() => { setIsOpen(false); navigate("/profile/notifications"); }}>
              Xem tất cả thông báo
            </button>
          </div>
        </div>
      )}

      {/* Full Details Modal */}
      {showFullModal && createPortal(
        <div className="notification-modal-overlay" onClick={() => setShowFullModal(false)}>
          <div className="notification-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Trung tâm thông báo</h2>
              <button className="close-modal-btn" onClick={() => setShowFullModal(false)}>
                &times;
              </button>
            </div>
            
            <div className="modal-tabs-header">
              <div className="modal-tabs">
                <button
                  className={`modal-tab-btn ${activeTab === "all" ? "active" : ""}`}
                  onClick={() => setActiveTab("all")}
                >
                  Tất cả thông báo ({notifications.length})
                </button>
                <button
                  className={`modal-tab-btn ${activeTab === "unread" ? "active" : ""}`}
                  onClick={() => setActiveTab("unread")}
                >
                  Chưa đọc ({unreadCount})
                </button>
              </div>
              {unreadCount > 0 && (
                <button className="modal-mark-read-btn" onClick={handleMarkAllAsRead}>
                  Đánh dấu tất cả là đã đọc
                </button>
              )}
            </div>

            <div className="modal-list-body">
              {filteredNotifications.length === 0 ? (
                <div className="modal-empty">
                  <span style={{ display: "flex", justifyContent: "center" }}><Bell size={48} style={{ opacity: 0.5, color: "#64748b", marginBottom: "12px" }} /></span>
                  <p>Không có thông báo nào trong danh mục này.</p>
                </div>
              ) : (
                filteredNotifications.map((n) => {
                  const iconDetails = getNotificationIconDetails(n.title, n.content);
                  return (
                    <div
                      key={n.id}
                      className={`modal-item ${!n.isRead ? "unread" : ""}`}
                      onClick={(e) => handleMarkAsRead(n.id, e, n.isRead)}
                    >
                      <div
                        className="modal-icon-wrapper"
                        style={{ backgroundColor: iconDetails.bg, color: iconDetails.color }}
                      >
                        {iconDetails.icon}
                      </div>

                       <div className="modal-item-body">
                        <h3>{n.title}</h3>
                        <p>{n.content}</p>
                        {(() => {
                          const resolvedLink = getNotificationLink(n, activeStreams);
                          const linkInfo = getLinkInfo(resolvedLink);
                          if (linkInfo) {
                            return (
                              <Link
                                to={resolvedLink}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleItemClick(n);
                                }}
                                style={{
                                  color: linkInfo.color,
                                  fontWeight: "700",
                                  fontSize: "0.85rem",
                                  marginTop: "4px",
                                  textDecoration: "underline",
                                  display: "inline-block"
                                }}
                              >
                                {linkInfo.text}
                              </Link>
                            );
                          }
                          return null;
                        })()}
                        <span className="modal-item-time">{formatTimeAgo(n.createdAt)}</span>
                      </div>

                      <div className="modal-item-actions">
                        {!n.isRead && <span className="modal-unread-dot"></span>}
                        {!n.isRead && (
                          <button
                            className="modal-action-btn"
                            title="Đánh dấu đã đọc"
                            onClick={(e) => handleMarkAsRead(n.id, e, n.isRead)}
                          >
                            Đánh dấu đã đọc
                          </button>
                        )}
                        <button
                          className="modal-action-btn delete"
                          title="Xóa"
                          onClick={(e) => handleDeleteNotification(n.id, e)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationBell;
