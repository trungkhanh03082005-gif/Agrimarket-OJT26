package org.example.agrimarket.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_notification")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminNotification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 255, columnDefinition = "TEXT")
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "notification_type")
    private String notificationType; // "system", "order", "payment", "farmer", "promotion"

    @Column(name = "target_audience")
    private String targetAudience; // "all", "customer", "farmer", "partner"

    @Column(name = "status")
    private String status; // "sent", "scheduled", "draft", "failed"

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(name = "channels")
    private String channels; // e.g. "in_app,email"

    @Column(name = "target_user_id")
    private Long targetUserId;

    @Column(name = "target_user_type")
    private String targetUserType; // "customer", "farmer", "partner"

    @Column(name = "target_users", columnDefinition = "TEXT")
    private String targetUsers; // e.g. "farmer:13,customer:15,partner:2"

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = "draft";
        }
    }
}
