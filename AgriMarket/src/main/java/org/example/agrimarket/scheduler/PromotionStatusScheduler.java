package org.example.agrimarket.scheduler;

import org.example.agrimarket.model.Promotion;
import org.example.agrimarket.repository.PromotionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Scheduler tự động chuyển trạng thái chương trình khuyến mãi theo thời hạn:
 * - Chuyển sang 'upcoming' nếu chưa đến ngày bắt đầu (now < startDate).
 * - Chuyển sang 'active' nếu đến ngày bắt đầu và chưa hết hạn (startDate <= now <= endDate).
 * - Chuyển sang 'ended' nếu đã quá ngày kết thúc (now > endDate).
 */
@Component
public class PromotionStatusScheduler {

    private static final Logger logger = LoggerFactory.getLogger(PromotionStatusScheduler.class);

    @Autowired
    private PromotionRepository promotionRepository;

    @Scheduled(fixedDelay = 60000) // Chạy tự động mỗi 1 phút
    @Transactional
    public void updatePromotionStatuses() {
        LocalDate now = LocalDate.now();
        List<Promotion> promotions = promotionRepository.findAll();

        int updatedCount = 0;
        for (Promotion p : promotions) {
            if ("canceled".equalsIgnoreCase(p.getStatus())) {
                continue; // Giữ nguyên trạng thái nếu bị hủy thủ công
            }

            String currentStatus = p.getStatus();
            String newStatus = currentStatus;

            if (p.getEndDate() != null && now.isAfter(p.getEndDate())) {
                newStatus = "ended";
            } else if (p.getStartDate() != null && now.isBefore(p.getStartDate())) {
                newStatus = "upcoming";
            } else if (p.getStartDate() != null && !now.isBefore(p.getStartDate()) && (p.getEndDate() == null || !now.isAfter(p.getEndDate()))) {
                newStatus = "active";
            }

            if (!newStatus.equals(currentStatus)) {
                p.setStatus(newStatus);
                promotionRepository.save(p);
                updatedCount++;
                logger.info("Chương trình khuyến mãi ID {}: Trạng thái đổi từ '{}' sang '{}'", p.getId(), currentStatus, newStatus);
            }
        }

        if (updatedCount > 0) {
            logger.info("Đã cập nhật tự động trạng thái cho {} chương trình khuyến mãi", updatedCount);
        }
    }
}
