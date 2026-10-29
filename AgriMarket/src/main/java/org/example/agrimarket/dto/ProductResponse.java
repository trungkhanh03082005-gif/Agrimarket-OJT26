package org.example.agrimarket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
    private Long id;
    private Long farmerId;
    private Long categoryId;
    private String categoryName;
    private String name;
    private String description;
    private Double price;
    private Integer stockQuantity;
    private String unit;
    private String status;
    private LocalDate harvestDate;
    private LocalDate expirationDate;
    private LocalDateTime createdAt;
    private String traceabilityImageUrl;
    private String thumbnailUrl;
    private List<String> images;
    private String farmerName;
    private String farmLocation;
    private String farmDescription;
    private String farmerAvatarUrl;
    private String rejectionReason;
    private String adminNotes;
    private Double rating;
    private Integer reviewsCount;
    private Integer sold;
    private String farmerVietgapUrl;
    private String farmerGlobalgapUrl;
    private String farmerOrganicUrl;
    private String perishability;
    private Double limitDistance;
    private Double farmerLatitude;
    private Double farmerLongitude;
    private Double farmerMaxDeliveryDistance;
    @com.fasterxml.jackson.annotation.JsonProperty("isPreorder")
    private Boolean isPreorder;
    // Trigger comment
}
