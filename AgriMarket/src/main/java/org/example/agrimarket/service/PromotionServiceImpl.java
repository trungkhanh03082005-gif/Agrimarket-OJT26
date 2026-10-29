package org.example.agrimarket.service;

import org.example.agrimarket.dto.PromotionProductDTO;
import org.example.agrimarket.dto.PromotionRequestDTO;
import org.example.agrimarket.dto.PromotionResponseDTO;
import org.example.agrimarket.model.Farmer;
import org.example.agrimarket.model.Product;
import org.example.agrimarket.model.ProductImage;
import org.example.agrimarket.model.Promotion;
import org.example.agrimarket.model.Notification;
import org.example.agrimarket.model.FollowedFarmer;
import org.example.agrimarket.model.Customer;
import org.example.agrimarket.repository.FarmerRepository;
import org.example.agrimarket.repository.ProductImageRepository;
import org.example.agrimarket.repository.ProductRepository;
import org.example.agrimarket.repository.PromotionRepository;
import org.example.agrimarket.repository.NotificationRepository;
import org.example.agrimarket.repository.CustomerRepository;
import org.example.agrimarket.repository.FollowedFarmerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class PromotionServiceImpl implements PromotionService {

    @Autowired
    private PromotionRepository promotionRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductImageRepository productImageRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private FollowedFarmerRepository followedFarmerRepository;

    @Override
    @org.springframework.cache.annotation.Cacheable(value = "promotions_admin")
    @Transactional(readOnly = true)
    public List<PromotionResponseDTO> getAllPromotions() {
        return promotionRepository.findAll().stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PromotionResponseDTO> getFarmerPromotions(String farmerEmail) {
        Farmer farmer = farmerRepository.findByEmail(farmerEmail).orElse(null);
        if (farmer == null) {
            return Collections.emptyList();
        }
        return promotionRepository.findByFarmerId(farmer.getId()).stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PromotionResponseDTO getPromotionById(Long id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chương trình khuyến mãi với ID: " + id));
        return convertToResponseDTO(promotion);
    }

    @Override
    @org.springframework.cache.annotation.CacheEvict(value = "promotions_admin", allEntries = true)
    public PromotionResponseDTO createPromotion(PromotionRequestDTO request) {
        Promotion promotion = new Promotion();
        promotion.setTitle(request.getTitle());
        promotion.setDescription(request.getDescription());
        
        // Generate random unique code
        String code = "KM-" + LocalDate.now().getYear() + "-" + String.format("%03d", (int)(Math.random() * 1000));
        promotion.setCode(code);

        promotion.setDiscountType(request.getDiscountType());
        promotion.setDiscountVal(request.getDiscountVal() != null ? request.getDiscountVal() : 0.0);

        if (request.getStartDate() != null && !request.getStartDate().isEmpty()) {
            promotion.setStartDate(LocalDate.parse(request.getStartDate()));
        } else {
            promotion.setStartDate(LocalDate.now());
        }

        if (request.getEndDate() != null && !request.getEndDate().isEmpty()) {
            promotion.setEndDate(LocalDate.parse(request.getEndDate()));
        } else {
            promotion.setEndDate(LocalDate.now().plusDays(7));
        }

        // Determine status
        LocalDate now = LocalDate.now();
        if (now.isBefore(promotion.getStartDate())) {
            promotion.setStatus("upcoming");
        } else if (now.isAfter(promotion.getEndDate())) {
            promotion.setStatus("ended");
        } else {
            promotion.setStatus("active");
        }

        promotion.setMaxUses(request.getMaxUses() != null ? request.getMaxUses() : 0);
        promotion.setUsedCount(0);
        promotion.setBudget(request.getBudget() != null ? request.getBudget() : 0.0);
        promotion.setUsedBudget(0.0);
        promotion.setRevenueGenerated(0.0);
        
        String image = request.getImage();
        if (image == null || image.trim().isEmpty()) {
            image = "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&q=80&w=400";
        }
        promotion.setImage(image);

        promotion.setVisibility(request.getVisibility() != null ? request.getVisibility() : "show");
        promotion.setMaxDiscount(request.getMaxDiscount());
        promotion.setMinOrder(request.getMinOrder());
        promotion.setUsageLimitPerPerson(request.getUsageLimitPerPerson() != null ? request.getUsageLimitPerPerson() : 1);

        if (request.getFarmerId() != null) {
            Farmer farmer = farmerRepository.findById(request.getFarmerId()).orElse(null);
            promotion.setFarmer(farmer);
        }

        // Handle products
        if (request.getSelectedProductIds() != null && !request.getSelectedProductIds().isEmpty()) {
            List<Product> products = productRepository.findAllById(request.getSelectedProductIds());
            promotion.setProducts(new HashSet<>(products));
        }

        Promotion saved = promotionRepository.save(promotion);

        // Send notifications
        try {
            if (saved.getFarmer() == null) {
                String title = "Khuyến mãi hệ thống mới: " + saved.getTitle();
                String content = saved.getDescription() != null && !saved.getDescription().isEmpty()
                        ? saved.getDescription()
                        : "Nhận ngay ưu đãi cực lớn cho các sản phẩm nông nghiệp.";
                List<Customer> customers = customerRepository.findAll();
                for (Customer customer : customers) {
                    Notification notif = Notification.builder()
                            .receiverType("customer")
                            .receiverId(customer.getId())
                            .title(title)
                            .content(content)
                            .isRead(false)
                            .link("/promotion/" + saved.getId())
                            .createdAt(LocalDateTime.now())
                            .build();
                    notificationRepository.save(notif);
                }
            } else {
                String farmName = saved.getFarmer().getFarmName() != null && !saved.getFarmer().getFarmName().isEmpty()
                        ? saved.getFarmer().getFarmName()
                        : saved.getFarmer().getFullName();
                String title = "Khuyến mãi mới từ nhà vườn " + farmName + ": " + saved.getTitle();
                String content = saved.getDescription() != null && !saved.getDescription().isEmpty()
                        ? saved.getDescription()
                        : "Ghé thăm gian hàng của chúng tôi để nhận ưu đãi.";
                List<FollowedFarmer> follows = followedFarmerRepository.findByFarmerId(saved.getFarmer().getId());
                for (FollowedFarmer follow : follows) {
                    Notification notif = Notification.builder()
                            .receiverType("customer")
                            .receiverId(follow.getUser().getId())
                            .title(title)
                            .content(content)
                            .isRead(false)
                            .link("/promotion/" + saved.getId())
                            .createdAt(LocalDateTime.now())
                            .build();
                    notificationRepository.save(notif);
                }
            }
        } catch (Exception e) {
            System.err.println(">>> Lỗi khi gửi thông báo khuyến mãi: " + e.getMessage());
        }

        return convertToResponseDTO(saved);
    }

    @Override
    public PromotionResponseDTO updatePromotion(Long id, PromotionRequestDTO request) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chương trình khuyến mãi với ID: " + id));

        promotion.setTitle(request.getTitle());
        promotion.setDescription(request.getDescription());
        promotion.setDiscountType(request.getDiscountType());
        promotion.setDiscountVal(request.getDiscountVal() != null ? request.getDiscountVal() : 0.0);

        if (request.getStartDate() != null && !request.getStartDate().isEmpty()) {
            promotion.setStartDate(LocalDate.parse(request.getStartDate()));
        }
        if (request.getEndDate() != null && !request.getEndDate().isEmpty()) {
            promotion.setEndDate(LocalDate.parse(request.getEndDate()));
        }

        // Update status based on dates
        LocalDate now = LocalDate.now();
        if (now.isBefore(promotion.getStartDate())) {
            promotion.setStatus("upcoming");
        } else if (now.isAfter(promotion.getEndDate())) {
            promotion.setStatus("ended");
        } else {
            promotion.setStatus("active");
        }

        promotion.setMaxUses(request.getMaxUses() != null ? request.getMaxUses() : 0);
        promotion.setBudget(request.getBudget() != null ? request.getBudget() : 0.0);
        
        if (request.getImage() != null && !request.getImage().trim().isEmpty()) {
            promotion.setImage(request.getImage());
        }

        promotion.setVisibility(request.getVisibility() != null ? request.getVisibility() : "show");
        promotion.setMaxDiscount(request.getMaxDiscount());
        promotion.setMinOrder(request.getMinOrder());
        promotion.setUsageLimitPerPerson(request.getUsageLimitPerPerson() != null ? request.getUsageLimitPerPerson() : 1);

        if (request.getFarmerId() != null) {
            Farmer farmer = farmerRepository.findById(request.getFarmerId()).orElse(null);
            promotion.setFarmer(farmer);
        } else {
            promotion.setFarmer(null);
        }

        if (request.getSelectedProductIds() != null) {
            List<Product> products = productRepository.findAllById(request.getSelectedProductIds());
            promotion.setProducts(new HashSet<>(products));
        } else {
            promotion.getProducts().clear();
        }

        Promotion saved = promotionRepository.save(promotion);
        return convertToResponseDTO(saved);
    }

    @Override
    public PromotionResponseDTO updatePromotionStatus(Long id, String status) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chương trình khuyến mãi với ID: " + id));

        promotion.setStatus(status);
        Promotion saved = promotionRepository.save(promotion);
        return convertToResponseDTO(saved);
    }

    @Override
    public void deletePromotion(Long id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chương trình khuyến mãi với ID: " + id));
        promotionRepository.delete(promotion);
    }

    private PromotionResponseDTO convertToResponseDTO(Promotion p) {
        String farmerName = p.getFarmer() != null ? p.getFarmer().getFullName() : "Toàn hệ thống";
        if (p.getFarmer() != null && p.getFarmer().getFarmName() != null && !p.getFarmer().getFarmName().isEmpty()) {
            farmerName = p.getFarmer().getFullName() + " (" + p.getFarmer().getFarmName() + ")";
        }

        List<Long> prodIds = p.getProducts().stream().map(prod -> prod.getId()).collect(Collectors.toList());
        Map<Long, String> imageMap = new HashMap<>();
        if (!prodIds.isEmpty()) {
            List<ProductImage> allImages = productImageRepository.findByProductIdIn(prodIds);
            for (ProductImage img : allImages) {
                Long pId = img.getProduct().getId();
                if (!imageMap.containsKey(pId) || (img.getIsThumbnail() != null && img.getIsThumbnail())) {
                    imageMap.put(pId, img.getImgUrl());
                }
            }
        }

        List<PromotionProductDTO> products = p.getProducts().stream().map(prod -> {
            String imageUrl = imageMap.getOrDefault(prod.getId(), "");
            return PromotionProductDTO.builder()
                    .id(prod.getId())
                    .name(prod.getName())
                    .unit(prod.getUnit())
                    .price(prod.getPrice())
                    .image(imageUrl)
                    .build();
        }).collect(Collectors.toList());

        String effectiveStatus = p.getStatus();
        if (!"canceled".equalsIgnoreCase(effectiveStatus)) {
            LocalDate now = LocalDate.now();
            if (p.getEndDate() != null && now.isAfter(p.getEndDate())) {
                effectiveStatus = "ended";
            } else if (p.getStartDate() != null && now.isBefore(p.getStartDate())) {
                effectiveStatus = "upcoming";
            } else if (p.getStartDate() != null && !now.isBefore(p.getStartDate()) && (p.getEndDate() == null || !now.isAfter(p.getEndDate()))) {
                effectiveStatus = "active";
            }
        }

        return PromotionResponseDTO.builder()
                .id(p.getId())
                .title(p.getTitle())
                .description(p.getDescription())
                .discountType(p.getDiscountType())
                .discountVal(p.getDiscountVal())
                .farmerId(p.getFarmer() != null ? p.getFarmer().getId() : null)
                .farmerName(farmerName)
                .startDate(p.getStartDate() != null ? p.getStartDate().toString() : null)
                .endDate(p.getEndDate() != null ? p.getEndDate().toString() : null)
                .status(effectiveStatus)
                .productsCount(p.getProducts().size())
                .maxUses(p.getMaxUses())
                .usedCount(p.getUsedCount())
                .budget(p.getBudget())
                .usedBudget(p.getUsedBudget())
                .revenueGenerated(p.getRevenueGenerated())
                .image(p.getImage())
                .code(p.getCode())
                .maxDiscount(p.getMaxDiscount())
                .minOrder(p.getMinOrder())
                .usageLimitPerPerson(p.getUsageLimitPerPerson())
                .visibility(p.getVisibility())
                .selectedProducts(products)
                .build();
    }
}
