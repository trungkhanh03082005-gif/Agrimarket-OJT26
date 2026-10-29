// src/contexts/NotificationContext.jsx

import { createContext, useEffect, useMemo, useState } from "react";
import notificationService from "../services/notificationService";

export const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    const loadNotifications = async () => {
        setLoadingNotifications(true);

        const data = await notificationService.getNotifications();

        setNotifications(data);
        setLoadingNotifications(false);
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const unreadCount = useMemo(() => {
        return notifications.filter((item) => !item.isRead).length;
    }, [notifications]);

    const markAsRead = async (notificationId) => {
        setNotifications((prev) =>
            prev.map((item) =>
                item.id === notificationId ? { ...item, isRead: true } : item
            )
        );

        try {
            await notificationService.markAsRead(notificationId);
        } catch (error) {
            /*
              TODO BACKEND:
              Nếu backend lỗi thì tải lại danh sách để đồng bộ dữ liệu.
            */
            loadNotifications();
        }
    };

    const markAllAsRead = async () => {
        setNotifications((prev) =>
            prev.map((item) => ({
                ...item,
                isRead: true,
            }))
        );

        try {
            await notificationService.markAllAsRead();
        } catch (error) {
            loadNotifications();
        }
    };

    const value = {
        notifications,
        unreadCount,
        loadingNotifications,
        loadNotifications,
        markAsRead,
        markAllAsRead,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};