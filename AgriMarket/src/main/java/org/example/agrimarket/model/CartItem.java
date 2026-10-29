package org.example.agrimarket.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "cart_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CartItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id", nullable = false)
    @JsonIgnore
    private Cart cart;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "checked", nullable = false)
    private Boolean checked = true;

    /**
     * Giá override từ livestream (nếu sản phẩm được thêm vào giỏ trong khi xem live).
     * Null nếu sản phẩm được thêm bình thường (không qua livestream).
     */
    @Column(name = "livestream_price")
    private Double livestreamPrice;

    /**
     * ID của livestream mà sản phẩm được thêm từ.
     * Dùng để reset giá về giá gốc khi livestream kết thúc.
     */
    @Column(name = "livestream_id")
    private Long livestreamId;
}
