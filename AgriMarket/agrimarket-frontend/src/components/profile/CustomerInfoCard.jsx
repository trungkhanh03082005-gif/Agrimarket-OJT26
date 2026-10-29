// src/components/profile/CustomerInfoCard.jsx

const CustomerInfoCard = ({ profile }) => {
  const defaultAddress = profile?.addresses?.find((item) => item.isDefault || item.is_default) || profile?.addresses?.[0];

  return (
    <section className="profile-card profile-detail-card">
      <div className="profile-card-title-row">
        <h3>Thông tin khách hàng</h3>
      </div>

      <div className="profile-detail-list">
        <div>
          <p>Họ và tên</p>
          <strong>{profile?.fullName || "Chưa cập nhật"}</strong>
        </div>

        <div>
          <p>Email</p>
          <strong>{profile?.email || "Chưa cập nhật"}</strong>
        </div>

        <div>
          <p>Số điện thoại</p>
          <strong style={!profile?.phone ? { color: "#d97706", fontStyle: "italic" } : {}}>
            {profile?.phone || "Chưa cập nhật"}
          </strong>
        </div>

        <div>
          <p>Địa chỉ mặc định</p>
          <strong>{defaultAddress?.address || "Chưa cập nhật"}</strong>
        </div>
      </div>
    </section>
  );
};

export default CustomerInfoCard;