// src/pages/ResetPassword/ResetPassword.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../services/authService';

import PasswordInput from '../../components/common/PasswordInput/PasswordInput';
import Button from '../../components/common/Button/Button';

import './ResetPassword.css';

const OTP_LENGTH = 6;

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const otpRefs = useRef([]);

  const handleOtpChange = (index, e) => {
    const val = e.target.value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    if (val && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOTP = async () => {
    if (!email) return;
    setResendDisabled(true);
    setOtp(Array(OTP_LENGTH).fill(''));
    otpRefs.current[0]?.focus();

    try {
      await authService.sendForgotPasswordOTP(email);
    } catch (err) {
      console.error("Error resending OTP:", err);
    }

    setTimeout(() => {
      setResendDisabled(false);
    }, 30000);
  };

  const validateForm = () => {
    let valid = true;

    if (!newPassword) {
      setPasswordError('Vui lòng nhập mật khẩu mới.');
      valid = false;
    } else if (newPassword.length < 8) {
      setPasswordError('Mật khẩu phải dài ít nhất 8 ký tự.');
      valid = false;
    } else {
      setPasswordError('');
    }

    if (!confirmPassword) {
      setConfirmError('Vui lòng xác nhận mật khẩu.');
      valid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmError('Mật khẩu xác nhận không khớp.');
      valid = false;
    } else {
      setConfirmError('');
    }

    return valid;
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!email) {
      setConfirmError("Không tìm thấy địa chỉ email. Vui lòng quay lại.");
      return;
    }

    const otpCode = otp.join('');
    if (otpCode.length !== OTP_LENGTH) {
      setConfirmError("Vui lòng nhập đầy đủ mã xác minh 6 số.");
      return;
    }

    setIsLoading(true);
    setConfirmError("");
    setPasswordError("");

    try {
      await authService.resetPassword({ email, otpCode, newPassword });
      navigate('/reset-success');
    } catch (err) {
      const errMsg = typeof err === 'string' ? err : err.message || "Đặt lại mật khẩu thất bại. Vui lòng thử lại.";
      if (errMsg.toLowerCase().includes("otp")) {
        setConfirmError(errMsg);
      } else {
        setPasswordError(errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="reset-password-page">
        {/* HEADER LOGO */}
        <header className="header-topappbar">
          <div className="container-wrapper">
            <h2 className="brand-logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="logo-tractor"
                >
                  <circle cx="7" cy="18" r="2"></circle>
                  <circle cx="18" cy="18" r="2"></circle>
                  <path d="M7 16h11v-2H9v-3h7V9H9V6H7v10z"></path>
                  <path d="M16 9h3l2 3v4"></path>
                </svg>
                <span>AgriMarket</span>
            </h2>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="main-content-canvas">
          <div className="reset-card-wrapper">
            {/* Glow effect behind the card */}
            <div className="card-glow-background"></div>

            <div className="reset-password-card">

              {/* TITLE HEADER */}
              <div className="reset-password-header">
                <div className="secure-icon-wrapper">
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525" stroke="#012d1d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 11V10C9 8.34315 10.3431 7 12 7C13.6569 7 15 8.34315 15 10V11M8 11H16C16.5523 11 17 11.4477 17 12V16C17 16.5523 16.5523 17 16 17H8C7.44772 17 7 16.5523 7 16V12C7 11.4477 7.44772 11 8 11Z" stroke="#012d1d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 14V14.01" stroke="#012d1d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h1 className="reset-password-title">Đặt lại mật khẩu</h1>
                <p className="reset-password-description">
                  Xác minh danh tính của bạn để thiết lập mật khẩu mới.
                </p>
              </div>

              {/* FORM */}
              <form onSubmit={handleConfirmReset} className="reset-password-form">

                {/* OTP SECTION */}
                <div className="form-section">
                  <div className="section-header-texts">
                    <label className="input-label">Mã xác minh</label>
                    <p className="sub-label">Nhập mã gồm 6 chữ số được gửi đến địa chỉ email đã đăng ký của bạn.</p>
                  </div>

                  <div className="otp-inputs">
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => (otpRefs.current[index] = el)}
                            type="text"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            className="otp-box"
                        />
                    ))}
                  </div>

                  <div className="resend-row-right">
                    <button
                        type="button"
                        className="resend-link"
                        onClick={handleResendOTP}
                        disabled={resendDisabled}
                    >
                      Gửi lại mã
                    </button>
                  </div>
                </div>

                <hr className="section-divider" />

                {/* PASSWORD SECTION */}
                <div className="form-section password-section-spacing">
                  <div className="password-input-wrapper">
                    <label className="input-label">Mật khẩu mới</label>
                    <PasswordInput
                        id="new-password"
                        name="newPassword"
                        placeholder="Nhập mật khẩu mới"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (passwordError) setPasswordError('');
                        }}
                        error={passwordError}
                        showStrength={true}
                    />
                  </div>

                  <div className="password-input-wrapper">
                    <label className="input-label">Xác nhận mật khẩu mới</label>
                    <PasswordInput
                        id="confirm-password"
                        name="confirmPassword"
                        placeholder="Nhập lại mật khẩu mới"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (confirmError) setConfirmError('');
                        }}
                        error={confirmError}
                    />
                  </div>
                </div>

                {/* BUTTON */}
                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={isLoading}
                    disabled={isLoading}
                    className="confirm-reset-btn"
                >
                  <div className="btn-content-with-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Xác nhận đặt lại
                  </div>
                </Button>
              </form>
            </div>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="footer">
          <div className="footer-container">
            <p className="footer-text">
              © 2026 AgriMarket. Digital Stewardship.
            </p>
            <div className="footer-links">
              <span className="link">Trung tâm trợ giúp</span>
              <span className="link">Chính sách bảo mật</span>
              <span className="link">Điều khoản dịch vụ</span>
            </div>
          </div>
        </footer>
      </div>
  );
};

export default ResetPassword;