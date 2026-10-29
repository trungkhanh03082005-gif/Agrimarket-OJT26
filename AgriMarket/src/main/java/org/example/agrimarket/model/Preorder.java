package org.example.agrimarket.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "preorder")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Preorder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(length = 50)
    private String status; // pending, paid, cancelled, completed

    @Column(name = "applied_promo_code", length = 100)
    private String appliedPromoCode;

    @Builder.Default
    @Column(name = "discount")
    private Double discount = 0.0;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "pending";
        }
        if (this.discount == null) {
            this.discount = 0.0;
        }
    }
}
