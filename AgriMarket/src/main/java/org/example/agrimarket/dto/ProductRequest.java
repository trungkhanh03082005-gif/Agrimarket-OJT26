package org.example.agrimarket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {
    private String name;
    private String categoryName;
    private String description;
    private Double price;
    private Integer stockQuantity;
    private String unit;
    private String status; // draft, pending
    private LocalDate harvestDate;
    private LocalDate expirationDate;

    // Organic fields
    private String certificateFileBase64; // base64 string
    private String certificateFileName;

    // Traceability fields
    private String traceabilityImageBase64;
    private String traceabilityImageName;

    // List of base64 images
    private List<String> images; // List of base64 strings

    private String perishability;
    private Double limitDistance;
    @com.fasterxml.jackson.annotation.JsonProperty("isPreorder")
    private Boolean isPreorder;
    // Trigger comment
}
