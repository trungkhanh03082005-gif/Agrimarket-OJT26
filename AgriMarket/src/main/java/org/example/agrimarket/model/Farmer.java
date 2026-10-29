package org.example.agrimarket.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "farmer")
@PrimaryKeyJoinColumn(name = "id")
@DiscriminatorValue("FARMER")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Farmer extends Customer {

    @Transient
    private String role = "farmer";

    @Column(name = "farm_name", length = 255, columnDefinition = "TEXT")
    private String farmName;

    @Column(name = "farm_address", length = 1000, columnDefinition = "TEXT")
    private String farmAddress;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "identity_card")
    private String identityCard;

    @Column(name = "business_registration_url")
    private String businessRegistrationUrl;

    @Column(name = "vietgap_url")
    private String vietgapUrl;

    @Column(name = "globalgap_url")
    private String globalgapUrl;

    @Column(name = "organic_url")
    private String organicUrl;

    @Column(name = "verification_status")
    private String verificationStatus; // pending, verified, rejected

    @Column(name = "rating_average")
    private Double ratingAverage;

    @Column(name = "total_products")
    private Integer totalProducts;

    @Column(name = "max_delivery_distance")
    private Double maxDeliveryDistance;

    private Double latitude;
    private Double longitude;
}
