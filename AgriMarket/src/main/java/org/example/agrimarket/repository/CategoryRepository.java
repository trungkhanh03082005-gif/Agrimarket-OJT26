package org.example.agrimarket.repository;

import org.example.agrimarket.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findByName(String name);
    java.util.List<Category> findByParentId(Long parentId);
}
