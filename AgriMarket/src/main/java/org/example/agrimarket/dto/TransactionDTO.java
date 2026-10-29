package org.example.agrimarket.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class TransactionDTO {
    private Long id;
    private String transactionCode;   // group_code của order_group
    private String orderCode;         // group_code (đại diện cho nhóm đơn)
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private Double amount;            // grand_total của order_group
    private String paymentMethod;
    private String status;            // payment_status của order_group
    private LocalDateTime createdAt;
}
