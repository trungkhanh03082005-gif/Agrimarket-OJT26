package org.example.agrimarket.controller;

import org.example.agrimarket.dto.TransactionDTO;
import org.example.agrimarket.dto.TransactionPageResponse;
import org.example.agrimarket.service.AdminTransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin/transactions")
public class AdminTransactionController {

    @Autowired
    private AdminTransactionService adminTransactionService;

    /**
     * Lấy danh sách giao dịch có phân trang + bộ lọc.
     * GET /api/admin/transactions?keyword=&paymentMethod=all&status=all&fromDate=&toDate=&page=0&size=10
     */
    @GetMapping
    public ResponseEntity<?> getTransactions(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @RequestParam(required = false, defaultValue = "all") String paymentMethod,
            @RequestParam(required = false, defaultValue = "all") String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        try {
            LocalDateTime fromDt = (fromDate != null) ? fromDate.atStartOfDay() : null;
            LocalDateTime toDt = (toDate != null) ? toDate.plusDays(1).atStartOfDay() : null;

            TransactionPageResponse response = adminTransactionService.getTransactions(
                    keyword, paymentMethod, status, fromDt, toDt, page, size
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            return ResponseEntity.status(500).body(
                "Error: " + e.getMessage()
                + "\n\nCause: " + (e.getCause() != null ? e.getCause().getMessage() : "none")
                + "\n\nStack:\n" + sw
            );
        }
    }

    /**
     * Lấy chi tiết một giao dịch theo groupCode.
     * GET /api/admin/transactions/{groupCode}
     */
    @GetMapping("/{groupCode}")
    public ResponseEntity<?> getTransactionDetail(@PathVariable String groupCode) {
        try {
            // Gọi service hoặc repository trực tiếp cho chi tiết đơn lẻ
            return adminTransactionService.getTransactionByGroupCode(groupCode)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    /**
     * Xuất báo cáo CSV.
     * GET /api/admin/transactions/export
     */
    @GetMapping("/export")
    public void exportCsv(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @RequestParam(required = false, defaultValue = "all") String paymentMethod,
            @RequestParam(required = false, defaultValue = "all") String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            HttpServletResponse response
    ) throws IOException {
        LocalDateTime fromDt = (fromDate != null) ? fromDate.atStartOfDay() : null;
        LocalDateTime toDt = (toDate != null) ? toDate.plusDays(1).atStartOfDay() : null;

        List<TransactionDTO> list = adminTransactionService.getAllTransactionsForExport(
                keyword, paymentMethod, status, fromDt, toDt
        );

        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
        response.getOutputStream().write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});

        PrintWriter writer = response.getWriter();
        writer.println("Mã giao dịch,Mã đơn,Khách hàng,Email,Số tiền,Phương thức,Trạng thái,Thời gian");

        for (TransactionDTO dto : list) {
            writer.printf("\"%s\",\"%s\",\"%s\",\"%s\",%.0f,\"%s\",\"%s\",\"%s\"%n",
                    safe(dto.getTransactionCode()),
                    safe(dto.getOrderCode()),
                    safe(dto.getCustomerName()),
                    safe(dto.getCustomerEmail()),
                    dto.getAmount() != null ? dto.getAmount() : 0,
                    safe(dto.getPaymentMethod()),
                    safe(dto.getStatus()),
                    dto.getCreatedAt() != null ? dto.getCreatedAt().toString() : "");
        }

        writer.flush();
    }

    private String safe(String value) {
        return value != null ? value.replace("\"", "\"\"") : "";
    }
}
