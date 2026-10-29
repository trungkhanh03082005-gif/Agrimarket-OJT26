package org.example.agrimarket.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.example.agrimarket.dto.AdminDashboardResponse;
import org.example.agrimarket.dto.AdminDashboardResponse.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class AdminDashboardService {

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "admin_dashboard_stats", key = "#range")
    public AdminDashboardResponse getDashboardStats(String range) {
        LocalDateTime endDate = LocalDateTime.now();
        LocalDateTime startDate = endDate.minusDays(7); // default 7 days

        if ("today".equalsIgnoreCase(range)) {
            startDate = LocalDate.now().atStartOfDay();
        } else if ("7days".equalsIgnoreCase(range)) {
            startDate = endDate.minusDays(7);
        } else if ("30days".equalsIgnoreCase(range)) {
            startDate = endDate.minusDays(30);
        } else if ("year".equalsIgnoreCase(range)) {
            startDate = endDate.minusYears(1);
        }

        // 1. Revenue (Real DB, no mock)
        Double revenue = entityManager.createQuery(
                "SELECT SUM(og.grandTotal) FROM OrderGroup og WHERE (og.paymentStatus IS NULL OR (og.paymentStatus <> 'cancelled' AND og.paymentStatus <> 'failed')) AND og.createdAt >= :startDate AND og.createdAt <= :endDate", Double.class)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getSingleResult();
        if (revenue == null) revenue = 0.0;

        // 2. Revenue Trend (Real DB, no mock)
        long durationDays = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate);
        if (durationDays <= 0) durationDays = 1; // today
        LocalDateTime previousStartDate = startDate.minusDays(durationDays);
        LocalDateTime previousEndDate = startDate;

        Double prevRevenue = entityManager.createQuery(
                "SELECT SUM(og.grandTotal) FROM OrderGroup og WHERE (og.paymentStatus IS NULL OR (og.paymentStatus <> 'cancelled' AND og.paymentStatus <> 'failed')) AND og.createdAt >= :startDate AND og.createdAt <= :endDate", Double.class)
                .setParameter("startDate", previousStartDate)
                .setParameter("endDate", previousEndDate)
                .getSingleResult();
        if (prevRevenue == null) prevRevenue = 0.0;

        String revenueTrend = "+0.0%";
        if (prevRevenue > 0) {
            double trend = ((revenue - prevRevenue) / prevRevenue) * 100.0;
            revenueTrend = String.format("%s%.1f%%", trend >= 0 ? "+" : "", trend);
        } else if (revenue > 0) {
            revenueTrend = "+100.0%";
        }

        // 3. Orders Count (Real DB, no mock)
        Long ordersCount = entityManager.createQuery(
                "SELECT COUNT(o) FROM Order o WHERE o.createdAt >= :startDate AND o.createdAt <= :endDate", Long.class)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getSingleResult();
        if (ordersCount == null) ordersCount = 0L;

        // 4. Completed vs Pending Order Percentage (Real DB, no mock)
        Long completedCount = entityManager.createQuery(
                "SELECT COUNT(o) FROM Order o WHERE o.status = 'delivered' AND o.createdAt >= :startDate AND o.createdAt <= :endDate", Long.class)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getSingleResult();
        if (completedCount == null) completedCount = 0L;

        Long pendingCount = entityManager.createQuery(
                "SELECT COUNT(o) FROM Order o WHERE o.status IN ('pending', 'confirmed', 'preparing', 'shipping') AND o.createdAt >= :startDate AND o.createdAt <= :endDate", Long.class)
                .setParameter("startDate", startDate)
                .setParameter("endDate", endDate)
                .getSingleResult();
        if (pendingCount == null) pendingCount = 0L;

        int completedPercent = 0;
        int pendingPercent = 0;
        long totalValid = completedCount + pendingCount;
        if (totalValid > 0) {
            completedPercent = (int) Math.round((completedCount * 100.0) / totalValid);
            pendingPercent = 100 - completedPercent;
        }

        // 5. User metrics (Real DB, no mock)
        Long usersCustomers = 0L;
        Long usersFarmers = 0L;
        try {
            usersCustomers = ((Number) entityManager.createNativeQuery(
                    "SELECT COUNT(*) FROM users WHERE user_type = 'CUSTOMER'")
                    .getSingleResult()).longValue();
        } catch (Exception ignored) {}

        try {
            usersFarmers = ((Number) entityManager.createNativeQuery(
                    "SELECT COUNT(*) FROM users WHERE user_type = 'FARMER'")
                    .getSingleResult()).longValue();
        } catch (Exception ignored) {}

        Long usersTotal = usersCustomers + usersFarmers;

        // 6. Pending Approvals (Real DB, no mock)
        Long pendingProducts = entityManager.createQuery(
                "SELECT COUNT(p) FROM Product p WHERE p.status = 'pending'", Long.class)
                .getSingleResult();
        if (pendingProducts == null) pendingProducts = 0L;

        Long pendingFarmers = entityManager.createQuery(
                "SELECT COUNT(f) FROM Farmer f WHERE f.verificationStatus = 'pending'", Long.class)
                .getSingleResult();
        if (pendingFarmers == null) pendingFarmers = 0L;

        // 7. Purchasing Chart (Customer purchases count, not money)
        List<RevenueChartPoint> revenueChart = new ArrayList<>();
        if ("today".equalsIgnoreCase(range)) {
            String[] labels = {"00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"};
            for (int i = 0; i < labels.length; i++) {
                LocalDateTime slotStart = startDate.plusHours(i * 4 - 2);
                LocalDateTime slotEnd = startDate.plusHours(i * 4 + 2);
                Long val = entityManager.createQuery(
                        "SELECT COUNT(og) FROM OrderGroup og WHERE (og.paymentStatus IS NULL OR og.paymentStatus <> 'cancelled') AND og.createdAt >= :start AND og.createdAt < :end", Long.class)
                        .setParameter("start", slotStart)
                        .setParameter("end", slotEnd)
                        .getSingleResult();
                revenueChart.add(new RevenueChartPoint(labels[i], val != null ? val.doubleValue() : 0.0));
            }
        } else if ("7days".equalsIgnoreCase(range)) {
            String[] daysOfWeek = {"Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"};
            for (int i = 6; i >= 0; i--) {
                LocalDateTime dayStart = endDate.minusDays(i).with(LocalTime.MIN);
                LocalDateTime dayEnd = endDate.minusDays(i).with(LocalTime.MAX);
                Long val = entityManager.createQuery(
                        "SELECT COUNT(og) FROM OrderGroup og WHERE (og.paymentStatus IS NULL OR og.paymentStatus <> 'cancelled') AND og.createdAt >= :start AND og.createdAt <= :end", Long.class)
                        .setParameter("start", dayStart)
                        .setParameter("end", dayEnd)
                        .getSingleResult();
                int dayIndex = dayStart.getDayOfWeek().getValue() - 1; // 0 for Monday, 6 for Sunday
                revenueChart.add(new RevenueChartPoint(daysOfWeek[dayIndex], val != null ? val.doubleValue() : 0.0));
            }
        } else if ("30days".equalsIgnoreCase(range)) {
            for (int i = 3; i >= 0; i--) {
                LocalDateTime weekStart = endDate.minusWeeks(i + 1);
                LocalDateTime weekEnd = endDate.minusWeeks(i);
                Long val = entityManager.createQuery(
                        "SELECT COUNT(og) FROM OrderGroup og WHERE (og.paymentStatus IS NULL OR og.paymentStatus <> 'cancelled') AND og.createdAt >= :start AND og.createdAt < :end", Long.class)
                        .setParameter("start", weekStart)
                        .setParameter("end", weekEnd)
                        .getSingleResult();
                revenueChart.add(new RevenueChartPoint("Tuần " + (4 - i), val != null ? val.doubleValue() : 0.0));
            }
        } else if ("year".equalsIgnoreCase(range)) {
            for (int i = 3; i >= 0; i--) {
                LocalDateTime quarterStart = endDate.minusMonths((i + 1) * 3);
                LocalDateTime quarterEnd = endDate.minusMonths(i * 3);
                Long val = entityManager.createQuery(
                        "SELECT COUNT(og) FROM OrderGroup og WHERE (og.paymentStatus IS NULL OR og.paymentStatus <> 'cancelled') AND og.createdAt >= :start AND og.createdAt < :end", Long.class)
                        .setParameter("start", quarterStart)
                        .setParameter("end", quarterEnd)
                        .getSingleResult();
                revenueChart.add(new RevenueChartPoint("Quý " + (4 - i), val != null ? val.doubleValue() : 0.0));
            }
        }

        // 8. Popular Categories (Based on SUM(oi.quantity), no mock)
        List<Object[]> popularCategoryList = new ArrayList<>();
        try {
            popularCategoryList = entityManager.createNativeQuery(
                    "SELECT c.name, SUM(oi.quantity) as sold_qty " +
                    "FROM order_item oi " +
                    "JOIN product p ON p.id = oi.product_id " +
                    "JOIN category c ON c.id = p.category_id " +
                    "JOIN orders o ON o.id = oi.order_id " +
                    "WHERE (o.status IS NULL OR (o.status <> 'cancelled' AND o.status <> 'rejected')) AND o.created_at >= :startDate " +
                    "GROUP BY c.name " +
                    "ORDER BY sold_qty DESC")
                    .setParameter("startDate", startDate)
                    .setMaxResults(4)
                    .getResultList();
        } catch (Exception e) {
            System.err.println(">>> AdminDashboardService: Error popularCategoryList: " + e.getMessage());
        }

        List<PopularCategory> popularCategories = new ArrayList<>();
        String[] colors = {"#0f766e", "#475569", "#854d0e", "#94a3b8"};

        long totalSalesCount = 0;
        if (popularCategoryList != null && !popularCategoryList.isEmpty()) {
            for (Object[] row : popularCategoryList) {
                totalSalesCount += row[1] != null ? ((Number) row[1]).longValue() : 0L;
            }
            int index = 0;
            for (Object[] row : popularCategoryList) {
                long quantity = row[1] != null ? ((Number) row[1]).longValue() : 0L;
                double pct = totalSalesCount > 0 ? ((double) quantity * 100.0) / totalSalesCount : 0.0;
                popularCategories.add(new PopularCategory((String) row[0], Math.round(pct * 10.0) / 10.0, colors[index % colors.length]));
                index++;
            }
        }

        // 9. Top Farmers (Based on SUM(oi.quantity) sold, rating is average of product reviews, no mock)
        List<Object[]> topFarmerList = new ArrayList<>();
        try {
            topFarmerList = entityManager.createNativeQuery(
                    "SELECT f.farm_name, f.farm_address, " +
                    "       COALESCE(CAST((SELECT AVG(pr.rating) FROM product_review pr JOIN product p ON p.id = pr.product_id WHERE p.farmer_id = f.id) AS double precision), f.rating_average, 5.0) as rating, " +
                    "       SUM(oi.quantity) as sold, " +
                    "       SUM(oi.quantity * oi.product_price) as revenue, " +
                    "       u.full_name " +
                    "FROM order_item oi " +
                    "JOIN orders o ON o.id = oi.order_id " +
                    "JOIN farmer f ON f.id = oi.farmer_id " +
                    "JOIN users u ON u.id = f.id " +
                    "WHERE (o.status IS NULL OR (o.status <> 'cancelled' AND o.status <> 'rejected')) AND o.created_at >= :startDate " +
                    "GROUP BY f.farm_name, f.farm_address, f.rating_average, u.full_name, f.id " +
                    "ORDER BY sold DESC")
                    .setParameter("startDate", startDate)
                    .setMaxResults(5)
                    .getResultList();
        } catch (Exception e) {
            System.err.println(">>> AdminDashboardService: Error topFarmerList: " + e.getMessage());
        }

        List<TopFarmer> topFarmers = new ArrayList<>();
        if (topFarmerList != null && !topFarmerList.isEmpty()) {
            for (Object[] row : topFarmerList) {
                String farmName = (String) row[0];
                String address = (String) row[1];
                Double rating = row[2] != null ? ((Number) row[2]).doubleValue() : 5.0;
                Long soldCount = row[3] != null ? ((Number) row[3]).longValue() : 0L;
                Double rev = row[4] != null ? ((Number) row[4]).doubleValue() : 0.0;
                String fullName = (String) row[5];

                String initials = "";
                if (farmName != null && !farmName.isBlank()) {
                    String[] words = farmName.split("\\s+");
                    if (words.length > 1) {
                        initials = "" + words[0].charAt(0) + words[1].charAt(0);
                    } else if (words.length > 0) {
                        initials = "" + words[0].charAt(0);
                    }
                }
                initials = initials.toUpperCase();

                topFarmers.add(new TopFarmer(initials, farmName != null ? farmName : fullName, address, rating != null ? rating : 5.0, soldCount, rev));
            }
        }

        // 10. Operational Logs (Real DB, no mock)
        List<Object[]> paidOgs = new ArrayList<>();
        try {
            paidOgs = entityManager.createQuery(
                    "SELECT og.groupCode, og.grandTotal, og.createdAt, c.fullName, og.paymentMethod " +
                    "FROM OrderGroup og JOIN og.customer c " +
                    "WHERE og.paymentStatus = 'paid' " +
                    "ORDER BY og.createdAt DESC", Object[].class)
                    .setMaxResults(10)
                    .getResultList();
        } catch (Exception ignored) {}

        List<Object[]> reports = new ArrayList<>();
        try {
            reports = entityManager.createQuery(
                    "SELECT r.id, r.createdAt, reporter.fullName, r.reason " +
                    "FROM Report r JOIN r.reporter reporter " +
                    "ORDER BY r.createdAt DESC", Object[].class)
                    .setMaxResults(10)
                    .getResultList();
        } catch (Exception ignored) {}

        List<Object[]> products = new ArrayList<>();
        try {
            products = entityManager.createQuery(
                    "SELECT p.id, p.name, p.createdAt, f.fullName " +
                    "FROM Product p JOIN p.farmer f " +
                    "ORDER BY p.createdAt DESC", Object[].class)
                    .setMaxResults(10)
                    .getResultList();
        } catch (Exception ignored) {}

        List<Object[]> farmers = new ArrayList<>();
        try {
            farmers = entityManager.createQuery(
                    "SELECT f.id, f.farmName, f.fullName, f.createdAt " +
                    "FROM Farmer f " +
                    "ORDER BY f.createdAt DESC", Object[].class)
                    .setMaxResults(10)
                    .getResultList();
        } catch (Exception ignored) {}

        List<TempLog> tempLogs = new ArrayList<>();

        for (Object[] row : paidOgs) {
            String groupCode = (String) row[0];
            Double total = (Double) row[1];
            LocalDateTime createdAt = (LocalDateTime) row[2];
            String fullName = (String) row[3];
            String method = (String) row[4];

            tempLogs.add(new TempLog(
                    "pay_" + groupCode,
                    "VNPAY".equalsIgnoreCase(method) ? "VNPAY" : "COD",
                    (method != null ? method : "Thanh toán") + ": Đơn hàng #" + groupCode,
                    createdAt,
                    String.format("Giao dịch %,.0fđ thành công từ khách hàng %s.", total, fullName)
            ));
        }

        for (Object[] row : reports) {
            Long id = (Long) row[0];
            LocalDateTime createdAt = (LocalDateTime) row[1];
            String fullName = (String) row[2];
            String reason = (String) row[3];

            tempLogs.add(new TempLog(
                    "report_" + id,
                    "COMPLAINT",
                    "Khiếu nại từ " + fullName,
                    createdAt,
                    "Lý do: " + reason
            ));
        }

        for (Object[] row : products) {
            Long id = (Long) row[0];
            String name = (String) row[1];
            LocalDateTime createdAt = (LocalDateTime) row[2];
            String farmerName = (String) row[3];

            tempLogs.add(new TempLog(
                    "prod_" + id,
                    "PRODUCT",
                    "Duyệt sản phẩm: " + name,
                    createdAt,
                    "Nông dân " + farmerName + " vừa thêm sản phẩm mới cần duyệt: " + name + "."
            ));
        }

        for (Object[] row : farmers) {
            Long id = (Long) row[0];
            String farmName = (String) row[1];
            String repName = (String) row[2];
            LocalDateTime createdAt = (LocalDateTime) row[3];

            tempLogs.add(new TempLog(
                    "farm_" + id,
                    "PARTNER",
                    "Đối tác mới đăng ký",
                    createdAt,
                    "Nhà vườn " + (farmName != null ? farmName : repName) + " (đại diện: " + repName + ") vừa đăng ký tham gia hệ thống."
            ));
        }

        tempLogs.sort((a, b) -> b.dateTime.compareTo(a.dateTime));

        List<OperationalLog> operationalLogs = new ArrayList<>();
        int count = 0;
        for (TempLog tl : tempLogs) {
            if (count >= 10) break;
            operationalLogs.add(new OperationalLog(tl.id, tl.type, tl.title, formatRelativeTime(tl.dateTime), tl.description));
            count++;
        }

        return AdminDashboardResponse.builder()
                .revenue(revenue)
                .revenueTrend(revenueTrend)
                .ordersCount(ordersCount)
                .ordersCompletedPercent(completedPercent)
                .ordersPendingPercent(pendingPercent)
                .usersTotal(usersTotal)
                .usersCustomers(usersCustomers)
                .usersFarmers(usersFarmers)
                .pendingProducts(pendingProducts)
                .pendingFarmers(pendingFarmers)
                .revenueChart(revenueChart)
                .popularCategories(popularCategories)
                .topFarmers(topFarmers)
                .operationalLogs(operationalLogs)
                .build();
    }

    private String formatRelativeTime(LocalDateTime ldt) {
        if (ldt == null) return "Vừa xong";
        long seconds = java.time.Duration.between(ldt, LocalDateTime.now()).getSeconds();
        if (seconds < 60) {
            return "Vừa xong";
        }
        long minutes = seconds / 60;
        if (minutes < 60) {
            return minutes + " phút trước";
        }
        long hours = minutes / 60;
        if (hours < 24) {
            return hours + " giờ trước";
        }
        long days = hours / 24;
        if (days < 30) {
            return days + " ngày trước";
        }
        return ldt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
    }

    private static class TempLog {
        private String id;
        private String type;
        private String title;
        private LocalDateTime dateTime;
        private String description;

        public TempLog(String id, String type, String title, LocalDateTime dateTime, String description) {
            this.id = id;
            this.type = type;
            this.title = title;
            this.dateTime = dateTime;
            this.description = description;
        }
    }
}
