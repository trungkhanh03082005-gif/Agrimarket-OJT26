import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import profileService from "../../../services/profileService";
import authService from "../../../services/authService";
import apiClient from "../../../services/apiClient";
import * as addressService from "../../../services/addressService";
import { MapPicker } from "../../../components/MapPicker/MapPicker";
import SearchableSelect from "../../../components/common/SearchableSelect/SearchableSelect";
import "./FarmerRegister.css";

export const FarmerRegister = () => {
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();
    const [farmName, setFarmName] = useState("");
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [selectedProvince, setSelectedProvince] = useState({ code: "", name: "" });
    const [selectedDistrict, setSelectedDistrict] = useState({ code: "", name: "" });
    const [selectedWard, setSelectedWard] = useState({ code: "", name: "" });
    const [street, setStreet] = useState("");
    const [description, setDescription] = useState("");
    const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || "");
    const [photoLoading, setPhotoLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // New states for legal documents & certifications
    const [identityCard, setIdentityCard] = useState("");
    const [businessRegistrationUrl, setBusinessRegistrationUrl] = useState("");
    const [businessLoading, setBusinessLoading] = useState(false);

    const [hasVietgap, setHasVietgap] = useState(false);
    const [vietgapUrl, setVietgapUrl] = useState("");
    const [vietgapLoading, setVietgapLoading] = useState(false);

    const [hasGlobalgap, setHasGlobalgap] = useState(false);
    const [globalgapUrl, setGlobalgapUrl] = useState("");
    const [globalgapLoading, setGlobalgapLoading] = useState(false);

    const [hasOrganic, setHasOrganic] = useState(false);
    const [organicUrl, setOrganicUrl] = useState("");
    const [organicLoading, setOrganicLoading] = useState(false);

    const [maxDeliveryDistance, setMaxDeliveryDistance] = useState(50.0);
    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);

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

    const handleDocumentUpload = async (e, setUrl, setLoading) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setError("");

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
            setError("Tải tài liệu lên thất bại. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser && currentUser.role === "farmer") {
            navigate("/farmer/products", { replace: true });
            return;
        }

        const fetchProvinces = async () => {
            try {
                const data = await addressService.getProvinces();
                setProvinces(data);
            } catch (err) {
                console.error("Failed to load provinces:", err);
            }
        };
        fetchProvinces();
    }, [currentUser, navigate]);

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

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setPhotoLoading(true);
        setError("");

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
            setError("Tải ảnh lên thất bại. Vui lòng thử lại.");
        } finally {
            setPhotoLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!farmName.trim()) {
            setError("Vui lòng điền tên trang trại.");
            return;
        }

        const currentLocalUser = authService.getCurrentUser();
        if (!currentLocalUser) {
            setError("Không tìm thấy thông tin đăng nhập. Vui lòng đăng nhập lại.");
            return;
        }

        if (!selectedProvince.name || !selectedDistrict.name || !selectedWard.name || !street.trim()) {
            setError("Vui lòng điền đầy đủ địa chỉ trang trại (Tỉnh/Thành phố, Quận/Huyện, Phường/Xã, Số nhà/Tên đường).");
            return;
        }

        if (!latitude || !longitude) {
            setError("Vui lòng chọn vị trí trang trại của bạn trên bản đồ.");
            return;
        }

        if (!description.trim()) {
            setError("Vui lòng điền mô tả trang trại.");
            return;
        }

        if (!identityCard.trim()) {
            setError("Vui lòng nhập số CCCD/CMND.");
            return;
        }

        if (hasVietgap && !vietgapUrl) {
            setError("Bạn đã chọn chứng nhận VietGAP. Vui lòng tải lên hình ảnh chứng minh.");
            return;
        }

        if (hasGlobalgap && !globalgapUrl) {
            setError("Bạn đã chọn chứng nhận GlobalGAP. Vui lòng tải lên hình ảnh chứng minh.");
            return;
        }

        if (hasOrganic && !organicUrl) {
            setError("Bạn đã chọn chứng nhận Hữu cơ. Vui lòng tải lên hình ảnh chứng minh.");
            return;
        }

        setLoading(true);
        setError("");

        const farmAddress = addressService.formatAddress({
            street: street.trim(),
            ward: selectedWard.name,
            district: selectedDistrict.name,
            province: selectedProvince.name
        });

        try {
            // Call API to register as farmer
            const response = await authService.registerAsFarmer({
                farmName: farmName.trim(),
                farmAddress,
                description: description.trim(),
                identityCard: identityCard.trim(),
                businessRegistrationUrl: businessRegistrationUrl || null,
                vietgapUrl: hasVietgap ? vietgapUrl : null,
                globalgapUrl: hasGlobalgap ? globalgapUrl : null,
                organicUrl: hasOrganic ? organicUrl : null,
                maxDeliveryDistance: parseFloat(maxDeliveryDistance) || 50.0,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null
            });

            // If an avatar was uploaded/updated, update the farmer profile
            if (avatarUrl && avatarUrl !== currentLocalUser?.avatarUrl) {
                try {
                    await profileService.updateProfile({
                        avatarUrl: avatarUrl
                    });
                } catch (imgErr) {
                    console.error("Failed to update profile avatar:", imgErr);
                }
            }

            // Redirect to farmer workspace
            navigate("/farmer/products");
            window.location.reload();
        } catch (err) {
            const errMsg = typeof err === "string" ? err : (err.message || "Đăng ký làm đối tác nhà vườn thất bại. Vui lòng thử lại.");
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="farmer-register-page">
            <header className="onboarding-header">
                <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="logo-tractor"
                    >
                      <circle cx="7" cy="18" r="2"></circle>
                      <circle cx="18" cy="18" r="2"></circle>
                      <path d="M7 16h11v-2H9v-3h7V9H9V6H7v10z"></path>
                      <path d="M16 9h3l2 3v4"></path>
                    </svg>
                    <span>AgriMarket</span>
                </div>
                <div className="help-circle">?</div>
            </header>

            <main className="farmer-register-container">
                {/* LEFT COLUMN - HERO IMAGE */}
                <div className="farm-hero-side">
                    <div className="hero-card">
                        <div className="hero-image-placeholder">
                            <div className="hero-overlay-text">
                                <h2>Đồng hành cùng AgriMarket</h2>
                                <p>Đăng ký trở thành nhà vườn để quảng bá và kinh doanh nông sản của bạn trực tiếp tới khách hàng.</p>
                            </div>
                        </div>
                        <div className="trust-card">
                            <div className="trust-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#012d1d" strokeWidth="2">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>
                            <div className="trust-content">
                                <h4>Xác minh thông tin</h4>
                                <p>Hồ sơ trang trại của bạn sẽ được gửi tới Ban quản trị hệ thống để kiểm duyệt chất lượng trước khi mở bán.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN - FORM CONTENT */}
                <div className="farm-form-side">
                    <div className="form-wrapper">
                        <h1>Đăng ký làm Nhà vườn</h1>
                        <p className="subtitle">Điền thông tin chi tiết về trang trại để bắt đầu đưa nông sản của bạn lên kệ hàng.</p>

                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Tên Trang trại <span style={{ color: '#ef4444' }}>*</span></label>
                                <input 
                                    type="text" 
                                    placeholder="Ví dụ: Nông trại Xanh Đà Lạt" 
                                    value={farmName}
                                    onChange={(e) => setFarmName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Bán kính giao hàng tối đa (km) <span style={{ color: '#ef4444' }}>*</span></label>
                                <input 
                                    type="number" 
                                    min="0.1"
                                    step="0.1"
                                    placeholder="Ví dụ: 50" 
                                    value={maxDeliveryDistance}
                                    onChange={(e) => setMaxDeliveryDistance(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Số CCCD / CMND <span style={{ color: '#ef4444' }}>*</span></label>
                                <input 
                                    type="text" 
                                    placeholder="Nhập số CCCD hoặc CMND của bạn" 
                                    value={identityCard}
                                    onChange={(e) => setIdentityCard(e.target.value.replace(/[^0-9]/g, ''))}
                                    required
                                />
                            </div>

                            <div className="section-title-register" style={{ marginTop: "24px" }}>Địa chỉ trang trại</div>

                            <div className="input-row">
                                <div className="input-group">
                                    <label>Tỉnh / Thành phố <span style={{ color: '#ef4444' }}>*</span></label>
                                    <SearchableSelect 
                                        options={provinces}
                                        value={selectedProvince.code}
                                        onChange={handleProvinceChange}
                                        placeholder="Chọn Tỉnh / Thành phố"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Quận / Huyện <span style={{ color: '#ef4444' }}>*</span></label>
                                    <SearchableSelect 
                                        options={districts}
                                        value={selectedDistrict.code}
                                        onChange={handleDistrictChange}
                                        disabled={!selectedProvince.code}
                                        placeholder="Chọn Quận / Huyện"
                                    />
                                </div>
                            </div>

                            <div className="input-row">
                                <div className="input-group">
                                    <label>Phường / Xã <span style={{ color: '#ef4444' }}>*</span></label>
                                    <SearchableSelect 
                                        options={wards}
                                        value={selectedWard.code}
                                        onChange={handleWardChange}
                                        disabled={!selectedDistrict.code}
                                        placeholder="Chọn Phường / Xã"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Số nhà / Tên đường <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input 
                                        type="text" 
                                        placeholder="Số 123, đường..." 
                                        value={street}
                                        onChange={(e) => setStreet(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Mô tả Trang trại <span style={{ color: '#ef4444' }}>*</span></label>
                                <textarea 
                                    placeholder="Giới thiệu về trang trại, các loại nông sản chủ lực và phương pháp canh tác bền vững của bạn..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows="4"
                                    required
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

                            <div className="upload-box" onClick={() => document.getElementById("farm-photo-input").click()}>
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
                                        <div className="upload-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="#317a55" strokeWidth="2">
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

                            <div className="section-title-register">Tài liệu pháp lý & Chứng nhận</div>

                            {/* Giấy đăng ký kinh doanh */}
                            <div className="document-upload-group">
                                <label>Giấy đăng ký hộ kinh doanh / Hợp tác xã (Không bắt buộc)</label>
                                <div className="doc-upload-card" onClick={() => document.getElementById("biz-reg-input").click()}>
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

                            {/* Chứng nhận VietGAP/GlobalGAP/Organic */}
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

                            {error && (
                                <div className="error-message" style={{ color: '#d32f2f', backgroundColor: '#ffebee', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ffcdd2', fontSize: '14px' }}>
                                    {error}
                                </div>
                            )}

                            <div className="form-actions" style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                                <button 
                                    type="button"
                                    className="btn-skip"
                                    onClick={() => navigate("/profile")}
                                    style={{ flex: 1, padding: "14px", borderRadius: "12px", cursor: "pointer", border: "1.5px solid #e5e7eb", background: "#ffffff", fontWeight: "600", fontSize: "15px" }}
                                >
                                    Quay lại
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-continue-farm" 
                                    disabled={loading || photoLoading}
                                    style={{ flex: 2 }}
                                >
                                    {loading ? "Đang xử lý..." : "Hoàn tất đăng ký"} <span>→</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>

            <footer className="onboarding-footer">
                <div className="footer-left">AgriMarket</div>
                <div className="footer-right">
                    <span>Chính sách bảo mật</span>
                    <span>Điều khoản dịch vụ</span>
                    <span>Trung tâm trợ giúp</span>
                    <span className="copyright">© 2026 AgriMarket. Tất cả các quyền được bảo lưu.</span>
                </div>
            </footer>
        </div>
    );
};

export default FarmerRegister;
