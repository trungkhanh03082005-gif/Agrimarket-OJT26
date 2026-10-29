import React, { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AlertTriangle, Package, Clock, Lightbulb, Zap } from "lucide-react";
import * as productService from "../../../services/productService";
import orderService from "../../../services/orderService";

import apiClient from "../../../services/apiClient";

export const FarmerOverview = () => {
  const navigate = useNavigate();
  const { farmerProfile, currentUser } = useOutletContext();

  const [overviewStats, setOverviewStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    pendingOrdersCount: 0,
    totalSales: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/api/farmers/dashboard-stats');
        if (res && res.data) {
          setOverviewStats({
            totalProducts: res.data.totalProducts || 0,
            lowStockCount: res.data.lowStockCount || 0,
            pendingOrdersCount: res.data.pendingOrdersCount || 0,
            totalSales: res.data.totalSales || 0,
          });
        }
      } catch (err) {
        console.error("Lỗi khi lấy dữ liệu tổng quan:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  return (
    <div className="fd-overview-tab">
      {/* Verification status alert */}
      {!loading && (!farmerProfile?.verificationStatus || farmerProfile.verificationStatus !== "verified") && (
        <div className="fd-alert alert-warning">
          <span className="icon" style={{ display: "inline-flex", alignItems: "center" }}><AlertTriangle size={18} /></span>
          <div className="body">
            {farmerProfile?.verificationStatus === "rejected" ? (
              <>
                <strong>Hồ sơ trang trại đã bị từ chối kiểm duyệt</strong>
                <p>Hồ sơ của bạn không đạt yêu cầu kiểm duyệt. Vui lòng cập nhật lại thông tin trang trại hoặc liên hệ ban quản trị để được hỗ trợ.</p>
              </>
            ) : (
              <>
                <strong>Hồ sơ trang trại đang chờ kiểm duyệt</strong>
                <p>Ban quản trị đang rà soát hồ sơ của bạn. Bạn vẫn có thể thêm sản phẩm nhưng sản phẩm sẽ chỉ xuất hiện ngoài gian hàng sau khi trang trại được duyệt.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="fd-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-bg bg-green" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Package size={24} />
          </div>
          <div className="stat-details">
            <p className="label">TỔNG SẢN PHẨM</p>
            <p className="value">{loading ? "..." : overviewStats.totalProducts}</p>
            <button className="shortcut-btn" onClick={() => navigate("/farmer/products")}>Xem danh sách</button>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-bg bg-red" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-details">
            <p className="label">TỒN KHO SẮP HẾT</p>
            <p className="value">{loading ? "..." : overviewStats.lowStockCount}</p>
            <span className="change-hint">Số lượng &le; 5 đơn vị</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-bg bg-orange" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Clock size={24} />
          </div>
          <div className="stat-details">
            <p className="label">ĐƠN HÀNG CHỜ XÁC NHẬN</p>
            <p className="value">{loading ? "..." : overviewStats.pendingOrdersCount}</p>
            <button className="shortcut-btn" onClick={() => navigate("/farmer/orders")}>Xem đơn hàng</button>
          </div>
        </div>

        <div className="stat-card highlighted">
          <div className="stat-details">
            <p className="label label-light">TỔNG DOANH THU</p>
            <p className="value value-large">{loading ? "..." : overviewStats.totalSales.toLocaleString("vi-VN")} đ</p>
            <span className="change-hint change-hint-light">Đã hoàn thành giao hàng</span>
          </div>
        </div>
      </div>

      {/* Quick links & tips */}
      <div className="fd-overview-extra">
        <div className="extra-card tips-card">
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}><Lightbulb size={20} /> Mẹo bán hàng hiệu quả</h3>
          <ul>
            <li>Sử dụng tính năng <strong>AI gợi ý mô tả</strong> để viết nội dung hấp dẫn, thu hút người mua.</li>
            <li>Nên cập nhật chính xác ngày thu hoạch và hạn sử dụng để tạo độ tin cậy tuyệt đối.</li>
            <li>Đăng tải ít nhất 3 ảnh sản phẩm sắc nét ở các góc chụp khác nhau.</li>
          </ul>
        </div>
        <div className="extra-card actions-card">
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}><Zap size={20} /> Thao tác nhanh</h3>
          <div className="actions-button-grid">
            <button className="btn-primary" onClick={() => navigate("/farmer/products/add")}>
              + Thêm sản phẩm mới
            </button>
            <button className="btn-secondary" onClick={() => navigate("/farmer/farm-profile")}>
              Chỉnh sửa trang trại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerOverview;
