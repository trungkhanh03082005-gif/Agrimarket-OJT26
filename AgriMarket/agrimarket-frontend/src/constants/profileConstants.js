// src/constants/profileConstants.js

export const PROFILE_STORAGE_KEYS = {
  USER: "farmconnect_user",
  TOKEN: "farmconnect_token",
};

export const USER_ROLES = {
  CUSTOMER: "customer",
  FARMER: "farmer",
  ADMIN: "admin",
};

export const ROLE_LABELS = {
  customer: "Khách hàng",
  farmer: "Nông dân",
  admin: "Quản trị viên",
};

export const STATUS_LABELS = {
  active: "Đang hoạt động",
  pending: "Đang chờ duyệt",
  banned: "Bị khóa",
};

export const FARMER_VERIFICATION_LABELS = {
  verified: "Đã xác minh",
  pending: "Chờ xác minh",
  rejected: "Bị từ chối",
};