package tn.novafer.erp.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** A réclamation: a client complaint, optionally tied to the facture and product it concerns. */
@Getter
@Setter
@Entity
@Table(name = "complaints")
public class Complaint extends BaseEntity {

    @Column(nullable = false, length = 20)
    private String number;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false, length = 200)
    private String subject;

    @Column(nullable = false, length = 4000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private ComplaintType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ComplaintPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ComplaintStatus status = ComplaintStatus.OUVERTE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    private String resolution;

    /** Estimated cost of non-quality (replacement parts, credit, transport), in TND. */
    @Column(name = "estimated_cost")
    private BigDecimal estimatedCost;

    @Column(name = "opened_at", nullable = false)
    private Instant openedAt = Instant.now();

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "created_by")
    private String createdBy;

    @OneToMany(mappedBy = "complaint", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC, id ASC")
    private List<ComplaintEvent> events = new ArrayList<>();

    public void addEvent(ComplaintEvent event) {
        event.setComplaint(this);
        events.add(event);
    }
}
