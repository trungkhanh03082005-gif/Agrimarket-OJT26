package org.example.agrimarket.repository;

import org.example.agrimarket.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    List<Product> findByFarmerIdOrderByCreatedAtDesc(Long farmerId);
    List<Product> findByFarmerEmailOrderByCreatedAtDesc(String email);
    org.springframework.data.domain.Page<Product> findByFarmerEmailOrderByCreatedAtDesc(String email, org.springframework.data.domain.Pageable pageable);
    org.springframework.data.domain.Page<Product> findByFarmerEmailAndNameContainingIgnoreCaseOrderByCreatedAtDesc(String email, String name, org.springframework.data.domain.Pageable pageable);
    List<Product> findByStatusOrderByCreatedAtDesc(String status);
    org.springframework.data.domain.Page<Product> findByStatusOrderByCreatedAtDesc(String status, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.status = 'approved' AND p.farmer.verificationStatus = 'verified' AND p.farmer.status = 'active' ORDER BY p.createdAt DESC")
    List<Product> findApprovedProductsFromVerifiedFarmers();

    long countByCategoryId(Long categoryId);
    long countByCategoryIdIn(List<Long> categoryIds);

    long countByFarmerEmail(String email);
    long countByFarmerEmailAndStockQuantityLessThanEqual(String email, Integer maxStock);

    @Query("SELECT p FROM Product p JOIN FETCH p.farmer WHERE p.id IN :ids")
    List<Product> findAllByIdInWithFarmer(@org.springframework.data.repository.query.Param("ids") List<Long> ids);
}

