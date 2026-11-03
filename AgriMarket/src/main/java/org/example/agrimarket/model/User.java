package org.example.agrimarket.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Inheritance(strategy = InheritanceType.JOINED)
@DiscriminatorColumn(name = "user_type", discriminatorType = DiscriminatorType.STRING)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "full_name", length = 255, nullable = false, columnDefinition = "TEXT")
    private String fullName;

    @Column(name = "phone")
    private String phone;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "status")
    private String status; // active, banned, pending

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // =========================================================================
    // QUẢN LÝ CẤM BÌNH LUẬN (CHAT MODERATION)
    // =========================================================================
    @Column(name = "is_chat_banned")
    private Boolean isChatBanned = false; // Đánh dấu tài khoản có đang bị cấm chat hay không

    @Column(name = "chat_banned_until")
    private LocalDateTime chatBannedUntil; // Thời điểm hết hạn cấm chat (tự động mở khóa khi quá thời gian này)

    @Column(name = "chat_violation_count")
    private Integer chatViolationCount = 0; // Đếm số lần vi phạm để phạt tăng dần (30p -> 2h -> 24h -> 3 ngày -> 7 ngày)

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "pending";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
