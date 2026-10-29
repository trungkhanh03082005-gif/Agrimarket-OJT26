import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertTriangle, Wrench } from "lucide-react";
import Header from "../../../components/common/Header/Header";
import Footer from "../../../components/common/Footer/Footer";
import supportRequestService from "../../../services/supportRequestService";
import authService from "../../../services/authService";
import "./SupportRequestDetail.css";

export default function SupportRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchRequestDetails = async () => {
      try {
        const data = await supportRequestService.getRequestDetails(id);
        setRequest(data);
      } catch (err) {
        console.error("Lỗi khi tải chi tiết yêu cầu:", err);
        setErrorMsg("Không tìm thấy thông tin yêu cầu hỗ trợ hoặc bạn không có quyền truy cập.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [id]);

  const getStatusClass = (status) => {
    switch (status) {
      case "pending":
        return "status-pending";
      case "assigned":
        return "status-assigned";
      case "processing":
        return "status-processing";
      case "resolved":
        return "status-resolved";
      case "rejected":
        return "status-rejected";
      default:
        return "";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "Đã tiếp nhận";
      case "assigned":
        return "Đã phân công";
      case "processing":
        return "Đang xử lý";
      case "resolved":
        return "Đã giải quyết";
      case "rejected":
        return "Đã từ chối";
      default:
        return status;
    }
  };

  // Determine active steps for the vertical timeline stepper
  const getStepStatus = (stepIndex) => {
    if (!request) return "waiting";
    const status = request.status.toLowerCase();
    
    // Step 0: Đã tiếp nhận (always complete if request exists)
    if (stepIndex === 0) return "completed";
    
    // Step 1: Đang xử lý (complete if assigned, processing, or resolved)
    if (stepIndex === 1) {
      if (status === "assigned" || status === "processing" || status === "resolved") {
        return "completed";
      }
      return "waiting";
    }
    
    // Step 2: Hoàn thành (complete if resolved)
    if (stepIndex === 2) {
      if (status === "resolved") return "completed";
      if (status === "rejected") return "rejected";
      return "waiting";
    }
    
    return "waiting";
  };

  if (loading) {
    return (
      <div className="detail-page">
        <Header activeTab="support" />
        <div className="detail-loading-container">
          <div className="simple-loader"></div>
          <p>Đang tải chi tiết yêu cầu...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="detail-page">
        <Header activeTab="support" />
        <div className="detail-error-container glass-card-main">
          <AlertTriangle size={36} className="error-icon-lg" style={{ color: "#f59e0b", marginBottom: "16px" }} />
          <h2>Lỗi truy cập</h2>
          <p>{errorMsg}</p>
          <button className="support-btn btn-primary-green" onClick={() => navigate("/support")}>
            Quay lại Hỗ trợ
          </button>
        </div>
      </div>
    );
  }

  const createdDate = new Date(request.createdAt);
  const expectedResponseDate = new Date(createdDate.getTime() + 24 * 60 * 60 * 1000);

  return (
    <div className="detail-page">
      <Header activeTab="support" />

      <div className="detail-main-wrapper">
        <div className="detail-content-card glass-card-main">
          
          {/* Header Title */}
          <div className="detail-header-section">
            <span className="detail-badge-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Wrench size={24} /></span>
            <h2>Chi tiết yêu cầu hỗ trợ</h2>
            <p className="detail-desc-subtitle">Theo dõi trạng thái xử lý và phản hồi trực tuyến từ ban quản trị.</p>
          </div>

          {/* Ticket Information Table */}
          <div className="ticket-details-box">
            <div className="detail-row">
              <span className="detail-label">MÃ YÊU CẦU</span>
              <span className="detail-value highlight-value">#REQ-{request.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">NGÀY GỬI</span>
              <span className="detail-value">{createdDate.toLocaleString()}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">TÌNH TRẠNG</span>
              <span className="detail-value">
                <span className={`status-badge-inline ${getStatusClass(request.status)}`}>
                  {getStatusLabel(request.status)}
                </span>
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">DỰ KIẾN PHẢN HỒI</span>
              <span className="detail-value">{expectedResponseDate.toLocaleString()}</span>
            </div>
          </div>

          {/* Admin Response Section (if exists) */}
          {request.adminNotes && (
            <div className="admin-notes-section">
              <h4>Phản hồi từ Ban quản trị:</h4>
              <div className="admin-notes-bubble">
                <p>{request.adminNotes}</p>
                <span className="admin-notes-time">
                  Cập nhật lúc: {request.updatedAt ? new Date(request.updatedAt).toLocaleString() : ""}
                </span>
              </div>
            </div>
          )}

          {/* Vertical Stepper Timeline */}
          <div className="tracking-timeline-stepper">
            {/* Step 1 */}
            <div className={`stepper-node-row ${getStepStatus(0)}`}>
              <div className="stepper-dot-indicator">
                <span className="stepper-dot"></span>
                <span className="stepper-line"></span>
              </div>
              <div className="stepper-text-content">
                <h4>Đã tiếp nhận</h4>
                <p>Hệ thống đã ghi nhận yêu cầu của bạn.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className={`stepper-node-row ${getStepStatus(1)}`}>
              <div className="stepper-dot-indicator">
                <span className="stepper-dot"></span>
                <span className="stepper-line"></span>
              </div>
              <div className="stepper-text-content">
                <h4>Đang xử lý</h4>
                <p>Chúng tôi đang xem xét chi tiết vấn đề.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className={`stepper-node-row ${getStepStatus(2)}`}>
              <div className="stepper-dot-indicator">
                <span className="stepper-dot"></span>
              </div>
              <div className="stepper-text-content">
                {request.status === "rejected" ? (
                  <>
                    <h4 className="text-danger">Đã từ chối</h4>
                    <p>Yêu cầu không được phê duyệt. Vui lòng xem phản hồi từ Admin.</p>
                  </>
                ) : (
                  <>
                    <h4>Hoàn thành</h4>
                    <p>Yêu cầu đã được giải quyết.</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Ticket Body Content */}
          <div className="ticket-body-content">
            <h4>Nội dung chi tiết yêu cầu đã gửi:</h4>
            <div className="ticket-body-card">
              <p><strong>Tiêu đề:</strong> {request.title}</p>
              <p><strong>Danh mục:</strong> {request.category}</p>
              {request.orderCode && <p><strong>Mã đơn hàng liên quan:</strong> {request.orderCode}</p>}
              <p className="ticket-desc-text"><strong>Nội dung:</strong> {request.description}</p>
              {request.attachmentUrl && (
                <div className="ticket-attachment-info">
                  <strong>Tài liệu đính kèm: </strong>
                  <a href={request.attachmentUrl} target="_blank" rel="noopener noreferrer" className="attachment-download-link">
                    Xem tài liệu ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="detail-action-buttons">
            <button 
              className="support-btn btn-primary-green"
              onClick={() => navigate("/support/my-requests")}
            >
              Xem danh sách yêu cầu
            </button>
            <button 
              className="support-btn btn-secondary"
              onClick={() => navigate("/support")}
            >
              Quay lại Trung tâm hỗ trợ
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
