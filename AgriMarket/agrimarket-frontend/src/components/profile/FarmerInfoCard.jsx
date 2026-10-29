// src/components/profile/FarmerInfoCard.jsx

import { FARMER_VERIFICATION_LABELS } from "../../constants/profileConstants";

const FarmerInfoCard = ({ profile }) => {
  const verificationText =
    FARMER_VERIFICATION_LABELS[profile?.verificationStatus] ||
    profile?.verificationStatus ||
    "Chưa xác minh";

  return (
    <section className="profile-card profile-detail-card farm-info-card">
      <div className="profile-card-title-row">
        <h3>Thông tin trang trại</h3>
        <span className="profile-badge light">
          {verificationText}
        </span>
      </div>

      <div className="profile-detail-list">
        <div>
          <p>Tên trang trại / Doanh nghiệp</p>
          <strong>{profile?.farmName || "Chưa cập nhật"}</strong>
        </div>

        <div>
          <p>Địa chỉ trang trại</p>
          <strong>{profile?.farmAddress || "Chưa cập nhật"}</strong>
        </div>

        <div>
          <p>Mô tả trang trại</p>
          <strong>{profile?.description || "Chưa cập nhật"}</strong>
        </div>
      </div>

      <div className="farm-stat-grid">
        <div>
          <p>Đánh giá trung bình</p>
          <strong>{profile?.ratingAverage || 0}/5</strong>
        </div>

        <div>
          <p>Tổng số sản phẩm</p>
          <strong>{profile?.totalProducts || 0}</strong>
        </div>
      </div>
    </section>
  );
};

export default FarmerInfoCard;