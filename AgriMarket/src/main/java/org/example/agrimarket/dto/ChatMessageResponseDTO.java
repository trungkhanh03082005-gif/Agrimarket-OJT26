package org.example.agrimarket.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChatMessageResponseDTO {
    private String id;
    private Long senderId;
    private String sender;
    private String type;
    private String text;
    private String mediaUrl;
    private String time;
    private Long timestamp;
    
    private String fileName;
    private String fileSize;
    
    private String locationName;
    private String mapUrl;
    
    private String contactName;
    private String contactPhone;
    private String phone; // for farmer-side contact card compatibility
    private String contactAvatar;
}
