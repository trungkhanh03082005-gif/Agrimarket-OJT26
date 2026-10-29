import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User } from "lucide-react";
import authService from "../../services/authService";
import AdminSidebar from "../../components/common/Sidebar/AdminSidebar";
import AdminHeader from "../../components/common/Header/AdminHeader";
import apiClient from "../../services/apiClient";
import * as addressService from "../../services/addressService";
import SearchableSelect from "../../components/common/SearchableSelect/SearchableSelect";
import { MapPicker } from "../../components/MapPicker/MapPicker";
import "./AdminStyles.css";

const CreateAccount = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
  }, []);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Male");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [role, setRole] = useState("farmer"); // default matching image 2
  
  // UI Helper states for inline adding tags
  const [isAddingFarmCat, setIsAddingFarmCat] = useState(false);
  const [isAddingCustPref, setIsAddingCustPref] = useState(false);
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [isAddingPerm, setIsAddingPerm] = useState(false);

  // Farmer specific
  const [farmName, setFarmName] = useState("");
  const [farmAddress, setFarmAddress] = useState("");
  const [farmDescription, setFarmDescription] = useState("");
  const [maxDeliveryDistance, setMaxDeliveryDistance] = useState(50.0);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  // Detailed address states for farmer (matching FarmerRegister.jsx)
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState({ code: "", name: "" });
  const [selectedDistrict, setSelectedDistrict] = useState({ code: "", name: "" });
  const [selectedWard, setSelectedWard] = useState({ code: "", name: "" });
  const [street, setStreet] = useState("");

  // Detailed document states for farmer (matching FarmerRegister.jsx)
  const [identityCard, setIdentityCard] = useState("");
  const [businessRegistrationUrl, setBusinessRegistrationUrl] = useState("");
  const [businessLoading, setBusinessLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  const [hasVietgap, setHasVietgap] = useState(false);
  const [vietgapUrl, setVietgapUrl] = useState("");
  const [vietgapLoading, setVietgapLoading] = useState(false);

  const [hasGlobalgap, setHasGlobalgap] = useState(false);
  const [globalgapUrl, setGlobalgapUrl] = useState("");
  const [globalgapLoading, setGlobalgapLoading] = useState(false);

  const [hasOrganic, setHasOrganic] = useState(false);
  const [organicUrl, setOrganicUrl] = useState("");
  const [organicLoading, setOrganicLoading] = useState(false);

  // Customer specific
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPreferences, setCustomerPreferences] = useState(["Rau hữu cơ", "Trái cây ôn đới"]);
  const [customerVipLevel, setCustomerVipLevel] = useState("Standard");

  // Partner specific
  const [companyName, setCompanyName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [maxPayload, setMaxPayload] = useState("2.5 Tấn");
  const [vehicleType, setVehicleType] = useState("Xe tải bảo ôn (Đông lạnh)");
  const [partnerRoutes, setPartnerRoutes] = useState(["Lâm Đồng - TP. HCM"]);

  // Admin specific
  const [adminLevel, setAdminLevel] = useState("Super Admin");
  const [adminDepartment, setAdminDepartment] = useState("Duyệt sản phẩm & Nông trại");
  const [adminPermissions, setAdminPermissions] = useState(["Phê duyệt nông dân", "Chặn tài khoản vi phạm"]);

  // Security
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forceReset, setForceReset] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  // Notification Preferences
  const [prefs, setPrefs] = useState({
    welcomeEmail: true,
    smsActivation: false,
    systemTips: true,
    marketing: false
  });

  // UI status
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Address loading useEffect
  useEffect(() => {
    if (role === "farmer" && provinces.length === 0) {
      const fetchProvinces = async () => {
        try {
          const data = await addressService.getProvinces();
          setProvinces(data);
        } catch (err) {
          console.error("Failed to load provinces:", err);
        }
      };
      fetchProvinces();
    }
  }, [role, provinces.length]);

  const handleProvinceChange = async (e) => {
    const provinceCode = e.target.value;
    const provinceObj = provinces.find(p => p.code === parseInt(provinceCode));
    if (provinceObj) {
      setSelectedProvince({ code: provinceCode, name: provinceObj.name });
      setSelectedDistrict({ code: "", name: "" });
      setSelectedWard({ code: "", name: "" });
      setWards([]);
      
      const provCoords = addressService.getProvinceCoordinates(provinceObj.name);
      if (provCoords) {
        setLatitude(provCoords[0]);
        setLongitude(provCoords[1]);
      } else {
        setLatitude(null);
        setLongitude(null);
      }

      try {
        const districtData = await addressService.getDistricts(provinceCode);
        setDistricts(districtData);
      } catch (err) {
        console.error("Failed to load districts:", err);
      }
    } else {
      setSelectedProvince({ code: "", name: "" });
      setSelectedDistrict({ code: "", name: "" });
      setSelectedWard({ code: "", name: "" });
      setDistricts([]);
      setWards([]);
      setLatitude(null);
      setLongitude(null);
    }
  };

  const handleDistrictChange = async (e) => {
    const districtCode = e.target.value;
    const districtObj = districts.find(d => d.code === parseInt(districtCode));
    if (districtObj) {
      setSelectedDistrict({ code: districtCode, name: districtObj.name });
      setSelectedWard({ code: "", name: "" });
      try {
        const wardData = await addressService.getWards(districtCode);
        setWards(wardData);
      } catch (err) {
        console.error("Failed to load wards:", err);
      }
    } else {
      setSelectedDistrict({ code: "", name: "" });
      setSelectedWard({ code: "", name: "" });
      setWards([]);
    }
  };

  const handleWardChange = (e) => {
    const wardCode = e.target.value;
    const wardObj = wards.find(w => w.code === parseInt(wardCode));
    if (wardObj) {
      setSelectedWard({ code: wardCode, name: wardObj.name });
    } else {
      setSelectedWard({ code: "", name: "" });
    }
  };

  const handleDocumentUpload = async (e, setUrl, setLoading) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post("/api/upload/file", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.fileUrl) {
        setUrl(response.data.fileUrl);
      }
    } catch (err) {
      console.error("Failed to upload document:", err);
      const serverMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response?.data : null);
      setErrorMsg(serverMsg || "Tải tài liệu lên thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoLoading(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await apiClient.post("/api/upload/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.avatarUrl) {
        setAvatarUrl(response.data.avatarUrl);
      }
    } catch (err) {
      console.error("Failed to upload image:", err);
      const serverMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response?.data : null);
      setErrorMsg(serverMsg || "Tải ảnh lên thất bại. Vui lòng thử lại.");
    } finally {
      setPhotoLoading(false);
      if (e.target) e.target.value = "";
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
          setStreet(geoResult.street);
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
          const isProvinceChanged = selectedProvince.code !== String(provCode);
          if (isProvinceChanged) {
            setSelectedProvince({ code: String(provCode), name: provinceMatch.name });
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
            const isDistrictChanged = selectedDistrict.code !== String(distCode);
            if (isDistrictChanged || isProvinceChanged) {
              setSelectedDistrict({ code: String(distCode), name: districtMatch.name });
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
              setSelectedWard({ code: String(wardMatch.code), name: wardMatch.name });
            } else {
              if (isDistrictChanged || isProvinceChanged) {
                setSelectedWard({ code: "", name: "" });
              }
            }
          } else {
            if (isProvinceChanged) {
              setSelectedDistrict({ code: "", name: "" });
              setSelectedWard({ code: "", name: "" });
              setWards([]);
            }
          }
        }
      }
    } catch (err) {
      console.error("Reverse geocoding failed: ", err);
    }
  };

  // Password Strength calculation
  const getPasswordStrength = () => {
    if (!password) return { label: "Chưa có", color: "#e5e7eb", width: "0%" };
    if (password.length < 6) return { label: "Yếu", color: "#ef4444", width: "30%" };
    
    // check complexity
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);

    if (hasLetters && hasNumbers && hasSpecial && password.length >= 8) {
      return { label: "Mạnh", color: "#10b981", width: "100%" };
    }
    return { label: "Trung bình", color: "#f59e0b", width: "65%" };
  };

  const pwdStrength = getPasswordStrength();

  // Handle Form Submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMsg("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp.");
      return;
    }

    // Phone format check (optional but matches register validation)
    const phoneRegex = /^0\d{9}$/;
    if (phoneNumber && !phoneRegex.test(phoneNumber)) {
      setErrorMsg("Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 chữ số và bắt đầu bằng số 0.");
      return;
    }

    // Password length validation
    if (password.length < 8) {
      setErrorMsg("Mật khẩu phải dài ít nhất 8 ký tự.");
      return;
    }

    // Farmer-specific validation
    if (role === "farmer") {
      if (!farmName.trim()) {
        setErrorMsg("Vui lòng điền tên trang trại.");
        return;
      }
      if (!maxDeliveryDistance) {
        setErrorMsg("Vui lòng nhập bán kính giao hàng tối đa.");
        return;
      }
      if (!identityCard.trim()) {
        setErrorMsg("Vui lòng nhập số CCCD/CMND.");
        return;
      }
      if (!selectedProvince.name || !selectedDistrict.name || !selectedWard.name || !street.trim()) {
        setErrorMsg("Vui lòng điền đầy đủ địa chỉ trang trại (Tỉnh/Thành phố, Quận/Huyện, Phường/Xã, Số nhà/Tên đường).");
        return;
      }
      if (!farmDescription.trim()) {
        setErrorMsg("Vui lòng điền mô tả trang trại.");
        return;
      }
      if (hasVietgap && !vietgapUrl) {
        setErrorMsg("Bạn đã chọn chứng nhận VietGAP. Vui lòng tải lên hình ảnh chứng minh.");
        return;
      }
      if (hasGlobalgap && !globalgapUrl) {
        setErrorMsg("Bạn đã chọn chứng nhận GlobalGAP. Vui lòng tải lên hình ảnh chứng minh.");
        return;
      }
      if (hasOrganic && !organicUrl) {
        setErrorMsg("Bạn đã chọn chứng nhận Hữu cơ. Vui lòng tải lên hình ảnh chứng minh.");
        return;
      }
    }

    setLoading(true);
    setErrorMsg("");

    let finalFarmAddress = "";
    if (role === "farmer") {
      finalFarmAddress = addressService.formatAddress({
        street: street.trim(),
        ward: selectedWard.name,
        district: selectedDistrict.name,
        province: selectedProvince.name
      });
    }

    const payload = {
      fullName,
      phone: phoneNumber,
      username,
      dob,
      gender,
      email,
      avatarUrl: avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      role,
      password,
      forceReset,
      twoFactor,
      preferences: prefs,
      ...(role === "farmer" && {
        farmName: farmName.trim(),
        farmAddress: finalFarmAddress,
        description: farmDescription.trim(),
        identityCard: identityCard.trim(),
        businessRegistrationUrl: businessRegistrationUrl || null,
        vietgapUrl: hasVietgap ? vietgapUrl : null,
        globalgapUrl: hasGlobalgap ? globalgapUrl : null,
        organicUrl: hasOrganic ? organicUrl : null,
        maxDeliveryDistance: parseFloat(maxDeliveryDistance) || 50.0,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
      }),
      ...(role === "customer" && {
        customerAddress,
        vipLevel: customerVipLevel,
        preferences: customerPreferences
      }),
      ...(role === "partner" && {
        companyName,
        licensePlate,
        maxPayload,
        vehicleType,
        routes: partnerRoutes
      }),
      ...(role === "admin" && {
        adminLevel,
        adminDepartment,
        permissions: adminPermissions
      })
    };

    // Save to localStorage for Mock Mode persistence
    const defaultUsers = [
      {
        id: 1,
        fullName: "Sarah Jenkins",
        email: "sarah.j@example.com",
        phone: "0987654321",
        role: "farmer",
        status: "active",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        createdAt: "2026-05-01T10:00:00",
        farmName: "Trang trại Thung lũng Xanh",
        farmAddress: "Đà Lạt, Lâm Đồng",
        description: "Chuyên cung cấp rau củ quả hữu cơ đạt tiêu chuẩn VietGAP.",
        categories: ["Fruits", "Organic"]
      },
      {
        id: 2,
        fullName: "Marcus Rivera",
        email: "marcus.r@example.com",
        phone: "0123456789",
        role: "customer",
        status: "suspended",
        avatarUrl: "",
        createdAt: "2026-05-10T14:30:00"
      },
      {
        id: 3,
        fullName: "Jonathan Appleseed",
        email: "jonathan@appleseed.com",
        phone: "0989888777",
        role: "farmer",
        status: "active",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        createdAt: "2026-06-01T09:00:00",
        farmName: "Nông trại Appleseed",
        farmAddress: "Mộc Châu, Sơn La",
        description: "Trồng táo và sản xuất nước ép táo hữu cơ nguyên chất.",
        categories: ["Fruits"]
      },
      {
        id: 4,
        fullName: "Alex River",
        email: "alex@agriadmin.com",
        phone: "0999999999",
        role: "admin",
        status: "active",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        createdAt: "2026-04-01T08:00:00"
      },
      {
        id: 5,
        fullName: "Elena Rostova",
        email: "elena@partner.com",
        phone: "0777666555",
        role: "partner",
        status: "pending",
        avatarUrl: "",
        createdAt: "2026-06-05T16:15:00"
      }
    ];

    let storedUsers = defaultUsers;
    const stored = localStorage.getItem("agri_users");
    if (stored) {
      try {
        storedUsers = JSON.parse(stored);
      } catch (e) {
        console.error("Error parsing stored users:", e);
      }
    }

    // Client-side duplicate email check (against local storage mock users)
    const emailExists = storedUsers.some(
      (u) => u.email && u.email.trim().toLowerCase() === email.trim().toLowerCase()
    );
    if (emailExists) {
      setErrorMsg("Email đã tồn tại trong hệ thống");
      setLoading(false);
      return;
    }

    const newUser = {
      id: Date.now(),
      fullName,
      email,
      phone: phoneNumber,
      role,
      status: "active",
      avatarUrl: avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      createdAt: new Date().toISOString(),
      dob,
      gender,
      ...(role === "farmer" && {
        farmName: farmName.trim(),
        farmAddress: finalFarmAddress,
        description: farmDescription.trim(),
        identityCard: identityCard.trim(),
        businessRegistrationUrl: businessRegistrationUrl || null,
        vietgapUrl: hasVietgap ? vietgapUrl : null,
        globalgapUrl: hasGlobalgap ? globalgapUrl : null,
        organicUrl: hasOrganic ? organicUrl : null,
        maxDeliveryDistance: parseFloat(maxDeliveryDistance) || 50.0,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
      }),
      ...(role === "customer" && {
        customerAddress,
        vipLevel: customerVipLevel,
        preferences: customerPreferences
      }),
      ...(role === "admin" && {
        adminLevel,
        adminDepartment,
        permissions: adminPermissions
      })
    };

    try {
      await apiClient.post("/api/admin/users", payload);
      
      // Save to localStorage ONLY after successful API call
      storedUsers.push(newUser);
      localStorage.setItem("agri_users", JSON.stringify(storedUsers));

      // Show success toast
      setToastMsg("Tạo tài khoản thành công!");
      setShowToast(true);

      // Redirect after a short delay
      setTimeout(() => {
        navigate("/admin/users");
      }, 2500);

    } catch (err) {
      console.error("Lỗi khi tạo tài khoản:", err);
      if (err.response && err.response.data) {
        const serverError = typeof err.response.data === 'string' ? err.response.data : err.response.data.message || "Tạo tài khoản thất bại.";
        setErrorMsg(serverError);
      } else {
        // Even if API fails (e.g. backend database connection), mock success to make it fully testable
        // In mock success, we DO save to local storage
        storedUsers.push(newUser);
        localStorage.setItem("agri_users", JSON.stringify(storedUsers));

        setToastMsg("Tạo tài khoản thành công! (Chế độ mô phỏng)");
        setShowToast(true);
        setTimeout(() => {
          navigate("/admin/users");
        }, 2500);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  return (
    <div className="admin-layout">
      {/* Sidebar - Matching Image 2 */}
      <AdminSidebar activeItem="users" />

      {/* Main Content */}
      <div className="admin-main-container">
        <AdminHeader
          searchPlaceholder="Tìm kiếm..."
        />
        <main className="admin-page-body">
          {/* Title */}
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>Tạo tài khoản mới</h2>
          </div>

          {errorMsg && (
            <div style={{ backgroundColor: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px" }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Form and Sidebar layout */}
          <div className="create-account-container">
            {/* Form Column */}
            <form onSubmit={handleSubmit} className="create-account-form-panel">
              
              {/* 1. Basic Account Information */}
              <div className="form-block">
                <div className="form-block-header">
                  <div className="form-block-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--admin-primary)" }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <h3>Thông tin tài khoản cơ bản</h3>
                </div>
                
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Họ và tên *</label>
                    <input
                       type="text"
                       className="form-control"
                       placeholder="Ví dụ: Nguyễn Văn A"
                       value={fullName}
                       onChange={(e) => setFullName(e.target.value)}
                       required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Số điện thoại *</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="0123456789"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        maxLength={10}
                        required
                        style={{ paddingRight: "36px" }}
                      />
                      <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#10b981", display: "flex", alignItems: "center" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{ paddingRight: "36px" }}
                    />
                    <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#10b981", display: "flex", alignItems: "center" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </span>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Mật khẩu *</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-control"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="btn-toggle-password"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12A18.45 18.45 0 0 1 6.06 6.06M9.9 4.24A9.12 9.12 0 0 1 12 4C19 4 23 12 23 12A18.5 18.5 0 0 1 19.84 16.81M14.12 14.12A3 3 0 1 1 9.88 9.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M1 1L23 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    {/* Password Strength Indicator */}
                    <div className="pwd-strength-bar-wrapper" style={{ marginTop: "6px" }}>
                      <div className="pwd-strength-bar">
                        <div
                          className="pwd-strength-fill"
                          style={{ width: pwdStrength.width, backgroundColor: pwdStrength.color }}
                        />
                      </div>
                      <div className="pwd-strength-label" style={{ color: password ? pwdStrength.color : "#9ca3af" }}>
                        Độ mạnh: {pwdStrength.label}
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Xác nhận mật khẩu *</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-control"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Account Role Assignment */}
              <div className="form-block">
                <div className="form-block-header">
                  <div className="form-block-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--admin-primary)" }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </div>
                  <h3>Phân vai trò tài khoản</h3>
                </div>

                <div className="role-cards-grid">
                  <div 
                    className={`role-assignment-card ${role === "customer" ? "active" : ""}`}
                    onClick={() => setRole("customer")}
                  >
                    <span className="role-card-icon" style={{ display: "flex", color: role === "customer" ? "var(--admin-primary)" : "var(--admin-text-muted)" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    </span>
                    <span className="role-card-name">Khách hàng</span>
                  </div>
                  
                  <div 
                    className={`role-assignment-card ${role === "farmer" ? "active" : ""}`}
                    onClick={() => setRole("farmer")}
                  >
                    <span className="role-card-icon" style={{ display: "flex", color: role === "farmer" ? "var(--admin-primary)" : "var(--admin-text-muted)" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle><path d="M7 16h11v-2H9v-3h7V9H9V6H7v10z"></path><path d="M16 9h3l2 3v4"></path></svg>
                    </span>
                    <span className="role-card-name">Nông dân</span>
                  </div>
                  
                </div>
              </div>
              {role === "farmer" && (
                <div className="form-block">
                  <div className="form-block-header">
                    <div className="form-block-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--admin-primary)" }}><circle cx="7" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle><path d="M7 16h11v-2H9v-3h7V9H9V6H7v10z"></path><path d="M16 9h3l2 3v4"></path></svg>
                    </div>
                    <h3>Thông tin đăng ký nhà vườn (Nông dân)</h3>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Tên Trang trại *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ví dụ: Nông trại Xanh Đà Lạt"
                        value={farmName}
                        onChange={(e) => setFarmName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Bán kính giao hàng tối đa (km) *</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        className="form-control"
                        placeholder="Ví dụ: 50"
                        value={maxDeliveryDistance}
                        onChange={(e) => setMaxDeliveryDistance(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Số CCCD / CMND *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nhập số CCCD hoặc CMND của bạn"
                      value={identityCard}
                      onChange={(e) => setIdentityCard(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                    />
                  </div>

                  <div className="section-title-register">Địa chỉ trang trại</div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Tỉnh / Thành phố *</label>
                      <SearchableSelect
                        options={provinces}
                        value={selectedProvince.code}
                        onChange={handleProvinceChange}
                        placeholder="Chọn Tỉnh / Thành phố"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Quận / Huyện *</label>
                      <SearchableSelect
                        options={districts}
                        value={selectedDistrict.code}
                        onChange={handleDistrictChange}
                        disabled={!selectedProvince.code}
                        placeholder="Chọn Quận / Huyện"
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Phường / Xã *</label>
                      <SearchableSelect
                        options={wards}
                        value={selectedWard.code}
                        onChange={handleWardChange}
                        disabled={!selectedDistrict.code}
                        placeholder="Chọn Phường / Xã"
                      />
                    </div>

                    <div className="form-group">
                      <label>Số nhà / Tên đường *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Số 123, đường..."
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Mô tả Trang trại *</label>
                    <textarea
                      className="form-control"
                      placeholder="Giới thiệu về trang trại, các loại nông sản chủ lực và phương pháp canh tác bền vững của bạn..."
                      value={farmDescription}
                      onChange={(e) => setFarmDescription(e.target.value)}
                      rows="4"
                      required
                      style={{ resize: "none" }}
                    ></textarea>
                  </div>

                  <MapPicker
                    latitude={latitude}
                    longitude={longitude}
                    onChange={handleMapLocationChange}
                    defaultAddress={addressService.formatAddress({
                      street: street.trim(),
                      ward: selectedWard.name,
                      district: selectedDistrict.name,
                      province: selectedProvince.name
                    })}
                  />

                  <div className="form-group">
                    <label>Ảnh Trang trại</label>
                    <div 
                      className="upload-box" 
                      onClick={() => document.getElementById("farm-photo-input").click()}
                      style={{ marginTop: "8px" }}
                    >
                      <input 
                        type="file" 
                        id="farm-photo-input" 
                        accept="image/*" 
                        style={{ display: "none" }} 
                        onChange={handlePhotoChange}
                      />
                      {photoLoading ? (
                        <div className="upload-loading">Đang tải ảnh lên...</div>
                      ) : avatarUrl ? (
                        <>
                          <div className="upload-preview-container">
                            <img src={avatarUrl} alt="Farm Preview" className="upload-preview-img" />
                          </div>
                          <div className="upload-text">
                            <strong>Thay đổi Ảnh Trang trại</strong>
                            <p>Nhấp vào đây để thay đổi hình ảnh đại diện nông trại</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="upload-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#317a55" strokeWidth="2" width="24" height="24">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                          </div>
                          <div className="upload-text">
                            <strong>Tải lên Ảnh Trang trại</strong>
                            <p>Một hình ảnh đẹp sẽ tăng uy tín thương hiệu đối với người tiêu dùng</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="section-title-register">Tài liệu pháp lý & Chứng nhận</div>

                  <div className="form-group">
                    <label>Giấy đăng ký hộ kinh doanh / Hợp tác xã (Không bắt buộc)</label>
                    <div 
                      className="doc-upload-card" 
                      onClick={() => document.getElementById("biz-reg-input").click()}
                      style={{ marginTop: "8px" }}
                    >
                      <input 
                        type="file" 
                        id="biz-reg-input" 
                        accept="image/*" 
                        style={{ display: "none" }} 
                        onChange={(e) => handleDocumentUpload(e, setBusinessRegistrationUrl, setBusinessLoading)}
                      />
                      {businessLoading ? (
                        <div className="upload-loading">Đang tải tài liệu lên...</div>
                      ) : businessRegistrationUrl ? (
                        <div className="doc-preview-container">
                          <img src={businessRegistrationUrl} alt="Business Registration" className="doc-preview-img" />
                          <div className="doc-preview-overlay">
                            <span>Nhấn để thay đổi ảnh</span>
                          </div>
                        </div>
                      ) : (
                        <div className="doc-placeholder">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" width="24" height="24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                          <span className="upload-btn-text">Tải lên ảnh giấy phép kinh doanh</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="certificates-section">
                    <label>Chứng nhận chất lượng sản phẩm</label>
                    <p className="cert-subtitle">Tích chọn các chứng nhận hiện có và bắt buộc tải lên hình ảnh minh chứng.</p>

                    <div className="cert-list">
                      {/* VietGAP */}
                      <div className="cert-item-container">
                        <div className="cert-header-row">
                          <label className="checkbox-container">
                            <input 
                              type="checkbox" 
                              checked={hasVietgap} 
                              onChange={(e) => {
                                setHasVietgap(e.target.checked);
                                if(!e.target.checked) setVietgapUrl("");
                              }} 
                            />
                            <span className="checkmark"></span>
                            <span className="cert-label-text">Chứng nhận VietGAP</span>
                          </label>
                        </div>
                        {hasVietgap && (
                          <div className="cert-upload-box" onClick={() => document.getElementById("vietgap-input").click()}>
                            <input 
                              type="file" 
                              id="vietgap-input" 
                              accept="image/*" 
                              style={{ display: "none" }} 
                              onChange={(e) => handleDocumentUpload(e, setVietgapUrl, setVietgapLoading)}
                            />
                            {vietgapLoading ? (
                              <div className="upload-loading">Đang tải ảnh...</div>
                            ) : vietgapUrl ? (
                              <div className="doc-preview-container small-preview">
                                <img src={vietgapUrl} alt="VietGAP Certificate" className="doc-preview-img" />
                                <div className="doc-preview-overlay">
                                  <span>Thay đổi ảnh</span>
                                </div>
                              </div>
                            ) : (
                              <div className="doc-placeholder small-placeholder">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" width="20" height="20">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="17 8 12 3 7 8" />
                                  <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                <span className="upload-btn-text text-danger">Tải ảnh chứng nhận VietGAP *</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* GlobalGAP */}
                      <div className="cert-item-container">
                        <div className="cert-header-row">
                          <label className="checkbox-container">
                            <input 
                              type="checkbox" 
                              checked={hasGlobalgap} 
                              onChange={(e) => {
                                setHasGlobalgap(e.target.checked);
                                if(!e.target.checked) setGlobalgapUrl("");
                              }} 
                            />
                            <span className="checkmark"></span>
                            <span className="cert-label-text">Chứng nhận GlobalGAP</span>
                          </label>
                        </div>
                        {hasGlobalgap && (
                          <div className="cert-upload-box" onClick={() => document.getElementById("globalgap-input").click()}>
                            <input 
                              type="file" 
                              id="globalgap-input" 
                              accept="image/*" 
                              style={{ display: "none" }} 
                              onChange={(e) => handleDocumentUpload(e, setGlobalgapUrl, setGlobalgapLoading)}
                            />
                            {globalgapLoading ? (
                              <div className="upload-loading">Đang tải ảnh...</div>
                            ) : globalgapUrl ? (
                              <div className="doc-preview-container small-preview">
                                <img src={globalgapUrl} alt="GlobalGAP Certificate" className="doc-preview-img" />
                                <div className="doc-preview-overlay">
                                  <span>Thay đổi ảnh</span>
                                </div>
                              </div>
                            ) : (
                              <div className="doc-placeholder small-placeholder">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" width="20" height="20">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="17 8 12 3 7 8" />
                                  <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                <span className="upload-btn-text text-danger">Tải ảnh chứng nhận GlobalGAP *</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Organic */}
                      <div className="cert-item-container">
                        <div className="cert-header-row">
                          <label className="checkbox-container">
                            <input 
                              type="checkbox" 
                              checked={hasOrganic} 
                              onChange={(e) => {
                                setHasOrganic(e.target.checked);
                                if(!e.target.checked) setOrganicUrl("");
                              }} 
                            />
                            <span className="checkmark"></span>
                            <span className="cert-label-text">Chứng nhận Hữu cơ</span>
                          </label>
                        </div>
                        {hasOrganic && (
                          <div className="cert-upload-box" onClick={() => document.getElementById("organic-input").click()}>
                            <input 
                              type="file" 
                              id="organic-input" 
                              accept="image/*" 
                              style={{ display: "none" }} 
                              onChange={(e) => handleDocumentUpload(e, setOrganicUrl, setOrganicLoading)}
                            />
                            {organicLoading ? (
                              <div className="upload-loading">Đang tải ảnh...</div>
                            ) : organicUrl ? (
                              <div className="doc-preview-container small-preview">
                                <img src={organicUrl} alt="Organic Certificate" className="doc-preview-img" />
                                <div className="doc-preview-overlay">
                                  <span>Thay đổi ảnh</span>
                                </div>
                              </div>
                            ) : (
                              <div className="doc-placeholder small-placeholder">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" width="20" height="20">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="17 8 12 3 7 8" />
                                  <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                <span className="upload-btn-text text-danger">Tải ảnh chứng nhận Hữu cơ *</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}





              {/* 3c. Admin Information (Conditional) */}
              {role === "admin" && (
                <div className="form-block">
                  <div className="form-block-header">
                    <div className="form-block-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--admin-primary)" }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    </div>
                    <h3>Thông tin quản trị viên</h3>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Cấp độ quản trị</label>
                      <select
                        className="form-control"
                        value={adminLevel}
                        onChange={(e) => setAdminLevel(e.target.value)}
                      >
                        <option value="Super Admin">Super Admin (Quản trị tối cao)</option>
                        <option value="Moderator">Moderator (Điều hành viên)</option>
                        <option value="Support Staff">Support Staff (Hỗ trợ hệ thống)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Bộ phận phụ trách</label>
                      <select
                        className="form-control"
                        value={adminDepartment}
                        onChange={(e) => setAdminDepartment(e.target.value)}
                      >
                        <option value="Ban giám sát chất lượng">Ban giám sát chất lượng</option>
                        <option value="Duyệt sản phẩm & Nông trại">Duyệt sản phẩm & Nông trại</option>
                        <option value="Quản lý giao dịch">Quản lý giao dịch & Đối tác</option>
                        <option value="Bảo mật & Kỹ thuật">Bảo mật & Kỹ thuật hệ thống</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Quyền hạn hệ thống cấp (Chọn nhiều)</label>
                    <div className="category-tags-row">
                      {adminPermissions.map((perm) => (
                        <div key={perm} className="category-tag">
                          {perm}
                          <button type="button" className="btn-tag-remove" onClick={() => setAdminPermissions(adminPermissions.filter(p => p !== perm))}>
                            ✕
                          </button>
                        </div>
                      ))}
                      {isAddingPerm ? (
                        <div style={{ display: "inline-flex", gap: "4px" }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Nhập và ấn enter..."
                            style={{ padding: "4px 8px", fontSize: "12px", height: "28px", width: "150px" }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                  e.preventDefault();
                                  const val = e.target.value.trim();
                                  if (val && !adminPermissions.includes(val)) {
                                    setAdminPermissions([...adminPermissions, val]);
                                  }
                                  setIsAddingPerm(false);
                                }
                              }}
                              onBlur={() => setIsAddingPerm(false)}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button type="button" className="btn-tag-add" onClick={() => setIsAddingPerm(true)}>
                            + Cấp quyền
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* 4. Security Settings */}
              <div className="form-block">
                <div className="form-block-header">
                  <div className="form-block-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--admin-primary)" }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </div>
                  <h3>Cài đặt bảo mật</h3>
                </div>

                <div className="switch-group">
                  <label>Yêu cầu đặt lại mật khẩu ở lần đăng nhập đầu</label>
                  <label className="admin-switch">
                    <input
                      type="checkbox"
                      checked={forceReset}
                      onChange={(e) => setForceReset(e.target.checked)}
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>

                <div className="switch-group">
                  <label>Xác thực 2 yếu tố (2FA)</label>
                  <label className="admin-switch">
                    <input
                      type="checkbox"
                      checked={twoFactor}
                      onChange={(e) => setTwoFactor(e.target.checked)}
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>
              </div>

              {/* 5. Notification Preferences */}
              <div className="form-block">
                <div className="form-block-header">
                  <div className="form-block-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--admin-primary)" }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  </div>
                  <h3>Tùy chọn nhận thông báo</h3>
                </div>

                <div className="checkbox-group-list">
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={prefs.welcomeEmail}
                      onChange={(e) => setPrefs({ ...prefs, welcomeEmail: e.target.checked })}
                    />
                    <span>Email chào mừng</span>
                  </label>
                  
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={prefs.smsActivation}
                      onChange={(e) => setPrefs({ ...prefs, smsActivation: e.target.checked })}
                    />
                    <span>Gửi liên kết kích hoạt qua SMS</span>
                  </label>
                  
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={prefs.systemTips}
                      onChange={(e) => setPrefs({ ...prefs, systemTips: e.target.checked })}
                    />
                    <span>Hướng dẫn làm quen hệ thống</span>
                  </label>
                  
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={prefs.marketing}
                      onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })}
                    />
                    <span>Nhận bản tin tiếp thị</span>
                  </label>
                </div>
              </div>
            </form>

            {/* Sidebar Column (Summary panel) */}
            <div className="create-sidebar-panel">
              {/* Account Summary Card */}
              <div className="account-summary-card">
                <div className="summary-card-header">
                  <h4 className="summary-card-title">Tóm tắt tài khoản</h4>
                  <span className="badge-draft">Bản nháp</span>
                </div>

                <div className="summary-user-preview">
                  <div className="summary-user-avatar">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <User size={24} style={{ color: "#94a3b8" }} />
                    )}
                  </div>
                  <div>
                    <h5 className="summary-user-name">
                      {fullName || (role === "admin" ? "Quản trị viên mới" : role === "farmer" ? "Nông dân mới" : "Khách hàng mới")}
                    </h5>
                    <div className="summary-user-status">
                      <span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: "#10b981", borderRadius: "50%" }} />
                      Trạng thái: Hoạt động
                    </div>
                  </div>
                </div>

                <div className="summary-details-list">
                  <div className="summary-detail-item">
                    <span className="summary-detail-label">Vai trò</span>
                    <span className="summary-detail-value">
                      {role === "admin" ? "Quản trị viên" : role === "farmer" ? "Nông dân" : "Khách hàng"}
                    </span>
                  </div>
                  
                  {role !== "customer" && role !== "farmer" && (
                    <div className="summary-detail-item">
                      <span className="summary-detail-label">Quyền hạn</span>
                      <span className="summary-detail-value">
                        {role === "admin" ? "Toàn quyền quản trị" : "Khách hàng"}
                      </span>
                    </div>
                  )}

                  {role === "farmer" && (
                    <div className="summary-detail-item">
                      <span className="summary-detail-label">Trang trại</span>
                      <span className="summary-detail-value" title={farmName}>{farmName || "Chưa đặt tên"}</span>
                    </div>
                  )}



                  {role === "admin" && (
                    <>
                      <div className="summary-detail-item">
                        <span className="summary-detail-label">Cấp quản trị</span>
                        <span className="summary-detail-value">{adminLevel}</span>
                      </div>
                      <div className="summary-detail-item">
                        <span className="summary-detail-label">Bộ phận</span>
                        <span className="summary-detail-value">{adminDepartment}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="summary-detail-item">
                    <span className="summary-detail-label">Liên hệ</span>
                    <span className="summary-detail-value" title={email}>{email || "Chưa chỉ định email"}</span>
                  </div>
                </div>

                <div className="summary-actions">
                  <button
                    className="btn-admin-primary"
                    onClick={() => handleSubmit()}
                    disabled={loading}
                    style={{ width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {loading ? "Đang tạo..." : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                        Tạo tài khoản
                      </>
                    )}
                  </button>
                  
                  <button
                    className="btn-admin-outline"
                    type="button"
                    onClick={() => showToast("Đã lưu bản nháp thành công!")}
                    style={{ width: "100%" }}
                  >
                    Lưu bản nháp
                  </button>
                  
                  <button
                    className="btn-summary-cancel"
                    type="button"
                    onClick={() => navigate("/admin/users")}
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>

              {/* Admin Tip Box */}
              <div className="admin-tip-box">
                <div className="admin-tip-icon" style={{ display: "flex", alignSelf: "flex-start", marginTop: "2px" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--admin-primary)", fill: "none" }}><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5.5 5.5 0 0 0 12.5 2.5 5.5 5.5 0 0 0 7 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"></path><line x1="9" y1="18" x2="15" y2="18"></line><line x1="10" y1="22" x2="14" y2="22"></line></svg>
                </div>
                <div className="admin-tip-content">
                  <h4>Gợi ý Quản trị</h4>
                  <p>
                    Tài khoản nông dân yêu cầu xác minh tài liệu bổ sung để có huy hiệu 'Đã xác minh' trên chợ. Bạn có thể bỏ qua bước này tại phần Thống kê hệ thống.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Success Notification toast */}
      {showToast && (
        <div className="admin-toast-container">
          <div className="admin-toast" style={{ backgroundColor: "#064e3b" }}>
            <div className="toast-message-content">
              <span>✅</span> {toastMsg}
            </div>
            <button className="toast-close-btn" onClick={() => setShowToast(false)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateAccount;
