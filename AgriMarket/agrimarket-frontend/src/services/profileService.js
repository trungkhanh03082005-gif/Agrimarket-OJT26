// src/services/profileService.js

import { PROFILE_STORAGE_KEYS, USER_ROLES } from "../constants/profileConstants";
import { normalizeProfileData } from "../utils/profileMapper";
import apiClient from "./apiClient";

const getLocalUser = () => {
  const userStr = localStorage.getItem(PROFILE_STORAGE_KEYS.USER);

  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error("Không đọc được dữ liệu user trong localStorage:", error);
    return null;
  }
};

const saveLocalUser = (user) => {
  localStorage.setItem(PROFILE_STORAGE_KEYS.USER, JSON.stringify(user));
};

const getCurrentProfile = async () => {
  try {
    const response = await apiClient.get("/api/profile/me");
    if (response.data) {
      saveLocalUser(response.data);
      return normalizeProfileData(response.data);
    }
  } catch (error) {
    console.warn("Failed to fetch fresh profile from backend, falling back to local storage:", error);
  }

  const localUser = getLocalUser();
  if (!localUser) return null;

  return normalizeProfileData(localUser);
};

const updateProfile = async (profileData, targetRole = null) => {
  const currentUser = getLocalUser();

  if (!currentUser) {
    throw new Error("Không tìm thấy người dùng hiện tại.");
  }

  const normalizedUser = normalizeProfileData(currentUser);
  const role = targetRole || normalizedUser.role;

  if (normalizedUser.role === USER_ROLES.ADMIN) {
    throw new Error("Admin không được chỉnh sửa hồ sơ.");
  }

  if (role === USER_ROLES.CUSTOMER) {
    const response = await apiClient.put(`/api/customers/${normalizedUser.id}`, profileData);
    saveLocalUser(response.data);
    return normalizeProfileData(response.data);
  }

  if (role === USER_ROLES.FARMER) {
    const response = await apiClient.put(`/api/farmers/${normalizedUser.id}`, profileData);
    saveLocalUser(response.data);
    return normalizeProfileData(response.data);
  }

  const updatedUser = {
    ...currentUser,
    ...profileData,
    role: normalizedUser.role,
  };

  saveLocalUser(updatedUser);

  return normalizeProfileData(updatedUser);
};

const logout = () => {
  localStorage.removeItem(PROFILE_STORAGE_KEYS.USER);
  localStorage.removeItem(PROFILE_STORAGE_KEYS.TOKEN);
};

const changePassword = async (passwordData) => {
  // passwordData: { currentPassword, newPassword }
  const response = await apiClient.post("/api/profile/change-password", passwordData);
  return response.data;
};

const deleteAccount = async () => {
  const response = await apiClient.delete("/api/profile/delete-account");
  localStorage.removeItem(PROFILE_STORAGE_KEYS.USER);
  localStorage.removeItem(PROFILE_STORAGE_KEYS.TOKEN);
  return response.data;
};

const getFarmerProfile = async (farmerId) => {
  try {
    const response = await apiClient.get(`/api/farmers/${farmerId}`);
    return response.data;
  } catch (error) {
    console.warn(`Không thể lấy thông tin nhà vườn từ backend cho id ${farmerId}, sẽ thử lấy từ sản phẩm:`, error);
    return null;
  }
};

const profileService = {
  getCurrentProfile,
  updateProfile,
  getFarmerProfile,
  changePassword,
  deleteAccount,
  logout,
};

export default profileService;