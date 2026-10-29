package org.example.agrimarket.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "livestream")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Livestream {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_id", nullable = false)
    private Farmer farmer;

    @Column(length = 255, columnDefinition = "TEXT")
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(length = 50)
    private String status; // active, ended, upcoming

    @Column(name = "channel_name", length = 255, columnDefinition = "TEXT")
    private String channelName;

    @Column(name = "pinned_product_id")
    private Long pinnedProductId;

    @Column(name = "hearts_count")
    private Integer heartsCount = 0;

    @Column(name = "viewers_count")
    private Integer viewersCount = 0;

    @Column(name = "voucher_percent")
    private Integer voucherPercent = 0;

    @Column(name = "product_discounts_json", columnDefinition = "TEXT")
    private String productDiscountsJson = "{}";

    @Column(name = "pinned_comment_user", length = 255)
    private String pinnedCommentUser;

    @Column(name = "pinned_comment_text", columnDefinition = "TEXT")
    private String pinnedCommentText;

    @Column(name = "ban_reason", length = 255)
    private String banReason;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "livestream_product", joinColumns = @JoinColumn(name = "livestream_id"), inverseJoinColumns = @JoinColumn(name = "product_id"))
    private Set<Product> products;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "livestream_blocked_users", joinColumns = @JoinColumn(name = "livestream_id"), inverseJoinColumns = @JoinColumn(name = "user_id"))
    private Set<User> blockedUsers;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.startTime == null) {
            this.startTime = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = "active";
        }
        if (this.heartsCount == null) {
            this.heartsCount = 0;
        }
        if (this.viewersCount == null) {
            this.viewersCount = 0;
        }
    }
}
