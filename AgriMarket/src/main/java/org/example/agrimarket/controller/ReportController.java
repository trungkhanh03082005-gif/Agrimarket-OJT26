package org.example.agrimarket.controller;

import org.example.agrimarket.dto.CreateReportDTO;
import org.example.agrimarket.dto.ReportResponseDTO;
import org.example.agrimarket.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    private ReportService reportService;

    /**
     * POST /api/reports
     * Người dùng gửi báo cáo vi phạm.
     */
    @PostMapping
    public ResponseEntity<?> createReport(@RequestBody CreateReportDTO dto, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập để gửi báo cáo");
        }
        try {
            ReportResponseDTO response = reportService.createReport(principal.getName(), dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * GET /api/reports/my?status=pending
     * Người dùng xem danh sách báo cáo của mình.
     */
    @GetMapping("/my")
    public ResponseEntity<?> getMyReports(
            @RequestParam(value = "status", required = false) String status,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }
        try {
            List<ReportResponseDTO> list;
            if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
                list = reportService.getMyReportsByStatus(principal.getName(), status);
            } else {
                list = reportService.getMyReports(principal.getName());
            }
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ─── Admin endpoints ─────────────────────────────────────────────────────

    /**
     * GET /api/reports/admin?status=pending
     * [Admin] Xem tất cả báo cáo, tuỳ chọn lọc theo trạng thái.
     */
    @GetMapping("/admin")
    public ResponseEntity<?> getAllReports(
            @RequestParam(value = "status", required = false) String status,
            Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không có quyền thực hiện hành động này");
        }
        try {
            List<ReportResponseDTO> list = reportService.getAllReports(status);
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/admin/paged")
    public ResponseEntity<?> getAllReportsPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String search,
            Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không có quyền thực hiện hành động này");
        }
        try {
            return ResponseEntity.ok(reportService.getAllReportsPaged(page, size, status, targetType, search));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * PUT /api/reports/admin/{id}/status
     * [Admin] Cập nhật trạng thái báo cáo.
     * Body: { "status": "resolved", "adminNotes": "..." }
     */
    @PutMapping("/admin/{id}/status")
    public ResponseEntity<?> updateReportStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không có quyền thực hiện hành động này");
        }
        try {
            String status = body.get("status");
            String adminNotes = body.get("adminNotes");
            ReportResponseDTO response = reportService.updateReportStatus(id, status, adminNotes);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
