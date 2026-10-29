package org.example.agrimarket.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "otp_verification")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OtpVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;

    @Column(name = "user_type")
    private String userType; // customer, farmer, admin

    @Column(name = "otp_code")
    private String otpCode;

    private String type; // register, forgot_password

    @Column(name = "expired_at")
    private LocalDateTime expiredAt;

    private boolean verified;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
