import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, Package, FolderOpen, Clock, Settings, CheckCircle2, XCircle } from "lucide-react";
import supportRequestService from "../../services/supportRequestService";
import authService from "../../services/authService";
import AdminSidebar from "../../components/common/Sidebar/AdminSidebar";
import AdminHeader from "../../components/common/Header/AdminHeader";
import useDebounce from "../../hooks/useDebounce";
import "./AdminComplaints.css";
import "./AdminStyles.css";

export default function AdminComplaints() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const debouncedSearchQuery = useDebounce(searchQuery, 350);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user || user.role?.toLowerCase() !== "admin") {
      navigate("/login");
      return;
    }
    setCurrentUser(user);
  }, [navigate]);

  useEffect(() => {
    loadRequests();
  }, [activeStatusFilter, debouncedSearchQuery]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await supportRequestService.getAdminRequestsPaged({
        page: 0,
        size: 20,
        status: activeStatusFilter === "all" ? null : activeStatusFilter,
        search: debouncedSearchQuery
      });
      if (data && data.content) {
        setRequests(data.content);
      } else {
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Lỗi khi tải yêu cầu cho admin:", err);
      showToast("❌ Lỗi khi tải dữ liệu yêu cầu hỗ trợ.");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const s = { total: 0, pending: 0, processing: 0, resolved: 0, rejected: 0 };
    requests.forEach(r => {
      s.total++;
      const status = r.status.toLowerCase();
      if (status === "pending") s.pending++;
      else if (status === "assigned" || status === "processing") s.processing++;
      else if (status === "resolved") s.resolved++;
      else if (status === "rejected") s.rejected++;
    });
    return s;
  }, [requests]);

  // Server-side handled requests
  const filteredRequests = requests;

  // Paginated items
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const currentItems = useMemo(() => {
    return filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredRequests, currentPage]);

  const handleSelectRequest = (req) => {
    setSelectedRequest(req);
    setAdminNotes(req.adminNotes || "");
    setUpdatingStatus(req.status);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setIsSubmitting(true);
    try {
      const updated = await supportRequestService.updateRequestStatus(
        selectedRequest.id,
        updatingStatus,
        adminNotes
      );

      // Update local state
      setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
      setSelectedRequest(null);
      showToast("✅ Đã cập nhật trạng thái yêu cầu hỗ trợ thành công!");
    } catch (err) {
      console.error("Lỗi khi cập nhật trạng thái:", err);
      showToast("❌ Cập nhật trạng thái thất bại. Vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending": return "Chờ duyệt";
      case "assigned": return "Đã phân công";
      case "processing": return "Đang xử lý";
      case "resolved": return "Đã giải quyết";
      case "rejected": return "Từ chối";
      default: return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "pending": return "badge-pending";
      case "assigned": return "badge-assigned";
      case "processing": return "badge-processing";
      case "resolved": return "badge-resolved";
      case "rejected": return "badge-rejected";
      default: return "";
    }
  };

  // Helper for admin user avatar
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

  // ─── LIST VIEW ───────────────────────────────────────────────────────────────
  const renderListView = () => {
    return (
      <>
        <div className="admin-page-title-row">
          <div className="admin-page-title-info">
            <h2>Quản lý Hỗ trợ & Yêu cầu</h2>
            <p>Tiếp nhận, xử lý và phản hồi yêu cầu hỗ trợ và khiếu nại của người dùng hệ thống.</p>
          </div>
          <div className="admin-page-actions">
            <button className="btn-admin-outline" onClick={loadRequests} disabled={loading}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Tải lại
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="admin-complaints-stats">
          <div className="admin-stat-card">
            <span className="stat-icon gray">
              <FolderOpen size={20} />
            </span>
            <div>
              <p>Tổng yêu cầu</p>
              <strong>{stats.total}</strong>
            </div>
          </div>
          <div className="admin-stat-card">
            <span className="stat-icon orange">
              <Clock size={20} />
            </span>
            <div>
              <p>Chờ duyệt</p>
              <strong>{stats.pending}</strong>
            </div>
          </div>
          <div className="admin-stat-card">
            <span className="stat-icon blue">
              <Settings size={20} />
            </span>
            <div>
              <p>Đang xử lý</p>
              <strong>{stats.processing}</strong>
            </div>
          </div>
          <div className="admin-stat-card">
            <span className="stat-icon green">
              <CheckCircle2 size={20} />
            </span>
            <div>
              <p>Đã giải quyết</p>
              <strong>{stats.resolved}</strong>
            </div>
          </div>
          <div className="admin-stat-card">
            <span className="stat-icon red">
              <XCircle size={20} />
            </span>
            <div>
              <p>Từ chối</p>
              <strong>{stats.rejected}</strong>
            </div>
          </div>
        </div>

        {/* Tabs Row */}
        <div className="admin-tabs-row">
          {[
            { id: "all", label: "Tất cả" },
            { id: "pending", label: "Chờ duyệt" },
            { id: "processing", label: "Đang xử lý" },
            { id: "resolved", label: "Đã giải quyết" },
            { id: "rejected", label: "Từ chối" }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`admin-tab ${activeStatusFilter === tab.id ? "active" : ""}`}
              onClick={() => { setActiveStatusFilter(tab.id); setCurrentPage(1); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="admin-filters-bar">
          <div className="filter-search-wrapper">
            <span className="filter-search-icon" style={{ display: "inline-flex", alignItems: "center" }}><Search size={16} /></span>
            <input
              type="text"
              placeholder="Tìm theo Mã, Tiêu đề, Người gửi..."
              className="filter-search-input"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* Table Card */}
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "120px" }}>Mã yêu cầu</th>
                <th>Tiêu đề</th>
                <th>Người gửi</th>
                <th>Danh mục</th>
                <th>Trạng thái</th>
                <th>Ngày gửi</th>
                <th style={{ textAlign: "right", width: "100px" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "30px", color: "var(--admin-text-muted)" }}>
                    Đang tải danh sách yêu cầu hỗ trợ...
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "30px", color: "var(--admin-text-muted)" }}>
                    Không có yêu cầu hỗ trợ nào phù hợp.
                  </td>
                </tr>
              ) : (
                currentItems.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <span style={{ fontWeight: "700", color: "#475569" }}>REQ-{req.id}</span>
                    </td>
                    <td>
                      <div
                        style={{ fontWeight: "600", color: "#1e293b", cursor: "pointer", textDecoration: "underline" }}
                        onClick={() => handleSelectRequest(req)}
                        title="Xem chi tiết"
                      >
                        {req.title}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: "600", color: "#334155" }}>{req.senderName}</div>
                      <div style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>{req.senderEmail}</div>
                    </td>
                    <td>
                      <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: "12px", fontSize: "11.5px", fontWeight: "600", backgroundColor: "#f1f5f9", color: "#475569" }}>
                        {req.category}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-status ${getStatusClass(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>
                        {new Date(req.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        title="Xem chi tiết & Phê duyệt"
                        className="btn-action-direct unlock"
                        onClick={() => handleSelectRequest(req)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--admin-primary)" }}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-pagination-row" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px", marginTop: "20px" }}>
            <button
              className="btn-admin-outline"
              style={{ padding: "6px 12px", fontSize: "13px" }}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Trước
            </button>
            <span style={{ fontSize: "13.5px", color: "var(--admin-text-muted)", fontWeight: "600" }}>
              Trang {currentPage} / {totalPages}
            </span>
            <button
              className="btn-admin-outline"
              style={{ padding: "6px 12px", fontSize: "13px" }}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Sau
            </button>
          </div>
        )}
      </>
    );
  };

  // ─── DETAIL VIEW ─────────────────────────────────────────────────────────────
  const renderDetailView = () => {
    const req = selectedRequest;

    // Status color mapping for the details banner
    const statusColors = {
      pending: { bg: "#fff7ed", text: "#92400e", border: "#fcd34d" },
      assigned: { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
      processing: { bg: "#e0f2fe", text: "#0369a1", border: "#7dd3fc" },
      resolved: { bg: "#ecfdf5", text: "#065f46", border: "#6ee7b7" },
      rejected: { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5" },
    };
    const sc = statusColors[req.status] ?? { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };

    return (
      <div className="account-details-container">
        {/* Breadcrumb */}
        <div className="details-breadcrumbs" style={{ marginBottom: "20px" }}>
          <span className="details-breadcrumb-link" style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setSelectedRequest(null)}>
            Quản lý Hỗ trợ & Yêu cầu
          </span>
          <span className="details-breadcrumb-separator" style={{ margin: "0 8px", color: "#9ca3af" }}>&gt;</span>
          <span className="details-breadcrumb-current" style={{ color: "#4b5563" }}>Chi tiết yêu cầu REQ-{req.id}</span>
        </div>

        {/* Title and Back button row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", gap: "20px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "24px", fontWeight: "800", color: "#111827" }}>{req.title}</h2>
            <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
              Gửi bởi: <strong style={{ color: "#374151" }}>{req.senderName}</strong> &bull; {req.senderEmail}
            </p>
          </div>
          <button
            onClick={() => setSelectedRequest(null)}
            style={{ padding: "10px 18px", borderRadius: "10px", border: "1.5px solid #e5e7eb", backgroundColor: "#fff", color: "#374151", fontWeight: "600", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
          >
            ← Quay lại danh sách
          </button>
        </div>

        {/* Status banner */}
        <div style={{ padding: "14px 20px", borderRadius: "12px", marginBottom: "24px", border: `1.5px solid ${sc.border}`, backgroundColor: sc.bg, display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>
            {req.status === "resolved" ? "✅" : req.status === "rejected" ? "❌" : req.status === "pending" ? "⏳" : "⚙️"}
          </span>
          <span style={{ fontWeight: "600", color: sc.text, fontSize: "14px" }}>
            {req.status === "pending" && "Yêu cầu mới được tạo và đang chờ phản hồi từ ban quản trị."}
            {req.status === "assigned" && "Yêu cầu đã được ghi nhận và phân công xử lý."}
            {req.status === "processing" && "Yêu cầu đang trong quá trình kiểm tra giải quyết."}
            {req.status === "resolved" && `Yêu cầu đã được giải quyết thành công.${req.adminNotes ? ` Phản hồi: ${req.adminNotes}` : ""}`}
            {req.status === "rejected" && `Yêu cầu đã bị từ chối.${req.adminNotes ? ` Lý do: ${req.adminNotes}` : ""}`}
          </span>
          <span style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", backgroundColor: sc.border, color: sc.text }}>
            {getStatusLabel(req.status)}
          </span>
        </div>

        {/* Main 2-Column Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", alignItems: "start" }}>
          {/* Left Column: Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Meta cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px 16px", backgroundColor: "#fff" }}>
                <p style={{ margin: "0 0 4px 0", fontSize: "11px", color: "var(--admin-text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Mã yêu cầu</p>
                <strong style={{ fontSize: "15px", color: "var(--admin-text-main)" }}>#REQ-{req.id}</strong>
              </div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px 16px", backgroundColor: "#fff" }}>
                <p style={{ margin: "0 0 4px 0", fontSize: "11px", color: "var(--admin-text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Danh mục hỗ trợ</p>
                <strong style={{ fontSize: "15px", color: "var(--admin-text-main)" }}>{req.category || "Chung"}</strong>
              </div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px 16px", backgroundColor: "#fff" }}>
                <p style={{ margin: "0 0 4px 0", fontSize: "11px", color: "var(--admin-text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Thời gian gửi</p>
                <strong style={{ fontSize: "15px", color: "var(--admin-text-main)" }}>{new Date(req.createdAt).toLocaleString("vi-VN")}</strong>
              </div>
            </div>

            {/* Related Order (if any) */}
            {req.orderCode && (
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px 20px", backgroundColor: "#fff" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Package size={18} /> Đơn hàng liên quan
                </h4>
                <p style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f766e" }}>
                  {req.orderCode}
                </p>
              </div>
            )}

            {/* Issue Description */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px 20px", backgroundColor: "#fff" }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                📝 Nội dung yêu cầu hỗ trợ
              </h4>
              <p style={{ margin: 0, fontSize: "14px", color: "#374151", lineHeight: "1.7", whiteSpace: "pre-line" }}>
                {req.description}
              </p>
            </div>

            {/* Attachment (if any) */}
            {req.attachmentUrl && (
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px 20px", backgroundColor: "#fff" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  📎 Tài liệu / Hình ảnh minh chứng
                </h4>
                <div style={{ marginTop: "12px" }}>
                  <a href={req.attachmentUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 18px", backgroundColor: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: "8px", color: "#16a34a", textDecoration: "none", fontWeight: "700", fontSize: "13.5px", transition: "all 0.15s" }}>
                    <span>🔗</span> Xem ảnh minh chứng đính kèm
                  </a>
                </div>
                {/* Preview image directly if it is an image */}
                {(req.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)/i)) && (
                  <div style={{ marginTop: "14px", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                    <img
                      src={req.attachmentUrl}
                      alt="Attachment Minh Chứng"
                      style={{ maxWidth: "100%", maxHeight: "360px", display: "block" }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Live Chat Action Card */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px 20px", backgroundColor: "#fff", display: "flex", flexDirection: "column", gap: "12px" }}>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "13px", fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}>
                💬 Hỗ trợ trực tuyến
              </h4>
              <p style={{ margin: 0, fontSize: "13.5px", color: "var(--admin-text-muted)" }}>
                Hỗ trợ, giải đáp và trao đổi thông tin trực tiếp với khách hàng **{req.senderName}** về yêu cầu hỗ trợ này.
              </p>
              <button
                type="button"
                onClick={() => navigate(`/admin/chat/${req.id}`)}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "var(--admin-primary)",
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 2px 8px rgba(15,118,110,0.2)"
                }}
              >
                <span>💬</span> Trò chuyện với Khách hàng
              </button>
            </div>
          </div>

          {/* Right Column: Processing Form */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px 24px", backgroundColor: "#fff", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
            <h3 style={{ margin: "0 0 18px 0", fontSize: "16px", fontWeight: "700", color: "#1b5e20", borderBottom: "1px solid #f3f4f6", paddingBottom: "12px" }}>
              🛠️ Giải quyết yêu cầu
            </h3>

            <form onSubmit={handleUpdateStatus}>
              <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13.5px", fontWeight: "600", color: "#4b5563" }}>Trạng thái xử lý:</label>
                <select
                  value={updatingStatus}
                  onChange={(e) => setUpdatingStatus(e.target.value)}
                  style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none", backgroundColor: "#fff" }}
                  required
                  disabled={selectedRequest.status === "resolved" || selectedRequest.status === "rejected"}
                >
                  {selectedRequest.status === "pending" && (
                    <>
                      <option value="pending">Chờ duyệt (Pending)</option>
                      <option value="processing">Đang xử lý (Processing)</option>
                      <option value="resolved">Đã giải quyết (Resolved)</option>
                      <option value="rejected">Từ chối (Rejected)</option>
                    </>
                  )}
                  {selectedRequest.status === "processing" && (
                    <>
                      <option value="processing">Đang xử lý (Processing)</option>
                      <option value="resolved">Đã giải quyết (Resolved)</option>
                      <option value="rejected">Từ chối (Rejected)</option>
                    </>
                  )}
                  {selectedRequest.status === "resolved" && (
                    <option value="resolved">Đã giải quyết (Resolved)</option>
                  )}
                  {selectedRequest.status === "rejected" && (
                    <option value="rejected">Từ chối (Rejected)</option>
                  )}
                </select>
              </div>

              <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13.5px", fontWeight: "600", color: "#4b5563" }}>Ghi chú phản hồi gửi người dùng:</label>
                <textarea
                  rows={6}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Nhập hướng giải quyết, lý do từ chối hoặc phản hồi chi tiết..."
                  style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none", resize: "none" }}
                  required
                  disabled={selectedRequest.status === "resolved" || selectedRequest.status === "rejected"}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || selectedRequest.status === "resolved" || selectedRequest.status === "rejected"}
                style={{ width: "100%", padding: "12px 20px", border: "none", borderRadius: "8px", backgroundColor: (selectedRequest.status === "resolved" || selectedRequest.status === "rejected") ? "#cbd5e1" : "var(--admin-primary)", color: "#fff", fontWeight: "700", fontSize: "14px", cursor: (isSubmitting || selectedRequest.status === "resolved" || selectedRequest.status === "rejected") ? "not-allowed" : "pointer", boxShadow: (selectedRequest.status === "resolved" || selectedRequest.status === "rejected") ? "none" : "0 2px 8px rgba(15,118,110,0.25)", transition: "background-color 0.15s" }}
              >
                {isSubmitting ? "Đang xử lý..." : "Cập nhật & Gửi phản hồi"}
              </button>

              {(selectedRequest.status === "resolved" || selectedRequest.status === "rejected") && (
                <div style={{ marginTop: "12px", padding: "10px", backgroundColor: "#f3f4f6", borderRadius: "6px", color: "#475569", fontSize: "12.5px", fontWeight: "600", textAlign: "center" }}>
                  🔒 Yêu cầu đã đóng. Không thể cập nhật trạng thái.
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <AdminSidebar activeItem="complaints" showToast={showToast} onComplaintsClick={() => setSelectedRequest(null)} />

      {/* Main Container */}
      <div className="admin-main-container">
        {/* Header */}
        <AdminHeader
          searchQuery={searchQuery}
          setSearchQuery={(val) => { setSearchQuery(val); setCurrentPage(1); }}
          searchPlaceholder="Tìm kiếm khiếu nại..."
          showToast={showToast}
        />

        {/* Page Body */}
        <main className="admin-page-body">
          {selectedRequest ? renderDetailView() : renderListView()}
        </main>
      </div>

      {/* Toast Alert */}
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
}
