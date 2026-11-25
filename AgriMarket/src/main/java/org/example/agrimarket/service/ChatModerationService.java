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
    private final ToxicityFilterService toxicityFilterService;

    public ChatModerationService(
            RestClient.Builder restClientBuilder,
            @Value("${app.moderation.url:http://localhost:8000}") String moderationUrl,
            ToxicityFilterService toxicityFilterService) {
        this.restClient = restClientBuilder.baseUrl(moderationUrl).build();
        this.toxicityFilterService = toxicityFilterService;
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
            validateWithLocalFilter(content);
            System.err.println(">>> Chat moderation worker unavailable; using local fallback: "
                    + exception.getMessage());
            return;
        }

        if (result == null) {
            validateWithLocalFilter(content);
            return;
        }

        if (result.flagged()) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Tin nhắn có nội dung không phù hợp nên chưa được gửi.");
        }
    }

    private void validateWithLocalFilter(String content) {
        String violation = toxicityFilterService.checkLocalFilter(content);
        if ("TOXIC".equals(violation) || "REDIRECT".equals(violation)) {
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
