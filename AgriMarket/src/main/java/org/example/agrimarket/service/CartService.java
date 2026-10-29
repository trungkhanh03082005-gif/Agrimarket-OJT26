package org.example.agrimarket.service;

import org.example.agrimarket.dto.CartItemAddRequest;
import org.example.agrimarket.dto.CartItemResponse;
import org.example.agrimarket.model.Cart;
import org.example.agrimarket.model.CartItem;
import org.example.agrimarket.model.Product;
import org.example.agrimarket.model.ProductImage;
import org.example.agrimarket.repository.CartItemRepository;
import org.example.agrimarket.repository.CartRepository;
import org.example.agrimarket.repository.ProductImageRepository;
import org.example.agrimarket.repository.ProductRepository;
import org.example.agrimarket.model.Customer;
import org.example.agrimarket.model.CustomerAddress;
import org.example.agrimarket.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;
import java.util.Collections;
import java.util.stream.Collectors;

@Service
public class CartService {

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductImageRepository productImageRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private DistanceService distanceService;

    private Cart getOrCreateCart(String email) {
        return cartRepository.findByEmail(email).orElseGet(() -> {
            Cart cart = new Cart();
            cart.setEmail(email);
            return cartRepository.save(cart);
        });
    }

    private void consolidateCartItems(Cart cart) {
        if (cart == null || cart.getItems() == null || cart.getItems().isEmpty()) {
            return;
        }

        Map<Long, List<CartItem>> itemsByProduct = cart.getItems().stream()
                .collect(Collectors.groupingBy(CartItem::getProductId));

        List<CartItem> toRemove = new ArrayList<>();
        boolean changed = false;

        for (Map.Entry<Long, List<CartItem>> entry : itemsByProduct.entrySet()) {
            List<CartItem> itemList = entry.getValue();
            CartItem keep = itemList.get(0);
            Product product = productRepository.findById(entry.getKey()).orElse(null);
            int stock = (product != null && product.getStockQuantity() != null) ? product.getStockQuantity() : 100;

            if (itemList.size() > 1) {
                for (int i = 1; i < itemList.size(); i++) {
                    CartItem duplicate = itemList.get(i);
                    toRemove.add(duplicate);
                }
            }

            int currentQty = keep.getQuantity();
            if (currentQty > stock || currentQty <= 0) {
                keep.setQuantity(Math.max(1, stock));
                cartItemRepository.save(keep);
                changed = true;
            }
        }

        if (!toRemove.isEmpty()) {
            cart.getItems().removeAll(toRemove);
            cartItemRepository.deleteAll(toRemove);
            changed = true;
        }

        if (changed) {
            cartRepository.save(cart);
        }
    }

    @Transactional
    public List<CartItemResponse> getCart(String email) {
        Cart cart = getOrCreateCart(email);
        consolidateCartItems(cart);
        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            return Collections.emptyList();
        }

        Customer customer = customerRepository.findByEmail(email).orElse(null);
        final CustomerAddress defaultAddress = (customer != null && customer.getAddresses() != null)
                ? customer.getAddresses().stream()
                        .filter(addr -> addr.getIsDefault() != null && addr.getIsDefault())
                        .findFirst()
                        .orElse(customer.getAddresses().isEmpty() ? null : customer.getAddresses().get(0))
                : null;

        List<Long> productIds = cart.getItems().stream().map(CartItem::getProductId).collect(Collectors.toList());

        // Bulk load all Products with their Farmer eager loaded
        List<Product> products = productRepository.findAllByIdInWithFarmer(productIds);
        Map<Long, Product> productMap = products.stream().collect(Collectors.toMap(Product::getId, p -> p));

        // Bulk load all ProductImages
        List<ProductImage> allImages = productImageRepository.findByProductIdIn(productIds);
        Map<Long, List<ProductImage>> imagesMap = allImages.stream()
                .collect(Collectors.groupingBy(pi -> pi.getProduct().getId()));

        return cart.getItems().stream()
                .map(item -> {
                    Product product = productMap.get(item.getProductId());
                    if (product == null) {
                        return Optional.<CartItemResponse>empty();
                    }
                    List<ProductImage> productImages = imagesMap.getOrDefault(product.getId(), Collections.emptyList());
                    return mapToResponseOptimized(item, product, productImages, defaultAddress);
                })
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toList());
    }

    private Optional<CartItemResponse> mapToResponse(CartItem item, CustomerAddress defaultAddress) {
        Optional<Product> productOpt = productRepository.findById(item.getProductId());
        if (productOpt.isEmpty()) {
            return Optional.empty();
        }
        Product product = productOpt.get();
        List<ProductImage> images = productImageRepository.findByProductId(product.getId());
        return mapToResponseOptimized(item, product, images, defaultAddress);
    }

    private Optional<CartItemResponse> mapToResponseOptimized(CartItem item, Product product, List<ProductImage> images, CustomerAddress defaultAddress) {
        // Get thumbnail image
        String imageUrl = "";
        if (images != null && !images.isEmpty()) {
            imageUrl = images.stream()
                    .filter(img -> img.getIsThumbnail() != null && img.getIsThumbnail())
                    .map(ProductImage::getImgUrl)
                    .findFirst()
                    .orElse(images.get(0).getImgUrl());
        }

        Double distance = null;
        Double maxDeliveryRange = null;
        Boolean isWithinDeliveryRange = true;

        if (defaultAddress != null && defaultAddress.getAddress() != null && product.getFarmer() != null && product.getFarmer().getFarmAddress() != null) {
            String farmAddr = product.getFarmer().getFarmAddress();
            if (!farmAddr.isBlank() && !farmAddr.equalsIgnoreCase("Not updated") && !farmAddr.equalsIgnoreCase("Chưa có địa chỉ")) {
                distance = distanceService.calculateDistance(
                    defaultAddress.getAddress(), defaultAddress.getLatitude(), defaultAddress.getLongitude(),
                    farmAddr, product.getFarmer().getLatitude(), product.getFarmer().getLongitude()
                );
                double maxProductDist = product.getLimitDistance() != null 
                        ? product.getLimitDistance() 
                        : distanceService.getMaxAllowedDistance(product.getPerishability());
                double maxFarmerDist = product.getFarmer().getMaxDeliveryDistance() != null 
                        ? product.getFarmer().getMaxDeliveryDistance() 
                        : 1000.0;
                maxDeliveryRange = Math.min(maxProductDist, maxFarmerDist);
                isWithinDeliveryRange = (distance <= maxDeliveryRange);
            }
        }

        // Nếu sản phẩm được thêm từ livestream, dùng livestreamPrice làm giá hiển thị
        Double displayPrice = (item.getLivestreamPrice() != null) ? item.getLivestreamPrice() : product.getPrice();

        CartItemResponse response = CartItemResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .price(displayPrice)
                .unit(product.getUnit())
                .imageUrl(imageUrl)
                .quantity(item.getQuantity())
                .checked(item.getChecked() != null ? item.getChecked() : true)
                .stockQuantity(product.getStockQuantity())
                .farmerId(product.getFarmer() != null ? product.getFarmer().getId() : null)
                .farmerName(product.getFarmer() != null ? product.getFarmer().getFarmName() : null)
                .distance(distance)
                .maxDeliveryRange(maxDeliveryRange)
                .isWithinDeliveryRange(isWithinDeliveryRange)
                .perishability(product.getPerishability())
                .livestreamPrice(item.getLivestreamPrice())
                .livestreamId(item.getLivestreamId())
                .build();

        return Optional.of(response);
    }

    @Transactional
    public List<CartItemResponse> addToCart(String email, Long productId, int quantity) {
        return addToCart(email, productId, quantity, null, null);
    }

    /**
     * Thêm sản phẩm vào giỏ hàng, có hỗ trợ giá ưu đãi từ livestream.
     * @param livestreamPrice Giá ưu đãi từ livestream (null nếu thêm bình thường)
     * @param livestreamId    ID của livestream nguồn (null nếu thêm bình thường)
     */
    @Transactional
    public List<CartItemResponse> addToCart(String email, Long productId, int quantity, Double livestreamPrice, Long livestreamId) {
        Cart cart = getOrCreateCart(email);
        consolidateCartItems(cart);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm."));

        if (product.getStockQuantity() == 0) {
            throw new IllegalArgumentException("Sản phẩm đã hết hàng.");
        }

        Optional<CartItem> existingItemOpt = cart.getItems().stream()
                .filter(item -> item.getProductId().equals(productId))
                .findFirst();

        if (existingItemOpt.isPresent()) {
            CartItem existingItem = existingItemOpt.get();
            int newQty = existingItem.getQuantity() + quantity;
            if (newQty > product.getStockQuantity()) {
                throw new IllegalArgumentException("Không thể thêm số lượng vượt quá tồn kho hiện có (" + product.getStockQuantity() + ").");
            }
            existingItem.setQuantity(newQty);
            // Nếu thêm từ livestream và item chưa có giá live thì cập nhật giá live
            if (livestreamPrice != null && existingItem.getLivestreamPrice() == null) {
                existingItem.setLivestreamPrice(livestreamPrice);
                existingItem.setLivestreamId(livestreamId);
            }
            cartItemRepository.save(existingItem);
        } else {
            if (quantity > product.getStockQuantity()) {
                throw new IllegalArgumentException("Không thể thêm số lượng vượt quá tồn kho hiện có (" + product.getStockQuantity() + ").");
            }
            CartItem newItem = new CartItem();
            newItem.setCart(cart);
            newItem.setProductId(productId);
            newItem.setQuantity(quantity);
            newItem.setChecked(true);
            newItem.setLivestreamPrice(livestreamPrice);
            newItem.setLivestreamId(livestreamId);
            cart.getItems().add(newItem);
            cartItemRepository.save(newItem);
        }

        cartRepository.save(cart);
        return getCart(email);
    }

    @Transactional
    public List<CartItemResponse> updateCartItem(String email, Long productId, Integer quantity, Boolean checked) {
        Cart cart = getOrCreateCart(email);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm."));

        Optional<CartItem> itemOpt = cart.getItems().stream()
                .filter(item -> item.getProductId().equals(productId))
                .findFirst();

        if (itemOpt.isPresent()) {
            CartItem item = itemOpt.get();
            if (quantity != null) {
                if (quantity > product.getStockQuantity()) {
                    throw new IllegalArgumentException("Không thể cập nhật số lượng vượt quá tồn kho hiện có (" + product.getStockQuantity() + ").");
                }
                item.setQuantity(quantity);
            }
            if (checked != null) {
                item.setChecked(checked);
            }
            cartItemRepository.save(item);
        }

        return getCart(email);
    }

    @Transactional
    public List<CartItemResponse> removeFromCart(String email, Long productId) {
        Cart cart = getOrCreateCart(email);

        Optional<CartItem> itemOpt = cart.getItems().stream()
                .filter(item -> item.getProductId().equals(productId))
                .findFirst();

        if (itemOpt.isPresent()) {
            CartItem item = itemOpt.get();
            cart.getItems().remove(item);
            cartItemRepository.delete(item);
            cartRepository.save(cart);
        }

        return getCart(email);
    }

    @Transactional
    public List<CartItemResponse> clearCart(String email) {
        Cart cart = getOrCreateCart(email);
        cartItemRepository.deleteAll(cart.getItems());
        cart.getItems().clear();
        cartRepository.save(cart);
        return new ArrayList<>();
    }

    @Transactional
    public List<CartItemResponse> syncCart(String email, List<CartItemAddRequest> guestItems) {
        Cart cart = getOrCreateCart(email);

        for (CartItemAddRequest guestItem : guestItems) {
            Product product = productRepository.findById(guestItem.getProductId()).orElse(null);
            if (product == null) continue;

            Optional<CartItem> existingItemOpt = cart.getItems().stream()
                    .filter(item -> item.getProductId().equals(guestItem.getProductId()))
                    .findFirst();

            int safeQty = Math.max(1, guestItem.getQuantity());
            if (product.getStockQuantity() != null && safeQty > product.getStockQuantity()) {
                safeQty = Math.max(1, product.getStockQuantity());
            }

            if (existingItemOpt.isPresent()) {
                CartItem existingItem = existingItemOpt.get();
                existingItem.setQuantity(safeQty);
                cartItemRepository.save(existingItem);
            } else {
                CartItem newItem = new CartItem();
                newItem.setCart(cart);
                newItem.setProductId(guestItem.getProductId());
                newItem.setQuantity(safeQty);
                newItem.setChecked(true);
                cart.getItems().add(newItem);
                cartItemRepository.save(newItem);
            }
        }

        cartRepository.save(cart);
        return getCart(email);
    }

    /**
     * Cập nhật trạng thái checked của nhiều sản phẩm trong một lần gọi DB duy nhất.
     * Dùng cho "Chọn tất cả" và "Chọn nhà vườn" để tránh N lần gọi API tuần tự.
     */
    @Transactional
    public void bulkUpdateChecked(String email, List<Long> productIds, boolean checked) {
        Cart cart = getOrCreateCart(email);
        boolean changed = false;
        for (CartItem item : cart.getItems()) {
            if (productIds.contains(item.getProductId()) && !Boolean.valueOf(checked).equals(item.getChecked())) {
                item.setChecked(checked);
                changed = true;
            }
        }
        if (changed) {
            cartItemRepository.saveAll(cart.getItems());
        }
    }

    /**
     * Reset giá về giá gốc (product.price) cho tất cả CartItem có liên kết đến livestream đã kết thúc.
     * Được gọi tự động khi farmer kết thúc phiên livestream.
     *
     * @param livestreamId ID của livestream vừa kết thúc
     */
    @Transactional
    public void resetLivestreamPrices(Long livestreamId) {
        List<CartItem> affectedItems = cartItemRepository.findByLivestreamId(livestreamId);
        if (affectedItems == null || affectedItems.isEmpty()) {
            return;
        }
        for (CartItem item : affectedItems) {
            item.setLivestreamPrice(null);
            item.setLivestreamId(null);
        }
        cartItemRepository.saveAll(affectedItems);
    }
}

