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
@Table(name = "orders", indexes = {
    @Index(name = "idx_orders_farmer_status", columnList = "farmer_id, status"),
    @Index(name = "idx_orders_customer_status", columnList = "customer_id, status"),
    @Index(name = "idx_orders_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_code", unique = true, nullable = false)
    private String orderCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_group_id", nullable = false)
    private OrderGroup orderGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_id", nullable = false)
    private Farmer farmer;

    @Column(name = "shipping_note", length = 1000, columnDefinition = "TEXT")
    private String shippingNote;

    @Column(name = "payment_status", nullable = false)
    private String paymentStatus; // unpaid, paid, refunded

    @Column(name = "status", nullable = false)
    private String status; // pending, confirmed, preparing, shipping, delivered, cancelled, rejected

    @Column(name = "subtotal", nullable = false)
    private Double subtotal;

    @Column(name = "shipping_fee", nullable = false)
    private Double shippingFee;

    @Column(name = "service_fee", nullable = false)
    private Double serviceFee;

    @Column(name = "discount", nullable = false)
    private Double discount;

    @Column(name = "amount", nullable = false)
    private Double amount;

    @Column(name = "tracking_number")
    private String trackingNumber;

    @Column(name = "cancel_reason", length = 1000, columnDefinition = "TEXT")
    private String cancelReason;

    @Column(name = "cancel_by")
    private String cancelBy;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "shipper_notes", length = 1000, columnDefinition = "TEXT")
    private String shipperNotes;

    @Column(name = "pod_photo", columnDefinition = "TEXT")
    private String podPhoto;

    @Column(name = "detailed_status")
    private String detailedStatus;

    @Column(name = "driver_name", length = 255, columnDefinition = "TEXT")
    private String driverName;

    @Column(name = "driver_code", length = 100)
    private String driverCode;

    @Column(name = "driver_phone", length = 50)
    private String driverPhone;

    @Column(name = "vehicle_type", length = 100, columnDefinition = "TEXT")
    private String vehicleType;

    @Column(name = "license_plate", length = 50)
    private String licensePlate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<OrderItem> items = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "pending";
        }
        if (this.paymentStatus == null) {
            this.paymentStatus = "unpaid";
        }
    }
}
