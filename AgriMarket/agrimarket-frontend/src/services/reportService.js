import apiClient from "./apiClient";

const reportService = {
  /**
   * Gửi báo cáo vi phạm mới.
   * @param {Object} data - { targetType, targetId, reason, description }
   */
  createReport: async (data) => {
    const response = await apiClient.post("/api/reports", data);
    return response.data;
  },

  /**
   * Lấy danh sách báo cáo của người dùng hiện tại.
   * @param {string} [status] - Lọc theo trạng thái (pending, reviewing, resolved, rejected, all)
   */
  getMyReports: async (status) => {
    const params = status && status !== "all" ? { status } : {};
    const response = await apiClient.get("/api/reports/my", { params });
    return response.data;
  },

  // ─── Admin APIs ────────────────────────────────────────────────────────────

  /**
   * [Admin] Lấy tất cả báo cáo, tuỳ chọn lọc theo trạng thái.
   * @param {string} [status]
   */
  getAllReports: async (status) => {
    const params = status && status !== "all" ? { status } : {};
    const response = await apiClient.get("/api/reports/admin", { params });
    return response.data;
  },

  /**
   * [Admin] Lấy báo cáo phân trang phía Server.
   */
  getAllReportsPaged: async (params) => {
    const response = await apiClient.get("/api/reports/admin/paged", { params });
    return response.data;
  },

  /**
   * [Admin] Cập nhật trạng thái xử lý báo cáo.
   * @param {number} id - ID báo cáo
   * @param {string} status - Trạng thái mới (pending, reviewing, resolved, rejected)
   * @param {string} [adminNotes] - Ghi chú admin
   */
  updateReportStatus: async (id, status, adminNotes = "") => {
    const response = await apiClient.put(`/api/reports/admin/${id}/status`, {
      status,
      adminNotes,
    });
    return response.data;
  },
};

export default reportService;
