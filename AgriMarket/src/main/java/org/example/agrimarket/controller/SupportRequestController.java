package org.example.agrimarket.controller;

import org.example.agrimarket.dto.CreateSupportRequestDTO;
import org.example.agrimarket.dto.SupportRequestResponseDTO;
import org.example.agrimarket.dto.UpdateSupportRequestStatusDTO;
import org.example.agrimarket.service.SupportRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/support-requests")
public class SupportRequestController {

    @Autowired
    private SupportRequestService supportRequestService;

    @PostMapping
    public ResponseEntity<?> createRequest(@RequestBody CreateSupportRequestDTO dto, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập để gửi yêu cầu hỗ trợ");
        }
        try {
            SupportRequestResponseDTO response = supportRequestService.createRequest(principal.getName(), dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> getMyRequests(@RequestParam(value = "status", required = false) String status, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }
        try {
            List<SupportRequestResponseDTO> response;
            if (status != null && !status.trim().isEmpty() && !"all".equalsIgnoreCase(status)) {
                response = supportRequestService.getRequestsForUserAndStatus(principal.getName(), status);
            } else {
                response = supportRequestService.getRequestsForUser(principal.getName());
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRequestById(@PathVariable Long id, Principal principal, Authentication authentication) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }
        try {
            String role = "user";
            if (authentication != null && authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                role = "admin";
            }
            SupportRequestResponseDTO response = supportRequestService.getRequestById(id, principal.getName(), role);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Admin APIs
    @GetMapping("/admin")
    public ResponseEntity<?> getAdminRequests(@RequestParam(value = "status", required = false) String status, Authentication authentication) {
        if (authentication == null || authentication.getAuthorities().stream()
                .noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không có quyền thực hiện hành động này");
        }
        try {
            List<SupportRequestResponseDTO> response = supportRequestService.getAllRequestsForAdmin(status);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/admin/paged")
    public ResponseEntity<?> getAdminRequestsPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            Authentication authentication) {
        if (authentication == null || authentication.getAuthorities().stream()
                .noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không có quyền thực hiện hành động này");
        }
        try {
            return ResponseEntity.ok(supportRequestService.getAllRequestsForAdminPaged(page, size, status, search));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/admin/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody UpdateSupportRequestStatusDTO dto, Authentication authentication) {
        if (authentication == null || authentication.getAuthorities().stream()
                .noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không có quyền thực hiện hành động này");
        }
        try {
            SupportRequestResponseDTO response = supportRequestService.updateRequestStatus(id, dto);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
