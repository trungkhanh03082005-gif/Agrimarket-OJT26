package org.example.agrimarket.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "livestream_alert")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LivestreamAlert {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "livestream_id", nullable = false)
    private Livestream livestream;

    @Column(name = "alert_type", nullable = false)
    private String alertType; // WEAPONS, NUDITY, TRASH_LIVE, AUDIO_VIOLATION

    @Column(name = "evidence_url", columnDefinition = "TEXT")
    private String evidenceUrl; // can be image URL or transcribed text

    @Column(name = "status", nullable = false)
    private String status; // PENDING, RESOLVED

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "PENDING";
        }
    }
}
