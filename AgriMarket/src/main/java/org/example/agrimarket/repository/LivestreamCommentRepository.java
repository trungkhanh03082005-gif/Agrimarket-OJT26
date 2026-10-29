package org.example.agrimarket.repository;

import org.example.agrimarket.model.LivestreamComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LivestreamCommentRepository extends JpaRepository<LivestreamComment, Long> {
    List<LivestreamComment> findByLivestreamIdOrderByCreatedAtAsc(Long livestreamId);
    List<LivestreamComment> findByLivestreamIdAndSenderId(Long livestreamId, Long senderId);
}
