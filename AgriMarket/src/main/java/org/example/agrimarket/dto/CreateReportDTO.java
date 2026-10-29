package org.example.agrimarket.dto;

import lombok.Data;

@Data
public class CreateReportDTO {
    private String targetType;   // "product", "farmer", "customer"
    private Long targetId;
    private String reason;
    private String description;
}
