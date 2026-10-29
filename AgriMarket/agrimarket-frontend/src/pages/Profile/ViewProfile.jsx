import { useState } from "react";
import { AlertTriangle, Smartphone, Sprout, Home, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useProfile from "../../hooks/useProfile";
import ProfileLayout from "../../components/profile/ProfileLayout";
import ProfileHeader from "../../components/profile/ProfileHeader";
import ProfileOverviewCard from "../../components/profile/ProfileOverviewCard";
import CustomerInfoCard from "../../components/profile/CustomerInfoCard";
import FarmerInfoCard from "../../components/profile/FarmerInfoCard";
import AdminInfoCard from "../../components/profile/AdminInfoCard";
import ProfileActionCards from "../../components/profile/ProfileActionCards";
import ProfileFooter from "../../components/profile/ProfileFooter";
import { USER_ROLES } from "../../constants/profileConstants";
import "./Profile.css";

const ViewProfile = () => {
  const navigate = useNavigate();

  const {
    profile,
    isProfileLoading,
    profileError,
  } = useProfile();

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: null });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3000);
  };

  if (isProfileLoading) {
    return (
      <div className="profile-center-state">
        Đang tải thông tin hồ sơ...
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="profile-center-state">
        {profileError}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-center-state">
        <h2>Bạn chưa đăng nhập</h2>
        <p>Vui lòng đăng nhập để xem thông tin hồ sơ.</p>

        <button
          className="profile-primary-button"
          onClick={() => navigate("/login")}
        >
          Đi tới đăng nhập
        </button>
      </div>
    );
  }

  return (
    <ProfileLayout profile={profile}>
      <section className="profile-content">
        <ProfileHeader
          title="Tổng quan hồ sơ"
          subtitle="Quản lý thông tin cá nhân và tài khoản của bạn."
        />

        {profile.passwordSet === false && (
          <div className="password-alert-banner" style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fef3c7",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            boxShadow: "0 4px 12px rgba(245, 158, 11, 0.05)"
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: "24px",
              color: "#d97706"
            }}><AlertTriangle size={24} /></div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: "0 0 4px 0", color: "#92400e", fontWeight: "700", fontSize: "15px" }}>
                Tài khoản chưa có mật khẩu đăng nhập trực tiếp
              </h4>
              <p style={{ margin: 0, color: "#b45309", fontSize: "13.5px", lineHeight: "1.5" }}>
                Bạn đang đăng nhập bằng tài khoản liên kết Google. Vui lòng{" "}
                <span 
                  onClick={() => navigate("/security")} 
                  style={{ textDecoration: "underline", cursor: "pointer", fontWeight: "600", color: "#b45309" }}
                >
                  thiết lập mật khẩu mới
                </span>{" "}
                để nâng cao bảo mật và có thể đăng nhập bằng email.
              </p>
            </div>
            <button 
              onClick={() => navigate("/security")} 
              style={{
                backgroundColor: "#d97706",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#b45309"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#d97706"}
            >
              Thiết lập ngay
            </button>
          </div>
        )}

        {/* Phone number update banner for Google users */}
        {!profile.phone && (
          <div className="password-alert-banner" style={{
            backgroundColor: "#eff6ff",
            border: "1px solid #dbeafe",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.05)"
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: "24px",
              color: "#2563eb"
            }}><Smartphone size={24} /></div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: "0 0 4px 0", color: "#1e3a8a", fontWeight: "700", fontSize: "15px" }}>
                Số điện thoại chưa được cập nhật
              </h4>
              <p style={{ margin: 0, color: "#1d4ed8", fontSize: "13.5px", lineHeight: "1.5" }}>
                Vui lòng{" "}
                <span
                  onClick={() => navigate("/profile/edit")}
                  style={{ textDecoration: "underline", cursor: "pointer", fontWeight: "600", color: "#1d4ed8" }}
                >
                  cập nhật số điện thoại
                </span>{" "}
                để nhận thông báo đơn hàng và bảo mật tài khoản tốt hơn.
              </p>
            </div>
            <button
              onClick={() => navigate("/profile/edit")}
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background-color 0.2s",
                whiteSpace: "nowrap"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#1d4ed8"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#2563eb"}
            >
              Cập nhật ngay
            </button>
          </div>
        )}

        <ProfileOverviewCard
          profile={profile}
          onEdit={() => navigate("/profile/edit")}
        />

        {profile.role === USER_ROLES.CUSTOMER && (
          <>
            <CustomerInfoCard profile={profile} />
            <div className="become-farmer-banner" style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              marginTop: "24px",
              boxShadow: "0 10px 15px -3px rgba(16, 185, 129, 0.2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px"
            }}>
              <div style={{ flex: "1 1 300px" }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}><Sprout size={22} /> Trở thành đối tác Nhà vườn</h3>
                <p style={{ margin: 0, fontSize: "14.5px", opacity: 0.95, lineHeight: "1.5" }}>Bắt đầu bán nông sản của bạn trực tiếp tới khách hàng trên AgriMarket.</p>
              </div>
              <button 
                onClick={() => navigate("/farmer/register")} 
                style={{
                  backgroundColor: "#ffffff",
                  color: "#059669",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px 24px",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 6px 12px rgba(0,0,0,0.15)";
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = "none";
                  e.target.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)";
                }}
              >
                Đăng ký bán hàng
              </button>
            </div>
          </>
        )}

        {profile.role === USER_ROLES.FARMER && (
          <>
            {/* Farmer is also a customer — show full customer info card */}
            <CustomerInfoCard profile={profile} />

            {/* Banner to go to farm dashboard */}
            <div style={{
              background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
              color: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              marginTop: "24px",
              boxShadow: "0 10px 15px -3px rgba(6, 78, 59, 0.25)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px"
            }}>
              <div style={{ flex: "1 1 300px" }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}><Home size={20} /> Quản lý trang trại của bạn</h3>
                <p style={{ margin: 0, fontSize: "14px", opacity: 0.85, lineHeight: "1.5" }}>Cập nhật thông tin trang trại, chứng nhận chất lượng và hình ảnh trong Kênh nhà vườn.</p>
              </div>
              <button
                onClick={() => navigate("/farmer/farm-profile")}
                style={{
                  backgroundColor: "#10b981",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px 24px",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.2)",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap"
                }}
                onMouseOver={(e) => { e.target.style.transform = "translateY(-2px)"; e.target.style.backgroundColor = "#059669"; }}
                onMouseOut={(e) => { e.target.style.transform = "none"; e.target.style.backgroundColor = "#10b981"; }}
              >
                Đi tới Kênh nhà vườn
              </button>
            </div>
          </>
        )}

        {profile.role === USER_ROLES.ADMIN && (
          <AdminInfoCard profile={profile} />
        )}

        <ProfileActionCards 
          showToast={showToast}
          setConfirmModal={setConfirmModal}
        />
      </section>

      <ProfileFooter />

      {/* Custom Confirm Modal */}
      {confirmModal.show && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <div className="custom-modal-header">
              <span className="custom-modal-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><AlertTriangle size={24} /></span>
              <h3>{confirmModal.title}</h3>
            </div>
            <p className="custom-modal-message">{confirmModal.message}</p>
            <div className="custom-modal-actions">
              <button className="custom-btn-cancel" onClick={() => setConfirmModal({ show: false })}>
                Hủy bỏ
              </button>
              <button className="custom-btn-confirm" onClick={() => { confirmModal.onConfirm(); setConfirmModal({ show: false }); }}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast.show && (
        <div className={`custom-toast ${toast.type}`}>
          <span className="custom-toast-icon">
            {toast.type === "success" ? <CheckCircle2 size={18} /> : toast.type === "error" ? <XCircle size={18} /> : <AlertTriangle size={18} />}
          </span>
          <span className="custom-toast-message">{toast.message}</span>
          <button className="custom-toast-close" onClick={() => setToast({ show: false })}>×</button>
        </div>
      )}
    </ProfileLayout>
  );
};

export default ViewProfile;