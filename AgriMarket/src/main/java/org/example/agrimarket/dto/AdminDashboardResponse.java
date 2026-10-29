package org.example.agrimarket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardResponse {
    private Double revenue;
    private String revenueTrend;
    private Long ordersCount;
    private Integer ordersCompletedPercent;
    private Integer ordersPendingPercent;
    private Long usersTotal;
    private Long usersCustomers;
    private Long usersFarmers;
    private Long pendingProducts;
    private Long pendingFarmers;
    private List<RevenueChartPoint> revenueChart;
    private List<PopularCategory> popularCategories;
    private List<TopFarmer> topFarmers;
    private List<OperationalLog> operationalLogs;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevenueChartPoint {
        private String label;
        private Double value;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PopularCategory {
        private String name;
        private Double percentage;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopFarmer {
        private String initials;
        private String name;
        private String address;
        private Double rating;
        private Long sold;
        private Double revenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OperationalLog {
        private String id;
        private String type; // VNPAY, COMPLAINT, PRODUCT, PARTNER
        private String title;
        private String time;
        private String description;
    }
}
