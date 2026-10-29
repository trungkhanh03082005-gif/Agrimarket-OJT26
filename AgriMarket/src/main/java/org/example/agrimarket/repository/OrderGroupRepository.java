package org.example.agrimarket.repository;

import org.example.agrimarket.model.OrderGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderGroupRepository extends JpaRepository<OrderGroup, Long> {
    List<OrderGroup> findByCustomerEmailOrderByCreatedAtDesc(String email);
    Optional<OrderGroup> findByGroupCode(String groupCode);
    
    long countByCustomerIdAndAppliedPromoCode(Long customerId, String appliedPromoCode);

    @Query("SELECT og.appliedPromoCode FROM OrderGroup og WHERE og.customer.id = :customerId")
    List<String> findAppliedPromoCodesByCustomerId(@Param("customerId") Long customerId);

    // ===== Admin Transaction Queries =====

    @Query(
        value = """
            SELECT og FROM OrderGroup og
            LEFT JOIN og.customer c
            WHERE (:keyword IS NULL OR :keyword = ''
                OR LOWER(og.groupCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(c.email) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:paymentMethod IS NULL OR :paymentMethod = 'all' OR LOWER(og.paymentMethod) = LOWER(:paymentMethod))
              AND (:status IS NULL OR :status = 'all' OR LOWER(og.paymentStatus) = LOWER(:status))
              AND (:fromDate IS NULL OR og.createdAt >= :fromDate)
              AND (:toDate IS NULL OR og.createdAt <= :toDate)
            ORDER BY og.createdAt DESC
            """,
        countQuery = """
            SELECT COUNT(og) FROM OrderGroup og
            LEFT JOIN og.customer c
            WHERE (:keyword IS NULL OR :keyword = ''
                OR LOWER(og.groupCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(c.email) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:paymentMethod IS NULL OR :paymentMethod = 'all' OR LOWER(og.paymentMethod) = LOWER(:paymentMethod))
              AND (:status IS NULL OR :status = 'all' OR LOWER(og.paymentStatus) = LOWER(:status))
              AND (:fromDate IS NULL OR og.createdAt >= :fromDate)
              AND (:toDate IS NULL OR og.createdAt <= :toDate)
            """
    )
    Page<OrderGroup> findTransactionsForAdmin(
            @Param("keyword") String keyword,
            @Param("paymentMethod") String paymentMethod,
            @Param("status") String status,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            Pageable pageable
    );

    @Query("SELECT SUM(og.grandTotal) FROM OrderGroup og WHERE og.paymentStatus = 'paid'")
    Double sumTotalRevenue();

    @Query("SELECT COUNT(og) FROM OrderGroup og WHERE og.paymentStatus = 'paid'")
    Long countSuccessTransactions();

    @Query("SELECT COUNT(og) FROM OrderGroup og WHERE og.paymentStatus = 'failed'")
    Long countFailedTransactions();

    @Query("SELECT COUNT(og) FROM OrderGroup og")
    Long countAllTransactions();
}
