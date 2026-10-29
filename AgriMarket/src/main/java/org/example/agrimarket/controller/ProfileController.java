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
        // 1. preorder_item
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM preorder_item WHERE preorder_id IN (SELECT id FROM preorder WHERE customer_id = ?)", customerId);
        }
        if (farmerId != null) {
            jdbcTemplate.update("DELETE FROM preorder_item WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
        }

        // 2. preorder
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM preorder WHERE customer_id = ?", customerId);
        }

        // 3. wishlist
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM wishlist WHERE customer_id = ?", customerId);
        }
        if (farmerId != null) {
            jdbcTemplate.update("DELETE FROM wishlist WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
        }

        // 5. checkout_item
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM checkout_item WHERE checkout_id IN (SELECT id FROM checkout_session WHERE customer_id = ?)", customerId);
        }
        if (farmerId != null) {
            jdbcTemplate.update("DELETE FROM checkout_item WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
        }

        // 6. checkout_session
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM checkout_session WHERE customer_id = ?", customerId);
        }

        // 7. cart_item
        jdbcTemplate.update("DELETE FROM cart_item WHERE cart_id IN (SELECT id FROM cart WHERE email = ?)", email);

        // 8. cart
        jdbcTemplate.update("DELETE FROM cart WHERE email = ?", email);

        // 9. customer_address
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM customer_address WHERE customer_id = ?", customerId);
        }

        // 10. farmer_follow
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM farmer_follow WHERE customer_id = ?", customerId);
        }
        if (farmerId != null) {
            jdbcTemplate.update("DELETE FROM farmer_follow WHERE farmer_id = ?", farmerId);
        }

        // 11. messages
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversation WHERE customer_id = ?)", customerId);
        }
        if (farmerId != null) {
            jdbcTemplate.update("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversation WHERE farmer_id = ?)", farmerId);
        }

        // 12. conversation
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM conversation WHERE customer_id = ?", customerId);
        }
        if (farmerId != null) {
            jdbcTemplate.update("DELETE FROM conversation WHERE farmer_id = ?", farmerId);
        }

        // 13. AI_message
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM AI_message WHERE conversation_id IN (SELECT id FROM AI_conversation WHERE customer_id = ?)", customerId);
        }

        // 14. AI_conversation
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM AI_conversation WHERE customer_id = ?", customerId);
        }

        // 15. AI_search_history
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM AI_search_history WHERE customer_id = ?", customerId);
        }

        // 16. product_view_history
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM product_view_history WHERE customer_id = ?", customerId);
        }
        if (farmerId != null) {
            jdbcTemplate.update("DELETE FROM product_view_history WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
        }

        // 17. AI_recommendation
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM AI_recommendation WHERE customer_id = ?", customerId);
        }
        if (farmerId != null) {
            jdbcTemplate.update("DELETE FROM AI_recommendation WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
        }

        // 18. voucher_usage
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM voucher_usage WHERE customer_id = ?", customerId);
        }

        // 19. Order related tables
        List<Long> orderIds = new java.util.ArrayList<>();
        if (customerId != null) {
            orderIds.addAll(jdbcTemplate.queryForList("SELECT id FROM orders WHERE customer_id = ?", Long.class, customerId));
        }
        if (farmerId != null) {
            orderIds.addAll(jdbcTemplate.queryForList("SELECT DISTINCT order_id FROM order_item WHERE farmer_id = ?", Long.class, farmerId));
        }
        orderIds = orderIds.stream().distinct().collect(java.util.stream.Collectors.toList());

        if (!orderIds.isEmpty()) {
            String idsCsv = orderIds.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));
            jdbcTemplate.update("DELETE FROM payment WHERE order_id IN (" + idsCsv + ")");
            jdbcTemplate.update("DELETE FROM product_review WHERE order_id IN (" + idsCsv + ")");
            jdbcTemplate.update("DELETE FROM order_item WHERE order_id IN (" + idsCsv + ")");
            jdbcTemplate.update("DELETE FROM orders WHERE id IN (" + idsCsv + ")");
        }

        // Cleanup reviews not linked to orders
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM product_review WHERE customer_id = ?", customerId);
        }
        if (farmerId != null) {
            jdbcTemplate.update("DELETE FROM product_review WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
        }

        // 26. product_discount, product_image, AI_content_moderation, AI_product_description_history, AI_price_suggestion, livestream_product, livestream, product
        if (farmerId != null) {
            jdbcTemplate.update("DELETE FROM product_discount WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
            jdbcTemplate.update("DELETE FROM product_image WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
            jdbcTemplate.update("DELETE FROM AI_content_moderation WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId);
            jdbcTemplate.update("DELETE FROM AI_product_description_history WHERE farmer_id = ? OR product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId, farmerId);
            jdbcTemplate.update("DELETE FROM AI_price_suggestion WHERE farmer_id = ? OR product_id IN (SELECT id FROM product WHERE farmer_id = ?)", farmerId, farmerId);
            jdbcTemplate.update("DELETE FROM livestream_product WHERE product_id IN (SELECT id FROM product WHERE farmer_id = ?) OR livestream_id IN (SELECT id FROM livestream WHERE farmer_id = ?)", farmerId, farmerId);
            jdbcTemplate.update("DELETE FROM livestream WHERE farmer_id = ?", farmerId);
            jdbcTemplate.update("DELETE FROM product WHERE farmer_id = ?", farmerId);
        }

        // 34. otp_verification
        jdbcTemplate.update("DELETE FROM otp_verification WHERE email = ?", email);

        // 35. notification
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM notification WHERE receiver_id = ? AND receiver_type = 'customer'", customerId);
        }
        if (farmerId != null) {
            jdbcTemplate.update("DELETE FROM notification WHERE receiver_id = ? AND receiver_type = 'farmer'", farmerId);
        }

        // Finally delete from customer and farmer tables
        if (customerId != null) {
            jdbcTemplate.update("DELETE FROM customer WHERE id = ?", customerId);
        }
        if (farmerId != null) {
            jdbcTemplate.update("DELETE FROM farmer WHERE id = ?", farmerId);
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
