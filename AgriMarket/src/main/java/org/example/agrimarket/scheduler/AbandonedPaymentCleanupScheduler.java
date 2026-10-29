package org.example.agrimarket.scheduler;

import org.example.agrimarket.model.*;
import org.example.agrimarket.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Scheduler dọn dẹp các đơn hàng VNPay bị bỏ rơi.
 *
 * Kịch bản: Customer tạo đơn → chuyển hướng sang VNPay → nhấn Back hoặc
 * đóng tab mà không hoàn tất thanh toán. VNPay timeout là 15 phút.
 * Sau 20 phút, đơn hàng ở trạng thái 'awaiting_payment' sẽ bị xóa và
 * tồn kho sản phẩm được hoàn trả.
 */
@Component
public class AbandonedPaymentCleanupScheduler {

    private static final Logger logger = LoggerFactory.getLogger(AbandonedPaymentCleanupScheduler.class);

    /** Thời gian chờ tối đa (phút) trước khi đơn bị dọn dẹp. VNPay timeout là 15'. */
    private static final int PAYMENT_TIMEOUT_MINUTES = 20;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderGroupRepository orderGroupRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    /**
     * Chạy mỗi 2 phút để dọn dẹp đơn VNPay bị bỏ rơi.
     */
    @Scheduled(fixedDelay = 120_000)
    @Transactional
    public void cleanupAbandonedVnPayOrders() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(PAYMENT_TIMEOUT_MINUTES);
        List<Order> abandonedOrders = orderRepository.findAbandonedAwaitingPaymentOrders(cutoff);

        if (abandonedOrders.isEmpty()) {
            return;
        }

        logger.info("[AbandonedPaymentCleanup] Tìm thấy {} đơn hàng awaiting_payment quá hạn {} phút. Bắt đầu dọn dẹp...",
                abandonedOrders.size(), PAYMENT_TIMEOUT_MINUTES);

        for (Order order : abandonedOrders) {
            try {
                String orderCode = order.getOrderCode();
                String customerEmail = order.getCustomer() != null ? order.getCustomer().getEmail() : "unknown";

                logger.info("[AbandonedPaymentCleanup] Dọn đơn {} (customer: {}, createdAt: {})",
                        orderCode, customerEmail, order.getCreatedAt());

                // 1. Hoàn trả tồn kho
                restoreStock(order);

                // 2. Hoàn giỏ hàng cho customer
                restoreCart(order, customerEmail);

            } catch (Exception e) {
                logger.error("[AbandonedPaymentCleanup] Lỗi khi dọn đơn {}: {}",
                        order.getOrderCode(), e.getMessage(), e);
            }
        }

        // 3. Xóa OrderGroup nếu tất cả sub-order đều đã ở trạng thái awaiting_payment
        cleanupAbandonedOrderGroups(cutoff);
    }

    // ===== Helpers =====

    private void restoreStock(Order order) {
        if (order.getItems() == null) return;
        for (OrderItem item : order.getItems()) {
            Optional<Product> productOpt = productRepository.findById(item.getProductId());
            if (productOpt.isPresent()) {
                Product product = productOpt.get();
                product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
                productRepository.save(product);
                logger.debug("[AbandonedPaymentCleanup] Hoàn kho sản phẩm ID={} +{}", item.getProductId(), item.getQuantity());
            }
        }
    }

    private void restoreCart(Order order, String customerEmail) {
        if (order.getItems() == null || order.getItems().isEmpty()) return;

        Cart cart = cartRepository.findByEmail(customerEmail).orElseGet(() -> {
            Cart newCart = new Cart();
            newCart.setEmail(customerEmail);
            return cartRepository.save(newCart);
        });

        for (OrderItem orderItem : order.getItems()) {
            Optional<CartItem> existingOpt = cart.getItems().stream()
                    .filter(ci -> ci.getProductId().equals(orderItem.getProductId()))
                    .findFirst();

            if (existingOpt.isPresent()) {
                CartItem existing = existingOpt.get();
                existing.setQuantity(existing.getQuantity() + orderItem.getQuantity());
                cartItemRepository.save(existing);
            } else {
                CartItem newItem = new CartItem();
                newItem.setCart(cart);
                newItem.setProductId(orderItem.getProductId());
                newItem.setQuantity(orderItem.getQuantity());
                newItem.setChecked(true);
                cart.getItems().add(newItem);
                cartItemRepository.save(newItem);
            }
        }
        cartRepository.save(cart);

        // Xóa đơn hàng sau khi hoàn giỏ
        orderRepository.delete(order);
        logger.info("[AbandonedPaymentCleanup] Đã hoàn giỏ hàng và xóa đơn {}", order.getOrderCode());
    }

    /**
     * Xóa OrderGroup nếu không còn sub-order nào (đã bị dọn hết ở trên).
     */
    private void cleanupAbandonedOrderGroups(LocalDateTime cutoff) {
        List<OrderGroup> allGroups = orderGroupRepository.findAll();
        for (OrderGroup group : allGroups) {
            if (!"unpaid".equalsIgnoreCase(group.getPaymentStatus())
                    && !"awaiting_payment".equalsIgnoreCase(group.getPaymentStatus())) {
                continue;
            }
            if (group.getCreatedAt() != null && group.getCreatedAt().isAfter(cutoff)) {
                continue; // Chưa hết timeout
            }
            if (group.getSubOrders() == null || group.getSubOrders().isEmpty()) {
                logger.info("[AbandonedPaymentCleanup] Xóa OrderGroup rỗng: {}", group.getGroupCode());
                orderGroupRepository.delete(group);
            }
        }
    }
}
