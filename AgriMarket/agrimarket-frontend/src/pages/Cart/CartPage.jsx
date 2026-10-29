import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShoppingCart, Trash2, Store, ArrowLeft } from "lucide-react";
import authService from "../../services/authService";
import cartService from "../../services/cartService";
import { getProductById } from "../../services/productService";
import CartItem from "./CartItem";
import Footer from "../../components/common/Footer/Footer";
import "./CartPage.css";
import Header from "../../components/common/Header/Header";

export default function CartPage() {
    const navigate = useNavigate();

    const [cartItems, setCartItems] = useState([]);
    const [toastMessage, setToastMessage] = useState("");
    const [user, setUser] = useState(null);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const enrichCartItems = async (items) => {
        if (!items || items.length === 0) return [];
        return await Promise.all(items.map(async (item) => {
            if (!item.farmerId || !item.farmerName || item.stockQuantity === undefined) {
                try {
                    const prodDetails = await getProductById(item.id);
                    return {
                        ...item,
                        farmerId: item.farmerId || prodDetails.farmerId,
                        farmerName: item.farmerName || prodDetails.farmerName,
                        stockQuantity: item.stockQuantity !== undefined ? item.stockQuantity : prodDetails.stock
                    };
                } catch (e) {
                    console.error("Error enriching product details:", e);
                }
            }
            return item;
        }));
    };

    const updateCartState = async (items) => {
        const enriched = await enrichCartItems(items);
        setCartItems(enriched);
    };

    useEffect(() => {
        // Load user session
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);

        const loadCart = async () => {
            if (currentUser) {
                // 0ms Instant Cache Render (chuẩn Shopee)
                const cachedUserCart = localStorage.getItem("agrimarket_user_cart_cache");
                if (cachedUserCart) {
                    try {
                        const parsed = JSON.parse(cachedUserCart);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setCartItems(parsed);
                            setIsLoading(false);
                        }
                    } catch (e) {}
                }

                try {
                    const data = await cartService.getCart();
                    setCartItems(data || []);
                    localStorage.setItem("agrimarket_user_cart_cache", JSON.stringify(data || []));
                } catch (err) {
                    console.error("Lỗi khi load giỏ hàng từ DB:", err);
                    if (!cachedUserCart) await loadLocalCart();
                } finally {
                    setIsLoading(false);
                }
            } else {
                await loadLocalCart();
            }
        };

        const loadLocalCart = async () => {
            let savedCart = JSON.parse(localStorage.getItem("agrimarket_cart"));

            if (!savedCart) {
                savedCart = [];
                localStorage.setItem("agrimarket_cart", JSON.stringify(savedCart));
            }

            // Enrich local items if they lack farmer data
            const enrichedCart = await Promise.all(savedCart.map(async (item) => {
                if (!item.farmerId || !item.farmerName || item.stockQuantity === undefined) {
                    try {
                        const prodDetails = await getProductById(item.id);
                        return {
                            ...item,
                            farmerId: item.farmerId || prodDetails.farmerId,
                            farmerName: item.farmerName || prodDetails.farmerName,
                            stockQuantity: item.stockQuantity !== undefined ? item.stockQuantity : prodDetails.stock
                        };
                    } catch (e) {
                        console.error("Error enriching local product details:", e);
                    }
                }
                return item;
            }));

            const checkedCart = enrichedCart.map(item => ({
                ...item,
                checked: item.checked ?? true
            }));

            setCartItems(checkedCart);
            setIsLoading(false);
        };

        loadCart();
    }, []);

    const handleLogout = () => {
        authService.logout();
        setUser(null);
        navigate("/");
    };

    const triggerToast = (message) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(""), 3000);
    };

    const selectedItems = useMemo(() => {
        return cartItems.filter(item => item.checked);
    }, [cartItems]);

    const selectedItemsQuantity = useMemo(() => {
        return selectedItems.reduce((sum, item) => sum + item.quantity, 0);
    }, [selectedItems]);

    const subtotal = useMemo(() => {
        return selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [selectedItems]);

    const totalCartQty = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + item.quantity, 0);
    }, [cartItems]);

    const serviceFee = subtotal > 0 ? 15000 : 0;
    const shippingFee = 0;
    const discountAmount = 0;
    const totalAmount = subtotal + serviceFee - discountAmount;

    const formatVND = (price) => {
        return new Intl.NumberFormat("vi-VN").format(price) + " đ";
    };

    const syncCart = async (updatedCart) => {
        await updateCartState(updatedCart);
        localStorage.setItem("agrimarket_cart", JSON.stringify(updatedCart));
    };

    const groupedItems = useMemo(() => {
        const groups = {};
        cartItems.forEach(item => {
            const fId = item.farmerId || 999;
            const fName = item.farmerName || "Nhà vườn AgriMarket";
            if (!groups[fId]) {
                groups[fId] = {
                    farmerId: fId,
                    farmerName: fName,
                    items: []
                };
            }
            groups[fId].items.push(item);
        });
        return Object.values(groups);
    }, [cartItems]);

    const handleUpdateQuantity = (itemId, newQuantity) => {
        const item = cartItems.find(i => i.id === itemId);
        if (!item) return;

        // Kiểm tra tồn kho ngay tại client
        if (item.stockQuantity !== undefined && newQuantity > item.stockQuantity) {
            triggerToast(`Không thể cập nhật số lượng vượt quá tồn kho hiện có (${item.stockQuantity}).`);
            return;
        }
        if (newQuantity < 1) return;

        const oldQuantity = item.quantity;

        // 1. Cập nhật UI ngay lập tức
        setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newQuantity } : i));

        // 2. Sync với backend ở background
        if (user) {
            cartService.updateCartItem(itemId, newQuantity, null).catch(err => {
                // Rollback nếu lỗi
                console.error("Lỗi khi cập nhật số lượng:", err);
                setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: oldQuantity } : i));
                const errMsg = err.response?.data || "Không thể cập nhật số lượng. Đã vượt quá số lượng tồn kho.";
                triggerToast(errMsg);
            });
        } else {
            const updatedCart = cartItems.map(i => i.id === itemId ? { ...i, quantity: newQuantity } : i);
            localStorage.setItem("agrimarket_cart", JSON.stringify(updatedCart));
        }
    };

    const handleRemoveItem = (itemId) => {
        const oldItems = cartItems;

        // 1. Xóa khỏi UI ngay lập tức
        setCartItems(prev => prev.filter(i => i.id !== itemId));
        triggerToast("Đã xóa sản phẩm khỏi giỏ hàng!");

        // 2. Sync với backend ở background
        if (user) {
            cartService.removeFromCart(itemId).catch(err => {
                // Rollback nếu lỗi
                console.error("Lỗi khi xóa sản phẩm:", err);
                setCartItems(oldItems);
                triggerToast("Không thể xóa sản phẩm. Vui lòng thử lại.");
            });
        } else {
            const updatedCart = oldItems.filter(item => item.id !== itemId);
            localStorage.setItem("agrimarket_cart", JSON.stringify(updatedCart));
        }
    };


    // ─── Optimistic Select: cập nhật UI ngay lập tức, sync DB ở background ───
    const handleSelectItem = (itemId) => {
        const item = cartItems.find(i => i.id === itemId);
        if (!item) return;
        const newChecked = !item.checked;

        // 1. Cập nhật UI ngay
        setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, checked: newChecked } : i));

        // 2. Sync với backend ở background (không chờ)
        if (user) {
            cartService.updateCartItem(itemId, null, newChecked).catch(err => {
                // Rollback nếu lỗi
                console.error("Lỗi khi chọn sản phẩm:", err);
                setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, checked: !newChecked } : i));
            });
        } else {
            const updatedCart = cartItems.map(i => i.id === itemId ? { ...i, checked: newChecked } : i);
            localStorage.setItem("agrimarket_cart", JSON.stringify(updatedCart));
        }
    };

    const handleSelectAllItems = () => {
        const isAllSelected = cartItems.length > 0 && cartItems.every(item => item.checked);
        const newCheckedVal = !isAllSelected;

        // 1. Cập nhật UI ngay
        setCartItems(prev => prev.map(item => ({ ...item, checked: newCheckedVal })));

        // 2. Sync với backend ở background bằng 1 lần gọi bulk
        if (user) {
            const allIds = cartItems.map(item => item.id);
            cartService.bulkCheck(allIds, newCheckedVal).catch(err => {
                // Rollback nếu lỗi
                console.error("Lỗi khi chọn tất cả:", err);
                setCartItems(prev => prev.map(item => ({ ...item, checked: !newCheckedVal })));
            });
        } else {
            const updatedCart = cartItems.map(item => ({ ...item, checked: newCheckedVal }));
            localStorage.setItem("agrimarket_cart", JSON.stringify(updatedCart));
        }
    };

    const handleSelectFarmerAll = (farmerId, newCheckedVal) => {
        // 1. Cập nhật UI ngay
        setCartItems(prev => prev.map(item =>
            (item.farmerId || 999) === farmerId ? { ...item, checked: newCheckedVal } : item
        ));

        // 2. Sync với backend ở background bằng 1 lần gọi bulk
        if (user) {
            const farmerItemIds = cartItems
                .filter(item => (item.farmerId || 999) === farmerId)
                .map(item => item.id);
            cartService.bulkCheck(farmerItemIds, newCheckedVal).catch(err => {
                // Rollback nếu lỗi
                console.error("Lỗi khi chọn sản phẩm của nhà vườn:", err);
                setCartItems(prev => prev.map(item =>
                    (item.farmerId || 999) === farmerId ? { ...item, checked: !newCheckedVal } : item
                ));
            });
        } else {
            const updatedCart = cartItems.map(item =>
                (item.farmerId || 999) === farmerId ? { ...item, checked: newCheckedVal } : item
            );
            localStorage.setItem("agrimarket_cart", JSON.stringify(updatedCart));
        }
    };

    const handleClearCart = async () => {
        const confirmed = window.confirm("Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng không?");
        if (!confirmed) return;

        if (user) {
            try {
                const data = await cartService.clearCart();
                await updateCartState(data);
                triggerToast("Giỏ hàng đã được làm trống!");
            } catch (err) {
                console.error("Lỗi khi làm trống giỏ hàng:", err);
            }
        } else {
            setCartItems([]);
            localStorage.removeItem("agrimarket_cart");
            triggerToast("Giỏ hàng đã được làm trống!");
        }
    };

    const handleProceedToPayment = () => {
        if (cartItems.length === 0) {
            triggerToast("Giỏ hàng của bạn đang trống!");
            return;
        }

        if (selectedItems.length === 0) {
            triggerToast("Vui lòng chọn ít nhất một sản phẩm để thanh toán!");
            return;
        }

        // Validate stock quantity for selected items
        const invalidItem = selectedItems.find(item => item.quantity > (item.stockQuantity ?? 0));
        if (invalidItem) {
            triggerToast(`Sản phẩm "${invalidItem.name}" vượt quá tồn kho (Tồn kho: ${invalidItem.stockQuantity}). Vui lòng giảm số lượng!`);
            return;
        }

        const checkoutData = {
            selectedItems,
            subtotal,
            serviceFee,
            shippingFee,
            discountAmount,
            totalAmount
        };

        localStorage.setItem("agrimarket_checkout", JSON.stringify(checkoutData));
        navigate("/checkout");
    };

    return (
        <div className="cart-page-wrapper">
            <Header />

            {toastMessage && (
                <div className="cart-toast">
                    <span className="toast-icon">✅</span>
                    <span className="toast-text">{toastMessage}</span>
                </div>
            )}

            <main className="cart-main-container">
                {/* Breadcrumbs */}
                <nav className="breadcrumbs" aria-label="Breadcrumb">
                    <Link to="/">Trang chủ</Link>
                    <span className="breadcrumb-separator">›</span>
                    <span className="breadcrumb-current">Giỏ hàng</span>
                </nav>

                {/* Step Indicator */}
                <div className="cart-step-indicator">
                    <div className="step-node active">
                        <span className="node-num">1</span>
                        <span className="node-label">Giỏ hàng</span>
                    </div>

                    <div className="step-connector"></div>

                    <div className="step-node">
                        <span className="node-num">2</span>
                        <span className="node-label">Đặt hàng thành công</span>
                    </div>

                    <div className="step-connector"></div>

                    <div className="step-node">
                        <span className="node-num">3</span>
                        <span className="node-label">Hoàn tất giao hàng</span>
                    </div>
                </div>

                {isLoading ? (
                    <div className="cart-loading-state">
                        <div className="loading-spinner"></div>
                        <p>Đang tải danh sách sản phẩm...</p>
                    </div>
                ) : cartItems.length === 0 ? (
                    <section className="cart-empty-state">
                        <div className="empty-cart-icon" style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", marginBottom: "16px" }}>
                            <ShoppingCart size={64} style={{ color: "#84918c" }} />
                        </div>
                        <h2>Giỏ hàng của bạn đang trống</h2>
                        <p>Bạn chưa thêm sản phẩm nào vào giỏ hàng hoặc đã hoàn tất thanh toán.</p>

                        <button
                            type="button"
                            className="btn-back-to-shop"
                            onClick={() => navigate("/")}
                        >
                            Khám phá cửa hàng ngay
                        </button>
                    </section>
                ) : (
                    <section className="cart-content-grid">
                        <div className="cart-left-section">
                            <div className="section-header-row">
                                <h3>Sản phẩm trong giỏ ({cartItems.length})</h3>

                                <button
                                    type="button"
                                    className="btn-clear-all"
                                    onClick={handleClearCart}
                                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                                >
                                    <Trash2 size={16} />
                                    Làm trống giỏ hàng
                                </button>
                            </div>

                            <div className="cart-select-all-row">
                                <label className="cart-select-all-label">
                                    <input
                                        type="checkbox"
                                        checked={cartItems.length > 0 && cartItems.every(item => item.checked)}
                                        onChange={handleSelectAllItems}
                                    />
                                    <span className="custom-checkbox-span"></span>
                                    <span className="select-all-text">Chọn tất cả sản phẩm</span>
                                </label>

                                <span className="cart-selected-info">
                                    Đã chọn <strong>{selectedItems.length}</strong> sản phẩm / <strong>{selectedItemsQuantity}</strong> mặt hàng
                                </span>
                            </div>

                            <div className="cart-items-table-header">
                                <span>Sản phẩm</span>
                                <span>Đơn giá</span>
                                <span>Số lượng</span>
                                <span>Tạm tính</span>
                            </div>

                            <div className="cart-grouped-list-container">
                                {groupedItems.map(group => (
                                    <div key={group.farmerId} className="farmer-group-container">
                                        <div className="farmer-group-header">
                                            <label className="farmer-select-all-label">
                                                <input
                                                    type="checkbox"
                                                    checked={group.items.every(item => item.checked)}
                                                    onChange={() => handleSelectFarmerAll(group.farmerId, !group.items.every(item => item.checked))}
                                                />
                                                <span className="custom-checkbox-span"></span>
                                            </label>
                                            <span className="farmer-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", marginRight: "6px", color: "#16a34a" }}><Store size={18} /></span>
                                            <span className="farmer-name">{group.farmerName}</span>
                                            <span className="farmer-badge">Nhà vườn</span>
                                        </div>
                                        <div className="farmer-items-list">
                                            {group.items.map(item => (
                                                <CartItem
                                                    key={item.id}
                                                    item={item}
                                                    onUpdateQuantity={handleUpdateQuantity}
                                                    onRemove={handleRemoveItem}
                                                    onSelectItem={handleSelectItem}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                className="btn-continue-shopping"
                                onClick={() => navigate("/products")}
                                style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "center" }}
                            >
                                <ArrowLeft size={16} /> Tiếp tục mua sắm
                            </button>
                        </div>

                        <aside className="cart-right-section">
                            <div className="cart-summary-card">
                                <h4>Tóm tắt đơn hàng</h4>

                                <p className="summary-selected-note">
                                    Đơn hàng chỉ tính các sản phẩm đã chọn.
                                </p>

                                <div className="summary-selected-products-list">
                                    {selectedItems.length === 0 ? (
                                        <p className="summary-no-items-selected">
                                            Chưa chọn sản phẩm nào để thanh toán
                                        </p>
                                    ) : (
                                        selectedItems.map(item => (
                                            <div className="summary-selected-product-item" key={item.id}>
                                                <span className="summary-selected-product-name" title={item.name}>
                                                    {item.name}
                                                </span>
                                                <span className="summary-selected-product-qty">
                                                    x{item.quantity}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="summary-row">
                                    <span>Tạm tính</span>
                                    <span>{formatVND(subtotal)}</span>
                                </div>

                                <div className="summary-row">
                                    <span>Phí dịch vụ</span>
                                    <span>{formatVND(serviceFee)}</span>
                                </div>

                                <div className="summary-row" style={{ fontSize: "0.82rem", color: "#64748b", fontStyle: "italic", marginTop: "4px", marginBottom: "8px" }}>
                                    <span>* Phí vận chuyển sẽ được tính ở bước thanh toán</span>
                                </div>

                                <hr className="summary-divider" />

                                <div className="summary-row total-row">
                                    <span>Tổng thanh toán</span>
                                    <span className="grand-total-val">
                                        {formatVND(totalAmount)}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    className="btn-proceed-checkout"
                                    onClick={handleProceedToPayment}
                                    disabled={selectedItems.length === 0}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16" style={{ marginRight: "8px" }}>
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                    Tiến hành thanh toán
                                </button>
                            </div>
                        </aside>
                    </section>
                )}
            </main>
            <Footer />
        </div>
    );
}