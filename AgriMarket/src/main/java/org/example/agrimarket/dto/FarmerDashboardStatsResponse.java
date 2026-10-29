package org.example.agrimarket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FarmerDashboardStatsResponse {
    private long totalProducts;
    private long lowStockCount;
    private long pendingOrdersCount;
    private double totalSales;
}
