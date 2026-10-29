import React, { useState, useEffect } from "react";
import { Sprout, Minus, Plus, Trash2, AlertTriangle } from "lucide-react";

export default function CartItem({ item, onUpdateQuantity, onRemove, onSelectItem }) {
    const [imageError, setImageError] = useState(false);
    const [tempValue, setTempValue] = useState(undefined);

    useEffect(() => {
        setTempValue(undefined);
    }, [item.quantity]);

    const formatVND = (price) => {
        return new Intl.NumberFormat("vi-VN").format(price) + " đ";
    };

    const handleDecrease = () => {
        if (item.quantity > 1) {
            onUpdateQuantity(item.id, item.quantity - 1);
        }
    };

    const handleIncrease = () => {
        if (item.stockQuantity !== undefined && item.quantity >= item.stockQuantity) {
            return;
        }
        onUpdateQuantity(item.id, item.quantity + 1);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        if (val === "" || /^\d+$/.test(val)) {
            setTempValue(val);
        }
    };

    const handleInputBlur = () => {
        if (tempValue === undefined) return;
        
        let parsed = parseInt(tempValue, 10);
        const maxStock = item.stockQuantity !== undefined ? item.stockQuantity : 9999;
        
        if (isNaN(parsed) || parsed < 1) {
            parsed = 1;
        } else if (parsed > maxStock) {
            parsed = maxStock;
        }
        
        setTempValue(undefined);
        if (parsed !== item.quantity) {
            onUpdateQuantity(item.id, parsed);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            handleInputBlur();
        }
    };

    return (
        <div className="cart-item-row">
            <div className="cart-item-info">
                <div className="cart-item-checkbox">
                    <label className="cart-item-select-label">
                        <input
                            type="checkbox"
                            checked={item.checked || false}
                            onChange={() => onSelectItem(item.id)}
                            aria-label={`Chọn ${item.name}`}
                        />
                        <span className="custom-checkbox-span"></span>
                    </label>
                </div>
                <div className="cart-item-image">
                    {imageError || !item.imageUrl ? (
                        <div className="cart-item-image-fallback" style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", color: "#10b981" }}>
                            <Sprout size={20} />
                        </div>
                    ) : (
                        <img
                            src={item.imageUrl}
                            alt={item.name}
                            onError={() => setImageError(true)}
                        />
                    )}
                </div>
                <div className="cart-item-details">
                    <h4 className="cart-item-title">{item.name}</h4>
                    <div className="cart-item-meta">
                        <span className="cart-item-unit">Đơn vị: {item.unit || "kg"}</span>
                        {item.stockQuantity !== undefined && (
                            <span className={`cart-item-stock-badge ${item.stockQuantity === 0 ? "out-of-stock" : ""}`}>
                                {item.stockQuantity === 0 ? "Hết hàng" : `Tồn kho: ${item.stockQuantity}`}
                            </span>
                        )}
                    </div>

                    <span className="cart-item-price-mobile">{formatVND(item.price)}</span>
                </div>
            </div>

            <div className="cart-item-price-col">
                <span className="cart-item-unit-price">{formatVND(item.price)}</span>
            </div>

            <div className="cart-item-quantity-col">
                <div className="quantity-controls" style={{ display: "inline-flex", alignItems: "center" }}>
                    <button
                        type="button"
                        className="qty-btn btn-minus"
                        onClick={handleDecrease}
                        disabled={item.quantity <= 1}
                        aria-label="Giảm số lượng"
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    >
                        <Minus size={12} />
                    </button>
                    <input
                        type="text"
                        className="qty-input"
                        value={tempValue !== undefined ? tempValue : item.quantity}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyDown={handleKeyDown}
                        aria-label="Số lượng"
                    />
                    <button
                        type="button"
                        className="qty-btn btn-plus"
                        onClick={handleIncrease}
                        disabled={item.stockQuantity !== undefined && item.quantity >= item.stockQuantity}
                        aria-label="Tăng số lượng"
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    >
                        <Plus size={12} />
                    </button>
                </div>
            </div>

            <div className="cart-item-total-col">
                <span className="cart-item-subtotal">{formatVND(item.price * item.quantity)}</span>
                <button
                    type="button"
                    className="btn-remove-item"
                    onClick={() => onRemove(item.id)}
                    aria-label="Xóa sản phẩm khỏi giỏ hàng"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {item.isWithinDeliveryRange === false && (
                <div className="cart-item-delivery-warning" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <AlertTriangle size={14} className="warning-icon" style={{ color: "#f59e0b" }} />
                    <span className="warning-text">
                        Ngoài phạm vi giao hàng của nhà vườn (Khoảng cách: <strong>{item.distance != null ? item.distance.toFixed(1) : "?"} km</strong> / phạm vi tối đa: <strong>{item.maxDeliveryRange != null ? item.maxDeliveryRange.toFixed(1) : "?"} km</strong>)
                    </span>
                </div>
            )}
        </div>
    );
}
