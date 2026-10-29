import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  FolderTree,
  ShoppingBag,
  CreditCard,
  HelpCircle,
  BarChart2,
  Video,
  Bell,
  LogOut,
  Tag
} from "lucide-react";
import authService from "../../../services/authService";

const AdminSidebar = ({ activeItem, showToast, onProductsClick, onComplaintsClick }) => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
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

  const handleShowToast = (msg) => {
    if (showToast) {
      showToast(msg);
    } else {
      alert(msg);
    }
  };

  return (
    <aside className="admin-sidebar">
      <div className="admin-logo-section">
        <Link to="/admin/dashboard" className="admin-logo-link">
          <div className="admin-logo-link-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle>
              <path d="M7 16h11v-2H9v-3h7V9H9V6H7v10z"></path><path d="M16 9h3l2 3v4"></path>
            </svg>
          </div>
          <div className="nav-label" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h1 style={{ margin: 0, fontSize: "19px", fontWeight: 800, color: "#0f766e", lineHeight: 1.1 }}>AgriAdmin</h1>
            <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "var(--admin-text-muted)", fontWeight: "600", textTransform: "none", letterSpacing: "normal" }}>Quản lý hệ thống</p>
          </div>
        </Link>
      </div>

      <nav className="admin-nav-menu">
        <button className={`admin-nav-item ${activeItem === "dashboard" ? "active" : ""}`} onClick={() => navigate("/admin/dashboard")}>
          <span className="admin-nav-icon">
            <LayoutDashboard className="admin-nav-icon-svg" size={18} />
          </span>
          <span className="nav-label">Tổng quan</span>
        </button>

        <button className={`admin-nav-item ${activeItem === "users" ? "active" : ""}`} onClick={() => navigate("/admin/users")}>
          <span className="admin-nav-icon">
            <Users className="admin-nav-icon-svg" size={18} />
          </span>
          <span className="nav-label">Quản lý tài khoản</span>
        </button>

        <button className={`admin-nav-item ${activeItem === "products" ? "active" : ""}`} onClick={() => { if (onProductsClick) { onProductsClick(); } navigate("/admin/products"); }}>
          <span className="admin-nav-icon">
            <CheckSquare className="admin-nav-icon-svg" size={18} />
          </span>
          <span className="nav-label">Duyệt sản phẩm</span>
        </button>

        <button className={`admin-nav-item ${activeItem === "categories" ? "active" : ""}`} onClick={() => navigate("/admin/categories")}>
          <span className="admin-nav-icon">
            <FolderTree className="admin-nav-icon-svg" size={18} />
          </span>
          <span className="nav-label">Danh mục</span>
        </button>

        <button className={`admin-nav-item ${activeItem === "orders" ? "active" : ""}`} onClick={() => navigate("/admin/orders")}>
          <span className="admin-nav-icon">
            <ShoppingBag className="admin-nav-icon-svg" size={18} />
          </span>
          <span className="nav-label">Đơn hàng</span>
        </button>

        <button className={`admin-nav-item ${activeItem === "transactions" ? "active" : ""}`} onClick={() => navigate("/admin/transactions")}>
          <span className="admin-nav-icon">
            <CreditCard className="admin-nav-icon-svg" size={18} />
          </span>
          <span className="nav-label">Giao dịch</span>
        </button>

        <button className={`admin-nav-item ${activeItem === "complaints" ? "active" : ""}`} onClick={() => { if (onComplaintsClick) { onComplaintsClick(); } navigate("/admin/complaints"); }}>
          <span className="admin-nav-icon">
            <HelpCircle className="admin-nav-icon-svg" size={18} />
          </span>
          <span className="nav-label">Hỗ trợ</span>
        </button>

        <button className={`admin-nav-item ${activeItem === "reports" ? "active" : ""}`} onClick={() => navigate("/admin/reports")}>
          <span className="admin-nav-icon">
            <BarChart2 className="admin-nav-icon-svg" size={18} />
          </span>
          <span className="nav-label">Báo cáo</span>
        </button>

        <button className={`admin-nav-item ${activeItem === "promotions" ? "active" : ""}`} onClick={() => navigate("/admin/promotions")}>
          <span className="admin-nav-icon">
            <Tag className="admin-nav-icon-svg" size={18} />
          </span>
          <span className="nav-label">Khuyến mãi</span>
        </button>

        <button className={`admin-nav-item ${activeItem === "livestreams" ? "active" : ""}`} onClick={() => navigate("/admin/livestreams")}>
          <span className="admin-nav-icon">
            <Video className="admin-nav-icon-svg" size={18} />
          </span>
          <span className="nav-label">Quản lý Livestream</span>
        </button>

        <button className={`admin-nav-item ${activeItem === "notifications" ? "active" : ""}`} onClick={() => navigate("/admin/notifications")}>
          <span className="admin-nav-icon">
            <Bell className="admin-nav-icon-svg" size={18} />
          </span>
          <span className="nav-label">Thông báo</span>
        </button>

        <button className="admin-nav-item logout-item" onClick={handleLogout}>
          <span className="admin-nav-icon">
            <LogOut className="admin-nav-icon-svg" size={18} />
          </span>
          <span className="nav-label">Đăng xuất</span>
        </button>
      </nav>

      {/* Sidebar Footer */}
      <div className="admin-sidebar-footer">
        <div className="admin-footer-avatar-wrap">
          <img
            src={getFullImageUrl(currentUser?.avatarUrl) || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"}
            alt="Avatar admin"
            className="admin-footer-avatar"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150";
            }}
          />
        </div>
        <div className="admin-footer-info">
          <p className="admin-footer-name">{currentUser?.fullName || "Quản trị viên"}</p>
          <p className="admin-footer-email">{currentUser?.email || "admin@agriadmin.com"}</p>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
