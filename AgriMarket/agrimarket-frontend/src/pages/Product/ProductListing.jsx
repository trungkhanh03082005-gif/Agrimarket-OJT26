import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Check, Star, Sprout, UserCheck, Sparkles, Tag, ArrowDown, ArrowUp, Flame, Leaf, X } from "lucide-react";
import Header from "../../components/common/Header/Header";
import Footer from "../../components/common/Footer/Footer";
import { getApprovedProductsPaged } from "../../services/productService";
import authService from "../../services/authService";
import cartService from "../../services/cartService";
import wishlistService from "../../services/wishlistService";
import apiClient from "../../services/apiClient";
import "../Home/Home.css";
import "./ProductListing.css";

// ===============================
// MOCK DATA
// ===============================
// TODO BACKEND:
// Sau này xóa mockCategories và lấy danh mục từ API backend
const mockCategories = [
    "Trái cây",
    "Rau củ quả",
    "Cây lương thực",
    "Cây công nghiệp",
    "Chăn nuôi",
    "Giống cây trồng",
    "Nông sản chế biến",
    "Khác",
];

// TODO BACKEND:
// Sau này xóa mockProducts và lấy dữ liệu sản phẩm từ API backend
const mockProducts = [
    {
        id: 1,
        name: "Cam Sành Tiền Giang - Loại 1",
        category: "Trái cây",
        price: 32000,
        unit: "kg",
        rating: 4.8,
        sold: "1.2k",
        stockStatus: "Còn hàng",
        location: "Mỹ Tho, Tiền Giang",
        shopName: "Nông trại Sạch Miền Tây",
        image:
            "https://images.unsplash.com/photo-1547514701-42782101795e?q=80&w=1200&auto=format&fit=crop",
        badges: ["VIETGAP", "HỮU CƠ"],
    },
    {
        id: 2,
        name: "Bắp Cải Trắng Đà Lạt",
        category: "Rau củ quả",
        price: 18500,
        unit: "cái",
        rating: 4.9,
        sold: "780",
        stockStatus: "Còn hàng",
        location: "Đà Lạt, Lâm Đồng",
        shopName: "Farm Đà Lạt Green",
        image:
            "https://images.unsplash.com/photo-1615485925873-9c2b6a1f0e2f?q=80&w=1200&auto=format&fit=crop",
        badges: ["HỮU CƠ"],
    },
];

// TODO BACKEND:
// Sau này xóa mockLocations và lấy danh sách nơi bán từ backend
const mockLocations = [
    "Hồ Chí Minh",
    "Hà Nội",
    "Đà Nẵng",
    "Cần Thơ",
    "Lâm Đồng",
];

const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN").format(price);
};

const formatSold = (soldCount) => {
    const count = Number(soldCount || 0);
    if (count >= 1000) {
        return (count / 1000).toFixed(1) + "k";
    }
    return count.toString();
};

const normalizeLocation = (value) => value.trim().toLowerCase();

const formatCurrencyInput = (value) => {
    if (!value) return "";
    const digits = value.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
    if (!digits) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(digits));
};

const parseCurrencyInput = (value) => {
    if (!value) return null;
    const digits = value.replace(/[^\d]/g, "");
    if (!digits) return null;
    return Number(digits);
};

export default function ProductListing() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [wishlistIds, setWishlistIds] = useState(new Set());
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState("success");
    const [priceError, setPriceError] = useState("");

    const [selectedCategory, setSelectedCategory] = useState(() => {
        return searchParams.get("category") || "";
    });
    const [selectedSort, setSelectedSort] = useState("Phổ biến");
    const [isVietgapOnly, setIsVietgapOnly] = useState(false);
    const [selectedLocations, setSelectedLocations] = useState([]);
    const [locationQuery, setLocationQuery] = useState("");
    const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
    const [shopKeyword, setShopKeyword] = useState("");
    const [priceMinInput, setPriceMinInput] = useState("");
    const [priceMaxInput, setPriceMaxInput] = useState("");
    const [debouncedPriceMin, setDebouncedPriceMin] = useState(null);
    const [debouncedPriceMax, setDebouncedPriceMax] = useState(null);
    const [selectedRating, setSelectedRating] = useState(0);
    const [currentPage, setCurrentPage] = useState(1); // UI: 1-indexed
    const locationFilterRef = useRef(null);

    const itemsPerPage = 6;

    const [activePromotions, setActivePromotions] = useState([]);

    useEffect(() => {
        const fetchActivePromotions = async () => {
            try {
                const response = await apiClient.get('/api/admin/promotions');
                const now = new Date();
                const active = response.data.filter(p => {
                    const start = new Date(p.startDate);
                    const end = new Date(p.endDate);
                    return p.status === 'active' || (now >= start && now <= end);
                });
                setActivePromotions(active);
            } catch (err) {
                console.error("Lỗi khi tải danh sách khuyến mãi:", err);
            }
        };
        fetchActivePromotions();
    }, []);

    const getProductPromo = (product) => {
        return activePromotions.find(promo => {
            if (promo.status !== 'active') return false;
            const selected = promo.selectedProducts;
            if (!selected || selected.length === 0) return false;
            return selected.some(sp => String(sp.id) === String(product.id) || String(sp) === String(product.id));
        }) || null;
    };

    const calcDiscountedPrice = (price, promo) => {
        if (!promo) return price;
        if (promo.discountType === 'percent') return Math.round(price * (1 - promo.discountVal / 100));
        if (promo.discountType === 'amount') return Math.max(0, price - promo.discountVal);
        return price;
    };

    const triggerToast = (msg, type = "success") => {
        setToastMessage(msg);
        setToastType(type);
        setTimeout(() => {
            setToastMessage("");
        }, 2500);
    };

    const handleAddToCart = async (product) => {
        try {
            triggerToast(`Đã thêm "${product.name}" vào giỏ hàng!`);
            window.dispatchEvent(new CustomEvent("cartUpdated"));

            const currentUser = authService.getCurrentUser();
            if (currentUser) {
                await cartService.addToCart(product.id, 1);
            } else {
                const cartKey = "agrimarket_cart";
                const currentCart = JSON.parse(localStorage.getItem(cartKey)) || [];
                const existingIndex = currentCart.findIndex(
                    (item) => String(item.id) === String(product.id)
                );

                if (existingIndex >= 0) {
                    const newQty = currentCart[existingIndex].quantity + 1;
                    if (product.stock !== undefined && newQty > product.stock) {
                        triggerToast(`Không thể thêm số lượng vượt quá tồn kho hiện có (${product.stock}).`);
                        return;
                    }
                    currentCart[existingIndex].quantity = newQty;
                } else {
                    if (product.stock !== undefined && 1 > product.stock) {
                        triggerToast(`Không thể thêm số lượng vượt quá tồn kho hiện có (${product.stock}).`);
                        return;
                    }
                    currentCart.push({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        unit: product.unit,
                        imageUrl: product.imageUrl,
                        quantity: 1,
                        checked: true,
                        stockQuantity: product.stock,
                        farmerId: product.farmerId,
                        farmerName: product.farmerName
                    });
                }

                localStorage.setItem(cartKey, JSON.stringify(currentCart));
            }
        } catch (err) {
            console.error("Lỗi khi thêm vào giỏ hàng:", err);
            triggerToast("Không thể thêm vào giỏ hàng. Vui lòng thử lại.");
        }
    };

    const handleToggleWishlist = async (productId) => {
        try {
            const res = await wishlistService.toggleWishlist(productId);
            setWishlistIds((prev) => {
                const next = new Set(prev);
                if (next.has(String(productId))) {
                    next.delete(String(productId));
                } else {
                    next.add(String(productId));
                }
                return next;
            });
            triggerToast(res?.message || "Đã cập nhật danh sách yêu thích.");
        } catch (e) {
            console.error("Lỗi khi cập nhật yêu thích:", e);
            triggerToast("Vui lòng thử lại sau.");
        }
    };

    // Chuyển đổi selectedSort (UI label) sang sort key cho API
    const sortKeyMap = {
        "Phổ biến": "popular",
        "Mới nhất": "newest",
        "Bán chạy": "best_selling",
        "Giá tăng dần": "price_asc",
        "Giá giảm dần": "price_desc",
    };

    // Tải dữ liệu từ server mỗi khi filter/sort/page thay đổi
    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const searchQuery = searchParams.get("search") || undefined;
            const sortKey = sortKeyMap[selectedSort] || "popular";
            // Location: gộp các location đã chọn thành chuỗi (lấy cái đầu tiên, hoặc bỏ nếu multi)
            const location = selectedLocations.length === 1 ? selectedLocations[0] : undefined;

            const result = await getApprovedProductsPaged({
                page: currentPage - 1, // API 0-indexed
                size: itemsPerPage,
                sort: sortKey,
                category: selectedCategory || undefined,
                search: searchQuery,
                minPrice: debouncedPriceMin || undefined,
                maxPrice: debouncedPriceMax || undefined,
                location,
                shopKeyword: shopKeyword.trim() || undefined,
                minRating: selectedRating > 0 ? selectedRating : undefined,
            });

            setProducts(result.content);
            setTotalPages(result.totalPages || 1);
            setTotalElements(result.totalElements || 0);

            // Load wishlist ids
            const ids = await wishlistService.getWishlistIds();
            setWishlistIds(new Set(ids.map((id) => String(id))));
        } catch (err) {
            console.error("Lỗi khi tải sản phẩm:", err);
        } finally {
            setLoading(false);
        }
    }, [
        currentPage, selectedCategory, selectedSort, selectedLocations,
        shopKeyword, debouncedPriceMin, debouncedPriceMax, selectedRating, searchParams
    ]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);



    // Đồng bộ các bộ lọc từ URL params (locations, priceMin, priceMax, rating, category)
    useEffect(() => {
        const cat = searchParams.get("category") || "";
        setSelectedCategory(cat);

        const locs = searchParams.get("locations");
        setSelectedLocations(locs ? locs.split(",") : []);

        const minP = searchParams.get("priceMin");
        setPriceMinInput(minP || "");
        setDebouncedPriceMin(minP ? Number(minP) : null);

        const maxP = searchParams.get("priceMax");
        setPriceMaxInput(maxP || "");
        setDebouncedPriceMax(maxP ? Number(maxP) : null);

        const rating = searchParams.get("rating");
        setSelectedRating(Number(rating) || 0);

        setCurrentPage(1);
    }, [searchParams]);

    // Cuộn lên đầu trang khi thay đổi danh mục (với độ trễ nhỏ để tránh cơ chế tự động cuộn của trình duyệt)
    useEffect(() => {
        window.scrollTo(0, 0);
        const timer = setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);
        return () => clearTimeout(timer);
    }, [selectedCategory, searchParams]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (locationFilterRef.current && !locationFilterRef.current.contains(event.target)) {
                setIsLocationDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const applyPriceFilter = () => {
        const minVal = parseCurrencyInput(priceMinInput);
        const maxVal = parseCurrencyInput(priceMaxInput);

        if (minVal !== null && maxVal !== null && minVal > maxVal) {
            setPriceError("Giá kết thúc phải lớn hơn hoặc bằng giá bắt đầu");
            setDebouncedPriceMin(null);
            setDebouncedPriceMax(null);
        } else {
            setPriceError("");
            setDebouncedPriceMin(minVal);
            setDebouncedPriceMax(maxVal);
        }
        setCurrentPage(1);
    };

    const handlePriceKeyDown = (e) => {
        if (e.key === "Enter") {
            applyPriceFilter();
        }
    };

    // Lọc nông sản VietGAP / Organic nếu bật bộ lọc AI VietGAP
    const filteredProducts = isVietgapOnly
        ? products.filter((p) => {
            const text = `${p.name || ""} ${p.description || ""} ${p.category || ""}`.toLowerCase();
            return text.includes("vietgap") || text.includes("organic") || text.includes("hữu cơ") || text.includes("sạch") || text.includes("chuẩn") || text.includes("loại 1");
        })
        : products;

    // Sản phẩm hiển thị (Nếu bật lọc VietGAP mà 0 kết quả thì fallback an toàn hiển thị toàn bộ sản phẩm)
    const paginatedProducts = isVietgapOnly && filteredProducts.length === 0 ? products : filteredProducts;

    // locationsList dùng cho dropdown (dùng mockLocations vì đây là UI helper)
    const locationsList = mockLocations;

    const filteredLocationOptions = locationsList.filter((loc) => {
        if (!locationQuery) return true;
        return normalizeLocation(loc).includes(normalizeLocation(locationQuery));
    });

    const toggleLocation = (location) => {
        setSelectedLocations((current) => {
            const next = current.includes(location)
                ? current.filter((item) => item !== location)
                : [...current, location];
            setCurrentPage(1);
            return next;
        });
    };

    const removeLocation = (location) => {
        setSelectedLocations((current) => {
            const next = current.filter((item) => item !== location);
            setCurrentPage(1);
            return next;
        });
    };

    const clearAllLocations = () => {
        setSelectedLocations([]);
        setLocationQuery("");
        setIsLocationDropdownOpen(false);
        setCurrentPage(1);
    };



    return (
        <div className="product-page">
            {/* ================= HEADER ================= */}
            <Header />

            {/* ================= CONTENT ================= */}
            <main className="product-main">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="sidebar-card">
                        <h3 className="sidebar-title">☷ Tất Cả Danh Mục</h3>
                        <ul className="category-list">
                            <li>
                                <button
                                    className={`category-btn ${!selectedCategory ? "active" : ""}`}
                                    onClick={() => {
                                        setSelectedCategory("");
                                        setCurrentPage(1);
                                    }}
                                >
                                    Tất cả sản phẩm
                                </button>
                            </li>
                            {mockCategories.map((category) => (
                                <li key={category}>
                                    <button
                                        className={`category-btn ${selectedCategory === category ? "active" : ""
                                            }`}
                                        onClick={() => {
                                            setSelectedCategory(category);
                                            setCurrentPage(1);
                                        }}
                                    >
                                        {category}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="sidebar-card">
                        <h3 className="sidebar-title">🧪 Bộ Lọc Tìm Kiếm</h3>

                        <div className="filter-group">
                            <p className="filter-label">Nơi bán</p>
                            <div className="multi-select" ref={locationFilterRef}>
                                <div
                                    className={`multi-select-trigger ${isLocationDropdownOpen ? "open" : ""}`}
                                    onClick={() => setIsLocationDropdownOpen(true)}
                                >
                                    <div className="multi-select-values">
                                        {selectedLocations.length > 0 ? (
                                            selectedLocations.map((location) => (
                                                <span className="location-chip" key={location}>
                                                    <span className="location-chip-label">{location}</span>
                                                    <button
                                                        type="button"
                                                        className="location-chip-remove"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            removeLocation(location);
                                                        }}
                                                        aria-label={`Xóa ${location}`}
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))
                                        ) : (
                                            <span className="multi-select-placeholder">
                                                Tất cả nơi bán
                                            </span>
                                        )}
                                        <input
                                            type="text"
                                            className="multi-select-input"
                                            value={locationQuery}
                                            placeholder={selectedLocations.length > 0 ? "Thêm nơi bán..." : "Tìm nơi bán..."}
                                            onClick={(event) => event.stopPropagation()}
                                            onChange={(e) => {
                                                setLocationQuery(e.target.value);
                                                setIsLocationDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsLocationDropdownOpen(true)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Backspace" && !locationQuery && selectedLocations.length > 0) {
                                                    removeLocation(selectedLocations[selectedLocations.length - 1]);
                                                }
                                                if (event.key === "Escape") {
                                                    setIsLocationDropdownOpen(false);
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="multi-select-actions">
                                        {selectedLocations.length > 0 && (
                                            <button
                                                type="button"
                                                className="multi-select-clear"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    clearAllLocations();
                                                }}
                                                aria-label="Xóa toàn bộ nơi bán"
                                            >
                                                ×
                                            </button>
                                        )}
                                        <span className="multi-select-arrow">▾</span>
                                    </div>
                                </div>

                                {isLocationDropdownOpen && (
                                    <div className="multi-select-dropdown">
                                        <div className="multi-select-dropdown-header">
                                            <span>Chọn nhiều địa điểm</span>
                                            {selectedLocations.length > 0 && (
                                                <button
                                                    type="button"
                                                    className="multi-select-dropdown-clear"
                                                    onClick={clearAllLocations}
                                                >
                                                    Bỏ chọn hết
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            className={`multi-select-option ${selectedLocations.length === 0 ? "selected" : ""}`}
                                            onClick={clearAllLocations}
                                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                                        >
                                            <span className="multi-select-option-label">Tất cả nơi bán</span>
                                            <span className="multi-select-option-check" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                {selectedLocations.length === 0 ? <Check size={14} /> : ""}
                                            </span>
                                        </button>

                                        {filteredLocationOptions.map((location) => {
                                            const isSelected = selectedLocations.includes(location);
                                            return (
                                                <button
                                                    key={location}
                                                    type="button"
                                                    className={`multi-select-option ${isSelected ? "selected" : ""}`}
                                                    onClick={() => toggleLocation(location)}
                                                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                                                >
                                                    <span className="multi-select-option-label">{location}</span>
                                                    <span className="multi-select-option-check" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                        {isSelected ? <Check size={14} /> : ""}
                                                    </span>
                                                </button>
                                            );
                                        })}

                                        {filteredLocationOptions.length === 0 && (
                                            <div className="multi-select-empty">
                                                Không tìm thấy địa điểm phù hợp
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="filter-group">
                            <p className="filter-label">Tên cửa hàng</p>
                            <input
                                type="text"
                                className="filter-input"
                                placeholder="Tìm tên cửa hàng..."
                                value={shopKeyword}
                                onChange={(e) => {
                                    setShopKeyword(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>

                        <div className="filter-group">
                            <div className="filter-title-row">
                                <p className="filter-label filter-label-inline">Giá tiền</p>
                                {(priceMinInput || priceMaxInput) && (
                                    <button
                                        type="button"
                                        className="filter-clear-icon"
                                        onClick={() => {
                                            setPriceMinInput("");
                                            setPriceMaxInput("");
                                            setPriceError("");
                                            setDebouncedPriceMin(null);
                                            setDebouncedPriceMax(null);
                                            setCurrentPage(1);
                                        }}
                                        aria-label="Xóa bộ lọc giá"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <div className="price-range-row">
                                <div className="price-range-input-wrap">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        className={`price-range-input price-range-input-with-suffix ${priceError ? "price-range-input-error" : ""}`}
                                        placeholder="Từ"
                                        value={priceMinInput}
                                        onChange={(e) => {
                                            const formatted = formatCurrencyInput(e.target.value);
                                            setPriceMinInput(formatted);
                                        }}
                                        onKeyDown={handlePriceKeyDown}
                                    />
                                    <span className="price-range-currency">đ</span>
                                </div>
                                <span className="price-range-separator">-</span>
                                <div className="price-range-input-wrap">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        className={`price-range-input price-range-input-with-suffix ${priceError ? "price-range-input-error" : ""}`}
                                        placeholder="Đến"
                                        value={priceMaxInput}
                                        onChange={(e) => {
                                            const formatted = formatCurrencyInput(e.target.value);
                                            setPriceMaxInput(formatted);
                                        }}
                                        onKeyDown={handlePriceKeyDown}
                                    />
                                    <span className="price-range-currency">đ</span>
                                </div>
                            </div>
                            {priceError && (
                                <p className="price-error-message" style={{ color: "#ef4444", fontSize: "12px", marginTop: "6px", fontWeight: "500", display: "flex", alignItems: "center", gap: "4px" }}>
                                    ⚠️ {priceError}
                                </p>
                            )}
                        </div>

                        <div className="filter-group">
                            <p className="filter-label">Đánh giá</p>
                            {[5, 4, 3, 2, 1].map((star) => (
                                <button
                                    key={star}
                                    className={`rating-btn ${selectedRating === star ? "active" : ""}`}
                                    onClick={() => {
                                        setSelectedRating(selectedRating === star ? 0 : star);
                                        setCurrentPage(1);
                                    }}
                                >
                                    {"★".repeat(star)} <span>từ {star} sao</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Product area */}
                <section className="product-section">
                    {searchParams.get("isImageSearch") === "true" && (
                        <div className="image-search-active-banner-wrap">
                            <div className="image-search-active-banner">
                                <div className="banner-left">
                                    <Sparkles className="banner-icon" style={{ width: 18, height: 18 }} />
                                    <span className="banner-text">
                                        Bạn đang tìm bằng hình ảnh &bull; AI nhận diện: <strong>{searchParams.get("search") || "Nông sản"}</strong>
                                        {searchParams.get("category") && ` (${searchParams.get("category")})`}
                                    </span>
                                </div>
                                <button
                                    className="banner-clear-btn"
                                    onClick={() => {
                                        navigate("/");
                                    }}
                                >
                                    <X style={{ width: 14, height: 14 }} /> Xóa tìm kiếm ảnh
                                </button>
                            </div>

                            {/* Item 6: Post-Search AI Filters */}
                            <div className="post-search-filter-chips">
                                <span className="chips-label">Bộ lọc AI:</span>
                                <button
                                    className={`post-chip ${selectedSort === "Phổ biến" && !isVietgapOnly ? "active" : ""}`}
                                    onClick={() => {
                                        setSelectedSort("Phổ biến");
                                        setIsVietgapOnly(false);
                                    }}
                                >
                                    <Tag style={{ width: 14, height: 14 }} /> Tất cả
                                </button>
                                <button
                                    className={`post-chip ${selectedSort === "Giá tăng dần" ? "active" : ""}`}
                                    onClick={() => setSelectedSort("Giá tăng dần")}
                                >
                                    <ArrowDown style={{ width: 14, height: 14 }} /> Giá thấp nhất
                                </button>
                                <button
                                    className={`post-chip ${selectedSort === "Giá giảm dần" ? "active" : ""}`}
                                    onClick={() => setSelectedSort("Giá giảm dần")}
                                >
                                    <ArrowUp style={{ width: 14, height: 14 }} /> Giá cao nhất
                                </button>
                                <button
                                    className={`post-chip ${selectedSort === "Bán chạy" ? "active" : ""}`}
                                    onClick={() => setSelectedSort("Bán chạy")}
                                >
                                    <Flame style={{ width: 14, height: 14 }} /> Bán chạy
                                </button>
                                <button
                                    className={`post-chip ${isVietgapOnly ? "active" : ""}`}
                                    onClick={() => {
                                        const nextState = !isVietgapOnly;
                                        setIsVietgapOnly(nextState);
                                        triggerToast(nextState ? "Đã bật bộ lọc VietGAP / Organic!" : "Đã tắt bộ lọc VietGAP / Organic");
                                    }}
                                >
                                    <Leaf style={{ width: 14, height: 14 }} /> VietGAP / Organic
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="toolbar">
                        <div className="sort-group">
                            <span className="toolbar-label">Sắp xếp theo:</span>

                            <button
                                className={`sort-btn ${selectedSort === "Phổ biến" ? "active" : ""}`}
                                onClick={() => setSelectedSort("Phổ biến")}
                            >
                                Phổ biến
                            </button>

                            <button
                                className={`sort-btn ${selectedSort === "Mới nhất" ? "active" : ""}`}
                                onClick={() => setSelectedSort("Mới nhất")}
                            >
                                Mới nhất
                            </button>

                            <button
                                className={`sort-btn ${selectedSort === "Bán chạy" ? "active" : ""}`}
                                onClick={() => setSelectedSort("Bán chạy")}
                            >
                                Bán chạy
                            </button>

                            <select
                                className="price-select"
                                value={selectedSort}
                                onChange={(e) => setSelectedSort(e.target.value)}
                            >
                                <option value="Phổ biến">Giá</option>
                                <option value="Giá tăng dần">Giá tăng dần</option>
                                <option value="Giá giảm dần">Giá giảm dần</option>
                            </select>
                        </div>

                        <div className="toolbar-right">
                            <span className="result-count">
                                {totalElements > 0
                                    ? `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalElements)}`
                                    : "0"} của {totalElements} sản phẩm
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="pl-loading-container" style={{ minHeight: "350px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", padding: "40px" }}>
                            <div className="pl-spinner" />
                            <p style={{ marginTop: "12px", color: "var(--primary-color, #317a55)", fontWeight: "500" }}>Đang tải danh sách sản phẩm...</p>
                        </div>
                    ) : (
                        <>
                            <div className="product-grid">
                                {paginatedProducts.length > 0 ? (
                                    paginatedProducts.map((product) => {
                                        const promo = getProductPromo(product);
                                        const discountedPrice = promo ? calcDiscountedPrice(product.price, promo) : product.price;
                                        const discountLabel = promo
                                            ? (promo.discountType === 'percent' ? `-${promo.discountVal}%` : `-${(promo.discountVal / 1000).toFixed(0)}K`)
                                            : (product.saleTag || null);

                                        return (
                                            <div
                                                className="new-product-card"
                                                key={product.id}
                                                onClick={() => navigate(`/products/${product.id}`)}
                                                style={{ cursor: "pointer" }}
                                            >
                                                <div className="new-card-img-wrapper">
                                                    {product.imageUrl || product.image ? (
                                                        <img src={product.imageUrl || product.image} alt={product.name} className="new-card-img" />
                                                    ) : (
                                                        <div className="new-card-img-fallback" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#81c784" }}><Sprout size={32} /></div>
                                                    )}
                                                    {discountLabel && (
                                                        <span className={`new-card-sale-tag ${promo ? 'promo-badge' : ''}`}>{discountLabel}</span>
                                                    )}
                                                    {promo && (
                                                        <span className="new-card-promo-name">
                                                            🏷️ Khuyến mãi
                                                        </span>
                                                    )}

                                                    <button
                                                        className={`new-card-favorite-btn ${wishlistIds.has(String(product.id)) ? "active" : ""}`}
                                                        aria-label="Yêu thích"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleWishlist(product.id);
                                                        }}
                                                    >
                                                        <svg
                                                            width="15"
                                                            height="15"
                                                            viewBox="0 0 24 24"
                                                            fill={wishlistIds.has(String(product.id)) ? "#DC2626" : "none"}
                                                            stroke={wishlistIds.has(String(product.id)) ? "#DC2626" : "currentColor"}
                                                            strokeWidth="2.2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        >
                                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                <div className="new-card-body">
                                                    <div className="new-card-body-top">
                                                        <span className="new-card-category">{(product.category || "").toUpperCase()}</span>
                                                        <h3 className="new-card-title" title={product.name}>{product.name}</h3>

                                                        <div className="new-card-farm-row">
                                                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><UserCheck size={14} /> {product.farmerName || product.shopName || "Nhà vườn Agri"}</span>
                                                        </div>

                                                        <div className="new-card-rating-sold-row">
                                                            <div className="new-card-rating">
                                                                <span className="star-gold">★</span>
                                                                <span className="rating-value">{product.rating ? Number(product.rating).toFixed(1) : "0.0"}</span>
                                                                <span className="reviews-count">({product.reviewsCount || 0})</span>
                                                            </div>
                                                            <span className="new-card-sold">Đã bán {formatSold(product.sold)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="new-card-price-cart-row">
                                                        <div className="new-card-price-col">
                                                            <span className="new-card-price" style={promo ? { color: '#dc2626' } : {}}>
                                                                {discountedPrice.toLocaleString("vi-VN")}đ <span style={{ fontSize: "12px", fontWeight: "normal", color: "#666" }}>/ {product.unit}</span>
                                                            </span>
                                                            {promo ? (
                                                                <span className="new-card-old-price">
                                                                    {product.price.toLocaleString("vi-VN")}đ
                                                                </span>
                                                            ) : product.oldPrice ? (
                                                                <span className="new-card-old-price">
                                                                    {product.oldPrice.toLocaleString("vi-VN")}đ
                                                                </span>
                                                            ) : null}
                                                        </div>

                                                        <button
                                                            className="new-card-add-cart-btn"
                                                            aria-label="Thêm vào giỏ hàng"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAddToCart(product);
                                                            }}
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                                <circle cx="9" cy="21" r="1"></circle>
                                                                <circle cx="20" cy="21" r="1"></circle>
                                                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                                                <line x1="12" y1="10" x2="16" y2="10"></line>
                                                                <line x1="14" y1="8" x2="14" y2="12"></line>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="empty-state">
                                        Không tìm thấy sản phẩm phù hợp.
                                    </div>
                                )}

                                <div className="promo-card">
                                    <div className="promo-content">
                                        <h3>Miễn phí vận chuyển cho đơn từ 200k!</h3>
                                        <p>
                                            Áp dụng cho tất cả các sản phẩm rau củ quả trong tuần lễ nông sản sạch.
                                        </p>
                                        <button>Xem chi tiết →</button>
                                    </div>
                                </div>
                            </div>

                            {/* Pagination */}
                            <div className="pagination">
                                <button
                                    className="page-btn"
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                >
                                    ‹
                                </button>

                                {Array.from({ length: totalPages || 1 }).map((_, index) => {
                                    const page = index + 1;
                                    return (
                                        <button
                                            key={page}
                                            className={`page-btn ${currentPage === page ? "active" : ""}`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}

                                <button
                                    className="page-btn"
                                    onClick={() =>
                                        setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))
                                    }
                                >
                                    ›
                                </button>
                            </div>
                        </>
                    )}
                </section>
            </main>

            <Footer />

            {toastMessage && (
                <div className={`pl-toast pl-toast-${toastType}`}>
                    {toastType === "success" ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    ) : toastType === "error" ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    )}
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    );
}