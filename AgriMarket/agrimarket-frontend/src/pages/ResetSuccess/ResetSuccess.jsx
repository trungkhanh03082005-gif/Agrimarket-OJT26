import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import './ResetSuccess.css';

// IMAGE
import successIllustration from '../../assets/images/success-lock.png';

const REDIRECT_DELAY = 3;

const ResetSuccess = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(REDIRECT_DELAY);

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/login');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
      <div className="reset-success-layout">
        {/* HEADER */}
        <header className="reset-success-header">
          <div className="header-container">
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
        <main className="reset-success-main">
          <div className="reset-success-card">

            {/* Top Green Bar */}
            <div className="reset-success__top-glow"></div>

            {/* Illustration */}
            <div className="reset-success__illustration-wrapper">
              <img
                  className="reset-success__illustration"
                  src={successIllustration}
                  alt="Success Illustration"
              />
            </div>

            {/* Icon */}
            <div className="reset-success__icon-wrapper">
              <div className="reset-success__icon-circle">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#012d1d"/>
                  <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Text Content */}
            <h1 className="reset-success__title">
              Đặt lại mật khẩu<br />Thành công
            </h1>

            <p className="reset-success__description">
              Mật khẩu của bạn đã được cập nhật thành công.<br />
              Bây giờ bạn có thể đăng nhập bằng<br />
              mật khẩu mới của mình.
            </p>

            {/* Countdown Pill */}
            <div className="reset-success__countdown-pill">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="#5c655f" strokeWidth="2"/>
                <path d="M12 7V12L15 15" stroke="#5c655f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="reset-success__countdown-text">Tự động chuyển hướng sau</span>
              <span className="reset-success__countdown-number">{countdown}</span>
              <span className="reset-success__countdown-text">giây</span>
            </div>

            {/* Button */}
            <button
                className="reset-success__button"
                onClick={handleGoToLogin}
            >
              <span>Quay lại Đăng nhập</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

          </div>
        </main>
      </div>
  );
};

export default ResetSuccess;