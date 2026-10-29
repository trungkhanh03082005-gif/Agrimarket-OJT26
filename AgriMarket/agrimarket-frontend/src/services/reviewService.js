// src/services/reviewService.js

import apiClient from "./apiClient";

const submitProductReview = async (reviewData) => {
  const response = await apiClient.post("/api/reviews/product", reviewData);
  return response.data;
};

const getReviewsByProductId = async (productId) => {
  const response = await apiClient.get(`/api/products/${productId}/reviews`);
  return response.data;
};

const getReviewDetail = async (orderCode, productId) => {
  const response = await apiClient.get(`/api/reviews/detail`, {
    params: { orderCode, productId }
  });
  return response.data;
};

const getFarmerReviews = async () => {
  const response = await apiClient.get("/api/farmer/reviews");
  return response.data;
};

const reviewService = {
  submitProductReview,
  getReviewsByProductId,
  getReviewDetail,
  getFarmerReviews,
};

export default reviewService;
