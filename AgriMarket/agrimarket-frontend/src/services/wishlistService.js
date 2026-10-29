// src/services/wishlistService.js

import apiClient from "./apiClient";
import { getProductById, normalizeProduct } from "./productService";

const WISHLIST_KEY = "agrimarket_wishlist";
const FOLLOWED_FARMERS_KEY = "agrimarket_followed_farmers";

const getToken = () => {
  return localStorage.getItem("farmconnect_token");
};

const getLocalWishlistIds = () => {
  try {
    const list = localStorage.getItem(WISHLIST_KEY);
    return list ? JSON.parse(list) : [];
  } catch (e) {
    console.error("Lỗi khi đọc danh sách yêu thích từ localStorage:", e);
    return [];
  }
};

const saveLocalWishlistIds = (ids) => {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error("Lỗi khi ghi danh sách yêu thích vào localStorage:", e);
  }
};

const getLocalFollowedFarmers = () => {
  try {
    const list = localStorage.getItem(FOLLOWED_FARMERS_KEY);
    return list ? JSON.parse(list) : [];
  } catch (e) {
    console.error("Lỗi khi đọc danh sách theo dõi từ localStorage:", e);
    return [];
  }
};

const getWishlistIds = async () => {
  const token = getToken();
  if (token) {
    try {
      const res = await apiClient.get("/api/wishlist/products/ids");
      return res.data;
    } catch (e) {
      console.error("Lỗi getWishlistIds backend:", e);
    }
  }
  return getLocalWishlistIds();
};

const toggleWishlist = async (productId) => {
  const token = getToken();
  if (token) {
    try {
      const res = await apiClient.post(`/api/wishlist/products/toggle?productId=${productId}`);
      window.dispatchEvent(new CustomEvent("wishlistUpdated", { detail: { productId: String(productId), saved: res.data.saved } }));
      return res.data;
    } catch (e) {
      console.error("Lỗi toggleWishlist backend:", e);
    }
  }

  // Fallback local storage
  const ids = getLocalWishlistIds();
  const prodIdStr = String(productId);
  const index = ids.indexOf(prodIdStr);
  let saved = false;

  if (index > -1) {
    ids.splice(index, 1);
  } else {
    ids.push(prodIdStr);
    saved = true;
  }

  saveLocalWishlistIds(ids);
  window.dispatchEvent(new CustomEvent("wishlistUpdated", { detail: { productId: prodIdStr, saved } }));
  return { saved, message: saved ? "Đã lưu vào danh sách yêu thích." : "Đã xóa khỏi danh sách yêu thích." };
};

const isWishlistItem = async (productId) => {
  const token = getToken();
  if (token) {
    try {
      const res = await apiClient.get("/api/wishlist/products/ids");
      const ids = res.data;
      return ids.map(String).includes(String(productId));
    } catch (e) {
      console.error("Lỗi isWishlistItem backend:", e);
    }
  }
  return getLocalWishlistIds().includes(String(productId));
};

const getWishlistProducts = async () => {
  const token = getToken();
  if (token) {
    try {
      const res = await apiClient.get("/api/wishlist/products");
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      return list.map(normalizeProduct);
    } catch (e) {
      console.error("Lỗi getWishlistProducts backend:", e);
    }
  }

  const ids = getLocalWishlistIds();
  if (ids.length === 0) return [];
  
  try {
    const promises = ids.map(id => getProductById(id));
    const results = await Promise.all(promises);
    return results.filter(Boolean);
  } catch (e) {
    console.error("Lỗi khi lấy thông tin chi tiết các sản phẩm yêu thích:", e);
    return [];
  }
};

const getFollowedFarmers = async () => {
  const token = getToken();
  if (token) {
    try {
      const res = await apiClient.get("/api/wishlist/farmers");
      return res.data;
    } catch (e) {
      console.error("Lỗi getFollowedFarmers backend:", e);
    }
  }
  return getLocalFollowedFarmers();
};

const isFarmerFollowed = async (farmerId) => {
  const token = getToken();
  if (token) {
    try {
      const res = await apiClient.get("/api/wishlist/farmers/ids");
      const ids = res.data;
      return ids.map(String).includes(String(farmerId));
    } catch (e) {
      console.error("Lỗi isFarmerFollowed backend:", e);
    }
  }
  const list = getLocalFollowedFarmers();
  return list.some(f => String(f.id) === String(farmerId));
};

const toggleFollowFarmer = async (farmer) => {
  if (!farmer || !farmer.id) return { followed: false };
  const token = getToken();
  if (token) {
    try {
      const res = await apiClient.post(`/api/wishlist/farmers/toggle?farmerId=${farmer.id}`);
      return res.data;
    } catch (e) {
      console.error("Lỗi toggleFollowFarmer backend:", e);
    }
  }

  // Fallback local storage
  const list = getLocalFollowedFarmers();
  const idStr = String(farmer.id);
  const index = list.findIndex(f => String(f.id) === idStr);
  let followed = false;

  if (index > -1) {
    list.splice(index, 1);
  } else {
    list.push(farmer);
    followed = true;
  }

  try {
    localStorage.setItem(FOLLOWED_FARMERS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Lỗi khi ghi danh sách theo dõi vào localStorage:", e);
  }

  return { followed, message: followed ? "Đã theo dõi nhà vườn." : "Đã hủy theo dõi nhà vườn." };
};

const wishlistService = {
  getWishlistIds,
  toggleWishlist,
  isWishlistItem,
  getWishlistProducts,
  getFollowedFarmers,
  isFarmerFollowed,
  toggleFollowFarmer,
};

export default wishlistService;
