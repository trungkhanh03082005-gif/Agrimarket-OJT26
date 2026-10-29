package org.example.agrimarket.controller;

import lombok.*;
import org.example.agrimarket.dto.ProductResponse;
import org.example.agrimarket.model.Farmer;
import org.example.agrimarket.model.Product;
import org.example.agrimarket.model.User;
import org.example.agrimarket.model.WishlistItem;
import org.example.agrimarket.model.FollowedFarmer;
import org.example.agrimarket.repository.FarmerRepository;
import org.example.agrimarket.repository.ProductRepository;
import org.example.agrimarket.repository.UserRepository;
import org.example.agrimarket.repository.WishlistItemRepository;
import org.example.agrimarket.repository.FollowedFarmerRepository;
import org.example.agrimarket.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private WishlistItemRepository wishlistItemRepository;

    @Autowired
    private FollowedFarmerRepository followedFarmerRepository;

    @Autowired
    private ProductService productService;

    // 1. Get wishlist products
    @GetMapping("/products")
    public ResponseEntity<?> getWishlistProducts(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        Optional<User> userOpt = userRepository.findByEmail(principal.getName());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        List<WishlistItem> items = wishlistItemRepository.findByUserId(userOpt.get().getId());
        List<ProductResponse> responses = new ArrayList<>();
        for (WishlistItem item : items) {
            try {
                ProductResponse resp = productService.getProductById(item.getProduct().getId());
                if (resp != null) {
                    responses.add(resp);
                }
            } catch (Exception e) {
                // Skip if product not found or error
            }
        }
        return ResponseEntity.ok(responses);
    }

    // 2. Toggle wishlist product
    @PostMapping("/products/toggle")
    public ResponseEntity<?> toggleWishlistProduct(Principal principal, @RequestParam Long productId) {
        System.out.println(">>> WishlistController: toggleWishlistProduct called, productId = " + productId);
        if (principal == null) {
            System.err.println(">>> WishlistController: principal is NULL!");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        System.out.println(">>> WishlistController: principal name = " + principal.getName());

        try {
            Optional<User> userOpt = userRepository.findByEmail(principal.getName());
            if (userOpt.isEmpty()) {
                System.err.println(">>> WishlistController: User not found for email: " + principal.getName());
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
            }
            System.out.println(">>> WishlistController: User found with ID = " + userOpt.get().getId());

            Optional<Product> productOpt = productRepository.findById(productId);
            if (productOpt.isEmpty()) {
                System.err.println(">>> WishlistController: Product not found with ID = " + productId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Product not found");
            }
            System.out.println(">>> WishlistController: Product found: " + productOpt.get().getName());

            Optional<WishlistItem> existing = wishlistItemRepository.findByUserIdAndProductId(userOpt.get().getId(), productId);
            boolean saved;
            String message;

            if (existing.isPresent()) {
                wishlistItemRepository.delete(existing.get());
                saved = false;
                message = "Đã xóa khỏi danh sách yêu thích.";
                System.out.println(">>> WishlistController: Removed product " + productId + " from wishlist for user " + userOpt.get().getId());
            } else {
                WishlistItem item = WishlistItem.builder()
                        .user(userOpt.get())
                        .product(productOpt.get())
                        .build();
                wishlistItemRepository.save(item);
                saved = true;
                message = "Đã lưu vào danh sách yêu thích.";
                System.out.println(">>> WishlistController: Saved product " + productId + " to wishlist for user " + userOpt.get().getId());
            }

            return ResponseEntity.ok(new ToggleResponse(saved, message));
        } catch (Exception e) {
            System.err.println(">>> WishlistController Exception: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal error: " + e.getMessage());
        }
    }

    // 3. Get wishlist product IDs
    @GetMapping("/products/ids")
    public ResponseEntity<?> getWishlistProductIds(Principal principal) {
        if (principal == null) {
            return ResponseEntity.ok(new ArrayList<Long>());
        }

        Optional<User> userOpt = userRepository.findByEmail(principal.getName());
        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(new ArrayList<Long>());
        }

        List<WishlistItem> items = wishlistItemRepository.findByUserId(userOpt.get().getId());
        List<Long> ids = items.stream().map(item -> item.getProduct().getId()).collect(Collectors.toList());
        return ResponseEntity.ok(ids);
    }

    // 4. Get followed farmers
    @GetMapping("/farmers")
    public ResponseEntity<?> getFollowedFarmers(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        Optional<User> userOpt = userRepository.findByEmail(principal.getName());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        List<FollowedFarmer> items = followedFarmerRepository.findByUserId(userOpt.get().getId());
        List<FarmerDto> responses = items.stream().map(item -> {
            Farmer f = item.getFarmer();
            String name = f.getFarmName() != null && !f.getFarmName().isEmpty() ? f.getFarmName() : f.getFullName();
            String location = f.getFarmAddress() != null && !f.getFarmAddress().isEmpty() ? f.getFarmAddress() : "Chưa có địa chỉ";
            return FarmerDto.builder()
                    .id(f.getId())
                    .name(name)
                    .location(location)
                    .fullName(f.getFullName())
                    .email(f.getEmail())
                    .phone(f.getPhone())
                    .avatarUrl(f.getAvatarUrl())
                    .farmName(f.getFarmName())
                    .farmAddress(f.getFarmAddress())
                    .description(f.getDescription())
                    .ratingAverage(f.getRatingAverage())
                    .totalProducts(f.getTotalProducts())
                    .vietgapUrl(f.getVietgapUrl())
                    .globalgapUrl(f.getGlobalgapUrl())
                    .organicUrl(f.getOrganicUrl())
                    .build();
        }).collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    // 5. Toggle follow farmer
    @PostMapping("/farmers/toggle")
    public ResponseEntity<?> toggleFollowFarmer(Principal principal, @RequestParam Long farmerId) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        try {
            Optional<User> userOpt = userRepository.findByEmail(principal.getName());
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
            }

            Optional<Farmer> farmerOpt = farmerRepository.findById(farmerId);
            if (farmerOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Farmer not found");
            }

            Optional<FollowedFarmer> existing = followedFarmerRepository.findByUserIdAndFarmerId(userOpt.get().getId(), farmerId);
            boolean followed;
            String message;

            if (existing.isPresent()) {
                followedFarmerRepository.delete(existing.get());
                followed = false;
                message = "Đã hủy theo dõi nhà vườn.";
            } else {
                FollowedFarmer item = FollowedFarmer.builder()
                        .user(userOpt.get())
                        .farmer(farmerOpt.get())
                        .build();
                followedFarmerRepository.save(item);
                followed = true;
                message = "Đã theo dõi nhà vườn.";
            }

            return ResponseEntity.ok(new FollowToggleResponse(followed, message));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: " + e.getMessage());
        }
    }

    // 6. Get followed farmer IDs
    @GetMapping("/farmers/ids")
    public ResponseEntity<?> getFollowedFarmerIds(Principal principal) {
        if (principal == null) {
            return ResponseEntity.ok(new ArrayList<Long>());
        }

        Optional<User> userOpt = userRepository.findByEmail(principal.getName());
        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(new ArrayList<Long>());
        }

        List<FollowedFarmer> items = followedFarmerRepository.findByUserId(userOpt.get().getId());
        List<Long> ids = items.stream().map(item -> item.getFarmer().getId()).collect(Collectors.toList());
        return ResponseEntity.ok(ids);
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ToggleResponse {
        private boolean saved;
        private String message;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class FollowToggleResponse {
        private boolean followed;
        private String message;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FarmerDto {
        private Long id;
        private String name;
        private String location;
        private String fullName;
        private String email;
        private String phone;
        private String avatarUrl;
        private String farmName;
        private String farmAddress;
        private String description;
        private Double ratingAverage;
        private Integer totalProducts;
        private String vietgapUrl;
        private String globalgapUrl;
        private String organicUrl;
    }
}
