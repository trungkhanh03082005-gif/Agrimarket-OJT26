package org.example.agrimarket.repository;

import org.example.agrimarket.model.Order;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    @EntityGraph(attributePaths = {"items", "customer", "farmer", "orderGroup"})
    List<Order> findByCustomerEmailOrderByCreatedAtDesc(String email);

    @EntityGraph(attributePaths = {"items", "customer", "farmer", "orderGroup"})
    org.springframework.data.domain.Page<Order> findByCustomerEmailOrderByCreatedAtDesc(String email, org.springframework.data.domain.Pageable pageable);

    @EntityGraph(attributePaths = {"items", "customer", "farmer", "orderGroup"})
    org.springframework.data.domain.Page<Order> findByCustomerEmailAndStatusOrderByCreatedAtDesc(String email, String status, org.springframework.data.domain.Pageable pageable);

    @EntityGraph(attributePaths = {"items", "customer", "farmer", "orderGroup"})
    Optional<Order> findByOrderCode(String orderCode);

    @EntityGraph(attributePaths = {"items", "customer", "farmer", "orderGroup"})
    @Query("SELECT o FROM Order o WHERE o.farmer.email = :farmerEmail ORDER BY o.createdAt DESC")
    List<Order> findByFarmerEmail(@Param("farmerEmail") String farmerEmail);

    @EntityGraph(attributePaths = {"items", "customer", "farmer", "orderGroup"})
    @Query("SELECT o FROM Order o WHERE o.farmer.email = :farmerEmail AND LOWER(o.status) != LOWER(:excludeStatus) ORDER BY o.createdAt DESC")
    org.springframework.data.domain.Page<Order> findByFarmerEmailAndStatusNotPaged(@Param("farmerEmail") String farmerEmail, @Param("excludeStatus") String excludeStatus, org.springframework.data.domain.Pageable pageable);

    @EntityGraph(attributePaths = {"items", "customer", "farmer", "orderGroup"})
    @Query("SELECT o FROM Order o WHERE o.farmer.email = :farmerEmail AND LOWER(o.status) = LOWER(:status) AND LOWER(o.status) != LOWER(:excludeStatus) ORDER BY o.createdAt DESC")
    org.springframework.data.domain.Page<Order> findByFarmerEmailAndStatusPaged(@Param("farmerEmail") String farmerEmail, @Param("status") String status, @Param("excludeStatus") String excludeStatus, org.springframework.data.domain.Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"items", "customer", "farmer", "orderGroup"})
    List<Order> findAll();

    @EntityGraph(attributePaths = {"items", "customer", "farmer", "orderGroup"})
    List<Order> findByStatusIgnoreCase(String status);

    long countByCustomerIdAndStatus(Long customerId, String status);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.farmer.email = :farmerEmail AND LOWER(o.status) IN :statuses")
    long countByFarmerEmailAndStatusIn(@Param("farmerEmail") String farmerEmail, @Param("statuses") List<String> statuses);

    @Query("SELECT COALESCE(SUM(o.amount), 0) FROM Order o WHERE o.farmer.email = :farmerEmail AND LOWER(o.status) = LOWER(:status)")
    Double sumAmountByFarmerEmailAndStatus(@Param("farmerEmail") String farmerEmail, @Param("status") String status);

    /**
     * Tìm các đơn hàng ở trạng thái 'awaiting_payment' được tạo trước thời điểm cutoff.
     * Dùng để dọn dẹp các đơn VNPay bị bỏ rơi (customer không hoàn thành thanh toán).
     */
    @EntityGraph(attributePaths = {"items", "customer", "farmer", "orderGroup"})
    @Query("SELECT o FROM Order o WHERE LOWER(o.status) = 'awaiting_payment' AND o.createdAt < :cutoff")
    List<Order> findAbandonedAwaitingPaymentOrders(@Param("cutoff") LocalDateTime cutoff);

    @EntityGraph(attributePaths = {"items", "customer", "farmer", "orderGroup"})
    @Query("SELECT o FROM Order o WHERE " +
           "(:status IS NULL OR :status = '' OR LOWER(o.status) = LOWER(:status)) AND " +
           "(:paymentStatus IS NULL OR :paymentStatus = '' OR LOWER(o.paymentStatus) = LOWER(:paymentStatus)) AND " +
           "(:search IS NULL OR :search = '' OR LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(o.customer.fullName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(o.farmer.farmName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(o.orderGroup.recipientName) LIKE LOWER(CONCAT('%', :search, '%')))" +
           " ORDER BY o.createdAt DESC")
    org.springframework.data.domain.Page<Order> findAllPagedAdmin(
            @Param("status") String status,
            @Param("paymentStatus") String paymentStatus,
            @Param("search") String search,
            org.springframework.data.domain.Pageable pageable
    );
}
