import apiClient from "./apiClient";

const chatService = {
  getConversations: async (role) => {
    const response = await apiClient.get("/api/chat/conversations", {
      params: { role }
    });
    return response.data;
  },

  startConversation: async (partnerId) => {
    const response = await apiClient.post("/api/chat/conversations/start", null, {
      params: { partnerId }
    });
    return response.data;
  },

  getMessages: async (conversationId) => {
    const response = await apiClient.get(`/api/chat/conversations/${conversationId}/messages`);
    return response.data;
  },

  sendMessage: async (conversationId, messageData) => {
    const response = await apiClient.post(`/api/chat/conversations/${conversationId}/messages`, messageData);
    return response.data;
  },

  suggestFarmers: async (query) => {
    const response = await apiClient.get("/api/chat/suggest-farmers", {
      params: { query }
    });
    return response.data;
  },

  toggleBlock: async (conversationId) => {
    const response = await apiClient.post(`/api/chat/conversations/${conversationId}/toggle-block`);
    return response.data;
  },

  deleteConversation: async (conversationId) => {
    const response = await apiClient.delete(`/api/chat/conversations/${conversationId}`);
    return response.data;
  }
};

export default chatService;
