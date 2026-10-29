package org.example.agrimarket.repository;

import org.example.agrimarket.model.SupportRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportRequestRepository extends JpaRepository<SupportRequest, Long> {
    List<SupportRequest> findBySenderIdOrderByCreatedAtDesc(Long senderId);
    List<SupportRequest> findBySenderIdAndStatusOrderByCreatedAtDesc(Long senderId, String status);
    List<SupportRequest> findAllByOrderByCreatedAtDesc();
    List<SupportRequest> findByStatusOrderByCreatedAtDesc(String status);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM SupportRequest s LEFT JOIN s.sender u WHERE " +
           "(:status IS NULL OR :status = '' OR :status = 'all' OR LOWER(s.status) = LOWER(:status)) AND " +
           "(:search IS NULL OR :search = '' OR LOWER(s.title) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(s.category) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(s.description) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY s.createdAt DESC")
    org.springframework.data.domain.Page<SupportRequest> findAllPagedAdmin(
            @org.springframework.data.repository.query.Param("status") String status,
            @org.springframework.data.repository.query.Param("search") String search,
            org.springframework.data.domain.Pageable pageable
    );
}
