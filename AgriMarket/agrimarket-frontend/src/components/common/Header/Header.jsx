import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import authService from "../../../services/authService";
import cartService from "../../../services/cartService";
import { getAllApprovedProducts } from "../../../services/productService";
import aiService from "../../../services/aiService";
import NotificationBell from "../NotificationBell/NotificationBell";
import VoiceSearchModal from "./VoiceSearchModal";
import ImageSearchModal from "./ImageSearchModal";
import "./Header.css";

const Header = ({ activeTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [allProducts, setAllProducts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  // Voice & Image Search Modal States
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // State 2 UI Dropdown visibility
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  // Profile dropdown state
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // State 3: Filter sub-bar dropdown toggle states
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  // References for clicking outside to close
  const wrapperRef = useRef(null);
  const filterRef = useRef(null);
  const profileRef = useRef(null);

  // Active filter local states synchronized with URL
  const [activeFilterTab, setActiveFilterTab] = useState("all");
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedRating, setSelectedRating] = useState(0);

  // Mock list of popular search tags (Vietnamese agricultural specialties)
  const popularTags = [
    { name: "Xoài cát hòa lộc", icon: "🥭" },
    { name: "Măng cụt Lái Thiêu", icon: "🍇" },
    { name: "Sầu riêng Ri6", icon: "👑" },
    { name: "Dưa lưới ôn đới", icon: "🍈" },
    { name: "Mật ong hoa cà phê", icon: "🍯" },
    { name: "Bơ sáp Đắk Lắk", icon: "🥑" }
  ];

  // Mock list of active livestreams
  const mockLives = [
    {
      id: "live_1",
      name: "Nông trại xanh Đà Lạt",
      description: "Rau củ tươi ngon mỗi ngày",
      viewers: "1.2K",
      imageUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=300&auto=format&fit=crop"
    },
    {
      id: "live_2",
      name: "Vườn trái cây miền Tây",
      description: "Xoài, cam, bưởi sạch",
      viewers: "856",
      imageUrl: "https://images.unsplash.com/photo-1610348725531-843dff163e2c?q=80&w=300&auto=format&fit=crop"
    },
    {
      id: "live_3",
      name: "Farm Organic",
      description: "Nông sản hữu cơ chuẩn VietGAP",
      viewers: "623",
      imageUrl: "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?q=80&w=300&auto=format&fit=crop"
    }
  ];

  const regionsList = [
    "Đà Lạt", "Lâm Đồng", "Tiền Giang", "Bến Tre", "Đắk Lắk",
    "Đồng Tháp", "Vĩnh Long", "Cần Thơ", "Hồ Chí Minh", "Hà Nội"
  ];

  // Auth & Cart synchronization
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);

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

    // Listen for custom event to update cart count when item is added/removed
    const handleCartUpdate = () => {
      fetchCartCount();
    };
    window.addEventListener("cartUpdated", handleCartUpdate);

    // Load recent searches from localStorage
    const savedSearches = JSON.parse(localStorage.getItem("recent_searches")) || [];
    setRecentSearches(savedSearches);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, []);

  // Sync state with URL search parameters
  useEffect(() => {
    const q = searchParams.get("search") || "";
    setSearchQuery(q);

    // Sync filter states from URL params
    const category = searchParams.get("category") || "";
    if (category) {
      if (category === "Rau củ quả" || category === "Trái cây") {
        setActiveFilterTab("product");
      } else {
        setActiveFilterTab("all");
      }
    } else {
      setActiveFilterTab("all");
    }

    const locs = searchParams.get("locations");
    setSelectedLocations(locs ? locs.split(",") : []);

    setPriceMin(searchParams.get("priceMin") || "");
    setPriceMax(searchParams.get("priceMax") || "");
    setSelectedRating(Number(searchParams.get("rating")) || 0);
  }, [searchParams]);

  // Load products for suggestions
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await getAllApprovedProducts();
        setAllProducts(data);
      } catch (err) {
        console.error("Lỗi tải sản phẩm cho gợi ý tìm kiếm:", err);
      }
    };
    loadProducts();
  }, []);

  // Clicks outside handlers
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setIsRegionOpen(false);
        setIsPriceOpen(false);
        setIsRatingOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Search input typing handler
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  const getSuggestionsList = () => {
    if (!searchQuery.trim()) {
      return ["Xoài cát hòa lộc", "Cam sành", "Rau cải hữu cơ", "Sầu riêng thái", "Gạo lứt đỏ"];
    }
    const filtered = allProducts
      .filter((p) => p.name?.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((p) => p.name)
      .slice(0, 5);
    return filtered.length > 0 ? filtered : [searchQuery];
  };

  // Perform search and save query to recent searches
  const executeSearch = (query) => {
    setShowSearchDropdown(false);

    if (query.trim()) {
      const updated = [query, ...recentSearches.filter((item) => item !== query)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("recent_searches", JSON.stringify(updated));
    }

    const currentParams = new URLSearchParams(searchParams);
    if (query.trim()) {
      currentParams.set("search", query);
    } else {
      currentParams.delete("search");
    }
    setSearchParams(currentParams);
    navigate(`/products/listing?${currentParams.toString()}`);
  };

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter") {
      executeSearch(searchQuery);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    const currentParams = new URLSearchParams(searchParams);
    currentParams.delete("search");
    setSearchParams(currentParams);
    navigate(`/products/listing?${currentParams.toString()}`);
  };

  const handleVoiceSearchResult = (aiResult) => {
    if (!aiResult) return;

    const currentParams = new URLSearchParams(searchParams);

    if (aiResult.search) {
      let cleanedSearch = aiResult.search.replace(/[\.,\?!;:]/g, " ").trim();
      let changed = true;
      while (changed) {
        let prev = cleanedSearch;
        cleanedSearch = cleanedSearch.replace(/^(bây giờ|hiện tại|hôm nay|cho|cho tôi|cho em|cho mình|tôi|mình|em|bạn|ơi|vui lòng|làm ơn|giúp|giúp tôi|giúp mình|xin|có thể|tôi cần|em cần|mình cần|tôi muốn|em muốn|mình muốn|muốn|cần|thích|đang|định|tùy|muốn tìm|muốn mua|cần tìm|cần mua|hãy tìm|tìm|mua|xem|kiếm|tra|lọc|cho xem|cho tìm|tìm kiếm|tìm mua|tìm giúp|tìm cho|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mấy|vài|những|các|sản phẩm|nông sản|mặt hàng|món|loại|danh mục|trái|quả|củ|rau|cái|bắp|dĩa|kg|ký|cây|hạt|nhánh|nải|bụi|bao|túi|hộp|chùm|nốt|con|bó|bịch)\s+/i, "").trim();
        if (prev.toLowerCase() === cleanedSearch.toLowerCase()) {
          changed = false;
        }
      }
      changed = true;
      while (changed) {
        let prev = cleanedSearch;
        cleanedSearch = cleanedSearch.replace(/\s+(sành|vinh|đường|mật|mèo|ri6|thái|cát hòa lộc|cát|keo|tượng|sáp|034|hass|da xanh|ruột đỏ|ruột trắng|vỏ vàng|hắc mỹ nhân|không hạt|bi|baby|nếp|chỉ thiên|chuông|hạt tiêu|nhật|quả dài|tròn|mỹ|úc|nhập khẩu|xuất khẩu|ninh thuận|đà lạt|tiền giang|đắk lắk|miền tây|bến tre|giá rẻ|giá rẻ nhất|giá tốt|giá bình dân|rẻ nhất|rẻ|tươi ngon|tươi|ngon|chất lượng|sạch|ngon bổ rẻ|loại 1|ưu đãi|hấp dẫn|có được không|được không|được không ạ|có không|không ạ|không nhỉ|gì đó|nè|à|nhỉ|với|ạ|với ạ|nha|nhé|dùm|dùm tôi|giúp tôi|giúp mình|không|với nào|đó)$/i, "").trim();
        if (prev.toLowerCase() === cleanedSearch.toLowerCase()) {
          changed = false;
        }
      }

      const finalSearch = cleanedSearch || aiResult.search;
      setSearchQuery(finalSearch);
      currentParams.set("search", finalSearch);
    } else {
      setSearchQuery("");
      currentParams.delete("search");
    }

    if (aiResult.category) {
      currentParams.set("category", aiResult.category);
    } else {
      currentParams.delete("category");
    }

    if (aiResult.location) {
      currentParams.set("locations", aiResult.location);
    } else {
      currentParams.delete("locations");
    }

    if (aiResult.minPrice) {
      currentParams.set("priceMin", aiResult.minPrice);
    } else {
      currentParams.delete("priceMin");
    }

    if (aiResult.maxPrice) {
      currentParams.set("priceMax", aiResult.maxPrice);
    } else {
      currentParams.delete("priceMax");
    }

    if (aiResult.sort) {
      currentParams.set("sort", aiResult.sort);
    }

    setSearchParams(currentParams);
    navigate(`/products/listing?${currentParams.toString()}`);
  };

  const handleImageSearchResult = (aiResult) => {
    if (!aiResult) return;
    const currentParams = new URLSearchParams(searchParams);
    let rawKeyword = aiResult.search || aiResult.recognizedProduct || "";
    if (rawKeyword) {
      let cleaned = rawKeyword.replace(/[\.,\?!;:]/g, " ").trim();
      let changed = true;
      while (changed) {
        let prev = cleaned;
        cleaned = cleaned.replace(/^(bây giờ|hiện tại|hôm nay|cho|cho tôi|cho em|cho mình|tôi|mình|em|bạn|ơi|vui lòng|làm ơn|giúp|giúp tôi|giúp mình|xin|có thể|tôi cần|em cần|mình cần|tôi muốn|em muốn|mình muốn|muốn|cần|thích|đang|định|tùy|muốn tìm|muốn mua|cần tìm|cần mua|hãy tìm|tìm|mua|xem|kiếm|tra|lọc|cho xem|cho tìm|tìm kiếm|tìm mua|tìm giúp|tìm cho|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mấy|vài|những|các|sản phẩm|nông sản|mặt hàng|món|loại|danh mục|trái|quả|củ|rau|cái|bắp|dĩa|kg|ký|cây|hạt|nhánh|nải|bụi|bao|túi|hộp|chùm|nốt|con|bó|bịch)\s+/i, "").trim();
        if (prev.toLowerCase() === cleaned.toLowerCase()) {
          changed = false;
        }
      }
      changed = true;
      while (changed) {
        let prev = cleaned;
        cleaned = cleaned.replace(/\s+(giá rẻ|giá rẻ nhất|giá tốt|giá bình dân|rẻ nhất|rẻ|tươi ngon|tươi|ngon|chất lượng|sạch|ngon bổ rẻ|loại 1|ưu đãi|hấp dẫn|có được không|được không|được không ạ|có không|không ạ|không nhỉ|gì đó|nè|à|nhỉ|với|ạ|với ạ|nha|nhé|dùm|dùm tôi|giúp tôi|giúp mình|không|với nào|đó)$/i, "").trim();
        if (prev.toLowerCase() === cleaned.toLowerCase()) {
          changed = false;
        }
      }
      const searchKeyword = cleaned || rawKeyword;
      currentParams.set("search", searchKeyword);
      setSearchQuery(searchKeyword);
    }
    if (aiResult.category) {
      currentParams.set("category", aiResult.category);
    }
    currentParams.set("isImageSearch", "true");
    setSearchParams(currentParams);
    navigate(`/products/listing?${currentParams.toString()}`);
  };

  const processVoiceText = async (text) => {
    if (!text || !text.trim()) return;
    setIsVoiceAnalyzing(true);
    try {
      const result = await aiService.parseVoiceSearch(text);
      setIsVoiceAnalyzing(false);
      handleVoiceSearchResult(result);
    } catch (err) {
      console.error("Lỗi AI voice search:", err);
      setIsVoiceAnalyzing(false);
      executeSearch(text);
    }
  };

  const handleMicClick = () => {
    if (isVoiceListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { }
      }
      setIsVoiceListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Trình duyệt của bạn không hỗ trợ tìm kiếm bằng giọng nói. Vui lòng dùng Chrome hoặc Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsVoiceListening(true);
    };

    recognition.onresult = (event) => {
      let currentTranscript = "";
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          isFinal = true;
        }
      }
      if (currentTranscript) {
        setSearchQuery(currentTranscript);
      }
      if (isFinal && currentTranscript.trim()) {
        processVoiceText(currentTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsVoiceListening(false);
    };

    recognition.onend = () => {
      setIsVoiceListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.warn("Speech start error:", e);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    navigate("/");
    window.location.reload();
  };

  // Synchronize dynamic filter parameters to URL
  const updateFilterParams = (key, value) => {
    const currentParams = new URLSearchParams(searchParams);
    if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
      currentParams.delete(key);
    } else {
      currentParams.set(key, Array.isArray(value) ? value.join(",") : value);
    }
    setSearchParams(currentParams);

    // Redirect to listing if not already there
    if (!location.pathname.startsWith("/products/listing")) {
      navigate(`/products/listing?${currentParams.toString()}`);
    }
  };

  // Filter Sub-bar Handlers
  const handleTabClick = (tab) => {
    setActiveFilterTab(tab);
    if (tab === "product") {
      updateFilterParams("category", "Rau củ quả");
    } else if (tab === "farm") {
      // Redirect to farms list page
      navigate("/farms");
    } else if (tab === "live") {
      // Redirect to livestreams listing
      navigate("/livestream");
    } else {
      updateFilterParams("category", "");
    }
  };

  const handleRegionSelect = (region) => {
    let nextLocations = [...selectedLocations];
    if (nextLocations.includes(region)) {
      nextLocations = nextLocations.filter((r) => r !== region);
    } else {
      nextLocations.push(region);
    }
    setSelectedLocations(nextLocations);
    updateFilterParams("locations", nextLocations);
  };

  const handlePriceApply = () => {
    setIsPriceOpen(false);
    updateFilterParams("priceMin", priceMin);
    updateFilterParams("priceMax", priceMax);
  };

  const handleRatingSelect = (ratingVal) => {
    const newVal = selectedRating === ratingVal ? 0 : ratingVal;
    setSelectedRating(newVal);
    updateFilterParams("rating", newVal > 0 ? newVal : "");
    setIsRatingOpen(false);
  };

  const role = user?.role?.toLowerCase();
  const isSearchPage = location.pathname.startsWith("/products/listing") || searchParams.has("search");
  const isHomepage = location.pathname === "/" || location.pathname === "/home";

  // Left navbar tabs
  const navLinks = [
    {
      id: "home", label: "Trang chủ", path: "/", icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: "farms", label: "Nông trại", path: "/farms", icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: "preorder", label: "Đặt trước", path: "/preorders", icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: "live", label: "Phiên Live", path: "/livestream", hasBadge: true, icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: "support", label: "Hỗ trợ", path: "/support", icon: (
        <svg className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    }
  ];

  return (
    <header className="home-header">
      {/* 1. Main Navbar Row */}
      <div className="header-main-row">

        <div className="header-left">
          {/* Logo */}
          <div className="header-logo" onClick={() => navigate("/")}>
            <div className="logo-tractor-circle">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="7" cy="18" r="2"></circle>
                <circle cx="18" cy="18" r="2"></circle>
                <path d="M7 16h11v-2H9v-3h7V9H9V6H7v10z"></path>
                <path d="M16 9h3l2 3v4"></path>
              </svg>
            </div>
            <div className="logo-text-group">
              <span className="logo-title">AgriMarket</span>
              <span className="logo-subtitle">Nông sản sạch cho mọi nhà</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="header-nav">
            {role !== "admin" &&
              navLinks.map((link) => (
                <div key={link.id} className="nav-item-wrapper">
                  <Link
                    to={link.path}
                    className={`nav-link-pill ${activeTab === link.id ||
                      (link.id === "home" && activeTab === undefined && isHomepage)
                      ? "active"
                      : ""
                      }`}
                  >
                    {link.icon}
                    <span className="nav-label">{link.label}</span>
                  </Link>
                  {link.hasBadge && <span className="nav-live-badge">LIVE</span>}
                </div>
              ))}
          </nav>
        </div>

        <div className="header-center">
          {/* Search Bar Capsule Wrapper */}
          <div className="header-search-wrapper" ref={wrapperRef}>
            <div className={`search-capsule-container ${showSearchDropdown ? "active" : ""}`}>
              <button className="search-prefix-btn" onClick={() => executeSearch(searchQuery)} type="button" aria-label="Tìm kiếm">
                <svg
                  className="search-input-prefix-icon"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <input
                type="text"
                className="search-capsule-input"
                placeholder="Tìm rau sạch, trái cây, nông trại, phiên Live..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchSubmit}
                onFocus={() => setShowSearchDropdown(true)}
              />
              {searchQuery && (
                <button className="search-input-clear-btn" onClick={handleClearSearch} aria-label="Xóa tìm kiếm">
                  <svg className="search-clear-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className="search-camera-trigger-btn"
                onClick={() => setIsImageModalOpen(true)}
                title="Tìm kiếm bằng hình ảnh AI"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                type="button"
                className="search-voice-trigger-btn"
                onClick={() => setIsVoiceModalOpen(true)}
                title="Tìm kiếm bằng giọng nói AI"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                </svg>
              </button>
            </div>

            {/* State 2: Dropdown 2-Column Card Overlay */}
            {showSearchDropdown && (
              <div className="search-overlay-dropdown-card">
                {/* Column 1: Gợi ý tìm kiếm */}
                <div className="search-dropdown-col">
                  <h4 className="dropdown-col-title">Gợi ý tìm kiếm</h4>
                  <ul className="dropdown-col-list">
                    {getSuggestionsList().map((term, index) => (
                      <li key={index}>
                        <button className="dropdown-list-item-btn" onClick={() => executeSearch(term)}>
                          <svg className="list-item-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          {term}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Column 2: Tìm kiếm gần đây */}
                <div className="search-dropdown-col">
                  <h4 className="dropdown-col-title">Tìm kiếm gần đây</h4>
                  <ul className="dropdown-col-list">
                    {(recentSearches.length > 0
                      ? recentSearches
                      : ["Rau sạch Đà Lạt", "Gạo ST25", "Sầu riêng Ri6", "Cam sành Vĩnh Long", "Phiên Live nông trại"]
                    ).map((term, index) => (
                      <li key={index}>
                        <button className="dropdown-list-item-btn" onClick={() => executeSearch(term)}>
                          <svg className="list-item-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {term}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="header-right">
          {/* Right Side Action Icons */}
          <div className="header-actions">
            {/* Cart Icon */}
            {role !== "admin" && (
              <button className="round-action-btn" aria-label="Giỏ hàng" onClick={() => navigate("/cart")}>
                <svg
                  className="action-icon"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartItemsCount > 0 && (
                  <span className="cart-badge">{cartItemsCount}</span>
                )}
              </button>
            )}

            {/* Bell Icon (Thông báo) */}
            {user && <NotificationBell user={user} />}

            {/* Profile & Auth dropdown */}
            {user ? (
              <div className="nav-item-wrapper" ref={profileRef}>
                <div className="profile-card-trigger" onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} className="profile-avatar-circle" />
                  ) : (
                    <div className="profile-avatar-circle">
                      {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                  <span className="profile-card-name">{user.fullName}</span>
                </div>

                {isProfileDropdownOpen && (
                  <div className="profile-dropdown-menu">
                    <button
                      className="profile-dropdown-item"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        navigate("/profile");
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Vào trang cá nhân
                    </button>
                    {user.role === 'farmer' && (
                      <button
                        className="profile-dropdown-item"
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          navigate("/farmer/dashboard");
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Kênh nhà vườn
                      </button>
                    )}
                    <button
                      className="profile-dropdown-item logout"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        handleLogout();
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="search-submit-pill-btn" onClick={() => navigate("/login")}>
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </div>




      <VoiceSearchModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSearchParsed={handleVoiceSearchResult}
      />

      <ImageSearchModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSearchParsed={handleImageSearchResult}
      />
    </header>
  );
};

export default Header;
