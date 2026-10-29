import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import container from "./container.svg";
import googleLogo from "./google-logo.svg";
import authService from "../../services/authService";
import "./Register.css";

export const RegisterFarmconnect = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // OTP Verification Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);

  const startResendTimer = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (element, index) => {
    const val = element.value;
    if (isNaN(val)) return;

    let newOtp = [...otp];
    newOtp[index] = val.substring(val.length - 1);
    setOtp(newOtp);

    // Focus next input
    if (val && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        otpRefs.current[index - 1].focus();
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    if (/^\d{6}$/.test(text)) {
      const digits = text.split("");
      setOtp(digits);
      otpRefs.current[5].focus();
    }
  };

  const handleResendOtp = async () => {
    setOtpError("");
    try {
      await authService.sendRegisterOTP({
        fullName,
        email,
        phoneNumber,
        password,
        role
      });
      startResendTimer();
    } catch (err) {
      const errMsg = typeof err === "string" ? err : (err.message || "Gửi lại mã OTP thất bại. Vui lòng thử lại.");
      setOtpError(errMsg);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError("");
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setOtpError("Vui lòng nhập đủ 6 chữ số của mã xác thực.");
      return;
    }

    setLoading(true);
    try {
      await authService.register({
        fullName,
        email,
        phoneNumber,
        password,
        role,
        otpCode
      });
      
      try {
        // Tự động đăng nhập
        await authService.login({ email, password, role });
        setShowOtpModal(false);
        if (role === "farmer") {
          navigate("/farmer/farm-details");
        } else {
          navigate("/");
        }
      } catch (loginErr) {
        setShowOtpModal(false);
        navigate("/login", { state: { message: "Đăng ký thành công. Vui lòng đăng nhập." } });
      }
    } catch (err) {
      const errMsg = typeof err === "string" ? err : (err.message || "Xác thực OTP thất bại. Vui lòng thử lại.");
      setOtpError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Kiểm tra định dạng số điện thoại (10 chữ số và bắt đầu bằng số 0)
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError("Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 chữ số và bắt đầu bằng số 0.");
      return;
    }

    // Kiểm tra yêu cầu độ dài mật khẩu (tối thiểu 8 ký tự)
    if (password.length < 8) {
      setError("Mật khẩu phải dài ít nhất 8 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (!agreeTerms) {
      setError("Bạn phải đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.");
      return;
    }

    setLoading(true);
    try {
      await authService.sendRegisterOTP({
        fullName,
        email,
        phoneNumber,
        password,
        role
      });
      setShowOtpModal(true);
      setOtp(["", "", "", "", "", ""]);
      setOtpError("");
      startResendTimer();
    } catch (err) {
      const errMsg = typeof err === "string" ? err : (err.message || "Gửi mã xác thực thất bại. Vui lòng thử lại.");
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError("");
      try {
        const response = await authService.googleLogin({
          token: tokenResponse.access_token,
          role: "customer",
          isRegister: true
        });
        console.log("Đăng nhập/Đăng ký Google thành công:", response);
        navigate("/");
      } catch (err) {
        const errMsg = typeof err === "string" ? err : (err.message || "Đăng ký bằng Google thất bại. Vui lòng thử lại.");
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error("Google Register Error:", error);
      setError("Đăng ký bằng Google thất bại.");
    }
  });

  return (
    <div className="register-farmconnect">
      <div className="container">
        <div className="left-side-form">
          <div className="div">
            <div className="brand-header">
              <div className="div-2">
                <div className="text-wrapper">Tham gia AgriMarket</div>
              </div>
              <div className="div-2">
                <p className="p">
                  Bắt đầu hành trình của bạn hướng tới nền nông nghiệp sạch địa phương.
                </p>
              </div>
            </div>
            {error && (
              <div className="error-message" style={{ color: 'var(--error-color)', backgroundColor: '#ffebee', padding: '10px', borderRadius: '8px', width: '100%', marginBottom: '10px', border: '1px solid #ffcdd2', fontSize: '14px' }}>
                {error}
              </div>
            )}
            <div className="container-2">
              <form className="div-3" onSubmit={handleSubmit}>
                <div className="base-fields">
                  <div className="container-3">
                    <div className="div-2">
                      <div className="text-wrapper-2">Họ và Tên</div>
                    </div>
                    <input 
                      className="input" 
                      type="text" 
                      placeholder="Nguyễn Văn A" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      style={{ padding: '0 16px', outline: 'none' }}
                    />
                  </div>
                  <div className="container-3">
                    <div className="div-2">
                      <div className="text-wrapper-2">Địa chỉ Email</div>
                    </div>
                    <input 
                      className="input" 
                      type="email" 
                      placeholder="name@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{ padding: '0 16px', outline: 'none' }}
                    />
                  </div>
                  <div className="container-3">
                    <div className="div-2">
                      <div className="text-wrapper-2">Số điện thoại</div>
                    </div>
                    <input 
                      className="input" 
                      type="tel" 
                      placeholder="0123456789" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      maxLength={10}
                      required
                      style={{ padding: '0 16px', outline: 'none' }}
                    />
                  </div>
                  <div className="container-3">
                    <div className="div-2">
                      <div className="text-wrapper-2">Mật khẩu</div>
                    </div>
                    <div style={{ position: "relative", width: "100%" }}>
                      <input 
                        className="input" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ padding: '0 40px 0 16px', outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          padding: 0
                        }}
                      >
                        {showPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="#5c655f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="12" r="3" stroke="#5c655f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12A18.45 18.45 0 0 1 6.06 6.06M9.9 4.24A9.12 9.12 0 0 1 12 4C19 4 23 12 23 12A18.5 18.5 0 0 1 19.84 16.81M14.12 14.12A3 3 0 1 1 9.88 9.88" stroke="#5c655f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M1 1L23 23" stroke="#5c655f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="container-3">
                    <div className="div-2">
                      <div className="text-wrapper-2">Xác nhận mật khẩu</div>
                    </div>
                    <div style={{ position: "relative", width: "100%" }}>
                      <input 
                        className="input" 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        style={{ padding: '0 40px 0 16px', outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          padding: 0
                        }}
                      >
                        {showConfirmPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="#5c655f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="12" r="3" stroke="#5c655f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12A18.45 18.45 0 0 1 6.06 6.06M9.9 4.24A9.12 9.12 0 0 1 12 4C19 4 23 12 23 12A18.5 18.5 0 0 1 19.84 16.81M14.12 14.12A3 3 0 1 1 9.88 9.88" stroke="#5c655f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M1 1L23 23" stroke="#5c655f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
                <div className="container-4" onClick={() => setAgreeTerms(!agreeTerms)} style={{ cursor: 'pointer' }}>
                  <div className="input-2" style={{ backgroundColor: agreeTerms ? 'var(--primary-color)' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '12px', fontWeight: 'bold' }}>
                    {agreeTerms && '✓'}
                  </div>
                  <div className="label-margin">
                    <p className="label-i-agree-to-the">
                      <span className="span">Tôi đồng ý với </span>
                      <span className="text-wrapper-3">Điều khoản dịch vụ</span>
                      <span className="span"> và </span>
                      <span className="text-wrapper-3">Chính sách bảo mật</span>
                    </p>
                  </div>
                </div>
                <button className="button" type="submit" disabled={loading}>
                  <div className="text-3">{loading ? "Đang xử lý..." : "Đăng ký tài khoản"}</div>
                </button>
              </form>
            </div>
            <div className="div-3">
              <div className="div-2" style={{ position: 'relative', height: '24px' }}>
                <div className="horizontal-divider-wrapper">
                  <div className="horizontal-divider" />
                </div>
                <div className="background-wrapper">
                  <div className="background">
                    <div className="text-4">Hoặc tiếp tục với</div>
                  </div>
                </div>
              </div>
              <div className="button-2" onClick={handleGoogleRegister} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <img className="google-logo" alt="Google logo" src={googleLogo} style={{ width: '20px', height: '20px' }} />
                <div className="text-wrapper-2">
                  <div className="text-4" style={{ fontSize: '14px', fontWeight: 600 }}>Google</div>
                </div>
              </div>
            </div>
            <div className="paragraph">
              <div className="text-6">Đã có tài khoản?</div>
              <Link to="/login" className="link-log-in-here">Đăng nhập tại đây</Link>
            </div>
          </div>
        </div>
        <div className="right-side-imagery">
          {/* Glassmorphic Brand Tag */}
          <div className="glassmorphism" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            <div className="container-5">
              <div className="container-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="logo-tractor"
                >
                  <circle cx="7" cy="18" r="2"></circle>
                  <circle cx="18" cy="18" r="2"></circle>
                  <path d="M7 16h11v-2H9v-3h7V9H9V6H7v10z"></path>
                  <path d="M16 9h3l2 3v4"></path>
                </svg>
              </div>
              <div className="heading">
                <div className="text-7">AgriMarket</div>
              </div>
            </div>
            <div className="farmconnect-wrapper">
              <p className="farmconnect">
                Kết nối trực tiếp nông dân địa phương với người tiêu dùng để có nông sản tươi ngon hơn, giá cả hợp lý hơn và cộng đồng vững mạnh hơn.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* OTP POPUP MODAL */}
      {showOtpModal && (
        <div className="otp-modal-overlay">
          <div className="otp-modal-content">
            <button className="otp-modal-close" onClick={() => setShowOtpModal(false)}>×</button>
            <div className="otp-modal-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '28px', height: '28px' }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h3 className="otp-modal-title">Xác thực Email</h3>
            <p className="otp-modal-description">
              Chúng tôi đã gửi mã xác thực gồm 6 chữ số đến <br />
              <strong>{email}</strong>
            </p>

            {otpError && (
              <div className="otp-modal-error">
                {otpError}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="otp-modal-actions">
              <div className="otp-modal-inputs" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    type="text"
                    maxLength="1"
                    className="otp-input-field"
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                    required
                  />
                ))}
              </div>

              <button className="otp-btn-verify" type="submit" disabled={loading}>
                {loading ? "Đang xác thực..." : "Xác thực mã"}
              </button>

              <div className="otp-resend-text">
                Không nhận được mã?{" "}
                {resendCooldown > 0 ? (
                  <span>Gửi lại sau {resendCooldown}s</span>
                ) : (
                  <button type="button" className="otp-btn-resend" onClick={handleResendOtp}>
                    Gửi lại
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterFarmconnect;
