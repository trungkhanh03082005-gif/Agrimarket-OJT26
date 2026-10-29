package org.example.agrimarket.repository;

import org.example.agrimarket.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findAllByConversationIdOrderByCreatedAtAsc(Long conversationId);
    long countByConversationIdAndSenderIdNotAndIsReadFalse(Long conversationId, Long senderId);
    List<ChatMessage> findAllByConversationIdAndSenderIdNotAndIsReadFalse(Long conversationId, Long senderId);
    
    @org.springframework.transaction.annotation.Transactional
    void deleteAllByConversationId(Long conversationId);
}
