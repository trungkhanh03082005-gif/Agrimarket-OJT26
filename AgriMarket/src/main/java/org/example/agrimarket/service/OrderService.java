package org.example.agrimarket.service;

import org.example.agrimarket.dto.OrderCreateRequest;
import org.example.agrimarket.dto.OrderItemRequest;
import org.example.agrimarket.dto.OrderItemResponseDTO;
import org.example.agrimarket.dto.OrderResponse;
import org.example.agrimarket.dto.PageResponse;
import org.example.agrimarket.model.*;
import org.example.agrimarket.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderGroupRepository orderGroupRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductImageRepository productImageRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private GhnService ghnService;

    @Autowired
    private ProductReviewRepository productReviewRepository;

    @Autowired
    private DistanceService distanceService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private PreorderRepository preorderRepository;

    @Autowired
    private PreorderItemRepository preorderItemRepository;

    @Autowired
    private PromotionRepository promotionRepository;

    @Transactional
    public OrderResponse createOrder(String email, OrderCreateRequest request) {
        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin khách hàng."));

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("Đơn hàng phải có ít nhất một sản phẩm.");
        }

        // Generate group code
        String groupCode;
        Random random = new Random();
        do {
            groupCode = "OG-2026-" + (1000 + random.nextInt(9000));
        } while (orderGroupRepository.findByGroupCode(groupCode).isPresent());

        // Create OrderGroup
        OrderGroup orderGroup = new OrderGroup();
        orderGroup.setGroupCode(groupCode);
        orderGroup.setCustomer(customer);
        orderGroup.setTotalSubtotal(request.getSubtotal());
        orderGroup.setTotalShippingFee(request.getShippingFee());
        orderGroup.setTotalServiceFee(request.getServiceFee());
        orderGroup.setTotalDiscount(request.getDiscount());
        orderGroup.setGrandTotal(request.getAmount());
        orderGroup.setRecipientName(request.getRecipient());
        orderGroup.setRecipientPhone(request.getPhone());
        orderGroup.setDeliveryAddress(request.getAddress());
        orderGroup.setPaymentMethod(request.getPaymentMethod());
        orderGroup.setPaymentStatus("unpaid");

        // Validate and apply promotion if specified
        if (request.getAppliedPromoCode() != null && !request.getAppliedPromoCode().isBlank()) {
            Promotion promotion = promotionRepository.findByCode(request.getAppliedPromoCode())
                    .orElseThrow(() -> new RuntimeException("Chương trình khuyến mãi không hợp lệ."));

            // Check person limit
            if (promotion.getUsageLimitPerPerson() != null && promotion.getUsageLimitPerPerson() > 0) {
                long orderGroupCount = orderGroupRepository.countByCustomerIdAndAppliedPromoCode(customer.getId(), promotion.getCode());
                long preorderCount = preorderRepository.countByCustomerIdAndAppliedPromoCode(customer.getId(), promotion.getCode());
                if ((orderGroupCount + preorderCount) >= promotion.getUsageLimitPerPerson()) {
                    throw new RuntimeException("Bạn đã hết lượt sử dụng mã khuyến mãi này.");
                }
            }

            // Check global limit
            if (promotion.getMaxUses() != null && promotion.getMaxUses() > 0 
                    && promotion.getUsedCount() >= promotion.getMaxUses()) {
                throw new RuntimeException("Mã khuyến mãi này đã hết lượt sử dụng.");
            }

            // Increment promotion usage
            promotion.setUsedCount(promotion.getUsedCount() + 1);
            promotion.setUsedBudget(promotion.getUsedBudget() + request.getDiscount());
            promotionRepository.save(promotion);

            orderGroup.setAppliedPromoCode(promotion.getCode());
        }

        orderGroup = orderGroupRepository.save(orderGroup);

        // Group items by Farmer
        Map<Farmer, List<OrderItemDraft>> farmerItemsMap = new HashMap<>();
        Set<Long> orderedProductIds = new HashSet<>();

        for (OrderItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm có ID: " + itemReq.getProductId()));

            // Validate delivery range
            if (request.getAddress() != null && !request.getAddress().isBlank() 
                    && product.getFarmer() != null && product.getFarmer().getFarmAddress() != null) {
                String farmAddr = product.getFarmer().getFarmAddress();
                if (!farmAddr.isBlank() && !farmAddr.equalsIgnoreCase("Not updated") && !farmAddr.equalsIgnoreCase("Chưa có địa chỉ")) {
                    Double customerLat = request.getLatitude();
                    Double customerLon = request.getLongitude();
                    if (customerLat == null || customerLon == null) {
                        if (customer.getAddresses() != null) {
                            for (CustomerAddress addr : customer.getAddresses()) {
                                if (addr.getAddress() != null && addr.getAddress().equalsIgnoreCase(request.getAddress())) {
                                    customerLat = addr.getLatitude();
                                    customerLon = addr.getLongitude();
                                    break;
                                }
                            }
                        }
                    }
                    double distance = distanceService.calculateDistance(
                        request.getAddress(), customerLat, customerLon,
                        farmAddr, product.getFarmer().getLatitude(), product.getFarmer().getLongitude()
                    );
                    double maxProductDist = product.getLimitDistance() != null 
                            ? product.getLimitDistance() 
                            : distanceService.getMaxAllowedDistance(product.getPerishability());
                    double maxFarmerDist = product.getFarmer().getMaxDeliveryDistance() != null 
                            ? product.getFarmer().getMaxDeliveryDistance() 
                            : 1000.0;
                    double maxAllowed = Math.min(maxProductDist, maxFarmerDist);
                    if (distance > maxAllowed) {
                        throw new RuntimeException("Sản phẩm '" + product.getName() 
                                + "' nằm ngoài phạm vi giao hàng của nhà vườn (" 
                                + Math.round(distance * 10) / 10.0 + " km > " 
                                + Math.round(maxAllowed * 10) / 10.0 + " km). Vui lòng đổi địa chỉ nhận hàng hoặc xóa sản phẩm khỏi giỏ hàng.");
                    }
                }
            }

            if (product.getStockQuantity() < itemReq.getQuantity()) {
                throw new RuntimeException("Sản phẩm " + product.getName() + " không đủ số lượng tồn kho.");
            }

            // Decrement stock
            product.setStockQuantity(product.getStockQuantity() - itemReq.getQuantity());
            productRepository.save(product);

            if (product.getStockQuantity() == 0) {
                try {
                    Notification notif = Notification.builder()
                            .receiverType("farmer")
                            .receiverId(product.getFarmer().getId())
                            .title("Sản phẩm hết hàng!")
                            .content("Sản phẩm \"" + product.getName() + "\" của bạn đã hết hàng trong kho. Vui lòng cập nhật thêm số lượng tồn kho.")
                            .link("/farmer/products")
                            .createdAt(LocalDateTime.now())
                            .isRead(false)
                            .build();
                    notificationRepository.save(notif);
                } catch (Exception e) {
                    System.err.println("Lỗi gửi thông báo hết hàng: " + e.getMessage());
                }
            }

            // Get product image
            String imageUrl = "";
            List<ProductImage> images = productImageRepository.findByProductId(product.getId());
            if (images != null && !images.isEmpty()) {
                imageUrl = images.stream()
                        .filter(img -> img.getIsThumbnail() != null && img.getIsThumbnail())
                        .map(ProductImage::getImgUrl)
                        .findFirst()
                        .orElse(images.get(0).getImgUrl());
            }

            Farmer farmer = product.getFarmer();
            if (farmer == null) {
                throw new RuntimeException("Sản phẩm " + product.getName() + " không có thông tin nhà vườn.");
            }

            OrderItemDraft draft = new OrderItemDraft(product, itemReq.getQuantity(), imageUrl);
            farmerItemsMap.computeIfAbsent(farmer, k -> new ArrayList<>()).add(draft);
            orderedProductIds.add(product.getId());
        }

        // Proportional distribution totals
        double totalSubtotal = request.getSubtotal();
        double totalShippingFee = request.getShippingFee();
        double totalServiceFee = request.getServiceFee();
        double totalDiscount = request.getDiscount();

        List<Order> savedSubOrders = new ArrayList<>();
        int farmerIndex = 0;
        int numFarmers = farmerItemsMap.size();

        double allocatedShippingSum = 0;
        double allocatedServiceSum = 0;
        double allocatedDiscountSum = 0;

        for (Map.Entry<Farmer, List<OrderItemDraft>> entry : farmerItemsMap.entrySet()) {
            Farmer farmer = entry.getKey();
            List<OrderItemDraft> drafts = entry.getValue();

            double farmerSubtotal = 0;
            for (OrderItemDraft d : drafts) {
                farmerSubtotal += d.product.getPrice() * d.quantity;
            }

            double ratio = totalSubtotal > 0 ? (farmerSubtotal / totalSubtotal) : (1.0 / numFarmers);

            double shippingFee;
            double serviceFee;
            double discount;

            farmerIndex++;
            if (farmerIndex == numFarmers) {
                // Last farmer gets the remainder
                shippingFee = totalShippingFee - allocatedShippingSum;
                serviceFee = totalServiceFee - allocatedServiceSum;
                discount = totalDiscount - allocatedDiscountSum;
            } else {
                shippingFee = Math.round((ratio * totalShippingFee) * 100.0) / 100.0;
                serviceFee = Math.round((ratio * totalServiceFee) * 100.0) / 100.0;
                discount = Math.round((ratio * totalDiscount) * 100.0) / 100.0;

                allocatedShippingSum += shippingFee;
                allocatedServiceSum += serviceFee;
                allocatedDiscountSum += discount;
            }

            double amount = farmerSubtotal + shippingFee + serviceFee - discount;

            // Generate child order code
            String orderCode;
            do {
                orderCode = "FH-2026-" + (1000 + random.nextInt(9000));
            } while (orderRepository.findByOrderCode(orderCode).isPresent());

            Order order = new Order();
            order.setOrderCode(orderCode);
            order.setOrderGroup(orderGroup);
            order.setFarmer(farmer);
            order.setCustomer(customer);
            order.setShippingNote(request.getShippingNote());
            order.setPaymentStatus("unpaid");

            // Với VNPay: đặt trạng thái 'awaiting_payment' để ẩn đơn hàng khỏi farmer
            // cho đến khi thanh toán được xác nhận thành công qua callback.
            // Với COD và các phương thức khác: chuyển thẳng sang 'pending'.
            boolean isVnPay = "VNPay".equalsIgnoreCase(request.getPaymentMethod())
                    || "VNPAY".equalsIgnoreCase(request.getPaymentMethod());
            order.setStatus(isVnPay ? "awaiting_payment" : "pending");

            order.setSubtotal(farmerSubtotal);
            order.setShippingFee(shippingFee);
            order.setServiceFee(serviceFee);
            order.setDiscount(discount);
            order.setAmount(amount);
            order.setTrackingNumber("FH-TRACK-" + (100000 + random.nextInt(900000)));

            List<OrderItem> orderItems = new ArrayList<>();
            for (OrderItemDraft d : drafts) {
                OrderItem item = new OrderItem();
                item.setOrder(order);
                item.setProductId(d.product.getId());
                item.setProductName(d.product.getName());
                item.setProductPrice(d.product.getPrice());
                item.setProductUnit(d.product.getUnit());
                item.setImageUrl(d.imageUrl);
                item.setQuantity(d.quantity);
                item.setFarmer(farmer);
                orderItems.add(item);
            }

            if (order.getItems() == null) {
                order.setItems(orderItems);
            } else {
                order.getItems().clear();
                if (orderItems != null) {
                    order.getItems().addAll(orderItems);
                }
            }
            Order savedOrder = orderRepository.save(order);
            savedSubOrders.add(savedOrder);

            // Chỉ thông báo farmer ngay nếu KHÔNG phải VNPay.
            // Với VNPay, thông báo sẽ được gửi sau khi callback thành công.
            if (!isVnPay) {
                try {
                    Notification notif = Notification.builder()
                            .receiverType("farmer")
                            .receiverId(farmer.getId())
                            .title("Đơn hàng mới!")
                            .content("Bạn có một đơn hàng mới từ khách hàng " + customer.getFullName() + ". Mã đơn hàng: " + savedOrder.getOrderCode())
                            .link("/farmer/orders/orderdetail/" + savedOrder.getOrderCode())
                            .createdAt(LocalDateTime.now())
                            .isRead(false)
                            .build();
                    notificationRepository.save(notif);
                } catch (Exception e) {
                    System.err.println("Lỗi tạo thông báo đơn hàng mới cho farmer: " + e.getMessage());
                }
            }
        }

        orderGroup.getSubOrders().clear();
        orderGroup.getSubOrders().addAll(savedSubOrders);

        // Remove from cart
        Optional<Cart> cartOpt = cartRepository.findByEmail(email);
        if (cartOpt.isPresent()) {
            Cart cart = cartOpt.get();
            List<CartItem> itemsToRemove = cart.getItems().stream()
                    .filter(item -> orderedProductIds.contains(item.getProductId()))
                    .collect(Collectors.toList());

            if (!itemsToRemove.isEmpty()) {
                cartItemRepository.deleteAll(itemsToRemove);
                cart.getItems().removeAll(itemsToRemove);
                cartRepository.save(cart);
            }
        }

        return mapGroupToResponse(orderGroup);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getCustomerOrders(String email) {
        List<Order> orders = orderRepository.findByCustomerEmailOrderByCreatedAtDesc(email);
        return mapToResponseList(orders);
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> getCustomerOrdersPaged(String email, int page, int size, String status) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Order> orderPage;
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            orderPage = orderRepository.findByCustomerEmailAndStatusOrderByCreatedAtDesc(email, status.toLowerCase(), pageable);
        } else {
            orderPage = orderRepository.findByCustomerEmailOrderByCreatedAtDesc(email, pageable);
        }
        List<OrderResponse> content = mapToResponseList(orderPage.getContent());
        return PageResponse.of(content, orderPage);
    }

    @Transactional(readOnly = true)
    public List<String> getUsedPromotions(String email) {
        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin khách hàng."));
        List<String> groupPromoCodes = orderGroupRepository.findAppliedPromoCodesByCustomerId(customer.getId());
        List<String> preorderPromoCodes = preorderRepository.findAppliedPromoCodesByCustomerId(customer.getId());
        
        List<String> allCodes = new ArrayList<>();
        if (groupPromoCodes != null) {
            allCodes.addAll(groupPromoCodes.stream().filter(Objects::nonNull).collect(Collectors.toList()));
        }
        if (preorderPromoCodes != null) {
            allCodes.addAll(preorderPromoCodes.stream().filter(Objects::nonNull).collect(Collectors.toList()));
        }
        return allCodes;
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderDetails(String email, String orderCode) {
        if (orderCode != null && orderCode.startsWith("OG-")) {
            OrderGroup group = orderGroupRepository.findByGroupCode(orderCode)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy nhóm đơn hàng."));
            if (!group.getCustomer().getEmail().equalsIgnoreCase(email)) {
                throw new RuntimeException("Bạn không có quyền xem đơn hàng này.");
            }
            return mapGroupToResponse(group);
        }

        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng."));

        // Verify customer owns the order
        boolean isCustomer = order.getCustomer().getEmail().equalsIgnoreCase(email);
        if (!isCustomer) {
            throw new RuntimeException("Bạn không có quyền xem đơn hàng này.");
        }

        return mapToResponse(order);
    }

    @Transactional
    public OrderResponse cancelOrder(String email, String orderCode, String reason) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng."));

        // Verify customer ownership
        if (!order.getCustomer().getEmail().equalsIgnoreCase(email)) {
            throw new RuntimeException("Bạn không có quyền hủy đơn hàng này.");
        }

        if (!"pending".equalsIgnoreCase(order.getStatus())) {
            throw new RuntimeException("Đơn hàng đã được xử lý (hoặc đang chuẩn bị), không thể hủy.");
        }

        order.setStatus("cancelled");
        order.setCancelReason(reason != null && !reason.isBlank() ? reason : "Người dùng tự hủy");
        order.setCancelBy("customer");
        order.setCancelledAt(LocalDateTime.now());

        // Restore stock
        for (OrderItem item : order.getItems()) {
            Optional<Product> productOpt = productRepository.findById(item.getProductId());
            if (productOpt.isPresent()) {
                Product product = productOpt.get();
                product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
                productRepository.save(product);
            }
        }

        Order updatedOrder = orderRepository.save(order);
        return mapToResponse(updatedOrder);
    }

    @Transactional
    public OrderResponse confirmPayment(String email, String orderCode, String paymentMethod) {
        // Check if it is a group payment confirmation
        Optional<OrderGroup> groupOpt = orderGroupRepository.findByGroupCode(orderCode);
        if (groupOpt.isPresent()) {
            OrderGroup group = groupOpt.get();
            if (!group.getCustomer().getEmail().equalsIgnoreCase(email)) {
                throw new RuntimeException("Bạn không có quyền thao tác trên đơn hàng này.");
            }

            group.setPaymentStatus("paid");
            if (paymentMethod != null && !paymentMethod.isBlank()) {
                group.setPaymentMethod(paymentMethod);
            }

            if (group.getSubOrders() != null) {
                for (Order order : group.getSubOrders()) {
                    order.setStatus("pending");
                    order.setPaymentStatus("paid");
                    orderRepository.save(order);
                }
            }

            OrderGroup savedGroup = orderGroupRepository.save(group);
            return mapGroupToResponse(savedGroup);
        }

        // Otherwise fallback to individual order confirmation
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng hoặc nhóm đơn hàng."));

        // Verify customer ownership
        if (!order.getCustomer().getEmail().equalsIgnoreCase(email)) {
            throw new RuntimeException("Bạn không có quyền thao tác trên đơn hàng này.");
        }

        order.setStatus("pending");
        order.setPaymentStatus("paid");
        if (paymentMethod != null && !paymentMethod.isBlank() && order.getOrderGroup() != null) {
            order.getOrderGroup().setPaymentMethod(paymentMethod);
            orderGroupRepository.save(order.getOrderGroup());
        }

        Order updatedOrder = orderRepository.save(order);
        return mapToResponse(updatedOrder);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getFarmerOrders(String farmerEmail) {
        List<Order> orders = orderRepository.findByFarmerEmail(farmerEmail);
        return orders.stream()
                // Lọc bỏ đơn đang chờ thanh toán VNPay – chưa được xác nhận
                .filter(order -> !"awaiting_payment".equalsIgnoreCase(order.getStatus()))
                .map(order -> mapToFarmerResponse(order, farmerEmail))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> getFarmerOrdersPaged(String farmerEmail, int page, int size, String status) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Order> orderPage;
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            orderPage = orderRepository.findByFarmerEmailAndStatusPaged(farmerEmail, status.toLowerCase(), "awaiting_payment", pageable);
        } else {
            orderPage = orderRepository.findByFarmerEmailAndStatusNotPaged(farmerEmail, "awaiting_payment", pageable);
        }
        List<OrderResponse> content = orderPage.getContent().stream()
                .map(order -> mapToFarmerResponse(order, farmerEmail))
                .collect(Collectors.toList());
        return PageResponse.of(content, orderPage);
    }

    @Transactional
    public OrderResponse updateFarmerOrderStatus(String farmerEmail, String orderCode, String newStatus,
            String reason) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng."));

        // Verify this order belongs to the farmer
        if (order.getFarmer() == null || !order.getFarmer().getEmail().equalsIgnoreCase(farmerEmail)) {
            throw new RuntimeException("Bạn không có quyền cập nhật trạng thái đơn hàng này.");
        }

        String currentStatus = order.getStatus().toLowerCase();
        if (!"pending".equals(currentStatus) && !"preparing".equals(currentStatus)) {
            throw new RuntimeException("Đơn hàng đã ở trạng thái '" + order.getStatus() + "', nhà vườn không thể thao tác nữa.");
        }

        String statusLower = newStatus.toLowerCase();
        if ("pending".equals(currentStatus)) {
            if (!"preparing".equals(statusLower) && !"rejected".equals(statusLower)) {
                throw new RuntimeException("Chờ xác nhận: Nhà vườn chỉ có thể xác nhận đơn (Đang chuẩn bị) hoặc từ chối đơn.");
            }
        } else if ("preparing".equals(currentStatus)) {
            if (!"confirmed".equals(statusLower) && !"rejected".equals(statusLower)) {
                throw new RuntimeException("Đang chuẩn bị: Nhà vườn chỉ có thể hoàn thành chuẩn bị (Chờ lấy hàng) hoặc từ chối đơn.");
            }
        }

        if ("confirmed".equals(statusLower)) {
            String address = order.getOrderGroup() != null ? order.getOrderGroup().getDeliveryAddress() : "";
            boolean isPickup = address != null && (address.toLowerCase().contains("tự nhận") || address.toLowerCase().contains("nông trại"));
            if (!isPickup) {
                ghnService.createShipment(order);
            } else {
                order.setStatus("shipping");
                order.setDetailedStatus("ready_for_pickup");
                order.setShipperNotes("Đơn hàng đã sẵn sàng tại nông trại. Vui lòng đến lấy nhận hàng.");
            }
        } else {
            order.setStatus(statusLower);
        }

        // If status is rejected or cancelled, and it wasn't already, restore stock for
        // the farmer's items (or all items in the order, depending on the system design
        // - restoring all is simpler since it's a single order)
        if ("rejected".equals(statusLower) || "cancelled".equals(statusLower)) {
            order.setCancelReason(reason != null && !reason.isBlank() ? reason : "Nhà vườn từ chối");
            order.setCancelBy("farmer");
            order.setCancelledAt(LocalDateTime.now());
            for (OrderItem item : order.getItems()) {
                Optional<Product> productOpt = productRepository.findById(item.getProductId());
                if (productOpt.isPresent()) {
                    Product product = productOpt.get();
                    product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
                    productRepository.save(product);
                }
            }
        }

        Order updatedOrder = orderRepository.save(order);
        return mapToFarmerResponse(updatedOrder, farmerEmail);
    }

    private OrderResponse mapToFarmerResponse(Order order, String farmerEmail) {
        OrderResponse base = mapToResponse(order);

        // Filter items only sold by this farmer
        List<OrderItemResponseDTO> filteredItems = order.getItems().stream()
                .filter(item -> item.getFarmer() != null && item.getFarmer().getEmail().equalsIgnoreCase(farmerEmail))
                .map(item -> {
                    boolean isReviewed = productReviewRepository.findByOrderIdAndProductIdAndCustomerId(
                            order.getId(), item.getProductId(), order.getCustomer().getId()).isPresent();
                    return OrderItemResponseDTO.builder()
                            .productId(item.getProductId())
                            .farmerId(item.getFarmer() != null ? item.getFarmer().getId() : null)
                            .name(item.getProductName())
                            .farmer(item.getFarmer() != null ? item.getFarmer().getFullName() : "Nhà vườn địa phương")
                            .price(item.getProductPrice())
                            .qty(item.getQuantity())
                            .img(item.getImageUrl())
                            .isReviewed(isReviewed)
                            .build();
                })
                .collect(Collectors.toList());

        base.setItems(filteredItems);

        // Re-calculate subtotal & total amount specific to the farmer
        double subtotal = filteredItems.stream()
                .mapToDouble(item -> item.getPrice() * item.getQty())
                .sum();
        base.setSubtotal(subtotal);
        base.setAmount(subtotal); // Farmer gets their specific item total
        base.setItemCount(filteredItems.stream().mapToInt(OrderItemResponseDTO::getQty).sum());

        // Thumbnails
        List<String> thumbnails = filteredItems.stream()
                .map(OrderItemResponseDTO::getImg)
                .filter(img -> img != null && !img.isBlank())
                .limit(3)
                .collect(Collectors.toList());
        base.setThumbnails(thumbnails);
        base.setHasMoreItems(Math.max(0, filteredItems.size() - 3));

        return base;
    }

    private List<OrderResponse> mapToResponseList(List<Order> orders) {
        if (orders == null || orders.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<Long> orderIds = orders.stream().map(Order::getId).collect(Collectors.toList());

        // Bulk load all reviewed products for these orders
        List<Object[]> reviewedData = productReviewRepository.findReviewedProductsForOrders(orderIds);
        
        java.util.Set<String> reviewedKeys = new java.util.HashSet<>();
        for (Object[] row : reviewedData) {
            Long orderId = (Long) row[0];
            Long productId = (Long) row[1];
            reviewedKeys.add(orderId + "-" + productId);
        }

        return orders.stream()
                .map(o -> mapToResponseOptimized(o, reviewedKeys))
                .collect(Collectors.toList());
    }

    private OrderResponse mapToResponse(Order order) {
        return mapToResponseOptimized(order, java.util.Collections.emptySet());
    }

    private OrderResponse mapToResponseOptimized(Order order, java.util.Set<String> reviewedKeys) {
        // Date time formatting
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd 'thg' MM, yyyy", new Locale("vi", "VN"));
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("hh:mm a", new Locale("vi", "VN"));

        String dateStr = order.getCreatedAt().format(dateFormatter);
        String timeStr = order.getCreatedAt().format(timeFormatter).replace("AM", "SA").replace("PM", "CH");

        // Status mapping
        String statusLabel = order.getStatus();
        switch (order.getStatus().toLowerCase()) {
            case "awaiting_payment":
                statusLabel = "Chờ thanh toán";
                break;
            case "pending":
                statusLabel = "Chờ xác nhận";
                break;
            case "preparing":
                statusLabel = "Đang chuẩn bị";
                break;
            case "confirmed":
                statusLabel = "Chờ lấy hàng";
                break;
            case "shipping":
                statusLabel = "Chờ giao hàng";
                break;
            case "delivered":
                statusLabel = "Đã giao";
                break;
            case "cancelled":
                statusLabel = "Đã hủy";
                break;
            case "rejected":
                statusLabel = "Đã từ chối";
                break;
        }

        // Provider mapping from farmer directly or first item as fallback
        OrderResponse.ProviderInfo providerInfo = null;
        Farmer farmer = order.getFarmer();
        if (farmer == null && order.getItems() != null && !order.getItems().isEmpty()) {
            farmer = order.getItems().get(0).getFarmer();
        }
        if (farmer != null) {
                String name = farmer.getFarmName() != null && !farmer.getFarmName().isBlank()
                        ? farmer.getFarmName()
                        : farmer.getFullName();
                String location = farmer.getFarmAddress() != null && !farmer.getFarmAddress().isBlank()
                        ? farmer.getFarmAddress()
                        : "Tiền Giang";
                int estYear = farmer.getCreatedAt() != null ? farmer.getCreatedAt().getYear() : 2018;
                String avatarText = name.substring(0, Math.min(name.length(), 2)).toUpperCase();

                // Color choices based on name length
                String[] colors = { "#1b5e20", "#0d47a1", "#e65100", "#004d40", "#3e2723", "#33691e" };
                String avatarBg = colors[Math.abs(name.hashCode()) % colors.length];

                providerInfo = OrderResponse.ProviderInfo.builder()
                        .name(name)
                        .location(location)
                        .phone(farmer.getPhone())
                        .estYear(estYear)
                        .avatarText(avatarText)
                        .avatarBg(avatarBg)
                        .avatarUrl(farmer.getAvatarUrl())
                        .build();
        }

        // Map items
        List<OrderItemResponseDTO> itemsMapped = new ArrayList<>();
        if (order.getItems() != null) {
            itemsMapped = order.getItems().stream().map(item -> {
                boolean isReviewed = reviewedKeys.contains(order.getId() + "-" + item.getProductId());
                return OrderItemResponseDTO.builder()
                        .productId(item.getProductId())
                        .farmerId(item.getFarmer() != null ? item.getFarmer().getId() : null)
                        .name(item.getProductName())
                        .farmer(item.getFarmer() != null ? item.getFarmer().getFullName() : "Nhà vườn địa phương")
                        .price(item.getProductPrice())
                        .qty(item.getQuantity())
                        .img(item.getImageUrl())
                        .isReviewed(isReviewed)
                        .build();
            }).collect(Collectors.toList());
        }

        // Thumbnails
        List<String> thumbnails = itemsMapped.stream()
                .map(OrderItemResponseDTO::getImg)
                .filter(img -> img != null && !img.isBlank())
                .limit(3)
                .collect(Collectors.toList());

        int itemCount = order.getItems() != null ? order.getItems().stream().mapToInt(OrderItem::getQuantity).sum() : 0;
        int hasMoreItems = order.getItems() != null ? Math.max(0, order.getItems().size() - 3) : 0;

        // Build driverInfo if driver has been assigned
        OrderResponse.DriverInfo driverInfo = null;
        if (order.getDriverName() != null && !order.getDriverName().isBlank()) {
            driverInfo = OrderResponse.DriverInfo.builder()
                    .driverName(order.getDriverName())
                    .driverCode(order.getDriverCode())
                    .driverPhone(order.getDriverPhone())
                    .vehicleType(order.getVehicleType())
                    .licensePlate(order.getLicensePlate())
                    .build();
        }

        return OrderResponse.builder()
                .id(order.getOrderCode())
                .status(order.getStatus())
                .statusLabel(statusLabel)
                .date(dateStr)
                .time(timeStr)
                .subtotal(order.getSubtotal())
                .shippingFee(order.getShippingFee())
                .serviceFee(order.getServiceFee())
                .discount(order.getDiscount())
                .amount(order.getAmount())
                .recipient(order.getOrderGroup() != null ? order.getOrderGroup().getRecipientName() : "")
                .address(order.getOrderGroup() != null ? order.getOrderGroup().getDeliveryAddress() : "")
                .phone(order.getOrderGroup() != null ? order.getOrderGroup().getRecipientPhone() : "")
                .trackingNumber(order.getTrackingNumber())
                .cancelReason(order.getCancelReason())
                .cancelBy(order.getCancelBy())
                .cancelledAt(order.getCancelledAt())
                .customerAvatarUrl(order.getCustomer() != null ? order.getCustomer().getAvatarUrl() : null)
                .shippingNote(order.getShippingNote())
                .provider(providerInfo)
                .partner(null)
                .shipperNotes(order.getShipperNotes())
                .podPhoto(order.getPodPhoto())
                .detailedStatus(order.getDetailedStatus())
                .driverInfo(driverInfo)
                .items(itemsMapped)
                .thumbnails(thumbnails)
                .itemCount(itemCount)
                .hasMoreItems(hasMoreItems)
                .paymentMethod(order.getOrderGroup() != null ? order.getOrderGroup().getPaymentMethod() : "")
                .paymentStatus(order.getPaymentStatus())
                .build();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders() {
        List<Order> orders = orderRepository.findAll();
        orders.sort((o1, o2) -> {
            if (o1.getCreatedAt() == null && o2.getCreatedAt() == null)
                return 0;
            if (o1.getCreatedAt() == null)
                return 1;
            if (o2.getCreatedAt() == null)
                return -1;
            return o2.getCreatedAt().compareTo(o1.getCreatedAt());
        });
        return mapToResponseList(orders);
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> getAllOrdersPaged(int page, int size, String status, String paymentStatus, String search) {
        PageRequest pageable = PageRequest.of(page, size);
        String cleanStatus = (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) ? status.trim() : null;
        String cleanPaymentStatus = (paymentStatus != null && !paymentStatus.isBlank() && !"all".equalsIgnoreCase(paymentStatus)) ? paymentStatus.trim() : null;
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        Page<Order> orderPage = orderRepository.findAllPagedAdmin(cleanStatus, cleanPaymentStatus, cleanSearch, pageable);
        List<OrderResponse> content = mapToResponseList(orderPage.getContent());

        return PageResponse.of(content, orderPage);
    }

    @Transactional
    public OrderResponse updateOrderStatusByAdmin(String orderCode, String newStatus, String paymentStatus,
            String reason) {
        throw new RuntimeException("Quản trị viên không có quyền can thiệp vào các đơn hàng.");
    }

    private OrderResponse mapGroupToResponse(OrderGroup group) {
        // Date time formatting
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd 'thg' MM, yyyy", new Locale("vi", "VN"));
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("hh:mm a", new Locale("vi", "VN"));

        String dateStr = group.getCreatedAt().format(dateFormatter);
        String timeStr = group.getCreatedAt().format(timeFormatter).replace("AM", "SA").replace("PM", "CH");

        String statusLabel = "Chờ xác nhận";

        // Provider mapping from first sub-order
        OrderResponse.ProviderInfo providerInfo = null;
        if (group.getSubOrders() != null && !group.getSubOrders().isEmpty()) {
            Farmer farmer = group.getSubOrders().get(0).getFarmer();
            if (farmer != null) {
                String name = farmer.getFarmName() != null && !farmer.getFarmName().isBlank()
                        ? farmer.getFarmName()
                        : farmer.getFullName();
                String location = farmer.getFarmAddress() != null && !farmer.getFarmAddress().isBlank()
                        ? farmer.getFarmAddress()
                        : "Tiền Giang";
                int estYear = farmer.getCreatedAt() != null ? farmer.getCreatedAt().getYear() : 2018;
                String avatarText = name.substring(0, Math.min(name.length(), 2)).toUpperCase();

                String[] colors = { "#1b5e20", "#0d47a1", "#e65100", "#004d40", "#3e2723", "#33691e" };
                String avatarBg = colors[Math.abs(name.hashCode()) % colors.length];

                providerInfo = OrderResponse.ProviderInfo.builder()
                        .name(name)
                        .location(location)
                        .phone(farmer.getPhone())
                        .estYear(estYear)
                        .avatarText(avatarText)
                        .avatarBg(avatarBg)
                        .avatarUrl(farmer.getAvatarUrl())
                        .build();
            }
        }

        // Map items from all sub-orders
        List<OrderItemResponseDTO> itemsMapped = new ArrayList<>();
        if (group.getSubOrders() != null) {
            for (Order subOrder : group.getSubOrders()) {
                if (subOrder.getItems() != null) {
                    for (OrderItem item : subOrder.getItems()) {
                        boolean isReviewed = productReviewRepository.findByOrderIdAndProductIdAndCustomerId(
                                subOrder.getId(), item.getProductId(), group.getCustomer().getId()).isPresent();
                        itemsMapped.add(OrderItemResponseDTO.builder()
                                .productId(item.getProductId())
                                .farmerId(item.getFarmer() != null ? item.getFarmer().getId() : null)
                                .name(item.getProductName())
                                .farmer(item.getFarmer() != null ? item.getFarmer().getFullName() : "Nhà vườn địa phương")
                                .price(item.getProductPrice())
                                .qty(item.getQuantity())
                                .img(item.getImageUrl())
                                .isReviewed(isReviewed)
                                .build());
                    }
                }
            }
        }

        List<String> thumbnails = itemsMapped.stream()
                .map(OrderItemResponseDTO::getImg)
                .filter(img -> img != null && !img.isBlank())
                .limit(3)
                .collect(Collectors.toList());

        int itemCount = itemsMapped.stream().mapToInt(OrderItemResponseDTO::getQty).sum();
        int hasMoreItems = Math.max(0, itemsMapped.size() - 3);

        String trackingNumber = "";
        if (group.getSubOrders() != null && !group.getSubOrders().isEmpty()) {
            trackingNumber = group.getSubOrders().get(0).getTrackingNumber();
        }

        return OrderResponse.builder()
                .id(group.getGroupCode())
                .status("pending")
                .statusLabel(statusLabel)
                .date(dateStr)
                .time(timeStr)
                .subtotal(group.getTotalSubtotal())
                .shippingFee(group.getTotalShippingFee())
                .serviceFee(group.getTotalServiceFee())
                .discount(group.getTotalDiscount())
                .amount(group.getGrandTotal())
                .recipient(group.getRecipientName())
                .address(group.getDeliveryAddress())
                .phone(group.getRecipientPhone())
                .trackingNumber(trackingNumber)
                .paymentMethod(group.getPaymentMethod())
                .paymentStatus(group.getPaymentStatus())
                .provider(providerInfo)
                .items(itemsMapped)
                .thumbnails(thumbnails)
                .itemCount(itemCount)
                .hasMoreItems(hasMoreItems)
                .build();
    }

    public double calculateTotalShippingFee(List<Integer> productIds, String toAddress) {
        Map<Farmer, Integer> farmerWeights = new HashMap<>();
        for (Integer pid : productIds) {
            Optional<Product> prodOpt = productRepository.findById(pid.longValue());
            if (prodOpt.isPresent()) {
                Product prod = prodOpt.get();
                Farmer farmer = prod.getFarmer();
                farmerWeights.put(farmer, farmerWeights.getOrDefault(farmer, 0) + 1000);
            }
        }

        double totalFee = 0.0;
        for (Map.Entry<Farmer, Integer> entry : farmerWeights.entrySet()) {
            Farmer farmer = entry.getKey();
            int weight = entry.getValue();
            String fromAddr = farmer.getFarmAddress();
            if (fromAddr == null || fromAddr.isBlank()) {
                fromAddr = "Tiền Giang, Việt Nam";
            }
            totalFee += ghnService.calculateShippingFee(fromAddr, toAddress, weight);
        }

        return totalFee;
    }

    @Transactional
    public OrderResponse confirmOrderReceived(String email, String orderCode) {
        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin khách hàng."));

        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng."));

        if (!order.getCustomer().getId().equals(customer.getId())) {
            throw new RuntimeException("Bạn không có quyền xác nhận đơn hàng này.");
        }

        if (!"shipping".equalsIgnoreCase(order.getStatus())) {
            throw new RuntimeException("Đơn hàng chưa ở trạng thái vận chuyển hoặc chờ lấy hàng.");
        }

        order.setStatus("delivered");
        order.setDetailedStatus("delivered");
        order.setPaymentStatus("paid");
        order.setShipperNotes("Người mua đã đến nhận hàng tại nông trại và xác nhận lấy đơn hàng thành công.");
        Order saved = orderRepository.save(order);
        return mapToResponse(saved);
    }

    @Transactional
    public void convertPreorderToNormalOrder(Preorder preorder) {
        Customer customer = preorder.getCustomer();
        List<PreorderItem> preorderItems = preorderItemRepository.findByPreorderId(preorder.getId());
        if (preorderItems.isEmpty()) return;

        // Xử lý thông tin người nhận mặc định từ danh sách địa chỉ của khách hàng
        String recipientName = customer.getFullName();
        String recipientPhone = customer.getPhone() != null ? customer.getPhone() : "0000000000";
        String deliveryAddress = "Chưa cập nhật địa chỉ";
        Double latitude = null;
        Double longitude = null;

        if (customer.getAddresses() != null && !customer.getAddresses().isEmpty()) {
            CustomerAddress address = customer.getAddresses().stream()
                    .filter(addr -> Boolean.TRUE.equals(addr.getIsDefault()))
                    .findFirst()
                    .orElse(customer.getAddresses().get(0));
            recipientName = address.getReceiverName() != null ? address.getReceiverName() : customer.getFullName();
            recipientPhone = address.getPhone() != null ? address.getPhone() : customer.getPhone();
            deliveryAddress = address.getAddress();
            latitude = address.getLatitude();
            longitude = address.getLongitude();
        }

        // Tính tổng tiền sản phẩm
        double subtotal = 0;
        for (PreorderItem item : preorderItems) {
            subtotal += item.getProduct().getPrice() * item.getQuantity();
        }

        double shippingFee = 35000.0; // Mặc định GHN giao hàng
        double serviceFee = 15000.0;
        double discount = 0.0;
        double totalAmount = subtotal + shippingFee + serviceFee;

        // Tạo OrderGroup
        Random random = new Random();
        String groupCode;
        do {
            groupCode = "OG-2026-" + (1000 + random.nextInt(9000));
        } while (orderGroupRepository.findByGroupCode(groupCode).isPresent());

        OrderGroup orderGroup = new OrderGroup();
        orderGroup.setGroupCode(groupCode);
        orderGroup.setCustomer(customer);
        orderGroup.setTotalSubtotal(subtotal);
        orderGroup.setTotalShippingFee(shippingFee);
        orderGroup.setTotalServiceFee(serviceFee);
        orderGroup.setTotalDiscount(discount);
        orderGroup.setGrandTotal(totalAmount);
        orderGroup.setRecipientName(recipientName);
        orderGroup.setRecipientPhone(recipientPhone);
        orderGroup.setDeliveryAddress(deliveryAddress);
        orderGroup.setPaymentMethod("VNPAY");
        orderGroup.setPaymentStatus("paid");

        orderGroup = orderGroupRepository.save(orderGroup);

        // Gom các preorder items theo từng nhà vườn
        Map<Farmer, List<PreorderItem>> farmerItemsMap = new HashMap<>();
        for (PreorderItem item : preorderItems) {
            Farmer farmer = item.getProduct().getFarmer();
            if (farmer != null) {
                farmerItemsMap.computeIfAbsent(farmer, k -> new ArrayList<>()).add(item);
            }
        }

        List<Order> savedSubOrders = new ArrayList<>();
        int farmerIndex = 0;
        int numFarmers = farmerItemsMap.size();
        double allocatedShippingSum = 0;
        double allocatedServiceSum = 0;

        for (Map.Entry<Farmer, List<PreorderItem>> entry : farmerItemsMap.entrySet()) {
            Farmer farmer = entry.getKey();
            List<PreorderItem> items = entry.getValue();

            double farmerSubtotal = 0;
            for (PreorderItem item : items) {
                farmerSubtotal += item.getProduct().getPrice() * item.getQuantity();
            }

            double ratio = subtotal > 0 ? (farmerSubtotal / subtotal) : (1.0 / numFarmers);
            double farmerShippingFee;
            double farmerServiceFee;

            farmerIndex++;
            if (farmerIndex == numFarmers) {
                farmerShippingFee = shippingFee - allocatedShippingSum;
                farmerServiceFee = serviceFee - allocatedServiceSum;
            } else {
                farmerShippingFee = Math.round((ratio * shippingFee) * 100.0) / 100.0;
                farmerServiceFee = Math.round((ratio * serviceFee) * 100.0) / 100.0;
                allocatedShippingSum += farmerShippingFee;
                allocatedServiceSum += farmerServiceFee;
            }

            double farmerAmount = farmerSubtotal + farmerShippingFee + farmerServiceFee;

            String orderCode;
            do {
                orderCode = "FH-2026-" + (1000 + random.nextInt(9000));
            } while (orderRepository.findByOrderCode(orderCode).isPresent());

            Order order = new Order();
            order.setOrderCode(orderCode);
            order.setOrderGroup(orderGroup);
            order.setFarmer(farmer);
            order.setCustomer(customer);
            order.setPaymentStatus("paid");
            order.setStatus("preparing"); // Đang chuẩn bị
            order.setDetailedStatus("pending");
            order.setSubtotal(farmerSubtotal);
            order.setShippingFee(farmerShippingFee);
            order.setServiceFee(farmerServiceFee);
            order.setDiscount(0.0);
            order.setAmount(farmerAmount);
            order.setTrackingNumber("FH-TRACK-" + (100000 + random.nextInt(900000)));

            List<OrderItem> orderItems = new ArrayList<>();
            for (PreorderItem preorderItem : items) {
                OrderItem orderItem = new OrderItem();
                orderItem.setOrder(order);
                orderItem.setProductId(preorderItem.getProduct().getId());
                orderItem.setProductName(preorderItem.getProduct().getName());
                orderItem.setProductPrice(preorderItem.getProduct().getPrice());
                orderItem.setProductUnit(preorderItem.getProduct().getUnit());
                orderItem.setQuantity(preorderItem.getQuantity());
                orderItem.setFarmer(farmer);

                String imageUrl = "";
                List<ProductImage> prodImages = productImageRepository.findByProductId(preorderItem.getProduct().getId());
                if (prodImages != null && !prodImages.isEmpty()) {
                    imageUrl = prodImages.stream()
                            .filter(img -> img.getIsThumbnail() != null && img.getIsThumbnail())
                            .map(ProductImage::getImgUrl)
                            .findFirst()
                            .orElse(prodImages.get(0).getImgUrl());
                } else {
                    imageUrl = preorderItem.getProduct().getTraceabilityImageUrl();
                }
                orderItem.setImageUrl(imageUrl);

                orderItems.add(orderItem);
            }

            if (order.getItems() == null) {
                order.setItems(orderItems);
            } else {
                order.getItems().clear();
                if (orderItems != null) {
                    order.getItems().addAll(orderItems);
                }
            }
            Order savedOrder = orderRepository.save(order);
            savedSubOrders.add(savedOrder);

            // Gửi thông báo đến cho Farmer
            try {
                Notification notif = Notification.builder()
                        .receiverType("farmer")
                        .receiverId(farmer.getId())
                        .title("Đơn đặt trước đã thu hoạch!")
                        .content("Đơn hàng đặt trước " + preorder.getId() + " đã thu hoạch xong và tự động tạo đơn vận chuyển mới. Mã đơn hàng: " + savedOrder.getOrderCode())
                        .link("/farmer/orders/orderdetail/" + savedOrder.getOrderCode())
                        .createdAt(LocalDateTime.now())
                        .isRead(false)
                        .build();
                notificationRepository.save(notif);
            } catch (Exception e) {
                System.err.println("Lỗi gửi thông báo đơn preorder cho farmer: " + e.getMessage());
            }
        }

        if (orderGroup.getSubOrders() == null) {
            orderGroup.setSubOrders(savedSubOrders);
        } else {
            orderGroup.getSubOrders().clear();
            if (savedSubOrders != null) {
                orderGroup.getSubOrders().addAll(savedSubOrders);
            }
        }
        orderGroupRepository.save(orderGroup);
    }

    private static class OrderItemDraft {
        final Product product;
        final int quantity;
        final String imageUrl;

        OrderItemDraft(Product product, int quantity, String imageUrl) {
            this.product = product;
            this.quantity = quantity;
            this.imageUrl = imageUrl;
        }
    }
}
