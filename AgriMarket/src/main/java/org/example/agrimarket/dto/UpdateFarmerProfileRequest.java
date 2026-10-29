package org.example.agrimarket.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * DTO for updating a farmer's profile.
 * Using Optional-like boolean flags to distinguish between
 * "field not sent" and "field explicitly set to null".
 * The frontend always sends all cert/doc URL fields explicitly,
 * so we always update them.
 */
public class UpdateFarmerProfileRequest {

    private String fullName;
    private String phone;
    private String avatarUrl;
    private String farmName;
    private String farmAddress;
    private String description;
    private String identityCard;
    private Double maxDeliveryDistance;
    private Double latitude;
    private Double longitude;

    // These can be null to indicate "clear this field"
    private String businessRegistrationUrl;
    private String vietgapUrl;
    private String globalgapUrl;
    private String organicUrl;

    // Sentinel booleans: true means the field was present in the JSON payload
    // (even if the value itself is null = "please clear this field")
    private boolean businessRegistrationUrlPresent;
    private boolean vietgapUrlPresent;
    private boolean globalgapUrlPresent;
    private boolean organicUrlPresent;

    public UpdateFarmerProfileRequest() {}

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getFarmName() { return farmName; }
    public void setFarmName(String farmName) { this.farmName = farmName; }

    public String getFarmAddress() { return farmAddress; }
    public void setFarmAddress(String farmAddress) { this.farmAddress = farmAddress; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getIdentityCard() { return identityCard; }
    public void setIdentityCard(String identityCard) { this.identityCard = identityCard; }

    public String getBusinessRegistrationUrl() { return businessRegistrationUrl; }
    public void setBusinessRegistrationUrl(String businessRegistrationUrl) {
        this.businessRegistrationUrl = businessRegistrationUrl;
        this.businessRegistrationUrlPresent = true;
    }

    public String getVietgapUrl() { return vietgapUrl; }
    public void setVietgapUrl(String vietgapUrl) {
        this.vietgapUrl = vietgapUrl;
        this.vietgapUrlPresent = true;
    }

    public String getGlobalgapUrl() { return globalgapUrl; }
    public void setGlobalgapUrl(String globalgapUrl) {
        this.globalgapUrl = globalgapUrl;
        this.globalgapUrlPresent = true;
    }

    public String getOrganicUrl() { return organicUrl; }
    public void setOrganicUrl(String organicUrl) {
        this.organicUrl = organicUrl;
        this.organicUrlPresent = true;
    }

    public Double getMaxDeliveryDistance() { return maxDeliveryDistance; }
    public void setMaxDeliveryDistance(Double maxDeliveryDistance) { this.maxDeliveryDistance = maxDeliveryDistance; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public boolean isBusinessRegistrationUrlPresent() { return businessRegistrationUrlPresent; }
    public boolean isVietgapUrlPresent() { return vietgapUrlPresent; }
    public boolean isGlobalgapUrlPresent() { return globalgapUrlPresent; }
    public boolean isOrganicUrlPresent() { return organicUrlPresent; }
}
