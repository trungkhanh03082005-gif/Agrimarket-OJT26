// src/hooks/useNotifications.js

import { useContext } from "react";
import { NotificationContext } from "../contexts/NotificationContext";

const useNotifications = () => {
    const context = useContext(NotificationContext);

    if (!context) {
        throw new Error(
            "useNotifications phải được sử dụng bên trong NotificationProvider"
        );
    }

    return context;
};

export default useNotifications;