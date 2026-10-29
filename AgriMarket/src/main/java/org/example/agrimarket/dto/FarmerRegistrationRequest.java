package org.example.agrimarket.dto;

public class FarmerRegistrationRequest {
    private String farmName;
    private String farmAddress;
    private String description;
    private String identityCard;
    private String businessRegistrationUrl;
    private String vietgapUrl;
    private String globalgapUrl;
    private String organicUrl;
    private Double maxDeliveryDistance;
    private Double latitude;
    private Double longitude;

    public FarmerRegistrationRequest() {}

    public FarmerRegistrationRequest(String farmName, String farmAddress, String description, String identityCard, 
                                      String businessRegistrationUrl, String vietgapUrl, String globalgapUrl, String organicUrl) {
        this.farmName = farmName;
        this.farmAddress = farmAddress;
        this.description = description;
        this.identityCard = identityCard;
        this.businessRegistrationUrl = businessRegistrationUrl;
        this.vietgapUrl = vietgapUrl;
        this.globalgapUrl = globalgapUrl;
        this.organicUrl = organicUrl;
    }

    public String getFarmName() {
        return farmName;
    }

    public void setFarmName(String farmName) {
        this.farmName = farmName;
    }

    public String getFarmAddress() {
        return farmAddress;
    }

    public void setFarmAddress(String farmAddress) {
        this.farmAddress = farmAddress;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getIdentityCard() {
        return identityCard;
    }

    public void setIdentityCard(String identityCard) {
        this.identityCard = identityCard;
    }

    public String getBusinessRegistrationUrl() {
        return businessRegistrationUrl;
    }

    public void setBusinessRegistrationUrl(String businessRegistrationUrl) {
        this.businessRegistrationUrl = businessRegistrationUrl;
    }

    public String getVietgapUrl() {
        return vietgapUrl;
    }

    public void setVietgapUrl(String vietgapUrl) {
        this.vietgapUrl = vietgapUrl;
    }

    public String getGlobalgapUrl() {
        return globalgapUrl;
    }

    public void setGlobalgapUrl(String globalgapUrl) {
        this.globalgapUrl = globalgapUrl;
    }

    public String getOrganicUrl() {
        return organicUrl;
    }

    public void setOrganicUrl(String organicUrl) {
        this.organicUrl = organicUrl;
    }

    public Double getMaxDeliveryDistance() {
        return maxDeliveryDistance;
    }

    public void setMaxDeliveryDistance(Double maxDeliveryDistance) {
        this.maxDeliveryDistance = maxDeliveryDistance;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }
}
