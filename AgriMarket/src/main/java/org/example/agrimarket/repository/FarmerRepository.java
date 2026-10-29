package org.example.agrimarket.repository;

import org.example.agrimarket.model.Farmer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FarmerRepository extends JpaRepository<Farmer, Long> {
    Optional<Farmer> findByEmail(String email);
    boolean existsByPhone(String phone);

    @org.springframework.data.jpa.repository.Query("SELECT f FROM Farmer f WHERE LOWER(f.farmName) LIKE LOWER(CONCAT('%', :query, '%'))")
    java.util.List<Farmer> searchFarmers(@org.springframework.data.repository.query.Param("query") String query);
}

