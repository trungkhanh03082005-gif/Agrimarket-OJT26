import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as preorderService from "../../services/preorderService";
import orderService from "../../services/orderService";
import Header from "../../components/common/Header/Header";
import Footer from "../../components/common/Footer/Footer";
import { Leaf, Shield, Check, Award, Globe, Star } from "lucide-react";
import "./ProductDetail.css";
import "./PreorderCheckout.css";

const InlineCalendar = ({ value, onChange, minDate, maxDate }) => {
  const parsedValue = value ? new Date(value) : new Date();
  
  const [viewMonth, setViewMonth] = useState(parsedValue.getMonth());
  const [viewYear, setViewYear] = useState(parsedValue.getFullYear());
  
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewMonth(d.getMonth());
        setViewYear(d.getFullYear());
      }
    }
  }, [value]);
  
  const months = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];
  
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (month, year) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };
  
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  
  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };
  
  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
  
  const calendarCells = [];
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push({ dayNum: null, dateObj: null, selectable: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(viewYear, viewMonth, d);
    
    let selectable = true;
    if (minDate) {
      const minCopy = new Date(minDate);
      minCopy.setHours(0,0,0,0);
      const dateCopy = new Date(dateObj);
      dateCopy.setHours(0,0,0,0);
      if (dateCopy < minCopy) selectable = false;
    }
    if (maxDate) {
      const maxCopy = new Date(maxDate);
      maxCopy.setHours(23,59,59,999);
      const dateCopy = new Date(dateObj);
      dateCopy.setHours(0,0,0,0);
      if (dateCopy > maxCopy) selectable = false;
    }
    
    calendarCells.push({ dayNum: d, dateObj, selectable });
  }
  
  const handleSelectDay = (cell) => {
    if (!cell.selectable) return;
    const y = cell.dateObj.getFullYear();
    const m = String(cell.dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(cell.dateObj.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
  };
  
  const isSelected = (cell) => {
    if (!cell.dateObj || !value) return false;
    const valDate = new Date(value);
    return cell.dateObj.getFullYear() === valDate.getFullYear() &&
           cell.dateObj.getMonth() === valDate.getMonth() &&
           cell.dateObj.getDate() === valDate.getDate();
  };
  
  return (
    <div className="custom-inline-calendar">
      <div className="calendar-header">
        <button type="button" onClick={handlePrevMonth} className="calendar-nav-btn">&lt;</button>
        <span className="calendar-title">{months[viewMonth]} {viewYear}</span>
        <button type="button" onClick={handleNextMonth} className="calendar-nav-btn">&gt;</button>
      </div>
      <div className="calendar-weekdays">
        <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
      </div>
      <div className="calendar-grid">
        {calendarCells.map((cell, idx) => {
          if (cell.dayNum === null) {
            return <div key={`empty-${idx}`} className="calendar-cell empty"></div>;
          }
          
          let cellClass = "calendar-cell day";
          if (!cell.selectable) {
            cellClass += " disabled";
          } else if (isSelected(cell)) {
            cellClass += " selected";
          }
          
          return (
            <div 
              key={`day-${cell.dayNum}`} 
              className={cellClass}
              onClick={() => handleSelectDay(cell)}
            >
              {cell.dayNum}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function PreorderProductDetail({
  product,
  quantity,
  setQuantity,
  customDate,
  setCustomDate,
  specialInstructions,
  setSpecialInstructions,
  parsedLimits,
  formatDateString
}) {
  const navigate = useNavigate();

  // Helper format VND
  const formatVND = (number) => {
    return new Intl.NumberFormat("vi-VN").format(number) + " đ";
  };

  const handleQuantityChange = (newVal) => {
    const limit = product.stock || 0;
    if (newVal < 1) return;
    if (limit > 0 && newVal > limit) {
      setQuantity(limit);
      return;
    }
    setQuantity(newVal);
  };

  const handleInputChange = (val) => {
    // Only allow digits
    const cleaned = val.replace(/\D/g, "");
    if (cleaned === "") {
      setQuantity("");
      return;
    }
    const num = parseInt(cleaned, 10);
    const limit = product.stock || 0;
    if (limit > 0 && num > limit) {
      setQuantity(limit);
    } else {
      setQuantity(num);
    }
  };

  const handleInputBlur = () => {
    if (quantity === "" || quantity < 1) {
      setQuantity(1);
    }
  };

  const handleConfirmPreorder = async () => {
    try {
      const payload = {
        items: [
          {
            productId: product.id,
            quantity: quantity,
            expectedHarvestDate: product.harvestDate || null
          }
        ]
      };
      const result = await preorderService.createPreorder(payload);
      
      // Dispatch event to update tabs/badges elsewhere
      window.dispatchEvent(new Event("preordersUpdated"));
      
      // Request VNPay payment URL for preorder deposit
      const paymentRes = await orderService.createVNPayPaymentUrl("PRE-" + result.id, "delivery");
      if (paymentRes && paymentRes.paymentUrl) {
        window.location.href = paymentRes.paymentUrl;
      } else {
        throw new Error("Không thể tạo liên kết thanh toán VNPay.");
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi tạo đơn đặt trước: " + (err.response?.data || err.message));
    }
  };

  // Cost calculations
  const pricePerUnit = product.price || 0;
  const subtotal = pricePerUnit * quantity;
  const deliveryFee = 35000; // Luôn vận chuyển qua GHN
  const serviceFee = 15000; // Phí dịch vụ cố định
  const totalAmount = subtotal + deliveryFee + serviceFee;
  const depositAmount = Math.round(totalAmount * 0.2); // 20% Deposit cọc

  return (
    <div className="preorder-checkout-page">
      <Header activeTab="preorder" />

      <main className="preorder-checkout-main">
        {/* Breadcrumb */}
        <nav className="preorder-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span className="separator">&gt;</span>
          <Link to="/preorders">Đặt trước</Link>
          <span className="separator">&gt;</span>
          <span className="current">{product.name}</span>
        </nav>

        {/* Grid Layout */}
        <div className="preorder-layout-grid">
          
          {/* Left Main Panels */}
          <div className="preorder-left-column">
            
            {/* 1. Product Info Panel */}
            <div className="preorder-card-panel preorder-product-card">
              <div className="preorder-product-upper">
                <div className="preorder-image-wrapper">
                  <img src={product.imageUrl} alt={product.name} />
                  <span className="preorder-badge-pill">ĐẶT TRƯỚC</span>
                </div>

                <div className="preorder-details-info">
                  <h2>{product.name}</h2>
                  <div className="preorder-farm-row">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <span>Nông trại {product.farmerName || "Green Valley"}</span>
                  </div>

                  <div className="preorder-timeline-cards">
                    <div className="timeline-box">
                      <div className="box-label">DỰ KIẾN THU HOẠCH</div>
                      <div className="box-value">{product.expectedHarvest || product.harvestDate || "Cuối tháng 10, 2026"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Certifications Row with Lucide icons (replacing emojis) */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "12px 0" }}>
                {product.farmerOrganicUrl && (
                  <span style={{ backgroundColor: "#e8f5e9", color: "#1b5e20", border: "1px solid #a7f3d0", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Leaf size={13} /> Hữu cơ (Organic)
                  </span>
                )}
                {product.farmerVietgapUrl && (
                  <span style={{ backgroundColor: "#fffbeb", color: "#b45309", border: "1px solid #fef3c7", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Award size={13} /> VietGAP
                  </span>
                )}
                {product.farmerGlobalgapUrl && (
                  <span style={{ backgroundColor: "#eff6ff", color: "#1e40af", border: "1px solid #dbeafe", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Globe size={13} /> GlobalGAP
                  </span>
                )}
              </div>

              {/* Rating & Sold Row with Lucide icons (replacing emojis) */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "8px 0", fontSize: "14px", color: "#475569" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Star size={15} fill="#fbbf24" stroke="#fbbf24" />
                  <strong style={{ color: "#1e293b" }}>{product.rating ? product.rating.toFixed(1) : "0.0"}</strong>
                  <span>({product.reviewsCount || 0} đánh giá)</span>
                </div>
                <span>•</span>
                <span>Đã bán {product.sold || 0} {product.unit || "kg"}</span>
              </div>

              {/* Specs Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "20px 0", padding: "16px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "14px", color: "#475569" }}>
                  <strong>Đơn giá dự kiến:</strong> <span style={{ color: "#16a34a", fontWeight: "700", marginLeft: "4px" }}>{formatVND(product.price)} / {product.unit || "kg"}</span>
                </div>
                <div style={{ fontSize: "14px", color: "#475569" }}>
                  <strong>Suất đặt còn lại:</strong> <span style={{ marginLeft: "4px" }}>{product.stock || 0} {product.unit || "kg"}</span>
                </div>
                <div style={{ fontSize: "14px", color: "#475569" }}>
                  <strong>Hạn sử dụng dự kiến:</strong> <span style={{ marginLeft: "4px" }}>{formatDateString(product.expirationDate) || "Đang cập nhật"}</span>
                </div>
                <div style={{ fontSize: "14px", color: "#475569" }}>
                  <strong>Độ hư hỏng:</strong> <span style={{ textTransform: "capitalize", marginLeft: "4px" }}>{product.perishability || "Khô"}</span>
                </div>
                <div style={{ fontSize: "14px", color: "#475569" }}>
                  <strong>Giới hạn giao hàng:</strong> <span style={{ marginLeft: "4px" }}>{product.limitDistance ? `${product.limitDistance} km` : "Không giới hạn"}</span>
                </div>
              </div>

              <p className="preorder-product-desc" style={{ whiteSpace: "pre-line" }}>
                {product.description || "Đặt trước sản phẩm của mùa vụ thu hoạch mới giúp đảm bảo nguồn cung tươi ngon nhất trực tiếp từ nông trại. Hỗ trợ nông dân yên tâm sản xuất với cam kết bao tiêu đầu ra chất lượng cao."}
              </p>
            </div>

            {/* 2. Configure Preorder Form */}
            <div className="preorder-card-panel">
              <h3 className="config-title">Thông tin đặt trước</h3>

              {/* Quantity */}
              <div className="config-group">
                <label className="group-label">Chọn số lượng đặt trước ({product.unit || "kg"})</label>
                <div className="qty-selector-row">
                  <div className="qty-control-buttons">
                    <button 
                      type="button" 
                      className="qty-btn" 
                      onClick={() => handleQuantityChange(Number(quantity || 0) - 1)}
                      disabled={Number(quantity || 0) <= 1}
                    >
                      －
                    </button>
                    <input 
                      type="text" 
                      className="qty-input-text" 
                      value={quantity}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onBlur={handleInputBlur}
                    />
                    <button 
                      type="button" 
                      className="qty-btn" 
                      onClick={() => handleQuantityChange(Number(quantity || 0) + 1)}
                      disabled={product.stock > 0 && Number(quantity || 0) >= product.stock}
                    >
                      ＋
                    </button>
                  </div>
                  <span className="price-indicator-text">{formatVND(pricePerUnit)} / {product.unit || "kg"}</span>
                </div>
              </div>

              {/* Preferred Delivery Date */}
              <div className="config-group">
                <div className="preorder-date-picker-wrapper">
                  <label className="group-label" style={{ fontSize: "13.5px", color: "#475569", marginBottom: "8px", display: "block" }}>
                    Chọn ngày nhận mong muốn trên lịch *
                  </label>
                  <InlineCalendar
                    value={customDate}
                    onChange={(newDate) => setCustomDate(newDate)}
                    minDate={parsedLimits.min}
                    maxDate={parsedLimits.max}
                  />
                </div>
              </div>

              {/* Special Instructions */}
              <div className="config-group" style={{ marginBottom: 0 }}>
                <label className="group-label">Ghi chú vận chuyển (Không bắt buộc)</label>
                <textarea
                  className="special-instructions-area"
                  placeholder="Nhập bất kỳ yêu cầu cụ thể nào về việc giao hàng của bạn..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>

            </div>

            {/* 3. Bottom Trust Badges */}
            <div className="preorder-trust-badges">
              <div className="trust-badge-item">
                <div className="trust-badge-icon leaf-icon">
                  <Leaf size={20} />
                </div>
                <div className="trust-badge-text">
                  <h4>Cam kết nông sản hữu cơ</h4>
                  <p>Sản phẩm được trồng hoàn toàn tự nhiên, không sử dụng hóa chất bảo vệ thực vật độc hại.</p>
                </div>
              </div>

              <div className="trust-badge-item">
                <div className="trust-badge-icon shield-icon">
                  <Shield size={20} />
                </div>
                <div className="trust-badge-text">
                  <h4>Hủy đặt trước an toàn</h4>
                  <p>Tiền đặt cọc của bạn được đảm bảo. Bạn có thể tự do hủy đặt hàng tối đa 14 ngày trước thời điểm thu hoạch.</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column Sidebar Summary */}
          <div className="preorder-right-column">
            <div className="preorder-summary-card">
              <h3 className="summary-title" style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>Thông tin đơn hàng</h3>
              
              <div className="summary-rows">
                <div className="summary-item-line" style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "#475569" }}>
                  <span>Tạm tính</span>
                  <span>{formatVND(subtotal)}</span>
                </div>
                <div className="summary-item-line" style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "#475569" }}>
                  <span>Phí vận chuyển (GHN)</span>
                  <span>{formatVND(deliveryFee)}</span>
                </div>
                <div className="summary-item-line" style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "#475569" }}>
                  <span>Phí dịch vụ</span>
                  <span>{formatVND(serviceFee)}</span>
                </div>
                
                <hr className="summary-divider" style={{ border: "none", borderTop: "1px dashed #e2e8f0", margin: "12px 0" }} />
                
                <div className="summary-item-line total-line" style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "16px", color: "#1e293b", marginBottom: "16px" }}>
                  <span>Tổng thanh toán dự kiến</span>
                  <span style={{ color: "#1e293b", fontSize: "18px" }}>{formatVND(totalAmount)}</span>
                </div>
              </div>

              {/* Deposit Highlights */}
              <div className="checkout-deposit-highlight-box" style={{ backgroundColor: "#e8f5e9", border: "1px solid #c8e6c9", padding: "12px", borderRadius: "8px", marginTop: "12px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", color: "#2e7d32", fontSize: "14px" }}>
                  <span>Đặt cọc yêu cầu (20%)</span>
                  <span>{formatVND(depositAmount)}</span>
                </div>
                <span style={{ fontSize: "11px", color: "#558b2f", display: "block", marginTop: "4px", textAlign: "left" }}>Thanh toán cọc hôm nay để xác nhận giữ chỗ nông sản.</span>
              </div>

              {/* Confirm Button */}
              <button 
                type="button" 
                className="btn-confirm-preorder"
                onClick={handleConfirmPreorder}
                style={{ backgroundColor: "#15803d" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: "8px"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Xác nhận đặt trước
              </button>

              <p className="preorder-agreement-disclaimer" style={{ fontSize: "12px", color: "#64748b", marginTop: "12px", textAlign: "center", lineHeight: "1.4" }}>
                Bằng việc xác nhận, bạn đồng ý với Điều khoản và quy trình mua sắm đặt trước Seasonal Preorder của AgriMarket.
              </p>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
