// src/services/orderService.js

import apiClient from "./apiClient";

const createOrder = async (orderData) => {
  const response = await apiClient.post("/api/orders", orderData);
  return response.data;
};

const getCustomerOrders = async () => {
  const response = await apiClient.get("/api/orders");
  return response.data;
};

const getOrderById = async (orderCode) => {
  const response = await apiClient.get(`/api/orders/${orderCode}`);
  return response.data;
};

const cancelOrder = async (orderCode, reason) => {
  const response = await apiClient.post(`/api/orders/${orderCode}/cancel`, { reason });
  return response.data;
};

const confirmPayment = async (orderCode, paymentMethod) => {
  const response = await apiClient.post(`/api/orders/${orderCode}/confirm-payment`, { paymentMethod });
  return response.data;
};

const getFarmerOrders = async () => {
  const response = await apiClient.get("/api/orders/farmer");
  return response.data;
};

const updateFarmerOrderStatus = async (orderCode, status, reason = "") => {
  const response = await apiClient.post(`/api/orders/farmer/${orderCode}/status`, { status, reason });
  return response.data;
};

const createVNPayPaymentUrl = async (orderCode, deliveryMode) => {
  let url = `/api/payment/create-vnpay-payment?orderCode=${orderCode}`;
  if (deliveryMode) {
    url += `&deliveryMode=${deliveryMode}`;
  }
  const response = await apiClient.get(url);
  return response.data;
};

const verifyVNPayCallback = async (queryParamsString) => {
  const response = await apiClient.get(`/api/payment/vnpay-callback?${queryParamsString}`);
  return response.data;
};

const confirmOrderReceived = async (orderCode) => {
  const response = await apiClient.post(`/api/orders/${orderCode}/received`);
  return response.data;
};

const getCustomerOrdersPaged = async ({ page = 0, size = 10, status = "" } = {}) => {
  const params = new URLSearchParams({ page, size });
  if (status) params.set("status", status);
  const response = await apiClient.get(`/api/orders/paged?${params.toString()}`);
  return response.data;
};

const getFarmerOrdersPaged = async ({ page = 0, size = 10, status = "" } = {}) => {
  const params = new URLSearchParams({ page, size });
  if (status) params.set("status", status);
  const response = await apiClient.get(`/api/orders/farmer/paged?${params.toString()}`);
  return response.data;
};

const orderService = {
  createOrder,
  getCustomerOrders,
  getCustomerOrdersPaged,
  getOrderById,
  cancelOrder,
  confirmPayment,
  getFarmerOrders,
  getFarmerOrdersPaged,
  updateFarmerOrderStatus,
  createVNPayPaymentUrl,
  verifyVNPayCallback,
  confirmOrderReceived,
};

export default orderService;
