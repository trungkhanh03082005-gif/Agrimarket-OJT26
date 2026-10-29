import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { Package, Sprout, Check, X, User, Phone, MapPin, CreditCard, AlertTriangle, Clock, CheckCircle2, XCircle } from "lucide-react";
import orderService from "../../../services/orderService";
import "./OrderDetail.css";

const ORDER_STATUS_CONFIG = {
  pending:    { label: "Chờ xác nhận",   cls: "oh-st-pending",    color: "#f59e0b" },
  preparing:  { label: "Đang chuẩn bị",   cls: "oh-st-preparing",  color: "#8b5cf6" },
  confirmed:  { label: "Chờ lấy hàng",    cls: "oh-st-confirmed",  color: "#3b82f6" },
  shipping:   { label: "Chờ giao hàng",   cls: "oh-st-shipping",   color: "#06b6d4" },
  delivered:  { label: "Đã giao",         cls: "oh-st-delivered",  color: "#10b981" },
  cancelled:  { label: "Đã hủy",         cls: "oh-st-cancelled",  color: "#ef4444" },
  rejected:   { label: "Đã từ chối",     cls: "oh-st-rejected",   color: "#7f1d1d" },
};

const REJECT_REASONS = [
  "Sản phẩm đã hết hàng",
  "Không thể giao đến khu vực này",
  "Đơn hàng vượt quá khả năng cung ứng",
  "Sản phẩm tạm ngưng kinh doanh",
  "Thông tin giao hàng không hợp lệ",
  "Lý do khác",
];

const getOrderTimeline = (order) => {
  const steps = [];
  steps.push({
    id: 1,
    title: "Đơn hàng đã được đặt",
    desc: `Đơn hàng được đặt bởi ${order.recipient}.`,
    time: `${order.date || ""}, ${order.time || ""}`,
    done: true,
  });

  steps.push({
    id: 2,
    title: "Thanh toán",
    desc: "Thanh toán đơn hàng đã được ghi nhận.",
    time: `${order.date || ""}, ${order.time || ""}`,
    done: true,
  });

  const isConfirmedOrLater = ["preparing", "confirmed", "shipping", "delivered"].includes(order.status);
  const isRejected = order.status === "rejected";
  const isCancelled = order.status === "cancelled";

  if (isRejected) {
    steps.push({
      id: 3,
      title: "Đơn hàng bị từ chối",
      desc: order.cancelReason ? `Lý do: ${order.cancelReason}` : "Người bán đã từ chối đơn hàng.",
      time: "",
      done: true,
      error: true,
    });
  } else if (isCancelled) {
    steps.push({
      id: 3,
      title: "Đơn hàng đã bị hủy",
      desc: order.cancelReason ? `Lý do: ${order.cancelReason}` : "Đơn hàng đã bị hủy bỏ.",
      time: "",
      done: true,
      error: true,
    });
  } else {
    steps.push({
      id: 3,
      title: "Xác nhận đơn hàng",
      desc: isConfirmedOrLater 
        ? "Người bán đã xác nhận đơn hàng thành công." 
        : "Đang chờ xác nhận từ người bán.",
      time: "",
      done: isConfirmedOrLater,
    });
  }

  if (!isRejected && !isCancelled) {
    const isPreparing = order.status === "preparing";
    const isPreparedOrLater = ["confirmed", "shipping", "delivered"].includes(order.status);
    steps.push({
      id: 4,
      title: "Chuẩn bị hàng hóa",
      desc: isPreparedOrLater 
        ? "Nhà vườn đã chuẩn bị xong nông sản và đóng gói." 
        : isPreparing 
          ? "Nhà vườn đang chuẩn bị hàng hóa."
          : "Đang chờ chuẩn bị hàng.",
      time: "",
      done: isPreparedOrLater,
    });

    const isShippingOrLater = ["shipping", "delivered"].includes(order.status);
    steps.push({
      id: 5,
      title: "Chờ giao hàng",
      desc: isShippingOrLater 
        ? "Đơn hàng đang được vận chuyển tới khách hàng." 
        : "Đang chờ đơn vị vận chuyển lấy hàng.",
      time: "",
      done: isShippingOrLater,
    });

    const isDelivered = order.status === "delivered";
    steps.push({
      id: 6,
      title: "Đã giao hàng thành công",
      desc: isDelivered 
        ? "Khách hàng đã nhận được hàng và hoàn tất đơn hàng." 
        : "Chờ giao hàng.",
      time: "",
      done: isDelivered,
    });
  }

  return steps;
};

const getInitials = (name) => {
  if (!name) return "KH";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const formatVND = (amount) => {
  if (amount === undefined || amount === null) return "0 ₫";
  return amount.toLocaleString("vi-VN") + " ₫";
};

export const OrderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { farmerProfile } = useOutletContext();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Modals state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [rejectNote, setRejectNote] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3500);
  };

  useEffect(() => {
    const loadOrder = async () => {
      setLoading(true);
      try {
        const ords = await orderService.getFarmerOrders();
        // Match either raw ID or hashtag format
        const matched = ords.find(o => o.id === "#" + id || o.id === id);
        if (matched) {
          setOrder(matched);
        } else {
          showToast("Không tìm thấy đơn hàng.", "error");
        }
      } catch (err) {
        console.error("Lỗi khi tải chi tiết đơn hàng:", err);
        showToast("Không thể tải chi tiết đơn hàng.", "error");
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      loadOrder();
    }
  }, [id]);

  const handleUpdateStatus = async (newStatus, cancelReasonMsg = "") => {
    setIsUpdating(true);
    try {
      const updated = await orderService.updateFarmerOrderStatus(order.id, newStatus, cancelReasonMsg);
      showToast(`Cập nhật trạng thái sang "${ORDER_STATUS_CONFIG[newStatus]?.label}" thành công!`, "success");
      setOrder(updated);
    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data;
      const displayMsg = typeof serverMsg === "string" ? serverMsg : "Cập nhật trạng thái đơn hàng thất bại.";
      showToast(displayMsg, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmRejectOrder = async () => {
    const finalReason = rejectReason === "Lý do khác" ? rejectNote : rejectReason + (rejectNote ? ` - ${rejectNote}` : "");
    setShowRejectModal(false);
    await handleUpdateStatus("rejected", finalReason);
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
        Đang tải thông tin đơn hàng...
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#ef4444" }}>
        Không tìm thấy đơn hàng này hoặc bạn không có quyền truy cập.
      </div>
    );
  }

  const conf = ORDER_STATUS_CONFIG[order.status] || { label: order.status, cls: "" };
  const initials = getInitials(order.recipient);
  const timelineSteps = getOrderTimeline(order);

  // Address parsed lines
  const addressLines = order.address ? order.address.split(",").map(s => s.trim()) : [];

  return (
    <div className="od-page" style={{ padding: "20px 24px" }}>
      {/* Header / Topbar */}
      <header className="od-topbar" style={{ margin: "0 0 24px 0", padding: 0, border: "none" }}>
        <div className="od-topbar-left">
          <div className="od-breadcrumb">
            <button className="od-breadcrumb-link" onClick={() => navigate("/farmer/orders")}>
              Đơn hàng
            </button>
            <span className="od-breadcrumb-sep">›</span>
            <span className="od-breadcrumb-current">{order.id}</span>
          </div>
          <div className="od-topbar-heading">
            <h1 className="od-title">Đơn hàng {order.id}</h1>
            <span className={`badge-status ${conf.cls}`} style={{ display: "inline-flex", marginLeft: "12px", fontSize: "12.5px" }}>
              {conf.label}
            </span>
          </div>
          <p className="od-placed-at">Đặt lúc {order.date} {order.time}</p>
        </div>

        <div className="od-topbar-actions" style={{ display: "flex", gap: "10px" }}>
          {order.status === "pending" && (
            <>
              <button className="btn-secondary" onClick={() => setShowRejectModal(true)} disabled={isUpdating}>
                Từ chối đơn
              </button>
              <button className="btn-primary" onClick={() => handleUpdateStatus("preparing")} disabled={isUpdating}>
                Xác nhận đơn
              </button>
            </>
          )}

          {order.status === "preparing" && (
            <button className="btn-primary" onClick={() => handleUpdateStatus("confirmed")} disabled={isUpdating}>
              Chuyển giao cho đơn vị vận chuyển
            </button>
          )}

          {/* No buttons for confirmed or shipping status since farmer cannot update order status after transferring to shipper */}
        </div>
      </header>

      {/* Grid Content */}
      <div className="od-content">
        {/* LEFT COLUMN: Items & Timeline */}
        <div className="od-left">
          {/* Order Items */}
          <section className="od-card">
            <div className="od-card-header">
              <span className="icon" style={{ display: "inline-flex", alignItems: "center" }}><Package size={18} /></span>
              <h2 className="od-card-title">Danh sách sản phẩm</h2>
            </div>
            <div className="od-items-list">
              {order.items && order.items.map((item, idx) => (
                <div key={idx} className="od-item-row">
                  <div className="od-item-thumb">
                    {item.img ? (
                      <img src={item.img} alt={item.name} />
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", color: "#81c784" }}><Sprout size={20} /></span>
                    )}
                  </div>
                  <div className="od-item-info">
                    <span className="od-item-name">{item.name}</span>
                    <span className="od-item-farm">Nhà vườn: {farmerProfile?.farmName || "Của tôi"}</span>
                  </div>
                  <div className="od-item-price">
                    <span className="od-item-unit-price">{formatVND(item.price)} x {item.qty}</span>
                    <span className="od-item-total">{formatVND(item.price * item.qty)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Timeline */}
          <section className="od-card">
            <div className="od-card-header">
              <span className="icon" style={{ display: "inline-flex", alignItems: "center" }}><Clock size={18} /></span>
              <h2 className="od-card-title">Lịch sử trạng thái</h2>
            </div>
            <div className="od-timeline">
              {timelineSteps.map((step) => (
                <div key={step.id} className="od-timeline-item">
                  <div className={`od-timeline-dot ${step.done ? (step.error ? "od-dot-error" : "od-dot-done") : "od-dot-pending"}`}>
                    {step.done ? (
                      step.error ? <X size={12} /> : <Check size={12} />
                    ) : (
                      <div className="od-dot-inner" />
                    )}
                  </div>
                  <div className="od-timeline-body">
                    <div className="od-timeline-row">
                      <span className="od-timeline-title">{step.title}</span>
                      {step.time && <span className="od-timeline-time">{step.time}</span>}
                    </div>
                    <p className="od-timeline-desc">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Customer & Billing info */}
        <div className="od-right">
          {/* Customer info */}
          <section className="od-card">
            <div className="od-card-header">
              <span className="icon" style={{ display: "inline-flex", alignItems: "center" }}><User size={18} /></span>
              <h2 className="od-card-title">Khách hàng</h2>
            </div>
            <div className="od-customer">
              <div className="od-customer-avatar-wrap">
                <div className="od-customer-avatar" style={{ backgroundColor: order.customerAvatarUrl ? "transparent" : "#e2e8f0" }}>
                  {order.customerAvatarUrl ? (
                    <img src={order.customerAvatarUrl} alt={order.recipient} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <p className="od-customer-name">{order.recipient}</p>
                  <p className="od-customer-since">Khách mua hàng AgriMarket</p>
                </div>
              </div>
              <div className="od-customer-contacts">
                <div className="od-contact-row">
                  <span className="icon" style={{ display: "inline-flex", alignItems: "center" }}><Phone size={16} /></span>
                  <span className="od-contact-text">{order.phone}</span>
                </div>
              </div>
              {order.shippingNote && (
                <div className="od-note-box">
                  <p className="od-note-label">GHI CHÚ GIAO HÀNG</p>
                  <p className="od-note-text">"{order.shippingNote}"</p>
                </div>
              )}
            </div>
          </section>

          {/* Shipping Address */}
          <section className="od-card">
            <div className="od-card-header">
              <span className="icon" style={{ display: "inline-flex", alignItems: "center" }}><MapPin size={18} /></span>
              <h2 className="od-card-title">Địa chỉ nhận hàng</h2>
            </div>
            <div className="od-delivery">
              {addressLines.map((line, idx) => (
                <p key={idx} className="od-delivery-line">{line}</p>
              ))}
              <div className="od-delivery-method">
                <span className="od-delivery-method-label">Phương thức nhận</span>
                <span className="od-delivery-method-value">Giao tận nơi</span>
              </div>
            </div>
          </section>

          {/* Billing / Payment Info */}
          <section className="od-card">
            <div className="od-card-header">
              <span className="icon" style={{ display: "inline-flex", alignItems: "center" }}><CreditCard size={18} /></span>
              <h2 className="od-card-title">Tóm tắt doanh thu</h2>
            </div>
            <div className="od-payment">
              <div className="od-payment-row">
                <span>Tổng giá sản phẩm</span>
                <span>{formatVND(order.amount)}</span>
              </div>
              <div className="od-payment-row">
                <span>Phí vận chuyển</span>
                <span>Miễn phí</span>
              </div>
              <div className="od-payment-row od-row-total" style={{ borderTop: "1.5px solid rgba(229, 231, 235, 0.7)", paddingTop: "14px", marginTop: "14px" }}>
                <span>Thực nhận</span>
                <span className="total-val">{formatVND(order.amount)}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <div className="custom-modal-header" style={{ borderBottom: "1px solid rgba(239, 68, 68, 0.1)", paddingBottom: "12px", marginBottom: "16px" }}>
              <span className="custom-modal-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><AlertTriangle size={24} /></span>
              <h3>Từ chối đơn hàng</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <p style={{ fontSize: "14.5px", color: "#4b5563", margin: 0 }}>Vui lòng chọn lý do chính thức để hệ thống thông báo tới khách hàng:</p>
              
              <select
                className="ap-select"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ width: "100%" }}
              >
                {REJECT_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <textarea
                className="ap-textarea"
                placeholder="Ghi chú giải thích chi tiết thêm (nếu có)..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
                style={{ width: "100%" }}
              />
            </div>
            <div className="custom-modal-actions">
              <button className="custom-btn-cancel" onClick={() => setShowRejectModal(false)}>
                Hủy bỏ
              </button>
              <button
                className="custom-btn-confirm"
                style={{ backgroundColor: "#ef4444" }}
                onClick={confirmRejectOrder}
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast.show && (
        <div className={`custom-toast ${toast.type}`}>
          <span className="custom-toast-icon">
            {toast.type === "success" ? <CheckCircle2 size={18} /> : toast.type === "error" ? <XCircle size={18} /> : <AlertTriangle size={18} />}
          </span>
          <span className="custom-toast-message">{toast.message}</span>
          <button className="custom-toast-close" onClick={() => setToast({ show: false })}>×</button>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
