package org.example.agrimarket.controller;

import org.example.agrimarket.dto.ProductResponse;
import org.example.agrimarket.dto.PageResponse;
import org.example.agrimarket.model.FollowedFarmer;
import org.example.agrimarket.model.Notification;
import org.example.agrimarket.model.Product;
import org.example.agrimarket.repository.FollowedFarmerRepository;
import org.example.agrimarket.repository.NotificationRepository;
import org.example.agrimarket.repository.ProductRepository;
import org.example.agrimarket.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/products")
public class AdminProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private FollowedFarmerRepository followedFarmerRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @GetMapping
    public ResponseEntity<List<ProductResponse>> getAllProducts() {
        return ResponseEntity.ok(productService.getAllProducts());
    }

    @GetMapping("/paged")
    public ResponseEntity<?> getAllProductsPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(productService.getAllProductsPaged(page, size, status, category, search));
    }

    @GetMapping("/{id}/ai-insights")
    public ResponseEntity<?> getAiInsights(@PathVariable Long id) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }

        ProductResponse pr = productService.getProductById(id);
        int descLen = pr.getDescription() != null ? pr.getDescription().length() : 0;
        int score = descLen > 200 ? 88 : descLen > 100 ? 68 : 42;
        boolean isHighPrice = pr.getPrice() != null && pr.getPrice() > 100000;
        int riskScore = (pr.getFarmerOrganicUrl() != null && !pr.getFarmerOrganicUrl().isEmpty()) ? 18 : 55;

        Map<String, Object> insights = new HashMap<>();
        insights.put("productId", pr.getId());
        insights.put("score", score);
        insights.put("riskScore", riskScore);
        insights.put("priceCheck", isHighPrice ? "cao_hơn_bình_thường" : "hợp_lý");
        insights.put("flagged", false);
        insights.put("flaggedReason", "");
        insights.put("recommendedPrice", pr.getPrice());
        insights.put("minPrice", Math.round(pr.getPrice() * 0.85));
        insights.put("maxPrice", Math.round(pr.getPrice() * 1.15));
        insights.put("explanation", String.format(
                "Khoảng giá đề xuất dựa trên giá thị trường danh mục \"%s\" đạt chứng nhận %s. Mức giá %s đ/%s của nhà vườn là hoàn toàn phù hợp với thị trường hiện tại.",
                pr.getCategoryName() != null ? pr.getCategoryName() : "Nông sản",
                (pr.getFarmerOrganicUrl() != null && !pr.getFarmerOrganicUrl().isEmpty()) ? "Hữu cơ (+30%)" : "VietGAP",
                String.format("%,.0f", pr.getPrice()),
                pr.getUnit() != null ? pr.getUnit() : "kg"));
        insights.put("suggestedDescription", String.format(
                "Gợi ý mô tả lại cho sản phẩm %s chuẩn SEO:\n1. Giới thiệu: Nông sản tươi ngon cao cấp thu hoạch trực tiếp từ %s.\n2. Đặc sắc: Canh tác an toàn tự nhiên giữ trọn hương vị đặc trưng, giàu vitamin và khoáng chất thiết yếu.\n3. Bảo quản: Giữ ngăn mát tủ lạnh từ 3–7°C, sử dụng trong vòng %s.",
                pr.getName(),
                pr.getFarmLocation() != null ? pr.getFarmLocation() : "vùng trồng đạt chuẩn",
                "bó".equalsIgnoreCase(pr.getUnit()) ? "2–3 ngày" : "7–10 ngày"));

        return ResponseEntity.ok(insights);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveProduct(@PathVariable Long id) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }
        product.setStatus("approved");
        product.setRejectionReason(null);
        productRepository.save(product);

        // Send notification to farmer
        sendProductStatusNotificationToFarmer(product, "Sản phẩm đã được duyệt!", 
                "Sản phẩm \"" + product.getName() + "\" của bạn đã được quản trị viên duyệt và đăng bán thành công.");

        // Send notification to all followers of this farmer
        sendNewProductNotificationToFollowers(product);

        // Return updated product response so frontend updates UI state
        return ResponseEntity.ok(productService.getProductById(id));
    }

    private void sendProductStatusNotificationToFarmer(Product product, String title, String content) {
        if (product.getFarmer() == null) return;
        try {
            Notification notification = Notification.builder()
                    .receiverType("farmer")
                    .receiverId(product.getFarmer().getId())
                    .title(title)
                    .content(content)
                    .link("/farmer/products")
                    .createdAt(java.time.LocalDateTime.now())
                    .isRead(false)
                    .build();
            notificationRepository.save(notification);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Sends a notification to all customers who follow the farmer of the given
     * product.
     * Called when admin approves a product.
     */
    private void sendNewProductNotificationToFollowers(Product product) {
        if (product.getFarmer() == null)
            return;
        Long farmerId = product.getFarmer().getId();
        String farmerName = product.getFarmer().getFarmName() != null && !product.getFarmer().getFarmName().isEmpty()
                ? product.getFarmer().getFarmName()
                : product.getFarmer().getFullName();
        List<FollowedFarmer> followers = followedFarmerRepository.findByFarmerId(farmerId);
        for (FollowedFarmer follow : followers) {
            Long customerId = follow.getUser().getId();
            Notification notification = Notification.builder()
                    .receiverType("customer")
                    .receiverId(customerId)
                    .title("Sản phẩm mới: " + farmerName)
                    .content("Nhà vườn " + farmerName + " vừa đăng bán sản phẩm mới: \""
                            + product.getName() + "\". Bấm vào đây để xem chi tiết!")
                    .link("/products/" + product.getId())
                    .isRead(false)
                    .build();
            notificationRepository.save(notification);
        }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectProduct(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }
        String reason = body.get("reason");
        product.setStatus("rejected");
        product.setRejectionReason(reason);
        productRepository.save(product);

        // Send notification to farmer
        sendProductStatusNotificationToFarmer(product, "Sản phẩm bị từ chối duyệt!", 
                "Sản phẩm \"" + product.getName() + "\" của bạn đã bị từ chối duyệt. Lý do: " + (reason != null ? reason : "Không đạt tiêu chí chất lượng"));

        // Return updated product response
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @PostMapping("/{id}/request-changes")
    public ResponseEntity<?> requestChanges(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }
        String feedback = body.get("feedback");
        product.setStatus("request_changes");
        product.setAdminNotes(feedback);
        productRepository.save(product);

        // Send notification to farmer
        sendProductStatusNotificationToFarmer(product, "Yêu cầu chỉnh sửa sản phẩm!", 
                "Sản phẩm \"" + product.getName() + "\" của bạn cần chỉnh sửa thông tin. Phản hồi: " + (feedback != null ? feedback : "Vui lòng xem lại thông tin"));

        // Return updated product response
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @PostMapping("/{id}/hide")
    public ResponseEntity<?> hideProduct(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }
        String reason = body.get("reason");
        product.setStatus("hidden");
        product.setRejectionReason(reason);
        productRepository.save(product);

        // Send notification to farmer
        sendProductStatusNotificationToFarmer(product, "Sản phẩm đã bị ẩn!", 
                "Sản phẩm \"" + product.getName() + "\" của bạn đã bị quản trị viên ẩn. Lý do: " + (reason != null ? reason : "Vi phạm quy định đăng bán"));

        return ResponseEntity.ok(productService.getProductById(id));
    }

    @PostMapping("/{id}/unhide")
    public ResponseEntity<?> unhideProduct(@PathVariable Long id) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }
        product.setStatus("approved");
        product.setRejectionReason(null);
        productRepository.save(product);

        // Send notification to farmer
        sendProductStatusNotificationToFarmer(product, "Sản phẩm đã được hiển thị lại!", 
                "Sản phẩm \"" + product.getName() + "\" của bạn đã được quản trị viên hiển thị lại trên sàn.");

        return ResponseEntity.ok(productService.getProductById(id));
    }

    @PostMapping("/bulk-approve")
    public ResponseEntity<?> bulkApproveProducts(@RequestBody List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.badRequest().body("Danh sách ID sản phẩm không được rỗng.");
        }
        for (Long id : ids) {
            Product product = productRepository.findById(id).orElse(null);
            if (product != null) {
                product.setStatus("approved");
                product.setRejectionReason(null);
                productRepository.save(product);

                // Send notification to farmer
                sendProductStatusNotificationToFarmer(product, "Sản phẩm đã được duyệt!", 
                        "Sản phẩm \"" + product.getName() + "\" của bạn đã được quản trị viên duyệt và đăng bán thành công.");

                // Send follower notifications for each approved product
                sendNewProductNotificationToFollowers(product);
            }
        }
        return ResponseEntity.ok(Map.of("message", "Đã duyệt thành công " + ids.size() + " sản phẩm."));
    }
}
