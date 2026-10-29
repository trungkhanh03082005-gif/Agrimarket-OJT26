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
public class PreorderResponse {
    private Long id;
    private Long customerId;
    private String customerName;
    private String customerPhone;
    private String customerAddress;
    private String status;
    private LocalDateTime createdAt;
    private Double discount;
    private List<PreorderItemResponse> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PreorderItemResponse {
        private Long id;
        private Long productId;
        private String productName;
        private Double productPrice;
        private String productUnit;
        private String productThumbnailUrl;
        private Integer quantity;
        private LocalDate expectedHarvestDate;
        private String farmerName;
        private String farmLocation;
    }
}
