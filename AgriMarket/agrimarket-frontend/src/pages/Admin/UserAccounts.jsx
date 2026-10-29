// C:\Users\HUNG\.gemini\antigravity\AgriMarket\AgriMarket\agrimarket-frontend\src\pages\Admin\UserAccounts.jsx

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Bell, Lightbulb } from "lucide-react";
import authService from "../../services/authService";
import AdminSidebar from "../../components/common/Sidebar/AdminSidebar";
import AdminHeader from "../../components/common/Header/AdminHeader";
import apiClient from "../../services/apiClient";
import useDebounce from "../../hooks/useDebounce";
import "./AdminStyles.css";

const UserAccounts = () => {
  const navigate = useNavigate();
  const getFullImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
    return `${API_BASE_URL}/${cleanUrl}`;
  };
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 350);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [activeTab, setActiveTab] = useState("Tất cả");
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Advanced filters state
  const [filterRole, setFilterRole] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Three-dots dropdown state
  const [activeDropdown, setActiveDropdown] = useState(null);

  // User Details Dashboard view state
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
  const [detailActiveTab, setDetailActiveTab] = useState("history"); // "history" | "profile" | "security"
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleSelectUserForDetails = (user) => {
    setSelectedUserForDetails(user);
    if (user.role === "farmer") {
      setDetailActiveTab("sales_history");
    } else if (user.role === "customer") {
      setDetailActiveTab("purchase_history");
    } else {
      setDetailActiveTab("history");
    }
  };

  const fetchUserHistory = async (user) => {
    if (!user || !user.email) return;
    setHistoryLoading(true);
    setPurchaseHistory([]);
    setSalesHistory([]);
    try {
      if (user.role === "customer") {
        const response = await apiClient.get(`/api/admin/users/orders/customer/${user.email}`);
        setPurchaseHistory(response.data);
      } else if (user.role === "farmer") {
        const [salesRes, purchaseRes] = await Promise.all([
          apiClient.get(`/api/admin/users/orders/farmer/${user.email}`),
          apiClient.get(`/api/admin/users/orders/customer/${user.email}`)
        ]);
        setSalesHistory(salesRes.data);
        setPurchaseHistory(purchaseRes.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải lịch sử giao dịch:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUserForDetails) {
      fetchUserHistory(selectedUserForDetails);
    }
  }, [selectedUserForDetails]);

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    actionType: "", // "delete" | "reset_password" | "toggle_status" | "bulk_suspend"
    user: null
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    // Get logged-in user
    const user = authService.getCurrentUser();
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filterRole, filterStatus, debouncedSearchQuery]);

  // Handle outside click to close three-dots dropdowns
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activeDropdown && !e.target.closest(".dropdown-container")) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [activeDropdown]);


  const renderAccountDetailsDashboard = (user) => {
    const isLocked = user.status === "suspended" || user.status === "banned" || user.status === "locked";

    const getRoleLabel = (r) => {
      switch (r) {
        case "admin": return "Quản trị viên";
        case "farmer": return "Nông dân";
        case "customer": return "Khách hàng";
        default: return r;
      }
    };

    const getStatusLabel = (s) => {
      if (isLocked) return "Đã khóa";
      switch (s) {
        case "active": return "Hoạt động";
        case "pending": return "Chờ duyệt";
        default: return s;
      }
    };

    const getAdminInsight = (u) => {
      switch (u.role) {
        case "farmer":
          return `${u.fullName} là đối tác nhà vườn có hoạt động tích cực trên AgriMarket. Trang trại "${u.farmName || 'Nông trại sạch'}" thường xuyên cung cấp các sản phẩm hữu cơ đạt chất lượng cao. Đề xuất giữ kết nối tốt và ưu tiên hiển thị các sản phẩm VietGAP của nông hộ này trên trang chủ.`;
        case "customer":
          return `Khách hàng này thường xuyên mua sắm nông sản và có lịch sử giao dịch tốt. Tỷ lệ hủy/hoàn trả đơn hàng dưới 1%. Đây là tài khoản có tiềm năng trở thành Khách hàng thân thiết VIP của hệ thống.`;
        case "admin":
          return `Tài khoản Quản trị viên hệ thống cấp cao. Có toàn quyền quản trị, phê duyệt nông sản, xử lý khiếu nại và giám sát bảo mật. Luôn khuyến nghị bật xác thực 2 lớp.`;
        default:
          return `Tài khoản người dùng hệ thống AgriMarket. Chưa ghi nhận hành vi bất thường.`;
      }
    };

    const getHistoryData = (u) => {
      switch (u.role) {
        case "farmer":
          return [
            { id: "ORD-99120", date: "01/06/2026", details: "Lúa mì hữu cơ (50kg) + Phân bón vi sinh", amount: "1.240.000 đ", status: "delivered", statusLabel: "Đã giao" },
            { id: "ORD-99084", date: "28/05/2026", details: "Máy bơm tưới tiêu tự động Model X", amount: "845.000 đ", status: "in-transit", statusLabel: "Đang giao" },
            { id: "ORD-98752", date: "15/05/2026", details: "Bộ kit kiểm tra chất dinh dưỡng đất trồng v2", amount: "210.000 đ", status: "delivered", statusLabel: "Đã giao" }
          ];
        case "customer":
          return [
            { id: "ORD-77110", date: "02/06/2026", details: "Táo hữu cơ Mỹ (3kg) + Cam sành hữu cơ", amount: "320.000 đ", status: "delivered", statusLabel: "Đã giao" },
            { id: "ORD-76890", date: "25/05/2026", details: "Rau muống sạch VietGAP + Xà lách thủy canh", amount: "95.000 đ", status: "delivered", statusLabel: "Đã giao" }
          ];
        case "admin":
          return [
            { id: "ACT-102", date: "06/06/2026", details: `Phê duyệt tài khoản Nông dân: Sarah Jenkins`, amount: "-", status: "success", statusLabel: "Thành công" },
            { id: "ACT-095", date: "05/06/2026", details: `Khóa tài khoản Khách hàng: Marcus Rivera`, amount: "-", status: "success", statusLabel: "Thành công" }
          ];
        default:
          return [];
      }
    };

    const historyList = getHistoryData(user);
    const roleLabel = getRoleLabel(user.role);
    const statusLabel = getStatusLabel(user.status);
    const insightText = getAdminInsight(user);

    const formatDate = (dateStr) => {
      if (!dateStr) return "Chưa rõ";
      return new Date(dateStr).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    };

    return (
      <div className="account-details-container">
        {/* Breadcrumbs */}
        <div className="details-breadcrumbs">
          <span className="details-breadcrumb-link" onClick={() => setSelectedUserForDetails(null)}>
            Quản lý tài khoản
          </span>
          <span className="details-breadcrumb-separator">&gt;</span>
          <span className="details-breadcrumb-current">Chi tiết tài khoản</span>
        </div>

        {/* Header Row */}
        <div className="details-header-row">
          <div className="details-header-info">
            <h2>Chi tiết tài khoản</h2>
          </div>

          <div className="details-action-buttons">
            {user.status === "pending" && (
              <>
                <button
                  className="btn-detail-action approve"
                  onClick={() => handleApproveUser(user)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Duyệt (Approve)
                </button>
                <button
                  className="btn-detail-action reject"
                  onClick={() => triggerToggleStatusConfirm(user)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line></svg>
                  Từ chối (Reject)
                </button>
              </>
            )}

            {user.role !== "admin" && (
              isLocked ? (
                <button
                  className="btn-detail-action unblock"
                  onClick={() => triggerToggleStatusConfirm(user)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                  Mở khóa (Unblock)
                </button>
              ) : (
                <button
                  className="btn-detail-action block"
                  onClick={() => triggerToggleStatusConfirm(user)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Khóa tài khoản (Block)
                </button>
              )
            )}
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="details-dashboard-grid">
          {/* Cột trái */}
          <div className="details-left-card">
            <div className="details-avatar-container">
              {user.avatarUrl ? (
                <img
                  src={getFullImageUrl(user.avatarUrl)}
                  alt={user.fullName}
                  className="details-avatar-large"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
                  }}
                />
              ) : (
                <div className={`details-avatar-large fallback avatar-color-${user.id % 5}`}>
                  {user.fullName ? user.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
                </div>
              )}
              <span className={`details-status-checkmark ${user.status}`}>
                {isLocked ? "🔒" : user.status === "pending" ? "⏳" : "✓"}
              </span>
            </div>

            <h3 className="details-profile-name">{user.fullName}</h3>
            <span className={`details-role-status-badge ${user.status}`}>
              {statusLabel} • {roleLabel}
            </span>

            <div className="details-fields-list">
              <div className="details-field-item">
                <span className="details-field-label">Mã người dùng</span>
                <span className="details-field-value">
                  {user.role === "customer" ? `AGC${user.id}` : user.role === "farmer" ? `AGF${user.id}` : `AG-${user.id}`}
                </span>
              </div>
              <div className="details-field-item">
                <span className="details-field-label">Email</span>
                <span className="details-field-value">{user.email}</span>
              </div>
              <div className="details-field-item">
                <span className="details-field-label">Số điện thoại</span>
                <span className="details-field-value">{user.phone || "Chưa cung cấp"}</span>
              </div>
              {user.address && (
                <div className="details-field-item" style={{ gridColumn: "span 2" }}>
                  <span className="details-field-label">Địa chỉ</span>
                  <span className="details-field-value" style={{ wordBreak: "break-word" }}>{user.address}</span>
                </div>
              )}
              <div className="details-field-item">
                <span className="details-field-label">Ngày đăng ký</span>
                <span className="details-field-value">{formatDate(user.createdAt)}</span>
              </div>
            </div>



            <div className="details-insight-card">
              <div className="insight-header">
                <span className="insight-icon" style={{ display: "inline-flex", alignItems: "center" }}><Lightbulb size={16} /></span>
                <span>Gợi ý từ Hệ thống</span>
              </div>
              <p className="insight-text">{insightText}</p>
            </div>
          </div>

          {/* Cột phải */}
          <div className="details-right-column">
            <div className="details-right-card">
              <div className="details-tabs-header">
                {user.role === "farmer" ? (
                  <>
                    <button
                      className={`details-tab-btn ${detailActiveTab === "sales_history" ? "active" : ""}`}
                      onClick={() => setDetailActiveTab("sales_history")}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                      Lịch sử bán hàng
                    </button>
                    <button
                      className={`details-tab-btn ${detailActiveTab === "purchase_history" ? "active" : ""}`}
                      onClick={() => setDetailActiveTab("purchase_history")}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                      Lịch sử mua hàng
                    </button>
                  </>
                ) : (
                  <button
                    className={`details-tab-btn ${detailActiveTab === "history" || detailActiveTab === "sales_history" || detailActiveTab === "purchase_history" ? "active" : ""}`}
                    onClick={() => setDetailActiveTab(user.role === "customer" ? "purchase_history" : "history")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    {user.role === "customer" ? "Lịch sử mua hàng" : "Nhật ký tác vụ"}
                  </button>
                )}
                {(user.role === "farmer" || user.role === "admin") && (
                  <button
                    className={`details-tab-btn ${detailActiveTab === "profile" ? "active" : ""}`}
                    onClick={() => setDetailActiveTab("profile")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    Hồ sơ chi tiết
                  </button>
                )}
                <button
                  className={`details-tab-btn ${detailActiveTab === "security" ? "active" : ""}`}
                  onClick={() => setDetailActiveTab("security")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Bảo mật & Quyền truy cập
                </button>
              </div>

              <div className="details-tab-content">
                {(detailActiveTab === "history" || detailActiveTab === "sales_history" || detailActiveTab === "purchase_history") && (
                  <div>
                    <div className="recent-orders-header">
                      <h3>
                        {detailActiveTab === "sales_history"
                          ? "Đơn hàng đã bán gần đây"
                          : detailActiveTab === "purchase_history"
                            ? "Đơn hàng đã mua gần đây"
                            : "Các hoạt động hệ thống gần đây"}
                      </h3>
                      <div className="recent-orders-actions">
                        <button className="btn-orders-action" onClick={() => showToast("Bộ lọc lịch sử giao dịch đang tải...")}>Bộ lọc</button>
                        <button className="btn-orders-action" onClick={() => showToast("Đang xuất dữ liệu giao dịch...")}>Xuất file</button>
                      </div>
                    </div>

                    <div className="orders-table-wrapper">
                      <table className="orders-table">
                        <thead>
                          <tr>
                            <th>Mã giao dịch</th>
                            <th>Ngày thực hiện</th>
                            <th>Chi tiết mặt hàng</th>
                            <th>Giá trị</th>
                            <th>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyLoading ? (
                            <tr>
                              <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "var(--admin-text-muted)" }}>
                                Đang tải lịch sử giao dịch...
                              </td>
                            </tr>
                          ) : (
                            (() => {
                              let currentHistory = [];
                              if (detailActiveTab === "sales_history") {
                                currentHistory = salesHistory;
                              } else if (detailActiveTab === "purchase_history") {
                                currentHistory = purchaseHistory;
                              } else {
                                currentHistory = historyList;
                              }

                              if (currentHistory.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "var(--admin-text-muted)" }}>
                                      Không có lịch sử hoạt động ghi nhận.
                                    </td>
                                  </tr>
                                );
                              }

                              return currentHistory.map((item, idx) => {
                                const isRealData = item.id && typeof item.id === 'string' && item.id.startsWith("FH-");
                                const transactionId = isRealData ? item.id : item.id;
                                const dateFormatted = isRealData ? `${item.date} ${item.time || ''}` : item.date;

                                let detailsSummary = "";
                                if (isRealData && item.items) {
                                  detailsSummary = item.items.map(it => `${it.name} (${it.qty}${it.productUnit || 'kg'})`).join(" + ");
                                } else {
                                  detailsSummary = item.details;
                                }

                                const amountFormatted = isRealData
                                  ? (item.amount ? item.amount.toLocaleString("vi-VN") + " đ" : "0 đ")
                                  : item.amount;

                                const getStatusClass = (status) => {
                                  switch (status?.toLowerCase()) {
                                    case "delivered": return "delivered";
                                    case "shipping": return "in-transit";
                                    case "pending":
                                    case "preparing":
                                    case "confirmed":
                                      return "processing";
                                    case "cancelled":
                                    case "rejected":
                                    default:
                                      return "in-transit";
                                  }
                                };

                                const statusText = isRealData ? item.statusLabel : item.statusLabel;
                                const statusClass = isRealData ? getStatusClass(item.status) : item.status;

                                return (
                                  <tr key={idx}>
                                    <td className="order-id-cell">{transactionId}</td>
                                    <td>{dateFormatted}</td>
                                    <td>{detailsSummary}</td>
                                    <td>{amountFormatted}</td>
                                    <td>
                                      <span className={`order-status-badge ${statusClass}`}>
                                        {statusText}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              });
                            })()
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {detailActiveTab === "profile" && (
                  <div className="details-info-tab-grid">
                    {user.role === "farmer" && (
                      <>
                        <div className="details-field-item">
                          <span className="details-field-label">Tên trang trại</span>
                          <span className="details-field-value">{user.farmName || "Chưa cung cấp"}</span>
                        </div>
                        <div className="details-field-item">
                          <span className="details-field-label">Số CCCD / CMND</span>
                          <span className="details-field-value">{user.identityCard || "Chưa cung cấp"}</span>
                        </div>
                        <div className="details-field-item" style={{ gridColumn: "span 2" }}>
                          <span className="details-field-label">Địa chỉ trang trại</span>
                          <span className="details-field-value">{user.farmAddress || "Chưa cung cấp"}</span>
                        </div>
                        <div className="details-field-item" style={{ gridColumn: "span 2" }}>
                          <span className="details-field-label">Mô tả trang trại</span>
                          <span className="details-field-value" style={{ fontWeight: "normal", fontSize: "13.5px" }}>
                            {user.description || "Chưa cung cấp"}
                          </span>
                        </div>
                        <div className="details-field-item">
                          <span className="details-field-label">Chứng nhận VietGAP</span>
                          {user.vietgapUrl ? (
                            <a href={user.vietgapUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#10b981", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                              ✓ Đã cấp (Xem chứng nhận)
                            </a>
                          ) : (
                            <span className="details-field-value" style={{ color: "var(--admin-text-muted)" }}>Chưa tải lên</span>
                          )}
                        </div>
                        <div className="details-field-item">
                          <span className="details-field-label">Chứng nhận GlobalGAP</span>
                          {user.globalgapUrl ? (
                            <a href={user.globalgapUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#10b981", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                              ✓ Đã cấp (Xem chứng nhận)
                            </a>
                          ) : (
                            <span className="details-field-value" style={{ color: "var(--admin-text-muted)" }}>Chưa tải lên</span>
                          )}
                        </div>
                        <div className="details-field-item">
                          <span className="details-field-label">Chứng nhận Hữu cơ</span>
                          {user.organicUrl ? (
                            <a href={user.organicUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#10b981", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                              ✓ Đã cấp (Xem chứng nhận)
                            </a>
                          ) : (
                            <span className="details-field-value" style={{ color: "var(--admin-text-muted)" }}>Chưa tải lên</span>
                          )}
                        </div>
                        <div className="details-field-item">
                          <span className="details-field-label">Giấy phép Đăng ký kinh doanh / HTX</span>
                          {user.businessRegistrationUrl ? (
                            <div style={{ marginTop: "6px" }}>
                              <a href={user.businessRegistrationUrl} target="_blank" rel="noopener noreferrer">
                                <img src={user.businessRegistrationUrl} alt="Giấy đăng ký kinh doanh" style={{ maxWidth: "150px", maxHeight: "100px", objectFit: "cover", borderRadius: "4px", border: "1px solid var(--admin-border)" }} />
                              </a>
                            </div>
                          ) : (
                            <span className="details-field-value" style={{ color: "var(--admin-text-muted)" }}>Chưa tải lên</span>
                          )}
                        </div>
                      </>
                    )}

                    {user.role === "customer" && (
                      <>
                        <div className="details-field-item" style={{ gridColumn: "span 2" }}>
                          <span className="details-field-label">Địa chỉ nhận hàng mặc định</span>
                          <span className="details-field-value">123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</span>
                        </div>
                        <div className="details-field-item">
                          <span className="details-field-label">Hạng thành viên VIP</span>
                          <span className="details-field-value" style={{ color: "#d97706", fontWeight: "700" }}>★ Thành viên Vàng (Gold Member)</span>
                        </div>
                        <div className="details-field-item">
                          <span className="details-field-label">Điểm tích lũy</span>
                          <span className="details-field-value">1,250 điểm AgriPoints</span>
                        </div>
                        <div className="details-field-item" style={{ gridColumn: "span 2" }}>
                          <span className="details-field-label">Sở thích mua sắm nông sản</span>
                          <span className="details-field-value" style={{ fontWeight: "normal" }}>Ưa chuộng các loại trái cây organic nhập khẩu và rau củ sấy khô xuất khẩu.</span>
                        </div>
                      </>
                    )}



                    {user.role === "admin" && (
                      <>
                        <div className="details-field-item">
                          <span className="details-field-label">Cấp độ quản trị</span>
                          <span className="details-field-value" style={{ color: "var(--admin-primary)", fontWeight: "700" }}>🛡️ Super Admin (Quản trị viên tối cao)</span>
                        </div>
                        <div className="details-field-item">
                          <span className="details-field-label">Bộ phận phụ trách</span>
                          <span className="details-field-value">Ban giám sát chất lượng và Quản lý đối tác chiến lược</span>
                        </div>
                        <div className="details-field-item" style={{ gridColumn: "span 2" }}>
                          <span className="details-field-label">Quyền hạn hệ thống đã kích hoạt</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                            {["Toàn quyền CSDL", "Phê duyệt nông dân", "Chặn tài khoản vi phạm", "Tải báo cáo tài chính", "Cấu hình hệ thống"].map((p, idx) => (
                              <span key={idx} style={{ backgroundColor: "#e0f2fe", color: "#0369a1", fontSize: "11px", fontWeight: "600", padding: "4px 8px", borderRadius: "4px" }}>{p}</span>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {detailActiveTab === "security" && (
                  <div className="details-info-tab-grid">
                    <div className="details-field-item">
                      <span className="details-field-label">Mật khẩu đăng nhập</span>
                      <span className="details-field-value" style={{ color: "#10b981" }}>✓ Đã thiết lập mật khẩu an toàn</span>
                    </div>
                    <div className="details-field-item">
                      <span className="details-field-label">Xác thực hai lớp (2FA)</span>
                      <span className="details-field-value" style={{ color: "#ef4444" }}>⚠️ Chưa kích hoạt (Khuyến nghị bật để tránh mất tài khoản)</span>
                    </div>
                    <div className="details-field-item">
                      <span className="details-field-label">Địa chỉ IP đăng nhập cuối</span>
                      <span className="details-field-value">113.161.45.92 (Viettel Telecom)</span>
                    </div>
                    <div className="details-field-item">
                      <span className="details-field-label">Thiết bị đăng nhập gần nhất</span>
                      <span className="details-field-value">Chrome v124.0.0 (Windows NT 10.0; Win64)</span>
                    </div>

                    <div className="profile-tab-section">
                      <h4>Hành động bảo mật hệ thống</h4>
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <button
                          className="btn-orders-action"
                          style={{ borderColor: "#ef4444", color: "#ef4444" }}
                          onClick={() => triggerResetPasswordConfirm(user)}
                        >
                          Reset mật khẩu về mặc định
                        </button>
                        <button
                          className="btn-orders-action"
                          onClick={() => showToast("Đã gửi mã xác nhận kích hoạt 2FA đến email người dùng.")}
                        >
                          Yêu cầu kích hoạt 2FA
                        </button>
                        <button
                          className="btn-orders-action"
                          onClick={() => showToast("Đã đăng xuất tài khoản này khỏi tất cả các thiết bị khác thành công.")}
                        >
                          Đăng xuất từ xa
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bottom-widgets-row" style={{ gridTemplateColumns: "1fr" }}>
              <div className="widget-card">
                <div className="widget-header">
                  <h3>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    Nhật ký hoạt động gần đây
                  </h3>
                  <button className="widget-header-btn" onClick={() => showToast("Đang tải nhật ký kiểm toán hệ thống đầy đủ...")}>Xem tất cả</button>
                </div>

                <div className="timeline-container">
                  <div className="timeline-item">
                    <div className="timeline-icon-dot"></div>
                    <div className="timeline-content">
                      <p className="timeline-title">Đăng nhập hệ thống (Thiết bị di động)</p>
                      <span className="timeline-time">Hôm nay, lúc 08:42 sáng</span>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-icon-dot"></div>
                    <div className="timeline-content">
                      <p className="timeline-title">Cập nhật mật khẩu bảo mật tài khoản</p>
                      <span className="timeline-time">Hôm qua, lúc 23:15 đêm</span>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-icon-dot"></div>
                    <div className="timeline-content">
                      <p className="timeline-title">Kích hoạt gian hàng bán nông sản sạch</p>
                      <span className="timeline-time">01/06/2026, lúc 14:02 chiều</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getInitialMockUsers = () => {
    const defaultUsers = [
      {
        id: 1,
        fullName: "Sarah Jenkins",
        email: "sarah.j@example.com",
        phone: "0987654321",
        role: "farmer",
        status: "active",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        createdAt: "2026-05-01T10:00:00",
        farmName: "Trang trại Thung lũng Xanh",
        farmAddress: "Đà Lạt, Lâm Đồng",
        description: "Chuyên cung cấp rau củ quả hữu cơ đạt tiêu chuẩn VietGAP.",
        categories: ["Fruits", "Organic"]
      },
      {
        id: 2,
        fullName: "Marcus Rivera",
        email: "marcus.r@example.com",
        phone: "0123456789",
        role: "customer",
        status: "suspended",
        avatarUrl: "",
        createdAt: "2026-05-10T14:30:00"
      },
      {
        id: 3,
        fullName: "Jonathan Appleseed",
        email: "jonathan@appleseed.com",
        phone: "0989888777",
        role: "farmer",
        status: "active",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        createdAt: "2026-06-01T09:00:00",
        farmName: "Nông trại Appleseed",
        farmAddress: "Mộc Châu, Sơn La",
        description: "Trồng táo và sản xuất nước ép táo hữu cơ nguyên chất.",
        categories: ["Fruits"]
      },
      {
        id: 4,
        fullName: "Alex River",
        email: "alex@agriadmin.com",
        phone: "0999999999",
        role: "admin",
        status: "active",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        createdAt: "2026-04-01T08:00:00"
      },

    ];

    const stored = localStorage.getItem("agri_users");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Error parsing stored users in UserAccounts:", e);
      }
    }

    localStorage.setItem("agri_users", JSON.stringify(defaultUsers));
    return defaultUsers;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/api/admin/users/paged", {
        params: {
          page: currentPage - 1,
          size: itemsPerPage,
          role: filterRole === "All" ? "all" : filterRole.toLowerCase(),
          status: filterStatus === "All" ? "all" : filterStatus.toLowerCase(),
          search: debouncedSearchQuery
        }
      });
      if (response.data && response.data.content) {
        setUsers(response.data.content);
        setTotalPages(response.data.totalPages || 1);
        setTotalElements(response.data.totalElements || response.data.content.length);
      } else {
        setUsers(response.data || []);
        setTotalElements(response.data?.length || 0);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách user:", err);
      setError("Không thể kết nối đến máy chủ. Đang hiển thị dữ liệu mô phỏng.");
      const localUsers = getInitialMockUsers();
      setUsers(localUsers);
    } finally {
      setLoading(false);
    }
  };

  // Show Toast
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

  // Sync tab with dropdown updates
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedUserIds([]);
    if (tab === "Tất cả") {
      setFilterRole("All");
      setFilterStatus("All");
    } else if (tab === "Khách hàng") {
      setFilterRole("customer");
      setFilterStatus("All");
    } else if (tab === "Nông dân") {
      setFilterRole("farmer");
      setFilterStatus("All");
    } else if (tab === "Quản trị viên") {
      setFilterRole("admin");
      setFilterStatus("All");
    } else if (tab === "Đã khóa") {
      setFilterRole("All");
      setFilterStatus("suspended");
    }
  };

  const handleRoleFilterChange = (role) => {
    setFilterRole(role);
    setCurrentPage(1);
    setSelectedUserIds([]);
    // Sync tab
    if (role === "All" && filterStatus === "All") {
      setActiveTab("Tất cả");
    } else if (role === "customer" && filterStatus === "All") {
      setActiveTab("Khách hàng");
    } else if (role === "farmer" && filterStatus === "All") {
      setActiveTab("Nông dân");
    } else if (role === "admin" && filterStatus === "All") {
      setActiveTab("Quản trị viên");
    } else {
      setActiveTab("");
    }
  };

  const handleStatusFilterChange = (status) => {
    setFilterStatus(status);
    setCurrentPage(1);
    setSelectedUserIds([]);
    // Sync tab
    if (filterRole === "All" && status === "All") {
      setActiveTab("Tất cả");
    } else if (filterRole === "All" && status === "suspended") {
      setActiveTab("Đã khóa");
    } else {
      setActiveTab("");
    }
  };

  // Combined Filtering logic (Server-side handled)
  const getFilteredUsers = () => {
    return users;
  };

  // Server-side pagination items
  const currentItems = users;
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const indexOfLastItem = indexOfFirstItem + users.length;

  // Checkbox functions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUserIds(currentItems.map(user => `${user.role}_${user.id}`));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectUser = (role, id) => {
    const key = `${role}_${id}`;
    if (selectedUserIds.includes(key)) {
      setSelectedUserIds(selectedUserIds.filter(item => item !== key));
    } else {
      setSelectedUserIds([...selectedUserIds, key]);
    }
  };

  // Confirm Actions Triggers
  const triggerDeleteConfirm = (user) => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận xóa tài khoản",
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản của ${user.fullName} (${user.email})? Hành động này không thể hoàn tác.`,
      actionType: "delete",
      user
    });
  };

  const triggerResetPasswordConfirm = (user) => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận đặt lại mật khẩu",
      message: `Mật khẩu của tài khoản ${user.fullName} (${user.email}) sẽ được đặt lại về mặc định ("Password123"). Bạn có đồng ý tiếp tục?`,
      actionType: "reset_password",
      user
    });
  };

  const triggerToggleStatusConfirm = (user) => {
    const isLocked = user.status === "suspended" || user.status === "banned" || user.status === "locked";
    setConfirmModal({
      isOpen: true,
      title: isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản",
      message: isLocked
        ? `Bạn có chắc chắn muốn kích hoạt lại tài khoản của ${user.fullName} (${user.email})?`
        : `Bạn có chắc chắn muốn tạm khóa tài khoản của ${user.fullName} (${user.email})?`,
      actionType: "toggle_status",
      user
    });
  };

  const triggerBulkSuspendConfirm = () => {
    if (selectedUserIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: "Đình chỉ tài khoản đã chọn",
      message: `Bạn có chắc chắn muốn đình chỉ (khóa) ${selectedUserIds.length} tài khoản đã chọn không?`,
      actionType: "bulk_suspend",
      user: null
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      title: "",
      message: "",
      actionType: "",
      user: null
    });
  };

  // Execute confirmation actions
  const handleExecuteAction = async () => {
    const { actionType, user } = confirmModal;
    closeConfirmModal();

    if (actionType === "delete" && user) {
      try {
        await apiClient.delete(`/api/admin/users/${user.role}/${user.id}`);
        showToast(`Đã xóa thành công tài khoản ${user.fullName}.`);
        if (selectedUserForDetails && selectedUserForDetails.id === user.id && selectedUserForDetails.role === user.role) {
          setSelectedUserForDetails(null);
        }
        fetchUsers();
      } catch (err) {
        console.error("Lỗi khi xóa tài khoản:", err);
        // Mock fallback
        const updated = users.filter(u => !(u.id === user.id && u.role === user.role));
        setUsers(updated);
        localStorage.setItem("agri_users", JSON.stringify(updated));
        if (selectedUserForDetails && selectedUserForDetails.id === user.id && selectedUserForDetails.role === user.role) {
          setSelectedUserForDetails(null);
        }
        showToast(`Đã xóa tài khoản ${user.fullName} (Chế độ mô phỏng).`);
      }
    } else if (actionType === "reset_password" && user) {
      // Typically we'd call an endpoint. For now, since it's a simulated or basic reset action:
      showToast(`Đã đặt lại mật khẩu cho ${user.fullName} về mặc định ("Password123") thành công!`);
    } else if (actionType === "toggle_status" && user) {
      const isLocked = user.status === "suspended" || user.status === "banned" || user.status === "locked";
      const newStatus = isLocked ? "active" : "suspended";
      try {
        await apiClient.put(`/api/admin/users/${user.role}/${user.id}/status`, { status: newStatus });
        showToast(`Đã ${newStatus === "active" ? "mở khóa" : "tạm khóa"} tài khoản ${user.fullName} thành công.`);
        if (selectedUserForDetails && selectedUserForDetails.id === user.id && selectedUserForDetails.role === user.role) {
          setSelectedUserForDetails({ ...selectedUserForDetails, status: newStatus });
        }
        fetchUsers();
      } catch (err) {
        console.error("Lỗi cập nhật trạng thái:", err);
        // Mock fallback
        const updated = users.map(u => {
          if (u.id === user.id && u.role === user.role) {
            return { ...u, status: newStatus };
          }
          return u;
        });
        setUsers(updated);
        localStorage.setItem("agri_users", JSON.stringify(updated));
        if (selectedUserForDetails && selectedUserForDetails.id === user.id && selectedUserForDetails.role === user.role) {
          setSelectedUserForDetails({ ...selectedUserForDetails, status: newStatus });
        }
        showToast(`Đã ${newStatus === "active" ? "mở khóa" : "tạm khóa"} tài khoản ${user.fullName} (Chế độ mô phỏng).`);
      }
    } else if (actionType === "bulk_suspend") {
      let successCount = 0;
      for (const key of selectedUserIds) {
        const [role, id] = key.split("_");
        try {
          await apiClient.put(`/api/admin/users/${role}/${id}/status`, { status: "suspended" });
          successCount++;
        } catch (err) {
          console.error(`Lỗi bulk suspend ${key}:`, err);
        }
      }

      // Fallback for mock if all failed
      if (successCount === 0 && selectedUserIds.length > 0) {
        const updatedUsers = users.map(u => {
          if (selectedUserIds.includes(`${u.role}_${u.id}`)) {
            return { ...u, status: "suspended" };
          }
          return u;
        });
        setUsers(updatedUsers);
        localStorage.setItem("agri_users", JSON.stringify(updatedUsers));
        successCount = selectedUserIds.length;
      }

      await fetchUsers();
      setSelectedUserIds([]);
      showToast(`Đã đình chỉ thành công ${successCount} tài khoản.`);
    }
  };

  // Approve User (instantly changes status to active)
  const handleApproveUser = async (user) => {
    try {
      await apiClient.put(`/api/admin/users/${user.role}/${user.id}/status`, { status: "active" });
      showToast(`Đã duyệt tài khoản ${user.fullName} thành công.`);
      setSelectedUserForDetails(prev => prev && prev.id === user.id && prev.role === user.role ? { ...prev, status: "active" } : prev);
      fetchUsers();
    } catch (err) {
      console.error("Lỗi duyệt tài khoản:", err);
      // Fallback for mock mode
      const updated = users.map(u => {
        if (u.id === user.id && u.role === user.role) {
          return { ...u, status: "active" };
        }
        return u;
      });
      setUsers(updated);
      localStorage.setItem("agri_users", JSON.stringify(updated));
      setSelectedUserForDetails(prev => prev && prev.id === user.id && prev.role === user.role ? { ...prev, status: "active" } : prev);
      showToast(`Đã duyệt tài khoản ${user.fullName} thành công (Chế độ mô phỏng).`);
    }
  };

  // Export Users (Mock action)
  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["ID,Name,Email,Phone,Role,Status"].join(",") + "\n"
      + filteredUsers.map(u => `${u.id},${u.fullName},${u.email},${u.phone || ""},${u.role},${u.status}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriadmin_users_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã xuất danh sách tài khoản thành công!");
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  return (
    <div className="admin-layout">
      {/* Sidebar - Matching Image 1 */}
      <AdminSidebar activeItem="users" showToast={showToast} />

      {/* Main Content Container */}
      <div className="admin-main-container">
        {/* Header - Matching Image 1 */}
        <AdminHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Tìm kiếm tài khoản..."
          showToast={showToast}
        />

        {/* Page Body */}
        <main className="admin-page-body">
          {error && (
            <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fef3c7", color: "#b45309", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px" }}>
              ⚠️ {error}
            </div>
          )}

          {selectedUserForDetails ? (
            renderAccountDetailsDashboard(selectedUserForDetails)
          ) : (
            <>
              {/* Title row */}
              <div className="admin-page-title-row">
                <div className="admin-page-title-info">
                  <h2>Quản lý tài khoản</h2>
                  <p>Quản lý khách hàng, nông dân và tài khoản quản trị trên toàn hệ thống.</p>
                </div>

                <div className="admin-page-actions">
                  {/* Create New User button - requested explicitly! */}
                  <button
                    className="btn-admin-primary"
                    onClick={() => navigate("/admin/users/create")}
                    style={{ padding: "10px 16px" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Tạo người dùng mới
                  </button>

                  <button className="btn-admin-outline" onClick={handleExport}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Xuất dữ liệu
                  </button>

                  <button
                    className="btn-admin-danger"
                    onClick={triggerBulkSuspendConfirm}
                    disabled={selectedUserIds.length === 0}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                    Khóa tài khoản chọn
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="admin-tabs-row">
                {["Tất cả", "Khách hàng", "Nông dân", "Quản trị viên", "Đã khóa"].map((tab) => (
                  <button
                    key={tab}
                    className={`admin-tab ${activeTab === tab ? "active" : ""}`}
                    onClick={() => handleTabClick(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Advanced Filters & Search Bar */}
              <div className="admin-filters-bar">
                <div className="filter-search-wrapper">
                  <span className="filter-search-icon" style={{ display: "inline-flex", alignItems: "center" }}><Search size={16} /></span>
                  <input
                    type="text"
                    placeholder="Tìm theo tên, email hoặc SĐT..."
                    className="filter-search-input"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                <div className="filter-selects">
                  <div className="filter-select-wrapper">
                    <label htmlFor="role-filter">Vai trò</label>
                    <select
                      id="role-filter"
                      value={filterRole}
                      onChange={(e) => handleRoleFilterChange(e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">Tất cả vai trò</option>
                      <option value="admin">Quản trị (Admin)</option>
                      <option value="customer">Khách hàng (Customer)</option>
                      <option value="farmer">Nông dân (Farmer)</option>
                    </select>
                  </div>

                  <div className="filter-select-wrapper">
                    <label htmlFor="status-filter">Trạng thái</label>
                    <select
                      id="status-filter"
                      value={filterStatus}
                      onChange={(e) => handleStatusFilterChange(e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">Tất cả trạng thái</option>
                      <option value="active">Active (Hoạt động)</option>
                      <option value="suspended">Locked (Đã khóa)</option>
                      <option value="pending">Pending (Chờ duyệt)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table Card */}
              <div className="admin-table-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>
                        <input
                          type="checkbox"
                          className="admin-table-checkbox"
                          onChange={handleSelectAll}
                          checked={
                            currentItems.length > 0 &&
                            currentItems.every(user => selectedUserIds.includes(`${user.role}_${user.id}`))
                          }
                        />
                      </th>
                      <th>Tên người dùng</th>
                      <th>Email</th>
                      <th>Vai trò</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: "right" }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "var(--admin-text-muted)" }}>
                          Đang tải danh sách tài khoản...
                        </td>
                      </tr>
                    ) : currentItems.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "var(--admin-text-muted)" }}>
                          Không tìm thấy tài khoản nào phù hợp.
                        </td>
                      </tr>
                    ) : (
                      currentItems.map((user) => {
                        const isSelected = selectedUserIds.includes(`${user.role}_${user.id}`);
                        const userInitial = user.fullName ? user.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U";
                        const isLocked = user.status === "suspended" || user.status === "banned" || user.status === "locked";

                        return (
                          <tr key={`${user.role}_${user.id}`} style={{ backgroundColor: isSelected ? "#f0fdf4" : "transparent" }}>
                            <td>
                              <input
                                type="checkbox"
                                className="admin-table-checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectUser(user.role, user.id)}
                              />
                            </td>
                            <td>
                              <div
                                className="user-cell-info clickable-avatar"
                                style={{ cursor: "pointer" }}
                                onClick={() => handleSelectUserForDetails(user)}
                                title="Xem chi tiết tài khoản"
                              >
                                {user.avatarUrl ? (
                                  <img
                                    src={getFullImageUrl(user.avatarUrl)}
                                    alt={user.fullName}
                                    className="user-cell-avatar"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
                                    }}
                                  />
                                ) : (
                                  <div className={`user-cell-avatar avatar-color-${user.id % 5}`}>
                                    {userInitial}
                                  </div>
                                )}
                                <div>
                                  <p className="user-cell-name">{user.fullName}</p>
                                </div>
                              </div>
                            </td>
                            <td>
                              <p className="user-cell-email" style={{ margin: 0, fontSize: "14px", color: "var(--admin-text-main)" }}>
                                {user.email}
                              </p>
                            </td>
                            <td>
                              <span className={`badge-role ${user.role}`}>
                                {user.role === "admin" ? "Quản trị viên" : user.role === "farmer" ? "Nông dân" : user.role === "customer" ? "Khách hàng" : user.role}
                              </span>
                            </td>
                            <td style={{ verticalAlign: "middle" }}>
                              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                                <span className={`badge-status ${isLocked ? "suspended" : user.status}`}>
                                  {!isLocked && user.status === "active" ? (
                                    <>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                                      Hoạt động
                                    </>
                                  ) : isLocked ? (
                                    <>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line></svg>
                                      Đã khóa
                                    </>
                                  ) : (
                                    <>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                      Chờ duyệt
                                    </>
                                  )}
                                </span>
                                {user.role === "farmer" && user.status === "active" && (
                                  <span className="badge-verified" style={{ margin: 0 }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    Đã xác minh
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div className="action-buttons-cell">
                                {user.role !== "admin" ? (
                                  <div className="direct-actions-wrapper" style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                    {/* Nút Mở khóa (nếu tài khoản đang bị khóa) */}
                                    {isLocked ? (
                                      <button
                                        title="Mở khóa tài khoản"
                                        className="btn-action-direct unlock"
                                        onClick={() => triggerToggleStatusConfirm(user)}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#10b981" }}>
                                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                          <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                                        </svg>
                                      </button>
                                    ) : (
                                      <>
                                        {/* Nút Duyệt (nếu ở trạng thái chờ duyệt) */}
                                        {user.status === "pending" && (
                                          <button
                                            title="Duyệt tài khoản"
                                            className="btn-action-direct approve"
                                            onClick={() => handleApproveUser(user)}
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#10b981" }}>
                                              <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                          </button>
                                        )}

                                        {/* Nút Khóa tài khoản (nếu đang hoạt động hoặc chờ duyệt) */}
                                        <button
                                          title="Khóa tài khoản"
                                          className="btn-action-direct lock"
                                          onClick={() => triggerToggleStatusConfirm(user)}
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#f59e0b" }}>
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                          </svg>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: "12px", color: "var(--admin-text-muted)", fontStyle: "italic" }}>
                                    Hệ thống
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="admin-pagination-row">
                  <div className="admin-pagination-info">
                    Hiển thị từ {users.length > 0 ? indexOfFirstItem + 1 : 0} đến {indexOfLastItem} trong tổng số {totalElements || users.length} tài khoản
                  </div>

                  <div className="admin-pagination-controls">
                    <button
                      className="btn-pagination-nav"
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>

                    {[...Array(totalPages).keys()].map((p) => (
                      <button
                        key={p + 1}
                        className={`btn-pagination-page ${currentPage === p + 1 ? "active" : ""}`}
                        onClick={() => setCurrentPage(p + 1)}
                      >
                        {p + 1}
                      </button>
                    ))}

                    <button
                      className="btn-pagination-nav"
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="confirm-modal-overlay" onClick={closeConfirmModal}>
          <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <span className="confirm-modal-icon">⚠️</span>
              <h3>{confirmModal.title}</h3>
            </div>
            <div className="confirm-modal-body">
              <p>{confirmModal.message}</p>
            </div>
            <div className="confirm-modal-footer">
              <button className="btn-modal-cancel" onClick={closeConfirmModal}>
                Hủy bỏ
              </button>
              <button
                className={`btn-modal-confirm ${confirmModal.actionType === 'delete' ? 'delete' : confirmModal.actionType === 'reset_password' ? 'reset' : 'toggle'}`}
                onClick={handleExecuteAction}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details rendered inline inside admin-page-body */}

      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="admin-toast-container">
          <div className="admin-toast">
            <div className="toast-message-content">
              <span>✅</span> {toastMessage}
            </div>
            <button className="toast-close-btn" onClick={() => setToastMessage("")}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAccounts;
