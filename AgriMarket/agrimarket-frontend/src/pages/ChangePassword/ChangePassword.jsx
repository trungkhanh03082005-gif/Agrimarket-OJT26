import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useProfile from "../../hooks/useProfile";
import profileService from "../../services/profileService";
import authService from "../../services/authService";

import ProfileLayout from "../../components/profile/ProfileLayout";
import ProfileHeader from "../../components/profile/ProfileHeader";
import ProfileFooter from "../../components/profile/ProfileFooter";

import PasswordInput from "../../components/common/PasswordInput/PasswordInput";
import ChangePasswordSuccess from "../ChangePasswordSuccess/ChangePasswordSuccess";

import "./ChangePassword.css";

const PASSWORD_RULES = [
  {
    id: "length",
    label: "Dài tối thiểu 8 ký tự",
    test: (pwd) => pwd.length >= 8,
  },
  {
    id: "upper",
    label: "Ít nhất một chữ hoa",
    test: (pwd) => /[A-Z]/.test(pwd),
  },
  {
    id: "number",
    label: "Ít nhất một chữ số",
    test: (pwd) => /[0-9]/.test(pwd),
  },
  {
    id: "special",
    label: "Ít nhất một ký tự đặc biệt",
    test: (pwd) => /[^A-Za-z0-9]/.test(pwd),
  },
];

const ChangePassword = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [currentError, setCurrentError] = useState("");
  const [newError, setNewError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");

  const validateForm = () => {
    let valid = true;

    setCurrentError("");
    setNewError("");
    setConfirmError("");

    const isPasswordSet = profile && profile.passwordSet !== false;

    if (isPasswordSet && !currentPassword.trim()) {
      setCurrentError("Vui lòng nhập mật khẩu hiện tại.");
      valid = false;
    }

    if (!newPassword.trim()) {
      setNewError("Vui lòng nhập mật khẩu mới.");
      valid = false;
    }

    if (newPassword && newPassword.length < 8) {
      setNewError("Mật khẩu phải dài ít nhất 8 ký tự.");
      valid = false;
    }

    if (!confirmPassword.trim()) {
      setConfirmError("Vui lòng xác nhận mật khẩu.");
      valid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmError("Mật khẩu xác nhận không khớp.");
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setGeneralError("");
    setCurrentError("");

    const isPasswordSet = profile && profile.passwordSet !== false;

    try {
      await profileService.changePassword({ 
        currentPassword: isPasswordSet ? currentPassword : "", 
        newPassword 
      });

      // Cập nhật lại user local storage để cập nhật passwordSet = true
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        currentUser.passwordSet = true;
        localStorage.setItem("farmconnect_user", JSON.stringify(currentUser));
      }

      setShowSuccessModal(true);
    } catch (err) {
      const errMsg = (err.response?.data && typeof err.response.data === 'string')
        ? err.response.data
        : (err.response?.data?.message || err.message || "Đổi mật khẩu thất bại.");
        
      if (errMsg.includes("Mật khẩu hiện tại")) {
        setCurrentError(errMsg);
      } else {
        setGeneralError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/profile");
  };

  return (
      <>
        <ProfileLayout profile={profile}>
          <section className="profile-content">
            <ProfileHeader
                title={profile?.passwordSet === false ? "Thiết lập mật khẩu" : "Mật khẩu & bảo mật"}
                subtitle={profile?.passwordSet === false ? "Tạo mật khẩu cho tài khoản liên kết Google của bạn." : "Cập nhật mật khẩu để bảo vệ tài khoản của bạn."}
            />

            <div className="profile-card security-card">
              <form onSubmit={handleSubmit}>
                {generalError && (
                  <div className="error-message" style={{ color: '#d32f2f', backgroundColor: '#ffebee', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ffcdd2', fontSize: '14px' }}>
                    {generalError}
                  </div>
                )}
                {profile?.passwordSet !== false && (
                  <div className="security-form-group">
                    <label>Mật khẩu hiện tại</label>

                    <PasswordInput
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          setCurrentError("");
                        }}
                        error={currentError}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <span 
                        onClick={() => navigate('/forgot-password')} 
                        style={{ cursor: 'pointer', color: 'var(--profile-green, #317a55)', fontSize: '14px', fontWeight: 500 }}
                      >
                        Quên mật khẩu?
                      </span>
                    </div>
                  </div>
                )}

                <div className="security-form-group">
                  <label>Mật khẩu mới</label>

                  <PasswordInput
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setNewError("");
                      }}
                      error={newError}
                  />
                </div>

                <div className="security-rules">
                  <h4>Yêu cầu mật khẩu</h4>

                  {PASSWORD_RULES.map((rule) => (
                      <div key={rule.id}>
                        {rule.test(newPassword) ? "✅" : "⭕"} {rule.label}
                      </div>
                  ))}
                </div>

                <div className="security-form-group">
                  <label>Xác nhận mật khẩu mới</label>

                  <PasswordInput
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setConfirmError("");
                      }}
                      error={confirmError}
                  />
                </div>

                <div className="security-actions">
                  <button
                      type="button"
                      className="profile-secondary-button"
                      onClick={handleCancel}
                  >
                    Hủy
                  </button>

                  <button
                      type="submit"
                      className="profile-primary-button"
                      disabled={loading}
                  >
                    {loading ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            </div>
          </section>
          <ProfileFooter />
        </ProfileLayout>

        <ChangePasswordSuccess
            isOpen={showSuccessModal}
            onClose={() => {
              setShowSuccessModal(false);
              navigate("/profile");
            }}
        />
      </>
  );
};

export default ChangePassword;