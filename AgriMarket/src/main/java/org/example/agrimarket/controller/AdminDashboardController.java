package org.example.agrimarket.controller;

import org.example.agrimarket.dto.AdminDashboardResponse;
import org.example.agrimarket.service.AdminDashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    @Autowired
    private AdminDashboardService adminDashboardService;

    /**
     * GET /api/admin/dashboard?range=7days
     * Retrieve admin dashboard statistics.
     */
    @GetMapping
    public ResponseEntity<?> getDashboardStats(
            @RequestParam(defaultValue = "7days") String range,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getAuthorities().stream()
                .noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return ResponseEntity.status(403).body("Bạn không có quyền thực hiện hành động này");
        }

        try {
            AdminDashboardResponse response = adminDashboardService.getDashboardStats(range);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
}
