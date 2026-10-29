/* PreorderCheckout.jsx */
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../../components/common/Header/Header";
import authService from "../../services/authService";
import * as preorderService from "../../services/preorderService";
import orderService from "../../services/orderService";
import apiClient from "../../services/apiClient";
import { Leaf, Shield } from "lucide-react";
import "./PreorderCheckout.css";

const parseDeliveryWindow = (windowStr) => {
  if (!windowStr) return { min: null, max: null };
  const regex = /(\d{2})\/(\d{2})(?:\/(\d{4}))?/g;
  const matches = [...windowStr.matchAll(regex)];
  if (matches.length >= 2) {
    const first = matches[0];
    const second = matches[1];
    
    const year2 = second[3] ? parseInt(second[3]) : 2026;
    const year1 = first[3] ? parseInt(first[3]) : year2;
    
    const minDate = new Date(year1, parseInt(first[2]) - 1, parseInt(first[1]));
    const maxDate = new Date(year2, parseInt(second[2]) - 1, parseInt(second[1]));
    
    return { min: minDate, max: maxDate };
  }
  return { min: null, max: null };
};

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

const PreorderCheckout = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  
  // Checkout data states
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(5);
  // Delivery is always via GHN shipping
  const [customDate, setCustomDate] = useState("2026-09-01");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [placedPreorderId, setPlacedPreorderId] = useState(null);

  // Payment & Promotion states
  const [paymentMethod, setPaymentMethod] = useState("cod"); // cod, vnpay
  const discountAmount = 0;

  const parsedLimits = useMemo(() => {
    if (!product) return { min: null, max: null };
    
    let minDate = new Date();
    if (product.harvestDate) {
      const parts = product.harvestDate.split("-");
      if (parts.length === 3) {
        minDate = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        const partsSlash = product.harvestDate.split("/");
        if (partsSlash.length === 3) {
          minDate = new Date(partsSlash[2], partsSlash[1] - 1, partsSlash[0]);
        } else {
          const d = new Date(product.harvestDate);
          if (!isNaN(d.getTime())) {
            minDate = d;
          }
        }
      }
    }
    minDate.setHours(0,0,0,0);

    let maxDate = null;
    if (product.expirationDate) {
      const parts = product.expirationDate.split("-");
      if (parts.length === 3) {
        maxDate = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        const partsSlash = product.expirationDate.split("/");
        if (partsSlash.length === 3) {
          maxDate = new Date(partsSlash[2], partsSlash[1] - 1, partsSlash[0]);
        } else {
          const d = new Date(product.expirationDate);
          if (!isNaN(d.getTime())) {
            maxDate = d;
          }
        }
      }
      if (maxDate) {
        maxDate.setHours(23,59,59,999);
      }
    }

    if (!maxDate) {
      const fallbackMax = new Date(minDate);
      fallbackMax.setFullYear(fallbackMax.getFullYear() + 1);
      maxDate = fallbackMax;
    }

    return { min: minDate, max: maxDate };
  }, [product]);

  const formatDateString = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  };

  // Helper format VND
  const formatVND = (number) => {
    return new Intl.NumberFormat("vi-VN").format(number) + " đ";
  };

  useEffect(() => {
    // Check auth
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    // Load checkout item from localStorage
    const checkoutDataRaw = localStorage.getItem("agrimarket_checkout");
    if (checkoutDataRaw) {
      try {
        const parsed = JSON.parse(checkoutDataRaw);
        if (parsed && parsed.selectedItems && parsed.selectedItems.length > 0) {
          const item = parsed.selectedItems[0];
          setProduct(item);
          setQuantity(item.quantity || 5);
        } else {
          loadMockFallback();
        }
      } catch (err) {
        console.error("Lỗi parse checkout data:", err);
        loadMockFallback();
      }
    } else {
      loadMockFallback();
    }
  }, []);



  const loadMockFallback = () => {
    setProduct({
      id: "mock-2",
      name: "Cà rốt gia truyền hữu cơ",
      price: 112500,
      unit: "bó",
      imageUrl: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600",
      farmerId: 102,
      farmerName: "Nông trại Green Valley",
      expectedHarvest: "Cuối tháng 08, 2026",
      deliveryWindow: "Từ 01/09 đến 07/09/2026",
      isPreorder: true
    });
  };

  if (!product) {
    return (
      <div className="preorder-checkout-page">
        <Header activeTab="" />
        <div style={{ textAlign: "center", padding: "100px 20px", color: "#64748b" }}>
          Đang tải dữ liệu đơn đặt trước...
        </div>
      </div>
    );
  }

  // Cost calculations
  const pricePerUnit = product.price || 0;
  const subtotal = pricePerUnit * quantity;
  const deliveryFee = 35000; // Luôn vận chuyển qua GHN
  const serviceFee = 15000; // Phí dịch vụ cố định
  const totalAmount = Math.max(0, subtotal + deliveryFee + serviceFee - discountAmount);
  const depositAmount = Math.round(totalAmount * 0.2); // 20% Deposit cọc

  const handleQuantityChange = (newVal) => {
    if (newVal < 1) return;
    setQuantity(newVal);
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
        ],
        discount: 0
      };
      const result = await preorderService.createPreorder(payload);
      setPlacedPreorderId(result.id);
      
      // Dispatch event to update tabs/badges elsewhere
      window.dispatchEvent(new Event("preordersUpdated"));
      
      if (paymentMethod === "cod") {
        try {
          await apiClient.put(`/api/preorders/${result.id}/status?status=pending`);
        } catch (statusErr) {
          console.error("Lỗi khi cập nhật trạng thái đơn đặt trước:", statusErr);
        }
        setShowSuccessModal(true);
      } else {
        // Request VNPay payment URL for preorder deposit
        const paymentRes = await orderService.createVNPayPaymentUrl("PRE-" + result.id, "delivery");
        if (paymentRes && paymentRes.paymentUrl) {
          window.location.href = paymentRes.paymentUrl;
        } else {
          throw new Error("Không thể tạo liên kết thanh toán VNPay.");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi tạo đơn đặt trước: " + (err.response?.data || err.message));
    }
  };

  return (
    <div className="preorder-checkout-page">
      <Header activeTab="preorder" />

      <main className="preorder-checkout-main">
        {/* Breadcrumb */}
        <nav className="preorder-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span className="separator">&gt;</span>
          <Link to="/products">Cửa hàng</Link>
          <span className="separator">&gt;</span>
          <span className="current">Đặt trước nông sản</span>
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
                      <div className="box-value">{product.expectedHarvest || "Cuối tháng 08, 2026"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Certifications Row */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "12px 0" }}>
                {product.farmerOrganicUrl && (
                  <span style={{ backgroundColor: "#e8f5e9", color: "#1b5e20", border: "1px solid #a7f3d0", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", fontWeight: "700" }}>
                    🌿 Hữu cơ (Organic)
                  </span>
                )}
                {product.farmerVietgapUrl && (
                  <span style={{ backgroundColor: "#fffbeb", color: "#b45309", border: "1px solid #fef3c7", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", fontWeight: "700" }}>
                    🏅 VietGAP
                  </span>
                )}
                {product.farmerGlobalgapUrl && (
                  <span style={{ backgroundColor: "#eff6ff", color: "#1e40af", border: "1px solid #dbeafe", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", fontWeight: "700" }}>
                    🌐 GlobalGAP
                  </span>
                )}
              </div>

              {/* Rating & Sold Row */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "8px 0", fontSize: "14px", color: "#475569" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ color: "#fbbf24", fontSize: "16px" }}>★</span>
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
                <label className="group-label">Chọn số lượng đặt trước ({product.unit || "bó"})</label>
                <div className="qty-selector-row">
                  <div className="qty-control-buttons">
                    <button 
                      type="button" 
                      className="qty-btn" 
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                    >
                      －
                    </button>
                    <input 
                      type="text" 
                      className="qty-input-text" 
                      value={quantity}
                      readOnly
                    />
                    <button 
                      type="button" 
                      className="qty-btn" 
                      onClick={() => handleQuantityChange(quantity + 1)}
                    >
                      ＋
                    </button>
                  </div>
                  <span className="price-indicator-text">{formatVND(pricePerUnit)} / {product.unit || "bó"}</span>
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

            {/* 3. Payment Methods */}
            <div className="preorder-card-panel" style={{ marginTop: "24px" }}>
              <h3 className="config-title">Phương thức thanh toán</h3>
              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>Lựa chọn phương thức thanh toán khoản đặt cọc 20%.</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", border: `1px solid ${paymentMethod === 'cod' ? '#16a34a' : '#e2e8f0'}`, borderRadius: "8px", backgroundColor: paymentMethod === 'cod' ? '#f0fdf4' : 'transparent', cursor: "pointer" }}>
                  <input 
                    type="radio" 
                    name="preorderPayment" 
                    value="cod" 
                    checked={paymentMethod === 'cod'} 
                    onChange={() => setPaymentMethod('cod')}
                  />
                  <div>
                    <strong style={{ display: "block", fontSize: "14px", color: "#1e293b" }}>COD (Đặt cọc giữ chỗ)</strong>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Thanh toán cọc cho shipper hoặc nhân viên khi có thông báo xác nhận đơn.</span>
                  </div>
                </label>
                
                <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", border: `1px solid ${paymentMethod === 'vnpay' ? '#16a34a' : '#e2e8f0'}`, borderRadius: "8px", backgroundColor: paymentMethod === 'vnpay' ? '#f0fdf4' : 'transparent', cursor: "pointer" }}>
                  <input 
                    type="radio" 
                    name="preorderPayment" 
                    value="vnpay" 
                    checked={paymentMethod === 'vnpay'} 
                    onChange={() => setPaymentMethod('vnpay')}
                  />
                  <div>
                    <strong style={{ display: "block", fontSize: "14px", color: "#1e293b" }}>Thanh toán trực tuyến qua VNPAY</strong>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Thanh toán cọc 20% ngay trực tuyến bằng quét mã VietQR hoặc ATM nội địa.</span>
                  </div>
                </label>
              </div>
            </div>



            {/* 5. Bottom Trust Badges */}
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
                {discountAmount > 0 && (
                  <div className="summary-item-line" style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "#dc2626", fontWeight: "600" }}>
                    <span>Khuyến mãi</span>
                    <span>-{formatVND(discountAmount)}</span>
                  </div>
                )}
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

      {/* Success Modal Overlay */}
      {showSuccessModal && (
        <div className="preorder-success-overlay">
          <div className="preorder-success-modal">
            <div className="success-check-badge">✓</div>
            <h3>Đặt trước thành công!</h3>
            <p className="success-msg">
              Yêu cầu đặt trước sản phẩm mùa vụ của bạn đã được ghi nhận. 
              Khoản đặt cọc 20% đã được thanh toán thông qua số dư liên kết của bạn.
            </p>

            <div className="success-receipt-info">
              <div className="receipt-row">
                <span className="label">Mã đặt trước:</span>
                <span className="value">{placedPreorderId}</span>
              </div>
              <div className="receipt-row">
                <span className="label">Nông sản:</span>
                <span className="value">{quantity}x {product.name}</span>
              </div>
              <div className="receipt-row">
                <span className="label">Đã thanh toán cọc (20%):</span>
                <span className="value" style={{ color: "#16a34a" }}>{formatVND(depositAmount)}</span>
              </div>
              <div className="receipt-row">
                <span className="label">Dự kiến thu hoạch:</span>
                <span className="value">{product.expectedHarvest || "Cuối tháng 08, 2026"}</span>
              </div>
            </div>

            <div className="success-actions-col">
              <button 
                type="button" 
                className="btn-success-primary"
                onClick={() => {
                  navigate("/profile/orders");
                  // Trigger direct navigation to preorder tab if needed
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent("setActiveOrderTab", { detail: "preorder" }));
                  }, 100);
                }}
              >
                Xem đơn đặt trước của tôi
              </button>
              <button 
                type="button" 
                className="btn-success-outline"
                onClick={() => navigate("/products")}
              >
                Tiếp tục mua sắm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreorderCheckout;
