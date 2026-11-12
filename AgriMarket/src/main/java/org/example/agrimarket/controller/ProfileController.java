package org.example.agrimarket.controller;

import org.example.agrimarket.dto.ChangePasswordRequest;
import org.example.agrimarket.model.Admin;
import org.example.agrimarket.model.Customer;
import org.example.agrimarket.model.Farmer;
import org.example.agrimarket.model.Product;
import org.example.agrimarket.model.ProductImage;
import org.example.agrimarket.repository.AdminRepository;
import org.example.agrimarket.repository.CustomerRepository;
import org.example.agrimarket.repository.FarmerRepository;
import org.example.agrimarket.repository.ProductRepository;
import org.example.agrimarket.repository.ProductImageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

import org.example.agrimarket.service.SupabaseStorageService;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductImageRepository productImageRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/me")
    public ResponseEntity<?> getMe(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        String email = principal.getName();

        org.springframework.security.core.Authentication auth = 
            org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        
        boolean isFarmer = auth != null && auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_FARMER"));
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        // 1. Try Farmer (if registered as farmer, they are a farmer)
        Optional<Farmer> farmer = farmerRepository.findByEmail(email);
        if (farmer.isPresent()) {
            Farmer f = farmer.get();
            f.setRole("farmer");
            Optional<Customer> customerOpt = customerRepository.findByEmail(email);
            if (customerOpt.isPresent()) {
                f.setAddresses(customerOpt.get().getAddresses());
            }
            return ResponseEntity.ok(f);
        }

        // 2. Try Admin
        if (isAdmin) {
            Optional<Admin> admin = adminRepository.findByEmail(email);
            if (admin.isPresent()) {
                Admin a = admin.get();
                a.setRole("admin");
                return ResponseEntity.ok(a);
            }
        }

        // 3. Try Customer
        Optional<Customer> customer = customerRepository.findByEmail(email);
        if (customer.isPresent()) {
            Customer c = customer.get();
            c.setRole("customer");
            return ResponseEntity.ok(c);
        }


        Optional<Admin> admin = adminRepository.findByEmail(email);
        if (admin.isPresent()) {
            Admin a = admin.get();
            a.setRole("admin");
            return ResponseEntity.ok(a);
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(Principal principal, @RequestBody ChangePasswordRequest request) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        String email = principal.getName();

        Optional<Customer> customerOpt = customerRepository.findByEmail(email);
        Optional<Farmer> farmerOpt = farmerRepository.findByEmail(email);
        Optional<Admin> adminOpt = adminRepository.findByEmail(email);

        boolean passwordChecked = false;
        String encodedNewPassword = passwordEncoder.encode(request.getNewPassword());

        if (customerOpt.isPresent()) {
            Customer customer = customerOpt.get();
            boolean requiresCurrentPassword = customer.getPasswordSet() == null || customer.getPasswordSet();
            if (requiresCurrentPassword) {
                if (request.getCurrentPassword() == null || !passwordEncoder.matches(request.getCurrentPassword(), customer.getPassword())) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Mật khẩu hiện tại không chính xác.");
                }
            }
            customer.setPassword(encodedNewPassword);
            customer.setPasswordSet(true);
            customerRepository.save(customer);
            passwordChecked = true;
        }

        if (farmerOpt.isPresent()) {
            Farmer farmer = farmerOpt.get();
            if (!passwordChecked) {
                boolean requiresCurrentPassword = farmer.getPasswordSet() == null || farmer.getPasswordSet();
                if (requiresCurrentPassword) {
                    if (request.getCurrentPassword() == null || !passwordEncoder.matches(request.getCurrentPassword(), farmer.getPassword())) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Mật khẩu hiện tại không chính xác.");
                    }
                }
                passwordChecked = true;
            }
            farmer.setPassword(encodedNewPassword);
            farmer.setPasswordSet(true);
            farmerRepository.save(farmer);
        }

        if (adminOpt.isPresent()) {
            Admin admin = adminOpt.get();
            if (!passwordEncoder.matches(request.getCurrentPassword(), admin.getPassword())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Mật khẩu hiện tại không chính xác.");
            }
            admin.setPassword(encodedNewPassword);
            adminRepository.save(admin);
            passwordChecked = true;
        }

        if (passwordChecked) {
            return ResponseEntity.ok("Đổi mật khẩu thành công.");
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
    }

    @DeleteMapping("/delete-account")
    public ResponseEntity<?> deleteAccount(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        String email = principal.getName();

        Optional<Customer> customerOpt = customerRepository.findByEmail(email);
        Optional<Farmer> farmerOpt = farmerRepository.findByEmail(email);
        Optional<Admin> adminOpt = adminRepository.findByEmail(email);

        if (adminOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Không thể xóa tài khoản Admin.");
        }

        boolean hasCustomer = customerOpt.isPresent();
        boolean hasFarmer = farmerOpt.isPresent();

        if (!hasCustomer && !hasFarmer) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        // Collect all physical files to delete after database deletions succeed
        List<String> filesToDeleteProducts = new java.util.ArrayList<>();
        List<String> filesToDeleteTraceability = new java.util.ArrayList<>();
        List<String> filesToDeleteDocuments = new java.util.ArrayList<>();
        List<String> avatarsToDelete = new java.util.ArrayList<>();

        if (hasCustomer) {
            Customer customer = customerOpt.get();
            if (customer.getAvatarUrl() != null) {
                avatarsToDelete.add(customer.getAvatarUrl());
            }
        }

        if (hasFarmer) {
            Farmer farmer = farmerOpt.get();
            if (farmer.getAvatarUrl() != null) {
                avatarsToDelete.add(farmer.getAvatarUrl());
            }
            if (farmer.getBusinessRegistrationUrl() != null) {
                filesToDeleteDocuments.add(farmer.getBusinessRegistrationUrl());
            }
            if (farmer.getVietgapUrl() != null) {
                filesToDeleteDocuments.add(farmer.getVietgapUrl());
            }
            if (farmer.getGlobalgapUrl() != null) {
                filesToDeleteDocuments.add(farmer.getGlobalgapUrl());
            }
            if (farmer.getOrganicUrl() != null) {
                filesToDeleteDocuments.add(farmer.getOrganicUrl());
            }

            List<Product> products = productRepository.findByFarmerIdOrderByCreatedAtDesc(farmer.getId());
            if (products != null) {
                for (Product product : products) {
                    if (product.getTraceabilityImageUrl() != null) {
                        filesToDeleteTraceability.add(product.getTraceabilityImageUrl());
                    }
                    List<ProductImage> images = productImageRepository.findByProductId(product.getId());
                    if (images != null) {
                        for (ProductImage img : images) {
                            if (img.getImgUrl() != null) {
                                filesToDeleteProducts.add(img.getImgUrl());
                            }
                        }
                    }
                }
            }
        }

        try {
            Long customerId = hasCustomer ? customerOpt.get().getId() : null;
            Long farmerId = hasFarmer ? farmerOpt.get().getId() : null;

            // Perform transactional database cleanup
            deleteUserDataFromDatabase(email, customerId, farmerId);

            // If DB cleanup succeeds, delete files physically
            for (String url : avatarsToDelete) {
                deletePhysicalAvatarFile(url);
            }
            for (String url : filesToDeleteDocuments) {
                deletePhysicalFile(url, "documents");
            }
            for (String url : filesToDeleteTraceability) {
                deletePhysicalFile(url, "traceability");
            }
            for (String url : filesToDeleteProducts) {
                deletePhysicalFile(url, "products");
            }

            return ResponseEntity.ok("Xóa tài khoản thành công.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Lỗi hệ thống khi xóa dữ liệu tài khoản: " + e.getMessage());
        }
    }

    @Transactional
    public void deleteUserDataFromDatabase(String email, Long customerId, Long farmerId) {
        Long userId = customerId != null ? customerId : farmerId;
        if (userId == null) {
            try {
                userId = jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
            } catch (Exception ignored) {}
        }

        // 1. preorder_item
        if (tableExists("preorder_item")) {
            if (customerId != null) {
                safeExecute("DELETE FROM preorder_item WHERE preorder_id IN (SELECT id FROM preorder WHERE customer_id = ?)", customerId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM preorder_item WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
            }
        }

        // 2. preorder
        if (tableExists("preorder") && customerId != null) {
            safeExecute("DELETE FROM preorder WHERE customer_id = ?", customerId);
        }

        // 3. wishlist
        if (tableExists("wishlist")) {
            if (customerId != null) {
                safeExecute("DELETE FROM wishlist WHERE customer_id = ?", customerId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM wishlist WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
            }
        }

        // 4. cart_item & cart
        if (tableExists("cart_item")) {
            safeExecute("DELETE FROM cart_item WHERE cart_id IN (SELECT id FROM cart WHERE email = ?)", email);
            if (farmerId != null) {
                safeExecute("DELETE FROM cart_item WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
            }
        }
        if (tableExists("cart")) {
            safeExecute("DELETE FROM cart WHERE email = ?", email);
        }

        // 5. customer_address
        if (tableExists("customer_address") && customerId != null) {
            safeExecute("DELETE FROM customer_address WHERE customer_id = ?", customerId);
        }

        // 6. farmer_follow
        if (tableExists("farmer_follow")) {
            if (customerId != null) {
                safeExecute("DELETE FROM farmer_follow WHERE customer_id = ?", customerId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM farmer_follow WHERE farmer_id = ?", farmerId);
            }
        }

        // 7. messages / message & conversation
        String msgTable = tableExists("messages") ? "messages" : (tableExists("message") ? "message" : null);
        if (msgTable != null) {
            if (customerId != null) {
                safeExecute("DELETE FROM " + msgTable + " WHERE conversation_id IN (SELECT id FROM conversation WHERE customer_id = ?)", customerId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM " + msgTable + " WHERE conversation_id IN (SELECT id FROM conversation WHERE farmer_id = ?)", farmerId);
            }
            if (userId != null) {
                safeExecute("DELETE FROM " + msgTable + " WHERE sender_id = ?", userId);
            }
        }
        if (tableExists("conversation")) {
            if (customerId != null) {
                safeExecute("DELETE FROM conversation WHERE customer_id = ?", customerId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM conversation WHERE farmer_id = ?", farmerId);
            }
        }

        // 8. AI tables
        if (tableExists("ai_message") && customerId != null) {
            safeExecute("DELETE FROM ai_message WHERE conversation_id IN (SELECT id FROM ai_conversation WHERE customer_id = ?)", customerId);
        }
        if (tableExists("ai_conversation") && customerId != null) {
            safeExecute("DELETE FROM ai_conversation WHERE customer_id = ?", customerId);
        }
        if (tableExists("ai_search_history") && customerId != null) {
            safeExecute("DELETE FROM ai_search_history WHERE customer_id = ?", customerId);
        }
        if (tableExists("product_view_history")) {
            if (customerId != null) {
                safeExecute("DELETE FROM product_view_history WHERE customer_id = ?", customerId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM product_view_history WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
            }
        }
        if (tableExists("ai_recommendation")) {
            if (customerId != null) {
                safeExecute("DELETE FROM ai_recommendation WHERE customer_id = ?", customerId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM ai_recommendation WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
            }
        }

        // 9. voucher_usage & promotions
        if (tableExists("voucher_usage") && customerId != null) {
            safeExecute("DELETE FROM voucher_usage WHERE customer_id = ?", customerId);
        }
        if (farmerId != null) {
            if (tableExists("promotion_product")) {
                safeExecute("DELETE FROM promotion_product WHERE promotion_id IN (SELECT id FROM promotion WHERE farmer_id = ?) OR product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId, farmerId);
            }
            if (tableExists("promotion")) {
                safeExecute("DELETE FROM promotion WHERE farmer_id = ?", farmerId);
            }
        }

        // 10. Order related tables (product_review_images, product_review_tags, product_review, order_item, orders, payment, order_group)
        if (tableExists("product_review_images")) {
            if (customerId != null) {
                safeExecute("DELETE FROM product_review_images WHERE review_id IN (SELECT id FROM product_review WHERE customer_id = ?)", customerId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM product_review_images WHERE review_id IN (SELECT id FROM product_review WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?))", farmerId);
            }
        }

        if (tableExists("product_review_tags")) {
            if (customerId != null) {
                safeExecute("DELETE FROM product_review_tags WHERE review_id IN (SELECT id FROM product_review WHERE customer_id = ?)", customerId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM product_review_tags WHERE review_id IN (SELECT id FROM product_review WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?))", farmerId);
            }
        }

        if (tableExists("product_review")) {
            if (customerId != null) {
                safeExecute("DELETE FROM product_review WHERE customer_id = ?", customerId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM product_review WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
            }
        }

        if (tableExists("order_item")) {
            if (customerId != null) {
                safeExecute("DELETE FROM order_item WHERE order_id IN (SELECT id FROM orders WHERE customer_id = ?)", customerId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM order_item WHERE farmer_id = ? OR product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId, farmerId);
            }
        }

        if (tableExists("orders")) {
            if (customerId != null) {
                safeExecute("DELETE FROM orders WHERE customer_id = ?", customerId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM orders WHERE farmer_id = ?", farmerId);
            }
        }

        if (tableExists("payment")) {
            if (customerId != null && tableExists("order_group")) {
                safeExecute("DELETE FROM payment WHERE order_group_id IN (SELECT id FROM order_group WHERE customer_id = ?)", customerId);
            }
        }

        if (tableExists("order_group") && customerId != null) {
            safeExecute("DELETE FROM order_group WHERE customer_id = ?", customerId);
        }

        // 11. Livestream & moderation logs
        if (tableExists("livestream_blocked_users")) {
            if (userId != null) {
                safeExecute("DELETE FROM livestream_blocked_users WHERE user_id = ?", userId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM livestream_blocked_users WHERE livestream_id IN (SELECT id FROM livestream WHERE farmer_id = ?)", farmerId);
            }
        }
        if (tableExists("livestream_comment")) {
            if (userId != null) {
                safeExecute("DELETE FROM livestream_comment WHERE sender_id = ?", userId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM livestream_comment WHERE livestream_id IN (SELECT id FROM livestream WHERE farmer_id = ?)", farmerId);
            }
        }
        if (tableExists("livestream_alert") && farmerId != null) {
            safeExecute("DELETE FROM livestream_alert WHERE livestream_id IN (SELECT id FROM livestream WHERE farmer_id = ?)", farmerId);
        }
        if (tableExists("chat_violation_log")) {
            if (userId != null) {
                safeExecute("DELETE FROM chat_violation_log WHERE user_id = ?", userId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM chat_violation_log WHERE livestream_id IN (SELECT id FROM livestream WHERE farmer_id = ?)", farmerId);
            }
        }
        if (tableExists("livestream_product") && farmerId != null) {
            safeExecute("DELETE FROM livestream_product WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?) OR livestream_id IN (SELECT id FROM livestream WHERE farmer_id = ?)", farmerId, farmerId);
        }
        if (tableExists("livestream") && farmerId != null) {
            safeExecute("DELETE FROM livestream WHERE farmer_id = ?", farmerId);
        }

        // 12. Farmer products & related metadata
        if (farmerId != null) {
            if (tableExists("product_discount")) {
                safeExecute("DELETE FROM product_discount WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
            }
            if (tableExists("product_image")) {
                safeExecute("DELETE FROM product_image WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
            }
            if (tableExists("ai_content_moderation")) {
                safeExecute("DELETE FROM ai_content_moderation WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
            }
            if (tableExists("ai_product_description_history")) {
                safeExecute("DELETE FROM ai_product_description_history WHERE farmer_id = ? OR product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId, farmerId);
            }
            if (tableExists("ai_price_suggestion")) {
                safeExecute("DELETE FROM ai_price_suggestion WHERE farmer_id = ? OR product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId, farmerId);
            }
            if (tableExists("product")) {
                safeExecute("DELETE FROM product WHERE farmer_id = ?", farmerId);
            }
        }

        // 13. Support & Reports
        if (tableExists("support_message") && userId != null) {
            safeExecute("DELETE FROM support_message WHERE sender_id = ? OR support_request_id IN (SELECT id FROM support_request WHERE sender_id = ?)", userId, userId);
        }
        if (tableExists("support_request") && userId != null) {
            safeExecute("DELETE FROM support_request WHERE sender_id = ?", userId);
        }
        if (tableExists("report")) {
            if (userId != null) {
                safeExecute("DELETE FROM report WHERE reporter_id = ?", userId);
            }
            if (customerId != null) {
                safeExecute("DELETE FROM report WHERE target_type = 'customer' AND target_id = ?", customerId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM report WHERE target_type = 'farmer' AND target_id = ?", farmerId);
            }
        }

        // 14. Notifications & OTP
        if (tableExists("otp_verification")) {
            safeExecute("DELETE FROM otp_verification WHERE LOWER(email) = LOWER(?)", email);
        }
        if (tableExists("admin_notification") && userId != null) {
            safeExecute("DELETE FROM admin_notification WHERE target_user_id = ?", userId);
        }
        if (tableExists("notification")) {
            if (userId != null) {
                safeExecute("DELETE FROM notification WHERE receiver_id = ?", userId);
            }
            if (customerId != null) {
                safeExecute("DELETE FROM notification WHERE receiver_id = ? AND receiver_type = 'customer'", customerId);
            }
            if (farmerId != null) {
                safeExecute("DELETE FROM notification WHERE receiver_id = ? AND receiver_type = 'farmer'", farmerId);
            }
        }

        // 15. Finally delete from farmer, customer, and users tables
        if (tableExists("farmer")) {
            if (farmerId != null) {
                safeExecute("DELETE FROM farmer WHERE id = ?", farmerId);
            }
            safeExecute("DELETE FROM farmer WHERE id IN (SELECT id FROM users WHERE LOWER(email) = LOWER(?))", email);
        }
        if (tableExists("customer")) {
            if (customerId != null) {
                safeExecute("DELETE FROM customer WHERE id = ?", customerId);
            }
            safeExecute("DELETE FROM customer WHERE id IN (SELECT id FROM users WHERE LOWER(email) = LOWER(?))", email);
        }
        if (tableExists("users")) {
            if (userId != null) {
                safeExecute("DELETE FROM users WHERE id = ?", userId);
            }
            safeExecute("DELETE FROM users WHERE LOWER(email) = LOWER(?)", email);
        }
    }

    private boolean tableExists(String tableName) {
        try {
            Boolean exists = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND LOWER(table_name) = LOWER(?))",
                Boolean.class,
                tableName
            );
            return Boolean.TRUE.equals(exists);
        } catch (Exception e) {
            return false;
        }
    }

    private void safeExecute(String sql, Object... params) {
        try {
            jdbcTemplate.update(sql, params);
        } catch (Exception e) {
            System.err.println("Notice: Could not execute SQL [" + sql + "]: " + e.getMessage());
        }
    }

    private void deletePhysicalAvatarFile(String avatarUrl) {
        try {
            if (avatarUrl != null && !avatarUrl.isEmpty() && avatarUrl.contains("/storage/v1/object/public/")) {
                supabaseStorageService.deleteFileByUrl(avatarUrl);
            }
        } catch (Exception e) {
            System.err.println("Warning: Could not delete avatar from storage: " + e.getMessage());
        }
    }

    private void deletePhysicalFile(String fileUrl, String subFolder) {
        try {
            if (fileUrl != null && !fileUrl.isEmpty() && fileUrl.contains("/storage/v1/object/public/")) {
                supabaseStorageService.deleteFileByUrl(fileUrl);
            }
        } catch (Exception e) {
            System.err.println("Warning: Could not delete physical file from storage: " + e.getMessage());
        }
    }
}
