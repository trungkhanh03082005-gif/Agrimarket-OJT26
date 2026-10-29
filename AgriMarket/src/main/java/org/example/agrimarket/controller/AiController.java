package org.example.agrimarket.controller;

import org.example.agrimarket.dto.AiChatRequest;
import org.example.agrimarket.dto.AiChatResponse;
import org.example.agrimarket.dto.AiDescriptionRequest;
import org.example.agrimarket.dto.AiDescriptionResponse;
import org.example.agrimarket.dto.AiPriceRequest;
import org.example.agrimarket.dto.AiPriceResponse;
import org.example.agrimarket.dto.ImageSearchDTO;
import org.example.agrimarket.service.AiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Autowired
    private AiService aiService;

    @PostMapping("/generate-description")
    public ResponseEntity<?> generateDescription(Principal principal, @RequestBody AiDescriptionRequest request) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Unauthorized: Vui lòng đăng nhập.");
        }

        try {
            String description = aiService.generateProductDescription(
                    request.getProductName(),
                    request.getCategory(),
                    request.getHarvestDate(),
                    request.getExpirationDate(),
                    principal.getName()
            );
            return ResponseEntity.ok(new AiDescriptionResponse(description));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi khi sinh mô tả tự động: " + e.getMessage());
        }
    }

    @PostMapping("/suggest-price")
    public ResponseEntity<?> suggestPrice(Principal principal, @RequestBody AiPriceRequest request) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Unauthorized: Vui lòng đăng nhập.");
        }

        try {
            AiPriceResponse priceResponse = aiService.suggestProductPrice(
                    request.getProductName(),
                    request.getCategory(),
                    request.getUnit(),
                    request.getHarvestDate(),
                    request.getExpirationDate(),
                    principal.getName()
            );
            return ResponseEntity.ok(priceResponse);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi khi sinh gợi ý giá bán: " + e.getMessage());
        }
    }

    /**
     * AgriBot Chat – Endpoint công khai (không cần đăng nhập).
     * Hỗ trợ multi-turn conversation thông qua history.
     */
    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody AiChatRequest request) {
        try {
            String message = request.getMessage();
            List<Map<String, String>> history = request.getHistory() != null ? request.getHistory() : Collections.emptyList();

            String reply = aiService.chat(message, history);
            return ResponseEntity.ok(new AiChatResponse(reply));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(
                new AiChatResponse("Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại! 🙏")
            );
        }
    }

    /**
     * AI Voice Search – Endpoint công khai phân tích giọng nói người dùng.
     */
    @PostMapping("/voice-search")
    public ResponseEntity<?> voiceSearch(@RequestBody org.example.agrimarket.dto.VoiceSearchDTO.Request request) {
        try {
            org.example.agrimarket.dto.VoiceSearchDTO.Response response = aiService.parseVoiceSearch(request.getTranscript());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi khi bóc tách tìm kiếm giọng nói: " + e.getMessage());
        }
    }

    /**
     * AI Image Search – Endpoint công khai nhận diện nông sản bằng hình ảnh.
     */
    @PostMapping("/image-search")
    public ResponseEntity<?> imageSearch(@RequestBody ImageSearchDTO.Request request) {
        try {
            ImageSearchDTO.Response response = aiService.parseImageSearch(request.getImageBase64(), request.getMimeType());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi khi bóc tách nhận diện hình ảnh: " + e.getMessage());
        }
    }
}
