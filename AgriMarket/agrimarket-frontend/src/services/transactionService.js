import apiClient from "./apiClient";

/**
 * transactionService.js
 * Kết nối API Admin Transaction với backend.
 *
 * Backend endpoints:
 *  GET  /api/admin/transactions             - Danh sách có phân trang + bộ lọc
 *  GET  /api/admin/transactions/:groupCode  - Chi tiết giao dịch
 *  GET  /api/admin/transactions/export      - Xuất CSV
 */

/**
 * Lấy danh sách giao dịch.
 * @param {Object} params
 * @param {string} params.keyword
 * @param {string} params.paymentMethod - "all" | "VNPay" | "COD" | ...
 * @param {string} params.status        - "all" | "paid" | "pending" | "failed"
 * @param {string} params.fromDate      - "YYYY-MM-DD"
 * @param {string} params.toDate        - "YYYY-MM-DD"
 * @param {number} params.page          - 0-indexed
 * @param {number} params.size
 * @returns {Promise<TransactionPageResponse>}
 */
export const getAdminTransactions = async ({
  keyword = "",
  paymentMethod = "all",
  status = "all",
  fromDate = "",
  toDate = "",
  page = 0,
  size = 10,
} = {}) => {
  const params = {
    keyword,
    paymentMethod,
    status,
    page,
    size,
  };

  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;

  const response = await apiClient.get("/api/admin/transactions", { params });
  return response.data;
};

/**
 * Lấy chi tiết một giao dịch theo groupCode.
 * @param {string} groupCode
 */
export const getTransactionDetail = async (groupCode) => {
  const response = await apiClient.get(`/api/admin/transactions/${groupCode}`);
  return response.data;
};

/**
 * Tải file CSV giao dịch.
 * Sử dụng window.open hoặc tạo link anchor để download.
 */
export const exportTransactionsCsv = async ({
  keyword = "",
  paymentMethod = "all",
  status = "all",
  fromDate = "",
  toDate = "",
} = {}) => {
  const token = localStorage.getItem("farmconnect_token");

  const queryParams = new URLSearchParams({ keyword, paymentMethod, status });
  if (fromDate) queryParams.set("fromDate", fromDate);
  if (toDate) queryParams.set("toDate", toDate);

  const url = `http://localhost:8080/api/admin/transactions/export?${queryParams.toString()}`;

  // Fetch blob để đính kèm Authorization header
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Không thể xuất CSV. Vui lòng thử lại.");
  }

  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
};
