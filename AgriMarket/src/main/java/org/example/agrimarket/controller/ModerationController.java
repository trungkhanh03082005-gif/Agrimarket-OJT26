package org.example.agrimarket.controller;

import org.example.agrimarket.model.Livestream;
import org.example.agrimarket.model.LivestreamAlert;
import org.example.agrimarket.model.User;
import org.example.agrimarket.repository.LivestreamAlertRepository;
import org.example.agrimarket.repository.LivestreamRepository;
import org.example.agrimarket.repository.UserRepository;
import org.example.agrimarket.service.ToxicityFilterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/moderation")
public class ModerationController {

    @Autowired
    private LivestreamRepository livestreamRepository;

    @Autowired
    private LivestreamAlertRepository livestreamAlertRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ToxicityFilterService toxicityFilterService;

    // Webhook for Python AI service to report visual violations
    @PostMapping("/livestream-alert")
    public ResponseEntity<?> receiveLivestreamAlert(@RequestBody Map<String, Object> payload) {
        try {
            Long livestreamId = Long.parseLong(payload.get("livestreamId").toString());
            String alertType = payload.get("alertType").toString(); // WEAPONS, NUDITY, TRASH_LIVE, AUDIO_VIOLATION
            String evidenceUrl = payload.get("evidenceUrl").toString(); // image URL or base64 or text

            Optional<Livestream> streamOpt = livestreamRepository.findById(livestreamId);
            if (streamOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy livestream");
            }

            LivestreamAlert alert = new LivestreamAlert();
            alert.setLivestream(streamOpt.get());
            alert.setAlertType(alertType);
            alert.setEvidenceUrl(evidenceUrl);
            alert.setStatus("PENDING");

            livestreamAlertRepository.save(alert);
            return ResponseEntity.ok("Đã nhận cảnh báo thành công");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi xử lý cảnh báo: " + e.getMessage());
        }
    }

    // Client STT endpoint to submit speech transcripts for checking
    @PostMapping("/livestream-stt-check")
    public ResponseEntity<?> checkSpeechTranscript(@RequestBody Map<String, Object> payload, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }

        try {
            Long livestreamId = Long.parseLong(payload.get("livestreamId").toString());
            String transcript = payload.get("transcript").toString();

            Optional<Livestream> streamOpt = livestreamRepository.findById(livestreamId);
            if (streamOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy livestream");
            }
            Livestream livestream = streamOpt.get();

            // Run transcript through our toxicity filter
            String violation = toxicityFilterService.checkLocalFilter(transcript);
            if (violation != null) {
                // Save alert to database
                LivestreamAlert alert = new LivestreamAlert();
                alert.setLivestream(livestream);
                alert.setAlertType("AUDIO_VIOLATION");
                alert.setEvidenceUrl("Phát ngôn vi phạm: \"" + transcript + "\" (Loại: " + violation + ")");
                alert.setStatus("PENDING");
                livestreamAlertRepository.save(alert);

                Map<String, Object> response = new HashMap<>();
                response.put("flagged", true);
                response.put("reason", violation);
                return ResponseEntity.ok(response);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("flagged", false);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
    }

    // Get all pending alerts (Admin view)
    @GetMapping("/alerts")
    public ResponseEntity<?> getAlerts(@RequestParam(required = false, defaultValue = "PENDING") String status) {
        List<LivestreamAlert> alerts = livestreamAlertRepository.findByStatusOrderByCreatedAtDesc(status);
        List<Map<String, Object>> response = new ArrayList<>();

        for (LivestreamAlert alert : alerts) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", alert.getId());
            map.put("livestreamId", alert.getLivestream().getId());
            map.put("farmerName", alert.getLivestream().getFarmer().getFarmName());
            map.put("farmerBrand", alert.getLivestream().getFarmer().getFarmName());
            map.put("alertType", alert.getAlertType());
            map.put("evidenceUrl", alert.getEvidenceUrl());
            map.put("status", alert.getStatus());
            map.put("createdAt", alert.getCreatedAt());
            response.add(map);
        }

        return ResponseEntity.ok(response);
    }

    // Get alerts of a specific livestream
    @GetMapping("/livestreams/{livestreamId}/alerts")
    public ResponseEntity<?> getLivestreamAlerts(@PathVariable Long livestreamId) {
        List<LivestreamAlert> alerts = livestreamAlertRepository.findByLivestreamIdOrderByCreatedAtDesc(livestreamId);
        List<Map<String, Object>> response = new ArrayList<>();

        for (LivestreamAlert alert : alerts) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", alert.getId());
            map.put("alertType", alert.getAlertType());
            map.put("evidenceUrl", alert.getEvidenceUrl());
            map.put("status", alert.getStatus());
            map.put("createdAt", alert.getCreatedAt());
            response.add(map);
        }

        return ResponseEntity.ok(response);
    }

    // Dismiss alert
    @PostMapping("/alerts/{alertId}/resolve")
    public ResponseEntity<?> resolveAlert(@PathVariable Long alertId) {
        Optional<LivestreamAlert> alertOpt = livestreamAlertRepository.findById(alertId);
        if (alertOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy cảnh báo");
        }

        LivestreamAlert alert = alertOpt.get();
        alert.setStatus("RESOLVED");
        livestreamAlertRepository.save(alert);

        return ResponseEntity.ok("Cảnh báo đã được giải quyết");
    }

    // Get list of globally chat-banned users
    @GetMapping("/banned-users")
    public ResponseEntity<?> getBannedUsers() {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> banned = new ArrayList<>();
        for (User u : users) {
            if (u.getIsChatBanned() != null && u.getIsChatBanned()) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", u.getId());
                map.put("fullName", u.getFullName());
                map.put("email", u.getEmail());
                map.put("phone", u.getPhone());
                map.put("avatarUrl", u.getAvatarUrl());
                banned.add(map);
            }
        }
        return ResponseEntity.ok(banned);
    }

    // Unban chat of a user
    @PostMapping("/users/{userId}/unban-chat")
    public ResponseEntity<?> unbanChat(@PathVariable Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy người dùng");
        }

        User user = userOpt.get();
        user.setIsChatBanned(false);
        userRepository.save(user);

        return ResponseEntity.ok("Đã mở khóa bình luận thành công cho người dùng " + user.getFullName());
    }
}
