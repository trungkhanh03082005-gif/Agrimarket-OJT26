package org.example.agrimarket.dto;

import lombok.Data;

@Data
public class CartItemUpdateRequest {
    private Long productId;
    private Integer quantity;
    private Boolean checked;
}
