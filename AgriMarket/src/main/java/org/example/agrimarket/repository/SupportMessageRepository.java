package org.example.agrimarket.repository;

import org.example.agrimarket.model.SupportMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SupportMessageRepository extends JpaRepository<SupportMessage, Long> {
    List<SupportMessage> findBySupportRequestIdOrderByCreatedAtAsc(Long supportRequestId);
}
