package tn.novafer.erp.domain;

import jakarta.persistence.Column;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** What devis and factures share: a client, a date, priced lines and their totals. */
@Getter
@Setter
@MappedSuperclass
public abstract class CommercialDocument extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    private String subject;
    private String notes;

    @Column(name = "total_ht", nullable = false)
    private BigDecimal totalHt = BigDecimal.ZERO;
    @Column(name = "total_discount", nullable = false)
    private BigDecimal totalDiscount = BigDecimal.ZERO;
    @Column(name = "total_fodec", nullable = false)
    private BigDecimal totalFodec = BigDecimal.ZERO;
    /** FODEC rate applied when the totals were computed, so later setting changes never alter a document. */
    @Column(name = "fodec_rate", nullable = false)
    private BigDecimal fodecRate = BigDecimal.ZERO;
    @Column(name = "total_vat", nullable = false)
    private BigDecimal totalVat = BigDecimal.ZERO;
    @Column(name = "total_ttc", nullable = false)
    private BigDecimal totalTtc = BigDecimal.ZERO;

    @Column(name = "created_by")
    private String createdBy;

    public abstract List<? extends DocumentLine> getLines();
}
