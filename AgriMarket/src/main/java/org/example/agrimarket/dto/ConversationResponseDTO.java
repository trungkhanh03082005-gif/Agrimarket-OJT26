package org.example.agrimarket.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class ConversationResponseDTO {
    private String id;
    private String name;
    private String avatar;
    private String phone;
    private String farmAddress;
    private String activeState;
    private Boolean isOnline;
    private Long unreadCount;
    private Boolean isPinned;
    private Boolean isMuted;
    private Boolean isBlocked;
    private String type;
    private String description;
    private String blockedBy;
    private String partnerId;
    private String memberLevel;
    private String joinedDate;
    private Long completedOrdersCount;
    private List<ChatMessageResponseDTO> messages;
    private List<String> mediaImages;
}
