package org.example.agrimarket.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ChatModerationService {

    private final RestClient restClient;

    public ChatModerationService(
            RestClient.Builder restClientBuilder,
            @Value("${app.moderation.url:http://localhost:8000}") String moderationUrl) {
        this.restClient = restClientBuilder.baseUrl(moderationUrl).build();
    }

    public void validateMessage(String content) {
        ModerationResult result;
        try {
            result = restClient.post()
                    .uri("/moderation/chat-text")
                    .body(new ModerationRequest(content))
                    .retrieve()
                    .body(ModerationResult.class);
        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Dịch vụ kiểm duyệt nội dung hiện không khả dụng. Tin nhắn chưa được gửi.",
                    exception);
        }

        if (result == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Dịch vụ kiểm duyệt trả về kết quả không hợp lệ. Tin nhắn chưa được gửi.");
        }

        if (result.flagged()) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Tin nhắn có nội dung không phù hợp nên chưa được gửi.");
        }
    }

    private record ModerationRequest(String text) {
    }

    private record ModerationResult(boolean flagged, String reason) {
    }
}
