package org.example.agrimarket.service;

import org.example.agrimarket.dto.CreateSupportRequestDTO;
import org.example.agrimarket.dto.SupportRequestResponseDTO;
import org.example.agrimarket.dto.UpdateSupportRequestStatusDTO;
import org.example.agrimarket.model.SupportRequest;
import org.example.agrimarket.model.User;
import org.example.agrimarket.repository.SupportRequestRepository;
import org.example.agrimarket.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class SupportRequestService {

    @Autowired
    private SupportRequestRepository supportRequestRepository;

    @Autowired
    private UserRepository userRepository;

    public SupportRequestResponseDTO createRequest(String email, CreateSupportRequestDTO dto) {
        User sender = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin tài khoản người dùng"));

        SupportRequest request = SupportRequest.builder()
                .sender(sender)
                .category(dto.getCategory())
                .orderCode(dto.getOrderCode())
                .title(dto.getTitle())
                .description(dto.getDescription())
                .attachmentUrl(dto.getAttachmentUrl())
                .status("pending")
                .build();

        SupportRequest saved = supportRequestRepository.save(request);
        return convertToResponseDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<SupportRequestResponseDTO> getRequestsForUser(String email) {
        User sender = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin tài khoản người dùng"));

        return supportRequestRepository.findBySenderIdOrderByCreatedAtDesc(sender.getId())
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SupportRequestResponseDTO> getRequestsForUserAndStatus(String email, String status) {
        User sender = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin tài khoản người dùng"));

        return supportRequestRepository.findBySenderIdAndStatusOrderByCreatedAtDesc(sender.getId(), status)
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SupportRequestResponseDTO getRequestById(Long id, String email, String role) {
        SupportRequest request = supportRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu hỗ trợ"));

        // Check permission: only sender or admin can view
        if (!"admin".equalsIgnoreCase(role) && !request.getSender().getEmail().equalsIgnoreCase(email)) {
            throw new RuntimeException("Bạn không có quyền truy cập yêu cầu này");
        }

        return convertToResponseDTO(request);
    }

    @Transactional(readOnly = true)
    public List<SupportRequestResponseDTO> getAllRequestsForAdmin(String status) {
        List<SupportRequest> requests;
        if (status == null || status.trim().isEmpty() || "all".equalsIgnoreCase(status)) {
            requests = supportRequestRepository.findAllByOrderByCreatedAtDesc();
        } else {
            requests = supportRequestRepository.findByStatusOrderByCreatedAtDesc(status);
        }

        return requests.stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public org.example.agrimarket.dto.PageResponse<SupportRequestResponseDTO> getAllRequestsForAdminPaged(int page, int size, String status, String search) {
        org.springframework.data.domain.PageRequest pageable = org.springframework.data.domain.PageRequest.of(page, size);
        String cleanStatus = (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) ? status.trim() : null;
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        org.springframework.data.domain.Page<SupportRequest> requestPage = supportRequestRepository.findAllPagedAdmin(cleanStatus, cleanSearch, pageable);
        List<SupportRequestResponseDTO> content = requestPage.getContent().stream().map(this::convertToResponseDTO).collect(Collectors.toList());

        return org.example.agrimarket.dto.PageResponse.of(content, requestPage);
    }

    public SupportRequestResponseDTO updateRequestStatus(Long id, UpdateSupportRequestStatusDTO dto) {
        SupportRequest request = supportRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu hỗ trợ"));

        String currentStatus = request.getStatus() != null ? request.getStatus().toLowerCase() : "pending";
        String newStatus = dto.getStatus() != null ? dto.getStatus().toLowerCase() : "pending";

        if (!currentStatus.equals(newStatus)) {
            if ("resolved".equals(currentStatus) || "rejected".equals(currentStatus)) {
                throw new RuntimeException("Yêu cầu hỗ trợ đã kết thúc, không thể thay đổi trạng thái");
            }
            if ("processing".equals(currentStatus) && "pending".equals(newStatus)) {
                throw new RuntimeException("Không thể chuyển trạng thái từ Đang xử lý về Chờ duyệt");
            }
        }

        request.setStatus(dto.getStatus());
        request.setAdminNotes(dto.getAdminNotes());
        
        SupportRequest updated = supportRequestRepository.save(request);
        return convertToResponseDTO(updated);
    }

    public SupportRequestResponseDTO convertToResponseDTO(SupportRequest req) {
        return SupportRequestResponseDTO.builder()
                .id(req.getId())
                .senderId(req.getSender().getId())
                .senderName(req.getSender().getFullName())
                .senderEmail(req.getSender().getEmail())
                .category(req.getCategory())
                .orderCode(req.getOrderCode())
                .title(req.getTitle())
                .description(req.getDescription())
                .attachmentUrl(req.getAttachmentUrl())
                .status(req.getStatus())
                .adminNotes(req.getAdminNotes())
                .createdAt(req.getCreatedAt())
                .updatedAt(req.getUpdatedAt())
                .build();
    }
}
