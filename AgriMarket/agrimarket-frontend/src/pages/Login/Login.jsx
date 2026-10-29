// src/pages/Login/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import googleLogo from "./google-logo.svg";
import icon from "./icon.svg";
import icon2 from "./icon-2.svg";
import image from "./image.svg";
import authService from "../../services/authService";
import cartService from "../../services/cartService";
import "./Login.css";

export const LoginFarmconnect = () => {
    const navigate = useNavigate();
    const [role, setRole] = useState("customer");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const syncGuestCart = async () => {
        try {
            const guestCartJson = localStorage.getItem("agrimarket_cart");
            if (guestCartJson) {
                const guestItems = JSON.parse(guestCartJson);
                if (Array.isArray(guestItems) && guestItems.length > 0) {
                    // Map guest cart items to CartItemAddRequest format (productId, quantity)
                    const itemsToSync = guestItems
                        .filter(item => item.id && !String(item.id).startsWith("mock-"))
                        .map(item => ({
                            productId: Number(item.id),
                            quantity: item.quantity
                        }));

                    if (itemsToSync.length > 0) {
                        await cartService.syncCart(itemsToSync);
                    }
                    // Clear guest cart after syncing
                    localStorage.removeItem("agrimarket_cart");
                }
            }
        } catch (err) {
            console.error("Lỗi khi đồng bộ giỏ hàng khách:", err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await authService.login({ email, password, role });
            console.log("Login successful:", response);
            await syncGuestCart();
            const user = authService.getCurrentUser();
            if (user && user.role === "admin") {
                navigate("/admin/dashboard");
            } else {
                navigate("/");
            }
        } catch (err) {
            const errMsg = typeof err === "string" ? err : (err.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập.");
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            setError("");
            try {
                const response = await authService.googleLogin({
                    token: tokenResponse.access_token,
                    role: "customer",
                    isRegister: false
                });
                console.log("Google login successful:", response);
                await syncGuestCart();
                const user = authService.getCurrentUser();
                if (user && user.role === "admin") {
                    navigate("/admin/dashboard");
                } else {
                    navigate("/");
                }
            } catch (err) {
                const errMsg = typeof err === "string" ? err : (err.message || "Đăng nhập bằng Google thất bại. Vui lòng thử lại.");
                setError(errMsg);
            } finally {
                setLoading(false);
            }
        },
        onError: (error) => {
            console.error("Google Login Error:", error);
            setError("Đăng nhập bằng Google thất bại.");
        }
    });

    const onGoogleSignInClick = () => {
        if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
            setError("Tính năng Đăng nhập bằng Google chưa được thiết lập VITE_GOOGLE_CLIENT_ID. Bạn vui lòng đăng nhập bằng Email và Mật khẩu bên dưới.");
            return;
        }
        handleGoogleLogin();
    };

    return (
        <div className="login-farmconnect">
            <div className="main-login-container">
                <div className="image-section-hidden">
                    <div className="fresh-organic" />
                    <div className="overlay-overlayblur" />
                    <div className="container">
                        <div className="div">
                            <div className="cultivating-trust">
                                Cultivating Trust,
                                <br />
                                Delivering Freshness.
                            </div>
                        </div>
                        <div className="join-the-digital-wrapper">
                            <p className="join-the-digital">
                                Join the digital revolution connecting dedicated
                                <br />
                                farmers with smart consumers.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="form-section">
                    <div className="container-2">
                        <div className="brand-header">
                            <div className="div">
                                <div className="logo-container" onClick={() => navigate("/")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="48"
                                        height="48"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="logo-tractor"
                                        style={{ stroke: "#012d1d", fill: "none" }}
                                    >
                                        <circle cx="7" cy="18" r="2"></circle>
                                        <circle cx="18" cy="18" r="2"></circle>
                                        <path d="M7 16h11v-2H9v-3h7V9H9V6H7v10z"></path>
                                        <path d="M16 9h3l2 3v4"></path>
                                    </svg>
                                    <div className="text-wrapper">AgriMarket</div>
                                </div>
                            </div>
                            <div className="div">
                                <p className="p">Đăng nhập vào tài khoản của bạn</p>
                            </div>
                        </div>
                        {error && <div className="error-message" style={{ color: 'var(--error-color)', backgroundColor: '#ffebee', padding: '10px', borderRadius: '8px', width: '100%', marginBottom: '10px', border: '1px solid #ffcdd2' }}>{error}</div>}

                        <div className="button-google-sign" onClick={onGoogleSignInClick} style={{ cursor: "pointer" }}>
                            <img className="google-logo" alt="Google logo" src={googleLogo} />
                            <div className="text-3">Đăng nhập bằng Google</div>
                        </div>
                        <div className="container-3">
                            <div className="horizontal-divider" />
                            <div className="text-wrapper-2">
                                <p className="text-4">hoặc đăng nhập bằng email</p>
                            </div>
                            <div className="horizontal-divider" />
                        </div>
                        <form className="login-form" onSubmit={handleSubmit}>
                            <div className="container-4">
                                <div className="div">
                                    <label className="label" htmlFor="input-1">
                                        Địa chỉ Email
                                    </label>
                                </div>
                                <div className="div">
                                    <div className="input">
                                        <input
                                            className="container-5"
                                            id="input-1"
                                            placeholder="name@example.com"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="icon-wrapper">
                                        <img className="icon" alt="Icon" src={icon} />
                                    </div>
                                </div>
                            </div>
                            <div className="container-4">
                                <div className="div">
                                    <label className="label" htmlFor="input-2">
                                        Mật khẩu
                                    </label>
                                </div>
                                <div className="div">
                                    <div className="container-wrapper">
                                        <input
                                            className="container-5"
                                            id="input-2"
                                            placeholder="••••••••"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="icon-wrapper">
                                        <img className="img" alt="Icon" src={image} />
                                    </div>
                                    <div className="button-toggle" onClick={() => setShowPassword(!showPassword)} style={{ cursor: "pointer" }}>
                                        <div className="img-wrapper">
                                            <img className="icon-2" alt="Icon" src={icon2} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="margin">
                                <div className="container-6">
                                    <div className="label-2" onClick={() => setRememberMe(!rememberMe)} style={{ cursor: "pointer" }}>
                                        <div className="input-2" style={{ backgroundColor: rememberMe ? "var(--primary-color)" : "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: "10px", fontWeight: "bold" }}>
                                            {rememberMe && "✓"}
                                        </div>
                                        <div className="text-wrapper-2">
                                            <div className="text-4">Ghi nhớ tài khoản</div>
                                        </div>
                                    </div>
                                    <div className="text-wrapper-2" onClick={() => navigate('/forgot-password')} style={{ cursor: 'pointer' }}>
                                        <div className="text-5">Quên mật khẩu?</div>
                                    </div>
                                </div>
                            </div>
                            <div className="button-margin">
                                <button className="button-3" type="submit" disabled={loading}>
                                    <div className="text-6">{loading ? "Đang đăng nhập..." : "Đăng nhập"}</div>
                                </button>
                            </div>
                        </form>
                        <div className="paragraph">
                            <div className="text-7">Chưa có tài khoản?</div>
                            <Link to="/register" className="link-register-here">Đăng ký tại đây</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginFarmconnect;