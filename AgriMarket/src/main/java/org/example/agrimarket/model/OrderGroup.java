package org.example.agrimarket.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "order_group")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OrderGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_code", unique = true, nullable = false)
    private String groupCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "total_subtotal", nullable = false)
    private Double totalSubtotal;

    @Column(name = "total_shipping_fee", nullable = false)
    private Double totalShippingFee;

    @Column(name = "total_service_fee", nullable = false)
    private Double totalServiceFee;

    @Column(name = "total_discount", nullable = false)
    private Double totalDiscount;

    @Column(name = "grand_total", nullable = false)
    private Double grandTotal;

    @Column(name = "recipient_name", nullable = false, length = 255, columnDefinition = "TEXT")
    private String recipientName;

    @Column(name = "recipient_phone", nullable = false)
    private String recipientPhone;

    @Column(name = "delivery_address", nullable = false, length = 1000, columnDefinition = "TEXT")
    private String deliveryAddress;

    @Column(name = "payment_method", nullable = false, length = 100, columnDefinition = "TEXT")
    private String paymentMethod;

    @Column(name = "payment_status")
    private String paymentStatus; // unpaid, paid, refunded

    @Column(name = "applied_promo_code", length = 100)
    private String appliedPromoCode;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "orderGroup", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Order> subOrders = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.paymentStatus == null) {
            this.paymentStatus = "unpaid";
        }
    }
}
