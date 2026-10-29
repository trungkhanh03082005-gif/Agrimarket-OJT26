import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Wheat,
  Carrot,
  Apple,
  Trees,
  Sprout,
  Package,
  Egg,
  Truck,
  UserCheck,
  ShieldCheck,
  Zap,
  ArrowRight,
  MapPin,
  Percent,
  Tag,
  Clock
} from "lucide-react";
import authService from "../../services/authService";
import profileService from "../../services/profileService";
import { getAllApprovedProducts, getApprovedProductsPaged, getFullImageUrl } from "../../services/productService";
import cartService from "../../services/cartService";
import apiClient from "../../services/apiClient";
import wishlistService from "../../services/wishlistService";
import "./Home.css";
import ProductCard from "../../components/common/ProductCard/ProductCard";
import Header from "../../components/common/Header/Header";
import Footer from "../../components/common/Footer/Footer";

// Import local images
import heroBanner from "./assets/hero_banner.png";

const MAIN_CATEGORIES = [
  { name: "Cây lương thực", icon: <Wheat size={20} /> },
  { name: "Rau củ quả", icon: <Carrot size={20} /> },
  { name: "Trái cây", icon: <Apple size={20} /> },
  { name: "Cây công nghiệp", icon: <Trees size={20} /> },
  { name: "Giống cây trồng", icon: <Sprout size={20} /> },
  { name: "Nông sản chế biến", icon: <Package size={20} /> },
  { name: "Chăn nuôi", icon: <Egg size={20} /> }
];

const MOCK_FARMS = [];

const DEFAULT_SLIDES = [
  {
    title: "Nông sản tươi sạch mỗi ngày",
    subtitle: "Khám phá những sản phẩm được yêu thích nhất tại AgriMarket với chất lượng hàng đầu.",
    tag: "SẢN PHẨM BÁN CHẠY",
    discount: "20%",
    imageUrl: heroBanner
  },
  {
    title: "Nông trại hữu cơ xanh",
    subtitle: "Nhà vườn đạt chuẩn GlobalGAP, VietGAP mang nông sản an toàn trực tiếp đến gia đình bạn.",
    tag: "ĐẠT CHUẨN QUỐC TẾ",
    discount: "15%",
    imageUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1000"
  },
  {
    title: "Mùa thu hoạch trúng lớn",
    subtitle: "Hàng ngàn sản phẩm trái cây và ngũ cốc tươi ngon vừa thu hoạch với giá siêu rẻ.",
    tag: "GIÁ SỐC HÔM NAY",
    discount: "30%",
    imageUrl: "https://images.unsplash.com/photo-1595855759920-86582396756a?w=1000"
  }
];

// Build hero slides: active/upcoming promotions (with images) first, then default slides
const buildHeroSlides = (promos = []) => {
  const promoSlides = (promos || [])
    .filter(p => (p.status === 'active' || p.status === 'upcoming') && p.image)
    .map(p => ({
      title: p.title,
      subtitle: p.description,
      tag: p.status === 'upcoming' ? 'SẮP BẮT ĐẦU' : 'ĐANG DIỄN RA',
      discount: p.discountType === 'percent' ? `${p.discountVal}%` : `${(p.discountVal / 1000).toFixed(0)}K`,
      imageUrl: p.image,
      promoId: p.id
    }));
  const combined = [...promoSlides, ...DEFAULT_SLIDES];
  return combined.slice(0, 3);
};

const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const Home = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState([]);
  const [activeFarms, setActiveFarms] = useState([]);
  const [activeLives, setActiveLives] = useState([]);
  const [selectedSort, setSelectedSort] = useState("popular");
  const [hasDefaultAddress, setHasDefaultAddress] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [activePromotions, setActivePromotions] = useState([]);
  const heroSlides = useMemo(() => buildHeroSlides(activePromotions), [activePromotions]);

  const formatPromoDate = (dateStr) => {
    if (!dateStr) return "Đang cập nhật";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Remaining time calculations for Flash Sale (countdown to end of day)
  const getRemainingTime = () => {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const diff = endOfDay.getTime() - now.getTime();

    const hours = Math.max(0, Math.floor((diff / (1000 * 60 * 60)) % 24));
    const minutes = Math.max(0, Math.floor((diff / 1000 / 60) % 60));
    const seconds = Math.max(0, Math.floor((diff / 1000) % 60));

    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0')
    };
  };

  const [timeLeft, setTimeLeft] = useState(getRemainingTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getRemainingTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-slide hero banner carousel
  useEffect(() => {
    if (heroSlides.length === 0) return;
    const timer = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [heroSlides]);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  const triggerToast = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3000);
  };

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

    const currentUser = authService.getCurrentUser();
    setUser(currentUser);

    const fetchProducts = async () => {
      setLoading(true);
      try {
        let freshUser = authService.getCurrentUser();
        if (freshUser) {
          try {
            const freshProfile = await profileService.getCurrentProfile();
            if (freshProfile) {
              freshUser = freshProfile;
              setUser(freshProfile);
            }
          } catch (profileErr) {
            console.warn("Failed to fetch fresh profile in Home:", profileErr);
          }
        }

        // Dùng server-side pagination để giới hạn dữ liệu, tải tối đa 100 sản phẩm cho trang chủ
        const pagedResult = await getApprovedProductsPaged({ page: 0, size: 100, sort: "popular" });
        const data = pagedResult.content;

        // Chỉ hiển thị sản phẩm preorder khi ngày hiện tại đã tới hoặc vượt quá ngày thu hoạch
        const todayStr = new Date().toISOString().split("T")[0];
        const visibleProducts = data.filter(p => {
          if (p.isPreorder) {
            if (!p.harvestDate) return false;
            return p.harvestDate <= todayStr;
          }
          return true;
        });

        setProducts(visibleProducts);

        // Extract active farms from products database data
        const uniqueFarmers = [];
        const seenFarmerIds = new Set();

        // Get user coordinates
        const defaultAddress = freshUser?.addresses?.find(addr => addr.isDefault) || null;
        const hasAddr = defaultAddress !== null && defaultAddress?.latitude !== undefined && defaultAddress?.latitude !== null && defaultAddress?.longitude !== undefined && defaultAddress?.longitude !== null;
        setHasDefaultAddress(hasAddr);

        const userLat = hasAddr ? Number(defaultAddress.latitude) : 10.762622;
        const userLon = hasAddr ? Number(defaultAddress.longitude) : 106.660172;

        for (const p of data) {
          if (p.farmerId && !seenFarmerIds.has(p.farmerId)) {
            seenFarmerIds.add(p.farmerId);

            // Calculate actual distance
            let distVal = null;
            let distanceStr = "";
            if (p.farmerLatitude !== null && p.farmerLongitude !== null) {
              distVal = getHaversineDistance(userLat, userLon, p.farmerLatitude, p.farmerLongitude);
            }

            if (distVal !== null) {
              distanceStr = `${distVal.toFixed(1)}km`;
            } else {
              // fallback random
              distVal = 2 + Math.random() * 8;
              distanceStr = `${distVal.toFixed(1)}km`;
            }

            // Build badges array from all certifications
            const farmBadges = [];
            if (p.farmerOrganicUrl) farmBadges.push({ label: "ORGANIC", color: "#16a34a" });
            if (p.farmerGlobalgapUrl) farmBadges.push({ label: "GLOBALGAP", color: "#2563eb" });
            if (p.farmerVietgapUrl) farmBadges.push({ label: "VIETGAP", color: "#d97706" });
            if (farmBadges.length === 0) farmBadges.push({ label: "VƯỜN AN TOÀN", color: "#6b7280" });

            uniqueFarmers.push({
              id: p.farmerId,
              name: p.farmerName || "Nhà vườn AgriMarket",
              distanceVal: distVal,
              distance: distanceStr,
              description: p.farmDescription || "Chuyên cung cấp các loại rau quả nông sản tươi ngon sạch đạt chuẩn.",
              badges: farmBadges,
              farmAddress: p.farmLocation || "",
              imageUrl: p.farmerAvatarUrl || "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600"
            });
          }
        }

        // Sort uniqueFarmers by distanceVal ascending (closest first)
        uniqueFarmers.sort((a, b) => a.distanceVal - b.distanceVal);

        const combinedFarms = [...uniqueFarmers];
        if (combinedFarms.length < 2) {
          const mockToAdd = MOCK_FARMS.filter(mf => !combinedFarms.some(cf => String(cf.id) === String(mf.id)));
          combinedFarms.push(...mockToAdd);
        }
        setActiveFarms(combinedFarms);

        // Fetch active livestreams from backend
        try {
          const liveRes = await apiClient.get("/api/livestreams/active");
          const livesData = Array.isArray(liveRes.data) ? liveRes.data : liveRes.data?.data || [];
          setActiveLives(livesData);
        } catch (liveErr) {
          console.error("Lỗi khi tải phiên livestream hoạt động:", liveErr);
          setActiveLives([]);
        }
      } catch (err) {
        console.error("Lỗi khi load sản phẩm trang chủ:", err);
        setProducts([]);
        setActiveFarms(MOCK_FARMS);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();

    const loadLocalCartCount = () => {
      const savedCart = JSON.parse(localStorage.getItem("agrimarket_cart")) || [];
      setCartItemsCount(savedCart.length);
    };

    const fetchCartCount = async () => {
      if (currentUser) {
        try {
          const cart = await cartService.getCart();
          setCartItemsCount(cart.length);
        } catch (err) {
          console.error("Lỗi khi load giỏ hàng:", err);
          loadLocalCartCount();
        }
      } else {
        loadLocalCartCount();
      }
    };

    fetchCartCount();

    const loadWishlist = async () => {
      try {
        const ids = await wishlistService.getWishlistIds();
        setFavorites(ids.map(id => String(id)));
      } catch (err) {
        console.error("Lỗi khi tải danh sách yêu thích:", err);
      }
    };
    loadWishlist();

    const handleWishlistUpdate = (e) => {
      const { productId, saved } = e.detail;
      const idStr = String(productId);
      setFavorites((prev) => {
        const prevStr = prev.map(String);
        if (saved) {
          if (!prevStr.includes(idStr)) {
            return [...prev, idStr];
          }
        } else {
          return prev.filter(id => String(id) !== idStr);
        }
        return prev;
      });
    };

    window.addEventListener("wishlistUpdated", handleWishlistUpdate);
    return () => {
      window.removeEventListener("wishlistUpdated", handleWishlistUpdate);
    };
  }, []);

  const handleAddToCart = async (p, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (p.stock === 0) {
      triggerToast(`Sản phẩm "${p.name}" đã hết hàng!`, "error");
      return;
    }

    if (user) {
      try {
        triggerToast(`Đã thêm 1 ${p.unit} "${p.name}" vào giỏ hàng!`, "success");
        const data = await cartService.addToCart(p.id, 1);
        setCartItemsCount(data.length);
        window.dispatchEvent(new Event("cartUpdated"));
      } catch (err) {
        console.error("Lỗi khi thêm vào giỏ hàng:", err);
        triggerToast("Không thể thêm vào giỏ hàng. Vui lòng thử lại!", "error");
      }
    } else {
      const cartKey = "agrimarket_cart";
      const currentCart = JSON.parse(localStorage.getItem(cartKey)) || [];
      const existingIndex = currentCart.findIndex(item => String(item.id) === String(p.id));

      if (existingIndex > -1) {
        const newQty = currentCart[existingIndex].quantity + 1;
        if (p.stock !== undefined && newQty > p.stock) {
          triggerToast(`Không thể thêm số lượng vượt quá tồn kho hiện có (${p.stock}).`, "error");
          return;
        }
        currentCart[existingIndex].quantity = newQty;
      } else {
        currentCart.push({
          id: p.id,
          name: p.name,
          price: p.price,
          unit: p.unit,
          imageUrl: p.imageUrl,
          quantity: 1,
          checked: true,
          stockQuantity: p.stock ?? 100,
          farmerId: p.farmerId || 1,
          farmerName: p.farmerName
        });
      }
      localStorage.setItem(cartKey, JSON.stringify(currentCart));
      setCartItemsCount(currentCart.length);
      window.dispatchEvent(new Event("cartUpdated"));
      triggerToast(`Đã thêm 1 ${p.unit} "${p.name}" vào giỏ hàng!`, "success");
    }
  };

  const toggleFavorite = async (productId, e) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic UI: update immediately, then sync with backend
    const prodIdStr = String(productId);
    const isCurrentlyFavorite = favorites.map(String).includes(prodIdStr);
    // Optimistically flip the heart
    setFavorites((prev) =>
      isCurrentlyFavorite
        ? prev.filter(id => String(id) !== prodIdStr)
        : [...prev, prodIdStr]
    );

    try {
      const res = await wishlistService.toggleWishlist(productId);
      // Confirm the real server state (res.saved is the authoritative answer)
      const savedOnServer = res?.saved;
      if (savedOnServer !== undefined) {
        setFavorites((prev) => {
          const prevStr = prev.map(String);
          if (savedOnServer && !prevStr.includes(prodIdStr)) {
            return [...prev, prodIdStr];
          } else if (!savedOnServer && prevStr.includes(prodIdStr)) {
            return prev.filter(id => String(id) !== prodIdStr);
          }
          return prev;
        });
      }
      triggerToast(res?.message || "Đã cập nhật danh sách yêu thích.", "success");
    } catch (err) {
      // Rollback optimistic update on error
      console.error("Lỗi khi cập nhật danh sách yêu thích:", err);
      setFavorites((prev) =>
        isCurrentlyFavorite
          ? [...prev, prodIdStr]
          : prev.filter(id => String(id) !== prodIdStr)
      );
      triggerToast("Không thể cập nhật danh sách yêu thích. Vui lòng thử lại sau!", "error");
    }
  };

  const filteredProducts = products.filter((product) => {
    // 1. Check search query match if present
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        product.name?.toLowerCase().includes(q) ||
        product.category?.toLowerCase().includes(q) ||
        product.farmerName?.toLowerCase().includes(q) ||
        product.description?.toLowerCase().includes(q);

      if (!matchesSearch) return false;
    }

    // 2. Check category match
    if (!selectedCategory) {
      return true;
    }
    const productCat = (product.category || "").toLowerCase();
    const selectedCat = selectedCategory.toLowerCase();

    if (selectedCat === "rau củ quả") {
      return productCat.includes("rau") || productCat.includes("củ") || productCat.includes("quả");
    }
    if (selectedCat === "trái cây") {
      return productCat.includes("trái") || productCat.includes("quả") || productCat.includes("fruit");
    }
    if (selectedCat === "gia cầm") {
      return productCat.includes("gia cầm") || productCat.includes("trứng") || productCat.includes("chicken") || productCat.includes("gà");
    }
    if (selectedCat === "cây lương thực") {
      return productCat.includes("lương thực") || productCat.includes("gạo") || productCat.includes("nếp") || productCat.includes("lúa");
    }
    if (selectedCat === "thủy hải sản") {
      return productCat.includes("thủy") || productCat.includes("hải sản") || productCat.includes("tôm") || productCat.includes("cá");
    }
    if (selectedCat === "phân bón") {
      return productCat.includes("phân bón");
    }
    if (selectedCat === "vận chuyển") {
      return productCat.includes("vận chuyển");
    }
    if (selectedCat === "thiết bị") {
      return productCat.includes("thiết bị") || productCat.includes("máy");
    }
    if (selectedCat === "cây công nghiệp") {
      return productCat.includes("cây công nghiệp") || productCat.includes("tiêu") || productCat.includes("điều") || productCat.includes("cà phê");
    }
    if (selectedCat === "chăn nuôi") {
      return productCat.includes("chăn nuôi") || productCat.includes("heo") || productCat.includes("bò") || productCat.includes("thịt");
    }
    if (selectedCat === "giống cây trồng") {
      return productCat.includes("giống") || productCat.includes("mầm");
    }
    if (selectedCat === "nông sản chế biến") {
      return productCat.includes("chế biến") || productCat.includes("sấy") || productCat.includes("mật ong");
    }
    return productCat === selectedCat;
  });

  if (selectedSort === "popular") {
    filteredProducts.sort((a, b) => (b.sold || 0) - (a.sold || 0));
  } else if (selectedSort === "rating") {
    filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  // Find any active promotion that applies to a product
// Only matches if the product's id is explicitly in promo.selectedProducts
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

  const renderProductCard = (p) => {
    const promo = getProductPromo(p);
    return (
      <ProductCard 
        key={p.id}
        product={p}
        promo={promo}
        isFavorite={favorites.map(String).includes(String(p.id))}
        onFavoriteClick={(product, e) => toggleFavorite(product.id, e)}
        onAddToCart={(product, e) => handleAddToCart(product, e)}
      />
    );
  };

  const getSoldPercent = (id) => {
    let hash = 0;
    const str = String(id);
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const sold = Math.abs(hash % 12) + 6; // between 6 and 17
    return { sold, percent: Math.round((sold / 20) * 100) };
  };

  const getFlashSaleProducts = () => {
    const list = [];
    const seenProductIds = new Set();
    
    const sortedPromos = [...activePromotions].sort((a, b) => {
      const valA = a.discountType === "percent" ? a.discountVal : 0;
      const valB = b.discountType === "percent" ? b.discountVal : 0;
      return valB - valA;
    });

    for (const promo of sortedPromos) {
      if (!promo.selectedProducts || promo.selectedProducts.length === 0) continue;
      
      const isPercent = promo.discountType?.toLowerCase() === "percent";
      const isAmount = promo.discountType?.toLowerCase() === "amount";
      
      if (!isPercent && !isAmount) continue;

      for (const prod of promo.selectedProducts) {
        if (seenProductIds.has(prod.id)) continue;
        seenProductIds.add(prod.id);

        let finalPrice = prod.price;
        if (isPercent) {
          finalPrice = prod.price * (1 - (promo.discountVal / 100));
        } else if (isAmount) {
          finalPrice = Math.max(0, prod.price - promo.discountVal);
        }

        list.push({
          id: prod.id,
          name: prod.name,
          price: finalPrice,
          oldPrice: prod.price,
          imageUrl: getFullImageUrl(prod.image),
          unit: prod.unit,
          promoCode: promo.code,
          promoTitle: promo.title
        });
      }
    }
    return list.slice(0, 4);
  };

  const displayFlashSale = getFlashSaleProducts();

  return (
    <div className="home-page">
      <Header activeTab="home" />

      <main className="home-main">
        {searchQuery && (
          <section className="search-feedback-section" style={{ marginBottom: "24px", padding: "16px 24px", backgroundColor: "#E8F5E9", borderRadius: "12px", border: "1px solid #C8E6C9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "15px", fontWeight: "600", color: "#1B5E20" }}>Kết quả tìm kiếm cho: </span>
              <strong style={{ fontSize: "16px", color: "#103314" }}>"{searchQuery}"</strong>
            </div>
            <button
              onClick={() => navigate("/")}
              style={{ background: "none", border: "none", color: "#1B5E20", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}
            >
              Xóa bộ lọc ×
            </button>
          </section>
        )}

        {/* Nhà vườn Promotions Section - Tạm thời ẩn */}
        {/* {activePromotions.length > 0 && ( ... )} */}

        {/* Hero Section Split Layout */}
        <section className="hero-section-split">
          {/* Left Large Banner */}
          <div className="hero-left-banner">
            {heroSlides.map((slide, idx) => (
              <div
                key={idx}
                className={`hero-slide-item ${idx === activeSlideIndex ? "active" : ""}`}
                style={{ backgroundImage: `url(${slide.imageUrl})` }}
              >
                <div className="hero-overlay"></div>

                <div className="hero-left-content">
                  <span className="hero-bestseller-badge">{slide.tag}</span>
                  <h1 className="hero-title">{slide.title}</h1>
                  <p className="hero-subtitle">{slide.subtitle}</p>
                  <button className="hero-buy-btn" onClick={() => navigate("/")}>
                    Mua ngay
                  </button>
                </div>

                {slide.discount && (
                  <div className="hero-discount-circle">
                    <span className="discount-tag">KHUYẾN MÃI</span>
                    <span className="discount-percent">{slide.discount}</span>
                    <span className="discount-sub">ƯU ĐÃI HẤP DẪN</span>
                  </div>
                )}
              </div>
            ))}

            <button
              className="hero-nav-arrow arrow-left"
              aria-label="Previous"
              onClick={() => setActiveSlideIndex(prev => (prev - 1 + heroSlides.length) % heroSlides.length)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button
              className="hero-nav-arrow arrow-right"
              aria-label="Next"
              onClick={() => setActiveSlideIndex(prev => (prev + 1) % heroSlides.length)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>

            <div className="hero-carousel-dots">
              {heroSlides.map((_, idx) => (
                <span
                  key={idx}
                  className={`carousel-dot ${idx === activeSlideIndex ? "active" : ""}`}
                  onClick={() => setActiveSlideIndex(idx)}
                ></span>
              ))}
            </div>
          </div>

          {/* Right Sub-banners Stack */}
          <div className="hero-right-banners">
            {/* Top Sub-banner */}
            <div className="hero-sub-banner top-sub-banner" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600)` }}>
              <div className="hero-sub-overlay"></div>
              <div className="hero-sub-content">
                <div className="hero-sub-header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sub-icon">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  <span>ƯU ĐÃI HÈ</span>
                </div>
                <h2 className="hero-sub-title">Sản phẩm đang giảm giá</h2>
                <p className="hero-sub-desc">Tiết kiệm lên đến 50% cho các mặt hàng thiết yếu</p>
              </div>
            </div>

            {/* Bottom Sub-banner */}
            <div className="hero-sub-banner bottom-sub-banner">
              <div className="hero-sub-content">
                <span className="hero-sub-tag">GIÁ SỐC</span>
                <h2 className="hero-sub-title">Sản phẩm giảm giá ưu đãi</h2>
                <div className="hero-sub-link-row" onClick={() => navigate("/products")} style={{ cursor: "pointer" }}>
                  <span>Xem danh sách</span>
                  <span className="sub-link-arrow" style={{ display: "inline-flex", alignItems: "center" }}><ArrowRight size={14} /></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value Proposition Grid (4 Columns) */}
        <section className="value-proposition-section">
          <div className="value-prop-grid">
            <div className="value-prop-card">
              <div className="value-prop-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
                <Sprout size={24} />
              </div>
              <div className="value-prop-info">
                <h4 className="value-prop-title">100% Nông sản sạch</h4>
                <p className="value-prop-desc">VietGAP, GlobalGAP & Hữu cơ tiêu chuẩn</p>
              </div>
            </div>
            <div className="value-prop-card">
              <div className="value-prop-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
                <Truck size={24} />
              </div>
              <div className="value-prop-info">
                <h4 className="value-prop-title">Giao nhanh siêu tốc 2h</h4>
                <p className="value-prop-desc">Bảo đảm tươi ngon nguyên bản đến nhà bạn</p>
              </div>
            </div>
            <div className="value-prop-card">
              <div className="value-prop-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
                <UserCheck size={24} />
              </div>
              <div className="value-prop-info">
                <h4 className="value-prop-title">Giá tận gốc từ vườn</h4>
                <p className="value-prop-desc">Không qua trung gian thương lái, mua trực tiếp</p>
              </div>
            </div>
            <div className="value-prop-card">
              <div className="value-prop-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
                <ShieldCheck size={24} />
              </div>
              <div className="value-prop-info">
                <h4 className="value-prop-title">Bảo đảm chất lượng</h4>
                <p className="value-prop-desc">Đổi trả 100% nếu có lỗi từ nhà vườn</p>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section (Original Emoji Pills Layout, without 'Khác', Grid 7col single-row) */}
        <section className="categories-section">
          <h2
            className="section-title"
            onClick={() => navigate("/products/listing")}
            style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
            title="Xem tất cả danh mục"
          >
            Danh mục <ArrowRight size={18} />
          </h2>
          <div className="categories-grid">
            {MAIN_CATEGORIES.map((cat) => (
              <div
                key={cat.name}
                className={`category-pill ${selectedCategory === cat.name ? "active" : ""}`}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  navigate(`/products/listing?category=${encodeURIComponent(cat.name)}`);
                }}
                style={{ cursor: "pointer" }}
              >
                <span className="category-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  {cat.icon}
                </span>
                <span className="category-name">{cat.name}</span>
              </div>
            ))}
          </div>
        </section>


        {/* Flash Sale Section */}
        {displayFlashSale.length > 0 && (
          <section className="flash-sale-section">
            <div className="flash-sale-header">
              <div className="flash-sale-title-box">
                <span className="flash-sale-icon" style={{ display: "inline-flex", alignItems: "center" }}><Zap size={20} /></span>
                <h2 className="flash-sale-title">GIỜ VÀNG GIÁ SỐC</h2>
                <div className="countdown-box">
                  <span className="countdown-number">{timeLeft.hours}</span>
                  <span className="countdown-colon">:</span>
                  <span className="countdown-number">{timeLeft.minutes}</span>
                  <span className="countdown-colon">:</span>
                  <span className="countdown-number">{timeLeft.seconds}</span>
                </div>
              </div>
              <button className="flash-sale-view-all" onClick={() => { setSelectedCategory("Rau củ quả"); document.querySelector(".categories-section")?.scrollIntoView({ behavior: "smooth" }); }}>
                Xem tất cả
              </button>
            </div>

            <div className="flash-sale-grid">
              {displayFlashSale.map((p) => {
                const discountPercent = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 25;
                const { sold, percent } = getSoldPercent(p.id);

                return (
                  <div key={p.id} className="flash-sale-card">
                    <Link to={`/products/${p.id}`} className="flash-card-link">
                      <div className="flash-card-img-wrapper">
                        <img src={p.imageUrl} alt={p.name} className="flash-card-img" />
                        <span className="flash-card-discount-tag">-{discountPercent}%</span>
                      </div>
                      <div className="flash-card-info">
                        <h3 className="flash-card-title">{p.name}</h3>
                        <div className="flash-card-price-row">
                          <span className="flash-card-price">{p.price.toLocaleString("vi-VN")}đ</span>
                          {p.oldPrice && (
                            <span className="flash-card-old-price">{p.oldPrice.toLocaleString("vi-VN")}đ</span>
                          )}
                        </div>
                        {/* Progress Bar */}
                        <div className="flash-progress-wrapper">
                          <div className="flash-progress-bar" style={{ width: `${percent}%` }}></div>
                          <span className="flash-progress-text">Đã bán {sold}</span>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Nông trại gần bạn Section (Synchronized with Database Farmers) */}
        <section className="new-farms-section">
          <div className="new-farms-header">
            <div>
              <h2 className="new-section-title">Nhà vườn gần bạn</h2>
            </div>
            {hasDefaultAddress && activeFarms.length >= 1 && (
              <button className="new-farms-map-btn" onClick={() => navigate("/farms")}>
                Bản đồ nông trại
              </button>
            )}
          </div>

          {hasDefaultAddress ? (
            activeFarms.length >= 1 ? (
              <div className="new-farms-grid" style={activeFarms.length === 1 ? { gridTemplateColumns: "1fr" } : {}}>
                {/* Wide Farm Card (activeFarms[0]) */}
                <div className="new-farm-card wide-farm-card">
                  <div className="farm-card-left-img" style={{ backgroundImage: `url(${activeFarms[0].imageUrl})` }}></div>
                  <div className="farm-card-right-info">
                    <div className="farm-card-meta">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
                        {(activeFarms[0].badges || [{ label: activeFarms[0].badge || "VƯỜN AN TOÀN", color: "#6b7280" }]).map(b => (
                          <span key={b.label} className="farm-badge-secure" style={{ backgroundColor: b.color + "18", color: b.color, borderColor: b.color + "40" }}>{b.label}</span>
                        ))}
                      </div>
                      <span className="farm-distance-tag" style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}><MapPin size={13} /> {activeFarms[0].distance}</span>
                    </div>
                    <h3 className="farm-card-title">{activeFarms[0].name}</h3>
                    <p className="farm-card-desc">{activeFarms[0].description}</p>
                    {activeFarms[0].farmAddress && (
                      <div className="farm-card-tags">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#6b7280" }}>
                          <MapPin size={11} />{activeFarms[0].farmAddress}
                        </span>
                      </div>
                    )}
                    <button className="farm-visit-btn" onClick={() => navigate(`/farmer-profile/${activeFarms[0].id}`)}>
                      Ghé thăm gian hàng
                    </button>
                  </div>
                </div>

                {/* Standard/Narrow Farm Card (activeFarms[1]) */}
                {activeFarms.length >= 2 && (
                  <div className="new-farm-card narrow-farm-card">
                    <div className="farm-card-top-img" style={{ backgroundImage: `url(${activeFarms[1].imageUrl})` }}></div>
                    <div className="farm-card-bottom-info">
                      <div className="farm-card-meta">
                        <h3 className="farm-card-title">{activeFarms[1].name}</h3>
                        <span className="farm-distance-tag" style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}><MapPin size={13} /> {activeFarms[1].distance}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
                        {(activeFarms[1].badges || [{ label: activeFarms[1].badge || "VƯỜN AN TOÀN", color: "#6b7280" }]).map(b => (
                          <span key={b.label} className="farm-badge-secure" style={{ backgroundColor: b.color + "18", color: b.color, borderColor: b.color + "40", fontSize: "10px" }}>{b.label}</span>
                        ))}
                      </div>
                      <p className="farm-card-desc">{activeFarms[1].description}</p>
                      {activeFarms[1].farmAddress && (
                        <p style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#6b7280", margin: "0 0 8px 0" }}>
                          <MapPin size={11} />{activeFarms[1].farmAddress}
                        </p>
                      )}
                      <button className="farm-visit-btn" onClick={() => navigate(`/farmer-profile/${activeFarms[1].id}`)}>
                        Xem sản phẩm
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-farms-state" style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280", border: "1px dashed #e5e7eb", borderRadius: "16px" }}>
                Không tìm thấy nhà vườn nào có sản phẩm được phê duyệt xung quanh bạn.
              </div>
            )
          ) : (
            <div className="farms-address-required-card" style={{
              background: "linear-gradient(135deg, rgba(240, 253, 244, 0.5) 0%, rgba(254, 243, 199, 0.3) 100%)",
              border: "1px dashed #10b981",
              borderRadius: "24px",
              padding: "48px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              boxShadow: "0 10px 30px -10px rgba(16, 185, 129, 0.08)",
              backdropFilter: "blur(8px)"
            }}>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                color: "#10b981",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "8px"
              }}>
                <MapPin size={28} />
              </div>
              <h3 style={{ fontSize: "20px", color: "#065f46", fontWeight: "700", margin: 0 }}>Định vị nhà vườn gần bạn</h3>
              <p style={{ fontSize: "14.5px", color: "#4b5563", maxWidth: "540px", margin: "0 auto 8px auto", lineHeight: "1.6" }}>
                {user ? "Bạn chưa thiết lập địa chỉ nhận hàng mặc định. Vui lòng cập nhật địa chỉ mặc định để chúng tôi định vị các nhà vườn gần bạn nhất." : "Vui lòng đăng nhập và thiết lập địa chỉ nhận hàng mặc định để tìm kiếm các nhà vườn gần vị trí của bạn nhất."}
              </p>
              <button
                onClick={() => navigate(user ? "/profile/edit" : "/login")}
                style={{
                  backgroundColor: "#10b981",
                  color: "#ffffff",
                  padding: "12px 28px",
                  borderRadius: "14px",
                  fontWeight: "600",
                  fontSize: "14px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#059669";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#10b981";
                  e.currentTarget.style.transform = "none";
                }}
              >
                {user ? "Cập nhật địa chỉ mặc định" : "Đăng nhập để cập nhật"}
              </button>
            </div>
          )}
        </section>

        {/* === ƯU ĐÃI ĐẶC BIỆT — above featured products === */}
        {activePromotions.length > 0 && (
          <section style={{ marginTop: '8px' }}>
            {/* Section Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Tag size={20} color="#dc2626" /> Ưu đãi đặc biệt đang diễn ra
              </h2>
              <span style={{ fontSize: '13px', color: '#6b7280', background: '#f3f4f6', padding: '3px 10px', borderRadius: '20px' }}>
                {activePromotions.length} chương trình
              </span>
            </div>

            {/* Cards Grid — 2 per row on desktop */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {activePromotions.map(promo => (
                <div
                  key={promo.id}
                  onClick={() => navigate(`/promotions/${promo.id}`)}
                  style={{
                    background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)',
                    border: '1px solid #fed7aa',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    boxShadow: '0 2px 12px rgba(251,146,60,0.1)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseOver={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 12px 28px rgba(251,146,60,0.25)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 12px rgba(251,146,60,0.1)'; }}
                >
                  <img 
                    src={promo.image || "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=400"} 
                    alt={promo.title} 
                    style={{ width: '120px', height: '100%', minHeight: '100px', objectFit: 'cover', flexShrink: 0 }} 
                  />
                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: '#dc2626', color: 'white', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
                        {promo.discountType === 'percent' ? `GIẢM ${promo.discountVal || 0}%` : `GIẢM ${((promo.discountVal || 0)/1000).toFixed(0)}K`}
                      </span>
                      <span style={{ 
                        background: (promo.status === 'ended' || (promo.endDate && new Date().toISOString().slice(0,10) > promo.endDate)) ? '#6b7280' : 
                                    (promo.status === 'upcoming' || (promo.startDate && new Date().toISOString().slice(0,10) < promo.startDate)) ? '#f59e0b' : '#10b981', 
                        color: 'white', 
                        borderRadius: '6px', 
                        padding: '3px 10px', 
                        fontSize: '11px', 
                        fontWeight: 600 
                      }}>
                        {(promo.status === 'ended' || (promo.endDate && new Date().toISOString().slice(0,10) > promo.endDate)) ? 'ĐÃ KẾT THÚC' : 
                         (promo.status === 'upcoming' || (promo.startDate && new Date().toISOString().slice(0,10) < promo.startDate)) ? 'SẮP BẮT ĐẦU' : 'ĐANG DIỄN RA'}
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: '#92400e', lineHeight: '1.3' }}>{promo.title}</h4>
                    <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>{promo.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#d97706' }}>
                        <Clock size={12} />
                        <span>Đến {formatPromoDate(promo.endDate)}</span>
                        {promo.maxUses > 0 && (
                          <span style={{ marginLeft: '6px', background: '#fef3c7', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px' }}>
                            Còn {promo.maxUses - (promo.usedCount||0)} lượt
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Xem ngay <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sản phẩm nổi bật Section */}
        <section className="new-featured-section">
          <div className="new-featured-header">
            <h2 className="new-section-title">Sản phẩm nổi bật {selectedCategory && `- ${selectedCategory}`}</h2>
            <div className="new-featured-filters">
              <button className="filter-icon-btn" aria-label="Filters">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              </button>
              <div className="sort-dropdown-container">
                <select
                  className="sort-select"
                  value={selectedSort}
                  onChange={(e) => {
                    setSelectedSort(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="popular">Mua nhiều nhất</option>
                  <option value="rating">Đánh giá cao nhất</option>
                </select>
              </div>
            </div>
          </div>

          <div className="new-products-grid">
            {loading ? (
              <div className="product-empty-state">Đang tải danh sách sản phẩm...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="product-empty-state">Chưa có sản phẩm nào thuộc danh mục này.</div>
            ) : (
              filteredProducts.slice((currentPage - 1) * 10, currentPage * 10).map((p) => renderProductCard(p))
            )}
          </div>

          {filteredProducts.length > 10 && (
            <div className="product-pagination">
              <button
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                  document.querySelector(".new-featured-section")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                &lt;
              </button>

              {(() => {
                const totalPages = Math.ceil(filteredProducts.length / 10);
                const pages = [];
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(
                    <button
                      key={i}
                      className={`pagination-btn ${currentPage === i ? "active" : ""}`}
                      onClick={() => {
                        setCurrentPage(i);
                        document.querySelector(".new-featured-section")?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      {i}
                    </button>
                  );
                }
                return pages;
              })()}

              <button
                className="pagination-btn"
                disabled={currentPage === Math.ceil(filteredProducts.length / 10)}
                onClick={() => {
                  const totalPages = Math.ceil(filteredProducts.length / 10);
                  setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  document.querySelector(".new-featured-section")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                &gt;
              </button>
            </div>
          )}
        </section>

        {/* Livestream Previews Section */}
        <section className="livestream-section">
          <div className="livestream-header">
            <div>
              <h2 className="livestream-title">Phiên Live Nhà Vườn</h2>
              <p className="livestream-subtitle">Theo dõi quy trình thu hoạch sạch trực tiếp tại nông trại</p>
            </div>
            <button className="livestream-view-all" onClick={() => navigate("/livestream")}>
              Xem tất cả phiên live
            </button>
          </div>

          <div className="livestream-grid">
            {activeLives.length > 0 ? (
              activeLives.slice(0, 3).map((live) => {
                const isLive = live.status === "active" || live.status === "live";
                const formatViewers = (count) => {
                  const c = Number(count || 0);
                  if (c >= 1000) return (c / 1000).toFixed(1) + "k người xem";
                  return `${c} người xem`;
                };

                return (
                  <div
                    className="livestream-card"
                    key={live.id}
                    onClick={() => navigate(`/livestream/${live.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <div
                      className="live-thumbnail"
                      style={{ backgroundImage: `url(${live.farmerAvatar || "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600"})` }}
                    >
                      <span className={`live-badge ${isLive ? "" : "upcoming"}`}>
                        {isLive ? "● LIVE" : "UPCOMING"}
                      </span>
                      {isLive && (
                        <span className="live-viewers">{formatViewers(live.viewersCount)}</span>
                      )}
                    </div>
                    <div className="live-info">
                      <div className="live-farmer">
                        <img
                          src={live.farmerAvatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80"}
                          alt={live.farmerBrand}
                          className="live-farmer-avatar"
                        />
                        <div className="live-farmer-details">
                          <h4 className="live-farmer-name">{live.farmerBrand || "Nhà vườn AgriMarket"}</h4>
                          <p className="live-farm-title">{live.farmerName || "Nhà vườn"}</p>
                        </div>
                      </div>
                      <h3 className="live-stream-headline">{live.title}</h3>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#666", fontSize: "15px", background: "#f8f9fa", borderRadius: "12px", border: "1px dashed #ddd" }}>
                Hiện chưa có phiên livestream nào đang diễn ra hoặc sắp bắt đầu.
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* Toast Notification */}
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
};

export default Home;
