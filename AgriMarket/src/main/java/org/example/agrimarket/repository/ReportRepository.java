package org.example.agrimarket.repository;

import org.example.agrimarket.model.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findByReporterIdOrderByCreatedAtDesc(Long reporterId);
    List<Report> findByReporterIdAndStatusOrderByCreatedAtDesc(Long reporterId, String status);
    List<Report> findAllByOrderByCreatedAtDesc();
    List<Report> findByStatusOrderByCreatedAtDesc(String status);
    List<Report> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(String targetType, Long targetId);

    @org.springframework.data.jpa.repository.Query("SELECT r FROM Report r LEFT JOIN r.reporter u WHERE " +
           "(:status IS NULL OR :status = '' OR :status = 'all' OR LOWER(r.status) = LOWER(:status)) AND " +
           "(:targetType IS NULL OR :targetType = '' OR :targetType = 'all' OR LOWER(r.targetType) = LOWER(:targetType)) AND " +
           "(:search IS NULL OR :search = '' OR LOWER(r.reason) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(r.description) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY r.createdAt DESC")
    org.springframework.data.domain.Page<Report> findAllPagedAdmin(
            @org.springframework.data.repository.query.Param("status") String status,
            @org.springframework.data.repository.query.Param("targetType") String targetType,
            @org.springframework.data.repository.query.Param("search") String search,
            org.springframework.data.domain.Pageable pageable
    );
}
