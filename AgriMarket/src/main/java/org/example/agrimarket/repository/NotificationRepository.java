package org.example.agrimarket.repository;

import org.example.agrimarket.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByReceiverTypeAndReceiverIdOrderByCreatedAtDesc(String receiverType, Long receiverId);
    long countByReceiverTypeAndReceiverIdAndIsReadFalse(String receiverType, Long receiverId);
    long countByBroadcastId(Long broadcastId);
    long countByBroadcastIdAndIsReadTrue(Long broadcastId);
}
