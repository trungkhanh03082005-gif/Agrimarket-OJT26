package org.example.agrimarket.service;

import org.example.agrimarket.dto.CategoryRequestDTO;
import org.example.agrimarket.dto.CategoryResponseDTO;

import java.util.List;

public interface CategoryService {
    List<CategoryResponseDTO> getAllCategories();
    CategoryResponseDTO createCategory(CategoryRequestDTO request);
    CategoryResponseDTO updateCategory(Long id, CategoryRequestDTO request);
    CategoryResponseDTO updateCategoryStatus(Long id, String status);
    void deleteCategory(Long id);
}
