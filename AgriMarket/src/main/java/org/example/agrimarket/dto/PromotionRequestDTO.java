package org.example.agrimarket.dto;

import lombok.Data;
import java.util.List;

@Data
public class PromotionRequestDTO {
    private String title;
    private String description;
    private String startDate;
    private String endDate;
    private Integer maxUses;
    private Long farmerId;
    private String visibility;
    private String discountType;
    private Double discountVal;
    private Double maxDiscount;
    private Double minOrder;
    private Integer usageLimitPerPerson;
    private Double budget;
    private String image;
    private List<Long> selectedProductIds;
}
