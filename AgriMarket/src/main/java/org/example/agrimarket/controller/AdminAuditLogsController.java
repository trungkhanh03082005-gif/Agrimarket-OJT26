package org.example.agrimarket.controller;

import org.example.agrimarket.model.Order;
import org.example.agrimarket.model.Product;
import org.example.agrimarket.repository.OrderRepository;
import org.example.agrimarket.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/audit-logs")
public class AdminAuditLogsController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @GetMapping
    public ResponseEntity<?> getAuditLogs(
            @RequestParam String targetType,
            @RequestParam String targetId) {

        List<Map<String, Object>> logs = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        if ("PRODUCT".equalsIgnoreCase(targetType)) {
            try {
                Long productId = Long.parseLong(targetId);
                Product product = productRepository.findById(productId).orElse(null);
                if (product != null) {
                    // 1. Initial submission log
                    String submitTimeStr = product.getCreatedAt() != null 
                            ? product.getCreatedAt().format(formatter) 
                            : "12/06/2026 08:00";
                    
                    Map<String, Object> log1 = new HashMap<>();
                    log1.put("id", 1L);
                    log1.put("actionType", "PRODUCT_SUBMITTED");
                    log1.put("actorName", product.getFarmer() != null ? product.getFarmer().getFullName() : "Nông dân");
                    log1.put("createdAt", submitTimeStr);
                    log1.put("remarks", "Nông dân đã gửi yêu cầu duyệt sản phẩm.");
                    logs.add(log1);

                    // 2. State-based log
                    String status = product.getStatus();
                    if ("approved".equalsIgnoreCase(status)) {
                        Map<String, Object> log2 = new HashMap<>();
                        log2.put("id", 2L);
                        log2.put("actionType", "PRODUCT_APPROVED");
                        log2.put("actorName", "Quản trị viên");
                        log2.put("createdAt", submitTimeStr);
                        log2.put("remarks", "Quản trị viên đã phê duyệt sản phẩm công khai.");
                        logs.add(log2);
                    } else if ("rejected".equalsIgnoreCase(status)) {
                        Map<String, Object> log2 = new HashMap<>();
                        log2.put("id", 2L);
                        log2.put("actionType", "PRODUCT_REJECTED");
                        log2.put("actorName", "Quản trị viên");
                        log2.put("createdAt", submitTimeStr);
                        String reason = product.getRejectionReason() != null ? product.getRejectionReason() : "Chất lượng hình ảnh/thông tin chưa đạt yêu cầu.";
                        log2.put("remarks", "Quản trị viên từ chối phê duyệt. Lý do: " + reason);
                        logs.add(log2);
                    } else if ("request_changes".equalsIgnoreCase(status)) {
                        Map<String, Object> log2 = new HashMap<>();
                        log2.put("id", 2L);
                        log2.put("actionType", "PRODUCT_CHANGES_REQUESTED");
                        log2.put("actorName", "Quản trị viên");
                        log2.put("createdAt", submitTimeStr);
                        String notes = product.getAdminNotes() != null ? product.getAdminNotes() : "Cần bổ sung giấy chứng nhận hoặc chỉnh sửa mô tả.";
                        log2.put("remarks", "Quản trị viên yêu cầu sửa đổi thông tin: " + notes);
                        logs.add(log2);
                    }
                }
            } catch (Exception e) {
                // Ignore parsing errors
            }
        } else if ("ORDER".equalsIgnoreCase(targetType)) {
            try {
                Order order = orderRepository.findByOrderCode(targetId).orElse(null);
                if (order != null) {
                    String orderTimeStr = order.getCreatedAt() != null 
                            ? order.getCreatedAt().format(formatter) 
                            : "12/06/2026 09:30";

                    Map<String, Object> log1 = new HashMap<>();
                    log1.put("id", 101L);
                    log1.put("actionType", "ORDER_CREATED");
                    log1.put("actorName", order.getCustomer() != null ? order.getCustomer().getFullName() : "Khách hàng");
                    log1.put("createdAt", orderTimeStr);
                    log1.put("remarks", "Khách hàng đã tạo đơn hàng mới trên hệ thống.");
                    logs.add(log1);

                    String status = order.getStatus();
                    if ("confirmed".equalsIgnoreCase(status) || "preparing".equalsIgnoreCase(status) 
                            || "shipping".equalsIgnoreCase(status) || "delivered".equalsIgnoreCase(status)) {
                        Map<String, Object> log2 = new HashMap<>();
                        log2.put("id", 102L);
                        log2.put("actionType", "ORDER_CONFIRMED");
                        log2.put("actorName", "Hệ thống");
                        log2.put("createdAt", orderTimeStr);
                        log2.put("remarks", "Đơn hàng đã được xác nhận thanh toán/chấp nhận.");
                        logs.add(log2);
                    }

                    if ("preparing".equalsIgnoreCase(status) || "shipping".equalsIgnoreCase(status) 
                            || "delivered".equalsIgnoreCase(status)) {
                        Map<String, Object> log3 = new HashMap<>();
                        log3.put("id", 103L);
                        log3.put("actionType", "ORDER_PREPARING");
                        log3.put("actorName", "Nhà vườn");
                        log3.put("createdAt", orderTimeStr);
                        log3.put("remarks", "Nhà vườn đang đóng gói và chuẩn bị gửi hàng.");
                        logs.add(log3);
                    }

                    if ("shipping".equalsIgnoreCase(status) || "delivered".equalsIgnoreCase(status)) {
                        Map<String, Object> log4 = new HashMap<>();
                        log4.put("id", 104L);
                        log4.put("actionType", "ORDER_SHIPPING");
                        log4.put("actorName", "Đối tác giao hàng");
                        log4.put("createdAt", orderTimeStr);
                        log4.put("remarks", "Đơn vị vận chuyển đã nhận hàng và đang tiến hành giao.");
                        logs.add(log4);
                    }

                    if ("delivered".equalsIgnoreCase(status)) {
                        Map<String, Object> log5 = new HashMap<>();
                        log5.put("id", 105L);
                        log5.put("actionType", "ORDER_DELIVERED");
                        log5.put("actorName", "Đối tác giao hàng");
                        log5.put("createdAt", orderTimeStr);
                        log5.put("remarks", "Giao hàng thành công đến tay người nhận.");
                        logs.add(log5);
                    }

                    if ("cancelled".equalsIgnoreCase(status)) {
                        Map<String, Object> logC = new HashMap<>();
                        logC.put("id", 106L);
                        logC.put("actionType", "ORDER_CANCELLED");
                        logC.put("actorName", "Quản trị viên / Khách hàng");
                        logC.put("createdAt", orderTimeStr);
                        String reason = order.getCancelReason() != null ? order.getCancelReason() : "Khách hàng hủy đơn hàng.";
                        logC.put("remarks", "Đơn hàng đã bị hủy. Lý do: " + reason);
                        logs.add(logC);
                    }

                    if ("rejected".equalsIgnoreCase(status)) {
                        Map<String, Object> logR = new HashMap<>();
                        logR.put("id", 107L);
                        logR.put("actionType", "ORDER_REJECTED");
                        logR.put("actorName", "Nhà vườn / Quản trị viên");
                        logR.put("createdAt", orderTimeStr);
                        String reason = order.getCancelReason() != null ? order.getCancelReason() : "Hết hàng hoặc sự cố vận chuyển.";
                        logR.put("remarks", "Đơn hàng bị từ chối phục vụ. Lý do: " + reason);
                        logs.add(logR);
                    }
                }
            } catch (Exception e) {
                // Ignore errors
            }
        }

        return ResponseEntity.ok(logs);
    }
}
