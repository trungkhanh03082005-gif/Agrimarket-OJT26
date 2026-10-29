package org.example.agrimarket.repository;

import org.example.agrimarket.model.LivestreamAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LivestreamAlertRepository extends JpaRepository<LivestreamAlert, Long> {
    List<LivestreamAlert> findByLivestreamIdOrderByCreatedAtDesc(Long livestreamId);
    List<LivestreamAlert> findByStatusOrderByCreatedAtDesc(String status);
}
