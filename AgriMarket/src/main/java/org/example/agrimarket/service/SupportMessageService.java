package org.example.agrimarket.service;

import org.example.agrimarket.dto.SupportMessageResponseDTO;
import org.example.agrimarket.dto.SendSupportMessageDTO;
import org.example.agrimarket.model.SupportMessage;
import org.example.agrimarket.model.SupportRequest;
import org.example.agrimarket.model.User;
import org.example.agrimarket.repository.SupportMessageRepository;
import org.example.agrimarket.repository.SupportRequestRepository;
import org.example.agrimarket.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class SupportMessageService {

    @Autowired
    private SupportMessageRepository supportMessageRepository;

    @Autowired
    private SupportRequestRepository supportRequestRepository;

    @Autowired
    private UserRepository userRepository;

    public SupportMessageResponseDTO sendMessage(Long requestId, String email, String senderRole, SendSupportMessageDTO dto) {
        SupportRequest request = supportRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu hỗ trợ"));

        User sender = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản người gửi"));

        // Phân quyền gửi tin nhắn:
        // Khách hàng chỉ được gửi tin nhắn trong phiếu của chính mình.
        if ("customer".equalsIgnoreCase(senderRole) && !request.getSender().getEmail().equalsIgnoreCase(email)) {
            throw new RuntimeException("Bạn không có quyền gửi tin nhắn trong yêu cầu hỗ trợ này");
        }

        SupportMessage message = SupportMessage.builder()
                .supportRequest(request)
                .sender(sender)
                .senderName(sender.getFullName())
                .senderRole(senderRole)
                .content(dto.getContent())
                .build();

        SupportMessage saved = supportMessageRepository.save(message);
        return convertToResponseDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<SupportMessageResponseDTO> getMessages(Long requestId, String email, String userRole) {
        SupportRequest request = supportRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu hỗ trợ"));

        // Phân quyền xem tin nhắn:
        // Khách hàng chỉ được xem cuộc trò chuyện của chính mình.
        if (!"admin".equalsIgnoreCase(userRole) && !request.getSender().getEmail().equalsIgnoreCase(email)) {
            throw new RuntimeException("Bạn không có quyền xem cuộc trò chuyện này");
        }

        return supportMessageRepository.findBySupportRequestIdOrderByCreatedAtAsc(requestId)
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    private SupportMessageResponseDTO convertToResponseDTO(SupportMessage msg) {
        return SupportMessageResponseDTO.builder()
                .id(msg.getId())
                .supportRequestId(msg.getSupportRequest().getId())
                .senderId(msg.getSender().getId())
                .senderName(msg.getSenderName())
                .senderRole(msg.getSenderRole())
                .content(msg.getContent())
                .createdAt(msg.getCreatedAt())
                .build();
    }
}
