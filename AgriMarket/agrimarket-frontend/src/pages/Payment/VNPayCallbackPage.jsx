import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import orderService from "../../services/orderService";
import authService from "../../services/authService";
import * as preorderService from "../../services/preorderService";
import Header from "../../components/common/Header/Header";
import Footer from "../../components/common/Footer/Footer";
import "./PaymentPage.css"; // Reuse styling for visual consistency

export default function VNPayCallbackPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [receiptOrder, setReceiptOrder] = useState(null);
    const [transactionNo, setTransactionNo] = useState("");

    // Format VND
    const formatVND = (price) => {
        return new Intl.NumberFormat("vi-VN").format(price) + " đ";
    };

    useEffect(() => {
        const restoreLocalCart = () => {
            const checkoutDataStr = localStorage.getItem("agrimarket_checkout");
            if (checkoutDataStr) {
                try {
                    const checkoutData = JSON.parse(checkoutDataStr);
                    if (checkoutData && checkoutData.selectedItems) {
                        const savedCart = JSON.parse(localStorage.getItem("agrimarket_cart")) || [];
                        
                        checkoutData.selectedItems.forEach(item => {
                            const exists = savedCart.some(ci => ci.id === item.id);
                            if (!exists) {
                                savedCart.push(item);
                            }
                        });
                        
                        localStorage.setItem("agrimarket_cart", JSON.stringify(savedCart));
                    }
                } catch (e) {
                    console.error("Failed to restore cart from checkout data:", e);
                }
            }
            localStorage.removeItem("agrimarket_pending_order");
            localStorage.removeItem("agrimarket_checkout");
        };

        const verifyPayment = async () => {
            try {
                const queryStr = searchParams.toString();
                // 1. Call backend to verify signature and response code
                const verifyResult = await orderService.verifyVNPayCallback(queryStr);
                
                if (verifyResult && verifyResult.success) {
                    setTransactionNo(verifyResult.transactionNo || "");
                    
                    if (verifyResult.orderCode && verifyResult.orderCode.startsWith("PRE-")) {
                        // It is a Preorder!
                        const preorderId = verifyResult.orderCode.substring(4);
                        const po = await preorderService.getPreorderById(preorderId);
                        
                        // Adapt preorder response to receiptOrder structure for display
                        const subtotal = po.items ? po.items.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0) : 0;
                        // Let's check from query parameters vnp_Amount what was actually paid
                        const vnpAmountPaid = verifyResult.amount || (subtotal * 0.2);
                        
                        const adaptedOrder = {
                            id: `PO-${po.id}`,
                            isPreorder: true,
                            date: po.createdAt ? new Date(po.createdAt).toLocaleDateString("vi-VN") : "Đang cập nhật",
                            time: po.createdAt ? new Date(po.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : "",
                            recipient: po.customerName || "Khách hàng",
                            phone: "N/A",
                            address: "Địa chỉ giao nhận (Cung cấp khi nông trại thu hoạch nông sản)",
                            trackingNumber: "Đang cập nhật sau khi thu hoạch",
                            amount: vnpAmountPaid,
                            items: po.items ? po.items.map(item => ({
                                name: `${item.productName} (Cọc 20%)`,
                                qty: item.quantity,
                                price: item.productPrice * 0.2
                            })) : []
                        };
                        
                        setReceiptOrder(adaptedOrder);
                    } else {
                        // 2. Fetch full order details to display the receipt
                        const fullOrder = await orderService.getOrderById(verifyResult.orderCode);
                        setReceiptOrder(fullOrder);
                        
                        // Clear pending checkout sessions
                        localStorage.removeItem("agrimarket_pending_order");
                        localStorage.removeItem("agrimarket_checkout");
                        
                        // Clear cart items if they match
                        if (fullOrder && fullOrder.items) {
                            const savedCart = JSON.parse(localStorage.getItem("agrimarket_cart")) || [];
                            const remainingCart = savedCart.filter(item => 
                                !fullOrder.items.some(poi => poi.productId === item.id || poi.name === item.name)
                            );
                            localStorage.setItem("agrimarket_cart", JSON.stringify(remainingCart));
                        }
                    }
                } else {
                    restoreLocalCart();
                    setError(verifyResult?.message || "Thanh toán thất bại.");
                }
            } catch (err) {
                restoreLocalCart();
                console.error("Lỗi khi xác minh thanh toán VNPay:", err);
                const errMsg = err.response?.data?.message || err.message || "Xác minh thanh toán thất bại.";
                setError(errMsg);
            } finally {
                setLoading(false);
            }
        };

        if (searchParams.size > 0) {
            verifyPayment();
        } else {
            setError("Tham số thanh toán không hợp lệ.");
            setLoading(false);
        }
    }, [searchParams]);

    return (
        <div className="payment-page-wrapper">
            <Header />

            <main className="payment-main-container">
                {loading ? (
                    /* ── LOADING OVERLAY ── */
                    <div style={{ textAlign: "center", padding: "80px 0" }}>
                        <div className="waiting-spinner" style={{ width: "48px", height: "48px", margin: "0 auto 20px" }}></div>
                        <h3>Đang xác minh giao dịch của bạn...</h3>
                        <p style={{ color: "#627465" }}>Vui lòng giữ kết nối internet và không tải lại trang này.</p>
                    </div>
                ) : error ? (
                    /* ── FAILURE CARD ── */
                    <section className="payment-success-card" style={{ maxWidth: "680px", margin: "20px auto 40px", borderTop: "5px solid #d32f2f" }}>
                        <div className="success-icon-wrapper" style={{ backgroundColor: "#ffebee" }}>
                            <div className="success-checkmark-ring" style={{ borderColor: "#d32f2f", animation: "none" }}></div>
                            <div className="success-checkmark-line" style={{ color: "#d32f2f" }}>✕</div>
                        </div>

                        <h2 style={{ color: "#c62828" }}>Thanh toán thất bại</h2>
                        <p className="success-desc-text">
                            Giao dịch của bạn đã gặp lỗi hoặc bị hủy bỏ. Tài khoản của bạn chưa bị trừ tiền cho đơn hàng này.
                        </p>

                        <div className="success-order-details-box" style={{ backgroundColor: "#faf8f8" }}>
                            <div className="receipt-header">
                                <h3 style={{ color: "#c62828" }}>CHI TIẾT LỖI</h3>
                            </div>
                            <div className="receipt-body">
                                <div className="receipt-row">
                                    <span>Lý do lỗi</span>
                                    <span style={{ color: "#d32f2f", fontWeight: "bold" }}>{error}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>Mã lỗi VNPay</span>
                                    <span>{searchParams.get("vnp_ResponseCode") || "N/A"}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>Mã đơn hàng</span>
                                    <span>#{searchParams.get("vnp_TxnRef") || "N/A"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="success-actions">
                            <button className="btn-success-orders" onClick={() => navigate("/cart")} style={{ backgroundColor: "#1e5a22" }}>
                                Thử lại từ Giỏ hàng
                            </button>
                            <button className="btn-success-home" onClick={() => navigate("/")}>
                                Quay lại Trang chủ
                            </button>
                        </div>
                    </section>
                ) : (
                    /* ── SUCCESS RECEIPT SCREEN ── */
                    receiptOrder && (
                        <section className="payment-success-card" style={{ maxWidth: "680px", margin: "20px auto 40px" }}>
                            <div className="success-icon-wrapper">
                                <div className="success-checkmark-ring"></div>
                                <div className="success-checkmark-line">✓</div>
                            </div>

                            <h2>Thanh toán thành công!</h2>
                            <p className="success-desc-text">
                                Hóa đơn đặt hàng của bạn đã được thanh toán trực tuyến bảo mật qua cổng VNPay và chuyển trực tiếp đến nhà vườn.
                            </p>

                            <div className="success-order-details-box">
                                <div className="receipt-header">
                                    <h3>HÓA ĐƠN THANH TOÁN VNPAY</h3>
                                    <span className="receipt-id">MÃ ĐƠN: #{receiptOrder.id}</span>
                                </div>

                                <div className="receipt-body">
                                    <div className="receipt-row">
                                        <span>Mã giao dịch VNPay</span>
                                        <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{transactionNo}</span>
                                    </div>
                                    <div className="receipt-row">
                                        <span>Thời gian GD</span>
                                        <span>{receiptOrder.date} lúc {receiptOrder.time}</span>
                                    </div>
                                    <div className="receipt-row">
                                        <span>Phương thức</span>
                                        <span>Cổng VNPay (Thẻ/VietQR)</span>
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
                    )
                )}
            </main>

            <Footer />
        </div>
    );
}
