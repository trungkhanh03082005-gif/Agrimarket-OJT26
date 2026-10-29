package org.example.agrimarket.dto;

import lombok.Data;
import java.util.List;

@Data
public class OrderCreateRequest {
    private String recipient;
    private String phone;
    private String address;
    private String shippingNote;
    private String paymentMethod;
    private Double subtotal;
    private Double shippingFee;
    private Double serviceFee;
    private Double discount;
    private Double amount;
    private Double latitude;
    private Double longitude;
    private String appliedPromoCode;
    private List<OrderItemRequest> items;
}
