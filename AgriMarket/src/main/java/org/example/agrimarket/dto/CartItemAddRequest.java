package org.example.agrimarket.dto;

import lombok.Data;

@Data
public class CartItemAddRequest {
    private Long productId;
    private Integer quantity;
    /** Giá ưu đãi từ livestream (null nếu thêm bình thường) */
    private Double livestreamPrice;
    /** ID của livestream nguồn (null nếu thêm bình thường) */
    private Long livestreamId;
}
