// src/pages/Profile/EditProfile.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useProfile from "../../hooks/useProfile";
import ProfileLayout from "../../components/profile/ProfileLayout";
import ProfileHeader from "../../components/profile/ProfileHeader";
import ProfileAvatar from "../../components/profile/ProfileAvatar";
import ProfileFooter from "../../components/profile/ProfileFooter";
import { USER_ROLES } from "../../constants/profileConstants";
import { buildProfileUpdatePayload } from "../../utils/profileMapper";
import apiClient from "../../services/apiClient";
import * as addressService from "../../services/addressService";
import { MapPicker } from "../../components/MapPicker/MapPicker";
import SearchableSelect from "../../components/common/SearchableSelect/SearchableSelect";
import "./Profile.css";

const EditProfile = () => {
  const navigate = useNavigate();

  const {
    profile,
    isProfileLoading,
    updateProfile,
  } = useProfile();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    avatarUrl: "",
    farmName: "",
    farmAddress: "",
    description: "",
    address: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [formMessage, setFormMessage] = useState("");

  // Address States
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [addrProvince, setAddrProvince] = useState({ code: "", name: "" });
  const [addrWard, setAddrWard] = useState({ code: "", name: "" });
  const [addrStreet, setAddrStreet] = useState("");
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
          setAddrStreet(geoResult.street);
        }

        // Match province/city
        const provinceCandidates = [
          geoResult.province,
          geoResult.city,
          ...(geoResult.provinceCandidates || [])
        ].filter(Boolean);

        const provinceMatch = addressService.findMatchingUnit(provinces, provinceCandidates);

        if (provinceMatch) {
          const provCode = provinceMatch.code;
          const isProvinceChanged = addrProvince.code !== String(provCode);
          setAddrProvince({ code: String(provCode), name: provinceMatch.name });

          const currentWards = isProvinceChanged || wards.length === 0
            ? await addressService.getWardsByProvinceV2(provCode)
            : wards;
          if (isProvinceChanged || wards.length === 0) {
            setWards(currentWards);
          }

          const wardCandidates = [
            geoResult.ward,
            geoResult.district,
            ...(geoResult.wardCandidates || [])
          ].filter(Boolean);
          const wardMatch = addressService.findMatchingUnit(currentWards, wardCandidates);
          if (wardMatch) {
            setAddrWard({ code: String(wardMatch.code), name: wardMatch.name });
          } else if (isProvinceChanged) {
            setAddrWard({ code: "", name: "" });
          }
        }
      }
    } catch (err) {
      console.error("Reverse geocoding failed: ", err);
    }
  };

  // Load the current province list (the administrative model no longer has districts).
  useEffect(() => {
    const initProvinces = async () => {
      const provs = await addressService.getProvincesV2();
      setProvinces(provs);
      if (provs.length === 0) {
        setFormMessage("Không thể tải danh sách tỉnh/thành phố. Vui lòng tải lại trang.");
      }
    };
    initProvinces();
  }, []);

  // Parse and initialize address when profile or provinces load
  useEffect(() => {
    if (!profile || provinces.length === 0) return;

    const defaultAddress = profile.addresses?.find((address) => address.isDefault) || profile.addresses?.[0];
    const rawAddress = defaultAddress?.address || "";

    const initLat = defaultAddress?.latitude ?? null;
    const initLon = defaultAddress?.longitude ?? null;
    
    setLatitude(initLat);
    setLongitude(initLon);

    const initializeAddress = async () => {
      const parsed = addressService.parseAddress(rawAddress);
      
      if (!parsed.province) {
        setAddrStreet(rawAddress);
        setAddrProvince({ code: "", name: "" });
        setAddrWard({ code: "", name: "" });
        setWards([]);
        return;
      }

      setAddrStreet(parsed.street || "");

      // Find province
      const provinceMatch = addressService.findMatchingUnit(provinces, parsed.province);

      if (provinceMatch) {
        const provCode = provinceMatch.code;
        setAddrProvince({ code: String(provCode), name: provinceMatch.name });

        const provinceWards = await addressService.getWardsByProvinceV2(provCode);
        setWards(provinceWards);

        const legacyWard = parsed.ward || parsed.district;
        let wardMatch = addressService.findMatchingUnit(provinceWards, legacyWard);
        if (!wardMatch && legacyWard) {
          const legacyMatches = await addressService.lookupLegacyWard(legacyWard);
          const legacyMatch = legacyMatches?.find(
            (item) => String(item.ward?.province_code) === String(provCode)
          );
          wardMatch = legacyMatch
            ? provinceWards.find((ward) => String(ward.code) === String(legacyMatch.ward.code))
            : null;
        }
        if (wardMatch) {
          setAddrWard({ code: String(wardMatch.code), name: wardMatch.name });
        } else {
          setAddrWard({ code: "", name: "" });
        }
      } else {
        setAddrProvince({ code: "", name: "" });
        setAddrWard({ code: "", name: "" });
        setWards([]);
      }
    };

    initializeAddress();
  }, [profile, provinces]);

  const handleProvinceChange = async (e) => {
    const provinceCode = e.target.value;
    const provinceObj = provinces.find((p) => p.code === parseInt(provinceCode));
    if (provinceObj) {
      setAddrProvince({ code: provinceCode, name: provinceObj.name });
      setAddrWard({ code: "", name: "" });
      const provCoords = addressService.getProvinceCoordinates(provinceObj.name);
      if (provCoords) {
        setLatitude(provCoords[0]);
        setLongitude(provCoords[1]);
      }
      const provinceWards = await addressService.getWardsByProvinceV2(provinceCode);
      setWards(provinceWards);
    } else {
      setAddrProvince({ code: "", name: "" });
      setAddrWard({ code: "", name: "" });
      setWards([]);
      setLatitude(null);
      setLongitude(null);
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

  useEffect(() => {
    if (!profile) return;

    if (profile.role === USER_ROLES.ADMIN) {
      navigate("/profile");
      return;
    }

    setFormData({
      fullName: profile.fullName || "",
      email: profile.email || "",
      phone: profile.phone || "",
      avatarUrl: profile.avatarUrl || "",
      farmName: profile.farmName || "",
      farmAddress: profile.farmAddress || "",
      description: profile.description || "",
      address: profile.addresses?.[0]?.address || "",
    });
    setAvatarPreview("");
    setIsUploadingAvatar(false);
  }, [profile, navigate]);

  const handleChange = (event) => {
    let { name, value } = event.target;

    if (name === "phone") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // Instant local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);

    setIsUploadingAvatar(true);
    // Upload to live backend
    try {
      const uploadData = new FormData();
      uploadData.append("avatar", file);
      
      const response = await apiClient.post("/api/upload/avatar", uploadData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.avatarUrl) {
        setFormData((prev) => ({
          ...prev,
          avatarUrl: response.data.avatarUrl,
        }));
        setAvatarPreview("");
      }
    } catch (error) {
      console.error("Error uploading avatar image:", error);
      setAvatarPreview("");
      alert("Tải lên ảnh thất bại. Vui lòng thử lại!");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    setFormData((prev) => ({
      ...prev,
      avatarUrl: "",
    }));
    setAvatarPreview("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!profile) return;

    if (!formData.fullName.trim()) {
      setFormMessage("Họ và tên không được để trống.");
      return;
    }

    if (!formData.phone) {
      setFormMessage("Số điện thoại không được để trống.");
      return;
    }
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      setFormMessage("Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 chữ số và bắt đầu bằng số 0.");
      return;
    }

    if (profile.role === USER_ROLES.CUSTOMER || profile.role === USER_ROLES.FARMER) {
      if (!addrProvince.code || !addrWard.code || !addrStreet.trim()) {
        setFormMessage("Vui lòng nhập đầy đủ địa chỉ (Tỉnh/Thành phố, Phường/Xã, Số nhà/Tên đường).");
        return;
      }
      if (latitude === null || longitude === null) {
        setFormMessage("Vui lòng chọn vị trí trên bản đồ.");
        return;
      }
    }

    setIsSaving(true);
    setFormMessage("");

    const formattedAddress = addressService.formatAddress({
      street: addrStreet.trim(),
      ward: addrWard.name,
      district: "",
      province: addrProvince.name,
    });

    const updatedFormData = {
      ...formData,
      address: formattedAddress,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
    };

    try {
      const payload = buildProfileUpdatePayload(USER_ROLES.CUSTOMER, updatedFormData);

      await updateProfile(payload, USER_ROLES.CUSTOMER);

      setFormMessage("Cập nhật hồ sơ thành công.");

      setTimeout(() => {
        navigate("/profile");
      }, 700);
    } catch (error) {
      console.error("Submit profile error:", error);
      setFormMessage("Cập nhật hồ sơ thất bại. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isProfileLoading) {
    return (
      <div className="profile-center-state">
        Đang tải thông tin chi tiết...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-center-state">
        Bạn chưa đăng nhập.
      </div>
    );
  }

  if (profile.role === USER_ROLES.ADMIN) {
    return null;
  }

  return (
    <ProfileLayout profile={profile}>
      <section className="profile-content">
        <ProfileHeader
          title="Chỉnh sửa hồ sơ"
          subtitle="Cập nhật thông tin cá nhân và chi tiết tài khoản của bạn."
        />

        <form className="profile-card edit-profile-card" onSubmit={handleSubmit}>
          <div className="edit-avatar-section">
            <div className="edit-avatar-box">
              <ProfileAvatar
                src={avatarPreview || formData.avatarUrl}
                name={formData.fullName}
                email={formData.email}
                size="large"
              />

              <span className="edit-avatar-dot">✎</span>
            </div>

            <div>
              <h3>Ảnh đại diện</h3>
              <p>
                Vui lòng sử dụng ảnh chân dung rõ nét, kích thước tối thiểu 400x400px.
              </p>

              <div className="edit-avatar-actions">
                <label className="profile-secondary-button file-upload-button">
                  Tải lên ảnh mới
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </label>

                <button
                  type="button"
                  className="profile-danger-text-button"
                  onClick={handleRemoveAvatar}
                >
                  Xóa ảnh
                </button>
              </div>
            </div>
          </div>

          <div className="edit-form-grid">
            <div className="form-group full-width">
              <label>Họ và tên</label>
              <input
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Nhập họ và tên"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                name="email"
                value={formData.email}
                disabled
              />

              <small>
                Email này dùng để đăng nhập và không thể chỉnh sửa tại đây.
              </small>
            </div>

            <div className="form-group">
              <label>Số điện thoại</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                maxLength={10}
                placeholder="Nhập số điện thoại"
              />
            </div>

            {(profile.role === USER_ROLES.CUSTOMER || profile.role === USER_ROLES.FARMER) && (
              <>
                <div className="form-group">
                  <label>Tỉnh / Thành phố</label>
                  <SearchableSelect
                    options={provinces}
                    value={addrProvince.code}
                    onChange={handleProvinceChange}
                    placeholder="Chọn Tỉnh / Thành phố"
                  />
                </div>

                <div className="form-group">
                  <label>Phường / Xã</label>
                  <SearchableSelect
                    options={wards}
                    value={addrWard.code}
                    onChange={handleWardChange}
                    disabled={!addrProvince.code}
                    placeholder="Chọn Phường / Xã"
                  />
                </div>

                <div className="form-group">
                  <label>Số nhà / Tên đường</label>
                  <input
                    type="text"
                    placeholder="Số nhà, ngõ, tên đường..."
                    value={addrStreet}
                    onChange={(e) => setAddrStreet(e.target.value)}
                  />
                </div>

                <div className="form-group full-width" style={{ gridColumn: "span 2" }}>
                  <MapPicker
                    latitude={latitude}
                    longitude={longitude}
                    onChange={handleMapLocationChange}
                    defaultAddress={addressService.formatAddress({
                      street: addrStreet.trim(),
                      ward: addrWard.name,
                      district: "",
                      province: addrProvince.name,
                    })}
                  />
                </div>
              </>
            )}
          </div>

          {formMessage && (
            <p className="profile-form-message">
              {formMessage}
            </p>
          )}

          <div className="edit-form-actions">
            <button
              type="button"
              className="profile-secondary-button"
              onClick={() => navigate("/profile")}
            >
              Hủy
            </button>

            <button
              type="submit"
              className="profile-primary-button"
              disabled={isSaving || isUploadingAvatar}
            >
              {isSaving ? "Đang lưu..." : (isUploadingAvatar ? "Đang tải ảnh..." : "Lưu thay đổi")}
            </button>
          </div>
        </form>
      </section>

      <ProfileFooter />
    </ProfileLayout>
  );
};

export default EditProfile;