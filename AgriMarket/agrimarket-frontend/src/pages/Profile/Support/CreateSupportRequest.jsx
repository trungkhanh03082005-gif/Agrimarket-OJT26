import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Paperclip, 
  X, 
  UploadCloud, 
  Clock, 
  Phone, 
  Truck, 
  CreditCard, 
  User, 
  Wrench, 
  Settings, 
  ChevronDown, 
  ChevronRight 
} from "lucide-react";
import Header from "../../../components/common/Header/Header";
import Footer from "../../../components/common/Footer/Footer";
import supportRequestService from "../../../services/supportRequestService";
import apiClient from "../../../services/apiClient";
import authService from "../../../services/authService";
import "./CreateSupportRequest.css";

export default function CreateSupportRequest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);

  // Form states
  const [category, setCategory] = useState("Khác");
  const [orderCode, setOrderCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  
  // UI states
  const [currentStep, setCurrentStep] = useState(1); // 1: Điền thông tin, 2: Gửi yêu cầu (loading/confirm), 3: Hoàn tất
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const faqData = [
    {
      question: "Làm sao để thay đổi địa chỉ nhận hàng?",
      answer: "Bạn có thể thay đổi địa chỉ giao nhận trong phần Cài đặt tài khoản trước khi đơn hàng được nhà vườn xác nhận đóng gói. Sau thời điểm đó, vui lòng liên hệ hotline 1900 123 456 để được trợ giúp kịp thời."
    },
    {
      question: "Quy trình hoàn trả hàng hỏng hóc?",
      answer: "Hãy chụp ảnh hoặc quay video sản phẩm ngay khi nhận từ shipper. Truy cập 'Lịch sử đơn hàng', nhấn 'Khiếu nại' và tải minh chứng lên. Ban quản lý sẽ đối chiếu và tiến hành xử lý hoàn trả tiền trong tối đa 24 giờ."
    },
    {
      question: "Thời gian thanh toán công nợ?",
      answer: "Đối với khách mua sỉ/đại lý có liên kết hợp đồng hỗ trợ công nợ, hạn mức thanh toán thường là 15 đến 30 ngày kể từ ngày ký biên bản nhận hàng thành công."
    },
    {
      question: "Làm sao để đăng ký tài khoản Nông dân?",
      answer: "Chọn mục 'Nông dân' ở menu trên đầu trang, điền đầy đủ thông tin nhà vườn, mã số đăng ký kinh doanh/nông nghiệp (nếu có) và gửi duyệt. Ban quản trị sẽ xác minh và kích hoạt tài khoản trong vòng 12-24 giờ."
    },
    {
      question: "Cách liên hệ trực tiếp với người bán?",
      answer: "Bạn chỉ cần nhấn vào nút 'Trò chuyện' (biểu tượng nhắn tin) ngay tại trang chi tiết sản phẩm của nhà vườn đó để gửi tin nhắn trao đổi miễn phí."
    }
  ];

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate("/login");
      return;
    }
    setUser(currentUser);

    // Đọc category từ query param (nếu có)
    const catParam = searchParams.get("category");
    if (catParam) {
      setCategory(catParam);
    }
  }, [searchParams, navigate]);

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return;

    // Check size limit: max 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("Tệp đính kèm không được vượt quá 5MB");
      return;
    }

    setIsUploading(true);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiClient.post("/api/upload/file", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      if (response.data && response.data.fileUrl) {
        setAttachmentUrl(response.data.fileUrl);
        setAttachmentName(file.name);
      }
    } catch (err) {
      console.error("Lỗi tải lên tệp:", err);
      setErrorMsg("Tải tệp lên thất bại. Vui lòng thử lại!");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  // Submit support request
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg("Vui lòng điền đầy đủ Tiêu đề và Mô tả chi tiết");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    setCurrentStep(2); // Gửi yêu cầu step

    try {
      const requestData = {
        category,
        orderCode: orderCode.trim() || null,
        title: title.trim(),
        description: description.trim(),
        attachmentUrl: attachmentUrl || null
      };

      const result = await supportRequestService.createRequest(requestData);
      
      // Thành công -> Chuyển sang bước 3 (Hoàn tất) và dẫn đến trang success
      setTimeout(() => {
        navigate(`/support/success/${result.id}`);
      }, 1000);

    } catch (err) {
      console.error("Lỗi khi gửi yêu cầu:", err);
      setErrorMsg(err.response?.data || "Gửi yêu cầu thất bại. Vui lòng kiểm tra lại!");
      setCurrentStep(1); // Trở về bước điền thông tin để sửa
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-support-page">
      <Header activeTab="support" />

      {/* Main Form Area */}
      <div className="create-support-container">
        <h1 className="page-main-title">Tạo yêu cầu hỗ trợ</h1>

        <div className="create-support-layout">
          {/* Form component */}
          <form className="support-form-card glass-card-main" onSubmit={handleSubmit}>
            {errorMsg && <div className="support-error-alert">{errorMsg}</div>}

            <div className="form-row-two-col">
              <div className="form-group">
                <label className="form-label required-label">Danh mục hỗ trợ</label>
                <div className="select-wrapper">
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="Theo dõi Giao hàng">Theo dõi Giao hàng</option>
                    <option value="Thanh toán & Hóa đơn">Thanh toán & Hóa đơn</option>
                    <option value="Tài khoản & Bảo mật">Tài khoản & Bảo mật</option>
                    <option value="Hỗ trợ Kỹ thuật">Hỗ trợ Kỹ thuật</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mã đơn hàng liên quan (nếu có)</label>
                <input 
                  type="text" 
                  className="form-input-text" 
                  value={orderCode} 
                  onChange={(e) => setOrderCode(e.target.value)} 
                  placeholder="VD: ORD-2024-892"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required-label">Tiêu đề</label>
              <input 
                type="text" 
                className="form-input-text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Tóm tắt ngắn gọn vấn đề của bạn"
                required
              />
            </div>


            <div className="form-group">
              <label className="form-label required-label">Mô tả chi tiết</label>
              <textarea 
                className="form-textarea" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Mô tả chi tiết vấn đề bạn đang gặp phải..."
                rows={6}
                required
              ></textarea>
            </div>

            {/* Drag & Drop File Upload Area */}
            <div className="form-group">
              <label className="form-label">Tài liệu đính kèm (Hình ảnh, PDF)</label>
              
              <div 
                className={`file-drop-zone ${isUploading ? "uploading" : ""} ${attachmentUrl ? "has-file" : ""}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {isUploading ? (
                  <div className="upload-loader-wrapper">
                    <div className="simple-loader"></div>
                    <p>Đang tải tệp lên...</p>
                  </div>
                ) : attachmentUrl ? (
                  <div className="uploaded-file-preview">
                    <span className="file-preview-icon" style={{ display: "inline-flex", alignItems: "center" }}><Paperclip size={16} /></span>
                    <span className="file-preview-name">{attachmentName || "file_dinh_kem"}</span>
                    <button 
                      type="button" 
                      className="remove-file-btn"
                      onClick={() => {
                        setAttachmentUrl("");
                        setAttachmentName("");
                      }}
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      Xóa tệp <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="drop-zone-content">
                    <span className="upload-cloud-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><UploadCloud size={32} /></span>
                    <p className="drop-zone-main-text">Kéo thả file vào đây hoặc</p>
                    <label className="browse-file-btn">
                      Duyệt file
                      <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        style={{ display: "none" }} 
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="drop-zone-sub-text">Hỗ trợ JPG, PNG, PDF (Tối đa 5MB)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Form actions */}
            <div className="form-actions-buttons">
              <button 
                type="button" 
                className="form-btn-cancel" 
                onClick={() => navigate("/support")}
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button 
                type="submit" 
                className="form-btn-submit btn-primary-green"
                disabled={isSubmitting || isUploading}
              >
                {isSubmitting ? "Đang gửi..." : "Gửi Yêu Cầu"}
              </button>
            </div>
          </form>

          {/* Right Sidebar */}
          <aside className="create-support-sidebar">
            {/* Box 1: Support Info */}
            <div className="support-info-card sidebar-box">
              <h3>Thông tin hỗ trợ</h3>
              <ul className="info-list">
                <li>
                  <span className="info-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Clock size={18} /></span>
                  <div>
                    <strong>GIỜ LÀM VIỆC</strong>
                    <p>Thứ 2 - Thứ 6: 08:00 - 17:30</p>
                    <p>Thứ 7: 08:00 - 12:00</p>
                  </div>
                </li>
                <li>
                  <span className="info-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Clock size={18} /></span>
                  <div>
                    <strong>THỜI GIAN PHẢN HỒI DỰ KIẾN</strong>
                    <p>Trong vòng 24 giờ làm việc</p>
                  </div>
                </li>
                <li>
                  <span className="info-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Phone size={18} /></span>
                  <div>
                    <strong>HOTLINE KHẨN CẤP</strong>
                    <p className="highlight-text">1900 123 456</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Box 2: FAQs */}
            <div className="faq-sidebar-card sidebar-box">
              <h3>Câu hỏi thường gặp</h3>
              <ul className="faq-accordion-list">
                {faqData.map((faq, idx) => (
                  <li key={idx} className={`faq-accordion-item ${openFaqIndex === idx ? "active" : ""}`}>
                    <div className="faq-accordion-header" onClick={() => toggleFaq(idx)}>
                      <span>{faq.question}</span>
                      <span className="faq-chevron" style={{ display: "inline-flex", alignItems: "center" }}>{openFaqIndex === idx ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                    </div>
                    {openFaqIndex === idx && (
                      <div className="faq-accordion-answer">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
