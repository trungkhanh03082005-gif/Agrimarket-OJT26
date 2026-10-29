package org.example.agrimarket.controller;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.example.agrimarket.model.AdminNotification;
import org.example.agrimarket.model.Notification;
import org.example.agrimarket.repository.AdminNotificationRepository;
import org.example.agrimarket.repository.CustomerRepository;
import org.example.agrimarket.repository.FarmerRepository;
import org.example.agrimarket.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/notifications")
public class AdminNotificationController {

    @Autowired
    private AdminNotificationRepository adminNotificationRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private FarmerRepository farmerRepository;



    @Autowired
    private org.example.agrimarket.service.EmailService emailService;

    @PostMapping
    public ResponseEntity<?> createNotification(@RequestBody BroadcastRequest request) {
        String status = "draft";
        LocalDateTime sentAt = null;

        if ("now".equalsIgnoreCase(request.getSendMode())) {
            status = "sent";
            sentAt = LocalDateTime.now();
        } else if ("schedule".equalsIgnoreCase(request.getSendMode())) {
            status = "scheduled";
        }

        AdminNotification broadcast = AdminNotification.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .notificationType(request.getNotificationType())
                .targetAudience(request.getTargetAudience())
                .status(status)
                .sentAt(sentAt)
                .scheduledAt(request.getScheduledAt())
                .channels(request.getChannels() != null ? String.join(",", request.getChannels()) : "in_app")
                .targetUserId(request.getTargetUserId())
                .targetUserType(request.getTargetUserType())
                .targetUsers(request.getTargetUsers())
                .build();

        AdminNotification saved = adminNotificationRepository.save(broadcast);

        if ("sent".equals(status)) {
            if (saved.getChannels() != null && saved.getChannels().contains("in_app")) {
                distributeNotification(saved);
            }
            if (saved.getChannels() != null && saved.getChannels().contains("email")) {
                sendEmailNotification(saved);
            }
        }

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/users")
    public ResponseEntity<List<SimplifiedUserDto>> getSimplifiedUsers() {
        java.util.List<SimplifiedUserDto> list = new java.util.ArrayList<>();
        java.util.Set<String> farmerEmails = new java.util.HashSet<>();
        
        // 1. Load Farmers first to collect emails and prioritize showing them as farmers
        farmerRepository.findAll().forEach(f -> {
            if (f.getEmail() != null) {
                farmerEmails.add(f.getEmail().trim().toLowerCase());
            }
            list.add(new SimplifiedUserDto(f.getId(), f.getFullName(), f.getEmail(), "farmer", f.getFarmName()));
        });
        
        // 2. Load Customers, skipping those already present in farmerEmails
        customerRepository.findAll().forEach(c -> {
            String emailKey = c.getEmail() != null ? c.getEmail().trim().toLowerCase() : "";
            if (!farmerEmails.contains(emailKey)) {
                list.add(new SimplifiedUserDto(c.getId(), c.getFullName(), c.getEmail(), "customer", null));
            }
        });
        

        
        return ResponseEntity.ok(list);
    }

    @GetMapping("/recent")
    public ResponseEntity<List<BroadcastResponse>> getRecentBroadcasts() {
        List<AdminNotification> broadcasts = adminNotificationRepository.findAllByOrderByIdDesc();
        List<BroadcastResponse> responses = broadcasts.stream().map(b -> {
            Double openRate = null;
            if ("sent".equals(b.getStatus())) {
                long total = notificationRepository.countByBroadcastId(b.getId());
                long read = notificationRepository.countByBroadcastIdAndIsReadTrue(b.getId());
                openRate = total > 0 ? Math.round((double) read * 100.0 / total) * 1.0 : 0.0;
            }
            return new BroadcastResponse(
                    b.getId(),
                    b.getTitle(),
                    b.getContent(),
                    b.getNotificationType(),
                    b.getTargetAudience(),
                    b.getStatus(),
                    b.getSentAt() != null ? b.getSentAt() : b.getCreatedAt(),
                    openRate,
                    b.getTargetUserId(),
                    b.getTargetUserType(),
                    b.getTargetUsers()
            );
        }).collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/statistics")
    public ResponseEntity<?> getNotificationStats() {
        List<AdminNotification> broadcasts = adminNotificationRepository.findAll();

        long totalSent = broadcasts.stream().filter(b -> "sent".equals(b.getStatus())).count();
        long scheduled = broadcasts.stream().filter(b -> "scheduled".equals(b.getStatus())).count();
        long failed = broadcasts.stream().filter(b -> "failed".equals(b.getStatus())).count();

        long totalSentNotifications = 0;
        long totalReadNotifications = 0;

        for (AdminNotification b : broadcasts) {
            if ("sent".equals(b.getStatus())) {
                totalSentNotifications += notificationRepository.countByBroadcastId(b.getId());
                totalReadNotifications += notificationRepository.countByBroadcastIdAndIsReadTrue(b.getId());
            }
        }

        long openRate = totalSentNotifications > 0 ? Math.round((double) totalReadNotifications * 100.0 / totalSentNotifications) : 0;

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalSent", totalSent);
        stats.put("scheduled", scheduled);
        stats.put("failed", failed);
        stats.put("openRate", openRate);

        return ResponseEntity.ok(stats);
    }

    private void distributeNotification(AdminNotification broadcast) {
        String target = broadcast.getTargetAudience();
        if ("single".equals(target)) {
            String targetUsersStr = broadcast.getTargetUsers();
            if (targetUsersStr != null && !targetUsersStr.trim().isEmpty()) {
                String[] userTokens = targetUsersStr.split(",");
                for (String token : userTokens) {
                    String[] parts = token.split(":");
                    if (parts.length == 2) {
                        String type = parts[0];
                        Long id = Long.parseLong(parts[1]);
                        notificationRepository.save(Notification.builder()
                                .receiverType(type)
                                .receiverId(id)
                                .title(broadcast.getTitle())
                                .content(broadcast.getContent())
                                .isRead(false)
                                .broadcastId(broadcast.getId())
                                .build());
                    }
                }
            }
            return;
        }
        if ("customer".equals(target) || "all".equals(target)) {
            customerRepository.findAll().forEach(customer -> {
                notificationRepository.save(Notification.builder()
                        .receiverType("customer")
                        .receiverId(customer.getId())
                        .title(broadcast.getTitle())
                        .content(broadcast.getContent())
                        .isRead(false)
                        .broadcastId(broadcast.getId())
                        .build());
            });
        }
        if ("farmer".equals(target) || "all".equals(target)) {
            farmerRepository.findAll().forEach(farmer -> {
                notificationRepository.save(Notification.builder()
                        .receiverType("farmer")
                        .receiverId(farmer.getId())
                        .title(broadcast.getTitle())
                        .content(broadcast.getContent())
                        .isRead(false)
                        .broadcastId(broadcast.getId())
                        .build());
            });
        }

    }

    private void sendEmailNotification(AdminNotification broadcast) {
        String target = broadcast.getTargetAudience();
        java.util.List<String> emails = new java.util.ArrayList<>();
        if ("single".equals(target)) {
            String targetUsersStr = broadcast.getTargetUsers();
            if (targetUsersStr != null && !targetUsersStr.trim().isEmpty()) {
                String[] userTokens = targetUsersStr.split(",");
                for (String token : userTokens) {
                    String[] parts = token.split(":");
                    if (parts.length == 2) {
                        String type = parts[0];
                        Long id = Long.parseLong(parts[1]);
                        String email = null;
                        if ("customer".equals(type)) {
                            email = customerRepository.findById(id).map(c -> c.getEmail()).orElse(null);
                        } else if ("farmer".equals(type)) {
                            email = farmerRepository.findById(id).map(f -> f.getEmail()).orElse(null);
                        }
                        if (email != null && !email.trim().isEmpty()) {
                            emails.add(email);
                        }
                    }
                }
            }
        } else {
            if ("customer".equals(target) || "all".equals(target)) {
                customerRepository.findAll().forEach(customer -> {
                    if (customer.getEmail() != null && !customer.getEmail().isEmpty()) {
                        emails.add(customer.getEmail());
                    }
                });
            }
            if ("farmer".equals(target) || "all".equals(target)) {
                farmerRepository.findAll().forEach(farmer -> {
                    if (farmer.getEmail() != null && !farmer.getEmail().isEmpty()) {
                        emails.add(farmer.getEmail());
                    }
                });
            }

        }

        java.util.List<String> uniqueEmails = emails.stream()
                .filter(e -> e != null && !e.trim().isEmpty())
                .map(String::trim)
                .map(String::toLowerCase)
                .distinct()
                .collect(Collectors.toList());
        if (!uniqueEmails.isEmpty()) {
            emailService.sendBroadcastEmailsAsync(uniqueEmails, broadcast.getTitle(), broadcast.getContent());
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BroadcastRequest {
        private String title;
        private String content;
        private String notificationType;
        private String targetAudience;
        private List<String> channels;
        private String sendMode;
        private LocalDateTime scheduledAt;
        private Long targetUserId;
        private String targetUserType;
        private String targetUsers;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BroadcastResponse {
        private Long id;
        private String title;
        private String content;
        private String notificationType;
        private String targetAudience;
        private String status;
        private LocalDateTime sentAt;
        private Double openRate;
        private Long targetUserId;
        private String targetUserType;
        private String targetUsers;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimplifiedUserDto {
        private Long id;
        private String fullName;
        private String email;
        private String type; // "customer", "farmer", "partner"
        private String extraInfo; // e.g. farm name if farmer
    }
}
