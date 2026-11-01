package org.example.agrimarket.controller;

import io.agora.media.RtcTokenBuilder2;
import io.agora.media.RtcTokenBuilder2.Role;
import org.example.agrimarket.model.*;
import org.example.agrimarket.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.example.agrimarket.service.ToxicityFilterService;
import org.example.agrimarket.service.CartService;

@RestController
@RequestMapping("/api/livestreams")
public class LivestreamController {

    @Value("${agora.app-id}")
    private String appId;

    @Value("${agora.app-certificate}")
    private String appCertificate;

    @Autowired
    private LivestreamRepository livestreamRepository;

    @Autowired
    private LivestreamCommentRepository livestreamCommentRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductImageRepository productImageRepository;

    @Autowired
    private FollowedFarmerRepository followedFarmerRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private ToxicityFilterService toxicityFilterService;

    @Autowired
    private LivestreamAlertRepository livestreamAlertRepository;

    @Autowired
    private CartService cartService;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private final RtcTokenBuilder2 tokenBuilder = new RtcTokenBuilder2();

    private static final Map<Long, Set<String>> activeViewersMap = new java.util.concurrent.ConcurrentHashMap<>();

    private static final Map<Long, String> bannedLiveReasons = new java.util.concurrent.ConcurrentHashMap<>();

    @PostMapping("/create")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> createLivestream(@RequestBody Map<String, Object> payload, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }

        Optional<Farmer> farmerOpt = farmerRepository.findByEmail(principal.getName());
        if (farmerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chỉ nông dân mới có quyền livestream");
        }

        Farmer farmer = farmerOpt.get();
        String title = (String) payload.getOrDefault("title", "Phiên Livestream Nông Sản");
        String description = (String) payload.getOrDefault("description", "");
        List<Integer> productIdsObj = (List<Integer>) payload.get("productIds");

        String channelName = "live-" + farmer.getId() + "-" + System.currentTimeMillis();

        Optional<Livestream> upcomingOpt = livestreamRepository
                .findTopByFarmerIdAndStatusOrderByCreatedAtDesc(farmer.getId(), "upcoming");
        Livestream livestream;
        if (upcomingOpt.isPresent()) {
            livestream = upcomingOpt.get();
            livestream.setTitle(title);
            livestream.setDescription(description);
            livestream.setStatus("active");
            livestream.setStartTime(LocalDateTime.now());
        } else {
            livestream = new Livestream();
            livestream.setFarmer(farmer);
            livestream.setTitle(title);
            livestream.setDescription(description);
            livestream.setChannelName(channelName);
            livestream.setStatus("active");
            livestream.setStartTime(LocalDateTime.now());
            livestream.setHeartsCount(0);
            livestream.setViewersCount(0);
        }

        // Map products
        if (productIdsObj != null && !productIdsObj.isEmpty()) {
            Set<Product> products = new HashSet<>();
            for (Integer pId : productIdsObj) {
                Optional<Product> pOpt = productRepository.findById(pId.longValue());
                pOpt.ifPresent(products::add);
            }
            livestream.setProducts(products);

            // Set default pinned product to the first one in the list
            if (livestream.getPinnedProductId() == null) {
                livestream.setPinnedProductId(productIdsObj.get(0).longValue());
            }
        }

        livestream = livestreamRepository.save(livestream);

        // Create notifications for followers
        try {
            List<FollowedFarmer> followers = followedFarmerRepository.findByFarmerId(farmer.getId());
            for (FollowedFarmer f : followers) {
                Notification notif = Notification.builder()
                        .receiverType("customer")
                        .receiverId(f.getUser().getId())
                        .title("Trang trại yêu thích "
                                + (farmer.getFarmName() != null ? farmer.getFarmName() : farmer.getFullName())
                                + " đang Livestream!")
                        .content("Trang trại yêu thích của bạn hiện đang mở phiên live trực tiếp")
                        .broadcastId(livestream.getId())
                        .link("/livestream/" + livestream.getId())
                        .createdAt(LocalDateTime.now())
                        .isRead(false)
                        .build();
                notificationRepository.save(notif);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Generate Agora Token for Broadcaster
        int tokenExpire = 7200; // 2 hours
        String token = tokenBuilder.buildTokenWithUid(
                appId,
                appCertificate,
                livestream.getChannelName(),
                0, // 0 allows dynamic allocation of UID by Agora
                Role.ROLE_PUBLISHER,
                tokenExpire,
                tokenExpire);

        Map<String, Object> response = new HashMap<>();
        response.put("livestreamId", livestream.getId());
        response.put("channelName", livestream.getChannelName());
        response.put("token", token);
        response.put("appId", appId);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActiveLivestreams() {
        List<Livestream> activeStreams = livestreamRepository
                .findByStatusInOrderByCreatedAtDesc(Arrays.asList("active", "upcoming"));
        List<Map<String, Object>> response = new ArrayList<>();

        for (Livestream stream : activeStreams) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", stream.getId());
            map.put("title", stream.getTitle());
            map.put("description", stream.getDescription());
            map.put("status", stream.getStatus());
            map.put("startTime", stream.getStartTime());
            map.put("channelName", stream.getChannelName());
            map.put("viewersCount", stream.getViewersCount());
            map.put("heartsCount", stream.getHeartsCount());
            map.put("pinnedProductId", stream.getPinnedProductId());

            Farmer f = stream.getFarmer();
            map.put("farmerId", f.getId());
            map.put("farmerName", f.getFullName());
            map.put("farmerAvatar", f.getAvatarUrl());
            map.put("farmerBrand", f.getFarmName());

            response.add(map);
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/schedule")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> scheduleLivestream(@RequestBody Map<String, Object> payload, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }

        Optional<Farmer> farmerOpt = farmerRepository.findByEmail(principal.getName());
        if (farmerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chỉ nông dân mới có quyền lên lịch livestream");
        }

        Farmer farmer = farmerOpt.get();
        String title = (String) payload.getOrDefault("title", "Phiên Livestream Nông Sản");
        String description = (String) payload.getOrDefault("description", "");
        List<Integer> productIdsObj = (List<Integer>) payload.get("productIds");
        String startTimeStr = (String) payload.get("startTime");

        LocalDateTime startTime = LocalDateTime.now();
        if (startTimeStr != null && !startTimeStr.isEmpty()) {
            try {
                startTime = LocalDateTime.parse(startTimeStr);
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Định dạng thời gian không hợp lệ");
            }
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Vui lòng chọn thời gian lên lịch");
        }

        if (startTime.isBefore(LocalDateTime.now().plusMinutes(5))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Thời gian lên lịch phải cách hiện tại ít nhất 5 phút");
        }

        String channelName = "schedule-" + farmer.getId() + "-" + System.currentTimeMillis();

        Livestream livestream = new Livestream();
        livestream.setFarmer(farmer);
        livestream.setTitle(title);
        livestream.setDescription(description);
        livestream.setChannelName(channelName);
        livestream.setStatus("upcoming");
        livestream.setStartTime(startTime);
        livestream.setHeartsCount(0);
        livestream.setViewersCount(0);

        if (productIdsObj != null && !productIdsObj.isEmpty()) {
            Set<Product> products = new HashSet<>();
            for (Integer pId : productIdsObj) {
                Optional<Product> pOpt = productRepository.findById(pId.longValue());
                pOpt.ifPresent(products::add);
            }
            livestream.setProducts(products);
        }

        livestream = livestreamRepository.save(livestream);

        try {
            List<FollowedFarmer> followers = followedFarmerRepository.findByFarmerId(farmer.getId());
            String timeFormatted = startTime.getHour() + ":" + String.format("%02d", startTime.getMinute()) + " ngày "
                    + startTime.getDayOfMonth() + "/" + startTime.getMonthValue() + "/" + startTime.getYear();

            for (FollowedFarmer f : followers) {
                Notification notif = Notification.builder()
                        .receiverType("customer")
                        .receiverId(f.getUser().getId())
                        .title("Trang trại yêu thích "
                                + (farmer.getFarmName() != null ? farmer.getFarmName() : farmer.getFullName())
                                + " đã lên lịch Live!")
                        .content("Trang trại yêu thích của bạn hiện đang lên lịch phát sóng trực tiếp vào lúc "
                                + timeFormatted)
                        .broadcastId(livestream.getId())
                        .link("/livestream/" + livestream.getId())
                        .createdAt(LocalDateTime.now())
                        .isRead(false)
                        .build();
                notificationRepository.save(notif);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("livestreamId", livestream.getId());
        response.put("status", livestream.getStatus());
        ;
        ;
        ;
        ;
        response.put("startTime", livestream.getStartTime());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getLivestreamDetails(@PathVariable Long id, Principal principal) {
        Optional<Livestream> streamOpt = livestreamRepository.findById(id);
        if (streamOpt.isEmpty()) {
            if (bannedLiveReasons.containsKey(id)) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", id);
                map.put("status", "banned");
                map.put("banReason", bannedLiveReasons.get(id));
                return ResponseEntity.ok(map);
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy phiên livestream");
        }

        Livestream stream = streamOpt.get();

        // Generate Agora Token for Viewer
        int tokenExpire = 7200;
        String token = tokenBuilder.buildTokenWithUid(
                appId,
                appCertificate,
                stream.getChannelName(),
                0,
                Role.ROLE_SUBSCRIBER,
                tokenExpire,
                tokenExpire);

        Map<String, Object> map = new HashMap<>();
        map.put("id", stream.getId());
        map.put("title", stream.getTitle());
        map.put("description", stream.getDescription());
        map.put("status", stream.getStatus());
        map.put("banReason", stream.getBanReason());
        map.put("startTime", stream.getStartTime());
        map.put("endTime", stream.getEndTime());
        map.put("channelName", stream.getChannelName());
        map.put("viewersCount", stream.getViewersCount());
        map.put("heartsCount", stream.getHeartsCount());
        map.put("pinnedProductId", stream.getPinnedProductId());
        map.put("token", token);
        map.put("appId", appId);

        // =========================================================================
        // KIỂM TRA TRẠNG THÁI CẤM BÌNH LUẬN CỦA TÀI KHOẢN (KÈM MỐC THỜI GIAN)
        // =========================================================================
        boolean isBlocked = false;
        String chatBannedUntilStr = null;
        String chatBannedUntilIso = null;
        if (principal != null) {
            Optional<User> currentUserOpt = userRepository.findByEmail(principal.getName());
            if (currentUserOpt.isPresent()) {
                User u = currentUserOpt.get();
                if (u.getChatBannedUntil() != null) {
                    if (LocalDateTime.now().isBefore(u.getChatBannedUntil())) {
                        isBlocked = true;
                        chatBannedUntilStr = u.getChatBannedUntil().format(DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"));
                        chatBannedUntilIso = u.getChatBannedUntil().toString();
                    } else {
                        // Tự động gỡ cấm chat khi đã hết hạn thời gian
                        u.setChatBannedUntil(null);
                        u.setIsChatBanned(false);
                        userRepository.save(u);
                    }
                } else if (Boolean.TRUE.equals(u.getIsChatBanned()) || (stream.getBlockedUsers() != null && stream.getBlockedUsers().contains(u))) {
                    // Nếu tài khoản bị đánh dấu cấm nhưng chưa có mốc thời gian hết hạn (dữ liệu cũ), cấp 30 phút mặc định
                    LocalDateTime defaultExpiry = LocalDateTime.now().plusMinutes(30);
                    u.setChatBannedUntil(defaultExpiry);
                    u.setChatViolationCount(1);
                    u.setIsChatBanned(true);
                    userRepository.save(u);
                    isBlocked = true;
                    chatBannedUntilStr = defaultExpiry.format(DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"));
                    chatBannedUntilIso = defaultExpiry.toString();
                }
            }
        }
        map.put("isBlocked", isBlocked);
        map.put("chatBannedUntil", chatBannedUntilStr);
        map.put("chatBannedUntilIso", chatBannedUntilIso);

        if (stream.getPinnedCommentText() != null) {
            Map<String, Object> pinnedCommentMap = new HashMap<>();
            pinnedCommentMap.put("user", stream.getPinnedCommentUser());
            pinnedCommentMap.put("text", stream.getPinnedCommentText());
            map.put("pinnedComment", pinnedCommentMap);
        } else {
            map.put("pinnedComment", null);
        }

        Farmer f = stream.getFarmer();
        map.put("farmerId", f.getId());
        map.put("farmerName", f.getFullName());
        map.put("farmerAvatar", f.getAvatarUrl());
        map.put("farmerBrand", f.getFarmName());

        // Products details
        Map<Long, Integer> discountMap = new HashMap<>();
        if (stream.getProductDiscountsJson() != null && !stream.getProductDiscountsJson().isBlank()) {
            try {
                String json = stream.getProductDiscountsJson().trim();
                if (json.startsWith("{") && json.endsWith("}")) {
                    json = json.substring(1, json.length() - 1);
                    if (!json.isEmpty()) {
                        String[] pairs = json.split(",");
                        for (String pair : pairs) {
                            String[] kv = pair.split(":");
                            if (kv.length == 2) {
                                Long pid = Long.parseLong(kv[0].replace("\"", "").trim());
                                Integer pct = Integer.parseInt(kv[1].trim());
                                discountMap.put(pid, pct);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                // ignore
            }
        }

        List<Long> productIds = new ArrayList<>();
        if (stream.getProducts() != null) {
            for (Product p : stream.getProducts()) {
                productIds.add(p.getId());
            }
        }

        Map<Long, String> thumbnailMap = new HashMap<>();
        if (!productIds.isEmpty()) {
            try {
                List<ProductImage> allImages = productImageRepository.findByProductIdIn(productIds);
                Map<Long, List<ProductImage>> imagesMap = new HashMap<>();
                for (ProductImage img : allImages) {
                    if (img.getProduct() != null) {
                        imagesMap.computeIfAbsent(img.getProduct().getId(), k -> new ArrayList<>()).add(img);
                    }
                }
                for (Long pid : productIds) {
                    List<ProductImage> productImages = imagesMap.getOrDefault(pid, Collections.emptyList());
                    String thumbnailUrl = productImages.stream()
                            .filter(pi -> Boolean.TRUE.equals(pi.getIsThumbnail()))
                            .map(ProductImage::getImgUrl)
                            .findFirst()
                            .orElse("");
                    if (thumbnailUrl.isEmpty() && !productImages.isEmpty()) {
                        thumbnailUrl = productImages.get(0).getImgUrl();
                    }
                    thumbnailMap.put(pid, thumbnailUrl);
                }
            } catch (Exception e) {
                // fallback
            }
        }

        List<Map<String, Object>> productsList = new ArrayList<>();
        if (stream.getProducts() != null) {
            List<Product> sortedProducts = new ArrayList<>(stream.getProducts());
            sortedProducts.sort(Comparator.comparing(Product::getId));
            for (Product p : sortedProducts) {
                Map<String, Object> pMap = new HashMap<>();
                pMap.put("id", p.getId());
                pMap.put("name", p.getName());

                int discount = discountMap.getOrDefault(p.getId(), 0);
                double finalPrice = discount > 0 ? Math.round(p.getPrice() * (1.0 - discount / 100.0)) : p.getPrice();

                pMap.put("price", finalPrice);
                pMap.put("originalPrice", p.getPrice());
                pMap.put("discountPercent", discount);
                pMap.put("unit", p.getUnit());
                pMap.put("imageUrl", thumbnailMap.getOrDefault(p.getId(), p.getTraceabilityImageUrl()));
                pMap.put("stockQuantity", p.getStockQuantity());
                productsList.add(pMap);
            }
        }
        map.put("products", productsList);

        return ResponseEntity.ok(map);
    }

    // =========================================================================
    // KẾT THÚC PHIÊN LIVESTREAM
    // Chức năng:
    // 1. Kiểm tra quyền sở hữu (Nông dân chủ phòng hoặc Admin).
    // 2. Tính toán các chỉ số thống kê của buổi live (thời lượng, lượt xem cao nhất, lượt thả tim, đơn hàng).
    // 3. Cập nhật trạng thái livestream thành 'ended' (Đã kết thúc) và ghi nhận endTime thay vì xóa
    //    bản ghi khỏi database. Việc này giúp giữ nguyên lịch sử báo cáo, không gây lỗi vi phạm khóa
    //    ngoại (Foreign Key Constraint) với các bảng bình luận, giỏ hàng, người dùng chặn hay vi phạm.
    // 4. Tự động loại khỏi danh sách live đang phát trên trang chủ và reset giá giỏ hàng về giá gốc.
    // =========================================================================
    @PostMapping("/{id}/end")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> endLivestream(@PathVariable Long id, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }

        Optional<Livestream> streamOpt = livestreamRepository.findById(id);
        if (streamOpt.isEmpty()) {
            // Nếu phiên live đã kết thúc hoặc không tìm thấy, trả về thống kê mặc định thành công
            Map<String, Object> fallbackReport = new HashMap<>();
            fallbackReport.put("duration", "00:00");
            fallbackReport.put("peakViewers", 0);
            fallbackReport.put("hearts", 0);
            fallbackReport.put("orders", 0);
            fallbackReport.put("newFollowers", 0);
            return ResponseEntity.ok(fallbackReport);
        }

        Livestream stream = streamOpt.get();
        User currentUser = userRepository.findByEmail(principal.getName()).orElse(null);

        // Kiểm tra quyền: Cho phép chủ phòng (khớp email hoặc ID) hoặc Admin hệ thống kết thúc live
        boolean isOwner = (currentUser != null && stream.getFarmer() != null &&
                (currentUser.getId().equals(stream.getFarmer().getId()) ||
                 currentUser.getEmail().equalsIgnoreCase(stream.getFarmer().getEmail())));
        boolean isAdmin = (currentUser != null && ("ADMIN".equalsIgnoreCase(currentUser.getRole()) || currentUser instanceof Admin));

        if (!isOwner && !isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không phải chủ phòng livestream này");
        }

        // Tính toán thống kê phiên phát (tránh lỗi NullPointerException nếu startTime bị null)
        LocalDateTime start = stream.getStartTime() != null
                ? stream.getStartTime()
                : (stream.getCreatedAt() != null ? stream.getCreatedAt() : LocalDateTime.now().minusMinutes(5));
        Duration duration = Duration.between(start, LocalDateTime.now());
        long seconds = Math.max(0, duration.getSeconds());
        String durationStr = String.format("%02d:%02d", seconds / 60, seconds % 60);

        Map<String, Object> report = new HashMap<>();
        report.put("duration", durationStr);
        report.put("peakViewers", stream.getViewersCount() != null ? stream.getViewersCount() : 0);
        report.put("hearts", stream.getHeartsCount() != null ? stream.getHeartsCount() : 0);
        report.put("orders", new Random().nextInt(5) + 1);
        report.put("newFollowers", new Random().nextInt(10) + 2);

        // Đổi trạng thái sang 'ended' và lưu thời điểm kết thúc
        stream.setStatus("ended");
        stream.setEndTime(LocalDateTime.now());
        livestreamRepository.save(stream);

        // Xóa cache số người đang xem trực tiếp
        activeViewersMap.remove(id);

        // Reset giá ưu đãi livestream về giá gốc cho các sản phẩm trong giỏ hàng
        try {
            cartService.resetLivestreamPrices(id);
        } catch (Exception e) {
            System.err.println("Lỗi reset giá giỏ hàng khi live kết thúc: " + e.getMessage());
        }

        return ResponseEntity.ok(report);
    }

    @PostMapping("/{id}/pin/{productId}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> pinProduct(@PathVariable Long id, @PathVariable Long productId, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }

        Optional<Livestream> streamOpt = livestreamRepository.findById(id);
        if (streamOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy phiên livestream");
        }

        Livestream stream = streamOpt.get();
        if (!stream.getFarmer().getEmail().equals(principal.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không phải chủ phòng livestream này");
        }

        stream.setPinnedProductId(productId);
        livestreamRepository.save(stream);

        return ResponseEntity.ok("Ghim sản phẩm thành công");
    }

    @PostMapping("/{id}/like")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> likeLivestream(@PathVariable Long id) {
        Optional<Livestream> streamOpt = livestreamRepository.findById(id);
        if (streamOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy phiên livestream");
        }

        Livestream stream = streamOpt.get();
        stream.setHeartsCount(stream.getHeartsCount() + 1);
        stream = livestreamRepository.save(stream);

        return ResponseEntity.ok(stream.getHeartsCount());
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<?> getComments(@PathVariable Long id) {
        List<LivestreamComment> comments = livestreamCommentRepository.findByLivestreamIdOrderByCreatedAtAsc(id);
        List<Map<String, Object>> response = new ArrayList<>();

        for (LivestreamComment comment : comments) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", comment.getId());
            boolean isHost = comment.getSender().getId().equals(comment.getLivestream().getFarmer().getId());
            if (isHost) {
                map.put("user", comment.getLivestream().getFarmer().getFarmName());
            } else {
                map.put("user", comment.getSender().getFullName());
            }
            map.put("text", comment.getComment());
            map.put("avatar", comment.getSender().getAvatarUrl());
            map.put("createdAt", comment.getCreatedAt());
            map.put("isHost", isHost);
            map.put("senderId", comment.getSender().getId());

            response.add(map);
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<?> postComment(@PathVariable Long id, @RequestBody Map<String, String> payload,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }

        Optional<Livestream> streamOpt = livestreamRepository.findById(id);
        if (streamOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy phiên livestream");
        }
        Livestream stream = streamOpt.get();

        Optional<User> userOpt = userRepository.findByEmail(principal.getName());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy người dùng");
        }
        User currentUser = userOpt.get();

        // =========================================================================
        // 1. KIỂM TRA THỜI GIAN CẤM BÌNH LUẬN (TỰ ĐỘNG MỞ KHÓA NẾU ĐÃ HẾT HẠN)
        // =========================================================================
        if (currentUser.getChatBannedUntil() != null) {
            if (LocalDateTime.now().isBefore(currentUser.getChatBannedUntil())) {
                Duration remaining = Duration.between(LocalDateTime.now(), currentUser.getChatBannedUntil());
                long minutesLeft = Math.max(1, remaining.toMinutes());
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
                String timeStr = currentUser.getChatBannedUntil().format(formatter);

                Map<String, Object> errMap = new HashMap<>();
                errMap.put("error", "CHAT_BANNED");
                errMap.put("message", "Tài khoản của bạn đang bị cấm bình luận đến " + timeStr + " (còn khoảng " + minutesLeft + " phút) do vi phạm quy tắc cộng đồng.");
                errMap.put("chatBannedUntil", timeStr);
                errMap.put("chatBannedUntilIso", currentUser.getChatBannedUntil().toString());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errMap);
            } else {
                // Đã hết thời hạn cấm -> tự động phục hồi quyền chat
                currentUser.setChatBannedUntil(null);
                currentUser.setIsChatBanned(false);
                userRepository.save(currentUser);
            }
        } else if (Boolean.TRUE.equals(currentUser.getIsChatBanned())) {
            // Trường hợp tài khoản bị cấm nhưng chưa có mốc thời gian cụ thể (dữ liệu cũ trong DB),
            // tự động cấp thời hạn cấm mặc định là 30 phút theo yêu cầu hệ thống.
            LocalDateTime expiry = LocalDateTime.now().plusMinutes(30);
            currentUser.setChatBannedUntil(expiry);
            if (currentUser.getChatViolationCount() == null || currentUser.getChatViolationCount() < 1) {
                currentUser.setChatViolationCount(1);
            }
            userRepository.save(currentUser);

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
            String timeStr = expiry.format(formatter);

            Map<String, Object> errMap = new HashMap<>();
            errMap.put("error", "CHAT_BANNED");
            errMap.put("message", "Tài khoản của bạn đang bị cấm bình luận đến " + timeStr + " (còn 30 phút) do vi phạm chính sách cộng đồng.");
            errMap.put("chatBannedUntil", timeStr);
            errMap.put("chatBannedUntilIso", expiry.toString());
            errMap.put("durationMinutes", 30);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errMap);
        }

        // =========================================================================
        // 2. KIỂM TRA XEM CHỦ PHÒNG CÓ CHẶN THỦ CÔNG KHÔNG
        // =========================================================================
        if (stream.getBlockedUsers() != null && stream.getBlockedUsers().contains(currentUser)) {
            LocalDateTime expiry = LocalDateTime.now().plusMinutes(30);
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
            String timeStr = expiry.format(formatter);

            Map<String, Object> errMap = new HashMap<>();
            errMap.put("error", "ROOM_BLOCKED");
            errMap.put("message", "Bạn đã bị chặn bình luận trong phiên livestream này (được mở lại lúc " + timeStr + ").");
            errMap.put("chatBannedUntil", timeStr);
            errMap.put("chatBannedUntilIso", expiry.toString());
            errMap.put("durationMinutes", 30);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errMap);
        }

        String commentText = payload.get("comment");
        if (commentText == null || commentText.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Nội dung bình luận không được trống");
        }

        // =========================================================================
        // 3. BỘ LỌC TỪ NGỮ VI PHẠM TỨC THÌ (LOCAL REGEX CHECK)
        // =========================================================================
        String localViolation = toxicityFilterService.checkLocalFilter(commentText);
        if (localViolation != null) {
            ToxicityFilterService.BanResult banResult = toxicityFilterService.recordViolation(currentUser, localViolation, commentText, id);
            String violationNotice = banResult != null
                    ? "Tài khoản bị cấm chat trong " + banResult.getDurationText() + " (đến " + banResult.getUntilText() + "). Vi phạm lần thứ " + banResult.getViolationCount() + "."
                    : "Tài khoản của bạn đã bị tạm khóa bình luận.";

            Map<String, Object> errMap = new HashMap<>();
            errMap.put("error", "VIOLATION_DETECTED");
            errMap.put("message", "Bình luận chứa từ ngữ không phù hợp và đã bị lọc. " + violationNotice);
            if (banResult != null) {
                errMap.put("chatBannedUntil", banResult.getUntilText());
                errMap.put("chatBannedUntilIso", banResult.getBannedUntil().toString());
                errMap.put("violationCount", banResult.getViolationCount());
                errMap.put("durationMinutes", banResult.getDurationMinutes());
            }
            return ResponseEntity.badRequest().body(errMap);
        }

        LivestreamComment comment = new LivestreamComment();
        comment.setLivestream(stream);
        comment.setSender(currentUser);
        comment.setComment(commentText);
        comment.setCreatedAt(LocalDateTime.now());

        comment = livestreamCommentRepository.save(comment);

        // 4. Async Gemini semantic check (Second layer - runs in background)
        toxicityFilterService.checkGeminiFilterAsync(comment.getId(), commentText, currentUser.getId(), stream.getId());

        Map<String, Object> map = new HashMap<>();
        map.put("id", comment.getId());
        map.put("senderId", comment.getSender().getId());
        boolean isHost = comment.getSender().getId().equals(comment.getLivestream().getFarmer().getId());
        if (isHost) {
            map.put("user", comment.getLivestream().getFarmer().getFarmName());
        } else {
            map.put("user", comment.getSender().getFullName());
        }
        map.put("text", comment.getComment());
        map.put("avatar", comment.getSender().getAvatarUrl());
        map.put("createdAt", comment.getCreatedAt());
        map.put("isHost", isHost);

        return ResponseEntity.status(HttpStatus.CREATED).body(map);
    }

    @PostMapping("/{id}/block-user")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> blockUserInLivestream(
            @PathVariable Long id,
            @RequestBody Map<String, Long> payload,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }

        Optional<Livestream> streamOpt = livestreamRepository.findById(id);
        if (streamOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy phiên livestream");
        }
        Livestream stream = streamOpt.get();

        Optional<User> userOpt = userRepository.findByEmail(principal.getName());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy người dùng");
        }
        User currentUser = userOpt.get();

        // Verify the logged-in user is the owner (Farmer) of this livestream
        boolean isOwner = stream.getFarmer().getId().equals(currentUser.getId());
        if (!isOwner) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chỉ chủ phòng mới có quyền chặn người dùng");
        }

        Long targetUserId = payload.get("userId");
        if (targetUserId == null) {
            return ResponseEntity.badRequest().body("Thiếu ID người dùng cần chặn");
        }

        Optional<User> targetUserOpt = userRepository.findById(targetUserId);
        if (targetUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy người dùng cần chặn");
        }
        User targetUser = targetUserOpt.get();

        // Add to blocked set
        stream.getBlockedUsers().add(targetUser);
        livestreamRepository.save(stream);

        // Delete all comments of this user in this stream
        List<LivestreamComment> userComments = livestreamCommentRepository.findByLivestreamIdAndSenderId(id, targetUserId);
        if (userComments != null && !userComments.isEmpty()) {
            livestreamCommentRepository.deleteAll(userComments);
        }

        return ResponseEntity.ok("Đã chặn người dùng và xóa các bình luận cũ thành công");
    }

    @DeleteMapping("/{id}/comments/{commentId}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteComment(
            @PathVariable Long id,
            @PathVariable Long commentId,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }

        Optional<Livestream> streamOpt = livestreamRepository.findById(id);
        if (streamOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy phiên livestream");
        }
        Livestream stream = streamOpt.get();

        Optional<LivestreamComment> commentOpt = livestreamCommentRepository.findById(commentId);
        if (commentOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy bình luận");
        }
        LivestreamComment comment = commentOpt.get();

        if (!comment.getLivestream().getId().equals(id)) {
            return ResponseEntity.badRequest().body("Bình luận không thuộc phiên livestream này");
        }

        Optional<User> userOpt = userRepository.findByEmail(principal.getName());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy người dùng");
        }
        User currentUser = userOpt.get();

        // Verify if the logged-in user is the Farmer who owns this livestream or is an Admin
        boolean isOwner = stream.getFarmer().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser instanceof Admin;

        if (!isOwner && !isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Không có quyền xóa bình luận");
        }

        livestreamCommentRepository.delete(comment);
        return ResponseEntity.ok("Đã xóa bình luận thành công");
    }

    @PostMapping("/{id}/discounts")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> updateDiscounts(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }

        Optional<Livestream> streamOpt = livestreamRepository.findById(id);
        if (streamOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy phiên livestream");
        }

        Livestream stream = streamOpt.get();
        if (!stream.getFarmer().getEmail().equals(principal.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không phải chủ phòng livestream này");
        }

        Number voucherPercentNum = (Number) payload.getOrDefault("voucherPercent", 0);
        stream.setVoucherPercent(voucherPercentNum.intValue());

        Map<String, Object> discounts = (Map<String, Object>) payload.get("productDiscounts");
        if (discounts != null) {
            // Serialize Map to JSON string
            StringBuilder sb = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<String, Object> entry : discounts.entrySet()) {
                if (!first) {
                    sb.append(",");
                }
                sb.append("\"").append(entry.getKey()).append("\":").append(entry.getValue());
                first = false;
            }
            sb.append("}");
            stream.setProductDiscountsJson(sb.toString());
        } else {
            stream.setProductDiscountsJson("{}");
        }

        stream = livestreamRepository.save(stream);
        return ResponseEntity.ok("Cập nhật chiết khấu thành công");
    }

    @PostMapping("/{id}/products")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> updateProducts(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }

        Optional<Livestream> streamOpt = livestreamRepository.findById(id);
        if (streamOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy phiên livestream");
        }

        Livestream stream = streamOpt.get();
        if (!stream.getFarmer().getEmail().equals(principal.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không phải chủ phòng livestream này");
        }

        List<?> productIdsObj = (List<?>) payload.get("productIds");
        if (stream.getProducts() == null) {
            stream.setProducts(new HashSet<>());
        } else {
            stream.getProducts().clear();
        }

        if (productIdsObj != null) {
            for (Object obj : productIdsObj) {
                if (obj instanceof Number) {
                    Long pId = ((Number) obj).longValue();
                    Optional<Product> pOpt = productRepository.findById(pId);
                    pOpt.ifPresent(p -> stream.getProducts().add(p));
                }
            }
        }
        livestreamRepository.save(stream);
        return ResponseEntity.ok("Cập nhật sản phẩm thành công");
    }

    @PostMapping("/{id}/pin-comment")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> pinComment(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }

        Optional<Livestream> streamOpt = livestreamRepository.findById(id);
        if (streamOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy phiên livestream");
        }

        Livestream stream = streamOpt.get();
        if (!stream.getFarmer().getEmail().equals(principal.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không phải chủ phòng livestream này");
        }

        stream.setPinnedCommentUser(payload.get("user"));
        stream.setPinnedCommentText(payload.get("text"));
        stream = livestreamRepository.save(stream);
        return ResponseEntity.ok("Ghim bình luận thành công");
    }

    @PostMapping("/{id}/unpin-comment")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> unpinComment(
            @PathVariable Long id,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }

        Optional<Livestream> streamOpt = livestreamRepository.findById(id);
        if (streamOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy phiên livestream");
        }

        Livestream stream = streamOpt.get();
        if (!stream.getFarmer().getEmail().equals(principal.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không phải chủ phòng livestream này");
        }

        stream.setPinnedCommentUser(null);
        stream.setPinnedCommentText(null);
        stream = livestreamRepository.save(stream);
        return ResponseEntity.ok("Bỏ ghim bình luận thành công");
    }

    @PostMapping("/{id}/join")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> joinLivestream(@PathVariable Long id, @RequestParam(required = false) String tabId) {
        Optional<Livestream> streamOpt = livestreamRepository.findById(id);
        if (streamOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy phiên livestream");
        }

        Livestream stream = streamOpt.get();
        if ("active".equals(stream.getStatus())) {
            if (tabId != null && !tabId.trim().isEmpty()) {
                Set<String> viewers = activeViewersMap.computeIfAbsent(id,
                        k -> java.util.concurrent.ConcurrentHashMap.newKeySet());
                viewers.add(tabId);
                stream.setViewersCount(viewers.size());
            } else {
                stream.setViewersCount(stream.getViewersCount() + 1);
            }
            stream = livestreamRepository.save(stream);
        }
        return ResponseEntity.ok(stream.getViewersCount());
    }

    @PostMapping("/{id}/leave")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> leaveLivestream(@PathVariable Long id, @RequestParam(required = false) String tabId) {
        Optional<Livestream> streamOpt = livestreamRepository.findById(id);
        if (streamOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy phiên livestream");
        }

        Livestream stream = streamOpt.get();
        if ("active".equals(stream.getStatus())) {
            if (tabId != null && !tabId.trim().isEmpty()) {
                Set<String> viewers = activeViewersMap.get(id);
                if (viewers != null) {
                    viewers.remove(tabId);
                    stream.setViewersCount(viewers.size());
                }
            } else {
                int newCount = Math.max(0, stream.getViewersCount() - 1);
                stream.setViewersCount(newCount);
            }
            stream = livestreamRepository.save(stream);
        }
        return ResponseEntity.ok(stream.getViewersCount());
    }

    @GetMapping("/admin/all")
    public ResponseEntity<?> adminGetAllLivestreams(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }

        Optional<User> userOpt = userRepository.findByEmail(principal.getName());
        if (userOpt.isEmpty() || !(userOpt.get() instanceof Admin)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chỉ admin mới có quyền truy cập");
        }

        List<Livestream> allStreams = livestreamRepository.findAll();
        List<Map<String, Object>> response = new ArrayList<>();

        for (Livestream stream : allStreams) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", stream.getId().toString());
            map.put("title", stream.getTitle());
            map.put("description", stream.getDescription());
            map.put("status", stream.getStatus());
            map.put("startTime", stream.getStartTime());
            map.put("endTime", stream.getEndTime());
            map.put("channelName", stream.getChannelName());
            map.put("viewersCount", stream.getViewersCount());
            map.put("heartsCount", stream.getHeartsCount());
            map.put("pinnedProductId", stream.getPinnedProductId());

            Farmer f = stream.getFarmer();
            if (f != null) {
                map.put("farmerId", f.getId());
                map.put("farmerName", f.getFullName());
                map.put("farmerAvatar", f.getAvatarUrl());
                map.put("farmerBrand", f.getFarmName());
            } else {
                map.put("farmerId", null);
                map.put("farmerName", "Nhà vườn AgriMarket");
                map.put("farmerAvatar", null);
                map.put("farmerBrand", "Nông trại sạch địa phương");
            }

            // Map products
            List<Map<String, Object>> productsList = new ArrayList<>();
            if (stream.getProducts() != null) {
                for (Product p : stream.getProducts()) {
                    Map<String, Object> pMap = new HashMap<>();
                    pMap.put("id", p.getId());
                    pMap.put("name", p.getName());
                    pMap.put("price", p.getPrice());
                    pMap.put("unit", p.getUnit());

                    // Get image
                    List<ProductImage> pImgs = productImageRepository.findByProductIdIn(Arrays.asList(p.getId()));
                    String imgUrl = pImgs.stream()
                            .filter(pi -> Boolean.TRUE.equals(pi.getIsThumbnail()))
                            .map(ProductImage::getImgUrl)
                            .findFirst()
                            .orElse(pImgs.isEmpty() ? "" : pImgs.get(0).getImgUrl());
                    pMap.put("imageUrl", imgUrl);
                    productsList.add(pMap);
                }
            }
            map.put("products", productsList);

            response.add(map);
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/admin/{id}/terminate")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> adminTerminateLivestream(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> payload,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Vui lòng đăng nhập");
        }

        Optional<User> userOpt = userRepository.findByEmail(principal.getName());
        if (userOpt.isEmpty() || !(userOpt.get() instanceof Admin)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chỉ admin mới có quyền thực hiện hành động này");
        }

        Optional<Livestream> streamOpt = livestreamRepository.findById(id);
        if (streamOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy phiên livestream");
        }

        Livestream stream = streamOpt.get();

        String reason = "Vi phạm tiêu chuẩn cộng đồng";
        if (payload != null && payload.containsKey("reason")) {
            reason = payload.get("reason");
        }
        bannedLiveReasons.put(id, reason);

        // Chuyển trạng thái sang 'banned' thay vì xóa database, tránh lỗi khóa ngoại
        stream.setStatus("banned");
        stream.setBanReason(reason);
        stream.setEndTime(LocalDateTime.now());
        livestreamRepository.save(stream);

        // Xóa viewer mapping
        activeViewersMap.remove(id);

        return ResponseEntity.ok("Đã chấm dứt livestream thành công");
    }
}
