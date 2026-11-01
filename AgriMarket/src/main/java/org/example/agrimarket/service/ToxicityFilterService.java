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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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

    /**
     * DTO chứa kết quả phạt cấm bình luận trả về cho Controller hiển thị thông báo
     */
    public static class BanResult {
        private final int violationCount;
        private final long durationMinutes;
        private final String durationText;
        private final LocalDateTime bannedUntil;
        private final String untilText;

        public BanResult(int violationCount, long durationMinutes, String durationText, LocalDateTime bannedUntil, String untilText) {
            this.violationCount = violationCount;
            this.durationMinutes = durationMinutes;
            this.durationText = durationText;
            this.bannedUntil = bannedUntil;
            this.untilText = untilText;
        }

        public int getViolationCount() { return violationCount; }
        public long getDurationMinutes() { return durationMinutes; }
        public String getDurationText() { return durationText; }
        public LocalDateTime getBannedUntil() { return bannedUntil; }
        public String getUntilText() { return untilText; }
    }

    /**
     * Tính toán thời gian cấm bình luận (tính bằng phút) theo cấp số tăng dần:
     * - Lần 1: 30 phút (theo yêu cầu hệ thống)
     * - Lần 2: 120 phút (2 giờ)
     * - Lần 3: 1440 phút (24 giờ / 1 ngày)
     * - Lần 4: 4320 phút (3 ngày)
     * - Lần 5 trở đi: 10080 phút (7 ngày)
     */
    public static long calculateBanDurationMinutes(int count) {
        switch (count) {
            case 1:
                return 30; // 30 phút cho lần vi phạm đầu tiên
            case 2:
                return 120; // 2 giờ cho lần vi phạm thứ 2
            case 3:
                return 1440; // 24 giờ (1 ngày) cho lần vi phạm thứ 3
            case 4:
                return 4320; // 3 ngày cho lần vi phạm thứ 4
            default:
                return 10080; // 7 ngày cho các lần tiếp theo
        }
    }

    public static String formatDurationText(long minutes) {
        if (minutes < 60) {
            return minutes + " phút";
        } else if (minutes < 1440) {
            long hours = minutes / 60;
            return hours + " giờ";
        } else {
            long days = minutes / 1440;
            return days + " ngày";
        }
    }

    /**
     * Ghi nhận vi phạm, tăng số lần vi phạm và áp dụng lệnh cấm chat tạm thời có thời hạn cho tài khoản
     */
    public BanResult recordViolation(User user, String type, String content, Long livestreamId) {
        if (user == null) return null;

        // 1. Lưu bản ghi lịch sử vi phạm vào DB
        ChatViolationLog log = new ChatViolationLog();
        log.setUser(user);
        log.setViolationType(type);
        log.setViolatedContent(content);
        log.setLivestreamId(livestreamId);
        chatViolationLogRepository.save(log);

        // 2. Tăng số lần vi phạm của tài khoản
        int currentCount = (user.getChatViolationCount() == null ? 0 : user.getChatViolationCount()) + 1;
        user.setChatViolationCount(currentCount);

        // 3. Tính thời gian cấm tăng dần theo số lần vi phạm (Bắt đầu từ 30 phút)
        long durationMinutes = calculateBanDurationMinutes(currentCount);
        String durationText = formatDurationText(durationMinutes);

        LocalDateTime until = LocalDateTime.now().plusMinutes(durationMinutes);
        user.setChatBannedUntil(until);
        user.setIsChatBanned(true);
        userRepository.save(user);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
        String untilText = until.format(formatter);

        System.out.println(">>> User " + user.getEmail() + " banned from chat for " + durationText +
                " until " + untilText + " (Violation #" + currentCount + ", Type: " + type + ")");

        return new BanResult(currentCount, durationMinutes, durationText, until, untilText);
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
