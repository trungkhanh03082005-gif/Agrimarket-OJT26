package org.example.agrimarket.repository;

import org.example.agrimarket.model.PreorderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PreorderItemRepository extends JpaRepository<PreorderItem, Long> {
    List<PreorderItem> findByPreorderId(Long preorderId);
    List<PreorderItem> findByProductId(Long productId);
}
