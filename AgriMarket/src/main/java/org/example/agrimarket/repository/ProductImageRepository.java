package org.example.agrimarket.repository;

import org.example.agrimarket.model.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {
    List<ProductImage> findByProductId(Long productId);
    Optional<ProductImage> findFirstByProductIdAndIsThumbnailTrue(Long productId);
    List<ProductImage> findByProductIdIn(List<Long> productIds);
}
