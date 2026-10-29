package org.example.agrimarket.controller;

import org.example.agrimarket.dto.OrderCreateRequest;
import org.example.agrimarket.dto.OrderResponse;
import org.example.agrimarket.dto.PageResponse;
import org.example.agrimarket.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @PostMapping
    public ResponseEntity<?> createOrder(Principal principal, @RequestBody OrderCreateRequest request) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        try {
            OrderResponse order = orderService.createOrder(principal.getName(), request);
            return ResponseEntity.status(HttpStatus.CREATED).body(order);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> getCustomerOrders(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        try {
            List<OrderResponse> orders = orderService.getCustomerOrders(principal.getName());
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @GetMapping("/paged")
    public ResponseEntity<?> getCustomerOrdersPaged(
            Principal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        try {
            PageResponse<OrderResponse> orders = orderService.getCustomerOrdersPaged(principal.getName(), page, size, status);
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @GetMapping("/used-promotions")
    public ResponseEntity<?> getUsedPromotions(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        try {
            List<String> codes = orderService.getUsedPromotions(principal.getName());
            return ResponseEntity.ok(codes);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @GetMapping("/{orderCode}")
    public ResponseEntity<?> getOrderDetails(Principal principal, @PathVariable String orderCode) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        try {
            OrderResponse order = orderService.getOrderDetails(principal.getName(), orderCode);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PostMapping("/{orderCode}/cancel")
    public ResponseEntity<?> cancelOrder(Principal principal, @PathVariable String orderCode, @RequestBody(required = false) Map<String, String> body) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        String reason = "";
        if (body != null && body.containsKey("reason")) {
            reason = body.get("reason");
        }
        try {
            OrderResponse order = orderService.cancelOrder(principal.getName(), orderCode, reason);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/{orderCode}/confirm-payment")
    public ResponseEntity<?> confirmPayment(Principal principal, @PathVariable String orderCode, @RequestBody(required = false) Map<String, String> body) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        String paymentMethod = "";
        if (body != null && body.containsKey("paymentMethod")) {
            paymentMethod = body.get("paymentMethod");
        }
        try {
            OrderResponse order = orderService.confirmPayment(principal.getName(), orderCode, paymentMethod);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping("/farmer")
    public ResponseEntity<?> getFarmerOrders(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        try {
            List<OrderResponse> orders = orderService.getFarmerOrders(principal.getName());
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @GetMapping("/farmer/paged")
    public ResponseEntity<?> getFarmerOrdersPaged(
            Principal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        try {
            PageResponse<OrderResponse> orders = orderService.getFarmerOrdersPaged(principal.getName(), page, size, status);
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @PostMapping("/farmer/{orderCode}/status")
    public ResponseEntity<?> updateFarmerOrderStatus(Principal principal, @PathVariable String orderCode, @RequestBody Map<String, String> body) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        String status = body.get("status");
        String reason = body.get("reason");
        try {
            OrderResponse order = orderService.updateFarmerOrderStatus(principal.getName(), orderCode, status, reason);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/calculate-shipping-fee")
    public ResponseEntity<?> calculateShippingFee(@RequestBody Map<String, Object> payload) {
        try {
            String toAddress = (String) payload.get("toAddress");
            List<Integer> productIds = (List<Integer>) payload.get("productIds");
            if (toAddress == null || toAddress.isBlank() || productIds == null || productIds.isEmpty()) {
                return ResponseEntity.badRequest().body("Thiếu thông tin địa chỉ hoặc sản phẩm");
            }
            double totalFee = orderService.calculateTotalShippingFee(productIds, toAddress);
            return ResponseEntity.ok(Map.of("shippingFee", totalFee));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @PostMapping("/{orderCode}/received")
    public ResponseEntity<?> confirmOrderReceived(Principal principal, @PathVariable String orderCode) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        try {
            OrderResponse order = orderService.confirmOrderReceived(principal.getName(), orderCode);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

}
