package org.example.agrimarket.repository;

import org.example.agrimarket.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    @Query("SELECT COALESCE(SUM(oi.quantity), 0) FROM OrderItem oi WHERE oi.productId = :productId AND oi.order.status NOT IN ('cancelled', 'rejected')")
    Integer sumQuantityByProductIdAndOrderStatus(@Param("productId") Long productId);

    @Query("SELECT oi.productId, COALESCE(SUM(oi.quantity), 0) FROM OrderItem oi WHERE oi.productId IN :productIds AND oi.order.status NOT IN ('cancelled', 'rejected') GROUP BY oi.productId")
    List<Object[]> sumQuantityByProductIds(@Param("productIds") List<Long> productIds);
}

