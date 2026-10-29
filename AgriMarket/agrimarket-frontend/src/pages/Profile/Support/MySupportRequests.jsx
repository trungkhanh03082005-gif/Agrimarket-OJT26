import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, FolderOpen, ArrowLeft } from "lucide-react";
import Header from "../../../components/common/Header/Header";
import Footer from "../../../components/common/Footer/Footer";
import supportRequestService from "../../../services/supportRequestService";
import authService from "../../../services/authService";
import "./MySupportRequests.css";

export default function MySupportRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, OPEN, PROCESSING, CLOSED
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate("/login");
      return;
    }
    setUser(currentUser);

    const fetchRequests = async () => {
      try {
        const data = await supportRequestService.getMyRequests();
        setRequests(data);
      } catch (err) {
        console.error("Lỗi khi tải danh sách yêu cầu:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [navigate]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = { ALL: 0, OPEN: 0, PROCESSING: 0, CLOSED: 0 };
    requests.forEach(req => {
      counts.ALL++;
      const status = req.status.toLowerCase();
      if (status === "pending" || status === "assigned") {
        counts.OPEN++;
      } else if (status === "processing") {
        counts.PROCESSING++;
      } else if (status === "resolved" || status === "rejected") {
        counts.CLOSED++;
      }
    });
    return counts;
  }, [requests]);

  // Filtered requests based on active tab and search query
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // 1. Filter by Tab
      const status = req.status.toLowerCase();
      if (activeTab === "OPEN" && status !== "pending" && status !== "assigned") return false;
      if (activeTab === "PROCESSING" && status !== "processing") return false;
      if (activeTab === "CLOSED" && status !== "resolved" && status !== "rejected") return false;

      // 2. Filter by Search Query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const idMatch = `REQ-${req.id}`.toLowerCase().includes(query) || String(req.id).includes(query);
        const titleMatch = req.title.toLowerCase().includes(query);
        const descMatch = req.description.toLowerCase().includes(query);
        const categoryMatch = req.category.toLowerCase().includes(query);
        return idMatch || titleMatch || descMatch || categoryMatch;
      }

      return true;
    });
  }, [requests, activeTab, searchQuery]);

  const getStatusClass = (status) => {
    switch (status) {
      case "pending":
        return "status-badge-pending";
      case "assigned":
        return "status-badge-assigned";
      case "processing":
        return "status-badge-processing";
      case "resolved":
        return "status-badge-resolved";
      case "rejected":
        return "status-badge-rejected";
      default:
        return "";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "Mở";
      case "assigned":
        return "Đã giao";
      case "processing":
        return "Đang xử lý";
      case "resolved":
        return "Đã đóng";
      case "rejected":
        return "Từ chối";
      default:
        return status;
    }
  };

  // Export list of requests to CSV
  const handleExportCSV = () => {
    if (filteredRequests.length === 0) {
      alert("Không có dữ liệu để xuất!");
      return;
    }

    const headers = ["Mã yêu cầu", "Tiêu đề", "Danh mục", "Độ ưu tiên", "Trạng thái", "Ngày tạo", "Nội dung mô tả", "Phản hồi Admin"];
    const csvRows = [headers.join(",")];

    filteredRequests.forEach(req => {
      const row = [
        `REQ-${req.id}`,
        `"${req.title.replace(/"/g, '""')}"`,
        `"${req.category}"`,
        req.priority,
        req.status,
        new Date(req.createdAt).toLocaleDateString(),
        `"${req.description.replace(/"/g, '""').substring(0, 100)}..."`,
        req.adminNotes ? `"${req.adminNotes.replace(/"/g, '""')}"` : '""'
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `YeuCauHoTro_AgriMarket_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="my-requests-page">
      <Header activeTab="support" />

      <div className="my-requests-container">
        {/* Page Title & Top Actions */}
        <div className="my-requests-header">
          <div>
            <h1>Yêu cầu Hỗ trợ của tôi</h1>
            <p className="my-requests-subtitle">Quản lý và theo dõi trạng thái các yêu cầu của bạn.</p>
          </div>
          <div className="header-action-buttons">
            <button 
              className="action-btn-secondary"
              onClick={handleExportCSV}
            >
              📥 Xuất danh sách
            </button>
            <button 
              className="action-btn-primary btn-primary-green"
              onClick={() => navigate("/support/create")}
            >
              ＋ Tạo yêu cầu mới
            </button>
          </div>
        </div>

        {/* Filters and Search Area */}
        <div className="filter-search-card glass-card-main">
          {/* Tab Filters */}
          <div className="tab-filters-row">
            <button 
              className={`filter-tab-btn ${activeTab === "ALL" ? "active" : ""}`}
              onClick={() => setActiveTab("ALL")}
            >
              Tất cả <span className="tab-count-badge">{tabCounts.ALL}</span>
            </button>
            <button 
              className={`filter-tab-btn ${activeTab === "OPEN" ? "active" : ""}`}
              onClick={() => setActiveTab("OPEN")}
            >
              Đang mở <span className="tab-count-badge">{tabCounts.OPEN}</span>
            </button>
            <button 
              className={`filter-tab-btn ${activeTab === "PROCESSING" ? "active" : ""}`}
              onClick={() => setActiveTab("PROCESSING")}
            >
              Đang xử lý <span className="tab-count-badge">{tabCounts.PROCESSING}</span>
            </button>
            <button 
              className={`filter-tab-btn ${activeTab === "CLOSED" ? "active" : ""}`}
              onClick={() => setActiveTab("CLOSED")}
            >
              Đã đóng <span className="tab-count-badge">{tabCounts.CLOSED}</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="search-bar-wrapper">
            <Search className="search-icon" size={16} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Tìm theo ID, tiêu đề, danh mục..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery("")} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={14} /></button>
            )}
          </div>
        </div>

        {/* Requests Table */}
        <div className="table-card glass-card-main">
          {loading ? (
            <div className="table-loading">Đang tải danh sách yêu cầu...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="table-empty-state">
              <span className="empty-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><FolderOpen size={40} /></span>
              <h3>Không tìm thấy yêu cầu hỗ trợ nào</h3>
              <p>Thử thay đổi bộ lọc hoặc tìm kiếm bằng từ khóa khác.</p>
            </div>
          ) : (
            <div className="table-responsive-container">
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>Mã yêu cầu</th>
                    <th>Tiêu đề & Chi tiết</th>
                    <th>Danh mục</th>
                    <th>Trạng thái</th>
                    <th>Cập nhật cuối</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="request-table-row">
                      <td className="col-id">REQ-{req.id}</td>
                      <td className="col-title" onClick={() => navigate(`/support/detail/${req.id}`)}>
                        <div className="title-text">{req.title}</div>
                        <div className="desc-preview-text">{req.description}</div>
                      </td>
                      <td className="col-category">
                        <span className="category-tag">{req.category}</span>
                      </td>
                      <td className="col-status">
                        <span className={`status-badge-table ${getStatusClass(req.status)}`}>
                          {getStatusLabel(req.status)}
                        </span>
                      </td>
                      <td className="col-date">
                        {new Date(req.updatedAt || req.createdAt).toLocaleString()}
                      </td>
                      <td className="col-actions">
                        <button 
                          className="action-icon-btn tooltip-btn" 
                          title="Xem chi tiết"
                          onClick={() => navigate(`/support/detail/${req.id}`)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="eye-icon">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination placeholder matching Screen 4 */}
        {filteredRequests.length > 0 && (
          <div className="pagination-footer-row">
            <span className="pagination-info">
              Hiển thị 1 đến {filteredRequests.length} trong tổng số {filteredRequests.length} mục
            </span>
            <div className="pagination-nav-buttons">
              <button className="page-nav-btn disabled" disabled>‹</button>
              <button className="page-nav-btn active">1</button>
              <button className="page-nav-btn disabled" disabled>›</button>
            </div>
          </div>
        )}

        <button 
          className="back-to-hub-btn-bottom"
          onClick={() => navigate("/support")}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><ArrowLeft size={14} /> Quay lại Trung tâm hỗ trợ</span>
        </button>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
