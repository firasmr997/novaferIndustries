package tn.novafer.erp.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import tn.novafer.erp.domain.Category;
import tn.novafer.erp.domain.Product;
import tn.novafer.erp.domain.StockMovement;
import tn.novafer.erp.domain.StockMovementType;

import java.math.BigDecimal;
import java.time.Instant;

public final class CatalogueDtos {

    private CatalogueDtos() {
    }

    public record CategoryDto(Long id, String code, String name, String description, long productCount) {
        public static CategoryDto of(Category c, long productCount) {
            return new CategoryDto(c.getId(), c.getCode(), c.getName(), c.getDescription(), productCount);
        }
    }

    public record CategoryRequest(
            @NotBlank(message = "Le code est obligatoire") @Size(max = 20) String code,
            @NotBlank(message = "Le nom est obligatoire") @Size(max = 120) String name,
            @Size(max = 500) String description) {
    }

    public record ProductDto(Long id, String reference, String name, String description, Long categoryId,
                             String categoryName, String material, String unit, BigDecimal unitPrice,
                             BigDecimal costPrice, BigDecimal marginPct, BigDecimal vatRate,
                             BigDecimal stockQuantity, BigDecimal minStock, boolean lowStock, boolean active) {
        public static ProductDto of(Product p) {
            BigDecimal margin = p.getUnitPrice().signum() == 0 ? BigDecimal.ZERO
                    : p.getUnitPrice().subtract(p.getCostPrice()).multiply(BigDecimal.valueOf(100))
                    .divide(p.getUnitPrice(), 1, java.math.RoundingMode.HALF_UP);
            return new ProductDto(p.getId(), p.getReference(), p.getName(), p.getDescription(),
                    p.getCategory() == null ? null : p.getCategory().getId(),
                    p.getCategory() == null ? null : p.getCategory().getName(),
                    p.getMaterial(), p.getUnit(), p.getUnitPrice(), p.getCostPrice(), margin, p.getVatRate(),
                    p.getStockQuantity(), p.getMinStock(), p.isLowStock(), p.isActive());
        }
    }

    public record ProductRequest(
            @NotBlank(message = "La référence est obligatoire") @Size(max = 40) String reference,
            @NotBlank(message = "La désignation est obligatoire") @Size(max = 160) String name,
            @Size(max = 1000) String description,
            Long categoryId,
            @Size(max = 80) String material,
            @NotBlank(message = "L'unité est obligatoire") @Size(max = 12) String unit,
            @NotNull(message = "Le prix de vente est obligatoire") @PositiveOrZero BigDecimal unitPrice,
            @PositiveOrZero BigDecimal costPrice,
            @NotNull(message = "Le taux de TVA est obligatoire") BigDecimal vatRate,
            @PositiveOrZero BigDecimal minStock,
            /** Only used at creation: opening stock, recorded as an ENTREE movement. */
            @PositiveOrZero BigDecimal initialStock,
            Boolean active) {
    }

    public record StockMovementDto(Long id, Long productId, String productReference, String productName, String unit,
                                   StockMovementType type, BigDecimal quantity, BigDecimal stockAfter, String reason,
                                   String documentRef, Instant movementDate, String createdBy) {
        public static StockMovementDto of(StockMovement m) {
            Product p = m.getProduct();
            return new StockMovementDto(m.getId(), p.getId(), p.getReference(), p.getName(), p.getUnit(), m.getType(),
                    m.getQuantity(), m.getStockAfter(), m.getReason(), m.getDocumentRef(), m.getMovementDate(),
                    m.getCreatedBy());
        }
    }

    /**
     * ENTREE and SORTIE take a positive quantity; AJUSTEMENT takes the counted stock and records the difference.
     */
    public record StockMovementRequest(
            @NotNull(message = "Le produit est obligatoire") Long productId,
            @NotNull(message = "Le type est obligatoire") StockMovementType type,
            @NotNull(message = "La quantité est obligatoire") @PositiveOrZero BigDecimal quantity,
            @Size(max = 255) String reason,
            @Size(max = 40) String documentRef) {
    }
}
