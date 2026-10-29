import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell } from "lucide-react";
import authService from "../../../services/authService";
import { getFullImageUrl } from "../../../services/productService";

const AdminHeader = ({ searchQuery, setSearchQuery, searchPlaceholder, showToast }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
  }, []);

  const handleNotificationClick = () => {
    if (showToast) {
      showToast("Không có thông báo mới.");
    } else {
      alert("Không có thông báo mới.");
    }
  };

  const handleLinkClick = (name) => {
    if (name === "Hỗ trợ") {
      navigate("/admin/complaints");
    } else if (name === "Báo cáo") {
      navigate("/admin/reports");
    } else if (name === "Đối soát") {
      navigate("/admin/transactions");
    } else {
      if (showToast) {
        showToast(`Đang chuyển tới ${name}...`);
      } else {
        alert(`Đang chuyển tới ${name}...`);
      }
    }
  };

  return (
    <header className="admin-header">
      <div className="admin-search-wrapper">
        <span className="admin-search-icon" style={{ display: "inline-flex", alignItems: "center" }}>
          <Search size={16} />
        </span>
        <input
          type="text"
          placeholder={searchPlaceholder || "Tìm kiếm..."}
          className="admin-search-input"
          value={searchQuery || ""}
          onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
        />
      </div>

      <div className="admin-header-actions">
        <div style={{ display: "flex", gap: "20px", fontSize: "14px", color: "var(--admin-text-muted)", fontWeight: "500" }}>
          <span style={{ cursor: "pointer" }} onClick={() => handleLinkClick("Báo cáo")}>Báo cáo</span>
          <span style={{ cursor: "pointer" }} onClick={() => handleLinkClick("Đối soát")}>Đối soát</span>
          <span style={{ cursor: "pointer" }} onClick={() => handleLinkClick("Hỗ trợ")}>Hỗ trợ</span>
        </div>
        <div style={{ width: "1px", height: "20px", backgroundColor: "var(--admin-border)" }}></div>
        <button 
          className="admin-notification-btn" 
          aria-label="Notifications" 
          onClick={handleNotificationClick} 
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        >
          <Bell size={18} />
          <span className="admin-notification-dot"></span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => navigate("/profile")}>
          <div className="admin-footer-avatar-wrap" style={{ width: "auto", minWidth: "auto" }}>
            <img
              src={getFullImageUrl(currentUser?.avatarUrl) || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"}
              alt="Admin profile"
              className="admin-footer-avatar"
              style={{ width: "32px", height: "32px" }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150";
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
