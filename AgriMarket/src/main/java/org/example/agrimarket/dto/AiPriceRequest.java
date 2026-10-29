package org.example.agrimarket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiPriceRequest {
    private String productName;
    private String category;
    private String unit;
    private String harvestDate;
    private String expirationDate;
}
