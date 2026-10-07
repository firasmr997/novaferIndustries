package tn.novafer.erp.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "quotes")
public class Quote extends CommercialDocument {

    @Column(nullable = false, length = 20)
    private String number;

    @Column(name = "valid_until", nullable = false)
    private LocalDate validUntil;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private QuoteStatus status = QuoteStatus.BROUILLON;

    @Column(name = "converted_invoice_id")
    private Long convertedInvoiceId;

    @OneToMany(mappedBy = "quote", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<QuoteLine> lines = new ArrayList<>();

    public void replaceLines(List<QuoteLine> newLines) {
        lines.clear();
        newLines.forEach(line -> {
            line.setQuote(this);
            lines.add(line);
        });
    }
}
