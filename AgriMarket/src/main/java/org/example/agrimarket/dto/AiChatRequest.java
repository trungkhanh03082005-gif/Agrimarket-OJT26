package org.example.agrimarket.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class AiChatRequest {
    /** Tin nhắn người dùng gửi hiện tại */
    private String message;

    /**
     * Lịch sử hội thoại trước đó để hỗ trợ multi-turn.
     * Mỗi phần tử có dạng: {"role": "user"|"model", "text": "..."}
     */
    private List<Map<String, String>> history;
}
