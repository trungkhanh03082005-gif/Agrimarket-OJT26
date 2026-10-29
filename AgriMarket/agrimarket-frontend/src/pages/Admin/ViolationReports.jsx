import React, { useEffect, useMemo, useState } from "react";
import useDebounce from "../../hooks/useDebounce";
import { Link, useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import AdminSidebar from "../../components/common/Sidebar/AdminSidebar";
import AdminHeader from "../../components/common/Header/AdminHeader";
import reportService from "../../services/reportService";
import apiClient from "../../services/apiClient";
import {
    LayoutDashboard,
    Users,
    Sprout,
    CheckSquare,
    Folder,
    ShoppingCart,
    CreditCard,
    MessageSquare,
    BarChart3,
    Globe,
    Bell,
    Activity,
    Settings,
    Truck,
    Search,
    RefreshCw,
    Hourglass,
    CheckCircle2,
    XCircle,
    User,
    Target,
    Hash,
    Calendar,
    EyeOff,
    Lock,
    Clock,
    X,
    Check,
    Video
} from "lucide-react";
import "./AdminStyles.css";
import "./ViolationReports.css";

export default function ViolationReports() {
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
    const [reports, setReports] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterTargetType, setFilterTargetType] = useState("all");
    const [resolutionNote, setResolutionNote] = useState("");
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const debouncedSearchQuery = useDebounce(searchQuery, 350);

    useEffect(() => {
        const user = authService.getCurrentUser();
        setCurrentUser(user);

        if (!user || user.role !== "admin") {
            navigate("/login");
            return;
        }
    }, [navigate]);

    useEffect(() => {
        fetchReports();
    }, [currentPage, filterStatus, filterTargetType, debouncedSearchQuery]);

    const fetchReports = async () => {
        setLoading(true);

        try {
            const data = await reportService.getAllReportsPaged({
                page: currentPage - 1,
                size: 10,
                status: filterStatus,
                targetType: filterTargetType,
                search: debouncedSearchQuery
            });
            if (data && data.content) {
                setReports(data.content);
                setTotalPages(data.totalPages || 1);
                setSelectedReport(data.content[0] || null);
            } else {
                setReports(Array.isArray(data) ? data : []);
                setSelectedReport((Array.isArray(data) && data[0]) || null);
            }
        } catch (error) {
            console.error("Lỗi khi tải danh sách báo cáo vi phạm:", error);
            showToast("Không thể tải danh sách báo cáo vi phạm.");
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(""), 3500);
    };

    const getTargetTypeLabel = (type) => {
        switch (type) {
            case "product":
                return "Sản phẩm";
            case "farmer":
                return "Nông dân";
            case "customer":
                return "Khách hàng";
            default:
                return "Không rõ";
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case "pending":
                return "Đang chờ";
            case "reviewing":
                return "Đang xem xét";
            case "resolved":
                return "Đã xử lý";
            case "rejected":
                return "Đã từ chối";
            default:
                return "Không rõ";
        }
    };

    const getSeverityLabel = (severity) => {
        switch (severity) {
            case "critical":
                return "Nghiêm trọng";
            case "high":
                return "Cao";
            case "medium":
                return "Trung bình";
            case "low":
                return "Thấp";
            default:
                return "Chờ đánh giá";
        }
    };

    // Server-side handled reports
    const filteredReports = reports;

    const reportStats = useMemo(() => {
        return {
            pending: reports.filter((item) => item.status === "pending").length,
            reviewing: reports.filter((item) => item.status === "reviewing").length,
            resolved: reports.filter((item) => item.status === "resolved").length,
            rejected: reports.filter((item) => item.status === "rejected").length,
        };
    }, [reports]);

    const handleUpdateReportStatus = async (status) => {
        if (!selectedReport) {
            showToast("Vui lòng chọn một báo cáo để xử lý.");
            return;
        }

        // Cannot change status once resolved or rejected
        if (selectedReport.status === "resolved" || selectedReport.status === "rejected") {
            showToast("❌ Báo cáo này đã kết thúc xử lý và không thể thay đổi trạng thái.");
            return;
        }

        try {
            const updated = await reportService.updateReportStatus(
                selectedReport.id,
                status,
                resolutionNote
            );

            // Cập nhật local state
            setReports((prev) =>
                prev.map((r) => (r.id === updated.id ? updated : r))
            );
            setSelectedReport(updated);
            setResolutionNote("");
            showToast(`✅ Đã cập nhật trạng thái thành "${getStatusLabel(status)}" thành công.`);
        } catch (error) {
            console.error("Lỗi khi cập nhật trạng thái báo cáo:", error);
            const errMsg = error?.response?.data || error?.message || "Không thể cập nhật trạng thái báo cáo.";
            showToast(`❌ ${errMsg}`);
        }
    };

    const handleLockTargetAccount = async () => {
        if (!selectedReport) {
            showToast("Vui lòng chọn một báo cáo trước.");
            return;
        }

        const { targetType, targetId } = selectedReport;
        if (targetType !== "farmer" && targetType !== "customer") {
            showToast("❌ Chỉ khoá tài khoản nông dân hoặc khách hàng.");
            return;
        }

        try {
            await apiClient.put(`/api/admin/users/${targetType}/${targetId}/status`, { status: "banned" });
            showToast(`✅ Đã khoá tài khoản ${targetType === "farmer" ? "nông dân" : "khách hàng"} (ID: ${targetId}) thành công.`);
        } catch (error) {
            console.error("Lỗi khi khóa tài khoản:", error);
            const errMsg = error?.response?.data || error?.message || "Không thể khóa tài khoản liên quan.";
            showToast(`❌ ${errMsg}`);
        }
    };

    const handleHideProduct = async () => {
        if (!selectedReport) {
            showToast("Vui lòng chọn một báo cáo trước.");
            return;
        }

        if (selectedReport.targetType !== "product") {
            showToast("❌ Chỉ ẩn sản phẩm khi báo cáo là loại Sản phẩm.");
            return;
        }

        try {
            await apiClient.post(`/api/admin/products/${selectedReport.targetId}/hide`, {
                reason: resolutionNote || `Ẩn do báo cáo vi phạm RP-${selectedReport.id}`,
            });
            showToast(`✅ Đã ẩn sản phẩm (ID: ${selectedReport.targetId}) thành công.`);
        } catch (error) {
            console.error("Lỗi khi ẩn sản phẩm:", error);
            const errMsg = error?.response?.data || error?.message || "Không thể ẩn sản phẩm liên quan.";
            showToast(`❌ ${errMsg}`);
        }
    };

    const formatDateTime = (value) => {
        if (!value) return "Chưa rõ";
        return new Date(value).toLocaleString("vi-VN");
    };

    const formatDateTimeShort = (value) => {
        if (!value) return "";
        const date = new Date(value);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${hours}:${minutes} ${day}/${month}/${year}`;
    };

    const handleLogout = () => {
        authService.logout();
        navigate("/login");
    };

    return (
        <div className="admin-layout">
            <AdminSidebar activeItem="reports" showToast={showToast} />

            <div className="admin-main-container">
                <AdminHeader
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchPlaceholder="Tìm kiếm báo cáo..."
                    showToast={showToast}
                />

                <main className="admin-page-body violation-page-body">
                    <div className="violation-title-row">
                        <div>
                            <h2>Quản lý báo cáo vi phạm</h2>
                            <p>
                                Theo dõi, kiểm tra và xử lý các báo cáo vi phạm từ người dùng
                                nhằm giữ cho hệ thống AgriMarket minh bạch và an toàn.
                            </p>
                        </div>

                        <div className="violation-title-actions">
                            <button className="btn-admin-outline" onClick={fetchReports}>
                                Làm mới
                            </button>
                        </div>
                    </div>

                    <section className="violation-stats-grid">
                        <div className="violation-stat-card pending">
                            <div className="stat-icon"><Hourglass size={28} /></div>
                            <strong>{reportStats.pending}</strong>
                            <span>Đang chờ xử lý</span>
                        </div>

                        <div className="violation-stat-card resolved">
                            <div className="stat-icon"><CheckCircle2 size={28} /></div>
                            <strong>{reportStats.resolved}</strong>
                            <span>Đã xử lý</span>
                        </div>

                        <div className="violation-stat-card rejected">
                            <div className="stat-icon"><XCircle size={28} /></div>
                            <strong>{reportStats.rejected}</strong>
                            <span>Đã từ chối</span>
                        </div>
                    </section>

                    <section className="violation-filter-bar">
                        <div className="filter-search-wrapper violation-search-inline">
                            <span className="filter-search-icon" style={{ display: "inline-flex", alignItems: "center" }}><Search size={16} /></span>
                            <input
                                type="text"
                                placeholder="Tìm theo mã báo cáo, lý do, người gửi hoặc đối tượng..."
                                className="filter-search-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="filter-selects">
                            <div className="filter-select-wrapper">
                                <label>Đối tượng</label>
                                <select
                                    className="filter-select"
                                    value={filterTargetType}
                                    onChange={(e) => setFilterTargetType(e.target.value)}
                                >
                                    <option value="all">Tất cả đối tượng</option>
                                    <option value="product">Sản phẩm</option>
                                    <option value="farmer">Nông dân</option>
                                    <option value="customer">Khách hàng</option>
                                </select>
                            </div>

                            <div className="filter-select-wrapper">
                                <label>Trạng thái</label>
                                <select
                                    className="filter-select"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="all">Tất cả trạng thái</option>
                                    <option value="pending">Đang chờ</option>
                                    <option value="reviewing">Đang xem xét</option>
                                    <option value="resolved">Đã xử lý</option>
                                    <option value="rejected">Đã từ chối</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <section className="violation-content-grid">
                        <div className="violation-list-card">
                            <div className="violation-card-header">
                                <div>
                                    <h3>Danh sách báo cáo</h3>
                                    <p>{filteredReports.length} báo cáo phù hợp</p>
                                </div>
                            </div>

                            <div className="violation-card-list">
                                {loading ? (
                                    <div className="empty-list-cell">
                                        Đang tải danh sách báo cáo...
                                    </div>
                                ) : filteredReports.length === 0 ? (
                                    <div className="empty-list-cell">
                                        Chưa có báo cáo vi phạm nào để hiển thị.
                                    </div>
                                ) : (
                                    filteredReports.map((report) => (
                                        <div
                                            key={report.id}
                                            className={`violation-card-item ${selectedReport?.id === report.id ? "selected" : ""} ${report.status}`}
                                            onClick={() => setSelectedReport(report)}
                                        >
                                            <div className="card-item-header">
                                                <span className="card-report-code">RP-{report.id}</span>
                                                <span className="card-report-date">{formatDateTimeShort(report.createdAt)}</span>
                                            </div>

                                            <div className="card-item-body">
                                                <div className="card-target-row">
                                                    <span className="card-target-type-badge">
                                                        {getTargetTypeLabel(report.targetType)}
                                                    </span>
                                                    <strong className="card-target-name">
                                                        {report.targetName || `ID: ${report.targetId}`}
                                                    </strong>
                                                </div>
                                                <p className="card-report-reason">{report.reason}</p>
                                            </div>

                                            <div className="card-item-footer">
                                                <div className="card-badges-row">
                                                    <span className={`severity-badge ${report.severity || "unknown"}`}>
                                                        {getSeverityLabel(report.severity)}
                                                    </span>
                                                    <span className={`report-status-badge ${report.status}`}>
                                                        {getStatusLabel(report.status)}
                                                    </span>
                                                </div>
                                                {report.reporterName && (
                                                    <span className="card-reporter-name">
                                                        Gửi bởi: {report.reporterName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <aside className="violation-detail-panel">
                            {selectedReport ? (
                                <>
                                    <div className="detail-panel-header">
                                        <div>
                                            <span className="detail-report-code">RP-{selectedReport.id}</span>
                                            <h3>Chi tiết báo cáo</h3>
                                        </div>
                                        <span className={`report-status-badge ${selectedReport.status}`}>
                                            {getStatusLabel(selectedReport.status)}
                                        </span>
                                    </div>

                                    <div className="detail-section">
                                        <h4>Thông tin báo cáo</h4>

                                        <div className="detail-info-list">
                                            <div>
                                                <span>Người báo cáo</span>
                                                <strong>{selectedReport.reporterName || `User ID: ${selectedReport.reporterId}`}</strong>
                                            </div>

                                            <div>
                                                <span>Đối tượng</span>
                                                <strong>{getTargetTypeLabel(selectedReport.targetType)}</strong>
                                            </div>

                                            <div>
                                                <span>ID đối tượng</span>
                                                <strong>{selectedReport.targetId}</strong>
                                            </div>

                                            <div>
                                                <span>Ngày gửi</span>
                                                <strong>{formatDateTime(selectedReport.createdAt)}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="detail-section">
                                        <h4>Lý do vi phạm</h4>
                                        <p className="detail-reason">{selectedReport.reason}</p>
                                    </div>

                                    <div className="detail-section">
                                        <h4>Mô tả từ người dùng</h4>
                                        <p className="detail-description">
                                            {selectedReport.description || "Người dùng chưa cung cấp mô tả chi tiết."}
                                        </p>
                                    </div>

                                    <div className="ai-insight-box">
                                        <div className="ai-insight-header">
                                            <strong>Gợi ý kiểm tra</strong>
                                            <span>Admin Review</span>
                                        </div>
                                        <p>
                                            Kiểm tra nội dung báo cáo, lịch sử giao dịch, sản phẩm liên quan
                                            và hành vi của tài khoản trước khi đưa ra quyết định xử lý.
                                        </p>

                                        {/* TODO BACKEND:
                        Nếu sau này dùng bảng ai_content_moderation,
                        có thể hiển thị kết quả kiểm duyệt AI tại đây:
                        - isSafe
                        - flaggedReason
                        - checkedAt
                    */}
                                    </div>

                                    <div className="detail-section">
                                        <h4>Ghi chú xử lý</h4>
                                        <textarea
                                            className="resolution-note-input"
                                            value={resolutionNote}
                                            onChange={(e) => setResolutionNote(e.target.value)}
                                            placeholder="Nhập ghi chú trước khi xử lý báo cáo..."
                                        />
                                    </div>

                                    <div className="violation-action-area">
                                        {/* Lock button: only for farmer/customer reports */}
                                        {(selectedReport.targetType === "farmer" ||
                                            selectedReport.targetType === "customer") && (
                                                <button
                                                    className="btn-remove-product"
                                                    onClick={handleLockTargetAccount}
                                                    disabled={selectedReport.status === "resolved" || selectedReport.status === "rejected"}
                                                    title={selectedReport.status === "resolved" || selectedReport.status === "rejected" ? "Báo cáo đã kết thúc" : "Khóa tài khoản liên quan"}
                                                >
                                                    Khóa tài khoản liên quan
                                                </button>
                                            )}

                                        {/* Hide button: only for product reports */}
                                        {selectedReport.targetType === "product" && (
                                            <button
                                                className="btn-remove-product"
                                                onClick={handleHideProduct}
                                                disabled={selectedReport.status === "resolved" || selectedReport.status === "rejected"}
                                                title={selectedReport.status === "resolved" || selectedReport.status === "rejected" ? "Báo cáo đã kết thúc" : "Ẩn sản phẩm"}
                                            >
                                                Ẩn sản phẩm
                                            </button>
                                        )}

                                        <div className="action-two-columns">
                                            <button
                                                className="btn-warning-action"
                                                onClick={() => handleUpdateReportStatus("reviewing")}
                                                disabled={selectedReport.status === "resolved" || selectedReport.status === "rejected" || selectedReport.status === "reviewing"}
                                                title={selectedReport.status === "reviewing" ? "Đã đánh dấu đang xém xét" : undefined}
                                            >
                                                Đánh dấu đang xử lý
                                            </button>

                                            <button
                                                className="btn-dismiss-action"
                                                onClick={() => handleUpdateReportStatus("rejected")}
                                                disabled={selectedReport.status === "resolved" || selectedReport.status === "rejected"}
                                            >
                                                Từ chối báo cáo
                                            </button>
                                        </div>

                                        <button
                                            className="btn-resolve-action"
                                            onClick={() => handleUpdateReportStatus("resolved")}
                                            disabled={selectedReport.status === "resolved" || selectedReport.status === "rejected"}
                                        >
                                            Hoàn tất xử lý
                                        </button>

                                        {(selectedReport.status === "resolved" || selectedReport.status === "rejected") && (
                                            <p className="report-closed-notice">
                                                🔒 Báo cáo này đã được kết thúc và không thể thay đổi.
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="empty-detail-panel">
                                    <div className="empty-detail-icon">📋</div>
                                    <h3>Chưa chọn báo cáo</h3>
                                    <p>
                                        Chọn một báo cáo trong danh sách bên trái để xem chi tiết
                                        và thực hiện thao tác xử lý.
                                    </p>
                                </div>
                            )}
                        </aside>
                    </section>
                </main>
            </div>

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
}