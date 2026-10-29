import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import Header from "../../components/common/Header/Header";
import Footer from "../../components/common/Footer/Footer";
import { getApprovedProductsPaged } from "../../services/productService";
import "./PreorderList.css";

// Sync categories with homepage
const MAIN_CATEGORIES = [
  "Cây lương thực",
  "Rau củ quả",
  "Trái cây",
  "Cây công nghiệp",
  "Chăn nuôi",
  "Giống cây trồng",
  "Nông sản chế biến",
  "Khác"
];

const VIETNAM_PROVINCES = [
  "Toàn quốc",
  "An Giang", "Bà Rịa - Vũng Tàu", "Bạc Liêu", "Bắc Giang", "Bắc Kạn", "Bắc Ninh", "Bến Tre", "Bình Dương", "Bình Định", "Bình Phước", "Bình Thuận", "Cà Mau", "Cao Bằng", "Cần Thơ", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lạng Sơn", "Lào Cai", "Lâm Đồng", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "TP. Hồ Chí Minh", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
];

const PREORDER_PRODUCTS_MOCK = [];

export default function PreorderList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState("");

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedProvince, setSelectedProvince] = useState("Toàn quốc");
  const [selectedMonths, setSelectedMonths] = useState([]); // Array of selected months
  const [sortBy, setSortBy] = useState("newest"); // "newest", "progress", "deadline"

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  const triggerToast = (message, type = "success") => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".filter-searchable-select")) {
        setShowProvinceDropdown(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const filteredProvinces = useMemo(() => {
    return VIETNAM_PROVINCES.filter((prov) =>
      prov.toLowerCase().includes(provinceSearch.toLowerCase())
    );
  }, [provinceSearch]);

  const handleSelectProvince = (prov) => {
    setSelectedProvince(prov);
    setProvinceSearch("");
    setShowProvinceDropdown(false);
  };

  useEffect(() => {
    const fetchPreorders = async () => {
      setLoading(true);
      try {
        const res = await getApprovedProductsPaged({ isPreorder: true, size: 50, sort: "newest" });
        const dbPreorders = res.content || [];

        const normalizedDb = dbPreorders.map((p) => {
          const remaining = p.stock || 0;
          const sold = p.sold || 0;
          const total = remaining + sold > 0 ? remaining + sold : 100;
          const pct = remaining === 0 ? 100 : Math.round((sold / total) * 100);

          return {
            id: p.id,
            name: p.name,
            category: p.category,
            farmerName: p.farmerName || "Nông trại địa phương",
            farmLocation: p.farmLocation?.split(",")[0] || "Lâm Đồng",
            price: p.price,
            unit: p.unit || "kg",
            imageUrl: p.imageUrl,
            progressPercent: pct,
            remainingQty: remaining,
            totalQty: total,
            harvestDate: p.harvestDate ? new Date(p.harvestDate).toLocaleDateString("vi-VN") : "Đang cập nhật",
            isPreorder: true,
            status: remaining === 0 ? "closed" : "open"
          };
        });

        setProducts(normalizedDb);
      } catch (err) {
        console.error("Lỗi khi load danh sách đặt trước:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPreorders();
  }, []);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category filter
        if (selectedCategory !== "ALL") {
          if (selectedCategory === "Khác") {
            return !MAIN_CATEGORIES.slice(0, 7).includes(p.category);
          }
          return p.category === selectedCategory;
        }
        return true;
      })
      .filter((p) => {
        // Location filter
        if (selectedProvince !== "Toàn quốc") {
          return p.farmLocation.toLowerCase().includes(selectedProvince.toLowerCase());
        }
        return true;
      })
      .filter((p) => {
        // Month filter (multi-select)
        if (selectedMonths.length > 0) {
          if (!p.harvestDate) return false;
          // Parse harvest date (format DD/MM/YYYY or YYYY-MM-DD)
          const parts = p.harvestDate.split("/");
          let m = null;
          if (parts.length === 3) {
            m = parseInt(parts[1], 10);
          } else {
            const dateObj = new Date(p.harvestDate);
            if (!isNaN(dateObj.getTime())) {
              m = dateObj.getMonth() + 1;
            }
          }
          return m !== null && selectedMonths.includes(m);
        }
        return true;
      })
      .sort((a, b) => {
        // Sort logic
        if (sortBy === "newest") {
          return String(b.id).localeCompare(String(a.id));
        }
        if (sortBy === "progress") {
          return b.progressPercent - a.progressPercent;
        }
        if (sortBy === "deadline") {
          return String(a.harvestDate).localeCompare(String(b.harvestDate));
        }
        return 0;
      });
  }, [products, selectedCategory, selectedProvince, selectedMonths, sortBy]);

  const handleNotifyMe = (productName, e) => {
    e.preventDefault();
    e.stopPropagation();
    triggerToast(`Đăng ký thành công! Bạn sẽ nhận được thông báo qua email khi sản phẩm "${productName}" mở bán.`, "success");
  };

  return (
    <div className="preorder-list-page">
      <Header activeTab="preorder" />

      {/* Hero Banner Section */}
      <section className="preorder-hero">
        <div className="preorder-hero-banner">
          <div className="preorder-hero-overlay"></div>
          <div className="preorder-hero-content">
            <h1 className="preorder-hero-title">Đặt Trước Nông Sản Mùa Vụ</h1>
            <p className="preorder-hero-subtitle">
              Nhận giá ưu đãi nhất trực tiếp từ nhà vườn. Đảm bảo nguồn cung tươi sạch, đúng vụ cho gia đình và doanh nghiệp.
            </p>
            <div className="preorder-hero-buttons">
              <a href="#preorder-section" className="hero-btn-primary">Xem các loại đang mở</a>
              <a href="#filter-bar" className="hero-btn-secondary">Lọc sản phẩm</a>
            </div>
          </div>
        </div>
      </section>

      {/* Filter and Selection Section */}
      <section id="filter-bar" className="preorder-filter-section">
        <div className="preorder-filter-container">
          <div className="filter-dropdown-group">
            <div className="filter-item">
              <label>Loại sản phẩm</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                <option value="ALL">Tất cả sản phẩm</option>
                {MAIN_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>Tỉnh / Thành phố</label>
              <div 
                className="filter-searchable-select" 
                style={{ 
                  position: "relative",
                  width: "100%",
                }}
              >
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Tìm hoặc chọn..."
                    value={showProvinceDropdown ? provinceSearch : selectedProvince}
                    onChange={(e) => {
                      setProvinceSearch(e.target.value);
                      setShowProvinceDropdown(true);
                    }}
                    onFocus={() => {
                      setShowProvinceDropdown(true);
                      setProvinceSearch("");
                    }}
                    className="filter-select"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      cursor: "text",
                      paddingRight: "30px"
                    }}
                  />
                  <span 
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "10px",
                      color: "#94A3B8",
                      pointerEvents: "none"
                    }}
                  >
                    ▼
                  </span>
                </div>

                {showProvinceDropdown && (
                  <div 
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      maxHeight: "260px",
                      overflowY: "auto",
                      backgroundColor: "#ffffff",
                      border: "1.5px solid #E2E8F0",
                      borderRadius: "8px",
                      marginTop: "6px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      zIndex: 999,
                      padding: "4px 0"
                    }}
                  >
                    {filteredProvinces.length === 0 ? (
                      <div style={{ padding: "10px 16px", color: "#64748B", fontSize: "14px" }}>
                        Không tìm thấy tỉnh thành
                      </div>
                    ) : (
                      filteredProvinces.map((prov) => (
                        <div
                          key={prov}
                          onClick={() => handleSelectProvince(prov)}
                          style={{
                            padding: "10px 16px",
                            fontSize: "14px",
                            fontWeight: selectedProvince === prov ? "700" : "500",
                            color: selectedProvince === prov ? "#16A34A" : "#1E293B",
                            backgroundColor: selectedProvince === prov ? "#F0FDF4" : "transparent",
                            cursor: "pointer",
                            transition: "background-color 0.15s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (selectedProvince !== prov) {
                              e.target.style.backgroundColor = "#F8FAFC";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedProvince !== prov) {
                              e.target.style.backgroundColor = "transparent";
                            }
                          }}
                        >
                          {prov}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="filter-months-group">
            <label className="months-label">Tháng thu hoạch</label>
            <div className="months-pills">
              <button
                className={`month-pill-btn ${selectedMonths.length === 0 ? "active" : ""}`}
                onClick={() => setSelectedMonths([])}
              >
                Tất cả
              </button>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                const isSelected = selectedMonths.includes(m);
                return (
                  <button
                    key={m}
                    className={`month-pill-btn ${isSelected ? "active" : ""}`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedMonths(selectedMonths.filter((x) => x !== m));
                      } else {
                        setSelectedMonths([...selectedMonths, m]);
                      }
                    }}
                  >
                    Tháng {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Preorder Products Grid Section */}
      <section id="preorder-section" className="preorder-products-section">
        <div className="preorder-products-header">
          <h2 className="preorder-section-title-text">Sản phẩm Đang Nhận Đặt Trước</h2>
          <div className="preorder-sort-container">
            <span className="sort-icon">⇅</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Sắp xếp: Mới nhất</option>
              <option value="progress">Sắp xếp: Đã đặt nhiều nhất</option>
              <option value="deadline">Sắp xếp: Hạn thu hoạch gần nhất</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="preorder-loading-box">
            <div className="loading-spinner"></div>
            <p>Đang tải danh sách đặt trước...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="preorder-empty-box">
            <p>Không tìm thấy nông sản đặt trước nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <div className="preorder-grid">
            {filteredProducts.map((p) => {
              const isClosed = p.status === "closed";
              const isUpcoming = p.status === "upcoming";
              const isOpen = p.status === "open";

              return (
                <div
                  key={p.id}
                  className={`preorder-item-card ${isClosed ? "closed-card" : ""}`}
                  onClick={() => {
                    if (!isClosed) {
                      navigate(`/products/${p.id}`);
                    }
                  }}
                >
                  {/* Image and Badges */}
                  <div className="card-image-container">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className={`preorder-card-img ${isClosed ? "greyscale-img" : ""}`}
                    />
                    {isClosed && (
                      <div className="card-sold-out-overlay">
                        <span className="sold-out-text-badge">Hết suất đặt</span>
                      </div>
                    )}

                    {/* Preorder Status Badge */}
                    {isOpen && (
                      <span className="preorder-status-badge status-open">Đang nhận đặt</span>
                    )}
                    {isUpcoming && (
                      <span className="preorder-status-badge status-upcoming">Sắp mở bán</span>
                    )}
                    {isClosed && (
                      <span className="preorder-status-badge status-closed">Hết suất đặt</span>
                    )}
                  </div>

                  {/* Body Info */}
                  <div className="card-info-body">
                    <h3 className="preorder-card-title-text">{p.name}</h3>
                    <p className="preorder-card-farmer">Nhà vườn: {p.farmerName}</p>

                    {/* Progress indicator */}
                    <div className="preorder-progress-wrapper" style={{ marginBottom: "12px" }}>
                      <div className="progress-labels" style={{ marginBottom: 0 }}>
                        <span className="progress-right" style={{ color: isClosed ? "#64748B" : "#16A34A" }}>
                          {isClosed ? "Hết hàng" : `Còn ${p.remainingQty} ${p.unit}`}
                        </span>
                      </div>
                    </div>

                    {/* Cost and Dates */}
                    <div className="preorder-meta-info">
                      <div className="meta-price-box">
                        <span className="price-label">
                          {isClosed ? "GIÁ ĐÃ BÁN" : "GIÁ DỰ KIẾN"}
                        </span>
                        <span className="price-value">
                          {p.price.toLocaleString("vi-VN")}đ
                          <span className="price-unit">/{p.unit}</span>
                        </span>
                      </div>

                      <div className="meta-date-box">
                        {isUpcoming ? (
                          <>
                            <span className="date-label">MỞ BÁN LÚC</span>
                            <span className="date-value">{p.openTime || "Đang cập nhật"}</span>
                          </>
                        ) : (
                          <>
                            <span className="date-label">THU HOẠCH</span>
                            <span className="date-value">{p.harvestDate}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="preorder-card-actions">
                      {isOpen && (
                        <button
                          type="button"
                          className="action-btn-preorder-now"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/products/${p.id}`);
                          }}
                        >
                          Đặt trước ngay
                        </button>
                      )}
                      {isUpcoming && (
                        <button
                          type="button"
                          className="action-btn-notify"
                          onClick={(e) => handleNotifyMe(p.name, e)}
                        >
                          Nhận thông báo
                        </button>
                      )}
                      {isClosed && (
                        <button type="button" className="action-btn-ended" disabled>
                          Đã kết thúc
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="preorder-view-more-container">
          <button
            type="button"
            className="view-more-preorders-btn"
            onClick={() => triggerToast("Bạn đang xem tất cả sản phẩm đặt trước có sẵn.", "info")}
          >
            Xem thêm nông sản khác
          </button>
        </div>
      </section>

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`custom-toast ${t.type}`}>
            <span className="custom-toast-icon" style={{ display: "inline-flex", alignItems: "center" }}>
              {t.type === "success" ? <CheckCircle2 size={16} /> : t.type === "error" ? <XCircle size={16} /> : <AlertTriangle size={16} />}
            </span>
            <span className="custom-toast-message">{t.message}</span>
            <button
              className="custom-toast-close"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <Footer />
    </div>
  );
}
