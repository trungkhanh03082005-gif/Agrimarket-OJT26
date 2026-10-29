package org.example.agrimarket.repository;

import org.example.agrimarket.model.Preorder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PreorderRepository extends JpaRepository<Preorder, Long> {
    List<Preorder> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    @Query("SELECT DISTINCT pi.preorder FROM PreorderItem pi WHERE pi.product.farmer.id = :farmerId ORDER BY pi.preorder.createdAt DESC")
    List<Preorder> findPreordersByFarmerId(@Param("farmerId") Long farmerId);

    long countByCustomerIdAndAppliedPromoCode(Long customerId, String appliedPromoCode);

    @Query("SELECT p.appliedPromoCode FROM Preorder p WHERE p.customer.id = :customerId")
    List<String> findAppliedPromoCodesByCustomerId(@Param("customerId") Long customerId);
}
