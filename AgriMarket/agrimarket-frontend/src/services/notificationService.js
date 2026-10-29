// src/services/notificationService.js

import apiClient from "./apiClient";

/*
  Service này dùng cho phía NGƯỜI DÙNG:
  - Lấy danh sách thông báo của tài khoản đang đăng nhập
  - Đánh dấu 1 thông báo đã đọc
  - Đánh dấu tất cả đã đọc
  - Xóa thông báo

  Không dùng mockdata.
  Khi có backend thật, chỉ cần kiểm tra lại các endpoint bên dưới.
*/

const normalizeNotification = (item) => {
  /*
    TODO BACKEND:
    Hàm này dùng để frontend đọc được nhiều kiểu dữ liệu backend trả về.

    Nếu backend trả về camelCase:
    createdAt, isRead, receiverType

    hoặc snake_case:
    created_at, is_read, receiver_type

    thì frontend vẫn dùng được.
  */

  return {
    id: item.id || item.notificationId,
    title: item.title || "Thông báo",
    content: item.content || item.message || "",

    notificationType:
      item.notificationType ||
      item.notification_type ||
      item.type ||
      "system",

    receiverType:
      item.receiverType ||
      item.receiver_type ||
      item.targetAudience ||
      "",

    receiverId:
      item.receiverId ||
      item.receiver_id ||
      item.userId ||
      null,

    isRead: item.isRead ?? item.is_read ?? item.read ?? false,

    createdAt:
      item.createdAt ||
      item.created_at ||
      item.sentAt ||
      item.sent_at ||
      "",

    link: item.link || item.actionUrl || item.action_url || null,
  };
};

const getNotificationArray = (data) => {
  /*
    TODO BACKEND:
    Nếu backend trả về:
    [
      {...},
      {...}
    ]

    hoặc:
    {
      data: [...]
    }

    hoặc:
    {
      notifications: [...]
    }

    thì hàm này đều lấy ra được mảng thông báo.
  */

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.notifications)) {
    return data.notifications;
  }

  if (Array.isArray(data?.content)) {
    return data.content;
  }

  return [];
};

const sortByNewest = (notifications) => {
  return [...notifications].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
};

const notificationService = {
  getNotifications: async () => {
    try {
      const token = localStorage.getItem("farmconnect_token");
      if (!token) return [];

      /*
        TODO BACKEND:
        Nếu backend của nhóm bạn dùng endpoint khác thì sửa ở đây.

        Gợi ý:
        GET /api/notifications
        hoặc
        GET /api/notifications/me
        hoặc
        GET /api/users/me/notifications
      */

      const response = await apiClient.get("/api/notifications");

      const notifications = getNotificationArray(response.data)
        .map(normalizeNotification);

      return sortByNewest(notifications);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách thông báo:", error);

      /*
        Không dùng mockdata.
        Nếu backend chưa làm xong thì trả về [] để giao diện không bị lỗi.
      */
      return [];
    }
  },

  /*
    Hàm này để tương thích với code mình đã gửi trước đó.
    Nếu NotificationContext đang gọi getMyNotifications()
    thì vẫn chạy được.
  */
  getMyNotifications: async () => {
    return notificationService.getNotifications();
  },

  markAsRead: async (id) => {
    try {
      /*
        TODO BACKEND:
        Nếu backend dùng PATCH thì đổi put thành patch.

        Ví dụ:
        apiClient.patch(`/api/notifications/${id}/read`)
      */

      const response = await apiClient.put(`/api/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      console.error(`Lỗi khi đánh dấu đã đọc thông báo ${id}:`, error);
      throw error;
    }
  },

  markAllAsRead: async () => {
    try {
      /*
        TODO BACKEND:
        Nếu backend dùng endpoint khác thì sửa ở đây.

        Ví dụ:
        PUT /api/notifications/read-all
        hoặc
        PATCH /api/notifications/read-all
      */

      const response = await apiClient.put("/api/notifications/read-all");
      return response.data;
    } catch (error) {
      console.error("Lỗi khi đánh dấu đọc tất cả thông báo:", error);
      throw error;
    }
  },

  deleteNotification: async (id) => {
    try {
      /*
        TODO BACKEND:
        Endpoint này dùng khi người dùng muốn xóa 1 thông báo khỏi danh sách.
      */

      const response = await apiClient.delete(`/api/notifications/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Lỗi khi xóa thông báo ${id}:`, error);
      throw error;
    }
  },
};

export default notificationService;