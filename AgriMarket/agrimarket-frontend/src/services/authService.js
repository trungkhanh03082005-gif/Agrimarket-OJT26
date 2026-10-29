//import axios from 'axios'
//
//// Nếu chưa set VITE_API_BASE_URL thì mặc định gọi localhost:8080
//const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
//
//const apiClient = axios.create({
//  baseURL: API_BASE_URL,
//  headers: {
//    'Content-Type': 'application/json',
//  },
//})
//
//// Request interceptor: tự động gắn token vào header nếu có
//apiClient.interceptors.request.use(
//    (config) => {
//      const token = localStorage.getItem('farmconnect_token')
//      if (token) {
//        config.headers.Authorization = `Bearer ${token}`
//      }
//      return config
//    },
//    (error) => Promise.reject(error)
//)
//
//export const authService = {
//  login: async (credentials) => {
//    // credentials: { email, password, role }
//    try {
//      const response = await apiClient.post('/auth/login', credentials)
//      if (response.data?.token) {
//        localStorage.setItem('farmconnect_token', response.data.token)
//        localStorage.setItem('farmconnect_user', JSON.stringify(response.data.user))
//      }
//      return response.data
//    } catch (error) {
//      throw error.response?.data || error
//    }
//  },
//
//  googleLogin: async (googleData) => {
//    // googleData: { token, role }
//    try {
//      const response = await apiClient.post('/auth/google', googleData)
//      if (response.data?.token) {
//        localStorage.setItem('farmconnect_token', response.data.token)
//        localStorage.setItem('farmconnect_user', JSON.stringify(response.data.user))
//      }
//      return response.data
//    } catch (error) {
//      throw error.response?.data || error
//    }
//  },
//
//  register: async (userData) => {
//    // userData: { fullName, email, phoneNumber, password, role }
//    try {
//      const response = await apiClient.post('/auth/register', userData)
//      return response.data
//    } catch (error) {
//      throw error.response?.data || error
//    }
//  },
//
//  logout: () => {
//    localStorage.removeItem('farmconnect_token')
//    localStorage.removeItem('farmconnect_user')
//  },
//
//  getCurrentUser: () => {
//    const userStr = localStorage.getItem('farmconnect_user')
//    return userStr ? JSON.parse(userStr) : null
//  }
//}
//
//export default authService

// Toàn sửa phần này lại


import apiClient from "./apiClient";

// Hàm này dùng để chuẩn hóa user trả về từ backend/login/register/google
const normalizeAuthUser = (user, fallbackRole) => {
  if (!user) return null;

  return {
    id: user.id || user.userId || null,

    // role rất quan trọng để ViewProfile biết là customer/farmer/admin
    role: user.role || user.userType || fallbackRole || "",

    fullName:
      user.fullName ||
      user.full_name ||
      user.name ||
      user.displayName ||
      "",

    email: user.email || "",

    phone:
      user.phone ||
      user.phoneNumber ||
      user.phone_number ||
      "",

    avatarUrl:
      user.avatarUrl ||
      user.avatar_url ||
      user.picture ||
      user.photoURL ||
      "",

    status: user.status || "active",

    passwordSet: user.passwordSet !== undefined ? user.passwordSet : (user.password_set !== undefined ? user.password_set : true),

    createdAt:
      user.createdAt ||
      user.created_at ||
      "",

    // Farmer fields
    farmName:
      user.farmName ||
      user.farm_name ||
      "",

    farmAddress:
      user.farmAddress ||
      user.farm_address ||
      "",

    description: user.description || "",

    identityCard:
      user.identityCard ||
      user.identity_card ||
      "",

    businessRegistrationUrl:
      user.businessRegistrationUrl ||
      user.business_registration_url ||
      "",

    vietgapUrl:
      user.vietgapUrl ||
      user.vietgap_url ||
      "",

    globalgapUrl:
      user.globalgapUrl ||
      user.globalgap_url ||
      "",

    organicUrl:
      user.organicUrl ||
      user.organic_url ||
      "",

    verificationStatus:
      user.verificationStatus ||
      user.verification_status ||
      "",

    ratingAverage:
      user.ratingAverage ||
      user.rating_average ||
      0,

    totalProducts:
      user.totalProducts ||
      user.total_products ||
      0,

    // Customer address
    addresses:
      user.addresses ||
      user.customerAddresses ||
      user.customer_address ||
      [],
  };
};

export const authService = {
  login: async (credentials) => {
    // credentials: { email, password, role }
    try {
      const response = await apiClient.post("/auth/login", credentials);

      if (response.data?.token) {
        localStorage.setItem("farmconnect_token", response.data.token);
      }

      if (response.data?.user) {
        const normalizedUser = normalizeAuthUser(
          response.data.user,
          credentials.role
        );

        localStorage.setItem(
          "farmconnect_user",
          JSON.stringify(normalizedUser)
        );
      }

      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  googleLogin: async (googleData) => {
    // googleData: { token, role }
    try {
      const response = await apiClient.post('/auth/google', googleData)
      if (response.data?.token) {
        localStorage.setItem('farmconnect_token', response.data.token)
      }
      if (response.data?.user) {
        const normalizedUser = normalizeAuthUser(
          response.data.user,
          response.data.user.role || googleData.role
        );
        localStorage.setItem('farmconnect_user', JSON.stringify(normalizedUser))
      }
      return response.data
    } catch (error) {
      throw error.response?.data || error
    }
  },

  register: async (userData) => {
    // userData: { fullName, email, phoneNumber, password, role }
    try {
      const response = await apiClient.post("/auth/register", userData);

      /*
        TODO BACKEND:
        Nếu backend register trả về token + user thì có thể lưu như login.
        Nếu backend chỉ đăng ký tài khoản và yêu cầu login lại,
        thì không cần lưu localStorage ở đây.
      */

      if (response.data?.token) {
        localStorage.setItem("farmconnect_token", response.data.token);
      }

      if (response.data?.user) {
        const normalizedUser = normalizeAuthUser(
          response.data.user,
          userData.role
        );

        localStorage.setItem(
          "farmconnect_user",
          JSON.stringify(normalizedUser)
        );
      }

      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  logout: () => {
    localStorage.removeItem("farmconnect_token");
    localStorage.removeItem("farmconnect_user");
  },

  getCurrentUser: () => {
    try {
      const userStr = localStorage.getItem("farmconnect_user");
      if (!userStr || userStr === "undefined" || userStr === "null") return null;
      return JSON.parse(userStr);
    } catch (e) {
      console.error("Lỗi parse farmconnect_user từ localStorage:", e);
      return null;
    }
  },

  getToken: () => {
    return localStorage.getItem("farmconnect_token");
  },

  sendRegisterOTP: async (registerData) => {
    // registerData: { email, role, phoneNumber }
    try {
      const response = await apiClient.post("/auth/register/send-otp", registerData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  sendForgotPasswordOTP: async (email) => {
    try {
      const response = await apiClient.post("/auth/forgot-password/send-otp", { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  resetPassword: async (resetData) => {
    // resetData: { email, otpCode, newPassword }
    try {
      const response = await apiClient.post("/auth/forgot-password/reset", resetData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  registerAsFarmer: async (farmData) => {
    // farmData: { farmName, farmAddress, description }
    try {
      const response = await apiClient.post("/api/farmers/register", farmData);
      if (response.data?.token) {
        localStorage.setItem("farmconnect_token", response.data.token);
      }
      if (response.data?.user) {
        const normalizedUser = normalizeAuthUser(
          response.data.user,
          "farmer"
        );
        localStorage.setItem("farmconnect_user", JSON.stringify(normalizedUser));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /*
    TODO GOOGLE LOGIN:
    Sau này khi có Google login backend, backend cần trả về:
    {
      token: "...",
      user: {
        id,
        role,
        fullName,
        email,
        avatarUrl,
        phone,
        status
      }
    }

    Sau đó cũng lưu:
    localStorage.setItem("farmconnect_token", response.data.token);
    localStorage.setItem("farmconnect_user", JSON.stringify(normalizedUser));
  */
};

export default authService;
