package org.example.agrimarket.repository;

import org.example.agrimarket.model.FollowedFarmer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FollowedFarmerRepository extends JpaRepository<FollowedFarmer, Long> {
    List<FollowedFarmer> findByUserId(Long userId);
    List<FollowedFarmer> findByFarmerId(Long farmerId);
    Optional<FollowedFarmer> findByUserIdAndFarmerId(Long userId, Long farmerId);
    boolean existsByUserIdAndFarmerId(Long userId, Long farmerId);
}
