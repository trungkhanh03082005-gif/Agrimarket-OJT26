import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  Check, 
  Clock, 
  Store, 
  Package, 
  Truck, 
  Home, 
  Banknote, 
  Landmark, 
  CreditCard, 
  Printer, 
  RotateCw, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  Phone, 
  Tractor, 
  ShoppingCart 
} from "lucide-react";
import authService from "../../services/authService";
import cartService from "../../services/cartService";
import orderService from "../../services/orderService";
import useProfile from "../../hooks/useProfile";
import ProfileLayout from "../../components/profile/ProfileLayout";
import "./CustomerOrderDetail.css";
import "../Profile/Profile.css";

// Import local images from Home assets
import bunchedCarrots from "../Home/assets/bunched_carrots.png";
import heirloomTomatoes from "../Home/assets/heirloom_tomatoes.png";
import honeycrispApples from "../Home/assets/honeycrisp_apples.png";

// Mock orders list to load detailed item information
const ORDERS_DB = {
  "FH-2024-8892": {
    id: "FH-2024-8892",
    status: "delivered",
    statusLabel: "Đã giao",
    date: "12 thg 10, 2024",
    time: "10:24 SA",
    subtotal: 3505500,
    shippingFee: 57000,
    serviceFee: 31250,
    discount: 31250,
    amount: 3562500,
    recipient: "Nguyễn Thị Lan",
    address: "123 Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh",
    phone: "0901 234 567",
    trackingNumber: "FH-TRACK-889212",
    cardEnding: "4492",
    provider: {
      name: "Nông trại hữu cơ Thung lũng Xanh",
      location: "Đơn Dương, Lâm Đồng",
      estYear: 2012,
      avatarText: "TX",
      avatarBg: "#1b5e20",
    },
    items: [
      { name: "Cà rốt hữu cơ Thung lũng Xanh", farmer: "Nông trại Thung lũng Xanh", price: 112500, qty: 10, img: bunchedCarrots },
      { name: "Cà chua Heirloom hữu cơ", farmer: "Nông trại Thung lũng Xanh", price: 49900, qty: 15, img: heirloomTomatoes },
      { name: "Táo giòn ngọt Honeycrisp", farmer: "Nông trại Thung lũng Xanh", price: 69000, qty: 8, img: honeycrispApples },
      { name: "Rau cải thìa Eco", farmer: "Nông trại Thung lũng Xanh", price: 45000, qty: 10, img: bunchedCarrots },
      { name: "Dâu tây sạch loại A", farmer: "Nông trại Thung lũng Xanh", price: 150000, qty: 3, img: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=200" },
      { name: "Mật ong nguyên chất", farmer: "Nông trại Thung lũng Xanh", price: 180000, qty: 1, img: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200" }
    ]
  },
  "FH-2024-9104": {
    id: "FH-2024-9104",
    status: "shipping",
    statusLabel: "Chờ giao hàng",
    date: "14 thg 10, 2024",
    time: "03:15 CH",
    subtotal: 2100000,
    shippingFee: 50000,
    serviceFee: 25000,
    discount: 25000,
    amount: 2150000,
    recipient: "Lê Hoàng Nam",
    address: "456 Trần Hưng Đạo, Phường Nguyễn Cư Trinh, Quận 1, TP. Hồ Chí Minh",
    phone: "0918 765 432",
    trackingNumber: "FH-TRACK-910488",
    cardEnding: "8102",
    provider: {
      name: "Nhà máy bơ sữa thủ công Hillside",
      location: "Ba Vì, Hà Nội",
      estYear: 2015,
      avatarText: "HS",
      avatarBg: "#0d47a1",
    },
    items: [
      { name: "Sữa tươi hữu cơ nguyên chất", farmer: "Hillside Dairy", price: 85000, qty: 10, img: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200" },
      { name: "Bơ béo thủ công Hillside", farmer: "Hillside Dairy", price: 250000, qty: 5, img: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200" }
    ]
  },
  "FH-2024-7721": {
    id: "FH-2024-7721",
    status: "cancelled",
    statusLabel: "Đã hủy",
    date: "05 thg 10, 2024",
    time: "09:12 SA",
    subtotal: 1052000,
    shippingFee: 75500,
    serviceFee: 15000,
    discount: 15000,
    amount: 1127500,
    recipient: "Phạm Minh Thư",
    address: "789 Điện Biên Phủ, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh",
    phone: "0934 987 654",
    trackingNumber: "FH-TRACK-772154",
    cardEnding: "9904",
    provider: {
      name: "Hợp tác xã Vườn Nắng",
      location: "Cái Bè, Tiền Giang",
      estYear: 2018,
      avatarText: "VN",
      avatarBg: "#e65100",
    },
    items: [
      { name: "Táo giòn ngọt Honeycrisp", farmer: "Vườn Nắng", price: 69000, qty: 10, img: honeycrispApples },
      { name: "Cà chua Heirloom đỏ mọng", farmer: "Vườn Nắng", price: 49900, qty: 5, img: heirloomTomatoes },
      { name: "Cà rốt giống Nhật", farmer: "Vườn Nắng", price: 112500, qty: 1, img: bunchedCarrots }
    ]
  },
  "FH-2026-1011": {
    id: "FH-2026-1011",
    status: "pending",
    statusLabel: "Chờ xác nhận",
    date: "06 thg 06, 2026",
    time: "16:30 CH",
    subtotal: 215000,
    shippingFee: 35000,
    serviceFee: 10000,
    discount: 10000,
    amount: 250000,
    recipient: "Hoàng Văn Bình",
    address: "12 Nguyễn Thị Minh Khai, Quận 3, TP. Hồ Chí Minh",
    phone: "0909 333 444",
    trackingNumber: "FH-TRACK-101101",
    cardEnding: "2201",
    provider: {
      name: "Nông trại hữu cơ Sông Hồng",
      location: "Gia Lâm, Hà Nội",
      estYear: 2020,
      avatarText: "SH",
      avatarBg: "#004d40",
    },
    items: [
      { name: "Gạo tám xoan đặc sản", farmer: "Sông Hồng Farm", price: 215000, qty: 1, img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200" }
    ]
  },
  "FH-2026-1012": {
    id: "FH-2026-1012",
    status: "confirmed",
    statusLabel: "Chờ lấy hàng",
    date: "05 thg 06, 2026",
    time: "08:20 SA",
    subtotal: 1150000,
    shippingFee: 50000,
    serviceFee: 20000,
    discount: 20000,
    amount: 1200000,
    recipient: "Nguyễn Thị Trúc",
    address: "99 Lê Văn Sỹ, Quận Phú Nhuận, TP. Hồ Chí Minh",
    phone: "0988 555 666",
    trackingNumber: "FH-TRACK-101202",
    cardEnding: "1554",
    provider: {
      name: "Vườn Cây Trái Miền Tây",
      location: "Chợ Lách, Bến Tre",
      estYear: 2010,
      avatarText: "MT",
      avatarBg: "#3e2723",
    },
    items: [
      { name: "Giống xoài cát Hòa Lộc ngon", farmer: "Vườn Miền Tây", price: 45000, qty: 10, img: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=200" },
      { name: "Táo hữu cơ giòn", farmer: "Vườn Miền Tây", price: 69000, qty: 10, img: honeycrispApples }
    ]
  },
  "FH-2026-1013": {
    id: "FH-2026-1013",
    status: "preparing",
    statusLabel: "Đang chuẩn bị",
    date: "04 thg 06, 2026",
    time: "14:15 CH",
    subtotal: 600000,
    shippingFee: 40000,
    serviceFee: 15000,
    discount: 15000,
    amount: 640000,
    recipient: "Trần Minh Quân",
    address: "88 Cách Mạng Tháng Tám, Quận 10, TP. Hồ Chí Minh",
    phone: "0977 111 222",
    trackingNumber: "FH-TRACK-101303",
    cardEnding: "4771",
    provider: {
      name: "Đà Lạt Eco Farm",
      location: "Lạc Dương, Lâm Đồng",
      estYear: 2017,
      avatarText: "DL",
      avatarBg: "#33691e",
    },
    items: [
      { name: "Rau xà lách thủy canh Eco", farmer: "Đà Lạt Eco", price: 30000, qty: 10, img: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=200" },
      { name: "Cà rốt baby giòn ngọt", farmer: "Đà Lạt Eco", price: 30000, qty: 10, img: bunchedCarrots }
    ]
  }
};

const TIMELINE_STEPS = [
  { key: "placed", label: "Chờ xác nhận", icon: "✓" },
  { key: "preparing", label: "Đang chuẩn bị", icon: "📦" },
  { key: "confirmed", label: "Chờ lấy hàng", icon: "✓" },
  { key: "shipping", label: "Chờ giao hàng", icon: "🚚" },
  { key: "delivered", label: "Đã giao", icon: "🏠" },
];

const getActiveStepIndex = (status) => {
  if (status === "pending") return 0;
  if (status === "preparing") return 1;
  if (status === "confirmed") return 2;
  if (status === "shipping") return 3;
  if (status === "delivered") return 4;
  return -1;
};

export const CustomerOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [user, setUser] = useState(null);
  const [order, setOrder] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [selectedReason, setSelectedReason] = useState("Thay đổi ý định mua hàng");
  const [customReason, setCustomReason] = useState("");

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);

    const loadOrderDetail = async () => {
      if (currentUser) {
        try {
          const fetched = await orderService.getOrderById(id);
          console.log("[OrderDetail] Fetched order:", fetched);
          console.log("[OrderDetail] paymentMethod:", fetched?.paymentMethod);
          console.log("[OrderDetail] provider:", fetched?.provider);
          setOrder(fetched);
        } catch (err) {
          console.error("Lỗi khi load chi tiết đơn hàng từ API:", err);
          fallbackLoad();
        }
      } else {
        fallbackLoad();
      }
    };

    const fallbackLoad = () => {
      const stored = localStorage.getItem("agrimarket_orders");
      const storedOrders = stored ? JSON.parse(stored) : [];
      const localOrder = storedOrders.find(o => o.id === id);
      if (localOrder) {
        setOrder(localOrder);
      } else {
        const fetchedOrder = ORDERS_DB[id];
        if (fetchedOrder) setOrder(fetchedOrder);
      }
    };

    loadOrderDetail();
  }, [id]);

  const handleCancelOrder = async () => {
    const finalReason = selectedReason === "Lý do khác" ? customReason.trim() : selectedReason;
    if (selectedReason === "Lý do khác" && !customReason.trim()) {
      alert("Vui lòng nhập lý do hủy đơn hàng của bạn.");
      return;
    }

    if (user) {
      try {
        const updated = await orderService.cancelOrder(id, finalReason);
        setOrder(updated);
        setShowCancelModal(false);
        setToastMessage("Hủy đơn hàng thành công!");
        setTimeout(() => setToastMessage(""), 3000);
      } catch (err) {
        console.error("Lỗi khi hủy đơn hàng:", err);
        alert(err.response?.data || "Hủy đơn hàng thất bại. Vui lòng thử lại.");
      }
    } else {
      const updatedOrder = {
        ...order,
        status: "cancelled",
        statusLabel: "Đã hủy",
        cancelReason: finalReason || "Không có lý do cụ thể"
      };
      setOrder(updatedOrder);
      const stored = localStorage.getItem("agrimarket_orders");
      if (stored) {
        const storedOrders = JSON.parse(stored);
        const updatedOrders = storedOrders.map(o => o.id === id ? updatedOrder : o);
        localStorage.setItem("agrimarket_orders", JSON.stringify(updatedOrders));
      }
      setShowCancelModal(false);
      setToastMessage("Hủy đơn hàng thành công!");
      setTimeout(() => setToastMessage(""), 3000);
    }
  };

  if (!order) {
    return (
      <div className="od-loading">
        <div className="od-loading-spinner">⏳</div>
        <h3>Đang tải thông tin đơn hàng...</h3>
        <p>Nếu quá lâu, hãy <Link to="/profile/orders">quay lại danh sách đơn hàng</Link>.</p>
      </div>
    );
  }

  const formatVND = (value) => value.toLocaleString("vi-VN") + " ₫";
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const activeIndex = getActiveStepIndex(order.status);

  // Fallback farmer details default profile photo
  const defaultFarmerPhoto = "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=120&auto=format&fit=crop&q=80";

  // Helper to render timeline step icons as SVGs
  const renderStepIcon = (key, isCompleted, isCurrent) => {
    if (isCompleted) {
      return <Check className="od-icon-svg" size={16} strokeWidth={3.5} />;
    }

    switch (key) {
      case "placed":
        return <Clock className="od-icon-svg" size={16} />;
      case "confirmed":
        return <Store className="od-icon-svg" size={16} />;
      case "preparing":
        return <Package className="od-icon-svg" size={16} />;
      case "shipping":
        return <Truck className="od-icon-svg" size={16} />;
      case "delivered":
        return <Home className="od-icon-svg" size={16} />;
      default:
        return null;
    }
  };

  // Helper to determine simulated steps date/time
  const getStepDateTime = (idx, stepKey, order, isCompleted, isCurrent) => {
    if (!isCompleted && !isCurrent) {
      if (stepKey === "delivered") return "Dự kiến 2 ngày";
      return "";
    }
    const baseDate = order.date || "12 thg 10, 2024";
    const baseTime = order.time || "10:24 SA";

    // Simulating logical dates/times for realistic display
    if (stepKey === "placed") return `${baseDate}, ${baseTime}`;
    if (stepKey === "confirmed") return `${baseDate}, 11:20 SA`;
    if (stepKey === "preparing") return `${baseDate}, 06:15 CH`;
    if (stepKey === "shipping") return `${baseDate}, 14:30 CH`;
    if (stepKey === "delivered") return `${baseDate}`;
    return "";
  };

  // Helper to get payment method details dynamically
  const getPaymentMethodDetails = (method, status) => {
    const isPaid = (status || "").toLowerCase() === "paid";
    // Normalize to ASCII for robust Vietnamese string matching
    const raw = (method || "");
    const normalizedMethod = raw.toLowerCase();
    const asciiMethod = normalizedMethod
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x00-\x7F]/g, "");

    // Match COD: cash on delivery
    const isCod = asciiMethod.includes("cod")
      || asciiMethod.includes("tien mat")
      || asciiMethod.includes("nhan hang");

    // Match bank transfer
    const isBank = asciiMethod.includes("chuyen khoan")
      || asciiMethod.includes("ngan hang")
      || asciiMethod.includes("bank_transfer")
      || asciiMethod.includes("transfer")
      || asciiMethod.includes("vnpay");

    const isCard = asciiMethod.includes("card")
      || asciiMethod.includes("visa")
      || asciiMethod.includes("mastercard")
      || asciiMethod.includes("credit")
      || asciiMethod.includes("wallet");

    if (isCod) {
      return {
        icon: <Banknote size={20} />,
        name: "Thanh to\u00e1n khi nh\u1eadn h\u00e0ng (COD)",
        statusText: order.status === "delivered"
          ? "Thanh to\u00e1n th\u00e0nh c\u00f4ng"
          : "Thanh to\u00e1n b\u1eb1ng ti\u1ec1n m\u1eb7t khi nh\u1eadn h\u00e0ng"
      };
    } else if (isBank) {
      return {
        icon: <Landmark size={20} />,
        name: asciiMethod.includes("vnpay")
          ? "C\u1ed5ng thanh to\u00e1n VNPAY"
          : "Chuy\u1ec3n kho\u1ea3n ng\u00e2n h\u00e0ng",
        statusText: isPaid
          ? "Thanh to\u00e1n th\u00e0nh c\u00f4ng"
          : "Ch\u1edd chuy\u1ec3n kho\u1ea3n thanh to\u00e1n"
      };
    } else if (isCard) {
      return {
        icon: <CreditCard size={20} />,
        name: "Thanh to\u00e1n b\u1eb1ng th\u1ebb Visa",
        statusText: isPaid ? "Thanh to\u00e1n th\u00e0nh c\u00f4ng" : "Ch\u1edd thanh to\u00e1n"
      };
    } else {
      return {
        icon: <CreditCard size={20} />,
        name: raw || "Ch\u01b0a x\u00e1c \u0111\u1ecbnh",
        statusText: isPaid ? "Thanh to\u00e1n th\u00e0nh c\u00f4ng" : "Ch\u1edd thanh to\u00e1n"
      };
    }
  };

  return (
    <ProfileLayout profile={profile}>
      <div className="cod-content tracker-theme">

        {/* ── PAGE HEADER ── */}
        <div className="cod-page-header">
          <div className="cod-header-left">
            <h1 className="cod-page-title">
              Theo dõi Vận đơn #{order.trackingNumber || `AG-${order.id || "99824"}`}
            </h1>
            <div className="cod-meta-row">
              <span className="cod-meta-id">Đơn hàng #{order.id || order.orderCode}</span>
              <span className="cod-meta-sep">•</span>
              <span className="cod-meta-date">Đặt ngày {order.date || "11 thg 06, 2026"} lúc {order.time || "08:20 SA"}</span>
              <span className="cod-meta-sep">•</span>
              <span className={`cod-status-badge status-${order.status}`}>{order.statusLabel || "Đang xử lý"}</span>
            </div>
          </div>
          <div className="cod-header-actions">
            <button className="cod-invoice-btn" onClick={() => window.print()} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Printer size={16} />
              In Manifest đơn hàng
            </button>
            {order.status === "delivered" && (
              <button className="cod-rebuy-btn" onClick={() => alert("Đã thêm các sản phẩm vào giỏ hàng!")} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <RotateCw size={15} />
                Mua lại đơn hàng
              </button>
            )}
          </div>
        </div>

        {/* ── 2-COLUMN PREMIUM CONTENT TRACKING GRID (No Map) ── */}
        <div className="cod-grid tracker-layout">

          {/* LEFT COLUMN: Status Timeline, Product Manifest, and Proof of Delivery */}
          <div className="cod-main-col">

            {/* 1. Status Timeline Tracker */}
            {order.status !== "cancelled" && order.status !== "rejected" ? (
              <div className="cod-card tracking-timeline-card">
                <h2 className="cod-card-title border-bottom">Trạng thái vận chuyển</h2>
                <div className="cod-timeline-wrapper tracker-timeline">
                  <div className="cod-timeline">
                    {TIMELINE_STEPS.map((step, idx) => {
                      const isCompleted = order.status === "delivered" ? true : idx < activeIndex;
                      const isCurrent = order.status === "delivered" ? false : idx === activeIndex;
                      const isPending = order.status === "delivered" ? false : idx > activeIndex;
                      const stepClass = `cod-step${isCompleted ? " completed" : ""}${isCurrent ? " current" : ""}${isPending ? " pending" : ""}`;
                      return (
                        <React.Fragment key={step.key}>
                          <div className={stepClass}>
                            <div className="cod-step-circle">
                              {renderStepIcon(step.key, isCompleted, isCurrent)}
                            </div>
                            <span className="cod-step-name">{step.label}</span>
                            <span className="cod-step-sub">
                              {getStepDateTime(idx, step.key, order, isCompleted, isCurrent)}
                            </span>
                          </div>
                          {idx < TIMELINE_STEPS.length - 1 && (
                            <div className={`cod-connector${isCompleted ? " done" : ""}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="cod-cancelled-card">
                <div className="cod-cancelled-icon" style={order.status === "rejected" ? { backgroundColor: "#fef2f2", color: "#b91c1c" } : {}}>
                  {order.status === "rejected" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  )}
                </div>
                <div className="cod-cancelled-body">
                  <h3>{order.status === "rejected" ? "Đơn hàng đã bị từ chối" : "Đơn hàng đã bị hủy"}</h3>
                  <p>{order.status === "rejected" ? "Nhà vườn đã từ chối đơn hàng của bạn." : "Đơn hàng này không còn được xử lý. Liên hệ bộ phận hỗ trợ nếu cần giúp đỡ."}</p>
                  {order.cancelReason && (
                    <p className="cod-cancel-reason-line">
                      <strong>Lý do:</strong> "{order.cancelReason}"
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 2. Product Manifest Item Cards (styled premium like Manifest in Image 1) */}
            <div className="cod-card tracking-manifest-card">
              <div className="manifest-card-title-row">
                <h2 className="cod-card-title">Hàng hóa đóng gói (Manifest)</h2>
                {order.status === "shipping" && <span className="manifest-priority-badge">Khẩn Cấp</span>}
              </div>

              <div className="tracker-manifest-list">
                {order.items && order.items.map((item, index) => (
                  <div className="tracker-manifest-row" key={index}>
                    <img src={item.img} alt={item.name} className="tracker-manifest-img" />
                    <div className="tracker-manifest-info">
                      <span className="tracker-item-name">{item.name}</span>
                      <span className="tracker-item-farmer">Nhà vườn: {item.farmer}</span>
                      <span className="tracker-item-qty">Số lượng: {item.qty} đ.vị</span>
                    </div>
                    <div className="cod-item-total">
                      <span>{formatVND(item.price * item.qty)}</span>

                      {order.status === "delivered" && (
                        <div className="item-review-action">
                          <button
                            className="btn-review-product"
                            onClick={() =>
                              navigate(`/profile/orders/${order.id}/review/${index}`, {
                                state: {
                                  order: {
                                    ...order,
                                    items: orderItems,
                                  },
                                  item,
                                  itemIndex: index,
                                },
                              })
                            }
                          >
                            {item.isReviewed ? "Sửa đánh giá" : "Đánh giá"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Proof of Delivery block (Image 1 style) */}
            {order.status !== "cancelled" && order.status !== "rejected" && (
              <div className="cod-card proof-of-delivery-card">
                <h2 className="cod-card-title border-bottom">Bằng chứng giao hàng (POD)</h2>
                {order.status === "delivered" ? (
                  <div className="pod-completed-content">
                    <p className="pod-success-lbl">🎉 Đơn hàng đã được giao nhận thành công!</p>
                    <div className="pod-visuals-grid">
                      <div className="pod-visual-box">
                        <span className="visual-lbl">Chữ ký số người nhận:</span>
                        <div className="signature-box">
                          {order.podSignature ? (
                            <img src={order.podSignature} alt="Chữ ký nhận hàng" />
                          ) : (
                            <div className="fallback-sig"><i>Đã ký nhận trực tiếp</i></div>
                          )}
                        </div>
                      </div>
                      <div className="pod-visual-box">
                        <span className="visual-lbl">Ảnh chụp drop-off:</span>
                        {order.podPhoto ? (
                          <img src={order.podPhoto} alt="Ảnh giao nhận hàng" className="dropoff-photo" />
                        ) : (
                          <div className="fallback-photo">📷 Đã chụp ảnh lưu trữ trên hệ thống</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pod-pending-content">
                    <div className="pod-pending-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <FileText size={24} />
                    </div>
                    <span className="pod-pending-title">Đang chờ giao hàng</span>
                    <p className="pod-pending-desc">
                      Chữ ký người nhận và ảnh chụp drop-off tại cửa hàng sẽ tự động hiển thị ở đây sau khi tài xế giao hàng thành công.
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Assigned Driver, Pickup Origin, Destination details */}
          <div className="cod-side-col">

            {/* 2. Pickup Origin Card (Sunrise Valley Farms info) */}
            <div className="cod-card location-card origin">
              <h3 className="sidebar-sec-title">Điểm lấy hàng (Pickup Origin)</h3>
              <div className="location-header-row">
                <span className="loc-icon" style={{ display: "inline-flex", alignItems: "center" }}><Tractor size={18} /></span>
                <div className="loc-meta">
                  <span className="loc-name">{order.provider?.name || "Nông trại hữu cơ Sông Hồng"}</span>
                  <span className="loc-address">{order.provider?.location || "Gia Lâm, Hà Nội"}</span>
                </div>
              </div>
              <div className="location-footer-row">
                <a href="#" className="loc-link" onClick={(e) => e.preventDefault()}>Liên hệ Quản lý Nhà vườn</a>
              </div>
            </div>

            {/* 3. Destination Card (Customer Address info) */}
            <div className="cod-card location-card destination">
              <h3 className="sidebar-sec-title">Điểm giao hàng (Destination)</h3>
              <div className="location-header-row">
                <span className="loc-icon" style={{ display: "inline-flex", alignItems: "center" }}><ShoppingCart size={18} /></span>
                <div className="loc-meta">
                  <span className="loc-name">{order.recipient || "Cửa hàng bán lẻ"}</span>
                  <span className="loc-address">{order.address || "Chưa có địa chỉ"}</span>
                  <span className="loc-phone" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Phone size={14} /> {order.phone}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Payment summary box */}
            <div className="cod-card payment-summary-tracker-card">
              <h3 className="sidebar-sec-title">Tóm tắt thanh toán</h3>
              <div className="tracker-payment-rows">
                <div className="t-pay-row">
                  <span>Tổng tiền hàng:</span>
                  <span>{formatVND(order.subtotal || 0)}</span>
                </div>
                <div className="t-pay-row">
                  <span>Phí vận chuyển:</span>
                  <span>{formatVND(order.shippingFee || 0)}</span>
                </div>
                <hr className="t-divider" />
                <div className="t-pay-row total">
                  <span>Tổng thanh toán:</span>
                  <span className="t-total-value">{formatVND(order.amount || 0)}</span>
                </div>
              </div>
              <div className="tracker-pay-method">
                <span>Phương thức: <strong>{order.paymentMethod || "Tiền mặt (COD)"}</strong></span>
              </div>
            </div>

            {/* Cancel Order (Only if pending) */}
            {order.status === "pending" && (
              <button className="cod-cancel-btn tracking-cancel" onClick={() => setShowCancelModal(true)}>
                Hủy đơn hàng này
              </button>
            )}

            <div className="cod-help-row tracking-help">
              <span>Cần hỗ trợ gấp? </span>
              <Link to="/help" className="cod-help-link">Liên hệ AgriMarket Support</Link>
            </div>

          </div>

        </div>

      </div>

      {/* ── TOAST ── */}
      {toastMessage && (
        <div className="cod-toast">
          <span className="cod-toast-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={16} strokeWidth={3} />
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── CANCEL MODAL ── */}
      {showCancelModal && (
        <div className="cod-modal-overlay">
          <div className="cod-modal-box">
            <h3 className="cod-modal-title">Xác nhận hủy đơn hàng</h3>
            <p className="cod-modal-msg">Vui lòng chọn lý do hủy đơn hàng #{order.id}:</p>
            <div className="cod-reasons-list">
              {[
                "Thay đổi ý định mua hàng",
                "Tìm thấy nơi khác có giá tốt hơn",
                "Đặt nhầm sản phẩm / số lượng",
                "Thời gian giao hàng dự kiến quá lâu",
                "Lý do khác"
              ].map((r) => (
                <label key={r} className="cod-reason-item">
                  <input
                    type="radio"
                    name="cancelReason"
                    value={r}
                    checked={selectedReason === r}
                    onChange={(e) => setSelectedReason(e.target.value)}
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
            {selectedReason === "Lý do khác" && (
              <textarea
                className="cod-reason-textarea"
                placeholder="Nhập lý do chi tiết của bạn tại đây..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
              />
            )}
            <div className="cod-modal-actions">
              <button className="cod-modal-cancel" onClick={() => setShowCancelModal(false)}>
                Không, quay lại
              </button>
              <button className="cod-modal-confirm" onClick={handleCancelOrder}>
                Xác nhận hủy đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </ProfileLayout>
  );
};

export default CustomerOrderDetail;
