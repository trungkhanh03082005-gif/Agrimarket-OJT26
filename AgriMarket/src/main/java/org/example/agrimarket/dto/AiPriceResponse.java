package org.example.agrimarket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiPriceResponse {
    private Integer recommendedPrice;
    private Integer minPrice;
    private Integer maxPrice;
    private String explanation;
}
