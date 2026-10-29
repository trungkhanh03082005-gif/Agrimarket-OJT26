package org.example.agrimarket.service;

import org.example.agrimarket.dto.AuthResponse;
import org.example.agrimarket.dto.FarmerRegistrationRequest;
import org.example.agrimarket.dto.UpdateFarmerProfileRequest;
import org.example.agrimarket.model.Customer;
import org.example.agrimarket.model.Farmer;
import org.example.agrimarket.repository.CustomerRepository;
import org.example.agrimarket.repository.FarmerRepository;
import org.example.agrimarket.repository.ProductRepository;
import org.example.agrimarket.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class FarmerService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public org.example.agrimarket.dto.FarmerDashboardStatsResponse getDashboardStats(String email) {
        long totalProducts = productRepository.countByFarmerEmail(email);
        long lowStockCount = productRepository.countByFarmerEmailAndStockQuantityLessThanEqual(email, 5);
        long pendingOrdersCount = orderRepository.countByFarmerEmailAndStatusIn(email, java.util.List.of("pending", "confirmed"));
        Double totalSales = orderRepository.sumAmountByFarmerEmailAndStatus(email, "delivered");

        return org.example.agrimarket.dto.FarmerDashboardStatsResponse.builder()
                .totalProducts(totalProducts)
                .lowStockCount(lowStockCount)
                .pendingOrdersCount(pendingOrdersCount)
                .totalSales(totalSales != null ? totalSales : 0.0)
                .build();
    }

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    @Transactional
    public AuthResponse registerAsFarmer(String email, FarmerRegistrationRequest request) {
        if (farmerRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Tài khoản nhà vườn đã tồn tại với email này.");
        }

        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản khách hàng tương ứng."));

        Long userId = customer.getId();

        // Bước 1: Cập nhật user_type trong bảng users thành FARMER
        jdbcTemplate.update(
                "UPDATE users SET user_type = 'FARMER', status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                userId);

        // Bước 2: Insert vào bảng farmer với cùng id
        jdbcTemplate.update(
                "INSERT INTO farmer (id, farm_name, farm_address, description, identity_card, " +
                        "business_registration_url, vietgap_url, globalgap_url, organic_url, verification_status, " +
                        "rating_average, total_products, max_delivery_distance, latitude, longitude) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0.0, 0, ?, ?, ?)",
                userId,
                request.getFarmName(),
                request.getFarmAddress(),
                request.getDescription(),
                request.getIdentityCard(),
                request.getBusinessRegistrationUrl(),
                request.getVietgapUrl(),
                request.getGlobalgapUrl(),
                request.getOrganicUrl(),
                request.getMaxDeliveryDistance() != null ? request.getMaxDeliveryDistance() : 50.0,
                request.getLatitude(),
                request.getLongitude());

        // Bước 3: Build Farmer object thủ công để tránh JPA cache conflict
        // (sau JDBC native SQL, EntityManager vẫn cache entity cũ nên findById không hoạt động đúng)
        Farmer savedFarmer = new Farmer();
        savedFarmer.setId(userId);
        savedFarmer.setEmail(customer.getEmail());
        savedFarmer.setFullName(customer.getFullName());
        savedFarmer.setPhone(customer.getPhone());
        savedFarmer.setPassword(customer.getPassword());
        savedFarmer.setAvatarUrl(customer.getAvatarUrl());
        savedFarmer.setCreatedAt(customer.getCreatedAt());
        savedFarmer.setStatus("pending");
        savedFarmer.setFarmName(request.getFarmName());
        savedFarmer.setFarmAddress(request.getFarmAddress());
        savedFarmer.setDescription(request.getDescription());
        savedFarmer.setIdentityCard(request.getIdentityCard());
        savedFarmer.setBusinessRegistrationUrl(request.getBusinessRegistrationUrl());
        savedFarmer.setVietgapUrl(request.getVietgapUrl());
        savedFarmer.setGlobalgapUrl(request.getGlobalgapUrl());
        savedFarmer.setOrganicUrl(request.getOrganicUrl());
        savedFarmer.setVerificationStatus("pending");
        savedFarmer.setRatingAverage(0.0);
        savedFarmer.setTotalProducts(0);
        savedFarmer.setMaxDeliveryDistance(request.getMaxDeliveryDistance() != null ? request.getMaxDeliveryDistance() : 50.0);
        savedFarmer.setLatitude(request.getLatitude());
        savedFarmer.setLongitude(request.getLongitude());
        savedFarmer.setPasswordSet(true);
        savedFarmer.setRole("farmer");

        String token = jwtUtil.generateToken(email, "farmer");

        AuthResponse authResponse = new AuthResponse();
        authResponse.setToken(token);
        authResponse.setUser(savedFarmer);

        return authResponse;
    }

    public Optional<Farmer> findById(Long id) {
        Optional<Farmer> farmer = farmerRepository.findById(id);
        farmer.ifPresent(f -> f.setRole("farmer"));
        return farmer;
    }

    @Transactional
    public Farmer updateProfile(Long id, UpdateFarmerProfileRequest request) {
        Farmer existing = farmerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Farmer not found"));

        System.out.println("DEBUG UPDATE_PROFILE (Farmer): updating farmer id=" + id);

        if (request.getFullName() != null) {
            existing.setFullName(request.getFullName());
        }
        if (request.getPhone() != null) {
            String trimmedPhone = request.getPhone().trim();
            existing.setPhone(trimmedPhone.isEmpty() ? null : trimmedPhone);
        }
        if (request.getAvatarUrl() != null) {
            String newAvatar = request.getAvatarUrl();
            String oldAvatar = existing.getAvatarUrl();
            if (!newAvatar.equals(oldAvatar)) {
                deletePhysicalAvatarFile(oldAvatar);
                existing.setAvatarUrl(newAvatar.isEmpty() ? null : newAvatar);
            }
        }
        if (request.getFarmName() != null) {
            existing.setFarmName(request.getFarmName());
        }
        if (request.getFarmAddress() != null) {
            existing.setFarmAddress(request.getFarmAddress());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription());
        }
        if (request.getIdentityCard() != null) {
            existing.setIdentityCard(request.getIdentityCard());
        }
        if (request.getMaxDeliveryDistance() != null) {
            existing.setMaxDeliveryDistance(request.getMaxDeliveryDistance());
        }
        if (request.getLatitude() != null) {
            existing.setLatitude(request.getLatitude());
        }
        if (request.getLongitude() != null) {
            existing.setLongitude(request.getLongitude());
        }

        // Business Registration URL: field was present in request (even if null = clear
        // it)
        if (request.isBusinessRegistrationUrlPresent()) {
            String newBizUrl = request.getBusinessRegistrationUrl();
            String oldBizUrl = existing.getBusinessRegistrationUrl();
            if (oldBizUrl != null && !oldBizUrl.equals(newBizUrl)) {
                deletePhysicalDocumentFile(oldBizUrl);
                System.out.println("DEBUG: Deleted old businessRegistrationUrl file: " + oldBizUrl);
            }
            existing.setBusinessRegistrationUrl(newBizUrl);
            System.out.println("DEBUG: Set businessRegistrationUrl to: " + newBizUrl);
        }

        // VietGAP URL: field was present in request (null = unchecked, clear it)
        if (request.isVietgapUrlPresent()) {
            String newVietgap = request.getVietgapUrl();
            String oldVietgap = existing.getVietgapUrl();
            if (oldVietgap != null && !oldVietgap.equals(newVietgap)) {
                deletePhysicalDocumentFile(oldVietgap);
                System.out.println("DEBUG: Deleted old vietgapUrl file: " + oldVietgap);
            }
            existing.setVietgapUrl(newVietgap);
            System.out.println("DEBUG: Set vietgapUrl to: " + newVietgap);
        }

        // GlobalGAP URL: field was present in request (null = unchecked, clear it)
        if (request.isGlobalgapUrlPresent()) {
            String newGlobalgap = request.getGlobalgapUrl();
            String oldGlobalgap = existing.getGlobalgapUrl();
            if (oldGlobalgap != null && !oldGlobalgap.equals(newGlobalgap)) {
                deletePhysicalDocumentFile(oldGlobalgap);
                System.out.println("DEBUG: Deleted old globalgapUrl file: " + oldGlobalgap);
            }
            existing.setGlobalgapUrl(newGlobalgap);
            System.out.println("DEBUG: Set globalgapUrl to: " + newGlobalgap);
        }

        // Organic URL: field was present in request (null = unchecked, clear it)
        if (request.isOrganicUrlPresent()) {
            String newOrganic = request.getOrganicUrl();
            String oldOrganic = existing.getOrganicUrl();
            if (oldOrganic != null && !oldOrganic.equals(newOrganic)) {
                deletePhysicalDocumentFile(oldOrganic);
                System.out.println("DEBUG: Deleted old organicUrl file: " + oldOrganic);
            }
            existing.setOrganicUrl(newOrganic);
            System.out.println("DEBUG: Set organicUrl to: " + newOrganic);
        }

        existing.setRole("farmer");
        Farmer saved = farmerRepository.save(existing);
        System.out.println("DEBUG UPDATE_PROFILE (Farmer): profile updated successfully for id=" + id);
        return saved;
    }

    private void deletePhysicalAvatarFile(String avatarUrl) {
        if (avatarUrl != null && !avatarUrl.isEmpty() && avatarUrl.contains("/storage/v1/object/public/")) {
            supabaseStorageService.deleteFileByUrl(avatarUrl);
        }
    }

    private void deletePhysicalDocumentFile(String fileUrl) {
        if (fileUrl != null && !fileUrl.isEmpty() && fileUrl.contains("/storage/v1/object/public/")) {
            supabaseStorageService.deleteFileByUrl(fileUrl);
        }
    }
}
