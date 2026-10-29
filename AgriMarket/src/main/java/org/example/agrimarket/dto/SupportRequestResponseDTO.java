package org.example.agrimarket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportRequestResponseDTO {
    private Long id;
    private Long senderId;
    private String senderName;
    private String senderEmail;
    private String category;
    private String orderCode;
    private String title;
    private String description;
    private String attachmentUrl;
    private String status;
    private String adminNotes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
