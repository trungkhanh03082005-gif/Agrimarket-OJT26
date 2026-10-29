package org.example.agrimarket.repository;

import jakarta.persistence.criteria.*;
import org.example.agrimarket.model.Farmer;
import org.example.agrimarket.model.Product;
import org.example.agrimarket.model.ProductReview;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Các Specification dùng để lọc sản phẩm khi truy vấn phân trang server-side.
 */
public class ProductSpecification {

    /**
     * Xây dựng Specification tổng hợp từ các tham số lọc.
     *
     * @param category   Tên danh mục (null = không lọc)
     * @param search     Từ khoá tìm kiếm theo tên sản phẩm (null = không lọc)
     * @param minPrice   Giá tối thiểu (null = không lọc)
     * @param maxPrice   Giá tối đa (null = không lọc)
     * @param location   Địa điểm (lọc theo farmAddress của farmer, null = không lọc)
     * @param shopKeyword Tên cửa hàng (lọc theo farmName/fullName của farmer, null = không lọc)
     * @param minRating  Rating tối thiểu (null = không lọc)
     * @param farmerId   ID của nông dân (null = không lọc)
     */
    public static Specification<Product> buildFilter(
            String category,
            String search,
            Double minPrice,
            Double maxPrice,
            String location,
            String shopKeyword,
            Double minRating,
            Long farmerId
    ) {
        return buildFilter(category, search, minPrice, maxPrice, location, shopKeyword, minRating, farmerId, null);
    }

    public static Specification<Product> buildFilter(
            String category,
            String search,
            Double minPrice,
            Double maxPrice,
            String location,
            String shopKeyword,
            Double minRating,
            Long farmerId,
            Boolean isPreorder
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // --- Điều kiện bắt buộc: sản phẩm đã được duyệt & farmer đã xác minh ---
            predicates.add(cb.equal(root.get("status"), "approved"));

            Join<Product, Farmer> farmerJoin = root.join("farmer", JoinType.INNER);
            predicates.add(cb.equal(farmerJoin.get("verificationStatus"), "verified"));
            predicates.add(cb.equal(farmerJoin.get("status"), "active"));

            // --- Lọc theo isPreorder ---
            if (isPreorder != null) {
                predicates.add(cb.equal(root.get("isPreorder"), isPreorder));
            }

            // --- Lọc theo farmerId ---
            if (farmerId != null) {
                predicates.add(cb.equal(farmerJoin.get("id"), farmerId));
            }

            // --- Lọc theo danh mục ---
            if (category != null && !category.isBlank()) {
                predicates.add(cb.equal(root.get("category").get("name"), category));
            }

            // --- Lọc theo tên sản phẩm ---
            if (search != null && !search.isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.get("name")),
                        "%" + search.toLowerCase().trim() + "%"
                ));
            }

            // --- Lọc theo giá ---
            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), maxPrice));
            }

            // --- Lọc theo địa điểm (farmAddress) ---
            if (location != null && !location.isBlank()) {
                predicates.add(cb.like(
                        cb.lower(farmerJoin.get("farmAddress")),
                        "%" + location.toLowerCase().trim() + "%"
                ));
            }

            // --- Lọc theo tên cửa hàng (farmName hoặc fullName của farmer) ---
            if (shopKeyword != null && !shopKeyword.isBlank()) {
                String kw = "%" + shopKeyword.toLowerCase().trim() + "%";
                // Farmer extends Customer extends User, nên fullName nằm ở User
                // farmName nằm ở Farmer
                Predicate byFarmName = cb.like(cb.lower(farmerJoin.get("farmName")), kw);
                Predicate byFullName = cb.like(cb.lower(farmerJoin.get("fullName")), kw);
                predicates.add(cb.or(byFarmName, byFullName));
            }

            // --- Lọc theo rating tối thiểu (subquery) ---
            if (minRating != null && minRating > 0) {
                // Subquery: SELECT AVG(r.rating) FROM product_review r WHERE r.product_id = p.id
                Subquery<Double> ratingSubquery = query.subquery(Double.class);
                Root<ProductReview> reviewRoot = ratingSubquery.from(ProductReview.class);
                ratingSubquery.select(cb.avg(reviewRoot.get("rating")))
                        .where(cb.equal(reviewRoot.get("product"), root));

                // COALESCE(subquery, 0) >= minRating
                Expression<Double> avgRating = cb.coalesce(ratingSubquery, 0.0);
                predicates.add(cb.greaterThanOrEqualTo(avgRating, minRating));
            }

            // Tránh duplicate khi join (đặc biệt với count query)
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                query.distinct(true);
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
