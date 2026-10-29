import React, { useEffect, useState, useMemo } from "react";
import { Leaf } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import authService from "../../services/authService";
import cartService from "../../services/cartService";
import orderService from "../../services/orderService";
import Footer from "../../components/common/Footer/Footer";
import "./PaymentPage.css";
import Header from "../../components/common/Header/Header";

const INITIAL_ORDERS = [
    {
        id: "FH-2024-8892",
        status: "delivered",
        statusLabel: "Đã giao",
        date: "12 thg 10, 2024",
        time: "10:24 SA",
        amount: 3562500,
        itemCount: 6,
        provider: {
            name: "Nông trại hữu cơ Thung lũng Xanh",
            avatarText: "TX",
            avatarBg: "#1b5e20",
        },
        thumbnails: [
            "https://images.unsplash.com/photo-1445280471656-618bf9abcfe0?w=200",
            "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=200",
            "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200"
        ],
        hasMoreItems: 3,
    }
];

export default function PaymentPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [cartItemsCount, setCartItemsCount] = useState(0);

    // Retrieve pending order details from Router state or localStorage
    const pendingOrder = useMemo(() => {
        if (location.state?.pendingOrder) {
            return location.state.pendingOrder;
        }
        const saved = localStorage.getItem("agrimarket_pending_order");
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse pending order:", e);
            }
        }
        return null;
    }, [location.state]);

    // Active tab: 'card', 'bank', 'wallet'
    const [activeTab, setActiveTab] = useState("card");

    // Card inputs
    const [cardNumber, setCardNumber] = useState("");
    const [cardExpiry, setCardExpiry] = useState("");
    const [cardCvv, setCardCvv] = useState("");
    const [cardHolder, setCardHolder] = useState("");
    const [errors, setErrors] = useState({});

    // Success State
    const [isSuccess, setIsSuccess] = useState(false);
    const [receiptOrder, setReceiptOrder] = useState(null);

    // Processing & Toast Feedback states
    const [processingStep, setProcessingStep] = useState(null); // null, 'connecting', 'authenticating', 'processing', 'success'
    const [toastMessage, setToastMessage] = useState(null);

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2500);
    };

    const handleCopyToClipboard = (text, label) => {
        if (!navigator.clipboard) {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                showToast(`Đã sao chép ${label}`);
            } catch (err) {
                console.error('Copy fallback failed', err);
            }
            document.body.removeChild(textArea);
            return;
        }
        navigator.clipboard.writeText(text)
            .then(() => {
                showToast(`Đã sao chép ${label}`);
            })
            .catch(err => {
                console.error("Failed to copy text: ", err);
            });
    };

    // Initialise active tab from checkout method
    useEffect(() => {
        const method = location.state?.paymentMethod || pendingOrder?.paymentMethod;
        if (method === "bank" || method === "BANK_TRANSFER") {
            setActiveTab("bank");
        } else if (method === "card" || method === "CARD") {
            setActiveTab("card");
        } else {
            setActiveTab("card");
        }
    }, [location.state, pendingOrder]);

    useEffect(() => {
        // Load user session
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);

        // Load cart count
        const fetchCartCount = async () => {
            if (currentUser) {
                try {
                    const cart = await cartService.getCart();
                    setCartItemsCount(cart.length);
                } catch (err) {
                    console.error("Lỗi khi load giỏ hàng:", err);
                    loadLocalCartCount();
                }
            } else {
                loadLocalCartCount();
            }
        };

        const loadLocalCartCount = () => {
            const savedCart = JSON.parse(localStorage.getItem("agrimarket_cart")) || [];
            setCartItemsCount(savedCart.length);
        };

        fetchCartCount();
    }, [isSuccess]);

    // Format VND
    const formatVND = (price) => {
        return new Intl.NumberFormat("vi-VN").format(price) + " đ";
    };

    // VietQR code dynamic image link
    const bankTransferQRUrl = useMemo(() => {
        if (!pendingOrder) return "";
        const amount = pendingOrder.amount;
        const description = `AGRIMARKET ${pendingOrder.id}`;
        const accountName = "CONG TY CO PHAN AGRIMARKET";
        return `https://img.vietqr.io/image/mbbank-1900123456789-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;
    }, [pendingOrder]);

    const handleCardNumberChange = (e) => {
        let value = e.target.value.replace(/\D/g, "").slice(0, 16);
        let formatted = value.match(/.{1,4}/g)?.join(" ") || value;
        setCardNumber(formatted);
    };

    const handleExpiryChange = (e) => {
        let value = e.target.value.replace(/\D/g, "").slice(0, 4);
        if (value.length > 2) {
            value = value.slice(0, 2) + "/" + value.slice(2);
        }
        setCardExpiry(value);
    };

    const validateCardForm = () => {
        const formErrors = {};
        const rawCardNum = cardNumber.replace(/\s/g, "");
        if (!rawCardNum || rawCardNum.length !== 16 || !/^\d{16}$/.test(rawCardNum)) {
            formErrors.cardNumber = "Số thẻ phải gồm đúng 16 chữ số";
        }
        
        if (!cardExpiry.trim()) {
            formErrors.cardExpiry = "Vui lòng nhập hạn sử dụng";
        } else if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
            formErrors.cardExpiry = "HSD thẻ phải là MM/YY";
        } else {
            const [month, year] = cardExpiry.split("/").map(Number);
            if (month < 1 || month > 12) {
                formErrors.cardExpiry = "Tháng hết hạn không hợp lệ (01-12)";
            } else {
                const now = new Date();
                const currentYear = now.getFullYear() % 100;
                const currentMonth = now.getMonth() + 1;
                if (year < currentYear || (year === currentYear && month < currentMonth)) {
                    formErrors.cardExpiry = "Thẻ đã hết hạn sử dụng";
                }
            }
        }

        const rawCvv = cardCvv.trim();
        if (!rawCvv || rawCvv.length !== 3 || !/^\d{3}$/.test(rawCvv)) {
            formErrors.cardCvv = "Mã CVV phải gồm 3 chữ số";
        }

        const cleanedHolder = cardHolder.trim();
        if (!cleanedHolder) {
            formErrors.cardHolder = "Vui lòng nhập tên chủ thẻ";
        } else if (!/^[A-Z\s]+$/.test(cleanedHolder)) {
            formErrors.cardHolder = "Tên chủ thẻ chỉ gồm chữ cái viết hoa không dấu";
        }

        setErrors(formErrors);
        return Object.keys(formErrors).length === 0;
    };

    const handleConfirmPayment = async (e) => {
        e.preventDefault();

        if (activeTab === "card") {
            if (!validateCardForm()) {
                return;
            }
        }

        const method = activeTab === "card" ? "CARD" : activeTab === "bank" ? "BANK_TRANSFER" : "WALLET";

        if (user) {
            setProcessingStep("connecting");
            try {
                // Request VNPay payment URL from backend
                const res = await orderService.createVNPayPaymentUrl(pendingOrder.id);
                if (res && res.paymentUrl) {
                    window.location.href = res.paymentUrl;
                } else {
                    throw new Error("Không thể tạo liên kết thanh toán VNPay.");
                }
            } catch (err) {
                setProcessingStep(null);
                console.error("Lỗi khi kết nối VNPay:", err);
                const errMsg = err.response?.data
                    ? (typeof err.response.data === "object" ? (err.response.data.message || JSON.stringify(err.response.data)) : err.response.data)
                    : "Có lỗi xảy ra khi kết nối cổng thanh toán VNPay. Vui lòng thử lại.";
                alert(errMsg);
            }
            return;
        }

        // Start processing phases for guest checkout (Mock fallback)
        setProcessingStep("connecting");
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        try {
            await delay(1000);
            setProcessingStep("authenticating");
            await delay(1000);
            setProcessingStep("processing");

            // Finalise the order placement (Mock fallback)
            const confirmedOrder = {
                ...pendingOrder,
                status: "pending",
                statusLabel: "Chờ xác nhận",
                paymentStatus: "paid",
                paymentMethod: method,
                cardEnding: activeTab === "card" ? cardNumber.slice(-4) : null
            };

            // Write to local storage under orders database
            const stored = localStorage.getItem("agrimarket_orders");
            const existingOrders = stored ? JSON.parse(stored) : INITIAL_ORDERS;
            const updatedOrders = [confirmedOrder, ...existingOrders];
            localStorage.setItem("agrimarket_orders", JSON.stringify(updatedOrders));

            // Clear pending session
            localStorage.removeItem("agrimarket_pending_order");
            localStorage.removeItem("agrimarket_checkout");

            // Clear checked items from local cart for guest as well
            if (pendingOrder.items) {
                const savedCart = JSON.parse(localStorage.getItem("agrimarket_cart")) || [];
                const remainingCart = savedCart.filter(item => !pendingOrder.items.some(poi => poi.productId === item.id || poi.name === item.name));
                localStorage.setItem("agrimarket_cart", JSON.stringify(remainingCart));
            }

            await delay(1000);
            setProcessingStep("success");
            await delay(600);
            setProcessingStep(null);

            setReceiptOrder(confirmedOrder);
            setIsSuccess(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            setProcessingStep(null);
            console.error("Lỗi khi xác nhận thanh toán:", err);
            alert("Có lỗi xảy ra khi xác nhận thanh toán. Vui lòng thử lại.");
        }
    };

    const handleCancelPayment = () => {
        const confirmed = window.confirm("Bạn có chắc muốn hủy phiên thanh toán này? Bạn có thể quay lại trang nhận hàng để chỉnh sửa.");
        if (confirmed) {
            navigate("/checkout");
        }
    };

    const handleLogout = () => {
        authService.logout();
        setUser(null);
        navigate("/");
    };

    if (!pendingOrder && !isSuccess) {
        return (
            <div className="payment-page-wrapper">
                <Header />

                <main className="payment-main-container">
                    <div className="payment-empty-container">
                        <div style={{ fontSize: "64px", marginBottom: "20px" }}>🔒</div>
                        <h2>Không tìm thấy phiên thanh toán</h2>
                        <p>Thông tin đặt hàng của bạn đã hết hạn hoặc không tồn tại. Vui lòng thanh toán lại từ giỏ hàng.</p>
                        <button className="btn-cancel-payment" onClick={() => navigate("/cart")} style={{ width: "auto", display: "inline-block", padding: "10px 24px" }}>
                            ← Quay lại giỏ hàng
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="payment-page-wrapper">
            {/* ── HEADER ── */}
            <Header />

            <main className="payment-main-container">
                {/* ── SUCCESS RECEIPT SCREEN ── */}
                {isSuccess && receiptOrder ? (
                    <section className="payment-success-card" style={{ maxWidth: "680px", margin: "20px auto 40px" }}>
                        <div className="success-icon-wrapper">
                            <div className="success-checkmark-ring"></div>
                            <div className="success-checkmark-line">✓</div>
                        </div>

                        <h2>Thanh toán thành công!</h2>
                        <p className="success-desc-text">
                            Hóa đơn đặt hàng của bạn đã được thanh toán trực tuyến bảo mật và chuyển trực tiếp đến nhà vườn.
                        </p>

                        <div className="success-order-details-box">
                            <div className="receipt-header">
                                <h3>HÓA ĐƠN THANH TOÁN</h3>
                                <span className="receipt-id">MÃ ĐƠN: #{receiptOrder.id}</span>
                            </div>

                            <div className="receipt-body">
                                <div className="receipt-row">
                                    <span>Thời gian GD</span>
                                    <span>{receiptOrder.date} lúc {receiptOrder.time}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>Phương thức</span>
                                    <span>{receiptOrder.paymentMethod} {receiptOrder.cardEnding ? `(thẻ cuối *${receiptOrder.cardEnding})` : ""}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>Người nhận</span>
                                    <span>{receiptOrder.recipient}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>Điện thoại</span>
                                    <span>{receiptOrder.phone}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>Địa chỉ giao nhận</span>
                                    <span className="receipt-address-txt">{receiptOrder.address}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>Mã vận đơn</span>
                                    <span>{receiptOrder.trackingNumber}</span>
                                </div>

                                <hr className="receipt-divider" />

                                <div className="receipt-products">
                                    <h4>Sản phẩm đã mua ({receiptOrder.items.length})</h4>
                                    {receiptOrder.items.map((item, idx) => (
                                        <div className="receipt-product-row" key={idx}>
                                            <span className="receipt-prod-name">{item.name} <strong className="receipt-prod-qty">x{item.qty}</strong></span>
                                            <span>{formatVND(item.price * item.qty)}</span>
                                        </div>
                                    ))}
                                </div>

                                <hr className="receipt-divider" />

                                <div className="receipt-row receipt-total">
                                    <span>Tổng số tiền đã trả</span>
                                    <span>{formatVND(receiptOrder.amount)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="success-actions">
                            <button className="btn-success-orders" onClick={() => navigate("/profile/orders")}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16" style={{ marginRight: "8px" }}>
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                                Xem đơn hàng của tôi
                            </button>
                            <button className="btn-success-home" onClick={() => navigate("/")}>
                                Tiếp tục mua sắm →
                            </button>
                        </div>
                    </section>
                ) : (
                    /* ── SECURE PAYMENT INTERFACE ── */
                    <div>
                        {/* Back navigation */}
                        <button className="back-to-checkout-link" onClick={handleCancelPayment}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                            Quay lại nhận hàng
                        </button>

                        <div className="secure-payment-header">
                            <h1>Thanh toán bảo mật</h1>
                            <p>Vui lòng hoàn tất thanh toán để hoàn thành đơn hàng của bạn.</p>
                        </div>

                        {/* Waiting Alert Banner */}
                        <div className="waiting-banner">
                            <div className="waiting-spinner"></div>
                            <div className="waiting-text">
                                <span className="waiting-title">Đang chờ thanh toán</span>
                                <span className="waiting-desc">Đơn hàng <strong>#{pendingOrder.id}</strong> của bạn đang chờ xác nhận thanh toán.</span>
                            </div>
                        </div>

                        <div className="payment-grid">
                            {/* LEFT SIDE PANEL (TABBED PANEL) */}
                            <div className="payment-card-left">
                                <div className="payment-tabs">
                                    <button
                                        type="button"
                                        className={`tab-btn ${activeTab === "card" ? "active" : ""}`}
                                        onClick={() => setActiveTab("card")}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                            <line x1="1" y1="10" x2="23" y2="10"></line>
                                        </svg>
                                        Thẻ tín dụng
                                    </button>

                                    <button
                                        type="button"
                                        className={`tab-btn ${activeTab === "bank" ? "active" : ""}`}
                                        onClick={() => setActiveTab("bank")}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 22v-4h18v4H3zM12 2L2 7h20L12 2zM5 18V9h3v9H5zm6 0V9h3v9h-3zm6 0V9h3v9h-3z"></path>
                                        </svg>
                                        Chuyển khoản ngân hàng
                                    </button>
                                </div>

                                <div className="payment-tab-content">
                                    {/* ── CARD TAB ── */}
                                    {activeTab === "card" && (
                                        <div className="cc-form">
                                            <div className="form-group">
                                                <label htmlFor="cardHolder">Tên chủ thẻ</label>
                                                <input
                                                    type="text"
                                                    id="cardHolder"
                                                    value={cardHolder}
                                                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                                                    placeholder="NGUYEN VAN A"
                                                    className={errors.cardHolder ? "input-err" : ""}
                                                />
                                                {errors.cardHolder && <span className="error-hint-text">{errors.cardHolder}</span>}
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="cardNumber">Số thẻ</label>
                                                <div className="card-num-wrapper">
                                                    <input
                                                        type="text"
                                                        id="cardNumber"
                                                        value={cardNumber}
                                                        onChange={handleCardNumberChange}
                                                        placeholder="0000 0000 0000 0000"
                                                        className={errors.cardNumber ? "input-err" : ""}
                                                    />
                                                    <span className="card-input-icon">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                                            <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                                                            <line x1="2" y1="10" x2="22" y2="10"></line>
                                                        </svg>
                                                    </span>
                                                </div>
                                                {errors.cardNumber && <span className="error-hint-text">{errors.cardNumber}</span>}
                                            </div>

                                            <div className="input-row-half">
                                                <div className="form-group">
                                                    <label htmlFor="cardExpiry">Hạn sử dụng</label>
                                                    <input
                                                        type="text"
                                                        id="cardExpiry"
                                                        value={cardExpiry}
                                                        onChange={handleExpiryChange}
                                                        placeholder="MM / YY"
                                                        className={errors.cardExpiry ? "input-err" : ""}
                                                    />
                                                    {errors.cardExpiry && <span className="error-hint-text">{errors.cardExpiry}</span>}
                                                </div>

                                                <div className="form-group">
                                                    <label htmlFor="cardCvv">Mã CVV</label>
                                                    <input
                                                        type="password"
                                                        id="cardCvv"
                                                        value={cardCvv}
                                                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                                                        placeholder="123"
                                                        className={errors.cardCvv ? "input-err" : ""}
                                                    />
                                                    {errors.cardCvv && <span className="error-hint-text">{errors.cardCvv}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── BANK TRANSFER TAB ── */}
                                    {activeTab === "bank" && (
                                        <div className="bank-transfer-container">
                                            <p className="bank-transfer-intro">
                                                Mở ứng dụng ngân hàng di động (Mobile Banking) của bạn và sử dụng máy quét mã QR để chuyển khoản nhanh 24/7.
                                            </p>

                                            <div className="bank-qr-layout">
                                                <div className="qr-code-box">
                                                    <img src={bankTransferQRUrl} alt="VietQR code for bank transfer" className="qr-code-img" />
                                                    <span className="qr-code-caption">Quét mã QR để trả tiền</span>
                                                </div>

                                                <div className="bank-txt-info">
                                                    <div className="bank-info-item">
                                                        <span>Ngân hàng</span>
                                                        <strong>MB Bank (Quân Đội)</strong>
                                                    </div>
                                                    <div className="bank-info-item">
                                                        <span>Số tài khoản</span>
                                                        <strong 
                                                            className="copy-badge copyable-field"
                                                            onClick={() => handleCopyToClipboard("1900123456789", "Số tài khoản")}
                                                            style={{ cursor: "pointer" }}
                                                            title="Click để sao chép"
                                                        >
                                                            1900123456789 📋
                                                        </strong>
                                                    </div>
                                                    <div className="bank-info-item">
                                                        <span>Tên chủ TK</span>
                                                        <strong>CONG TY CO PHAN AGRIMARKET</strong>
                                                    </div>
                                                    <div className="bank-info-item">
                                                        <span>Số tiền GD</span>
                                                        <strong className="green-value">{formatVND(pendingOrder.amount)}</strong>
                                                    </div>
                                                    <div className="bank-info-item">
                                                        <span>Nội dung CK</span>
                                                        <strong 
                                                            className="copy-badge green-value copyable-field"
                                                            onClick={() => handleCopyToClipboard(`AGRIMARKET ${pendingOrder.id}`, "Nội dung chuyển khoản")}
                                                            style={{ cursor: "pointer" }}
                                                            title="Click để sao chép"
                                                        >
                                                            AGRIMARKET {pendingOrder.id} 📋
                                                        </strong>
                                                    </div>

                                                    <span className="bank-warning">
                                                        ⚠️ Vui lòng chuyển chính xác số tiền và nội dung chuyển khoản để hệ thống tự động xác nhận đơn hàng sau 1-3 phút.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab actions */}
                                    <div className="payment-actions-row">
                                        <button type="button" className="btn-cancel-payment" onClick={handleCancelPayment}>
                                            Hủy thanh toán
                                        </button>
                                        <button type="button" className="btn-confirm-payment" onClick={handleConfirmPayment}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                            </svg>
                                            Xác nhận thanh toán
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT SIDE PANEL (ORDER SUMMARY) */}
                            <div className="payment-sidebar">
                                <div className="order-summary-card">
                                    <h2>Tóm tắt đơn hàng</h2>

                                    <div className="summary-meta-list">
                                        <div className="meta-row">
                                            <span>Mã đơn hàng</span>
                                            <span>#{pendingOrder.id}</span>
                                        </div>
                                        <div className="meta-row">
                                            <span>Nhà vườn</span>
                                            <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "180px" }}>
                                                {pendingOrder.provider?.name || "Nhà vườn địa phương"}
                                            </span>
                                        </div>
                                        <div className="meta-row">
                                            <span>Số lượng</span>
                                            <span>{pendingOrder.itemCount} sản phẩm</span>
                                        </div>
                                    </div>

                                    <div className="summary-prices">
                                        <div className="price-row">
                                            <span>Tạm tính</span>
                                            <span>{formatVND(pendingOrder.subtotal)}</span>
                                        </div>
                                        {pendingOrder.serviceFee > 0 && (
                                            <div className="price-row">
                                                <span>Phí dịch vụ</span>
                                                <span>{formatVND(pendingOrder.serviceFee)}</span>
                                            </div>
                                        )}
                                        <div className="price-row">
                                            <span>Phí vận chuyển</span>
                                            <span className={pendingOrder.shippingFee === 0 ? "free-ship-label" : ""}>
                                                {pendingOrder.shippingFee === 0 ? "Miễn phí" : formatVND(pendingOrder.shippingFee)}
                                            </span>
                                        </div>
                                        {pendingOrder.discount > 0 && (
                                            <div className="price-row">
                                                <span>Giảm giá</span>
                                                <span>-{formatVND(pendingOrder.discount)}</span>
                                            </div>
                                        )}
                                        <div className="price-row total-row">
                                            <span>Tổng thanh toán</span>
                                            <span>{formatVND(pendingOrder.amount)}</span>
                                        </div>
                                    </div>

                                    {/* Sidebar Product Preview */}
                                    {pendingOrder.items && pendingOrder.items.length > 0 && (
                                        <div className="sidebar-product-preview">
                                            <div className="preview-img-box">
                                                {pendingOrder.items[0].img ? (
                                                    <img src={pendingOrder.items[0].img} alt={pendingOrder.items[0].name} />
                                                ) : (
                                                     <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}><Leaf size={24} style={{ color: "#16a34a" }} /></div>
                                                )}
                                            </div>
                                            <div className="preview-details">
                                                <span className="preview-title" title={pendingOrder.items[0].name}>
                                                    {pendingOrder.items[0].name}
                                                </span>
                                                <span className="preview-subtitle">
                                                    {pendingOrder.items[0].farmer || "Nông sản tươi ngon"}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Help Card */}
                                    <div className="support-card">
                                        <h3>Cần hỗ trợ?</h3>
                                        <p>Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng 24/7 để giúp bạn thanh toán.</p>
                                        <button
                                            type="button"
                                            className="btn-support-chat"
                                            onClick={() => window.alert("Hệ thống hỗ trợ trực tuyến hiện đang bận. Vui lòng liên hệ hotline 1900-xxxx.")}
                                        >
                                            Chat hỗ trợ
                                        </button>
                                    </div>
                                </div>

                                {/* Trust badges */}
                                <div className="trust-badges">
                                    <span className="badge-item">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                        </svg>
                                        Mã hóa SSL
                                    </span>
                                    <span className="badge-item">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                        </svg>
                                        Thanh toán an toàn
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            <Footer />

            {/* ── GLASSMORPHIC PROCESSING OVERLAY ── */}
            {processingStep && (
                <div className="processing-overlay">
                    <div className="processing-card">
                        {processingStep !== "success" ? (
                            <div className="processing-spinner-container">
                                <div className="processing-spinner"></div>
                                <div className="processing-spinner-inner"></div>
                            </div>
                        ) : (
                            <div className="processing-success-checkmark">
                                <span className="checkmark-check">✓</span>
                            </div>
                        )}
                        
                        <h3 className="processing-title">
                            {processingStep === "connecting" && "Kết nối cổng thanh toán..."}
                            {processingStep === "authenticating" && "Xác thực tài khoản..."}
                            {processingStep === "processing" && "Đang xử lý giao dịch..."}
                            {processingStep === "success" && "Thanh toán thành công!"}
                        </h3>
                        <p className="processing-subtitle">
                            {processingStep !== "success" 
                                ? "Vui lòng không đóng trình duyệt hoặc tải lại trang." 
                                : "Đang chuẩn bị hóa đơn thanh toán của bạn..."}
                        </p>
                    </div>
                </div>
            )}

            {/* ── CLIPBOARD TOAST FEEDBACK ── */}
            {toastMessage && (
                <div className="clipboard-toast">
                    <span className="toast-icon">📋</span>
                    <span className="toast-text">{toastMessage}</span>
                </div>
            )}
        </div>
    );
}
