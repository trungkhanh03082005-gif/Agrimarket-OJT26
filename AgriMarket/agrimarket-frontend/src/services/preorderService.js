import apiClient from "./apiClient";

export const createPreorder = async (payload) => {
  const response = await apiClient.post("/api/preorders", payload);
  return response.data;
};

export const getMyPreorders = async () => {
  const response = await apiClient.get("/api/preorders/my");
  return response.data;
};

export const getFarmerPreorders = async () => {
  const response = await apiClient.get("/api/preorders/farmer");
  return response.data;
};

export const updatePreorderStatus = async (id, status) => {
  const response = await apiClient.put(`/api/preorders/${id}/status?status=${status}`);
  return response.data;
};

export const getAdminPreorders = async () => {
  const response = await apiClient.get("/api/preorders/admin");
  return response.data;
};

export const getPreorderById = async (id) => {
  const response = await apiClient.get(`/api/preorders/${id}`);
  return response.data;
};

