package org.example.agrimarket.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.example.agrimarket.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.Collections;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @GetMapping("/create-vnpay-payment")
    public ResponseEntity<?> createVNPayPayment(
            HttpServletRequest request,
            Principal principal,
            @RequestParam String orderCode,
            @RequestParam(required = false) String deliveryMode) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        try {
            String paymentUrl = paymentService.createVNPayPaymentUrl(request, orderCode, principal.getName(), deliveryMode);
            Map<String, String> response = new HashMap<>();
            response.put("paymentUrl", paymentUrl);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }


    @GetMapping("/vnpay-callback")
    public ResponseEntity<?> vnPayCallback(@RequestParam Map<String, String> queryParams) {
        try {
            Map<String, Object> result = paymentService.processVNPayCallback(queryParams);
            if ((Boolean) result.get("success")) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
            }
        } catch (Exception e) {
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("success", false);
            errorResult.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResult);
        }
    }
}
