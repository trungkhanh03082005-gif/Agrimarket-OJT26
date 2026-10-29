package org.example.agrimarket.repository;

import org.example.agrimarket.model.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    /** Tìm tất cả CartItem được thêm từ một livestream cụ thể (để reset giá khi live kết thúc) */
    List<CartItem> findByLivestreamId(Long livestreamId);
}
