package tn.novafer.erp.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/** One entry of a réclamation's history: a comment, a status change, or both. */
@Getter
@Setter
@Entity
@Table(name = "complaint_events")
public class ComplaintEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "complaint_id", nullable = false)
    private Complaint complaint;

    @Column(nullable = false)
    private String author;

    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 10)
    private ComplaintStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", length = 10)
    private ComplaintStatus toStatus;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
