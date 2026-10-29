// src/pages/Product/ProductDetail.jsx

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import cartService from "../../services/cartService";
import { getProductById, getAllApprovedProducts, getApprovedProductsPaged } from "../../services/productService";
import reviewService from "../../services/reviewService";
import NotificationBell from "../../components/common/NotificationBell/NotificationBell";
import wishlistService from "../../services/wishlistService";
import * as preorderService from "../../services/preorderService";
import orderService from "../../services/orderService";
import "./ProductDetail.css";
import "./PreorderCheckout.css";
import Header from "../../components/common/Header/Header";
import Footer from "../../components/common/Footer/Footer";
import { Leaf, Shield, Truck, Globe, Star, MapPin, Calendar, Hourglass, Award, Check, FileText, ChevronDown, MessageCircle, Plus, X, Tag, Package, User, Scale } from "lucide-react";
import PreorderProductDetail from "./PreorderProductDetail";

const parseDeliveryWindow = (windowStr) => {
  if (!windowStr) return { min: null, max: null };
  const regex = /(\d{2})\/(\d{2})(?:\/(\d{4}))?/g;
  const matches = [...windowStr.matchAll(regex)];
  if (matches.length >= 2) {
    const first = matches[0];
    const second = matches[1];
    
    const year2 = second[3] ? parseInt(second[3]) : 2026;
    const year1 = first[3] ? parseInt(first[3]) : year2;
    
    const minDate = new Date(year1, parseInt(first[2]) - 1, parseInt(first[1]));
    const maxDate = new Date(year2, parseInt(second[2]) - 1, parseInt(second[1]));
    
    return { min: minDate, max: maxDate };
  }
  return { min: null, max: null };
};

const InlineCalendar = ({ value, onChange, minDate, maxDate }) => {
  const parsedValue = value ? new Date(value) : new Date();
  
  const [viewMonth, setViewMonth] = useState(parsedValue.getMonth());
  const [viewYear, setViewYear] = useState(parsedValue.getFullYear());
  
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewMonth(d.getMonth());
        setViewYear(d.getFullYear());
      }
    }
  }, [value]);
  
  const months = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];
  
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (month, year) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };
  
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  
  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };
  
  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
  
  const calendarCells = [];
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push({ dayNum: null, dateObj: null, selectable: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(viewYear, viewMonth, d);
    
    let selectable = true;
    if (minDate) {
      const minCopy = new Date(minDate);
      minCopy.setHours(0,0,0,0);
      const dateCopy = new Date(dateObj);
      dateCopy.setHours(0,0,0,0);
      if (dateCopy < minCopy) selectable = false;
    }
    if (maxDate) {
      const maxCopy = new Date(maxDate);
      maxCopy.setHours(23,59,59,999);
      const dateCopy = new Date(dateObj);
      dateCopy.setHours(0,0,0,0);
      if (dateCopy > maxCopy) selectable = false;
    }
    
    calendarCells.push({ dayNum: d, dateObj, selectable });
  }
  
  const handleSelectDay = (cell) => {
    if (!cell.selectable) return;
    const y = cell.dateObj.getFullYear();
    const m = String(cell.dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(cell.dateObj.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
  };
  
  const isSelected = (cell) => {
    if (!cell.dateObj || !value) return false;
    const valDate = new Date(value);
    return cell.dateObj.getFullYear() === valDate.getFullYear() &&
           cell.dateObj.getMonth() === valDate.getMonth() &&
           cell.dateObj.getDate() === valDate.getDate();
  };
  
  return (
    <div className="custom-inline-calendar">
      <div className="calendar-header">
        <button type="button" onClick={handlePrevMonth} className="calendar-nav-btn">&lt;</button>
        <span className="calendar-title">{months[viewMonth]} {viewYear}</span>
        <button type="button" onClick={handleNextMonth} className="calendar-nav-btn">&gt;</button>
      </div>
      <div className="calendar-weekdays">
        <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
      </div>
      <div className="calendar-grid">
        {calendarCells.map((cell, idx) => {
          if (cell.dayNum === null) {
            return <div key={`empty-${idx}`} className="calendar-cell empty"></div>;
          }
          
          let cellClass = "calendar-cell day";
          if (!cell.selectable) {
            cellClass += " disabled";
          } else if (isSelected(cell)) {
            cellClass += " selected";
          }
          
          return (
            <div 
              key={`day-${cell.dayNum}`} 
              className={cellClass}
              onClick={() => handleSelectDay(cell)}
            >
              {cell.dayNum}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleReportProduct = () => {
    if (!product) return;

    const searchParams = new URLSearchParams({
      targetType: "product",
      targetId: String(product.id ?? id),
      productName: product.name || "",
      productCategory: product.category || "",
      farmerName: product.farmerName || "",
    });

    if (product.price !== undefined && product.price !== null) {
      searchParams.set("productPrice", String(product.price));
    }

    navigate(
      {
        pathname: "/support/report",
        search: `?${searchParams.toString()}`,
      },
      {
        state: {
          reportTarget: {
            targetType: "product",
            targetId: String(product.id ?? id),
            productName: product.name || "",
            productCategory: product.category || "",
            farmerName: product.farmerName || "",
            productPrice: product.price ?? null,
          },
        },
      }
    );
  };

  // Header / Auth States
  const [user, setUser] = useState(null);

  // Product Detail States
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState("");
  const [brokenImages, setBrokenImages] = useState({});
  const [mainImageError, setMainImageError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  const [savedRelatedIds, setSavedRelatedIds] = useState(new Set());
  const [isFarmerFollowed, setIsFarmerFollowed] = useState(false);
  const [preorderDeliveryDate, setPreorderDeliveryDate] = useState("2026-10-22");
  
  // Preorder checkout sync states
  const [deliveryMode, setDeliveryMode] = useState("shipping"); // 'shipping' or 'pickup'
  const [customDate, setCustomDate] = useState("2026-09-01");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [placedPreorderId, setPlacedPreorderId] = useState(null);

  const formatDateString = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  };

  const parsedLimits = useMemo(() => {
    if (!product) return { min: null, max: null };
    
    let minDate = new Date();
    if (product.harvestDate) {
      const parts = product.harvestDate.split("-");
      if (parts.length === 3) {
        minDate = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        const partsSlash = product.harvestDate.split("/");
        if (partsSlash.length === 3) {
          minDate = new Date(partsSlash[2], partsSlash[1] - 1, partsSlash[0]);
        } else {
          const d = new Date(product.harvestDate);
          if (!isNaN(d.getTime())) {
            minDate = d;
          }
        }
      }
    }
    minDate.setHours(0,0,0,0);

    let maxDate = null;
    if (product.expirationDate) {
      const parts = product.expirationDate.split("-");
      if (parts.length === 3) {
        maxDate = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        const partsSlash = product.expirationDate.split("/");
        if (partsSlash.length === 3) {
          maxDate = new Date(partsSlash[2], partsSlash[1] - 1, partsSlash[0]);
        } else {
          const d = new Date(product.expirationDate);
          if (!isNaN(d.getTime())) {
            maxDate = d;
          }
        }
      }
      if (maxDate) {
        maxDate.setHours(23,59,59,999);
      }
    }

    if (!maxDate) {
      const fallbackMax = new Date(minDate);
      fallbackMax.setFullYear(fallbackMax.getFullYear() + 1);
      maxDate = fallbackMax;
    }

    return { min: minDate, max: maxDate };
  }, [product]);

  useEffect(() => {
    if (product && product.isPreorder) {
      if (product.harvestDate) {
        const parts = product.harvestDate.split("/");
        if (parts.length === 3) {
          const d = new Date(parts[2], parts[1] - 1, parts[0]);
          d.setDate(d.getDate() + 2);
          const dateStr = d.toISOString().split("T")[0];
          setPreorderDeliveryDate(dateStr);
          setCustomDate(dateStr);
        } else {
          const d = new Date(product.harvestDate);
          if (!isNaN(d.getTime())) {
            d.setDate(d.getDate() + 2);
            const dateStr = d.toISOString().split("T")[0];
            setPreorderDeliveryDate(dateStr);
            setCustomDate(dateStr);
          }
        }
      }
    }
  }, [product]);

  // Lightbox Modal States
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    setMainImageError(false);
  }, [activeImage]);

  // Related Products
  const [relatedProducts, setRelatedProducts] = useState([]);

  // Toast notifications state
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  // Shipping location state
  const [selectedCity, setSelectedCity] = useState("TP. Hồ Chí Minh");
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [activeFaq, setActiveFaq] = useState(null);
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Reviews and Rating states
  const [reviewsList, setReviewsList] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [attachedImages, setAttachedImages] = useState([]);
  const [attachedVideo, setAttachedVideo] = useState(null);

  const VIETNAM_CITIES = useMemo(() => [
    { name: "TP. Hồ Chí Minh", region: "South" },
    { name: "Hà Nội", region: "North" },
    { name: "Đà Nẵng", region: "Central" },
    { name: "Lâm Đồng", region: "Central" },
    { name: "Cần Thơ", region: "South" },
    { name: "Hải Phòng", region: "North" },
    { name: "Hưng Yên", region: "North" },
    { name: "Gia Lai", region: "Central" },
    { name: "Khánh Hòa", region: "Central" },
    { name: "Tiền Giang", region: "South" },
    { name: "Điện Biên", region: "North" }
  ], []);

  const shippingInfo = useMemo(() => {
    if (!product) return null;
    const origin = product.farmLocation || "Lâm Đồng";

    // Normalize location checking
    const isLocal = origin.toLowerCase().includes(selectedCity.toLowerCase()) ||
      (selectedCity === "Lâm Đồng" && origin.toLowerCase().includes("đà lạt"));

    if (isLocal) {
      return {
        method: "Vận chuyển hỏa tốc",
        time: "Giao nhận trong đúng 2 giờ",
        fee: 15000
      };
    }

    // Check zones
    const originRegion = origin.toLowerCase().includes("lâm đồng") ||
      origin.toLowerCase().includes("đà lạt") ||
      origin.toLowerCase().includes("gia lai") ||
      origin.toLowerCase().includes("khánh hòa") ? "Central" :
      origin.toLowerCase().includes("hưng yên") ||
        origin.toLowerCase().includes("điện biên") ||
        origin.toLowerCase().includes("hà nội") ||
        origin.toLowerCase().includes("hải phòng") ? "North" : "South";

    const targetRegion = VIETNAM_CITIES.find(c => c.name === selectedCity)?.region || "South";

    if (originRegion === targetRegion) {
      return {
        method: "Vận chuyển nội vùng",
        time: "Giao nhận trong đúng 24 giờ",
        fee: 25000
      };
    } else {
      return {
        method: "Vận chuyển liên miền",
        time: "Giao nhận trong đúng 3 ngày",
        fee: 45000
      };
    }
  }, [product, selectedCity, VIETNAM_CITIES]);

  const getFileExtension = (url) => {
    if (!url) return "";
    return url.split('.').pop().split('?')[0].toLowerCase();
  };

  const allImages = useMemo(() => {
    if (!product) return [];
    const imgs = [];
    if (product.images && product.images.length > 0) {
      imgs.push(...product.images);
    } else if (product.imageUrl) {
      imgs.push(product.imageUrl);
    }
    // Append traceability image URL if exists
    if (product.traceabilityImageUrl && !imgs.includes(product.traceabilityImageUrl)) {
      imgs.push(product.traceabilityImageUrl);
    }
    return imgs.filter(Boolean);
  }, [product]);

  // Lightbox keydown event listener
  useEffect(() => {
    if (!isLightboxOpen || allImages.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLightboxOpen, allImages]);

  const triggerToast = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3000);
  };

  useEffect(() => {
    // Sync current user for header
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    if (currentUser && currentUser.fullName) {
      setNewAuthor(currentUser.fullName);
    }

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

    const loadLocalCartCount = () => {
      const savedCart = JSON.parse(localStorage.getItem("agrimarket_cart")) || [];
      setCartItemsCount(savedCart.length);
    };

    fetchCartCount();
  }, []);

  useEffect(() => {
    const fetchProductAndRelated = async () => {
      const cacheKey = `agrimarket_product_cache_${id}`;
      const cachedProduct = sessionStorage.getItem(cacheKey);
      let hasCache = false;

      if (cachedProduct) {
        try {
          const parsed = JSON.parse(cachedProduct);
          if (parsed && String(parsed.id) === String(id)) {
            setProduct(parsed);
            if (parsed.images && parsed.images.length > 0) {
              setActiveImage(parsed.images[0]);
            } else if (parsed.imageUrl) {
              setActiveImage(parsed.imageUrl);
            }
            setLoading(false);
            hasCache = true;
          }
        } catch (e) {}
      }

      if (!hasCache) {
        setLoading(true);
      }

      try {
        // Khởi chạy các API độc lập song song để triệt tiêu hiện tượng nghẽn cổ chai (waterfall)
        const productPromise = getProductById(id);
        const wishlistStatusPromise = authService.getCurrentUser() ? wishlistService.isWishlistItem(id).catch(() => false) : Promise.resolve(false);
        const wishlistIdsPromise = authService.getCurrentUser() ? wishlistService.getWishlistIds().catch(() => []) : Promise.resolve([]);
        const reviewsPromise = reviewService.getReviewsByProductId(id).catch((err) => {
          console.error("Lỗi khi tải đánh giá từ backend:", err);
          return [];
        });

        // Chờ tất cả các API độc lập hoàn thành
        const [data, savedStatus, savedIds, dbReviews] = await Promise.all([
          productPromise,
          wishlistStatusPromise,
          wishlistIdsPromise,
          reviewsPromise,
        ]);

        setProduct(data);
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
        setIsSaved(savedStatus);
        setSavedRelatedIds(new Set((savedIds || []).map(String)));
        setReviewsList(dbReviews || []);

        if (data.images && data.images.length > 0) {
          setActiveImage(data.images[0]);
        } else if (data.imageUrl) {
          setActiveImage(data.imageUrl);
        }
        if (data.stock === 0) {
          setQuantity(0);
        } else {
          setQuantity(1);
        }

        // Gọi các API phụ thuộc song song: kiểm tra follow nhà vườn và lấy sản phẩm liên quan phân trang
        const dependentPromises = [];

        // 1. Follow status
        let followStatusPromise = Promise.resolve(false);
        if (data.farmerId) {
          followStatusPromise = wishlistService.isFarmerFollowed(data.farmerId).catch((err) => {
            console.error("Lỗi khi tải trạng thái follow nhà vườn:", err);
            return false;
          });
        }
        dependentPromises.push(followStatusPromise);

        // 2. Related products
        let relatedPromise = Promise.resolve([]);
        const isMockProduct = id === "mock-2" || (data.name && (data.name.toLowerCase().includes("cà rốt") || data.name.toLowerCase().includes("carrot")));
        if (!isMockProduct) {
          relatedPromise = (async () => {
            try {
              const relatedResponse = await getApprovedProductsPaged({ page: 0, size: 5, category: data.category });
              let list = (relatedResponse?.content || []).filter((p) => String(p.id) !== String(id));
              
              if (list.length < 4) {
                const fallbackResponse = await getApprovedProductsPaged({ page: 0, size: 10 });
                const fallbackList = (fallbackResponse?.content || [])
                  .filter((p) => String(p.id) !== String(id) && p.category !== data.category);
                list = [...list, ...fallbackList].slice(0, 4);
              } else {
                list = list.slice(0, 4);
              }
              return list;
            } catch (err) {
              console.error("Lỗi khi lấy danh sách sản phẩm liên quan:", err);
              return [];
            }
          })();
        }
        dependentPromises.push(relatedPromise);

        const [followStatus, relatedResult] = await Promise.all(dependentPromises);
        setIsFarmerFollowed(followStatus);

        if (isMockProduct) {
          setRelatedProducts([
            {
              id: "related-1",
              name: "Củ dền đỏ hữu cơ",
              price: 75000,
              unit: "bó",
              imageUrl: "https://images.unsplash.com/photo-1445280471656-618bf9abcfe0?w=600",
            },
            {
              id: "related-2",
              name: "Xà lách hỗn hợp Spring Mix",
              price: 137500,
              unit: "túi",
              imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600",
            },
            {
              id: "related-3",
              name: "Khoai tây Yukon Gold",
              price: 100000,
              unit: "túi",
              imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600",
            },
            {
              id: "related-4",
              name: "Củ cải đường French Breakfast",
              price: 62500,
              unit: "bó",
              imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600",
            },
          ]);
        } else {
          setRelatedProducts(relatedResult);
        }
      } catch (err) {
        console.error("Lỗi khi tải chi tiết sản phẩm:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndRelated();
  }, [id]);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    navigate("/");
  };

  const handleQuantityChange = (val) => {
    if (!product || product.stock === 0) return;
    const currentQty = parseInt(quantity, 10) || 1;
    const newQty = currentQty + val;
    const maxStock = product.stock !== undefined && product.stock !== null ? product.stock : 100;
    if (newQty >= 1 && newQty <= maxStock) {
      setQuantity(newQty);
    }
  };

  const handleAddToCart = async () => {
    if (!product || product.stock === 0) return;
    const qtyToUse = parseInt(quantity, 10) || 1;

    if (user) {
      try {
        triggerToast(`Đã thêm ${qtyToUse} ${product.unit} "${product.name}" vào giỏ hàng!`);
        const data = await cartService.addToCart(product.id, qtyToUse);
        setCartItemsCount(data.length);
      } catch (err) {
        console.error("Lỗi khi thêm vào giỏ hàng:", err);
        triggerToast("Không thể thêm vào giỏ hàng. Vui lòng thử lại!");
      }
    } else {
      const cartKey = "agrimarket_cart";
      const currentCart = JSON.parse(localStorage.getItem(cartKey)) || [];
      const existingIndex = currentCart.findIndex(item => String(item.id) === String(product.id));

      if (existingIndex > -1) {
        const newQty = currentCart[existingIndex].quantity + qtyToUse;
        if (product.stock !== undefined && newQty > product.stock) {
          triggerToast(`Không thể thêm số lượng vượt quá tồn kho hiện có (${product.stock}).`);
          return;
        }
        currentCart[existingIndex].quantity = newQty;
      } else {
        if (product.stock !== undefined && qtyToUse > product.stock) {
          triggerToast(`Không thể thêm số lượng vượt quá tồn kho hiện có (${product.stock}).`);
          return;
        }
        currentCart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          unit: product.unit,
          imageUrl: product.imageUrl,
          quantity: qtyToUse,
          checked: true,
          stockQuantity: product.stock,
          farmerId: product.farmerId,
          farmerName: product.farmerName
        });
      }
      localStorage.setItem(cartKey, JSON.stringify(currentCart));
      setCartItemsCount(currentCart.length);
      triggerToast(`Đã thêm ${qtyToUse} ${product.unit} "${product.name}" vào giỏ hàng!`);
    }
  };

  const handleBuyNow = async () => {
    if (!product || product.stock === 0) return;
    await handleAddToCart();
    navigate("/cart");
  };

  const handlePreorderCheckoutDirect = () => {
    if (!product) return;
    const qtyToUse = parseInt(quantity, 10) || 1;
    const itemSubtotal = product.price * qtyToUse;
    const fee = 15000;
    const total = itemSubtotal + fee;

    const preorderCheckoutData = {
      selectedItems: [
        {
          id: product.id,
          name: product.name,
          price: product.price,
          unit: product.unit,
          imageUrl: product.imageUrl,
          quantity: qtyToUse,
          checked: true,
          stockQuantity: product.stock || 45,
          farmerId: product.farmerId || 1,
          farmerName: product.farmerName || "Nông trại Green Valley",
          isPreorder: true,
          expectedHarvest: product.expectedHarvest || "Cuối tháng 08, 2026",
          deliveryWindow: product.deliveryWindow || "Từ 01/09 đến 07/09/2026"
        }
      ],
      subtotal: itemSubtotal,
      serviceFee: 0,
      shippingFee: fee,
      discountAmount: 0,
      totalAmount: total,
      isPreorder: true
    };

    localStorage.setItem("agrimarket_checkout", JSON.stringify(preorderCheckoutData));
    navigate("/preorder-checkout");
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (attachedImages.length + files.length > 3) {
      triggerToast("Bạn chỉ được tải lên tối đa 3 hình ảnh!");
      return;
    }
    const newUrls = files.map(file => URL.createObjectURL(file));
    setAttachedImages(prev => [...prev, ...newUrls]);
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (attachedVideo) {
        URL.revokeObjectURL(attachedVideo);
      }
      const newUrl = URL.createObjectURL(file);
      setAttachedVideo(newUrl);
    }
  };

  const removeAttachedImage = (index) => {
    const urlToRemove = attachedImages[index];
    if (urlToRemove) {
      URL.revokeObjectURL(urlToRemove);
    }
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeAttachedVideo = () => {
    if (attachedVideo) {
      URL.revokeObjectURL(attachedVideo);
    }
    setAttachedVideo(null);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      triggerToast("Vui lòng điền nội dung nhận xét!");
      return;
    }

    const authorNameToUse = newAuthor.trim() || (user ? user.fullName : "") || "Khách hàng ẩn danh";
    const dateToday = new Date().toISOString().split("T")[0];

    const newReviewObj = {
      id: Date.now(),
      author: authorNameToUse,
      rating: newRating,
      date: dateToday,
      comment: newComment.trim(),
      images: attachedImages,
      video: attachedVideo
    };

    const updatedReviews = [newReviewObj, ...reviewsList];
    setReviewsList(updatedReviews);

    // Tính toán lại rating trung bình và lượt nhận xét
    if (product) {
      const currentReviewsCount = product.reviewsCount || 0;
      const currentRating = product.rating || 4.5;
      const totalScore = currentRating * currentReviewsCount;
      const newReviewsCount = currentReviewsCount + 1;
      const newAvgRating = parseFloat(((totalScore + newRating) / newReviewsCount).toFixed(1));

      setProduct(prev => ({
        ...prev,
        rating: newAvgRating,
        reviewsCount: newReviewsCount
      }));
    }

    setNewComment("");
    setNewRating(5);
    setAttachedImages([]);
    setAttachedVideo(null);
    if (!user) {
      setNewAuthor("");
    }
    triggerToast("Gửi nhận xét thành công! Xin cảm ơn phản hồi của bạn.");
  };

  const agriDetails = useMemo(() => {
    if (!product) return {};
    const idStr = String(product.id);
    const nameLower = product.name.toLowerCase();

    // 1. Cà chua (Tomato - mock-1)
    if (idStr === "mock-1" || nameLower.includes("cà chua") || nameLower.includes("tomato")) {
      return {
        story: {
          originStory: "Giống cà chua Heirloom cổ điển được canh tác tại trang trại Happy Farm ở Lâm Đồng. Hạt giống được lưu truyền qua nhiều thế hệ giúp quả giữ nguyên hương vị mộc mạc thuở xưa.",
          farmingMethod: "Trồng trong nhà màng tự nhiên, sử dụng các loài thiên địch để kiểm soát sâu bệnh sinh học, nói không với thuốc trừ sâu hóa học.",
          growingConditions: "Đón nhận nắng ấm cao nguyên hơn 8 tiếng mỗi ngày cùng đất tơi xốp giàu dinh dưỡng vi sinh.",
          seasonality: "Được thu hoạch đúng vụ khi quả chín đỏ mọng tự nhiên 100% trên cây, mang lại vị ngon đậm đà nhất.",
          uniqueness: "Quả có kết cấu nhiều bột mịn cát, mọng nước, vị ngọt dịu xen lẫn chút chua nhẹ rất tự nhiên.",
          sustainability: "Hệ thống tưới nhỏ giọt tiết kiệm nước và giá thể trồng từ xơ dừa hữu cơ tái chế."
        },
        highlights: [
          { text: "Chín cây tự nhiên", icon: "🍅" },
          { text: "Nhiều bột mọng nước", icon: "💦" },
          { text: "Không thuốc trừ sâu", icon: "🌱" },
          { text: "Hữu cơ sinh học", icon: "🌾" },
          { text: "Thu hoạch thủ công", icon: "🙌" }
        ],
        nutrition: {
          calories: "18 kcal / 100g",
          water: "94.5%",
          fiber: "1.2g",
          fiberPercent: 5,
          vitaminC: "13.7mg",
          vitaminCPercent: 23,
          potassium: "237mg",
          potassiumPercent: 5,
          lycopene: "3025mcg",
          lycopenePercent: 15
        },
        usage: [
          { text: "Nấu nước sốt mì Ý hoặc sốt cà chua đậm đà", icon: "🍝" },
          { text: "Làm salad tươi mát giải nhiệt mùa hè", icon: "🥗" },
          { text: "Xay sinh tố dinh dưỡng đẹp da", icon: "🍹" },
          { text: "Ăn sống kèm muối ớt hoặc làm món xào", icon: "🍽️" }
        ],
        storage: {
          temp: "18°C - 22°C (Nhiệt độ phòng thoáng mát)",
          life: "5 - 7 ngày",
          guide: "Nên xếp cuống cà chua hướng lên trên để quả không bị đè dập. Không để trong tủ lạnh khi quả chưa chín hoàn toàn vì hơi lạnh sẽ làm ngừng quá trình chín tự nhiên, khiến quả bị bở và giảm bớt mùi thơm."
        },
        faq: [
          {
            q: "Tại sao không nên cất cà chua vào tủ lạnh ngay khi mua về?",
            a: "Nhiệt độ lạnh dưới 10°C sẽ làm phá hủy màng tế bào của cà chua chưa chín, ngăn cản quá trình tạo ra các chất tạo mùi thơm tự nhiên, làm cà chua bị bở và nhạt vị. Bạn nên để cà chua chín tự nhiên ở nhiệt độ phòng, sau khi chín đỏ đều mới cất tủ lạnh ăn dần trong vòng 2 ngày."
          },
          {
            q: "Sản phẩm có phun thuốc kích thích chín đỏ nhanh không?",
            a: "Tuyệt đối không. Cà chua tại Happy Farm được cam kết để chín đỏ tự nhiên trên cây và thu hoạch tỉ mỉ bằng tay. Chúng tôi cam kết nói không với hóa chất giấm chín hóa học."
          },
          {
            q: "Làm thế nào để rửa sạch cà chua an toàn?",
            a: "Bạn chỉ cần rửa nhẹ nhàng dưới vòi nước chảy để loại bỏ lớp bụi mỏng bên ngoài quả. Không nên ngâm trong nước muối quá đậm hoặc quá lâu vì có thể làm mềm vỏ quả và giảm vị ngon ngọt."
          }
        ]
      };
    }

    // 2. Cà rốt (Carrot - mock-2)
    if (idStr === "mock-2" || nameLower.includes("cà rốt") || nameLower.includes("carrot")) {
      return {
        story: {
          originStory: "Cà rốt giống cổ Heirloom được gieo trồng tại thung lũng đất đỏ bazan giàu khoáng chất của nông trại Green Valley tại Đà Lạt, Lâm Đồng. Đất sạch và khí hậu ôn đới lý tưởng giúp củ phát triển khỏe mạnh.",
          farmingMethod: "Canh tác hữu cơ sinh học hoàn toàn. Sử dụng phân trùn quế tự nhiên để làm giàu dinh dưỡng cho đất mà không sử dụng hóa chất kích thích sinh trưởng.",
          growingConditions: "Thời gian sinh trưởng dài hơn giúp củ cà rốt tích tụ tối đa hàm lượng vitamin A cùng khoáng chất ngầm từ lòng đất sâu.",
          seasonality: "Được thu hoạch thủ công vào sáng sớm khi củ đạt độ giòn và mọng nước cao nhất, giữ được độ ngọt đậm đà vốn có.",
          uniqueness: "Thân củ màu cam đậm đặc trưng nhờ hàm lượng Beta-Carotene vượt trội, lõi nhỏ dẻo, ngọt và không bị xơ cứng.",
          sustainability: "Phương pháp canh tác bảo vệ lớp đất mặt, đóng gói quấn lá chuối xanh tươi và buộc bằng dây đay thiên nhiên thân thiện môi trường."
        },
        highlights: [
          { text: "Ngọt đậm đà tự nhiên", icon: "🥕" },
          { text: "Beta-Carotene cao", icon: "✨" },
          { text: "Không hóa chất bảo quản", icon: "🛡️" },
          { text: "Trồng đất Bazan Đà Lạt", icon: "⛰️" },
          { text: "Đóng gói lá chuối", icon: "🍃" }
        ],
        nutrition: {
          calories: "41 kcal / 100g",
          water: "88.0%",
          fiber: "2.8g",
          fiberPercent: 11,
          vitaminC: "5.9mg",
          vitaminCPercent: 10,
          potassium: "320mg",
          potassiumPercent: 9,
          vitaminA: "835mcg",
          vitaminAPercent: 93
        },
        usage: [
          { text: "Ép nước detox kết hợp táo, gừng giúp đẹp da", icon: "🍹" },
          { text: "Nấu súp dinh dưỡng hoặc cháo ăn dặm cho trẻ em", icon: "🥣" },
          { text: "Bào sợi trộn nộm salad giòn sần sật", icon: "🥗" },
          { text: "Ăn sống trực tiếp như một món snack lành mạnh", icon: "🥕" }
        ],
        storage: {
          temp: "3°C - 5°C (Ngăn rau củ của tủ lạnh)",
          life: "7 - 10 ngày",
          guide: "Nếu chưa chế biến ngay, hãy giữ nguyên lớp đất đỏ bám quanh củ. Khi cất vào tủ lạnh, cắt bỏ bớt phần lá xanh sát cuống để tránh mất nước, bọc củ bằng giấy báo hoặc khăn giấy khô rồi đặt vào túi kéo kín để hút ẩm thừa."
        },
        faq: [
          {
            q: "Tại sao cà rốt khi giao tới vẫn còn bám đất đỏ bazan?",
            a: "Lớp đất bazan tự nhiên bọc ngoài củ hoạt động như một lớp màng sinh học bảo vệ cà rốt khỏi mất nước và ngăn cản sự xâm nhập của vi khuẩn gây thối nhũn. Giữ nguyên đất giúp cà rốt tươi lâu hơn gấp đôi so với cà rốt đã rửa nước sạch."
          },
          {
            q: "Cà rốt này có cần phải gọt sạch vỏ khi nấu ăn không?",
            a: "Vì được trồng theo phương pháp hữu cơ sinh học an toàn không thuốc trừ sâu, bạn không nhất thiết phải gọt bỏ toàn bộ lớp vỏ. Chỉ cần ngâm rửa và chà sạch đất bằng bàn chải mềm dưới vòi nước là có thể ăn cả vỏ để giữ trọn vẹn chất xơ và Beta-Carotene."
          },
          {
            q: "Giống cà rốt này khác gì so với cà rốt chợ thường?",
            a: "Cà rốt giống cổ Heirloom của Green Valley có ruột lõi rất nhỏ, kết cấu thịt chắc dẻo, không xơ và có vị ngọt đậm đặc trưng rõ rệt, đặc biệt rất thơm khi xay nước ép tươi."
          }
        ]
      };
    }

    // 3. Táo (Apple - mock-3)
    if (idStr === "mock-3" || nameLower.includes("táo") || nameLower.includes("apple")) {
      return {
        story: {
          originStory: "Những trái táo Honeycrisp giòn ngọt được trồng tại đồi táo công nghệ cao của nhà vườn Orchard House ở Đà Lạt. Cây táo được hấp thụ đầy đủ nắng gió cao nguyên để cho quả đẹp nhất.",
          farmingMethod: "Áp dụng kỹ thuật bao trái bằng túi sinh học trực tiếp trên cây từ lúc quả non, ngăn chặn côn trùng xâm hại một cách tự nhiên mà không cần phun thuốc hóa học lên vỏ quả.",
          growingConditions: "Chênh lệch nhiệt độ lớn giữa ngày và đêm ở cao nguyên Đà Lạt kích thích táo tích tụ lượng mật đường tự nhiên xung quanh lõi quả.",
          seasonality: "Táo được thu hoạch chính vụ vào cuối mùa thu, từng quả được hái tay cẩn thận, đo độ đường đạt chuẩn trước khi phân loại.",
          uniqueness: "Thịt táo siêu giòn rụm, cắn ngập miệng mọng nước, vị chua nhẹ thanh khiết đan xen vị ngọt đậm đà khó quên.",
          sustainability: "Dùng phân bón hữu cơ chế biến từ bã thực vật tự nhiên, kết hợp hệ thống tưới nước tiết kiệm bán tự động."
        },
        highlights: [
          { text: "Siêu giòn giòn rụm", icon: "🍎" },
          { text: "Bao trái sinh học", icon: "🛡️" },
          { text: "Không sáp bóng hóa học", icon: "✨" },
          { text: "Tiêu chuẩn GlobalGAP", icon: "🏆" },
          { text: "Hái tay chọn lọc", icon: "🖐️" }
        ],
        nutrition: {
          calories: "52 kcal / 100g",
          water: "85.6%",
          fiber: "2.4g",
          fiberPercent: 10,
          vitaminC: "4.6mg",
          vitaminCPercent: 8,
          potassium: "107mg",
          potassiumPercent: 3,
          antioxidants: "Dồi dào",
          antioxidantsPercent: 20
        },
        usage: [
          { text: "Tráng miệng ăn tươi nguyên quả giòn mát", icon: "🍎" },
          { text: "Làm nước ép táo nguyên chất giàu vitamin", icon: "🥤" },
          { text: "Làm nhân bánh táo nướng hoặc nướng tẩm mật ong", icon: "🥧" },
          { text: "Cắt lát trộn salad trái cây kèm hạt hạnh nhân", icon: "🥗" }
        ],
        storage: {
          temp: "2°C - 4°C (Ngăn mát tủ lạnh)",
          life: "14 - 21 ngày",
          guide: "Cất táo trong túi zip đục lỗ ở tủ lạnh. Tránh để táo sát cạnh các loại rau lá xanh hoặc bông cải vì táo chín sinh ra chất khí ethylene tự nhiên làm thúc đẩy rau bị úa vàng nhanh hơn."
        },
        faq: [
          {
            q: "Vỏ quả táo có bị phun lớp sáp bóng bảo quản không?",
            a: "Tuyệt đối không. Lớp phấn mờ trên vỏ táo là lớp sáp tự nhiên do bản thân trái táo tiết ra để tự bảo vệ chống mất nước và côn trùng. Vườn Orchard House cam kết không sử dụng bất kỳ loại sáp nhân tạo hay chất bảo quản hóa học nào lên trái táo."
          },
          {
            q: "Tại sao quả táo đôi khi có những vết trong suốt xung quanh lõi?",
            a: "Đó gọi là hiện tượng 'táo ngấm mật' (honey core). Đây là hiện tượng sinh lý hoàn toàn tự nhiên khi táo đạt độ chín hoàn hảo, tích tụ hàm lượng đường fructose cô đặc xung quanh lõi. Những vùng thịt quả này ngọt lịm và rất thơm, không phải bị hỏng."
          }
        ]
      };
    }

    // 4. Gạo (Rice - mock-4)
    if (idStr === "mock-4" || nameLower.includes("gạo") || nameLower.includes("rice")) {
      return {
        story: {
          originStory: "Gạo đặc sản Tám Xoan được thu hoạch từ những cánh đồng lúa nước trù phú của vùng thung lũng lòng chảo Điện Biên. Đất phù sa sông Nậm Rốm bồi đắp mang lại hương vị hạt gạo đặc trưng.",
          farmingMethod: "Canh tác truyền thống theo mô hình lúa sạch luân canh. Sử dụng nguồn nước mát lành từ dòng suối vùng cao chảy tự nhiên vào ruộng lúa.",
          growingConditions: "Hạt lúa đón nhận ánh nắng rực rỡ ban ngày và khí trời mát lạnh ban đêm vùng núi Tây Bắc, giúp hạt lúa chín chắc hạt, tích tụ hương thơm đậm.",
          seasonality: "Mỗi năm chỉ trồng đúng một vụ chiêm/mùa chính, thu hoạch thủ công và phơi nắng tự nhiên trên sân gạch để giữ hương gạo mộc mạc.",
          uniqueness: "Hạt gạo nhỏ, thon dài, màu trắng đục nhẹ. Khi nấu cho cơm dẻo, thơm ngào ngạt hương nếp cốm non và cơm vẫn dẻo ngọt dù để nguội.",
          sustainability: "Phương pháp canh tác ruộng bậc thang kết hợp chăn nuôi vịt làm cỏ tự nhiên, cam kết không lạm dụng phân hóa học."
        },
        highlights: [
          { text: "Thơm dẻo cốm non", icon: "🌾" },
          { text: "Đất phù sa Điện Biên", icon: "🏞️" },
          { text: "Nguồn nước suối rừng", icon: "💧" },
          { text: "Không tẩm hương liệu", icon: "🛡" },
          { text: "Hút chân không bảo vệ", icon: "📦" }
        ],
        nutrition: {
          calories: "348 kcal / 100g",
          water: "12.0%",
          carbs: "79.0g",
          carbsPercent: 26,
          protein: "6.5g",
          proteinPercent: 13,
          potassium: "85mg",
          potassiumPercent: 2,
          vitaminB1: "0.12mg",
          vitaminB1Percent: 8
        },
        usage: [
          { text: "Nấu cơm nóng gia đình dẻo ngọt ăn hàng ngày", icon: "🍚" },
          { text: "Nấu cháo dinh dưỡng sánh nhuyễn thơm bùi", icon: "🥣" },
          { text: "Làm cơm cơm cháy chà bông siêu giòn", icon: "🍳" },
          { text: "Nấu cơm lam ống tre mang vị núi rừng đặc sản", icon: "🪵" }
        ],
        storage: {
          temp: "Nhiệt độ phòng (dưới 28°C), nơi khô ráo thoáng mát",
          life: "6 tháng",
          guide: "Tránh ánh nắng mặt trời trực tiếp và nơi ẩm ướt. Sau khi mở túi chân không, nên trút gạo vào thùng kín có nắp đậy chặt (thùng gỗ, nhựa PP sạch) để tránh ẩm mốc và sự xâm nhập của mối mọt."
        },
        faq: [
          {
            q: "Tại sao gạo nấu cơm dẻo hơn hẳn gạo thông thường?",
            a: "Gạo Tám Xoan Điện Biên có cấu trúc tinh bột amylose thấp hơn, kết hợp trồng trên thổ nhưỡng thung lũng có chênh lệch nhiệt độ cao giúp cơm dính dẻo tự nhiên, giữ vị ngọt lâu dài ngay cả khi nguội lạnh mà không cần tẩm phụ gia."
          },
          {
            q: "Gạo có chất chống mối mọt hay sấy hóa chất không?",
            a: "AgriMarket cam kết hạt gạo sạch thô 100%, được đóng gói hút chân không an toàn để bảo quản tự nhiên mà không dùng bất kỳ chất phun sấy diệt côn trùng hay chất chống mốc hóa học nào."
          }
        ]
      };
    }

    // 5. dâu tây (Strawberry - mock-5)
    if (idStr === "mock-5" || nameLower.includes("dâu") || nameLower.includes("strawberry")) {
      return {
        story: {
          originStory: "Dâu tây giống New Zealand chuẩn A được trồng thủy canh hiện đại tại nông trại BerryLand ở vùng đồi thông Đà Lạt, Lâm Đồng.",
          farmingMethod: "Hệ thống canh tác trên giàn cao cách mặt đất 1.2m, hoàn toàn tránh được mầm bệnh từ đất. Thụ phấn bằng ong nuôi tự nhiên trong vườn kính.",
          growingConditions: "Nước tưới được lọc tinh khiết và kiểm soát dinh dưỡng chính xác bằng hệ thống máy tính tự động hóa chuẩn châu Âu.",
          seasonality: "Dâu cho trái rải rác quanh năm dưới thời tiết nhà màng bảo vệ, quả được tuyển chọn thu hoạch khi đạt đúng 90% độ chín đỏ đẹp.",
          uniqueness: "Quả dâu tây trái to, thon dài căng mọng, cuống xanh tươi, thịt quả giòn ngọt mát dịu và thơm nồng nàn đặc trưng.",
          sustainability: "Hệ thống thủy canh tuần hoàn khép kín thu hồi nước thừa, không xả thải hóa chất ra nguồn nước tự nhiên."
        },
        highlights: [
          { text: "Thủy canh giàn cao", icon: "🍓" },
          { text: "Không mầm bệnh từ đất", icon: "🛡️" },
          { text: "Giòn thơm New Zealand", icon: "🇳🇿" },
          { text: "Thụ phấn nhờ ong", icon: "🐝" },
          { text: "Hộp lót mút chống dập", icon: "📦" }
        ],
        nutrition: {
          calories: "32 kcal / 100g",
          water: "91.0%",
          vitaminC: "58.8mg",
          vitaminCPercent: 98,
          fiber: "2.0g",
          fiberPercent: 8,
          potassium: "153mg",
          potassiumPercent: 4,
          folate: "24mcg",
          folatePercent: 6
        },
        usage: [
          { text: "Dùng trực tiếp tráng miệng tươi ngon mọng nước", icon: "🍓" },
          { text: "Dầm cùng sữa chua không đường và hạt chia ăn kiêng", icon: "🥣" },
          { text: "Xay sinh tố kem dâu mát lạnh sảng khoái", icon: "🍹" },
          { text: "Làm mứt dâu phết bánh mì hoặc làm trà dâu tây", icon: "🍞" }
        ],
        storage: {
          temp: "3°C - 5°C (Ngăn mát tủ lạnh)",
          life: "3 ngày",
          guide: "Tránh va chạm mạnh vì dâu rất dễ dập. Chỉ rửa dâu ngay trước khi ăn vì nước bám ngoài sẽ làm dâu nhanh úng thối. Nên lót một lớp khăn giấy dưới đáy hộp đựng dâu để hút ẩm trong tủ lạnh."
        },
        faq: [
          {
            q: "Tại sao trái dâu có thời gian bảo quản khá ngắn?",
            a: "Dâu tây là loại quả mọng nước, vỏ siêu mỏng và không có lớp sáp bảo vệ. Chúng tôi hoàn toàn không phun hóa chất ức chế nấm hay chất chống hỏng sau thu hoạch nên dâu cần được ăn tươi sớm trong vòng 3 ngày để đảm bảo vị ngon lành nhất."
          },
          {
            q: "Quả dâu tây này có ngọt hoàn toàn không?",
            a: "Giống dâu New Zealand tại Đà Lạt có vị ngọt mát hài hòa đi kèm một chút chua thanh nhẹ đặc trưng ở đầu lưỡi, chứ không ngọt lịm hoàn toàn như dâu tẩm hóa chất tạo ngọt. Vị chua thanh này chứng minh quả dâu chín tự nhiên dồi dào Vitamin C."
          }
        ]
      };
    }

    // 6. Mật ong (Honey - mock-6)
    if (idStr === "mock-6" || nameLower.includes("mật ong") || nameLower.includes("honey")) {
      return {
        story: {
          originStory: "Mật ong nguyên chất được khai thác từ những cánh rừng nhãn bạt ngàn tại Khoái Châu, Hưng Yên. Đàn ong được đặt trực tiếp dưới những tán cây nhãn cổ thụ trong mùa hoa nở.",
          farmingMethod: "Khai thác bằng phương pháp quay ly tâm truyền thống vệ sinh, lọc thô bỏ sáp ong, giữ nguyên vẹn các hạt phấn hoa nhãn tự nhiên bổ dưỡng.",
          growingConditions: "Những giọt mật ong mang hương thơm nhãn đặc trưng được đàn ong mật chăm chỉ tích tụ từ bầu không khí trong lành miền quê sông Hồng.",
          seasonality: "Chỉ thu hoạch duy nhất vào đợt hoa nhãn nở rộ tháng 3 - tháng 4 âm lịch hàng năm để có chất lượng mật ngon sánh nhất.",
          uniqueness: "Mật có màu vàng óng ánh hổ phách, đặc sánh, vị ngọt đậm sắc sảo và mang hương thơm ngào ngạt thanh khiết của hoa nhãn chín.",
          sustainability: "Duy trì mô hình nuôi ong tự nhiên bảo vệ đa dạng sinh học hệ sinh thái cây ăn quả hữu cơ địa phương."
        },
        highlights: [
          { text: "Hoa nhãn nguyên chất", icon: "🐝" },
          { text: "Màu hổ phách óng ánh", icon: "🍯" },
          { text: "Không pha trộn đường", icon: "🛡️" },
          { text: "Quay ly tâm thô sạch", icon: "⚙️" },
          { text: "Chai thủy tinh cao cấp", icon: "🍾" }
        ],
        nutrition: {
          calories: "304 kcal / 100g",
          water: "17.1%",
          carbs: "82.0g",
          carbsPercent: 27,
          sugar: "82.0g",
          antioxidants: "Dồi dào",
          zinc: "0.22mg",
          zincPercent: 2
        },
        usage: [
          { text: "Pha cùng nước ấm và chanh tươi uống detox buổi sáng", icon: "🍋" },
          { text: "Dùng làm gia vị ướp thịt nướng giúp lên màu vàng đẹp", icon: "🥩" },
          { text: "Rưới lên bánh mì kẹp hoặc bánh pancake tráng miệng", icon: "🥞" },
          { text: "Hấp tỏi chanh đào trị ho tự nhiên hiệu quả", icon: "🧪" }
        ],
        storage: {
          temp: "18°C - 25°C (Nhiệt độ phòng, bóng mát)",
          life: "2 năm",
          guide: "Tránh ánh nắng mặt trời chiếu trực tiếp. Tuyệt đối không cất mật ong trong tủ lạnh vì nhiệt độ lạnh dưới 12°C sẽ kích thích mật ong nguyên chất kết tinh thành các hạt đường đường glucose trắng ở đáy chai, làm giảm chất lượng mật."
        },
        faq: [
          {
            q: "Tại sao mật ong hoa nhãn nguyên chất bị đóng đường ở đáy khi trời lạnh?",
            a: "Đây là hiện tượng vật lý hoàn toàn tự nhiên của mật ong thật nguyên chất (kết tinh đường tự nhiên). Mật chứa nhiều hạt phấn hoa nhỏ li ti và hàm lượng glucose tự nhiên cao. Để khắc phục, bạn chỉ cần ngâm chai mật vào nước ấm 60°C trong 15 phút mật sẽ tan chảy sánh mịn lại bình thường."
          },
          {
            q: "Trẻ em có sử dụng được mật ong không?",
            a: "Tuyệt đối không dùng mật ong cho trẻ dưới 1 tuổi vì hệ tiêu hóa non nớt của bé chưa tự bảo vệ được trước các bào tử vi khuẩn tự nhiên có thể tồn tại trong mật ong sống."
          }
        ]
      };
    }

    // Generic Fallback (for other products)
    const defaults = {
      story: {
        originStory: `Sản phẩm này được thu hoạch từ các hộ nông trại và hợp tác xã liên kết chặt chẽ cùng AgriMarket tại ${product.farmLocation || "Lâm Đồng, Việt Nam"}. Quy trình trồng trọt được theo dõi sát sao từ gieo hạt đến thu hoạch để đảm bảo chất lượng an lành nhất.`,
        farmingMethod: "Ứng dụng phương pháp sản xuất nông nghiệp tốt (Good Agricultural Practices), sử dụng phân hữu cơ ủ hoai mục và hạn chế tối đa các chế phẩm vô cơ.",
        growingConditions: "Môi trường đất đai và nguồn nước được xét nghiệm định kỳ đạt chuẩn không chứa kim loại nặng và độc tố hóa học nguy hại.",
        seasonality: "Sản phẩm được bán theo đúng mùa vụ tự nhiên để quả ngọt tự nhiên nhất và không lạm dụng chất giấm ép chín.",
        uniqueness: "Nông sản tươi sạch được thu hoạch tươi sống tại vườn và chuyển giao trực tiếp đến tay người tiêu dùng trong thời gian ngắn nhất.",
        sustainability: "AgriMarket hỗ trợ nông nghiệp bền vững, trả mức giá công bằng cho nông dân và đóng gói sản phẩm thân thiện với thiên nhiên."
      },
      highlights: [
        { text: "Canh tác an toàn", icon: "🌱" },
        { text: "Không chất bảo quản", icon: "🛡️" },
        { text: "Thu hoạch tươi sống", icon: "🌾" },
        { text: "Nguồn gốc rõ ràng", icon: "🔍" },
        { text: "Hỗ trợ nông dân Việt", icon: "🇻🇳" }
      ],
      nutrition: {
        calories: "35 kcal / 100g",
        water: "85% - 90%",
        fiber: "Dồi dào chất xơ",
        vitaminC: "Nguồn Vitamin C tự nhiên",
        potassium: "Giàu kali & khoáng chất",
        naturalPurity: "100% tươi sạch"
      },
      usage: [
        { text: "Chế biến các món xào, luộc ngon miệng trong bữa cơm gia đình", icon: "🍳" },
        { text: "Ăn sống tươi ngon hoặc trộn salad mát lành giải nhiệt", icon: "🥗" },
        { text: "Ép nước uống hoặc làm sinh tố bổ dưỡng tăng sức đề kháng", icon: "🍹" }
      ],
      storage: {
        temp: "5°C - 8°C (Ngăn rau tủ lạnh)",
        life: "3 - 5 ngày",
        guide: "Nên làm ráo nước sản phẩm trước khi cất giữ. Sử dụng các túi bọc có đục lỗ thoát khí để tránh tích tụ hơi nước làm úng lá héo củ. Tránh đè các vật nặng lên sản phẩm dễ gây dập nát."
      },
      faq: [
        {
          q: "Làm thế nào để tôi kiểm chứng nguồn gốc sản phẩm này?",
          a: "Mọi sản phẩm trên AgriMarket đều đính kèm thông tin nhà vườn cụ thể ở phần thông tin phía trên. Bạn có thể nhấn vào để xem chi tiết hồ sơ nông trại, chứng chỉ kiểm định và ảnh chụp truy xuất thực địa tại nông trại."
        },
        {
          q: "Nếu sản phẩm nhận được bị hư hỏng, dập nát thì xử lý như thế nào?",
          a: "Chính sách của AgriMarket cam kết hoàn tiền 100% hoặc đổi trả miễn phí đối với sản phẩm bị dập nát, hỏng hóc do quá trình vận chuyển. Bạn chỉ cần chụp ảnh sản phẩm lỗi và gửi phản hồi yêu cầu đổi trả trên ứng dụng trong vòng 24 giờ sau khi nhận hàng."
        }
      ]
    };

    return defaults;
  }, [product]);

  const handleSaveProduct = async () => {
    if (!product) return;
    const res = await wishlistService.toggleWishlist(product.id);
    setIsSaved(res.saved);
    triggerToast(res.message, res.saved ? "success" : "info");
  };

  const handleToggleFollowFarmer = async () => {
    if (!product || !product.farmerId) return;
    const farmerObj = {
      id: product.farmerId,
      name: product.farmerName,
      location: product.farmLocation,
      description: product.farmDescription,
      avatarUrl: product.farmerAvatarUrl,
      vietgapUrl: product.farmerVietgapUrl,
      globalgapUrl: product.farmerGlobalgapUrl,
      organicUrl: product.farmerOrganicUrl,
    };
    const res = await wishlistService.toggleFollowFarmer(farmerObj);
    setIsFarmerFollowed(res.followed);
    triggerToast(res.message, res.followed ? "success" : "info");
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleToggleSaveRelated = async (relatedId, relatedName) => {
    const idStr = String(relatedId);
    const isCurrentlySaved = savedRelatedIds.has(idStr);

    // Optimistic UI: flip immediately
    setSavedRelatedIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlySaved) {
        next.delete(idStr);
      } else {
        next.add(idStr);
      }
      return next;
    });

    try {
      const res = await wishlistService.toggleWishlist(relatedId);
      // Reconcile with server's authoritative state
      if (res?.saved !== undefined) {
        setSavedRelatedIds((prev) => {
          const next = new Set(prev);
          if (res.saved) {
            next.add(idStr);
          } else {
            next.delete(idStr);
          }
          return next;
        });
      }
      triggerToast(res?.message || "Đã cập nhật danh sách yêu thích.", res?.saved ? "success" : "info");
    } catch (err) {
      // Rollback on error
      console.error("Lỗi wishlist:", err);
      setSavedRelatedIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlySaved) {
          next.add(idStr);
        } else {
          next.delete(idStr);
        }
        return next;
      });
      triggerToast("Không thể cập nhật danh sách yêu thích. Vui lòng thử lại!", "error");
    }
  };

  const handleAddRelatedToCart = async (p) => {
    const user = authService.getCurrentUser();
    if (user) {
      try {
        const data = await cartService.addToCart(p.id, 1);
        if (data?.length !== undefined) {
          setCartItemsCount(data.length);
        }
        window.dispatchEvent(new Event("cartUpdated"));
        triggerToast(`Đã thêm 1 ${p.unit} "${p.name}" vào giỏ hàng!`, "success");
      } catch (err) {
        console.error("Lỗi thêm vào giỏ hàng:", err);
        triggerToast("Không thể thêm vào giỏ hàng. Vui lòng thử lại!", "error");
      }
    } else {
      const cartKey = "agrimarket_cart";
      const currentCart = JSON.parse(localStorage.getItem(cartKey)) || [];
      const idx = currentCart.findIndex((item) => String(item.id) === String(p.id));
      if (idx > -1) {
        currentCart[idx].quantity += 1;
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
          farmerName: p.farmerName || "",
        });
      }
      localStorage.setItem(cartKey, JSON.stringify(currentCart));
      window.dispatchEvent(new Event("cartUpdated"));
      triggerToast(`Đã thêm 1 ${p.unit} "${p.name}" vào giỏ hàng!`, "success");
    }
  };

  const formatPrice = (price) => {
    if (product?.unit === "bunch" || product?.unit === "bag" || product?.unit === "3lbs") {
      // If mock product values are small (like $4.50 or $3.00), format as currency USD or VND. 
      // Let's display VND for mock price of carrots (112,500 đ) or USD style depending on price range.
      if (price < 1000) {
        return `$${price.toFixed(2)}`;
      }
    }
    return new Intl.NumberFormat("vi-VN").format(price) + " đ";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Đang cập nhật";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const formatPerishability = (val) => {
    if (!val) return "Khô";
    const v = val.toLowerCase().trim();
    if (v === "khô") return "Khô";
    if (v === "trung bình") return "Trung bình";
    if (v === "dễ hư" || v === "dễ hư hỏng") return "Dễ hư hỏng";
    if (v === "rất dễ hư" || v === "rất dễ hư hỏng") return "Rất dễ hư hỏng";
    return val.charAt(0).toUpperCase() + val.slice(1);
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <Header />
        <div className="product-detail-loading">
          <div className="detail-spinner"></div>
          <p>Đang tải chi tiết nông sản...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-page">
        <Header />
        <div className="product-detail-loading">
          <h2>Không tìm thấy sản phẩm</h2>
          <p>Sản phẩm này không tồn tại hoặc đã bị ẩn.</p>
          <Link to="/" style={{ color: "var(--primary-color)", fontWeight: "600", marginTop: "12px" }}>Quay lại Trang chủ</Link>
        </div>
      </div>
    );
  }

  if (product.isPreorder) {
    return (
      <PreorderProductDetail
        product={product}
        quantity={quantity}
        setQuantity={setQuantity}
        customDate={customDate}
        setCustomDate={setCustomDate}
        specialInstructions={specialInstructions}
        setSpecialInstructions={setSpecialInstructions}
        parsedLimits={parsedLimits}
        formatDateString={formatDateString}
      />
    );
  }

  // Generate breadcrumb items dynamically
  const categoryLabel = product.category || "Rau củ quả";

  return (
    <div className="product-detail-page">
      <Header />

      {/* Breadcrumbs */}
      <div className="breadcrumb-container">
        <ul className="breadcrumbs">
          <li>
            <Link to="/">Trang chủ</Link>
            <span className="breadcrumb-separator">&gt;</span>
          </li>
          <li>
            <Link to="/shop">Cửa hàng</Link>
            <span className="breadcrumb-separator">&gt;</span>
          </li>
          <li>
            <span>{categoryLabel}</span>
            <span className="breadcrumb-separator">&gt;</span>
          </li>
          <li className="active">
            <span>{product.name}</span>
          </li>
        </ul>
      </div>

      {/* Product Detail Grid Layout */}
      <main className="product-detail-container">
        {/* Left Column - Image Gallery */}
        <section className="product-image-section">
          <div
            className="main-image-wrapper"
            style={{ cursor: mainImageError || getFileExtension(activeImage) === "pdf" ? "default" : "zoom-in", position: "relative" }}
            onClick={() => {
              if (getFileExtension(activeImage) !== "pdf" && !mainImageError) {
                const idx = allImages.indexOf(activeImage);
                setLightboxIndex(idx >= 0 ? idx : 0);
                setIsLightboxOpen(true);
              }
            }}
          >
            {mainImageError ? (
              <div className="main-image-placeholder-broken">
                {product.farmerOrganicUrl && activeImage === product.farmerOrganicUrl ? "📜" : "🌾"}
                <p style={{ fontSize: "14px", marginTop: "8px", color: "#6b7280" }}>Hình ảnh không khả dụng</p>
              </div>
            ) : getFileExtension(activeImage) === "pdf" ? (
              <div className="main-image-placeholder-pdf">
                <iframe src={activeImage} title="Certificate PDF" width="100%" height="100%" style={{ border: "none" }} />
              </div>
            ) : (
              <img
                src={activeImage}
                alt={product.name}
                className="main-product-img"
                onError={() => setMainImageError(true)}
              />
            )}
            <div className="badge-overlay">
              {product.isPreorder && <span className="badge-tag preorder-tag" style={{ backgroundColor: "#15803d", color: "#ffffff", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>ĐẶT TRƯỚC</span>}
              {product.isLocal && !product.isPreorder && <span className="badge-tag local-tag">Địa phương</span>}
            </div>

            {/* Gallery Navigation Arrows */}
            {allImages.length > 1 && (
              <>
                <button
                  className="gallery-nav-btn gallery-nav-prev"
                  onClick={(e) => { e.stopPropagation(); const cur = allImages.indexOf(activeImage); setActiveImage(allImages[(cur - 1 + allImages.length) % allImages.length]); }}
                  aria-label="Previous image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button
                  className="gallery-nav-btn gallery-nav-next"
                  onClick={(e) => { e.stopPropagation(); const cur = allImages.indexOf(activeImage); setActiveImage(allImages[(cur + 1) % allImages.length]); }}
                  aria-label="Next image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="thumbnail-gallery">
              {allImages.map((imgUrl, idx) => {
                const isCertificate = product.farmerOrganicUrl && imgUrl === product.farmerOrganicUrl;
                const isTraceability = product.traceabilityImageUrl && imgUrl === product.traceabilityImageUrl;
                const isPdf = getFileExtension(imgUrl) === "pdf";
                const isBroken = brokenImages[idx];

                return (
                  <div
                    key={idx}
                    className={`thumbnail-item ${activeImage === imgUrl ? "active" : ""} ${isCertificate ? "organic-cert-thumbnail" : ""} ${isTraceability ? "traceability-thumbnail" : ""}`}
                    onClick={() => setActiveImage(imgUrl)}
                  >
                    {isBroken ? (
                      <div className="thumbnail-placeholder-broken">
                        {isCertificate ? "📜" : isTraceability ? "🔍" : "🌾"}
                      </div>
                    ) : isPdf ? (
                      <div className="pdf-thumbnail-placeholder">
                        <span className="pdf-icon">📄</span>
                        <span className="pdf-text">PDF</span>
                      </div>
                    ) : (
                      <img
                        src={imgUrl}
                        alt={`Thumbnail ${idx + 1}`}
                        onError={() => setBrokenImages(prev => ({ ...prev, [idx]: true }))}
                      />
                    )}
                    {isCertificate && (
                      <div className="cert-mini-badge">
                        🌱 Chứng nhận
                      </div>
                    )}
                    {isTraceability && (
                      <div className="cert-mini-badge" style={{ backgroundColor: "#0284c7" }}>
                        🔍 Truy xuất
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Column - Product details */}
        <section className="product-info-section">
          <div className="product-title-row">
            <h1 className="product-title">{product.name}</h1>
            <button type="button" className="report-product-btn" onClick={handleReportProduct}>
              Báo cáo
            </button>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px", marginBottom: "12px" }}>
            {product.farmerOrganicUrl && (
              <span className="tag-pill tag-organic" style={{ 
                backgroundColor: "#e8f5e9", 
                color: "#2e7d32", 
                fontSize: "12px", 
                fontWeight: "700", 
                padding: "4px 10px", 
                borderRadius: "4px",
                border: "1px solid #c8e6c9",
                display: "inline-block"
              }}>
                Hữu cơ
              </span>
            )}
            {product.farmerVietgapUrl && (
              <span className="tag-pill tag-vietgap" style={{ 
                backgroundColor: "#e0f2fe", 
                color: "#0369a1", 
                fontSize: "12px", 
                fontWeight: "700", 
                padding: "4px 10px", 
                borderRadius: "4px",
                border: "1px solid #bae6fd",
                display: "inline-block"
              }}>
                VietGAP
              </span>
            )}
            {product.farmerGlobalgapUrl && (
              <span className="tag-pill tag-globalgap" style={{ 
                backgroundColor: "#fee2e2", 
                color: "#b91c1c", 
                fontSize: "12px", 
                fontWeight: "700", 
                padding: "4px 10px", 
                borderRadius: "4px",
                border: "1px solid #fecaca",
                display: "inline-block"
              }}>
                GlobalGAP
              </span>
            )}
          </div>

          <div className="rating-reviews-row">
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`rating-star-icon ${star <= Math.round(product.rating || 0) ? "filled" : ""}`}
                >
                  ★
                </span>
              ))}
            </div>
            <span
              className="rating-value-reviews"
              onClick={() => navigate(`/products/${product.id}/reviews`)}
              title="Xem tất cả đánh giá"
              style={{ cursor: "pointer" }}
            >
              {product.rating !== undefined && product.rating !== null ? product.rating.toFixed(1) : "0.0"} ({product.reviewsCount !== undefined && product.reviewsCount !== null ? product.reviewsCount : 0} đánh giá)
            </span>
          </div>

          <div className="price-display">
            <span className="price-amount">{formatPrice(product.price)}</span>
            <span className="price-unit">/ {product.unit === "bunch" ? "bó" : product.unit === "bag" ? "túi" : product.unit === "3lbs" ? "túi" : product.unit || "bó"}</span>
          </div>


          {/* Purchase Option Box */}
          <div className="purchase-options-card">
            <h3 className="purchase-label">Tùy chọn mua hàng</h3>

            <div className="purchase-controls-row">
              <div className="qty-selector">
                <button
                  className="qty-btn"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={product.stock === 0 || (parseInt(quantity, 10) || 1) <= 1}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <input
                  type="number"
                  className="qty-input"
                  value={quantity}
                  onChange={(e) => {
                    if (product.stock === 0) return;
                    const valStr = e.target.value;
                    if (valStr === "") {
                      setQuantity("");
                      return;
                    }
                    const val = parseInt(valStr, 10);
                    if (!isNaN(val)) {
                      const maxStock = product.stock !== undefined && product.stock !== null ? product.stock : 45;
                      if (val >= 1 && val <= maxStock) {
                        setQuantity(val);
                      } else if (val < 1) {
                        setQuantity(1);
                      } else if (val > maxStock) {
                        setQuantity(maxStock);
                      }
                    }
                  }}
                  onBlur={() => {
                    if (product.stock === 0) {
                      setQuantity(0);
                      return;
                    }
                    const parsed = parseInt(quantity, 10);
                    if (isNaN(parsed) || parsed < 1) {
                      setQuantity(1);
                    }
                  }}
                  min={product.stock === 0 ? "0" : "1"}
                  max={product.stock !== undefined && product.stock !== null ? product.stock : 45}
                  disabled={product.stock === 0}
                />
                <button
                  className="qty-btn"
                  onClick={() => handleQuantityChange(1)}
                  disabled={product.stock === 0 || (parseInt(quantity, 10) || 1) >= (product.stock !== undefined && product.stock !== null ? product.stock : 45)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              {product.stock === 0 ? (
                <span className="stock-status-info out-of-stock" style={{ color: "#dc2626", fontWeight: "700" }}>
                  Hết hàng
                </span>
              ) : (
                <span className="stock-status-info">
                  Còn hàng ({product.stock} {product.unit === "bunch" ? "bó" : product.unit === "bag" ? "túi" : product.unit === "3lbs" ? "túi" : product.unit || "bó"})
                </span>
              )}
            </div>


            <div className="action-buttons-group">
              {product.isPreorder ? (
                <button 
                  className="btn-buy-now btn-preorder-action" 
                  onClick={handlePreorderCheckoutDirect}
                  style={{ backgroundColor: "#15803d", borderColor: "#15803d", flex: "1 1 auto" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px" }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Đặt trước ngay (Preorder)
                </button>
              ) : (
                <>
                  <button 
                    className="btn-buy-now" 
                    onClick={handleBuyNow}
                    disabled={product.stock === 0}
                    style={product.stock === 0 ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                    Mua ngay
                  </button>

                  <button 
                    className="btn-add-to-cart" 
                    onClick={handleAddToCart}
                    disabled={product.stock === 0}
                    style={product.stock === 0 ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                      <line x1="12" y1="10" x2="16" y2="10"></line>
                      <line x1="14" y1="8" x2="14" y2="12"></line>
                    </svg>
                    Thêm vào giỏ hàng
                  </button>
                </>
              )}

              <button
                className={`btn-save-later ${isSaved ? "saved" : ""}`}
                onClick={handleSaveProduct}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                {isSaved ? "Đã lưu" : "Lưu lại"}
              </button>
            </div>
          </div>

          {/* Farm details box */}
          <div className="farmer-profile-card">
            <div className="farmer-header-info">
              <div className="farmer-avatar-wrapper">
                {product.farmerAvatarUrl ? (
                  <img
                    src={product.farmerAvatarUrl}
                    alt={product.farmerName}
                  />
                ) : (
                  <div className="farmer-avatar-fallback">
                    {product.farmerName ? product.farmerName.charAt(0).toUpperCase() : "N"}
                  </div>
                )}
              </div>
              <div className="farmer-title-box">
                <h4 className="farmer-name">{product.farmerName}</h4>
                <div className="farmer-location-row">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>{product.farmLocation}</span>
                </div>
              </div>
            </div>

            <p className="farmer-desc-text">{product.farmDescription}</p>

            <div className="farmer-card-actions">
              <button
                className="btn-contact-farmer-detail"
                onClick={() => {
                  const event = new CustomEvent("open_agrimarket_chat", {
                    detail: {
                      farmId: product.farmerId || "farm-xanh",
                      farmName: product.farmerName || "Nông trại Xanh",
                      farmAvatar: product.farmerAvatarUrl || product.farmerAvatar || "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=150",
                      phone: product.farmerPhone || "0912 345 678",
                      farmAddress: product.farmLocation || "Đà Lạt, Lâm Đồng"
                    }
                  });
                  window.dispatchEvent(event);
                }}
              >
                Nhắn tin
              </button>
              <button
                className="btn-view-farm-profile"
                onClick={() => navigate(`/farmer-profile/${product.farmerId}`)}
              >
                Xem hồ sơ nông trại →
              </button>
              <button
                className={`btn-follow-farmer ${isFarmerFollowed ? "followed" : ""}`}
                onClick={handleToggleFollowFarmer}
              >
                {isFarmerFollowed ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Check size={14} /> Đang theo dõi
                  </span>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Plus size={14} /> Theo dõi
                  </span>
                )}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Premium Product Details Section */}
      <section className="premium-details-section">
        <h2 className="premium-main-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FileText size={22} /> Thông tin chi tiết nông sản
        </h2>

        <div className="premium-grid-container">
          {/* CARD 1 - THÔNG TIN CƠ BẢN */}
          <div className="premium-card basic-card">
            <div className="premium-card-header">
              <div className="premium-header-icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="premium-header-svg">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div className="premium-header-title-box">
                <h3 className="premium-card-title">Thông tin cơ bản</h3>
                <p className="premium-card-subtitle">Thông tin tổng quan về sản phẩm</p>
              </div>
            </div>
            <div className="premium-header-green-line"></div>
            <div className="premium-card-content">
              <div className="premium-info-block">
                <div className="premium-info-icon-wrapper" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Tag size={18} /></div>
                <div className="premium-info-text-box">
                  <span className="premium-info-label">Tên sản phẩm</span>
                  <span className="premium-info-value">{product.name}</span>
                </div>
              </div>
              <div className="premium-info-block">
                <div className="premium-info-icon-wrapper" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Package size={18} /></div>
                <div className="premium-info-text-box">
                  <span className="premium-info-label">Danh mục</span>
                  <span className="premium-info-value">{product.category || "Rau củ quả tươi"}</span>
                </div>
              </div>
              <div className="premium-info-block">
                <div className="premium-info-icon-wrapper" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><User size={18} /></div>
                <div className="premium-info-text-box">
                  <span className="premium-info-label">Nhà vườn sản xuất</span>
                  <span className="premium-info-value">{product.farmerName || "Nông trại AgriMarket"}</span>
                </div>
              </div>
              <div className="premium-info-block">
                <div className="premium-info-icon-wrapper" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Scale size={18} /></div>
                <div className="premium-info-text-box">
                  <span className="premium-info-label">Quy cách đóng gói</span>
                  <span className="premium-info-value">{product.unit || "Sản phẩm"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2 - THÔNG TIN CHI TIẾT */}
          <div className="premium-card detail-card">
            <div className="premium-card-header">
              <div className="premium-header-icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="premium-header-svg">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  <path d="M9 12l2 2 4-4"></path>
                </svg>
              </div>
              <div className="premium-header-title-box">
                <h3 className="premium-card-title">Thông tin chi tiết sản phẩm</h3>
                <p className="premium-card-subtitle">Nguồn gốc và thông tin sản phẩm</p>
              </div>
            </div>
            <div className="premium-header-green-line"></div>
            <div className="premium-card-content">
              <div className={`premium-info-block premium-address-block`}>
                <div className="premium-info-icon-wrapper" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><MapPin size={18} /></div>
                <div className="premium-info-text-box premium-address-text-box">
                  <span className="premium-info-label">Nơi thu hoạch</span>
                  <span className="premium-info-value premium-address-value">
                    {product.farmLocation && product.farmLocation.length > 40 ? (
                      <>
                        <span className="premium-address-text-display">
                          {isAddressExpanded ? product.farmLocation : `${product.farmLocation.substring(0, 38)}...`}
                        </span>
                        <button type="button" className="premium-btn-toggle-address" onClick={() => setIsAddressExpanded(!isAddressExpanded)}>
                          {isAddressExpanded ? "Rút gọn ▴" : "Xem thêm ▾"}
                        </button>
                      </>
                    ) : (
                      <span className="premium-address-text-display">{product.farmLocation || "Lâm Đồng, Việt Nam"}</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="premium-info-block">
                <div className="premium-info-icon-wrapper" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Calendar size={18} /></div>
                <div className="premium-info-text-box">
                  <span className="premium-info-label">Ngày thu hoạch</span>
                  <span className="premium-info-value">{formatDate(product.harvestDate)}</span>
                </div>
              </div>
              <div className="premium-info-block">
                <div className="premium-info-icon-wrapper" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Hourglass size={18} /></div>
                <div className="premium-info-text-box">
                  <span className="premium-info-label">Hạn sử dụng</span>
                  <span className="premium-info-value">{formatDate(product.expirationDate)}</span>
                </div>
              </div>
              <div className="premium-info-block">
                <div className="premium-info-icon-wrapper" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Truck size={18} /></div>
                <div className="premium-info-text-box">
                  <span className="premium-info-label">Độ hư hỏng / Vận chuyển</span>
                  <span className="premium-info-value">{formatPerishability(product.perishability)}</span>
                </div>
              </div>
              <div className="premium-info-block">
                <div className="premium-info-icon-wrapper" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Globe size={18} /></div>
                <div className="premium-info-text-box">
                  <span className="premium-info-label">Khoảng cách giao</span>
                  <span className="premium-info-value">
                    {product.limitDistance ? `${product.limitDistance} km` : "Toàn quốc"}
                  </span>
                </div>
              </div>
              <div className="premium-info-block">
                <div className="premium-info-icon-wrapper" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Star size={18} /></div>
                <div className="premium-info-text-box">
                  <span className="premium-info-label">Tiêu chuẩn chất lượng</span>
                  <span className="premium-info-value">
                    {product.farmerOrganicUrl ? "Hữu cơ (Organic)" : product.farmerVietgapUrl ? "Tiêu chuẩn VietGAP" : product.farmerGlobalgapUrl ? "Tiêu chuẩn GlobalGAP" : "Nông sản sạch an toàn"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3 - CAM KẾT AGRIMARKET */}
          <div className="premium-commitment-card">
            <div className="premium-commitment-header">
              <div className="premium-header-icon-circle" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Award size={22} className="premium-header-svg" />
              </div>
              <div className="premium-header-title-box">
                <h3 className="premium-commitment-title">Cam kết từ AgriMarket</h3>
                <p className="premium-commitment-subtitle">Chúng tôi cam kết mang đến sản phẩm tốt nhất.</p>
              </div>
            </div>

            <div className="premium-commitment-content">
              <div className="premium-sub-commitment-card">
                <div className="premium-check-circle" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <Check size={10} strokeWidth={3} />
                </div>
                <div className="premium-commitment-text-box">
                  <h4 className="premium-sub-title">100% Tươi sạch tự nhiên</h4>
                  <p className="premium-sub-desc">Không chất bảo quản, không hóa chất.</p>
                </div>
              </div>
              <div className="premium-sub-commitment-card">
                <div className="premium-check-circle" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <Check size={10} strokeWidth={3} />
                </div>
                <div className="premium-commitment-text-box">
                  <h4 className="premium-sub-title">Đền bù nếu nông sản dập nát</h4>
                  <p className="premium-sub-desc">Hoàn tiền 100% nếu sản phẩm lỗi.</p>
                </div>
              </div>
              <div className="premium-sub-commitment-card">
                <div className="premium-check-circle" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <Check size={10} strokeWidth={3} />
                </div>
                <div className="premium-commitment-text-box">
                  <h4 className="premium-sub-title">Nhà vườn được xác minh</h4>
                  <p className="premium-sub-desc">Đảm bảo nguồn gốc rõ ràng.</p>
                </div>
              </div>
              <div className="premium-sub-commitment-card">
                <div className="premium-check-circle" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <Check size={10} strokeWidth={3} />
                </div>
                <div className="premium-commitment-text-box">
                  <h4 className="premium-sub-title">Quy trình vận chuyển an toàn</h4>
                  <p className="premium-sub-desc">Giữ nguyên chất lượng sản phẩm.</p>
                </div>
              </div>
            </div>

            <div className="premium-vector-footer">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="hills-vector">
                <path fill="#16A34A" fillOpacity="1" d="M0,224L60,202.7C120,181,240,139,360,144C480,149,600,203,720,202.7C840,203,960,149,1080,138.7C1200,128,1320,160,1380,176L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* CARD 4 - MÔ TẢ SẢN PHẨM (Full-width) */}
        <div className="premium-card description-card-full">
          <div className="premium-card-header">
            <div className="premium-header-icon-circle" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={22} className="premium-header-svg" />
            </div>
            <div className="premium-header-title-box">
              <h3 className="premium-card-title">Mô tả sản phẩm</h3>
              <p className="premium-card-subtitle">Chi tiết về đặc điểm và cách sử dụng</p>
            </div>
          </div>
          <div className="premium-header-green-line"></div>
          <div className="premium-card-content">
            <div className={`description-content-wrapper ${isDescExpanded ? 'expanded' : 'collapsed'}`}>
              <p className="description-text" style={{ whiteSpace: "pre-line" }}>
                {product.description || "Được canh tác trong lòng đất giàu dinh dưỡng hoàn toàn tự nhiên, không sử dụng thuốc trừ sâu hóa học. Nông sản hữu cơ mang hương vị ngọt thanh đặc trưng, thích hợp cho bữa ăn lành mạnh hàng ngày."}
              </p>
              {!isDescExpanded && <div className="description-fade-overlay"></div>}
            </div>
            <button type="button" className="btn-toggle-description" onClick={() => setIsDescExpanded(!isDescExpanded)}>
              {isDescExpanded ? "Thu gọn mô tả ▴" : "Xem thêm mô tả ▾"}
            </button>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="details-faq-accordion-section">
          <h2 className="faq-section-title-main" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <MessageCircle size={22} /> Câu hỏi thường gặp (FAQ)
          </h2>
          <div className="faq-accordion-container">
            {agriDetails.faq.map((faqItem, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className={`faq-accordion-item ${isOpen ? "open" : ""}`}>
                  <button className="faq-accordion-question" onClick={() => toggleFaq(idx)} aria-expanded={isOpen}>
                    <span>{faqItem.q}</span>
                    <span className="faq-arrow-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <ChevronDown size={18} style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                    </span>
                  </button>
                  <div className="faq-accordion-answer">
                    <div className="faq-answer-inner"><p>{faqItem.a}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </section>

      {/* Reviews Section */}
      <section className="product-reviews-section">
        <h2 className="reviews-section-title">Đánh giá từ khách hàng</h2>

        <div className="reviews-layout-grid">
          {/* Left Column: Overall stats & Review list */}
          <div className="reviews-list-column">
            <div className="reviews-summary-card">
              <div className="reviews-average-rating-box">
                <span className="reviews-average-score">{product.rating !== undefined && product.rating !== null ? product.rating.toFixed(1) : "0.0"}</span>
                <span className="reviews-average-max">/ 5</span>
              </div>
              <div className="reviews-summary-info">
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`rating-star-icon ${star <= Math.round(product.rating || 0) ? "filled" : ""}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="reviews-total-count">({product.reviewsCount !== undefined && product.reviewsCount !== null ? product.reviewsCount : 0} nhận xét từ khách mua hàng)</span>
              </div>
            </div>

            <div className="reviews-list-container">
              {reviewsList.length === 0 ? (
                <p className="no-reviews-text">Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên đánh giá!</p>
              ) : (
                reviewsList.slice(0, 3).map((rev) => (
                  <div key={rev.id} className="review-item-card">
                    <div className="review-item-header">
                      <div className="review-author-avatar">
                        {rev.author ? rev.author.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="review-author-meta">
                        <h4 className="review-author-name">{rev.author}</h4>
                        <div className="review-item-subline">
                          <div className="rating-stars mini">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={`rating-star-icon ${star <= rev.rating ? "filled" : ""}`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="review-item-date">{rev.date}</span>
                        </div>
                      </div>
                    </div>

                    {/* Hiển thị tag đánh giá */}
                    {rev.tags && rev.tags.length > 0 && (
                      <div className="detail-review-tags">
                        {rev.tags.map((tag, idx) => (
                          <span key={idx} className="detail-tag-badge" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Check size={12} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Hiển thị đánh giá chi tiết */}
                    {rev.specificRatings && Object.keys(rev.specificRatings).length > 0 && (
                      <div className="detail-specific-ratings">
                        {Object.entries(rev.specificRatings).map(([key, rating]) => {
                          if (!rating || rating === 0) return null;
                          let label = "";
                          switch (key) {
                            case "quality":
                              label = "Chất lượng";
                              break;
                            case "freshness":
                              label = "Độ tươi ngon";
                              break;
                            case "packaging":
                              label = "Đóng gói";
                              break;
                            case "delivery":
                              label = "Giao hàng";
                              break;
                            default:
                              label = key;
                          }
                          return (
                            <div key={key} className="detail-specific-rating-item">
                              <span className="detail-specific-label">{label}:</span>
                              <span className="detail-specific-stars">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span
                                    key={star}
                                    className={`rating-star-icon ${star <= rating ? "filled" : ""}`}
                                  >
                                    ★
                                  </span>
                                ))}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <p className="review-item-comment">{rev.comment}</p>

                    {/* Hiển thị hình ảnh đính kèm */}
                    {rev.images && rev.images.length > 0 && (
                      <div className="review-attached-gallery">
                        {rev.images.map((img, i) => (
                          <div key={i} className="review-gallery-thumb" onClick={() => window.open(img, "_blank")} title="Xem ảnh kích thước lớn">
                            <img src={img} alt={`Đánh giá đính kèm ${i}`} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Hiển thị video đính kèm */}
                    {rev.video && (
                      <div className="review-attached-video">
                        <video className="review-video-player" src={rev.video} controls preload="metadata" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {reviewsList.length > 0 && (
              <button
                type="button"
                className="btn-view-all-reviews"
                onClick={() => navigate(`/products/${product.id}/reviews`)}
                style={{ marginTop: "20px", display: "block" }}
              >
                Xem tất cả đánh giá →
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Related Products Section */}
      <section className="related-products-section">
        <h2 className="related-section-title">Sản phẩm khác từ nông trại này</h2>

        <div className="related-grid">
          {relatedProducts.map((p) => {
            const isRelatedSaved = savedRelatedIds.has(String(p.id));
            return (
              <div key={p.id} className="related-card">
                <div className="related-card-img-wrapper" onClick={() => navigate(`/products/${p.id}`)} style={{ cursor: "pointer" }}>
                  <img src={p.imageUrl} alt={p.name} className="related-card-img" />
                </div>

                <button
                  className={`related-save-btn ${isRelatedSaved ? "saved" : ""}`}
                  onClick={() => handleToggleSaveRelated(p.id, p.name)}
                  aria-label="Save for later"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={isRelatedSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </button>

                <div className="related-card-body">
                  <h3 className="related-card-title" onClick={() => navigate(`/products/${p.id}`)} style={{ cursor: "pointer" }}>
                    {p.name}
                  </h3>

                  <div className="related-card-price-row">
                    <div className="related-card-price-box">
                      <span className="related-card-price">{formatPrice(p.price)}</span>
                      <span className="related-card-unit">/ {p.unit === "bunch" ? "bó" : p.unit === "bag" ? "túi" : p.unit === "3lbs" ? "túi" : p.unit || "bó"}</span>
                    </div>

                    <button
                      className="related-add-cart-btn"
                      onClick={() => handleAddRelatedToCart(p)}
                      aria-label="Add to cart"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer Sync from Home */}
      <Footer />

      {/* Lightbox Modal overlay */}
      {isLightboxOpen && allImages.length > 0 && (
        <div
          className="lightbox-backdrop"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            className="lightbox-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(false);
            }}
            aria-label="Đóng"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* Previous Arrow */}
          {allImages.length > 1 && (
            <button
              className="lightbox-arrow-btn lightbox-arrow-left"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
              }}
              aria-label="Ảnh trước"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          )}

          {/* Image Container */}
          <div
            className="lightbox-image-container"
            onClick={(e) => e.stopPropagation()}
          >
            {getFileExtension(allImages[lightboxIndex]) === "pdf" ? (
              <iframe
                src={allImages[lightboxIndex]}
                title="Certificate Full PDF"
                className="lightbox-pdf-view"
              />
            ) : (
              <img
                src={allImages[lightboxIndex]}
                alt={`${product.name} Fullscreen`}
                className="lightbox-main-img"
              />
            )}
          </div>

          {/* Next Arrow */}
          {allImages.length > 1 && (
            <button
              className="lightbox-arrow-btn lightbox-arrow-right"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
              }}
              aria-label="Ảnh sau"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          )}

          {/* Bottom Controls Panel */}
          <div
            className="lightbox-bottom-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lightbox-counter">
              {product.farmerOrganicUrl && allImages[lightboxIndex] === product.farmerOrganicUrl ? (
                <span>🌱 Giấy chứng nhận hữu cơ ({lightboxIndex + 1} / {allImages.length})</span>
              ) : (
                <span>Hình ảnh sản phẩm ({lightboxIndex + 1} / {allImages.length})</span>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="lightbox-thumbnails-strip">
                {allImages.map((imgUrl, idx) => {
                  const isCertificate = product.farmerOrganicUrl && imgUrl === product.farmerOrganicUrl;
                  const isPdf = getFileExtension(imgUrl) === "pdf";

                  return (
                    <div
                      key={idx}
                      className={`lightbox-thumbnail-item ${lightboxIndex === idx ? "active" : ""} ${isCertificate ? "cert-item" : ""}`}
                      onClick={() => setLightboxIndex(idx)}
                    >
                      {isPdf ? (
                        <div className="lightbox-thumbnail-pdf-placeholder">📄 PDF</div>
                      ) : (
                        <img src={imgUrl} alt={`Thumb ${idx + 1}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Action Toast Notification */}
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
