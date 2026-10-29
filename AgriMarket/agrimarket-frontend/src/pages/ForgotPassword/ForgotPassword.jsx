// src/pages/ForgotPassword/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';

import './ForgotPassword.css';

// IMAGE
import bannerImage from '../../assets/images/forgot-password-banner.png';

// ICONS
import mailIcon from '../../assets/icons/mail-icon.svg';
import arrowLeftIcon from '../../assets/icons/arrow-left.svg';
import securityLockIcon from '../../assets/icons/security-lock.svg';

const ForgotPassword = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const validateEmail = (value) => {
        if (!value) return 'Vui lòng nhập email của bạn.';

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return 'Vui lòng nhập địa chỉ email hợp lệ.';
        }

        return '';
    };

    const handleEmailChange = (e) => {
        setEmail(e.target.value);

        if (emailError) {
            setEmailError('');
        }
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();

        const error = validateEmail(email);

        if (error) {
            setEmailError(error);
            return;
        }

        setIsLoading(true);
        setEmailError("");

        try {
            await authService.sendForgotPasswordOTP(email);
            navigate('/reset-password', { state: { email } });
        } catch (err) {
            const errMsg = typeof err === 'string' ? err : err.message || "Gửi mã OTP thất bại. Vui lòng thử lại.";
            setEmailError(errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-card">

                {/* Left Side: Banner */}
                <div className="forgot-password-card__left">
                    <img
                        src={bannerImage}
                        alt="Harvest Banner"
                        className="banner-image"
                    />
                    <div className="banner-content">
                        <h2 className="banner-title">Bảo vệ mùa vụ của bạn</h2>
                        <p className="banner-text">
                            Bảo mật dữ liệu nông nghiệp của bạn với các giao thức bảo mật hàng đầu.
                        </p>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="forgot-password-card__right">
                    <div className="forgot-password__header">
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

                    <div className="forgot-password__body">
                        <h1 className="forgot-password__title">
                            Quên mật khẩu
                        </h1>

                        <p className="forgot-password__description">
                            Nhập địa chỉ email của bạn và chúng tôi sẽ gửi mã xác minh để đặt lại mật khẩu.
                        </p>

                        <form
                            className="forgot-password__form"
                            onSubmit={handleSendOTP}
                        >
                            <div className="forgot-password__input-wrapper">
                                <label className="forgot-password__label">Địa chỉ Email</label>

                                <div className="forgot-password__input-group">
                                    <img
                                        src={mailIcon}
                                        alt="Mail"
                                        className="forgot-password__input-icon"
                                    />

                                    <input
                                        type="email"
                                        placeholder="farmer@example.com"
                                        value={email}
                                        onChange={handleEmailChange}
                                        className="forgot-password__input"
                                    />
                                </div>

                                {emailError && (
                                    <p className="forgot-password__error">
                                        {emailError}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="forgot-password__button"
                            >
                                {isLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
                            </button>
                        </form>

                        <div className="forgot-password__back">
                            <Link
                                to="/login"
                                className="forgot-password__back-link"
                            >
                                <img
                                    src={arrowLeftIcon}
                                    alt="Back"
                                />
                                <span>Quay lại Đăng nhập</span>
                            </Link>
                        </div>

                        <div className="forgot-password__security">
                            <img
                                src={securityLockIcon}
                                        alt="Security"
                                    />
                            <p>
                                Vì sự an toàn của bạn, mã xác minh sẽ hết hạn sau một khoảng thời gian ngắn.
                                Nếu bạn không nhận được email, vui lòng kiểm tra thư mục thư rác.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ForgotPassword;