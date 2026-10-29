import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import authService from "../../services/authService";
import AdminSidebar from "../../components/common/Sidebar/AdminSidebar";
import AdminHeader from "../../components/common/Header/AdminHeader";
import apiClient from "../../services/apiClient";
import useDebounce from "../../hooks/useDebounce";
import "./AdminStyles.css";

const OrderManagement = () => {
  const navigate = useNavigate();
  const getFullImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
    return `${API_BASE_URL}/${cleanUrl}`;
  };
  const [currentUser, setCurrentUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [preorders, setPreorders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 350);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Single shared filter states
  const [filterStatus, setFilterStatus] = useState("All");
  const [activeTab, setActiveTab] = useState("Tất cả đơn hàng");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("All");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [filterFarmer, setFilterFarmer] = useState("All");
  const [filterCustomer, setFilterCustomer] = useState("All");
  const [filterAmountMin, setFilterAmountMin] = useState("");
  const [filterAmountMax, setFilterAmountMax] = useState("");

  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Selected Order for details view
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderAuditLogs, setOrderAuditLogs] = useState([]);
  const [remarksInput, setRemarksInput] = useState("");

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    targetStatus: ""
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState("");
  const [providerAvatarError, setProviderAvatarError] = useState(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [currentPage, filterStatus, filterPaymentStatus, debouncedSearchQuery]);

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const ordersRes = await apiClient.get("/api/admin/orders/paged", {
        params: {
          page: currentPage - 1,
          size: itemsPerPage,
          status: filterStatus === "All" ? null : filterStatus,
          paymentStatus: filterPaymentStatus === "All" ? null : filterPaymentStatus,
          search: debouncedSearchQuery
        }
      });
      if (ordersRes.data && ordersRes.data.content) {
        setOrders(ordersRes.data.content);
        setTotalPages(ordersRes.data.totalPages || 1);
        setTotalElements(ordersRes.data.totalElements || ordersRes.data.content.length);
      } else {
        setOrders(ordersRes.data || []);
        setTotalElements(ordersRes.data?.length || 0);
      }
    } catch (err) {
      console.error("Lỗi khi tải đơn hàng:", err);
      const mock = getMockOrders();
      setOrders(mock);
      if (mock.length === 0) {
        setError("Không thể tải danh sách đơn hàng. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderAuditLogs = async (orderCode) => {
    try {
      const response = await apiClient.get(`/api/admin/audit-logs?targetType=ORDER&targetId=${orderCode}`);
      setOrderAuditLogs(response.data);
    } catch (err) {
      console.error("Lỗi tải audit logs:", err);
      setOrderAuditLogs([
        { id: 1, actionType: "ORDER_CREATED", actorName: "Khách hàng", createdAt: "10/06/2026 08:30", remarks: "Đơn hàng khởi tạo thành công." }
      ]);
    }
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [customersList, setCustomersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [customerInputMode, setCustomerInputMode] = useState("select"); // "select" | "manual"
  const [customerSearchText, setCustomerSearchText] = useState("");

  const [selectedProductToAdd, setSelectedProductToAdd] = useState("");
  const [productQuantityToAdd, setProductQuantityToAdd] = useState(1);

  const [createFormData, setCreateFormData] = useState({
    customerEmail: "",
    recipient: "",
    phone: "",
    address: "",
    shippingNote: "",
    paymentMethod: "COD",
    subtotal: 0.0,
    shippingFee: 30000.0,
    serviceFee: 10000.0,
    discount: 0.0,
    amount: 40000.0,
    items: []
  });

  const loadCreateModalDependencies = async () => {
    try {
      const usersRes = await apiClient.get("/api/admin/users");
      const customers = Array.isArray(usersRes?.data)
        ? usersRes.data.filter(u => u.role && u.role.toLowerCase() === "customer")
        : [];
      setCustomersList(customers);

      const productsRes = await apiClient.get("/api/admin/products");
      const approvedProducts = Array.isArray(productsRes?.data)
        ? productsRes.data.filter(p => p.status && p.status.toLowerCase() === "approved" && p.stockQuantity > 0)
        : [];
      setProductsList(approvedProducts);

      // If either list is empty, inject mock items to ensure the modal is always functional
      if (customers.length === 0) {
        setCustomersList([
          { id: 1, fullName: "Sarah Jenkins", email: "sarah@example.com", phone: "0909123456", address: "123 Green Valley Road, California" },
          { id: 2, fullName: "Marcus Thorne", email: "marcus@example.com", phone: "0912345678", address: "789 Pine Ridge, Oregon" }
        ]);
      }
      if (approvedProducts.length === 0) {
        setProductsList([
          { id: 1, name: "Hộp rau củ hữu cơ", price: 1000000, unit: "hộp", stockQuantity: 20, farmerName: "Green Valley Farms" },
          { id: 2, name: "Dâu tây tươi Đà Lạt", price: 1637500, unit: "kg", stockQuantity: 10, farmerName: "Green Valley Farms" },
          { id: 3, name: "Táo sạch Honeycrisp (10kg)", price: 500000, unit: "bao", stockQuantity: 50, farmerName: "Sunrise Orchards" }
        ]);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu bổ trợ tạo đơn hàng:", err);
      // fallback to mock data on error so admin isn't blocked
      setCustomersList([
        { id: 1, fullName: "Sarah Jenkins", email: "sarah@example.com", phone: "0909123456", address: "123 Green Valley Road, California" },
        { id: 2, fullName: "Marcus Thorne", email: "marcus@example.com", phone: "0912345678", address: "789 Pine Ridge, Oregon" }
      ]);
      setProductsList([
        { id: 1, name: "Hộp rau củ hữu cơ", price: 1000000, unit: "hộp", stockQuantity: 20, farmerName: "Green Valley Farms" },
        { id: 2, name: "Dâu tây tươi Đà Lạt", price: 1637500, unit: "kg", stockQuantity: 10, farmerName: "Green Valley Farms" },
        { id: 3, name: "Táo sạch Honeycrisp (10kg)", price: 500000, unit: "bao", stockQuantity: 50, farmerName: "Sunrise Orchards" }
      ]);
    }
  };

  const handleOpenCreateModal = () => {
    setCreateFormData({
      customerEmail: "",
      recipient: "",
      phone: "",
      address: "",
      shippingNote: "",
      paymentMethod: "COD",
      subtotal: 0.0,
      shippingFee: 30000.0,
      serviceFee: 10000.0,
      discount: 0.0,
      amount: 40000.0,
      items: []
    });
    setCustomerInputMode("select");
    setCustomerSearchText("");
    setSelectedProductToAdd("");
    setProductQuantityToAdd(1);
    setIsCreateModalOpen(true);
    loadCreateModalDependencies();
  };

  const handleAddProductToOrder = () => {
    if (!selectedProductToAdd) return;
    const product = productsList.find(p => p.id === parseInt(selectedProductToAdd));
    if (!product) return;

    const existingIndex = createFormData.items.findIndex(item => item.product.id === product.id);

    let updatedItems = [...createFormData.items];
    if (existingIndex > -1) {
      const newQty = updatedItems[existingIndex].quantity + parseInt(productQuantityToAdd);
      if (newQty > product.stockQuantity) {
        showToast(`Số lượng vượt quá tồn kho (${product.stockQuantity})`);
        return;
      }
      updatedItems[existingIndex].quantity = newQty;
    } else {
      if (parseInt(productQuantityToAdd) > product.stockQuantity) {
        showToast(`Số lượng vượt quá tồn kho (${product.stockQuantity})`);
        return;
      }
      updatedItems.push({
        product,
        quantity: parseInt(productQuantityToAdd)
      });
    }

    const subtotal = updatedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const amount = subtotal + createFormData.shippingFee + createFormData.serviceFee - createFormData.discount;

    setCreateFormData(prev => ({
      ...prev,
      items: updatedItems,
      subtotal,
      amount
    }));

    setSelectedProductToAdd("");
    setProductQuantityToAdd(1);
  };

  const handleUpdateItemQuantity = (productId, newQty) => {
    const quantity = parseInt(newQty);
    if (isNaN(quantity) || quantity <= 0) return;

    const updatedItems = createFormData.items.map(item => {
      if (item.product.id === productId) {
        if (quantity > item.product.stockQuantity) {
          showToast(`Số lượng vượt quá tồn kho (${item.product.stockQuantity})`);
          return item;
        }
        return { ...item, quantity };
      }
      return item;
    });

    const subtotal = updatedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const amount = subtotal + createFormData.shippingFee + createFormData.serviceFee - createFormData.discount;

    setCreateFormData(prev => ({
      ...prev,
      items: updatedItems,
      subtotal,
      amount
    }));
  };

  const handleRemoveProductFromOrder = (productId) => {
    const updatedItems = createFormData.items.filter(item => item.product.id !== productId);
    const subtotal = updatedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const amount = subtotal + createFormData.shippingFee + createFormData.serviceFee - createFormData.discount;

    setCreateFormData(prev => ({
      ...prev,
      items: updatedItems,
      subtotal,
      amount
    }));
  };

  const handleFeeChange = (field, val) => {
    const parsed = parseFloat(val);
    const numVal = isNaN(parsed) ? 0 : parsed;

    setCreateFormData(prev => {
      const updated = { ...prev, [field]: numVal };
      updated.amount = updated.subtotal + updated.shippingFee + updated.serviceFee - updated.discount;
      return updated;
    });
  };

  const handleSubmitCreateOrder = async (e) => {
    e.preventDefault();
    if (!createFormData.customerEmail) {
      showToast("Vui lòng chọn hoặc nhập email khách hàng.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createFormData.customerEmail)) {
      showToast("Email khách hàng không đúng định dạng.");
      return;
    }
    if (createFormData.items.length === 0) {
      showToast("Vui lòng thêm ít nhất một sản phẩm vào đơn hàng.");
      return;
    }
    if (!createFormData.recipient || !createFormData.phone || !createFormData.address) {
      showToast("Vui lòng nhập đầy đủ thông tin giao hàng.");
      return;
    }
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(createFormData.phone)) {
      showToast("Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 chữ số và bắt đầu bằng số 0.");
      return;
    }

    const payload = {
      customerEmail: createFormData.customerEmail,
      recipient: createFormData.recipient,
      phone: createFormData.phone,
      address: createFormData.address,
      shippingNote: createFormData.shippingNote,
      paymentMethod: createFormData.paymentMethod,
      subtotal: createFormData.subtotal,
      shippingFee: createFormData.shippingFee,
      serviceFee: createFormData.serviceFee,
      discount: createFormData.discount,
      amount: createFormData.amount,
      items: createFormData.items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }))
    };

    try {
      await apiClient.post("/api/admin/orders", payload);
      showToast("Tạo đơn hàng mới thành công!");
      setIsCreateModalOpen(false);
      fetchOrders();
    } catch (err) {
      console.error("Lỗi khi tạo đơn hàng (đang thử tạo ở chế độ mô phỏng):", err);
      // Local state fallback so user can test frontend creation successfully
      const newMockOrder = {
        id: "ORD-" + (8923 + Math.floor(Math.random() * 1000)),
        status: "pending",
        statusLabel: "Chờ xử lý",
        date: new Date().toLocaleDateString("vi-VN"),
        time: new Date().toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }),
        subtotal: payload.subtotal,
        shippingFee: payload.shippingFee,
        serviceFee: payload.serviceFee,
        discount: payload.discount,
        amount: payload.amount,
        recipient: payload.recipient,
        address: payload.address,
        phone: payload.phone,
        trackingNumber: "TRK-" + Math.floor(100000 + Math.random() * 900000),
        paymentMethod: payload.paymentMethod === "COD" ? "Thanh toán khi nhận hàng (COD)" : payload.paymentMethod,
        paymentStatus: "unpaid",
        customerAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        shippingNote: payload.shippingNote,
        items: createFormData.items.map(item => ({
          name: item.product.name,
          farmer: item.product.farmerName || "Nhà vườn",
          price: item.product.price,
          qty: item.quantity,
          img: item.product.thumbnailUrl || "https://images.unsplash.com/photo-1543573852-1a78a39f8841?w=100"
        }))
      };
      setOrders(prev => [newMockOrder, ...prev]);
      showToast("Tạo đơn hàng mới thành công (Chế độ mô phỏng)!");
      setIsCreateModalOpen(false);
    }
  };

  // Helper: map backend status names to label & badge class
  const formatVND = (value) => {
    return (value || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "pending": return "pending"; // Gray
      case "confirmed":
      case "preparing": return "confirmed"; // Blue
      case "shipping": return "shipping"; // Orange
      case "delivered": return "delivered"; // Green
      case "cancelled":
      case "rejected": return "cancelled"; // Red
      case "refunded":
      case "refund_requested": return "refunded"; // Purple
      default: return "pending";
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case "pending": return "Chờ xử lý";
      case "confirmed": return "Đã xác nhận";
      case "preparing": return "Đang chuẩn bị";
      case "shipping": return "Đang giao";
      case "delivered": return "Đã giao";
      case "cancelled": return "Đã hủy";
      case "rejected": return "Đã từ chối";
      case "refund_requested": return "Yêu cầu hoàn tiền";
      case "refunded": return "Đã hoàn tiền";
      default: return status || "";
    }
  };

  // Enforce valid status transitions
  const getValidNextStatuses = (currentStatus) => {
    const status = currentStatus?.toLowerCase();
    if (status === "pending") {
      return [
        { status: "confirmed", label: "Xác nhận đơn", color: "approve" },
        { status: "cancelled", label: "Hủy đơn", color: "reject" }
      ];
    }
    if (status === "confirmed" || status === "preparing") {
      return [
        { status: "shipping", label: "Gửi giao hàng", color: "approve" },
        { status: "cancelled", label: "Hủy đơn", color: "reject" }
      ];
    }
    if (status === "shipping") {
      return [
        { status: "delivered", label: "Xác nhận giao thành công", color: "approve" }
      ];
    }
    if (status === "delivered") {
      return [
        { status: "refund_requested", label: "Yêu cầu hoàn tiền", color: "reject" }
      ];
    }
    if (status === "refund_requested") {
      return [
        { status: "refunded", label: "Xác nhận hoàn tiền", color: "approve" }
      ];
    }
    return []; // Cancelled / Refunded orders have no valid next steps
  };

  // Sync Tabs & Cards Filter Selection
  const selectStatusFilter = (statusVal) => {
    setFilterStatus(statusVal);

    // Map status value back to Active Tab text
    if (statusVal === "All") setActiveTab("Tất cả đơn hàng");
    else if (statusVal === "pending") setActiveTab("Chờ xử lý");
    else if (statusVal === "confirmed") setActiveTab("Đã xác nhận");
    else if (statusVal === "shipping") setActiveTab("Đang giao");
    else if (statusVal === "delivered") setActiveTab("Đã giao");
    else if (statusVal === "cancelled") setActiveTab("Đã hủy");
    else if (statusVal === "rejected") setActiveTab("Đã từ chối");
    else if (statusVal === "refunded") setActiveTab("Hoàn tiền");

    setCurrentPage(1);
  };

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
        recipient: po.customerName || "Khách hàng",
        customerAvatarUrl: null,
        farmer: firstItem.farmerName || "Nhà vườn",
        amount: totalAmount,
        qty: po.items ? po.items.reduce((sum, i) => sum + i.quantity, 0) : 0,
        paymentStatus: po.status === "pending" ? "unpaid" : po.status === "cancelled" ? "refunded" : "paid",
        status: po.status,
        statusLabel: statusLabels[po.status] || po.status,
        date: po.createdAt ? new Date(po.createdAt).toLocaleDateString("vi-VN") : "Đang cập nhật",
        items: po.items ? po.items.map(i => ({
          productName: i.productName,
          price: i.productPrice,
          qty: i.quantity,
          farmer: i.farmerName
        })) : []
      };
    });
  }, [preorders]);

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    setCurrentPage(1);

    // Map Tab text to filter status values
    if (tabName === "Tất cả đơn hàng") setFilterStatus("All");
    else if (tabName === "Đơn đặt trước") setFilterStatus("Preorder");
    else if (tabName === "Chờ xử lý") setFilterStatus("pending");
    else if (tabName === "Đã xác nhận") setFilterStatus("confirmed");
    else if (tabName === "Đang giao") setFilterStatus("shipping");
    else if (tabName === "Đã giao") setFilterStatus("delivered");
    else if (tabName === "Đã hủy") setFilterStatus("cancelled");
    else if (tabName === "Đã từ chối") setFilterStatus("rejected");
    else if (tabName === "Hoàn tiền") setFilterStatus("refunded");
  };

  // Dynamic metrics calculation from full orders dataset
  const getStats = () => {
    const s = { total: orders.length, pending: 0, confirmed: 0, shipping: 0, delivered: 0, cancelled: 0, rejected: 0, refunded: 0 };
    orders.forEach(o => {
      const status = o.status?.toLowerCase();
      if (status === "pending") s.pending++;
      else if (status === "confirmed" || status === "preparing") s.confirmed++;
      else if (status === "shipping") s.shipping++;
      else if (status === "delivered") s.delivered++;
      else if (status === "cancelled") s.cancelled++;
      else if (status === "rejected") s.rejected++;
      else if (status === "refunded" || status === "refund_requested") s.refunded++;
    });
    return s;
  };

  const stats = getStats();

  // Extract unique Farmers & Customers dynamically for dropdown filters
  const uniqueFarmers = Array.from(
    new Set(
      filterStatus === "Preorder"
        ? normalizedPreorders.map(o => o.farmer).filter(Boolean)
        : orders.flatMap(o => o.items ? o.items.map(item => item.farmer) : []).filter(Boolean)
    )
  );
  const uniqueCustomers = Array.from(
    new Set(
      filterStatus === "Preorder"
        ? normalizedPreorders.map(o => o.recipient).filter(Boolean)
        : orders.map(o => o.recipient).filter(Boolean)
    )
  );

  // Master Filter Combiner Pipeline
  const getFilteredOrders = () => {
    const listToFilter = filterStatus === "Preorder" ? normalizedPreorders : orders;
    return listToFilter.filter(o => {
      // 1. Search (Order ID, Customer Name, Farmer Name)
      const matchesSearch = searchQuery.trim() === "" ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.recipient && o.recipient.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (filterStatus === "Preorder"
          ? (o.farmer && o.farmer.toLowerCase().includes(searchQuery.toLowerCase()))
          : (o.items && o.items.some(item => item.farmer && item.farmer.toLowerCase().includes(searchQuery.toLowerCase())))
        );

      if (!matchesSearch) return false;

      // 2. Status Filter
      if (filterStatus !== "All" && filterStatus !== "Preorder") {
        const current = o.status?.toLowerCase();
        if (filterStatus === "pending" && current !== "pending") return false;
        if (filterStatus === "confirmed" && current !== "confirmed" && current !== "preparing") return false;
        if (filterStatus === "shipping" && current !== "shipping") return false;
        if (filterStatus === "delivered" && current !== "delivered") return false;
        if (filterStatus === "cancelled" && current !== "cancelled") return false;
        if (filterStatus === "rejected" && current !== "rejected") return false;
        if (filterStatus === "refunded" && current !== "refunded" && current !== "refund_requested") return false;
      }

      // 3. Payment Status Filter
      if (filterPaymentStatus !== "All" && o.paymentStatus !== filterPaymentStatus) {
        return false;
      }

      // 4. Farmer Filter
      if (filterFarmer !== "All") {
        const hasFarmer = filterStatus === "Preorder"
          ? o.farmer === filterFarmer
          : (o.items && o.items.some(item => item.farmer === filterFarmer));
        if (!hasFarmer) return false;
      }

      // 5. Customer Filter
      if (filterCustomer !== "All" && o.recipient !== filterCustomer) {
        return false;
      }

      // 6. Date Range Filter
      if (filterDateStart || filterDateEnd) {
        const parseOrderDate = (dStr) => {
          if (!dStr) return null;
          const match = dStr.match(/(\d+)\s+thg\s+(\d+),\s+(\d+)/);
          if (match) {
            return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
          }
          if (dStr.includes("/")) {
            const parts = dStr.split("/");
            if (parts.length === 3) {
              if (parts[2].length === 4) {
                return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
              } else if (parts[0].length === 4) {
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
              }
            }
          }
          const parsed = new Date(dStr);
          return isNaN(parsed.getTime()) ? null : parsed;
        };

        const orderDate = parseOrderDate(o.date);
        if (!orderDate) {
          return false;
        } else {
          if (filterDateStart) {
            const startDate = new Date(filterDateStart);
            startDate.setHours(0, 0, 0, 0);
            if (orderDate < startDate) return false;
          }
          if (filterDateEnd) {
            const endDate = new Date(filterDateEnd);
            endDate.setHours(23, 59, 59, 999);
            if (orderDate > endDate) return false;
          }
        }
      }

      // 7. Amount Range Filter (in VND)
      const amount = o.amount || 0;
      if (filterAmountMin && amount < parseFloat(filterAmountMin)) return false;
      if (filterAmountMax && amount > parseFloat(filterAmountMax)) return false;

      return true;
    });
  };

  const filteredOrders = getFilteredOrders();


  // Server-side pagination items
  const currentItems = orders;
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const indexOfLastItem = indexOfFirstItem + orders.length;

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setRemarksInput("");
    setProviderAvatarError(false);
    fetchOrderAuditLogs(order.id);
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage("");
    }, 4500);
  };

  const handleResetAllFilters = () => {
    setFilterStatus("All");
    setActiveTab("Tất cả đơn hàng");
    setFilterPaymentStatus("All");
    setFilterDateStart("");
    setFilterDateEnd("");
    setFilterFarmer("All");
    setFilterCustomer("All");
    setFilterAmountMin("");
    setFilterAmountMax("");
    setSearchQuery("");
    setCurrentPage(1);
    showToast("Đã thiết lập lại toàn bộ bộ lọc!");
  };

  // Status transitions handling
  const triggerStatusUpdate = (order, targetStatus) => {
    let statusText = "";
    if (targetStatus === "confirmed") statusText = "XÁC NHẬN đơn hàng";
    else if (targetStatus === "shipping") statusText = "GIAO đơn hàng";
    else if (targetStatus === "delivered") statusText = "GIAO THÀNH CÔNG đơn hàng";
    else if (targetStatus === "cancelled") statusText = "HỦY đơn hàng";
    else if (targetStatus === "refund_requested") statusText = "Yêu cầu HOÀN TIỀN đơn hàng";
    else if (targetStatus === "refunded") statusText = "HOÀN TIỀN đơn hàng";

    setConfirmModal({
      isOpen: true,
      title: "Cập nhật trạng thái đơn hàng",
      message: `Bạn chắc chắn muốn chuyển đơn hàng "${order.id}" sang trạng thái: ${statusText.toUpperCase()}?`,
      targetStatus
    });
  };

  const executeAction = async () => {
    const { targetStatus } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false });

    try {
      const res = await apiClient.put(`/api/admin/orders/${selectedOrder.id}/status`, {
        status: targetStatus,
        remarks: remarksInput
      });
      showToast(`Đã cập nhật đơn hàng sang trạng thái: ${targetStatus.toUpperCase()}.`);

      // Update selected order in state and reload list
      setSelectedOrder(res.data);
      setProviderAvatarError(false);
      fetchOrders();
      fetchOrderAuditLogs(res.data.id);
    } catch (err) {
      console.error("Lỗi cập nhật trạng thái đơn hàng:", err);

      // Fallback local update simulation
      const updatedStatus = targetStatus;
      let updatedPaymentStatus = selectedOrder.paymentStatus;
      if (targetStatus === "refunded") updatedPaymentStatus = "refunded";
      else if (targetStatus === "delivered") updatedPaymentStatus = "paid";

      const newOrder = {
        ...selectedOrder,
        status: updatedStatus,
        statusLabel: getStatusLabel(updatedStatus),
        paymentStatus: updatedPaymentStatus
      };

      const updatedOrders = orders.map(o => o.id === selectedOrder.id ? newOrder : o);
      setOrders(updatedOrders);
      setSelectedOrder(newOrder);
      setProviderAvatarError(false);
      showToast(`Đã cập nhật trạng thái đơn hàng (Mô phỏng).`);

      const mockLog = {
        id: Date.now(),
        actionType: "ORDER_STATUS_CHANGED",
        actorName: currentUser?.fullName || "Quản trị viên",
        createdAt: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }),
        remarks: remarksInput || `Cập nhật trạng thái sang: ${getStatusLabel(updatedStatus)}`
      };
      setOrderAuditLogs([mockLog, ...orderAuditLogs]);
    }
  };

  // Client-side Export of currently filtered records only
  const handleExportData = (format) => {
    const dataToExport = getFilteredOrders();
    if (dataToExport.length === 0) {
      showToast("⚠️ Không có dữ liệu để xuất.");
      return;
    }

    let csvContent = "\ufeff"; // BOM
    csvContent += "Mã đơn hàng,Ngày đặt,Khách hàng,Nhà vườn,Tổng tiền (VND),Trạng thái,Thanh toán,Phương thức\n";

    dataToExport.forEach(o => {
      const amountVnd = o.amount || 0;
      const farmerName = o.items && o.items.length > 0 ? o.items[0].farmer : "";
      csvContent += `${o.id},${o.date},"${o.recipient}","${farmerName}",${amountVnd},${getStatusLabel(o.status)},${o.paymentStatus},${o.paymentMethod}\n`;
    });

    if (format === "csv" || format === "excel") {
      const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      const fileExt = format === "excel" ? "xls" : "csv";
      link.setAttribute("download", `agri_danh_sach_don_hang_${Date.now()}.${fileExt}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Xuất dữ liệu ${format.toUpperCase()} thành công!`);
    } else if (format === "pdf") {
      // Formatted printable report layout
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
          <head>
            <title>Báo cáo đơn hàng AgriAdmin</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1f2937; }
              h1 { color: #064e3b; margin-bottom: 5px; }
              p { color: #6b7280; margin-top: 0; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; font-size: 13px; }
              th { background-color: #f9fafb; color: #4b5563; font-weight: 700; }
              tr:nth-child(even) { background-color: #f9fafb; }
            </style>
          </head>
          <body>
            <h1>Báo cáo đơn hàng AgriAdmin</h1>
            <p>Tạo lúc: ${new Date().toLocaleString()} • Trạng thái lọc: ${getStatusLabel(filterStatus)} • Tổng đơn hàng: ${dataToExport.length}</p>
            <table>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Nhà vườn</th>
                  <th>Tổng tiền (VND)</th>
                  <th>Thanh toán</th>
                  <th>Trạng thái</th>
                  <th>Ngày đặt</th>
                </tr>
              </thead>
              <tbody>
                ${dataToExport.map(o => `
                  <tr>
                    <td>#${o.id}</td>
                    <td>${o.recipient}</td>
                    <td>${o.items && o.items.length > 0 ? o.items[0].farmer : ""}</td>
                    <td>${(o.amount || 0).toLocaleString("vi-VN")} đ</td>
                    <td>${o.paymentStatus === 'paid' ? 'Đã thanh toán' : o.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : 'Chưa thanh toán'}</td>
                    <td>${getStatusLabel(o.status)}</td>
                    <td>${o.date}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      showToast("Đang chuẩn bị báo cáo PDF để in...");
    }
  };

  const getMockOrders = () => {
    return [
      {
        id: "ORD-8922",
        status: "pending",
        statusLabel: "Chờ xử lý",
        date: "24/10/2023",
        time: "10:15",
        subtotal: 3637500,
        shippingFee: 0,
        serviceFee: 0,
        discount: 0,
        amount: 3637500,
        recipient: "Sarah Jenkins",
        address: "123 Green Valley Road, California",
        phone: "0909123456",
        trackingNumber: "",
        paymentMethod: "Thẻ tín dụng",
        paymentStatus: "paid",
        customerAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        shippingNote: "Để ở cửa trước.",
        items: [
          { name: "Hộp rau củ hữu cơ", farmer: "Green Valley Farms", price: 1000000, qty: 2, img: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=150" },
          { name: "Dâu tây tươi Đà Lạt", farmer: "Green Valley Farms", price: 1637500, qty: 1, img: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=150" }
        ]
      },
      {
        id: "ORD-8921",
        status: "shipping",
        statusLabel: "Đang giao",
        date: "24/10/2023",
        time: "14:30",
        subtotal: 8000000,
        shippingFee: 0,
        serviceFee: 0,
        discount: 0,
        amount: 8000000,
        recipient: "Marcus Thorne",
        address: "789 Pine Ridge, Oregon",
        phone: "0912345678",
        trackingNumber: "TRK-992810",
        paymentMethod: "PayPal",
        paymentStatus: "paid",
        customerAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        shippingNote: "Gọi điện trước khi giao hàng.",
        items: [
          { name: "Táo sạch Honeycrisp (10kg)", farmer: "Sunrise Orchards", price: 500000, qty: 10, img: "https://images.unsplash.com/photo-1543573852-1a78a39f8841?w=150" },
          { name: "Giỏ cam ngọt cao cấp", farmer: "Sunrise Orchards", price: 1500000, qty: 2, img: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=150" }
        ]
      },
      {
        id: "ORD-8920",
        status: "delivered",
        statusLabel: "Đã giao",
        date: "23/10/2023",
        time: "09:45",
        subtotal: 1240000,
        shippingFee: 0,
        serviceFee: 0,
        discount: 0,
        amount: 1240000,
        recipient: "Nguyễn Văn A",
        address: "45 Lê Lợi, Quận 1, TP. Hồ Chí Minh",
        phone: "0987654321",
        trackingNumber: "TRK-881203",
        paymentMethod: "COD (Thanh toán khi nhận)",
        paymentStatus: "paid",
        customerAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        shippingNote: "",
        items: [
          { name: "Cam sành hữu cơ loại 1 (10kg)", farmer: "Trang trại Cam Sạch Tiền Giang", price: 70000, qty: 10, img: "https://images.unsplash.com/photo-1543573852-1a78a39f8841?w=150" },
          { name: "Cà rốt Đà Lạt chuẩn VietGAP", farmer: "Trang trại Cam Sạch Tiền Giang", price: 270000, qty: 2, img: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=150" }
        ]
      },
      {
        id: "ORD-8919",
        status: "cancelled",
        statusLabel: "Đã hủy",
        date: "22/10/2023",
        time: "11:20",
        subtotal: 500000,
        shippingFee: 30000,
        serviceFee: 10000,
        discount: 0,
        amount: 540000,
        recipient: "Lê Văn B",
        address: "789 Nguyễn Trãi, Quận 5, TP. Hồ Chí Minh",
        phone: "0901234567",
        trackingNumber: "",
        paymentMethod: "COD (Thanh toán khi nhận)",
        paymentStatus: "unpaid",
        customerAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        shippingNote: "",
        cancelReason: "Khách hàng đổi ý, muốn mua sản phẩm khác.",
        items: [
          { name: "Táo sạch Honeycrisp (10kg)", farmer: "Sunrise Orchards", price: 500000, qty: 1, img: "https://images.unsplash.com/photo-1543573852-1a78a39f8841?w=150" }
        ]
      },
      {
        id: "ORD-8918",
        status: "rejected",
        statusLabel: "Đã từ chối",
        date: "21/10/2023",
        time: "15:45",
        subtotal: 1500000,
        shippingFee: 30000,
        serviceFee: 10000,
        discount: 0,
        amount: 1540000,
        recipient: "Phan Thanh C",
        address: "101 Trần Hưng Đạo, Quận 1, TP. Hồ Chí Minh",
        phone: "0934567890",
        trackingNumber: "",
        paymentMethod: "Thẻ tín dụng",
        paymentStatus: "unpaid",
        customerAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        shippingNote: "",
        cancelReason: "Hết hàng tồn kho do thời tiết bất lợi.",
        items: [
          { name: "Giỏ cam ngọt cao cấp", farmer: "Sunrise Orchards", price: 1500000, qty: 1, img: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=150" }
        ]
      }
    ];
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <AdminSidebar activeItem="orders" showToast={showToast} />

      {/* Main Content */}
      <div className="admin-main-container">
        <AdminHeader
          searchQuery={searchQuery}
          setSearchQuery={(val) => { setSearchQuery(val); setCurrentPage(1); }}
          searchPlaceholder="Tìm kiếm đơn hàng..."
          showToast={showToast}
        />

        <main className="admin-page-body">
          {error && (
            <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fef3c7", color: "#b45309", padding: "20px", borderRadius: "12px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>⚠️ Không thể tải danh sách đơn hàng.</strong>
                <span style={{ marginLeft: "8px" }}>Vui lòng thử lại.</span>
              </div>
              <button className="btn-admin-primary" onClick={fetchOrders} style={{ padding: "8px 16px" }}>
                Thử lại
              </button>
            </div>
          )}

          {selectedOrder ? (
            /* Render Order Details full-page dashboard mode */
            <>
              {/* Breadcrumbs */}
              <div className="details-breadcrumbs" style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
                <span className="details-breadcrumb-link" onClick={() => setSelectedOrder(null)} style={{ cursor: "pointer", color: "var(--admin-text-muted)", fontSize: "14.5px" }}>
                  Quản lý đơn hàng
                </span>
                <span className="details-breadcrumb-separator" style={{ color: "#d1d5db" }}>&gt;</span>
                <span className="details-breadcrumb-current" style={{ color: "var(--admin-text-main)", fontWeight: "500", fontSize: "14.5px" }}>Chi tiết đơn hàng</span>
              </div>

              {/* Title Row */}
              <div className="details-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
                <div className="details-header-info">
                  <h2 style={{ fontSize: "30px", fontWeight: "800", color: "var(--admin-text-main)", margin: 0 }}>Chi tiết đơn hàng: #{selectedOrder.id}</h2>
                  <p style={{ fontSize: "15px", color: "var(--admin-text-muted)", margin: "6px 0 0 0" }}>
                    Ngày đặt: <strong>{selectedOrder.date} {selectedOrder.time}</strong>
                  </p>
                </div>
                <div className="details-action-buttons">
                  <button className="btn-admin-outline" onClick={() => setSelectedOrder(null)} style={{ display: "flex", alignItems: "center", gap: "8px", borderRadius: "10px", padding: "10px 18px", fontWeight: "600", fontSize: "14.5px" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Quay lại danh sách
                  </button>
                </div>
              </div>

              {/* Grid Dashboard - consistent with other pages (320px 1fr) */}
              <div className="details-dashboard-grid" style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "24px", alignItems: "start" }}>

                {/* Left Column (320px): Metadata Overview Cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                  {/* General Status Card */}
                  <div className="details-left-card" style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid var(--admin-border)", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", textAlign: "left", alignItems: "stretch" }}>
                    <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "700", color: "var(--admin-primary)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--admin-border)", paddingBottom: "12px" }}>
                      Trạng thái chung
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div className="details-field-item">
                        <span className="details-field-label" style={{ fontSize: "12px", color: "var(--admin-text-muted)", textTransform: "uppercase", fontWeight: "600" }}>Trạng thái đơn hàng</span>
                        <div style={{ marginTop: "4px" }}>
                          <span className={`status-badge ${getStatusBadgeClass(selectedOrder.status)}`}>
                            {getStatusLabel(selectedOrder.status)}
                          </span>
                        </div>
                      </div>
                      {(selectedOrder.status?.toLowerCase() === "cancelled" || selectedOrder.status?.toLowerCase() === "rejected") && (
                        <div className="details-field-item" style={{ marginTop: "4px", padding: "10px 12px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px" }}>
                          <span className="details-field-label" style={{ fontSize: "11px", color: "#991b1b", textTransform: "uppercase", fontWeight: "700" }}>
                            Lý do {selectedOrder.status?.toLowerCase() === "cancelled" ? "hủy" : "từ chối"}
                          </span>
                          <span className="details-field-value" style={{ fontWeight: "600", color: "#991b1b", display: "block", marginTop: "4px", fontSize: "13px", lineHeight: "1.4" }}>
                            {selectedOrder.cancelReason || "Không có lý do cụ thể"}
                          </span>
                        </div>
                      )}
                      <div className="details-field-item">
                        <span className="details-field-label" style={{ fontSize: "12px", color: "var(--admin-text-muted)", textTransform: "uppercase", fontWeight: "600" }}>Thanh toán</span>
                        <div style={{ marginTop: "4px" }}>
                          <span className={`payment-badge ${selectedOrder.paymentStatus === 'paid' ? 'paid' : selectedOrder.paymentStatus === 'refunded' ? 'refunded' : 'unpaid'}`}>
                            {selectedOrder.paymentStatus === "paid" ? "Đã thanh toán" : selectedOrder.paymentStatus === "refunded" ? "Đã hoàn tiền" : "Chưa thanh toán"}
                          </span>
                        </div>
                      </div>
                      <div className="details-field-item">
                        <span className="details-field-label" style={{ fontSize: "12px", color: "var(--admin-text-muted)", textTransform: "uppercase", fontWeight: "600" }}>Phương thức thanh toán</span>
                        <span className="details-field-value" style={{ fontWeight: "700", display: "block", marginTop: "4px" }}>{selectedOrder.paymentMethod}</span>
                      </div>
                      {selectedOrder.trackingNumber && (
                        <div className="details-field-item">
                          <span className="details-field-label" style={{ fontSize: "12px", color: "var(--admin-text-muted)", textTransform: "uppercase", fontWeight: "600" }}>Mã vận đơn</span>
                          <span className="details-field-value" style={{ fontWeight: "700", display: "block", marginTop: "4px" }}>{selectedOrder.trackingNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Information Card */}
                  <div className="details-left-card" style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid var(--admin-border)", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", textAlign: "left", alignItems: "stretch" }}>
                    <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "700", color: "var(--admin-primary)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--admin-border)", paddingBottom: "12px" }}>
                      Khách hàng đặt mua
                    </h4>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
                      <img
                        src={getFullImageUrl(selectedOrder.customerAvatarUrl) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                        alt="Khách hàng"
                        style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover" }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
                        }}
                      />
                      <div>
                        <p style={{ margin: 0, fontWeight: "700", fontSize: "15px", color: "var(--admin-text-main)" }}>{selectedOrder.recipient}</p>
                        <p style={{ margin: "2px 0 0 0", color: "var(--admin-text-muted)", fontSize: "13px" }}>SĐT: {selectedOrder.phone}</p>
                      </div>
                    </div>
                    <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "12px", fontSize: "13.5px" }}>
                      <span className="details-field-label" style={{ display: "block", fontWeight: "600", color: "var(--admin-text-muted)", marginBottom: "4px", textTransform: "uppercase", fontSize: "11px" }}>Địa chỉ giao hàng</span>
                      <p style={{ margin: 0, color: "var(--admin-text-main)", lineHeight: "1.4", fontWeight: "500" }}>{selectedOrder.address}</p>
                      {selectedOrder.shippingNote && (
                        <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "8px", color: "#b45309", fontSize: "12.5px" }}>
                          <strong>Ghi chú:</strong> "{selectedOrder.shippingNote}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Farmer Information Card */}
                  <div className="details-left-card" style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid var(--admin-border)", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", textAlign: "left", alignItems: "stretch" }}>
                    <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "700", color: "var(--admin-primary)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--admin-border)", paddingBottom: "12px" }}>
                      Thông tin nhà vườn
                    </h4>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      {selectedOrder.provider?.avatarUrl && !providerAvatarError ? (
                        <img
                          src={getFullImageUrl(selectedOrder.provider.avatarUrl)}
                          alt="Avatar nhà vườn"
                          style={{ width: "48px", height: "48px", borderRadius: "12px", objectFit: "cover" }}
                          onError={() => setProviderAvatarError(true)}
                        />
                      ) : (
                        <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: selectedOrder.provider?.avatarBg || "var(--admin-primary)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "18px" }}>
                          {selectedOrder.provider?.avatarText || "N"}
                        </div>
                      )}
                      <div>
                        <p style={{ margin: 0, fontWeight: "700", fontSize: "15px", color: "var(--admin-text-main)" }}>
                          {selectedOrder.provider?.name || (selectedOrder.items && selectedOrder.items.length > 0 ? selectedOrder.items[0].farmer : "Nhà vườn liên kết")}
                        </p>
                        <p style={{ margin: "2px 0 0 0", color: "var(--admin-text-muted)", fontSize: "13px" }}>
                          Khu vực: {selectedOrder.provider?.location || "Mỹ Tho, Tiền Giang"}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column (1fr): Product details, breaks, note inputs and timeline logs */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                  {/* Product List Card */}
                  <div className="details-right-card" style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid var(--admin-border)", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", margin: 0 }}>
                    <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "700", color: "var(--admin-primary)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--admin-border)", paddingBottom: "12px" }}>
                      Danh sách sản phẩm
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {selectedOrder.items && selectedOrder.items.map((item, idx) => (
                        <div key={idx} style={{ display: "flex", gap: "16px", alignItems: "center", borderBottom: idx < selectedOrder.items.length - 1 ? "1px solid #f3f4f6" : "none", paddingBottom: idx < selectedOrder.items.length - 1 ? "16px" : 0 }}>
                          <img
                            src={getFullImageUrl(item.img) || "https://images.unsplash.com/photo-1543573852-1a78a39f8841?w=100"}
                            alt={item.name}
                            style={{ width: "52px", height: "52px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e5e7eb" }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://images.unsplash.com/photo-1543573852-1a78a39f8841?w=100";
                            }}
                          />
                          <div style={{ flexGrow: 1 }}>
                            <p style={{ margin: 0, fontWeight: "600", fontSize: "15px", color: "var(--admin-text-main)" }}>{item.name}</p>
                            <p style={{ margin: "4px 0 0 0", color: "var(--admin-text-muted)", fontSize: "13px" }}>
                              Cung cấp bởi: <strong>{item.farmer}</strong>
                            </p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ margin: 0, fontWeight: "700", fontSize: "15px", color: "var(--admin-text-main)" }}>
                              {formatVND(item.price * item.qty)}
                            </p>
                            <p style={{ margin: "2px 0 0 0", color: "var(--admin-text-muted)", fontSize: "12px" }}>
                              SL: {item.qty} x {formatVND(item.price)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Details Breakdown Card */}
                  <div className="details-right-card" style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid var(--admin-border)", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", margin: 0 }}>
                    <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "700", color: "var(--admin-primary)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--admin-border)", paddingBottom: "12px" }}>
                      Chi tiết thanh toán
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14.5px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--admin-text-muted)" }}>Tạm tính:</span>
                        <strong style={{ color: "var(--admin-text-main)" }}>
                          {formatVND(selectedOrder.subtotal)}
                        </strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--admin-text-muted)" }}>Phí vận chuyển:</span>
                        <strong style={{ color: "var(--admin-text-main)" }}>
                          {formatVND(selectedOrder.shippingFee)}
                        </strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--admin-text-muted)" }}>Phí dịch vụ:</span>
                        <strong style={{ color: "var(--admin-text-main)" }}>
                          {formatVND(selectedOrder.serviceFee)}
                        </strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#991b1b" }}>
                        <span>Giảm giá:</span>
                        <strong>
                          -{formatVND(selectedOrder.discount)}
                        </strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800", fontSize: "16px", borderTop: "1px solid var(--admin-border)", paddingTop: "14px", marginTop: "6px" }}>
                        <span style={{ color: "var(--admin-text-main)" }}>Tổng số tiền thanh toán:</span>
                        <span style={{ color: "var(--admin-primary)", fontSize: "20px", fontWeight: "800" }}>
                          {formatVND(selectedOrder.amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin notes & Actions */}
                  <div style={{ display: "flex", gap: "12px", margin: "0 0 24px 0" }}>
                    <button
                      className="btn-admin-outline"
                      onClick={() => setSelectedOrder(null)}
                      style={{ flexGrow: 1, justifyContent: "center", borderRadius: "10px", padding: "12px 18px", fontWeight: "600", fontSize: "14.5px" }}
                    >
                      Đóng chi tiết
                    </button>
                  </div>

                  {/* Timeline Logs */}
                  <div className="details-right-card" style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid var(--admin-border)", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", margin: 0 }}>
                    <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "700", color: "var(--admin-primary)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--admin-border)", paddingBottom: "12px" }}>
                      Hành trình đơn hàng
                    </h4>
                    <div className="timeline-container" style={{ padding: "0 8px" }}>
                      {orderAuditLogs.map((log) => (
                        <div className="timeline-item" key={log.id} style={{ display: "flex", gap: "16px", marginBottom: "20px", position: "relative" }}>
                          <div className="timeline-icon-dot" style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "var(--admin-primary)", marginTop: "6px", flexShrink: 0 }}></div>
                          <div className="timeline-content">
                            <p className="timeline-title" style={{ margin: 0, fontSize: "14.5px" }}>
                              <strong>{log.newStatus ? getStatusLabel(log.newStatus).toUpperCase() : log.actionType}</strong> • {log.actorName}
                            </p>
                            <span className="timeline-time" style={{ display: "block", fontSize: "12px", color: "var(--admin-text-muted)", marginTop: "2px" }}>{log.createdAt}</span>
                            {log.remarks && (
                              <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "var(--admin-text-muted)", fontStyle: "italic", backgroundColor: "#f9fafb", padding: "8px 12px", borderRadius: "6px", borderLeft: "3px solid var(--admin-primary)" }}>
                                "{log.remarks}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </>
          ) : (
            /* Otherwise show original list page content */
            <>
              {/* Title Row */}
              <div className="admin-page-title-row">
                <div className="admin-page-title-info">
                  <h2>Quản lý đơn hàng</h2>
                  <p>Giám sát và quản lý tất cả đơn hàng trên nền tảng.</p>
                </div>

                <div className="admin-page-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  {/* Export Dropdown */}
                  <div style={{ position: "relative" }}>
                    <button
                      className="btn-admin-outline"
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      style={{ display: "flex", alignItems: "center", gap: "8px", borderRadius: "10px", padding: "10px 18px", fontWeight: "600", fontSize: "14.5px" }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      Xuất báo cáo
                    </button>
                    {showExportMenu && (
                      <div className="actions-dropdown-menu" style={{ top: "45px", right: 0, minWidth: "120px" }}>
                        <button className="dropdown-menu-item" onClick={() => { handleExportData("csv"); setShowExportMenu(false); }}>
                          CSV
                        </button>
                        <button className="dropdown-menu-item" onClick={() => { handleExportData("excel"); setShowExportMenu(false); }}>
                          Excel
                        </button>
                        <button className="dropdown-menu-item" onClick={() => { handleExportData("pdf"); setShowExportMenu(false); }}>
                          PDF
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Create Order button */}
                  <button
                    className="btn-admin-primary"
                    onClick={handleOpenCreateModal}
                    style={{ backgroundColor: "#064e3b", color: "#ffffff", padding: "10px 18px", borderRadius: "10px", fontWeight: "600", fontSize: "14.5px", display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Tạo đơn hàng
                  </button>
                </div>
              </div>

              {/* 7 Stats Cards Row */}
              <div className="order-stats-grid">
                {/* Card 1: Total Orders */}
                <div className={`order-stat-card ${filterStatus === "All" ? "active" : ""}`} onClick={() => selectStatusFilter("All")} style={{ cursor: "pointer" }}>
                  <div className="stat-card-header">
                    <span className="stat-card-label">Tổng đơn hàng</span>
                    <span className="stat-icon-circle green">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                    </span>
                  </div>
                  <span className="stat-card-value">
                    {stats.total}
                  </span>
                </div>

                {/* Card 2: Pending */}
                <div className={`order-stat-card ${filterStatus === "pending" ? "active" : ""}`} onClick={() => selectStatusFilter("pending")} style={{ cursor: "pointer" }}>
                  <div className="stat-card-header">
                    <span className="stat-card-label">Chờ xử lý</span>
                    <span className="stat-icon-circle grey">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </span>
                  </div>
                  <span className="stat-card-value">
                    {stats.pending}
                  </span>
                </div>

                {/* Card 3: Confirmed */}
                <div className={`order-stat-card ${filterStatus === "confirmed" ? "active" : ""}`} onClick={() => selectStatusFilter("confirmed")} style={{ cursor: "pointer" }}>
                  <div className="stat-card-header">
                    <span className="stat-card-label">Đã xác nhận</span>
                    <span className="stat-icon-circle green" style={{ backgroundColor: "#e0f2fe", color: "#0369a1" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </span>
                  </div>
                  <span className="stat-card-value">
                    {stats.confirmed}
                  </span>
                </div>

                {/* Card 4: Shipping */}
                <div className={`order-stat-card ${filterStatus === "shipping" ? "active" : ""}`} onClick={() => selectStatusFilter("shipping")} style={{ cursor: "pointer" }}>
                  <div className="stat-card-header">
                    <span className="stat-card-label">Đang giao</span>
                    <span className="stat-icon-circle light-green">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                    </span>
                  </div>
                  <span className="stat-card-value">
                    {stats.shipping}
                  </span>
                </div>

                {/* Card 5: Delivered */}
                <div className={`order-stat-card ${filterStatus === "delivered" ? "active" : ""}`} onClick={() => selectStatusFilter("delivered")} style={{ cursor: "pointer" }}>
                  <div className="stat-card-header">
                    <span className="stat-card-label">Đã giao</span>
                    <span className="stat-icon-circle light-green">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </span>
                  </div>
                  <span className="stat-card-value">
                    {stats.delivered}
                  </span>
                </div>

                {/* Card 6: Cancelled */}
                <div className={`order-stat-card cancelled ${filterStatus === "cancelled" ? "active" : ""}`} onClick={() => selectStatusFilter("cancelled")} style={{ cursor: "pointer" }}>
                  <div className="stat-card-header">
                    <span className="stat-card-label">Đã hủy</span>
                    <span className="stat-icon-circle red">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </span>
                  </div>
                  <span className="stat-card-value">
                    {stats.cancelled}
                  </span>
                </div>

                {/* Card 7: Rejected */}
                <div className={`order-stat-card cancelled ${filterStatus === "rejected" ? "active" : ""}`} onClick={() => selectStatusFilter("rejected")} style={{ cursor: "pointer" }}>
                  <div className="stat-card-header">
                    <span className="stat-card-label">Đã từ chối</span>
                    <span className="stat-icon-circle red">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                    </span>
                  </div>
                  <span className="stat-card-value">
                    {stats.rejected}
                  </span>
                </div>

                {/* Card 8: Refunded */}
                <div className={`order-stat-card ${filterStatus === "refunded" ? "active" : ""}`} onClick={() => selectStatusFilter("refunded")} style={{ cursor: "pointer" }}>
                  <div className="stat-card-header">
                    <span className="stat-card-label">Hoàn tiền</span>
                    <span className="stat-icon-circle green" style={{ backgroundColor: "#f3e8ff", color: "#6b21a8" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0-.57-8.38l5.67-5.67"></path></svg>
                    </span>
                  </div>
                  <span className="stat-card-value">
                    {stats.refunded}
                  </span>
                </div>
              </div>

              {/* Table List Card */}
              <div className="admin-table-card">
                {/* Tabs and More Filters Action Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--admin-border)", flexWrap: "wrap", gap: "16px" }}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {["Tất cả đơn hàng", "Đơn đặt trước", "Chờ xử lý", "Đã xác nhận", "Đang giao", "Đã giao", "Đã hủy", "Đã từ chối", "Hoàn tiền"].map((tab) => {
                      const isActive = activeTab === tab;
                      return (
                        <button
                          key={tab}
                          onClick={() => handleTabClick(tab)}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "20px",
                            backgroundColor: isActive ? "#d1fae5" : "transparent",
                            color: isActive ? "#065f46" : "#4b5563",
                            fontWeight: isActive ? "700" : "600",
                            fontSize: "14.5px",
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                        >
                          {tab}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    className={`btn-admin-outline ${showMoreFilters ? "active" : ""}`}
                    onClick={() => setShowMoreFilters(!showMoreFilters)}
                    style={{ display: "flex", alignItems: "center", gap: "8px", borderRadius: "10px", padding: "10px 16px", fontWeight: "600", fontSize: "14.5px" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="21" x2="4" y2="14"></line>
                      <line x1="4" y1="10" x2="4" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12" y2="3"></line>
                      <line x1="20" y1="21" x2="20" y2="16"></line>
                      <line x1="20" y1="12" x2="20" y2="3"></line>
                      <line x1="1" y1="14" x2="7" y2="14"></line>
                      <line x1="9" y1="8" x2="15" y2="8"></line>
                      <line x1="17" y1="16" x2="23" y2="16"></line>
                    </svg>
                    Bộ lọc nâng cao
                  </button>
                </div>

                {/* Collapsible More Filters panel */}
                {showMoreFilters && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", padding: "20px 24px", backgroundColor: "#f9fafb", borderBottom: "1px solid var(--admin-border)" }}>
                    {/* Payment Status Filter */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: "12px", fontWeight: "700" }}>Trạng thái thanh toán</label>
                      <select className="form-control" value={filterPaymentStatus} onChange={e => { setFilterPaymentStatus(e.target.value); setCurrentPage(1); }}>
                        <option value="All">Tất cả</option>
                        <option value="paid">Đã thanh toán</option>
                        <option value="unpaid">Chưa thanh toán</option>
                        <option value="refunded">Đã hoàn tiền</option>
                      </select>
                    </div>

                    {/* Farmer selector */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: "12px", fontWeight: "700" }}>Nhà vườn cung cấp</label>
                      <select className="form-control" value={filterFarmer} onChange={e => { setFilterFarmer(e.target.value); setCurrentPage(1); }}>
                        <option value="All">Tất cả</option>
                        {uniqueFarmers.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                    </div>

                    {/* Customer selector */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: "12px", fontWeight: "700" }}>Khách hàng đặt hàng</label>
                      <select className="form-control" value={filterCustomer} onChange={e => { setFilterCustomer(e.target.value); setCurrentPage(1); }}>
                        <option value="All">Tất cả</option>
                        {uniqueCustomers.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                    </div>

                    {/* Start Date */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: "12px", fontWeight: "700" }}>Từ ngày đặt</label>
                      <input type="date" className="form-control" value={filterDateStart} onChange={e => { setFilterDateStart(e.target.value); setCurrentPage(1); }} />
                    </div>

                    {/* End Date */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: "12px", fontWeight: "700" }}>Đến ngày đặt</label>
                      <input type="date" className="form-control" value={filterDateEnd} onChange={e => { setFilterDateEnd(e.target.value); setCurrentPage(1); }} />
                    </div>

                    {/* Amount range min */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: "12px", fontWeight: "700" }}>Tổng tiền tối thiểu (VND)</label>
                      <input type="number" className="form-control" placeholder="Min VND" value={filterAmountMin} onChange={e => { setFilterAmountMin(e.target.value); setCurrentPage(1); }} />
                    </div>

                    {/* Amount range max */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: "12px", fontWeight: "700" }}>Tổng tiền tối đa (VND)</label>
                      <input type="number" className="form-control" placeholder="Max VND" value={filterAmountMax} onChange={e => { setFilterAmountMax(e.target.value); setCurrentPage(1); }} />
                    </div>

                    {/* Reset Filters button */}
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                      <button
                        className="btn-admin-danger"
                        onClick={handleResetAllFilters}
                        style={{ width: "100%", height: "48px", justifyContent: "center", padding: "10px" }}
                      >
                        Xóa tất cả bộ lọc
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty & Loading / Error States in Table */}
                {loading ? (
                  <div style={{ padding: "80px 40px", textAlign: "center", color: "var(--admin-text-muted)" }}>
                    <div className="spin-animation" style={{ display: "inline-block", fontSize: "32px", marginBottom: "16px" }}>🔄</div>
                    <p style={{ fontSize: "16px", fontWeight: "600" }}>Đang tải danh sách đơn hàng...</p>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  /* No records matched filtered criteria Empty State */
                  <div style={{ padding: "80px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#4b5563" }}>Không tìm thấy đơn hàng</h3>
                    <p style={{ color: "#9ca3af", margin: 0, fontSize: "14.5px" }}>Không có đơn hàng nào khớp với điều kiện tìm kiếm hoặc bộ lọc.</p>
                    <button className="btn-admin-outline" onClick={handleResetAllFilters} style={{ padding: "8px 16px", fontSize: "13px" }}>
                      Xóa bộ lọc
                    </button>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ fontWeight: "700" }}>Mã đơn hàng</th>
                        <th style={{ fontWeight: "700" }}>Khách hàng</th>
                        <th style={{ fontWeight: "700" }}>Nhà vườn</th>
                        <th style={{ fontWeight: "700" }}>Tổng tiền</th>
                        <th style={{ fontWeight: "700" }}>Thanh toán</th>
                        <th style={{ fontWeight: "700" }}>Trạng thái</th>
                        <th style={{ fontWeight: "700" }}>Ngày đặt</th>
                        <th style={{ textAlign: "right", fontWeight: "700" }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((order) => {
                        const statusClass = order.isPreorder
                          ? (order.status === 'completed' ? 'delivered' : order.status === 'paid' ? 'confirmed' : order.status === 'cancelled' ? 'cancelled' : 'pending')
                          : getStatusBadgeClass(order.status);
                        return (
                          <tr key={order.id}>
                            <td>
                              <span
                                onClick={() => handleSelectOrder(order)}
                                style={{ color: "#064e3b", fontWeight: "700", cursor: "pointer", textDecoration: "none" }}
                                title={order.isPreorder ? "Xem chi tiết preorder" : "Xem chi tiết đơn hàng"}
                              >
                                #{order.id}
                              </span>
                            </td>
                            <td>
                              <div className="user-cell-info">
                                <img
                                  src={getFullImageUrl(order.customerAvatarUrl) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                                  alt={order.recipient}
                                  className="user-cell-avatar"
                                  style={{ borderRadius: "50%", width: "40px", height: "40px" }}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
                                  }}
                                />
                                <div>
                                  <p className="user-cell-name" style={{ fontSize: "14px" }}>{order.recipient}</p>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: "600", color: "#4b5563" }}>
                                {order.isPreorder ? order.farmer : (order.items && order.items.length > 0 ? order.items[0].farmer : "Nhà vườn")}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontWeight: "700", color: "#1f2937", display: "block" }}>
                                {formatVND(order.amount)}
                              </span>
                              <span style={{ fontSize: "12px", color: "var(--admin-text-muted)" }}>
                                {order.isPreorder ? `${order.qty} sản phẩm` : `${order.items ? order.items.reduce((sum, item) => sum + item.qty, 0) : 1} sản phẩm`}
                              </span>
                            </td>
                            <td>
                              <span className={`payment-badge ${order.paymentStatus === 'paid' ? 'paid' : order.paymentStatus === 'refunded' ? 'refunded' : 'unpaid'}`}>
                                {order.isPreorder
                                  ? (order.paymentStatus === 'paid' ? 'Đã cọc 20%' : order.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : 'Chưa đặt cọc')
                                  : (order.paymentStatus === 'paid' ? 'Đã thanh toán' : order.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : 'Chưa thanh toán')}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${statusClass}`}>
                                {order.isPreorder ? (
                                  <>
                                    <span className={`status-dot ${order.status === 'completed' ? 'green' : order.status === 'paid' ? 'yellow' : order.status === 'cancelled' ? 'red' : 'grey'}`}></span>
                                    {order.statusLabel}
                                  </>
                                ) : (
                                  <>
                                    {order.status === 'pending' && (
                                      <>
                                        <span className="status-dot grey"></span>
                                        Chờ xử lý
                                      </>
                                    )}
                                    {(order.status === 'confirmed' || order.status === 'preparing') && (
                                      <>
                                        <span className="status-dot yellow" style={{ backgroundColor: "#0284c7" }}></span>
                                        {getStatusLabel(order.status)}
                                      </>
                                    )}
                                    {order.status === 'shipping' && (
                                      <>
                                        <svg className="status-icon" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#ea580c" }}>
                                          <rect x="1" y="3" width="15" height="13"></rect>
                                          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                                          <circle cx="5.5" cy="18.5" r="2.5"></circle>
                                          <circle cx="18.5" cy="18.5" r="2.5"></circle>
                                        </svg>
                                        Đang giao
                                      </>
                                    )}
                                    {order.status === 'delivered' && (
                                      <>
                                        <svg className="status-icon" viewBox="0 0 24 24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#065f46" }}>
                                          <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        Đã giao
                                      </>
                                    )}
                                    {(order.status === 'cancelled' || order.status === 'rejected') && (
                                      <>
                                        <svg className="status-icon" viewBox="0 0 24 24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#991b1b" }}>
                                          <line x1="18" y1="6" x2="6" y2="18"></line>
                                          <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                        {getStatusLabel(order.status)}
                                      </>
                                    )}
                                    {(order.status === 'refunded' || order.status === 'refund_requested') && (
                                      <>
                                        <span className="status-dot purple" style={{ backgroundColor: "#6b21a8" }}></span>
                                        {getStatusLabel(order.status)}
                                      </>
                                    )}
                                  </>
                                )}
                              </span>
                              {!order.isPreorder && (order.status?.toLowerCase() === 'cancelled' || order.status?.toLowerCase() === 'rejected') && order.cancelReason && (
                                <div style={{ fontSize: "11px", color: "#b91c1c", marginTop: "4px", fontWeight: "600", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={order.cancelReason}>
                                  Lý do: {order.cancelReason}
                                </div>
                              )}
                            </td>
                            <td>
                              <span style={{ color: "#4b5563", fontSize: "14px" }}>{order.date}</span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div className="direct-actions-wrapper" style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                <button
                                  title={order.isPreorder ? "Xem chi tiết preorder" : "Xem chi tiết đơn hàng"}
                                  className="btn-action-direct approve"
                                  onClick={() => handleSelectOrder(order)}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--admin-primary)" }}>
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* Pagination Controls calculated based on filtered orders list */}
                {!loading && orders.length > 0 && (
                  <div className="admin-pagination-row">
                    <div className="admin-pagination-info">
                      Hiển thị từ {orders.length > 0 ? indexOfFirstItem + 1 : 0} đến {indexOfLastItem} trong tổng số {totalElements || orders.length} đơn hàng
                    </div>

                    <div className="admin-pagination-controls">
                      <button
                        className="btn-pagination-nav"
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                      </button>

                      {[...Array(totalPages).keys()].map((p) => (
                        <button
                          key={p + 1}
                          className={`btn-pagination-page ${currentPage === p + 1 ? "active" : ""}`}
                          onClick={() => setCurrentPage(p + 1)}
                        >
                          {p + 1}
                        </button>
                      ))}

                      <button
                        className="btn-pagination-nav"
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Confirmation and Text Input Modal */}
      {confirmModal.isOpen && (
        <div className="confirm-modal-overlay" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
          <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <span className="confirm-modal-icon">⚠️</span>
              <h3>{confirmModal.title}</h3>
            </div>
            <div className="confirm-modal-body">
              <p>{confirmModal.message}</p>
            </div>
            <div className="confirm-modal-footer">
              <button className="btn-modal-cancel" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
                Hủy bỏ
              </button>
              <button
                className={`btn-modal-confirm ${confirmModal.targetStatus === 'cancelled' || confirmModal.targetStatus === 'rejected' ? 'delete' : 'toggle'}`}
                onClick={executeAction}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {isCreateModalOpen && (
        <div className="create-order-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="create-order-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Tạo đơn hàng mới</h3>
              <button className="close-x-btn" onClick={() => setIsCreateModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmitCreateOrder} className="create-order-form">
              <div className="create-order-modal-body-columns">

                {/* Left Column: Customer & Shipping */}
                <div className="modal-body-column left">
                  <h4>Thông tin khách hàng & Vận chuyển</h4>

                  <div className="form-group-admin">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label style={{ margin: 0 }}>Khách hàng <span className="req">*</span></label>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerInputMode("select");
                            setCustomerSearchText("");
                            setCreateFormData(prev => ({ ...prev, customerEmail: "", recipient: "", phone: "", address: "" }));
                          }}
                          style={{
                            padding: "4px 10px",
                            fontSize: "12px",
                            fontWeight: "600",
                            borderRadius: "6px",
                            border: "1.5px solid",
                            cursor: "pointer",
                            backgroundColor: customerInputMode === "select" ? "#064e3b" : "#ffffff",
                            color: customerInputMode === "select" ? "#ffffff" : "#6b7280",
                            borderColor: customerInputMode === "select" ? "#064e3b" : "#d1d5db",
                          }}
                        >
                          📋 Chọn từ danh sách
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerInputMode("manual");
                            setCreateFormData(prev => ({ ...prev, customerEmail: "", recipient: "", phone: "", address: "" }));
                          }}
                          style={{
                            padding: "4px 10px",
                            fontSize: "12px",
                            fontWeight: "600",
                            borderRadius: "6px",
                            border: "1.5px solid",
                            cursor: "pointer",
                            backgroundColor: customerInputMode === "manual" ? "#064e3b" : "#ffffff",
                            color: customerInputMode === "manual" ? "#ffffff" : "#6b7280",
                            borderColor: customerInputMode === "manual" ? "#064e3b" : "#d1d5db",
                          }}
                        >
                          ✏️ Nhập thủ công
                        </button>
                      </div>
                    </div>

                    {customerInputMode === "select" ? (
                      <>
                        {/* Search filter for dropdown */}
                        <input
                          type="text"
                          placeholder="🔍 Tìm kiếm khách hàng..."
                          value={customerSearchText}
                          onChange={(e) => setCustomerSearchText(e.target.value)}
                          className="form-input-admin"
                          style={{ marginBottom: "6px" }}
                        />
                        <select
                          value={createFormData.customerEmail}
                          onChange={(e) => {
                            const email = e.target.value;
                            const customer = customersList.find(c => c.email === email);
                            setCreateFormData(prev => ({
                              ...prev,
                              customerEmail: email,
                              recipient: customer ? customer.fullName : "",
                              phone: customer ? (customer.phone || "") : "",
                              address: customer ? (customer.address || "") : ""
                            }));
                          }}
                          className="form-input-admin"
                          required={customerInputMode === "select"}
                          size={Math.min(
                            customersList.filter(c =>
                              customerSearchText.trim() === "" ||
                              c.fullName.toLowerCase().includes(customerSearchText.toLowerCase()) ||
                              c.email.toLowerCase().includes(customerSearchText.toLowerCase())
                            ).length + 1,
                            5
                          )}
                          style={{ minHeight: "80px" }}
                        >
                          <option value="">-- Chọn khách hàng --</option>
                          {customersList
                            .filter(c =>
                              customerSearchText.trim() === "" ||
                              c.fullName.toLowerCase().includes(customerSearchText.toLowerCase()) ||
                              c.email.toLowerCase().includes(customerSearchText.toLowerCase())
                            )
                            .map(c => (
                              <option key={c.id} value={c.email}>{c.fullName} — {c.email}</option>
                            ))
                          }
                        </select>
                        {customersList.length > 0 && (
                          <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0 0" }}>
                            {customersList.filter(c =>
                              customerSearchText.trim() === "" ||
                              c.fullName.toLowerCase().includes(customerSearchText.toLowerCase()) ||
                              c.email.toLowerCase().includes(customerSearchText.toLowerCase())
                            ).length} khách hàng
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <input
                          type="email"
                          value={createFormData.customerEmail}
                          onChange={(e) => setCreateFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                          className="form-input-admin"
                          placeholder="Nhập email khách hàng (ví dụ: khachhang@gmail.com)"
                          required={customerInputMode === "manual"}
                        />
                        <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0 0" }}>
                          ⚠️ Email phải tồn tại trong hệ thống. Không cần chọn từ danh sách.
                        </p>
                      </>
                    )}
                  </div>

                  <div className="form-group-admin">
                    <label>Người nhận hàng <span className="req">*</span></label>
                    <input
                      type="text"
                      value={createFormData.recipient}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, recipient: e.target.value }))}
                      className="form-input-admin"
                      placeholder="Nhập tên người nhận"
                      required
                    />
                  </div>

                  <div className="form-row-admin-2col">
                    <div className="form-group-admin">
                      <label>Số điện thoại <span className="req">*</span></label>
                      <input
                        type="text"
                        value={createFormData.phone}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                        maxLength={10}
                        className="form-input-admin"
                        placeholder="Nhập số điện thoại"
                        required
                      />
                    </div>

                    <div className="form-group-admin">
                      <label>Phương thức thanh toán</label>
                      <select
                        value={createFormData.paymentMethod}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        className="form-input-admin"
                      >
                        <option value="COD">Thanh toán khi nhận hàng (COD)</option>
                        <option value="Bank Transfer">Chuyển khoản ngân hàng</option>
                        <option value="Credit Card">Thẻ tín dụng</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group-admin">
                    <label>Địa chỉ giao hàng <span className="req">*</span></label>
                    <textarea
                      value={createFormData.address}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="form-input-admin textarea"
                      placeholder="Nhập địa chỉ nhận hàng chi tiết"
                      rows={2}
                      required
                    />
                  </div>

                  <div className="form-group-admin">
                    <label>Ghi chú giao hàng</label>
                    <input
                      type="text"
                      value={createFormData.shippingNote}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, shippingNote: e.target.value }))}
                      className="form-input-admin"
                      placeholder="Ghi chú cho shipper (ví dụ: giao giờ hành chính)"
                    />
                  </div>
                </div>

                {/* Right Column: Products & Calculation */}
                <div className="modal-body-column right">
                  <h4>Sản phẩm & Chi phí</h4>

                  {/* Product Selection area */}
                  <div className="product-picker-section">
                    <div className="form-row-admin-3col">
                      <div className="form-group-admin select-product-col">
                        <label>Chọn nông sản</label>
                        <select
                          value={selectedProductToAdd}
                          onChange={(e) => setSelectedProductToAdd(e.target.value)}
                          className="form-input-admin"
                        >
                          <option value="">-- Chọn sản phẩm để thêm --</option>
                          {productsList.map(p => (
                            <option key={p.id} value={p.id} disabled={p.stockQuantity <= 0}>
                              {p.name} - {formatVND(p.price)}/{p.unit} (Kho: {p.stockQuantity})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group-admin qty-col">
                        <label>Số lượng</label>
                        <input
                          type="number"
                          min={1}
                          value={productQuantityToAdd}
                          onChange={(e) => setProductQuantityToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                          className="form-input-admin"
                        />
                      </div>

                      <div className="form-group-admin add-btn-col">
                        <label>&nbsp;</label>
                        <button
                          type="button"
                          className="btn-admin-add-product"
                          onClick={handleAddProductToOrder}
                          disabled={!selectedProductToAdd}
                        >
                          Thêm
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Selected Products List */}
                  <div className="selected-products-container">
                    <label className="section-sub-label">Sản phẩm đã chọn ({createFormData.items.length})</label>
                    {createFormData.items.length === 0 ? (
                      <div className="empty-products-placeholder">Chưa có sản phẩm nào được chọn.</div>
                    ) : (
                      <div className="selected-products-list-wrapper">
                        <table className="selected-products-table">
                          <thead>
                            <tr>
                              <th>Sản phẩm</th>
                              <th>Giá</th>
                              <th>Số lượng</th>
                              <th>Tạm tính</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {createFormData.items.map((item) => (
                              <tr key={item.product.id}>
                                <td>
                                  <div className="prod-cell-name">
                                    <strong>{item.product.name}</strong>
                                    <span className="prod-cell-farmer">Vườn: {item.product.farmerName}</span>
                                  </div>
                                </td>
                                <td>{formatVND(item.product.price)}</td>
                                <td>
                                  <input
                                    type="number"
                                    min={1}
                                    max={item.product.stockQuantity}
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateItemQuantity(item.product.id, e.target.value)}
                                    className="table-qty-input"
                                  />
                                  <span className="table-unit-label">/{item.product.unit}</span>
                                </td>
                                <td>{formatVND(item.product.price * item.quantity)}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn-remove-item-icon"
                                    onClick={() => handleRemoveProductFromOrder(item.product.id)}
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Calculation summary */}
                  <div className="order-calculation-summary">
                    <div className="calc-row">
                      <span>Tạm tính (Tiền hàng):</span>
                      <strong>{formatVND(createFormData.subtotal)}</strong>
                    </div>

                    <div className="form-row-admin-3col calc-inputs-row">
                      <div className="form-group-admin text-group">
                        <label>Phí vận chuyển (VNĐ)</label>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={createFormData.shippingFee}
                          onChange={(e) => handleFeeChange("shippingFee", e.target.value)}
                          className="form-input-admin"
                        />
                      </div>
                      <div className="form-group-admin text-group">
                        <label>Phí dịch vụ (VNĐ)</label>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={createFormData.serviceFee}
                          onChange={(e) => handleFeeChange("serviceFee", e.target.value)}
                          className="form-input-admin"
                        />
                      </div>
                      <div className="form-group-admin text-group">
                        <label>Chiết khấu (VNĐ)</label>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={createFormData.discount}
                          onChange={(e) => handleFeeChange("discount", e.target.value)}
                          className="form-input-admin"
                        />
                      </div>
                    </div>

                    <div className="calc-row total">
                      <span>Tổng thanh toán:</span>
                      <span className="total-amount-val">{formatVND(createFormData.amount)}</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer buttons */}
              <div className="modal-footer-row">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={createFormData.items.length === 0 || !createFormData.customerEmail}
                >
                  Tạo đơn hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="admin-toast-container">
          <div className="admin-toast">
            <div className="toast-message-content">
              <span>✅</span> {toastMessage}
            </div>
            <button className="toast-close-btn" onClick={() => setToastMessage("")}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
