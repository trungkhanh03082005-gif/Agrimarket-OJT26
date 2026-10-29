package org.example.agrimarket.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupportMessageResponseDTO {
    private Long id;
    private Long supportRequestId;
    private Long senderId;
    private String senderName;
    private String senderRole; // "customer", "admin"
    private String content;
    private LocalDateTime createdAt;
}
