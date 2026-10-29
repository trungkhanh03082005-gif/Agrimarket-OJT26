package org.example.agrimarket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionResponseDTO {
    private Long id;
    private String title;
    private String description;
    private String discountType;
    private Double discountVal;
    private Long farmerId;
    private String farmerName;
    private String startDate;
    private String endDate;
    private String status;
    private Integer productsCount;
    private Integer maxUses;
    private Integer usedCount;
    private Double budget;
    private Double usedBudget;
    private Double revenueGenerated;
    private String image;
    private String code;
    private Double maxDiscount;
    private Double minOrder;
    private Integer usageLimitPerPerson;
    private String visibility;
    private List<PromotionProductDTO> selectedProducts;
}
