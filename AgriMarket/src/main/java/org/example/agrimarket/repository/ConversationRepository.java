package org.example.agrimarket.repository;

import org.example.agrimarket.model.Conversation;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    Optional<Conversation> findByCustomerIdAndFarmerId(Long customerId, Long farmerId);

    @EntityGraph(attributePaths = {"customer", "farmer"})
    List<Conversation> findAllByCustomerId(Long customerId);

    @EntityGraph(attributePaths = {"customer", "farmer"})
    List<Conversation> findAllByFarmerId(Long farmerId);
}
