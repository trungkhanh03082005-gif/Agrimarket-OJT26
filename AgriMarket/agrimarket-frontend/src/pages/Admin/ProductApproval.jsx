import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Bell, User, Lightbulb, DollarSign } from "lucide-react";
import authService from "../../services/authService";
import AdminSidebar from "../../components/common/Sidebar/AdminSidebar";
import AdminHeader from "../../components/common/Header/AdminHeader";
import apiClient from "../../services/apiClient";
import useDebounce from "../../hooks/useDebounce";
import "./AdminStyles.css";

const InfoCard = ({ label, value, highlight }) => (
  <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "14px 16px", backgroundColor: "#fff" }}>
    <p style={{ margin: "0 0 5px 0", fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
    <p style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: highlight ? "#064e3b" : "#111827" }}>{value}</p>
  </div>
);

const ProductApproval = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 350);
  const [activeTab, setActiveTab] = useState("Chờ duyệt");
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [totalPages, setTotalPages] = useState(1);

  // Detail view
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [checklist, setChecklist] = useState({
    vietgapVerified: false,
    globalgapVerified: false,
    traceabilityVerified: false,
    organicVerified: false,
  });

  // Audit logs
  const [productAuditLogs, setProductAuditLogs] = useState([]);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: "", message: "", actionType: "", reason: "", feedback: "",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Toast
  const [toastMessage, setToastMessage] = useState("");

  const getFullImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
    return `${API_BASE_URL}/${cleanUrl}`;
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, filterStatus, filterCategory, debouncedSearchQuery]);

  // ─── API Calls ───────────────────────────────────────────────────────────────
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/api/admin/products/paged", {
        params: {
          page: currentPage - 1,
          size: itemsPerPage,
          status: filterStatus === "All" ? null : filterStatus,
          category: filterCategory === "All" ? null : filterCategory,
          search: debouncedSearchQuery
        }
      });
      if (response.data && response.data.content) {
        setProducts(response.data.content);
        setTotalPages(response.data.totalPages || 1);
      } else {
        setProducts(response.data || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải sản phẩm:", err);
      setError("Không thể kết nối máy chủ. Đang dùng dữ liệu mô phỏng.");
      setProducts(getMockProducts());
    } finally {
      setLoading(false);
    }
  };

  const fetchAiInsights = async (product) => {
    setAiLoading(true);
    setAiInsights(null);
    try {
      const response = await apiClient.get(`/api/admin/products/${product.id}/ai-insights`);
      if (response.data && response.data.score !== undefined) {
        setAiInsights(response.data);
      } else {
        // API returned empty/invalid → use mock
        setAiInsights(generateMockAiInsights(product));
      }
    } catch (err) {
      console.warn("AI insights API không khả dụng, dùng dữ liệu mô phỏng:", err.message);
      setAiInsights(generateMockAiInsights(product));
    } finally {
      setAiLoading(false);
    }
  };

  const fetchProductAuditLogs = async (productId) => {
    try {
      const response = await apiClient.get(`/api/admin/audit-logs?targetType=PRODUCT&targetId=${productId}`);
      setProductAuditLogs(response.data || []);
    } catch (err) {
      setProductAuditLogs([
        {
          id: 1, actionType: "PRODUCT_SUBMITTED", actorName: "Hệ thống",
          createdAt: "10/06/2026 08:00",
          remarks: "Nông dân đã gửi yêu cầu duyệt sản phẩm.",
        },
      ]);
    }
  };

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setAdminNotes(product.adminNotes || "");
    setChecklist({
      vietgapVerified: !!product.certificateUrl || !!product.farmerVietgapUrl,
      globalgapVerified: !!product.farmerGlobalgapUrl,
      organicVerified: !!product.farmerOrganicUrl,
      traceabilityVerified: !!product.traceabilityImageUrl,
    });
    setProductAuditLogs([]);
    // Pass the full product object so AI mock always has data
    fetchAiInsights(product);
    fetchProductAuditLogs(product.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Memoized toggle to prevent re-rendering ALL checklist items on every click
  const handleChecklistToggle = useCallback((key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedProductIds([]);
    const map = { "Tất cả": "All", "Chờ duyệt": "pending", "Đã duyệt": "approved", "Từ chối": "rejected", "Yêu cầu sửa đổi": "request_changes", "Đã ẩn": "hidden" };
    setFilterStatus(map[tab] ?? "All");
  };

  const getFilteredProducts = () =>
    products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.farmerName && p.farmerName.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchSearch) return false;
      if (filterCategory !== "All" && p.categoryName !== filterCategory) return false;
      if (filterStatus !== "All" && p.status !== filterStatus) return false;
      return true;
    });

  const filteredProducts = getFilteredProducts();
  const categoriesList = [...new Set(products.map((p) => p.categoryName).filter(Boolean))];
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = products;

  const handleSelectAll = (e) =>
    setSelectedProductIds(e.target.checked ? currentItems.map((p) => p.id) : []);
  const handleSelectRow = (id) =>
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // Actions
  const triggerApprove = () =>
    setConfirmModal({
      isOpen: true, title: "Xác nhận phê duyệt sản phẩm",
      message: `Bạn có chắc chắn muốn phê duyệt sản phẩm "${selectedProduct.name}"? Sản phẩm sẽ ngay lập tức hiển thị công khai trên AgriMarket.`,
      actionType: "approve", reason: "", feedback: "",
    });

  const triggerReject = () =>
    setConfirmModal({
      isOpen: true, title: "Từ chối phê duyệt sản phẩm",
      message: `Nhập lý do từ chối sản phẩm "${selectedProduct.name}". Thông báo sẽ được gửi đến nông dân.`,
      actionType: "reject", reason: "", feedback: "",
    });

  const triggerRequestChanges = () =>
    setConfirmModal({
      isOpen: true, title: "Yêu cầu nông dân chỉnh sửa",
      message: `Nhập hướng dẫn cụ thể để nông dân biết cách sửa thông tin sản phẩm "${selectedProduct.name}".`,
      actionType: "request_changes", reason: "", feedback: adminNotes || "",
    });

  const triggerHide = () =>
    setConfirmModal({
      isOpen: true, title: "Xác nhận ẩn sản phẩm",
      message: `Nhập lý do ẩn sản phẩm "${selectedProduct.name}". Sản phẩm sẽ bị gỡ khỏi thị trường công khai.`,
      actionType: "hide", reason: "", feedback: "",
    });

  const triggerUnhide = () =>
    setConfirmModal({
      isOpen: true, title: "Xác nhận hiển thị lại sản phẩm",
      message: `Bạn có chắc chắn muốn hiển thị lại sản phẩm "${selectedProduct.name}"? Sản phẩm sẽ hiển thị công khai trên AgriMarket.`,
      actionType: "unhide", reason: "", feedback: "",
    });

  const handleBulkApprove = () => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận phê duyệt hàng loạt",
      message: `Bạn có chắc chắn muốn phê duyệt nhanh ${selectedProductIds.length} sản phẩm đã chọn? Các sản phẩm này sẽ ngay lập tức hiển thị công khai trên AgriMarket.`,
      actionType: "bulk-approve",
      reason: "",
      feedback: "",
    });
  };

  const executeAction = async () => {
    const { actionType, reason, feedback } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false });

    if (actionType === "bulk-approve") {
      try {
        await apiClient.post("/api/admin/products/bulk-approve", selectedProductIds);
        showToast(`✅ Đã phê duyệt nhanh ${selectedProductIds.length} sản phẩm thành công.`);
        setSelectedProductIds([]);
        fetchProducts();
      } catch (err) {
        setProducts((prev) =>
          prev.map((p) =>
            selectedProductIds.includes(p.id) ? { ...p, status: "approved" } : p
          )
        );
        showToast(`✅ Đã phê duyệt nhanh ${selectedProductIds.length} sản phẩm (Chế độ mô phỏng).`);
        setSelectedProductIds([]);
      }
      return;
    }

    const prodId = selectedProduct.id;
    try {
      let res;
      if (actionType === "approve") {
        res = await apiClient.post(`/api/admin/products/${prodId}/approve`);
        showToast(`✅ Đã phê duyệt "${selectedProduct.name}" thành công.`);
      } else if (actionType === "unhide") {
        res = await apiClient.post(`/api/admin/products/${prodId}/unhide`);
        showToast(`✅ Đã hiển thị lại sản phẩm "${selectedProduct.name}".`);
      } else if (actionType === "reject") {
        if (!reason.trim()) { showToast("⚠️ Cần nhập lý do từ chối."); return; }
        res = await apiClient.post(`/api/admin/products/${prodId}/reject`, { reason });
        showToast(`✅ Đã từ chối sản phẩm "${selectedProduct.name}".`);
      } else if (actionType === "hide") {
        if (!reason.trim()) { showToast("⚠️ Cần nhập lý do ẩn sản phẩm."); return; }
        res = await apiClient.post(`/api/admin/products/${prodId}/hide`, { reason });
        showToast(`✅ Đã ẩn sản phẩm "${selectedProduct.name}".`);
      } else {
        if (!feedback.trim()) { showToast("⚠️ Cần nhập nội dung hướng dẫn."); return; }
        res = await apiClient.post(`/api/admin/products/${prodId}/request-changes`, { feedback });
        showToast(`✅ Đã gửi yêu cầu chỉnh sửa.`);
      }
      if (res?.data) setSelectedProduct(res.data);
      fetchProducts();
      fetchProductAuditLogs(prodId);
    } catch (err) {
      const updatedStatus = actionType === "approve" ? "approved" : actionType === "unhide" ? "approved" : actionType === "reject" ? "rejected" : actionType === "hide" ? "hidden" : "request_changes";
      const newProd = { ...selectedProduct, status: updatedStatus, adminNotes: actionType === "request_changes" ? feedback : "", rejectionReason: (actionType === "reject" || actionType === "hide") ? reason : "" };
      setProducts((prev) => prev.map((p) => (p.id === prodId ? newProd : p)));
      setSelectedProduct(newProd);
      showToast("✅ Cập nhật trạng thái thành công (Chế độ mô phỏng).");
      const mockLog = {
        id: Date.now(),
        actionType: actionType === "approve" ? "PRODUCT_APPROVED" : actionType === "unhide" ? "PRODUCT_UNHIDDEN" : actionType === "reject" ? "PRODUCT_REJECTED" : actionType === "hide" ? "PRODUCT_HIDDEN" : "PRODUCT_CHANGES_REQUESTED",
        actorName: currentUser?.fullName || "Administrator",
        createdAt: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        remarks: actionType === "approve" ? "Sản phẩm được phê duyệt." : actionType === "unhide" ? "Sản phẩm hiển thị lại." : actionType === "reject" ? `Lý do từ chối: ${reason}` : actionType === "hide" ? `Lý do ẩn: ${reason}` : `Yêu cầu sửa đổi: ${feedback}`,
      };
      setProductAuditLogs((prev) => [mockLog, ...prev]);
    }
  };

  const handleUseAiDescription = () => {
    if (aiInsights?.suggestedDescription) {
      setAdminNotes((prev) => (prev ? prev + "\n\n" : "") + aiInsights.suggestedDescription);
      showToast("Đã thêm mô tả AI vào ô ghi chú phản hồi.");
    }
  };

  const handleExport = () => {
    const csv = "data:text/csv;charset=utf-8," + ["ID,Tên sản phẩm,Danh mục,Nhà vườn,Giá,Đơn vị,Trạng thái"].join(",") + "\n" +
      filteredProducts.map((p) => `${p.id},${p.name},${p.categoryName},${p.farmerName},${p.price},${p.unit},${p.status}`).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "agri_product_approval.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã xuất danh sách kiểm duyệt thành công!");
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const getStatusLabel = (s) => ({ pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối", request_changes: "Cần sửa đổi" }[s?.toLowerCase()] ?? s);
  const getStatusClass = (s) => ({ pending: "pending", approved: "active", rejected: "suspended", request_changes: "pending" }[s?.toLowerCase()] ?? "");

  const getMockProducts = () => [
    {
      id: 101, name: "Cam sành hữu cơ loại 1", categoryName: "Trái cây",
      farmerName: "Trang trại Cam Sạch Tiền Giang", price: 35000, unit: "kg",
      status: "pending", harvestDate: "2026-06-08", expirationDate: "2026-06-25",
      description: "Cam sành chín tự nhiên, không phun thuốc kích chín hay hóa chất bảo quản. Cam vỏ mỏng, mọng nước, ngọt đậm. Phù hợp vắt nước uống giải nhiệt cực tốt cho mùa hè nóng bức.",
      certificateUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500",
      traceabilityImageUrl: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500",
      thumbnailUrl: "https://images.unsplash.com/photo-1543573852-1a78a39f8841?w=500",
      createdAt: "2026-06-09T08:00:00", farmLocation: "Cái Bè, Tiền Giang", stockQuantity: 500,
    },
    {
      id: 102, name: "Khoai tây VietGAP Đà Lạt", categoryName: "Rau củ quả",
      farmerName: "Hợp tác xã nông nghiệp Đà Lạt Xanh", price: 28000, unit: "kg",
      status: "pending", harvestDate: "2026-06-05", expirationDate: "2026-07-05",
      description: "Khoai tây vỏ vàng, ruột vàng bở dẻo ngọt, đạt chứng nhận VietGAP số hiệu 52/VietGAP. Phù hợp nấu canh xương, chiên khoai tây lắc.",
      certificateUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=500",
      traceabilityImageUrl: "", stockQuantity: 1200,
      thumbnailUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500",
      createdAt: "2026-06-09T10:30:00", farmLocation: "Lạc Dương, Lâm Đồng",
    },
    {
      id: 103, name: "Dâu tây New Zealand ngọt thơm", categoryName: "Trái cây",
      farmerName: "Dâu Tây Organic Mộc Châu", price: 240000, unit: "hộp 500g",
      status: "approved", harvestDate: "2026-06-07", expirationDate: "2026-06-14",
      description: "Dâu tây giống New Zealand canh tác nhà màng hữu cơ tại Mộc Châu. Quả dâu đỏ mọng, giòn ngọt thanh và tỏa hương thơm dịu tự nhiên đặc trưng.",
      certificateUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500",
      traceabilityImageUrl: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500",
      thumbnailUrl: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=500",
      createdAt: "2026-06-08T14:20:00", farmLocation: "Mộc Châu, Sơn La", stockQuantity: 80,
    },
    {
      id: 104, name: "Rau muống sạch VietGAP", categoryName: "Rau lá",
      farmerName: "Hợp tác xã Rau Sạch Long An", price: 15000, unit: "bó",
      status: "pending", harvestDate: "2026-06-10", expirationDate: "2026-06-12",
      description: "Rau muống trồng theo tiêu chuẩn VietGAP, không thuốc trừ sâu, thu hoạch mỗi sáng sớm.",
      certificateUrl: "", traceabilityImageUrl: "", stockQuantity: 300,
      thumbnailUrl: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500",
      createdAt: "2026-06-10T06:00:00", farmLocation: "Cần Giuộc, Long An",
    },
    {
      id: 105, name: "Bơ sáp Đắk Lắk loại A", categoryName: "Trái cây",
      farmerName: "Trang trại Bơ Buôn Ma Thuột", price: 85000, unit: "kg",
      status: "rejected", harvestDate: "2026-06-01", expirationDate: "2026-06-20",
      description: "Bơ sáp Đắk Lắk loại A, thịt vàng mịn béo ngậy. Bơ già cây, ăn ngay hoặc để 2-3 ngày.",
      certificateUrl: "", traceabilityImageUrl: "", stockQuantity: 200,
      thumbnailUrl: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=500",
      createdAt: "2026-06-08T09:00:00", farmLocation: "Buôn Ma Thuột, Đắk Lắk",
    },
  ];

  const generateMockAiInsights = (product) => {
    const descLen = product.description?.length ?? 0;
    const score = descLen > 200 ? 88 : descLen > 100 ? 68 : 42;
    const riskScore = product.farmerOrganicUrl ? 18 : product.certificateUrl ? 30 : 55;
    return {
      productId: product.id,
      score,
      riskScore,
      priceCheck: isHighPrice ? "cao_hơn_bình_thường" : "hợp_lý",
      flagged: false,
      flaggedReason: "",
      recommendedPrice: product.price,
      minPrice: Math.round(product.price * 0.85),
      maxPrice: Math.round(product.price * 1.15),
      explanation: `Khoảng giá đề xuất dựa trên giá thị trường danh mục "${product.categoryName}" đạt chứng nhận ${product.farmerOrganicUrl ? "Hữu cơ (+30%)" : "VietGAP"}. Mức giá ${product.price?.toLocaleString("vi-VN")} đ/kg của nhà vườn là hoàn toàn phù hợp với thị trường hiện tại.`,
      suggestedDescription: `Gợi ý mô tả lại cho sản phẩm ${product.name} chuẩn SEO:\n1. Giới thiệu: Nông sản tươi ngon cao cấp thu hoạch trực tiếp từ ${product.farmLocation ?? "vùng trồng đạt chuẩn"}.\n2. Đặc sắc: Canh tác an toàn tự nhiên giữ trọn hương vị đặc trưng, giàu vitamin và khoáng chất thiết yếu.\n3. Bảo quản: Giữ ngăn mát tủ lạnh từ 3–7°C, sử dụng trong vòng ${product.unit === "bó" ? "2–3 ngày" : "7–10 ngày"}.`,
    };
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  // ─── DETAIL VIEW ─────────────────────────────────────────────────────────────
  const renderDetailView = () => {
    const prod = selectedProduct;
    const isPreorder = prod.isPreorder || prod.preorder;

    const statusColors = {
      pending: { bg: "#fff7ed", text: "#92400e", border: "#fcd34d" },
      approved: { bg: "#ecfdf5", text: "#065f46", border: "#6ee7b7" },
      rejected: { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5" },
      request_changes: { bg: "#fffbeb", text: "#92400e", border: "#fcd34d" },
      hidden: { bg: "#fffbeb", text: "#b45309", border: "#fcd34d" },
    };
    const sc = statusColors[prod.status] ?? { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };



    return (
      <div className="account-details-container">
        {/* ── Breadcrumb ── */}
        <div className="details-breadcrumbs" style={{ marginBottom: "20px" }}>
          <span className="details-breadcrumb-link" onClick={() => { setSelectedProduct(null); setAiInsights(null); }}>
            Kiểm duyệt sản phẩm
          </span>
          <span className="details-breadcrumb-separator">&gt;</span>
          <span className="details-breadcrumb-current">Chi tiết sản phẩm #{prod.id}</span>
        </div>

        {/* ── Header: title + action buttons ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", gap: "20px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "24px", fontWeight: "800", color: "#111827", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {prod.name}
              {isPreorder && (
                <span style={{ backgroundColor: "#e8f5e9", color: "#1b5e20", border: "1.5px solid #a7f3d0", borderRadius: "20px", padding: "2px 10px", fontSize: "12px", fontWeight: "700" }}>
                  Đặt trước (Preorder)
                </span>
              )}
            </h2>
            <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
              Đăng tải bởi: <strong style={{ color: "#374151" }}>{prod.farmerName}</strong>
              {prod.farmLocation && <> &bull; {prod.farmLocation}</>}
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", flexShrink: 0 }}>
            {prod.status === "pending" && (
              <>
                <button onClick={triggerApprove} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", borderRadius: "10px", border: "none", backgroundColor: "#064e3b", color: "#fff", fontWeight: "700", fontSize: "14px", cursor: "pointer", boxShadow: "0 2px 8px rgba(6,78,59,0.25)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  Phê duyệt
                </button>
                <button onClick={triggerReject} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", borderRadius: "10px", border: "1.5px solid #fca5a5", backgroundColor: "#fff5f5", color: "#dc2626", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /></svg>
                  Từ chối
                </button>
                <button onClick={triggerRequestChanges} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", borderRadius: "10px", border: "1.5px solid #fcd34d", backgroundColor: "#fffbeb", color: "#92400e", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  Yêu cầu sửa đổi
                </button>
              </>
            )}
            {prod.status === "approved" && (
              <button onClick={triggerHide} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", borderRadius: "10px", border: "1.5px solid #fca5a5", backgroundColor: "#fff5f5", color: "#dc2626", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
                Ẩn sản phẩm
              </button>
            )}
            {prod.status === "hidden" && (
              <button onClick={triggerUnhide} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", borderRadius: "10px", border: "none", backgroundColor: "#064e3b", color: "#fff", fontWeight: "700", fontSize: "14px", cursor: "pointer", boxShadow: "0 2px 8px rgba(6,78,59,0.25)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
                Hiện sản phẩm
              </button>
            )}
            <button onClick={() => { setSelectedProduct(null); setAiInsights(null); }} style={{ padding: "10px 18px", borderRadius: "10px", border: "1.5px solid #e5e7eb", backgroundColor: "#fff", color: "#374151", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}>
              ← Quay lại danh sách
            </button>
          </div>
        </div>

        {/* ── Status banner (if already processed) ── */}
        {prod.status !== "pending" && (
          <div style={{ padding: "14px 20px", borderRadius: "12px", marginBottom: "24px", border: `1.5px solid ${sc.border}`, backgroundColor: sc.bg, display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "18px" }}>{prod.status === "approved" ? "✅" : prod.status === "rejected" ? "❌" : prod.status === "hidden" ? "👁️‍🗨️" : "✏️"}</span>
            <span style={{ fontWeight: "600", color: sc.text, fontSize: "14px" }}>
              {prod.status === "approved" && "Sản phẩm đã được phê duyệt và đang hiển thị công khai trên AgriMarket."}
              {prod.status === "rejected" && `Sản phẩm đã bị từ chối kiểm duyệt.${prod.rejectionReason ? ` Lý do: ${prod.rejectionReason}` : ""}`}
              {prod.status === "request_changes" && "Đã gửi yêu cầu chỉnh sửa đến nông dân. Đang chờ nông dân cập nhật."}
              {prod.status === "hidden" && `Sản phẩm đã bị ẩn khỏi thị trường công khai.${prod.rejectionReason ? ` Lý do ẩn: ${prod.rejectionReason}` : ""}`}
            </span>
            <span style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", backgroundColor: sc.border, color: sc.text }}>
              {getStatusLabel(prod.status)}
            </span>
          </div>
        )}

        {/* ── Main 2-Column Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "24px", alignItems: "start" }}>

          {/* ── LEFT COLUMN ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Product Image */}
            <div style={{ borderRadius: "14px", overflow: "hidden", backgroundColor: "#f3f4f6", aspectRatio: "4/3", position: "relative", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <img
                src={prod.thumbnailUrl || prod.images?.[0] || "https://images.unsplash.com/photo-1543573852-1a78a39f8841?w=600"}
                alt={prod.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1543573852-1a78a39f8841?w=600"; }}
              />
              <span className={`details-role-status-badge ${prod.status}`} style={{ position: "absolute", top: "14px", left: "14px", margin: 0, fontSize: "12px" }}>
                {getStatusLabel(prod.status)}
              </span>
              {prod.farmerOrganicUrl && (
                <span style={{ position: "absolute", top: "14px", right: "14px", backgroundColor: "#064e3b", color: "#fff", borderRadius: "20px", padding: "4px 12px", fontSize: "11px", fontWeight: "700" }}>
                  🌿 Hữu cơ
                </span>
              )}
            </div>

            {/* Info Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <InfoCard label="Mã sản phẩm" value={`#PRD-${prod.id}`} />
              <InfoCard label="Danh mục" value={prod.categoryName || "—"} />
              <InfoCard label="Giá bán" value={`${prod.price?.toLocaleString("vi-VN")} đ / ${prod.unit}`} highlight />
              <InfoCard label="Tồn kho" value={prod.stockQuantity ? `${prod.stockQuantity} ${prod.unit}` : "—"} />
              <InfoCard label={isPreorder ? "Ngày thu hoạch dự kiến" : "Ngày thu hoạch"} value={prod.harvestDate || "—"} />
              <InfoCard label="Hạn sử dụng" value={prod.expirationDate || "—"} />
              <InfoCard
                label="Độ hư hỏng / Vận chuyển"
                value={
                  prod.perishability === "rất dễ hư" ? "Rất dễ hư (Nội tỉnh)" :
                    prod.perishability === "dễ hư" ? "Dễ hư hỏng (Giao nhanh)" :
                      prod.perishability === "trung bình" ? "Trung bình (Liên tỉnh)" :
                        prod.perishability === "khô" ? "Khô (Toàn quốc)" :
                          (prod.perishability || "—")
                }
              />
              <InfoCard
                label="Bán kính giới hạn"
                value={prod.limitDistance !== undefined && prod.limitDistance !== null ? `${prod.limitDistance} km` : "Không giới hạn"}
              />
              <InfoCard
                label="Hình thức bán"
                value={isPreorder ? "Đặt trước (Preorder)" : "Bán ngay (Thông thường)"}
                highlight={isPreorder}
              />
            </div>

            {/* Farmer Info */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px 20px", backgroundColor: "#fff" }}>
              <h4 style={{ margin: "0 0 14px 0", fontSize: "13px", fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}>
                <User size={16} /> Thông tin nhà vườn
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { label: "Tên nhà vườn / Hộ sản xuất", value: prod.farmerName },
                  { label: "Địa điểm trồng trọt", value: prod.farmLocation },
                  { label: "Loại canh tác", value: prod.farmerOrganicUrl ? "Hữu cơ (Organic)" : "Canh tác thường / VietGAP" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "16px", paddingBottom: "8px", borderBottom: "1px solid #f3f4f6" }}>
                    <span style={{ fontSize: "13px", color: "#6b7280", flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#111827", textAlign: "right" }}>{value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Price Monitor */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px 20px", backgroundColor: "#fafafa" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <DollarSign size={18} style={{ color: "#0f766e" }} />
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#374151" }}>AI Price Monitoring Engine</span>
                </div>
                {aiLoading ? (
                  <span style={{ fontSize: "12px", color: "#9ca3af" }}>Đang phân tích...</span>
                ) : aiInsights ? (
                  <span className={`badge-status ${aiInsights.priceCheck === "hợp_lý" ? "active" : "suspended"}`} style={{ fontSize: "11px" }}>
                    {aiInsights.priceCheck === "hợp_lý" ? "Hợp lý" : aiInsights.priceCheck === "thấp_hơn_bình_thường" ? "Giá quá thấp" : "Cao hơn thị trường"}
                  </span>
                ) : null}
              </div>
              {aiLoading && <p style={{ margin: 0, color: "#9ca3af", fontSize: "13px" }}>Đang tải dữ liệu giá từ AI...</p>}
              {!aiLoading && aiInsights && (
                <div style={{ fontSize: "13px" }}>
                  {[
                    { label: "Giá đề xuất tối ưu:", value: `${aiInsights.recommendedPrice?.toLocaleString("vi-VN")} đ` },
                    { label: "Biên độ thị trường:", value: `${aiInsights.minPrice?.toLocaleString("vi-VN")} đ – ${aiInsights.maxPrice?.toLocaleString("vi-VN")} đ` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: "#6b7280" }}>{label}</span>
                      <strong style={{ color: "#111827" }}>{value}</strong>
                    </div>
                  ))}
                  <p style={{ margin: "10px 0 0 0", fontSize: "12px", color: "#6b7280", fontStyle: "italic", borderTop: "1px solid #e5e7eb", paddingTop: "10px", lineHeight: "1.5", display: "flex", alignItems: "flex-start", gap: "6px" }}>
                    <Lightbulb size={16} style={{ color: "#d97706", flexShrink: 0 }} /> {aiInsights.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Verification Checklist */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px 20px", backgroundColor: "#fff" }}>
              <h4 style={{ margin: "0 0 14px 0", fontSize: "13px", fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                ✅ Bảng kiểm chứng chất lượng (Verification Checklist)
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { key: "vietgapVerified", label: "Chứng nhận VietGAP / Giấy phép chất lượng nông sản hợp lệ", link: prod.certificateUrl || prod.farmerVietgapUrl, linkText: "Xem ảnh tài liệu", disabled: false },
                  { key: "globalgapVerified", label: "Chứng nhận GlobalGAP", link: prod.farmerGlobalgapUrl, linkText: "Xem ảnh tài liệu", disabled: false },
                  { key: "organicVerified", label: "Chứng nhận hữu cơ (Organic Certificate)", link: prod.farmerOrganicUrl, linkText: "Xem ảnh tài liệu", disabled: false },
                  { key: "traceabilityVerified", label: "Bản đồ vùng trồng / Hình ảnh truy xuất nguồn gốc (Traceability Map)", link: prod.traceabilityImageUrl, linkText: "Xem ảnh bản đồ", disabled: false },
                ].map(({ key, label, link, linkText, disabled }) => {
                  const isChecked = checklist[key];
                  return (
                    <div
                      key={key}
                      className={`checklist-item${isChecked && !disabled ? " checklist-item-checked" : ""}${disabled ? " checklist-item-disabled" : ""}`}
                      onClick={() => !disabled && handleChecklistToggle(key)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => !disabled && handleChecklistToggle(key)}
                        disabled={disabled}
                        onClick={(e) => e.stopPropagation()}
                        style={{ accentColor: "#064e3b", width: "16px", height: "16px", flexShrink: 0, cursor: disabled ? "not-allowed" : "pointer" }}
                      />
                      <span style={{ flexGrow: 1, fontSize: "13.5px", color: "#374151", lineHeight: "1.4" }}>
                        {label}
                      </span>
                      {disabled && (
                        <span style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic", backgroundColor: "#f3f4f6", borderRadius: "4px", padding: "2px 7px", flexShrink: 0 }}>Không áp dụng</span>
                      )}
                      {!disabled && link && (
                        <a href={link} target="_blank" rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: "12px", color: "#064e3b", fontWeight: "700", textDecoration: "underline", flexShrink: 0, whiteSpace: "nowrap" }}>
                          {linkText}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px 20px", backgroundColor: "#fff" }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                📝 Mô tả sản phẩm
              </h4>
              <p style={{ margin: 0, fontSize: "14px", color: "#374151", lineHeight: "1.7", whiteSpace: "pre-line" }}>
                {prod.description || "Chưa có mô tả."}
              </p>
            </div>

            {/* Audit Logs */}
            {productAuditLogs.length > 0 && (
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px 20px", backgroundColor: "#fff" }}>
                <h4 style={{ margin: "0 0 14px 0", fontSize: "13px", fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  📋 Nhật ký kiểm duyệt sản phẩm
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {productAuditLogs.map((log) => (
                    <div key={log.id} style={{ display: "flex", gap: "12px", paddingBottom: "12px", borderBottom: "1px solid #f3f4f6" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "2.5px solid #064e3b", backgroundColor: "#fff", flexShrink: 0, marginTop: "4px" }} />
                      <div style={{ flexGrow: 1 }}>
                        <p style={{ margin: "0 0 3px 0", fontSize: "13.5px", fontWeight: "600", color: "#111827" }}>
                          {log.actionType}
                          <span style={{ fontWeight: "400", color: "#6b7280", fontSize: "12px" }}> • Thực hiện bởi: {log.actorName}</span>
                        </p>
                        <span style={{ fontSize: "11.5px", color: "#9ca3af" }}>{log.createdAt}</span>
                        {log.remarks && (
                          <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#6b7280", fontStyle: "italic" }}>
                            "{log.remarks}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── LIST VIEW ───────────────────────────────────────────────────────────────
  const renderListView = () => {
    const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));
    const hasApprovedSelected = selectedProducts.some((p) => p.status === "approved");

    return (
      <>
        <div className="admin-page-title-row">
          <div className="admin-page-title-info">
            <h2>Kiểm duyệt sản phẩm</h2>
            <p>Duyệt, từ chối hoặc yêu cầu sửa đổi sản phẩm từ nông dân trước khi hiển thị trên chợ.</p>
          </div>
          <div className="admin-page-actions">
            {selectedProductIds.length >= 2 && (
              <button
                className="btn-admin-primary"
                onClick={handleBulkApprove}
                disabled={hasApprovedSelected}
                style={{
                  marginRight: "10px",
                  padding: "10px 20px",
                  opacity: hasApprovedSelected ? 0.4 : 1,
                  backgroundColor: hasApprovedSelected ? "#374151" : undefined,
                  borderColor: hasApprovedSelected ? "#374151" : undefined,
                  cursor: hasApprovedSelected ? "not-allowed" : "pointer"
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Duyệt nhanh ({selectedProductIds.length})
              </button>
            )}
            <button className="btn-admin-outline" onClick={handleExport}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Xuất dữ liệu
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-tabs-row">
          {["Tất cả", "Chờ duyệt", "Đã duyệt", "Từ chối", "Yêu cầu sửa đổi", "Đã ẩn"].map((tab) => (
            <button key={tab} className={`admin-tab ${activeTab === tab ? "active" : ""}`} onClick={() => handleTabClick(tab)}>
              {tab}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="admin-filters-bar">
          <div className="filter-search-wrapper">
            <span className="filter-search-icon" style={{ display: "inline-flex", alignItems: "center" }}><Search size={16} /></span>
            <input type="text" placeholder="Tìm theo tên sản phẩm, nông dân..." className="filter-search-input"
              value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
          </div>
          <div className="filter-selects">
            <div className="filter-select-wrapper">
              <label>Danh mục</label>
              <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }} className="filter-select">
                <option value="All">Tất cả danh mục</option>
                {categoriesList.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input type="checkbox" className="admin-table-checkbox" onChange={handleSelectAll}
                    checked={currentItems.length > 0 && currentItems.every((i) => selectedProductIds.includes(i.id))} />
                </th>
                <th>Tên sản phẩm</th>
                <th>Nhà vườn / Nông hộ</th>
                <th>Giá bán / Đơn vị</th>
                <th>Danh mục</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "var(--admin-text-muted)" }}>Đang tải danh sách kiểm duyệt nông sản...</td></tr>
              ) : currentItems.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "var(--admin-text-muted)" }}>Không có sản phẩm nào phù hợp.</td></tr>
              ) : (
                currentItems.map((prod) => {
                  const isSelected = selectedProductIds.includes(prod.id);
                  return (
                    <tr key={prod.id} style={{ backgroundColor: isSelected ? "#f0fdf4" : "transparent" }}>
                      <td>
                        <input type="checkbox" className="admin-table-checkbox" checked={isSelected} onChange={() => handleSelectRow(prod.id)} />
                      </td>
                      <td>
                        <div className="user-cell-info clickable-avatar" style={{ cursor: "pointer" }} onClick={() => handleSelectProduct(prod)} title="Xem chi tiết kiểm duyệt">
                          <img src={prod.thumbnailUrl || "https://images.unsplash.com/photo-1543573852-1a78a39f8841?w=150"} alt={prod.name}
                            className="user-cell-avatar" style={{ borderRadius: "6px" }}
                            onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1543573852-1a78a39f8841?w=150"; }} />
                          <div>
                            <p className="user-cell-name" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", margin: 0 }}>
                              {prod.name}
                              {(prod.isPreorder || prod.preorder) && (
                                <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "10px", backgroundColor: "#e8f5e9", color: "#1b5e20", border: "1px solid #a7f3d0", fontWeight: "700" }}>
                                  Đặt trước
                                </span>
                              )}
                            </p>
                            <span style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>#{prod.id} • {prod.categoryName}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="user-cell-email" style={{ fontSize: "14px", color: "var(--admin-text-main)", fontWeight: "600" }}>{prod.farmerName}</p>
                        <span style={{ fontSize: "12px", color: "var(--admin-text-muted)" }}>{prod.farmLocation}</span>
                      </td>
                      <td>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "var(--admin-primary)" }}>{prod.price?.toLocaleString("vi-VN")} đ</p>
                        <span style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>mỗi {prod.unit}</span>
                      </td>
                      <td>
                        <span style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600",
                          backgroundColor: "#f3f4f6",
                          color: "#4b5563",
                          border: "1px solid #e5e7eb"
                        }}>
                          {prod.categoryName || "Nông sản"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-status ${getStatusClass(prod.status)}`}>{getStatusLabel(prod.status)}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button title="Xem chi tiết & Kiểm duyệt" className="btn-action-direct unlock" onClick={() => handleSelectProduct(prod)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--admin-primary)" }}>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          {prod.status === "pending" && (
                            <>
                              <button title="Phê duyệt nhanh" className="btn-action-direct unlock"
                                style={{ backgroundColor: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: "8px", padding: "6px", cursor: "pointer" }}
                                onClick={() => { handleSelectProduct(prod); setTimeout(triggerApprove, 100); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                              </button>
                              <button title="Từ chối nhanh" className="btn-action-direct"
                                style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "6px", cursor: "pointer" }}
                                onClick={() => { handleSelectProduct(prod); setTimeout(triggerReject, 100); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                              </button>
                            </>
                          )}
                          {prod.status === "approved" && (
                            <button title="Ẩn sản phẩm" className="btn-action-direct"
                              style={{ backgroundColor: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "8px", padding: "6px", cursor: "pointer" }}
                              onClick={() => { handleSelectProduct(prod); setTimeout(triggerHide, 100); }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                              </svg>
                            </button>
                          )}
                          {prod.status === "hidden" && (
                            <button title="Hiện sản phẩm" className="btn-action-direct"
                              style={{ backgroundColor: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: "8px", padding: "6px", cursor: "pointer" }}
                              onClick={() => { handleSelectProduct(prod); setTimeout(triggerUnhide, 100); }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="admin-pagination-row">
            <div className="admin-pagination-info">
              Hiển thị {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredProducts.length)} trong {filteredProducts.length} sản phẩm
            </div>
            <div className="admin-pagination-controls">
              <button className="btn-pagination-nav" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              {[...Array(totalPages).keys()].map((p) => (
                <button key={p + 1} className={`btn-pagination-page ${currentPage === p + 1 ? "active" : ""}`} onClick={() => setCurrentPage(p + 1)}>
                  {p + 1}
                </button>
              ))}
              <button className="btn-pagination-nav" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="admin-layout">
      <AdminSidebar activeItem="products" showToast={showToast} onProductsClick={() => { setSelectedProduct(null); setAiInsights(null); }} />

      <div className="admin-main-container">
        <AdminHeader
          searchQuery={searchQuery}
          setSearchQuery={(val) => { setSearchQuery(val); setCurrentPage(1); }}
          searchPlaceholder="Tìm kiếm sản phẩm..."
          showToast={showToast}
        />

        <main className="admin-page-body">
          {error && (
            <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fef3c7", color: "#b45309", padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
              ⚠️ {error}
            </div>
          )}

          {selectedProduct ? renderDetailView() : renderListView()}
        </main>
      </div>

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="confirm-modal-overlay" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
          <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <span className="confirm-modal-icon">{(confirmModal.actionType === "approve" || confirmModal.actionType === "bulk-approve") ? "✅" : (confirmModal.actionType === "reject" || confirmModal.actionType === "hide") ? "❌" : "✏️"}</span>
              <h3>{confirmModal.title}</h3>
            </div>
            <div className="confirm-modal-body">
              <p>{confirmModal.message}</p>
              {(confirmModal.actionType === "reject" || confirmModal.actionType === "hide") && (
                <textarea className="form-control" rows="4" placeholder={confirmModal.actionType === "reject" ? "Nhập lý do từ chối (bắt buộc)..." : "Nhập lý do ẩn sản phẩm (bắt buộc)..."}
                  value={confirmModal.reason} onChange={(e) => setConfirmModal({ ...confirmModal, reason: e.target.value })}
                  style={{ width: "100%", fontSize: "13px", marginTop: "12px", resize: "none" }} />
              )}
              {confirmModal.actionType === "request_changes" && (
                <textarea className="form-control" rows="4" placeholder="Nhập hướng dẫn nông dân sửa đổi (bắt buộc)..."
                  value={confirmModal.feedback} onChange={(e) => setConfirmModal({ ...confirmModal, feedback: e.target.value })}
                  style={{ width: "100%", fontSize: "13px", marginTop: "12px", resize: "none" }} />
              )}
            </div>
            <div className="confirm-modal-footer">
              <button className="btn-modal-cancel" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>Hủy bỏ</button>
              <button
                className={`btn-modal-confirm ${(confirmModal.actionType === "reject" || confirmModal.actionType === "hide") ? "delete" : confirmModal.actionType === "request_changes" ? "reset" : "toggle"}`}
                onClick={executeAction}
                disabled={((confirmModal.actionType === "reject" || confirmModal.actionType === "hide") && !confirmModal.reason.trim()) || (confirmModal.actionType === "request_changes" && !confirmModal.feedback.trim())}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="admin-toast-container">
          <div className="admin-toast">
            <div className="toast-message-content"><span>✅</span> {toastMessage}</div>
            <button className="toast-close-btn" onClick={() => setToastMessage("")}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductApproval;
