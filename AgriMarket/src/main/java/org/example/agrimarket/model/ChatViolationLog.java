package org.example.agrimarket.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_violation_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatViolationLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "violation_type", nullable = false)
    private String violationType; // TOXIC, SPAM, REDIRECT

    @Column(name = "violated_content", columnDefinition = "TEXT")
    private String violatedContent;

    @Column(name = "livestream_id")
    private Long livestreamId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
