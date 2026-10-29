package org.example.agrimarket.service;

import org.example.agrimarket.dto.CategoryRequestDTO;
import org.example.agrimarket.dto.CategoryResponseDTO;
import org.example.agrimarket.model.Category;
import org.example.agrimarket.repository.CategoryRepository;
import org.example.agrimarket.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class CategoryServiceImpl implements CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Override
    @org.springframework.cache.annotation.Cacheable(value = "categories")
    @Transactional(readOnly = true)
    public List<CategoryResponseDTO> getAllCategories() {
        List<Category> categories = categoryRepository.findAll();
        return categories.stream().map(c -> {
            // Fill default values if null in DB (robust for legacy database rows)
            String status = c.getStatus() != null ? c.getStatus() : "active";
            String level = c.getLevel() != null ? c.getLevel() : (c.getParentId() == null ? "root" : "sub");
            String icon = c.getIcon() != null ? c.getIcon() : "🥬";

            long productCount = calculateProductCount(c, categories);

            return CategoryResponseDTO.builder()
                    .id(c.getId())
                    .name(c.getName())
                    .description(c.getDescription())
                    .parentId(c.getParentId())
                    .icon(icon)
                    .level(level)
                    .status(status)
                    .productCount(productCount)
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    @org.springframework.cache.annotation.CacheEvict(value = "categories", allEntries = true)
    public CategoryResponseDTO createCategory(CategoryRequestDTO request) {
        Category category = new Category();
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setParentId(request.getParentId());
        
        // Handle level logic
        String level = request.getLevel();
        if (level == null || level.trim().isEmpty()) {
            level = request.getParentId() == null ? "root" : "sub";
        }
        category.setLevel(level);

        category.setIcon(request.getIcon() != null ? request.getIcon() : "🥬");
        category.setStatus(request.getStatus() != null ? request.getStatus() : "active");

        Category saved = categoryRepository.save(category);
        return convertToResponseDTO(saved);
    }

    @Override
    public CategoryResponseDTO updateCategory(Long id, CategoryRequestDTO request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục với ID: " + id));

        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setParentId(request.getParentId());

        String level = request.getLevel();
        if (level == null || level.trim().isEmpty()) {
            level = request.getParentId() == null ? "root" : "sub";
        }
        category.setLevel(level);

        category.setIcon(request.getIcon());
        category.setStatus(request.getStatus());

        Category updated = categoryRepository.save(category);
        return convertToResponseDTO(updated);
    }

    @Override
    public CategoryResponseDTO updateCategoryStatus(Long id, String status) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục với ID: " + id));

        category.setStatus(status);
        Category updated = categoryRepository.save(category);
        return convertToResponseDTO(updated);
    }

    @Override
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục với ID: " + id));

        // Check if there are subcategories
        List<Category> subcategories = categoryRepository.findByParentId(id);
        if (!subcategories.isEmpty()) {
            throw new IllegalStateException("Không thể xóa danh mục này vì vẫn còn chứa các danh mục con.");
        }

        categoryRepository.delete(category);
    }

    private long calculateProductCount(Category category, List<Category> allCategories) {
        if (category.getParentId() == null || "root".equalsIgnoreCase(category.getLevel())) {
            List<Long> ids = allCategories.stream()
                    .filter(c -> category.getId().equals(c.getParentId()))
                    .map(Category::getId)
                    .collect(Collectors.toList());
            List<Long> queryIds = new ArrayList<>(ids);
            queryIds.add(category.getId());
            return productRepository.countByCategoryIdIn(queryIds);
        } else {
            return productRepository.countByCategoryId(category.getId());
        }
    }

    private CategoryResponseDTO convertToResponseDTO(Category category) {
        List<Category> allCategories = categoryRepository.findAll();
        long productCount = calculateProductCount(category, allCategories);

        return CategoryResponseDTO.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .parentId(category.getParentId())
                .icon(category.getIcon())
                .level(category.getLevel())
                .status(category.getStatus())
                .productCount(productCount)
                .build();
    }
}
