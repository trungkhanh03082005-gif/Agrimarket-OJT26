import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { ChevronDown, Download, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import orderService from "../../../services/orderService";
import * as preorderService from "../../../services/preorderService";
import "./OrderHistory.css";

const ORDER_STATUS_CONFIG = {
  pending:    { label: "Chờ xác nhận",   cls: "oh-st-pending",    color: "#f59e0b" },
  preparing:  { label: "Đang chuẩn bị",   cls: "oh-st-preparing",  color: "#8b5cf6" },
  confirmed:  { label: "Chờ lấy hàng",   cls: "oh-st-confirmed",  color: "#3b82f6" },
  shipping:   { label: "Chờ giao hàng",   cls: "oh-st-shipping",   color: "#06b6d4" },
  delivered:  { label: "Đã giao",         cls: "oh-st-delivered",  color: "#10b981" },
  cancelled:  { label: "Đã hủy",         cls: "oh-st-cancelled",  color: "#ef4444" },
  rejected:   { label: "Đã từ chối",     cls: "oh-st-rejected",   color: "#7f1d1d" },
};

const STATUS_FILTER_OPTIONS = [
  { value: "all",        label: "Tất cả đơn hàng",    dot: null },
  { value: "pending",    label: "Chờ xác nhận",      dot: "#f59e0b" },
  { value: "preparing",  label: "Đang chuẩn bị",      dot: "#8b5cf6" },
  { value: "confirmed",  label: "Chờ lấy hàng",        dot: "#3b82f6" },
  { value: "shipping",   label: "Chờ giao hàng",      dot: "#06b6d4" },
  { value: "delivered",  label: "Đã giao",            dot: "#10b981" },
  { value: "cancelled",  label: "Đã hủy",            dot: "#ef4444" },
  { value: "rejected",   label: "Đã từ chối",        dot: "#7f1d1d" },
];

const StarRating = ({ rating }) => {
  if (rating === null || rating === undefined) return <span className="oh-rating-pending">Chờ đánh giá</span>;
  return (
    <div className="oh-stars">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} viewBox="0 0 24 24" width="14" height="14"
          fill={s <= rating ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  );
};

const getInitials = (name) => {
  if (!name) return "KH";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getAvatarColor = (name) => {
  const colors = ["#f97316", "#4ade80", "#7c3aed", "#1b4332", "#06b6d4", "#eab308", "#ec4899"];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

import useDebounce from "../../../hooks/useDebounce";

export const OrderHistory = () => {
  const navigate = useNavigate();
  const { farmerProfile } = useOutletContext();
  const [orders, setOrders] = useState([]);
  const [preorders, setPreorders] = useState([]);
  const [orderType, setOrderType] = useState("regular"); // "regular" | "preorder"
  const [loading, setLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");
  const debouncedOrderSearch = useDebounce(orderSearch, 350);
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);
  const orderDropdownRef = useRef(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const ORDERS_PER_PAGE = 8;

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3500);
  };

  const handleViewPreorderDetail = (dbId) => {
    navigate(`/farmer/orders/preorderdetail/${dbId}`);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (orderDropdownRef.current && !orderDropdownRef.current.contains(e.target)) {
        setOrderDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [orderCurrentPage, orderStatusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const statusToUse = orderStatusFilter === "all" ? null : orderStatusFilter;
      const [regularRes, preorderData] = await Promise.all([
        orderService.getFarmerOrdersPaged({ page: orderCurrentPage - 1, size: ORDERS_PER_PAGE, status: statusToUse }),
        preorderService.getFarmerPreorders()
      ]);
      setOrders(regularRes.content || regularRes);
      setPreorders(preorderData);
    } catch (err) {
      console.error("Lỗi khi tải đơn hàng:", err);
      showToast("Không thể tải danh sách đơn hàng.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreorderStatus = async (preorderId, newStatus) => {
    try {
      await preorderService.updatePreorderStatus(preorderId, newStatus);
      showToast("Cập nhật trạng thái thành công!", "success");
      fetchOrders();
    } catch (err) {
      console.error("Lỗi khi cập nhật trạng thái đặt trước:", err);
      showToast("Cập nhật trạng thái thất bại.", "error");
    }
  };


  const handleExportCSV = () => {
    if (orders.length === 0) {
      showToast("Không có đơn hàng nào để xuất.", "warning");
      return;
    }
    const headers = ["Mã đơn hàng", "Ngày đặt", "Khách hàng", "Số điện thoại", "Số lượng sản phẩm", "Tổng số tiền (VND)", "Trạng thái"];
    const rows = orders.map(o => [
      o.id,
      (o.date || "") + " " + (o.time || ""),
      o.recipient || "",
      o.phone || "",
      o.itemCount || 0,
      o.amount || 0,
      ORDER_STATUS_CONFIG[o.status]?.label || o.status
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `danh_sach_don_hang_${farmerProfile?.farmName || "farm"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã xuất danh sách đơn hàng ra file CSV thành công!", "success");
  };

  // Stats calculation
  const safeOrders = orders || [];
  const awaitingCount = safeOrders.filter(o => o && o.status === "pending").length;
  const completedCount = safeOrders.filter(o => o && o.status === "delivered").length;
  const cancelledCount = safeOrders.filter(o => o && (o.status === "cancelled" || o.status === "rejected")).length;

  const deliveredOrders = safeOrders.filter(o => o && o.status === "delivered");
  const avgValue = deliveredOrders.length > 0
    ? Math.round(deliveredOrders.reduce((sum, o) => sum + (o.amount || 0), 0) / deliveredOrders.length)
    : 0;

  const ratedOrders = safeOrders.filter(o => o && o.rating !== undefined && o.rating !== null);
  const avgRating = ratedOrders.length > 0
    ? (ratedOrders.reduce((sum, o) => sum + o.rating, 0) / ratedOrders.length).toFixed(1)
    : (farmerProfile?.ratingAverage ? Number(farmerProfile.ratingAverage).toFixed(1) : "0.0");
  const ratingsCount = ratedOrders.length;

  // Normalize preorders
  const normalizedPreorders = useMemo(() => {
    return (preorders || []).map(po => {
      const totalAmount = po.items ? po.items.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0) : 0;
      const statusLabels = {
        pending: "Chờ cọc",
        paid: "Đã cọc / Đang trồng",
        cancelled: "Đã hủy",
        completed: "Đã hoàn thành"
      };
      
      const firstItem = po.items && po.items[0] ? po.items[0] : {};
      
      return {
        id: `PO-${po.id}`,
        dbId: po.id,
        isPreorder: true,
        date: po.createdAt ? new Date(po.createdAt).toLocaleDateString("vi-VN") : "Đang cập nhật",
        recipient: po.customerName || "Khách hàng",
        phone: po.customerPhone || "Chưa cập nhật",
        address: po.customerAddress || "Chưa cập nhật",
        amount: totalAmount,
        rating: null,
        status: po.status,
        statusLabel: statusLabels[po.status] || po.status,
        itemsSummary: po.items ? po.items.map(i => `${i.productName} (${i.quantity} ${i.productUnit || 'kg'})`).join(", ") : "",
        expectedHarvestDate: firstItem.expectedHarvestDate ? new Date(firstItem.expectedHarvestDate).toLocaleDateString("vi-VN") : "Đang cập nhật",
      };
    });
  }, [preorders]);

  const activeOrdersList = orderType === "regular" ? safeOrders : normalizedPreorders;

  const preorderPendingCount = normalizedPreorders.filter(o => o.status === "pending").length;
  const preorderPaidCount = normalizedPreorders.filter(o => o.status === "paid").length;
  const preorderCompletedCount = normalizedPreorders.filter(o => o.status === "completed").length;

  // Reset filter when type changes
  useEffect(() => {
    setOrderStatusFilter("all");
    setOrderCurrentPage(1);
  }, [orderType]);

  // Filtering & Pagination
  const filteredOrders = useMemo(() => {
    return activeOrdersList.filter((o) => {
      if (!o) return false;
      const orderIdStr = o.id ? String(o.id) : "";
      const recipientStr = o.recipient ? String(o.recipient) : "";
      const matchSearch = orderIdStr.toLowerCase().includes(debouncedOrderSearch.toLowerCase()) || recipientStr.toLowerCase().includes(debouncedOrderSearch.toLowerCase());
      const matchFilter = orderStatusFilter === "all" ? true : o.status === orderStatusFilter;
      return matchSearch && matchFilter;
    });
  }, [activeOrdersList, debouncedOrderSearch, orderStatusFilter]);

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice((orderCurrentPage - 1) * ORDERS_PER_PAGE, orderCurrentPage * ORDERS_PER_PAGE);
  }, [filteredOrders, orderCurrentPage]);

  useEffect(() => {
    setOrderCurrentPage(1);
  }, [orderSearch, orderStatusFilter]);

  const PREORDER_STATUS_FILTER_OPTIONS = [
    { value: "all",        label: "Tất cả đơn đặt trước", dot: null },
    { value: "pending",    label: "Chờ cọc",             dot: "#f59e0b" },
    { value: "paid",       label: "Đã cọc / Đang trồng",  dot: "#3b82f6" },
    { value: "cancelled",  label: "Đã hủy",             dot: "#ef4444" },
    { value: "completed",  label: "Đã hoàn thành",       dot: "#10b981" },
  ];

  const currentStatusOptions = orderType === "regular" ? STATUS_FILTER_OPTIONS : PREORDER_STATUS_FILTER_OPTIONS;
  const activeOption = currentStatusOptions.find(opt => opt.value === orderStatusFilter) || currentStatusOptions[0];

  const PREORDER_STATUS_CONFIG = {
    pending:   { label: "Chờ cọc",             cls: "oh-st-pending",   color: "#f59e0b" },
    paid:      { label: "Đã cọc / Đang trồng",  cls: "oh-st-confirmed", color: "#3b82f6" },
    cancelled: { label: "Đã hủy",             cls: "oh-st-cancelled", color: "#ef4444" },
    completed: { label: "Đã hoàn thành",       cls: "oh-st-delivered", color: "#10b981" },
  };


  return (
    <div className="fd-orders-tab">

      {/* Segment Tabs to toggle between Order types */}
      <div className="oh-tabs-wrapper" style={{ display: "flex", gap: "12px", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
        <button 
          className={`oh-tab-item ${orderType === "regular" ? "active" : ""}`}
          onClick={() => setOrderType("regular")}
          style={{
            padding: "8px 16px",
            border: "none",
            background: orderType === "regular" ? "#16a34a" : "transparent",
            color: orderType === "regular" ? "#fff" : "#475569",
            fontWeight: "700",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            transition: "all 0.2s"
          }}
        >
          Đơn mua ngay
        </button>
        <button 
          className={`oh-tab-item ${orderType === "preorder" ? "active" : ""}`}
          onClick={() => setOrderType("preorder")}
          style={{
            padding: "8px 16px",
            border: "none",
            background: orderType === "preorder" ? "#16a34a" : "transparent",
            color: orderType === "preorder" ? "#fff" : "#475569",
            fontWeight: "700",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            transition: "all 0.2s"
          }}
        >
          Đơn đặt trước (Preorder)
        </button>
      </div>

      {/* Overview stats cards */}
      <div className="oh-stats-grid">
        <div className="oh-stat-card">
          <div className="oh-stat-label">Đơn hoàn thành</div>
          <div className="oh-stat-num">{loading ? "..." : (orderType === "regular" ? completedCount : preorderCompletedCount)}</div>
        </div>
        <div className="oh-stat-card">
          <div className="oh-stat-label">{orderType === "regular" ? "Chờ xác nhận" : "Chờ cọc"}</div>
          <div className="oh-stat-num oh-num-orange">{loading ? "..." : (orderType === "regular" ? awaitingCount : preorderPendingCount)}</div>
        </div>
        <div className="oh-stat-card">
          <div className="oh-stat-label">{orderType === "regular" ? "Giá trị trung bình" : "Đơn đã cọc (đang trồng)"}</div>
          <div className="oh-stat-num">
            {loading ? "..." : (orderType === "regular" ? `${avgValue.toLocaleString("vi-VN")} đ` : preorderPaidCount)}
          </div>
        </div>
        <div className="oh-stat-card">
          <div className="oh-stat-label">{orderType === "regular" ? "Đánh giá trung bình" : "Tổng số đơn đặt trước"}</div>
          <div className="oh-stat-num oh-num-rating">
            {loading ? "..." : (orderType === "regular" ? (
              <>
                {avgRating} <span className="star">★</span>
                <span className="count">({ratingsCount})</span>
              </>
            ) : normalizedPreorders.length)}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="oh-toolbar">
        <div className="oh-search-box">
          <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder={orderType === "regular" ? "Tìm mã đơn hàng hoặc tên khách hàng..." : "Tìm mã preorder hoặc tên khách hàng..."}
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
          />
        </div>

        <div className="oh-toolbar-right">
          {/* Custom Status Dropdown */}
          <div className="oh-dropdown-wrap" ref={orderDropdownRef}>
            <button className="oh-dropdown-btn" onClick={() => setOrderDropdownOpen(!orderDropdownOpen)}>
              {activeOption.dot && (
                <span className="dot" style={{ backgroundColor: activeOption.dot }} />
              )}
              {activeOption.label}
              <span className="arrow" style={{ display: "inline-flex", alignItems: "center" }}><ChevronDown size={14} /></span>
            </button>

            {orderDropdownOpen && (
              <div className="oh-dropdown-menu">
                {currentStatusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`oh-dropdown-item ${orderStatusFilter === opt.value ? "active" : ""}`}
                    onClick={() => {
                      setOrderStatusFilter(opt.value);
                      setOrderDropdownOpen(false);
                    }}
                  >
                    {opt.dot && (
                      <span className="item-dot" style={{ backgroundColor: opt.dot }} />
                    )}
                    {opt.label}
                    {opt.value !== "all" && (
                      <span className="count-badge">
                        ({opt.value === "all" ? activeOrdersList.length : activeOrdersList.filter(o => o.status === opt.value).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="oh-btn-csv" onClick={handleExportCSV} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Download size={15} /> Xuất CSV
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="oh-table-wrap">
        <table className="oh-table">
          <thead>
            <tr>
              <th>{orderType === "regular" ? "MÃ ĐƠN HÀNG" : "MÃ ĐƠN PREORDER"}</th>
              <th>NGÀY ĐẶT</th>
              <th>KHÁCH HÀNG</th>
              <th>TỔNG TIỀN</th>
              <th>{orderType === "regular" ? "ĐÁNH GIÁ" : "THU HOẠCH DỰ KIẾN"}</th>
              <th>TRẠNG THÁI</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="oh-empty">Đang tải đơn hàng...</td></tr>
            ) : paginatedOrders.length === 0 ? (
              <tr><td colSpan="7" className="oh-empty">Không tìm thấy đơn hàng phù hợp.</td></tr>
            ) : (
              paginatedOrders.map((o) => {
                const conf = orderType === "regular" 
                  ? (ORDER_STATUS_CONFIG[o.status] || { label: o.status, cls: "" })
                  : (PREORDER_STATUS_CONFIG[o.status] || { label: o.status, cls: "" });
                const initials = getInitials(o.recipient);
                const avColor = getAvatarColor(o.recipient);
                return (
                  <tr key={o.id} className="oh-row">
                    <td>
                      <span className="oh-id" style={{ color: "#10b981", fontWeight: "600" }}>
                        {o.id}
                      </span>
                    </td>
                    <td className="oh-date">{o.date}</td>
                    <td>
                      <div className="oh-customer-cell">
                        <div className="oh-cust-avatar" style={{ backgroundColor: o.customerAvatarUrl ? "transparent" : avColor }}>
                          {o.customerAvatarUrl ? (
                            <img src={o.customerAvatarUrl} alt={o.recipient} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                          ) : (
                            initials
                          )}
                        </div>
                        <div>
                          <div className="name">{o.recipient}</div>
                          <div className="phone">{o.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="oh-amount">{(o.amount || 0).toLocaleString("vi-VN")} đ</td>
                    <td>
                      {orderType === "regular" ? (
                        <StarRating rating={o.rating} />
                      ) : (
                        <span style={{ fontWeight: "600", color: "#475569" }}>{o.expectedHarvestDate}</span>
                      )}
                    </td>
                    <td>
                      <span className={`oh-status-badge ${conf.cls}`}>{conf.label}</span>
                    </td>
                    <td>
                      {orderType === "regular" ? (
                        <button className="oh-btn-view" onClick={() => navigate(`/farmer/orders/orderdetail/${o.id.replace("#", "")}`)}>
                          Xem
                        </button>
                      ) : (
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button 
                            className="oh-btn-view" 
                            onClick={() => handleViewPreorderDetail(o.dbId)}
                            style={{ fontSize: "12px", padding: "4px 8px" }}
                          >
                            Xem chi tiết
                          </button>
                          {o.status === "paid" && (
                            <button 
                              className="oh-btn-view" 
                              onClick={() => handleUpdatePreorderStatus(o.dbId, "completed")}
                              style={{ backgroundColor: "#10b981", color: "#fff", borderColor: "#10b981", fontSize: "12px", padding: "4px 8px" }}
                            >
                              Hoàn thành thu hoạch
                            </button>
                          )}
                          <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                            {o.status === "pending" && "Đợi cọc"}
                            {o.status === "completed" && "Đã thu hoạch"}
                            {o.status === "cancelled" && "Đã hủy"}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>


      {/* Pagination */}
      {!loading && filteredOrders.length > ORDERS_PER_PAGE && (
        <div className="fd-pagination">
          <span className="summary">
            Hiển thị {((orderCurrentPage - 1) * ORDERS_PER_PAGE) + 1} - {Math.min(orderCurrentPage * ORDERS_PER_PAGE, filteredOrders.length)} trong tổng số {filteredOrders.length} giao dịch
          </span>
          <div className="controls">
            <button
              onClick={() => setOrderCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={orderCurrentPage === 1}
            >
              ‹
            </button>
            <span className="info">Trang {orderCurrentPage} / {totalOrderPages}</span>
            <button
              onClick={() => setOrderCurrentPage(prev => Math.min(totalOrderPages, prev + 1))}
              disabled={orderCurrentPage === totalOrderPages}
            >
              ›
            </button>
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

export default OrderHistory;
