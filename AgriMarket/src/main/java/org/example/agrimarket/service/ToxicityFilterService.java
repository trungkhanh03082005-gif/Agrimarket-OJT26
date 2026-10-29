package org.example.agrimarket.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.agrimarket.model.ChatViolationLog;
import org.example.agrimarket.model.Livestream;
import org.example.agrimarket.model.User;
import org.example.agrimarket.repository.ChatViolationLogRepository;
import org.example.agrimarket.repository.LivestreamCommentRepository;
import org.example.agrimarket.repository.LivestreamRepository;
import org.example.agrimarket.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.regex.Pattern;

@Service
public class ToxicityFilterService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChatViolationLogRepository chatViolationLogRepository;

    @Autowired
    private LivestreamCommentRepository livestreamCommentRepository;

    @Autowired
    private LivestreamRepository livestreamRepository;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Common Vietnamese profanity list
    private static final List<String> BLACKLIST_WORDS = Arrays.asList(
            "địt", "đm", "đkm", "đcm", "vcl", "vãi lồn", "cặc", "lồn", "đéo", "đĩ", "chó đẻ",
            "óc chó", "ngu lồn", "ngu lờ", "mẹ mày", "cha mày", "bố mày", "con cặc", "thằng chó",
            "đớp", "hốc", "lừa đảo", "ăn cướp", "ăn giựt", "dcm", "dkm", "clm"
    );

    // Regex patterns for URLs, phone numbers and competing platforms
    private static final Pattern URL_PATTERN = Pattern.compile(
            "https?://[a-zA-Z0-9-.]+\\.[a-zA-Z]{2,}(/\\S*)?", Pattern.CASE_INSENSITIVE
    );

    private static final Pattern DOMAIN_PATTERN = Pattern.compile(
            "\\b(facebook|zalo|shopee|lazada|tiki|momo|tiktok|fb\\.com|zalo\\.me|fb\\.me|t\\.me)\\b", Pattern.CASE_INSENSITIVE
    );

    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "\\b0[35789](\\s*\\.?\\s*\\d){8}\\b"
    );

    public String checkLocalFilter(String text) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }

        String lower = text.toLowerCase();

        // 1. Check profanity list
        for (String badWord : BLACKLIST_WORDS) {
            if (lower.contains(badWord)) {
                return "TOXIC";
            }
        }

        // 2. Check URLs
        if (URL_PATTERN.matcher(lower).find()) {
            return "REDIRECT";
        }

        // 3. Check competing platforms
        if (DOMAIN_PATTERN.matcher(lower).find()) {
            return "REDIRECT";
        }

        // 4. Check phone numbers
        if (PHONE_PATTERN.matcher(lower).find()) {
            return "REDIRECT";
        }

        return null;
    }

    public void recordViolation(User user, String type, String content, Long livestreamId) {
        if (user == null) return;

        // Save violation log
        ChatViolationLog log = new ChatViolationLog();
        log.setUser(user);
        log.setViolationType(type);
        log.setViolatedContent(content);
        log.setLivestreamId(livestreamId);
        chatViolationLogRepository.save(log);

        // Count violations specifically in this livestream session
        long violationCount = 0;
        if (livestreamId != null) {
            violationCount = chatViolationLogRepository.countByUserIdAndLivestreamId(user.getId(), livestreamId);
        } else {
            violationCount = chatViolationLogRepository.countByUserId(user.getId());
        }

        if (violationCount >= 2 && livestreamId != null) {
            Optional<Livestream> streamOpt = livestreamRepository.findById(livestreamId);
            if (streamOpt.isPresent()) {
                Livestream stream = streamOpt.get();
                if (stream.getBlockedUsers() == null) {
                    stream.setBlockedUsers(new HashSet<>());
                }
                if (!stream.getBlockedUsers().contains(user)) {
                    stream.getBlockedUsers().add(user);
                    livestreamRepository.save(stream);
                    System.out.println(">>> User blocked in current livestream ID " + livestreamId + ": " + user.getEmail() + " (Violations in room: " + violationCount + ")");
                }
            }
        }
    }

    @Async
    public void checkGeminiFilterAsync(Long commentId, String commentText, Long userId, Long livestreamId) {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty() || geminiApiKey.equals("${GEMINI_API_KEY}")) {
            System.err.println(">>> ToxicityFilterService Async Warning: GEMINI_API_KEY environment variable is not configured or empty!");
            return;
        }

        try {
            // Build the prompt for Google Gemini to detect redirect attempts
            String prompt = "Nhiệm vụ của bạn là phân tích bình luận trong chat livestream nông sản. "
                    + "Hãy xác định xem người dùng có đang cố tình lôi kéo, hướng dẫn người xem khác thực hiện giao dịch bên ngoài ứng dụng "
                    + "(off-platform transaction) thông qua các app/web khác hay không (ví dụ: Zalo, Facebook, Shopee, Số điện thoại cá nhân). "
                    + "Hãy chú ý các từ viết lách luật như 'z.a.l.o', 'sờ pi', 'ib mình', 'phây bút', 'không chín...'. "
                    + "Chỉ trả về kết quả định dạng JSON thô như sau, tuyệt đối không trả lời thêm gì khác ngoài JSON này:\n"
                    + "{\n"
                    + "  \"isViolation\": true/false,\n"
                    + "  \"reason\": \"lý do ngắn gọn\"\n"
                    + "}\n"
                    + "Bình luận cần phân tích:\n"
                    + "\"" + commentText + "\"";

            String url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", prompt);

            Map<String, Object> partsObj = new HashMap<>();
            partsObj.put("parts", List.of(textPart));

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("contents", List.of(partsObj));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<?, ?> body = response.getBody();
                List<?> candidates = (List<?>) body.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<?, ?> firstCandidate = (Map<?, ?>) candidates.get(0);
                    Map<?, ?> contentNode = (Map<?, ?>) firstCandidate.get("content");
                    if (contentNode != null) {
                        List<?> parts = (List<?>) contentNode.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            Map<?, ?> firstPart = (Map<?, ?>) parts.get(0);
                            String responseText = (String) firstPart.get("text");
                            if (responseText != null) {
                                // Clean JSON text from potential markdown blocks ```json
                                String cleanJson = responseText.replaceAll("```json", "")
                                        .replaceAll("```", "")
                                        .trim();
                                
                                JsonNode rootNode = objectMapper.readTree(cleanJson);
                                boolean isViolation = rootNode.path("isViolation").asBoolean();
                                if (isViolation) {
                                    System.out.println(">>> Gemini Async flagged comment: \"" + commentText + "\" as redirect violation!");
                                    
                                    // 1. Delete comment from DB
                                    if (livestreamCommentRepository.existsById(commentId)) {
                                        livestreamCommentRepository.deleteById(commentId);
                                    }

                                    // 2. Record violation
                                    userRepository.findById(userId).ifPresent(user -> {
                                        recordViolation(user, "REDIRECT", commentText, livestreamId);
                                    });
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println(">>> ToxicityFilterService Async Error: " + e.getMessage());
        }
    }
}
