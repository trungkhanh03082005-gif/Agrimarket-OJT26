// src/pages/Profile/Notifications.jsx

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    RotateCw,
    Check,
    BellOff,
    Package,
    CreditCard,
    Tractor,
    Bell,
    ChevronRight
} from "lucide-react";
import ProfileSidebar from "../../components/profile/ProfileSidebar";
import useNotifications from "../../hooks/useNotifications";
import apiClient from "../../services/apiClient";
import "./Notifications.css";

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

const fallbackProfile = {
    fullName: "Người dùng",
    email: "",
    phone: "",
    avatarUrl: "",
    role: "customer",
};

const getStoredProfile = () => {
    try {
        /*
          TODO BACKEND:
          Nếu dự án của bạn đang lưu user bằng key khác trong localStorage
          thì sửa lại ở đây.
    
          Ví dụ:
          localStorage.getItem("currentUser")
          localStorage.getItem("authUser")
        */
        const savedProfile =
            localStorage.getItem("farmconnect_user") ||
            localStorage.getItem("profile") ||
            localStorage.getItem("user");

        if (!savedProfile) {
            return fallbackProfile;
        }

        const parsedProfile = JSON.parse(savedProfile);

        return {
            ...fallbackProfile,
            ...parsedProfile,
            role:
                parsedProfile?.role?.name ||
                parsedProfile?.role ||
                parsedProfile?.userType ||
                fallbackProfile.role,
        };
    } catch (error) {
        console.error("Không thể đọc thông tin người dùng:", error);
        return fallbackProfile;
    }
};

const getNotificationType = (notification) => {
    /*
      TODO BACKEND:
      Nếu backend có cột type, ví dụ:
      type: "ORDER"
      type: "PAYMENT"
      type: "SYSTEM"
      type: "FARMER"
  
      thì nên dùng trực tiếp notification.type thay vì tự đoán theo title/content.
  
      Ví dụ:
      return notification.type?.toLowerCase();
    */

    const text = `${notification.title} ${notification.content}`.toLowerCase();

    if (
        text.includes("đơn hàng") ||
        text.includes("giao") ||
        text.includes("ord")
    ) {
        return "order";
    }

    if (text.includes("thanh toán") || text.includes("payment")) {
        return "payment";
    }

    if (
        text.includes("nhà vườn") ||
        text.includes("nông dân") ||
        text.includes("sản phẩm") ||
        text.includes("duyệt") ||
        text.includes("xác minh")
    ) {
        return "farmer";
    }

    return "system";
};

const getTypeInfo = (type) => {
    switch (type) {
        case "order":
            return {
                icon: <Package size={20} color="#006b46" />,
                label: "Đơn hàng",
                className: "type-order",
            };

        case "payment":
            return {
                icon: <CreditCard size={20} color="#3730a3" />,
                label: "Thanh toán",
                className: "type-payment",
            };

        case "farmer":
            return {
                icon: <Tractor size={20} color="#a16207" />,
                label: "Nhà vườn",
                className: "type-farmer",
            };

        default:
            return {
                icon: <Bell size={20} color="#475569" />,
                label: "Thông báo hệ thống",
                className: "type-system",
            };
    }
};

const notificationTabs = [
    { value: "all", label: "Tất cả" },
    { value: "unread", label: "Chưa đọc" },
    { value: "order", label: "Đơn hàng" },
    { value: "payment", label: "Thanh toán" },
    { value: "farmer", label: "Nhà vườn" },
    { value: "system", label: "Thông báo hệ thống" },
];

const formatTime = (dateString) => {
    if (!dateString) {
        return "";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const now = new Date();
    const diffMs = now - date;

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
        return "Vừa xong";
    }

    if (diffMinutes < 60) {
        return `${diffMinutes} phút trước`;
    }

    if (diffHours < 24) {
        return `${diffHours} giờ trước`;
    }

    if (diffDays === 1) {
        return "Hôm qua";
    }

    return `${diffDays} ngày trước`;
};

const Notifications = () => {
    const navigate = useNavigate();
    const profile = getStoredProfile();

    const {
        notifications,
        unreadCount,
        loadingNotifications,
        markAsRead,
        markAllAsRead,
        loadNotifications,
    } = useNotifications();

    const [activeTab, setActiveTab] = useState("all");
    const [activeStreams, setActiveStreams] = useState([]);

    useEffect(() => {
        loadNotifications();
        const fetchActiveStreams = async () => {
            try {
                const liveRes = await apiClient.get("/api/livestreams/active");
                setActiveStreams(liveRes.data || []);
            } catch (err) {
                console.error("Lỗi khi tải livestream hoạt động:", err);
            }
        };
        fetchActiveStreams();
    }, []);

    const filteredNotifications = useMemo(() => {
        if (activeTab === "all") {
            return notifications;
        }

        if (activeTab === "unread") {
            return notifications.filter((item) => !item.isRead);
        }

        return notifications.filter(
            (item) => getNotificationType(item) === activeTab
        );
    }, [notifications, activeTab]);

    const countByType = (type) => {
        return notifications.filter((item) => getNotificationType(item) === type)
            .length;
    };

    const handleNotificationClick = async (notification, skipNavigate = false) => {
        if (!notification.isRead) {
            await markAsRead(notification.id);
        }
        if (!skipNavigate) {
            handleViewDetail(notification);
        }
    };

    const handleViewDetail = async (notification) => {
        const type = getNotificationType(notification);

        if (!notification.isRead) {
            await markAsRead(notification.id);
        }

        const liveId = getNotificationBroadcastId(notification, activeStreams);
        if (liveId) {
            navigate(`/livestream/${liveId}`);
            return;
        }

        if (notification.link) {
            navigate(notification.link);
            return;
        }

        if (type === "order" || type === "payment") {
            if (profile.role === "farmer") {
                navigate("/farmer/orders");
            } else {
                navigate("/profile/orders");
            }
            return;
        }

        if (type === "farmer") {
            navigate("/farmer/dashboard");
            return;
        }
    };

    return (
        <div className="notifications-page">
            <ProfileSidebar profile={profile} />

            <main className="notifications-main">
                <section className="notifications-header">
                    <div>
                        <p className="notifications-eyebrow">Trung tâm thông báo</p>
                        <h1>Thông báo của bạn</h1>
                        <p>
                            Theo dõi đơn hàng, thanh toán, trạng thái nhà vườn và các cập
                            nhật mới từ hệ thống AgriMarket.
                        </p>
                    </div>

                    <div className="notifications-header-actions">
                        <button
                            className="reload-button"
                            onClick={loadNotifications}
                            disabled={loadingNotifications}
                            style={{ display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "center" }}
                        >
                            <RotateCw size={16} />
                            Tải lại
                        </button>

                        <button
                            className="mark-all-button"
                            onClick={markAllAsRead}
                            disabled={unreadCount === 0}
                            style={{ display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "center" }}
                        >
                            <Check size={16} />
                            Đánh dấu tất cả đã đọc
                        </button>
                    </div>
                </section>

                <section className="notifications-panel">
                    <div className="notifications-tabs">
                        {notificationTabs.map((tab) => (
                            <button
                                key={tab.value}
                                className={activeTab === tab.value ? "active" : ""}
                                onClick={() => setActiveTab(tab.value)}
                            >
                                {tab.label}
                                <span>
                                    {tab.value === "all"
                                        ? notifications.length
                                        : tab.value === "unread"
                                            ? unreadCount
                                            : countByType(tab.value)}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="notifications-list">
                        {loadingNotifications ? (
                            <div className="notification-loading">
                                <div className="loading-spinner"></div>
                                <p>Đang tải thông báo...</p>
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="empty-notification">
                                <div className="empty-icon">
                                    <BellOff size={32} color="#597066" />
                                </div>
                                <h3>Chưa có thông báo</h3>
                                <p>
                                    Khi Admin tạo thông báo hoặc hệ thống phát sinh cập nhật mới,
                                    thông báo sẽ hiển thị tại đây.
                                </p>
                            </div>
                        ) : (
                            filteredNotifications.map((notification) => {
                                const type = getNotificationType(notification);
                                const typeInfo = getTypeInfo(type);

                                return (
                                    <article
                                        key={notification.id}
                                        className={`notification-card ${!notification.isRead ? "unread" : ""
                                            }`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className={`notification-icon ${typeInfo.className}`}>
                                            {typeInfo.icon}
                                        </div>

                                        <div className="notification-body">
                                            <div className="notification-title-row">
                                                <h3>{notification.title}</h3>

                                                <div className="notification-meta">
                                                    <span>{formatTime(notification.createdAt)}</span>

                                                    {!notification.isRead && (
                                                        <span className="unread-dot"></span>
                                                    )}
                                                </div>
                                            </div>

                                            <p>{notification.content}</p>
                                            {(() => {
                                                const resolvedLink = getNotificationLink(notification, activeStreams);
                                                const linkInfo = getLinkInfo(resolvedLink);
                                                if (linkInfo) {
                                                    return (
                                                        <Link
                                                            to={resolvedLink}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleNotificationClick(notification, true);
                                                            }}
                                                            style={{
                                                                color: linkInfo.color,
                                                                fontWeight: "700",
                                                                fontSize: "0.88rem",
                                                                marginTop: "6px",
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

                                            <div className="notification-footer">
                                                <span
                                                    className={`notification-type ${typeInfo.className}`}
                                                >
                                                    {typeInfo.label}
                                                </span>

                                                {(type === "order" ||
                                                    type === "payment" ||
                                                    type === "farmer" ||
                                                    notification.link) && (
                                                        <button
                                                            className="notification-detail-button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleViewDetail(notification);
                                                            }}
                                                            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                                                        >
                                                            Xem chi tiết <ChevronRight size={14} />
                                                        </button>
                                                    )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Notifications;