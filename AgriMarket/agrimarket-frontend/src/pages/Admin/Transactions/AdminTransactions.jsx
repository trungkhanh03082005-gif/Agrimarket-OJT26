import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Bell,
    Search,
    Download,
    DollarSign,
    Check,
    AlertCircle,
    CreditCard,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    X,
} from "lucide-react";
import AdminSidebar from "../../../components/common/Sidebar/AdminSidebar";
import AdminHeader from "../../../components/common/Header/AdminHeader";
import {
    getAdminTransactions,
    exportTransactionsCsv,
} from "../../../services/transactionService";
import "../AdminStyles.css";
import "./AdminTransactions.css";

const PAGE_SIZE = 10;

// Helper to get local date in YYYY-MM-DD format
const getTodayStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

// Helper to get the day before a given date string (YYYY-MM-DD)
const getDayBefore = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

// Helper to get the day after a given date string (YYYY-MM-DD)
const getDayAfter = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

const AdminTransactions = () => {
    // ─── Filter state ────────────────────────────────────────────
    const [keyword, setKeyword] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("all");
    const [status, setStatus] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // ─── Data state ──────────────────────────────────────────────
    const [transactions, setTransactions] = useState([]);
    const [statistics, setStatistics] = useState({
        totalRevenue: 0,
        successTransactions: 0,
        failedTransactions: 0,
        successRate: 0,
    });
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(0);

    // ─── UI state ────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);

    // ─── Detail modal ─────────────────────────────────────────────
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    // ─── Debounce keyword ─────────────────────────────────────────
    const debounceRef = useRef(null);
    const [debouncedKeyword, setDebouncedKeyword] = useState("");

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedKeyword(keyword);
            setCurrentPage(0);
        }, 400);
        return () => clearTimeout(debounceRef.current);
    }, [keyword]);

    // ─── Fetch data ───────────────────────────────────────────────
    const fetchTransactions = useCallback(async () => {
        const today = getTodayStr();
        if (fromDate && fromDate > today) {
            setError("Ngày bắt đầu không được lớn hơn ngày hiện tại.");
            setTransactions([]);
            setTotalElements(0);
            setTotalPages(1);
            setLoading(false);
            return;
        }
        if (toDate && toDate > today) {
            setError("Ngày kết thúc không được lớn hơn ngày hiện tại.");
            setTransactions([]);
            setTotalElements(0);
            setTotalPages(1);
            setLoading(false);
            return;
        }
        if (fromDate && toDate && fromDate >= toDate) {
            setError("Ngày bắt đầu phải nhỏ hơn ngày kết thúc.");
            setTransactions([]);
            setTotalElements(0);
            setTotalPages(1);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await getAdminTransactions({
                keyword: debouncedKeyword,
                paymentMethod,
                status,
                fromDate,
                toDate,
                page: currentPage,
                size: PAGE_SIZE,
            });

            setTransactions(data.content || []);
            setTotalElements(data.totalElements || 0);
            setTotalPages(data.totalPages || 1);

            if (data.stats) {
                setStatistics({
                    totalRevenue: data.stats.totalRevenue || 0,
                    successTransactions: data.stats.successTransactions || 0,
                    failedTransactions: data.stats.failedTransactions || 0,
                    successRate: data.stats.successRate || 0,
                });
            }
        } catch (err) {
            console.error("Lỗi tải danh sách giao dịch:", err);
            setError("Không thể tải danh sách giao dịch. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, [debouncedKeyword, paymentMethod, status, fromDate, toDate, currentPage]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    // ─── Handlers ─────────────────────────────────────────────────
    const handleFilter = () => {
        setCurrentPage(0);
        fetchTransactions();
    };

    const handleResetFilter = () => {
        setKeyword("");
        setDebouncedKeyword("");
        setPaymentMethod("all");
        setStatus("all");
        setFromDate("");
        setToDate("");
        setCurrentPage(0);
    };

    const handleExportCSV = async () => {
        setExporting(true);
        try {
            await exportTransactionsCsv({
                keyword: debouncedKeyword,
                paymentMethod,
                status,
                fromDate,
                toDate,
            });
        } catch (err) {
            alert(err.message || "Xuất CSV thất bại.");
        } finally {
            setExporting(false);
        }
    };

    const handleViewDetail = (transaction) => {
        setSelectedTransaction(transaction);
    };

    const handleCloseDetail = () => {
        setSelectedTransaction(null);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 0 && newPage < totalPages) {
            setCurrentPage(newPage);
        }
    };

    // ─── Formatters ───────────────────────────────────────────────
    const formatCurrency = (value) =>
        new Intl.NumberFormat("vi-VN").format(value || 0);

    const formatDateTime = (dateValue) => {
        if (!dateValue) return "—";
        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(dateValue));
    };

    const getStatusLabel = (s) => {
        switch (s) {
            case "paid": return "Thành công";
            case "success": return "Thành công";
            case "failed": return "Thất bại";
            case "refunded": return "Hoàn tiền";
            case "pending": return "Đang xử lý";
            case "unpaid": return "Chưa thanh toán";
            default: return s || "—";
        }
    };

    const getStatusClass = (s) => {
        switch (s) {
            case "paid":
            case "success": return "success";
            case "failed": return "failed";
            case "refunded": return "refunded";
            case "pending": return "pending";
            case "unpaid": return "pending";
            default: return "unknown";
        }
    };

    // ─── Render ───────────────────────────────────────────────────
    return (
        <div className="admin-layout">
            <AdminSidebar activeItem="transactions" />

            <div className="admin-main-container">
                <AdminHeader
                    searchQuery={keyword}
                    setSearchQuery={setKeyword}
                    searchPlaceholder="Tìm kiếm giao dịch..."
                />

                {/* Page Body */}
                <main className="admin-page-body">
                    <div className="admin-transactions-page">
                        {/* Page Title */}
                        <div className="transactions-header">
                            <div>
                                <p className="breadcrumb">Admin / Giao dịch</p>
                                <h1>Danh sách Giao dịch</h1>
                                <p className="page-description">
                                    Quản lý giao dịch,{" "}
                                    <a href="#">thanh toán</a> và trạng thái đơn hàng trong hệ thống.
                                </p>
                            </div>

                            <button
                                className="export-btn"
                                onClick={handleExportCSV}
                                disabled={exporting}
                            >
                                {exporting ? (
                                    <RefreshCw size={18} className="spin" />
                                ) : (
                                    <Download size={18} />
                                )}
                                {exporting ? "Đang xuất..." : "Xuất báo cáo CSV"}
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="transaction-stats-grid">
                            <div className="transaction-stat-card">
                                <div className="stat-icon revenue">
                                    <DollarSign size={20} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-top">
                                        <p>Tổng doanh thu</p>
                                        <span>từ giao dịch thành công</span>
                                    </div>
                                    <h3>{formatCurrency(statistics.totalRevenue)}</h3>
                                    <small>VNĐ</small>
                                </div>
                            </div>

                            <div className="transaction-stat-card">
                                <div className="stat-icon success">
                                    <Check size={20} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-top">
                                        <p>Giao dịch thành công</p>
                                        <span>{statistics.successRate}% thành công</span>
                                    </div>
                                    <h3>{formatCurrency(statistics.successTransactions)}</h3>
                                    <small>giao dịch</small>
                                </div>
                            </div>

                            <div className="transaction-stat-card">
                                <div className="stat-icon failed">
                                    <AlertCircle size={20} />
                                </div>
                                <div className="stat-content">
                                    <p>Giao dịch thất bại</p>
                                    <h3>{formatCurrency(statistics.failedTransactions)}</h3>
                                    <small>giao dịch</small>
                                </div>
                            </div>
                        </div>

                        {/* Filter */}
                        <div className="transaction-filter-box">
                            <div className="filter-row">
                                <div className="admin-transaction-search-box">
                                    <span className="admin-search-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                                        <Search size={16} />
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Tìm mã giao dịch, mã đơn, tên khách hàng, email..."
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                    />
                                </div>

                                <select
                                    value={paymentMethod}
                                    onChange={(e) => {
                                        setPaymentMethod(e.target.value);
                                        setCurrentPage(0);
                                    }}
                                >
                                    <option value="all">Cổng thanh toán</option>
                                    <option value="VNPay">VNPay</option>
                                    <option value="COD">COD</option>
                                    <option value="ATM">ATM</option>
                                    <option value="QR">QR</option>
                                </select>

                                <select
                                    value={status}
                                    onChange={(e) => {
                                        setStatus(e.target.value);
                                        setCurrentPage(0);
                                    }}
                                >
                                    <option value="all">Trạng thái</option>
                                    <option value="paid">Thành công</option>
                                    <option value="unpaid">Chưa thanh toán</option>
                                    <option value="pending">Đang xử lý</option>
                                    <option value="failed">Thất bại</option>
                                    <option value="refunded">Hoàn tiền</option>
                                </select>
                            </div>

                            <div className="filter-row date-row">
                                <input
                                    type="date"
                                    value={fromDate}
                                    max={toDate ? getDayBefore(toDate) : getTodayStr()}
                                    onChange={(e) => setFromDate(e.target.value)}
                                />
                                <span className="date-separator">đến</span>
                                <input
                                    type="date"
                                    value={toDate}
                                    min={fromDate ? getDayAfter(fromDate) : ""}
                                    max={getTodayStr()}
                                    onChange={(e) => setToDate(e.target.value)}
                                />

                                <button className="filter-btn" onClick={handleFilter} disabled={loading}>
                                    {loading ? <RefreshCw size={14} className="spin" /> : null}
                                    Lọc
                                </button>

                                <button
                                    className="filter-btn"
                                    style={{ background: "#f1f5f9", color: "#64748b" }}
                                    onClick={handleResetFilter}
                                >
                                    Xoá bộ lọc
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="error-banner" style={{
                                background: "#fef2f2",
                                border: "1px solid #fca5a5",
                                borderRadius: "8px",
                                padding: "12px 16px",
                                marginBottom: "16px",
                                color: "#dc2626",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                            }}>
                                <AlertCircle size={16} />
                                {error}
                                <button
                                    onClick={fetchTransactions}
                                    style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontWeight: 600 }}
                                >
                                    Thử lại
                                </button>
                            </div>
                        )}

                        {/* Table */}
                        <div className="transaction-table-card">
                            <div className="table-wrapper">
                                <table className="transaction-table">
                                    <thead>
                                        <tr>
                                            <th>Mã giao dịch</th>
                                            <th>Mã đơn</th>
                                            <th>Khách hàng</th>
                                            <th>Số tiền</th>
                                            <th>Phương thức</th>
                                            <th>Trạng thái</th>
                                            <th>Thời gian</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="8">
                                                    <div className="empty-state">
                                                        <RefreshCw size={36} className="spin" style={{ color: "#94a3b8" }} />
                                                        <p style={{ marginTop: "12px", color: "#64748b" }}>Đang tải dữ liệu...</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : transactions.length > 0 ? (
                                            transactions.map((transaction) => (
                                                <tr key={transaction.id}>
                                                    <td className="transaction-code">
                                                        {transaction.transactionCode || "—"}
                                                    </td>

                                                    <td>
                                                        <strong>{transaction.orderCode || "—"}</strong>
                                                    </td>

                                                    <td>
                                                        <div className="customer-info">
                                                            <strong>{transaction.customerName || "—"}</strong>
                                                            <span>{transaction.customerEmail || "—"}</span>
                                                        </div>
                                                    </td>

                                                    <td className="amount">
                                                        {formatCurrency(transaction.amount)} đ
                                                    </td>

                                                    <td>{transaction.paymentMethod || "—"}</td>

                                                    <td>
                                                        <span className={`status-badge ${getStatusClass(transaction.status)}`}>
                                                            {getStatusLabel(transaction.status)}
                                                        </span>
                                                    </td>

                                                    <td>{formatDateTime(transaction.createdAt)}</td>

                                                    <td>
                                                        <button
                                                            className="detail-btn"
                                                            onClick={() => handleViewDetail(transaction)}
                                                        >
                                                            Chi tiết
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="8">
                                                    <div className="empty-state">
                                                        <div className="empty-icon">
                                                            <CreditCard size={48} />
                                                        </div>
                                                        <h3>Chưa có dữ liệu giao dịch</h3>
                                                        <p>
                                                            {keyword || paymentMethod !== "all" || status !== "all" || fromDate || toDate
                                                                ? "Không tìm thấy giao dịch phù hợp với bộ lọc."
                                                                : "Các giao dịch sẽ xuất hiện ở đây khi có đơn hàng."}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer / Pagination */}
                            <div className="table-footer">
                                <p>
                                    Hiển thị {transactions.length} / {totalElements} giao dịch
                                </p>

                                <div className="pagination">
                                    <button
                                        disabled={currentPage === 0}
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>

                                    {Array.from({ length: totalPages }, (_, i) => i).map((p) => (
                                        <button
                                            key={p}
                                            className={currentPage === p ? "active" : ""}
                                            onClick={() => handlePageChange(p)}
                                        >
                                            {p + 1}
                                        </button>
                                    ))}

                                    <button
                                        disabled={currentPage >= totalPages - 1}
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Detail Modal */}
            {selectedTransaction && (
                <div
                    className="modal-overlay"
                    onClick={handleCloseDetail}
                    style={{
                        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        zIndex: 1000,
                    }}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "#fff",
                            borderRadius: "16px",
                            padding: "32px",
                            minWidth: "420px",
                            maxWidth: "520px",
                            width: "100%",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                            position: "relative",
                        }}
                    >
                        <button
                            onClick={handleCloseDetail}
                            style={{
                                position: "absolute", top: "16px", right: "16px",
                                background: "none", border: "none", cursor: "pointer",
                                color: "#94a3b8", padding: "4px",
                            }}
                        >
                            <X size={20} />
                        </button>

                        <h2 style={{ marginBottom: "20px", fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
                            Chi tiết Giao dịch
                        </h2>

                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {[
                                ["Mã giao dịch", selectedTransaction.transactionCode],
                                ["Mã đơn hàng", selectedTransaction.orderCode],
                                ["Khách hàng", selectedTransaction.customerName],
                                ["Email", selectedTransaction.customerEmail],
                                ["Số điện thoại", selectedTransaction.customerPhone],
                                ["Số tiền", `${formatCurrency(selectedTransaction.amount)} đ`],
                                ["Phương thức", selectedTransaction.paymentMethod],
                                ["Trạng thái", getStatusLabel(selectedTransaction.status)],
                                ["Thời gian", formatDateTime(selectedTransaction.createdAt)],
                            ].map(([label, value]) => (
                                <div
                                    key={label}
                                    style={{
                                        display: "flex", justifyContent: "space-between",
                                        padding: "8px 0", borderBottom: "1px solid #f1f5f9",
                                    }}
                                >
                                    <span style={{ color: "#64748b", fontSize: "14px" }}>{label}</span>
                                    <span style={{ color: "#0f172a", fontSize: "14px", fontWeight: 500 }}>{value || "—"}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleCloseDetail}
                            style={{
                                marginTop: "24px", width: "100%", padding: "10px",
                                background: "#10b981", color: "#fff", border: "none",
                                borderRadius: "8px", cursor: "pointer", fontWeight: 600,
                                fontSize: "14px",
                            }}
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTransactions;
