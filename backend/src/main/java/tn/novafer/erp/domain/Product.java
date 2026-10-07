package tn.novafer.erp.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "products")
public class Product extends BaseEntity {

    @Column(nullable = false, length = 40)
    private String reference;

    @Column(nullable = false, length = 160)
    private String name;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    private String material;

    @Column(nullable = false, length = 12)
    private String unit;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "cost_price", nullable = false)
    private BigDecimal costPrice;

    @Column(name = "vat_rate", nullable = false)
    private BigDecimal vatRate;

    @Column(name = "stock_quantity", nullable = false)
    private BigDecimal stockQuantity = BigDecimal.ZERO;

    @Column(name = "min_stock", nullable = false)
    private BigDecimal minStock = BigDecimal.ZERO;

    @Column(nullable = false)
    private boolean active = true;

    public boolean isLowStock() {
        return stockQuantity.compareTo(minStock) <= 0;
    }
}
