package org.example.agrimarket.dto;

import lombok.Data;

@Data
public class SendMessageRequestDTO {
    private String content;
    private String type; // "text", "image", "file", "location", "contact"
    private String fileName;
    private String fileSize;
    private String locationName;
    private String mapUrl;
    private String contactName;
    private String contactPhone;
    private String contactAvatar;
}
