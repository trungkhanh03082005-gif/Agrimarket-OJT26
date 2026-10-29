import React, { useState, useEffect, useMemo } from "react";
import { MapPin, Calendar, Phone, Leaf, CheckCircle, Star as StarIcon, ShoppingCart, UserCheck, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "../../../components/common/Header/Header";
import Footer from "../../../components/common/Footer/Footer";
import profileService from "../../../services/profileService";
import { getAllApprovedProducts, getApprovedProductsPaged } from "../../../services/productService";
import wishlistService from "../../../services/wishlistService";
import apiClient from "../../../services/apiClient";
import chatLogo from "../../../assets/images/chat-logo.png";
import authService from "../../../services/authService";
import cartService from "../../../services/cartService";
import "./FarmerProfile.css";
import "../../Home/Home.css";

const formatDate = (dateString) => {
  if (!dateString) return "Chưa cập nhật";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateString;
  }
};

export default function FarmerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowed, setIsFollowed] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certModalImage, setCertModalImage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [activeLiveId, setActiveLiveId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [favorites, setFavorites] = useState([]);

  const triggerToast = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage("");
    }, 2500);
  };

  const toggleFavorite = async (productId, e) => {
    e.preventDefault();
    e.stopPropagation();
    const prodIdStr = String(productId);
    const isCurrentlyFavorite = favorites.map(String).includes(prodIdStr);
    setFavorites((prev) =>
      isCurrentlyFavorite
        ? prev.filter(id => String(id) !== prodIdStr)
        : [...prev, prodIdStr]
    );
    try {
      const res = await wishlistService.toggleWishlist(productId);
      const savedOnServer = res?.saved;
      if (savedOnServer !== undefined) {
        setFavorites((prev) => {
          const prevStr = prev.map(String);
          if (savedOnServer && !prevStr.includes(prodIdStr)) return [...prev, prodIdStr];
          if (!savedOnServer && prevStr.includes(prodIdStr)) return prev.filter(id => String(id) !== prodIdStr);
          return prev;
        });
      }
      triggerToast(res?.message || "Đã cập nhật danh sách yêu thích.", "success");
    } catch (err) {
      setFavorites((prev) =>
        isCurrentlyFavorite
          ? [...prev, prodIdStr]
          : prev.filter(id => String(id) !== prodIdStr)
      );
      triggerToast("Không thể cập nhật danh sách yêu thích.", "error");
    }
  };

  const handleAddToCart = async (product) => {
    try {
      triggerToast(`Đã thêm "${product.name}" vào giỏ hàng!`);
      window.dispatchEvent(new CustomEvent("cartUpdated"));

      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        // Logged in user: save to DB
        await cartService.addToCart(product.id, 1);
      } else {
        // Guest: save to localStorage
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
            farmerName: product.farmerName || farmer?.farmName
          });
        }

        localStorage.setItem(cartKey, JSON.stringify(currentCart));
      }
    } catch (err) {
      console.error("Lỗi khi thêm vào giỏ hàng:", err);
      triggerToast("Không thể thêm vào giỏ hàng. Vui lòng thử lại.", "error");
    }
  };

  // Load farmer details and products
  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      try {
        // 1. Fetch products from server filtered by farmerId
        const pagedResult = await getApprovedProductsPaged({ farmerId: id, size: 100 });
        const farmerProds = pagedResult.content || [];
        setProducts(farmerProds);

        // 2. Fetch specific farmer details from backend
        let farmerData = await profileService.getFarmerProfile(id);

        if (!farmerData && farmerProds.length > 0) {
          // Fallback 1: Extract farmer details from products
          const first = farmerProds[0];
          farmerData = {
            id: first.farmerId,
            fullName: first.farmerName,
            farmName: first.farmerName,
            farmAddress: first.farmLocation,
            description: first.farmDescription,
            avatarUrl: first.farmerAvatarUrl,
            vietgapUrl: first.farmerVietgapUrl,
            globalgapUrl: first.farmerGlobalgapUrl,
            organicUrl: first.farmerOrganicUrl,
            ratingAverage: first.rating || 4.8,
            reviewsCount: first.reviewsCount || 120,
            joinedDate: first.createdAt || first.created_at || "Tháng 3, 2021",
            responseRate: "88% (Thường trả lời trong 1h)"
          };
        }

        // Fallback 2: If no data found at all, check mock profiles
        if (!farmerData) {
          farmerData = MOCK_FARMERS[id] || MOCK_FARMERS["default"];
        }

        // Standardize properties
        const finalFarmer = {
          id: farmerData.id || id,
          fullName: farmerData.fullName || farmerData.farmName || "Nhà vườn AgriMarket",
          farmName: farmerData.farmName || farmerData.fullName || "Nông trại Xanh",
          avatarUrl: farmerData.avatarUrl || farmerData.farmerAvatarUrl || "",
          farmAddress: farmerData.farmAddress || farmerData.farmLocation || "Lâm Đồng, Việt Nam",
          description: farmerData.description || farmerData.farmDescription || "Chuyên canh các loại nông sản sạch theo tiêu chuẩn hữu cơ an toàn tự nhiên.",
          vietgapUrl: farmerData.vietgapUrl || "",
          globalgapUrl: farmerData.globalgapUrl || "",
          organicUrl: farmerData.organicUrl || "",
          ratingAverage: farmerData.ratingAverage || farmerData.rating || 4.8,
          reviewsCount: farmerData.reviewsCount || farmerData.totalReviews || 120,
          joinedDate: formatDate(farmerData.createdAt || farmerData.created_at || farmerData.joinedDate),
          responseRate: farmerData.responseRate || "88% (Thường trả lời trong 1h)"
        };

        setFarmer(finalFarmer);
        const followStatus = await wishlistService.isFarmerFollowed(finalFarmer.id);
        setIsFollowed(followStatus);

        // Load wishlist / favorites for current user
        try {
          const currentUser = authService.getCurrentUser();
          if (currentUser) {
            const ids = await wishlistService.getWishlistIds();
            setFavorites((ids || []).map(String));
          }
        } catch (wishErr) {
          console.warn("Failed to load wishlist in FarmerProfile:", wishErr);
        }

        // 3. Check if farmer has active livestream
        let foundLiveId = null;
        try {
          const liveRes = await apiClient.get("/api/livestreams/active");
          const activeStreams = liveRes.data;
          const currentActiveStream = activeStreams.find(
            (s) => String(s.farmerId) === String(id)
          );
          if (currentActiveStream) {
            foundLiveId = currentActiveStream.id;
          }
        } catch (liveErr) {
          console.error("Lỗi khi kiểm tra livestream hoạt động:", liveErr);
        }
        setActiveLiveId(foundLiveId);

        // If no products were found, populate with mock products for visual completeness
        if (farmerProds.length === 0) {
          setProducts(MOCK_PRODUCTS[id] || MOCK_PRODUCTS["default"]);
        }

      } catch (err) {
        console.error("Lỗi khi load dữ liệu hồ sơ nhà vườn:", err);
        setFarmer(MOCK_FARMERS["default"]);
        setProducts(MOCK_PRODUCTS["default"]);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [id]);

  const handleToggleFollow = async () => {
    if (!farmer) return;
    await wishlistService.toggleFollowFarmer(farmer);
    const followStatus = await wishlistService.isFarmerFollowed(farmer.id);
    setIsFollowed(followStatus);
  };

  const handleChat = () => {
    const event = new CustomEvent("open_agrimarket_chat", {
      detail: {
        farmId: farmer?.id || id,
        farmName: farmer?.farmName || farmer?.fullName || "Nông trại Xanh",
        farmAvatar: farmer?.avatarUrl || "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=150",
        phone: farmer?.phone || "0912 345 678",
        farmAddress: farmer?.farmAddress || "Đà Lạt, Lâm Đồng"
      }
    });
    window.dispatchEvent(event);
  };

  const handleReportFarmer = () => {
    if (!farmer) return;

    const searchParams = new URLSearchParams({
      targetType: "farmer",
      targetId: String(farmer.id || id),
      farmerName: farmer.farmName || farmer.fullName || "",
      farmerAddress: farmer.farmAddress || "",
      farmerAvatar: farmer.avatarUrl || "",
    });

    navigate(
      {
        pathname: "/support/report",
        search: `?${searchParams.toString()}`,
      },
      {
        state: {
          reportTarget: {
            targetType: "farmer",
            targetId: String(farmer.id || id),
            farmerName: farmer.farmName || farmer.fullName || "",
            farmerAddress: farmer.farmAddress || "",
            farmerAvatar: farmer.avatarUrl || "",
          },
        },
      }
    );
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: "user", text: userText }]);
    setChatInput("");

    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          sender: "farmer",
          text: `Cảm ơn bạn đã quan tâm! Tôi đã nhận được tin nhắn và sẽ liên hệ lại với bạn sớm nhất nhé.`
        }
      ]);
    }, 1200);
  };

  const getFullImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
    const host = apiBase.endsWith("/api") ? apiBase.substring(0, apiBase.length - 4) : apiBase;
    return `${host}${url}`;
  };

  const handleCertClick = (certType, url) => {
    const finalUrl = getFullImageUrl(url);
    let resolvedUrl = finalUrl;
    if (!finalUrl || url === "exists" || url === "") {
      const mockCertUrls = {
        organic: "https://images.unsplash.com/photo-1589330694653-ded6df53f7ec?w=1200&q=80",
        vietgap: "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=1200&q=80",
        globalgap: "https://images.unsplash.com/photo-1589330694653-ded6df53f7ec?w=1200&q=80"
      };
      resolvedUrl = mockCertUrls[certType] || mockCertUrls.organic;
    }
    setCertModalImage(resolvedUrl);
    setIsCertModalOpen(true);
  };

  if (loading) {
    return (
      <div className="farmer-profile-page-loading">
        <Header />
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>Đang tải thông tin nhà vườn...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="farmer-profile-page-error">
        <Header />
        <div className="error-container">
          <h2>Không tìm thấy thông tin nhà vườn</h2>
          <Link to="/" className="btn-back-home">Quay lại trang chủ</Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Format currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <div className="farmer-profile-page">
      <Header />

      {/* Breadcrumb Trail */}
      <div className="breadcrumb-container">
        <ul className="breadcrumbs">
          <li>
            <Link to="/">Trang chủ</Link>
            <span className="breadcrumb-separator">&gt;</span>
          </li>
          <li>
            <span>Nhà vườn</span>
            <span className="breadcrumb-separator">&gt;</span>
          </li>
          <li className="active">
            <span>{farmer.farmName}</span>
          </li>
        </ul>
      </div>

      <main className="farmer-profile-container">
        <div className="farmer-profile-grid">

          {/* Left Column: Sidebar Cards */}
          <aside className="farmer-sidebar">

            {/* Identity Card */}
            <div className="farmer-identity-card">
              <div
                className={`farmer-avatar-wrapper ${activeLiveId ? "is-live-broadcasting" : ""}`}
                onClick={activeLiveId ? () => navigate(`/livestream/${activeLiveId}`) : null}
                style={activeLiveId ? { cursor: "pointer" } : null}
                title={activeLiveId ? "Xem phiên livestream trực tiếp" : ""}
              >
                {farmer.avatarUrl ? (
                  <img src={farmer.avatarUrl} alt={farmer.farmName} className="farmer-avatar" />
                ) : (
                  <div className="farmer-avatar-placeholder">
                    {(farmer.farmName || "").charAt(0).toUpperCase()}
                  </div>
                )}
                {activeLiveId && (
                  <span className="live-avatar-badge">Live</span>
                )}
              </div>

              <h2 className="farmer-name-title">
                {farmer.farmName}
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" className="verified-tick-icon" title="Nhà vườn uy tín">
                  <circle cx="12" cy="12" r="10" fill="#0095F6" />
                  <polyline points="9 12 11 14 15 10" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </h2>

              <div className="farmer-sidebar-desc">
                {farmer.description || "Nhà vườn liên kết chuyên canh nông sản hữu cơ, đảm bảo an toàn sinh học và nguồn hàng tươi sạch mỗi ngày."}
              </div>

              <div className="sidebar-action-buttons">
                <button className="btn-chat-farmer" onClick={handleChat}>
                  Nhắn tin ngay
                </button>

                <div className="farmer-phone-info" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  <Phone size={14} /> Gọi điện: {farmer.phone || '0337 222 769'}
                </div>

                <button className={`btn-follow-farmer ${isFollowed ? "followed" : ""}`} onClick={handleToggleFollow}>
                  {isFollowed ? "Đang theo dõi" : "Theo dõi"}
                </button>
              </div>
            </div>

            {/* Info / Metadata Card */}
            <div className="farmer-info-card">
              <div className="info-row">
                <span className="info-icon" style={{ display: "inline-flex", alignItems: "center" }}><MapPin size={18} /></span>
                <div className="info-text">
                  <span className="info-label">Địa điểm</span>
                  <span className="info-value">{farmer.farmAddress}</span>
                </div>
              </div>

              <div className="info-row">
                <span className="info-icon" style={{ display: "inline-flex", alignItems: "center" }}><Calendar size={18} /></span>
                <div className="info-text">
                  <span className="info-label">Đã tham gia</span>
                  <span className="info-value">{farmer.joinedDate}</span>
                </div>
              </div>
            </div>

          </aside>

          {/* Right Column: Bio, Gallery, Products */}
          <section className="farmer-content">

            {/* Bio Card */}
            <div className="farmer-bio-card">
              <div className="content-section-title-row">
                <h3 className="content-section-title">Về nhà vườn</h3>
                <button type="button" className="report-farmer-btn" onClick={handleReportFarmer}>
                  Báo cáo
                </button>
              </div>
              <p className="farmer-description-text">{farmer.description}</p>

              <div className="certificates-badges-row">
                {farmer.organicUrl && (
                  <div
                    className="cert-pill organic clickable"
                    onClick={() => handleCertClick("organic", farmer.organicUrl)}
                    title="Click để xem chứng nhận Hữu cơ"
                  >
                    <span className="cert-dot" style={{ display: "inline-flex", alignItems: "center" }}><Leaf size={13} /></span>
                    <span>Chứng nhận Hữu cơ</span>
                  </div>
                )}
                {farmer.vietgapUrl && (
                  <div
                    className="cert-pill vietgap clickable"
                    onClick={() => handleCertClick("vietgap", farmer.vietgapUrl)}
                    title="Click để xem chứng nhận VietGAP"
                  >
                    <span className="cert-dot" style={{ display: "inline-flex", alignItems: "center" }}><CheckCircle size={13} /></span>
                    <span>Chứng nhận VietGAP</span>
                  </div>
                )}
                {farmer.globalgapUrl && (
                  <div
                    className="cert-pill globalgap clickable"
                    onClick={() => handleCertClick("globalgap", farmer.globalgapUrl)}
                    title="Click để xem chứng nhận GlobalGAP"
                  >
                    <span className="cert-dot" style={{ display: "inline-flex", alignItems: "center" }}><StarIcon size={13} /></span>
                    <span>Chứng nhận GlobalGAP</span>
                  </div>
                )}
              </div>
            </div>



            {/* Products Section */}
            <div className="farmer-products-section">
              <div className="products-section-header">
                <h3 className="content-section-title">Sản phẩm nổi bật</h3>
                <span className="products-count-link">Tất cả ({products.length})</span>
              </div>

              <div className="products-grid">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="new-product-card"
                    onClick={() => navigate(`/products/${p.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="new-card-img-wrapper">
                      <img src={p.imageUrl || p.thumbnailUrl} alt={p.name} className="new-card-img" />
                      {p.farmerVietgapUrl ? (
                        <span className="new-card-cert-tag vietgap-tag">VietGAP</span>
                      ) : p.farmerGlobalgapUrl ? (
                        <span className="new-card-cert-tag globalgap-tag">GlobalGAP</span>
                      ) : null}
                      <button
                        className={`new-card-favorite-btn ${favorites.map(String).includes(String(p.id)) ? "active" : ""}`}
                        aria-label="Yêu thích"
                        onClick={(e) => toggleFavorite(p.id, e)}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill={favorites.map(String).includes(String(p.id)) ? "#DC2626" : "none"}
                          stroke={favorites.map(String).includes(String(p.id)) ? "#DC2626" : "currentColor"}
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
                        <span className="new-card-category">{(p.categoryName || p.category || "Nông sản").toUpperCase()}</span>
                        <h3 className="new-card-title" title={p.name}>{p.name}</h3>



                        <div className="new-card-rating-sold-row">
                          <div className="new-card-rating">
                            <span className="star-gold">★</span>
                            <span className="rating-value">{p.rating ? p.rating.toFixed(1) : "0.0"}</span>
                            <span className="reviews-count">({p.reviewsCount || 0})</span>
                          </div>
                          <span className="new-card-sold">Đã bán {p.sold || "0"}</span>
                        </div>
                      </div>

                      <div className="new-card-price-cart-row">
                        <div className="new-card-price-col">
                          <span className="new-card-price">
                            {(p.price || 0).toLocaleString("vi-VN")}đ
                          </span>
                          <span className="price-unit"> / {p.unit || "kg"}</span>
                        </div>

                        <button
                          className="new-card-add-cart-btn"
                          aria-label="Thêm vào giỏ hàng"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(p);
                          }}
                        >
                          <ShoppingCart size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </section>

        </div>
      </main>

      <Footer />

      {/* Lightbox / Modal for certificates */}
      {isCertModalOpen && (
        <div className="cert-modal-backdrop" onClick={() => setIsCertModalOpen(false)}>
          <div className="cert-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="cert-modal-close-btn"
              onClick={() => setIsCertModalOpen(false)}
              aria-label="Đóng"
            >
              &times;
            </button>
            <img src={certModalImage} alt="Chứng nhận chất lượng" className="cert-modal-image" />
          </div>
        </div>
      )}

      {toastMessage && (
        <div className={`farmer-toast farmer-toast-${toastType}`}>
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            {toastType === "success" ? <CheckCircle2 size={16} /> : toastType === "error" ? <XCircle size={16} /> : <AlertTriangle size={16} />}
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}

// Fallback high-fidelity mockup farmers database
const MOCK_FARMERS = {
  "default": {
    fullName: "Thomas Miller",
    farmName: "Green Valley Organic Farms",
    avatarUrl: "https://images.unsplash.com/photo-1595273670150-db0a3e39843c?w=300", // High-quality image of farmer
    farmAddress: "Springfield, IL",
    description: "Tại Green Valley, chúng tôi tin rằng sự phát triển bền vững bắt đầu từ lòng đất mẹ. Trải qua hơn ba thế hệ, gia đình chúng tôi đã canh tác những mảnh ruộng màu mỡ tại Springfield hoàn toàn theo các phương pháp hữu cơ bền vững. Chúng tôi luôn kết hợp kinh nghiệm truyền thống của ông cha với công nghệ quản lý hiện đại để đảm bảo nông sản trao tận tay bạn luôn tươi ngon, an toàn và giàu dưỡng chất nhất.",
    vietgapUrl: "exists",
    organicUrl: "exists",
    globalgapUrl: "",
    ratingAverage: 4.9,
    reviewsCount: 128,
    joinedDate: "Tháng 3, 2021",
    responseRate: "88% (Thường phản hồi trong 1h)"
  }
};

// Fallback products database for visual showcase
const MOCK_PRODUCTS = {
  "default": [
    {
      id: "mock-2",
      name: "Cà rốt gia truyền hữu cơ",
      category: "Rau củ quả",
      price: 112500,
      unit: "bó",
      imageUrl: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600",
      farmerOrganicUrl: "exists",
    },
    {
      id: "mock-1",
      name: "Cà chua Heirloom hữu cơ",
      category: "Rau củ quả",
      price: 49900,
      unit: "kg",
      imageUrl: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600",
      farmerVietgapUrl: "exists",
    },
    {
      id: "mock-5",
      name: "Dâu tây sạch loại A",
      category: "Trái cây",
      price: 150000,
      unit: "hộp",
      imageUrl: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600",
      farmerOrganicUrl: "exists",
    }
  ]
};
