package tn.novafer.erp.domain;

import jakarta.persistence.Column;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/** A priced line of a devis or facture. Product data is copied so later catalogue edits never rewrite history. */
@Getter
@Setter
@MappedSuperclass
public abstract class DocumentLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private int position;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    private String reference;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(nullable = false, length = 12)
    private String unit;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "discount_pct", nullable = false)
    private BigDecimal discountPct = BigDecimal.ZERO;

    @Column(name = "vat_rate", nullable = false)
    private BigDecimal vatRate;

    @Column(name = "total_ht", nullable = false)
    private BigDecimal totalHt;
}
