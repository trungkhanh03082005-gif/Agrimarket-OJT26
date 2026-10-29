package org.example.agrimarket.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class OrderResponse {
    private String id; // maps to orderCode
    private String status;
    private String statusLabel;
    private String date;
    private String time;
    private Double subtotal;
    private Double shippingFee;
    private Double serviceFee;
    private Double discount;
    private Double amount;
    private String recipient;
    private String address;
    private String phone;
    private String trackingNumber;
    private String cancelReason;
    private String cancelBy;
    private java.time.LocalDateTime cancelledAt;
    private String customerAvatarUrl;
    private String shippingNote;
    private ProviderInfo provider;
    private PartnerInfo partner;
    private String shipperNotes;
    private String podPhoto;
    private String detailedStatus;
    private List<OrderItemResponseDTO> items;
    private List<String> thumbnails;
    private Integer itemCount;
    private Integer hasMoreItems;
    private String paymentMethod;
    private String paymentStatus;
    private DriverInfo driverInfo;

    @Data
    @Builder
    public static class ProviderInfo {
        private String name;
        private String location;
        private String phone;
        private Integer estYear;
        private String avatarText;
        private String avatarBg;
        private String avatarUrl;
    }

    @Data
    @Builder
    public static class PartnerInfo {
        private Long id;
        private String fullName;
        private String email;
        private String phone;
        private String avatarUrl;
    }

    @Data
    @Builder
    public static class DriverInfo {
        private String driverName;
        private String driverCode;
        private String driverPhone;
        private String vehicleType;
        private String licensePlate;
    }
}
