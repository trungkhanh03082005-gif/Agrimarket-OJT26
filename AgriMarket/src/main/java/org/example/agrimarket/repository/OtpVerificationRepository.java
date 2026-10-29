package org.example.agrimarket.repository;

import org.example.agrimarket.model.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {
    Optional<OtpVerification> findFirstByEmailAndOtpCodeAndTypeOrderByCreatedAtDesc(String email, String otpCode, String type);
}
