// src/pages/Admin/Notifications/AdminNotifications.jsx

import { useEffect, useMemo, useState, useRef } from "react";
import { Calendar, Bell, Search, Package, CreditCard, Tractor, Gift } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import adminNotificationService from "../../../services/adminNotificationService";
import authService from "../../../services/authService";
import AdminSidebar from "../../../components/common/Sidebar/AdminSidebar";
import AdminHeader from "../../../components/common/Header/AdminHeader";
import "../AdminStyles.css";
import "./AdminNotifications.css";

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
                        <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>Giờ gửi:</span>
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

const notificationTypes = [
    {
        value: "system",
        label: "Thông báo hệ thống",
        icon: <Bell size={16} />,
    },
    {
        value: "order",
        label: "Thông báo đơn hàng",
        icon: <Package size={16} />,
    },
    {
        value: "payment",
        label: "Thông báo thanh toán",
        icon: <CreditCard size={16} />,
    },
    {
        value: "farmer",
        label: "Thông báo nhà vườn",
        icon: <Tractor size={16} />,
    },
    {
        value: "promotion",
        label: "Thông báo khuyến mãi",
        icon: <Gift size={16} />,
    },
];

const audienceOptions = [
    {
        value: "all",
        label: "Tất cả người dùng",
        description: "Customer, Farmer và các tài khoản hợp lệ trong hệ thống",
    },
    {
        value: "customer",
        label: "Chỉ khách hàng",
        description: "Các tài khoản mua nông sản",
    },
    {
        value: "farmer",
        label: "Chỉ nhà vườn",
        description: "Các tài khoản đã đăng ký làm nông dân / nhà vườn",
    },
    {
        value: "partner",
        label: "Đơn vị vận chuyển",
        description: "Các tài khoản shipper hoặc transport partner",
    },
    {
        value: "single",
        label: "Gửi riêng 1 user",
        description: "Gửi thông báo tới một người dùng cụ thể",
    },
];

const channelOptions = [
    {
        value: "in_app",
        label: "Thông báo trong hệ thống",
    },
    {
        value: "email",
        label: "Email",
    },
    {
        value: "push",
        label: "Push notification",
    },
];

const initialForm = {
    title: "",
    content: "",
    notificationType: "system",
    targetAudience: "all",
    channels: ["in_app"],
    sendMode: "now",
    scheduledAt: "",
    targetUserId: "",
    targetUserType: "",
};

const getAudienceLabel = (value) => {
    return audienceOptions.find((item) => item.value === value)?.label || value;
};

const getTypeInfo = (value) => {
    return (
        notificationTypes.find((item) => item.value === value) ||
        notificationTypes[0]
    );
};

const formatDateTime = (dateString) => {
    if (!dateString) {
        return "-";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const AdminNotifications = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [form, setForm] = useState(initialForm);
    const [users, setUsers] = useState([]);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);

    const handleToggleUser = (user) => {
        setSelectedUsers((prev) => {
            const exists = prev.some((u) => u.id === user.id && u.type === user.type);
            if (exists) {
                return prev.filter((u) => !(u.id === user.id && u.type === user.type));
            } else {
                return [...prev, user];
            }
        });
    };

    const filteredUsers = useMemo(() => {
        if (!userSearchQuery.trim()) {
            return users;
        }
        const q = userSearchQuery.toLowerCase();
        return users.filter(u =>
            String(u.id).includes(q) ||
            u.fullName.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.extraInfo && u.extraInfo.toLowerCase().includes(q)) ||
            u.type.toLowerCase().includes(q)
        );
    }, [users, userSearchQuery]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showUserDropdown && !event.target.closest(".single-user-selector-container")) {
                setShowUserDropdown(false);
            }
            if (showTypeDropdown && !event.target.closest(".custom-type-selector-container")) {
                setShowTypeDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showUserDropdown]);
    const [stats, setStats] = useState({
        totalSent: 0,
        scheduled: 0,
        failed: 0,
        openRate: 0,
    });
    const [recentBroadcasts, setRecentBroadcasts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingPage, setLoadingPage] = useState(true);
    const [message, setMessage] = useState(null);
    const [toastMessage, setToastMessage] = useState("");

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 3000);
    };

    const getFullImageUrl = (url) => {
        if (!url) return "";
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
            return url;
        }
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
        const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
        return `${API_BASE_URL}/${cleanUrl}`;
    };

    const filteredBroadcasts = useMemo(() => {
        if (!searchQuery.trim()) {
            return recentBroadcasts;
        }
        const query = searchQuery.toLowerCase();
        return recentBroadcasts.filter(
            (item) =>
                item.title.toLowerCase().includes(query) ||
                item.content.toLowerCase().includes(query)
        );
    }, [recentBroadcasts, searchQuery]);

    const selectedTypeInfo = useMemo(() => {
        return getTypeInfo(form.notificationType);
    }, [form.notificationType]);

    const isFormValid = useMemo(() => {
        if (!form.title.trim()) {
            return false;
        }

        if (!form.content.trim()) {
            return false;
        }

        if (form.channels.length === 0) {
            return false;
        }

        if (form.sendMode === "schedule" && !form.scheduledAt) {
            return false;
        }

        if (form.targetAudience === "single" && selectedUsers.length === 0) {
            return false;
        }

        return true;
    }, [form, selectedUsers]);

    useEffect(() => {
        const user = authService.getCurrentUser();
        setCurrentUser(user);
        loadAdminNotificationData();
    }, []);

    const loadAdminNotificationData = async () => {
        setLoadingPage(true);

        const [statsData, broadcastsData, usersData] = await Promise.all([
            adminNotificationService.getNotificationStats(),
            adminNotificationService.getRecentBroadcasts(),
            adminNotificationService.getSimplifiedUsers(),
        ]);

        setStats(statsData);
        setRecentBroadcasts(broadcastsData);
        setUsers(usersData || []);
        setLoadingPage(false);
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleChannelChange = (channelValue) => {
        setForm((prev) => {
            const isChecked = prev.channels.includes(channelValue);

            return {
                ...prev,
                channels: isChecked
                    ? prev.channels.filter((item) => item !== channelValue)
                    : [...prev.channels, channelValue],
            };
        });
    };

    const handleSubmit = async (sendMode) => {
        if (!isFormValid) {
            setMessage({
                type: "error",
                text: "Vui lòng nhập đầy đủ tiêu đề, nội dung và chọn ít nhất một kênh gửi.",
            });
            return;
        }

        setLoading(true);
        setMessage(null);

        const payload = {
            title: form.title.trim(),
            content: form.content.trim(),
            notificationType: form.notificationType,
            targetAudience: form.targetAudience,
            channels: form.channels,
            sendMode,
            scheduledAt: sendMode === "schedule" ? form.scheduledAt : null,
            targetUsers: form.targetAudience === "single"
                ? selectedUsers.map(u => `${u.type}:${u.id}`).join(",")
                : null
        };

        const result = await adminNotificationService.createNotification(payload);

        setLoading(false);

        if (!result.success) {
            setMessage({
                type: "error",
                text: result.message,
            });
            return;
        }

        setMessage({
            type: "success",
            text:
                sendMode === "draft"
                    ? "Đã lưu bản nháp thông báo."
                    : sendMode === "schedule"
                        ? "Đã lên lịch gửi thông báo."
                        : "Đã gửi thông báo thành công.",
        });

        setForm(initialForm);
        setSelectedUsers([]);
        setUserSearchQuery("");

        /*
          TODO BACKEND:
          Khi backend đã lưu thông báo, gọi lại API để cập nhật thống kê và bảng gần đây.
        */
        loadAdminNotificationData();
    };

    const handleLogout = () => {
        authService.logout();
        navigate("/login");
    };

    return (
        <div className="admin-layout">
            <AdminSidebar activeItem="notifications" showToast={showToast} />

            {/* Main Content Area */}
            <div className="admin-main-container">
                {/* Header */}
                <AdminHeader
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchPlaceholder="Tìm kiếm thông báo..."
                    showToast={showToast}
                />

                {/* Page Body */}
                <main className="admin-page-body">
                    <section className="admin-notifications-header">
                        <div>
                            <p className="admin-eyebrow">AgriMarket Admin</p>
                            <h1>Quản lý thông báo hệ thống</h1>
                            <p>
                                Tạo và gửi thông báo đến khách hàng, nhà vườn hoặc toàn bộ người
                                dùng trong hệ thống.
                            </p>
                        </div>

                        <button
                            className="admin-refresh-button"
                            onClick={loadAdminNotificationData}
                            disabled={loadingPage}
                        >
                            ↻ Tải lại
                        </button>
                    </section>

                    <section className="admin-notification-stats">
                        <div className="admin-stat-card">
                            <span className="stat-icon green">➤</span>
                            <div>
                                <p>Tổng đã gửi</p>
                                <strong>{stats.totalSent}</strong>
                            </div>
                        </div>

                        <div className="admin-stat-card">
                            <span className="stat-icon blue">◷</span>
                            <div>
                                <p>Đã lên lịch</p>
                                <strong>{stats.scheduled}</strong>
                            </div>
                        </div>

                        <div className="admin-stat-card">
                            <span className="stat-icon red">!</span>
                            <div>
                                <p>Gửi thất bại</p>
                                <strong>{stats.failed}</strong>
                            </div>
                        </div>

                        <div className="admin-stat-card">
                            <span className="stat-icon gray">◉</span>
                            <div>
                                <p>Tỷ lệ đã đọc</p>
                                <strong>{stats.openRate}%</strong>
                            </div>
                        </div>
                    </section>

                    <section className="admin-notification-content-grid">
                        <div className="create-notification-card">
                            <div className="card-title-row">
                                <div>
                                    <h2>✍ Tạo thông báo</h2>
                                    <p>Nhập nội dung và chọn nhóm người nhận phù hợp.</p>
                                </div>
                            </div>

                            {message && (
                                <div className={`admin-form-message ${message.type}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="notification-form-grid">
                                <div className="form-group">
                                    <label>Tiêu đề thông báo *</label>
                                    <input
                                        name="title"
                                        value={form.title}
                                        onChange={handleChange}
                                        placeholder="Ví dụ: Bảo trì hệ thống"
                                    />
                                </div>

                                <div className="form-group custom-type-selector-container" style={{ position: "relative" }}>
                                    <label>Loại thông báo *</label>
                                    <div
                                        className="searchable-dropdown-trigger"
                                        onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                    >
                                        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span style={{ display: "inline-flex", color: "#1B5E20" }}>
                                                {selectedTypeInfo.icon}
                                            </span>
                                            <span>{selectedTypeInfo.label}</span>
                                        </span>
                                        <svg className="dropdown-chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: "transform 0.2s", transform: showTypeDropdown ? "rotate(180deg)" : "none" }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>

                                    {showTypeDropdown && (
                                        <div className="searchable-dropdown-menu" style={{ width: "100%", zIndex: 110 }}>
                                            <div className="searchable-dropdown-list" style={{ maxHeight: "250px", overflowY: "auto" }}>
                                                {notificationTypes.map((type) => (
                                                    <div
                                                        key={type.value}
                                                        className={`searchable-type-item ${form.notificationType === type.value ? "selected" : ""}`}
                                                        onClick={() => {
                                                            setForm(prev => ({ ...prev, notificationType: type.value }));
                                                            setShowTypeDropdown(false);
                                                        }}
                                                    >
                                                        <span style={{ display: "inline-flex" }}>
                                                            {type.icon}
                                                        </span>
                                                        <span>{type.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Nội dung thông báo *</label>
                                <textarea
                                    name="content"
                                    value={form.content}
                                    onChange={handleChange}
                                    placeholder="Nhập nội dung thông báo sẽ gửi đến người dùng..."
                                    rows={7}
                                />
                            </div>

                            <div className="target-channel-grid">
                                <div className="form-section">
                                    <h3>Nhóm người nhận</h3>

                                    <div className="option-list">
                                        {audienceOptions.map((audience) => (
                                            <label key={audience.value} className="radio-option">
                                                <input
                                                    type="radio"
                                                    name="targetAudience"
                                                    value={audience.value}
                                                    checked={form.targetAudience === audience.value}
                                                    onChange={handleChange}
                                                />

                                                <span>
                                                    <strong>{audience.label}</strong>
                                                    <small>{audience.description}</small>
                                                </span>
                                            </label>
                                        ))}
                                    </div>

                                    {form.targetAudience === "single" && (
                                        <div className="single-user-selector-container">
                                            <label>
                                                Chọn một hoặc nhiều người nhận cụ thể *
                                            </label>
                                            <div
                                                className="searchable-dropdown-trigger"
                                                onClick={() => setShowUserDropdown(!showUserDropdown)}
                                            >
                                                {selectedUsers.length > 0 ? (
                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", width: "90%" }}>
                                                        {selectedUsers.map(u => (
                                                            <span
                                                                key={`${u.type}-${u.id}`}
                                                                className={`dropdown-selected-pill ${u.type}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleToggleUser(u);
                                                                }}
                                                            >
                                                                {u.fullName}
                                                                <span style={{ marginLeft: "4px", color: "inherit", fontWeight: "bold" }}>×</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: "#888", fontSize: "14px" }}>
                                                        Chọn người dùng từ danh sách...
                                                    </span>
                                                )}
                                                <span style={{ fontSize: "12px", color: "#888" }}>▼</span>
                                            </div>

                                            {showUserDropdown && (
                                                <div className="searchable-dropdown-menu">
                                                    <input
                                                        type="text"
                                                        placeholder="Nhập tên, email hoặc ID để tìm kiếm..."
                                                        value={userSearchQuery}
                                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="searchable-dropdown-search-input"
                                                        autoFocus
                                                    />
                                                    <div className="searchable-user-list-wrapper">
                                                        {filteredUsers.length === 0 ? (
                                                            <div style={{ padding: "12px", textAlign: "center", color: "#888", fontSize: "14px" }}>
                                                                Không tìm thấy người dùng nào
                                                            </div>
                                                        ) : (
                                                            filteredUsers.map((u) => {
                                                                const isChecked = selectedUsers.some(su => su.id === u.id && su.type === u.type);
                                                                return (
                                                                    <div
                                                                        key={`${u.type}-${u.id}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleToggleUser(u);
                                                                        }}
                                                                        className="searchable-user-item"
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            readOnly
                                                                        />
                                                                        <div style={{ flex: 1 }}>
                                                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                                                                                <strong>{u.fullName}</strong>
                                                                                <span style={{
                                                                                    fontSize: "11px",
                                                                                    padding: "2px 6px",
                                                                                    borderRadius: "4px",
                                                                                    backgroundColor: u.type === "farmer" ? "#eef9f1" : u.type === "customer" ? "#e8f4fd" : "#f1f1f1",
                                                                                    color: u.type === "farmer" ? "#2e7d32" : u.type === "customer" ? "#1565c0" : "#616161",
                                                                                    fontWeight: "600"
                                                                                }}>
                                                                                    {u.type === "farmer" ? "NHÀ VƯỜN" : u.type === "customer" ? "KHÁCH HÀNG" : "VẬN CHUYỂN"}
                                                                                </span>
                                                                            </div>
                                                                            <div style={{ color: "#666", fontSize: "12px" }}>
                                                                                Email: {u.email} | ID: {u.id}
                                                                                {u.type === "farmer" && u.extraInfo && ` | Tên farm: ${u.extraInfo}`}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="form-section">
                                    <h3>Kênh gửi</h3>

                                    <div className="option-list">
                                        {channelOptions.map((channel) => (
                                            <label key={channel.value} className="checkbox-option">
                                                <input
                                                    type="checkbox"
                                                    checked={form.channels.includes(channel.value)}
                                                    onChange={() => handleChannelChange(channel.value)}
                                                />

                                                <span>{channel.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="schedule-box">
                                <div>
                                    <h3>Thời gian gửi</h3>
                                    <p>Chọn gửi ngay, lưu nháp hoặc lên lịch gửi sau.</p>
                                </div>

                                <div className="send-mode-buttons">
                                    <button
                                        type="button"
                                        className={form.sendMode === "now" ? "active" : ""}
                                        onClick={() =>
                                            setForm((prev) => ({ ...prev, sendMode: "now" }))
                                        }
                                    >
                                        Gửi ngay
                                    </button>

                                    <button
                                        type="button"
                                        className={form.sendMode === "schedule" ? "active" : ""}
                                        onClick={() =>
                                            setForm((prev) => ({ ...prev, sendMode: "schedule" }))
                                        }
                                    >
                                        Lên lịch
                                    </button>
                                </div>
                            </div>

                            {form.sendMode === "schedule" && (
                                <div className="form-group">
                                    <label>Thời gian gửi *</label>
                                    <PopoverDateTimePicker
                                        value={form.scheduledAt}
                                        onChange={(val) =>
                                            setForm((prev) => ({ ...prev, scheduledAt: val }))
                                        }
                                        minDate={new Date()}
                                    />
                                </div>
                            )}

                            <div className="form-actions">
                                <button
                                    className="secondary-button"
                                    type="button"
                                    disabled={loading}
                                    onClick={() => handleSubmit("draft")}
                                >
                                    Lưu nháp
                                </button>

                                <button
                                    className="outline-button"
                                    type="button"
                                    disabled={loading || form.sendMode !== "schedule"}
                                    onClick={() => handleSubmit("schedule")}
                                >
                                    Lên lịch gửi
                                </button>

                                <button
                                    className="primary-button"
                                    type="button"
                                    disabled={loading || !isFormValid}
                                    onClick={() => handleSubmit("now")}
                                >
                                    {loading ? "Đang xử lý..." : "➤ Gửi thông báo"}
                                </button>
                            </div>
                        </div>

                        <aside className="notification-preview-card">
                            <p className="preview-label">Xem trước</p>

                            <div className="phone-preview">
                                <div className="phone-status">
                                    <span>9:41</span>
                                    <span>● ● ●</span>
                                </div>

                                <div className="phone-header">AgriMarket</div>

                                <div className="phone-notification">
                                    <div className="phone-icon">{selectedTypeInfo.icon}</div>

                                    <div>
                                        <h4>{form.title || "Tiêu đề thông báo"}</h4>
                                        <p>
                                            {form.content ||
                                                "Nội dung thông báo sẽ được hiển thị tại đây..."}
                                        </p>
                                        <span>{getAudienceLabel(form.targetAudience)}</span>
                                    </div>
                                </div>

                                <div className="phone-placeholder"></div>
                                <div className="phone-placeholder small"></div>
                            </div>

                            <div className="preview-info">
                                <div>
                                    <span>Loại</span>
                                    <strong>{selectedTypeInfo.label}</strong>
                                </div>

                                <div>
                                    <span>Người nhận</span>
                                    <strong>{getAudienceLabel(form.targetAudience)}</strong>
                                </div>

                                <div>
                                    <span>Kênh gửi</span>
                                    <strong>{form.channels.length}</strong>
                                </div>
                            </div>
                        </aside>
                    </section>

                    <section className="recent-broadcasts-card">
                        <div className="recent-header">
                            <div>
                                <h2>Thông báo gần đây</h2>
                                <p>Danh sách các thông báo Admin đã tạo trong hệ thống.</p>
                            </div>
                        </div>

                        <div className="recent-table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Tiêu đề</th>
                                        <th>Nhóm nhận</th>
                                        <th>Thời gian gửi</th>
                                        <th>Trạng thái</th>
                                        <th>Tỷ lệ đọc</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {loadingPage ? (
                                        <tr>
                                            <td colSpan="5" className="empty-table">
                                                Đang tải dữ liệu...
                                            </td>
                                        </tr>
                                    ) : filteredBroadcasts.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="empty-table">
                                                {searchQuery ? "Không tìm thấy thông báo phù hợp." : "Chưa có thông báo nào. Khi backend hoàn thành và Admin tạo thông báo, dữ liệu sẽ hiển thị tại đây."}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBroadcasts.map((item) => (
                                            <tr key={item.id}>
                                                <td>
                                                    <strong>{item.title}</strong>
                                                    <small>{getTypeInfo(item.notificationType).label}</small>
                                                </td>

                                                <td>{getAudienceLabel(item.targetAudience)}</td>

                                                <td>{formatDateTime(item.sentAt)}</td>

                                                <td>
                                                    <span className={`status-badge ${item.status}`}>
                                                        {item.status === "sent"
                                                            ? "Đã gửi"
                                                            : item.status === "scheduled"
                                                                ? "Đã lên lịch"
                                                                : item.status === "failed"
                                                                    ? "Thất bại"
                                                                    : "Bản nháp"}
                                                    </span>
                                                </td>

                                                <td>
                                                    {item.openRate === null || item.openRate === undefined
                                                        ? "-"
                                                        : `${item.openRate}%`}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>
            </div>

            {/* Toast alert */}
            {toastMessage && (
                <div className="admin-toast-container">
                    <div className="admin-toast">
                        <div className="toast-message-content"><span>✅</span> {toastMessage}</div>
                        <button className="toast-close-btn" onClick={() => setToastMessage("")}>✕</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminNotifications;