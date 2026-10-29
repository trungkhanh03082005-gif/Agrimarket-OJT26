// src/services/adminNotificationService.js

/*
  Service này dành cho ADMIN tạo và quản lý thông báo.

  Hiện tại chưa có backend nên các hàm sẽ gọi API nhưng nếu lỗi
  thì trả dữ liệu rỗng để frontend không bị crash.

  Khi backend làm xong, bạn chỉ cần sửa các endpoint trong file này.
*/

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const getToken = () => {
    return localStorage.getItem("farmconnect_token") || localStorage.getItem("token");
};

const getAuthHeaders = () => {
    const token = getToken();

    return {
        "Content-Type": "application/json",

        /*
          TODO BACKEND:
          Nếu backend chưa dùng JWT thì có thể bỏ Authorization.
          Nếu backend dùng JWT thì giữ lại.
        */
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};

const normalizeBroadcast = (item) => {
    /*
      TODO BACKEND:
      Hàm này dùng để map dữ liệu backend về đúng format frontend.
  
      Nếu backend trả về snake_case:
      sent_at, open_rate, target_audience
  
      thì frontend vẫn dùng được.
    */
    return {
        id: item.id,
        title: item.title || "Thông báo",
        content: item.content || "",
        notificationType:
            item.notificationType || item.notification_type || "system",
        targetAudience: item.targetAudience || item.target_audience || "all",
        status: item.status || "sent",
        sentAt: item.sentAt || item.sent_at || item.createdAt || item.created_at,
        openRate: item.openRate ?? item.open_rate ?? null,
    };
};

const adminNotificationService = {
    createNotification: async (payload) => {
        /*
          payload gửi lên backend dự kiến:
    
          {
            title: "...",
            content: "...",
            notificationType: "system" | "order" | "payment" | "farmer" | "promotion",
            targetAudience: "all" | "customer" | "farmer" | "partner",
            channels: ["in_app", "email"],
            sendMode: "now" | "schedule" | "draft",
            scheduledAt: null
          }
    
          TODO BACKEND:
          Backend sẽ dựa vào targetAudience để tạo thông báo cho các tài khoản phù hợp.
    
          Ví dụ:
          - targetAudience = "all"      => gửi cho tất cả user
          - targetAudience = "customer" => gửi cho customer
          - targetAudience = "farmer"   => gửi cho farmer
          - targetAudience = "partner"  => gửi cho shipper / transport partner
    
          Nếu bảng notification hiện tại chỉ có:
          receiver_type, receiver_id, title, content, is_read, created_at
    
          thì backend cần tự insert nhiều dòng notification tương ứng với từng user nhận.
        */

        try {
            /*
              TODO BACKEND:
              Sửa endpoint này theo API thật của nhóm bạn.
      
              Gợi ý:
              POST /api/admin/notifications
            */
            const response = await fetch(`${API_BASE_URL}/api/admin/notifications`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Không thể tạo thông báo");
            }

            return {
                success: true,
                data: await response.json(),
            };
        } catch (error) {
            console.error("Lỗi tạo thông báo:", error);

            return {
                success: false,
                message:
                    "Chưa kết nối được backend. Giao diện đã sẵn sàng, cần nối API sau.",
            };
        }
    },

    getNotificationStats: async () => {
        try {
            /*
              TODO BACKEND:
              Sửa endpoint theo backend thật.
      
              Gợi ý:
              GET /api/admin/notifications/statistics
            */
            const response = await fetch(
                `${API_BASE_URL}/api/admin/notifications/statistics`,
                {
                    method: "GET",
                    headers: getAuthHeaders(),
                }
            );

            if (!response.ok) {
                throw new Error("Không thể tải thống kê thông báo");
            }

            const data = await response.json();

            return {
                totalSent: data.totalSent ?? data.total_sent ?? 0,
                scheduled: data.scheduled ?? 0,
                failed: data.failed ?? 0,
                openRate: data.openRate ?? data.open_rate ?? 0,
            };
        } catch (error) {
            console.error("Lỗi tải thống kê thông báo:", error);

            /*
              Không dùng mockdata.
              Khi chưa có backend thì hiển thị 0.
            */
            return {
                totalSent: 0,
                scheduled: 0,
                failed: 0,
                openRate: 0,
            };
        }
    },

    getRecentBroadcasts: async () => {
        try {
            /*
              TODO BACKEND:
              Sửa endpoint theo backend thật.
      
              Gợi ý:
              GET /api/admin/notifications/recent
            */
            const response = await fetch(
                `${API_BASE_URL}/api/admin/notifications/recent`,
                {
                    method: "GET",
                    headers: getAuthHeaders(),
                }
            );

            if (!response.ok) {
                throw new Error("Không thể tải danh sách thông báo gần đây");
            }

            const data = await response.json();

            const broadcasts = Array.isArray(data) ? data : data.data || [];

            return broadcasts.map(normalizeBroadcast);
        } catch (error) {
            console.error("Lỗi tải thông báo gần đây:", error);

            /*
              Không dùng mockdata.
              Khi chưa có backend thì bảng thông báo gần đây sẽ rỗng.
            */
            return [];
        }
    },

    getSimplifiedUsers: async () => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/admin/notifications/users`,
                {
                    method: "GET",
                    headers: getAuthHeaders(),
                }
            );

            if (!response.ok) {
                throw new Error("Không thể tải danh sách người dùng");
            }

            return await response.json();
        } catch (error) {
            console.error("Lỗi tải danh sách người dùng:", error);
            return [];
        }
    },
};

export default adminNotificationService;