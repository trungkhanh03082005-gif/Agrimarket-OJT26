package org.example.agrimarket.controller;

import org.example.agrimarket.dto.PreorderRequest;
import org.example.agrimarket.dto.PreorderResponse;
import org.example.agrimarket.model.*;
import org.example.agrimarket.repository.*;
import org.example.agrimarket.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/preorders")
public class PreorderController {

    @Autowired
    private PreorderRepository preorderRepository;

    @Autowired
    private PreorderItemRepository preorderItemRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private OrderService orderService;

    @Autowired
    private PromotionRepository promotionRepository;

    @Autowired
    private OrderGroupRepository orderGroupRepository;

    // 1. Create Preorder
    @PostMapping
    @Transactional
    public ResponseEntity<?> createPreorder(Principal principal, @RequestBody PreorderRequest request) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        Optional<Customer> customerOpt = customerRepository.findByEmail(principal.getName());
        if (customerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Customer profile not found.");
        }

        Customer customer = customerOpt.get();
        String promoCode = null;

        if (request.getAppliedPromoCode() != null && !request.getAppliedPromoCode().isBlank()) {
            Promotion promotion = promotionRepository.findByCode(request.getAppliedPromoCode())
                    .orElseThrow(() -> new IllegalArgumentException("Chương trình khuyến mãi không hợp lệ."));

            // Check usage limit per person
            if (promotion.getUsageLimitPerPerson() != null && promotion.getUsageLimitPerPerson() > 0) {
                long orderGroupCount = orderGroupRepository.countByCustomerIdAndAppliedPromoCode(customer.getId(), promotion.getCode());
                long preorderCount = preorderRepository.countByCustomerIdAndAppliedPromoCode(customer.getId(), promotion.getCode());
                if ((orderGroupCount + preorderCount) >= promotion.getUsageLimitPerPerson()) {
                    throw new IllegalArgumentException("Bạn đã hết lượt sử dụng mã khuyến mãi này.");
                }
            }

            // Check global limit
            if (promotion.getMaxUses() != null && promotion.getMaxUses() > 0 
                    && promotion.getUsedCount() >= promotion.getMaxUses()) {
                throw new IllegalArgumentException("Mã khuyến mãi này đã hết lượt sử dụng.");
            }

            // Increment promotion usage
            promotion.setUsedCount(promotion.getUsedCount() + 1);
            promotion.setUsedBudget(promotion.getUsedBudget() + (request.getDiscount() != null ? request.getDiscount() : 0.0));
            promotionRepository.save(promotion);

            promoCode = promotion.getCode();
        }

        Preorder preorder = Preorder.builder()
                .customer(customer)
                .status("pending_payment")
                .discount(request.getDiscount() != null ? request.getDiscount() : 0.0)
                .appliedPromoCode(promoCode)
                .build();

        preorder = preorderRepository.save(preorder);

        List<PreorderItem> savedItems = new ArrayList<>();
        for (PreorderRequest.PreorderItemRequest itemReq : request.getItems()) {
            Optional<Product> productOpt = productRepository.findById(itemReq.getProductId());
            if (productOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Product not found with ID: " + itemReq.getProductId());
            }

            LocalDate harvestDate = null;
            if (itemReq.getExpectedHarvestDate() != null && !itemReq.getExpectedHarvestDate().isEmpty()) {
                harvestDate = LocalDate.parse(itemReq.getExpectedHarvestDate());
            } else {
                harvestDate = productOpt.get().getHarvestDate();
            }

            PreorderItem preorderItem = PreorderItem.builder()
                    .preorder(preorder)
                    .product(productOpt.get())
                    .quantity(itemReq.getQuantity())
                    .expectedHarvestDate(harvestDate)
                    .build();

            savedItems.add(preorderItemRepository.save(preorderItem));
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(convertToResponse(preorder, savedItems));
    }

    // 1.5. Get preorder by ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getPreorderById(Principal principal, @PathVariable Long id) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        Optional<Preorder> preorderOpt = preorderRepository.findById(id);
        if (preorderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Preorder not found.");
        }

        Preorder po = preorderOpt.get();
        boolean isAuthorized = false;
        if (po.getCustomer().getEmail().equalsIgnoreCase(principal.getName())) {
            isAuthorized = true;
        } else {
            Optional<Farmer> farmerOpt = farmerRepository.findByEmail(principal.getName());
            if (farmerOpt.isPresent()) {
                isAuthorized = preorderItemRepository.findByPreorderId(po.getId()).stream()
                        .anyMatch(item -> item.getProduct().getFarmer().getId().equals(farmerOpt.get().getId()));
            }
            if (!isAuthorized) {
                Optional<Admin> adminOpt = adminRepository.findByEmail(principal.getName());
                if (adminOpt.isPresent()) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
        }

        List<PreorderItem> items = preorderItemRepository.findByPreorderId(po.getId());
        return ResponseEntity.ok(convertToResponse(po, items));
    }

    // 2. Get customer preorders
    @GetMapping("/my")
    public ResponseEntity<?> getMyPreorders(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        Optional<Customer> customerOpt = customerRepository.findByEmail(principal.getName());
        if (customerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Customer profile not found.");
        }

        List<Preorder> preorders = preorderRepository.findByCustomerIdOrderByCreatedAtDesc(customerOpt.get().getId()).stream()
                .filter(po -> !"pending_payment".equalsIgnoreCase(po.getStatus()))
                .collect(Collectors.toList());
        List<PreorderResponse> responses = preorders.stream().map(po -> {
            List<PreorderItem> items = preorderItemRepository.findByPreorderId(po.getId());
            return convertToResponse(po, items);
        }).collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    // 3. Get farmer preorders
    @GetMapping("/farmer")
    public ResponseEntity<?> getFarmerPreorders(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        Optional<Farmer> farmerOpt = farmerRepository.findByEmail(principal.getName());
        if (farmerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Farmer profile not found.");
        }

        List<Preorder> preorders = preorderRepository.findPreordersByFarmerId(farmerOpt.get().getId()).stream()
                .filter(po -> !"pending_payment".equalsIgnoreCase(po.getStatus()))
                .collect(Collectors.toList());
        List<PreorderResponse> responses = preorders.stream().map(po -> {
            List<PreorderItem> items = preorderItemRepository.findByPreorderId(po.getId()).stream()
                    .filter(item -> item.getProduct().getFarmer().getId().equals(farmerOpt.get().getId()))
                    .collect(Collectors.toList());
            return convertToResponse(po, items);
        }).collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    // 3.5. Get all preorders (Admin)
    @GetMapping("/admin")
    public ResponseEntity<?> getAllPreorders(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        Optional<Admin> adminOpt = adminRepository.findByEmail(principal.getName());
        if (adminOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden - Admin only");
        }

        List<Preorder> preorders = preorderRepository.findAll().stream()
                .filter(po -> !"pending_payment".equalsIgnoreCase(po.getStatus()))
                .collect(Collectors.toList());
        List<PreorderResponse> responses = preorders.stream().map(po -> {
            List<PreorderItem> items = preorderItemRepository.findByPreorderId(po.getId());
            return convertToResponse(po, items);
        }).collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    // 4. Update preorder status
    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<?> updatePreorderStatus(Principal principal, @PathVariable Long id, @RequestParam String status) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        Optional<Preorder> preorderOpt = preorderRepository.findById(id);
        if (preorderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Preorder not found.");
        }

        Preorder preorder = preorderOpt.get();

        // Security check: Must be the customer or a farmer who has a product in this preorder
        boolean isAuthorized = false;
        if (preorder.getCustomer().getEmail().equalsIgnoreCase(principal.getName())) {
            isAuthorized = true;
        } else {
            Optional<Farmer> farmerOpt = farmerRepository.findByEmail(principal.getName());
            if (farmerOpt.isPresent()) {
                List<PreorderItem> items = preorderItemRepository.findByPreorderId(preorder.getId());
                boolean hasFarmerProduct = items.stream().anyMatch(item -> item.getProduct().getFarmer().getId().equals(farmerOpt.get().getId()));
                if (hasFarmerProduct) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not have permission to modify this preorder.");
        }

        preorder.setStatus(status);
        preorder = preorderRepository.save(preorder);

        if ("completed".equalsIgnoreCase(status)) {
            orderService.convertPreorderToNormalOrder(preorder);
        }

        List<PreorderItem> items = preorderItemRepository.findByPreorderId(preorder.getId());
        return ResponseEntity.ok(convertToResponse(preorder, items));
    }

    private PreorderResponse convertToResponse(Preorder preorder, List<PreorderItem> items) {
        List<PreorderResponse.PreorderItemResponse> itemResponses = items.stream().map(item -> {
            Product p = item.getProduct();
            String farmerName = "";
            String farmLocation = "";
            if (p.getFarmer() != null) {
                farmerName = p.getFarmer().getFarmName() != null && !p.getFarmer().getFarmName().isEmpty()
                        ? p.getFarmer().getFarmName()
                        : p.getFarmer().getFullName();
                farmLocation = p.getFarmer().getFarmAddress() != null && !p.getFarmer().getFarmAddress().isEmpty()
                        ? p.getFarmer().getFarmAddress()
                        : "Chưa có địa chỉ";
            }

            // Get thumbnail from product_image
            String thumbnail = p.getTraceabilityImageUrl(); // fallback

            return PreorderResponse.PreorderItemResponse.builder()
                    .id(item.getId())
                    .productId(p.getId())
                    .productName(p.getName())
                    .productPrice(p.getPrice())
                    .productUnit(p.getUnit())
                    .productThumbnailUrl(thumbnail)
                    .quantity(item.getQuantity())
                    .expectedHarvestDate(item.getExpectedHarvestDate())
                    .farmerName(farmerName)
                    .farmLocation(farmLocation)
                    .build();
        }).collect(Collectors.toList());

        String customerName = preorder.getCustomer() != null ? preorder.getCustomer().getFullName() : "Khách hàng";
        String customerPhone = preorder.getCustomer() != null ? preorder.getCustomer().getPhone() : "";
        String customerAddress = "";
        if (preorder.getCustomer() != null && preorder.getCustomer().getAddresses() != null) {
            CustomerAddress defAddr = preorder.getCustomer().getAddresses().stream()
                    .filter(a -> a.getIsDefault() != null && a.getIsDefault())
                    .findFirst()
                    .orElse(preorder.getCustomer().getAddresses().isEmpty() ? null : preorder.getCustomer().getAddresses().get(0));
            if (defAddr != null) {
                customerAddress = defAddr.getAddress();
                if ((customerPhone == null || customerPhone.isEmpty()) && defAddr.getPhone() != null) {
                    customerPhone = defAddr.getPhone();
                }
            }
        }

        return PreorderResponse.builder()
                .id(preorder.getId())
                .customerId(preorder.getCustomer() != null ? preorder.getCustomer().getId() : null)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .customerAddress(customerAddress)
                .status(preorder.getStatus())
                .createdAt(preorder.getCreatedAt())
                .discount(preorder.getDiscount() != null ? preorder.getDiscount() : 0.0)
                .items(itemResponses)
                .build();
    }
}
