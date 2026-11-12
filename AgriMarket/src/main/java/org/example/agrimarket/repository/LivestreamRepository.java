package org.example.agrimarket.repository;

import org.example.agrimarket.model.Livestream;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface LivestreamRepository extends JpaRepository<Livestream, Long> {
    List<Livestream> findByStatusOrderByCreatedAtDesc(String status);
    List<Livestream> findByStatusInOrderByCreatedAtDesc(List<String> statuses);
    Optional<Livestream> findTopByFarmerIdAndStatusOrderByCreatedAtDesc(Long farmerId, String status);

    @Modifying
    @Transactional
    @Query("UPDATE Livestream l SET l.pinnedProductId = null WHERE l.pinnedProductId = :productId")
    void clearPinnedProduct(@Param("productId") Long productId);
}
