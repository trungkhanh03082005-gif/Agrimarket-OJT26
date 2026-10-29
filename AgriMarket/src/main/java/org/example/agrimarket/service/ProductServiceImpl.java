package org.example.agrimarket.service;

import org.example.agrimarket.dto.PagedProductResponse;
import org.example.agrimarket.dto.PageResponse;
import org.example.agrimarket.dto.ProductRequest;
import org.example.agrimarket.dto.ProductResponse;
import org.example.agrimarket.model.Category;
import org.example.agrimarket.model.Farmer;
import org.example.agrimarket.model.Product;
import org.example.agrimarket.model.ProductImage;
import org.example.agrimarket.model.Notification;
import org.example.agrimarket.repository.CategoryRepository;
import org.example.agrimarket.repository.FarmerRepository;
import org.example.agrimarket.repository.ProductImageRepository;
import org.example.agrimarket.repository.ProductRepository;
import org.example.agrimarket.repository.ProductReviewRepository;
import org.example.agrimarket.repository.OrderItemRepository;
import org.example.agrimarket.repository.NotificationRepository;
import org.example.agrimarket.repository.WishlistItemRepository;
import org.example.agrimarket.repository.PreorderItemRepository;
import org.example.agrimarket.repository.PreorderRepository;
import org.example.agrimarket.model.Preorder;
import org.example.agrimarket.model.PreorderItem;
import org.example.agrimarket.repository.ProductSpecification;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;
import java.util.Collections;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ProductServiceImpl implements ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductImageRepository productImageRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private ProductReviewRepository productReviewRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private WishlistItemRepository wishlistItemRepository;

    @Autowired
    private PreorderItemRepository preorderItemRepository;

    @Autowired
    private PreorderRepository preorderRepository;

    @Autowired
    private OrderService orderService;

    @Override
    public List<ProductResponse> getProductsByFarmerEmail(String email) {
        List<Product> products = productRepository.findByFarmerEmailOrderByCreatedAtDesc(email);
        return convertProductsToResponseList(products);
    }

    @Override
    public PageResponse<ProductResponse> getFarmerProductsPaged(String email, int page, int size, String search) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Product> productPage;
        if (search != null && !search.isBlank()) {
            productPage = productRepository.findByFarmerEmailAndNameContainingIgnoreCaseOrderByCreatedAtDesc(email, search.trim(), pageable);
        } else {
            productPage = productRepository.findByFarmerEmailOrderByCreatedAtDesc(email, pageable);
        }
        List<ProductResponse> responses = convertProductsToResponseList(productPage.getContent());
        return PageResponse.of(responses, productPage);
    }

    private List<ProductResponse> convertProductsToResponseList(List<Product> products) {
        if (products.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> productIds = products.stream().map(Product::getId).collect(Collectors.toList());

        // Bulk load all ProductImages
        List<ProductImage> allImages = productImageRepository.findByProductIdIn(productIds);
        Map<Long, List<ProductImage>> imagesMap = allImages.stream()
                .collect(Collectors.groupingBy(pi -> pi.getProduct().getId()));

        // Bulk load average ratings and review counts
        List<Object[]> ratingsData = productReviewRepository.getAverageRatingAndCountByProductIds(productIds);
        Map<Long, Double> ratingsMap = new HashMap<>();
        Map<Long, Long> countsMap = new HashMap<>();
        for (Object[] row : ratingsData) {
            Long pid = (Long) row[0];
            Double avg = (Double) row[1];
            Long cnt = (Long) row[2];
            ratingsMap.put(pid, avg != null ? avg : 0.0);
            countsMap.put(pid, cnt != null ? cnt : 0L);
        }

        // Bulk load sold count
        List<Object[]> soldData = orderItemRepository.sumQuantityByProductIds(productIds);
        Map<Long, Integer> soldMap = new HashMap<>();
        for (Object[] row : soldData) {
            Long pid = (Long) row[0];
            Number sum = (Number) row[1];
            soldMap.put(pid, sum != null ? sum.intValue() : 0);
        }

        return products.stream()
                .map(p -> convertToResponseOptimized(p, imagesMap, ratingsMap, countsMap, soldMap))
                .collect(Collectors.toList());
    }

    private ProductResponse convertToResponseOptimized(
            Product product,
            Map<Long, List<ProductImage>> imagesMap,
            Map<Long, Double> ratingsMap,
            Map<Long, Long> countsMap,
            Map<Long, Integer> soldMap) {

        List<ProductImage> productImages = imagesMap.getOrDefault(product.getId(), Collections.emptyList());
        
        String thumbnailUrl = productImages.stream()
                .filter(pi -> Boolean.TRUE.equals(pi.getIsThumbnail()))
                .map(ProductImage::getImgUrl)
                .findFirst()
                .orElse("");
        if (thumbnailUrl.isEmpty() && !productImages.isEmpty()) {
            thumbnailUrl = productImages.get(0).getImgUrl();
        }

        List<String> imageUrls = productImages.stream()
                .map(ProductImage::getImgUrl)
                .collect(Collectors.toList());

        String farmerName = "";
        String farmLocation = "";
        String farmDescription = "";
        String farmerAvatarUrl = "";
        String farmerVietgapUrl = "";
        String farmerGlobalgapUrl = "";
        String farmerOrganicUrl = "";
        if (product.getFarmer() != null) {
            Farmer farmer = product.getFarmer();
            farmerName = farmer.getFarmName() != null && !farmer.getFarmName().isEmpty()
                    ? farmer.getFarmName()
                    : farmer.getFullName();
            farmLocation = farmer.getFarmAddress() != null && !farmer.getFarmAddress().isEmpty()
                    ? farmer.getFarmAddress()
                    : "Chưa có địa chỉ";
            farmDescription = farmer.getDescription() != null && !farmer.getDescription().isEmpty()
                    ? farmer.getDescription()
                    : "Chưa có mô tả nông trại";
            farmerAvatarUrl = farmer.getAvatarUrl();
            farmerVietgapUrl = farmer.getVietgapUrl() != null ? farmer.getVietgapUrl() : "";
            farmerGlobalgapUrl = farmer.getGlobalgapUrl() != null ? farmer.getGlobalgapUrl() : "";
            farmerOrganicUrl = farmer.getOrganicUrl() != null ? farmer.getOrganicUrl() : "";
        }

        Double avgRating = ratingsMap.getOrDefault(product.getId(), 0.0);
        Long count = countsMap.getOrDefault(product.getId(), 0L);
        Integer soldCount = soldMap.getOrDefault(product.getId(), 0);

        return ProductResponse.builder()
                .id(product.getId())
                .farmerId(product.getFarmer() != null ? product.getFarmer().getId() : null)
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .stockQuantity(product.getStockQuantity())
                .unit(product.getUnit())
                .status(product.getStatus())
                .harvestDate(product.getHarvestDate())
                .expirationDate(product.getExpirationDate())
                .createdAt(product.getCreatedAt())
                .traceabilityImageUrl(product.getTraceabilityImageUrl())
                .thumbnailUrl(thumbnailUrl)
                .images(imageUrls)
                .farmerName(farmerName)
                .farmLocation(farmLocation)
                .farmDescription(farmDescription)
                .farmerAvatarUrl(farmerAvatarUrl)
                .rejectionReason(product.getRejectionReason())
                .adminNotes(product.getAdminNotes())
                .rating(avgRating)
                .reviewsCount(count.intValue())
                .sold(soldCount)
                .farmerVietgapUrl(farmerVietgapUrl)
                .farmerGlobalgapUrl(farmerGlobalgapUrl)
                .farmerOrganicUrl(farmerOrganicUrl)
                .perishability(product.getPerishability())
                .limitDistance(product.getLimitDistance())
                .farmerLatitude(product.getFarmer() != null ? product.getFarmer().getLatitude() : null)
                .farmerLongitude(product.getFarmer() != null ? product.getFarmer().getLongitude() : null)
                .farmerMaxDeliveryDistance(product.getFarmer() != null ? product.getFarmer().getMaxDeliveryDistance() : null)
                .isPreorder(product.getIsPreorder())
                .build();
    }

    @Override
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    private ProductResponse convertToResponse(Product product) {
        // Find thumbnail URL if exists
        Optional<ProductImage> thumbnailImage = productImageRepository
                .findFirstByProductIdAndIsThumbnailTrue(product.getId());
        String thumbnailUrl = thumbnailImage.map(ProductImage::getImgUrl).orElse("");

        // Find all image URLs for this product
        List<ProductImage> productImages = productImageRepository.findByProductId(product.getId());
        List<String> imageUrls = productImages.stream()
                .map(ProductImage::getImgUrl)
                .collect(Collectors.toList());

        String farmerName = "";
        String farmLocation = "";
        String farmDescription = "";
        String farmerAvatarUrl = "";
        String farmerVietgapUrl = "";
        String farmerGlobalgapUrl = "";
        String farmerOrganicUrl = "";
        if (product.getFarmer() != null) {
            Farmer farmer = product.getFarmer();
            farmerName = farmer.getFarmName() != null && !farmer.getFarmName().isEmpty()
                    ? farmer.getFarmName()
                    : farmer.getFullName();
            farmLocation = farmer.getFarmAddress() != null && !farmer.getFarmAddress().isEmpty()
                    ? farmer.getFarmAddress()
                    : "Chưa có địa chỉ";
            farmDescription = farmer.getDescription() != null && !farmer.getDescription().isEmpty()
                    ? farmer.getDescription()
                    : "Chưa có mô tả nông trại";
            farmerAvatarUrl = farmer.getAvatarUrl();
            farmerVietgapUrl = farmer.getVietgapUrl() != null ? farmer.getVietgapUrl() : "";
            farmerGlobalgapUrl = farmer.getGlobalgapUrl() != null ? farmer.getGlobalgapUrl() : "";
            farmerOrganicUrl = farmer.getOrganicUrl() != null ? farmer.getOrganicUrl() : "";
        }

        Double avgRating = productReviewRepository.getAverageRatingByProductId(product.getId());
        if (avgRating == null) {
            avgRating = 0.0;
        }
        Long count = productReviewRepository.countByProductId(product.getId());
        Integer soldCount = orderItemRepository.sumQuantityByProductIdAndOrderStatus(product.getId());

        return ProductResponse.builder()
                .id(product.getId())
                .farmerId(product.getFarmer() != null ? product.getFarmer().getId() : null)
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .stockQuantity(product.getStockQuantity())
                .unit(product.getUnit())
                .status(product.getStatus())
                .harvestDate(product.getHarvestDate())
                .expirationDate(product.getExpirationDate())
                .createdAt(product.getCreatedAt())
                .traceabilityImageUrl(product.getTraceabilityImageUrl())
                .thumbnailUrl(thumbnailUrl)
                .images(imageUrls)
                .farmerName(farmerName)
                .farmLocation(farmLocation)
                .farmDescription(farmDescription)
                .farmerAvatarUrl(farmerAvatarUrl)
                .rejectionReason(product.getRejectionReason())
                .adminNotes(product.getAdminNotes())
                .rating(avgRating)
                .reviewsCount(count.intValue())
                .sold(soldCount)
                .farmerVietgapUrl(farmerVietgapUrl)
                .farmerGlobalgapUrl(farmerGlobalgapUrl)
                .farmerOrganicUrl(farmerOrganicUrl)
                .perishability(product.getPerishability())
                .limitDistance(product.getLimitDistance())
                .farmerLatitude(product.getFarmer() != null ? product.getFarmer().getLatitude() : null)
                .farmerLongitude(product.getFarmer() != null ? product.getFarmer().getLongitude() : null)
                .farmerMaxDeliveryDistance(product.getFarmer() != null ? product.getFarmer().getMaxDeliveryDistance() : null)
                .isPreorder(product.getIsPreorder())
                .build();
    }

    @Override
    @Transactional
    public void deleteProduct(Long id, String farmerEmail) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm."));

        if (product.getFarmer() == null || !product.getFarmer().getEmail().equalsIgnoreCase(farmerEmail)) {
            throw new IllegalArgumentException("Bạn không có quyền xóa sản phẩm này.");
        }

        // Delete related images physically
        List<ProductImage> images = productImageRepository.findByProductId(id);
        if (images != null && !images.isEmpty()) {
            for (ProductImage img : images) {
                deletePhysicalFile(img.getImgUrl(), "products");
            }
            productImageRepository.deleteAll(images);
        }


        // Delete traceability image physically
        if (product.getTraceabilityImageUrl() != null && !product.getTraceabilityImageUrl().isEmpty()) {
            deletePhysicalFile(product.getTraceabilityImageUrl(), "traceability");
        }

        // Delete product
        productRepository.delete(product);
    }

    private void deletePhysicalFile(String fileUrl, String subFolder) {
        if (fileUrl != null && !fileUrl.isEmpty() && fileUrl.contains("/storage/v1/object/public/")) {
            supabaseStorageService.deleteFileByUrl(fileUrl);
        }
    }

    @Override
    @Transactional
    public ProductResponse createProduct(ProductRequest request, String farmerEmail) throws Exception {
        validateHarvestDate(request);
        Farmer farmer = farmerRepository.findByEmail(farmerEmail)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nông dân với email: " + farmerEmail));

        Category category = null;
        if (request.getCategoryName() != null && !request.getCategoryName().isEmpty()) {
            category = categoryRepository.findByName(request.getCategoryName())
                    .orElseGet(() -> {
                        Category newCat = new Category();
                        newCat.setName(request.getCategoryName());
                        newCat.setDescription("Danh mục nông sản " + request.getCategoryName());
                        return categoryRepository.save(newCat);
                    });
        }

        Product product = new Product();
        product.setFarmer(farmer);
        product.setCategory(category);
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setStockQuantity(request.getStockQuantity() != null ? request.getStockQuantity() : 0);
        product.setUnit(request.getUnit());
        product.setStatus(request.getStatus() != null ? request.getStatus() : "pending");
        product.setHarvestDate(request.getHarvestDate());
        product.setExpirationDate(request.getExpirationDate());
        product.setPerishability(request.getPerishability() != null ? request.getPerishability() : "khô");
        product.setLimitDistance(request.getLimitDistance());
        product.setIsPreorder(request.getIsPreorder() != null ? request.getIsPreorder() : false);

        // Handle traceability image Base64 if uploaded
        if (request.getTraceabilityImageBase64() != null && !request.getTraceabilityImageBase64().isEmpty()) {
            String traceabilityUrl = saveBase64File(request.getTraceabilityImageBase64(), "traceability");
            product.setTraceabilityImageUrl(traceabilityUrl);
        }

        product = productRepository.save(product);

        // Save product images
        if (request.getImages() != null && !request.getImages().isEmpty()) {
            for (int i = 0; i < request.getImages().size(); i++) {
                String base64Image = request.getImages().get(i);
                if (base64Image != null && !base64Image.isEmpty()) {
                    String imgUrl = saveBase64File(base64Image, "products");
                    ProductImage pImage = new ProductImage();
                    pImage.setProduct(product);
                    pImage.setImgUrl(imgUrl);
                    pImage.setIsThumbnail(i == 0); // first image is the thumbnail
                    productImageRepository.save(pImage);
                }
            }
        }

        return convertToResponse(product);
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "product_detail", allEntries = true)
    public ProductResponse updateProduct(Long id, ProductRequest request, String farmerEmail) throws Exception {
        validateHarvestDate(request);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm."));

        if (product.getFarmer() == null || !product.getFarmer().getEmail().equalsIgnoreCase(farmerEmail)) {
            throw new IllegalArgumentException("Bạn không có quyền chỉnh sửa sản phẩm này.");
        }

        Integer oldStock = product.getStockQuantity();

        // Basic fields
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setStockQuantity(request.getStockQuantity() != null ? request.getStockQuantity() : 0);
        product.setUnit(request.getUnit());
        product.setHarvestDate(request.getHarvestDate());
        product.setExpirationDate(request.getExpirationDate());
        product.setPerishability(request.getPerishability());
        product.setLimitDistance(request.getLimitDistance());
        product.setIsPreorder(request.getIsPreorder() != null ? request.getIsPreorder() : false);
        product.setStatus("pending"); // Reset status to pending for admin approval

        // Category
        Category category = null;
        if (request.getCategoryName() != null && !request.getCategoryName().isEmpty()) {
            category = categoryRepository.findByName(request.getCategoryName())
                    .orElseGet(() -> {
                        Category newCat = new Category();
                        newCat.setName(request.getCategoryName());
                        newCat.setDescription("Danh mục nông sản " + request.getCategoryName());
                        return categoryRepository.save(newCat);
                    });
        }
        product.setCategory(category);


        // Traceability image
        if (request.getTraceabilityImageBase64() != null && !request.getTraceabilityImageBase64().isEmpty()) {
            if (request.getTraceabilityImageBase64().startsWith("data:")) {
                if (product.getTraceabilityImageUrl() != null) {
                    deletePhysicalFile(product.getTraceabilityImageUrl(), "traceability");
                }
                String traceabilityUrl = saveBase64File(request.getTraceabilityImageBase64(), "traceability");
                product.setTraceabilityImageUrl(traceabilityUrl);
            }
        } else {
            if (request.getTraceabilityImageBase64() == null && product.getTraceabilityImageUrl() != null) {
                deletePhysicalFile(product.getTraceabilityImageUrl(), "traceability");
                product.setTraceabilityImageUrl(null);
            }
        }

        product = productRepository.save(product);

        // Images handling
        if (request.getImages() != null) {
            List<ProductImage> dbImages = productImageRepository.findByProductId(id);
            List<String> requestImages = request.getImages();

            // Find images to delete
            for (ProductImage dbImg : dbImages) {
                boolean keep = false;
                for (String reqImg : requestImages) {
                    if (reqImg != null && reqImg.equalsIgnoreCase(dbImg.getImgUrl())) {
                        keep = true;
                        break;
                    }
                }
                if (!keep) {
                    deletePhysicalFile(dbImg.getImgUrl(), "products");
                    productImageRepository.delete(dbImg);
                }
            }

            productImageRepository.flush(); // Ensure deletes are synchronized

            for (int i = 0; i < requestImages.size(); i++) {
                String imgStr = requestImages.get(i);
                if (imgStr != null && !imgStr.isEmpty()) {
                    if (imgStr.startsWith("data:")) {
                        String imgUrl = saveBase64File(imgStr, "products");
                        ProductImage pImage = new ProductImage();
                        pImage.setProduct(product);
                        pImage.setImgUrl(imgUrl);
                        pImage.setIsThumbnail(i == 0);
                        productImageRepository.save(pImage);
                    } else {
                        final String url = imgStr;
                        Optional<ProductImage> existingOpt = productImageRepository.findByProductId(id).stream()
                                .filter(pImg -> pImg.getImgUrl().equalsIgnoreCase(url))
                                .findFirst();
                        if (existingOpt.isPresent()) {
                            ProductImage pImage = existingOpt.get();
                            pImage.setIsThumbnail(i == 0);
                            productImageRepository.save(pImage);
                        }
                    }
                }
            }
        }

        notifyWishlistUsersIfBackInStock(product, oldStock);
        return convertToResponse(product);
    }

    private String saveBase64File(String base64Str, String subFolder) throws IOException {
        if (base64Str == null || base64Str.isEmpty()) {
            return null;
        }

        String header = "";
        String data = base64Str;
        if (base64Str.contains(",")) {
            String[] parts = base64Str.split(",");
            header = parts[0];
            data = parts[1];
        } else {
            data = base64Str;
        }

        String extension = ".jpg"; // default
        String contentType = "image/jpeg";
        if (header.contains("image/png")) {
            extension = ".png";
            contentType = "image/png";
        } else if (header.contains("image/gif")) {
            extension = ".gif";
            contentType = "image/gif";
        } else if (header.contains("image/webp")) {
            extension = ".webp";
            contentType = "image/webp";
        } else if (header.contains("application/pdf")) {
            extension = ".pdf";
            contentType = "application/pdf";
        }

        byte[] decodedBytes = java.util.Base64.getDecoder().decode(data.trim());

        return supabaseStorageService.uploadFileBytes(decodedBytes, "file" + extension, contentType, subFolder);
    }

    @Override
    public List<ProductResponse> getAllApprovedProducts() {
        List<Product> products = productRepository.findApprovedProductsFromVerifiedFarmers();
        return convertProductsToResponseList(products);
    }

    @Override
    @org.springframework.cache.annotation.Cacheable(value = "product_detail", key = "#id")
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm với ID: " + id));
        return convertToResponse(product);
    }

    @Override
    public List<ProductResponse> getAllProducts() {
        List<Product> products = productRepository.findAll();
        products.sort((p1, p2) -> {
            if (p1.getCreatedAt() == null && p2.getCreatedAt() == null)
                return 0;
            if (p1.getCreatedAt() == null)
                return 1;
            if (p2.getCreatedAt() == null)
                return -1;
            return p2.getCreatedAt().compareTo(p1.getCreatedAt());
        });
        return convertProductsToResponseList(products);
    }

    @Override
    public PageResponse<ProductResponse> getAllProductsPaged(int page, int size, String status, String category, String search) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Product> productPage;
        if (status != null && !status.isBlank()) {
            productPage = productRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        } else {
            productPage = productRepository.findAll(pageable);
        }
        List<ProductResponse> responses = convertProductsToResponseList(productPage.getContent());
        if (category != null && !category.isBlank() && !"all".equalsIgnoreCase(category)) {
            responses = responses.stream()
                    .filter(p -> p.getCategoryName() != null && p.getCategoryName().equalsIgnoreCase(category))
                    .collect(Collectors.toList());
        }
        return PageResponse.of(responses, productPage);
    }

    @Override
    public PagedProductResponse getApprovedProductsPaged(
            int page, int size, String sort,
            String category, String search,
            Double minPrice, Double maxPrice,
            String location, String shopKeyword,
            Double minRating, Long farmerId,
            Boolean isPreorder
    ) {
        // 1. Xác định Sort
        Sort sortObj;
        switch (sort != null ? sort : "popular") {
            case "price_asc":
                sortObj = Sort.by(Sort.Direction.ASC, "price");
                break;
            case "price_desc":
                sortObj = Sort.by(Sort.Direction.DESC, "price");
                break;
            case "newest":
                sortObj = Sort.by(Sort.Direction.DESC, "createdAt");
                break;
            case "best_selling":
            case "popular":
            default:
                sortObj = Sort.by(Sort.Direction.DESC, "createdAt");
                break;
        }

        // 2. Tạo Pageable
        PageRequest pageable = PageRequest.of(page, size, sortObj);

        // 3. Xây dựng Specification filter
        Specification<Product> spec = ProductSpecification.buildFilter(
                category, search, minPrice, maxPrice, location, shopKeyword, minRating, farmerId, isPreorder
        );

        // 4. Truy vấn DB
        Page<Product> productPage = productRepository.findAll(spec, pageable);

        // 5. Convert sang ProductResponse (bulk optimized)
        List<ProductResponse> content = convertProductsToResponseList(productPage.getContent());

        // 6. Trả về kết quả phân trang
        return PagedProductResponse.builder()
                .content(content)
                .totalElements(productPage.getTotalElements())
                .totalPages(productPage.getTotalPages())
                .currentPage(productPage.getNumber())
                .pageSize(productPage.getSize())
                .build();
    }

    @Override
    @Transactional
    public ProductResponse updateProductStock(Long id, Integer newStock, String farmerEmail) throws Exception {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm."));

        if (product.getFarmer() == null || !product.getFarmer().getEmail().equalsIgnoreCase(farmerEmail)) {
            throw new IllegalArgumentException("Bạn không có quyền chỉnh sửa sản phẩm này.");
        }

        Integer oldStock = product.getStockQuantity();
        product.setStockQuantity(newStock != null ? newStock : 0);

        if (product.getStockQuantity() == 0) {
            try {
                Notification notif = Notification.builder()
                        .receiverType("farmer")
                        .receiverId(product.getFarmer().getId())
                        .title("Sản phẩm hết hàng!")
                        .content("Sản phẩm \"" + product.getName() + "\" của bạn đã hết hàng trong kho. Vui lòng cập nhật thêm số lượng tồn kho.")
                        .link("/farmer/products")
                        .createdAt(java.time.LocalDateTime.now())
                        .isRead(false)
                        .build();
                notificationRepository.save(notif);
            } catch (Exception e) {
                System.err.println("Lỗi gửi thông báo hết hàng: " + e.getMessage());
            }
        }

        product = productRepository.save(product);
        notifyWishlistUsersIfBackInStock(product, oldStock);
        return convertToResponse(product);
    }

    private void notifyWishlistUsersIfBackInStock(Product product, Integer oldStock) {
        if (oldStock != null && oldStock == 0 && product.getStockQuantity() > 0) {
            try {
                List<org.example.agrimarket.model.WishlistItem> wishlistItems = wishlistItemRepository.findByProductId(product.getId());
                for (org.example.agrimarket.model.WishlistItem item : wishlistItems) {
                    Notification notif = Notification.builder()
                            .receiverType("customer")
                            .receiverId(item.getUser().getId())
                            .title("Sản phẩm yêu thích đã có hàng!")
                            .content("Sản phẩm \"" + product.getName() + "\" trong danh sách yêu thích của bạn đã có hàng trở lại (" + product.getStockQuantity() + " " + product.getUnit() + ").")
                            .link("/products/" + product.getId())
                            .createdAt(java.time.LocalDateTime.now())
                            .isRead(false)
                            .build();
                    notificationRepository.save(notif);
                }
            } catch (Exception e) {
                System.err.println("Lỗi gửi thông báo sản phẩm có hàng lại cho wishlist: " + e.getMessage());
            }
        }
    }

    private void validateHarvestDate(ProductRequest request) {
        if (request.getIsPreorder() != null && request.getIsPreorder()) {
            if (request.getHarvestDate() != null && !request.getHarvestDate().isAfter(java.time.LocalDate.now())) {
                throw new IllegalArgumentException("Ngày thu hoạch dự kiến của sản phẩm đặt trước phải ở tương lai.");
            }
        } else {
            if (request.getHarvestDate() != null && request.getHarvestDate().isAfter(java.time.LocalDate.now())) {
                throw new IllegalArgumentException("Ngày thu hoạch của sản phẩm thường phải ở quá khứ hoặc hôm nay.");
            }
        }
    }

    @Override
    @Transactional
    public void earlyHarvest(Long productId, String farmerEmail) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm."));

        if (!product.getFarmer().getEmail().equalsIgnoreCase(farmerEmail)) {
            throw new IllegalArgumentException("Bạn không có quyền thao tác trên sản phẩm này.");
        }

        if (product.getIsPreorder() == null || !product.getIsPreorder()) {
            throw new IllegalArgumentException("Sản phẩm này không phải là sản phẩm đặt trước.");
        }

        java.time.LocalDate today = java.time.LocalDate.now();
        if (product.getHarvestDate() != null && !product.getHarvestDate().isAfter(today)) {
            throw new IllegalArgumentException("Sản phẩm đã tới thời điểm thu hoạch.");
        }

        // 1. Chuyển đổi trạng thái đặt trước thành sản phẩm bình thường
        product.setIsPreorder(false);
        product.setHarvestDate(today);
        productRepository.save(product);

        // 2. Lấy danh sách preorder_item liên quan đến sản phẩm này để gửi thông báo và chuyển đổi đơn hàng thường
        List<PreorderItem> items = preorderItemRepository.findByProductId(productId);
        
        java.util.Set<Long> processedPreorderIds = new java.util.HashSet<>();
        for (PreorderItem item : items) {
            Preorder preorder = item.getPreorder();
            if (preorder != null && preorder.getCustomer() != null) {
                if (!"cancelled".equalsIgnoreCase(preorder.getStatus()) && !"completed".equalsIgnoreCase(preorder.getStatus())) {
                    Long preorderId = preorder.getId();
                    if (!processedPreorderIds.contains(preorderId)) {
                        processedPreorderIds.add(preorderId);
                        
                        // Cập nhật trạng thái Preorder thành completed
                        preorder.setStatus("completed");
                        preorderRepository.save(preorder);

                        // Chuyển đổi cọc đặt trước thành đơn hàng thường chuẩn bị giao
                        orderService.convertPreorderToNormalOrder(preorder);

                        // Gửi thông báo cho khách hàng
                        Long customerId = preorder.getCustomer().getId();
                        Notification notif = Notification.builder()
                                .receiverType("customer")
                                .receiverId(customerId)
                                .title("Sản phẩm đặt trước đã được thu hoạch")
                                .content("Sản phẩm đặt trước \"" + product.getName() + "\" của bạn đã được thu hoạch sớm, đơn hàng của bạn đã sẵn sàng.")
                                .link("/profile/orders")
                                .createdAt(java.time.LocalDateTime.now())
                                .isRead(false)
                                .build();
                        notificationRepository.save(notif);
                    }
                }
            }
        }
    }
}
