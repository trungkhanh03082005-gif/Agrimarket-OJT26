package org.example.agrimarket.service;

import org.example.agrimarket.dto.PromotionRequestDTO;
import org.example.agrimarket.dto.PromotionResponseDTO;

import java.util.List;

public interface PromotionService {
    List<PromotionResponseDTO> getAllPromotions();
    List<PromotionResponseDTO> getFarmerPromotions(String farmerEmail);
    PromotionResponseDTO getPromotionById(Long id);
    PromotionResponseDTO createPromotion(PromotionRequestDTO request);
    PromotionResponseDTO updatePromotion(Long id, PromotionRequestDTO request);
    PromotionResponseDTO updatePromotionStatus(Long id, String status);
    void deletePromotion(Long id);
}
