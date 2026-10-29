package org.example.agrimarket.controller;

import org.example.agrimarket.dto.OrderCreateRequest;
import org.example.agrimarket.dto.OrderItemRequest;
import org.example.agrimarket.dto.OrderResponse;
import org.example.agrimarket.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    @Autowired
    private OrderService orderService;

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/paged")
    public ResponseEntity<?> getAllOrdersPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(orderService.getAllOrdersPaged(page, size, status, paymentStatus, search));
    }

    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> payload) {
        try {
            throw new RuntimeException("Quản trị viên không có quyền can thiệp vào các đơn hàng (không được phép tạo đơn).");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Đã xảy ra lỗi khi tạo đơn hàng: " + e.getMessage());
        }
    }

    @PutMapping("/{orderCode}/status")
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable String orderCode,
            @RequestBody Map<String, String> body) {
        try {
            String status = body.get("status");
            String paymentStatus = body.get("paymentStatus");
            String remarks = body.get("remarks");
            OrderResponse response = orderService.updateOrderStatusByAdmin(orderCode, status, paymentStatus, remarks);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi khi cập nhật trạng thái đơn hàng: " + e.getMessage());
        }
    }
}
