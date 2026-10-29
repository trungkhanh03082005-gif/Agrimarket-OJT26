package org.example.agrimarket.scheduler;

import org.example.agrimarket.model.AdminNotification;
import org.example.agrimarket.model.Notification;
import org.example.agrimarket.repository.AdminNotificationRepository;
import org.example.agrimarket.repository.CustomerRepository;
import org.example.agrimarket.repository.FarmerRepository;
import org.example.agrimarket.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class NotificationScheduler {

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

    @Scheduled(fixedRate = 30000) // check every 30 seconds
    @Transactional
    public void processScheduledNotifications() {
        LocalDateTime now = LocalDateTime.now();
        List<AdminNotification> scheduledList = adminNotificationRepository.findByStatusAndScheduledAtLessThanEqual(
                "scheduled", now
        );

        for (AdminNotification broadcast : scheduledList) {
            try {
                if (broadcast.getChannels() != null && broadcast.getChannels().contains("in_app")) {
                    distributeNotification(broadcast);
                }
                if (broadcast.getChannels() != null && broadcast.getChannels().contains("email")) {
                    sendEmailNotification(broadcast);
                }
                broadcast.setStatus("sent");
                broadcast.setSentAt(now);
                adminNotificationRepository.save(broadcast);
            } catch (Exception e) {
                broadcast.setStatus("failed");
                adminNotificationRepository.save(broadcast);
                System.err.println("Failed to send scheduled broadcast " + broadcast.getId() + ": " + e.getMessage());
            }
        }
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
                .collect(java.util.stream.Collectors.toList());
        if (!uniqueEmails.isEmpty()) {
            emailService.sendBroadcastEmailsAsync(uniqueEmails, broadcast.getTitle(), broadcast.getContent());
        }
    }
}
