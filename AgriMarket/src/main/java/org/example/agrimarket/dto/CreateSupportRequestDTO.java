package org.example.agrimarket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSupportRequestDTO {
    private String category;
    private String orderCode;
    private String title;
    private String description;
    private String attachmentUrl;
}
