package tn.novafer.erp.web.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import tn.novafer.erp.domain.Client;
import tn.novafer.erp.domain.DocumentLine;
import tn.novafer.erp.domain.User;
import tn.novafer.erp.service.DocumentCalculator.VatLine;

import java.math.BigDecimal;
import java.util.List;

public final class CommonDtos {

    private CommonDtos() {
    }

    public record Ref(Long id, String label) {
        public static Ref of(Client client) {
            return client == null ? null : new Ref(client.getId(), client.getCompanyName());
        }

        public static Ref of(User user) {
            return user == null ? null : new Ref(user.getId(), user.getFullName());
        }
    }

    /** The client block printed on a document. */
    public record PartyDto(Long id, String code, String companyName, String contactName, String address, String city,
                           String matriculeFiscal, String phone, String email, boolean vatExempt) {
        public static PartyDto of(Client c) {
            return new PartyDto(c.getId(), c.getCode(), c.getCompanyName(), c.getContactName(), c.getAddress(),
                    c.getCity(), c.getMatriculeFiscal(), c.getPhone(), c.getEmail(), c.isVatExempt());
        }
    }

    public record LineRequest(
            Long productId,
            @Size(max = 40) String reference,
            @NotBlank(message = "La désignation est obligatoire") @Size(max = 500) String description,
            @Size(max = 12) String unit,
            @NotNull(message = "La quantité est obligatoire") @Positive(message = "La quantité doit être positive") BigDecimal quantity,
            @NotNull(message = "Le prix est obligatoire") @PositiveOrZero BigDecimal unitPrice,
            @DecimalMin("0") @DecimalMax("100") BigDecimal discountPct,
            BigDecimal vatRate) {
    }

    public record LineResponse(Long id, int position, Long productId, String reference, String description, String unit,
                               BigDecimal quantity, BigDecimal unitPrice, BigDecimal discountPct, BigDecimal vatRate,
                               BigDecimal totalHt) {
        public static LineResponse of(DocumentLine l) {
            return new LineResponse(l.getId(), l.getPosition(), l.getProduct() == null ? null : l.getProduct().getId(),
                    l.getReference(), l.getDescription(), l.getUnit(), l.getQuantity(), l.getUnitPrice(),
                    l.getDiscountPct(), l.getVatRate(), l.getTotalHt());
        }
    }

    public record TotalsResponse(BigDecimal totalHt, BigDecimal totalDiscount, BigDecimal fodecRate,
                                 BigDecimal totalFodec, BigDecimal totalVat, BigDecimal fiscalStamp,
                                 BigDecimal totalTtc, List<VatLine> vatBreakdown) {
    }
}
