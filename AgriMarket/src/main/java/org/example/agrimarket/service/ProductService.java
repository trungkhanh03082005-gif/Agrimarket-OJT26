package org.example.agrimarket.service;

import org.example.agrimarket.dto.PagedProductResponse;
import org.example.agrimarket.dto.ProductRequest;
import org.example.agrimarket.dto.ProductResponse;
import org.example.agrimarket.model.Category;

import java.util.List;

public interface ProductService {
    List<ProductResponse> getProductsByFarmerEmail(String email);
    org.example.agrimarket.dto.PageResponse<ProductResponse> getFarmerProductsPaged(String email, int page, int size, String search);
    List<Category> getAllCategories();
    void deleteProduct(Long id, String farmerEmail);
    ProductResponse createProduct(ProductRequest request, String farmerEmail) throws Exception;
    ProductResponse updateProduct(Long id, ProductRequest request, String farmerEmail) throws Exception;
    ProductResponse updateProductStock(Long id, Integer newStock, String farmerEmail) throws Exception;
    List<ProductResponse> getAllApprovedProducts();
    List<ProductResponse> getAllProducts();
    org.example.agrimarket.dto.PageResponse<ProductResponse> getAllProductsPaged(int page, int size, String status, String category, String search);
    ProductResponse getProductById(Long id);

    /**
     * Lấy danh sách sản phẩm đã duyệt với phân trang server-side.
     *
     * @param page       Số trang (bắt đầu từ 0)
     * @param size       Số sản phẩm mỗi trang
     * @param sort       Kiểu sắp xếp: "newest", "price_asc", "price_desc", "best_selling", "popular"
     * @param category   Lọc theo danh mục (null = tất cả)
     * @param search     Tìm kiếm theo tên sản phẩm (null = không lọc)
     * @param minPrice   Giá tối thiểu (null = không lọc)
     * @param maxPrice   Giá tối đa (null = không lọc)
     * @param location   Lọc theo địa điểm (null = không lọc)
     * @param shopKeyword Lọc theo tên cửa hàng (null = không lọc)
     * @param minRating  Rating tối thiểu (null = không lọc)
     * @param farmerId   ID của nông dân (null = không lọc)
     */
    PagedProductResponse getApprovedProductsPaged(
            int page, int size, String sort,
            String category, String search,
            Double minPrice, Double maxPrice,
            String location, String shopKeyword,
            Double minRating, Long farmerId,
            Boolean isPreorder
    );
    void earlyHarvest(Long productId, String farmerEmail);
}

