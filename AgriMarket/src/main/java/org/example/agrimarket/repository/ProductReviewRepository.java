package org.example.agrimarket.repository;

import org.example.agrimarket.model.ProductReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {
    List<ProductReview> findByProductIdOrderByCreatedAtDesc(Long productId);

    Optional<ProductReview> findByOrderIdAndProductIdAndCustomerId(Long orderId, Long productId, Long customerId);

    @Query("SELECT AVG(pr.rating) FROM ProductReview pr WHERE pr.product.id = :productId")
    Double getAverageRatingByProductId(@Param("productId") Long productId);

    @Query("SELECT pr.product.id, AVG(pr.rating), COUNT(pr.id) FROM ProductReview pr WHERE pr.product.id IN :productIds GROUP BY pr.product.id")
    List<Object[]> getAverageRatingAndCountByProductIds(@Param("productIds") List<Long> productIds);

    @Query("SELECT pr.order.id, pr.product.id FROM ProductReview pr WHERE pr.order.id IN :orderIds")
    List<Object[]> findReviewedProductsForOrders(@Param("orderIds") List<Long> orderIds);

    @Query("SELECT AVG(pr.rating) FROM ProductReview pr WHERE pr.product.farmer.id = :farmerId")
    Double getAverageRatingByFarmerId(@Param("farmerId") Long farmerId);

    List<ProductReview> findByProductFarmerIdOrderByCreatedAtDesc(Long farmerId);

    Long countByProductId(Long productId);
}
