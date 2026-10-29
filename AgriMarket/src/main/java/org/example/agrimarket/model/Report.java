package org.example.agrimarket.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "report")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    /**
     * Loại đối tượng bị báo cáo: "product", "farmer", "customer"
     */
    @Column(name = "target_type", length = 50, nullable = false)
    private String targetType;

    /**
     * ID của đối tượng bị báo cáo (product_id, farmer_id hoặc user_id tuỳ target_type)
     */
    @Column(name = "target_id", nullable = false)
    private Long targetId;

    /**
     * Lý do báo cáo
     */
    @Column(name = "reason", length = 500, columnDefinition = "TEXT")
    private String reason;

    /**
     * Mô tả chi tiết vi phạm
     */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * Trạng thái: pending, reviewing, resolved, rejected
     */
    @Column(name = "status", length = 50)
    private String status;

    /**
     * Ghi chú của admin khi xử lý
     */
    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

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
