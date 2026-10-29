import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, ChevronRight, Edit2, Trash2, Plus, Filter, FileSpreadsheet, Layers, FolderPlus, Info } from "lucide-react";
import * as LucideIcons from "lucide-react";
import authService from "../../services/authService";
import AdminSidebar from "../../components/common/Sidebar/AdminSidebar";
import AdminHeader from "../../components/common/Header/AdminHeader";
import apiClient from "../../services/apiClient";
import "./AdminStyles.css";
import "./CategoryManagement.css";

const emojiToLucideMap = {
  "🥬": "Carrot",
  "🥗": "Leaf",
  "🥔": "Grape",
  "🍎": "Apple",
  "🍊": "Apple",
  "🍇": "Grape",
  "🌾": "Wheat",
  "🍚": "Wheat",
  "🌰": "Flower",
  "🍯": "Package",
  "🪴": "Trees",
  "🍖": "Egg",
  "🌱": "Sprout",
  "🥛": "Milk",
  "🍲": "Package"
};

const CategoryIcon = ({ name, size = 18 }) => {
  if (!name) return <LucideIcons.Leaf size={size} />;
  const resolvedName = emojiToLucideMap[name] || name;
  const IconComponent = LucideIcons[resolvedName];
  if (!IconComponent) {
    return <span style={{ fontSize: "16px", lineHeight: 1 }}>{name}</span>;
  }
  return <IconComponent size={size} />;
};

const CategoryManagement = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Debounce search input for low-spec devices
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Filter states
  const [filterLevel, setFilterLevel] = useState("All"); // "All" | "root" | "sub"
  const [filterStatus, setFilterStatus] = useState("All"); // "All" | "active" | "inactive"
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);

  // Expanded root categories IDs (tree structure)
  const [expandedIds, setExpandedIds] = useState([]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formParentId, setFormParentId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIcon, setFormIcon] = useState("🥬");
  const [formStatus, setFormStatus] = useState("active");
  const [formErrors, setFormErrors] = useState({});

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    category: null
  });

  // Inline Edit states (Farmer's inventory style)
  const [activeEditCategoryId, setActiveEditCategoryId] = useState(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [editDescriptionValue, setEditDescriptionValue] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Handle outside click to close edit drop-panel
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activeEditCategoryId && !e.target.closest(".category-actions-wrapper")) {
        setActiveEditCategoryId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [activeEditCategoryId]);

  // Preset Lucide icons for category icons (synchronized with agricultural theme)
  const iconPresets = ["Carrot", "Apple", "Wheat", "Trees", "Sprout", "Package", "Egg", "Leaf", "Grape", "Flower", "Droplet", "Milk"];

  const getFullImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
    return `${API_BASE_URL}/${cleanUrl}`;
  };

  const getInitialCategories = () => {
    const defaultCategories = [
      {
        id: 1,
        name: "Rau củ quả sạch",
        description: "Các loại rau xanh, củ quả tươi sạch thu hoạch từ vườn đạt chuẩn VietGAP",
        productCount: 156,
        icon: "Carrot",
        level: "root",
        parentId: null,
        status: "active"
      },
      {
        id: 11,
        name: "Rau ăn lá",
        description: "Rau muống, xà lách, cải ngọt, cải bó xôi tươi ngọt",
        productCount: 64,
        icon: "Leaf",
        level: "sub",
        parentId: 1,
        status: "active"
      },
      {
        id: 12,
        name: "Củ, quả tươi",
        description: "Khoai tây, cà rốt, củ cải, bí đỏ sáp ngon trọn vị",
        productCount: 92,
        icon: "Grape",
        level: "sub",
        parentId: 1,
        status: "active"
      },
      {
        id: 2,
        name: "Trái cây đặc sản",
        description: "Trái cây ngọt mát đặc sản các vùng miền Việt Nam và nhập khẩu",
        productCount: 324,
        icon: "Apple",
        level: "root",
        parentId: null,
        status: "active"
      },
      {
        id: 21,
        name: "Trái cây nội địa",
        description: "Cam sành Tiền Giang, bưởi da xanh, dâu tây Mộc Châu",
        productCount: 210,
        icon: "Apple",
        level: "sub",
        parentId: 2,
        status: "active"
      },
      {
        id: 22,
        name: "Trái cây nhập khẩu",
        description: "Táo Mỹ, nho Úc, cherry nhập khẩu chính ngạch (Tạm ngưng do vận chuyển)",
        productCount: 114,
        icon: "Grape",
        level: "sub",
        parentId: 2,
        status: "inactive"
      },
      {
        id: 3,
        name: "Ngũ cốc & Hạt khô",
        description: "Các loại gạo sạch, nếp, hạt ngũ cốc dinh dưỡng khô nguyên chất",
        productCount: 48,
        icon: "Wheat",
        level: "root",
        parentId: null,
        status: "active"
      },
      {
        id: 31,
        name: "Gạo & Nếp sạch",
        description: "Gạo ST25 ngon nhất thế giới, gạo lứt hữu cơ, nếp cái hoa vàng",
        productCount: 28,
        icon: "Wheat",
        level: "sub",
        parentId: 3,
        status: "active"
      },
      {
        id: 32,
        name: "Hạt dinh dưỡng",
        description: "Hạt điều rang muối, hạt macca Đắk Lắk, hạt óc chó Tây Nguyên",
        productCount: 20,
        icon: "Flower",
        level: "sub",
        parentId: 3,
        status: "active"
      },
      {
        id: 4,
        name: "Nông sản chế biến",
        description: "Mật ong rừng, tinh bột nghệ, hoa quả sấy dẻo đóng gói sẵn xuất khẩu",
        productCount: 54,
        icon: "Package",
        level: "root",
        parentId: null,
        status: "inactive"
      },
      {
        id: 5,
        name: "Dược liệu & Thảo mộc",
        description: "Trà thảo mộc thanh nhiệt, nấm linh chi, sâm dây Ngọc Linh chất lượng cao",
        productCount: 38,
        icon: "Trees",
        level: "root",
        parentId: null,
        status: "active"
      },
      {
        id: 6,
        name: "Chăn nuôi gia súc, gia cầm",
        description: "Thịt heo sinh học, trứng gà ta sạch, thịt bò tươi ngon nuôi hữu cơ",
        productCount: 72,
        icon: "Egg",
        level: "root",
        parentId: null,
        status: "inactive"
      },
      {
        id: 7,
        name: "Giống cây & Đất trồng",
        description: "Hạt giống rau hoa nhập khẩu chất lượng cao, đất sạch hữu cơ vi sinh",
        productCount: 18,
        icon: "Sprout",
        level: "root",
        parentId: null,
        status: "active"
      }
    ];

    const stored = localStorage.getItem("agri_categories");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (
          parsed.some(c => c.name.includes("Điện tử") || c.name.includes("Thủy sản") || c.name.includes("Thời trang") || c.name.includes("gia dụng")) ||
          parsed.some(c => ["🥬", "🍎", "🌾", "🪴", "🍖", "🌱", "🥗", "🥔", "🍊", "🍇", "🍚", "🌰", "🍯"].includes(c.icon))
        ) {
          localStorage.removeItem("agri_categories");
        } else {
          return parsed;
        }
      } catch (e) {
        console.error("Lỗi parse categories:", e);
      }
    }
    localStorage.setItem("agri_categories", JSON.stringify(defaultCategories));
    return defaultCategories;
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      // In a real setup, we might hit: const res = await apiClient.get("/api/admin/categories");
      // But since backend might not have this, we retrieve from local storage and mock API behavior.
      const response = await apiClient.get("/api/admin/categories");
      setCategories(response.data);
      localStorage.setItem("agri_categories", JSON.stringify(response.data));
    } catch (err) {
      console.warn("Categories API không khả dụng, sử dụng dữ liệu giả lập.");
      const localCats = getInitialCategories();
      setCategories(localCats);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Expand / Collapse sub-rows
  const toggleExpand = (id) => {
    if (expandedIds.includes(id)) {
      setExpandedIds(expandedIds.filter(x => x !== id));
    } else {
      setExpandedIds([...expandedIds, id]);
    }
  };

  // Filtering and Searching - Memory optimized with useMemo & debouncedSearch
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      const matchQuery =
        cat.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        cat.description.toLowerCase().includes(debouncedSearch.toLowerCase());

      if (!matchQuery) return false;
      if (filterLevel !== "All" && cat.level !== filterLevel) return false;
      if (filterStatus !== "All" && cat.status !== filterStatus) return false;
      return true;
    });
  }, [categories, debouncedSearch, filterLevel, filterStatus]);

  // Organize categories into tree structure for table rendering - Memoized
  const tableRows = useMemo(() => {
    const roots = filteredCategories.filter(c => c.level === "root" || c.parentId === null);
    const rows = [];

    roots.forEach(root => {
      rows.push(root);
      const isExpanded = expandedIds.includes(root.id);

      if (isExpanded) {
        const subs = categories.filter(c => c.parentId === root.id && c.level === "sub");
        subs.forEach(sub => {
          const matchQuery =
            sub.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            sub.description.toLowerCase().includes(debouncedSearch.toLowerCase());
          const matchStatus = filterStatus === "All" || sub.status === filterStatus;

          if (matchQuery && matchStatus && filterLevel !== "root") {
            rows.push(sub);
          }
        });
      }
    });

    if (filterLevel === "sub") {
      return filteredCategories.filter(c => c.level === "sub");
    }

    return rows;
  }, [filteredCategories, categories, expandedIds, debouncedSearch, filterLevel, filterStatus]);



  // Inline Edit logic (Farmer's inventory style)
  const toggleEditForm = (cat) => {
    if (activeEditCategoryId === cat.id) {
      setActiveEditCategoryId(null);
    } else {
      setActiveEditCategoryId(cat.id);
      setEditNameValue(cat.name);
      setEditDescriptionValue(cat.description);
    }
  };

  const handleSaveEdit = async (cat) => {
    if (!editNameValue.trim() || !editDescriptionValue.trim()) return;
    setSubmittingEdit(true);

    try {
      await apiClient.put(`/api/admin/categories/${cat.id}`, {
        name: editNameValue,
        description: editDescriptionValue,
        icon: cat.icon,
        level: cat.level,
        parentId: cat.parentId,
        status: cat.status
      });
      showToast(`Cập nhật danh mục "${editNameValue}" thành công.`);
      setActiveEditCategoryId(null);
      await fetchCategories();
    } catch (e) {
      console.error("Lỗi khi chỉnh sửa danh mục:", e);
      showToast("Lỗi kết nối máy chủ khi chỉnh sửa danh mục.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Open Modal
  const openModal = (mode, category = null) => {
    setModalMode(mode);
    setSelectedCategory(category);
    setFormErrors({});

    if (mode === "edit" && category) {
      setFormName(category.name);
      setFormParentId(category.parentId || "");
      setFormDescription(category.description);
      setFormIcon(category.icon || "🥬");
      setFormStatus(category.status || "active");
    } else {
      setFormName("");
      setFormParentId("");
      setFormDescription("");
      setFormIcon("🥬");
      setFormStatus("active");
    }

    setIsModalOpen(true);
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formName.trim()) {
      errors.name = "Vui lòng nhập tên danh mục.";
    }
    if (!formDescription.trim()) {
      errors.description = "Vui lòng nhập mô tả danh mục.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save changes (Create or Edit)
  const handleSaveCategory = async () => {
    if (!validateForm()) return;

    try {
      if (modalMode === "create") {
        const isSub = formParentId !== "";
        await apiClient.post("/api/admin/categories", {
          name: formName,
          description: formDescription,
          icon: formIcon,
          level: isSub ? "sub" : "root",
          parentId: isSub ? parseInt(formParentId) : null,
          status: formStatus
        });
        showToast(`Đã thêm danh mục mới "${formName}" thành công.`);
      } else if (modalMode === "edit" && selectedCategory) {
        const isSub = formParentId !== "";
        await apiClient.put(`/api/admin/categories/${selectedCategory.id}`, {
          name: formName,
          description: formDescription,
          icon: formIcon,
          level: isSub ? "sub" : "root",
          parentId: isSub ? parseInt(formParentId) : null,
          status: formStatus
        });
        showToast(`Đã cập nhật danh mục "${formName}" thành công.`);
      }
      setIsModalOpen(false);
      await fetchCategories();
    } catch (e) {
      console.error("Lỗi khi lưu danh mục:", e);
      showToast("Lỗi kết nối máy chủ khi lưu danh mục.");
    }
  };

  // Toggle category status directly
  const handleToggleStatus = async (category) => {
    const newStatus = category.status === "active" ? "inactive" : "active";
    try {
      await apiClient.put(`/api/admin/categories/${category.id}/status`, { status: newStatus });
      showToast(`Đã cập nhật trạng thái danh mục "${category.name}" thành: ${newStatus === 'active' ? 'Hoạt động' : 'Tạm khóa'}.`);
      await fetchCategories();
    } catch (e) {
      console.error("Lỗi khi cập nhật trạng thái:", e);
      showToast("Lỗi kết nối máy chủ khi cập nhật trạng thái.");
    }
  };

  // Delete category confirmation trigger
  const triggerDelete = (category) => {
    // Check if category has subcategories
    const hasSubs = categories.some(c => c.parentId === category.id);
    if (hasSubs) {
      alert(`Không thể xóa danh mục "${category.name}" vì có chứa các danh mục con. Hãy xóa hoặc chuyển các danh mục con trước.`);
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Xóa Danh mục Sản phẩm",
      message: `Bạn có chắc chắn muốn xóa danh mục "${category.name}"? Hành động này sẽ không thể khôi phục và ảnh hưởng tới các sản phẩm thuộc danh mục này.`,
      category
    });
  };

  // Execute delete category
  const executeDelete = async () => {
    const { category } = confirmModal;
    if (!category) return;

    try {
      await apiClient.delete(`/api/admin/categories/${category.id}`);
      showToast(`Đã xóa danh mục "${category.name}" khỏi hệ thống.`);
      setConfirmModal({ isOpen: false, title: "", message: "", category: null });
      await fetchCategories();
    } catch (e) {
      console.error("Lỗi khi xóa danh mục:", e);
      showToast("Lỗi kết nối máy chủ khi xóa danh mục.");
    }
  };

  // Count metrics for cards
  const totalRootCategories = categories.filter(c => c.level === "root" || c.parentId === null).length;
  const totalSubCategories = categories.filter(c => c.level === "sub").length;
  const totalProducts = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <AdminSidebar activeItem="categories" showToast={showToast} />

      {/* Main Panel */}
      <div className="admin-main-container">
        <AdminHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder="Tìm kiếm danh mục..."
          showToast={showToast}
        />

        {/* Page Body */}
        <main className="admin-page-body">
          {/* Breadcrumb & Title */}
          <div className="admin-page-title-row">
            <div className="admin-page-title-info">
              <div style={{ display: "flex", gap: "6px", fontSize: "13px", color: "var(--admin-text-muted)", marginBottom: "8px" }}>
                <span style={{ cursor: "pointer" }} onClick={() => navigate("/admin/users")}>Admin</span>
                <span>&gt;</span>
                <span style={{ color: "var(--admin-primary)", fontWeight: "600" }}>Danh mục sản phẩm</span>
              </div>
              <h2 style={{ fontSize: "28px", fontWeight: "800", color: "var(--admin-text-main)" }}>Quản lý Danh mục Sản phẩm</h2>
            </div>
            <div className="admin-page-actions">
              <button className="btn-admin-primary" style={{ padding: "10px 20px" }} onClick={() => openModal("create")}>
                <Plus size={16} style={{ strokeWidth: 3 }} />
                Thêm danh mục mới
              </button>
            </div>
          </div>

          {/* Top Info Statistics Widgets */}
          <div className="category-stats-grid">
            <div className="category-stat-card">
              <div className="category-stat-icon">
                <Layers size={22} />
              </div>
              <div className="category-stat-info">
                <h3>{totalRootCategories}</h3>
                <p>Danh mục gốc</p>
              </div>
            </div>
            <div className="category-stat-card">
              <div className="category-stat-icon">
                <FolderPlus size={22} />
              </div>
              <div className="category-stat-info">
                <h3>{totalSubCategories}</h3>
                <p>Danh mục con</p>
              </div>
            </div>
            <div className="category-stat-card">
              <div className="category-stat-icon">
                <Info size={22} />
              </div>
              <div className="category-stat-info">
                <h3>{totalProducts.toLocaleString()}</h3>
                <p>Tổng sản phẩm</p>
              </div>
            </div>
          </div>

          {/* Filter Sub-header card */}
          <div className="category-filter-card" style={{ marginBottom: "20px" }}>
            <div className="category-filter-left">
              <div style={{ position: "relative" }}>
                <button
                  className="btn-admin-outline"
                  onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
                >
                  <Filter size={15} />
                  Bộ lọc
                </button>

                {showFiltersDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      left: 0,
                      backgroundColor: "#fff",
                      border: "1px solid var(--admin-border)",
                      borderRadius: "10px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      padding: "16px",
                      zIndex: 200,
                      minWidth: "220px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px"
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#374151" }}>Phân cấp</label>
                      <select
                        className="form-control"
                        style={{ padding: "6px 10px", fontSize: "12.5px" }}
                        value={filterLevel}
                        onChange={(e) => { setFilterLevel(e.target.value); setShowFiltersDropdown(false); }}
                      >
                        <option value="All">Tất cả phân cấp</option>
                        <option value="root">Danh mục gốc</option>
                        <option value="sub">Danh mục con</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>


            </div>
            <div className="category-filter-right">
              Hiển thị {tableRows.length} danh mục
            </div>
          </div>

          {/* Categories Table Card */}
          <div className="admin-table-card">
            <div className="category-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}></th>
                    <th>TÊN DANH MỤC</th>
                    <th>MÔ TẢ</th>
                    <th>SỐ LƯỢNG SP</th>
                    <th>PHÂN CẤP</th>
                    <th style={{ textAlign: "right" }}>HÀNH ĐỘNG</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "var(--admin-text-muted)" }}>
                        Không có danh mục nào phù hợp với bộ lọc tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    tableRows.map((cat) => {
                      const isRoot = cat.level === "root" || cat.parentId === null;
                      const hasSubcategories = categories.some(c => c.parentId === cat.id);
                      const isExpanded = expandedIds.includes(cat.id);

                      return (
                        <tr
                          key={cat.id}
                          className={isRoot ? "" : "category-row-indent-1"}
                        >
                          <td>
                            {isRoot && hasSubcategories && (
                              <ChevronRight
                                size={18}
                                className={isExpanded ? "expanded" : ""}
                                onClick={() => toggleExpand(cat.id)}
                                style={{ cursor: "pointer", transition: "transform 0.2s" }}
                              />
                            )}
                          </td>
                          <td>
                            <div className="category-name-cell">
                              <span className="category-icon-box">
                                <CategoryIcon name={cat.icon} size={18} />
                              </span>
                              <span>{cat.name}</span>
                            </div>
                          </td>
                          <td style={{ maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {cat.description}
                          </td>
                          <td style={{ fontWeight: "700", color: "var(--admin-primary)" }}>
                            {cat.productCount} sản phẩm
                          </td>
                          <td>
                            <span className={`badge-level ${isRoot ? "root" : "sub"}`}>
                              {isRoot ? "Danh mục gốc" : "Danh mục con"}
                            </span>
                          </td>
                          <td>
                            <div className="category-actions-wrapper" onClick={(e) => e.stopPropagation()}>
                              <button
                                className={`btn-action-icon edit ${activeEditCategoryId === cat.id ? "active" : ""}`}
                                title="Chỉnh sửa nhanh"
                                onClick={() => toggleEditForm(cat)}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                className="btn-action-icon delete"
                                title="Xóa danh mục"
                                onClick={() => triggerDelete(cat)}
                              >
                                <Trash2 size={14} />
                              </button>

                              {activeEditCategoryId === cat.id && (
                                <div className="category-edit-drop-panel" onClick={(e) => e.stopPropagation()}>
                                  <strong>Chỉnh sửa nhanh</strong>
                                  <div>
                                    <label>Tên danh mục:</label>
                                    <input
                                      type="text"
                                      value={editNameValue}
                                      onChange={(e) => setEditNameValue(e.target.value)}
                                    />
                                  </div>
                                  <div style={{ marginTop: "8px" }}>
                                    <label>Mô tả:</label>
                                    <textarea
                                      value={editDescriptionValue}
                                      onChange={(e) => setEditDescriptionValue(e.target.value)}
                                      rows="3"
                                      style={{ resize: "vertical" }}
                                    />
                                  </div>
                                  <div className="stock-drop-footer">
                                    <button className="btn-panel-cancel" onClick={() => setActiveEditCategoryId(null)}>Hủy</button>
                                    <button
                                      className="btn-panel-save"
                                      disabled={submittingEdit || !editNameValue.trim() || !editDescriptionValue.trim()}
                                      onClick={() => handleSaveEdit(cat)}
                                    >
                                      {submittingEdit ? "Lưu..." : "Lưu"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Save Modal (Create / Edit) */}
      {isModalOpen && (
        <div className="category-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="category-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="category-modal-header">
              <h3>{modalMode === "create" ? "Thêm danh mục mới" : "Chỉnh sửa danh mục"}</h3>
              <button className="btn-modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <div className="category-modal-body">
              <div className="form-group">
                <label>Tên danh mục <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập tên danh mục (ví dụ: Trái cây nội địa)"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
                {formErrors.name && <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label>Danh mục cha (Cấp trên)</label>
                <select
                  className="form-control"
                  value={formParentId}
                  onChange={(e) => setFormParentId(e.target.value)}
                  disabled={modalMode === "edit" && categories.some(c => c.parentId === selectedCategory?.id)}
                >
                  <option value="">Danh mục gốc (Không có)</option>
                  {categories
                    .filter(c => (c.level === "root" || c.parentId === null) && (modalMode === "create" || c.id !== selectedCategory?.id))
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  }
                </select>
                {modalMode === "edit" && categories.some(c => c.parentId === selectedCategory?.id) && (
                  <span style={{ color: "var(--admin-text-muted)", fontSize: "11px", display: "block", marginTop: "4px" }}>
                    Không thể thay đổi vì danh mục này đang chứa danh mục con.
                  </span>
                )}
              </div>

              <div className="form-group">
                <label>Biểu tượng (Icon)</label>
                <div className="icon-select-grid">
                  {iconPresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      className={`icon-option-btn ${formIcon === preset ? "selected" : ""}`}
                      onClick={() => setFormIcon(preset)}
                      title={preset}
                      style={{ padding: "6px" }}
                    >
                      <CategoryIcon name={preset} size={20} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Mô tả <span style={{ color: "#ef4444" }}>*</span></label>
                <textarea
                  className="form-control"
                  placeholder="Nhập mô tả tóm tắt về loại danh mục..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
                {formErrors.description && <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{formErrors.description}</span>}
              </div>
            </div>

            <div className="category-modal-footer">
              <button className="btn-admin-outline" style={{ padding: "8px 16px" }} onClick={() => setIsModalOpen(false)}>
                Hủy bỏ
              </button>
              <button className="btn-admin-primary" style={{ padding: "8px 20px" }} onClick={handleSaveCategory}>
                Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="category-modal-overlay" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
          <div className="category-modal-content" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <div className="category-modal-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ef4444" }}>
                <span>⚠️</span> {confirmModal.title}
              </h3>
              <button className="btn-modal-close" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>×</button>
            </div>

            <div className="category-modal-body" style={{ padding: "20px 24px" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--admin-text-muted)", lineHeight: "1.6" }}>
                {confirmModal.message}
              </p>
            </div>

            <div className="category-modal-footer" style={{ borderTop: "none", backgroundColor: "#ffffff" }}>
              <button
                className="btn-admin-outline"
                style={{ padding: "8px 16px" }}
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
              >
                Hủy bỏ
              </button>
              <button
                className="btn-admin-danger"
                style={{ padding: "8px 20px" }}
                onClick={executeDelete}
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      {toastMessage && (
        <div className="admin-toast-container">
          <div className="admin-toast">
            <div className="toast-message-content">
              <span>✅</span> {toastMessage}
            </div>
            <button className="toast-close-btn" onClick={() => setToastMessage("")}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
