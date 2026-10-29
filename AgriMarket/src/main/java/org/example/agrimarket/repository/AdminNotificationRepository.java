package org.example.agrimarket.repository;

import org.example.agrimarket.model.AdminNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AdminNotificationRepository extends JpaRepository<AdminNotification, Long> {
    List<AdminNotification> findAllByOrderByIdDesc();
    List<AdminNotification> findByStatusAndScheduledAtLessThanEqual(String status, LocalDateTime time);
}
