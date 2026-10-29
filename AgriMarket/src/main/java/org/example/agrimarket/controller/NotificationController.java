package org.example.agrimarket.controller;

import org.example.agrimarket.model.Customer;
import org.example.agrimarket.model.Farmer;
import org.example.agrimarket.model.Notification;
import org.example.agrimarket.repository.CustomerRepository;
import org.example.agrimarket.repository.FarmerRepository;
import org.example.agrimarket.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import org.example.agrimarket.model.Admin;
import org.example.agrimarket.repository.AdminRepository;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private AdminRepository adminRepository;

    @GetMapping
    public ResponseEntity<?> getNotifications(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        String email = principal.getName();
        String receiverType = "";
        Long receiverId = null;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isFarmer = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_FARMER"));
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (isFarmer) {
            Optional<Farmer> farmerOpt = farmerRepository.findByEmail(email);
            if (farmerOpt.isPresent()) {
                receiverType = "farmer";
                receiverId = farmerOpt.get().getId();
            }
        } else if (isAdmin) {
            Optional<Admin> adminOpt = adminRepository.findByEmail(email);
            if (adminOpt.isPresent()) {
                receiverType = "admin";
                receiverId = adminOpt.get().getId();
            }
        } else {
            Optional<Customer> customerOpt = customerRepository.findByEmail(email);
            if (customerOpt.isPresent()) {
                receiverType = "customer";
                receiverId = customerOpt.get().getId();
            }
        }

        // Fallback checks
        if (receiverId == null) {
            Optional<Customer> customerOpt = customerRepository.findByEmail(email);
            if (customerOpt.isPresent()) {
                receiverType = "customer";
                receiverId = customerOpt.get().getId();
            } else {
                Optional<Farmer> farmerOpt = farmerRepository.findByEmail(email);
                if (farmerOpt.isPresent()) {
                    receiverType = "farmer";
                    receiverId = farmerOpt.get().getId();
                } else {
                    Optional<Admin> adminOpt = adminRepository.findByEmail(email);
                    if (adminOpt.isPresent()) {
                        receiverType = "admin";
                        receiverId = adminOpt.get().getId();
                    }
                }
            }
        }

        if (receiverId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("User not found");
        }

        List<Notification> notifications = notificationRepository
                .findByReceiverTypeAndReceiverIdOrderByCreatedAtDesc(receiverType, receiverId);

        return ResponseEntity.ok(notifications);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        Optional<Notification> notifOpt = notificationRepository.findById(id);
        if (notifOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Notification not found");
        }

        Notification notification = notifOpt.get();
        // Mark as read
        notification.setIsRead(true);
        notificationRepository.save(notification);

        return ResponseEntity.ok(notification);
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        String email = principal.getName();
        String receiverType = "";
        Long receiverId = null;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isFarmer = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_FARMER"));

        if (isFarmer) {
            Optional<Farmer> farmerOpt = farmerRepository.findByEmail(email);
            if (farmerOpt.isPresent()) {
                receiverType = "farmer";
                receiverId = farmerOpt.get().getId();
            }
        } else {
            Optional<Customer> customerOpt = customerRepository.findByEmail(email);
            if (customerOpt.isPresent()) {
                receiverType = "customer";
                receiverId = customerOpt.get().getId();
            }
        }

        // Fallback checks
        if (receiverId == null) {
            Optional<Customer> customerOpt = customerRepository.findByEmail(email);
            if (customerOpt.isPresent()) {
                receiverType = "customer";
                receiverId = customerOpt.get().getId();
            } else {
                Optional<Farmer> farmerOpt = farmerRepository.findByEmail(email);
                if (farmerOpt.isPresent()) {
                    receiverType = "farmer";
                    receiverId = farmerOpt.get().getId();
                }
            }
        }

        if (receiverId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("User not found");
        }

        List<Notification> unreadNotifs = notificationRepository
                .findByReceiverTypeAndReceiverIdOrderByCreatedAtDesc(receiverType, receiverId);
        for (Notification notif : unreadNotifs) {
            if (!notif.getIsRead()) {
                notif.setIsRead(true);
                notificationRepository.save(notif);
            }
        }

        return ResponseEntity.ok("All marked as read");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        if (!notificationRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Notification not found");
        }

        notificationRepository.deleteById(id);
        return ResponseEntity.ok("Notification deleted");
    }
}
