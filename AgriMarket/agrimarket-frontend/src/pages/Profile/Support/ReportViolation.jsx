import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Package, ShieldCheck, Store, User, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import Header from "../../../components/common/Header/Header";
import authService from "../../../services/authService";
import reportService from "../../../services/reportService";
import "./ReportViolation.css";

const buildInitialFormData = (location) => {
    const searchParams = new URLSearchParams(location.search);
    const reportTarget = location.state?.reportTarget || {};

    return {
        targetType: searchParams.get("targetType") || reportTarget.targetType || "",
        targetId: searchParams.get("targetId") || reportTarget.targetId || "",
        reason: reportTarget.reason || "",
        description: reportTarget.description || "",
        productName: searchParams.get("productName") || reportTarget.productName || "",
        productCategory: searchParams.get("productCategory") || reportTarget.productCategory || "",
        farmerName: searchParams.get("farmerName") || reportTarget.farmerName || "",
        farmerAddress: searchParams.get("farmerAddress") || reportTarget.farmerAddress || "",
        farmerAvatar: searchParams.get("farmerAvatar") || reportTarget.farmerAvatar || "",
        productPrice: searchParams.get("productPrice") || reportTarget.productPrice || "",
    };
};

export default function ReportViolation() {
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = authService.getCurrentUser();

    const [formData, setFormData] = useState(() => buildInitialFormData(location));

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    const violationReasons = [
        "Sản phẩm không đúng mô tả",
        "Sản phẩm giả mạo hoặc gian lận",
        "Người bán có hành vi không phù hợp",
        "Nội dung vi phạm chính sách",
        "Đơn hàng có dấu hiệu bất thường",
        "Lừa đảo hoặc giao dịch đáng ngờ",
        "Khác",
    ];

    useEffect(() => {
        setFormData(buildInitialFormData(location));
        setErrors({});
        setMessage(null);
    }, [location]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setErrors((prev) => ({
            ...prev,
            [name]: "",
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.targetType) {
            newErrors.targetType = "Vui lòng chọn đối tượng cần báo cáo.";
        }

        if (!formData.targetId.trim()) {
            newErrors.targetId = "Vui lòng nhập ID đối tượng cần báo cáo.";
        }

        if (!formData.reason) {
            newErrors.reason = "Vui lòng chọn lý do báo cáo.";
        }

        if (!formData.description.trim()) {
            newErrors.description = "Vui lòng nhập nội dung mô tả vi phạm.";
        } else if (formData.description.trim().length < 20) {
            newErrors.description = "Nội dung mô tả nên có ít nhất 20 ký tự.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitReport = async (e) => {
        e.preventDefault();

        if (!currentUser) {
            navigate("/login");
            return;
        }

        if (!validateForm()) {
            return;
        }

        setSubmitting(true);
        setMessage("");

        const payload = {
            targetType: formData.targetType,
            targetId: Number(formData.targetId),
            reason: formData.reason,
            description: formData.description,
        };

        try {
            await reportService.createReport(payload);

            setMessage({
                type: "success",
                text: "Báo cáo của bạn đã được gửi thành công! Đội ngũ quản trị viên sẽ xem xét và xử lý trong thời gian sớm nhất."
            });

            setFormData({
                targetType: "",
                targetId: "",
                reason: "",
                description: "",
                productName: "",
                productCategory: "",
                farmerName: "",
                farmerAddress: "",
                farmerAvatar: "",
                productPrice: "",
            });
        } catch (error) {
            console.error("Lỗi khi gửi báo cáo vi phạm:", error);
            const errMsg =
                error?.response?.data ||
                error?.message ||
                "Không thể gửi báo cáo. Vui lòng thử lại sau.";
            setMessage({
                type: "error",
                text: errMsg
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="report-violation-page">
            <Header activeTab="support" />

            <main className="report-violation-wrapper">
                <button className="report-back-btn" onClick={() => navigate("/support")}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><ArrowLeft size={14} /> Quay lại Trung tâm hỗ trợ</span>
                </button>

                <section className="report-hero">
                    <div>
                        <span className="report-label">Báo cáo vi phạm</span>
                        <h1>Gửi báo cáo đến AgriMarket</h1>
                        <p>
                            Hãy cung cấp thông tin rõ ràng để đội ngũ quản trị viên có thể kiểm tra,
                            xử lý các sản phẩm, người bán, người mua hoặc đơn hàng có dấu hiệu vi phạm.
                        </p>
                    </div>

                    <div className="report-hero-card">
                        <div className="trust-icon"><ShieldCheck size={28} strokeWidth={2.2} /></div>
                        <h3>Cam kết bảo vệ cộng đồng</h3>
                        <p>
                            Mọi báo cáo sẽ được xem xét cẩn thận nhằm giữ cho thị trường nông sản
                            luôn minh bạch, an toàn và đáng tin cậy.
                        </p>
                    </div>
                </section>

                <section className="report-content-layout">
                    <form className="report-form-card" onSubmit={handleSubmitReport}>
                        {(formData.productName || formData.farmerName || formData.targetId) && (
                            <div className="report-context-card">
                                <div>
                                    <span className="report-context-label">
                                        {formData.targetType === "farmer" ? "Đang báo cáo nhà vườn" : "Đang báo cáo sản phẩm"}
                                    </span>
                                    <h3>{formData.productName || formData.farmerName || "Đối tượng đã chọn"}</h3>
                                </div>

                                <div className="report-context-grid">
                                    <div>
                                        <span>{formData.targetType === "farmer" ? "Mã nhà vườn" : "Mã sản phẩm"}</span>
                                        <strong>{formData.targetId || "-"}</strong>
                                    </div>
                                    {formData.targetType === "farmer" ? (
                                        <>
                                            <div>
                                                <span>Tên nhà vườn</span>
                                                <strong>{formData.farmerName || "-"}</strong>
                                            </div>
                                            <div>
                                                <span>Địa chỉ</span>
                                                <strong>{formData.farmerAddress || "-"}</strong>
                                            </div>
                                            <div>
                                                <span>Ảnh đại diện</span>
                                                <strong>{formData.farmerAvatar ? "Đã đính kèm" : "-"}</strong>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <span>Danh mục</span>
                                                <strong>{formData.productCategory || "-"}</strong>
                                            </div>
                                            <div>
                                                <span>Nông trại / Người bán</span>
                                                <strong>{formData.farmerName || "-"}</strong>
                                            </div>
                                            <div>
                                                <span>Giá bán</span>
                                                <strong>{formData.productPrice ? `${Number(formData.productPrice).toLocaleString("vi-VN")} đ` : "-"}</strong>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="form-header">
                            <h2>Thông tin báo cáo</h2>
                            <p>Vui lòng điền đầy đủ các thông tin bên dưới.</p>
                        </div>

                        <div className="form-group">
                            <label>1. Bạn muốn báo cáo đối tượng nào?</label>

                            <div className="target-type-grid">
                                <label className={`target-option ${formData.targetType === "product" ? "selected" : ""}`}>
                                    <input
                                        type="radio"
                                        name="targetType"
                                        value="product"
                                        checked={formData.targetType === "product"}
                                        onChange={handleChange}
                                    />
                                    <span className="target-icon"><Package size={32} strokeWidth={1.5} /></span>
                                    <strong>Sản phẩm</strong>
                                    <small>Báo cáo sản phẩm sai mô tả, giả mạo hoặc không phù hợp.</small>
                                </label>

                                <label className={`target-option ${formData.targetType === "farmer" ? "selected" : ""}`}>
                                    <input
                                        type="radio"
                                        name="targetType"
                                        value="farmer"
                                        checked={formData.targetType === "farmer"}
                                        onChange={handleChange}
                                    />
                                    <span className="target-icon"><Store size={32} strokeWidth={1.5} /></span>
                                    <strong>Nông trại / Người bán</strong>
                                    <small>Báo cáo hành vi gian lận hoặc vi phạm chính sách.</small>
                                </label>

                                <label className={`target-option ${formData.targetType === "customer" ? "selected" : ""}`}>
                                    <input
                                        type="radio"
                                        name="targetType"
                                        value="customer"
                                        checked={formData.targetType === "customer"}
                                        onChange={handleChange}
                                    />
                                    <span className="target-icon"><User size={32} strokeWidth={1.5} /></span>
                                    <strong>Khách hàng</strong>
                                    <small>Báo cáo người mua có hành vi không phù hợp.</small>
                                </label>
                            </div>

                            {errors.targetType && <span className="error-text">{errors.targetType}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="targetId">2. ID đối tượng cần báo cáo</label>
                            <input
                                id="targetId"
                                type="number"
                                name="targetId"
                                min="1"
                                value={formData.targetId}
                                onChange={handleChange}
                                placeholder="Ví dụ: ID sản phẩm, ID nông trại hoặc ID khách hàng"
                            />
                            {errors.targetId && <span className="error-text">{errors.targetId}</span>}

                            <p className="form-hint">
                                {/* TODO BACKEND:
                    Sau này có thể truyền sẵn targetType và targetId qua URL.
                    Ví dụ: /support/report?targetType=product&targetId=15
                    Khi đó frontend có thể tự điền sẵn thông tin này.
                */}
                                Bạn có thể lấy ID từ trang chi tiết sản phẩm, hồ sơ nông trại hoặc chi tiết đơn hàng.
                            </p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="reason">3. Lý do báo cáo</label>
                            <select
                                id="reason"
                                name="reason"
                                value={formData.reason}
                                onChange={handleChange}
                            >
                                <option value="">Chọn lý do báo cáo...</option>
                                {violationReasons.map((reason) => (
                                    <option key={reason} value={reason}>
                                        {reason}
                                    </option>
                                ))}
                            </select>
                            {errors.reason && <span className="error-text">{errors.reason}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">4. Mô tả chi tiết</label>
                            <textarea
                                id="description"
                                name="description"
                                rows="7"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Hãy mô tả rõ vấn đề bạn gặp phải. Ví dụ: sản phẩm không đúng mô tả, người bán không phản hồi, có dấu hiệu gian lận..."
                            />
                            {errors.description && <span className="error-text">{errors.description}</span>}
                        </div>

                        <div className="report-note-box">
                            <strong>Lưu ý:</strong>
                            <p>
                                Vui lòng báo cáo trung thực. Những báo cáo sai sự thật hoặc cố tình gây ảnh hưởng
                                đến người dùng khác có thể bị hệ thống xử lý theo chính sách của AgriMarket.
                            </p>
                        </div>

                        {message && (
                            <div className={`report-message ${message.type}`} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "8px", marginTop: "20px", fontSize: "14.5px", color: message.type === "success" ? "#10b981" : "#ef4444", backgroundColor: message.type === "success" ? "#ecfdf5" : "#fef2f2", border: `1px solid ${message.type === "success" ? "#a7f3d0" : "#fca5a5"}` }}>
                                <span style={{ display: "inline-flex", alignItems: "center" }}>
                                    {message.type === "success" ? (
                                        <CheckCircle2 size={18} />
                                    ) : (
                                        <XCircle size={18} />
                                    )}
                                </span>
                                <span>{message.text}</span>
                            </div>
                        )}

                        <div className="form-actions">
                            <button
                                type="button"
                                className="cancel-btn"
                                onClick={() => navigate("/support")}
                            >
                                Hủy
                            </button>

                            <button
                                type="submit"
                                className="submit-report-btn"
                                disabled={submitting}
                            >
                                {submitting ? "Đang gửi..." : "Gửi báo cáo"}
                            </button>
                        </div>
                    </form>

                    <aside className="report-side-panel">
                        <div className="side-card">
                            <h3>Quy trình xử lý</h3>

                            <div className="process-step">
                                <span>1</span>
                                <div>
                                    <strong>Tiếp nhận báo cáo</strong>
                                    <p>Hệ thống ghi nhận thông tin báo cáo từ người dùng.</p>
                                </div>
                            </div>

                            <div className="process-step">
                                <span>2</span>
                                <div>
                                    <strong>Quản trị viên kiểm tra</strong>
                                    <p>Admin xem xét đối tượng bị báo cáo và nội dung liên quan.</p>
                                </div>
                            </div>

                            <div className="process-step">
                                <span>3</span>
                                <div>
                                    <strong>Cập nhật trạng thái</strong>
                                    <p>Báo cáo được chuyển sang trạng thái đã xử lý, từ chối hoặc cần kiểm tra thêm.</p>
                                </div>
                            </div>
                        </div>

                        <div className="side-card warning-card">
                            <h3>Thông tin được bảo mật</h3>
                            <p>
                                Danh tính người gửi báo cáo sẽ được bảo vệ. Chỉ quản trị viên có quyền
                                mới được xem và xử lý nội dung báo cáo.
                            </p>
                        </div>
                    </aside>
                </section>
            </main>
        </div>
    );
}