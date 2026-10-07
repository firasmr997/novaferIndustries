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

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "stock_movements")
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private StockMovementType type;

    /** Signed: positive adds to stock, negative removes. */
    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(name = "stock_after", nullable = false)
    private BigDecimal stockAfter;

    private String reason;

    @Column(name = "document_ref")
    private String documentRef;

    @Column(name = "movement_date", nullable = false)
    private Instant movementDate = Instant.now();

    @Column(name = "created_by")
    private String createdBy;
}
