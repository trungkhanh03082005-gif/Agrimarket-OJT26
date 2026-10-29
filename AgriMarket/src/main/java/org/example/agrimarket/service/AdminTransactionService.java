package org.example.agrimarket.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.example.agrimarket.dto.TransactionDTO;
import org.example.agrimarket.dto.TransactionPageResponse;
import org.example.agrimarket.repository.OrderGroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class AdminTransactionService {

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private OrderGroupRepository orderGroupRepository;

    /**
     * Lấy danh sách giao dịch bằng native SQL — tránh mọi vấn đề JPQL/Hibernate.
     */
    @Transactional(readOnly = true)
    public TransactionPageResponse getTransactions(
            String keyword,
            String paymentMethod,
            String status,
            LocalDateTime fromDt,
            LocalDateTime toDt,
            int page,
            int size
    ) {
        // Build dynamic WHERE clause
        StringBuilder where = new StringBuilder(" WHERE 1=1 ");
        if (keyword != null && !keyword.isBlank()) {
            where.append(" AND (LOWER(og.group_code) LIKE LOWER(:keyword) " +
                         " OR LOWER(u.full_name) LIKE LOWER(:keyword) " +
                         " OR LOWER(u.email) LIKE LOWER(:keyword)) ");
        }
        if (paymentMethod != null && !paymentMethod.equalsIgnoreCase("all")) {
            where.append(" AND LOWER(og.payment_method) = LOWER(:paymentMethod) ");
        }
        if (status != null && !status.equalsIgnoreCase("all")) {
            where.append(" AND LOWER(og.payment_status) = LOWER(:status) ");
        }
        if (fromDt != null) {
            where.append(" AND og.created_at >= :fromDate ");
        }
        if (toDt != null) {
            where.append(" AND og.created_at <= :toDate ");
        }

        String fromJoin = " FROM order_group og " +
                          " LEFT JOIN customer c ON c.id = og.customer_id " +
                          " LEFT JOIN users u ON u.id = c.id ";

        // Data query
        String dataSql = "SELECT og.id, og.group_code, og.grand_total, og.payment_method, " +
                         "       og.payment_status, og.created_at, " +
                         "       u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone " +
                         fromJoin + where +
                         " ORDER BY og.created_at DESC ";

        // Count query
        String countSql = "SELECT COUNT(og.id) " + fromJoin + where;

        Query dataQuery = entityManager.createNativeQuery(dataSql);
        Query countQuery = entityManager.createNativeQuery(countSql);

        // Bind parameters
        if (keyword != null && !keyword.isBlank()) {
            String kw = "%" + keyword + "%";
            dataQuery.setParameter("keyword", kw);
            countQuery.setParameter("keyword", kw);
        }
        if (paymentMethod != null && !paymentMethod.equalsIgnoreCase("all")) {
            dataQuery.setParameter("paymentMethod", paymentMethod);
            countQuery.setParameter("paymentMethod", paymentMethod);
        }
        if (status != null && !status.equalsIgnoreCase("all")) {
            dataQuery.setParameter("status", status);
            countQuery.setParameter("status", status);
        }
        if (fromDt != null) {
            dataQuery.setParameter("fromDate", fromDt);
            countQuery.setParameter("fromDate", fromDt);
        }
        if (toDt != null) {
            dataQuery.setParameter("toDate", toDt);
            countQuery.setParameter("toDate", toDt);
        }

        // Pagination
        dataQuery.setFirstResult(page * size);
        dataQuery.setMaxResults(size);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = dataQuery.getResultList();
        long total = ((Number) countQuery.getSingleResult()).longValue();

        List<TransactionDTO> content = new ArrayList<>();
        for (Object[] row : rows) {
            content.add(mapRow(row));
        }

        // Stats queries — đơn giản, không có JOIN phức tạp
        Double totalRevenue = orderGroupRepository.sumTotalRevenue();
        Long successCount = orderGroupRepository.countSuccessTransactions();
        Long failedCount = orderGroupRepository.countFailedTransactions();
        Long allCount = orderGroupRepository.countAllTransactions();

        double successRate = (allCount != null && allCount > 0 && successCount != null)
                ? Math.round((successCount * 100.0 / allCount) * 10.0) / 10.0
                : 0.0;

        int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 0;

        return TransactionPageResponse.builder()
                .content(content)
                .totalElements(total)
                .totalPages(totalPages)
                .currentPage(page)
                .pageSize(size)
                .stats(TransactionPageResponse.TransactionStats.builder()
                        .totalRevenue(totalRevenue != null ? totalRevenue : 0.0)
                        .successTransactions(successCount != null ? successCount : 0L)
                        .failedTransactions(failedCount != null ? failedCount : 0L)
                        .successRate(successRate)
                        .build())
                .build();
    }

    /**
     * Xuất tất cả giao dịch cho CSV.
     */
    @Transactional(readOnly = true)
    public List<TransactionDTO> getAllTransactionsForExport(
            String keyword,
            String paymentMethod,
            String status,
            LocalDateTime fromDt,
            LocalDateTime toDt
    ) {
        // Dùng cùng logic nhưng không phân trang
        TransactionPageResponse all = getTransactions(keyword, paymentMethod, status, fromDt, toDt, 0, Integer.MAX_VALUE / 2);
        return all.getContent();
    }

    /**
     * Lấy chi tiết 1 giao dịch theo groupCode.
     */
    @Transactional(readOnly = true)
    public Optional<TransactionDTO> getTransactionByGroupCode(String groupCode) {
        String sql = "SELECT og.id, og.group_code, og.grand_total, og.payment_method, " +
                     "       og.payment_status, og.created_at, " +
                     "       u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone " +
                     " FROM order_group og " +
                     " LEFT JOIN customer c ON c.id = og.customer_id " +
                     " LEFT JOIN users u ON u.id = c.id " +
                     " WHERE og.group_code = :groupCode ";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("groupCode", groupCode);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        if (rows.isEmpty()) return Optional.empty();
        return Optional.of(mapRow(rows.get(0)));
    }

    // ===== Helpers =====

    private TransactionDTO mapRow(Object[] row) {
        // Columns: id, group_code, grand_total, payment_method, payment_status, created_at,
        //          customer_name, customer_email, customer_phone
        Long id = row[0] != null ? ((Number) row[0]).longValue() : null;
        String groupCode = (String) row[1];
        Double grandTotal = row[2] != null ? ((Number) row[2]).doubleValue() : null;
        String paymentMethod = (String) row[3];
        String paymentStatus = (String) row[4];
        LocalDateTime createdAt = null;
        if (row[5] != null) {
            if (row[5] instanceof LocalDateTime) {
                createdAt = (LocalDateTime) row[5];
            } else if (row[5] instanceof java.sql.Timestamp) {
                createdAt = ((java.sql.Timestamp) row[5]).toLocalDateTime();
            }
        }
        String customerName  = row[6] != null ? (String) row[6] : "—";
        String customerEmail = row[7] != null ? (String) row[7] : "—";
        String customerPhone = row[8] != null ? (String) row[8] : "—";

        return TransactionDTO.builder()
                .id(id)
                .transactionCode(groupCode)
                .orderCode(groupCode)
                .customerName(customerName)
                .customerEmail(customerEmail)
                .customerPhone(customerPhone)
                .amount(grandTotal)
                .paymentMethod(paymentMethod)
                .status(paymentStatus)
                .createdAt(createdAt)
                .build();
    }
}
