package org.example.agrimarket.controller;

import org.example.agrimarket.dto.CartItemAddRequest;
import org.example.agrimarket.dto.CartItemResponse;
import org.example.agrimarket.dto.CartItemUpdateRequest;
import org.example.agrimarket.service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private CartService cartService;

    @GetMapping
    public ResponseEntity<?> getCart(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        List<CartItemResponse> cart = cartService.getCart(principal.getName());
        return ResponseEntity.ok(cart);
    }

    @PostMapping("/add")
    public ResponseEntity<?> addToCart(Principal principal, @RequestBody CartItemAddRequest request) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        if (request.getProductId() == null || request.getQuantity() == null || request.getQuantity() <= 0) {
            return ResponseEntity.badRequest().body("Thông tin sản phẩm hoặc số lượng không hợp lệ.");
        }
        try {
            List<CartItemResponse> cart = cartService.addToCart(
                    principal.getName(),
                    request.getProductId(),
                    request.getQuantity(),
                    request.getLivestreamPrice(),
                    request.getLivestreamId()
            );
            return ResponseEntity.ok(cart);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/update")
    public ResponseEntity<?> updateCartItem(Principal principal, @RequestBody CartItemUpdateRequest request) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        if (request.getProductId() == null) {
            return ResponseEntity.badRequest().body("ProductId không thể bỏ trống.");
        }
        try {
            List<CartItemResponse> cart = cartService.updateCartItem(
                    principal.getName(),
                    request.getProductId(),
                    request.getQuantity(),
                    request.getChecked()
            );
            return ResponseEntity.ok(cart);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/remove/{productId}")
    public ResponseEntity<?> removeFromCart(Principal principal, @PathVariable Long productId) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        List<CartItemResponse> cart = cartService.removeFromCart(principal.getName(), productId);
        return ResponseEntity.ok(cart);
    }

    @DeleteMapping("/clear")
    public ResponseEntity<?> clearCart(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        List<CartItemResponse> cart = cartService.clearCart(principal.getName());
        return ResponseEntity.ok(cart);
    }

    @PostMapping("/sync")
    public ResponseEntity<?> syncCart(Principal principal, @RequestBody List<CartItemAddRequest> guestItems) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        if (guestItems == null) {
            return ResponseEntity.badRequest().body("Danh sách đồng bộ trống.");
        }
        List<CartItemResponse> cart = cartService.syncCart(principal.getName(), guestItems);
        return ResponseEntity.ok(cart);
    }

    @PutMapping("/bulk-check")
    public ResponseEntity<?> bulkCheck(Principal principal, @RequestBody Map<String, Object> payload) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        try {
            List<Long> productIds = ((List<?>) payload.get("productIds"))
                    .stream().map(id -> Long.valueOf(id.toString())).collect(java.util.stream.Collectors.toList());
            boolean checked = Boolean.parseBoolean(payload.get("checked").toString());
            cartService.bulkUpdateChecked(principal.getName(), productIds, checked);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }
}

