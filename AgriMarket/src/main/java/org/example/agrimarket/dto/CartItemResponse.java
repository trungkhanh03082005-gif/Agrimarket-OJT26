package org.example.agrimarket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemResponse {
    private Long id; // maps to product id
    private String name;
    private Double price;
    private String unit;
    private String imageUrl;
    private Integer quantity;
    private Boolean checked;
    private Integer stockQuantity;
    private Long farmerId;
    private String farmerName;

    private Double distance;
    private Double maxDeliveryRange;
    private Boolean isWithinDeliveryRange;
    private String perishability;

    /** Giá ưu đãi từ livestream. Null nếu không phải sản phẩm live. */
    private Double livestreamPrice;
    /** ID của livestream nguồn. Null nếu không phải sản phẩm live. */
    private Long livestreamId;
}
