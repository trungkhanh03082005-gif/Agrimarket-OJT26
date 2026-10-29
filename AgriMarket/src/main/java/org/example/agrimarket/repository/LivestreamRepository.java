package org.example.agrimarket.repository;

import org.example.agrimarket.model.Livestream;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LivestreamRepository extends JpaRepository<Livestream, Long> {
    List<Livestream> findByStatusOrderByCreatedAtDesc(String status);
    List<Livestream> findByStatusInOrderByCreatedAtDesc(List<String> statuses);
    Optional<Livestream> findTopByFarmerIdAndStatusOrderByCreatedAtDesc(Long farmerId, String status);
}
