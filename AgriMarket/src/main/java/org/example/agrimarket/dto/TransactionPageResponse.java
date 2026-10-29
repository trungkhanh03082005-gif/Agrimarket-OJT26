package org.example.agrimarket.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TransactionPageResponse {
    private List<TransactionDTO> content;
    private long totalElements;
    private int totalPages;
    private int currentPage;
    private int pageSize;
    private TransactionStats stats;

    @Data
    @Builder
    public static class TransactionStats {
        private Double totalRevenue;
        private Long successTransactions;
        private Long failedTransactions;
        private Double successRate;
    }
}
