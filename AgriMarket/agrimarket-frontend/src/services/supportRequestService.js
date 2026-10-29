// src/services/supportRequestService.js

import apiClient from "./apiClient";

const supportRequestService = {
  createRequest: async (data) => {
    const response = await apiClient.post("/api/support-requests", data);
    return response.data;
  },

  getMyRequests: async (status) => {
    const response = await apiClient.get("/api/support-requests", {
      params: { status }
    });
    return response.data;
  },

  getRequestDetails: async (id) => {
    const response = await apiClient.get(`/api/support-requests/${id}`);
    return response.data;
  },

  // Admin methods
  getAdminRequests: async (status) => {
    const response = await apiClient.get("/api/support-requests/admin", {
      params: { status }
    });
    return response.data;
  },

  getAdminRequestsPaged: async (params) => {
    const response = await apiClient.get("/api/support-requests/admin/paged", {
      params
    });
    return response.data;
  },

  updateRequestStatus: async (id, status, adminNotes) => {
    const response = await apiClient.put(`/api/support-requests/admin/${id}/status`, {
      status,
      adminNotes
    });
    return response.data;
  },

  getMessages: async (requestId) => {
    const response = await apiClient.get(`/api/support-requests/${requestId}/messages`);
    return response.data;
  },

  sendMessage: async (requestId, content) => {
    const response = await apiClient.post(`/api/support-requests/${requestId}/messages`, {
      content
    });
    return response.data;
  }
};

export default supportRequestService;
