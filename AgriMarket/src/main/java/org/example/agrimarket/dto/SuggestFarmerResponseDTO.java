package org.example.agrimarket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuggestFarmerResponseDTO {
    private String id;
    private String name;
    private String avatar;
    private String phone;
    private String farmAddress;
    private String activeState;
    private boolean verified;
    private boolean isOnline;
}
