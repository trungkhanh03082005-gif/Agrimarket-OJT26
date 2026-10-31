import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CreditCard, ArrowLeft, Check, ArrowRight, MapPin, AlertTriangle, Sprout, Package, Banknote, Lock, ShoppingCart, XCircle } from "lucide-react";
import authService from "../../services/authService";
import cartService from "../../services/cartService";
import profileService from "../../services/profileService";
import * as addressService from "../../services/addressService";
import { buildProfileUpdatePayload } from "../../utils/profileMapper";
import orderService from "../../services/orderService";
import Footer from "../../components/common/Footer/Footer";
import "./CheckoutPage.css";
import Header from "../../components/common/Header/Header";
import { MapPicker } from "../../components/MapPicker/MapPicker";
import apiClient from "../../services/apiClient";
import SearchableSelect from "../../components/common/SearchableSelect/SearchableSelect";

// Geocode address using Nominatim (sequential to avoid rate-limiting)
const geocodeAddressIfNeeded = async (addressStr) => {
    if (!addressStr) return null;
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressStr)}&format=json&limit=1`, {
            headers: {
                "User-Agent": "AgriMarket-Application/1.0",
            }
        });
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                return {
                    latitude: parseFloat(data[0].lat),
                    longitude: parseFloat(data[0].lon)
                };
            }
        }
    } catch (e) {
        console.error("Geocoding failed for address:", addressStr, e);
    }
    return null;
};

// Calculate distance in km between two GPS coordinates using Haversine formula
const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const INITIAL_ORDERS = [
    {
        id: "FH-2024-8892",
        status: "delivered",
        statusLabel: "Đã giao",
        date: "12 thg 10, 2024",
        time: "10:24 SA",
        amount: 3562500,
        itemCount: 6,
        provider: {
            name: "Nông trại hữu cơ Thung lũng Xanh",
            avatarText: "TX",
            avatarBg: "#1b5e20",
        },
        thumbnails: [
            "https://images.unsplash.com/photo-1445280471656-618bf9abcfe0?w=200",
            "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=200",
            "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200"
        ],
        hasMoreItems: 3,
    },
    {
        id: "FH-2024-9104",
        status: "shipping",
        statusLabel: "Đang vận chuyển",
        date: "14 thg 10, 2024",
        time: "03:15 CH",
        amount: 2150000,
        itemCount: 2,
        provider: {
            name: "Nhà máy bơ sữa thủ công Hillside",
            avatarText: "HS",
            avatarBg: "#0d47a1",
        },
        thumbnails: [
            "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200",
            "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200"
        ],
        hasMoreItems: 0,
    },
    {
        id: "FH-2024-7721",
        status: "cancelled",
        statusLabel: "Đã hủy",
        date: "05 thg 10, 2024",
        time: "09:12 SA",
        amount: 1127500,
        itemCount: 3,
        provider: {
            name: "Hợp tác xã Vườn Nắng",
            avatarText: "VN",
            avatarBg: "#e65100",
        },
        thumbnails: ["https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200"],
        hasMoreItems: 2,
    }
];

export default function CheckoutPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);

    // Checkout data from localStorage
    const [checkoutData, setCheckoutData] = useState(null);

    // Page-level loading state
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // Form inputs
    const [recipientName, setRecipientName] = useState("");
    const [recipientPhone, setRecipientPhone] = useState("");
    const [recipientAddress, setRecipientAddress] = useState("");
    const [shippingNote, setShippingNote] = useState("");

    // Address selection states
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [addrProvince, setAddrProvince] = useState({ code: "", name: "" });
    const [addrDistrict, setAddrDistrict] = useState({ code: "", name: "" });
    const [addrWard, setAddrWard] = useState({ code: "", name: "" });
    const [addrStreet, setAddrStreet] = useState("");
    const [profileData, setProfileData] = useState(null);
    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressIndex, setSelectedAddressIndex] = useState(-1);
    const [showAddressSelector, setShowAddressSelector] = useState(false);

    // Payment method
    const [paymentMethod, setPaymentMethod] = useState("cod"); // cod, vnpay

    // Promotions states
    const [promotions, setPromotions] = useState([]);
    const [selectedPromo, setSelectedPromo] = useState(null);
    const [promoError, setPromoError] = useState("");
    const [usedPromoCodes, setUsedPromoCodes] = useState([]);

    // Form Validation errors
    const [errors, setErrors] = useState({});

    // Custom error modal state
    const [errorModal, setErrorModal] = useState({ show: false, title: "", message: "", detail: "" });

    // Success State (Used for COD)
    const [isSuccess, setIsSuccess] = useState(false);
    const [placedOrder, setPlacedOrder] = useState(null);
    const [cartItemsCount, setCartItemsCount] = useState(0);
    
    // Farmer coordinates & max shipping distance for all checkout items
    const [itemsDeliveryInfo, setItemsDeliveryInfo] = useState([]);

    // Generate static order ID on component load for tracking
    const orderId = useMemo(() => {
        return "FH-2026-" + Math.floor(1000 + Math.random() * 9000);
    }, []);

    // Format VND
    const formatVND = (price) => {
        return new Intl.NumberFormat("vi-VN").format(price) + " đ";
    };

    // Helper to get distance & validity info for an address
    const getAddressDistanceInfo = (addr) => {
        if (itemsDeliveryInfo.length === 0 || addr.latitude == null || addr.longitude == null) {
            return { distance: null, isValid: true, message: "", invalidDetails: [] };
        }

        let overallValid = true;
        const invalidDetails = [];
        let maxDistanceVal = 0;

        for (const item of itemsDeliveryInfo) {
            if (item.latitude == null || item.longitude == null) {
                continue;
            }
            const dist = getHaversineDistance(
                parseFloat(addr.latitude),
                parseFloat(addr.longitude),
                item.latitude,
                item.longitude
            );
            if (dist === null) continue;

            if (dist > maxDistanceVal) {
                maxDistanceVal = dist;
            }

            const isItemValid = dist <= item.maxDistance;
            if (!isItemValid) {
                overallValid = false;
                invalidDetails.push(`${item.productName} (Khoảng cách: ${dist.toFixed(1)} km, giới hạn: ${item.maxDistance} km)`);
            }
        }

        if (maxDistanceVal === 0 && itemsDeliveryInfo.every(item => item.latitude == null || item.longitude == null)) {
            return { distance: null, isValid: true, message: "", invalidDetails: [] };
        }

        let message = "";
        if (overallValid) {
            message = `Khoảng cách: ${maxDistanceVal.toFixed(1)} km (Hợp lệ)`;
        } else {
            message = `Vượt giới hạn giao hàng của: ${invalidDetails.join(", ")}`;
        }

        return {
            distance: maxDistanceVal.toFixed(1),
            isValid: overallValid,
            message,
            invalidDetails
        };
    };

    // Calculate active selected address distance info
    const activeDistanceInfo = useMemo(() => {
        if (selectedAddressIndex !== -1) {
            const addr = savedAddresses[selectedAddressIndex];
            if (addr) {
                return getAddressDistanceInfo(addr);
            }
        } else {
            if (latitude != null && longitude != null) {
                return getAddressDistanceInfo({ latitude, longitude });
            }
        }
        return { distance: null, isValid: true, message: "", invalidDetails: [] };
    }, [selectedAddressIndex, savedAddresses, latitude, longitude, itemsDeliveryInfo]);

    // Fetch farmer coordinates & max delivery distance for all selected items when checkoutData is loaded
    useEffect(() => {
        if (checkoutData && checkoutData.selectedItems && checkoutData.selectedItems.length > 0) {
            const fetchAllItemsCoords = async () => {
                try {
                    const promises = checkoutData.selectedItems.map(async (item) => {
                        try {
                            const res = await apiClient.get(`/api/products/${item.id}`);
                            if (res && res.data) {
                                const lat = res.data.farmerLatitude;
                                const lng = res.data.farmerLongitude;
                                const maxDist = res.data.limitDistance || res.data.farmerMaxDeliveryDistance || 15.0;
                                return {
                                    productId: item.id,
                                    productName: item.name,
                                    latitude: lat != null ? parseFloat(lat) : null,
                                    longitude: lng != null ? parseFloat(lng) : null,
                                    maxDistance: maxDist != null ? parseFloat(maxDist) : 15.0,
                                    farmName: res.data.farmerName || ""
                                };
                            }
                        } catch (err) {
                            console.error(`Lỗi khi lấy thông tin toạ độ sản phẩm ${item.id}:`, err);
                        }
                        return null;
                    });
                    const results = await Promise.all(promises);
                    const filtered = results.filter(Boolean);
                    setItemsDeliveryInfo(filtered);
                    console.log("Loaded delivery info for checkout items:", filtered);
                } catch (err) {
                    console.error("Lỗi khi load toạ độ giao hàng của các sản phẩm:", err);
                }
            };
            fetchAllItemsCoords();
        }
    }, [checkoutData]);

    useEffect(() => {
        const init = async () => {
            setIsPageLoading(true);
            // Load user session
            const currentUser = authService.getCurrentUser();
            setUser(currentUser);
            if (currentUser) {
                setRecipientName(currentUser.fullName || "");
            }

            // Load checkout data
            const data = localStorage.getItem("agrimarket_checkout");
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed.discountAmount === undefined) {
                    parsed.discountAmount = 0;
                }
                parsed.totalAmount = parsed.subtotal + (parsed.serviceFee || 0) + (parsed.shippingFee || 0) - parsed.discountAmount;
                setCheckoutData(parsed);
            }

            // Load cart count
            const loadLocalCartCount = () => {
                const savedCart = JSON.parse(localStorage.getItem("agrimarket_cart")) || [];
                setCartItemsCount(savedCart.length);
            };

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

            setIsPageLoading(false);
        };
        init();
    }, [isSuccess]);

    useEffect(() => {
        const fetchUsedPromotions = async () => {
            try {
                const res = await apiClient.get('/api/orders/used-promotions');
                if (res && res.data) {
                    setUsedPromoCodes(res.data);
                }
            } catch (err) {
                console.error("Lỗi khi tải danh sách khuyến mãi đã sử dụng:", err);
            }
        };

        const fetchPromotions = async () => {
            try {
                const response = await apiClient.get('/api/admin/promotions');
                const now = new Date();

                // Get farmer IDs from localStorage checkout items
                let cartFarmerIds = new Set();
                const savedCheckout = localStorage.getItem("agrimarket_checkout");
                if (savedCheckout) {
                    try {
                        const parsed = JSON.parse(savedCheckout);
                        if (parsed && parsed.selectedItems) {
                            parsed.selectedItems.forEach(item => {
                                const fid = item.farmerId || item.providerId;
                                if (fid) cartFarmerIds.add(String(fid));
                            });
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }

                const active = response.data.filter(p => {
                    const start = new Date(p.startDate);
                    const end = new Date(p.endDate);
                    const isTimeActive = p.status === 'active' || (now >= start && now <= end);
                    if (!isTimeActive) return false;

                    // Keep if system promotion OR matches a farmer in the cart
                    return !p.farmerId || cartFarmerIds.has(String(p.farmerId));
                });
                setPromotions(active);
            } catch (e) {
                console.error("Lỗi khi tải danh sách khuyến mãi:", e);
            }
        };
        fetchPromotions();
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            fetchUsedPromotions();
        }
    }, []);

    const getPromoApplicability = (promo) => {
        if (!checkoutData) return { applicable: false, reason: "" };

        // 0. Check usage limit per person
        if (promo.usageLimitPerPerson && promo.usageLimitPerPerson > 0) {
            const usageCount = usedPromoCodes.filter(c => c === promo.code).length;
            if (usageCount >= promo.usageLimitPerPerson) {
                return { applicable: false, reason: `Bạn đã hết lượt sử dụng mã khuyến mãi này (Giới hạn: ${promo.usageLimitPerPerson} lần/người).` };
            }
        }

        // 1. Check usage count limit
        if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
            return { applicable: false, reason: "Khuyến mãi đã hết lượt sử dụng" };
        }

        // 2. Check min order
        if (promo.minOrder && checkoutData.subtotal < promo.minOrder) {
            return { applicable: false, reason: `Đơn hàng tối thiểu phải từ ${formatVND(promo.minOrder)} để áp dụng mã này.` };
        }

        // 3. Check farmer constraint
        if (promo.farmerId) {
            const hasFarmerProduct = checkoutData.selectedItems.some(item => {
                const itemFarmerId = item.farmerId || item.providerId;
                return String(itemFarmerId) === String(promo.farmerId);
            });
            if (!hasFarmerProduct) {
                return { applicable: false, reason: `Mã khuyến mãi này chỉ áp dụng cho các sản phẩm của nhà vườn ${promo.farmerName || 'đã chỉ định'}.` };
            }
        }

        // 4. Check product constraint
        if (promo.selectedProducts && promo.selectedProducts.length > 0) {
            const hasApplicableProduct = checkoutData.selectedItems.some(item => 
                promo.selectedProducts.some(p => String(p.id) === String(item.id))
            );
            if (!hasApplicableProduct) {
                const productList = promo.selectedProducts.map(p => p.name).join(', ');
                return { applicable: false, reason: `Mã này chỉ áp dụng cho sản phẩm: ${productList}` };
            }
        }

        return { applicable: true, reason: "" };
    };

    const handleApplyPromo = (promo) => {
        if (!promo || !checkoutData) return;
        setPromoError("");

        const appCheck = getPromoApplicability(promo);
        if (!appCheck.applicable) {
            setPromoError(appCheck.reason);
            handleRemovePromo();
            return;
        }

        // Calculate discount only on applicable items
        let applicableSubtotal = checkoutData.subtotal;
        if (promo.selectedProducts && promo.selectedProducts.length > 0) {
            applicableSubtotal = checkoutData.selectedItems
                .filter(item => promo.selectedProducts.some(p => String(p.id) === String(item.id)))
                .reduce((sum, item) => sum + (item.price * item.quantity), 0);
        }

        // Calculate discount
        let discount = 0;
        if (promo.discountType === 'percent') {
            discount = Math.round(applicableSubtotal * (promo.discountVal / 100));
            if (promo.maxDiscount) {
                discount = Math.min(discount, promo.maxDiscount);
            }
        } else if (promo.discountType === 'fixed') {
            discount = Math.min(promo.discountVal, applicableSubtotal);
        } else if (promo.discountType === 'free_ship') {
            discount = checkoutData.shippingFee || 0;
        }

        setSelectedPromo(promo);
        setCheckoutData(prev => {
            if (!prev) return null;
            const updatedDiscount = discount;
            const updatedTotal = Math.max(0, prev.subtotal + (prev.serviceFee || 0) + (prev.shippingFee || 0) - updatedDiscount);
            return {
                ...prev,
                discountAmount: updatedDiscount,
                totalAmount: updatedTotal
            };
        });
    };

    const handleRemovePromo = () => {
        setSelectedPromo(null);
        setPromoError("");
        setCheckoutData(prev => {
            if (!prev) return null;
            const updatedTotal = prev.subtotal + (prev.serviceFee || 0) + (prev.shippingFee || 0);
            return {
                ...prev,
                discountAmount: 0,
                totalAmount: updatedTotal
            };
        });
    };

    const selectedProductIdsRef = useRef([]);
    useEffect(() => {
        if (checkoutData && checkoutData.selectedItems) {
            selectedProductIdsRef.current = checkoutData.selectedItems.map(item => item.id);
        }
    }, [checkoutData]);

    const currentFullAddress = useMemo(() => {
        if (!addrStreet.trim() || !addrWard.name || !addrDistrict.name || !addrProvince.name) {
            return "";
        }
        return addressService.formatAddress({
            street: addrStreet.trim(),
            ward: addrWard.name,
            district: addrDistrict.name,
            province: addrProvince.name
        });
    }, [addrStreet, addrWard.name, addrDistrict.name, addrProvince.name]);

    useEffect(() => {
        if (currentFullAddress && selectedProductIdsRef.current.length > 0 && checkoutData) {
            if (checkoutData.subtotal >= 500000) {
                setCheckoutData(prev => {
                    if (!prev) return null;
                    const total = prev.subtotal + prev.serviceFee + 0 - prev.discountAmount;
                    return {
                        ...prev,
                        shippingFee: 0,
                        totalAmount: total
                    };
                });
                return;
            }

            const calculateDynamicShippingFee = async () => {
                try {
                    const response = await apiClient.post("/api/orders/calculate-shipping-fee", {
                        toAddress: currentFullAddress,
                        productIds: selectedProductIdsRef.current
                    });
                    const actualFee = response.data.shippingFee;
                    setCheckoutData(prev => {
                        if (!prev) return null;
                        const total = prev.subtotal + prev.serviceFee + actualFee - prev.discountAmount;
                        return {
                            ...prev,
                            shippingFee: actualFee,
                            totalAmount: total
                        };
                    });
                } catch (err) {
                    console.error("Lỗi tính phí vận chuyển động từ GHN API:", err);
                }
            };
            calculateDynamicShippingFee();
        }
    }, [currentFullAddress]);

    // Load provinces on mount
    useEffect(() => {
        const initProvinces = async () => {
            const provs = await addressService.getProvinces();
            setProvinces(provs);
        };
        initProvinces();
    }, []);

    // Load user profile and parse address on mount or when provinces loaded
    useEffect(() => {
        const loadProfileAndAddress = async () => {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) return;

            try {
                const profile = await profileService.getCurrentProfile();
                if (profile) {
                    setProfileData(profile);

                    const profileAddr = profile.addresses || [];

                    // Fetch previous orders
                    let orderAddr = [];
                    try {
                        const prevOrders = await orderService.getCustomerOrders();
                        if (prevOrders && Array.isArray(prevOrders)) {
                            orderAddr = prevOrders.map(o => ({
                                receiverName: o.recipient || profile.fullName || "",
                                phone: o.phone || profile.phone || "",
                                address: o.address || "",
                                isDefault: false,
                                latitude: null,
                                longitude: null,
                            }));
                        }
                    } catch (err) {
                        console.warn("Failed to fetch previous orders:", err);
                    }

                    // Merge unique addresses
                    const merged = [];

                    // Add default address from profile
                    const defaultAddrObj = profileAddr.find(a => a.isDefault);
                    if (defaultAddrObj) {
                        merged.push({
                            ...defaultAddrObj,
                            isDefault: true,
                        });
                    }

                    // Add previous order addresses (DO NOT add other profile addresses)
                    orderAddr.forEach(a => {
                        if (a.address && !merged.some(m => m.address.trim().toLowerCase() === a.address.trim().toLowerCase())) {
                            // Find corresponding coordinates in DB profile addresses if any
                            const matchInDB = profileAddr.find(pa => pa.address.trim().toLowerCase() === a.address.trim().toLowerCase());
                            if (matchInDB) {
                                a.latitude = matchInDB.latitude;
                                a.longitude = matchInDB.longitude;
                            }
                            merged.push(a);
                        }
                    });

                    // Geocode sequentially any historical address that has null coordinates
                    const resolvedAddresses = [];
                    for (let i = 0; i < merged.length; i++) {
                        const addr = merged[i];
                        if (addr.latitude == null || addr.longitude == null) {
                            if (i > 0) {
                                await new Promise(resolve => setTimeout(resolve, 500));
                            }
                            const coords = await geocodeAddressIfNeeded(addr.address);
                            if (coords) {
                                resolvedAddresses.push({
                                    ...addr,
                                    latitude: coords.latitude,
                                    longitude: coords.longitude
                                });
                                continue;
                            }
                        }
                        resolvedAddresses.push(addr);
                    }

                    setSavedAddresses(resolvedAddresses);

                    // Determine index of default address
                    let selectedIdx = resolvedAddresses.findIndex(m => m.isDefault);
                    if (selectedIdx === -1 && resolvedAddresses.length > 0) {
                        selectedIdx = 0; // fallback to first
                    }

                    setSelectedAddressIndex(selectedIdx);

                    // Setup fields based on selected address
                    const activeAddr = selectedIdx !== -1 ? resolvedAddresses[selectedIdx] : null;
                    if (activeAddr) {
                        setRecipientName(activeAddr.receiverName || profile.fullName || "");
                        setRecipientPhone(activeAddr.phone || profile.phone || "");
                        setLatitude(activeAddr.latitude || null);
                        setLongitude(activeAddr.longitude || null);

                        const parsed = addressService.parseAddress(activeAddr.address);
                        setAddrStreet(parsed.street || "");

                        if (parsed.province) {
                            const provinceMatch = addressService.findMatchingUnit(provinces, parsed.province);

                            if (provinceMatch) {
                                const provCode = provinceMatch.code;
                                setAddrProvince({ code: String(provCode), name: provinceMatch.name });

                                const dists = await addressService.getDistricts(provCode);
                                setDistricts(dists);

                                const districtMatch = addressService.findMatchingUnit(dists, parsed.district);

                                if (districtMatch) {
                                    const distCode = districtMatch.code;
                                    setAddrDistrict({ code: String(distCode), name: districtMatch.name });

                                    const wds = await addressService.getWards(distCode);
                                    setWards(wds);

                                    const wardMatch = addressService.findMatchingUnit(wds, parsed.ward);

                                    if (wardMatch) {
                                        setAddrWard({ code: String(wardMatch.code), name: wardMatch.name });
                                    }
                                }
                            }
                        }
                    } else {
                        setRecipientName(profile.fullName || "");
                        setRecipientPhone(profile.phone || "");
                        setLatitude(null);
                        setLongitude(null);
                    }
                }
            } catch (err) {
                console.error("Lỗi khi load thông tin cá nhân:", err);
            }
        };

        if (provinces.length > 0) {
            loadProfileAndAddress();
        }
    }, [provinces]);

    const handleProvinceChange = async (e) => {
        const provinceCode = e.target.value;
        const provinceObj = provinces.find((p) => p.code === parseInt(provinceCode));
        if (provinceObj) {
            setAddrProvince({ code: provinceCode, name: provinceObj.name });
            setAddrDistrict({ code: "", name: "" });
            setAddrWard({ code: "", name: "" });
            setWards([]);
            const provCoords = addressService.getProvinceCoordinates(provinceObj.name);
            if (provCoords) {
                setLatitude(provCoords[0]);
                setLongitude(provCoords[1]);
            }
            const dists = await addressService.getDistricts(provinceCode);
            setDistricts(dists);
        } else {
            setAddrProvince({ code: "", name: "" });
            setAddrDistrict({ code: "", name: "" });
            setAddrWard({ code: "", name: "" });
            setDistricts([]);
            setWards([]);
            setLatitude(null);
            setLongitude(null);
        }
    };

    const handleDistrictChange = async (e) => {
        const districtCode = e.target.value;
        const districtObj = districts.find((d) => d.code === parseInt(districtCode));
        if (districtObj) {
            setAddrDistrict({ code: districtCode, name: districtObj.name });
            setAddrWard({ code: "", name: "" });
            const wds = await addressService.getWards(districtCode);
            setWards(wds);
        } else {
            setAddrDistrict({ code: "", name: "" });
            setAddrWard({ code: "", name: "" });
            setWards([]);
        }
    };

    const handleWardChange = (e) => {
        const wardCode = e.target.value;
        const wardObj = wards.find((w) => w.code === parseInt(wardCode));
        if (wardObj) {
            setAddrWard({ code: wardCode, name: wardObj.name });
        } else {
            setAddrWard({ code: "", name: "" });
        }
    };

    const selectSavedAddress = async (index) => {
        setSelectedAddressIndex(index);
        if (index === -1) {
            setRecipientName("");
            setRecipientPhone("");
            setAddrProvince({ code: "", name: "" });
            setAddrDistrict({ code: "", name: "" });
            setAddrWard({ code: "", name: "" });
            setAddrStreet("");
            setLatitude(null);
            setLongitude(null);
            setDistricts([]);
            setWards([]);
            return;
        }

        const selected = savedAddresses[index];
        setRecipientName(selected.receiverName || "");
        setRecipientPhone(selected.phone || "");
        setLatitude(selected.latitude || null);
        setLongitude(selected.longitude || null);

        const parsed = addressService.parseAddress(selected.address);
        setAddrStreet(parsed.street || "");

        if (parsed.province) {
            const provinceMatch = addressService.findMatchingUnit(provinces, parsed.province);

            if (provinceMatch) {
                const provCode = provinceMatch.code;
                setAddrProvince({ code: String(provCode), name: provinceMatch.name });

                const dists = await addressService.getDistricts(provCode);
                setDistricts(dists);

                const districtMatch = addressService.findMatchingUnit(dists, parsed.district);

                if (districtMatch) {
                    const distCode = districtMatch.code;
                    setAddrDistrict({ code: String(distCode), name: districtMatch.name });

                    const wds = await addressService.getWards(distCode);
                    setWards(wds);

                    const wardMatch = addressService.findMatchingUnit(wds, parsed.ward);

                    if (wardMatch) {
                        setAddrWard({ code: String(wardMatch.code), name: wardMatch.name });
                    } else {
                        setAddrWard({ code: "", name: "" });
                    }
                } else {
                    setAddrDistrict({ code: "", name: "" });
                    setAddrWard({ code: "", name: "" });
                    setWards([]);
                }
            } else {
                setAddrProvince({ code: "", name: "" });
                setAddrDistrict({ code: "", name: "" });
                setAddrWard({ code: "", name: "" });
                setDistricts([]);
                setWards([]);
            }
        }
    };

    const handleMapLocationChange = async (lat, lng, isGeocodedFromAddress = false) => {
        setLatitude(lat);
        setLongitude(lng);

        if (isGeocodedFromAddress) {
            return;
        }

        try {
            const geoResult = await addressService.reverseGeocode(lat, lng);
            if (geoResult) {
                if (geoResult.street) {
                    setAddrStreet(geoResult.street);
                }

                // Match Province/City
                const provinceCandidates = [
                    geoResult.province,
                    geoResult.city,
                    ...(geoResult.provinceCandidates || [])
                ].filter(Boolean);

                const provinceMatch = addressService.findMatchingUnit(provinces, provinceCandidates);

                if (provinceMatch) {
                    const provCode = provinceMatch.code;
                    const isProvinceChanged = addrProvince.code !== String(provCode);
                    if (isProvinceChanged) {
                        setAddrProvince({ code: String(provCode), name: provinceMatch.name });
                    }

                    // Load and Match District
                    let dists = districts;
                    if (isProvinceChanged || dists.length === 0) {
                        dists = await addressService.getDistricts(provCode);
                        setDistricts(dists);
                    }

                    const districtCandidates = [
                        geoResult.district,
                        geoResult.ward,
                        ...(geoResult.districtCandidates || [])
                    ].filter(Boolean);

                    const districtMatch = addressService.findMatchingUnit(dists, districtCandidates);

                    if (districtMatch) {
                        const distCode = districtMatch.code;
                        const isDistrictChanged = addrDistrict.code !== String(distCode);
                        if (isDistrictChanged || isProvinceChanged) {
                            setAddrDistrict({ code: String(distCode), name: districtMatch.name });
                        }

                        // Load and Match Ward
                        let wds = wards;
                        if (isDistrictChanged || isProvinceChanged || wds.length === 0) {
                            wds = await addressService.getWards(distCode);
                            setWards(wds);
                        }

                        const wardCandidates = [
                            geoResult.ward,
                            geoResult.district,
                            ...(geoResult.wardCandidates || [])
                        ].filter(Boolean);

                        const wardMatch = addressService.findMatchingUnit(wds, wardCandidates);

                        if (wardMatch) {
                            setAddrWard({ code: String(wardMatch.code), name: wardMatch.name });
                        } else {
                            if (isDistrictChanged || isProvinceChanged) {
                                setAddrWard({ code: "", name: "" });
                            }
                        }
                    } else {
                        if (isProvinceChanged) {
                            setAddrDistrict({ code: "", name: "" });
                            setAddrWard({ code: "", name: "" });
                            setWards([]);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Reverse geocoding failed: ", err);
        }
    };

    const handleLogout = () => {
        authService.logout();
        setUser(null);
        navigate("/");
    };

    const validateForm = (formErrors = {}) => {
        if (!recipientName.trim()) formErrors.recipientName = "Vui lòng nhập họ và tên";
        if (!recipientPhone.trim()) {
            formErrors.recipientPhone = "Vui lòng nhập số điện thoại";
        } else if (!/^(0[123456789])([0-9]{8})$/.test(recipientPhone.trim().replace(/\s+/g, ""))) {
            formErrors.recipientPhone = "Số điện thoại không đúng định dạng (ví dụ: 0901234567)";
        }
        if (selectedAddressIndex !== -1) {
            const selected = savedAddresses[selectedAddressIndex];
            if (!selected || !selected.address) {
                formErrors.recipientAddress = "Vui lòng chọn địa chỉ nhận hàng";
            }
        } else {
            if (!addrProvince.code || !addrDistrict.code || !addrWard.code || !addrStreet.trim()) {
                formErrors.recipientAddress = "Vui lòng nhập đầy đủ địa chỉ giao hàng 4 cấp";
            } else if (!latitude || !longitude) {
                formErrors.recipientAddress = "Vui lòng chọn vị trí của bạn trên bản đồ";
            }
        }

        if (activeDistanceInfo.distance !== null && !activeDistanceInfo.isValid) {
            formErrors.recipientAddress = `Địa chỉ nhận hàng vượt quá khoảng cách giao hàng tối đa của một số sản phẩm trong đơn hàng: ${activeDistanceInfo.invalidDetails.join("; ")}. Vui lòng chọn địa chỉ nhận hàng khác.`;
        }

        setErrors(formErrors);
        return Object.keys(formErrors).length === 0;
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();

        if (isProcessing) return;

        const formErrors = {};
        if (!validateForm(formErrors)) {
            // Check if there is a distance invalidation error
            if (activeDistanceInfo.distance !== null && !activeDistanceInfo.isValid) {
                setErrorModal({
                    show: true,
                    title: "Địa chỉ nhận hàng không hợp lệ",
                    message: "Địa chỉ nhận hàng hiện tại nằm ngoài phạm vi giao hàng của một số sản phẩm trong đơn hàng.",
                    detail: activeDistanceInfo.message
                });
            } else {
                const firstErrorKey = Object.keys(formErrors)[0];
                const errorElement = document.getElementsByName(firstErrorKey)[0] || document.getElementById(firstErrorKey);
                if (errorElement) {
                    errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }
            return;
        }

        setIsProcessing(true);

        try {
            const formattedAddress = (selectedAddressIndex !== -1 && savedAddresses[selectedAddressIndex])
                ? savedAddresses[selectedAddressIndex].address
                : addressService.formatAddress({
                    street: addrStreet.trim(),
                    ward: addrWard.name,
                    district: addrDistrict.name,
                    province: addrProvince.name,
                });

            // Auto-save address to customer_address if not already existing
            if (profileData && profileData.role === "customer") {
                try {
                    const isExisting = savedAddresses.some(
                        (a) => a.address.trim().toLowerCase() === formattedAddress.trim().toLowerCase()
                    );
                    if (!isExisting) {
                        await apiClient.post("/api/customers/addresses", {
                            receiverName: recipientName,
                            phone: recipientPhone,
                            address: formattedAddress,
                            latitude: latitude ? parseFloat(latitude) : null,
                            longitude: longitude ? parseFloat(longitude) : null,
                            isDefault: false
                        });
                        console.log("Saved new delivery address to customer_address.");
                    }
                } catch (err) {
                    console.error("Lỗi khi tự động lưu địa chỉ giao hàng mới:", err);
                }
            }

            // Auto-save phone to user profile if updated
            if (profileData && recipientPhone !== profileData.phone) {
                try {
                    await profileService.updateProfile({
                        fullName: profileData.fullName || recipientName,
                        phone: recipientPhone,
                        avatarUrl: profileData.avatarUrl,
                    }, "customer");
                } catch (err) {
                    console.error("Lỗi khi cập nhật số điện thoại hồ sơ:", err);
                }
            }

            const now = new Date();
            const formattedDate = `${now.getDate()} thg ${now.getMonth() + 1}, ${now.getFullYear()}`;
            const hours = now.getHours();
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'CH' : 'SA';
            const displayHours = hours % 12 || 12;
            const formattedTime = `${displayHours}:${minutes} ${ampm}`;

            if (checkoutData.isPreorder) {
                const randomCode = "PO-2026-" + Math.floor(1000 + Math.random() * 9000);
                const depositAmount = checkoutData.totalAmount * 0.20;
                const newPreorder = {
                  id: randomCode,
                  orderCode: randomCode,
                  status: "paid",
                  statusLabel: "Đã đặt cọc (20%)",
                  date: formattedDate,
                  time: formattedTime,
                  amount: checkoutData.totalAmount,
                  depositPaid: depositAmount,
                  isUSD: false,
                  itemCount: checkoutData.selectedItems.reduce((sum, item) => sum + item.quantity, 0),
                  expectedHarvestDate: checkoutData.selectedItems[0]?.expectedHarvest || "Cuối tháng 08, 2026",
                  provider: {
                    name: checkoutData.selectedItems[0]?.farmerName || "Nông trại Green Valley",
                    avatarText: checkoutData.selectedItems[0]?.farmerName ? checkoutData.selectedItems[0].farmerName.substring(0, 2).toUpperCase() : "GV",
                    avatarBg: "#1b5e20",
                  },
                  thumbnails: [checkoutData.selectedItems[0]?.imageUrl || ""],
                  hasMoreItems: 0,
                  recipient: recipientName,
                  phone: recipientPhone,
                  address: formattedAddress,
                  paymentMethod: paymentMethod === "cod" ? "COD" : "VNPAY",
                  specialInstructions: shippingNote
                };

                const existing = JSON.parse(localStorage.getItem("agrimarket_preorders")) || [];
                localStorage.setItem("agrimarket_preorders", JSON.stringify([newPreorder, ...existing]));

                window.dispatchEvent(new Event("preordersUpdated"));

                setPlacedOrder({
                    id: randomCode,
                    date: formattedDate,
                    time: formattedTime,
                    recipient: recipientName,
                    phone: recipientPhone,
                    address: formattedAddress,
                    paymentMethod: paymentMethod === "cod" ? "COD (Đặt cọc 20%)" : "VNPAY (Đặt cọc 20%)",
                    trackingNumber: `PO-TRACK-${Math.floor(100000 + Math.random() * 900000)}`,
                    items: checkoutData.selectedItems.map(item => ({
                        name: item.name + " (Đặt trước - Preorder)",
                        qty: item.quantity,
                        price: item.price
                    })),
                    amount: depositAmount,
                    isPreorder: true
                });

                setIsSuccess(true);
                localStorage.removeItem("agrimarket_checkout");
                window.scrollTo({ top: 0, behavior: "smooth" });
                setIsProcessing(false);
                return;
            }

            const subtotal = checkoutData.subtotal;
            const shippingFee = checkoutData.shippingFee;
            const serviceFee = checkoutData.serviceFee;
            const discountAmount = checkoutData.discountAmount;
            const totalAmount = checkoutData.totalAmount;
            const selectedItems = checkoutData.selectedItems;

            const orderPayload = {
                recipient: recipientName,
                phone: recipientPhone,
                address: formattedAddress,
                shippingNote: shippingNote,
                paymentMethod: paymentMethod === "cod" ? "COD" : "VNPAY",
                subtotal: subtotal,
                shippingFee: shippingFee,
                serviceFee: serviceFee,
                discount: discountAmount,
                amount: totalAmount,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                appliedPromoCode: selectedPromo ? selectedPromo.code : null,
                items: selectedItems.map(item => ({
                    productId: item.id,
                    quantity: item.quantity
                }))
            };

            if (user) {
                try {
                    const backendOrder = await orderService.createOrder(orderPayload);
                    
                    // Clear checked items from local cart
                    const savedCart = JSON.parse(localStorage.getItem("agrimarket_cart")) || [];
                    const remainingCart = savedCart.filter(item => !selectedItems.some(sel => sel.id === item.id));
                    localStorage.setItem("agrimarket_cart", JSON.stringify(remainingCart));

                    // Clear checkout data
                    localStorage.removeItem("agrimarket_checkout");

                    if (paymentMethod === "cod") {
                        setPlacedOrder(backendOrder);
                        setIsSuccess(true);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        setIsProcessing(false);
                    } else {
                        // For online VNPAY, redirect directly
                        try {
                            const res = await orderService.createVNPayPaymentUrl(backendOrder.id);
                            if (res && res.paymentUrl) {
                                window.location.href = res.paymentUrl;
                            } else {
                                throw new Error("Không thể tạo liên kết thanh toán VNPay.");
                            }
                        } catch (payErr) {
                            console.error("Lỗi khi kết nối VNPay:", payErr);
                            setErrorModal({
                                show: true,
                                title: "Lỗi kết nối VNPay",
                                message: "Không thể khởi tạo cổng thanh toán trực tuyến VNPay.",
                                detail: "Vui lòng thử lại sau hoặc lựa chọn phương thức thanh toán khi nhận hàng (COD)."
                            });
                            setIsProcessing(false);
                        }
                    }
                } catch (err) {
                    console.error("Lỗi khi đặt hàng:", err);
                    const errMsg = err.response?.data
                        ? (typeof err.response.data === "object" ? (err.response.data.message || JSON.stringify(err.response.data)) : err.response.data)
                        : "Có lỗi xảy ra khi xử lý đặt hàng. Vui lòng thử lại.";
                    setErrorModal({
                        show: true,
                        title: "Đặt hàng không thành công",
                        message: "Đã xảy ra lỗi trong quá trình xử lý đặt hàng từ máy chủ.",
                        detail: errMsg
                    });
                    setIsProcessing(false);
                }
            } else {
                const now = new Date();
                const formattedDate = `${now.getDate()} thg ${now.getMonth() + 1}, ${now.getFullYear()}`;
                const hours = now.getHours();
                const minutes = now.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'CH' : 'SA';
                const displayHours = hours % 12 || 12;
                const formattedTime = `${displayHours}:${minutes} ${ampm}`;

                const newOrder = {
                    id: orderId,
                    status: "pending",
                    statusLabel: "Chờ xác nhận",
                    date: formattedDate,
                    time: formattedTime,
                    subtotal: subtotal,
                    shippingFee: shippingFee,
                    serviceFee: serviceFee,
                    discount: discountAmount,
                    amount: totalAmount,
                    recipient: recipientName,
                    address: formattedAddress,
                    phone: recipientPhone,
                    trackingNumber: `FH-TRACK-${Math.floor(100000 + Math.random() * 900000)}`,
                    paymentMethod: paymentMethod === "cod" ? "COD" : "VNPAY",
                    provider: {
                        name: selectedItems[0]?.farmer || "Hợp tác xã Nông nghiệp số",
                        location: "Cái Bè, Tiền Giang",
                        estYear: 2018,
                        avatarText: selectedItems[0]?.name ? selectedItems[0].name.charAt(0).toUpperCase() : "AG",
                        avatarBg: "#1b5e20",
                    },
                    items: selectedItems.map(item => ({
                        name: item.name,
                        farmer: item.farmer || "Nhà vườn địa phương",
                        price: item.price,
                        qty: item.quantity,
                        img: item.imageUrl
                    })),
                    thumbnails: selectedItems.slice(0, 3).map(item => item.imageUrl),
                    itemCount: selectedItems.reduce((sum, item) => sum + item.quantity, 0),
                    hasMoreItems: selectedItems.length > 3 ? selectedItems.length - 3 : 0
                };

                if (paymentMethod === "cod") {
                    // Write to local storage under orders database
                    const stored = localStorage.getItem("agrimarket_orders");
                    const existingOrders = stored ? JSON.parse(stored) : INITIAL_ORDERS;
                    const updatedOrders = [newOrder, ...existingOrders];
                    localStorage.setItem("agrimarket_orders", JSON.stringify(updatedOrders));

                    // Clear checkout data
                    localStorage.removeItem("agrimarket_checkout");

                    // Keep order reference for confirmation screen
                    setPlacedOrder(newOrder);
                    setIsSuccess(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    setIsProcessing(false);
                } else {
                    // Store pending order details and redirect to new payment page
                    localStorage.setItem("agrimarket_pending_order", JSON.stringify(newOrder));
                    navigate("/payment", { state: { pendingOrder: newOrder, paymentMethod } });
                    setIsProcessing(false);
                }
            }
        } catch (err) {
            console.error("Lỗi đặt hàng chung:", err);
            setErrorModal({
                show: true,
                title: "Đặt hàng không thành công",
                message: "Đã xảy ra lỗi không xác định.",
                detail: err.message
            });
            setIsProcessing(false);
        }
    };

    // Calculate sum items count
    const totalCartItems = useMemo(() => {
        const savedCart = JSON.parse(localStorage.getItem("agrimarket_cart")) || [];
        return savedCart.reduce((sum, item) => sum + item.quantity, 0);
    }, [isSuccess]);

    // Render loading skeleton
    if (isPageLoading) {
        return (
            <div className="payment-page-wrapper">
                <Header />
                <main className="payment-main-container" style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: "24px", padding: "40px 20px" }}>
                    <div style={{ flex: 1, maxWidth: "660px", display: "flex", flexDirection: "column", gap: "20px" }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ background: "#fff", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                                <div style={{ height: "20px", width: "40%", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", borderRadius: "6px", marginBottom: "16px", animation: "shimmer 1.4s infinite" }} />
                                <div style={{ height: "14px", width: "80%", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", borderRadius: "6px", marginBottom: "10px", animation: "shimmer 1.4s infinite" }} />
                                <div style={{ height: "14px", width: "65%", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", borderRadius: "6px", animation: "shimmer 1.4s infinite" }} />
                            </div>
                        ))}
                    </div>
                    <div style={{ width: "340px", flexShrink: 0, background: "#fff", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                        <div style={{ height: "20px", width: "55%", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", borderRadius: "6px", marginBottom: "20px", animation: "shimmer 1.4s infinite" }} />
                        {[1,2,3,4,5].map(i => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                                <div style={{ height: "13px", width: "45%", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", borderRadius: "4px", animation: "shimmer 1.4s infinite" }} />
                                <div style={{ height: "13px", width: "30%", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", borderRadius: "4px", animation: "shimmer 1.4s infinite" }} />
                            </div>
                        ))}
                        <div style={{ height: "44px", width: "100%", background: "linear-gradient(90deg, #d1f5d3 25%, #b6edba 50%, #d1f5d3 75%)", backgroundSize: "200% 100%", borderRadius: "10px", marginTop: "20px", animation: "shimmer 1.4s infinite" }} />
                    </div>
                </main>
                <style>{`
                    @keyframes shimmer {
                        0% { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                    }
                `}</style>
                <Footer />
            </div>
        );
    }

    // Render empty state (only after loading completes)
    if (!checkoutData && !isSuccess) {
        return (
            <div className="payment-page-wrapper">
                <Header />

                <main className="payment-main-container empty-checkout-container">
                    <div className="empty-checkout-card">
                        <div className="empty-checkout-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={48} /></div>
                        <h2>Thông tin thanh toán trống</h2>
                        <p>Không tìm thấy sản phẩm nào được thiết lập thanh toán. Vui lòng chọn sản phẩm và thanh toán từ giỏ hàng.</p>
                        <button className="btn-back-to-cart" onClick={() => navigate("/cart")} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <ArrowLeft size={15} /> Quay lại giỏ hàng
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="payment-page-wrapper">
            <Header />

            <main className="payment-main-container">
                {/* Step Indicator */}
                <div className="payment-step-indicator">
                    <div className="step-node active">
                        <span className="node-num">1</span>
                        <span className="node-label">Giỏ hàng</span>
                    </div>

                    <div className={`step-connector ${isSuccess ? "active" : ""}`}></div>

                    <div className={`step-node ${isSuccess ? "active" : ""}`}>
                        <span className="node-num">2</span>
                        <span className="node-label">Đặt hàng thành công</span>
                    </div>

                    <div className="step-connector"></div>

                    <div className="step-node">
                        <span className="node-num">3</span>
                        <span className="node-label">Hoàn tất giao hàng</span>
                    </div>
                </div>

                {/* ── SUCCESS VIEW (COD Order receipt) ── */}
                {isSuccess && placedOrder ? (
                    <section className="payment-success-card">
                        <div className="success-icon-wrapper">
                            <div className="success-checkmark-ring"></div>
                            <div className="success-checkmark-line" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={28} strokeWidth={3} /></div>
                        </div>

                        <h2>{placedOrder.isPreorder ? "Đặt trước thành công!" : "Đặt hàng thành công!"}</h2>
                        <p className="success-desc-text">
                            {placedOrder.isPreorder 
                              ? "Cảm ơn bạn đã đặt trước nông sản tại AgriMarket. Khoản đặt cọc 20% của bạn đã được ghi nhận để đảm bảo giữ chỗ sản phẩm khi thu hoạch."
                              : "Cảm ơn bạn đã mua hàng tại AgriMarket. Đơn hàng của bạn đang được chuyển đến nhà vườn để xử lý."}
                        </p>

                        <div className="success-order-details-box">
                            <div className="receipt-header">
                                <h3>{placedOrder.isPreorder ? "HÓA ĐƠN ĐẶT TRƯỚC" : "HÓA ĐƠN ĐƠN HÀNG"}</h3>
                                <span className="receipt-id">{placedOrder.isPreorder ? "MÃ ĐẶT TRƯỚC" : "MÃ ĐƠN"}: #{placedOrder.id}</span>
                            </div>

                            <div className="receipt-body">
                                <div className="receipt-row">
                                    <span>Thời gian đặt</span>
                                    <span>{placedOrder.date} lúc {placedOrder.time}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>Người nhận</span>
                                    <span>{placedOrder.recipient}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>Số điện thoại</span>
                                    <span>{placedOrder.phone}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>Địa chỉ giao</span>
                                    <span className="receipt-address-txt">{placedOrder.address}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>Phương thức</span>
                                    <span>{placedOrder.paymentMethod}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>Mã vận đơn</span>
                                    <span>{placedOrder.trackingNumber}</span>
                                </div>

                                <hr className="receipt-divider" />

                                <div className="receipt-products">
                                    <h4>Sản phẩm đã mua ({placedOrder.items.length})</h4>
                                    {placedOrder.items.map((item, idx) => (
                                        <div className="receipt-product-row" key={idx}>
                                            <span className="receipt-prod-name">{item.name} <strong className="receipt-prod-qty">x{item.qty}</strong></span>
                                            <span>{formatVND(item.price * item.qty)}</span>
                                        </div>
                                    ))}
                                </div>

                                <hr className="receipt-divider" />

                                <div className="receipt-row receipt-total">
                                    <span>{placedOrder.isPreorder ? "Khoản đặt cọc đã trả (20%)" : "Tổng thanh toán"}</span>
                                    <span>{formatVND(placedOrder.amount)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="success-actions">
                            <button className="btn-success-orders" onClick={() => navigate("/profile/orders")}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16" style={{ marginRight: "8px" }}>
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                                Xem đơn hàng của tôi
                            </button>
                            <button className="btn-success-home" onClick={() => navigate("/")} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                Tiếp tục mua sắm <ArrowRight size={15} />
                            </button>
                        </div>
                    </section>
                ) : (
                    /* ── CHECKOUT FLOW VIEW ── */
                    <form className="payment-checkout-grid" onSubmit={handlePlaceOrder}>
                        {/* LEFT COLUMN: Shipping & Payment Options */}
                        <div className="payment-left-column">
                            {/* Card 1: Delivery Details */}
                            <div className="payment-form-card">
                                <h3>1. Thông tin giao hàng</h3>
                                <p className="form-card-subtitle">Vui lòng nhập địa chỉ nhận hàng chính xác để chúng tôi giao sản phẩm tươi ngon nhất.</p>                                {savedAddresses.length > 0 ? (
                                    <div className={`shopee-address-section ${activeDistanceInfo.distance !== null && !activeDistanceInfo.isValid ? "has-error" : ""}`} style={{ marginBottom: "24px" }}>
                                        <div className="shopee-address-header">
                                            <span className="shopee-address-pin" style={{ display: "inline-flex", alignItems: "center" }}><MapPin size={16} /></span>
                                            <span className="shopee-address-title">Địa chỉ nhận hàng</span>
                                        </div>
                                        <div className="shopee-address-content">
                                            {selectedAddressIndex !== -1 ? (
                                                <div className="shopee-active-address">
                                                    <div className="address-info-row">
                                                        <span className="info-label">Người nhận:</span>
                                                        <span className="info-value">
                                                            <strong>{savedAddresses[selectedAddressIndex].receiverName}</strong>
                                                            {savedAddresses[selectedAddressIndex].isDefault && (
                                                                <span className="shopee-default-badge">Mặc định</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="address-info-row">
                                                        <span className="info-label">Số điện thoại:</span>
                                                        <span className="info-value">{savedAddresses[selectedAddressIndex].phone}</span>
                                                    </div>
                                                    <div className="address-info-row">
                                                        <span className="info-label">Địa chỉ nhận hàng:</span>
                                                        <span className="info-value">{savedAddresses[selectedAddressIndex].address}</span>
                                                    </div>
                                                    {activeDistanceInfo.distance !== null && (
                                                        <div className={`address-distance-banner ${activeDistanceInfo.isValid ? "valid" : "invalid"}`}>
                                                            <span className="distance-banner-icon" style={{ display: "inline-flex", alignItems: "center" }}>{activeDistanceInfo.isValid ? <MapPin size={16} /> : <AlertTriangle size={16} />}</span>
                                                            <span className="distance-banner-message">{activeDistanceInfo.message}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="shopee-active-address">
                                                    <div className="address-info-row">
                                                        <span className="info-label">Người nhận:</span>
                                                        <span className="info-value">
                                                            <strong>{recipientName || "Chưa nhập họ tên"}</strong>
                                                            <span className="shopee-new-badge">Địa chỉ mới</span>
                                                        </span>
                                                    </div>
                                                    <div className="address-info-row">
                                                        <span className="info-label">Số điện thoại:</span>
                                                        <span className="info-value">{recipientPhone || "Chưa nhập SĐT"}</span>
                                                    </div>
                                                    <div className="address-info-row">
                                                        <span className="info-label">Địa chỉ nhận hàng:</span>
                                                        <span className="info-value">
                                                            {addressService.formatAddress({
                                                                street: addrStreet,
                                                                ward: addrWard.name,
                                                                district: addrDistrict.name,
                                                                province: addrProvince.name
                                                            }) || "Vui lòng nhập chi tiết địa chỉ bên dưới"}
                                                        </span>
                                                    </div>
                                                    {activeDistanceInfo.distance !== null && (
                                                        <div className={`address-distance-banner ${activeDistanceInfo.isValid ? "valid" : "invalid"}`}>
                                                            <span className="distance-banner-icon" style={{ display: "inline-flex", alignItems: "center" }}>{activeDistanceInfo.isValid ? <MapPin size={16} /> : <AlertTriangle size={16} />}</span>
                                                            <span className="distance-banner-message">{activeDistanceInfo.message}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <button 
                                                type="button" 
                                                className="btn-change-address" 
                                                onClick={() => setShowAddressSelector(!showAddressSelector)}
                                            >
                                                {showAddressSelector ? "Đóng lại" : "Thay đổi"}
                                            </button>
                                        </div>

                                        {showAddressSelector && (
                                            <div className="shopee-address-dropdown">
                                                <div className="shopee-dropdown-header">
                                                    <h4>Chọn địa chỉ nhận hàng</h4>
                                                </div>
                                                <div className="shopee-dropdown-list">
                                                    {savedAddresses.map((addr, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            className={`shopee-dropdown-item ${selectedAddressIndex === idx ? "selected" : ""}`}
                                                            onClick={() => {
                                                                selectSavedAddress(idx);
                                                                setShowAddressSelector(false);
                                                            }}
                                                        >
                                                            <div className="shopee-radio-wrapper">
                                                                <input 
                                                                    type="radio" 
                                                                    name="selectedAddressRadio" 
                                                                    checked={selectedAddressIndex === idx} 
                                                                    readOnly
                                                                />
                                                            </div>
                                                            <div className="shopee-item-info">
                                                                <div className="address-info-row">
                                                                    <span className="info-label">Người nhận:</span>
                                                                    <span className="info-value">
                                                                        <strong>{addr.receiverName}</strong>
                                                                        {addr.isDefault && <span className="shopee-default-badge">Mặc định</span>}
                                                                    </span>
                                                                </div>
                                                                <div className="address-info-row">
                                                                    <span className="info-label">Số điện thoại:</span>
                                                                    <span className="info-value">{addr.phone}</span>
                                                                </div>
                                                                <div className="address-info-row">
                                                                    <span className="info-label">Địa chỉ:</span>
                                                                    <span className="info-value">{addr.address}</span>
                                                                </div>
                                                                {(() => {
                                                                    const distInfo = getAddressDistanceInfo(addr);
                                                                    if (distInfo.distance !== null) {
                                                                        return (
                                                                            <div className={`shopee-item-distance ${distInfo.isValid ? "valid" : "invalid"}`}>
                                                                            <MapPin size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} /> {distInfo.message}
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div 
                                                        className={`shopee-dropdown-item ${selectedAddressIndex === -1 ? "selected" : ""}`}
                                                        onClick={() => {
                                                            selectSavedAddress(-1);
                                                            setShowAddressSelector(false);
                                                        }}
                                                    >
                                                        <div className="shopee-radio-wrapper">
                                                            <input 
                                                                type="radio" 
                                                                name="selectedAddressRadio" 
                                                                checked={selectedAddressIndex === -1} 
                                                                readOnly
                                                            />
                                                        </div>
                                                        <div className="shopee-item-info">
                                                            <div className="shopee-item-header">
                                                                    <span className="shopee-item-name" style={{ fontWeight: 700 }}>Giao tới địa chỉ khác / Thêm địa chỉ mới</span>
                                                            </div>
                                                            <div className="shopee-item-address">Nhập địa chỉ mới và định vị trên bản đồ bên dưới.</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : null}

                                {selectedAddressIndex === -1 && (
                                    <div className="new-address-form-fields" style={{ animation: "fadeIn 0.3s ease" }}>
                                        <div className="form-group-row">
                                            <div className="form-group">
                                                <label htmlFor="recipientName">Họ và tên người nhận <span className="req-star">*</span></label>
                                                <input
                                                    type="text"
                                                    id="recipientName"
                                                    name="recipientName"
                                                    value={recipientName}
                                                    onChange={(e) => setRecipientName(e.target.value)}
                                                    placeholder="Nguyễn Văn A"
                                                    className={errors.recipientName ? "input-err" : ""}
                                                />
                                                {errors.recipientName && <span className="error-hint-text">{errors.recipientName}</span>}
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="recipientPhone">Số điện thoại liên hệ <span className="req-star">*</span></label>
                                                <input
                                                    type="text"
                                                    id="recipientPhone"
                                                    name="recipientPhone"
                                                    value={recipientPhone}
                                                    onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                                    maxLength={10}
                                                    placeholder="09XXXXXXXX"
                                                    className={errors.recipientPhone ? "input-err" : ""}
                                                />
                                                {errors.recipientPhone && <span className="error-hint-text">{errors.recipientPhone}</span>}
                                            </div>
                                        </div>

                                        <div className="form-group-row">
                                            <div className="form-group">
                                                <label>Tỉnh / Thành phố <span className="req-star">*</span></label>
                                                <SearchableSelect
                                                    options={provinces}
                                                    value={addrProvince.code}
                                                    onChange={handleProvinceChange}
                                                    placeholder="Chọn Tỉnh / Thành phố"
                                                    className={errors.recipientAddress ? "input-err" : ""}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Quận / Huyện <span className="req-star">*</span></label>
                                                <SearchableSelect
                                                    options={districts}
                                                    value={addrDistrict.code}
                                                    onChange={handleDistrictChange}
                                                    disabled={!addrProvince.code}
                                                    placeholder="Chọn Quận / Huyện"
                                                    className={errors.recipientAddress ? "input-err" : ""}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group-row">
                                            <div className="form-group">
                                                <label>Phường / Xã <span className="req-star">*</span></label>
                                                <SearchableSelect
                                                    options={wards}
                                                    value={addrWard.code}
                                                    onChange={handleWardChange}
                                                    disabled={!addrDistrict.code}
                                                    placeholder="Chọn Phường / Xã"
                                                    className={errors.recipientAddress ? "input-err" : ""}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Số nhà / Tên đường <span className="req-star">*</span></label>
                                                <input
                                                    type="text"
                                                    id="recipientAddress"
                                                    name="recipientAddress"
                                                    value={addrStreet}
                                                    onChange={(e) => setAddrStreet(e.target.value)}
                                                    placeholder="Số nhà, ngõ, tên đường..."
                                                    className={errors.recipientAddress ? "input-err" : ""}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group full-width" style={{ marginTop: "15px", marginBottom: "20px" }}>
                                            <MapPicker
                                                latitude={latitude}
                                                longitude={longitude}
                                                onChange={handleMapLocationChange}
                                                defaultAddress={addressService.formatAddress({
                                                    street: addrStreet.trim(),
                                                    ward: addrWard.name,
                                                    district: addrDistrict.name,
                                                    province: addrProvince.name,
                                                })}
                                            />
                                        </div>

                                        {errors.recipientAddress && (
                                            <div className="form-group" style={{ marginTop: "-12px", marginBottom: "20px" }}>
                                                <span className="error-hint-text">{errors.recipientAddress}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label htmlFor="shippingNote">Ghi chú giao hàng (Không bắt buộc)</label>
                                    <textarea
                                        id="shippingNote"
                                        name="shippingNote"
                                        value={shippingNote}
                                        onChange={(e) => setShippingNote(e.target.value)}
                                        placeholder="Ví dụ: Giao ngoài giờ hành chính, gọi điện trước khi giao..."
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* Card 2: Payment Methods */}
                            <div className="payment-form-card">
                                <h3>2. Phương thức thanh toán</h3>
                                <p className="form-card-subtitle">Lựa chọn một trong các phương thức thanh toán an toàn dưới đây.</p>

                                <div className="payment-methods-selector">
                                    <label className={`method-option-card ${paymentMethod === "cod" ? "selected" : ""}`}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="cod"
                                            checked={paymentMethod === "cod"}
                                            onChange={() => setPaymentMethod("cod")}
                                        />
                                        <div className="method-option-info">
                                            <span className="method-icon" style={{ display: "inline-flex", alignItems: "center" }}><Banknote size={22} /></span>
                                            <div className="method-text">
                                                <span className="method-title">Thanh toán khi nhận hàng (COD)</span>
                                                <span className="method-desc">Thanh toán bằng tiền mặt cho shipper khi nhận được hàng.</span>
                                            </div>
                                        </div>
                                    </label>

                                    <label className={`method-option-card ${paymentMethod === "vnpay" ? "selected" : ""}`}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="vnpay"
                                            checked={paymentMethod === "vnpay"}
                                            onChange={() => setPaymentMethod("vnpay")}
                                        />
                                        <div className="method-option-info">
                                            <span className="method-icon" style={{ display: "inline-flex", alignItems: "center" }}><CreditCard size={22} /></span>
                                            <div className="method-text">
                                                <span className="method-title">Thanh toán trực tuyến qua VNPAY</span>
                                                <span className="method-desc">Thanh toán an toàn qua VietQR, thẻ ATM nội địa hoặc thẻ quốc tế Visa/Mastercard.</span>
                                            </div>
                                        </div>
                                    </label>
                                </div>

                                {/* Dynamic Details according to selection */}
                                {paymentMethod === "cod" && (
                                    <div className="method-detail-box cod-box">
                                        {checkoutData.isPreorder ? (
                                            <p><span style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle", marginRight: "4px" }}><Package size={15} /></span> Bạn sẽ thanh toán khoản cọc giữ chỗ 20% trị giá <strong>{formatVND(checkoutData.totalAmount * 0.20)}</strong> và thanh toán 80% còn lại khi nhận nông sản thu hoạch.</p>
                                        ) : (
                                            <p><span style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle", marginRight: "4px" }}><Package size={15} /></span> Bạn sẽ thanh toán tổng số tiền là <strong>{formatVND(checkoutData.totalAmount)}</strong> cho nhân viên giao hàng khi đơn hàng được giao đến. Vui lòng chuẩn bị sẵn số tiền mặt để thuận tiện giao dịch.</p>
                                        )}
                                    </div>
                                )}
                                {paymentMethod === "vnpay" && (
                                    <div className="method-detail-box cod-box">
                                        {checkoutData.isPreorder ? (
                                            <p><span style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle", marginRight: "4px" }}><Lock size={15} /></span> Bạn sẽ được chuyển sang cổng thanh toán bảo mật VNPAY để hoàn thành giao dịch đặt cọc trực tuyến trị giá <strong>{formatVND(checkoutData.totalAmount * 0.20)}</strong>.</p>
                                        ) : (
                                            <p><span style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle", marginRight: "4px" }}><Lock size={15} /></span> Bạn sẽ được chuyển sang cổng thanh toán bảo mật VNPAY để hoàn thành giao dịch trực tuyến trị giá <strong>{formatVND(checkoutData.totalAmount)}</strong>.</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Card 3: Promotions */}
                            <div className="payment-form-card" style={{ marginTop: "24px" }}>
                                <h3>3. Chương trình khuyến mãi</h3>
                                <p className="form-card-subtitle">Áp dụng mã khuyến mãi hoặc chương trình ưu đãi để nhận thêm giảm giá.</p>
                                
                                {promotions.length === 0 ? (
                                    <p style={{ color: "#64748b", fontSize: "14px", margin: "10px 0" }}>Không có chương trình khuyến mãi nào khả dụng.</p>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "15px" }}>
                                        {selectedPromo && (
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px", borderRadius: "8px", marginTop: "4px" }}>
                                                <div style={{ color: "#16a34a", display: "flex" }}>
                                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div style={{ display: "flex", flexDirection: "column" }}>
                                                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#166534" }}>Đã áp dụng mã {selectedPromo.code}</span>
                                                    <span style={{ fontSize: "12px", color: "#15803d" }}>
                                                        Tiết kiệm được {formatVND(checkoutData.discountAmount || 0)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        {promoError && (
                                            <span style={{ color: "#dc2626", fontSize: "13px", fontWeight: "500" }}>{promoError}</span>
                                        )}

                                        {/* Detailed Voucher Cards */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                            {promotions.map(promo => {
                                                const checkResult = getPromoApplicability(promo);
                                                const isSelected = selectedPromo && String(selectedPromo.id) === String(promo.id);
                                                
                                                const discountText = promo.discountType === 'percent'
                                                    ? `Giảm ${promo.discountVal}%`
                                                    : `Giảm ${promo.discountVal ? promo.discountVal.toLocaleString() : '0'}đ`;
                                                
                                                const maxDiscountText = promo.discountType === 'percent' && promo.maxDiscount
                                                    ? ` (Tối đa ${promo.maxDiscount.toLocaleString()}đ)`
                                                    : '';

                                                const minOrderText = promo.minOrder 
                                                    ? `Đơn tối thiểu ${promo.minOrder.toLocaleString()}đ`
                                                    : 'Không giới hạn đơn tối thiểu';

                                                const remainingUses = promo.maxUses > 0 
                                                    ? `Còn lại: ${Math.max(0, promo.maxUses - promo.usedCount)} lượt`
                                                    : 'Lượt dùng: Không giới hạn';

                                                const usageLimitText = promo.usageLimitPerPerson
                                                    ? `Tối đa ${promo.usageLimitPerPerson} lần/người`
                                                    : '';

                                                return (
                                                    <div 
                                                        key={promo.id} 
                                                        style={{ 
                                                            border: isSelected ? "2px solid #22c55e" : "1px solid #e2e8f0",
                                                            borderRadius: "10px",
                                                            padding: "12px",
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: "8px",
                                                            background: isSelected ? "#f0fdf4" : (checkResult.applicable ? "#ffffff" : "#f8fafc"),
                                                            opacity: checkResult.applicable ? 1 : 0.75,
                                                            transition: "all 0.2s ease"
                                                        }}
                                                    >
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                                                            <div style={{ flex: 1 }}>
                                                                <span style={{ 
                                                                    background: isSelected ? "#22c55e" : "#e2e8f0", 
                                                                    color: isSelected ? "#ffffff" : "#475569", 
                                                                    padding: "2px 8px", 
                                                                    borderRadius: "4px", 
                                                                    fontSize: "12px", 
                                                                    fontWeight: "bold",
                                                                    marginRight: "8px",
                                                                    display: "inline-block"
                                                                }}>
                                                                    {promo.code}
                                                                </span>
                                                                <strong style={{ fontSize: "14px", color: "#1e293b" }}>{promo.title}</strong>
                                                                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                                                    {promo.description || "Nhận ưu đãi giảm giá đặc biệt khi thanh toán."}
                                                                </div>
                                                            </div>
                                                            
                                                            {checkResult.applicable ? (
                                                                isSelected ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleRemovePromo}
                                                                        style={{ 
                                                                            background: "#dc2626", 
                                                                            color: "#fff", 
                                                                            border: "none", 
                                                                            padding: "6px 12px", 
                                                                            borderRadius: "6px", 
                                                                            cursor: "pointer", 
                                                                            fontWeight: "600", 
                                                                            fontSize: "12px" 
                                                                        }}
                                                                    >
                                                                        Hủy
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleApplyPromo(promo)}
                                                                        style={{ 
                                                                            background: "#22c55e", 
                                                                            color: "#fff", 
                                                                            border: "none", 
                                                                            padding: "6px 12px", 
                                                                            borderRadius: "6px", 
                                                                            cursor: "pointer", 
                                                                            fontWeight: "600", 
                                                                            fontSize: "12px" 
                                                                        }}
                                                                    >
                                                                        Áp dụng
                                                                    </button>
                                                                )
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    disabled
                                                                    style={{ 
                                                                        background: "#cbd5e1", 
                                                                        color: "#64748b", 
                                                                        border: "none", 
                                                                        padding: "6px 12px", 
                                                                        borderRadius: "6px", 
                                                                        fontWeight: "600", 
                                                                        fontSize: "12px",
                                                                        cursor: "not-allowed"
                                                                    }}
                                                                >
                                                                    K.Khả Dụng
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Badges info */}
                                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "11px", marginTop: "2px" }}>
                                                            <span style={{ background: promo.farmerId ? "#e0f2fe" : "#f3e8ff", color: promo.farmerId ? "#0369a1" : "#6b21a8", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>
                                                                 {promo.farmerId ? `Nhà vườn: ${promo.farmerName}` : 'Khuyến mãi Hệ thống'}
                                                             </span>
                                                             <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>
                                                                {discountText}{maxDiscountText}
                                                            </span>
                                                            <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>
                                                                {minOrderText}
                                                            </span>
                                                            <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 6px", borderRadius: "4px", fontWeight: "500" }}>
                                                                {remainingUses}
                                                            </span>
                                                            {usageLimitText && (
                                                                <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 6px", borderRadius: "4px", fontWeight: "500" }}>
                                                                    {usageLimitText}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Applicable products */}
                                                        <div style={{ fontSize: "12px", color: "#475569", borderTop: "1px dashed #e2e8f0", paddingTop: "6px", marginTop: "4px" }}>
                                                            <span style={{ fontWeight: "600" }}>Sản phẩm áp dụng: </span>
                                                            {promo.selectedProducts && promo.selectedProducts.length > 0 ? (
                                                                <span style={{ color: "#0891b2", fontWeight: "500" }}>
                                                                    {promo.selectedProducts.map(p => `${p.name} (${p.unit})`).join(', ')}
                                                                </span>
                                                            ) : (
                                                                <span>Tất cả sản phẩm của nhà vườn {promo.farmerName || 'hệ thống'}</span>
                                                            )}
                                                        </div>

                                                        {/* Warnings */}
                                                        {!checkResult.applicable && (
                                                            <div style={{ color: "#dc2626", fontSize: "12px", fontWeight: "500", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                                                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                </svg>
                                                                <span>{checkResult.reason}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Order Summary & Placement */}
                        <div className="payment-right-column">
                            <div className="checkout-summary-card">
                                <h4>Thông tin đơn hàng</h4>

                                <div className="checkout-items-list">
                                    {checkoutData.selectedItems.map((item, index) => (
                                        <div className="checkout-item-row" key={index}>
                                            <div className="checkout-item-image">
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} alt={item.name} />
                                                ) : (
                                                    <div className="checkout-item-fallback" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#81c784" }}><Sprout size={20} /></div>
                                                )}
                                            </div>
                                            <div className="checkout-item-details">
                                                <span className="checkout-item-title" title={item.name}>{item.name}</span>
                                                <span className="checkout-item-sub">Số lượng: {item.quantity} {item.unit || "kg"}</span>
                                            </div>
                                            <span className="checkout-item-price">{formatVND(item.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="summary-details">
                                    <div className="summary-row">
                                        <span>Tạm tính</span>
                                        <span>{formatVND(checkoutData.subtotal)}</span>
                                    </div>
                                    {checkoutData.discountAmount > 0 && (
                                        <div className="summary-row" style={{ color: "#dc2626", fontWeight: "600" }}>
                                            <span>Khuyến mãi</span>
                                            <span>-{formatVND(checkoutData.discountAmount)}</span>
                                        </div>
                                    )}
                                    {checkoutData.serviceFee > 0 && (
                                        <div className="summary-row">
                                            <span>Phí dịch vụ</span>
                                            <span>{formatVND(checkoutData.serviceFee)}</span>
                                        </div>
                                    )}
                                    <div className="summary-row">
                                        <span>Phí vận chuyển</span>
                                        <span className={checkoutData.shippingFee === 0 ? "free-txt" : ""}>
                                            {checkoutData.shippingFee === 0 ? "Miễn phí" : formatVND(checkoutData.shippingFee)}
                                        </span>
                                    </div>
                                    <hr className="summary-divider" />
                                    <div className="summary-row total-row">
                                        <span>{checkoutData.isPreorder ? "Tổng thanh toán dự kiến" : "Tổng thanh toán"}</span>
                                        <span className="grand-total-val">{formatVND(checkoutData.totalAmount)}</span>
                                    </div>

                                    {checkoutData.isPreorder && (
                                        <div className="checkout-deposit-highlight-box" style={{ backgroundColor: "#e8f5e9", border: "1px solid #c8e6c9", padding: "12px", borderRadius: "8px", marginTop: "12px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", color: "#2e7d32", fontSize: "14px" }}>
                                                <span>Đặt cọc yêu cầu (20%)</span>
                                                <span>{formatVND(checkoutData.totalAmount * 0.20)}</span>
                                            </div>
                                            <span style={{ fontSize: "11px", color: "#558b2f", display: "block", marginTop: "4px" }}>Thanh toán hôm nay để xác nhận giữ chỗ nông sản.</span>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    type="submit" 
                                    className="btn-confirm-order" 
                                    disabled={isProcessing}
                                    style={{
                                        ...(checkoutData.isPreorder ? { backgroundColor: "#15803d" } : {}),
                                        ...(isProcessing ? { backgroundColor: "#78909c", cursor: "not-allowed", opacity: 0.8 } : {})
                                    }}
                                >
                                    {isProcessing ? (
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                                            <span className="spinner-mini"></span>
                                            Đang chuyển hướng người dùng...
                                        </span>
                                    ) : (
                                        <>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16" style={{ marginRight: "8px" }}>
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                            </svg>
                                            {checkoutData.isPreorder 
                                              ? (paymentMethod === "cod" ? "Xác nhận đặt trước (Cọc 20%)" : "Thanh toán cọc 20%") 
                                              : (paymentMethod === "cod" ? "Xác nhận đặt hàng" : "Tiến hành thanh toán")}
                                        </>
                                    )}
                                </button>

                                <button type="button" className="btn-return-to-cart" onClick={() => navigate("/cart")}>
                                    Quay lại giỏ hàng
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </main>
            <Footer />

            {errorModal.show && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal-card">
                        <div className="custom-modal-header">
                            <span className="custom-modal-icon" style={{ display: "inline-flex", alignItems: "center" }}><XCircle size={32} style={{ color: "#dc2626" }} /></span>
                            <h4>{errorModal.title}</h4>
                        </div>
                        <div className="custom-modal-body">
                            <p className="custom-modal-message">{errorModal.message}</p>
                            {errorModal.detail && (
                                <div className="custom-modal-detail">
                                    {errorModal.detail}
                                </div>
                            )}
                        </div>
                        <div className="custom-modal-footer">
                            <button 
                                type="button" 
                                className="btn-close-modal" 
                                onClick={() => setErrorModal({ show: false, title: "", message: "", detail: "" })}
                            >
                                Đồng ý
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
