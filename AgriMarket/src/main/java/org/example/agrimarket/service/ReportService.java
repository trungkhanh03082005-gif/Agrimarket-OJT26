package org.example.agrimarket.service;

import org.example.agrimarket.dto.CreateReportDTO;
import org.example.agrimarket.dto.ReportResponseDTO;
import org.example.agrimarket.model.Report;
import org.example.agrimarket.model.User;
import org.example.agrimarket.repository.ReportRepository;
import org.example.agrimarket.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReportService {

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Tạo báo cáo vi phạm mới. reporterId được lấy từ email của người dùng đang đăng nhập.
     */
    public ReportResponseDTO createReport(String email, CreateReportDTO dto) {
        if (dto.getTargetType() == null || dto.getTargetType().isBlank()) {
            throw new RuntimeException("Vui lòng chọn loại đối tượng cần báo cáo");
        }
        if (dto.getTargetId() == null) {
            throw new RuntimeException("Vui lòng nhập ID đối tượng cần báo cáo");
        }
        if (dto.getReason() == null || dto.getReason().isBlank()) {
            throw new RuntimeException("Vui lòng chọn lý do báo cáo");
        }
        if (dto.getDescription() == null || dto.getDescription().trim().length() < 20) {
            throw new RuntimeException("Nội dung mô tả cần có ít nhất 20 ký tự");
        }

        User reporter = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin tài khoản người dùng"));

        Report report = Report.builder()
                .reporter(reporter)
                .targetType(dto.getTargetType().toLowerCase())
                .targetId(dto.getTargetId())
                .reason(dto.getReason())
                .description(dto.getDescription())
                .status("pending")
                .build();

        Report saved = reportRepository.save(report);
        return convertToResponseDTO(saved);
    }

    /**
     * Lấy danh sách báo cáo của người dùng hiện tại.
     */
    @Transactional(readOnly = true)
    public List<ReportResponseDTO> getMyReports(String email) {
        User reporter = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin tài khoản người dùng"));

        return reportRepository.findByReporterIdOrderByCreatedAtDesc(reporter.getId())
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Lấy danh sách báo cáo của người dùng hiện tại theo trạng thái.
     */
    @Transactional(readOnly = true)
    public List<ReportResponseDTO> getMyReportsByStatus(String email, String status) {
        User reporter = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin tài khoản người dùng"));

        return reportRepository.findByReporterIdAndStatusOrderByCreatedAtDesc(reporter.getId(), status)
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * [Admin] Lấy tất cả báo cáo, có thể lọc theo status.
     */
    @Transactional(readOnly = true)
    public List<ReportResponseDTO> getAllReports(String status) {
        List<Report> reports;
        if (status == null || status.isBlank() || "all".equalsIgnoreCase(status)) {
            reports = reportRepository.findAllByOrderByCreatedAtDesc();
        } else {
            reports = reportRepository.findByStatusOrderByCreatedAtDesc(status);
        }
        return reports.stream().map(this::convertToResponseDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public org.example.agrimarket.dto.PageResponse<ReportResponseDTO> getAllReportsPaged(int page, int size, String status, String targetType, String search) {
        org.springframework.data.domain.PageRequest pageable = org.springframework.data.domain.PageRequest.of(page, size);
        String cleanStatus = (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) ? status.trim() : null;
        String cleanTargetType = (targetType != null && !targetType.isBlank() && !"all".equalsIgnoreCase(targetType)) ? targetType.trim() : null;
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        org.springframework.data.domain.Page<Report> reportPage = reportRepository.findAllPagedAdmin(cleanStatus, cleanTargetType, cleanSearch, pageable);
        List<ReportResponseDTO> content = reportPage.getContent().stream().map(this::convertToResponseDTO).collect(Collectors.toList());

        return org.example.agrimarket.dto.PageResponse.of(content, reportPage);
    }

    /**
     * [Admin] Cập nhật trạng thái báo cáo và ghi chú admin.
     */
    public ReportResponseDTO updateReportStatus(Long id, String status, String adminNotes) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy báo cáo với ID: " + id));

        if (status != null && !status.isBlank()) {
            report.setStatus(status.toLowerCase());
        }
        if (adminNotes != null) {
            report.setAdminNotes(adminNotes);
        }

        Report updated = reportRepository.save(report);
        return convertToResponseDTO(updated);
    }

    private ReportResponseDTO convertToResponseDTO(Report r) {
        return ReportResponseDTO.builder()
                .id(r.getId())
                .reporterId(r.getReporter().getId())
                .reporterName(r.getReporter().getFullName())
                .reporterEmail(r.getReporter().getEmail())
                .targetType(r.getTargetType())
                .targetId(r.getTargetId())
                .reason(r.getReason())
                .description(r.getDescription())
                .status(r.getStatus())
                .adminNotes(r.getAdminNotes())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}
