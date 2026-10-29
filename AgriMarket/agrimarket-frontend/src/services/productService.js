// src/services/productService.js

import apiClient from "./apiClient";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

/*
  File này dùng để lấy danh sách sản phẩm của farmer.
...
*/

export const getFullImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("/uploads/")) {
        const host = API_BASE_URL.endsWith("/api") 
            ? API_BASE_URL.substring(0, API_BASE_URL.length - 4) 
            : API_BASE_URL;
        return `${host}${url}`;
    }
    return url;
};

const getDefaultImage = (category, name) => {
    const cat = (category || "").toLowerCase();
    const n = (name || "").toLowerCase();
    
    if (cat.includes("trái cây") || cat.includes("fruit") || n.includes("táo") || n.includes("dâu") || n.includes("xoài")) {
        return "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=600"; // Generic mixed fruits
    }
    if (cat.includes("rau") || cat.includes("củ") || cat.includes("quả") || cat.includes("vegetable") || n.includes("cà chua") || n.includes("cà rốt") || n.includes("dưa")) {
        return "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600"; // Carrot/vegetables
    }
    if (cat.includes("lương thực") || cat.includes("gạo") || cat.includes("nếp") || n.includes("gạo")) {
        return "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600"; // Rice
    }
    if (cat.includes("chăn nuôi") || cat.includes("thịt") || n.includes("thịt") || n.includes("heo") || n.includes("bò") || n.includes("gà")) {
        return "https://images.unsplash.com/photo-1602491453977-63a5385166cf?w=600"; // Meat / Livestock
    }
    if (cat.includes("chế biến") || cat.includes("mật ong") || n.includes("mật ong")) {
        return "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600"; // Honey
    }
    if (cat.includes("trứng") || cat.includes("sữa") || n.includes("trứng") || n.includes("sữa")) {
        return "https://images.unsplash.com/photo-1516448424440-5dbf97e69009?w=600"; // Eggs
    }
    return "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600"; // General fallback (carrot)
};

export const normalizeProduct = (item) => {
    const categoryName =
        item.category_name ||
        item.categoryName ||
        item.category?.name ||
        `Danh mục #${item.category_id || item.categoryId || "N/A"}`;

    const defaultImg = getDefaultImage(categoryName, item.name);

    const primaryImageUrl =
        item.thumbnail_url ||
        item.thumbnailUrl ||
        item.image_url ||
        item.imageUrl ||
        item.img_url ||
        item.productImage ||
        "";

    const resolvedImageUrl = primaryImageUrl ? getFullImageUrl(primaryImageUrl) : defaultImg;

    const resolvedImages = (item.images && item.images.length > 0)
        ? item.images.map(getFullImageUrl)
        : [resolvedImageUrl];

    return {
        // product.id
        id: item.id,

        // product.farmer_id
        farmerId: item.farmer_id || item.farmerId,

        // product.category_id
        categoryId: item.category_id || item.categoryId,

        // product.name
        name: item.name || "Chưa có tên sản phẩm",

        // product.description
        description: item.description || "",

        // product.ai_generated_description
        aiGeneratedDescription: item.ai_generated_description || item.aiGeneratedDescription || "",

        // categories.name
        // Backend nên join categories và trả về category_name
        category: categoryName,

        // product.price
        price: Number(item.price ?? 0),

        // product.ai_suggested_price
        aiSuggestedPrice: Number(item.ai_suggested_price ?? item.aiSuggestedPrice ?? 0),

        // product.stock
        stock: Number(item.stockQuantity ?? item.stock_quantity ?? item.stock ?? 0),

        // product.unit
        unit: item.unit || "sản phẩm",

        // product.status
        // Database dùng: draft, pending, approved, rejected, hidden, sold_out
        status: item.status || "draft",

        // product.harvest_date
        harvestDate: item.harvest_date || item.harvestDate || null,

        // product.expiration_date
        expirationDate: item.expiration_date || item.expirationDate || null,

        // product.traceability_image_url
        traceabilityImageUrl: getFullImageUrl(item.traceability_image_url || item.traceabilityImageUrl || ""),

        // product.created_at
        createdAt: item.created_at || item.createdAt || null,

        // organic fields
        certificateUrl: getFullImageUrl(item.certificateUrl || item.certificate_url || ""),
        isLocal: true,
        images: resolvedImages,
        reviewsCount: (item.reviewsCount !== undefined && item.reviewsCount !== null)
            ? Number(item.reviewsCount)
            : ((item.reviews_count !== undefined && item.reviews_count !== null)
                ? Number(item.reviews_count)
                : 0),

        // rating and sales (sold)
        rating: (item.rating !== undefined && item.rating !== null)
            ? Number(item.rating)
            : 0,
        sold: (item.sold !== undefined && item.sold !== null)
            ? Number(item.sold)
            : 0,

        // product_image.img_url
        // Backend nên trả ảnh thumbnail là thumbnail_url
        imageUrl: resolvedImageUrl,
        farmerName: item.farmerName || item.farmer_name || item.farmer?.farmName || "Nông trại Green Valley",
        farmLocation: item.farmLocation || item.farm_location || item.farmer?.farmAddress || "Đà Lạt, Lâm Đồng (cách 12 km)",
        farmDescription: item.farmDescription || item.farm_description || item.farmer?.description || "Nông trại gia đình chuyên canh các loại rau củ hữu cơ chất lượng cao.",
        farmerAvatarUrl: getFullImageUrl(item.farmerAvatarUrl || item.farmer_avatar_url || item.farmer?.avatarUrl || ""),
        adminNotes: item.adminNotes || item.admin_notes || "",
        rejectionReason: item.rejectionReason || item.rejection_reason || "",
        farmerVietgapUrl: item.farmerVietgapUrl || item.farmer_vietgap_url || "",
        farmerGlobalgapUrl: item.farmerGlobalgapUrl || item.farmer_globalgap_url || "",
        farmerOrganicUrl: item.farmerOrganicUrl || item.farmer_organic_url || "",
        perishability: item.perishability || item.perishability_level || "khô",
        limitDistance: item.limitDistance !== undefined && item.limitDistance !== null 
            ? item.limitDistance 
            : (item.limit_distance !== undefined && item.limit_distance !== null ? item.limit_distance : null),
        farmerLatitude: item.farmerLatitude !== undefined && item.farmerLatitude !== null ? Number(item.farmerLatitude) : null,
        farmerLongitude: item.farmerLongitude !== undefined && item.farmerLongitude !== null ? Number(item.farmerLongitude) : null,
        isPreorder: !!(item.isPreorder || item.preorder),
    };
};

export const getFarmerProducts = async () => {
    try {
        const response = await apiClient.get("/api/farmer/products");
        const data = response.data;
        const productList = Array.isArray(data) ? data : data.data || [];
        return productList.map(normalizeProduct);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách sản phẩm:", error);
        return [];
    }
};

export const getFarmerProductsPaged = async ({ page = 0, size = 10, search = "" } = {}) => {
    try {
        const params = new URLSearchParams({ page, size });
        if (search) params.set("search", search);
        const response = await apiClient.get(`/api/farmer/products/paged?${params.toString()}`);
        const data = response.data;
        return {
            content: (data.content || []).map(normalizeProduct),
            totalElements: data.totalElements || 0,
            totalPages: data.totalPages || 1,
            currentPage: data.currentPage || 0,
            pageSize: data.pageSize || size,
        };
    } catch (error) {
        console.error("Lỗi khi lấy danh sách sản phẩm nông dân (paged):", error);
        return { content: [], totalElements: 0, totalPages: 1, currentPage: 0, pageSize: size };
    }
};

export const getAdminProductsPaged = async ({ page = 0, size = 10, status = "", search = "" } = {}) => {
    try {
        const params = new URLSearchParams({ page, size });
        if (status) params.set("status", status);
        if (search) params.set("search", search);
        const response = await apiClient.get(`/api/admin/products/paged?${params.toString()}`);
        const data = response.data;
        return {
            content: (data.content || []).map(normalizeProduct),
            totalElements: data.totalElements || 0,
            totalPages: data.totalPages || 1,
            currentPage: data.currentPage || 0,
            pageSize: data.pageSize || size,
        };
    } catch (error) {
        console.error("Lỗi khi lấy danh sách sản phẩm admin (paged):", error);
        return { content: [], totalElements: 0, totalPages: 1, currentPage: 0, pageSize: size };
    }
};

export const deleteFarmerProduct = async (productId) => {
    try {
        const response = await apiClient.delete(`/api/farmer/products/${productId}`);
        return response.data;
    } catch (error) {
        console.error("Lỗi khi xóa sản phẩm:", error);
        throw error;
    }
};

export const earlyHarvestProduct = async (productId) => {
    try {
        const response = await apiClient.post(`/api/farmer/products/${productId}/early-harvest`);
        return response.data;
    } catch (error) {
        console.error("Lỗi khi thu hoạch sớm:", error);
        throw error;
    }
};

export const createFarmerProduct = async (productData) => {
    try {
        const response = await apiClient.post("/api/farmer/products", productData);
        return response.data;
    } catch (error) {
        console.error("Lỗi khi thêm sản phẩm:", error);
        throw error;
    }
};

export const updateFarmerProduct = async (productId, productData) => {
    try {
        const response = await apiClient.put(`/api/farmer/products/${productId}`, productData);
        return response.data;
    } catch (error) {
        console.error("Lỗi khi sửa sản phẩm:", error);
        throw error;
    }
};

export const updateProductStock = async (productId, newStock) => {
    try {
        const response = await apiClient.put(`/api/farmer/products/${productId}/stock`, { newStock });
        return normalizeProduct(response.data);
    } catch (error) {
        console.error("Lỗi khi cập nhật tồn kho:", error);
        throw error;
    }
};

export const getAllApprovedProducts = async () => {
    try {
        const response = await apiClient.get("/api/products");
        const data = response.data;
        const productList = Array.isArray(data) ? data : data.data || [];
        return productList.map(normalizeProduct);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách sản phẩm công khai:", error);
        return [];
    }
};

/**
 * Lấy sản phẩm với phân trang server-side.
 * @param {Object} params - Các tham số lọc/phân trang
 * @param {number}  params.page        - Số trang (bắt đầu từ 0)
 * @param {number}  params.size        - Số sản phẩm/trang (mặc định 6)
 * @param {string}  params.sort        - popular | newest | best_selling | price_asc | price_desc
 * @param {string}  params.category    - Lọc theo danh mục
 * @param {string}  params.search      - Từ khoá tìm kiếm
 * @param {number}  params.minPrice    - Giá tối thiểu
 * @param {number}  params.maxPrice    - Giá tối đa
 * @param {string}  params.location    - Lọc theo địa điểm
 * @param {string}  params.shopKeyword - Lọc theo tên cửa hàng
 * @param {number}  params.minRating   - Rating tối thiểu
 * @param {number}  params.farmerId    - Lọc theo ID nhà vườn
 * @returns {Promise<{content: Array, totalElements: number, totalPages: number, currentPage: number, pageSize: number}>}
 */
export const getApprovedProductsPaged = async (params = {}) => {
    try {
        const {
            page = 0,
            size = 6,
            sort = "popular",
            category,
            search,
            minPrice,
            maxPrice,
            location,
            shopKeyword,
            minRating,
            farmerId,
            isPreorder,
        } = params;

        // Xây dựng query params, bỏ qua các giá trị null/undefined/empty
        const queryParams = new URLSearchParams();
        queryParams.set("page", page);
        queryParams.set("size", size);
        queryParams.set("sort", sort);
        if (category)    queryParams.set("category", category);
        if (search)      queryParams.set("search", search);
        if (minPrice != null) queryParams.set("minPrice", minPrice);
        if (maxPrice != null) queryParams.set("maxPrice", maxPrice);
        if (location)    queryParams.set("location", location);
        if (shopKeyword) queryParams.set("shopKeyword", shopKeyword);
        if (minRating != null && minRating > 0) queryParams.set("minRating", minRating);
        if (farmerId != null) queryParams.set("farmerId", farmerId);
        if (isPreorder != null) queryParams.set("isPreorder", isPreorder);

        const response = await apiClient.get(`/api/products/paged?${queryParams.toString()}`);
        const data = response.data;

        return {
            content: (data.content || []).map(normalizeProduct),
            totalElements: data.totalElements || 0,
            totalPages: data.totalPages || 1,
            currentPage: data.currentPage || 0,
            pageSize: data.pageSize || size,
        };
    } catch (error) {
        console.error("Lỗi khi lấy danh sách sản phẩm (paged):", error);
        return {
            content: [],
            totalElements: 0,
            totalPages: 1,
            currentPage: 0,
            pageSize: params.size || 6,
        };
    }
};

export const getProductById = async (productId) => {
    try {
        const response = await apiClient.get(`/api/products/${productId}`);
        return normalizeProduct(response.data);
    } catch (error) {
        console.error(`Lỗi khi lấy thông tin sản phẩm #${productId}:`, error);
        throw error;
    }
};