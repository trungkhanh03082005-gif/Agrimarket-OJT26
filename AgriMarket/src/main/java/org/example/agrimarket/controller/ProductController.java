package org.example.agrimarket.controller;

import org.example.agrimarket.dto.PagedProductResponse;
import org.example.agrimarket.dto.PageResponse;
import org.example.agrimarket.dto.ProductRequest;
import org.example.agrimarket.dto.ProductResponse;
import org.example.agrimarket.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ProductController {

    @Autowired
    private ProductService productService;

    @GetMapping("/farmer/products")
    public ResponseEntity<?> getFarmerProducts(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: Vui lòng đăng nhập.");
        }

        try {
            List<ProductResponse> products = productService.getProductsByFarmerEmail(principal.getName());
            return ResponseEntity.ok(products);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Đã xảy ra lỗi khi lấy danh sách sản phẩm: " + e.getMessage());
        }
    }

    @GetMapping("/farmer/products/paged")
    public ResponseEntity<?> getFarmerProductsPaged(
            Principal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: Vui lòng đăng nhập.");
        }
        try {
            PageResponse<ProductResponse> products = productService.getFarmerProductsPaged(principal.getName(), page, size, search);
            return ResponseEntity.ok(products);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Đã xảy ra lỗi khi lấy danh sách sản phẩm: " + e.getMessage());
        }
    }

    @PostMapping("/farmer/products")
    public ResponseEntity<?> createProduct(Principal principal, @RequestBody ProductRequest request) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: Vui lòng đăng nhập.");
        }

        try {
            ProductResponse response = productService.createProduct(request, principal.getName());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Đã xảy ra lỗi khi thêm sản phẩm: " + e.getMessage());
        }
    }

    @DeleteMapping("/farmer/products/{id}")
    public ResponseEntity<?> deleteProduct(Principal principal, @PathVariable Long id) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: Vui lòng đăng nhập.");
        }

        try {
            productService.deleteProduct(id, principal.getName());
            return ResponseEntity.ok("Xóa sản phẩm thành công.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Đã xảy ra lỗi khi xóa sản phẩm: " + e.getMessage());
        }
    }

    @PutMapping("/farmer/products/{id}")
    public ResponseEntity<?> updateProduct(Principal principal, @PathVariable Long id, @RequestBody ProductRequest request) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: Vui lòng đăng nhập.");
        }

        try {
            ProductResponse response = productService.updateProduct(id, request, principal.getName());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Đã xảy ra lỗi khi sửa sản phẩm: " + e.getMessage());
        }
    }

    @PutMapping("/farmer/products/{id}/stock")
    public ResponseEntity<?> updateProductStock(Principal principal, @PathVariable Long id, @RequestBody java.util.Map<String, Integer> payload) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: Vui lòng đăng nhập.");
        }
        Integer newStock = payload.get("newStock");
        if (newStock == null || newStock < 0) {
            return ResponseEntity.badRequest().body("Số lượng tồn kho mới không hợp lệ.");
        }
        try {
            ProductResponse response = productService.updateProductStock(id, newStock, principal.getName());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Đã xảy ra lỗi khi cập nhật tồn kho: " + e.getMessage());
        }
    }

    @GetMapping("/products")
    public ResponseEntity<?> getAllApprovedProducts() {
        try {
            List<ProductResponse> products = productService.getAllApprovedProducts();
            return ResponseEntity.ok(products);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Đã xảy ra lỗi khi lấy danh sách sản phẩm: " + e.getMessage());
        }
    }

    @GetMapping("/products/{id}")
    public ResponseEntity<?> getProductById(@PathVariable Long id) {
        try {
            ProductResponse product = productService.getProductById(id);
            return ResponseEntity.ok(product);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Lỗi khi lấy thông tin sản phẩm: " + e.getMessage());
        }
    }

    /**
     * Endpoint phân trang server-side cho danh sách sản phẩm công khai.
     * GET /api/products/paged?page=0&size=6&sort=newest&category=Trái+cây&search=cam&minPrice=10000&maxPrice=100000&location=Hà+Nội&shopKeyword=nông+trại&minRating=4
     */
    @GetMapping("/products/paged")
    public ResponseEntity<?> getApprovedProductsPaged(
            @RequestParam(defaultValue = "0")    int page,
            @RequestParam(defaultValue = "6")    int size,
            @RequestParam(defaultValue = "popular") String sort,
            @RequestParam(required = false)      String category,
            @RequestParam(required = false)      String search,
            @RequestParam(required = false)      Double minPrice,
            @RequestParam(required = false)      Double maxPrice,
            @RequestParam(required = false)      String location,
            @RequestParam(required = false)      String shopKeyword,
            @RequestParam(required = false)      Double minRating,
            @RequestParam(required = false)      Long farmerId,
            @RequestParam(required = false)      Boolean isPreorder
    ) {
        try {
            // Giới hạn size tối đa 50 để tránh abuse
            int clampedSize = Math.min(size, 50);
            PagedProductResponse result = productService.getApprovedProductsPaged(
                    page, clampedSize, sort,
                    category, search,
                    minPrice, maxPrice,
                    location, shopKeyword,
                    minRating, farmerId,
                    isPreorder
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Lỗi khi lấy danh sách sản phẩm: " + e.getMessage());
        }
    }

    @PostMapping("/farmer/products/{id}/early-harvest")
    public ResponseEntity<?> earlyHarvest(Principal principal, @PathVariable Long id) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: Vui lòng đăng nhập.");
        }

        try {
            productService.earlyHarvest(id, principal.getName());
            return ResponseEntity.ok("Sản phẩm đã được thu hoạch sớm thành công.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Đã xảy ra lỗi khi thực hiện thu hoạch sớm: " + e.getMessage());
        }
    }
}
