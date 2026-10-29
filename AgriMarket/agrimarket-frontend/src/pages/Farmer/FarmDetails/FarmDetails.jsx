import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import profileService from "../../../services/profileService";
import authService from "../../../services/authService";
import apiClient from "../../../services/apiClient";
import * as addressService from "../../../services/addressService";
import { MapPicker } from "../../../components/MapPicker/MapPicker";
import SearchableSelect from "../../../components/common/SearchableSelect/SearchableSelect";
import "./FarmDetails.css";

export const FarmDetails = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = authService.getCurrentUser();

    // Check if we are on the onboarding page
    const isOnboarding = location.pathname === "/farmer/farm-details";

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
    const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }
    const [toastVisible, setToastVisible] = useState(false);
    const [maxDeliveryDistance, setMaxDeliveryDistance] = useState(50.0);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
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

    const showToast = (type, message) => {
        setToast({ type, message });
        setToastVisible(true);
        setTimeout(() => {
            setToastVisible(false);
            setTimeout(() => setToast(null), 400);
        }, 3500);
    };

    // Legal documents & certificates states
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

    const handleDocumentUpload = async (e, setUrl, setLoadingState) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoadingState(true);

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
                showToast("success", "Đã tải tài liệu lên thành công!");
            }
        } catch (err) {
            console.error("Failed to upload document:", err);
            showToast("error", "Tải tài liệu lên thất bại. Vui lòng thử lại.");
        } finally {
            setLoadingState(false);
        }
    };

    // Load initial data (provinces & profile details if exist)
    useEffect(() => {
        const loadProfileAndProvinces = async () => {
            setLoading(true);
            try {
                // Fetch provinces first
                const provList = await addressService.getProvinces();
                setProvinces(provList);

                // Fetch current farm profile
                const profileData = await profileService.getCurrentProfile();
                if (profileData) {
                    setFarmName(profileData.farmName || "");
                    setDescription(profileData.description || "");
                    setAvatarUrl(profileData.avatarUrl || "");
                    setIdentityCard(profileData.identityCard || "");
                    setBusinessRegistrationUrl(profileData.businessRegistrationUrl || "");
                    setHasVietgap(!!profileData.vietgapUrl);
                    setVietgapUrl(profileData.vietgapUrl || "");
                    setHasGlobalgap(!!profileData.globalgapUrl);
                    setGlobalgapUrl(profileData.globalgapUrl || "");
                    setHasOrganic(!!profileData.organicUrl);
                    setOrganicUrl(profileData.organicUrl || "");
                    setMaxDeliveryDistance(profileData.maxDeliveryDistance !== undefined ? profileData.maxDeliveryDistance : 50.0);
                    setLatitude(profileData.latitude || null);
                    setLongitude(profileData.longitude || null);

                    // Initialize address selects if address exists
                    if (profileData.farmAddress) {
                        const parsed = addressService.parseAddress(profileData.farmAddress);
                        setStreet(parsed.street || "");

                        const matchedProv = addressService.findMatchingUnit(provList, parsed.province);
                        if (matchedProv) {
                            setSelectedProvince({ code: String(matchedProv.code), name: matchedProv.name });
                            
                            const distList = await addressService.getDistricts(matchedProv.code);
                            setDistricts(distList);
                            
                            const matchedDist = addressService.findMatchingUnit(distList, parsed.district);
                            if (matchedDist) {
                                setSelectedDistrict({ code: String(matchedDist.code), name: matchedDist.name });
                                
                                const wardList = await addressService.getWards(matchedDist.code);
                                setWards(wardList);
                                
                                const matchedWard = addressService.findMatchingUnit(wardList, parsed.ward);
                                if (matchedWard) {
                                    setSelectedWard({ code: String(matchedWard.code), name: matchedWard.name });
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Lỗi khi tải thông tin trang trại:", err);
                showToast("error", "Không thể tải thông tin trang trại.");
            } finally {
                setLoading(false);
            }
        };

        loadProfileAndProvinces();
    }, []);

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
            const districtData = await addressService.getDistricts(provinceCode);
            setDistricts(districtData);
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
            const wardData = await addressService.getWards(districtCode);
            setWards(wardData);
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
                
                // Update local storage user representation
                if (currentUser) {
                    const updatedUser = { ...currentUser, avatarUrl: response.data.avatarUrl };
                    localStorage.setItem("farmconnect_user", JSON.stringify(updatedUser));
                }
                showToast("success", "Đã tải ảnh trang trại lên thành công!");
            }
        } catch (err) {
            console.error("Failed to upload image:", err);
            showToast("error", "Tải ảnh lên thất bại. Vui lòng thử lại.");
        } finally {
            setPhotoLoading(false);
        }
    };

    const handleSave = async () => {
        if (!farmName.trim()) {
            showToast("error", "Vui lòng điền tên trang trại.");
            return;
        }

        const currentLocalUser = authService.getCurrentUser();
        if (!currentLocalUser) {
            showToast("error", "Không tìm thấy thông tin đăng nhập. Vui lòng đăng nhập lại.");
            return;
        }

        if (!selectedProvince.name || !selectedDistrict.name || !selectedWard.name || !street.trim()) {
            showToast("error", "Vui lòng điền đầy đủ địa chỉ trang trại (Tỉnh/Thành phố, Quận/Huyện, Phường/Xã, Số nhà/Tên đường).");
            return;
        }

        if (!latitude || !longitude) {
            showToast("error", "Vui lòng chọn vị trí trang trại của bạn trên bản đồ.");
            return;
        }

        if (hasVietgap && !vietgapUrl) {
            showToast("error", "Bạn đã chọn chứng nhận VietGAP. Vui lòng tải lên hình ảnh chứng minh.");
            return;
        }

        if (hasGlobalgap && !globalgapUrl) {
            showToast("error", "Bạn đã chọn chứng nhận GlobalGAP. Vui lòng tải lên hình ảnh chứng minh.");
            return;
        }

        if (hasOrganic && !organicUrl) {
            showToast("error", "Bạn đã chọn chứng nhận Hữu cơ. Vui lòng tải lên hình ảnh chứng minh.");
            return;
        }

        setLoading(true);

        const farmAddress = addressService.formatAddress({
            street: street.trim(),
            ward: selectedWard.name,
            district: selectedDistrict.name,
            province: selectedProvince.name
        });

        try {
            await profileService.updateProfile({
                farmName: farmName.trim(),
                farmAddress,
                description: description.trim(),
                avatarUrl: avatarUrl,
                identityCard: identityCard.trim(),
                businessRegistrationUrl: businessRegistrationUrl || null,
                vietgapUrl: hasVietgap ? vietgapUrl : null,
                globalgapUrl: hasGlobalgap ? globalgapUrl : null,
                organicUrl: hasOrganic ? organicUrl : null,
                maxDeliveryDistance: parseFloat(maxDeliveryDistance) || 50.0,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null
            });

            // Update local storage representation
            const updatedUser = { 
                ...currentLocalUser, 
                avatarUrl, 
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
            };
            localStorage.setItem("farmconnect_user", JSON.stringify(updatedUser));

            if (isOnboarding) {
                navigate("/");
            } else {
                showToast("success", "Đã lưu thông tin trang trại thành công!");
            }
        } catch (err) {
            showToast("error", err.message || "Không thể lưu thông tin trang trại. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER DASHBOARD TAB LAYOUT ---
    if (!isOnboarding) {
        return (
            <div className="fd-farm-profile-tab">
                {/* ── TOAST NOTIFICATION ── */}
                {toast && (
                    <div className={`fd-toast fd-toast--${toast.type} ${toastVisible ? 'fd-toast--in' : 'fd-toast--out'}`}>
                        <div className="fd-toast__icon">
                            {toast.type === 'success' ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            )}
                        </div>
                        <div className="fd-toast__body">
                            <p className="fd-toast__title">{toast.type === 'success' ? 'Thành công' : 'Có lỗi xảy ra'}</p>
                            <p className="fd-toast__msg">{toast.message}</p>
                        </div>
                        <button className="fd-toast__close" onClick={() => { setToastVisible(false); setTimeout(() => setToast(null), 400); }}>✕</button>
                        <div className="fd-toast__bar"></div>
                    </div>
                )}

                <div className="farm-form-container">
                    <div className="farm-form-panel">
                        <div className="form-grid-section">
                            <h3 className="section-title">Thông tin cơ bản</h3>
                            
                            <div className="field-group">
                                <label>Tên Trang trại <span className="req">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Hợp tác xã rau sạch Đà Lạt..."
                                    value={farmName}
                                    onChange={(e) => setFarmName(e.target.value)}
                                />
                            </div>

                            <div className="field-group">
                                <label>Bán kính giao hàng tối đa (km) <span className="req">*</span></label>
                                <input
                                    type="number"
                                    min="0.1"
                                    step="0.1"
                                    placeholder="Ví dụ: 50"
                                    value={maxDeliveryDistance}
                                    onChange={(e) => setMaxDeliveryDistance(e.target.value)}
                                />
                            </div>

                            <div className="field-row">
                                <div className="field-group">
                                    <label>Tỉnh / Thành phố <span className="req">*</span></label>
                                    <SearchableSelect
                                        options={provinces}
                                        value={selectedProvince.code}
                                        onChange={handleProvinceChange}
                                        placeholder="Chọn Tỉnh / Thành phố"
                                    />
                                </div>

                                <div className="field-group">
                                    <label>Quận / Huyện <span className="req">*</span></label>
                                    <SearchableSelect
                                        options={districts}
                                        value={selectedDistrict.code}
                                        onChange={handleDistrictChange}
                                        disabled={!selectedProvince.code}
                                        placeholder="Chọn Quận / Huyện"
                                    />
                                </div>
                            </div>

                            <div className="field-row">
                                <div className="field-group">
                                    <label>Phường / Xã <span className="req">*</span></label>
                                    <SearchableSelect
                                        options={wards}
                                        value={selectedWard.code}
                                        onChange={handleWardChange}
                                        disabled={!selectedDistrict.code}
                                        placeholder="Chọn Phường / Xã"
                                    />
                                </div>

                                <div className="field-group">
                                    <label>Số nhà / Tên đường <span className="req">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Số 45, ngõ..."
                                        value={street}
                                        onChange={(e) => setStreet(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="field-group">
                                <label>Mô tả Trang trại</label>
                                <textarea
                                    placeholder="Hãy kể về lịch sử, phương pháp nuôi trồng, các loại giống cây đặc trưng của trang trại bạn..."
                                    rows="4"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
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
                        </div>

                        <div className="form-section-divider"></div>

                        <div className="form-grid-section">
                            <h3 className="section-title">Thông tin pháp lý & Hồ sơ</h3>
                            
                            <div className="field-row">
                                <div className="field-group">
                                    <label>Số CCCD / CMND <span className="req">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Nhập số CCCD hoặc CMND..."
                                        value={identityCard}
                                        onChange={(e) => setIdentityCard(e.target.value.replace(/[^0-9]/g, ''))}
                                    />
                                </div>

                                <div className="field-group">
                                    <label>Giấy đăng ký hộ kinh doanh / Hợp tác xã (Không bắt buộc)</label>
                                    <div className="doc-upload-box" onClick={() => document.getElementById("tab-biz-reg-input").click()}>
                                        <input 
                                            type="file" 
                                            id="tab-biz-reg-input" 
                                            accept="image/*" 
                                            style={{ display: "none" }} 
                                            onChange={(e) => handleDocumentUpload(e, setBusinessRegistrationUrl, setBusinessLoading)}
                                        />
                                        {businessLoading ? (
                                            <div className="upload-loading">Đang tải tài liệu...</div>
                                        ) : businessRegistrationUrl ? (
                                            <div className="doc-preview-wrap">
                                                <img src={businessRegistrationUrl} alt="Business Registration" />
                                                <div className="doc-preview-hover-overlay">Thay đổi tài liệu</div>
                                            </div>
                                        ) : (
                                            <div className="doc-upload-trigger">
                                                <span className="icon">📄</span>
                                                <span className="text">Tải lên ảnh giấy phép kinh doanh</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="form-section-divider"></div>

                        <div className="form-grid-section">
                            <h3 className="section-title">Chứng nhận chất lượng sản phẩm</h3>
                            <p className="section-subtitle">Tích chọn chứng nhận hiện có của trang trại và tải lên hình ảnh minh chứng:</p>
                            
                            <div className="certs-container-tab">
                                {/* VietGAP */}
                                <div className={`cert-item-card ${hasVietgap ? "checked" : ""}`}>
                                    <div className="cert-header-tab">
                                        <label className="cert-checkbox-wrap">
                                            <input 
                                                type="checkbox" 
                                                checked={hasVietgap} 
                                                onChange={(e) => {
                                                    setHasVietgap(e.target.checked);
                                                    if(!e.target.checked) setVietgapUrl("");
                                                }} 
                                            />
                                            <span className="cert-title-text">Chứng nhận VietGAP</span>
                                        </label>
                                    </div>
                                    {hasVietgap && (
                                        <div className="cert-upload-box-tab" onClick={() => document.getElementById("tab-vietgap-input").click()}>
                                            <input 
                                                type="file" 
                                                id="tab-vietgap-input" 
                                                accept="image/*" 
                                                style={{ display: "none" }} 
                                                onChange={(e) => handleDocumentUpload(e, setVietgapUrl, setVietgapLoading)}
                                            />
                                            {vietgapLoading ? (
                                                <div className="upload-loading">Đang tải ảnh...</div>
                                            ) : vietgapUrl ? (
                                                <div className="cert-preview-wrap">
                                                    <img src={vietgapUrl} alt="VietGAP Certificate" />
                                                    <div className="doc-preview-hover-overlay">Thay đổi</div>
                                                </div>
                                            ) : (
                                                <div className="cert-upload-triggerdanger">
                                                    <span className="icon">⚠️</span> Tải ảnh chứng nhận VietGAP *
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* GlobalGAP */}
                                <div className={`cert-item-card ${hasGlobalgap ? "checked" : ""}`}>
                                    <div className="cert-header-tab">
                                        <label className="cert-checkbox-wrap">
                                            <input 
                                                type="checkbox" 
                                                checked={hasGlobalgap} 
                                                onChange={(e) => {
                                                    setHasGlobalgap(e.target.checked);
                                                    if(!e.target.checked) setGlobalgapUrl("");
                                                }} 
                                            />
                                            <span className="cert-title-text">Chứng nhận GlobalGAP</span>
                                        </label>
                                    </div>
                                    {hasGlobalgap && (
                                        <div className="cert-upload-box-tab" onClick={() => document.getElementById("tab-globalgap-input").click()}>
                                            <input 
                                                type="file" 
                                                id="tab-globalgap-input" 
                                                accept="image/*" 
                                                style={{ display: "none" }} 
                                                onChange={(e) => handleDocumentUpload(e, setGlobalgapUrl, setGlobalgapLoading)}
                                            />
                                            {globalgapLoading ? (
                                                <div className="upload-loading">Đang tải ảnh...</div>
                                            ) : globalgapUrl ? (
                                                <div className="cert-preview-wrap">
                                                    <img src={globalgapUrl} alt="GlobalGAP Certificate" />
                                                    <div className="doc-preview-hover-overlay">Thay đổi</div>
                                                </div>
                                            ) : (
                                                <div className="cert-upload-triggerdanger">
                                                    <span className="icon">⚠️</span> Tải ảnh chứng nhận GlobalGAP *
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Organic */}
                                <div className={`cert-item-card ${hasOrganic ? "checked" : ""}`}>
                                    <div className="cert-header-tab">
                                        <label className="cert-checkbox-wrap">
                                            <input 
                                                type="checkbox" 
                                                checked={hasOrganic} 
                                                onChange={(e) => {
                                                    setHasOrganic(e.target.checked);
                                                    if(!e.target.checked) setOrganicUrl("");
                                                }} 
                                            />
                                            <span className="cert-title-text">Chứng nhận Hữu cơ</span>
                                        </label>
                                    </div>
                                    {hasOrganic && (
                                        <div className="cert-upload-box-tab" onClick={() => document.getElementById("tab-organic-input").click()}>
                                            <input 
                                                type="file" 
                                                id="tab-organic-input" 
                                                accept="image/*" 
                                                style={{ display: "none" }} 
                                                onChange={(e) => handleDocumentUpload(e, setOrganicUrl, setOrganicLoading)}
                                            />
                                            {organicLoading ? (
                                                <div className="upload-loading">Đang tải ảnh...</div>
                                            ) : organicUrl ? (
                                                <div className="cert-preview-wrap">
                                                    <img src={organicUrl} alt="Organic Certificate" />
                                                    <div className="doc-preview-hover-overlay">Thay đổi</div>
                                                </div>
                                            ) : (
                                                <div className="cert-upload-triggerdanger">
                                                    <span className="icon">⚠️</span> Tải ảnh chứng nhận Hữu cơ *
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="form-actions-bar">
                            <button className="btn-primary" onClick={handleSave} disabled={loading}>
                                {loading ? "Đang lưu..." : "Lưu thay đổi"}
                            </button>
                        </div>
                    </div>

                    <div className="farm-avatar-panel">
                        <h3>Hình ảnh Trang trại</h3>
                        <p>Sử dụng logo hoặc hình ảnh cổng trang trại của bạn.</p>

                        <div className="avatar-preview-box">
                            {photoLoading ? (
                                <div className="loading" style={{ color: 'var(--green-primary)', fontWeight: 600 }}>Đang tải...</div>
                            ) : avatarUrl ? (
                                <img src={avatarUrl} alt="Farm profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div className="fallback" style={{ fontSize: '60px' }}>🏡</div>
                            )}
                        </div>

                        <button className="btn-secondary btn-upload" onClick={() => document.getElementById("farm-avatar-file-input").click()}>
                            Tải ảnh lên
                        </button>
                        <input
                            type="file"
                            id="farm-avatar-file-input"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={handlePhotoChange}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER ONBOARDING REGISTRATION LAYOUT ---
    return (
        <div className="farm-details-page">
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

            <main className="farm-details-container">
                {/* LEFT COLUMN - HERO IMAGE */}
                <div className="farm-hero-side">
                    <div className="hero-card">
                        <div className="hero-image-placeholder">
                            <div className="hero-overlay-text">
                                <h2>Đồng hành cùng chúng tôi</h2>
                                <p>Tham gia cộng đồng các nhà sản xuất tâm huyết và kết nối trực tiếp với thị trường thành thị.</p>
                            </div>
                        </div>
                        <div className="trust-card">
                            <div className="trust-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#012d1d" strokeWidth="2">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>
                            <div className="trust-content">
                                <h4>Sự tin tưởng là cốt lõi</h4>
                                <p>Mỗi hồ sơ đều trải qua quá trình xác minh để đảm bảo chất lượng dịch vụ tốt nhất cho khách hàng.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN - FORM CONTENT */}
                <div className="farm-form-side">
                    <div className="form-wrapper">
                        <h1>Thông tin Trang trại</h1>
                        <p className="subtitle">Chia sẻ thêm về trang trại của bạn. Thông tin này sẽ được hiển thị công khai tới khách hàng.</p>

                        {success && (
                            <div className="success-message" style={{ color: '#2e7d32', backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #c8e6c9', fontSize: '14px' }}>
                                {success}
                            </div>
                        )}
                        {error && (
                            <div className="error-message" style={{ color: '#d32f2f', backgroundColor: '#ffebee', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ffcdd2', fontSize: '14px' }}>
                                {error}
                            </div>
                        )}

                        <div className="input-group">
                            <label>Tên Trang trại</label>
                            <input 
                                type="text" 
                                placeholder="Ví dụ: Trang trại Xanh" 
                                value={farmName}
                                onChange={(e) => setFarmName(e.target.value)}
                            />
                        </div>

                        <div className="input-group">
                            <label>Bán kính giao hàng tối đa (km)</label>
                            <input 
                                type="number" 
                                min="0.1"
                                step="0.1"
                                placeholder="Ví dụ: 50" 
                                value={maxDeliveryDistance}
                                onChange={(e) => setMaxDeliveryDistance(e.target.value)}
                            />
                        </div>
 
                        <div className="input-row">
                            <div className="input-group">
                                <label>Tỉnh / Thành phố</label>
                                <SearchableSelect
                                    options={provinces}
                                    value={selectedProvince.code}
                                    onChange={handleProvinceChange}
                                    placeholder="Chọn Tỉnh / Thành phố"
                                />
                            </div>
                            <div className="input-group">
                                <label>Quận / Huyện</label>
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
                                <label>Phường / Xã</label>
                                <SearchableSelect
                                    options={wards}
                                    value={selectedWard.code}
                                    onChange={handleWardChange}
                                    disabled={!selectedDistrict.code}
                                    placeholder="Chọn Phường / Xã"
                                />
                            </div>
                            <div className="input-group">
                                <label>Số nhà / Tên đường</label>
                                <input 
                                    type="text" 
                                    placeholder="Số 123, đường..." 
                                    value={street}
                                    onChange={(e) => setStreet(e.target.value)}
                                />
                            </div>
                        </div>
 
                        <div className="input-group">
                            <label>Mô tả Trang trại</label>
                            <textarea 
                                placeholder="Chia sẻ câu chuyện, phương pháp canh tác và giá trị của bạn..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
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
                                        <p>Click để tải lên ảnh khác</p>
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
                                        <p>Ảnh chất lượng cao giúp tăng lượt xem lên tới 40%</p>
                                    </div>
                                </>
                            )}
                        </div>

                        <button 
                            className="btn-continue-farm" 
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? "Đang lưu..." : "Tiếp tục"} <span>→</span>
                        </button>
                        <button 
                            className="btn-skip" 
                            onClick={() => navigate("/home")}
                            disabled={loading}
                        >
                            Bỏ qua lúc này
                        </button>
                    </div>
                </div>
            </main>

            <footer className="onboarding-footer">
                <div className="footer-left">AgriMarket</div>
                <div className="footer-right">
                    <span>Chính sách bảo mật</span>
                    <span>Điều khoản dịch vụ</span>
                    <span>Trung tâm trợ giúp</span>
                    <span>Liên hệ</span>
                    <span className="copyright">© 2026 AgriMarket. Tất cả các quyền được bảo lưu.</span>
                </div>
            </footer>
        </div>
    );
};