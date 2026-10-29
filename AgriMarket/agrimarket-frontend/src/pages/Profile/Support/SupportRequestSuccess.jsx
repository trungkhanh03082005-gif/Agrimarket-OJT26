import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertTriangle, Check, MessageCircle, ArrowLeft } from "lucide-react";
import Header from "../../../components/common/Header/Header";
import Footer from "../../../components/common/Footer/Footer";
import supportRequestService from "../../../services/supportRequestService";
import authService from "../../../services/authService";
import "./SupportRequestSuccess.css";

export default function SupportRequestSuccess() {
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
      <div className="success-page">
        <Header activeTab="support" />
        <div className="success-loading-container">
          <div className="simple-loader"></div>
          <p>Đang tải thông tin yêu cầu...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="success-page">
        <Header activeTab="support" />
        <div className="success-error-container glass-card-main">
          <span className="error-icon-lg" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><AlertTriangle size={40} /></span>
          <h2>Lỗi truy cập</h2>
          <p>{errorMsg}</p>
          <button className="support-btn btn-primary-green" onClick={() => navigate("/support")}>
            Quay lại Hỗ trợ
          </button>
        </div>
      </div>
    );
  }

  // Calculate expected response time (createdAt + 24 hours)
  const createdDate = new Date(request.createdAt);
  const expectedResponseDate = new Date(createdDate.getTime() + 24 * 60 * 60 * 1000);

  return (
    <div className="success-page">
      <Header activeTab="support" />

      <div className="success-main-wrapper">
        <div className="success-content-card glass-card-main">
          {/* Main Success Title */}
          <div className="success-header-section">
            <div className="success-check-circle" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={28} strokeWidth={3} /></div>
            <h2>Yêu cầu của bạn đã được tiếp nhận</h2>
            <p>
              Cảm ơn bạn đã gửi yêu cầu. Đội ngũ hỗ trợ của chúng tôi sẽ xử lý
              và phản hồi trong thời gian sớm nhất.
            </p>
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



          {/* Action Buttons */}
          <div className="success-action-buttons">
            <button 
              className="support-btn btn-primary-green"
              onClick={() => navigate(`/support/chat/${request.id}`)}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><MessageCircle size={16} /> Trò chuyện ngay</span>
            </button>
            <button 
              className="support-btn btn-secondary"
              onClick={() => navigate("/support/my-requests")}
            >
              Xem danh sách yêu cầu
            </button>
          </div>

          {/* Back link */}
          <button 
            type="button" 
            className="back-to-hub-link"
            onClick={() => navigate("/support")}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><ArrowLeft size={14} /> Quay lại Trung tâm hỗ trợ</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
