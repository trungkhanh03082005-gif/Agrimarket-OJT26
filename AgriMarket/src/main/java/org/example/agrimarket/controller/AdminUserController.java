package org.example.agrimarket.controller;

import org.example.agrimarket.model.Admin;
import org.example.agrimarket.model.Customer;
import org.example.agrimarket.model.Farmer;
import org.example.agrimarket.model.CustomerAddress;
import org.example.agrimarket.model.Product;
import org.example.agrimarket.model.ProductImage;
import org.example.agrimarket.model.Notification;
import org.example.agrimarket.repository.AdminRepository;
import org.example.agrimarket.repository.CustomerRepository;
import org.example.agrimarket.repository.FarmerRepository;
import org.example.agrimarket.repository.ProductRepository;
import org.example.agrimarket.repository.ProductImageRepository;
import org.example.agrimarket.repository.NotificationRepository;
import org.example.agrimarket.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import org.example.agrimarket.dto.PageResponse;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.example.agrimarket.service.SupabaseStorageService;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private NotificationRepository notificationRepository;



    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductImageRepository productImageRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private OrderService orderService;

    @GetMapping("/orders/customer/{email}")
    public ResponseEntity<?> getCustomerOrdersForAdmin(@PathVariable String email) {
        try {
            return ResponseEntity.ok(orderService.getCustomerOrders(email));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/orders/farmer/{email}")
    public ResponseEntity<?> getFarmerOrdersForAdmin(@PathVariable String email) {
        try {
            return ResponseEntity.ok(orderService.getFarmerOrders(email));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @Autowired
    private org.example.agrimarket.service.AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        return ResponseEntity.ok(adminUserService.getAllUsersList());
    }

    @GetMapping("/paged")
    public ResponseEntity<?> getAllUsersPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search
    ) {
        List<Map<String, Object>> userList = adminUserService.getAllUsersList();
        if (userList == null) userList = new ArrayList<>();

        if (role != null && !role.isBlank() && !"all".equalsIgnoreCase(role)) {
            userList = userList.stream()
                    .filter(u -> role.equalsIgnoreCase((String) u.get("role")))
                    .collect(Collectors.toList());
        }

        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            String sFilter = status.toLowerCase();
            userList = userList.stream()
                    .filter(u -> {
                        String st = u.get("status") != null ? ((String) u.get("status")).toLowerCase() : "active";
                        if ("suspended".equalsIgnoreCase(sFilter) || "locked".equalsIgnoreCase(sFilter) || "banned".equalsIgnoreCase(sFilter)) {
                            return "suspended".equals(st) || "locked".equals(st) || "banned".equals(st);
                        }
                        return sFilter.equalsIgnoreCase(st);
                    })
                    .collect(Collectors.toList());
        }

        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            userList = userList.stream()
                    .filter(u -> {
                        String name = u.get("fullName") != null ? ((String) u.get("fullName")).toLowerCase() : "";
                        String email = u.get("email") != null ? ((String) u.get("email")).toLowerCase() : "";
                        String phone = u.get("phone") != null ? ((String) u.get("phone")).toLowerCase() : "";
                        return name.contains(q) || email.contains(q) || phone.contains(q);
                    })
                    .collect(Collectors.toList());
        }

        int totalElements = userList.size();
        int totalPages = (int) Math.ceil((double) totalElements / size);
        int fromIndex = Math.min(page * size, totalElements);
        int toIndex = Math.min(fromIndex + size, totalElements);

        List<Map<String, Object>> pagedContent = userList.subList(fromIndex, toIndex);

        PageResponse<Map<String, Object>> response = PageResponse.<Map<String, Object>>builder()
                .content(pagedContent)
                .totalElements(totalElements)
                .totalPages(totalPages == 0 ? 1 : totalPages)
                .currentPage(page)
                .pageSize(size)
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> payload) {
        String role = (String) payload.get("role");
        if (role == null) {
            return ResponseEntity.badRequest().body("Role is required");
        }
        role = role.toLowerCase();

        String fullName = (String) payload.get("fullName");
        String email = (String) payload.get("email");
        if (email != null) {
            email = email.trim().toLowerCase();
        }
        String phoneInput = (String) payload.get("phone");
        String phone = (phoneInput != null && !phoneInput.trim().isEmpty()) ? phoneInput.trim() : null;
        String password = (String) payload.get("password");
        String avatarUrl = (String) payload.get("avatarUrl");
        String status = (String) payload.getOrDefault("status", "active");

        if (email != null) {
            if (adminRepository.findByEmail(email).isPresent() ||
                customerRepository.findByEmail(email).isPresent() ||
                farmerRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body("Email đã tồn tại trong hệ thống");
            }
        }

        if (phone != null && !phone.trim().isEmpty()) {
            String trimmedPhone = phone.trim();
            if (customerRepository.existsByPhone(trimmedPhone) ||
                farmerRepository.existsByPhone(trimmedPhone)) {
                return ResponseEntity.badRequest().body("Số điện thoại đã tồn tại trong hệ thống");
            }
        }

        String encodedPassword = passwordEncoder.encode(password != null ? password : "Password123");

        if ("admin".equals(role)) {
            Admin admin = new Admin();
            admin.setFullName(fullName);
            admin.setEmail(email);
            admin.setPassword(encodedPassword);
            admin.setAvatarUrl(avatarUrl);
            admin.setCreatedAt(LocalDateTime.now());
            return ResponseEntity.ok(adminRepository.save(admin));
        } else if ("customer".equals(role)) {
            Customer customer = new Customer();
            customer.setFullName(fullName);
            customer.setEmail(email);
            customer.setPhone(phone);
            customer.setPassword(encodedPassword);
            customer.setAvatarUrl(avatarUrl);
            customer.setStatus(status);
            customer.setCreatedAt(LocalDateTime.now());
            customer.setPasswordSet(true);
            return ResponseEntity.ok(customerRepository.save(customer));
        } else if ("farmer".equals(role)) {
            Farmer farmer = new Farmer();
            farmer.setFullName(fullName);
            farmer.setEmail(email);
            farmer.setPhone(phone);
            farmer.setPassword(encodedPassword);
            farmer.setAvatarUrl(avatarUrl);
            farmer.setStatus(status);
            farmer.setVerificationStatus("verified");
            farmer.setCreatedAt(LocalDateTime.now());
            farmer.setPasswordSet(true);

            String farmName = (String) payload.get("farmName");
            String farmAddress = (String) payload.get("farmAddress");
            String description = (String) payload.get("description");
            farmer.setFarmName(farmName != null ? farmName : "Nông trại của " + fullName);
            farmer.setFarmAddress(farmAddress != null ? farmAddress : "");
            farmer.setDescription(description != null ? description : "");
            farmer.setRatingAverage(0.0);
            farmer.setTotalProducts(0);

            farmer.setIdentityCard((String) payload.get("identityCard"));
            farmer.setBusinessRegistrationUrl((String) payload.get("businessRegistrationUrl"));
            farmer.setVietgapUrl((String) payload.get("vietgapUrl"));
            farmer.setGlobalgapUrl((String) payload.get("globalgapUrl"));
            farmer.setOrganicUrl((String) payload.get("organicUrl"));

            Double maxDeliveryDistance = null;
            if (payload.get("maxDeliveryDistance") != null) {
                try {
                    maxDeliveryDistance = Double.valueOf(payload.get("maxDeliveryDistance").toString());
                } catch (Exception e) {}
            }
            farmer.setMaxDeliveryDistance(maxDeliveryDistance != null ? maxDeliveryDistance : 50.0);

            Double latitude = null;
            if (payload.get("latitude") != null) {
                try {
                    latitude = Double.valueOf(payload.get("latitude").toString());
                } catch (Exception e) {}
            }
            farmer.setLatitude(latitude);

            Double longitude = null;
            if (payload.get("longitude") != null) {
                try {
                    longitude = Double.valueOf(payload.get("longitude").toString());
                } catch (Exception e) {}
            }
            farmer.setLongitude(longitude);

            return ResponseEntity.ok(farmerRepository.save(farmer));

        } else {
            return ResponseEntity.badRequest().body("Invalid role: " + role);
        }
    }

    @PutMapping("/{role}/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String role, @PathVariable Long id, @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null) {
            return ResponseEntity.badRequest().body("Status is required");
        }
        
        String lowerRole = role.toLowerCase();
        if ("admin".equals(lowerRole)) {
            return ResponseEntity.badRequest().body("Cannot change admin status");
        } else if ("customer".equals(lowerRole)) {
            Customer c = customerRepository.findById(id).orElse(null);
            if (c == null) return ResponseEntity.notFound().build();
            c.setStatus(newStatus);
            customerRepository.save(c);
            
            // Sync status to Farmer with same email (lock/unlock)
            farmerRepository.findByEmail(c.getEmail()).ifPresent(f -> {
                f.setStatus(newStatus);
                farmerRepository.save(f);
            });
            return ResponseEntity.ok().build();
        } else if ("farmer".equals(lowerRole)) {
            Farmer f = farmerRepository.findById(id).orElse(null);
            if (f == null) return ResponseEntity.notFound().build();
            
            boolean wasNotVerified = !"verified".equals(f.getVerificationStatus());
            
            f.setStatus(newStatus);
            if ("active".equalsIgnoreCase(newStatus)) {
                f.setVerificationStatus("verified");
                if (wasNotVerified) {
                    try {
                        Notification notif = Notification.builder()
                                .receiverType("farmer")
                                .receiverId(f.getId())
                                .title("Yêu cầu làm đối tác đã được duyệt!")
                                .content("Chúc mừng! Yêu cầu đăng ký tài khoản nhà vườn (đối tác) của bạn đã được quản trị viên duyệt thành công. Bạn đã có thể bắt đầu sử dụng các tính năng dành cho nhà vườn.")
                                .link("/farmer/dashboard")
                                .createdAt(LocalDateTime.now())
                                .isRead(false)
                                .build();
                        notificationRepository.save(notif);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            } else if ("suspended".equalsIgnoreCase(newStatus) || "rejected".equalsIgnoreCase(newStatus)) {
                f.setVerificationStatus("rejected");
            }
            farmerRepository.save(f);
            
            // Sync status to Customer with same email (lock/unlock)
            customerRepository.findByEmail(f.getEmail()).ifPresent(c -> {
                c.setStatus(newStatus);
                customerRepository.save(c);
            });
            return ResponseEntity.ok().build();

        } else {
            return ResponseEntity.badRequest().body("Invalid role: " + role);
        }
    }

    @DeleteMapping("/{role}/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String role, @PathVariable Long id) {
        String lowerRole = role.toLowerCase();
        if ("admin".equals(lowerRole)) {
            adminRepository.deleteById(id);
            return ResponseEntity.ok().build();
        } else if ("customer".equals(lowerRole)) {
            Customer customer = customerRepository.findById(id).orElse(null);
            if (customer != null) {
                deletePhysicalAvatarFile(customer.getAvatarUrl());
                customerRepository.delete(customer);
            }
            return ResponseEntity.ok().build();
        } else if ("farmer".equals(lowerRole)) {
            Farmer farmer = farmerRepository.findById(id).orElse(null);
            if (farmer != null) {
                // 1. Delete all products and their physical images/files
                List<Product> products = productRepository.findByFarmerIdOrderByCreatedAtDesc(farmer.getId());
                if (products != null) {
                    for (Product product : products) {
                        List<ProductImage> images = productImageRepository.findByProductId(product.getId());
                        if (images != null) {
                            for (ProductImage img : images) {
                                deletePhysicalFile(img.getImgUrl(), "products");
                            }
                            productImageRepository.deleteAll(images);
                        }
                        deletePhysicalFile(product.getTraceabilityImageUrl(), "traceability");
                        productRepository.delete(product);
                    }
                }

                // 2. Delete farmer document files physically
                deletePhysicalFile(farmer.getBusinessRegistrationUrl(), "documents");
                deletePhysicalFile(farmer.getVietgapUrl(), "documents");
                deletePhysicalFile(farmer.getGlobalgapUrl(), "documents");
                deletePhysicalFile(farmer.getOrganicUrl(), "documents");

                // 3. Delete avatar physically
                deletePhysicalAvatarFile(farmer.getAvatarUrl());

                farmerRepository.delete(farmer);
            }
            return ResponseEntity.ok().build();

        } else {
            return ResponseEntity.badRequest().body("Invalid role: " + role);
        }
    }

    private void deletePhysicalAvatarFile(String avatarUrl) {
        if (avatarUrl != null && !avatarUrl.isEmpty() && avatarUrl.contains("/storage/v1/object/public/")) {
            supabaseStorageService.deleteFileByUrl(avatarUrl);
        }
    }

    private void deletePhysicalFile(String fileUrl, String subFolder) {
        if (fileUrl != null && !fileUrl.isEmpty() && fileUrl.contains("/storage/v1/object/public/")) {
            supabaseStorageService.deleteFileByUrl(fileUrl);
        }
    }
}
