
package org.example.agrimarket.scheduler;

import org.example.agrimarket.model.Notification;
import org.example.agrimarket.repository.NotificationRepository;
import java.time.LocalDateTime;

import org.example.agrimarket.model.Order;
import org.example.agrimarket.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConditionalOnProperty(name = "ghn.simulation.enabled", havingValue = "true", matchIfMissing = false)
public class GhnSimulationScheduler {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Scheduled(fixedRate = 20000) // Runs every 20 seconds
    public void simulateShippingProgress() {
        try {
            List<Order> shippingOrders = orderRepository.findByStatusIgnoreCase("shipping");

            for (Order order : shippingOrders) {
                String address = order.getOrderGroup() != null ? order.getOrderGroup().getDeliveryAddress() : "";
                boolean isPickup = address != null
                        && (address.toLowerCase().contains("tự nhận") || address.toLowerCase().contains("nông trại"));
                if (isPickup) {
                    continue; // Skip pickup orders
                }
                String currentDetail = order.getDetailedStatus();
                if (currentDetail == null || "assigned".equalsIgnoreCase(currentDetail)) {
                    order.setDetailedStatus("picked_up");
                    order.setShipperNotes("GiaoHangNhanh: Nhân viên GHN đã đến lấy hàng từ nhà vườn thành công.");
                    orderRepository.save(order);
                    System.out.println("GHN Simulator: Order " + order.getOrderCode() + " transitioned to picked_up.");
                } else if ("picked_up".equalsIgnoreCase(currentDetail)) {
                    order.setDetailedStatus("in_transit");
                    order.setShipperNotes("GiaoHangNhanh: Đơn hàng đang được trung chuyển giữa các kho GHN.");
                    orderRepository.save(order);
                    System.out.println("GHN Simulator: Order " + order.getOrderCode() + " transitioned to in_transit.");
                } else if ("in_transit".equalsIgnoreCase(currentDetail)) {
                    order.setDetailedStatus("delivered");
                    order.setStatus("delivered");
                    order.setPaymentStatus("paid");
                    order.setShipperNotes(
                            "GiaoHangNhanh: Giao hàng thành công. Người mua đã nhận hàng và hoàn tất thanh toán COD.");
                    order.setPodPhoto("https://images.unsplash.com/photo-1551829142-d9b812de399c?w=400"); // Mock POD
                                                                                                          // photo
                    orderRepository.save(order);
                    System.out.println(
                            "GHN Simulator: Order " + order.getOrderCode() + " transitioned to delivered (completed).");

                    // Create notification for customer
                    try {
                        if (order.getCustomer() != null) {
                            Notification notif = Notification.builder()
                                    .receiverType("customer")
                                    .receiverId(order.getCustomer().getId())
                                    .title("Đơn hàng giao thành công!")
                                    .content("Đơn hàng " + order.getOrderCode()
                                            + " của bạn đã được giao thành công. Nhấn vào đây để xem chi tiết đơn hàng!")
                                    .link("/profile/orders?code=" + order.getOrderCode())
                                    .createdAt(LocalDateTime.now())
                                    .isRead(false)
                                    .build();
                            notificationRepository.save(notif);
                        }
                    } catch (Exception e) {
                        System.err.println("Lỗi gửi thông báo giao hàng: " + e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Lỗi trong GHN Simulation Scheduler: " + e.getMessage());
        }
    }
}
