package org.example.agrimarket.dto;

import lombok.Data;

@Data
public class CategoryRequestDTO {
    private String name;
    private String description;
    private String icon;
    private String level;
    private Long parentId;
    private String status;
}
