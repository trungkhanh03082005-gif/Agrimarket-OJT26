// src/services/cartService.js

import apiClient from "./apiClient";

const getCart = async () => {
  const response = await apiClient.get("/api/cart");
  return response.data;
};

const addToCart = async (productId, quantity, livestreamPrice = null, livestreamId = null) => {
  const response = await apiClient.post("/api/cart/add", {
    productId,
    quantity,
    ...(livestreamPrice !== null && { livestreamPrice }),
    ...(livestreamId !== null && { livestreamId }),
  });
  return response.data;
};

const updateCartItem = async (productId, quantity, checked) => {
  const response = await apiClient.put("/api/cart/update", { productId, quantity, checked });
  return response.data;
};

const removeFromCart = async (productId) => {
  const response = await apiClient.delete(`/api/cart/remove/${productId}`);
  return response.data;
};

const clearCart = async () => {
  const response = await apiClient.delete("/api/cart/clear");
  return response.data;
};

const syncCart = async (guestItems) => {
  // guestItems: array of { productId, quantity }
  const response = await apiClient.post("/api/cart/sync", guestItems);
  return response.data;
};

const bulkCheck = async (productIds, checked) => {
  await apiClient.put("/api/cart/bulk-check", { productIds, checked });
};

const cartService = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncCart,
  bulkCheck,
};

export default cartService;
