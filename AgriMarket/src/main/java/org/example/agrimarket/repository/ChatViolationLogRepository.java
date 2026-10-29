package org.example.agrimarket.repository;

import org.example.agrimarket.model.ChatViolationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatViolationLogRepository extends JpaRepository<ChatViolationLog, Long> {
    long countByUserId(Long userId);
    long countByUserIdAndLivestreamId(Long userId, Long livestreamId);
    List<ChatViolationLog> findByUserIdOrderByCreatedAtDesc(Long userId);
}
