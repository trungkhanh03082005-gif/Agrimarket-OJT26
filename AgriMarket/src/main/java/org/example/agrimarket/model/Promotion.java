package org.example.agrimarket.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "promotion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Promotion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 50)
    private String code;

    @Column(name = "discount_type", nullable = false, length = 50)
    private String discountType; // "percent", "amount", "free_ship"

    @Column(name = "discount_val", nullable = false)
    private Double discountVal;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(length = 50)
    private String status; // "active", "upcoming", "ended"

    @Column(name = "max_uses")
    private Integer maxUses = 0;

    @Column(name = "used_count")
    private Integer usedCount = 0;

    @Column(name = "budget")
    private Double budget = 0.0;

    @Column(name = "used_budget")
    private Double usedBudget = 0.0;

    @Column(name = "revenue_generated")
    private Double revenueGenerated = 0.0;

    @Column(length = 1000)
    private String image;

    @Column(length = 50)
    private String visibility = "show"; // "show", "hide"

    @Column(name = "max_discount")
    private Double maxDiscount;

    @Column(name = "min_order")
    private Double minOrder;

    @Column(name = "usage_limit_per_person")
    private Integer usageLimitPerPerson = 1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_id")
    private Farmer farmer; // If null, applies to whole system

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "promotion_product",
        joinColumns = @JoinColumn(name = "promotion_id"),
        inverseJoinColumns = @JoinColumn(name = "product_id")
    )
    @Builder.Default
    private Set<Product> products = new HashSet<>();
}
