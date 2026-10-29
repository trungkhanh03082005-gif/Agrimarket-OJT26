import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { Package, Sprout, Check, X, User, Phone, MapPin, CreditCard, AlertTriangle, Clock, CheckCircle2, XCircle } from "lucide-react";
import * as preorderService from "../../../services/preorderService";
import "./PreorderDetail.css";

const PREORDER_STATUS_CONFIG = {
  pending:   { label: "Chờ cọc",             cls: "oh-st-preorder-pending",   color: "#d97706" },
  paid:      { label: "Đã cọc / Đang trồng",  cls: "oh-st-preorder-paid",      color: "#2563eb" },
  cancelled: { label: "Đã hủy",             cls: "oh-st-preorder-cancelled", color: "#dc2626" },
  completed: { label: "Đã hoàn thành",       cls: "oh-st-preorder-completed", color: "#16a34a" },
};

const getPreorderTimeline = (preorder) => {
  const steps = [];
  
  // Step 1: Preorder created
  steps.push({
    id: 1,
    title: "Đơn đặt trước đã tạo",
    desc: `Đơn đặt trước được khởi tạo bởi ${preorder.customerName || "Khách hàng"}.`,
    time: preorder.createdAt ? new Date(preorder.createdAt).toLocaleDateString("vi-VN") : "",
    done: true,
  });

  // Step 2: Deposit payment
  const isPaidOrLater = ["paid", "completed"].includes(preorder.status);
  const isCancelled = preorder.status === "cancelled";

  if (isCancelled) {
    steps.push({
      id: 2,
      title: "Đơn đặt trước đã hủy",
      desc: "Đơn hàng đã bị hủy bỏ.",
      time: "",
      done: true,
      error: true,
    });
  } else {
    steps.push({
      id: 2,
      title: "Đặt cọc (20%)",
      desc: isPaidOrLater 
        ? "Khách hàng đã hoàn tất thanh toán cọc 20%." 
        : "Đang chờ khách hàng thanh toán tiền cọc (20%).",
      time: "",
      done: isPaidOrLater,
    });

    // Step 3: Cultivating
    steps.push({
      id: 3,
      title: "Đang gieo trồng",
      desc: isPaidOrLater 
        ? "Nhà vườn đang chăm sóc và chuẩn bị nông sản gieo trồng." 
        : "Đang chờ thanh toán cọc để bắt đầu gieo trồng.",
      time: "",
      done: isPaidOrLater,
    });

    // Step 4: Harvest completed
    const isCompleted = preorder.status === "completed";
    steps.push({
      id: 4,
      title: "Thu hoạch nông sản",
      desc: isCompleted 
        ? "Nhà vườn đã hoàn thành thu hoạch nông sản. Đơn đặt trước đã chuyển đổi thành đơn hàng mua ngay." 
        : "Đang đợi nông sản chín và tiến hành thu hoạch.",
      time: "",
      done: isCompleted,
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

export const PreorderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { farmerProfile } = useOutletContext();

  const [preorder, setPreorder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3500);
  };

  useEffect(() => {
    const loadPreorder = async () => {
      setLoading(true);
      try {
        const detail = await preorderService.getPreorderById(id);
        setPreorder(detail);
      } catch (err) {
        console.error("Lỗi khi tải chi tiết preorder:", err);
        showToast("Không thể tải chi tiết đơn đặt trước.", "error");
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      loadPreorder();
    }
  }, [id]);

  const handleUpdateStatus = async (newStatus) => {
    setIsUpdating(true);
    try {
      await preorderService.updatePreorderStatus(preorder.id, newStatus);
      showToast(`Cập nhật trạng thái sang "${PREORDER_STATUS_CONFIG[newStatus]?.label}" thành công!`, "success");
      const updated = await preorderService.getPreorderById(preorder.id);
      setPreorder(updated);
    } catch (err) {
      console.error(err);
      showToast("Cập nhật trạng thái đơn đặt trước thất bại.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
        Đang tải thông tin đơn đặt trước...
      </div>
    );
  }

  if (!preorder) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#ef4444" }}>
        Không tìm thấy đơn đặt trước này hoặc bạn không có quyền truy cập.
      </div>
    );
  }

  const conf = PREORDER_STATUS_CONFIG[preorder.status] || { label: preorder.status, cls: "" };
  const initials = getInitials(preorder.customerName);
  const timelineSteps = getPreorderTimeline(preorder);

  // Address parsed lines
  const addressLines = preorder.customerAddress ? preorder.customerAddress.split(",").map(s => s.trim()) : [];
  
  // Calculate amounts
  const subtotal = preorder.items ? preorder.items.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0) : 0;
  const discount = preorder.discount || 0;
  const totalAmount = subtotal - discount;
  const depositAmount = totalAmount * 0.20;

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
            <span className="od-breadcrumb-current">PO-{preorder.id}</span>
          </div>
          <div className="od-topbar-heading">
            <h1 className="od-title">Đơn đặt trước PO-{preorder.id}</h1>
            <span className={`badge-status ${conf.cls}`} style={{ display: "inline-flex", marginLeft: "12px", fontSize: "12.5px" }}>
              {conf.label}
            </span>
          </div>
          <p className="od-placed-at">
            Đặt ngày {preorder.createdAt ? new Date(preorder.createdAt).toLocaleDateString("vi-VN") : "Đang cập nhật"}
          </p>
        </div>

        <div className="od-topbar-actions" style={{ display: "flex", gap: "10px" }}>
          {preorder.status === "paid" && (
            <button className="btn-primary" onClick={() => handleUpdateStatus("completed")} disabled={isUpdating}>
              Hoàn thành thu hoạch
            </button>
          )}
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
              <h2 className="od-card-title">Danh sách sản phẩm đặt trước</h2>
            </div>
            <div className="od-items-list">
              {preorder.items && preorder.items.map((item, idx) => (
                <div key={idx} className="od-item-row">
                  <div className="od-item-thumb">
                    {item.productThumbnailUrl ? (
                      <img src={item.productThumbnailUrl} alt={item.productName} />
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", color: "#81c784" }}><Sprout size={20} /></span>
                    )}
                  </div>
                  <div className="od-item-info">
                    <span className="od-item-name">{item.productName}</span>
                    <span className="od-item-farm">Nhà vườn: {farmerProfile?.farmName || "Của tôi"}</span>
                  </div>
                  <div className="od-item-price">
                    <span className="od-item-unit-price">{formatVND(item.productPrice)} x {item.quantity} {item.productUnit || "kg"}</span>
                    <span className="od-item-total">{formatVND(item.productPrice * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Timeline */}
          <section className="od-card">
            <div className="od-card-header">
              <span className="icon" style={{ display: "inline-flex", alignItems: "center" }}><Clock size={18} /></span>
              <h2 className="od-card-title">Tiến trình đặt hàng đặt trước</h2>
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
                <div className="od-customer-avatar" style={{ backgroundColor: "#e2e8f0" }}>
                  {initials}
                </div>
                <div>
                  <p className="od-customer-name">{preorder.customerName || "Khách hàng"}</p>
                  <p className="od-customer-since">Khách đặt trước nông sản</p>
                </div>
              </div>
              <div className="od-customer-contacts">
                <div className="od-contact-row">
                  <span className="icon" style={{ display: "inline-flex", alignItems: "center" }}><Phone size={16} /></span>
                  <span className="od-contact-text">{preorder.customerPhone || "Chưa có SĐT"}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Shipping Address */}
          <section className="od-card">
            <div className="od-card-header">
              <span className="icon" style={{ display: "inline-flex", alignItems: "center" }}><MapPin size={18} /></span>
              <h2 className="od-card-title">Địa chỉ nhận hàng</h2>
            </div>
            <div className="od-delivery">
              {addressLines.length > 0 ? (
                addressLines.map((line, idx) => (
                  <p key={idx} className="od-delivery-line">{line}</p>
                ))
              ) : (
                <p className="od-delivery-line">Chưa có thông tin địa chỉ</p>
              )}
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
                <span>{formatVND(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="od-payment-row" style={{ color: "#ef4444" }}>
                  <span>Giảm giá khuyến mãi</span>
                  <span>-{formatVND(discount)}</span>
                </div>
              )}
              <div className="od-payment-row" style={{ color: "#16a34a", fontWeight: "600" }}>
                <span>Đặt cọc yêu cầu (20%)</span>
                <span>{formatVND(depositAmount)}</span>
              </div>
              <div className="od-payment-row">
                <span>Trạng thái cọc</span>
                <strong style={{ color: preorder.status === "pending" ? "#d97706" : "#16a34a" }}>
                  {preorder.status === "pending" ? "Chưa thanh toán" : "Đã thanh toán cọc"}
                </strong>
              </div>
              <div className="od-payment-row od-row-total" style={{ borderTop: "1.5px solid rgba(229, 231, 235, 0.7)", paddingTop: "14px", marginTop: "14px" }}>
                <span>Tổng thu dự kiến</span>
                <span className="total-val">{formatVND(totalAmount)}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

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

export default PreorderDetail;
