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
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "invoices")
public class Invoice extends CommercialDocument {

    /** Null while the facture is a draft: numbers are assigned at issue so the sequence has no gaps. */
    @Column(length = 20)
    private String number;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quote_id")
    private Quote quote;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InvoiceStatus status = InvoiceStatus.BROUILLON;

    @Column(name = "fiscal_stamp", nullable = false)
    private BigDecimal fiscalStamp = BigDecimal.ZERO;

    @Column(name = "amount_paid", nullable = false)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Column(name = "issued_at")
    private Instant issuedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<InvoiceLine> lines = new ArrayList<>();

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("paymentDate ASC, id ASC")
    private List<Payment> payments = new ArrayList<>();

    public void replaceLines(List<InvoiceLine> newLines) {
        lines.clear();
        newLines.forEach(line -> {
            line.setInvoice(this);
            lines.add(line);
        });
    }

    public BigDecimal getBalanceDue() {
        return getTotalTtc().subtract(amountPaid);
    }

    public boolean isOverdue(LocalDate today) {
        return status.isOpen() && dueDate.isBefore(today);
    }
}
